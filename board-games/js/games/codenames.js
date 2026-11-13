/* ==========================================================================
   كودنيمز — فريقان، ٢٥ كلمة، مخبر وتخمين وقاتل
   ٩ عملاء للفريق الذي يبدأ (يُختار عشوائيًا)، ٨ للآخر، ٧ محايدون، وقاتل.

   v2:
   - الكمبيوتر لم يعد يغشّ: يخمّن من التلميح نفسه (لا من ألوان المفتاح).
   - خيار «مخبر بشري»: أول لاعب في كل فريق يكتب التلميح والرقم بنفسه،
     والباقون (أو الكمبيوتر) يخمّنون. مع تحقّق من صحة التلميح.
   - مفتاح المخبر لا يظهر إلا للمخبر (أو في وضع التدريب).
   - تلميحات الكمبيوتر أذكى: تتجنب فئات فيها القاتل أو عملاء الخصم.
   - سجل التلميحات، نقاط التخمين، خريطة المفتاح، وقلب الكلمة بحركة.
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

  const OPT_DEFAULTS = { humanClues: false, training: false };

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
  let draft = { text: "", number: 1 };
  let formError = "";
  let keyHeld = false;

  /* ------------------------------ أدوات ------------------------------ */

  /* توحيد الكتابة العربية للمقارنة: إزالة التشكيل والتطويل وتوحيد الألفات والتاء المربوطة */
  function normalize(text) {
    return String(text || "")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ؤ]/g, "و")
      .replace(/[ئ]/g, "ي")
      .trim()
      .toLowerCase();
  }

  function bigrams(text) {
    const set = new Set();
    for (let i = 0; i < text.length - 1; i++) set.add(text.slice(i, i + 2));
    return set;
  }

  /* درجة ارتباط التلميح بكلمة (لتخمين الكمبيوتر — لا يستخدم ألوان المفتاح أبدًا) */
  function assoc(clueText, card) {
    const clue = normalize(clueText);
    const word = normalize(card.word);
    if (!clue) return 0.05;
    if (clue === normalize(card.cat)) return 3;
    const clueCat = WORD_CAT[clueText] || Object.keys(WORD_CAT).find((w) => normalize(w) === clue);
    if (clueCat && (clueCat === card.cat || WORD_CAT[clueCat] === card.cat)) return 2.2;
    if (CATEGORIES[clueText] && CATEGORIES[clueText].includes(card.word)) return 3;
    if (clue.length >= 3 && word.length >= 3 && (word.includes(clue) || clue.includes(word))) return 1.7;
    const a = bigrams(clue);
    const b = bigrams(word);
    if (!a.size || !b.size) return 0.12;
    let inter = 0;
    a.forEach((g) => { if (b.has(g)) inter += 1; });
    const jaccard = inter / (a.size + b.size - inter);
    return 0.12 + jaccard * 1.4;
  }

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

  function teamName(team) { return TEAM[team].name; }
  function other(team) { return TEAM[team].other; }
  function teamPlayers(team) { return state.players.filter((p) => p.team === team); }
  function spymaster(team) { return teamPlayers(team)[0] || null; }
  /* المخبر بشري فعلًا (خيار «مخبر بشري» مفعّل ومقعده ليس كمبيوترًا) */
  function spyIsHuman(team) {
    const spy = spymaster(team);
    return !!(state.opts.humanClues && spy && !spy.isCpu);
  }
  function humanGuessers(team) {
    const spy = spyIsHuman(team) ? spymaster(team) : null;
    return teamPlayers(team).filter((p) => !p.isCpu && p !== spy);
  }
  function hasHumanGuesser(team) { return humanGuessers(team).length > 0; }
  function isOnline() { return !!(apiRef && apiRef.net && apiRef.net.enabled); }
  function viewerSeat() { return isOnline() ? apiRef.net.seat : null; }
  function aiLevel(team) {
    const cpu = teamPlayers(team).find((p) => p.isCpu);
    return cpu ? String(cpu.level || "normal") : "normal";
  }

  function canGuess() {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return false;
    if (!isOnline()) return hasHumanGuesser(state.turn);
    return humanGuessers(state.turn).some((p) => p.index === viewerSeat());
  }

  function canGiveClue() {
    if (!state || state.over || state.phase !== "clue") return false;
    if (!spyIsHuman(state.turn)) return false;
    return !isOnline() || spymaster(state.turn).index === viewerSeat();
  }

  /* هل يرى هذا الجهاز مفتاح الألوان؟ */
  function keyVisible() {
    if (state.opts.training) return state.showKey;
    if (!state.opts.humanClues) return false;
    const spies = ["red", "blue"].filter((t) => spyIsHuman(t));
    if (!spies.length) return false;
    if (isOnline()) return spies.some((t) => spymaster(t).index === viewerSeat());
    if (spies.length === 1) return true;
    // مخبران بشريان على جهاز واحد: لا يظهر المفتاح إلا لمن عليه الدور في طور التلميح (أو بالضغط المطوّل)
    return keyHeld || (state.phase === "clue" && spyIsHuman(state.turn));
  }

  /* ------------------------------ اللوحة ------------------------------ */

  function setupWords(start) {
    const picks = U.shuffle(ALL_WORDS.slice()).slice(0, 25);
    const colors = [];
    for (let i = 0; i < 9; i++) colors.push(start);
    for (let i = 0; i < 8; i++) colors.push(other(start));
    for (let i = 0; i < 7; i++) colors.push("neutral");
    colors.push("assassin");
    const shuffled = U.shuffle(colors);
    return picks.map((word, index) => ({ word, cat: WORD_CAT[word], color: shuffled[index], revealed: false }));
  }

  function newState() {
    const start = Math.random() < 0.5 ? "red" : "blue";
    const opts = Object.assign({}, OPT_DEFAULTS, (apiRef && apiRef.options) || {});
    return {
      players: makePlayers(),
      opts,
      words: setupWords(start),
      start,
      turn: start,
      clue: null,
      guessesLeft: 0,
      usedClues: [],
      history: [],
      picks: [],
      showKey: false,
      phase: "guess",
      round: 1,
      notice: teamName(start) + " يبدأ ولديه ٩ عملاء.",
      last: null,
      lastRevealed: -1,
      over: false,
      winner: null,
      reason: null,
    };
  }

  function remaining(team) {
    return state.words.filter((card) => card.color === team && !card.revealed).length;
  }

  function boardWords() { return state.words.filter((card) => !card.revealed).map((card) => normalize(card.word)); }

  /* ------------------------------ التلميحات ------------------------------ */

  /** تحقّق من تلميح المخبر البشري. يعيد نص الخطأ أو "" */
  function validateClue(text, number) {
    const raw = String(text || "").trim();
    if (!raw) return "اكتب كلمة التلميح.";
    if (/\s/.test(raw)) return "التلميح كلمة واحدة فقط (بلا مسافات).";
    if (raw.length > 20) return "التلميح طويل جدًا.";
    const n = normalize(raw);
    for (const word of boardWords()) {
      if (n === word) return "لا يجوز أن يكون التلميح كلمة ظاهرة على اللوحة.";
      if (n.length >= 3 && word.length >= 3 && (word.includes(n) || n.includes(word))) {
        return "التلميح يشبه كلمة على اللوحة («" + word + "») — اختر غيرها.";
      }
    }
    if (state.usedClues.some((c) => normalize(c) === n)) return "استُخدم هذا التلميح من قبل.";
    const count = Number(number);
    if (!Number.isInteger(count) || count < 1 || count > 9) return "الرقم بين ١ و٩.";
    return "";
  }

  /* تلميح المخبر الآلي: يختار فئة فيها أكبر عدد من عملائه وأقل خطر (القاتل/عملاء الخصم) */
  function generateClue(team) {
    const own = state.words.filter((card) => card.color === team && !card.revealed);
    if (!own.length) return { text: "—", number: 1, cat: null };
    const board = new Set(state.words.map((card) => card.word));
    const used = new Set(state.usedClues);
    const stats = {};
    state.words.forEach((card) => {
      if (card.revealed || !card.cat) return;
      const s = stats[card.cat] || (stats[card.cat] = { own: 0, enemy: 0, neutral: 0, assassin: 0 });
      if (card.color === team) s.own += 1;
      else if (card.color === other(team)) s.enemy += 1;
      else if (card.color === "assassin") s.assassin += 1;
      else s.neutral += 1;
    });
    const scored = Object.keys(stats)
      .filter((cat) => stats[cat].own > 0 && !board.has(cat))
      .map((cat) => {
        const s = stats[cat];
        return { cat, own: s.own, value: s.own - 0.9 * s.enemy - 0.35 * s.neutral - 5 * s.assassin + Math.random() * 0.2 };
      })
      .sort((a, b) => b.value - a.value);
    const fresh = scored.find((item) => !used.has(item.cat) && item.value > 0);
    if (fresh) return { text: fresh.cat, number: Math.min(4, fresh.own), cat: fresh.cat };
    // كلمة واحدة من فئة آمنة نسبيًا ليست على اللوحة
    const safe = scored.filter((item) => stats[item.cat].assassin === 0);
    for (const item of (safe.length ? safe : scored)) {
      const mates = (CATEGORIES[item.cat] || []).filter((word) => !board.has(word) && !used.has(word));
      if (mates.length) return { text: U.pick(mates), number: 1, cat: item.cat };
    }
    return { text: "تلميح", number: 1, cat: own[0].cat };
  }

  function startGuess(team, clue) {
    state.clue = clue;
    state.phase = "guess";
    state.picks = [];
    state.guessesLeft = Math.max(1, clue.number + 1);
    if (!state.usedClues.includes(clue.text)) state.usedClues.push(clue.text);
    state.history.unshift({ team, clue: clue.text, number: clue.number, picks: [] });
    if (state.history.length > 12) state.history.length = 12;
    state.notice = teamName(team) + " — التلميح: «" + clue.text + "» لعدد " + ar(clue.number) + ". التخمينات المتاحة: " + ar(state.guessesLeft) + ".";
    apiRef.setStatus("دور " + teamName(team));
    apiRef.log("<strong>" + esc(teamName(team)) + "</strong> — تلميح: «" + esc(clue.text) + "» · " + ar(clue.number), "accent");
    render();
    scheduleAi();
  }

  function beginTurn(team) {
    if (!state || state.over) return;
    state.turn = team;
    state.clue = null;
    state.picks = [];
    clearTimeout(timer);
    timer = null;
    if (spyIsHuman(team)) {
      state.phase = "clue";
      const spy = spymaster(team);
      state.notice = teamName(team) + " — بانتظار تلميح المخبر (" + spy.name + ").";
      apiRef.setStatus("تلميح " + teamName(team));
      render();
      return;
    }
    startGuess(team, generateClue(team));
  }

  function giveClue(text, number) {
    if (!state || state.over || state.phase !== "clue") return false;
    const error = validateClue(text, number);
    if (error) {
      formError = error;
      render();
      return false;
    }
    formError = "";
    draft = { text: "", number: 1 };
    startGuess(state.turn, { text: String(text).trim(), number: Number(number), cat: null });
    return true;
  }

  /* ------------------------------ تخمين الكمبيوتر ------------------------------ */

  function aiParams(level) {
    if (level === "expert") return { power: 4, stop: 1.9 };
    if (level === "hard") return { power: 3, stop: 1.5 };
    if (level === "easy") return { power: 1.2, stop: 0.6 };
    return { power: 2, stop: 1.1 };
  }

  /** يختار فهرس كلمة من التلميح فقط (لا يطّلع على الألوان). يعيد { index, score } */
  function pickAiGuess() {
    if (!state || !state.clue) return null;
    const params = aiParams(aiLevel(state.turn));
    const pool = state.words
      .map((card, index) => ({ index, score: assoc(state.clue.text, card) }))
      .filter((entry) => !state.words[entry.index].revealed);
    if (!pool.length) return null;
    const weights = pool.map((entry) => Math.pow(entry.score, params.power));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { chosen = pool[i]; break; }
    }
    return { index: chosen.index, score: chosen.score, best: Math.max.apply(null, pool.map((e) => e.score)), stop: params.stop };
  }

  function scheduleAi() {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return;
    if (hasHumanGuesser(state.turn)) return;
    clearTimeout(timer);
    timer = setTimeout(aiStep, AI.delay(1, 0.85));
  }

  function aiStep() {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return;
    const team = state.turn;
    if (hasHumanGuesser(team)) return;
    const guess = pickAiGuess();
    if (!guess) return;
    /* بعد أول تخمين صحيح يتوقف إن لم يبقَ شيء مرتبط بالتلميح */
    if (state.picks.length > 0 && guess.best < guess.stop) {
      state.notice = teamName(team) + " توقّف عن التخمين.";
      endTurn();
      return;
    }
    reveal(guess.index, true);
    if (!state || state.over) return;
    if (state.turn === team && state.phase === "guess") {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(1, 0.9));
    }
  }

  /* ------------------------------ التخمين والكشف ------------------------------ */

  function colorLabel(color) {
    return color === "red" ? "أحمر" : color === "blue" ? "أزرق" : color === "assassin" ? "القاتل" : "محايد";
  }

  function reveal(index, byAi) {
    if (!state || state.over || state.phase !== "guess" || !state.clue) return false;
    const card = state.words[index];
    if (!card || card.revealed) return false;
    if (!byAi && !canGuess()) return false;
    card.revealed = true;
    state.lastRevealed = index;
    const team = state.turn;
    const label = colorLabel(card.color);
    const entry = state.history[0];
    if (entry) entry.picks.push({ word: card.word, color: card.color });
    state.picks.push(index);
    apiRef.log(
      "<strong>" + esc(teamName(team)) + "</strong> كشف «" + esc(card.word) + "»: " + label + ".",
      card.color === team ? "good" : card.color === "assassin" ? "danger" : "warn"
    );
    state.last = { text: teamName(team) + " كشف " + card.word + " (" + label + ")." };
    if (BG.fx) BG.fx.sound(card.color === team ? "point" : card.color === "assassin" ? "lose" : card.color === "neutral" ? "click" : "error");
    if (card.color === "assassin") {
      finish(other(team), "assassin");
      return true;
    }
    if (remaining("red") === 0) { finish("red", "agents"); return true; }
    if (remaining("blue") === 0) { finish("blue", "agents"); return true; }
    if (card.color === team) {
      state.guessesLeft -= 1;
      if (state.guessesLeft <= 0) {
        state.notice = "أكمل الفريق تخميناته. ينتقل الدور.";
        render();
        setTimeout(() => { if (state && !state.over && state.turn === team) endTurn(); }, 700);
        return true;
      }
      state.notice = "إصابة صحيحة! بقي " + ar(state.guessesLeft) + " تخمينًا. يمكنك المتابعة أو إنهاء الدور.";
      render();
      return true;
    }
    state.notice = "تخمين خاطئ (" + label + "). ينتقل الدور إلى " + teamName(other(team)) + ".";
    render();
    setTimeout(() => { if (state && !state.over && state.turn === team) endTurn(); }, 900);
    return true;
  }

  function endTurn() {
    if (!state || state.over) return false;
    if (state.phase === "guess" && !state.picks.length && !state.clue) return false;
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
    const spy = spymaster(team);
    return teamPlayers(team).map((p) => (state.opts.humanClues && p === spy ? "🕵️ " : "") + p.name).join("، ");
  }

  function cardHtml(card, index) {
    const classes = ["cn-card"];
    const showKey = keyVisible();
    if (showKey && !card.revealed) classes.push("is-key", "is-key-" + card.color);
    if (card.revealed) classes.push("is-revealed", "is-" + card.color);
    if (index === state.lastRevealed && card.revealed) classes.push("is-fresh");
    const can = canGuess() && !card.revealed;
    const tag = card.revealed
      ? (card.color === "red" ? "🔴 أحمر" : card.color === "blue" ? "🔵 أزرق" : card.color === "assassin" ? "💀 قاتل" : "⚪ محايد")
      : "";
    return '<button type="button" class="' + classes.join(" ") + '" data-cn-word="' + index + '" ' + (can ? "" : "disabled") +
      ' aria-label="' + esc(card.word) + (tag ? " — " + tag : "") + '">' +
      '<span class="cn-word">' + esc(card.word) + "</span>" +
      (tag ? '<span class="cn-tag">' + tag + "</span>" : "") +
      (showKey && !card.revealed ? '<i class="cn-keydot"></i>' : "") +
      "</button>";
  }

  function pips() {
    const total = state.clue ? state.clue.number + 1 : 0;
    let html = "";
    for (let i = 0; i < total; i++) html += '<i class="' + (i < total - state.guessesLeft ? "is-used" : "") + '"></i>';
    return '<span class="cn-pips" aria-hidden="true">' + html + "</span>";
  }

  function clueFormHtml() {
    const team = state.turn;
    const spy = spymaster(team);
    const mine = canGiveClue();
    let options = "";
    for (let n = 1; n <= 9; n++) options += '<option value="' + n + '"' + (Number(draft.number) === n ? " selected" : "") + ">" + ar(n) + "</option>";
    return '<div class="xg-panel cn-clue" style="--team:' + TEAM[team].color + '">' +
      '<div class="xg-spread"><span class="cn-turn">' + TEAM[team].icon + " دور " + teamName(team) + " · التلميح</span>" +
      '<span class="xg-chip is-live">🕵️ ' + esc(spy.name) + "</span></div>" +
      (mine
        ? '<div class="cn-form"><input type="text" class="cn-input" data-cn-clue maxlength="20" placeholder="كلمة تلميح واحدة" value="' + esc(draft.text) + '" autocomplete="off" />' +
          '<select class="cn-select" data-cn-num aria-label="الرقم">' + options + "</select>" +
          '<button type="button" class="xg-btn primary" data-cn-give>أعطِ التلميح</button></div>' +
          (formError ? '<p class="cn-error">' + esc(formError) + "</p>" : "") +
          '<p class="xg-note">أنت المخبر: ترى ألوان المفتاح في الخريطة. اكتب كلمة واحدة تربط عملاء فريقك، ولا تذكر كلمة من اللوحة.</p>'
        : '<p class="xg-note">' + esc(state.notice) + "</p>") +
      "</div>";
  }

  function cluePanel() {
    if (state.phase === "clue") return clueFormHtml();
    const clue = state.clue;
    const team = state.turn;
    if (!clue) return "";
    const canEnd = canGuess() && !state.over;
    return '<div class="xg-panel cn-clue" style="--team:' + TEAM[team].color + '">' +
      '<div class="xg-spread"><span class="cn-turn">' + TEAM[team].icon + " دور " + teamName(team) + "</span>" +
      '<span class="xg-chip is-live">تخمينات متاحة: ' + ar(state.guessesLeft) + "</span></div>" +
      '<div class="cn-clue-box"><span class="cn-clue-label">التلميح</span>' +
      '<strong class="cn-clue-word">' + esc(clue.text) + "</strong>" +
      '<span class="cn-clue-number">' + ar(clue.number) + "</span>" + pips() + "</div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (canEnd ? '<div class="xg-row"><button type="button" class="xg-btn" data-cn-end>أنهِ الدور</button></div>' : "") +
      "</div>";
  }

  function keyMapHtml() {
    return '<div class="xg-panel"><div class="xg-spread"><h3>🗝️ خريطة المفتاح</h3></div>' +
      '<div class="cn-keymap">' + state.words.map((card) =>
        '<i class="is-' + card.color + (card.revealed ? " is-done" : "") + '" title="' + esc(card.word) + '"></i>'
      ).join("") + "</div>" +
      '<div class="cn-legend"><span class="is-red">🔴 الأحمر</span><span class="is-blue">🔵 الأزرق</span><span class="is-neutral">⚪ محايد</span><span class="is-assassin">💀 قاتل</span></div></div>';
  }

  function historyHtml() {
    if (!state.history.length) return "";
    return '<div class="xg-panel"><h3>سجل التلميحات</h3><div class="cn-history">' +
      state.history.slice(0, 6).map((row) =>
        '<div class="cn-hrow is-' + row.team + '"><strong>' + TEAM[row.team].icon + " " + esc(row.clue) + " · " + ar(row.number) + "</strong><span>" +
        (row.picks.length ? row.picks.map((p) => '<em class="is-' + p.color + '">' + esc(p.word) + "</em>").join("") : "—") + "</span></div>"
      ).join("") + "</div></div>";
  }

  function teamRow(team) {
    const total = team === state.start ? 9 : 8;
    const left = remaining(team);
    return '<div class="cn-team is-' + team + (state.turn === team && !state.over ? " is-turn" : "") + '"><span>' + TEAM[team].icon + "</span><div><strong>" +
      teamName(team) + "</strong><small>" + esc(teamMembers(team) || "—") + '</small><i class="cn-bar"><b style="width:' + Math.round(((total - left) / total) * 100) + '%"></b></i></div><b>' + ar(left) + "</b></div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const showKeyBtn = state.opts.training || (state.opts.humanClues && !isOnline() && ["red", "blue"].filter((t) => spyIsHuman(t)).length > 1);
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
      (showKeyBtn ? '<button type="button" class="xg-btn cn-key-btn" data-cn-key>' + (state.opts.training ? (state.showKey ? "أخفِ المفتاح" : "مفتاح المخبر (مساعدة)") : (keyHeld ? "إخفاء المفتاح" : "إظهار المفتاح")) + "</button>" : "") + "</div>" +
      '<div class="cn-board">' + state.words.map(cardHtml).join("") + "</div>" +
      '<p class="xg-note">' + (canGuess() ? "اضغط كلمة لكشفها. الكلمة من لون فريقك تتيح لك المتابعة، وأي كلمة أخرى تنهي دورك." : esc(state.last ? state.last.text : state.notice)) + "</p></div>" +
      "</div>" +
      '<aside class="cn-side">' +
      (keyVisible() ? keyMapHtml() : "") +
      '<div class="xg-panel"><h3>الفريقان</h3>' + teamRow("red") + teamRow("blue") + "</div>" +
      historyHtml() +
      '<div class="xg-panel"><h3>كيف تلعب</h3><p class="xg-note">المخبر يعطي كلمة تلميح واحدة ورقمًا. يخمّن الفريق كلمات بعدد الرقم + ١. الكلمة الصحيحة تسمح بالمتابعة، والخطأ يسلّم الدور. القاتل 💀 يُنهي اللعبة بخسارة من كشفه.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state) return;
    const target = event.target;
    if (target.closest("[data-cn-key]")) {
      if (state.opts.training) state.showKey = !state.showKey;
      else keyHeld = !keyHeld;
      render();
      return;
    }
    if (state.over) return;
    if (target.closest("[data-cn-give]")) {
      const input = rootRef.querySelector("[data-cn-clue]");
      const select = rootRef.querySelector("[data-cn-num]");
      if (canGiveClue()) giveClue(input ? input.value : draft.text, select ? select.value : draft.number);
      return;
    }
    if (target.closest("[data-cn-end]")) {
      if (canGuess()) endTurn();
      return;
    }
    const card = target.closest("[data-cn-word]");
    if (card) reveal(Number(card.dataset.cnWord), false);
  }

  function onInput(event) {
    const input = event.target.closest ? event.target.closest("[data-cn-clue]") : null;
    if (input) draft.text = input.value;
    const select = event.target.closest ? event.target.closest("[data-cn-num]") : null;
    if (select) draft.number = Number(select.value);
  }

  function onKeydown(event) {
    if (event.key !== "Enter") return;
    const input = event.target.closest ? event.target.closest("[data-cn-clue]") : null;
    if (!input || !canGiveClue()) return;
    event.preventDefault();
    const select = rootRef.querySelector("[data-cn-num]");
    giveClue(input.value, select ? select.value : draft.number);
  }

  /* ------------------------------ التسجيل ------------------------------ */

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
      hint: "٢٥ كلمة، ٩/٨ عملاء، ٧ محايدين، وقاتل واحد. الفريق الذي يبدأ يُختار عشوائيًا.",
      defaults: Object.assign({}, OPT_DEFAULTS),
      fields: [
        { key: "humanClues", label: "مخبر بشري", type: "toggle", hint: "أول لاعب في كل فريق هو المخبر: يرى المفتاح ويكتب التلميح والرقم بنفسه، ويخمّن باقي الفريق (أو الكمبيوتر). عند إيقافه يقدّم الكمبيوتر التلميحات." },
        { key: "training", label: "مفتاح المخبر للمساعدة", type: "toggle", hint: "يُظهر زرًّا يكشف ألوان كل الكلمات للتدرّب أو للمبتدئين (يُلغي التحدي)." },
      ],
      summary(options) {
        const o = Object.assign({}, OPT_DEFAULTS, options || {});
        const parts = ["٢٥ كلمة · فريقان · قاتل"];
        if (o.humanClues) parts.push("مخبر بشري");
        if (o.training) parts.push("مفتاح مساعد");
        return parts.join(" · ");
      },
    },

    rules: {
      goal: "اكشف كل عملاء فريقك قبل الفريق الآخر، ولا تلمس القاتل.",
      facts: [["اللاعبون", "٢–٨"], ["الكلمات", "٢٥"], ["العملاء", "٩ ضد ٨"], ["الخطر", "قاتل واحد"]],
      components: ["٢٥ بطاقة كلمة.", "مفتاح ألوان للمخبر.", "٩ عملاء للفريق الذي يبدأ، ٨ للآخر، ٧ محايدون، وقاتل واحد."],
      setup: [
        "تُرتب ٢٥ كلمة في شبكة ٥×٥، ويُختار الفريق الأول عشوائيًا (له ٩ عملاء، وللثاني ٨).",
        "اللاعبون يتوزعون بالتناوب على الفريقين الأحمر والأزرق.",
        "المخبر (أول لاعب في كل فريق عند تفعيل «مخبر بشري») يرى الألوان وحده، بينما يخمّن الفريق دون رؤيتها.",
      ],
      steps: [
        "<strong>التلميح:</strong> يعطي المخبر كلمة واحدة ورقمًا يشير إلى عدد الكلمات المرتبطة بها (لا يجوز أن تكون كلمة ظاهرة على اللوحة).",
        "<strong>التخمين:</strong> يختار الفريق كلمات بعدد الرقم + ١. إن كانت من لون فريقه يستمر حتى ينهي تخميناته أو يخطئ.",
        "<strong>الخطأ:</strong> كلمة محايدة أو من لون الخصم تنهي الدور فورًا (والخصم يستفيد من كلمته).",
        "<strong>القاتل:</strong> من يكشفه يخسر اللعبة مباشرة.",
        "<strong>النهاية:</strong> أول فريق يكشف كل عملائه يفوز.",
      ],
      winning: "الفريق الذي يكشف كل عملائه أولًا، أو الفريق الذي لا يكشف القاتل.",
      notes: [
        "يمكن للفريق إنهاء دوره في أي وقت قبل استهلاك التخمينات.",
        "عند إيقاف «مخبر بشري» يقدّم الكمبيوتر التلميحات (اسم فئة غالبًا) ويخمّن اللاعبون.",
        "الكمبيوتر يخمّن من التلميح فقط ولا يطّلع على ألوان المفتاح.",
        "في اللعب أونلاين يرى المخبر المفتاح على جهازه وحده.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      timer = null;
      draft = { text: "", number: 1 };
      formError = "";
      keyHeld = false;
      state = newState();
      apiRef.log("بدأت كودنيمز. ٢٥ كلمة، و" + teamName(state.start) + " يبدأ بـ٩ عملاء.", "accent");
      apiRef.setStatus("بداية كودنيمز");
      beginTurn(state.start);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          reveal,
          endTurn,
          beginTurn,
          giveClue,
          validateClue,
          generateClue,
          pickAiGuess,
          aiStep,
          assoc,
          remaining,
          canGuess,
          canGiveClue,
          keyVisible,
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
      rootRef.addEventListener("input", onInput);
      rootRef.addEventListener("change", onInput);
      rootRef.addEventListener("keydown", onKeydown);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(timer);
          timer = null;
          state = BG.netCodec.decode(data);
          state.opts = Object.assign({}, OPT_DEFAULTS, state.opts || {});
          state.history = Array.isArray(state.history) ? state.history : [];
          state.picks = Array.isArray(state.picks) ? state.picks : [];
          render();
        },
        /* المقعد النشط: المخبر عند طور التلميح، وإلا أول مخمّن بشري (أو المخبر إن كان الكمبيوتر يخمّن) */
        netSeat() {
          if (!state) return -1;
          const team = state.turn;
          if (state.phase === "clue") return spymaster(team).index;
          const guessers = humanGuessers(team);
          if (guessers.length) return guessers[0].index;
          if (spyIsHuman(team)) return spymaster(team).index;
          const cpus = teamPlayers(team);
          return cpus.length ? cpus[0].index : -1;
        },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          render();
          if (state.phase === "guess") scheduleAi();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(timer);
          timer = null;
          if (rootRef) {
            rootRef.removeEventListener("click", onClick);
            rootRef.removeEventListener("input", onInput);
            rootRef.removeEventListener("change", onInput);
            rootRef.removeEventListener("keydown", onKeydown);
          }
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
