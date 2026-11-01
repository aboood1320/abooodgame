/* ==========================================================================
   تيكيت تو رايد — رحلة عبر المدن (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = {
    red: { name: "أحمر", hex: "#d95b5b", ink: "#2a0d0d" },
    orange: { name: "برتقالي", hex: "#e39144", ink: "#2c1606" },
    yellow: { name: "أصفر", hex: "#e8c84f", ink: "#2c2406" },
    green: { name: "أخضر", hex: "#54a76b", ink: "#06200f" },
    blue: { name: "أزرق", hex: "#4f8fd6", ink: "#06182b" },
    pink: { name: "وردي", hex: "#d879a8", ink: "#2b0a1b" },
    black: { name: "أسود", hex: "#3c4349", ink: "#f0f5f7" },
    white: { name: "أبيض", hex: "#e9edf0", ink: "#1b2429" },
    gray: { name: "رمادي", hex: "#9aa7ae", ink: "#10181c" },
    loco: { name: "قاطرة", hex: "#c89b3f", ink: "#241a05" },
  };
  const CARD_COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "black", "white"];
  const HAND_COLORS = CARD_COLORS.concat(["loco"]);

  const CITY_LIST = [
    { id: "calgary", name: "كالغاري", x: 300, y: 80, dy: -10 },
    { id: "winnipeg", name: "وينيبيغ", x: 440, y: 105, dy: -10 },
    { id: "seattle", name: "سياتل", x: 105, y: 105, dy: 16 },
    { id: "montreal", name: "مونتريال", x: 800, y: 135, dy: -10 },
    { id: "boston", name: "بوسطن", x: 855, y: 180, dy: 16 },
    { id: "toronto", name: "تورونتو", x: 715, y: 185, dy: 16 },
    { id: "minneapolis", name: "مينيابوليس", x: 500, y: 180, dy: 16 },
    { id: "portland", name: "بورتلاند", x: 95, y: 165, dy: 16 },
    { id: "newyork", name: "نيويورك", x: 805, y: 235, dy: 16 },
    { id: "detroit", name: "ديترويت", x: 630, y: 250, dy: -10 },
    { id: "chicago", name: "شيكاغو", x: 560, y: 265, dy: 16 },
    { id: "omaha", name: "أوماها", x: 460, y: 250, dy: -10 },
    { id: "saltlake", name: "سولت ليك", x: 245, y: 305, dy: -10 },
    { id: "denver", name: "دنفر", x: 345, y: 330, dy: -10 },
    { id: "kansascity", name: "كانساس سيتي", x: 440, y: 320, dy: 16 },
    { id: "pittsburgh", name: "بيتسبرغ", x: 660, y: 300, dy: -10 },
    { id: "washington", name: "واشنطن", x: 750, y: 290, dy: 16 },
    { id: "sanfran", name: "سان فرانسيسكو", x: 80, y: 305, dy: 16 },
    { id: "stlouis", name: "سانت لويس", x: 530, y: 350, dy: 16 },
    { id: "nashville", name: "ناشفيل", x: 600, y: 390, dy: 16 },
    { id: "raleigh", name: "رالي", x: 705, y: 360, dy: -10 },
    { id: "lasvegas", name: "لاس فيغاس", x: 155, y: 370, dy: -10 },
    { id: "santafe", name: "سانتا في", x: 330, y: 420, dy: 16 },
    { id: "oklahoma", name: "أوكلاهوما سيتي", x: 425, y: 390, dy: -10 },
    { id: "losangeles", name: "لوس أنجلوس", x: 100, y: 420, dy: 16 },
    { id: "atlanta", name: "أتلانتا", x: 645, y: 440, dy: 16 },
    { id: "phoenix", name: "فينيكس", x: 180, y: 465, dy: 16 },
    { id: "dallas", name: "دالاس", x: 435, y: 465, dy: -10 },
    { id: "charleston", name: "تشارلستون", x: 715, y: 425, dy: -10 },
    { id: "elpaso", name: "إل باسو", x: 300, y: 505, dy: 16 },
    { id: "houston", name: "هيوستن", x: 460, y: 525, dy: 16 },
    { id: "neworleans", name: "نيو أورلينز", x: 520, y: 490, dy: 16 },
    { id: "miami", name: "ميامي", x: 750, y: 570, dy: -10 },
  ];
  const CITIES = {};
  CITY_LIST.forEach((c) => { CITIES[c.id] = c; });

  const ROUTES = [
    ["seattle", "portland", 1, "gray"],
    ["seattle", "calgary", 5, "gray"],
    ["portland", "sanfran", 5, "green"],
    ["sanfran", "losangeles", 3, "pink"],
    ["sanfran", "saltlake", 5, "orange"],
    ["losangeles", "lasvegas", 2, "gray"],
    ["losangeles", "phoenix", 3, "gray"],
    ["losangeles", "elpaso", 6, "orange", -28],
    ["lasvegas", "saltlake", 3, "orange"],
    ["phoenix", "elpaso", 3, "gray"],
    ["phoenix", "santafe", 3, "gray"],
    ["elpaso", "santafe", 2, "gray"],
    ["elpaso", "dallas", 4, "red"],
    ["elpaso", "houston", 4, "pink"],
    ["dallas", "houston", 1, "gray"],
    ["dallas", "oklahoma", 2, "gray"],
    ["houston", "neworleans", 3, "gray"],
    ["santafe", "denver", 2, "gray"],
    ["santafe", "oklahoma", 3, "blue"],
    ["denver", "saltlake", 3, "yellow"],
    ["denver", "kansascity", 4, "black"],
    ["denver", "omaha", 4, "pink"],
    ["omaha", "kansascity", 1, "gray"],
    ["kansascity", "stlouis", 2, "blue"],
    ["stlouis", "chicago", 2, "green"],
    ["chicago", "omaha", 4, "pink"],
    ["chicago", "detroit", 3, "gray"],
    ["detroit", "pittsburgh", 2, "gray"],
    ["pittsburgh", "washington", 2, "gray"],
    ["pittsburgh", "newyork", 2, "green"],
    ["newyork", "boston", 2, "yellow"],
    ["newyork", "washington", 2, "black"],
    ["washington", "raleigh", 2, "gray"],
    ["raleigh", "atlanta", 2, "gray"],
    ["atlanta", "charleston", 2, "gray"],
    ["charleston", "miami", 4, "pink"],
    ["atlanta", "nashville", 1, "gray"],
    ["nashville", "stlouis", 2, "gray"],
    ["nashville", "pittsburgh", 3, "yellow"],
    ["neworleans", "atlanta", 4, "yellow"],
    ["neworleans", "nashville", 2, "gray"],
    ["kansascity", "minneapolis", 4, "red"],
    ["minneapolis", "chicago", 3, "red"],
    ["minneapolis", "omaha", 2, "gray"],
    ["minneapolis", "winnipeg", 4, "gray"],
    ["winnipeg", "calgary", 4, "gray"],
    ["chicago", "pittsburgh", 3, "white"],
    ["detroit", "toronto", 3, "gray"],
    ["toronto", "montreal", 2, "gray"],
    ["montreal", "newyork", 3, "blue"],
    ["montreal", "boston", 2, "gray"],
    ["toronto", "boston", 2, "gray"],
    ["toronto", "chicago", 3, "gray", 24],
  ].map((r, i) => ({ id: "r" + i, a: r[0], b: r[1], length: r[2], color: r[3], curve: r[4] || 0 }));

  const ROUTE_POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };

  const TICKETS = [
    ["losangeles", "newyork", 21], ["seattle", "newyork", 22], ["sanfran", "atlanta", 17],
    ["portland", "nashville", 17], ["losangeles", "chicago", 16], ["denver", "miami", 20],
    ["calgary", "phoenix", 17], ["montreal", "neworleans", 19], ["seattle", "losangeles", 9],
    ["chicago", "santafe", 9], ["dallas", "newyork", 11], ["boston", "miami", 12],
    ["winnipeg", "houston", 15], ["toronto", "elpaso", 13], ["atlanta", "boston", 8],
    ["denver", "pittsburgh", 11], ["sanfran", "chicago", 11], ["portland", "phoenix", 13],
    ["dallas", "atlanta", 9], ["saltlake", "washington", 12], ["kansascity", "miami", 15],
    ["minneapolis", "neworleans", 12], ["calgary", "dallas", 14], ["montreal", "atlanta", 13],
    ["seattle", "denver", 8], ["losangeles", "elpaso", 6], ["newyork", "charleston", 6],
    ["chicago", "neworleans", 7], ["boston", "washington", 4], ["phoenix", "denver", 7],
    ["miami", "washington", 8], ["winnipeg", "dallas", 12], ["calgary", "losangeles", 13],
    ["toronto", "miami", 14], ["saltlake", "chicago", 10], ["seattle", "oklahoma", 12],
    ["portland", "denver", 9], ["montreal", "houston", 15], ["boston", "chicago", 10],
    ["atlanta", "newyork", 9], ["sanfran", "houston", 14], ["charleston", "stlouis", 8],
  ].map((t, i) => ({ id: "t" + i, a: t[0], b: t[1], points: t[2] }));

  const PLAYER_COLORS = ["#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8"];
  const TRAIN_SUPPLY = 45;

  let state = null;
  let rootRef = null;
  let apiRef = null;
  let aiRunner = null;

  const game = {
    id: "ticket-to-ride",
    name: "تيكيت تو رايد",
    en: "TICKET TO RIDE",
    icon: "🚂",
    accent: "#e0785a",
    cardClass: "card-ttr",
    tagline: "اربط المدن بخطوط القطار، وأكمل تذاكر وجهتك قبل الجميع.",
    players: "2–5",
    duration: "45–75 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayers: 3,

    options: {
      hint: "\u062e\u064a\u0627\u0631\u0627\u062a \u0642\u0648\u0627\u0646\u064a\u0646 \u0625\u0636\u0627\u0641\u064a\u0629.",
      defaults: { autoReveal: null },
      fields: [
        {
          key: "autoReveal",
          label: "المعلومات السرية (أونلاين)",
          type: "seg",
          choices: [
            { value: null, label: "حسب الإعدادات" },
            { value: true, label: "إظهار تلقائي" },
            { value: false, label: "إخفاء تلقائي" },
          ],
          hint: "«حسب الإعدادات» يتبع خيار المعلومات السرية في نافذة الإعدادات الرئيسية. الإظهار التلقائي يفتح تذاكرك مع زر للإخفاء.",
        },
      ],
      summary(options) {
        return BG.autoRevealLabel(options.autoReveal);
      },
    },

    rules: {
      goal: "اجمع أكبر عدد من النقاط ببناء خطوط القطار بين المدن وإكمال تذاكر الوجهة. تُضاف نقاط التذاكر في نهاية اللعبة، وتُخصم قيمة التذكرة غير المكتملة.",
      facts: [["نهاية اللعبة", "عند وصول لاعب إلى قطارين أو أقل"], ["البطاقات", "8 ألوان + قاطرات"], ["أطول مسار", "+10 نقاط"], ["القطارات لكل لاعب", "45"]],
      components: [
        "خريطة أمريكا الشمالية مبسّطة تضم 33 مدينة و53 مسار قطار بأطوال وألوان مختلفة.",
        "بطاقات قطارات من 8 ألوان، بالإضافة إلى القاطرات التي تعمل كلون لأي مسار.",
        "5 بطاقات مكشوفة بجانب رزمة السحب، و45 قطارًا لكل لاعب.",
        "تذاكر وجهة سرّية تربط مدينتين وتُحتسب نقاطها في نهاية اللعبة.",
      ],
      setup: [
        "يُخلط كامل رزمة بطاقات القطارات، وتُوزع 4 بطاقات لكل لاعب، ثم تُكشف 5 بطاقات بجانب الرزمة.",
        "يُوزع على كل لاعب 45 قطارًا. في النسخة الرقمية الرمز يعرض العدد المتبقي.",
        "يسحب كل لاعب 3 تذاكر وجهة ويحتفظ بما لا يقل عن تذكرتين، ثم تُعاد الباقية أسفل الرزمة.",
        "يبدأ اللاعب الأول، ثم يتناوب اللاعبون باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>في دورك اختر إجراءً واحدًا:</strong> اسحب بطاقتين، أو اسحب تذاكر، أو استحوذ على مسار، أو مرّر الدور.",
        "<strong>سحب البطاقات:</strong> اضغط على إحدى البطاقات المكشوفة أو على رزمة السحب. اسحب بطاقتين، ثم ينتهي دورك. إذا سحبت قاطرة مكشوفة فتكفي وحدها وينتهي الدور.",
        "<strong>الاستحواذ على مسار:</strong> اضغط على المسار على الخريطة. ادفع عددًا من البطاقات يساوي طول المسار، بشرط أن تكون من لون المسار أو قاطرات. المسار الرمادي يقبل أي لون واحد.",
        "<strong>النقاط:</strong> مسار من 1 = نقطة، 2 = نقطتان، 3 = 4، 4 = 7، 5 = 10، 6 = 15 نقطة.",
        "<strong>تذاكر الوجهة:</strong> يمكنك سحب 3 تذاكر في دورك والاحتفاظ بواحدة على الأقل، ثم ينتهي دورك. لا يمكنك سحب تذاكر وأنت في منتصف سحب بطاقات القطارات.",
        "<strong>القطارات:</strong> كل مسار تستهلكه يقلّل قطاراتك المتبقية. لا يمكنك الاستحواذ على مسار أطول من عدد قطاراتك.",
        "<strong>نهاية اللعبة:</strong> عندما يصل لاعب إلى قطارين أو أقل، يكمل بقية اللاعبين دورًا أخيرًا لكل منهم، ثم تُحتسب التذاكر.",
      ],
      winning: "تُحتسب نقاط المسارات فور الاستحواذ عليها، ثم تُضاف نقاط التذاكر المكتملة وتُخصم غير المكتملة. اللاعب صاحب أطول مسار متصل يحصل على 10 نقاط إضافية. الأعلى نقاطًا يفوز، وعند التعادل يُفاضل بعدد التذاكر المكتملة.",
      notes: [
        "الخريطة مبسّطة وتحتوي مسارًا واحدًا بين كل مدينتين، ولا تحتوي مسارات مزدوجة أو محطات.",
        "تذاكر الوجهة وبطاقات اليد سرّية. تُخفى تلقائيًا عند انتقال الدور، وتُعرض فقط بعد الضغط على «إظهار».",
        "القاطرة المسحوبة من رزمة السحب تُحسب بطاقة عادية، أما القاطرة المكشوفة في السوق فتُنهي السحب فورًا.",
        "القاطرة تعمل كلون لأي مسار، ويمكن استخدام أكثر من قاطرة واحدة في المسار الواحد.",
        "في المسار الرمادي يجب أن تكون البطاقات الملوّنة من لون واحد، مع إمكانية إكمال العدد بقاطرات.",
        "في حال نفاد رزمة السحب تبقى البطاقات المكشوفة متاحة حتى تنفد، ويمكنك عندها سحب تذاكر أو تمرير الدور.",
        "تُمنح نقاط أطول مسار لكل لاعب متعادل في الطول، وفق قاعدة النسخة الأمريكية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        score: 0,
        trains: TRAIN_SUPPLY,
        hand: HAND_COLORS.reduce((o, c) => { o[c] = 0; return o; }, {}),
        tickets: [],
        pendingTickets: [],
        pathLen: 0,
        ticketsDone: 0,
      }));

      const deck = [];
      CARD_COLORS.forEach((c) => { for (let i = 0; i < 12; i++) deck.push(c); });
      for (let i = 0; i < 14; i++) deck.push("loco");
      const shuffled = U.shuffle(deck);
      const market = [];
      for (let i = 0; i < 5; i++) market.push(shuffled.pop() || null);

      players.forEach((p) => { for (let i = 0; i < 4; i++) { const c = shuffled.pop(); if (c) p.hand[c]++; } });

      const routeOwners = {};
      ROUTES.forEach((r) => { routeOwners[r.id] = null; });

      state = {
        players,
        current: 0,
        phase: "tickets-init",
        deck: shuffled,
        market,
        routeOwners,
        ticketDeck: U.shuffle(TICKETS.map((t) => Object.assign({}, t))),
        ticketDiscard: [],
        drawsLeft: 0,
        ticketPromptOpen: false,
        finalRound: false,
        finalTurns: 0,
        finalJustTriggered: false,
        revealActive: false,
        revealOwner: null,
        notice: "اختيار تذاكر البداية...",
        over: false,
        turnCounter: 0,
      };

      players.forEach((p) => { p.pendingTickets = drawTicketCards(3); });

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get routes() { return ROUTES; },
          get cities() { return CITIES; },
          render, drawFromDeck, drawFaceUp, openClaim, openMidTickets, endTurn,
          isConnected, longestPath, finishScoring, paymentOptions, canAfford,
          drawTicketCards, returnTickets, totalCards, routeById,
        };
      }

      api.log("بدأت تيكيت تو رايد — <strong>" + players.length + "</strong> لاعبين، و45 قطارًا لكل لاعب.");
      render();
      openStartTickets(0);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.ticketPromptOpen = false;
          state.revealActive = false;
          state.revealOwner = null;
          state.market = Array.isArray(state.market) ? state.market : [];
          state.deck = Array.isArray(state.deck) ? state.deck : [];
          state.ticketDeck = Array.isArray(state.ticketDeck) ? state.ticketDeck : [];
          state.ticketDiscard = Array.isArray(state.ticketDiscard) ? state.ticketDiscard : [];
          state.players.forEach((player) => {
            player.pendingTickets = Array.isArray(player.pendingTickets) ? player.pendingTickets : [];
            player.tickets = Array.isArray(player.tickets) ? player.tickets : [];
          });
          render();
        },
        netSeat() {
          return state ? state.current : -1;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state || state.over) return;
          if (state.phase === "tickets-init" && !state.ticketPromptOpen) {
            const index = state.current;
            if (isLocalSeat(index) && !AI.isCpu(state.players[index])) openStartTickets(index);
            else render();
            return;
          }
          render();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
        },
      };
    },
  };

  /* ------------------------------ أدوات الحالة ------------------------------ */

  function cur() { return state.players[state.current]; }

  function autoRevealEnabled() {
    const opts = (apiRef && apiRef.options) || {};
    return BG.autoRevealEnabled(opts.autoReveal);
  }
  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function viewerSeat() {
    if (isOnline()) return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
    return state ? state.current : -1;
  }

  function viewerPlayer() {
    const index = viewerSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }
  function isLocalSeat(index) {
    const net = apiRef && apiRef.net;
    if (!net || !net.enabled) return true;
    return index === net.seat;
  }
  function cityName(id) { return CITIES[id] ? CITIES[id].name : id; }
  function routeById(id) { return ROUTES.find((r) => r.id === id); }
  function totalCards(p) { return HAND_COLORS.reduce((n, c) => n + (p.hand[c] || 0), 0); }
  function handColorCount(p, color) { return color === "loco" ? p.hand.loco : p.hand[color]; }

  function drawTicketCards(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!state.ticketDeck.length) {
        if (!state.ticketDiscard.length) break;
        state.ticketDeck = U.shuffle(state.ticketDiscard.splice(0));
      }
      const card = state.ticketDeck.pop();
      if (card) out.push(card);
    }
    return out;
  }

  function returnTickets(list) {
    list.forEach((t) => state.ticketDiscard.push(t));
  }

  function paymentOptions(p, route) {
    if (route.color === "gray") {
      const counts = CARD_COLORS
        .map((c) => ({ color: c, have: p.hand[c] || 0 }))
        .filter((x) => x.have > 0)
        .sort((a, b) => b.have - a.have);
      const out = [];
      const seen = new Set();
      counts.forEach(({ color, have }) => {
        const useColor = Math.min(have, route.length);
        const loco = route.length - useColor;
        if ((p.hand.loco || 0) >= loco) {
          const key = useColor + "-" + loco;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ color, useColor, loco });
          }
        }
      });
      if (out.length === 0 && (p.hand.loco || 0) >= route.length) {
        out.push({ color: "loco", useColor: 0, loco: route.length });
      }
      return out;
    }
    const useColor = Math.min(p.hand[route.color] || 0, route.length);
    const loco = route.length - useColor;
    if ((p.hand.loco || 0) >= loco) return [{ color: route.color, useColor, loco }];
    return [];
  }

  function canAfford(p, route) { return paymentOptions(p, route).length > 0; }

  /* ------------------------------ الاتصال والمسارات ------------------------------ */

  function isConnected(p, a, b) {
    if (a === b) return true;
    const adj = {};
    ROUTES.forEach((r) => {
      if (state.routeOwners[r.id] !== p.index) return;
      if (!adj[r.a]) adj[r.a] = [];
      if (!adj[r.b]) adj[r.b] = [];
      adj[r.a].push(r.b);
      adj[r.b].push(r.a);
    });
    const seen = new Set([a]);
    const queue = [a];
    while (queue.length) {
      const city = queue.shift();
      if (city === b) return true;
      (adj[city] || []).forEach((n) => {
        if (!seen.has(n)) { seen.add(n); queue.push(n); }
      });
    }
    return false;
  }

  function longestPath(p) {
    const edges = ROUTES.filter((r) => state.routeOwners[r.id] === p.index);
    if (!edges.length) return 0;
    const adj = {};
    edges.forEach((r) => {
      if (!adj[r.a]) adj[r.a] = [];
      if (!adj[r.b]) adj[r.b] = [];
      adj[r.a].push({ id: r.id, other: r.b, w: r.length });
      adj[r.b].push({ id: r.id, other: r.a, w: r.length });
    });
    const used = new Set();
    let best = 0;
    let ops = 0;
    function dfs(v, sum) {
      if (sum > best) best = sum;
      if (ops++ > 260000) return;
      const list = adj[v] || [];
      for (const e of list) {
        if (used.has(e.id)) continue;
        used.add(e.id);
        dfs(e.other, sum + e.w);
        used.delete(e.id);
        if (ops > 260000) return;
      }
    }
    Object.keys(adj).forEach((v) => { used.clear(); dfs(v, 0); });
    return best;
  }

  /* ------------------------------ سير الدور ------------------------------ */

  function addCard(p, color) { p.hand[color] = (p.hand[color] || 0) + 1; }

  function drawFromDeck() {
    if (state.over) return;
    if (state.phase !== "action" && state.phase !== "draw") { BG.toast("أكمل إجراءك الحالي أولًا.", "warn"); return; }
    if (!state.deck.length) { BG.toast("رزمة السحب فارغة — اسحب من البطاقات المكشوفة أو مرّر الدور.", "warn"); return; }
    const p = cur();
    const card = state.deck.pop();
    addCard(p, card);
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> سحب بطاقة من الرزمة." + (card === "loco" ? " (قاطرة)" : ""), card === "loco" ? "accent" : "");
    if (FX) {
      FX.sound("card");
      const meta = COLORS[card] || COLORS.gray;
      FX.after(() => {
        const from = rootRef && rootRef.querySelector(".ttr-deck");
        const to = rootRef && rootRef.querySelector(".ttr-banner");
        FX.flyCard(from || (rootRef && rootRef.querySelector(".ttr-market")), to, {
          color: meta.hex,
          ink: meta.ink,
          label: card === "loco" ? "🚂" : "▮",
        });
      }, 55);
    }
    // القاطرة المسحوبة من الرزمة لا تُنهي الدور — فقط القاطرة المكشوفة تفعل ذلك.
    finishDraw(false);
  }

  function drawFaceUp(index) {
    if (state.over) return;
    if (state.phase !== "action" && state.phase !== "draw") { BG.toast("أكمل إجراءك الحالي أولًا.", "warn"); return; }
    const card = state.market[index];
    if (!card) { BG.toast("هذه البطاقة لم تعد متاحة.", "warn"); return; }
    const p = cur();
    addCard(p, card);
    state.market[index] = state.deck.pop() || null;
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> سحب " + (card === "loco" ? "قاطرة مكشوفة" : "بطاقة " + COLORS[card].name + " مكشوفة") + ".", card === "loco" ? "accent" : "");
    if (FX) {
      FX.sound("card");
      const meta = COLORS[card] || COLORS.gray;
      FX.after(() => {
        const from = rootRef && rootRef.querySelector('.ttr-market-card[data-draw="' + index + '"]');
        const to = rootRef && rootRef.querySelector(".ttr-banner");
        FX.flyCard(from || (rootRef && rootRef.querySelector(".ttr-market")), to, {
          color: meta.hex,
          ink: meta.ink,
          label: card === "loco" ? "🚂" : "▮",
        });
      }, 55);
    }
    finishDraw(card === "loco");
  }

  function finishDraw(wasLoco) {
    if (state.phase === "draw") state.drawsLeft -= 1;
    else { state.phase = "draw"; state.drawsLeft = 1; }
    if (wasLoco) state.drawsLeft = 0;
    if (state.drawsLeft > 0) {
      state.notice = "اسحب بطاقة أخيرة. (القاطرة المكشوفة تُنهي السحب فورًا)";
      render();
      return;
    }
    state.notice = wasLoco ? "سحبت قاطرة — ينتهي دورك." : "اكتمل السحب — ينتهي دورك.";
    render();
    endTurn();
  }

  function endTurn() {
    if (state.over) return;
    if (state.phase === "tickets-init") return;
    if (state.finalRound) {
      if (state.finalJustTriggered) {
        state.finalJustTriggered = false;
      } else {
        state.finalTurns -= 1;
        if (state.finalTurns <= 0) { finishScoring(); return; }
      }
    }
    state.phase = "action";
    state.drawsLeft = 0;
    state.turnCounter++;
    state.revealActive = false;
    state.revealOwner = null;
    state.current = (state.current + 1) % state.players.length;
    state.notice = "دور " + state.players[state.current].name + " — اسحب بطاقات، أو استحوذ على مسار، أو اسحب تذاكر.";
    render();
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuShortestPath(a, b, p) {
    const dist = {};
    const prev = {};
    const open = new Set(Object.keys(CITIES));
    open.forEach((city) => { dist[city] = Infinity; });
    dist[a] = 0;

    while (open.size) {
      let best = null;
      open.forEach((city) => {
        if (best == null || dist[city] < dist[best]) best = city;
      });
      if (best == null || dist[best] === Infinity) break;
      open.delete(best);
      if (best === b) break;

      ROUTES.forEach((r) => {
        if (r.a !== best && r.b !== best) return;
        const other = r.a === best ? r.b : r.a;
        if (!open.has(other)) return;
        const blocked = (state.routeOwners[r.id] != null && state.routeOwners[r.id] !== p.index) || r.length > p.trains;
        const weight = r.length + (blocked ? 1000 : 0);
        if (dist[best] + weight < dist[other]) {
          dist[other] = dist[best] + weight;
          prev[other] = { city: best, route: r.id };
        }
      });
    }

    if (!isFinite(dist[b]) || dist[b] >= 1000) return null;
    const path = [];
    let city = b;
    while (prev[city]) {
      path.push(prev[city].route);
      city = prev[city].city;
    }
    return path;
  }

  function cpuTicketCost(ticket, p) {
    const path = cpuShortestPath(ticket.a, ticket.b, p);
    if (!path) return Infinity;
    return path.reduce((sum, id) => sum + (routeById(id) ? routeById(id).length : 0), 0);
  }

  function cpuTicketScore(ticket, p) {
    if (isConnected(p, ticket.a, ticket.b)) return 1000 + ticket.points;
    const cost = cpuTicketCost(ticket, p);
    if (!isFinite(cost)) return -500;
    return ticket.points * 1.35 - cost * 0.62;
  }

  function cpuPickStartTickets(tickets, p) {
    if (!tickets.length) return [];
    if (AI.level(p.level) === "easy" && tickets.length > 2) return U.shuffle(tickets.slice()).slice(0, 2);
    return tickets.slice().sort((a, b) => cpuTicketScore(b, p) - cpuTicketScore(a, p)).slice(0, 2);
  }

  function cpuPickMidTickets(tickets, p) {
    if (!tickets.length) return [];
    const budget = p.trains * 0.55 + 8;
    const good = tickets
      .filter((t) => !isConnected(p, t.a, t.b) && cpuTicketCost(t, p) <= budget)
      .sort((a, b) => cpuTicketScore(b, p) - cpuTicketScore(a, p));
    if (good.length) return good.slice(0, 1);
    return tickets.slice().sort((a, b) => cpuTicketScore(b, p) - cpuTicketScore(a, p)).slice(0, 1);
  }

  function cpuNetwork(p) {
    const cities = new Set();
    ROUTES.forEach((r) => {
      if (state.routeOwners[r.id] === p.index) {
        cities.add(r.a);
        cities.add(r.b);
      }
    });
    return cities;
  }

  function cpuNeededRoutes(p) {
    const needed = new Set();
    p.tickets.forEach((t) => {
      if (isConnected(p, t.a, t.b)) return;
      const path = cpuShortestPath(t.a, t.b, p);
      if (path) path.forEach((id) => needed.add(id));
    });
    return needed;
  }

  function cpuPaymentOption(p, route) {
    const options = paymentOptions(p, route);
    if (!options.length) return null;
    return options.slice().sort((a, b) => a.loco - b.loco || b.useColor - a.useColor)[0];
  }

  function cpuRouteScore(route, p, needed, network) {
    let score = ROUTE_POINTS[route.length] * 1.35;
    if (needed.has(route.id)) score += 24;
    if (network.has(route.a)) score += 6;
    if (network.has(route.b)) score += 6;
    if (network.has(route.a) && network.has(route.b)) score += 5;
    const option = cpuPaymentOption(p, route);
    if (option) score += 28 - option.loco * 5;
    if (route.length > p.trains - 4) score -= 22;
    return score;
  }

  function cpuPickRoute(p) {
    const needed = cpuNeededRoutes(p);
    const network = cpuNetwork(p);
    const candidates = ROUTES.filter((r) => {
      if (state.routeOwners[r.id] != null) return false;
      if (r.length > p.trains) return false;
      if (!canAfford(p, r)) return false;
      return needed.has(r.id) || network.has(r.a) || network.has(r.b) || ROUTE_POINTS[r.length] >= 7;
    });
    if (!candidates.length) return null;
    return AI.choose(candidates, (route) => cpuRouteScore(route, p, needed, network), p.level);
  }

  function cpuCardValue(card, p, needed) {
    if (card === "loco") return 20;
    let value = (p.hand[card] || 0) * 0.5;
    needed.forEach((id) => {
      const route = routeById(id);
      if (route && route.color === card) value += 2 + route.length;
    });
    return value;
  }

  function cpuPickMarket(p, needed) {
    const options = [];
    state.market.forEach((card, index) => {
      if (card) options.push({ index, card, value: cpuCardValue(card, p, needed) });
    });
    if (!options.length) return -1;
    const best = options.slice().sort((a, b) => b.value - a.value)[0];
    const level = AI.level(p.level);
    if (level === "easy") {
      if (!state.deck.length || Math.random() < 0.5) return best.index;
      return -1;
    }
    if (best.value >= 6 || !state.deck.length) return best.index;
    return -1;
  }

  function cpuTakeTurn() {
    const p = cur();
    if (!p) return;

    const route = cpuPickRoute(p);
    if (route) {
      const option = cpuPaymentOption(p, route);
      if (option && applyRouteClaim(p, route, option)) {
        endTurn();
        return;
      }
    }

    if (state.deck.length || state.market.some(Boolean)) {
      const index = cpuPickMarket(p, cpuNeededRoutes(p));
      if (index >= 0) drawFaceUp(index);
      else drawFromDeck();
      return;
    }

    if (p.trains > 12 && totalCards(p) >= 8 && state.ticketDeck.length + state.ticketDiscard.length > 0) {
      if (AI.chance(p.level, 0.15, 0.35, 0.5)) {
        openMidTickets();
        return;
      }
    }

    state.notice = "لا توجد بطاقات أو مسارات متاحة — يمرر الكمبيوتر دوره.";
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> مرّر الدور.", "warn");
    render();
    endTurn();
  }

  function syncCpu() {
    if (!aiRunner) return;
    if (!state || state.over) { aiRunner.clear(); return; }

    if (state.phase === "tickets-init") {
      const p = cur();
      if (!AI.isCpu(p)) { aiRunner.clear(); return; }
      if (!AI.autoAllowed(apiRef, p)) { aiRunner.clear(); return; }
      if (aiRunner.size > 0) return;
      const index = state.current;
      const kept = cpuPickStartTickets(p.pendingTickets.slice(), p);
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "tickets-init" || state.current !== index) return;
        finishStartTickets(index, kept);
      }, AI.delay(p.level, 0.9));
      return;
    }

    aiRunner.clear();
    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 1.05);

    if (state.phase === "draw") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "draw") return;
        if (!AI.isCpu(cur())) return;
        if (!state.deck.length && !state.market.some(Boolean)) {
          endTurn();
          return;
        }
        const index = cpuPickMarket(cur(), cpuNeededRoutes(cur()));
        if (index >= 0) drawFaceUp(index);
        else drawFromDeck();
      }, wait);
      return;
    }

    if (state.phase === "action") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "action") return;
        if (!AI.isCpu(cur())) return;
        cpuTakeTurn();
      }, wait);
    }
  }

  /* ------------------------------ الاستحواذ ------------------------------ */

  function applyRouteClaim(p, route, chosen) {
    if (!p || !route || !chosen) return false;
    if (state.routeOwners[route.id] != null) return false;
    if (chosen.useColor > 0) p.hand[chosen.color] -= chosen.useColor;
    if (chosen.loco > 0) p.hand.loco -= chosen.loco;
    state.routeOwners[route.id] = p.index;
    p.trains -= route.length;
    p.score += ROUTE_POINTS[route.length];
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> استحوذ على مسار " + U.escape(cityName(route.a)) + " ↔ " + U.escape(cityName(route.b)) + " (+" + ROUTE_POINTS[route.length] + ").", "good");
    if (p.trains <= 2 && !state.finalRound) {
      state.finalRound = true;
      state.finalTurns = state.players.length - 1;
      state.finalJustTriggered = true;
      apiRef.log("🚨 بقي لدى <strong>" + U.escape(p.name) + "</strong> " + p.trains + " قطارًا — جولة أخيرة لكل لاعب!", "warn");
    }
    state.notice = "استحوذت على المسار (+" + ROUTE_POINTS[route.length] + ").";
    if (FX) {
      FX.sound("train");
      FX.after(() => {
        const g = rootRef && rootRef.querySelector('.ttr-route[data-route="' + route.id + '"]');
        if (g) {
          const line = g.querySelector(".ttr-route-line") || g;
          FX.pop(line);
          FX.floatText(g, "+" + ROUTE_POINTS[route.length], "good");
        }
      }, 75);
    }
    return true;
  }

  function openClaim(routeId) {
    if (state.over) return;
    if (state.phase !== "action") { BG.toast("لا يمكنك الاستحواذ إلا في بداية دورك.", "warn"); return; }
    const route = routeById(routeId);
    if (!route) return;
    if (state.routeOwners[route.id] != null) { BG.toast("هذا المسار محجوز بالفعل.", "warn"); return; }
    const p = cur();
    if (route.length > p.trains) { BG.toast("لا تملك قطارات كافية لهذا المسار.", "warn"); return; }
    const options = paymentOptions(p, route);
    if (!options.length) {
      BG.toast("لا تملك البطاقات المطلوبة. تحتاج " + route.length + " من " + (route.color === "gray" ? "أي لون" : COLORS[route.color].name) + " أو قاطرات.", "warn");
      return;
    }

    let chosen = options[0];
    const body = BG.el("div", { class: "ttr-claim" });
    const renderBody = () => {
      const colorName = route.color === "gray" ? (chosen.color === "loco" ? "قاطرات فقط" : COLORS[chosen.color].name) : COLORS[route.color].name;
      const chips = [];
      if (chosen.useColor > 0) chips.push('<span class="ttr-chip" style="--c:' + COLORS[chosen.color].hex + ';--ink:' + COLORS[chosen.color].ink + '">' + COLORS[chosen.color].name + " ×" + chosen.useColor + "</span>");
      if (chosen.loco > 0) chips.push('<span class="ttr-chip loco">قاطرة ×' + chosen.loco + "</span>");
      const chosenIndex = Math.max(0, options.indexOf(chosen));
      body.innerHTML =
        '<div class="ttr-claim-head"><span class="ttr-claim-route">' + U.escape(cityName(route.a)) + " ↔ " + U.escape(cityName(route.b)) + "</span>" +
        '<div class="ttr-claim-meta"><span>الطول ' + route.length + "</span><span>النقاط +" + ROUTE_POINTS[route.length] + "</span><span>قطاراتك " + p.trains + "</span><span>" + colorName + "</span></div></div>" +
        (route.color === "gray" && options.length > 1
          ? '<label class="trade-field"><span>اللون المستخدم</span><select name="paycolor">' +
            options.map((o, i) => '<option value="' + i + '"' + (i === chosenIndex ? " selected" : "") + ">" + (o.color === "loco" ? "قاطرات فقط" : COLORS[o.color].name) + " (" + o.useColor + " + " + o.loco + " قاطرة)</option>").join("") +
            "</select></label>"
          : "") +
        '<div class="ttr-claim-pay">' + chips.join("") + "</div>" +
        '<p class="trade-note">ستُخصم البطاقات فور التأكيد، ويُسجّل المسار باسمك وتنتهي دورك.</p>';
      const sel = body.querySelector('[name="paycolor"]');
      if (sel) sel.addEventListener("change", () => { chosen = options[Number(sel.value)] || options[0]; renderBody(); });
    };
    renderBody();

    const dlg = BG.openDialog({
      title: "🚂 الاستحواذ على مسار",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "ادفع واستحوذ",
          primary: true,
          onClick: ({ close }) => {
            if (state.routeOwners[route.id] != null) { BG.toast("سبقك أحدهم إلى المسار.", "warn"); return; }
            applyRouteClaim(p, route, chosen);
            close();
            endTurn();
          },
        },
      ],
    });
    return dlg;
  }

  /* ------------------------------ التذاكر ------------------------------ */

  function ticketLine(t) {
    return '<div class="ttr-ticket"><div class="ttr-ticket-route"><span>' + U.escape(cityName(t.a)) + "</span><i>↔</i><span>" + U.escape(cityName(t.b)) + "</span></div><b>+" + t.points + "</b></div>";
  }

  function finishStartTickets(index, kept) {
    if (!state) return;
    const p = state.players[index];
    const tickets = p.pendingTickets.slice();
    const keptFinal = (kept && kept.length ? kept : tickets.slice(0, 2)).slice(0, tickets.length);
    p.tickets.push(...keptFinal.map((t) => Object.assign({}, t)));
    const returned = tickets.filter((t) => !keptFinal.some((k) => k.id === t.id));
    returnTickets(returned);
    p.pendingTickets = [];
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> اختار تذاكر بدايته (" + keptFinal.length + ").");
    if (FX) FX.sound("ticket");
    const next = index + 1;
    if (next < state.players.length) {
      openStartTickets(next);
    } else {
      state.ticketPromptOpen = false;
      state.phase = "action";
      state.current = 0;
      state.notice = "دور " + state.players[0].name + " — ابدأ بسحب البطاقات أو الاستحواذ على مسار.";
      apiRef.log("اكتمل اختيار التذاكر — تبدأ الرحلة!", "accent");
      render();
    }
  }

  function openStartTickets(index) {
    if (!state) return;
    const p = state.players[index];
    state.current = index;
    state.phase = "tickets-init";
    state.ticketPromptOpen = false;
    state.revealActive = false;
    state.revealOwner = null;
    state.notice = "اختيار تذاكر البداية — " + p.name + ".";
    render();

    if (AI.isCpu(p)) return;
    if (!isLocalSeat(index)) return;
    if (apiRef && apiRef.net && apiRef.net.boot) return;
    state.ticketPromptOpen = true;

    const tickets = p.pendingTickets.slice();
    const body = BG.el("div", { class: "ttr-ticket-pick" });
    body.innerHTML =
      '<p class="ttr-pass-note">مرّر الجهاز إلى <strong>' + U.escape(p.name) + "</strong>. اختر تذكرتين على الأقل، ثم أكّد. لن تُعرض التذاكر لبقية اللاعبين.</p>" +
      '<div class="ttr-ticket-list">' +
      tickets.map((t) => '<label class="ttr-ticket-option"><input type="checkbox" value="' + t.id + '" checked />' + ticketLine(t) + "</label>").join("") +
      "</div>" +
      '<p class="trade-note">التذكرة غير المكتملة في النهاية تخصم قيمتها من نقاطك.</p>';

    let kept = tickets.slice(0, 2);
    const dlg = BG.openDialog({
      title: "🎫 تذاكر البداية — " + p.name,
      body,
      actions: [
        {
          label: "تأكيد التذاكر",
          primary: true,
          onClick: ({ close }) => {
            const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
            if (checked.length < 2) { BG.toast("اختر تذكرتين على الأقل.", "warn"); return; }
            kept = checked;
            close("confirm");
          },
        },
      ],
    });

    dlg.promise.then((value) => {
      if (value !== "confirm") kept = tickets.slice(0, 2);
      finishStartTickets(index, kept);
    });
  }

  function openMidTickets() {
    if (state.over) return;
    if (state.phase !== "action") { BG.toast("لا يمكنك سحب تذاكر أثناء سحب البطاقات.", "warn"); return; }
    const p = cur();
    const tickets = drawTicketCards(3);
    if (!tickets.length) { BG.toast("لا توجد تذاكر متبقية.", "warn"); return; }
    if (AI.isCpu(p)) {
      const kept = cpuPickMidTickets(tickets, p);
      p.tickets.push(...kept.map((t) => Object.assign({}, t)));
      returnTickets(tickets.filter((t) => !kept.some((k) => k.id === t.id)));
      apiRef.log("<strong>" + U.escape(p.name) + "</strong> احتفظ بـ" + kept.length + " تذكرة وجهة جديدة.", "accent");
      state.notice = "احتفظ الكمبيوتر بـ" + kept.length + " تذكرة — ينتهي دوره.";
      render();
      endTurn();
      return;
    }
    const body = BG.el("div", { class: "ttr-ticket-pick" });
    body.innerHTML =
      '<p class="ttr-pass-note">اسحب تذاكر جديدة. يجب الاحتفاظ بتذكرة واحدة على الأقل، ثم ينتهي دورك.</p>' +
      '<div class="ttr-ticket-list">' +
      tickets.map((t) => '<label class="ttr-ticket-option"><input type="checkbox" value="' + t.id + '" />' + ticketLine(t) + "</label>").join("") +
      "</div>";
    let kept = [];
    const dlg = BG.openDialog({
      title: "🎫 تذاكر إضافية — " + p.name,
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "احتفظ بالتذاكر",
          primary: true,
          onClick: ({ close }) => {
            const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
            if (checked.length < 1) { BG.toast("اختر تذكرة واحدة على الأقل.", "warn"); return; }
            kept = checked;
            close("confirm");
          },
        },
      ],
    });
    dlg.promise.then((value) => {
      if (value === "confirm") {
        p.tickets.push(...kept.map((t) => Object.assign({}, t)));
        const returned = tickets.filter((t) => !kept.some((k) => k.id === t.id));
        returnTickets(returned);
        apiRef.log("<strong>" + U.escape(p.name) + "</strong> سحب " + kept.length + " تذكرة وجهة جديدة.", "accent");
        state.notice = "احتفظت بـ" + kept.length + " تذكرة — ينتهي دورك.";
        if (FX) {
          FX.sound("ticket");
          FX.after(() => FX.floatText(rootRef && rootRef.querySelector(".ttr-banner"), "+" + kept.length + " تذاكر", "good"), 60);
        }
        render();
        endTurn();
      } else {
        returnTickets(tickets);
        render();
      }
    });
  }

  /* ------------------------------ النهاية ------------------------------ */

  function finishScoring() {
    if (state.over) return;
    state.phase = "over";
    state.over = true;
    state.revealActive = false;
    state.revealOwner = null;
    const ticketDetails = [];
    state.players.forEach((p) => {
      let ticketScore = 0;
      let done = 0;
      p.tickets.forEach((t) => {
        const ok = isConnected(p, t.a, t.b);
        t.done = ok;
        if (ok) { done++; ticketScore += t.points; }
        else ticketScore -= t.points;
      });
      p.score = Math.max(0, p.score + ticketScore);
      p.ticketsDone = done;
      p.pathLen = longestPath(p);
      ticketDetails.push({ p, ticketScore, done });
    });

    let bestLen = 0;
    state.players.forEach((p) => { if (p.pathLen > bestLen) bestLen = p.pathLen; });
    if (bestLen > 0) {
      const winners = state.players.filter((p) => p.pathLen === bestLen);
      winners.forEach((p) => { p.score += 10; p.longest = true; });
      apiRef.log("🏅 أطول مسار: <strong>" + winners.map((p) => U.escape(p.name)).join(" و") + "</strong> بطول " + bestLen + " قطارًا (+10 لكل لاعب).", "accent");
    }

    ticketDetails.forEach(({ p, ticketScore, done }) => {
      apiRef.log("<strong>" + U.escape(p.name) + "</strong>: " + done + " من " + p.tickets.length + " تذكرة مكتملة (" + (ticketScore >= 0 ? "+" : "") + ticketScore + ").", ticketScore >= 0 ? "good" : "warn");
    });

    const sorted = state.players.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.ticketsDone !== a.ticketsDone) return b.ticketsDone - a.ticketsDone;
      return b.pathLen - a.pathLen;
    });
    const winner = sorted[0];
    const standings = sorted.map((p) => ({
      name: p.name,
      value: p.score + " نقطة · " + p.ticketsDone + " تذكرة" + (p.longest ? " · أطول مسار" : ""),
    }));
    apiRef.log("انتهت الرحلة! الفائز <strong>" + U.escape(winner.name) + "</strong> برصيد " + winner.score + " نقطة.", "good");
    render();
    if (FX) FX.win();
    apiRef.gameOver({
      icon: "🚂",
      title: "وصل القطار إلى المحطة",
      text: "تُحتسب نقاط المسارات والتذاكر وأطول مسار متصل. الفائز صاحب أعلى رصيد.",
      winner: winner.name + " — " + winner.score + " نقطة",
      standings,
    });
  }

  /* ------------------------------ العرض ------------------------------ */

  function routeGeometry(route) {
    const a = CITIES[route.a];
    const b = CITIES[route.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let cx = (a.x + b.x) / 2;
    let cy = (a.y + b.y) / 2;
    if (route.curve) {
      const nx = -dy / len;
      const ny = dx / len;
      cx += nx * route.curve;
      cy += ny * route.curve;
    }
    return { a, b, cx, cy, len };
  }

  function routePath(route) {
    const g = routeGeometry(route);
    if (!route.curve) return "M" + g.a.x + " " + g.a.y + " L" + g.b.x + " " + g.b.y;
    return "M" + g.a.x + " " + g.a.y + " Q" + g.cx + " " + g.cy + " " + g.b.x + " " + g.b.y;
  }

  function routeMidpoint(route) {
    const g = routeGeometry(route);
    if (!route.curve) return { x: (g.a.x + g.b.x) / 2, y: (g.a.y + g.b.y) / 2 };
    // نقطة منتصف منحنى تربيعي
    const x = 0.25 * g.a.x + 0.5 * g.cx + 0.25 * g.b.x;
    const y = 0.25 * g.a.y + 0.5 * g.cy + 0.25 * g.b.y;
    return { x, y };
  }

  function routeCars(route) {
    const g = routeGeometry(route);
    const count = Math.max(1, route.length);
    const cars = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      let x;
      let y;
      let dx;
      let dy;
      if (route.curve) {
        const mt = 1 - t;
        x = mt * mt * g.a.x + 2 * mt * t * g.cx + t * t * g.b.x;
        y = mt * mt * g.a.y + 2 * mt * t * g.cy + t * t * g.b.y;
        dx = 2 * mt * (g.cx - g.a.x) + 2 * t * (g.b.x - g.cx);
        dy = 2 * mt * (g.cy - g.a.y) + 2 * t * (g.b.y - g.cy);
      } else {
        x = g.a.x + (g.b.x - g.a.x) * t;
        y = g.a.y + (g.b.y - g.a.y) * t;
        dx = g.b.x - g.a.x;
        dy = g.b.y - g.a.y;
      }
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      cars.push({ x, y, angle });
    }
    return cars;
  }

  function trainCarsSVG(route, fill) {
    return routeCars(route).map((car) =>
      '<g class="ttr-car" transform="translate(' + car.x.toFixed(1) + " " + car.y.toFixed(1) + ") rotate(" + car.angle.toFixed(1) + ')">' +
      '<rect x="-8.2" y="-5.4" width="16.4" height="10.8" rx="3.1" fill="' + fill + '" stroke="rgba(24,20,12,.72)" stroke-width="1.25"/>' +
      '<rect x="-5.4" y="-3.4" width="4.4" height="4.2" rx="1" fill="rgba(255,255,255,.32)"/>' +
      '<rect x="0.4" y="-3.4" width="4.4" height="4.2" rx="1" fill="rgba(255,255,255,.32)"/>' +
      '<circle cx="-4.6" cy="5.2" r="1.5" fill="#2a2418"/>' +
      '<circle cx="4.6" cy="5.2" r="1.5" fill="#2a2418"/>' +
      "</g>"
    ).join("");
  }

  function boardSVG() {
    const parts = [];
    parts.push('<svg viewBox="0 0 940 640" class="ttr-svg" role="img" aria-label="خريطة تيكيت تو رايد">');
    parts.push('<defs>' +
      '<radialGradient id="ttrSea" cx="42%" cy="34%" r="84%"><stop offset="0%" stop-color="#1d4d5b"/><stop offset="62%" stop-color="#123441"/><stop offset="100%" stop-color="#081c25"/></radialGradient>' +
      '<linearGradient id="ttrLand" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#eadfbe"/><stop offset="46%" stop-color="#e1d2aa"/><stop offset="100%" stop-color="#d3c097"/></linearGradient>' +
      '<linearGradient id="ttrSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4efdd"/><stop offset="100%" stop-color="#e5dcc2"/></linearGradient>' +
      '<linearGradient id="ttrLake" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8db7c2"/><stop offset="100%" stop-color="#5f94a4"/></linearGradient>' +
      '<filter id="ttrLandShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#031016" flood-opacity=".55"/></filter>' +
      '<pattern id="ttrHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(120,96,56,.08)" stroke-width="1"/></pattern>' +
      '</defs>');
    parts.push('<rect width="940" height="640" fill="url(#ttrSea)"/>');
    for (let i = 1; i < 9; i++) parts.push('<line x1="' + (i * 106) + '" y1="0" x2="' + (i * 106) + '" y2="640" stroke="rgba(198,226,232,.05)"/>');
    for (let i = 1; i < 7; i++) parts.push('<line x1="0" y1="' + (i * 92) + '" x2="940" y2="' + (i * 92) + '" stroke="rgba(198,226,232,.05)"/>');

    // اليابسة
    const land = "M118 36 L770 28 L834 58 L866 118 L856 162 L878 206 L852 262 L844 318 L812 366 L800 420 L792 486 L766 568 L744 600 L726 590 L734 542 L704 512 L660 508 L612 496 L566 518 L520 532 L478 540 L450 530 L436 494 L404 514 L368 562 L342 610 L304 604 L290 548 L256 522 L222 500 L184 488 L148 456 L104 442 L72 408 L84 366 L58 330 L76 296 L48 260 L70 220 L46 182 L84 150 L70 116 L90 74 Z";
    parts.push('<g filter="url(#ttrLandShadow)">');
    parts.push('<path d="' + land + '" fill="url(#ttrLand)" stroke="#9a855d" stroke-width="2.4" stroke-linejoin="round"/>');
    parts.push('<path d="' + land + '" fill="url(#ttrHatch)" stroke="none"/>');
    parts.push("</g>");
    // شمال كندا الجليدي
    parts.push('<path d="M118 36 L770 28 L834 58 L832 96 L700 74 L560 88 L420 70 L286 86 L170 70 L90 74 Z" fill="url(#ttrSnow)" opacity=".55"/>');

    // جبال الغرب
    const peaks = [
      [132, 210, 24], [166, 236, 30], [200, 206, 22], [238, 250, 32], [272, 226, 24],
      [152, 282, 26], [196, 300, 30], [240, 292, 22], [286, 318, 28], [132, 350, 22],
      [178, 372, 26], [224, 360, 30], [270, 388, 24], [318, 366, 20], [150, 420, 20],
    ];
    parts.push('<g class="ttr-mountains" fill="#b8a276" stroke="#8d7750" stroke-width="1.1">');
    peaks.forEach(([x, y, s]) => {
      parts.push('<path d="M' + (x - s) + " " + y + " L" + x + " " + (y - s * 0.82) + " L" + (x + s) + " " + y + ' Z" opacity=".55"/>');
      parts.push('<path d="M' + (x - s * 0.42) + " " + (y - s * 0.34) + " L" + x + " " + (y - s * 0.82) + " L" + (x + s * 0.42) + " " + (y - s * 0.34) + ' Z" fill="#f2ead6" stroke="none" opacity=".8"/>');
    });
    parts.push("</g>");

    // غابات
    parts.push('<g class="ttr-forests" fill="#8fa47a" opacity=".72">');
    [[330, 128], [352, 148], [312, 160], [372, 132], [398, 154], [344, 186], [640, 300], [668, 322], [700, 306], [724, 340], [654, 352], [690, 380], [730, 368], [612, 330], [560, 420], [590, 446], [530, 440], [548, 468]].forEach(([x, y]) => {
      parts.push('<path d="M' + x + " " + (y - 9) + " L" + (x + 5.4) + " " + (y + 1) + " L" + (x - 5.4) + " " + (y + 1) + ' Z"/>');
      parts.push('<rect x="' + (x - 0.9) + '" y="' + (y + 1) + '" width="1.8" height="4.4" fill="#7d6a48"/>');
    });
    parts.push("</g>");

    // البحيرات الكبرى
    parts.push('<g class="ttr-lakes" fill="url(#ttrLake)" stroke="#4f7d8c" stroke-width="1.4">');
    parts.push('<path d="M556 150 Q596 132 646 150 Q632 172 594 174 Q564 168 556 150 Z"/>');
    parts.push('<path d="M594 180 Q612 176 616 198 Q612 228 600 238 Q588 224 590 200 Z"/>');
    parts.push('<path d="M636 168 Q664 158 680 182 Q676 208 654 212 Q638 196 636 168 Z"/>');
    parts.push('<path d="M668 224 Q700 214 718 228 Q704 242 678 240 Q664 234 668 224 Z"/>');
    parts.push('<path d="M704 202 Q730 192 750 206 Q736 220 712 218 Q700 210 704 202 Z"/>');
    parts.push('<path d="M388 148 Q414 136 432 150 Q420 166 396 162 Q382 156 388 148 Z"/>');
    parts.push("</g>");
    parts.push('<text x="636" y="202" class="ttr-water-label">البحيرات الكبرى</text>');

    // الأنهار
    parts.push('<g class="ttr-rivers" fill="none" stroke="#6f9eac" stroke-width="2.2" stroke-linecap="round" opacity=".7">');
    parts.push('<path d="M505 206 Q494 248 508 282 Q522 322 512 356 Q502 398 520 438 Q530 470 522 502"/>');
    parts.push('<path d="M392 300 Q428 316 462 336 Q488 350 508 356"/>');
    parts.push('<path d="M690 272 Q664 300 640 320 Q616 340 604 368"/>');
    parts.push("</g>");

    // المسارات
    const p = cur();
    ROUTES.forEach((route) => {
      const owner = state.routeOwners[route.id];
      const color = COLORS[route.color] || COLORS.gray;
      const path = routePath(route);
      const ownerColor = owner != null ? state.players[owner].color : null;
      const affordable = !state.over && owner == null && state.phase === "action" && canAfford(p, route);
      parts.push('<g class="ttr-route' + (owner != null ? " claimed" : "") + (affordable ? " affordable" : "") + '" data-route="' + route.id + '">');
      parts.push('<path d="' + path + '" class="ttr-route-casing"/>');
      parts.push(trainCarsSVG(route, owner != null ? ownerColor : color.hex));
      parts.push('<path d="' + path + '" class="ttr-route-hit"/>');
      parts.push("</g>");
    });

    // المدن
    CITY_LIST.forEach((c) => {
      parts.push('<g class="ttr-city">' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="8.2" class="ttr-city-halo"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="5.2" class="ttr-city-dot"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="1.8" class="ttr-city-core"/>' +
        '<text x="' + c.x + '" y="' + (c.y + c.dy) + '" class="ttr-city-label">' + U.escape(c.name) + "</text>" +
        "</g>");
    });

    // مفتاح النقاط
    parts.push('<g class="ttr-key" transform="translate(20,508)">');
    parts.push('<rect x="0" y="0" width="196" height="112" rx="12"/>');
    parts.push('<text x="98" y="22" class="ttr-key-title">نقاط المسارات</text>');
    ["1 · 1", "2 · 2", "3 · 4", "4 · 7", "5 · 10", "6 · 15"].forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      parts.push('<text x="' + (26 + col * 58) + '" y="' + (50 + row * 26) + '" class="ttr-key-item">' + t + "</text>");
    });
    parts.push("</g>");

    // وردة البوصلة
    parts.push('<g class="ttr-compass" transform="translate(892,596)" aria-hidden="true">' +
      '<circle r="22" fill="rgba(8,24,32,.45)" stroke="rgba(240,200,121,.4)"/>' +
      '<path d="M0 -18 L5 0 L0 18 L-5 0 Z" fill="#f0c879"/>' +
      '<path d="M-18 0 L0 -5 L18 0 L0 5 Z" fill="rgba(240,200,121,.55)"/>' +
      "</g>");
    parts.push("</svg>");
    return parts.join("");
  }

  function handHTML(p) {
    const chips = HAND_COLORS.filter((c) => (p.hand[c] || 0) > 0).map((c) => {
      const meta = COLORS[c];
      return '<div class="ttr-hand-card" style="--c:' + meta.hex + ';--ink:' + meta.ink + '"><span>' + (c === "loco" ? "🚂" : "▮") + "</span><strong>" + (c === "loco" ? "قاطرة" : meta.name) + "</strong><b>×" + p.hand[c] + "</b></div>";
    }).join("");
    return '<div class="ttr-hand">' + (chips || '<p class="muted-note">لا تملك بطاقات بعد.</p>') + "</div>" +
      '<div class="ttr-hand-total">مجموع بطاقاتك: <strong>' + totalCards(p) + "</strong> · قاطرات: <strong>" + p.hand.loco + "</strong></div>";
  }

  function ticketsHTML(p) {
    if (!p.tickets.length) return '<p class="muted-note">لا تملك تذاكر.</p>';
    return '<div class="ttr-tickets">' + p.tickets.map((t) => {
      const ok = isConnected(p, t.a, t.b);
      return '<div class="ttr-ticket' + (ok ? " done" : "") + '">' +
        '<div class="ttr-ticket-route"><span>' + U.escape(cityName(t.a)) + "</span><i>↔</i><span>" + U.escape(cityName(t.b)) + "</span></div>" +
        '<div class="ttr-ticket-side"><b>' + t.points + "</b><small>" + (ok ? "متصل ✓" : "غير مكتمل") + "</small></div></div>";
    }).join("") + "</div>";
  }

  function secretHTML() {
    const p = viewerPlayer();
    if (!p) {
      return '<p class="muted-note">أنت مشاهد — بطاقات القطارات وتذاكر الوجهة سرّية ولا تُعرض على هذا الجهاز.</p>';
    }
    return '<div class="ttr-secret-section"><h4>بطاقات القطارات</h4>' + handHTML(p) + "</div>" +
      '<div class="ttr-secret-section"><h4>تذاكر الوجهة</h4>' + ticketsHTML(p) + "</div>";
  }

  function playerRow(p) {
    return '<div class="ttr-prow p' + (p.index % 6) + (state.current === p.index ? " active" : "") + '">' +
      '<span class="pdot" style="background:' + p.color + '">' + (p.index + 1) + "</span>" +
      '<div class="ttr-pmain"><strong>' + U.escape(p.name) + "</strong><small>🚂 " + p.trains + " · 🎫 " + p.tickets.length + " · 🃏 " + totalCards(p) + "</small></div>" +
      '<span class="ttr-pscore"><b>' + p.score + "</b><small>نقطة</small></span></div>";
  }

  function marketHTML() {
    const p = cur();
    const canDraw = state.phase === "action" || state.phase === "draw";
    const cards = state.market.map((c, i) => {
      if (!c) return '<div class="ttr-market-card empty">—</div>';
      const meta = COLORS[c];
      return '<button type="button" class="ttr-market-card' + (c === "loco" ? " loco" : "") + '" data-draw="' + i + '" ' + (canDraw && !state.over ? "" : "disabled") +
        ' style="--c:' + meta.hex + ';--ink:' + meta.ink + '" title="اسحب ' + (c === "loco" ? "قاطرة" : meta.name) + '">' +
        '<span>' + (c === "loco" ? "🚂" : "▮") + "</span><strong>" + (c === "loco" ? "قاطرة" : meta.name) + "</strong></button>";
    }).join("");
    return '<div class="ttr-market">' + cards + "</div>" +
      '<button type="button" class="ttr-deck' + (canDraw && state.deck.length ? "" : " disabled") + '" data-draw="deck" ' + (canDraw && state.deck.length && !state.over ? "" : "disabled") + '>' +
      '<span>🂠</span><strong>رزمة السحب</strong><small>' + state.deck.length + " بطاقة</small></button>";
  }

  function actionHTML() {
    if (state.over) return '<p class="muted-note">انتهت الرحلة.</p>';
    if (state.phase === "tickets-init") {
      return '<p class="ttr-pass-note">اختيار التذاكر جارٍ. أكمل النافذة لتستمر الرحلة.</p>';
    }
    if (state.phase === "draw") {
      const stuck = state.deck.length === 0 && !state.market.some(Boolean);
      return '<div class="ttr-draw-note"><span>🃏</span><p>تبقّت <strong>' + state.drawsLeft + "</strong> سحبة. اضغط بطاقة مكشوفة أو الرزمة.</p></div>" +
        '<div class="ttr-controls-row">' +
        (stuck
          ? '<button type="button" class="bg-btn" data-act="pass">لا توجد بطاقات — مرّر الدور</button>'
          : '<button type="button" class="bg-btn" data-act="tickets" disabled>🎫 سحب تذاكر</button>') +
        "</div>";
    }
    return '<div class="ttr-actions">' +
      '<button type="button" class="bg-btn" data-act="deck">🂠 اسحب من الرزمة</button>' +
      '<button type="button" class="bg-btn" data-act="tickets">🎫 اسحب تذاكر</button>' +
      '<button type="button" class="bg-btn ghost" data-act="pass">مرّر الدور</button>' +
      "</div>" +
      '<p class="ttr-hint">اختر مسارًا على الخريطة للاستحواذ عليه، أو اسحب بطاقتين من السوق. ' +
      (state.finalRound ? '<strong class="ttr-final">الجولة الأخيرة جارية!</strong>' : "") + "</p>";
  }

  function sideHTML() {
    const p = cur();
    const phaseLabel = state.over ? "انتهت" : state.phase === "tickets-init" ? "اختيار التذاكر" : state.phase === "draw" ? "سحب البطاقات" : state.finalRound ? "الجولة الأخيرة" : "دور اللاعب";
    return '<div class="ttr-banner">' +
      '<div class="ttr-banner-main"><span class="ttr-eyebrow">' + phaseLabel + '</span>' +
      '<strong class="p' + (state.current % 6) + '">' + (state.over ? "انتهت الرحلة" : U.escape(p.name)) + "</strong>" +
      '<small>' + (state.over ? "" : "نقاطك: " + p.score + " · قطاراتك: " + p.trains) + "</small></div>" +
      '<div class="ttr-banner-score"><b>' + (state.over ? "—" : p.score) + "</b><small>" + (state.finalRound && !state.over ? "جولة أخيرة" : "نقطة") + "</small></div>" +
      "</div>" +
      '<p class="ttr-notice">' + U.escape(state.notice || "") + "</p>" +
      '<section class="ttr-panel"><div class="ttr-panel-head"><h2>إجراءات الدور</h2><span>' + (state.deck.length) + " بطاقة في الرزمة</span></div>" +
      '<div class="ttr-controls">' + actionHTML() + "</div></section>" +
      '<section class="ttr-panel"><div class="ttr-panel-head"><h2>سوق البطاقات</h2><span>5 مكشوفة</span></div><div class="ttr-market-wrap">' + marketHTML() + "</div></section>" +
      '<section class="ttr-panel"><div class="ttr-panel-head"><h2>اللاعبون</h2><span>النقاط والقطارات</span></div>' + state.players.map(playerRow).join("") + "</section>";
  }

  function render() {
    if (!rootRef) return;
    const wrap = document.createElement("div");
    wrap.className = "ttr-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "ttr-board-wrap";
    const boardHead = document.createElement("div");
    boardHead.className = "board-head";
    boardHead.innerHTML =
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-ttr"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">خريطة القارات</span><strong>تيكيت تو رايد</strong></div>' +
      '<span class="board-head-hint">اختر مسارًا للاستحواذ عليه · القاطرات بديل عن أي لون</span>';
    const boardHint = document.createElement("div");
    boardHint.className = "ttr-board-hint";
    boardHint.textContent = "↔ اسحب الخريطة أفقيًا لقراءة أسماء المدن والمسارات";
    const boardScroll = document.createElement("div");
    boardScroll.className = "ttr-board-scroll";
    boardScroll.innerHTML = boardSVG();
    boardWrap.appendChild(boardHead);
    boardWrap.appendChild(boardHint);
    boardWrap.appendChild(boardScroll);
    wrap.appendChild(boardWrap);

    const side = document.createElement("aside");
    side.className = "ttr-side";
    side.innerHTML = sideHTML();
    wrap.appendChild(side);

    const p = viewerPlayer();
    const secret = BG.secretPanel({
      title: "🃏 يدك وتذاكرك",
      owner: p ? p.name : "مشاهد",
      hint: p
        ? "بطاقات قطاراتك وتذاكر وجهتك سرّية. تأكد أن الجهاز أمامك ثم اضغط «إظهار»."
        : "أنت تشاهد فقط — لا تُعرض بطاقات اللاعبين السرّية.",
      open: isOnline() && autoRevealEnabled(),
      autoKey: "ttr:" + (p ? p.index : "watch") + ":" + (state.turnCounter || 0),
      render: secretHTML,
      onToggle: (visible) => {
        state.revealActive = visible;
        state.revealOwner = visible && p ? p.index : null;
      },
    });
    secret.el.classList.add("ttr-secret");
    side.appendChild(secret.el);
    if (p && state.revealActive && state.revealOwner === p.index) secret.show();

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    const svg = boardWrap.querySelector(".ttr-svg");
    if (svg) {
      svg.addEventListener("click", (event) => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const g = event.target.closest("[data-route]");
        if (g) openClaim(g.dataset.route);
      });
    }

    side.querySelectorAll("[data-draw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over || AI.isCpu(cur())) return;
        if (btn.dataset.draw === "deck") drawFromDeck();
        else drawFaceUp(Number(btn.dataset.draw));
      });
    });
    side.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const act = btn.dataset.act;
        if (act === "deck") drawFromDeck();
        else if (act === "tickets") openMidTickets();
        else if (act === "pass") {
          state.notice = "مرّر " + cur().name + " دوره.";
          apiRef.log("<strong>" + U.escape(cur().name) + "</strong> مرّر الدور.", "warn");
          render();
          endTurn();
        }
      });
    });

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  BG.register(game);
})();
