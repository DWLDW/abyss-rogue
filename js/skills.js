// skills.js — 스킬 정의(8종, 각 5레벨) + 자동 시전 시스템 + 레벨업 선택지
const SKILLS = {
  fireball: {
    name: '화염구', icon: 's_fireball', max: 5,
    cd: [5.5, 5.0, 4.5, 4.0, 3.5],
    p: [
      { dmg: 1.0, aoe: 50, spd: 430, burn: 0.40 },
      { dmg: 1.3, aoe: 58, spd: 440, burn: 0.50 },
      { dmg: 1.6, aoe: 66, spd: 450, burn: 0.62 },
      { dmg: 2.0, aoe: 76, spd: 460, burn: 0.78 },
      { dmg: 2.5, aoe: 88, spd: 470, burn: 0.95 },
    ],
    desc: (lv) => {
      const a = SKILLS.fireball.p[lv - 1], b = SKILLS.fireball.p[Math.min(lv, 4)];
      return `가장 가까운 적에게 화염구 발사 → 폭발 피해 (계수 ${a.dmg}→${b.dmg}) + ${a.aoe} 범위, 화상 ${a.burn * 100 | 0}%/초 3초`;
    },
    cast(p, lv, tgt) {
      const q = SKILLS.fireball.p[lv - 1];
      const ang = U.angTo(p.x, p.y, tgt.x, tgt.y);
      Objects.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(ang) * q.spd, vy: Math.sin(ang) * q.spd,
        r: 7, dmg: Player.power(p) * q.dmg, from: 'player', pierce: 0, aoe: q.aoe,
        color: '#ff9b3d', element: 'fire', skill: 'fireball', burn: q.burn * Player.power(p), ttl: 2.2, sprite: null,
      });
      Audio.sfx('shoot', { vol: 0.5, rate: 0.9 });
    },
  },

  arrow: {
    name: '관통 화살', icon: 's_arrow', max: 5,
    cd: [3.6, 3.3, 3.0, 2.7, 2.4],
    p: [
      { n: 1, pierce: 2, dmg: 0.75, spd: 720 },
      { n: 2, pierce: 3, dmg: 0.90, spd: 730 },
      { n: 2, pierce: 4, dmg: 1.05, spd: 740 },
      { n: 3, pierce: 5, dmg: 1.20, spd: 750 },
      { n: 4, pierce: 7, dmg: 1.40, spd: 760 },
    ],
    desc: (lv) => {
      const a = SKILLS.arrow.p[lv - 1], b = SKILLS.arrow.p[Math.min(lv, 4)];
      return `화살 ${a.n}→${b.n}발 발사, 관통 ${a.pierce}→${b.pierce}, 계수 ${a.dmg}→${b.dmg}`;
    },
    cast(p, lv, tgt) {
      const q = SKILLS.arrow.p[lv - 1];
      const base = U.angTo(p.x, p.y, tgt.x, tgt.y);
      for (let i = 0; i < q.n; i++) {
        const off = (i - (q.n - 1) / 2) * 0.16;
        const a = base + off;
        Objects.addProjectile({
          x: p.x, y: p.y, vx: Math.cos(a) * q.spd, vy: Math.sin(a) * q.spd,
          r: 4, dmg: Player.power(p) * q.dmg, from: 'player', pierce: q.pierce, aoe: 0,
          color: '#cfe3ff', element: 'phys', skill: 'arrow', ttl: 1.6,
        });
      }
      Audio.sfx('arrow', { vol: 0.5 });
    },
  },

  whirl: {
    name: '회오리 베기', icon: 's_whirl', max: 5,
    cd: [7.0, 6.4, 5.8, 5.2, 4.6],
    p: [
      { r: 85, dmg: 1.3 }, { r: 95, dmg: 1.6 }, { r: 105, dmg: 1.9 }, { r: 118, dmg: 2.3 }, { r: 132, dmg: 2.8 },
    ],
    desc: (lv) => {
      const a = SKILLS.whirl.p[lv - 1], b = SKILLS.whirl.p[Math.min(lv, 4)];
      return `주변 ${a.r}→${b.r} 범위의 적 전체에게 피해 (계수 ${a.dmg}→${b.dmg}) + 적을 살짝 끌어당김`;
    },
    cast(p, lv) {
      const q = SKILLS.whirl.p[lv - 1];
      FX.ring(p.x, p.y, q.r, '#ffe9a8', 0.4);
      FX.slash(p.x, p.y, G.time * 3, q.r * 0.8, TAU, '#ffd24d');
      FX.shake(0.25); Audio.sfx('swing2', { vol: 0.8, rate: 0.7 });
      for (const e of G.run.enemies) {
        if (U.dist(p.x, p.y, e.x, e.y) < q.r + e.r) {
          Combat.dealDamage(e, Player.power(p) * q.dmg, { src: p, element: 'phys', kb: 160 });
          const a = U.angTo(e.x, e.y, p.x, p.y);
          e.kbx += Math.cos(a) * 120; e.kby += Math.sin(a) * 120;
        }
      }
    },
  },

  chain: {
    name: '연쇄 번개', icon: 's_chain', max: 5,
    cd: [4.6, 4.2, 3.8, 3.4, 3.0],
    p: [
      { jumps: 3, dmg: 0.9, range: 300 }, { jumps: 4, dmg: 1.05, range: 310 }, { jumps: 5, dmg: 1.2, range: 320 },
      { jumps: 7, dmg: 1.4, range: 330 }, { jumps: 9, dmg: 1.6, range: 340 },
    ],
    desc: (lv) => {
      const a = SKILLS.chain.p[lv - 1], b = SKILLS.chain.p[Math.min(lv, 4)];
      return `번개가 ${a.jumps}→${b.jumps}마리의 적에게 연쇄 도약 (계수 ${a.dmg}→${b.dmg}, 사거리 ${a.range})`;
    },
    cast(p, lv, tgt) {
      const q = SKILLS.chain.p[lv - 1];
      let cur = tgt, dmg = Player.power(p) * q.dmg;
      const hit = new Set();
      FX.bolt(p.x, p.y - 10, cur.x, cur.y, '#aee6ff', 0.2, 3);
      for (let i = 0; i < q.jumps && cur; i++) {
        if (!hit.has(cur)) {
          hit.add(cur);
          Combat.dealDamage(cur, dmg, { src: p, element: 'lightning', kb: 40 });
          FX.burst(cur.x, cur.y, { n: 8, color: ['#aee6ff', '#ffffff', '#6fb7ff'], speed: 150, life: 0.4, sizeMax: 3 });
        }
        dmg *= 0.85;
        let next = null, bd = q.range;
        for (const e of G.run.enemies) {
          if (hit.has(e) || e === cur) continue;
          const d = U.dist(cur.x, cur.y, e.x, e.y);
          if (d < bd) { bd = d; next = e; }
        }
        if (next) FX.bolt(cur.x, cur.y, next.x, next.y, '#aee6ff', 0.2, 3);
        cur = next;
      }
      Audio.sfx('zap', { vol: 0.6 });
      FX.shake(0.12);
    },
  },

  poison: {
    name: '독 안개', icon: 's_poison', max: 5,
    cd: [8.0, 7.4, 6.8, 6.2, 5.6],
    p: [
      { r: 75, dur: 4.0, dmg: 0.30, slow: 0.30 }, { r: 85, dur: 4.8, dmg: 0.40, slow: 0.32 },
      { r: 95, dur: 5.6, dmg: 0.50, slow: 0.34 }, { r: 108, dur: 6.4, dmg: 0.62, slow: 0.36 },
      { r: 122, dur: 7.2, dmg: 0.75, slow: 0.38 },
    ],
    desc: (lv) => {
      const a = SKILLS.poison.p[lv - 1], b = SKILLS.poison.p[Math.min(lv, 4)];
      return `적 위치에 독 장판 생성 (반경 ${a.r}→${b.r}, 지속 ${a.dur}→${b.dur}초), 0.5초마다 계수 ${a.dmg}→${b.dmg} 피해 + 둔화`;
    },
    cast(p, lv, tgt) {
      const q = SKILLS.poison.p[lv - 1];
      Objects.addZone({
        x: tgt.x, y: tgt.y, r: q.r, ttl: q.dur, tick: 0, tickCd: 0.5,
        dmg: Player.power(p) * q.dmg, slow: q.slow, element: 'poison', color: 'rgba(110, 220, 90, 0.30)', src: p,
      });
      Audio.sfx('poison', { vol: 0.6 });
    },
  },

  frost: {
    name: '빙결 파동', icon: 's_frost', max: 5,
    cd: [6.5, 6.0, 5.5, 5.0, 4.5],
    p: [
      { r: 95, dmg: 0.8, slow: 0.5, slowDur: 2.2 }, { r: 105, dmg: 1.0, slow: 0.5, slowDur: 2.4 },
      { r: 115, dmg: 1.2, slow: 0.52, slowDur: 2.6 }, { r: 128, dmg: 1.45, slow: 0.55, slowDur: 2.8 },
      { r: 142, dmg: 1.7, slow: 0.58, slowDur: 3.0 },
    ],
    desc: (lv) => {
      const a = SKILLS.frost.p[lv - 1], b = SKILLS.frost.p[Math.min(lv, 4)];
      return `플레이어 주변으로 빙결 파동 (반경 ${a.r}→${b.r}, 계수 ${a.dmg}→${b.dmg}) + ${a.slow * 100 | 0}% 둔화`;
    },
    cast(p, lv) {
      const q = SKILLS.frost.p[lv - 1];
      FX.ring(p.x, p.y, q.r, '#aee6ff', 0.5);
      FX.burst(p.x, p.y, { n: 24, color: ['#aee6ff', '#ffffff', '#6fb7ff'], speed: 220, life: 0.5, sizeMax: 3 });
      Audio.sfx('nova', { vol: 0.6, rate: 1.2 });
      for (const e of G.run.enemies) {
        if (U.dist(p.x, p.y, e.x, e.y) < q.r + e.r) {
          Combat.dealDamage(e, Player.power(p) * q.dmg, { src: p, element: 'ice', kb: 60 });
          e.slowVal = Math.min(e.slowVal, 1 - q.slow); e.slowT = Math.max(e.slowT, q.slowDur);
        }
      }
    },
  },

  skeleton: {
    name: '해골 소환', icon: 's_skeleton', max: 5,
    cd: [13.0, 12.0, 11.0, 10.0, 9.0],
    p: [
      { n: 1, hp: 1.0, dmg: 0.6 }, { n: 1, hp: 1.3, dmg: 0.75 }, { n: 2, hp: 1.6, dmg: 0.9 },
      { n: 2, hp: 2.0, dmg: 1.1 }, { n: 3, hp: 2.5, dmg: 1.3 },
    ],
    desc: (lv) => {
      const a = SKILLS.skeleton.p[lv - 1], b = SKILLS.skeleton.p[Math.min(lv, 4)];
      return `해골 전사를 ${a.n}→${b.n}기 소환 (체력 계수 ${a.hp}→${b.hp}, 공격 계수 ${a.dmg}→${b.dmg}), 20초간 활동`;
    },
    cast(p, lv) {
      const q = SKILLS.skeleton.p[lv - 1];
      for (let i = 0; i < q.n; i++) {
        const a = U.rand(TAU), d = U.rand(30, 60);
        Objects.addMinion({
          x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
          r: 9, hp: 60 * q.hp + Player.power(p) * 0.5, maxhp: 60 * q.hp + Player.power(p) * 0.5,
          dmg: Player.power(p) * q.dmg, spd: 120, ttl: 20, atkCd: 0, kbResist: 0.3,
        });
      }
      FX.ring(p.x, p.y, 60, '#c8ffd8', 0.5);
      Audio.sfx('summon', { vol: 0.7 });
    },
  },

  aegis: {
    name: '수호 결계', icon: 's_aegis', max: 5,
    cd: [15.0, 14.0, 13.0, 12.0, 11.0],
    p: [
      { shield: 2.0, nova: 0.8 }, { shield: 2.5, nova: 1.0 }, { shield: 3.0, nova: 1.2 },
      { shield: 3.6, nova: 1.4 }, { shield: 4.2, nova: 1.7 },
    ],
    desc: (lv) => {
      const a = SKILLS.aegis.p[lv - 1], b = SKILLS.aegis.p[Math.min(lv, 4)];
      return `피해를 대신 받아주는 방어막 (계수 ${a.shield}→${b.shield}만큼 보호막), 깨지면 주변에 반격 (계수 ${a.nova}→${b.nova})`;
    },
    cast(p, lv) {
      const q = SKILLS.aegis.p[lv - 1];
      p.shieldMax = Player.power(p) * q.shield;
      p.shield = p.shieldMax;
      FX.ring(p.x, p.y, 46, '#9adcff', 0.5);
      Audio.sfx('shield', { vol: 0.7 });
    },
  },
};

// 레벨업 시 offered 되는 스탯 카드 (run.bonus에 누적 → Player.recalc에 반영)
const STAT_CARDS = [
  { id: 'dmg', name: '분노', icon: 's_whirl', desc: () => '모든 피해 +8%', apply: () => { G.run.bonus.dmgPct += 8; } },
  { id: 'hp', name: '강인함', icon: 'heart', desc: () => '최대 체력 +20, 즉시 20 회복', apply: () => { G.run.bonus.hp += 20; G.run.player.hp = Math.min(G.run.player.maxhp, G.run.player.hp + 20); } },
  { id: 'crit', name: '치명안', icon: 'skull', desc: () => '치명타 확률 +5%', apply: () => { G.run.bonus.critCh += 5; } },
  { id: 'move', name: '바람결', icon: 's_arrow', desc: () => '이동 속도 +6%', apply: () => { G.run.bonus.move += 6; } },
  { id: 'xp', name: '통찰', icon: 'gem', desc: () => '경험치 획득 +12%', apply: () => { G.run.bonus.xp += 12; } },
  { id: 'ls', name: '피의 갈증', icon: 'heart', desc: () => '흡혈 +1%', apply: () => { G.run.bonus.ls += 1; } },
  { id: 'luck', name: '행운의 별', icon: 'coin', desc: () => '행운 +4 (고등급 드랍 ↑)', apply: () => { G.run.bonus.luck += 4; } },
  { id: 'potion', name: '비상 물약', icon: 'potion', desc: () => '포션 +1개, 체력 30% 회복', apply: () => { const r = G.run; r.potions = Math.min(r.potionMax, r.potions + 1); r.player.hp = Math.min(r.player.maxhp, r.player.hp + r.player.maxhp * 0.3); } },
];

const SkillSys = {
  list: [],
  reset() { SkillSys.list = []; },
  has(id) { return SkillSys.list.some((s) => s.id === id); },
  get(id) { return SkillSys.list.find((s) => s.id === id); },
  add(id) { SkillSys.list.push({ id, lv: 1, cdLeft: U.rand(0.5, 1.5) }); },
  upgrade(id) { const s = SkillSys.get(id); if (s) s.lv++; },
  maxed() { return SkillSys.list.length >= 4 && SkillSys.list.every((s) => s.lv >= SKILLS[s.id].max); },

  update(dt) {
    const run = G.run, p = run.player;
    for (const s of SkillSys.list) {
      s.cdLeft -= dt;
      if (s.cdLeft <= 0) {
        const tgt = Combat.nearestEnemy(p.x, p.y, 700);
        const def = SKILLS[s.id];
        if (tgt || def.noTarget) {
          def.cast(p, s.lv, tgt);
          s.cdLeft = def.cd[s.lv - 1];
        } else s.cdLeft = 0.3;
      }
    }
  },

  // 레벨업 선택지 3개 생성
  offers() {
    const pool = [];
    for (const s of SkillSys.list) {
      if (s.lv < SKILLS[s.id].max) pool.push({ kind: 'skill', id: s.id, w: 3.2 });
    }
    if (SkillSys.list.length < 4) {
      for (const id of Object.keys(SKILLS)) if (!SkillSys.has(id)) pool.push({ kind: 'skill', id, w: 2.4, fresh: true });
    }
    for (const c of STAT_CARDS) pool.push({ kind: 'stat', id: c.id, w: 1.7 });
    const out = [], used = new Set();
    while (out.length < 3 && pool.length) {
      let sum = 0; for (const x of pool) sum += x.w;
      let r = Math.random() * sum, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
      const pick = pool.splice(Math.min(i, pool.length - 1), 1)[0];
      const key = pick.kind + ':' + pick.id;
      if (used.has(key)) continue;
      used.add(key); out.push(pick);
    }
    return out;
  },

  describe(offer) {
    if (offer.kind === 'skill') {
      const def = SKILLS[offer.id];
      const cur = SkillSys.get(offer.id);
      const lv = cur ? cur.lv : 0;
      return { name: def.name, icon: def.icon, desc: def.desc(lv + 1), lvTxt: cur ? `Lv ${cur.lv} → ${cur.lv + 1}` : '신규 스킬', kind: 'SKILL' };
    }
    const c = STAT_CARDS.find((c) => c.id === offer.id);
    return { name: c.name, icon: c.icon, desc: c.desc(), lvTxt: '', kind: 'ABILITY' };
  },

  apply(offer) {
    if (offer.kind === 'skill') {
      if (offer.fresh) SkillSys.add(offer.id); else SkillSys.upgrade(offer.id);
      Audio.sfx('levelup');
    } else {
      STAT_CARDS.find((c) => c.id === offer.id).apply();
      Player.recalc(G.run.player);
      Audio.sfx('card');
    }
  },
};
window.SKILLS = SKILLS;
window.SkillSys = SkillSys;
window.STAT_CARDS = STAT_CARDS;
