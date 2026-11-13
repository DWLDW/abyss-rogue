// fx.js — 파티클 / 데미지 숫자 / 슬래시 / 화면 효과 (타격감의 핵심)
const FX = {
  parts: [], texts: [], slashes: [], rings: [], lines: [],

  shake(a) { G.trauma = Math.min(1, G.trauma + a); },
  hitstop(sec) { G.hitstop = Math.max(G.hitstop, sec); },
  flash(color, a) { G.flash.color = color; G.flash.a = Math.max(G.flash.a, a); },

  burst(x, y, o = {}) {
    const n = o.n || 10, col = o.color || '#ffcc66', spd = o.speed || 130;
    for (let i = 0; i < n; i++) {
      const a = U.rand(TAU), s = U.rand(spd * 0.3, spd);
      FX.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, ttl: U.rand(0.25, o.life || 0.6),
        size: U.randi(o.sizeMin || 2, o.sizeMax || 4),
        color: Array.isArray(col) ? U.choice(col) : col,
        grav: o.grav || 0, drag: o.drag !== undefined ? o.drag : 3,
      });
    }
    if (FX.parts.length > 500) FX.parts.splice(0, FX.parts.length - 500);
  },

  text(x, y, str, o = {}) {
    FX.texts.push({
      x: x + U.rand(-6, 6), y, str,
      color: o.color || '#fff', size: o.size || 13, crit: !!o.crit,
      life: 0, ttl: o.ttl || (o.crit ? 1.0 : 0.75), vy: o.vy || -55,
    });
    if (FX.texts.length > 60) FX.texts.splice(0, FX.texts.length - 60);
  },

  slash(x, y, ang, range, arc, color) {
    FX.slashes.push({ x, y, ang, range, arc, color, life: 0, ttl: 0.13 });
  },

  ring(x, y, r1, color, ttl = 0.35, r0) {
    FX.rings.push({ x, y, r0: r0 || 4, r1, color, life: 0, ttl });
  },

  // 번개 등 jagged 선
  bolt(x1, y1, x2, y2, color, ttl = 0.16, width = 3) {
    const segs = [];
    const n = Math.max(2, Math.round(U.dist(x1, y1, x2, y2) / 26));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const jx = i === 0 || i === n ? 0 : U.rand(-10, 10);
      const jy = i === 0 || i === n ? 0 : U.rand(-10, 10);
      segs.push([U.lerp(x1, x2, t) + jx, U.lerp(y1, y2, t) + jy]);
    }
    FX.lines.push({ segs, color, life: 0, ttl, width });
    if (FX.lines.length > 40) FX.lines.splice(0, FX.lines.length - 40);
  },

  update(dt) {
    for (const p of FX.parts) {
      p.life += dt;
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt;
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    FX.parts = FX.parts.filter((p) => p.life < p.ttl);
    for (const t of FX.texts) { t.life += dt; t.y += t.vy * dt; t.vy *= (1 - 2.2 * dt); }
    FX.texts = FX.texts.filter((t) => t.life < t.ttl);
    for (const s of FX.slashes) s.life += dt;
    FX.slashes = FX.slashes.filter((s) => s.life < s.ttl);
    for (const r of FX.rings) r.life += dt;
    FX.rings = FX.rings.filter((r) => r.life < r.ttl);
    for (const l of FX.lines) l.life += dt;
    FX.lines = FX.lines.filter((l) => l.life < l.ttl);
  },

  draw(ctx) {
    // 장판 링
    for (const r of FX.rings) {
      const t = r.life / r.ttl, rr = U.lerp(r.r0, r.r1, 1 - Math.pow(1 - t, 2));
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 슬래시 궤적
    for (const s of FX.slashes) {
      const t = s.life / s.ttl;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = s.color; ctx.lineWidth = 5 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.range * (0.55 + 0.45 * t), s.ang - s.arc / 2, s.ang + s.arc / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 번개 선
    for (const l of FX.lines) {
      const t = l.life / l.ttl;
      ctx.globalAlpha = (1 - t);
      ctx.strokeStyle = l.color; ctx.lineWidth = l.width * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.moveTo(l.segs[0][0], l.segs[0][1]);
      for (let i = 1; i < l.segs.length; i++) ctx.lineTo(l.segs[i][0], l.segs[i][1]);
      ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 파티클
    for (const p of FX.parts) {
      ctx.globalAlpha = 1 - p.life / p.ttl;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    // 데미지 숫자
    for (const t of FX.texts) {
      const a = 1 - t.life / t.ttl;
      ctx.globalAlpha = a;
      ctx.font = (t.crit ? '900 ' : '700 ') + t.size + "px 'Noto Sans KR', monospace";
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.lineWidth = 3;
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },

  clear() { FX.parts.length = FX.texts.length = FX.slashes.length = FX.rings.length = FX.lines.length = 0; },
};
window.FX = FX;
