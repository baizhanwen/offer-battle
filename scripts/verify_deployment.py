"""Check the approved server over trusted HTTPS without printing credentials."""
import json
import socket
import ssl
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
access = dotenv_values(ROOT / '.env.deploy.access')
base = access['DEMO_URL']
host = urlparse(base).hostname
out = ROOT / 'docs/artifacts/live/aliyun-https-v2.json'
report = {'url': base, 'checks': {}, 'text_steps': [],
          'input_kind': 'synthetic nonpersonal answers; desktop HTTP client, not a phone'}


def save():
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))


try:
    # Uses the normal CA store: the private bootstrap CA is deliberately absent.
    context = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=15) as raw:
        with context.wrap_socket(raw, server_hostname=host) as tls:
            cert = tls.getpeercert()
            report['certificate'] = {k: cert.get(k) for k in
                                     ('issuer', 'subjectAltName', 'notBefore', 'notAfter')}
            report['checks']['trusted_tls'] = True
    with httpx.Client(trust_env=False, verify=context, timeout=60) as public:
        r = public.get(base + '/api/health')
        assert r.status_code == 401
        report['checks']['unauthenticated_denied'] = r.status_code
        r = public.get(base.replace('https:', 'http:') + '/')
        assert r.status_code in (301, 302, 307, 308)
        assert r.headers['location'] == base + '/'
        report['checks']['http_redirect'] = r.status_code
    auth = {'username': access['DEMO_USER'], 'password': access['DEMO_PASSWORD']}
    with httpx.Client(base_url=base, trust_env=False, verify=context, timeout=60,
                      headers={'Origin': base}) as client:
        r = client.post('/api/login', json=auth)
        r.raise_for_status()
        report['checks']['branded_login'] = r.json()['ok']
        r = client.get('/')
        assert r.status_code == 200 and 'Offer' in r.text
        report['checks']['homepage'] = 200
        health = client.get('/api/health').json()
        assert health['ok'] and all(health['capabilities'].values())
        report['checks']['configured_capabilities'] = health
        for path in ('/.env', '/.env.deploy', '/campus_ai_prompts_v3.json'):
            assert client.get(path).status_code == 404
        report['checks']['private_files_denied'] = True
        r = client.post('/api/sessions', json={
            'position_id': 'slack_off_artist', 'role_id': 'slacking_senior',
            'mode': 'text', 'demo': False, 'max_questions': 4,
            'request_id': str(uuid.uuid4())})
        r.raise_for_status()
        cookie = r.headers.get('set-cookie', '')
        assert 'Secure' in cookie and 'HttpOnly' in cookie and 'SameSite=strict' in cookie
        report['checks']['secure_owner_cookie'] = True
        state = r.json()

        def mutate(op, **extra):
            global state
            started = time.monotonic()
            r = client.post(f'/api/sessions/{state["id"]}/{op}', json={
                'request_id': str(uuid.uuid4()), 'revision': state['revision'], **extra})
            r.raise_for_status()
            state = r.json()
            last = state['history'][-1]
            report['text_steps'].append({'operation': op,
                'seconds': round(time.monotonic() - started, 3),
                'source': last.get('source'), 'reply': last['content'],
                'notice': state['notice'], 'phase': state['phase']})
            save()
            assert last.get('source') == 'AI' and not state['notice']

        mutate('start')
        for text in ('我先用Python脚本处理重复表格，再留出休息时间。',
                     '我会先抽查三行数据，发现错误就修正脚本，交付前再检查。',
                     '我会和队友约定截止时间，把进展放在共享记录里，遇到问题及时说明。',
                     '如果截止时间提前，我会先完成最重要的部分，说明剩余问题并准备备用方案。'):
            mutate('answer', text=text)
        assert state['phase'] == 'closed' and state['turns'] == 4
        assert state['result']['ai_scores']
        report['result'] = state['result']
        report['checks']['real_four_question_flow'] = True
    report['ok'] = True
except Exception as exc:
    # Never include request/auth objects or arbitrary exception strings.
    report['ok'] = False
    report['error_type'] = type(exc).__name__
    raise
finally:
    save()
    print(json.dumps({'ok': report.get('ok'), 'checks': report['checks'],
                      'evidence': str(out)}, ensure_ascii=False))
