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
  const DEFAULTS = { sound: true, volume: 0.55, motion: true };
  const ASSET_BASE = "vendor/kenney/audio/";

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
    };
  }

  let prefs = readPrefs();
  let ctx = null;
  let master = null;
  let unlocked = false;
  let reducedQuery = null;
  const preloaded = new Set();

  try {
    reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  } catch (err) {
    reducedQuery = null;
  }

  /* ------------------------------ محرّك الصوت المرخّص ------------------------------ */

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      ctx = new AudioCtor();
      const comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
      master = ctx.createGain();
      master.gain.value = prefs.volume * 0.62;
      if (comp) {
        comp.threshold.value = -22;
        comp.knee.value = 22;
        comp.ratio.value = 5;
        comp.attack.value = 0.004;
        comp.release.value = 0.22;
        master.connect(comp);
        comp.connect(ctx.destination);
      } else {
        master.connect(ctx.destination);
      }
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

  function loadBuffer(file) {
    if (!ctx || buffers.has(file) || bufLoading.has(file) || bufFailed.has(file)) return;
    bufLoading.add(file);
    fetch(ASSET_BASE + file)
      .then((res) => { if (!res.ok) throw new Error("http"); return res.arrayBuffer(); })
      .then((data) => new Promise((resolve, reject) => {
        const p = ctx.decodeAudioData(data, resolve, reject);
        if (p && p.catch) p.catch(reject);
      }))
      .then((buf) => { buffers.set(file, buf); })
      .catch(() => { bufFailed.add(file); })
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
    PRELOAD.forEach((file, i) => {
      if (ctx) setTimeout(() => loadBuffer(file), 400 + i * 180);
      else preloadFile(file);
    });
  }

  function applyVolume() {
    if (!ctx || !master) return;
    const level = Math.max(0.0001, prefs.volume * 0.62);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(level, ctx.currentTime, 0.03);
    } catch (err) {
      master.gain.value = level;
    }
  }

  function unlock() {
    const audio = ensureContext();
    if (audio && audio.state === "suspended") {
      audio.resume().then(() => { unlocked = true; }).catch(() => { /* المتصفح رفض التشغيل */ });
    } else if (audio) {
      unlocked = true;
    }
    preloadAll();
    document.documentElement.classList.add("fx-audio-ready");
  }

  /**
   * تشغيل ملف صوتي مرخّص. يعيد كائنًا فيه وعد التشغيل أو null عند الفشل.
   * نستخدم عنصر صوت جديدًا في كل مرة كي تتداخل المؤثرات دون قطع بعضها.
   */
  function playSample(name, opts) {
    const o = opts || {};
    const list = SAMPLES[name];
    if (!list || !list.length || typeof window.Audio !== "function") return null;
    const file = list.length === 1 ? list[0] : list[Math.floor(Math.random() * list.length)];
    if (ctx && buffers.has(file)) {
      try {
        const src = ctx.createBufferSource();
        const g = ctx.createGain();
        src.buffer = buffers.get(file);
        src.playbackRate.value = o.rate || (o.vary !== false ? 0.97 + Math.random() * 0.06 : 1);
        g.gain.value = U.clamp((o.gain == null ? 0.92 : o.gain) / 0.62, 0, 1.6);
        src.connect(g);
        g.connect(master);
        src.start();
        return { el: null, promise: Promise.resolve() };
      } catch (err) { /* نكمل بالطريقة القديمة */ }
    }
    if (ctx && !bufFailed.has(file)) loadBuffer(file);
    preloadFile(file);
    try {
      const el = new window.Audio(ASSET_BASE + file);
      el.preload = "auto";
      el.volume = U.clamp(prefs.volume * (o.gain == null ? 0.92 : o.gain), 0, 1);
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

  function sound(name, opts) {
    const o = opts || {};
    if (!o.force && !prefs.sound) return;
    if (!SAMPLES[name] && !SYNTH[name]) return;
    const audio = ensureContext();
    if (!audio) {
      synthSound(name);
      fireLayers(name);
      return;
    }
    if (audio.state === "suspended") {
      audio.resume().catch(() => { /* لا شيء */ });
    }

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
    BG.store.set(STORE_KEY, { sound: prefs.sound, volume: prefs.volume, motion: prefs.motion });
  }

  function setSound(on) {
    prefs.sound = !!on;
    savePrefs();
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

  function icon(id) {
    return '<svg class="ic" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
  }

  function openSettings() {
    unlock();
    const body = document.createElement("div");
    body.className = "fx-settings";
    body.innerHTML =
      '<div class="fx-intro">' +
      '<span class="fx-intro-icon">' + icon("i-speaker") + "</span>" +
      "<div><strong>تجربة صوتية وبصرية مصقولة</strong><p>مؤثرات مرخّصة بترخيص CC0 من Kenney، وحركات احترافية للأوراق والنرد والقطع والنتائج. تُحفظ اختياراتك على هذا الجهاز.</p></div>" +
      "</div>" +
      '<div class="fx-option">' +
      '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-speaker") + "</span><div><strong>المؤثرات الصوتية</strong><small>نقرات، نرد، أوراق، فوز وخسارة</small></div></div>" +
      '<button type="button" class="fx-switch" data-toggle="sound" role="switch" aria-checked="' + (prefs.sound ? "true" : "false") + '"><span></span></button>' +
      "</div>" +
      '<div class="fx-option fx-option-volume">' +
      '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-volume") + "</span><div><strong>مستوى الصوت</strong><small><output data-volume-label>" + Math.round(prefs.volume * 100) + "%</output></small></div></div>" +
      '<input type="range" min="0" max="100" step="5" value="' + Math.round(prefs.volume * 100) + '" data-volume aria-label="مستوى الصوت" />' +
      "</div>" +
      '<div class="fx-option">' +
      '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-motion") + "</span><div><strong>الحركات والأنميشن</strong><small>سحب الأوراق، النرد، حركة القطع والاحتفال</small></div></div>" +
      '<button type="button" class="fx-switch" data-toggle="motion" role="switch" aria-checked="' + (prefs.motion ? "true" : "false") + '"><span></span></button>' +
      "</div>" +
      '<div class="fx-option">' +
      '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-eye") + "</span><div><strong>إخفاء المعلومات السرية</strong><small>أضف زر «إخفاء/إظهار» لأوراقك وبطاقاتك وسجلك في كل الألعاب. عند إيقافه تُعرض معلوماتك مباشرة بلا أزرار إخفاء.</small></div></div>" +
      '<button type="button" class="fx-switch" data-toggle="hideSecrets" role="switch" aria-label="إخفاء المعلومات السرية" aria-checked="' + (BG.prefs.hideSecrets ? "true" : "false") + '"><span></span></button>' +
      "</div>" +
      '<div class="fx-option">' +
      '<div class="fx-option-copy"><span class="fx-option-icon">' + icon("i-gauge") + "</span><div><strong>وضع الأداء</strong><small>«خفيف» يقلّل الظلال والمؤثرات ليعمل الموقع بسلاسة على الأجهزة الضعيفة (يُختار تلقائيًا على الجوال)</small></div></div>" +
      '<div class="seg seg-compact" data-perf-seg>' +
      '<button type="button" class="seg-btn" data-perf="auto">تلقائي</button>' +
      '<button type="button" class="seg-btn" data-perf="lite">خفيف</button>' +
      '<button type="button" class="seg-btn" data-perf="full">كامل</button>' +
      "</div>" +
      "</div>" +
      '<div class="fx-preview"><span>جرّب المؤثرات</span><div>' +
      '<button type="button" class="bg-btn small" data-test="dice">🎲 نرد</button>' +
      '<button type="button" class="bg-btn small" data-test="card">🃏 ورقة</button>' +
      '<button type="button" class="bg-btn small" data-test="win">🏆 فوز</button>' +
      '<button type="button" class="bg-btn small" data-test="lose">💤 خسارة</button>' +
      "</div></div>" +
      '<p class="fx-note">إذا كان «تقليل الحركة» مفعّلًا في نظامك، فستُخفَّض الحركات تلقائيًا. الأصوات لا تعمل إلا بعد أول تفاعل مع الصفحة (سياسة المتصفح). الأصول: Kenney.nl — CC0 1.0.</p>';

    const soundSwitch = body.querySelector('[data-toggle="sound"]');
    const motionSwitch = body.querySelector('[data-toggle="motion"]');
    const hideSecretsSwitch = body.querySelector('[data-toggle="hideSecrets"]');
    const volume = body.querySelector("[data-volume]");
    const label = body.querySelector("[data-volume-label]");

    const perfButtons = Array.from(body.querySelectorAll("[data-perf]"));
    function syncPerf() {
      const cur = BG.store.get("perf", "auto") || "auto";
      perfButtons.forEach((b) => {
        const on = b.getAttribute("data-perf") === cur;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    perfButtons.forEach((b) => b.addEventListener("click", () => {
      const val = b.getAttribute("data-perf");
      BG.store.set("perf", val);
      let weak = false;
      try {
        const n = navigator;
        weak = (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 4) ||
          (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      } catch (err) { /* تجاهل */ }
      const lite = val === "lite" || (val !== "full" && !!weak);
      document.documentElement.classList.toggle("lite", lite);
      document.documentElement.setAttribute("data-perf", lite ? "lite" : "full");
      syncPerf();
      BG.toast(lite ? "تفعّل الوضع الخفيف." : "تفعّل الوضع الكامل.", "good");
    }));
    syncPerf();

    function syncHideSecrets() {
      const on = BG.prefs.hideSecrets;
      hideSecretsSwitch.classList.toggle("on", on);
      hideSecretsSwitch.setAttribute("aria-checked", on ? "true" : "false");
    }

    soundSwitch.addEventListener("click", () => {
      const on = setSound(!prefs.sound);
      soundSwitch.classList.toggle("on", on);
      soundSwitch.setAttribute("aria-checked", on ? "true" : "false");
    });
    motionSwitch.addEventListener("click", () => {
      const on = setMotion(!prefs.motion);
      motionSwitch.classList.toggle("on", on);
      motionSwitch.setAttribute("aria-checked", on ? "true" : "false");
    });
    hideSecretsSwitch.addEventListener("click", () => {
      const on = BG.prefs.setHideSecrets(!BG.prefs.hideSecrets);
      syncHideSecrets();
      if (on) BG.toast("أصبح زر «إخفاء/إظهار» متاحًا في الألعاب.", "good");
      else BG.toast("ستظهر معلوماتك السرية مباشرة بلا أزرار إخفاء.");
    });
    volume.addEventListener("input", () => {
      label.textContent = Math.round(Number(volume.value)) + "%";
      setVolume(Number(volume.value) / 100);
    });
    volume.addEventListener("change", () => { if (prefs.sound) sound("click"); });

    body.querySelectorAll("[data-test]").forEach((btn) => {
      btn.addEventListener("click", () => {
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

    soundSwitch.classList.toggle("on", prefs.sound);
    motionSwitch.classList.toggle("on", prefs.motion);
    syncHideSecrets();
    if (volume) volume.disabled = !prefs.sound;

    document.addEventListener("bgfxchange", function sync() {
      const stillOpen = document.body.contains(body);
      if (!stillOpen) {
        document.removeEventListener("bgfxchange", sync);
        return;
      }
      soundSwitch.classList.toggle("on", prefs.sound);
      soundSwitch.setAttribute("aria-checked", prefs.sound ? "true" : "false");
      motionSwitch.classList.toggle("on", prefs.motion);
      motionSwitch.setAttribute("aria-checked", prefs.motion ? "true" : "false");
      volume.disabled = !prefs.sound;
      volume.value = String(Math.round(prefs.volume * 100));
      label.textContent = Math.round(prefs.volume * 100) + "%";
    });

    document.addEventListener("bgprefschange", function syncPrefs() {
      if (!document.body.contains(body)) {
        document.removeEventListener("bgprefschange", syncPrefs);
        return;
      }
      syncHideSecrets();
    });

    BG.openDialog({
      title: "الإعدادات",
      className: "fx-dialog",
      body,
      actions: [{ label: "تم", value: "ok", primary: true }],
    });
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
    sound("click");
  }, true);

  const FX = (BG.fx = {
    prefs,
    sound,
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
    movePiece,
    screenEnter,
    banner,
    result,
    stagger,
    floatText,
    flyCard,
    playerRow,
    motionEnabled,
    observePieces,
    setSound,
    setVolume,
    setMotion,
    openSettings,
    settings: {
      get sound() { return prefs.sound; },
      get volume() { return prefs.volume; },
      get motion() { return prefs.motion; },
      get hideSecrets() { return BG.prefs.hideSecrets; },
    },
  });

  // تحديث الكائن المرئي عند أي تغيير.
  document.addEventListener("bgfxchange", () => {
    FX.prefs = prefs;
  });

  BG.openFxSettings = openSettings;

  window.__bgFx = FX;
})();
