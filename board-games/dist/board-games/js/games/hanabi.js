/* ==========================================================================
   هانابي — لعبة تعاونية: فريق واحد يرى أيدي بعضه، ولا يرى يده
   أكملوا الألعاب النارية الخمسة من ١ إلى ٥ قبل أن تنطفئ الفتائل.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const U = BG.util;
  const FX = BG.fx;

  const COLORS = {
    red: { name: "أحمر", icon: "🔥", c1: "#e45861", c2: "#8f1f2b", light: false },
    yellow: { name: "أصفر", icon: "☀️", c1: "#f0c24c", c2: "#a97616", light: false },
    green: { name: "أخضر", icon: "🌿", c1: "#5fbf7a", c2: "#1f6b3a", light: false },
    blue: { name: "أزرق", icon: "💧", c1: "#5aa7e0", c2: "#1f4f8f", light: false },
    white: { name: "أبيض", icon: "🤍", c1: "#ececf6", c2: "#9a9ab2", light: true },
  };
  const COLOR_KEYS = ["red", "yellow", "green", "blue", "white"];
  const NUMBERS = [1, 2, 3, 4, 5];
  const COPY_COUNTS = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 };

  const DIFFICULTIES = {
    easy: {
      label: "متعلم",
      delay: 1150,
      playRisk: 0.99,
      clueScore: 4,
      hint: "الزملاء يلعبون البطاقات المؤكدة فقط ويحتفظون بالأدلة للتلميحات الواضحة.",
    },
    medium: {
      label: "متوازن",
      delay: 850,
      playRisk: 0.9,
      clueScore: 3,
      hint: "الزملاء يوازنون بين اللعب والتلميح، ويحترمون البطاقات النادرة.",
    },
    hard: {
      label: "خبير",
      delay: 650,
      playRisk: 0.72,
      clueScore: 2,
      hint: "الزملاء يحسبون الاحتمالات ويحمون الخمسات ويستغلون كل تلميح.",
    },
  };

  function ar(value) {
    return String(value == null ? "" : value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function colorStyle(color, lightText) {
    const info = COLORS[color];
    return "--c1:" + info.c1 + ";--c2:" + info.c2 + (lightText ? ";color:#20263a" : "");
  }

  function cardStyle(card) {
    return colorStyle(card.color, COLORS[card.color].light);
  }

  function scoreOf() {
    if (!state) return 0;
    return COLOR_KEYS.reduce((total, color) => total + (state.fireworks[color] || 0), 0);
  }

  function completedColors() {
    return COLOR_KEYS.filter((color) => state.fireworks[color] === 5).length;
  }

  function tierFor(score) {
    if (score >= 25) return "أسطوري";
    if (score >= 20) return "ممتاز";
    if (score >= 15) return "جيد";
    if (score >= 10) return "مقبول";
    return "متعثر";
  }

  const game = {
    id: "hanabi",
    name: "هانابي",
    en: "Hanabi",
    icon: "🎆",
    tagline: "فريق واحد… خمسة ألوان… لا أحد يرى يده",
    blurb: "لعبة تعاونية شهيرة: كل لاعب يرى أيدي زملائه ولا يرى يده. التلميحات هي لغتكم الوحيدة لإكمال الألعاب النارية الخمسة من ١ إلى ٥ قبل نفاد الفتائل. الفوز للفريق كله.",
    players: "٢–٥ لاعبين",
    time: "٢٠–٣٠ دقيقة",
    age: "+٨",
    coop: true,
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayers: 3,

    options: {
      defaults: { difficulty: "medium" },
      fields: [
        {
          key: "difficulty",
          type: "choice",
          label: "خبرة زملاء الفريق",
          choices: [
            { value: "easy", label: "متعلم — سهل" },
            { value: "medium", label: "متوازن — متوسط" },
            { value: "hard", label: "خبير — صعب" },
          ],
          hint: "يحدد ذكاء الزملاء الآليين فقط. جميع اللاعبين في فريق واحد، والفوز مشترك.",
        },
      ],
      summary(values) {
        const info = DIFFICULTIES[(values && values.difficulty) || "medium"] || DIFFICULTIES.medium;
        return "فريق هانابي: " + info.label;
      },
    },

    rulesFor(options) {
      const difficulty = (options && options.difficulty) || "medium";
      const info = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
      return {
        goal: "الفريق كله فريق واحد. الهدف المشترك هو إكمال خمسة ألعاب نارية، لون لكل لعبة، بالأرقام من ١ إلى ٥ بالترتيب. إذا اكتملت الألعاب الخمسة فاز الجميع، وإذا نفدت الفتائل أو انتهت البطاقات دون ٢٥ نقطة خسر الجميع. لا يوجد فائز فردي.",
        facts: [
          ["عدد اللاعبين", "٢ إلى ٥ لاعبين — كلهم في فريق واحد"],
          ["المكوّنات", "٥٠ بطاقة (٥ ألوان × أرقام ١–٥) · ٨ أدلة · ٣ فتائل"],
          ["مدة اللعب", "٢٠–٣٠ دقيقة تقريباً"],
          ["الهدف", "٢٥ نقطة: كل لعبة نارية مكتملة من ١ إلى ٥"],
        ],
        components: [
          "بطاقات الألوان: أحمر، أصفر، أخضر، أزرق، أبيض. كل لون يحتوي: ثلاثة ١، واثنان من كل من ٢ و٣ و٤، وواحد ٥ (١٠ بطاقات لكل لون).",
          "ثمانية أدلة زرقاء: تُصرف عند إعطاء تلميح، وتُستعاد عند رمي بطاقة أو إكمال لعبة نارية بالرقم ٥.",
          "ثلاث فتائل حمراء: كل خطأ في اللعب يحرق فتيلاً. إذا احترقت الفتائل الثلاثة خسر الفريق فوراً.",
          "خمس ألعاب نارية: كل لعبة تبدأ بالرقم ١ وتتقدم بالترتيب حتى ٥.",
        ],
        setup: [
          "اخلطوا البطاقات الخمسين ووزّعوا لكل لاعب: ٥ بطاقات في لعبة ٢–٣ لاعبين، أو ٤ بطاقات في لعبة ٤–٥ لاعبين.",
          "ضعوا ٨ أدلة و٣ فتائل أمام الفريق. لا يبدأ أحد بتلميحات جاهزة أكثر من ذلك.",
          "كل لاعب يضع بطاقاته بحيث يراها الآخرون ولا يراها هو. هذا هو جوهر هانابي.",
          "تبدأ اللعبة باللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة. البطاقات المتبقية تشكل السحب.",
        ],
        steps: [
          "<strong>في دورك اختر فعلاً واحداً فقط:</strong> إعطاء تلميح، أو رمي بطاقة، أو لعب بطاقة.",
          "<strong>إعطاء تلميح:</strong> ادفع دليلاً واحداً، واختر لاعباً آخر (لا نفسك)، ثم قل لوناً أو رقماً. يجب على اللاعب أن يظهر كل بطاقاته التي تطابق ذلك اللون أو الرقم، ويضع عليها علامة يعرفها الجميع. يمكن أن يكشف التلميح بطاقة واحدة أو أكثر.",
          "<strong>رمي بطاقة:</strong> اختر بطاقة من يدك وضعها مكشوفة في المهملات، ثم استعد دليلاً واحداً (حتى حد ٨ أدلة).",
          "<strong>لعب بطاقة:</strong> اختر بطاقة من يدك وضعها في لعبة لونها. إذا كانت الرقم التالي في ذلك اللون تقدمت اللعبة. إذا كانت الرقم ٥ اكتملت اللعبة واستعدت دليلاً. إذا كانت خاطئة احترق فتيل وذهبت البطاقة للمهملات.",
          "<strong>بعد اللعب أو الرمي:</strong> اسحب بطاقة جديدة إذا بقي في السحب بطاقات، حتى تعود يدك إلى حجمها الأصلي.",
          "<strong>لا تتكلموا عن بطاقاتكم:</strong> لا يجوز وصف البطاقة أو الإشارة إلى قيمتها أو الترتيب بكلام خارج التلميحات. الدردشة السريعة للتشجيع فقط، لا لتسريب المعلومات.",
          "<strong>نهاية اللعبة:</strong> الفوز الفوري عند اكتمال الألعاب الخمسة (٢٥ نقطة). الخسارة الفورية عند نفاد الفتائل. إذا نفدت البطاقات، يأخذ كل لاعب دوراً أخيراً واحداً ثم تُحسب النقاط.",
        ],
        winning: "يفوز الفريق إذا اكتملت الألعاب النارية الخمسة ووصلت النقاط إلى ٢٥. إذا نفدت الفتائل الثلاث خسر الفريق فوراً. إذا نفدت البطاقات وانتهت الأدوار الأخيرة، تُحسب النقاط: ٢٥ فوز كامل، وأقل من ذلك نتيجة فريق لم تكتمل — والجميع يخسر أو يفوز معاً، ولا يُنسب الفوز أو الخسارة لأحد بعينه.",
        notes: [
          "لا أحد يرى بطاقاته: الواجهة تخفي يدك عنك وتُظهر لك أيدي زملائك. التلميحات تُعلَّم على بطاقاتك ليعرف الجميع ما تعرفه أنت.",
          "التلميح لا يكشف البطاقة كاملة بالضرورة: قد تعرف اللون فقط أو الرقم فقط، وعليك أن تستنتج الباقي مع فريقك.",
          "استخدام الدليل عند الحاجة أفضل من رمي بطاقة قد تكون ضرورية. راقبوا البطاقات المرمية والألعاب المكتملة.",
          "الزميل الآلي يرى أيدي الآخرين مثل أي لاعب، ولا يرى يده إلا عبر التلميحات التي وصلته. مستواه يحدد دقته في الاستنتاج.",
          "مستوى الزملاء المختار: " + info.label + ". " + info.hint,
          "هذه نسخة تعاونية بالكامل: كل المؤشرات مشتركة، ولا توجد نقاط فردية ولا فائز منفرد.",
        ],
      };
    },

    rules: {},
  };

  let state = null;
  let apiRef = null;
  let rootRef = null;
  let destroyed = false;
  let aiTimer = null;
  let applyingNet = false;
  let selectedUid = null;
  let localViewer = 0;
  let curtainSeat = -1;
  let visibleHands = {};
  let lastVisibleRequest = 0;
  let eventSeq = 0;
  let overReported = false;
  let fxSeenEvent = 0;

  function difficultyInfo() {
    return DIFFICULTIES[(state && state.difficulty) || "medium"] || DIFFICULTIES.medium;
  }

  function isNet() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function isGuest() {
    return isNet() && !apiRef.net.isHost;
  }

  function isHostOrLocal() {
    return !isNet() || !!apiRef.net.isHost;
  }

  function mySeat() {
    if (isNet() && Number.isInteger(apiRef.net.seat) && apiRef.net.seat >= 0) return apiRef.net.seat;
    return -1;
  }

  function humanSeats() {
    return state ? state.players.filter((player) => !player.isCpu).map((player) => player.index) : [];
  }

  function viewSeat() {
    if (isNet()) return mySeat() >= 0 ? mySeat() : 0;
    return localViewer;
  }

  function activePlayer() {
    return state && state.players[state.activeSeat] ? state.players[state.activeSeat] : null;
  }

  function canActNow() {
    if (!state || state.over) return false;
    const player = activePlayer();
    if (!player || player.isCpu) return false;
    if (isNet()) return mySeat() === state.activeSeat && !apiRef.net.isCpuSeat(state.activeSeat);
    return true;
  }

  function netSync() {
    if (!isNet() || applyingNet || !isHostOrLocal() || !state) return;
    if (apiRef.net.sendState) {
      try { apiRef.net.sendState(); } catch (err) { /* الشبكة اختيارية */ }
    }
    sendVisibleHands();
  }

  function note(html, kind) {
    if (!state) return;
    state.log.push({ html: html, kind: kind || "" });
    if (state.log.length > 18) state.log.shift();
    if (apiRef && typeof apiRef.log === "function") {
      try { apiRef.log(html.replace(/<[^>]*>/g, ""), kind || ""); } catch (err) { /* ignore */ }
    }
  }

  function sound(name) {
    try { if (FX && typeof FX.sound === "function") FX.sound(name); } catch (err) { /* الصوت اختياري */ }
  }

  function markEvent(kind, extra) {
    eventSeq += 1;
    state.lastEvent = Object.assign({ id: eventSeq, kind: kind, at: Date.now() }, extra || {});
    return state.lastEvent.id;
  }

  function playEventSound(event) {
    if (!event || !event.id) return;
    if (event.id <= fxSeenEvent) return;
    fxSeenEvent = event.id;
    if (event.kind === "clue") sound("reveal");
    else if (event.kind === "discard") sound("card");
    else if (event.kind === "play") sound("score");
    else if (event.kind === "burn") sound("error");
    else if (event.kind === "complete") sound("win");
  }

  function normalizeState() {
    if (!state) return;
    if (!Array.isArray(state.players)) state.players = [];
    if (!Array.isArray(state.deck)) state.deck = [];
    if (!Array.isArray(state.discard)) state.discard = [];
    if (!Array.isArray(state.log)) state.log = [];
    if (!state.fireworks) state.fireworks = {};
    if (!state.completed) state.completed = {};
    COLOR_KEYS.forEach((color) => {
      if (!Number.isFinite(state.fireworks[color])) state.fireworks[color] = 0;
      if (!Array.isArray(state.completed[color])) state.completed[color] = [];
    });
    if (!state.tokens) state.tokens = { clues: 8, fuses: 3 };
    if (!Number.isFinite(state.tokens.clues)) state.tokens.clues = 8;
    if (!Number.isFinite(state.tokens.fuses)) state.tokens.fuses = 3;
    state.players.forEach((player, index) => {
      if (!player) return;
      player.index = index;
      if (!Array.isArray(player.hand)) player.hand = [];
      player.handCount = Number.isFinite(player.handCount) ? player.handCount : player.hand.length;
      if (!player.name) player.name = "لاعب " + (index + 1);
    });
    if (!Number.isFinite(state.activeSeat) || state.activeSeat < 0 || state.activeSeat >= state.players.length) state.activeSeat = 0;
    if (!Number.isFinite(state.deckCount)) state.deckCount = state.deck.length;
    if (state.finalTurns !== null && !Number.isFinite(state.finalTurns)) state.finalTurns = null;
    if (!state.step) state.step = state.over ? "over" : "play";
    if (!state.notice) state.notice = "الفريق يرى أيدي بعضه… ولا أحد يرى يده.";
  }

  function makeDeck() {
    const cards = [];
    COLOR_KEYS.forEach((color) => {
      NUMBERS.forEach((number) => {
        const copies = COPY_COUNTS[number];
        for (let i = 0; i < copies; i += 1) {
          cards.push({ uid: "", color: color, number: number, knownColor: null, knownNumber: null });
        }
      });
    });
    const shuffled = shuffle(cards);
    shuffled.forEach((card, index) => {
      card.uid = "hc" + (index + 1).toString(36) + Math.floor(Math.random() * 1296).toString(36);
    });
    return shuffled;
  }

  function drawCard(player) {
    if (!state || !state.deck.length) return null;
    const card = state.deck.shift();
    player.hand.push(card);
    player.handCount = player.hand.length;
    state.deckCount = state.deck.length;
    return card;
  }

  function createState(seats, difficulty) {
    const players = (seats || []).slice(0, 5).map((seat, index) => ({
      index: index,
      name: (seat && seat.name) || "لاعب " + (index + 1),
      isCpu: !!(seat && (seat.isCpu || seat.type === "cpu")),
      level: (seat && seat.level) || difficulty || "medium",
      hand: [],
      handCount: 0,
      cluesGiven: 0,
      cardsPlayed: 0,
      cardsDiscarded: 0,
      misplays: 0,
    }));
    while (players.length < 2) {
      players.push({
        index: players.length,
        name: "اللاعب " + (players.length + 1),
        isCpu: true,
        level: difficulty || "medium",
        hand: [],
        handCount: 0,
        cluesGiven: 0,
        cardsPlayed: 0,
        cardsDiscarded: 0,
        misplays: 0,
      });
    }

    state = {
      players: players,
      difficulty: DIFFICULTIES[difficulty] ? difficulty : "medium",
      deck: makeDeck(),
      deckCount: 0,
      discard: [],
      completed: { red: [], yellow: [], green: [], blue: [], white: [] },
      fireworks: { red: 0, yellow: 0, green: 0, blue: 0, white: 0 },
      tokens: { clues: 8, fuses: 3 },
      activeSeat: 0,
      step: "play",
      finalTurns: null,
      turn: 0,
      over: false,
      win: false,
      score: 0,
      result: null,
      notice: "فريق واحد… خمسة ألوان… لا أحد يرى يده.",
      lastEvent: null,
      log: [],
      privateMasked: false,
    };
    const handSize = players.length <= 3 ? 5 : 4;
    players.forEach((player) => {
      for (let i = 0; i < handSize; i += 1) {
        const card = state.deck.shift();
        if (card) player.hand.push(card);
      }
      player.handCount = player.hand.length;
    });
    state.deckCount = state.deck.length;
    state.nextAt = Date.now() + (players[0].isCpu ? difficultyInfo().delay : 600);
    return state;
  }

  function addToDiscard(card) {
    state.discard.push(card);
    if (state.discard.length > 50) state.discard.shift();
  }

  function playCard(seat, uid) {
    if (!state || state.over || state.step !== "play" || seat !== state.activeSeat) return false;
    const player = state.players[seat];
    if (!player) return false;
    const index = player.hand.findIndex((card) => card.uid === uid);
    if (index < 0) return false;
    const card = player.hand[index];
    player.hand.splice(index, 1);
    player.handCount = player.hand.length;
    const color = card.color;
    const next = (state.fireworks[color] || 0) + 1;
    if (card.number === next) {
      state.fireworks[color] = card.number;
      state.completed[color].push(card);
      player.cardsPlayed += 1;
      let complete = false;
      if (card.number === 5) {
        complete = true;
        state.tokens.clues = Math.min(8, state.tokens.clues + 1);
      }
      state.score = scoreOf();
      state.notice = complete
        ? "اكتملت لعبة " + COLORS[color].name + "! عاد دليل إلى الفريق."
        : "بطاقة صحيحة: " + COLORS[color].name + " " + ar(card.number) + " تقدمت.";
      note("<strong>" + esc(player.name) + "</strong> لعب " + COLORS[color].icon + " " + COLORS[color].name + " " + ar(card.number) + " — " + (complete ? "اكتملت اللعبة النارية! +١ دليل." : "تقدّم صحيح للفريق."), "good");
      markEvent(complete ? "complete" : "play", { seat: seat, color: color, number: card.number });
      sound(complete ? "win" : "score");
      if (state.score >= 25) {
        finishGame(true, "perfect");
        return true;
      }
    } else {
      state.tokens.fuses -= 1;
      player.misplays += 1;
      addToDiscard(card);
      state.notice = "بطاقة خاطئة! احترق فتيل. الفريق يخسر معاً.";
      note("<strong>" + esc(player.name) + "</strong> لعب " + COLORS[color].icon + " " + COLORS[color].name + " " + ar(card.number) + "… لكنها ليست التالية. احترق فتيل.", "warn");
      markEvent("burn", { seat: seat, color: color, number: card.number });
      sound("error");
      if (state.tokens.fuses <= 0) {
        finishGame(false, "fuse");
        return true;
      }
    }
    drawCard(player);
    endTurn();
    return true;
  }

  function discardCard(seat, uid) {
    if (!state || state.over || state.step !== "play" || seat !== state.activeSeat) return false;
    const player = state.players[seat];
    if (!player) return false;
    const index = player.hand.findIndex((card) => card.uid === uid);
    if (index < 0) return false;
    const card = player.hand[index];
    player.hand.splice(index, 1);
    player.handCount = player.hand.length;
    player.cardsDiscarded += 1;
    addToDiscard(card);
    state.tokens.clues = Math.min(8, state.tokens.clues + 1);
    state.notice = "رمى " + player.name + " بطاقة واستعاد دليلاً للفريق.";
    note("<strong>" + esc(player.name) + "</strong> رمى " + COLORS[card.color].icon + " " + COLORS[card.color].name + " " + ar(card.number) + " واستعاد دليلاً.", "");
    markEvent("discard", { seat: seat, color: card.color, number: card.number });
    sound("card");
    drawCard(player);
    endTurn();
    return true;
  }

  function matchesClue(card, kind, key) {
    if (kind === "color") return card.color === key;
    return card.number === Number(key);
  }

  function giveClue(seat, targetSeat, kind, key) {
    if (!state || state.over || state.step !== "play" || seat !== state.activeSeat) return false;
    if (targetSeat === seat) return false;
    const giver = state.players[seat];
    const target = state.players[targetSeat];
    if (!giver || !target || state.tokens.clues <= 0) return false;
    if (kind !== "color" && kind !== "number") return false;
    const validKey = kind === "color" ? COLOR_KEYS.indexOf(key) >= 0 : NUMBERS.indexOf(Number(key)) >= 0;
    if (!validKey) return false;
    const matches = target.hand.filter((card) => matchesClue(card, kind, key));
    if (!matches.length) return false;
    matches.forEach((card) => {
      if (kind === "color") card.knownColor = key;
      else card.knownNumber = Number(key);
    });
    state.tokens.clues -= 1;
    giver.cluesGiven += 1;
    const label = kind === "color"
      ? COLORS[key].icon + " " + COLORS[key].name
      : "الرقم " + ar(key);
    state.notice = "تلميح " + label + " إلى " + target.name + " — " + ar(matches.length) + " بطاقة.";
    note("<strong>" + esc(giver.name) + "</strong> أعطى <strong>" + esc(target.name) + "</strong> تلميح " + label + " (" + ar(matches.length) + " بطاقة).", "accent");
    markEvent("clue", { seat: seat, target: targetSeat, kind: kind, key: key, count: matches.length });
    sound("reveal");
    endTurn();
    return true;
  }

  function endTurn() {
    if (!state || state.over) return;
    if (!state.deck.length && state.finalTurns == null) {
      state.finalTurns = state.players.length;
      state.notice = "نفدت البطاقات! لكل لاعب دور أخير واحد.";
      note("<strong>نفدت البطاقات.</strong> كل لاعب سيأخذ دوراً أخيراً واحداً، ثم تُحسب نقاط الفريق.", "warn");
    }
    if (state.finalTurns != null) {
      state.finalTurns -= 1;
      if (state.finalTurns <= 0) {
        finishGame(false, "deck");
        return;
      }
    }
    state.activeSeat = (state.activeSeat + 1) % state.players.length;
    state.turn += 1;
    state.step = "play";
    selectedUid = null;
    const player = activePlayer();
    if (player && !player.isCpu) {
      state.notice = "دور " + player.name + " — اختر تلميحاً أو بطاقة للعب أو الرمي.";
    } else if (player) {
      state.notice = player.name + " (زميل آلي) يفكر مع الفريق…";
    }
    state.nextAt = Date.now() + (player && player.isCpu ? difficultyInfo().delay : 250);
    render();
  }

  function finishGame(win, reason) {
    if (!state || state.over) return;
    state.over = true;
    state.win = !!win;
    state.step = "over";
    state.score = scoreOf();
    state.result = { reason: reason || "deck", score: state.score };
    state.notice = win
      ? "اكتملت الألعاب النارية الخمسة! فاز الفريق."
      : reason === "fuse"
        ? "احترقت الفتائل الثلاث. خسر الفريق معاً."
        : "انتهت البطاقات والأدوار الأخيرة. نتيجة الفريق: " + ar(state.score) + " / ٢٥.";
    note(win
      ? "<strong>فاز الفريق!</strong> خمس ألعاب نارية مكتملة و٢٥ نقطة."
      : "<strong>خسر الفريق معاً.</strong> النتيجة النهائية " + ar(state.score) + " / ٢٥ — " + tierFor(state.score) + ".",
      win ? "good" : "warn");
    markEvent(win ? "victory" : "defeat");
    sound(win ? "win" : "lose");
    render();
    if (!overReported && apiRef && typeof apiRef.gameOver === "function") {
      overReported = true;
      try {
        apiRef.gameOver({
          title: win ? "اكتملت الألعاب النارية — فاز الفريق" : "انطفأت الفتائل — خسر الفريق",
          text: win
            ? "وصل الفريق إلى ٢٥ نقطة كاملة. كل تلميح وكل بطاقة كانت جزءاً من نجاح الجميع."
            : (reason === "fuse"
              ? "احترقت الفتائل الثلاث قبل اكتمال الألعاب النارية. النتيجة " + ar(state.score) + " / ٢٥ — الخسارة على الفريق كله."
              : "نفدت البطاقات وانتهت الأدوار الأخيرة عند " + ar(state.score) + " / ٢٥. الجميع شارك، والنتيجة للفريق كله."),
          winner: win ? "الفريق الكامل" : "اللعبة",
          icon: win ? "🎆" : "🕯️",
          tone: win ? "win" : "lose",
          standings: state.players.map((player) => ({
            name: player.name + (player.isCpu ? " · زميل آلي" : " · إنسان"),
            value: "لعب " + ar(player.cardsPlayed) + " · رمى " + ar(player.cardsDiscarded) + " · تلميحات " + ar(player.cluesGiven),
          })),
        });
      } catch (err) { /* ignore */ }
    }
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  /**
   * احتمالات بطاقة في يد الزميل الآلي اعتماداً على التلميحات والبطاقات المرئية فقط.
   * لا نقرأ لون/رقم البطاقة المخفية هنا.
   */
  function ownCardOdds(card, ownerSeat) {
    const seen = {};
    const add = (c) => {
      if (!c || !c.color || !c.number) return;
      const key = c.color + ":" + c.number;
      seen[key] = (seen[key] || 0) + 1;
    };
    state.discard.forEach(add);
    COLOR_KEYS.forEach((color) => (state.completed[color] || []).forEach(add));
    // كل الأيدي الأخرى مرئية للزميل، باستثناء يده هو.
    state.players.forEach((player) => {
      if (player.index === ownerSeat) return;
      player.hand.forEach(add);
    });
    let total = 0;
    let playable = 0;
    let future = 0;
    COLOR_KEYS.forEach((color) => {
      NUMBERS.forEach((number) => {
        if (card.knownColor && card.knownColor !== color) return;
        if (card.knownNumber && card.knownNumber !== number) return;
        const key = color + ":" + number;
        const available = COPY_COUNTS[number] - (seen[key] || 0);
        if (available <= 0) return;
        total += available;
        if (number === (state.fireworks[color] || 0) + 1) playable += available;
        if (number > (state.fireworks[color] || 0) + 1) future += available;
      });
    });
    return {
      total: total,
      playable: total ? playable / total : 0,
      future: total ? future / total : 0,
    };
  }

  function bestClue(seat) {
    const info = difficultyInfo();
    let best = null;
    state.players.forEach((target) => {
      if (target.index === seat || !target.hand.length) return;
      ["color", "number"].forEach((kind) => {
        const keys = kind === "color" ? COLOR_KEYS : NUMBERS;
        keys.forEach((key) => {
          const matches = target.hand.filter((card) => matchesClue(card, kind, key));
          if (!matches.length) return;
          let score = 0;
          let playable = 0;
          let useful = 0;
          let alreadyKnown = 0;
          matches.forEach((card) => {
            const next = (state.fireworks[card.color] || 0) + 1;
            const known = kind === "color" ? card.knownColor === key : card.knownNumber === Number(key);
            if (known) alreadyKnown += 1;
            if (card.number === next) {
              score += 6;
              playable += 1;
            } else if (card.number > next) {
              score += 1;
            } else {
              score -= 5;
            }
            if (card.number === 5 && card.number > (state.fireworks[card.color] || 0)) score += 2;
            if (!known) useful += 1;
          });
          if (!useful) score -= 3;
          if (matches.length === 1) score += 1;
          if (alreadyKnown === matches.length) score -= 3;
          if (!playable && score < 3) score -= 1;
          if (!best || score > best.score) {
            best = { target: target.index, kind: kind, key: key, score: score, playable: playable, count: matches.length };
          }
        });
      });
    });
    if (!best) return null;
    if (best.score < info.clueScore) return null;
    if (!best.playable && state.tokens.clues < 5 && best.score < info.clueScore + 2) return null;
    return best;
  }

  function ownCardsSnapshot(seat) {
    const player = state.players[seat];
    return player.hand.map((card, index) => {
      const odds = ownCardOdds(card, seat);
      return { card: card, index: index, odds: odds };
    });
  }

  function safestDiscard(seat) {
    const info = difficultyInfo();
    const player = state.players[seat];
    if (!player.hand.length) return null;
    let best = null;
    player.hand.forEach((card, index) => {
      const odds = ownCardOdds(card, seat);
      let safety = 1 - odds.future;
      if (odds.playable > 0) safety -= odds.playable * 2;
      if (card.knownNumber === 5 && (state.fireworks[card.knownColor] || 0) < 5) safety -= 1.4;
      if (card.knownNumber === 1 && card.knownColor && (state.fireworks[card.knownColor] || 0) === 0) safety -= 0.5;
      if (card.knownColor && card.knownNumber) {
        const next = (state.fireworks[card.knownColor] || 0) + 1;
        if (card.knownNumber >= next && card.knownNumber <= 5) safety -= 0.8;
        else safety += 1;
      }
      if (!card.knownColor && !card.knownNumber) safety += info.playRisk === 0.99 ? 0.9 : 0.35;
      if (odds.total === 0) safety += 2;
      safety += (index === 0 ? 0.18 : 0);
      if (!best || safety > best.safety) best = { card: card, index: index, safety: safety, odds: odds };
    });
    return best;
  }

  function aiStep() {
    if (!state || state.over || destroyed || !isHostOrLocal()) return;
    const now = Date.now();
    if (now < (state.nextAt || 0)) return;
    const player = activePlayer();
    if (!player || !player.isCpu) return;
    const info = difficultyInfo();
    const clue = state.tokens.clues > 0 ? bestClue(player.index) : null;
    if (clue) {
      giveClue(player.index, clue.target, clue.kind, clue.key);
      return;
    }
    const cards = ownCardsSnapshot(player.index);
    const playable = cards
      .filter((item) => item.odds.playable >= info.playRisk)
      .sort((a, b) => b.odds.playable - a.odds.playable)[0];
    if (playable) {
      playCard(player.index, playable.card.uid);
      return;
    }
    if (state.tokens.clues < 8 || !cards.length) {
      const discard = safestDiscard(player.index);
      if (discard) {
        discardCard(player.index, discard.card.uid);
        return;
      }
    }
    if (!cards.length) {
      endTurn();
      return;
    }
    const fallback = cards[Math.floor(Math.random() * cards.length)];
    discardCard(player.index, fallback.card.uid);
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function cardHTML(card, options) {
    const opts = options || {};
    const own = !!opts.own;
    const selected = own && selectedUid === card.uid;
    if (own) {
      const hasColor = !!card.knownColor;
      const hasNumber = !!card.knownNumber;
      let style = "";
      let face = '<span class="han-card-q" aria-hidden="true">✦</span>';
      let label = "بطاقتك المخفية";
      if (hasColor && hasNumber) {
        style = colorStyle(card.knownColor, COLORS[card.knownColor].light);
        face = '<strong>' + ar(card.knownNumber) + "</strong><small>" + esc(COLORS[card.knownColor].name) + "</small>";
        label = "بطاقتك: " + COLORS[card.knownColor].name + " " + ar(card.knownNumber);
      } else if (hasColor) {
        style = colorStyle(card.knownColor, COLORS[card.knownColor].light);
        face = '<strong>؟</strong><small>' + esc(COLORS[card.knownColor].name) + "</small>";
        label = "بطاقتك: لون " + COLORS[card.knownColor].name + "، الرقم مخفي";
      } else if (hasNumber) {
        face = '<strong>' + ar(card.knownNumber) + "</strong><small>رقم معلوم</small>";
        label = "بطاقتك: الرقم " + ar(card.knownNumber) + "، اللون مخفي";
      }
      return '<button type="button" class="han-card' + (hasColor || hasNumber ? " is-known" : " is-back") + (hasColor && hasNumber ? " is-fully-known" : "") + (selected ? " is-picked" : "") + '"' +
        (style ? ' style="' + style + '"' : "") +
        ' data-han-own="' + esc(card.uid) + '" aria-pressed="' + (selected ? "true" : "false") + '" aria-label="' + esc(label) + '">' +
        face + "</button>";
    }
    const known = [];
    if (card.knownColor) known.push("لون");
    if (card.knownNumber) known.push("رقم");
    return '<div class="han-card" style="' + cardStyle(card) + '" title="' + esc(COLORS[card.color].name + " " + ar(card.number)) + '">' +
      "<strong>" + ar(card.number) + "</strong><small>" + esc(COLORS[card.color].name) + "</small>" +
      (known.length ? '<span class="han-card-mark" aria-hidden="true">' + (card.knownColor ? "🎨" : "") + (card.knownNumber ? "🔢" : "") + "</span>" : "") +
      "</div>";
  }

  function handFor(player) {
    if (!state) return [];
    const seat = player.index;
    const mine = seat === viewSeat();
    if (!mine) {
      if (isGuest()) {
        const remote = visibleHands[seat];
        if (Array.isArray(remote)) return remote;
        return player.hand.map((card) => ({ uid: card.uid, color: null, number: null, knownColor: card.knownColor, knownNumber: card.knownNumber, hiddenRemote: true }));
      }
      return player.hand;
    }
    return player.hand;
  }

  function renderTeamHeader() {
    return BG.coop.teamHeader({
      icon: "🎆",
      title: "هانابي",
      en: "HANABI · ONE TEAM, FIVE FIREWORKS",
      goal: "أكملوا الألعاب النارية الخمسة معاً قبل أن تنطفئ الفتائل",
      players: state.players,
      current: state.activeSeat,
      meta(player) {
        return (player.isCpu ? "زميل آلي" : "إنسان") + " · " + ar(player.handCount) + " بطاقات";
      },
      chips:
        BG.coop.chip("النتيجة", ar(state.score) + " / ٢٥", state.score >= 20 ? "is-gold" : "") +
        BG.coop.chip("الفتائل", "🔥 " + ar(state.tokens.fuses) + " / ٣", state.tokens.fuses <= 1 ? "is-danger" : "") +
        BG.coop.chip("الأدلة", "💧 " + ar(state.tokens.clues) + " / ٨"),
    });
  }

  function renderObjective() {
    const done = completedColors();
    const active = activePlayer();
    return '<div class="coop-objective">' +
      BG.coop.objectiveCard("الألعاب النارية", ar(state.score) + " / ٢٥", tierFor(state.score), state.score >= 20 ? "is-gold" : "", Math.round((state.score / 25) * 100)) +
      BG.coop.objectiveCard("الألوان المكتملة", ar(done) + " / ٥", "أكملوا كل لون حتى ٥", done === 5 ? "is-gold" : "", Math.round((done / 5) * 100)) +
      BG.coop.objectiveCard("الأدلة", ar(state.tokens.clues) + " / ٨", "لغة الفريق الوحيدة", state.tokens.clues === 0 ? "is-warn" : "") +
      BG.coop.objectiveCard("الفتائل", ar(state.tokens.fuses) + " / ٣", "كل خطأ يحرق فتيلاً", state.tokens.fuses <= 1 ? "is-danger" : "") +
      BG.coop.objectiveCard("الدور", active ? active.name : "—", state.finalTurns != null ? "أدوار أخيرة" : "الفريق كله يلعب", "is-gold") +
      "</div>";
  }

  function renderFireworks() {
    return '<div class="han-fireworks">' +
      COLOR_KEYS.map((color) => {
        const info = COLORS[color];
        const top = state.fireworks[color] || 0;
        return '<div class="han-color' + (info.light ? " is-light" : "") + '" style="--c1:' + info.c1 + ";--c2:" + info.c2 + '">' +
          "<strong>" + info.icon + " " + esc(info.name) + "</strong>" +
          '<div class="han-stack">' +
          NUMBERS.map((number) => '<span class="han-num' + (number <= top ? "" : " is-ghost") + '">' + ar(number) + "</span>").join("") +
          "</div>" +
          (top >= 5 ? '<div class="han-complete">✓ مكتملة</div>' : '<div class="han-complete">' + ar(top) + " / ٥</div>") +
          "</div>";
      }).join("") +
      "</div>" +
      '<div class="han-tokens">' +
      '<span class="han-clue-token">💧</span><span>' + ar(state.tokens.clues) + " أدلة</span>" +
      '<span class="han-fuse' + (state.tokens.fuses <= 0 ? " is-out" : "") + '">🔥</span><span>' + ar(state.tokens.fuses) + " فتائل</span>" +
      (state.finalTurns != null ? '<span class="han-chip is-warn">أدوار أخيرة · ' + ar(state.finalTurns) + "</span>" : "") +
      "</div>";
  }

  function renderTable() {
    return '<div class="han-table">' +
      state.players.map((player) => {
        const cards = handFor(player);
        const mine = player.index === viewSeat();
        return '<div class="han-player' + (player.index === state.activeSeat ? " is-current" : "") + (mine ? " is-you" : "") + '">' +
          '<div class="han-player-head"><span>' + BG.coop.avatar(player) + "<b>" + esc(player.name) + "</b>" +
          (player.isCpu ? " <small>🤖 زميل آلي</small>" : mine ? " <small>· يدك (مخفية عنك)</small>" : " <small>· زميل</small>") + "</span>" +
          "<small>" + ar(player.handCount) + " بطاقات · " + (player.index === state.activeSeat ? "الدور الآن" : "بانتظار") + "</small></div>" +
          '<div class="han-cards">' + (cards.length
            ? cards.map((card) => card.hiddenRemote
              ? '<div class="han-card is-back" aria-label="بطاقة زميل"></div>'
              : cardHTML(card, { own: mine })).join("")
            : '<span class="coop-note">لا بطاقات في اليد.</span>') + "</div>" +
          "</div>";
      }).join("") +
      "</div>";
  }

  function renderActionPanel() {
    if (state.over) return renderEndBanner();
    if (!canActNow()) {
      const player = activePlayer();
      return '<div class="han-clue-panel han-wait">' +
        '<strong>' + (player ? esc(player.name) : "الفريق") + (player && player.isCpu ? " (زميل آلي) يفكر…" : " يلعب الآن") + "</strong>" +
        '<p class="coop-note">' + (isGuest() && player && player.index === mySeat()
          ? "دورك الآن — اختر بطاقة من يدك أو أرسل تلميحاً."
          : "الفريق كله ينتظر بفارغ الصبر. يمكنك إرسال تشجيع من دردشة الفريق.") + "</p>" +
        "</div>";
    }
    const me = state.players[state.activeSeat];
    const targets = state.players.filter((player) => player.index !== me.index);
    const selected = me.hand.find((card) => card.uid === selectedUid) || null;
    const canPlay = !!selected;
    return '<div class="han-clue-panel">' +
      '<div class="han-action-head"><strong>دورك يا ' + esc(me.name) + "</strong><span>" +
      (state.tokens.clues > 0 ? "يمكنك إعطاء تلميح أو لعب بطاقة" : "لا أدلة — العب أو ارمِ بطاقة") + "</span></div>" +
      '<div class="han-hand-picker">' + (me.hand.length
        ? me.hand.map((card) => cardHTML(card, { own: true })).join("")
        : '<span class="coop-note">يدك فارغة — يمكنك إعطاء تلميح أو تمرير الدور.</span>') + "</div>" +
      '<div class="han-choice-row">' +
      '<button type="button" class="coop-btn primary" data-han-action="play"' + (canPlay ? "" : " disabled") + ">العب المحددة</button>" +
      '<button type="button" class="coop-btn ghost" data-han-action="discard"' + (canPlay ? "" : " disabled") + ">ارمِ المحددة</button>" +
      '<span class="han-pick-label">' + (selected ? "محددة: بطاقة مخفية" : "اختر بطاقة من يدك") + "</span>" +
      "</div>" +
      '<div class="han-clue-panel-inner">' +
      '<div class="han-clue-head"><strong>تلميح لفريقك</strong><span>يدفع دليلاً واحداً · لا يمكنك تلميح نفسك</span></div>' +
      '<select class="han-select" data-han-clue-target aria-label="اختر لاعباً للتلميح">' +
      targets.map((player) => '<option value="' + player.index + '">' + esc(player.name) + (player.isCpu ? " (آلي)" : "") + "</option>").join("") +
      "</select>" +
      '<div class="han-clue-row">' +
      COLOR_KEYS.map((color) => '<button type="button" class="han-clue-btn is-color' + (COLORS[color].light ? " is-light" : "") + '" style="' + colorStyle(color, COLORS[color].light) + '" data-han-clue-kind="color" data-han-clue-key="' + color + '"' +
        (state.tokens.clues > 0 ? "" : " disabled") + ">" + COLORS[color].icon + " " + esc(COLORS[color].name) + "</button>").join("") +
      "</div>" +
      '<div class="han-clue-row">' +
      NUMBERS.map((number) => '<button type="button" class="han-clue-btn" data-han-clue-kind="number" data-han-clue-key="' + number + '"' +
        (state.tokens.clues > 0 ? "" : " disabled") + ">رقم " + ar(number) + "</button>").join("") +
      "</div>" +
      '<p class="coop-note">اختر زميلاً ثم لوناً أو رقماً. سيتم كشف وإعلان كل بطاقاته المطابقة — وهذا كل ما يعرفه هو عن يده.</p>' +
      "</div>" +
      '<div class="han-choice-row"><button type="button" class="coop-btn ghost small" data-han-action="rules">القواعد</button></div>' +
      "</div>";
  }

  function renderEndBanner() {
    return '<div class="han-end ' + (state.win ? "is-win" : "is-lose") + '">' +
      '<span aria-hidden="true">' + (state.win ? "🎆" : "🕯️") + "</span>" +
      "<strong>" + (state.win ? "فاز الفريق — ٢٥ نقطة كاملة" : "خسر الفريق معاً — " + ar(state.score) + " / ٢٥") + "</strong>" +
      "<p>" + (state.win
        ? "كل الألعاب النارية اكتملت. كل لاعب كان جزءاً من الفريق نفسه."
        : "اللعبة انتهت، لكن الفريق بقي فريقاً واحداً. حاولوا مرة أخرى بتلميحات أفضل.") + "</p>" +
      '<button type="button" class="coop-btn ghost small" data-han-action="rules">القواعد</button>' +
      "</div>";
  }

  function renderCurtain() {
    const player = state.players[curtainSeat];
    return '<div class="han-curtain"><div class="han-curtain-inner">' +
      '<span aria-hidden="true">🤫</span>' +
      "<strong>مرّر الجهاز إلى " + esc(player ? player.name : "اللاعب التالي") + "</strong>" +
      "<p>لا تنظر إلى بطاقات زملائك قبل دورك. اضغط الزر عندما يكون الجهاز في يدك وحدك.</p>" +
      '<button type="button" class="coop-btn primary" data-han-view-confirm>أنا ' + esc(player ? player.name : "اللاعب") + " — أظهر شاشتي</button>" +
      "</div></div>";
  }

  function renderStage() {
    if (curtainSeat >= 0) return '<div class="han-stage">' + renderCurtain() + "</div>";
    let view = "";
    if (state.step === "over") {
      view = renderEndBanner();
    } else {
      view = renderActionPanel();
    }
    const event = state.lastEvent;
    const flash = event && Date.now() - event.at < 1200
      ? (event.kind === "burn" ? " is-burn" : event.kind === "complete" ? " is-celebrate" : "")
      : "";
    return '<div class="han-stage' + flash + '">' +
      renderFireworks() +
      (state.finalTurns != null && !state.over ? '<div class="coop-banner is-warn"><span>🏁</span><span>نفدت البطاقات — لكل لاعب دور أخير واحد. النقاط الحالية ' + ar(state.score) + " / ٢٥.</span></div>" : "") +
      '<p class="han-notice">' + esc(state.notice) + "</p>" +
      renderTable() +
      view +
      "</div>";
  }

  function renderSide() {
    const deckPanel = '<section class="coop-panel"><div class="coop-panel-head"><h3>حالة الفريق</h3><small>معلومات مشتركة</small></div>' +
      '<div class="han-status-grid">' +
      '<span>🂠 السحب<b>' + ar(state.deckCount) + "</b></span>" +
      '<span>🗑️ المهملات<b>' + ar(state.discard.length) + "</b></span>" +
      '<span>💧 الأدلة<b>' + ar(state.tokens.clues) + " / ٨</b></span>" +
      '<span>🔥 الفتائل<b>' + ar(state.tokens.fuses) + " / ٣</b></span>" +
      "</div>" +
      '<p class="coop-note">البطاقات المرمية مكشوفة للجميع. راقبوها لتعرفوا ما تبقى في السحب.</p>' +
      "</section>";

    const logPanel = '<section class="coop-panel"><div class="coop-panel-head"><h3>سجل الفريق</h3><small>كل خطوة تخص الجميع</small></div>' +
      '<div class="han-log">' +
      (state.log.length
        ? state.log.slice().reverse().map((line) => '<div class="coop-log-line ' + esc(line.kind || "") + '">' + line.html + "</div>").join("")
        : '<p class="coop-note">لم يبدأ الفريق بعد.</p>') +
      "</div></section>";

    const chat = '<section class="coop-panel"><div class="coop-panel-head"><h3>دردشة الفريق</h3><small>تشجيع فقط — بلا تسريب بطاقات</small></div>' +
      BG.coop.chatDock("همسات الفريق") + "</section>";

    return deckPanel + logPanel + chat;
  }

  function syncPrivacy() {
    if (!state || isNet()) return;
    const humans = humanSeats();
    if (!humans.length) {
      localViewer = 0;
      curtainSeat = -1;
      return;
    }
    if (humans.length === 1) {
      localViewer = humans[0];
      curtainSeat = -1;
      return;
    }
    if (humans.indexOf(localViewer) < 0) localViewer = humans[0];
    const active = state.players[state.activeSeat];
    if (active && !active.isCpu && state.activeSeat !== localViewer && !state.over) {
      curtainSeat = state.activeSeat;
    } else if (curtainSeat >= 0 && (state.over || (active && !active.isCpu && active.index === localViewer))) {
      curtainSeat = -1;
    }
  }

  function render() {
    if (!rootRef || !state || destroyed) return;
    syncPrivacy();
    const header = renderTeamHeader();
    const objective = renderObjective();
    rootRef.innerHTML = '<div class="coop-shell han-shell">' +
      '<div class="coop-main">' + header + objective + renderStage() + "</div>" +
      '<aside class="coop-side">' + renderSide() + "</aside>" +
      "</div>";
    if (apiRef && typeof apiRef.setStatus === "function") {
      apiRef.setStatus(state.over ? "انتهت الجولة · " + ar(state.score) + " / ٢٥" : "هانابي · " + ar(state.score) + " / ٢٥", state.over ? "" : "live");
    }
    if (!applyingNet) netSync();
  }

  /* ------------------------------ التفاعل ------------------------------ */

  function chatName() {
    if (state && isNet() && mySeat() >= 0 && state.players[mySeat()]) return state.players[mySeat()].name;
    if (state && state.players[viewSeat()]) return state.players[viewSeat()].name;
    return "زميل";
  }

  function selectedCard() {
    if (!state) return null;
    const player = state.players[state.activeSeat];
    if (!player) return null;
    return player.hand.find((card) => card.uid === selectedUid) || null;
  }

  function sendGuest(payload) {
    if (!isGuest() || !BG.net) return false;
    try { return BG.net.send(payload); } catch (err) { return false; }
  }

  function localPlaySelected() {
    if (!canActNow() || !selectedUid) return;
    const uid = selectedUid;
    selectedUid = null;
    if (isGuest()) {
      sendGuest({ t: "han-play", uid: uid });
      render();
      return;
    }
    playCard(state.activeSeat, uid);
  }

  function localDiscardSelected() {
    if (!canActNow() || !selectedUid) return;
    const uid = selectedUid;
    selectedUid = null;
    if (isGuest()) {
      sendGuest({ t: "han-discard", uid: uid });
      render();
      return;
    }
    discardCard(state.activeSeat, uid);
  }

  function localClue(targetSeat, kind, key) {
    if (!canActNow()) return;
    const target = Number(targetSeat);
    if (!Number.isInteger(target)) return;
    if (isGuest()) {
      sendGuest({ t: "han-clue", target: target, kind: kind, key: key });
      return;
    }
    giveClue(state.activeSeat, target, kind, key);
  }

  function showRules() {
    try {
      if (apiRef && typeof apiRef.rules === "function") apiRef.rules();
      else BG.openRules(game, state ? { difficulty: state.difficulty } : {});
    } catch (err) { /* ignore */ }
  }

  function onClick(event) {
    if (!state) return;
    if (BG.coop.handleChatClick(event, apiRef, chatName())) return;
    const confirm = event.target.closest ? event.target.closest("[data-han-view-confirm]") : null;
    if (confirm) {
      if (curtainSeat >= 0) {
        localViewer = curtainSeat;
        curtainSeat = -1;
        selectedUid = null;
        sound("click");
        render();
      }
      return;
    }
    const own = event.target.closest ? event.target.closest("[data-han-own]") : null;
    if (own) {
      const uid = own.getAttribute("data-han-own");
      selectedUid = selectedUid === uid ? null : uid;
      sound("click");
      render();
      return;
    }
    const action = event.target.closest ? event.target.closest("[data-han-action]") : null;
    if (action) {
      const kind = action.getAttribute("data-han-action");
      if (kind === "play") localPlaySelected();
      else if (kind === "discard") localDiscardSelected();
      else if (kind === "rules") showRules();
      return;
    }
    const clue = event.target.closest ? event.target.closest("[data-han-clue-kind]") : null;
    if (clue && !clue.disabled) {
      const select = document.querySelector("[data-han-clue-target]");
      localClue(select ? select.value : -1, clue.getAttribute("data-han-clue-kind"), clue.getAttribute("data-han-clue-key"));
      return;
    }
  }

  /* ------------------------------ الشبكة ------------------------------ */

  function seatForPeer(from) {
    if (!apiRef || !apiRef.net || !Array.isArray(apiRef.net.seats)) return -1;
    return apiRef.net.seats.findIndex((seat) => seat && seat.peerId && seat.peerId === from);
  }

  function visiblePayload(forSeat) {
    const hands = {};
    state.players.forEach((player) => {
      if (player.index === forSeat) return;
      hands[player.index] = player.hand.map((card) => ({
        uid: card.uid,
        color: card.color,
        number: card.number,
        knownColor: card.knownColor,
        knownNumber: card.knownNumber,
      }));
    });
    return { t: "han-visible", hands: hands };
  }

  function sendVisibleHandsTo(seatIndex) {
    if (!isNet() || !isHostOrLocal() || !state) return;
    const seat = apiRef.net.seats[seatIndex];
    if (!seat || seat.type !== "human" || seatIndex === apiRef.net.seat || !seat.peerId) return;
    try { BG.net.sendTo(seat.peerId, visiblePayload(seatIndex)); } catch (err) { /* ignore */ }
  }

  function sendVisibleHands() {
    if (!isNet() || !isHostOrLocal() || !state) return;
    state.players.forEach((player, index) => sendVisibleHandsTo(index));
  }

  function applyVisibleHands(data) {
    if (!data || !data.hands || typeof data.hands !== "object") return;
    const mine = mySeat();
    Object.keys(data.hands).forEach((key) => {
      const seat = Number(key);
      if (!Number.isInteger(seat) || seat === mine) return;
      if (Array.isArray(data.hands[key])) visibleHands[seat] = data.hands[key];
    });
    if (state) render();
  }

  function requestVisibleHands(force) {
    if (!isGuest()) return;
    const now = Date.now();
    if (!force && now - lastVisibleRequest < 1200) return;
    lastVisibleRequest = now;
    sendGuest({ t: "han-sync-request" });
  }

  function onNetMessage(event) {
    const data = event && event.data;
    if (!data || typeof data.t !== "string" || data.t.indexOf("han-") !== 0) return;
    if (data.t === "han-visible") {
      applyVisibleHands(data);
      return;
    }
    if (!isHostOrLocal() || !state) return;
    const seat = seatForPeer(event.from);
    if (seat < 0) return;
    if (data.t === "han-sync-request") {
      sendVisibleHandsTo(seat);
      return;
    }
    if (data.t === "han-play") {
      if (seat === state.activeSeat) playCard(seat, String(data.uid || ""));
      return;
    }
    if (data.t === "han-discard") {
      if (seat === state.activeSeat) discardCard(seat, String(data.uid || ""));
      return;
    }
    if (data.t === "han-clue") {
      if (seat === state.activeSeat) giveClue(seat, Number(data.target), String(data.kind), data.kind === "number" ? Number(data.key) : String(data.key));
    }
  }

  function publicSnapshot() {
    if (!state) return null;
    const copy = JSON.parse(JSON.stringify(state));
    copy.deck = [];
    copy.deckCount = state.deck.length;
    copy.privateMasked = true;
    copy.players.forEach((player) => {
      player.handCount = player.hand.length;
      player.hand = player.hand.map((card) => ({
        uid: card.uid,
        knownColor: card.knownColor,
        knownNumber: card.knownNumber,
      }));
    });
    if (copy.lastEvent) {
      delete copy.lastEvent.hand;
      delete copy.lastEvent.cards;
    }
    return copy;
  }

  function bindNet() {
    if (!BG.net) return function () {};
    const off = BG.net.on("message", onNetMessage);
    return function () { try { off(); } catch (err) { /* ignore */ } };
  }

  /* ------------------------------ التشغيل ------------------------------ */

  function create(root, api) {
    destroyed = false;
    overReported = false;
    rootRef = root;
    apiRef = api;
    selectedUid = null;
    curtainSeat = -1;
    visibleHands = {};
    lastVisibleRequest = 0;
    eventSeq = 0;
    fxSeenEvent = 0;
    const seats = (api && api.players ? api.players : []).slice(0, 5);
    const difficulty = (api && api.options && api.options.difficulty) || "medium";
    createState(seats, difficulty);
    const humans = humanSeats();
    localViewer = humans.length ? humans[0] : 0;
    state.notice = "الفريق يرى أيدي بعضه… ولا أحد يرى يده. استخدموا التلميحات لتكملوا الألعاب النارية.";
    note("بدأ فريق <strong>هانابي</strong> — " + ar(state.players.length) + " لاعبين، هدف مشترك: ٢٥ نقطة.", "accent");
    note("كل لاعب يرى أيدي الآخرين ولا يرى يده. التلميحات هي وسيلتكم الوحيدة.", "accent");
    rootRef.addEventListener("click", onClick);
    const chatOff = BG.coop.listenChat();
    const netOff = bindNet();
    render();
    if (aiTimer) clearInterval(aiTimer);
    aiTimer = setInterval(function () {
      if (destroyed) return;
      aiStep();
    }, 420);

    let debugRef = null;
    try {
      if (new URLSearchParams(window.location.search).has("bgdebug")) {
        debugRef = {
          get state() { return state; },
          get api() { return apiRef; },
          snapshot() { return JSON.parse(JSON.stringify(state)); },
          setFuses(value) { state.tokens.fuses = Math.max(0, Number(value) || 0); render(); },
          setClues(value) { state.tokens.clues = Math.max(0, Math.min(8, Number(value) || 0)); render(); },
          play(uid) { return playCard(state.activeSeat, String(uid)); },
          discard(uid) { return discardCard(state.activeSeat, String(uid)); },
          clue(target, kind, key) { return giveClue(state.activeSeat, Number(target), String(kind), kind === "number" ? Number(key) : String(key)); },
          setActive(seat) { if (state.players[seat]) { state.activeSeat = Number(seat); state.step = "play"; render(); } },
          forceDeckEnd() { state.deck = []; state.deckCount = 0; state.finalTurns = state.players.length; state.notice = "نفدت البطاقات — أدوار أخيرة."; render(); },
          forceWin() {
            COLOR_KEYS.forEach((color) => { state.fireworks[color] = 5; });
            state.score = 25;
            finishGame(true, "debug");
          },
          forceScore(n) {
            state.score = Number(n) || 0;
            render();
          },
          finish(win) { finishGame(!!win, "debug"); },
          visible() { return JSON.parse(JSON.stringify(visibleHands)); },
        };
        window.__bgDebug = debugRef;
      }
    } catch (err) { console.warn(err); }

    return {
      netSnapshot() { return state ? BG.netCodec.encode(publicSnapshot()) : null; },
      netLoad(snapshot) {
        if (!snapshot) return;
        const prevEvent = state && state.lastEvent ? state.lastEvent.id : 0;
        applyingNet = true;
        try {
          state = BG.netCodec.decode(snapshot);
          normalizeState();
          if (state.lastEvent && state.lastEvent.id > prevEvent) playEventSound(state.lastEvent);
          render();
          if (isGuest()) requestVisibleHands(true);
        } finally {
          applyingNet = false;
        }
      },
      netSeat() { return state ? state.activeSeat : -1; },
      netOver() { return !!(state && state.over); },
      netResume() { if (state) render(); },
      destroy() {
        destroyed = true;
        if (aiTimer) clearInterval(aiTimer);
        aiTimer = null;
        if (chatOff) chatOff();
        if (netOff) netOff();
        if (rootRef) rootRef.removeEventListener("click", onClick);
        if (debugRef && window.__bgDebug === debugRef) window.__bgDebug = null;
        rootRef = null;
        apiRef = null;
        state = null;
        visibleHands = {};
      },
    };
  }

  game.create = create;
  BG.register(game);
})();
