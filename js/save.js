// save.js — localStorage 영구 저장 (메타 진행: 영혼/골드/업그레이드/장비/인벤토리)
const Save = {
  KEY: 'abyss_rogue_save_v1',
  data: null,

  defaults() {
    return {
      soul: 0, gold: 0, bestFloor: 0, totalKills: 0, totalRuns: 0,
      upgrades: {},                       // id -> level
      equip: { weapon: null, helm: null, armor: null, ring: null, charm: null },
      inv: [],                            // 인벤토리 아이템 배열 (최대 24)
      potionsStock: 3,
      settings: { mute: false },
      seenHelp: false,
    };
  },

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(Save.KEY) || 'null'); } catch (e) { d = null; }
    Save.data = Save.defaults();
    if (d && typeof d === 'object') {
      for (const k of Object.keys(Save.data)) {
        if (d[k] !== undefined) Save.data[k] = (k === 'settings') ? Object.assign(Save.data.settings, d.settings) : d[k];
      }
    }
    G.save = Save.data;
    if (window.Audio) Audio.muted = !!Save.data.settings.mute;
    return Save.data;
  },

  save() {
    try { localStorage.setItem(Save.KEY, JSON.stringify(Save.data)); } catch (e) { /* file:// 등 저장 불가 환경 무시 */ }
  },

  reset() {
    Save.data = Save.defaults();
    G.save = Save.data;
    Save.save();
  },
};
window.Save = Save;
