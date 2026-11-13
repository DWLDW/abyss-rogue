// objects.js — 투사체 / 장판 / 소환수 / 드랍 / 상자 / 포탈
const Objects = {
  addProjectile(o) { G.run.projectiles.push(o); },
  addZone(z) { G.run.zones.push(z); },
  addMinion(m) { G.run.minions.push(m); },
  addPickup(pk) { pk.t = U.rand(0, 6); G.run.pickups.push(pk); },

  explode(pr) {
    if (pr.exploded) return;
    pr.exploded = true;
    const run = G.run;
    FX.ring(pr.x, pr.y, pr.aoe, pr.color, 0.35);
    FX.burst(pr.x, pr.y, { n: 18, color: [pr.color, '#ffffff', '#ffd24d'], speed: 240, life: 0.45, sizeMax: 4 });
    FX.shake(0.2); FX.hitstop(0.03);
    Audio.sfx('explosion', { vol: 0.55, rate: U.rand(0.9, 1.1) });
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (U.dist(pr.x, pr.y, e.x, e.y) < pr.aoe + e.r) {
        Combat.dealDamage(e, pr.dmg * 0.8, { src: run.player, element: pr.element, kb: 140 });
        if (pr.burn) { e.burn = (e.burn || 0) + pr.burn; e.burnT = 3; }
      }
    }
  },

  update(dt) {
    const run = G.run, d = run.dungeon, p = run.player;

    // ---- 투사체 ----
    for (const pr of run.projectiles) {
      pr.ttl -= dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.ttl <= 0) continue;
      if (Dungeon.isWallPx(d, pr.x, pr.y)) { if (pr.aoe) Objects.explode(pr); pr.ttl = 0; continue; }
      if (pr.from === 'player') {
        let consumed = false;
        for (const e of run.enemies) {
          if (e.dead) continue;
          if (U.dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
            Combat.dealDamage(e, pr.dmg, { src: p, element: pr.element, kb: pr.kb || 60, skill: pr.skill });
            if (pr.burn) { e.burn = (e.burn || 0) + pr.burn; e.burnT = 3; }
            if (pr.aoe) { Objects.explode(pr); consumed = true; break; }
            pr.pierce--;
            if (pr.pierce < 0) { consumed = true; break; }
          }
        }
        if (consumed) pr.ttl = 0;
      } else if (U.dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r) {
        Combat.hurtPlayer(pr.dmg, pr.src || null);
        pr.ttl = 0;
      }
    }
    run.projectiles = run.projectiles.filter((pr) => pr.ttl > 0);

    // ---- 장판 ----
    for (const z of run.zones) {
      z.ttl -= dt; z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = z.tickCd;
        for (const e of run.enemies) {
          if (e.dead) continue;
          if (U.dist(z.x, z.y, e.x, e.y) < z.r + e.r) {
            Combat.dealDamage(e, z.dmg, { src: z.src, element: z.element, kb: 0 });
            if (z.slow) { e.slowVal = Math.min(e.slowVal, 1 - z.slow); e.slowT = Math.max(e.slowT, 0.6); }
          }
        }
      }
      if (Math.random() < dt * 14) {
        const a = U.rand(TAU), rr = U.rand(0, z.r);
        FX.burst(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, { n: 1, color: z.element === 'poison' ? '#8ce06a' : '#aee6ff', speed: 25, life: 0.7, sizeMax: 3 });
      }
    }
    run.zones = run.zones.filter((z) => z.ttl > 0);

    // ---- 소환수 ----
    for (const m of run.minions) {
      m.ttl -= dt; m.atkCd -= dt;
      const tgt = Combat.nearestEnemy(m.x, m.y, 500);
      if (tgt) {
        const dist = U.dist(m.x, m.y, tgt.x, tgt.y);
        if (dist > m.r + tgt.r + 6) {
          const a = U.angTo(m.x, m.y, tgt.x, tgt.y);
          Dungeon.move(d, m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
        } else if (m.atkCd <= 0) {
          m.atkCd = 0.9;
          Combat.dealDamage(tgt, m.dmg, { src: null, element: 'phys', kb: 80 });
          Audio.sfx('hit', { vol: 0.3, rate: 1.2 });
        }
      }
      if (Math.abs(m.kbx || 0) > 1) { Dungeon.move(d, m, m.kbx * dt, 0); m.kbx *= Math.max(0, 1 - 7 * dt); }
    }
    run.minions = run.minions.filter((m) => m.ttl > 0 && m.hp > 0);

    // ---- 드랍 ----
    for (const pk of run.pickups) {
      pk.t += dt;
      const dist = U.dist(pk.x, pk.y, p.x, p.y);
      if (dist < CFG.PLAYER.magnetR) {
        const a = U.angTo(pk.x, pk.y, p.x, p.y);
        const s = 340 * (1 - dist / (CFG.PLAYER.magnetR + 40));
        pk.x += Math.cos(a) * s * dt; pk.y += Math.sin(a) * s * dt;
      }
      if (dist < CFG.PLAYER.pickupR) {
        if (pk.kind === 'xp') { Main.addXp(pk.val * p.xpMult); pk.done = true; Audio.sfx('gem', { vol: 0.3, rate: U.rand(1.1, 1.4) }); }
        else if (pk.kind === 'gold') { run.gold += Math.max(1, Math.round(pk.val * p.goldMult)); pk.done = true; Audio.sfx('gold', { vol: 0.3 }); }
        else if (pk.kind === 'soul') { run.soul += pk.val; pk.done = true; Audio.sfx('soul', { vol: 0.35 }); }
        else if (pk.kind === 'potion') {
          if (run.potions < run.potionMax) { run.potions++; pk.done = true; UI.toast('포션 +1', 'good'); Audio.sfx('potion', { vol: 0.5 }); }
        } else if (pk.kind === 'item') {
          if (run.inv.length < 24) {
            Main.giveItem(pk.item);
            pk.done = true;
          }
        }
      }
    }
    run.pickups = run.pickups.filter((pk) => !pk.done);

    // ---- 상자 ----
    for (const c of d.chests) {
      if (!c.opened && U.dist(c.x, c.y, p.x, p.y) < 28) {
        c.opened = true;
        Audio.sfx('chest');
        FX.burst(c.x, c.y, { n: 16, color: '#ffd24d', speed: 160, life: 0.6 });
        const n = U.randi(1, 3);
        for (let i = 0; i < n; i++) Objects.addPickup({ kind: 'item', x: c.x + U.rand(-26, 26), y: c.y + U.rand(-26, 26), item: Items.gen(run.floor, p.luck) });
        Objects.addPickup({ kind: 'gold', x: c.x, y: c.y + 20, val: U.randi(15, 45) * (1 + run.floor * 0.2) });
        Objects.addPickup({ kind: 'potion', x: c.x + 14, y: c.y + 14, val: 1 });
        UI.toast('상자를 열었습니다!', 'gold');
      }
    }

    // ---- 포탈 ----
    const portal = d.portal;
    if (portal.active) {
      portal.anim += dt;
      if (U.dist(portal.x, portal.y, p.x, p.y) < 26) Main.takePortal();
    }
  },

  draw(ctx) {
    const run = G.run, cam = G.cam;
    // 장판
    for (const z of run.zones) {
      ctx.globalAlpha = 0.5 + 0.15 * Math.sin(G.time * 5);
      ctx.fillStyle = z.color;
      ctx.beginPath(); ctx.arc(z.x - cam.x, z.y - cam.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = z.element === 'poison' ? '#8ce06a' : '#aee6ff';
      ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x - cam.x, z.y - cam.y, z.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 상자
    for (const c of run.dungeon.chests) {
      Sprites.draw(ctx, c.opened ? 'chest_open' : 'chest', 0, c.x - cam.x, c.y - cam.y, 2);
    }
    // 포탈
    const portal = run.dungeon.portal;
    if (portal.active) {
      const f = Math.floor(portal.anim * 8) % 4;
      ctx.save();
      ctx.shadowColor = '#b48cff'; ctx.shadowBlur = 24;
      Sprites.draw(ctx, 'portal', f, portal.x - cam.x, portal.y - cam.y, 3);
      ctx.restore();
    }
    // 드랍
    for (const pk of run.pickups) {
      const bob = Math.sin(pk.t * 4) * 3;
      const x = pk.x - cam.x, y = pk.y - cam.y + bob;
      if (pk.kind === 'xp') Sprites.draw(ctx, 'gem', 0, x, y, 2);
      else if (pk.kind === 'gold') Sprites.draw(ctx, 'gold', Math.floor(pk.t * 6) % 2, x, y, 2);
      else if (pk.kind === 'soul') { ctx.save(); ctx.shadowColor = '#b48cff'; ctx.shadowBlur = 10; Sprites.draw(ctx, 'soul', 0, x, y, 2); ctx.restore(); }
      else if (pk.kind === 'potion') Sprites.draw(ctx, 'potion', 0, x, y, 2);
      else if (pk.kind === 'item') {
        const rd = CFG.RARITY[pk.item.rarity];
        ctx.save(); ctx.shadowColor = rd.color; ctx.shadowBlur = 8 + pk.item.rarity * 3;
        ctx.drawImage(Sprites.get(Items.iconOf(pk.item), 0), x - 10, y - 10, 20, 20);
        ctx.restore();
      }
    }
    // 투사체
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
    // 소환수
    for (const m of run.minions) {
      ctx.save();
      ctx.filter = 'hue-rotate(90deg) saturate(1.4)';
      Sprites.draw(ctx, 'skeleton', Math.floor(G.time * 6) % 2, m.x - cam.x, m.y - cam.y, CFG.SPR_SCALE, { flip: m.x > (G.run.player.x) });
      ctx.restore(); ctx.filter = 'none';
    }
  },
};
window.Objects = Objects;
