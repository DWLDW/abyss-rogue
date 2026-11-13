// main.js — 부팅, 상태 머신, 게임 루프, 런 관리, 렌더, 자동전투 데모 봇
const Main = {
  boot() {
    G.canvas = U.$('game');
    G.ctx = G.canvas.getContext('2d');
    Main.resize();
    window.addEventListener('resize', Main.resize);
    Input.init();
    if (window.Touch) Touch.init();
    Save.load();
    Sprites.init();
    UI.init();

    // 오디오는 첫 제스처에서 시작
    const kick = () => { if (Audio.init) Audio.init(); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (G.state === 'run') { G.state = 'pause'; UI.renderPause(); UI.showOnly('screen-pause'); Audio.sfx('ui'); }
        else if (G.state === 'pause') { G.state = 'run'; UI.showOnly(null); Audio.sfx('ui'); }
        else if (G.state === 'help') {
          if (UI.helpFrom === 'hub') Main.toHub();
          else if (UI.helpFrom === 'pause') { G.state = 'pause'; UI.renderPause(); UI.showOnly('screen-pause'); }
          else Main.showTitle();
        }
      }
      if (e.code === 'KeyM') {
        const m = Audio.toggleMute();
        UI.toast(m ? '음소거' : '소리 켜짐');
      }
    });

    // URL 파라미터: ?auto=1 자동전투 데모, ?floor=N 시작 층, ?pow=N 피해 배율, ?god=1 무적, ?spd=N 이동 배율
    const q = new URLSearchParams(location.search);
    G.demo = q.get('auto') === '1';
    G.startFloorParam = parseInt(q.get('floor') || '0', 10) || 0;
    G.cheat = { pow: parseFloat(q.get('pow') || '1') || 1, god: q.get('god') === '1', spd: parseFloat(q.get('spd') || '1') || 1 };

    Main.showTitle();

    let last = performance.now();
    const loop = (t) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      Main.frame(dt);
      Input.endFrame();
    };
    requestAnimationFrame(loop);

    if (G.demo) setTimeout(() => { if (G.state === 'title') Main.startRun(true); }, 700);
    window.__G = G; window.__Main = Main;
  },

  resize() {
    G.W = G.canvas.width = window.innerWidth;
    G.H = G.canvas.height = window.innerHeight;
    G.ctx.imageSmoothingEnabled = false;
  },

  frame(dt) {
    G.time += dt;
    let wdt = dt;
    if (G.hitstop > 0) { G.hitstop -= dt; wdt = 0; }
    G.trauma = Math.max(0, G.trauma - dt * 1.5);
    G.flash.a = Math.max(0, G.flash.a - dt * 2.5);
    FX.update(G.state === 'run' ? wdt : dt);
    if (G.state === 'run') Main.updateRun(wdt);
    else if (G.state !== 'levelup' && G.state !== 'pause' && G.state !== 'death') Main.updateMenu(dt);
    Main.render();
    if (G.state === 'run' || G.state === 'levelup' || G.state === 'pause') UI.updateHUD();
  },

  updateMenu(dt) {
    // 메뉴 배경의 떠오르는 불씨
    G.menuFxT += dt;
    if (Math.random() < dt * 14) {
      FX.parts.push({
        x: U.rand(0, G.W), y: G.H + 6, vx: U.rand(-12, 12), vy: U.rand(-46, -22),
        life: 0, ttl: U.rand(3, 7), size: U.randi(1, 3),
        color: U.choice(['#ff9b3d', '#ffd24d', '#b48cff', '#5a6274']),
        grav: -6, drag: 0.2,
      });
    }
  },

  // ---------------- 상태 전환 ----------------
  showTitle() {
    G.state = 'title';
    UI.renderTitle();
    UI.showOnly('screen-title');
    UI.setHUD(false);
    Audio.music.start('title');
  },

  toHub() {
    G.state = 'hub';
    FX.clear();
    UI.renderHub();
    UI.showOnly('screen-hub');
    UI.setHUD(false);
    Audio.music.start('hub');
  },

  startRun(demo) {
    const s = G.save;
    s.totalRuns++;
    Save.save();
    FX.clear();
    SkillSys.reset();
    const run = {
      demo, floor: 0, time: 0,
      kills: 0, gold: 0, soul: 0,
      level: 1, xp: 0, pendingLevels: 0,
      potions: s.potionsStock, potionMax: CFG.PLAYER.potionMax + (s.upgrades.aegis || 0),
      bonus: { dmgPct: 0, hp: 0, critCh: 0, move: 0, xp: 0, ls: 0, luck: 0 },
      streak: { n: 0, t: 0 },
      enemies: [], projectiles: [], pickups: [], minions: [], zones: [],
      inv: s.inv.slice(), equip: Object.assign({}, s.equip),
      over: false, reviveUsed: false,
      dungeon: null, player: null, boss: null,
    };
    G.run = run;
    G.demo = demo;
    run.player = Player.make();
    // 저장된 장비를 이어받는다 (없으면 기본 검)
    Object.assign(run.player.equip, run.equip);
    if (!run.player.equip.weapon) {
      run.player.equip.weapon = { uid: -1, slot: 'weapon', rarity: 0, ilvl: 1, affixes: [], name: '모험가의 검', value: 0, base: 'sword', kind: 'melee', dmg: 10, spd: 1.0, range: 58, arc: 1.95 };
    }
    Player.recalc(run.player);
    run.player.hp = run.player.maxhp;
    Main.enterFloor(Math.max(1, G.startFloorParam || CFG.startFloor()));
    G.state = 'run';
    UI.showOnly(null);
    UI.setHUD(true);
    UI.skillKey = '';
    Save.save();
  },

  enterFloor(f) {
    const run = G.run;
    run.floor = f;
    run.dungeon = Dungeon.gen(f);
    const d = run.dungeon;
    run.player.x = d.spawn.x; run.player.y = d.spawn.y;
    run.enemies = []; run.projectiles = []; run.pickups = []; run.zones = []; run.minions = [];
    run.boss = null;
    const isBoss = CFG.isBossFloor(f);

    for (const room of d.rooms) {
      if (room === d.start) continue;
      const area = room.w * room.h;
      let count = U.clamp(Math.round((area / 22) * (0.75 + f * 0.05)), 2, 10);
      if (room === d.bossRoom) count = Math.min(count, 4);
      for (let i = 0; i < count; i++) {
        const tx = U.randi(room.x + 1, room.x + room.w - 2);
        const ty = U.randi(room.y + 1, room.y + room.h - 2);
        const x = (tx + 0.5) * CFG.TILE, y = (ty + 0.5) * CFG.TILE;
        if (U.dist(x, y, run.player.x, run.player.y) < 150) continue;
        const elite = U.chance(CFG.eliteChance(f));
        run.enemies.push(Enemies.make(pickEnemyType(f), x, y, f, elite));
      }
    }
    if (isBoss && d.bossRoom) {
      const b = Enemies.makeBoss((d.bossRoom.cx + 0.5) * CFG.TILE, (d.bossRoom.cy + 0.5) * CFG.TILE, f);
      run.enemies.push(b);
      run.boss = b;
      for (let i = 0; i < 4; i++) {
        const a = U.rand(TAU);
        run.enemies.push(Enemies.make('skeleton', b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70, f, false));
      }
      UI.floorBanner('⚠ 보스 — ' + b.name, '처치하고 더 깊은 심연으로');
      Audio.sfx('boss', { vol: 0.9 });
    } else {
      const subs = ['파밍을 시작하라', '어둠이 깊어진다', '숨소리가 들린다', '탐욕이 이끄는 대로', '모든 것을 쓸어버려라'];
      UI.floorBanner('B' + f + 'F — 심연', f <= 2 ? subs[0] : U.choice(subs));
    }
    run.player.hp = Math.min(run.player.maxhp, run.player.hp + run.player.maxhp * 0.15);
    Audio.music.start(isBoss ? 'boss' : 'dungeon');
    UI.toast('입장: ' + f + '층', '');
  },

  onFloorCleared() {
    const run = G.run;
    if (!run.dungeon.portal.active) {
      run.dungeon.portal.active = true;
      Audio.sfx('portal', { vol: 0.85 });
      UI.floorBanner('포탈 개방', '시작 지점의 포탈에서 다음 층으로');
      UI.toast('층 클리어! 포탈이 열렸습니다', 'good');
    }
  },

  takePortal() {
    if (G.state !== 'run' || !G.run || G.run.over) return;
    FX.flash('#b48cff', 0.3);
    Audio.sfx('portal', { vol: 0.9, rate: 1.2 });
    Main.enterFloor(G.run.floor + 1);
  },

  addXp(v) {
    const run = G.run;
    if (!run || run.over) return;
    run.xp += v;
    while (run.xp >= CFG.XP_NEED(run.level)) {
      run.xp -= CFG.XP_NEED(run.level);
      run.level++; run.pendingLevels++;
      FX.flash('#ffd24d', 0.15);
      FX.burst(run.player.x, run.player.y, { n: 28, color: ['#ffd24d', '#fff', '#ff9b3d'], speed: 260, life: 0.8, sizeMax: 4 });
      Audio.sfx('levelup', { vol: 0.8 });
    }
    if (run.pendingLevels > 0 && G.state === 'run') {
      G.state = 'levelup';
      const offers = SkillSys.offers();
      UI.showLevelup(offers);
      if (run.demo) {
        setTimeout(() => {
          if (G.state === 'levelup') {
            const idx = offers.findIndex((o) => o.kind === 'skill');
            UI.pickCard(idx >= 0 ? idx : 0);
          }
        }, 900);
      }
    }
  },

  giveItem(item) {
    const run = G.run;
    const slot = item.slot;
    const cur = run.equip[slot];
    const rd = CFG.RARITY[item.rarity];
    if (cur && Items.score(item) <= Items.score(cur)) {
      if (run.inv.length < 24) { run.inv.push(item); UI.toast('획득: ' + item.name, ''); }
      else { run.gold += item.value; UI.toast('인벤토리 가득 참 → 자동 판매 +' + item.value, 'gold'); }
      Audio.sfx('pickup', { vol: 0.5 });
    } else {
      run.equip[slot] = item;
      if (cur) { if (run.inv.length < 24) run.inv.push(cur); else run.gold += cur.value; }
      Player.recalc(run.player);
      UI.toast('장착: ' + item.name, 'good');
      Audio.sfx('equip', { vol: 0.7 });
      FX.ring(run.player.x, run.player.y, 44, rd.color, 0.45);
      FX.burst(run.player.x, run.player.y, { n: 12, color: rd.color, speed: 150, life: 0.5 });
    }
  },

  onPlayerDeath() {
    const run = G.run;
    if (!run || run.over) return;
    const s = G.save;
    if (s.upgrades.revive && !run.reviveUsed) {
      run.reviveUsed = true;
      run.player.hp = run.player.maxhp * 0.5;
      run.player.invulnT = 2.5;
      FX.flash('#6fdc8c', 0.4);
      FX.burst(run.player.x, run.player.y, { n: 30, color: '#6fdc8c', speed: 220, life: 0.8 });
      UI.toast('부활의 낙인 발동! (이번 런 1회)', 'good');
      Audio.sfx('levelup', { rate: 0.7, vol: 0.9 });
      return;
    }
    run.over = true;
    G.state = 'death';
    const newBest = run.floor > s.bestFloor;
    s.bestFloor = Math.max(s.bestFloor, run.floor);
    s.soul += Math.round(run.soul);
    s.gold += Math.round(run.gold);
    s.potionsStock = run.potions;
    Save.save();
    Audio.music.stop();
    Audio.sfx('death', { vol: 0.9 });
    UI.setHUD(false);
    UI.renderDeath({ floor: run.floor, kills: run.kills, gold: run.gold, soul: run.soul, level: run.level, time: run.time, newBest });
  },

  retreat() {
    const run = G.run;
    if (!run) return;
    run.over = true;
    const s = G.save;
    s.soul += Math.round(run.soul);
    s.gold += Math.round(run.gold);
    s.inv = run.inv;
    s.equip = run.equip;
    s.potionsStock = run.potions;
    s.bestFloor = Math.max(s.bestFloor, run.floor);
    Save.save();
    UI.toast('귀환 완료 — 전리품이 보관되었습니다', 'good');
    Main.toHub();
  },

  // ---------------- 런 업데이트 ----------------
  updateRun(dt) {
    const run = G.run;
    if (!run || run.over || !run.dungeon) return;
    run.time += dt;
    // 플레이어 기준 플로우 필드 갱신 (적 길찾기용)
    run.flowT = (run.flowT || 0) - dt;
    if (run.flowT <= 0) {
      const d = run.dungeon, p0 = run.player;
      Dungeon.computeFlow(d, U.clamp(Math.floor(p0.x / CFG.TILE), 0, d.W - 1), U.clamp(Math.floor(p0.y / CFG.TILE), 0, d.H - 1), 'flow');
      run.flowT = 0.4;
    }
    const ctrl = run.demo ? Main.autoControl() : null;
    Player.update(dt, ctrl);
    for (const e of run.enemies) Enemies.update(e, dt);
    // 적끼리 밀어내기
    const es = run.enemies;
    for (let i = 0; i < es.length; i++) {
      for (let j = i + 1; j < es.length; j++) {
        const a = es[i], b = es[j];
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const dd = Math.sqrt(d2), push = (rr - dd) / 2, nx = dx / dd, ny = dy / dd;
          Dungeon.move(run.dungeon, a, -nx * push, -ny * push);
          Dungeon.move(run.dungeon, b, nx * push, ny * push);
        }
      }
    }
    Objects.update(dt);
    SkillSys.update(dt);
    run.streak.t -= dt;
    if (run.streak.t <= 0) run.streak.n = 0;
  },

  // 자동 전투 데모 봇 — 목표(적/미탐사 방/포탈) 기준 BFS 플로우 필드로 이동
  autoControl() {
    const run = G.run, p = run.player, d = run.dungeon;
    const tgt = Combat.nearestEnemy(p.x, p.y, 1e9);
    let tx, ty, attack = false, dash = false;
    let objKey;
    if (tgt) {
      tx = tgt.x; ty = tgt.y;
      objKey = 'e';
      const dist = U.dist(p.x, p.y, tx, ty);
      const w = p.weapon;
      const reach = w && w.kind === 'melee' ? (w.range || 58) - 4 : 330;
      attack = dist < reach;
      dash = dist > 300 && p.dashCd <= 0;
    } else if (d.portal.active) {
      tx = d.portal.x; ty = d.portal.y; objKey = 'p';
    } else {
      let best = null, bd = 1e9;
      for (const r of d.rooms) {
        if (r.explored) continue;
        const dd = U.dist(p.x, p.y, (r.cx + 0.5) * CFG.TILE, (r.cy + 0.5) * CFG.TILE);
        if (dd < bd) { bd = dd; best = r; }
      }
      if (best) { tx = (best.cx + 0.5) * CFG.TILE; ty = (best.cy + 0.5) * CFG.TILE; }
      else { tx = d.spawn.x; ty = d.spawn.y; }
      objKey = 'r';
    }
    // 봇 전용 플로우 필드 (목표 타일 기준), 0.8초마다 또는 목표 변경 시 갱신
    run.botFlowT = (run.botFlowT || 0) - 1 / 60;
    if (run.botFlowT <= 0 || run.botObj !== objKey) {
      Dungeon.computeFlow(d, U.clamp(Math.floor(tx / CFG.TILE), 0, d.W - 1), U.clamp(Math.floor(ty / CFG.TILE), 0, d.H - 1), 'botFlow');
      run.botFlowT = 0.8;
      run.botObj = objKey;
    }
    const distObj = U.dist(p.x, p.y, tx, ty);
    let a;
    if (distObj < 110) a = U.angTo(p.x, p.y, tx, ty);
    else {
      a = Dungeon.flowAngle(d, p.x, p.y, 'botFlow');
      if (a === null) a = Dungeon.pickDir(d, p.x, p.y, p.r, U.angTo(p.x, p.y, tx, ty));
    }
    return {
      ax: Math.cos(a), ay: Math.sin(a),
      aim: tgt ? U.angTo(p.x, p.y, tgt.x, tgt.y) : a,
      attack, dash,
      potion: p.hp < p.maxhp * 0.55 && run.potions > 0,
    };
  },

  // ---------------- 렌더 ----------------
  render() {
    const ctx = G.ctx;
    const inWorld = G.run && G.run.dungeon && (G.state === 'run' || G.state === 'levelup' || G.state === 'pause' || G.state === 'death');
    if (inWorld) Main.renderWorld(ctx);
    else Main.renderMenuBg(ctx);
    // 플래시 오버레이
    if (G.flash.a > 0) {
      ctx.save();
      ctx.globalAlpha = G.flash.a;
      ctx.fillStyle = G.flash.color;
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.restore();
    }
  },

  renderMenuBg(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, '#141226');
    g.addColorStop(0.6, '#0b0d16');
    g.addColorStop(1, '#07080c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, G.W, G.H);
    G.cam.x = 0; G.cam.y = 0;
    FX.draw(ctx);
  },

  renderWorld(ctx) {
    const run = G.run, p = run.player, d = run.dungeon;
    const sh = G.trauma * G.trauma * 16;
    const sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
    const mapPxW = d.W * CFG.TILE, mapPxH = d.H * CFG.TILE;
    G.cam.x = U.clamp(p.x - G.W / 2 + sx, 0, Math.max(0, mapPxW - G.W));
    G.cam.y = U.clamp(p.y - G.H / 2 + sy, 0, Math.max(0, mapPxH - G.H));
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, G.W, G.H);
    Dungeon.draw(ctx, d, G.cam);
    Objects.draw(ctx);           // 장판/상자/포탈/드랍
    const ents = run.enemies.concat([p]);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e.isPlayer) Player.draw(ctx, e);
      else if (!e.dead) Enemies.draw(ctx, e);
    }
    // 투사체/소환수는 엔티티 위
    Main.drawAir(ctx);
    ctx.save();
    ctx.translate(-G.cam.x, -G.cam.y);
    FX.draw(ctx);
    ctx.restore();
    // 횃불빛: 플레이어 주변만 밝고 가장자리로 어둡게
    const lx = p.x - G.cam.x, ly = p.y - G.cam.y;
    const lg = ctx.createRadialGradient(lx, ly, 70, lx, ly, Math.max(G.W, G.H) * 0.72);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(0.5, 'rgba(4,5,10,0.28)');
    lg.addColorStop(1, 'rgba(2,3,7,0.78)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, G.W, G.H);
  },

  drawAir(ctx) {
    const run = G.run, cam = G.cam;
    for (const pr of run.projectiles) {
      const x = pr.x - cam.x, y = pr.y - cam.y;
      ctx.save();
      ctx.shadowColor = pr.color; ctx.shadowBlur = 8;
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(x, y, pr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(x, y, pr.r * 0.45, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (const m of run.minions) {
      ctx.save();
      ctx.filter = 'hue-rotate(90deg) saturate(1.4)';
      Sprites.draw(ctx, 'skeleton', Math.floor(G.time * 6) % 2, m.x - cam.x, m.y - cam.y, CFG.SPR_SCALE, { flip: m.x > run.player.x });
      ctx.restore();
      ctx.filter = 'none';
    }
  },
};
window.Main = Main;
window.addEventListener('DOMContentLoaded', Main.boot);
