/* ==========================================================================
   ريسك — السيطرة على العالم (إعادة بناء كاملة)
   خريطة عالم حقيقية من Natural Earth، قواعد Classic Risk، مهمات سرية،
   بطاقات أراضٍ، ذكاء استراتيجي، وأونلاين متوافق مع غرفة الألعاب.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;
  const GEO = window.RISK_GEO || null;

  const PCOLORS = ["#e07a5f", "#5b9bd5", "#f2c14e", "#67b99a", "#b07cc6", "#ef9f4f"];
  const PLAYER_NAMES = ["القائد الأحمر", "القائد الأزرق", "القائد الذهبي", "القائد الأخضر", "القائد البنفسجي", "القائد البرتقالي"];

  const RULE_DEFAULTS = {
    map: "classic",
    victory: "both",
    cards: "classic",
    fortify: "connected",
    reinforce: "classic",
    setup: "random",
    setupArmies: "classic",
  };

  /* ------------------------------ القارات والأقاليم ------------------------------ */

  const CONTINENTS = {
    na: { name: "أمريكا الشمالية", short: "أمريكا الشمالية", bonus: 5, color: "#d98b63" },
    sa: { name: "أمريكا الجنوبية", short: "أمريكا الجنوبية", bonus: 2, color: "#d3b45c" },
    eu: { name: "أوروبا", short: "أوروبا", bonus: 5, color: "#69a7c9" },
    af: { name: "أفريقيا", short: "أفريقيا", bonus: 3, color: "#c77e68" },
    as: { name: "آسيا", short: "آسيا", bonus: 7, color: "#9c86c9" },
    au: { name: "أوقيانوسيا", short: "أوقيانوسيا", bonus: 2, color: "#65b394" },
  };

  const TERRITORIES = [
    { id: "alaska", name: "ألاسكا", short: "ألاسكا", c: "na" },
    { id: "nwt", name: "الشمال الغربي", short: "الشمال الغربي", c: "na" },
    { id: "greenland", name: "غرينلاند", short: "غرينلاند", c: "na" },
    { id: "alberta", name: "ألبرتا", short: "ألبرتا", c: "na" },
    { id: "ontario", name: "أونتاريو", short: "أونتاريو", c: "na" },
    { id: "quebec", name: "كيبيك", short: "كيبيك", c: "na" },
    { id: "wus", name: "غرب الولايات المتحدة", short: "غرب أمريكا", c: "na" },
    { id: "eus", name: "شرق الولايات المتحدة", short: "شرق أمريكا", c: "na" },
    { id: "central", name: "أمريكا الوسطى", short: "أمريكا الوسطى", c: "na" },
    { id: "venezuela", name: "فنزويلا", short: "فنزويلا", c: "sa" },
    { id: "peru", name: "بيرو", short: "بيرو", c: "sa" },
    { id: "brazil", name: "البرازيل", short: "البرازيل", c: "sa" },
    { id: "argentina", name: "الأرجنتين", short: "الأرجنتين", c: "sa" },
    { id: "iceland", name: "آيسلندا", short: "آيسلندا", c: "eu" },
    { id: "britain", name: "بريطانيا", short: "بريطانيا", c: "eu" },
    { id: "scandinavia", name: "إسكندنافيا", short: "إسكندنافيا", c: "eu" },
    { id: "neurope", name: "شمال أوروبا", short: "شمال أوروبا", c: "eu" },
    { id: "weurope", name: "غرب أوروبا", short: "غرب أوروبا", c: "eu" },
    { id: "seurope", name: "جنوب أوروبا", short: "جنوب أوروبا", c: "eu" },
    { id: "ukraine", name: "أوكرانيا", short: "أوكرانيا", c: "eu" },
    { id: "nafrica", name: "شمال أفريقيا", short: "شمال أفريقيا", c: "af" },
    { id: "egypt", name: "مصر", short: "مصر", c: "af" },
    { id: "eafrica", name: "شرق أفريقيا", short: "شرق أفريقيا", c: "af" },
    { id: "congo", name: "الكونغو", short: "الكونغو", c: "af" },
    { id: "safrica", name: "جنوب أفريقيا", short: "جنوب أفريقيا", c: "af" },
    { id: "madagascar", name: "مدغشقر", short: "مدغشقر", c: "af" },
    { id: "mideast", name: "الشرق الأوسط", short: "الشرق الأوسط", c: "as" },
    { id: "ural", name: "الأورال", short: "الأورال", c: "as" },
    { id: "siberia", name: "سيبيريا", short: "سيبيريا", c: "as" },
    { id: "yakutsk", name: "ياقوتيا", short: "ياقوتيا", c: "as" },
    { id: "irkutsk", name: "إيركوتسك", short: "إيركوتسك", c: "as" },
    { id: "mongolia", name: "منغوليا", short: "منغوليا", c: "as" },
    { id: "china", name: "الصين", short: "الصين", c: "as" },
    { id: "japan", name: "اليابان", short: "اليابان", c: "as" },
    { id: "india", name: "الهند", short: "الهند", c: "as" },
    { id: "afghanistan", name: "أفغانستان", short: "أفغانستان", c: "as" },
    { id: "siam", name: "سيام", short: "سيام", c: "as" },
    { id: "kamchatka", name: "كامتشاتكا", short: "كامتشاتكا", c: "as" },
    { id: "indonesia", name: "إندونيسيا", short: "إندونيسيا", c: "au" },
    { id: "newguinea", name: "غينيا الجديدة", short: "غينيا الجديدة", c: "au" },
    { id: "waustralia", name: "غرب أستراليا", short: "غرب أستراليا", c: "au" },
    { id: "eaustralia", name: "شرق أستراليا", short: "شرق أستراليا", c: "au" },
  ];

  const EDGES = [
    ["alaska", "nwt"], ["alaska", "alberta"], ["alaska", "kamchatka"],
    ["nwt", "alberta"], ["nwt", "ontario"], ["nwt", "greenland"],
    ["greenland", "ontario"], ["greenland", "quebec"], ["greenland", "iceland"],
    ["alberta", "ontario"], ["alberta", "wus"],
    ["ontario", "quebec"], ["ontario", "eus"], ["ontario", "wus"],
    ["quebec", "eus"], ["wus", "eus"], ["wus", "central"], ["eus", "central"],
    ["central", "venezuela"],
    ["venezuela", "peru"], ["venezuela", "brazil"], ["peru", "brazil"],
    ["peru", "argentina"], ["brazil", "argentina"], ["brazil", "nafrica"],
    ["iceland", "britain"], ["iceland", "scandinavia"],
    ["britain", "scandinavia"], ["britain", "neurope"], ["britain", "weurope"],
    ["scandinavia", "neurope"], ["scandinavia", "ukraine"],
    ["neurope", "weurope"], ["neurope", "seurope"], ["neurope", "ukraine"],
    ["weurope", "seurope"], ["weurope", "nafrica"],
    ["seurope", "ukraine"], ["seurope", "mideast"], ["seurope", "egypt"], ["seurope", "nafrica"],
    ["ukraine", "mideast"], ["ukraine", "afghanistan"], ["ukraine", "ural"],
    ["nafrica", "egypt"], ["nafrica", "eafrica"], ["nafrica", "congo"],
    ["egypt", "mideast"], ["egypt", "eafrica"],
    ["eafrica", "congo"], ["eafrica", "safrica"], ["eafrica", "madagascar"], ["eafrica", "mideast"],
    ["congo", "safrica"], ["safrica", "madagascar"],
    ["mideast", "afghanistan"], ["mideast", "india"],
    ["ural", "afghanistan"], ["ural", "siberia"], ["ural", "china"],
    ["siberia", "yakutsk"], ["siberia", "irkutsk"], ["siberia", "mongolia"], ["siberia", "china"],
    ["yakutsk", "irkutsk"], ["yakutsk", "kamchatka"],
    ["irkutsk", "mongolia"], ["irkutsk", "kamchatka"],
    ["kamchatka", "mongolia"], ["kamchatka", "japan"],
    ["mongolia", "japan"], ["mongolia", "china"], ["japan", "china"],
    ["china", "siam"], ["china", "india"], ["china", "afghanistan"],
    ["afghanistan", "india"], ["india", "siam"], ["siam", "indonesia"],
    ["indonesia", "newguinea"], ["indonesia", "waustralia"],
    ["newguinea", "waustralia"], ["newguinea", "eaustralia"], ["waustralia", "eaustralia"],
  ];

  /* ------------------------------ بطاقات القيادة ------------------------------ */

  const CARD_TYPES = {
    infantry: { name: "مشاة", icon: "⚔️", color: "#e07a5f" },
    cavalry: { name: "فرسان", icon: "🐎", color: "#f2c14e" },
    artillery: { name: "مدفعية", icon: "💥", color: "#67b99a" },
    wild: { name: "جوكر", icon: "🃏", color: "#b07cc6" },
  };
  const CARD_KEYS = ["infantry", "cavalry", "artillery"];
  const CLASSIC_TRADE = [4, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50];

  /* ------------------------------ المهمات السرية ------------------------------ */

  const MISSION_LIBRARY = [
    {
      id: "conquer24",
      icon: "🌍",
      title: "السيطرة على 24 إقليمًا",
      detail: "امتلك 24 إقليمًا على الأقل في نهاية أي هجوم.",
      progress(p) {
        return { have: countTerritories(p.index), need: 24, text: countTerritories(p.index) + " / 24 إقليم" };
      },
      check(p) { return countTerritories(p.index) >= 24; },
    },
    {
      id: "defend18",
      icon: "🛡️",
      title: "18 إقليمًا محصّنًا",
      detail: "امتلك 18 إقليمًا على الأقل، وفي كل منها جيشان أو أكثر.",
      progress(p) {
        const have = territoriesOf(p.index).filter((id) => state.troops[id] >= 2).length;
        return { have, need: 18, text: have + " / 18 إقليم محصّن" };
      },
      check(p) {
        return territoriesOf(p.index).filter((id) => state.troops[id] >= 2).length >= 18;
      },
    },
    {
      id: "continents3",
      icon: "🧭",
      title: "السيطرة على ثلاث قارات",
      detail: "املأ ثلاث قارات كاملة بجيوشك.",
      progress(p) {
        const have = continentsOf(p.index).length;
        return { have, need: 3, text: have + " / 3 قارات" };
      },
      check(p) { return continentsOf(p.index).length >= 3; },
    },
    {
      id: "nafrica",
      icon: "🌎",
      title: "أمريكا الشمالية وأفريقيا",
      detail: "سيطر على قارتي أمريكا الشمالية وأفريقيا بالكامل.",
      progress(p) {
        const c = continentsOf(p.index);
        const have = (c.includes("na") ? 1 : 0) + (c.includes("af") ? 1 : 0);
        return { have, need: 2, text: (c.includes("na") ? "✔ أمريكا الشمالية" : "— أمريكا الشمالية") + " · " + (c.includes("af") ? "✔ أفريقيا" : "— أفريقيا") };
      },
      check(p) {
        const c = continentsOf(p.index);
        return c.includes("na") && c.includes("af");
      },
    },
    {
      id: "eu_sa_asia",
      icon: "🗺️",
      title: "أوروبا وأمريكا الجنوبية و4 آسيوية",
      detail: "سيطر على أوروبا وأمريكا الجنوبية، وامتلك 4 أقاليم في آسيا.",
      progress(p) {
        const c = continentsOf(p.index);
        const asia = territoriesOf(p.index).filter((id) => TERR_BY_ID[id].c === "as").length;
        const parts = [
          c.includes("eu") ? "✔ أوروبا" : "— أوروبا",
          c.includes("sa") ? "✔ أمريكا الجنوبية" : "— أمريكا الجنوبية",
          asia + " / 4 آسيا",
        ];
        return { have: (c.includes("eu") ? 1 : 0) + (c.includes("sa") ? 1 : 0) + Math.min(1, Math.floor(asia / 4)), need: 3, text: parts.join(" · ") };
      },
      check(p) {
        const c = continentsOf(p.index);
        const asia = territoriesOf(p.index).filter((id) => TERR_BY_ID[id].c === "as").length;
        return c.includes("eu") && c.includes("sa") && asia >= 4;
      },
    },
    {
      id: "eliminate",
      icon: "🎯",
      title: "إقصاء قائد محدد",
      detail: "أقصِ القائد المستهدف من الخريطة، سواء بنفسك أو بضربة من حليف!",
      target: true,
      progress(p) {
        const target = p.mission && p.mission.target != null ? state.players[p.mission.target] : null;
        if (!target) return { have: 0, need: 1, text: "—" };
        return { have: target.eliminated ? 1 : 0, need: 1, text: target.eliminated ? "✔ " + target.name : "استهدف: " + target.name };
      },
      check(p) {
        const target = p.mission && p.mission.target != null ? state.players[p.mission.target] : null;
        return !!(target && target.eliminated);
      },
    },
    {
      id: "asia_africa",
      icon: "🐘",
      title: "آسيا وأفريقيا",
      detail: "سيطر على قارتي آسيا وأفريقيا بالكامل.",
      progress(p) {
        const c = continentsOf(p.index);
        return { have: (c.includes("as") ? 1 : 0) + (c.includes("af") ? 1 : 0), need: 2, text: (c.includes("as") ? "✔ آسيا" : "— آسيا") + " · " + (c.includes("af") ? "✔ أفريقيا" : "— أفريقيا") };
      },
      check(p) {
        const c = continentsOf(p.index);
        return c.includes("as") && c.includes("af");
      },
    },
    {
      id: "continents4",
      icon: "👑",
      title: "السيطرة على أربع قارات",
      detail: "املأ أربع قارات كاملة بجيوشك.",
      progress(p) {
        const have = continentsOf(p.index).length;
        return { have, need: 4, text: have + " / 4 قارات" };
      },
      check(p) { return continentsOf(p.index).length >= 4; },
    },
    {
      id: "two_plus15",
      icon: "🏰",
      title: "قارتان و15 إقليمًا",
      detail: "سيطر على قارتين كاملتين وامتلك 15 إقليمًا على الأقل.",
      progress(p) {
        const c = continentsOf(p.index).length;
        const t = countTerritories(p.index);
        return { have: (c >= 2 ? 1 : 0) + (t >= 15 ? 1 : 0), need: 2, text: c + " قارات · " + t + " / 15 إقليم" };
      },
      check(p) {
        return continentsOf(p.index).length >= 2 && countTerritories(p.index) >= 15;
      },
    },
  ];

  /* ------------------------------ الحالة العامة ------------------------------ */

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let aiAttackCount = 0;
  let mapSvg = null;
  let mapShell = null;
  let sideEl = null;
  let secret = null;
  let camera = null;
  let cameraAnim = null;
  let lastMapId = null;
  let lastViewer = -1;
  let tradeSel = [];
  let tradeOwner = -1;
  let lastTradeTurn = -1;
  let suppressClick = false;
  let ready = false;

  const TERR_BY_ID = {};
  const ADJ = {};
  const CONTINENT_TERRITORIES = {};
  TERRITORIES.forEach((t) => { TERR_BY_ID[t.id] = t; ADJ[t.id] = []; });
  EDGES.forEach(([a, b]) => {
    if (!ADJ[a] || !ADJ[b]) return;
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
  });
  TERRITORIES.forEach((t) => {
    if (!CONTINENT_TERRITORIES[t.c]) CONTINENT_TERRITORIES[t.c] = [];
    CONTINENT_TERRITORIES[t.c].push(t.id);
  });

  const SEA_ROUTES = [
    ["alaska", "kamchatka"], ["brazil", "nafrica"], ["greenland", "iceland"],
    ["iceland", "britain"], ["iceland", "scandinavia"], ["britain", "neurope"],
    ["britain", "weurope"], ["britain", "scandinavia"], ["japan", "china"],
    ["japan", "mongolia"], ["indonesia", "waustralia"], ["newguinea", "waustralia"],
    ["newguinea", "eaustralia"], ["eafrica", "mideast"], ["madagascar", "eafrica"],
    ["madagascar", "safrica"],
  ];
  const SEA_KEY = new Set(SEA_ROUTES.map(([a, b]) => [a, b].sort().join("|")));

  /* ------------------------------ تعريف اللعبة ------------------------------ */

  const game = {
    id: "risk",
    name: "ريسك",
    en: "RISK",
    icon: "🌍",
    accent: "#e8836f",
    cardClass: "card-risk",
    tagline: "جيش، حصّن، واهجم — القارات تحتاج قادة لا يترددون.",
    players: "2–6",
    duration: "60–150 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 3,

    options: {
      hint: "خريطة العالم الكلاسيكية (42 إقليمًا) وقواعد ريسك الأصلية، مع مهمات سرية اختيارية.",
      defaults: Object.assign({}, RULE_DEFAULTS),
      fields: [
        {
          key: "victory",
          label: "شرط الفوز",
          type: "select",
          wide: true,
          choices: [
            { value: "both", label: "السيطرة 60% أو المهمة السرية" },
            { value: "elimination", label: "الكلاسيكي: إقصاء الجميع" },
            { value: "domination", label: "السيطرة على 60% من الأراضي" },
            { value: "mission", label: "المهمة السرية فقط" },
          ],
          hint: "«السيطرة أو المهمة» تجعل لكل قائد هدفًا خفيًا، مع بقاء السيطرة العسكرية طريقًا للفوز.",
        },
        {
          key: "cards",
          label: "بطاقات القيادة",
          type: "select",
          choices: [
            { value: "classic", label: "كلاسيكية: 42 بطاقة أراضٍ + جوكران" },
            { value: "simple", label: "مبسّطة: بلا أسماء أراضٍ" },
            { value: "off", label: "بلا بطاقات" },
          ],
          hint: "البطاقة الكلاسيكية تحمل إقليمًا ورمز مشاة/فرسان/مدفعية. مكافأة مطابقة الإقليم +2 كتيبة على الإقليم.",
        },
        {
          key: "fortify",
          label: "التحصين",
          type: "seg",
          choices: [
            { value: "connected", label: "متصل" },
            { value: "anywhere", label: "حر" },
            { value: "unlimited", label: "متعدد" },
            { value: "none", label: "بلا" },
          ],
          hint: "المتصل: نقل واحد بين إقليمين متجاورين. الحر: أي إقليم تملكه. المتعدد: نقلات متكررة.",
        },
        {
          key: "reinforce",
          label: "التعزيز",
          type: "seg",
          choices: [
            { value: "classic", label: "كلاسيكي" },
            { value: "rapid", label: "سريع +5" },
          ],
          hint: "الكلاسيكي: كتيبة لكل ثلاثة أراضٍ (بحد أدنى 3) + مكافآت القارات. السريع يمنح 5 كتائب أساسية.",
        },
        {
          key: "setup",
          label: "توزيع الأراضي",
          type: "seg",
          choices: [
            { value: "random", label: "عشوائي" },
            { value: "draft", label: "اختيار بالتبادل" },
          ],
          hint: "«اختيار بالتبادل» هو إعداد ريسك الأصلي: يختار كل قائد إقليمًا غير مملوك واحدًا في كل دور.",
        },
        {
          key: "setupArmies",
          label: "كتائب الإعداد",
          type: "seg",
          choices: [
            { value: "classic", label: "أصلي: 40…20" },
            { value: "quick", label: "سريع: +3" },
          ],
          hint: "الأصلي يوزّع 40 كتيبة للاعبين اثنين، وتنقص 5 لكل لاعب إضافي حتى 20 — شاملةً كتيبة كل إقليم.",
        },
      ],
      summary(options) {
        const o = Object.assign({}, RULE_DEFAULTS, options || {});
        const win = o.victory === "mission" ? "مهمة سرية" : o.victory === "domination" ? "سيطرة 60%" : o.victory === "elimination" ? "إقصاء الجميع" : "سيطرة + مهمة";
        const cards = o.cards === "off" ? "بلا بطاقات" : o.cards === "simple" ? "بطاقات مبسطة" : "بطاقات كلاسيكية";
        return "العالم الكلاسيكي · " + win + " · " + cards;
      },
    },

    rules: {
      goal: "اقضِ على قادة العالم أو أنجز مهمتك السرية قبلهم. السيطرة العسكرية الكاملة تبقى الطريق الكلاسيكي للفوز.",
      facts: [
        ["الخريطة", "42 إقليمًا · 6 قارات · Natural Earth"],
        ["الكتائب", "40 / 35 / 30 / 25 / 20 للاعبين 2–6"],
        ["النرد", "3 للمهاجم · 2 للمدافع"],
        ["البطاقات", "42 بطاقة أراضٍ + جوكران · تصاعد 4/6/8…"],
      ],
      components: [
        "خريطة العالم الكلاسيكية بـ42 إقليمًا وست قارات، مرسومة من بيانات Natural Earth الحقيقية.",
        "جيش لكل قائد بلون واضح، وكل قطعة تمثل كتيبة واحدة.",
        "نرد المعركة: حتى ثلاثة نرد للمهاجم ونردان للمدافع، مع اختيار عدد نرد المهاجم قبل كل ضربة.",
        "بطاقات قيادة كلاسيكية: 42 بطاقة أراضٍ ورمز مشاة أو فرسان أو مدفعية، مع جوكرين.",
        "مكافآت القارات: أمريكا الشمالية 5، أوروبا 5، آسيا 7، أفريقيا 3، أمريكا الجنوبية 2، أوقيانوسيا 2.",
        "مهمة سرية لكل قائد عند اختيار وضع المهمات، تُعرض في لوحة سرّية ولا يراها الخصوم.",
      ],
      setup: [
        "تُوزَّع الأراضي عشوائيًا بالتساوي، أو تُختار بالتبادل حسب إعداد «توزيع الأراضي».",
        "يضع كل قائد كتيبة واحدة في كل إقليم يملكه. ثم يوزّع كتائب الإعداد: 40 للاعبين اثنين، وتنقص 5 لكل لاعب إضافي حتى 20 — شاملةً كتيبة كل إقليم.",
        "في الوضع السريع يضيف كل قائد 3 كتائب فقط فوق كتائب الأراضي.",
        "إذا كانت المهمات مفعّلة، تُسند لكل قائد مهمة سرية عشوائية قبل بدء الإعداد.",
      ],
      steps: [
        "<strong>التعزيز:</strong> احصل على كتيبة لكل ثلاثة أراضٍ (بحد أدنى 3)، أو 5 كتائب في الوضع السريع، وأضف مكافآت القارات التي تسيطر عليها بالكامل. وزّعها بالنقر على أراضيك.",
        "<strong>البطاقات:</strong> عند استحواذك على إقليم واحد على الأقل خلال دورك تحصل على بطاقة عند إنهاء الدور (حتى 5 في اليد). بدّل ثلاث بطاقات متشابهة أو واحدة من كل نوع، والجوكر يصلح بدلًا عن أي نوع. التصاعد: 4 ثم 6 ثم 8 ثم 10 ثم 12 ثم 15 ثم 20…",
        "<strong>مكافأة الإقليم:</strong> إذا احتوت مجموعة البطاقات على إقليم تملكه، تحصل على كتيبتين إضافيتين على ذلك الإقليم مباشرة.",
        "<strong>الهجوم:</strong> اختر إقليمًا تملكه وفيه كتيبتان على الأقل، ثم اضغط على إقليم مجاور معادٍ. اختر عدد نرد المهاجم (1–3)، ويرمي المدافع تلقائيًا حتى نردين. قارن النتائج من الأعلى للأدنى: كل نرد مهاجم أعلى يقتل كتيبة مدافعة، وكل نرد مدافع مساوٍ أو أعلى يقتل كتيبة مهاجمة.",
        "<strong>الاستحواذ:</strong> إذا خسر المدافع آخر كتيبة ينتقل الإقليم إلى المهاجم. اختر عدد الكتائب التي ستنقلها (على الأقل عدد النرد المستخدم، وعلى الأكثر كل ما تبقى ناقص واحدة) عبر شريط الأعداد ثم أكّد.",
        "<strong>التحصين:</strong> بعد الهجوم يمكنك نقل كتائب من إقليم تملكه إلى إقليم آخر تملكه حسب قانون التحصين. حدّد العدد بشريط الأعداد أو أزرار الزيادة والنقصان، ويمكنك الرجوع قبل التأكيد.",
        "<strong>المهمة السرية:</strong> تحقق شرط مهمتك في أي لحظة من دورك لتفوز. تظهر مهمتك فقط في لوحتك السرية، وتُكشف جميع المهمات عند نهاية المباراة.",
      ],
      winning: "يفوز آخر قائد يحتفظ بأراضٍ، أو أول قائد يبلغ شرط السيطرة المختار، أو أول قائد ينجز مهمته السرية في أوضاع المهمات. تُعلن النتيجة فور تحقق الشرط.",
      notes: [
        "خريطة اللعب مبنية من بيانات Natural Earth (الملكية العامة) وتُعرض بمسارات SVG جاهزة.",
        "تقسيم روسيا إلى أقاليم ريسك الخمسة يتم بقصّ جغرافي دقيق، مع الحفاظ على حدود الدول الداخلية.",
        "نرد المدافع تلقائي إلى أقصى عدد ممكن لتسريع اللعب؛ نرد المهاجم قابل للاختيار.",
        "بطاقات القيادة والمهمات تُعرض داخل لوحة سرّية؛ يمكن تفعيل زر الإخفاء من الإعدادات الرئيسية.",
        "الكمبيوتر يدير أدواره تلقائيًا حسب مستوى الصعوبة: سهل، متوسط، أو صعب.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      aiAttackCount = 0;
      tradeSel = [];
      tradeOwner = -1;
      lastTradeTurn = -1;
      ready = false;
      const rules = Object.assign({}, RULE_DEFAULTS, api.options || {});
      buildState(rules, api.players);
      buildShell();
      ready = true;
      render();
      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__riskDebug = {
          get state() { return state; },
          render,
          adj: (id) => (ADJ[id] || []).slice(),
        };
      }
      if (rules.setup === "draft") {
        apiRef.log("بدأت ريسك — العالم الكلاسيكي. اختيار الأراضي بالتبادل يبدأ الآن.", "accent");
      } else {
        apiRef.log("بدأت ريسك — العالم الكلاسيكي (" + TERRITORIES.length + " إقليمًا). الإعداد: " + setupRemaining(state.players[0]) + " كتيبة إضافية لكل قائد.", "accent");
      }
      if (!apiRef.net) {
        requestAnimationFrame(() => {
          try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (err) { window.scrollTo(0, 0); }
        });
      }
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          const mapChanged = !state || state.mapId !== (data.mapId || (data.rules && data.rules.map));
          state = BG.netCodec.decode(data);
          state.rules = Object.assign({}, RULE_DEFAULTS, state.rules || {});
          state.mapId = "classic";
          state.owner = state.owner || {};
          state.troops = state.troops || {};
          state.deck = state.deck || [];
          state.discard = state.discard || [];
          state.players = state.players || [];
          state.turn = Number.isFinite(Number(state.turn)) ? Number(state.turn) : 0;
          state.cardTrades = Number.isFinite(Number(state.cardTrades)) ? Number(state.cardTrades) : 0;
          state.reinforceLog = state.reinforceLog || [];
          state.players.forEach((p) => {
            p.cards = (p.cards || []).map((c) => (typeof c === "string" ? { t: c, terr: null } : c));
            p.isCpu = AI.isCpu(p);
            p.level = AI.level(p.level);
          });
          if (!state.battle) state.battle = null;
          if (mapChanged) {
            lastMapId = null;
            buildShell();
          } else if (!mapSvg || !mapSvg.isConnected) {
            buildShell();
          }
          const viewer = viewerSeat();
          if (viewer !== lastViewer) {
            lastViewer = viewer;
            tradeSel = [];
          }
          render();
        },
        netSeat() {
          if (!state) return -1;
          return activeSeat();
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state) return;
          render();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          teardownShell();
          rootRef = null;
          apiRef = null;
          state = null;
          mapSvg = null;
          mapShell = null;
          sideEl = null;
          secret = null;
          camera = null;
          ready = false;
        },
      };
    },
  };

  /* ------------------------------ بناء الحالة ------------------------------ */

  function buildState(rules, apiPlayers) {
    const players = apiPlayers.map((p, i) => ({
      index: i,
      name: p.name || PLAYER_NAMES[i % PLAYER_NAMES.length],
      type: p.type === "cpu" ? "cpu" : "human",
      level: AI.level(p.level),
      isCpu: AI.isCpu(p),
      color: PCOLORS[i % PCOLORS.length],
      cards: [],
      eliminated: false,
      exchanges: 0,
      mission: null,
    }));

    const owner = {};
    const troops = {};
    TERRITORIES.forEach((t) => { owner[t.id] = -1; troops[t.id] = 0; });

    if (rules.setup === "random") {
      const ids = U.shuffle(TERRITORIES.map((t) => t.id));
      ids.forEach((id, i) => {
        owner[id] = i % players.length;
        troops[id] = 1;
      });
    }

    state = {
      rules: Object.assign({}, RULE_DEFAULTS, rules || {}),
      mapId: "classic",
      players,
      owner,
      troops,
      current: 0,
      phase: rules.setup === "draft" ? "claim" : "setup",
      toPlace: 0,
      setupPlayer: 0,
      claimPlayer: 0,
      claimCount: 0,
      selected: null,
      mode: "reinforce",
      battle: null,
      notice: "",
      conquered: false,
      fortifyUsed: false,
      fortifyFrom: null,
      fortifyTo: null,
      pendingMove: null,
      over: false,
      winner: null,
      winReason: "",
      turn: 0,
      deck: [],
      discard: [],
      cardTrades: 0,
      attackDice: 3,
      reinforceLog: [],
      firstPlayer: 0,
      missionMode: rules.victory === "mission" || rules.victory === "both",
    };

    if (rules.cards === "classic") state.deck = buildClassicDeck();
    if (state.missionMode) assignMissions();

    if (rules.setup === "draft") {
      state.claimCount = 0;
      state.claimPlayer = 0;
      state.current = 0;
      state.notice = "اختيار الأراضي: دور " + players[0].name + " — انقر على إقليم غير مملوك.";
    } else {
      state.setupPlayer = 0;
      state.current = 0;
      state.toPlace = setupRemaining(players[0]);
      state.notice = "الإعداد: دور " + players[0].name + " — وزّع " + state.toPlace + " كتيبة إضافية.";
    }

    if (new URLSearchParams(location.search).has("bgdebug")) {
      window.__bgDebug = {
        get state() { return state; },
        get adj() { return ADJ; },
        get camera() { return camera; },
        render, beginTurn, resolveBattle: attack, endTurn, exchangeCards, canExchange,
        territoriesOf, continentsOf, reinforceAmount, nextPlayer, checkVictory,
        claimTerritory, placeSetup, autoPlaceSetup, placeReinforcement,
        selectForAttack, attack, applyConquestMove, startFortify, fortifyClick,
        performFortify, cancelFortify, nextTradeValue, findSet, bestTradeSet,
        missionStatus, assignMissions, focusContinent, resetCamera,
        setupRemaining,
      };
    }
  }

  /* ------------------------------ أدوات الحالة ------------------------------ */

  function rule(key) {
    const value = state && state.rules ? state.rules[key] : undefined;
    return value === undefined || value === null ? RULE_DEFAULTS[key] : value;
  }

  function cur() {
    return state ? state.players[state.current] : null;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function activeSeat() {
    if (!state) return -1;
    if (state.phase === "claim") return state.claimPlayer;
    if (state.phase === "setup") return state.setupPlayer;
    if (state.phase === "over") return -1;
    return state.current;
  }

  function viewerSeat() {
    if (!state) return -1;
    if (isOnline()) {
      return Number.isInteger(apiRef.net.seat) && apiRef.net.seat >= 0 ? apiRef.net.seat : -1;
    }
    const seat = activeSeat();
    if (seat < 0) return -1;
    const player = state.players[seat];
    return player && !player.isCpu ? seat : -1;
  }

  function viewerPlayer() {
    const index = viewerSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function canAct() {
    if (!state || state.over || state.phase === "over" || state.pendingMove) return false;
    const seat = activeSeat();
    if (seat < 0) return false;
    const player = state.players[seat];
    if (!player) return false;
    if (isOnline()) {
      return apiRef.net.seat === seat && !apiRef.net.isCpuSeat(seat);
    }
    return !player.isCpu;
  }

  function territoriesOf(index) {
    return TERRITORIES.filter((t) => state.owner[t.id] === index).map((t) => t.id);
  }

  function countTerritories(index) {
    return territoriesOf(index).length;
  }

  function continentsOf(index) {
    return Object.keys(CONTINENTS).filter((code) => {
      const all = CONTINENT_TERRITORIES[code];
      return all && all.length && all.every((id) => state.owner[id] === index);
    });
  }

  function continentOwner(code) {
    const all = CONTINENT_TERRITORIES[code] || [];
    if (!all.length) return -1;
    const first = state.owner[all[0]];
    if (first < 0) return -1;
    return all.every((id) => state.owner[id] === first) ? first : -1;
  }

  function continentCount(code, index) {
    const all = CONTINENT_TERRITORIES[code] || [];
    return all.filter((id) => state.owner[id] === index).length;
  }

  function reinforceAmount(index) {
    const base = rule("reinforce") === "rapid" ? 5 : Math.max(3, Math.floor(countTerritories(index) / 3));
    const bonus = continentsOf(index).reduce((sum, c) => sum + CONTINENTS[c].bonus, 0);
    return base + bonus;
  }

  function setupArmyTotal(count) {
    return Math.max(20, 40 - (count - 2) * 5);
  }

  function setupRemaining(player) {
    if (!player) return 0;
    if (rule("setupArmies") !== "classic") return 3;
    return Math.max(0, setupArmyTotal(state.players.length) - countTerritories(player.index));
  }

  function nextPlayer(from) {
    if (!state || !state.players.length) return from;
    let i = from;
    for (let step = 0; step < state.players.length; step++) {
      i = (i + 1) % state.players.length;
      if (!state.players[i].eliminated) return i;
    }
    return from;
  }

  function activePlayers() {
    return state.players.filter((p) => !p.eliminated);
  }

  function adjacentOwned(terrId, index) {
    return (ADJ[terrId] || []).filter((id) => state.owner[id] === index);
  }

  function adjacentEnemies(terrId, index) {
    return (ADJ[terrId] || []).filter((id) => state.owner[id] !== index);
  }

  function testAdjacency(a, b) {
    return !!(ADJ[a] && ADJ[a].includes(b));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pcolor(index) {
    return state && state.players[index] ? state.players[index].color : "#8a9aa0";
  }

  function playerName(index) {
    return state && state.players[index] ? state.players[index].name : "غير مملوك";
  }

  /* ------------------------------ البطاقات والمهمات ------------------------------ */

  function cardTypeKey(card) {
    return card && CARD_TYPES[card.t] ? card.t : "infantry";
  }

  function cardLabel(card) {
    const info = CARD_TYPES[cardTypeKey(card)] || CARD_TYPES.infantry;
    const terr = card && card.terr && TERR_BY_ID[card.terr] ? TERR_BY_ID[card.terr].name : "";
    return info.name + (terr ? " — " + terr : "");
  }

  function buildClassicDeck() {
    const deck = [];
    TERRITORIES.forEach((t, i) => {
      deck.push({ t: CARD_KEYS[i % CARD_KEYS.length], terr: t.id });
    });
    deck.push({ t: "wild", terr: null }, { t: "wild", terr: null });
    return U.shuffle(deck);
  }

  function nextTradeValue() {
    const n = state ? state.cardTrades || 0 : 0;
    if (rule("cards") === "simple") return 4 + n * 2;
    if (n < CLASSIC_TRADE.length) return CLASSIC_TRADE[n];
    return 50 + (n - CLASSIC_TRADE.length + 1) * 5;
  }

  function cardSetScore(indices, cards, owner) {
    let score = 0;
    let wilds = 0;
    const ownerIndex = Number.isInteger(owner) ? owner : state.current;
    indices.forEach((i) => {
      const card = cards[i];
      if (!card) return;
      if (card.t === "wild") wilds += 1;
      else if (card.terr && state.owner[card.terr] === ownerIndex) score += 2.4;
    });
    return score - wilds * 0.5;
  }

  function isValidSet(indices, cards) {
    if (!Array.isArray(indices) || indices.length !== 3) return false;
    const chosen = indices.map((i) => cards[i]).filter(Boolean);
    if (chosen.length !== 3) return false;
    const nonWild = chosen.filter((c) => c && c.t !== "wild");
    const wilds = 3 - nonWild.length;
    if (!nonWild.length) return true;
    if (nonWild.every((c) => c.t === nonWild[0].t)) return true;
    const types = new Set(nonWild.map((c) => c.t));
    return types.size === nonWild.length && types.size + wilds >= 3;
  }

  function findSet(cards, owner) {
    if (!Array.isArray(cards) || cards.length < 3) return null;
    let best = null;
    for (let i = 0; i < cards.length - 2; i++) {
      for (let j = i + 1; j < cards.length - 1; j++) {
        for (let k = j + 1; k < cards.length; k++) {
          const indices = [i, j, k];
          if (!isValidSet(indices, cards)) continue;
          const score = cardSetScore(indices, cards, owner);
          if (!best || score > best.score) best = { indices, score };
        }
      }
    }
    return best;
  }

  function canExchange(player) {
    if (!player || rule("cards") === "off") return false;
    return !!findSet(player.cards, player.index);
  }

  function bestTradeSet(player) {
    return player ? findSet(player.cards, player.index) : null;
  }

  function exchangeCards(indices) {
    if (!state || state.over) return;
    if (state.phase !== "reinforce" && state.phase !== "attack") return;
    if (state.pendingMove) return;
    const player = cur();
    if (!player) return;
    const cards = player.cards || [];
    let picks = Array.isArray(indices) && indices.length ? indices.slice() : null;
    if (!picks || !isValidSet(picks, cards)) {
      const best = findSet(cards, player.index);
      if (!best) {
        BG.toast("تحتاج ثلاث بطاقات متشابهة أو واحدة من كل نوع.", "warn");
        if (FX) FX.sound("error");
        return;
      }
      picks = best.indices;
    }
    picks = Array.from(new Set(picks)).sort((a, b) => b - a);
    const removed = [];
    picks.forEach((i) => {
      const card = player.cards.splice(i, 1)[0];
      if (card) removed.push(card);
    });
    if (removed.length !== 3) return;
    if (rule("cards") === "classic") state.discard = state.discard.concat(removed);
    const bonus = nextTradeValue();
    state.cardTrades = (state.cardTrades || 0) + 1;
    player.exchanges = (player.exchanges || 0) + 1;
    state.toPlace = (state.toPlace || 0) + bonus;
    if (state.phase === "attack") {
      state.phase = "reinforce";
      state.mode = "reinforce";
    }
    let territoryBonus = 0;
    if (rule("cards") === "classic") {
      removed.forEach((card) => {
        if (!card.terr || state.owner[card.terr] !== player.index) return;
        state.troops[card.terr] += 2;
        territoryBonus += 2;
        if (FX) {
          FX.after(() => {
            const el = mapSvg && mapSvg.querySelector('[data-terr="' + card.terr + '"] .risk-troops');
            if (el) { FX.pop(el); FX.floatText(el, "+2", "good"); }
          }, 80);
        }
      });
    }
    tradeSel = [];
    tradeOwner = player.index;
    apiRef.log("بدّل <strong>" + U.escape(player.name) + "</strong> " + removed.map(cardLabel).join(" + ") + " مقابل " + bonus + " كتيبة" + (territoryBonus ? " + " + territoryBonus + " على الأراضي المطابقة" : "") + ".", "good");
    state.notice = "+" + bonus + " كتيبة من البطاقات" + (territoryBonus ? " + " + territoryBonus + " على أرضٍ مطابقة" : "") + " — بقيت " + state.toPlace + " للتعزيز.";
    if (FX) FX.sound("coin");
    if (checkVictory()) return;
    render();
  }

  function drawCard(player) {
    if (rule("cards") === "off" || !player) return null;
    let card = null;
    if (rule("cards") === "simple") {
      card = { t: U.pick(CARD_KEYS), terr: null };
    } else {
      if (!state.deck.length) {
        state.deck = U.shuffle((state.discard || []).slice());
        state.discard = [];
      }
      card = state.deck.pop() || null;
    }
    if (!card) return null;
    player.cards.push(card);
    return card;
  }

  function handLimitBlocked(player) {
    if (!player || rule("cards") === "off") return false;
    return player.cards.length >= 5 && !!findSet(player.cards);
  }

  function assignMissions() {
    if (!state) return;
    const pool = U.shuffle(MISSION_LIBRARY.slice());
    state.players.forEach((p, i) => {
      const template = pool[i % pool.length];
      p.mission = {
        id: template.id,
        icon: template.icon,
        title: template.title,
        detail: template.detail,
        target: template.target ? (i + 1) % state.players.length : null,
      };
    });
  }

  function missionTemplate(player) {
    if (!player || !player.mission) return null;
    return MISSION_LIBRARY.find((m) => m.id === player.mission.id) || null;
  }

  function missionStatus(player) {
    const template = missionTemplate(player);
    if (!template || !player.mission) return null;
    const progress = typeof template.progress === "function" ? template.progress(player) : null;
    return {
      icon: player.mission.icon,
      title: player.mission.title,
      detail: player.mission.detail,
      progress,
      done: typeof template.check === "function" ? !!template.check(player) : false,
    };
  }

  function checkMission(player) {
    const template = missionTemplate(player);
    if (!template) return false;
    return typeof template.check === "function" ? !!template.check(player) : false;
  }

  /* ------------------------------ الإعداد ------------------------------ */

  function claimTerritory(terrId) {
    if (!state || state.phase !== "claim" || state.over) return;
    if (!TERR_BY_ID[terrId]) return;
    if (state.owner[terrId] !== -1) {
      BG.toast("هذا الإقليم مملوك بالفعل — اختر إقليمًا رماديًا.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const player = state.players[state.claimPlayer];
    state.owner[terrId] = player.index;
    state.troops[terrId] = 1;
    state.claimCount = (state.claimCount || 0) + 1;
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = mapSvg && mapSvg.querySelector('[data-terr="' + terrId + '"] .risk-troops');
        if (el) { FX.pop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    apiRef.log("<strong>" + U.escape(player.name) + "</strong> اختار " + U.escape(TERR_BY_ID[terrId].name) + ".", "");
    if (state.claimCount >= TERRITORIES.length) {
      state.phase = "setup";
      state.setupPlayer = 0;
      state.current = 0;
      state.toPlace = setupRemaining(state.players[0]);
      state.notice = "اكتمل اختيار الأراضي. الإعداد: دور " + state.players[0].name + " — وزّع " + state.toPlace + " كتيبة إضافية.";
      apiRef.log("اكتمل اختيار الأراضي — يبدأ توزيع كتائب الإعداد.", "accent");
    } else {
      state.claimPlayer = nextPlayer(state.claimPlayer);
      state.current = state.claimPlayer;
      state.notice = "اختيار الأراضي: دور " + state.players[state.claimPlayer].name + " — انقر على إقليم غير مملوك.";
    }
    render();
  }

  function finishSetup() {
    if (!state) return;
    state.phase = "reinforce";
    state.setupPlayer = null;
    state.toPlace = 0;
    apiRef.log("انتهى الإعداد — تبدأ المعارك.", "accent");
    beginTurn(0);
  }

  function advanceSetup() {
    const next = nextPlayer(state.setupPlayer);
    if (next <= state.setupPlayer) {
      finishSetup();
      return;
    }
    state.setupPlayer = next;
    state.current = next;
    state.toPlace = setupRemaining(state.players[next]);
    state.notice = "الإعداد: دور " + state.players[next].name + " — وزّع " + state.toPlace + " كتيبة إضافية.";
    apiRef.log("انتهى إعداد <strong>" + U.escape(state.players[next].name) + "</strong>", "");
    render();
  }

  function placeSetup(terrId) {
    if (!state || state.phase !== "setup" || state.over) return;
    if (state.owner[terrId] !== state.setupPlayer) {
      BG.toast("اختر إقليمًا تملكه أنت.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (state.toPlace <= 0) {
      advanceSetup();
      return;
    }
    state.troops[terrId] += 1;
    state.toPlace -= 1;
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = mapSvg && mapSvg.querySelector('[data-terr="' + terrId + '"] .risk-troops');
        if (el) { FX.hop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    if (state.toPlace <= 0) {
      advanceSetup();
      return;
    }
    state.notice = "الإعداد: " + state.players[state.setupPlayer].name + " — بقيت " + state.toPlace + " كتيبة.";
    render();
  }

  function autoPlaceSetup() {
    if (!state || state.phase !== "setup" || state.toPlace <= 0) return;
    const player = state.players[state.setupPlayer];
    if (!player) return;
    const list = territoriesOf(player.index)
      .slice()
      .sort((a, b) => setupTerritoryScore(b, player) - setupTerritoryScore(a, player));
    if (!list.length) return;
    const focus = list.slice(0, Math.min(4, list.length));
    let index = 0;
    let guard = 0;
    while (state.toPlace > 0 && guard < 120) {
      const id = focus[index % focus.length];
      state.troops[id] += 1;
      state.toPlace -= 1;
      index += 1;
      guard += 1;
    }
    if (FX) FX.sound("build");
    apiRef.log("وزّع <strong>" + U.escape(player.name) + "</strong> كتائب الإعداد تلقائيًا.", "");
    if (state.toPlace <= 0) {
      advanceSetup();
      return;
    }
    render();
  }

  function setupTerritoryScore(id, player) {
    const enemies = adjacentEnemies(id, player.index);
    let score = enemies.length * 2.2;
    enemies.forEach((e) => { score += state.troops[e] * 0.35; });
    score += continentProgressScore(id, player) * 1.4;
    if (enemies.length === 0) score -= 1.5;
    return score;
  }

  /* ------------------------------ الدور والتعزيز ------------------------------ */

  function beginTurn(index) {
    if (!state || state.over) return;
    state.current = index;
    state.phase = "reinforce";
    state.mode = "reinforce";
    state.toPlace = reinforceAmount(index);
    state.selected = null;
    state.battle = null;
    state.conquered = false;
    state.fortifyUsed = false;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    state.reinforceLog = [];
    state.attackDice = 3;
    state.turn = (state.turn || 0) + 1;
    aiAttackCount = 0;
    tradeSel = [];
    tradeOwner = index;
    lastTradeTurn = state.turn;
    state.notice = "دور " + state.players[index].name + " — وزّع " + state.toPlace + " كتيبة تعزيز.";
    if (FX) FX.sound("turn");
    if (checkVictory()) return;
    render();
  }

  function placeReinforcement(terrId) {
    if (!state || state.phase !== "reinforce" || state.over) return;
    if (state.toPlace <= 0) {
      BG.toast("وزّعت كل التعزيزات — انتقل إلى الهجوم.", "warn");
      return;
    }
    if (state.owner[terrId] !== state.current) {
      BG.toast("يمكنك تعزيز أراضيك فقط.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    state.troops[terrId] += 1;
    state.toPlace -= 1;
    state.reinforceLog.push(terrId);
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = mapSvg && mapSvg.querySelector('[data-terr="' + terrId + '"] .risk-troops');
        if (el) { FX.pop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    if (state.toPlace <= 0) {
      state.phase = "attack";
      state.mode = "attack";
      state.notice = "وزّعت كل التعزيزات. اختر إقليمًا للمهاجمة، أو حصّن ثم أنهِ الدور.";
      apiRef.log("وزّع <strong>" + U.escape(cur().name) + "</strong> تعزيزاته كاملة.", "");
      if (checkVictory()) return;
    } else {
      state.notice = "بقيت " + state.toPlace + " كتيبة تعزيز — انقر على أراضيك.";
    }
    render();
  }

  function undoReinforcement() {
    if (!state || state.phase !== "reinforce" || state.over) return;
    if (!state.reinforceLog || !state.reinforceLog.length) {
      BG.toast("لا توجد تعزيزات يمكن التراجع عنها.", "warn");
      return;
    }
    const id = state.reinforceLog.pop();
    if (state.troops[id] > 1) {
      state.troops[id] -= 1;
      state.toPlace += 1;
      state.notice = "تراجعت عن تعزيز " + TERR_BY_ID[id].name + " — بقيت " + state.toPlace + " كتيبة.";
      if (FX) FX.sound("recall");
      render();
    }
  }

  /* ------------------------------ الهجوم ------------------------------ */

  function selectForAttack(terrId) {
    if (!state || state.phase !== "attack" || state.over || state.pendingMove) return;
    if (state.owner[terrId] !== state.current) {
      const owner = state.owner[terrId] >= 0 ? state.players[state.owner[terrId]] : null;
      BG.toast(owner ? "هذا الإقليم يملكه " + owner.name + "." : "هذا الإقليم غير مملوك.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (state.selected === terrId) {
      state.selected = null;
      state.notice = "أُلغي التحديد.";
      render();
      return;
    }
    const troops = state.troops[terrId] || 0;
    if (troops < 2) {
      BG.toast("تحتاج كتيبتين على الأقل للهجوم من هذا الإقليم.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    state.selected = terrId;
    state.attackDice = clamp(state.attackDice || 3, 1, Math.min(3, troops - 1));
    const targets = adjacentEnemies(terrId, state.current);
    state.notice = targets.length
      ? "اختر إقليمًا معاديًا مجاورًا: " + targets.map((id) => TERR_BY_ID[id].name).join("، ") + " — نردك " + state.attackDice + "."
      : "لا توجد أقاليم معادية مجاورة لهذا الإقليم.";
    if (FX) FX.sound("select");
    render();
  }

  function attack(terrId) {
    if (!state || state.over || state.phase !== "attack" || state.pendingMove) return;
    if (!state.selected) {
      BG.toast("اختر إقليمًا تملكه أولًا.", "warn");
      return;
    }
    if (!testAdjacency(state.selected, terrId)) {
      BG.toast("هذا الإقليم غير مجاور.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (state.owner[terrId] === state.current) {
      BG.toast("هذا الإقليم لك بالفعل.", "warn");
      return;
    }
    if (state.owner[terrId] < 0) {
      BG.toast("لا يمكن مهاجمة إقليم غير مملوك.", "warn");
      return;
    }
    resolveBattle(state.selected, terrId);
  }

  function resolveBattle(attackerId, defenderId) {
    if (!state || state.over || state.pendingMove) return;
    const attacker = state.owner[attackerId];
    const defender = state.owner[defenderId];
    if (attacker !== state.current || defender === state.current || defender < 0) return;
    const requested = clamp(Number(state.attackDice) || 3, 1, 3);
    const aCount = Math.min(requested, (state.troops[attackerId] || 0) - 1);
    const dCount = Math.min(2, state.troops[defenderId] || 0);
    if (aCount < 1 || dCount < 1) return;

    const aDice = [];
    const dDice = [];
    for (let i = 0; i < aCount; i++) aDice.push(U.roll(6));
    for (let i = 0; i < dCount; i++) dDice.push(U.roll(6));
    aDice.sort((x, y) => y - x);
    dDice.sort((x, y) => y - x);

    let aLoss = 0;
    let dLoss = 0;
    for (let i = 0; i < Math.min(aDice.length, dDice.length); i++) {
      if (aDice[i] > dDice[i]) dLoss += 1;
      else aLoss += 1;
    }
    state.troops[attackerId] = Math.max(1, state.troops[attackerId] - aLoss);
    state.troops[defenderId] = Math.max(0, state.troops[defenderId] - dLoss);

    state.battle = {
      attackerId,
      defenderId,
      aDice,
      dDice,
      aLoss,
      dLoss,
      aCount,
      dCount,
      conquered: false,
      moved: 0,
      attackerName: playerName(attacker),
      defenderName: playerName(defender),
    };

    if (state.troops[defenderId] <= 0) {
      const available = Math.max(0, state.troops[attackerId] - 1);
      state.owner[defenderId] = attacker;
      state.troops[defenderId] = 0;
      state.conquered = true;
      state.battle.conquered = true;
      const eliminated = eliminateDefender(defender, attacker);
      state.battle.eliminated = eliminated;
      state.selected = null;
      apiRef.log(
        "<strong>" + U.escape(playerName(attacker)) + "</strong> هاجم " + U.escape(TERR_BY_ID[defenderId].name) +
        " — خسائر: " + aLoss + " مهاجم / " + dLoss + " مدافع — <strong>سقط الإقليم!</strong>",
        "good"
      );
      if (FX) {
        FX.sound("capture");
        FX.after(() => {
          const el = mapSvg && mapSvg.querySelector('[data-terr="' + defenderId + '"]');
          if (el) { FX.pop(el); FX.shake(el); }
        }, 60);
      }
      if (eliminated) {
        state.notice = "سقط الإقليم! أُقصي " + playerName(defender) + " واستوليت على بطاقاته.";
      } else {
        state.notice = "سقط " + TERR_BY_ID[defenderId].name + "! اختر عدد الكتائب التي ستحتل بها الإقليم ثم أكّد.";
      }
      if (checkVictory()) return;
      if (available >= 1) {
        const min = Math.min(aCount, available);
        state.pendingMove = {
          kind: "conquest",
          from: attackerId,
          to: defenderId,
          max: available,
          min,
          sourceTotal: state.troops[attackerId],
          value: min,
        };
        state.battle.pending = true;
      } else {
        state.selected = state.troops[attackerId] >= 2 ? attackerId : null;
      }
      if (FX) FX.sound("dice");
      render();
      if (FX) FX.after(() => FX.shake(mapSvg && mapSvg.querySelector(".risk-battle-dice")), 35);
      return;
    }

    state.selected = state.troops[attackerId] >= 2 ? attackerId : null;
    apiRef.log(
      "<strong>" + U.escape(playerName(attacker)) + "</strong> هاجم " + U.escape(TERR_BY_ID[defenderId].name) +
      " — خسائر: " + aLoss + " مهاجم / " + dLoss + " مدافع.",
      "warn"
    );
    state.notice = "نتيجة المعركة: " + (dLoss > aLoss ? "تقدّم المهاجم" : aLoss > dLoss ? "صمود المدافع" : "تبادل خسائر") + " — يمكنك متابعة الهجوم أو التحصين.";
    if (FX) {
      FX.sound("dice");
      FX.after(() => {
        const el = mapSvg && mapSvg.querySelector('[data-terr="' + defenderId + '"]');
        if (el) FX.shake(el);
      }, 55);
    }
    render();
    if (FX) FX.after(() => FX.shake(mapSvg && mapSvg.querySelector(".risk-battle-dice")), 35);
  }

  function applyConquestMove(value) {
    const pm = state && state.pendingMove;
    if (!pm || pm.kind !== "conquest") return;
    const max = Math.max(1, pm.max);
    const min = Math.max(1, pm.min || 1);
    const move = clamp(Number(value) || pm.value || min, min, max);
    state.troops[pm.from] = Math.max(1, pm.sourceTotal - move);
    state.troops[pm.to] = move;
    if (state.battle) {
      state.battle.moved = move;
      state.battle.pending = false;
    }
    state.pendingMove = null;
    state.selected = state.troops[pm.from] >= 2 ? pm.from : null;
    state.notice = "تم نقل " + move + " كتيبة إلى " + TERR_BY_ID[pm.to].name + ". يمكنك مواصلة الهجوم أو التحصين.";
    apiRef.log("نقل <strong>" + U.escape(cur().name) + "</strong> " + move + " كتيبة إلى " + U.escape(TERR_BY_ID[pm.to].name) + ".", "");
    if (FX) {
      FX.sound("move");
      animateMarch(pm.from, pm.to, move, "conquest");
    }
    if (checkVictory()) return;
    render();
  }

  function eliminateDefender(index, conqueror) {
    if (!state || !state.players[index]) return false;
    if (countTerritories(index) > 0 || state.players[index].eliminated) return false;
    state.players[index].eliminated = true;
    const victor = state.players[conqueror];
    const stolen = state.players[index].cards.slice();
    if (victor && stolen.length) {
      victor.cards = victor.cards.concat(stolen);
      apiRef.log("استولى <strong>" + U.escape(victor.name) + "</strong> على " + stolen.length + " بطاقة من " + U.escape(state.players[index].name) + ".", "accent");
    }
    state.players[index].cards = [];
    apiRef.log("أُقصي <strong>" + U.escape(state.players[index].name) + "</strong> من السيطرة على العالم!", "warn");
    return true;
  }

  /* ------------------------------ الفوز ------------------------------ */

  function checkVictory() {
    if (!state || state.over) return false;
    const active = activePlayers();
    let winner = null;
    let reason = "";

    if (active.length === 1) {
      winner = active[0];
      reason = "آخر قائد يحتفظ بأراضٍ على الخريطة.";
    }

    if (!winner && rule("victory") === "domination") {
      const need = Math.ceil(TERRITORIES.length * 0.6);
      const reached = active
        .filter((p) => countTerritories(p.index) >= need)
        .sort((a, b) => countTerritories(b.index) - countTerritories(a.index));
      if (reached.length) {
        winner = reached[0];
        reason = "السيطرة على " + need + " إقليمًا (" + Math.round((need / TERRITORIES.length) * 100) + "% من العالم).";
      }
    }

    if (!winner && rule("victory") === "both") {
      const need = Math.ceil(TERRITORIES.length * 0.6);
      const reached = active.filter((p) => countTerritories(p.index) >= need);
      if (reached.length) {
        winner = reached.sort((a, b) => countTerritories(b.index) - countTerritories(a.index))[0];
        reason = "السيطرة على " + need + " إقليمًا و" + Math.round((need / TERRITORIES.length) * 100) + "% من العالم.";
      }
    }

    if (!winner && state.missionMode) {
      for (const p of active) {
        if (checkMission(p)) {
          winner = p;
          reason = "أنجز مهمته السرية: " + (p.mission ? p.mission.title : "");
          break;
        }
      }
    }

    if (!winner) return false;
    finishGame(winner, reason);
    return true;
  }

  function finishGame(winner, reason) {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    state.winner = winner ? winner.index : null;
    state.winReason = reason || "";
    state.pendingMove = null;
    state.selected = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    const standings = state.players
      .slice()
      .sort((a, b) => countTerritories(b.index) - countTerritories(a.index))
      .map((p) => ({
        name: p.name,
        value: countTerritories(p.index) + " إقليم · " + p.cards.length + " بطاقة" +
          (p.mission ? " · مهمة: " + p.mission.title : "") +
          (p.eliminated ? " — مُقصى" : ""),
      }));
    apiRef.log("انتهت الحرب" + (winner ? " — <strong>" + U.escape(winner.name) + "</strong> حقق النصر: " + U.escape(reason) : "."), "good");
    if (FX) FX.win();
    render();
    apiRef.gameOver({
      icon: "🌍",
      title: "انتهت ريسك",
      text: winner ? reason : "لم يتبقَّ لاعبون.",
      winner: winner ? winner.name : "",
      standings,
    });
  }

  /* ------------------------------ التحصين ------------------------------ */

  function fortifyTargets(from, index) {
    if (!from || !state) return [];
    const owner = index == null ? state.current : index;
    if (rule("fortify") === "anywhere") {
      return territoriesOf(owner).filter((id) => id !== from);
    }
    return adjacentOwned(from, owner);
  }

  function fortifyMovable() {
    if (!state || rule("fortify") === "none" || state.fortifyUsed) return false;
    return territoriesOf(state.current).some((id) => state.troops[id] > 1 && fortifyTargets(id).length);
  }

  function startFortify() {
    if (!state || state.over || state.pendingMove) return;
    if (state.phase !== "attack") return;
    if (rule("fortify") === "none") {
      BG.toast("قانون التحصين معطّل في هذه المباراة.", "warn");
      return;
    }
    if (state.fortifyUsed) {
      BG.toast("استخدمت التحصين في هذا الدور.", "warn");
      return;
    }
    if (!fortifyMovable()) {
      BG.toast("لا توجد كتائب قابلة للتحصين.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    state.phase = "fortify";
    state.mode = "fortify";
    state.selected = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    state.notice = "التحصين: اختر إقليمًا مصدرًا فيه أكثر من كتيبة.";
    if (FX) FX.sound("select");
    render();
  }

  function fortifyClick(terrId) {
    if (!state || state.phase !== "fortify" || state.over || state.pendingMove) return;
    if (state.owner[terrId] !== state.current) {
      BG.toast("اختر أراضيك فقط.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (!state.fortifyFrom) {
      if (state.troops[terrId] < 2) {
        BG.toast("اختر إقليمًا فيه كتيبتان على الأقل.", "warn");
        if (FX) FX.sound("error");
        return;
      }
      if (!fortifyTargets(terrId).length) {
        BG.toast("لا يوجد إقليم وجهة متاح لنقل الكتائب إليه.", "warn");
        return;
      }
      state.fortifyFrom = terrId;
      state.fortifyTo = null;
      state.notice = rule("fortify") === "anywhere"
        ? "اختر أي إقليم تملكه لنقل الكتائب إليه."
        : "اختر إقليمًا مجاورًا تملكه لنقل الكتائب إليه.";
      if (FX) FX.sound("select");
      render();
      return;
    }
    if (terrId === state.fortifyFrom) {
      state.fortifyFrom = null;
      state.fortifyTo = null;
      state.notice = "أُلغي اختيار المصدر — اختر مصدرًا جديدًا.";
      render();
      return;
    }
    if (!fortifyTargets(state.fortifyFrom).includes(terrId)) {
      BG.toast(rule("fortify") === "anywhere" ? "اختر إقليمًا تملكه." : "الوجهة يجب أن تكون مجاورة.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const available = state.troops[state.fortifyFrom] - 1;
    if (available < 1) {
      BG.toast("لا توجد كتائب قابلة للنقل.", "warn");
      return;
    }
    state.fortifyTo = terrId;
    state.pendingMove = {
      kind: "fortify",
      from: state.fortifyFrom,
      to: terrId,
      max: available,
      min: 1,
      value: Math.min(3, available),
    };
    state.notice = "حدّد عدد الكتائب المنقولة من " + TERR_BY_ID[state.fortifyFrom].name + " إلى " + TERR_BY_ID[terrId].name + " ثم أكّد.";
    if (FX) FX.sound("select");
    render();
  }

  function performFortify(from, to, move, opts) {
    if (!state || !from || !to || state.over) return;
    const available = state.troops[from] - 1;
    if (available < 1) return;
    if (!fortifyTargets(from).includes(to)) return;
    const amount = clamp(Number(move) || 1, 1, available);
    state.troops[from] -= amount;
    state.troops[to] += amount;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    state.phase = "attack";
    state.mode = "attack";
    const forceEnd = !!(opts && opts.forceEnd);
    const unlimited = rule("fortify") === "unlimited" && !forceEnd;
    state.fortifyUsed = !unlimited;
    if (FX) {
      FX.sound("move");
      animateMarch(from, to, amount, "fortify");
    }
    apiRef.log("حصّن <strong>" + U.escape(playerName(state.current)) + "</strong> " + U.escape(TERR_BY_ID[to].name) + " بـ" + amount + " كتيبة.", "");
    state.notice = "تم التحصين: " + amount + " كتيبة إلى " + TERR_BY_ID[to].name + ".";
    if (checkVictory()) return;
    if (!unlimited) {
      endTurn();
      return;
    }
    render();
  }

  function cancelFortify() {
    if (!state) return;
    if (state.pendingMove && state.pendingMove.kind === "fortify") {
      state.pendingMove = null;
      state.fortifyTo = null;
      state.notice = "أُلغي النقل — اختر وجهة أخرى، أو اضغط «رجوع» ثانية للخروج من التحصين.";
      render();
      return;
    }
    state.pendingMove = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.phase = "attack";
    state.mode = "attack";
    state.notice = "أُلغي التحصين. يمكنك مواصلة الهجوم أو إنهاء الدور.";
    render();
  }

  /* ------------------------------ إنهاء الدور ------------------------------ */

  function endTurn() {
    if (!state || state.over || state.phase === "over") return;
    if (state.pendingMove) {
      BG.toast("أكّد نقل الكتائب أولًا.", "warn");
      return;
    }
    if (state.phase === "fortify") {
      cancelFortify();
      return;
    }
    if (state.phase !== "attack") return;
    if (state.toPlace > 0) {
      BG.toast("وزّع كل كتائب التعزيز أولًا.", "warn");
      return;
    }
    const player = cur();
    if (!player) return;
    if (handLimitBlocked(player)) {
      BG.toast("لديك 5 بطاقات ومجموعة صالحة — بدّلها قبل إنهاء الدور.", "warn");
      state.notice = "يجب تبديل مجموعة بطاقات قبل إنهاء الدور (الحد 5 بطاقات).";
      if (FX) FX.sound("error");
      render();
      return;
    }
    if (state.conquered && rule("cards") !== "off" && player.cards.length < 5) {
      const card = drawCard(player);
      if (card) {
        apiRef.log("حصل <strong>" + U.escape(player.name) + "</strong> على بطاقة " + U.escape(cardLabel(card)) + ".", "accent");
        if (FX) FX.sound("card");
      }
    } else if (state.conquered && rule("cards") !== "off" && player.cards.length >= 5) {
      apiRef.log("يد <strong>" + U.escape(player.name) + "</strong> ممتلئة (5 بطاقات) — لا يسحب بطاقة جديدة.", "warn");
    }
    state.selected = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    const next = nextPlayer(state.current);
    if (next === state.current) {
      checkVictory();
      return;
    }
    beginTurn(next);
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function continentProgressScore(id, p) {
    const terr = TERR_BY_ID[id];
    if (!terr || !p) return 0;
    const all = CONTINENT_TERRITORIES[terr.c] || [];
    const own = all.filter((tid) => state.owner[tid] === p.index).length;
    const bonus = CONTINENTS[terr.c] ? CONTINENTS[terr.c].bonus : 0;
    if (all.length && own === all.length) return bonus * 1.2;
    if (all.length && own === all.length - 1) return bonus * 0.75;
    return (own / Math.max(1, all.length)) * bonus * 0.3;
  }

  function cpuTerritoryScore(id, p) {
    const enemies = adjacentEnemies(id, p.index);
    let score = enemies.length * 2.4;
    enemies.forEach((e) => { score += state.troops[e] * 0.32; });
    score += continentProgressScore(id, p) * 1.5;
    score += state.troops[id] * 0.16;
    if (enemies.length === 0) score -= 1.8;
    return score;
  }

  function cpuPickTerritory(list, p) {
    if (!list.length) return null;
    if (AI.level(p.level) === "easy") return U.pick(list);
    return AI.choose(list, (id) => cpuTerritoryScore(id, p), p.level);
  }

  function cpuClaimScore(id, p) {
    const terr = TERR_BY_ID[id];
    if (!terr) return 0;
    const all = CONTINENT_TERRITORIES[terr.c] || [];
    const own = all.filter((tid) => state.owner[tid] === p.index).length;
    const neighbours = ADJ[id] || [];
    const ownN = neighbours.filter((n) => state.owner[n] === p.index).length;
    const enemyN = neighbours.filter((n) => state.owner[n] >= 0 && state.owner[n] !== p.index).length;
    const unownedN = neighbours.filter((n) => state.owner[n] < 0).length;
    return own * 1.7 + ownN * 2.6 + unownedN * 0.5 - enemyN * 0.35 +
      (CONTINENTS[terr.c] ? CONTINENTS[terr.c].bonus * 0.22 : 0) + Math.random() * 0.45;
  }

  function cpuClaimStep() {
    if (!state || state.phase !== "claim") return false;
    const p = state.players[state.claimPlayer];
    if (!p) return false;
    const unowned = TERRITORIES.filter((t) => state.owner[t.id] === -1).map((t) => t.id);
    if (!unowned.length) return false;
    const id = AI.choose(unowned, (tid) => cpuClaimScore(tid, p), p.level);
    if (id == null) return false;
    claimTerritory(id);
    return true;
  }

  function autoClaim() {
    if (!state || state.phase !== "claim" || !canControl()) return;
    if (!cpuClaimStep()) {
      BG.toast("لا توجد أراضٍ متاحة للاختيار.", "warn");
    }
  }

  function cpuSetupStep() {
    if (!state || state.phase !== "setup") return false;
    const p = state.players[state.setupPlayer];
    if (!p) return false;
    autoPlaceSetup();
    return true;
  }

  function cpuReinforceStep() {
    if (!state || state.phase !== "reinforce") return false;
    const p = cur();
    if (!p) return false;
    if (state.toPlace <= 0) return false;
    if (canExchange(p)) {
      exchangeCards();
      return true;
    }
    const list = territoriesOf(p.index);
    const id = cpuPickTerritory(list, p);
    if (id == null) {
      endTurn();
      return false;
    }
    placeReinforcement(id);
    return true;
  }

  function attackWinChance(a, d) {
    const aa = Math.max(1, Math.min(3, a));
    const dd = Math.max(1, Math.min(2, d));
    const table = {
      "1,1": 0.583, "1,2": 0.254,
      "2,1": 0.578, "2,2": 0.228,
      "3,1": 0.659, "3,2": 0.371,
    };
    return table[aa + "," + dd] || 0.4;
  }

  function cpuAttackOptions(p) {
    const options = [];
    territoriesOf(p.index).forEach((src) => {
      const a = state.troops[src] - 1;
      if (a < 1) return;
      adjacentEnemies(src, p.index).forEach((dst) => {
        const d = state.troops[dst];
        if (d <= 0) return;
        const chance = attackWinChance(a, d);
        const bonus = continentProgressScore(dst, p);
        let score = chance * (d + 1) - (1 - chance) * (Math.min(a, 3) * 0.7) + bonus * 1.8;
        if (d <= 1) score += 1.35;
        if (state.owner[dst] >= 0 && state.players[state.owner[dst]].eliminated) score += 2;
        options.push({ src, dst, score, chance });
      });
    });
    return options;
  }

  function cpuAttackThreshold(level) {
    if (level === "easy") return 1.15;
    if (level === "hard") return -0.25;
    return 0.08;
  }

  function cpuFortifyMove(p) {
    if (!p || rule("fortify") === "none" || state.fortifyUsed) return null;
    const sources = territoriesOf(p.index)
      .filter((id) => state.troops[id] >= 3 && fortifyTargets(id, p.index).length)
      .sort((a, b) => state.troops[b] - state.troops[a]);
    for (const src of sources) {
      const targets = fortifyTargets(src, p.index)
        .filter((id) => adjacentEnemies(id, p.index).length > 0)
        .sort((a, b) => adjacentEnemies(b, p.index).length - adjacentEnemies(a, p.index));
      if (!targets.length) continue;
      const dest = targets[0];
      if (state.troops[src] - 1 <= state.troops[dest]) continue;
      const move = Math.min(state.troops[src] - 1, Math.max(1, adjacentEnemies(dest, p.index).length * 2));
      return { from: src, to: dest, move };
    }
    for (const src of sources) {
      if (adjacentEnemies(src, p.index).length > 0) continue;
      const targets = fortifyTargets(src, p.index)
        .filter((id) => adjacentEnemies(id, p.index).length > 0)
        .sort((a, b) => adjacentEnemies(b, p.index).length - adjacentEnemies(a, p.index));
      if (!targets.length) continue;
      const dest = targets[0];
      const move = Math.min(state.troops[src] - 1, Math.max(1, adjacentEnemies(dest, p.index).length * 2));
      return { from: src, to: dest, move };
    }
    return null;
  }

  function cpuConfirmPending() {
    if (!state || !state.pendingMove || state.over) return false;
    const pm = state.pendingMove;
    if (pm.kind === "fortify") {
      const move = clamp(Math.max(pm.min || 1, Math.round(pm.max * 0.6)), pm.min || 1, pm.max);
      performFortify(pm.from, pm.to, move, { forceEnd: true });
      return true;
    }
    applyConquestMove(pm.max);
    return true;
  }

  function cpuFinishAttackPhase() {
    if (!state || state.over) return;
    const p = cur();
    if (!p) return;
    if (rule("fortify") !== "none" && !state.fortifyUsed) {
      const move = cpuFortifyMove(p);
      if (move) {
        performFortify(move.from, move.to, move.move, { forceEnd: true });
        return;
      }
    }
    endTurn();
  }

  function cpuAttackStep() {
    if (!state || state.over || state.phase !== "attack" || state.pendingMove) return;
    const p = cur();
    if (!p) return;
    if (aiAttackCount >= 18) {
      cpuFinishAttackPhase();
      return;
    }
    const threshold = cpuAttackThreshold(AI.level(p.level));
    const options = cpuAttackOptions(p).filter((option) => option.score >= threshold);
    if (!options.length) {
      cpuFinishAttackPhase();
      return;
    }
    if (AI.level(p.level) === "easy" && Math.random() < 0.18) {
      cpuFinishAttackPhase();
      return;
    }
    const best = AI.choose(options, (option) => option.score, p.level);
    if (!best) {
      cpuFinishAttackPhase();
      return;
    }
    if (state.selected !== best.src) {
      selectForAttack(best.src);
    }
    if (state.selected !== best.src) {
      cpuFinishAttackPhase();
      return;
    }
    state.attackDice = clamp(3, 1, Math.max(1, state.troops[best.src] - 1));
    aiAttackCount += 1;
    attack(best.dst);
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over || !rootRef) return;

    let seatPlayer = null;
    if (state.phase === "claim") seatPlayer = state.players[state.claimPlayer];
    else if (state.phase === "setup") seatPlayer = state.players[state.setupPlayer];
    else if (state.phase !== "over") seatPlayer = cur();
    if (!seatPlayer || !AI.isCpu(seatPlayer) || !AI.autoAllowed(apiRef, seatPlayer)) return;

    const wait = AI.delay(seatPlayer.level, 0.82);
    const guard = (fn, phase) => () => {
      if (!state || state.over) return;
      if (phase && state.phase !== phase) return;
      if (state.phase === "claim" || state.phase === "setup") {
        const seat = state.phase === "claim" ? state.claimPlayer : state.setupPlayer;
        if (seat !== seatPlayer.index) return;
      } else if (state.current !== seatPlayer.index) return;
      fn();
    };

    if (state.pendingMove) {
      aiRunner.later(guard(cpuConfirmPending, state.phase), wait);
      return;
    }

    if (state.phase === "claim") {
      aiRunner.later(guard(cpuClaimStep, "claim"), wait);
      return;
    }
    if (state.phase === "setup") {
      aiRunner.later(guard(cpuSetupStep, "setup"), wait);
      return;
    }
    if (state.phase === "reinforce") {
      aiRunner.later(guard(cpuReinforceStep, "reinforce"), wait);
      return;
    }
    if (state.phase === "attack") {
      aiRunner.later(guard(cpuAttackStep, "attack"), wait);
      return;
    }
    if (state.phase === "fortify") {
      aiRunner.later(guard(cpuFinishAttackPhase, "fortify"), wait);
    }
  }

  /* ------------------------------ الخريطة والواجهة ------------------------------ */

  const MAP_W = GEO ? GEO.width : 1200;
  const MAP_H = GEO ? GEO.height : 640;
  const MAP_RATIO = MAP_W / MAP_H;

  let mapViewport = null;
  let sideTop = null;
  let sideRest = null;
  let noticeEl = null;
  let zoomLabelEl = null;
  let routeLayer = null;
  let pathLayer = null;
  let nodeLayer = null;
  let terrRefs = {};
  let nodeRefs = {};
  let nameRefs = {};
  let pathRefs = {};
  let nodeScaleValue = 1;
  let focusedContinent = null;
  let lastRouteKey = null;
  let boundRoot = null;
  let resizeHandler = null;
  let panState = null;
  let lastDragAt = 0;

  function svgEscape(text) {
    return U.escape(text == null ? "" : String(text));
  }

  function hexToRgba(hex, alpha) {
    const value = String(hex || "").replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const num = parseInt(full || "7d9098", 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return "rgba(" + r + "," + g + "," + b + "," + (alpha == null ? 1 : alpha) + ")";
  }

  function territoryBaseFill(code) {
    const info = CONTINENTS[code];
    return hexToRgba(info ? info.color : "#7d9098", 0.34);
  }

  function curvePath(a, b, bend) {
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const midX = (ax + bx) / 2;
    const midY = (ay + by) / 2;
    const offset = clamp(len * 0.16, 10, 46) * (bend || 1);
    const cx = midX - (dy / len) * offset;
    const cy = midY + (dx / len) * offset;
    return "M" + ax + " " + ay + " Q" + cx + " " + cy + " " + bx + " " + by;
  }

  function dieHTML(value, kind, index) {
    const pips = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const faces = pips[clamp(Number(value) || 1, 1, 6)] || pips[1];
    return '<span class="risk-die ' + kind + '" style="--i:' + (index || 0) + '">' +
      faces.map((n) => '<i style="grid-area:' + (Math.floor(n / 3) + 1) + "/" + (n % 3 + 1) + '"></i>').join("") +
      "</span>";
  }

  // ضبط مواضع الأسماء في المناطق المزدحمة (أوروبا أساسًا) ووصلها بخطوط رفيعة.
  const NAME_TWEAKS = {
    iceland: { x: 502, y: 96, anchor: "end" },
    britain: { x: 512, y: 146, anchor: "end" },
    scandinavia: { x: 622, y: 78, anchor: "middle" },
    neurope: { x: 620, y: 140, anchor: "start" },
    weurope: { x: 508, y: 212, anchor: "end" },
    seurope: { x: 670, y: 222, anchor: "start" },
    ukraine: { x: 700, y: 168, anchor: "start" },
    egypt: { x: 690, y: 282, anchor: "start" },
    mideast: { x: 735, y: 260, anchor: "start" },
  };
  const MAP_NAMES = {
    neurope: "شمال أوروبا",
    weurope: "غرب أوروبا",
    seurope: "جنوب أوروبا",
  };
  const NAME_LEADERS = {
    iceland: true,
    britain: true,
    neurope: true,
    weurope: true,
    seurope: true,
    ukraine: true,
    egypt: true,
    mideast: true,
  };

  function namePos(id, geo) {
    const tweak = NAME_TWEAKS[id];
    if (tweak) return { x: tweak.x, y: tweak.y, anchor: tweak.anchor };
    const pos = geo.name || geo.label;
    return { x: pos[0], y: pos[1], anchor: geo.anchor || "middle" };
  }

  function leaderPath(id, pos, node) {
    if (!NAME_LEADERS[id]) return "";
    let sx = pos.x;
    let sy = pos.y - 4;
    if (pos.anchor === "end") sx = pos.x + 5;
    else if (pos.anchor === "start") sx = pos.x - 5;
    else sy = pos.y + 6;
    return '<path class="risk-leader" d="M' + sx + " " + sy + " L" + node[0] + " " + node[1] + '"/>';
  }

  function mapSVG() {
    if (!GEO) {
      return '<div class="risk-map-missing">تعذّر تحميل بيانات الخريطة. أعد تحميل الصفحة.</div>';
    }
    const parts = [];
    parts.push('<svg class="risk-map" viewBox="0 0 ' + MAP_W + " " + MAP_H + '" role="img" aria-label="خريطة ريسك — العالم الكلاسيكي بـ42 إقليمًا" preserveAspectRatio="xMidYMid meet">');

    const defs = [];
    defs.push('<radialGradient id="riskSea" cx="50%" cy="42%" r="82%"><stop offset="0%" stop-color="#153843"/><stop offset="48%" stop-color="#0a2029"/><stop offset="100%" stop-color="#050e13"/></radialGradient>');
    defs.push('<radialGradient id="riskVignette" cx="50%" cy="50%" r="74%"><stop offset="58%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.48)"/></radialGradient>');
    defs.push('<filter id="riskGlow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.7"/></filter>');
    defs.push('<filter id="riskSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.4"/></filter>');
    defs.push('<marker id="riskArrowAttack" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ffb27a"/></marker>');
    defs.push('<marker id="riskArrowFort" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#8fe8c4"/></marker>');
    defs.push('<marker id="riskArrowMove" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#f6f2e8"/></marker>');
    Object.keys(GEO.clips || {}).forEach((key) => {
      defs.push('<clipPath id="riskClip-' + key + '"><path d="' + GEO.clips[key] + '"/></clipPath>');
    });
    parts.push("<defs>" + defs.join("") + "</defs>");

    parts.push('<rect class="risk-sea-rect" width="' + MAP_W + '" height="' + MAP_H + '" fill="url(#riskSea)"/>');
    if (GEO.graticule) {
      parts.push('<path class="risk-graticule" d="' + GEO.graticule + '" fill="none" stroke="rgba(140,200,230,0.10)" stroke-width="1"/>');
    }

    parts.push('<g class="risk-cont-labels" aria-hidden="true">');
    Object.keys(GEO.continents || {}).forEach((code) => {
      const c = GEO.continents[code];
      if (!c || !c.label || !CONTINENTS[code] || code === "eu") return;
      parts.push('<text class="risk-cont-label" x="' + c.label[0] + '" y="' + c.label[1] + '" text-anchor="middle">' + svgEscape(CONTINENTS[code].short) + "</text>");
    });
    parts.push("</g>");

    parts.push('<g class="risk-terr-layer">');
    TERRITORIES.forEach((t) => {
      const geo = GEO.territories ? GEO.territories[t.id] : null;
      if (!geo) return;
      parts.push('<g class="risk-terr" data-terr="' + t.id + '" data-cont="' + t.c + '" role="button" tabindex="-1" aria-label="' + svgEscape(t.name) + '">');
      parts.push("<title>" + svgEscape(t.name) + "</title>");
      geo.parts.forEach((part) => {
        const clip = part.clip ? ' clip-path="url(#riskClip-' + part.clip + ')"' : "";
        parts.push('<path class="risk-terr-path" d="' + part.d + '" fill="' + territoryBaseFill(t.c) + '"' + clip + "/>");
      });
      parts.push("</g>");
    });
    parts.push("</g>");

    routeLayer = null;
    parts.push('<g class="risk-sea-layer" aria-hidden="true">');
    SEA_ROUTES.forEach((pair, i) => {
      const a = GEO.territories[pair[0]];
      const b = GEO.territories[pair[1]];
      if (!a || !b) return;
      const d = curvePath(a.label, b.label, i % 2 ? -0.72 : 0.72);
      parts.push('<path class="risk-sea-route" d="' + d + '" marker-end="url(#riskArrowFort)"/>');
    });
    parts.push("</g>");

    parts.push('<g class="risk-path-layer" aria-hidden="true"></g>');
    parts.push('<g class="risk-march-layer" aria-hidden="true"></g>');

    parts.push('<g class="risk-leader-layer" aria-hidden="true">');
    TERRITORIES.forEach((t) => {
      const geo = GEO.territories ? GEO.territories[t.id] : null;
      if (!geo) return;
      parts.push(leaderPath(t.id, namePos(t.id, geo), geo.label));
    });
    parts.push("</g>");

    parts.push('<g class="risk-name-layer" aria-hidden="true">');
    TERRITORIES.forEach((t) => {
      const geo = GEO.territories ? GEO.territories[t.id] : null;
      if (!geo) return;
      const pos = namePos(t.id, geo);
      parts.push('<text class="risk-name' + (NAME_TWEAKS[t.id] ? " is-tweaked" : "") + '" data-for="' + t.id + '" x="' + pos.x + '" y="' + pos.y + '" text-anchor="' + pos.anchor + '">' + svgEscape(MAP_NAMES[t.id] || t.name) + "</text>");
    });
    parts.push("</g>");

    parts.push('<g class="risk-node-layer">');
    TERRITORIES.forEach((t) => {
      const geo = GEO.territories ? GEO.territories[t.id] : null;
      if (!geo) return;
      const pos = geo.label;
      parts.push('<g class="risk-node" data-terr="' + t.id + '" role="button" tabindex="0" aria-label="' + svgEscape(t.name) + '" transform="translate(' + pos[0] + "," + pos[1] + ')">');
      parts.push("<title>" + svgEscape(t.name) + "</title>");
      parts.push('<circle class="risk-node-halo" r="19"/>');
      parts.push('<circle class="risk-node-body" r="13" fill="#1b2a31"/>');
      parts.push('<text class="risk-troops" text-anchor="middle" y="4">?</text>');
      parts.push("</g>");
    });
    parts.push("</g>");

    parts.push('<rect class="risk-vignette" width="' + MAP_W + '" height="' + MAP_H + '" fill="url(#riskVignette)" pointer-events="none"/>');
    parts.push("</svg>");
    return parts.join("");
  }

  function cacheMapRefs() {
    terrRefs = {};
    nodeRefs = {};
    nameRefs = {};
    pathRefs = {};
    if (!mapSvg) return;
    mapSvg.querySelectorAll(".risk-terr").forEach((g) => {
      const id = g.getAttribute("data-terr");
      if (!id) return;
      terrRefs[id] = g;
      pathRefs[id] = Array.prototype.slice.call(g.querySelectorAll("path"));
    });
    mapSvg.querySelectorAll(".risk-name").forEach((el) => {
      const id = el.getAttribute("data-for");
      if (id) nameRefs[id] = el;
    });
    mapSvg.querySelectorAll(".risk-node").forEach((g) => {
      const id = g.getAttribute("data-terr");
      if (!id) return;
      nodeRefs[id] = {
        g,
        body: g.querySelector(".risk-node-body"),
        text: g.querySelector(".risk-troops"),
      };
    });
    routeLayer = mapSvg.querySelector(".risk-path-layer");
    pathLayer = mapSvg.querySelector(".risk-path-layer");
    nodeLayer = mapSvg.querySelector(".risk-node-layer");
  }

  function ensureResize() {
    if (resizeHandler) return;
    resizeHandler = () => {
      if (!mapSvg) return;
      applyCamera();
    };
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("orientationchange", resizeHandler);
  }

  function teardownShell() {
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("orientationchange", resizeHandler);
      resizeHandler = null;
    }
    if (cameraAnim) {
      cancelAnimationFrame(cameraAnim);
      cameraAnim = null;
    }
    boundRoot = null;
    panState = null;
  }

  function buildShell() {
    if (!rootRef) return;
    rootRef.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "risk-layout";

    const board = document.createElement("section");
    board.className = "risk-board-wrap";
    board.innerHTML =
      '<div class="board-head risk-board-head">' +
      '<span class="risk-head-icon" aria-hidden="true">🌍</span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">غرفة العمليات · خريطة العالم</span><strong>ريسك — السيطرة على العالم</strong><small class="risk-map-sub">42 إقليمًا · 6 قارات · Natural Earth</small></div>' +
      '<div class="risk-zoom" role="group" aria-label="تكبير الخريطة والتنقل">' +
      '<button type="button" data-zoom="-1" aria-label="تصغير الخريطة">−</button>' +
      '<span data-zoom-label>100%</span>' +
      '<button type="button" data-zoom="1" aria-label="تكبير الخريطة">+</button>' +
      '<button type="button" data-zoom="0" aria-label="عرض العالم كاملًا">⌂</button>' +
      "</div>" +
      "</div>" +
      '<div class="risk-continents" role="group" aria-label="الانتقال إلى قارة">' +
      '<button type="button" class="risk-cont-chip is-world" data-focus="world"><span class="risk-cont-dot"></span><span>العالم</span></button>' +
      Object.keys(CONTINENTS).map((code) => {
        const info = CONTINENTS[code];
        return '<button type="button" class="risk-cont-chip" data-focus="' + code + '" style="--cc:' + info.color + '">' +
          '<span class="risk-cont-dot"></span><span>' + svgEscape(info.short) + '</span><b>+' + info.bonus + '</b>' +
          '<small data-chip-count>0/' + (CONTINENT_TERRITORIES[code] || []).length + "</small></button>";
      }).join("") +
      "</div>" +
      '<div class="risk-map-viewport" data-map-viewport>' +
      '<div class="risk-map-stage">' + mapSVG() + "</div>" +
      "</div>" +
      '<div class="risk-map-foot"><span class="risk-map-hint risk-hint-desktop">اسحب الخريطة للتنقل · اضغط قارة للتركيز · الأرقام هي كتائب الإقليم</span><span class="risk-map-hint risk-hint-mobile">اضغط قارة ثم إقليمًا</span><span class="risk-map-zoom-read" data-zoom-read>100%</span></div>' +
      '<div class="risk-notice" data-notice aria-live="polite"></div>';

    const side = document.createElement("aside");
    side.className = "risk-side";
    side.innerHTML = '<div data-side-top></div><div class="risk-secret-slot" data-secret-slot></div><div data-side-rest></div>';
    wrap.appendChild(board);
    wrap.appendChild(side);
    rootRef.appendChild(wrap);

    mapShell = board;
    sideEl = side;
    mapViewport = board.querySelector("[data-map-viewport]");
    mapSvg = board.querySelector("svg.risk-map");
    noticeEl = board.querySelector("[data-notice]");
    zoomLabelEl = board.querySelector("[data-zoom-label]");
    sideTop = side.querySelector("[data-side-top]");
    sideRest = side.querySelector("[data-side-rest]");
    lastRouteKey = null;

    secret = BG.secretPanel({
      title: "🎴 قيادتك السرية",
      owner: "بطاقاتك ومهمتك",
      hint: "المحتوى مخفي. تأكد أن الجهاز أمام صاحبه فقط ثم اضغط «إظهار».",
      open: false,
      render: secretHTML,
    });
    const slot = side.querySelector("[data-secret-slot]");
    if (slot) slot.appendChild(secret.el);

    cacheMapRefs();
    camera = { x: 0, y: 0, w: MAP_W, h: MAP_H };
    focusedContinent = null;
    applyCamera();
    bindRoot();
    bindMapPan();
    ensureResize();
    lastViewer = viewerSeat();
    tradeOwner = lastViewer;
    tradeSel = [];
  }

  function bindRoot() {
    if (!rootRef || boundRoot === rootRef) return;
    boundRoot = rootRef;
    rootRef.addEventListener("click", onRootClick);
    rootRef.addEventListener("input", onRootInput);
    rootRef.addEventListener("keydown", onRootKeydown);
  }

  function bindMapPan() {
    if (!mapViewport) return;
    mapViewport.addEventListener("pointerdown", onPanStart);
  }

  function onPanStart(event) {
    if (!mapViewport || !camera || camera.w >= MAP_W - 1) return;
    if (event.button != null && event.button !== 0) return;
    panState = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cam: { x: camera.x, y: camera.y, w: camera.w, h: camera.h },
      moved: false,
    };
    window.addEventListener("pointermove", onPanMove);
    window.addEventListener("pointerup", onPanEnd);
    window.addEventListener("pointercancel", onPanEnd);
  }

  function onPanMove(event) {
    if (!panState || event.pointerId !== panState.id || !mapViewport) return;
    const dx = event.clientX - panState.startX;
    const dy = event.clientY - panState.startY;
    if (!panState.moved && Math.hypot(dx, dy) < 6) return;
    panState.moved = true;
    const width = mapViewport.clientWidth || 1;
    const unit = camera.w / width;
    camera = clampCamera({
      x: panState.cam.x - dx * unit,
      y: panState.cam.y - dy * unit,
      w: panState.cam.w,
      h: panState.cam.h,
    });
    applyCamera();
    event.preventDefault();
  }

  function onPanEnd(event) {
    if (!panState || (event && event.pointerId !== panState.id)) return;
    if (panState.moved) lastDragAt = performance.now();
    panState = null;
    window.removeEventListener("pointermove", onPanMove);
    window.removeEventListener("pointerup", onPanEnd);
    window.removeEventListener("pointercancel", onPanEnd);
  }

  function clampCamera(box) {
    let w = clamp(Number(box.w) || MAP_W, 150, MAP_W);
    let h = w / MAP_RATIO;
    if (h > MAP_H) {
      h = MAP_H;
      w = h * MAP_RATIO;
    }
    const x = clamp(Number(box.x) || 0, 0, MAP_W - w);
    const y = clamp(Number(box.y) || 0, 0, MAP_H - h);
    return { x, y, w, h };
  }

  function fitCamera(box, pad) {
    const p = pad == null ? 18 : pad;
    let x = Number(box[0]) - p;
    let y = Number(box[1]) - p;
    let w = Number(box[2]) + p * 2;
    let h = Number(box[3]) + p * 2;
    if (w / h > MAP_RATIO) {
      const nh = w / MAP_RATIO;
      y -= (nh - h) / 2;
      h = nh;
    } else {
      const nw = h * MAP_RATIO;
      x -= (nw - w) / 2;
      w = nw;
    }
    return clampCamera({ x, y, w, h });
  }

  function animateCamera(target) {
    const next = clampCamera(target);
    if (cameraAnim) {
      cancelAnimationFrame(cameraAnim);
      cameraAnim = null;
    }
    if (!FX || !FX.motionEnabled || !FX.motionEnabled()) {
      camera = next;
      applyCamera();
      return;
    }
    const from = { x: camera.x, y: camera.y, w: camera.w, h: camera.h };
    const start = performance.now();
    const duration = 430;
    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      camera = {
        x: from.x + (next.x - from.x) * e,
        y: from.y + (next.y - from.y) * e,
        w: from.w + (next.w - from.w) * e,
        h: from.h + (next.h - from.h) * e,
      };
      applyCamera();
      if (t < 1) cameraAnim = requestAnimationFrame(tick);
      else cameraAnim = null;
    };
    cameraAnim = requestAnimationFrame(tick);
  }

  function zoomBy(factor) {
    if (!camera) return;
    const cx = camera.x + camera.w / 2;
    const cy = camera.y + camera.h / 2;
    let w = clamp(camera.w * factor, 150, MAP_W);
    let h = w / MAP_RATIO;
    if (h > MAP_H) {
      h = MAP_H;
      w = h * MAP_RATIO;
    }
    focusedContinent = null;
    animateCamera({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  function focusContinent(code) {
    if (!GEO || !GEO.continents) return;
    if (!code || code === "world" || (focusedContinent === code && camera && camera.w < MAP_W * 0.92)) {
      focusedContinent = null;
      animateCamera({ x: 0, y: 0, w: MAP_W, h: MAP_H });
      return;
    }
    const item = GEO.continents[code];
    if (!item || !item.focus) return;
    focusedContinent = code;
    animateCamera(fitCamera(item.focus, 16));
  }

  function resetCamera() {
    focusedContinent = null;
    animateCamera({ x: 0, y: 0, w: MAP_W, h: MAP_H });
  }

  function applyCamera() {
    if (!mapSvg || !camera) return;
    camera = clampCamera(camera);
    const vb = [camera.x, camera.y, camera.w, camera.h].map((v) => Math.round(v * 10) / 10).join(" ");
    mapSvg.setAttribute("viewBox", vb);
    const zoomed = camera.w < MAP_W * 0.82;
    mapSvg.classList.toggle("is-zoomed", zoomed);
    if (mapViewport) mapViewport.style.touchAction = zoomed ? "none" : "pan-y";
    const percent = Math.round((MAP_W / camera.w) * 100);
    if (zoomLabelEl) zoomLabelEl.textContent = percent + "%";
    const read = rootRef && rootRef.querySelector("[data-zoom-read]");
    if (read) read.textContent = percent + "%";
    updateNodeScale();
    updateLabelVisibility();
    updateChips();
  }

  function updateLabelVisibility() {
    if (!mapSvg || !camera || !GEO || !GEO.territories) return;
    const pad = 10;
    Object.keys(nameRefs).forEach((id) => {
      const ref = nameRefs[id];
      const geo = GEO.territories[id];
      if (!ref || !geo) return;
      const pos = namePos(id, geo);
      const visible = pos.x >= camera.x + pad && pos.x <= camera.x + camera.w - pad &&
        pos.y >= camera.y + pad && pos.y <= camera.y + camera.h - pad;
      ref.classList.toggle("is-out", !visible);
    });
  }

  function updateNodeScale() {
    if (!mapViewport || !mapSvg || !camera) return;
    const screen = mapViewport.clientWidth || 900;
    const px = screen / Math.max(1, camera.w);
    mapSvg.style.setProperty("--risk-inv", (1 / Math.max(0.001, px)).toFixed(4));
    const target = screen < 560 ? 24 : 27;
    nodeScaleValue = clamp(target / (26 * Math.max(0.001, px)), 0.22, 4.2);
    Object.keys(nodeRefs).forEach((id) => {
      const geo = GEO && GEO.territories ? GEO.territories[id] : null;
      const ref = nodeRefs[id];
      if (!geo || !ref) return;
      ref.g.setAttribute("transform", "translate(" + geo.label[0] + "," + geo.label[1] + ") scale(" + nodeScaleValue.toFixed(3) + ")");
    });
  }

  function updateChips() {
    if (!rootRef || !state) return;
    rootRef.querySelectorAll("[data-focus]").forEach((btn) => {
      const code = btn.getAttribute("data-focus");
      const isWorld = code === "world";
      btn.classList.toggle("active", focusedContinent ? code === focusedContinent : isWorld);
      if (isWorld) return;
      const owner = continentOwner(code);
      btn.classList.toggle("owned", owner >= 0);
      btn.style.setProperty("--pc", owner >= 0 ? state.players[owner].color : "transparent");
      const count = btn.querySelector("[data-chip-count]");
      if (count) {
        const total = (CONTINENT_TERRITORIES[code] || []).length;
        count.textContent = continentCount(code, owner >= 0 ? owner : state.current) + "/" + total;
      }
    });
  }

  function renderMap() {
    if (!mapSvg || !state) return;
    const current = state.current;
    const phase = state.phase;
    const act = canControl();
    const deployOwner = phase === "setup" ? state.setupPlayer : phase === "reinforce" ? current : -1;
    const selected = state.selected || state.fortifyFrom || (state.pendingMove ? state.pendingMove.from : null);
    const targetSet = new Set();
    if (phase === "attack" && state.selected && state.owner[state.selected] === current && state.troops[state.selected] >= 2) {
      adjacentEnemies(state.selected, current).forEach((id) => targetSet.add(id));
    }
    const fortSet = new Set();
    if (phase === "fortify" && state.fortifyFrom) {
      fortifyTargets(state.fortifyFrom).forEach((id) => fortSet.add(id));
    }
    const moveDest = state.pendingMove ? state.pendingMove.to : null;

    TERRITORIES.forEach((t) => {
      const owner = state.owner[t.id];
      const ref = terrRefs[t.id];
      const node = nodeRefs[t.id];
      const color = owner >= 0 && state.players[owner] ? state.players[owner].color : null;
      const fill = color ? hexToRgba(color, 0.88) : territoryBaseFill(t.c);
      if (ref) {
        (pathRefs[t.id] || []).forEach((path) => path.setAttribute("fill", fill));
        ref.classList.toggle("is-selected", selected === t.id);
        ref.classList.toggle("is-target", targetSet.has(t.id));
        ref.classList.toggle("is-fortify-target", fortSet.has(t.id));
        ref.classList.toggle("is-move-dest", moveDest === t.id);
        ref.classList.toggle("is-deployable", owner === deployOwner && (phase === "setup" || phase === "reinforce") && act);
        ref.classList.toggle("is-claimable", phase === "claim" && owner < 0 && act);
        ref.classList.toggle("is-unowned", owner < 0);
        ref.classList.toggle("is-complete", owner >= 0 && continentsOf(owner).indexOf(t.c) >= 0);
      }
      if (node) {
        const g = node.g;
        g.classList.toggle("is-selected", selected === t.id);
        g.classList.toggle("is-target", targetSet.has(t.id));
        g.classList.toggle("is-fortify-target", fortSet.has(t.id));
        g.classList.toggle("is-move-dest", moveDest === t.id);
        g.classList.toggle("is-deployable", owner === deployOwner && (phase === "setup" || phase === "reinforce") && act);
        g.classList.toggle("is-claimable", phase === "claim" && owner < 0 && act);
        g.classList.toggle("is-unowned", owner < 0);
        g.classList.toggle("is-complete", owner >= 0 && continentsOf(owner).indexOf(t.c) >= 0);
        if (node.body) node.body.setAttribute("fill", color || "#1b2a31");
        if (node.text) node.text.textContent = owner >= 0 ? String(state.troops[t.id]) : "?";
        const ownerName = owner >= 0 ? state.players[owner].name : "غير مملوك";
        g.setAttribute("aria-label", t.name + " — " + ownerName + " — " + (owner >= 0 ? state.troops[t.id] + " كتيبة" : "بانتظار الاختيار"));
      }
    });

    renderRouteLayer(targetSet, fortSet);
    applyCamera();
  }

  function renderRouteLayer(targetSet, fortSet) {
    if (!pathLayer || !state) return;
    const paths = [];
    const selected = state.selected || state.fortifyFrom;
    if (state.phase === "attack" && state.selected) {
      Array.from(targetSet).forEach((dst, i) => {
        const a = GEO.territories[state.selected];
        const b = GEO.territories[dst];
        if (!a || !b) return;
        paths.push('<path class="risk-attack-path" d="' + curvePath(a.label, b.label, i % 2 ? -1 : 1) + '" marker-end="url(#riskArrowAttack)"/>');
      });
    }
    if (state.phase === "fortify" && state.fortifyFrom) {
      Array.from(fortSet).forEach((dst, i) => {
        const a = GEO.territories[state.fortifyFrom];
        const b = GEO.territories[dst];
        if (!a || !b) return;
        paths.push('<path class="risk-fortify-path' + (state.fortifyTo === dst ? " active" : "") + '" d="' + curvePath(a.label, b.label, i % 2 ? -1 : 1) + '" marker-end="url(#riskArrowFort)"/>');
      });
    }
    if (state.pendingMove && GEO.territories[state.pendingMove.from] && GEO.territories[state.pendingMove.to]) {
      const a = GEO.territories[state.pendingMove.from];
      const b = GEO.territories[state.pendingMove.to];
      paths.push('<path class="risk-move-path" d="' + curvePath(a.label, b.label, 0.8) + '" marker-end="url(#riskArrowMove)"/>');
    }
    const key = state.phase + "|" + (selected || "") + "|" + Array.from(targetSet).sort().join(",") + "|" + Array.from(fortSet).sort().join(",") + "|" + (state.fortifyTo || "") + "|" + (state.pendingMove ? state.pendingMove.from + "-" + state.pendingMove.to : "");
    if (key === lastRouteKey) return;
    lastRouteKey = key;
    pathLayer.innerHTML = paths.join("");
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function animateMarch(from, to, count, kind) {
    if (!mapSvg || !GEO || !GEO.territories[from] || !GEO.territories[to]) return;
    if (!FX || typeof FX.motionEnabled !== "function" || !FX.motionEnabled()) return;
    const layer = mapSvg.querySelector(".risk-march-layer");
    if (!layer) return;
    const a = GEO.territories[from].label;
    const b = GEO.territories[to].label;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const bend = kind === "fortify" ? 26 : 38;
    const cx = mx - (dy / len) * bend;
    const cy = my + (dx / len) * bend;

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "risk-march" + (kind ? " " + kind : ""));
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", "11");
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("y", "3.5");
    text.textContent = String(Math.max(1, count));
    g.appendChild(circle);
    g.appendChild(text);
    layer.appendChild(g);

    const frames = [];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
      const y = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
      frames.push({ transform: "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)", offset: t });
    }
    try {
      const anim = g.animate(frames, { duration: kind === "fortify" ? 460 : 540, easing: "cubic-bezier(.3,.7,.3,1)" });
      anim.onfinish = () => { if (g.parentNode) g.parentNode.removeChild(g); };
      setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, 900);
    } catch (e) {
      if (g.parentNode) g.parentNode.removeChild(g);
    }
  }

  /* ------------------------------ لوحات الواجهة ------------------------------ */

  function phaseLabel() {
    if (!state) return "";
    if (state.phase === "claim") return "اختيار الأراضي";
    if (state.phase === "setup") return "الإعداد";
    if (state.phase === "reinforce") return "التعزيز";
    if (state.phase === "attack") return "الهجوم";
    if (state.phase === "fortify") return "التحصين";
    return state.phase === "over" ? "النهاية" : state.phase;
  }

  function canControl() {
    if (!state || state.over) return false;
    const seat = activeSeat();
    if (seat < 0) return false;
    const player = state.players[seat];
    if (!player) return false;
    if (isOnline()) return apiRef.net.seat === seat && !apiRef.net.isCpuSeat(seat);
    return !player.isCpu;
  }

  function phaseStepsHTML() {
    const steps = [];
    if (rule("setup") === "draft") steps.push({ id: "claim", label: "الاختيار" });
    steps.push({ id: "setup", label: "الإعداد" }, { id: "reinforce", label: "التعزيز" }, { id: "attack", label: "الهجوم" }, { id: "fortify", label: "التحصين" });
    let active = steps.findIndex((step) => step.id === state.phase);
    if (state.phase === "over") active = steps.length;
    return '<div class="risk-phases">' + steps.map((step, i) => {
      const cls = i < active ? "done" : i === active ? "active" : "";
      return '<span class="risk-phase ' + cls + '"><i>' + (i + 1) + "</i>" + step.label + "</span>";
    }).join("") + "</div>";
  }

  function turnSubtitle() {
    if (!state) return "";
    if (state.phase === "over") {
      const winner = state.winner != null ? state.players[state.winner] : null;
      return winner ? "فاز " + winner.name + " — " + state.winReason : "انتهت الحملة.";
    }
    if (state.phase === "claim") return "اختر إقليمًا غير مملوك — تبدأ الحدود بالتشكّل.";
    if (state.phase === "setup") return "وزّع " + state.toPlace + " كتيبة إعداد على أراضيك.";
    if (state.phase === "reinforce") {
      return "وزّع " + state.toPlace + " كتيبة تعزيز" + (canExchange(cur()) ? " — لديك مجموعة بطاقات صالحة." : ".");
    }
    if (state.phase === "fortify") return "انقل كتائب بين أراضيك ثم أكّد العدد.";
    if (state.pendingMove) return "أكّد عدد الكتائب المنقولة إلى الإقليم المحتل.";
    return "اهجم من أراضيك، ثم حصّن وأنهِ الدور.";
  }

  function actionHint() {
    if (!state) return "";
    if (state.phase === "reinforce") {
      return canExchange(cur()) ? "بدّل مجموعة البطاقات الآن للحصول على تعزيزات إضافية قبل الهجوم." : "وزّع كل كتائب التعزيز بالنقر على أراضيك.";
    }
    if (state.phase === "fortify") {
      return state.fortifyFrom ? "اختر الوجهة ثم حدّد عدد الكتائب في لوحة النقل." : "اختر مصدرًا فيه كتيبتان على الأقل.";
    }
    if (state.phase === "attack") {
      if (state.selected) return "اختر إقليمًا معاديًا مجاورًا، أو غيّر عدد النرد قبل الضربة.";
      return "انقر إقليمًا تملكه لبدء الهجوم، أو استخدم زر التحصين.";
    }
    if (state.phase === "over") return "أغلقت الحملة — يمكنك بدء مباراة جديدة.";
    return "انقر على الخريطة لتنفيذ الأمر.";
  }

  function numberPanelHTML() {
    if (!state || !state.pendingMove) return "";
    const pm = state.pendingMove;
    const from = TERR_BY_ID[pm.from];
    const to = TERR_BY_ID[pm.to];
    if (!from || !to) return "";
    const min = Math.max(1, pm.min || 1);
    const max = Math.max(min, pm.max || min);
    const value = clamp(Number(pm.value) || min, min, max);
    const isFortify = pm.kind === "fortify";
    const quick = Array.from(new Set([min, Math.max(min, Math.floor((min + max) / 2)), max]));
    return (
      '<div class="risk-number">' +
      '<div class="risk-number-head"><b>' + (isFortify ? "🛡️ تحصين — نقل كتائب" : "🏴 استحواذ — نقل كتائب") + "</b>" +
      "<span>" + svgEscape(from.name) + " ← " + svgEscape(to.name) + "</span></div>" +
      '<div class="risk-number-row">' +
      '<button type="button" class="risk-step" data-num-step="-1" aria-label="إنقاص كتيبة">−</button>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="1" value="' + value + '" data-number-range aria-label="عدد الكتائب المنقولة">' +
      '<button type="button" class="risk-step" data-num-step="1" aria-label="زيادة كتيبة">+</button>' +
      '<output class="risk-number-out" data-number-output aria-live="polite">' + value + "</output>" +
      "</div>" +
      '<div class="risk-number-quick">' +
      quick.map((v) => '<button type="button" data-num-set="' + v + '"' + (v === value ? ' class="active"' : "") + ">" + v + "</button>").join("") +
      '<button type="button" data-num-set="max">الحد الأقصى (' + max + ")</button>" +
      "</div>" +
      '<div class="risk-number-actions">' +
      '<button type="button" class="bg-btn primary" data-act="number-confirm"><span>✅ ' + (isFortify ? "تأكيد التحصين" : "تأكيد الاستحواذ") + "</span></button>" +
      (isFortify ? '<button type="button" class="bg-btn ghost small" data-act="number-cancel"><span>↩ رجوع</span></button>' : "") +
      "</div>" +
      '<p class="risk-hint">' + (isFortify
        ? "حدّد العدد ثم أكّد. التحصين المتصل ينهي دورك بعد التأكيد، ويبقى المتعدد متاحًا لعدة نقلات."
        : "اترك كتيبة واحدة على الأقل في الإقليم المهاجم، ثم أكّد نقل الكتائب إلى الإقليم المحتل.") + "</p>" +
      "</div>"
    );
  }

  function battleHTML() {
    if (!state || !state.battle) {
      return '<div class="risk-battle-empty"><span>⚔️</span><p>اختر إقليمًا تملكه ثم إقليمًا معاديًا مجاورًا لتبدأ المعركة.</p></div>';
    }
    const b = state.battle;
    return (
      '<div class="risk-battle">' +
      '<div class="risk-battle-side"><span class="risk-battle-label">المهاجم · ' + U.escape(b.attackerName) + "</span>" +
      '<div class="risk-battle-dice">' + b.aDice.map((v, i) => dieHTML(v, "a", i)).join("") + "</div>" +
      "<small>خسر " + b.aLoss + "</small></div>" +
      '<div class="risk-battle-vs">⚔️</div>' +
      '<div class="risk-battle-side"><span class="risk-battle-label">المدافع · ' + U.escape(b.defenderName) + "</span>" +
      '<div class="risk-battle-dice">' + b.dDice.map((v, i) => dieHTML(v, "d", i)).join("") + "</div>" +
      "<small>خسر " + b.dLoss + "</small></div>" +
      "</div>" +
      (b.conquered ? '<p class="risk-conquered">🏴 سقط ' + U.escape(TERR_BY_ID[b.defenderId].name) + " — انتقلت " + (b.moved || 0) + " كتيبة.</p>" : "")
    );
  }

  function playerRow(p) {
    const count = countTerritories(p.index);
    const active = p.index === activeSeat() && !state.over;
    const conts = continentsOf(p.index);
    const pct = Math.round((count / TERRITORIES.length) * 100);
    return (
      '<div class="risk-player' + (active ? " active" : "") + (p.eliminated ? " out" : "") + '" data-player="' + p.index + '" style="--p:' + p.color + '">' +
      '<span class="risk-pdot">' + (p.index + 1) + "</span>" +
      '<div class="risk-player-main"><div class="risk-player-top"><strong>' + U.escape(p.name) +
      (p.isCpu ? ' <i class="risk-cpu">كمبيوتر</i>' : "") + "</strong><b>" + (p.eliminated ? "—" : count + " إقليم") + "</b></div>" +
      '<div class="risk-player-bar"><i style="width:' + pct + '%"></i></div>' +
      "<small>" + (p.eliminated ? "مُقصى من الخريطة" : p.cards.length + " بطاقة · تعزيز +" + reinforceAmount(p.index)) + "</small></div>" +
      '<span class="risk-conts">' + conts.map((c) => '<i title="' + U.escape(CONTINENTS[c].name) + '" style="--cc:' + CONTINENTS[c].color + '"></i>').join("") + "</span>" +
      "</div>"
    );
  }

  function ruleChips() {
    const victory = rule("victory") === "mission" ? "فوز: المهمة" : rule("victory") === "domination" ? "فوز: سيطرة 60%" : rule("victory") === "elimination" ? "فوز: إقصاء الجميع" : "فوز: سيطرة أو مهمة";
    const cards = rule("cards") === "off" ? "بلا بطاقات" : rule("cards") === "simple" ? "بطاقات مبسّطة" : "بطاقات كلاسيكية";
    const fort = rule("fortify") === "none" ? "بلا تحصين" : rule("fortify") === "anywhere" ? "تحصين حر" : rule("fortify") === "unlimited" ? "تحصين متعدد" : "تحصين متصل";
    const reinf = rule("reinforce") === "rapid" ? "تعزيز سريع" : "تعزيز كلاسيكي";
    const setup = rule("setup") === "draft" ? "اختيار بالتبادل" : "توزيع عشوائي";
    return [victory, cards, fort, reinf, setup].map((label) => '<span class="risk-rule-chip">' + U.escape(label) + "</span>").join("");
  }

  function legendHTML() {
    return '<details class="risk-details risk-legend"><summary><span>مفتاح القارات والمكافآت</span><b>' + state.players.length + " قادة</b></summary>" +
      Object.keys(CONTINENTS).map((code) => {
        const info = CONTINENTS[code];
        const owner = continentOwner(code);
        const ownerName = owner >= 0 ? state.players[owner].name : "غير مكتملة";
        const total = (CONTINENT_TERRITORIES[code] || []).length;
        const count = owner >= 0 ? total : continentCount(code, state.current);
        return '<div class="risk-legend-row' + (owner >= 0 ? " owned" : "") + '"><i style="--cc:' + info.color + '"></i><span>' + U.escape(info.name) + "</span><b>+" + info.bonus + "</b><small>" + U.escape(ownerName) + " · " + count + "/" + total + "</small></div>";
      }).join("") +
      '<div class="risk-rule-chips">' + ruleChips() + "</div></details>";
  }

  function actionsHTML() {
    if (!state) return "";
    if (state.over) {
      return '<div class="risk-panel risk-actions"><span class="risk-kicker">انتهت الحملة</span><p class="risk-hint">' + U.escape(state.winReason || "") + "</p></div>";
    }
    if (state.pendingMove) return '<div class="risk-panel risk-actions">' + numberPanelHTML() + "</div>";

    const act = canControl();
    const p = cur();
    const phase = state.phase;
    let body = "";

    if (phase === "claim") {
      body = '<p class="risk-hint">اختر أي إقليم رمادي غير مملوك لضمّه إلى إمبراطوريتك. يتناوب القادة بالترتيب.</p>' +
        '<button type="button" class="bg-btn" data-act="autoclaim"' + (act ? "" : " disabled") + '><span>🎲 اختيار تلقائي</span></button>';
    } else if (phase === "setup") {
      body = '<p class="risk-hint">انقر على أراضيك لتوزيع كتائب الإعداد. زر التوزيع التلقائي يضع كل الكتائب المتبقية على الحدود والمناطق الأكثر عرضة.</p>' +
        '<button type="button" class="bg-btn" data-act="autoplace"' + (act ? "" : " disabled") + '><span>⚡ توزيع تلقائي</span></button>';
    } else if (phase === "reinforce") {
      const canEx = canExchange(p) && act;
      body = '<div class="risk-action-row">' +
        '<button type="button" class="bg-btn" data-act="exchange"' + (canEx ? "" : " disabled") + '><span>🃏 بدّل المجموعة (+' + nextTradeValue() + ")</span></button>" +
        '<button type="button" class="bg-btn ghost" data-act="undo-reinforce"' + (act && state.reinforceLog.length ? "" : " disabled") + '><span>↩ تراجع</span></button>' +
        "</div>" +
        '<button type="button" class="bg-btn primary" data-act="end"' + (act && state.toPlace <= 0 && !handLimitBlocked(p) ? "" : " disabled") + '><span>⏭️ إنهاء الدور</span></button>' +
        '<p class="risk-hint">' + actionHint() + "</p>";
    } else if (phase === "attack") {
      const movable = fortifyMovable();
      const maxDice = state.selected ? clamp((state.troops[state.selected] || 1) - 1, 1, 3) : 3;
      const diceRow = state.selected
        ? '<div class="risk-dice-pick"><span>نرد المهاجم</span>' + [1, 2, 3].map((n) =>
          '<button type="button" data-attack-dice="' + n + '"' + (state.attackDice === n ? ' class="active"' : "") + (n > maxDice ? " disabled" : "") + ">" + n + "</button>").join("") + "</div>"
        : "";
      body = '<div class="risk-action-row">' +
        '<button type="button" class="bg-btn" data-act="fortify"' + (act && movable && !state.fortifyUsed ? "" : " disabled") + '><span>🛡️ تحصين</span></button>' +
        '<button type="button" class="bg-btn ghost" data-act="cancel"' + (state.selected ? "" : " disabled") + '><span>✖ إلغاء</span></button>' +
        "</div>" +
        diceRow +
        '<button type="button" class="bg-btn primary" data-act="end"' + (act && state.toPlace <= 0 && !handLimitBlocked(p) ? "" : " disabled") + '><span>⏭️ إنهاء الدور</span></button>' +
        '<p class="risk-hint">' + actionHint() + "</p>";
    } else if (phase === "fortify") {
      body = '<button type="button" class="bg-btn ghost" data-act="cancel"><span>↩ رجوع للهجوم</span></button>' +
        '<p class="risk-hint">' + actionHint() + "</p>";
    }

    return '<div class="risk-panel risk-actions"><span class="risk-kicker">أوامر</span>' + body + "</div>";
  }

  function sideHTML() {
    if (!state) return "";
    return sideTopHTML() + sideRestHTML();
  }

  function sideTopHTML() {
    if (!state) return "";
    const seat = activeSeat();
    const p = seat >= 0 ? state.players[seat] : null;
    const phase = state.phase;
    const statSecond = phase === "claim" ? state.claimCount + "/" + TERRITORIES.length : (phase === "setup" || phase === "reinforce") ? state.toPlace : (state.selected ? state.troops[state.selected] : "—");
    const statSecondLabel = phase === "claim" ? "مختارة" : (phase === "setup" || phase === "reinforce") ? "متبقية" : "مختارة";

    return (
      '<div class="risk-panel risk-turn" style="--p:' + (p ? p.color : "#8a9aa0") + '">' +
      '<div class="risk-turn-top"><span class="risk-kicker">' + phaseLabel() + '</span><span class="risk-turn-no">دور ' + (state.turn || 1) + "</span></div>" +
      "<strong>" + U.escape(p ? p.name : "انتهت الحملة") + "</strong>" +
      "<small>" + U.escape(turnSubtitle()) + "</small>" +
      phaseStepsHTML() +
      '<div class="risk-turn-stats">' +
      "<div><b>" + (p ? countTerritories(p.index) : 0) + "</b><small>إقليم</small></div>" +
      "<div><b>" + statSecond + "</b><small>" + statSecondLabel + "</small></div>" +
      "<div><b>" + (p ? p.cards.length : 0) + "</b><small>بطاقة</small></div>" +
      "<div><b>" + (p ? continentsOf(p.index).length : 0) + "</b><small>قارة</small></div>" +
      "</div></div>" +
      actionsHTML() +
      '<div class="risk-panel risk-battle-panel"><span class="risk-kicker">آخر معركة</span>' + battleHTML() + "</div>"
    );
  }

  function sideRestHTML() {
    if (!state) return "";
    return (
      '<div class="risk-panel risk-players"><span class="risk-kicker">القادة</span>' + state.players.map(playerRow).join("") + "</div>" +
      legendHTML()
    );
  }

  function secretHTML() {
    if (!state) return "";
    const viewer = viewerPlayer();
    const over = state.over;
    const missionBlock = (() => {
      if (over) {
        return '<div class="risk-secret-missions"><span class="risk-kicker">المهمات عند نهاية الحملة</span>' +
          state.players.map((p) => {
            const m = p.mission;
            return '<div class="risk-reveal-mission" style="--p:' + p.color + '"><span>' + (m ? m.icon : "•") + "</span><strong>" + U.escape(p.name) + "</strong><small>" + U.escape(m ? m.title : "بلا مهمة") + "</small></div>";
          }).join("") + "</div>";
      }
      if (!state.missionMode) {
        return '<p class="risk-secret-note">هذه المباراة بلا مهمات سرية — الفوز يكون عسكريًا بالسيطرة أو الإقصاء.</p>';
      }
      if (!viewer) {
        return '<p class="risk-secret-note">أنت مشاهد. لا تُعرض مهمة أي قائد على هذا الجهاز.</p>';
      }
      const m = missionStatus(viewer);
      if (!m) return "";
      const pct = m.progress && m.progress.need ? clamp(Math.round((m.progress.have / m.progress.need) * 100), 0, 100) : 0;
      return '<div class="risk-mission' + (m.done ? " done" : "") + '">' +
        '<span class="risk-mission-icon">' + m.icon + "</span>" +
        '<div class="risk-mission-body"><span class="risk-kicker">مهمتك السرية</span><strong>' + U.escape(m.title) + "</strong>" +
        "<p>" + U.escape(m.detail) + "</p>" +
        (m.progress ? '<div class="risk-mission-bar"><i style="width:' + pct + '%"></i></div><small>' + U.escape(m.progress.text) + "</small>" : "") +
        "</div></div>";
    })();

    if (!viewer) {
      return missionBlock + '<p class="risk-secret-note">البطاقات والمهمات لا تُعرض إلا لصاحب المقعد على هذا الجهاز.</p>';
    }
    if (viewer.eliminated && !over) {
      return missionBlock + '<p class="risk-secret-note">أُقصيت من الحملة — يمكنك متابعة بقية القادة من الخريطة.</p>';
    }

    const cards = viewer.cards || [];
    const canTrade = canControl() && (state.phase === "reinforce" || state.phase === "attack") && !state.pendingMove;
    const hasSelection = tradeSel.length === 3;
    const cardsHTML = cards.length
      ? '<div class="risk-cards-grid">' + cards.map((card, index) => {
        const key = cardTypeKey(card);
        const info = CARD_TYPES[key] || CARD_TYPES.infantry;
        const terr = card && card.terr && TERR_BY_ID[card.terr] ? TERR_BY_ID[card.terr].name : "";
        const chosen = tradeSel.indexOf(index) >= 0;
        return '<button type="button" class="risk-card ' + key + (chosen ? " selected" : "") + '" data-card-index="' + index + '"' + (canTrade ? "" : " disabled") + ' aria-pressed="' + chosen + '">' +
          "<span>" + info.icon + "</span><strong>" + info.name + "</strong>" +
          "<small>" + (terr ? U.escape(terr) : "بديل أي نوع") + "</small></button>";
      }).join("") + "</div>"
      : '<p class="risk-cards-empty">لا تملك بطاقات بعد. استحوذ على إقليم في دورك لتحصل على بطاقة عند إنهائه.</p>';

    return missionBlock +
      '<div class="risk-secret-cards"><span class="risk-kicker">بطاقات القيادة · ' + cards.length + "/5</span>" +
      cardsHTML +
      '<div class="risk-secret-actions">' +
      '<button type="button" class="bg-btn primary small" data-act="exchange"' + (canTrade ? "" : " disabled") + '><span>🃏 بدّل المحدد (+' + nextTradeValue() + ")</span></button>" +
      (tradeSel.length ? '<button type="button" class="bg-btn ghost small" data-act="trade-clear"><span>مسح التحديد</span></button>' : "") +
      "</div>" +
      '<p class="risk-secret-note">' + (hasSelection ? "تم تحديد ثلاث بطاقات — اضغط التبديل." : "اختر ثلاث بطاقات متشابهة أو واحدة من كل نوع. الجوكر بديل عن أي نوع.") +
      (rule("cards") === "classic" ? " مكافأة الإقليم المطابق +2 كتيبة." : "") + "</p></div>";
  }

  function render() {
    if (!rootRef || !state || !ready) return;
    const viewer = viewerSeat();
    if (viewer !== lastViewer) {
      lastViewer = viewer;
      tradeSel = [];
      tradeOwner = viewer;
    }
    renderMap();
    if (sideTop) sideTop.innerHTML = sideTopHTML();
    if (sideRest) sideRest.innerHTML = sideRestHTML();
    if (secret) secret.refresh();
    if (noticeEl) {
      noticeEl.textContent = state.notice || "";
      noticeEl.classList.toggle("is-quiet", !state.notice);
      noticeEl.classList.toggle("is-over", !!state.over);
    }
    updateStatus();
    syncCpu();
  }

  function updateStatus() {
    if (!apiRef || !apiRef.setStatus || !state) return;
    if (state.over) {
      apiRef.setStatus("انتهت الحملة", "");
      return;
    }
    if (isOnline() && viewerSeat() < 0) {
      apiRef.setStatus("مشاهدة", "live");
      return;
    }
    const seat = activeSeat();
    const player = seat >= 0 ? state.players[seat] : null;
    apiRef.setStatus(player ? "دور " + AI.statusName(player) : phaseLabel(), "live");
  }

  function syncNumberUI() {
    if (!rootRef || !state || !state.pendingMove) return;
    const pm = state.pendingMove;
    const min = Math.max(1, pm.min || 1);
    const max = Math.max(min, pm.max || min);
    pm.value = clamp(Number(pm.value) || min, min, max);
    const range = rootRef.querySelector("[data-number-range]");
    const output = rootRef.querySelector("[data-number-output]");
    if (range) range.value = String(pm.value);
    if (output) output.textContent = String(pm.value);
    rootRef.querySelectorAll("[data-num-set]").forEach((btn) => {
      const value = btn.getAttribute("data-num-set") === "max" ? max : Number(btn.getAttribute("data-num-set"));
      btn.classList.toggle("active", value === pm.value);
    });
  }

  function onRootInput(event) {
    const range = event.target.closest("[data-number-range]");
    if (!range || !state || !state.pendingMove) return;
    state.pendingMove.value = clamp(Number(range.value) || 1, state.pendingMove.min || 1, state.pendingMove.max || 1);
    syncNumberUI();
  }

  function onRootKeydown(event) {
    if (event.key === "Escape" && state && !state.over) {
      if (state.pendingMove) {
        if (state.pendingMove.kind === "fortify") cancelFortify();
        return;
      }
      if (state.selected) {
        state.selected = null;
        state.notice = "أُلغي التحديد.";
        render();
      }
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const terr = event.target.closest("[data-terr]");
    if (!terr || !mapSvg || !mapSvg.contains(terr)) return;
    event.preventDefault();
    handleTerritory(terr.getAttribute("data-terr"));
  }

  function onRootClick(event) {
    if (performance.now() - lastDragAt < 300) return;
    const card = event.target.closest("[data-card-index]");
    if (card) {
      toggleTrade(Number(card.getAttribute("data-card-index")));
      return;
    }
    const focus = event.target.closest("[data-focus]");
    if (focus) {
      focusContinent(focus.getAttribute("data-focus"));
      return;
    }
    const zoomBtn = event.target.closest("[data-zoom]");
    if (zoomBtn) {
      const dir = Number(zoomBtn.getAttribute("data-zoom"));
      if (dir === 0) resetCamera();
      else zoomBy(dir > 0 ? 0.78 : 1.28);
      return;
    }
    const diceBtn = event.target.closest("[data-attack-dice]");
    if (diceBtn) {
      if (!state || !canControl()) return;
      state.attackDice = clamp(Number(diceBtn.getAttribute("data-attack-dice")) || 3, 1, 3);
      render();
      return;
    }
    const actBtn = event.target.closest("[data-act]");
    if (actBtn) {
      handleAction(actBtn.getAttribute("data-act"));
      return;
    }
    const numStep = event.target.closest("[data-num-step]");
    if (numStep) {
      if (!state || !state.pendingMove) return;
      state.pendingMove.value = clamp((state.pendingMove.value || 1) + Number(numStep.getAttribute("data-num-step") || 0), state.pendingMove.min || 1, state.pendingMove.max || 1);
      syncNumberUI();
      return;
    }
    const numSet = event.target.closest("[data-num-set]");
    if (numSet) {
      if (!state || !state.pendingMove) return;
      const raw = numSet.getAttribute("data-num-set");
      state.pendingMove.value = raw === "max" ? state.pendingMove.max : clamp(Number(raw) || 1, state.pendingMove.min || 1, state.pendingMove.max || 1);
      syncNumberUI();
      return;
    }
    const terr = event.target.closest("[data-terr]");
    if (terr && mapSvg && mapSvg.contains(terr)) {
      handleTerritory(terr.getAttribute("data-terr"));
    }
  }

  function handleAction(act) {
    if (!state) return;
    if (act === "number-confirm") {
      if (!state.pendingMove || !canControl()) return;
      const pm = state.pendingMove;
      if (pm.kind === "conquest") applyConquestMove(pm.value);
      else performFortify(pm.from, pm.to, pm.value);
      return;
    }
    if (act === "number-cancel") {
      cancelFortify();
      return;
    }
    if (act === "trade-clear") {
      tradeSel = [];
      render();
      return;
    }
    if (act === "reset-view") {
      resetCamera();
      return;
    }
    if (state.over) return;
    if (!canAct()) {
      if (isOnline()) BG.toast("انتظر دورك.", "warn");
      return;
    }
    if (act === "exchange") exchangeCards(tradeSel);
    else if (act === "fortify") startFortify();
    else if (act === "end") endTurn();
    else if (act === "autoclaim") autoClaim();
    else if (act === "autoplace") autoPlaceSetup();
    else if (act === "undo-reinforce") undoReinforcement();
    else if (act === "cancel") {
      if (state.phase === "fortify") cancelFortify();
      else {
        state.selected = null;
        state.notice = "أُلغي التحديد.";
        render();
      }
    }
  }

  function toggleTrade(index) {
    if (!state || !canControl() || state.pendingMove) return;
    if (state.phase !== "reinforce" && state.phase !== "attack") return;
    const viewer = viewerPlayer();
    if (!viewer || !viewer.cards || !viewer.cards[index]) return;
    const pos = tradeSel.indexOf(index);
    if (pos >= 0) tradeSel.splice(pos, 1);
    else {
      tradeSel.push(index);
      if (tradeSel.length > 3) tradeSel.shift();
    }
    if (FX) FX.sound("select");
    if (secret) secret.refresh();
  }

  function handleTerritory(terrId) {
    if (!state || state.over || !TERR_BY_ID[terrId]) return;
    if (state.pendingMove) {
      BG.toast("أكّد عدد الكتائب المنقولة أولًا.", "warn");
      return;
    }
    if (!canAct()) {
      if (isOnline()) BG.toast("انتظر دورك.", "warn");
      else if (cur() && cur().isCpu) BG.toast("الكمبيوتر يفكر…", "warn");
      return;
    }
    if (state.phase === "claim") claimTerritory(terrId);
    else if (state.phase === "setup") placeSetup(terrId);
    else if (state.phase === "reinforce") placeReinforcement(terrId);
    else if (state.phase === "fortify") fortifyClick(terrId);
    else if (state.phase === "attack") {
      if (state.owner[terrId] === state.current) selectForAttack(terrId);
      else if (state.selected) attack(terrId);
      else {
        BG.toast("اختر إقليمًا تملكه أولًا.", "warn");
        if (FX) FX.sound("error");
      }
    }
  }

  BG.register(game);
})();

