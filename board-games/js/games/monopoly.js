/* ==========================================================================
   مونوبولي — نسخة رقمية محلية كاملة
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const GROUP_COLORS = {
    brown: "#8a5a34",
    lightblue: "#7dc7df",
    pink: "#d56ba2",
    orange: "#e8954b",
    red: "#d5544f",
    yellow: "#f0cb4c",
    green: "#4eaa7a",
    darkblue: "#4d6fce",
    rail: "#2a3439",
    utility: "#b9c3c7",
  };

  const GROUP_NAMES = {
    brown: "بني",
    lightblue: "أزرق فاتح",
    pink: "وردي",
    orange: "برتقالي",
    red: "أحمر",
    yellow: "أصفر",
    green: "أخضر",
    darkblue: "أزرق داكن",
  };

  const DEFAULT_OPTIONS = {
    startMoney: 1500,
    jailFine: 50,
    auction: false,
    freeParking: false,
  };
  const GO_SALARY = 200;

  const SPACES = [
    { type: "go", name: "الانطلاق", short: "الانطلاق", icon: "➜" },
    { type: "prop", name: "شارع البحر المتوسط", short: "المتوسط", group: "brown", price: 60, house: 50, rent: [2, 10, 30, 90, 160, 250] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع البلطيق", short: "البلطيق", group: "brown", price: 60, house: 50, rent: [4, 20, 60, 180, 320, 450] },
    { type: "tax", name: "ضريبة الدخل", short: "ضريبة", icon: "💸", amount: 200 },
    { type: "rail", name: "سكة حديد القراءة", short: "القراءة", price: 200, icon: "🚂" },
    { type: "prop", name: "شارع أورينتال", short: "أورينتال", group: "lightblue", price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "شارع فيرمونت", short: "فيرمونت", group: "lightblue", price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
    { type: "prop", name: "شارع كونيتيكت", short: "كونيتيكت", group: "lightblue", price: 120, house: 50, rent: [8, 40, 100, 300, 450, 600] },
    { type: "jail", name: "السجن / زيارة", short: "السجن", icon: "🔒" },
    { type: "prop", name: "سانت تشارلز", short: "سانت تشارلز", group: "pink", price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
    { type: "utility", name: "شركة الكهرباء", short: "الكهرباء", price: 150, icon: "💡" },
    { type: "prop", name: "شارع ستيتس", short: "ستيتس", group: "pink", price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
    { type: "prop", name: "شارع فرجينيا", short: "فرجينيا", group: "pink", price: 160, house: 100, rent: [12, 60, 180, 500, 700, 900] },
    { type: "rail", name: "سكة حديد بنسلفانيا", short: "بنسلفانيا", price: 200, icon: "🚂" },
    { type: "prop", name: "سانت جيمس", short: "سانت جيمس", group: "orange", price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع تينيسي", short: "تينيسي", group: "orange", price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
    { type: "prop", name: "نيويورك", short: "نيويورك", group: "orange", price: 200, house: 100, rent: [16, 80, 220, 600, 800, 1000] },
    { type: "free", name: "موقف مجاني", short: "موقف", icon: "🅿️" },
    { type: "prop", name: "كنتاكي", short: "كنتاكي", group: "red", price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "إنديانا", short: "إنديانا", group: "red", price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { type: "prop", name: "إلينوي", short: "إلينوي", group: "red", price: 240, house: 150, rent: [20, 100, 300, 750, 925, 1100] },
    { type: "rail", name: "سكة حديد B&O", short: "B&O", price: 200, icon: "🚂" },
    { type: "prop", name: "شارع الأطلسي", short: "الأطلسي", group: "yellow", price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { type: "prop", name: "فينتنور", short: "فينتنور", group: "yellow", price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { type: "utility", name: "مياه المدينة", short: "المياه", price: 150, icon: "🚰" },
    { type: "prop", name: "حدائق مارفن", short: "مارفن", group: "yellow", price: 280, house: 150, rent: [24, 120, 360, 850, 1025, 1200] },
    { type: "gotojail", name: "اذهب إلى السجن", short: "إلى السجن", icon: "🚔" },
    { type: "prop", name: "شارع المحيط الهادئ", short: "الهادئ", group: "green", price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { type: "prop", name: "كارولينا الشمالية", short: "كارولينا", group: "green", price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع بنسلفانيا", short: "بنسلفانيا", group: "green", price: 320, house: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
    { type: "rail", name: "سكة الخط القصير", short: "الخط القصير", price: 200, icon: "🚂" },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "بارك بليس", short: "بارك بليس", group: "darkblue", price: 350, house: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
    { type: "tax", name: "ضريبة الرفاهية", short: "رفاهية", icon: "💎", amount: 100 },
    { type: "prop", name: "بوردووك", short: "بوردووك", group: "darkblue", price: 400, house: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
  ];

  const CHANCE = [
    { id: "go", title: "تقدّم إلى الانطلاق", text: "تحرّك إلى مربع الانطلاق واستلم 200 دولار." },
    { id: "illinois", title: "تقدّم إلى إلينوي", text: "تحرّك إلى شارع إلينوي. إذا مررت بالانطلاق استلم راتبك." },
    { id: "stcharles", title: "تقدّم إلى سانت تشارلز", text: "تحرّك إلى شارع سانت تشارلز. إذا مررت بالانطلاق استلم راتبك." },
    { id: "nearestRail", title: "أقرب سكة حديد", text: "تقدّم إلى أقرب سكة حديد وادفع الأجرة المعتادة إن كانت مملوكة." },
    { id: "nearestUtility", title: "أقرب مرفق", text: "تقدّم إلى أقرب مرفق وادفع عشرة أضعاف مجموع النرد إن كان مملوكًا." },
    { id: "boardwalk", title: "تقدّم إلى بوردووك", text: "تحرّك إلى بوردووك. إذا مررت بالانطلاق استلم راتبك." },
    { id: "reading", title: "تقدّم إلى سكة القراءة", text: "تحرّك إلى سكة حديد القراءة. إذا مررت بالانطلاق استلم راتبك." },
    { id: "dividend", title: "توزيعات أرباح", text: "البنك يدفع لك 50 دولارًا." },
    { id: "jailFree", title: "بطاقة خروج من السجن", text: "احتفظ بهذه البطاقة لاستخدامها عند دخولك السجن." },
    { id: "back3", title: "عُد ثلاث خطوات", text: "ارجع ثلاث خطوات ونفّذ تأثير المربع الذي تصل إليه." },
    { id: "goJail", title: "اذهب مباشرة إلى السجن", text: "انتقل إلى السجن دون المرور بالانطلاق." },
    { id: "repairs", title: "إصلاحات الشوارع", text: "ادفع 25 دولارًا لكل منزل و100 دولار لكل فندق تملكه." },
    { id: "poorTax", title: "ضريبة الفقراء", text: "ادفع 15 دولارًا." },
    { id: "chairman", title: "رئيس مجلس الإدارة", text: "ادفع 50 دولارًا لكل لاعب آخر." },
    { id: "loan", title: "قرض بناء", text: "استلم 150 دولارًا." },
    { id: "speeding", title: "مخالفة سرعة", text: "ادفع 15 دولارًا." },
  ];

  const CHEST = [
    { id: "go", title: "تقدّم إلى الانطلاق", text: "تحرّك إلى الانطلاق واستلم 200 دولار." },
    { id: "bankError", title: "خطأ مصرفي", text: "البنك يدفع لك 200 دولار." },
    { id: "doctor", title: "أتعاب الطبيب", text: "ادفع 50 دولارًا." },
    { id: "stock", title: "بيع أسهم", text: "استلم 50 دولارًا." },
    { id: "jailFree", title: "بطاقة خروج من السجن", text: "احتفظ بهذه البطاقة لاستخدامها عند دخولك السجن." },
    { id: "holiday", title: "صندوق العطلة", text: "استلم 100 دولار." },
    { id: "refund", title: "استرداد ضريبي", text: "استلم 20 دولارًا." },
    { id: "birthday", title: "عيد ميلاد سعيد", text: "كل لاعب آخر يدفع لك 10 دولارات." },
    { id: "insurance", title: "تأمين على الحياة", text: "استلم 100 دولار." },
    { id: "hospital", title: "مصاريف المستشفى", text: "ادفع 100 دولار." },
    { id: "school", title: "رسوم مدرسية", text: "ادفع 50 دولارًا." },
    { id: "consult", title: "أتعاب استشارية", text: "استلم 25 دولارًا." },
    { id: "repairs", title: "أعمال صيانة", text: "ادفع 40 دولارًا لكل منزل و115 دولارًا لكل فندق تملكه." },
    { id: "beauty", title: "مسابقة جمال", text: "استلم 10 دولارات." },
    { id: "opera", title: "حفل الأوبرا", text: "كل لاعب آخر يدفع لك 50 دولارًا." },
    { id: "secondPrize", title: "الجائزة الثانية", text: "استلم 10 دولارات." },
    { id: "inherit", title: "ميراث", text: "استلم 100 دولار." },
  ];

  let state = null;
  let apiRef = null;
  let rootRef = null;
  let aiRunner = null;
  let tokenPositions = new Map();
  let tokenTimers = [];

  /* رموز كلاسيكية مميزة لكل لاعب بدل تكرار البيدق نفسه. */
  const TOKEN_GLYPHS = ["🎩", "🚗", "🐕", "🚢", "👢", "👑"];

  const game = {
    id: "monopoly",
    name: "مونوبولي",
    en: "MONOPOLY",
    icon: "🎩",
    accent: "#e1b45c",
    cardClass: "card-monopoly",
    tagline: "اشترِ الشوارع، ابنِ الفنادق، وكن آخر من يملك المال.",
    players: "2–4",
    duration: "60–120 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "خيارات المباراة. تُطبَّق على اللعب المحلي والجماعي معًا.",
      defaults: DEFAULT_OPTIONS,
      fields: [
        {
          key: "startMoney",
          label: "رأس المال الابتدائي",
          type: "seg",
          choices: [
            { value: 1000, label: "1000$" },
            { value: 1500, label: "1500$" },
            { value: 2500, label: "2500$" },
          ],
          hint: "المبلغ الذي يبدأ به كل لاعب. اللعبة الأطول تمنح الجميع فرصة بناء مجموعات.",
        },
        {
          key: "jailFine",
          label: "غرامة الخروج من السجن",
          type: "seg",
          choices: [
            { value: 50, label: "50$" },
            { value: 100, label: "100$" },
          ],
          hint: "تُدفع عند اختيار الخروج من السجن أو بعد فشل المحاولة الثالثة.",
        },
        {
          key: "auction",
          label: "مزاد عند رفض الشراء",
          type: "toggle",
          hint: "عند تفعيله يُطرح العقار في مزاد سريع بين اللاعبين إذا قررت عدم شرائه بالسعر الكامل.",
        },
        {
          key: "freeParking",
          label: "جائزة الموقف المجاني",
          type: "toggle",
          hint: "عند تفعيله تتراكم الضرائب والغرامات في الموقف المجاني، ويأخذها أول لاعب يهبط عليه.",
        },
      ],
      summary(options) {
        return (
          U.money(Number(options.startMoney) || 1500) + " · غرامة " +
          U.money(Number(options.jailFine) === 100 ? 100 : 50) +
          (options.auction ? " · مزاد" : "") +
          (options.freeParking ? " · موقف مجاني" : "")
        );
      },
    },

    rules: {
      goal: "إفلاس جميع الخصوم والبقاء آخر لاعب قادر على الدفع. الفائز هو آخر لاعب لم يُعلن إفلاسه، ويمكن في نهاية اللعبة ترتيب اللاعبين بحسب صافي الثروة.",
      facts: [["المال الابتدائي", "1500 دولار لكل لاعب"], ["راتب الانطلاق", "200 دولار"], ["أجرة الخروج من السجن", "50 دولارًا"]],
      components: [
        "رقعة من 40 مربعًا: شوارع، 4 سكك حديد، شركتا مرافق، ضرائب، فرص، صندوق المجتمع، سجن، وموقف مجاني.",
        "22 شارعًا قابلًا للشراء موزعة على 8 مجموعات لونية.",
        "نردان وقطع لاعبين ومال بنكي.",
        "بطاقات فرصة وبطاقات صندوق المجتمع وبطاقات الخروج من السجن.",
        "منازل وفنادق تُبنى على الشوارع بعد امتلاك المجموعة كاملة.",
      ],
      setup: [
        "يبدأ كل لاعب بـ1500 دولار، وتوضع جميع القطع على مربع الانطلاق.",
        "تُخلط بطاقات «فرصة» و«صندوق المجتمع» منفصلتين وتوضعان مقلوبتين.",
        "يُحدد اللاعب الأول بالاتفاق أو برمية نرد، ثم يتناوب اللاعبون باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>ارمِ النرد:</strong> تحرّك بعدد النقاط. إذا مررت بمربع الانطلاق استلم 200 دولار. الرمية المزدوجة تمنحك رمية إضافية، لكن ثلاث رميات مزدوجة متتالية ترسلك إلى السجن.",
        "<strong>الشوارع:</strong> إذا وصلت إلى شارع غير مملوك يمكنك شراؤه بالسعر المكتوب. إذا كان مملوكًا لخصم فادفع الأجرة. الأجرة تتضاعف إذا كان المالك يملك المجموعة اللونية كاملة، وتزداد مع المنازل والفنادق.",
        "<strong>السكك والمرافق:</strong> أجرة السكة 25 دولارًا للسكة الأولى، 50 للسكة الثانية، 100 للثالثة، و200 للرابعة. أجرة المرافق = مجموع النرد × 4 إذا ملك لاعب مرفقًا واحدًا، و× 10 إذا ملك كليهما.",
        "<strong>البناء:</strong> بعد امتلاك مجموعة لونية كاملة يمكنك بناء منازل بالتساوي بين شوارع المجموعة، ثم فندق بدل أربعة منازل. البناء يتم من لوحة إدارة العقارات.",
        "<strong>فرصة وصندوق المجتمع:</strong> اسحب البطاقة العلوية ونفّذ تعليماتها فورًا. بطاقة الخروج من السجن تبقى معك حتى تستخدمها.",
        "<strong>السجن:</strong> عند دخولك السجن تتوقف عن الحركة. في دورك يمكنك دفع 50 دولارًا، أو استخدام بطاقة خروج، أو محاولة رمي المزدوج. بعد ثلاث محاولات فاشلة يجب أن تدفع الغرامة وتتحرك.",
        "<strong>الضرائب:</strong> ادفع المبلغ المكتوب على مربع الضريبة إلى البنك.",
        "<strong>الرهن والبيع:</strong> يمكنك رهن عقار مقابل نصف سعره، واستعادته مقابل 55% من السعر. لا يمكن رهن عقار عليه منازل.",
        "<strong>الإفلاس:</strong> إذا لم تستطع سداد ما عليك بعد بيع المنازل ورهن العقارات تُعلن مفلسًا وتنتقل أصولك إلى الدائن أو البنك.",
        "<strong>التبادل:</strong> يمكن للاعب الحالي تقديم عرض تبادل يشمل عقارًا أو أكثر ومالًا، ويوافق عليه اللاعب الآخر قبل التنفيذ.",
      ],
      winning: "يفوز آخر لاعب لم يُفلس. إذا انسحب لاعب أو أفلس، تُصفّى أصوله. في نهاية اللعبة يمكن الترتيب بصافي الثروة: المال + قيمة العقارات + قيمة المنازل.",
      notes: [
        "خيارات اللعبة: رأس مال 1000/1500/2500 دولار، غرامة سجن 50/100 دولار، مزاد عند رفض الشراء، وجائزة موقف مجاني.",
        "هذه النسخة لا تعتمد المزاد عند رفض شراء شارع افتراضيًا؛ عند تفعيل خيار المزاد يُطرح العقار على اللاعبين بمزايدة سريعة.",
        "لا توجد قيود على عدد المنازل والفنادق المتاحة في البنك في النسخة الرقمية.",
        "تُنفّذ صفقات التبادل بين اللاعبين على نفس الجهاز بموافقة الطرف الآخر، ويقرر الكمبيوتر قبول العرض أو رفضه تلقائيًا.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      tokenPositions = new Map();
      clearTokenTimers();
      const opts = Object.assign({}, DEFAULT_OPTIONS, (api && api.options) || {});
      const startMoney = [1000, 1500, 2500].indexOf(Number(opts.startMoney)) !== -1 ? Number(opts.startMoney) : 1500;
      const jailFine = Number(opts.jailFine) === 100 ? 100 : 50;
      const config = {
        startMoney,
        jailFine,
        auction: !!opts.auction,
        freeParking: !!opts.freeParking,
      };
      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        money: startMoney,
        pos: 0,
        inJail: false,
        jailTurns: 0,
        jailCards: 0,
        bankrupt: false,
      }));

      state = {
        players,
        props: {},
        config,
        pot: 0,
        current: 0,
        phase: "roll",
        dice: null,
        doubles: 0,
        extraRoll: false,
        pendingBuy: null,
        lastCard: null,
        notice: "اضغط «ارمِ النرد» لبدء الدور.",
        over: false,
        chanceDeck: U.shuffle(CHANCE.map((c) => c.id)),
        chanceIndex: 0,
        chestDeck: U.shuffle(CHEST.map((c) => c.id)),
        chestIndex: 0,
        tradeOpen: false,
        showManage: false,
        round: 1,
      };

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render, buyProperty, skipBuy, buildHouse, sellHouse, mortgage, unmortgage,
          moveTo, sendToJail, endTurn, charge, ownsGroup, groupSpaces,
          onRoll, payJail, useJailCard, resolveLanding, drawCard, runAuction,
        };
      }
      api.log("بدأت لعبة مونوبولي — كل لاعب يملك <strong>" + U.money(startMoney) + "</strong>.");
      render();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.tradeOpen = false;
          state.showManage = false;
          state.props = state.props || {};
          state.config = Object.assign({}, DEFAULT_OPTIONS, state.config || {});
          state.pot = Number(state.pot) || 0;
          state.players.forEach((player) => {
            player.bankrupt = !!player.bankrupt;
          });
          tokenPositions = new Map();
          clearTokenTimers();
          render();
        },
        netSeat() {
          return state ? state.current : -1;
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
          clearTokenTimers();
          tokenPositions = new Map();
        },
      };
    },
  };

  /* ------------------------------ مساعدات الحالة ------------------------------ */

  function cur() {
    return state.players[state.current];
  }

  function activePlayers() {
    return state.players.filter((p) => !p.bankrupt);
  }

  function ownerOf(idx) {
    const rec = state.props[idx];
    return rec && rec.owner != null ? state.players[rec.owner] : null;
  }

  function groupSpaces(group) {
    const list = [];
    SPACES.forEach((s, idx) => {
      if (s.group === group) list.push({ space: s, idx });
    });
    return list;
  }

  function ownsGroup(player, group) {
    const list = groupSpaces(group);
    return list.length > 0 && list.every(({ idx }) => state.props[idx] && state.props[idx].owner === player.index);
  }

  function countType(player, type) {
    return Object.entries(state.props).filter(([idx, rec]) => {
      const s = SPACES[Number(idx)];
      return s.type === type && rec.owner === player.index;
    }).length;
  }

  function netWorth(p) {
    let total = p.money;
    for (const [idx, rec] of Object.entries(state.props)) {
      if (rec.owner !== p.index) continue;
      const sp = SPACES[Number(idx)];
      total += rec.mortgaged ? Math.floor(sp.price / 2) : sp.price;
      total += rec.houses * Math.floor((sp.house || 0) / 2);
    }
    return total;
  }

  function ownedList(p) {
    return Object.entries(state.props)
      .filter(([, rec]) => rec.owner === p.index)
      .map(([idx, rec]) => ({ idx: Number(idx), rec, space: SPACES[Number(idx)] }))
      .sort((a, b) => a.idx - b.idx);
  }

  /* ------------------------------ المال والإفلاس ------------------------------ */

  function addMoney(p, amount) {
    p.money += amount;
  }

  function liquidate(p, needed) {
    if (p.money >= needed) return true;
    // بيع المنازل أولًا
    for (const item of ownedList(p)) {
      while (item.rec.houses > 0 && p.money < needed) {
        item.rec.houses--;
        p.money += Math.floor(item.space.house / 2);
        apiRef.log("باعت <strong>" + U.escape(p.name) + "</strong> منزلًا في " + U.escape(item.space.name) + " لتغطية الدين.", "warn");
      }
      if (p.money >= needed) return true;
    }
    // ثم الرهن
    for (const item of ownedList(p)) {
      if (p.money >= needed) break;
      if (!item.rec.mortgaged && item.rec.houses === 0) {
        item.rec.mortgaged = true;
        p.money += Math.floor(item.space.price / 2);
        apiRef.log("رهنت <strong>" + U.escape(p.name) + "</strong> " + U.escape(item.space.name) + " مقابل " + U.money(Math.floor(item.space.price / 2)) + ".", "warn");
      }
    }
    return p.money >= needed;
  }

  function charge(p, amount, receiver) {
    if (amount <= 0) return true;
    if (p.money < amount) {
      liquidate(p, amount);
    }
    if (p.money < amount) {
      bankrupt(p, receiver || null);
      return false;
    }
    p.money -= amount;
    if (receiver && receiver.index !== undefined) receiver.money += amount;
    else if (state.config && state.config.freeParking) state.pot = (state.pot || 0) + amount;
    if (p.money < 0) p.money = 0;
    if (FX) FX.sound("coin");
    return true;
  }

  function bankrupt(p, creditor) {
    if (p.bankrupt) return;
    p.bankrupt = true;
    p.inJail = false;
    if (creditor && !creditor.bankrupt) creditor.money += p.money;
    p.money = 0;
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> أعلن الإفلاس!", "warn");
    for (const item of ownedList(p)) {
      item.rec.houses = 0;
      if (creditor && !creditor.bankrupt && creditor.index !== p.index) {
        item.rec.owner = creditor.index;
        apiRef.log("انتقل " + U.escape(item.space.name) + " إلى " + U.escape(creditor.name) + ".");
      } else {
        item.rec.owner = null;
        item.rec.mortgaged = false;
      }
    }
    checkGameOver();
    if (!state.over && p.index === state.current) {
      state.extraRoll = false;
      state.phase = "end";
      state.notice = "أفلس " + p.name + " — يُنهى دوره تلقائيًا.";
      setTimeout(() => {
        if (state && !state.over && state.current === p.index) endTurn();
      }, 900);
    }
  }

  function checkGameOver() {
    const alive = activePlayers();
    if (alive.length <= 1 && !state.over) {
      state.over = true;
      state.phase = "over";
      const winner = alive[0] || null;
      const standings = state.players
        .slice()
        .sort((a, b) => (a.bankrupt === b.bankrupt ? netWorth(b) - netWorth(a) : a.bankrupt ? 1 : -1))
        .map((p) => ({ name: p.name, value: U.money(netWorth(p)) + (p.bankrupt ? " — مفلس" : "") }));
      apiRef.log("انتهت اللعبة" + (winner ? " بفوز <strong>" + U.escape(winner.name) + "</strong>!" : "."), "good");
      render();
      if (FX) FX.win();
      apiRef.gameOver({
        icon: "🎩",
        title: "انتهت مونوبولي",
        text: winner ? "آخر لاعب صامد في المدينة." : "انتهت اللعبة.",
        winner: winner ? winner.name : "",
        standings,
      });
    }
  }

  /* ------------------------------ الحركة ------------------------------ */

  function passGo(p, amount) {
    addMoney(p, amount == null ? GO_SALARY : amount);
    apiRef.log("استلم <strong>" + U.escape(p.name) + "</strong> راتب الانطلاق " + U.money(GO_SALARY) + ".", "good");
  }

  function moveTo(p, idx, collectGo) {
    const old = p.pos;
    let next = ((idx % 40) + 40) % 40;
    if (collectGo !== false && next < old) passGo(p);
    p.pos = next;
    return resolveLanding(p);
  }

  function moveBy(p, steps) {
    return moveTo(p, p.pos + steps, true);
  }

  function sendToJail(p, reason) {
    p.pos = 10;
    p.inJail = true;
    p.jailTurns = 0;
    state.extraRoll = false;
    state.phase = "end";
    state.notice = "أنت في السجن. في دورك القادم يمكنك الدفع أو استخدام بطاقة أو رمي المزدوج.";
    apiRef.log("دخل <strong>" + U.escape(p.name) + "</strong> السجن" + (reason ? " — " + reason : "") + ".", "warn");
    if (FX) {
      FX.sound("error");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mono-board")), 55);
    }
  }

  function resolveLanding(p) {
    const idx = p.pos;
    const space = SPACES[idx];

    if (space.type === "go") {
      // الراتب يُمنح مرة واحدة في moveTo عند المرور أو الوصول
      return "done";
    }

    if (space.type === "free") {
      const pot = Number(state.pot) || 0;
      if (state.config && state.config.freeParking && pot > 0) {
        addMoney(p, pot);
        state.pot = 0;
        state.notice = "موقف مجاني — استلمت الجائزة المتراكمة " + U.money(pot) + ".";
        apiRef.log("استلم <strong>" + U.escape(p.name) + "</strong> جائزة الموقف المجاني " + U.money(pot) + ".", "good");
      } else {
        state.notice = "موقف مجاني — لا شيء يحدث. استمتع بالاستراحة.";
      }
      return "done";
    }

    if (space.type === "jail") {
      state.notice = "زيارة فقط للسجن — لا عقوبة.";
      return "done";
    }

    if (space.type === "gotojail") {
      sendToJail(p, "مربع اذهب إلى السجن");
      return "done";
    }

    if (space.type === "tax") {
      state.notice = "ضريبة " + U.money(space.amount) + ".";
      apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> ضريبة " + U.money(space.amount) + ".", "warn");
      charge(p, space.amount, null);
      return "done";
    }

    if (space.type === "chance" || space.type === "chest") {
      return drawCard(p, space.type === "chance" ? "chance" : "chest");
    }

    if (space.type === "prop" || space.type === "rail" || space.type === "utility") {
      const rec = state.props[idx];
      if (!rec || rec.owner == null) {
        state.pendingBuy = idx;
        state.phase = "buy";
        state.notice = "يمكنك شراء " + space.name + " مقابل " + U.money(space.price) + ".";
        return "wait";
      }
      if (rec.owner === p.index) {
        state.notice = "وصلت إلى عقارك " + space.name + ".";
        return "done";
      }
      if (rec.mortgaged) {
        state.notice = "العقار مرهون — لا أجرة.";
        return "done";
      }
      const owner = state.players[rec.owner];
      let rent = 0;
      if (space.type === "prop") {
        if (rec.houses > 0) rent = space.rent[rec.houses];
        else if (ownsGroup(owner, space.group)) rent = space.rent[0] * 2;
        else rent = space.rent[0];
      } else if (space.type === "rail") {
        const n = countType(owner, "rail");
        rent = [0, 25, 50, 100, 200][n] || 200;
      } else {
        const n = countType(owner, "utility");
        rent = (state.dice ? state.dice[0] + state.dice[1] : 7) * (n >= 2 ? 10 : 4);
      }
      state.notice = "أجرة " + space.name + " لصالح " + owner.name + ": " + U.money(rent) + ".";
      apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> أجرة " + U.money(rent) + " إلى <strong>" + U.escape(owner.name) + "</strong>.", "warn");
      charge(p, rent, owner);
      return "done";
    }

    return "done";
  }

  function drawCard(p, deckName) {
    const isChance = deckName === "chance";
    const deck = isChance ? state.chanceDeck : state.chestDeck;
    let index = isChance ? state.chanceIndex : state.chestIndex;
    if (index >= deck.length) index = 0;
    const id = deck[index];
    if (isChance) state.chanceIndex = index + 1;
    else state.chestIndex = index + 1;

    const card = (isChance ? CHANCE : CHEST).find((c) => c.id === id) || (isChance ? CHANCE[0] : CHEST[0]);
    state.lastCard = { deck: isChance ? "فرصة" : "صندوق المجتمع", title: card.title, text: card.text };
    state.notice = card.title + " — " + card.text;
    apiRef.log("سحب <strong>" + U.escape(p.name) + "</strong> بطاقة " + state.lastCard.deck + ": <strong>" + U.escape(card.title) + "</strong>.", "accent");
    if (FX) {
      FX.sound("card");
      FX.after(() => FX.deal(rootRef && rootRef.querySelector(".mcard:not(.empty)")), 55);
    }

    switch (card.id) {
      case "go":
        return moveTo(p, 0, true);
      case "illinois":
        return moveTo(p, 24, true);
      case "stcharles":
        return moveTo(p, 11, true);
      case "nearestRail": {
        const rails = [5, 15, 25, 35];
        let target = rails.find((r) => r >= p.pos);
        if (target == null) target = rails[0];
        return moveTo(p, target, true);
      }
      case "nearestUtility": {
        const utilities = [12, 28];
        let target = utilities.find((u) => u >= p.pos);
        if (target == null) target = utilities[0];
        const old = p.pos;
        if (target < old) passGo(p);
        p.pos = target;
        const rec = state.props[target];
        if (rec && rec.owner != null && rec.owner !== p.index && !rec.mortgaged) {
          const owner = state.players[rec.owner];
          const total = state.dice ? state.dice[0] + state.dice[1] : 7;
          const rent = total * 10;
          state.notice = "أجرة المرفق لصالح " + owner.name + ": " + U.money(rent) + ".";
          apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> أجرة مرفق " + U.money(rent) + " إلى <strong>" + U.escape(owner.name) + "</strong>.", "warn");
          charge(p, rent, owner);
        } else {
          state.notice = "وصلت إلى " + SPACES[target].name + (rec && rec.owner === p.index ? " — مرفقك." : " — غير مملوك.");
        }
        return "done";
      }
      case "boardwalk":
        return moveTo(p, 39, true);
      case "reading":
        return moveTo(p, 5, true);
      case "dividend":
        addMoney(p, 50);
        return "done";
      case "jailFree":
        p.jailCards++;
        return "done";
      case "back3":
        return moveTo(p, p.pos - 3, false);
      case "goJail":
        sendToJail(p, "بطاقة فرصة");
        return "done";
      case "repairs": {
        let houses = 0;
        let hotels = 0;
        for (const item of ownedList(p)) {
          if (item.rec.houses === 5) hotels++;
          else houses += item.rec.houses;
        }
        const cost = houses * (isChance ? 25 : 40) + hotels * (isChance ? 100 : 115);
        if (cost > 0) charge(p, cost, null);
        return "done";
      }
      case "poorTax":
      case "speeding":
        charge(p, 15, null);
        return "done";
      case "chairman":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) {
            charge(p, 50, other);
            if (p.bankrupt) break;
          }
        }
        return "done";
      case "loan":
        addMoney(p, 150);
        return "done";
      case "bankError":
        addMoney(p, 200);
        return "done";
      case "doctor":
        charge(p, 50, null);
        return "done";
      case "stock":
        addMoney(p, 50);
        return "done";
      case "holiday":
        addMoney(p, 100);
        return "done";
      case "refund":
        addMoney(p, 20);
        return "done";
      case "birthday":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) {
            charge(other, 10, p);
          }
        }
        return "done";
      case "insurance":
        addMoney(p, 100);
        return "done";
      case "hospital":
        charge(p, 100, null);
        return "done";
      case "school":
        charge(p, 50, null);
        return "done";
      case "consult":
        addMoney(p, 25);
        return "done";
      case "beauty":
        addMoney(p, 10);
        return "done";
      case "secondPrize":
        addMoney(p, 10);
        return "done";
      case "opera":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) {
            charge(other, 50, p);
            if (state.over) break;
          }
        }
        return "done";
      case "inherit":
        addMoney(p, 100);
        return "done";
      default:
        return "done";
    }
  }

  function finishStep() {
    if (state.over || !state || state.phase === "buy" || state.phase === "auction") return;
    const p = cur();
    if (p && p.bankrupt) { endTurn(); return; }
    if (state.extraRoll) {
      state.phase = "roll";
      state.notice = "رمية مزدوجة — لك رمية إضافية!";
    } else {
      state.phase = "end";
    }
    render();
  }

  function onRoll() {
    if (state.over || state.phase !== "roll") return;
    const p = cur();
    if (!p || p.bankrupt) { endTurn(); return; }

    if (p.inJail) {
      return rollInJail(p);
    }

    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    if (FX) {
      FX.sound("dice");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mdice")), 35);
    }
    const total = d1 + d2;
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> رمى النرد: " + d1 + " + " + d2 + " = <strong>" + total + "</strong>.");

    if (d1 === d2) {
      state.doubles++;
      state.extraRoll = true;
      if (state.doubles >= 3) {
        state.extraRoll = false;
        sendToJail(p, "ثلاث رميات مزدوجة متتالية");
        state.phase = "end";
        render();
        return;
      }
    } else {
      state.extraRoll = false;
      state.doubles = 0;
    }

    state.phase = "moving";
    const result = moveBy(p, total);
    if (state.over) return;
    if (result === "wait") {
      // انتظار قرار الشراء
      render();
    } else {
      if (state.phase !== "end" && state.phase !== "roll") {
        finishStep();
      } else {
        render();
      }
    }
  }

  function jailFine() {
    return state && state.config ? Number(state.config.jailFine) || 50 : 50;
  }

  function rollInJail(p) {
    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    state.extraRoll = false;
    if (FX) {
      FX.sound("dice");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mdice")), 35);
    }
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> حاول الخروج من السجن: " + d1 + " + " + d2 + ".");

    if (d1 === d2) {
      p.inJail = false;
      p.jailTurns = 0;
      state.notice = "رمية مزدوجة! خرجت من السجن.";
      apiRef.log("خرج <strong>" + U.escape(p.name) + "</strong> من السجن برمية مزدوجة.", "good");
      const result = moveBy(p, d1 + d2);
      if (result !== "wait") finishStep();
      else render();
      return;
    }

    p.jailTurns++;
    if (p.jailTurns >= 3) {
      state.notice = "المحاولة الثالثة فشلت — ادفع الغرامة وتحرك.";
      apiRef.log("فشلت المحاولة الثالثة؛ دفع <strong>" + U.escape(p.name) + "</strong> غرامة السجن.", "warn");
      if (!charge(p, jailFine(), null)) return;
      p.inJail = false;
      p.jailTurns = 0;
      const result = moveBy(p, d1 + d2);
      if (result !== "wait") finishStep();
      else render();
      return;
    }

    state.phase = "end";
    state.notice = "لم ترمِ مزدوجًا. تبقى في السجن — المحاولة " + p.jailTurns + " من 3.";
    render();
  }

  function payJail() {
    const p = cur();
    if (!p.inJail || state.phase === "over") return;
    if (!charge(p, jailFine(), null)) return;
    p.inJail = false;
    p.jailTurns = 0;
    state.phase = "roll";
    state.notice = "دفعت " + U.money(jailFine()) + " وخرجت من السجن. يمكنك رمي النرد.";
    apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> " + U.money(jailFine()) + " للخروج من السجن.");
    if (FX) FX.sound("coin");
    render();
  }

  function useJailCard() {
    const p = cur();
    if (!p.inJail || p.jailCards <= 0) return;
    p.jailCards--;
    p.inJail = false;
    p.jailTurns = 0;
    state.phase = "roll";
    state.notice = "استخدمت بطاقة الخروج من السجن.";
    apiRef.log("استخدم <strong>" + U.escape(p.name) + "</strong> بطاقة الخروج من السجن.", "good");
    if (FX) FX.sound("card");
    render();
  }

  function endTurn() {
    if (state.over) return;
    const p = cur();
    if (p && p.bankrupt) {
      // تخطي المفلسين
    }
    state.extraRoll = false;
    state.doubles = 0;
    const alive = activePlayers();
    if (!alive.length) { checkGameOver(); return; }
    let next = state.current;
    for (let i = 0; i < state.players.length; i++) {
      next = (next + 1) % state.players.length;
      if (!state.players[next].bankrupt) break;
    }
    if (next <= state.current) state.round++;
    state.current = next;
    state.phase = "roll";
    state.dice = null;
    state.pendingBuy = null;
    state.notice = "دور " + state.players[next].name + " — ارمِ النرد.";
    state.lastCard = null;
    if (FX) FX.sound("turn");
    render();
  }

  /* ------------------------------ الشراء والبناء ------------------------------ */

  function buyProperty() {
    const idx = state.pendingBuy;
    if (idx == null || state.phase !== "buy") return;
    const p = cur();
    const space = SPACES[idx];
    if (p.money < space.price) {
      BG.toast("لا تملك مالًا كافيًا لشراء " + space.name, "warn");
      return;
    }
    p.money -= space.price;
    state.props[idx] = { owner: p.index, houses: 0, mortgaged: false };
    state.pendingBuy = null;
    state.phase = "end";
    state.notice = "اشتريت " + space.name + ".";
    apiRef.log("اشترى <strong>" + U.escape(p.name) + "</strong> " + U.escape(space.name) + " مقابل " + U.money(space.price) + ".", "good");
    finishStep();
    if (FX) {
      FX.sound("coin");
      FX.after(() => {
        const row = rootRef && rootRef.querySelector(".mrow.active");
        if (row) { FX.pop(row); FX.floatText(row, "−" + U.money(space.price), "warn"); }
      }, 55);
    }
  }

  function skipBuy() {
    if (state.phase !== "buy") return;
    const idx = state.pendingBuy;
    const space = SPACES[idx];
    state.pendingBuy = null;
    state.notice = "تركت " + space.name + " للبنك.";
    apiRef.log("لم يشترِ <strong>" + U.escape(cur().name) + "</strong> " + U.escape(space.name) + ".");
    if (state.config && state.config.auction) {
      state.phase = "auction";
      render();
      runAuction(idx).catch((err) => {
        console.warn(err);
        if (state && state.phase === "auction") { state.phase = "end"; finishStep(); }
      });
      return;
    }
    state.phase = "end";
    finishStep();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function auctionLimit(p, space) {
    const factor = AI.level(p.level) === "easy" ? 0.42 : AI.level(p.level) === "hard" ? 0.95 : 0.7;
    let limit = Math.floor((space.price || 0) * factor);
    if (space.group) {
      const total = groupSpaces(space.group).length;
      const owned = groupSpaces(space.group).filter(({ idx }) => state.props[idx] && state.props[idx].owner === p.index).length;
      if (owned === total - 1) limit += Math.floor(space.price * 0.55);
      else if (owned >= 2) limit += Math.floor(space.price * 0.2);
    }
    if (space.type === "rail") limit += countType(p, "rail") * 35;
    return Math.max(0, Math.min(p.money, limit));
  }

  function askAuctionBid(p, space, highest) {
    const min = highest + 10;
    if (min > p.money) return Promise.resolve(0);
    const body = BG.el("div", { class: "auction-form" });
    body.innerHTML =
      '<p class="auction-note">العقار: <strong>' + U.escape(space.name) + "</strong> — سعره الأصلي " + U.money(space.price || 0) + ".</p>" +
      '<p class="auction-note">أعلى مزايدة حالية: <strong>' + (highest ? U.money(highest) : "لا شيء") + "</strong>. أقل مزايدة: " + U.money(min) + ".</p>" +
      '<label class="trade-field"><span>مزايدتك يا ' + U.escape(p.name) + " (حتى " + U.money(p.money) + ')</span>' +
      '<input name="bid" type="number" min="' + min + '" max="' + p.money + '" step="10" value="' + min + '" /></label>' +
      '<p class="trade-note">أعلى مزايدة تفوز وتدفع المبلغ للبنك. يمكنك الانسحاب.</p>';
    const input = body.querySelector('[name="bid"]');
    const dlg = BG.openDialog({
      title: "🔨 مزاد على " + space.name,
      body,
      actions: [
        { label: "انسحاب", value: "pass" },
        {
          label: "زايد",
          primary: true,
          onClick: ({ close }) => {
            const value = Math.floor(Number(input.value) || 0);
            if (value < min) { BG.toast("أقل مزايدة مقبولة هي " + U.money(min) + ".", "warn"); return; }
            if (value > p.money) { BG.toast("لا تملك هذا المبلغ.", "warn"); return; }
            close("bid:" + value);
          },
        },
      ],
    });
    return dlg.promise.then((value) => {
      if (typeof value !== "string" || value.indexOf("bid:") !== 0) return 0;
      return Math.max(min, Math.min(p.money, Math.floor(Number(value.slice(4)) || 0)));
    });
  }

  async function runAuction(idx) {
    const space = SPACES[idx];
    if (!space) { state.phase = "end"; finishStep(); return; }
    const bidders = activePlayers();
    let highest = 0;
    let winner = null;
    for (const p of bidders) {
      if (!state || state.over || state.phase !== "auction") return;
      let bid = 0;
      if (AI.isCpu(p)) {
        await wait(360);
        const limit = auctionLimit(p, space);
        if (limit > highest) {
          bid = Math.min(limit, highest + Math.max(10, Math.round((space.price || 100) * 0.15)));
        }
      } else {
        bid = await askAuctionBid(p, space, highest);
      }
      if (bid > highest) { highest = bid; winner = p; }
    }
    if (winner && highest > 0) {
      winner.money -= highest;
      state.props[idx] = { owner: winner.index, houses: 0, mortgaged: false };
      state.notice = "فاز " + winner.name + " بمزاد " + space.name + " مقابل " + U.money(highest) + ".";
      apiRef.log("فاز <strong>" + U.escape(winner.name) + "</strong> بمزاد " + U.escape(space.name) + " مقابل " + U.money(highest) + ".", "good");
      if (FX) {
        FX.sound("coin");
        FX.after(() => FX.pop(rootRef && rootRef.querySelector(".mrow.active")), 45);
      }
    } else {
      state.notice = "لم يتلقَّ " + space.name + " أي مزايدة — بقي للبنك.";
      apiRef.log("انتهى مزاد " + U.escape(space.name) + " دون مزايدات.", "warn");
    }
    state.phase = "end";
    finishStep();
  }

  function canBuild(rec, idx) {
    const space = SPACES[idx];
    if (!space.group || !rec || rec.owner == null || rec.mortgaged || rec.houses >= 5) return false;
    const owner = state.players[rec.owner];
    if (!ownsGroup(owner, space.group)) return false;
    const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
    if (group.some((g) => g.mortgaged)) return false;
    const minHouses = Math.min(...group.map((g) => g.houses));
    return rec.houses === minHouses;
  }

  function buildHouse(idx) {
    const rec = state.props[idx];
    const p = rec ? state.players[rec.owner] : null;
    if (!p || rec.owner !== state.current || !canBuild(rec, idx)) {
      BG.toast("لا يمكن البناء الآن — يجب امتلاك المجموعة كاملة والبناء بالتساوي.", "warn");
      return;
    }
    const space = SPACES[idx];
    if (p.money < space.house) {
      BG.toast("لا تملك مالًا كافيًا لبناء منزل.", "warn");
      return;
    }
    p.money -= space.house;
    rec.houses++;
    apiRef.log("بنى <strong>" + U.escape(p.name) + "</strong> " + (rec.houses === 5 ? "فندقًا" : "منزلًا") + " في " + U.escape(space.name) + ".", "good");
    render();
    if (FX) {
      FX.sound("build");
      FX.after(() => {
        const row = rootRef && rootRef.querySelector(".mrow.active");
        if (row) { FX.pop(row); FX.floatText(row, "+" + (rec.houses === 5 ? "فندق" : "منزل"), "good"); }
      }, 45);
    }
  }

  function sellHouse(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || rec.houses <= 0) return;
    const p = state.players[rec.owner];
    const space = SPACES[idx];
    if (space.group) {
      const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
      const maxHouses = Math.max(...group.map((g) => g.houses || 0));
      if (rec.houses < maxHouses) {
        BG.toast("بع المنازل بالتساوي — لا يمكن البيع من عقار أقل بناءً من غيره.", "warn");
        return;
      }
    }
    rec.houses--;
    p.money += Math.floor(space.house / 2);
    apiRef.log("باع <strong>" + U.escape(p.name) + "</strong> بناءً في " + U.escape(space.name) + " مقابل " + U.money(Math.floor(space.house / 2)) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  function mortgage(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || rec.mortgaged) return;
    const space = SPACES[idx];
    if (space.group) {
      const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
      if (group.some((g) => g.houses > 0)) {
        BG.toast("بيع المنازل في المجموعة أولًا قبل الرهن.", "warn");
        return;
      }
    }
    if (rec.houses > 0) {
      BG.toast("لا يمكن رهن عقار عليه منازل.", "warn");
      return;
    }
    rec.mortgaged = true;
    const p = state.players[rec.owner];
    p.money += Math.floor(space.price / 2);
    apiRef.log("رهن <strong>" + U.escape(p.name) + "</strong> " + U.escape(space.name) + " مقابل " + U.money(Math.floor(space.price / 2)) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  function unmortgage(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || !rec.mortgaged) return;
    const space = SPACES[idx];
    const cost = Math.ceil(space.price * 0.55);
    const p = state.players[rec.owner];
    if (p.money < cost) {
      BG.toast("لا تملك " + U.money(cost) + " لفك الرهن.", "warn");
      return;
    }
    p.money -= cost;
    rec.mortgaged = false;
    apiRef.log("فك <strong>" + U.escape(p.name) + "</strong> رهن " + U.escape(space.name) + " مقابل " + U.money(cost) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  /* ------------------------------ التبادل ------------------------------ */

  function tradePropertyValue(player, idx) {
    const space = SPACES[idx];
    if (!space || space.price == null) return 0;
    let value = space.price;
    if (space.group) {
      const total = groupSpaces(space.group).length;
      const owned = groupSpaces(space.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === player.index).length;
      if (owned === total - 1) value += space.price * 0.8;
      else if (owned === total) value += space.price * 0.35;
    }
    if (space.type === "rail") value += countType(player, "rail") * 45;
    if (space.type === "utility") value += countType(player, "utility") * 35;
    return Math.round(value);
  }

  function cpuAcceptsTrade(target, offer) {
    const gain = offer.pay + (offer.giveIdx != null ? tradePropertyValue(target, offer.giveIdx) : 0);
    const loss = offer.receive + (offer.takeIdx != null ? tradePropertyValue(target, offer.takeIdx) : 0);
    const level = AI.level(target.level);
    const factor = level === "easy" ? 1.35 : level === "hard" ? 0.95 : 1.1;
    return gain > 0 && gain >= loss * factor;
  }

  function openTrade() {
    if (state.over) return;
    const p = cur();
    const others = activePlayers().filter((x) => x.index !== p.index);
    if (!others.length) { BG.toast("لا يوجد لاعب آخر للتبادل.", "warn"); return; }
    const mine = ownedList(p);
    let target = others[0];

    const body = BG.el("div", { class: "trade-form" });
    body.innerHTML =
      '<div class="trade-grid">' +
      '<label class="trade-field"><span>اللاعب الآخر</span><select name="target">' +
      others.map((o) => '<option value="' + o.index + '">' + U.escape(o.name) + "</option>").join("") +
      "</select></label>" +
      '<label class="trade-field"><span>أعطِ عقارًا</span><select name="give">' +
      '<option value="">— لا عقار —</option>' +
      mine.map((m) => '<option value="' + m.idx + '">' + U.escape(m.space.name) + "</option>").join("") +
      "</select></label>" +
      '<label class="trade-field"><span>اطلب عقارًا</span><select name="take"></select></label>' +
      '<label class="trade-field"><span>تدفع أنت (حد أقصى ' + U.money(p.money) + ')</span><input name="pay" type="number" min="0" max="' + p.money + '" value="0" /></label>' +
      '<label class="trade-field"><span>يدفع لك (حد أقصى ' + U.money(target.money) + ')</span><input name="receive" type="number" min="0" max="' + target.money + '" value="0" /></label>' +
      "</div>" +
      '<p class="trade-note">يوافق اللاعب الآخر على العرض من نفس الجهاز قبل التنفيذ.</p>';

    const targetSel = body.querySelector('[name="target"]');
    const takeSel = body.querySelector('[name="take"]');
    const payInput = body.querySelector('[name="pay"]');
    const receiveInput = body.querySelector('[name="receive"]');

    function syncTarget() {
      target = state.players[Number(targetSel.value)];
      const theirs = ownedList(target);
      takeSel.innerHTML = theirs.length
        ? theirs.map((m) => '<option value="' + m.idx + '">' + U.escape(m.space.name) + "</option>").join("")
        : '<option value="">— لا عقارات —</option>';
      payInput.max = String(p.money);
      receiveInput.max = String(target.money);
      body.querySelectorAll(".trade-field span").forEach((el) => {
        if (el.textContent.startsWith("تدفع أنت")) el.textContent = "تدفع أنت (حد أقصى " + U.money(p.money) + ")";
        if (el.textContent.startsWith("يدفع لك")) el.textContent = "يدفع لك (حد أقصى " + U.money(target.money) + ")";
      });
    }
    targetSel.addEventListener("change", syncTarget);
    syncTarget();

    const dlg = BG.openDialog({
      title: "🤝 عرض تبادل",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "إرسال العرض",
          primary: true,
          onClick: async ({ close }) => {
            const giveRaw = body.querySelector('[name="give"]').value;
            const giveIdx = giveRaw === "" ? null : Number(giveRaw);
            const takeRaw = takeSel.value;
            const takeIdx = takeRaw === "" ? null : Number(takeRaw);
            const pay = Math.max(0, Math.min(p.money, Number(payInput.value) || 0));
            const receive = Math.max(0, Math.min(target.money, Number(receiveInput.value) || 0));
            if (giveIdx != null && giveIdx === takeIdx) { BG.toast("اختر عقارين مختلفين.", "warn"); return; }
            if (giveIdx == null && takeIdx == null && !pay && !receive) {
              BG.toast("أضف عقارًا أو مبلغًا إلى العرض.", "warn");
              return;
            }
            const giveName = giveIdx == null ? "لا شيء" : SPACES[giveIdx].name;
            const takeName = takeIdx == null ? "لا شيء" : SPACES[takeIdx].name;
            close("sent");
            const text = "<div class='trade-summary'>" +
              "<p><strong>" + U.escape(p.name) + "</strong> يعرض:</p>" +
              "<ul><li>" + U.escape(giveName) + "</li>" + (pay ? "<li>" + U.money(pay) + "</li>" : "") + "</ul>" +
              "<p>مقابل من <strong>" + U.escape(target.name) + "</strong>:</p>" +
              "<ul><li>" + U.escape(takeName) + "</li>" + (receive ? "<li>" + U.money(receive) + "</li>" : "") + "</ul>" +
              "<p>هل تقبل يا " + U.escape(target.name) + "؟</p></div>";
            const net = apiRef && apiRef.net;
            let ok;
            if (AI.isCpu(target)) {
              await wait(420);
              ok = cpuAcceptsTrade(target, { giveIdx, takeIdx, pay, receive });
            } else if (net && net.isRemoteSeat(target.index)) {
              ok = await net.confirmTrade(target.index, text);
            } else {
              ok = await BG.confirm("عرض تبادل جديد", text, "أوافق", "أرفض");
            }
            if (!ok) {
              apiRef.log("رفض <strong>" + U.escape(target.name) + "</strong> عرض التبادل من <strong>" + U.escape(p.name) + "</strong>.");
              BG.toast(AI.isCpu(target) ? "رفض الكمبيوتر العرض — جرّب مبلغًا أو عقارًا أفضل." : "رُفض العرض.");
              return;
            }
            if (giveIdx != null && state.props[giveIdx] && state.props[giveIdx].owner === p.index) state.props[giveIdx].owner = target.index;
            if (takeIdx != null && state.props[takeIdx] && state.props[takeIdx].owner === target.index) state.props[takeIdx].owner = p.index;
            p.money -= pay;
            target.money += pay;
            target.money -= receive;
            p.money += receive;
            apiRef.log("تم تبادل: <strong>" + U.escape(p.name) + "</strong> ↔ <strong>" + U.escape(target.name) + "</strong>.", "good");
            BG.toast("تم تنفيذ التبادل.", "good");
            if (FX) {
              FX.sound("trade");
              FX.after(() => FX.pop(rootRef && rootRef.querySelector(".mrow.active")), 45);
            }
            render();
          },
        },
      ],
    });
    return dlg;
  }

  /* ------------------------------ عرض تفاصيل العقار ------------------------------ */

  function showPropertyDetails(idx) {
    const space = SPACES[idx];
    if (!space) return;
    const rec = state.props[idx] || {};
    const owner = rec.owner != null ? state.players[rec.owner] : null;
    const body = BG.el("div", { class: "mono-prop-details" });

    if (space.type === "prop") {
      body.innerHTML =
        '<div class="mono-prop-head" style="background:' + (GROUP_COLORS[space.group] || "#666") + '"><strong>' + U.escape(space.name) + "</strong></div>" +
        '<div class="mono-prop-body">' +
        (space.price ? "<div>السعر: <strong>" + U.money(space.price) + "</strong></div>" : "") +
        (space.house ? "<div>منزل: <strong>" + U.money(space.house) + "</strong></div>" : "") +
        "<div>الإيجار:</div>" +
        "<ul>" +
        "<li>بدون منازل: <strong>" + U.money(space.rent[0]) + "</strong></li>" +
        "<li>بمنزل واحد: <strong>" + U.money(space.rent[1]) + "</strong></li>" +
        "<li>بمنزلين: <strong>" + U.money(space.rent[2]) + "</strong></li>" +
        "<li>بثلاثة منازل: <strong>" + U.money(space.rent[3]) + "</strong></li>" +
        "<li>بأربعة منازل: <strong>" + U.money(space.rent[4]) + "</strong></li>" +
        "<li>فندق: <strong>" + U.money(space.rent[5]) + "</strong></li>" +
        "</ul>" +
        "<div>مجموعة كاملة: <strong>×2</strong> على الإيجار الأساسي</div>" +
        (owner ? "<div>المالك: <strong class='p" + (owner.index % 6) + "'>" + U.escape(owner.name) + "</strong>" + (rec.mortgaged ? " (مرهون)" : "") + "</div>" : "<div>المالك: <strong>البنك</strong></div>") +
        (rec.houses > 0 ? "<div>عدد المباني: <strong>" + (rec.houses === 5 ? "فندق" : rec.houses + " منزل") + "</strong></div>" : "") +
        "<div>قيمة الرهن: <strong>" + U.money(Math.floor(space.price / 2)) + "</strong></div>" +
        "<div>فك الرهن: <strong>" + U.money(Math.ceil(space.price * 0.55)) + "</strong></div>" +
        "</div>";
    } else if (space.type === "rail") {
      body.innerHTML =
        '<div class="mono-prop-head"><strong>' + U.escape(space.name) + "</strong></div>" +
        '<div class="mono-prop-body">' +
        (space.price ? "<div>السعر: <strong>" + U.money(space.price) + "</strong></div>" : "") +
        "<div>الإيجار:</div>" +
        "<ul>" +
        "<li>سكة واحدة: <strong>" + U.money(25) + "</strong></li>" +
        "<li>سكتين: <strong>" + U.money(50) + "</strong></li>" +
        "<li>ثلاث سكك: <strong>" + U.money(100) + "</strong></li>" +
        "<li>أربع سكك: <strong>" + U.money(200) + "</strong></li>" +
        "</ul>" +
        (owner ? "<div>المالك: <strong class='p" + (owner.index % 6) + "'>" + U.escape(owner.name) + "</strong>" + (rec.mortgaged ? " (مرهون)" : "") + "</div>" : "<div>المالك: <strong>البنك</strong></div>") +
        "<div>قيمة الرهن: <strong>" + U.money(Math.floor(space.price / 2)) + "</strong></div>" +
        "</div>";
    } else if (space.type === "utility") {
      body.innerHTML =
        '<div class="mono-prop-head"><strong>' + U.escape(space.name) + "</strong></div>" +
        '<div class="mono-prop-body">' +
        (space.price ? "<div>السعر: <strong>" + U.money(space.price) + "</strong></div>" : "") +
        "<div>الإيجار: <strong>4×</strong> مجموع النرد إذا مرفق واحد، <strong>10×</strong> إذا مرفقان</div>" +
        (owner ? "<div>المالك: <strong class='p" + (owner.index % 6) + "'>" + U.escape(owner.name) + "</strong>" + (rec.mortgaged ? " (مرهون)" : "") + "</div>" : "<div>المالك: <strong>البنك</strong></div>") +
        "<div>قيمة الرهن: <strong>" + U.money(Math.floor(space.price / 2)) + "</strong></div>" +
        "</div>";
    } else {
      body.innerHTML =
        '<div class="mono-prop-head"><strong>' + U.escape(space.name) + "</strong></div>" +
        '<div class="mono-prop-body">' +
        (space.icon ? "<div>" + space.icon + "</div>" : "") +
        "<div>" + U.escape(space.name) + "</div>" +
        "</div>";
    }

    BG.openDialog({
      title: "تفاصيل العقار",
      body,
      actions: [{ label: "إغلاق", value: "close" }],
    });
  }

  /* ------------------------------ العرض ------------------------------ */

  function posToRC(i) {
    if (i === 0) return [11, 11];
    if (i <= 9) return [11, 11 - i];
    if (i === 10) return [11, 1];
    if (i <= 19) return [21 - i, 1];
    if (i === 20) return [1, 1];
    if (i <= 29) return [1, i - 19];
    if (i === 30) return [1, 11];
    return [i - 29, 11];
  }

  function edgeClass(i) {
    if ([0, 10, 20, 30].includes(i)) return "corner";
    if (i < 10) return "bottom";
    if (i < 20) return "left";
    if (i < 30) return "top";
    return "right";
  }

  function drawBoard() {
    const board = document.createElement("div");
    board.className = "mono-board";

    SPACES.forEach((space, i) => {
      const [row, col] = posToRC(i);
      const edge = edgeClass(i);
      const rec = state.props[i];
      const owner = rec && rec.owner != null ? state.players[rec.owner] : null;
      const cell = document.createElement("div");
      cell.className = "mcell " + edge + (owner ? " owned" : "") + (space.type === "prop" ? " property" : " special");
      cell.dataset.space = String(i);
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
      cell.style.cursor = "pointer";
      if (owner) cell.style.setProperty("--owner", "var(--p" + (owner.index % 6) + ")");
      cell.title = space.name + (space.price ? " — " + U.money(space.price) : "") + (owner ? " — " + owner.name : "");
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        showPropertyDetails(i);
      }, { passive: false });

      if (space.type === "prop") {
        const band = document.createElement("span");
        band.className = "mcolor";
        band.style.background = GROUP_COLORS[space.group];
        cell.appendChild(band);
      }

      const label = document.createElement("span");
      label.className = "mname";
      label.textContent = space.short || space.name;
      cell.appendChild(label);

      if (space.price) {
        const price = document.createElement("span");
        price.className = "mprice";
        price.textContent = U.money(space.price);
        cell.appendChild(price);
      } else if (space.icon) {
        const icon = document.createElement("span");
        icon.className = "micon";
        icon.textContent = space.icon;
        cell.appendChild(icon);
      }

      if (rec && rec.houses > 0) {
        const houses = document.createElement("span");
        houses.className = "mhouses";
        if (rec.houses === 5) houses.textContent = "🏨";
        else houses.textContent = "🏠".repeat(rec.houses);
        cell.appendChild(houses);
      }
      if (rec && rec.mortgaged) {
        const m = document.createElement("span");
        m.className = "mmortgage";
        m.textContent = "⛔";
        cell.appendChild(m);
      }
      if (owner) {
        const dot = document.createElement("span");
        dot.className = "mowner";
        dot.style.background = "var(--p" + (owner.index % 6) + ")";
        cell.appendChild(dot);
      }

      const tokens = document.createElement("span");
      tokens.className = "mtokens";
      state.players.forEach((p) => {
        if (p.bankrupt || p.pos !== i) return;
        const t = document.createElement("span");
        t.className = "mtoken p" + (p.index % 6) + (state.current === p.index ? " active" : "") + (p.inJail && i === 10 ? " jailed" : "");
        t.setAttribute("data-fx-piece", "mp-" + p.index);
        t.setAttribute("data-fx-enter", "pop");
        t.textContent = TOKEN_GLYPHS[p.index % TOKEN_GLYPHS.length];
        t.title = p.name;
        tokens.appendChild(t);
      });
      cell.appendChild(tokens);

      board.appendChild(cell);
    });

    const center = document.createElement("div");
    center.className = "mcenter";
    center.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    const p = cur();
    center.innerHTML =
      '<div class="mlogo">MONOPOLY<span>نُبلاء المدينة</span></div>' +
      (p ? '<div class="mturn">دور <strong class="p' + (p.index % 6) + '">' + U.escape(p.name) + '</strong><small>' + U.money(p.money) + "</small></div>" : "") +
      '<div class="mdice">' +
      (state.dice ? BG.dieFace(state.dice[0]).outerHTML + BG.dieFace(state.dice[1]).outerHTML : '<span class="mdice-empty">ارمِ النرد</span>') +
      "</div>" +
      '<div class="mnotice">' + U.escape(state.notice || "") + "</div>" +
      (state.lastCard
        ? '<div class="mcard"><span>' + U.escape(state.lastCard.deck) + "</span><strong>" + U.escape(state.lastCard.title) + "</strong><small>" + U.escape(state.lastCard.text) + "</small></div>"
        : '<div class="mcard empty"><span>مركز المدينة</span><strong>اشترِ، ابنِ، وازدهر</strong><small>المجموعات اللونية الكاملة تضاعف الأجرة وتفتح البناء.</small></div>');
    board.appendChild(center);
    return board;
  }

  /* ----------------------------- حركة القطع ----------------------------- */

  function clearTokenTimers() {
    tokenTimers.forEach((id) => clearTimeout(id));
    tokenTimers = [];
  }

  /** أقصر مسار دائري بين مربعين (يتعامل مع المرور من نقطة البداية). */
  function tokenPath(from, to) {
    const forward = (to - from + 40) % 40;
    const backward = (from - to + 40) % 40;
    const path = [];
    if (!forward) return path;
    if (forward <= backward) {
      for (let i = 1; i <= forward; i++) path.push((from + i) % 40);
    } else {
      for (let i = 1; i <= backward; i++) path.push((from - i + 40) % 40);
    }
    return path;
  }

  /**
   * يحرّك قطع اللاعبين خطوة بخطوة بين المربعات بعد كل إعادة رسم،
   * مع صوت خطوة عند كل مربع ولمسة أخيرة عند الهبوط.
   */
  function animateBoardTokens(wrap) {
    const board = wrap.querySelector(".mono-board");
    if (!board) return;
    clearTokenTimers();
    const rects = new Map();
    board.querySelectorAll(".mcell[data-space]").forEach((cell) => {
      rects.set(Number(cell.dataset.space), cell.getBoundingClientRect());
    });
    const tokens = Array.from(wrap.querySelectorAll(".mtoken[data-fx-piece]"));
    if (!tokens.length) {
      tokenPositions = new Map();
      return;
    }
    const seen = new Set();
    tokens.forEach((token) => {
      const key = token.getAttribute("data-fx-piece") || "";
      const index = Number(key.slice(3));
      if (!Number.isFinite(index) || !state.players[index]) return;
      const player = state.players[index];
      seen.add(index);
      const previous = tokenPositions.get(index);
      tokenPositions.set(index, player.pos);
      if (!FX) return;

      if (previous === undefined) {
        FX.pop(token, { duration: 260 });
        return;
      }
      if (previous === player.pos) return;

      // السجن أو القفز المفاجئ: ظهور سريع بدل المشي حول اللوحة.
      if (player.inJail && player.pos === 10) {
        FX.pop(token, { duration: 320 });
        FX.sound("token");
        return;
      }

      const path = tokenPath(previous, player.pos);
      const startRect = rects.get(previous);
      const finalRect = rects.get(player.pos);
      if (!path.length || !startRect || !finalRect) {
        FX.pop(token, { duration: 260 });
        return;
      }

      const fx = finalRect.left + finalRect.width / 2;
      const fy = finalRect.top + finalRect.height / 2;
      const sx = startRect.left + startRect.width / 2 - fx;
      const sy = startRect.top + startRect.height / 2 - fy;
      const count = path.length;
      const stepMs = Math.max(48, Math.min(110, Math.round(920 / count)));
      const duration = stepMs * count;
      const frames = [{ offset: 0, transform: "translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) scale(1)" }];
      let fromRect = startRect;
      for (let i = 0; i < count; i++) {
        const toRect = rects.get(path[i]);
        if (!toRect) continue;
        const ax = (fromRect.left + fromRect.width / 2 + toRect.left + toRect.width / 2) / 2 - fx;
        const ay = (fromRect.top + fromRect.height / 2 + toRect.top + toRect.height / 2) / 2 - fy - 9;
        const tx = toRect.left + toRect.width / 2 - fx;
        const ty = toRect.top + toRect.height / 2 - fy;
        frames.push({
          offset: (i + 0.5) / count,
          transform: "translate(" + ax.toFixed(1) + "px," + ay.toFixed(1) + "px) rotate(" + (i % 2 ? -7 : 7) + "deg) scale(1.16)",
        });
        frames.push({
          offset: (i + 1) / count,
          transform: "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(0deg) scale(1)",
        });
        fromRect = toRect;
      }

      token.classList.add("fx-piece-moving");
      const anim = FX.animate(token, frames, { duration, easing: "linear" });
      const done = () => token.classList.remove("fx-piece-moving");
      if (anim) anim.finished.then(done).catch(done);
      else done();

      FX.sound("move");
      const every = count > 7 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        if (i % every && i !== count - 1) continue;
        const when = Math.round(stepMs * (i + 0.9));
        tokenTimers.push(setTimeout(() => { if (FX) FX.sound("step"); }, when));
      }
      tokenTimers.push(setTimeout(() => {
        if (!FX) return;
        FX.sound("token");
        FX.pop(token, { duration: 220 });
      }, duration + 16));
    });
    tokenPositions.forEach((_, key) => {
      if (!seen.has(key)) tokenPositions.delete(key);
    });
  }

  function actionHTML() {
    const p = cur();
    if (!p) return "";
    if (state.over) return '<div class="maction-empty">انتهت اللعبة.</div>';

    if (state.phase === "buy") {
      const space = SPACES[state.pendingBuy];
      const can = p.money >= space.price;
      return (
        '<div class="buy-box">' +
        '<span class="buy-eyebrow">عقار متاح</span>' +
        '<h3>' + U.escape(space.name) + "</h3>" +
        '<div class="buy-meta"><span>السعر ' + U.money(space.price) + "</span><span>" +
        (space.type === "rail" ? "الأجرة 25–200$ حسب عدد السكك" : space.type === "utility" ? "الأجرة حسب مجموع النرد" : "أجرتك الحالية " + U.money(space.rent ? space.rent[0] : 0)) +
        "</span></div>" +
        '<div class="maction-row">' +
        '<button class="bg-btn primary" data-act="buy" ' + (can ? "" : "disabled") + ">🏷 شراء بـ" + U.money(space.price) + "</button>" +
        '<button class="bg-btn" data-act="skipBuy">تخطّي</button>' +
        "</div>" +
        (can ? "" : '<p class="maction-warn">لا تملك مالًا كافيًا. يمكنك البيع أو الرهن من إدارة العقارات.</p>') +
        "</div>"
      );
    }

    if (p.inJail && state.phase !== "over") {
      if (state.phase === "end") {
        return (
          '<div class="jail-box">' +
          '<span class="buy-eyebrow">🔒 ما زلت في السجن</span>' +
          '<p>' + U.escape(state.notice || "انتهت محاولتك لهذا الدور.") + "</p>" +
          '<div class="maction-row"><button class="bg-btn primary" data-act="endTurn">إنهاء الدور ←</button></div>' +
          "</div>"
        );
      }
      return (
        '<div class="jail-box">' +
        '<span class="buy-eyebrow">🔒 أنت في السجن</span>' +
        '<p>المحاولة ' + Math.min(p.jailTurns + 1, 3) + " من 3. ارمِ المزدوج أو ادفع الغرامة.</p>" +
        '<div class="maction-row">' +
        '<button class="bg-btn primary" data-act="roll">🎲 ارمِ المزدوج</button>' +
        '<button class="bg-btn" data-act="payJail">ادفع ' + U.money(jailFine()) + "</button>" +
        (p.jailCards > 0 ? '<button class="bg-btn" data-act="useJailCard">🃏 استخدم البطاقة</button>' : "") +
        "</div>" +
        "</div>"
      );
    }

    if (state.phase === "roll" || state.phase === "moving") {
      return (
        '<div class="roll-box">' +
        '<span class="buy-eyebrow">' + (state.extraRoll ? "رمية إضافية" : "دورك الآن") + "</span>" +
        '<div class="maction-row"><button class="bg-btn primary big" data-act="roll">🎲 ارمِ النرد</button></div>' +
        '<p class="maction-hint">' + (state.extraRoll ? "رميت مزدوجًا — يمكنك الرمي مرة أخرى." : "حرّك قطعتك واستكشف المدينة.") + "</p>" +
        "</div>"
      );
    }

    return (
      '<div class="end-box">' +
      '<p class="maction-hint">' + U.escape(state.notice || "") + "</p>" +
      '<div class="maction-row"><button class="bg-btn primary" data-act="endTurn">إنهاء الدور ←</button></div>' +
      "</div>"
    );
  }

  function propertyManagerHTML() {
    const p = cur();
    const list = ownedList(p);
    if (!list.length) {
      return '<p class="muted-note">لا تملك عقارات بعد. اشترِ أول عقار لتظهر أدوات الإدارة.</p>';
    }
    return (
      '<div class="mprop-list">' +
      list
        .map(({ idx, rec, space }) => {
          const owner = state.players[rec.owner];
          const canB = canBuild(rec, idx);
          const houses = rec.houses === 5 ? "🏨 فندق" : rec.houses > 0 ? "🏠".repeat(rec.houses) : "—";
          return (
            '<div class="mprop-row' + (rec.mortgaged ? " mortgaged" : "") + '">' +
            '<span class="mprop-band" style="background:' + (space.group ? GROUP_COLORS[space.group] : GROUP_COLORS[space.type] || "#666") + '"></span>' +
            '<div class="mprop-main"><strong>' + U.escape(space.short || space.name) + "</strong><small>" + houses + (rec.mortgaged ? " · مرهون" : "") + "</small></div>" +
            '<div class="mprop-actions">' +
            (space.type === "prop" && canB ? '<button class="mini-btn" data-build="' + idx + '" title="بناء">＋</button>' : "") +
            (rec.houses > 0 ? '<button class="mini-btn warn" data-sell="' + idx + '" title="بيع بناء">−</button>' : "") +
            (!rec.mortgaged && rec.houses === 0 ? '<button class="mini-btn" data-mortgage="' + idx + '" title="رهن">⛔</button>' : "") +
            (rec.mortgaged ? '<button class="mini-btn good" data-unmortgage="' + idx + '" title="فك الرهن">✓</button>' : "") +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function sideHTML() {
    const p = cur();
    const alive = activePlayers();
    return (
      '<aside class="mono-side">' +
      '<section class="mpanel">' +
      '<div class="mpanel-head"><h2>اللاعبون</h2><span>الجولة ' + state.round + " · " + (p ? U.escape(p.name) : "—") + "</span></div>" +
      '<div class="mplayers">' +
      state.players
        .map((pl) => {
          const count = ownedList(pl).length;
          return (
            '<div class="mrow p' + (pl.index % 6) + (state.current === pl.index ? " active" : "") + (pl.bankrupt ? " bankrupt" : "") + '">' +
            '<span class="pdot">' + (pl.index + 1) + "</span>" +
            '<div class="mrow-main"><strong>' + U.escape(pl.name) + "</strong><small>" +
            (pl.bankrupt ? "مفلس" : U.money(pl.money) + " · " + count + " عقار" + (pl.inJail ? " · 🔒" : "") + (pl.jailCards ? " · 🃏" + pl.jailCards : "")) +
            "</small></div>" +
            '<span class="mrow-net">' + (pl.bankrupt ? "—" : U.money(netWorth(pl))) + "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div></section>" +

      '<section class="mpanel action-panel"><div class="mpanel-head"><h2>لوحة التحكم</h2><span>' +
      (state.phase === "buy" ? "شراء" : p && p.inJail ? "سجن" : state.phase === "roll" ? "رمي" : "إجراء") +
      "</span></div>" + actionHTML() +
      '<div class="maction-row secondary">' +
      '<button class="bg-btn small" data-act="toggleManage">🏠 إدارة العقارات</button>' +
      '<button class="bg-btn small" data-act="trade">🤝 تبادل</button>' +
      "</div></section>" +

      (state.showManage
        ? '<section class="mpanel"><div class="mpanel-head"><h2>عقاراتك</h2><span>' + U.money(p.money) + "</span></div>" + propertyManagerHTML() + "</section>"
        : "") +

      '<section class="mpanel legend-panel"><div class="mpanel-head"><h2>المفتاح</h2><span>مونوبولي</span></div>' +
      '<div class="mlegend">' +
      Object.keys(GROUP_NAMES).map((g) => '<span><i style="background:' + GROUP_COLORS[g] + '"></i>' + GROUP_NAMES[g] + "</span>").join("") +
      "</div>" +
      '<p class="muted-note">راتب الانطلاق 200$ — ثلاث رميات مزدوجة ترسلك للسجن — الأجرة تتضاعف مع المجموعة الكاملة.' +
      (state.config && state.config.freeParking ? " جائزة الموقف المجاني الحالية: " + U.money(state.pot || 0) + "." : "") +
      "</p>" +
      "</section>" +
      "</aside>"
    );
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuReserve(level) {
    if (level === "easy") return 320;
    if (level === "hard") return 90;
    return 180;
  }

  function cpuShouldBuy(p, idx) {
    const space = SPACES[idx];
    if (!space || space.price == null) return false;
    if (p.money < space.price) return false;
    if (p.money - space.price < cpuReserve(AI.level(p.level))) return false;
    if (space.type === "prop" && space.group) {
      const group = groupSpaces(space.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === p.index);
      if (group.length === groupSpaces(space.group).length - 1) return true;
    }
    return true;
  }

  function cpuBuildOnce(p) {
    const candidates = ownedList(p).filter(({ idx, rec }) => rec && rec.owner === p.index && canBuild(rec, idx));
    if (!candidates.length) return false;
    candidates.sort((a, b) => (b.rec.houses || 0) - (a.rec.houses || 0));
    const target = candidates[0];
    if (p.money - (target.space.house || 0) < cpuReserve(AI.level(p.level))) return false;
    buildHouse(target.idx);
    return true;
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 1.15);

    if (state.phase === "roll") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "roll") return;
        const p = cur();
        if (!p || p.bankrupt) { endTurn(); return; }
        if (p.inJail) {
          if (p.jailCards > 0) { useJailCard(); return; }
          if (p.money > 450 && p.jailTurns >= 1) { payJail(); return; }
        }
        onRoll();
      }, wait);
      return;
    }

    if (state.phase === "buy") {
      const idx = state.pendingBuy;
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "buy" || state.pendingBuy !== idx) return;
        if (cpuShouldBuy(cur(), idx)) buyProperty();
        else skipBuy();
      }, wait);
      return;
    }

    if (state.phase === "end") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "end") return;
        if (cpuBuildOnce(cur())) return;
        endTurn();
      }, wait);
    }
  }

  function render() {
    if (!rootRef) return;
    const wrap = document.createElement("div");
    wrap.className = "mono-layout";
    const boardWrap = document.createElement("div");
    boardWrap.className = "mono-board-wrap";
    const boardHead = document.createElement("div");
    boardHead.className = "board-head";
    boardHead.innerHTML =
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-monopoly"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">لوحة المدينة</span><strong>مونوبولي</strong></div>' +
      '<span class="board-head-hint">مرّر على أي مربع لرؤية سعره ومالكه</span>';
    boardWrap.appendChild(boardHead);
    boardWrap.appendChild(drawBoard());
    wrap.appendChild(boardWrap);

    boardWrap.addEventListener("click", (e) => {
      const cell = e.target.closest(".mcell");
      if (!cell) return;
      if (cell.classList.contains("mcenter")) return;
      const idx = Number(cell.dataset.space);
      if (Number.isNaN(idx)) return;
      e.stopPropagation();
      e.preventDefault();
      showPropertyDetails(idx);
    }, true);

    const side = document.createElement("div");
    side.innerHTML = sideHTML();
    wrap.appendChild(side);

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);
    animateBoardTokens(wrap);

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");

    wrap.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const act = btn.dataset.act;
        if (act === "roll") onRoll();
        else if (act === "endTurn") endTurn();
        else if (act === "buy") buyProperty();
        else if (act === "skipBuy") skipBuy();
        else if (act === "payJail") payJail();
        else if (act === "useJailCard") useJailCard();
        else if (act === "toggleManage") { state.showManage = !state.showManage; render(); }
        else if (act === "trade") openTrade();
      });
    });
    wrap.querySelectorAll("[data-build]").forEach((btn) => btn.addEventListener("click", () => buildHouse(Number(btn.dataset.build))));
    wrap.querySelectorAll("[data-sell]").forEach((btn) => btn.addEventListener("click", () => sellHouse(Number(btn.dataset.sell))));
    wrap.querySelectorAll("[data-mortgage]").forEach((btn) => btn.addEventListener("click", () => mortgage(Number(btn.dataset.mortgage))));
    wrap.querySelectorAll("[data-unmortgage]").forEach((btn) => btn.addEventListener("click", () => unmortgage(Number(btn.dataset.unmortgage))));
    syncCpu();
  }

  BG.register(game);
})();
