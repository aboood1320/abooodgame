/* ==========================================================================
   أونو — تخلّص من بطاقاتك أولًا (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = {
    red: { name: "أحمر", hex: "#d95356" },
    yellow: { name: "أصفر", hex: "#e3ae38" },
    green: { name: "أخضر", hex: "#4aa87b" },
    blue: { name: "أزرق", hex: "#4d83c4" },
  };
  const COLOR_KEYS = ["red", "yellow", "green", "blue"];
  const PCOLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d", "#b98cd9", "#f0a35e"];

  /* ------------------------------ البطاقات ------------------------------ */

  function buildDeck() {
    const deck = [];
    let serial = 0;
    COLOR_KEYS.forEach((color) => {
      const add = (type, value, count) => {
        for (let i = 0; i < count; i++) {
          deck.push({ id: color + "-" + type + "-" + (value == null ? "x" : value) + "-" + serial++, color, type, value: value == null ? null : value });
        }
      };
      add("number", 0, 1);
      for (let value = 1; value <= 9; value++) add("number", value, 2);
      add("skip", null, 2);
      add("reverse", null, 2);
      add("draw2", null, 2);
    });
    for (let i = 0; i < 4; i++) deck.push({ id: "wild-0-" + serial++, color: "wild", type: "wild", value: null });
    for (let i = 0; i < 4; i++) deck.push({ id: "wild4-0-" + serial++, color: "wild", type: "wild4", value: null });
    return deck;
  }

  function cardLabel(card) {
    if (!card) return "";
    const color = COLORS[card.color] ? COLORS[card.color].name : "";
    if (card.type === "number") return color + " " + card.value;
    if (card.type === "skip") return color + " تخطٍّ";
    if (card.type === "reverse") return color + " عكس";
    if (card.type === "draw2") return color + " +2";
    if (card.type === "wild") return "بطاقة برّية";
    return "بطاقة برّية +4";
  }

  function cardPoints(card) {
    if (card.type === "number") return card.value;
    if (card.type === "wild" || card.type === "wild4") return 50;
    return 20;
  }

  function cardFace(card) {
    if (card.type === "number") return String(card.value);
    if (card.type === "skip") return "⊘";
    if (card.type === "reverse") return "⇄";
    if (card.type === "draw2") return "+2";
    if (card.type === "wild") return "★";
    return "+4";
  }

  /* ------------------------------ الحالة ------------------------------ */

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;

  function cur() {
    return state.players[state.current];
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function unoOption(key) {
    const opts = (apiRef && apiRef.options) || {};
    const defaults = { drawUntilPlayable: false, stackDraw: false };
    if (Object.prototype.hasOwnProperty.call(opts, key)) return !!opts[key];
    return !!defaults[key];
  }


  /** المقعد الذي يجلس عليه هذا الجهاز (أو -1 للمشاهد). */
  function viewerIndex() {
    if (isOnline()) return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
    return state ? state.current : -1;
  }

  function viewerPlayer() {
    const index = viewerIndex();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  /** هل يحق لهذا الجهاز رؤية يد اللاعب النشط الآن؟ */
  function canSeeActiveHand() {
    return !isOnline() || viewerIndex() === state.current;
  }

  function topCard() {
    return state.discard[state.discard.length - 1] || null;
  }

  function nextIndex(step) {
    const n = state.players.length;
    const offset = (state.dir * (step || 1)) % n;
    return ((state.current + offset) % n + n) % n;
  }

  function matches(card) {
    const top = topCard();
    if (!top) return true;
    if (card.color === "wild") return true;
    if (card.color === state.color) return true;
    if (card.type === "number") return top.type === "number" && card.value === top.value;
    if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") return top.type === card.type;
    return false;
  }

  function isPlayable(card, playerIndex) {
    if (!state || state.over) return false;
    if (playerIndex !== state.current) return false;
    if (state.phase !== "play" && state.phase !== "drawn") return false;
    if (state.phase === "drawn" && card.id !== state.drawnCard) return false;
    if (state.pendingDraw > 0) {
      const top = topCard();
      if (card.type === "draw2" && top && top.type === "draw2") return true;
      if (card.type === "wild4" && top && (top.type === "wild4" || top.type === "draw2")) return true;
      return false;
    }
    return matches(card);
  }

  function sortHand(hand) {
    const order = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
    const typeOrder = { number: 0, skip: 1, reverse: 2, draw2: 3, wild: 4, wild4: 5 };
    return hand.slice().sort((a, b) => {
      if (order[a.color] !== order[b.color]) return order[a.color] - order[b.color];
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return (a.value || 0) - (b.value || 0);
    });
  }

  /* ------------------------------ السحب ------------------------------ */

  function refillDeck() {
    if (state.deck.length) return true;
    if (state.discard.length <= 1) return false;
    const top = state.discard.pop();
    state.deck = U.shuffle(state.discard);
    state.discard = [top];
    if (FX) FX.sound("shuffle");
    if (apiRef) apiRef.log("نفدت كومة السحب، فأُعيد خلط البطاقات المكشوفة مع الاحتفاظ بالبطاقة العليا.", "");
    return true;
  }

  function drawInto(playerIndex, count) {
    let got = 0;
    for (let i = 0; i < count; i++) {
      if (!state.deck.length && !refillDeck()) break;
      state.players[playerIndex].hand.push(state.deck.shift());
      got += 1;
    }
    return got;
  }

  function drawPhrase(count) {
    if (count === 0) return "لم يسحب أي بطاقة";
    if (count === 1) return "سحب بطاقة واحدة";
    if (count === 2) return "سحب بطاقتين";
    return "سحب " + count + " بطاقات";
  }

  function setTurnNotice(extra) {
    const player = cur();
    state.notice =
      (extra ? extra + ". " : "") +
      "دور " + player.name + " — أظهر يدك ثم العب بطاقة مطابقة أو اسحب بطاقة.";
    if (apiRef) apiRef.setStatus("دور " + AI.statusName(player));
  }

  /* ------------------------------ سير الدور ------------------------------ */

  function playCard(card, chosenColor) {
    if (!state || state.over) return false;
    const player = cur();
    const actual = player.hand.find((item) => item.id === card.id);
    if (!actual || !isPlayable(actual, state.current)) return false;

    player.hand = player.hand.filter((item) => item.id !== actual.id);
    state.discard.push(actual);
    state.lastCard = actual;
    state.drawnCard = null;

    let color = actual.color;
    if (actual.type === "wild" || actual.type === "wild4") {
      color = COLORS[chosenColor] ? chosenColor : U.pick(COLOR_KEYS);
    }
    state.color = color;

    if (apiRef) {
      apiRef.log(
        "<strong>" + U.escape(player.name) + "</strong> لعب " + U.escape(cardLabel(actual)) +
        ((actual.type === "wild" || actual.type === "wild4") ? " واختار اللون " + U.escape(COLORS[color].name) : "") + ".",
        "accent"
      );
    }
    if (FX) FX.sound("card");

    if (player.hand.length === 0) {
      endGame(state.current);
      return true;
    }

    if (player.hand.length === 1) {
      if (apiRef) apiRef.log("<strong>" + U.escape(player.name) + "</strong> أعلن «أونو!» — بقيت بطاقة واحدة.", "good");
      BG.toast("أونو! بقيت بطاقة واحدة لـ" + player.name, "good");
      if (FX) FX.sound("point");
    }

    let skip = false;
    let effect = "";

    if (actual.type === "reverse") {
      if (state.players.length === 2) {
        skip = true;
        effect = "عكس الاتجاه مع لاعبين — يعود الدور إلى " + player.name;
      } else {
        state.dir *= -1;
        effect = "انعكس اتجاه اللعب";
      }
    } else if (actual.type === "skip") {
      const target = nextIndex(1);
      skip = true;
      effect = "تخطّى دور " + state.players[target].name;
    } else if (actual.type === "draw2" || actual.type === "wild4") {
      const count = actual.type === "draw2" ? 2 : 4;
      const target = nextIndex(1);
      if (unoOption("stackDraw")) {
        state.pendingDraw = (state.pendingDraw || 0) + count;
        skip = true;
        effect = state.players[target].name + " " + state.pendingDraw + " بطاقات متراكمة (العقوبة تتزايد)";
      } else {
        const got = drawInto(target, count);
        skip = true;
        effect = state.players[target].name + " " + drawPhrase(got) + " وفقد دوره";
      }
    }

    if (effect && apiRef) apiRef.log(U.escape(effect) + ".", actual.type === "wild" || actual.type === "wild4" ? "accent" : "");

    state.current = nextIndex(skip ? 2 : 1);
    state.turn += 1;
    state.phase = "play";
    state.handRevealed = !BG.prefs.hideSecrets || isOnline();
    state.pendingDraw = 0;
    setTurnNotice(effect);
    render();

    if (FX) {
      FX.after(() => {
        const discard = rootRef && rootRef.querySelector(".uno-card.is-discard");
        if (discard) { FX.pop(discard); FX.pulse(discard); }
        const active = rootRef && rootRef.querySelector(".uno-player.active");
        if (active) FX.pulse(active);
      }, 30);
    }
    return true;
  }

  function drawCard() {
    if (!state || state.over || state.phase !== "play") return;
    if (state.pendingDraw > 0) {
      const n = state.pendingDraw;
      state.pendingDraw = 0;
      drawInto(state.current, n);
      state.current = nextIndex(1);
      state.turn += 1;
      state.phase = "play";
      state.drawnCard = null;
      state.handRevealed = !BG.prefs.hideSecrets || isOnline();
      setTurnNotice("");
      render();
      if (FX) FX.sound("card");
      maybeAi();
      return;
    }
    if (!state.handRevealed && !AI.isCpu(cur())) {
      BG.toast("أظهر يدك أولًا لتعرف ما لديك قبل السحب.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (!state.deck.length && !refillDeck()) {
      state.phase = "drawn";
      state.drawnCard = null;
      state.notice = "لا توجد بطاقات متاحة للسحب. يمكنك إنهاء الدور.";
      if (FX) FX.sound("error");
      render();
      return;
    }
    let drawnCount = 0;
    let lastCard = null;
    let playable = false;
    do {
      if (!state.deck.length && !refillDeck()) break;
      const c = state.deck.shift();
      cur().hand.push(c);
      drawnCount += 1;
      lastCard = c;
      playable = matches(c);
    } while (unoOption("drawUntilPlayable") && !playable && state.deck.length);

    state.phase = "drawn";
    state.drawnCard = (playable && lastCard) ? lastCard.id : null;

    const player = cur();
    if (apiRef) apiRef.log("<strong>" + U.escape(player.name) + "</strong> سحب بطاقة من كومة السحب.", "");
    state.notice = playable
      ? "سحبت بطاقة قابلة للعب. يمكنك لعبها الآن أو إنهاء الدور."
      : "سحبت بطاقة غير مطابقة. يمكنك إنهاء الدور.";
    if (FX) {
      FX.sound("card");
      FX.after(() => {
        if (!rootRef) return;
        const pile = rootRef.querySelector(".uno-card-back");
        if (pile) FX.pulse(pile);
        const hand = rootRef.querySelector(".uno-hand");
        if (hand) FX.pulse(hand);
      }, 30);
    }
    render();
  }

  function passTurn() {
    if (!state || state.over || state.phase !== "drawn") return;
    const player = cur();
    if (apiRef) apiRef.log("<strong>" + U.escape(player.name) + "</strong> أنهى دوره بعد السحب.", "");
    if (FX) FX.sound("pass");
    state.current = nextIndex(1);
    state.turn += 1;
    state.phase = "play";
    state.drawnCard = null;
    state.handRevealed = !BG.prefs.hideSecrets || isOnline();
    state.pendingDraw = 0;
    setTurnNotice("");
    render();
    if (FX) {
      FX.after(() => {
        const active = rootRef && rootRef.querySelector(".uno-player.active");
        if (active) FX.pulse(active);
      }, 30);
    }
  }

  function openColorPicker(card) {
    const body = document.createElement("div");
    body.className = "uno-color-picker";
    body.innerHTML = '<p class="uno-color-hint">اختر اللون الذي سيسري على الدور التالي. البطاقة البرّية تُلعب على أي لون.</p>';
    const grid = document.createElement("div");
    grid.className = "uno-color-grid";
    body.appendChild(grid);

    const dialog = BG.openDialog({
      title: "اختر لونًا",
      body,
      actions: [{ label: "إلغاء", value: "" }],
      className: "uno-dialog",
    });

    COLOR_KEYS.forEach((key) => {
      const button = BG.el("button", {
        type: "button",
        class: "uno-color-choice is-" + key,
        style: { "--cc": COLORS[key].hex },
      });
      button.innerHTML = '<span class="uno-color-dot"></span><strong>' + COLORS[key].name + "</strong>";
      button.addEventListener("click", () => dialog.close(key));
      grid.appendChild(button);
    });

    dialog.promise.then((value) => {
      if (value && COLORS[value]) playCard(card, value);
    });
  }

  function handleCard(cardId) {
    if (!state || state.over || !state.handRevealed) return;
    const card = cur().hand.find((item) => item.id === cardId);
    if (!card) return;
    if (!isPlayable(card, state.current)) {
      BG.toast(
        state.phase === "drawn"
          ? "بعد السحب يمكنك لعب البطاقة المسحوبة فقط، أو إنهاء الدور."
          : "هذه البطاقة لا تطابق اللون أو الرقم أو الرمز الحالي.",
        "warn"
      );
      if (FX) FX.sound("error");
      return;
    }
    if (card.color === "wild") {
      openColorPicker(card);
      return;
    }
    playCard(card, null);
  }

  /* ------------------------------ النهاية ------------------------------ */

  function endGame(winnerIndex) {
    if (state.over) return;
    state.over = true;
    state.phase = "over";
    state.winner = winnerIndex;
    state.handRevealed = false;
    const winner = winnerIndex != null ? state.players[winnerIndex] : null;
    let points = 0;
    state.players.forEach((player) => {
      if (player.index !== winnerIndex) points += player.hand.reduce((sum, card) => sum + cardPoints(card), 0);
    });
    state.gained = points;

    if (winner) {
      state.notice = "فاز " + winner.name + " — تخلّص من كل بطاقاته وجمع " + points + " نقطة من أيدي الخصوم.";
      if (apiRef) {
        apiRef.log("<strong>" + U.escape(winner.name) + "</strong> تخلّص من كل بطاقاته وفاز بالجولة (+" + points + " نقطة).", "good");
        apiRef.setStatus("فاز " + winner.name);
      }
    } else {
      state.notice = "انتهت الجولة دون فائز.";
    }

    render();
    if (FX) FX.after(() => FX.win(), 140);

    if (apiRef) {
      apiRef.gameOver({
        icon: "🃏",
        title: winner ? "فاز " + winner.name + "!" : "انتهت الجولة",
        text: winner
          ? "أنهى <strong>" + U.escape(winner.name) + "</strong> جميع بطاقاته. مجموع نقاط أيدي الخصوم: <strong>" + points + "</strong> نقطة."
          : "لم يتبقَّ لاعب قادر على المتابعة.",
        winner: winner ? winner.name : "لا فائز",
        standings: state.players.map((player) => {
          const handPoints = player.hand.reduce((sum, card) => sum + cardPoints(card), 0);
          return {
            name: player.name + (player.index === winnerIndex ? " · فائز" : ""),
            value: player.index === winnerIndex
              ? "+" + points + " نقطة"
              : player.hand.length + " بطاقة · " + handPoints + " نقطة",
          };
        }),
      });
    }
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuColor(player) {
    const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
    player.hand.forEach((card) => {
      if (counts[card.color] != null) counts[card.color] += 1;
    });
    return COLOR_KEYS.slice().sort((a, b) => counts[b] - counts[a])[0] || "red";
  }

  function cpuCardScore(card, player) {
    const next = state.players[nextIndex(1)];
    const pressure = next && next.hand.length === 1;
    let score = 0;
    if (card.type === "wild4") score += pressure ? 95 : 18;
    else if (card.type === "wild") score += pressure ? 80 : 26;
    else if (card.type === "draw2") score += pressure ? 90 : 55;
    else if (card.type === "skip") score += pressure ? 85 : 50;
    else if (card.type === "reverse") score += pressure ? 70 : 42;
    else score += 30 + (card.value || 0);
    if (state.players.length === 2 && card.type !== "number") score += 5;
    return score;
  }

  function pickCpuCard(seat, choices) {
    return AI.choose(choices, (card) => cpuCardScore(card, seat), seat.level) || choices[0];
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 1.2);

    if (state.phase === "play") {
      const choices = seat.hand.filter((card) => isPlayable(card, state.current));
      if (choices.length) {
        const card = pickCpuCard(seat, choices);
        aiRunner.later(() => {
          if (!state || state.over || state.phase !== "play") return;
          const actual = cur().hand.find((item) => item.id === card.id);
          if (actual && isPlayable(actual, state.current)) playCard(actual, cpuColor(cur()));
        }, wait);
      } else {
        aiRunner.later(() => {
          if (!state || state.over || state.phase !== "play") return;
          drawCard();
        }, wait);
      }
      return;
    }

    if (state.phase === "drawn") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "drawn") return;
        const drawn = cur().hand.find((item) => item.id === state.drawnCard);
        if (drawn && isPlayable(drawn, state.current)) playCard(drawn, cpuColor(cur()));
        else passTurn();
      }, wait);
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function cardHTML(card, opts) {
    const o = opts || {};
    const wild = card.color === "wild";
    const classes = ["uno-card", "is-" + card.color];
    if (o.hand) classes.push("is-hand");
    if (o.discard) classes.push("is-discard");
    if (o.drawn) classes.push("is-drawn");
    if (o.blocked) classes.push("is-blocked");
    const tag = o.hand ? "button" : "div";
    const attrs = o.hand
      ? ' type="button" data-card="' + U.escape(card.id) + '" aria-label="' + U.escape(cardLabel(card)) + '"'
      : ' aria-label="' + U.escape(cardLabel(card)) + '"';
    const pieceAttr = o.piece
      ? ' data-fx-piece="' + U.escape(o.piece) + '" data-fx-enter="' + (o.enter || "pop") + '"'
      : "";
    const face = cardFace(card);
    const corner = wild ? (card.type === "wild4" ? "+4" : "★") : face;
    return (
      "<" + tag + ' class="' + classes.join(" ") + '"' + attrs + pieceAttr + ">" +
      '<span class="uno-card-corner tl" aria-hidden="true">' + U.escape(corner) + "</span>" +
      '<span class="uno-card-face" aria-hidden="true">' + U.escape(face) + "</span>" +
      '<span class="uno-card-corner br" aria-hidden="true">' + U.escape(corner) + "</span>" +
      (wild ? '<span class="uno-card-wild-tag">' + (card.type === "wild4" ? "برّي +4" : "برّي") + "</span>" : "") +
      "</" + tag + ">"
    );
  }

  function canDrawNow() {
    return !state.over && state.phase === "play" && state.handRevealed &&
      (!isOnline() || viewerIndex() === state.current);
  }

  function tableHTML() {
    const top = topCard();
    const dirLabel = state.dir > 0 ? "مع عقارب الساعة" : "عكس عقارب الساعة";
    const dirIcon = state.dir > 0 ? "↻" : "↺";
    const seats = state.players.map((player) => {
      const active = !state.over && player.index === state.current;
      const backs = Array.from({ length: Math.min(player.hand.length, 5) }, () => "<i></i>").join("");
      return '<div class="uno-seat' + (active ? " is-active" : "") + (player.hand.length === 1 ? " is-uno" : "") + '" style="--p:' + player.color + '">' +
        '<span class="uno-seat-avatar">' + (player.index + 1) + "</span>" +
        '<span class="uno-seat-copy"><strong>' + U.escape(player.name) + "</strong><small>" + player.hand.length + " بطاقة</small></span>" +
        '<span class="uno-seat-cards" aria-hidden="true">' + backs + "</span>" +
        (player.hand.length === 1 ? '<b class="uno-seat-uno">أونو!</b>' : "") +
        "</div>";
    }).join("");
    return (
      '<div class="uno-table" style="--uc:' + COLORS[state.color].hex + '">' +
      '<div class="uno-seats">' + seats + "</div>" +
      '<div class="uno-pile uno-pile-draw">' +
      '<span class="uno-pile-label">السحب · <b>' + state.deck.length + "</b></span>" +
      '<button type="button" class="uno-card uno-card-back" data-act="draw" aria-label="اسحب بطاقة من كومة السحب"' + (canDrawNow() ? "" : " disabled") + ">" +
      '<span class="uno-back-oval" aria-hidden="true"><b>أونو</b></span>' +
      "</button>" +
      "</div>" +
      '<div class="uno-core" aria-hidden="true">' +
      '<span class="uno-core-glow"><i>' + dirIcon + "</i></span>" +
      '<span class="uno-core-color"><i class="uno-color-dot is-' + state.color + '"></i>' + U.escape(COLORS[state.color].name) + "</span>" +
      '<span class="uno-core-dir">' + dirIcon + " " + U.escape(dirLabel) + "</span>" +
      "</div>" +
      '<div class="uno-pile uno-pile-discard">' +
      '<span class="uno-pile-label">المكشوفة</span>' +
      (top ? cardHTML(top, { discard: true, piece: "uno-top-" + top.id, enter: "deal" }) : "") +
      "</div>" +
      "</div>" +
      '<div class="uno-table-meta">' +
      '<span class="uno-meta-chip">🂠 ' + state.deck.length + " في السحب</span>" +
      '<span class="uno-meta-chip">♻️ ' + Math.max(0, state.discard.length - 1) + " قابلة لإعادة الخلط</span>" +
      '<span class="uno-meta-chip">👥 ' + state.players.length + " لاعبين</span>" +
      "</div>"
    );
  }

  function playersHTML() {
    return state.players.map((player) => {
      const active = !state.over && player.index === state.current;
      const uno = player.hand.length === 1;
      return (
        '<div class="uno-player' + (active ? " active" : "") + (uno ? " is-uno" : "") + '" style="--p:' + player.color + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<div class="uno-player-copy"><strong>' + U.escape(player.name) + "</strong>" +
        "<small>" + player.hand.length + " بطاقة في اليد</small></div>" +
        (uno ? '<span class="uno-badge">أونو!</span>' : "") +
        "</div>"
      );
    }).join("");
  }

  function turnHTML() {
    const player = cur();
    const drawn = state.drawnCard && canSeeActiveHand() ? cur().hand.find((card) => card.id === state.drawnCard) : null;
    const drawnPlayable = drawn ? matches(drawn) : false;
    return (
      '<div class="uno-panel uno-turn">' +
      '<span class="uno-kicker">الدور ' + state.turn + " · " + (state.over ? "منتهية" : state.phase === "drawn" ? "بعد السحب" : "اللعب") + "</span>" +
      "<strong>" + U.escape(state.over ? "انتهت الجولة" : player.name) + "</strong>" +
      "<small>" + (state.over ? "راجع النتيجة" : player.hand.length + " بطاقة · " + (player.hand.length === 1 ? "على وشك الفوز" : "بانتظار بطاقة مناسبة")) + "</small>" +
      '<div class="uno-turn-chips">' +
      '<span class="uno-color-chip is-' + state.color + '"><i class="uno-color-dot"></i>' + U.escape(COLORS[state.color].name) + "</span>" +
      '<span class="uno-dir-chip">' + (state.dir > 0 ? "↻" : "↺") + " " + (state.dir > 0 ? "مع عقارب الساعة" : "عكس عقارب الساعة") + "</span>" +
      "</div>" +
      (state.phase === "drawn" && !state.over
        ? canSeeActiveHand()
          ? '<div class="uno-drawn-hint ' + (drawnPlayable ? "ok" : "wait") + '">' +
            (drawn ? "البطاقة المسحوبة: " : "") +
            (drawn ? "<strong>" + U.escape(cardLabel(drawn)) + "</strong>" : "لا توجد بطاقة مسحوبة") +
            "<small>" + (drawnPlayable ? "قابلة للعب — انقرها في يدك أو أنهِ الدور." : "غير مطابقة — أنهِ الدور.") + "</small></div>"
          : '<div class="uno-drawn-hint wait"><strong>اللاعب يختار من يده</strong><small>أوراقه مخفية عن المشاهدين.</small></div>'
        : "") +
      "</div>"
    );
  }

  function actionsHTML() {
    const canDraw = canDrawNow();
    const canPass = !state.over && state.phase === "drawn";
    const hint = state.over
      ? "انتهت الجولة. ابدأ لعبة جديدة من زر «لعبة جديدة»."
      : !state.handRevealed
        ? "أظهر يدك أولًا من لوحة «أوراقك» لتتمكن من اللعب أو السحب."
        : state.phase === "drawn"
          ? "بعد السحب يمكنك لعب البطاقة المسحوبة فقط، أو إنهاء الدور."
          : "طابق اللون الحالي أو الرقم أو رمز البطاقة. إن لم تملك بطاقة مناسبة فاسحب واحدة.";
    return (
      '<div class="uno-panel uno-actions">' +
      '<span class="uno-kicker">أوامر الدور</span>' +
      '<button type="button" class="bg-btn primary" data-act="draw"' + (canDraw ? "" : " disabled") + '><span>🂠 اسحب بطاقة</span></button>' +
      '<button type="button" class="bg-btn" data-act="pass"' + (canPass ? "" : " disabled") + '><span>⏭ أنهِ الدور</span></button>' +
      '<p class="uno-hint">' + U.escape(hint) + "</p>" +
      "</div>"
    );
  }

  function handHTML() {
    const player = viewerPlayer();
    if (!player) {
      return '<p class="uno-empty">أنت مشاهد — لا تُعرض أوراق اللاعبين السرّية على هذا الجهاز.</p>';
    }
    if (!player.hand.length) {
      return '<p class="uno-empty">لا بطاقات في يدك — انتهت الجولة.</p>';
    }
    const cards = sortHand(player.hand);
    const playable = cards.filter((card) => isPlayable(card, player.index)).length;
    return (
      '<div class="uno-hand-meta"><span>' + cards.length + " بطاقة</span><b>" + playable + " قابلة للعب</b>" +
      (state.drawnCard ? '<span class="uno-hand-drawn">المسحوبة مميزة بإطار</span>' : "") + "</div>" +
      '<div class="uno-hand">' +
      cards.map((card) => cardHTML(card, {
        piece: "uno-hand-" + card.id,
        enter: "deal",
        hand: true,
        blocked: !isPlayable(card, player.index),
        drawn: card.id === state.drawnCard,
      })).join("") +
      "</div>" +
      '<p class="uno-hand-hint">البطاقات الباهتة غير مطابقة. البرّية تُلعب دائمًا وتغيّر اللون.</p>'
    );
  }

  function sideHTML() {
    return (
      turnHTML() +
      actionsHTML() +
      '<div class="uno-notice">' + U.escape(state.notice) + "</div>" +
      '<div class="uno-panel uno-players"><span class="uno-kicker">اللاعبون</span>' + playersHTML() + "</div>" +
      '<div class="uno-panel uno-legend">' +
      '<span class="uno-kicker">كيف تلعب</span>' +
      '<div class="uno-legend-row"><b>🎨</b><span>طابق اللون أو الرقم أو رمز البطاقة. البرّية تُلعب على أي بطاقة.</span></div>' +
      '<div class="uno-legend-row"><b>⊘</b><span>تخطٍّ يمنع اللاعب التالي، وعكس يقلب اتجاه اللعب.</span></div>' +
      '<div class="uno-legend-row"><b>+2</b><span>البطاقات العقابية تُنقل الدور بعد أن يسحب الخصم بطاقاته.</span></div>' +
      '<div class="uno-legend-row"><b>🗣</b><span>عند بقاء بطاقة واحدة يُعلن «أونو!» تلقائيًا. أول من يفرغ يفوز.</span></div>' +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "uno-layout";

    const main = document.createElement("div");
    main.className = "uno-main";

    const board = document.createElement("div");
    board.className = "uno-board-wrap";
    board.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-uno"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">طاولة سريعة</span><strong>١٠٨ بطاقات · ٤ ألوان</strong></div>' +
      '<span class="board-head-hint">طابق اللون أو الرقم أو الرمز · البرّية تغيّر اللون · أونو عند البطاقة الأخيرة</span>' +
      "</div>" + tableHTML();
    main.appendChild(board);

    const player = viewerPlayer() || cur();
    if (viewerPlayer()) {
      const secret = BG.secretPanel({
        title: "🃏 أوراق " + player.name,
        owner: player.name,
        hint: "يدك سرّية. أظهرها فقط في دورك، ثم أخفها قبل تمرير الجهاز.",
        open: state.handRevealed,
        autoKey: isOnline() ? "uno:" + viewerIndex() + ":" + state.current : "",
        onToggle(visible) {
          state.handRevealed = visible;
          render();
        },
        render() {
          return handHTML();
        },
      });
      main.appendChild(secret.el);
    } else {
      const watch = document.createElement("div");
      watch.className = "uno-panel uno-watch";
      watch.innerHTML =
        '<span class="uno-kicker">👁 وضع المشاهدة</span>' +
        '<p class="uno-hand-hint">تتابع الطاولة مباشرة. تبقى أوراق كل اللاعبين مخفية، ويُفتح مقعدك عند دورك.</p>';
      main.appendChild(watch);
    }

    const side = document.createElement("aside");
    side.className = "uno-side";
    side.innerHTML = sideHTML();

    wrap.appendChild(main);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);
    syncCpu();
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (state && !state.over && AI.isCpu(cur())) return;
    if (isOnline() && viewerIndex() !== state.current) return;
    const card = event.target.closest("[data-card]");
    if (card) {
      handleCard(card.getAttribute("data-card"));
      return;
    }
    const action = event.target.closest("[data-act]");
    if (!action) return;
    const act = action.getAttribute("data-act");
    if (act === "draw") drawCard();
    else if (act === "pass") passTurn();
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "uno",
    name: "أونو",
    en: "UNO",
    icon: "🃏",
    accent: "#e94f64",
    cardClass: "card-uno",
    tagline: "طابق الألوان والأرقام، وألقِ البطاقات العقابية، وكن أول من يفرغ يده.",
    players: "2–6",
    duration: "15–30 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 4,

    options: {
      hint: "خيارات قوانين إضافية. يمكن تخصيصها قبل بدء المباراة.",
      defaults: { drawUntilPlayable: false, stackDraw: false },
      fields: [
        { key: "drawUntilPlayable", label: "سحب حتى الحصول على بطاقة قابلة للعب", type: "toggle", hint: "سحب بطاقات حتى الحصول على بطاقة قابلة للعب." },
        { key: "stackDraw", label: "تكديس +2/+4", type: "toggle", hint: "السماح بتكديس +2 على +2 و+4 على +4." },
      ],
      summary(options) {
        const parts = [];
        if (options.drawUntilPlayable) parts.push("سحب متكرر");
        if (options.stackDraw) parts.push("تكديس +2/+4");
        return parts.join(", ") || "القواعد القياسية";
      },
    },
    rules: {
      goal: "تخلّص من جميع بطاقاتك قبل الجميع. في كل دور العب بطاقة تطابق لون البطاقة المكشوفة أو رقمها أو رمزها، واستخدم البطاقات الخاصة لتخطّي الخصوم أو عكس اتجاه اللعب أو إجبارهم على السحب. أول لاعب تفرغ يده يفوز بالجولة.",
      facts: [["البطاقات", "١٠٨ بطاقات"], ["الألوان", "٤ ألوان + برّي"], ["اليد", "٧ بطاقات"], ["اللاعبون", "٢–٦"]],
      components: [
        "١٠٨ بطاقات: لكل لون بطاقة صفر واحدة، وبطاقتان من كل رقم من ١ إلى ٩، وبطاقتان تخطٍّ، وبطاقتان عكس، وبطاقتان +2.",
        "٤ بطاقات برّية، و٤ بطاقات برّية +4.",
        "أربعة ألوان: أحمر، أصفر، أخضر، أزرق، إضافة إلى البطاقات البرّية متعددة الألوان.",
        "كومة سحب وكومة بطاقات مكشوفة، ويد سرّية لكل لاعب.",
      ],
      setup: [
        "تُخلط البطاقات الـ108 جيدًا وتُوزع ٧ بطاقات لكل لاعب، وتبقى البطاقات الأخرى في كومة السحب.",
        "تُكشف البطاقة العليا لتكون أول بطاقة مكشوفة، ويصبح لونها هو اللون الحالي. في النسخة الرقمية تُدار البطاقات غير الرقمية إلى أسفل الكومة حتى تظهر بطاقة رقم نظيفة.",
        "يبدأ اللاعب الأول وفق ترتيب اللاعبين، ويكون اتجاه اللعب في البداية مع عقارب الساعة.",
        "لا يرى أي لاعب بطاقات الآخرين. كل لاعب يظهر يده فقط عند دوره ثم يخفيها.",
      ],
      steps: [
        "<strong>اللعب:</strong> في دورك العب بطاقة واحدة تطابق اللون الحالي، أو تحمل الرقم نفسه، أو تحمل الرمز نفسه، أو بطاقة برّية. بعد لعبها تصبح هي البطاقة المكشوفة الجديدة، ويصبح لونها هو اللون الحالي، ثم ينتقل الدور.",
        "<strong>البطاقات الرقمية:</strong> من ٠ إلى ٩. يمكن لعب الرقم نفسه بلون مختلف ما دام مطابقًا للرقم المكشوف، أو أي رقم من اللون الحالي.",
        "<strong>تخطٍّ (⊘):</strong> يخسر اللاعب التالي دوره كاملًا. مع لاعبين اثنين يعود الدور إليك مباشرة.",
        "<strong>عكس (⇄):</strong> يقلب اتجاه اللعب. مع لاعبين اثنين يعمل كتخطٍّ، فيلعب صاحب البطاقة مرة أخرى.",
        "<strong>+2:</strong> يسحب اللاعب التالي بطاقتين ويخسر دوره. لا تُراكم بطاقات +2 فوق بعضها في هذه النسخة.",
        "<strong>برّية (★):</strong> تُلعب على أي بطاقة، ويختار لاعبها اللون الجديد من الألوان الأربعة. لا يمكن ردّها ببطاقة عادية.",
        "<strong>برّية +4:</strong> تُلعب على أي بطاقة، ويختار لاعبها اللون الجديد، ثم يسحب اللاعب التالي أربع بطاقات ويخسر دوره. لا يوجد تحدي قانوني للبطاقة في النسخة الرقمية.",
        "<strong>السحب:</strong> إن لم تملك بطاقة مطابقة، اسحب بطاقة واحدة. إن كانت قابلة للعب يمكنك لعبها فورًا، وإلا فأنهِ دورك. لا يُسمح بسحب أكثر من بطاقة في الدور نفسه.",
        "<strong>أونو:</strong> عند بقاء بطاقة واحدة في يدك يجب أن تعلن «أونو!». في النسخة الرقمية يُعلن ذلك تلقائيًا ويظهر تنبيه للجميع.",
        "<strong>نفاد كومة السحب:</strong> تُخلط البطاقات المكشوفة ما عدا البطاقة العليا لتشكيل كومة سحب جديدة، ثم يستمر اللعب.",
      ],
      winning: "يفوز أول لاعب يتخلّص من كل بطاقاته. تُحسب نقاط الجولة للفائز من أيدي الخصوم: البطاقات الرقمية بقيمتها، وبطاقات تخطٍّ وعكس و+2 بعشرين نقطة لكل بطاقة، والبرّية والبرّية +4 بخمسين نقطة. النسخة الحالية تلعب جولة واحدة وتعلن النقاط في نهاية الجولة.",
      notes: [
        "النسخة الرقمية تلعب جولة واحدة، وتُظهر مجموع نقاط أيدي الخصوم للفائز بدل الاستمرار حتى هدف نقاط محدد.",
        "لا تُراكم بطاقات +2 أو +4: كل بطاقة عقابية تُطبّق على اللاعب التالي فقط.",
        "بطاقة +4 لا تخضع لقاعدة التحدي؛ يمكن لعبها حتى لو كان لدى اللاعب لون مطابق.",
        "أول بطاقة مكشوفة تكون رقمًا دائمًا لتبسيط البداية، بدل تطبيق تأثير البطاقات الخاصة في أول دور.",
        "إعلان «أونو» تلقائي عند بقاء بطاقة واحدة؛ لا توجد عقوبة نسيان في اللعب المحلي.",
        "يد اللاعب الحالي مخفية حتى يضغط «إظهار»، وتُخفى تلقائيًا عند انتقال الدور.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();

      const players = api.players.map((player, index) => ({
        index,
        name: player.name,
        type: player.type === "cpu" ? "cpu" : "human",
        level: AI.level(player.level),
        isCpu: AI.isCpu(player),
        color: PCOLORS[index % PCOLORS.length],
        hand: [],
      }));

      const deck = U.shuffle(buildDeck());
      state = {
        players,
        deck,
        discard: [],
        current: 0,
        dir: 1,
        turn: 1,
        color: "red",
        phase: "play",
        drawnCard: null,
        handRevealed: !BG.prefs.hideSecrets || isOnline(),
        pendingDraw: 0,
        lastCard: null,
        notice: "",
        over: false,
        winner: null,
        gained: 0,
      };

      for (let round = 0; round < 7; round++) {
        players.forEach((player) => { player.hand.push(state.deck.shift()); });
      }

      let guard = state.deck.length;
      while (guard-- > 0 && state.deck.length) {
        const card = state.deck.shift();
        if (card.type === "number") {
          state.discard.push(card);
          state.color = card.color;
          break;
        }
        state.deck.push(card);
      }
      if (!state.discard.length) {
        const card = state.deck.shift();
        state.discard.push(card);
        state.color = card.color === "wild" ? "red" : card.color;
      }

      state.notice = "دور " + players[0].name + " — أظهر يدك ثم العب بطاقة مطابقة أو اسحب بطاقة.";
      apiRef.log(
        "بدأت أونو — " + players.length + " لاعبين، ٧ بطاقات لكل لاعب. البطاقة المكشوفة: " + U.escape(cardLabel(topCard())) + ".",
        "accent"
      );
      if (FX) FX.sound("shuffle");
      render();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render, playCard, drawCard, passTurn, endGame, setTurnNotice,
          topCard, buildDeck, cardLabel, cardPoints, matches, sortHand,
          isPlayable: (cardId) => {
            const card = cur().hand.find((item) => item.id === cardId);
            return card ? isPlayable(card, state.current) : false;
          },
          handOf: (index) => state.players[index].hand,
          COLORS, COLOR_KEYS,
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
          state = BG.netCodec.decode(data);
          state.handRevealed = !BG.prefs.hideSecrets || isOnline();
          state.pendingDraw = 0;
          state.players.forEach((player) => {
            player.hand = Array.isArray(player.hand) ? player.hand : [];
          });
          state.deck = Array.isArray(state.deck) ? state.deck : [];
          state.discard = Array.isArray(state.discard) ? state.discard : [];
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
          state.handRevealed = !BG.prefs.hideSecrets || isOnline();
          state.pendingDraw = 0;
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

  BG.register(game);
})();
