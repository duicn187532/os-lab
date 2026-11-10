"""Contact sheet with one image per folder (its first frame), for sprite folders with many frames.

    python3 -I sheet_first.py FOLDER OUT.png DEPTH [scale]

DEPTH is how many path levels make one entry (e.g. 3 for Npc.wz/<id>.img/<action>).
"""
import sys, os, glob
from PIL import Image, ImageDraw
root, out, depth = sys.argv[1], sys.argv[2], int(sys.argv[3])
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1
dirs = sorted({os.path.dirname(f) for f in glob.glob(root + '/**/*.png', recursive=True)})
seen = {}
for d in dirs:
    key = '/'.join(os.path.relpath(d, root).split('/')[:depth])
    if key not in seen: seen[key] = sorted(glob.glob(d + '/*.png'))[0]
W = 1600; x = y = 0; rowh = 0; pos = []
for key, f in seen.items():
    im = Image.open(f).convert('RGBA'); im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.NEAREST)
    if im.height > 300: im = im.resize((int(im.width * 300 / im.height), 300))
    if im.width > W: im = im.resize((W, int(im.height * W / im.width)))
    if x + im.width > W: x = 0; y += rowh + 30; rowh = 0
    pos.append((key, im, x, y)); x += max(im.width, 120) + 14; rowh = max(rowh, im.height)
sheet = Image.new('RGBA', (W, y + rowh + 34), (176, 196, 210, 255)); dr = ImageDraw.Draw(sheet)
for key, im, x, y in pos:
    sheet.alpha_composite(im, (x, y + 14)); dr.text((x, y), key[-24:], fill=(0, 0, 0, 255))
sheet.save(out); print(out, len(pos))
