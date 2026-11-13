/* ==========================================================================
   ياهتزي — خمسة نرد وثلاث رميات
   بطاقة نقاط كاملة (13 خانة) ومكافأة علوية 35 نقطة، وذكاء اصطناعي بسيط.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const CATS = [
    { key: "ones", label: "الآحاد", face: 1, upper: true },
    { key: "twos", label: "الثنائيات", face: 2, upper: true },
    { key: "threes", label: "الثلاثات", face: 3, upper: true },
    { key: "fours", label: "الرباعيات", face: 4, upper: true },
    { key: "fives", label: "الخمسات", face: 5, upper: true },
    { key: "sixes", label: "الستات", face: 6, upper: true },
    { key: "three", label: "ثلاثة متشابهة" },
    { key: "four", label: "أربعة متشابهة" },
    { key: "full", label: "فول هاوس (25)" },
    { key: "small", label: "ستريت صغير (30)" },
    { key: "large", label: "ستريت كبير (40)" },
    { key: "yahtzee", label: "ياهتزي (50)" },
    { key: "chance", label: "الحظ" },
  ];
  const UPPER = CATS.filter((c) => c.upper);

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function countsOf(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach((value) => { if (value >= 1 && value <= 6) counts[value] += 1; });
    return counts;
  }

  function scoreFor(key, dice) {
    if (!dice || dice.some((d) => !d)) return 0;
    const counts = countsOf(dice);
    const sum = U.sum(dice);
    const cat = CATS.find((c) => c.key === key);
    if (!cat) return 0;
    if (cat.upper) return counts[cat.face] * cat.face;
    if (key === "three") return counts.some((n) => n >= 3) ? sum : 0;
    if (key === "four") return counts.some((n) => n >= 4) ? sum : 0;
    if (key === "full") {
      const three = counts.some((n) => n === 3);
      const two = counts.some((n) => n === 2);
      const five = counts.some((n) => n === 5);
      return (three && two) || five ? 25 : 0;
    }
    if (key === "small") {
      const has = (n) => counts[n] > 0;
      const runs = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      return runs.some((run) => run.every(has)) ? 30 : 0;
    }
    if (key === "large") {
      const has = (n) => counts[n] > 0;
      return [1, 2, 3, 4, 5].every(has) || [2, 3, 4, 5, 6].every(has) ? 40 : 0;
    }
    if (key === "yahtzee") return counts.some((n) => n === 5) ? 50 : 0;
    if (key === "chance") return sum;
    return 0;
  }

  function upperTotal(card) {
    return UPPER.reduce((sum, cat) => sum + (card[cat.key] || 0), 0);
  }

  function bonus(card) {
    return upperTotal(card) >= 63 ? 35 : 0;
  }

  function total(card) {
    return CATS.reduce((sum, cat) => sum + (card[cat.key] || 0), 0) + bonus(card);
  }

  function makePlayers() {
    return XG.players(apiRef, 4, ["#e0a25f", "#7fb2a0", "#c77c64", "#8fa6c7"])
      .slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length)))
      .map((player) => ({ ...player, card: Object.fromEntries(CATS.map((c) => [c.key, null])) }));
  }

  function newState() {
    return {
      players: makePlayers(),
      current: 0,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rolls: 0,
      round: 1,
      notice: "ارمِ النرد لبدء دورك. لديك ثلاث رميات.",
      last: null,
      over: false,
      busy: false,
    };
  }

  function cur() {
    return state.players[state.current];
  }

  function filledCount(card) {
    return CATS.filter((c) => card[c.key] != null).length;
  }

  function nextTurn() {
    state.dice = [0, 0, 0, 0, 0];
    state.held = [false, false, false, false, false];
    state.rolls = 0;
    state.last = null;
    if (state.players.every((p) => filledCount(p.card) === CATS.length)) {
      finish();
      return;
    }
    let guard = 0;
    do {
      state.current = (state.current + 1) % state.players.length;
      if (state.current === 0) state.round += 1;
      guard += 1;
    } while (filledCount(cur().card) === CATS.length && guard < 20);
    state.notice = "دور " + cur().name + " — ارمِ النرد.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  /* byAi: حركات الكمبيوتر تمرّ من هذه الدوال نفسها فلا تُفحص ب«هل يستطيع البشري التصرف» (كان يرفضها فلا يلعب الكمبيوتر) */
  function roll(byAi) {
    if (!state || state.over || state.busy) return null;
    if (!byAi && !XG.canAct(apiRef, state, state.current, state.over)) return null;
    if (state.rolls >= 3) return null;
    for (let i = 0; i < 5; i++) {
      if (state.rolls === 0 || !state.held[i]) state.dice[i] = U.roll(6);
    }
    state.rolls += 1;
    state.notice = state.rolls < 3 ? "اختر النرد الذي تريد تثبيته ثم ارمِ الباقي." : "اختر خانة من بطاقتك لتسجيل النتيجة.";
    if (state.rolls === 1) apiRef.log("<strong>" + esc(cur().name) + "</strong> بدأ دوره في ياهتزي.", "accent");
    render();
    return state.dice.slice();
  }

  function toggleHold(index) {
    if (!state || state.over || state.rolls === 0 || state.rolls >= 3) return;
    if (!XG.canAct(apiRef, state, state.current, state.over)) return;
    state.held[index] = !state.held[index];
    render();
  }

  function score(key, byAi) {
    if (!state || state.over || state.busy) return false;
    if (!byAi && !XG.canAct(apiRef, state, state.current, state.over)) return false;
    if (state.rolls === 0) {
      apiRef.toast("ارمِ النرد أولًا.", "warn");
      return false;
    }
    const player = cur();
    if (player.card[key] != null) return false;
    const value = scoreFor(key, state.dice);
    player.card[key] = value;
    const cat = CATS.find((c) => c.key === key);
    state.last = { player: player.index, key, value };
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> سجّل " + esc(cat.label) + ": <strong>" + ar(value) + "</strong> نقطة.",
      value > 0 ? "good" : "warn"
    );
    if (filledCount(player.card) === CATS.length) {
      apiRef.log("<strong>" + esc(player.name) + "</strong> أكمل بطاقته بمجموع " + ar(total(player.card)) + ".", "accent");
    }
    nextTurn();
    return value;
  }

  function finish() {
    state.over = true;
    state.busy = false;
    const ranking = XG.standings(state.players, (p) => total(p.card), (p) => {
      const b = bonus(p.card) ? " + مكافأة" : "";
      return "علوي " + ar(upperTotal(p.card)) + b;
    });
    const winner = ranking[0];
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log("انتهت ياهتزي. الفائز: <strong>" + esc(winner.name) + "</strong> بـ" + ar(winner.value) + " نقطة.", "accent");
    render();
    apiRef.gameOver({
      title: "انتهت ياهتزي",
      text: "أعلى مجموع في بطاقة النقاط يفوز. المكافأة العلوية تُمنح عند ٦٣ نقطة في الآحاد حتى الستات.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🎲",
      standings: ranking,
    });
  }

  function bestTarget(dice, card) {
    return CATS.filter((cat) => card[cat.key] == null)
      .map((cat) => ({ cat, value: scoreFor(cat.key, dice) }))
      .sort((a, b) => b.value - a.value)[0];
  }

  function holdsFor(key, dice) {
    const counts = countsOf(dice);
    const held = [false, false, false, false, false];
    const markFaces = (faces) => {
      const remaining = new Set(faces);
      dice.forEach((value, index) => {
        if (remaining.has(value)) { held[index] = true; remaining.delete(value); }
      });
    };
    const most = counts.indexOf(Math.max(...counts));
    if (key === "ones" || key === "twos" || key === "threes" || key === "fours" || key === "fives" || key === "sixes") {
      const face = CATS.find((c) => c.key === key).face;
      markFaces([face]);
      return held;
    }
    if (key === "three" || key === "four" || key === "yahtzee") {
      if (counts[most] >= 2) markFaces([most]);
      return held;
    }
    if (key === "full") {
      const faces = [];
      counts.forEach((n, face) => { if (face && n >= 2) faces.push(face); });
      if (faces.length) markFaces([faces[0]]);
      return held;
    }
    if (key === "small" || key === "large") {
      const present = [];
      counts.forEach((n, face) => { if (face && n) present.push(face); });
      present.sort((a, b) => a - b);
      const runs = [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      const run = runs.find((r) => r.every((f) => counts[f])) || present.slice(0, 4);
      markFaces(run);
      return held;
    }
    return held;
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const player = cur();
    if (state.rolls === 0) {
      roll(true);
      aiRunner.later(aiStep, AI.delay(player.level, 0.7));
      return;
    }
    if (state.rolls < 3) {
      const target = bestTarget(state.dice, player.card);
      const holds = holdsFor(target ? target.cat.key : "chance", state.dice);
      const any = holds.some(Boolean);
      state.held = any ? holds : holds.map((_, index) => index < 2);
      render();
      aiRunner.later(() => { if (state && !state.over) { roll(true); aiRunner.later(aiStep, AI.delay(player.level, 0.7)); } }, AI.delay(player.level, 0.5));
      return;
    }
    const target = bestTarget(state.dice, player.card);
    if (!target) return;
    aiRunner.later(() => { if (state && !state.over) score(target.cat.key, true); }, AI.delay(player.level, 0.6));
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.9));
    }
  }

  function dieHtml(value, held, index) {
    const faces = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    };
    const dots = faces[value] || [];
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="' + (dots.includes(i) ? "on" : "") + '"></i>';
    return (
      '<button type="button" class="yz-die xg-die ' + (held ? "is-held" : "") + '" data-yz-die="' + index +
      '" aria-pressed="' + (held ? "true" : "false") + '" aria-label="نرد ' + ar(value) + (held ? " مثبت" : "") + '">' +
      cells + "</button>"
    );
  }

  function cardHtml(player) {
    const active = player.index === state.current;
    const upper = upperTotal(player.card);
    const rows = CATS.map((cat) => {
      const value = player.card[cat.key];
      const clickable = active && value == null && state.rolls > 0 && XG.canAct(apiRef, state, state.current, state.over);
      const potential = clickable ? scoreFor(cat.key, state.dice) : null;
      return (
        "<tr><td>" + cat.label + "</td><td>" +
        (value != null
          ? "<strong>" + ar(value) + "</strong>"
          : clickable
            ? '<button type="button" class="yz-cell" data-yz-score="' + cat.key + '">' + ar(potential) + "</button>"
            : '<span class="xg-muted">—</span>') +
        "</td></tr>"
      );
    }).join("");
    return (
      '<div class="xg-panel yz-card ' + (active ? "is-active" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row">' + BG.playerProfile.playerHTML(player, "yz-player-avatar") + "<strong>" + esc(player.name) + "</strong></span>" +
      '<span class="xg-chip">' + ar(total(player.card)) + "</span></div>" +
      '<table class="xg-table"><thead><tr><th>الخانة</th><th>النقاط</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="xg-note">المجموع العلوي: <strong>' + ar(upper) + "</strong> / ٦٣ " + (bonus(player.card) ? '<span class="xg-good">· المكافأة ✓</span>' : "") + "</p>" +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const remaining = 3 - state.rolls;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    rootRef.innerHTML =
      '<div class="xg yz">' +
      XG.bar("ياهتزي", "خمسة نرد · ثلاث رميات · ثلاث عشرة خانة", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("الرميات", ar(state.rolls) + " / ٣"),
      ].join("")) +
      '<div class="yz-play xg-panel">' +
      '<div class="yz-dice">' + state.dice.map((value, index) => dieHtml(value, state.held[index], index)).join("") + "</div>" +
      '<div class="xg-row yz-actions">' +
      '<button type="button" class="xg-btn primary" data-yz-roll ' + (!can || state.rolls >= 3 || state.over ? "disabled" : "") + ">" +
      (state.rolls === 0 ? "ارمِ النرد" : state.rolls < 3 ? "ارمِ المتبقي" : "اكتملت الرميات") + "</button>" +
      '<span class="xg-chip">متبقٍ ' + ar(remaining) + " رميات</span></div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      "</div>" +
      '<div class="yz-cards">' + state.players.map(cardHtml).join("") + "</div>" +
      "</div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const rollBtn = event.target.closest("[data-yz-roll]");
    if (rollBtn) { roll(); return; }
    const die = event.target.closest("[data-yz-die]");
    if (die) { toggleHold(Number(die.dataset.yzDie)); return; }
    const cell = event.target.closest("[data-yz-score]");
    if (cell) score(cell.dataset.yzScore);
  }

  const game = {
    id: "yahtzee",
    name: "ياهتزي",
    en: "YAHTZEE",
    icon: "🎲",
    accent: "#c98a55",
    cardClass: "card-yahtzee",
    tagline: "خمسة نرد وثلاث رميات وبطاقة من ثلاث عشرة خانة — اجمع أعلى مجموع.",
    players: "2–4",
    duration: "20–35 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "القواعد القياسية: ثلاث رميات، ومكافأة علوية 35 نقطة عند 63.",
      defaults: {},
      fields: [],
      summary() { return "5 نرد · 3 رميات · 13 خانة"; },
    },

    rules: {
      goal: "اجمع أعلى عدد من النقاط عبر ملء الخانات الثلاث عشرة في بطاقتك قبل خصومك. الفائز صاحب المجموع الأكبر.",
      facts: [["النرد", "٥"], ["الرميات", "٣ لكل دور"], ["الخانات", "١٣"], ["المكافأة", "٣٥ عند ٦٣+"]],
      components: [
        "خمسة نرد قياسية وثلاث رميات في كل دور.",
        "بطاقة نقاط من 13 خانة: الآحاد حتى الستات، ثلاثة وأربعة متشابهة، فول هاوس، ستريت صغير وكبير، ياهتزي، والحظ.",
        "مكافأة علوية قدرها 35 نقطة عند بلوغ 63 نقطة في الخانات العلوية.",
      ],
      setup: [
        "يبدأ اللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة.",
        "في كل دور يمكنك رمي النرد ثلاث مرات، مع تثبيت أي نرد بين الرميات.",
        "بعد أول رمية يمكنك تسجيل النتيجة في خانة واحدة فقط ثم ينتهي دورك.",
      ],
      steps: [
        "<strong>الرمية الأولى:</strong> ارمِ النرد الخمسة كاملًا.",
        "<strong>التثبيت:</strong> اضغط على أي نرد لتثبيته؛ الرمية التالية تُبقي المثبت وتعيد رمي الباقي.",
        "<strong>التسجيل:</strong> بعد الرمية الأولى أو الثانية أو الثالثة اختر خانة فارغة. تُسجَّل النتيجة المحسوبة آليًا.",
        "<strong>الفول هاوس:</strong> ثلاثة من رقم واثنان من رقم آخر = 25 نقطة. الستريت الصغير 30 والكبير 40.",
        "<strong>ياهتزي:</strong> خمسة نرد متشابهة = 50 نقطة، وتُحتسب أيضًا فول هاوس في هذه النسخة.",
        "<strong>المكافأة:</strong> إذا بلغ مجموع الخانات العلوية 63 أو أكثر تحصل على 35 نقطة إضافية.",
      ],
      winning: "عند امتلاء البطاقات الثلاث عشرة عند جميع اللاعبين، يفوز صاحب المجموع الكلي الأعلى (مع المكافأة العلوية).",
      notes: [
        "لا يمكن تسجيل خانة مستخدمة مسبقًا؛ يمكنك تسجيل صفر إذا لم تناسبك النتيجة.",
        "الذكاء الاصطناعي يثبّت النرد الأكثر تكرارًا ويختار الخانة ذات أفضل قيمة متوقعة.",
        "في اللعب الشبكي تُزامَن الحالة كاملة بعد كل إجراء.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت ياهتزي مع " + ar(state.players.length) + " لاعبين. ثلاث رميات لكل دور.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          roll,
          toggleHold,
          score,
          scoreFor,
          total,
          aiStep,
          setDice(values) {
            if (!state) return;
            state.dice = (values || []).slice(0, 5).map((v) => U.clamp(Number(v) || 1, 1, 6));
            while (state.dice.length < 5) state.dice.push(1);
            state.rolls = Math.max(1, state.rolls);
            render();
          },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            state.rolls = 0;
            state.dice = [0, 0, 0, 0, 0];
            state.held = [false, false, false, false, false];
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
          clearTimeout(timer);
          state = BG.netCodec.decode(data);
          state.busy = false;
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          render();
          settle();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(timer);
          timer = null;
          if (rootRef) rootRef.removeEventListener("click", onClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
