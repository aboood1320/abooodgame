/* ==========================================================================
   الورق — بصرة ورامي
   لعبة ورق كاملة بالعربية مع اختيار النسخة قبل البدء، لاعبين بشر وكمبيوتر،
   ورسوم أوراق مرخّصة (Kenney — CC0) وحركات سحب وقلب وتوزيع.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const SUITS = {
    spades: { key: "spades", sym: "♠", name: "بستوني", file: "spades", color: "#20303c" },
    hearts: { key: "hearts", sym: "♥", name: "قلوب", file: "hearts", color: "#b83b34" },
    diamonds: { key: "diamonds", sym: "♦", name: "ديناري", file: "diamonds", color: "#b83b34" },
    clubs: { key: "clubs", sym: "♣", name: "سباتي", file: "clubs", color: "#20303c" },
  };
  const SUIT_KEYS = ["spades", "hearts", "diamonds", "clubs"];
  const RANK_LABEL = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (digit) => AR_DIGITS[Number(digit)]);
  }
  function esc(value) {
    return U.escape(value);
  }

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let roundTimer = null;
  let seq = 0;

  /* ------------------------------ الأوراق ------------------------------ */

  function buildDeck(jokers) {
    const deck = [];
    seq = 0;
    SUIT_KEYS.forEach((suit) => {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ id: "c" + seq++, suit, rank, joker: false });
      }
    });
    if (jokers) {
      deck.push({ id: "c" + seq++, suit: null, rank: 1, joker: true, jokerColor: "red" });
      deck.push({ id: "c" + seq++, suit: null, rank: 2, joker: true, jokerColor: "black" });
    }
    return deck;
  }

  const PIP_LAYOUT = {
    2: [[1, 2], [5, 2]],
    3: [[1, 2], [3, 2], [5, 2]],
    4: [[1, 1], [1, 3], [5, 1], [5, 3]],
    5: [[1, 1], [1, 3], [3, 2], [5, 1], [5, 3]],
    6: [[1, 1], [1, 3], [3, 1], [3, 3], [5, 1], [5, 3]],
    7: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3], [5, 1], [5, 3]],
    8: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3], [4, 2], [5, 1], [5, 3]],
    9: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 2], [4, 1], [4, 3], [5, 1], [5, 3]],
    10: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3], [4, 1], [4, 3], [5, 1], [5, 3]],
  };

  function cardFaceHTML(card) {
    if (!card) return "";
    if (card.joker) {
      const red = card.jokerColor !== "black";
      return (
        '<span class="wq-corner wq-corner-tl"><b>J</b><i>★</i></span>' +
        '<span class="wq-corner wq-corner-br"><b>J</b><i>★</i></span>' +
        '<span class="wq-art wq-joker ' + (red ? "is-red" : "is-black") + '">' +
        '<span class="wq-joker-star">✦</span><span class="wq-joker-word">JOKER</span>' +
        '<span class="wq-joker-star is-small">✦</span></span>'
      );
    }
    const suit = SUITS[card.suit];
    const rank = RANK_LABEL[card.rank] || String(card.rank);
    const corner =
      '<span class="wq-corner wq-corner-tl"><b>' + rank + '</b><i>' + suit.sym + "</i></span>" +
      '<span class="wq-corner wq-corner-br"><b>' + rank + '</b><i>' + suit.sym + "</i></span>";
    let art;
    if (card.rank === 1) {
      art = '<span class="wq-ace"><span class="wq-ace-ring"></span><span class="wq-suit-big">' + suit.sym + "</span></span>";
    } else if (card.rank >= 11) {
      const court = card.rank === 13 ? "♚" : card.rank === 12 ? "♛" : "♞";
      art =
        '<span class="wq-court"><span class="wq-court-frame"></span>' +
        '<span class="wq-court-letter">' + rank + "</span>" +
        '<span class="wq-court-emblem" aria-hidden="true">' + court + "</span>" +
        '<span class="wq-court-suit" aria-hidden="true">' + suit.sym + "</span></span>";
    } else {
      const layout = PIP_LAYOUT[card.rank] || [];
      art =
        '<span class="wq-pips">' +
        layout.map((pos) => '<i style="grid-area:' + pos[0] + "/" + pos[1] + '">' + suit.sym + "</i>").join("") +
        "</span>";
    }
    return corner + '<span class="wq-art">' + art + "</span>";
  }

  function cardBackHTML() {
    return (
      '<span class="wq-card-back">' +
      '<span class="wq-back-frame"></span>' +
      '<span class="wq-back-medallion"><span>✦</span></span>' +
      "</span>"
    );
  }

  function cardLabel(card) {
    if (!card) return "ورقة";
    if (card.joker) return "جوكر";
    return (RANK_LABEL[card.rank] || String(card.rank)) + SUITS[card.suit].sym;
  }

  function cardValue(card) {
    if (!card) return 0;
    if (card.joker) return 15;
    if (card.rank === 1) return 1;
    if (card.rank >= 11) return 10;
    return card.rank;
  }

  function basraValue(card) {
    if (!card) return 0;
    if (card.rank === 1) return 11;
    if (card.rank === 13) return 4;
    if (card.rank === 12) return 3;
    if (card.rank === 11) return 2;
    return card.rank;
  }

  function cardHTML(card, opts) {
    const o = opts || {};
    const classes = ["wq-card"];
    if (o.back) classes.push("is-back");
    else if (card) {
      const red = card.joker ? card.jokerColor !== "black" : SUITS[card.suit].color === "#b83b34";
      classes.push(red ? "is-red" : "is-black");
    }
    if (o.selected) classes.push("is-selected");
    if (o.dim) classes.push("is-dim");
    if (o.small) classes.push("is-small");
    if (o.hover) classes.push("is-lift");
    const tag = o.interactive === false ? "span" : "button";
    const attrs = o.interactive === false
      ? ' role="img"'
      : ' type="button" data-wq-card="' + esc(card ? card.id : "") + '"';
    const pieceAttr = o.piece
      ? ' data-fx-piece="' + esc(o.piece) + '" data-fx-enter="' + (o.enter || "pop") + '"'
      : "";
    const face = o.back ? cardBackHTML() : cardFaceHTML(card);
    return (
      "<" + tag + attrs + ' class="' + classes.join(" ") + '"' + pieceAttr +
      ' aria-label="' + esc(o.label || (o.back ? "ورقة مقلوبة" : cardLabel(card))) + '"' +
      ' aria-pressed="' + (o.selected ? "true" : "false") + '">' +
      '<span class="wq-card-face" aria-hidden="true">' + face + "</span>" +
      (o.badge ? '<span class="wq-card-badge">' + esc(o.badge) + "</span>" : "") +
      "</" + tag + ">"
    );
  }

  /* ------------------------------ اللاعبون والأدوار ------------------------------ */

  function localSeat() {
    if (apiRef && apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state ? state.current : 0;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function humanCanAct(player) {
    if (!state || !player || state.over) return false;
    if (state.current !== player.index) return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    return !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index;
  }

  function cur() {
    return state.players[state.current];
  }

  /** لاعب هذا الجهاز: المقعد المحلي في الشبكة، أو صاحب الدور محليًا، و-1 للمشاهد. */
  function viewerPlayer() {
    const index = localSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function nextSeat() {
    state.current = (state.current + 1) % state.players.length;
    state.turn += 1;
    settle();
  }

  function settle() {
    if (!state) return;
    if (state.over) return;
    const player = cur();
    if (!player) return;
    if (player.isCpu) {
      if (!AI.autoAllowed(apiRef, player)) return;
      scheduleAuto(player);
    } else if (isOnline() && apiRef.net.seat !== player.index) {
      return;
    }
    updateStatus();
  }

  function scheduleAuto(player) {
    if (!aiRunner) return;
    aiRunner.clear();
    aiRunner.later(() => {
      if (!state || state.over || state.current !== player.index) return;
      if (state.variant === "basra") basraCpuPlay(player);
      else rummyCpuStep(player);
    }, AI.delay(player.level));
  }

  function updateStatus() {
    if (!apiRef || !state) return;
    if (state.over) return;
    const player = cur();
    if (!player) return;
    apiRef.setStatus("دور " + player.name, "live");
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return apiRef.players.slice(0, 4).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      hand: [],
      captured: [],
      basras: 0,
      roundScore: 0,
      score: 0,
    }));
  }

  function newState(options) {
    const opts = Object.assign({
      variant: "basra",
      handSize: 4,
      target: 101,
      jokers: false,
      jackTakesAll: true,
      basraBonus: 10,
      mostCardsBonus: 7,
      allowLayoff: true,
      needFirstMeld: true,
      sixDrawCount: 1,
      dammiPoints: true,
    }, options || {});
    const variant = (opts.variant === "rummy" || opts.variant === "basra" || opts.variant === "six" || opts.variant === "dammi" || opts.variant === "trex") ? opts.variant : "basra";
    const defaultHand = variant === "rummy" ? 7 : variant === "six" ? 6 : variant === "dammi" ? 6 : variant === "trex" ? 13 : 4;
    return {
      variant,
      handSize: U.clamp(Number(opts.handSize) || defaultHand, 4, 13),
      target: Number(opts.target) || 101,
      jokers: !!opts.jokers,
      jackTakesAll: opts.jackTakesAll !== false,
      basraBonus: Number(opts.basraBonus) >= 0 ? Number(opts.basraBonus) : 10,
      mostCardsBonus: Number(opts.mostCardsBonus) >= 0 ? Number(opts.mostCardsBonus) : 7,
      allowLayoff: opts.allowLayoff !== false,
      needFirstMeld: opts.needFirstMeld !== false,
      sixDrawCount: U.clamp(Number(opts.sixDrawCount) || 1, 1, 3),
      dammiPoints: opts.dammiPoints !== false,
      players: makePlayers(),
      deck: [],
      discard: [],
      table: [],
      melds: [],
      current: 0,
      turn: 1,
      round: 1,
      phase: "play",
      selected: [],
      selectedMeld: null,
      last: null,
      drawnFrom: null,
      notice: "",
      over: false,
      winner: null,
      roundOver: false,
      standings: [],
      trick: [],
      ledSuit: null,
      sixState: null,
    };
  }

  /* ------------------------------ بصرة ------------------------------ */

  function basraDeal() {
    const useJokers = state.variant === "rummy" || state.variant === "dammi" || state.variant === "trex" ? state.jokers : false;
    const deck = U.shuffle(buildDeck(useJokers));
    state.deck = deck;
    state.discard = [];
    state.melds = [];
    state.table = [];
    state.phase = "play";
    state.last = null;
    state.roundOver = false;
    state.selected = [];
    state.selectedMeld = null;
    state.players.forEach((player) => {
      player.hand = [];
      player.captured = [];
      player.basras = 0;
      player.roundScore = 0;
    });
    state.current = (state.round - 1) % state.players.length;
    state.turn = 1;
    const tableCount = state.variant === "six" ? 0 : 4;
    for (let i = 0; i < tableCount && state.deck.length; i++) state.table.push(state.deck.pop());
    for (let r = 0; r < state.handSize; r++) {
      state.players.forEach((player) => {
        if (state.deck.length) player.hand.push(state.deck.pop());
      });
    }
    if (state.variant === "six") {
      while (state.deck.length && state.deck[state.deck.length - 1].rank === 6) {
        const c = state.deck.pop();
        state.deck.unshift(c);
      }
      if (state.deck.length) state.discard.push(state.deck.pop());
      state.phase = "play";
      state.notice = "كوت بو ستة — العب ورقة مساوية أو تالية أو سابقة، أو الورقة ٦.";
    } else {
      state.notice = "الطاولة جاهزة — العب ورقة تطابق رقمًا على الأرض، أو «جاك» لتأخذ كل شيء.";
    }
    if (apiRef) {
      const name = state.variant === "six" ? "الستة" : "بصرة";
      apiRef.log(
        "بدأت جولة " + name + " " + ar(state.round) + " — " + ar(state.handSize) + " أوراق لكل لاعب.",
        "accent"
      );
      if (FX) FX.sound("shuffle");
    }
    settle();
    render();
  }

  function basraCapture(player, card) {
    let captured = [];
    if (card.rank === 11 && state.jackTakesAll !== false) {
      captured = state.table.slice();
      state.table = [];
    } else {
      captured = state.table.filter((item) => item.rank === card.rank);
      if (captured.length) {
        const ids = new Set(captured.map((item) => item.id));
        state.table = state.table.filter((item) => !ids.has(item.id));
      }
    }
    const basra = captured.length > 0 && state.table.length === 0;
    const basraBonus = Number(state.basraBonus) >= 0 ? Number(state.basraBonus) : 10;
    const gained = captured.reduce((sum, item) => sum + basraValue(item), 0) + (basra ? basraBonus : 0);
    if (captured.length) {
      player.captured.push(card, ...captured);
      player.roundScore += gained;
      if (basra) player.basras += 1;
    } else {
      state.table.push(card);
    }
    return { captured, basra, gained };
  }

  function basraPlay(player, card) {
    if (!player || !card) return false;
    const index = player.hand.findIndex((item) => item.id === card.id);
    if (index < 0) return false;

    if (state.variant === "six") {
      const top = state.discard[state.discard.length - 1];
      const ok = !top || card.rank === 6 || card.rank === top.rank || card.rank === top.rank + 1 || card.rank === top.rank - 1 || (card.rank === 1 && top.rank === 13) || (card.rank === 13 && top.rank === 1);
      if (!ok) {
        if (apiRef) apiRef.toast("لا يمكن لعب هذه الورقة.", "warn");
        return false;
      }
      player.hand.splice(index, 1);
      state.discard.push(card);
      if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> لعب " + esc(cardLabel(card)) + " على الرمي.", "accent");
      if (FX) {
        FX.sound("card");
        const hand = rootRef && rootRef.querySelector('.wq-hand .wq-card[data-wq-card="' + card.id + '"]');
        if (hand) FX.animate(hand, [{ transform: "translateY(0)" }, { transform: "translateY(-14px) scale(1.06)" }, { opacity: 0, transform: "translateY(-40px) scale(.9)" }], { duration: 320, fill: "forwards" });
      }
      state.notice = player.name + " لعب " + cardLabel(card) + ".";
      state.selected = [];
      if (player.hand.length === 0) {
        sixEndRound(player);
        return true;
      }
      nextSeat();
      render();
      return true;
    }

    player.hand.splice(index, 1);
    const result = basraCapture(player, card);
    state.last = { seat: player.index, card, captured: result.captured, basra: result.basra, gained: result.gained };

    if (state.deck.length && player.hand.length < state.handSize) {
      const draw = state.deck.pop();
      player.hand.push(draw);
      state.last.drawn = draw;
    }

    const basraBonus = Number(state.basraBonus) >= 0 ? Number(state.basraBonus) : 10;
    if (apiRef) {
      let text = "<strong>" + esc(player.name) + "</strong> لعب " + esc(cardLabel(card));
      if (result.captured.length) {
        text += " وأخذ " + ar(result.captured.length) + " ورقة (+" + ar(result.gained) + ")";
      } else {
        text += " إلى الأرض";
      }
      if (result.basra) text += " — <strong>بصرة!</strong> +" + ar(basraBonus);
      apiRef.log(text, result.basra ? "good" : "accent");
    }
    if (FX) {
      FX.sound(result.captured.length ? "capture" : "card");
      if (result.basra) FX.banner("بصرة! +" + ar(basraBonus), { icon: "✨", tone: "win", duration: 1200 });
      const hand = rootRef && rootRef.querySelector('.wq-hand .wq-card[data-wq-card="' + card.id + '"]');
      if (hand) FX.animate(hand, [{ transform: "translateY(0)" }, { transform: "translateY(-14px) scale(1.06)" }, { opacity: 0, transform: "translateY(-40px) scale(.9)" }], { duration: 320, fill: "forwards" });
    }
    state.notice = result.captured.length
      ? player.name + " أخذ " + ar(result.captured.length) + " ورقة" + (result.basra ? " وحقّق بصرة!" : ".")
      : player.name + " ألقى " + cardLabel(card) + " على الأرض.";
    state.selected = [];

    if (basraRoundDone()) {
      basraEndRound();
      return true;
    }
    nextSeat();
    render();
    return true;
  }

  function basraRoundDone() {
    return state.deck.length === 0 && state.players.every((player) => player.hand.length === 0);
  }

  function basraEndRound() {
    state.phase = "roundEnd";
    state.roundOver = true;
    const counts = state.players.map((player) => player.captured.length);
    const top = Math.max.apply(null, counts);
    const leaders = state.players.filter((player, index) => counts[index] === top && top > 0);
    const mostCardsBonus = Number(state.mostCardsBonus) >= 0 ? Number(state.mostCardsBonus) : 7;
    state.players.forEach((player) => {
      let points = player.captured.reduce((sum, card) => sum + basraValue(card), 0);
      if (leaders.length === 1 && leaders[0] === player) points += mostCardsBonus;
      player.roundScore = points;
      player.score += points;
    });
    if (apiRef) {
      apiRef.log(
        "انتهت جولة بصرة " + ar(state.round) + " — " +
        state.players.map((player) => esc(player.name) + ": " + ar(player.score)).join(" · "),
        "accent"
      );
    }
    const record = state.players.filter((player) => player.score >= state.target);
    if (record.length) {
      finishBasra();
      return;
    }
    state.notice = "انتهت الجولة. جولة جديدة بعد لحظات…";
    if (FX) FX.sound("score");
    render();
    clearTimeout(roundTimer);
    roundTimer = setTimeout(() => {
      if (!state || state.over) return;
      state.round += 1;
      basraDeal();
    }, 1900);
  }

  function finishBasra() {
    const sorted = state.players.slice().sort((a, b) => b.score - a.score || b.basras - a.basras);
    const top = sorted[0];
    const tied = sorted.filter((player) => player.score === top.score);
    if (tied.length > 1) {
      state.notice = "تعادل في الصدارة — جولة فاصلة!";
      if (apiRef) apiRef.log("تعادل في الصدارة — تُلعب جولة فاصلة.", "warn");
      state.target = top.score + 1;
      clearTimeout(roundTimer);
      roundTimer = setTimeout(() => {
        if (!state) return;
        state.round += 1;
        basraDeal();
      }, 1800);
      render();
      return;
    }
    state.over = true;
    state.winner = top;
    state.standings = sorted.map((player) => ({
      name: player.name + (player === top ? " · فائز" : ""),
      value: ar(player.score) + " نقطة · " + ar(player.basras) + " بصرة",
    }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🃏",
        title: "فاز " + top.name + "!",
        text: "بلغ <strong>" + ar(top.score) + "</strong> نقطة قبل الجميع في لعبة بصرة.",
        winner: top.name,
        standings: state.standings,
        tone: "win",
      });
    }
    render();
  }

  function sixEndRound(winner) {
    if (state.over) return;
    state.over = true;
    if (!winner) {
      const sorted = state.players.slice().sort((a, b) => a.hand.length - b.hand.length);
      winner = sorted[0];
    }
    state.winner = winner || null;
    const sorted = state.players.slice().sort((a, b) => a.hand.length - b.hand.length);
    state.standings = sorted.map((player) => ({
      name: player.name + (player === sorted[0] ? " · فائز" : ""),
      value: ar(player.hand.length) + " ورقة متبقية",
    }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🃏",
        title: winner ? "فاز " + winner.name + "!" : "انتهت اللعبة",
        text: "فرغ يده أولًا في كوت بو ستة.",
        winner: winner ? winner.name : "",
        standings: state.standings,
        tone: "win",
      });
    }
    render();
  }

  function basraCpuPlay(player) {
    if (!state || state.over || state.current !== player.index) return;
    if (!player.hand.length) {
      sixEndRound(player);
      return;
    }
    if (state.variant === "six") {
      const top = state.discard[state.discard.length - 1];
      const playable = player.hand.filter((card) => {
        if (!top) return true;
        if (card.rank === 6) return true;
        if (card.rank === top.rank) return true;
        if (card.rank === top.rank + 1 || card.rank === top.rank - 1) return true;
        if (card.rank === 1 && top.rank === 13) return true;
        if (card.rank === 13 && top.rank === 1) return true;
        return false;
      });
      if (playable.length) {
        const card = AI.choose(playable, (item) => item.rank === 6 ? 15 : 8, player.level);
        basraPlay(player, card || playable[0]);
        return;
      }
      if (state.deck.length) {
        const drawCount = U.clamp(Number(state.sixDrawCount) || 1, 1, 3);
        for (let i = 0; i < drawCount && state.deck.length; i++) {
          player.hand.push(state.deck.pop());
        }
        if (FX) FX.sound("draw");
        state.notice = player.name + " سحب " + ar(drawCount) + " ورقة.";
        render();
        setTimeout(() => basraCpuPlay(player), AI.delay(player.level));
        return;
      }
      sixEndRound(null);
      return;
    }
    const cards = player.hand.slice();
    const card = AI.choose(
      cards,
      (item) => {
        const matches = state.table.filter((tableCard) => tableCard.rank === item.rank);
        let score = matches.reduce((sum, tableCard) => sum + basraValue(tableCard), 0) + basraValue(item);
        if (item.rank === 11 && state.jackTakesAll !== false) score += 8 + state.table.reduce((sum, tableCard) => sum + basraValue(tableCard), 0) * 0.5;
        if (matches.length && state.table.length === matches.length) score += 16;
        if (!matches.length && item.rank !== 11) score -= basraValue(item) * 0.7;
        return score + Math.random() * 0.1;
      },
      player.level
    );
    basraPlay(player, card || cards[0]);
  }

  /* ------------------------------ رامي ------------------------------ */

  function rummyDeal() {
    const deck = U.shuffle(buildDeck(state.jokers));
    state.deck = deck;
    state.discard = [];
    state.melds = [];
    state.table = [];
    state.phase = "draw";
    state.selected = [];
    state.selectedMeld = null;
    state.drawnFrom = null;
    state.roundOver = false;
    state.players.forEach((player) => {
      player.hand = [];
      player.captured = [];
      player.roundScore = 0;
    });
    state.current = (state.round - 1) % state.players.length;
    state.turn = 1;
    for (let r = 0; r < state.handSize; r++) {
      state.players.forEach((player) => {
        if (state.deck.length) player.hand.push(state.deck.pop());
      });
    }
    let guard = state.deck.length;
    while (guard-- > 0 && state.deck.length) {
      const card = state.deck.pop();
      if (!card.joker) {
        state.discard.push(card);
        break;
      }
      state.deck.unshift(card);
    }
    state.notice = "اسحب ورقة من الكومة أو خذ المكشوفة، ثم شكّل مجموعات أو ارمِ ورقة لإنهاء دورك.";
    if (apiRef) {
      apiRef.log(
        "بدأت جولة رامي " + ar(state.round) + " — " + ar(state.handSize) + " أوراق لكل لاعب" +
        (state.jokers ? " مع جوكرين" : "") + ". ارمِ ورقة واحدة لإنهاء دورك.",
        "accent"
      );
      if (FX) FX.sound("shuffle");
    }
    settle();
    render();
  }

  function rummyReshuffle() {
    if (!state.discard.length) return false;
    const top = state.discard.pop();
    state.deck = U.shuffle(state.discard);
    state.discard = [top];
    if (apiRef) apiRef.log("أُعيد خلط كومة الرمي إلى كومة السحب.", "warn");
    return state.deck.length > 0;
  }

  function rummyDraw(player, source) {
    if (!player || state.phase !== "draw") return false;
    if (source === "discard") {
      if (!state.discard.length) return false;
      player.hand.push(state.discard.pop());
    } else {
      if (!state.deck.length && !rummyReshuffle()) return false;
      player.hand.push(state.deck.pop());
    }
    state.phase = "play";
    state.drawnFrom = source;
    state.notice = source === "discard" ? "أخذت المكشوفة — شكّل مجموعات ثم ارمِ ورقة." : "سحبت ورقة — شكّل مجموعات ثم ارمِ ورقة.";
    if (FX) FX.sound(source === "discard" ? "draw" : "card");
    render();
    if (player.isCpu) scheduleAuto(player);
    return true;
  }

  function handCards(player, ids) {
    const set = new Set(ids || []);
    return player.hand.filter((card) => set.has(card.id));
  }

  function meldCheck(cards) {
    if (!cards || cards.length < 3) return null;
    const jokers = cards.filter((card) => card.joker);
    const plain = cards.filter((card) => !card.joker);
    if (!plain.length) return null;

    // مجموعة: نفس الرقم بأنواع مختلفة
    if (plain.every((card) => card.rank === plain[0].rank)) {
      const suits = new Set(plain.map((card) => card.suit));
      if (suits.size === plain.length && cards.length <= 4) return { type: "set", rank: plain[0].rank };
      return null;
    }

    // تسلسل: نفس النوع وأرقام متتالية، والجوكر يملأ الفراغات
    const suit = plain[0].suit;
    if (!plain.every((card) => card.suit === suit)) return null;
    const ranks = plain.map((card) => card.rank).sort((a, b) => a - b);
    if (new Set(ranks).size !== ranks.length) return null;
    let gaps = 0;
    for (let i = 1; i < ranks.length; i++) gaps += ranks[i] - ranks[i - 1] - 1;
    const span = ranks[ranks.length - 1] - ranks[0] + 1;
    if (gaps > jokers.length) return null;
    if (span + (jokers.length - gaps) > 13) return null;
    if (cards.length < 3) return null;
    return { type: "run", suit, low: ranks[0], high: ranks[ranks.length - 1] };
  }

  function canLayoff(meld, card) {
    if (!meld || !card) return false;
    if (card.joker) return true;
    if (meld.type === "set") {
      if (card.rank !== meld.rank) return false;
      return !meld.cards.some((item) => item.suit === card.suit);
    }
    if (meld.type === "run") {
      if (card.suit !== meld.cards.find((item) => !item.joker).suit) return false;
      const ranks = meld.cards.filter((item) => !item.joker).map((item) => item.rank);
      return card.rank === Math.min.apply(null, ranks) - 1 || card.rank === Math.max.apply(null, ranks) + 1;
    }
    return false;
  }

  function doMeld(player, ids) {
    const cards = handCards(player, ids);
    const info = meldCheck(cards);
    if (!info) return false;
    const keep = new Set(ids);
    player.hand = player.hand.filter((card) => !keep.has(card.id));
    const meld = { id: "m" + Date.now() + Math.floor(Math.random() * 999), owner: player.index, type: info.type, rank: info.rank, suit: info.suit, cards };
    state.melds.push(meld);
    state.selected = [];
    state.selectedMeld = null;
    if (apiRef) {
      apiRef.log(
        "<strong>" + esc(player.name) + "</strong> أنزل " + (info.type === "set" ? "مجموعة" : "تسلسلًا") +
        " من " + ar(cards.length) + " أوراق: " + cards.map(cardLabel).map(esc).join(" "),
        "good"
      );
    }
    if (FX) FX.sound("score");
    render();
    return true;
  }

  function doLayoff(player, cardId, meldId) {
    const meld = state.melds.find((item) => item.id === meldId);
    const card = player.hand.find((item) => item.id === cardId);
    if (!meld || !card || !canLayoff(meld, card)) return false;
    player.hand = player.hand.filter((item) => item.id !== card.id);
    meld.cards.push(card);
    state.selected = [];
    state.selectedMeld = null;
    if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> أضاف " + esc(cardLabel(card)) + " إلى مجموعة.", "accent");
    if (FX) FX.sound("place");
    render();
    return true;
  }

  function rummyDiscard(player, cardId) {
    const index = player.hand.findIndex((card) => card.id === cardId);
    if (index < 0 || state.phase !== "play") return false;
    if (player.hand.length <= 1) {
      // لا يمكن إنهاء الدور بورقة واحدة إلا إذا كانت هناك مجموعة منزلة
      if (player.hand.length === 1) {
        const card = player.hand[0];
        state.discard.push(card);
        player.hand = [];
        state.selected = [];
        let hasMeld = state.melds.some((meld) => meld.owner === player.index);
        if (!hasMeld) {
          // لا فوز دون مجموعة: أعد الورقة
          player.hand.push(state.discard.pop());
          state.notice = "يجب أن تنزل مجموعة واحدة على الأقل قبل إنهاء الجولة.";
          render();
          return false;
        }
        const gained = state.players
          .filter((other) => other !== player)
          .reduce((sum, other) => sum + other.hand.reduce((s, c) => s + cardValue(c), 0), 0);
        player.roundScore = gained;
        player.score += gained;
        state.roundOver = true;
        state.phase = "roundEnd";
        state.notice = player.name + " أنهى الجولة!";
        if (apiRef) {
          apiRef.log("<strong>" + esc(player.name) + "</strong> أنهى يده وحصل على " + ar(gained) + " نقطة.", "good");
        }
        if (FX) FX.win();
        rummyAfterRound();
        render();
        return true;
      }
      return false;
    }
    const card = player.hand[index];
    player.hand.splice(index, 1);
    state.discard.push(card);
    state.selected = [];
    state.selectedMeld = null;
    state.phase = "draw";
    state.drawnFrom = null;
    state.notice = player.name + " رمى " + cardLabel(card) + ".";
    if (FX) FX.sound("card");
    nextSeat();
    render();
    return true;
  }

  function rummyAfterRound() {
    const top = state.players.slice().sort((a, b) => b.score - a.score)[0];
    if (top.score >= state.target) {
      finishRummy(top);
      return;
    }
    clearTimeout(roundTimer);
    roundTimer = setTimeout(() => {
      if (!state || state.over) return;
      state.round += 1;
      rummyDeal();
    }, 2100);
  }

  function finishRummy(top) {
    state.over = true;
    state.winner = top;
    state.standings = state.players
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((player) => ({
        name: player.name + (player === top ? " · فائز" : ""),
        value: ar(player.score) + " نقطة",
      }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🃏",
        title: "فاز " + top.name + "!",
        text: "بلغ <strong>" + ar(top.score) + "</strong> نقطة في رامي.",
        winner: top.name,
        standings: state.standings,
        tone: "win",
      });
    }
    render();
  }

  /* ------------------------------ ذكاء رامي ------------------------------ */

  function findRunMeld(hand) {
    const jokers = hand.filter((card) => card.joker);
    for (const suit of SUIT_KEYS) {
      const cards = hand.filter((card) => card.suit === suit && !card.joker).sort((a, b) => a.rank - b.rank);
      if (cards.length < 2) continue;
      for (let start = 0; start < cards.length; start++) {
        const run = [cards[start]];
        for (let next = start + 1; next < cards.length && run.length < 6; next++) {
          if (cards[next].rank === run[run.length - 1].rank + 1) run.push(cards[next]);
          else break;
        }
        if (run.length >= 3) return run.slice();
        if (run.length === 2 && jokers.length) return run.concat(jokers[0]);
      }
    }
    return null;
  }

  function findSetMeld(hand) {
    const byRank = new Map();
    hand.forEach((card) => {
      if (card.joker) return;
      const list = byRank.get(card.rank) || [];
      list.push(card);
      byRank.set(card.rank, list);
    });
    let best = null;
    byRank.forEach((list) => {
      if (list.length >= 3 && (!best || list.length > best.length)) best = list.slice(0, 4);
    });
    return best;
  }

  function aiMeldAll(player) {
    let guard = 24;
    while (guard-- > 0 && state && !state.over && state.current === player.index) {
      const set = findSetMeld(player.hand);
      const run = findRunMeld(player.hand);
      const pick = set && run ? (set.length >= run.length ? set : run) : set || run;
      if (pick && pick.length >= 3) {
        doMeld(player, pick.map((card) => card.id));
        continue;
      }
      // إضافة ورقة إلى مجموعة منزلة
      let laid = false;
      for (const meld of state.melds) {
        for (const card of player.hand) {
          if (canLayoff(meld, card)) {
            doLayoff(player, card.id, meld.id);
            laid = true;
            break;
          }
        }
        if (laid) break;
      }
      if (!laid) break;
    }
  }

  function aiDiscard(player) {
    if (!state || state.current !== player.index || state.phase !== "play") return;
    const hand = player.hand.slice();
    if (!hand.length) return;
    const keeps = new Map();
    hand.forEach((card) => {
      if (!card.joker) keeps.set(card.rank, (keeps.get(card.rank) || 0) + 1);
    });
    const target = AI.choose(
      hand,
      (card) => {
        let score = cardValue(card);
        if (card.joker) score += 12;
        if (keeps.get(card.rank) > 1) score += 6;
        if (card.rank >= 11) score += 3;
        return score;
      },
      player.level
    );
    rummyDiscard(player, (target || hand[0]).id);
  }

  function handWouldUse(hand, card) {
    if (!card) return false;
    if (card.joker) return true;
    const sameRank = hand.filter((item) => !item.joker && item.rank === card.rank);
    if (sameRank.length >= 2) return true;
    for (const meld of state.melds) if (canLayoff(meld, card)) return true;
    const suit = hand.filter((item) => item.suit === card.suit && !item.joker);
    if (suit.some((item) => Math.abs(item.rank - card.rank) === 1)) return true;
    return false;
  }

  function rummyCpuStep(player) {
    if (!state || state.over || state.current !== player.index) return;
    if (state.phase === "draw") {
      const top = state.discard[state.discard.length - 1];
      const use = top && handWouldUse(player.hand, top) && AI.chance(player.level, 0.75, 0.9, 0.97);
      rummyDraw(player, use ? "discard" : "deck");
      if (!state || state.over) return;
      aiRunner.later(() => {
        if (!state || state.over || state.current !== player.index) return;
        aiMeldAll(player);
        aiRunner.later(() => {
          if (!state || state.over || state.current !== player.index) return;
          aiDiscard(player);
        }, AI.delay(player.level, 0.6));
      }, AI.delay(player.level, 0.6));
      return;
    }
    if (state.phase === "play") {
      aiMeldAll(player);
      aiDiscard(player);
    }
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["wq-player", "p" + (player.index % 6)];
      if (player.index === state.current && !state.over) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      if (isOnline() && player.index === localSeat()) classes.push("mine");
      let meta;
      if (state.variant === "basra") {
        meta = ar(player.score) + " نقطة · " + ar(player.captured.length) + " ورقة" + (player.basras ? " · " + ar(player.basras) + " بصرة" : "");
      } else {
        meta = ar(player.score) + " نقطة · " + ar(player.hand.length) + " باليد";
      }
      return (
        '<div class="' + classes.join(" ") + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<span class="wq-player-copy"><strong>' + esc(player.name) + "</strong><small>" + (player.isCpu ? "🤖 " : "👤 ") + meta + "</small></span>" +
        (state.variant === "rummy" ? '<span class="wq-player-hand">' + ar(player.hand.length) + "</span>" : "") +
        "</div>"
      );
    }).join("");
  }

  function basraTableHTML() {
    const player = cur();
    const mine = humanCanAct(player);
    if (state.variant === "six") {
      const top = state.discard[state.discard.length - 1];
      const table = top
        ? cardHTML(top, { interactive: false, hover: true, piece: "wq-discard-top", enter: "deal", label: "أعلى الرمي: " + cardLabel(top) })
        : '<span class="wq-empty">ارمِ أول ورقة لبدء اللعب.</span>';
      return (
        '<section class="wq-center wq-basra-center">' +
        '<div class="wq-center-head"><span class="wq-kicker">كوت بو ستة</span><span class="wq-count">رمي: ' + ar(state.discard.length) + "</span></div>" +
        '<div class="wq-table">' + table + "</div>" +
        '<div class="wq-piles">' +
        '<div class="wq-pile"><span>كومة السحب</span><b>' + ar(state.deck.length) + "</b>" + cardHTML(null, { back: true, interactive: false, small: true }) + "</div>" +
        '<div class="wq-pile"><span>السحب</span><b>' + ar(state.sixDrawCount || 1) + "</b></div>" +
        "</div>" +
        '<p class="wq-rule-line">العب مساويًا أو أعلى أو أقل بدرجة واحدة، أو <strong>الستة ٦</strong> لتفوز بأي شيء.</p>' +
        (mine ? "" : '<p class="wq-turn-note">دور ' + esc(player.name) + " — " + (player.isCpu ? "الكمبيوتر يفكّر…" : "بانتظار اللاعب.") + "</p>") +
        "</section>"
      );
    }
    const table = state.table.length
      ? state.table.map((card) => cardHTML(card, { interactive: false, hover: true, piece: "wq-table-" + card.id, enter: "deal", label: "على الأرض: " + cardLabel(card) })).join("")
      : '<span class="wq-empty">الأرض فارغة — أي ورقة تُلعب الآن تُترك عليها.</span>';
    return (
      '<section class="wq-center wq-basra-center">' +
      '<div class="wq-center-head"><span class="wq-kicker">على الأرض</span><span class="wq-count">' + ar(state.table.length) + " ورقة</span></div>" +
      '<div class="wq-table">' + table + "</div>" +
      '<div class="wq-piles">' +
      '<div class="wq-pile"><span>كومة السحب</span><b>' + ar(state.deck.length) + "</b>" + cardHTML(null, { back: true, interactive: false, small: true }) + "</div>" +
      '<div class="wq-pile"><span>آخر حركة</span><b>' + (state.last ? esc(cardLabel(state.last.card)) : "—") + "</b></div>" +
      "</div>" +
      '<p class="wq-rule-line">' + (state.jackTakesAll !== false ? "الجاك يأخذ كل الأرض" : "الجاك يأخذ المطابق فقط") + '. ' + (state.basraBonus > 0 ? "أخذ كل الأرض بضربة واحدة = بصرة +" + ar(state.basraBonus) + "." : "") + "</p>" +
      (mine ? "" : '<p class="wq-turn-note">دور ' + esc(player.name) + " — " + (player.isCpu ? "الكمبيوتر يفكّر…" : "بانتظار اللاعب.") + "</p>") +
      "</section>"
    );
  }

  function basraHandHTML() {
    const player = viewerPlayer();
    if (!player) {
      return '<section class="wq-hand-area"><div class="wq-hand-head"><span class="wq-kicker">👁 مشاهدة</span>' +
        '<span class="wq-count">أوراق اللاعبين مخفية</span></div>' +
        '<div class="wq-hand"><span class="wq-empty">تتابع الطاولة مباشرة — لا تُعرض أوراق الآخرين.</span></div></section>';
    }
    const mine = humanCanAct(player);
    const hand = player.hand.length
      ? player.hand.map((card) => cardHTML(card, { selected: false, dim: !mine, piece: "wq-hand-" + card.id, enter: "deal", label: cardLabel(card) + (mine ? " — العب" : "") })).join("")
      : '<span class="wq-empty">لا أوراق في اليد.</span>';
    return (
      '<section class="wq-hand-area">' +
      '<div class="wq-hand-head"><span class="wq-kicker">يد ' + esc(player.name) + "</span>" +
      '<span class="wq-count">' + ar(player.hand.length) + " من " + ar(state.handSize) + "</span></div>" +
      '<div class="wq-hand' + (mine ? " is-live" : "") + '">' + hand + "</div>" +
      (mine
        ? (state.variant === "six"
            ? '<p class="wq-hint">اضغط ورقة للعبها. إذا لم تجد مطابقة، اسحب من الكومة.</p>'
            : '<p class="wq-hint">اضغط ورقة للعبها. طابق الرقم لأخذ الأوراق، أو العب جاك لأخذ الكل.</p>')
        : '<p class="wq-hint">' + (state.current === player.index
            ? "بانتظار " + esc(player.name) + "…"
            : "يدك محفوظة — تشاهد دور " + esc(state.players[state.current].name) + " الآن.") + "</p>") +
      "</section>"
    );
  }

  function rummyPilesHTML() {
    const player = cur();
    const mine = humanCanAct(player);
    const phase = state.phase;
    const top = state.discard[state.discard.length - 1];
    return (
      '<section class="wq-center wq-rummy-center">' +
      '<div class="wq-piles">' +
      '<button type="button" class="wq-pile-card' + (mine && phase === "draw" ? " is-live" : "") + '" data-wq-act="draw-deck" aria-label="اسحب من الكومة">' +
      cardHTML(null, { back: true, interactive: false, small: true }) +
      '<span class="wq-pile-label">السحب<b>' + ar(state.deck.length) + "</b></span></button>" +
      '<button type="button" class="wq-pile-card' + (mine && phase === "draw" ? " is-live" : "") + '" data-wq-act="draw-discard" aria-label="خذ المكشوفة">' +
      (top ? cardHTML(top, { interactive: false, small: true, piece: "wq-discard-" + top.id, enter: "deal" }) : cardHTML(null, { back: true, interactive: false, small: true })) +
      '<span class="wq-pile-label">المكشوفة<b>' + ar(state.discard.length) + "</b></span></button>" +
      "</div>" +
      '<p class="wq-turn-note">' + (phase === "draw"
        ? (mine ? "دورك: اسحب ورقة لبدء دورك." : "بانتظار " + esc(player.name) + " ليسحب…")
        : (mine ? "اختر أوراقًا لتشكيل مجموعة، أو ارمِ ورقة لإنهاء دورك." : "بانتظار " + esc(player.name) + "…")) + "</p>" +
      "</section>"
    );
  }

  function meldsHTML() {
    if (!state.melds.length) {
      return '<div class="wq-melds-empty">لا مجموعات على الطاولة بعد. أنزل ٣ أوراق متطابقة أو متتالية على الأقل.</div>';
    }
    return state.melds.map((meld) => {
      const selected = state.selectedMeld === meld.id;
      const owner = state.players[meld.owner];
      return (
        '<div class="wq-meld' + (selected ? " is-selected" : "") + '" data-wq-meld="' + esc(meld.id) + '" role="button" tabindex="0" aria-pressed="' + (selected ? "true" : "false") + '">' +
        '<span class="wq-meld-label">' + (meld.type === "set" ? "مجموعة" : "تسلسل") + " · " + esc(owner ? owner.name : "") + "</span>" +
        '<span class="wq-meld-cards">' + meld.cards.map((card) => cardHTML(card, { interactive: false, small: true, piece: "wq-meld-" + meld.id + "-" + card.id, enter: "rise", label: cardLabel(card) })).join("") + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function rummyHandHTML() {
    const player = viewerPlayer();
    if (!player) {
      return '<section class="wq-hand-area"><div class="wq-hand-head"><span class="wq-kicker">👁 مشاهدة</span>' +
        '<span class="wq-count">أوراق اللاعبين مخفية</span></div>' +
        '<div class="wq-hand"><span class="wq-empty">تتابع المجموعات على الطاولة مباشرة — لا تُعرض أوراق الآخرين.</span></div></section>';
    }
    const mine = humanCanAct(player);
    const selected = new Set(state.selected);
    const hand = player.hand.length
      ? player.hand.map((card) => cardHTML(card, {
          selected: selected.has(card.id),
          dim: !mine,
          piece: "wq-hand-" + card.id,
          enter: "deal",
          label: cardLabel(card) + (mine ? " — اختر" : ""),
        })).join("")
      : '<span class="wq-empty">اليد فارغة.</span>';
    const selectedCards = player.hand.filter((card) => selected.has(card.id));
    const canMeld = mine && state.phase === "play" && !!meldCheck(selectedCards);
    const canLay = mine && state.phase === "play" && selectedCards.length === 1 && !!state.selectedMeld;
    return (
      '<section class="wq-hand-area">' +
      '<div class="wq-hand-head"><span class="wq-kicker">يد ' + esc(player.name) + "</span>" +
      '<span class="wq-count">' + ar(player.hand.length) + " ورقة · " + ar(selectedCards.reduce((sum, c) => sum + cardValue(c), 0)) + " نقطة</span></div>" +
      '<div class="wq-hand' + (mine ? " is-live" : "") + '">' + hand + "</div>" +
      (mine
        ? '<div class="wq-actions">' +
          '<button type="button" class="bg-btn small" data-wq-act="meld"' + (canMeld ? "" : " disabled") + ">🧩 أنزل مجموعة</button>" +
          '<button type="button" class="bg-btn small" data-wq-act="layoff"' + (canLay ? "" : " disabled") + ">➕ أضف إلى مجموعة</button>" +
          '<button type="button" class="bg-btn small primary" data-wq-act="discard"' + (selectedCards.length === 1 && state.phase === "play" ? "" : " disabled") + ">🗑 ارمِ ورقة</button>" +
          "</div>" +
          '<p class="wq-hint">اختر ٣ أوراق أو أكثر لتشكيل مجموعة/تسلسل. اختر ورقة واحدة ثم اضغط على مجموعة منزلة لإضافتها.</p>'
        : '<p class="wq-hint">' + (state.current === player.index
            ? "بانتظار " + esc(player.name) + "…"
            : "يدك محفوظة — تشاهد دور " + esc(state.players[state.current].name) + " الآن.") + "</p>") +
      "</section>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const isBasra = state.variant === "basra" || state.variant === "six";
    const player = cur();
    const turnName = player ? player.name : "";
    const online = isOnline();
    let variantLabel = "بصرة";
    if (state.variant === "rummy") variantLabel = "رامي";
    else if (state.variant === "six") variantLabel = "كوت بو ستة";
    let variantDesc = "اجمع الأوراق واصنع بصرة — حتى " + ar(state.target) + " نقطة";
    if (state.variant === "rummy") variantDesc = "شكّل مجموعات وتسلسلات — حتى " + ar(state.target) + " نقطة";
    else if (state.variant === "six") variantDesc = "ألعب مساويًا أو تاليًا أو سابقًا أو ٦ — أول من يفرغ يده يفوز";
    const top = (
      '<div class="wq-top">' +
      '<div class="wq-brand"><span class="wq-emblem" aria-hidden="true">🃏</span><div><strong>الورق · ' + variantLabel + "</strong>" +
      "<small>" + variantDesc + "</small></div></div>" +
      '<div class="wq-pills">' +
      '<span class="wq-pill">جولة <b>' + ar(state.round) + "</b></span>" +
      '<span class="wq-pill">دور <b>' + esc(turnName) + "</b></span>" +
      '<span class="wq-pill">' + (state.variant === "six" ? "رمي <b>" + ar(state.discard.length) + "</b>" : isBasra ? "ورق الأرض <b>" + ar(state.table.length) + "</b>" : "اليد <b>" + ar(player ? player.hand.length : 0) + "</b>") + "</span>" +
      (online ? '<span class="wq-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>"
    );

    const side = '<aside class="wq-side"><div class="wq-side-head"><span class="wq-kicker">اللاعبون</span></div><div class="wq-players">' + playersHTML() + "</div>" +
      '<div class="wq-notice">' + esc(state.notice) + "</div></aside>";
    const body = isBasra
      ? '<div class="wq-grid">' +
        '<div class="wq-board">' + basraTableHTML() + basraHandHTML() + "</div>" +
        side + "</div>"
      : '<div class="wq-grid">' +
        '<div class="wq-board">' +
        '<div class="wq-melds-head"><span class="wq-kicker">المجموعات على الطاولة</span><span class="wq-count">' + ar(state.melds.length) + "</span></div>" +
        '<div class="wq-melds">' + meldsHTML() + "</div>" +
        rummyPilesHTML() + rummyHandHTML() +
        "</div>" +
        side + "</div>";

    rootRef.innerHTML = '<div class="wq-game' + (state.over ? " is-over" : "") + '">' + top + body + "</div>";
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (!state || state.over) return;
    const meldNode = event.target.closest ? event.target.closest("[data-wq-meld]") : null;
    if (meldNode) {
      const id = meldNode.getAttribute("data-wq-meld");
      state.selectedMeld = state.selectedMeld === id ? null : id;
      if (FX) FX.sound("select");
      render();
      return;
    }
    const actionNode = event.target.closest ? event.target.closest("[data-wq-act]") : null;
    if (actionNode) {
      const action = actionNode.getAttribute("data-wq-act");
      const player = cur();
      if (!humanCanAct(player)) return;
      if (action === "draw-deck") {
        if (state.variant === "six") {
          const top = state.discard[state.discard.length - 1];
          const hasPlayable = player.hand.some((card) => {
            if (!top) return true;
            if (card.rank === 6) return true;
            if (card.rank === top.rank) return true;
            if (card.rank === top.rank + 1 || card.rank === top.rank - 1) return true;
            if (card.rank === 1 && top.rank === 13) return true;
            if (card.rank === 13 && top.rank === 1) return true;
            return false;
          });
          if (hasPlayable) {
            if (apiRef) apiRef.toast("لديك ورقة قابلة للعب، العبها مباشرة.", "warn");
            return;
          }
          const drawCount = U.clamp(Number(state.sixDrawCount) || 1, 1, 3);
          for (let i = 0; i < drawCount && state.deck.length; i++) {
            player.hand.push(state.deck.pop());
          }
          if (FX) FX.sound("draw");
          state.notice = player.name + " سحب " + ar(drawCount) + " ورقة.";
          render();
          setTimeout(() => {
            if (!state || state.over || state.current !== player.index) return;
            basraCpuPlay(player);
          }, 250);
          return;
        }
        rummyDraw(player, "deck");
      }
      else if (action === "draw-discard") {
        if (state.variant === "six") {
          if (!state.discard.length) return;
          const card = state.discard.pop();
          player.hand.push(card);
          if (FX) FX.sound("draw");
          state.notice = player.name + " أخذ ورقة الرمي.";
          render();
          return;
        }
        rummyDraw(player, "discard");
      }
      else if (action === "meld") {
        if (doMeld(player, state.selected)) { /* تم */ }
        else { if (FX) FX.sound("error"); if (apiRef) apiRef.toast("الأوراق المختارة لا تشكّل مجموعة صحيحة.", "warn"); }
      } else if (action === "layoff") {
        if (state.selected.length === 1 && state.selectedMeld) {
          if (state.allowLayoff === false) { if (apiRef) apiRef.toast("إضافة الأوراق غير مفعّلة في هذه القواعد.", "warn"); return; }
          if (!doLayoff(player, state.selected[0], state.selectedMeld)) {
            if (FX) FX.sound("error");
            if (apiRef) apiRef.toast("هذه الورقة لا تُضاف إلى المجموعة المختارة.", "warn");
          }
        } else if (apiRef) apiRef.toast("اختر ورقة واحدة ثم اضغط على مجموعة منزلة.", "warn");
      } else if (action === "discard") {
        if (state.selected.length === 1) rummyDiscard(player, state.selected[0]);
        else if (apiRef) apiRef.toast("اختر ورقة واحدة لرميها.", "warn");
      }
      return;
    }
    const cardNode = event.target.closest ? event.target.closest("[data-wq-card]") : null;
    if (!cardNode) return;
    const cardId = cardNode.getAttribute("data-wq-card");
    if (!cardId) return;
    const player = cur();
    if (!humanCanAct(player)) return;

    if (state.variant === "basra" || state.variant === "six") {
      const card = player.hand.find((item) => item.id === cardId);
      if (card) {
        if (state.variant === "six") {
          const top = state.discard[state.discard.length - 1];
          const ok = !top || card.rank === 6 || card.rank === top.rank || card.rank === top.rank + 1 || card.rank === top.rank - 1 || (card.rank === 1 && top.rank === 13) || (card.rank === 13 && top.rank === 1);
          if (!ok) {
            if (apiRef) apiRef.toast("لا يمكن لعب هذه الورقة. اسحب من الكومة إذا لم تجد مطابقة.", "warn");
            return;
          }
        }
        basraPlay(player, card);
      }
      return;
    }
    if (state.phase === "draw") {
      if (apiRef) apiRef.toast("اسحب ورقة أولًا لبدء دورك.", "warn");
      return;
    }
    const index = state.selected.indexOf(cardId);
    if (index >= 0) state.selected.splice(index, 1);
    else if (state.selected.length < 6) state.selected.push(cardId);
    if (FX) FX.sound("select");
    render();
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const OPTIONS = {
    variant: "basra",
    handSize: 4,
    target: 101,
    jokers: false,
    jackTakesAll: true,
    basraBonus: 10,
    mostCardsBonus: 7,
    allowLayoff: true,
    needFirstMeld: true,
    sixDrawCount: 1,
  };

  const game = {
    id: "waraq",
    name: "الورق",
    en: "CARDS",
    icon: "🃏",
    accent: "#ef6f68",
    cardClass: "card-waraq",
    tagline: "بصرة، رامي، وكوت بو ستة على طاولة واحدة: اجمع الأوراق أو شكّل مجموعات، مع مرونة أكبر في القوانين.",
    players: "2–4",
    duration: "20–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "اختر النسخة والقواعد قبل توزيع الأوراق. تنتقل الخيارات نفسها إلى الغرفة الجماعية.",
      defaults: OPTIONS,
      fields: [
        {
          key: "variant",
          label: "نسخة اللعب",
          type: "seg",
          choices: [
            { value: "basra", label: "بصرة" },
            { value: "rummy", label: "رامي" },
            { value: "six", label: "كوت بو ستة" },
          ],
        },
        {
          key: "handSize",
          label: "الأوراق الموزعة",
          type: "seg",
          when: (o) => o.variant === "basra" || o.variant === "six",
          choices: [
            { value: 4, label: "٤" },
            { value: 6, label: "٦" },
            { value: 8, label: "٨" },
          ],
        },
        {
          key: "handSize",
          label: "أوراق اليد",
          type: "seg",
          when: (o) => o.variant === "rummy",
          choices: [
            { value: 7, label: "٧" },
            { value: 10, label: "١٠" },
          ],
        },
        {
          key: "sixDrawCount",
          label: "سحب عند عدم المطابقة",
          type: "seg",
          when: (o) => o.variant === "six",
          choices: [
            { value: 1, label: "١" },
            { value: 2, label: "٢" },
            { value: 3, label: "٣" },
          ],
        },
        {
          key: "jackTakesAll",
          label: "الجاك يأخذ كل الأرض",
          type: "toggle",
          when: (o) => o.variant === "basra",
        },
        {
          key: "basraBonus",
          label: "مكافأة البصرة",
          type: "seg",
          when: (o) => o.variant === "basra",
          choices: [
            { value: 0, label: "٠" },
            { value: 10, label: "١٠" },
            { value: 15, label: "١٥" },
          ],
        },
        {
          key: "mostCardsBonus",
          label: "مكافأة الأكثر جمعًا",
          type: "seg",
          when: (o) => o.variant === "basra",
          choices: [
            { value: 0, label: "٠" },
            { value: 7, label: "٧" },
            { value: 10, label: "١٠" },
          ],
        },
        {
          key: "allowLayoff",
          label: "إضافة إلى المجموعات",
          type: "toggle",
          when: (o) => o.variant === "rummy",
        },
        {
          key: "target",
          label: "هدف النقاط",
          type: "seg",
          choices: [
            { value: 51, label: "٥١" },
            { value: 101, label: "١٠١" },
            { value: 151, label: "١٥١" },
            { value: 201, label: "٢٠١" },
          ],
        },
        {
          key: "jokers",
          label: "جوكران (رامي فقط)",
          type: "toggle",
          when: (o) => o.variant === "rummy",
        },
      ],
      onChange(options, key) {
        if (key === "variant") {
          if (options.variant === "rummy") options.handSize = 7;
          else if (options.variant === "six") options.handSize = 6;
          else options.handSize = 4;
        }
      },
      summary(options) {
        if (options.variant === "rummy") {
          return "رامي · " + ar(options.handSize) + " أوراق" + (options.jokers ? " + جوكران" : "") + " · حتى " + ar(options.target) + " نقطة";
        }
        if (options.variant === "six") {
          return "كوت بو ستة · " + ar(options.handSize) + " أوراق لكل لاعب · سحب " + ar(options.sixDrawCount || 1);
        }
        return "بصرة · " + ar(options.handSize) + " أوراق لكل لاعب · حتى " + ar(options.target) + " نقطة";
      },
    },

    rules: {
      goal: "اجمع أعلى مجموع نقاط على مدى عدة جولات. في بصرة تجمع الأوراق من الأرض، وفي رامي تشكّل مجموعات وتسلسلات.",
      facts: [["النسخ", "بصرة / رامي / كوت بو ستة"], ["الأوراق", "٥٢ ورقة (+ جوكران اختياريان)"], ["الأرض", "٤ أوراق في بصرة"], ["الهدف", "قابل للاختيار"]],
      components: [
        "مجموعة أوراق فرنسية من ٥٢ ورقة (A–K في أربعة أنواع)، ويمكن إضافة جوكرين في رامي.",
        "كومة سحب، وكومة رمي، وأوراق مكشوفة على الأرض.",
        "يد سرّية لكل لاعب، وسجل نقاط لجولات متعددة.",
      ],
      setup: [
        "اختر النسخة (بصرة أو رامي أو كوت بو ستة) وعدد الأوراق الموزعة والقوانين قبل بدء اللعبة.",
        "في بصرة: تُوضع ٤ أوراق مكشوفة على الأرض، ويُوزّع ٤ أوراق (أو ٦/٨ حسب الاختيار) لكل لاعب.",
        "في رامي: يُوزّع ٧ أوراق (أو ١٠) لكل لاعب، وتُكشف ورقة واحدة بجوار كومة السحب.",
        "في كوت بو ستة: يُوزّع ٦ أوراق لكل لاعب، وتُكشف ورقة على كومة الرمي للبدء.",
        "يلعب اللاعبون بالترتيب، ويدور الدور مع عقارب الساعة.",
      ],
      steps: [
        "<strong>بصرة — دورك:</strong> العب ورقة واحدة من يدك. إذا طابق رقمها رقم ورقة على الأرض، خذ الورقتين. يمكن تعديل تأثير الجاك والبصرة من الخيارات.",
        "<strong>بصرة — الجاك:</strong> يأخذ جميع الأوراق الموجودة على الأرض دفعة واحدة حسب الإعداد.",
        "<strong>بصرة — البصرة:</strong> إذا أخذت كل أوراق الأرض بضربة واحدة، تحصل على مكافأة قابلة للتعديل.",
        "<strong>بصرة — السحب:</strong> بعد اللعب، اسحب ورقة من الكومة إن توفرت حتى تعود يدك إلى حجمها.",
        "<strong>رامي — السحب:</strong> ابدأ دورك بسحب ورقة من الكومة أو بأخذ الورقة المكشوفة.",
        "<strong>رامي — المجموعات:</strong> أنزل ٣ أوراق أو أكثر: مجموعة بنفس الرقم بأنواع مختلفة، أو تسلسلًا بنفس النوع بأرقام متتالية. يمكنك تفعيل/تعطيل إضافة الأوراق للمجموعات.",
        "<strong>رامي — إنهاء الدور:</strong> ارمِ ورقة واحدة إلى كومة الرمي. إذا فرغت يدك بعد الرمي ولديك مجموعة منزلة على الأقل، تنتهي الجولة.",
        "<strong>الستة — اللعب:</strong> العب ورقة مساوية، أو أعلى، أو أقل برتبة واحدة من أعلى رمية، أو الورقة ٦ التي يمكن لعبها على أي شيء. أول من يفرغ يده يفوز.",
      ],
      winning: "في بصرة: تُحتسب قيمة الأوراق المجموعة مع مكافأة البصرة ومكافأة الأكثر جمعًا حسب الإعدادات. أول لاعب يبلغ هدف النقاط بعد نهاية جولة يفوز. في رامي: من ينهي يده يحصل على مجموع نقاط أوراق الخصوم المتبقية، وأول من يبلغ الهدف يفوز. في كوت بو ستة: أول من يفرغ يده يفوز فورًا.",
      notes: [
        "النسخة الرقمية تلعب جولات متتالية تلقائيًا حتى يبلغ أحد اللاعبين هدف النقاط المختار.",
        "في بصرة لا توجد أفضلية للسبعة؛ الورقة الخاصة الوحيدة هي الجاك.",
        "في رامي يمكن استخدام الجوكر بديلًا لأي ورقة عند تشكيل المجموعات.",
        "يد اللاعب الحالي فقط تظهر على الشاشة؛ تُخفى أيدي الآخرين وتُعرض أعداد أوراقهم.",
        "الأوراق المستخدمة من حزمة Kenney المرخّصة CC0، والحركات من طبقة المؤثرات المشتركة.",
      ],
    },

    rulesFor(options) {
      const opts = Object.assign({}, OPTIONS, options || {});
      if (opts.variant !== "rummy") return this.rules;
      return {
        variantName: "رامي",
        goal: "كن أول من يبلغ هدف النقاط. في كل دور اسحب ورقة، ثم أنزل مجموعات أو تسلسلات، وأضف أوراقًا إلى المجموعات، وارمِ ورقة واحدة لإنهاء دورك. من يفرغ يده أولًا يجمع نقاط أوراق الخصوم.",
        facts: [["الأوراق الموزعة", ar(opts.handSize)], ["الهدف", ar(opts.target) + " نقطة"], ["الجوكر", opts.jokers ? "مفعّل" : "معطّل"], ["اللاعبون", "٢–٤"]],
        components: [
          "٥٢ ورقة فرنسية، ويُضاف جوكران عند تفعيل الخيار.",
          "كومة سحب وكومة رمي مكشوفة.",
          "يد سرّية لكل لاعب، ومجموعات مكشوفة على الطاولة.",
        ],
        setup: [
          "يُوزّع " + ar(opts.handSize) + " أوراق لكل لاعب، وتُكشف ورقة واحدة بجوار كومة السحب.",
          "يبدأ اللاعب الأول بمرحلة السحب، ثم ينتقل الدور بالترتيب.",
          "إذا نفدت كومة السحب، تُخلط كومة الرمي (عدا الورقة العليا) لتشكيل كومة جديدة.",
        ],
        steps: [
          "<strong>السحب:</strong> اسحب من الكومة أو خذ الورقة المكشوفة، ثم انتقل إلى مرحلة اللعب.",
          "<strong>المجموعة:</strong> ٣ أو ٤ أوراق بنفس الرقم بأنواع مختلفة. لا تُكرر الورقة نفسها في المجموعة.",
          "<strong>التسلسل:</strong> ٣ أوراق متتالية على الأقل بنفس النوع. الجوكر يملأ فراغًا في التسلسل.",
          "<strong>الإضافة:</strong> اختر ورقة واحدة ثم اضغط على مجموعة منزلة لتضيفها إن كانت متوافقة.",
          "<strong>الإنهاء:</strong> ارمِ ورقة واحدة. إذا فرغت يدك بعد الرمي ولديك مجموعة منزلة على الأقل، تنتهي الجولة وتحصل على مجموع أوراق الخصوم.",
        ],
        winning: "تنتهي الجولة عندما يفرغ أحد اللاعبين يده بعد الرمي ولديه مجموعة منزلة واحدة على الأقل. يحصل على مجموع قيم أوراق الخصوم المتبقية (A=١، والأرقام بقيمتها، والصور=١٠، والجوكر=١٥). أول لاعب يبلغ " + ar(opts.target) + " نقطة يفوز.",
        notes: [
          "لا يمكن إنهاء الجولة قبل إنزال مجموعة واحدة على الأقل.",
          "الجوكر مرن في المجموعات والتسلسلات لكن قيمته عالية إذا بقي في اليد.",
          "الأوراق المكشوفة والمجموعات مشتركة ويمكن الإضافة إليها من أي لاعب.",
        ],
      };
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(roundTimer);

      state = newState(api.options || {});
      let variantName = "بصرة";
      if (state.variant === "rummy") variantName = "رامي";
      else if (state.variant === "six") variantName = "كوت بو ستة";
      apiRef.log(
        "بدأت لعبة الورق — نسخة <strong>" + variantName + "</strong> مع " +
        ar(state.players.length) + " لاعبين.",
        "accent"
      );

      if (state.variant === "basra" || state.variant === "six") basraDeal();
      else rummyDeal();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render,
          basraPlay,
          basraDeal,
          rummyDraw,
          doMeld,
          doLayoff,
          rummyDiscard,
          meldCheck,
          canLayoff,
          cardValue,
          basraValue,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
          },
          setPhase(phase) { if (state) { state.phase = phase; render(); } },
          giveHand(index, cards) {
            if (!state || !state.players[index]) return;
            state.players[index].hand = cards.map((item, i) => {
              const rank = item[1];
              const suit = item[0];
              return { id: "x" + index + "_" + i + "_" + Date.now(), suit, rank, joker: false };
            });
            render();
          },
          SUITS,
        };
      }

      rootRef.addEventListener("click", handleClick);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          if (aiRunner) aiRunner.clear();
          clearTimeout(roundTimer);
          state = BG.netCodec.decode(data);
          state.players.forEach((player) => {
            player.hand = Array.isArray(player.hand) ? player.hand : [];
            player.captured = Array.isArray(player.captured) ? player.captured : [];
          });
          state.deck = Array.isArray(state.deck) ? state.deck : [];
          state.discard = Array.isArray(state.discard) ? state.discard : [];
          state.table = Array.isArray(state.table) ? state.table : [];
          state.melds = Array.isArray(state.melds) ? state.melds : [];
          state.selected = [];
          state.selectedMeld = null;
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
          state.selected = [];
          state.selectedMeld = null;
          render();
          if (!state.over && state.phase !== "roundEnd") settle();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(roundTimer);
          roundTimer = null;
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
