/* ==========================================================================
   ريسك — السيطرة على العالم (نسخة رقمية كاملة)
   خرائط متعددة، قوانين أصلية قابلة للضبط، وواجهة عربية متجاوبة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const PCOLORS = ["#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ffb74d"];

  const RULE_DEFAULTS = {
    map: "classic",
    victory: "elimination",
    cards: "classic",
    fortify: "connected",
    reinforce: "classic",
    setup: "random",
    setupArmies: "quick",
  };

  /* ------------------------------ بيانات الخرائط ------------------------------ */

  const MAPS = {
    classic: {
      id: "classic",
      name: "العالم الكلاسيكي",
      short: "كلاسيكي",
      desc: "42 إقليمًا · 6 قارات · خريطة ريسك الأصلية",
      viewBox: "0 0 960 560",
      continents: {
        na: { name: "أمريكا الشمالية", bonus: 5, color: "#d98b5f", blob: "M48 152 Q54 74 146 52 Q252 26 336 66 Q390 96 372 158 Q360 216 304 250 Q262 278 216 302 Q154 320 108 278 Q58 232 48 152Z" },
        sa: { name: "أمريكا الجنوبية", bonus: 2, color: "#c7a04d", blob: "M238 312 Q308 292 362 332 Q398 386 380 452 Q362 520 308 540 Q252 548 236 484 Q222 398 238 312Z" },
        eu: { name: "أوروبا", bonus: 5, color: "#6fa9c9", blob: "M400 140 Q404 76 478 58 Q556 38 614 70 Q640 106 622 158 Q606 210 552 232 Q496 250 448 224 Q404 198 400 140Z" },
        af: { name: "أفريقيا", bonus: 3, color: "#c47f68", blob: "M452 330 Q466 258 534 246 Q612 232 654 286 Q684 340 666 404 Q648 486 596 526 Q542 556 502 500 Q464 442 456 386 Q452 354 452 330Z" },
        as: { name: "آسيا", bonus: 7, color: "#9d86c6", blob: "M626 150 Q646 58 740 40 Q856 18 922 74 Q952 132 928 204 Q906 272 846 312 Q780 348 714 320 Q652 292 634 226 Q626 186 626 150Z" },
        au: { name: "أوقيانوسيا", bonus: 2, color: "#65b394", blob: "M758 372 Q812 340 878 350 Q932 366 944 420 Q956 482 912 522 Q866 552 820 530 Q774 506 762 450 Q756 406 758 372Z" },
      },
      labels: { na: [70, 38], sa: [250, 300], eu: [416, 40], af: [472, 240], as: [648, 34], au: [772, 342] },
      territories: [
        { id: "alaska", name: "ألاسكا", c: "na", x: 95, y: 120 },
        { id: "nwt", name: "الشمال الغربي", c: "na", x: 175, y: 88 },
        { id: "greenland", name: "غرينلاند", c: "na", x: 345, y: 62 },
        { id: "alberta", name: "ألبرتا", c: "na", x: 168, y: 155 },
        { id: "ontario", name: "أونتاريو", c: "na", x: 240, y: 145 },
        { id: "quebec", name: "كيبيك", c: "na", x: 305, y: 130 },
        { id: "wus", name: "غرب الولايات المتحدة", c: "na", x: 168, y: 215 },
        { id: "eus", name: "شرق الولايات المتحدة", c: "na", x: 242, y: 205 },
        { id: "central", name: "أمريكا الوسطى", c: "na", x: 202, y: 272 },

        { id: "venezuela", name: "فنزويلا", c: "sa", x: 285, y: 325 },
        { id: "peru", name: "بيرو", c: "sa", x: 272, y: 378 },
        { id: "brazil", name: "البرازيل", c: "sa", x: 338, y: 382 },
        { id: "argentina", name: "الأرجنتين", c: "sa", x: 308, y: 455 },

        { id: "iceland", name: "آيسلندا", c: "eu", x: 430, y: 85 },
        { id: "britain", name: "بريطانيا", c: "eu", x: 447, y: 140 },
        { id: "scandinavia", name: "إسكندنافيا", c: "eu", x: 528, y: 95 },
        { id: "neurope", name: "شمال أوروبا", c: "eu", x: 520, y: 152 },
        { id: "weurope", name: "غرب أوروبا", c: "eu", x: 468, y: 188 },
        { id: "seurope", name: "جنوب أوروبا", c: "eu", x: 527, y: 208 },
        { id: "ukraine", name: "أوكرانيا", c: "eu", x: 590, y: 160 },

        { id: "nafrica", name: "شمال أفريقيا", c: "af", x: 492, y: 265 },
        { id: "egypt", name: "مصر", c: "af", x: 558, y: 270 },
        { id: "eafrica", name: "شرق أفريقيا", c: "af", x: 590, y: 335 },
        { id: "congo", name: "الكونغو", c: "af", x: 530, y: 358 },
        { id: "safrica", name: "جنوب أفريقيا", c: "af", x: 558, y: 432 },
        { id: "madagascar", name: "مدغشقر", c: "af", x: 628, y: 420 },

        { id: "mideast", name: "الشرق الأوسط", c: "as", x: 648, y: 258 },
        { id: "ural", name: "الأورال", c: "as", x: 652, y: 130 },
        { id: "siberia", name: "سيبيريا", c: "as", x: 712, y: 92 },
        { id: "yakutsk", name: "ياقوتيا", c: "as", x: 782, y: 65 },
        { id: "irkutsk", name: "إيركوتسك", c: "as", x: 775, y: 138 },
        { id: "mongolia", name: "منغوليا", c: "as", x: 792, y: 188 },
        { id: "china", name: "الصين", c: "as", x: 822, y: 228 },
        { id: "japan", name: "اليابان", c: "as", x: 900, y: 205 },
        { id: "india", name: "الهند", c: "as", x: 762, y: 288 },
        { id: "afghanistan", name: "أفغانستان", c: "as", x: 692, y: 218 },
        { id: "siam", name: "سيام", c: "as", x: 802, y: 302 },
        { id: "kamchatka", name: "كامتشاتكا", c: "as", x: 888, y: 102 },

        { id: "indonesia", name: "إندونيسيا", c: "au", x: 795, y: 360 },
        { id: "newguinea", name: "غينيا الجديدة", c: "au", x: 872, y: 372 },
        { id: "waustralia", name: "غرب أستراليا", c: "au", x: 832, y: 442 },
        { id: "eaustralia", name: "شرق أستراليا", c: "au", x: 892, y: 458 },
      ],
      edges: [
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
      ],
    },

    compact: {
      id: "compact",
      name: "عالم مصغّر",
      short: "مصغّر",
      desc: "24 إقليمًا · 6 قارات · مباراة أسرع",
      viewBox: "0 0 960 560",
      continents: {
        na: { name: "أمريكا الشمالية", bonus: 3, color: "#d98b5f", blob: "M48 64 Q142 18 278 52 Q372 74 378 126 Q384 192 304 224 Q248 248 246 292 Q190 332 128 296 Q66 258 52 188 Q38 118 48 64Z" },
        sa: { name: "أمريكا الجنوبية", bonus: 2, color: "#c7a04d", blob: "M238 314 Q306 292 356 328 Q398 374 376 448 Q356 518 304 538 Q248 548 232 482 Q220 400 238 314Z" },
        eu: { name: "أوروبا", bonus: 3, color: "#6fa9c9", blob: "M406 72 Q488 32 574 52 Q634 66 628 130 Q624 192 570 220 Q514 246 466 224 Q404 202 400 148 Q398 106 406 72Z" },
        af: { name: "أفريقيا", bonus: 2, color: "#c47f68", blob: "M486 266 Q568 242 654 276 Q706 314 690 394 Q674 496 612 540 Q546 564 506 496 Q466 424 476 344 Q480 292 486 266Z" },
        as: { name: "آسيا", bonus: 4, color: "#9d86c6", blob: "M670 42 Q812 12 914 52 Q966 90 938 174 Q918 260 850 312 Q780 352 708 326 Q648 292 644 216 Q642 120 670 42Z" },
        au: { name: "أوقيانوسيا", bonus: 1, color: "#65b394", blob: "M782 352 Q866 332 934 376 Q970 424 942 490 Q906 550 840 546 Q784 538 768 476 Q752 412 782 352Z" },
      },
      labels: { na: [78, 44], sa: [258, 318], eu: [432, 52], af: [506, 274], as: [846, 52], au: [806, 382] },
      territories: [
        { id: "alaska", name: "ألاسكا", c: "na", x: 100, y: 112 },
        { id: "northwest", name: "الشمال الغربي", c: "na", x: 218, y: 92 },
        { id: "greenland", name: "غرينلاند", c: "na", x: 348, y: 78 },
        { id: "usa", name: "الولايات المتحدة", c: "na", x: 232, y: 188 },
        { id: "mexico", name: "المكسيك", c: "na", x: 180, y: 266 },
        { id: "peru", name: "بيرو", c: "sa", x: 276, y: 352 },
        { id: "brazil", name: "البرازيل", c: "sa", x: 350, y: 392 },
        { id: "argentina", name: "الأرجنتين", c: "sa", x: 312, y: 482 },
        { id: "britain", name: "بريطانيا", c: "eu", x: 456, y: 132 },
        { id: "scandinavia", name: "إسكندنافيا", c: "eu", x: 556, y: 86 },
        { id: "germany", name: "ألمانيا", c: "eu", x: 580, y: 166 },
        { id: "france", name: "فرنسا", c: "eu", x: 502, y: 188 },
        { id: "spain", name: "إسبانيا", c: "eu", x: 462, y: 246 },
        { id: "sahara", name: "الصحراء", c: "af", x: 536, y: 302 },
        { id: "egypt", name: "مصر", c: "af", x: 620, y: 300 },
        { id: "congo", name: "الكونغو", c: "af", x: 590, y: 392 },
        { id: "southafrica", name: "جنوب أفريقيا", c: "af", x: 622, y: 482 },
        { id: "middleeast", name: "الشرق الأوسط", c: "as", x: 706, y: 284 },
        { id: "siberia", name: "سيبيريا", c: "as", x: 744, y: 100 },
        { id: "china", name: "الصين", c: "as", x: 816, y: 206 },
        { id: "india", name: "الهند", c: "as", x: 770, y: 306 },
        { id: "japan", name: "اليابان", c: "as", x: 900, y: 214 },
        { id: "indonesia", name: "إندونيسيا", c: "au", x: 814, y: 376 },
        { id: "australia", name: "أستراليا", c: "au", x: 890, y: 456 },
      ],
      edges: [
        ["alaska", "northwest"], ["alaska", "usa"], ["alaska", "siberia"],
        ["northwest", "greenland"], ["northwest", "usa"], ["greenland", "usa"], ["greenland", "britain"],
        ["usa", "mexico"], ["mexico", "peru"],
        ["peru", "brazil"], ["peru", "argentina"], ["brazil", "argentina"],
        ["britain", "france"], ["britain", "scandinavia"], ["scandinavia", "germany"],
        ["germany", "france"], ["france", "spain"], ["spain", "sahara"],
        ["sahara", "egypt"], ["sahara", "congo"], ["sahara", "brazil"],
        ["egypt", "congo"], ["egypt", "middleeast"],
        ["congo", "southafrica"], ["southafrica", "indonesia"],
        ["middleeast", "india"], ["middleeast", "china"],
        ["siberia", "china"], ["china", "india"], ["china", "japan"], ["india", "indonesia"],
        ["indonesia", "australia"],
      ],
    },

    islands: {
      id: "islands",
      name: "أرخبيل النخبة",
      short: "أرخبيل",
      desc: "18 جزيرة · 3 أحزمة بحرية · مباراة سريعة",
      viewBox: "0 0 960 560",
      continents: {
        north: { name: "الأرخبيل الشمالي", bonus: 3, color: "#6fa9c9", blob: "M70 96 Q182 34 332 46 Q482 28 612 54 Q762 42 902 74 Q950 112 908 154 Q822 188 702 180 Q562 198 432 186 Q302 202 182 178 Q92 162 70 122Z" },
        center: { name: "البحر الداخلي", bonus: 4, color: "#d98b5f", blob: "M60 300 Q170 248 320 262 Q470 240 620 264 Q760 250 900 276 Q948 312 908 352 Q810 388 680 376 Q540 396 400 384 Q260 400 150 376 Q76 360 60 330Z" },
        south: { name: "الأرخبيل الجنوبي", bonus: 3, color: "#9d86c6", blob: "M90 470 Q200 412 340 428 Q490 408 630 432 Q770 414 894 442 Q944 478 906 518 Q810 552 680 540 Q540 560 400 548 Q260 562 160 536 Q94 514 90 490Z" },
      },
      labels: { north: [92, 68], center: [86, 276], south: [112, 448] },
      territories: [
        { id: "n1", name: "جزيرة الجليد", c: "north", x: 150, y: 105 },
        { id: "n2", name: "المرجان", c: "north", x: 300, y: 85 },
        { id: "n3", name: "الصخور", c: "north", x: 450, y: 115 },
        { id: "n4", name: "الفيروز", c: "north", x: 610, y: 85 },
        { id: "n5", name: "الضباب", c: "north", x: 760, y: 110 },
        { id: "n6", name: "الرياح", c: "north", x: 880, y: 150 },
        { id: "c1", name: "اللؤلؤة", c: "center", x: 140, y: 272 },
        { id: "c2", name: "المرسى", c: "center", x: 290, y: 322 },
        { id: "c3", name: "النخيل", c: "center", x: 440, y: 270 },
        { id: "c4", name: "الشعاب", c: "center", x: 600, y: 325 },
        { id: "c5", name: "البركان", c: "center", x: 750, y: 282 },
        { id: "c6", name: "الواحة", c: "center", x: 880, y: 322 },
        { id: "s1", name: "الرمال", c: "south", x: 170, y: 450 },
        { id: "s2", name: "الغروب", c: "south", x: 320, y: 492 },
        { id: "s3", name: "الجنوب", c: "south", x: 470, y: 446 },
        { id: "s4", name: "الظلال", c: "south", x: 620, y: 486 },
        { id: "s5", name: "العاصفة", c: "south", x: 760, y: 446 },
        { id: "s6", name: "الأعشاب", c: "south", x: 880, y: 492 },
      ],
      edges: [
        ["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "n5"], ["n5", "n6"],
        ["n2", "n4"], ["n3", "n5"], ["n4", "n6"],
        ["c1", "c2"], ["c2", "c3"], ["c3", "c4"], ["c4", "c5"], ["c5", "c6"],
        ["c2", "c4"], ["c3", "c5"], ["c4", "c6"],
        ["s1", "s2"], ["s2", "s3"], ["s3", "s4"], ["s4", "s5"], ["s5", "s6"],
        ["s2", "s4"], ["s3", "s5"], ["s4", "s6"],
        ["n1", "c1"], ["n2", "c2"], ["n3", "c3"], ["n4", "c4"], ["n5", "c5"], ["n6", "c6"],
        ["c1", "s1"], ["c2", "s2"], ["c3", "s3"], ["c4", "s4"], ["c5", "s5"], ["c6", "s6"],
      ],
    },
  };

  const CARD_TYPES = {
    infantry: { name: "مشاة", icon: "⚔️" },
    cavalry: { name: "فرسان", icon: "🐎" },
    artillery: { name: "مدفعية", icon: "💥" },
    wild: { name: "جوكر", icon: "🃏" },
  };
  const CARD_KEYS = ["infantry", "cavalry", "artillery"];
  const CLASSIC_TRADE = [4, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50];

  let MAP = MAPS.classic;
  let CONTINENTS = MAP.continents;
  let TERRITORIES = MAP.territories;
  let TERR_BY_ID = {};
  let EDGES = MAP.edges;
  let ADJ = {};

  function applyMap(id) {
    MAP = MAPS[id] || MAPS.classic;
    CONTINENTS = MAP.continents;
    TERRITORIES = MAP.territories;
    EDGES = MAP.edges;
    TERR_BY_ID = {};
    ADJ = {};
    TERRITORIES.forEach((t) => {
      TERR_BY_ID[t.id] = t;
      ADJ[t.id] = [];
    });
    EDGES.forEach(([a, b]) => {
      if (!ADJ[a] || !ADJ[b]) return;
      if (!ADJ[a].includes(b)) ADJ[a].push(b);
      if (!ADJ[b].includes(a)) ADJ[b].push(a);
    });
  }
  applyMap("classic");

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let cpuAttacks = 0;
  let zoom = 1;

  /* ------------------------------ تعريف اللعبة ------------------------------ */

  const game = {
    id: "risk",
    name: "ريسك",
    en: "RISK",
    icon: "🌍",
    accent: "#d96b5f",
    cardClass: "card-risk",
    tagline: "جيش، حصّن، واهجم — القارات تحتاج قادة لا يترددون.",
    players: "2–6",
    duration: "45–120 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 3,

    options: {
      hint: "اختر الخريطة وشروط النصر والقوانين قبل بدء الحملة.",
      defaults: Object.assign({}, RULE_DEFAULTS),
      fields: [
        {
          key: "map",
          label: "الخريطة",
          type: "select",
          wide: true,
          choices: [
            { value: "classic", label: "العالم الكلاسيكي — 42 إقليمًا (الأصلية)" },
            { value: "compact", label: "عالم مصغّر — 24 إقليمًا (أسرع)" },
            { value: "islands", label: "أرخبيل النخبة — 18 جزيرة (سريعة)" },
          ],
          hint: "الخريطة الكلاسيكية تعيد تجربة ريسك الأصلية بقاراتها الست ومكافآتها الحقيقية.",
        },
        {
          key: "victory",
          label: "شرط الفوز",
          type: "seg",
          choices: [
            { value: "elimination", label: "إقصاء الجميع" },
            { value: "domination", label: "السيطرة على 60%" },
          ],
          hint: "«إقصاء الجميع» هو شرط ريسك الأصلي. «السيطرة على 60%» ينهي المباراة عند بلوغ العتبة.",
        },
        {
          key: "cards",
          label: "بطاقات القيادة",
          type: "select",
          choices: [
            { value: "classic", label: "كلاسيكية: أراضٍ + جوكر + تصاعد" },
            { value: "simple", label: "مبسّطة: 4 ثم 6 ثم 8…" },
            { value: "off", label: "بلا بطاقات" },
          ],
          hint: "البطاقات الكلاسيكية تحمل اسم إقليم ورمز نوع، مع جوكرين ومجموعات تُبدَّل بتصاعد 4/6/8…",
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
          hint: "المتصل هو الأصل: نقل واحد بين إقليمين متجاورين. الحر يسمح بأي إقليم تملكه، والمتعدد يسمح بتكرار النقل.",
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
            { value: "quick", label: "سريع: 3" },
            { value: "classic", label: "أصلي: 40…20" },
          ],
          hint: "الأصلي يوزّع 40 كتيبة للاعبين اثنين، وتنقص 5 لكل لاعب إضافي حتى 20. زر «توزيع تلقائي» يسرّع الإعداد.",
        },
      ],
      summary(options) {
        const o = Object.assign({}, RULE_DEFAULTS, options || {});
        const map = MAPS[o.map] || MAPS.classic;
        const win = o.victory === "domination" ? "سيطرة 60%" : "إقصاء الجميع";
        const cards = o.cards === "off" ? "بلا بطاقات" : o.cards === "simple" ? "بطاقات مبسطة" : "بطاقات كلاسيكية";
        return map.name + " · " + win + " · " + cards;
      },
    },

    rules: {
      goal: "السيطرة العسكرية على العالم: أقصِ جميع القادة الآخرين، أو سيطر على 60% من الأراضي حسب شرط النصر المختار.",
      facts: [
        ["الخرائط", "3 خرائط: 42 / 24 / 18 إقليمًا"],
        ["القارات", "مكافآت تعزيز عند السيطرة الكاملة"],
        ["النرد", "حتى 3 للمهاجم و2 للمدافع"],
        ["البطاقات", "أراضٍ + جوكر + تصاعد 4/6/8…"],
      ],
      components: [
        "خريطة استراتيجية قابلة للاختيار: العالم الكلاسيكي (42 إقليمًا)، عالم مصغّر (24)، أو أرخبيل النخبة (18).",
        "جيش لكل لاعب بلون مختلف، وكل قطعة تمثل كتيبة واحدة.",
        "نردان للمعركة: حتى ثلاثة نرد للمهاجم ونردان للمدافع.",
        "بطاقات قيادة كلاسيكية تحمل اسم إقليم ورمز مشاة أو فرسان أو مدفعية، مع جوكرين.",
        "مكافآت القارات في الخريطة الكلاسيكية: أمريكا الشمالية 5، أوروبا 5، آسيا 7، أفريقيا 3، أمريكا الجنوبية 2، أوقيانوسيا 2.",
        "شريط أعداد لاختيار عدد الكتائب المنقولة في التحصين والاستحواذ، مع أزرار سريعة.",
      ],
      setup: [
        "تُوزَّع الأراضي عشوائيًا بالتساوي، أو تُختار بالتبادل حسب إعداد «توزيع الأراضي».",
        "يضع كل لاعب كتيبة واحدة في كل إقليم يملكه، ثم يوزّع كتائب الإعداد: 3 في الوضع السريع أو 40/35/30/25/20 في الوضع الأصلي.",
        "يمكن استخدام زر «توزيع تلقائي» لإنهاء توزيع كتائب الإعداد بسرعة.",
        "بعد انتهاء توزيع كتائب الإعداد يبدأ اللاعب الأول دور التعزيز.",
      ],
      steps: [
        "<strong>التعزيز:</strong> احصل على كتيبة لكل ثلاثة أراضٍ (بحد أدنى 3)، أو 5 كتائب في الوضع السريع، وأضف مكافآت القارات التي تسيطر عليها بالكامل. وزّعها على أراضيك بالنقر.",
        "<strong>البطاقات:</strong> عند استحواذك على إقليم واحد على الأقل خلال دورك تحصل على بطاقة عند إنهاء الدور (بحد أقصى 5 في اليد). بدّل ثلاث بطاقات متشابهة أو واحدة من كل نوع، والجوكر يصلح بدلًا عن أي نوع. التصاعد الكلاسيكي: 4 ثم 6 ثم 8 ثم 10 ثم 12 ثم 15 ثم 20…",
        "<strong>الهجوم:</strong> اختر إقليمًا تملكه وفيه كتيبتان على الأقل، ثم اضغط على إقليم مجاور معادٍ. يرمي المهاجم حتى ثلاثة نرد والمدافع حتى نردين، وتُقارن النتائج من الأعلى للأدنى: كل نرد مهاجم أعلى يقتل كتيبة مدافعة، وكل نرد مدافع مساوٍ أو أعلى يقتل كتيبة مهاجمة.",
        "<strong>الاستحواذ:</strong> إذا خسر المدافع آخر كتيبة ينتقل الإقليم إلى المهاجم. اختر عدد الكتائب التي ستنقلها (من 1 إلى كل ما تبقى ناقص واحدة) عبر شريط الأعداد ثم أكّد.",
        "<strong>التحصين:</strong> في نهاية دورك انقل كتائب من إقليم تملكه إلى إقليم آخر تملكه، حسب قانون التحصين المختار. حدّد العدد بشريط الأعداد أو أزرار الزيادة والنقصان ثم أكّد.",
        "<strong>الاستيلاء على البطاقات:</strong> عند إقصاء لاعب تحصل على كل بطاقاته فورًا، تمامًا كما في القواعد الأصلية.",
        "<strong>إنهاء الدور:</strong> بعد الهجوم والتحصين ينتقل الدور إلى اللاعب التالي غير المُقصى.",
      ],
      winning: "يفوز آخر لاعب يحتفظ بأراضٍ، أو أول لاعب يسيطر على 60% من أراضي الخريطة عند اختيار شرط «السيطرة». تُعلن النتيجة فور تحقق الشرط.",
      notes: [
        "الخريطة الكلاسيكية تستخدم أسماء وحدود ريسك الأصلية، بما فيها طريق البرازيل–شمال أفريقيا وخط ألاسكا–كامتشاتكا.",
        "التحصين يعرض شريط أعداد واضحًا، فلا حاجة لكتابة الرقم في نافذة منبثقة.",
        "زر التكبير والتصغير يساعد على قراءة الخريطة الكلاسيكية على الهاتف.",
        "بطاقات القيادة تُعرض داخل لوحة سرّية؛ يمكن تفعيل زر الإخفاء من الإعدادات الرئيسية.",
        "الكمبيوتر يدير أدواره تلقائيًا حسب مستوى الصعوبة المحدد لكل لاعب.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      cpuAttacks = 0;
      zoom = 1;

      const rules = Object.assign({}, RULE_DEFAULTS, api.options || {});
      applyMap(rules.map);

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        color: PCOLORS[i % PCOLORS.length],
        cards: [],
        eliminated: false,
        exchanges: 0,
      }));

      const owners = {};
      const troops = {};
      if (rules.setup === "draft") {
        TERRITORIES.forEach((t) => { owners[t.id] = -1; troops[t.id] = 0; });
      } else {
        const shuffled = U.shuffle(TERRITORIES.map((t) => t.id));
        shuffled.forEach((id, i) => {
          owners[id] = i % players.length;
          troops[id] = 1;
        });
      }

      state = {
        rules,
        mapId: MAP.id,
        players,
        owner: owners,
        troops,
        current: 0,
        phase: "claim",
        toPlace: 0,
        setupPlayer: null,
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
        turn: 1,
        deck: [],
        discard: [],
        cardTrades: 0,
      };
      state.deck = rules.cards === "classic" ? buildClassicDeck() : [];

      if (rules.setup === "draft") {
        state.phase = "claim";
        state.claimPlayer = 0;
        state.current = 0;
        state.notice = "اختيار الأراضي: دور " + players[0].name + " — انقر على إقليم غير مملوك.";
      } else {
        state.phase = "setup";
        state.setupPlayer = 0;
        state.current = 0;
        state.toPlace = setupArmyCount();
        state.notice = "الإعداد: دور " + players[0].name + " — وزّع " + state.toPlace + " كتيبة.";
      }

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get adj() { return ADJ; },
          get map() { return MAP; },
          render, beginTurn, resolveBattle, endTurn, exchangeCards, canExchange,
          territoriesOf, continentsOf, reinforceAmount, nextPlayer, checkVictory,
          applyMap, applyConquest: (v) => applyConquestMove(v), performFortify,
          claimTerritory, placeSetup, findSet, nextTradeValue,
        };
      }

      const counts = players.map((p) => territoriesOf(p.index).length).join(" / ");
      if (rules.setup === "draft") {
        apiRef.log("بدأت ريسك — " + MAP.name + ". اختيار الأراضي بالتبادل يبدأ الآن.", "accent");
      } else {
        apiRef.log("بدأت ريسك — " + MAP.name + " (" + TERRITORIES.length + " إقليمًا). التوزيع: " + counts + ". الإعداد: " + setupArmyCount() + " كتائب لكل لاعب.", "accent");
      }
      render();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.rules = Object.assign({}, RULE_DEFAULTS, state.rules || {});
          state.mapId = state.mapId || state.rules.map;
          applyMap(state.mapId);
          state.selected = null;
          state.mode = "reinforce";
          state.battle = null;
          state.fortifyFrom = null;
          state.fortifyTo = null;
          state.pendingMove = null;
          state.conquered = false;
          state.owner = state.owner || {};
          state.troops = state.troops || {};
          state.deck = state.deck || [];
          state.discard = state.discard || [];
          state.players.forEach((p) => {
            p.cards = (p.cards || []).map((c) => (typeof c === "string" ? { t: c, terr: null } : c));
          });
          zoom = 1;
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
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  /* ------------------------------ أدوات الحالة ------------------------------ */

  function rule(key) {
    const value = state && state.rules ? state.rules[key] : undefined;
    if (value === undefined || value === null) return RULE_DEFAULTS[key];
    return value;
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
    if (!state || state.over) return false;
    if (state.phase === "over") return false;
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
    const owned = {};
    TERRITORIES.forEach((t) => {
      if (state.owner[t.id] === index) {
        owned[t.c] = owned[t.c] || [];
        owned[t.c].push(t.id);
      }
    });
    return Object.keys(CONTINENTS).filter((c) => {
      const all = TERRITORIES.filter((t) => t.c === c);
      return all.length && all.every((t) => state.owner[t.id] === index);
    });
  }

  function continentOwner(code) {
    const all = TERRITORIES.filter((t) => t.c === code);
    if (!all.length) return -1;
    const first = state.owner[all[0].id];
    if (first < 0) return -1;
    return all.every((t) => state.owner[t.id] === first) ? first : -1;
  }

  function reinforceAmount(index) {
    const base = rule("reinforce") === "rapid" ? 5 : Math.max(3, Math.floor(countTerritories(index) / 3));
    const bonus = continentsOf(index).reduce((sum, c) => sum + CONTINENTS[c].bonus, 0);
    return base + bonus;
  }

  function setupArmyCount() {
    if (rule("setupArmies") !== "classic") return 3;
    return Math.max(20, 40 - (state.players.length - 2) * 5);
  }

  function nextPlayer(from) {
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
    return ADJ[terrId].filter((id) => state.owner[id] === index);
  }

  function adjacentEnemies(terrId, index) {
    return ADJ[terrId].filter((id) => state.owner[id] !== index);
  }

  function testAdjacency(a, b) {
    return ADJ[a] ? ADJ[a].includes(b) : false;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

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
    TERRITORIES.forEach((t, i) => deck.push({ t: CARD_KEYS[i % CARD_KEYS.length], terr: t.id }));
    deck.push({ t: "wild", terr: null }, { t: "wild", terr: null });
    return U.shuffle(deck);
  }

  function nextTradeValue() {
    const n = state.cardTrades || 0;
    if (rule("cards") === "simple") return 4 + n * 2;
    if (n < CLASSIC_TRADE.length) return CLASSIC_TRADE[n];
    return 50 + (n - CLASSIC_TRADE.length + 1) * 5;
  }

  function findSet(cards) {
    if (!Array.isArray(cards) || cards.length < 3) return null;
    const byType = {};
    CARD_KEYS.forEach((k) => { byType[k] = []; });
    const wilds = [];
    cards.forEach((card, index) => {
      if (card && card.t === "wild") wilds.push(index);
      else if (card && byType[card.t]) byType[card.t].push(index);
    });
    let best = null;
    const consider = (indices, wildsUsed, kind) => {
      if (indices.length !== 3) return;
      if (!best || wildsUsed < best.wildsUsed) best = { indices, wildsUsed, kind };
    };
    CARD_KEYS.forEach((k) => {
      const own = byType[k];
      if (!own.length || own.length + wilds.length < 3) return;
      const need = 3 - own.length;
      consider(own.slice(0, 3).concat(wilds.slice(0, Math.max(0, need))), Math.max(0, need), "same");
    });
    const missing = CARD_KEYS.filter((k) => byType[k].length === 0);
    if (missing.length <= wilds.length) {
      const picks = CARD_KEYS.map((k) => (byType[k].length ? byType[k][0] : -1));
      if (picks.every((i) => i >= 0)) consider(picks.concat(wilds.slice(0, missing.length)).slice(0, 3), missing.length, "mixed");
      else {
        const chosen = picks.filter((i) => i >= 0).concat(wilds.slice(0, missing.length));
        consider(chosen.slice(0, 3), missing.length, "mixed");
      }
    }
    return best;
  }

  function canExchange(player) {
    if (!player || rule("cards") === "off") return false;
    return !!findSet(player.cards);
  }

  /* ------------------------------ الإعداد والدور ------------------------------ */

  function claimTerritory(terrId) {
    if (!state || state.phase !== "claim") return;
    if (!TERR_BY_ID[terrId]) return;
    if (state.owner[terrId] !== -1) {
      BG.toast("هذا الإقليم مملوك بالفعل — اختر إقليمًا رماديًا.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const player = state.players[state.claimPlayer];
    state.owner[terrId] = player.index;
    state.troops[terrId] = 1;
    state.claimCount += 1;
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector('[data-terr="' + terrId + '"]');
        if (el) { FX.pop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    apiRef.log("<strong>" + U.escape(player.name) + "</strong> اختار " + U.escape(TERR_BY_ID[terrId].name) + ".", "");

    if (state.claimCount >= TERRITORIES.length) {
      state.phase = "setup";
      state.setupPlayer = 0;
      state.current = 0;
      state.toPlace = setupArmyCount();
      state.notice = "اكتمل اختيار الأراضي. الإعداد: دور " + state.players[0].name + " — وزّع " + state.toPlace + " كتيبة.";
      apiRef.log("اكتمل اختيار الأراضي — يبدأ توزيع كتائب الإعداد.", "accent");
    } else {
      state.claimPlayer = nextPlayer(state.claimPlayer);
      state.current = state.claimPlayer;
      state.notice = "اختيار الأراضي: دور " + state.players[state.claimPlayer].name + " — انقر على إقليم غير مملوك.";
    }
    render();
  }

  function finishSetup() {
    state.phase = "reinforce";
    state.setupPlayer = null;
    apiRef.log("انتهى الإعداد — تبدأ المعارك.", "accent");
    beginTurn(0);
  }

  function placeSetup(terrId) {
    if (state.phase !== "setup") return;
    if (state.owner[terrId] !== state.setupPlayer) {
      BG.toast("اختر إقليمًا تملكه أنت.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    state.troops[terrId] += 1;
    state.toPlace -= 1;
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector('[data-terr="' + terrId + '"]');
        if (el) { FX.hop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    if (state.toPlace <= 0) {
      const next = nextPlayer(state.setupPlayer);
      if (next <= state.setupPlayer) {
        finishSetup();
        return;
      }
      state.setupPlayer = next;
      state.current = next;
      state.toPlace = setupArmyCount();
      state.notice = "الإعداد: دور " + state.players[next].name + " — وزّع " + state.toPlace + " كتيبة.";
      apiRef.log("انتهى إعداد <strong>" + U.escape(state.players[next].name) + "</strong>", "");
    } else {
      state.notice = "الإعداد: " + state.players[state.setupPlayer].name + " — بقيت " + state.toPlace + " كتيبة.";
    }
    render();
  }

  function autoPlaceSetup() {
    if (!state || state.phase !== "setup" || state.toPlace <= 0) return;
    const player = state.players[state.setupPlayer];
    let guard = 0;
    while (state.toPlace > 0 && guard < 500) {
      guard += 1;
      const pick = bestSetupTerritory(player);
      if (pick == null) break;
      state.troops[pick] += state.toPlace;
      state.toPlace = 0;
    }
    if (FX) FX.sound("build");
    if (state.toPlace <= 0) {
      const next = nextPlayer(state.setupPlayer);
      if (next <= state.setupPlayer) {
        finishSetup();
        return;
      }
      state.setupPlayer = next;
      state.current = next;
      state.toPlace = setupArmyCount();
      state.notice = "الإعداد: دور " + state.players[next].name + " — وزّع " + state.toPlace + " كتيبة.";
    }
    apiRef.log("وزّع <strong>" + U.escape(player.name) + "</strong> كتائب الإعداد تلقائيًا.", "");
    render();
  }

  function bestSetupTerritory(player) {
    const list = territoriesOf(player.index);
    if (!list.length) return null;
    let best = list[0];
    let bestScore = -Infinity;
    list.forEach((id) => {
      const enemy = adjacentEnemies(id, player.index).length;
      const cont = cpuContinentProgress(id, player);
      const score = enemy * 2 + cont + state.troops[id] * 0.05;
      if (score > bestScore) { bestScore = score; best = id; }
    });
    return best;
  }

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
    state.turn = (state.turn || 0) + 1;
    cpuAttacks = 0;
    state.notice = "دور " + state.players[index].name + " — وزّع " + state.toPlace + " كتيبة تعزيز.";
    if (FX) FX.sound("turn");
    render();
  }

  function placeReinforcement(terrId) {
    if (!state || state.phase !== "reinforce") return;
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
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector('[data-terr="' + terrId + '"]');
        if (el) { FX.pop(el); FX.floatText(el, "+1", "good"); }
      }, 30);
    }
    if (state.toPlace <= 0) {
      state.phase = "attack";
      state.mode = "attack";
      state.notice = "وزّعت كل التعزيزات. اختر إقليمًا للمهاجمة أو حصّن ثم أنهِ الدور.";
      apiRef.log("وزّع <strong>" + U.escape(cur().name) + "</strong> تعزيزاته كاملة.", "");
    } else {
      state.notice = "بقيت " + state.toPlace + " كتيبة تعزيز — انقر على أراضيك.";
    }
    render();
  }

  function selectForAttack(terrId) {
    if (state.owner[terrId] !== state.current) {
      const owner = state.players[state.owner[terrId]];
      BG.toast("هذا الإقليم يملكه " + (owner ? owner.name : "لاعب آخر") + ".", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (state.selected === terrId) {
      state.selected = null;
      state.notice = "أُلغي التحديد.";
      render();
      return;
    }
    const troops = state.troops[terrId];
    if (troops < 2) {
      BG.toast("تحتاج كتيبتين على الأقل للهجوم من هذا الإقليم.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    state.selected = terrId;
    const targets = adjacentEnemies(terrId, state.current);
    state.notice = targets.length
      ? "اختر إقليمًا معاديًا مجاورًا: " + targets.map((id) => TERR_BY_ID[id].name).join("، ")
      : "لا توجد أقاليم معادية مجاورة لهذا الإقليم.";
    if (FX) FX.sound("click");
    render();
  }

  function attack(terrId) {
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
    resolveBattle(state.selected, terrId);
  }

  function resolveBattle(attackerId, defenderId) {
    if (!state || state.over || state.pendingMove) return;
    const attacker = state.owner[attackerId];
    const defender = state.owner[defenderId];
    if (attacker !== state.current || defender === state.current || defender < 0) return;
    const aCount = Math.min(3, state.troops[attackerId] - 1);
    const dCount = Math.min(2, state.troops[defenderId]);
    if (aCount < 1) return;

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

    state.troops[attackerId] -= aLoss;
    state.troops[defenderId] -= dLoss;
    if (state.troops[defenderId] < 0) state.troops[defenderId] = 0;

    let conquered = false;
    let moved = 0;
    if (state.troops[defenderId] <= 0) {
      conquered = true;
      const available = state.troops[attackerId] - 1;
      const sourceTotal = state.troops[attackerId];
      moved = Math.max(1, Math.min(3, available, sourceTotal - 1));
      state.troops[attackerId] -= moved;
      state.troops[defenderId] = moved;
      state.owner[defenderId] = attacker;
      state.conquered = true;
      state.selected = null;

      const eliminated = eliminateDefender(defender, attacker);
      state.battle = {
        attackerId, defenderId, aDice, dDice, aLoss, dLoss, conquered: true, moved,
        attackerName: state.players[attacker].name,
        defenderName: state.players[defender] ? state.players[defender].name : "",
      };
      apiRef.log(
        "<strong>" + U.escape(state.players[attacker].name) + "</strong> هاجم " + U.escape(TERR_BY_ID[defenderId].name) +
        " — خسائر: " + aLoss + " مهاجم / " + dLoss + " مدافع — <strong>سقط الإقليم!</strong>",
        "good"
      );
      if (FX) {
        FX.sound("build");
        FX.after(() => {
          const el = rootRef && rootRef.querySelector('[data-terr="' + defenderId + '"]');
          if (el) { FX.pop(el); FX.floatText(el, "+" + moved, "good"); }
        }, 40);
      }
      if (eliminated) {
        state.notice = "سقط الإقليم! أُقصي " + state.players[defender].name + " واستوليت على بطاقاته.";
      } else {
        state.notice = "سقط " + TERR_BY_ID[defenderId].name + "! انتقلت " + moved + " كتيبة.";
      }
      const over = checkVictory();
      if (!over && !state.players[attacker].isCpu && available >= 1) {
        state.pendingMove = {
          kind: "conquest",
          from: attackerId,
          to: defenderId,
          max: available,
          sourceTotal,
          value: moved,
        };
        state.battle.moved = moved;
        state.notice = "سقط " + TERR_BY_ID[defenderId].name + " — اختر عدد الكتائب التي ستحتل بها الإقليم ثم أكّد.";
      } else if (!over) {
        state.selected = state.troops[attackerId] >= 2 ? attackerId : null;
      }
      if (FX) FX.sound("dice");
      render();
      if (FX) FX.after(() => FX.shake(rootRef && rootRef.querySelector(".risk-battle-dice")), 35);
      return;
    }

    state.selected = state.troops[attackerId] >= 2 ? attackerId : null;
    state.battle = {
      attackerId, defenderId, aDice, dDice, aLoss, dLoss, conquered: false,
      attackerName: state.players[attacker].name,
      defenderName: state.players[defender] ? state.players[defender].name : "",
    };
    apiRef.log(
      "<strong>" + U.escape(state.players[attacker].name) + "</strong> هاجم " + U.escape(TERR_BY_ID[defenderId].name) +
      " — خسائر: " + aLoss + " مهاجم / " + dLoss + " مدافع.",
      "warn"
    );
    state.notice = "نتيجة المعركة: " + (dLoss > aLoss ? "تقدّم المهاجم" : aLoss > dLoss ? "صمود المدافع" : "تبادل خسائر") + ".";
    if (FX) FX.sound("dice");
    render();
    if (FX) FX.after(() => FX.shake(rootRef && rootRef.querySelector(".risk-battle-dice")), 35);
  }

  function applyConquestMove(value) {
    const pm = state && state.pendingMove;
    if (!pm || pm.kind !== "conquest") return;
    const move = clamp(Number(value) || pm.value || 1, 1, pm.max);
    state.troops[pm.from] = Math.max(1, pm.sourceTotal - move);
    state.troops[pm.to] = move;
    if (state.battle) state.battle.moved = move;
    state.selected = state.troops[pm.from] >= 2 ? pm.from : null;
    state.pendingMove = null;
    state.notice = "تم نقل " + move + " كتيبة إلى " + TERR_BY_ID[pm.to].name + ". يمكنك مواصلة الهجوم أو إنهاء الدور.";
    apiRef.log("نقل <strong>" + U.escape(cur().name) + "</strong> " + move + " كتيبة إلى " + U.escape(TERR_BY_ID[pm.to].name) + ".", "");
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector('[data-terr="' + pm.to + '"]');
        if (el) { FX.pop(el); FX.floatText(el, "+" + move, "good"); }
      }, 30);
    }
    render();
  }

  function eliminateDefender(index, conqueror) {
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

  function checkVictory() {
    if (!state || state.over) return false;
    let winner = null;
    if (rule("victory") === "domination") {
      const need = Math.ceil(TERRITORIES.length * 0.6);
      const reached = state.players
        .filter((p) => !p.eliminated && countTerritories(p.index) >= need)
        .sort((a, b) => countTerritories(b.index) - countTerritories(a.index));
      if (reached.length) winner = reached[0];
    }
    if (!winner) {
      const active = activePlayers();
      if (active.length > 1) return false;
      winner = active[0] || null;
    }
    state.over = true;
    state.phase = "over";
    state.pendingMove = null;
    state.selected = null;
    const standings = state.players
      .slice()
      .sort((a, b) => countTerritories(b.index) - countTerritories(a.index))
      .map((p) => ({
        name: p.name,
        value: countTerritories(p.index) + " إقليم · " + p.cards.length + " بطاقة" + (p.eliminated ? " — مُقصى" : ""),
      }));
    apiRef.log("انتهت الحرب" + (winner ? " — <strong>" + U.escape(winner.name) + "</strong> يسيطر على العالم!" : "."), "good");
    if (FX) FX.win();
    render();
    apiRef.gameOver({
      icon: "🌍",
      title: "انتهت ريسك",
      text: winner
        ? (rule("victory") === "domination" ? "السيطرة على 60% من الخريطة تحسم الحملة." : "آخر قائد يحتفظ بأراضٍ على الخريطة.")
        : "لم يتبقَّ لاعبون.",
      winner: winner ? winner.name : "",
      standings,
    });
    return true;
  }

  /* ------------------------------ التحصين ------------------------------ */

  function fortifyTargets(from) {
    if (!from || !state) return [];
    if (rule("fortify") === "anywhere") {
      return territoriesOf(state.current).filter((id) => id !== from);
    }
    return adjacentOwned(from, state.current);
  }

  function fortifyMovable() {
    if (!state || rule("fortify") === "none") return false;
    return territoriesOf(state.current).some((id) => state.troops[id] > 1 && fortifyTargets(id).length);
  }

  function startFortify() {
    if (!state || state.phase !== "attack" || state.pendingMove) return;
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
      return;
    }
    state.phase = "fortify";
    state.mode = "fortify";
    state.selected = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    state.notice = "التحصين: اختر إقليمًا مصدرًا فيه أكثر من كتيبة.";
    render();
  }

  function fortifyClick(terrId) {
    if (!state || state.phase !== "fortify" || state.pendingMove) return;
    if (state.owner[terrId] !== state.current) {
      BG.toast("اختر أراضيك فقط.", "warn");
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
      render();
      return;
    }
    if (terrId === state.fortifyFrom) {
      state.fortifyFrom = null;
      state.fortifyTo = null;
      state.notice = "أُلغي التحصين — اختر مصدرًا جديدًا.";
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
      value: Math.min(3, available),
    };
    state.notice = "حدّد عدد الكتائب المنقولة من " + TERR_BY_ID[state.fortifyFrom].name + " إلى " + TERR_BY_ID[terrId].name + " ثم أكّد.";
    if (FX) FX.sound("select");
    render();
  }

  function performFortify(from, to, move, opts) {
    if (!state || !from || !to) return;
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
      FX.after(() => {
        const el = rootRef && rootRef.querySelector('[data-terr="' + to + '"]');
        if (el) { FX.pop(el); FX.floatText(el, "+" + amount, "good"); }
      }, 30);
    }
    apiRef.log("حصّن <strong>" + U.escape(state.players[state.current].name) + "</strong> " + U.escape(TERR_BY_ID[to].name) + " بـ" + amount + " كتيبة.", "");
    state.notice = "تم التحصين: " + amount + " كتيبة إلى " + TERR_BY_ID[to].name + ".";
    render();
    if (!unlimited) endTurn();
  }

  function cancelFortify() {
    if (!state) return;
    state.pendingMove = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.phase = "attack";
    state.mode = "attack";
    state.notice = "أُلغي التحصين. يمكنك مواصلة الهجوم أو إنهاء الدور.";
    render();
  }

  /* ------------------------------ البطاقات ------------------------------ */

  function exchangeCards() {
    if (!state || state.phase !== "reinforce") return;
    const player = cur();
    const set = findSet(player.cards);
    if (!set) {
      BG.toast("تحتاج ثلاث بطاقات متشابهة أو واحدة من كل نوع.", "warn");
      return;
    }
    const removed = set.indices
      .slice()
      .sort((a, b) => b - a)
      .map((i) => player.cards.splice(i, 1)[0])
      .filter(Boolean);
    if (rule("cards") === "classic") state.discard = state.discard.concat(removed);
    const bonus = nextTradeValue();
    state.cardTrades += 1;
    player.exchanges += 1;
    state.toPlace += bonus;
    apiRef.log("بدّل <strong>" + U.escape(player.name) + "</strong> " + removed.map(cardLabel).join(" + ") + " مقابل " + bonus + " كتيبة.", "good");
    state.notice = "+" + bonus + " كتيبة من البطاقات — بقيت " + state.toPlace + " للتعزيز.";
    if (FX) FX.sound("coin");
    render();
  }

  function drawCard(player) {
    if (rule("cards") === "off" || !player) return null;
    let card = null;
    if (rule("cards") === "simple") {
      card = { t: U.pick(CARD_KEYS), terr: null };
    } else {
      if (!state.deck.length) {
        state.deck = U.shuffle(state.discard.slice());
        state.discard = [];
      }
      card = state.deck.pop() || { t: "wild", terr: null };
    }
    player.cards.push(card);
    return card;
  }

  function endTurn() {
    if (!state || state.phase === "over" || state.over) return;
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
    if (state.conquered && player.cards.length < 5) {
      const card = drawCard(player);
      if (card) {
        apiRef.log("حصل <strong>" + U.escape(player.name) + "</strong> على بطاقة " + U.escape(cardLabel(card)) + ".", "accent");
        if (FX) FX.sound("card");
      }
    } else if (state.conquered && player.cards.length >= 5) {
      apiRef.log("يد <strong>" + U.escape(player.name) + "</strong> ممتلئة (5 بطاقات) — لا يسحب بطاقة جديدة.", "warn");
    }
    state.selected = null;
    state.fortifyFrom = null;
    state.fortifyTo = null;
    state.pendingMove = null;
    const next = nextPlayer(state.current);
    beginTurn(next);
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuContinentProgress(id, p) {
    const terr = TERR_BY_ID[id];
    if (!terr) return 0;
    const all = TERRITORIES.filter((t) => t.c === terr.c);
    const own = all.filter((t) => state.owner[t.id] === p.index).length;
    const bonus = CONTINENTS[terr.c] ? CONTINENTS[terr.c].bonus : 0;
    if (own === all.length) return bonus * 1.2;
    if (own === all.length - 1) return bonus * 0.75;
    return (own / Math.max(1, all.length)) * bonus * 0.3;
  }

  function cpuTerritoryScore(id, p) {
    const enemies = adjacentEnemies(id, p.index);
    let score = enemies.length * 2.6;
    enemies.forEach((e) => { score += state.troops[e] * 0.35; });
    score += cpuContinentProgress(id, p);
    score += state.troops[id] * 0.18;
    if (enemies.length === 0) score -= 2;
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
    const all = TERRITORIES.filter((t) => t.c === terr.c);
    const own = all.filter((t) => state.owner[t.id] === p.index).length;
    const neighbours = ADJ[id] || [];
    const ownN = neighbours.filter((n) => state.owner[n] === p.index).length;
    const enemyN = neighbours.filter((n) => state.owner[n] >= 0 && state.owner[n] !== p.index).length;
    return own * 1.6 + ownN * 2.4 - enemyN * 0.4 + (CONTINENTS[terr.c] ? CONTINENTS[terr.c].bonus * 0.2 : 0) + Math.random() * 0.5;
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
    if (state.toPlace <= 0) return false;
    if (canExchange(p)) {
      exchangeCards();
      return true;
    }
    const list = territoriesOf(p.index);
    const id = cpuPickTerritory(list, p);
    if (id == null) return false;
    placeReinforcement(id);
    return true;
  }

  function attackWinChance(a, d) {
    const aa = Math.max(1, Math.min(3, a));
    const dd = Math.max(1, Math.min(2, d));
    const table = { "1,1": 0.583, "1,2": 0.254, "2,1": 0.578, "2,2": 0.228, "3,1": 0.659, "3,2": 0.371 };
    return table[aa + "," + dd] || (aa > dd ? 0.62 : 0.32);
  }

  function cpuAttackOptions(p) {
    const options = [];
    territoriesOf(p.index).forEach((src) => {
      const a = state.troops[src] - 1;
      if (a < 1) return;
      adjacentEnemies(src, p.index).forEach((dst) => {
        const d = state.troops[dst];
        const chance = attackWinChance(a, d);
        const bonus = cpuContinentProgress(dst, p);
        let score = (chance - 0.45) * 12 + (a - d) * 0.9 + bonus;
        if (d <= 1) score += 1.5;
        options.push({ src, dst, score, chance });
      });
    });
    return options;
  }

  function cpuAttackThreshold(level) {
    if (level === "easy") return 3.6;
    if (level === "hard") return 0.4;
    return 1.3;
  }

  function cpuFortifyMove(p) {
    const perTurn = rule("fortify");
    if (perTurn === "none") return null;
    const sources = territoriesOf(p.index)
      .filter((id) => state.troops[id] >= 3 && fortifyTargets(id).length)
      .sort((a, b) => state.troops[b] - state.troops[a]);
    for (const src of sources) {
      const targets = fortifyTargets(src)
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
      const targets = fortifyTargets(src)
        .filter((id) => adjacentEnemies(id, p.index).length > 0)
        .sort((a, b) => adjacentEnemies(b, p.index).length - adjacentEnemies(a, p.index));
      if (!targets.length) continue;
      const dest = targets[0];
      const move = Math.min(state.troops[src] - 1, Math.max(1, adjacentEnemies(dest, p.index).length * 2));
      return { from: src, to: dest, move };
    }
    return null;
  }

  function cpuFinishAttackPhase() {
    const p = cur();
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
    if (!state || state.phase !== "attack" || state.pendingMove) return;
    const p = cur();
    if (cpuAttacks >= 12) { cpuFinishAttackPhase(); return; }

    const threshold = cpuAttackThreshold(AI.level(p.level));
    const options = cpuAttackOptions(p).filter((option) => option.score >= threshold);
    if (!options.length) { cpuFinishAttackPhase(); return; }

    if (AI.level(p.level) === "easy" && Math.random() < 0.2) { cpuFinishAttackPhase(); return; }
    const best = AI.choose(options, (option) => option.score, p.level);
    if (!best) { cpuFinishAttackPhase(); return; }

    if (state.selected !== best.src) selectForAttack(best.src);
    if (state.selected !== best.src) { cpuFinishAttackPhase(); return; }
    cpuAttacks += 1;
    attack(best.dst);
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over || state.pendingMove) return;

    if (state.phase === "claim") {
      const p = state.players[state.claimPlayer];
      if (!p || !AI.isCpu(p) || !AI.autoAllowed(apiRef, p)) return;
      const wait = AI.delay(p.level, 0.65);
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "claim" || state.claimPlayer !== p.index) return;
        cpuClaimStep();
      }, wait);
      return;
    }

    if (state.phase === "setup") {
      const p = state.players[state.setupPlayer];
      if (!p || !AI.isCpu(p) || !AI.autoAllowed(apiRef, p)) return;
      const wait = AI.delay(p.level, 0.7);
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "setup" || state.setupPlayer !== p.index) return;
        cpuSetupStep();
      }, wait);
      return;
    }

    const seat = cur();
    if (!seat || !AI.isCpu(seat) || !AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 0.75);

    if (state.phase === "reinforce") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "reinforce" || !AI.isCpu(cur())) return;
        cpuReinforceStep();
      }, wait);
      return;
    }

    if (state.phase === "attack") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "attack" || state.pendingMove || !AI.isCpu(cur())) return;
        cpuAttackStep();
      }, wait);
      return;
    }

    if (state.phase === "fortify") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "fortify" || state.pendingMove || !AI.isCpu(cur())) return;
        cpuFinishAttackPhase();
      }, wait);
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function svgEscape(text) {
    return U.escape(text);
  }

  function curvePath(a, b, bend) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const offset = clamp(len * 0.16, 12, 54) * (bend || 1);
    const cx = midX - (dy / len) * offset;
    const cy = midY + (dx / len) * offset;
    return "M" + a.x + " " + a.y + " Q" + cx + " " + cy + " " + b.x + " " + b.y;
  }

  function mapSVG() {
    const parts = [];
    parts.push('<svg viewBox="' + MAP.viewBox + '" class="risk-map risk-map-' + MAP.id + '" role="img" aria-label="خريطة ريسك — ' + svgEscape(MAP.name) + '">');

    const defs = [];
    defs.push('<radialGradient id="riskSea" cx="50%" cy="38%" r="78%"><stop offset="0%" stop-color="#123540"/><stop offset="52%" stop-color="#0a2029"/><stop offset="100%" stop-color="#060f14"/></radialGradient>');
    defs.push('<radialGradient id="riskVignette" cx="50%" cy="50%" r="72%"><stop offset="62%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.45)"/></radialGradient>');
    defs.push('<pattern id="riskWaves" width="46" height="22" patternUnits="userSpaceOnUse"><path d="M0 11 Q11 6 23 11 T46 11" stroke="rgba(120,190,255,0.11)" stroke-width="1.2" fill="none"/></pattern>');
    defs.push('<pattern id="riskGrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" stroke="rgba(140,200,230,0.05)" stroke-width="1" fill="none"/></pattern>');
    defs.push('<radialGradient id="riskGloss" cx="35%" cy="30%" r="72%"><stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>');
    defs.push('<filter id="riskGlow" x="-70%" y="-70%" width="240%" height="240%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.72"/></filter>');
    defs.push('<filter id="riskSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.4"/></filter>');
    Object.keys(CONTINENTS).forEach((code) => {
      const info = CONTINENTS[code];
      defs.push('<linearGradient id="riskG-' + code + '" x1="0" y1="0" x2="0.85" y2="1"><stop offset="0%" stop-color="' + info.color + '" stop-opacity="0.46"/><stop offset="58%" stop-color="' + info.color + '" stop-opacity="0.26"/><stop offset="100%" stop-color="' + info.color + '" stop-opacity="0.1"/></linearGradient>');
    });
    defs.push('<marker id="riskArrow" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ffb27a"/></marker>');
    defs.push('<marker id="riskArrowF" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#8fe8c4"/></marker>');
    parts.push("<defs>" + defs.join("") + "</defs>");

    parts.push('<rect width="960" height="560" fill="url(#riskSea)"/>');
    parts.push('<rect width="960" height="560" fill="url(#riskGrid)" opacity="0.9"/>');
    parts.push('<rect width="960" height="560" fill="url(#riskWaves)" opacity="0.5"/>');
    parts.push('<g class="risk-ocean-lines" aria-hidden="true">' +
      '<path d="M0 390 Q240 330 480 392 T960 380" class="risk-lat"/>' +
      '<path d="M0 470 Q260 512 520 462 T960 500" class="risk-lat"/>' +
      '<path d="M120 560 Q300 430 460 240 T780 12" class="risk-lat"/>' +
      '</g>');
    parts.push('<rect width="960" height="560" fill="url(#riskVignette)"/>');

    Object.keys(CONTINENTS).forEach((code) => {
      const info = CONTINENTS[code];
      parts.push('<path d="' + info.blob + '" fill="url(#riskG-' + code + ')" stroke="' + info.color + '" stroke-opacity="0.5" stroke-width="2.4" class="risk-cont-shape"/>');
      parts.push('<path d="' + info.blob + '" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1" opacity="0.7" filter="url(#riskSoft)"/>');
    });

    EDGES.forEach(([a, b]) => {
      const ta = TERR_BY_ID[a];
      const tb = TERR_BY_ID[b];
      if (!ta || !tb) return;
      const distance = Math.hypot(tb.x - ta.x, tb.y - ta.y);
      const active = (state.selected && (a === state.selected || b === state.selected)) ||
        (state.fortifyFrom && (a === state.fortifyFrom || b === state.fortifyFrom));
      parts.push('<line x1="' + ta.x + '" y1="' + ta.y + '" x2="' + tb.x + '" y2="' + tb.y +
        '" class="risk-link' + (distance > 300 ? " sea" : "") + (active ? " active" : "") + '"/>');
    });

    Object.keys(MAP.labels).forEach((code) => {
      const info = CONTINENTS[code];
      const pos = MAP.labels[code];
      if (!info || !pos) return;
      const ownerIndex = continentOwner(code);
      const owner = ownerIndex >= 0 ? state.players[ownerIndex] : null;
      const width = info.name.length * 6.6 + 58;
      parts.push('<g class="risk-cont' + (owner ? " owned" : "") + '" transform="translate(' + pos[0] + "," + pos[1] + ')"' + (owner ? ' style="--own:' + owner.color + '"' : '') + '>' +
        '<rect x="-8" y="-15" width="' + width + '" height="25" rx="12.5"/>' +
        '<text x="2" y="2">' + svgEscape(info.name) + '</text>' +
        '<text x="' + (width - 24) + '" y="2" class="risk-cont-bonus">+' + info.bonus + '</text>' +
        (owner ? '<circle cx="' + (width - 12) + '" cy="-2" r="3.2" class="risk-cont-owner"/>' : '') +
        '</g>');
    });

    const paths = [];
    if (state.phase === "attack" && state.selected && state.owner[state.selected] === state.current && state.troops[state.selected] >= 2) {
      adjacentEnemies(state.selected, state.current).forEach((dst, i) => {
        paths.push({ from: state.selected, to: dst, bend: i % 2 ? -1 : 1, kind: "attack" });
      });
    }
    if (state.phase === "fortify" && state.fortifyFrom) {
      fortifyTargets(state.fortifyFrom).forEach((dst, i) => {
        paths.push({ from: state.fortifyFrom, to: dst, bend: i % 2 ? -1 : 1, kind: "fortify", active: state.fortifyTo === dst });
      });
    }
    if (paths.length) {
      parts.push('<g class="risk-paths" aria-hidden="true">');
      paths.forEach((path) => {
        const from = TERR_BY_ID[path.from];
        const to = TERR_BY_ID[path.to];
        if (!from || !to) return;
        const cls = path.kind === "attack"
          ? "risk-attack-path" + (path.active ? " active" : "")
          : "risk-fortify-path" + (path.active ? " active" : "");
        parts.push('<path d="' + curvePath(from, to, path.bend) + '" class="' + cls + '" marker-end="url(#' +
          (path.kind === "attack" ? "riskArrow" : "riskArrowF") + ')"/>');
      });
      parts.push('</g>');
    }

    TERRITORIES.forEach((t) => {
      const ownerIndex = state.owner[t.id];
      const owner = ownerIndex >= 0 ? state.players[ownerIndex] : null;
      const info = CONTINENTS[t.c];
      const color = owner ? owner.color : "#6b7d84";
      const isSelected = state.selected === t.id || state.fortifyFrom === t.id ||
        (state.pendingMove && state.pendingMove.from === t.id);
      const isTarget = !!state.selected && state.phase === "attack" && ADJ[state.selected].includes(t.id) && ownerIndex !== state.current;
      const isFortifyTarget = state.phase === "fortify" && state.fortifyFrom && fortifyTargets(state.fortifyFrom).includes(t.id);
      const isMoveDest = state.pendingMove && state.pendingMove.to === t.id;
      const isDeployable = (state.phase === "setup" && ownerIndex === state.setupPlayer) ||
        (state.phase === "reinforce" && ownerIndex === state.current);
      const isClaimable = state.phase === "claim" && ownerIndex === -1;
      const isComplete = owner && continentsOf(ownerIndex).includes(t.c);
      const classes = ["risk-terr"];
      if (isSelected) classes.push("selected");
      if (isTarget) classes.push("target");
      if (isFortifyTarget) classes.push("fortify-target");
      if (isMoveDest) classes.push("move-dest");
      if (isDeployable) classes.push("deployable");
      if (isClaimable) classes.push("claimable");
      if (!owner) classes.push("unowned");
      if (isComplete) classes.push("continent-complete");
      const label = t.name + " — " + (owner ? owner.name : "غير مملوك") + " — " + (owner ? state.troops[t.id] + " كتيبة" : "بانتظار الاختيار") + " — " + info.name;
      parts.push('<g class="' + classes.join(" ") + '" data-terr="' + t.id + '" role="button" tabindex="0" aria-label="' + svgEscape(label) + '" style="--pc:' + color + ';--cc:' + info.color + '">');
      parts.push('<title>' + svgEscape(label) + '</title>');
      parts.push('<circle class="risk-node-shadow" cx="' + t.x + '" cy="' + (t.y + 5) + '" r="26"/>');
      if (isSelected || isTarget || isFortifyTarget || isMoveDest || isDeployable || isClaimable) {
        parts.push('<circle class="risk-node-halo" cx="' + t.x + '" cy="' + t.y + '" r="33"/>');
      }
      parts.push('<circle class="risk-node-ring" cx="' + t.x + '" cy="' + t.y + '" r="27" style="stroke:' + info.color + '"/>');
      parts.push('<circle class="risk-node" cx="' + t.x + '" cy="' + t.y + '" r="23" fill="' + color + '"/>');
      parts.push('<circle class="risk-node-gloss" cx="' + (t.x - 7) + '" cy="' + (t.y - 8) + '" r="9" fill="url(#riskGloss)"/>');
      if (owner) {
        parts.push('<text class="risk-troops" x="' + t.x + '" y="' + (t.y + 6) + '" data-fx-piece="risk-' + t.id + "-" + ownerIndex + "-" + state.troops[t.id] + '" data-fx-enter="pop">' + state.troops[t.id] + '</text>');
      } else {
        parts.push('<text class="risk-unowned-mark" x="' + t.x + '" y="' + (t.y + 7) + '">?</text>');
      }
      parts.push('<text class="risk-tname" x="' + t.x + '" y="' + (t.y + 44) + '">' + svgEscape(t.name) + '</text>');
      parts.push('</g>');
    });

    parts.push('<g class="risk-compass" transform="translate(918 522)" aria-hidden="true">' +
      '<circle r="21"/><path d="M0 -14 L5 4 L0 1 L-5 4 Z"/><text y="-25">N</text></g>');
    parts.push('<rect width="960" height="560" fill="none" stroke="rgba(246,242,232,0.12)" stroke-width="1.5" rx="14"/>');
    parts.push('</svg>');
    return parts.join("");
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

  function numberPanelHTML() {
    const pm = state.pendingMove;
    if (!pm) return "";
    const from = TERR_BY_ID[pm.from];
    const to = TERR_BY_ID[pm.to];
    if (!from || !to) return "";
    const max = Math.max(1, pm.max);
    const value = clamp(Number(pm.value) || 1, 1, max);
    const quick = Array.from(new Set([1, Math.max(1, Math.floor(max / 2)), max]));
    const isFortify = pm.kind === "fortify";
    return (
      '<div class="risk-number">' +
      '<div class="risk-number-head"><b>' + (isFortify ? "🛡️ تحصين — نقل كتائب" : "🏴 استحواذ — نقل كتائب") + '</b>' +
      '<span>' + svgEscape(from.name) + ' ← ' + svgEscape(to.name) + '</span></div>' +
      '<div class="risk-number-row">' +
      '<button type="button" class="risk-step" data-num-step="-1" aria-label="إنقاص كتيبة">−</button>' +
      '<input type="range" min="1" max="' + max + '" step="1" value="' + value + '" data-number-range aria-label="عدد الكتائب المنقولة">' +
      '<button type="button" class="risk-step" data-num-step="1" aria-label="زيادة كتيبة">+</button>' +
      '<output class="risk-number-out" data-number-output aria-live="polite">' + value + '</output>' +
      '</div>' +
      '<div class="risk-number-quick">' +
      quick.map((v) => '<button type="button" data-num-set="' + v + '"' + (v === value ? ' class="active"' : "") + '>' + v + '</button>').join("") +
      '<button type="button" data-num-set="max">الكل (' + max + ')</button>' +
      '</div>' +
      '<div class="risk-number-actions">' +
      '<button type="button" class="bg-btn primary" data-act="number-confirm"><span>✅ تأكيد النقل</span></button>' +
      (isFortify ? '<button type="button" class="bg-btn ghost small" data-act="number-cancel"><span>رجوع</span></button>' : "") +
      '</div>' +
      '<p class="risk-hint">' + (isFortify
        ? "حدّد العدد ثم أكّد. التحصين المتصل ينهي دورك بعد التأكيد، ويبقى المتعدد متاحًا لعدة نقلات."
        : "اترك كتيبة واحدة على الأقل في الإقليم المهاجم، ثم أكّد نقل الكتائب إلى الإقليم المحتل.") + '</p>' +
      '</div>'
    );
  }

  function battleHTML() {
    if (!state.battle) {
      return '<div class="risk-battle-empty"><span>⚔️</span><p>اختر إقليمًا تملكه ثم إقليمًا معاديًا مجاورًا لتبدأ المعركة.</p></div>';
    }
    const b = state.battle;
    const die = (v, kind) => '<span class="risk-die ' + kind + '">' + v + '</span>';
    return (
      '<div class="risk-battle">' +
      '<div class="risk-battle-side"><span class="risk-battle-label">المهاجم · ' + U.escape(b.attackerName) + '</span>' +
      '<div class="risk-battle-dice">' + b.aDice.map((v) => die(v, "a")).join("") + '</div>' +
      '<small>خسر ' + b.aLoss + '</small></div>' +
      '<div class="risk-battle-vs">⚔️</div>' +
      '<div class="risk-battle-side"><span class="risk-battle-label">المدافع · ' + U.escape(b.defenderName) + '</span>' +
      '<div class="risk-battle-dice">' + b.dDice.map((v) => die(v, "d")).join("") + '</div>' +
      '<small>خسر ' + b.dLoss + '</small></div>' +
      '</div>' +
      (b.conquered ? '<p class="risk-conquered">🏴 سقط ' + U.escape(TERR_BY_ID[b.defenderId].name) + ' — انتقلت ' + (b.moved || 0) + ' كتيبة.</p>' : "")
    );
  }

  function playerRow(p) {
    const count = countTerritories(p.index);
    const active = p.index === activeSeat() && !state.over;
    const conts = continentsOf(p.index);
    return (
      '<div class="risk-player' + (active ? " active" : "") + (p.eliminated ? " out" : "") + '" data-player="' + p.index + '" style="--p:' + p.color + '">' +
      '<span class="pdot">' + (p.index + 1) + '</span>' +
      '<div class="risk-player-copy"><strong>' + U.escape(p.name) + (p.isCpu ? ' <i class="risk-cpu">كمبيوتر</i>' : "") + '</strong>' +
      '<small>' + (p.eliminated ? "مُقصى" : count + " إقليم · " + p.cards.length + " بطاقة") + '</small></div>' +
      '<div class="risk-player-meta"><b>' + (p.eliminated ? "—" : reinforceAmount(p.index)) + '</b><small>تعزيز</small></div>' +
      '<span class="risk-conts">' + conts.map((c) => '<i title="' + U.escape(CONTINENTS[c].name) + '" style="--cc:' + CONTINENTS[c].color + '"></i>').join("") + '</span>' +
      '</div>'
    );
  }

  function ruleChips() {
    const victory = rule("victory") === "domination" ? "فوز: سيطرة 60%" : "فوز: إقصاء الجميع";
    const cards = rule("cards") === "off" ? "بلا بطاقات" : rule("cards") === "simple" ? "بطاقات مبسّطة" : "بطاقات كلاسيكية";
    const fort = rule("fortify") === "none" ? "بلا تحصين" : rule("fortify") === "anywhere" ? "تحصين حر" : rule("fortify") === "unlimited" ? "تحصين متعدد" : "تحصين متصل";
    const reinf = rule("reinforce") === "rapid" ? "تعزيز سريع" : "تعزيز كلاسيكي";
    return [MAP.short, victory, cards, fort, reinf].map((label) => '<span class="risk-rule-chip">' + U.escape(label) + '</span>').join("");
  }

  function sideHTML() {
    const p = state.players[state.current] || state.players[0];
    const phase = state.phase;
    const isClaim = phase === "claim";
    const isSetup = phase === "setup";
    const isReinforce = phase === "reinforce";
    const pending = !!state.pendingMove;
    const canEx = isReinforce && canExchange(p) && canAct();
    const movable = fortifyMovable();
    const selectedTroops = state.selected ? state.troops[state.selected] : 0;
    const statValue = isClaim ? (state.claimCount + "/" + TERRITORIES.length) : isSetup ? state.toPlace : isReinforce ? state.toPlace : selectedTroops;
    const statLabel = isClaim ? "إقليم" : (isSetup || isReinforce ? "كاتيبة" : "مختارة");
    const turnName = isClaim ? state.players[state.claimPlayer].name : isSetup ? state.players[state.setupPlayer].name : state.over ? "انتهت الحملة" : p.name;

    let actions = '<div class="risk-panel risk-actions"><span class="risk-kicker">أوامر</span>';
    if (pending) {
      actions += numberPanelHTML();
    } else if (isClaim) {
      actions += '<p class="risk-hint">اختر أي إقليم رمادي غير مملوك لضمّه إلى إمبراطوريتك. يتناوب القادة بالترتيب.</p>';
      actions += '<button type="button" class="bg-btn" data-act="autoclaim"' + (canAct() ? "" : " disabled") + '><span>🎲 اختيار تلقائي</span></button>';
    } else if (isSetup) {
      actions += '<p class="risk-hint">انقر على أراضيك لتوزيع كتائب الإعداد. زر التوزيع التلقائي يضع كل الكتائب المتبقية على الحدود.</p>';
      actions += '<button type="button" class="bg-btn" data-act="autoplace"' + (canAct() ? "" : " disabled") + '><span>⚡ توزيع تلقائي</span></button>';
    } else {
      actions +=
        '<button type="button" class="bg-btn" data-act="exchange"' + (canEx ? "" : " disabled") + '><span>🃏 بدّل المجموعة (+' + nextTradeValue() + ')</span></button>' +
        '<button type="button" class="bg-btn" data-act="fortify"' + (phase === "attack" && canAct() && movable && !state.fortifyUsed ? "" : " disabled") + '><span>🛡️ تحصين</span></button>' +
        '<button type="button" class="bg-btn primary" data-act="end"' + (phase === "attack" && canAct() && state.toPlace <= 0 && !state.over && !pending ? "" : " disabled") + '><span>⏭️ إنهاء الدور</span></button>' +
        (state.selected || state.fortifyFrom ? '<button type="button" class="bg-btn ghost small" data-act="cancel"><span>✖ إلغاء التحديد</span></button>' : "") +
        '<p class="risk-hint">' + actionHint() + '</p>';
    }
    actions += '</div>';

    return (
      '<div class="risk-panel risk-turn">' +
      '<span class="risk-kicker">' + phaseLabel() + '</span>' +
      '<strong>' + U.escape(turnName) + '</strong>' +
      '<small>' + turnSubtitle() + '</small>' +
      '<div class="risk-turn-stats">' +
      '<div><b>' + countTerritories(p.index) + '</b><small>إقليم</small></div>' +
      '<div><b>' + statValue + '</b><small>' + statLabel + '</small></div>' +
      '<div><b>' + p.cards.length + '</b><small>بطاقة</small></div>' +
      '</div>' +
      '</div>' +
      actions +
      '<div class="risk-panel risk-battle-panel"><span class="risk-kicker">آخر معركة</span>' + battleHTML() + '</div>' +
      '<div class="risk-panel risk-players"><span class="risk-kicker">القادة</span>' + state.players.map(playerRow).join("") + '</div>' +
      '<div class="risk-notice">' + U.escape(state.notice) + '</div>' +
      '<div class="risk-panel risk-legend">' +
      '<span class="risk-kicker">مفتاح الخريطة</span>' +
      '<div class="risk-rule-chips">' + ruleChips() + '</div>' +
      Object.keys(CONTINENTS).map((c) => '<div class="risk-legend-row"><i style="--cc:' + CONTINENTS[c].color + '"></i><span>' + U.escape(CONTINENTS[c].name) + '</span><b>+' + CONTINENTS[c].bonus + '</b></div>').join("") +
      '<p>الخطوط الداكنة طرق هجوم وتحصين، والمنقّطة الطويلة مسارات بحرية. مرّر المؤشر فوق الإقليم لرؤية تفاصيله.</p>' +
      '</div>'
    );
  }

  function turnSubtitle() {
    if (state.phase === "claim") return "اختر إقليمًا غير مملوك — تبدأ الحدود بالتشكّل.";
    if (state.phase === "setup") return "وزّع " + state.toPlace + " كتيبة إعداد على أراضيك.";
    if (state.phase === "reinforce") return "وزّع " + state.toPlace + " كتيبة تعزيز" + (canExchange(cur()) ? " — لديك مجموعة بطاقات صالحة." : ".");
    if (state.phase === "fortify") return "انقل كتائب بين أراضيك ثم أكّد العدد.";
    if (state.phase === "over") return "انتهت الحملة — راجع الترتيب النهائي.";
    if (state.pendingMove) return "أكّد عدد الكتائب المنقولة إلى الإقليم المحتل.";
    return "اهجم من أراضيك، ثم حصّن وأنهِ الدور.";
  }

  function actionHint() {
    if (state.phase === "reinforce") return canExchange(cur()) ? "بدّل مجموعة البطاقات الآن للحصول على تعزيزات إضافية قبل الهجوم." : "وزّع كل كتائب التعزيز بالنقر على أراضيك.";
    if (state.phase === "fortify") {
      return state.fortifyFrom ? "اختر الوجهة ثم حدّد عدد الكتائب في لوحة النقل." : "اختر مصدرًا فيه كتيبتان على الأقل.";
    }
    if (state.phase === "attack") {
      return state.selected ? "اختر إقليمًا معاديًا مجاورًا، أو ألغِ التحديد." : "انقر إقليمًا تملكه لبدء الهجوم، أو استخدم زر التحصين.";
    }
    if (state.phase === "over") return "أغلقت الحملة — يمكنك بدء مباراة جديدة.";
    return "انقر على الخريطة لتنفيذ الأمر.";
  }

  function cardHTML(card) {
    const key = cardTypeKey(card);
    const info = CARD_TYPES[key];
    const terr = card && card.terr && TERR_BY_ID[card.terr] ? TERR_BY_ID[card.terr].name : "";
    return '<div class="risk-card ' + key + '"><span>' + info.icon + '</span><strong>' + info.name + '</strong>' +
      (terr ? '<small>' + U.escape(terr) + '</small>' : '<small>بديل أي نوع</small>') + '</div>';
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "risk-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "risk-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-risk"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">غرفة العمليات</span><strong>' + U.escape(MAP.name) + '</strong><small class="risk-map-sub">' + U.escape(MAP.desc) + '</small></div>' +
      '<div class="risk-zoom" role="group" aria-label="تكبير الخريطة">' +
      '<button type="button" data-zoom="-1" aria-label="تصغير الخريطة">−</button>' +
      '<span data-zoom-label>' + Math.round(zoom * 100) + '%</span>' +
      '<button type="button" data-zoom="1" aria-label="تكبير الخريطة">+</button>' +
      '<button type="button" data-zoom="0" aria-label="إعادة ضبط التكبير">↺</button>' +
      '</div>' +
      '</div>' +
      '<div class="risk-map-scroll"><div class="risk-map-inner" style="--risk-zoom:' + zoom + '">' + mapSVG() + '</div></div>';
    wrap.appendChild(boardWrap);

    const side = document.createElement("aside");
    side.className = "risk-side";
    side.innerHTML = sideHTML();

    const viewer = viewerPlayer();
    const seat = viewerSeat();
    const secret = BG.secretPanel({
      title: "🃏 بطاقات القيادة",
      owner: viewer ? viewer.name : "مشاهد",
      hint: viewer
        ? "بطاقاتك مخفية عن بقية اللاعبين. أظهرها في دورك فقط، ثم أخفها قبل تمرير الجهاز."
        : "أنت تشاهد فقط — بطاقات اللاعبين سرّية ولا تُعرض على هذا الجهاز.",
      open: seat >= 0 && seat === activeSeat(),
      autoKey: "risk:" + seat + ":" + (state.turn || 1),
      onToggle() { /* handled by secret panel */ },
      render() {
        if (!viewer) {
          return '<p class="risk-cards-empty">تتابع الخريطة مباشرة. لا تُعرض بطاقات القيادة الخاصة بأي لاعب على هذا الجهاز.</p>';
        }
        if (!viewer.cards.length) {
          return '<p class="risk-cards-empty">لا تملك بطاقات بعد. استحوذ على إقليم في دورك لتحصل على بطاقة عند إنهائه.</p>' +
            '<p class="risk-cards-note">' + (rule("cards") === "off" ? "البطاقات معطّلة في هذه المباراة." : "كل بطاقة تحمل اسم إقليم ورمز نوع. الجوكر يصلح بدلًا عن أي نوع.") + '</p>';
        }
        return (
          '<div class="risk-cards-grid">' + viewer.cards.map(cardHTML).join("") + '</div>' +
          '<p class="risk-cards-note">' + (canExchange(viewer) ? '<strong>لديك مجموعة صالحة الآن — بدّلها في مرحلة التعزيز.</strong><br>' : "") +
          'المجموعة: ثلاث بطاقات متشابهة أو واحدة من كل نوع. قيمة التبديل التالية: +' + nextTradeValue() + ' كتيبة.</p>'
        );
      },
    });
    side.appendChild(secret.el);
    wrap.appendChild(side);

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    wrap.querySelectorAll("[data-terr]").forEach((node) => {
      const terr = node.getAttribute("data-terr");
      const act = () => {
        if (state.over) return;
        if (state.pendingMove) {
          BG.toast("أكّد عدد الكتائب المنقولة أولًا.", "warn");
          return;
        }
        if (!canAct()) {
          if (isOnline()) BG.toast("انتظر دورك.", "warn");
          return;
        }
        if (state.phase === "claim") claimTerritory(terr);
        else if (state.phase === "setup") placeSetup(terr);
        else if (state.phase === "reinforce") placeReinforcement(terr);
        else if (state.phase === "fortify") fortifyClick(terr);
        else if (state.phase === "attack") {
          if (state.owner[terr] === state.current) selectForAttack(terr);
          else if (state.selected) attack(terr);
          else {
            BG.toast("اختر إقليمًا تملكه أولًا.", "warn");
            if (FX) FX.sound("error");
          }
        }
      };
      node.addEventListener("click", act);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          act();
        }
      });
    });

    wrap.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over) return;
        const act = btn.dataset.act;
        if (act === "number-cancel") { cancelFortify(); return; }
        if (!canAct()) return;
        if (act === "exchange") exchangeCards();
        else if (act === "fortify") startFortify();
        else if (act === "end") endTurn();
        else if (act === "autoclaim") cpuClaimStep();
        else if (act === "autoplace") autoPlaceSetup();
        else if (act === "number-confirm") {
          const pm = state.pendingMove;
          if (!pm) return;
          if (pm.kind === "conquest") applyConquestMove(pm.value);
          else performFortify(pm.from, pm.to, pm.value);
        } else if (act === "cancel") {
          state.selected = null;
          state.fortifyFrom = null;
          state.fortifyTo = null;
          state.pendingMove = null;
          if (state.phase === "fortify") state.phase = "attack";
          state.notice = "أُلغي التحديد.";
          render();
        }
      });
    });

    wrap.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.zoom);
        zoom = dir === 0 ? 1 : clamp(Math.round((zoom + dir * 0.25) * 100) / 100, 1, 2.5);
        const inner = wrap.querySelector(".risk-map-inner");
        if (inner) inner.style.setProperty("--risk-zoom", zoom);
        const label = wrap.querySelector("[data-zoom-label]");
        if (label) label.textContent = Math.round(zoom * 100) + "%";
      });
    });

    bindNumberControls(wrap);

    if (!state.over) {
      const seatIndex = activeSeat();
      const active = seatIndex >= 0 ? state.players[seatIndex] : null;
      apiRef.setStatus(active ? "دور " + AI.statusName(active) : phaseLabel(), "live");
    }
    syncCpu();
  }

  function bindNumberControls(wrap) {
    const pm = state && state.pendingMove;
    if (!pm) return;
    const range = wrap.querySelector("[data-number-range]");
    const output = wrap.querySelector("[data-number-output]");
    const sync = () => {
      pm.value = clamp(Number(pm.value) || 1, 1, pm.max);
      if (range) range.value = String(pm.value);
      if (output) output.textContent = String(pm.value);
      wrap.querySelectorAll("[data-num-set]").forEach((btn) => {
        const value = btn.dataset.numSet === "max" ? pm.max : Number(btn.dataset.numSet);
        btn.classList.toggle("active", value === pm.value);
      });
    };
    if (range) {
      range.addEventListener("input", () => {
        pm.value = clamp(Number(range.value) || 1, 1, pm.max);
        sync();
      });
    }
    wrap.querySelectorAll("[data-num-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pm.value = clamp(pm.value + Number(btn.dataset.numStep || 0), 1, pm.max);
        sync();
      });
    });
    wrap.querySelectorAll("[data-num-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pm.value = btn.dataset.numSet === "max" ? pm.max : clamp(Number(btn.dataset.numSet) || 1, 1, pm.max);
        sync();
      });
    });
    sync();
  }

  /* @@END@@ */

  BG.register(game);
})();
