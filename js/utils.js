// utils.js — 전역 상태 + 공용 유틸 (모든 스크립트보다 먼저 로드)
window.G = {
  state: 'boot',            // title | hub | run | levelup | pause | death | help
  prevState: null,
  canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
  cam: { x: 0, y: 0 },
  time: 0,
  hitstop: 0,               // >0 이면 월드 업데이트 정지 (타격감)
  trauma: 0,                // 화면 흔들림 0..1
  flash: { a: 0, color: '#ffffff' },
  run: null,
  save: null,
  demo: false,
  menuFxT: 0,
};

const TAU = Math.PI * 2;

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
  randi: (a, b) => Math.floor(U.rand(a, b + 1)),
  choice: (arr) => arr[(Math.random() * arr.length) | 0],
  chance: (p) => Math.random() < p,
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  angTo: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  angDiff: (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
  fmt: (n) => {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e5) return Math.round(n / 1e3) + 'k';
    return String(n);
  },
  $: (id) => document.getElementById(id),
  el: (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
};
window.U = U;
