"""Compose a Henesys-style backdrop from real Map.wz layers.

ASSETS is a folder laid out like the organised asset pack:
  map/Map.wz/Back/grassySoil.img/back/{1,2,4,5,6,7}.png
  map/Map.wz/Obj/acc1.img/grassySoil/{nature,artificiality,market}/<n>/0.png
  map/Map.wz/Tile/whiteMarble.img/{bsc,enH0}/<n>.png

    python3 -I compose_scene.py ASSETS OUT.jpg [WIDTH HEIGHT]

Layer order follows the game: sky colour, clouds, far hill, near hill, foreground grass,
objects standing on the ground line, then the tile row. Objects are bottom-aligned on GROUND.
"""
import sys
from PIL import Image

A = sys.argv[1]
OUT = sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1920
H = int(sys.argv[4]) if len(sys.argv) > 4 else 1080
BACK = A + "/map/Map.wz/Back/grassySoil.img/back/"
OBJ = A + "/map/Map.wz/Obj/acc1.img/grassySoil/"
TILE = A + "/map/Map.wz/Tile/whiteMarble.img/"
GROUND = H - 104


def load(path):
    return Image.open(path).convert("RGBA")


img = Image.new("RGBA", (W, H))
# sky: back/0 is a flat (51,102,204) swatch; fade it towards a pale horizon
top, bottom = (51, 102, 204), (170, 214, 240)
for y in range(H):
    t = min(1, y / 620)
    img.paste(tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,), (0, y, W, y + 1))
clouds = load(BACK + "1.png")
for x in range(0, W, clouds.width):
    img.alpha_composite(clouds, (x, 70))
far = load(BACK + "7.png")
img.alpha_composite(far, (-2000, GROUND - 330 - 170))
img.alpha_composite(far, (-420, GROUND - 330 - 150))
img.alpha_composite(load(BACK + "2.png"), (-760, GROUND - 330 - 60))
x = -200
for name in ["4", "6", "5", "4"]:
    g = load(BACK + name + ".png")
    img.alpha_composite(g, (x, GROUND - g.height + 40))
    x += g.width


def obj(path, cx):
    o = load(OBJ + path)
    img.alpha_composite(o, (int(cx - o.width / 2), GROUND + 8 - o.height))


# positions are for a 1920-wide scene; reading windows cover the middle, so the
# landmarks sit at the two sides
s = W / 1920
for path, cx in [
    ("nature/15/0.png", 300), ("artificiality/32/0.png", 210), ("market/16/0.png", 470),
    ("nature/13/0.png", 560), ("nature/15/0.png", 1380), ("artificiality/39/0.png", 1660),
    ("nature/22/0.png", 1440), ("nature/23/0.png", 1470), ("nature/24/0.png", 1500),
    ("nature/23/0.png", 1530), ("nature/13/0.png", 1830), ("market/15/0.png", 760),
    ("artificiality/22/0.png", 640),
]:
    obj(path, cx * s)

bricks = [load(TILE + "bsc/%d.png" % i) for i in range(5)]
edges = [load(TILE + "enH0/%d.png" % i) for i in range(2)]
x = i = 0
while x < W:
    b = bricks[i % len(bricks)]
    for y in range(GROUND, H, b.height):
        img.alpha_composite(b, (x, y))
    x += b.width
    i += 1
x = i = 0
while x < W:
    e = edges[i % len(edges)]
    img.alpha_composite(e, (x, GROUND - e.height + 6))
    x += e.width
    i += 1
img.convert("RGB").save(OUT, optimize=True)
print(OUT, img.size)
