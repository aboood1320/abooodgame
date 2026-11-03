/* ==========================================================================
   حزم الأصوات — مؤثرات مولَّدة برمجيًا (Web Audio) بلا ملفات ولا حقوق
   --------------------------------------------------------------------------
   الحزم:  wood (خشبي دافئ) · retro (ريترو) · crystal (كريستال) · soft (هادئ)
   الحزمة «classic» هي العيّنات الأصلية وتبقى في fx.js.

   التنويع:
   - كل حدث يُعزف بنغمات من السلّم الخماسي فلا يبدو نشازًا أبدًا
   - تتابع الأحداث الناجحة (نقاط/عملات/خطوات) يرفع النغمة تدريجيًا (كومبو)
   - اختلاف عشوائي بسيط في كل مرة حتى لا يتكرر الصوت نفسه
   - صدى (reverb) مولَّد وموسيقى خلفية هادئة اختيارية
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const PENTA = [0, 2, 4, 7, 9];

  const PACKS = [
    { id: "classic", name: "كلاسيكي", note: "عيّنات حقيقية (الافتراضي)" },
    { id: "wood", name: "خشبي دافئ", note: "طرقات خشب ومارمبا" },
    { id: "retro", name: "ريترو", note: "ألعاب الأركيد القديمة" },
    { id: "crystal", name: "كريستال", note: "أجراس صافية بصدى" },
    { id: "soft", name: "هادئ", note: "نغمات ناعمة منخفضة" },
  ];

  let ctx = null;
  let out = null;
  let convolver = null;
  let wet = null;
  const combo = { n: 0, at: 0 };

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const hz = (root, deg) => {
    const octave = Math.floor(deg / 5);
    const step = ((deg % 5) + 5) % 5;
    return root * Math.pow(2, (12 * octave + PENTA[step]) / 12);
  };

  function makeImpulse(seconds, decay) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  function setup(audioCtx, master) {
    if (ctx === audioCtx && out) return;
    ctx = audioCtx;
    out = ctx.createGain();
    out.gain.value = 1;
    out.connect(master);
    try {
      convolver = ctx.createConvolver();
      convolver.buffer = makeImpulse(1.7, 2.8);
      wet = ctx.createGain();
      wet.gain.value = 0.34;
      convolver.connect(wet);
      wet.connect(master);
    } catch (err) {
      convolver = null;
    }
  }

  function route(node, send) {
    node.connect(out);
    if (send > 0 && convolver) {
      const gain = ctx.createGain();
      gain.gain.value = send;
      node.connect(gain);
      gain.connect(convolver);
    }
  }

  /* ------------------------------ لبنات الصوت ------------------------------ */

  function voice(o) {
    const t = ctx.currentTime + (o.when || 0);
    const peak = Math.max(0.0002, o.g);
    const attack = Math.min(o.attack || 0.004, o.d * 0.45);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    let tail = env;
    if (o.lp) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = o.lp;
      env.connect(filter);
      tail = filter;
    }
    const stopAt = t + o.d + 0.06;
    (o.partials || [[1, 1]]).forEach((part) => {
      const ratio = part[0];
      const amp = part[1];
      const decayMul = part[2];
      const osc = ctx.createOscillator();
      osc.type = o.wave || "sine";
      osc.frequency.setValueAtTime(Math.max(25, o.f * ratio), t);
      if (o.drop) osc.frequency.exponentialRampToValueAtTime(Math.max(25, o.f * ratio * o.drop), t + o.d);
      if (o.detune) osc.detune.value = o.detune;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(amp, t);
      if (decayMul) pg.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.02), t + o.d * decayMul);
      osc.connect(pg);
      pg.connect(env);
      osc.start(t);
      osc.stop(stopAt);
    });
    route(tail, o.send || 0);
  }

  function burst(o) {
    const t = ctx.currentTime + (o.when || 0);
    const d = o.d || 0.12;
    const length = Math.max(1, Math.floor(ctx.sampleRate * d));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = o.type || "bandpass";
    filter.frequency.setValueAtTime(Math.max(40, o.f || 2000), t);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + d);
    filter.Q.value = o.q || 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, o.g || 0.05), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(filter);
    filter.connect(gain);
    route(gain, o.send || 0);
    src.start(t);
    src.stop(t + d + 0.02);
  }

  /* ------------------------------ الحزم ------------------------------ */

  const BELL = [[1, 1], [2.76, 0.5, 0.5], [5.4, 0.25, 0.3], [8.93, 0.12, 0.2]];
  const MARIMBA = [[1, 1], [3.9, 0.28, 0.25], [9.2, 0.08, 0.12]];

  const KITS = {
    wood: {
      root: 261.63,
      note(f, when, d, vel) {
        voice({ f, when, d: Math.max(d, 0.24), g: 0.17 * vel, partials: MARIMBA, attack: 0.002, lp: 4200, send: 0.16 });
      },
      knock(vel, when) {
        voice({ f: 150, drop: 0.55, when, d: 0.1, g: 0.2 * vel, lp: 1200 });
        burst({ when, d: 0.03, g: 0.05 * vel, f: 1800, q: 1.1 });
      },
      swish(when, d) { burst({ when, d: d || 0.13, g: 0.05, f: 2600, to: 1100, q: 0.7 }); },
      tick(when) { burst({ when, d: 0.022, g: 0.05, f: 3200, q: 1.3 }); },
    },
    retro: {
      root: 329.63,
      note(f, when, d, vel) {
        voice({ f, when, wave: "square", d: Math.max(d * 0.9, 0.08), g: 0.05 * vel, attack: 0.002, lp: 5200, partials: [[1, 1], [1.004, 0.6]] });
      },
      knock(vel, when) {
        voice({ f: 130, drop: 0.35, when, wave: "square", d: 0.09, g: 0.07 * vel, lp: 1800 });
        burst({ when, d: 0.035, g: 0.035 * vel, f: 6000, type: "highpass", q: 0.5 });
      },
      swish(when, d) { burst({ when, d: d || 0.1, g: 0.035, f: 5000, to: 2500, type: "highpass", q: 0.5 }); },
      tick(when) { voice({ f: 1900, when, wave: "square", d: 0.03, g: 0.03, attack: 0.001 }); },
    },
    crystal: {
      root: 392,
      note(f, when, d, vel) {
        voice({ f, when, d: Math.max(d * 2, 0.55), g: 0.1 * vel, partials: BELL, attack: 0.002, send: 0.55 });
      },
      knock(vel, when) {
        voice({ f: 230, drop: 0.6, when, d: 0.12, g: 0.11 * vel, send: 0.4 });
      },
      swish(when, d) { burst({ when, d: d || 0.15, g: 0.03, f: 3500, type: "highpass", q: 0.5, send: 0.4 }); },
      tick(when) { voice({ f: 2400, when, d: 0.14, g: 0.04, partials: BELL, attack: 0.001, send: 0.4 }); },
    },
    soft: {
      root: 220,
      note(f, when, d, vel) {
        voice({ f, when, wave: "triangle", d: Math.max(d, 0.32), g: 0.09 * vel, attack: 0.014, lp: 1500, send: 0.3 });
      },
      knock(vel, when) {
        voice({ f: 110, drop: 0.7, when, d: 0.13, g: 0.13 * vel, lp: 600 });
      },
      swish(when, d) { burst({ when, d: d || 0.15, g: 0.03, f: 1200, type: "lowpass", q: 0.6 }); },
      tick(when) { voice({ f: 900, when, d: 0.06, g: 0.04, lp: 1400, attack: 0.004 }); },
    },
  };

  /* ------------------------------ الأحداث ------------------------------ */

  function bumpCombo() {
    const now = Date.now();
    combo.n = now - combo.at < 1100 ? Math.min(6, combo.n + 1) : 0;
    combo.at = now;
    return combo.n;
  }

  function arpeggio(P, base, count, gap, tailLong) {
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      P.note(base + i * (i > 2 ? 1 : 1), i * gap, last ? (tailLong || 0.34) : 0.16, last ? 1 : 0.8);
    }
  }

  const EVENTS = {
    click(P) { P.tick(0); P.note(7 + rnd(0, 2), 0, 0.08, 0.5); },
    select(P) { P.note(9 + rnd(0, 1), 0, 0.09, 0.55); },
    toggle(P) { P.note(6, 0, 0.07, 0.5); P.note(9, 0.05, 0.08, 0.45); },
    step(P) { const c = bumpCombo(); P.note(4 + c, 0, 0.09, 0.5); },
    turn(P) { P.note(5, 0, 0.12, 0.7); P.note(8, 0.1, 0.16, 0.7); },
    yourturn(P) { P.note(5, 0, 0.12, 0.8); P.note(7, 0.1, 0.12, 0.8); P.note(10, 0.2, 0.3, 0.9); },
    card(P) { P.swish(0, 0.13); P.note(4 + rnd(0, 2), 0.05, 0.1, 0.4); },
    shuffle(P) { P.swish(0, 0.1); P.swish(0.08, 0.1); P.swish(0.17, 0.12); },
    dice(P) {
      [0, 0.07, 0.15, 0.24].forEach((t) => { P.tick(t + Math.random() * 0.02); });
      P.knock(0.8, 0.34);
    },
    diceland(P) { P.knock(1, 0); },
    move(P) { P.knock(0.6, 0); P.note(2 + rnd(0, 2), 0.03, 0.1, 0.45); },
    place(P) { P.knock(0.8, 0); P.note(3 + rnd(0, 2), 0.04, 0.12, 0.5); },
    build(P) { P.knock(1.1, 0); P.note(0, 0.05, 0.14, 0.7); P.note(4, 0.13, 0.2, 0.7); },
    capture(P) { P.knock(1.4, 0); P.swish(0, 0.14); P.note(-3, 0.06, 0.2, 0.8); P.note(-5, 0.16, 0.26, 0.7); },
    outbreak(P) { P.knock(1.5, 0); P.swish(0, 0.2); P.note(-4, 0.05, 0.25, 0.9); P.note(-7, 0.18, 0.4, 0.9); },
    point(P) { const c = bumpCombo(); P.note(7 + c, 0, 0.1, 0.7); P.note(11 + c, 0.07, 0.16, 0.7); },
    score(P) { const c = bumpCombo(); P.note(6 + c, 0, 0.1, 0.7); P.note(9 + c, 0.07, 0.1, 0.7); P.note(13 + c, 0.14, 0.2, 0.8); },
    reveal(P) { P.swish(0, 0.2); arpeggio(P, 5, 4, 0.07, 0.4); },
    error(P) { P.note(-2, 0, 0.14, 0.9); P.note(-5, 0.1, 0.22, 0.9); },
    lose(P) { [4, 2, 0, -3].forEach((deg, i) => P.note(deg, i * 0.13, i === 3 ? 0.4 : 0.2, 0.8)); },
    win(P) { arpeggio(P, 5, 5, 0.1, 0.55); P.swish(0.1, 0.4); },
    promote(P) { P.note(5, 0, 0.14, 0.8); arpeggio(P, 7, 3, 0.09, 0.4); },
    pass(P) { P.note(3, 0, 0.1, 0.6); P.note(1, 0.08, 0.14, 0.6); },
    join(P) { P.note(4, 0, 0.12, 0.7); P.note(7, 0.09, 0.2, 0.7); },
    leave(P) { P.note(7, 0, 0.12, 0.6); P.note(4, 0.09, 0.22, 0.6); },
    tick(P) { P.tick(0); },
  };

  const ALIASES = {
    draw: "card", deal: "card", flip: "card", ticket: "card",
    tile: "place", meeple: "place", token: "place",
    train: "build", robber: "capture", snake: "capture",
    coin: "point", resource: "point", trade: "point", ladder: "point",
    unlock: "reveal", cure: "reveal", crown: "win", recall: "pass",
  };

  function play(packId, name, audioCtx, master) {
    const kit = KITS[packId];
    const key = EVENTS[name] ? name : ALIASES[name];
    if (!kit || !key || !EVENTS[key] || !audioCtx || !master) return false;
    setup(audioCtx, master);
    const P = {
      note: (deg, when, d, vel) => kit.note(hz(kit.root, deg), when || 0, d || 0.15, vel == null ? 0.8 : vel),
      knock: (vel, when) => kit.knock(vel == null ? 1 : vel, when || 0),
      swish: (when, d) => kit.swish(when || 0, d),
      tick: (when) => kit.tick(when || 0),
    };
    try {
      EVENTS[key](P);
    } catch (err) {
      return false;
    }
    return true;
  }

  /* ------------------------------ موسيقى هادئة اختيارية ------------------------------ */

  let musicOn = false;
  let musicTimer = null;

  function musicNote() {
    if (!ctx || ctx.state !== "running") return;
    const root = 196;
    const deg = rnd(-1, 6);
    const f = hz(root, deg);
    voice({ f, d: 3.4, g: 0.05, partials: [[1, 1], [2, 0.16, 0.5]], attack: 0.6, lp: 1500, send: 0.75 });
    if (Math.random() < 0.4) {
      voice({ f: f * 1.498, when: 0.25, d: 3, g: 0.03, partials: [[1, 1]], attack: 0.7, lp: 1300, send: 0.75 });
    }
  }

  function scheduleMusic() {
    if (!musicOn) return;
    musicTimer = setTimeout(() => {
      if (!document.hidden) musicNote();
      scheduleMusic();
    }, 2000 + Math.random() * 3200);
  }

  function startMusic(audioCtx, master) {
    if (!audioCtx || !master) return;
    setup(audioCtx, master);
    if (musicOn) return;
    musicOn = true;
    scheduleMusic();
  }

  function stopMusic() {
    musicOn = false;
    clearTimeout(musicTimer);
    musicTimer = null;
  }

  BG.soundPacks = {
    list: PACKS,
    has: (id) => !!KITS[id],
    play,
    startMusic,
    stopMusic,
    get musicOn() { return musicOn; },
  };
})();
