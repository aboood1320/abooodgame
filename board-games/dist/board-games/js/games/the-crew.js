/* ==========================================================================
   الطاقم — The Crew: مهمة جماعية بأخذ الأوراق
   فريق واحد: أكملوا كل المهام قبل نفاد الأوراق. لا فائز فردي.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const FX = BG.fx;

  const SUITS = {
    pink: { name: "وردي", icon: "🩷", c1: "#e86fa8", c2: "#8f2058", light: false },
    blue: { name: "أزرق", icon: "🔵", c1: "#5aa7e0", c2: "#1f4f8f", light: false },
    green: { name: "أخضر", icon: "🟢", c1: "#5fbf7a", c2: "#1f6b3a", light: false },
    yellow: { name: "أصفر", icon: "🟡", c1: "#f0c24c", c2: "#a97616", light: false },
    rocket: { name: "صاروخ", icon: "🚀", c1: "#d86f4a", c2: "#7e2d18", light: false },
  };
  const COLOR_SUITS = ["pink", "blue", "green", "yellow"];
  const SUIT_ORDER = { pink: 0, blue: 1, green: 2, yellow: 3, rocket: 4 };
  const SIGNALS = {
    highest: "أعلى بطاقة في اللون",
    only: "البطاقة الوحيدة في اللون",
    lowest: "أدنى بطاقة في اللون",
  };
  const SIGNAL_SHORT = { highest: "أعلى", only: "وحيدة", lowest: "أدنى" };

  const DIFFICULTIES = {
    easy: {
      label: "متعلم",
      delay: 1100,
      noise: 22,
      signalChance: 0.45,
      hint: "الزملاء يلعبون بأمان ويستخدمون الراديو أحياناً فقط.",
    },
    medium: {
      label: "متوازن",
      delay: 820,
      noise: 9,
      signalChance: 0.75,
      hint: "الزملاء يقرأون المهام والإشارات ويحاولون حماية مهام الفريق.",
    },
    hard: {
      label: "خبير",
      delay: 620,
      noise: 3,
      signalChance: 1,
      hint: "الزملاء يحسبون الفائز في كل خدعة ويحمون مهام الفريق بدقة.",
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

  function sortHand(hand) {
    hand.sort((a, b) => (SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]) || (a.number - b.number));
    return hand;
  }

  function suitStyle(suit) {
    const info = SUITS[suit] || SUITS.rocket;
    return "--c1:" + info.c1 + ";--c2:" + info.c2 + (info.light ? ";color:#24243a" : "");
  }

  function cardLabel(card) {
    if (!card) return "";
    if (card.suit === "rocket") return "الصاروخ " + ar(card.number);
    return SUITS[card.suit].name + " " + ar(card.number);
  }

  function taskLabel(task) {
    if (!task) return "بدون مهمة";
    return "مهمة " + SUITS[task.suit].name + " " + ar(task.number);
  }

  function gameLabel() {
    return "الطاقم";
  }

  const game = {
    id: "the-crew",
    name: "الطاقم",
    en: "The Crew",
    icon: "🚀",
    tagline: "فريق واحد… رحلة واحدة… لا أحد يفوز وحده",
    blurb: "لعبة خدع تعاونية: كل لاعب يحمل بطاقاته سراً، والفريق يحاول إكمال مهام ملونة في الخدع. القائد يحمل الصاروخ ٤، والراديو يفتح نافذة تواصل واحدة لكل لاعب. أكملوا كل المهام معاً قبل نفاد الأوراق، وفوزكم مشترك.",
    players: "٣–٥ لاعبين",
    time: "٢٠–٣٠ دقيقة",
    age: "+١٠",
    coop: true,
    minPlayers: 3,
    maxPlayers: 5,
    defaultPlayers: 4,

    options: {
      defaults: { difficulty: "medium" },
      fields: [
        {
          key: "difficulty",
          type: "choice",
          label: "خبرة زملاء الطاقم",
          choices: [
            { value: "easy", label: "متعلم — سهل" },
            { value: "medium", label: "متوازن — متوسط" },
            { value: "hard", label: "خبير — صعب" },
          ],
          hint: "يحدد ذكاء الزملاء الآليين فقط. الجميع في فريق واحد، والفوز أو الخسارة مشتركة.",
        },
      ],
      summary(values) {
        const info = DIFFICULTIES[(values && values.difficulty) || "medium"] || DIFFICULTIES.medium;
        return "طاقم الرحلة: " + info.label;
      },
    },

    rulesFor(options) {
      const difficulty = (options && options.difficulty) || "medium";
      const info = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
      return {
        goal: "الطاقم فريق واحد. الهدف المشترك هو إكمال كل بطاقات المهام الموزعة على اللاعبين قبل أن تنفد الأوراق. لا يوجد فائز فردي: إذا أكمل الفريق مهامه فاز الجميع، وإذا فاز لاعب ببطاقة مهمة تخص زميلاً آخر خسر الجميع فوراً.",
        facts: [
          ["عدد اللاعبين", "٣ إلى ٥ لاعبين — كلهم فريق واحد"],
          ["المكوّنات", "٤٠ بطاقة لعب: ٤ ألوان × ٩ أرقام + ٤ صواريخ · ٣٦ بطاقة مهمة"],
          ["مدة اللعب", "٢٠–٣٠ دقيقة تقريباً"],
          ["الهدف", "إكمال كل المهام الموزعة قبل نهاية الأوراق"],
        ],
        components: [
          "بطاقات اللعب: وردي، أزرق، أخضر، أصفر، كل لون يحتوي الأرقام من ١ إلى ٩ (٣٦ بطاقة)، بالإضافة إلى أربع بطاقات صواريخ مرقمة ١–٤.",
          "بطاقات المهام: ٣٦ بطاقة صغيرة تمثل بطاقة لون ورقم. كل مهمة تُكمل عندما يفوز صاحبها بخدعة تحتوي بطاقة المهمة المطابقة.",
          "بطاقة القائد: يحصل عليها من يملك بطاقة الصاروخ ٤. القائد يختار أول مهمة ويبدأ أول خدعة.",
          "إشارة الراديو: مرة واحدة لكل لاعب في المهمة، تُكشف بطاقة لون واحدة للجميع مع تحديد: أعلى بطاقة في اللون، أو أدنى بطاقة، أو البطاقة الوحيدة.",
        ],
        setup: [
          "تُخلط بطاقات اللعب الأربعون وتُوزع على الطاقم بالتساوي. إذا بقي عدد لا يقبل القسمة، يأخذ اللاعب الأول بطاقة إضافية؛ وفي نهاية المهمة قد تبقى بطاقة واحدة غير ملعوبة.",
          "ابحثوا عن حامل بطاقة الصاروخ ٤: هو القائد لهذه المهمة. القائد هو أول من يختار مهمة، وهو من يبدأ أول خدعة.",
          "تُكشف بطاقات مهام بعدد اللاعبين في منتصف الطاولة. يختار القائد مهمة أولاً، ثم يختار كل لاعب بالاتجاه التالي حتى تُوزع كل المهام.",
          "كل لاعب يأخذ مهمة واحدة في هذه الرحلة. المهمة معلنة للجميع، لكن اليد تبقى سرية. لا يجوز الكلام عن البطاقات أو الأرقام خارج إشارة الراديو.",
        ],
        steps: [
          "<strong>الخدعة:</strong> يلعب أول لاعب أي بطاقة. ثم يجب على كل لاعب أن يلعب بطاقة من اللون المطلوب إن كان يملكه؛ وإذا لم يملكه يجوز له لعب أي بطاقة، بما فيها الصاروخ.",
          "<strong>الفوز بالخدعة:</strong> أعلى بطاقة من اللون المطلوب تفوز، إلا إذا ظهر صاروخ؛ فالصواريخ هي الأوراق الرابحة وتفوز على أي لون. وإذا لُعب أكثر من صاروخ، يفوز الصاروخ الأعلى رقماً. الفائز يقود الخدعة التالية.",
          "<strong>إكمال المهمة:</strong> عندما يفوز لاعب بخدعة تحتوي بطاقة المهمة المطابقة لمهمته، تُقلب مهمته وتُعد مكتملة. يمكن للاعب أن يكمل أكثر من مهمة في الخدعة نفسها إذا كانت له أكثر من مهمة وربح بطاقاتها.",
          "<strong>الخسارة الفورية:</strong> إذا فاز لاعب بخدعة تحتوي بطاقة مهمة تخص لاعباً آخر، تنتهي المهمة فوراً وتخسرون جميعاً، حتى لو كانت بقية المهام قابلة للإكمال.",
          "<strong>إشارة الراديو:</strong> قبل بداية أي خدعة، وبعد توزيع المهام، يمكن لكل لاعب استخدام إشارته مرة واحدة. يختار بطاقة لون من يده، ويجب أن تكون أعلى بطاقة في ذلك اللون، أو أدنى بطاقة، أو البطاقة الوحيدة فيه. لا يمكن الإشارة إلى صاروخ. البطاقة تبقى في يده ويمكنه لعبها لاحقاً.",
          "<strong>نهاية المهمة:</strong> يفوز الفريق فور إكمال كل المهام. يخسر الفريق فور فوز اللاعب الخطأ ببطاقة مهمة، أو إذا نفدت الأوراق وبقيت مهام غير مكتملة.",
        ],
        winning: "الفوز للفريق كله عند إكمال جميع المهام الموزعة. الخسارة للفريق كله إذا وقعت بطاقة مهمة في خدعة فاز بها غير صاحبها، أو إذا انتهت الأوراق قبل إكمال كل المهام. لا توجد نقاط فردية ولا ترتيب أفراد.",
        notes: [
          "هذه النسخة الرقمية تلعب مهمة أساسية واحدة: مهمة واحدة لكل لاعب بعدد الطاقم. لا تستخدم رموز المهام المتقدمة أو حملات المهام الخمسين.",
          "وضع اللاعبين الاثنين الرسمي (نظام JARVIS) غير مشمول؛ النسخة الرقمية تعتمد طاقماً من ٣ إلى ٥ لاعبين. إذا بدأ لاعبَان فقط، ينضم زميل آلي ثالث تلقائياً لتكتمل مهمة الطاقم.",
          "الزميل الآلي لا يرى أيدي الآخرين. يستخدم فقط يده، وبطاقات المهام المعلنة، وإشارات الراديو، وما ظهر في الخدع.",
          "الراديو ليس دردشة حرة: لا تكتبوا أسماء البطاقات في الدردشة. الدردشة للتشجيع فقط، والالتزام بالروح التعاونية للعبة.",
          "مستوى الزملاء المختار: " + info.label + ". " + info.hint,
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
  let privateHand = [];
  let lastHandRequest = 0;
  let eventSeq = 0;
  let fxSeenEvent = 0;
  let overReported = false;

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

  function pickPlayer() {
    return state && state.players[state.pickSeat] ? state.players[state.pickSeat] : null;
  }

  function actorSeat() {
    if (!state) return -1;
    return state.phase === "tasks" ? state.pickSeat : state.activeSeat;
  }

  function canPickNow() {
    if (!state || state.over || state.phase !== "tasks") return false;
    const player = pickPlayer();
    if (!player || player.isCpu) return false;
    if (isNet()) return mySeat() === state.pickSeat;
    return viewSeat() === state.pickSeat;
  }

  function canActNow() {
    if (!state || state.over || state.phase !== "play") return false;
    const player = activePlayer();
    if (!player || player.isCpu) return false;
    if (isNet()) return mySeat() === state.activeSeat;
    return viewSeat() === state.activeSeat;
  }

  function canSignalNow() {
    if (!state || state.over || state.phase !== "play") return false;
    if (state.trick.length && state.trickWinner == null) return false;
    const me = state.players[viewSeat()];
    if (!me || me.isCpu || me.signalUsed) return false;
    return handFor(me).some((card) => !!signalModeFor(me, card));
  }

  function selectableUidsForView() {
    const me = state && state.players[viewSeat()];
    if (!me) return [];
    if (canActNow()) return legalUidsForView();
    if (canSignalNow()) return handFor(me).map((card) => card.uid);
    return [];
  }

  function note(html, kind) {
    if (!state) return;
    state.log.push({ html: html, kind: kind || "" });
    if (state.log.length > 26) state.log.shift();
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
    if (event.kind === "play") sound("card");
    else if (event.kind === "signal") sound("reveal");
    else if (event.kind === "task") sound("score");
    else if (event.kind === "trick") sound("select");
    else if (event.kind === "fail") sound("error");
    else if (event.kind === "victory") sound("win");
    else if (event.kind === "pick") sound("click");
  }

  /* ------------------------------ بناء الحالة ------------------------------ */

  function cardUid() {
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        const parts = new Uint32Array(2);
        window.crypto.getRandomValues(parts);
        return "c" + parts[0].toString(36) + parts[1].toString(36);
      }
    } catch (err) { /* البصمة الاحتياطية */ }
    return "c" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }

  function makeDeck() {
    const cards = [];
    COLOR_SUITS.forEach((suit) => {
      for (let number = 1; number <= 9; number += 1) {
        cards.push({ uid: cardUid(), suit: suit, number: number });
      }
    });
    for (let number = 1; number <= 4; number += 1) {
      cards.push({ uid: cardUid(), suit: "rocket", number: number });
    }
    return shuffle(cards);
  }

  function makeTaskDeck() {
    const tasks = [];
    COLOR_SUITS.forEach((suit) => {
      for (let number = 1; number <= 9; number += 1) {
        tasks.push({ id: "task-" + suit + "-" + number, suit: suit, number: number });
      }
    });
    return shuffle(tasks);
  }

  function createState(seats, difficulty) {
    const players = (seats || []).slice(0, 5).map((seat, index) => ({
      index: index,
      name: (seat && seat.name) || "لاعب " + (index + 1),
      isCpu: !!(seat && (seat.isCpu || seat.type === "cpu")),
      level: (seat && seat.level) || difficulty || "medium",
      hand: [],
      handCount: 0,
      task: null,
      signalUsed: false,
      signal: null,
    }));
    while (players.length < 3) {
      players.push({
        index: players.length,
        name: "لاعب " + (players.length + 1),
        isCpu: true,
        level: difficulty || "medium",
        hand: [],
        handCount: 0,
        task: null,
        signalUsed: false,
        signal: null,
      });
    }

    const deck = makeDeck();
    players.forEach((player) => { player.hand = []; });
    let seat = 0;
    while (deck.length) {
      players[seat % players.length].hand.push(deck.shift());
      seat += 1;
    }
    players.forEach((player) => {
      sortHand(player.hand);
      player.handCount = player.hand.length;
    });

    const commander = players.findIndex((player) => player.hand.some((card) => card.suit === "rocket" && card.number === 4));
    const taskDeck = makeTaskDeck();
    const centerTasks = taskDeck.splice(0, players.length);
    const pickOrder = players.map((_, index) => (Math.max(0, commander) + index) % players.length);

    state = {
      players: players,
      difficulty: DIFFICULTIES[difficulty] ? difficulty : "medium",
      phase: "tasks",
      commander: commander < 0 ? 0 : commander,
      centerTasks: centerTasks,
      taskDeckCount: taskDeck.length,
      pickOrder: pickOrder,
      pickIndex: 0,
      pickSeat: pickOrder[0],
      activeSeat: pickOrder[0],
      trickLeader: pickOrder[0],
      leadSuit: null,
      trick: [],
      trickWinner: null,
      lastTrick: [],
      trickNumber: 0,
      tasksTotal: players.length,
      autoCrew: players.length === 3 && players.filter((player) => !player.isCpu).length < 3,
      over: false,
      win: false,
      result: null,
      notice: "الفريق واحد: أكملوا كل المهام معاً.",
      lastEvent: null,
      log: [],
    };

    note("بدأ طاقم <strong>" + ar(players.length) + "</strong> لاعبين الرحلة. الهدف المشترك: إكمال <strong>" + ar(players.length) + "</strong> مهام.", "accent");
    if (state.autoCrew) {
      note("بدأ أقل من ثلاثة لاعبين بشريين، فأضفنا <strong>زميلاً آلياً</strong> تلقائياً ليكتمل الطاقم. يقاتل معكم وليس ضدكم.", "gold");
    }
    note("القائد هو <strong>" + esc(players[state.commander].name) + "</strong> لأنه يحمل الصاروخ ٤. القائد يختار أول مهمة ويبدأ أول خدعة.", "accent");
    state.notice = "القائد " + players[state.commander].name + " يختار أول مهمة. المهام معلنة، والأيدي سرية.";
    state.nextAt = Date.now() + (players[state.pickSeat].isCpu ? difficultyInfo().delay : 350);
    return state;
  }

  function normalizeState() {
    if (!state) return;
    if (!Array.isArray(state.players)) state.players = [];
    if (!Array.isArray(state.centerTasks)) state.centerTasks = [];
    if (!Array.isArray(state.trick)) state.trick = [];
    if (!Array.isArray(state.lastTrick)) state.lastTrick = [];
    if (!Array.isArray(state.log)) state.log = [];
    if (!Array.isArray(state.pickOrder)) state.pickOrder = state.players.map((_, index) => index);
    state.players.forEach((player, index) => {
      if (!player) return;
      player.index = index;
      if (!Array.isArray(player.hand)) player.hand = [];
      player.handCount = Number.isFinite(player.handCount) ? player.handCount : player.hand.length;
      if (!player.name) player.name = "لاعب " + (index + 1);
      if (!Number.isFinite(player.handCount)) player.handCount = 0;
    });
    if (!Number.isFinite(state.activeSeat) || state.activeSeat < 0 || state.activeSeat >= state.players.length) state.activeSeat = 0;
    if (!Number.isFinite(state.pickSeat) || state.pickSeat < 0 || state.pickSeat >= state.players.length) state.pickSeat = state.activeSeat;
    if (!Number.isFinite(state.commander) || state.commander < 0 || state.commander >= state.players.length) state.commander = 0;
    if (!Number.isFinite(state.tasksTotal)) state.tasksTotal = state.players.filter((player) => player.task).length;
    if (!Number.isFinite(state.trickNumber)) state.trickNumber = 0;
    if (!state.phase) state.phase = state.over ? "over" : "play";
    if (!state.notice) state.notice = "الفريق واحد: أكملوا كل المهام معاً.";
  }

  function tasksDone() {
    if (!state) return 0;
    return state.players.filter((player) => player.task && player.task.done).length;
  }

  function tasksPending() {
    if (!state) return [];
    return state.players.filter((player) => player.task && !player.task.done);
  }

  function signalsLeft() {
    if (!state) return 0;
    return state.players.filter((player) => !player.signalUsed).length;
  }

  function remainingCards() {
    if (!state) return 0;
    return state.players.reduce((total, player) => total + player.hand.length, 0);
  }

  function handFor(player) {
    if (!state || !player) return [];
    if (player.index === viewSeat()) {
      if (isGuest()) return privateHand;
      return player.hand;
    }
    return [];
  }

  function handCountFor(player) {
    if (!state || !player) return 0;
    if (player.index === viewSeat() && isGuest() && privateHand.length) return privateHand.length;
    return Number.isFinite(player.handCount) ? player.handCount : player.hand.length;
  }

  function cardMatchesTask(card, task) {
    return !!(card && task && card.suit === task.suit && card.number === task.number);
  }

  function taskForCard(card) {
    if (!state) return null;
    return state.players.find((player) => cardMatchesTask(card, player.task)) || null;
  }

  function taskInTrick(task) {
    if (!state || !task) return false;
    return state.trick.some((entry) => cardMatchesTask(entry.card, task));
  }

  function legalCards(player) {
    if (!state || !player || !Array.isArray(player.hand)) return [];
    if (!state.trick.length || state.trickWinner != null) return player.hand.slice();
    const lead = state.trick[0].card.suit;
    const suited = player.hand.filter((card) => card.suit === lead);
    return suited.length ? suited : player.hand.slice();
  }

  function legalUidsForView() {
    if (!canActNow()) return [];
    const me = state.players[viewSeat()];
    const hand = handFor(me);
    if (!state.trick.length || state.trickWinner != null) return hand.map((card) => card.uid);
    const lead = state.trick[0].card.suit;
    const suited = hand.filter((card) => card.suit === lead);
    return (suited.length ? suited : hand).map((card) => card.uid);
  }

  function trickWinnerOf(list) {
    if (!Array.isArray(list) || !list.length) return -1;
    const rockets = list.filter((entry) => entry.card.suit === "rocket");
    if (rockets.length) {
      return rockets.reduce((best, entry) => (entry.card.number > best.card.number ? entry : best)).seat;
    }
    const lead = list[0].card.suit;
    const suited = list.filter((entry) => entry.card.suit === lead);
    if (!suited.length) return list[0].seat;
    return suited.reduce((best, entry) => (entry.card.number > best.card.number ? entry : best)).seat;
  }

  function winnerAfter(card, seat) {
    if (!state) return -1;
    return trickWinnerOf(state.trick.concat([{ seat: seat, card: card }]));
  }

  function signalModeFor(player, card) {
    if (!player || !card || card.suit === "rocket") return null;
    const hand = state && player.index === viewSeat() ? handFor(player) : player.hand;
    const same = hand.filter((item) => item.suit === card.suit);
    if (!same.length) return null;
    if (same.length === 1) return "only";
    const numbers = same.map((item) => item.number);
    if (card.number === Math.max.apply(null, numbers)) return "highest";
    if (card.number === Math.min.apply(null, numbers)) return "lowest";
    return null;
  }

  function selectedCard() {
    if (!state) return null;
    const me = state.players[viewSeat()];
    if (!me) return null;
    return handFor(me).find((card) => card.uid === selectedUid) || null;
  }

  /* ------------------------------ توزيع المهام ------------------------------ */

  function pickTask(seat, taskId) {
    if (!state || state.over || state.phase !== "tasks") return false;
    if (seat !== state.pickSeat) return false;
    const index = state.centerTasks.findIndex((task) => task.id === taskId);
    if (index < 0) return false;
    const task = state.centerTasks.splice(index, 1)[0];
    const player = state.players[seat];
    player.task = { id: task.id, suit: task.suit, number: task.number, done: false };
    state.pickIndex += 1;
    note("<strong>" + esc(player.name) + "</strong> اختار " + taskLabel(task) + ".", "accent");
    markEvent("pick", { seat: seat, task: task.id });
    sound("click");

    if (!state.centerTasks.length) {
      state.phase = "play";
      state.activeSeat = state.commander;
      state.trickLeader = state.commander;
      state.trick = [];
      state.trickWinner = null;
      state.notice = "اكتمل توزيع المهام. القائد " + state.players[state.commander].name + " يبدأ أول خدعة.";
      note("اكتمل توزيع المهام. <strong>" + esc(state.players[state.commander].name) + "</strong> يبدأ أول خدعة.", "good");
      state.nextAt = Date.now() + (state.players[state.commander].isCpu ? difficultyInfo().delay : 250);
    } else {
      state.pickSeat = state.pickOrder[state.pickIndex % state.pickOrder.length];
      state.notice = "دور " + state.players[state.pickSeat].name + " في اختيار مهمة.";
      state.nextAt = Date.now() + (state.players[state.pickSeat].isCpu ? difficultyInfo().delay : 250);
    }
    render();
    return true;
  }

  /* ------------------------------ الراديو ------------------------------ */

  function signalCard(seat, uid) {
    if (!state || state.over || state.phase !== "play") return false;
    if (state.trick.length && state.trickWinner == null) return false;
    const player = state.players[seat];
    if (!player || player.signalUsed) return false;
    const card = player.hand.find((item) => item.uid === uid);
    if (!card) return false;
    const mode = signalModeFor(player, card);
    if (!mode) return false;
    if (state.trickWinner != null) {
      state.trick = [];
      state.trickWinner = null;
    }
    player.signalUsed = true;
    player.signal = { uid: card.uid, suit: card.suit, number: card.number, mode: mode };
    state.notice = "أرسل " + player.name + " إشارة راديو: " + signalLabel(player.signal) + ".";
    note("<strong>" + esc(player.name) + "</strong> أرسل إشارة راديو: " + signalLabel(player.signal) + ".", "accent");
    markEvent("signal", { seat: seat, mode: mode, suit: card.suit, number: card.number });
    sound("reveal");
    state.nextAt = Date.now() + (player.isCpu ? difficultyInfo().delay : 250);
    render();
    return true;
  }

  function signalLabel(signal) {
    if (!signal) return "";
    return SIGNALS[signal.mode] + " — " + (signal.suit === "rocket" ? "صاروخ" : SUITS[signal.suit].name) + " " + ar(signal.number);
  }

  /* ------------------------------ الخدع ------------------------------ */

  function playCard(seat, uid) {
    if (!state || state.over || state.phase !== "play") return false;
    if (seat !== state.activeSeat) return false;
    const player = state.players[seat];
    if (!player) return false;
    if (state.trickWinner != null) {
      state.trick = [];
      state.trickWinner = null;
      state.lastTrick = [];
    }
    const index = player.hand.findIndex((card) => card.uid === uid);
    if (index < 0) return false;
    const card = player.hand[index];
    const legal = legalCards(player);
    if (!legal.some((item) => item.uid === card.uid)) return false;

    player.hand.splice(index, 1);
    player.handCount = player.hand.length;
    if (!state.trick.length) state.leadSuit = card.suit;
    state.trick.push({ seat: seat, card: card });
    const isTaskCard = !!taskForCard(card);
    note("<strong>" + esc(player.name) + "</strong> لعب " + cardLabel(card) + (isTaskCard ? " — بطاقة مهمة!" : "") + ".", isTaskCard ? "warn" : "");
    markEvent("play", { seat: seat, suit: card.suit, number: card.number, task: isTaskCard });
    sound("card");

    if (state.trick.length < state.players.length) {
      state.activeSeat = (seat + 1) % state.players.length;
      state.notice = "دور " + state.players[state.activeSeat].name + " — " + (state.leadSuit === "rocket" ? "اللون المطلوب: صاروخ" : "اللون المطلوب: " + SUITS[state.leadSuit].name) + ".";
      state.nextAt = Date.now() + (state.players[state.activeSeat].isCpu ? difficultyInfo().delay : 200);
      render();
      return true;
    }

    resolveTrick();
    return true;
  }

  function resolveTrick() {
    const winner = trickWinnerOf(state.trick);
    state.trickWinner = winner;
    state.lastTrick = state.trick.slice();
    state.trickLeader = winner;
    state.trickNumber += 1;
    const winnerPlayer = state.players[winner];
    const winningCard = state.trick.find((entry) => entry.seat === winner);
    state.notice = "فاز " + winnerPlayer.name + " بالخدعة" + (winningCard ? " بـ" + cardLabel(winningCard.card) : "") + ".";
    note("<strong>" + esc(winnerPlayer.name) + "</strong> فاز بالخدعة " + ar(state.trickNumber) + ".", "");

    const matching = [];
    state.players.forEach((player) => {
      if (!player.task || player.task.done) return;
      const entry = state.trick.find((item) => cardMatchesTask(item.card, player.task));
      if (entry) matching.push({ owner: player, card: entry.card, playedBy: entry.seat });
    });

    const wrong = matching.find((item) => item.owner.index !== winner);
    if (wrong) {
      wrong.owner.task.lost = true;
      state.trick.forEach((entry) => {
        const owner = state.players.find((player) => player.task && cardMatchesTask(entry.card, player.task));
        if (owner && owner.index !== winner) owner.task.lost = true;
      });
      finishGame(false, "wrong", {
        task: wrong.owner.task,
        owner: wrong.owner,
        card: wrong.card,
        winner: winnerPlayer,
      });
      return;
    }

    let completed = 0;
    matching.forEach((item) => {
      item.owner.task.done = true;
      item.owner.task.doneTrick = state.trickNumber;
      completed += 1;
    });
    if (completed) {
      const names = matching.map((item) => esc(item.owner.name) + " (" + taskLabel(item.owner.task) + ")").join("، ");
      state.notice = "أكمل " + names + " مهمته في الخدعة نفسها!";
      note("<strong>مهمة مكتملة:</strong> " + names + ".", "good");
      markEvent("task", { count: completed, winner: winner });
      sound("score");
    } else {
      markEvent("trick", { winner: winner, number: state.trickNumber });
      sound("select");
    }

    if (tasksDone() >= state.tasksTotal) {
      finishGame(true, "tasks");
      return;
    }

    const canContinue = state.players.every((player) => player.hand.length > 0);
    if (!canContinue) {
      finishGame(false, "empty");
      return;
    }

    state.activeSeat = winner;
    state.nextAt = Date.now() + (winnerPlayer.isCpu ? difficultyInfo().delay : 700);
    if (winnerPlayer.isCpu) state.notice = "فاز " + winnerPlayer.name + " بالخدعة. الزميل الآلي يفكر في الخدعة التالية…";
    render();
  }

  function finishGame(win, reason, extra) {
    if (!state || state.over) return;
    state.over = true;
    state.win = !!win;
    state.phase = "over";
    state.result = { reason: reason || "empty", tasksDone: tasksDone(), tasksTotal: state.tasksTotal };
    if (extra && extra.task) state.result.task = taskLabel(extra.task);
    if (extra && extra.owner) state.result.owner = extra.owner.name;
    if (extra && extra.card) state.result.card = cardLabel(extra.card);
    if (extra && extra.winner) state.result.winner = extra.winner.name;
    if (win) {
      state.notice = "اكتملت كل المهام! فاز الطاقم كله برحلة ناجحة.";
      note("<strong>فاز الطاقم!</strong> اكتملت المهام " + ar(tasksDone()) + " / " + ar(state.tasksTotal) + ".", "good");
      markEvent("victory");
      sound("win");
    } else if (reason === "wrong") {
      const owner = extra && extra.owner ? extra.owner.name : "زميل";
      const card = extra && extra.card ? cardLabel(extra.card) : "بطاقة مهمة";
      const winner = extra && extra.winner ? extra.winner.name : "لاعب آخر";
      state.notice = "فاز " + winner + " بـ" + card + "، وهي مهمة " + owner + ". خسر الطاقم فوراً.";
      note("<strong>خسارة فورية:</strong> فاز " + esc(winner) + " بـ" + card + " التي تخص " + esc(owner) + ". المهمة للفريق كله.", "warn");
      markEvent("fail", { reason: "wrong" });
      sound("error");
    } else {
      state.notice = "نفدت الأوراق وبقيت " + ar(state.tasksTotal - tasksDone()) + " مهام. خسر الطاقم معاً.";
      note("<strong>نفدت الأوراق.</strong> بقيت " + ar(state.tasksTotal - tasksDone()) + " مهام غير مكتملة — الخسارة على الفريق كله.", "warn");
      markEvent("fail", { reason: "empty" });
      sound("error");
    }
    render();
    if (!overReported && apiRef && typeof apiRef.gameOver === "function") {
      overReported = true;
      const standing = state.players.map((player) => ({
        name: player.name + (player.isCpu ? " · زميل آلي" : " · إنسان"),
        value: (player.task ? taskLabel(player.task) + (player.task.done ? " ✓" : player.task.lost ? " ✗" : " —") : "بدون مهمة") +
          " · إشارة: " + (player.signalUsed ? SIGNAL_SHORT[player.signal ? player.signal.mode : "highest"] : "متاحة"),
      }));
      try {
        apiRef.gameOver({
          title: win ? "نجحت الرحلة — فاز الطاقم" : "فشلت الرحلة — خسر الطاقم",
          text: win
            ? "أكمل الطاقم كل مهامه. الفوز مشترك لكل لاعب، ولا يوجد بطل منفرد."
            : (reason === "wrong"
              ? "فاز لاعب ببطاقة مهمة تخص زميلاً آخر. في الطاقم، أي خطأ في المهمة يخص الجميع."
              : "نفدت الأوراق قبل إكمال المهام. حاولوا مرة أخرى بتوزيع مهام وإشارات راديو أفضل."),
          winner: win ? "الطاقم الكامل" : "الرحلة",
          icon: win ? "🚀" : "💥",
          tone: win ? "win" : "lose",
          standings: standing,
        });
      } catch (err) { /* ignore */ }
    }
  }

  /* ------------------------------ ذكاء زملاء الطاقم ------------------------------ */

  function aiChooseTask(seat) {
    if (!state || state.phase !== "tasks" || !state.centerTasks.length) return false;
    const player = state.players[seat];
    if (!player) return false;
    const info = difficultyInfo();
    let best = null;
    state.centerTasks.forEach((task) => {
      const matching = player.hand.some((card) => cardMatchesTask(card, task));
      const sameSuit = player.hand.filter((card) => card.suit === task.suit);
      const high = sameSuit.length ? Math.max.apply(null, sameSuit.map((card) => card.number)) : 0;
      const rockets = player.hand.filter((card) => card.suit === "rocket").length;
      let score = 0;
      if (matching) {
        score += 4;
        if (task.number >= 8) score += 6;
        else if (task.number >= 6) score += 1;
        else if (task.number <= 4) score -= 6;
      } else {
        score += 3;
        if (task.number <= 3) score += 4;
        else if (task.number >= 8) score -= 3;
      }
      if (high >= 7) score += 3;
      if (high >= 9) score += 2;
      score += Math.min(3, sameSuit.length * 0.5);
      score += rockets * 1.1;
      score += Math.random() * info.noise * 0.35;
      if (!best || score > best.score) best = { task: task, score: score };
    });
    if (!best) return false;
    return pickTask(seat, best.task.id);
  }

  function qualifyingSignals(player) {
    const out = [];
    if (!player) return out;
    COLOR_SUITS.forEach((suit) => {
      const same = player.hand.filter((card) => card.suit === suit);
      if (!same.length) return;
      if (same.length === 1) {
        out.push({ card: same[0], mode: "only", suit: suit });
        return;
      }
      const high = same.reduce((best, card) => (card.number > best.number ? card : best));
      const low = same.reduce((best, card) => (card.number < best.number ? card : best));
      out.push({ card: high, mode: "highest", suit: suit });
      out.push({ card: low, mode: "lowest", suit: suit });
    });
    return out;
  }

  function chooseAiSignal(player) {
    const options = qualifyingSignals(player);
    if (!options.length) return null;
    let best = null;
    options.forEach((option) => {
      let score = option.card.number * 0.4;
      if (option.mode === "highest") score += 5;
      if (option.mode === "only") score += 3;
      if (player.task && !player.task.done && cardMatchesTask(option.card, player.task)) score += 12;
      if (player.task && player.task.suit === option.suit) score += 4;
      if (option.card.number >= 8) score += 3;
      score += Math.random() * difficultyInfo().noise * 0.2;
      if (!best || score > best.score) best = { card: option.card, score: score };
    });
    return best;
  }

  function chooseAiPlay(player) {
    const legal = legalCards(player);
    if (!legal.length) return null;
    const info = difficultyInfo();
    const pending = tasksPending();
    const leading = state.trick.length === 0;

    const scored = legal.map((card) => {
      const after = winnerAfter(card, player.index);
      let score = -card.number * 0.9;
      if (leading) {
        score += 5;
        if (card.number <= 3) score += 2;
        if (card.suit === "rocket") score -= 12;
      } else {
        const lead = state.trick[0].card.suit;
        if (card.suit === lead) score += 3;
        if (card.suit === "rocket") score -= 5;
        if (after === player.index) score -= 6;
      }

      const own = player.task && !player.task.done ? player.task : null;
      if (own) {
        const inTrick = taskInTrick(own);
        const ownInHand = cardMatchesTask(card, own);
        if (inTrick) {
          if (after === player.index) score += 120;
          else score -= 140;
        } else if (ownInHand) {
          if (leading) {
            score += card.number >= 9 ? -18 : -62;
          } else if (after === player.index) {
            score += 62;
          } else {
            score -= 135;
          }
        }
      }

      pending.forEach((owner) => {
        if (owner.index === player.index) return;
        if (!taskInTrick(owner.task)) return;
        if (after === owner.index) score += 70;
        else score -= 110;
      });

      const otherTask = pending.find((owner) => owner.index !== player.index && cardMatchesTask(card, owner.task));
      if (otherTask) {
        if (after === otherTask.index) score += 32;
        else score -= 62;
      }

      if (state.trick.some((entry) => taskForCard(entry.card)) && after === player.index) score -= 4;
      score += Math.random() * info.noise;
      return { card: card, score: score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top) return legal[0];
    if (difficultyInfo().noise > 18 && scored.length > 2 && Math.random() < 0.25) {
      return scored[1 + Math.floor(Math.random() * 2)].card;
    }
    return top.card;
  }

  function aiStep() {
    if (!state || state.over || destroyed || !isHostOrLocal()) return;
    const now = Date.now();
    if (now < (state.nextAt || 0)) return;

    if (state.phase === "tasks") {
      const picker = pickPlayer();
      if (!picker || !picker.isCpu) return;
      aiChooseTask(picker.index);
      return;
    }

    if (state.phase !== "play") return;
    const player = activePlayer();
    if (!player || !player.isCpu) return;
    if (state.trick.length === 0 && !player.signalUsed && Math.random() < difficultyInfo().signalChance) {
      const signal = chooseAiSignal(player);
      if (signal) {
        signalCard(player.index, signal.card.uid);
        return;
      }
    }
    if (state.trickWinner != null) {
      state.trick = [];
      state.lastTrick = [];
      state.trickWinner = null;
    }
    const card = chooseAiPlay(player);
    if (card) playCard(player.index, card.uid);
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function cardFace(card) {
    if (!card) return "";
    if (card.suit === "rocket") {
      return "<strong>" + ar(card.number) + "</strong><small>🚀 صاروخ</small>";
    }
    return "<strong>" + ar(card.number) + "</strong><small>" + esc(SUITS[card.suit].name) + "</small>";
  }

  function cardHTML(card, opts) {
    const options = opts || {};
    const classes = ["crew-card"];
    if (options.task) classes.push("is-task");
    if (options.playable) classes.push("is-playable");
    if (options.selected) classes.push("is-selected");
    if (options.played) classes.push("is-played");
    if (options.winner) classes.push("is-winner");
    if (options.own) {
      return '<button type="button" class="' + classes.join(" ") + '" style="' + suitStyle(card.suit) + '"' +
        ' data-crew-card="' + esc(card.uid) + '" aria-pressed="' + (options.selected ? "true" : "false") + '"' +
        ' aria-label="' + esc(cardLabel(card)) + '"' + (options.disabled ? " disabled" : "") + ">" +
        cardFace(card) + "</button>";
    }
    return '<div class="' + classes.join(" ") + '" style="' + suitStyle(card.suit) + '" title="' + esc(cardLabel(card)) + '">' +
      cardFace(card) + "</div>";
  }

  function taskChipHTML(task) {
    if (!task) return "";
    return '<span class="crew-suit-chip" style="' + suitStyle(task.suit) + '">' + ar(task.number) + "</span>";
  }

  function renderTeamHeader() {
    const actor = state.players[actorSeat()];
    return BG.coop.teamHeader({
      icon: "🚀",
      title: gameLabel(),
      en: "THE CREW · ONE TEAM, ONE MISSION",
      goal: "أكملوا كل المهام معاً قبل أن تنفد الأوراق",
      players: state.players,
      current: actorSeat(),
      meta(player) {
        const bits = [];
        if (player.task) bits.push((player.task.done ? "✓ " : player.task.lost ? "✗ " : "🎯 ") + taskLabel(player.task));
        else bits.push("بانتظار مهمة");
        bits.push(player.signalUsed ? "📡 مستخدمة" : "📡 متاحة");
        return bits.join(" · ");
      },
      chips:
        BG.coop.chip("المهام", ar(tasksDone()) + " / " + ar(state.tasksTotal), tasksDone() === state.tasksTotal ? "is-gold" : "") +
        BG.coop.chip("القائد", esc(state.players[state.commander].name), "is-gold") +
        BG.coop.chip("الدور", actor ? esc(actor.name) : "—") +
        BG.coop.chip("الخدعة", ar(state.trickNumber)),
    });
  }

  function renderObjective() {
    const done = tasksDone();
    const actor = state.players[actorSeat()];
    return '<div class="coop-objective">' +
      BG.coop.objectiveCard("المهام المكتملة", ar(done) + " / " + ar(state.tasksTotal), "كل مهمة تُنجز معاً", done === state.tasksTotal ? "is-gold" : "", Math.round((done / Math.max(1, state.tasksTotal)) * 100)) +
      BG.coop.objectiveCard("الخدع", ar(state.trickNumber), "الفائز يقود التالية", "", 0) +
      BG.coop.objectiveCard("الأوراق المتبقية", ar(remainingCards()), "لا وقت للتفريط", remainingCards() <= state.players.length * 2 ? "is-warn" : "") +
      BG.coop.objectiveCard("إشارات الراديو", ar(signalsLeft()) + " / " + ar(state.players.length), "واحدة لكل لاعب", signalsLeft() === 0 ? "is-warn" : "") +
      BG.coop.objectiveCard("الدور الآن", actor ? actor.name : "—", state.phase === "tasks" ? "توزيع المهام" : "قيادة الخدعة", "is-gold") +
      "</div>";
  }

  function taskChoiceHTML(task) {
    const canPick = canPickNow();
    return '<button type="button" class="crew-task is-pick' + (canPick ? "" : " is-static") + '" data-crew-task="' + esc(task.id) + '"' +
      (canPick ? "" : " disabled") + ' aria-label="' + esc(taskLabel(task)) + '">' +
      '<div class="crew-task-head">مهمة معروضة <span>🎯</span></div>' +
      '<div class="crew-task-cardline">' + taskChipHTML(task) + "<span>" + esc(SUITS[task.suit].name) + " " + ar(task.number) + "</span></div>" +
      "<small>" + (canPick ? "اختر هذه المهمة" : "بانتظار دورك") + "</small>" +
      "</button>";
  }

  function taskOwnerHTML(player) {
    const task = player.task;
    const cls = task
      ? (task.done ? " is-done" : "") + (task.lost ? " is-lost" : "") + (player.index === viewSeat() ? " is-mine" : "")
      : "";
    return '<div class="crew-task' + cls + '">' +
      '<div class="crew-task-head">' + (player.index === state.commander ? "👑 " : "") + esc(player.name) +
      (task && task.done ? " <span>✓</span>" : task && task.lost ? " <span>✗</span>" : "") + "</div>" +
      (task
        ? '<div class="crew-task-cardline">' + taskChipHTML(task) + "<span>" + esc(SUITS[task.suit].name) + " " + ar(task.number) + "</span></div>" +
          "<small>" + (task.done ? "اكتملت المهمة" : task.lost ? "خسرت المهمة" : "يجب أن يفوز صاحبها بالخدعة") + "</small>"
        : '<small>بانتظار اختيار مهمة</small>') +
      "</div>";
  }

  function renderSignals() {
    const signals = state.players.filter((player) => player.signal);
    return '<div class="crew-comm"><strong>📡 إشارات الراديو</strong>' +
      (signals.length
        ? signals.map((player) => '<span class="crew-signal-item">' +
          '<span class="crew-comm-card" style="' + suitStyle(player.signal.suit) + '">' + ar(player.signal.number) + "</span>" +
          "<span><b>" + esc(player.name) + "</b><small>" + SIGNALS[player.signal.mode] + " — " + esc(SUITS[player.signal.suit].name) + " " + ar(player.signal.number) + "</small></span></span>").join("")
        : '<span class="coop-note">لم يرسل أحد إشارة بعد — لكل لاعب إشارة واحدة قبل أي خدعة.</span>') +
      "</div>";
  }

  function renderTaskArea() {
    let html = "";
    if (state.phase === "tasks") {
      const picker = pickPlayer();
      html += '<div class="crew-mission"><div><strong>توزيع المهام</strong><small>القائد يختار أولاً ثم بالاتجاه</small></div>' +
        '<span class="crew-reveal">' + (canPickNow() ? "دورك: اختر مهمة" : "بانتظار " + esc(picker ? picker.name : "الطاقم")) + "</span></div>" +
        '<div class="crew-tasks">' + state.centerTasks.map(taskChoiceHTML).join("") + "</div>";
    }
    html += '<div class="crew-mission"><div><strong>مهام الطاقم</strong><small>معلنة للجميع — الأيدي فقط سرية</small></div>' +
      '<span class="crew-reveal">' + ar(tasksDone()) + " / " + ar(state.tasksTotal) + " مكتملة</span></div>" +
      '<div class="crew-tasks">' + state.players.map(taskOwnerHTML).join("") + "</div>";
    html += renderSignals();
    return html;
  }

  function renderTrick() {
    if (!state.trick.length) {
      const actor = activePlayer();
      return '<div class="crew-trick"><p class="coop-note">' +
        (state.phase === "tasks" ? "لم تبدأ الخدع بعد. وزّعوا المهام أولاً." : "الخدعة فارغة — " + esc(actor ? actor.name : "القائد") + " يقود.") +
        "</p></div>";
    }
    return '<div class="crew-trick">' + state.trick.map((entry) => {
      const owner = taskForCard(entry.card);
      const won = state.trickWinner === entry.seat;
      return '<div class="crew-trick-slot' + (won ? " is-winner" : "") + '">' +
        "<small>" + esc(state.players[entry.seat].name) + "</small>" +
        cardHTML(entry.card, { played: true, task: !!owner, winner: won }) +
        (won ? '<span class="crew-reveal">الفائز</span>' : "") +
        "</div>";
    }).join("") + "</div>";
  }

  function playerRowHTML(player) {
    const task = player.task;
    return '<div class="crew-player' + (player.index === actorSeat() ? " is-current" : "") + '">' +
      '<span class="cp-left">' + BG.coop.avatar(player) + "<b>" + esc(player.name) + "</b>" +
      (player.index === state.commander ? " <small>👑 قائد</small>" : "") +
      (player.index === viewSeat() && !isNet() ? " <small>· أنت</small>" : "") +
      (isNet() && player.index === mySeat() ? " <small>· أنت</small>" : "") +
      (player.isCpu ? " <small>🤖</small>" : "") +
      "</span>" +
      "<span>" + ar(handCountFor(player)) + " 🂠" +
      (task ? " · " + (task.done ? "✓" : task.lost ? "✗" : "🎯") : "") +
      (player.signal ? " · 📡" : "") +
      "</span></div>";
  }

  function renderTable() {
    return '<div class="crew-table">' + renderTrick() +
      '<div class="crew-players">' + state.players.map(playerRowHTML).join("") + "</div></div>";
  }

  function renderHand() {
    const me = state.players[viewSeat()];
    const hand = handFor(me);
    const legal = legalUidsForView();
    const selectable = selectableUidsForView();
    return '<div class="crew-hand-wrap"><div class="crew-mission"><div><strong>يدك</strong><small>سرية — لا يراها بقية الطاقم</small></div>' +
      '<span class="crew-reveal">' + ar(hand.length) + " بطاقة</span></div>" +
      '<div class="crew-hand">' +
      (hand.length
        ? hand.map((card) => cardHTML(card, {
          own: true,
          task: !!taskForCard(card),
          playable: legal.indexOf(card.uid) >= 0,
          selected: selectedUid === card.uid,
          disabled: selectable.indexOf(card.uid) < 0,
        })).join("")
        : '<p class="coop-note">' + (isGuest() && !hand.length ? "بانتظار وصول يدك من القائد…" : "يدك فارغة.") + "</p>") +
      "</div></div>";
  }

  function renderEnd() {
    return '<div class="crew-end ' + (state.win ? "is-win" : "is-lose") + '">' +
      '<span aria-hidden="true">' + (state.win ? "🚀" : "💥") + "</span>" +
      "<strong>" + (state.win ? "نجحت الرحلة — فاز الطاقم" : "فشلت الرحلة — خسر الطاقم") + "</strong>" +
      "<p>" + esc(state.notice) + "</p>" +
      '<button type="button" class="coop-btn ghost small" data-crew-action="rules">القواعد</button>' +
      "</div>";
  }

  function renderActions() {
    if (state.over) return renderEnd();
    const rules = '<button type="button" class="coop-btn ghost small" data-crew-action="rules">القواعد</button>';
    if (state.phase === "tasks") {
      const picker = pickPlayer();
      return '<div class="crew-actions">' +
        (canPickNow()
          ? '<span class="crew-reveal">اختر مهمة من البطاقات المعروضة</span>'
          : '<span class="coop-note">بانتظار ' + esc(picker ? picker.name : "الطاقم") + " ليختار مهمته.</span>") +
        rules + "</div>";
    }
    if (!canActNow()) {
      const actor = activePlayer();
      if (canSignalNow()) {
        const me = state.players[viewSeat()];
        const card = selectedCard();
        const mode = card ? signalModeFor(me, card) : null;
        return '<div class="crew-actions">' +
          '<button type="button" class="coop-btn ghost" data-crew-action="signal"' + (mode ? "" : " disabled") + ">📡 إشارة راديو</button>" +
          '<span class="coop-note">' + (card
            ? (mode ? "إشارة متاحة: " + SIGNALS[mode] : "اختر بطاقة أعلى أو أدنى في لونها فقط.")
            : "بين الخدع يمكنك إرسال إشارة واحدة: اختر بطاقة من يدك.") + "</span>" +
          rules + "</div>";
      }
      return '<div class="crew-actions"><span class="coop-note">بانتظار ' + esc(actor ? actor.name : "الطاقم") + " ليلعب بطاقته. تابعوا المهمة معاً.</span>" + rules + "</div>";
    }
    const me = state.players[viewSeat()];
    const card = selectedCard();
    const legal = legalUidsForView();
    const playable = !!(card && legal.indexOf(card.uid) >= 0);
    const mode = card ? signalModeFor(me, card) : null;
    const canSignal = !!(canSignalNow() && mode);
    return '<div class="crew-actions">' +
      '<button type="button" class="coop-btn primary" data-crew-action="play"' + (playable ? "" : " disabled") + ">العب البطاقة</button>" +
      '<button type="button" class="coop-btn ghost" data-crew-action="signal"' + (canSignal ? "" : " disabled") + ">📡 إشارة راديو</button>" +
      '<span class="coop-note">' + (card
        ? (mode ? "إشارة متاحة: " + SIGNALS[mode] : "هذه البطاقة لا تصلح لإشارة (أعلى/أدنى/وحيدة في لونها فقط).")
        : "اختر بطاقة من يدك.") + "</span>" +
      rules + "</div>";
  }

  function renderCurtain() {
    const player = state.players[curtainSeat];
    return '<div class="crew-curtain"><div class="crew-curtain-inner">' +
      '<span aria-hidden="true">🫥</span>' +
      "<strong>مرّر الجهاز إلى " + esc(player ? player.name : "اللاعب التالي") + "</strong>" +
      "<p>" + (state.phase === "tasks" ? "اختيار المهمة سري: لا تنظر إلى يد زميلك قبل دورك." : "بطاقاتك سرية. اضغط الزر عندما يكون الجهاز بين يديك وحدك.") + "</p>" +
      '<button type="button" class="coop-btn primary" data-crew-view-confirm>أنا ' + esc(player ? player.name : "اللاعب") + " — أظهر شاشتي</button>" +
      "</div></div>";
  }

  function syncPrivacy() {
    if (!state || isNet()) return;
    if (state.over) {
      curtainSeat = -1;
      return;
    }
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
    const seat = actorSeat();
    const actor = state.players[seat];
    if (!actor || actor.isCpu || seat === localViewer) {
      curtainSeat = -1;
      return;
    }
    curtainSeat = seat;
  }

  function renderStage() {
    if (curtainSeat >= 0) return '<div class="crew-stage">' + renderCurtain() + "</div>";
    const event = state.lastEvent;
    const flash = event && Date.now() - event.at < 1300
      ? (event.kind === "fail" ? " is-fail" : event.kind === "victory" ? " is-win" : event.kind === "task" ? " is-task" : event.kind === "signal" ? " is-signal" : "")
      : "";
    const actor = state.players[actorSeat()];
    return '<div class="crew-stage' + flash + '">' +
      '<div class="crew-mission"><div><strong>الرحلة إلى الكوكب التاسع</strong><small>' +
      (state.phase === "tasks" ? "توزيع المهام" : state.phase === "over" ? "انتهت الرحلة" : "الخدعة " + ar(state.trickNumber + 1)) +
      "</small></div><div class=\"crew-mission-chips\">" +
      BG.coop.chip("الهدف", ar(tasksDone()) + " / " + ar(state.tasksTotal), tasksDone() === state.tasksTotal ? "is-gold" : "") +
      BG.coop.chip("القائد", esc(state.players[state.commander].name), "is-gold") +
      BG.coop.chip("الدور", actor ? esc(actor.name) : "—") +
      "</div></div>" +
      (state.autoCrew ? '<p class="coop-note crew-auto-note">🤖 أُضيف زميل آلي تلقائياً لأن الطاقم بدأ بأقل من ثلاثة لاعبين بشريين — يعمل مع الفريق لا ضده.</p>' : "") +
      renderTaskArea() +
      renderTable() +
      renderHand() +
      renderActions() +
      '<p class="crew-notice">' + esc(state.notice) + "</p>" +
      "</div>";
  }

  function renderSide() {
    const status = '<section class="coop-panel"><div class="coop-panel-head"><h3>حالة الرحلة</h3><small>معلومات مشتركة</small></div>' +
      '<div class="han-status-grid">' +
      "<span>🎯 المهام<b>" + ar(tasksDone()) + " / " + ar(state.tasksTotal) + "</b></span>" +
      "<span>🃏 الخدع<b>" + ar(state.trickNumber) + "</b></span>" +
      "<span>🂠 الأوراق<b>" + ar(remainingCards()) + "</b></span>" +
      "<span>📡 الراديو<b>" + ar(signalsLeft()) + " / " + ar(state.players.length) + "</b></span>" +
      '</div><p class="coop-note">القائد هو حامل الصاروخ ٤. الفائز بكل خدعة يقود التالية.</p></section>';

    const crew = '<section class="coop-panel"><div class="coop-panel-head"><h3>الطاقم</h3><small>مهام وإشارات</small></div>' +
      '<div class="crew-players">' + state.players.map((player) => {
        const task = player.task;
        return '<div class="crew-player' + (player.index === actorSeat() ? " is-current" : "") + '">' +
          '<span class="cp-left">' + BG.coop.avatar(player) + "<b>" + esc(player.name) + "</b></span>" +
          "<span>" + (task ? esc(taskLabel(task)) + (task.done ? " ✓" : task.lost ? " ✗" : "") : "بدون مهمة") +
          (player.signal ? " · 📡 " + SIGNAL_SHORT[player.signal.mode] : "") + "</span></div>";
      }).join("") + "</div></section>";

    return status + crew;
  }

  function render() {
    if (!rootRef || !state || destroyed) return;
    syncPrivacy();
    const header = renderTeamHeader();
    const objective = renderObjective();
    rootRef.innerHTML = '<div class="coop-shell crew-shell">' +
      '<div class="coop-main">' + header + objective + renderStage() + "</div>" +
      '<aside class="coop-side">' + renderSide() + "</aside>" +
      "</div>";
    if (apiRef && typeof apiRef.setStatus === "function") {
      apiRef.setStatus(state.over ? "انتهت الرحلة · " + ar(tasksDone()) + "/" + ar(state.tasksTotal) : "الطاقم · " + ar(tasksDone()) + "/" + ar(state.tasksTotal), state.over ? "" : "live");
    }
    if (!applyingNet) netSync();
  }

  /* ------------------------------ الشبكة ------------------------------ */

  function seatForPeer(from) {
    if (!apiRef || !apiRef.net || !Array.isArray(apiRef.net.seats)) return -1;
    return apiRef.net.seats.findIndex((seat) => seat && seat.peerId && seat.peerId === from);
  }

  function sendGuest(payload) {
    if (!isGuest() || !BG.net) return false;
    try { return BG.net.send(payload); } catch (err) { return false; }
  }

  function netSync() {
    if (!isNet() || applyingNet || !isHostOrLocal() || !state) return;
    if (apiRef.net.sendState) {
      try { apiRef.net.sendState(); } catch (err) { /* الشبكة اختيارية */ }
    }
    sendHands();
  }

  function handPayload(forSeat) {
    const player = state.players[forSeat];
    if (!player) return null;
    return {
      t: "crew-hand",
      seat: forSeat,
      hand: player.hand.map((card) => ({ uid: card.uid, suit: card.suit, number: card.number })),
    };
  }

  function sendHandTo(seatIndex) {
    if (!isNet() || !isHostOrLocal() || !state) return;
    const seat = apiRef.net.seats[seatIndex];
    if (!seat || seat.type !== "human" || seatIndex === apiRef.net.seat || !seat.peerId) return;
    try { BG.net.sendTo(seat.peerId, handPayload(seatIndex)); } catch (err) { /* ignore */ }
  }

  function sendHands() {
    if (!isNet() || !isHostOrLocal() || !state) return;
    state.players.forEach((player, index) => sendHandTo(index));
  }

  function applyHand(data) {
    if (!data || !Array.isArray(data.hand)) return;
    const seat = Number(data.seat);
    if (!Number.isInteger(seat) || seat !== mySeat()) return;
    privateHand = data.hand.map((card) => ({ uid: String(card.uid || ""), suit: String(card.suit || ""), number: Number(card.number) || 0 }))
      .filter((card) => card.uid && card.suit);
    render();
  }

  function requestHand(force) {
    if (!isGuest()) return;
    const now = Date.now();
    if (!force && now - lastHandRequest < 1200) return;
    lastHandRequest = now;
    sendGuest({ t: "crew-sync-request" });
  }

  function onNetMessage(event) {
    const data = event && event.data;
    if (!data || typeof data.t !== "string" || data.t.indexOf("crew-") !== 0) return;
    if (data.t === "crew-hand") {
      applyHand(data);
      return;
    }
    if (!isHostOrLocal() || !state) return;
    const seat = seatForPeer(event.from);
    if (seat < 0) return;
    if (data.t === "crew-sync-request") {
      sendHandTo(seat);
      return;
    }
    if (data.t === "crew-task") {
      if (seat === state.pickSeat) pickTask(seat, String(data.task || ""));
      return;
    }
    if (data.t === "crew-play") {
      if (seat === state.activeSeat) playCard(seat, String(data.uid || ""));
      return;
    }
    if (data.t === "crew-signal") {
      signalCard(seat, String(data.uid || ""));
    }
  }

  function publicSnapshot() {
    if (!state) return null;
    const copy = JSON.parse(JSON.stringify(state));
    copy.privateMasked = true;
    delete copy.fullState;
    copy.players.forEach((player) => {
      player.handCount = player.hand.length;
      player.hand = player.hand.map((card) => ({ uid: card.uid }));
    });
    return copy;
  }

  function bindNet() {
    if (!BG.net) return function () {};
    const off = BG.net.on("message", onNetMessage);
    return function () { try { off(); } catch (err) { /* ignore */ } };
  }

  /* ------------------------------ التفاعل ------------------------------ */

  function showRules() {
    try {
      if (apiRef && typeof apiRef.rules === "function") apiRef.rules();
      else BG.openRules(game, state ? { difficulty: state.difficulty } : {});
    } catch (err) { /* ignore */ }
  }

  function localPlaySelected() {
    if (!canActNow() || !selectedUid) return;
    const uid = selectedUid;
    if (legalUidsForView().indexOf(uid) < 0) return;
    selectedUid = null;
    if (isGuest()) {
      sendGuest({ t: "crew-play", uid: uid });
      render();
      return;
    }
    playCard(state.activeSeat, uid);
  }

  function localSignalSelected() {
    if (!canSignalNow() || !selectedUid) return;
    const me = state.players[viewSeat()];
    const card = selectedCard();
    if (!me || !card || !signalModeFor(me, card)) return;
    const uid = selectedUid;
    selectedUid = null;
    if (isGuest()) {
      sendGuest({ t: "crew-signal", uid: uid });
      render();
      return;
    }
    signalCard(viewSeat(), uid);
  }

  function localPickTask(taskId) {
    if (!canPickNow()) return;
    if (isGuest()) {
      sendGuest({ t: "crew-task", task: taskId });
      return;
    }
    pickTask(state.pickSeat, taskId);
  }

  function onClick(event) {
    if (!state) return;
    const confirm = event.target.closest ? event.target.closest("[data-crew-view-confirm]") : null;
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
    const card = event.target.closest ? event.target.closest("[data-crew-card]") : null;
    if (card) {
      if (card.disabled) return;
      const uid = card.getAttribute("data-crew-card");
      selectedUid = selectedUid === uid ? null : uid;
      sound("click");
      render();
      return;
    }
    const task = event.target.closest ? event.target.closest("[data-crew-task]") : null;
    if (task) {
      if (task.disabled) return;
      localPickTask(task.getAttribute("data-crew-task"));
      return;
    }
    const action = event.target.closest ? event.target.closest("[data-crew-action]") : null;
    if (action) {
      const kind = action.getAttribute("data-crew-action");
      if (kind === "play") localPlaySelected();
      else if (kind === "signal") localSignalSelected();
      else if (kind === "rules") showRules();
    }
  }

  /* ------------------------------ التشغيل ------------------------------ */

  function create(root, api) {
    destroyed = false;
    overReported = false;
    rootRef = root;
    apiRef = api;
    selectedUid = null;
    curtainSeat = -1;
    privateHand = [];
    lastHandRequest = 0;
    eventSeq = 0;
    fxSeenEvent = 0;
    const seats = (api && api.players ? api.players : []).slice(0, 5);
    const difficulty = (api && api.options && api.options.difficulty) || "medium";
    createState(seats, difficulty);
    const humans = humanSeats();
    localViewer = humans.length ? humans[0] : 0;
    rootRef.addEventListener("click", onClick);
    const netOff = bindNet();
    render();
    if (aiTimer) clearInterval(aiTimer);
    aiTimer = setInterval(function () {
      if (destroyed) return;
      aiStep();
    }, 380);

    let debugRef = null;
    try {
      if (new URLSearchParams(window.location.search).has("bgdebug")) {
        debugRef = {
          get state() { return state; },
          get api() { return apiRef; },
          snapshot() { return JSON.parse(JSON.stringify(state)); },
          selected() { return selectedUid; },
          renderNow() { render(); },
          pick(seat, taskId) { return pickTask(Number(seat), String(taskId)); },
          play(uid) { return playCard(state.activeSeat, String(uid)); },
          signal(uid) { return signalCard(state.activeSeat, String(uid)); },
          setActive(seat) { if (state.players[seat]) { state.activeSeat = Number(seat); render(); } },
          setHand(seat, cards) {
            const player = state.players[seat];
            if (!player) return false;
            player.hand = (cards || []).map((card) => ({ uid: card.uid, suit: card.suit, number: Number(card.number) }));
            sortHand(player.hand);
            player.handCount = player.hand.length;
            if (seat === mySeat()) privateHand = player.hand.map((card) => ({ uid: card.uid, suit: card.suit, number: card.number }));
            render();
            return true;
          },
          setCenter(tasks) {
            state.centerTasks = (tasks || []).map((task) => ({ id: task.id, suit: task.suit, number: Number(task.number) }));
            render();
          },
          forceTasks() {
            state.players.forEach((player, index) => {
              if (!player.task) {
                const task = state.centerTasks[index] || state.centerTasks[0] || { id: "task-pink-1", suit: "pink", number: 1 };
                player.task = { id: task.id, suit: task.suit, number: task.number, done: false };
              }
            });
            state.tasksTotal = state.players.length;
            state.centerTasks = [];
            state.phase = "play";
            state.activeSeat = state.commander;
            state.trickLeader = state.commander;
            state.trick = [];
            state.trickWinner = null;
            state.nextAt = 0;
            render();
          },
          markTaskDone(seat) {
            const player = state.players[seat];
            if (!player || !player.task) return;
            player.task.done = true;
            render();
          },
          forceWin() {
            state.players.forEach((player) => {
              if (!player.task) player.task = { id: "task-pink-1", suit: "pink", number: 1, done: false };
              player.task.done = true;
            });
            state.tasksTotal = state.players.length;
            finishGame(true, "debug");
          },
          forceLose(reason) { finishGame(false, reason || "empty"); },
          setSignals(used) { state.players.forEach((player) => { player.signalUsed = !!used; }); render(); },
        };
        window.__bgDebug = debugRef;
      }
    } catch (err) { console.warn(err); }

    return {
      netSnapshot() { return state ? BG.netCodec.encode(publicSnapshot()) : null; },
      saveSnapshot() {
        if (!state) return null;
        const copy = JSON.parse(JSON.stringify(state));
        copy.privateMasked = false;
        copy.fullState = true;
        return copy;
      },
      netLoad(snapshot) {
        if (!snapshot) return;
        const prevEvent = state && state.lastEvent ? state.lastEvent.id : 0;
        applyingNet = true;
        try {
          const incoming = BG.netCodec.decode(snapshot);
          const full = !!(incoming && incoming.fullState);
          state = incoming;
          if (state) delete state.fullState;
          normalizeState();
          const mine = state.players[mySeat()];
          if (full) {
            privateHand = mine ? mine.hand.map((card) => ({ uid: card.uid, suit: card.suit, number: card.number })) : [];
          } else if (isGuest() && mine && privateHand.length) {
            const uids = {};
            mine.hand.forEach((card) => { uids[card.uid] = true; });
            privateHand = privateHand.filter((card) => uids[card.uid]);
          }
          if (isGuest()) selectedUid = null;
          if (state.lastEvent && state.lastEvent.id > prevEvent) playEventSound(state.lastEvent);
          render();
          if (isGuest() && mine && privateHand.length !== handCountFor(mine)) requestHand(false);
        } finally {
          applyingNet = false;
        }
      },
      netSeat() { return state ? actorSeat() : -1; },
      netOver() { return !!(state && state.over); },
      netResume() { if (state) render(); },
      destroy() {
        destroyed = true;
        if (aiTimer) clearInterval(aiTimer);
        aiTimer = null;
        if (netOff) netOff();
        if (rootRef) rootRef.removeEventListener("click", onClick);
        if (debugRef && window.__bgDebug === debugRef) window.__bgDebug = null;
        rootRef = null;
        apiRef = null;
        state = null;
        privateHand = [];
        selectedUid = null;
      },
    };
  }

  game.create = create;
  BG.register(game);
})();



