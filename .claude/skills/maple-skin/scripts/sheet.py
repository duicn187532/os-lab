"""Contact sheet of every PNG under a folder, labelled with its path.

    python3 -I sheet.py FOLDER OUT.png [skip,substrings] [scale]

Pass "mouseOver,pressed,disabled,keyFocused" as the skip list to see only the normal state of buttons.
"""
import sys, glob, os
from PIL import Image, ImageDraw
root, out = sys.argv[1], sys.argv[2]
skip = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else []
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1
files = [f for f in sorted(glob.glob(root + '/**/*.png', recursive=True)) if not any(s in f for s in skip)]
W = 1600; x = y = 0; rowh = 0; pos = []
for f in files:
    im = Image.open(f).convert('RGBA'); w, h = im.size
    w2, h2 = int(w * scale), int(h * scale)
    if w2 > W: r = W / w2; w2, h2 = W, int(h2 * r)
    if x + w2 > W: x = 0; y += rowh + 26; rowh = 0
    pos.append((f, im, x, y, w2, h2)); x += max(w2, 90) + 12; rowh = max(rowh, h2)
sheet = Image.new('RGBA', (W, y + rowh + 30), (190, 200, 206, 255)); d = ImageDraw.Draw(sheet)
for f, im, x, y, w2, h2 in pos:
    sheet.alpha_composite(im.resize((max(w2,1), max(h2,1)), Image.NEAREST), (x, y + 12))
    d.text((x, y), os.path.relpath(f, root)[-30:].replace('.png', ''), fill=(0, 0, 0, 255))
sheet.save(out); print(out, sheet.size, len(files))
