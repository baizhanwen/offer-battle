import math
from PIL import Image, ImageDraw, ImageFont

RED = (176, 42, 31, 255)
SIZE = 1024
CX = CY = 512

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 浸染底圆
draw.ellipse((CX-472, CY-472, CX+472, CY+472), fill=(176, 42, 31, 16))

# 外环
draw.ellipse((CX-460, CY-460, CX+460, CY+460), outline=RED, width=26)

# 内虚线环
bbox = (CX-336, CY-336, CX+336, CY+336)
for a in range(0, 360, 32):
    draw.arc(bbox, a, a + 18, fill=RED, width=9)

# 五角星
outer_r, inner_r = 190, 74
pts = []
for i in range(10):
    r = outer_r if i % 2 == 0 else inner_r
    ang = math.radians(-90 + i * 36)
    pts.append((CX + r * math.cos(ang), CY + r * math.sin(ang)))
draw.polygon(pts, fill=RED)

# 字体
FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", 82)
FONT_SMALL = ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", 70)

def draw_arc_text(text, R, t_start, t_end, font):
    n = len(text)
    for i, ch in enumerate(text):
        t = i / (n - 1) if n > 1 else 0
        theta = t_start + (t_end - t_start) * t
        rad = math.radians(theta)
        x = CX + R * math.sin(rad)
        y = CY - R * math.cos(rad)
        rot = -theta
        fs = font.size
        tmp = Image.new("RGBA", (fs * 2, fs * 2), (0, 0, 0, 0))
        dtmp = ImageDraw.Draw(tmp)
        dtmp.text((fs, fs), ch, font=font, fill=RED, anchor="mm")
        tmp = tmp.rotate(rot, resample=Image.BICUBIC)
        img.paste(tmp, (int(x - fs), int(y - fs)), tmp)

# 上弧：OFFER大作战（左→右，经过顶部）
draw_arc_text("OFFER大作战", 390, -50, 50, FONT)
# 下弧：人事部·校园分部（右→左，经过底部）
draw_arc_text("人事部·校园分部", 390, 130, 230, FONT_SMALL)

img.save("/Users/bai/黑客松/OFFER大作战_Logo.png")

# 双层盖章效果：偏移淡印叠底
ghost = Image.new("RGBA", (SIZE + 26, SIZE + 26), (0, 0, 0, 0))
ghost.paste(img, (14, 10))
r, g, b, a = ghost.split()
a = a.point(lambda v: int(v * 0.3))
ghost = Image.merge("RGBA", (r, g, b, a))
out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
out.alpha_composite(ghost.crop((0, 0, SIZE, SIZE)))
out.alpha_composite(img)
out.save("/Users/bai/黑客松/OFFER大作战_Logo.png")
print("saved with ghost seal")
