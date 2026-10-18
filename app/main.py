import asyncio
import copy
import hashlib
import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict
from .catalog import ROOT, ROLES, POSITIONS, public_catalog
from .local import local_reply, reverse_local
from .scoring import build_result, rule_scores
from . import providers
from . import auth

app = FastAPI(title='Offer 大作战', docs_url=None, redoc_url=None, openapi_url=None)


@dataclass
class Session:
    owner: str
    position_id: str
    role_id: str
    mode: str
    max_questions: int = 4
    demo: bool = True
    id: str = field(default_factory=lambda: secrets.token_urlsafe(24))
    created: float = field(default_factory=time.monotonic)
    touched: float = field(default_factory=time.monotonic)
    offer_number: str = field(default_factory=lambda: 'OF' + datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y%m%d') + '-' + secrets.token_hex(4).upper())
    phase: str = 'ready'
    turns: int = 0
    revision: int = 0
    history: list = field(default_factory=list)
    answers: list = field(default_factory=list)
    result: dict | None = None
    verdict: str | None = None
    observation: dict | None = None
    vision_attempted: bool = False
    framing_confirmed: bool = False
    notice: str = ''
    sources: set = field(default_factory=set)
    events: list = field(default_factory=list)
    dedup: dict = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


SESSIONS = {}
CREATES = {}
RATE = defaultdict(deque)
LAST_CLEAN = 0


def cleanup():
    global LAST_CLEAN
    now = time.monotonic()
    if now - LAST_CLEAN < 30:
        return
    ttl = int(os.getenv('SESSION_TTL_SECONDS', '7200'))
    for sid, s in list(SESSIONS.items()):
        if now - s.touched > ttl and not s.lock.locked():
            del SESSIONS[sid]
    for key, sid in list(CREATES.items()):
        if sid not in SESSIONS:
            del CREATES[key]
    for owner, queue in list(RATE.items()):
        if not queue or now - queue[-1] > 120:
            del RATE[owner]
    LAST_CLEAN = now


@app.middleware('http')
async def guard(request: Request, call_next):
    cleanup()
    public_paths = {'/login', '/login.js', '/style.css', '/assets/logo.webp', '/api/login', '/healthz'}
    if auth.enabled() and request.url.path not in public_paths and not auth.valid(request.cookies.get('offer_login', '')):
        if request.url.path.startswith('/api/'):
            return JSONResponse({'detail': '请先登录后继续'}, status_code=401)
        return RedirectResponse('/login', status_code=303)
    owner = request.cookies.get('offer_owner', '')
    if len(owner) != 43:
        owner = secrets.token_urlsafe(32)
    request.state.owner = owner
    if request.url.path.startswith('/api/') and request.method == 'POST':
        origin = request.headers.get('origin')
        if origin and origin != str(request.base_url).rstrip('/'):
            return JSONResponse({'detail': '请求来源不匹配，请在同一地址重新打开'}, status_code=403)
        now = time.monotonic(); queue = RATE[owner]
        while queue and now - queue[0] > 60:
            queue.popleft()
        if len(queue) >= 80:
            return JSONResponse({'detail': '操作太快，请稍后重试'}, status_code=429)
        queue.append(now)
        limit = 6_500_000
        if int(request.headers.get('content-length', '0') or 0) > limit:
            return JSONResponse({'detail': '请求过大，图片限1MB，录音限6MB'}, status_code=413)
        chunks = bytearray()
        async for chunk in request.stream():
            chunks.extend(chunk)
            if len(chunks) > limit:
                return JSONResponse({'detail': '请求超过大小限制'}, status_code=413)
        request._body = bytes(chunks)
    response = await call_next(request)
    response.set_cookie('offer_owner', owner, httponly=True, samesite='strict', secure=os.getenv('COOKIE_SECURE', 'false').lower() == 'true', max_age=7200)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Permissions-Policy'] = 'camera=(self), microphone=(self)'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Create(Strict):
    position_id: str
    role_id: str = 'slacking_senior'
    mode: Literal['text', 'video', 'reverse'] = 'text'
    max_questions: int = Field(default=4, ge=2, le=6)
    demo: bool = False
    request_id: str = Field(min_length=8, max_length=80)


class Mutation(Strict):
    revision: int = Field(ge=0)
    request_id: str = Field(min_length=8, max_length=80)


class Answer(Mutation):
    action: Literal['answer', 'think', 'clarify', 'skip'] = 'answer'
    text: str = Field(default='', max_length=1500)


class Verdict(Mutation):
    verdict: Literal['hire', 'reject']


def get_session(sid, request):
    s = SESSIONS.get(sid)
    if not s or not secrets.compare_digest(s.owner, request.state.owner):
        raise HTTPException(404, '会话不存在或已过期，请重新开局')
    s.touched = time.monotonic()
    return s


def public_value(value):
    if isinstance(value, str):
        return re.sub(r'deepseek|minimax(?:_[A-Z]+)?', 'AI', value, flags=re.I)
    if isinstance(value, list):
        return [public_value(item) for item in value]
    if isinstance(value, dict):
        return {key: public_value(item) for key, item in value.items()}
    return value


def public_capabilities():
    caps = providers.capabilities()
    return dict(dialogue=caps['DEEPSEEK'], vision=caps['MINIMAX_VISION'], asr=caps['MINIMAX_ASR'], tts=caps['MINIMAX_TTS'])


def snapshot(s):
    return public_value(dict(id=s.id, mode=s.mode, role_id=s.role_id, position_id=s.position_id,
                max_questions=s.max_questions, turns=s.turns, revision=s.revision, phase=s.phase,
                history=s.history, result=s.result, verdict=s.verdict, notice=s.notice,
                demo=s.demo, sources=sorted(s.sources), vision_attempted=s.vision_attempted,
                observation=s.observation, events=s.events, framing_confirmed=s.framing_confirmed))


def check_mutation(s, body, operation):
    fingerprint = hashlib.sha256(json.dumps({'op': operation, **body.model_dump()}, sort_keys=True).encode()).hexdigest()
    if body.request_id in s.dedup:
        old_fingerprint, result = s.dedup[body.request_id]
        if old_fingerprint != fingerprint:
            raise HTTPException(409, '同一请求标识不能用于不同操作，请恢复会话状态')
        return result, fingerprint
    if body.revision != s.revision:
        raise HTTPException(409, '会话已更新，请恢复会话状态后继续')
    if len(s.dedup) >= 80:
        raise HTTPException(429, '本局操作已达上限，请结束或重新开局')
    return None, fingerprint


def commit(s, body, fingerprint):
    s.revision += 1
    result = copy.deepcopy(snapshot(s))
    s.dedup[body.request_id] = (fingerprint, result)
    return result


def append(s, role, text, **meta):
    s.history.append({'role': role, 'content': text, **meta})


async def bot(s, phase, text='', action='answer'):
    started = time.monotonic()
    source = 'demo'
    data = None
    if not s.demo and providers.capabilities()['DEEPSEEK']:
        try:
            data = await providers.interview(s, phase, [{'role': h['role'], 'content': h['content']} for h in s.history])
            source = 'deepseek'
        except providers.ProviderError as exc:
            s.notice = str(exc) + '；本轮已降级为演示题库'
    if data is None:
        data = local_reply(s, phase, text, action)
        if not s.notice:
            s.notice = '演示模式 · 本地题库，不是真实 AI 回复'
    s.sources.add(source)
    s.events.append({'capability': 'dialogue', 'source': source, 'seconds': round(time.monotonic() - started, 3)})
    append(s, 'assistant', data['reply'] + ('\n' + data['follow_up'] if data['follow_up'] else ''), mood=data['mood'], source=source, flag=data['flag'])
    if data['flag'] == 'support_needed':
        s.phase = 'support'
    return data


async def finish(s):
    if s.phase == 'closed':
        return
    if s.phase != 'support':
        await bot(s, 'closing')
    ai = None
    started = time.monotonic()
    if not s.demo and providers.capabilities()['DEEPSEEK'] and rule_scores(s.answers, s.max_questions)[1]['effective_answers']:
        try:
            ai = await providers.evaluation(s)
        except providers.ProviderError as exc:
            s.notice = str(exc) + '；结果已降级为演示规则评分'
    s.result = build_result(s, ai)
    s.events.append({'capability': 'evaluation', 'source': 'deepseek' if ai else 'demo', 'seconds': round(time.monotonic() - started, 3)})
    s.phase = 'closed'


@app.get('/api/catalog')
async def catalog():
    return public_catalog() | {'capabilities': public_capabilities()}


@app.get('/api/health')
async def health():
    return {'ok': True, 'capabilities': public_capabilities()}


@app.get('/healthz')
async def healthz():
    return {'ok': True}


class Login(Strict):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


@app.get('/login')
async def login_page():
    return FileResponse(ROOT / 'web/login.html', headers={'Cache-Control': 'no-store'})


@app.get('/login.js')
async def login_script():
    return FileResponse(ROOT / 'web/login.js', media_type='text/javascript')


@app.post('/api/login')
async def login(body: Login, request: Request):
    if not auth.enabled():
        return {'ok': True}
    ip = request.client.host if request.client else 'unknown'
    if auth.throttled(ip):
        raise HTTPException(429, '尝试次数较多，请十分钟后再试')
    username_ok = secrets.compare_digest(body.username.encode(), os.getenv('LOGIN_USER', '').encode())
    password_ok = await asyncio.to_thread(auth.verify_password, body.password)
    if not username_ok or not password_ok:
        auth.FAILURES[ip].append(time.monotonic())
        raise HTTPException(401, '账号或密码不正确')
    response = JSONResponse({'ok': True}, headers={'Cache-Control': 'no-store'})
    response.set_cookie('offer_login', auth.issue(), httponly=True, secure=os.getenv('COOKIE_SECURE') == 'true', samesite='strict', max_age=43200)
    return response


@app.post('/api/logout')
async def logout():
    response = JSONResponse({'ok': True})
    response.delete_cookie('offer_login')
    response.delete_cookie('offer_owner')
    return response


@app.post('/api/sessions')
async def create(body: Create, request: Request):
    if body.position_id not in POSITIONS or body.role_id not in ROLES:
        raise HTTPException(422, '岗位或角色不在当前 v3 资料中')
    key = (request.state.owner, body.request_id)
    if key in CREATES:
        return snapshot(SESSIONS[CREATES[key]])
    if len(SESSIONS) >= 1000:
        raise HTTPException(503, '体验人数较多，请稍后再试')
    if sum(s.owner == request.state.owner for s in SESSIONS.values()) >= 30:
        raise HTTPException(429, '本机短时间创建过多会话，请稍后再试')
    s = Session(request.state.owner, body.position_id, body.role_id, body.mode,
                body.max_questions, body.demo)
    SESSIONS[s.id] = s; CREATES[key] = s.id
    return snapshot(s)


@app.get('/api/sessions/{sid}')
async def state(sid: str, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        return snapshot(s)


@app.post('/api/sessions/{sid}/start')
async def start(sid: str, body: Mutation, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        old, fp = check_mutation(s, body, 'start')
        if old is not None: return old
        if s.phase != 'ready': raise HTTPException(409, '此会话已开始')
        s.phase = 'active'
        if s.mode == 'reverse':
            append(s, 'assistant', f'我是小欧，来应聘{POSITIONS[s.position_id]["position_name"]}。面试官，请出题！', source='local_intro')
        elif s.mode == 'video':
            s.phase = 'framing'
            intro = {
                'cyber_judge_k07': '镜头已连接。请站稳，让衣着进入画面；准备好后告诉我「站好了」。',
                'slacking_senior': '先别急，站舒服点，让镜头看清今天的穿搭。好了就说「站好了」，咱们再开始。',
                'mystic_interviewer': '先请站定，让今日衣着入镜。准备妥当后，说声「站好了」。',
                'emo_poet_hr': '先站稳吧，让今天的颜色落进镜头里。准备好了，就轻轻说声「站好了」。',
                'chatty_host': '来来来，先站好，让镜头看清今天的穿搭！准备好了告诉我「站好了」，马上开聊。',
            }
            append(s, 'assistant', intro[s.role_id], source='local_control')
        else:
            await bot(s, 'opening')
        return commit(s, body, fp)


@app.post('/api/sessions/{sid}/answer')
async def answer(sid: str, body: Answer, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        old, fp = check_mutation(s, body, 'answer')
        if old is not None: return old
        if s.phase == 'framing':
            if body.action != 'answer' or not body.text.strip():
                raise HTTPException(422, '准备好了请说「站好了」，也可以跳过穿搭')
            append(s, 'user', body.text.strip())
            s.framing_confirmed = any(word in body.text for word in ('站好了', '准备好了', '可以了', '已站好')) and not any(word in body.text for word in ('没', '不', '等等'))
            append(s, 'assistant', '收到，准备好了。你可以同意上传这一张截图看穿搭，也可以跳过，直接聊岗位。' if s.framing_confirmed else '不急，准备好后说「站好了」。不方便开镜头也可以跳过穿搭，直接开始。', source='local_control')
            return commit(s, body, fp)
        if s.phase != 'active': raise HTTPException(409, '会话不在答题阶段')
        s.notice = ''
        text = body.text.strip()
        if body.action == 'answer' and not text: raise HTTPException(422, '请先填写回答')
        if s.mode == 'reverse':
            if body.action != 'answer': raise HTTPException(422, '反转模式请直接提问')
            if s.turns >= 10: raise HTTPException(409, '已问十题，请给小欧一个结果')
            reply = None; source = 'demo'
            if not s.demo:
                try:
                    reply = await providers.reverse(s, text); source = 'deepseek'
                except providers.ProviderError as exc:
                    s.notice = str(exc) + '；已使用演示应聘者'
            reply = reply or reverse_local(POSITIONS[s.position_id], text)
            append(s, 'user', text); append(s, 'assistant', reply, source=source)
            s.sources.add(source); s.turns += 1
        elif body.action in ('think', 'clarify'):
            q = s.history[-1]['content'].split('\n')[-1]
            append(s, 'user', '让我想想' if body.action == 'think' else '请解释一下这道题', action=body.action)
            append(s, 'assistant', ('可以，慢慢想。不计题数。' if body.action == 'think' else '这题想听你先做哪一步，以及怎样处理岗位里的情境。不计题数。') + '\n' + q, source='local_control')
        else:
            text = '跳过本题' if body.action == 'skip' else text
            # Local urgent-risk pause also works when the model is unavailable.
            if any(term in text for term in ('我要自杀', '现在去死', '正在割腕', '马上跳楼')):
                append(s, 'user', text)
                append(s, 'assistant', '我们先暂停游戏。请先去有人的安全地方，联系身边可信的人；如果正处于危险中，请联系当地紧急服务。', source='local_support', flag='support_needed')
                s.phase = 'support'
                return commit(s, body, fp)
            append(s, 'user', text, action=body.action)
            # Stage and round updates only commit once under the lock.
            s.turns += 1
            s.answers.append({'kind': body.action, 'text': text})
            if s.turns >= s.max_questions:
                await finish(s)
            else:
                data = await bot(s, 'follow_up', text, body.action)
                if data['flag'] == 'out_of_scope':
                    s.turns -= 1; s.answers.pop()
        return commit(s, body, fp)


@app.post('/api/sessions/{sid}/end')
async def end(sid: str, body: Mutation, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        old, fp = check_mutation(s, body, 'end')
        if old is not None: return old
        if s.mode == 'reverse': raise HTTPException(409, '请用录取或淘汰结束反转面试')
        if s.phase not in ('ready', 'framing', 'active', 'support', 'closed'): raise HTTPException(409, '当前不能结束面试')
        await finish(s)
        return commit(s, body, fp)


@app.post('/api/sessions/{sid}/begin')
async def begin(sid: str, body: Mutation, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        old, fp = check_mutation(s, body, 'begin')
        if old is not None: return old
        if s.mode != 'video' or s.phase != 'framing':
            raise HTTPException(409, '当前不能重复开始岗位面试')
        s.phase = 'active'
        s.notice = ''
        await bot(s, 'opening')
        return commit(s, body, fp)


@app.post('/api/sessions/{sid}/verdict')
async def verdict(sid: str, body: Verdict, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        old, fp = check_mutation(s, body, 'verdict')
        if old is not None: return old
        if s.mode != 'reverse' or s.phase != 'active': raise HTTPException(409, '不能重复决定结果')
        s.notice = ''
        reply = None; source = 'demo'
        if not s.demo:
            try:
                reply = await providers.reverse(s, verdict=body.verdict); source = 'deepseek'
            except providers.ProviderError as exc:
                s.notice = str(exc) + '；已使用演示反应'
        append(s, 'user', '录取' if body.verdict == 'hire' else '淘汰')
        append(s, 'assistant', reply or reverse_local(POSITIONS[s.position_id], '', body.verdict), source=source)
        s.verdict = body.verdict; s.phase = 'reverse_done'; s.sources.add(source)
        return commit(s, body, fp)


@app.post('/api/sessions/{sid}/vision')
async def vision(sid: str, request: Request, consent: bool = Form(False), file: UploadFile = File(...)):
    s = get_session(sid, request)
    async with s.lock:
        if s.mode != 'video' or s.phase != 'framing' or not s.framing_confirmed or s.vision_attempted:
            raise HTTPException(409, '请先进入通话并确认站好；每局仅分析一张图片')
        if not consent: raise HTTPException(422, '需要明确同意上传单张截图')
        raw = await file.read(1_000_001)
        if len(raw) > 1_000_000: raise HTTPException(413, '截图超过1MB')
        s.vision_attempted = True
        if s.demo or not providers.capabilities()['MINIMAX_VISION']:
            return {'ok': False, 'detail': '演示模式或视觉未配置：不上传提供商，使用普通开场'}
        started = time.monotonic()
        try:
            s.observation = await providers.vision(raw)
            s.events.append({'capability': 'vision', 'source': 'minimax', 'seconds': round(time.monotonic() - started, 3)})
            return {'ok': True, 'facts': s.observation}
        except providers.ProviderError as exc:
            return {'ok': False, 'detail': str(exc) + '；使用普通开场'}


@app.post('/api/sessions/{sid}/asr')
async def asr(sid: str, request: Request, file: UploadFile = File(...)):
    s = get_session(sid, request)
    async with s.lock:
        if s.mode not in ('text', 'video') or s.phase not in ('active', 'framing'): raise HTTPException(409, '当前不能识别录音')
        if s.demo or not providers.capabilities()['MINIMAX_ASR']: raise HTTPException(503, '语音识别未启用，本轮请打字；不会伪造识别文本')
        raw = await file.read(6_000_001)
        if len(raw) > 6_000_000: raise HTTPException(413, '录音超过6MB')
        try:
            started = time.monotonic(); text = await providers.transcribe(raw)
            s.events.append({'capability': 'asr', 'source': 'minimax', 'seconds': round(time.monotonic() - started, 3)})
            return {'text': text}
        except providers.ProviderError as exc:
            raise HTTPException(503, str(exc))


@app.post('/api/sessions/{sid}/tts')
async def tts(sid: str, request: Request):
    s = get_session(sid, request)
    async with s.lock:
        if s.mode not in ('text', 'video') or s.phase not in ('active', 'framing', 'closed'): raise HTTPException(409, '当前不能朗读')
        if s.demo or not providers.capabilities()['MINIMAX_TTS']: raise HTTPException(503, '语音播放未启用，请阅读字幕')
        text = next(h['content'] for h in reversed(s.history) if h['role'] == 'assistant')
        try:
            started = time.monotonic(); audio = await providers.speak(s, text)
            s.events.append({'capability': 'tts', 'source': 'minimax', 'seconds': round(time.monotonic() - started, 3)})
            return Response(audio, media_type='audio/mpeg')
        except providers.ProviderError as exc:
            raise HTTPException(503, str(exc))


app.mount('/assets', StaticFiles(directory=ROOT / 'web/assets'), name='assets')


@app.get('/')
async def index():
    return FileResponse(ROOT / 'web/index.html')


@app.get('/{name}')
async def static_file(name: str):
    if name not in ('app.js', 'style.css', 'media.js', 'export.js'):
        raise HTTPException(404)
    return FileResponse(ROOT / 'web' / name)
