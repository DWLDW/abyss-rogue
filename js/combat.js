// combat.js — 피해 계산/치명타/넉백/흡혈/반격/처치 처리
const Combat = {
  nearestEnemy(x, y, range) {
    let best = null, bd = range;
    for (const e of G.run.enemies) {
      if (e.dead) continue;
      const d = U.dist(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  dealDamage(e, amount, o = {}) {
    if (!e || e.dead) return 0;
    const p = o.src && o.src.isPlayer ? o.src : null;
    let crit = false;
    if (p && Math.random() * 100 < p.critCh) { crit = true; amount *= p.critMult / 100; }
    if (G.cheat && G.cheat.pow) amount *= G.cheat.pow;
    amount = Math.max(1, Math.round(amount));
    e.hp -= amount;
    e.flash = 0.09; e.hitT = 2.5;
    FX.text(e.x, e.y - e.r - 8, U.fmt(amount), { color: crit ? '#ffd24d' : (o.element === 'fire' ? '#ffb27d' : '#ffffff'), size: crit ? 19 : 13, crit });
    if (crit) { FX.hitstop(0.05); FX.shake(0.2); Audio.sfx('crit', { vol: 0.8 }); }
    else { FX.hitstop(0.016); Audio.sfx('hit', { vol: 0.55, rate: U.rand(0.92, 1.12) }); }
    const col = o.element === 'fire' ? ['#ff9b3d', '#ffd24d'] : o.element === 'ice' ? ['#aee6ff', '#fff'] :
      o.element === 'poison' ? ['#8ce06a', '#d0ffb0'] : o.element === 'lightning' ? ['#cfe8ff', '#fff'] :
      o.element === 'arcane' ? ['#b48cff', '#e0ccff'] : ['#e8b0a0', '#fff', '#c33'];
    FX.burst(e.x, e.y, { n: crit ? 12 : 6, color: col, speed: crit ? 210 : 140, life: 0.4, sizeMax: crit ? 4 : 3 });
    if (o.kb) {
      const a = o.kbAng !== undefined ? o.kbAng : (p ? U.angTo(p.x, p.y, e.x, e.y) : 0);
      const k = o.kb * (1 - (e.kbResist || 0));
      e.kbx += Math.cos(a) * k; e.kby += Math.sin(a) * k;
    }
    if (p && p.ls > 0) p.hp = Math.min(p.maxhp, p.hp + amount * p.ls / 100);
    if (e.hp <= 0) Combat.kill(e, p);
    return amount;
  },

  // DoT 등 조용한 피해 (텍스트/사운드 없이)
  damageQuiet(e, amt) {
    if (!e || e.dead) return;
    e.hp -= amt;
    e.hitT = 2.5;
    if (e.hp <= 0) Combat.kill(e, null);
  },

  hurtPlayer(dmg, src) {
    const run = G.run, p = run.player;
    if (p.invulnT > 0 || run.over) return;
    if (G.cheat && G.cheat.god) return;
    let d = dmg;
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, d);
      p.shield -= absorbed; d -= absorbed;
      if (p.shield <= 0) {
        const ae = SkillSys.get('aegis');
        if (ae) {
          const q = SKILLS.aegis.p[ae.lv - 1];
          FX.ring(p.x, p.y, 110, '#9adcff', 0.5);
          FX.burst(p.x, p.y, { n: 16, color: '#9adcff', speed: 200, life: 0.45 });
          Audio.sfx('shieldbreak', { vol: 0.7 });
          for (const e of run.enemies) {
            if (!e.dead && U.dist(p.x, p.y, e.x, e.y) < 110 + e.r) Combat.dealDamage(e, Player.power(p) * q.nova, { src: p, element: 'arcane', kb: 130 });
          }
        }
      }
    }
    const red = p.armor / (p.armor + 120);
    d = Math.max(1, Math.round(d * (1 - red)));
    p.hp -= d;
    p.invulnT = Math.max(p.invulnT, CFG.PLAYER.invuln * 0.55);
    p.hurtT = 0.25;
    FX.shake(0.32); FX.hitstop(0.028);
    FX.text(p.x, p.y - 20, '-' + U.fmt(d), { color: '#ff6b6b', size: 15 });
    FX.burst(p.x, p.y, { n: 8, color: ['#ff5a5a', '#fff'], speed: 160, life: 0.4 });
    Audio.sfx('hurt', { vol: 0.7 });
    const v = document.getElementById('vignette');
    if (v) { v.classList.add('hurt'); setTimeout(() => v.classList.remove('hurt'), 160); }
    if (src && !src.dead && p.thorns > 0) Combat.damageQuiet(src, p.thorns);
    if (p.hp <= 0) { p.hp = 0; Main.onPlayerDeath(); }
  },

  kill(e, src) {
    if (e.dead) return;
    e.dead = true;
    const run = G.run;
    run.kills++; if (G.save) G.save.totalKills++;
    run.streak.n++; run.streak.t = 4;
    if (run.streak.n > 0 && run.streak.n % 10 === 0) {
      const words = { 10: '난도질!', 20: ' 대학살!', 30: '잔혹행진!', 40: '피의 축제!', 50: '심연의 학살자!' };
      const w = words[run.streak.n] || (run.streak.n + '연속 처치!');
      UI.streak(w);
      Audio.sfx('levelup', { vol: 0.5, rate: 1.3 });
    }
    Audio.sfx('kill', { rate: U.rand(0.95, 1.06), vol: e.boss ? 1 : 0.6 });
    FX.burst(e.x, e.y, { n: e.boss ? 46 : 14, color: e.boss ? ['#ff8c3a', '#ffd24d', '#fff', '#ff5a3a'] : ['#c0392b', '#e8b0a0', '#fff'], speed: e.boss ? 280 : 180, life: 0.65, sizeMax: e.boss ? 5 : 4 });
    FX.shake(e.boss ? 0.75 : 0.16);
    if (e.boss) { FX.hitstop(0.14); FX.flash('#ffd24d', 0.25); Audio.sfx('bossdie', { vol: 0.9 }); }

    const luck = run.player.luck, f = run.floor;
    Objects.addPickup({ kind: 'xp', x: e.x, y: e.y, val: e.xp });
    Objects.addPickup({ kind: 'gold', x: e.x + U.rand(-14, 14), y: e.y + U.rand(-14, 14), val: Math.max(1, Math.round(U.rand(1, 3) * (1 + f * 0.15))) });
    Objects.addPickup({ kind: 'soul', x: e.x + U.rand(-14, 14), y: e.y + U.rand(-14, 14), val: Math.max(1, Math.round(e.soul * CFG.floorSoulMult(f))) });
    if (U.chance(0.10 + f * 0.004)) Objects.addPickup({ kind: 'potion', x: e.x + 8, y: e.y + 8, val: 1 });
    if (U.chance(0.085 + luck * 0.004)) Objects.addPickup({ kind: 'item', x: e.x, y: e.y - 8, item: Items.gen(f, luck) });
    if (e.elite && !e.boss && U.chance(0.65)) Objects.addPickup({ kind: 'item', x: e.x + 12, y: e.y + 12, item: Items.gen(f, luck + 8) });
    if (e.boss) {
      for (let i = 0; i < 3; i++) Objects.addPickup({ kind: 'item', x: e.x + U.rand(-34, 34), y: e.y + U.rand(-34, 34), item: Items.gen(f, luck + 10) });
      Objects.addPickup({ kind: 'potion', x: e.x, y: e.y + 24, val: 1 });
      run.boss = null;
    }
    run.enemies = run.enemies.filter((x) => !x.dead);
    if (run.enemies.length === 0) Main.onFloorCleared();
  },
};
window.Combat = Combat;
