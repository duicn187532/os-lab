"""Cut the world-select pieces of the login screen (UI.wz/Login.img) into page frames.

    python3 -I build_login.py ASSETS OUT_DIR

  scroll9.png  WorldSelect/scroll/0/1, the open scroll: rod and knobs on top, a curl at the foot.
               Slices 150 52 34 50 (top right bottom left); the paper runs x 38-486.
  parch9.png   WorldSelect/chBackgrn, the channel list's parchment. Slices 60 30 20 30; the two
               ruled lines sit at y 26 and 218, so the top slice carries the first one.
  plank9.png   WorldSelect/BtWorld/e, the blank world sign, turned to lie flat (95x26).
               Slices 4 6 4 16; the left 16 holds the nail.
  leaf.png     Title/MSTitle, the logo's red maple leaf alone (the black lettering dropped), 64x64.
  bt-{orange,blue,navy,lime}-{normal,hover,pressed}.png
               Basic.img BtSend, BtReceive, BtYes and BtQGiveup with the label cut out: the left
               3 columns, a text-free column (x 3) four times, the right 3. Slices 2 3 2 3, so CSS
               stretches them to any width with Chinese labels on top.
"""
import os
import sys
from PIL import Image

A, O = sys.argv[1], sys.argv[2]
os.makedirs(O, exist_ok=True)
WS = A + "/ui/UI.wz/Login.img/WorldSelect/"
# the painted paper loses nothing visible at 256 colours and drops to about a third of the bytes
for src, out in [("scroll/0/1.png", "scroll9.png"), ("chBackgrn.png", "parch9.png")]:
    im = Image.open(WS + src).convert("RGBA").quantize(256, method=Image.Quantize.FASTOCTREE)
    im.save(os.path.join(O, out), optimize=True)
Image.open(WS + "BtWorld/e/normal/0.png").convert("RGBA").rotate(90, expand=True).save(os.path.join(O, "plank9.png"), optimize=True)

# the logo's leaf: its red pixels, right of the lettering, centred on a square
logo = Image.open(A + "/ui/UI.wz/Login.img/Title/MSTitle.png").convert("RGBA")
leaf = Image.new("RGBA", logo.size, (0, 0, 0, 0))
src, dst = logo.load(), leaf.load()
for y in range(logo.height):
    for x in range(180, logo.width):
        r, g, b, a = src[x, y]
        if a and r > g + 40 and r > b + 40:
            dst[x, y] = (r, g, b, a)
leaf = leaf.crop(leaf.getbbox())
side = max(leaf.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(leaf, ((side - leaf.width) // 2, (side - leaf.height) // 2))
square.resize((64, 64), Image.LANCZOS).save(os.path.join(O, "leaf.png"), optimize=True)

# the game's plain buttons, label removed, for CSS to stretch
for colour, name in [("orange", "BtSend"), ("blue", "BtReceive"), ("navy", "BtYes"), ("lime", "BtQGiveup")]:
    for state, src in [("normal", "normal"), ("hover", "mouseOver"), ("pressed", "pressed")]:
        bt = Image.open(A + "/ui/UI.wz/Basic.img/%s_%s_0.png" % (name, src)).convert("RGBA")
        w, h = bt.size
        piece = Image.new("RGBA", (10, h))
        piece.paste(bt.crop((0, 0, 3, h)), (0, 0))
        for k in range(4):
            piece.paste(bt.crop((3, 0, 4, h)), (3 + k, 0))
        piece.paste(bt.crop((w - 3, 0, w, h)), (7, 0))
        piece.save(os.path.join(O, "bt-%s-%s.png" % (colour, state)), optimize=True)
