// ui.js — DOM 기반 화면(타이틀/거점/HUD/레벨업/일시정지/사망/도움말), 툴팁, 토스트
const UI = {
  els: {},
  skillKey: '',
  offers: null,
  helpFrom: 'title',
  streakTimer: 0,
  bannerTimer: 0,

  SCREENS: ['screen-title', 'screen-hub', 'screen-help', 'screen-levelup', 'screen-pause', 'screen-death'],

  init() {
    UI.buildHUD();
    UI.bindGlobal();
    window.addEventListener('sprites-ready', () => UI.refreshIcons());
    window.addEventListener('mousemove', (e) => UI.moveTooltip(e.clientX, e.clientY));
  },

  refreshIcons() {
    document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = Sprites.icon(img.dataset.icon); });
  },

  showOnly(id) {
    for (const s of UI.SCREENS) U.$(s).classList.toggle('hidden', s !== id);
    if (!id) UI.SCREENS.forEach((s) => U.$(s).classList.add('hidden'));
  },
  setHUD(v) { U.$('hud').classList.toggle('hidden', !v); },

  bindGlobal() {
    // 툴팁 내 버튼 (장착/해제/판매)
    U.$('tooltip').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const uid = +b.dataset.uid, act = b.dataset.act;
      const s = G.save;
      const item = s.inv.find((i) => i.uid === uid) || CFG.SLOTS.map((sl) => s.equip[sl]).find((i) => i && i.uid === uid);
      if (!item) return;
      if (act === 'equip') {
        const slot = item.slot;
        const old = s.equip[slot];
        s.inv = s.inv.filter((i) => i.uid !== uid);
        if (old) { if (s.inv.length < 24) s.inv.push(old); else s.gold += old.value; }
        s.equip[slot] = item;
        Audio.sfx('equip');
        UI.toast('장착: ' + item.name, 'good');
      } else if (act === 'unequip') {
        if (s.inv.length < 24) { s.inv.push(item); s.equip[item.slot] = null; Audio.sfx('ui'); }
        else UI.toast('인벤토리가 가득 찼습니다', 'bad');
      } else if (act === 'sell') {
        s.inv = s.inv.filter((i) => i.uid !== uid);
        if (s.equip[item.slot] && s.equip[item.slot].uid === uid) s.equip[item.slot] = null;
        s.gold += item.value;
        Audio.sfx('sell');
        UI.toast('판매: +' + U.fmt(item.value) + ' 골드', 'gold');
      }
      Save.save();
      UI.hideTip();
      UI.renderHub();
    });
  },

  // ---------------- 타이틀 ----------------
  renderTitle() {
    const s = G.save;
    const el = U.$('screen-title');
    el.innerHTML = `
      <div class="logo">심연의 낙인</div>
      <div class="logo-sub">ABYSS ROGUE — 무한 심연 파밍 로그라이트</div>
      <div class="menu">
        <button class="btn btn-primary" id="bt-go">${s.bestFloor > 0 ? '거점으로 — 최고 ' + s.bestFloor + '층' : '모험 시작'}</button>
        <button class="btn" id="bt-demo">자동 전투 데모</button>
        <button class="btn" id="bt-help">도움말</button>
        <button class="btn" id="bt-mute">${Audio.muted ? '🔇 소리 켜기' : '🔊 음소거'}</button>
        ${s.totalRuns > 0 ? '<button class="btn btn-danger" id="bt-reset">새 게임 (모든 기록 초기화)</button>' : ''}
      </div>
      <div class="ver">abyss-rogue v0.1 · Made with Mixdog</div>`;
    U.$('bt-go').onclick = () => { Audio.sfx('ui'); Main.toHub(); };
    U.$('bt-demo').onclick = () => { Audio.sfx('ui'); Main.startRun(true); };
    U.$('bt-help').onclick = () => { Audio.sfx('ui'); UI.helpFrom = 'title'; UI.renderHelp(); UI.showOnly('screen-help'); G.state = 'help'; };
    U.$('bt-mute').onclick = () => { const m = Audio.toggleMute(); U.$('bt-mute').textContent = m ? '🔇 소리 켜기' : '🔊 음소거'; };
    const rst = U.$('bt-reset');
    if (rst) rst.onclick = () => {
      if (rst.dataset.arm) { Save.reset(); Audio.sfx('death'); UI.renderTitle(); UI.toast('모든 기록이 초기화되었습니다', 'bad'); }
      else { rst.dataset.arm = '1'; rst.textContent = '정말 초기화할까요? 한 번 더 클릭'; setTimeout(() => { if (rst) { delete rst.dataset.arm; rst.textContent = '새 게임 (모든 기록 초기화)'; } }, 3000); }
    };
  },

  // ---------------- 도움말 ----------------
  renderHelp() {
    const el = U.$('screen-help');
    el.innerHTML = `
      <div class="panel overlay-box" style="max-width:640px">
        <h2 style="color:var(--gold)">도움말</h2>
        <div class="help-list">
          <div><span class="kbd">W A S D</span> 이동 &nbsp; <span class="kbd">마우스</span> 조준</div>
          <div><span class="kbd">좌클릭</span> (길게) 무기 공격 — 검은 3연격 콤보</div>
          <div><span class="kbd">Space</span> / <span class="kbd">우클릭</span> 회피 구르기 (무적)</div>
          <div><span class="kbd">H</span> / <span class="kbd">5</span> 포션 사용 &nbsp; <span class="kbd">Esc</span> 일시정지 &nbsp; <span class="kbd">M</span> 음소거</div>
          <div style="margin-top:10px">· 심연을 헤치고 <b>모든 적을 처치</b>하면 시작 지점에 <b>포탈</b>이 열립니다.</div>
          <div>· 포탈로 <b>다음 층</b> — 끝이 없습니다. 5층마다 <b>보스</b>.</div>
          <div>· 적이 떨어뜨린 <b>경험치/골드/영혼/장비</b>를 줍고, 레벨업 시 <b>3중 1 선택</b>으로 스킬과 능력을 육성하세요.</div>
          <div>·사망 시 장비는 잃지만 <b>영혼과 골드</b>는 거점에 보관됩니다. 거점에서 <b>영구 업그레이드</b>와 장비 정비 후 다시 도전!</div>
          <div>· <b>관문</b> 업그레이드로 더 깊은 층부터 시작할 수 있습니다.</div>
        </div>
        <div class="btns"><button class="btn btn-primary" id="bt-help-back">돌아가기</button></div>
      </div>`;
    U.$('bt-help-back').onclick = () => {
      Audio.sfx('ui');
      if (UI.helpFrom === 'hub') Main.toHub();
      else if (UI.helpFrom === 'pause') { G.state = 'pause'; UI.renderPause(); UI.showOnly('screen-pause'); }
      else Main.showTitle();
    };
  },

  // ---------------- 거점 허브 ----------------
  renderHub() {
    const s = G.save;
    const el = U.$('screen-hub');
    const shop = CFG.META.map((u) => {
      const lv = s.upgrades[u.id] || 0;
      const maxed = lv >= u.max;
      const cost = CFG.metaCost(u, lv + 1);
      const pips = Array.from({ length: u.max }, (_, i) => `<span class="pip ${i < lv ? 'on' : ''}"></span>`).join('');
      return `<div class="shop-row">
        <div class="nm">${u.name}<small>${u.desc}</small></div>
        <div class="pips">${pips}</div>
        <button class="btn small" data-buy="${u.id}" ${maxed || s.soul < cost ? 'disabled' : ''}>${maxed ? 'MAX' : U.fmt(cost) + ' 영혼'}</button>
      </div>`;
    }).join('');

    const slots = CFG.SLOTS.map((sl) => {
      const it = s.equip[sl];
      const icon = it ? Items.iconOf(it) : CFG.SLOT_ICON[sl];
      return `<div class="slot ${it ? 'filled' : ''}" data-slot="${sl}" data-uid="${it ? it.uid : ''}" style="${it ? 'border-color:' + CFG.RARITY[it.rarity].color : ''}">
        <img data-icon="${icon}" src="${Sprites.icon(icon)}"><span class="lbl">${CFG.SLOT_NAME[sl]}</span>
      </div>`;
    }).join('');

    const tp = { equip: s.equip, maxhp: 0, hp: 1 };
    Player.recalc(tp);
    const pw = Player.power(tp);
    const stats = [
      ['최대 체력', tp.maxhp], ['공격력', U.fmt(pw)], ['치명타', tp.critCh + '% / x' + (tp.critMult / 100).toFixed(1)],
      ['방어력', tp.armor], ['이동 속도', U.fmt(tp.moveSpd)], ['흡혈', tp.ls + '%'],
      ['행운', tp.luck], ['경험치 +', ((tp.xpMult - 1) * 100).toFixed(0) + '%'], ['골드 +', ((tp.goldMult - 1) * 100).toFixed(0) + '%'],
    ].map(([k, v]) => `<div>${k}<span class="v">${v}</span></div>`).join('');

    const invCells = [];
    for (let i = 0; i < 24; i++) {
      const it = s.inv[i];
      invCells.push(it
        ? `<div class="inv-cell" data-uid="${it.uid}" style="border-color:${CFG.RARITY[it.rarity].color}" title=""><img data-icon="${Items.iconOf(it)}" src="${Sprites.icon(Items.iconOf(it))}"></div>`
        : '<div class="inv-cell"></div>');
    }

    el.innerHTML = `
      <div class="hub-head panel">
        <div class="logo">심연의 낙인</div>
        <div class="res">
          <span class="gold">골드<b>${U.fmt(s.gold)}</b></span>
          <span class="soul">영혼<b>${U.fmt(s.soul)}</b></span>
          <span class="best">최고 깊이<b>${s.bestFloor}층</b></span>
          <span>처치<b>${U.fmt(s.totalKills)}</b></span>
        </div>
        <div style="flex:1"></div>
        <button class="btn small" id="hub-help">도움말</button>
        <button class="btn small" id="hub-mute">${Audio.muted ? '🔇' : '🔊'}</button>
        <button class="btn small btn-danger" id="hub-title">타이틀</button>
      </div>
      <div class="hub-body">
        <div class="panel hub-col"><h3>영혼 업그레이드 (영구 육성)</h3>${shop}</div>
        <div class="panel hub-col">
          <h3>장비</h3>
          <div class="equip-slots">${slots}</div>
          <h3>스탯</h3>
          <div class="stat-grid">${stats}</div>
        </div>
        <div class="panel hub-col">
          <h3>인벤토리 (${s.inv.length}/24)</h3>
          <div class="inv-grid">${invCells.join('')}</div>
        </div>
      </div>
      <div class="hub-foot panel">
        <span class="hint">포션 재고: <b style="color:#6fdc8c">${s.potionsStock}</b>개 · 구매 25골드</span>
        <button class="btn small" id="hub-potion" ${s.gold < 25 || s.potionsStock >= 5 ? 'disabled' : ''}>포션 구매</button>
        <span class="hint">입장 시작 층: <b style="color:var(--soul)">${CFG.startFloor()}층</b></span>
        <button class="btn btn-primary" id="hub-enter">⚔ 던전 입장 (${CFG.startFloor()}층부터)</button>
      </div>`;

    // 이벤트 바인딩
    el.querySelectorAll('[data-buy]').forEach((b) => {
      b.onclick = () => {
        const u = CFG.META.find((x) => x.id === b.dataset.buy);
        const lv = s.upgrades[u.id] || 0;
        const cost = CFG.metaCost(u, lv + 1);
        if (lv >= u.max || s.soul < cost) { Audio.sfx('error'); return; }
        s.soul -= cost; s.upgrades[u.id] = lv + 1;
        Save.save(); Audio.sfx('soul', { rate: 0.8 }); Audio.sfx('equip');
        UI.toast(u.name + ' 업그레이드! (Lv ' + (lv + 1) + ')', 'good');
        UI.renderHub();
      };
    });
    U.$('hub-potion').onclick = () => {
      if (s.gold >= 25 && s.potionsStock < 5) { s.gold -= 25; s.potionsStock++; Save.save(); Audio.sfx('gold'); UI.renderHub(); }
    };
    U.$('hub-enter').onclick = () => { Audio.sfx('portal'); Main.startRun(false); };
    U.$('hub-help').onclick = () => { UI.helpFrom = 'hub'; G.state = 'help'; UI.renderHelp(); UI.showOnly('screen-help'); };
    U.$('hub-mute').onclick = () => { Audio.toggleMute(); UI.renderHub(); };
    U.$('hub-title').onclick = () => { Save.save(); Main.showTitle(); };

    // 아이템 툴팁 (마우스오버)
    el.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.inv-cell[data-uid], .slot[data-uid]');
      if (!cell || !cell.dataset.uid) return;
      const uid = +cell.dataset.uid;
      const item = s.inv.find((i) => i.uid === uid) || CFG.SLOTS.map((sl) => s.equip[sl]).find((i) => i && i.uid === uid);
      if (!item) return;
      const inSlot = !!cell.dataset.slot;
      const btns = inSlot
        ? `<button class="btn small" data-act="unequip" data-uid="${uid}">해제</button><button class="btn small btn-danger" data-act="sell" data-uid="${uid}">판매</button>`
        : `<button class="btn small" data-act="equip" data-uid="${uid}">장착</button><button class="btn small btn-danger" data-act="sell" data-uid="${uid}">판매</button>`;
      UI.showTip(Items.tooltip(item) + `<div class="tbtns">${btns}</div>`, e.clientX, e.clientY);
    });
    el.addEventListener('mouseout', (e) => {
      if (e.target.closest('.inv-cell[data-uid], .slot[data-uid]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#tooltip'))) UI.hideTip();
    });
  },

  // ---------------- HUD ----------------
  buildHUD() {
    const hud = U.$('hud');
    hud.innerHTML = `
      <div class="hud-tl">
        <div class="bar" id="hpbar"><div class="fill"></div><div class="txt"></div></div>
        <div class="bar" id="shbar"><div class="fill"></div></div>
        <div id="potion-row"><img data-icon="potion" src="${Sprites.icon('potion')}"><span id="potion-num"></span><span style="color:#5a6274">[H] 포션</span></div>
      </div>
      <div class="hud-tc">
        <div class="bar" id="xpbar"><div class="fill"></div><div class="txt"></div></div>
        <div id="lvllbl"></div>
        <div id="bossbar-wrap"><div class="bname" id="bossname"></div>
          <div class="bar" id="bossbar"><div class="fill"></div><div class="txt"></div></div></div>
      </div>
      <div class="hud-tr">
        <div class="row" id="hud-floor"></div>
        <div class="row"><span id="hud-time"></span> · 처치 <b id="hud-kills"></b></div>
        <div class="row"><span class="gold">⛁ <span id="hud-gold"></span></span> · <span class="soul">✦ <span id="hud-soul"></span></span></div>
        <canvas id="minimap" width="140" height="140"></canvas>
      </div>
      <div class="hud-bl">
        <div id="weapon-icon"><img id="weapon-img" data-icon="w_sword" src="${Sprites.icon('w_sword')}"></div>
        <div id="combo"></div>
      </div>
      <div class="hud-bc" id="skills"></div>
      <div id="streak"></div>
      <div id="floor-banner"><div class="big"></div><div class="sub"></div></div>`;
    UI.els = {
      hpFill: U.$('hpbar').querySelector('.fill'), hpTxt: U.$('hpbar').querySelector('.txt'),
      shbar: U.$('shbar'), shFill: U.$('shbar').querySelector('.fill'),
      potionNum: U.$('potion-num'),
      xpFill: U.$('xpbar').querySelector('.fill'), xpTxt: U.$('xpbar').querySelector('.txt'),
      lvl: U.$('lvllbl'),
      bossWrap: U.$('bossbar-wrap'), bossName: U.$('bossname'), bossFill: U.$('bossbar').querySelector('.fill'), bossTxt: U.$('bossbar').querySelector('.txt'),
      floor: U.$('hud-floor'), time: U.$('hud-time'), kills: U.$('hud-kills'), gold: U.$('hud-gold'), soul: U.$('hud-soul'),
      minimap: U.$('minimap'),
      weaponImg: U.$('weapon-img'), combo: U.$('combo'),
      skills: U.$('skills'), streak: U.$('streak'), banner: U.$('floor-banner'),
    };
  },

  updateHUD() {
    const run = G.run;
    if (!run || !run.player) return;
    const p = run.player, E = UI.els;
    E.hpFill.style.transform = `scaleX(${U.clamp(p.hp / p.maxhp, 0, 1)})`;
    E.hpTxt.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxhp)}`;
    if (p.shield > 0) {
      E.shbar.style.display = 'block';
      E.shFill.style.transform = `scaleX(${U.clamp(p.shield / p.shieldMax, 0, 1)})`;
    } else E.shbar.style.display = 'none';
    E.potionNum.textContent = 'x' + run.potions + ' / ' + run.potionMax;
    const need = CFG.XP_NEED(run.level);
    E.xpFill.style.transform = `scaleX(${U.clamp(run.xp / need, 0, 1)})`;
    E.xpTxt.textContent = '';
    E.lvl.textContent = 'Lv ' + run.level + ' · 경험치 ' + Math.floor(run.xp) + ' / ' + need;
    E.floor.textContent = 'B' + run.floor + 'F — ' + (CFG.isBossFloor(run.floor) ? '보스 층' : '심연');
    const t = Math.floor(run.time);
    E.time.textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    E.kills.textContent = run.kills;
    E.gold.textContent = U.fmt(run.gold);
    E.soul.textContent = U.fmt(run.soul);
    // 무기
    if (p.weapon) { const ic = Items.iconOf(p.weapon); if (E.weaponImg.dataset.icon !== ic) { E.weaponImg.dataset.icon = ic; E.weaponImg.src = Sprites.icon(ic); } }
    // 콤보
    if (p.comboN >= 2) { E.combo.style.display = 'block'; E.combo.textContent = p.comboN + ' HIT'; }
    else E.combo.style.display = 'none';
    // 스킬 슬롯
    const key = SkillSys.list.map((s) => s.id + ':' + s.lv).join('|');
    if (key !== UI.skillKey) {
      UI.skillKey = key;
      E.skills.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const s = SkillSys.list[i];
        const d = U.el('div', 'skill-slot' + (s ? '' : ' empty'));
        if (s) {
          const def = SKILLS[s.id];
          d.innerHTML = `<img src="${Sprites.icon(def.icon)}" title="${def.name}"><div class="cd"></div><div class="lv">${s.lv}</div>`;
        }
        E.skills.appendChild(d);
      }
    }
    const kids = E.skills.children;
    for (let i = 0; i < SkillSys.list.length && i < 4; i++) {
      const s = SkillSys.list[i];
      const cdEl = kids[i] && kids[i].querySelector('.cd');
      if (cdEl) cdEl.style.height = (U.clamp(s.cdLeft / SKILLS[s.id].cd[s.lv - 1], 0, 1) * 100) + '%';
    }
    // 보스 바
    const boss = run.enemies.find((e) => e.boss && !e.dead);
    if (boss) {
      E.bossWrap.style.display = 'block';
      E.bossName.textContent = boss.name;
      E.bossFill.style.transform = `scaleX(${U.clamp(boss.hp / boss.maxhp, 0, 1)})`;
      E.bossTxt.textContent = U.fmt(boss.hp) + ' / ' + U.fmt(boss.maxhp);
    } else E.bossWrap.style.display = 'none';
    UI.minimap();
  },

  minimap() {
    const run = G.run; if (!run || !run.dungeon) return;
    const cv = UI.els.minimap, ctx = cv.getContext('2d');
    const d = run.dungeon, s = cv.width / d.W;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const r of d.rooms) {
      if (!r.explored) continue;
      ctx.fillStyle = 'rgba(96,116,168,0.55)';
      ctx.fillRect(r.x * s, r.y * s, Math.max(2, r.w * s), Math.max(2, r.h * s));
    }
    ctx.fillStyle = '#8a6d3b';
    for (const c of d.chests) if (!c.opened) { const r = Dungeon.roomAt(d, c.x, c.y); if (r && r.explored) ctx.fillRect(c.x / CFG.TILE * s - 1, c.y / CFG.TILE * s - 1, 3, 3); }
    if (d.portal.active) {
      ctx.fillStyle = '#b48cff';
      const pul = 2 + Math.sin(G.time * 6) * 1;
      ctx.fillRect(d.portal.x / CFG.TILE * s - pul / 2, d.portal.y / CFG.TILE * s - pul / 2, pul, pul);
    }
    ctx.fillStyle = 'rgba(255,90,80,0.9)';
    for (const e of run.enemies) {
      if (e.dead) continue;
      const r = Dungeon.roomAt(d, e.x, e.y);
      if (r && r.explored) ctx.fillRect(e.x / CFG.TILE * s - 1, e.y / CFG.TILE * s - 1, e.boss ? 4 : 2, e.boss ? 4 : 2);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(run.player.x / CFG.TILE * s - 1.5, run.player.y / CFG.TILE * s - 1.5, 3, 3);
  },

  // ---------------- 레벨업 ----------------
  showLevelup(offers) {
    UI.offers = offers;
    const el = U.$('screen-levelup');
    el.innerHTML = `<h2>레벨 업! Lv ${G.run.level}</h2><div style="color:var(--dim);font-size:13px">셋 중 하나를 선택하세요</div><div id="cards"></div>`;
    const c = U.$('cards');
    offers.forEach((o, i) => {
      const d = SkillSys.describe(o);
      const card = U.el('div', 'card', `
        <div class="kind">${d.kind === 'SKILL' ? '스킬' : '능력'}</div>
        <img data-icon="${d.icon}" src="${Sprites.icon(d.icon)}">
        <div class="cname">${d.name}</div>
        <div class="cdesc">${d.desc}</div>
        <div class="clv">${d.lvTxt}</div>`);
      card.onclick = () => UI.pickCard(i);
      c.appendChild(card);
    });
    UI.showOnly('screen-levelup');
  },

  pickCard(i) {
    const o = UI.offers && UI.offers[i];
    if (!o || G.state !== 'levelup') return;
    SkillSys.apply(o);
    G.run.pendingLevels--;
    if (G.run.pendingLevels > 0) UI.showLevelup(SkillSys.offers());
    else { G.state = 'run'; UI.showOnly(null); Audio.sfx('ui'); }
  },

  // ---------------- 일시정지 / 사망 ----------------
  renderPause() {
    const el = U.$('screen-pause');
    el.innerHTML = `
      <div class="panel overlay-box">
        <h2 style="color:#fff">일시정지</h2>
        <div class="btns">
          <button class="btn btn-primary" id="p-resume">계속하기</button>
          <button class="btn" id="p-mute">${Audio.muted ? '🔇 소리 켜기' : '🔊 음소거'}</button>
          <button class="btn" id="p-help">도움말</button>
          <button class="btn btn-danger" id="p-retreat">거점으로 귀환 (전리품 보관)</button>
        </div>
      </div>`;
    U.$('p-resume').onclick = () => { G.state = 'run'; UI.showOnly(null); Audio.sfx('ui'); };
    U.$('p-mute').onclick = () => { Audio.toggleMute(); UI.renderPause(); };
    U.$('p-help').onclick = () => { UI.helpFrom = 'pause'; G.state = 'help'; UI.renderHelp(); UI.showOnly('screen-help'); };
    U.$('p-retreat').onclick = () => { Audio.sfx('portal'); Main.retreat(); };
  },

  renderDeath(r) {
    const el = U.$('screen-death');
    el.className = 'screen death';
    const t = Math.floor(r.time);
    el.innerHTML = `
      <div class="panel overlay-box">
        <h2>사 망</h2>
        <div style="color:var(--dim)">${r.newBest ? '<b style="color:var(--gold)">★ 신기록! 심연 ' + r.floor + '층 달성 ★</b>' : '심연 ' + r.floor + '층에서 전사'}</div>
        <div class="result-grid">
          <span>도달 층</span><span class="v">${r.floor}층</span>
          <span>처치</span><span class="v">${r.kills}</span>
          <span>레벨</span><span class="v">Lv ${r.level}</span>
          <span>플레이 시간</span><span class="v">${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}</span>
          <span>획득 골드</span><span class="v" style="color:var(--gold)">+${U.fmt(r.gold)}</span>
          <span>획득 영혼</span><span class="v" style="color:var(--soul)">+${U.fmt(r.soul)}</span>
        </div>
        <div style="color:#7a8296;font-size:12px">장비는 잃었지만, 영혼과 골드는 거점에 보관되었습니다.</div>
        <div class="btns"><button class="btn btn-primary" id="d-hub">거점으로 돌아가기</button></div>
      </div>`;
    U.$('d-hub').onclick = () => { Audio.sfx('ui'); Main.toHub(); };
  },

  // ---------------- 토스트/배너/툴팁 ----------------
  toast(msg, cls = '') {
    const box = U.$('toasts');
    const t = U.el('div', 'toast ' + cls, msg);
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 2000);
  },

  streak(text) {
    const el = UI.els.streak || U.$('streak');
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(UI.streakTimer);
    UI.streakTimer = setTimeout(() => { el.style.opacity = '0'; }, 1100);
  },

  floorBanner(big, sub) {
    const b = UI.els.banner || U.$('floor-banner');
    b.querySelector('.big').textContent = big;
    b.querySelector('.sub').textContent = sub;
    b.style.transition = 'none'; b.style.opacity = '1';
    clearTimeout(UI.bannerTimer);
    UI.bannerTimer = setTimeout(() => { b.style.transition = 'opacity 1s'; b.style.opacity = '0'; }, 1600);
  },

  showTip(html, x, y) {
    const t = U.$('tooltip');
    t.innerHTML = html;
    t.classList.remove('hidden');
    UI.tipPos = { x, y };
    UI.placeTip();
  },
  hideTip() { U.$('tooltip').classList.add('hidden'); },
  moveTooltip(x, y) {
    const t = U.$('tooltip');
    if (t.classList.contains('hidden')) return;
    UI.tipPos = { x, y };
    UI.placeTip();
  },
  placeTip() {
    const t = U.$('tooltip');
    if (!UI.tipPos) return;
    const r = t.getBoundingClientRect();
    let px = UI.tipPos.x + 18, py = UI.tipPos.y + 14;
    if (px + r.width > window.innerWidth - 8) px = UI.tipPos.x - r.width - 12;
    if (py + r.height > window.innerHeight - 8) py = window.innerHeight - r.height - 8;
    t.style.left = px + 'px'; t.style.top = py + 'px';
  },
};
window.UI = UI;
