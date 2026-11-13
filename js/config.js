// config.js — 밸런스 상수와 정적 데이터
const CFG = {
  TILE: 32,
  MAP_W: 88, MAP_H: 88,
  SPR_SCALE: 3,            // 16px 스프라이트 표시 배율
  BOSS_EVERY: 5,

  XP_NEED: (lv) => Math.round(10 * Math.pow(lv, 1.45)),
  floorHpMult:  (f) => 1 + (f - 1) * 0.5 + (f - 1) * (f - 1) * 0.03,
  floorDmgMult: (f) => 1 + (f - 1) * 0.22,
  floorSoulMult:(f) => 1 + (f - 1) * 0.35,
  eliteChance:  (f) => Math.min(0.22, 0.05 + f * 0.012),
  isBossFloor:  (f) => f % CFG.BOSS_EVERY === 0,

  RARITY: [
    { key: 'common', name: '일반', color: '#9aa3ad', w: 58,  affix: [0, 1], mult: 1.00 },
    { key: 'magic',  name: '고급', color: '#4da3ff', w: 27,  affix: [1, 2], mult: 1.18 },
    { key: 'rare',   name: '희귀', color: '#ffd24d', w: 10,  affix: [2, 3], mult: 1.42 },
    { key: 'hero',   name: '영웅', color: '#c77dff', w: 3.6, affix: [3, 4], mult: 1.70 },
    { key: 'legend', name: '전설', color: '#ff8c3a', w: 1.0, affix: [4, 5], mult: 2.10 },
  ],

  SLOTS: ['weapon', 'helm', 'armor', 'ring', 'charm'],
  SLOT_NAME: { weapon: '무기', helm: '투구', armor: '갑옷', ring: '반지', charm: '부적' },
  SLOT_ICON: { weapon: 'w_sword', helm: 'i_helm', armor: 'i_armor', ring: 'i_ring', charm: 'i_charm' },

  WEAPONS: [
    { id: 'sword', name: '검',     dmg: [9, 15], spd: 1.00, kind: 'melee', range: 58, arc: 1.95, icon: 'w_sword', desc: '근접 3연격 콤보' },
    { id: 'bow',   name: '활',     dmg: [7, 12], spd: 1.55, kind: 'arrow', projSpd: 640,        icon: 'w_bow',   desc: '빠른 화살 발사' },
    { id: 'staff', name: '지팡이', dmg: [8, 14], spd: 1.30, kind: 'bolt',  projSpd: 520,        icon: 'w_staff', desc: '마력탄 발사' },
  ],

  AFFIXES: [
    { id: 'phys',     name: '강타의',   slots: ['weapon'],                       min: 3,  max: 10, fmt: (v) => `공격력 +${v}` },
    { id: 'dmgPct',   name: '날카로운', slots: ['weapon', 'charm'],             min: 8,  max: 24, fmt: (v) => `피해 +${v}%` },
    { id: 'critCh',   name: '예리한',   slots: ['weapon', 'ring'],              min: 3,  max: 9,  fmt: (v) => `치명타 확률 +${v}%` },
    { id: 'critMult', name: '치명적인', slots: ['weapon', 'ring'],              min: 25, max: 60, fmt: (v) => `치명타 피해 +${v}%` },
    { id: 'atkSpd',   name: '신속한',   slots: ['weapon'],                       min: 8,  max: 18, fmt: (v) => `공격 속도 +${v}%` },
    { id: 'hp',       name: '생명력의', slots: ['helm', 'armor'],               min: 15, max: 45, fmt: (v) => `최대 체력 +${v}` },
    { id: 'armor',    name: '수호의',   slots: ['helm', 'armor'],               min: 8,  max: 22, fmt: (v) => `방어력 +${v}` },
    { id: 'move',     name: '질주의',   slots: ['helm', 'armor', 'ring', 'charm'], min: 4, max: 9,  fmt: (v) => `이동 속도 +${v}%` },
    { id: 'ls',       name: '흡혈의',   slots: ['ring', 'charm'],               min: 1,  max: 3,  fmt: (v) => `흡혈 +${v}%` },
    { id: 'thorns',   name: '가시의',   slots: ['armor'],                       min: 4,  max: 14, fmt: (v) => `반격 피해 +${v}` },
    { id: 'xp',       name: '현자의',   slots: ['charm'],                       min: 8,  max: 18, fmt: (v) => `경험치 획득 +${v}%` },
    { id: 'gold',     name: '부의',     slots: ['ring', 'charm'],               min: 15, max: 35, fmt: (v) => `골드 획득 +${v}%` },
    { id: 'luck',     name: '복의',     slots: ['ring', 'charm'],               min: 4,  max: 10, fmt: (v) => `행운 +${v} (드랍 등급 상승)` },
    { id: 'skillDmg', name: '비전의',   slots: ['charm', 'weapon'],             min: 10, max: 30, fmt: (v) => `스킬 피해 +${v}%` },
  ],

  META: [
    { id: 'hp',     name: '활력',        desc: '최대 체력 +15',                              max: 5, base: 40 },
    { id: 'dmg',    name: '힘',          desc: '모든 피해 +6%',                              max: 5, base: 45 },
    { id: 'spd',    name: '신속',        desc: '이동 속도 +3%',                              max: 5, base: 35 },
    { id: 'fort',   name: '행운',        desc: '골드 획득 +8%, 고등급 드랍 확률 상승',        max: 5, base: 50 },
    { id: 'sch',    name: '현명',        desc: '경험치 획득 +10%',                           max: 5, base: 40 },
    { id: 'aegis',  name: '물약 주머니', desc: '포션 최대 소지 +1, 회복량 +20%',             max: 5, base: 60 },
    { id: 'gate',   name: '심연의 관문', desc: '던전 입장 시 시작 층 +1 (최대 6층부터)',     max: 5, base: 120 },
    { id: 'revive', name: '부활의 낙인', desc: '런당 1회, 50% 체력으로 즉시 부활',           max: 1, base: 300 },
  ],
  metaCost: (u, nextLv) => Math.round(u.base * Math.pow(nextLv, 1.6)),
  startFloor: () => 1 + ((G.save && G.save.upgrades.gate) || 0),

  PLAYER: {
    hp: 100, speed: 152, critCh: 5, critMult: 200,
    dashSpd: 560, dashDur: 0.16, dashCd: 2.1, invuln: 0.42,
    potionMax: 3, potionHeal: 0.40, potionCd: 1.0,
    atkBaseCd: 0.42, comboWindow: 0.65,
    magnetR: 70, pickupR: 20,
  },
};
