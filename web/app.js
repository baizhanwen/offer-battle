import { MediaRoom } from './media.js';
import { exportOffer } from './export.js';

const $ = (q) => document.querySelector(q);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  arrow:'M5 12h14m-6-6 6 6-6 6', back:'m14 6-6 6 6 6', chat:'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z M7 10h10M7 14h6',
  video:'M3 5h12v14H3z M15 10l6-4v12l-6-4', shuffle:'m3 5 14 14h4m-4-4 4 4-4 4M3 19l5-5m5-5 4-4h4m-4-4 4 4-4 4',
  reverse:'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4', mic:'M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3',
  camera:'M3 6h5l2-3h4l2 3h5v14H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0', phone:'M5 15v4H1v-6c7-6 15-6 22 0v6h-4v-4c-4-2-10-2-14 0',
  sound:'M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 2',
};
export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.arrow}"/></svg>`;
let catalog, view='home', mode='text', jobId='slack_off_artist', roleId='slacking_senior', session=null;
let busy=false, media=null, pending=null, createPending=null, toastTimer, draft='', generation=0;
let ending=false, demoChoice=null;
const requests=new Set();
const role = () => catalog.roles.find(r => r.role_id === (session?.role_id || roleId));
const job = () => catalog.positions.find(j => j.position_id === (session?.position_id || jobId));
const modeName = () => ({text:'文字面试',video:'回合视频面试',reverse:'反转面试'})[session?.mode || mode];
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), v=>v.toString(16).padStart(2,'0')).join('');

export function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5500); }

async function api(url, options={}) {
  const controller = new AbortController();
  requests.add(controller);
  const timer = setTimeout(()=>controller.abort(), 95000);
  try {
    const response=await fetch(url, {...options, signal:controller.signal, credentials:'same-origin', headers:options.body instanceof FormData ? {} : {'Content-Type':'application/json'}});
    if(response.status===401){location.replace('/login');throw new Error('登录已过期，请重新登录');}
    if (!response.ok) {
      const error=await response.json().catch(()=>({}));
      throw new Error(typeof error.detail==='string'?error.detail:`请求失败（${response.status}），请恢复会话后重试`);
    }
    return await response.json();
  } catch(e) {
    if(e.name==='AbortError'||e instanceof TypeError) throw new Error('暂时连接不到服务端。输入已保留，请检查网络后重试或恢复会话。');
    throw e;
  } finally { clearTimeout(timer); requests.delete(controller); }
}

function setBusy(value) {
  busy=value;
  document.querySelectorAll('[data-lock]').forEach(b=>b.disabled=b.dataset.action==='end'?ending:(value || (!!pending && !['retry','recover'].includes(b.dataset.action))));
  const line=$('#busy-line');
  if(line) line.textContent=value?`${role()?.role_name || '人事部'}${role()?.role_id==='slacking_senior'?'放下手机，正在翻答卷…':'正在整理答卷…'}`:'';
  if(media) media.setThinking(value);
}

function errorBox(message) {
  const box=$('#error-box');
  if(!box){toast(message);return;}
  box.hidden=false;
  box.innerHTML=`<span>${esc(message)}</span><div class="actions">${pending?'<button class="button subtle" data-action="retry" data-lock>重试这次提交</button>':''}<button class="button subtle" data-action="recover" data-lock>恢复会话状态</button></div>`;
}

async function run(fn) {
  if(busy)return;
  const gen=generation;
  setBusy(true);
  try { await fn(); } catch(e) { if(gen===generation)errorBox(e.message); } finally { if(gen===generation)setBusy(false); }
}

function leave() {
  generation++;
  requests.forEach(c=>c.abort());requests.clear();
  if(media){media.dispose();media=null;}
  pending=null; draft=''; busy=false;
}

function navigate(next) {leave();view=next;render();window.scrollTo(0,0);}

function frame(content) {
  return `<div class="shell"><header class="masthead"><button class="brand" data-action="home" aria-label="返回首页"><img src="/assets/logo.webp" alt="校园人事部印章"><span><b>Offer 大作战</b><small>CAMPUS HUMAN RESOURCES</small></span></button><span class="edition">2026 · 校园特别企划</span><span class="tag dot">${catalog.capabilities.dialogue?'AI 已配置 · 需实测':'演示模式 · 本地题库'}</span></header>${content}</div>`;
}
const footer=()=>'<footer class="footer"><span>校园人事部 · 不正经招聘，认真接住你的每个脑洞</span><span>仅供校园娱乐 · 不用于真实招聘</span></footer>';

function home() {
  const has=sessionStorage.getItem('offer-session');
  return frame(`<main class="home"><div class="hero"><section><p class="eyebrow">今日营业 / 简历免投</p><h1>人生的 Offer，<br>先拿个<em>离谱的。</em></h1><p class="intro">十个奇葩岗位，五位个性面试官。<br>用你的脑洞过关，领一张专属于你的录用单。</p><p class="slogan">这里，总有一份工作不太对劲。</p></section><div class="poster"><div class="poster-no">校人事〔2026〕017 号 · 招募启事</div><h2>急需人才</h2><p>有点本事 · 也可以有点离谱</p><img src="/assets/slacking_senior.webp" alt="摸鱼前辈正在等你"><span class="stamp">当场面试 · 当场盖章</span></div></div><div class="modes"><button class="mode-card primary" data-action="mode" data-mode="text"><span class="mode-no">01 / 最稳开局 · 约 2–3 分钟</span><b>${icon('chat')} 文字面试</b><span class="desc">不必开口，照样被 AI 接住你的梗。</span><span class="arrow">${icon('arrow')}</span></button><button class="mode-card" data-action="mode" data-mode="video"><span class="mode-no">02 / 回合语音 + 摄像头预览</span><b>${icon('video')} 视频面试</b><span class="desc">跟面试官连个线，看看谁先绷不住。</span></button><button class="mode-card" data-action="mode" data-mode="reverse"><span class="mode-no">03 / 今天你是面试官</span><b>${icon('reverse')} 反转模式</b><span class="desc">轮到 AI 找工作，录不录你说了算。</span></button></div>${has?'<button class="back-link" data-action="resume">恢复本机刚才的面试 '+icon('arrow')+'</button>':''}${footer()}</main>`);
}

function jobs() {
  return frame(`<main><button class="back-link" data-action="home">${icon('back')} 返回大厅</button><div class="section-heading"><div><span class="steps">01 / ${mode==='reverse'?'02':'03'} · ${modeName()}</span><h1>今天，应聘什么？</h1><p>${mode==='reverse'?'给 AI 挑个岗位，看看它能不能接住你的问题。':'正经工作千篇一律，离谱岗位各有各的道理。'}</p></div><button class="button subtle" data-action="random-job">${icon('shuffle')} 随机</button></div><div class="job-grid">${catalog.positions.map((j,i)=>`<button class="job-card ${jobId===j.position_id?'selected':''}" data-action="pick-job" data-id="${j.position_id}" aria-pressed="${jobId===j.position_id}"><span class="no">NO. ${String(i+1).padStart(2,'0')}</span><h3>${esc(j.position_name)}</h3><p>${esc(j.description)}</p></button>`).join('')}</div><div class="selection-bar"><p>已选岗位<br><b>${esc(job().position_name)}</b></p><button class="button primary" data-action="next-job">${mode==='reverse'?'查看面试安排':'挑一位面试官'} ${icon('arrow')}</button></div></main>`);
}

function roles() {
  return frame(`<main><button class="back-link" data-action="back-jobs">${icon('back')} 重选岗位</button><div class="section-heading"><div><span class="steps">02 / 03 · ${esc(job().position_name)}</span><h1>这次，谁来面你？</h1><p>人事部全员到岗。每一位都有一点自己的脾气。</p></div><button class="button subtle" data-action="random-role">${icon('shuffle')} 随机</button></div><div class="role-grid">${catalog.roles.map((r,i)=>`<button class="role-card ${roleId===r.role_id?'selected':''}" data-action="pick-role" data-id="${r.role_id}" aria-pressed="${roleId===r.role_id}"><span class="role-no">HR / 0${i+1}</span><div class="portrait"><img src="${r.avatar}" alt="${esc(r.role_name)}"></div><div class="details"><h3>${esc(r.role_name)}</h3><p>${esc(r.tags.join(' · '))}</p></div></button>`).join('')}</div><div class="selection-bar"><p>应聘 <b>${esc(job().position_name)}</b><br>面试官 <b>${esc(role().role_name)}</b></p><button class="button primary" data-action="next-role">确认安排 ${icon('arrow')}</button></div></main>`);
}

function setup() {
  return frame(`<main><button class="back-link" data-action="back-select">${icon('back')} 返回选择</button><section class="setup"><p class="eyebrow">${mode==='reverse'?'02 / 02':'03 / 03'} · 面试安排</p><h2>准备好，轮到你了。</h2><div class="setup-row"><span>本局模式</span><b>${modeName()}</b></div><div class="setup-row"><span>应聘岗位</span><b>${esc(job().position_name)}</b></div><div class="setup-row"><span>${mode==='reverse'?'应聘者':'面试官'}</span><b>${mode==='reverse'?'小欧 · AI 应聘者':esc(role().role_name)}</b></div>${mode!=='reverse'?'<label class="setup-row"><span>本局题数</span><select id="question-count" aria-label="本局题数"><option value="4">四题 · 推荐</option><option value="2">两题 · 快速体验</option><option value="3">三题</option><option value="6">六题</option></select></label>':''}<label class="check-row"><input type="checkbox" id="demo-toggle" ${(demoChoice??!catalog.capabilities.dialogue)?'checked':''}><span>使用本地演示题库<br><small>不调用任何外部模型；暂未连接时自动使用。</small></span></label>${mode==='video'?`<div class="note">进入通话后，面试官会请你站好。回复「站好了」后，再由你决定是否上传一张截图看穿搭；也可直接跳过。仅描述衣着和背景，不根据外貌评分。</div><p class="note">默认静音。解除静音开始收声，再次静音结束并识别，校正文字后发送。镜头仅作本机预览，需点击同意才上传一张截图。手机请使用 HTTPS。</p>`:'<p class="note">思考、澄清不计题；跳过计题。可以随时结束。娱乐评分不会衡量你的真实求职能力。</p>'}<div id="error-box" class="error-box" hidden></div><button class="button primary wide" data-action="start" data-lock>${mode==='video'?'授权媒体并进入面试':'拿好号码牌，开始面试'} ${icon('arrow')}</button><p class="note">${mode==='reverse'?'你最多可以问十题，再决定录取或淘汰。':'默认四题，不计时施压，想好了再说。'}</p></section></main>`);
}

function sourceText() {
  if(session.demo) return '演示模式 · 本地题库与模板；未调用真实 AI';
  if(session.notice) return session.notice;
  return session.sources.includes('demo')?'部分回合已降级演示；来源在消息下方标注':'面试进行中 · 根据你的回答接话追问';
}
function lastAssistant(){return [...session.history].reverse().find(h=>h.role==='assistant')?.content||'正在开场…';}
function messageHtml(h){return `<div class="message ${h.role==='user'?'user':''}">${h.role==='assistant'?`<span class="speaker">${session.mode==='reverse'?'小欧 · 应聘者':esc(role().role_name)}${h.mood?' / '+esc(h.mood):''}</span>`:''}${esc(h.content)}${h.role==='assistant'?`<small class="message-source">${h.source==='AI'?'面试官':h.source==='demo'?'演示题库':h.source==='local_support'?'关怀暂停':'程序提示'}</small>`:''}</div>`;}
function roomTop(video=false){return `<div class="room-top"><button class="icon-button" data-action="leave" aria-label="退出面试">${icon('back')}</button>${session.mode!=='reverse'?`<img class="avatar-sm" src="${role().avatar}" alt="${esc(role().role_name)}">`:''}<div class="room-title"><b>${session.mode==='reverse'?'你当面试官 · 小欧来应聘':esc(role().role_name)}</b><small>${esc(job().position_name)} · ${session.mode==='reverse'?`已提问 ${session.turns} / 10`:session.phase==='framing'?'开场准备 · 不计题':`第 ${Math.min(session.turns+1,session.max_questions)} / ${session.max_questions} 题`}</small></div>${video?'<span class="timer" id="call-timer">00:00</span>':session.mode!=='reverse'?'<button class="button subtle" data-action="end" data-lock>提前结束</button>':''}</div><div class="source-banner">${esc(sourceText())}</div>`;}
function chips(){return `<div class="chips">${['我不知道','我不配','让我想想','解释一下','跳过'].map((v,i)=>`<button class="chip" data-action="quick" data-kind="${['answer','answer','think','clarify','skip'][i]}" data-text="${v}" data-lock>${v}</button>`).join('')}</div><p class="rule-note">思考 / 澄清不计题 · 跳过计题 · 失败重试不重复计题</p>`;}
function composer(){return `<form id="answer-form" class="composer"><textarea id="answer-input" rows="1" maxlength="1500" aria-label="${session.mode==='reverse'?'面试问题':'你的回答'}" placeholder="${session.mode==='reverse'?'面试官，请出题…':'输入你的回答…'}">${esc(draft)}</textarea><button class="button primary" type="submit" data-lock>发送</button></form>`;}
function closedControls(){return `<div class="done-actions">${session.mode==='reverse'?`<span class="stamp">${session.verdict==='hire'?'你已录取小欧':'小欧暂未录取'}</span>`:'<button class="button primary" data-action="show-result">领取录用单</button>'}<button class="button subtle" data-action="again">再来一局</button><button class="button subtle" data-action="home">返回大厅</button></div>`;}

function voiceControls(){return `<div class="voice-tools"><button id="speak-button" class="button subtle" data-action="speak">${icon('sound')} 播放本轮</button><label class="voice-confirm"><input id="auto-voice" type="checkbox" ${media?.autoVoice===false?'':'checked'}>自动朗读</label></div>`;}
function framingControls(){return `<section class="framing-panel"><p>${session.framing_confirmed?'准备好了，再看今天的穿搭。':'请把手机稍放远，让上半身和衣服进入镜头。点击下方按钮将上传一张截图，用于这次穿搭开场，处理后不保存。'}</p>${session.framing_confirmed?'<button class="button primary" data-action="analyze" data-lock>同意拍一张并分析穿搭</button><small>仅本次截图用于衣着、物品和背景描述，处理后不保存，不根据外貌评分。</small>':'<label class="check-row"><input id="vision-consent" type="checkbox"><span>我同意在确认站好后上传一张截图，仅用于本次穿搭开场。</span></label><button class="button" data-action="stand-ready" data-lock>站好了，拍一张看穿搭</button>'}<button class="back-link" data-action="skip-vision" data-lock>跳过穿搭，直接开始</button></section>`;}
function answerTools(){return (session.phase==='framing'?framingControls():chips())+composer();}
function chatRoom(){return frame(`<main class="room">${roomTop()}<div class="messages" id="messages" role="log" aria-live="polite">${session.history.map(messageHtml).join('')}</div><div id="busy-line" class="busy-line" role="status"></div><div id="error-box" class="error-box" hidden></div>${['active','framing'].includes(session.phase)?(session.mode==='reverse'?`<div class="reverse-actions"><button class="button green" data-action="verdict" data-verdict="hire" data-lock>录取小欧</button><button class="button" data-action="verdict" data-verdict="reject" data-lock>淘汰小欧</button></div>`:voiceControls())+`<div class="answer-tools">${session.mode==='reverse'?composer():answerTools()}</div>`:session.phase==='ready'?'<p class="note">正在连接面试官，请稍候…</p>':session.phase==='support'?'<div class="done-actions"><p class="note">游戏已暂停，你可以离开或结束本局。</p><button class="button" data-action="end" data-lock>结束本局</button></div>':closedControls()}</main>`);}
function visionSummary(){const feedback=media?.visionFeedback;const facts=session.observation||feedback?.facts;if(facts){const clothes=facts.clothing||[];return `<div class="vision-summary" role="status">${clothes.length?'穿搭观察：'+esc(clothes.join('、')):'这张画面没有看清衣着，未作穿搭判断。'}${!clothes.length&&(facts.background||[]).length?' 可见背景：'+esc(facts.background.join('、')):''}</div>`;}return feedback?`<div class="vision-summary" role="status">${esc(feedback.message)}</div>`:'';}
function videoRoom(){return frame(`<main class="video-room">${roomTop(true)}<div class="stage" id="character-stage"><img class="character" src="${role().avatar}" alt="${esc(role().role_name)}的角色形象"><span class="stage-label" id="character-state">待机 · 等你回答</span><div class="pip"><video id="self-video" autoplay muted playsinline></video><p id="camera-placeholder">摄像头未开启</p><small>我 · 仅本机预览</small></div></div>${visionSummary()}<div class="subtitles" id="subtitles" aria-live="polite">${esc(lastAssistant())}</div><p class="video-meta" id="media-status">已静音 · 解除静音开始说话</p><div class="media-controls"><button id="mic-button" data-action="mic" aria-pressed="false">${icon('mic')} 解除静音</button><button id="camera-button" data-action="camera">${icon('camera')} 关闭镜头</button><button id="speak-button" data-action="speak">${icon('sound')} 播放本轮</button><button class="red" data-action="end" data-lock>${icon('phone')} 挂断</button></div><label class="voice-confirm"><input id="auto-voice" type="checkbox" ${media?.autoVoice===false?'':'checked'}>自动朗读面试官回复</label><details class="video-log"><summary>查看完整问答记录</summary><div class="transcript" id="video-transcript">${session.history.map(h=>`<p>${h.role==='user'?'我':esc(role().role_name)}：${esc(h.content)}</p>`).join('')}</div></details><div id="busy-line" class="busy-line" role="status"></div><div id="error-box" class="error-box" hidden></div><div class="answer-tools">${['active','framing'].includes(session.phase)?answerTools():session.phase==='ready'?'<p class="note">正在连接面试官，请稍候…</p>':closedControls()}</div></main>`);}

function offer(){const r=session.result;return frame(`<main class="offer-wrap"><button class="back-link" data-action="view-record">${icon('back')} 查看问答记录</button><article class="offer-sheet" id="offer-sheet"><header class="offer-head"><p class="doc">OFFER 大作战 · 校园人事部</p><h1>校园岗位录用单</h1><small>${esc(r.number)}</small></header><div class="offer-person"><img src="${role().avatar}" alt="${esc(role().role_name)}"><div><p>现就本次面试，作出如下娱乐批示</p><h2>${esc(job().position_name)}</h2><p>面试官：${esc(role().role_name)} · 已答 ${session.turns} 题</p></div></div><div class="scores">${Object.entries(r.scores).map(([k,v])=>`<div class="score-row"><span>${esc(k)}</span><progress value="${v}" max="10" aria-label="${esc(k)} ${v}分"></progress><b>${v}<small>/10</small></b></div>`).join('')}</div><p class="comment">${esc(r.comment)}</p><div class="result-bottom"><div class="average">${r.average.toFixed(1)}<small>五维平均分 / 10</small></div><div class="seal-circle ${r.status}"><small>校园人事部</small><b>${esc(r.label)}</b><i>★ 娱乐专用 ★</i></div></div><p class="offer-meta">${esc(r.scoring_source)}<br>${esc(r.entertainment_note)}</p></article><div class="offer-actions"><button class="button primary" data-action="export" data-lock>${icon('download')} 导出 PNG</button><button class="button" data-action="again">再来一次</button><button class="button subtle" data-action="change-job">换岗位</button></div><details class="audit"><summary>展开评分依据</summary><p>${esc(r.observation)}</p><p>规则分：${r.rule_scores.join(' / ')}<br>${r.ai_scores?'AI 草案：'+r.ai_scores.join(' / '):'未使用真实模型评价，当前为演示结果。'}<br>有效回答 ${r.evidence.effective_answers} 条，不重复回答 ${r.evidence.unique_answers} 条。<br>${esc(r.evidence.formula)}<br>判定：均分 ≥6.5 录用；3.5≤均分&lt;6.5 待定；&lt;3.5 淘汰；无有效回答未评定。</p><p>${esc(JSON.stringify(r.evidence.signals))}</p><p>${session.events.map(e=>esc(`${({dialogue:'面试回复',evaluation:'答卷评价',vision:'穿搭',asr:'语音识别',tts:'语音播放'})[e.capability]||'处理'} / ${e.source==='demo'?'演示':'已完成'} / ${e.seconds}s`)).join('<br>')}</p></details>${footer()}</main>`);}

function render(){document.body.className=(view==='room'?'room-view':view==='video'?'video-view':'');$('#app').innerHTML=({home,jobs,roles,setup,room:chatRoom,video:videoRoom,offer}[view]||home)();const messages=$('#messages');if(messages)messages.scrollTop=messages.scrollHeight;if(session&&session.mode!=='reverse'&&['room','video'].includes(view)&&!media)media=new MediaRoom(session,icon,toast,()=>busy);media?.attach();media?.updateStatus();setBusy(busy);fitKeyboard();}

async function refreshSession(next) {
  session=next;
  sessionStorage.setItem('offer-session',session.id);
  if(session.phase==='closed')media?.pauseForBackground();
  if(media&&view==='video') {
    $('.source-banner').textContent=session.phase==='closed'?'面试结束 · 听完收尾后领取录用单':sourceText();$('#subtitles').textContent=lastAssistant();
    $('.vision-summary')?.remove();$('#subtitles').insertAdjacentHTML('beforebegin',visionSummary());
    $('.room-title small').textContent=`${job().position_name} · ${session.phase==='framing'?'开场准备 · 不计题':`第 ${Math.min(session.turns+1,session.max_questions)} / ${session.max_questions} 题`}`;$('.answer-tools').innerHTML=session.phase==='closed'?closedControls():answerTools();
    $('#video-transcript').innerHTML=session.history.map(h=>`<p>${h.role==='user'?'我':esc(role().role_name)}：${esc(h.content)}</p>`).join('');
    if(session.phase==='support'){media.dispose();media=null;view='room';render();}
    else {if($('#answer-input'))$('#answer-input').value=draft;media.updateSession(session);}
  } else {view='room';render();media?.updateSession(session);}
}

async function mutate(operation, extra={}) {
  if(!pending)pending={sid:session.id,operation,body:{request_id:uuid(),revision:session.revision,...extra}};
  const p=pending, gen=generation;
  if(media)media.cancelPlayback();
  const next=await api(`/api/sessions/${p.sid}/${p.operation}`,{method:'POST',body:JSON.stringify(p.body)});
  if(gen!==generation||session.id!==p.sid)return;
  pending=null;
  if(!(p.operation==='answer'&&['think','clarify'].includes(p.body.action)))draft='';
  if($('#error-box'))$('#error-box').hidden=true;
  await refreshSession(next);
  if(session.phase==='framing'&&session.framing_confirmed&&media?.visionConsent&&!session.vision_attempted){await analyzeAndBegin();return;}
  if(media&&media.autoVoice&&!session.demo&&catalog.capabilities.tts)await media.play();
  if(session.phase==='closed'){
    const room=media;
    if(room?.playing){const completed=await room.waitForPlayback();if(!completed)return;}
    if(gen===generation&&session?.id===p.sid)navigate('offer');
  }
}

async function startSession() {
  const selectedMode=mode, gen=generation;
  const demo=$('#demo-toggle').checked;demoChoice=demo;
  if(!createPending)createPending={request_id:uuid(),position_id:jobId,role_id:roleId,mode,max_questions:Number($('#question-count')?.value||4),demo};
  const created=await api('/api/sessions',{method:'POST',body:JSON.stringify(createPending)});
  if(gen!==generation)return;
  session=created;sessionStorage.setItem('offer-session',session.id);createPending=null;
  view=selectedMode==='video'?'video':'room';render();
  if(selectedMode==='video'){await media.connect();if(gen!==generation)return;}
  if(gen!==generation)return;
  await mutate('start');
}

async function analyzeAndBegin(){
  try{media.visionFeedback={message:'正在分析这一张截图的衣着…'};$('.vision-summary')?.remove();$('#subtitles')?.insertAdjacentHTML('beforebegin',visionSummary());const image=await media.capture();const fd=new FormData();fd.append('consent','true');fd.append('file',image,'opening.jpg');const result=await api(`/api/sessions/${session.id}/vision`,{method:'POST',body:fd});session.vision_attempted=true;media.visionFeedback=result.ok?{facts:result.facts}:{message:result.detail||'这次穿搭分析未成功，使用普通开场。'};toast(result.ok?(result.facts.clothing?.length?'已识别衣着，开始面试':'没有看清衣着；会明确保留这一结果'):result.detail);await mutate('begin');}
  catch(error){if(media&&!media.visionFeedback?.facts){media.visionFeedback={message:'穿搭分析未完成：'+error.message};$('.vision-summary')?.remove();$('#subtitles')?.insertAdjacentHTML('beforebegin',visionSummary());}toast(error.message+'；可跳过穿搭继续。');throw error;}
}

async function recover() {
  const sid=session?.id||sessionStorage.getItem('offer-session');if(!sid)return;
  const next=await api('/api/sessions/'+sid);
  pending=null;session=next;mode=next.mode;jobId=next.position_id;roleId=next.role_id;
  if(next.phase==='ready'){await mutate('start');return;}
  // Restored video defaults to readable text, with an explicit reconnect button below.
  if(!media)view=next.mode==='video'?'room':view;
  await refreshSession(next);
}

document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
  const a=b.dataset.action;
  if(a==='home'||a==='leave'){session=null;createPending=null;navigate('home');return;}
  if(a==='mode'){session=null;mode=b.dataset.mode;createPending=null;navigate('jobs');return;}
  if(a==='pick-job'||a==='random-job'){jobId=a==='pick-job'?b.dataset.id:catalog.positions[Math.floor(Math.random()*10)].position_id;render();return;}
  if(a==='pick-role'||a==='random-role'){roleId=a==='pick-role'?b.dataset.id:catalog.roles[Math.floor(Math.random()*5)].role_id;render();return;}
  if(a==='next-job'){navigate(mode==='reverse'?'setup':'roles');return;}
  if(a==='next-role'){navigate('setup');return;}
  if(a==='back-jobs'){navigate('jobs');return;}
  if(a==='back-select'){navigate(mode==='reverse'?'jobs':'roles');return;}
  if(a==='start'){MediaRoom.unlockAudio();run(startSession);return;}
  if(a==='quick'){if(media?.recording){toast('先结束录音，再发送回答');return;}run(()=>mutate('answer',{action:b.dataset.kind,text:b.dataset.text}));return;}
  if(a==='end'){
    if(ending)return;
    ending=true;leave();const endGeneration=generation;
    run(async()=>{session=await api('/api/sessions/'+session.id);if(session.phase==='closed')await refreshSession(session);else await mutate('end');}).finally(()=>{ending=false;if(endGeneration===generation)setBusy(false);});return;
  }
  if(a==='verdict'){run(()=>mutate('verdict',{verdict:b.dataset.verdict}));return;}
  if(a==='retry'){run(()=>mutate(pending.operation));return;}
  if(a==='recover'||a==='resume'){run(recover);return;}
  if(a==='show-result'){navigate('offer');return;}
  if(a==='view-record'){navigate('room');return;}
  if(a==='again'||a==='change-job'){jobId=session.position_id;roleId=session.role_id;mode=session.mode;session=null;sessionStorage.removeItem('offer-session');createPending=null;navigate(a==='again'?'setup':'jobs');return;}
  if(a==='export'){run(()=>exportOffer(session,job(),role()));return;}
  if(a==='mic'){media?.toggleMic().catch(e=>toast(e.message));return;}
  if(a==='camera'){media?.toggleCamera().catch(e=>toast(e.message));return;}
  if(a==='stand-ready'){if(media)media.visionConsent=true;run(()=>mutate('answer',{text:'我已经站好了',action:'answer'}));return;}
  if(a==='skip-vision'){if(media)media.visionFeedback={message:'本局已跳过穿搭，未上传截图。'};run(()=>mutate('begin'));return;}
  if(a==='analyze'){run(analyzeAndBegin);return;}
  if(a==='speak'){media?.play().catch(e=>toast(e.message));return;}
});
document.addEventListener('submit',event=>{if(event.target.id!=='answer-form')return;event.preventDefault();if(media?.recording){toast('先结束录音并校正识别文字');return;}draft=$('#answer-input').value;if(!draft.trim()){toast('先写一点内容再发送');return;}event.target.querySelector('textarea')?.blur();fitKeyboard();run(()=>mutate('answer',{text:draft,action:'answer'}));});
document.addEventListener('change',event=>{if(event.target.id==='vision-consent'&&media)media.visionConsent=event.target.checked;if(event.target.id==='auto-voice'&&media){media.autoVoice=event.target.checked;if(!media.autoVoice)media.cancelPlayback();}});
document.addEventListener('input',event=>{if(event.target.id==='answer-input')draft=event.target.value;});
document.addEventListener('keydown',event=>{if(event.target.id==='answer-input'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!matchMedia('(pointer:coarse)').matches){event.preventDefault();$('#answer-form').requestSubmit();}});
window.addEventListener('pagehide',()=>media?.dispose());
document.addEventListener('visibilitychange',()=>{if(document.hidden)media?.pauseForBackground();});
function fitKeyboard(){
  const viewport=window.visualViewport,height=viewport?.height||innerHeight,top=viewport?.offsetTop||0;
  document.documentElement.style.setProperty('--app-height',`${height}px`);
  document.documentElement.style.setProperty('--viewport-top',`${top}px`);
  const focused=document.activeElement?.matches('textarea,input');
  document.body.classList.toggle('keyboard-open',!!focused&&height<document.documentElement.clientHeight-100);
}
document.addEventListener('focusin',()=>{fitKeyboard();requestAnimationFrame(fitKeyboard);});
document.addEventListener('focusout',()=>requestAnimationFrame(fitKeyboard));
window.visualViewport?.addEventListener('resize',fitKeyboard);window.visualViewport?.addEventListener('scroll',fitKeyboard);window.addEventListener('resize',fitKeyboard);fitKeyboard();

try {catalog=await api('/api/catalog');render();}catch(e){$('#app').innerHTML=`<div class="boot"><h1>人事部暂时失联</h1><p class="note">${esc(e.message)}</p><button class="button" id="reload">重新连接</button></div>`;$('#reload').onclick=()=>location.reload();}
