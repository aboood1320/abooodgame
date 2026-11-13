/* ==========================================================================
   للبيع! — مزاد العقارات ثم بيعها بأعلى ورقة نقدية
   ٣٠ عقارًا (١–٣٠)، ٣٠ ورقة نقدية (٠–١٥ ألفًا مرتين)، ومزاد صاعد.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const COLORS = ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb", "#6f9b6e", "#c48a3f"];
  const MONEY = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function buildPlayers() {
    const count = U.clamp((apiRef.players || []).length || 3, 3, 6);
    const list = [];
    for (let index = 0; index < count; index++) {
      const source = (apiRef.players || [])[index];
      list.push({
        index,
        name: source && source.name ? source.name : "اللاعب " + (index + 1),
        color: (source && source.profileColor) || COLORS[index],
        type: source && source.type === "cpu" ? "cpu" : "human",
        level: source ? BG.ai.level(source.level) : BG.ai.level(1),
        isCpu: source ? BG.ai.isCpu(source) : true,
        cash: count <= 4 ? 18 : 14,
        properties: [],
        currency: [],
        bid: 0,
        passed: false,
      });
    }
    return list;
  }

  function buildMoneyDeck() {
    const deck = [];
    MONEY.forEach((value) => { deck.push(value, value); });
    return U.shuffle(deck);
  }

  function newState() {
    const players = buildPlayers();
    const removed = players.length === 3 ? 6 : players.length === 4 ? 2 : 0;
    const properties = U.shuffle(Array.from({ length: 30 }, (_, index) => index + 1));
    const money = buildMoneyDeck();
    return {
      players,
      propertyDeck: properties.slice(removed),
      currencyDeck: money.slice(removed),
      phase: "auction",
      current: 0,
      auction: null,
      sell: null,
      round: 0,
      notice: "تبدأ الجولة الأولى من المزاد. أعلى مزايدة تأخذ أغلى عقار.",
      last: null,
      over: false,
      starter: 0,
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }
  function canPick(player) {
    if (!state || state.over) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }
  function cashTotal(player) { return player.cash; }
  function currencyTotal(player) { return player.currency.reduce((sum, value) => sum + value, 0); }
  function totalOf(player) { return player.cash + currencyTotal(player); }
  function propertyCount(player) { return player.properties.length; }
  function maxBid(player) {
    if (!state.auction) return player.cash + player.bid;
    return player.cash + player.bid;
  }

  /* ------------------------------ المزاد ------------------------------ */

  function beginAuction(starter) {
    if (!state.propertyDeck.length) {
      beginSelling();
      return;
    }
    const count = state.players.length;
    const cards = state.propertyDeck.splice(0, count).sort((a, b) => a - b);
    state.players.forEach((player) => { player.bid = 0; player.passed = false; });
    const start = ((starter % count) + count) % count;
    state.phase = "auction";
    state.current = start;
    state.auction = {
      cards: cards.map((value) => ({ value, owner: null })),
      low: 0,
      high: cards.length - 1,
      bid: 0,
      highPlayer: null,
      active: state.players.map((player) => player.index),
      start,
    };
    state.round += 1;
    state.notice = "مزاد جديد على " + ar(count) + " عقارات. ابدأ المزايدة أو مرّر.";
    apiRef.setStatus("مزاد — دور " + cur().name);
    render();
    settle();
  }

  function bid(amount) {
    if (!state || state.over || state.phase !== "auction" || !state.auction) return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (state.auction.active.length <= 1) return false;
    const value = Math.floor(Number(amount));
    const limit = maxBid(player);
    if (!Number.isFinite(value) || value <= state.auction.bid || value > limit) {
      apiRef.toast("المزايدة يجب أن تكون أعلى من " + ar(state.auction.bid) + " وألا تتجاوز " + ar(limit) + " ألفًا.", "warn");
      return false;
    }
    const diff = value - player.bid;
    player.cash -= diff;
    player.bid = value;
    state.auction.bid = value;
    state.auction.highPlayer = player.index;
    apiRef.log("<strong>" + esc(player.name) + "</strong> زايد إلى <strong>" + ar(value) + " ألف</strong>.", "accent");
    state.notice = player.name + " رفع المزايدة إلى " + ar(value) + " ألف.";
    state.last = { text: player.name + " زايد إلى " + value + " ألف." };
    advanceBidder();
    return true;
  }

  function advanceBidder() {
    if (!state.auction) return;
    if (state.auction.active.length <= 1) {
      awardHighest();
      return;
    }
    let next = state.current;
    let guard = 0;
    do {
      next = (next + 1) % state.players.length;
      guard += 1;
    } while (!state.auction.active.includes(next) && guard < state.players.length + 1);
    state.current = next;
    render();
    settle();
  }

  function passBid() {
    if (!state || state.over || state.phase !== "auction" || !state.auction) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const refund = Math.floor(player.bid / 2);
    player.cash += refund;
    const slot = state.auction.cards[state.auction.low];
    if (slot) slot.owner = player.index;
    player.properties.push(slot.value);
    player.passed = true;
    state.auction.low += 1;
    state.auction.active = state.auction.active.filter((index) => index !== player.index);
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> مرّر ودفع " + ar(player.bid - refund) + " ألفًا، وأخذ العقار " +
      ar(slot.value) + (refund ? " واستعاد " + ar(refund) + " ألفًا." : "."),
      "warn"
    );
    state.last = { text: player.name + " أخذ العقار " + slot.value + "." };
    player.bid = 0;
    if (state.auction.active.length <= 1) {
      awardHighest();
      return true;
    }
    advanceBidder();
    return true;
  }

  function awardHighest() {
    if (!state.auction) return;
    const winnerIndex = state.auction.active[0];
    const winner = state.players[winnerIndex];
    const slot = state.auction.cards[state.auction.high];
    if (slot && slot.owner == null) slot.owner = winnerIndex;
    if (slot) winner.properties.push(slot.value);
    apiRef.log(
      "<strong>" + esc(winner.name) + "</strong> يفوز بأغلى عقار (" + ar(slot ? slot.value : "—") + ") مقابل " +
      ar(winner.bid) + " ألف.", "good"
    );
    state.last = { text: winner.name + " فاز بالعقار " + (slot ? slot.value : "") + "." };
    const nextStarter = winnerIndex;
    state.auction = null;
    if (!state.propertyDeck.length) beginSelling();
    else beginAuction(nextStarter);
  }

  /* ------------------------------ البيع ------------------------------ */

  function beginSelling() {
    const count = state.players.length;
    const cards = state.currencyDeck.splice(0, count).sort((a, b) => b - a);
    if (!cards.length) {
      finish();
      return;
    }
    state.phase = "selling";
    state.sell = { cards, picks: {}, order: state.players.map((player) => player.index), turn: 0 };
    state.current = 0;
    state.notice = "مرحلة البيع: يعرض كل لاعب عقارًا سريًا، وأعلى عقار يأخذ أعلى ورقة نقدية.";
    apiRef.setStatus("بيع العقارات");
    render();
    settle();
  }

  function chooseProperty(value) {
    if (!state || state.over || state.phase !== "selling" || !state.sell) return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (state.sell.picks[player.index] != null) return false;
    const at = player.properties.indexOf(value);
    if (at < 0) return false;
    player.properties.splice(at, 1);
    state.sell.picks[player.index] = value;
    apiRef.log("<strong>" + esc(player.name) + "</strong> اختار عقارًا قيمته " + ar(value) + " للبيع.", "accent");
    state.notice = player.name + " اختار عقاره. بانتظار بقية اللاعبين.";
    const remaining = state.sell.order.filter((index) => state.sell.picks[index] == null);
    if (remaining.length) {
      state.current = remaining[0];
      render();
      settle();
    } else {
      resolveSelling();
    }
    return true;
  }

  function resolveSelling() {
    if (!state.sell) return;
    const picks = Object.keys(state.sell.picks).map((key) => ({
      player: Number(key),
      value: state.sell.picks[key],
    })).sort((a, b) => b.value - a.value);
    const cards = state.sell.cards.slice().sort((a, b) => b - a);
    picks.forEach((pick, index) => {
      const amount = cards[index];
      const player = state.players[pick.player];
      player.currency.push(amount);
      apiRef.log(
        "<strong>" + esc(player.name) + "</strong> باع عقار " + ar(pick.value) + " مقابل <strong>" + ar(amount) + " ألف</strong>.",
        "good"
      );
    });
    state.sell = null;
    render();
    if (state.players.some((player) => player.properties.length)) {
      setTimeout(() => { if (state && state.phase === "selling") beginSelling(); }, 650);
    } else {
      finish();
    }
  }

  /* ------------------------------ النهاية ------------------------------ */

  function finish() {
    state.over = true;
    state.phase = "over";
    const ranking = state.players.slice().sort((a, b) => {
      if (totalOf(b) !== totalOf(a)) return totalOf(b) - totalOf(a);
      return b.cash - a.cash;
    }).map((player) => ({
      name: player.name,
      value: totalOf(player),
      detail: "نقد " + ar(currencyTotal(player)) + " + بقايا " + ar(player.cash) + " ألف · عقارات " + ar(propertyCount(player)),
    }));
    state.notice = "انتهت اللعبة. الفائز: " + ranking[0].name + " بـ" + ar(ranking[0].value) + " ألف.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت للبيع!",
      text: "الأغنى يفوز: مجموع أوراق البيع النقدية مع المال المتبقي. التعادل يحسمه صاحب أكبر مال متبقٍ.",
      winner: ranking[0].name + " — " + ar(ranking[0].value) + " ألف",
      icon: "🏠",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function aiAuction() {
    if (!state || state.over || state.phase !== "auction" || !state.auction) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    if (state.auction.active.length <= 1) return;
    const highest = state.auction.cards[state.auction.high];
    const cardValue = highest ? highest.value : 10;
    const limit = maxBid(player);
    const cap = Math.min(limit, Math.max(2, Math.round(cardValue * 0.62)));
    if (state.auction.bid >= cap || Math.random() < 0.16) {
      passBid();
      return;
    }
    const next = state.auction.bid + (Math.random() < 0.5 ? 1 : 2);
    bid(Math.min(cap, next));
  }

  function aiSell() {
    if (!state || state.over || state.phase !== "selling" || !state.sell) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    if (!player.properties.length) return;
    const sorted = player.properties.slice().sort((a, b) => b - a);
    const value = sorted.length > 1 && Math.random() < 0.25 ? sorted[1] : sorted[0];
    chooseProperty(value);
  }

  function settle() {
    if (!state || state.over) return;
    if (state.phase === "auction" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiAuction, AI.delay(cur().level, 0.8));
    } else if (state.phase === "selling" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiSell, AI.delay(cur().level, 0.8));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function money(value) {
    return ar(value) + " ألف";
  }

  function auctionCard(slot) {
    const owner = slot.owner != null ? state.players[slot.owner] : null;
    const isHot = state.auction && slot.owner == null && state.auction.cards[state.auction.high] === slot;
    return '<div class="fs-prop ' + (owner ? "is-taken" : "") + (isHot ? " is-hot" : "") + '"' +
      (owner ? ' style="--pc:' + owner.color + '"' : "") + ">" +
      '<span class="fs-prop-value">' + ar(slot.value) + "</span>" +
      '<span class="fs-prop-label">عقار</span>' +
      (owner ? '<span class="fs-prop-owner">' + esc(owner.name) + "</span>" : "") +
      "</div>";
  }

  function currencyCard(value, index) {
    return '<div class="fs-money" style="--i:' + index + '"><span>' + ar(value) + '</span><small>ألف</small></div>';
  }

  function playerPanel(player) {
    return '<article class="fs-player ' + (player.index === state.current ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="xg-avatar">' + ar(player.index + 1) + "</span><strong>" + esc(player.name) + "</strong></span>" +
      '<span class="fs-player-cash">' + money(player.cash) + "</span></div>" +
      '<div class="fs-player-stats"><span>🏠 ' + ar(player.properties.length) + "</span><span>💵 " + ar(currencyTotal(player)) + "</span>" +
      (state.phase === "auction" && player.bid ? '<span class="fs-player-bid">مزايدة ' + ar(player.bid) + "</span>" : "") + "</div>" +
      (player.currency.length ? '<div class="fs-player-money">' + player.currency.slice().sort((a, b) => b - a).map((value) => '<span class="fs-mini-money">' + ar(value) + "</span>").join("") + "</div>" : "") +
      "</article>";
  }

  function auctionPanel() {
    const auction = state.auction;
    const player = cur();
    const highest = auction.cards[auction.high];
    const limit = maxBid(player);
    const inputMin = auction.bid + 1;
    const can = XG.canAct(apiRef, state, player.index, state.over);
    return '<div class="xg-panel fs-auction">' +
      '<div class="xg-spread"><h3>مزاد العقارات</h3><span class="xg-chip is-live">الجولة ' + ar(state.round) + "</span></div>" +
      '<div class="fs-cards">' + auction.cards.map(auctionCard).join("") + "</div>" +
      '<div class="fs-bid-box">' +
      '<div class="fs-bid-head"><span>الدور: <strong>' + esc(player.name) + "</strong></span>" +
      '<span class="fs-bid-amount">أعلى مزايدة: <strong>' + ar(auction.bid) + "</strong> ألف</span></div>" +
      '<p class="xg-note">العقار الأعلى المتبقي: <strong>' + ar(highest ? highest.value : 0) + "</strong> · مالكه عند انتهاء المزاد يأخذه. من يمرّ يأخذ أقل عقار متبقٍ.</p>" +
      '<div class="fs-bid-controls">' +
      '<label class="fs-bid-field"><span>مزايدتك (حتى ' + ar(limit) + ')</span>' +
      '<input type="number" inputmode="numeric" min="' + inputMin + '" max="' + limit + '" step="1" value="' + Math.min(limit, Math.max(inputMin, auction.bid + 1)) + '" data-fs-input ' + (!can ? "disabled" : "") + " /></label>" +
      '<button type="button" class="xg-btn primary" data-fs-bid ' + (!can || limit <= auction.bid ? "disabled" : "") + ">زايد</button>" +
      '<button type="button" class="xg-btn" data-fs-pass ' + (!can ? "disabled" : "") + ">مرّر</button>" +
      "</div>" +
      '<p class="xg-note">لديك ' + money(player.cash) + " نقدًا" + (player.bid ? " و" + money(player.bid) + " مزايدة سابقة" : "") + ". عند التمرير تستعيد نصف مزايدتك فقط.</p>" +
      "</div>" +
      '<p class="fs-last">' + esc(state.notice) + "</p></div>";
  }

  function sellingPanel() {
    const sell = state.sell;
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const picked = Object.keys(sell.picks).length;
    return '<div class="xg-panel fs-selling">' +
      '<div class="xg-spread"><h3>بيع العقارات</h3><span class="xg-chip">اختيار ' + ar(picked) + " / " + ar(state.players.length) + "</span></div>" +
      '<div class="fs-cards fs-money-row">' + sell.cards.map(currencyCard).join("") + "</div>" +
      '<p class="xg-note">أعلى ورقة نقدية تذهب لأعلى عقار معروض، وهكذا حتى آخر ورقة. اختر عقارًا من عقاراتك.</p>' +
      '<div class="fs-sell-head"><span>الدور: <strong>' + esc(player.name) + "</strong></span><span>عقاراتك: " + ar(player.properties.length) + "</span></div>" +
      '<div class="fs-sell-props">' + player.properties.slice().sort((a, b) => b - a).map((value) =>
        '<button type="button" class="fs-prop fs-prop-btn" data-fs-prop="' + value + '" ' + (!can ? "disabled" : "") + ">" +
        '<span class="fs-prop-value">' + ar(value) + "</span><span class=\"fs-prop-label\">اختر للبيع</span></button>"
      ).join("") + "</div>" +
      '<p class="fs-last">' + esc(state.notice) + "</p></div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const seen = state.players[viewSeat()] || cur();
    rootRef.innerHTML =
      '<div class="xg fs">' +
      XG.bar("للبيع!", "اشترِ بأقل، وبِع بأعلى · الأغنى يفوز", [
        XG.chip("الطور", state.phase === "auction" ? "مزاد" : state.phase === "selling" ? "بيع" : "نهاية"),
        XG.chip("نقدك", money(seen.cash), "is-good"),
        XG.chip("عقاراتك", ar(seen.properties.length)),
        XG.chip("محفظتك", ar(currencyTotal(seen))),
      ].join("")) +
      '<div class="fs-layout"><div class="fs-main">' +
      (state.phase === "auction" && state.auction ? auctionPanel() : "") +
      (state.phase === "selling" && state.sell ? sellingPanel() : "") +
      '<div class="xg-panel"><div class="xg-spread"><h3>اللاعبون</h3><span class="xg-chip">' + ar(state.players.length) + " لاعبين</span></div>" +
      '<div class="fs-players">' + state.players.map(playerPanel).join("") + "</div></div>" +
      "</div>" +
      '<aside class="fs-side">' +
      '<div class="xg-panel"><h3>مراحل اللعبة</h3><p class="xg-note"><strong>المزاد:</strong> تُكشف عقارات بعدد اللاعبين، وتتصاعد المزايدة. المنسحب يأخذ أقل عقار متبقٍ ويستعيد نصف ما زايد به. الفائز يأخذ أغلى عقار ويدفع كامل مزايدته.</p>' +
      '<p class="xg-note"><strong>البيع:</strong> يعرض كل لاعب عقارًا. أعلى عقار يأخذ أعلى ورقة نقدية، ثم الذي يليه.</p></div>' +
      '<div class="xg-panel"><h3>النهاية</h3><p class="xg-note">اجمع أوراق البيع مع نقدك المتبقي. الأغنى يفوز، والتعادل يحسمه صاحب أكبر نقد متبقٍ.</p></div>' +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">الأوراق النقدية من ٠ إلى ١٥ ألفًا (بدون ١). بادئ المزاد التالي هو من أخذ أغلى عقار. المال المدفوع لا يعود إلا نصفه عند التمرير.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (event.target.closest("[data-fs-bid]")) {
      const input = rootRef.querySelector("[data-fs-input]");
      bid(input ? input.value : 0);
      return;
    }
    if (event.target.closest("[data-fs-pass]")) { passBid(); return; }
    const prop = event.target.closest("[data-fs-prop]");
    if (prop) chooseProperty(Number(prop.dataset.fsProp));
  }

  const game = {
    id: "for-sale",
    name: "للبيع!",
    en: "FOR SALE",
    icon: "🏠",
    accent: "#c9a45c",
    cardClass: "card-for-sale",
    tagline: "مزاد صاعد على عقارات، ثم بيعها لمن يدفع أكثر. اشترِ رخيصًا وبِع غاليًا.",
    players: "3–6",
    duration: "20–30 دقيقة",
    complexity: "خفيفة",
    minPlayers: 3,
    maxPlayers: 6,
    defaultPlayers: 3,

    options: {
      hint: "نسخة قريبة من الأصل: عقارات ١–٣٠، أوراق نقدية ٠–١٥، ومزاد بنصف استرداد عند التمرير.",
      defaults: {},
      fields: [],
      summary() { return "٣٠ عقارًا · أوراق ٠–١٥ · مزاد وبيع"; },
    },

    rules: {
      goal: "كن الأغنى: اشترِ العقارات بأقل تكلفة ممكنة ثم بيعها بأعلى أوراق نقدية.",
      facts: [["اللاعبون", "٣–٦"], ["العقارات", "١–٣٠"], ["النقد", "٠–١٥ ألفًا"], ["الفائز", "الأغنى"]],
      components: ["٣٠ بطاقة عقار مرقمة ١–٣٠.", "٣٠ ورقة نقدية (٠–١٥ ألفًا، نسختان من كل قيمة).", "عملات نقدية للبداية: ١٨ ألفًا لـ٣–٤ لاعبين، و١٤ ألفًا لـ٥–٦."],
      setup: [
        "تُخلط بطاقات العقارات والنقد في رزمتين منفصلتين.",
        "مع ٣ لاعبين تُحذف ٦ عقارات و٦ أوراق نقدية، ومع ٤ لاعبين تُحذف ٢ و٢.",
        "يأخذ كل لاعب ١٤ أو ١٠ عملات من فئة الألف مع عملتين من فئة الألفين حسب عدد اللاعبين.",
        "تبدأ مرحلة المزاد بكشف عقارات بعدد اللاعبين.",
      ],
      steps: [
        "<strong>المزاد:</strong> يبدأ أحد اللاعبين بمزايدة أو تمرير. كل مزايدة يجب أن تكون أعلى من السابقة. من يمرّ يأخذ أقل عقار متبقٍ ويستعيد نصف مزايدته (تقريبًا لأسفل).",
        "<strong>الفائز:</strong> آخر لاعب لم يمرّ يأخذ أغلى عقار ويدفع كامل مزايدته. من أخذ أغلى عقار يبدأ المزاد التالي.",
        "<strong>البيع:</strong> بعد بيع كل العقارات، تُكشف أوراق نقدية بعدد اللاعبين. يعرض كل لاعب عقارًا سريًا، وأعلى عقار يأخذ أعلى ورقة، وهكذا.",
        "<strong>التكرار:</strong> تتكرر جولات البيع حتى تُبيع كل العقارات.",
        "<strong>النهاية:</strong> يُجمع النقد المتبقي مع أوراق البيع. الأغنى يفوز.",
      ],
      winning: "اللاعب صاحب أعلى مجموع من النقد المتبقي وأوراق البيع. التعادل يحسمه صاحب أكبر نقد متبقٍ.",
      notes: [
        "التمرير دون مزايدة يعني أخذ أقل عقار مجانًا.",
        "المزايدة المسحوبة عند التمرير: يُستعاد نصفها فقط، والباقي يذهب للبنك.",
        "لا يمكن المزايدة بأكثر من نقدك المتبقي مضافًا إليه ما زايدت به سابقًا.",
        "نسخة اللعبة هذه تحاكي القواعد الأساسية دون بطاقات التوسعات.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت للبيع! مع " + ar(state.players.length) + " لاعبين. كل لاعب يملك " + ar(state.players[0].cash) + " ألفًا.", "accent");
      apiRef.setStatus("مزاد العقارات");
      render();
      beginAuction(0);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          bid,
          pass: passBid,
          chooseProperty,
          beginAuction,
          beginSelling,
          maxBid,
          totalOf,
          currencyTotal,
          aiAuction,
          aiSell,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
            settle();
          },
          giveCash(n) { cur().cash += Number(n) || 0; render(); },
          setPhase(phase) {
            if (phase === "selling") beginSelling();
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
        netSeat() { return state && state.phase === "auction" ? state.current : state ? state.current : -1; },
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
