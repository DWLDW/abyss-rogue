// dungeon.js — 층 procedural 생성 (방 + 복도), 타일 충돌, 미니맵 데이터
const Dungeon = {
  // 타일: 0=바닥, 1=벽
  gen(floor) {
    const W = CFG.MAP_W, H = CFG.MAP_H;
    const tiles = new Uint8Array(W * H).fill(1);
    const idx = (x, y) => y * W + x;
    const rooms = [];
    const wantRooms = U.randi(7, 9);
    let guard = 0;
    while (rooms.length < wantRooms && guard++ < 400) {
      const rw = U.randi(6, 12), rh = U.randi(6, 10);
      const rx = U.randi(2, W - rw - 3), ry = U.randi(2, H - rh - 3);
      let ok = true;
      for (const r of rooms) {
        if (rx < r.x + r.w + 1 && rx + rw + 1 > r.x && ry < r.y + r.h + 1 && ry + rh + 1 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), explored: false, chest: false };
      rooms.push(room);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) tiles[idx(x, y)] = 0;
    }
    // 방 중심을 순서대로 L자 복도로 연결
    const order = rooms.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = U.randi(0, i); const t = order[i]; order[i] = order[j]; order[j] = t; }
    const carveH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { tiles[idx(x, y)] = 0; if (y + 1 < H) tiles[idx(x, y + 1)] = 0; } };
    const carveV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { tiles[idx(x, y)] = 0; if (x + 1 < W) tiles[idx(x + 1, y)] = 0; } };
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1], b = order[i];
      if (U.chance(0.5)) { carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx); }
      else { carveV(a.cy, b.cy, a.cx); carveH(a.cx, b.cx, b.cy); }
    }
    // 시작방 = 첫 방, 보스방 = 가장 큰 방
    const start = rooms[0];
    start.explored = true;
    let bossRoom = null;
    if (CFG.isBossFloor(floor)) {
      bossRoom = rooms.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
      if (bossRoom === start) bossRoom = rooms[1] || start;
    }
    // 장식 (부서진 돌 등)
    const decor = [];
    for (let i = 0; i < 130; i++) {
      const x = U.randi(1, W - 2), y = U.randi(1, H - 2);
      if (tiles[idx(x, y)] === 0) decor.push({ x, y, v: U.randi(0, 2) });
    }
    // 상자: 시작방 제외 일부 방
    for (const r of rooms) {
      if (r !== start && r !== bossRoom && U.chance(0.28)) r.chest = true;
    }
    return {
      floor, W, H, tiles, rooms, start, bossRoom, decor,
      spawn: { x: (start.cx + 0.5) * CFG.TILE, y: (start.cy + 0.5) * CFG.TILE },
      portal: { x: (start.cx + 0.5) * CFG.TILE, y: (start.cy + 0.5) * CFG.TILE, active: false, anim: 0 },
      chests: rooms.filter((r) => r.chest).map((r) => ({ x: (r.cx + 0.5) * CFG.TILE, y: (r.cy + 0.5) * CFG.TILE, opened: false })),
      alive: 0,
    };
  },

  tileAt(d, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H) return 1;
    return d.tiles[ty * d.W + tx];
  },
  isWallPx(d, x, y) { return Dungeon.tileAt(d, Math.floor(x / CFG.TILE), Math.floor(y / CFG.TILE)) === 1; },

  // 원 vs 타일 충돌: x축, y축 분리 이동으로 민과
  move(d, e, dx, dy) {
    const r = e.r;
    if (!Dungeon.hitWall(d, e.x + dx, e.y, r)) e.x += dx;
    if (!Dungeon.hitWall(d, e.x, e.y + dy, r)) e.y += dy;
  },
  hitWall(d, x, y, r) {
    const x0 = Math.floor((x - r) / CFG.TILE), x1 = Math.floor((x + r) / CFG.TILE);
    const y0 = Math.floor((y - r) / CFG.TILE), y1 = Math.floor((y + r) / CFG.TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (Dungeon.tileAt(d, tx, ty) === 1) {
        const nx = U.clamp(x, tx * CFG.TILE, tx * CFG.TILE + CFG.TILE);
        const ny = U.clamp(y, ty * CFG.TILE, ty * CFG.TILE + CFG.TILE);
        if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
      }
    }
    return false;
  },

  roomAt(d, x, y) {
    const tx = Math.floor(x / CFG.TILE), ty = Math.floor(y / CFG.TILE);
    for (const r of d.rooms) if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r;
    return null;
  },

  // 안개: 방 단위로 방문 시 방문 표시
  reveal(d, x, y) {
    const r = Dungeon.roomAt(d, x, y);
    if (r) r.explored = true;
    return r;
  },

  // 목표 방향에서 출발해 충돌 없는 가장 가까운 방향을 고른다 (벽 슬라이드 길찾기)
  pickDir(d, x, y, r, baseAng) {
    const offs = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3, 3.14];
    let best = baseAng, bestScore = -1e9;
    for (const o of offs) {
      const a = baseAng + o;
      if (!Dungeon.hitWall(d, x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), r)) {
        const score = -Math.abs(o);
        if (score > bestScore) { bestScore = score; best = a; }
      }
    }
    return best;
  },

  // BFS 플로우 필드: (sx,sy)에서 출발해 모든 바닥 타일까지의 거리. field 이름으로 여러 개 저장 가능
  computeFlow(d, sx, sy, field = 'flow') {
    const W = d.W, H = d.H;
    if (!d[field]) d[field] = new Int32Array(W * H);
    const f = d[field];
    f.fill(-1);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H || d.tiles[sy * W + sx] === 1) return f;
    const q = new Int32Array(W * H);
    let head = 0, tail = 0;
    const s = sy * W + sx;
    f[s] = 0; q[tail++] = s;
    while (head < tail) {
      const c = q[head++];
      const cx = c % W, cy = (c / W) | 0;
      const nd = f[c] + 1;
      if (cx > 0 && d.tiles[c - 1] === 0 && f[c - 1] < 0) { f[c - 1] = nd; q[tail++] = c - 1; }
      if (cx < W - 1 && d.tiles[c + 1] === 0 && f[c + 1] < 0) { f[c + 1] = nd; q[tail++] = c + 1; }
      if (cy > 0 && d.tiles[c - W] === 0 && f[c - W] < 0) { f[c - W] = nd; q[tail++] = c - W; }
      if (cy < H - 1 && d.tiles[c + W] === 0 && f[c + W] < 0) { f[c + W] = nd; q[tail++] = c + W; }
    }
    return f;
  },

  // 플로우 필드를 따라 가장 가까운 이웃 타일 중심 방향 (field 기본 'flow')
  flowAngle(d, x, y, field = 'flow') {
    const W = d.W, T = CFG.TILE;
    const f = d[field];
    if (!f) return null;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H) return null;
    const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    let best = -1, bdx = 0, bdy = 0;
    for (let i = 0; i < 4; i++) {
      const nx = tx + DX[i], ny = ty + DY[i];
      if (nx < 0 || ny < 0 || nx >= d.W || ny >= d.H) continue;
      const v = f[ny * W + nx];
      if (v >= 0 && (best < 0 || v < best)) { best = v; bdx = DX[i]; bdy = DY[i]; }
    }
    if (best < 0) return null;
    // 이웃 타일 중심을 향한 각도 (부드러운 이동)
    return Math.atan2((ty + bdy + 0.5) * T - y, (tx + bdx + 0.5) * T - x);
  },

  draw(ctx, d, cam) {
    const T = CFG.TILE;
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const x1 = Math.min(d.W - 1, Math.ceil((cam.x + G.W) / T) + 1), y1 = Math.min(d.H - 1, Math.ceil((cam.y + G.H) / T) + 1);
    const floors = ['floor_a', 'floor_b', 'floor_c', 'floor_d'];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = d.tiles[ty * d.W + tx];
      const px = tx * T - cam.x, py = ty * T - cam.y;
      if (t === 0) {
        const v = floors[(tx * 7 + ty * 13 + ((tx * tx + ty) % 5)) % 4];
        ctx.drawImage(Sprites.get(v, 0), px, py, T, T);
      } else {
        // 벽: 아래에 바닥이 보이면 top 면
        const below = ty + 1 <= y1 ? d.tiles[Math.min(d.H - 1, ty + 1) * d.W + tx] : 1;
        if (below === 0) ctx.drawImage(Sprites.get('wall_top', 0), px, py, T, T);
        else ctx.drawImage(Sprites.get('wall', 0), px, py, T, T);
      }
    }
    // 장식
    for (const dec of d.decor) {
      const px = dec.x * T - cam.x, py = dec.y * T - cam.y;
      if (px < -T || py < -T || px > G.W + T || py > G.H + T) continue;
      if (U.hashStr(dec.x + ',' + dec.y) % 3 === 0) continue;
      ctx.drawImage(Sprites.get('rubble', dec.v), px + 6, py + 6, 20, 20);
    }
  },
};
window.Dungeon = Dungeon;
