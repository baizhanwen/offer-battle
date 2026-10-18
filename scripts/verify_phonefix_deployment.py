"""Verify deployed phone fixes over trusted HTTPS; no model calls or media uploads."""
import hashlib
import json
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
access = dotenv_values(root / '.env.deploy.access')
expected = json.loads((root / 'docs/artifacts/v3-source-hashes.json').read_text())
report = {'checked_at': datetime.now().astimezone().isoformat(), 'trusted_tls': True,
          'phone_retest_verified': False, 'static_files': {}}
with httpx.Client(base_url=access['DEMO_URL'], trust_env=False, timeout=30,
                  headers={'Origin': access['DEMO_URL']}) as client:
    response = client.post('/api/login', json={'username': access['DEMO_USER'],
                                              'password': access['DEMO_PASSWORD']})
    response.raise_for_status()
    report['login_ok'] = response.json()['ok']
    response = client.get('/healthz')
    response.raise_for_status()
    report['health_ok'] = response.json()['ok']
    for name in ('web/app.js', 'web/media.js', 'web/style.css'):
        response = client.get('/' + name.removeprefix('web/'))
        response.raise_for_status()
        actual = hashlib.sha256(response.content).hexdigest()
        report['static_files'][name] = {'sha256': actual, 'matches_local': actual == expected[name]}
    report['ok'] = report['login_ok'] and report['health_ok'] and all(
        item['matches_local'] for item in report['static_files'].values())
output = root / 'docs/artifacts/live/aliyun-v3-deployment.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
assert report['ok'], 'Deployed source differs from the tested phone fixes'
