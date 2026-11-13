# Abyss Rogue (심연의 낙인) — Architecture SPEC

Diablo-like infinite-dungeon dot-action roguelite. Single-page, dependency-free,
plain `<script>` tags (must work from `file://`, NO ES modules, NO external libs).
All scripts attach to `window`. Global state object: `window.G` (defined in utils.js).

## Load order (index.html)
utils → config → input → save → sprites → audio → fx → dungeon → items → skills →
player → enemies → objects → combat → ui → main

## Files owned by sub-agents (do NOT touch from Lead while they run)
- `js/sprites.js` → `window.Sprites`
- `js/audio.js`  → `window.Audio`

## Sprites API contract (js/sprites.js)
```js
window.Sprites = {
  ready: boolean,
  DATA: { name: { w, h, pal: {char:'#rrggbb'}, frames: [ [rowString,...] ] } },
  init(),                                   // compile all frames to canvases; set ready=true; dispatch window event 'sprites-ready'
  has(name),
  get(name, frame=0) -> HTMLCanvasElement,  // frame clamped; missing name -> generated placeholder canvas
  draw(ctx, name, frame, x, y, scale, opts) // draws centered at x,y; opts: {flip, alpha, rot}
  icon(name) -> dataURL string             // for <img> in DOM UI
  names() -> [string]
}
```
Pixel maps: rows of chars, `.` = transparent. One entry may have multiple frames
(animation). Base size 16x16 for characters/tiles/icons; boss 32x32; portal 24x24.
Style: dark-fantasy, 1px dark outline (`k`), readable silhouette at 16px.

Required sprite names:
- Characters: `player_idle`(2f), `player_walk`(4f), `player_attack`(3f), `player_dash`,
  `slime`(2f), `bat`(2f), `skeleton`(2f), `skeleton_attack`, `spitter`(2f), `brute`(2f),
  `brute_attack`, `mage`(2f), `boss`(2f, 32x32), `boss_attack`(32x32)
- Tiles (16x16): `floor_a`,`floor_b`,`floor_c`,`floor_d`,`wall`,`wall_top`,`door`,`rubble`
- Objects: `portal`(4f, 24x24), `chest`, `chest_open`, `potion`, `gold`, `gem`, `soul`
- Item icons (16x16): `w_sword`,`w_bow`,`w_staff`,`i_helm`,`i_armor`,`i_ring`,`i_charm`
- Skill icons (16x16): `s_fireball`,`s_arrow`,`s_whirl`,`s_chain`,`s_poison`,`s_frost`,`s_skeleton`,`s_aegis`
- UI: `heart`, `skull`, `coin`, `icon_settings`

## Audio API contract (js/audio.js)
```js
window.Audio = {
  muted: boolean,
  init(),                 // create AudioContext lazily on first user gesture; safe if unavailable
  toggleMute() -> bool,
  sfx(name, opts),        // opts: {vol=1, rate=1, pan=0}
  music: { start(track), stop(), setIntensity(0..1) }  // tracks: 'title','hub','dungeon','boss'
}
```
sfx names to implement (procedural WebAudio, no assets):
ui, swing, swing2, hit, crit, hurt, kill, explosion, shoot, arrow, zap, nova, poison,
summon, shield, shieldbreak, potion, pickup, gold, gem, soul, levelup, card, portal,
boss, bossdie, death, dash, chest, equip, sell, error, door
Music: tiny lookahead sequencer, dark ambient; 'dungeon' slightly tense, 'boss' faster.
Guard everything so it never throws when AudioContext is unavailable.

## Core globals (utils.js)
`G = { state, canvas, ctx, W, H, cam:{x,y}, time, hitstop, trauma, flash:{a,color}, run, save, demo }`
`G.run = { floor, dungeon, player, enemies[], projectiles[], pickups[], minions[], zones[],
  kills, gold, soul, level, xp, skills:[{id,lv,cd}], potions, boss, combo:{n,t}, streak:{n,t},
  demo, over, result, time, portalActive, pendingLevels }`
Player shape: `{ x,y,r, vx,vy, hp,maxhp, armor, critCh, critMult, moveSpd, ls, thorns, xpMult, goldMult, luck,
  weapon, equip:{weapon,helm,armor,ring,charm}, dashT,dashCd,invulnT, atkCd, comboIdx, comboT, shield, shieldMax,
  face, animT, state, power() }`
