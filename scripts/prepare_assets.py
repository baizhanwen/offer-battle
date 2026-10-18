"""Extract by v3 member mapping, preserving originals, then generate local web derivatives."""
import json
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
pack = json.loads((ROOT / 'campus_ai_prompts_v3.json').read_text())
dest = ROOT / 'assets/originals'
dest.mkdir(parents=True, exist_ok=True)
web = ROOT / 'web/assets'
web.mkdir(parents=True, exist_ok=True)
manifest = []
with zipfile.ZipFile(ROOT / '面试官头像.zip') as z:
    for r in pack['roles']:
        member = r['avatar']['member']
        data = z.read(member)
        original = dest / Path(member).name
        original.write_bytes(data)
        with Image.open(original) as im:
            im.thumbnail((820, 1060))
            im.save(web / (r['role_id'] + '.webp'), 'WEBP', quality=86)
        manifest.append({'role_id': r['role_id'], 'member': member, 'derivative': r['role_id'] + '.webp'})
(web / 'avatar-mapping.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
with Image.open(ROOT / 'OFFER大作战_Logo.png') as im:
    im.thumbnail((440, 440))
    im.save(web / 'logo.webp', 'WEBP', quality=90)
print('Generated 5 mapped portraits and logo; originals preserved.')
