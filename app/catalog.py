import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = json.loads((ROOT / 'campus_ai_prompts_v3.json').read_text())
ROLES = {r['role_id']: r for r in PACK['roles']}
POSITIONS = {p['position_id']: p for p in PACK['positions']}


def public_catalog():
    return {
        'version': PACK['version'],
        'roles': [{k: r[k] for k in ('role_id', 'role_name', 'identity', 'tags', 'mood_tags')} |
                  {'avatar': f"/assets/{r['role_id']}.webp"} for r in ROLES.values()],
        'positions': [{k: p[k] for k in ('position_id', 'position_name', 'description', 'responsibilities')}
                      for p in POSITIONS.values()],
    }
