"""Build a source-only deployment bundle; credentials/media/test output stay local."""
import hashlib
import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['requirements.txt', 'campus_ai_prompts_v3.json', 'Dockerfile', '.dockerignore',
         'Caddyfile.example', '.env.example']
FOLDERS = ['app', 'web', 'deploy']
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
archive = out / 'offer-deployment.tar.gz'
paths = [ROOT / f for f in FILES]
for folder in FOLDERS:
    paths += sorted(p for p in (ROOT / folder).rglob('*')
                    if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
with tarfile.open(archive, 'w:gz') as tar:
    for path in paths:
        tar.add(path, arcname='offer/' + path.relative_to(ROOT).as_posix(), recursive=False)
manifest = {'archive': archive.name, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
            'bytes': archive.stat().st_size,
            'files': [p.relative_to(ROOT).as_posix() for p in paths],
            'contains_credentials': False, 'published': False}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print(json.dumps({k: v for k, v in manifest.items() if k != 'files'}, ensure_ascii=False))
