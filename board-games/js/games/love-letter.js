/* ==========================================================================
   رسائل الحب — LOVE LETTER
   ١٦ بطاقة، ٢–٤ لاعبين، جولات سريعة ورموز محبة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const TYPES = ["guard", "priest", "baron", "handmaid", "prince", "king", "countess", "princess"];

  const CARDS = {
    guard: {
      type: "guard",
      name: "الحارس",
      value: 1,
      count: 5,
      icon: "🛡️",
      color: "#7f97ae",
      text: "خمّن بطاقة يحملها لاعب آخر (غير الحارس). إن أصبت يخرج من الجولة.",
    },
    priest: {
      type: "priest",
      name: "الكاهن",
      value: 2,
      count: 2,
      icon: "🔮",
      color: "#9a7bd6",
      text: "انظر سرًّا إلى بطاقة لاعب آخر.",
    },
    baron: {
      type: "baron",
      name: "البارون",
      value: 3,
      count: 2,
      icon: "⚔️",
      color: "#d0704f",
      text: "قارن بطاقتك المتبقية ببطاقة لاعب آخر؛ صاحب القيمة الأدنى يخرج.",
    },
    handmaid: {
      type: "handmaid",
      name: "الوصيفة",
      value: 4,
      count: 2,
      icon: "🌿",
      color: "#58a37a",
      text: "تحميك من بطاقات الخصوم حتى بداية دورك القادم.",
    },
    prince: {
      type: "prince",
      name: "الأمير",
      value: 5,
      count: 2,
      icon: "🤴",
      color: "#4f8fce",
      text: "اختر لاعبًا (حتى نفسك) ليتخلى عن بطاقته ويسحب أخرى.",
    },
    king: {
      type: "king",
      name: "الملك",
      value: 6,
      count: 1,
      icon: "👑",
      color: "#d9a441",
      text: "بادل بطاقتك المتبقية مع بطاقة لاعب آخر.",
    },
    countess: {
      type: "countess",
      name: "الكونتيسة",
      value: 7,
      count: 1,
      icon: "💃",
      color: "#c8588f",
      text: "قيمة عالية بلا تأثير. يجب لعبها إن كنت تحمل الملك أو الأمير.",
    },
    princess: {
      type: "princess",
      name: "الأميرة",
      value: 8,
      count: 1,
      icon: "👸",
      color: "#e05a6e",
      text: "أعلى قيمة. إن تخلّيت عنها لأي سبب تخرج من الجولة فورًا.",
    },
  };

  const TARGETED = { guard: true, priest: true, baron: true, prince: true, king: true };
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);
  const cardDef = (card) => (card && CARDS[card.type]) || null;
  const cardValue = (card) => {
    const def = cardDef(card);
    return def ? def.value : 0;
  };
  const tokenWord = (n) => (n === 1 ? "رمز محبة" : "رموز محبة");

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;

  /* ------------------------------ الحالة ------------------------------ */

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function viewerIndex() {
    if (isOnline()) {
      return Number.isInteger(apiRef.net.seat) && apiRef.net.seat >= 0 ? apiRef.net.seat : -1;
    }
    return state ? state.current : -1;
  }

  function viewerPlayer() {
    const index = viewerIndex();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function cur() {
    return state ? state.players[state.current] : null;
  }

  function alivePlayers() {
    return state ? state.players.filter((player) => !player.out) : [];
  }

  function targetGoal(count) {
    if (count <= 2) return 7;
    if (count === 3) return 5;
    return 4;
  }

  function makePlayers() {
    return (apiRef.players || []).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      tokens: 0,
      hand: [],
      protected: false,
      out: false,
      eliminatedReason: "",
      discardPeak: 0,
    }));
  }

  function makeMatch(options) {
    const opts = options || {};
    const players = makePlayers();
    const chosen = Number(opts.tokenGoal);
    const targetTokens = [4, 5, 7].indexOf(chosen) !== -1 ? chosen : targetGoal(players.length);
    state = {
      players,
      deck: [],
      setAside: [],
      discards: [],
      current: 0,
      phase: "play",
      round: 1,
      turnSeq: 0,
      targetTokens,
      roundWinner: null,
      roundWinners: [],
      nextStarter: 0,
      lastPlayed: null,
      peek: null,
      peekHidden: false,
      pending: null,
      awaitAck: null,
      drawnId: null,
      notice: "",
      over: false,
      matchOver: false,
      winner: null,
      handRevealed: false,
      gameOverAnnounced: false,
      standings: [],
    };
    startRound(0);
    return state;
  }

  function makeDeck() {
    const deck = [];
    TYPES.forEach((type) => {
      for (let i = 0; i < CARDS[type].count; i++) deck.push({ id: type + "-" + (i + 1), type });
    });
    return U.shuffle(deck);
  }

  function drawOne() {
    if (state.deck.length) return state.deck.shift();
    if (state.setAside.length) return state.setAside.shift();
    return null;
  }

  function discardCard(player, card) {
    if (!card) return;
    player.discardPeak = Math.max(player.discardPeak || 0, cardValue(card));
    state.discards.push(card);
  }

  function handValue(player) {
    if (!player || !player.hand || !player.hand.length) return 0;
    return player.hand.reduce((best, card) => Math.max(best, cardValue(card)), 0);
  }

  function nextAliveIndex(from) {
    if (!state) return -1;
    const total = state.players.length;
    for (let step = 1; step <= total; step++) {
      const index = (from + step) % total;
      if (!state.players[index].out) return index;
    }
    return -1;
  }

  function mustPlayCountess(player) {
    if (!player || !player.hand) return false;
    return (
      player.hand.some((card) => card.type === "countess") &&
      player.hand.some((card) => card.type === "king" || card.type === "prince")
    );
  }

  function legalCards(player) {
    if (!player || !player.hand) return [];
    if (mustPlayCountess(player)) return player.hand.filter((card) => card.type === "countess");
    return player.hand.slice();
  }

  function isLegal(player, card) {
    return legalCards(player).some((item) => item.id === card.id);
  }

  function validTargets(player, card) {
    if (!state || !player || !card) return [];
    const others = state.players.filter(
      (item) => item.index !== player.index && !item.out && !item.protected
    );
    if (card.type === "prince") return others.concat([player]);
    return others;
  }

  function canAct() {
    if (!state || state.over || state.phase !== "play") return false;
    if (state.awaitAck != null) return false;
    const player = cur();
    if (!player || player.out) return false;
    if (isOnline()) {
      return viewerIndex() === player.index && !apiRef.net.isCpuSeat(player.index);
    }
    return !player.isCpu;
  }

  /* ------------------------------ سير الجولات ------------------------------ */

  function startRound(firstIndex) {
    if (!state) return;
    state.deck = makeDeck();
    const faceDown = state.players.length === 2 ? 3 : 1;
    state.setAside = state.deck.splice(0, faceDown);
    state.discards = [];
    state.setAside.forEach((card) => { /* محجوزة جانبًا */ });
    state.lastPlayed = null;
    state.peek = null;
    state.peekHidden = false;
    state.pending = null;
    state.drawnId = null;
    state.roundWinner = null;
    state.roundWinners = [];
    state.phase = "play";
    state.handRevealed = false;
    state.players.forEach((player) => {
      player.hand = [];
      player.protected = false;
      player.out = false;
      player.eliminatedReason = "";
      player.discardPeak = 0;
    });
    state.players.forEach((player) => {
      const card = state.deck.shift();
      if (card) player.hand.push(card);
    });
    const start =
      typeof firstIndex === "number" && state.players[firstIndex] && !state.players[firstIndex].out
        ? firstIndex
        : 0;
    state.current = start;
    state.nextStarter = start;
    state.turnSeq = (state.turnSeq || 0) + 1;
    state.notice = "الجولة " + ar(state.round) + " — دور " + state.players[start].name + ".";
    if (apiRef) {
      apiRef.log(
        "<strong>الجولة " + ar(state.round) + "</strong> بدأت — " +
          ar(state.players.length) + " لاعبين، والهدف " + ar(state.targetTokens) + " رموز محبة.",
        "accent"
      );
    }
    beginTurn();
  }

  function beginTurn() {
    if (!state || state.over || state.phase !== "play") return;
    const player = cur();
    if (!player || player.out) {
      const next = nextAliveIndex(state.current);
      if (next < 0) {
        endRound(null);
        return;
      }
      state.current = next;
      beginTurn();
      return;
    }
    player.protected = false;
    state.pending = null;
    state.peek = null;
    state.peekHidden = false;
    state.awaitAck = null;
    if (!state.deck.length) {
      endRound(null);
      return;
    }
    const drawn = state.deck.shift();
    player.hand.push(drawn);
    state.drawnId = drawn.id;
    state.turnSeq = (state.turnSeq || 0) + 1;
    state.phase = "play";
    state.handRevealed = !BG.prefs.hideSecrets || (isOnline() && viewerIndex() === player.index);
    state.notice = "دور " + player.name + " — اختر بطاقة من يدك.";
    if (apiRef) apiRef.setStatus("دور " + AI.statusName(player), "live");
    render();
    maybeAI();
  }

  function finishTurn(player) {
    if (!state || state.over || state.phase !== "play") return;
    const alive = alivePlayers();
    if (alive.length <= 1) {
      endRound(alive.length ? alive[0] : null);
      return;
    }
    const next = nextAliveIndex(player.index);
    if (next < 0) {
      endRound(null);
      return;
    }
    state.current = next;
    beginTurn();
  }

  function endRound(forcedWinner) {
    if (!state || state.over || state.phase === "roundEnd") return;
    state.pending = null;
    state.peek = null;
    state.peekHidden = false;
    state.awaitAck = null;
    state.drawnId = null;
    state.handRevealed = false;

    let winners = [];
    if (forcedWinner && !forcedWinner.out) {
      winners = [forcedWinner];
    } else {
      const alive = alivePlayers();
      if (alive.length === 1) {
        winners = [alive[0]];
      } else if (alive.length > 1) {
        const best = Math.max.apply(null, alive.map(handValue));
        let pool = alive.filter((player) => handValue(player) === best);
        if (pool.length > 1) {
          const peak = Math.max.apply(null, pool.map((player) => player.discardPeak || 0));
          pool = pool.filter((player) => (player.discardPeak || 0) === peak);
        }
        winners = pool;
      }
    }

    winners.forEach((player) => {
      player.tokens = (player.tokens || 0) + 1;
    });
    state.roundWinners = winners.map((player) => player.index);
    state.roundWinner = winners.length ? winners[0].index : null;
    state.nextStarter = state.roundWinner != null ? state.roundWinner : (state.current + 1) % state.players.length;
    state.phase = "roundEnd";

    if (winners.length) {
      state.notice =
        "انتهت الجولة " + ar(state.round) + " — " +
        winners.map((player) => player.name).join(" و") +
        " " + (winners.length === 1 ? "يحصل على" : "يحصلون على") + " رمز محبة.";
      winners.forEach((player) => {
        if (apiRef) {
          apiRef.log(
            "<strong>" + esc(player.name) + "</strong> فاز بالجولة وحصل على رمز محبة (المجموع " +
              ar(player.tokens) + ").",
            "good"
          );
        }
      });
    } else {
      state.notice = "انتهت الجولة دون فائز — لا رمز محبة هذه المرة.";
      if (apiRef) apiRef.log("انتهت الجولة بالتعادل التام دون منح رمز محبة.", "warn");
    }

    const reached = state.players.filter((player) => player.tokens >= state.targetTokens);
    if (reached.length) {
      reached.sort((a, b) => b.tokens - a.tokens || a.index - b.index);
      state.over = true;
      state.matchOver = true;
      state.phase = "matchEnd";
      state.winner = reached[0].index;
      announceMatch(reached[0]);
      return;
    }
    render();
  }

  function announceMatch(winner) {
    if (!state || state.gameOverAnnounced) return;
    state.gameOverAnnounced = true;
    state.standings = standingsList(winner);
    state.notice = "انتهت المباراة — فاز " + winner.name + " بـ" + ar(winner.tokens) + " رموز محبة.";
    if (!apiRef) return;
    apiRef.gameOver({
      icon: "💌",
      title: "فاز " + winner.name + " برسائل الحب!",
      text:
        winner.name + " جمع " + ar(winner.tokens) + " رموز محبة من أصل " +
        ar(state.targetTokens) + " بعد " + ar(state.round) + " جولات.",
      winner: winner.name,
      standings: state.standings,
      tone: "win",
    });
    if (FX) FX.after(() => FX.win(), 140);
  }

  function standingsList(winner) {
    return state.players
      .slice()
      .sort((a, b) => b.tokens - a.tokens || a.index - b.index)
      .map((player) => ({
        name: player.name + (player.index === winner.index ? " · فائز" : ""),
        value: ar(player.tokens) + " " + tokenWord(player.tokens),
      }));
  }

  function canAdvanceRound() {
    if (!isOnline()) return true;
    return !!(apiRef && apiRef.net && apiRef.net.isHost);
  }

  function nextRound() {
    if (!state || state.over || state.phase !== "roundEnd") return;
    if (!canAdvanceRound()) return;
    state.round += 1;
    startRound(state.nextStarter);
  }

  /* ------------------------------ البطاقات ------------------------------ */

  function eliminate(player, reason) {
    if (!player || player.out) return;
    player.out = true;
    player.eliminatedReason = reason || "خرج من الجولة";
    const hand = player.hand.splice(0);
    hand.forEach((card) => discardCard(player, card));
    if (apiRef) {
      apiRef.log("<strong>" + esc(player.name) + "</strong> خرج من الجولة — " + esc(reason) + ".", "warn");
    }
    if (FX) {
      FX.sound("lose");
      FX.banner("خرج " + player.name + "!", { icon: "💔", tone: "warn", duration: 1200 });
    }
    state.notice = player.name + " خرج من الجولة: " + reason + ".";
  }

  function resolveEffect(player, card, target, guess) {
    const last = state.lastPlayed;
    const result = (text) => { if (last) last.result = text; };

    switch (card.type) {
      case "guard": {
        if (!target) {
          result("لا يوجد هدف متاح — لم يُخمّن شيء.");
          break;
        }
        if (guess && target.hand.some((item) => item.type === guess)) {
          result("أصاب! كان يحمل " + CARDS[guess].name + ".");
          eliminate(target, "خمّن الحارس بطاقة " + CARDS[guess].name);
        } else {
          result(guess ? "لم يصب — لم يكن يحمل " + CARDS[guess].name + "." : "لم يخمّن شيئًا.");
        }
        break;
      }
      case "priest": {
        if (target && target.hand[0]) {
          const seen = target.hand[0];
          state.peek = {
            viewer: player.index,
            target: target.index,
            cardId: seen.id,
            type: seen.type,
          };
          state.peekHidden = false;
          result("رأى بطاقة لاعب سرًّا.");
        } else {
          result("لا توجد بطاقة ليُراها.");
        }
        break;
      }
      case "baron": {
        if (!target) {
          result("لا يوجد هدف متاح.");
          break;
        }
        const mine = cardValue(player.hand[0]);
        const theirs = cardValue(target.hand[0]);
        result("المقارنة: " + ar(mine) + " مقابل " + ar(theirs) + ".");
        if (mine > theirs) {
          eliminate(target, "خسر مقارنة البارون (" + ar(theirs) + " مقابل " + ar(mine) + ")");
        } else if (theirs > mine) {
          eliminate(player, "خسر مقارنة البارون (" + ar(mine) + " مقابل " + ar(theirs) + ")");
        } else {
          result("المقارنة: " + ar(mine) + " مقابل " + ar(theirs) + " — تعادل.");
        }
        break;
      }
      case "handmaid": {
        player.protected = true;
        result("محمي من بطاقات الخصوم حتى دوره القادم.");
        break;
      }
      case "prince": {
        if (!target) {
          result("لا يوجد هدف متاح.");
          break;
        }
        const discarded = target.hand.shift();
        if (discarded) {
          discardCard(target, discarded);
          if (discarded.type === "princess") {
            eliminate(target, "أُجبر على التخلي عن الأميرة");
          }
        }
        if (!target.out) {
          const replacement = drawOne();
          if (replacement) {
            target.hand.push(replacement);
            result("تخلّى عن بطاقته وسحب بديلًا.");
          } else {
            result("تخلّى عن بطاقته، ولم تبقَ بطاقات لسحب بديل.");
          }
        } else {
          result("أُجبر على التخلي عن الأميرة فخرج.");
        }
        break;
      }
      case "king": {
        if (!target) {
          result("لا يوجد هدف متاح.");
          break;
        }
        const mine = player.hand.slice();
        player.hand = target.hand.slice();
        target.hand = mine;
        state.drawnId = null;
        result("تبادلا البطاقتين.");
        break;
      }
      case "countess": {
        result("بطاقة نبيلة بلا تأثير.");
        break;
      }
      case "princess": {
        eliminate(player, "لعبت الأميرة");
        result("الأميرة تُخرج صاحبها من الجولة.");
        break;
      }
      default:
        result("");
    }
  }

  function playCard(cardId, target, guess) {
    if (!state || state.over || state.phase !== "play") return false;
    const player = cur();
    if (!player || player.out) return false;
    const card = player.hand.find((item) => item.id === cardId);
    if (!card) return false;
    if (!isLegal(player, card)) {
      BG.toast("يجب لعب الكونتيسة عندما تحمل الملك أو الأمير.", "warn");
      if (FX) FX.sound("error");
      return false;
    }

    const def = CARDS[card.type];
    let targetPlayer = null;

    if (TARGETED[card.type]) {
      const targets = validTargets(player, card);
      if (target == null) {
        if (targets.length) {
          state.pending = { cardId, type: card.type, step: "target" };
          state.notice = "اختر لاعبًا لبطاقة " + def.name + ".";
          render();
          return false;
        }
      } else {
        targetPlayer = state.players[target] || null;
        if (!targetPlayer || targets.indexOf(targetPlayer) === -1) {
          BG.toast("هذا الهدف غير متاح الآن.", "warn");
          if (FX) FX.sound("error");
          return false;
        }
      }
    }

    if (card.type === "guard" && targetPlayer && guess == null) {
      state.pending = { cardId, type: card.type, step: "guess", target: targetPlayer.index };
      state.notice = "خمّن البطاقة التي يحملها " + targetPlayer.name + ".";
      render();
      return false;
    }
    if (card.type === "guard" && guess != null && !CARDS[guess]) return false;

    state.pending = null;
    const index = player.hand.indexOf(card);
    if (index >= 0) player.hand.splice(index, 1);
    discardCard(player, card);
    state.lastPlayed = {
      player: player.index,
      card: { id: card.id, type: card.type },
      target: targetPlayer ? targetPlayer.index : null,
      guess: guess || null,
      result: "",
    };
    state.drawnId = null;
    state.peek = null;
    state.peekHidden = false;

    if (apiRef) {
      let line = "<strong>" + esc(player.name) + "</strong> لعب <strong>" + esc(def.name) + "</strong>";
      if (targetPlayer) line += " على <strong>" + esc(targetPlayer.name) + "</strong>";
      if (guess && CARDS[guess]) line += " وخمّن <strong>" + esc(CARDS[guess].name) + "</strong>";
      apiRef.log(line + ".", "accent");
    }
    if (FX) FX.sound("card");

    resolveEffect(player, card, targetPlayer, guess);

    if (FX && rootRef) {
      FX.after(() => {
        const pile = rootRef.querySelector(".ll-pile-discard");
        if (pile) {
          FX.pop(pile);
          FX.pulse(pile);
        }
      }, 20);
    }

    if (!state || state.over) {
      render();
      return true;
    }
    if (state.phase === "roundEnd") {
      render();
      return true;
    }
    if (card.type === "priest" && state.peek && !player.isCpu) {
      const peeked = state.players[state.peek.target];
      state.awaitAck = player.index;
      state.notice =
        "اطّلعت على بطاقة " + (peeked ? peeked.name : "الخصم") +
        " — اضغط «تم» لإنهاء دورك بعد حفظ المعلومة.";
      render();
      return true;
    }
    finishTurn(player);
    return true;
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function remainingCounts(player) {
    const counts = {};
    TYPES.forEach((type) => { counts[type] = CARDS[type].count; });
    (player.hand || []).forEach((card) => {
      if (counts[card.type] != null) counts[card.type] -= 1;
    });
    state.discards.forEach((card) => {
      if (counts[card.type] != null) counts[card.type] -= 1;
    });
    TYPES.forEach((type) => {
      if (counts[type] < 0) counts[type] = 0;
    });
    return counts;
  }

  function aiGuess(player) {
    const counts = remainingCounts(player);
    const options = TYPES.filter((type) => type !== "guard");
    return AI.weighted(options, (type) => {
      const count = Math.max(0.1, counts[type]);
      return count * (CARDS[type].value >= 6 ? 1.7 : 1);
    }) || "princess";
  }

  function aiPickTarget(player, card) {
    const targets = validTargets(player, card);
    if (!targets.length) return null;
    if (card.type === "prince") {
      const others = targets.filter((item) => item.index !== player.index);
      const other = player.hand.find((item) => item.type !== card.type);
      const otherValue = cardValue(other);
      if (others.length && (otherValue > 2 || Math.random() > 0.45)) {
        const pick = AI.weighted(others, (item) => 1 + (item.tokens || 0) * 0.45);
        return pick ? pick.index : others[0].index;
      }
      return player.index;
    }
    const pick = AI.weighted(targets, (item) => 1 + (item.tokens || 0) * 0.6);
    return pick ? pick.index : targets[0].index;
  }

  function chooseAiMove(player) {
    const legal = legalCards(player);
    if (!legal.length) return null;
    if (legal.length === 1) {
      const only = legal[0];
      const target = TARGETED[only.type] ? aiPickTarget(player, only) : null;
      const guess = only.type === "guard" ? aiGuess(player) : null;
      return { card: only, target, guess };
    }

    const card = AI.weighted(legal, (item) => {
      const other = player.hand.find((entry) => entry.id !== item.id);
      const otherValue = cardValue(other);
      switch (item.type) {
        case "guard":
          return validTargets(player, item).length ? 3.2 : 1.4;
        case "priest":
          return 2.3;
        case "baron":
          return otherValue >= 4 ? 4.4 : 1.1;
        case "handmaid":
          return otherValue >= 5 ? 3.8 : 1.7;
        case "prince":
          return otherValue <= 3 && other.type !== "princess" ? 3.6 : 2.1;
        case "king":
          return otherValue <= 3 ? 3.4 : 1.2;
        case "countess":
          return 0.1;
        case "princess":
          return 0.05;
        default:
          return 1;
      }
    }) || legal[0];

    const target = TARGETED[card.type] ? aiPickTarget(player, card) : null;
    const guess = card.type === "guard" ? aiGuess(player) : null;
    return { card, target, guess };
  }

  function maybeAI() {
    if (!state || state.over || state.phase !== "play") return;
    const player = cur();
    if (!player || !player.isCpu || !AI.autoAllowed(apiRef, player)) return;
    const seat = player.index;
    const expected = state.turnSeq;
    aiRunner.later(() => {
      if (!state || state.over || state.phase !== "play") return;
      if (state.current !== seat || state.turnSeq !== expected) return;
      const move = chooseAiMove(player);
      if (!move) return;
      playCard(move.card.id, move.target, move.guess);
    }, AI.delay(player.level));
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function cardHTML(card, opts) {
    const def = cardDef(card);
    if (!def) return "";
    const o = opts || {};
    const classes = ["ll-card"];
    if (o.small) classes.push("ll-card-sm");
    if (o.drawn) classes.push("is-drawn");
    if (o.blocked) classes.push("is-blocked");
    if (o.playable) classes.push("is-playable");
    const style = "--lcc:" + def.color + ";";
    if (o.button) {
      return (
        '<button type="button" class="' + classes.join(" ") + '" data-ll-card="' + esc(card.id) + '"' +
        ' style="' + style + '"' + (o.blocked ? " disabled" : "") + ">" +
        '<span class="ll-card-value">' + ar(def.value) + "</span>" +
        '<span class="ll-card-icon">' + def.icon + "</span>" +
        '<span class="ll-card-name">' + esc(def.name) + "</span>" +
        '<span class="ll-card-text">' + esc(def.text) + "</span>" +
        (o.drawn ? '<span class="ll-card-badge">مسحوبة</span>' : "") +
        "</button>"
      );
    }
    return (
      '<span class="' + classes.join(" ") + '" style="' + style + '">' +
      '<span class="ll-card-value">' + ar(def.value) + "</span>" +
      '<span class="ll-card-icon">' + def.icon + "</span>" +
      '<span class="ll-card-name">' + esc(def.name) + "</span>" +
      "</span>"
    );
  }

  function deckPileHTML() {
    return (
      '<div class="ll-pile ll-pile-draw">' +
      '<span class="ll-pile-label">مجموعة السحب</span>' +
      '<span class="ll-card-back"><b>💌</b><i>' + (state.deck.length ? ar(state.deck.length) : "—") + "</i></span>" +
      '<small>' + (state.deck.length ? "متبقٍ " + ar(state.deck.length) + " بطاقة" : "المجموعة فارغة") + "</small>" +
      "</div>"
    );
  }

  function discardPileHTML() {
    const top = state.discards[state.discards.length - 1];
    return (
      '<div class="ll-pile ll-pile-discard">' +
      '<span class="ll-pile-label">آخر بطاقة</span>' +
      (top ? cardHTML(top, { small: true }) : '<span class="ll-card-empty">—</span>') +
      "<small>" + (top ? "على الطاولة" : "لم تُلعب بطاقة بعد") + "</small>" +
      "</div>"
    );
  }

  function lastPlayedHTML() {
    const last = state.lastPlayed;
    if (!last) {
      return (
        '<div class="ll-last is-empty">' +
        '<span class="cg-kicker">آخر لعب</span>' +
        "<p>لم تُلعب بطاقة بعد في هذه الجولة.</p>" +
        "</div>"
      );
    }
    const player = state.players[last.player];
    const card = CARDS[last.card.type];
    const target = last.target != null ? state.players[last.target] : null;
    return (
      '<div class="ll-last">' +
      '<span class="cg-kicker">آخر لعب</span>' +
      "<p><b>" + esc(player ? player.name : "—") + "</b> لعب <b>" + esc(card ? card.name : "—") + "</b>" +
      (target ? " على <b>" + esc(target.name) + "</b>" : "") + ".</p>" +
      (last.guess && CARDS[last.guess] ? '<small>التخمين: ' + esc(CARDS[last.guess].name) + "</small>" : "") +
      (last.result ? '<small class="ll-last-result">' + esc(last.result) + "</small>" : "") +
      "</div>"
    );
  }

  function playerRowHTML(player) {
    const classes = ["ll-player", "p" + player.index];
    if (player.index === state.current && !state.over) classes.push("active");
    if (player.protected) classes.push("protected");
    if (player.out) classes.push("out");
    if (player.isCpu) classes.push("cpu");
    if (isOnline() && player.index === viewerIndex()) classes.push("mine");
    const status = player.out
      ? "خرج — " + (player.eliminatedReason || "من الجولة")
      : "بطاقات: " + ar(player.hand.length) + (player.protected ? " · 🛡️ محمي" : "");
    return (
      '<div class="' + classes.join(" ") + '">' +
      '<span class="ll-avatar" aria-hidden="true">' + (player.isCpu ? "🤖" : "🎭") + "</span>" +
      '<div class="ll-player-copy"><strong>' + esc(player.name) + "</strong><small>" + esc(status) + "</small></div>" +
      '<span class="ll-tokens" title="رموز المحبة"><b>♥</b>' + ar(player.tokens) + "</span>" +
      "</div>"
    );
  }

  function playersHTML() {
    return state.players.map(playerRowHTML).join("");
  }

  function courtHTML() {
    const last = state.lastPlayed;
    const lastTarget = last && last.target != null ? state.players[last.target] : null;
    return (
      '<section class="ll-court">' +
      '<div class="ll-court-head">' +
      '<span class="cg-kicker">طاولة القصر</span>' +
      '<span class="cg-count">' +
      (lastTarget ? "آخر هدف: " + esc(lastTarget.name) + " · " : "") +
      "الهدف " + ar(state.targetTokens) + " رموز" +
      "</span>" +
      "</div>" +
      '<div class="ll-court-body">' +
      deckPileHTML() +
      discardPileHTML() +
      lastPlayedHTML() +
      "</div>" +
      '<div class="ll-players">' + playersHTML() + "</div>" +
      '<div class="ll-notice">' + esc(state.notice) + "</div>" +
      "</section>"
    );
  }

  function handHTML(player) {
    if (!player) return "";
    if (!player.hand.length) {
      return '<p class="ll-empty">لا توجد بطاقات في يدك — انتظر بداية الجولة التالية.</p>';
    }
    const legal = legalCards(player);
    const active = canAct();
    const cards = player.hand.map((card) =>
      cardHTML(card, {
        button: true,
        drawn: card.id === state.drawnId,
        blocked: active ? !legal.some((item) => item.id === card.id) : false,
        playable: active && legal.some((item) => item.id === card.id),
      })
    ).join("");
    let hint = "اختر بطاقة واحدة لتلعبها. كل بطاقة لها أثر مختلف.";
    if (state.awaitAck === player.index) {
      hint = "اطّلعت على بطاقة الخصم — اضغط «تم» في لوحة السر لإنهاء دورك.";
    } else if (!active) {
      hint = state.phase === "play"
        ? "بطاقتك سرّية. لا يمكنك اللعب إلا في دورك."
        : "انتهت الجولة — راجع النتيجة ثم ابدأ الجولة التالية.";
    } else if (mustPlayCountess(player)) {
      hint = "تحمل الكونتيسة مع الملك أو الأمير — يجب لعب الكونتيسة الآن.";
    } else if (state.pending) {
      hint = state.pending.step === "guess"
        ? "اختر تخمينك من اللوحة الجانبية."
        : "اختر هدفًا من اللوحة الجانبية.";
    }
    return '<div class="ll-hand">' + cards + '</div><p class="ll-hand-hint">' + esc(hint) + "</p>";
  }

  function watchHTML() {
    return (
      '<div class="cg-panel ll-watch">' +
      '<span class="cg-kicker">👁 وضع المشاهدة</span>' +
      "<p>تتابع الطاولة مباشرة. تبقى بطاقات اللاعبين مخفية، ولا يمكنك اللعب من مقعد المشاهد.</p>" +
      "</div>"
    );
  }

  function peekHTML() {
    const peek = state.peek;
    if (!peek || peek.viewer !== viewerIndex()) return "";
    const target = state.players[peek.target];
    const def = CARDS[peek.type];
    if (!target || !def) return "";
    return (
      '<div class="cg-panel ll-peek">' +
      '<div class="cg-side-head">' +
      '<span class="cg-kicker">🔮 سر الكاهن</span>' +
      '<span class="ll-peek-actions">' +
      '<button type="button" class="bg-btn small" data-ll-peek-toggle>' +
      (state.peekHidden ? "👁 إظهار" : "🙈 إخفاء") +
      "</button>" +
      (state.awaitAck != null ? '<button type="button" class="bg-btn small primary" data-ll-ack>تم</button>' : "") +
      "</span></div>" +
      (state.peekHidden
        ? '<p class="ll-peek-hint">المعلومة مخفية. أظهرها فقط عندما تكون وحدك أمام الشاشة.</p>'
        : '<p class="ll-peek-text">بطاقة <b>' + esc(target.name) + "</b> هي " +
          '<strong style="--lcc:' + def.color + '">' + def.icon + " " + esc(def.name) +
          " (" + ar(def.value) + ")</strong>.</p>") +
      (state.awaitAck != null
        ? '<p class="ll-peek-hint">احفظ المعلومة ثم اضغط «تم» لإنهاء دورك.</p>'
        : "") +
      "</div>"
    );
  }

  function pendingHTML() {
    if (!state.pending || !canAct()) return "";
    const player = cur();
    const pending = state.pending;
    const def = CARDS[pending.type];
    if (!def) return "";
    if (pending.step === "guess") {
      const target = state.players[pending.target];
      return (
        '<div class="cg-panel ll-pending">' +
        '<div class="cg-side-head"><span class="cg-kicker">🛡️ تخمين الحارس</span>' +
        '<button type="button" class="bg-btn small" data-ll-cancel>رجوع</button></div>' +
        "<p>اختر البطاقة التي تظن أن <b>" + esc(target ? target.name : "الهدف") + "</b> يحملها.</p>" +
        '<div class="ll-guesses">' +
        TYPES.filter((type) => type !== "guard").map((type) => {
          const guess = CARDS[type];
          return (
            '<button type="button" class="ll-guess" data-ll-guess="' + type + '" style="--lcc:' + guess.color + '">' +
            '<i aria-hidden="true">' + guess.icon + "</i>" +
            "<span>" + esc(guess.name) + "</span>" +
            "<b>" + ar(guess.value) + "</b></button>"
          );
        }).join("") +
        "</div></div>"
      );
    }
    const targets = validTargets(player, { type: pending.type });
    return (
      '<div class="cg-panel ll-pending">' +
      '<div class="cg-side-head"><span class="cg-kicker">🎯 هدف ' + esc(def.name) + "</span>" +
      '<button type="button" class="bg-btn small" data-ll-cancel>رجوع</button></div>' +
      "<p>" + esc(def.text) + "</p>" +
      '<div class="ll-targets">' +
      targets.map((target) => (
        '<button type="button" class="ll-target" data-ll-target="' + target.index + '">' +
        '<span class="ll-target-name">' + esc(target.name) + (target.index === player.index ? " (أنت)" : "") + "</span>" +
        '<small>♥ ' + ar(target.tokens) + " · " + (target.hand.length ? "بطاقة واحدة" : "بلا بطاقات") + "</small>" +
        "</button>"
      )).join("") +
      "</div></div>"
    );
  }

  function roundHTML() {
    if (state.phase !== "roundEnd") return "";
    const winners = state.roundWinners.map((index) => state.players[index]).filter(Boolean);
    const text = winners.length
      ? winners.map((player) => player.name).join(" و") +
        " " + (winners.length === 1 ? "يحصل على" : "يحصلون على") + " رمز محبة."
      : "لم يفز أحد بهذه الجولة.";
    return (
      '<div class="cg-panel ll-round">' +
      '<span class="cg-kicker">نهاية الجولة ' + ar(state.round) + "</span>" +
      "<p>" + esc(text) + "</p>" +
      '<div class="ll-round-score">' +
      state.players.map((player) => (
        '<span class="ll-round-pill' + (winners.indexOf(player) !== -1 ? " is-winner" : "") + '">' +
        esc(player.name) + " <b>♥" + ar(player.tokens) + "</b></span>"
      )).join("") +
      "</div>" +
      (canAdvanceRound()
        ? '<button type="button" class="bg-btn primary" data-ll-next>الجولة التالية ←</button>'
        : '<p class="ll-round-wait">بانتظار المضيف لبدء الجولة التالية…</p>') +
      "</div>"
    );
  }

  function turnHint() {
    if (!state) return "";
    if (state.over) return "انتهت المباراة. ابدأ مباراة جديدة من الشريط العلوي.";
    if (state.phase === "roundEnd") return "انتهت الجولة. ابدأ الجولة التالية عندما يكون الجميع مستعدًا.";
    if (state.awaitAck != null) {
      return "اطّلعت على بطاقة الخصم. احفظ المعلومة ثم اضغط «تم» في لوحة السر لإنهاء دورك.";
    }
    const player = cur();
    if (!canAct()) {
      return "بانتظار " + (player ? player.name : "اللاعب") + " — تبقى بطاقات الجميع مخفية.";
    }
    if (state.pending && state.pending.step === "guess") {
      const target = state.players[state.pending.target];
      return "خمّن بطاقة " + (target ? target.name : "الهدف") + " من اللوحة الجانبية.";
    }
    if (state.pending) return "اختر هدفًا لبطاقة " + (CARDS[state.pending.type] || {}).name + ".";
    return "أظهر بطاقاتك ثم اختر البطاقة التي ستلعبها.";
  }

  function sideHTML() {
    return (
      '<div class="cg-panel ll-turn-panel">' +
      '<span class="cg-kicker">' + (state.awaitAck != null ? "تأكيد الاطلاع" : canAct() ? "دورك الآن" : "الانتظار") + "</span>" +
      '<p class="ll-turn-text">' + esc(turnHint()) + "</p>" +
      "</div>" +
      '<div class="cg-panel ll-legend">' +
      '<span class="cg-kicker">بطاقات القصر</span>' +
      TYPES.map((type) => {
        const def = CARDS[type];
        return (
          '<div class="ll-legend-row" style="--lcc:' + def.color + '">' +
          '<span class="ll-legend-val">' + ar(def.value) + "</span>" +
          '<span class="ll-legend-copy"><strong>' + def.icon + " " + esc(def.name) + "</strong><small>" +
          esc(def.text) + "</small></span>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
      '<div class="cg-panel ll-goal">' +
      '<span class="cg-kicker">هدف المباراة</span>' +
      "<p>اجمع <b>" + ar(state.targetTokens) + "</b> رموز محبة قبل الجميع. عند نفاد المجموعة يفوز صاحب أعلى بطاقة، والتعادل يُحسم بأعلى بطاقة تخلّى عنها اللاعب.</p>" +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "ll-layout";

    const main = document.createElement("div");
    main.className = "ll-main";
    main.innerHTML = courtHTML();

    const handSlot = document.createElement("div");
    handSlot.className = "ll-hand-slot";
    main.appendChild(handSlot);

    const extras = document.createElement("div");
    extras.className = "ll-extras";
    extras.innerHTML = peekHTML() + pendingHTML() + roundHTML();
    main.appendChild(extras);

    const side = document.createElement("aside");
    side.className = "cg-side ll-side";
    side.innerHTML = sideHTML();

    wrap.appendChild(main);
    wrap.appendChild(side);

    const player = viewerPlayer();
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (player) {
      const secret = BG.secretPanel({
        title: "💌 بطاقات " + player.name,
        owner: player.name,
        hint: "بطاقتك سرّية. أظهرها فقط في دورك، ثم أخفها قبل تمرير الجهاز.",
        open: state.handRevealed,
        autoKey: isOnline() ? "love-letter:" + viewerIndex() + ":" + state.turnSeq : "",
        onToggle(visible) {
          state.handRevealed = visible;
          render();
        },
        render() {
          return handHTML(player);
        },
      });
      handSlot.appendChild(secret.el);
    } else {
      handSlot.innerHTML = watchHTML();
    }

    if (FX) {
      const active = rootRef.querySelector(".ll-player.active");
      if (active) FX.pulse(active);
    }
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function chooseTarget(index) {
    if (!state || !state.pending || state.pending.step !== "target") return;
    const pending = state.pending;
    playCard(pending.cardId, index);
  }

  function chooseGuess(type) {
    if (!state || !state.pending || state.pending.step !== "guess") return;
    const pending = state.pending;
    playCard(pending.cardId, pending.target, type);
  }

  function onClick(event) {
    if (!state) return;
    const node = event.target && event.target.closest ? event.target : null;
    if (!node) return;

    const peekBtn = event.target.closest("[data-ll-peek-toggle]");
    if (peekBtn) {
      state.peekHidden = !state.peekHidden;
      render();
      return;
    }

    const nextBtn = event.target.closest("[data-ll-next]");
    if (nextBtn) {
      nextRound();
      return;
    }

    const ackBtn = event.target.closest("[data-ll-ack]");
    if (ackBtn && state.awaitAck != null) {
      const player = state.players[state.awaitAck];
      state.awaitAck = null;
      state.peek = null;
      state.peekHidden = false;
      if (player) finishTurn(player);
      else render();
      return;
    }

    if (state.over || !canAct()) return;

    if (event.target.closest("[data-ll-cancel]")) {
      state.pending = null;
      state.notice = "أُلغي الاختيار — اختر بطاقة أخرى.";
      render();
      return;
    }

    const targetBtn = event.target.closest("[data-ll-target]");
    if (targetBtn) {
      chooseTarget(Number(targetBtn.getAttribute("data-ll-target")));
      return;
    }

    const guessBtn = event.target.closest("[data-ll-guess]");
    if (guessBtn) {
      chooseGuess(guessBtn.getAttribute("data-ll-guess"));
      return;
    }

    const cardBtn = event.target.closest("[data-ll-card]");
    if (cardBtn) {
      playCard(cardBtn.getAttribute("data-ll-card"));
    }
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "love-letter",
    name: "رسائل الحب",
    en: "LOVE LETTER",
    icon: "💌",
    accent: "#e05a7a",
    cardClass: "card-love-letter",
    tagline: "بطاقات قليلة وقرارات دقيقة: خمّن، بادل، واحمِ سرّك حتى يصل خطابك إلى الأميرة.",
    players: "2–4",
    duration: "15–25 دقيقة",
    complexity: "سهلة–متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 4,

    options: {
      hint: "خيارات المباراة. تُطبَّق على اللعب المحلي والجماعي معًا.",
      defaults: { tokenGoal: null },
      fields: [
        {
          key: "tokenGoal",
          label: "هدف رموز المحبة",
          type: "seg",
          choices: [
            { value: null, label: "حسب اللاعبين" },
            { value: 4, label: "٤ رموز" },
            { value: 5, label: "٥ رموز" },
            { value: 7, label: "٧ رموز" },
          ],
          hint: "الافتراضي: ٤ لاعبين ← ٤ رموز، ٣ لاعبين ← ٥ رموز، لاعبين ← ٧ رموز.",
        },
      ],
      summary(options) {
        const goal = [4, 5, 7].indexOf(Number(options.tokenGoal)) !== -1
          ? Number(options.tokenGoal) + " رموز"
          : "حسب اللاعبين";
        return goal;
      },
    },

    rules: {
      goal: "اجمع أكبر عدد من رموز المحبة عبر جولات قصيرة. في كل جولة احتفظ ببطاقة واحدة أخيرة، واستخدم بطاقاتك لإقصاء الخصوم أو حماية نفسك أو كشف أسرارهم.",
      facts: [["البطاقات", "١٦ بطاقة"], ["اللاعبون", "٢–٤"], ["اليد", "بطاقة واحدة + سحب"], ["الفوز", "٤–٧ رموز محبة"]],
      components: [
        "١٦ بطاقة: ٥ حراس، ٢ كاهن، ٢ بارون، ٢ وصيفة، ٢ أمير، ملك، كونتيسة، وأميرة.",
        "رموز محبة لكل لاعب لتسجيل نقاط الجولات.",
        "كومة سحب، كومة بطاقات ملعوبة، وبطاقة أو ثلاث بطاقات تُحجب جانبًا في بداية كل جولة.",
      ],
      setup: [
        "تُخلط البطاقات الست عشرة. في لعبة اللاعبين تُحجب ٣ بطاقات جانبًا، وفي ٣ أو ٤ لاعبين تُحجب بطاقة واحدة.",
        "تُوزع بطاقة واحدة لكل لاعب، وتبقى البطاقات الأخرى في كومة السحب.",
        "يبدأ اللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة بين اللاعبين الذين لم يخرجوا.",
        "في بداية دورك اسحب بطاقة واحدة، فتصبح لديك بطاقتان، ثم العب واحدة منهما.",
      ],
      steps: [
        "<strong>الحارس (١):</strong> خمّن بطاقة غير الحارس يحملها لاعب آخر. إن أصبت يخرج فورًا.",
        "<strong>الكاهن (٢):</strong> انظر سرًّا إلى بطاقة لاعب آخر. تبقى المعلومة لك حتى نهاية دورك.",
        "<strong>البارون (٣):</strong> قارن بطاقتك المتبقية ببطاقة لاعب آخر. صاحب القيمة الأدنى يخرج، والتعادل لا يُخرج أحدًا.",
        "<strong>الوصيفة (٤):</strong> تحميك من بطاقات الخصوم حتى بداية دورك القادم.",
        "<strong>الأمير (٥):</strong> اختر لاعبًا، حتى نفسك، ليتخلى عن بطاقته ويسحب بديلًا. إن كانت بطاقته الأميرة يخرج.",
        "<strong>الملك (٦):</strong> بادل بطاقتك المتبقية مع بطاقة لاعب آخر.",
        "<strong>الكونتيسة (٧):</strong> لا تأثير لها، لكن يجب لعبها إذا كنت تحمل الملك أو الأمير معها.",
        "<strong>الأميرة (٨):</strong> إن تخلّيت عنها لأي سبب، سواء بلعبها أو بإجبار الأمير أو البارون، تخرج من الجولة.",
      ],
      winning: "تنتهي الجولة عندما يبقى لاعب واحد فقط، أو عندما تنفد كومة السحب. عند نفاد المجموعة يفوز صاحب أعلى بطاقة في يده، وعند التعادل يفوز من تخلّى عن أعلى بطاقة. الفائز يحصل على رمز محبة، وأول من يصل إلى الهدف المحدد يفوز بالمباراة.",
      notes: [
        "الهدف الافتراضي: ٧ رموز للاعبين اثنين، ٥ لثلاثة لاعبين، ٤ لأربعة لاعبين، ويمكن تغييره من خيارات اللعبة.",
        "بطاقات كل لاعب مخفية في DOM ولا تُرسم إلا بعد الضغط على «إظهار».",
        "معلومة الكاهن تظهر للاعب الحالي فقط، ويمكن إخفاؤها بزر «إخفاء».",
        "إذا لم يبقَ هدف صالح لبطاقة موجهة، تُلعب البطاقة دون أثر.",
        "عند نفاد كومة السحب بسبب الأمير، تُستخدم البطاقات المحجوبة جانبًا كبديل احتياطي.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      state = makeMatch(api.options || {});
      apiRef.log(
        "بدأت رسائل الحب — " + ar(state.players.length) + " لاعبين، والهدف " +
          ar(state.targetTokens) + " رموز محبة.",
        "accent"
      );
      render();
      maybeAI();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render,
          playCard,
          nextRound,
          endRound,
          startRound,
          makeDeck,
          legalCards,
          validTargets,
          handOf: (index) => state.players[index].hand,
          CARDS,
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          const next = BG.netCodec.decode(data);
          if (!next || !Array.isArray(next.players)) return;
          state = next;
          state.players.forEach((player) => {
            player.hand = Array.isArray(player.hand)
              ? player.hand.filter((card) => card && CARDS[card.type])
              : [];
            player.tokens = Number(player.tokens) || 0;
            player.protected = !!player.protected;
            player.out = !!player.out;
            player.discardPeak = Number(player.discardPeak) || 0;
          });
          state.deck = Array.isArray(state.deck) ? state.deck.filter((card) => card && CARDS[card.type]) : [];
          state.setAside = Array.isArray(state.setAside) ? state.setAside.filter((card) => card && CARDS[card.type]) : [];
          state.discards = Array.isArray(state.discards) ? state.discards.filter((card) => card && CARDS[card.type]) : [];
          state.phase = state.phase || "play";
          state.pending = null;
          state.peek = state.peek && CARDS[state.peek.type] ? state.peek : null;
          state.awaitAck = state.awaitAck == null ? null : Number(state.awaitAck);
          state.handRevealed = false;
          state.gameOverAnnounced = !!state.matchOver;
          if (!state.targetTokens) state.targetTokens = targetGoal(state.players.length);
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
          state.pending = null;
          state.handRevealed =
            !BG.prefs.hideSecrets || (isOnline() && state.phase === "play" && viewerIndex() === state.current);
          render();
          if (!state.over && state.phase === "play") maybeAI();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
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
