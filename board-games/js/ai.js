/* ==========================================================================
   ألعاب الطاولة — طبقة الذكاء الاصطناعي المشتركة
   أدوات اختيار القرار، مستويات الصعوبة، ومؤقّتات أدوار الكمبيوتر
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;

  const LEVELS = {
    easy: { id: "easy", name: "سهل (250)", icon: "🌱", delay: [500, 800], noise: 0.7 },
    normal: { id: "normal", name: "متوسط (1000)", icon: "⚖️", delay: [300, 500], noise: 0.15 },
    hard: { id: "hard", name: "صعب (2000)", icon: "🔥", delay: [200, 350], noise: 0.01 },
    expert: { id: "expert", name: "خبير (3600)", icon: "⚡", delay: [150, 280], noise: 0.0 },
  };

  function level(value) {
    return LEVELS[value] ? value : "normal";
  }

  function isCpu(player) {
    return !!player && (player.type === "cpu" || player.isCpu === true);
  }

  function runner() {
    const timers = new Set();
    return {
      later(fn, ms) {
        const id = setTimeout(() => {
          timers.delete(id);
          fn();
        }, Math.max(0, ms || 0));
        timers.add(id);
        return id;
      },
      clear() {
        timers.forEach((id) => clearTimeout(id));
        timers.clear();
      },
      get size() {
        return timers.size;
      },
    };
  }

  function delay(value, scale) {
    const spec = LEVELS[level(value)];
    const base = spec.delay[0] + Math.random() * (spec.delay[1] - spec.delay[0]);
    return Math.round(base * (scale == null ? 1 : scale));
  }

  function weighted(items, weightFn) {
    const list = items || [];
    if (!list.length) return null;
    const weights = list.map((item, index) => {
      const raw = Number(weightFn ? weightFn(item, index) : 1);
      return Number.isFinite(raw) && raw > 0 ? raw : 0.0001;
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /**
   * اختيار قرار من قائمة مرشّحين.
   * scoreFn يعيد قيمة أعلى = أفضل.
   */
  function choose(items, scoreFn, value) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;
    const spec = LEVELS[level(value)];
    if (spec.id === "easy" || list.length === 1) return U.pick(list);

    const scored = list.map((item, index) => ({ item, index, score: Number(scoreFn ? scoreFn(item, index) : 0) || 0 }));
    scored.sort((a, b) => b.score - a.score);

    if (spec.id === "normal") {
      if (Math.random() < spec.noise) return U.pick(list);
      const pool = scored.slice(0, Math.min(3, scored.length));
      const base = pool[pool.length - 1].score;
      return weighted(pool, (entry) => Math.max(1, entry.score - base + 1)).item;
    }

    if (Math.random() < spec.noise) return (scored[1] || scored[0]).item;
    const top = scored[0].score;
    const ties = scored.filter((entry) => Math.abs(entry.score - top) < 0.001);
    return U.pick(ties).item;
  }

  /** احتمال تنفيذ قرار «نظيف» حسب الصعوبة */
  function chance(value, easy, normal, hard) {
    const id = level(value);
    if (id === "easy") return easy;
    if (id === "hard") return hard;
    return normal;
  }

  /**
   * هل يُسمح لهذا الجهاز بتشغيل دور الكمبيوتر تلقائيًا؟
   * في اللعب المحلي: نعم دائمًا. في الشبكة: المضيف وحده يدير مقاعد الكمبيوتر،
   * والضيف لا يدير إلا مقعده المحلي (وهو بشري عادةً).
   */
  function autoAllowed(api, seat) {
    const net = api && api.net;
    if (!net || !net.enabled) return true;
    if (net.boot) return false;
    const index = seat && typeof seat.index === "number" ? seat.index : -1;
    if (net.isHost) return net.isCpuSeat(index);
    return index === net.seat && isCpu(seat);
  }

  function name(player) {
    return player && player.name ? player.name : "الكمبيوتر";
  }

  function statusName(player) {
    return name(player) + (isCpu(player) ? " · كمبيوتر" : "");
  }

  BG.ai = {
    LEVELS,
    level,
    isCpu,
    runner,
    delay,
    weighted,
    choose,
    chance,
    autoAllowed,
    name,
    statusName,
  };
})();
