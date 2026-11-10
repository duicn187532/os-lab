"""Turn exported frame folders into sprite strips plus a table the page reads.

    python3 -I build_sprites.py ASSETS OUT_DIR SPEC.json

SPEC.json lists the sprites:
    {"mob-slime": {"kind": "mob", "dir": "mob/Mob.wz/0210100.img",
                   "acts": {"stand": "stand", "move": "move", "hit": "hit1", "die": "die1"}}, ...}
"kind" and any other keys besides "dir", "acts" and "palette" are copied to the table as they are.
"palette": true stores the strips with a 256-colour palette, for big soft effects (LevelUp drops
from 300 to 160 KB); leave it off for characters, whose edges it would roughen.
An action's frames are either ACTION/0.png, 1.png ... (WZ export), ACTION/frame_000.png ...
(pet export) or ACTION_0.png, ACTION_1.png ... (flat export; ACTION may hold a subfolder,
as in "move-jump/move"); "dir" may also name a single PNG, which becomes a one-frame "stand".
"ACTION#A-B" keeps frames A to B only (an effect whose parts belong in different places, such
as LevelUp's light pillar 0-11 and its words 12-20); files with no number, like NoCri1's
"effect.png", are skipped.

Each action becomes OUT_DIR/spr-NAME-ACT.png: its frames side by side in equal cells, each
frame bottom-centred, because the exports drop the game's origin points and feet on one line
is what keeps a sprite from hopping. OUT_DIR/sprites.js sets window.MAPLE_SPRITES to
{NAME: {...extra keys, acts: {ACT: [cell width, cell height, frame count]}}}.
"""
import json
import os
import re
import sys
from PIL import Image

A, O, SPEC = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(O, exist_ok=True)


def frames(base, act):
    act, _, span = act.partition("#")
    folder = os.path.join(base, act)
    if os.path.isdir(folder):
        names = [f for f in os.listdir(folder) if re.search(r"\d+\.png$", f)]
    else:
        folder, prefix = os.path.split(folder)
        names = [f for f in os.listdir(folder) if re.fullmatch(re.escape(prefix) + r"_\d+\.png", f)]
    names.sort(key=lambda f: int(re.findall(r"\d+", f)[-1]))
    if span:
        lo, hi = (int(n) for n in span.split("-"))
        names = [f for f in names if lo <= int(re.findall(r"\d+", f)[-1]) <= hi]
    return [Image.open(os.path.join(folder, f)).convert("RGBA") for f in names]


def strip(imgs, out, palette=False):
    imgs = [im for im in imgs if im.width > 1 or im.height > 1]
    if not imgs:
        return None
    w, h = max(im.width for im in imgs), max(im.height for im in imgs)
    sheet = Image.new("RGBA", (w * len(imgs), h))
    for i, im in enumerate(imgs):
        sheet.alpha_composite(im, (i * w + (w - im.width) // 2, h - im.height))
    if palette:
        sheet = sheet.quantize(256, method=Image.Quantize.FASTOCTREE)
    sheet.save(out, optimize=True)
    return [w, h, len(imgs)]


table = {}
for name, spec in json.load(open(SPEC, encoding="utf-8")).items():
    base = os.path.join(A, spec["dir"])
    entry = {k: v for k, v in spec.items() if k not in ("dir", "acts", "palette")}
    entry["acts"] = {}
    if os.path.isfile(base):
        acts = {"stand": [Image.open(base).convert("RGBA")]}
    else:
        acts = {act: frames(base, src) for act, src in spec["acts"].items()}
    for act, imgs in acts.items():
        cell = strip(imgs, os.path.join(O, f"spr-{name}-{act}.png"), spec.get("palette", False))
        if cell:
            entry["acts"][act] = cell
        else:
            print(f"{name}: no frames for {act}", file=sys.stderr)
    if "stand" in entry["acts"]:
        table[name] = entry
    else:
        print(f"{name}: skipped, no stand frames", file=sys.stderr)

with open(os.path.join(O, "sprites.js"), "w", encoding="utf-8") as f:
    f.write("// Built by build_sprites.py; see its docstring.\n")
    f.write("window.MAPLE_SPRITES = " + json.dumps(table, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"{len(table)} sprites")
