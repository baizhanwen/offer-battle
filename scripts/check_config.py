"""Print presence and switches only, never values, URLs containing secrets or key fragments."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / '.env')
from app.providers import capabilities
for capability,ready in capabilities().items():
    print(capability+': '+('配置就绪，尚需真实调用验证' if ready else '未启用/缺少凭证或 Key 类型声明'))
