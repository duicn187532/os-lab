"""Compose Ellinia (the magic forest, Back/shineWood) as a page background.

ASSETS is a folder laid out like the organised asset pack:
  map/Map.wz/Back/shineWood.img/back/<n>.png

    python3 -I compose_ellinia.py ASSETS OUT.jpg

back/0 is the pale sky tile; back/3 and back/4 are misty canopy bands that tile vertically and
are laid side by side; back/8, 10, 12 and 13 are trunks that also tile vertically and frame the
two sides, where the tree houses (back/23, 25, 26, 28, 30) hang. The light shafts (back/16-19)
are drawn additively in the game and come out as white boxes here, so they are left out.
"""
import sys
from PIL import Image

A, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
BACK = A + "/map/Map.wz/Back/shineWood.img/back/"


def load(n, flip=False):
    im = Image.open(f"{BACK}{n}.png").convert("RGBA")
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im


img = Image.new("RGBA", (W, H))
sky = load(0)
for y in range(0, H, sky.height):
    for x in range(0, W, sky.width):
        img.alpha_composite(sky, (x, y))


def column(n, x, flip=False):
    im = load(n, flip)
    for y in range(H - im.height, -im.height, -im.height):
        img.alpha_composite(im, (x, y))


x = -100
for k, n in enumerate([4, 3, 4, 3, 4, 3, 4, 3, 4]):
    column(n, x, flip=k % 2 == 1)
    x += load(n).width - 60
column(13, -40)
column(8, 250, flip=True)
column(10, 1430)
column(12, 1640, flip=True)
for n, hx, hy, flip in [(28, 60, 250, False), (23, 300, 520, True), (30, 1450, 140, False), (26, 1700, 560, True), (25, 150, 780, False)]:
    img.alpha_composite(load(n, flip), (hx, hy))
img.convert("RGB").save(OUT, quality=84, optimize=True)
