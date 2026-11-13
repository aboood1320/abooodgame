/* ==========================================================================
   تيكيت تو رايد — رحلة عبر المدن
   محرّك كامل: قواعد، ذكاء اصطناعي، سجل، واجهة، وأونلاين
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;
  const ART = window.BGTtrArt;
  const BOARD = window.BGTtrBoard;

  const COLORS = BOARD.COLORS;
  const CARD_COLORS = BOARD.CARD_COLORS;
  const HAND_COLORS = BOARD.HAND_COLORS;
  const ROUTES = BOARD.ROUTES;
  const ROUTE_POINTS = BOARD.ROUTE_POINTS;
  const CITIES = BOARD.CITIES;
  const routeById = BOARD.routeById;
  const cityName = BOARD.cityName;

  const PLAYER_COLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d", "#b47cf0"];
  const TRAIN_SUPPLY = 45;
  const MAX_LOG = 90;

  let state = null;
  let rootRef = null;
  let apiRef = null;
  let aiRunner = null;
  const ui = {
    boardScroll: 0,
    handScroll: 0,
    logScroll: 0,
    centrality: null,
    centralityKey: "",
    futureNeed: null,
    futureNeedKey: "",
  };

  const game = {
    id: "ticket-to-ride",
    name: "تيكيت تو رايد",
    en: "TICKET TO RIDE",
    icon: "🚂",
    accent: "#d98a5a",
    cardClass: "card-ttr",
    tagline: "اربط المدن بخطوط القطار، وأكمل تذاكر وجهتك قبل الجميع.",
    players: "2–5",
    duration: "45–75 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayers: 3,

    rules: {
      goal: "اجمع أكبر عدد من النقاط ببناء خطوط القطار بين المدن وإكمال تذاكر الوجهة. تُضاف نقاط التذاكر المكتملة وتُخصم غير المكتملة في نهاية اللعبة، وقد يصبح الرصيد سالبًا.",
      facts: [
        ["نهاية اللعبة", "عندما يصل لاعب إلى قطارين أو أقل، يكمل الجميع دورًا أخيرًا"],
        ["البطاقات", "8 ألوان + 14 قاطرة (110 بطاقات)"],
        ["أطول مسار", "+10 نقاط لكل متعادل"],
        ["القطارات لكل لاعب", "45"],
      ],
      components: [
        "خريطة أمريكا الشمالية تضم 33 مدينة و65 مسار قطار بأطوال وألوان مختلفة، بينها مسارات مزدوجة متوازية.",
        "بطاقات قطارات من 8 ألوان (12 من كل لون) + 14 بطاقة قاطرة تعمل كلون لأي مسار.",
        "5 بطاقات مكشوفة بجانب رزمة السحب، و45 قطارًا لكل لاعب.",
        "42 تذكرة وجهة سرّية تربط مدينتين وتُحتسب نقاطها في نهاية اللعبة.",
      ],
      setup: [
        "تُخلط كامل رزمة بطاقات القطارات (110 بطاقات)، وتُوزع 4 بطاقات لكل لاعب، ثم تُكشف 5 بطاقات بجانب الرزمة.",
        "إذا ظهرت 3 قاطرات مكشوفة أو أكثر، تُستبدل البطاقات الخمسة فورًا بخمس بطاقات جديدة.",
        "يُوزع على كل لاعب 45 قطارًا. في النسخة الرقمية يظهر العدد المتبقي بجانب اسمه.",
        "يسحب كل لاعب 3 تذاكر وجهة ويحتفظ بما لا يقل عن تذكرتين، ثم تُعاد الباقية أسفل الرزمة.",
        "يبدأ اللاعب الأول، ثم يتناوب اللاعبون باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>في دورك اختر إجراءً واحدًا:</strong> اسحب بطاقتين، أو اسحب تذاكر، أو استحوذ على مسار، أو مرّر الدور عند تعذّر أي إجراء.",
        "<strong>سحب البطاقات:</strong> اضغط إحدى البطاقات المكشوفة أو رزمة السحب. اسحب بطاقتين، ثم ينتهي دورك. إذا سحبت قاطرة مكشوفة فتكفي وحدها وينتهي الدور.",
        "<strong>الاستحواذ على مسار:</strong> ادفع عددًا من البطاقات يساوي طول المسار؛ يجب أن تكون من لون المسار أو قاطرات. المسار الرمادي يقبل أي لون واحد. يمكن استخدام أكثر من قاطرة، ويمكنك اختيار تركيبة الدفع المناسبة.",
        "<strong>المسارات المزدوجة:</strong> لا يجوز للاعب نفسه الاستحواذ على المسارين. في مباراة لاعبين يُغلق المسار الثاني بمجرد الاستحواذ على الأول. في 3–5 لاعبين يمكن للاعب آخر الاستحواذ على المسار التوأم.",
        "<strong>السوق:</strong> إذا ظهرت 3 قاطرات مكشوفة أو أكثر، تُستبدل البطاقات الخمسة فورًا. تُعاد خلط البطاقات المتراكمة عند نفاد رزمة السحب.",
        "<strong>تذاكر الوجهة:</strong> يمكنك سحب 3 تذاكر في دورك والاحتفاظ بواحدة على الأقل، ثم ينتهي دورك. لا يمكنك سحب تذاكر أثناء سحب بطاقات القطارات.",
        "<strong>النقاط:</strong> مسار من 1 = نقطة، 2 = نقطتان، 3 = 4، 4 = 7، 5 = 10، 6 = 15 نقطة. تُضاف نقاط المسارات فور الاستحواذ.",
        "<strong>نهاية اللعبة:</strong> عندما يصل لاعب إلى قطارين أو أقل، يكمل بقية اللاعبين دورًا أخيرًا لكل منهم، ثم تُحتسب التذاكر. أصحاب أطول مسار متصل يحصلون على 10 نقاط.",
      ],
      winning: "اجمع نقاط المسارات + نقاط التذاكر المكتملة − قيمة التذاكر غير المكتملة + 10 نقاط لأطول مسار متصل. الأعلى رصيدًا يفوز، وعند التعادل يُفاضل بعدد التذاكر المكتملة ثم بطول أطول مسار. قد يصبح الرصيد سالبًا.",
      notes: [
        "الخريطة مبنية على نسخة تذكرة القطار الأمريكية: 33 مدينة ومسارات مزدوجة متوازية، ولا تحتوي محطات (المحطات خاصية نسخة أوروبا).",
        "تذاكر الوجهة وبطاقات اليد سرّية. تُخفى تلقائيًا عند انتقال الدور، وتُعرض فقط بعد الضغط على «إظهار».",
        "السجل يعرض السحوبات المكشوفة والاستحواذات والتذاكر المكتملة، ولا يكشف لون البطاقة المسحوبة من رزمة مغلقة.",
        "تذاكر الوجهة تُعلَن كمكتملة فور ربط المدن، لكن نقاطها تُضاف في الحساب النهائي فقط. تعرض الواجهة الرصيد المتوقع لو انتهت الرحلة الآن.",
        "في المسار الرمادي يجب أن تكون البطاقات الملوّنة من لون واحد، مع إمكانية إكمال العدد بقاطرات. القاطرة تعمل كلون لأي مسار.",
        "المسارات المزدوجة تُغلق كليًا في مباراة لاعبين بعد الاستحواذ على أحدها، وتُفتح للاعب آخر في 3–5 لاعبين.",
        "في حال نفاد رزمة السحب تُعاد خلط البطاقات المتراكمة، وتبقى البطاقات المكشوفة متاحة حتى تنفد.",
        "تُمنح نقاط أطول مسار لكل لاعب متعادل في الطول، وفق قاعدة النسخة الأمريكية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      ui.centrality = null;
      ui.futureNeed = null;
      ui.secretOpenKey = "";
      ui.boardScroll = { left: 0, top: 0 };
      ui.lastTurn = -1;
      ui.lastOver = false;

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        color: p.profileColor || PLAYER_COLORS[i % PLAYER_COLORS.length],
        score: 0,
        routeScore: 0,
        ticketScore: 0,
        trains: TRAIN_SUPPLY,
        hand: HAND_COLORS.reduce((o, c) => { o[c] = 0; return o; }, {}),
        tickets: [],
        pendingTickets: [],
        pathLen: 0,
        ticketsDone: 0,
        breakdown: null,
      }));

      const deck = [];
      CARD_COLORS.forEach((c) => { for (let i = 0; i < 12; i++) deck.push(c); });
      for (let i = 0; i < 14; i++) deck.push("loco");
      const shuffled = U.shuffle(deck);

      const routeOwners = {};
      ROUTES.forEach((r) => { routeOwners[r.id] = null; });

      state = {
        players,
        current: 0,
        phase: "tickets-init",
        deck: shuffled,
        trainDiscard: [],
        market: [],
        routeOwners,
        ticketDeck: U.shuffle(BOARD.TICKETS.map((t) => Object.assign({}, t))),
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
        winner: null,
        turnCounter: 0,
        marketResets: 0,
        log: [],
        anim: null,
        stats: { routes: 0, ticketsDrawn: 0, deckMixes: 0 },
      };

      for (let i = 0; i < 5; i++) state.market.push(drawTrainRaw());
      players.forEach((p) => { for (let i = 0; i < 4; i++) { const c = drawTrainRaw(); if (c) p.hand[c]++; } });
      players.forEach((p) => { p.pendingTickets = drawTicketCards(3); });

      exposeDebug();
      logEvent("بدأت تيكيت تو رايد — " + players.length + " لاعبين، و45 قطارًا لكل لاعب.", "accent", "🚂");
      resetMarketLocos();
      rootRef.addEventListener("click", handleClick);
      openStartTickets(0);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          normalizeState();
          state.ticketPromptOpen = false;
          state.revealActive = false;
          state.revealOwner = null;
          state.anim = null;
          render();
        },
        netSeat() {
          return state ? state.current : -1;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state || state.over) { render(); return; }
          if (state.phase === "tickets-init") {
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
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  /* ------------------------------ أدوات الحالة ------------------------------ */

  function cur() { return state && state.players ? state.players[state.current] : null; }

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

  function canAct() {
    if (!state || state.over) return false;
    if (state.phase !== "action" && state.phase !== "draw") return false;
    if (!isLocalSeat(state.current)) return false;
    if (AI.isCpu(cur())) return false;
    if (apiRef && apiRef.net && apiRef.net.boot) return false;
    return true;
  }

  /** يسمح للكمبيوتر (أو للمقعد المحلي البشري) بتنفيذ إجراء في الدور الحالي. */
  function mayPlayCurrent() {
    if (!state || state.over) return false;
    if (state.phase !== "action" && state.phase !== "draw") return false;
    const p = cur();
    if (!p) return false;
    if (AI.isCpu(p)) return AI.autoAllowed(apiRef, p);
    return canAct();
  }

  function totalCards(p) {
    return HAND_COLORS.reduce((n, c) => n + (p.hand[c] || 0), 0);
  }

  function handColorCount(p, color) {
    return color === "loco" ? (p.hand.loco || 0) : (p.hand[color] || 0);
  }

  function routeAvailable(route, p) {
    if (!route) return false;
    if (state.routeOwners[route.id] != null) return false;
    if (route.twin) {
      const twinOwner = state.routeOwners[route.twin];
      if (twinOwner != null) {
        if (state.players.length <= 2) return false;
        if (p && twinOwner === p.index) return false;
      }
    }
    return true;
  }

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

  function routePointsFor(p) {
    return ROUTES.reduce((sum, r) => sum + (state.routeOwners[r.id] === p.index ? ROUTE_POINTS[r.length] : 0), 0);
  }

  /* ------------------------------ السجل ------------------------------ */

  function logEvent(text, kind, icon, apiHtml) {
    if (!state) return;
    if (!Array.isArray(state.log)) state.log = [];
    state.log.push({
      t: String(text || ""),
      h: apiHtml || U.escape(text || ""),
      k: kind || "",
      i: icon || "•",
      turn: state.turnCounter || 0,
    });
    if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
    if (apiRef && apiRef.log) apiRef.log(apiHtml || U.escape(text || ""), kind);
  }

  function actor(p) {
    return "<strong>" + U.escape(p.name) + "</strong>";
  }

  /* ------------------------------ البطاقات ------------------------------ */

  function drawTrainRaw() {
    if (!state.deck.length) {
      if (!state.trainDiscard.length) return null;
      state.deck = U.shuffle(state.trainDiscard.splice(0));
      state.stats.deckMixes = (state.stats.deckMixes || 0) + 1;
      if (state.log) logEvent("أُعيد خلط بطاقات القطار المتراكمة في الرزمة.", "warn", "🔁");
    }
    return state.deck.pop() || null;
  }

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
    if (!Array.isArray(state.ticketDiscard)) state.ticketDiscard = [];
    list.forEach((t) => { if (t) state.ticketDiscard.push(t); });
  }

  function drawTrainAdd(p, color) {
    if (!color) return;
    p.hand[color] = (p.hand[color] || 0) + 1;
  }

  function resetMarketLocos() {
    if (!state) return 0;
    let resets = 0;
    let guard = 0;
    while (guard++ < 24) {
      const locos = state.market.filter((c) => c === "loco").length;
      if (locos < 3) break;
      state.market.forEach((c) => { if (c) state.trainDiscard.push(c); });
      state.market = [];
      for (let i = 0; i < 5; i++) state.market.push(drawTrainRaw());
      resets += 1;
    }
    if (resets) {
      state.marketResets = (state.marketResets || 0) + resets;
      logEvent("ظهرت 3 قاطرات مكشوفة — أُعيد خلط السوق بـ5 بطاقات جديدة.", "warn", "🔁");
      if (state.anim) state.anim.marketReset = true;
      else state.anim = { kind: "market", marketReset: true };
    }
    return resets;
  }

  /* ------------------------------ الدفع ------------------------------ */

  function paymentLabel(color, useColor, loco) {
    const parts = [];
    if (useColor > 0) parts.push(COLORS[color].name + " ×" + useColor);
    if (loco > 0) parts.push("قاطرة ×" + loco);
    return parts.length ? parts.join(" + ") : "قاطرات";
  }

  /**
   * تركيبات الدفع الممكنة: استخدم أكبر عدد من لون المسار أولًا، وأكمل الباقي
   * بقاطرات. المسار الرمادي يقبل أي لون واحد، وتظهر له تركيبة لكل لون متاح،
   * إضافة إلى خيار القاطرات فقط عند توفر العدد الكامل.
   */
  function paymentOptions(p, route) {
    if (!p || !route) return [];
    const length = route.length;
    const locoHave = p.hand.loco || 0;
    const out = [];
    const seen = new Set();
    const add = (color, useColor) => {
      const loco = length - useColor;
      if (useColor < 0 || loco < 0 || loco > locoHave) return;
      if (color === "loco") {
        if (useColor !== 0) return;
      } else if (useColor > (p.hand[color] || 0)) return;
      const key = color + ":" + useColor + ":" + loco;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        color,
        useColor,
        loco,
        key,
        label: paymentLabel(color, useColor, loco),
        remaining: color === "loco" ? 0 : (p.hand[color] || 0) - useColor,
      });
    };

    if (route.color === "gray") {
      CARD_COLORS.forEach((color) => {
        const have = Math.min(p.hand[color] || 0, length);
        if (have > 0) add(color, have);
      });
    } else {
      const have = Math.min(p.hand[route.color] || 0, length);
      if (have > 0) add(route.color, have);
    }
    add("loco", 0);

    out.sort((a, b) => {
      if (a.loco !== b.loco) return a.loco - b.loco;
      if (a.useColor !== b.useColor) return b.useColor - a.useColor;
      const ah = a.color === "loco" ? 0 : (p.hand[a.color] || 0);
      const bh = b.color === "loco" ? 0 : (p.hand[b.color] || 0);
      return bh - ah;
    });
    return out;
  }

  function canAfford(p, route) {
    return paymentOptions(p, route).length > 0;
  }

  /* ------------------------------ سير الدور ------------------------------ */

  function flyDrawnCard(fromSelector, card, isDeck) {
    if (!FX || !rootRef) return;
    const from = rootRef.querySelector(fromSelector);
    const to = rootRef.querySelector(".ttr-hand-anchor") || rootRef.querySelector(".ttr-secret");
    if (!from || !to) return;
    const meta = COLORS[card] || COLORS.gray;
    FX.flyCard(from, to, {
      color: isDeck ? "#2d4544" : meta.hex,
      ink: isDeck ? "#e8d7a8" : meta.ink,
      label: isDeck ? "🂠" : (card === "loco" ? "🚂" : "▮"),
    });
  }

  function drawFromDeck() {
    if (!state || state.over) return false;
    if (!mayPlayCurrent()) { BG.toast("انتظر دورك أولًا.", "warn"); return false; }
    if (state.phase !== "action" && state.phase !== "draw") { BG.toast("أكمل إجراءك الحالي أولًا.", "warn"); return false; }
    if (!state.deck.length && !state.trainDiscard.length) {
      BG.toast("رزمة السحب فارغة — اسحب من البطاقات المكشوفة أو مرّر الدور.", "warn");
      return false;
    }
    const p = cur();
    const card = drawTrainRaw();
    if (!card) {
      BG.toast("لا توجد بطاقات متاحة في الرزمة.", "warn");
      return false;
    }
    drawTrainAdd(p, card);
    if (!AI.isCpu(p)) flyDrawnCard(".ttr-deck", card, true);
    if (FX) FX.sound("card");
    logEvent(p.name + " سحب بطاقة سرّية من رزمة السحب.", "", "🂠");
    finishDraw(false);
    return true;
  }

  function drawFaceUp(index) {
    if (!state || state.over) return false;
    if (!mayPlayCurrent()) { BG.toast("انتظر دورك أولًا.", "warn"); return false; }
    if (state.phase !== "action" && state.phase !== "draw") { BG.toast("أكمل إجراءك الحالي أولًا.", "warn"); return false; }
    const card = state.market[index];
    if (!card) { BG.toast("هذه البطاقة لم تعد متاحة.", "warn"); return false; }
    const p = cur();
    drawTrainAdd(p, card);
    state.market[index] = drawTrainRaw();
    if (!AI.isCpu(p)) flyDrawnCard('.ttr-market-card[data-draw="' + index + '"]', card, false);
    else flyDrawnCard('.ttr-market-card[data-draw="' + index + '"]', card, false);
    const meta = COLORS[card] || COLORS.gray;
    logEvent(p.name + " سحب " + (card === "loco" ? "قاطرة مكشوفة" : "بطاقة " + meta.name + " مكشوفة") + ".", card === "loco" ? "accent" : "", card === "loco" ? "🚂" : "🃏");
    if (FX) FX.sound("card");
    resetMarketLocos();
    finishDraw(card === "loco");
    return true;
  }

  function finishDraw(wasLoco) {
    if (!state || state.over) return;
    if (state.phase === "draw") state.drawsLeft -= 1;
    else { state.phase = "draw"; state.drawsLeft = 1; }
    if (wasLoco) state.drawsLeft = 0;
    if (state.drawsLeft > 0) {
      state.notice = "اسحب بطاقة أخيرة. (القاطرة المكشوفة تُنهي السحب فورًا)";
      render();
      return;
    }
    state.notice = wasLoco ? "سحبت قاطرة — ينتهي دورك." : "اكتمل السحب — ينتهي دورك.";
    endTurn();
  }

  function passTurn(silent) {
    if (!state || state.over) return;
    if (!mayPlayCurrent()) return;
    if (state.phase === "draw" && (state.deck.length || state.trainDiscard.length || state.market.some(Boolean))) {
      BG.toast("لا يمكنك تمرير الدور قبل إكمال سحب البطاقات.", "warn");
      return;
    }
    const p = cur();
    logEvent(p.name + " مرّر الدور.", "warn", "⏭");
    state.notice = "مرّر " + p.name + " دوره.";
    endTurn();
  }

  /** هل ما زال هناك أي تقدّم ممكن؟ بطاقات سحب متاحة أو لاعب قادر على الاستحواذ. */
  function routeProgressPossible() {
    if (!state) return false;
    if (state.deck.length || state.trainDiscard.length || state.market.some(Boolean)) return true;
    return state.players.some((p) => ROUTES.some((r) =>
      state.routeOwners[r.id] == null &&
      r.length <= p.trains &&
      routeAvailable(r, p) &&
      paymentOptions(p, r).length > 0
    ));
  }

  function endTurn() {
    if (!state || state.over) return;
    if (state.phase === "tickets-init") return;
    if (!routeProgressPossible()) {
      state.notice = "نفدت بطاقات السحب ولا يمكن لأحد الاستحواذ على مسار — تُحتسب النقاط النهائية.";
      logEvent("نفدت بطاقات السحب وتعذّر الاستحواذ على أي مسار — انتهت الرحلة.", "warn", "🏁");
      finishScoring();
      return;
    }
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
    state.turnCounter += 1;
    state.revealActive = false;
    state.revealOwner = null;
    state.ticketPromptOpen = false;
    state.current = (state.current + 1) % state.players.length;
    const p = state.players[state.current];
    state.notice = state.finalRound
      ? "الجولة الأخيرة — دور " + p.name + "."
      : "دور " + p.name + " — اسحب بطاقات، أو استحوذ على مسار، أو اسحب تذاكر.";
    render();
  }

  /* ------------------------------ الاستحواذ ------------------------------ */

  function updateTicketProgress(p) {
    const newly = [];
    p.tickets.forEach((t) => {
      if (!t) return;
      const ok = isConnected(p, t.a, t.b);
      if (ok && !t.done) {
        t.done = true;
        t.doneTurn = state.turnCounter;
        newly.push(t);
      } else if (!ok) {
        t.done = false;
      }
    });
    p.ticketsDone = p.tickets.filter((t) => t.done).length;
    return newly;
  }

  function applyRouteClaim(p, route, chosen) {
    if (!state || !p || !route || !chosen) return false;
    if (state.over || state.routeOwners[route.id] != null) return false;
    if (!routeAvailable(route, p) || route.length > p.trains) return false;
    const useColor = Number(chosen.useColor) || 0;
    const loco = Number(chosen.loco) || 0;
    if (useColor + loco !== route.length) return false;
    if (useColor > 0 && chosen.color !== "loco" && (p.hand[chosen.color] || 0) < useColor) return false;
    if (loco > (p.hand.loco || 0)) return false;
    if (useColor > 0 && chosen.color === "loco") return false;

    if (useColor > 0) p.hand[chosen.color] -= useColor;
    if (loco > 0) p.hand.loco -= loco;
    state.routeOwners[route.id] = p.index;
    p.trains -= route.length;
    p.score += ROUTE_POINTS[route.length];
    p.routeScore = (p.routeScore || 0) + ROUTE_POINTS[route.length];
    state.stats.routes = (state.stats.routes || 0) + 1;

    const payText = paymentLabel(chosen.color, useColor, loco);
    logEvent(p.name + " استحوذ على مسار " + cityName(route.a) + " ↔ " + cityName(route.b) + " (" + route.length + " عربات، +" + ROUTE_POINTS[route.length] + ") بدفع " + payText + ".",
      "good", "🚂",
      actor(p) + " استحوذ على مسار " + U.escape(cityName(route.a)) + " ↔ " + U.escape(cityName(route.b)) + " (+" + ROUTE_POINTS[route.length] + ") بدفع " + U.escape(payText) + ".");

    const newly = updateTicketProgress(p);
    newly.forEach((t) => {
      logEvent(p.name + " أكمل تذكرة " + cityName(t.a) + " ↔ " + cityName(t.b) + " (+" + t.points + " تُحتسب في النهاية).", "accent", "🎫",
        actor(p) + " أكمل تذكرة " + U.escape(cityName(t.a)) + " ↔ " + U.escape(cityName(t.b)) + " (+" + t.points + ").");
    });

    let finalTriggered = false;
    if (p.trains <= 2 && !state.finalRound) {
      state.finalRound = true;
      state.finalTurns = state.players.length - 1;
      state.finalJustTriggered = true;
      finalTriggered = true;
      logEvent("بقي لدى " + p.name + " " + p.trains + " قطارًا — جولة أخيرة لكل لاعب!", "warn", "🚨",
        "🚨 بقي لدى " + actor(p) + " " + p.trains + " قطارًا — جولة أخيرة لكل لاعب!");
    }

    state.notice = "استحوذت على المسار (+" + ROUTE_POINTS[route.length] + ").";
    state.anim = {
      kind: "claim",
      routeId: route.id,
      points: ROUTE_POINTS[route.length],
      playerIndex: p.index,
      tickets: newly.map((t) => ({ a: t.a, b: t.b, points: t.points })),
      finalTriggered,
    };
    return true;
  }

  function paymentChips(chosen) {
    const chips = [];
    if (chosen.useColor > 0 && chosen.color !== "loco") {
      const meta = COLORS[chosen.color];
      chips.push('<span class="ttr-pay-chip" style="--c:' + meta.hex + ';--ink:' + meta.ink + '"><i></i>' + meta.name + " ×" + chosen.useColor + "</span>");
    }
    if (chosen.loco > 0) chips.push('<span class="ttr-pay-chip loco"><i></i>قاطرة ×' + chosen.loco + "</span>");
    return chips.join("") || '<span class="ttr-pay-chip">—</span>';
  }

  function openClaim(routeId) {
    if (!state || state.over) return null;
    if (!canAct()) { BG.toast("انتظر دورك أولًا.", "warn"); return null; }
    if (state.phase !== "action") { BG.toast("لا يمكنك الاستحواذ إلا في بداية دورك.", "warn"); return null; }
    const route = routeById(routeId);
    if (!route) return null;
    if (state.routeOwners[route.id] != null) { BG.toast("هذا المسار محجوز بالفعل.", "warn"); return null; }
    const p = cur();
    if (!routeAvailable(route, p)) {
      if (route.twin && state.routeOwners[route.twin] === p.index) BG.toast("لا يمكنك الاستحواذ على مساري المسار المزدوج نفسه.", "warn");
      else BG.toast("أُغلق هذا المسار المزدوج بعد استحواذ اللاعب الآخر على المسار المتوأم.", "warn");
      return null;
    }
    if (route.length > p.trains) { BG.toast("لا تملك قطارات كافية لهذا المسار.", "warn"); return null; }
    const options = paymentOptions(p, route);
    if (!options.length) {
      BG.toast("لا تملك البطاقات المطلوبة. تحتاج " + route.length + " من " + (route.color === "gray" ? "أي لون واحد" : COLORS[route.color].name) + " أو قاطرات.", "warn");
      return null;
    }

    const meta = COLORS[route.color] || COLORS.gray;
    let chosen = options[0];
    const body = BG.el("div", { class: "ttr-claim" });
    const renderBody = () => {
      const usedName = chosen.color === "loco" ? "قاطرات فقط" : COLORS[chosen.color].name;
      const afterColor = chosen.color === "loco" ? 0 : (p.hand[chosen.color] || 0) - chosen.useColor;
      body.innerHTML =
        '<div class="ttr-claim-head">' +
        '<div><span class="ttr-claim-kicker">الاستحواذ على مسار</span><strong class="ttr-claim-route">' + U.escape(cityName(route.a)) + " <i>↔</i> " + U.escape(cityName(route.b)) + "</strong></div>" +
        '<span class="ttr-claim-badge" style="--c:' + meta.hex + ';--ink:' + meta.ink + '"><i></i>' + (route.color === "gray" ? "أي لون" : meta.name) + "</span>" +
        "</div>" +
        '<div class="ttr-claim-stats">' +
        '<span><b>' + route.length + "</b><small>عربات</small></span>" +
        '<span><b>+' + ROUTE_POINTS[route.length] + "</b><small>نقاط</small></span>" +
        '<span><b>' + p.trains + "</b><small>قطاراتك</small></span>" +
        '<span><b>' + usedName + "</b><small>اللون</small></span>" +
        "</div>" +
        '<div class="ttr-pay-list" role="radiogroup" aria-label="طريقة الدفع">' +
        options.map((o, i) =>
          '<label class="ttr-pay-option' + (o === chosen ? " selected" : "") + '">' +
          '<input type="radio" name="ttr-pay" value="' + i + '"' + (o === chosen ? " checked" : "") + " />" +
          '<span class="ttr-pay-cards">' + paymentChips(o) + "</span>" +
          '<span class="ttr-pay-copy"><b>' + U.escape(o.label) + "</b><small>يتبقى لديك " + (o.color === "loco" ? 0 : (p.hand[o.color] || 0) - o.useColor) + " من هذا اللون · " + ((p.hand.loco || 0) - o.loco) + " قاطرة</small></span>" +
          '<span class="ttr-pay-check">✓</span>' +
          "</label>"
        ).join("") +
        "</div>" +
        '<p class="ttr-claim-summary" data-summary>الدفع: <strong>' + U.escape(chosen.label) + "</strong> · سيتبقى لديك " + afterColor + " من اللون و" + ((p.hand.loco || 0) - chosen.loco) + " قاطرة.</p>" +
        '<p class="trade-note">ستُخصم البطاقات فور التأكيد، ويُسجّل المسار باسمك وتنتهي دورك. القاطرة تعمل كلون لأي مسار.</p>';
      body.querySelectorAll('input[name="ttr-pay"]').forEach((input) => {
        input.addEventListener("change", () => {
          chosen = options[Number(input.value)] || options[0];
          renderBody();
        });
      });
    };
    renderBody();

    const dlg = BG.openDialog({
      title: "🚂 الاستحواذ على مسار",
      className: "ttr-claim-dialog",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "ادفع واستحوذ",
          primary: true,
          onClick: ({ close }) => {
            if (!state || state.over) { close(); return; }
            if (state.routeOwners[route.id] != null) { BG.toast("سبقك أحدهم إلى المسار.", "warn"); close(); return; }
            if (!canAct()) { BG.toast("لم يعد دورك.", "warn"); close(); return; }
            if (applyRouteClaim(p, route, chosen)) {
              close("claim");
              endTurn();
            } else {
              BG.toast("تعذّر إتمام الدفع. أعد المحاولة.", "warn");
            }
          },
        },
      ],
    });
    return dlg;
  }

  /* ------------------------------ التذاكر ------------------------------ */

  function ticketChoiceHTML(t, checked) {
    return '<label class="ttr-ticket-choice' + (checked ? " selected" : "") + '" data-ticket="' + U.escape(t.id) + '">' +
      '<input type="checkbox"' + (checked ? " checked" : "") + ' value="' + U.escape(t.id) + '" />' +
      '<span class="ttr-choice-tick">✓</span>' +
      ART.ticketCard(t, { aName: cityName(t.a), bName: cityName(t.b) }) +
      "</label>";
  }

  function finishStartTickets(index, kept) {
    if (!state || state.over) return;
    if (state.phase !== "tickets-init" || state.current !== index) return;
    const p = state.players[index];
    if (!p) return;
    const tickets = p.pendingTickets.slice();
    let chosen = (kept || []).filter((t) => tickets.some((x) => x.id === t.id));
    if (chosen.length < Math.min(2, tickets.length)) {
      tickets.forEach((t) => {
        if (chosen.length >= Math.min(2, tickets.length)) return;
        if (!chosen.some((x) => x.id === t.id)) chosen.push(t);
      });
    }
    if (!tickets.length) chosen = [];
    p.tickets.push(...chosen.map((t) => Object.assign({}, t, { done: false })));
    const returned = tickets.filter((t) => !chosen.some((k) => k.id === t.id));
    returnTickets(returned);
    p.pendingTickets = [];
    p.ticketsDone = p.tickets.filter((t) => t.done).length;
    state.ticketPromptOpen = false;
    logEvent(p.name + " اختار تذاكر بدايته (" + chosen.length + " تذاكر).", "accent", "🎫");
    if (FX) FX.sound("ticket");
    const next = index + 1;
    if (next < state.players.length) {
      openStartTickets(next);
    } else {
      state.phase = "action";
      state.current = 0;
      state.notice = "دور " + state.players[0].name + " — ابدأ بسحب البطاقات أو الاستحواذ على مسار.";
      logEvent("اكتمل اختيار التذاكر — تبدأ الرحلة!", "accent", "🚂");
      render();
    }
  }

  function openStartTickets(index) {
    if (!state || state.over) return;
    const p = state.players[index];
    if (!p) return;
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
    if (!p.pendingTickets.length) { finishStartTickets(index, []); return; }
    state.ticketPromptOpen = true;

    const tickets = p.pendingTickets.slice();
    const body = BG.el("div", { class: "ttr-ticket-pick" });
    body.innerHTML =
      '<p class="ttr-dialog-lead">مرّر الجهاز إلى <strong>' + U.escape(p.name) + "</strong>. اختر تذكرتين على الأقل، ثم أكّد. لن تُعرض التذاكر لبقية اللاعبين.</p>" +
      '<div class="ttr-ticket-grid">' + tickets.map((t) => ticketChoiceHTML(t, true)).join("") + "</div>" +
      '<div class="ttr-ticket-counter"><span>المحدد: <b data-count>0</b> من ' + tickets.length + "</span><span>الحد الأدنى تذكرتان</span></div>" +
      '<p class="ttr-dialog-note">التذكرة غير المكتملة في النهاية تخصم قيمتها من نقاطك. التذاكر الثلاث مقترحة — احتفظ بما يناسب شبكتك.</p>';

    const dlg = BG.openDialog({
      title: "🎫 تذاكر البداية — " + p.name,
      className: "ttr-ticket-dialog",
      body,
      actions: [
        {
          label: "تأكيد التذاكر",
          primary: true,
          onClick: ({ close }) => {
            const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
            if (checked.length < 2) { BG.toast("اختر تذكرتين على الأقل.", "warn"); return; }
            close("confirm");
          },
        },
      ],
    });
    dlg.dialog.dataset.ttrTickets = "start";

    const update = () => {
      const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')];
      body.querySelectorAll(".ttr-ticket-choice").forEach((label) => {
        const input = label.querySelector("input");
        label.classList.toggle("selected", input.checked);
      });
      const count = body.querySelector("[data-count]");
      if (count) count.textContent = String(checked.length);
      const primary = dlg.foot.querySelector("button.primary");
      if (primary) primary.disabled = checked.length < 2;
    };
    body.addEventListener("change", update);
    update();

    dlg.promise.then((value) => {
      if (!state || state.over || state.phase !== "tickets-init" || state.current !== index) return;
      let kept = tickets.slice(0, 2);
      if (value === "confirm") {
        kept = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
      }
      state.ticketPromptOpen = false;
      finishStartTickets(index, kept);
    });
  }

  function addTickets(p, list) {
    const added = list.map((t) => Object.assign({}, t, { done: false }));
    p.tickets.push(...added);
    const newly = updateTicketProgress(p);
    return { added, newly };
  }

  function openMidTickets() {
    if (!state || state.over) return;
    const p = cur();
    if (!p) return;
    const automated = AI.isCpu(p) && AI.autoAllowed(apiRef, p);
    if (!automated && !canAct()) { BG.toast("انتظر دورك أولًا.", "warn"); return; }
    if (state.phase !== "action") { BG.toast("لا يمكنك سحب تذاكر أثناء سحب البطاقات.", "warn"); return; }
    const tickets = drawTicketCards(3);
    if (!tickets.length) { BG.toast("لا توجد تذاكر متبقية.", "warn"); return; }
    state.stats.ticketsDrawn = (state.stats.ticketsDrawn || 0) + 1;

    if (AI.isCpu(p)) {
      const kept = cpuPickMidTickets(tickets, p);
      const result = addTickets(p, kept);
      returnTickets(tickets.filter((t) => !kept.some((k) => k.id === t.id)));
      logEvent(p.name + " احتفظ بـ" + result.added.length + " تذكرة وجهة جديدة.", "accent", "🎫");
      result.newly.forEach((t) => logEvent(p.name + " أكمل تذكرة جديدة " + cityName(t.a) + " ↔ " + cityName(t.b) + ".", "accent", "🎫"));
      state.notice = "احتفظ الكمبيوتر بـ" + result.added.length + " تذكرة — ينتهي دوره.";
      state.anim = { kind: "tickets", count: result.added.length, tickets: result.newly.map((t) => ({ a: t.a, b: t.b, points: t.points })) };
      endTurn();
      return;
    }

    const body = BG.el("div", { class: "ttr-ticket-pick" });
    body.innerHTML =
      '<p class="ttr-dialog-lead">اسحب تذاكر جديدة. يجب الاحتفاظ بتذكرة واحدة على الأقل، ثم ينتهي دورك.</p>' +
      '<div class="ttr-ticket-grid">' + tickets.map((t) => ticketChoiceHTML(t, false)).join("") + "</div>" +
      '<div class="ttr-ticket-counter"><span>المحدد: <b data-count>0</b> من ' + tickets.length + "</span><span>يمكنك الاحتفاظ بأكثر من تذكرة</span></div>" +
      '<p class="ttr-dialog-note">التذاكر التي لا تحتفظ بها تعود إلى أسفل رزمة التذاكر. التذكرة المكتملة تُعلن فورًا وتُحتسب نقاطها في النهاية.</p>';

    const dlg = BG.openDialog({
      title: "🎫 تذاكر إضافية — " + p.name,
      className: "ttr-ticket-dialog",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "احتفظ بالتذاكر",
          primary: true,
          onClick: ({ close }) => {
            const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
            if (checked.length < 1) { BG.toast("اختر تذكرة واحدة على الأقل.", "warn"); return; }
            close("confirm");
          },
        },
      ],
    });
    dlg.dialog.dataset.ttrTickets = "mid";

    const update = () => {
      const checked = [...body.querySelectorAll('input[type="checkbox"]:checked')];
      body.querySelectorAll(".ttr-ticket-choice").forEach((label) => {
        const input = label.querySelector("input");
        label.classList.toggle("selected", input.checked);
      });
      const count = body.querySelector("[data-count]");
      if (count) count.textContent = String(checked.length);
    };
    body.addEventListener("change", update);

    dlg.promise.then((value) => {
      if (!state || state.over || state.phase !== "action") return;
      if (value === "confirm") {
        const kept = [...body.querySelectorAll('input[type="checkbox"]:checked')].map((x) => tickets.find((t) => t.id === x.value)).filter(Boolean);
        if (!kept.length) { returnTickets(tickets); render(); return; }
        const result = addTickets(p, kept);
        returnTickets(tickets.filter((t) => !kept.some((k) => k.id === t.id)));
        logEvent(p.name + " سحب " + result.added.length + " تذكرة وجهة جديدة.", "accent", "🎫");
        result.newly.forEach((t) => logEvent(p.name + " أكمل تذكرة " + cityName(t.a) + " ↔ " + cityName(t.b) + " (+" + t.points + " تُحتسب في النهاية).", "accent", "🎫"));
        state.notice = "احتفظت بـ" + result.added.length + " تذكرة — ينتهي دورك.";
        state.anim = { kind: "tickets", count: result.added.length, tickets: result.newly.map((t) => ({ a: t.a, b: t.b, points: t.points })) };
        if (FX) FX.sound("ticket");
        endTurn();
      } else {
        returnTickets(tickets);
        state.notice = "أُلغي سحب التذاكر — ما زال دورك.";
        render();
      }
    });
    return dlg;
  }

  /* ------------------------------ النهاية ------------------------------ */

  function finishScoring() {
    if (!state || state.over) return;
    state.phase = "over";
    state.over = true;
    state.revealActive = false;
    state.revealOwner = null;
    state.ticketPromptOpen = false;
    state.drawsLeft = 0;

    state.players.forEach((p) => {
      const routeScore = routePointsFor(p);
      let ticketScore = 0;
      let done = 0;
      p.tickets.forEach((t) => {
        const ok = isConnected(p, t.a, t.b);
        t.done = ok;
        if (ok) { done += 1; ticketScore += t.points; }
        else ticketScore -= t.points;
      });
      p.routeScore = routeScore;
      p.ticketScore = ticketScore;
      p.ticketsDone = done;
      p.score = routeScore + ticketScore;
      p.pathLen = longestPath(p);
      p.longest = false;
      p.breakdown = {
        route: routeScore,
        tickets: ticketScore,
        done,
        totalTickets: p.tickets.length,
        longest: 0,
        score: p.score,
      };
    });

    let bestLen = 0;
    state.players.forEach((p) => { if (p.pathLen > bestLen) bestLen = p.pathLen; });
    if (bestLen > 0) {
      const winners = state.players.filter((p) => p.pathLen === bestLen);
      winners.forEach((p) => {
        p.score += 10;
        p.longest = true;
        p.breakdown.longest = 10;
        p.breakdown.score = p.score;
      });
      logEvent("أطول مسار: " + winners.map((p) => p.name).join(" و") + " بطول " + bestLen + " عربة (+10 لكل لاعب).", "accent", "🏅");
    }

    state.players.forEach((p) => {
      const b = p.breakdown;
      logEvent(p.name + ": " + b.route + " من المسارات، " + (b.tickets >= 0 ? "+" : "") + b.tickets + " من التذاكر (" + b.done + "/" + b.totalTickets + ")" + (b.longest ? "، +10 أطول مسار" : "") + " = " + p.score + " نقطة.",
        p.score >= 0 ? "good" : "warn", "🧮");
    });

    const sorted = state.players.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.ticketsDone !== a.ticketsDone) return b.ticketsDone - a.ticketsDone;
      return b.pathLen - a.pathLen;
    });
    const winner = sorted[0];
    state.winner = winner.index;
    state.notice = "انتهت الرحلة — الفائز " + winner.name + " برصيد " + winner.score + " نقطة.";
    const standings = sorted.map((p) => ({
      name: p.name,
      value: p.score + " نقطة · " + p.ticketsDone + "/" + p.tickets.length + " تذكرة · " + p.routeScore + " مسار · " + (p.ticketScore >= 0 ? "+" : "") + p.ticketScore + " تذاكر" + (p.longest ? " · أطول مسار +10" : ""),
    }));

    logEvent("انتهت الرحلة! الفائز " + winner.name + " برصيد " + winner.score + " نقطة.", "good", "🏆",
      "انتهت الرحلة! الفائز " + actor(winner) + " برصيد " + winner.score + " نقطة.");

    let tone = "win";
    if (isOnline()) {
      if (Number.isInteger(apiRef.net.seat) && apiRef.net.seat >= 0 && winner.index !== apiRef.net.seat) tone = "lose";
    } else {
      const humans = state.players.filter((p) => !p.isCpu);
      if (humans.length === 1 && winner.isCpu) tone = "lose";
    }

    state.anim = { kind: "over", winner: winner.index };
    render();
    if (apiRef && apiRef.gameOver) {
      apiRef.gameOver({
        icon: "🚂",
        tone,
        title: tone === "lose" ? "وصل القطار متأخرًا" : "وصل القطار إلى المحطة",
        text: "تُحتسب نقاط المسارات والتذاكر وأطول مسار متصل. الفائز صاحب أعلى رصيد.",
        winner: winner.name + " — " + winner.score + " نقطة",
        standings,
      });
    }
  }

  function openScoreBreakdown() {
    if (!state || !state.over) return null;
    const rows = state.players.slice().sort((a, b) => b.score - a.score).map((p) => {
      const b = p.breakdown || { route: p.routeScore, tickets: p.ticketScore, done: p.ticketsDone, totalTickets: p.tickets.length, longest: p.longest ? 10 : 0 };
      return '<tr class="p' + (p.index % 6) + '">' +
        '<td><span class="ttr-score-name"><i style="--pc:' + p.color + '"></i>' + U.escape(p.name) + "</span></td>" +
        "<td>" + b.route + "</td>" +
        '<td class="' + (b.tickets >= 0 ? "good" : "bad") + '">' + (b.tickets >= 0 ? "+" : "") + b.tickets + "</td>" +
        "<td>" + b.done + "/" + b.totalTickets + "</td>" +
        "<td>" + (b.longest ? "+10" : "—") + "</td>" +
        "<td><strong>" + p.score + "</strong></td>" +
        "</tr>";
    }).join("");
    const body = '<div class="ttr-score-table-wrap"><table class="ttr-score-table">' +
      "<thead><tr><th>اللاعب</th><th>المسارات</th><th>التذاكر</th><th>المكتمل</th><th>أطول مسار</th><th>المجموع</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>" +
      '<p class="trade-note">تُضاف نقاط التذاكر المكتملة وتُخصم غير المكتملة. أطول مسار متصل يمنح +10 لكل لاعب متعادل. قد يكون المجموع سالبًا.</p>';
    return BG.openDialog({
      title: "🧮 تفاصيل الحساب النهائي",
      className: "ttr-score-dialog",
      body,
      actions: [{ label: "حسنًا", value: "ok", primary: true }],
    });
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function cpuShortestPath(a, b, p) {
    const dist = {};
    const prev = {};
    const done = new Set();
    Object.keys(CITIES).forEach((city) => { dist[city] = Infinity; });
    dist[a] = 0;

    while (true) {
      let best = null;
      Object.keys(CITIES).forEach((city) => {
        if (done.has(city)) return;
        if (best == null || dist[city] < dist[best]) best = city;
      });
      if (best == null || dist[best] === Infinity) break;
      done.add(best);
      if (best === b) break;

      ROUTES.forEach((r) => {
        if (r.a !== best && r.b !== best) return;
        const other = r.a === best ? r.b : r.a;
        if (done.has(other)) return;
        let w = 0.01;
        const owner = state.routeOwners[r.id];
        if (owner != null && owner !== p.index) w += 900;
        else if (owner == null) {
          w += r.length;
          if (r.length > p.trains) w += 900;
          if (r.twin) {
            const twinOwner = state.routeOwners[r.twin];
            if (twinOwner != null && (state.players.length <= 2 || twinOwner === p.index)) w += 900;
          }
        }
        if (dist[best] + w < dist[other]) {
          dist[other] = dist[best] + w;
          prev[other] = { city: best, route: r.id };
        }
      });
    }

    if (!isFinite(dist[b]) || dist[b] >= 800) return null;
    const path = [];
    let city = b;
    let guard = 0;
    while (prev[city] && guard++ < 80) {
      path.push(prev[city].route);
      city = prev[city].city;
    }
    return path.reverse();
  }

  function cpuUnownedPath(path, p) {
    if (!path) return [];
    return path.filter((id) => state.routeOwners[id] !== p.index);
  }

  function cpuTicketCost(ticket, p) {
    const path = cpuShortestPath(ticket.a, ticket.b, p);
    if (!path) return Infinity;
    return cpuUnownedPath(path, p).reduce((sum, id) => {
      const r = routeById(id);
      return sum + (r ? r.length : 0);
    }, 0);
  }

  function cpuTicketScore(ticket, p) {
    if (isConnected(p, ticket.a, ticket.b)) return 120 + ticket.points;
    const cost = cpuTicketCost(ticket, p);
    if (!isFinite(cost)) return -80;
    return ticket.points * 1.25 - cost * 0.58;
  }

  function cpuSetScore(tickets, p) {
    let points = 0;
    let penalty = 0;
    const union = new Set();
    tickets.forEach((t) => {
      const path = cpuShortestPath(t.a, t.b, p);
      if (!path) { penalty += 45; return; }
      points += t.points;
      cpuUnownedPath(path, p).forEach((id) => union.add(id));
    });
    let cost = 0;
    union.forEach((id) => {
      const r = routeById(id);
      if (r) cost += r.length;
    });
    return points - cost * 0.6 - penalty + Math.max(0, tickets.length - 2) * 1.2;
  }

  function cpuPickStartTickets(tickets, p) {
    if (!tickets.length) return [];
    if (tickets.length <= 2) return tickets.slice();
    const level = AI.level(p.level);
    if (level === "easy") return U.shuffle(tickets.slice()).slice(0, 2);
    if (level === "normal") return tickets.slice().sort((a, b) => cpuTicketScore(b, p) - cpuTicketScore(a, p)).slice(0, 2);
    let best = tickets.slice(0, 2);
    let bestScore = -Infinity;
    const count = tickets.length;
    for (let mask = 0; mask < (1 << count); mask++) {
      const subset = tickets.filter((t, i) => mask & (1 << i));
      if (subset.length < 2) continue;
      const score = cpuSetScore(subset, p);
      if (score > bestScore) { bestScore = score; best = subset; }
    }
    return best;
  }

  function cpuPickMidTickets(tickets, p) {
    if (!tickets.length) return [];
    const level = AI.level(p.level);
    if (level === "easy") return [U.pick(tickets)];
    if (level === "normal") {
      return [tickets.slice().sort((a, b) => cpuTicketScore(b, p) - cpuTicketScore(a, p))[0]];
    }
    let best = [tickets[0]];
    let bestScore = -Infinity;
    for (let mask = 1; mask < (1 << tickets.length); mask++) {
      const subset = tickets.filter((t, i) => mask & (1 << i));
      if (!subset.length) continue;
      const score = cpuSetScore(subset, p);
      if (score > bestScore) { bestScore = score; best = subset; }
    }
    return best;
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
    const needed = new Map();
    p.tickets.forEach((t) => {
      if (isConnected(p, t.a, t.b)) return;
      const path = cpuShortestPath(t.a, t.b, p);
      if (!path) return;
      const unowned = cpuUnownedPath(path, p);
      if (!unowned.length) return;
      const cost = unowned.reduce((sum, id) => {
        const r = routeById(id);
        return sum + (r ? r.length : 0);
      }, 0);
      const weight = Math.max(1, t.points) / Math.max(4, cost);
      unowned.forEach((id) => {
        needed.set(id, (needed.get(id) || 0) + weight);
      });
    });
    return needed;
  }

  function cpuFutureNeed(p) {
    const key = state.turnCounter + ":" + (state.stats.routes || 0) + ":" + p.index;
    if (ui.futureNeedKey === key && ui.futureNeed) return ui.futureNeed;
    const map = {};
    cpuNeededRoutes(p).forEach((weight, id) => {
      const r = routeById(id);
      if (!r || r.color === "gray") return;
      map[r.color] = (map[r.color] || 0) + weight;
    });
    ui.futureNeedKey = key;
    ui.futureNeed = map;
    return map;
  }

  function cpuPaymentOption(p, route) {
    const options = paymentOptions(p, route);
    if (!options.length) return null;
    const need = cpuFutureNeed(p);
    const score = (o) => {
      let value = -o.loco * 9;
      if (o.color !== "loco") {
        value -= (need[o.color] || 0) * 2.4;
        value += (p.hand[o.color] || 0) * 0.22;
      }
      return value;
    };
    return options.slice().sort((a, b) => score(b) - score(a))[0];
  }

  function cpuCompletesTicket(p, route) {
    const previous = state.routeOwners[route.id];
    state.routeOwners[route.id] = p.index;
    const done = p.tickets.some((t) => !t.done && isConnected(p, t.a, t.b));
    state.routeOwners[route.id] = previous;
    return done;
  }

  function cpuShouldEnd(p, remainingTrains) {
    const trains = Number.isFinite(remainingTrains) ? remainingTrains : p.trains;
    if (trains > 2) return true;
    if (p.ticketsDone >= 2) return true;
    const maxOther = state.players.reduce((best, other) => other.index === p.index ? best : Math.max(best, other.routeScore || 0), 0);
    return (p.routeScore || 0) >= maxOther - 4;
  }

  function routeCentrality() {
    const key = state.turnCounter + ":" + (state.stats.routes || 0);
    if (ui.centralityKey === key && ui.centrality) return ui.centrality;
    const usage = {};
    ROUTES.forEach((r) => { usage[r.id] = 0; });
    const cityIds = Object.keys(CITIES);

    cityIds.forEach((src) => {
      const dist = {};
      const prev = {};
      const done = new Set();
      cityIds.forEach((c) => { dist[c] = Infinity; });
      dist[src] = 0;
      while (true) {
        let best = null;
        cityIds.forEach((c) => {
          if (done.has(c)) return;
          if (best == null || dist[c] < dist[best]) best = c;
        });
        if (best == null || dist[best] === Infinity) break;
        done.add(best);
        ROUTES.forEach((r) => {
          if (r.a !== best && r.b !== best) return;
          const other = r.a === best ? r.b : r.a;
          if (done.has(other) || state.routeOwners[r.id] != null) return;
          const w = r.length;
          if (dist[best] + w < dist[other]) {
            dist[other] = dist[best] + w;
            prev[other] = { city: best, route: r.id };
          }
        });
      }
      cityIds.forEach((dest) => {
        if (dest === src || !prev[dest]) return;
        let city = dest;
        let guard = 0;
        while (prev[city] && guard++ < 60) {
          usage[prev[city].route] += 1;
          city = prev[city].city;
        }
      });
    });

    let max = 0;
    Object.keys(usage).forEach((id) => { if (usage[id] > max) max = usage[id]; });
    const map = new Map();
    ROUTES.forEach((r) => map.set(r.id, max ? usage[r.id] / max : 0));
    ui.centralityKey = key;
    ui.centrality = map;
    return map;
  }

  function denialScore(route, p, centrality) {
    let score = 0;
    state.players.forEach((other) => {
      if (other.index === p.index) return;
      const cities = cpuNetwork(other);
      const a = cities.has(route.a);
      const b = cities.has(route.b);
      if (a !== b) score += 2.6;
      else if (a && b && !isConnected(other, route.a, route.b)) score += 4.2;
      if (other.trains <= 12 && (a || b)) score += 1.3;
    });
    if (centrality) score += (centrality.get(route.id) || 0) * 3.4;
    return score;
  }

  function cpuRouteScore(route, p, needed, network, centrality) {
    const level = AI.level(p.level);
    const need = cpuFutureNeed(p);
    let score = ROUTE_POINTS[route.length] * 1.45 + route.length * 0.4;
    if (needed.has(route.id)) score += 17 + needed.get(route.id) * 26;
    if (network.has(route.a)) score += 6;
    if (network.has(route.b)) score += 6;
    if (network.has(route.a) && network.has(route.b)) score += 7;
    if (!needed.has(route.id) && !network.has(route.a) && !network.has(route.b) && ROUTE_POINTS[route.length] < 7) score -= 9;
    const option = cpuPaymentOption(p, route);
    if (option) {
      score += 12 - option.loco * 4;
      if (option.color !== "loco") score -= (need[option.color] || 0) * 1.4;
    }
    if (p.trains - route.length <= 2) {
      if (!cpuCompletesTicket(p, route) && !cpuShouldEnd(p, p.trains - route.length)) score -= 24;
    }
    if (level === "hard") score += denialScore(route, p, centrality) * 3.2;
    else if (level === "normal") score += denialScore(route, p, null) * 0.55;
    return score;
  }

  /** مسار احتياطي عندما تنفد بطاقات السحب ولا يجد الذكاء مسارًا استراتيجيًا. */
  function cpuFallbackRoute(p) {
    const need = cpuNeededRoutes(p);
    const network = cpuNetwork(p);
    const options = ROUTES.filter((r) =>
      routeAvailable(r, p) && r.length <= p.trains && canAfford(p, r));
    if (!options.length) return null;
    return AI.choose(options, (r) => cpuRouteScore(r, p, need, network, null), p.level);
  }

  function cpuPickRoute(p) {
    const needed = cpuNeededRoutes(p);
    const network = cpuNetwork(p);
    const level = AI.level(p.level);
    const centrality = level === "hard" ? routeCentrality() : null;
    const candidates = ROUTES.filter((r) => {
      if (!routeAvailable(r, p)) return false;
      if (r.length > p.trains) return false;
      if (!canAfford(p, r)) return false;
      if (needed.has(r.id) || network.has(r.a) || network.has(r.b) || ROUTE_POINTS[r.length] >= 7) return true;
      if (level === "hard") {
        const deny = denialScore(r, p, centrality);
        return deny >= 7 && r.length >= 3;
      }
      return false;
    });
    if (!candidates.length) return null;
    return AI.choose(candidates, (route) => cpuRouteScore(route, p, needed, network, centrality), p.level);
  }

  function cpuCardValue(card, p) {
    if (card === "loco") return 24 + (cpuNeededRoutes(p).size ? 5 : 0);
    const need = cpuFutureNeed(p);
    let value = 0.6 + (need[card] || 0) * 10;
    if ((p.hand[card] || 0) > 0) value += 0.25;
    return value;
  }

  function cpuPickMarket(p) {
    const options = [];
    state.market.forEach((card, index) => {
      if (card) options.push({ index, card, value: cpuCardValue(card, p) });
    });
    if (!options.length) return -1;
    const level = AI.level(p.level);
    const best = options.slice().sort((a, b) => b.value - a.value)[0];
    if (level === "easy") {
      if (!state.deck.length || Math.random() < 0.58) return best.index;
      return -1;
    }
    if (level === "normal") {
      if (best.card === "loco") return best.index;
      if (best.value >= 5.4 || !state.deck.length) return best.index;
      return -1;
    }
    if (best.card === "loco") return best.index;
    if (best.value >= 3.4 || !state.deck.length || state.deck.length < 6) return best.index;
    return -1;
  }

  function cpuWantsTickets(p, needed) {
    if (state.ticketDeck.length + state.ticketDiscard.length === 0) return false;
    if (p.trains < 10 || p.tickets.length >= 5) return false;
    const level = AI.level(p.level);
    if (level === "easy") return false;
    if (level === "normal") return AI.chance(p.level, 0, 0.18, 0) && (needed.size === 0 || p.tickets.length < 3);
    if (p.tickets.some((t) => !isConnected(p, t.a, t.b)) && p.tickets.length < 3) return AI.chance(p.level, 0, 0, 0.14);
    if (needed.size === 0 && p.trains > 14) return AI.chance(p.level, 0, 0, 0.55);
    if (p.trains > 18 && p.tickets.length < 4) return AI.chance(p.level, 0, 0, 0.26);
    return AI.chance(p.level, 0, 0, 0.08);
  }

  function cpuTakeTurn() {
    if (!state || state.over) return;
    const p = cur();
    if (!p || !AI.isCpu(p)) return;
    const level = AI.level(p.level);
    const needed = cpuNeededRoutes(p);
    const route = cpuPickRoute(p);

    if (route) {
      const option = cpuPaymentOption(p, route);
      const completes = cpuCompletesTicket(p, route);
      const wouldEnd = p.trains - route.length <= 2;
      const allowEnd = level !== "hard" || !wouldEnd || completes || needed.has(route.id) || cpuShouldEnd(p, p.trains - route.length);
      if (option && allowEnd && applyRouteClaim(p, route, option)) {
        endTurn();
        return;
      }
    }

    if (state.deck.length || state.trainDiscard.length || state.market.some(Boolean)) {
      const index = cpuPickMarket(p);
      if (index >= 0) { drawFaceUp(index); return; }
      if (state.deck.length || state.trainDiscard.length) { drawFromDeck(); return; }
      const fallback = state.market.findIndex(Boolean);
      if (fallback >= 0) { drawFaceUp(fallback); return; }
    }

    if (cpuWantsTickets(p, needed)) {
      openMidTickets();
      return;
    }

    /* آخر خيار: استحوذ على أي مسار متاح بدل تمرير الدور إلى ما لا نهاية. */
    const fallback = cpuFallbackRoute(p);
    if (fallback) {
      const option = cpuPaymentOption(p, fallback);
      if (option && applyRouteClaim(p, fallback, option)) {
        endTurn();
        return;
      }
    }

    logEvent(p.name + " مرّر الدور لعدم توفر إجراء مناسب.", "warn", "⏭");
    state.notice = "لا توجد بطاقات أو مسارات متاحة — يمرر الكمبيوتر دوره.";
    endTurn();
  }

  function syncCpu() {
    if (!aiRunner) aiRunner = AI.runner();
    aiRunner.clear();
    if (!state || state.over) return;
    if (state.ticketPromptOpen) return;

    if (state.phase === "tickets-init") {
      const p = cur();
      if (!p || !AI.isCpu(p) || !AI.autoAllowed(apiRef, p)) return;
      const index = state.current;
      const kept = cpuPickStartTickets(p.pendingTickets.slice(), p);
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "tickets-init" || state.current !== index) return;
        finishStartTickets(index, kept);
      }, AI.delay(p.level, 1.05));
      return;
    }

    const seat = cur();
    if (!seat || !AI.isCpu(seat) || !AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 1.0);

    if (state.phase === "draw") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "draw" || !AI.isCpu(cur())) return;
        if (state.drawsLeft <= 0) { endTurn(); return; }
        const index = cpuPickMarket(cur());
        if (index >= 0) drawFaceUp(index);
        else if (state.deck.length || state.trainDiscard.length) drawFromDeck();
        else endTurn();
      }, wait);
      return;
    }

    if (state.phase === "action") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "action" || !AI.isCpu(cur())) return;
        cpuTakeTurn();
      }, wait);
    }
  }

  /* ------------------------------ تطبيع الحالة ------------------------------ */

  const PHASES = ["tickets-init", "action", "draw", "over"];

  function normalizeState() {
    if (!state || typeof state !== "object") return state;
    if (!Array.isArray(state.players) || !state.players.length) return state;

    const players = state.players;
    players.forEach((p, index) => {
      if (!p || typeof p !== "object") return;
      p.index = index;
      p.name = typeof p.name === "string" && p.name ? p.name : "لاعب " + (index + 1);
      p.isCpu = p.isCpu === true || p.type === "cpu";
      p.type = p.isCpu ? "cpu" : "human";
      p.level = AI.level(p.level);
      p.color = typeof p.color === "string" && /^#/.test(p.color) ? p.color : PLAYER_COLORS[index % PLAYER_COLORS.length];
      p.score = Number.isFinite(p.score) ? p.score : 0;
      p.routeScore = Number.isFinite(p.routeScore) ? p.routeScore : 0;
      p.ticketScore = Number.isFinite(p.ticketScore) ? p.ticketScore : 0;
      p.trains = Number.isFinite(p.trains) ? Math.max(0, Math.min(TRAIN_SUPPLY, Math.floor(p.trains))) : TRAIN_SUPPLY;

      const hand = {};
      HAND_COLORS.forEach((color) => {
        hand[color] = Math.max(0, Math.floor(Number(p.hand && p.hand[color]) || 0));
      });
      p.hand = hand;

      const cleanTickets = (list) => (Array.isArray(list) ? list : [])
        .filter((t) => t && CITIES[t.a] && CITIES[t.b])
        .map((t) => ({
          id: String(t.id || (t.a + "-" + t.b)),
          a: t.a,
          b: t.b,
          points: Math.max(0, Math.floor(Number(t.points) || 0)),
          done: t.done === true,
          doneTurn: Number.isFinite(t.doneTurn) ? t.doneTurn : null,
        }));
      p.tickets = cleanTickets(p.tickets);
      p.pendingTickets = cleanTickets(p.pendingTickets);
      p.pathLen = Number.isFinite(p.pathLen) ? p.pathLen : 0;
      p.ticketsDone = Number.isFinite(p.ticketsDone) ? p.ticketsDone : p.tickets.filter((t) => t.done).length;
      p.longest = p.longest === true;
      p.breakdown = p.breakdown && typeof p.breakdown === "object" ? p.breakdown : null;
    });

    const validCard = (c) => HAND_COLORS.indexOf(c) !== -1;
    state.deck = (Array.isArray(state.deck) ? state.deck : []).filter(validCard);
    state.trainDiscard = (Array.isArray(state.trainDiscard) ? state.trainDiscard : []).filter(validCard);
    const marketIn = Array.isArray(state.market) ? state.market : [];
    state.market = [];
    for (let i = 0; i < 5; i++) state.market.push(validCard(marketIn[i]) ? marketIn[i] : null);

    state.ticketDeck = (Array.isArray(state.ticketDeck) ? state.ticketDeck : [])
      .filter((t) => t && CITIES[t.a] && CITIES[t.b])
      .map((t) => ({ id: String(t.id || (t.a + "-" + t.b)), a: t.a, b: t.b, points: Number(t.points) || 0 }));
    state.ticketDiscard = (Array.isArray(state.ticketDiscard) ? state.ticketDiscard : [])
      .filter((t) => t && CITIES[t.a] && CITIES[t.b])
      .map((t) => ({ id: String(t.id || (t.a + "-" + t.b)), a: t.a, b: t.b, points: Number(t.points) || 0 }));

    const owners = {};
    ROUTES.forEach((r) => {
      const value = state.routeOwners ? state.routeOwners[r.id] : null;
      owners[r.id] = Number.isInteger(value) && value >= 0 && value < players.length ? value : null;
    });
    state.routeOwners = owners;

    state.current = Number.isInteger(state.current) && players[state.current] ? state.current : 0;
    if (PHASES.indexOf(state.phase) === -1) state.phase = state.over ? "over" : "action";
    state.over = state.phase === "over" || state.over === true;
    if (state.over) state.phase = "over";
    state.winner = Number.isInteger(state.winner) && players[state.winner] ? state.winner : null;
    state.notice = typeof state.notice === "string" ? state.notice : "";
    state.turnCounter = Number.isFinite(state.turnCounter) ? Math.max(0, Math.floor(state.turnCounter)) : 0;
    state.drawsLeft = Number.isFinite(state.drawsLeft) ? Math.max(0, Math.min(2, Math.floor(state.drawsLeft))) : 0;
    if (state.phase === "draw" && state.drawsLeft <= 0) state.phase = "action";
    state.finalRound = state.finalRound === true;
    state.finalTurns = Number.isFinite(state.finalTurns) ? Math.max(0, Math.floor(state.finalTurns)) : 0;
    state.finalJustTriggered = state.finalJustTriggered === true;
    state.marketResets = Number.isFinite(state.marketResets) ? state.marketResets : 0;
    state.revealActive = false;
    state.revealOwner = null;
    state.ticketPromptOpen = false;
    state.anim = null;
    state.stats = Object.assign({ routes: 0, ticketsDrawn: 0, deckMixes: 0 }, state.stats || {});
    state.log = (Array.isArray(state.log) ? state.log : [])
      .filter((e) => e && (typeof e.t === "string" || typeof e.h === "string"))
      .slice(-MAX_LOG)
      .map((e) => ({
        t: typeof e.t === "string" ? e.t : "",
        h: typeof e.h === "string" ? e.h : U.escape(e.t || ""),
        k: typeof e.k === "string" ? e.k : "",
        i: typeof e.i === "string" ? e.i : "•",
        turn: Number.isFinite(e.turn) ? e.turn : 0,
      }));

    players.forEach((p) => {
      let done = 0;
      p.tickets.forEach((t) => {
        t.done = isConnected(p, t.a, t.b);
        if (t.done) done += 1;
      });
      p.ticketsDone = done;
      p.routeScore = routePointsFor(p);
      if (!state.over) p.score = p.routeScore + ticketBalance(p);
    });

    return state;
  }

  /* ------------------------------ أدوات العرض ------------------------------ */

  function levelName(level) {
    const map = { easy: "سهل", normal: "متوسط", hard: "صعب", expert: "خبير" };
    return map[AI.level(level)] || "متوسط";
  }

  function ticketBalance(p) {
    return p.tickets.reduce((sum, t) => sum + (isConnected(p, t.a, t.b) ? t.points : -t.points), 0);
  }

  function expectedScore(p) {
    return routePointsFor(p) + ticketBalance(p) + (p.longest ? 10 : 0);
  }

  function initials(name) {
    const clean = String(name || "?").trim();
    return U.escape(clean.slice(0, 2));
  }

  function playerRowHTML(p, index) {
    const active = index === state.current;
    const viewer = p.index === viewerSeat() && !p.isCpu;
    const done = p.tickets.filter((t) => isConnected(p, t.a, t.b)).length;
    return '<li class="ttr-player' + (active ? " active" : "") + (viewer ? " viewer" : "") + '" style="--pc:' + p.color + '">' +
      BG.playerProfile.playerHTML(p, "ttr-player-avatar") +
      '<div class="ttr-pinfo">' +
      '<strong>' + U.escape(p.name) + (viewer ? '<em class="ttr-you">أنت</em>' : "") + "</strong>" +
      '<small>' + p.trains + " قطار · " + p.tickets.length + " تذكرة" +
      (viewer ? " · " + done + " مكتملة" : "") +
      (p.isCpu ? " · كمبيوتر " + levelName(p.level) : "") + "</small>" +
      "</div>" +
      '<div class="ttr-pscore"><b>' + routePointsFor(p) + "</b><small>مسار</small></div>" +
      (viewer ? '<div class="ttr-pscore expected"><b>' + expectedScore(p) + "</b><small>متوقع</small></div>" : "") +
      (active ? '<span class="ttr-active-flag">' + (state.over ? "🏁" : "🎯") + "</span>" : "") +
      "</li>";
  }

  function playersHTML() {
    return '<section class="ttr-panel ttr-players">' +
      '<div class="ttr-panel-head"><span class="ttr-kicker">🚉 اللاعبون</span><span class="ttr-panel-meta">' +
      state.players.length + " مقاعد</span></div>" +
      '<ul class="ttr-player-list">' + state.players.map(playerRowHTML).join("") + "</ul>" +
      "</section>";
  }

  function logHTML() {
    const entries = state.log.slice(-60);
    const html = entries.length
      ? entries.map((e) => '<li class="ttr-log-row' + (e.k ? " " + e.k : "") + '">' +
        '<span class="ttr-log-icon" aria-hidden="true">' + U.escape(e.i || "•") + "</span>" +
        '<span class="ttr-log-text">' + (e.h || U.escape(e.t)) + "</span>" +
        "</li>").join("")
      : '<li class="ttr-log-empty">لم يبدأ السجل بعد.</li>';
    return '<section class="ttr-panel ttr-log">' +
      '<div class="ttr-panel-head"><span class="ttr-kicker">📜 سجل الرحلة</span><span class="ttr-panel-meta">' +
      state.log.length + " حدث</span></div>" +
      '<ol class="ttr-log-list" data-log>' + html + "</ol>" +
      "</section>";
  }

  function turnPanelHTML() {
    const p = cur();
    if (!p) return "";
    const mine = isLocalSeat(state.current) && !p.isCpu;
    const label = state.over
      ? "انتهت الرحلة"
      : state.phase === "tickets-init"
        ? "اختيار تذاكر البداية"
        : state.finalRound
          ? "الجولة الأخيرة"
          : "دور اللعب";
    return '<section class="ttr-turn' + (mine ? " is-mine" : "") + (state.over ? " is-over" : "") + '" style="--pc:' + p.color + '">' +
      '<div class="ttr-turn-top"><span class="ttr-kicker">' + label + "</span>" +
      '<span class="ttr-turn-round">جولة ' + (state.turnCounter + 1) + "</span></div>" +
      '<div class="ttr-turn-main">' +
      '<span class="ttr-avatar">' + initials(p.name) + "</span>" +
      '<div class="ttr-turn-copy"><strong>' + U.escape(p.name) + "</strong><small>" +
      (p.isCpu ? "كمبيوتر · " + levelName(p.level) : "لاعب") + " · " + p.trains + " قطار · " + totalCards(p) + " بطاقة</small></div>" +
      '<span class="ttr-turn-score"><b>' + routePointsFor(p) + "</b><small>نقاط</small></span>" +
      "</div>" +
      '<p class="ttr-notice">' + U.escape(state.notice || "") + "</p>" +
      (state.over
        ? '<span class="ttr-turn-badge over">🏁 انتهت</span>'
        : mine
          ? '<span class="ttr-turn-badge">🎯 دورك — اختر إجراءً</span>'
          : '<span class="ttr-turn-badge wait">⏳ بانتظار ' + U.escape(p.name) + "</span>") +
      "</section>";
  }

  function handHTML(p) {
    const groups = HAND_COLORS.filter((color) => (p.hand[color] || 0) > 0);
    const total = totalCards(p);
    const cards = groups.length
      ? groups.map((color) => {
        const count = p.hand[color] || 0;
        const meta = COLORS[color];
        return '<button type="button" class="ttr-hand-card" data-card-zoom="' + color + '" ' +
          'style="--c:' + meta.hex + ';--ink:' + meta.ink + '" title="' + U.escape(meta.name + " ×" + count) + '">' +
          ART.trainCard(color) +
          '<span class="ttr-hand-count">×' + count + "</span>" +
          "</button>";
      }).join("")
      : '<p class="ttr-hand-empty">لا تملك بطاقات قطارات بعد. اسحب من السوق أو من الرزمة.</p>';

    const done = p.tickets.filter((t) => isConnected(p, t.a, t.b)).length;
    const expected = expectedScore(p);
    const tickets = p.tickets.length
      ? p.tickets.map((t) => {
        const ok = isConnected(p, t.a, t.b);
        return '<button type="button" class="ttr-myticket' + (ok ? " done" : "") + '" data-ticket-zoom="' + U.escape(t.id) + '">' +
          '<span class="ttr-myticket-route">' + U.escape(cityName(t.a)) + ' <i>↔</i> ' + U.escape(cityName(t.b)) + "</span>" +
          '<span class="ttr-myticket-points">' + (ok ? "+" : "−") + t.points + "</span>" +
          '<span class="ttr-myticket-state">' + (ok ? "✓ مكتملة" : "… غير مكتملة") + "</span>" +
          "</button>";
      }).join("")
      : '<p class="ttr-hand-empty">لا تذاكر بعد.</p>';

    return '<div class="ttr-hand-anchor" aria-hidden="true"></div>' +
      '<div class="ttr-hand">' +
      '<div class="ttr-hand-head"><span>بطاقات اليد <b>' + total + "</b></span>" +
      '<small>اضغط البطاقة للتكبير · القاطرة تعمل كلون</small></div>' +
      '<div class="ttr-hand-grid">' + cards + "</div>" +
      '<div class="ttr-hand-tickets-head"><span>تذاكرك السرّية</span>' +
      '<small>' + done + " مكتملة من " + p.tickets.length + " · الرصيد المتوقع <b>" + expected + "</b></small></div>" +
      '<div class="ttr-mytickets">' + tickets + "</div>" +
      "</div>";
  }

  function marketHTML() {
    const enabled = canAct() && (state.phase === "action" || state.phase === "draw");
    const visible = state.market.filter(Boolean).length;
    const locos = state.market.filter((c) => c === "loco").length;
    const drawLeft = state.phase === "draw" ? state.drawsLeft : 0;
    const cards = state.market.map((card, index) => {
      const meta = card ? (COLORS[card] || COLORS.gray) : null;
      const disabled = !enabled || !card;
      return '<button type="button" class="ttr-market-card' + (card ? "" : " is-empty") + '" data-draw="' + index + '" ' +
        (disabled ? "disabled " : "") +
        'style="' + (meta ? "--c:" + meta.hex + ";--ink:" + meta.ink : "") + '" ' +
        'title="' + U.escape(card ? "اسحب " + meta.name : "مكان فارغ") + '">' +
        (card ? ART.trainCard(card) : '<span class="ttr-empty-card" aria-hidden="true">🂠</span>') +
        "</button>";
    }).join("");

    const deckEnabled = enabled && (state.deck.length > 0 || state.trainDiscard.length > 0);
    return '<section class="ttr-panel ttr-market">' +
      '<div class="ttr-panel-head"><span class="ttr-kicker">🃏 السوق المكشوف</span>' +
      '<span class="ttr-panel-meta">' + visible + " بطاقات · " + (state.trainDiscard.length) + " مهملة</span></div>" +
      '<div class="ttr-market-strip">' + cards + "</div>" +
      (locos >= 3 ? '<p class="ttr-market-warn">🚨 ثلاث قاطرات مكشوفة — يُعاد خلط السوق تلقائيًا.</p>' : "") +
      '<div class="ttr-deck-row">' +
      '<button type="button" class="ttr-deck" data-act="draw-deck"' + (deckEnabled ? "" : " disabled") + ">" +
      '<span class="ttr-deck-art">' + ART.cardBack() + "</span>" +
      '<span class="ttr-deck-copy"><b>رزمة السحب</b><small>' + state.deck.length + " بطاقة · اسحب بطاقة سرّية</small></span>" +
      "</button>" +
      '<div class="ttr-draw-state">' +
      (state.phase === "draw"
        ? '<b>تبقّت ' + drawLeft + " سحبة</b><small>أكمل سحبك ثم ينتهي دورك</small>"
        : '<b>' + (canAct() ? "دورك" : "بانتظار الدور") + "</b><small>" + (canAct() ? "اسحب بطاقتين أو استحوذ على مسار" : "السوق للقراءة فقط الآن") + "</small>") +
      "</div></div></section>";
  }

  function actionHTML() {
    if (state.over) {
      return '<div class="ttr-actions ttr-actions-over">' +
        '<button type="button" class="bg-btn primary" data-act="score">🧮 تفاصيل الحساب النهائي</button>' +
        "</div>";
    }
    if (state.phase === "tickets-init") {
      const mine = isLocalSeat(state.current) && !AI.isCpu(cur());
      return '<div class="ttr-actions">' +
        '<button type="button" class="bg-btn primary" data-act="start-tickets"' + (mine ? "" : " disabled") + ">🎫 " + (mine ? "اختر تذاكرك" : "بانتظار اختيار التذاكر") + "</button>" +
        "</div><p class=\"ttr-hint\">تُعرض تذاكر البداية لمن يجلس على الجهاز فقط، ويجب الاحتفاظ بتذكرتين على الأقل.</p>";
    }
    const mine = canAct();
    const drawBlocked = !(state.deck.length || state.trainDiscard.length || state.market.some(Boolean));
    const canPass = mine && (state.phase === "action" || drawBlocked);
    const drawDisabled = !mine || !(state.deck.length || state.trainDiscard.length) || (state.phase === "draw" && state.drawsLeft <= 0);
    const ticketsDisabled = !mine || state.phase !== "action";
    return '<div class="ttr-actions">' +
      '<button type="button" class="bg-btn primary" data-act="draw-deck"' + (drawDisabled ? " disabled" : "") + ">🂠 اسحب بطاقة</button>" +
      '<button type="button" class="bg-btn" data-act="tickets"' + (ticketsDisabled ? " disabled" : "") + ">🎫 اسحب تذاكر</button>" +
      '<button type="button" class="bg-btn" data-act="pass"' + (canPass ? "" : " disabled") + ">⏭ مرّر الدور</button>" +
      '<button type="button" class="bg-btn ghost" data-act="score">🧮 الحساب المتوقع</button>' +
      "</div>" +
      '<p class="ttr-hint">' +
      (mine
        ? state.phase === "draw"
          ? "أكمل السحب. القاطرة المكشوفة تكفي وحدها وتنهي الدور."
          : "في دورك: اسحب بطاقتين، أو اسحب تذاكر، أو استحوذ على مسار واحد."
        : "انتظر دورك. يمكنك دراسة الخريطة وتذاكرك السرّية.") +
      "</p>";
  }

  function boardHeadHTML() {
    const locos = state.market.filter((c) => c === "loco").length;
    return '<header class="ttr-head">' +
      '<div class="ttr-head-brand">' +
      '<span class="ttr-head-icon" aria-hidden="true">🚂</span>' +
      '<div><span class="ttr-kicker">TICKET TO RIDE · NORTH AMERICA</span>' +
      "<strong>رحلة عبر المدن</strong>" +
      "<small>33 مدينة · 65 مسارًا · 42 تذكرة وجهة</small></div></div>" +
      '<div class="ttr-head-chips">' +
      '<span class="ttr-mini"><b>' + state.players.length + "</b> لاعبين</span>" +
      '<span class="ttr-mini"><b>' + state.deck.length + "</b> رزمة</span>" +
      (locos >= 3 ? '<span class="ttr-mini warn"><b>' + locos + "</b> قاطرات</span>" : "") +
      '<button type="button" class="bg-btn small ttr-score-btn" data-act="score">🧮 الحساب المتوقع</button>' +
      "</div></header>";
  }

  function boardFootHTML() {
    const legend = ["red", "blue", "yellow", "green", "black", "white", "orange", "pink", "loco"]
      .map((color) => ART.colorChip(color))
      .join("");
    return '<footer class="ttr-board-foot">' +
      '<div class="ttr-legend" aria-label="ألوان المسارات">' + legend + "</div>" +
      '<span class="ttr-board-hint">' + (canAct() ? "المسارات المضيئة متاحة للاستحواذ الآن" : "المسارات المضيئة تُظهر ما يمكن استحواذه في دورك") + "</span>" +
      "</footer>";
  }

  function boardSectionHTML(affordable) {
    return '<section class="ttr-board-wrap">' + boardHeadHTML() +
      '<div class="ttr-board-scroll">' +
      BOARD.boardSVG({
        owners: state.routeOwners,
        players: state.players,
        affordable,
        over: state.over,
        idle: !canAct(),
      }) +
      "</div>" + boardFootHTML() + "</section>";
  }

  function render() {
    if (!rootRef || !state) return;
    const oldBoard = rootRef.querySelector(".ttr-board-scroll");
    const scroll = oldBoard
      ? { left: oldBoard.scrollLeft, top: oldBoard.scrollTop }
      : ui.boardScroll || { left: 0, top: 0 };
    const anim = state.anim;
    state.anim = null;

    const affordable = new Set();
    const p = cur();
    if (canAct() && p) {
      ROUTES.forEach((r) => {
        if (routeAvailable(r, p) && r.length <= p.trains && canAfford(p, r)) affordable.add(r.id);
      });
    }

    const layout = document.createElement("div");
    layout.className = "ttr-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "ttr-board-col";
    boardWrap.innerHTML = boardSectionHTML(affordable);

    const side = document.createElement("aside");
    side.className = "ttr-side";
    side.innerHTML = turnPanelHTML() + marketHTML() + actionHTML() + playersHTML() + logHTML();

    const player = viewerPlayer();
    const seatIndex = viewerSeat();
    let secretEl = null;
    if (state.over) {
      secretEl = null;
    } else if (seatIndex < 0 || !player) {
      const watch = document.createElement("section");
      watch.className = "ttr-panel ttr-watch";
      watch.innerHTML = '<span class="ttr-kicker">👁 وضع المشاهدة</span><strong>أنت تتابع الرحلة</strong>' +
        '<p class="ttr-hint">بطاقات اليد والتذاكر سرّية لكل لاعب. تابع الخريطة والسجل العام.</p>';
      secretEl = watch;
    } else if (player.isCpu) {
      const cpu = document.createElement("section");
      cpu.className = "ttr-panel ttr-cpu-secret";
      cpu.innerHTML = '<span class="ttr-kicker">🤖 كمبيوتر · ' + levelName(player.level) + "</span>" +
        "<strong>" + U.escape(player.name) + "</strong>" +
        '<p class="ttr-hint">يد الكمبيوتر وتذاكره مخفية. تظهر فقط البطاقات العامة على الخريطة.</p>';
      secretEl = cpu;
    } else {
      const key = "ttr.secret." + player.index + "." + state.turnCounter + "." + (state.phase === "tickets-init" ? "start" : "play");
      const panel = BG.secretPanel({
        title: "🎴 يد " + player.name,
        owner: player.name,
        hint: "بطاقات اليد والتذاكر سرّية. أظهرها فقط عندما يكون الجهاز أمام صاحبها، ثم أخفها قبل تمرير الجهاز.",
        open: ui.secretOpenKey === key,
        autoKey: key,
        onToggle(visible) {
          if (visible) ui.secretOpenKey = key;
          else if (ui.secretOpenKey === key) ui.secretOpenKey = "";
        },
        render() { return handHTML(player); },
      });
      secretEl = panel.el;
      secretEl.classList.add("ttr-secret");
    }

    if (secretEl) {
      const turn = side.querySelector(".ttr-turn");
      if (turn) side.insertBefore(secretEl, turn.nextSibling);
      else side.insertBefore(secretEl, side.firstChild);
    }

    layout.appendChild(boardWrap);
    layout.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(layout);

    const boardScroll = rootRef.querySelector(".ttr-board-scroll");
    if (boardScroll) {
      boardScroll.scrollLeft = scroll.left || 0;
      boardScroll.scrollTop = scroll.top || 0;
      ui.boardScroll = { left: boardScroll.scrollLeft, top: boardScroll.scrollTop };
    }
    const logList = rootRef.querySelector(".ttr-log-list");
    if (logList) logList.scrollTop = logList.scrollHeight;

    if (state.turnCounter !== ui.lastTurn || state.over !== ui.lastOver) {
      ui.lastTurn = state.turnCounter;
      ui.lastOver = state.over;
      if (FX) FX.stagger(rootRef.querySelectorAll(".ttr-player"), { delay: 26, duration: 240 });
    }

    if (apiRef && apiRef.setStatus) {
      const active = cur();
      apiRef.setStatus(
        state.over
          ? "انتهت الرحلة"
          : state.phase === "tickets-init"
            ? "اختيار تذاكر البداية — " + (active ? active.name : "")
            : "دور " + (active ? active.name : "") + " · " + (state.finalRound ? "الجولة الأخيرة" : "الرحلة مستمرة"),
        state.over ? "over" : "live"
      );
    }

    playAnimation(anim);
    syncCpu();
  }

  /* ------------------------------ الأنميشن ------------------------------ */

  function playAnimation(anim) {
    if (!anim || !rootRef || !FX) return;
    if (anim.kind === "claim") {
      const g = rootRef.querySelector('.ttr-route[data-route="' + anim.routeId + '"]');
      if (g) {
        const cars = Array.prototype.slice.call(g.querySelectorAll(".ttr-car-body"));
        cars.forEach((car, i) => {
          FX.after(() => FX.pop(car, { duration: 220 }), 60 + i * 55);
        });
        FX.after(() => FX.floatText(g, "+" + anim.points, "good"), 220);
        FX.sound("train");
      }
      (anim.tickets || []).forEach((t, i) => {
        FX.after(() => {
          FX.banner("🎫 تذكرة مكتملة: " + cityName(t.a) + " ↔ " + cityName(t.b) + " +" + t.points, { tone: "good", duration: 1900 });
          FX.sound("ticket");
        }, 760 + i * 980);
      });
      if (anim.finalTriggered) {
        FX.after(() => FX.banner("🚨 الجولة الأخيرة — أكمل الجميع دورًا أخيرًا", { tone: "warn", duration: 2100 }), 360);
      }
      return;
    }

    if (anim.kind === "tickets") {
      if (anim.count) {
        FX.banner("🎫 احتفظت بـ" + anim.count + " تذكرة وجهة", { tone: "good" });
        FX.sound("ticket");
      }
      (anim.tickets || []).forEach((t, i) => {
        FX.after(() => {
          FX.banner("🎫 تذكرة مكتملة: " + cityName(t.a) + " ↔ " + cityName(t.b) + " +" + t.points, { tone: "good", duration: 1900 });
          FX.sound("ticket");
        }, 640 + i * 960);
      });
      return;
    }

    if (anim.kind === "market") {
      const market = rootRef.querySelector(".ttr-market");
      if (market) {
        FX.pulse(market, { duration: 420 });
        FX.after(() => FX.floatText(market, "🔁 خلط السوق", "warn"), 120);
      }
    }
  }

  /* ------------------------------ النوافذ المساعدة ------------------------------ */

  function openCardZoom(color) {
    const meta = COLORS[color];
    if (!meta) return null;
    const isLoco = color === "loco";
    const body = '<div class="ttr-zoom">' +
      '<div class="ttr-zoom-art">' + ART.trainCard(color) + "</div>" +
      '<div class="ttr-zoom-copy"><span class="ttr-kicker">بطاقة قطار</span>' +
      "<h3>" + U.escape(meta.name) + "</h3>" +
      "<p>" + (isLoco
        ? "القاطرة بطاقة بريّة تعمل كلون لأي مسار. استخدمها حين تنقصك بطاقات اللون المطلوب، أو احتفظ بها للمسارات الطويلة."
        : "تُستخدم بطاقات " + U.escape(meta.name) + " لدفع ثمن المسارات التي تحمل اللون نفسه، ويمكن إكمال النقص بقاطرات. المسارات الرمادية تقبل أي لون واحد.")
      + "</p>" +
      '<p class="ttr-zoom-note">المسار من 1 = 1 نقطة، 2 = 2، 3 = 4، 4 = 7، 5 = 10، 6 = 15.</p>' +
      "</div></div>";
    return BG.openDialog({
      title: "🚂 " + meta.name,
      className: "ttr-zoom-dialog",
      body,
      actions: [{ label: "حسنًا", value: "ok", primary: true }],
    });
  }

  function openTicketZoom(id) {
    const player = viewerPlayer();
    if (!player) return null;
    const ticket = player.tickets.find((t) => t.id === id);
    if (!ticket) return null;
    const ok = isConnected(player, ticket.a, ticket.b);
    const body = '<div class="ttr-zoom ttr-zoom-ticket">' +
      '<div class="ttr-zoom-art wide">' + ART.ticketCard(ticket, { aName: cityName(ticket.a), bName: cityName(ticket.b) }) + "</div>" +
      '<div class="ttr-zoom-copy"><span class="ttr-kicker">تذكرة وجهة سرّية</span>' +
      "<h3>" + U.escape(cityName(ticket.a)) + " ↔ " + U.escape(cityName(ticket.b)) + "</h3>" +
      '<p class="' + (ok ? "good" : "bad") + '">' + (ok
        ? "✓ مكتملة — تُضاف " + ticket.points + " نقطة في الحساب النهائي."
        : "… غير مكتملة — تُخصم " + ticket.points + " نقطة إن انتهت الرحلة دون ربط المدينتين.") + "</p>" +
      '<p class="ttr-zoom-note">تظهر هذه التذكرة لك وحدك. لا تُعلن نقاطها للخصوم قبل نهاية اللعبة.</p>' +
      "</div></div>";
    return BG.openDialog({
      title: "🎫 تذكرة " + cityName(ticket.a) + " ↔ " + cityName(ticket.b),
      className: "ttr-zoom-dialog",
      body,
      actions: [{ label: "حسنًا", value: "ok", primary: true }],
    });
  }

  function openScoreDialog() {
    if (!state) return null;
    if (state.over) return openScoreBreakdown();
    const viewer = viewerPlayer();
    const rows = state.players.slice()
      .sort((a, b) => routePointsFor(b) - routePointsFor(a))
      .map((p) => {
        const mine = !!viewer && p.index === viewer.index && !p.isCpu;
        const done = p.tickets.filter((t) => isConnected(p, t.a, t.b)).length;
        return '<tr class="p' + (p.index % 6) + '">' +
          '<td><span class="ttr-score-name"><i style="--pc:' + p.color + '"></i>' + U.escape(p.name) + "</span></td>" +
          "<td>" + routePointsFor(p) + "</td>" +
          "<td>" + p.tickets.length + "</td>" +
          "<td>" + (mine ? done : "—") + "</td>" +
          '<td class="' + (mine ? (ticketBalance(p) >= 0 ? "good" : "bad") : "") + '">' + (mine ? (ticketBalance(p) >= 0 ? "+" : "") + ticketBalance(p) : "—") + "</td>" +
          '<td><strong>' + (mine ? expectedScore(p) : routePointsFor(p)) + "</strong></td>" +
          "</tr>";
      }).join("");
    const body = '<div class="ttr-score-table-wrap"><table class="ttr-score-table">' +
      "<thead><tr><th>اللاعب</th><th>المسارات</th><th>التذاكر</th><th>المكتمل</th><th>رصيد التذاكر</th><th>المتوقع</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>" +
      '<p class="ttr-zoom-note">الرصيد المتوقع يخصّك أنت فقط ويجمع نقاط المسارات مع التذاكر المكتملة ناقص غير المكتملة. لا يُضاف +10 أطول مسار قبل نهاية اللعبة. رصيد الخصوم المتوقع مخفي حتى النهاية.</p>';
    return BG.openDialog({
      title: "🧮 الحساب المتوقع",
      className: "ttr-score-dialog",
      body,
      actions: [{ label: "حسنًا", value: "ok", primary: true }],
    });
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (!state) return;
    if (FX) FX.unlock();

    const zoomCard = event.target.closest("[data-card-zoom]");
    if (zoomCard) {
      openCardZoom(zoomCard.getAttribute("data-card-zoom"));
      return;
    }
    const zoomTicket = event.target.closest("[data-ticket-zoom]");
    if (zoomTicket) {
      openTicketZoom(zoomTicket.getAttribute("data-ticket-zoom"));
      return;
    }
    const draw = event.target.closest("[data-draw]");
    if (draw) {
      if (draw.disabled) return;
      drawFaceUp(Number(draw.getAttribute("data-draw")));
      return;
    }
    const routeEl = event.target.closest(".ttr-route");
    if (routeEl) {
      openClaim(routeEl.getAttribute("data-route"));
      return;
    }
    const action = event.target.closest("[data-act]");
    if (!action || action.disabled) return;
    const value = action.getAttribute("data-act");
    if (value === "score") openScoreDialog();
    else if (value === "draw-deck") drawFromDeck();
    else if (value === "tickets") openMidTickets();
    else if (value === "start-tickets") {
      if (state.phase === "tickets-init" && isLocalSeat(state.current) && !AI.isCpu(cur())) openStartTickets(state.current);
    } else if (value === "pass") passTurn();
  }

  /* ------------------------------ التشخيص ------------------------------ */

  function exposeDebug() {
    if (!/[?&]bgdebug/.test(window.location.search)) return;
    window.__bgDebug = {
      get state() { return state; },
      get players() { return state ? state.players : []; },
      get log() { return state ? state.log : []; },
      render,
      normalizeState,
      endTurn,
      finishScoring,
      applyRouteClaim,
      paymentOptions,
      canAfford,
      routeAvailable,
      isConnected,
      longestPath,
      routePointsFor,
      ticketBalance,
      expectedScore,
      openClaim,
      openStartTickets,
      finishStartTickets,
      openMidTickets,
      drawFromDeck,
      drawFaceUp,
      passTurn,
      updateTicketProgress,
      cpuTakeTurn,
      syncCpu,
      cpuPickRoute,
      cpuPickStartTickets,
      cpuPickMidTickets,
      cpuShortestPath,
      openScoreDialog,
      openCardZoom,
      openTicketZoom,
      handHTML,
      marketHTML,
      boardSVG: BOARD.boardSVG,
      ROUTES: BOARD.ROUTES,
      TICKETS: BOARD.TICKETS,
      CITIES: BOARD.CITIES,
    };
  }

  BG.register(game);
})();
