// audio.js — WebAudio 프로시저럴 SFX + 적응형 BGM (에셋 없이 코드로 생성, 직접 작성)

(function () {

  let ctx = null, master = null, musicGain = null, sfxGain = null;

  let noiseBuf = null;

  let musicTimer = null, musicTrack = null, musicStep = 0, nextNoteT = 0, intensity = 0.5;



  function ensure() {

    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }

    try {

      const AC = window.AudioContext || window.webkitAudioContext;

      if (!AC) return false;

      ctx = new AC();

      master = ctx.createGain();

      master.gain.value = Audio.muted ? 0 : 1;

      master.connect(ctx.destination);

      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);

      musicGain = ctx.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);

      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);

      const d = noiseBuf.getChannelData(0);

      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      return true;

    } catch (e) { ctx = null; return false; }

  }



  function env(g, t0, a, peak, dur) {

    g.gain.setValueAtTime(0.0001, t0);

    g.gain.linearRampToValueAtTime(peak, t0 + a);

    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  }

  function osc(type, f0, f1, t0, dur, peak, dest) {

    const o = ctx.createOscillator(), g = ctx.createGain();

    o.type = type;

    o.frequency.setValueAtTime(Math.max(20, f0), t0);

    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);

    env(g, t0, 0.005, peak, dur);

    o.connect(g); g.connect(dest || sfxGain);

    o.start(t0); o.stop(t0 + dur + 0.05);

  }

  function noise(t0, dur, peak, filterType, f0, f1, q) {

    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;

    const flt = ctx.createBiquadFilter(); flt.type = filterType || 'lowpass'; flt.Q.value = q || 1;

    flt.frequency.setValueAtTime(f0 || 1000, t0);

    if (f1) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);

    const g = ctx.createGain();

    env(g, t0, 0.004, peak, dur);

    src.connect(flt); flt.connect(g); g.connect(sfxGain);

    src.start(t0); src.stop(t0 + dur + 0.05);

  }



  const SFX = {

    ui: (o) => osc('square', 660, 660, 0, 0.06, 0.12 * o.vol),

    error: (o) => osc('square', 160, 110, 0, 0.18, 0.16 * o.vol),

    swing: (o) => noise(0, 0.12, 0.25 * o.vol, 'bandpass', 2400, 500, 2),

    swing2: (o) => { noise(0, 0.18, 0.4 * o.vol, 'bandpass', 3200, 400, 2); osc('triangle', 220, 90, 0, 0.15, 0.2 * o.vol); },

    hit: (o) => { noise(0, 0.08, 0.4 * o.vol, 'lowpass', 900, 200); osc('sine', 160, 60, 0, 0.1, 0.35 * o.vol); },

    crit: (o) => { noise(0, 0.14, 0.5 * o.vol, 'highpass', 1800, 3000); osc('square', 1200, 300, 0, 0.16, 0.22 * o.vol); osc('sine', 320, 90, 0, 0.18, 0.3 * o.vol); },

    hurt: (o) => { osc('sawtooth', 220, 70, 0, 0.25, 0.3 * o.vol); noise(0, 0.15, 0.25 * o.vol, 'lowpass', 700, 150); },

    kill: (o) => { noise(0, 0.2, 0.4 * o.vol, 'lowpass', 1200, 100); osc('sine', 300, 50, 0, 0.22, 0.3 * o.vol); },

    explosion: (o) => { noise(0, 0.5, 0.6 * o.vol, 'lowpass', 3000, 60); osc('sine', 120, 35, 0, 0.5, 0.5 * o.vol); },

    shoot: (o) => { osc('square', 880, 220, 0, 0.12, 0.15 * o.vol); noise(0, 0.08, 0.15 * o.vol, 'highpass', 2000); },

    arrow: (o) => noise(0, 0.09, 0.3 * o.vol, 'bandpass', 3000, 900, 3),

    zap: (o) => { osc('sawtooth', 1400, 120, 0, 0.18, 0.2 * o.vol); noise(0, 0.12, 0.25 * o.vol, 'highpass', 2500); },

    nova: (o) => { osc('sine', 500, 900, 0, 0.3, 0.2 * o.vol); noise(0, 0.25, 0.2 * o.vol, 'bandpass', 1200, 2600, 2); },

    poison: (o) => { osc('sine', 300, 180, 0, 0.3, 0.15 * o.vol); noise(0, 0.3, 0.12 * o.vol, 'lowpass', 500, 200); },

    summon: (o) => { osc('triangle', 200, 400, 0, 0.25, 0.2 * o.vol); osc('triangle', 300, 600, 0.08, 0.25, 0.15 * o.vol); },

    shield: (o) => { osc('sine', 400, 800, 0, 0.3, 0.2 * o.vol); osc('sine', 600, 1200, 0.05, 0.3, 0.12 * o.vol); },

    shieldbreak: (o) => { noise(0, 0.2, 0.4 * o.vol, 'highpass', 2000, 500); osc('square', 800, 150, 0, 0.2, 0.18 * o.vol); },

    potion: (o) => { osc('sine', 300, 700, 0, 0.12, 0.15 * o.vol); osc('sine', 350, 800, 0.1, 0.12, 0.15 * o.vol); noise(0, 0.2, 0.08 * o.vol, 'lowpass', 800); },

    pickup: (o) => osc('triangle', 700, 1000, 0, 0.08, 0.15 * o.vol),

    gold: (o) => { osc('sine', 1320, 1320, 0, 0.07, 0.14 * o.vol); osc('sine', 1760, 1760, 0.06, 0.1, 0.14 * o.vol); },

    gem: (o) => osc('sine', 1560, 2093, 0, 0.14, 0.16 * o.vol),

    soul: (o) => { osc('sine', 523, 523, 0, 0.3, 0.12 * o.vol); osc('sine', 784, 784, 0.12, 0.35, 0.1 * o.vol); },

    levelup: (o) => { [523, 659, 784, 1047].forEach((f, i) => osc('square', f, f, i * 0.07, 0.16, 0.14 * o.vol)); },

    card: (o) => osc('triangle', 440, 660, 0, 0.15, 0.15 * o.vol),

    portal: (o) => { [261, 329, 392, 523].forEach((f, i) => osc('sine', f, f * 1.01, i * 0.06, 0.5, 0.12 * o.vol)); },

    boss: (o) => { osc('sawtooth', 55, 45, 0, 0.7, 0.4 * o.vol); osc('sawtooth', 58, 47, 0, 0.7, 0.3 * o.vol); noise(0, 0.6, 0.2 * o.vol, 'lowpass', 300, 60); },

    bossdie: (o) => { osc('sawtooth', 200, 30, 0, 1.0, 0.4 * o.vol); noise(0, 0.9, 0.4 * o.vol, 'lowpass', 2000, 50); },

    death: (o) => { [440, 415, 349, 261].forEach((f, i) => osc('triangle', f, f * 0.98, i * 0.22, 0.35, 0.2 * o.vol)); },

    dash: (o) => noise(0, 0.16, 0.25 * o.vol, 'bandpass', 1200, 2600, 2),

    chest: (o) => { osc('square', 220, 220, 0, 0.08, 0.15 * o.vol); osc('square', 330, 330, 0.07, 0.15, 0.15 * o.vol); osc('sine', 1320, 1760, 0.12, 0.2, 0.1 * o.vol); },

    equip: (o) => { noise(0, 0.06, 0.3 * o.vol, 'highpass', 3000); osc('square', 520, 520, 0, 0.07, 0.12 * o.vol); },

    sell: (o) => { osc('sine', 880, 660, 0, 0.12, 0.15 * o.vol); osc('sine', 660, 880, 0.1, 0.12, 0.12 * o.vol); },

    door: (o) => noise(0, 0.15, 0.2 * o.vol, 'lowpass', 500, 200),

  };



  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const TRACKS = {

    title: { bpm: 66, patterns: [

      [[0, 45, 16, 'triangle', 0.16], [0, 52, 16, 'triangle', 0.1], [0, 57, 16, 'triangle', 0.12], [0, 60, 16, 'sine', 0.14]],

      [[8, 41, 12, 'sine', 0.12], [8, 48, 12, 'sine', 0.08], [8, 53, 12, 'sine', 0.08]],

      [[16, 43, 12, 'sine', 0.12], [16, 50, 12, 'sine', 0.08], [16, 55, 12, 'sine', 0.08]],

      [[24, 45, 16, 'triangle', 0.14], [24, 52, 16, 'triangle', 0.09], [24, 57, 16, 'sine', 0.1], [24, 64, 16, 'sine', 0.08]],

    ], bass: null },

    hub: { bpm: 80, patterns: [

      [[0, 50, 6, 'triangle', 0.12], [6, 57, 6, 'triangle', 0.09], [12, 53, 6, 'triangle', 0.09], [18, 60, 6, 'triangle', 0.1]],

      [[0, 38, 18, 'sine', 0.14], [18, 36, 18, 'sine', 0.12]],

    ], bass: [[0, 26, 4, 'sine', 0.2], [8, 26, 4, 'sine', 0.2], [16, 24, 4, 'sine', 0.18], [24, 26, 4, 'sine', 0.2]] },

    dungeon: { bpm: 92, patterns: [

      [[0, 57, 4, 'square', 0.05], [4, 57, 4, 'square', 0.04], [8, 56, 4, 'square', 0.05], [12, 55, 4, 'square', 0.04], [16, 57, 4, 'square', 0.05], [20, 58, 4, 'square', 0.04], [24, 56, 4, 'square', 0.05], [28, 55, 4, 'square', 0.05]],

      [[0, 45, 30, 'sawtooth', 0.07], [16, 44, 14, 'sawtooth', 0.06]],

    ], bass: [[0, 33, 6, 'sine', 0.22], [12, 33, 6, 'sine', 0.2], [24, 31, 8, 'sine', 0.2]] },

    boss: { bpm: 140, patterns: [

      [[0, 45, 2, 'sawtooth', 0.1], [2, 45, 2, 'sawtooth', 0.1], [4, 44, 2, 'sawtooth', 0.1], [6, 45, 2, 'sawtooth', 0.1], [8, 46, 4, 'sawtooth', 0.1], [12, 45, 2, 'sawtooth', 0.1], [14, 44, 2, 'sawtooth', 0.1]],

    ], bass: [[0, 33, 1, 'square', 0.22], [1, 33, 1, 'square', 0.2], [2, 33, 1, 'square', 0.2], [3, 31, 1, 'square', 0.2], [4, 33, 1, 'square', 0.22], [5, 33, 1, 'square', 0.2], [6, 35, 1, 'square', 0.2], [7, 33, 1, 'square', 0.2]] },

  };



  function scheduleStep(track, step, t) {

    const spb = 60 / track.bpm / 2;

    for (const pat of track.patterns) {

      for (const [s, m, d, wave, vol] of pat) {

        if (s === step % 32) {

          const o = ctx.createOscillator(), g = ctx.createGain();

          o.type = wave; o.frequency.value = NOTE(m);

          env(g, t, 0.01, vol * (0.7 + intensity * 0.5), d * spb * 0.95);

          o.connect(g); g.connect(musicGain);

          o.start(t); o.stop(t + d * spb + 0.05);

        }

      }

    }

    if (track.bass) {

      for (const [s, m, d, wave, vol] of track.bass) {

        if (s === step % 32 || s === step % 8) {

          const o = ctx.createOscillator(), g = ctx.createGain();

          o.type = wave; o.frequency.value = NOTE(m);

          env(g, t, 0.005, vol * (0.8 + intensity * 0.4), d * spb * 0.95);

          o.connect(g); g.connect(musicGain);

          o.start(t); o.stop(t + d * spb + 0.05);

        }

      }

    }

    if (musicTrack === 'boss') {

      if (step % 4 === 0) {

        const o = ctx.createOscillator(), g = ctx.createGain();

        o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);

        env(g, t, 0.004, 0.3 * (0.6 + intensity * 0.4), 0.14);

        o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.2);

      }

      if (step % 2 === 1) {

        const src = ctx.createBufferSource(); src.buffer = noiseBuf;

        const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 6000;

        const g = ctx.createGain(); env(g, t, 0.002, 0.08, 0.05);

        src.connect(flt); flt.connect(g); g.connect(musicGain); src.start(t); src.stop(t + 0.06);

      }

    }

  }



  function musicTick() {

    if (!ctx || !musicTrack) return;

    const track = TRACKS[musicTrack];

    const spb = 60 / track.bpm / 2;

    while (nextNoteT < ctx.currentTime + 0.25) {

      scheduleStep(track, musicStep, nextNoteT);

      musicStep++;

      nextNoteT += spb;

    }

  }



  const Audio = {

    muted: false,

    init() { return ensure(); },

    toggleMute() {

      Audio.muted = !Audio.muted;

      if (master) master.gain.value = Audio.muted ? 0 : 1;

      if (window.G && G.save) { G.save.settings.mute = Audio.muted; if (window.Save) Save.save(); }

      return Audio.muted;

    },

    sfx(name, opts = {}) {

      if (!ensure()) return;

      const fn = SFX[name];

      if (!fn) return;

      try { fn({ vol: opts.vol !== undefined ? opts.vol : 1 }); } catch (e) { /* 臾댁떆 */ }

    },

    music: {

      start(track) {

        if (!ensure() || musicTrack === track) return;

        musicTrack = track; musicStep = 0;

        nextNoteT = ctx.currentTime + 0.05;

        if (musicTimer) clearInterval(musicTimer);

        musicTimer = setInterval(musicTick, 40);

      },

      stop() {

        musicTrack = null;

        if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }

      },

      setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },

    },

  };

  window.Audio = Audio;

})();

