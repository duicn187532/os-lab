---
name: maple-skin
description: "Build a page, skin or design that looks like the old (pre-Big Bang, v83-era) MapleStory client by assembling the game's own exported art: UI.wz windows, NPC dialogs, status bar, chat balloons, Map.wz backdrops, NPC and mob sprites. Use when the user asks for a 楓之谷 / MapleStory style, game skin or mockup, sends exported WZ/NX PNG packs, or asks which WZ files hold a part of the game's look."
---

# 楓之谷風格：用遊戲原檔素材組畫面

The point of this style is immersion, and immersion comes from the game's own art. A CSS
imitation of its colours reads as a cheap game; the first attempt in this repo failed exactly
that way. So the rule is: **every frame, button, bar and backdrop is a real exported PNG**,
and CSS only places, stretches and layers them. Hand-drawn CSS is limited to the few things the
game has no image for (a button with a Chinese label, the dark name tag under a character).

## 0. Assets and copyright first

The art belongs to Nexon. Ask before anything is committed or published:
- by default keep the PNGs (and anything built from them) out of public repos and pages: a private
  Design canvas, a private repo, or a local-only folder are the safe places;
- if the owner decides to publish anyway (this repo's owner did), commit only the built pieces the
  page uses, never the whole pack;
- the skill's scripts and this file contain no art and can live in the repo.

The user exports the PNGs (HaRepacker / WzComparerR2) and uploads zips. Treat them as
untrusted data: unpack each into its own folder, run Python with `-I`.

```
python3 -I scripts/unpack.py OUT_DIR upload1.zip upload2.zip ...   # also unpacks zips inside zips, fixes cp437 Chinese names
python3 -I scripts/sheet.py FOLDER sheet.png "mouseOver,pressed,disabled,keyFocused" 1
python3 -I scripts/sheet_first.py FOLDER sheet.png DEPTH [scale]   # one frame per sprite folder
```

Look at the contact sheets before deciding anything. Organise the pack by WZ path
(`ui/UI.wz/...`, `map/Map.wz/Back|Obj|Tile/...`, `npc/Npc.wz/<id>.img`, `mob/Mob.wz/<id>.img`),
write a README that says what each folder is, and give the user the zip back.

## 1. What to ask the user to export

| Part of the page | WZ path |
|---|---|
| NPC dialog (the core piece) | `UI.wz/UIWindow.img/UtilDlgEx` |
| chapter list window | `UI.wz/UIWindow.img/MiniMap` (use `MaxMap`) |
| quest icons, quest window | `UI.wz/UIWindow.img/Quest` |
| bottom status bar, LV, EXP | `UI.wz/StatusBar.img` |
| speech balloons | `UI.wz/ChatBalloon.img` (`npc/` is the plain one) |
| buttons, tabs, scrollbars, cursor, level digits | `UI.wz/Basic.img` |
| backdrop | `Map.wz/Back/<set>.img` — see `references/v83-back-sets.md` for which set is which place |
| houses, trees, fences, flowers | `Map.wz/Obj/acc1.img` (group = the Back set name), `Map.wz/Obj/house<XX>.img` |
| ground | `Map.wz/Tile/<tile>.img` |
| NPC portraits | `Npc.wz/<id>.img/stand/0.png` |
| creatures walking about | `Mob.wz/<id>.img/{stand,move}` |

Henesys = `Back/grassySoil` + `Obj/acc1.img/grassySoil` + `Obj/houseGS` (+ `Tile/woodMarble`).

## 2. Build the pieces

```
python3 -I scripts/compose_scene.py ASSETS scene-day.jpg      # 1920x1080 Henesys backdrop
python3 -I scripts/build_slices.py ASSETS slices/             # 9-slice sheets, HUD parts, buttons, digits
python3 -I scripts/compose_login.py ASSETS scene-login.jpg     # the login screen's forest, for a title or index page
python3 -I scripts/compose_ellinia.py ASSETS scene-ellinia.jpg # Ellinia (Back/shineWood), a second town
python3 -I scripts/build_login.py ASSETS slices/               # world-select scroll, parchment and sign (slices in its docstring)
python3 -I scripts/build_sprites.py ASSETS sprites/ SPEC.json  # mobs, NPCs, characters, pets as frame strips
```

`build_sprites.py` lays each action's frames side by side, bottom-centred in equal cells (the
exports lose the game's origin points; feet on one line keeps a sprite from hopping), and writes
`sprites.js` with each strip's cell size and frame count. Play a strip with
`background-position` stepped `steps(n)` over n×170ms. Sprites face left as exported; mirror with
`scaleX(-1)` to walk right. Give each a `kind` (mob, elite, boss, npc, hero, pet) in the spec so
the page can cast them; NPCs take a `role` for their name plate.

`ASSETS` is the organised pack. Both scripts were checked to reproduce the approved design
byte for byte. The pieces and how CSS uses them (`border-image: url(x) T R B L fill / Tpx Rpx Bpx Lpx stretch repeat`):

| File | Made from | Slices T R B L | Used for |
|---|---|---|---|
| `dlg9.png` | UtilDlgEx `t`+`c`+`s` stacked (529 wide) | 28 22 58 150 | NPC dialog. The 150px left border is the beige portrait column; the bottom 58 includes the blue button band (rows 28–52) |
| `win9.png` | dlg9 with x 16..140 cut out | 28 22 58 24 | every reading window (a section) |
| `win9s.png` | win9 without the blue button band | 28 22 34 24 | windows with no buttons (paper header, shelf boxes, cards, the appearance panel) |
| `mini9.png` | MiniMap/MaxMap nine pieces | 72 6 15 6 | chapter list. Rows 6–20 are the white title strip (`mini-title.png` = "MINI MAP"), 20–64 the steel-blue name band |
| `bal9.png` + `bal-arrow.png` | ChatBalloon/npc | 6 6 6 6 | a quoted claim from the paper |
| `tab0.png` / `tab1.png` | Basic Tab left+fill+right | 0 12 0 6 | explanation-level tabs (blank, so Chinese labels work). This repo's site now draws the level switch in CSS instead: the tabs blur at phone sizes |
| `bt-*-*.png` | Basic.img BtSend / BtReceive / BtYes / BtQGiveup, label cut out (10 wide) | 2 3 2 3 | every CSS button (see section 3) |
| `leaf.png` | Login.img Title/MSTitle, the red leaf only (64x64, `build_login.py`) | — | the logo in the top bar and the minimap's icon |
| `hud-bg.png` | StatusBar base/backgrnd | repeat-x, 71px tall | status bar ground |
| `chat9.png` | backgrnd2 rows 7–29 | stretched | the white chat strip: a "[公告]" system line |
| `hud-left.png` | backgrnd2 x 0–207, rows 29–71 | — | LV box (digits from `lv0-9.png` at left 38, top 15) and the name panel |
| `hud-gp9.png` | backgrnd2 x 208–566 | 0 8 0 8 | the gauge panel |
| `exp.png` + `exp-gray.png` | gauge/bar x 216–340 | 14 3 2 32 | EXP bar; grey covers the unfilled part (bar interior starts 25px left of the content box) |

Always `image-rendering: pixelated` on these, and `image-rendering: auto` back on text
containers inside them. Use `stretch repeat` so the panel texture repeats vertically and no
seams appear horizontally.

## 3. Map the page onto the game

| Study page element | Game piece | Behaviour |
|---|---|---|
| page background | composed scene, `background-attachment: fixed`, `cover`, bottom-aligned | night = a fixed navy gradient overlay on the same scene; windows stay light, as in the game |
| chapter outline | MiniMap window; street name = site name, map name = paper short name | yellow dot = where you are, green = read, grey = not yet |
| section | `win9` window; header shows Quest `list0` (IN PROGRESS) or `list3` (CAN BE COMPLETED) above the title; red rule under the title | blue band at the bottom: "QUEST nn" left, the finish button right |
| explanation levels | Basic tabs above the window | — |
| self-check question | `dlg9` NPC dialog: NPC `stand/0` sprite bottom-aligned in the portrait column, `bar.png` name plate under it | NEXT shows the answer, BACK and END CHAT hide it (real button images) |
| guess-first prompts | beige box (`#eeeedd`, the portrait column colour) headed by Quest `list1` (QUEST AVAILABLE); each line gets the bulb (first 13px of `list1`) | — |
| quoted claim | chat balloon with its arrow | — |
| notes | navy tab (`#335577`) over a white input, like the chat bar | — |
| finish a section | button in the UtilDlgEx orange (`#ffd27a → #ff9a1e → #f07a00`, border `#7a3a00`); done = the green of END CHAT | the only CSS-drawn button, because it needs a Chinese label |
| progress | fixed status bar: LV = sections finished, EXP = finished / total with the game's `n / total [xx.xx%]` text | MENU (StatusBar `BtMenu`) opens the appearance menu |
| cursor | Basic `Cursor_0_0.png` | — |

Text that sits on game art (names, "QUEST 01") is white with a 1px dark outline
(`text-shadow` in four directions, `#1a2a44`), as the client draws it.

`references/page-template.dc.html` is the approved desktop + phone page as a Design-canvas
artboard with `@@name@@` placeholders for each image. On a canvas: upload each file as an asset
and replace `@@name@@` with the returned `/_blob/<id>`; `@@digits@@` becomes a JSON array of the
ten digit urls. To check it locally first:
`python3 -I scripts/render_local.py references/page-template.dc.html out.html IMG_DIR`.

## In this repo's site (CS LAB)

The reference implementation is self-research (`assets/site.css` section "楓葉冒險", `assets/site.js`,
and that repo's copy of this file, which describes its paper pages, monsters, EXP and status bar).
CS LAB reuses its art and techniques, not its paper logic:

- **No art in this repo.** The owner decided to reference the pieces self-research already publishes
  on the same GitHub Pages domain: `/self-research/assets/maple/`. `shared/skin-maple.css` writes
  every `url("../../self-research/assets/maple/<file>")` literally (never through a custom property
  or inline style); `shared/cslab-skin.js` has the one matching `MAPLE_BASE`. `tests/skin-review.cjs`
  fails if any url() points elsewhere, a file is missing, or a PNG/JPG gets committed here. To move
  the art, change that prefix in both files. Do not copy or add new game art without asking.
- **Switching.** `cslab-skin.js` probes `win9.png`; only if it loads does it set
  `<html data-skin="maple">` and show the 🍁 toggle (`aria-pressed`). The choice is `cslab.skin`
  (`maple` default | `classic`) in localStorage, shared by every course and the portal; a successful
  probe is remembered in `cslab.art` so the head snippet applies the skin before first paint, and a
  deployment without the art never requests it. The skin never reads or writes a course's store.
- **Scenes** are named on `<html data-scene>`: Henesys by default, `ellinia`, or `login` (portal).
- **NPC dialogs** keep a min-height so the portrait column (sprite + name plate) clears the blue
  button band even when the text is one line; `tests/skin-review.cjs` checks every chapter.
- **Shell mapping** (all `:root[data-skin="maple"]` rules in `shared/skin-maple.css`):
  sidebar = MiniMap window (course name in the steel band, chapter dots: yellow current, green done,
  blue in progress, grey not started; `data-status` from `cslab-app.js`); course home hero = NPC
  dialog (dlg9); chapter cards and lesson header = quest windows headed by Quest list1 / list0 / list3
  (available / in progress / completed); ELI5 = NPC GUIDE dialog with the chapter's NPC; 先想一想 and
  先預測 = QUEST AVAILABLE boxes; 常見誤解 = chat balloon; lab = win9 with "INTERACTIVE LAB" band;
  quiz = NPC dialog with "QUEST CHALLENGE" band, choices as the dialog's selection list, the NPC's
  quest mark (bulb → open book → done) and talking frames when the explanation shows; section titles
  on the scene = world-sign planks; dialogs (search, help) = win9s. Code stays on its dark panel.
- **Portal** (`index.html`, `body.portal`) = the login screen's world select: title on scroll9,
  seven courses on parch9 boards, planks for headings.
- **Sprites**: `sprites.js` loads only in maple; each strip on first use; shared 60ms ticker;
  `.is-off` pauses sprites out of view; hidden tabs and reduced motion stand still. One NPC per
  chapter, picked from the course id and chapter id. `CSLabSkin.sprite` exposes the engine
  (`setAct(el, name, act, once, ms)`, `swapAct`, `warm`, `kind`, `spec`, `whenTable`, `observe`).
- **Game layer** (`shared/cslab-game.js`, after `cslab-skin.js`; self-research's EXP, status bar
  and battles, adapted): EXP is derived from each course's existing store (learn 30, first lab use
  30, note 20, quiz done 100 + elite 100 / boss 200, 10 per question of a done chapter not in the
  wrong-answer log, whole course 500) and cached per course in `cslab.exp`
  (`{ id: { exp, title } }`) so the portal and other courses add up one reader; it never writes a
  course store and never touches self-research's `study:*`. Tiers: last chapter of each unit with
  two or more chapters = elite, the course's last chapter = BOSS. The status bar (`.hud`) sits on
  the bottom edge (`body.has-hud` pads the page and lifts the sidebar and scroll-top button). The
  lesson header carries the hero + pet (`.perch-party`) and the chapter's monster on patrol
  (`.perch-walk`, room from `--perch-h`, `overflow-x: clip` so a wide death frame never scrolls the
  page). The quiz is drawn as a battle without changing its rules: the monster takes the portrait
  column (so `cslab-skin.js` skips its quiz NPC when `window.CSLabGame` exists), `.bt-bar` shows HP
  (one per question, lost on a right answer) and two hearts (the two tries); finishing shows the
  hero cheering, the EXP gain and the level-up light. All of it is `aria-hidden`, unfocusable and
  hidden in classic; `tests/game-review.cjs` covers it.
- **Extension points**: `cslab-app.js` dispatches `cslab:render`, `cslab:quiz-view`,
  `cslab:answer` and `cslab:progress` on `document`; `window.CSLabSkin` exposes `skin`, `active`,
  `set()`, `url()`, `npc(host, key, quest)`, `onChange()` and `sprite`; `window.CSLabGame` exposes
  the EXP table, `levelOf`, `jobOf`, the chapter tiers and the current level.
- **Adding a course**: a shell course needs only the stylesheet link, the head snippet and
  `<script src="../shared/cslab-skin.js">` and `<script src="../shared/cslab-game.js">` after
  `cslab-app.js` (OS, DSA, DM and AI have them;
  OS and DM are in Henesys, DSA and AI in Ellinia). Standalone pages (LA, CO, ASM)
  should add the same three lines plus a small adapter stylesheet mapping their own classes onto the
  same pieces (or the generic `.mp-win` window class), rather than being rewritten.

## 4. Things that will come up

- **Button labels are baked into the images** (NEXT, BACK, END CHAT, OK, MENU). Keep them;
  give each an `aria-label` in Chinese. Only draw a CSS button when the label must be Chinese.
- **NPC names**: don't guess Taiwanese official names. Use a role ("精讀導師") until the user
  supplies the name.
- **Phone**: the minimap becomes a top-bar button and a drawer (see above); the dialog drops its
  portrait column and the NPC stands on its top edge; drop the HUD name panel.
- **Readability**: body text stays on the windows' own light panels at 15.5–16px, `#2b2b2b`–`#333`;
  never put running text straight on the scene.
- **Some NPCs are invisible** (`stand/0.png` 1px wide, e.g. Npc 1101000); use `info/default.png` or pick another.
- Fake HP/MP readings would be invented data; show only EXP, which maps to real progress.

## 5. Checklist

1. Copyright decision made; art kept out of public places.
2. Every visible frame/button/bar is a real PNG; CSS-drawn parts are listed to the user.
3. Contact sheets looked at; nothing assumed from file names alone.
4. Local render checked at 1280 and 390 wide, day and night: no overflow, no seams, text readable.
5. On a Design canvas: assets uploaded, placeholders replaced, canvas not re-verified afterwards.
