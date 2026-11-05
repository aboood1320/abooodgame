/* ==========================================================================
   كودنيمز — فريقان، ٢٥ كلمة، مخبر وتخمين وقاتل
   نسخة قريبة من الأصل: ٩ عملاء للفريق الأول، ٨ للثاني، ٧ محايدون، وقاتل.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const TEAM = {
    red: { name: "الفريق الأحمر", color: "#c77c64", icon: "🔴", other: "blue" },
    blue: { name: "الفريق الأزرق", color: "#5d8e83", icon: "🔵", other: "red" },
  };

  const CATEGORIES = {
    "حيوانات": ["أسد", "نمر", "فيل", "زرافة", "قرد", "حصان", "كلب", "قطة", "أرنب", "دلفين", "نسر", "ثعبان", "دب", "غزال"],
    "طعام": ["خبز", "جبن", "عسل", "تفاح", "موز", "أرز", "شوربة", "قهوة", "شاي", "حلوى", "زيتون", "لحم", "بطيخ", "ليمون"],
    "مدن": ["القاهرة", "باريس", "طوكيو", "لندن", "روما", "دبي", "إسطنبول", "نيويورك", "مدريد", "بكين", "أثينا", "فيينا"],
    "رياضة": ["كرة", "سباحة", "جري", "ملاكمة", "تنس", "شطرنج", "تزلج", "رماية", "مصارعة", "غولف", "تسلق", "جمباز"],
    "مهن": ["طبيب", "مهندس", "طيار", "نجار", "خباز", "مزارع", "شرطي", "معلم", "صياد", "رسام", "طباخ", "حلاق"],
    "طبيعة": ["جبل", "نهر", "بحر", "صحراء", "غابة", "شلال", "جزيرة", "كهف", "بركان", "بحيرة", "وادي"],
    "أدوات": ["مطرقة", "منشار", "مفتاح", "مقص", "ملعقة", "سكين", "مسطرة", "فرشاة", "إبرة", "سلم", "مفك", "دلو"],
    "ملابس": ["قميص", "حذاء", "قبعة", "معطف", "وشاح", "جوارب", "بنطال", "فستان", "قفاز", "نظارة", "حزام", "ربطة"],
    "مواصلات": ["سيارة", "قطار", "طائرة", "سفينة", "دراجة", "حافلة", "صاروخ", "قارب", "شاحنة", "ترام", "مروحية", "تاكسي"],
    "فضاء": ["شمس", "قمر", "نجم", "كوكب", "مذنب", "مجرة", "تلسكوب", "رائد", "مركبة", "مكوك", "نيازك", "قاعدة"],
    "موسيقى": ["عود", "بيانو", "طبل", "ناي", "كمان", "جيتار", "مغني", "أوركسترا", "نغمة", "ميكروفون", "قيثارة", "أغنية"],
    "طقس": ["مطر", "ثلج", "ريح", "سحاب", "برق", "رعد", "قوس", "ضباب", "حرارة", "إعصار", "صقيع", "عاصفة"],
    "جسم": ["يد", "عين", "قلب", "رئة", "قدم", "أذن", "أنف", "شعر", "سن", "ظهر", "كتف", "ركبة"],
    "مدرسة": ["كتاب", "قلم", "دفتر", "سبورة", "حاسبة", "مكتب", "حقيبة", "خريطة", "امتحان", "مكتبة", "جرس", "طالب"],
    "منزل": ["باب", "نافذة", "كرسي", "طاولة", "سرير", "مصباح", "سجادة", "مرآة", "وسادة", "رف", "ستارة", "مقلاة"],
  };

  const ALL_WORDS = [];
  const WORD_CAT = {};
  Object.keys(CATEGORIES).forEach((cat) => {
    CATEGORIES[cat].forEach((word) => {
      if (!WORD_CAT[word]) {
        WORD_CAT[word] = cat;
        ALL_WORDS.push(word);
      }
    });
  });

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makePlayers() {
    const sources = apiRef.players || [];
    const count = U.clamp(sources.length || 2, 2, 8);
    const list = [];
    for (let index = 0; index < count; index++) {
      const source = sources[index];
      list.push({
        index,
        name: source && source.name ? source.name : "اللاعب " + (index + 1),
        type: source && source.type === "cpu" ? "cpu" : "human",
        level: source ? BG.ai.level(source.level) : BG.ai.level(1),
        isCpu: source ? BG.ai.isCpu(source) : index > 0,
        team: index % 2 === 0 ? "red" : "blue",
      });
    }
    return list;
  }

  function hasHuman(team) {
    return state.players.some((player) => player.team === team && !player.isCpu);
  }

  function teamName(team) { return TEAM[team].name; }

  function setupWords() {
    const picks = U.shuffle(ALL_WORDS.slice()).slice(0, 25);
    const colors = [];
    for (let i = 0; i < 9; i++) colors.push("red");
    for (let i = 0; i < 8; i++) colors.push("blue");
    for (let i = 0; i < 7; i++) colors.push("neutral");
    colors.push("assassin");
    const shuffled = U.shuffle(colors);
    return picks.map((word, index) => ({
      word,
      cat: WORD_CAT[word],
      color: shuffled[index],
      revealed: false,
    }));
  }

  function newState() {
    const players = makePlayers();
    return {
      players,
      words: setupWords(),
      turn: "red",
      start: "red",
      clue: null,
      guessesLeft: 0,
      usedClues: [],
      showKey: false,
      phase: "guess",
      round: 1,
      notice: "الفريق الأحمر يبدأ. يقدّم المخبر تلميحًا، ثم يخمّن الفريق.",
      last: null,
      over: false,
      winner: null,
      reason: null,
    };
  }

  function remaining(team) {
    return state.words.filter((card) => card.color === team && !card.revealed).length;
  }

  function other(team) { return TEAM[team].other; }

  function boardSet() { return new Set(state.words.map((card) => card.word)); }

  function generateClue(team) {
    const own = state.words.filter((card) => card.color === team && !card.revealed);
    if (!own.length) return { text: "—", number: 1, cat: null };
    const board = boardSet();
    const used = new Set(state.usedClues);
    const counts = {};
    own.forEach((card) => { counts[card.cat] = (counts[card.cat] || 0) + 1; });
    const ranked = Object.keys(counts)
      .filter((cat) => cat && !board.has(cat))
      .sort((a, b) => counts[b] - counts[a]);
    const fresh = ranked.filter((cat) => !used.has(cat));
    if (fresh.length) {
      const cat = fresh[0];
      return { text: cat, number: Math.min(4, counts[cat]), cat };
    }
    // تلميح بكلمة واحدة من نفس الفئة، ليست على اللوحة.
    const shuffledOwn = U.shuffle(own.slice());
    for (const card of shuffledOwn) {
      const mates = (CATEGORIES[card.cat] || []).filter((word) => word !== card.word && !board.has(word) && !used.has(word));
      if (mates.length) return { text: U.pick(mates), number: 1, cat: card.cat };
    }
    if (ranked.length) {
      const cat = ranked[0];
      return { text: cat, number: Math.min(4, counts[cat]), cat };
    }
    const card = U.pick(own);
    return { text: "تلميح", number: 1, cat: card.cat };
  }

  function beginTurn(team) {
    if (!state || state.over) return;
    state.turn = team;
    state.phase = "guess";
    const clue = generateClue(team);
    state.clue = clue;
    state.guessesLeft = Math.max(1, clue.number + 1);
    if (!state.usedClues.includes(clue.text)) state.usedClues.push(clue.text);
    state.notice = teamName(team) + " — التلميح: «" + clue.text + "» لعدد " + ar(clue.number) + ". التخمينات المتاحة: " + ar(state.guessesLeft) + ".";
    apiRef.setStatus("دور " + teamName(team));
    render();
    if (!hasHuman(team)) scheduleAi();
  }

  function scheduleAi() {
    if (!state || state.over) return;
    const team = state.turn;
    if (hasHuman(team)) return;
    clearTimeout(timer);
    timer = setTimeout(aiStep, AI.delay(team === "red" ? 1 : 1, 0.85));
  }

  function aiStep() {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return;
    const team = state.turn;
    if (hasHuman(team)) return;
    const index = pickAiGuess(team);
    if (index == null) return;
    reveal(index, true);
    if (!state || state.over) return;
    if (state.turn === team && state.phase === "guess") {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(1, 0.9));
    }
  }

  function pickAiGuess(team) {
    if (!state || !state.clue) return null;
    const clue = state.clue;
    let pool = state.words
      .map((card, index) => ({ card, index }))
      .filter((entry) => !entry.card.revealed && entry.card.cat === clue.cat);
    if (!pool.length) {
      pool = state.words
        .map((card, index) => ({ card, index }))
        .filter((entry) => !entry.card.revealed);
    }
    if (!pool.length) return null;
    const weights = pool.map((entry) => {
      if (entry.card.color === team) return 62;
      if (entry.card.color === "neutral") return 23;
      if (entry.card.color === "assassin") return 3;
      return 12;
    });
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i].index;
    }
    return pool[pool.length - 1].index;
  }

  function reveal(index, byAi) {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return false;
    const card = state.words[index];
    if (!card || card.revealed) return false;
    if (!byAi && !hasHuman(state.turn)) return false;
    card.revealed = true;
    const team = state.turn;
    const label = card.color === "red" ? "أحمر" : card.color === "blue" ? "أزرق" : card.color === "assassin" ? "القاتل" : "محايد";
    apiRef.log(
      "<strong>" + esc(teamName(team)) + "</strong> كشف «" + esc(card.word) + "»: " + label + ".",
      card.color === team ? "good" : card.color === "assassin" ? "danger" : "warn"
    );
    state.last = { text: teamName(team) + " كشف " + card.word + " (" + label + ")." };
    if (card.color === "assassin") {
      finish(other(team), "assassin");
      return true;
    }
    if (card.color === team) {
      state.guessesLeft -= 1;
      if (remaining(team) === 0) {
        finish(team, "agents");
        return true;
      }
      if (state.guessesLeft <= 0) {
        state.notice = "أكمل الفريق تخميناته. ينتقل الدور.";
        render();
        endTurn();
        return true;
      }
      state.notice = "إصابة صحيحة! بقي " + ar(state.guessesLeft) + " تخمينًا. يمكنك المتابعة أو إنهاء الدور.";
      render();
      return true;
    }
    state.notice = "تخمين خاطئ (" + label + "). ينتقل الدور إلى " + teamName(other(team)) + ".";
    render();
    endTurn();
    return true;
  }

  function endTurn() {
    if (!state || state.over) return false;
    state.clue = null;
    state.round += 1;
    beginTurn(other(state.turn));
    return true;
  }

  function finish(winner, reason) {
    if (!state) return;
    state.over = true;
    state.phase = "over";
    state.winner = winner;
    state.reason = reason;
    clearTimeout(timer);
    const reasonText = reason === "assassin" ? "كشف الفريق القاتل فخسر فورًا." : "كشف الفريق كل عملائه.";
    const ranking = [
      { team: "red", name: TEAM.red.name, remaining: remaining("red") },
      { team: "blue", name: TEAM.blue.name, remaining: remaining("blue") },
    ].sort((a, b) => (a.team === winner ? -1 : b.team === winner ? 1 : b.remaining - a.remaining))
      .map((row) => ({ name: row.name, value: winner === row.team ? 1 : 0, detail: "عملاء متبقون: " + ar(row.remaining) }));
    state.notice = "انتهت اللعبة. فاز " + teamName(winner) + ". " + reasonText;
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت كودنيمز",
      text: reason === "assassin" ? "كشف أحد الفريقين القاتل، فخسر اللعبة فورًا." : "أول فريق يكشف كل عملائه يفوز.",
      winner: teamName(winner),
      icon: "🕵️",
      standings: ranking,
    });
  }

  /* ------------------------------ العرض ------------------------------ */

  function teamMembers(team) {
    return state.players.filter((player) => player.team === team).map((player) => player.name).join("، ");
  }

  function cardHtml(card, index) {
    const classes = ["cn-card"];
    if (state.showKey && !card.revealed) classes.push("is-key-" + (card.color === "assassin" ? "assassin" : card.color));
    if (card.revealed) classes.push("is-revealed", "is-" + card.color);
    const disabled = card.revealed || state.over || !hasHuman(state.turn);
    const tag = card.revealed
      ? card.color === "red" ? "أحمر" : card.color === "blue" ? "أزرق" : card.color === "assassin" ? "قاتل" : "محايد"
      : "";
    return '<button type="button" class="' + classes.join(" ") + '" data-cn-word="' + index + '" ' +
      (disabled ? "disabled" : "") + ' aria-label="' + esc(card.word) + (tag ? " — " + tag : "") + '">' +
      '<span class="cn-word">' + esc(card.word) + "</span>" +
      (tag ? '<span class="cn-tag">' + tag + "</span>" : "") +
      "</button>";
  }

  function cluePanel() {
    const clue = state.clue;
    const team = state.turn;
    const canEnd = !state.over && hasHuman(team);
    if (!clue) return "";
    return '<div class="xg-panel cn-clue" style="--team:' + TEAM[team].color + '">' +
      '<div class="xg-spread"><span class="cn-turn">' + TEAM[team].icon + " دور " + teamName(team) + "</span>" +
      '<span class="xg-chip is-live">تخمينات متاحة: ' + ar(state.guessesLeft) + "</span></div>" +
      '<div class="cn-clue-box"><span class="cn-clue-label">التلميح</span>' +
      '<strong class="cn-clue-word">' + esc(clue.text) + "</strong>" +
      '<span class="cn-clue-number">' + ar(clue.number) + "</span></div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (canEnd ? '<div class="xg-row"><button type="button" class="xg-btn" data-cn-end>أنهِ الدور</button></div>' : "") +
      "</div>";
  }

  function render() {
    if (!rootRef || !state) return;
    rootRef.innerHTML =
      '<div class="xg cn">' +
      XG.bar("كودنيمز", "تلميح واحد · ٢٥ كلمة · احذر القاتل", [
        XG.chip("الدور", teamName(state.turn), "is-live"),
        XG.chip("🔴 متبقٍ", ar(remaining("red")), remaining("red") <= 3 ? "is-danger" : "is-good"),
        XG.chip("🔵 متبقٍ", ar(remaining("blue"))),
        XG.chip("الجولة", ar(state.round)),
      ].join("")) +
      '<div class="cn-layout"><div class="cn-main">' +
      cluePanel() +
      '<div class="xg-panel"><div class="xg-spread"><h3>لوحة الكلمات</h3>' +
      '<button type="button" class="xg-btn cn-key-btn" data-cn-key>' + (state.showKey ? "أخفِ المفتاح" : "مفتاح المخبر") + "</button></div>" +
      '<div class="cn-board">' + state.words.map(cardHtml).join("") + "</div>" +
      (state.showKey ? '<div class="cn-legend"><span class="is-red">🔴 عملاء الأحمر</span><span class="is-blue">🔵 عملاء الأزرق</span><span class="is-neutral">⚪ محايد</span><span class="is-assassin">💀 القاتل</span></div>' : "") +
      '<p class="xg-note">اضغط كلمة لقلبها. الكلمة الصحيحة من لون فريقك تتيح لك التخمين مجددًا، وأي كلمة أخرى تنهي دورك.</p></div>' +
      '<p class="cn-last">' + esc(state.last ? state.last.text : state.notice) + "</p>" +
      "</div>" +
      '<aside class="cn-side">' +
      '<div class="xg-panel"><h3>الفريقان</h3>' +
      '<div class="cn-team is-red"><span>🔴</span><div><strong>' + teamName("red") + "</strong><small>" + esc(teamMembers("red") || "—") + "</small></div><b>" + ar(remaining("red")) + "</b></div>" +
      '<div class="cn-team is-blue"><span>🔵</span><div><strong>' + teamName("blue") + "</strong><small>" + esc(teamMembers("blue") || "—") + "</small></div><b>" + ar(remaining("blue")) + "</b></div></div>" +
      '<div class="xg-panel"><h3>كيف تلعب</h3><p class="xg-note">المخبر يعطي كلمة تلميح واحدة ورقمًا. يخمّن الفريق كلمات بعدد الرقم + ١. الكلمة الصحيحة تسمح بالمتابعة، والخطأ يسلّم الدور.</p>' +
      '<p class="xg-note">القاتل 💀 يُنهي اللعبة فورًا بخسارة الفريق الذي كشفه. أول فريق يكشف كل عملائه يفوز.</p></div>' +
      '<div class="xg-panel"><h3>معلومة</h3><p class="xg-note">الكلمات مأخوذة من فئات عربية متنوعة، والتلميح لا يكون كلمة ظاهرة على اللوحة. المفتاح للمساعدة فقط وقد يكشف الأسرار.</p></div>' +
      "</aside></div></div>";

    if (!state.over && !hasHuman(state.turn) && state.phase === "guess" && !timer) scheduleAi();
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (event.target.closest("[data-cn-key]")) {
      state.showKey = !state.showKey;
      render();
      return;
    }
    if (event.target.closest("[data-cn-end]")) {
      endTurn();
      return;
    }
    const card = event.target.closest("[data-cn-word]");
    if (card) reveal(Number(card.dataset.cnWord), false);
  }

  const game = {
    id: "codenames",
    name: "كودنيمز",
    en: "CODENAMES",
    icon: "🕵️",
    accent: "#c77c64",
    cardClass: "card-codenames",
    tagline: "تلميح واحد يقود فريقك بين ٢٥ كلمة، وكاتم أسرار ينتظر من يكشفه.",
    players: "2–8",
    duration: "15–30 دقيقة",
    complexity: "خفيفة",
    minPlayers: 2,
    maxPlayers: 8,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: ٢٥ كلمة، ٩/٨ عملاء، ٧ محايدين، وقاتل واحد.",
      defaults: {},
      fields: [],
      summary() { return "٢٥ كلمة · فريقان · قاتل"; },
    },

    rules: {
      goal: "اكشف كل عملاء فريقك قبل الفريق الآخر، ولا تلمس القاتل.",
      facts: [["اللاعبون", "٢–٨"], ["الكلمات", "٢٥"], ["العملاء", "٩ ضد ٨"], ["الخطر", "قاتل واحد"]],
      components: ["٢٥ بطاقة كلمة.", "مفتاح ألوان للمخبر.", "٩ عملاء أحمر، ٨ عملاء أزرق، ٧ محايدون، وقاتل واحد."],
      setup: [
        "تُرتب ٢٥ كلمة في شبكة ٥×٥.",
        "يُسند للفريق الأول ٩ عملاء، وللفريق الثاني ٨، مع ٧ محايدين وقاتل.",
        "يرى المخبر الألوان، بينما يخمّن الفريق دون رؤيتها.",
      ],
      steps: [
        "<strong>التلميح:</strong> يعطي المخبر كلمة واحدة ورقمًا يشير إلى عدد الكلمات المرتبطة.",
        "<strong>التخمين:</strong> يختار الفريق كلمة. إن كانت من لون فريقه، يستمر حتى ينهي تخميناته أو يخطئ.",
        "<strong>الخطأ:</strong> كلمة محايدة أو من لون الخصم تنهي الدور فورًا.",
        "<strong>القاتل:</strong> من يكشفه يخسر اللعبة مباشرة.",
        "<strong>النهاية:</strong> أول فريق يكشف كل عملائه يفوز.",
      ],
      winning: "الفريق الذي يكشف كل عملائه أولًا، أو الفريق الذي لا يكشف القاتل.",
      notes: [
        "الرقم + ١ هو الحد الأقصى للتخمينات في الدور.",
        "يمكن للفريق إنهاء دوره في أي وقت قبل استهلاك التخمينات.",
        "كلمة التلميح لا يجوز أن تكون واحدة من كلمات اللوحة.",
        "في هذه النسخة يقدّم المخبر الآلي التلميح، ويخمّن اللاعب البشري مع فريقه.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      timer = null;
      state = newState();
      apiRef.log("بدأت كودنيمز. ٢٥ كلمة، والفريق الأحمر يبدأ بـ٩ عملاء.", "accent");
      apiRef.setStatus("بداية كودنيمز");
      beginTurn("red");

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          reveal,
          endTurn,
          beginTurn,
          generateClue,
          pickAiGuess,
          aiStep,
          remaining,
          setTurn(team) {
            if (!state || (team !== "red" && team !== "blue")) return;
            state.clue = null;
            beginTurn(team);
          },
          forceColor(index, color) {
            if (!state || !state.words[index]) return false;
            state.words[index].color = color;
            render();
            return true;
          },
          revealAll(team) {
            if (!state) return;
            state.words.forEach((card) => { if (card.color === team) card.revealed = true; });
            render();
          },
          showKey(value) {
            if (!state) return;
            state.showKey = value !== false;
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
          render();
        },
        netSeat() {
          if (!state) return -1;
          const team = state.turn;
          const humans = state.players.filter((player) => player.team === team && !player.isCpu);
          if (humans.length) return humans[0].index;
          const cpus = state.players.filter((player) => player.team === team);
          return cpus.length ? cpus[0].index : -1;
        },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); if (!hasHuman(state.turn)) scheduleAi(); } },
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
