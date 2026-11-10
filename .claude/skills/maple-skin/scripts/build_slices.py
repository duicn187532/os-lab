"""Build the 9-slice sheets and HUD pieces the page uses, from the organised asset pack.

    python3 -I build_slices.py ASSETS OUT_DIR

Each output is one image meant for CSS border-image; the slice numbers are in SKILL.md.
"""
import os
import shutil
import sys
from PIL import Image

A, O = sys.argv[1], sys.argv[2]
os.makedirs(O, exist_ok=True)
UI = A + "/ui/UI.wz/"
DLG = UI + "UIWindow.img/UtilDlgEx/"
SB = UI + "StatusBar.img/"
BASIC = UI + "Basic.img/"


def load(path):
    return Image.open(path).convert("RGBA")


def grid(folder, sizes, out):
    """Paste nw n ne / w c e / sw s se into one sheet. sizes = (left, mid, right, top, midh, bottom)."""
    lw, mw, rw, th, mh, bh = sizes
    sheet = Image.new("RGBA", (lw + mw + rw, th + mh + bh))
    xs, ys = (0, lw, lw + mw), (0, th, th + mh)
    for r, row in enumerate([["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]]):
        for c, key in enumerate(row):
            sheet.alpha_composite(load(folder + key + ".png"), (xs[c], ys[r]))
    sheet.save(out)


# NPC dialog: t (28) + c (20) + s (58), 529 wide
t, c, s = load(DLG + "t.png"), load(DLG + "c.png"), load(DLG + "s.png")
dlg = Image.new("RGBA", (t.width, t.height + c.height + s.height))
dlg.alpha_composite(t, (0, 0))
dlg.alpha_composite(c, (0, t.height))
dlg.alpha_composite(s, (0, t.height + c.height))
dlg.save(O + "/dlg9.png")
# plain window: the same frame with the beige portrait column (x 16..140) cut out
win = Image.new("RGBA", (16 + dlg.width - 141, dlg.height))
win.alpha_composite(dlg.crop((0, 0, 16, dlg.height)), (0, 0))
win.alpha_composite(dlg.crop((141, 0, dlg.width, dlg.height)), (16, 0))
win.save(O + "/win9.png")
# short window for boxes without buttons: drop the blue button band (rows 76..99), keep the bottom edge
short = Image.new("RGBA", (win.width, win.height - 24))
short.alpha_composite(win.crop((0, 0, win.width, 76)), (0, 0))
short.alpha_composite(win.crop((0, 100, win.width, win.height)), (0, 76))
short.save(O + "/win9s.png")

grid(UI + "ChatBalloon.img/npc/", (6, 12, 6, 6, 14, 6), O + "/bal9.png")
shutil.copy(UI + "ChatBalloon.img/npc/arrow.png", O + "/bal-arrow.png")
grid(UI + "UIWindow.img/MiniMap/MaxMap/", (6, 1, 6, 72, 1, 15), O + "/mini9.png")
shutil.copy(UI + "UIWindow.img/MiniMap/title.png", O + "/mini-title.png")
shutil.copy(UI + "UIWindow.img/MiniMap/BtMap/normal/0.png", O + "/bt-world.png")

# status bar: silver base repeats on x; backgrnd2 holds the chat strip (y 7..29),
# the LV + name panel (x 0..207) and the gauge panel (x 208..566) on rows 29..71
shutil.copy(SB + "base/backgrnd.png", O + "/hud-bg.png")
b2 = load(SB + "base/backgrnd2.png")
b2.crop((0, 7, 566, 29)).save(O + "/chat9.png")
b2.crop((0, 29, 207, 71)).save(O + "/hud-left.png")
b2.crop((208, 29, 566, 71)).save(O + "/hud-gp9.png")
load(SB + "gauge/bar.png").crop((216, 0, 340, 31)).save(O + "/exp.png")
shutil.copy(SB + "gauge/gray.png", O + "/exp-gray.png")

for state in ["normal", "mouseOver", "pressed"]:
    shutil.copy(SB + "BtMenu/%s/0.png" % state, O + "/bt-menu-%s.png" % state)
    shutil.copy(SB + "BtShort/%s/0.png" % state, O + "/bt-short-%s.png" % state)
    for b in ["BtNext", "BtPrev", "BtClose", "BtOK"]:
        shutil.copy(DLG + "%s/%s/0.png" % (b, state), O + "/%s-%s.png" % (b.lower(), state))
for i in range(10):
    shutil.copy(BASIC + "LevelNo_%d.png" % i, O + "/lv%d.png" % i)
for k in "01":
    left, fill, right = load(BASIC + "Tab_left%s.png" % k), load(BASIC + "Tab_fill%s.png" % k), load(BASIC + "Tab_right%s.png" % k)
    tab = Image.new("RGBA", (left.width + 8 + right.width, left.height))
    tab.alpha_composite(left, (0, 0))
    for x in range(8):
        tab.alpha_composite(fill, (left.width + x, 0))
    tab.alpha_composite(right, (left.width + 8, 0))
    tab.save(O + "/tab%s.png" % k)
shutil.copy(BASIC + "Cursor_0_0.png", O + "/cursor.png")
for k in ["list0", "list1", "list3", "bar"]:
    shutil.copy(DLG + k + ".png", O + "/" + k + ".png")
print(sorted(os.listdir(O)))
