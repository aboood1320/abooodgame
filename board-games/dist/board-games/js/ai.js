/* ==========================================================================
   ألعاب الطاولة — طبقة الذكاء الاصطناعي المشتركة (محسّنة)
   أدوات اتخاذ القرار، مستويات الصعوبة، مؤقّتات أدوار الكمبيوتر، بحث anticipatory، وذاكرة أنماط.
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
      if (scored[1] && rand() < 0.02) return scored[1].item;
      return scored[0].item;
    }

    const ties = scored.filter((entry) => Math.abs(entry.score - bestScore) < 0.0001);
    return ties[Math.floor(rand() * ties.length)].item;
  }

  /**
   * اختيار قرار باستخدام معايير متعددة موزونة (جديد).
   * criteria: Array of { weight, scoreFn(item, index) }.
   * يُدمج كل معيار بعد تطبيع نتيجته إلى مدى [0,1] ثم يُضرب في وزنه.
   */
  function chooseMulti(items, criteria, value, options) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    if (!criteria || !criteria.length) return choose(list, criteria && criteria[0] ? criteria[0].scoreFn : null, value, options);

    const rand = randomFn(options);
    const spec = LEVELS[level(value)];
    const crit = criteria.map((c) => ({ weight: Number(c.weight || 1), fn: c.scoreFn }));

    /* حساب مجموع موزون مع تطبيع كل معيار إلى مدى [0,1] عبر المرشّحين. */
    const rawScores = list.map(() => crit.map(() => 0));
    for (let ci = 0; ci < crit.length; ci++) {
      const col = list.map((item, i) => Number(crit[ci].fn(item, i)) || 0);
      let min = col[0], max = col[0];
      for (let i = 1; i < col.length; i++) {
        if (col[i] < min) min = col[i];
        if (col[i] > max) max = col[i];
      }
      const span = Math.max(1, max - min);
      for (let i = 0; i < col.length; i++) {
        rawScores[i][ci] = (col[i] - min) / span;
      }
    }

    const combined = list.map((_, i) => {
      let s = 0;
      for (let ci = 0; ci < crit.length; ci++) s += rawScores[i][ci] * crit[ci].weight;
      return s;
    });

    const ranked = list.map((item, i) => ({ item, index: i, score: combined[i] }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const bestScore = ranked[0].score;

    if (spec.id === "easy") {
      if (rand() < 0.6) return list[Math.floor(rand() * list.length)];
      const pool = ranked.slice(0, Math.max(2, Math.ceil(ranked.length * 0.5)));
      const base = pool[pool.length - 1].score;
      const span = Math.max(1, bestScore - base);
      return weighted(pool, (e) => 0.5 + ((e.score - base) / span) * 1.5, rand).item;
    }

    if (spec.id === "normal") {
      if (rand() < spec.noise) return list[Math.floor(rand() * list.length)];
      const pool = ranked.slice(0, Math.min(3, ranked.length));
      const base = pool[pool.length - 1].score;
      const span = Math.max(1, bestScore - base);
      return weighted(pool, (e) => Math.max(0.35, Math.pow((e.score - base) / span + 0.15, 2)), rand).item;
    }

    if (spec.id === "hard") {
      if (ranked[1] && rand() < 0.03) return ranked[1].item;
      return ranked[0].item;
    }

    const ties = ranked.filter((e) => Math.abs(e.score - bestScore) < 0.0001);
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

  /* ======================= بحث anticipatory (look-ahead) جديد ======================= */

  /**
   * بحث negamax بسيط مع تقطيع ألفا-بيتا للألعاب التي توفر محرّك حالات.
   * opts.getMoves(state)      → قائمة الحركات المتاحة
   * opts.apply(state, move)   → تطبّق الحركة وتُعيد دالة تراجع (undo)
   * opts.undo(state, revert)  → ترجع الحالة إلى ما قبل الحركة
   * opts.evaluate(state, pid) → تقييم الحالة من وجهة نظر اللاعب pid (رقم أعلى = أفضل له)
   * opts.terminal(state)      → هل انتهت اللعبة؟
   * opts.depth                → عمق البحث (افتراضي 3)
   * opts.level                → مستوى الصعوبة (يؤثر على العشوائية والخطأ)
   * opts.perspective          → فهرس اللاعب الذي يُقيّم من وجهة نظره (افتراضي 0)
   * opts.rng                  → مولّد عشوائي مخصّص (اختياري)
   * يعيد { move, score, depth, nodes } أو null إن لم توجد حركات.
   */
  function search(state, opts) {
    const o = Object.assign({
      getMoves: null,
      apply: null,
      undo: null,
      evaluate: null,
      terminal: null,
      depth: 3,
      level: "normal",
      rng: Math.random,
      perspective: 0,
    }, opts || {});

    if (!o.getMoves || !o.apply || !o.undo || !o.evaluate) return null;

    const spec = LEVELS[level(o.level)];
    const ctx = { nodes: 0, aborted: false, deadline: Date.now() + (spec ? spec.delay[1] * 6 : 2000) };
    const maxDepth = Math.max(1, Math.min(6, Number(o.depth) || 3));

    function negamax(s, d, alpha, beta) {
      if (ctx.aborted) return 0;
      ctx.nodes++;
      if ((ctx.nodes & 255) === 0 && Date.now() > o.deadline) { ctx.aborted = true; return 0; }

      if (d <= 0 || (o.terminal && o.terminal(s))) return o.evaluate(s, o.perspective);

      const moves = o.getMoves(s);
      if (!moves.length) return o.evaluate(s, o.perspective);

      /* ترتيب خفيف: التقاطات/النهايات أولاً */
      moves.sort((a, b) => (b.scoreHint || 0) - (a.scoreHint || 0));

      let best = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        const revert = o.apply(s, moves[i]);
        const score = -negamax(s, d - 1, -beta, -alpha);
        o.undo(s, revert);
        if (ctx.aborted) return 0;
        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
      return best;
    }

    const moves = o.getMoves(state);
    if (!moves.length) return null;

    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (let i = 0; i < moves.length; i++) {
      const revert = o.apply(state, moves[i]);
      const score = -negamax(state, maxDepth - 1, -beta, -alpha);
      o.undo(state, revert);
      if (ctx.aborted) break;
      if (score > bestScore) { bestScore = score; bestMove = moves[i]; }
      if (score > alpha) alpha = score;
    }

    /* عشوائية محسوبة حسب المستوى في الاختيار النهائي */
    if (spec.id === "easy" && moves.length > 1 && o.rng() < 0.4) {
      bestMove = moves[Math.floor(o.rng() * moves.length)];
    } else if (spec.id === "normal" && moves.length > 1 && o.rng() < spec.noise) {
      const pool = moves.slice(0, Math.min(3, moves.length));
      bestMove = pool[Math.floor(o.rng() * pool.length)];
    }

    return { move: bestMove, score: bestScore, depth: maxDepth, nodes: ctx.nodes };
  }

  /* ======================= ذاكرة أنماط اللعب (transposition table) جديدة ======================= */

  const patternMemory = new Map();
  const MEMORY_LIMIT = 2000;

  function memoryPut(key, value) {
    if (patternMemory.size >= MEMORY_LIMIT) {
      const first = patternMemory.keys().next().value;
      if (first !== undefined) patternMemory.delete(first);
    }
    patternMemory.set(String(key), value);
  }

  function memoryGet(key) {
    return patternMemory.has(String(key)) ? patternMemory.get(String(key)) : null;
  }

  function memoryClear() {
    patternMemory.clear();
  }

  /* ======================= شخصيات اللعب جديدة ======================= */

  const PERSONAS = {
    balanced: { label: "متوازن", icon: "⚖️", attackBias: 0, riskBias: 0 },
    aggressive: { label: "هجومي", icon: "⚔️", attackBias: 0.35, riskBias: 0.2 },
    defensive: { label: "دفاعي", icon: "🛡️", attackBias: -0.25, riskBias: -0.2 },
  };

  function persona(id) {
    return PERSONAS[id] || PERSONAS.balanced;
  }

  /* ======================= أدوات تقييم تكتيكية مساعدة جديدة ======================= */

  /**
   * تعيد الحركات التي تُحقّق فوزًا فوريًا بناءً على دالة terminal مخصّصة من اللعبة.
   * isWinning(state, move, pid) تُستدعى بعد تطبيق الحركة وتُعيد true إن كان اللاعب pid ربح.
   */
  function immediateWins(moves, state, apply, undo, isWinning, pid) {
    const wins = [];
    for (let i = 0; i < moves.length; i++) {
      const revert = apply(state, moves[i]);
      let win = false;
      try { win = !!isWinning(state, moves[i], pid); } catch (e) { win = false; }
      undo(state, revert);
      if (win) wins.push(moves[i]);
    }
    return wins;
  }

  /** خطر 즉ري: pohyb يعرّض القطعة/اللاعب للخطر في الدور التالي (تقييم تقريبي). */
  function threatHint(move) {
    return Number(move && (move.threat || move.capture || move.scoreHint || 0));
  }

  /* هل يُسمح لهذا الجهاز بتشغيل دور الكمبيوتر تلقائيًا؟ */
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
    chooseMulti,
    chance,
    autoAllowed,
    name,
    statusName,
    search,
    memoryPut,
    memoryGet,
    memoryClear,
    PERSONAS,
    persona,
    immediateWins,
    threatHint,
  };
})();
