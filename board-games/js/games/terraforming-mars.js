/* ==========================================================================
   تيرافورمنغ مارس — terraforming mars
   شركات، مشاريع، موارد وإنتاج، معايير كوكبية، لوح مريخي، وفعلان لكل جيل.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const TEMP_STEPS = 20;
  const MAX_OXYGEN = 14;
  const MAX_OCEANS = 9;
  const MAX_GENERATIONS = 15;
  const BOARD = 9;
  const CELLS = BOARD * BOARD;

  const RES_AR = {
    credits: "عملات", steel: "فولاذ", titanium: "تيتانيوم",
    plants: "نباتات", energy: "طاقة", heat: "حرارة",
  };
  const RES_ICON = { credits: "◆", steel: "⚙", titanium: "🔹", plants: "🌱", energy: "⚡", heat: "🔥" };
  const TAG_AR = {
    building: "مبنى", space: "فضاء", science: "علم", power: "طاقة",
    plant: "نبات", microbe: "ميكروب", earth: "أرض", city: "مدينة",
  };

  const CORPORATIONS = [
    { name: "الرائد الأحمر", credits: 45, prod: { heat: 1 }, start: { steel: 2 }, desc: "شركة صناعية ثقيلة: فولاذ مبكر وإنتاج حرارة." },
    { name: "مختبرات النور", credits: 38, prod: { energy: 1 }, start: { energy: 2 }, discount: 1, desc: "أبحاث نظيفة: خصم عملة على كل مشروع، وإنتاج طاقة." },
    { name: "سكك المريخ", credits: 40, prod: { steel: 1 }, start: { steel: 3 }, desc: "بنية تحتية: إنتاج فولاذ يساعد على بناء المدن." },
    { name: "بنك الغبار", credits: 50, prod: { credits: 1 }, desc: "تمويل سخي: رأس مال كبير وإنتاج عملات إضافي." },
    { name: "مزارع الواحة", credits: 36, prod: { plants: 1 }, start: { plants: 3 }, desc: "زراعة مبكرة: إنتاج نباتات ونباتات بداية." },
    { name: "مناجم الفولاذ", credits: 35, prod: { titanium: 1 }, start: { titanium: 2 }, desc: "تعدين فضائي: تيتانيوم للبطاقات الفضائية." },
  ];

  const CARDS = [
    { name: "مصنع الأكسجين", cost: 12, tags: ["building"], eff: { oxygen: 1 } },
    { name: "محطة الطاقة", cost: 11, tags: ["building", "power"], eff: { prod: { energy: 1 } } },
    { name: "مسبك الفولاذ", cost: 15, tags: ["building"], eff: { prod: { steel: 1 } } },
    { name: "مجمع سكني", cost: 17, tags: ["building", "city"], eff: { city: 1 }, vp: 1 },
    { name: "مزرعة هوائية", cost: 12, tags: ["building", "plant"], eff: { prod: { plants: 1 }, plants: 2 } },
    { name: "مختبر الأبحاث", cost: 9, tags: ["science", "building"], eff: { cards: 2 }, vp: 1 },
    { name: "مفاعل الاندماج", cost: 20, tags: ["power", "building"], eff: { prod: { energy: 2 }, temp: 1 } },
    { name: "مستودع الفضاء", cost: 8, tags: ["building"], eff: { steel: 3, titanium: 1 } },
    { name: "خط أنابيب", cost: 10, tags: ["building"], eff: { prod: { heat: 1 }, heat: 3 } },
    { name: "مدينة الغبار", cost: 18, tags: ["building", "city"], eff: { city: 1, prod: { credits: 1 } } },
    { name: "كويكب صغير", cost: 9, tags: ["space"], eff: { temp: 1, titanium: 1 } },
    { name: "مسبار الجليد", cost: 8, tags: ["space"], eff: { ocean: 1 } },
    { name: "قمر صناعي", cost: 14, tags: ["space", "science"], eff: { cards: 2 }, vp: 1 },
    { name: "منجم الكويكب", cost: 16, tags: ["space", "building"], eff: { prod: { titanium: 1 }, titanium: 2 } },
    { name: "مركبة الهبوط", cost: 12, tags: ["space"], eff: { oxygen: 1, plants: 1 } },
    { name: "مكوك النقل", cost: 10, tags: ["space"], eff: { steel: 2, titanium: 2 } },
    { name: "محطة المدار", cost: 22, tags: ["space", "science"], eff: { prod: { energy: 1 }, cards: 1 }, vp: 2 },
    { name: "شبكة الرصد", cost: 15, tags: ["space", "science"], eff: { tr: 1, cards: 1 } },
    { name: "طحالب المريخ", cost: 7, tags: ["plant", "science"], eff: { plants: 3, prod: { plants: 1 } } },
    { name: "بيوت محمية", cost: 11, tags: ["plant"], eff: { oxygen: 1, plants: 2 } },
    { name: "أشجار سريعة النمو", cost: 13, tags: ["plant"], req: { temp: -10 }, eff: { greenery: 1 } },
    { name: "ميكروبات التربة", cost: 8, tags: ["microbe"], eff: { prod: { plants: 1 } }, vp: 1 },
    { name: "استثمار أرضي", cost: 12, tags: ["earth"], eff: { credits: 8, prod: { credits: 1 } } },
    { name: "خبراء الجيولوجيا", cost: 10, tags: ["earth", "science"], eff: { cards: 2, tr: 1 } },
    { name: "شبكة الطاقة الشمسية", cost: 14, tags: ["power"], eff: { prod: { energy: 1, heat: 1 } } },
    { name: "مفاعل نووي", cost: 24, tags: ["power"], req: { tr: 24 }, eff: { prod: { energy: 2 }, tr: 1 }, vp: 1 },
    { name: "مدينة قبة", cost: 20, tags: ["building", "city"], eff: { city: 1, prod: { credits: 1 } }, vp: 1 },
    { name: "بحيرة صناعية", cost: 15, tags: ["building"], eff: { ocean: 1, prod: { plants: 1 } } },
    { name: "غابة أولية", cost: 14, tags: ["plant"], req: { oxygen: 3 }, eff: { greenery: 1 } },
    { name: "مستعمرة فضائية", cost: 21, tags: ["space", "city"], req: { oceans: 3 }, eff: { city: 1 }, vp: 2 },
  ];

  const STANDARD = [
    { key: "power", name: "محطة طاقة", cost: 11, desc: "إنتاج طاقة +١" },
    { key: "asteroid", name: "كويكب", cost: 14, desc: "حرارة +٢°" },
    { key: "aquifer", name: "محيط", cost: 18, desc: "محيط +١" },
    { key: "greenery", name: "مسطح أخضر", cost: 23, desc: "أكسجين +١ ومسطح أخضر" },
    { key: "city", name: "مدينة", cost: 25, desc: "مدينة +١" },
  ];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;
  let serial = 1;

  function zeroProd() {
    return { credits: 0, steel: 0, titanium: 0, plants: 0, energy: 0, heat: 0 };
  }

  function emptyResources() {
    return { credits: 0, steel: 0, titanium: 0, plants: 0, energy: 0, heat: 0 };
  }

  function buildDeck() {
    const deck = [];
    CARDS.forEach((card) => {
      for (let copy = 0; copy < 2; copy++) deck.push({ ...card, uid: "tm-" + serial++ });
    });
    return U.shuffle(deck);
  }

  function makePlayers() {
    return XG.players(apiRef, 4, ["#b85b4d", "#5d8e83", "#c9a45c", "#8a7dbb"])
      .slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length)))
      .map((player, index) => ({
        ...player,
        color: ["#b85b4d", "#5d8e83", "#c9a45c", "#8a7dbb"][index],
        tr: 20,
        credits: 0,
        resources: emptyResources(),
        prod: zeroProd(),
        hand: [],
        played: [],
        actions: 2,
        discount: 0,
        tiles: { greenery: 0, city: 0 },
        corp: null,
      }));
  }

  function newState() {
    const deck = buildDeck();
    const players = makePlayers();
    players.forEach((player) => { player.hand = deck.splice(0, 6); });
    const corpOptions = {};
    players.forEach((player) => {
      corpOptions[player.index] = U.shuffle(CORPORATIONS).slice(0, 2);
    });
    return {
      players,
      deck,
      board: new Array(CELLS).fill(null),
      tempIndex: 0,
      oxygen: 0,
      oceans: 0,
      generation: 0,
      phase: "setup",
      setupIndex: 0,
      current: 0,
      actions: 2,
      selected: null,
      corpOptions,
      notice: "اختر شركتك لبدء الاستيطان. لكل لاعب شركتان مقترحتان.",
      last: null,
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }
  function setupPlayer() { return state.players[state.setupIndex]; }
  function temperature() { return -30 + state.tempIndex * 2; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.phase === "setup" ? state.setupIndex : state.current;
  }

  function totalProd(player, key) { return player.prod[key] || 0; }

  function resourceTotal(player) {
    return Object.values(player.resources).reduce((sum, value) => sum + value, 0);
  }

  function drawCards(player, count) {
    for (let i = 0; i < count; i++) {
      if (!state.deck.length) state.deck = buildDeck();
      const card = state.deck.pop();
      if (card) player.hand.push(card);
    }
  }

  function placeTile(type, owner) {
    const empty = [];
    for (let at = 0; at < CELLS; at++) if (!state.board[at]) empty.push(at);
    if (!empty.length) return false;
    let at = U.pick(empty);
    if (type === "city") {
      let best = -1;
      empty.forEach((cell) => {
        const r = Math.floor(cell / BOARD);
        const c = cell % BOARD;
        let count = 0;
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= BOARD || cc < 0 || cc >= BOARD) return;
          const tile = state.board[rr * BOARD + cc];
          if (tile && tile.type === "greenery") count += 1;
        });
        if (count > best) { best = count; at = cell; }
      });
    }
    state.board[at] = { type, owner: owner.index };
    return true;
  }

  function cityVp(player) {
    let vp = 0;
    for (let at = 0; at < CELLS; at++) {
      const tile = state.board[at];
      if (!tile || tile.type !== "city" || tile.owner !== player.index) continue;
      const r = Math.floor(at / BOARD);
      const c = at % BOARD;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= BOARD || cc < 0 || cc >= BOARD) return;
        const neighbor = state.board[rr * BOARD + cc];
        if (neighbor && neighbor.type === "greenery") vp += 1;
      });
    }
    return vp;
  }

  function cardVp(player) {
    return player.played.reduce((sum, card) => sum + (card.vp || 0), 0);
  }

  function totalScore(player) {
    return player.tr + cardVp(player) + player.tiles.greenery + cityVp(player);
  }

  function detailOf(player) {
    return "TR " + ar(player.tr) + " · بطاقات " + ar(cardVp(player)) + " · مسطحات " + ar(player.tiles.greenery) +
      " · مدن " + ar(cityVp(player)) + " · إجمالي " + ar(totalScore(player));
  }

  function raiseTr(player, amount) {
    player.tr += amount;
  }

  function raiseTemp(player, amount) {
    let raised = 0;
    for (let i = 0; i < amount && state.tempIndex < TEMP_STEPS - 1; i++) {
      state.tempIndex += 1;
      player.tr += 1;
      raised += 1;
    }
    return raised;
  }

  function raiseOxygen(player, amount) {
    let raised = 0;
    for (let i = 0; i < amount && state.oxygen < MAX_OXYGEN; i++) {
      state.oxygen += 1;
      player.tr += 1;
      raised += 1;
    }
    return raised;
  }

  function placeOcean(player, amount) {
    let placed = 0;
    for (let i = 0; i < amount && state.oceans < MAX_OCEANS; i++) {
      if (!placeTile("ocean", player)) break;
      state.oceans += 1;
      player.tr += 1;
      placed += 1;
    }
    return placed;
  }

  function placeGreenery(player, amount) {
    let placed = 0;
    for (let i = 0; i < amount; i++) {
      if (!placeTile("greenery", player)) break;
      player.tiles.greenery += 1;
      raiseOxygen(player, 1);
      placed += 1;
    }
    return placed;
  }

  function placeCity(player, amount) {
    let placed = 0;
    for (let i = 0; i < amount; i++) {
      if (!placeTile("city", player)) break;
      player.tiles.city += 1;
      placed += 1;
    }
    return placed;
  }

  function applyEffect(player, eff) {
    if (!eff) return;
    if (eff.tr) raiseTr(player, eff.tr);
    if (eff.temp) raiseTemp(player, eff.temp);
    if (eff.oxygen) raiseOxygen(player, eff.oxygen);
    if (eff.ocean) placeOcean(player, eff.ocean);
    if (eff.greenery) placeGreenery(player, eff.greenery);
    if (eff.city) placeCity(player, eff.city);
    if (eff.cards) drawCards(player, eff.cards);
    Object.keys(RES_AR).forEach((key) => {
      if (eff[key]) player.resources[key] += eff[key];
    });
    if (eff.prod) {
      Object.entries(eff.prod).forEach(([key, value]) => {
        player.prod[key] = (player.prod[key] || 0) + value;
      });
    }
  }

  function meetsReq(player, card) {
    const req = card.req || {};
    if (req.temp != null && temperature() < req.temp) return false;
    if (req.oxygen != null && state.oxygen < req.oxygen) return false;
    if (req.oceans != null && state.oceans < req.oceans) return false;
    if (req.tr != null && player.tr < req.tr) return false;
    if (req.prod) {
      for (const [key, value] of Object.entries(req.prod)) {
        if ((player.prod[key] || 0) < value) return false;
      }
    }
    return true;
  }

  function reqText(card) {
    const req = card.req;
    if (!req) return "";
    const parts = [];
    if (req.temp != null) parts.push("حرارة ≥ " + ar(req.temp) + "°");
    if (req.oxygen != null) parts.push("أكسجين ≥ " + ar(req.oxygen) + "%");
    if (req.oceans != null) parts.push("محيطات ≥ " + ar(req.oceans));
    if (req.tr != null) parts.push("TR ≥ " + ar(req.tr));
    if (req.prod) Object.entries(req.prod).forEach(([key, value]) => parts.push("إنتاج " + RES_AR[key] + " ≥ " + ar(value)));
    return parts.join(" · ");
  }

  function cardPrice(player, card) {
    return Math.max(0, (card.cost || 0) - (player.discount || 0));
  }

  function payPlan(player, card) {
    let remaining = cardPrice(player, card);
    let steel = 0;
    let titanium = 0;
    if (card.tags && card.tags.includes("building")) {
      const pairs = Math.min(Math.floor(player.resources.steel / 2), remaining);
      steel = pairs * 2;
      remaining -= pairs;
    }
    if (card.tags && card.tags.includes("space")) {
      const triples = Math.min(Math.floor(player.resources.titanium / 3), remaining);
      titanium = triples * 3;
      remaining -= triples;
    }
    return {
      ok: player.resources.credits >= remaining,
      credits: remaining,
      steel,
      titanium,
      total: cardPrice(player, card),
    };
  }

  function canPick(player) {
    if (!state || state.over) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }

  function chooseCorp(index) {
    if (!state || state.phase !== "setup" || state.over) return false;
    const player = setupPlayer();
    if (!canPick(player)) return false;
    const corp = state.corpOptions[player.index][index];
    if (!corp) return false;
    player.corp = corp;
    player.credits += corp.credits;
    player.discount = corp.discount || 0;
    Object.entries(corp.prod || {}).forEach(([key, value]) => { player.prod[key] = (player.prod[key] || 0) + value; });
    Object.entries(corp.start || {}).forEach(([key, value]) => { player.resources[key] += value; });
    apiRef.log("<strong>" + esc(player.name) + "</strong> اختار شركة <strong>" + esc(corp.name) + "</strong> (" + ar(corp.credits) + " عملة).", "accent");
    state.setupIndex += 1;
    if (state.setupIndex >= state.players.length) {
      state.phase = "action";
      state.generation = 0;
      beginGeneration();
      return true;
    }
    state.notice = "اختيار الشركات: دور " + setupPlayer().name + ".";
    render();
    settleSetup();
    return true;
  }

  function beginGeneration() {
    state.generation += 1;
    state.phase = "action";
    state.current = 0;
    state.selected = null;
    state.players.forEach((player) => {
      player.actions = 2;
      drawCards(player, 1);
    });
    state.notice = "الجيل " + ar(state.generation) + " — فعلان لكل لاعب. ارفع الحرارة والأكسجين والمحيطات.";
    apiRef.setStatus("الجيل " + ar(state.generation));
    apiRef.log("بدأ الجيل <strong>" + ar(state.generation) + "</strong>. كل لاعب لديه فعلان وسحب بطاقة.", "accent");
    render();
    settle();
  }

  function afterAction() {
    const player = cur();
    player.actions = Math.max(0, player.actions - 1);
    state.selected = null;
    if (state.players.every((p) => p.actions <= 0)) {
      productionPhase();
      return;
    }
    const n = state.players.length;
    let next = (state.current + 1) % n;
    let guard = 0;
    while (state.players[next].actions <= 0 && guard < n + 1) {
      next = (next + 1) % n;
      guard += 1;
    }
    state.current = next;
    const p = cur();
    state.notice = "دور " + p.name + " — " + ar(p.actions) + " فعل متبقٍ.";
    apiRef.setStatus("دور " + p.name);
    render();
    settle();
  }

  function passTurn() {
    if (!state || state.over || state.phase !== "action") return false;
    const player = cur();
    if (!canPick(player)) return false;
    player.actions = 0;
    apiRef.log("<strong>" + esc(player.name) + "</strong> مرّر بقية هذا الجيل.", "warn");
    state.last = { text: player.name + " مرّر." };
    afterActionPassOnly();
    return true;
  }

  function afterActionPassOnly() {
    if (state.players.every((p) => p.actions <= 0)) {
      productionPhase();
      return;
    }
    const n = state.players.length;
    let next = (state.current + 1) % n;
    let guard = 0;
    while (state.players[next].actions <= 0 && guard < n + 1) {
      next = (next + 1) % n;
      guard += 1;
    }
    state.current = next;
    state.notice = "دور " + cur().name + " — " + ar(cur().actions) + " فعل متبقٍ.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function productionPhase() {
    state.players.forEach((player) => {
      const gained = {};
      player.resources.credits += player.tr + totalProd(player, "credits");
      gained.credits = player.tr + totalProd(player, "credits");
      ["steel", "titanium", "plants"].forEach((key) => {
        const gain = totalProd(player, key);
        player.resources[key] += gain;
        if (gain) gained[key] = gain;
      });
      player.resources.heat += totalProd(player, "heat");
      player.resources.energy += totalProd(player, "energy");
      if (player.resources.energy) {
        player.resources.heat += player.resources.energy;
        gained.heat = (gained.heat || 0) + player.resources.energy;
        player.resources.energy = 0;
      }
      apiRef.log(
        "<strong>" + esc(player.name) + "</strong> إنتاج: " +
        Object.entries(gained).filter(([, value]) => value).map(([key, value]) => RES_ICON[key] + "+" + ar(value)).join(" ") +
        " (TR " + ar(player.tr) + ").",
        "accent"
      );
    });
    state.last = { text: "انتهت مرحلة الإنتاج للجيل " + ar(state.generation) + "." };
    const complete = state.tempIndex >= TEMP_STEPS - 1 && state.oxygen >= MAX_OXYGEN && state.oceans >= MAX_OCEANS;
    if (complete) {
      finish("اكتملت المعايير الكوكبية الثلاثة.");
      return;
    }
    if (state.generation >= MAX_GENERATIONS) {
      finish("بلغت اللعبة الحد الأقصى من الأجيال (" + ar(MAX_GENERATIONS) + ").");
      return;
    }
    beginGeneration();
  }

  function finish(reason) {
    state.over = true;
    state.phase = "over";
    const ranking = XG.standings(state.players, totalScore, detailOf);
    const winner = ranking[0];
    state.notice = "انتهت اللعبة. " + reason + " الفائز: " + winner.name + " بـ" + ar(winner.value) + " نقطة.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت تيرافورمنغ مارس",
      text: reason + " المجموع = TR + نقاط البطاقات + المسطحات الخضراء + نقاط المدن المجاورة للمسطحات.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🔴",
      standings: ranking,
    });
  }

  /* ------------------------------ الأفعال ------------------------------ */

  function playCard(index) {
    if (!state || state.over || state.phase !== "action") return false;
    const player = cur();
    if (!canPick(player)) return false;
    const card = player.hand[index];
    if (!card) return false;
    if (!meetsReq(player, card)) {
      apiRef.toast("متطلبات «" + card.name + "» غير محققة: " + reqText(card), "warn");
      return false;
    }
    const plan = payPlan(player, card);
    if (!plan.ok) {
      apiRef.toast("لا تستطيع دفع تكلفة «" + card.name + "».", "warn");
      return false;
    }
    player.resources.credits -= plan.credits;
    player.resources.steel -= plan.steel;
    player.resources.titanium -= plan.titanium;
    player.hand.splice(index, 1);
    player.played.push(card);
    applyEffect(player, card.eff);
    state.last = { text: player.name + " لعب " + card.name + "." };
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> لعب <strong>" + esc(card.name) + "</strong> بـ" + ar(plan.total) + " عملة" +
      (plan.steel ? " (فولاذ " + ar(plan.steel) + ")" : "") + (plan.titanium ? " (تيتانيوم " + ar(plan.titanium) + ")" : "") + ".",
      "accent"
    );
    afterAction();
    return true;
  }

  function standard(key) {
    if (!state || state.over || state.phase !== "action") return false;
    const player = cur();
    if (!canPick(player)) return false;
    const project = STANDARD.find((entry) => entry.key === key);
    if (!project) return false;
    if (player.resources.credits < project.cost) {
      apiRef.toast("تحتاج " + ar(project.cost) + " عملة لهذا المشروع.", "warn");
      return false;
    }
    if (key === "asteroid" && state.tempIndex >= TEMP_STEPS - 1) return false;
    if (key === "aquifer" && state.oceans >= MAX_OCEANS) return false;
    if (key === "greenery" && state.oxygen >= MAX_OXYGEN) return false;
    player.resources.credits -= project.cost;
    if (key === "power") player.prod.energy += 1;
    if (key === "asteroid") raiseTemp(player, 1);
    if (key === "aquifer") placeOcean(player, 1);
    if (key === "greenery") placeGreenery(player, 1);
    if (key === "city") placeCity(player, 1);
    state.last = { text: player.name + " نفّذ مشروع " + project.name + "." };
    apiRef.log("<strong>" + esc(player.name) + "</strong> نفّذ مشروع <strong>" + esc(project.name) + "</strong> بـ" + ar(project.cost) + " عملة.", "good");
    afterAction();
    return true;
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function effectValue(eff) {
    if (!eff) return 0;
    let value = 0;
    value += (eff.tr || 0) * 2.4;
    value += (eff.temp || 0) * 1.8;
    value += (eff.oxygen || 0) * 1.8;
    value += (eff.ocean || 0) * 1.7;
    value += (eff.greenery || 0) * 2.2;
    value += (eff.city || 0) * 2.4;
    value += (eff.cards || 0) * 0.6;
    if (eff.prod) {
      Object.entries(eff.prod).forEach(([key, amount]) => {
        value += amount * (key === "credits" ? 3 : 2);
      });
    }
    Object.keys(RES_AR).forEach((key) => {
      if (eff[key]) value += eff[key] * (key === "credits" ? 0.22 : 0.3);
    });
    return value;
  }

  function cardScore(player, card) {
    if (!meetsReq(player, card)) return -999;
    const plan = payPlan(player, card);
    if (!plan.ok) return -999;
    let score = (card.vp || 0) * 1.6 + effectValue(card.eff);
    score -= plan.credits * 0.16;
    if (plan.credits < 4) score += 0.6;
    return score;
  }

  function standardScore(player, key) {
    if (key === "power") return player.resources.credits >= 11 ? 1.4 : -999;
    if (key === "asteroid") return state.tempIndex < TEMP_STEPS - 1 && player.resources.credits >= 14 ? 3.6 : -999;
    if (key === "aquifer") return state.oceans < MAX_OCEANS && player.resources.credits >= 18 ? 3.4 : -999;
    if (key === "greenery") return state.oxygen < MAX_OXYGEN && player.resources.credits >= 23 ? 3.2 : -999;
    if (key === "city") return player.resources.credits >= 25 ? 2.2 : -999;
    return -999;
  }

  function aiChooseCorp() {
    if (!state || state.phase !== "setup") return;
    const player = setupPlayer();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const options = state.corpOptions[player.index];
    const best = options.slice().sort((a, b) => corpScore(b) - corpScore(a))[0];
    const index = options.indexOf(best);
    chooseCorp(index);
  }

  function corpScore(corp) {
    let score = corp.credits * 0.12;
    Object.values(corp.prod || {}).forEach((value) => { score += value * 2; });
    Object.values(corp.start || {}).forEach((value) => { score += value * 0.25; });
    if (corp.discount) score += 2.5;
    return score;
  }

  function aiTurn() {
    if (!state || state.over || state.phase !== "action") return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const options = [];
    player.hand.forEach((card, index) => {
      const score = cardScore(player, card);
      if (score > -100) options.push({ kind: "card", index, score });
    });
    STANDARD.forEach((project) => {
      const score = standardScore(player, project.key);
      if (score > -100) options.push({ kind: "standard", key: project.key, score });
    });
    options.sort((a, b) => b.score - a.score);
    if (options.length && options[0].score > 0.8) {
      if (options[0].kind === "card") playCard(options[0].index);
      else standard(options[0].key);
      return;
    }
    passTurn();
  }

  function settle() {
    if (!state || state.over || state.phase !== "action") return;
    if (XG.cpuTurn(apiRef, state, cur().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiTurn, AI.delay(cur().level, 1));
    }
  }

  function settleSetup() {
    if (!state || state.over || state.phase !== "setup") return;
    if (XG.cpuTurn(apiRef, state, setupPlayer().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiChooseCorp, AI.delay(setupPlayer().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function effectText(eff) {
    if (!eff) return "لا تأثير مباشر";
    const parts = [];
    if (eff.tr) parts.push("TR +" + ar(eff.tr));
    if (eff.temp) parts.push("حرارة +" + ar(eff.temp * 2) + "°");
    if (eff.oxygen) parts.push("أكسجين +" + ar(eff.oxygen));
    if (eff.ocean) parts.push("محيط +" + ar(eff.ocean));
    if (eff.greenery) parts.push("مسطح أخضر +" + ar(eff.greenery));
    if (eff.city) parts.push("مدينة +" + ar(eff.city));
    if (eff.cards) parts.push("اسحب " + ar(eff.cards));
    Object.keys(RES_AR).forEach((key) => {
      if (eff[key]) parts.push(RES_ICON[key] + " +" + ar(eff[key]));
    });
    if (eff.prod) {
      const prod = Object.entries(eff.prod).map(([key, value]) => RES_AR[key] + " +" + ar(value)).join("، ");
      parts.push("إنتاج: " + prod);
    }
    return parts.join(" · ");
  }

  function tagChips(card) {
    return (card.tags || []).map((tag) => '<span class="tm-tag tm-tag-' + tag + '">' + TAG_AR[tag] + "</span>").join("");
  }

  function corpCard(corp, index) {
    return '<button type="button" class="tm-corp" data-tm-corp="' + index + '">' +
      '<strong>' + esc(corp.name) + "</strong>" +
      '<span class="tm-corp-credits">' + ar(corp.credits) + " ◆</span>" +
      '<span class="tm-corp-desc">' + esc(corp.desc) + "</span>" +
      '<span class="tm-corp-prod">' + (Object.entries(corp.prod || {}).map(([key, value]) => RES_ICON[key] + "+" + ar(value)).join(" ") || "لا إنتاج") + "</span>" +
      "</button>";
  }

  function renderSetup() {
    const player = setupPlayer();
    const options = state.corpOptions[player.index] || [];
    const chosen = state.players.filter((p) => p.corp).map((p) => '<span class="xg-chip">' + esc(p.name) + ": " + esc(p.corp.name) + "</span>").join("");
    rootRef.innerHTML =
      '<div class="xg tm">' +
      XG.bar("تيرافورمنغ مارس", "اختيار الشركة · موارد وإنتاج · معايير كوكبية", [
        XG.chip("المرحلة", "تأسيس الشركات", "is-live"),
        XG.chip("الدور", esc(player.name)),
      ].join("")) +
      '<div class="xg-panel tm-setup"><div class="xg-spread"><h3>اختر شركتك يا ' + esc(player.name) + "</h3>" +
      '<span class="xg-chip">' + ar(options.length) + " خيارات</span></div>" +
      '<p class="xg-note">تبدأ بـ20 TR. الشركة تمنحك عملات وإنتاجًا وموارد بداية، وقد تمنح خصمًا على المشاريع.</p>' +
      '<div class="tm-corp-grid">' + options.map(corpCard).join("") + "</div>" +
      (chosen ? '<div class="xg-row tm-chosen">' + chosen + "</div>" : "") +
      "</div></div>";
  }

  function render() {
    if (!rootRef || !state) return;
    if (state.phase === "setup") { renderSetup(); return; }
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const selected = seen.index === player.index && state.selected != null ? seen.hand[state.selected] : null;
    const plan = selected ? payPlan(player, selected) : null;
    const hand = seen.hand.map((card, index) => {
      const reqOk = meetsReq(player, card);
      const pay = payPlan(player, card);
      return '<button type="button" class="tm-card ' + (state.selected === index ? "is-selected" : "") + (reqOk && pay.ok ? "" : " is-locked") +
        '" data-tm-card="' + index + '">' +
        '<span class="tm-card-top"><strong>' + esc(card.name) + "</strong><span>" + ar(pay.total) + " ◆</span></span>" +
        '<span class="tm-card-tags">' + tagChips(card) + "</span>" +
        '<span class="tm-card-text">' + esc(effectText(card.eff)) + "</span>" +
        (card.req ? '<span class="tm-card-req">' + esc(reqText(card)) + "</span>" : "") +
        (card.vp ? '<span class="tm-card-vp">' + ar(card.vp) + " نقطة</span>" : "") +
        "</button>";
    }).join("");

    const playerRows = state.players.map((p) => (
      '<div class="tm-player ' + (p.index === state.current ? "is-current" : "") + '" style="--pc:' + p.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="xg-avatar">' + ar(p.index + 1) + "</span><strong>" + esc(p.name) + "</strong></span>" +
      '<span class="xg-chip">' + ar(totalScore(p)) + "</span></div>" +
      '<div class="tm-player-tr">TR <strong>' + ar(p.tr) + "</strong> · " + (p.corp ? esc(p.corp.name) : "") + "</div>" +
      '<div class="tm-player-res">' + Object.keys(RES_AR).map((key) => '<span title="' + RES_AR[key] + '">' + RES_ICON[key] + ar(p.resources[key]) + "</span>").join("") + "</div>" +
      '<div class="tm-player-prod">' + Object.keys(RES_AR).map((key) => '<span title="إنتاج ' + RES_AR[key] + '">+' + ar(p.prod[key] || 0) + "</span>").join("") + "</div>" +
      '<div class="tm-player-meta">أفعال ' + ar(p.actions) + " · بطاقات " + ar(p.played.length) + " · مدن " + ar(p.tiles.city) + " · خضراء " + ar(p.tiles.greenery) + "</div>" +
      "</div>"
    )).join("");

    let boardCells = "";
    for (let at = 0; at < CELLS; at++) {
      const tile = state.board[at];
      if (!tile) {
        boardCells += '<div class="tm-tile"></div>';
      } else if (tile.type === "ocean") {
        boardCells += '<div class="tm-tile is-ocean" title="محيط"></div>';
      } else if (tile.type === "greenery") {
        boardCells += '<div class="tm-tile is-greenery" title="مسطح أخضر — ' + esc(state.players[tile.owner] ? state.players[tile.owner].name : "") + '"></div>';
      } else {
        boardCells += '<div class="tm-tile is-city" title="مدينة — ' + esc(state.players[tile.owner] ? state.players[tile.owner].name : "") + '">🏙️</div>';
      }
    }

    const params = [
      { name: "الحرارة", value: ar(temperature()) + "°", pct: ((state.tempIndex + 1) / TEMP_STEPS) * 100, max: "٨°" },
      { name: "الأكسجين", value: ar(state.oxygen) + "%", pct: (state.oxygen / MAX_OXYGEN) * 100, max: "١٤%" },
      { name: "المحيطات", value: ar(state.oceans) + " / ٩", pct: (state.oceans / MAX_OCEANS) * 100, max: "٩" },
    ];

    rootRef.innerHTML =
      '<div class="xg tm">' +
      XG.bar("تيرافورمنغ مارس", "شركات ومشاريع · موارد وإنتاج · ارفع معايير الكوكب", [
        XG.chip("الجيل", ar(state.generation) + " / " + ar(MAX_GENERATIONS), "is-live"),
        XG.chip("الأفعال", ar(player.actions)),
        XG.chip("TR", ar(seen.tr), "is-good"),
        XG.chip("عملات", ar(seen.resources.credits), "is-good"),
      ].join("")) +
      '<div class="tm-params">' + params.map((param) =>
        '<div class="tm-param"><div class="xg-spread"><span>' + param.name + "</span><strong>" + param.value + "</strong></div>" +
        '<div class="tm-bar"><span style="width:' + Math.max(0, Math.min(100, param.pct)) + '%"></span></div></div>'
      ).join("") + "</div>" +
      '<div class="tm-layout"><div class="tm-main">' +
      '<div class="xg-panel"><div class="xg-spread"><h3>يد ' + esc(seen.name) + "</h3>" +
      '<span class="xg-chip">' + ar(seen.hand.length) + " بطاقة</span></div>" +
      '<div class="tm-hand">' + (seen.hand.length ? hand : '<p class="xg-note">لا بطاقات. ستسحب بطاقة كل جيل.</p>') + "</div>" +
      (selected ?
        '<div class="tm-action-panel"><div class="xg-spread"><strong>' + esc(selected.name) + "</strong>" +
        '<span class="xg-chip">' + (plan && plan.ok ? "الدفع: " + ar(plan.credits) + " ◆" + (plan.steel ? " + فولاذ " + ar(plan.steel) : "") + (plan.titanium ? " + تيتانيوم " + ar(plan.titanium) : "") : "غير متاح") + "</span></div>" +
        (selected.req && !meetsReq(player, selected) ? '<p class="xg-warn">المتطلبات غير محققة: ' + esc(reqText(selected)) + "</p>" : "") +
        '<div class="xg-row"><button type="button" class="xg-btn primary" data-tm-play ' + (!can || !plan || !plan.ok || !meetsReq(player, selected) ? "disabled" : "") + ">لعب المشروع</button>" +
        '<button type="button" class="xg-btn ghost" data-tm-cancel>إلغاء</button></div></div>' : "") +
      "</div>" +
      '<div class="xg-panel"><div class="xg-spread"><h3>المشاريع القياسية</h3><span class="xg-chip">تُدفع بالعملات فقط</span></div>' +
      '<div class="tm-standard">' + STANDARD.map((project) => {
        const usable = can && player.resources.credits >= project.cost &&
          !(project.key === "asteroid" && state.tempIndex >= TEMP_STEPS - 1) &&
          !(project.key === "aquifer" && state.oceans >= MAX_OCEANS) &&
          !(project.key === "greenery" && state.oxygen >= MAX_OXYGEN);
        return '<button type="button" class="xg-btn tm-standard-btn" data-tm-standard="' + project.key + '" ' + (!usable ? "disabled" : "") + ">" +
          esc(project.name) + ' <b>' + ar(project.cost) + "◆</b><span>" + esc(project.desc) + "</span></button>";
      }).join("") + "</div><p class=\"xg-note\">" + esc(state.notice) + "</p>" +
      (state.last ? '<p class="tm-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      "</div>" +
      '<aside class="tm-side"><div class="xg-panel"><h3>لوح المريخ</h3><div class="tm-board">' + boardCells + "</div>" +
      '<div class="tm-legend"><span><i class="is-ocean"></i>محيط</span><span><i class="is-greenery"></i>مسطح</span><span><i class="is-city"></i>مدينة</span></div></div>' +
      '<div class="xg-panel"><h3>اللاعبون</h3><div class="tm-players">' + playerRows + "</div></div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">كل جيل فعلان. الإنتاج: TR + إنتاج العملات، ثم الموارد الأخرى، والطاقة المتبقية تتحول حرارة. الفولاذ يدفع بطاقات المباني (٢=١) والتيتانيوم يدفع بطاقات الفضاء (٣=١). تنتهي اللعبة باكتمال المعايير أو بعد ١٥ جيلًا.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (state.phase === "setup") {
      const corp = event.target.closest("[data-tm-corp]");
      if (corp) chooseCorp(Number(corp.dataset.tmCorp));
      return;
    }
    const card = event.target.closest("[data-tm-card]");
    if (card) {
      const index = Number(card.dataset.tmCard);
      if (state.selected === index) state.selected = null;
      else state.selected = index;
      render();
      return;
    }
    if (event.target.closest("[data-tm-play]")) {
      if (state.selected != null) playCard(state.selected);
      return;
    }
    if (event.target.closest("[data-tm-cancel]")) {
      state.selected = null;
      render();
      return;
    }
    const standardBtn = event.target.closest("[data-tm-standard]");
    if (standardBtn) standard(standardBtn.dataset.tmStandard);
  }

  const game = {
    id: "terraforming-mars",
    name: "تيرافورمنغ مارس",
    en: "TERRAFORMING MARS",
    icon: "🔴",
    accent: "#c45f52",
    cardClass: "card-terraforming-mars",
    tagline: "قد شركة، نفّذ مشاريع، وارفع حرارة المريخ وأكسجينه ومحيطاته قبل خصومك.",
    players: "2–4",
    duration: "45–70 دقيقة",
    complexity: "مرتفعة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة مبسطة قريبة من الأصل: شركات، فعلان لكل جيل، إنتاج، ومعايير كوكبية.",
      defaults: {},
      fields: [],
      summary() { return "شركات · 15 جيلًا · معايير كوكبية"; },
    },

    rules: {
      goal: "ارفع معايير المريخ الثلاثة واجمع أعلى نقاط من TR والبطاقات والمسطحات والمدن. تنتهي اللعبة عند اكتمال الحرارة والأكسجين والمحيطات أو بعد 15 جيلًا.",
      facts: [["الجيل", "فعلان"], ["الحرارة", "-30° إلى 8°"], ["الأكسجين", "0 إلى 14%"], ["المحيطات", "9"]],
      components: [
        "ست شركات لكل منها عملات وإنتاج وموارد بداية.",
        "مشاريع بناء وفضاء وعلم وطاقة ونبات وميكروبات وأرض.",
        "موارد: عملات وفولاذ وتيتانيوم ونباتات وطاقة وحرارة.",
        "لوح مريخي 9×9 للمحيطات والمسطحات والمدن.",
      ],
      setup: [
        "يختار كل لاعب شركة من شركتين مقترحتين.",
        "يبدأ الجميع بـ20 TR، وسحب 6 بطاقات، ثم بطاقة كل جيل.",
        "لكل لاعب فعلان في كل جيل.",
      ],
      steps: [
        "<strong>لعب مشروع:</strong> ادفع تكلفته بالعملات، ويمكن استخدام الفولاذ لبطاقات المباني (٢=١) والتيتانيوم لبطاقات الفضاء (٣=١) بعد تحقيق المتطلبات.",
        "<strong>المشاريع القياسية:</strong> محطة طاقة (11)، كويكب (14)، محيط (18)، مسطح أخضر (23)، مدينة (25).",
        "<strong>المعايير:</strong> كل درجة حرارة أو أكسجين أو محيط يرفع TR بمقدار 1. المسطح الأخضر يرفع الأكسجين، والمدينة تجمع نقاطًا من المسطحات المجاورة.",
        "<strong>الإنتاج:</strong> بعد انتهاء أفعال الجميع، احصل على TR + إنتاج العملات، ثم الفولاذ والتيتانيوم والنباتات والحرارة، والطاقة المتبقية تتحول حرارة.",
        "<strong>النهاية:</strong> اكتمال المعايير الثلاثة أو بلوغ 15 جيلًا.",
      ],
      winning: "المجموع = TR + نقاط البطاقات + عدد المسطحات الخضراء + نقطة لكل مسطح أخضر مجاور لكل مدينة.",
      notes: [
        "المتطلبات تعتمد على الحرارة والأكسجين والمحيطات وTR والإنتاج الحالي.",
        "خصم شركة «مختبرات النور» يُطبَّق على تكلفة المشاريع فقط.",
        "وضع التذاكر التلقائي يختار خلية عشوائية للمحيطات والمسطحات، وأفضل جوار للمدينة.",
        "هذه نسخة مبسطة من الجوائز والإنجازات وبطاقات الشركات؛ جوهر الاستيطان محفوظ.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      serial = 1;
      state = newState();
      apiRef.log("بدأ تأسيس الشركات في تيرافورمنغ مارس. اختر شركتك.", "accent");
      apiRef.setStatus("اختيار الشركات");
      render();
      settleSetup();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          chooseCorp,
          playCard,
          standard,
          passTurn,
          aiTurn,
          aiChooseCorp,
          totalScore,
          cityVp,
          raiseTemp: (n) => raiseTemp(cur(), Number(n) || 1),
          raiseOxygen: (n) => raiseOxygen(cur(), Number(n) || 1),
          placeOcean: (n) => placeOcean(cur(), Number(n) || 1),
          addCredits(n) { cur().resources.credits += Number(n) || 0; render(); },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            state.selected = null;
            render();
            settle();
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
          return state.phase === "setup" ? state.setupIndex : state.current;
        },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); if (state.phase === "setup") settleSetup(); else settle(); } },
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
