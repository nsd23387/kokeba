#!/usr/bin/env python3
# Render non-Latin script words (e.g. Amharic fidel) to transparent PNGs so they display/print
# in ANY context — independent of the reader's installed fonts. Run in your Codex env.
#
# Setup (one time, in your environment):
#   pip install pillow
#   # get a free Ethiopic font, e.g. Noto Sans Ethiopic (SIL OFL) or Abyssinica SIL, e.g.:
#   #   macOS: already has "Kefa"; or download Noto Sans Ethiopic .ttf
#   #   Linux: sudo apt-get install fonts-noto-core   (or fonts-sil-abyssinica)
#
# Usage:
#   python scripts/layout/render-fidel.py --font /path/NotoSansEthiopic-Bold.ttf \
#       --out build/fidel --size 96 --color 222B6D \
#       --words '[{"id":"lion","text":"አንበሳ"},{"id":"title","text":"ኤደን ወደ እንስሳት ማቆያ ሄደች"}]'
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("--font", required=True)
ap.add_argument("--out", default="build/fidel")
ap.add_argument("--size", type=int, default=96)
ap.add_argument("--color", default="222B6D")
ap.add_argument("--words", required=True, help="JSON list of {id,text}")
a = ap.parse_args()

os.makedirs(a.out, exist_ok=True)
font = ImageFont.truetype(a.font, a.size)
rgb = tuple(int(a.color[i:i+2], 16) for i in (0, 2, 4))
for w in json.loads(a.words):
    txt = w["text"]
    box = font.getbbox(txt)
    pad = a.size // 6
    img = Image.new("RGBA", (box[2]-box[0]+2*pad, box[3]-box[1]+2*pad), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((pad-box[0], pad-box[1]), txt, font=font, fill=rgb+(255,))
    img.save(os.path.join(a.out, f"{w['id']}.png"))
    print("wrote", w["id"]+".png")
