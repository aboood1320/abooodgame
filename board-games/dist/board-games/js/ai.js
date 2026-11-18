/* ==========================================================================
   ألعاب الطاولة — طبقة الذكاء الاصطناعي المشتركة
   أدوات اختيار القرار، مستويات الصعوبة، ومؤقّتات أدوار الكمبيوتر
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;

  const LEVELS = {
    easy: { id: "easy", name: "سهل", icon: "🌱", delay: [500, 800], noise: 0.7, rank: 0, skill: 0.15 },
    normal: { id: "normal", name: "متوسط", icon: "⚖️", delay: [300, 500], noise: 0.15, rank: 1, skill: 0.5 },
    hard: { id: "hard", name: "صعب", icon: "🔥", delay: [200, 350], noise: 0.01, rank: 2, skill: 0.85 },
    expert: { id: "expert", name: "خبير", icon: "⚡", delay: [150, 280], noise: 0.0, rank: 3, skill: 1 },
  };

  const LEVEL_ORDER = ["easy", "normal", "hard", "expert"];
  const CHESS_RATINGS = { easy: "1320", normal: "1700", hard: "2400", expert: "3190" };

  function level(value) {
    return LEVELS[value] ? value : "normal";
  }

  function levelIndex(value) {
    return LEVEL_ORDER.indexOf(level(value));
  }

  /** قوة المستوى من 0 (سهل) إلى 1 (خبير). */
  function strength(value) {
    return levelIndex(value) / (LEVEL_ORDER.length - 1);
  }

  /** هل المستوى الحالي مساوٍ للمستوى المطلوب أو أعلى؟ */
  function atLeast(value, minimum) {
    return levelIndex(value) >= levelIndex(minimum);
  }

  /** مولّد عشوائي قابل للتكرار (mulberry32) لاختبارات ثابتة ولعب متسق. */
  function rng(seed) {
    let a = (Number(seed) || 1) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomFn(options) {
    return options && typeof options.rng === "function" ? options.rng : Math.random;
  }

  function chessRating(value) {
    return CHESS_RATINGS[level(value)];
  }

  function levelLabel(value, gameId) {
    const id = level(value);
    const spec = LEVELS[id];
    const rating = gameId === "chess" ? " (" + chessRating(id) + ")" : "";
    return spec.icon + " " + spec.name + rating;
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

  function weighted(items, weightFn, random) {
    const list = items || [];
    if (!list.length) return null;
    const rand = typeof random === "function" ? random : Math.random;
    const weights = list.map((item, index) => {
      const raw = Number(weightFn ? weightFn(item, index) : 1);
      return Number.isFinite(raw) && raw > 0 ? raw : 0.0001;
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = rand() * total;
    for (let i = 0; i < list.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /** يرتّب المرشّحين حسب النتيجة تنازليًا مع إبقاء الفهرس الأصلي. */
  function rank(items, scoreFn) {
    return (items || [])
      .filter(Boolean)
      .map((item, index) => ({
        item,
        index,
        score: Number(scoreFn ? scoreFn(item, index) : 0) || 0,
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
  }

  /** أفضل قرار واحد حسب دالة التقييم (بلا عشوائية). */
  function best(items, scoreFn) {
    const ranked = rank(items, scoreFn);
    return ranked.length ? ranked[0].item : null;
  }

  /** أفضل عدد من القرارات مرتّبة. */
  function top(items, scoreFn, count) {
    return rank(items, scoreFn)
      .slice(0, Math.max(1, Number(count) || 1))
      .map((entry) => entry.item);
  }

  /** احتمال ارتكاب خطأ واضح حسب المستوى (يُستخدم في الألعاب ذات المحرّكات الخاصة). */
  function blunder(value) {
    return [0.32, 0.1, 0.01, 0][levelIndex(value)];
  }

  /**
   * اختيار قرار من قائمة مرشّحين.
   * scoreFn يعيد قيمة أعلى = أفضل.
   * يمكن تمرير { rng } رابعًا لاختبارات حتمية.
   */
  function choose(items, scoreFn, value, options) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const spec = LEVELS[level(value)];
    const rand = randomFn(options);
    const scored = rank(list, scoreFn);
    const bestScore = scored[0].score;

    if (spec.id === "easy") {
      /* سهل: قرار عشوائي غالبًا، وإلا يختار من النصف الأعلى بترجيح خفيف. */
      if (rand() < 0.5) return list[Math.floor(rand() * list.length)];
      const pool = scored.slice(0, Math.max(2, Math.ceil(scored.length * 0.5)));
      const base = pool[pool.length - 1].score;
      const poolSpan = Math.max(1, bestScore - base);
      return weighted(
        pool,
        (entry) => 0.5 + ((entry.score - base) / poolSpan) * 1.5,
        rand
      ).item;
    }

    if (spec.id === "normal") {
      /* متوسط: أخطاء متفرقة، ثم أفضل ثلاثة بترجيح متزايد. */
      if (rand() < spec.noise) return list[Math.floor(rand() * list.length)];
      const pool = scored.slice(0, Math.min(3, scored.length));
      const base = pool[pool.length - 1].score;
      const poolSpan = Math.max(1, bestScore - base);
      return weighted(
        pool,
        (entry) => Math.max(0.35, Math.pow((entry.score - base) / poolSpan + 0.15, 2)),
        rand
      ).item;
    }

    if (spec.id === "hard") {
      /* صعب: الأفضل تقريبًا دائمًا، مع خطأ نادر جدًا للثاني. */
      if (scored[1] && rand() < 0.02) return scored[1].item;
      return scored[0].item;
    }

    /* خبير: الأفضل دائمًا، مع كسر التعادل عشوائيًا بين القيم المتساوية. */
    const ties = scored.filter((entry) => Math.abs(entry.score - bestScore) < 0.0001);
    return ties[Math.floor(rand() * ties.length)].item;
  }

  /** احتمال تنفيذ قرار «نظيف» حسب الصعوبة (خبير يرث قيمة صعب إن لم تُمرّر). */
  function chance(value, easy, normal, hard, expert) {
    const id = level(value);
    if (id === "easy") return easy;
    if (id === "normal") return normal;
    if (id === "expert" && expert != null) return expert;
    return hard;
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
    LEVEL_ORDER,
    chessRating,
    levelLabel,
    level,
    levelIndex,
    strength,
    atLeast,
    rng,
    isCpu,
    runner,
    delay,
    weighted,
    rank,
    best,
    top,
    blunder,
    choose,
    chance,
    autoAllowed,
    name,
    statusName,
  };
})();
