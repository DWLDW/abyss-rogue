// enemies.js — 적 종류 정의, AI, 그리기
const ENEMY_DEFS = {
  slime:    { name: '슬라임',     sprite: 'slime',    hp: 26,  spd: 54,  dmg: 8,  r: 11, xp: 2, soul: 1, atkCd: 1.1, aggro: 250, kbResist: 0.2 },
  bat:      { name: '동굴 박쥐',  sprite: 'bat',      hp: 15,  spd: 142, dmg: 6,  r: 9,  xp: 2, soul: 1, atkCd: 0.7, aggro: 330, kbResist: 0.1 },
  skeleton: { name: '해골 병사',  sprite: 'skeleton', hp: 44,  spd: 74,  dmg: 12, r: 11, xp: 3, soul: 2, atkCd: 1.2, aggro: 280, kbResist: 0.4 },
  spitter:  { name: '독 거미사제', sprite: 'spitter', hp: 32,  spd: 60,  dmg: 9,  r: 11, xp: 4, soul: 2, atkCd: 2.2, aggro: 370, kbResist: 0.3,
              ranged: { range: 250, projSpd: 240, projDmg: 11, r: 5 } },
  brute:    { name: '심연 광전사', sprite: 'brute',   hp: 125, spd: 48,  dmg: 22, r: 15, xp: 7, soul: 4, atkCd: 1.8, aggro: 250, kbResist: 0.75,
              slam: { r: 100, cd: 3.4 } },
  mage:     { name: '타락한 사제', sprite: 'mage',    hp: 40,  spd: 68,  dmg: 10, r: 11, xp: 5, soul: 3, atkCd: 0,   aggro: 370, kbResist: 0.2,
              nova: { r: 105, cd: 3.8, dmg: 16 }, teleportCd: 6.5 },
};
const BOSS_NAMES = ['심연의 수호 골렘', '타락한 리치 왕', '심연 군주 바알', '멸망의 손아귀'];
const BOSS_DEF = { name: '보스', sprite: 'boss', aggro: 9999, kbResist: 0.85, r: 26 };

function pickEnemyType(floor) {
  const t = [['slime', 10], ['bat', 4]];
  if (floor >= 2) t.push(['skeleton', 6]);
  if (floor >= 3) t.push(['spitter', 4]);
  if (floor >= 4) t.push(['brute', 3]);
  if (floor >= 5) t.push(['mage', 3]);
  if (floor >= 7) { t.push(['skeleton', 3]); t.push(['spitter', 2]); t.push(['brute', 2]); }
  if (floor >= 10) t.push(['mage', 3]);
  let sum = 0; for (const x of t) sum += x[1];
  let r = Math.random() * sum;
  for (const x of t) { r -= x[1]; if (r <= 0) return x[0]; }
  return 'slime';
}

const Enemies = {
  make(type, x, y, floor, elite) {
    const def = ENEMY_DEFS[type];
    const hpM = CFG.floorHpMult(floor) * (elite ? 4 : 1);
    const dmgM = CFG.floorDmgMult(floor) * (elite ? 1.8 : 1);
    return {
      type, def, x, y, r: def.r * (elite ? 1.22 : 1),
      hp: def.hp * hpM, maxhp: def.hp * hpM,
      spd: def.spd * U.rand(0.9, 1.1) * (elite ? 1.05 : 1),
      dmg: def.dmg * dmgM,
      xp: def.xp * (elite ? 3 : 1), soul: def.soul * (elite ? 5 : 1),
      elite, boss: false, name: def.name,
      flash: 0, hitT: 0, atkCd: U.rand(0, 0.6), attackT: 0, pendingAtk: 0,
      kbx: 0, kby: 0, kbResist: def.kbResist,
      burn: 0, burnT: 0, slowVal: 1, slowT: 0,
      aggro: false, animT: U.rand(0, 10), dead: false,
      slamCd: U.rand(1, 2.5), novaCd: 1.5, teleT: U.rand(3, 6), pendingSlam: 0,
      unstickT: 0, unstickA: 0,
    };
  },

  makeBoss(x, y, floor) {
    const tier = Math.max(1, Math.floor(floor / CFG.BOSS_EVERY));
    let name = BOSS_NAMES[(tier - 1) % BOSS_NAMES.length];
    if (tier > BOSS_NAMES.length) name += ' +' + (tier - BOSS_NAMES.length);
    const hp = 420 * Math.pow(1.55, tier - 1) * (1 + (floor - 1) * 0.05);
    return {
      type: 'boss', def: BOSS_DEF, boss: true, elite: true, name,
      x, y, r: BOSS_DEF.r, hp, maxhp: hp,
      spd: 58, dmg: 26 * CFG.floorDmgMult(floor),
      xp: 40 * tier, soul: 60 + floor * 12,
      flash: 0, hitT: 0, atkCd: 0, attackT: 0, pendingAtk: 0,
      kbx: 0, kby: 0, kbResist: 0.85, burn: 0, burnT: 0, slowVal: 1, slowT: 0,
      aggro: true, animT: 0, dead: false,
      slamCd: 2.5, chargeCd: 4, summonCd: 6, mode: 'chase', modeT: 0, modeKind: '', chDx: 0, chDy: 0,
    };
  },

  moveToward(e, p, spd, dt, d) {
    const a = U.angTo(e.x, e.y, p.x, p.y);
    Dungeon.move(G.run.dungeon, e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
  },

  // 플로우 필드(BFS)로 플레이어에게 향하는 길을 따라감. 실패 시 벽 슬라이드
  steer(e, tx, ty, spd, dt) {
    const d = G.run.dungeon;
    let a = Dungeon.flowAngle(d, e.x, e.y, 'flow');
    if (a === null) a = Dungeon.pickDir(d, e.x, e.y, e.r, U.angTo(e.x, e.y, tx, ty));
    Dungeon.move(d, e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
  },

  teleport(e, d) {
    for (let i = 0; i < 24; i++) {
      const nx = e.x + U.rand(-380, 380), ny = e.y + U.rand(-380, 380);
      if (!Dungeon.isWallPx(d, nx, ny) && U.dist(nx, ny, G.run.player.x, G.run.player.y) > 160) {
        FX.burst(e.x, e.y, { n: 10, color: '#c77dff', speed: 120, life: 0.4 });
        e.x = nx; e.y = ny;
        FX.burst(e.x, e.y, { n: 10, color: '#c77dff', speed: 120, life: 0.4 });
        Audio.sfx('nova', { vol: 0.3, rate: 1.4 });
        return;
      }
    }
  },

  update(e, dt) {
    const run = G.run, p = run.player, d = run.dungeon, def = e.def;
    e.animT += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.hitT = Math.max(0, e.hitT - dt);
    e.atkCd -= dt;
    e.attackT = Math.max(0, e.attackT - dt);
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowVal = 1; }
    if (e.burnT > 0) {
      e.burnT -= dt;
      Combat.damageQuiet(e, (e.burn || 0) * dt);
      if (Math.random() < dt * 10) FX.burst(e.x, e.y, { n: 1, color: '#ff9b3d', speed: 30, life: 0.4, sizeMax: 2 });
      if (e.burnT <= 0) e.burn = 0;
    }
    // 선제 공격 판정
    if (e.pendingAtk > 0) {
      e.pendingAtk -= dt;
      if (e.pendingAtk <= 0 && !e.dead && U.dist(e.x, e.y, p.x, p.y) < e.r + p.r + 18) Combat.hurtPlayer(e.dmg, e);
    }
    // 넉백
    if (Math.abs(e.kbx) > 1 || Math.abs(e.kby) > 1) {
      Dungeon.move(d, e, e.kbx * dt, e.kby * dt);
      e.kbx *= Math.max(0, 1 - 7 * dt); e.kby *= Math.max(0, 1 - 7 * dt);
    }
    if (e.dead) return;

    const dist = U.dist(e.x, e.y, p.x, p.y);
    if (!e.aggro && dist < def.aggro) { e.aggro = true; if (e.boss) Audio.sfx('boss', { vol: 0.8 }); }
    if (!e.aggro || run.over) {
      if (Math.random() < dt * 0.6) {
        const a = U.rand(TAU);
        Dungeon.move(d, e, Math.cos(a) * e.spd * 0.3 * dt, Math.sin(a) * e.spd * 0.3 * dt);
      }
      return;
    }
    const spd = e.spd * e.slowVal;

    if (e.boss) { Enemies.updateBoss(e, dt, p, dist); return; }

    if (def.ranged) {
      const rg = def.ranged;
      if (dist > rg.range * 0.92) Enemies.steer(e, p.x, p.y, spd, dt);
      else if (dist < 120) { const a = U.angTo(p.x, p.y, e.x, e.y); Dungeon.move(d, e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt); }
      if (dist < rg.range && e.atkCd <= 0) {
        e.atkCd = def.atkCd; e.attackT = 0.3;
        const a = U.angTo(e.x, e.y, p.x, p.y);
        Objects.addProjectile({
          x: e.x, y: e.y, vx: Math.cos(a) * rg.projSpd, vy: Math.sin(a) * rg.projSpd,
          r: rg.r, dmg: rg.projDmg * CFG.floorDmgMult(run.floor), from: 'enemy',
          color: '#8ce06a', ttl: 3.2, src: e,
        });
        Audio.sfx('poison', { vol: 0.22, rate: 1.35 });
      }
    } else if (def.slam) {
      e.slamCd = Math.max(0, e.slamCd - dt);
      if (e.pendingSlam > 0) {
        e.pendingSlam -= dt;
        if (e.pendingSlam <= 0) {
          FX.ring(e.x, e.y, def.slam.r, '#ff6b4d', 0.3); FX.shake(0.3); Audio.sfx('explosion', { vol: 0.45, rate: 1.4 });
          if (U.dist(e.x, e.y, p.x, p.y) < def.slam.r + p.r) Combat.hurtPlayer(e.dmg * 1.2, e);
        }
      } else if (dist < def.slam.r && e.slamCd <= 0) {
        e.slamCd = def.slam.cd; e.pendingSlam = 0.5; e.attackT = 0.55;
        FX.ring(e.x, e.y, def.slam.r, 'rgba(255,90,60,0.85)', 0.5);
        Audio.sfx('boss', { vol: 0.3, rate: 1.6 });
      }
      if (dist > e.r + p.r + 10) Enemies.steer(e, p.x, p.y, spd * 0.92, dt);
      if (dist < e.r + p.r + 12 && e.atkCd <= 0) { e.atkCd = def.atkCd; e.attackT = 0.3; e.pendingAtk = 0.18; }
    } else if (def.nova) {
      e.teleT -= dt; e.novaCd = Math.max(0, e.novaCd - dt);
      if (e.teleT <= 0) { e.teleT = def.teleportCd; Enemies.teleport(e, d); }
      if (dist < def.nova.r && e.novaCd <= 0) {
        e.novaCd = def.nova.cd; e.attackT = 0.4;
        FX.ring(e.x, e.y, def.nova.r, '#c77dff', 0.4);
        FX.burst(e.x, e.y, { n: 12, color: '#c77dff', speed: 150, life: 0.4 });
        if (U.dist(e.x, e.y, p.x, p.y) < def.nova.r + p.r) Combat.hurtPlayer(def.nova.dmg * CFG.floorDmgMult(run.floor), e);
        Audio.sfx('nova', { vol: 0.35, rate: 0.8 });
      }
      if (dist > 100) Enemies.steer(e, p.x, p.y, spd * 0.9, dt);
    } else {
      // 근접 추적 (슬라임/박쥐/해골)
      if (dist > e.r + p.r + 6) Enemies.steer(e, p.x, p.y, spd, dt);
      else if (Math.random() < dt * 2) { // 지그재그 접근
        const a = U.angTo(e.x, e.y, p.x, p.y) + U.rand(-0.7, 0.7);
        Dungeon.move(d, e, Math.cos(a) * spd * 0.7 * dt, Math.sin(a) * spd * 0.7 * dt);
      }
      if (dist < e.r + p.r + 12 && e.atkCd <= 0) { e.atkCd = def.atkCd; e.attackT = 0.28; e.pendingAtk = 0.18; }
    }
  },

  updateBoss(e, dt, p, dist) {
    const run = G.run, d = run.dungeon;
    e.slamCd = Math.max(0, e.slamCd - dt);
    e.chargeCd = Math.max(0, e.chargeCd - dt);
    e.summonCd = Math.max(0, e.summonCd - dt);
    const hpR = e.hp / e.maxhp;
    if (hpR < 0.66 && !e.en1) { e.en1 = true; e.spd *= 1.2; UI.toast(e.name + ' — 분노!', 'bad'); Audio.sfx('boss', { vol: 0.7 }); }
    if (hpR < 0.33 && !e.en2) { e.en2 = true; e.spd *= 1.25; UI.toast('광폭화!', 'bad'); Audio.sfx('boss', { vol: 0.9 }); }

    if (e.mode === 'tele') {
      e.modeT -= dt;
      if (e.modeT <= 0) {
        if (e.modeKind === 'slam') {
          FX.ring(e.x, e.y, 130, '#ff6b4d', 0.3); FX.shake(0.45); Audio.sfx('explosion', { vol: 0.7, rate: 0.8 });
          FX.burst(e.x, e.y, { n: 20, color: ['#ff6b4d', '#ffd24d', '#fff'], speed: 240, life: 0.5 });
          if (U.dist(e.x, e.y, p.x, p.y) < 130 + p.r) Combat.hurtPlayer(e.dmg, e);
          e.mode = 'chase'; e.slamCd = 3.2;
        } else {
          const a = U.angTo(e.x, e.y, p.x, p.y);
          e.chDx = Math.cos(a); e.chDy = Math.sin(a);
          e.mode = 'charge'; e.modeT = 0.5;
          Audio.sfx('boss', { vol: 0.5, rate: 1.2 });
        }
      }
      return;
    }
    if (e.mode === 'charge') {
      e.modeT -= dt;
      Dungeon.move(d, e, e.chDx * 480 * dt, e.chDy * 480 * dt);
      if (U.dist(e.x, e.y, p.x, p.y) < e.r + p.r + 8) { Combat.hurtPlayer(e.dmg * 1.6, e); e.modeT = 0; FX.shake(0.5); }
      if (Math.random() < dt * 30) FX.burst(e.x, e.y, { n: 1, color: '#ff8c3a', speed: 60, life: 0.3, sizeMax: 3 });
      if (e.modeT <= 0) { e.mode = 'chase'; e.chargeCd = 5.5; }
      return;
    }
    // chase
    if (dist > e.r + p.r + 8) Enemies.steer(e, p.x, p.y, e.spd * e.slowVal, dt);
    if (dist < e.r + p.r + 12 && e.atkCd <= 0) { e.atkCd = 1.6; e.attackT = 0.3; e.pendingAtk = 0.18; }
    if (dist < 140 && e.slamCd <= 0) { e.mode = 'tele'; e.modeKind = 'slam'; e.modeT = 0.5; FX.ring(e.x, e.y, 130, 'rgba(255,90,60,0.9)', 0.5); }
    else if (dist > 130 && dist < 430 && e.chargeCd <= 0) { e.mode = 'tele'; e.modeKind = 'charge'; e.modeT = 0.55; FX.bolt(e.x, e.y, p.x, p.y, 'rgba(255,120,60,0.7)', 0.5, 4); }
    if (e.summonCd <= 0) {
      e.summonCd = 13;
      const adds = run.enemies.filter((x) => !x.dead && !x.boss && x.summoned).length;
      if (adds < 6) {
        for (let i = 0; i < 2; i++) {
          const a = U.rand(TAU);
          const m = Enemies.make('skeleton', e.x + Math.cos(a) * 44, e.y + Math.sin(a) * 44, run.floor, false);
          m.summoned = true;
          run.enemies.push(m);
        }
        FX.ring(e.x, e.y, 60, '#c8ffd8', 0.5);
        Audio.sfx('summon', { vol: 0.6 });
      }
    }
  },

  draw(ctx, e) {
    const cam = G.cam;
    const x = e.x - cam.x, y = e.y - cam.y;
    const scale = CFG.SPR_SCALE * (e.boss ? 2 : e.elite ? 1.15 : 1);
    let name = e.boss ? 'boss' : e.def.sprite;
    let frame = Math.floor(e.animT * 6) % 2;
    let filter = '';
    if (e.flash > 0) filter = 'brightness(2.6) saturate(1.5)';
    else if (e.elite && !e.boss) filter = 'hue-rotate(285deg) saturate(1.9) brightness(1.1)';
    if (e.slowVal < 1 && e.flash <= 0) filter = 'hue-rotate(150deg) brightness(1.15)';
    if (filter) ctx.filter = filter;
    if (e.attackT > 0 && Sprites.has(name + '_attack')) {
      Sprites.draw(ctx, name + '_attack', 0, x, y, scale, { flip: G.run.player.x < e.x });
    } else {
      Sprites.draw(ctx, name, frame, x, y, scale, { flip: G.run.player.x < e.x });
    }
    ctx.filter = 'none';
    // 미니 HP바 (최근 피격 or 엘리트/보스)
    if ((e.hitT > 0 || e.elite) && !e.dead) {
      const w = e.boss ? 60 : 32, h = 4;
      const bx = x - w / 2, by = y - (e.boss ? 40 : e.r * scale / 2 / CFG.SPR_SCALE + 14);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
      ctx.fillStyle = e.boss ? '#ff8c3a' : '#e5484d';
      ctx.fillRect(bx, by, w * U.clamp(e.hp / e.maxhp, 0, 1), h);
    }
  },
};
window.Enemies = Enemies;
window.pickEnemyType = pickEnemyType;
