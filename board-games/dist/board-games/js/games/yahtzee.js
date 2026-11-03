/* ==========================================================================
   ياهتزي — خمسة نرد وثلاث رميات
   بطاقة نقاط كاملة (١٣ خانة)، مكافأة علوية، مكافأة ياهتزي، وذكاء اصطناعي
   يختار التثبيت والخانة الأنسب. كل الأسماء هنا تبدأ بـ yz لتفادي التعارض.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const DICE_COUNT = 5;
  const UPPER_BONUS = 35;
  const UPPER_TARGET = 63;

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);

  const CATEGORIES = [
    { key: "ones", label: "الآحاد", section: "upper", face: 1, hint: "مجموع نرد الآحاد" },
    { key: "twos", label: "الثنائيات", section: "upper", face: 2, hint: "مجموع نرد الثنائيات" },
    { key: "threes", label: "الثلاثات", section: "upper", face: 3, hint: "مجموع نرد الثلاثات" },
    { key: "fours", label: "الأربعات", section: "upper", face: 4, hint: "مجموع نرد الأربعات" },
    { key: "fives", label: "الخمسات", section: "upper", face: 5, hint: "مجموع نرد الخمسات" },
    { key: "sixes", label: "الستات", section: "upper", face: 6, hint: "مجموع نرد الستات" },
    { key: "threeKind", label: "ثلاثة متشابهة", section: "lower", hint: "مجموع النرد عند وجود ثلاثة متشابهة على الأقل" },
    { key: "fourKind", label: "أربعة متشابهة", section: "lower", hint: "مجموع النرد عند وجود أربعة متشابهة على الأقل" },
    { key: "fullHouse", label: "Full House", section: "lower", hint: "ثلاثة من رقم واثنان من رقم آخر = ٢٥" },
    { key: "smallStraight", label: "Straight صغير", section: "lower", hint: "أربعة أرقام متتالية = ٣٠" },
    { key: "largeStraight", label: "Straight كبير", section: "lower", hint: "خمسة أرقام متتالية = ٤٠" },
    { key: "yahtzee", label: "Yahtzee", section: "lower", hint: "خمسة نرد متشابهة = ٥٠" },
    { key: "chance", label: "Chance", section: "lower", hint: "مجموع النرد كاملًا" },
  ];
  const CAT_BY_KEY = {};
  CATEGORIES.forEach((cat) => { CAT_BY_KEY[cat.key] = cat; });
  const UPPER = CATEGORIES.filter((cat) => cat.section === "upper");
  const LOWER = CATEGORIES.filter((cat) => cat.section === "lower");

  // قيمة تقديرية للحفاظ على الخانات المرنة (تُستخدم فقط عند تسجيل صفر).
  const RESERVE = {
    ones: 2, twos: 4, threes: 6, fours: 8, fives: 10, sixes: 12,
    threeKind: 14, fourKind: 16, fullHouse: 18, smallStraight: 22,
    largeStraight: 24, yahtzee: 34, chance: 20,
  };

  const DEFAULT_OPTIONS = { bonusYahtzee: true, forceYahtzee: true };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let animTimer = null;
  let focusedKey = "";

  /* ------------------------------ أدوات النرد ------------------------------ */

  function countsOf(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    (dice || []).forEach((value) => {
      const n = Number(value);
      if (n >= 1 && n <= 6) counts[n] += 1;
    });
    return counts;
  }

  function isYahtzee(dice) {
    return Array.isArray(dice) && dice.length === DICE_COUNT && dice.every((d) => d === dice[0] && d >= 1);
  }

  function hasRun(dice, length) {
    const values = U.unique(dice.filter((d) => d >= 1 && d <= 6)).sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < values.length; i++) {
      run = values[i] === values[i - 1] + 1 ? run + 1 : 1;
      if (run >= length) return true;
    }
    return run >= length;
  }

  function scoreFor(player, key, dice) {
    const cat = CAT_BY_KEY[key];
    if (!cat || !Array.isArray(dice) || dice.length !== DICE_COUNT || dice.some((d) => !(d >= 1 && d <= 6))) return 0;
    const counts = countsOf(dice);
    const sum = U.sum(dice);
    const joker = !!(state && state.options.bonusYahtzee !== false && player && player.scores.yahtzee === 50 && isYahtzee(dice));

    if (cat.section === "upper") return counts[cat.face] * cat.face;

    switch (key) {
      case "threeKind":
        return counts.some((n) => n >= 3) || joker ? sum : 0;
      case "fourKind":
        return counts.some((n) => n >= 4) || joker ? sum : 0;
      case "fullHouse":
        return (counts.includes(3) && counts.includes(2)) || joker ? 25 : 0;
      case "smallStraight":
        return hasRun(dice, 4) || joker ? 30 : 0;
      case "largeStraight":
        return hasRun(dice, 5) || joker ? 40 : 0;
      case "yahtzee":
        return isYahtzee(dice) ? 50 : 0;
      case "chance":
        return sum;
      default:
        return 0;
    }
  }

  function forcedKey(player, dice) {
    if (!state || state.options.forceYahtzee === false) return null;
    if (!isYahtzee(dice)) return null;
    if (!player || player.scores.yahtzee != null) return null;
    return "yahtzee";
  }

  function legalCategories(player, dice) {
    if (!state || !player || !Array.isArray(dice) || dice.some((d) => !d)) return [];
    const forced = forcedKey(player, dice);
    return CATEGORIES.filter((cat) => {
      if (player.scores[cat.key] != null) return false;
      return !forced || cat.key === forced;
    });
  }

  function totalsFor(player) {
    let upper = 0;
    let lower = 0;
    let filled = 0;
    CATEGORIES.forEach((cat) => {
      const value = player.scores[cat.key];
      if (typeof value === "number") {
        filled += 1;
        if (cat.section === "upper") upper += value;
        else lower += value;
      }
    });
    const bonus = upper >= UPPER_TARGET ? UPPER_BONUS : 0;
    const yahtzeeBonus = Number(player.yahtzeeBonus) || 0;
    return {
      upper,
      lower,
      bonus,
      yahtzeeBonus,
      total: upper + lower + bonus + yahtzeeBonus,
      filled,
      upperRemaining: Math.max(0, UPPER_TARGET - upper),
    };
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).slice(0, 4).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      scores: Object.fromEntries(CATEGORIES.map((cat) => [cat.key, null])),
      yahtzeeBonus: 0,
    }));
  }

  function freshDice() {
    return new Array(DICE_COUNT).fill(0);
  }

  function beginTurn(note) {
    if (!state || state.over) return;
    state.selectedCategory = null;
    state.dice = freshDice();
    state.holds = new Array(DICE_COUNT).fill(false);
    state.rollsLeft = 3;
    state.rolled = false;
    state.busy = false;
    state.rolling = false;
    const player = state.players[state.current];
    state.notice = note || ("دور " + player.name + " — ارمِ النرد، ويمكنك تثبيت ما تريد ثم إعادة الرمي.");
    updateStatus();
    render();
    scheduleCpu();
  }

  function newState(options) {
    return {
      options: Object.assign({}, DEFAULT_OPTIONS, options || {}),
      players: makePlayers(),
      current: 0,
      dice: freshDice(),
      holds: new Array(DICE_COUNT).fill(false),
      rollsLeft: 3,
      rolled: false,
      selectedCategory: null,
      turnNo: 1,
      notice: "دور اللاعب الأول — اضغط «ارمِ النرد» للبدء.",
      last: null,
      over: false,
      winner: null,
      standings: [],
      busy: false,
      rolling: false,
    };
  }

  function cur() {
    return state && state.players ? state.players[state.current] : null;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function humanCanAct(player) {
    if (!state || !player || state.over || state.busy || state.rolling) return false;
    if (state.current !== player.index) return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function canRoll(player) {
    return humanCanAct(player) && state.rollsLeft > 0 && !state.busy && !state.rolling;
  }

  function canHold(player) {
    if (!humanCanAct(player) || !state.rolled || state.rollsLeft <= 0) return false;
    return true;
  }

  function selectedPoints(player) {
    if (!player || !state.selectedCategory || player.scores[state.selectedCategory] != null) return null;
    if (!state.rolled || state.dice.some((d) => !d)) return null;
    if (!legalCategories(player, state.dice).some((cat) => cat.key === state.selectedCategory)) return null;
    return scoreFor(player, state.selectedCategory, state.dice);
  }

  /* ------------------------------ الحركة ------------------------------ */

  function toggleHold(index) {
    const player = cur();
    if (!canHold(player)) return false;
    const i = U.clamp(Number(index) || 0, 0, DICE_COUNT - 1);
    state.holds[i] = !state.holds[i];
    state.notice = state.holds[i]
      ? "ثُبّت النرد رقم " + ar(i + 1) + " — لن يتغيّر في الرمية التالية."
      : "أُلغي تثبيت النرد رقم " + ar(i + 1) + ".";
    if (FX) FX.sound("select");
    render();
    return true;
  }

  function rollDice() {
    if (!state || state.over || state.busy || state.rolling) return null;
    const player = cur();
    if (!player || state.rollsLeft <= 0) return null;

    // أول رمية ترمي النرد كله، والرميات التالية تحتفظ بما ثُبّت.
    const first = !state.rolled;
    const next = state.dice.map((value, index) => {
      if (!first && state.holds[index] && value) return value;
      return U.roll(6);
    });

    state.dice = next;
    state.rolled = true;
    state.rollsLeft -= 1;
    state.selectedCategory = null;
    state.busy = true;
    state.rolling = true;
    state.notice = player.name + " يرمي النرد…";
    if (FX) FX.dice(next[0]);
    render();

    clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      if (!state || state.over) return;
      const rolledPlayer = state.players[state.current];
      state.busy = false;
      state.rolling = false;
      if (isYahtzee(next)) {
        state.notice = "ياهتزي! خمسة نرد متشابهة — سجّلها في خانة ياهتزي إن كانت متاحة.";
        if (apiRef) apiRef.log("<strong>" + esc(rolledPlayer.name) + "</strong> رمى <strong>ياهتزي</strong>!", "good");
        if (FX) FX.banner("ياهتزي!", { icon: "🎉", tone: "win", duration: 900 });
      } else if (state.rollsLeft <= 0) {
        state.notice = rolledPlayer.name + " — لا رميات متبقية. اختر خانة لتسجيل النتيجة.";
      } else {
        state.notice = rolledPlayer.name + " — يمكنك تثبيت نرد أو إعادة الرمي (" + ar(state.rollsLeft) + " متبقية).";
      }
      render();
      if (FX) FX.sound("place");
      scheduleCpu();
    }, 440);

    return next;
  }

  function selectCategory(key) {
    const player = cur();
    if (!humanCanAct(player)) return false;
    if (!state.rolled || state.busy || state.rolling) return false;
    if (!legalCategories(player, state.dice).some((cat) => cat.key === key)) {
      if (FX) FX.sound("error");
      return false;
    }
    state.selectedCategory = state.selectedCategory === key ? null : key;
    const cat = CAT_BY_KEY[key];
    if (state.selectedCategory) {
      const points = scoreFor(player, key, state.dice);
      state.notice = "اخترت «" + cat.label + "» — قيمتها " + ar(points) + ". اضغط «سجّل النتيجة» للتأكيد.";
      if (FX) FX.sound("select");
    } else {
      state.notice = "أُلغي اختيار الخانة.";
    }
    render();
    return true;
  }

  function applyScore(player, key, diceOverride, silent) {
    if (!state || state.over || !player) return null;
    const cat = CAT_BY_KEY[key];
    if (!cat || player.scores[key] != null) return null;
    const dice = (diceOverride || state.dice || []).slice();
    if (dice.length !== DICE_COUNT || dice.some((d) => !(d >= 1 && d <= 6))) return null;

    const forced = forcedKey(player, dice);
    if (forced && key !== forced) return null;

    const points = scoreFor(player, key, dice);
    player.scores[key] = points;
    let bonus = 0;
    if (state.options.bonusYahtzee !== false && key !== "yahtzee" && isYahtzee(dice) && player.scores.yahtzee === 50) {
      bonus = 100;
      player.yahtzeeBonus = (Number(player.yahtzeeBonus) || 0) + bonus;
    }

    state.last = {
      player: player.index,
      name: player.name,
      category: key,
      categoryName: cat.label,
      points,
      bonus,
      dice: dice.slice(),
    };

    if (apiRef) {
      let line = "<strong>" + esc(player.name) + "</strong> سجّل <strong>" + ar(points) + "</strong> في «" + esc(cat.label) + "».";
      if (bonus) line += " ومكافأة ياهتزي <strong>+" + ar(bonus) + "</strong>!";
      apiRef.log(line, bonus ? "good" : points > 0 ? "accent" : "warn");
    }
    if (bonus && FX) FX.banner("مكافأة ياهتزي +١٠٠", { icon: "💥", tone: "win", duration: 1100 });

    state.selectedCategory = null;
    const totals = totalsFor(player);
    if (totals.filled >= CATEGORIES.length && state.players.every((p) => totalsFor(p).filled >= CATEGORIES.length)) {
      finishGame();
      return points;
    }

    if (!silent) {
      state.current = (state.current + 1) % state.players.length;
      // تجاوز أي لاعب أكمل بطاقته (يحدث فقط عند الاستئناف من حالة غير متوقعة).
      let guard = 0;
      while (totalsFor(cur()).filled >= CATEGORIES.length && guard < state.players.length) {
        state.current = (state.current + 1) % state.players.length;
        guard += 1;
      }
      state.turnNo += 1;
      beginTurn();
    }
    return points;
  }

  function commitSelected() {
    const player = cur();
    if (!humanCanAct(player)) return false;
    if (!state.selectedCategory) {
      if (FX) FX.sound("error");
      return false;
    }
    const points = applyScore(player, state.selectedCategory);
    return points != null;
  }

  function finishGame() {
    if (!state || state.over) return;
    state.over = true;
    state.busy = false;
    state.rolling = false;
    const ranked = state.players
      .map((player) => ({ player, totals: totalsFor(player) }))
      .sort((a, b) => b.totals.total - a.totals.total || b.totals.upper - a.totals.upper);
    const top = ranked[0].totals.total;
    const winners = ranked.filter((entry) => entry.totals.total === top);
    state.winner = winners.length === 1 ? winners[0].player : null;
    state.standings = ranked.map((entry) => ({
      name: entry.player.name + (winners.includes(entry) && winners.length === 1 ? " · فائز" : ""),
      value: ar(entry.totals.total) + " نقطة · علوي " + ar(entry.totals.upper) + " · سفلي " + ar(entry.totals.lower) +
        (entry.totals.yahtzeeBonus ? " · مكافأة ياهتزي " + ar(entry.totals.yahtzeeBonus) : ""),
    }));
    state.notice = winners.length > 1
      ? "تعادل في الصدارة بـ" + ar(top) + " نقطة!"
      : "فاز " + winners[0].player.name + " بـ" + ar(top) + " نقطة!";
    if (apiRef) {
      apiRef.setStatus("انتهت — " + state.notice, "over");
      apiRef.gameOver({
        icon: "🎲",
        title: winners.length > 1 ? "تعادل بـ" + ar(top) + " نقطة" : "فاز " + winners[0].player.name + "!",
        text: "اكتملت البطاقات الثلاث عشرة. " + (winners.length > 1
          ? "انتهت المباراة بالتعادل عند " + ar(top) + " نقطة."
          : "المجموع الفائز " + ar(top) + " نقطة، مع احتساب المكافأة العلوية ومكافآت ياهتزي."),
        winner: winners.map((entry) => entry.player.name).join(" · "),
        standings: state.standings,
        tone: winners.length > 1 ? "draw" : "win",
      });
    }
    render();
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function bestCategory(player, dice) {
    const legal = legalCategories(player, dice);
    if (!legal.length) return null;
    let best = null;
    let bestRank = -Infinity;
    const totals = totalsFor(player);
    legal.forEach((cat) => {
      const immediate = scoreFor(player, cat.key, dice);
      let rank = immediate * 10;
      if (immediate === 0) rank -= (RESERVE[cat.key] || 10) * 2;
      if (cat.section === "upper") {
        const need = UPPER_TARGET - totals.upper;
        if (need > 0 && immediate > 0) rank += Math.min(immediate, need) * 1.5;
        if (need > 0 && totals.upper + immediate >= UPPER_TARGET) rank += 500;
      }
      if (rank > bestRank || (rank === bestRank && Math.random() < 0.5)) {
        bestRank = rank;
        best = cat.key;
      }
    });
    return best;
  }

  function bestImmediate(player, dice) {
    const legal = legalCategories(player, dice);
    let best = 0;
    legal.forEach((cat) => {
      const points = scoreFor(player, cat.key, dice);
      if (points > best) best = points;
    });
    return best;
  }

  function chooseHoldMask(player) {
    const level = player.level || "normal";
    if (level === "easy") {
      // المستوى السهل يثبّت النرد الأكثر تكرارًا أحيانًا فقط.
      const counts = countsOf(state.dice);
      let face = 1;
      for (let i = 2; i <= 6; i++) if (counts[i] > counts[face]) face = i;
      return state.dice.map((value, index) => (value === face && Math.random() < 0.55) || (index === 0 && Math.random() < 0.12));
    }

    const samples = level === "hard" ? 36 : 18;
    let bestMask = 0;
    let bestScore = -Infinity;
    for (let mask = 0; mask < (1 << DICE_COUNT); mask++) {
      const kept = state.dice.map((value, index) => ((mask & (1 << index)) ? value : 0));
      let expected = 0;
      for (let s = 0; s < samples; s++) {
        const trial = kept.map((value) => value || U.roll(6));
        expected += bestImmediate(player, trial);
      }
      expected /= samples;
      // فضّل تثبيت نرد إضافي عند التعادل لتقليل المخاطرة.
      const held = kept.filter(Boolean).length;
      expected += held * 0.01;
      if (expected > bestScore) {
        bestScore = expected;
        bestMask = mask;
      }
    }
    return state.dice.map((value, index) => !!value && !!(bestMask & (1 << index)));
  }

  function cpuCanAct(player) {
    return !!state && !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index && !state.over;
  }

  function scheduleCpu() {
    if (!state || state.over || !aiRunner) return;
    const player = cur();
    if (!player || !cpuCanAct(player)) return;
    if (state.busy || state.rolling) return;
    aiRunner.clear();
    aiRunner.later(() => cpuTurn(), AI.delay(player.level));
  }

  function cpuTurn() {
    if (!state || state.over) return;
    const player = cur();
    if (!player || !player.isCpu || state.current !== player.index || !AI.autoAllowed(apiRef, player)) return;
    if (state.busy || state.rolling) return;

    if (!state.rolled) {
      state.holds = new Array(DICE_COUNT).fill(false);
      rollDice();
      return;
    }

    if (state.rollsLeft > 0) {
      state.holds = chooseHoldMask(player);
      state.notice = player.name + " يثبّت نردًا ويستعد لإعادة الرمي…";
      render();
      aiRunner.later(() => {
        if (!state || state.over) return;
        const active = cur();
        if (!active || !active.isCpu || state.current !== active.index) return;
        rollDice();
      }, Math.max(260, AI.delay(player.level, 0.7)));
      return;
    }

    const key = bestCategory(player, state.dice);
    if (!key) { finishGame(); return; }
    state.selectedCategory = key;
    state.notice = player.name + " يختار «" + CAT_BY_KEY[key].label + "»…";
    render();
    aiRunner.later(() => {
      if (!state || state.over) return;
      const active = cur();
      if (!active || !active.isCpu || state.current !== active.index) return;
      applyScore(active, key);
    }, Math.max(300, AI.delay(player.level, 0.8)));
  }

  /* ------------------------------ الواجهة ------------------------------ */

  const PIPS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };

  function pipsHTML(value) {
    const on = new Set(PIPS[value] || []);
    let out = "";
    for (let i = 0; i < 9; i++) out += '<i class="yz-pip' + (on.has(i) ? " is-on" : "") + '"></i>';
    return out;
  }

  function diceHTML(player) {
    const canPress = canHold(player);
    const rolling = !!state.rolling;
    return state.dice.map((value, index) => {
      const held = !!state.holds[index];
      const classes = ["yz-die"];
      if (held) classes.push("is-held");
      if (rolling) classes.push("is-rolling");
      if (!value) classes.push("is-empty");
      if (canPress) classes.push("is-live");
      return '<button type="button" class="' + classes.join(" ") + '"' +
        ' data-yz-die="' + index + '" data-yz-focus="die-' + index + '"' +
        ' aria-pressed="' + (held ? "true" : "false") + '"' +
        ' aria-label="' + (value ? "النرد " + ar(index + 1) + ": " + ar(value) : "النرد " + ar(index + 1) + " لم يُرم بعد") + (held ? " — مثبّت" : "") + '"' +
        (canPress ? "" : " disabled") + ">" +
        '<span class="yz-die-face">' + (value ? pipsHTML(value) : '<span class="yz-die-empty" aria-hidden="true">?</span>') + "</span>" +
        '<span class="yz-hold-tag" aria-hidden="true">' + (held ? "مثبّت" : (value ? "تثبيت" : "—")) + "</span>" +
        "</button>";
    }).join("");
  }

  function rowHTML(player, cat, active, legal, couldBeForced) {
    const value = player.scores[cat.key];
    const used = typeof value === "number";
    const selected = active && state.selectedCategory === cat.key;
    const potential = active && !used && legal ? scoreFor(player, cat.key, state.dice) : null;
    const display = used ? ar(value) : potential != null ? ar(potential) : "—";
    const classes = ["yz-row"];
    if (used) classes.push("is-used");
    if (selected) classes.push("is-selected");
    if (active) classes.push("is-active-row");
    if (active && !used && !legal) classes.push("is-locked");
    if (used && value === 0) classes.push("is-zero");
    const label = '<span class="yz-row-label">' + esc(cat.label) + "</span>";
    const points = '<span class="yz-row-value">' + display + "</span>";
    const hint = '<span class="yz-row-hint">' + (used
      ? "مسجّلة"
      : active
        ? (legal ? "متاحة" : (couldBeForced ? "مقفلة" : "غير متاحة"))
        : "—") + "</span>";

    if (active) {
      return '<button type="button" class="' + classes.join(" ") + '" data-yz-cat="' + cat.key + '" data-yz-focus="cat-' + cat.key + '"' +
        (legal ? "" : " disabled") +
        ' title="' + esc(cat.hint) + '" aria-label="' + esc(cat.label) + (used ? " — مسجّلة " + ar(value) : legal ? " — متاحة " + ar(potential || 0) : " — غير متاحة") + '">' +
        label + points + hint + "</button>";
    }
    return '<div class="' + classes.join(" ") + '" title="' + esc(cat.hint) + '">' + label + points + hint + "</div>";
  }

  function sheetHTML(player, active) {
    const totals = totalsFor(player);
    const playerCanAct = active && humanCanAct(player);
    const forced = forcedKey(player, state.dice);
    const legal = playerCanAct ? legalCategories(player, state.dice).map((cat) => cat.key) : [];
    const upperRows = UPPER.map((cat) => rowHTML(player, cat, playerCanAct, legal.includes(cat.key), !!forced)).join("");
    const lowerRows = LOWER.map((cat) => rowHTML(player, cat, playerCanAct, legal.includes(cat.key), !!forced)).join("");
    const bonusWidth = Math.min(100, (totals.upper / UPPER_TARGET) * 100);
    const classes = ["yz-sheet", "p" + player.index];
    if (active) classes.push("is-current");
    if (player.isCpu) classes.push("is-cpu");
    return '<article class="' + classes.join(" ") + '" aria-label="بطاقة نقاط ' + esc(player.name) + '">' +
      '<header class="yz-sheet-head">' +
        '<span class="yz-sheet-avatar" aria-hidden="true">' + (player.isCpu ? "🤖" : "👤") + "</span>" +
        '<span class="yz-sheet-name"><strong>' + esc(player.name) + "</strong><small>" +
          (active ? "الدور الحالي" : (player.isCpu ? "كمبيوتر" : "بشري")) + " · " + ar(totals.filled) + "/١٣ خانة</small></span>" +
        '<span class="yz-sheet-total"><small>المجموع</small><b>' + ar(totals.total) + "</b></span>" +
      "</header>" +
      '<div class="yz-sheet-body">' +
        '<div class="yz-sec-head"><span>القسم العلوي</span><small>' + ar(totals.upper) + " / " + ar(UPPER_TARGET) + "</small></div>" +
        '<div class="yz-rows">' + upperRows + "</div>" +
        '<div class="yz-bonus-track" title="مكافأة علوية ٣٥ عند ٦٣ نقطة">' +
          '<span class="yz-bonus-fill" style="width:' + bonusWidth.toFixed(1) + '%"></span>' +
          '<span class="yz-bonus-text">مكافأة علوية ' + (totals.bonus ? "✓ +" + ar(UPPER_BONUS) : ar(UPPER_BONUS) + " عند ٦٣") + "</span>" +
        "</div>" +
        '<div class="yz-subtotal"><span>المجموع العلوي</span><b>' + ar(totals.upper) + "</b></div>" +
        '<div class="yz-sec-head yz-sec-lower"><span>القسم السفلي</span><small>' + ar(totals.lower) + "</small></div>" +
        '<div class="yz-rows">' + lowerRows + "</div>" +
        (totals.yahtzeeBonus ? '<div class="yz-subtotal is-bonus"><span>مكافآت ياهتزي</span><b>+' + ar(totals.yahtzeeBonus) + "</b></div>" : "") +
        '<div class="yz-subtotal"><span>المجموع السفلي</span><b>' + ar(totals.lower) + "</b></div>" +
        '<div class="yz-grand"><span>المجموع الكلي</span><b>' + ar(totals.total) + "</b></div>" +
      "</div>" +
    "</article>";
  }

  function previewHTML(player) {
    if (!player) return "";
    if (!state.rolled) return "ارمِ النرد أولًا. يمكنك بعدها تثبيت أي نرد وإعادة الرمي حتى ثلاث مرات.";
    const forced = forcedKey(player, state.dice);
    if (forced) return "رميت ياهتزي وخانة Yahtzee ما زالت فارغة — يجب تسجيلها هناك وفق القاعدة الأصلية.";
    if (!state.selectedCategory) return "اختر خانة من بطاقة اللاعب الحالي، ثم اضغط «سجّل النتيجة». كل خانة تُستخدم مرة واحدة فقط.";
    const cat = CAT_BY_KEY[state.selectedCategory];
    const points = scoreFor(player, state.selectedCategory, state.dice);
    let text = "الخانة المختارة: «" + cat.label + "» — " + ar(points) + " نقطة.";
    if (points === 0) text += " ستُستهلك الخانة بصفر.";
    if (state.options.forceYahtzee !== false && player.scores.yahtzee == null && isYahtzee(state.dice)) {
      text = "ياهتزي! يجب تسجيلها في خانة Yahtzee: ٥٠ نقطة.";
    }
    return text;
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const active = !!player;
    const canAct = humanCanAct(player);
    const rollable = canRoll(player);
    const scoreReady = canAct && state.selectedCategory && selectedPoints(player) != null;
    const round = state.over ? 13 : Math.min(13, totalsFor(player).filled + 1);
    const cards = state.players.map((p) => sheetHTML(p, active && p.index === state.current)).join("");

    const top = '<div class="yz-top">' +
      '<div class="yz-brand"><span class="yz-emblem" aria-hidden="true">🎲</span><div>' +
        "<strong>ياهتزي</strong><small>خمسة نرد · ثلاث رميات · ثلاث عشرة خانة</small></div></div>" +
      '<div class="yz-pills">' +
        '<span class="yz-pill">الجولة <b>' + ar(round) + "</b> / ١٣</span>" +
        '<span class="yz-pill">دور <b>' + esc(player ? player.name : "—") + "</b></span>" +
        '<span class="yz-pill">الرميات <b>' + ar(state.rollsLeft) + "</b></span>" +
        (isOnline() ? '<span class="yz-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const holdHint = !state.rolled
      ? "ارمِ النرد لبدء الدور."
      : state.rollsLeft > 0
        ? "اضغط على أي نرد لتثبيته قبل إعادة الرمي."
        : "انتهت الرميات — اختر خانة من البطاقة.";

    const play = '<section class="yz-play" aria-label="طاولة النرد">' +
      '<div class="yz-play-head">' +
        '<div class="yz-turn-card p' + (player ? player.index : 0) + '">' +
          '<span class="yz-turn-dot" aria-hidden="true"></span>' +
          '<span class="yz-turn-copy"><small>' + (canAct ? "دورك الآن" : (player && player.isCpu ? "دور الكمبيوتر" : "الدور الحالي")) + "</small>" +
          "<strong>" + esc(player ? player.name : "—") + "</strong></span>" +
        "</div>" +
        '<div class="yz-roll-meter" aria-label="الرميات المتبقية: ' + ar(state.rollsLeft) + '">' +
          '<span class="yz-roll-dots" aria-hidden="true">' +
            [0, 1, 2].map((i) => '<i class="' + (i < state.rollsLeft ? "is-full" : "") + '"></i>').join("") +
          "</span><small>الرميات المتبقية</small><b>" + ar(state.rollsLeft) + "</b>" +
        "</div>" +
      "</div>" +
      '<div class="yz-table">' +
        '<div class="yz-dice" role="group" aria-label="نرد ' + esc(player ? player.name : "") + '">' + diceHTML(player) + "</div>" +
        '<p class="yz-dice-hint">' + holdHint + "</p>" +
        '<div class="yz-controls">' +
          '<button type="button" class="yz-btn yz-btn-roll' + (rollable ? " is-live" : "") + '" data-yz-roll data-yz-focus="roll"' + (rollable ? "" : " disabled") + ">" +
            '<span aria-hidden="true">🎲</span><span>' + (!state.rolled ? "ارمِ النرد" : state.rollsLeft > 0 ? "أعد الرمي" : "لا رميات") + "</span>" +
          "</button>" +
          '<button type="button" class="yz-btn yz-btn-score" data-yz-score data-yz-focus="score"' + (scoreReady ? "" : " disabled") + ">" +
            '<span aria-hidden="true">✓</span><span>سجّل النتيجة</span></button>' +
          '<button type="button" class="yz-btn yz-btn-ghost" data-yz-clear data-yz-focus="clear"' + (canAct && state.selectedCategory ? "" : " disabled") + ">إلغاء التحديد</button>" +
        "</div>" +
        '<div class="yz-preview" data-yz-preview>' + esc(previewHTML(player)) + "</div>" +
      "</div>" +
      '<p class="yz-notice" role="status" aria-live="polite">' + esc(state.notice) + "</p>" +
    "</section>";

    const sheets = '<section class="yz-sheets" aria-label="بطاقات نقاط اللاعبين">' + cards + "</section>";

    focusedKey = captureFocus();
    rootRef.innerHTML = '<div class="yz-game' + (state.over ? " is-over" : "") + (state.rolled ? " is-rolled" : "") + '">' +
      top + '<div class="yz-layout">' + play + sheets + "</div></div>";
    restoreFocus();
  }

  function captureFocus() {
    if (!rootRef) return "";
    const active = document.activeElement;
    if (!active || !rootRef.contains(active)) return "";
    return active.getAttribute("data-yz-focus") || "";
  }

  function restoreFocus() {
    if (!rootRef || !focusedKey) return;
    const key = focusedKey;
    focusedKey = "";
    const next = rootRef.querySelector('[data-yz-focus="' + key + '"]');
    if (next && !next.disabled) {
      try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e) { /* ignore */ } }
    }
  }

  function updateStatus() {
    if (!apiRef || !state || state.over) return;
    const player = cur();
    if (player) {
      const totals = totalsFor(player);
      apiRef.setStatus("دور " + player.name + " — الجولة " + ar(Math.min(13, totals.filled + 1)), "live");
    }
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function onClick(event) {
    if (!state || state.over) return;
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    const die = target.closest("[data-yz-die]");
    if (die) {
      if (humanCanAct(cur())) toggleHold(Number(die.getAttribute("data-yz-die")));
      return;
    }
    const roll = target.closest("[data-yz-roll]");
    if (roll) {
      if (canRoll(cur())) rollDice();
      return;
    }
    const cat = target.closest("[data-yz-cat]");
    if (cat) {
      if (humanCanAct(cur())) selectCategory(cat.getAttribute("data-yz-cat"));
      return;
    }
    const score = target.closest("[data-yz-score]");
    if (score) {
      if (humanCanAct(cur())) commitSelected();
      return;
    }
    const clear = target.closest("[data-yz-clear]");
    if (clear) {
      if (humanCanAct(cur())) {
        state.selectedCategory = null;
        state.notice = "أُلغي اختيار الخانة.";
        render();
      }
    }
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "yahtzee",
    name: "ياهتزي",
    en: "YAHTZEE",
    icon: "🎲",
    accent: "#e0b05f",
    cardClass: "card-yahtzee",
    tagline: "خمسة نرد، ثلاث رميات، وبطاقة من ١٣ خانة — ثبّت النرد واصنع أفضل مجموع.",
    players: "2–4",
    duration: "25–45 دقيقة",
    complexity: "سهلة–متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "القواعد الأصلية مفعّلة افتراضيًا، ويمكن تخفيفها لمباراة أسرع.",
      defaults: DEFAULT_OPTIONS,
      fields: [
        { key: "bonusYahtzee", label: "مكافأة ياهتزي +١٠٠ وقاعدة الجوكر", type: "toggle", hint: "رمي ياهتزي إضافي بعد تسجيل الخانة يمنح ١٠٠ نقطة ويُحتسب كجوكر في الخانات السفلية." },
        { key: "forceYahtzee", label: "إلزام خانة ياهتزي عند رميها", type: "toggle", hint: "إن كانت خانة Yahtzee فارغة فيجب تسجيل الرمية فيها." },
      ],
      summary(options) {
        return "١٣ خانة · مكافأة علوية ٣٥ عند ٦٣ · " +
          (options.bonusYahtzee ? "مكافأة ياهتزي +١٠٠" : "بدون مكافأة ياهتزي") + " · " +
          (options.forceYahtzee ? "ياهتزي إلزامية" : "ياهتزي اختيارية");
      },
    },

    rules: {
      goal: "اجمع أعلى مجموع بعد ملء بطاقة النقاط ذات الخانات الثلاث عشرة. في كل دور ترمي خمسة نرد حتى ثلاث رميات، ويمكنك تثبيت أي نرد بين الرميات.",
      facts: [["اللاعبون", "٢–٤"], ["النرد", "٥ نرد، ٣ رميات"], ["الخانات", "١٣ خانة"], ["المكافأة العلوية", "٣٥ نقطة عند ٦٣+"]],
      components: [
        "خمسة نرد عادية من ستة أوجه لكل لاعب.",
        "بطاقة نقاط تضم ست خانات علوية وسبع خانات سفلية.",
        "قلم لحساب المجاميع والمكافآت (رقميًا تُحسب تلقائيًا).",
      ],
      setup: [
        "يُختار عدد اللاعبين من ٢ إلى ٤، ويُحدَّد لكل مقعد بشري أو كمبيوتر.",
        "تبدأ البطاقات فارغة، ويبدأ اللاعب الأول ثم ينتقل الدور بالترتيب.",
        "كل لاعب يلعب ١٣ دورًا، دورًا واحدًا لكل خانة.",
      ],
      steps: [
        "<strong>الرمية الأولى:</strong> ارمِ النرد الخمسة كلها.",
        "<strong>التثبيت:</strong> اضغط على النرد الذي تريد الاحتفاظ به، ثم أعد رمي الباقي. لديك ثلاث رميات كحد أقصى.",
        "<strong>التسجيل:</strong> بعد أي رمية يمكنك اختيار خانة فارغة من بطاقتك. تُحسب قيمتها فورًا وتُغلق الخانة.",
        "<strong>القسم العلوي:</strong> الآحاد حتى الستات تجمع النرد المطابق فقط. إذا بلغ مجموع القسم العلوي ٦٣ أو أكثر تحصل على مكافأة ٣٥ نقطة.",
        "<strong>القسم السفلي:</strong> ثلاثة/أربعة متشابهة تجمع كل النرد عند تحقق الشرط، وFull House = ٢٥، وStraight صغير = ٣٠، وكبير = ٤٠، وYahtzee = ٥٠، وChance تجمع النرد كله.",
        "<strong>ياهتزي إضافي:</strong> إذا سجّلت ياهتزي ٥٠ ثم رميت ياهتزي آخر تحصل على ١٠٠ نقطة إضافية، وتُحتسب الخانات السفلية بقاعدة الجوكر.",
      ],
      winning: "بعد اكتمال البطاقات الثلاث عشرة يفوز صاحب أعلى مجموع كلي، بما فيه المكافأة العلوية ومكافآت ياهتزي. التعادل ممكن إذا تساوى المجموعان.",
      notes: [
        "قاعدة ياهتزي الأصلية: إذا رميت خمسة متشابهة وخانة Yahtzee فارغة وجب تسجيلها فيها؛ يمكن إيقاف هذا الإلزام من خيارات اللعب.",
        "قاعدة الجوكر: بعد تسجيل ياهتزي ٥٠، يُحتسب ياهتزي إضافي كـFull House أو Straight صغير/كبير أو مجموع كامل حسب الخانة، مع مكافأة ١٠٠.",
        "الخانة التي تُسجَّل بصفر تُغلق ولا يمكن استخدامها لاحقًا.",
        "الذكاء الاصطناعي يقدّر أفضل تثبيت للنرد ثم يختار الخانة ذات القيمة الاستراتيجية الأعلى، مع احتساب تقدم القسم العلوي.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(animTimer);
      state = newState(api.options || {});
      focusedKey = "";
      apiRef.log(
        "بدأت ياهتزي مع " + ar(state.players.length) + " لاعبين — " +
        (state.options.bonusYahtzee ? "مكافأة ياهتزي وقاعدة الجوكر مفعّلتان." : "بدون مكافأة ياهتزي."),
        "accent"
      );
      updateStatus();
      render();
      scheduleCpu();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          categories: CATEGORIES,
          render,
          rollDice,
          toggleHold,
          selectCategory,
          commitSelected,
          applyScore,
          scoreFor,
          bestCategory,
          totalsFor,
          legalCategories,
          isYahtzee,
          finishGame,
          setDice(values, holds) {
            if (!state) return;
            const list = Array.isArray(values) ? values.slice(0, DICE_COUNT) : [];
            while (list.length < DICE_COUNT) list.push(1);
            state.dice = list.map((v) => U.clamp(Number(v) || 1, 1, 6));
            state.holds = state.dice.map((v, i) => !!(holds && holds[i]));
            state.rolled = true;
            state.rollsLeft = Math.min(state.rollsLeft, 2);
            state.busy = false;
            state.rolling = false;
            state.notice = "نرد تجريبي جاهز لتسجيل الخانة.";
            render();
          },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            beginTurn();
          },
          setRollsLeft(count) {
            if (!state) return;
            state.rollsLeft = U.clamp(Number(count) || 0, 0, 3);
            render();
          },
          setScore(playerIndex, key, value) {
            if (!state || !state.players[playerIndex] || !CAT_BY_KEY[key]) return;
            state.players[playerIndex].scores[key] = Math.max(0, Number(value) || 0);
            render();
          },
          forceScore(playerIndex, key) {
            if (!state || !state.players[playerIndex]) return null;
            return applyScore(state.players[playerIndex], key, state.dice, true);
          },
          clearTurnBusy() {
            if (!state) return;
            state.busy = false;
            state.rolling = false;
            render();
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(animTimer);
          if (aiRunner) aiRunner.clear();
          state = BG.netCodec.decode(data);
          if (!state || !Array.isArray(state.players) || !state.players.length) return;
          state.players = state.players.slice(0, 4).map((player, index) => {
            const scores = Object.assign({}, player.scores || {});
            CATEGORIES.forEach((cat) => {
              if (typeof scores[cat.key] !== "number") scores[cat.key] = null;
            });
            return Object.assign({
              index,
              name: "اللاعب " + (index + 1),
              type: "human",
              level: "normal",
              isCpu: false,
            }, player, { index, scores, yahtzeeBonus: Number(player.yahtzeeBonus) || 0, isCpu: AI.isCpu(player) });
          });
          state.current = U.clamp(Number(state.current) || 0, 0, state.players.length - 1);
          state.dice = Array.isArray(state.dice) && state.dice.length === DICE_COUNT
            ? state.dice.map((v) => U.clamp(Number(v) || 0, 0, 6))
            : freshDice();
          state.holds = Array.isArray(state.holds) ? state.holds.slice(0, DICE_COUNT).map(Boolean) : new Array(DICE_COUNT).fill(false);
          while (state.holds.length < DICE_COUNT) state.holds.push(false);
          state.rollsLeft = U.clamp(Number(state.rollsLeft) || 0, 0, 3);
          state.rolled = !!state.rolled;
          state.selectedCategory = null;
          state.busy = false;
          state.rolling = false;
          state.turnNo = Math.max(1, Number(state.turnNo) || 1);
          state.over = !!state.over;
          state.notice = state.over ? "انتهت المباراة." : "استُئنفت المباراة — دور " + state.players[state.current].name + ".";
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          state.rolling = false;
          if (state.over) { render(); return; }
          render();
          scheduleCpu();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(animTimer);
          animTimer = null;
          if (rootRef) rootRef.removeEventListener("click", onClick);
          rootRef = null;
          apiRef = null;
          state = null;
          focusedKey = "";
        },
      };
    },
  };

  BG.register(game);
})();
