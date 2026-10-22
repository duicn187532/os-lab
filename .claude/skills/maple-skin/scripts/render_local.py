"""Render the page template as plain HTML with local images, to check it in a browser before
putting it on a Design canvas (the canvas itself is never verified this way).

    python3 -I render_local.py TEMPLATE OUT.html IMG_DIR [night]

IMG_DIR is relative to OUT.html and holds the files build_slices.py made, plus scene-day.jpg,
lv0-9.png and the npc-*.png the template names. The x-dc holes are filled with the default state.
"""
import re, sys
tpl = open(sys.argv[1]).read(); out = sys.argv[2]; d = sys.argv[3].rstrip('/') + '/'
night = len(sys.argv) > 4 and sys.argv[4] == 'night'
img = lambda m: d + m.group(1) + ('.jpg' if m.group(1).startswith('scene') else '.png')
s = re.sub(r'@@digits@@', '[]', tpl)
s = re.sub(r'@@([a-z0-9-]+)@@', img, s)
n, pct = 1, 1/16
vals = dict(rootClass='ms night' if night else 'ms', tabKid='tab', tabUni='tab on', tabGrad='tab', isKid=False, isUni=True, isGrad=False,
            open=True, closed=False, doneClass='gbtn', doneText='完成任務', questIcon=d + 'list0.png', questAlt='QUEST IN PROGRESS',
            curDot='dot me', lv=1, grayStyle='left: calc(%.2f%% + %.1fpx)' % (pct*100, -25+25*pct), expText='1 / 16 [6.25%]')
def sc_if(m):
    return m.group(2) if vals.get(m.group(1)) else ''
for _ in range(3): s = re.sub(r'<sc-if value="\{\{(\w+)\}\}"[^>]*>(.*?)</sc-if>', sc_if, s, flags=re.S)
s = re.sub(r'<sc-for[^>]*>.*?</sc-for>', '<img src="' + d + 'lv1.png" alt="">', s, flags=re.S)
s = re.sub(r'\{\{(\w+)\}\}', lambda m: str(vals.get(m.group(1), '')), s)
s = s.replace('<x-dc>', '').replace('</x-dc>', '').replace('<helmet>', '').replace('</helmet>', '')
s = re.sub(r'<script src="./support.js"></script>', '', s)
s = re.sub(r'<script type="text/x-dc".*?</script>', '', s, flags=re.S)
open(out, 'w').write(s); print(out)
