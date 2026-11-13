// input.js — 키보드/마우스 입력
const Input = {
  keys: Object.create(null),
  pressed: Object.create(null),   // 이번 프레임에 새로 눌린 키
  mouse: { x: 0, y: 0, l: false, r: false },

  init() {
    const cv = G.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      Input.keys[e.code] = true;
      Input.pressed[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (window.Audio && Audio.init) Audio.init();
    });
    window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
    window.addEventListener('blur', () => { Input.keys = Object.create(null); Input.mouse.l = Input.mouse.r = false; });
    cv.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      Input.mouse.x = e.clientX - r.left;
      Input.mouse.y = e.clientY - r.top;
    });
    cv.addEventListener('mousedown', (e) => {
      if (e.button === 0) Input.mouse.l = true;
      if (e.button === 2) Input.mouse.r = true;
      if (window.Audio && Audio.init) Audio.init();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) Input.mouse.l = false;
      if (e.button === 2) Input.mouse.r = false;
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  down(...codes) { return codes.some((c) => Input.keys[c]); },
  hit(...codes)  { return codes.some((c) => Input.pressed[c]); },

  axis() {
    let x = (Input.down('KeyD', 'ArrowRight') ? 1 : 0) - (Input.down('KeyA', 'ArrowLeft') ? 1 : 0);
    let y = (Input.down('KeyS', 'ArrowDown') ? 1 : 0) - (Input.down('KeyW', 'ArrowUp') ? 1 : 0);
    if (x !== 0 && y !== 0) { const s = Math.SQRT1_2; x *= s; y *= s; }
    return { x, y };
  },

  endFrame() { Input.pressed = Object.create(null); },
};
window.Input = Input;

// Touch — 모바일용 가상 조이스틱 + 버튼
const Touch = {
  active: false,
  joy: { x: 0, y: 0, id: -1 },
  attack: false, dash: false, potion: false,
  R: 46,

  init() {
    const ui = U.$('touch-ui');
    if (!ui) return;
    const q = new URLSearchParams(location.search);
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (q.get('touch') === '1' || coarse || 'ontouchstart' in window) {
      Touch.active = true;
      ui.classList.remove('hidden');
    }
    window.addEventListener('touchstart', () => {
      if (!Touch.active) { Touch.active = true; ui.classList.remove('hidden'); }
    }, { passive: true });

    const knob = U.$('joy-knob'), base = U.$('joy-base');
    const baseCenter = () => {
      const r = base.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const placeKnob = () => {
      knob.style.transform = `translate(${Touch.joy.x * Touch.R}px, ${Touch.joy.y * Touch.R}px)`;
    };
    const resetJoy = () => { Touch.joy.x = 0; Touch.joy.y = 0; Touch.joy.id = -1; placeKnob(); };

    window.addEventListener('touchstart', (e) => {
      if (G.state !== 'run' && G.state !== 'levelup') return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.55 && Touch.joy.id === -1) {
          Touch.joy.id = t.identifier;
          const c = baseCenter();
          let dx = t.clientX - c.x, dy = t.clientY - c.y;
          const len = Math.hypot(dx, dy) || 1;
          const cl = Math.min(len, Touch.R);
          Touch.joy.x = (dx / len) * (cl / Touch.R);
          Touch.joy.y = (dy / len) * (cl / Touch.R);
          placeKnob();
        }
      }
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (G.state !== 'run' && G.state !== 'levelup') return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === Touch.joy.id) {
          const c = baseCenter();
          let dx = t.clientX - c.x, dy = t.clientY - c.y;
          const len = Math.hypot(dx, dy) || 1;
          const cl = Math.min(len, Touch.R);
          Touch.joy.x = (dx / len) * (cl / Touch.R);
          Touch.joy.y = (dy / len) * (cl / Touch.R);
          placeKnob();
        }
      }
    }, { passive: false });
    const joyEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === Touch.joy.id) resetJoy();
    };
    window.addEventListener('touchend', joyEnd);
    window.addEventListener('touchcancel', joyEnd);

    const bindBtn = (id, set) => {
      const el = U.$(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); set(true); el.classList.add('on'); };
      const off = (e) => { if (e) e.preventDefault(); set(false); el.classList.remove('on'); };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', () => { set(false); el.classList.remove('on'); });
    };
    bindBtn('tb-attack', (v) => { Touch.attack = v; });
    bindBtn('tb-dash', (v) => { Touch.dash = v; });
    bindBtn('tb-potion', (v) => { Touch.potion = v; });
  },
};
window.Touch = Touch;
