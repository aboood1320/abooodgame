/* ==========================================================================
   لا شكرًا! — لعبة دفع الحظ بالبطاقات والرقائق
   بطاقات ٣–٣٥، رقائق، تمرير بدفع رقاقة، ومجموع النقاط بالأقل.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const START_CHIPS = 11;
  const REMOVE = 9;

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function buildDeck() {
    const cards = [];
    for (let value = 3; value <= 35; value++) cards.push(value);
    const shuffled = U.shuffle(cards);
    return shuffled.slice(0, shuffled.length - REMOVE);
  }

  function makePlayers() {
    return XG.players(apiRef, 5, ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb", "#6f9b6e"])
      .slice(0, Math.max(2, Math.min(5, (apiRef.players || []).length)))
      .map((player, index) => ({
        ...player,
        color: ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb", "#6f9b6e"][index],
        chips: START_CHIPS,
        cards: [],
        score: 0,
      }));
  }

  function newState() {
    const deck = buildDeck();
    const card = deck.pop();
    return {
      players: makePlayers(),
      deck,
      current: 0,
      card,
      pot: 0,
      turn: 1,
      notice: "اسحب قرارك: خذ البطاقة مع رقائقها، أو ادفع رقاقة لتمريرها.",
      last: null,
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function handScore(cards) {
    const sorted = cards.slice().sort((a, b) => a - b);
    const used = new Set();
    let total = 0;
    sorted.forEach((value, index) => {
      if (used.has(index)) return;
      total += value;
      let next = index + 1;
      while (next < sorted.length && sorted[next] === sorted[next - 1] + 1) {
        used.add(next);
        next += 1;
      }
    });
    return total;
  }

  function scoreOf(player) {
    return handScore(player.cards) - player.chips;
  }

  function detailOf(player) {
    return "بطاقات " + ar(handScore(player.cards)) + " · رقائق -" + ar(player.chips) + " · المجموع " + ar(scoreOf(player));
  }

  function canPick(player) {
    if (!state || state.over) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }

  function nextTurn() {
    state.current = (state.current + 1) % state.players.length;
    state.turn += 1;
    const p = cur();
    state.notice = "دور " + p.name + " — البطاقة " + ar(state.card) + " مع " + ar(state.pot) + " رقاقة.";
    apiRef.setStatus("دور " + p.name);
    render();
    settle();
  }

  function reveal() {
    if (!state.deck.length) {
      finish();
      return false;
    }
    state.card = state.deck.pop();
    state.pot = 0;
    return true;
  }

  function take() {
    if (!state || state.over || state.card == null) return false;
    const player = cur();
    if (!canPick(player)) return false;
    player.cards.push(state.card);
    player.chips += state.pot;
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> أخذ البطاقة <strong>" + ar(state.card) + "</strong> مع " +
      ar(state.pot) + " رقاقة.", "good"
    );
    state.last = { text: player.name + " أخذ " + state.card + " مع " + state.pot + " رقاقة." };
    const value = state.card;
    state.card = null;
    state.pot = 0;
    if (!reveal()) return true;
    state.notice = "أخذ " + player.name + " البطاقة " + ar(value) + ". البطاقة التالية " + ar(state.card) + ".";
    nextTurn();
    return true;
  }

  function pass() {
    if (!state || state.over) return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (player.chips < 1) {
      apiRef.toast("لا رقائق لديك. يجب أن تأخذ البطاقة.", "warn");
      take();
      return true;
    }
    player.chips -= 1;
    state.pot += 1;
    apiRef.log("<strong>" + esc(player.name) + "</strong> دفع رقاقة ومرّر البطاقة " + ar(state.card) + ".", "warn");
    state.last = { text: player.name + " مرّر البطاقة " + state.card + " (الرقائق الآن " + state.pot + ")." };
    state.notice = "مرّر " + player.name + " البطاقة. عليها الآن " + ar(state.pot) + " رقاقة.";
    nextTurn();
    return true;
  }

  function finish() {
    state.over = true;
    state.card = null;
    state.players.forEach((player) => { player.score = scoreOf(player); });
    const ranking = state.players.slice().sort((a, b) => a.score - b.score).map((player) => ({
      name: player.name,
      value: player.score,
      detail: detailOf(player),
    }));
    const winner = ranking[0];
    state.notice = "انتهت اللعبة. الفائز: " + winner.name + " بأقل مجموع " + ar(winner.value) + ".";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت لا شكرًا!",
      text: "الأقل نقاطًا يفوز. مجموع البطاقات المتتالية يُحتسب من أصغر رقم في كل سلسلة، ثم تُطرح الرقائق.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🚫",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function takeValue() {
    const player = cur();
    const nextCards = player.cards.concat(state.card);
    const gain = handScore(nextCards) - handScore(player.cards);
    const potValue = state.pot;
    return gain - potValue * 1.15;
  }

  function aiTurn() {
    if (!state || state.over) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const cost = takeValue();
    const missing = state.deck.length === 0;
    if (missing || cost <= 0 || (player.chips < 4 && cost < 4)) take();
    else pass();
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, cur().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiTurn, AI.delay(cur().level, 0.8));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function cardHtml(card, extra) {
    if (card == null) return '<div class="nt-empty">لا بطاقة</div>';
    return '<div class="nt-card' + (extra ? " " + extra : "") + '"><span class="nt-value">' + ar(card) + "</span><span class=\"nt-label\">بطاقة</span></div>";
  }

  function playerPanel(player) {
    const cards = player.cards.slice().sort((a, b) => a - b);
    return '<article class="nt-player ' + (player.index === state.current ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="xg-avatar">' + ar(player.index + 1) + "</span><strong>" + esc(player.name) + "</strong></span>" +
      '<span class="nt-score">' + ar(scoreOf(player)) + "</span></div>" +
      '<div class="nt-player-stats"><span>🎟️ ' + ar(player.cards.length) + "</span><span>🪙 " + ar(player.chips) + "</span></div>" +
      '<div class="nt-player-cards">' + (cards.length ? cards.map((card) => '<span class="nt-mini">' + ar(card) + "</span>").join("") : '<span class="xg-muted">لا بطاقات</span>') + "</div>" +
      '<p class="nt-player-detail">' + esc(detailOf(player)) + "</p></article>";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const seenCan = can && seen.index === player.index;
    rootRef.innerHTML =
      '<div class="xg nt">' +
      XG.bar("لا شكرًا!", "خذ البطاقة أو ادفع رقاقة · الأقل نقاطًا يفوز", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("البطاقة", state.card == null ? "—" : ar(state.card)),
        XG.chip("الرقائق", ar(state.pot), "is-good"),
      ].join("")) +
      '<div class="nt-layout"><div class="nt-main">' +
      '<div class="xg-panel nt-table"><div class="nt-top"><div class="nt-pile">' + cardHtml(state.card) + "</div>" +
      '<div class="nt-pot"><span class="nt-pot-icon">🪙</span><strong>' + ar(state.pot) + '</strong><span>رقاقة على البطاقة</span></div></div>' +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      '<div class="xg-row nt-actions">' +
      '<button type="button" class="xg-btn primary" data-nt-take ' + (!seenCan || state.over || state.card == null ? "disabled" : "") + ">خذ البطاقة والرقائق</button>" +
      '<button type="button" class="xg-btn" data-nt-pass ' + (!seenCan || state.over || seen.chips < 1 ? "disabled" : "") + ">مرّر وادفع رقاقة</button>" +
      "</div>" +
      (state.last ? '<p class="nt-last">' + esc(state.last.text) + "</p>" : "") +
      "</div>" +
      '<div class="xg-panel"><div class="xg-spread"><h3>اللاعبون</h3><span class="xg-chip">' + ar(state.deck.length) + " بطاقة في المخزون</span></div>" +
      '<div class="nt-players">' + state.players.map(playerPanel).join("") + "</div></div>" +
      "</div>" +
      '<aside class="nt-side"><div class="xg-panel"><h3>كيف تُحسب النقاط؟</h3><p class="xg-note">رتّب بطاقاتك تصاعديًا. كل سلسلة أرقام متتالية (مثل ٧-٨-٩) تُحتسب مرة واحدة بأصغر رقم فيها. ثم تُطرح رقائقك من المجموع. الأقل نقاطًا يفوز.</p></div>' +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">كل لاعب يبدأ بـ١١ رقاقة. إذا مرّرت البطاقة تدفع رقاقة واحدة وتنتقل. إذا نفدت رقائقك يجب أن تأخذ. البطاقات المحذوفة من المخزون غير معروفة.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (event.target.closest("[data-nt-take]")) take();
    else if (event.target.closest("[data-nt-pass]")) pass();
  }

  const game = {
    id: "no-thanks",
    name: "لا شكرًا!",
    en: "NO THANKS!",
    icon: "🚫",
    accent: "#c9a45c",
    cardClass: "card-no-thanks",
    tagline: "بطاقات ورقائق وقرار واحد: خذ ما يزيد نقاطك أو ادفع لتمريره.",
    players: "2–5",
    duration: "15–25 دقيقة",
    complexity: "خفيفة",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: بطاقات ٣–٣٥، ١١ رقاقة لكل لاعب، وتمرير بدفع رقاقة.",
      defaults: {},
      fields: [],
      summary() { return "بطاقات ٣–٣٥ · ١١ رقاقة · الأقل يفوز"; },
    },

    rules: {
      goal: "اجمع أقل مجموع نقاط. مجموع البطاقات المتتالية يُحتسب من أصغر رقم في كل سلسلة، ثم تُطرح رقائقك.",
      facts: [["البطاقات", "٣–٣٥"], ["المحذوف", "٩ بطاقات"], ["الرقائق", "١١ لكل لاعب"], ["الفائز", "الأقل نقاطًا"]],
      components: ["بطاقات أرقام من ٣ إلى ٣٥.", "رقائق لكل لاعب.", "مخزون مركزي للبطاقات."],
      setup: ["تُخلط البطاقات ويُحذف ٩ منها دون كشفها.", "يبدأ كل لاعب بـ١١ رقاقة.", "تُكشف بطاقة واحدة وتوضع في المركز."],
      steps: [
        "<strong>دور اللاعب:</strong> إما يأخذ البطاقة مع كل الرقائق الموجودة عليها، أو يدفع رقاقة واحدة ويمرّرها إلى اللاعب التالي.",
        "<strong>النفاد:</strong> من لا يملك رقائق يجب أن يأخذ البطاقة.",
        "<strong>الكشف:</strong> بعد أخذ البطاقة تُكشف البطاقة التالية وتُصفَّر الرقائق عليها.",
        "<strong>النهاية:</strong> تنتهي اللعبة عند نفاد المخزون بعد أخذ آخر بطاقة.",
        "<strong>الحساب:</strong> كل سلسلة متتالية تُحتسب بأصغر رقم فيها، ثم تُطرح الرقائق.",
      ],
      winning: "اللاعب صاحب أقل مجموع نقاط بعد طرح الرقائق يفوز.",
      notes: [
        "البطاقات المتتالية تُحتسب مرة واحدة فقط: ٧-٨-٩ تساوي ٧ وليس ٢٤.",
        "الرقائق على البطاقة تذهب كاملة إلى من يأخذها.",
        "هذه نسخة مطابقة للقواعد الأساسية؛ لا توجد بطاقات إضافية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت لا شكرًا! مع " + ar(state.players.length) + " لاعبين. البطاقة الأولى " + ar(state.card) + ".", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          take,
          pass,
          aiTurn,
          handScore,
          scoreOf,
          giveChips(n) { cur().chips += Number(n) || 0; render(); },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
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
