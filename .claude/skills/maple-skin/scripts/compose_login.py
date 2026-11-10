"""Compose the login-screen forest (the v83 title backdrop) as a page background.

ASSETS is a folder laid out like the organised asset pack:
  map/Map.wz/Back/login.img/back/{11,29,30}.png

    python3 -I compose_login.py ASSETS OUT.jpg

back/11 is the 800x600 forest path behind the login box; it is scaled to cover 1920x1080 and
anchored at the bottom so the path stays in view. back/29 (sky) shows through its gaps, and the
world-select tree house back/30 stands at the right edge.
"""
import sys
from PIL import Image, ImageOps

A, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
BACK = A + "/map/Map.wz/Back/login.img/back/"


def load(name, scale):
    im = Image.open(BACK + name + ".png").convert("RGBA")
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)


img = load("29", 2.4).crop((0, 0, W, H))
forest = load("11", 2.4)
img.alpha_composite(forest.crop((0, forest.height - H - 60, W, forest.height - 60)))
house = ImageOps.mirror(load("30", 1.15))
img.alpha_composite(house, (W - house.width + 190, H - house.height + 70))
img.convert("RGB").save(OUT, quality=84, optimize=True)
