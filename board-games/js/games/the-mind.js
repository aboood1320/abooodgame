/* ==========================================================================
   ذا مايند — لعبة تعاونية على شكل فريق واحد
   كل اللاعبين ضد اللعبة: يرتبون البطاقات تصاعدياً دون كلام.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const U = BG.util;
  const FX = BG.fx;

  const DIFFICULTIES = {
    easy: { name: "هادئ", label: "سهل", noise: 1900, patience: 15000, autoStar: 0, hint: "الزميل يلعب بتوقيت أهدأ ويخطئ أكثر قليلاً." },
    medium: { name: "متوازن", label: "متوسط", noise: 900, patience: 19000, autoStar: 22000, hint: "الزميل يتزامن جيداً ويساعد عند التعثر." },
    hard: { name: "متناغم", label: "صعب", noise: 280, patience: 24000, autoStar: 15000, hint: "الزميل دقيق التوقيت ويقترح النجمة بسرعة." },
  };

  const LEVEL_REWARDS = { 2: "star", 3: "life", 5: "star", 6: "life", 8: "life", 9: "star" };

  const NUMBER_WORDS = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];

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

  function maxLevelsFor(count) {
    if (count <= 2) return 12;
    if (count === 3) return 10;
    return 8;
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

  function range(from, to) {
    const out = [];
    for (let i = from; i <= to; i += 1) out.push(i);
    return out;
  }

  function rewardIcon(type) {
    return type === "life" ? "♥" : type === "star" ? "★" : "";
  }

  function cardTone(value) {
    return Math.round(212 + (Number(value) || 1) * 0.72);
  }

  function cardWord(count) {
    if (count === 1) return "بطاقة واحدة";
    if (count === 2) return "بطاقتان";
    if (count >= 3 && count <= 10) return ar(count) + " بطاقات";
    return ar(count) + " بطاقة";
  }

  function playerHand(player) {
    return Array.isArray(player && player.hand) ? player.hand : [];
  }

  function handLength(player) {
    if (!player) return 0;
    if (Array.isArray(player.hand) && player.hand.length) return player.hand.length;
    return Number(player.handCount) || 0;
  }

  function sortedHand(player) {
    if (!player) return;
    if (Array.isArray(player.hand)) player.hand.sort((a, b) => a.value - b.value);
    player.handCount = handLength(player);
  }

  function makeCard(value, uid) {
    return { uid: uid || "m" + value, value: Number(value) };
  }

  const game = {
    id: "the-mind",
    name: "ذا مايند",
    en: "The Mind",
    icon: "🧠",
    tagline: "فريق واحد… ترتيب صامت",
    blurb: "لعبة تخاطر جماعية: العبوا البطاقات تصاعدياً دون أن تتحدثوا. كل لاعب يرى أوراقه فقط، والفوز مشترك.",
    players: "٢–٤ لاعبين",
    time: "١٥–٢٠ دقيقة",
    duration: "15–20 دقيقة",
    complexity: "خفيفة",
    age: "+٨",
    coop: true,
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      defaults: { difficulty: "medium" },
      fields: [
        {
          key: "difficulty",
          type: "choice",
          label: "مستوى زملاء الفريق",
          choices: [
            { value: "easy", label: "هادئ — سهل" },
            { value: "medium", label: "متوازن — متوسط" },
            { value: "hard", label: "متناغم — صعب" },
          ],
          hint: "كل اللاعبين في فريق واحد. الزملاء يلعبون معك لا ضدك، والمستوى يحدد دقة توقيتهم.",
        },
      ],
      summary(values) {
        const info = DIFFICULTIES[(values && values.difficulty) || "medium"] || DIFFICULTIES.medium;
        return "تزامن الفريق: " + info.label;
      },
    },

    rulesFor(options) {
      const difficulty = (options && options.difficulty) || "medium";
      const info = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
      return {
        goal: "الفريق كله فريق واحد. الهدف المشترك: إكمال جميع مستويات اللعبة قبل نفاد القلوب. في كل مستوى يضع الجميع بطاقاتهم في كومة واحدة بالترتيب التصاعدي (من الأصغر إلى الأكبر) دون كلام أو إشارات. الفوز للجميع، والخسارة على الجميع.",
        facts: [
          ["عدد اللاعبين", "٢ إلى ٤ لاعبين — فريق واحد"],
          ["المكوّنات", "١٠٠ بطاقة أرقام (١–١٠٠) + ١٢ بطاقة مستوى + ٥ قلوب + ٣ نجوم"],
          ["المستويات", "٢ لاعبين: ١–١٢ · ٣ لاعبين: ١–١٠ · ٤ لاعبين: ١–٨"],
          ["الهدف", "إكمال كل المستويات معاً دون فقدان آخر قلب"],
        ],
        components: [
          "بطاقات الأرقام من ١ إلى ١٠٠، كل رقم مرة واحدة فقط.",
          "بطاقات المستويات ١–١٢. لكل عدد من اللاعبين مستويات محددة كما في الجدول.",
          "قلوب الفريق: يبدأ الفريق بعدد قلوب يساوي عدد اللاعبين، والحد الأقصى ٥.",
          "نجوم الفريق: يبدأ الفريق بنجمة واحدة، والحد الأقصى ٣ نجوم.",
        ],
        setup: [
          "اختر مستوى الزملاء (سهل/متوسط/صعب). كلهم في فريقك.",
          "٢ لاعبين: قلبان ونجمة واحدة ومستويات ١–١٢. ٣ لاعبين: ٣ قلوب ونجمة ومستويات ١–١٠. ٤ لاعبين: ٤ قلوب ونجمة ومستويات ١–٨.",
          "خلط بطاقات الأرقام الـ١٠٠. في المستوى الأول وزّع بطاقة واحدة لكل لاعب، ثم بطاقتين في المستوى الثاني، وهكذا: عدد البطاقات لكل لاعب يساوي رقم المستوى.",
          "كل لاعب يرى بطاقاته فقط. لا تُظهرها لأحد ولا تصفها ولا تصدر إشارات.",
          "قبل بدء المستوى، يضع الجميع يدهم على الطاولة للتركيز. في النسخة الرقمية تظهر إشارة «استعدوا» ثم يبدأ المستوى.",
        ],
        steps: [
          "<strong>اللعب:</strong> لا يوجد دور. أي لاعب يظن أن بطاقته هي الأصغر المتبقية يضغط زر «العب أدنى بطاقة». في كل مرة يلعب فيها لاعب بطاقته الأصغر فقط.",
          "<strong>الترتيب:</strong> يجب أن تكون كل بطاقة أكبر من التي قبلها. إذا لعب لاعب بطاقة وهناك لاعب آخر يحمل رقماً أصغر منها، يخسر الفريق قلباً فوراً، وتُكشف وتُطرح كل البطاقات الأصغر من البطاقة التي لُعبت.",
          "<strong>القلوب:</strong> عند فقدان آخر قلب تنتهي اللعبة بخسارة الفريق. لا يُعاد المستوى من بدايته؛ يكمل الفريق من حيث توقف.",
          "<strong>النجمة:</strong> يمكن للفريق استخدام نجمة في أي وقت بموافقة الجميع. يطرح كل لاعب بطاقته الأصغر جانباً، ثم يكمل الفريق. النجمة تساعد عندما يتجمد الفريق أو يخاف من الخطأ.",
          "<strong>إكمال المستوى:</strong> عند لعب كل البطاقات بالترتيب التصاعدي يكتمل المستوى. تُطبَّق مكافأة المستوى إن وُجدت، ثم يُخلط الجميع ويُوزَّع مستوى جديد ببطاقة إضافية لكل لاعب.",
          "<strong>المكافآت:</strong> المستويات ٢، ٣، ٥، ٦، ٨، ٩ تمنح مكافأة مطبوعة على بطاقة المستوى: إما قلب إضافي أو نجمة إضافية. الحد الأقصى ٥ قلوب و٣ نجوم.",
          "<strong>الفوز:</strong> إكمال جميع المستويات المطلوبة يمنح الفريق فوزاً مشتركاً. إذا نفدت القلوب قبل ذلك فالفريق يخسر معاً.",
        ],
        winning: "الفريق يفوز عند إكمال آخر مستوى مطلوب بنجاح. لا يوجد فائز فردي: كل القلوب والنجوم والمستويات ملك للفريق. إذا نفدت القلوب، يخسر الجميع معاً.",
        notes: [
          "لا تتحدثوا ولا تشيروا إلى أرقام بطاقاتكم. في هذه النسخة يظهر فقط عدد بطاقات زملائك، وليس قيمها.",
          "زر «العب أدنى بطاقة» يلعب دائماً أدنى بطاقة في يدك. لا يمكنك اختيار بطاقة أعلى قبل الأصغر.",
          "التوقيت هو مهارة اللعبة: الأرقام الصغيرة تُلعب مبكراً، والكبيرة تنتظر. لا تحسب الثواني؛ اشعر بإيقاع الفريق.",
          "زميلك الآلي ليس خصماً. هو يحاول حماية القلوب وعدم إفساد الترتيب، ومستوى الذكاء يحدد دقة توقيته ومبادرته لاستخدام النجمة.",
          "عدد بطاقات المستوى = رقم المستوى لكل لاعب. لذا المستويات المتقدمة أطول وأصعب.",
          "يمكنكم استخدام الدردشة السريعة للتشجيع فقط، وليس لكشف الأرقام.",
          "مستوى الزملاء المختار: " + info.name + ". " + info.hint,
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
  let flowTimer = null;
  let renderFrame = null;
  let lastFocusTick = 0;
  let privateHand = [];
  let privateLevel = 0;
  let handRequestTimer = null;
  let handRequestAt = 0;
  let lastActionAt = 0;
  let pendingFocusRender = false;
  let applyingNet = false;
  let shakeUntil = 0;
  let flashCard = null;
  let lastReward = null;
  let localViewer = 0;
  let curtainSeat = -1;

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
    return 0;
  }

  function humanSeats() {
    return state ? state.players.filter((player) => !player.isCpu).map((player) => player.index) : [];
  }

  function viewSeat() {
    if (isNet()) return mySeat();
    const humans = humanSeats();
    if (!humans.length) return 0;
    if (humans.indexOf(localViewer) < 0) localViewer = humans[0];
    return localViewer;
  }

  function myPlayer() {
    return state && state.players[viewSeat()];
  }

  function netSync() {
    if (!isNet() || applyingNet) return;
    if (isHostOrLocal() && apiRef.net.sendState) {
      try { apiRef.net.sendState(); } catch (err) { /* الشبكة اختيارية */ }
    }
  }

  function note(html, kind) {
    if (!state) return;
    state.log.push({ html: html, kind: kind || "" });
    if (state.log.length > 14) state.log.shift();
    if (apiRef && typeof apiRef.log === "function") {
      try { apiRef.log(html.replace(/<[^>]*>/g, ""), kind || ""); } catch (err) { /* ignore */ }
    }
  }

  function sound(name) {
    try {
      if (FX && typeof FX.sound === "function") FX.sound(name);
    } catch (err) { /* الصوت اختياري */ }
  }

  function toast(text) {
    try { if (apiRef && apiRef.toast) apiRef.toast(text, "warn"); } catch (err) { /* ignore */ }
  }

  function statusText() {
    if (!state) return "";
    if (state.over) return state.win ? "فاز الفريق" : "خسر الفريق";
    if (state.phase === "focus") return "استعدوا للمستوى " + ar(state.level);
    if (state.phase === "levelComplete") return "اكتمل المستوى " + ar(state.level);
    return "المستوى " + ar(state.level) + " · " + ar(handLength(myPlayer()) - 0) + " بطاقات في يدك";
  }

  /* ------------------------------ الحالة ------------------------------ */

  function createState(seats, difficulty) {
    const players = (seats || []).slice(0, 4).map((seat, index) => ({
      index: index,
      name: (seat && seat.name) || "لاعب " + (index + 1),
      isCpu: !!(seat && (seat.isCpu || seat.type === "cpu")),
      hand: [],
      handCount: 0,
      aiJitter: 0,
      lastPlayAt: 0,
    }));
    const count = Math.max(2, Math.min(4, players.length));
    while (players.length < count) {
      players.push({
        index: players.length,
        name: "لاعب " + (players.length + 1),
        isCpu: true,
        hand: [],
        handCount: 0,
        aiJitter: 0,
        lastPlayAt: 0,
      });
    }
    return {
      players: players,
      playerCount: players.length,
      difficulty: DIFFICULTIES[difficulty] ? difficulty : "medium",
      maxLevels: maxLevelsFor(players.length),
      level: 1,
      reachedLevel: 1,
      lives: players.length,
      stars: 1,
      deck: [],
      pile: [],
      discard: [],
      lastPlayed: 0,
      lastPlayer: -1,
      phase: "focus",
      focusAt: 0,
      levelStartedAt: 0,
      lastPlayAt: 0,
      over: false,
      win: false,
      result: null,
      mistakeCount: 0,
      perfectLevels: 0,
      log: [],
      notice: "",
      levelCards: [],
      levelStartedLevel: 1,
      usedStars: 0,
      privateMasked: false,
    };
  }

  function resetPlayersForLevel() {
    const level = state.level;
    const total = state.players.length * level;
    const values = shuffle(range(1, 100)).slice(0, total);
    state.deck = shuffle(range(1, 100)).filter((value) => values.indexOf(value) < 0);
    state.players.forEach((player, index) => {
      const cards = values.slice(index * level, (index + 1) * level).sort((a, b) => a - b);
      player.hand = cards.map((value) => makeCard(value));
      player.handCount = player.hand.length;
      player.aiJitter = (Math.random() * 2 - 1) * difficultyInfo().noise;
      player.lastPlayAt = 0;
    });
    state.pile = [];
    state.discard = [];
    state.lastPlayed = 0;
    state.lastPlayer = -1;
    state.levelCards = [];
    state.phase = "focus";
    state.focusAt = Date.now() + 1900;
    state.levelStartedAt = state.focusAt;
    state.lastPlayAt = state.focusAt;
    state.levelStartedLevel = level;
    if (isGuest()) privateHand = [];
  }

  function startLevel(level) {
    if (!state) return;
    lastReward = null;
    state.level = Math.max(1, Math.min(state.maxLevels, Number(level) || 1));
    state.reachedLevel = Math.max(Number(state.reachedLevel) || 1, state.level);
    resetPlayersForLevel();
    state.notice = "المستوى " + ar(state.level) + ": " + cardWord(state.level) + " لكل لاعب. ركّزوا… ولا تتحدثوا.";
    note("<strong>المستوى " + ar(state.level) + "</strong> — " + cardWord(state.level) + " لكل لاعب. الفريق كله يلعب معاً.", "accent");
    render();
    sendHandsToGuests();
    sound("shuffle");
    scheduleFlow(2000);
    lastFocusTick = 0;
  }

  function scheduleFlow(delay) {
    if (!isHostOrLocal()) return;
    if (flowTimer) clearTimeout(flowTimer);
    flowTimer = setTimeout(() => {
      flowTimer = null;
      if (!state || state.over) return;
      if (state.phase === "focus" && Date.now() >= state.focusAt - 80) {
        state.phase = "play";
        state.levelStartedAt = Date.now();
        state.lastPlayAt = Date.now() - 320;
        state.notice = "ابدأوا الآن: الأصغر أولاً. استمعوا لإحساس الفريق.";
        note("بدأ المستوى " + ar(state.level) + ". لا كلام — فقط تزامن الفريق.", "good");
        render();
        sound("yourturn");
        sendHandsToGuests();
      } else if (state.phase === "focus") {
        scheduleFlow(Math.max(120, state.focusAt - Date.now()));
      }
    }, delay);
  }

  /* ------------------------------ محرك اللعب ------------------------------ */

  function playLowest(seat, opts) {
    if (!state || state.over || state.phase !== "play") return false;
    if (!isHostOrLocal()) return false;
    const now = Date.now();
    if (now - lastActionAt < 180) return false;
    const player = state.players[seat];
    if (!player || !player.hand || !player.hand.length) return false;
    lastActionAt = now;
    sortedHand(player);
    const card = player.hand.shift();
    const value = card.value;
    player.handCount = player.hand.length;
    player.lastPlayAt = Date.now();

    const lowerHolders = [];
    state.players.forEach((other) => {
      if (!other.hand || !other.hand.length) return;
      if (other.hand.some((item) => item.value < value)) lowerHolders.push(other);
    });

    state.pile.push({ value: value, seat: seat, uid: card.uid, mistake: lowerHolders.length > 0 });
    if (state.pile.length > 60) state.pile = state.pile.slice(-60);
    state.lastPlayed = value;
    state.lastPlayer = seat;
    state.lastPlayAt = Date.now();
    flashCard = { value: value, seat: seat, at: Date.now() };
    const tone = cardTone(value);

    if (lowerHolders.length) {
      state.lives -= 1;
      state.mistakeCount += 1;
      const discarded = [];
      state.players.forEach((other) => {
        if (!other.hand || !other.hand.length) return;
        other.hand = other.hand.filter((item) => {
          if (item.value < value) {
            discarded.push({ value: item.value, seat: other.index });
            return false;
          }
          return true;
        });
        other.handCount = other.hand.length;
      });
      state.discard.push.apply(state.discard, discarded);
      state.notice = "خطأ! " + player.name + " لعب " + ar(value) + " وهناك أرقام أصغر. خسر الفريق قلباً.";
      note("<strong>خطأ تزامن!</strong> " + esc(player.name) + " لعب <strong>" + ar(value) + "</strong>، وكانت هناك بطاقات أصغر. الفريق خسر قلباً وطُرحت " + ar(discarded.length) + " بطاقة.", "warn");
      shakeUntil = Date.now() + 620;
      sound("error");
      if (state.lives <= 0) {
        state.lives = 0;
        finishGame(false, "error");
        return true;
      }
    } else {
      state.notice = player.name + " لعب " + ar(value) + ". الترتيب سليم.";
      note("<strong>" + esc(player.name) + "</strong> لعب <strong>" + ar(value) + "</strong> — الترتيب سليم حتى الآن.", "good");
      sound("card");
    }

    if (flashCard) flashCard.tone = tone;
    render();
    sendHandsToGuests();

    if (!state.over) checkLevelComplete();
    return true;
  }

  function useStar(seat, opts) {
    if (!state || state.over || state.phase !== "play" || state.stars <= 0) return false;
    if (!isHostOrLocal()) return false;
    const now = Date.now();
    if (now - lastActionAt < 180) return false;
    lastActionAt = now;
    state.stars -= 1;
    state.usedStars += 1;
    const discarded = [];
    state.players.forEach((player) => {
      if (!player.hand || !player.hand.length) return;
      sortedHand(player);
      const card = player.hand.shift();
      player.handCount = player.hand.length;
      discarded.push({ value: card.value, seat: player.index });
    });
    state.discard.push.apply(state.discard, discarded);
    state.notice = "استخدم الفريق نجمة: كل لاعب أخرج أصغر بطاقة في يده.";
    note("<strong>نجمة الفريق!</strong> أخرج كل لاعب أصغر بطاقة: " + discarded.map((item) => ar(item.value)).join(" · ") + ".", "accent");
    state.lastPlayAt = Date.now();
    sound("reveal");
    render();
    sendHandsToGuests();
    if (!state.over) checkLevelComplete();
    return true;
  }

  function checkLevelComplete() {
    if (!state || state.over || state.phase !== "play") return;
    if (state.players.some((player) => handLength(player) > 0)) return;
    state.phase = "levelComplete";
    const reward = LEVEL_REWARDS[state.level];
    lastReward = null;
    if (reward === "life" && state.lives < 5) {
      state.lives += 1;
      lastReward = { type: "life", text: "قلب إضافي" };
    } else if (reward === "star" && state.stars < 3) {
      state.stars += 1;
      lastReward = { type: "star", text: "نجمة إضافية" };
    } else if (reward) {
      lastReward = { type: reward, text: "المكافأة مكتملة مسبقاً" };
    }
    state.perfectLevels += 1;
    state.notice = "اكتمل المستوى " + ar(state.level) + "! " + (lastReward ? "مكافأة الفريق: " + lastReward.text + "." : "لا مكافأة في هذا المستوى.");
    note("<strong>اكتمل المستوى " + ar(state.level) + "!</strong> " + (lastReward ? "حصل الفريق على " + lastReward.text + "." : "الفريق مستمر بقوته."), "good");
    sound("win");
    render();
    sendHandsToGuests();
    if (flowTimer) clearTimeout(flowTimer);
    flowTimer = setTimeout(advanceAfterLevel, 1700);
  }

  function advanceAfterLevel() {
    flowTimer = null;
    if (!state || state.over || state.phase !== "levelComplete") return;
    if (state.level >= state.maxLevels) {
      finishGame(true, "levels");
      return;
    }
    startLevel(state.level + 1);
  }

  function resumeFlow() {
    if (!state || state.over || !isHostOrLocal()) return;
    if (state.phase === "focus") {
      scheduleFlow(Math.max(120, (Number(state.focusAt) || Date.now()) - Date.now()));
    } else if (state.phase === "levelComplete" && !flowTimer) {
      flowTimer = setTimeout(advanceAfterLevel, 1200);
    }
  }

  function finishGame(win, reason) {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    state.win = !!win;
    state.result = { win: !!win, reason: reason || "" };
    if (aiTimer) clearInterval(aiTimer);
    aiTimer = null;
    if (flowTimer) clearTimeout(flowTimer);
    flowTimer = null;
    if (state.lives <= 0) state.lives = 0;
    render();
    sendHandsToGuests();
    sound(win ? "win" : "lose");
    if (apiRef) {
      const team = state.players.map((player) => player.name).join(" · ");
      apiRef.gameOver({
        title: win ? "تناغم الفريق!" : "خسر الفريق معاً",
        text: win
          ? "أكمل الفريق جميع المستويات " + ar(state.maxLevels) + " بقلوب متبقية: " + ar(state.lives) + ". كل لاعب كان جزءاً من النجاح."
          : (reason === "error"
            ? "نفدت قلوب الفريق في المستوى " + ar(state.level) + ". لم يكن هناك فائز فردي — الجميع خسر معاً."
            : "توقف الفريق في المستوى " + ar(state.level) + ". المحاولة القادمة تبدأ من جديد بروح الفريق نفسها."),
        winner: win ? "الفريق الكامل" : "اللعبة",
        icon: win ? "🧠" : "💫",
        tone: win ? "win" : "lose",
        standings: state.players.map((player) => ({
          name: player.name + (player.isCpu ? " · زميل آلي" : " · إنسان"),
          value: "أعلى مستوى وصل إليه الفريق: " + ar(state.win ? state.maxLevels : (state.reachedLevel || state.level)) + " · أخطاء: " + ar(state.mistakeCount),
        })),
      });
    }
    note(win ? "<strong>فوز الفريق!</strong> اكتملت كل المستويات." : "<strong>نهاية الجولة.</strong> خسر الفريق معاً، والمحاولة القادمة للفريق.", win ? "good" : "warn");
  }

  /* ------------------------------ الشبكة ------------------------------ */

  function guestSend(payload) {
    if (!isGuest() || !BG.net) return false;
    try { return BG.net.send(payload); } catch (err) { return false; }
  }

  function requestHand(force) {
    if (!isGuest()) return;
    const now = Date.now();
    if (!force && now - handRequestAt < 1400) return;
    handRequestAt = now;
    guestSend({ t: "mind-hand-request" });
  }

  function seatForPeer(from) {
    if (!apiRef || !apiRef.net || !Array.isArray(apiRef.net.seats)) return -1;
    return apiRef.net.seats.findIndex((seat) => seat && seat.peerId && seat.peerId === from);
  }

  function sendHandTo(seatIndex) {
    if (!isNet() || !isHostOrLocal() || !state) return;
    const seat = apiRef.net.seats[seatIndex];
    const player = state.players[seatIndex];
    if (!seat || !player || seat.type !== "human") return;
    if (seatIndex === apiRef.net.seat) return;
    if (!seat.peerId || !BG.net) return;
    try {
      BG.net.sendTo(seat.peerId, {
        t: "mind-hand",
        seat: seatIndex,
        level: state.level,
        cards: playerHand(player).map((card) => card.value),
      });
    } catch (err) { /* ignore */ }
  }

  function sendHandsToGuests() {
    if (!isNet() || !isHostOrLocal() || !state) return;
    state.players.forEach((player, index) => sendHandTo(index));
  }

  function applyPrivateHand(data) {
    if (!data || !Array.isArray(data.cards)) return;
    privateLevel = Number(data.level) || privateLevel;
    privateHand = data.cards.map((value) => Number(value)).filter((value) => value >= 1 && value <= 100).sort((a, b) => a - b);
    if (!state) return;
    const seat = Number.isInteger(data.seat) ? data.seat : mySeat();
    const player = state.players[seat];
    if (!player) return;
    player.hand = privateHand.map((value) => makeCard(value, "p" + seat + "-" + value));
    player.handCount = player.hand.length;
    render();
  }

  function onNetMessage(event) {
    const data = event && event.data;
    if (!data || typeof data.t !== "string" || data.t.indexOf("mind-") !== 0) return;
    if (data.t === "mind-hand") {
      applyPrivateHand(data);
      return;
    }
    if (!isHostOrLocal() || !state) return;
    const seat = seatForPeer(event.from);
    if (seat < 0) return;
    if (data.t === "mind-hand-request") {
      sendHandTo(seat);
      return;
    }
    if (data.t === "mind-play") {
      if (state.phase !== "play" || state.over) return;
      playLowest(seat);
      return;
    }
    if (data.t === "mind-star") {
      if (state.phase !== "play" || state.over || state.stars <= 0) return;
      useStar(seat);
    }
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function unseenLowerRisk(player, value) {
    const own = new Set(playerHand(player).map((card) => card.value));
    const publicValues = new Set();
    state.pile.forEach((card) => publicValues.add(card.value));
    state.discard.forEach((card) => publicValues.add(card.value));
    let lower = 0;
    let unseen = 0;
    for (let v = 1; v < value; v += 1) {
      if (!own.has(v) && !publicValues.has(v)) lower += 1;
    }
    for (let v = 1; v <= 100; v += 1) {
      if (!own.has(v) && !publicValues.has(v)) unseen += 1;
    }
    const otherCards = state.players.reduce((sum, other) => sum + (other.index === player.index ? 0 : handLength(other)), 0);
    if (!unseen || !otherCards) return 0;
    let safe = 1;
    for (let i = 0; i < otherCards && i < unseen; i += 1) {
      safe *= (unseen - lower - i) / (unseen - i);
      if (safe <= 0) return 1;
    }
    return 1 - Math.max(0, safe);
  }

  function aiStep() {
    if (!state || state.over || !isHostOrLocal()) return;
    const now = Date.now();
    if (state.phase === "focus") {
      if (now >= state.focusAt) {
        state.phase = "play";
        state.levelStartedAt = now;
        state.lastPlayAt = now - 320;
        state.notice = "ابدأوا الآن: الأصغر أولاً.";
        note("بدأ المستوى " + ar(state.level) + ". لا كلام — فقط تزامن الفريق.", "good");
        render();
        sound("yourturn");
        sendHandsToGuests();
      }
      return;
    }
    if (state.phase !== "play") return;
    if (now - state.lastPlayAt < 620) return;
    const info = difficultyInfo();
    const candidates = [];
    state.players.forEach((player) => {
      if (!player.isCpu || !handLength(player)) return;
      sortedHand(player);
      const value = player.hand[0].value;
      const scheduled = state.levelStartedAt + 520 + value * 112 + player.aiJitter;
      if (now < scheduled) return;
      if (now - (player.lastPlayAt || 0) < 420) return;
      const risk = unseenLowerRisk(player, value);
      const stalled = now - state.lastPlayAt > info.patience;
      if (risk > 0.62 && !stalled) return;
      candidates.push({ player: player, value: value, risk: risk });
    });
    if (candidates.length) {
      candidates.sort((a, b) => a.value - b.value);
      playLowest(candidates[0].player.index);
      return;
    }
    if (info.autoStar && state.players.some((player) => player.isCpu) && state.stars > 0 && now - state.lastPlayAt > info.autoStar) {
      const holders = state.players.filter((player) => handLength(player) > 0);
      if (holders.length >= 2) {
        note("زميلك الآلي يقترح نجمة لكسر الجمود. الفريق يوافق ويستخدمها.", "accent");
        useStar(-1, { auto: true });
      }
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function render() {
    if (!rootRef || !state) return;
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(() => {
      renderFrame = null;
      paint();
    });
  }

  function memberChip(player) {
    return BG.coop.memberChip(
      {
        name: player.name,
        isCpu: player.isCpu,
        index: player.index,
        color: player.isCpu ? "#a78bfa" : "#67e8f9",
      },
      state.lastPlayer,
      handLength(player) + " بطاقة"
    );
  }

  function renderTeamHeader() {
    return BG.coop.teamHeader({
      icon: "🧠",
      title: "ذا مايند",
      en: "THE MIND · ONE TEAM, ONE RHYTHM",
      goal: "أكملوا كل المستويات معاً",
      players: state.players,
      current: state.lastPlayer,
      meta(player) {
        return handLength(player) + " بطاقة";
      },
      chips:
        BG.coop.chip("المستوى", ar(state.level) + " / " + ar(state.maxLevels), "is-gold") +
        BG.coop.chip("القلوب", "♥ ".repeat(Math.max(0, state.lives)) || "—", state.lives <= 1 ? "is-danger" : "is-warn") +
        BG.coop.chip("النجوم", "★".repeat(Math.max(0, state.stars)) || "—", "is-gold"),
    });
  }

  function renderObjective() {
    const done = state.phase === "levelComplete" ? state.level : state.level - 1;
    const progress = Math.round((Math.max(0, done) / state.maxLevels) * 100);
    const inHand = state.players.reduce((sum, player) => sum + handLength(player), 0);
    return '<div class="coop-objective">' +
      BG.coop.objectiveCard("المستويات المكتملة", ar(Math.max(0, done)) + " / " + ar(state.maxLevels), "هدف الفريق المشترك", "is-gold", progress) +
      BG.coop.objectiveCard("القلوب", ar(state.lives) + " / ٥", state.lives <= 1 ? "قلب واحد يفصل الفريق عن الخسارة" : "خسارة القلب جماعية", state.lives <= 1 ? "is-danger" : "") +
      BG.coop.objectiveCard("النجوم", ar(state.stars) + " / ٣", "قرار الفريق بالإجماع", "is-gold") +
      BG.coop.objectiveCard("بطاقات بانتظار التزامن", ar(inHand), "كل بطاقة تعود للفريق", "") +
      BG.coop.objectiveCard("أخطاء التزامن", ar(state.mistakeCount), "نتعلم معاً", state.mistakeCount ? "is-warn" : "") +
      "</div>";
  }

  function renderLevelLadder() {
    const items = [];
    for (let level = 1; level <= state.maxLevels; level += 1) {
      const reward = LEVEL_REWARDS[level];
      const done = state.phase === "levelComplete" && level <= state.level;
      const cls = level === state.level && !state.over && !done ? "is-now" : level < state.level || done ? "is-done" : "";
      items.push('<div class="mind-step ' + cls + '" title="' + (reward ? "مكافأة: " + rewardIcon(reward) : "") + '">' +
        '<span>' + ar(level) + "</span>" +
        (reward ? '<small class="mind-step-reward">' + rewardIcon(reward) + "</small>" : "") +
        "</div>");
    }
    return '<section class="coop-panel"><div class="coop-panel-head"><h3>مسار الفريق</h3><small>مستويات مشتركة</small></div>' +
      '<div class="mind-ladder">' + items.join("") + "</div>" +
      '<p class="coop-note">المكافآت على المستويات ٢، ٣، ٥، ٦، ٨، ٩. الحد الأقصى ٥ قلوب و٣ نجوم.</p>' +
      "</section>";
  }

  function renderStage() {
    const visiblePile = state.pile.slice(-9);
    const pileCards = visiblePile.map((card) => {
      return '<div class="mind-played' + (card.mistake ? " is-mistake" : "") + '">' +
        ar(card.value) +
        '<small>' + esc(state.players[card.seat] ? state.players[card.seat].name : "") + "</small>" +
        "</div>";
    }).join("");
    const steps = [];
    for (let level = 1; level <= state.maxLevels; level += 1) {
      const done = state.phase === "levelComplete" && level <= state.level;
      const cls = level === state.level && !state.over && !done ? "is-now" : level < state.level || done ? "is-done" : "";
      steps.push('<span class="mind-step ' + cls + '">' + ar(level) +
        (LEVEL_REWARDS[level] ? '<small class="mind-step-reward">' + rewardIcon(LEVEL_REWARDS[level]) + "</small>" : "") +
        "</span>");
    }
    const hearts = [];
    for (let i = 0; i < 5; i += 1) {
      hearts.push('<span class="mind-life' + (i >= state.lives ? " is-lost" : "") + '" aria-hidden="true">♥</span>');
    }
    const starring = state.stars;
    const focusLeft = state.phase === "focus" ? Math.max(0, Math.ceil((state.focusAt - Date.now()) / 1000)) : 0;
    const notice = state.notice || (state.phase === "play" ? "لا أحد يعرف أوراق الآخرين. ثقوا بإحساس الفريق." : "");
    return '<div class="mind-stage' + (Date.now() < shakeUntil ? " is-shaking" : "") + '">' +
      '<div class="mind-stars" aria-hidden="true"></div>' +
      '<div class="mind-table">' +
        '<div class="mind-level"><strong>المستوى ' + ar(state.level) + '</strong><span>' + cardWord(state.level) + " لكل لاعب · الهدف المشترك: الترتيب التصاعدي</span></div>" +
        '<div class="mind-track">' + steps.join("") + "</div>" +
        '<div class="mind-fates">' +
          '<span class="mind-fate-hearts" aria-label="قلوب الفريق">' + hearts.join("") + "</span>" +
          '<span class="mind-shuriken' + (starring <= 0 ? " is-used" : "") + '">★ نجوم الفريق: <b>' + ar(starring) + "</b> / ٣</span>" +
        "</div>" +
        '<div class="mind-sequence">' +
          (pileCards || '<div class="mind-empty"><span>✦</span><p>أول بطاقة تنتظر إحساس الفريق</p></div>') +
          (state.pile.length > 9 ? '<span class="mind-pile-more">+' + ar(state.pile.length - 9) + "</span>" : "") +
        "</div>" +
        (state.discard.length
          ? '<div class="mind-discard" aria-label="البطاقات المطروحة"><span>المهملات</span>' +
            state.discard.slice(-10).map((card) => '<b>' + ar(card.value) + "</b>").join("") +
            (state.discard.length > 10 ? '<small>+' + ar(state.discard.length - 10) + "</small>" : "") +
            "</div>"
          : "") +
        '<p class="mind-note">' + esc(notice) + "</p>" +
        (state.phase === "focus" ? '<div class="mind-focus"><span class="mind-focus-ring" aria-hidden="true"></span><strong>استعدوا للمستوى ' + ar(state.level) + "</strong><p>يد الجميع على الطاولة… تنفّسوا معاً</p><b>" + (focusLeft ? ar(focusLeft) : "ابدأوا") + "</b></div>" : "") +
        (state.phase === "levelComplete" ? '<div class="mind-banner is-good">✦ تم المستوى ' + ar(state.level) + " بنجاح" + (lastReward ? " · مكافأة الفريق: " + esc(lastReward.text) : "") + "</div>" : "") +
        (state.phase === "over" ? '<div class="mind-banner ' + (state.win ? "is-good" : "is-bad") + '">' + (state.win ? "فاز الفريق معاً" : "خسر الفريق معاً — لا فائز فردي") + "</div>" : "") +
        '<div class="mind-actions">' +
          '<button type="button" class="coop-btn primary mind-play-btn" data-mind-action="play"' + (canPlayCard() ? "" : " disabled") + ">" +
            (state.phase === "focus" ? "انتظر إشارة البدء…" : state.phase === "levelComplete" ? "اكتمل المستوى" : state.phase === "over" ? "انتهت الجولة" : lowestCardLabel()) +
          "</button>" +
          '<button type="button" class="coop-btn gold mind-star-btn" data-mind-action="star"' + (canUseStar() ? "" : " disabled") + ">★ نجمة الفريق · " + ar(state.stars) + "</button>" +
          '<button type="button" class="coop-btn ghost small" data-mind-action="rules">القواعد</button>' +
        "</div>" +
        '<p class="coop-note mind-hint">تُلعب دائماً أدنى بطاقة في يدك، ولا يمكنك اختيار بطاقة أعلى. لا تتحدثوا عن الأرقام — التزامن هو كل اللعبة.</p>' +
        renderHands() +
      "</div>" +
      (curtainSeat >= 0 && !isNet()
        ? '<div class="mind-curtain" role="dialog" aria-modal="true">' +
          '<div class="mind-curtain-inner">' +
            '<span class="mind-curtain-icon" aria-hidden="true">🤫</span>' +
            '<strong>مرّر الجهاز إلى ' + esc(state.players[curtainSeat] ? state.players[curtainSeat].name : "اللاعب") + "</strong>" +
            '<p>لا تنظر إلى بطاقات الآخرين. اضغط الزر عندما يكون الجهاز في يد صاحبه.</p>' +
            '<button type="button" class="coop-btn primary" data-mind-view-confirm="1">أنا ' + esc(state.players[curtainSeat] ? state.players[curtainSeat].name : "اللاعب") + " — اكشف يدي</button>" +
            '<button type="button" class="coop-btn ghost small" data-mind-view-cancel="1">إلغاء</button>' +
          "</div>" +
        "</div>"
        : "") +
      "</div>";
  }

  function canPlayCard() {
    if (!state || state.over || state.phase !== "play") return false;
    const me = myPlayer();
    return !!me && !isCpuSeat(viewSeat()) && handLength(me) > 0;
  }

  function canUseStar() {
    return !!(state && !state.over && state.phase === "play" && state.stars > 0);
  }

  function lowestCardLabel() {
    const me = myPlayer();
    const cards = playerHand(me);
    if (!cards.length) return "لا بطاقات في يدك";
    const lowest = cards.slice().sort((a, b) => a.value - b.value)[0];
    return "العب أدنى بطاقة · " + ar(lowest.value);
  }

  function isCpuSeat(seat) {
    return !!(state && state.players[seat] && state.players[seat].isCpu);
  }

  function renderHands() {
    if (!state || !state.players.length) return "";
    const seat = viewSeat();
    return '<div class="mind-hands">' +
      state.players.map((player) => {
        const mine = player.index === seat && !player.isCpu;
        const cards = playerHand(player).slice().sort((a, b) => a.value - b.value);
        let cardNodes = "";
        if (mine) {
          cardNodes = cards.map((card, index) => {
            const clickable = index === 0 && canPlayCard();
            return '<button type="button" class="mind-card is-you' + (clickable ? " is-lowest" : "") + '" data-mind-card="' + esc(card.uid) + '"' +
              (clickable ? "" : " disabled") + ' aria-label="بطاقتك ' + ar(card.value) + '">' + ar(card.value) + "</button>";
          }).join("");
        } else {
          const backs = [];
          for (let i = 0; i < Math.min(6, handLength(player)); i += 1) backs.push('<span class="mind-card is-back"></span>');
          if (handLength(player) > 6) backs.push('<span class="mind-card-more">+' + ar(handLength(player) - 6) + "</span>");
          cardNodes = backs.join("");
        }
        return '<div class="mind-hand' + (mine ? " is-you" : "") + (player.isCpu ? " is-cpu" : "") + '">' +
          '<div class="mind-hand-name"><span aria-hidden="true">' + (player.isCpu ? "🤖" : "🧑") + "</span>" + esc(player.name) + (mine ? " · أنت" : "") + " · " + ar(handLength(player)) + " بطاقة</div>" +
          '<div class="mind-hand-cards">' + (cardNodes || '<span class="mind-hand-empty">بلا بطاقات</span>') + "</div>" +
          "</div>";
      }).join("") +
      "</div>";
  }

  function renderTeamPanel() {
    const humans = humanSeats();
    const localMulti = !isNet() && humans.length > 1;
    const viewer = viewSeat();
    const switcher = localMulti
      ? '<div class="mind-viewer-switch"><span>من يمسك الجهاز الآن؟</span><div>' +
        humans.map((seat) => {
          const player = state.players[seat];
          return '<button type="button" class="mind-view-btn' + (seat === viewer ? " is-active" : "") + '" data-mind-view="' + seat + '">' +
            esc(player ? player.name : "لاعب") + "</button>";
        }).join("") +
        "</div><small>كشف يد لاعب يخفي الأيدي الأخرى. مرّر الجهاز ثم اكشف.</small></div>"
      : "";
    return '<section class="coop-panel"><div class="coop-panel-head"><h3>الفريق كله</h3><small>لا خصوم هنا</small></div>' +
      '<div class="mind-team-list">' +
      state.players.map((player) => {
        const cards = handLength(player);
        const isViewer = player.index === viewer;
        return '<div class="mind-team-row' + (isViewer ? " is-you" : "") + (player.isCpu ? " is-cpu" : "") + '">' +
          '<span class="mind-team-avatar" aria-hidden="true">' + (player.isCpu ? "🤖" : "🧑") + "</span>" +
          '<div class="mind-team-meta"><strong>' + esc(player.name) + (isViewer ? (localMulti ? " · يرى الآن" : " · أنت") : "") + "</strong>" +
          "<small>" + (player.isCpu ? "زميل آلي · " : "لاعب · ") + ar(cards) + " بطاقة " + (state.lastPlayer === player.index ? "· آخر من لعب" : "· بانتظار التزامن") + "</small></div>" +
          '<span class="mind-cards-back" aria-hidden="true">' + "▮".repeat(Math.min(5, cards)) + "</span>" +
          "</div>";
      }).join("") +
      "</div>" + switcher +
      '<p class="coop-note">أوراق الزملاء مخفية عنك — هذه قاعدة اللعبة وليست منافسة. نجاحهم نجاحك.</p>' +
      "</section>";
  }

  function paint() {
    if (!rootRef || !state || destroyed) return;
    if (apiRef && typeof apiRef.setStatus === "function") apiRef.setStatus(statusText(), "live");
    const team = renderTeamHeader();
    const objective = renderObjective();
    const stage = renderStage();
    const teamPanel = renderTeamPanel();
    const ladder = renderLevelLadder();
    rootRef.innerHTML = '<div class="coop-shell mind-shell">' +
      '<div class="coop-main">' + team + objective + stage + "</div>" +
      '<aside class="coop-side">' + teamPanel + ladder + "</aside>" +
      "</div>";
    if (!applyingNet) netSync();
  }

  function localActPlay() {
    if (!state || state.over) return;
    if (state.phase === "focus") { toast("انتظر إشارة البدء — ركّزوا معاً."); return; }
    if (state.phase !== "play") return;
    if (isGuest()) {
      const me = myPlayer();
      if (!me || !handLength(me)) return;
      guestSend({ t: "mind-play" });
      sound("click");
      return;
    }
    if (!isHostOrLocal()) return;
    const seat = viewSeat();
    playLowest(seat);
  }

  function localActStar() {
    if (!state || state.over || state.phase !== "play" || state.stars <= 0) return;
    if (isGuest()) {
      guestSend({ t: "mind-star" });
      sound("click");
      return;
    }
    if (!isHostOrLocal()) return;
    useStar(viewSeat(), { auto: false });
  }

  function showRules() {
    try {
      if (apiRef && typeof apiRef.rules === "function") apiRef.rules();
      else BG.openRules(game, state ? { difficulty: state.difficulty } : {});
    } catch (err) { /* ignore */ }
  }

  function onClick(event) {
    if (!state) return;
    const view = event.target.closest ? event.target.closest("[data-mind-view]") : null;
    if (view) {
      const seat = Number(view.getAttribute("data-mind-view"));
      if (Number.isInteger(seat) && seat >= 0 && seat < state.players.length && seat !== viewSeat()) {
        curtainSeat = seat;
        render();
      }
      return;
    }
    if (event.target.closest && event.target.closest("[data-mind-view-confirm]")) {
      if (curtainSeat >= 0) {
        localViewer = curtainSeat;
        curtainSeat = -1;
        sound("click");
        render();
      }
      return;
    }
    if (event.target.closest && event.target.closest("[data-mind-view-cancel]")) {
      curtainSeat = -1;
      render();
      return;
    }
    const action = event.target.closest ? event.target.closest("[data-mind-action]") : null;
    if (action) {
      const kind = action.getAttribute("data-mind-action");
      if (kind === "play") localActPlay();
      else if (kind === "star") localActStar();
      else if (kind === "rules") showRules();
      return;
    }
    const card = event.target.closest ? event.target.closest("[data-mind-card]") : null;
    if (card && !card.disabled) {
      localActPlay();
      return;
    }
    if (event.target.closest && event.target.closest("[data-mind-help]")) showRules();
  }

  /* ------------------------------ التشغيل ------------------------------ */

  function bindNet() {
    if (!BG.net) return function () {};
    const off = BG.net.on("message", onNetMessage);
    return function () { try { off(); } catch (err) { /* ignore */ } };
  }

  function publicSnapshot() {
    if (!state) return null;
    const copy = JSON.parse(JSON.stringify(state));
    copy.players.forEach((player, index) => {
      player.handCount = state.players[index].hand ? state.players[index].hand.length : Number(player.handCount) || 0;
      player.hand = [];
    });
    copy.deck = [];
    copy.privateMasked = true;
    delete copy.fullState;
    return copy;
  }

  function create(root, api) {
    destroyed = false;
    rootRef = root;
    apiRef = api;
    privateHand = [];
    privateLevel = 0;
    handRequestAt = 0;
    lastReward = null;
    flashCard = null;
    shakeUntil = 0;
    curtainSeat = -1;
    const seats = (api && api.players ? api.players : []).slice(0, 4);
    const difficulty = (api && api.options && api.options.difficulty) || "medium";
    state = createState(seats, difficulty);
    localViewer = Math.max(0, state.players.findIndex((player) => !player.isCpu));
    state.level = 1;
    resetPlayersForLevel();
    state.notice = "مرحباً بالفريق. المستوى ١: بطاقة واحدة لكل لاعب. استعدوا…";
    note("بدأت رحلة <strong>ذا مايند</strong> — فريق واحد ضد اللعبة. لا كلام، فقط تزامن.", "accent");
    rootRef.addEventListener("click", onClick);
    const netOff = bindNet();
    render();
    sendHandsToGuests();
    if (isGuest()) {
      requestHand(true);
      if (handRequestTimer) clearInterval(handRequestTimer);
      handRequestTimer = setInterval(() => {
        if (destroyed || !isGuest() || !state) return;
        const me = myPlayer();
        if (state.phase === "play" && me && handLength(me) && privateLevel !== state.level) requestHand(true);
      }, 2500);
    }
    if (aiTimer) clearInterval(aiTimer);
    aiTimer = setInterval(aiStep, 620);
    scheduleFlow(2000);

    let debugRef = null;
    try {
      if (new URLSearchParams(window.location.search).has("bgdebug")) {
        debugRef = {
          get state() { return state; },
          get api() { return apiRef; },
          play: playLowest,
          playLowest,
          useStar,
          startLevel,
          finish: finishGame,
          snapshot() { return JSON.parse(JSON.stringify(state)); },
          setLives(value) { state.lives = Math.max(0, Number(value) || 0); render(); },
          setStars(value) { state.stars = Math.max(0, Math.min(3, Number(value) || 0)); render(); },
          setPhase(phase) { state.phase = phase; render(); },
          setLevel(value) { state.level = Math.max(1, Math.min(state.maxLevels, Number(value) || 1)); resetPlayersForLevel(); render(); },
          forcePlay() { if (state.phase !== "play") { state.phase = "play"; state.levelStartedAt = Date.now() - 12000; } playLowest(viewSeat()); },
          clearHands() { state.players.forEach((p) => { p.hand = []; p.handCount = 0; }); render(); },
          forceComplete() {
            state.players.forEach((p) => { p.hand = []; p.handCount = 0; });
            if (state.phase === "focus") state.phase = "play";
            checkLevelComplete();
            render();
          },
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
        if (flowTimer) clearTimeout(flowTimer);
        flowTimer = null;
        applyingNet = true;
        try {
          const seat = mySeat();
          const saved = privateHand.slice();
          const incoming = BG.netCodec.decode(snapshot);
          const full = !!(incoming && incoming.fullState);
          state = incoming;
          if (state) delete state.fullState;
          if (!state.log) state.log = [];
          if (!Array.isArray(state.players)) state.players = [];
          state.players.forEach((player, index) => {
            if (full) {
              player.hand = (Array.isArray(player.hand) ? player.hand : [])
                .map((card) => (card && typeof card === "object" ? card : makeCard(card)));
              player.handCount = player.hand.length;
              return;
            }
            const count = Number.isFinite(player.handCount) ? player.handCount : (player.hand ? player.hand.length : 0);
            player.handCount = count;
            player.hand = index === seat && saved.length ? saved.map((value) => makeCard(value, "p" + index + "-" + value)) : [];
            if (player.hand.length) player.handCount = player.hand.length;
          });
          if (full) {
            const me = state.players[seat];
            privateHand = me && Array.isArray(me.hand) ? me.hand.map((card) => card.value) : [];
            privateLevel = state.level;
          }
          render();
          if (isGuest()) {
            const me = state.players[seat];
            if (state.phase === "play" && me && handLength(me) && privateLevel !== state.level) requestHand(true);
          }
          resumeFlow();
        } finally {
          applyingNet = false;
        }
      },
      netSeat() { return -1; },
      netOver() { return !!(state && state.over); },
      netResume() { if (state) { render(); resumeFlow(); } },
      destroy() {
        destroyed = true;
        if (aiTimer) clearInterval(aiTimer);
        if (flowTimer) clearTimeout(flowTimer);
        if (handRequestTimer) clearInterval(handRequestTimer);
        if (renderFrame) cancelAnimationFrame(renderFrame);
        aiTimer = flowTimer = handRequestTimer = renderFrame = null;
        if (netOff) netOff();
        if (rootRef) rootRef.removeEventListener("click", onClick);
        if (debugRef && window.__bgDebug === debugRef) window.__bgDebug = null;
        rootRef = null;
        apiRef = null;
        state = null;
      },
    };
  }

  game.create = create;
  BG.register(game);
})();

