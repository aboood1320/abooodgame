/* ==========================================================================
   حزم الأصوات — محرك مؤثرات وموسيقى مولَّد برمجيًا (Web Audio)
   --------------------------------------------------------------------------
   الحزم: classic (عيّنات Kenney الحقيقية — في fx.js) · wood · retro · crystal · soft
   المزايا:
   - كل حدث يُعزف من سلّم خماسي فلا يبدو نشازًا
   - كومبو يرفع النغمة مع الأحداث المتتابعة (نقاط/خطوات/عملات)
   - صدى (reverb) مولَّد، وتنويع عشوائي خفيف في كل عزف
   - موسيقى خلفية توليدية: وسائد متناغمة + لحن متفرّق + تنفّس هادئ
   - مسار موسيقى مستقل بمستوى صوت خاص يتلاشى عند الإيقاف
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const PENTA = [0, 2, 4, 7, 9];

  const PACKS = [
    { id: "classic", name: "كلاسيكي", note: "عيّنات حقيقية من Kenney — الافتراضي", icon: "🎧" },
    { id: "wood", name: "خشبي دافئ", note: "طرقات خشب ومارمبا", icon: "🪵" },
    { id: "retro", name: "ريترو", note: "ألعاب الأركيد القديمة", icon: "🕹️" },
    { id: "crystal", name: "كريستال", note: "أجراس صافية بصدى", icon: "🔮" },
    { id: "soft", name: "هادئ", note: "نغمات ناعمة منخفضة", icon: "🌙" },
  ];

  let ctx = null;
  let masterNode = null;
  let fxBus = null;
  let reverb = null;
  let wet = null;
  let musicBus = null;
  let musicVerb = null;
  let musicWet = null;
  let noiseBuffer = null;
  let musicVolume = 0.5;
  let musicOn = false;
  let melodyTimer = null;
  let chordTimer = null;
  let chordIndex = 0;
  const combo = { n: 0, at: 0 };
  const stats = { events: 0, last: "", lastPack: "", notes: 0, chords: 0, music: false };

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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

  function makeNoise(seconds) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function setup(audioCtx, master, volume) {
    if (ctx === audioCtx && masterNode === master && fxBus) {
      if (typeof volume === "number") setMusicVolume(volume);
      return;
    }
    ctx = audioCtx;
    masterNode = master;

    fxBus = ctx.createGain();
    fxBus.gain.value = 1;
    fxBus.connect(masterNode);

    reverb = null;
    wet = null;
    try {
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(1.8, 2.6);
      wet = ctx.createGain();
      wet.gain.value = 0.3;
      reverb.connect(wet);
      wet.connect(fxBus);
    } catch (err) {
      reverb = null;
      wet = null;
    }

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(masterNode);

    musicVerb = null;
    musicWet = null;
    try {
      musicVerb = ctx.createConvolver();
      musicVerb.buffer = makeImpulse(3.2, 2.2);
      musicWet = ctx.createGain();
      musicWet.gain.value = 0.6;
      musicVerb.connect(musicWet);
      musicWet.connect(musicBus);
    } catch (err) {
      musicVerb = null;
      musicWet = null;
    }

    try {
      noiseBuffer = makeNoise(2);
    } catch (err) {
      noiseBuffer = null;
    }

    if (typeof volume === "number") setMusicVolume(volume);
  }

  function route(node, send, bus) {
    if (!ctx) return;
    const target = bus || fxBus;
    const verb = target === musicBus ? musicVerb : reverb;
    node.connect(target);
    if (send > 0 && verb) {
      const gain = ctx.createGain();
      gain.gain.value = send;
      node.connect(gain);
      gain.connect(verb);
    }
  }

  /* ------------------------------ لبنات الصوت ------------------------------ */

  function voice(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const d = Math.max(0.02, o.d || 0.15);
    const peak = Math.max(0.0002, o.g == null ? 0.1 : o.g);
    const attack = Math.max(0.001, Math.min(o.attack == null ? 0.004 : o.attack, d * 0.45));
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);

    let tail = env;
    if (o.lp) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(80, o.lp), t);
      env.connect(filter);
      tail = filter;
    }
    if (o.pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = clamp(o.pan, -1, 1);
      tail.connect(panner);
      tail = panner;
    }

    const stopAt = t + d + 0.08;
    (o.partials || [[1, 1]]).forEach((part) => {
      const ratio = part[0];
      const amp = part[1];
      const decayMul = part[2];
      const osc = ctx.createOscillator();
      osc.type = o.wave || "sine";
      osc.frequency.setValueAtTime(Math.max(25, o.f * ratio), t);
      if (o.drop) osc.frequency.exponentialRampToValueAtTime(Math.max(25, o.f * ratio * o.drop), t + d);
      if (o.detune) osc.detune.value = o.detune;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(Math.max(0.0001, amp), t);
      if (decayMul) pg.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.02), t + d * decayMul);
      osc.connect(pg);
      pg.connect(env);
      osc.start(t);
      osc.stop(stopAt);
    });
    route(tail, o.send || 0, o.bus);
  }

  function burst(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const d = Math.max(0.02, o.d || 0.12);
    const src = ctx.createBufferSource();
    if (noiseBuffer) {
      src.buffer = noiseBuffer;
    } else {
      const length = Math.max(1, Math.floor(ctx.sampleRate * d));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5);
      src.buffer = buffer;
    }

    const filter = ctx.createBiquadFilter();
    filter.type = o.type || "bandpass";
    filter.frequency.setValueAtTime(Math.max(40, o.f || 2000), t);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + d);
    filter.Q.value = o.q || 0.9;

    const peak = Math.max(0.0002, o.g || 0.05);
    const attack = Math.max(0.001, Math.min(o.attack == null ? 0.002 : o.attack, d * 0.6));
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d);

    let tail = gain;
    if (o.pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = clamp(o.pan, -1, 1);
      tail.connect(panner);
      tail = panner;
    }

    src.connect(filter);
    filter.connect(gain);
    route(tail, o.send || 0, o.bus);
    const offset = noiseBuffer ? Math.random() * Math.max(0, noiseBuffer.duration - d - 0.05) : 0;
    src.start(t, offset, d + 0.02);
  }

  /* ------------------------------ الحزم ------------------------------ */

  const BELL = [[1, 1], [2.76, 0.5, 0.55], [5.4, 0.24, 0.32], [8.93, 0.1, 0.2]];
  const MARIMBA = [[1, 1], [3.9, 0.3, 0.28], [9.2, 0.085, 0.14]];

  const KITS = {
    wood: {
      root: 261.63,
      note(f, when, d, vel) {
        voice({ f, when, d: Math.max(d, 0.26), g: 0.16 * vel, partials: MARIMBA, attack: 0.002, lp: 4200, send: 0.18 });
        if (vel > 0.7) burst({ when: when + 0.002, d: 0.026, g: 0.011 * vel, f: 2100, q: 1.2, send: 0.08 });
      },
      knock(vel, when) {
        voice({ f: 148, drop: 0.52, when, d: 0.11, g: 0.2 * vel, lp: 1200, send: 0.08 });
        burst({ when, d: 0.032, g: 0.055 * vel, f: 1700, q: 1.1 });
      },
      swish(when, d) { burst({ when, d: d || 0.13, g: 0.05, f: 2600, to: 1100, q: 0.7 }); },
      tick(when) { burst({ when, d: 0.024, g: 0.05, f: 3200, q: 1.3 }); },
    },
    retro: {
      root: 329.63,
      note(f, when, d, vel) {
        voice({ f, when, wave: "square", d: Math.max(d * 0.9, 0.08), g: 0.045 * vel, attack: 0.002, lp: 5200, partials: [[1, 1], [1.006, 0.55]], send: 0.08 });
      },
      knock(vel, when) {
        voice({ f: 130, drop: 0.35, when, wave: "square", d: 0.09, g: 0.065 * vel, lp: 1800 });
        burst({ when, d: 0.035, g: 0.035 * vel, f: 6000, type: "highpass", q: 0.5 });
      },
      swish(when, d) { burst({ when, d: d || 0.1, g: 0.034, f: 5000, to: 2500, type: "highpass", q: 0.5 }); },
      tick(when) { voice({ f: 1900, when, wave: "square", d: 0.03, g: 0.028, attack: 0.001 }); },
    },
    crystal: {
      root: 392,
      note(f, when, d, vel) {
        voice({ f, when, d: Math.max(d * 2, 0.55), g: 0.095 * vel, partials: BELL, attack: 0.002, send: 0.55 });
      },
      knock(vel, when) {
        voice({ f: 230, drop: 0.6, when, d: 0.13, g: 0.11 * vel, send: 0.4 });
      },
      swish(when, d) { burst({ when, d: d || 0.15, g: 0.03, f: 3500, type: "highpass", q: 0.5, send: 0.4 }); },
      tick(when) { voice({ f: 2400, when, d: 0.14, g: 0.038, partials: BELL, attack: 0.001, send: 0.4 }); },
    },
    soft: {
      root: 220,
      note(f, when, d, vel) {
        voice({ f, when, wave: "triangle", d: Math.max(d, 0.34), g: 0.088 * vel, attack: 0.02, lp: 1600, send: 0.32 });
      },
      knock(vel, when) {
        voice({ f: 108, drop: 0.65, when, d: 0.14, g: 0.13 * vel, lp: 700, send: 0.12 });
      },
      swish(when, d) { burst({ when, d: d || 0.16, g: 0.03, f: 1200, type: "lowpass", q: 0.6, send: 0.2 }); },
      tick(when) { voice({ f: 880, when, d: 0.07, g: 0.038, lp: 1400, attack: 0.004 }); },
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
      P.note(base + i, i * gap, last ? (tailLong || 0.34) : 0.16, last ? 0.95 : 0.75);
    }
  }

  const EVENTS = {
    click(P) { P.tick(0); P.note(7 + rnd(0, 2), 0, 0.08, 0.42); },
    select(P) { P.note(9 + rnd(0, 1), 0, 0.09, 0.5); },
    toggle(P) { P.note(6, 0, 0.07, 0.45); P.note(9, 0.05, 0.08, 0.4); },
    step(P) { const c = bumpCombo(); P.note(4 + c, 0, 0.09, 0.45); },
    turn(P) { P.note(5, 0, 0.12, 0.62); P.note(8, 0.1, 0.16, 0.62); },
    yourturn(P) { P.note(5, 0, 0.13, 0.7); P.note(7, 0.11, 0.13, 0.7); P.note(10, 0.23, 0.34, 0.8); },
    card(P) { P.swish(0, 0.14); P.note(4 + rnd(0, 2), 0.05, 0.1, 0.35); },
    shuffle(P) { P.swish(0, 0.1); P.swish(0.08, 0.1); P.swish(0.17, 0.1); P.swish(0.27, 0.12); },
    dice(P) {
      [0, 0.06, 0.13, 0.21, 0.3].forEach((t) => { P.tick(t + Math.random() * 0.018); });
      P.knock(0.75, 0.38);
    },
    diceland(P) { P.knock(1, 0); },
    move(P) { P.knock(0.55, 0); P.note(2 + rnd(0, 2), 0.03, 0.1, 0.4); },
    place(P) { P.knock(0.8, 0); P.note(3 + rnd(0, 2), 0.04, 0.13, 0.45); },
    build(P) { P.knock(1.05, 0); P.note(0, 0.05, 0.15, 0.62); P.note(4, 0.13, 0.2, 0.62); },
    capture(P) { P.knock(1.35, 0); P.swish(0, 0.14); P.note(-3, 0.06, 0.2, 0.72); P.note(-5, 0.16, 0.26, 0.62); },
    outbreak(P) { P.knock(1.5, 0); P.swish(0, 0.2); P.note(-4, 0.05, 0.25, 0.8); P.note(-7, 0.18, 0.4, 0.8); },
    point(P) { const c = bumpCombo(); P.note(7 + c, 0, 0.1, 0.62); P.note(11 + c, 0.07, 0.17, 0.62); },
    score(P) { const c = bumpCombo(); P.note(6 + c, 0, 0.1, 0.62); P.note(9 + c, 0.07, 0.1, 0.62); P.note(13 + c, 0.14, 0.22, 0.7); },
    reveal(P) { P.swish(0, 0.22); arpeggio(P, 5, 4, 0.075, 0.42); },
    error(P) { P.note(-2, 0, 0.14, 0.8); P.note(-5, 0.1, 0.24, 0.8); P.note(-1, 0.03, 0.12, 0.35); },
    lose(P) { [4, 2, 0, -3].forEach((deg, i) => P.note(deg, i * 0.14, i === 3 ? 0.45 : 0.2, 0.7)); },
    win(P) { arpeggio(P, 5, 5, 0.1, 0.6); P.swish(0.12, 0.45); P.note(0, 0.02, 0.5, 0.45); },
    promote(P) { P.note(5, 0, 0.14, 0.7); arpeggio(P, 7, 3, 0.09, 0.42); },
    pass(P) { P.note(3, 0, 0.1, 0.55); P.note(1, 0.08, 0.15, 0.55); },
    join(P) { P.note(4, 0, 0.12, 0.62); P.note(7, 0.09, 0.22, 0.62); },
    leave(P) { P.note(7, 0, 0.12, 0.55); P.note(4, 0.09, 0.24, 0.55); },
    tick(P) { P.tick(0); },
  };

  const ALIASES = {
    draw: "card", deal: "card", flip: "card", ticket: "card",
    tile: "place", meeple: "place", token: "place",
    train: "build", robber: "capture", snake: "capture",
    coin: "point", resource: "point", trade: "point", ladder: "point",
    unlock: "reveal", cure: "reveal", crown: "win", recall: "pass",
    success: "win", victory: "win", fail: "error", levelup: "promote",
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
      stats.events++;
      stats.last = key;
      stats.lastPack = packId;
    } catch (err) {
      return false;
    }
    return true;
  }

  /* ------------------------------ موسيقى خلفية توليدية ------------------------------ */

  const CHORDS = [
    { bass: 110.0, notes: [220.0, 261.63, 329.63, 392.0] },
    { bass: 87.31, notes: [174.61, 220.0, 261.63, 349.23] },
    { bass: 130.81, notes: [196.0, 261.63, 329.63, 392.0] },
    { bass: 98.0, notes: [196.0, 246.94, 293.66, 392.0] },
  ];

  function musicTarget() {
    return Math.max(0.0001, 0.85 * musicVolume);
  }

  function padChord() {
    if (!ctx || !musicBus) return;
    const chord = CHORDS[chordIndex % CHORDS.length];
    chordIndex++;
    chord.notes.forEach((f, i) => {
      voice({
        f,
        d: 7.8,
        g: 0.011,
        partials: [[1, 1], [2, 0.06, 0.7]],
        attack: 2.1,
        lp: 1050,
        send: 0.55,
        bus: musicBus,
        detune: i % 2 ? 4 : -4,
        pan: (i - 1.5) * 0.18,
      });
    });
    voice({ f: chord.bass, d: 8.2, g: 0.016, attack: 1.7, lp: 460, send: 0.3, bus: musicBus });
    burst({ d: 6.2, attack: 2.4, g: 0.0045, f: 640, to: 320, type: "lowpass", q: 0.4, send: 0.32, bus: musicBus, pan: -0.18 });
    stats.chords++;
  }

  function melody() {
    if (!ctx || !musicBus) return;
    const f = hz(220, rnd(5, 11));
    voice({
      f,
      d: 2.8,
      g: 0.03,
      partials: [[1, 1], [2.01, 0.24, 0.42], [3.9, 0.08, 0.22]],
      attack: 0.02,
      lp: 3600,
      send: 0.72,
      bus: musicBus,
      pan: rnd(-24, 24) / 100,
    });
    if (Math.random() < 0.4) {
      voice({
        f: f * 1.5,
        when: 0.32,
        d: 2.2,
        g: 0.016,
        partials: [[1, 1]],
        attack: 0.45,
        lp: 2800,
        send: 0.72,
        bus: musicBus,
        pan: rnd(-30, 30) / 100,
      });
    }
    stats.notes++;
  }

  function loopMelody() {
    if (!musicOn) return;
    if (!document.hidden) {
      try { melody(); } catch (err) { /* تجاهل */ }
    }
    melodyTimer = setTimeout(loopMelody, 2600 + Math.random() * 2600);
  }

  function loopChords() {
    if (!musicOn) return;
    if (!document.hidden) {
      try { padChord(); } catch (err) { /* تجاهل */ }
    }
    chordTimer = setTimeout(loopChords, 8200);
  }

  function startMusic(audioCtx, master, volume) {
    if (!audioCtx || !master) return;
    setup(audioCtx, master, volume);
    if (musicOn) return;
    musicOn = true;
    stats.music = true;
    if (musicBus && ctx) {
      const now = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), now);
      musicBus.gain.exponentialRampToValueAtTime(musicTarget(), now + 2.4);
    }
    chordIndex = 0;
    try { padChord(); } catch (err) { /* تجاهل */ }
    loopMelody();
    loopChords();
  }

  function stopMusic() {
    musicOn = false;
    stats.music = false;
    clearTimeout(melodyTimer);
    clearTimeout(chordTimer);
    melodyTimer = null;
    chordTimer = null;
    if (musicBus && ctx) {
      const now = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), now);
      musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    }
  }

  function setMusicVolume(value) {
    musicVolume = clamp(Number(value) || 0, 0, 1);
    if (musicOn && musicBus && ctx) {
      const now = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), now);
      musicBus.gain.setTargetAtTime(musicTarget(), now, 0.08);
    }
    return musicVolume;
  }

  BG.soundPacks = {
    list: PACKS,
    has: (id) => id === "classic" || !!KITS[id],
    play,
    startMusic,
    stopMusic,
    setMusicVolume,
    get musicOn() { return musicOn; },
    get stats() { return Object.assign({}, stats, { volume: musicVolume }); },
  };
})();
