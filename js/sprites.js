// sprites.js — 프로시저럴 도트 스프라이트 라이브러리 (외부 에셋 없이 코드로 생성)
// API: Sprites.DATA / init() / has / get(name,frame) / draw(ctx,name,frame,x,y,scale,opts) / icon(name) / names()
(function () {
  // ---------- 미니 페인터 ----------
  function grid(w, h) { return Array.from({ length: h }, () => new Array(w).fill('.')); }
  function paint(w, h, fn) {
    const g = grid(w, h);
    const api = {
      set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; },
      box(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) api.set(x, y, c); },
      disc(cx, cy, r, c) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x - cx, dy = (y - cy) * 1.25; if (dx * dx + dy * dy <= r * r) api.set(x, y, c); } },
      ring(cx, cy, r, c) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x - cx, dy = (y - cy) * 1.25; const d = Math.sqrt(dx * dx + dy * dy); if (Math.abs(d - r) < 0.9) api.set(x, y, c); } },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) api.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); },
    };
    fn(api);
    // 실루엣 외곽선: 색 cell에 인접한 빈 cell을 k로
    const out = g.map((r) => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] !== '.') continue;
      let adj = false;
      for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && g[ny][nx] !== '.') { adj = true; break; }
      }
      if (adj) out[y][x] = 'k';
    }
    return out.map((r) => r.join(''));
  }
  const entry = (w, h, pal, frames) => ({ w, h, pal, frames });

  const DATA = {};

  // ---------- 플레이어 (후드 모험가 + 검) ----------
  const PPAL = { k: '#14101c', h: '#5a4030', s: '#e8b88a', c: '#3f6bb5', d: '#2c4a85', b: '#5a3d28', w: '#e6ecf7', e: '#0c0a12', g: '#ffd24d' };
  function playerFrame(legs, arm, sword) {
    return paint(16, 16, (a) => {
      a.disc(8, 4, 3.4, 'h');           // 후드
      a.box(7, 3, 10, 6, 's');          // 얼굴
      a.set(9, 4, 'e');                 // 눈
      a.box(5, 7, 10, 10, 'c');         // 몸통
      a.box(5, 7, 6, 10, 'd');          // 음영
      a.box(5, 10, 10, 10, 'b');        // 벨트
      a.box(7, 10, 8, 10, 'g');         // 버클
      for (const L of legs) a.box(L[0], L[1], L[2], L[3], 'd');   // 다리
      a.box(legs[0] ? legs[0][0] : 6, 14, (legs[0] ? legs[0][2] : 7), 15, 'b'); // 부츠
      a.box(legs[1] ? legs[1][0] : 9, 14, (legs[1] ? legs[1][2] : 10), 15, 'b');
      for (const A of arm) a.box(A[0], A[1], A[2], A[3], A[4]);   // 팔
      if (sword) for (const S of sword) a.line(S[0], S[1], S[2], S[3], S[4]); // 검
    });
  }
  const LEGS_A = [[5, 11, 6, 13], [9, 11, 10, 14]];
  const LEGS_B = [[6, 11, 7, 14], [8, 11, 9, 13]];
  const LEGS_C = [[6, 11, 9, 14]];
  const ARM_R = [[10, 7, 11, 9, 'c']];
  const ARM_L = [[4, 7, 5, 9, 'c']];
  DATA.player_idle = entry(16, 16, PPAL, [
    playerFrame(LEGS_C, ARM_R, null),
    playerFrame([[6, 11, 9, 13]], ARM_R, null),
  ]);
  DATA.player_walk = entry(16, 16, PPAL, [
    playerFrame(LEGS_A, ARM_R, null),
    playerFrame(LEGS_B, [[10, 7, 11, 8, 'c']], null),
    playerFrame(LEGS_C, ARM_R, null),
    playerFrame(LEGS_B, ARM_L, null),
  ]);
  DATA.player_attack = entry(16, 16, PPAL, [
    playerFrame(LEGS_C, [[3, 7, 5, 8, 'c']], [[4, 7, 1, 4, 'w'], [5, 8, 2, 5, 'w']]),
    playerFrame(LEGS_A, [[10, 6, 13, 7, 's']], [[11, 6, 15, 6, 'w'], [13, 6, 15, 5, 'w']]),
    playerFrame(LEGS_C, [[10, 8, 12, 10, 'c']], [[11, 9, 15, 12, 'w']]),
  ]);
  DATA.player_dash = entry(16, 16, PPAL, [
    playerFrame(LEGS_A, [[3, 6, 6, 7, 'c']], [[5, 6, 1, 3, 'w']]),
  ]);

  // ---------- 적들 ----------
  const SPAL = { k: '#14101c', g: '#58c24a', l: '#a4e88a', e: '#0c0a12' };
  DATA.slime = entry(16, 16, SPAL, [
    paint(16, 16, (a) => { a.disc(8, 10, 5, 'g'); a.disc(6, 8, 2, 'l'); a.set(6, 9, 'e'); a.set(10, 9, 'e'); a.set(7, 12, 'k'); a.set(9, 12, 'k'); }),
    paint(16, 16, (a) => { a.disc(8, 11, 5.6, 'g'); a.disc(6, 10, 2, 'l'); a.set(6, 11, 'e'); a.set(10, 11, 'e'); }),
  ]);
  const BPAL = { k: '#14101c', v: '#6a4a8c', r: '#ff5a5a' };
  DATA.bat = entry(16, 16, BPAL, [
    paint(16, 16, (a) => {
      a.disc(8, 9, 2.6, 'v');
      a.set(7, 6, 'v'); a.set(9, 6, 'v');           // 귀
      a.set(7, 9, 'r'); a.set(9, 9, 'r');           // 눈
      a.line(5, 8, 1, 5, 'v'); a.line(5, 9, 1, 10, 'v'); a.line(5, 10, 2, 12, 'v');
      a.line(11, 8, 15, 5, 'v'); a.line(11, 9, 15, 10, 'v'); a.line(11, 10, 14, 12, 'v');
    }),
    paint(16, 16, (a) => {
      a.disc(8, 9, 2.6, 'v');
      a.set(7, 6, 'v'); a.set(9, 6, 'v');
      a.set(7, 9, 'r'); a.set(9, 9, 'r');
      a.line(6, 8, 3, 3, 'v'); a.line(7, 8, 6, 2, 'v');
      a.line(10, 8, 13, 3, 'v'); a.line(9, 8, 10, 2, 'v');
    }),
  ]);
  const KPAL = { k: '#14101c', w: '#e8e4d8', r: '#3a3648', e: '#14101c' };
  function skelFrame(sword) {
    return paint(16, 16, (a) => {
      a.disc(8, 4, 3.2, 'w');
      a.set(6, 4, 'e'); a.set(9, 4, 'e'); a.set(8, 6, 'k');
      a.box(5, 7, 10, 11, 'w');
      a.set(5, 8, 'r'); a.set(10, 8, 'r'); a.set(5, 10, 'r'); a.set(10, 10, 'r'); // 갈비뼈
      a.box(6, 12, 7, 14, 'w'); a.box(9, 12, 10, 14, 'w');
      a.box(4, 7, 5, 10, 'w');
      if (sword) { a.box(11, 7, 12, 10, 'w'); a.line(12, 7, 15, 2, 'w'); }
      else a.box(10, 7, 11, 10, 'w');
    });
  }
  DATA.skeleton = entry(16, 16, KPAL, [skelFrame(false), skelFrame(false)]);
  DATA.skeleton_attack = entry(16, 16, KPAL, [skelFrame(true)]);

  const PP2 = { k: '#14101c', p: '#7a4ab0', f: '#241a30', g: '#8ce06a', b: '#5a3d28' };
  DATA.spitter = entry(16, 16, PP2, [
    paint(16, 16, (a) => {
      a.disc(8, 4, 3.2, 'p'); a.box(7, 3, 9, 6, 'f');
      a.set(7, 5, 'g'); a.set(9, 5, 'g');
      a.box(5, 7, 10, 13, 'p'); a.box(5, 7, 6, 13, 'f');
      a.line(12, 5, 12, 13, 'b'); a.disc(12, 4, 1.6, 'g');
    }),
    paint(16, 16, (a) => {
      a.disc(8, 4, 3.2, 'p'); a.box(7, 3, 9, 6, 'f');
      a.set(7, 5, 'g'); a.set(9, 5, 'g');
      a.box(5, 7, 10, 13, 'p'); a.box(10, 7, 10, 13, 'f');
      a.line(12, 5, 12, 13, 'b'); a.disc(12, 4, 1.8, 'g');
    }),
  ]);
  const RPAL = { k: '#14101c', r: '#8c3a2c', R: '#6e2a1e', y: '#ffd24d', s: '#c9a08a' };
  function bruteFrame(armUp) {
    return paint(18, 18, (a) => {
      a.box(3, 7, 14, 14, 'r'); a.box(3, 7, 5, 14, 'R'); a.box(12, 7, 14, 14, 'R');
      a.box(6, 2, 11, 6, 'r'); a.box(6, 2, 7, 6, 'R');
      a.set(7, 4, 'y'); a.set(10, 4, 'y');
      a.box(5, 15, 7, 17, 'R'); a.box(10, 15, 12, 17, 'R');
      if (armUp) { a.box(0, 3, 3, 8, 'r'); a.box(14, 3, 17, 8, 'r'); a.line(1, 3, 1, 0, 's'); a.line(16, 3, 16, 0, 's'); }
      else { a.box(0, 8, 2, 13, 'r'); a.box(15, 8, 17, 13, 'r'); }
    });
  }
  DATA.brute = entry(18, 18, RPAL, [bruteFrame(false), bruteFrame(true)]);
  DATA.brute_attack = entry(18, 18, RPAL, [bruteFrame(true)]);

  const MPAL = { k: '#14101c', n: '#2c3a6e', f: '#141a30', v: '#c77dff', b: '#5a3d28' };
  DATA.mage = entry(16, 16, MPAL, [
    paint(16, 16, (a) => {
      a.disc(8, 4, 3.2, 'n'); a.box(7, 3, 9, 6, 'f');
      a.set(7, 5, 'v'); a.set(9, 5, 'v');
      a.box(5, 7, 10, 13, 'n'); a.box(5, 7, 10, 8, 'f');
      a.line(12, 4, 12, 13, 'b'); a.disc(12, 3, 2, 'v');
    }),
    paint(16, 16, (a) => {
      a.disc(8, 4, 3.2, 'n'); a.box(7, 3, 9, 6, 'f');
      a.set(7, 5, 'v'); a.set(9, 5, 'v');
      a.box(5, 7, 10, 13, 'n'); a.box(9, 7, 10, 13, 'f');
      a.line(12, 4, 12, 13, 'b'); a.disc(12, 3, 2.2, 'v');
    }),
  ]);

  // 보스 32x32恶魔
  const BOSSPAL = { k: '#100a14', R: '#7a2020', r: '#9c3030', y: '#ffd24d', h: '#e8e0c8', f: '#ff8c3a' };
  function bossFrame(attack) {
    return paint(32, 32, (a) => {
      // 다리
      a.box(10, 24, 14, 30, 'r'); a.box(18, 24, 22, 30, 'r');
      a.box(9, 29, 15, 31, 'R'); a.box(17, 29, 23, 31, 'R');
      // 몸통
      a.box(7, 12, 24, 24, 'R'); a.box(7, 12, 24, 15, 'r'); a.box(12, 16, 19, 22, 'R');
      a.set(13, 18, 'y'); a.set(18, 18, 'y');
      // 머리
      a.disc(16, 8, 6, 'r');
      a.line(11, 5, 7, 0, 'h'); a.line(12, 4, 9, 0, 'h'); a.line(21, 5, 25, 0, 'h'); a.line(20, 4, 23, 0, 'h');
      a.set(13, 7, 'y'); a.set(19, 7, 'y');
      a.box(13, 11, 18, 12, 'k'); a.set(14, 11, 'f'); a.set(17, 11, 'f');
      // 팔
      if (attack) {
        a.box(0, 12, 8, 16, 'r'); a.box(23, 12, 31, 16, 'r');
        a.line(0, 12, 0, 9, 'h'); a.line(31, 12, 31, 9, 'h');
        a.disc(3, 14, 2.4, 'f'); a.disc(28, 14, 2.4, 'f');
      } else {
        a.box(2, 14, 7, 22, 'r'); a.box(24, 14, 29, 22, 'r');
        a.line(2, 22, 1, 26, 'h'); a.line(29, 22, 30, 26, 'h');
      }
    });
  }
  DATA.boss = entry(32, 32, BOSSPAL, [bossFrame(false), bossFrame(true)]);
  DATA.boss_attack = entry(32, 32, BOSSPAL, [bossFrame(true)]);

  // ---------- 타일 ----------
  function floorTile(seed) {
    return paint(16, 16, (a) => {
      a.box(0, 0, 15, 15, 'f');
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const hsh = (x * 31 + y * 17 + seed * 13) % 11;
        if (hsh === 0) a.set(x, y, 'd');
        else if (hsh === 1) a.set(x, y, 'l');
        else if (hsh === 2 && (x + y) % 3 === 0) a.set(x, y, 'c');
      }
    });
  }
  const FPAL = { k: '#14101c', f: '#1e2330', d: '#181c26', l: '#262c3c', c: '#2a3142' };
  DATA.floor_a = entry(16, 16, FPAL, [floorTile(1)]);
  DATA.floor_b = entry(16, 16, FPAL, [floorTile(3)]);
  DATA.floor_c = entry(16, 16, FPAL, [floorTile(5)]);
  DATA.floor_d = entry(16, 16, FPAL, [floorTile(7)]);
  const WPAL = { k: '#0e1016', f: '#262b38', m: '#14161d', t: '#3a4152', b: '#1d212c' };
  DATA.wall = entry(16, 16, WPAL, [paint(16, 16, (a) => {
    a.box(0, 0, 15, 15, 'f');
    for (const y of [4, 8, 12]) a.box(0, y, 15, y, 'm');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (y % 4 !== 3 && ((x + (y >> 2) * 3) % 8) === 7) a.set(x, y, 'm'); }
    a.box(0, 0, 15, 0, 'b'); a.box(0, 15, 15, 15, 'b'); a.box(0, 0, 0, 15, 'b'); a.box(15, 0, 15, 15, 'b');
  })]);
  DATA.wall_top = entry(16, 16, WPAL, [paint(16, 16, (a) => {
    a.box(0, 0, 15, 15, 'f');
    a.box(0, 0, 15, 5, 't');
    a.box(0, 5, 15, 5, 'm');
    for (const y of [9, 13]) a.box(0, y, 15, y, 'm');
    for (let y = 6; y < 16; y++) for (let x = 0; x < 16; x++) { if (y % 4 !== 1 && ((x + (y >> 2) * 3) % 8) === 7) a.set(x, y, 'm'); }
    a.box(0, 0, 15, 0, 'b'); a.box(0, 0, 0, 15, 'b'); a.box(15, 0, 15, 15, 'b');
  })]);
  const DPAL = { k: '#0e1016', f: '#5a4026', d: '#3a2a18', g: '#ffd24d' };
  DATA.door = entry(16, 16, DPAL, [paint(16, 16, (a) => {
    a.box(2, 1, 13, 15, 'd'); a.box(3, 2, 12, 14, 'f');
    a.set(7, 2, 'd'); a.set(8, 2, 'd'); a.box(7, 8, 8, 9, 'g');
  })]);
  const RP2 = { k: '#14101c', r: '#3a4050', l: '#4a5162' };
  DATA.rubble = entry(16, 16, RP2, [0, 1, 2].map((v) => paint(16, 16, (a) => {
    a.box(3 + v, 8 + v, 6 + v, 11 + v, 'r'); a.box(8 - v, 10 - v, 12 - v, 13 - v, 'l'); a.set(6, 6, 'r');
  })));

  // ---------- 오브젝트 ----------
  const PORTALPAL = { k: '#0a0a12', c: '#7df0ff', v: '#b48cff', w: '#eaffff', d: '#1a1030' };
  DATA.portal = entry(24, 24, PORTALPAL, [0, 1, 2, 3].map((f) => paint(24, 24, (a) => {
    a.disc(12, 12, 10, 'd');
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = x - 12, dy = y - 12, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 6 && d < 10.5) {
        const ang = (Math.atan2(dy, dx) + f * Math.PI / 2 + 6.28) % 6.28;
        a.set(x, y, ang < 2.1 ? 'c' : (ang < 4.2 ? 'v' : 'w'));
      }
    }
    a.disc(12, 12, 4.5, 'd');
    a.set(12 + (f % 2 ? 1 : -1), 12, 'w'); a.set(12, 12 + (f % 2 ? -1 : 1), 'c');
  })));
  const CPAL = { k: '#0e0a06', w: '#7a5426', d: '#54390f', g: '#ffd24d' };
  DATA.chest = entry(16, 16, CPAL, [paint(16, 16, (a) => {
    a.box(2, 7, 13, 14, 'w'); a.box(2, 4, 13, 7, 'w'); a.box(2, 6, 13, 6, 'g'); a.box(7, 8, 8, 11, 'g'); a.box(2, 4, 3, 7, 'd'); a.box(12, 4, 13, 7, 'd');
  })]);
  DATA.chest_open = entry(16, 16, CPAL, [paint(16, 16, (a) => {
    a.box(2, 8, 13, 14, 'w'); a.box(3, 9, 12, 13, 'd'); a.box(2, 2, 13, 5, 'w'); a.box(2, 5, 13, 5, 'g'); a.box(7, 9, 8, 11, 'g');
  })]);
  const POTPAL = { k: '#14101c', g: '#bfe3ff', r: '#e5484d', b: '#7a4a2a' };
  DATA.potion = entry(16, 16, POTPAL, [paint(16, 16, (a) => {
    a.box(7, 1, 8, 2, 'b'); a.box(7, 3, 8, 6, 'g'); a.box(5, 7, 10, 13, 'r'); a.box(6, 8, 7, 9, 'r'); a.set(9, 11, 'g');
  })]);
  const GPAL = { k: '#14101c', y: '#ffd24d', o: '#ff9b3d', w: '#fff6d8' };
  DATA.gold = entry(16, 16, GPAL, [
    paint(16, 16, (a) => { a.disc(8, 9, 5, 'y'); a.disc(8, 9, 3, 'o'); a.set(8, 9, 'y'); }),
    paint(16, 16, (a) => { a.disc(8, 9, 5, 'y'); a.disc(8, 9, 3, 'o'); a.set(12, 3, 'w'); a.set(3, 12, 'w'); }),
  ]);
  const GEMPAL = { k: '#14101c', c: '#6fe3ff', w: '#eaffff' };
  DATA.gem = entry(16, 16, GEMPAL, [paint(16, 16, (a) => {
    a.set(8, 2, 'c'); a.box(7, 3, 9, 4, 'c'); a.box(6, 5, 10, 8, 'c'); a.box(7, 9, 9, 11, 'c'); a.set(8, 12, 'c');
    a.set(7, 4, 'w'); a.set(7, 6, 'w');
  })]);
  const SPAL2 = { k: '#14101c', v: '#b48cff', w: '#e8dcff' };
  DATA.soul = entry(16, 16, SPAL2, [paint(16, 16, (a) => {
    a.disc(8, 7, 4.5, 'v'); a.disc(8, 7, 2.2, 'w'); a.box(6, 11, 10, 13, 'v'); a.set(7, 14, 'v'); a.set(9, 14, 'v');
  })]);

  // ---------- 아이템 아이콘 ----------
  DATA.w_sword = entry(16, 16, { k: '#14101c', w: '#e6ecf7', g: '#ffd24d', b: '#7a4a2a' }, [paint(16, 16, (a) => {
    a.line(4, 12, 12, 4, 'w'); a.line(5, 12, 13, 4, 'w'); a.line(4, 7, 8, 3, 'g'); a.line(5, 8, 9, 4, 'g'); a.line(3, 13, 5, 11, 'b');
  })]);
  DATA.w_bow = entry(16, 16, { k: '#14101c', w: '#e6ecf7', b: '#7a4a2a', s: '#d8c9a8' }, [paint(16, 16, (a) => {
    a.line(5, 2, 5, 14, 's'); a.ring(11, 8, 6, 'b'); a.line(5, 8, 14, 8, 'w'); a.line(14, 8, 11, 5, 'w'); a.line(14, 8, 11, 11, 'w'); a.line(5, 8, 7, 6, 'w'); a.line(5, 8, 7, 10, 'w');
  })]);
  DATA.w_staff = entry(16, 16, { k: '#14101c', b: '#7a4a2a', v: '#c77dff', w: '#e8dcff' }, [paint(16, 16, (a) => {
    a.line(5, 14, 10, 3, 'b'); a.line(6, 14, 11, 3, 'b'); a.disc(11, 3, 2.6, 'v'); a.set(11, 3, 'w');
  })]);
  const APAL = { k: '#14101c', m: '#8a93a5', d: '#5a6274', g: '#ffd24d' };
  DATA.i_helm = entry(16, 16, APAL, [paint(16, 16, (a) => {
    a.box(4, 4, 11, 9, 'm'); a.box(5, 3, 10, 3, 'm'); a.box(3, 9, 12, 10, 'm'); a.box(7, 4, 8, 9, 'd'); a.box(3, 9, 12, 9, 'g');
  })]);
  DATA.i_armor = entry(16, 16, APAL, [paint(16, 16, (a) => {
    a.box(4, 3, 11, 13, 'm'); a.box(4, 3, 5, 13, 'd'); a.box(10, 3, 11, 13, 'd'); a.box(6, 3, 9, 5, 'd'); a.box(7, 6, 8, 12, 'g');
  })]);
  DATA.i_ring = entry(16, 16, { k: '#14101c', y: '#ffd24d', c: '#6fe3ff' }, [paint(16, 16, (a) => {
    a.ring(8, 9, 4, 'y'); a.set(8, 3, 'c'); a.set(7, 4, 'c'); a.set(9, 4, 'c');
  })]);
  DATA.i_charm = entry(16, 16, { k: '#14101c', s: '#d8c9a8', v: '#c77dff', w: '#e8dcff' }, [paint(16, 16, (a) => {
    a.line(4, 2, 8, 7, 's'); a.line(12, 2, 8, 7, 's'); a.disc(8, 10, 3.4, 'v'); a.set(8, 9, 'w');
  })]);

  // ---------- 스킬 아이콘 ----------
  DATA.s_fireball = entry(16, 16, { k: '#14101c', o: '#ff9b3d', y: '#ffd24d', r: '#e5484d' }, [paint(16, 16, (a) => {
    a.disc(8, 9, 4.5, 'o'); a.disc(8, 9, 2.4, 'y'); a.set(7, 3, 'r'); a.set(9, 2, 'r'); a.set(8, 3, 'y');
  })]);
  DATA.s_arrow = entry(16, 16, { k: '#14101c', w: '#e6ecf7', g: '#9aa3ad' }, [paint(16, 16, (a) => {
    a.line(2, 14, 13, 3, 'w'); a.line(2, 14, 13, 3, 'w'); a.line(13, 3, 9, 3, 'w'); a.line(13, 3, 13, 7, 'w'); a.line(2, 14, 5, 11, 'g'); a.line(2, 14, 5, 14, 'g');
  })]);
  DATA.s_whirl = entry(16, 16, { k: '#14101c', w: '#ffd24d', o: '#ff9b3d' }, [paint(16, 16, (a) => {
    a.ring(8, 8, 5.5, 'w'); a.ring(8, 8, 3, 'o'); a.set(13, 5, 'w'); a.set(3, 11, 'w'); a.set(12, 12, 'o');
  })]);
  DATA.s_chain = entry(16, 16, { k: '#14101c', y: '#aee6ff', w: '#ffffff' }, [paint(16, 16, (a) => {
    a.line(3, 2, 8, 8, 'y'); a.line(8, 8, 6, 9, 'y'); a.line(6, 9, 13, 14, 'y'); a.set(4, 3, 'w'); a.set(12, 13, 'w');
  })]);
  DATA.s_poison = entry(16, 16, { k: '#14101c', g: '#8ce06a', d: '#4a8c34' }, [paint(16, 16, (a) => {
    a.disc(8, 7, 4.5, 'g'); a.box(6, 11, 10, 13, 'd'); a.set(6, 6, 'k'); a.set(10, 6, 'k'); a.set(8, 9, 'k');
  })]);
  DATA.s_frost = entry(16, 16, { k: '#14101c', c: '#aee6ff', w: '#ffffff' }, [paint(16, 16, (a) => {
    a.line(8, 2, 8, 14, 'c'); a.line(2, 8, 14, 8, 'c'); a.line(4, 4, 12, 12, 'c'); a.line(12, 4, 4, 12, 'c'); a.set(8, 8, 'w');
  })]);
  DATA.s_skeleton = entry(16, 16, { k: '#14101c', w: '#e8e4d8', r: '#3a3648' }, [paint(16, 16, (a) => {
    a.disc(8, 7, 4.2, 'w'); a.box(6, 10, 10, 12, 'w'); a.set(6, 6, 'k'); a.set(10, 6, 'k'); a.set(8, 8, 'k'); a.set(7, 11, 'r'); a.set(9, 11, 'r');
  })]);
  DATA.s_aegis = entry(16, 16, { k: '#14101c', b: '#4da3ff', w: '#9adcff', g: '#ffd24d' }, [paint(16, 16, (a) => {
    a.box(4, 3, 11, 6, 'b'); a.box(4, 7, 11, 10, 'b'); a.box(5, 11, 10, 13, 'b'); a.set(8, 14, 'b'); a.box(7, 4, 8, 11, 'w'); a.set(8, 6, 'g');
  })]);

  // ---------- UI 아이콘 ----------
  DATA.heart = entry(16, 16, { k: '#14101c', r: '#e5484d', w: '#ff9b9b' }, [paint(16, 16, (a) => {
    a.box(3, 4, 6, 7, 'r'); a.box(9, 4, 12, 7, 'r'); a.box(4, 8, 11, 10, 'r'); a.box(6, 11, 9, 12, 'r'); a.set(8, 13, 'r'); a.set(4, 5, 'w');
  })]);
  DATA.skull = entry(16, 16, { k: '#14101c', w: '#e8e4d8', e: '#14101c' }, [paint(16, 16, (a) => {
    a.disc(8, 6, 4.5, 'w'); a.box(6, 9, 10, 12, 'w'); a.set(6, 6, 'e'); a.set(10, 6, 'e'); a.set(8, 8, 'e'); a.set(7, 10, 'k'); a.set(9, 10, 'k');
  })]);
  DATA.coin = entry(16, 16, GPAL, [paint(16, 16, (a) => { a.disc(8, 8, 6, 'y'); a.disc(8, 8, 4, 'o'); a.set(8, 5, 'y'); a.set(8, 11, 'y'); a.set(6, 8, 'y'); a.set(10, 8, 'y'); })]);
  DATA.icon_settings = entry(16, 16, { k: '#14101c', m: '#8a93a5', d: '#5a6274' }, [paint(16, 16, (a) => {
    a.disc(8, 8, 4, 'm'); a.box(7, 7, 9, 9, 'k');
    for (const [x, y] of [[8, 1], [8, 14], [1, 8], [14, 8], [3, 3], [12, 3], [3, 12], [12, 12]]) a.box(x, y, x, y, 'm');
  })]);

  // ---------- 런타임 ----------
  const S = {
    ready: false,
    DATA,
    _cache: {},
    init() {
      for (const name of Object.keys(DATA)) {
        const d = DATA[name];
        d.frames.forEach((rows, f) => {
          const c = document.createElement('canvas');
          c.width = d.w; c.height = d.h;
          const x = c.getContext('2d');
          const img = x.createImageData(d.w, d.h);
          for (let y = 0; y < d.h; y++) {
            const row = rows[y] || '';
            for (let px = 0; px < d.w; px++) {
              const ch = row[px] || '.';
              const col = d.pal[ch];
              const i = (y * d.w + px) * 4;
              if (col) {
                img.data[i] = parseInt(col.slice(1, 3), 16);
                img.data[i + 1] = parseInt(col.slice(3, 5), 16);
                img.data[i + 2] = parseInt(col.slice(5, 7), 16);
                img.data[i + 3] = 255;
              }
            }
          }
          x.putImageData(img, 0, 0);
          S._cache[name + ':' + f] = c;
        });
      }
      S.ready = true;
      window.dispatchEvent(new Event('sprites-ready'));
    },
    has(name) { return !!DATA[name]; },
    get(name, frame = 0) {
      const d = DATA[name];
      const f = d ? U.clamp(frame | 0, 0, d.frames.length - 1) : 0;
      const key = name + ':' + f;
      if (!S._cache[key]) {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const x = c.getContext('2d');
        const h = U.hashStr(key);
        x.fillStyle = 'hsl(' + (h % 360) + ',55%,45%)';
        x.fillRect(1, 1, 14, 14);
        S._cache[key] = c;
      }
      return S._cache[key];
    },
    draw(ctx, name, frame, x, y, scale, opts = {}) {
      const img = S.get(name, frame);
      const w = img.width * scale, h = img.height * scale;
      ctx.save();
      ctx.translate(x, y);
      if (opts.rot) ctx.rotate(opts.rot);
      if (opts.flip) ctx.scale(-1, 1);
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
    icon(name) { return S.get(name, 0).toDataURL(); },
    names() { return Object.keys(DATA); },
  };
  window.Sprites = S;
})();

