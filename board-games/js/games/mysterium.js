/* ==========================================================================
   ميستيريوم — لعبة تعاونية: روح واحدة ترسل الرؤى، وروحانيون يبحثون عن الحقيقة
   الفريق كله ضد الغموض: نفوز معاً أو نخسر معاً.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const U = BG.util;
  const FX = BG.fx;

  const SYMBOLS = {
    moon: { icon: "🌙", name: "القمر" },
    eye: { icon: "👁️", name: "العين" },
    key: { icon: "🗝️", name: "المفتاح" },
    rose: { icon: "🌹", name: "الوردة" },
    clock: { icon: "⏳", name: "الوقت" },
    raven: { icon: "🦅", name: "الغراب" },
    serpent: { icon: "🐍", name: "الأفعى" },
    candle: { icon: "🕯️", name: "الشمعة" },
  };

  const SUSPECTS = [
    { id: "lady", name: "السيدة فيوليت", icon: "👒", symbols: ["rose", "eye"] },
    { id: "doctor", name: "الطبيب بلاك", icon: "🩺", symbols: ["serpent", "clock"] },
    { id: "butler", name: "الخادم إدغار", icon: "🎩", symbols: ["key", "clock"] },
    { id: "sailor", name: "البحّار روبرت", icon: "⚓", symbols: ["raven", "moon"] },
    { id: "priest", name: "القسيس أوري", icon: "📿", symbols: ["candle", "eye"] },
    { id: "gardener", name: "البستاني توم", icon: "🌿", symbols: ["rose", "serpent"] },
  ];

  const LOCATIONS = [
    { id: "manor", name: "القصر القديم", icon: "🏰", symbols: ["key", "candle"] },
    { id: "garden", name: "حديقة الورود", icon: "🌳", symbols: ["rose", "moon"] },
    { id: "cellar", name: "القبو المظلم", icon: "🍷", symbols: ["serpent", "key"] },
    { id: "tower", name: "البرج المهجور", icon: "🗼", symbols: ["raven", "clock"] },
    { id: "chapel", name: "المصلى الصغير", icon: "⛪", symbols: ["candle", "eye"] },
    { id: "dock", name: "رصيف الضباب", icon: "🚢", symbols: ["moon", "raven"] },
  ];

  const WEAPONS = [
    { id: "dagger", name: "الخنجر الفضي", icon: "🗡️", symbols: ["serpent", "rose"] },
    { id: "candlestick", name: "الشمعدان", icon: "🕯️", symbols: ["candle", "clock"] },
    { id: "rope", name: "حبل الحرير", icon: "🪢", symbols: ["serpent", "key"] },
    { id: "poison", name: "قارورة السم", icon: "🧪", symbols: ["serpent", "moon"] },
    { id: "revolver", name: "المسدس العتيق", icon: "🔫", symbols: ["clock", "raven"] },
    { id: "watch", name: "ساعة الجيب", icon: "🕰️", symbols: ["clock", "eye"] },
  ];

  const ALL_KINDS = { suspect: SUSPECTS, location: LOCATIONS, weapon: WEAPONS };
  const KIND_LABEL = { suspect: "المشتبه به", location: "المكان", weapon: "السلاح" };
  const KIND_ICON = { suspect: "🕵️", location: "🏰", weapon: "🗡️" };
  const KIND_ORDER = ["suspect", "location", "weapon"];

  const VISIONS = [
    { id: 1, name: "حلم القمر", icon: "🌙", symbols: ["moon", "eye"], palette: ["#6d4aa8", "#2a1b4d", "#0d0920"] },
    { id: 2, name: "الظل الطويل", icon: "🦅", symbols: ["raven", "clock"], palette: ["#3b4a6b", "#1a2238", "#080c18"] },
    { id: 3, name: "الوردة الذابلة", icon: "🌹", symbols: ["rose", "serpent"], palette: ["#8f3f63", "#3a1730", "#120714"] },
    { id: 4, name: "المفتاح المفقود", icon: "🗝️", symbols: ["key", "clock"], palette: ["#8b6a3f", "#3a2b18", "#140e08"] },
    { id: 5, name: "الشمعة الأخيرة", icon: "🕯️", symbols: ["candle", "eye"], palette: ["#9a6b3c", "#3d2817", "#140d08"] },
    { id: 6, name: "المرآة المكسورة", icon: "🪞", symbols: ["eye", "rose"], palette: ["#7a5a8f", "#2e1f42", "#0e0918"] },
    { id: 7, name: "الغراب الأبيض", icon: "🦅", symbols: ["raven", "moon"], palette: ["#4d5a7a", "#1d2438", "#090b16"] },
    { id: 8, name: "الخطوة الأخيرة", icon: "⏳", symbols: ["clock", "key"], palette: ["#6b5a86", "#281f3c", "#0c0916"] },
    { id: 9, name: "الأفعى النائمة", icon: "🐍", symbols: ["serpent", "candle"], palette: ["#4f6b4a", "#1d301b", "#081108"] },
    { id: 10, name: "باب الحديقة", icon: "🚪", symbols: ["rose", "key"], palette: ["#6b5a3f", "#2a2216", "#0f0c08"] },
    { id: 11, name: "النجم الساقط", icon: "✨", symbols: ["moon", "candle"], palette: ["#5a4a8f", "#221a40", "#0a0818"] },
    { id: 12, name: "صوت المفتاح", icon: "🗝️", symbols: ["key", "eye"], palette: ["#5f6b8f", "#232c40", "#0a0e18"] },
    { id: 13, name: "الظلام الدافئ", icon: "🕯️", symbols: ["candle", "raven"], palette: ["#7a5636", "#2e2014", "#100b07"] },
    { id: 14, name: "دائرة الحجر", icon: "🕰️", symbols: ["clock", "moon"], palette: ["#4a5f6b", "#1a2a30", "#081014"] },
    { id: 15, name: "دمعة الوردة", icon: "🌹", symbols: ["rose", "eye"], palette: ["#8f4a6b", "#361a2a", "#120810"] },
    { id: 16, name: "ظل الأفعى", icon: "🐍", symbols: ["serpent", "clock"], palette: ["#4a6b5a", "#1a3024", "#081410"] },
    { id: 17, name: "الريشة السوداء", icon: "🪶", symbols: ["raven", "key"], palette: ["#4a4a5f", "#1e1e2e", "#08080f"] },
    { id: 18, name: "نافذة القمر", icon: "🪟", symbols: ["moon", "key"], palette: ["#5a6b9a", "#202a44", "#0a0e1a"] },
    { id: 19, name: "قبلة السم", icon: "💋", symbols: ["serpent", "rose"], palette: ["#7a3f5f", "#2e1730", "#100714"] },
    { id: 20, name: "آخر شمعة", icon: "🕯️", symbols: ["candle", "clock"], palette: ["#8f6b3f", "#382a18", "#140c08"] },
  ];
  const VISION_BY_ID = {};
  VISIONS.forEach((vision) => { VISION_BY_ID[vision.id] = vision; });

  const DIFFICULTIES = {
    easy: {
      label: "متعلم",
      hours: 9,
      ghostSkill: 0.22,
      aiSkill: 0.48,
      delay: 1050,
      hint: "الروح تمنح وقتاً أطول، والزملاء يتعلمون قراءة الرؤى. مناسب للعائلة.",
    },
    medium: {
      label: "متوازن",
      hours: 7,
      ghostSkill: 0.66,
      aiSkill: 0.76,
      delay: 850,
      hint: "توازن بين وضوح الرؤى وضغط الوقت. الزملاء يقرأون الرموز جيداً.",
    },
    hard: {
      label: "خبير",
      hours: 5,
      ghostSkill: 0.96,
      aiSkill: 0.96,
      delay: 650,
      hint: "الزملاء خبراء والرؤى دقيقة، لكن الساعات قليلة. تحدٍّ لفريق منسجم.",
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

  function cardById(kind, id) {
    const list = ALL_KINDS[kind] || [];
    for (let i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
    return null;
  }

  function symbolsHTML(card) {
    if (!card) return "";
    return card.symbols.map((id) => {
      const symbol = SYMBOLS[id];
      return '<span title="' + esc(symbol.name) + '">' + symbol.icon + "</span>";
    }).join("");
  }

  function visionTagHTML(vision) {
    return vision.symbols.map((id) => {
      const symbol = SYMBOLS[id];
      return "<span>" + symbol.icon + " " + esc(symbol.name) + "</span>";
    }).join("");
  }

  function visionHTML(id) {
    const vision = VISION_BY_ID[id];
    if (!vision) return "";
    return '<div class="mys-vision" style="--v1:' + vision.palette[0] + ";--v2:" + vision.palette[1] + ";--v3:" + vision.palette[2] + '">' +
      '<span class="mys-vision-icon" aria-hidden="true">' + vision.icon + "</span>" +
      '<strong class="mys-vision-title">' + esc(vision.name) + "</strong>" +
      '<div class="mys-vision-tags">' + visionTagHTML(vision) + "</div>" +
      "</div>";
  }

  function clueCardHTML(id, selected, disabled) {
    const vision = VISION_BY_ID[id];
    if (!vision) return "";
    const tags = vision.symbols.map((symbolId) => SYMBOLS[symbolId].icon).join(" ");
    return '<button type="button" class="mys-clue-card' + (selected ? " is-selected" : "") + '" data-mys-clue="' + id + '"' +
      (disabled ? " disabled" : "") + ' style="--v1:' + vision.palette[0] + ";--v2:" + vision.palette[1] + ";--v3:" + vision.palette[2] + '">' +
      '<span class="ci" aria-hidden="true">' + vision.icon + "</span>" +
      "<strong>" + esc(vision.name) + "</strong>" +
      "<small>" + tags + "</small>" +
      "</button>";
  }

  function cardMiniHTML(kind, id) {
    const card = cardById(kind, id);
    if (!card) return '<span class="mys-mini is-empty">؟</span>';
    return '<span class="mys-mini" title="' + esc(card.name) + '"><i aria-hidden="true">' + card.icon + "</i>" + esc(card.name) + "</span>";
  }

  function trioMiniHTML(psychic) {
    if (!psychic) return "";
    return '<span class="mys-trio">' +
      KIND_ORDER.map((kind) => cardMiniHTML(kind, psychic.progress[kind])).join("") +
      "</span>";
  }

  const game = {
    id: "mysterium",
    name: "ميستيريوم",
    en: "Mysterium",
    icon: "🔮",
    tagline: "روح واحدة… حقيقة واحدة… فريق واحد",
    blurb: "لعبة تعاونية غامضة: الروح يرسل رؤى من الأحلام، والروحانيون يتعاونون لكشف المشتبه به والمكان والسلاح قبل نفاد الساعات. الجميع في فريق واحد.",
    players: "٢–٧ لاعبين",
    time: "٣٠–٤٥ دقيقة",
    age: "+١٠",
    coop: true,
    minPlayers: 2,
    maxPlayers: 7,
    defaultPlayers: 4,

    options: {
      defaults: { difficulty: "medium", ghost: "ai" },
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
          hint: "مستوى الزملاء يحدد دقة الروح الآلية وقراءة الروحانيين للرؤى. كلهم في فريقك، لا خصوم هنا.",
        },
        {
          key: "ghost",
          type: "choice",
          label: "من يؤدي دور الروح؟",
          choices: [
            { value: "ai", label: "الروح زميل آلي — كل اللاعبين روحانيون" },
            { value: "human", label: "أنا الروح — أرسل الرؤى بنفسي" },
          ],
          hint: "الروح لا يتكلم ولا ينافس؛ يرسل بطاقات حلم فقط. في اللعب الجماعي الآلي يظهر الروح كزميل يحمل الرؤى بدلاً عنك.",
        },
      ],
      summary(values) {
        const info = DIFFICULTIES[(values && values.difficulty) || "medium"] || DIFFICULTIES.medium;
        const ghost = (values && values.ghost) === "human" ? "روح بشرية" : "روح آلية";
        return "تحقيق الفريق: " + info.label + " · " + ghost;
      },
    },

    rulesFor(options) {
      const difficulty = (options && options.difficulty) || "medium";
      const info = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
      const ghostText = (options && options.ghost) === "human"
        ? "أحد اللاعبين يؤدي دور الروح ويرسل الرؤى بنفسه، والباقون روحانيون."
        : "الروح زميل آلي يرسل الرؤى، وكل اللاعبين البشر روحانيون. الروح جزء من الفريق وليس خصماً.";
      return {
        goal: "الفريق كله فريق واحد: روح وروحانيون. الهدف المشترك هو كشف المشتبه به والمكان والسلاح الصحيحين قبل نفاد ساعات التحقيق، ثم التصويت النهائي على المجموعة الحقيقية. الفوز مشترك للجميع، والخسارة على الجميع.",
        facts: [
          ["عدد اللاعبين", "٢ إلى ٧ لاعبين — فيهم روح واحد والباقي روحانيون"],
          ["المكوّنات", "٦ مشتبهين · ٦ أماكن · ٦ أسلحة · ٢٠ بطاقة حلم · ساعات التحقيق"],
          ["مدة اللعب", "٣٠–٤٥ دقيقة تقريباً"],
          ["الهدف", "إكمال المراحل الثلاث ثم اختيار المجموعة الحقيقية بأغلبية أصوات الفريق"],
        ],
        components: [
          "بطاقات المشتبه بهم: ٦ شخصيات لكل منها رمزان من رموز الأحلام.",
          "بطاقات الأماكن: ٦ أماكن، ولكل مكان رمزان.",
          "بطاقات الأسلحة: ٦ أسلحة، ولكل سلاح رمزان.",
          "بطاقات الحلم: ٢٠ رؤيا، لكل رؤيا رمزان. يستخدمها الروح لإرسال التلميحات.",
          "ساعات التحقيق: تبدأ من ٧ ساعات (تختلف بحسب مستوى الفريق). كل تخمين خاطئ يستهلك ساعة.",
          "بصائر الروحانيين: نقطة لكل إجابة صحيحة، ويمكن صرفها لكشف خيار خاطئ واحد.",
        ],
        setup: [
          "اختر مستوى خبرة الزملاء، ثم اختر من يؤدي دور الروح: زميل آلي أو أحد اللاعبين.",
          "اخلط بطاقات المشتبه بهم والأماكن والأسلحة، ثم خصّص لكل روحاني مجموعة سرية واحدة (مشتبه به + مكان + سلاح). الروح يرى كل المجموعات.",
          "اختر عشوائياً مجموعة أحد الروحانيين لتكون الحقيقة النهائية. لا يعرفها الروحانيون، ويعرفها الروح فقط.",
          "اخلط بطاقات الحلم ووزّع ٧ بطاقات للروح. تبقى بقية البطاقات رؤى محتملة.",
          "ضع ساعات التحقيق ظاهرة للفريق. الفريق يبدأ ببصيرة واحدة لكل روحاني.",
          "اللعبة رقمية: اضغط «ابدأ اللعب» ثم ستظهر مرحلة الاشتباه أولاً.",
        ],
        steps: [
          "<strong>دور الروح:</strong> يختار رؤيتين من يده تناسب الرمزين الموجودين على بطاقة الهدف (المشتبه به في المرحلة الأولى). الروح لا يتكلم ولا يشرح؛ الصور هي لغته الوحيدة.",
          "<strong>تفسير الروحاني:</strong> ينظر الروحاني إلى الرؤيتين ويختار من بطاقات المرحلة البطاقة التي يظن أنها الهدف. يمكنه طلب مساعدة الفريق في الحديث، لكن القرار قراره.",
          "<strong>إجابة صحيحة:</strong> تتقدم بطاقة الروحاني في المرحلة، ويحصل على بصيرة إضافية، ثم ينتقل الدور إلى روحاني آخر. عند إكمال المرحلة ينتقل الفريق إلى المرحلة التالية.",
          "<strong>إجابة خاطئة:</strong> تُستهلك ساعة من ساعات التحقيق، وتُستبعد البطاقة الخاطئة أمام الجميع، ويعيد الروح إرسال رؤيتين جديدتين للروحاني نفسه. إذا نفدت الساعات يخسر الفريق.",
          "<strong>البصيرة:</strong> يمكن للروحاني صرف بصيرة واحدة لكشف خيار خاطئ واحد وإبعاده قبل التخمين. البصائر ملك للفريق وتُستخدم للتقدم، لا للمنافسة.",
          "<strong>المراحل:</strong> المرحلة الأولى: المشتبه به. الثانية: المكان. الثالثة: السلاح. لا ننتقل للمرحلة التالية حتى يُكملها جميع الروحانيين.",
          "<strong>الكشف الأخير:</strong> يرسل الروح رؤيا أخيرة تناسب المجموعة الحقيقية. يصوّت كل روحاني على إحدى المجموعات المكتملة، والفريق يفوز إذا حصلت المجموعة الحقيقية على أصوات أكثر من أي مجموعة أخرى.",
        ],
        winning: "يفوز الفريق عندما ينتهي التصويت النهائي والمجموعة الحقيقية هي الأعلى أصواتاً بفارق واضح. إذا تعادلت الأصوات بين مجموعتين، أو حصلت مجموعة أخرى على أكثر الأصوات، يخسر الفريق. لا يوجد فائز فردي.",
        notes: [
          "الروح ليس خصماً: يرى المجموعات السرية ويساعد بإرسال أفضل رؤى ممكنة. مستوى الخبرة يحدد دقة اختياره للرؤى.",
          "الروحانيون يتعاونون: يمكنهم مناقشة الرموز، وتشجيع بعضهم، واستخدام البصائر لمساعدة زميل متعثر.",
          "لا توجد إجابات مخفية عن الفريق في المراحل الثلاث: البطاقات المستبعدة تظهر للجميع، وتقدم كل روحاني ظاهر.",
          "في هذه النسخة يرسل الروح رؤيتين لكل محاولة. المرحلة الرابعة رؤيا أخيرة واحدة ثم تصويت جماعي.",
          "عدد الساعات حسب المستوى: متعلم ٩، متوازن ٧، خبير ٥. كل خطأ يستهلك ساعة.",
          "يمكن استخدام الدردشة السريعة للتنسيق والتشجيع أثناء التحقيق. لا يوجد كلام يكشف الأرقام — المطلوب تعاون حقيقي.",
          "مستوى الزملاء المختار: " + info.label + ". " + info.hint + " " + ghostText,
        ],
      };
    },

    rules: {},
  };

  let state = null;
  let apiRef = null;
  let rootRef = null;
  let destroyed = false;
  let tickTimer = null;
  let applyingNet = false;
  let selectedClues = [];
  let lastDealKey = "";
  let overReported = false;
  let ghostHandCache = [];
  let ghostTargetsCache = null;
  let ghostTrueSeatCache = -1;

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

  function psychics() {
    return state ? state.players.filter((player) => player.role === "psychic") : [];
  }

  function canControlGhost() {
    if (!state || !state.ghostIsHuman) return false;
    if (isNet()) return mySeat() === state.ghostSeat;
    return true;
  }

  function isGhostViewer() {
    return !!(state && state.ghostIsHuman && isNet() && mySeat() === state.ghostSeat);
  }

  function applyGhostCache() {
    if (!state || !isGhostViewer() || !ghostTargetsCache) return;
    state.ghostHand = ghostHandCache.slice();
    state.targets = JSON.parse(JSON.stringify(ghostTargetsCache));
    state.trueSeat = ghostTrueSeatCache;
  }

  function sendGhostData() {
    if (!isNet() || !isHostOrLocal() || !state || !state.ghostIsHuman) return;
    const seatIndex = state.ghostSeat;
    const seat = apiRef && apiRef.net && Array.isArray(apiRef.net.seats) ? apiRef.net.seats[seatIndex] : null;
    if (!seat || seat.type !== "human" || !seat.peerId) return;
    if (seatIndex === apiRef.net.seat) return;
    try {
      BG.net.sendTo(seat.peerId, {
        t: "mys-ghost",
        hand: state.ghostHand.slice(),
        targets: JSON.parse(JSON.stringify(state.targets || {})),
        trueSeat: state.trueSeat,
      });
    } catch (err) { /* الشبكة اختيارية */ }
  }

  function canHumanGuess() {
    if (!state || state.over || state.step !== "guess") return false;
    const player = state.players[state.activeSeat];
    if (!player || player.isCpu || player.role !== "psychic") return false;
    if (isNet()) return mySeat() === player.index;
    return true;
  }

  function canHumanVote() {
    if (!state || state.over || state.step !== "vote") return false;
    if (isNet()) {
      const me = state.players[mySeat()];
      return !!(me && me.role === "psychic" && state.votes[me.index] == null);
    }
    return !!(localVoter() && localVoter().role === "psychic");
  }

  function localVoter() {
    if (!state) return null;
    const list = psychics().filter((player) => !player.isCpu && state.votes[player.index] == null);
    return list.length ? list[0] : null;
  }

  function voteSeat() {
    if (!state) return -1;
    if (isNet()) {
      const me = state.players[mySeat()];
      return me && me.role === "psychic" && state.votes[me.index] == null ? me.index : -1;
    }
    const voter = localVoter();
    return voter ? voter.index : -1;
  }

  function netSync() {
    if (!isNet() || applyingNet || !isHostOrLocal()) return;
    if (apiRef.net.sendState) {
      try { apiRef.net.sendState(); } catch (err) { /* الشبكة اختيارية */ }
    }
    sendGhostData();
  }

  function note(html, kind) {
    if (!state) return;
    state.log.push({ html: html, kind: kind || "" });
    if (state.log.length > 16) state.log.shift();
    if (apiRef && typeof apiRef.log === "function") {
      try { apiRef.log(html.replace(/<[^>]*>/g, ""), kind || ""); } catch (err) { /* ignore */ }
    }
  }

  function sound(name) {
    try { if (FX && typeof FX.sound === "function") FX.sound(name); } catch (err) { /* الصوت اختياري */ }
  }

  function phaseName(kind) {
    if (kind === "suspect") return "الاشتباه";
    if (kind === "location") return "المكان";
    if (kind === "weapon") return "السلاح";
    if (kind === "final") return "الكشف الأخير";
    if (kind === "over") return state && state.win ? "فاز الفريق" : "خسر الفريق";
    return "التحقيق";
  }

  function phaseLongName(kind) {
    if (kind === "suspect") return "مرحلة الاشتباه";
    if (kind === "location") return "مرحلة المكان";
    if (kind === "weapon") return "مرحلة السلاح";
    if (kind === "final") return "الكشف الأخير";
    return phaseName(kind);
  }

  function phaseIndex(kind) {
    if (kind === "suspect") return 0;
    if (kind === "location") return 1;
    if (kind === "weapon") return 2;
    return 3;
  }

  function statusText() {
    if (!state) return "";
    if (state.over) return state.win ? "فاز الفريق — كُشفت الحقيقة" : "خسر الفريق — بقي الغموض";
    if (state.step === "vote") return "التصويت الأخير · " + ar(state.hours) + " ساعة متبقية";
    if (state.phase === "final") return "الرؤيا الأخيرة · اختاروا المجموعة الحقيقية";
    const player = state.players[state.activeSeat];
    return "ميستيريوم · " + phaseLongName(state.phase) + (player ? " · دور " + player.name : "") + " · " + ar(state.hours) + " ساعات";
  }

  function createVisionDeck() {
    return shuffle(VISIONS.map((vision) => vision.id));
  }

  function drawVisions(count) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      if (!state.visionDeck.length) {
        const used = state.ghostHand.slice();
        out.forEach((id) => { if (used.indexOf(id) < 0) used.push(id); });
        Object.keys(state.visions || {}).forEach((seat) => {
          (state.visions[seat] || []).forEach((id) => { if (used.indexOf(id) < 0) used.push(id); });
        });
        if (state.finalVision != null && used.indexOf(state.finalVision) < 0) used.push(state.finalVision);
        state.visionDeck = shuffle(VISIONS.map((vision) => vision.id).filter((id) => used.indexOf(id) < 0));
      }
      if (!state.visionDeck.length) break;
      const picked = state.visionDeck.pop();
      if (out.indexOf(picked) >= 0) { i -= 1; continue; }
      out.push(picked);
    }
    return out;
  }

  function createState(seats, difficulty, ghostMode) {
    const players = (seats || []).slice(0, 7).map((seat, index) => ({
      index: index,
      name: (seat && seat.name) || "لاعب " + (index + 1),
      isCpu: !!(seat && (seat.isCpu || seat.type === "cpu")),
      role: "psychic",
      progress: { suspect: null, location: null, weapon: null },
      clairvoyance: 1,
    }));
    while (players.length < 2) {
      players.push({
        index: players.length,
        name: "اللاعب " + (players.length + 1),
        isCpu: true,
        role: "psychic",
        progress: { suspect: null, location: null, weapon: null },
        clairvoyance: 1,
      });
    }

    let ghostSeat = -1;
    if (ghostMode === "human") {
      const firstHuman = players.findIndex((player) => !player.isCpu);
      ghostSeat = firstHuman >= 0 ? firstHuman : 0;
      players[ghostSeat].role = "ghost";
    }
    const ghostIsHuman = ghostSeat >= 0;
    const team = players.filter((player) => player.role === "psychic");
    const combos = [];
    SUSPECTS.forEach((suspect) => {
      LOCATIONS.forEach((location) => {
        WEAPONS.forEach((weapon) => {
          combos.push({ suspect: suspect.id, location: location.id, weapon: weapon.id });
        });
      });
    });
    shuffle(combos);
    const targets = {};
    team.forEach((player, index) => {
      targets[player.index] = Object.assign({}, combos[index % combos.length]);
    });
    const trueSeat = team.length ? team[Math.floor(Math.random() * team.length)].index : -1;
    const info = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;

    const result = {
      players: players,
      ghostSeat: ghostSeat,
      ghostIsHuman: ghostIsHuman,
      difficulty: DIFFICULTIES[difficulty] ? difficulty : "medium",
      phase: "suspect",
      step: "deal",
      activeSeat: team.length ? team[0].index : -1,
      hours: info.hours,
      maxHours: info.hours,
      targets: targets,
      trueSeat: trueSeat,
      culprit: trueSeat >= 0 ? Object.assign({}, targets[trueSeat]) : null,
      visionDeck: [],
      ghostHand: [],
      visions: {},
      eliminated: {},
      finalVision: null,
      votes: {},
      nextAt: 0,
      over: false,
      win: false,
      result: null,
      notice: "الروح يفتح بوابة الأحلام. الفريق كله يبحث عن الحقيقة نفسها.",
      log: [],
      privateMasked: false,
    };
    state = result;
    state.visionDeck = createVisionDeck();
    players.forEach((player) => {
      if (player.role === "psychic") {
        state.eliminated[player.index] = { suspect: [], location: [], weapon: [] };
      }
    });
    state.ghostHand = drawVisions(7);
    state.nextAt = Date.now() + (ghostIsHuman ? 0 : 900);
    return result;
  }

  function solvedByOther(kind, cardId, seat) {
    return psychics().some((player) => player.index !== seat && player.progress[kind] === cardId);
  }

  function candidatesFor(seat, kind) {
    if (!state) return [];
    const eliminated = (state.eliminated[seat] && state.eliminated[seat][kind]) || [];
    return (ALL_KINDS[kind] || []).filter((card) => {
      if (solvedByOther(kind, card.id, seat)) return false;
      return eliminated.indexOf(card.id) < 0;
    });
  }

  function targetCard(seat, kind) {
    const target = state.targets[seat];
    return target ? cardById(kind, target[kind]) : null;
  }

  function overlapScore(card, symbols) {
    if (!card) return 0;
    let score = 0;
    card.symbols.forEach((symbol) => { if (symbols.indexOf(symbol) >= 0) score += 1; });
    return score;
  }

  function visionSymbols(ids) {
    const out = [];
    (ids || []).forEach((id) => {
      const vision = VISION_BY_ID[id];
      if (vision) vision.symbols.forEach((symbol) => { if (out.indexOf(symbol) < 0) out.push(symbol); });
    });
    return out;
  }

  function visionScoreForTarget(visionId, target) {
    const vision = VISION_BY_ID[visionId];
    if (!vision || !target) return 0;
    let score = overlapScore(target, vision.symbols) * 2;
    if (vision.symbols.indexOf(target.symbols[0]) >= 0) score += 1;
    if (vision.symbols.indexOf(target.symbols[1]) >= 0) score += 1;
    return score;
  }

  function pickVisionsForTarget(target, count) {
    const info = difficultyInfo();
    const hand = state.ghostHand.slice();
    const scored = hand.map((id) => ({ id: id, score: visionScoreForTarget(id, target) + Math.random() * 0.5 }));
    scored.sort((a, b) => b.score - a.score);
    const picks = [];
    if (Math.random() > info.ghostSkill) {
      const randomPool = shuffle(scored);
      for (let i = 0; i < randomPool.length && picks.length < count; i += 1) picks.push(randomPool[i].id);
      return picks;
    }
    const topSize = Math.max(count, Math.ceil(scored.length * (1 - info.ghostSkill) * 0.7));
    const top = scored.slice(0, Math.max(count, topSize));
    const shuffledTop = shuffle(top);
    for (let i = 0; i < shuffledTop.length && picks.length < count; i += 1) picks.push(shuffledTop[i].id);
    return picks;
  }

  function replaceGhostCards(ids) {
    const used = ids.slice();
    state.ghostHand = state.ghostHand.filter((id) => {
      const index = used.indexOf(id);
      if (index < 0) return true;
      used.splice(index, 1);
      return false;
    });
    state.ghostHand = state.ghostHand.concat(drawVisions(ids.length));
  }

  function dealVisions(seat, ids) {
    const player = state.players[seat];
    if (!player || player.role !== "psychic") return;
    const valid = (ids || []).filter((id, index, list) => state.ghostHand.indexOf(id) >= 0 && list.indexOf(id) === index);
    if (valid.length !== 2) return;
    replaceGhostCards(valid);
    state.visions[seat] = valid;
    state.step = "guess";
    state.nextAt = Date.now() + (player.isCpu ? difficultyInfo().delay : 0);
    state.notice = "الرؤى أمام " + player.name + ". الرموز تتحدث، والصمت جزء من الحكاية.";
    note("أرسل <strong>الروح</strong> رؤيتين إلى <strong>" + esc(player.name) + "</strong>.", "accent");
    sound("card");
    render();
  }

  function autoDeal() {
    if (!state || state.step !== "deal" || state.ghostIsHuman) return;
    const seat = state.activeSeat;
    const player = state.players[seat];
    if (!player || player.role !== "psychic") return;
    const target = targetCard(seat, state.phase);
    const picks = pickVisionsForTarget(target, 2);
    if (picks.length < 2) return;
    dealVisions(seat, picks);
  }

  function beginFinal() {
    if (!state || state.over) return;
    state.phase = "final";
    state.step = "finalDeal";
    state.activeSeat = -1;
    state.visions = {};
    state.finalVision = null;
    state.votes = {};
    state.nextAt = Date.now() + (state.ghostIsHuman ? 0 : 900);
    state.notice = "اكتملت المراحل الثلاث. الآن رؤيا أخيرة… ثم تصويت الفريق.";
    note("<strong>اكتملت المراحل الثلاث!</strong> حان وقت الكشف الأخير: صوّتوا معاً على المجموعة الحقيقية.", "good");
    selectedClues = [];
    sound("reveal");
    render();
  }

  function sendFinalVision(id) {
    if (!state || state.over || state.step !== "finalDeal") return;
    if (!canControlGhost() || state.ghostHand.indexOf(id) < 0) return;
    replaceGhostCards([id]);
    state.finalVision = id;
    state.step = "vote";
    state.nextAt = Date.now() + 900;
    state.notice = "الرؤيا الأخيرة أمام الفريق. صوّتوا للمجموعة التي تشعرون أنها الحقيقة.";
    note("أرسل <strong>الروح</strong> الرؤيا الأخيرة. حان وقت تصويت الفريق.", "accent");
    selectedClues = [];
    sound("reveal");
    render();
  }

  function autoFinalVision() {
    if (!state || state.step !== "finalDeal" || state.ghostIsHuman) return;
    const cards = KIND_ORDER.map((kind) => cardById(kind, state.culprit[kind]));
    const symbols = [];
    cards.forEach((card) => { if (card) card.symbols.forEach((symbol) => symbols.push(symbol)); });
    const hand = state.ghostHand.slice();
    const scored = hand.map((id) => ({ id: id, score: overlapScore(VISION_BY_ID[id], symbols) + Math.random() * 0.4 }));
    scored.sort((a, b) => b.score - a.score);
    const info = difficultyInfo();
    let pick;
    if (Math.random() > info.ghostSkill) pick = scored[Math.floor(Math.random() * scored.length)];
    else pick = scored[Math.floor(Math.random() * Math.max(1, Math.ceil(scored.length * (1 - info.ghostSkill))))];
    if (!pick) return;
    replaceGhostCards([pick.id]);
    state.finalVision = pick.id;
    state.step = "vote";
    state.nextAt = Date.now() + 900;
    state.notice = "الرؤيا الأخيرة أمام الفريق. صوّتوا للمجموعة التي تشعرون أنها الحقيقة.";
    note("أرسل <strong>الروح</strong> الرؤيا الأخيرة. حان وقت تصويت الفريق.", "accent");
    sound("reveal");
    render();
  }

  function makeGuess(seat, id) {
    if (!state || state.over || state.step !== "guess") return;
    if (seat !== state.activeSeat) return;
    const kind = state.phase;
    if (KIND_ORDER.indexOf(kind) < 0) return;
    const player = state.players[seat];
    if (!player || player.role !== "psychic" || player.progress[kind]) return;
    const card = cardById(kind, id);
    if (!card) return;
    const eliminated = state.eliminated[seat][kind];
    if (eliminated.indexOf(id) >= 0) return;
    const correct = state.targets[seat][kind] === id;
    state.visions[seat] = [];
    if (correct) {
      player.progress[kind] = id;
      player.clairvoyance = Math.min(6, player.clairvoyance + 1);
      note("<strong>" + esc(player.name) + "</strong> كشف " + KIND_LABEL[kind] + ": <strong>" + esc(card.name) + "</strong>. إجابة صحيحة للفريق! +١ بصيرة.", "good");
      sound("score");
    } else {
      state.hours -= 1;
      eliminated.push(id);
      note("<strong>" + esc(player.name) + "</strong> أشار إلى <strong>" + esc(card.name) + "</strong>… لكن الرؤى كانت ترشد إلى غيره. خسر الفريق ساعة.", "warn");
      sound("error");
    }

    if (state.hours <= 0) {
      finishGame(false, "time");
      return;
    }

    if (correct) {
      const remaining = psychics().filter((other) => !other.progress[kind]);
      if (!remaining.length) {
        const nextKind = kind === "suspect" ? "location" : kind === "location" ? "weapon" : null;
        if (!nextKind) {
          render();
          beginFinal();
          return;
        }
        state.phase = nextKind;
        state.visions = {};
        state.activeSeat = psychics()[0].index;
        state.step = "deal";
        state.nextAt = Date.now() + (state.ghostIsHuman ? 0 : 600);
        state.notice = "اكتملت " + phaseLongName(kind) + ". بدأت " + phaseLongName(nextKind) + ".";
        note("انتهت <strong>" + phaseLongName(kind) + "</strong>. ينتقل الفريق إلى <strong>" + phaseLongName(nextKind) + "</strong>.", "accent");
      } else {
        state.activeSeat = remaining[0].index;
        state.step = "deal";
        state.nextAt = Date.now() + (state.ghostIsHuman ? 0 : 600);
        state.notice = "دور " + remaining[0].name + " الآن. الرؤى القادمة تخصه.";
      }
    } else {
      state.step = "deal";
      state.nextAt = Date.now() + (state.ghostIsHuman ? 0 : 700);
      state.notice = "يبقى الدور مع " + player.name + ". الروح يرسل رؤيتين جديدتين.";
    }
    render();
  }

  function castVote(seat, owner) {
    if (!state || state.over || state.step !== "vote") return;
    const player = state.players[seat];
    if (!player || player.role !== "psychic") return;
    if (state.votes[seat] != null) return;
    const ownerPlayer = state.players[owner];
    if (!ownerPlayer || ownerPlayer.role !== "psychic" || !ownerPlayer.progress.suspect || !ownerPlayer.progress.location || !ownerPlayer.progress.weapon) return;
    state.votes[seat] = owner;
    note("<strong>" + esc(player.name) + "</strong> صوّت لصالح مجموعة <strong>" + esc(ownerPlayer.name) + "</strong>.", "accent");
    sound("click");
    state.nextAt = Date.now() + 650;
    if (psychics().every((other) => state.votes[other.index] != null)) {
      evaluateFinal();
      return;
    }
    render();
  }

  function evaluateFinal() {
    if (!state || state.over) return;
    const counts = {};
    Object.keys(state.votes).forEach((seat) => {
      const owner = state.votes[seat];
      counts[owner] = (counts[owner] || 0) + 1;
    });
    let max = 0;
    Object.keys(counts).forEach((key) => { max = Math.max(max, counts[key]); });
    const leaders = Object.keys(counts).filter((key) => counts[key] === max).map(Number);
    const win = leaders.length === 1 && leaders[0] === state.trueSeat;
    const lines = Object.keys(counts).map((key) => {
      const player = state.players[Number(key)];
      return esc(player ? player.name : "مجموعة") + ": " + ar(counts[key]);
    }).join(" · ");
    note("نتيجة التصويت — " + lines + ".", win ? "good" : "warn");
    finishGame(win, "vote");
  }

  function finishGame(win, reason) {
    if (!state || state.over) return;
    const reachedPhase = state.phase;
    state.over = true;
    state.win = !!win;
    state.step = "over";
    state.phase = "over";
    state.result = { reason: reason || "vote", hours: state.hours };
    const culprit = state.culprit || {};
    const suspect = cardById("suspect", culprit.suspect);
    const location = cardById("location", culprit.location);
    const weapon = cardById("weapon", culprit.weapon);
    const truth = suspect && location && weapon
      ? suspect.name + " · " + location.name + " · " + weapon.name
      : "المجموعة الحقيقية";
    const reasonText = win
      ? "الفريق كله قرأ الرؤى بشكل صحيح وكشف الحقيقة: " + truth + ". كل روحاني كان جزءاً من النجاح."
      : reason === "time"
        ? "نفدت ساعات التحقيق قبل الوصول إلى الحقيقة. الحقيقة كانت: " + truth + ". الفريق يخسر معاً."
        : "لم يحصل التصويت النهائي على أغلبية للمجموعة الحقيقية. الحقيقة كانت: " + truth + ". الفريق يخسر معاً.";
    if (!state.culprit) state.culprit = culprit;
    note(win
      ? "<strong>فاز الفريق!</strong> كُشفت الحقيقة: " + esc(truth) + "."
      : "<strong>خسر الفريق معاً.</strong> الحقيقة كانت: " + esc(truth) + ".",
      win ? "good" : "warn");
    sound(win ? "win" : "lose");
    render();
    if (!overReported && apiRef && typeof apiRef.gameOver === "function") {
      overReported = true;
      try {
        apiRef.gameOver({
          title: win ? "كُشفت الحقيقة — فاز الفريق" : "بقي الغموض — خسر الفريق",
          text: reasonText,
          winner: win ? "الفريق الكامل" : "الغموض",
          icon: win ? "🔮" : "🌫️",
          tone: win ? "win" : "lose",
          standings: psychics().map((player) => ({
            name: player.name + (player.isCpu ? " · زميل آلي" : " · إنسان"),
            value: (player.progress.suspect && player.progress.location && player.progress.weapon
              ? "أكمل المراحل الثلاث · بصائر: " + ar(player.clairvoyance)
              : "وصل إلى " + phaseLongName(reachedPhase)),
          })).concat(state.ghostIsHuman
            ? [{ name: (state.players[state.ghostSeat] || {}).name || "الروح", value: "الروح · أرسل الرؤى طوال التحقيق" }]
            : [{ name: "الروح الآلية", value: "زميل الفريق · أرسل الرؤى بلا كلام" }]),
        });
      } catch (err) { /* ignore */ }
    }
  }

  function useHint(seat) {
    if (!state || state.over || state.step !== "guess" || seat !== state.activeSeat) return false;
    const player = state.players[seat];
    if (!player || player.role !== "psychic" || player.clairvoyance <= 0) return false;
    const kind = state.phase;
    const candidates = candidatesFor(seat, kind);
    const targetId = state.targets[seat][kind];
    const wrong = candidates.filter((card) => card.id !== targetId);
    if (!wrong.length) return false;
    const pick = wrong[Math.floor(Math.random() * wrong.length)];
    player.clairvoyance -= 1;
    state.eliminated[seat][kind].push(pick.id);
    note("<strong>" + esc(player.name) + "</strong> استخدم بصيرة لكشف خيار خاطئ: <strong>" + esc(pick.name) + "</strong> ليس الهدف. -١ بصيرة.", "accent");
    sound("reveal");
    render();
    return true;
  }

  function aiGuess(seat) {
    if (!state || state.over || state.step !== "guess" || seat !== state.activeSeat) return;
    const player = state.players[seat];
    if (!player || !player.isCpu || player.role !== "psychic") return;
    const kind = state.phase;
    let candidates = candidatesFor(seat, kind);
    if (!candidates.length) return;
    const symbols = visionSymbols(state.visions[seat]);
    const scored = candidates.map((card) => ({ card: card, score: overlapScore(card, symbols) + Math.random() * 0.85 }));
    scored.sort((a, b) => b.score - a.score);
    const info = difficultyInfo();
    if (player.clairvoyance > 0 && Math.random() > info.aiSkill) {
      const wrong = candidates.filter((card) => card.id !== state.targets[seat][kind] && card.id !== scored[0].card.id);
      if (wrong.length) {
        const pick = wrong[Math.floor(Math.random() * wrong.length)];
        player.clairvoyance -= 1;
        state.eliminated[seat][kind].push(pick.id);
        note("<strong>" + esc(player.name) + "</strong> استخدم بصيرة لكشف خيار خاطئ: <strong>" + esc(pick.name) + "</strong>.", "accent");
        candidates = candidatesFor(seat, kind);
        const rescored = candidates.map((card) => ({ card: card, score: overlapScore(card, symbols) + Math.random() * 0.6 }));
        rescored.sort((a, b) => b.score - a.score);
        if (!rescored.length) return;
        scored.length = 0;
        rescored.forEach((item) => scored.push(item));
      }
    }
    let choice;
    if (Math.random() > info.aiSkill) {
      choice = scored[Math.floor(Math.random() * scored.length)];
    } else {
      const pool = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.4)));
      choice = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!choice) return;
    makeGuess(seat, choice.card.id);
  }

  function aiVote(seat) {
    const owners = psychics().filter((player) => player.progress.suspect && player.progress.location && player.progress.weapon);
    if (!owners.length) return state.trueSeat;
    const vision = VISION_BY_ID[state.finalVision];
    const symbols = vision ? vision.symbols : [];
    const scored = owners.map((player) => {
      let score = 0;
      KIND_ORDER.forEach((kind) => { score += overlapScore(cardById(kind, player.progress[kind]), symbols); });
      return { owner: player.index, score: score + Math.random() * 0.7 };
    }).sort((a, b) => b.score - a.score);
    const info = difficultyInfo();
    if (Math.random() > info.aiSkill) return scored[Math.floor(Math.random() * scored.length)].owner;
    const pool = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.5)));
    return pool[Math.floor(Math.random() * pool.length)].owner;
  }

  function tick() {
    if (!state || state.over || destroyed || !isHostOrLocal()) return;
    const now = Date.now();
    if (state.step === "deal" || state.step === "finalDeal") {
      if (state.ghostIsHuman) return;
      if (now < state.nextAt) return;
      if (state.step === "deal") autoDeal();
      else autoFinalVision();
      return;
    }
    if (state.step === "guess") {
      if (now < state.nextAt) return;
      const player = state.players[state.activeSeat];
      if (player && player.isCpu) aiGuess(state.activeSeat);
      return;
    }
    if (state.step === "vote") {
      if (now < state.nextAt) return;
      const next = psychics().find((player) => player.isCpu && state.votes[player.index] == null);
      if (next) castVote(next.index, aiVote(next.index));
    }
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function renderTeamHeader() {
    const info = difficultyInfo();
    return BG.coop.teamHeader({
      icon: "🔮",
      title: "ميستيريوم",
      en: "MYSTERIUM · ONE TEAM, ONE TRUTH",
      goal: "اكشفوا الحقيقة معاً قبل نفاد الساعات",
      players: psychics(),
      current: state.activeSeat,
      meta(player) {
        const done = KIND_ORDER.filter((kind) => player.progress[kind]).length;
        return ar(done) + " / ٣ · " + (player.isCpu ? "زميل آلي" : "إنسان");
      },
      chips:
        BG.coop.chip("الساعات", ar(state.hours) + " / " + ar(state.maxHours), state.hours <= 2 ? "is-danger" : "is-warn") +
        BG.coop.chip("المرحلة", phaseName(state.phase), "is-gold") +
        BG.coop.chip("الروح", esc(state.ghostIsHuman ? (state.players[state.ghostSeat] || {}).name || "لاعب" : "زميل آلي")) +
        BG.coop.chip("المستوى", info.label),
    });
  }

  function renderObjective() {
    const team = psychics();
    const done = team.reduce((total, player) => total + KIND_ORDER.filter((kind) => player.progress[kind]).length, 0);
    const total = Math.max(1, team.length * 3);
    const pct = Math.round((done / total) * 100);
    const ghostName = state.ghostIsHuman ? (state.players[state.ghostSeat] || {}).name || "لاعب" : "زميل آلي";
    return '<div class="coop-objective">' +
      BG.coop.objectiveCard("المرحلة", phaseName(state.phase), phaseLongName(state.phase), "is-gold", Math.round((phaseIndex(state.phase) / 3) * 100)) +
      BG.coop.objectiveCard("تقدّم الفريق", ar(done) + " / " + ar(team.length * 3), "إجابات صحيحة", "", pct) +
      BG.coop.objectiveCard("الساعات", ar(state.hours) + " / " + ar(state.maxHours), "قبل نهاية التحقيق", state.hours <= 2 ? "is-danger" : "") +
      BG.coop.objectiveCard("الروح", esc(ghostName), "تعاون لا منافسة", state.ghostIsHuman ? "" : "is-gold") +
      BG.coop.objectiveCard("الفوز", state.step === "vote" ? "التصويت الآن" : "كشف الحقيقة", "فوز مشترك للجميع") +
      "</div>";
  }

  function renderPhaseTrack() {
    const at = phaseIndex(state.phase);
    return '<div class="mys-phase-track" aria-label="مراحل التحقيق">' +
      [["suspect", "الاشتباه"], ["location", "المكان"], ["weapon", "السلاح"]].map((item, index) => {
        const done = state.phase === "final" || state.phase === "over" || at > index;
        const now = state.phase === item[0];
        return '<span class="mys-phase-step' + (done ? " is-done" : now ? " is-now" : "") + '">' +
          (done ? "✓ " : "") + item[1] + "</span>";
      }).join("") +
      '<span class="mys-phase-step' + (state.phase === "final" || state.phase === "over" ? " is-now" : "") + '">الكشف</span>' +
      "</div>";
  }

  function renderVisions(seat) {
    const ids = state.visions[seat] || [];
    if (!ids.length) {
      return '<div class="mys-clue-zone"><div class="mys-ghost-orb"><span aria-hidden="true">🔮</span>' +
        "<strong>الروح يقرأ الأحلام…</strong><p>انتظر الرؤيتين. الصور وحدها ستتكلم.</p></div></div>";
    }
    return '<div class="mys-clue-zone"><div class="mys-section-label">رؤى الروح</div><div class="mys-vision-grid">' +
      ids.map((id) => visionHTML(id)).join("") + "</div></div>";
  }

  function renderGhostHand(maxCount) {
    const disabled = !canControlGhost();
    const cards = state.ghostHand.map((id) => clueCardHTML(id, selectedClues.indexOf(id) >= 0, disabled)).join("");
    const seats = psychics();
    const targetName = state.step === "finalDeal"
      ? "المجموعة الحقيقية"
      : (state.players[state.activeSeat] || {}).name || "الروحاني";
    const canSend = !disabled && selectedClues.length === maxCount;
    return '<div class="mys-clue-main">' +
      '<div class="mys-section-label">يد الروح — اختر ' + (maxCount === 2 ? "رؤيتين" : "رؤيا واحدة") + " لـ " + esc(targetName) + "</div>" +
      '<div class="mys-ghost-hand">' + (cards || '<p class="coop-note">لا توجد بطاقات حلم متبقية.</p>') + "</div>" +
      '<div class="mys-guess-row">' +
        '<button type="button" class="coop-btn primary" data-mys-action="send-clue"' + (canSend ? "" : " disabled") + ">" +
          (state.step === "finalDeal" ? "أرسل الرؤيا الأخيرة" : "أرسل الرؤيتين") + "</button>" +
        '<span class="mys-pick-count">' + ar(selectedClues.length) + " / " + ar(maxCount) + " مختارة</span>" +
      "</div>" +
      '<p class="coop-note">الروح لا يتكلم. اختر صوراً تناسب رموز الهدف، واترك الباقي لفريقك.</p>' +
      "</div>";
  }

  function candidateCardHTML(card, seat, disabled) {
    const kind = state.phase;
    const eliminated = ((state.eliminated[seat] || {})[kind] || []).indexOf(card.id) >= 0;
    const solved = psychics().some((player) => player.index !== seat && player.progress[kind] === card.id);
    const isDisabled = disabled || eliminated || solved;
    return '<button type="button" class="mys-card' + (eliminated || solved ? " is-decoy" : "") + '" data-mys-pick="' + esc(card.id) + '"' +
      (isDisabled ? " disabled" : "") + ' aria-label="' + esc(card.name) + '">' +
      '<span class="mys-card-icon" aria-hidden="true">' + card.icon + "</span>" +
      "<strong>" + esc(card.name) + "</strong>" +
      "<small>" + symbolsHTML(card) + "</small>" +
      "</button>";
  }

  function renderGuessBoard() {
    const seat = state.activeSeat;
    const player = state.players[seat];
    if (!player) return "";
    const kind = state.phase;
    const cards = candidatesFor(seat, kind);
    const hintBtn = '<button type="button" class="coop-btn gold small" data-mys-action="hint"' +
      (canHumanGuess() && player.clairvoyance > 0 ? "" : " disabled") + ">بصيرة · كشف خيار خاطئ (" + ar(player.clairvoyance) + ")</button>";
    return '<div class="mys-clue-main">' +
      '<div class="mys-section-label">' + KIND_ICON[kind] + " " + KIND_LABEL[kind] + " — من يطابق الرؤى؟</div>" +
      '<div class="mys-board">' + cards.map((card) => candidateCardHTML(card, seat, !canHumanGuess())).join("") + "</div>" +
      '<div class="mys-guess-row">' + hintBtn +
        '<span class="mys-pick-count">' + (player.isCpu ? "زميل آلي يفكر…" : (isNet() && !canHumanGuess() ? "بانتظار " + esc(player.name) : "اختر بطاقة واحدة")) + "</span>" +
      "</div>" +
      "</div>";
  }

  function renderGhostWait() {
    const player = state.players[state.activeSeat];
    return '<div class="mys-clue-main"><div class="mys-ghost-orb is-small"><span aria-hidden="true">🌙</span>' +
      "<strong>" + (state.ghostIsHuman ? "الروح يختار الرؤى…" : "الروح الآلية ينسج الرؤيا…") + "</strong>" +
      "<p>" + (player ? "الدور الآن لـ " + esc(player.name) : "الفريق ينتظر الإشارة") + "</p></div></div>";
  }

  function renderFinalDeal() {
    if (canControlGhost()) return renderGhostHand(1);
    return renderGhostWait();
  }

  function renderFinalVote() {
    const vision = state.finalVision ? '<div class="mys-clue-zone"><div class="mys-section-label">الرؤيا الأخيرة</div>' + visionHTML(state.finalVision) + "</div>" : renderVisions(-1);
    const voter = voteSeat();
    const canVote = canHumanVote();
    const cards = psychics().map((player) => {
      const complete = player.progress.suspect && player.progress.location && player.progress.weapon;
      const voted = Object.keys(state.votes).filter((seat) => state.votes[seat] === player.index).length;
      return '<button type="button" class="mys-card mys-final-card' + (complete ? "" : " is-decoy") + '" data-mys-vote="' + player.index + '"' +
        (canVote && complete ? "" : " disabled") + ">" +
        '<span class="mys-card-icon" aria-hidden="true">' + (complete ? "🗝️" : "🌫️") + "</span>" +
        "<strong>" + esc(player.name) + "</strong>" +
        "<small>" + KIND_ORDER.map((kind) => {
          const card = cardById(kind, player.progress[kind]);
          return card ? card.icon : "؟";
        }).join(" ") + "</small>" +
        '<span class="mys-final-names">' + esc(KIND_ORDER.map((kind) => {
          const card = cardById(kind, player.progress[kind]);
          return card ? card.name : "؟";
        }).join(" · ")) + "</span>" +
        '<span class="mys-vote-count">' + (voted ? "أصوات: " + ar(voted) : "بلا أصوات") + "</span>" +
        "</button>";
    }).join("");
    return vision + '<div class="mys-clue-main">' +
      '<div class="mys-section-label">المجموعات المكتملة — صوّتوا للحقيقة</div>' +
      '<div class="mys-board">' + cards + "</div>" +
      '<div class="mys-guess-row">' +
        '<span class="mys-pick-count">' + (canVote ? "صوتك الآن: " + esc((state.players[voter] || {}).name || "") : (Object.keys(state.votes).length >= psychics().length ? "اكتمل التصويت" : "بانتظار بقية الأصوات")) + "</span>" +
      "</div>" +
      '<p class="coop-note">كل روحاني يصوّت مرة واحدة. الفريق يفوز إذا حصلت المجموعة الحقيقية على أعلى الأصوات بفارق واضح.</p>' +
      "</div>";
  }

  function renderPsychics() {
    const active = state.activeSeat;
    return '<div class="mys-section-label">الروحانيون — فريق واحد</div><div class="mys-psychics">' +
      psychics().map((player) => {
        const dots = [];
        for (let i = 0; i < 5; i += 1) dots.push('<i class="' + (i < player.clairvoyance ? "on" : "") + '"></i>');
        return '<div class="mys-psychic' + (player.index === active ? " is-you" : "") + '">' +
          '<div class="mys-psychic-head"><span aria-hidden="true">' + (player.isCpu ? "🤖" : "🧑") + "</span><b>" + esc(player.name) + "</b>" +
            (player.index === active ? "<small> · الدور الآن</small>" : "") + "</div>" +
          '<div class="mys-progress">' +
            KIND_ORDER.map((kind) => {
              const card = cardById(kind, player.progress[kind]);
              return '<div class="mys-progress-row"><span>' + KIND_ICON[kind] + "</span>" +
                (card ? '<b class="is-found">' + card.icon + " " + esc(card.name) + "</b>" : '<small>لم يُكشف بعد · ' + ar(((state.eliminated[player.index] || {})[kind] || []).length) + " مستبعد</small>") +
                "</div>";
            }).join("") +
          "</div>" +
          '<div class="mys-clair" aria-label="بصائر">' + dots.join("") + "</div>" +
          "</div>";
      }).join("") +
      "</div>";
  }

  function renderNotice() {
    if (state.over) {
      const culprit = state.culprit || {};
      const names = KIND_ORDER.map((kind) => {
        const card = cardById(kind, culprit[kind]);
        return card ? card.icon + " " + esc(card.name) : "";
      }).join(" · ");
      return '<div class="mys-banner ' + (state.win ? "is-good" : "is-bad") + '">' +
        '<strong>' + (state.win ? "فاز الفريق — كُشفت الحقيقة" : "خسر الفريق معاً — بقي الغموض") + "</strong>" +
        "<span>المجموعة الحقيقية: " + names + "</span>" +
        "</div>";
    }
    return '<p class="mys-notice">' + esc(state.notice) + "</p>";
  }

  function renderStage() {
    let content = "";
    if (state.step === "deal") {
      content = canControlGhost() ? renderGhostHand(2) : renderGhostWait();
      if (canControlGhost()) content = renderGhostHand(2);
    } else if (state.step === "guess") {
      content = renderVisions(state.activeSeat) + renderGuessBoard();
    } else if (state.step === "finalDeal") {
      content = renderFinalDeal();
    } else if (state.step === "vote") {
      content = renderFinalVote();
    }
    const top = '<div class="mys-phase"><div class="mys-phase-track">' +
      '<span class="mys-phase-step">🔮 ' + phaseName(state.phase) + "</span>" +
      "</div>" + renderPhaseTrack() +
      '<span class="mys-chip is-warn">⏳ ' + ar(state.hours) + " / " + ar(state.maxHours) + " ساعة</span>" +
      "</div>";
    return '<div class="mys-stage">' + top +
      '<div class="mys-clue-stage">' + content + "</div>" +
      renderNotice() +
      '<div class="mys-actions coop-btn-row">' +
        '<button type="button" class="coop-btn ghost small" data-mys-action="rules">القواعد</button>' +
      "</div>" +
      renderPsychics() +
      "</div>";
  }

  function renderSide() {
    let ghostPanel = "";
    if (state.ghostIsHuman && canControlGhost()) {
      ghostPanel = '<section class="coop-panel"><div class="coop-panel-head"><h3>دفتر الروح</h3><small>سري — لك وحدك</small></div>' +
        '<div class="mys-secrets">' +
        psychics().map((player) => {
          const isTrue = player.index === state.trueSeat;
          return '<div class="mys-secret' + (isTrue ? " is-true" : "") + '">' +
            '<div class="mys-secret-head"><b>' + esc(player.name) + "</b>" + (isTrue ? "<span>الحقيقة</span>" : "") + "</div>" +
            '<div class="mys-trio">' +
              KIND_ORDER.map((kind) => cardMiniHTML(kind, state.targets[player.index][kind])).join("") +
            "</div>" +
            "</div>";
        }).join("") +
        "</div>" +
        '<p class="coop-note">أرسل رؤى تناسب رموز الهدف. المجموعة المعلّمة «الحقيقة» هي التي يجب أن يفوز تصويتها.</p>' +
        "</section>";
    } else {
      ghostPanel = '<section class="coop-panel"><div class="coop-panel-head"><h3>الروح</h3><small>زميل في الفريق</small></div>' +
        '<div class="mys-ghost-card"><span aria-hidden="true">🔮</span><div><strong>' +
        (state.ghostIsHuman ? "الروح يرسل الرؤى الآن" : "الروح الآلية") + "</strong>" +
        "<small>" + (state.ghostIsHuman ? "الرؤى تُرسل من شاشة الروح" : "دقة الرؤى: " + difficultyInfo().label) + "</small></div></div>" +
        '<p class="coop-note">الروح لا ينافس الفريق. يرى الحقيقة ويرسل صوراً فقط، والفريق يفسرها معاً.</p>' +
        "</section>";
    }

    return ghostPanel;
  }

  function render() {
    if (!rootRef || !state || destroyed) return;
    const key = state.step + ":" + state.activeSeat;
    if (key !== lastDealKey) {
      lastDealKey = key;
      selectedClues = [];
    }
    const header = renderTeamHeader();
    const objective = renderObjective();
    const stage = renderStage();
    const side = renderSide();
    rootRef.innerHTML = '<div class="coop-shell mys-shell">' +
      '<div class="coop-main">' + header + objective + stage + "</div>" +
      '<aside class="coop-side">' + side + "</aside>" +
      "</div>";
    if (apiRef && typeof apiRef.setStatus === "function") apiRef.setStatus(statusText(), "live");
    if (!applyingNet) netSync();
  }

  /* ------------------------------ التفاعل ------------------------------ */

  function toggleClue(id) {
    if (!state || !canControlGhost()) return;
    const max = state.step === "deal" ? 2 : state.step === "finalDeal" ? 1 : 0;
    if (!max || state.ghostHand.indexOf(id) < 0) return;
    const index = selectedClues.indexOf(id);
    if (index >= 0) selectedClues.splice(index, 1);
    else {
      if (selectedClues.length >= max) selectedClues.shift();
      selectedClues.push(id);
    }
    sound("click");
    render();
  }

  function sendSelected() {
    if (!state || !canControlGhost()) return;
    if (state.step === "deal") {
      if (selectedClues.length !== 2) return;
      const ids = selectedClues.slice();
      selectedClues = [];
      if (isGuest()) {
        guestSend({ t: "mys-deal", ids: ids });
        render();
        return;
      }
      dealVisions(state.activeSeat, ids);
      return;
    }
    if (state.step === "finalDeal") {
      if (selectedClues.length !== 1) return;
      const id = selectedClues[0];
      selectedClues = [];
      if (isGuest()) {
        guestSend({ t: "mys-final", id: id });
        render();
        return;
      }
      sendFinalVision(id);
    }
  }

  function localGuess(id) {
    if (!state || state.over || state.step !== "guess") return;
    if (!canHumanGuess()) return;
    if (isGuest()) {
      try { BG.net.send({ t: "mys-guess", id: id }); } catch (err) { /* ignore */ }
      return;
    }
    makeGuess(state.activeSeat, id);
  }

  function localHint() {
    if (!state || state.over || state.step !== "guess" || !canHumanGuess()) return;
    if (isGuest()) {
      try { BG.net.send({ t: "mys-hint" }); } catch (err) { /* ignore */ }
      return;
    }
    useHint(state.activeSeat);
  }

  function localVote(owner) {
    if (!state || state.over || state.step !== "vote" || !canHumanVote()) return;
    if (isGuest()) {
      try { BG.net.send({ t: "mys-vote", owner: owner }); } catch (err) { /* ignore */ }
      return;
    }
    const seat = voteSeat();
    if (seat >= 0) castVote(seat, owner);
  }

  function showRules() {
    try {
      if (apiRef && typeof apiRef.rules === "function") apiRef.rules();
      else BG.openRules(game, state ? { difficulty: state.difficulty } : {});
    } catch (err) { /* ignore */ }
  }

  function onClick(event) {
    if (!state) return;
    const clue = event.target.closest ? event.target.closest("[data-mys-clue]") : null;
    if (clue && !clue.disabled) {
      toggleClue(Number(clue.getAttribute("data-mys-clue")));
      return;
    }
    const pick = event.target.closest ? event.target.closest("[data-mys-pick]") : null;
    if (pick && !pick.disabled) {
      localGuess(pick.getAttribute("data-mys-pick"));
      return;
    }
    const vote = event.target.closest ? event.target.closest("[data-mys-vote]") : null;
    if (vote && !vote.disabled) {
      localVote(Number(vote.getAttribute("data-mys-vote")));
      return;
    }
    const action = event.target.closest ? event.target.closest("[data-mys-action]") : null;
    if (action) {
      const kind = action.getAttribute("data-mys-action");
      if (kind === "send-clue") sendSelected();
      else if (kind === "hint") localHint();
      else if (kind === "rules") showRules();
      return;
    }
  }

  /* ------------------------------ الشبكة ------------------------------ */

  function guestSend(payload) {
    if (!isGuest() || !BG.net) return false;
    try { return BG.net.send(payload); } catch (err) { return false; }
  }

  function seatForPeer(from) {
    if (!apiRef || !apiRef.net || !Array.isArray(apiRef.net.seats)) return -1;
    return apiRef.net.seats.findIndex((seat) => seat && seat.peerId === from);
  }

  function onNetMessage(event) {
    const data = event && event.data;
    if (!data || typeof data.t !== "string" || data.t.indexOf("mys-") !== 0) return;
    if (data.t === "mys-ghost") {
      if (!data || !Array.isArray(data.hand) || !state) return;
      ghostHandCache = data.hand.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      ghostTargetsCache = data.targets && typeof data.targets === "object" ? data.targets : null;
      ghostTrueSeatCache = Number.isInteger(data.trueSeat) ? data.trueSeat : -1;
      applyGhostCache();
      render();
      return;
    }
    if (!isHostOrLocal() || !state) return;
    const seat = seatForPeer(event.from);
    if (seat < 0) return;
    if (data.t === "mys-deal") {
      if (state.ghostIsHuman && seat === state.ghostSeat && state.step === "deal") {
        dealVisions(state.activeSeat, (Array.isArray(data.ids) ? data.ids : []).map((id) => Number(id)));
      }
      return;
    }
    if (data.t === "mys-final") {
      if (state.ghostIsHuman && seat === state.ghostSeat && state.step === "finalDeal") {
        sendFinalVision(Number(data.id));
      }
      return;
    }
    if (data.t === "mys-guess") {
      if (state.step === "guess" && seat === state.activeSeat) makeGuess(seat, String(data.id));
      return;
    }
    if (data.t === "mys-hint") {
      if (state.step === "guess" && seat === state.activeSeat) useHint(seat);
      return;
    }
    if (data.t === "mys-vote") {
      const owner = Number(data.owner);
      if (Number.isInteger(owner)) castVote(seat, owner);
    }
  }

  function publicSnapshot() {
    if (!state) return null;
    const copy = JSON.parse(JSON.stringify(state));
    copy.ghostHand = [];
    copy.visionDeck = [];
    copy.deckCount = state.visionDeck.length;
    copy.targets = {};
    copy.privateMasked = true;
    delete copy.fullState;
    if (!state.over) {
      copy.trueSeat = -1;
      copy.culprit = null;
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
    selectedClues = [];
    lastDealKey = "";
    const seats = (api && api.players ? api.players : []).slice(0, 7);
    const difficulty = (api && api.options && api.options.difficulty) || "medium";
    const ghostMode = (api && api.options && api.options.ghost) === "human" ? "human" : "ai";
    createState(seats, difficulty, ghostMode);
    const ghostName = state.ghostIsHuman ? (state.players[state.ghostSeat] || {}).name || "الروح" : "الروح الآلية";
    note("بدأ تحقيق <strong>ميستيريوم</strong> — فريق واحد: " + esc(ghostName) + " و" + ar(psychics().length) + " روحانيين. الفوز للجميع.", "accent");
    note("المرحلة الأولى: <strong>الاشتباه</strong>. على الروح إرسال رؤيتين، وعلى " + esc((state.players[state.activeSeat] || {}).name || "الروحاني") + " الاختيار.", "accent");
    rootRef.addEventListener("click", onClick);
    const netOff = bindNet();
    render();
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 450);

    let debugRef = null;
    try {
      if (new URLSearchParams(window.location.search).has("bgdebug")) {
        debugRef = {
          get state() { return state; },
          get api() { return apiRef; },
          snapshot() { return JSON.parse(JSON.stringify(state)); },
          setHours(value) { state.hours = Math.max(0, Number(value) || 0); render(); },
          forceDeal() { if (state.step === "deal") autoDeal(); },
          guess(id) { makeGuess(state.activeSeat, String(id)); },
          solvePhase() {
            const kind = state.phase;
            if (KIND_ORDER.indexOf(kind) < 0) return;
            psychics().forEach((player) => { player.progress[kind] = state.targets[player.index][kind]; });
            const nextKind = kind === "suspect" ? "location" : kind === "location" ? "weapon" : null;
            if (!nextKind) { beginFinal(); return; }
            state.phase = nextKind;
            state.visions = {};
            state.activeSeat = psychics()[0].index;
            state.step = "deal";
            state.nextAt = 0;
            render();
          },
          forceFinal() {
            psychics().forEach((player) => {
              KIND_ORDER.forEach((kind) => { player.progress[kind] = state.targets[player.index][kind]; });
            });
            beginFinal();
          },
          forceVote(seat, owner) { castVote(Number(seat), Number(owner)); },
          finish(win) { finishGame(!!win, "debug"); },
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
        applyingNet = true;
        try {
          const incoming = BG.netCodec.decode(snapshot);
          const full = !!(incoming && incoming.fullState);
          state = incoming;
          if (state) delete state.fullState;
          if (!state.log) state.log = [];
          if (!Array.isArray(state.players)) state.players = [];
          state.players.forEach((player) => {
            if (!player.progress) player.progress = { suspect: null, location: null, weapon: null };
            if (!Number.isFinite(player.clairvoyance)) player.clairvoyance = 0;
          });
          if (!state.eliminated) state.eliminated = {};
          if (!state.votes) state.votes = {};
          if (!state.visions) state.visions = {};
          if (!state.ghostHand) state.ghostHand = [];
          if (!state.visionDeck) state.visionDeck = [];
          if (!Number.isFinite(state.hours)) state.hours = state.maxHours || 7;
          if (!state.targets) state.targets = {};
          if (isGhostViewer()) {
            if (full) {
              ghostHandCache = (state.ghostHand || []).map((id) => Number(id));
              ghostTargetsCache = JSON.parse(JSON.stringify(state.targets || {}));
              ghostTrueSeatCache = Number.isInteger(state.trueSeat) ? state.trueSeat : -1;
            } else {
              applyGhostCache();
            }
          }
          lastDealKey = "";
          render();
        } finally {
          applyingNet = false;
        }
      },
      netSeat() { return -1; },
      netOver() { return !!(state && state.over); },
      netResume() { if (state) render(); },
      destroy() {
        destroyed = true;
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = null;
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
