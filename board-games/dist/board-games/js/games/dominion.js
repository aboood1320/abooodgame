/* ==========================================================================
   دومينيون — بناء السطح
   10 بطاقات مملكة من المجموعة الأساسية، دور أفعال/شراء/تنظيف، ونهاية بالمقاطعات.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const CARDS = {
    copper: { name: "نحاس", cost: 0, type: "treasure", coins: 1 },
    silver: { name: "فضة", cost: 3, type: "treasure", coins: 2 },
    gold: { name: "ذهب", cost: 6, type: "treasure", coins: 3 },
    estate: { name: "عزبة", cost: 2, type: "victory", vp: 1 },
    duchy: { name: "دوقية", cost: 5, type: "victory", vp: 3 },
    province: { name: "مقاطعة", cost: 8, type: "victory", vp: 6 },
    curse: { name: "لعنة", cost: 0, type: "curse", vp: -1 },
    village: { name: "قرية", cost: 3, type: "action" },
    smithy: { name: "حدّاد", cost: 4, type: "action" },
    market: { name: "سوق", cost: 5, type: "action" },
    festival: { name: "مهرجان", cost: 5, type: "action" },
    laboratory: { name: "مختبر", cost: 5, type: "action" },
    moneylender: { name: "مُقرض", cost: 4, type: "action" },
    militia: { name: "ميليشيا", cost: 4, type: "action" },
    workshop: { name: "ورشة", cost: 3, type: "action" },
    councilroom: { name: "مجلس", cost: 5, type: "action" },
    moat: { name: "خندق", cost: 2, type: "action" },
  };
  const KINGDOM = ["village", "smithy", "market", "festival", "laboratory", "moneylender", "militia", "workshop", "councilroom", "moat"];
  const BASE_SUPPLY = { copper: 60, silver: 40, gold: 30, estate: 8, duchy: 8, province: 8, curse: 10 };
  const ORDER = ["province", "gold", "duchy", "silver", "estate", "curse", "copper", ...KINGDOM];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makePlayers() {
    return XG.players(apiRef, 4, ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb"]).slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length))).map((player) => {
      const deck = [];
      for (let i = 0; i < 7; i++) deck.push("copper");
      for (let i = 0; i < 3; i++) deck.push("estate");
      const draw = U.shuffle(deck);
      const hand = draw.splice(0, 5);
      return { ...player, draw, hand, discard: [], played: [], actions: 1, buys: 0, bonusCoins: 0, spent: 0 };
    });
  }

  function newState() {
    const players = makePlayers();
    const supply = {};
    Object.entries(BASE_SUPPLY).forEach(([key, count]) => { supply[key] = count; });
    KINGDOM.forEach((key) => { supply[key] = 10; });
    return {
      players,
      supply,
      current: 0,
      phase: "action",
      notice: "مرحلة الأفعال: العب بطاقات الأفعال ثم انتقل إلى الشراء.",
      last: null,
      over: false,
      winner: null,
      turn: 1,
    };
  }

  function cur() { return state.players[state.current]; }

  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function handCoins(player) {
    return player.hand.reduce((sum, key) => sum + (CARDS[key].coins || 0), 0);
  }

  function coins(player) {
    return handCoins(player) + player.bonusCoins - player.spent;
  }

  function draw(player, count) {
    for (let i = 0; i < count; i++) {
      if (!player.draw.length) {
        if (!player.discard.length) break;
        player.draw = U.shuffle(player.discard);
        player.discard = [];
      }
      const key = player.draw.pop();
      if (key) player.hand.push(key);
    }
  }

  function gain(key) {
    if (state.supply[key] <= 0) return false;
    state.supply[key] -= 1;
    cur().discard.push(key);
    return true;
  }

  function attackMilitia() {
    state.players.forEach((player) => {
      if (player.index === state.current) return;
      if (player.hand.includes("moat")) {
        apiRef.log("<strong>" + esc(player.name) + "</strong> كشف الخندق ومنع الهجوم.", "good");
        return;
      }
      while (player.hand.length > 3) {
        const priority = ["estate", "curse", "copper", "duchy", "silver", "gold", "province"];
        let index = -1;
        for (const key of priority) {
          index = player.hand.indexOf(key);
          if (index >= 0) break;
        }
        if (index < 0) index = 0;
        const removed = player.hand.splice(index, 1)[0];
        player.discard.push(removed);
      }
      apiRef.log("<strong>" + esc(player.name) + "</strong> تخلّص من بطاقات حتى بقي 3 في يده.", "warn");
    });
  }

  function playCard(key) {
    if (!state || state.over || state.phase !== "action") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const player = cur();
    if (player.actions < 1 || !player.hand.includes(key) || CARDS[key].type !== "action") return false;
    player.hand.splice(player.hand.indexOf(key), 1);
    player.played.push(key);
    player.actions -= 1;
    apiRef.log("<strong>" + esc(player.name) + "</strong> لعب " + esc(CARDS[key].name) + ".", "accent");
    if (key === "village") { draw(player, 1); player.actions += 2; }
    else if (key === "smithy") draw(player, 3);
    else if (key === "market") { draw(player, 1); player.actions += 1; player.buys += 1; player.bonusCoins += 1; }
    else if (key === "festival") { player.actions += 2; player.buys += 1; player.bonusCoins += 2; }
    else if (key === "laboratory") { draw(player, 2); player.actions += 1; }
    else if (key === "moneylender") {
      const index = player.hand.indexOf("copper");
      if (index >= 0) {
        player.hand.splice(index, 1);
        player.bonusCoins += 3;
        apiRef.log("أُحرق نحاس مقابل 3 عملات.", "good");
      }
    } else if (key === "militia") {
      player.bonusCoins += 2;
      attackMilitia();
    } else if (key === "workshop") {
      if (state.supply.silver > 0) {
        gain("silver");
        apiRef.log("الورشة اكتسبت فضة.", "good");
      }
    } else if (key === "councilroom") {
      draw(player, 4);
      player.buys += 1;
      state.players.forEach((other) => { if (other.index !== state.current) draw(other, 1); });
    } else if (key === "moat") {
      draw(player, 2);
    }
    state.last = { text: player.name + " لعب " + CARDS[key].name + "." };
    if (player.actions > 0) state.notice = "لديك " + ar(player.actions) + " فعل متبقٍ. العب بطاقة أو انتقل للشراء.";
    else state.notice = "انتقل إلى مرحلة الشراء.";
    render();
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(player.level, 0.5));
    }
    return true;
  }

  function toBuy() {
    if (!state || state.over) return;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return;
    state.phase = "buy";
    cur().buys = Math.max(1, cur().buys);
    state.notice = "مرحلة الشراء: لديك " + ar(coins(cur())) + " عملة و" + ar(cur().buys) + " شراء.";
    apiRef.setStatus("شراء — " + cur().name);
    render();
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.5));
    }
  }

  function buy(key) {
    if (!state || state.over || state.phase !== "buy") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const player = cur();
    const card = CARDS[key];
    if (!card || state.supply[key] <= 0) return false;
    if (player.buys < 1) return false;
    if (coins(player) < card.cost) return false;
    state.supply[key] -= 1;
    player.discard.push(key);
    player.buys -= 1;
    player.spent += card.cost;
    apiRef.log("<strong>" + esc(player.name) + "</strong> اشترى " + esc(card.name) + " بـ" + ar(card.cost) + " عملات.", "good");
    state.last = { text: player.name + " اشترى " + card.name + "." };
    if (checkEnd()) return true;
    state.notice = "تبقّى " + ar(player.buys) + " شراء و" + ar(coins(player)) + " عملة.";
    render();
    return true;
  }

  function checkEnd() {
    if (state.supply.province <= 0) { finish(); return true; }
    const empty = Object.values(state.supply).filter((count) => count <= 0).length;
    if (empty >= 3) { finish(); return true; }
    return false;
  }

  function endTurn() {
    if (!state || state.over) return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const player = cur();
    player.discard.push(...player.hand, ...player.played);
    player.hand = [];
    player.played = [];
    player.actions = 0;
    player.buys = 0;
    player.bonusCoins = 0;
    player.spent = 0;
    draw(player, 5);
    state.current = (state.current + 1) % state.players.length;
    state.phase = "action";
    state.turn += 1;
    cur().actions = 1;
    cur().buys = 0;
    cur().bonusCoins = 0;
    cur().spent = 0;
    state.notice = "الدور لـ" + cur().name + " — مرحلة الأفعال.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
    return true;
  }

  function scoreOf(player) {
    const all = [...player.hand, ...player.draw, ...player.discard, ...player.played];
    return all.reduce((sum, key) => sum + (CARDS[key].vp || 0), 0);
  }

  function finish() {
    state.over = true;
    state.phase = "over";
    const ranking = XG.standings(state.players, scoreOf, (player) => {
      const all = [...player.hand, ...player.draw, ...player.discard, ...player.played];
      return all.filter((key) => CARDS[key].type === "victory").length + " بطاقة انتصار";
    });
    const winner = ranking[0];
    state.notice = "انتهت اللعبة. الفائز: " + winner.name + " بـ" + ar(winner.value) + " نقطة.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت دومينيون",
      text: "نفدت المقاطعات أو ثلاثة أكوام. تُجمع نقاط بطاقات الانتصار من السطح كاملًا.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "👑",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function playableActions(player) {
    return U.unique(player.hand.filter((key) => CARDS[key].type === "action"));
  }

  function actionPriority(key) {
    const order = { village: 10, laboratory: 9, market: 8, festival: 7, smithy: 6, councilroom: 5, militia: 4, moneylender: 3, workshop: 2, moat: 1 };
    return order[key] || 0;
  }

  function aiBuy() {
    const player = cur();
    let guard = 0;
    while (player.buys > 0 && guard++ < 8) {
      const available = coins(player);
      let choice = null;
      if (available >= 8 && state.supply.province > 0) choice = "province";
      else if (available >= 6 && state.supply.gold > 0) choice = "gold";
      else if (available >= 5 && state.supply.duchy > 0 && state.turn > 12) choice = "duchy";
      else if (available >= 4 && state.supply.smithy > 0 && player.discard.filter((k) => k === "smithy").length < 2) choice = "smithy";
      else if (available >= 5 && state.supply.market > 0) choice = "market";
      else if (available >= 3 && state.supply.silver > 0) choice = "silver";
      else if (available >= 3 && state.supply.village > 0) choice = "village";
      if (!choice || !buy(choice)) break;
      if (state.over) return;
    }
    endTurn();
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const player = cur();
    if (state.phase === "action") {
      const actions = playableActions(player).sort((a, b) => actionPriority(b) - actionPriority(a));
      if (player.actions > 0 && actions.length) {
        playCard(actions[0]);
        return;
      }
      toBuy();
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(player.level, 0.5));
      return;
    }
    if (state.phase === "buy") {
      aiBuy();
    }
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function cardHtml(key, options) {
    const card = CARDS[key];
    const cls = "dmn-card is-" + card.type + (options && options.small ? " is-small" : "");
    return '<span class="' + cls + '"><span class="dmn-card-name">' + esc(card.name) + "</span>" +
      '<span class="dmn-card-meta">' + (card.cost != null ? ar(card.cost) + " ◆" : "") + (card.vp ? " · " + ar(card.vp) + " نقطة" : "") + (card.coins ? " · " + ar(card.coins) + " عملة" : "") + "</span></span>";
  }

  function handHtml() {
    const seen = state.players[viewSeat()] || cur();
    const can = seen.index === state.current && XG.canAct(apiRef, state, state.current, state.over);
    return '<div class="dmn-hand">' + seen.hand.map((key) => {
      const card = CARDS[key];
      const playable = can && state.phase === "action" && card.type === "action" && cur().actions > 0;
      return '<div class="dmn-hand-card">' + cardHtml(key) +
        (card.type === "action" ? '<button type="button" class="xg-btn dmn-play" data-dmn-play="' + key + '" ' + (!playable ? "disabled" : "") + ">العب</button>" : "") +
        "</div>";
    }).join("") + "</div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const supplyCards = ORDER.filter((key) => state.supply[key] > 0).map((key) => {
      const card = CARDS[key];
      const affordable = can && state.phase === "buy" && player.buys > 0 && coins(player) >= card.cost;
      return '<button type="button" class="dmn-supply ' + (affordable ? "is-buyable" : "") + '" data-dmn-buy="' + key + '" ' + (!affordable ? "disabled" : "") + ">" +
        cardHtml(key, { small: true }) + '<span class="dmn-supply-count">' + ar(state.supply[key]) + "</span></button>";
    }).join("");

    const playerRows = state.players.map((p) => (
      '<div class="dmn-player ' + (p.index === state.current ? "is-current" : "") + '">' +
      '<span class="xg-row"><span class="xg-avatar">' + ar(p.index + 1) + "</span><strong>" + esc(p.name) + "</strong></span>" +
      '<span class="dmn-counts">يد ' + ar(p.hand.length) + " · سطح " + ar(p.draw.length + p.discard.length + p.played.length) + "</span></div>"
    )).join("");

    rootRef.innerHTML =
      '<div class="xg dmn">' +
      XG.bar("دومينيون", "بناء السطح · أفعال وشراء · 10 بطاقات مملكة", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("المرحلة", state.phase === "buy" ? "شراء" : "أفعال"),
        XG.chip("العملات", ar(coins(player)), "is-good"),
        XG.chip("الشراء", ar(player.buys)),
      ].join("")) +
      '<div class="dmn-layout"><div class="dmn-main">' +
      '<div class="xg-panel"><div class="xg-spread"><h3>يدك — ' + esc(seen.name) + "</h3>" +
      '<span class="xg-chip">' + ar(seen.hand.length) + " بطاقة</span></div>" + handHtml() +
      '<div class="xg-row dmn-actions"><button type="button" class="xg-btn primary" data-dmn-buyphase ' + (!can || state.phase !== "action" ? "disabled" : "") + ">انتقل إلى الشراء</button>" +
      '<button type="button" class="xg-btn" data-dmn-end ' + (!can ? "disabled" : "") + ">إنهاء الدور</button>" +
      '<span class="xg-chip">أفعال ' + ar(player.actions) + "</span></div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="dmn-last">' + esc(state.last.text) + "</p>" : "") +
      "</div>" +
      '<div class="xg-panel"><h3>المخزون</h3><div class="dmn-supply-grid">' + supplyCards + "</div></div>" +
      "</div>" +
      '<aside class="dmn-side"><div class="xg-panel"><h3>اللاعبون</h3>' + playerRows + "</div>" +
      '<div class="xg-panel"><h3>سطحك</h3><p class="xg-note">السحب: ' + ar(seen.draw.length) + " · المهملات: " + ar(seen.discard.length) + " · المُلعَب: " + ar(seen.played.length) + "</p>" +
      '<p class="xg-note">نقاطك الحالية: <strong>' + ar(scoreOf(seen)) + "</strong></p></div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">كل دور: فعل واحد وشراء واحد. النحاس/الفضة/الذهب تبقى في يدك حتى التنظيف. تنتهي اللعبة بنفاد المقاطعات أو ثلاثة أكوام فارغة. النقاط من العزب والدوقيات والمقاطعات، واللعنة -1.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const play = event.target.closest("[data-dmn-play]");
    if (play) { playCard(play.dataset.dmnPlay); return; }
    if (event.target.closest("[data-dmn-buyphase]")) { toBuy(); return; }
    if (event.target.closest("[data-dmn-end]")) { endTurn(); return; }
    const buyBtn = event.target.closest("[data-dmn-buy]");
    if (buyBtn) buy(buyBtn.dataset.dmnBuy);
  }

  const game = {
    id: "dominion",
    name: "دومينيون",
    en: "DOMINION",
    icon: "👑",
    accent: "#b88a58",
    cardClass: "card-dominion",
    tagline: "ابنِ سطحك من النحاس إلى المقاطعات عبر أفعال وشراء مدروس.",
    players: "2–4",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "مجموعة أساسية: 10 بطاقات مملكة، مقاطعات، وأكوام نقود وانتصار.",
      defaults: {},
      fields: [],
      summary() { return "10 بطاقات مملكة · بناء سطح"; },
    },

    rules: {
      goal: "اجمع أعلى نقاط انتصار. تبدأ بسطح من النحاس والعزب، وتبني مجموعتك بشراء بطاقات أقوى قبل نفاد المقاطعات.",
      facts: [["البطاقات", "10 مملكة"], ["اليد", "5"], ["النهاية", "مقاطعات أو 3 أكوام"], ["النقاط", "عزب 1، دوقية 3، مقاطعة 6"]],
      components: [
        "بطاقات النقود: نحاس (1)، فضة (2)، ذهب (3).",
        "بطاقات الانتصار: عزبة (1)، دوقية (3)، مقاطعة (6)، ولعنة (-1).",
        "10 بطاقات مملكة: قرية، حدّاد، سوق، مهرجان، مختبر، مُقرض، ميليشيا، ورشة، مجلس، خندق.",
        "لكل لاعب سطح بداية من 7 نحاس و3 عزب.",
      ],
      setup: [
        "يبدأ كل لاعب بسحب 5 بطاقات من سطحه.",
        "في كل دور: مرحلة فعل واحد، ثم مرحلة شراء واحد.",
        "أول لاعب يبدأ، ثم ينتقل الدور بالترتيب.",
      ],
      steps: [
        "<strong>الفعل:</strong> العب بطاقة فعل واحدة (أو أكثر إذا منحتك أفعالًا إضافية).",
        "<strong>الشراء:</strong> استخدم العملات من بطاقات النقود في يدك لشراء بطاقة واحدة أو أكثر حسب عدد الشراء.",
        "<strong>التنظيف:</strong> تذهب يدك وملعوبك إلى المهملات، ثم تسحب 5 بطاقات جديدة.",
        "<strong>النهاية:</strong> تنتهي اللعبة عند نفاد كومة المقاطعات أو ثلاثة أكوام.",
        "<strong>الاحتساب:</strong> اجمع نقاط بطاقات الانتصار من السطح كاملًا (اليد + السحب + المهملات).",
      ],
      winning: "الفائز صاحب أعلى مجموع نقاط انتصار عند نهاية اللعبة. اللعنة تساوي -1.",
      notes: [
        "بطاقات النقود في اليد تُحتسب تلقائيًا عند الشراء ولا تُستهلك بالشراء.",
        "المهاجمة (ميليشيا) تُبقي الخصم بثلاث بطاقات، والخندق يمنعها تلقائيًا.",
        "ورشة تكسب فضة تلقائيًا، والمُقرض يحرق نحاسًا مقابل 3 عملات.",
        "الذكاء الاصطناعي يشتري المقاطعة ثم الذهب ثم الفضة والبطاقات المفيدة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت دومينيون. كل لاعب يبدأ بـ7 نحاس و3 عزب، والفوز بالنقاط عند نهاية المخزون.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          playCard,
          buy,
          endTurn,
          toBuy,
          aiStep,
          scoreOf,
          give(key, count) {
            if (!state) return;
            for (let i = 0; i < (count || 1); i++) cur().discard.push(key);
            render();
          },
          setCurrent(index) { state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1); state.phase = "action"; state.notice = "دور " + cur().name + "."; render(); },
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
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); settle(); } },
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
