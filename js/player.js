// player.js — 플레이어 생성/스탯 합산/업데이트( 이동·대시·평타·포션 )/그리기
const Player = {
  make() {
    const p = {
      isPlayer: true,
      x: 0, y: 0, r: 10, vx: 0, vy: 0,
      hp: CFG.PLAYER.hp, maxhp: CFG.PLAYER.hp,
      armor: 0, critCh: CFG.PLAYER.critCh, critMult: CFG.PLAYER.critMult,
      moveSpd: CFG.PLAYER.speed, ls: 0, thorns: 0, xpMult: 1, goldMult: 1, luck: 0,
      dmgPct: 0, atkSpdMult: 1, skillDmg: 0,
      equip: { weapon: null, helm: null, armor: null, ring: null, charm: null },
      weapon: null,
      dashT: 0, dashCd: 0, dashDirX: 1, dashDirY: 0, invulnT: 0,
      atkCd: 0, comboIdx: 0, comboT: 0, comboN: 0, attackAnimT: 0,
      shield: 0, shieldMax: 0,
      face: 1, animT: 0, hurtT: 0, attackAnim: 0,
    };
    p.equip.weapon = { uid: -1, slot: 'weapon', rarity: 0, ilvl: 1, affixes: [], name: '모험가의 검', value: 0, base: 'sword', kind: 'melee', dmg: 10, spd: 1.0, range: 58, arc: 1.95 };
    Player.recalc(p);
    p.hp = p.maxhp;
    return p;
  },

  // 장비 + 메타 업그레이드 + 런 보너스를 합산해 파생 스탯 갱신
  recalc(p) {
    const eq = Items.aggregate(p.equip);
    const meta = G.save ? G.save.upgrades : {};
    const bonus = (G.run && G.run.bonus) || { dmgPct: 0, hp: 0, critCh: 0, move: 0, xp: 0, ls: 0, luck: 0 };
    const oldMax = p.maxhp || 0;
    p.maxhp = CFG.PLAYER.hp + (meta.hp || 0) * 15 + eq.hp + bonus.hp;
    if (oldMax > 0 && p.maxhp !== oldMax) p.hp = Math.min(p.maxhp, Math.max(p.hp, 1) + (p.maxhp - oldMax));
    p.armor = eq.armor;
    p.critCh = CFG.PLAYER.critCh + eq.critCh + bonus.critCh;
    p.critMult = CFG.PLAYER.critMult + eq.critMult;
    p.dmgPct = eq.dmgPct + (meta.dmg || 0) * 6 + bonus.dmgPct;
    p.atkSpdMult = 1 + eq.atkSpd / 100;
    p.moveSpd = CFG.PLAYER.speed * (1 + eq.move / 100) * (1 + (meta.spd || 0) * 0.03) * (1 + bonus.move / 100);
    p.ls = eq.ls + bonus.ls;
    p.thorns = eq.thorns;
    p.xpMult = 1 + eq.xp / 100 + (meta.sch || 0) * 0.10 + bonus.xp / 100;
    p.goldMult = 1 + eq.gold / 100 + (meta.fort || 0) * 0.08;
    p.luck = eq.luck + bonus.luck + (meta.fort || 0) * 3;
    p.skillDmg = eq.skillDmg;
    p.weapon = p.equip.weapon;
  },

  // 평타/스킬의 기준 공격력
  power(p) {
    const w = p.equip.weapon;
    const base = (w ? w.dmg + Items.statsOf(w).dmg : 10);
    return Math.max(1, base * (1 + p.dmgPct / 100) * (1 + p.skillDmg / 100));
  },

  attack(p, aim) {
    const run = G.run;
    const w = p.weapon;
    p.atkCd = CFG.PLAYER.atkBaseCd / ((w && w.spd ? w.spd : 1) * p.atkSpdMult);
    p.comboIdx = p.comboN % 3;
    p.comboN++; p.comboT = CFG.PLAYER.comboWindow;
    p.attackAnimT = 0.16;
    const mult = [1, 1, 1.7][p.comboIdx];
    const dmg = Player.power(p) * mult;
    if (!w || w.kind === 'melee') {
      const range = w.range || 58, arc = w.arc || 1.95;
      FX.slash(p.x, p.y, aim, range, arc, p.comboIdx === 2 ? '#ffd24d' : '#e8ecf4');
      Audio.sfx(p.comboIdx === 2 ? 'swing2' : 'swing', { rate: U.rand(0.95, 1.1), vol: 0.7 });
      let hitAny = false;
      for (const e of run.enemies) {
        if (e.dead) continue;
        const d = U.dist(p.x, p.y, e.x, e.y);
        if (d < range + e.r && Math.abs(U.angDiff(aim, U.angTo(p.x, p.y, e.x, e.y))) < arc / 2) {
          Combat.dealDamage(e, dmg, { src: p, element: 'phys', kb: p.comboIdx === 2 ? 300 : 90 });
          hitAny = true;
        }
      }
      if (hitAny) FX.shake(0.07);
    } else {
      const spd = w.projSpd || 560;
      Objects.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(aim) * spd, vy: Math.sin(aim) * spd,
        r: w.kind === 'arrow' ? 4 : 6, dmg, from: 'player',
        pierce: w.kind === 'arrow' ? 1 : 0, aoe: w.kind === 'bolt' ? 30 : 0,
        color: w.kind === 'arrow' ? '#cfe3ff' : '#b48cff',
        element: w.kind === 'arrow' ? 'phys' : 'arcane', ttl: 1.4, kb: 60,
      });
      Audio.sfx(w.kind === 'arrow' ? 'arrow' : 'shoot', { vol: 0.4, rate: U.rand(0.95, 1.1) });
    }
  },

  update(dt, ctrl) {
    const run = G.run, p = run.player, d = run.dungeon;
    if (!ctrl && Touch.active) {
      // 터치 모드: 조이스틱 이동 + 가장 가까운 적 조준 보조 + 근접 시 자동 공격
      const t = Combat.nearestEnemy(p.x, p.y, 520);
      let aim;
      if (t) aim = U.angTo(p.x, p.y, t.x, t.y);
      else if (Math.abs(Touch.joy.x) + Math.abs(Touch.joy.y) > 0.2) aim = Math.atan2(Touch.joy.y, Touch.joy.x);
      else aim = p.face > 0 ? 0 : Math.PI;
      const w = p.weapon;
      const reach = w && w.kind === 'melee' ? (w.range || 58) : 330;
      const autoAtk = t && U.dist(p.x, p.y, t.x, t.y) < reach;
      ctrl = {
        ax: Touch.joy.x, ay: Touch.joy.y,
        aim,
        attack: Touch.attack || autoAtk,
        dash: Touch.dash,
        potion: Touch.potion,
      };
    }
    if (!ctrl) {
      ctrl = {
        ax: Input.axis().x, ay: Input.axis().y,
        aim: U.angTo(p.x, p.y, Input.mouse.x + G.cam.x, Input.mouse.y + G.cam.y),
        attack: Input.mouse.l,
        dash: Input.hit('Space', 'ShiftLeft', 'ShiftRight') || Input.mouse.r,
        potion: Input.hit('KeyH', 'Digit5') || Input.hit('Digit5'),
      };
    }
    p.animT += dt;
    p.atkCd -= dt; p.dashCd -= dt; p.invulnT -= dt; p.hurtT -= dt; p.potionCd -= dt;
    p.comboT -= dt; if (p.comboT <= 0) p.comboN = 0;
    p.attackAnimT = Math.max(0, p.attackAnimT - dt);

    // 대시
    if (ctrl.dash && p.dashCd <= 0 && (ctrl.ax !== 0 || ctrl.ay !== 0)) {
      const len = Math.hypot(ctrl.ax, ctrl.ay) || 1;
      p.dashDirX = ctrl.ax / len; p.dashDirY = ctrl.ay / len;
      p.dashT = CFG.PLAYER.dashDur; p.dashCd = CFG.PLAYER.dashCd;
      p.invulnT = Math.max(p.invulnT, CFG.PLAYER.invuln);
      Audio.sfx('dash', { vol: 0.5 });
      FX.burst(p.x, p.y, { n: 8, color: '#9adcff', speed: 90, life: 0.35, sizeMax: 3 });
    }

    let spd = p.moveSpd * ((G.cheat && G.cheat.spd) || 1);
    if (p.dashT > 0) {
      p.dashT -= dt; spd = CFG.PLAYER.dashSpd;
      p.vx = p.dashDirX * spd; p.vy = p.dashDirY * spd;
    } else {
      p.vx = ctrl.ax * spd; p.vy = ctrl.ay * spd;
    }
    Dungeon.move(d, p, p.vx * dt, p.vy * dt);
    if (Math.abs(p.vx) > 4) p.face = p.vx > 0 ? 1 : -1;
    if ((ctrl.ax || ctrl.ay) && p.dashT <= 0 && Math.random() < dt * 8) {
      FX.burst(p.x, p.y + 8, { n: 1, color: 'rgba(160,150,140,0.5)', speed: 20, life: 0.4, sizeMax: 2 });
    }

    // 평타
    if (ctrl.attack && p.atkCd <= 0) Player.attack(p, ctrl.aim);

    // 포션
    if (ctrl.potion && run.potions > 0 && p.potionCd <= 0 && p.hp < p.maxhp) {
      run.potions--; p.potionCd = CFG.PLAYER.potionCd;
      const heal = p.maxhp * CFG.PLAYER.potionHeal * (1 + ((G.save.upgrades.aegis || 0) * 0.2));
      p.hp = Math.min(p.maxhp, p.hp + heal);
      FX.text(p.x, p.y - 20, '+' + U.fmt(heal), { color: '#6fdc8c', size: 15 });
      FX.burst(p.x, p.y, { n: 14, color: '#6fdc8c', speed: 90, life: 0.6, sizeMax: 3 });
      Audio.sfx('potion');
    }

    // 방 이탈 시 방문 표시
    Dungeon.reveal(d, p.x, p.y);
  },

  draw(ctx, p) {
    const cam = G.cam;
    const x = p.x - cam.x, y = p.y - cam.y;
    let name = 'player_idle', frame = Math.floor(p.animT * 2) % 2;
    if (p.dashT > 0) name = 'player_dash';
    else if (p.attackAnimT > 0) { name = 'player_attack'; frame = U.clamp(Math.floor((0.16 - p.attackAnimT) / 0.16 * 3), 0, 2); }
    else if (Math.abs(p.vx) > 8 || Math.abs(p.vy) > 8) { name = 'player_walk'; frame = Math.floor(p.animT * 9) % 4; }
    let filter = '';
    if (p.hurtT > 0 || p.invulnT > 0.25) filter = 'brightness(2.2) saturate(1.6)';
    if (filter) ctx.filter = filter;
    ctx.save();
    if (p.dashT > 0) { ctx.globalAlpha = 0.85; }
    Sprites.draw(ctx, name, frame, x, y, CFG.SPR_SCALE, { flip: p.face < 0 });
    ctx.restore();
    ctx.filter = 'none';
    // 방어막
    if (p.shield > 0) {
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(G.time * 6);
      ctx.strokeStyle = '#9adcff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, p.r + 8, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
};
window.Player = Player;
