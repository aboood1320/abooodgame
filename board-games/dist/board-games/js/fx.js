/* ==========================================================================
   ألعاب الطاولة — المؤثرات البصرية والصوتية
   أصوات مرخّصة CC0 من Kenney + خطّة بديلة مولّدة عبر Web Audio
   وحركات احترافية: توزيع، قلب، نرد، تحريك القطع، شاشات النتائج
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;

  const STORE_KEY = "fx.v1";
  const isLite = () => document.documentElement.classList.contains("lite");
  const DEFAULTS = { sound: true, volume: 0.55, motion: true, pack: "classic", music: false, musicVolume: 0.5 };
  const ASSET_BASE = "vendor/kenney/audio/";
  const MASTER_TRIM = 0.9;
  const MAX_VOICES = 26;

  /* فاصل زمني لكل مؤثر: يمنع تراكم النقرات المزدوجة ويبقي المزيج نظيفًا */
  const THROTTLE_MS = {
    click: 70, select: 60, toggle: 60, tick: 110,
    card: 50, draw: 50, deal: 50, flip: 50,
    move: 45, place: 50, meeple: 50, tile: 50,
    point: 50, score: 65, coin: 50, step: 70,
    turn: 140, pass: 120, reveal: 120, unlock: 120,
    join: 140, leave: 140, error: 150, win: 200, lose: 200, yourturn: 400,
  };

  /* أصوات اللعب التي يجب أن يسمعها كل من في الغرفة، لا صاحب الحركة فقط.
     أصوات الواجهة (نقر/تحديد/تبديل/أخطاء) تبقى محلية كي لا تتحوّل إلى ضجيج. */
  const SHARED_SOUNDS = new Set([
    "dice", "diceland", "card", "draw", "deal", "flip", "shuffle", "ticket",
    "move", "place", "meeple", "tile", "build", "capture", "promote", "step",
    "coin", "score", "point", "trade", "token", "resource", "cure", "outbreak",
    "robber", "train", "unlock", "reveal", "turn", "pass", "recall",
    "ladder", "snake", "win", "lose",
  ]);
  const NET_THROTTLE_MS = 45;
  const netLastFired = new Map();

  /* إرسال إلى صدى الخلفية: يمنح أحداث النتائج عمقًا دون إغراق المؤثرات القصيرة */
  const SAMPLE_SPACE = {
    win: 0.16, lose: 0.12, crown: 0.14, cure: 0.12,
    unlock: 0.1, reveal: 0.08, yourturn: 0.1, promote: 0.12,
    join: 0.08, leave: 0.08, turn: 0.08,
  };

  /* أسماء منطقية → ملفات صوتية (يُختار أحدها عشوائيًا لتجنّب التكرار) */
  const SAMPLES = {
    click: ["click.ogg", "click2.ogg", "click3.ogg"],
    card: ["card.ogg", "card2.ogg", "draw2.ogg"],
    draw: ["draw.ogg", "draw2.ogg", "card2.ogg"],
    flip: ["flip.ogg", "card2.ogg"],
    deal: ["deal.ogg", "draw.ogg", "draw2.ogg"],
    ticket: ["ticket.ogg", "deal.ogg", "card2.ogg"],
    shuffle: ["shuffle.ogg", "shuffle2.ogg"],
    dice: ["dice.ogg", "dice2.ogg"],
    diceland: ["diceland.ogg", "diceland2.ogg"],
    move: ["move.ogg", "move2.ogg"],
    place: ["place.ogg", "meeple.ogg", "tile.ogg"],
    tile: ["tile.ogg", "place.ogg"],
    build: ["build.ogg", "meeple.ogg"],
    coin: ["coin.ogg", "point2.ogg"],
    capture: ["capture.ogg", "build.ogg", "robber.ogg"],
    score: ["score.ogg", "score2.ogg", "point.ogg"],
    point: ["point.ogg", "point2.ogg", "score2.ogg"],
    step: ["step.ogg", "point2.ogg"],
    turn: ["turn.ogg", "select.ogg"],
    reveal: ["reveal.ogg", "unlock.ogg"],
    ladder: ["ladder.ogg", "reveal.ogg"],
    snake: ["snake.ogg", "robber.ogg"],
    error: ["error.ogg"],
    robber: ["robber.ogg", "snake.ogg"],
    pass: ["pass.ogg", "recall.ogg"],
    recall: ["recall.ogg", "pass.ogg"],
    meeple: ["meeple.ogg", "place.ogg"],
    resource: ["resource.ogg", "score2.ogg"],
    crown: ["crown.ogg", "score.ogg"],
    select: ["select.ogg", "point.ogg", "click3.ogg"],
    toggle: ["toggle.ogg", "click2.ogg"],
    unlock: ["unlock.ogg", "reveal.ogg"],
    train: ["train.ogg", "draw.ogg"],
    promote: ["crown.ogg", "unlock.ogg"],
    outbreak: ["snake.ogg", "robber.ogg", "error.ogg"],
    cure: ["reveal.ogg", "score2.ogg"],
    trade: ["coin.ogg", "card.ogg"],
    token: ["meeple.ogg", "place.ogg"],
    win: ["win.ogg"],
    lose: ["lose.ogg"],
  };

  /* طبقات إضافية تُشغَّل مع المؤثر الأساسي لتنويع النسيج الصوتي */
  const LAYERS = {
    place: [{ name: "point", delay: 34, gain: 0.3, rate: 1.32 }],
    tile: [{ name: "click", delay: 26, gain: 0.22, rate: 1.24 }],
    build: [{ name: "coin", delay: 74, gain: 0.26, rate: 1.08 }],
    capture: [{ name: "score", delay: 96, gain: 0.3, rate: 0.94 }],
    score: [{ name: "point", delay: 64, gain: 0.32, rate: 1.18 }],
    point: [{ name: "coin", delay: 52, gain: 0.22, rate: 1.26 }],
    coin: [{ name: "point", delay: 46, gain: 0.24, rate: 1.34 }],
    card: [{ name: "flip", delay: 46, gain: 0.26, rate: 1.06 }],
    deal: [{ name: "click", delay: 22, gain: 0.18, rate: 1.36 }],
    move: [{ name: "step", delay: 54, gain: 0.2, rate: 1.12 }],
    turn: [{ name: "point", delay: 92, gain: 0.26, rate: 1.44 }],
    reveal: [{ name: "unlock", delay: 84, gain: 0.26, rate: 1.08 }],
    ladder: [{ name: "crown", delay: 130, gain: 0.3, rate: 1.12 }],
    snake: [{ name: "error", delay: 86, gain: 0.26, rate: 0.92 }],
    ticket: [{ name: "click", delay: 30, gain: 0.16, rate: 1.3 }],
    resource: [{ name: "coin", delay: 48, gain: 0.22, rate: 1.2 }],
    train: [{ name: "coin", delay: 66, gain: 0.22, rate: 1.06 }],
    crown: [{ name: "score", delay: 74, gain: 0.3, rate: 1.14 }],
    promote: [{ name: "score", delay: 128, gain: 0.36, rate: 1.22 }],
    outbreak: [{ name: "robber", delay: 96, gain: 0.32, rate: 0.9 }],
    cure: [{ name: "score", delay: 124, gain: 0.4, rate: 1.24 }],
    trade: [{ name: "card", delay: 58, gain: 0.26, rate: 1.02 }],
    meeple: [{ name: "point", delay: 40, gain: 0.22, rate: 1.28 }],
  };

  const PRELOAD = [
    "click.ogg", "click2.ogg", "click3.ogg", "card.ogg", "draw.ogg",
    "dice.ogg", "diceland.ogg", "move.ogg", "place.ogg", "score.ogg",
    "turn.ogg", "select.ogg", "reveal.ogg", "error.ogg", "win.ogg", "lose.ogg",
  ];

  function readPrefs() {
    const saved = BG.store.get(STORE_KEY, {}) || {};
    return {
      sound: saved.sound !== false,
      volume: Number.isFinite(Number(saved.volume)) ? U.clamp(Number(saved.volume), 0, 1) : DEFAULTS.volume,
      motion: saved.motion !== false,
      pack: typeof saved.pack === "string" ? saved.pack : DEFAULTS.pack,
      music: saved.music === true,
      musicVolume: Number.isFinite(Number(saved.musicVolume)) ? U.clamp(Number(saved.musicVolume), 0, 1) : DEFAULTS.musicVolume,
    };
  }

  let prefs = readPrefs();
  let ctx = null;
  let master = null;
  let unlocked = false;
  let preloadStarted = false;
  let reducedQuery = null;
  const preloaded = new Set();
  const stats = { plays: 0, suppressed: 0, dropped: 0, failed: 0, last: "", lastAt: 0 };
  const activeVoices = new Set();
  const lastFired = new Map();
  let lastAnyAt = 0;
  const ALL_FILES = Array.from(new Set(Object.keys(SAMPLES).reduce((all, key) => all.concat(SAMPLES[key]), [])));

  try {
    reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  } catch (err) {
    reducedQuery = null;
  }

  /* ------------------------------ محرّك الصوت ------------------------------ */

  /* منحنى إدراكي: يمنح شريط الصوت إحساسًا طبيعيًا في المستويات المنخفضة */
  function volumeCurve(value) {
    return Math.pow(U.clamp(Number(value) || 0, 0, 1), 1.45) * MASTER_TRIM;
  }

  let space = null;
  let spaceSend = null;

  function makeImpulse(seconds, decay) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  function ensureSampleSpace() {
    if (space || !ctx || !master) return;
    try {
      space = ctx.createConvolver();
      space.buffer = makeImpulse(1.25, 2.7);
      spaceSend = ctx.createGain();
      spaceSend.gain.value = 0.32;
      space.connect(spaceSend);
      spaceSend.connect(master);
    } catch (err) {
      space = null;
      spaceSend = null;
    }
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      ctx = new AudioCtor();
      const comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
      master = ctx.createGain();
      master.gain.value = Math.max(0.0001, volumeCurve(prefs.volume));
      if (comp) {
        comp.threshold.value = -16;
        comp.knee.value = 20;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.25;
        master.connect(comp);
        comp.connect(ctx.destination);
      } else {
        master.connect(ctx.destination);
      }
      ctx.addEventListener("statechange", () => {
        if (ctx && ctx.state === "running") {
          unlocked = true;
          document.documentElement.classList.add("fx-audio-ready");
        }
      });
      ensureSampleSpace();
    } catch (err) {
      ctx = null;
      master = null;
    }
    return ctx;
  }

  /* مخازن صوتية مفكوكة مسبقًا: أخف بكثير من إنشاء عنصر Audio جديد مع كل نقرة */
  const buffers = new Map();
  const bufLoading = new Set();
  const bufFailed = new Set();

  function peakLevel(buffer) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i += 7) {
        const value = Math.abs(data[i]);
        if (value > peak) peak = value;
      }
    }
    return peak;
  }

  function loadBuffer(file) {
    if (!ctx || buffers.has(file) || bufLoading.has(file) || bufFailed.has(file)) return;
    bufLoading.add(file);
    fetch(ASSET_BASE + file)
      .then((res) => { if (!res.ok) throw new Error("http"); return res.arrayBuffer(); })
      .then((data) => new Promise((resolve, reject) => {
        const p = ctx.decodeAudioData(data, resolve, reject);
        if (p && p.catch) p.catch(reject);
      }))
      .then((buffer) => {
        const peak = peakLevel(buffer);
        const gain = peak > 0.04 ? Math.min(1.5, 0.86 / peak) : 1;
        buffers.set(file, { buffer, gain });
        document.dispatchEvent(new CustomEvent("bgfxaudio", {
          detail: { file, loaded: buffers.size, total: ALL_FILES.length },
        }));
      })
      .catch(() => {
        bufFailed.add(file);
        stats.failed++;
      })
      .then(() => { bufLoading.delete(file); });
  }

  function preloadFile(file) {
    if (preloaded.has(file) || typeof window.Audio !== "function") return;
    preloaded.add(file);
    try {
      const el = new window.Audio();
      el.preload = "auto";
      el.src = ASSET_BASE + file;
      el.load();
    } catch (err) {
      /* المتصفح قد يمنع التحميل المسبق — نحمّله عند الحاجة */
    }
  }

  function preloadAll() {
    if (!ctx) {
      PRELOAD.forEach((file) => preloadFile(file));
      return;
    }
    if (preloadStarted) return;
    preloadStarted = true;
    const ordered = PRELOAD.concat(ALL_FILES.filter((file) => PRELOAD.indexOf(file) < 0));
    ordered.forEach((file, i) => {
      setTimeout(() => loadBuffer(file), 120 + i * 70);
    });
  }

  function applyVolume() {
    if (!master || !ctx) {
      if (BG.soundPacks && BG.soundPacks.setMusicVolume) BG.soundPacks.setMusicVolume(prefs.musicVolume);
      return;
    }
    const level = Math.max(0.0001, volumeCurve(prefs.volume));
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(level, ctx.currentTime, 0.035);
    } catch (err) {
      master.gain.value = level;
    }
    if (BG.soundPacks && BG.soundPacks.setMusicVolume) BG.soundPacks.setMusicVolume(prefs.musicVolume);
  }

  function unlock() {
    const audio = ensureContext();
    if (!audio) return;
    const ready = () => {
      unlocked = true;
      document.documentElement.classList.add("fx-audio-ready");
      preloadAll();
      if (prefs.music && prefs.sound) startMusicNow();
    };
    if (audio.state === "suspended") {
      audio.resume().then(ready).catch(() => { /* المتصفح ينتظر إيماءة أخرى */ });
    } else {
      ready();
    }
  }

  /**
   * تشغيل ملف صوتي مرخّص. يعيد كائنًا فيه وعد التشغيل أو null عند الفشل.
   * الأفضلية للعازف المخزّن (Web Audio) لأنه أقل تأخيرًا وأدق في المزج.
   */
  function playSample(name, opts) {
    const o = opts || {};
    const list = SAMPLES[name];
    if (!list || !list.length || typeof window.Audio !== "function") return null;
    const file = list.length === 1 ? list[0] : list[Math.floor(Math.random() * list.length)];

    if (ctx && buffers.has(file)) {
      if (activeVoices.size >= MAX_VOICES) {
        stats.dropped++;
        return { el: null, promise: Promise.resolve() };
      }
      try {
        const meta = buffers.get(file);
        const rate = o.rate || (o.vary !== false ? 0.97 + Math.random() * 0.06 : 1);
        const src = ctx.createBufferSource();
        src.buffer = meta.buffer;
        src.playbackRate.value = rate;

        const g = ctx.createGain();
        const level = Math.max(0.0001, (o.gain == null ? 0.92 : o.gain) * meta.gain * 0.95);
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(level, t + 0.005);

        let tail = g;
        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.value = o.pan == null ? (Math.random() * 0.16 - 0.08) : U.clamp(o.pan, -1, 1);
          g.connect(panner);
          tail = panner;
        }
        tail.connect(master);

        const send = o.send == null ? (SAMPLE_SPACE[name] || 0) : o.send;
        if (send > 0 && space) {
          const s = ctx.createGain();
          s.gain.value = send;
          tail.connect(s);
          s.connect(space);
        }

        src.connect(g);
        src.onended = () => activeVoices.delete(src);
        activeVoices.add(src);
        src.start(t);
        setTimeout(() => activeVoices.delete(src), (meta.buffer.duration / rate) * 1000 + 600);
        return { el: null, promise: Promise.resolve() };
      } catch (err) {
        /* نكمل بعنصر الصوت التقليدي */
      }
    }

    if (ctx && !bufFailed.has(file)) loadBuffer(file);
    preloadFile(file);
    try {
      const el = new window.Audio(ASSET_BASE + file);
      el.preload = "auto";
      el.volume = U.clamp(prefs.volume * (o.gain == null ? 0.92 : o.gain) * 1.05, 0, 1);
      if (o.rate) el.playbackRate = o.rate;
      else if (o.vary !== false) el.playbackRate = 0.97 + Math.random() * 0.06;
      const promise = el.play();
      return { el, promise: promise && promise.catch ? promise : Promise.resolve() };
    } catch (err) {
      return null;
    }
  }

  /* ------------------------------ مولّد النغمات الاحتياطي ------------------------------ */

  function tone(opts) {
    const o = Object.assign({ f: 440, to: null, d: 0.16, g: 0.05, type: "sine", when: 0, attack: 0.006 }, opts || {});
    if (!ctx || !master) return;
    const t = ctx.currentTime + Math.max(0, o.when);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(Math.max(20, o.f), t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.d);
    const peak = Math.max(0.0002, o.g);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + Math.min(o.attack, o.d * 0.5));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + o.d + 0.03);
  }

  function noise(opts) {
    const o = Object.assign({ d: 0.16, g: 0.06, f: 1800, to: null, q: 1, type: "bandpass", when: 0 }, opts || {});
    if (!ctx || !master) return;
    const t = ctx.currentTime + Math.max(0, o.when);
    const length = Math.max(1, Math.floor(ctx.sampleRate * o.d));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = o.type;
    filter.frequency.setValueAtTime(Math.max(40, o.f), t);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + o.d);
    filter.Q.value = o.q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, o.g), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + o.d + 0.02);
  }

  const SYNTH = {
    click() {
      tone({ f: 620, to: 500, d: 0.055, g: 0.045, type: "triangle" });
      noise({ d: 0.026, g: 0.012, f: 2500, q: 1.2 });
    },
    card() {
      noise({ d: 0.17, g: 0.065, f: 2400, to: 900, q: 0.7 });
      tone({ f: 520, to: 780, d: 0.1, g: 0.022, type: "sine", when: 0.015 });
    },
    dice() {
      noise({ d: 0.055, g: 0.1, f: 1650, q: 0.9 });
      noise({ d: 0.06, g: 0.08, f: 1200, q: 0.8, when: 0.075 });
      noise({ d: 0.08, g: 0.07, f: 850, q: 0.7, when: 0.16 });
      tone({ f: 190, to: 120, d: 0.075, g: 0.045, type: "square", when: 0.16 });
    },
    move() {
      tone({ f: 400, to: 620, d: 0.11, g: 0.045, type: "sine" });
      tone({ f: 620, to: 780, d: 0.075, g: 0.024, type: "triangle", when: 0.07 });
    },
    build() {
      tone({ f: 150, to: 82, d: 0.18, g: 0.085, type: "sine" });
      noise({ d: 0.075, g: 0.04, f: 760, q: 0.9, when: 0.02 });
      tone({ f: 540, to: 680, d: 0.1, g: 0.032, type: "triangle", when: 0.08 });
    },
    place() {
      noise({ d: 0.045, g: 0.05, f: 1350, q: 0.9 });
      tone({ f: 330, to: 220, d: 0.075, g: 0.045, type: "triangle" });
    },
    score() {
      tone({ f: 880, to: 1180, d: 0.09, g: 0.04, type: "triangle" });
      tone({ f: 1560, d: 0.12, g: 0.022, type: "sine", when: 0.06 });
    },
    shuffle() {
      noise({ d: 0.1, g: 0.055, f: 3100, to: 1400, q: 0.65 });
      noise({ d: 0.09, g: 0.045, f: 2400, to: 1000, q: 0.6, when: 0.075 });
    },
    pass() {
      tone({ f: 300, d: 0.07, g: 0.025, type: "sine" });
      tone({ f: 240, d: 0.09, g: 0.022, type: "sine", when: 0.07 });
    },
    reveal() {
      noise({ d: 0.24, g: 0.04, f: 600, to: 3200, q: 0.6 });
      tone({ f: 520, to: 1040, d: 0.2, g: 0.03, type: "sine" });
    },
    error() {
      tone({ f: 210, to: 120, d: 0.17, g: 0.05, type: "square" });
    },
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        tone({ f, d: i === notes.length - 1 ? 0.36 : 0.18, g: i === notes.length - 1 ? 0.06 : 0.045, type: "triangle", when: i * 0.1 });
      });
      noise({ d: 0.4, g: 0.018, f: 4200, q: 0.5, when: 0.12 });
    },
    lose() {
      [392, 329.63, 261.63, 196].forEach((f, i) => {
        tone({ f, d: i === 3 ? 0.32 : 0.2, g: 0.04, type: "sine", when: i * 0.12 });
      });
    },
    promote() {
      tone({ f: 660, to: 990, d: 0.16, g: 0.045, type: "triangle" });
      [784, 988, 1319].forEach((f, i) => {
        tone({ f, d: i === 2 ? 0.28 : 0.15, g: 0.038, type: "sine", when: 0.09 + i * 0.09 });
      });
      noise({ d: 0.26, g: 0.018, f: 4600, q: 0.5, when: 0.14 });
    },
    outbreak() {
      noise({ d: 0.2, g: 0.06, f: 900, to: 220, q: 0.8 });
      tone({ f: 260, to: 96, d: 0.26, g: 0.055, type: "sawtooth" });
      tone({ f: 130, to: 70, d: 0.3, g: 0.045, type: "square", when: 0.1 });
    },
    cure() {
      noise({ d: 0.22, g: 0.028, f: 800, to: 3400, q: 0.6 });
      [523, 659, 784, 1047].forEach((f, i) => {
        tone({ f, d: i === 3 ? 0.34 : 0.16, g: 0.04, type: "triangle", when: i * 0.085 });
      });
    },
    trade() {
      tone({ f: 620, to: 820, d: 0.08, g: 0.04, type: "triangle" });
      tone({ f: 980, d: 0.09, g: 0.03, type: "sine", when: 0.07 });
      noise({ d: 0.11, g: 0.03, f: 2600, q: 0.7, when: 0.03 });
    },
    token() {
      noise({ d: 0.04, g: 0.045, f: 1500, q: 1 });
      tone({ f: 420, to: 300, d: 0.09, g: 0.05, type: "triangle" });
      tone({ f: 760, to: 640, d: 0.07, g: 0.022, type: "sine", when: 0.05 });
    },
  };
  SYNTH.deal = SYNTH.card;
  SYNTH.draw = SYNTH.card;
  SYNTH.flip = SYNTH.card;
  SYNTH.ticket = SYNTH.card;
  SYNTH.diceland = SYNTH.dice;
  SYNTH.coin = SYNTH.score;
  SYNTH.capture = SYNTH.build;
  SYNTH.step = SYNTH.click;
  SYNTH.point = SYNTH.score;
  SYNTH.turn = SYNTH.pass;
  SYNTH.recall = SYNTH.pass;
  SYNTH.meeple = SYNTH.place;
  SYNTH.resource = SYNTH.score;
  SYNTH.crown = SYNTH.win;
  SYNTH.select = SYNTH.click;
  SYNTH.toggle = SYNTH.click;
  SYNTH.unlock = SYNTH.reveal;
  SYNTH.train = SYNTH.build;
  SYNTH.robber = SYNTH.error;
  SYNTH.snake = SYNTH.error;
  SYNTH.ladder = SYNTH.score;
  SYNTH.join = function () {
    tone({ f: 520, d: 0.1, g: 0.04, type: "triangle" });
    tone({ f: 780, d: 0.18, g: 0.04, type: "sine", when: 0.09 });
  };
  SYNTH.leave = function () {
    tone({ f: 780, d: 0.1, g: 0.035, type: "triangle" });
    tone({ f: 520, d: 0.2, g: 0.035, type: "sine", when: 0.09 });
  };
  SYNTH.yourturn = function () {
    tone({ f: 523, d: 0.1, g: 0.045, type: "triangle" });
    tone({ f: 659, d: 0.1, g: 0.045, type: "triangle", when: 0.1 });
    tone({ f: 988, d: 0.26, g: 0.05, type: "sine", when: 0.2 });
  };
  SYNTH.tick = function () {
    tone({ f: 1800, d: 0.03, g: 0.03, type: "square" });
  };

  function synthSound(name) {
    const fn = SYNTH[name];
    if (!fn) return;
    try { fn(); } catch (err) { /* تجاهل */ }
  }

  /** يشغّل مؤثرًا واحدًا بالعيّنة المرخّصة أو بالمولّد الاحتياطي. */
  function fireSound(name, opts) {
    const o = opts || {};
    const played = playSample(name, { gain: o.gain, rate: o.rate });
    if (played) {
      played.promise.catch(() => synthSound(name));
      return;
    }
    synthSound(name);
  }

  /** طبقات قصيرة تُثري الحدث الأساسي دون أن تتحوّل إلى ضجيج. */
  function fireLayers(name) {
    const layers = LAYERS[name];
    if (!layers || !layers.length) return;
    layers.forEach((layer) => {
      const run = () => fireSound(layer.name, { gain: layer.gain, rate: layer.rate });
      if (layer.delay) setTimeout(run, layer.delay);
      else run();
    });
  }

  function nowMs() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  }

  function isSharedSound(name) {
    return SHARED_SOUNDS.has(name);
  }

  /** يبثّ صوت اللعب إلى بقية أجهزة الغرفة. يبقى محليًا خارج اللعب الجماعي. */
  function shareSound(name) {
    if (!SHARED_SOUNDS.has(name)) return;
    const online = BG.online;
    if (!online || !online.active || typeof online.sendSound !== "function") return;
    const now = nowMs();
    if (now - (netLastFired.get(name) || 0) < NET_THROTTLE_MS) return;
    netLastFired.set(name, now);
    try { online.sendSound(name); } catch (err) { /* الشبكة أفضل جهد */ }
  }

  /** صوت وصل من لاعب آخر: يحترم إعدادات الصوت المحلية ولا يُعاد بثّه. */
  function remoteSound(name) {
    if (!SHARED_SOUNDS.has(name)) return;
    sound(name, { remote: true });
  }

  function sound(name, opts) {
    const o = opts || {};
    if (!o.remote && !o.force) shareSound(name);
    if (!o.force && !prefs.sound) return;
    const packActive = prefs.pack && prefs.pack !== "classic" && BG.soundPacks && BG.soundPacks.has(prefs.pack);
    if (!SAMPLES[name] && !SYNTH[name] && !packActive) return;

    const now = nowMs();
    const gap = THROTTLE_MS[name] || 0;
    if (!o.force && gap) {
      const last = lastFired.get(name) || 0;
      if (now - last < gap) {
        stats.suppressed++;
        return;
      }
    }
    lastFired.set(name, now);

    const audio = ensureContext();
    if (!audio) {
      synthSound(name);
      fireLayers(name);
      return;
    }
    if (audio.state === "suspended") {
      audio.resume().then(() => { preloadAll(); }).catch(() => { /* لا شيء */ });
    }

    stats.plays++;
    stats.last = name;
    stats.lastAt = now;
    lastAnyAt = now;

    /* حزمة مولّدة: تعزف الحدث بنغمات الحزمة بدل العيّنات */
    if (packActive && BG.soundPacks.play(prefs.pack, name, audio, master)) return;

    if (name === "dice") {
      const first = playSample("dice", { gain: 0.8 });
      const land = setTimeout(() => {
        const hit = playSample("diceland", { gain: 0.9 });
        if (hit) hit.promise.catch(() => synthSound("diceland"));
        else synthSound("diceland");
      }, 400);
      if (first) first.promise.catch(() => { clearTimeout(land); synthSound("dice"); });
      else { clearTimeout(land); synthSound("dice"); }
      fireLayers(name);
      return;
    }

    fireSound(name, { gain: o.gain });
    fireLayers(name);
  }

  /* ------------------------------ الحركة ------------------------------ */

  function motionEnabled() {
    if (!prefs.motion) return false;
    if (reducedQuery && reducedQuery.matches) return false;
    return true;
  }

  /** رمية نرد: صوت مرخّص + اهتزاز بصري لعنصر النرد إن مُرِّر. */
  function dice(value, opts) {
    const o = opts || {};
    sound("dice", { gain: o.gain || 0.85 });
    const el = o.el || document.querySelector(".ld-die");
    if (el && motionEnabled()) {
      animate(el, [
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(-18deg) scale(1.12)", offset: 0.25 },
        { transform: "rotate(14deg) scale(1.08)", offset: 0.55 },
        { transform: "rotate(0deg) scale(1)" },
      ], { duration: 460, easing: "cubic-bezier(.2,.8,.3,1)" });
    }
    if (value && o.label !== false) {
      const host = o.host || stage();
      if (host && motionEnabled()) {
        const node = document.createElement("div");
        node.className = "fx-dice-value";
        node.textContent = String(value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
        host.appendChild(node);
        const anim = node.animate([
          { opacity: 0, transform: "translate(-50%, 8px) scale(.7)" },
          { opacity: 1, transform: "translate(-50%, -6px) scale(1)", offset: 0.22 },
          { opacity: 1, transform: "translate(-50%, -14px) scale(1)", offset: 0.7 },
          { opacity: 0, transform: "translate(-50%, -26px) scale(.94)" },
        ], { duration: 900, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
        const cleanup = () => { if (node.parentNode) node.parentNode.removeChild(node); };
        if (anim) anim.finished.then(cleanup).catch(cleanup);
        else setTimeout(cleanup, 900);
        return node;
      }
    }
    return null;
  }

  const DIE_DOTS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };

  function setTumbleFace(die, value, labels) {
    if (labels) {
      die.textContent = labels[value] == null ? "" : labels[value];
      return;
    }
    const on = DIE_DOTS[value] || [];
    const pips = die.children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle("is-on", on.indexOf(i) >= 0);
  }

  /**
   * تدحرج نرد مشترك لكل الألعاب: نرد كبير (أو أكثر) يسقط فوق الشاشة ويدور
   * وتتبدّل أوجهه ثم يستقر على القيم النهائية، وبعدها يُستدعى done.
   * values: رقم أو مصفوفة أرقام (1–6). host: عنصر يُوسَّط النرد فوقه (اختياري).
   * opts: { tone: "red"|"white", ms, hold, labels }. labels: خريطة وجه ← نص/رمز لنرد غير رقمي
   * (مثل ملك طوكيو)؛ وعندها تكون values مفاتيح هذه الخريطة. يعيد دالة إلغاء.
   * إن كانت الحركة معطّلة (إعدادات/تقليل حركة) يُستدعى done فورًا دون تأخير.
   */
  function tumbleLegacy(host, values, done, opts) {
    const o = Object.assign({ ms: isLite() ? 420 : 600, hold: 220, tone: "", labels: null }, opts || {});
    const labels = o.labels || null;
    const labelKeys = labels ? Object.keys(labels) : null;
    const list = labels
      ? [].concat(values).filter((v) => labels[v] != null)
      : [].concat(values).map(Number).filter((v) => v >= 1 && v <= 6);
    const finish = typeof done === "function" ? done : function () {};
    if (!list.length || !motionEnabled()) {
      finish();
      return function () {};
    }
    const layer = document.createElement("div");
    layer.className = "fx-tumble" + (list.length > 3 ? " is-many" : "");
    layer.setAttribute("aria-hidden", "true");
    const dice = list.map((_, i) => {
      const die = document.createElement("span");
      die.className = "fx-tumble-die" + (labels ? " is-symbol" : "");
      const tone = (o.tones && o.tones[i]) || o.tone;
      if (tone) die.setAttribute("data-tone", tone);
      if (!labels) for (let i = 0; i < 9; i++) die.appendChild(document.createElement("i"));
      layer.appendChild(die);
      return die;
    });
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (host && host.getBoundingClientRect) {
      const rect = host.getBoundingClientRect();
      if (rect.width || rect.height) {
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }
    layer.style.left = U.clamp(x, 80, Math.max(80, window.innerWidth - 80)) + "px";
    layer.style.top = U.clamp(y, 80, Math.max(80, window.innerHeight - 80)) + "px";
    document.body.appendChild(layer);

    const random = () => (labels ? labelKeys[Math.floor(Math.random() * labelKeys.length)] : 1 + Math.floor(Math.random() * 6));
    dice.forEach((die, i) => {
      setTumbleFace(die, random(), labels);
      const dir = i % 2 ? -1 : 1;
      animate(die, [
        { transform: "translateY(-150px) rotate(0deg) scale(0.6)", opacity: 0, offset: 0 },
        { transform: "translateY(0) rotate(" + dir * 260 + "deg) scale(1.15)", opacity: 1, offset: 0.35 },
        { transform: "translateY(-44px) rotate(" + dir * 430 + "deg) scale(1.05)", opacity: 1, offset: 0.55 },
        { transform: "translateY(0) rotate(" + dir * 610 + "deg) scale(1.1)", opacity: 1, offset: 0.78 },
        { transform: "translateY(0) rotate(" + dir * 720 + "deg) scale(1)", opacity: 1, offset: 1 },
      ], { duration: o.ms, delay: i * 70, easing: "ease-out", fill: "both" });
    });

    let tick = setInterval(() => {
      dice.forEach((die) => setTumbleFace(die, random(), labels));
    }, 70);
    let settle = null;
    let release = null;
    let cancelled = false;
    const remove = () => { if (layer.parentNode) layer.parentNode.removeChild(layer); };
    settle = setTimeout(() => {
      clearInterval(tick);
      tick = null;
      dice.forEach((die, i) => {
        setTumbleFace(die, list[i], labels);
        animate(die, [{ transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: o.hold, easing: "cubic-bezier(.3,.7,.35,1)" });
      });
      release = setTimeout(() => {
        remove();
        if (!cancelled) finish();
      }, o.hold);
    }, o.ms + (list.length - 1) * 70);

    return function cancel() {
      if (cancelled) return;
      cancelled = true;
      if (tick) clearInterval(tick);
      clearTimeout(settle);
      clearTimeout(release);
      remove();
    };
  }

  /**
   * رمي نرد فيزيائي لكل الألعاب: يُقذف النرد من حافة اللوحة بسرعة ودوران ثلاثي الأبعاد، فيقفز ويرتدّ عن الحواف
   * ويرتطم بعضه ببعض (جاذبية، ارتداد، احتكاك، وظل يتبع الارتفاع)، ثم يستقر على القيم النهائية المحدَّدة سلفًا
   * ويُستدعى done. values: رقم أو مصفوفة (1–6). host: اللوحة التي يُرمى النرد داخل حدودها.
   * opts: { tone, tones, hold, labels, ms (أقصى زمن للفيزياء), random (للاختبار), probe (للاختبار) }. يعيد دالة إلغاء.
   * إن كانت الحركة معطّلة يُستدعى done فورًا دون تأخير. وإن غاب requestAnimationFrame تُستعمل الحركة القديمة.
   */
  function tumble(host, values, done, opts) {
    const o = Object.assign({ hold: 220, tone: "", labels: null, random: null }, opts || {});
    if (typeof window.requestAnimationFrame !== "function") return tumbleLegacy(host, values, done, opts);
    const rnd = typeof o.random === "function" ? o.random : Math.random;
    const labels = o.labels || null;
    const list = labels
      ? [].concat(values).filter((v) => labels[v] != null)
      : [].concat(values).map(Number).filter((v) => v >= 1 && v <= 6);
    const finish = typeof done === "function" ? done : function () {};
    if (!list.length || !motionEnabled()) {
      finish();
      return function () {};
    }
    const n = list.length;
    const TAU = Math.PI * 2;

    /* ميدان الرمي: مستطيل اللوحة المرئي (أو منطقة مناسبة حول العنصر إن كان صغيرًا) */
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let L = 8;
    let T = 8;
    let W = Math.max(200, vw - 16);
    let H = Math.max(200, vh - 16);
    const rect = host && host.getBoundingClientRect ? host.getBoundingClientRect() : null;
    if (rect && (rect.width || rect.height)) {
      const il = Math.max(rect.left, 4);
      const it = Math.max(rect.top, 4);
      const ir = Math.min(rect.right, vw - 4);
      const ib = Math.min(rect.bottom, vh - 4);
      if (ir - il >= 320 && ib - it >= 240) {
        L = il; T = it; W = ir - il; H = ib - it;
      } else {
        const fw = Math.min(Math.max(rect.width, 440), vw - 8);
        const fh = Math.min(Math.max(rect.height, 340), vh - 8);
        L = U.clamp(rect.left + rect.width / 2 - fw / 2, 4, Math.max(4, vw - fw - 4));
        T = U.clamp(rect.top + rect.height / 2 - fh / 2, 4, Math.max(4, vh - fh - 4));
        W = fw; H = fh;
      }
    }
    /* هامش صغير حتى لا يلتصق النرد بإطار اللوحة */
    L += 8; T += 8;
    W = Math.max(160, W - 16);
    H = Math.max(160, H - 16);
    const size = U.clamp(Math.min(W, H) * (n > 3 ? 0.115 : 0.15), 38, 68);
    const r = size / 2;
    const G = 3000;
    const maxT = (o.ms && o.ms >= 1000 ? o.ms : isLite() ? 1100 : 1550) / 1000;

    const layer = document.createElement("div");
    layer.className = "fx-throw";
    layer.setAttribute("aria-hidden", "true");
    layer.style.left = L + "px";
    layer.style.top = T + "px";
    layer.style.width = W + "px";
    layer.style.height = H + "px";

    /* مكعّب نرد حقيقي بستة أوجه: القيمة النهائية على الوجه الأمامي، والأوجه
       الأخرى أرقام متقابلة مجموعها ٧ (أو رموز اللعبة عند labels). */
    const CUBE_FACES = ["front", "back", "right", "left", "top", "bottom"];
    const cubeValues = (value) => {
      if (labels) {
        const keys = Object.keys(labels);
        const front = value;
        const rest = keys.filter((key) => String(key) !== String(front));
        const out = { front: front };
        ["back", "right", "left", "top", "bottom"].forEach((face, i) => {
          out[face] = rest.length ? rest[i % rest.length] : front;
        });
        return out;
      }
      const f = Number(value);
      const pairs = [[f, 7 - f]];
      for (let v = 1; v <= 6; v++) {
        if (v === f || v === 7 - f) continue;
        if (pairs.some((pair) => pair[0] === v || pair[1] === v)) continue;
        pairs.push([v, 7 - v]);
      }
      return {
        front: pairs[0][0], back: pairs[0][1],
        right: pairs[1][0], left: pairs[1][1],
        top: pairs[2][0], bottom: pairs[2][1],
      };
    };
    const buildCube = (value, tone) => {
      const cube = document.createElement("span");
      cube.className = "fx-cube";
      cube.style.setProperty("--s", size + "px");
      if (tone) cube.setAttribute("data-tone", tone);
      const faces = cubeValues(value);
      CUBE_FACES.forEach((face) => {
        const el = document.createElement("span");
        el.className = "fx-cube-face" + (labels ? " is-symbol" : "");
        el.setAttribute("data-face", face);
        if (labels) {
          el.textContent = labels[faces[face]] == null ? "" : labels[faces[face]];
        } else {
          const on = DIE_DOTS[faces[face]] || [];
          for (let k = 0; k < 9; k++) {
            const pip = document.createElement("i");
            if (on.indexOf(k) >= 0) pip.className = "is-on";
            el.appendChild(pip);
          }
        }
        cube.appendChild(el);
      });
      return cube;
    };

    /* نقطة إطلاق على إحدى الحواف، والنرد متجاور حتى لا يتداخل لحظة الانطلاق */
    const side = Math.floor(rnd() * 4);
    const dice = list.map((value, i) => {
      const shadow = document.createElement("span");
      shadow.className = "fx-throw-shadow";
      shadow.style.width = size + "px";
      shadow.style.height = size * 0.6 + "px";
      const tone = (o.tones && o.tones[i]) || o.tone;
      const el = buildCube(value, tone);
      layer.appendChild(shadow);
      layer.appendChild(el);
      const spread = 0.26 + (0.48 * (i + 0.5)) / n + (rnd() - 0.5) * 0.05;
      let x;
      let y;
      if (side === 0) { x = r + 2; y = H * spread; }
      else if (side === 1) { x = W - r - 2; y = H * spread; }
      else if (side === 2) { x = W * spread; y = r + 2; }
      else { x = W * spread; y = H - r - 2; }
      const tx = W * (0.3 + rnd() * 0.4);
      const ty = H * (0.3 + rnd() * 0.4);
      const len = Math.hypot(tx - x, ty - y) || 1;
      const speed = Math.min(W, H) * (1.6 + rnd() * 0.8);
      const sgn = () => (rnd() < 0.5 ? -1 : 1);
      const die = {
        el, shadow, final: value,
        x, y, vx: ((tx - x) / len) * speed, vy: ((ty - y) / len) * speed,
        z: size * 1.4, vz: 240 + rnd() * 260,
        ang: rnd() * TAU, om: sgn() * (7 + rnd() * 9),
        rx: rnd() * TAU, ry: rnd() * TAU, wx: sgn() * (7 + rnd() * 8), wy: sgn() * (7 + rnd() * 8),
        rest: false, ease: 0,
      };
      return die;
    });

    let t = 0;
    let last = 0;
    let raf = 0;
    let ended = false;
    let cancelled = false;
    let hardTimer = 0;
    let releaseTimer = 0;

    const hit = (d, power) => {
      d.wx += (rnd() - 0.5) * (power || 10);
      d.wy += (rnd() - 0.5) * (power || 10);
    };
    /* فصل نهائي للنرد المتلاصق مع إبقائه داخل اللوحة (يمنع التداخل عند الاستقرار) */
    const relax = () => {
      for (let iter = 0; iter < 16; iter++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = dice[i];
            const b = dice[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            if (dist < 0.5) { dx = 1; dy = 0; dist = 1; }
            const min = size * 0.99;
            if (dist >= min) continue;
            const push = (min - dist) / 2;
            a.x -= (dx / dist) * push; a.y -= (dy / dist) * push;
            b.x += (dx / dist) * push; b.y += (dy / dist) * push;
            moved = true;
          }
        }
        dice.forEach((d) => { d.x = U.clamp(d.x, r, W - r); d.y = U.clamp(d.y, r, H - r); });
        if (!moved) break;
      }
    };
    /* ميل ثابت عند الاستقرار يُظهر ثلاثة أوجه، مع الوجه الأمامي الذي يحمل
       القيمة النهائية. نختار أقرب دورة كاملة حتى لا يدور النرد طويلاً. */
    const BASE_X = -0.28;
    const BASE_Y = 0.38;
    const nearestTurn = (current, target) => target + Math.round((current - target) / TAU) * TAU;
    let justRested = false;
    const toRest = (d) => {
      if (d.rest) return;
      justRested = true;
      d.rest = true;
      d.ease = 0;
      d.vx = 0; d.vy = 0; d.vz = 0; d.z = 0;
      d.fromRx = d.rx; d.fromRy = d.ry; d.fromAng = d.ang;
      d.toRx = nearestTurn(d.rx, BASE_X);
      d.toRy = nearestTurn(d.ry, BASE_Y);
      d.toAng = Math.round(d.ang / (Math.PI / 2)) * (Math.PI / 2) + (rnd() - 0.5) * 0.3;
    };
    const wake = (d) => {
      if (!d.rest) return;
      d.rest = false;
      d.ease = 0;
    };

    const step = (dt) => {
      const late = Math.max(0, t - maxT * 0.6);
      dice.forEach((d) => {
        if (d.rest) {
          d.ease = Math.min(1, d.ease + dt / 0.24);
          const e = 1 - Math.pow(1 - d.ease, 3);
          d.rx = d.fromRx + (d.toRx - d.fromRx) * e;
          d.ry = d.fromRy + (d.toRy - d.fromRy) * e;
          d.ang = d.fromAng + (d.toAng - d.fromAng) * e;
          return;
        }
        d.vz -= G * dt;
        d.z += d.vz * dt;
        if (d.z <= 0) {
          d.z = 0;
          if (d.vz < -110) {
            d.vz = -d.vz * 0.56;
            d.vx *= 0.64;
            d.vy *= 0.64;
            d.om *= 0.8;
            hit(d, 12);
          } else {
            d.vz = 0;
          }
        }
        const grounded = d.z <= 0.5 && d.vz <= 1;
        const k = Math.exp(-((grounded ? 3.6 : 0.3) + late * 10) * dt);
        d.vx *= k;
        d.vy *= k;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.ang += d.om * dt;
        d.om *= Math.exp(-((grounded ? 6 : 0.15) + late * 8) * dt);
        d.rx += d.wx * dt;
        d.ry += d.wy * dt;
        const kw = Math.exp(-((grounded ? 7 : 0.15) + late * 8) * dt);
        d.wx *= kw;
        d.wy *= kw;
        /* جدران اللوحة */
        if (d.x < r) { d.x = r; d.vx = Math.abs(d.vx) * 0.72; d.om += (rnd() - 0.5) * 9; d.vz += 130; hit(d); }
        if (d.x > W - r) { d.x = W - r; d.vx = -Math.abs(d.vx) * 0.72; d.om += (rnd() - 0.5) * 9; d.vz += 130; hit(d); }
        if (d.y < r) { d.y = r; d.vy = Math.abs(d.vy) * 0.72; d.om += (rnd() - 0.5) * 9; d.vz += 130; hit(d); }
        if (d.y > H - r) { d.y = H - r; d.vy = -Math.abs(d.vy) * 0.72; d.om += (rnd() - 0.5) * 9; d.vz += 130; hit(d); }
      });
      /* تصادم النرد ببعضه (تمريرتان عند كثرة النرد) */
      for (let pass = 0; pass < (n > 3 ? 2 : 1); pass++) for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = dice[i];
          const b = dice[j];
          if (Math.abs(a.z - b.z) > size * 0.55) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const min = size * 0.96;
          if (dist >= min) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          wake(a);
          wake(b);
          const push = (min - dist) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (vn > 0) {
            const imp = ((1 + 0.78) * vn) / 2;
            a.vx -= imp * nx; a.vy -= imp * ny;
            b.vx += imp * nx; b.vy += imp * ny;
            a.om += (rnd() - 0.5) * 12; b.om += (rnd() - 0.5) * 12;
            a.vz += 170 + vn * 0.05; b.vz += 170 + vn * 0.05;
            hit(a, 14); hit(b, 14);
          }
        }
      }
      dice.forEach((d) => {
        d.x = U.clamp(d.x, r, W - r);
        d.y = U.clamp(d.y, r, H - r);
      });
      justRested = false;
      dice.forEach((d) => {
        if (d.rest) return;
        const speed = Math.hypot(d.vx, d.vy);
        const calm = d.z <= 0 && d.vz === 0 && speed < 45 && Math.abs(d.om) < 1.2 && Math.abs(d.wx) < 1.6 && Math.abs(d.wy) < 1.6;
        if ((calm && t > 0.25) || t >= maxT) toRest(d);
      });
      if (justRested) relax();
    };

    const render = () => {
      dice.forEach((d) => {
        const s = 1 + d.z / 320;
        const lift = d.z * 0.38;
        d.el.style.transform =
          "translate3d(" + (d.x - r) + "px," + (d.y - r - lift) + "px,0) scale(" + s + ") " +
          "rotateX(" + d.rx + "rad) rotateY(" + d.ry + "rad) rotateZ(" + d.ang + "rad)";
        const sh = 1 - Math.min(0.55, d.z / 380);
        d.shadow.style.opacity = String(0.5 * sh);
        d.shadow.style.transform = "translate3d(" + (d.x - r + d.z * 0.05) + "px," + (d.y + r * 0.42) + "px,0) scale(" + (sh + 0.1) + ")";
      });
    };

    const remove = () => { if (layer.parentNode) layer.parentNode.removeChild(layer); };
    const settleAll = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      clearTimeout(hardTimer);
      releaseTimer = setTimeout(() => {
        remove();
        if (!cancelled) finish();
      }, o.hold);
    };

    const frame = (now) => {
      if (cancelled || ended) return;
      if (!last) last = now;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let s = 0; s < sub; s++) {
        t += dt / sub;
        step(dt / sub);
      }
      render();
      if (typeof o.probe === "function") o.probe(dice, t, { W, H, size });
      if (dice.every((d) => d.rest && d.ease >= 1)) {
        settleAll();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    document.body.appendChild(layer);
    render();
    raf = requestAnimationFrame(frame);
    /* احتياط: لو توقفت الإطارات (تبويب في الخلفية) نُنهي الرمي بالقيم النهائية ليستمر اللعب */
    hardTimer = setTimeout(() => {
      if (ended || cancelled) return;
      dice.forEach((d) => { d.rest = true; d.ease = 1; d.rx = BASE_X; d.ry = BASE_Y; d.ang = 0; });
      render();
      settleAll();
    }, (maxT + 1.4) * 1000);

    return function cancel() {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(hardTimer);
      clearTimeout(releaseTimer);
      remove();
    };
  }

  function isSvg(el) {
    return !!(el && el.namespaceURI && el.namespaceURI.indexOf("svg") !== -1);
  }

  function animate(el, frames, opts) {
    if (!el || !motionEnabled() || typeof el.animate !== "function") return null;
    const o = Object.assign({ duration: 240, easing: "cubic-bezier(.22,1,.36,1)", delay: 0, iterations: 1 }, opts || {});
    if (isSvg(el)) {
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
    }
    try {
      return el.animate(frames, o);
    } catch (err) {
      return null;
    }
  }

  function pop(el, opts) {
    return animate(el, [
      { transform: "scale(.82)", opacity: 0.35 },
      { transform: "scale(1.06)", opacity: 1, offset: 0.62 },
      { transform: "scale(1)", opacity: 1 },
    ], Object.assign({ duration: 230 }, opts || {}));
  }

  function shake(el, opts) {
    return animate(el, [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(-4px) rotate(-2deg)", offset: 0.2 },
      { transform: "translateX(4px) rotate(2deg)", offset: 0.45 },
      { transform: "translateX(-2.5px) rotate(-1deg)", offset: 0.7 },
      { transform: "translateX(0) rotate(0deg)" },
    ], Object.assign({ duration: 300, easing: "ease-in-out" }, opts || {}));
  }

  function hop(el, opts) {
    return animate(el, [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-9px) scale(1.12)", offset: 0.4 },
      { transform: "translateY(0) scale(.96)", offset: 0.76 },
      { transform: "translateY(0) scale(1)" },
    ], Object.assign({ duration: 300 }, opts || {}));
  }

  function deal(el, opts) {
    return animate(el, [
      { transform: "translate(24px,-16px) rotate(-7deg) scale(.78)", opacity: 0 },
      { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
    ], Object.assign({ duration: 260, delay: 10 }, opts || {}));
  }

  function spin(el, opts) {
    return animate(el, [
      { transform: "rotate(-14deg) scale(.96)" },
      { transform: "rotate(0deg) scale(1)" },
    ], Object.assign({ duration: 210 }, opts || {}));
  }

  function pulse(el, opts) {
    return animate(el, [
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.035)", filter: "brightness(1.18)", offset: 0.45 },
      { transform: "scale(1)", filter: "brightness(1)" },
    ], Object.assign({ duration: 340 }, opts || {}));
  }

  /** قلب ثلاثي الأبعاد لبطاقة أو بلاطة. */
  function flip(el, opts) {
    return animate(el, [
      { transform: "perspective(760px) rotateY(0deg) scale(1)" },
      { transform: "perspective(760px) rotateY(88deg) scale(.97)", offset: 0.48 },
      { transform: "perspective(760px) rotateY(0deg) scale(1)" },
    ], Object.assign({ duration: 430, easing: "cubic-bezier(.4,.1,.2,1)" }, opts || {}));
  }

  /** تحريك قطعة من موقعها الحالي إلى عنصر آخر (أو إحداثيات). */
  function movePiece(piece, target, opts) {
    if (!piece || !target || !motionEnabled() || typeof piece.getBoundingClientRect !== "function") return null;
    const o = Object.assign({ duration: 380, lift: 12 }, opts || {});
    const a = piece.getBoundingClientRect();
    let b;
    if (target.getBoundingClientRect) b = target.getBoundingClientRect();
    else if (Number.isFinite(target.x) && Number.isFinite(target.y)) b = { left: target.x, top: target.y, width: 0, height: 0 };
    else return null;
    if (!a.width && !a.height) return null;
    const dx = b.left + (b.width || 0) / 2 - (a.left + a.width / 2);
    const dy = b.top + (b.height || 0) / 2 - (a.top + a.height / 2);
    return animate(piece, [
      { transform: "translate(0,0) scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
      { transform: "translate(" + dx * 0.55 + "px," + (dy * 0.55 - o.lift) + "px) scale(1.16)", filter: "drop-shadow(0 14px 18px rgba(0,0,0,.45))", offset: 0.55 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
    ], { duration: o.duration, easing: "cubic-bezier(.3,.7,.25,1)", fill: "forwards" });
  }

  /** دخول ناعم لعنصر أو شاشة كاملة. */
  function screenEnter(el, opts) {
    return animate(el, [
      { opacity: 0, transform: "translateY(14px) scale(.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], Object.assign({ duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }, opts || {}));
  }

  /** شريط عنوان عابر في منتصف الشاشة (بداية الدور، النرد، حدث مهم). */
  function banner(text, opts) {
    const o = Object.assign({ tone: "", duration: 1500, icon: "" }, opts || {});
    if (!motionEnabled()) return null;
    const node = document.createElement("div");
    node.className = "fx-banner" + (o.tone ? " " + o.tone : "");
    node.setAttribute("role", "status");
    node.innerHTML = (o.icon ? '<span class="fx-banner-icon" aria-hidden="true">' + o.icon + "</span>" : "") +
      '<span class="fx-banner-text">' + U.escape(text) + "</span>";
    document.body.appendChild(node);
    const anim = node.animate([
      { opacity: 0, transform: "translate(-50%,-50%) translateY(14px) scale(.94)" },
      { opacity: 1, transform: "translate(-50%,-50%) translateY(0) scale(1)", offset: 0.18 },
      { opacity: 1, transform: "translate(-50%,-50%) translateY(0) scale(1)", offset: 0.78 },
      { opacity: 0, transform: "translate(-50%,-50%) translateY(-12px) scale(1.02)" },
    ], { duration: o.duration, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
    const cleanup = () => { if (node.parentNode) node.parentNode.removeChild(node); };
    if (anim) anim.finished.then(cleanup).catch(cleanup);
    else setTimeout(cleanup, o.duration);
    return node;
  }

  /** شاشة نتيجة احتفالية داخل اللعبة. */
  function result(opts) {
    const o = Object.assign({ icon: "🏆", title: "", text: "", tone: "win" }, opts || {});
    const node = document.createElement("div");
    node.className = "fx-result " + (o.tone || "win");
    node.innerHTML =
      '<div class="fx-result-card">' +
      '<span class="fx-result-icon" aria-hidden="true">' + o.icon + "</span>" +
      '<h3>' + U.escape(o.title || "") + "</h3>" +
      (o.text ? "<p>" + U.escape(o.text) + "</p>" : "") +
      "</div>";
    document.body.appendChild(node);
    const anim = node.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.12 },
      { opacity: 1, offset: 0.84 },
      { opacity: 0 },
    ], { duration: o.duration || 2200, easing: "ease", fill: "forwards" });
    const cleanup = () => { if (node.parentNode) node.parentNode.removeChild(node); };
    if (anim) anim.finished.then(cleanup).catch(cleanup);
    else setTimeout(cleanup, o.duration || 2200);
    return node;
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function playerRow(index) {
    return document.querySelector('.carc-player[data-player="' + escapeSelector(index) + '"]') ||
      document.querySelector(".ttr-prow.active") ||
      document.querySelector(".mrow.active") ||
      null;
  }

  function floatText(target, text, tone, opts) {
    if (!motionEnabled()) return null;
    const o = Object.assign({ duration: 850, distance: 46 }, opts || {});
    let x = 0;
    let y = 0;
    if (target && target.getBoundingClientRect) {
      const rect = target.getBoundingClientRect();
      if (!rect.width && !rect.height) return null;
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
      x = target.x;
      y = target.y;
    } else {
      return null;
    }
    const node = document.createElement("span");
    node.className = "fx-float" + (tone ? " " + tone : "");
    node.textContent = text;
    node.style.left = U.clamp(x, 30, window.innerWidth - 30) + "px";
    node.style.top = U.clamp(y, 26, window.innerHeight - 26) + "px";
    document.body.appendChild(node);
    const anim = node.animate([
      { transform: "translate(-50%,-50%) translateY(6px) scale(.86)", opacity: 0 },
      { transform: "translate(-50%,-50%) translateY(-6px) scale(1)", opacity: 1, offset: 0.22 },
      { transform: "translate(-50%,-50%) translateY(-" + o.distance + "px) scale(1)", opacity: 0 },
    ], { duration: o.duration, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
    const cleanup = () => { if (node.parentNode) node.parentNode.removeChild(node); };
    if (anim) anim.finished.then(cleanup).catch(cleanup);
    else setTimeout(cleanup, o.duration);
    return node;
  }

  /* ------------------------------ أوراق طائرة وبطاقات تنقلب ------------------------------ */

  const activeFlights = new Set();

  /* نسخة من عنصر ورقة بلا أي معرّفات أو مستمعات حتى لا تتفاعل مع منطق اللعبة */
  function cloneForFlight(el) {
    if (!el || !el.cloneNode) return null;
    const node = el.cloneNode(true);
    Array.prototype.slice.call(node.attributes).forEach((attr) => {
      if (attr.name === "id" || attr.name === "disabled" || attr.name === "role" || attr.name === "aria-label" || attr.name.indexOf("data-") === 0) {
        node.removeAttribute(attr.name);
      }
    });
    Array.prototype.forEach.call(node.querySelectorAll("[id]"), (n) => n.removeAttribute("id"));
    node.setAttribute("aria-hidden", "true");
    node.tabIndex = -1;
    node.classList.remove("is-blocked", "is-drawn", "is-playable", "is-dim", "is-lift");
    node.classList.add("fx-card-ghost");
    return node;
  }

  /**
   * ورقة طائرة (بصرية فقط دون تأخير منطق اللعبة).
   * from: عنصر يُنسخ مظهره ويُلتقط موقعه الآن (استدعِها قبل إعادة رسم الواجهة إن كان المصدر سيُزال).
   * opts: { center: true } يبدأ من مركز المصدر بحجم الهدف (مقاعد اللاعبين)، ومظهر الهدف.
   * يعيد كائنًا فيه land(to, o): تحرّك النسخة إلى العنصر الهدف بقوس ودوران.
   *   o.face: "source" (الافتراضي) أو "target" لإظهار وجه الهدف.
   *   o.mode: "card" (الافتراضي: تستقر مكان الهدف ويُخفى الهدف حتى الوصول) أو "point" (تصغر وتختفي عند مركز الهدف).
   *   o.delay / o.duration / o.onDone.
   * إن كانت الحركة معطّلة أو العناصر غير مرئية فلا يحدث شيء ولا يضرّ ذلك باللعبة.
   */
  function cardFlight(from, opts) {
    const idle = { land() { return null; } };
    if (!motionEnabled() || !from || !from.getBoundingClientRect) return idle;
    const start = from.getBoundingClientRect();
    if (!start.width && !start.height) return idle;
    const center = !!(opts && opts.center);
    const own = center ? null : cloneForFlight(from);
    if (!center && !own) return idle;
    return {
      land(to, lo) {
        if (!to || !to.getBoundingClientRect) return null;
        const end = to.getBoundingClientRect();
        if (!end.width && !end.height) return null;
        const l = Object.assign({ face: "source", mode: "card", delay: 0, duration: 0, onDone: null }, lo || {});
        const useTarget = l.face === "target" || !own;
        const ghost = useTarget ? cloneForFlight(to) : own;
        if (!ghost || !ghost.animate) return null;
        const point = l.mode === "point";
        let sw = start.width;
        let sh = start.height;
        let sx = start.left;
        let sy = start.top;
        if (useTarget) {
          sw = end.width;
          sh = end.height;
          sx = start.left + start.width / 2 - sw / 2;
          sy = start.top + start.height / 2 - sh / 2;
        }
        ghost.style.setProperty("--cw", sw + "px");
        ghost.style.left = sx + "px";
        ghost.style.top = sy + "px";
        ghost.style.width = sw + "px";
        ghost.style.height = sh + "px";
        document.body.appendChild(ghost);
        const dx = end.left + end.width / 2 - (sx + sw / 2);
        const dy = end.top + end.height / 2 - (sy + sh / 2);
        const scale = point ? 0.35 : U.clamp(end.width / (sw || 1), 0.2, 3);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lift = Math.min(70, 16 + dist * 0.12);
        const tilt = (dx >= 0 ? 1 : -1) * (5 + Math.min(9, dist / 70));
        const duration = l.duration || Math.min(640, 330 + dist * 0.35);
        let hidden = null;
        if (!point) {
          hidden = to.style.visibility;
          to.style.visibility = "hidden";
        }
        const anim = ghost.animate([
          { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1, offset: 0 },
          { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - lift) + "px) rotate(" + tilt + "deg) scale(" + ((1 + scale) / 2) * 1.06 + ")", opacity: 1, offset: 0.55 },
          { transform: "translate(" + dx + "px," + dy + "px) rotate(0deg) scale(" + scale + ")", opacity: point ? 0.05 : 1, offset: 1 },
        ], { duration, delay: l.delay, easing: "cubic-bezier(.3,.75,.3,1)", fill: "both" });
        let timer = null;
        const flight = {
          cancel() {
            if (!activeFlights.has(flight)) return;
            activeFlights.delete(flight);
            clearTimeout(timer);
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
            if (hidden !== null) to.style.visibility = hidden;
          },
        };
        const finish = () => {
          if (!activeFlights.has(flight)) return;
          flight.cancel();
          if (l.onDone) l.onDone();
        };
        activeFlights.add(flight);
        if (anim && anim.finished) anim.finished.then(finish, finish);
        timer = setTimeout(finish, duration + l.delay + 450);
        return flight;
      },
    };
  }

  /* إلغاء كل الأوراق الطائرة الجارية (عند إغلاق اللعبة) */
  function cancelFlights() {
    Array.from(activeFlights).forEach((flight) => flight.cancel());
  }

  /**
   * بطاقة كبيرة تطلع وتنقلب في وسط الشاشة ثم تطير إلى مكانها (بطاقات الحظ وصندوق المجتمع...).
   * بصرية فقط. opts: { kicker, title, text, tone: "chance"|"chest", icon, hold, from, to }
   * from وto عنصر أو دالة تعيد عنصرًا. يعيد دالة إلغاء.
   */
  function revealCard(opts) {
    const o = Object.assign({ kicker: "", title: "", text: "", tone: "", icon: "🃏", hold: 1200, from: null, to: null }, opts || {});
    if (!motionEnabled() || !document.body.animate) return function () {};
    const layer = document.createElement("div");
    layer.className = "fx-reveal" + (o.tone ? " is-" + o.tone : "");
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML =
      '<div class="fx-reveal-inner">' +
      '<div class="fx-reveal-face back"><b>' + U.escape(o.icon) + "</b><span>" + U.escape(o.kicker) + "</span></div>" +
      '<div class="fx-reveal-face front"><small>' + U.escape(o.kicker) + "</small><strong>" + U.escape(o.title) + "</strong><p>" + U.escape(o.text) + "</p></div>" +
      "</div>";
    document.body.appendChild(layer);
    const inner = layer.firstChild;
    const pick = (value) => (typeof value === "function" ? value() : value);
    const offsetTo = (el, fallback) => {
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        if (rect.width || rect.height) {
          return { x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 };
        }
      }
      return fallback;
    };
    const base = "translate(-50%,-50%) ";
    const from = offsetTo(pick(o.from), { x: 0, y: 70 });
    layer.animate([
      { transform: base + "translate(" + from.x + "px," + from.y + "px) scale(0.4) rotate(-10deg)", opacity: 0, offset: 0 },
      { transform: base + "translate(0,0) scale(1.08) rotate(0deg)", opacity: 1, offset: 0.7 },
      { transform: base + "translate(0,0) scale(1) rotate(0deg)", opacity: 1, offset: 1 },
    ], { duration: 460, easing: "cubic-bezier(.25,.85,.3,1)", fill: "both" });
    inner.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], { duration: 520, delay: 260, easing: "cubic-bezier(.4,.1,.2,1)", fill: "both" });
    const remove = () => { if (layer.parentNode) layer.parentNode.removeChild(layer); };
    const exitAt = 260 + 520 + o.hold;
    const exitTimer = setTimeout(() => {
      const to = offsetTo(pick(o.to), { x: 0, y: 140 });
      layer.animate([
        { transform: base + "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: base + "translate(" + to.x + "px," + to.y + "px) scale(0.3) rotate(6deg)", opacity: 0 },
      ], { duration: 400, easing: "cubic-bezier(.5,0,.8,.4)", fill: "both" });
    }, exitAt);
    const removeTimer = setTimeout(remove, exitAt + 440);
    return function cancel() {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
      remove();
    };
  }

  /* ------------------------------ نرد في منتصف اللوحة عند الحاجة إلى الرمي ------------------------------ */

  /* كل إدخال: زر الرمي الموجود في اللعبة، واللوحة التي يظهر النرد في منتصفها، وعدد النردات.
     النرد ينوب عن الزر الأصلي: يظهر فقط حين يكون الزر مفعّلًا (أي حين يحقّ لك الرمي)،
     وعند النقر عليه يضغط الزر نفسه، فتبقى كل شروط اللعبة ومنطقها دون تغيير. */
  const ROLL_PADS = [
    { btn: "[data-sn-roll]", host: ".sn-board", dice: 1 },
    { btn: "[data-ld-roll]", host: ".ld-board", dice: 1 },
    { btn: "[data-pc-roll]", host: ".pc-board", dice: 2 },
    { btn: '[data-act="roll"]', host: ".tav-board", dice: 2 },
    { btn: ".cat-roll", host: ".cat-board-wrap", dice: 2 },
    /* أزرار إجراء: label وicon بدل عدد النرد. blockers: إن وجد أي عنصر يطابقها فهناك فعل آخر ممكن فلا يظهر الزر. */
    { btn: "[data-pc-end]", host: ".pc-board", icon: "✅", label: "إنهاء الدور" },
    { btn: "[data-sy-draw]", host: ".sy-board", icon: "🃏", label: "اسحب بطاقة" },
    { btn: "[data-sy-skip]", host: ".sy-board", icon: "⏭", label: "تخطَّ الدور", blockers: "[data-sy-move],[data-sy-sorry]" },
  ];

  /* أيقونات SVG موحّدة بدل الإيموجي (تظهر بنفس الشكل على كل الأجهزة) */
  const PAD_ICONS = {
    check: '<svg viewBox="4 4 24 24" aria-hidden="true"><path d="M7.4 16.9l5.7 5.7L25 10" fill="none" stroke="#6ff2b4" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    card: '<svg viewBox="1 2 30 28" aria-hidden="true"><g transform="rotate(-14 13 17)"><rect x="5.5" y="5.5" width="14" height="20" rx="2.8" fill="#2f86a0" stroke="#c4f1ff" stroke-width="1.5"/><path d="M12.5 10.5l3.3 5.2-3.3 5.2-3.3-5.2z" fill="#c4f1ff" opacity=".85"/></g><g transform="rotate(11 20 17)"><rect x="12.5" y="5.5" width="14" height="20" rx="2.8" fill="#fff8e6" stroke="#f0c25a" stroke-width="1.5"/><path d="M19.5 10.5l3.3 5.2-3.3 5.2-3.3-5.2z" fill="#e9a932"/></g></svg>',
    skip: '<svg viewBox="4 4 24 24" aria-hidden="true"><path d="M23.5 8l-8 8 8 8M14 8l-8 8 8 8" fill="none" stroke="#ffd36b" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="4 3 24 26" aria-hidden="true"><path d="M25.2 12.6A9.6 9.6 0 0 0 8.4 9.6M7.4 4.8v5.4h5.4M6.8 19.4a9.6 9.6 0 0 0 16.8 3M24.6 27.2v-5.4h-5.4" fill="none" stroke="#7fd9ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    domino: '<svg viewBox="4 2 24 28" aria-hidden="true"><rect x="7" y="3.5" width="18" height="25" rx="3.6" fill="#fff8e6" stroke="#f0c25a" stroke-width="1.7"/><path d="M9.5 16h13" stroke="#c98a1f" stroke-width="1.7"/><circle cx="12.6" cy="9" r="1.7" fill="#2b2b33"/><circle cx="19.4" cy="12.4" r="1.7" fill="#2b2b33"/><circle cx="12.4" cy="20.2" r="1.7" fill="#2b2b33"/><circle cx="16" cy="23.2" r="1.7" fill="#2b2b33"/><circle cx="19.6" cy="26.2" r="1.7" fill="#2b2b33"/></svg>',
  };
  const PAD_ICON_OF = { "✅": "check", "🂠": "card", "🃏": "card", "⏭": "skip", "⏭️": "skip", "🔄": "next", "🁣": "domino" };

  /* زر إجراء كبير: ميدالية بأيقونة + شريط نص ذهبي */
  function buildActionPad(icon, text) {
    const pad = document.createElement("button");
    pad.type = "button";
    pad.className = "fx-rollpad is-action";
    pad.setAttribute("aria-label", text);
    const disc = document.createElement("span");
    disc.className = "fx-pad-disc";
    const ic = document.createElement("span");
    ic.className = "fx-pad-icon";
    const key = PAD_ICON_OF[icon];
    if (key) ic.innerHTML = PAD_ICONS[key];
    else ic.textContent = icon;
    disc.appendChild(ic);
    const label = document.createElement("small");
    label.textContent = text;
    pad.appendChild(disc);
    pad.appendChild(label);
    return pad;
  }

  function makeRollPad(button, cfg) {
    if (cfg.label) {
      const action = buildActionPad(cfg.icon || "✅", cfg.label);
      action._btn = button;
      action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (action.disabled) return;
        action.disabled = true;
        if (button.isConnected && !button.disabled) button.click();
      });
      return action;
    }
    const count = cfg.dice || 1;
    const pad = document.createElement("button");
    pad.type = "button";
    pad.className = "fx-rollpad";
    pad.setAttribute("aria-label", "ارمِ النرد");
    const wrap = document.createElement("span");
    wrap.className = "fx-rollpad-dice";
    const dice = [];
    for (let i = 0; i < count; i++) {
      const die = document.createElement("span");
      die.className = "fx-tumble-die";
      for (let k = 0; k < 9; k++) die.appendChild(document.createElement("i"));
      wrap.appendChild(die);
      dice.push(die);
    }
    const disc = document.createElement("span");
    disc.className = "fx-pad-disc is-dice" + (count === 1 ? " is-single" : "");
    disc.appendChild(wrap);
    const label = document.createElement("small");
    label.textContent = "ارمِ النرد";
    pad.appendChild(disc);
    pad.appendChild(label);
    const randomFace = () => 1 + Math.floor(Math.random() * 6);
    dice.forEach((die) => setTumbleFace(die, randomFace()));
    /* تتبدّل أوجه النرد ببطء لجذب الانتباه، ويتوقف المؤقّت من تلقاء نفسه عند إزالة اللوحة */
    const timer = setInterval(() => {
      if (!pad.isConnected) {
        clearInterval(timer);
        return;
      }
      dice.forEach((die) => setTumbleFace(die, randomFace()));
    }, 900);
    pad._btn = button;
    pad.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pad.disabled) return;
      pad.disabled = true;
      if (button.isConnected && !button.disabled) button.click();
    });
    return pad;
  }

  function syncRollPads() {
    ROLL_PADS.forEach((cfg, index) => {
      const host = document.querySelector(cfg.host);
      if (!host) return;
      const btn = document.querySelector(cfg.btn);
      const existing = host.querySelector(':scope > .fx-rollpad[data-pad="' + index + '"]');
      const blocked = !!cfg.blockers && !!document.querySelector(cfg.blockers);
      const wanted = !!btn && !btn.disabled && !blocked && btn.getClientRects().length > 0;
      if (!wanted) {
        if (existing) existing.remove();
        return;
      }
      if (existing && existing._btn === btn) return;
      if (existing) existing.remove();
      if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
      const pad = makeRollPad(btn, cfg);
      pad.setAttribute("data-pad", String(index));
      host.appendChild(pad);
    });
  }

  /**
   * زر إجراء كبير في منتصف اللوحة (إنهاء الدور، سحب ورقة، تمرير...) تستدعيه اللعبة بنفسها بعد كل رسم.
   * host: عنصر اللوحة. spec: { key, icon, label, onClick } أو null لإزالته.
   * تكرار الاستدعاء بنفس key لا يُعيد بناء الزر (لا وميض، ولا تضيع نقرة).
   */
  function centerPad(host, spec) {
    if (!host || !host.querySelector) return null;
    const existing = host.querySelector(':scope > .fx-rollpad[data-pad="game"]');
    if (!spec) {
      if (existing) existing.remove();
      return null;
    }
    if (existing && existing._key === spec.key) {
      existing._onClick = spec.onClick;
      return existing;
    }
    if (existing) existing.remove();
    if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
    const pad = buildActionPad(spec.icon || "✅", spec.label || "");
    pad.setAttribute("data-pad", "game");
    pad._key = spec.key;
    pad._onClick = spec.onClick;
    pad.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pad.disabled) return;
      pad.disabled = true;
      setTimeout(() => { if (pad.isConnected) pad.disabled = false; }, 800);
      if (typeof pad._onClick === "function") pad._onClick();
    });
    host.appendChild(pad);
    return pad;
  }

  let rollPadScheduled = false;
  function scheduleRollPads() {
    if (rollPadScheduled) return;
    rollPadScheduled = true;
    requestAnimationFrame(() => {
      rollPadScheduled = false;
      syncRollPads();
    });
  }
  if (typeof MutationObserver === "function" && document.body) {
    new MutationObserver(scheduleRollPads).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
  }

  /* ------------------------------ وضع «اللوحة فقط» ------------------------------ */
  /* ------------------------------ وضع «اللوحة فقط» ------------------------------ */
  /* وضع تركيز كامل: يخفي واجهة الموقع وشريط الأدوات، يحوّل اللوحات الجانبية إلى
     درج منزلق يمكن فتحه عند الحاجة، ويعرض شريط أوامر سفلياً ثابتاً فيه زر خروج دائم.
     لا يُخفى أي جزء من منطقة اللعب الأساسية، ولا تُمس أوراق اللاعب السرّية. */
  const BO_KEY = "bg-board-only";
  const BO_SIDE = /(^|[\s_-])(side|aside|sidebar|rail)([\s_-]|$)/i;
  const BO_SKIP = ".bg-win-tools,.bg-win-hint,.bo-tray,.bo-drawer-bar,.bo-scrim";
  const BO_ACTION_SKIP = BO_SKIP + ",.secret-toggle";
  let boOn = false;
  let boActive = false;
  let boApplying = false;
  let boLayout = null;
  let boBoard = null;
  let boSide = null;
  let boFit = null;
  let boTray = null;
  let boTrayStatus = null;
  let boTrayActions = null;
  let boTrayObserver = null;
  let boDrawerBar = null;
  let boScrim = null;
  let boObservers = [];
  let boFitFrame = 0;
  let boFitPass = 0;
  let boSyncFrame = 0;
  let boDrawerOpen = false;
  let boLastFocus = null;
  let boQuick = [];

  const boStage = () => document.getElementById("gameStage");
  const boView = () => document.getElementById("gameView");
  const boMount = () => {
    const stage = boStage();
    return stage ? stage.querySelector(".game-mount") : null;
  };
  const boTitle = () => {
    const el = document.getElementById("gameTitle");
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  };
  function boCanRun() {
    const view = boView();
    const mount = boMount();
    return !!(view && !view.hidden && mount && !mount.hidden && mount.children.length);
  }
  const boReal = (el) => el.nodeType === 1 && el.tagName !== "SCRIPT" && el.tagName !== "STYLE" &&
    !el.classList.contains("bo-tray") && !el.classList.contains("bo-drawer-bar") &&
    !el.classList.contains("bo-scrim") && !el.hasAttribute("hidden");
  function boArea(el) {
    const r = el.getBoundingClientRect();
    return (r.width || 0) * (r.height || 0);
  }
  const boClass = (el) => (el.className && el.className.baseVal != null ? el.className.baseVal : String(el.className || ""));
  function boIsSide(el) {
    if (!el || el.nodeType !== 1) return false;
    /* النافذة العائمة اختار المستخدم تحريرها بنفسه؛ لا نحوّلها إلى درج. */
    if (el.classList.contains("bg-window-float")) return false;
    return el.tagName === "ASIDE" || el.getAttribute("role") === "complementary" ||
      el.hasAttribute("data-bo-side") || BO_SIDE.test(boClass(el));
  }

  /* يحدّد حاوية التخطيط واللوحة الرئيسية واللوحات الجانبية. لا نخفي أياً من
     أبناء منطقة اللعب غير الجانبيين، حتى لا تختفي أزرار أو نتائج ضرورية. */
  function boBestBox(root, sides) {
    let best = null;
    root.querySelectorAll("*").forEach((el) => {
      if (el.nodeType !== 1 || el.closest(".bo-side") || el.closest(BO_SKIP)) return;
      if (sides && sides.some((side) => side.contains(el))) return;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
      const style = window.getComputedStyle(el);
      if (style.display === "contents" || style.display === "none" || style.visibility === "hidden") return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 160 || rect.height < 110) return;
      const ratio = rect.width / rect.height;
      if (ratio < 0.3 || ratio > 5) return;
      let score = rect.width * rect.height;
      if (/board|map|table|field|grid/i.test(boClass(el))) score *= 1.25;
      if (rect.width >= (root.clientWidth || 0) * 0.8) score *= 1.1;
      if (!best || score > best.score) best = { el: el, score: score };
    });
    return best ? best.el : null;
  }

  function boFind(stage) {
    let node = stage;
    for (let depth = 0; depth < 8; depth++) {
      const kids = Array.from(node.children).filter(boReal);
      if (!kids.length) return { layout: node, board: null, sides: [] };
      if (kids.length === 1) {
        node = kids[0];
        continue;
      }
      const sides = kids.filter(boIsSide);
      if (!sides.length) {
        /* أحياناً تكون اللوحة واللوحة الجانبية معاً داخل حاوية واحدة مثل .cg-grid.
           نهبط إلى الحاوية التي تضم لوحة جانبية بدل اعتبار الحاوية كلها لوحة. */
        const deepSides = Array.from(node.querySelectorAll("aside, [role='complementary'], [data-bo-side], [class*='side']"))
          .filter((el) => el.parentElement !== node && boIsSide(el) && el.getBoundingClientRect().width > 40 && el.getBoundingClientRect().height > 40);
        const holder = deepSides.length
          ? kids.filter((kid) => deepSides.some((side) => kid.contains(side)))
              .sort((a, b) => boArea(b) - boArea(a))[0]
          : null;
        if (holder && holder !== node) {
          node = holder;
          continue;
        }
      }
      const rest = sides.length ? kids.filter((k) => sides.indexOf(k) < 0) : kids;
      const pool = rest.length ? rest : kids;
      const areas = pool.map(boArea);
      const max = Math.max.apply(null, areas);
      let board = pool[areas.indexOf(max)] || null;
      if (!sides.length) {
        const aside = stage.querySelector("aside");
        if (aside && aside !== board && board && !board.contains(aside) && !aside.contains(board)) sides.push(aside);
      }
      const boxless = board && (getComputedStyle(board).display === "contents" || !boArea(board) || !board.getClientRects().length);
      if (!board || boxless) {
        const deep = boBestBox(node, sides);
        if (deep) board = deep;
      }
      return { layout: node, board: board, sides: sides };
    }
    const sides = [];
    const deep = boBestBox(node, sides);
    return { layout: node, board: deep, sides: sides };
  }

  /* يختار اللوحة البصرية داخل منطقة اللعب (رقعة/خريطة/SVG) لتكبيرها أو ملاءمتها. */
  function boPickVisual(board) {
    if (!board) return null;
    const boardArea = boArea(board);
    if (!boardArea) return null;
    let best = null;
    board.querySelectorAll("*").forEach((el) => {
      if (el === board || el.closest(".bo-side") || el.closest(BO_SKIP)) return;
      /* اسم وسم SVG في مستندات HTML بحروف صغيرة (svg)، لذلك لا يكفي
         مقارنته بـ"SVG" وإلا فاتت خرائط كاتان وريسك وبانديميك. لكن فحص
         namespaceURI يطابق كل عناصر SVG الداخلية أيضاً، مثل مسار الأرض في
         بانديميك، فيُختار المسار خطأً كهدف للملاءمة. نريد عنصر <svg> نفسه. */
      const graphic = el.tagName.toLowerCase() === "svg" || el.tagName === "CANVAS";
      const cls = boClass(el);
      if (!(graphic || /board|map/i.test(cls))) return;
      if (/cell|space|pit|tile|piece|token|card|die|room|marker|chip|slot|spot|cross/i.test(cls) && !/board|map/i.test(cls)) return;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area < boardArea * 0.14 || r.width < 140 || r.height < 110) return;
      const ratio = r.width / r.height;
      if (ratio < 0.32 || ratio > 3.4) return;
      /* لا نختار حاوية كبيرة بلا نسبة أو رسم قابل للتحجيم، وإلا حجبت
         المرشح الصحيح خلفها (مثل حاوية بانديميك التي تضم الخريطة والرأس). */
      const style = window.getComputedStyle(el);
      const hasRatio = style.aspectRatio && style.aspectRatio !== "auto" && style.aspectRatio !== "none";
      const square = Math.abs(ratio - 1) <= 0.06;
      if (!(graphic || hasRatio || square)) return;
      let score = area;
      if (/board|map/i.test(cls) || graphic) score *= 1.18;
      if (!best || score > best.score) best = { el: el, area: area, ratio: ratio, score: score, graphic: graphic };
    });
    return best;
  }

  function boClearMarks() {
    document.querySelectorAll(".bo-square,.bo-fit,.bo-grow").forEach((el) => {
      el.classList.remove("bo-square", "bo-fit", "bo-grow");
      if (el.style) {
        el.style.removeProperty("--bo-square-size");
        el.style.removeProperty("--bo-fit-w");
      }
    });
    boFit = null;
  }

  function boMarkVisual(board) {
    const visual = boPickVisual(board);
    if (!visual) return null;
    /* رقعة كاركاسون تُبنى بأبعاد داخلية ثابتة ومواضع مطلقة؛ نتركها كاملة
       ونمنحها مساحة الوضع بدل فرض نسبة أو تحجيم قد يقصّ أجزاءها. */
    if (visual.el.closest(".carc-board-wrap")) return null;
    const square = Math.abs(visual.ratio - 1) <= 0.06;
    const style = window.getComputedStyle(visual.el);
    const hasRatio = style.aspectRatio && style.aspectRatio !== "auto" && style.aspectRatio !== "none";
    const scalable = visual.graphic || hasRatio || square;
    if (!scalable) return null;
    const shellFit = !square && visual.area >= boArea(board) * 0.7;
    const target = shellFit ? board : visual.el;
    target.classList.add(square ? "bo-square" : "bo-fit");
    if (square) {
      let parent = visual.el.parentElement;
      while (parent && parent !== board && parent.nodeType === 1) {
        if (parent.classList.contains("bo-side")) break;
        parent.classList.add("bo-grow");
        parent = parent.parentElement;
      }
    }
    return { el: target, visual: visual.el, shell: board, square: square };
  }

  /* ------------------------------ درج اللوحات الجانبية ------------------------------ */

  function boEnsureDrawer() {
    if (!boDrawerBar) {
      boDrawerBar = document.createElement("div");
      boDrawerBar.className = "bo-drawer-bar";
      boDrawerBar.hidden = true;
      boDrawerBar.innerHTML =
        '<span class="bo-drawer-title">لوحات اللعبة</span>' +
        '<button type="button" class="bo-drawer-close" data-bo-drawer-close aria-label="إغلاق اللوحات" title="إغلاق اللوحات"><span aria-hidden="true">✕</span><span>إغلاق</span></button>';
      boDrawerBar.addEventListener("click", (event) => {
        if (event.target.closest("[data-bo-drawer-close]")) boSetDrawer(false, true);
      });
      document.body.appendChild(boDrawerBar);
    }
    if (!boScrim) {
      boScrim = document.createElement("button");
      boScrim.type = "button";
      boScrim.className = "bo-scrim";
      boScrim.hidden = true;
      boScrim.setAttribute("aria-label", "إغلاق لوحات اللعبة");
      boScrim.setAttribute("tabindex", "-1");
      boScrim.addEventListener("click", () => boSetDrawer(false, true));
      document.body.appendChild(boScrim);
    }
  }

  function boUpdateDrawerUi() {
    if (boTray) {
      const tools = boTray.querySelector('[data-bo-tool="tools"]');
      if (tools) {
        tools.setAttribute("aria-expanded", boDrawerOpen ? "true" : "false");
        tools.classList.toggle("is-active", boDrawerOpen);
        tools.setAttribute("aria-label", boDrawerOpen ? "إغلاق لوحات اللعبة" : "لوحات اللعبة والأدوات");
        tools.title = boDrawerOpen ? "إغلاق لوحات اللعبة" : "لوحات اللعبة والأدوات";
      }
    }
    if (boDrawerBar) boDrawerBar.hidden = !boDrawerOpen;
    if (boScrim) boScrim.hidden = !boDrawerOpen;
  }

  function boSetDrawer(open, restoreFocus) {
    const next = !!open && !!boSide && boActive;
    if (next === boDrawerOpen) {
      boUpdateDrawerUi();
      return;
    }
    if (next) boLastFocus = document.activeElement;
    boDrawerOpen = next;
    document.body.classList.toggle("bo-drawer-open", next);
    boEnsureDrawer();
    boUpdateDrawerUi();
    if (next) {
      requestAnimationFrame(() => {
        const candidates = boSide ? Array.from(boSide.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) : [];
        const first = candidates.find((el) => {
          if (el.hasAttribute("hidden") || el.closest("[hidden]")) return false;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          return el.getClientRects().length > 0;
        });
        const close = boDrawerBar && boDrawerBar.querySelector("[data-bo-drawer-close]");
        try { (close || first || boDrawerBar).focus({ preventScroll: true }); } catch (error) { /* لا تهم */ }
      });
    } else {
      if (restoreFocus && boLastFocus && document.contains(boLastFocus) && typeof boLastFocus.focus === "function") {
        try { boLastFocus.focus({ preventScroll: true }); } catch (error) { /* لا تهم */ }
      }
      boLastFocus = null;
      boScheduleFit();
    }
  }

  function boSetupSide(side) {
    if (!side) return;
    side.classList.add("bo-side");
    if (!side.hasAttribute("aria-label")) {
      side.setAttribute("aria-label", "لوحات اللعبة والأدوات");
      side.setAttribute("data-bo-aria", "");
    }
    boEnsureDrawer();
    boUpdateDrawerUi();
  }

  function boClearSides() {
    document.querySelectorAll(".bo-side").forEach((el) => {
      el.classList.remove("bo-side");
      if (el.hasAttribute("data-bo-aria")) {
        el.removeAttribute("aria-label");
        el.removeAttribute("data-bo-aria");
      }
    });
    document.querySelectorAll(".bo-side-extra").forEach((el) => {
      el.classList.remove("bo-side-extra", "bo-hide");
    });
  }

  /* ------------------------------ شريط الأوامر ------------------------------ */

  function boQuickActions(side) {
    if (!side) return [];
    const list = [];
    side.querySelectorAll("button, [role='button']").forEach((button) => {
      if (!button || button.closest(BO_ACTION_SKIP)) return;
      if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
      if (button.hasAttribute("hidden") || button.closest("[hidden]")) return;
      if (button.closest("details:not([open])")) return;
      if (!button.getClientRects().length) return;
      const text = (button.getAttribute("aria-label") || button.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 26) return;
      if (list.some((item) => item.text === text)) return;
      list.push({ el: button, text: text, primary: button.classList.contains("primary") });
    });
    list.sort((a, b) => Number(b.primary) - Number(a.primary));
    return list.slice(0, 10);
  }

  /* زر الرمي الفعلي عندما يكون نرد منتصف اللوحة ظاهراً. نضيفه إلى شريط
     الأوامر السفلي أيضاً، لأن زر اللعبة الأصلي قد يكون خارج الدرج الجانبي. */
  function boRollTarget() {
    for (let i = 0; i < ROLL_PADS.length; i++) {
      const cfg = ROLL_PADS[i];
      if (!cfg.dice) continue;
      const host = document.querySelector(cfg.host);
      if (!host || !host.querySelector(':scope > .fx-rollpad[data-pad="' + i + '"]')) continue;
      const btn = document.querySelector(cfg.btn);
      if (!btn || btn.disabled || !btn.getClientRects().length) continue;
      return btn;
    }
    return null;
  }

  function boWithRoll(items) {
    const btn = boRollTarget();
    if (!btn) return items;
    /* إن كان زر الرمي الأصلي ظاهراً في الشريط نرفعه إلى شريحة رئيسية موحّدة */
    let upgraded = false;
    const next = items.map((item) => {
      if (item.el !== btn && !/ارم[ِ]?\s*النرد/.test(item.text)) return item;
      if (upgraded) return null;
      upgraded = true;
      const text = item.el === btn ? "🎲 " + item.text.replace(/^🎲\s*/, "") : "🎲 ارمِ النرد";
      return { el: item.el, text: text, primary: true, roll: true };
    }).filter(Boolean);
    if (upgraded) return next;
    return [{ el: btn, text: "🎲 ارمِ النرد", primary: true, roll: true }].concat(items);
  }

  function boBuildTray() {
    if (boTray) return;
    boTray = document.createElement("div");
    boTray.className = "bo-tray";
    boTray.setAttribute("role", "toolbar");
    boTray.setAttribute("aria-label", "شريط وضع اللوحة فقط");
    boTray.innerHTML =
      '<div class="bo-tray-scroll" data-bo-scroll>' +
        '<span class="bo-status" data-bo-status hidden></span>' +
        '<div class="bo-actions" data-bo-actions role="group" aria-label="أوامر اللعبة"></div>' +
      '</div>' +
      '<div class="bo-tray-tools" role="group" aria-label="أدوات وضع اللوحة">' +
        '<button type="button" class="bo-tool" data-bo-tool="rules" aria-label="القواعد" title="القواعد"><span aria-hidden="true">📖</span><span class="bo-tool-label">القواعد</span></button>' +
        '<button type="button" class="bo-tool" data-bo-tool="new" aria-label="لعبة جديدة" title="لعبة جديدة"><span aria-hidden="true">↻</span><span class="bo-tool-label">جديدة</span></button>' +
        '<button type="button" class="bo-tool" data-bo-tool="tools" aria-label="لوحات اللعبة والأدوات" aria-expanded="false" title="لوحات اللعبة والأدوات"><span aria-hidden="true">☰</span><span class="bo-tool-label">الأدوات</span></button>' +
        '<button type="button" class="bo-tool bo-exit" data-bo-tool="exit" aria-label="الخروج من وضع اللوحة فقط (Esc)" aria-keyshortcuts="Escape" title="الخروج من وضع اللوحة فقط (Esc)"><span aria-hidden="true">✕</span><span class="bo-tool-label">خروج</span></button>' +
      '</div>';
    boTray.addEventListener("click", boTrayClick);
    document.body.appendChild(boTray);
    boTrayStatus = boTray.querySelector("[data-bo-status]");
    boTrayActions = boTray.querySelector("[data-bo-actions]");
    if (typeof ResizeObserver === "function") {
      boTrayObserver = new ResizeObserver(boMeasureTray);
      boTrayObserver.observe(boTray);
    }
    boMeasureTray();
  }

  function boTrayClick(event) {
    const tool = event.target.closest("[data-bo-tool]");
    if (tool) {
      const action = tool.getAttribute("data-bo-tool");
      if (action === "exit") {
        setBoardOnly(false);
      } else if (action === "tools") {
        boSetDrawer(!boDrawerOpen, true);
      } else if (action === "rules") {
        const rules = document.getElementById("btnGameRules");
        if (rules) rules.click();
      } else if (action === "new") {
        const fresh = document.getElementById("btnGameNew");
        if (fresh && !fresh.hidden && !fresh.disabled) fresh.click();
      }
      return;
    }
    const chip = event.target.closest(".bo-chip");
    if (!chip || !boTray) return;
    const item = boTray._items && boTray._items[Number(chip.getAttribute("data-i"))];
    if (!item) return;
    let el = item.el;
    if (!el.isConnected || el.disabled) {
      if (item.roll) {
        el = boRollTarget();
      } else {
        const again = boSide && boQuickActions(boSide).find((candidate) => candidate.text === item.text);
        el = again ? again.el : null;
      }
    }
    if (el && !el.disabled) el.click();
  }

  function boMeasureTray() {
    if (!boTray) return;
    const height = Math.ceil(boTray.getBoundingClientRect().height);
    if (!height) return;
    boUpdateTrayScroll();
    if (boTray._height === height) return;
    boTray._height = height;
    document.body.style.setProperty("--bo-tray-h", height + "px");
    boScheduleFit();
  }

  /* يظهر تلاشٍ خفيف عند طرف شريط الأوامر إن كانت هناك أوامر إضافية قابلة
     للتمرير، حتى لا يبدو الزر المقطوع خللاً في التخطيط. */
  function boUpdateTrayScroll() {
    if (!boTray) return;
    const scroll = boTray.querySelector("[data-bo-scroll]");
    if (!scroll) return;
    scroll.classList.toggle("bo-scrollable", scroll.scrollWidth > scroll.clientWidth + 2);
  }

  function boTraySync() {
    if (!boOn || !boActive) {
      boRemoveTray();
      return;
    }
    boBuildTray();
    if (boTray.parentNode !== document.body) document.body.appendChild(boTray);

    const statusEl = document.getElementById("gameStatus");
    let status = statusEl ? statusEl.textContent.replace(/\s+/g, " ").trim() : "";
    if (!status) status = boTitle();
    else {
      /* كثير من الألعاب تبدأ الحالة باسم اللعبة ثم شرطة. الشريط السفلي ضيق
         على 320px، وإزالة الاسم المكرر تُظهر الدور كاملاً بدل قصّه. */
      const title = boTitle();
      if (title && status.indexOf(title) === 0) {
        const rest = status.slice(title.length).replace(/^[\s—–\-·:|]+/, "").trim();
        if (rest) status = rest;
      }
    }
    const items = boWithRoll(boQuickActions(boSide));
    boQuick = items;
    boTray._items = items;

    const rules = document.getElementById("btnGameRules");
    const fresh = document.getElementById("btnGameNew");
    const tools = boTray.querySelector('[data-bo-tool="tools"]');
    const newTool = boTray.querySelector('[data-bo-tool="new"]');
    if (tools) tools.hidden = !boSide;
    if (newTool) newTool.hidden = !(fresh && !fresh.hidden && !fresh.disabled);
    const rulesTool = boTray.querySelector('[data-bo-tool="rules"]');
    if (rulesTool) rulesTool.hidden = !rules;
    boUpdateDrawerUi();

    const sig = status + "||" + items.map((item) => item.text + (item.primary ? "*" : "")).join("|") +
      "||" + (boSide ? "1" : "0") + (rules ? "1" : "0") + (fresh && !fresh.hidden && !fresh.disabled ? "1" : "0");
    if (boTray._sig === sig) {
      boMeasureTray();
      return;
    }
    boTray._sig = sig;
    if (boTrayStatus) {
      boTrayStatus.hidden = !status;
      boTrayStatus.textContent = status;
    }
    if (boTrayActions) {
      boTrayActions.textContent = "";
      items.forEach((item, index) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "bo-chip" + (item.primary ? " is-primary" : "");
        chip.setAttribute("data-i", String(index));
        chip.textContent = item.text;
        boTrayActions.appendChild(chip);
      });
    }
    boMeasureTray();
  }

  function boRemoveTray() {
    if (boTrayObserver) {
      boTrayObserver.disconnect();
      boTrayObserver = null;
    }
    if (boTray) {
      boTray.remove();
      boTray = null;
    }
    boTrayStatus = null;
    boTrayActions = null;
    boQuick = [];
    document.body.style.removeProperty("--bo-tray-h");
  }

  /* ------------------------------ الملاءمة ------------------------------ */

  function boScheduleFit() {
    if (!boActive || boFitFrame) return;
    boFitFrame = requestAnimationFrame(() => {
      boFitFrame = 0;
      boFitNow();
    });
  }

  function boFitNow() {
    if (!boActive || !boFit || !boTray) return;
    const stage = boStage();
    const mount = boMount();
    if (!stage || !mount || !boFit.el.isConnected) return;
    const trayRect = boTray.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const mountRect = mount.getBoundingClientRect();
    const bottom = Math.min(stageRect.bottom, trayRect.top) - 6;
    const viewBottom = bottom - mountRect.top + mount.scrollTop;
    const target = boFit.el;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const contentTop = rect.top - mountRect.top + mount.scrollTop;
    const available = Math.max(120, viewBottom - contentTop);
    const ratio = rect.width / rect.height;
    const maxWidth = Math.max(160, mount.clientWidth - 12);
    const size = boFit.square ? Math.min(available, maxWidth) : Math.min(available * ratio, maxWidth);
    if (size < 120) return;
    if (boFit.square) target.style.setProperty("--bo-square-size", Math.round(size) + "px");
    else target.style.setProperty("--bo-fit-w", Math.round(size) + "px");

    /* نتحقق من حد العنصر الهدف نفسه لا من الرسم الداخلي فقط. بعض الألواح
       تضم رأساً أو شريطاً سفلياً، وحساب الرسم وحده يتركها تنزل تحت الشريط. */
    const edge = target;
    const edgeRect = edge.getBoundingClientRect();
    const overflow = (edgeRect.bottom - mountRect.top + mount.scrollTop) - viewBottom;
    if (overflow > 1 && boFitPass < 2) {
      boFitPass += 1;
      const heightNow = boFit.square ? size : size / ratio;
      const nextHeight = Math.max(120, heightNow - overflow);
      const next = boFit.square ? nextHeight : nextHeight * ratio;
      target.style.setProperty(boFit.square ? "--bo-square-size" : "--bo-fit-w", Math.round(next) + "px");
      requestAnimationFrame(boFitNow);
    } else {
      boFitPass = 0;
    }
  }

  /* ------------------------------ التطبيق والتنظيف ------------------------------ */

  function boApply() {
    if (!boOn || !boActive || boApplying) return;
    const stage = boStage();
    if (!stage) return;
    boApplying = true;
    try {
      const found = boFind(stage);
      const layout = found.layout || stage;
      if (boLayout && boLayout !== layout) boLayout.classList.remove("bo-layout", "bo-flex");
      const display = window.getComputedStyle(layout).display;
      boLayout = layout;
      boLayout.classList.add("bo-layout");
      boLayout.classList.toggle("bo-flex", display === "flex" || display === "inline-flex");
      if (boBoard && boBoard !== found.board) boBoard.classList.remove("bo-board");
      boBoard = found.board;
      if (boBoard) boBoard.classList.add("bo-board");
      const nextSide = found.sides[0] || null;
      if (nextSide !== boSide) {
        boClearSides();
        boSide = nextSide;
        if (boSide) boSetupSide(boSide);
        if (!boSide && boDrawerOpen) boSetDrawer(false, false);
      }
      stage.querySelectorAll(".bo-side-extra").forEach((el) => {
        if (found.sides.indexOf(el) < 0) el.classList.remove("bo-side-extra", "bo-hide");
      });
      found.sides.slice(1).forEach((extra) => {
        if (extra !== boSide) extra.classList.add("bo-side-extra", "bo-hide");
      });
      const keepFit = boFit && boFit.el.isConnected && boFit.visual.isConnected && boFit.shell === boBoard;
      if (!keepFit) {
        boClearMarks();
        boFitPass = 0;
        boFit = boMarkVisual(boBoard);
      }
      boTraySync();
      boScheduleFit();
    } finally {
      boApplying = false;
    }
  }

  function boClear() {
    if (boSyncFrame) {
      cancelAnimationFrame(boSyncFrame);
      boSyncFrame = 0;
    }
    if (boFitFrame) {
      cancelAnimationFrame(boFitFrame);
      boFitFrame = 0;
    }
    boRemoveTray();
    boSetDrawer(false, false);
    if (boDrawerBar) {
      boDrawerBar.remove();
      boDrawerBar = null;
    }
    if (boScrim) {
      boScrim.remove();
      boScrim = null;
    }
    document.querySelectorAll(".bo-hide,.bo-side-extra").forEach((el) => el.classList.remove("bo-hide", "bo-side-extra"));
    document.querySelectorAll(".bo-layout,.bo-board,.bo-square,.bo-fit,.bo-grow").forEach((el) => {
      el.classList.remove("bo-layout", "bo-flex", "bo-board", "bo-square", "bo-fit", "bo-grow");
      if (el.style) {
        el.style.removeProperty("--bo-square-size");
        el.style.removeProperty("--bo-fit-w");
      }
    });
    boClearSides();
    boLayout = null;
    boBoard = null;
    boSide = null;
    boFit = null;
    boFitPass = 0;
    document.body.classList.remove("board-only", "bo-drawer-open");
    document.body.style.removeProperty("--bo-tray-h");
  }

  function boSync() {
    const can = boOn && boCanRun();
    if (can !== boActive) {
      boActive = can;
      document.body.classList.toggle("board-only", can);
      if (can) {
        boFitPass = 0;
        const mount = boMount();
        if (mount) mount.scrollTop = 0;
        boApply();
      } else {
        boClear();
      }
      requestAnimationFrame(() => {
        try { window.dispatchEvent(new Event("resize")); } catch (error) { /* لا تهم */ }
      });
    } else if (can) {
      boApply();
    }
    boUpdateButtons();
  }

  function boRequestSync() {
    if (boSyncFrame) return;
    boSyncFrame = requestAnimationFrame(() => {
      boSyncFrame = 0;
      boSync();
    });
  }

  function boUpdateButtons() {
    ["btnGameBoardOnly", "btnFsBoardOnly"].forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.setAttribute("aria-pressed", boOn ? "true" : "false");
      button.setAttribute("aria-label", boOn ? "إيقاف وضع اللوحة فقط (Esc)" : "تفعيل وضع اللوحة فقط");
      button.setAttribute("aria-keyshortcuts", "Escape");
      button.title = boOn ? "إيقاف وضع اللوحة فقط (Esc)" : "تفعيل وضع اللوحة فقط";
      button.classList.toggle("is-on", boOn);
    });
  }

  function boOnResize() {
    requestAnimationFrame(() => {
      if (!boActive) return;
      boMeasureTray();
      boFitPass = 0;
      boRequestSync();
    });
  }

  function boDrawerFocusables() {
    const list = [];
    const push = (root) => {
      if (!root) return;
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').forEach((el) => {
        if (el.disabled || el.getAttribute("aria-disabled") === "true") return;
        if (el.hasAttribute("hidden") || el.closest("[hidden]")) return;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return;
        if (!el.getClientRects().length) return;
        if (list.indexOf(el) < 0) list.push(el);
      });
    };
    /* شريط الإغلاق أولاً لأنه أعلى الدرج بصرياً، ثم محتوى اللوحات. */
    push(boDrawerBar);
    push(boSide);
    return list;
  }

  /* حبس التركيز داخل الدرج المفتوح: Tab لا يصل إلى الشريط أو خلفية اللعبة
     التي يغطيها السكريم، وShift+Tab يدور في الاتجاه المعاكس. */
  function boTrapTab(event) {
    if (!boDrawerOpen || document.querySelector("dialog[open]")) return;
    const target = event.target;
    if (target && target.closest && target.closest(".fx-panel.is-active,.bg-win-edit")) return;
    const list = boDrawerFocusables();
    if (!list.length) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    let index = list.indexOf(document.activeElement);
    if (index < 0) index = event.shiftKey ? 0 : -1;
    const dir = event.shiftKey ? -1 : 1;
    const next = list[(index + dir + list.length) % list.length];
    try { next.focus({ preventScroll: true }); } catch (error) { /* لا تهم */ }
  }

  function boKeydown(event) {
    if (event.key === "Tab" && boDrawerOpen) {
      boTrapTab(event);
      return;
    }
    if (event.key !== "Escape" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (target && target.isContentEditable)) return;
    if (document.querySelector("dialog[open]")) return;
    if (target && target.closest && target.closest(".fx-panel.is-active,.bg-win-edit")) return;
    if (boDrawerOpen) {
      event.preventDefault();
      boSetDrawer(false, true);
      return;
    }
    if (!boActive || document.body.classList.contains("fullscreen-game")) return;
    event.preventDefault();
    setBoardOnly(false);
  }

  function boStart() {
    boStop();
    if (typeof MutationObserver !== "function") return;
    const stage = boStage();
    if (stage) {
      const onStage = new MutationObserver(() => boRequestSync());
      onStage.observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "hidden", "aria-disabled"],
      });
      boObservers.push(onStage);
    }
    const status = document.getElementById("gameStatus");
    if (status) {
      const onStatus = new MutationObserver(() => {
        if (boActive) boTraySync();
      });
      onStatus.observe(status, { childList: true, characterData: true, subtree: true });
      boObservers.push(onStatus);
    }
    const view = boView();
    if (view) {
      const onView = new MutationObserver(() => boRequestSync());
      onView.observe(view, { attributes: true, attributeFilter: ["hidden"] });
      boObservers.push(onView);
    }
    if (document.body) {
      const onBody = new MutationObserver(() => boRequestSync());
      onBody.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      boObservers.push(onBody);
    }
    window.addEventListener("resize", boOnResize, { passive: true });
    window.addEventListener("orientationchange", boOnResize);
    document.addEventListener("fullscreenchange", boOnResize);
    document.addEventListener("webkitfullscreenchange", boOnResize);
  }

  function boStop() {
    boObservers.forEach((observer) => observer.disconnect());
    boObservers = [];
    window.removeEventListener("resize", boOnResize);
    window.removeEventListener("orientationchange", boOnResize);
    document.removeEventListener("fullscreenchange", boOnResize);
    document.removeEventListener("webkitfullscreenchange", boOnResize);
  }

  function setBoardOnly(on, persist) {
    boOn = !!on;
    if (persist !== false) {
      try { window.localStorage.setItem(BO_KEY, boOn ? "1" : "0"); } catch (error) { /* لا تهم */ }
    }
    if (boOn) {
      boStart();
      boSync();
    } else {
      boStop();
      boActive = false;
      boClear();
      boUpdateButtons();
    }
    try { window.dispatchEvent(new Event("resize")); } catch (error) { /* لا تهم */ }
  }

  function initBoardOnly() {
    const make = (id, cls, html) => {
      if (document.getElementById(id)) return null;
      const button = document.createElement("button");
      button.type = "button";
      button.id = id;
      button.className = cls;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("title", "تفعيل وضع اللوحة فقط");
      button.innerHTML = html;
      button.addEventListener("click", () => setBoardOnly(!boOn));
      return button;
    };
    const actions = document.querySelector(".game-toolbar-actions");
    if (actions) {
      const button = make("btnGameBoardOnly", "bg-btn small", '<span aria-hidden="true">◱</span><span>اللوحة فقط</span>');
      const anchor = document.getElementById("btnGameFullscreen");
      if (button) actions.insertBefore(button, anchor || null);
    }
    const hud = document.getElementById("fsHud");
    if (hud) {
      const button = make("btnFsBoardOnly", "fs-win-toggle", '<span aria-hidden="true">◱</span><span>اللوحة</span>');
      const anchor = document.getElementById("btnExitFullscreen");
      if (button) hud.insertBefore(button, anchor || null);
    }
    document.addEventListener("keydown", boKeydown);
    boUpdateButtons();
    let saved = false;
    try { saved = window.localStorage.getItem(BO_KEY) === "1"; } catch (error) { saved = false; }
    if (saved) {
      boOn = true;
      boStart();
      boSync();
    }
  }
  initBoardOnly();


  function flyCard(fromEl, toEl, opts) {
    if (!motionEnabled() || !fromEl || !toEl) return null;
    const o = Object.assign({ color: "#e8dfc9", ink: "#27332e", label: "▮", duration: 460 }, opts || {});
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    const width = U.clamp(a.width * 0.8, 26, 72);
    const height = U.clamp(a.height * 0.8, 38, 104);
    const node = document.createElement("span");
    node.className = "fx-fly-card";
    node.textContent = o.label;
    node.style.width = width + "px";
    node.style.height = height + "px";
    node.style.left = a.left + a.width / 2 + "px";
    node.style.top = a.top + a.height / 2 + "px";
    node.style.background = o.color;
    node.style.color = o.ink;
    document.body.appendChild(node);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = node.animate([
      { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
      { transform: "translate(-50%,-50%) translate(" + dx * 0.55 + "px," + (dy * 0.55 - 30) + "px) rotate(-9deg) scale(.86)", opacity: 0.95, offset: 0.55 },
      { transform: "translate(-50%,-50%) translate(" + dx + "px," + dy + "px) rotate(4deg) scale(.42)", opacity: 0.1 },
    ], { duration: o.duration, easing: "cubic-bezier(.32,.72,.28,1)", fill: "forwards" });
    const cleanup = () => { if (node.parentNode) node.parentNode.removeChild(node); };
    if (anim) anim.finished.then(cleanup).catch(cleanup);
    else setTimeout(cleanup, o.duration);
    return node;
  }

  function confetti(opts) {
    if (!motionEnabled()) return null;
    const o = Object.assign({ pieces: isLite() ? 18 : 46, duration: 2400 }, opts || {});
    if (document.querySelector(".fx-confetti")) return null;
    const layer = document.createElement("div");
    layer.className = "fx-confetti";
    layer.setAttribute("aria-hidden", "true");
    const colors = ["#f0b45a", "#58d3a8", "#ef8b7f", "#7fb6e8", "#f4efe2", "#c9a8e0"];
    for (let i = 0; i < o.pieces; i++) {
      const piece = document.createElement("i");
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      piece.style.width = 5 + Math.random() * 6 + "px";
      piece.style.height = 8 + Math.random() * 10 + "px";
      piece.style.opacity = String(0.7 + Math.random() * 0.3);
      layer.appendChild(piece);
      const drift = (Math.random() * 2 - 1) * 140;
      const spin = (Math.random() * 2 - 1) * 540;
      piece.animate([
        { transform: "translate3d(0,-14vh,0) rotate(0deg)", opacity: 0 },
        { transform: "translate3d(" + drift * 0.4 + "px,10vh,0) rotate(" + spin * 0.25 + "deg)", opacity: 1, offset: 0.16 },
        { transform: "translate3d(" + drift + "px,112vh,0) rotate(" + spin + "deg)", opacity: 0.15 },
      ], {
        duration: 1900 + Math.random() * 900,
        delay: Math.random() * 360,
        easing: "cubic-bezier(.24,.62,.42,1)",
        fill: "forwards",
      });
    }
    document.body.appendChild(layer);
    setTimeout(() => { if (layer.parentNode) layer.parentNode.removeChild(layer); }, o.duration + 900);
    return layer;
  }

  function celebrate() {
    if (!motionEnabled()) return;
    confetti();
  }

  function win() {
    sound("win");
    celebrate();
  }

  function after(fn, delay) {
    const ms = Number.isFinite(delay) ? delay : 48;
    return setTimeout(fn, ms);
  }

  function stage() {
    return document.getElementById("gameStage") || document;
  }

  /** دخول متدرج لعناصر واجهة (بطاقات المكتبة، صفوف اللاعبين…). */
  function stagger(nodes, opts) {
    if (!motionEnabled()) return;
    const list = nodes ? Array.prototype.slice.call(nodes) : [];
    const o = Object.assign({ duration: 360, delay: 42 }, opts || {});
    list.forEach((node, index) => {
      animate(node, [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: o.duration, delay: Math.min(index, 18) * o.delay, fill: "both" });
    });
  }

  /* ------------------------------ حركة القطع المركزية ------------------------------ */

  const PIECE_ENTER = {
    deal(el) {
      return animate(el, [
        { transform: "translate(22px,-18px) rotate(-7deg) scale(.78)", opacity: 0 },
        { transform: "translate(0,0) rotate(0deg) scale(1.03)", opacity: 1, offset: 0.78 },
        { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
      ], { duration: 300, easing: "cubic-bezier(.2,.85,.3,1)" });
    },
    drop(el) {
      return animate(el, [
        { transform: "translateY(-26px) scale(.86)", opacity: 0 },
        { transform: "translateY(0) scale(1.06)", opacity: 1, offset: 0.7 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ], { duration: 330, easing: "cubic-bezier(.24,.9,.3,1)" });
    },
    rise(el) {
      return animate(el, [
        { transform: "translateY(16px) scale(.9)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ], { duration: 280, easing: "cubic-bezier(.2,.8,.3,1)" });
    },
    pop(el) {
      return pop(el, { duration: 250 });
    },
  };

  /**
   * يراقب عناصر القطع الموسومة بـ data-fx-piece داخل حاوية اللعبة.
   * إن أعيد بناء الواجهة (وهو ما تفعله كل الألعاب) نُحرّك القطعة من موقعها
   * السابق إلى موقعها الجديد (FLIP)، ونُدخل القطع الجديدة بحركة مناسبة.
   */
  function observePieces(mount, opts) {
    if (!mount || typeof window.MutationObserver !== "function" || isLite()) return function () {};
    const o = Object.assign({ skip: false, limit: 260, maxDistance: 760 }, opts || {});
    let previous = new Map();
    let first = true;
    let frame = 0;
    let stopped = false;

    function run() {
      frame = 0;
      if (stopped || !mount.isConnected) return;
      const entries = [];
      const next = new Map();
      mount.querySelectorAll("[data-fx-piece]").forEach((el) => {
        const key = el.getAttribute("data-fx-piece");
        if (!key) return;
        const rect = el.getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        next.set(key, rect);
        entries.push({ el, key, rect });
      });
      const canAnimate = !o.skip && motionEnabled() && entries.length <= o.limit;
      if (first) {
        first = false;
        previous = next;
        // أول بناء للواجهة: لا يوجد موقع سابق، لكن ندخل القطع الجديدة بحركة مناسبة.
        if (canAnimate) {
          entries.forEach(({ el }) => {
            const enter = el.getAttribute("data-fx-enter");
            if (enter && PIECE_ENTER[enter]) PIECE_ENTER[enter](el);
          });
        }
        return;
      }
      if (!canAnimate) {
        previous = next;
        return;
      }
      entries.forEach(({ el, key, rect }) => {
        const old = previous.get(key);
        if (old) {
          const dx = old.left - rect.left;
          const dy = old.top - rect.top;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 1.5 || distance > o.maxDistance) return;
          el.classList.add("fx-piece-moving");
          const anim = animate(el, [
            { transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(1.04)", filter: "drop-shadow(0 9px 12px rgba(0,0,0,.4))" },
            { transform: "translate(0,0) scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
          ], { duration: Math.round(Math.min(420, 210 + distance * 0.22)), easing: "cubic-bezier(.22,.9,.28,1)" });
          const done = () => el.classList.remove("fx-piece-moving");
          if (anim) anim.finished.then(done).catch(done);
          else done();
          return;
        }
        const enter = el.getAttribute("data-fx-enter");
        if (enter && PIECE_ENTER[enter]) PIECE_ENTER[enter](el);
      });
      previous = next;
    }

    function schedule() {
      if (stopped || frame) return;
      frame = window.requestAnimationFrame(run);
    }

    const observer = new window.MutationObserver(schedule);
    observer.observe(mount, { childList: true, subtree: true });
    schedule();

    return function stop() {
      stopped = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previous = new Map();
    };
  }

  /* ------------------------------ الإعدادات ------------------------------ */

  function savePrefs() {
    BG.store.set(STORE_KEY, {
      sound: prefs.sound,
      volume: prefs.volume,
      motion: prefs.motion,
      pack: prefs.pack,
      music: prefs.music,
      musicVolume: prefs.musicVolume,
    });
    document.dispatchEvent(new CustomEvent("bgfxstored", { detail: Object.assign({}, prefs) }));
  }

  function setSound(on) {
    prefs.sound = !!on;
    savePrefs();
    if (!prefs.sound) stopMusicNow();
    else if (prefs.music) { unlock(); startMusicNow(); }
    if (prefs.sound) sound("click");
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.sound;
  }

  function setVolume(value) {
    prefs.volume = U.clamp(Number(value) || 0, 0, 1);
    savePrefs();
    applyVolume();
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.volume;
  }

  function setMotion(on) {
    prefs.motion = !!on;
    savePrefs();
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.motion;
  }

  /* حزمة الأصوات: classic = العيّنات الأصلية، والباقي مولّدة برمجيًا (sound-packs.js) */
  function setPack(id) {
    const next = id === "classic" || (BG.soundPacks && BG.soundPacks.has(id)) ? id : "classic";
    prefs.pack = next;
    savePrefs();
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.pack;
  }

  function startMusicNow() {
    if (!BG.soundPacks) return;
    const audio = ensureContext();
    if (audio && master) BG.soundPacks.startMusic(audio, master, prefs.musicVolume);
  }

  function stopMusicNow() {
    if (BG.soundPacks) BG.soundPacks.stopMusic();
  }

  function setMusicVolume(value) {
    prefs.musicVolume = U.clamp(Number(value) || 0, 0, 1);
    savePrefs();
    if (BG.soundPacks && BG.soundPacks.setMusicVolume) BG.soundPacks.setMusicVolume(prefs.musicVolume);
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.musicVolume;
  }

  function setMusic(on) {
    prefs.music = !!on;
    savePrefs();
    if (prefs.music && prefs.sound) { unlock(); startMusicNow(); }
    else stopMusicNow();
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
    return prefs.music;
  }

  function icon(id) {
    return '<svg class="ic" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
  }

  function weakDevice() {
    let weak = false;
    try {
      const n = navigator;
      const conn = n.connection || {};
      weak = (n.hardwareConcurrency && n.hardwareConcurrency <= 4) ||
        (n.deviceMemory && n.deviceMemory <= 4) ||
        conn.saveData === true ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    } catch (err) { /* تجاهل */ }
    return !!weak;
  }

  function perfLite(value) {
    return value === "lite" || (value !== "full" && weakDevice());
  }

  function applyPerformance(value) {
    const next = value === "lite" || value === "full" ? value : "auto";
    const lite = perfLite(next);
    document.documentElement.classList.toggle("lite", lite);
    document.documentElement.setAttribute("data-perf", lite ? "lite" : "full");
    return lite;
  }

  function openSettings(options) {
    const opts = typeof options === "string" ? { tab: options } : (options || {});
    const initialTab = ["sound", "display", "profile"].indexOf(opts.tab) >= 0 ? opts.tab : "sound";
    unlock();
    const body = document.createElement("div");
    body.className = "fx-settings";
    const playerProfile = BG.playerProfile.get();
    const profileColorName = (value) => BG.playerProfile.colorName(value);
    const profileMeta = (profile) =>
      BG.playerProfile.avatarName(profile.avatar) + " · " + profileColorName(profile.color);
    const avatarList = BG.playerProfile.avatars;
    const avatarInitial = Math.max(1, Number(BG.playerProfile.avatarInitial) || Math.min(12, avatarList.length));
    const selectedAvatarIndex = avatarList.findIndex((avatar) => avatar.id === playerProfile.avatar);
    const avatarGroups = (BG.playerProfile.groups || []).filter((group) => group.id !== "all");
    const avatarFilterDefs = [
      { id: "featured", name: "المميزة", count: avatarInitial },
      { id: "all", name: "الكل", count: avatarList.length },
    ].concat(avatarGroups.map((group) => ({
      id: group.id,
      name: group.name,
      count: avatarList.filter((avatar) => BG.playerProfile.avatarGroup(avatar.id) === group.id).length,
    })));
    const initialAvatarFilter = selectedAvatarIndex >= avatarInitial ? "all" : "featured";
    const avatarIsVisible = (avatar, index, filter) =>
      filter === "all" || (filter === "featured" ? index < avatarInitial : BG.playerProfile.avatarGroup(avatar.id) === filter);
    const nameHintText = (value) => {
      const clean = BG.playerProfile.cleanName(value);
      return clean
        ? "سيظهر «" + clean + "» في المقاعد والغرف ولوحات اللاعبين."
        : "سيظهر «لاعب ضيف» حتى تكتب اسمًا — يمكنك تركه فارغًا.";
    };
    const profileSection =
      '<section class="fx-profile-settings" aria-labelledby="fx-profile-title">' +
      '<div class="fx-profile-head">' +
      '<div class="fx-profile-heading">' +
      '<span class="fx-profile-heading-icon" aria-hidden="true">👤</span>' +
      '<div><strong id="fx-profile-title">ملف اللاعب</strong><small>هويتك في كل الألعاب: اسمك وأفتارك ولونك يظهرون في المقاعد والغرف ولوحات اللاعبين.</small></div>' +
      "</div>" +
      '<span class="fx-profile-badge">حفظ تلقائي</span>' +
      "</div>" +
      '<div class="fx-profile-preview fx-profile-card" data-profile-preview style="--profile-color:' + U.escape(playerProfile.color) + '">' +
      '<div class="fx-profile-card-top">' +
      '<span class="fx-profile-card-kicker">بطاقة اللاعب</span>' +
      '<span class="fx-profile-card-live"><i aria-hidden="true"></i> معاينة مباشرة</span>' +
      "</div>" +
      '<div class="fx-profile-card-main">' +
      BG.playerProfile.avatarHTML(playerProfile, "fx-profile-preview-avatar fx-profile-card-avatar") +
      '<div class="fx-profile-preview-copy fx-profile-card-copy" aria-live="polite">' +
      '<strong data-profile-preview-name>' + U.escape(BG.playerProfile.displayName(playerProfile)) + "</strong>" +
      '<small data-profile-preview-meta>' + U.escape(profileMeta(playerProfile)) + "</small>" +
      '<span class="fx-profile-card-role">🎮 تظهر في المقاعد والغرف ولوحات اللاعبين</span>' +
      "</div>" +
      "</div>" +
      '<div class="fx-profile-card-foot">' +
      '<button type="button" class="fx-profile-tool fx-profile-tool-shuffle" data-profile-random>🎲 مظهر عشوائي</button>' +
      '<span class="fx-profile-card-note">يغيّر الأفتار واللون فقط</span>' +
      "</div>" +
      "</div>" +
      '<div class="fx-profile-name">' +
      '<label class="fx-profile-name-label" for="fx-profile-name-input"><span>اسم اللاعب</span><small>حتى ' + BG.playerProfile.nameMax + " حرفًا</small></label>" +
      '<div class="fx-profile-name-field">' +
      '<button type="button" class="fx-profile-name-clear" data-profile-name-clear aria-label="مسح الاسم" title="مسح الاسم"' + (playerProfile.name ? "" : " hidden") + ">✕</button>" +
      '<input id="fx-profile-name-input" type="text" maxlength="' + BG.playerProfile.nameMax + '" data-profile-name value="' + U.escape(playerProfile.name) + '" placeholder="اكتب اسمك…" autocomplete="nickname" spellcheck="false" aria-describedby="fx-profile-name-hint" />' +
      '<small class="fx-profile-name-count" data-profile-name-count>' + playerProfile.name.length + "/" + BG.playerProfile.nameMax + "</small>" +
      "</div>" +
      '<small class="fx-profile-name-hint" id="fx-profile-name-hint" data-profile-name-hint>' + U.escape(nameHintText(playerProfile.name)) + "</small>" +
      "</div>" +
      '<div class="fx-profile-group">' +
      '<div class="fx-profile-group-head">' +
      '<div class="fx-profile-group-title"><span class="fx-profile-label">اختر الأفتار</span><span class="fx-profile-hint" data-profile-avatar-name>' + U.escape(BG.playerProfile.avatarName(playerProfile.avatar)) + "</span></div>" +
      '<button type="button" class="fx-profile-mini" data-profile-random-avatar title="اختر أفتارًا عشوائيًا">🎲 أفتار عشوائي</button>' +
      "</div>" +
      '<div class="fx-avatar-filters" role="group" aria-label="تصفية الأفتارات">' +
      avatarFilterDefs.map((filter) =>
        '<button type="button" class="fx-avatar-filter' + (filter.id === initialAvatarFilter ? " is-active" : "") + '" data-avatar-filter="' + filter.id + '" aria-pressed="' + (filter.id === initialAvatarFilter ? "true" : "false") + '">' + U.escape(filter.name) + "<b>" + filter.count + "</b></button>"
      ).join("") +
      "</div>" +
      '<div class="fx-avatar-grid" role="group" aria-label="أفتار اللاعب">' +
      avatarList.map((avatar, index) => {
        const visible = avatarIsVisible(avatar, index, initialAvatarFilter);
        return '<button type="button" class="fx-avatar-choice' + (avatar.id === playerProfile.avatar ? " is-selected" : "") + '" data-profile-avatar="' + U.escape(avatar.id) + '" data-avatar-index="' + index + '" data-avatar-group="' + U.escape(BG.playerProfile.avatarGroup(avatar.id)) + '" aria-label="' + U.escape(avatar.name) + '" aria-pressed="' + (avatar.id === playerProfile.avatar ? "true" : "false") + '" title="' + U.escape(avatar.name) + '" tabindex="' + (avatar.id === playerProfile.avatar ? "0" : "-1") + '"' + (visible ? "" : " hidden") + ">" +
          '<span class="fx-avatar-check" aria-hidden="true">✓</span>' +
          BG.playerProfile.avatarSVG(avatar.id, "fx-avatar-art") +
          "<small>" + U.escape(avatar.name) + "</small></button>";
      }).join("") +
      "</div>" +
      "</div>" +
      '<div class="fx-profile-group">' +
      '<div class="fx-profile-group-head">' +
      '<div class="fx-profile-group-title"><span class="fx-profile-label">اختر اللون</span><span class="fx-profile-hint" data-profile-color-name>' + U.escape(profileColorName(playerProfile.color)) + "</span></div>" +
      '<button type="button" class="fx-profile-mini" data-profile-color-from-avatar title="استخدم لون الأفتار الحالي">🎨 لون الأفتار</button>' +
      "</div>" +
      '<div class="fx-color-grid" role="group" aria-label="ألوان اللاعب">' +
      BG.playerProfile.colors.map((color) =>
        '<button type="button" class="fx-color-choice' + (color.value === playerProfile.color ? " is-selected" : "") + '" data-profile-color="' + U.escape(color.value) + '" style="--swatch-color:' + U.escape(color.value) + '" aria-label="' + U.escape(color.name) + '" aria-pressed="' + (color.value === playerProfile.color ? "true" : "false") + '" title="' + U.escape(color.name) + '"></button>'
      ).join("") +
      "</div>" +
      '<label class="fx-custom-color' + (BG.playerProfile.isCustomColor(playerProfile.color) ? " is-selected" : "") + '" data-profile-custom-row>' +
      '<input type="color" data-profile-custom-color value="' + U.escape(playerProfile.color) + '" aria-label="اختر لونًا مخصصًا" />' +
      '<span class="fx-custom-color-copy"><strong>لون مخصص</strong><small>أي درجة تريدها — تُحفظ فورًا</small></span>' +
      '<b data-profile-custom-value>' + U.escape(playerProfile.color.toUpperCase()) + "</b>" +
      "</label>" +
      "</div>" +
      '<div class="fx-profile-danger">' +
      '<div class="fx-profile-danger-copy"><strong>إدارة الملف</strong><small>إعادة الضبط لا تمسّ إعدادات الصوت أو الحركة أو الأداء.</small></div>' +
      '<button type="button" class="fx-profile-tool fx-profile-tool-danger" data-profile-reset>↺ إعادة ضبط الملف</button>' +
      "</div>" +
      "</section>";
    const pct = Math.round(prefs.volume * 100);
    const mpct = Math.round(prefs.musicVolume * 100);
    const audibleNow = prefs.sound && prefs.volume > 0;
    const packList = (BG.soundPacks && BG.soundPacks.list) || [{ id: "classic", name: "كلاسيكي" }];
    const packInfo = (id) => packList.find((item) => item.id === id) || packList[0];
    const packLabel = (pack) => (pack && pack.icon ? pack.icon + " " : "") + (pack && pack.name ? pack.name : "كلاسيكي");
    const packHintFor = (id) => {
      const pack = packInfo(id);
      return (pack && pack.note ? pack.note + " — " : "") +
        (audibleNow ? "تُعزف معاينة عند التغيير" : "ستُعزف المعاينة عند تفعيل الصوت");
    };
    const engineReady = () => !!(window.AudioContext || window.webkitAudioContext);
    const initialStatus = !engineReady()
      ? "هذا المتصفح لا يدعم تشغيل الصوت"
      : !prefs.sound
        ? "المؤثرات مكتومة — الموسيقى متوقفة"
        : prefs.volume <= 0
          ? "مستوى المؤثرات صفر — لن تسمع شيئًا"
          : prefs.pack !== "classic"
            ? "حزمة " + packInfo(prefs.pack).name + " — نغمات مولّدة لحظيًا"
            : "تجهيز العيّنات الصوتية…";
    const tabButton = (id, label, iconId, active) =>
      '<button type="button" class="fx-tab' + (active ? " is-active" : "") + '" id="fx-tab-' + id + '" role="tab" aria-selected="' + (active ? "true" : "false") + '" aria-controls="fx-panel-' + id + '" tabindex="' + (active ? "0" : "-1") + '" data-fx-tab="' + id + '">' +
      icon(iconId) + "<span>" + label + "</span></button>";
    const testButton = (type, label) =>
      '<button type="button" class="bg-btn small" data-test="' + type + '"' + (audibleNow ? "" : " disabled") + ">" + label + "</button>";
    const musicHint = !prefs.sound
      ? "تتطلب تفعيل المؤثرات الصوتية"
      : "نغمات متولّدة بهدوء أثناء اللعب (مغلقة افتراضيًا)";
    const soundPanel =
      '<div class="fx-panel is-active" id="fx-panel-sound" role="tabpanel" aria-labelledby="fx-tab-sound" data-fx-panel="sound">' +
        '<div class="fx-audio-status" data-audio-status data-state="idle" role="status" aria-live="polite">' +
          '<span class="fx-audio-dot" aria-hidden="true"></span>' +
          '<span class="fx-audio-text" data-audio-status-text>' + U.escape(initialStatus) + "</span>" +
          '<button type="button" class="fx-audio-preview" data-pack-preview aria-label="معاينة الحزمة الحالية" title="معاينة الحزمة الحالية">' + icon("i-speaker") + "<span>معاينة</span></button>" +
        "</div>" +
        '<div class="fx-option" data-row-sound>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-speaker") + '</span><div>' +
            '<strong id="fx-opt-sound">المؤثرات الصوتية</strong>' +
            '<small id="fx-opt-sound-desc">نقرات، نرد، أوراق، فوز وخسارة</small>' +
          "</div></div>" +
          '<button type="button" class="fx-switch" data-toggle="sound" role="switch" aria-checked="' + (prefs.sound ? "true" : "false") + '" aria-labelledby="fx-opt-sound" aria-describedby="fx-opt-sound-desc"><span></span></button>' +
        "</div>" +
        '<div class="fx-option fx-option-volume" data-row-volume>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-volume") + '</span><div>' +
            '<strong id="fx-opt-volume">مستوى الصوت</strong>' +
            '<small id="fx-opt-volume-desc"><output data-volume-label for="fx-volume">' + pct + "%</output></small>" +
          "</div></div>" +
          '<input id="fx-volume" type="range" min="0" max="100" step="5" value="' + pct + '" data-volume aria-label="مستوى الصوت" aria-valuetext="' + pct + '%" aria-labelledby="fx-opt-volume" aria-describedby="fx-opt-volume-desc" style="--fx-fill:' + pct + '%" />' +
        "</div>" +
        '<div class="fx-option" data-row-pack>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-speaker") + '</span><div>' +
            '<strong id="fx-opt-pack">حزمة الأصوات</strong>' +
            '<small id="fx-opt-pack-desc">' + U.escape(packHintFor(prefs.pack)) + "</small>" +
          "</div></div>" +
          '<select class="fx-select" data-pack aria-labelledby="fx-opt-pack" aria-describedby="fx-opt-pack-desc">' +
          packList.map((pack) =>
            '<option value="' + U.escape(pack.id) + '"' + (pack.id === prefs.pack ? " selected" : "") + ">" + U.escape(packLabel(pack)) + "</option>"
          ).join("") +
          "</select>" +
        "</div>" +
        '<div class="fx-option" data-row-music>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-speaker") + '</span><div>' +
            '<strong id="fx-opt-music">موسيقى هادئة للخلفية</strong>' +
            '<small id="fx-opt-music-desc"><span data-music-desc>' + musicHint + "</span></small>" +
          "</div></div>" +
          '<button type="button" class="fx-switch" data-toggle="music" role="switch" aria-checked="' + (prefs.music ? "true" : "false") + '" aria-labelledby="fx-opt-music" aria-describedby="fx-opt-music-desc"' + (prefs.sound ? "" : " disabled") + '><span></span></button>' +
        "</div>" +
        '<div class="fx-option fx-option-volume" data-row-music-volume' + (prefs.music ? "" : " hidden") + ">" +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-volume") + '</span><div>' +
            '<strong id="fx-opt-music-volume">مستوى الموسيقى</strong>' +
            '<small id="fx-opt-music-volume-desc"><output data-music-volume-label for="fx-music-volume">' + mpct + "%</output></small>" +
          "</div></div>" +
          '<input id="fx-music-volume" type="range" min="0" max="100" step="5" value="' + mpct + '" data-music-volume aria-label="مستوى الموسيقى" aria-valuetext="' + mpct + '%" aria-labelledby="fx-opt-music-volume" aria-describedby="fx-opt-music-volume-desc" style="--fx-fill:' + mpct + '%" />' +
        "</div>" +
        '<div class="fx-preview" data-preview>' +
          '<div class="fx-preview-copy"><span>جرّب المؤثرات</span><small data-preview-hint>' + (audibleNow ? "تُشغَّل فورًا" : "فعّل المؤثرات الصوتية أولًا") + "</small></div>" +
          "<div>" +
          testButton("dice", "🎲 نرد") +
          testButton("card", "🃏 ورقة") +
          testButton("win", "🏆 فوز") +
          testButton("lose", "💤 خسارة") +
          "</div>" +
        "</div>" +
        '<p class="fx-note">تُحفظ اختياراتك تلقائيًا على هذا الجهاز. الأصوات لا تعمل إلا بعد أول تفاعل مع الصفحة (سياسة المتصفح). الأصول: Kenney.nl — CC0 1.0.</p>' +
      "</div>";
    const displayPanel =
      '<div class="fx-panel" id="fx-panel-display" role="tabpanel" aria-labelledby="fx-tab-display" data-fx-panel="display" hidden>' +
        '<div class="fx-option" data-row-motion>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-motion") + '</span><div>' +
            '<strong id="fx-opt-motion">الحركات والأنميشن</strong>' +
            '<small id="fx-opt-motion-desc">سحب الأوراق، النرد، حركة القطع والاحتفال</small>' +
          "</div></div>" +
          '<button type="button" class="fx-switch" data-toggle="motion" role="switch" aria-checked="' + (prefs.motion ? "true" : "false") + '" aria-labelledby="fx-opt-motion" aria-describedby="fx-opt-motion-desc"><span></span></button>' +
        "</div>" +
        '<p class="fx-inline-note" data-reduced-note hidden>نظامك يطلب تقليل الحركة، لذا ستظهر الحركات بشكل مخفّف حتى لو كان هذا الخيار مفعّلًا.</p>' +
        '<div class="fx-option" data-row-secrets>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-eye") + '</span><div>' +
            '<strong id="fx-opt-secrets">إخفاء المعلومات السرية</strong>' +
            '<small id="fx-opt-secrets-desc">أضف زر «إخفاء/إظهار» لأوراقك وبطاقاتك وسجلك في كل الألعاب. عند إيقافه تُعرض معلوماتك مباشرة بلا أزرار إخفاء.</small>' +
          "</div></div>" +
          '<button type="button" class="fx-switch" data-toggle="hideSecrets" role="switch" aria-checked="' + (BG.prefs.hideSecrets ? "true" : "false") + '" aria-labelledby="fx-opt-secrets" aria-describedby="fx-opt-secrets-desc"><span></span></button>' +
        "</div>" +
        '<div class="fx-option fx-option-perf" data-row-perf>' +
          '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-gauge") + '</span><div>' +
            '<strong id="fx-opt-perf">وضع الأداء</strong>' +
            '<small id="fx-opt-perf-desc">«خفيف» يقلّل الظلال والمؤثرات ليعمل الموقع بسلاسة على الأجهزة الضعيفة (يُختار تلقائيًا على الجوال)</small>' +
          "</div></div>" +
          '<div class="fx-perf-control">' +
            '<div class="seg seg-compact" role="group" aria-labelledby="fx-opt-perf" aria-describedby="fx-opt-perf-desc" data-perf-seg>' +
              '<button type="button" class="seg-btn" data-perf="auto" aria-pressed="false">تلقائي</button>' +
              '<button type="button" class="seg-btn" data-perf="lite" aria-pressed="false">خفيف</button>' +
              '<button type="button" class="seg-btn" data-perf="full" aria-pressed="false">كامل</button>' +
            "</div>" +
            '<small class="fx-perf-status" data-perf-status aria-live="polite"></small>' +
          "</div>" +
        "</div>" +
        '<p class="fx-note">الوضع الخفيف يقلل الظلال والحركات ويُبقي الموقع سلسًا على الأجهزة الضعيفة. «تلقائي» يختار الأنسب حسب جهازك.</p>' +
      "</div>";
    const profilePanel =
      '<div class="fx-panel" id="fx-panel-profile" role="tabpanel" aria-labelledby="fx-tab-profile" data-fx-panel="profile" hidden>' +
      profileSection +
      "</div>";
    body.innerHTML =
      '<div class="fx-tabs" role="tablist" aria-label="أقسام الإعدادات">' +
      tabButton("sound", "الصوت", "i-speaker", true) +
      tabButton("display", "الحركة والعرض", "i-motion", false) +
      tabButton("profile", "ملف اللاعب", "i-users", false) +
      "</div>" +
      soundPanel +
      displayPanel +
      profilePanel;

    const soundSwitch = body.querySelector('[data-toggle="sound"]');
    const motionSwitch = body.querySelector('[data-toggle="motion"]');
    const hideSecretsSwitch = body.querySelector('[data-toggle="hideSecrets"]');
    const packSelect = body.querySelector("[data-pack]");
    const musicSwitch = body.querySelector('[data-toggle="music"]');
    const soundRow = body.querySelector("[data-row-sound]");
    const volumeRow = body.querySelector("[data-row-volume]");
    const musicRow = body.querySelector("[data-row-music]");
    const musicDesc = body.querySelector("[data-music-desc]");
    const preview = body.querySelector("[data-preview]");
    const previewHint = body.querySelector("[data-preview-hint]");
    const testButtons = Array.from(body.querySelectorAll("[data-test]"));
    const reducedNote = body.querySelector("[data-reduced-note]");
    const perfStatus = body.querySelector("[data-perf-status]");
    const volume = body.querySelector("[data-volume]");
    const label = body.querySelector("[data-volume-label]");
    const musicVolumeRow = body.querySelector("[data-row-music-volume]");
    const musicVolumeInput = body.querySelector("[data-music-volume]");
    const musicVolumeLabel = body.querySelector("[data-music-volume-label]");
    const audioStatus = body.querySelector("[data-audio-status]");
    const audioStatusText = body.querySelector("[data-audio-status-text]");
    const packPreview = body.querySelector("[data-pack-preview]");
    const avatarChoices = Array.from(body.querySelectorAll("[data-profile-avatar]"));
    const avatarGrid = body.querySelector(".fx-avatar-grid");
    const avatarFilterButtons = Array.from(body.querySelectorAll("[data-avatar-filter]"));
    const colorChoices = Array.from(body.querySelectorAll("[data-profile-color]"));
    const customColor = body.querySelector("[data-profile-custom-color]");
    const customColorValue = body.querySelector("[data-profile-custom-value]");
    const customColorRow = body.querySelector("[data-profile-custom-row]");
    const profilePreview = body.querySelector("[data-profile-preview]");
    const previewName = body.querySelector("[data-profile-preview-name]");
    const previewMeta = body.querySelector("[data-profile-preview-meta]");
    const nameInput = body.querySelector("[data-profile-name]");
    const nameCount = body.querySelector("[data-profile-name-count]");
    const nameHint = body.querySelector("[data-profile-name-hint]");
    const nameClear = body.querySelector("[data-profile-name-clear]");
    const avatarNameLabel = body.querySelector("[data-profile-avatar-name]");
    const colorNameLabel = body.querySelector("[data-profile-color-name]");
    let activeAvatarFilter = initialAvatarFilter;

    function updateNameCount(value) {
      const length = String(value || "").length;
      const max = BG.playerProfile.nameMax;
      if (nameCount) {
        nameCount.textContent = length + "/" + max;
        nameCount.classList.toggle("is-near", length >= max - 3 && length < max);
        nameCount.classList.toggle("is-max", length >= max);
      }
      if (nameClear) nameClear.hidden = !length;
    }

    function updateNameHint(value) {
      if (nameHint) nameHint.textContent = nameHintText(value);
    }

    function avatarButtonVisible(button, filter) {
      const index = Number(button.getAttribute("data-avatar-index"));
      if (filter === "all") return true;
      if (filter === "featured") return index < avatarInitial;
      return button.getAttribute("data-avatar-group") === filter;
    }

    function updateAvatarTabStops() {
      const visible = avatarChoices.filter((button) => !button.hidden);
      if (!visible.length) return;
      const selected = visible.find((button) => button.classList.contains("is-selected")) || visible[0];
      visible.forEach((button) => { button.tabIndex = button === selected ? 0 : -1; });
    }

    function applyAvatarFilter(filter, focus) {
      const valid = avatarFilterDefs.some((item) => item.id === filter) ? filter : "all";
      activeAvatarFilter = valid;
      avatarChoices.forEach((button) => {
        button.hidden = !avatarButtonVisible(button, valid);
      });
      avatarFilterButtons.forEach((button) => {
        const on = button.getAttribute("data-avatar-filter") === valid;
        button.classList.toggle("is-active", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      updateAvatarTabStops();
      if (focus) {
        const visible = avatarChoices.filter((button) => !button.hidden);
        const selected = visible.find((button) => button.classList.contains("is-selected")) || visible[0];
        if (selected) selected.focus();
      }
    }

    function ensureSelectedAvatarVisible(avatarId) {
      const selectedButton = avatarChoices.find((button) => button.getAttribute("data-profile-avatar") === avatarId);
      if (!selectedButton) return;
      if (!avatarButtonVisible(selectedButton, activeAvatarFilter)) {
        applyAvatarFilter(selectedButton.getAttribute("data-avatar-group") || "all", false);
      }
    }

    function previewColor(value) {
      const color = BG.playerProfile.normalizeColor(value) || BG.playerProfile.defaults.color;
      if (colorNameLabel) colorNameLabel.textContent = profileColorName(color);
      if (previewMeta) previewMeta.textContent = profileMeta({ avatar: BG.playerProfile.get().avatar, color });
      if (customColorValue) customColorValue.textContent = color.toUpperCase();
      if (customColorRow) customColorRow.classList.toggle("is-selected", BG.playerProfile.isCustomColor(color));
      if (profilePreview) {
        profilePreview.style.setProperty("--profile-color", color);
        const avatarNode = profilePreview.querySelector(".fx-profile-preview-avatar");
        if (avatarNode) avatarNode.style.setProperty("--profile-color", color);
      }
    }

    function syncPlayerProfile() {
      const selected = BG.playerProfile.get();
      ensureSelectedAvatarVisible(selected.avatar);
      avatarChoices.forEach((button) => {
        const on = button.getAttribute("data-profile-avatar") === selected.avatar;
        button.classList.toggle("is-selected", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      updateAvatarTabStops();
      colorChoices.forEach((button) => {
        const on = button.getAttribute("data-profile-color") === selected.color;
        button.classList.toggle("is-selected", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (customColor && customColor.value.toLowerCase() !== selected.color) customColor.value = selected.color;
      if (customColorValue) customColorValue.textContent = selected.color.toUpperCase();
      if (customColorRow) customColorRow.classList.toggle("is-selected", BG.playerProfile.isCustomColor(selected.color));
      if (nameInput && document.activeElement !== nameInput && nameInput.value !== selected.name) nameInput.value = selected.name;
      const currentName = nameInput ? nameInput.value : selected.name;
      updateNameCount(currentName);
      updateNameHint(currentName);
      if (avatarNameLabel) avatarNameLabel.textContent = BG.playerProfile.avatarName(selected.avatar);
      if (colorNameLabel) colorNameLabel.textContent = profileColorName(selected.color);
      if (previewName) previewName.textContent = BG.playerProfile.displayName(selected);
      if (previewMeta) previewMeta.textContent = profileMeta(selected);
      if (profilePreview) {
        profilePreview.style.setProperty("--profile-color", selected.color);
        const avatarNode = profilePreview.querySelector(".fx-profile-preview-avatar");
        if (avatarNode) {
          avatarNode.innerHTML = BG.playerProfile.avatarSVG(selected.avatar);
          avatarNode.style.setProperty("--profile-color", selected.color);
        }
      }
    }

    function commitProfileName() {
      if (!nameInput) return;
      const clean = BG.playerProfile.cleanName(nameInput.value);
      if (nameInput.value !== clean) nameInput.value = clean;
      if (clean !== BG.playerProfile.get().name) {
        BG.playerProfile.patch({ name: clean });
      }
      syncPlayerProfile();
    }

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        updateNameCount(nameInput.value);
        updateNameHint(nameInput.value);
        const typed = BG.playerProfile.cleanName(nameInput.value);
        if (previewName) previewName.textContent = typed || "لاعب ضيف";
      });
      nameInput.addEventListener("change", commitProfileName);
      nameInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        nameInput.blur();
      });
    }
    if (nameClear) nameClear.addEventListener("click", () => {
      if (!nameInput) return;
      nameInput.value = "";
      updateNameCount("");
      updateNameHint("");
      if (previewName) previewName.textContent = "لاعب ضيف";
      commitProfileName();
      nameInput.focus();
      sound("select");
    });

    avatarFilterButtons.forEach((button) => button.addEventListener("click", () => {
      applyAvatarFilter(button.getAttribute("data-avatar-filter"), false);
      sound("select");
    }));

    if (avatarGrid) {
      avatarGrid.addEventListener("keydown", (event) => {
        if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(event.key) < 0) return;
        const visible = avatarChoices.filter((button) => !button.hidden);
        if (!visible.length) return;
        event.preventDefault();
        let index = visible.indexOf(document.activeElement);
        if (index < 0) index = visible.findIndex((button) => button.classList.contains("is-selected"));
        if (index < 0) index = 0;
        const columns = Math.max(1, getComputedStyle(avatarGrid).gridTemplateColumns.split(" ").filter(Boolean).length || 6);
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = visible.length - 1;
        else if (event.key === "ArrowRight") index -= 1;
        else if (event.key === "ArrowLeft") index += 1;
        else if (event.key === "ArrowUp") index -= columns;
        else if (event.key === "ArrowDown") index += columns;
        index = Math.max(0, Math.min(visible.length - 1, index));
        visible.forEach((button) => { button.tabIndex = button === visible[index] ? 0 : -1; });
        visible[index].focus();
      });
    }

    const randomProfileBtn = body.querySelector("[data-profile-random]");
    if (randomProfileBtn) randomProfileBtn.addEventListener("click", () => {
      BG.playerProfile.patch(BG.playerProfile.randomize(BG.playerProfile.get()));
      syncPlayerProfile();
      sound("select");
    });

    const randomAvatarBtn = body.querySelector("[data-profile-random-avatar]");
    if (randomAvatarBtn) randomAvatarBtn.addEventListener("click", () => {
      const current = BG.playerProfile.get();
      const pool = BG.playerProfile.avatars.filter((avatar) => avatar.id !== current.avatar);
      const avatar = pool[Math.floor(Math.random() * pool.length)] || BG.playerProfile.avatars[0];
      BG.playerProfile.patch({ avatar: avatar.id });
      syncPlayerProfile();
      sound("select");
    });

    const avatarTintBtn = body.querySelector("[data-profile-color-from-avatar]");
    if (avatarTintBtn) avatarTintBtn.addEventListener("click", () => {
      const tint = BG.playerProfile.normalizeColor(BG.playerProfile.avatarTint(BG.playerProfile.get().avatar));
      if (!tint) return;
      BG.playerProfile.patch({ color: tint });
      syncPlayerProfile();
      sound("select");
      BG.toast("طُبّق لون الأفتار على ملفك.", "good");
    });

    const resetProfileBtn = body.querySelector("[data-profile-reset]");
    if (resetProfileBtn) resetProfileBtn.addEventListener("click", () => {
      BG.confirm(
        "إعادة ضبط ملف اللاعب",
        "سيُمسح اسمك وأفتارك ولونك ويعود الملف إلى الوضع الافتراضي. إعدادات الصوت والحركة والأداء لن تتغيّر.",
        "إعادة الضبط",
        "إلغاء",
        { keep: true }
      ).then((yes) => {
        if (!yes) return;
        BG.playerProfile.reset();
        applyAvatarFilter("featured", false);
        syncPlayerProfile();
        sound("select");
        BG.toast("أُعيد ملف اللاعب إلى الوضع الافتراضي.", "good");
      });
    });

    avatarChoices.forEach((button) => button.addEventListener("click", () => {
      BG.playerProfile.patch({ avatar: button.getAttribute("data-profile-avatar") });
      syncPlayerProfile();
      sound("select");
    }));
    colorChoices.forEach((button) => button.addEventListener("click", () => {
      BG.playerProfile.patch({ color: button.getAttribute("data-profile-color") });
      syncPlayerProfile();
      sound("select");
    }));
    if (customColor) {
      customColor.addEventListener("input", () => previewColor(customColor.value));
      customColor.addEventListener("change", () => {
        BG.playerProfile.patch({ color: customColor.value });
        syncPlayerProfile();
        sound("select");
      });
    }
    applyAvatarFilter(initialAvatarFilter, false);
    syncPlayerProfile();
    const packDesc = body.querySelector("#fx-opt-pack-desc");

    const perfButtons = Array.from(body.querySelectorAll("[data-perf]"));
    const currentPerf = () => {
      const raw = BG.store.get("perf", "auto");
      return raw === "lite" || raw === "full" ? raw : "auto";
    };
    function syncPerf() {
      const cur = currentPerf();
      const lite = perfLite(cur);
      perfButtons.forEach((b) => {
        const on = b.getAttribute("data-perf") === cur;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (perfStatus) {
        perfStatus.textContent = cur === "auto"
          ? "تلقائي — يعمل الآن بالوضع " + (lite ? "الخفيف" : "الكامل")
          : "الوضع " + (lite ? "الخفيف" : "الكامل") + " مفعّل";
      }
      const row = body.querySelector("[data-row-perf]");
      if (row) row.classList.toggle("is-lite", lite);
    }
    perfButtons.forEach((b) => b.addEventListener("click", () => {
      const val = b.getAttribute("data-perf");
      BG.store.set("perf", val);
      const lite = applyPerformance(val);
      syncPerf();
      markSaved();
      if (val === "auto") BG.toast("الوضع التلقائي: " + (lite ? "الخفيف" : "الكامل") + ".", "good");
      else BG.toast(lite ? "فُعّل الوضع الخفيف." : "فُعّل الوضع الكامل.", "good");
    }));

    const audible = () => prefs.sound && prefs.volume > 0;

    function syncVolumeUI() {
      const value = Math.round(prefs.volume * 100);
      if (volume) {
        volume.disabled = !prefs.sound;
        volume.value = String(value);
        volume.style.setProperty("--fx-fill", value + "%");
        volume.setAttribute("aria-valuetext", value + "%");
      }
      if (label) {
        label.textContent = !prefs.sound
          ? "مكتوم · " + value + "%"
          : value === 0 ? "صامت · 0%" : value + "%";
      }
      if (volumeRow) {
        volumeRow.classList.toggle("is-disabled", !prefs.sound);
        volumeRow.classList.toggle("is-silent", prefs.sound && value === 0);
      }
    }

    function syncMusicVolumeUI() {
      const value = Math.round(prefs.musicVolume * 100);
      const active = prefs.sound && prefs.music;
      if (musicVolumeRow) musicVolumeRow.hidden = !prefs.music;
      if (musicVolumeInput) {
        musicVolumeInput.disabled = !active;
        musicVolumeInput.value = String(value);
        musicVolumeInput.style.setProperty("--fx-fill", value + "%");
        musicVolumeInput.setAttribute("aria-valuetext", value + "%");
      }
      if (musicVolumeLabel) {
        musicVolumeLabel.textContent = !prefs.sound
          ? "مكتوم · " + value + "%"
          : value === 0 ? "صامت · 0%" : value + "%";
      }
      if (musicVolumeRow) {
        musicVolumeRow.classList.toggle("is-disabled", !active);
        musicVolumeRow.classList.toggle("is-silent", active && value === 0);
      }
    }

    /* وصف حيّ لمحرّك الصوت: يعرض ما يحدث الآن بدل إعدادات صامتة */
    function audioStatusInfo() {
      const loaded = buffers.size;
      const total = ALL_FILES.length;
      if (!engineReady()) return { state: "off", text: "هذا المتصفح لا يدعم تشغيل الصوت" };
      if (!prefs.sound) return { state: "muted", text: "المؤثرات مكتومة — الموسيقى متوقفة" };
      if (prefs.volume <= 0) return { state: "silent", text: "مستوى المؤثرات صفر — لن تسمع شيئًا" };
      if (prefs.pack !== "classic") {
        return {
          state: "ready",
          text: "حزمة " + packInfo(prefs.pack).name + " · نغمات مولّدة · الموسيقى " + (prefs.music ? "تعمل" : "متوقفة"),
        };
      }
      if (ctx && ctx.state === "suspended") return { state: "waiting", text: "اضغط أي زر لبدء تشغيل الصوت" };
      if (loaded + stats.failed >= total && total) {
        return {
          state: "ready",
          text: "العيّنات جاهزة · " + loaded + " مؤثرًا" + (stats.failed ? " · تعذّر تحميل " + stats.failed : "") + " · الموسيقى " + (prefs.music ? "تعمل" : "متوقفة"),
        };
      }
      return {
        state: "loading",
        text: "تجهيز العيّنات الصوتية…",
      };
    }

    function syncAudioStatus() {
      if (!audioStatus) return;
      const info = audioStatusInfo();
      audioStatus.setAttribute("data-state", info.state);
      audioStatus.setAttribute("title", info.text);
      if (audioStatusText) audioStatusText.textContent = info.text;
      if (packPreview) packPreview.disabled = !audible();
    }

    function syncSoundUI() {
      soundSwitch.classList.toggle("on", prefs.sound);
      soundSwitch.setAttribute("aria-checked", prefs.sound ? "true" : "false");
      if (soundRow) soundRow.classList.toggle("is-muted", !prefs.sound);
      if (packSelect && packSelect.value !== prefs.pack) packSelect.value = prefs.pack;
      syncVolumeUI();
      if (musicSwitch) {
        musicSwitch.classList.toggle("on", prefs.music);
        musicSwitch.setAttribute("aria-checked", prefs.music ? "true" : "false");
        musicSwitch.disabled = !prefs.sound;
      }
      if (musicRow) musicRow.classList.toggle("is-disabled", !prefs.sound);
      if (musicDesc) {
        const musicPct = Math.round(prefs.musicVolume * 100);
        musicDesc.textContent = !prefs.sound
          ? (prefs.music ? "ستُستأنف عند تفعيل المؤثرات الصوتية" : "تتطلب تفعيل المؤثرات الصوتية")
          : prefs.music
            ? "تعمل الآن بهدوء · مستوى " + musicPct + "%"
            : "نغمات متولّدة بهدوء أثناء اللعب (مغلقة افتراضيًا)";
      }
      syncMusicVolumeUI();
      if (packDesc) {
        const pack = packInfo(prefs.pack);
        const packNote = pack && pack.note ? pack.note + " — " : "";
        packDesc.textContent = packNote + (audible()
          ? "تُعزف معاينة عند التغيير"
          : "ستُعزف المعاينة عند تفعيل الصوت");
      }
      if (preview) preview.classList.toggle("is-disabled", !audible());
      if (previewHint) {
        previewHint.textContent = !prefs.sound
          ? "فعّل المؤثرات الصوتية أولًا"
          : prefs.volume <= 0 ? "ارفع مستوى الصوت أولًا" : "تُشغَّل فورًا";
      }
      testButtons.forEach((btn) => { btn.disabled = !audible(); });
      syncAudioStatus();
    }

    function syncMotionUI() {
      motionSwitch.classList.toggle("on", prefs.motion);
      motionSwitch.setAttribute("aria-checked", prefs.motion ? "true" : "false");
      if (reducedNote) reducedNote.hidden = !(reducedQuery && reducedQuery.matches);
    }

    function syncHideSecrets() {
      const on = BG.prefs.hideSecrets;
      hideSecretsSwitch.classList.toggle("on", on);
      hideSecretsSwitch.setAttribute("aria-checked", on ? "true" : "false");
    }

    function syncAll() {
      syncSoundUI();
      syncMotionUI();
      syncHideSecrets();
      syncPerf();
    }

    if (packSelect) {
      packSelect.addEventListener("change", () => {
        setPack(packSelect.value);
        if (!audible()) return;
        sound("card", { force: true });
        setTimeout(() => sound("score", { force: true }), 260);
        setTimeout(() => sound("win", { force: true }), 620);
      });
    }
    if (musicSwitch) {
      musicSwitch.addEventListener("click", () => {
        setMusic(!prefs.music);
        syncSoundUI();
      });
    }
    if (musicVolumeInput) {
      musicVolumeInput.addEventListener("input", () => {
        setMusicVolume(Number(musicVolumeInput.value) / 100);
        syncMusicVolumeUI();
      });
    }
    if (packPreview) {
      packPreview.addEventListener("click", () => {
        if (!audible()) {
          BG.toast("فعّل المؤثرات الصوتية أولًا لسماع المعاينة.");
          return;
        }
        sound("select", { force: true });
        setTimeout(() => sound("dice", { force: true }), 150);
        setTimeout(() => sound("win", { force: true }), 620);
      });
    }

    soundSwitch.addEventListener("click", () => {
      setSound(!prefs.sound);
      syncSoundUI();
    });
    motionSwitch.addEventListener("click", () => {
      setMotion(!prefs.motion);
      syncMotionUI();
    });
    hideSecretsSwitch.addEventListener("click", () => {
      const on = BG.prefs.setHideSecrets(!BG.prefs.hideSecrets);
      syncHideSecrets();
      markSaved();
      if (on) BG.toast("أصبح زر «إخفاء/إظهار» متاحًا في الألعاب.", "good");
      else BG.toast("ستظهر معلوماتك السرية مباشرة بلا أزرار إخفاء.");
    });
    if (volume) {
      volume.addEventListener("input", () => {
        setVolume(Number(volume.value) / 100);
      });
      volume.addEventListener("change", () => {
        if (audible()) sound("click");
      });
    }

    testButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!audible()) return;
        const type = btn.dataset.test;
        if (type === "dice") sound("dice", { force: true });
        else if (type === "card") sound("draw", { force: true });
        else if (type === "win") {
          sound("win", { force: true });
          if (prefs.motion) confetti({ pieces: 26, duration: 1900 });
          banner("فوز رائع!", { icon: "🏆", tone: "win" });
        } else if (type === "lose") {
          sound("lose", { force: true });
          banner("حظ أوفر في الجولة القادمة", { icon: "🎲", tone: "lose" });
        }
      });
    });

    syncAll();

    function resetAllPrefs() {
      prefs.sound = DEFAULTS.sound;
      prefs.volume = DEFAULTS.volume;
      prefs.motion = DEFAULTS.motion;
      prefs.pack = DEFAULTS.pack;
      prefs.music = DEFAULTS.music;
      prefs.musicVolume = DEFAULTS.musicVolume;
      savePrefs();
      applyVolume();
      stopMusicNow();
      BG.prefs.setHideSecrets(false);
      BG.store.set("perf", "auto");
      applyPerformance("auto");
      syncAll();
      document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
      if (audible()) sound("select");
      BG.toast("أُعيدت إعدادات الصوت والحركة والأداء إلى الافتراضي.", "good");
    }

    function requestReset() {
      BG.confirm(
        "إعادة ضبط الإعدادات",
        "سيُعاد ضبط الصوت والحركة والأداء والخصوصية إلى الوضع الافتراضي. ملف اللاعب لن يتغيّر.",
        "إعادة الضبط",
        "إلغاء",
        { keep: true }
      ).then((yes) => { if (yes) resetAllPrefs(); });
    }

    const dlg = BG.openDialog({
      title: "الإعدادات",
      className: "fx-dialog",
      body,
      actions: [
        { label: "إعادة الضبط", onClick: requestReset },
        { label: "تم", value: "ok", primary: true },
      ],
      onClose: () => {
        cleanup();
        commitProfileName();
      },
    });

    const tabs = Array.from(body.querySelectorAll("[data-fx-tab]"));
    const panels = Array.from(body.querySelectorAll("[data-fx-panel]"));
    function activateTab(name, focusTab) {
      let active = null;
      tabs.forEach((tab) => {
        const on = tab.getAttribute("data-fx-tab") === name;
        if (on) active = tab;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.setAttribute("tabindex", on ? "0" : "-1");
      });
      panels.forEach((panel) => {
        const on = panel.getAttribute("data-fx-panel") === name;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
      });
      if (dlg && dlg.body) dlg.body.scrollTop = 0;
      if (focusTab && active) active.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(tab.getAttribute("data-fx-tab"), false));
      tab.addEventListener("keydown", (event) => {
        let next = null;
        // في واجهة RTL ينتقل السهم الأيمن إلى التبويب السابق والأيسر إلى التالي.
        if (event.key === "ArrowRight") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index + 1) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        if (next == null) return;
        event.preventDefault();
        activateTab(tabs[next].getAttribute("data-fx-tab"), true);
      });
    });
    activateTab(initialTab, false);

    const saveStatus = document.createElement("span");
    saveStatus.className = "fx-save-status";
    saveStatus.setAttribute("role", "status");
    saveStatus.setAttribute("aria-live", "polite");
    saveStatus.innerHTML = icon("i-check") + "<span>حفظ تلقائي</span>";
    dlg.foot.prepend(saveStatus);

    let saveTimer = 0;
    let disposed = false;
    function markSaved() {
      if (!saveStatus || disposed) return;
      saveStatus.classList.add("is-saved");
      const text = saveStatus.querySelector("span");
      if (text) text.textContent = "تم الحفظ";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveStatus.classList.remove("is-saved");
        if (text) text.textContent = "حفظ تلقائي";
      }, 1700);
    }

    const syncFx = () => {
      if (!document.body.contains(body)) return;
      syncSoundUI();
      syncMotionUI();
    };
    const syncPrefs = () => {
      if (!document.body.contains(body)) return;
      syncHideSecrets();
    };
    const syncProfile = () => {
      if (!document.body.contains(body)) return;
      syncPlayerProfile();
      markSaved();
    };
    const syncReduced = () => syncMotionUI();
    const syncAudio = () => {
      if (!document.body.contains(body)) return;
      syncAudioStatus();
    };
    document.addEventListener("bgfxchange", syncFx);
    document.addEventListener("bgprefschange", syncPrefs);
    document.addEventListener("bgfxstored", markSaved);
    document.addEventListener("bgprofilechange", syncProfile);
    document.addEventListener("bgfxaudio", syncAudio);
    if (reducedQuery) {
      if (reducedQuery.addEventListener) reducedQuery.addEventListener("change", syncReduced);
      else if (reducedQuery.addListener) reducedQuery.addListener(syncReduced);
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearTimeout(saveTimer);
      document.removeEventListener("bgfxchange", syncFx);
      document.removeEventListener("bgprefschange", syncPrefs);
      document.removeEventListener("bgfxstored", markSaved);
      document.removeEventListener("bgprofilechange", syncProfile);
      document.removeEventListener("bgfxaudio", syncAudio);
      if (reducedQuery) {
        if (reducedQuery.removeEventListener) reducedQuery.removeEventListener("change", syncReduced);
        else if (reducedQuery.removeListener) reducedQuery.removeListener(syncReduced);
      }
    }
  }

  /* ------------------------------ ربط عام ------------------------------ */

  // إيماءة أولى تفتح الصوت في المتصفحات التي تمنع التشغيل التلقائي.
  const gesture = () => {
    unlock();
    document.removeEventListener("pointerdown", gesture, true);
    document.removeEventListener("keydown", gesture, true);
    document.removeEventListener("touchstart", gesture, true);
  };
  document.addEventListener("pointerdown", gesture, true);
  document.addEventListener("keydown", gesture, true);
  document.addEventListener("touchstart", gesture, true);

  // نغمة نقر خفيفة لكل زر — بما فيها أزرار الألعاب.
  document.addEventListener("click", (event) => {
    const target = event.target && event.target.closest ? event.target.closest("button, .game-card, [role='button']") : null;
    if (!target || target.disabled) return;
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (now - lastAnyAt < 45) return;
    sound("click");
  }, true);

  const FX = (BG.fx = {
    prefs,
    sound,
    isSharedSound,
    remoteSound,
    unlock,
    preload: preloadAll,
    after,
    stage,
    win,
    lose() { sound("lose"); },
    celebrate,
    confetti,
    animate,
    pop,
    shake,
    hop,
    deal,
    flip,
    spin,
    pulse,
    dice,
    tumble,
    movePiece,
    screenEnter,
    banner,
    result,
    stagger,
    floatText,
    flyCard,
    setBoardOnly,
    centerPad,
    cardFlight,
    cancelFlights,
    revealCard,
    playerRow,
    motionEnabled,
    observePieces,
    setSound,
    setVolume,
    setMotion,
    setPack,
    setMusic,
    setMusicVolume,
    audio: {
      get state() { return ctx ? ctx.state : "uninitialized"; },
      get loaded() { return buffers.size; },
      get total() { return ALL_FILES.length; },
      get failed() { return stats.failed; },
      get playing() { return activeVoices.size; },
      get plays() { return stats.plays; },
      get suppressed() { return stats.suppressed; },
      get dropped() { return stats.dropped; },
      get last() { return stats.last; },
      get unlocked() { return unlocked; },
      get musicPlaying() { return !!(BG.soundPacks && BG.soundPacks.musicOn); },
      get musicStats() { return BG.soundPacks ? BG.soundPacks.stats : null; },
      get loadedFiles() { return Array.from(buffers.keys()); },
      resume() { unlock(); return ctx ? ctx.state : "uninitialized"; },
      play(name) { sound(name, { force: true }); return stats.last; },
    },
    openSettings,
    settings: {
      get sound() { return prefs.sound; },
      get volume() { return prefs.volume; },
      get motion() { return prefs.motion; },
      get pack() { return prefs.pack; },
      get music() { return prefs.music; },
      get musicVolume() { return prefs.musicVolume; },
      get hideSecrets() { return BG.prefs.hideSecrets; },
    },
  });

  // تحديث الكائن المرئي عند أي تغيير.
  document.addEventListener("bgfxchange", () => {
    FX.prefs = prefs;
  });

  /* مزامنة الإعدادات بين تبويبات المتصفح دون إعادة تحميل */
  window.addEventListener("storage", (event) => {
    if (event.key !== "bg." + STORE_KEY || !event.newValue) return;
    Object.assign(prefs, readPrefs());
    applyVolume();
    if (prefs.music && prefs.sound) {
      if (!BG.soundPacks || !BG.soundPacks.musicOn) startMusicNow();
    } else {
      stopMusicNow();
    }
    document.dispatchEvent(new CustomEvent("bgfxchange", { detail: Object.assign({}, prefs) }));
  });

  /* إيقاف الموسيقى عند مغادرة التبويب واستئنافها عند العودة */
  document.addEventListener("visibilitychange", () => {
    if (!prefs.music || !prefs.sound) return;
    if (document.hidden) stopMusicNow();
    else startMusicNow();
  });

  BG.openFxSettings = openSettings;

  window.__bgFx = FX;
})();
