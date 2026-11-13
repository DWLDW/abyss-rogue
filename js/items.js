// items.js — 전리품 생성, 장비/인벤토리, 스탯 합산, 툴팁
const Items = {
  uid: 1,

  rollRarity(luck = 0) {
    const rs = CFG.RARITY;
    const ws = rs.map((r, i) => r.w * Math.pow(1 + luck * 0.07, i));
    let sum = 0; for (const w of ws) sum += w;
    let x = Math.random() * sum;
    for (let i = 0; i < rs.length; i++) { x -= ws[i]; if (x <= 0) return i; }
    return 0;
  },

  gen(floor, luck = 0, forceSlot = null) {
    const slot = forceSlot || U.choice(CFG.SLOTS);
    const rar = Items.rollRarity(luck);
    const rd = CFG.RARITY[rar];
    const item = { uid: Items.uid++, slot, rarity: rar, ilvl: floor, affixes: [], name: '', value: 0 };
    const grow = 1 + (floor - 1) * 0.16;
    if (slot === 'weapon') {
      const base = U.choice(CFG.WEAPONS);
      item.base = base.id; item.kind = base.kind;
      item.projSpd = base.projSpd; item.range = base.range; item.arc = base.arc;
      item.dmg = Math.max(1, Math.round(U.rand(base.dmg[0], base.dmg[1]) * rd.mult * grow));
      item.spd = +(base.spd * U.rand(0.95, 1.12)).toFixed(2);
    } else if (slot === 'helm') {
      item.armor = Math.round(U.rand(4, 8) * rd.mult * (1 + (floor - 1) * 0.12));
      item.hp = Math.round(U.rand(5, 14) * rd.mult);
    } else if (slot === 'armor') {
      item.armor = Math.round(U.rand(10, 20) * rd.mult * (1 + (floor - 1) * 0.12));
      item.hp = Math.round(U.rand(12, 26) * rd.mult);
    }
    const pool = CFG.AFFIXES.filter((a) => a.slots.includes(slot));
    const n = Math.min(pool.length, U.randi(rd.affix[0], rd.affix[1]));
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const a = U.choice(pool);
      if (used.has(a.id)) continue;
      used.add(a.id);
      item.affixes.push({ id: a.id, val: Math.round(U.rand(a.min, a.max) * (0.75 + rd.mult * 0.3)) });
    }
    item.name = Items.makeName(item, floor, rar);
    item.value = Math.round((4 + rar * 9) * (1 + floor * 0.25) + (item.dmg || 0) * 2 + (item.armor || 0) + (item.hp || 0));
    return item;
  },

  makeName(item, floor, rar) {
    const MATS = ['낡은', '강철', '은빛', '심연철', '용뼈', '별강철'];
    const ARMOR_MATS = ['가죽', '사슬', '강철', '미스릴', '용비늘', '심연판금'];
    const LEGENDS = ['종말의 검', '심연의 포효', '별을 삼키는 자', '파멸의 수호자', '최후의 등불', '심연 군주의 유물', '천둥치는 분노', '영겁의 서약'];
    if (rar >= 4) return U.choice(LEGENDS);
    const mat = (item.slot === 'weapon' ? MATS : ARMOR_MATS)[U.clamp(floor >> 2, 0, 5)];
    const base = item.slot === 'weapon'
      ? (CFG.WEAPONS.find((w) => w.id === item.base) || {}).name
      : CFG.SLOT_NAME[item.slot];
    const pre = item.affixes.length ? CFG.AFFIXES.find((a) => a.id === item.affixes[0].id).name : '';
    return (pre ? pre + ' ' : '') + mat + ' ' + base;
  },

  iconOf(item) {
    if (item.slot === 'weapon') {
      const w = CFG.WEAPONS.find((w) => w.id === item.base);
      return w ? w.icon : 'w_sword';
    }
    return CFG.SLOT_ICON[item.slot];
  },

  // 아이템이 올려주는 스탯 (기본 스탯 + 접사)
  statsOf(item) {
    const s = { dmg: 0, spd: 1, armor: 0, hp: 0, dmgPct: 0, critCh: 0, critMult: 0, atkSpd: 0, move: 0, ls: 0, thorns: 0, xp: 0, gold: 0, luck: 0, skillDmg: 0 };
    if (!item) return s;
    if (item.dmg) s.dmg = item.dmg;
    if (item.spd) s.spd = item.spd;
    if (item.armor) s.armor = item.armor;
    if (item.hp) s.hp = item.hp;
    for (const af of item.affixes) {
      const def = CFG.AFFIXES.find((a) => a.id === af.id);
      if (!def) continue;
      switch (af.id) {
        case 'phys': s.dmg += af.val; break;
        case 'dmgPct': s.dmgPct += af.val; break;
        case 'critCh': s.critCh += af.val; break;
        case 'critMult': s.critMult += af.val; break;
        case 'atkSpd': s.atkSpd += af.val; break;
        case 'hp': s.hp += af.val; break;
        case 'armor': s.armor += af.val; break;
        case 'move': s.move += af.val; break;
        case 'ls': s.ls += af.val; break;
        case 'thorns': s.thorns += af.val; break;
        case 'xp': s.xp += af.val; break;
        case 'gold': s.gold += af.val; break;
        case 'luck': s.luck += af.val; break;
        case 'skillDmg': s.skillDmg += af.val; break;
      }
    }
    return s;
  },

  aggregate(equip) {
    const t = Items.statsOf(null);
    for (const slot of CFG.SLOTS) {
      const s = Items.statsOf(equip[slot]);
      for (const k of Object.keys(t)) t[k] += s[k];
    }
    return t;
  },

  // 자동 장착 비교용 점수
  score(item) {
    if (!item) return -1;
    const s = Items.statsOf(item);
    return s.dmg * 2.2 + s.armor * 1.6 + s.hp * 1.1 + s.dmgPct * 9 + s.critCh * 7 + s.critMult * 0.4 +
      s.atkSpd * 5 + s.move * 6 + s.ls * 40 + s.thorns * 1.2 + s.xp * 4 + s.gold * 2 + s.luck * 8 + s.skillDmg * 6 +
      item.rarity * 12;
  },

  tooltip(item) {
    const rd = CFG.RARITY[item.rarity];
    const s = Items.statsOf(item);
    let h = `<div class="tname" style="color:${rd.color}">${item.name}</div>`;
    h += `<div class="tslot">${CFG.SLOT_NAME[item.slot]} · ${rd.name} · ${item.ilvl}층 산출</div>`;
    const lines = [];
    if (s.dmg) lines.push(`공격력 ${s.dmg}`);
    if (item.spd && item.slot === 'weapon') lines.push(`공격 속도 ${item.spd.toFixed(2)}x`);
    if (s.armor) lines.push(`방어력 +${s.armor}`);
    if (s.hp) lines.push(`최대 체력 +${s.hp}`);
    for (const af of item.affixes) {
      const def = CFG.AFFIXES.find((a) => a.id === af.id);
      if (def) lines.push(`<span class="aff">${def.fmt(af.val)}</span>`);
    }
    h += lines.join('<br>');
    h += `<div class="tval">판매가 ${U.fmt(item.value)} 골드</div>`;
    return h;
  },
};
window.Items = Items;
