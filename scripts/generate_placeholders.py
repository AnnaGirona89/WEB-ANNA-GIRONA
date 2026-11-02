"""
Genera placeholders grises (cover.jpg) para cada proyecto en /assets/<slug>/.
Uso: python3 scripts/generate_placeholders.py
Cuando sustituyas cover.jpg por el archivo real (o cover.mp4), este script deja
de ser necesario para ese proyecto: la web detecta el archivo real automáticamente.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

PROJECTS = [
    ("axe-you-casting", "AXE", "You Casting"),
    ("mistercorn-sabores-del-mundo", "MisterCorn", "Sabores del Mundo"),
    ("tinder-flame-bar", "Tinder", "Flame Bar"),
    ("general-optica-art-direction", "General Óptica", "Art Direction"),
    ("general-optica-ojiplaticos", "General Óptica", "Ojipláticos"),
    ("oatly-100-animal-free", "Oatly", "100% Animal Free"),
    ("aerotermia-lg", "Aerotermia", "LG"),
    ("lo-que-me-ha-dado-el-mar-finnk", "Lo que me ha dado el mar", "Finnk"),
    ("impia-floral-design", "Impia", "Floral Design"),
    ("andres-huerta-no-funciona", "Andrés Huerta", "No Funciona"),
    ("double-date-tinder", "Double Date", "Tinder"),
    ("san-valentin-pinklady", "San Valentín", "Pinklady"),
    ("personal-projects", "Anna Girona", "Personal Projects"),
]

W, H = 1600, 1067  # ratio ~3:2
BG = (188, 188, 188)  # #bcbcbc
FG = (16, 16, 16)      # #101010

def load_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def draw_placeholder(slug, line1, line2):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # marco sutil
    draw.rectangle([20, 20, W - 20, H - 20], outline=FG, width=2)

    title_font = load_font(56)
    sub_font = load_font(30)
    tag_font = load_font(22)

    def center_text(text, font, y):
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) / 2, y), text, font=font, fill=FG)

    center_text(line1.upper(), title_font, H / 2 - 70)
    center_text(line2, sub_font, H / 2 + 10)
    center_text("PLACEHOLDER — cover.jpg", tag_font, H - 70)

    out_path = os.path.join(ASSETS, slug, "cover.jpg")
    img.save(out_path, "JPEG", quality=90)
    print("Generado:", out_path)

if __name__ == "__main__":
    for slug, l1, l2 in PROJECTS:
        draw_placeholder(slug, l1, l2)
