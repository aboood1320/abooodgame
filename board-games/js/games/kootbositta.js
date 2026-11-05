/* ==========================================================================
   كوت بو ستة — KOOT BO SITTA
   لعبة فريقين: ٦ لاعبين (٥٤ ورقة) أو ٤ لاعبين (٣٦ ورقة).
   مزايدة ٥ (باب) → ٩ (باون)، حكم، ٩ لمات، وقواعد جيكر/ميكر.
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
  const RANK_LABEL = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const TEAM_NAMES = ["الفريق أ", "الفريق ب", "الفريق ج"];
  const TEAM_SHORT = ["أ", "ب", "ج"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (digit) => AR_DIGITS[Number(digit)]);
  }
  const esc = (value) => U.escape(value);

  /* ترتيب القوة داخل النوع (القاعدة المعتادة): A أقوى ثم K ثم Q ثم J ثم ١٠ … حتى ٢ الأضعف.
     (كان معكوسًا: الورقة الأقل قيمة تأخذ اللمة.) */
  function rankOrder(rank) {
    return rank;
  }
  function rankLabel(rank) {
    return RANK_LABEL[rank] || String(rank);
  }
  function isJoker(card) {
    return !!card && card.kind === "joker";
  }
  function suitOf(card) {
    return card && card.kind === "card" ? SUITS[card.suit] : null;
  }
  function cardLabel(card) {
    if (!card) return "ورقة";
    if (isJoker(card)) return card.color === "black" ? "الميكر الأسود" : "الجيكر الأحمر";
    const suit = suitOf(card);
    return rankLabel(card.rank) + (suit ? suit.sym : "");
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
    if (isJoker(card)) {
      const red = card.color !== "black";
      return (
        '<span class="wq-corner wq-corner-tl"><b>J</b><i>★</i></span>' +
        '<span class="wq-corner wq-corner-br"><b>J</b><i>★</i></span>' +
        '<span class="wq-art wq-joker ' + (red ? "is-red" : "is-black") + '">' +
        '<span class="wq-joker-star">✦</span><span class="wq-joker-word">JOKER</span>' +
        '<span class="wq-joker-star is-small">✦</span></span>'
      );
    }
    const suit = suitOf(card);
    if (!suit) return "";
    const rank = rankLabel(card.rank);
    const corner =
      '<span class="wq-corner wq-corner-tl"><b>' + rank + '</b><i>' + suit.sym + "</i></span>" +
      '<span class="wq-corner wq-corner-br"><b>' + rank + '</b><i>' + suit.sym + "</i></span>";
    let art;
    if (card.rank === 14) {
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
      '<span class="wq-back-medallion"><span>ك</span></span>' +
      "</span>"
    );
  }

  function bidName(value) {
    if (value === 5) return "باب";
    if (value === 9) return "باون";
    return "طلب " + ar(value);
  }
  function teamLabel(team) {
    return TEAM_NAMES[team] || "الفريق";
  }

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;

  /* ------------------------------ الحالة والاتصال ------------------------------ */

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }
  function activeSeat() {
    if (!state) return -1;
    if (state.phase === "trump") return state.bidder;
    if (state.phase === "bidding" || state.phase === "play") return state.current;
    return -1;
  }
  function viewerIndex() {
    if (!state) return -1;
    if (isOnline()) {
      return Number.isInteger(apiRef.net.seat) && apiRef.net.seat >= 0 ? apiRef.net.seat : -1;
    }
    if (state.phase === "roundEnd" || state.phase === "over" || state.over) return -1;
    const player = state.players[state.current];
    return player && !player.isCpu ? state.current : -1;
  }
  function viewerPlayer() {
    const index = viewerIndex();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }
  function canAct() {
    if (!state || state.over) return false;
    if (state.phase !== "bidding" && state.phase !== "trump" && state.phase !== "play") return false;
    const seat = activeSeat();
    if (seat < 0) return false;
    const player = state.players[seat];
    if (!player) return false;
    if (isOnline()) {
      return apiRef.net.seat === seat && !apiRef.net.isCpuSeat(seat);
    }
    return !player.isCpu;
  }
  function canAdvanceRound() {
    if (!isOnline()) return true;
    return !!(apiRef && apiRef.net && apiRef.net.isHost);
  }
  function handOpen() {
    if (!state) return false;
    if (!BG.prefs.hideSecrets) return true;
    if (state.handRevealed) return true;
    const index = viewerIndex();
    return index >= 0 && index === activeSeat();
  }

  /* ------------------------------ بناء الأوراق ------------------------------ */

  function buildDeck(count) {
    const deck = [];
    let sequence = 0;
    SUIT_KEYS.forEach((suit) => {
      for (let rank = 2; rank <= 14; rank++) {
        if (count === 4) {
          if (rank <= 5) continue;
          if ((suit === "hearts" || suit === "diamonds") && rank === 6) continue;
        }
        deck.push({ id: "k" + sequence++, kind: "card", suit, rank });
      }
    });
    deck.push({ id: "k" + sequence++, kind: "joker", color: "red" });
    deck.push({ id: "k" + sequence++, kind: "joker", color: "black" });
    return U.shuffle(deck);
  }

  function validCard(card) {
    if (!card || typeof card !== "object") return false;
    if (card.kind === "joker") return card.color === "red" || card.color === "black";
    if (card.kind === "card") {
      return !!SUITS[card.suit] && Number.isInteger(card.rank) && card.rank >= 2 && card.rank <= 14;
    }
    return false;
  }

  function makePlayers() {
    const numTeams = 2;
    return (apiRef.players || []).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      team: index % numTeams,
      hand: [],
      passed: false,
      bid: 0,
    }));
  }

  function makeMatch(options) {
    const opts = options || {};
    const players = makePlayers();
    const count = players.length === 4 ? 4 : 6;
    while (players.length > count) players.pop();
    const numTeams = 2;
    const target = Number(opts.matchTarget) === 51 ? 51 : 101;
    state = {
      count,
      numTeams,
      players,
      dealer: Math.floor(Math.random() * count),
      round: 1,
      phase: "bidding",
      current: 0,
      bid: 0,
      bidder: -1,
      forced: false,
      trump: null,
      ledSuit: null,
      jokerLead: false,
      trick: [],
      lastTrick: [],
      showLast: false,
      trickWinner: -1,
      trickNum: 0,
      tricksWon: Array(numTeams).fill(0),
      scores: Array(numTeams).fill(0),
      target,
      trumpHonorPlayed: false,
      roundResult: null,
      notice: "",
      over: false,
      matchOver: false,
      winnerTeam: null,
      handRevealed: false,
      gameOverAnnounced: false,
      turnSeq: 0,
      standings: [],
    };
    startRound();
    return state;
  }

  function logLine(message, kind) {
    if (apiRef) apiRef.log(message, kind);
  }

  /* ------------------------------ الجولات والتوزيع ------------------------------ */

  function startRound() {
    const count = state.count;
    const deck = buildDeck(count);
    state.players.forEach((player) => {
      player.hand = [];
      player.passed = false;
      player.bid = 0;
    });
    for (let round = 0; round < 9; round++) {
      for (let seat = 0; seat < count; seat++) {
        const card = deck.pop();
        if (card) state.players[(state.dealer + seat) % count].hand.push(card);
      }
    }
    state.phase = "bidding";
    state.current = (state.dealer + 1) % count;
    state.bid = 0;
    state.bidder = -1;
    state.forced = false;
    state.trump = null;
    state.ledSuit = null;
    state.jokerLead = false;
    state.trick = [];
    state.lastTrick = [];
    state.showLast = false;
    state.trickWinner = -1;
    state.trickNum = 0;
    state.tricksWon = Array(state.numTeams || 2).fill(0);
    state.trumpHonorPlayed = false;
    state.roundResult = null;
    state.handRevealed = false;
    state.notice =
      "الجولة " + ar(state.round) + " — المزايدة تبدأ من " +
      state.players[state.current].name + ". الطلبات من ٥ (باب) إلى ٩ (باون).";
    state.turnSeq = (state.turnSeq || 0) + 1;
    logLine(
      "بدأت الجولة " + ar(state.round) + " — " + ar(count) + " لاعبين، " +
        ar(count === 4 ? 36 : 54) + " ورقة، والموزّع " + esc(state.players[state.dealer].name) + ".",
      "accent"
    );
    if (FX) FX.sound("shuffle");
    render();
    maybeAI();
  }

  /* ------------------------------ المزايدة ------------------------------ */

  function nextBidder() {
    const count = state.count;
    for (let step = 1; step <= count; step++) {
      const index = (state.current + step) % count;
      if (state.players[index].passed) continue;
      if (index === state.bidder) continue;
      return index;
    }
    return -1;
  }

  function advanceBidding() {
    state.turnSeq = (state.turnSeq || 0) + 1;
    const next = nextBidder();
    if (next >= 0) {
      state.current = next;
      render();
      maybeAI();
      return;
    }
    if (state.bidder >= 0) {
      beginTrump();
      return;
    }
    /* مرّ الجميع: الموزّع ملزوم بالباب (٥). */
    state.bid = 5;
    state.bidder = state.dealer;
    state.forced = true;
    state.players[state.dealer].bid = 5;
    logLine(
      "<strong>" + esc(state.players[state.dealer].name) + "</strong> ملزوم بـ٥ (باب) بعد طاف الجميع.",
      "warn"
    );
    beginTrump();
  }

  function submitBid(index, value) {
    if (!state || state.phase !== "bidding") return false;
    const player = state.players[index];
    if (!player || player.passed || state.current !== index) return false;
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount < 5 || amount > 9) return false;
    if (amount <= state.bid) return false;
    state.bid = amount;
    state.bidder = index;
    player.bid = amount;
    state.notice = player.name + " طلب " + ar(amount) + (amount === 5 ? " (باب)" : amount === 9 ? " (باون)" : "") + ".";
    logLine(
      "<strong>" + esc(player.name) + "</strong> طلب <strong>" + ar(amount) + "</strong>" +
        (amount === 5 ? " (باب)" : amount === 9 ? " (باون)" : "") + ".",
      "accent"
    );
    if (FX) FX.sound("select");
    advanceBidding();
    return true;
  }

  function submitPass(index) {
    if (!state || state.phase !== "bidding") return false;
    const player = state.players[index];
    if (!player || player.passed || state.current !== index) return false;
    player.passed = true;
    state.notice = player.name + " طاف.";
    logLine("<strong>" + esc(player.name) + "</strong> طاف.", "warn");
    advanceBidding();
    return true;
  }

  function beginTrump() {
    if (!state || state.bidder < 0) return;
    state.phase = "trump";
    state.current = state.bidder;
    state.turnSeq = (state.turnSeq || 0) + 1;
    const bidder = state.players[state.bidder];
    state.notice = bidder.name + " فاز بالمزايدة بـ" + ar(state.bid) +
      (state.forced ? " (ملزوم)" : "") + " ويختار نوع الحكم.";
    logLine(
      "<strong>" + esc(bidder.name) + "</strong> فاز بالمزايدة بـ<strong>" + ar(state.bid) + "</strong>" +
        (state.forced ? " (ملزوم)" : "") + ".",
      "good"
    );
    render();
    maybeAI();
  }

  function chooseTrump(index, suitKey) {
    if (!state || state.phase !== "trump") return false;
    if (index !== state.bidder || !SUITS[suitKey]) return false;
    state.trump = suitKey;
    state.phase = "play";
    state.current = state.bidder;
    state.ledSuit = null;
    state.jokerLead = false;
    state.trick = [];
    state.lastTrick = [];
    state.showLast = false;
    state.trickWinner = -1;
    state.trickNum = 0;
    state.tricksWon = Array(state.numTeams || 2).fill(0);
    state.trumpHonorPlayed = false;
    state.turnSeq = (state.turnSeq || 0) + 1;
    const suit = SUITS[suitKey];
    const bidder = state.players[state.bidder];
    state.notice = "الحكم " + suit.sym + " " + suit.name + " — " + bidder.name + " يبدأ أول لمة.";
    logLine(
      "<strong>" + esc(bidder.name) + "</strong> أعلن الحكم <strong>" + suit.sym + " " + esc(suit.name) + "</strong>.",
      "accent"
    );
    if (FX) FX.sound("reveal");
    render();
    maybeAI();
  }

  /* ------------------------------ قواعد اللعب ------------------------------ */

  function isTrumpClass(card) {
    return !!card && (isJoker(card) || card.suit === state.trump);
  }

  function entryPower(entry) {
    if (!entry || entry.dead) return 0;
    const card = entry.card;
    if (!card) return 0;
    if (isJoker(card)) return card.color === "red" ? 400 : 300;
    if (card.suit === state.trump) {
      if (card.rank === 14) return 250;
      return 100 + rankOrder(card.rank);
    }
    return rankOrder(card.rank);
  }

  function resolveWinner(entries, ledSuit) {
    if (!entries || !entries.length) return null;
    const alive = entries.filter((entry) => !entry.dead);
    const trumps = alive.filter(
      (entry) => entry.card.kind === "joker" || entry.card.suit === state.trump
    );
    const pool = trumps.length
      ? trumps
      : alive.filter((entry) => entry.card.kind !== "joker" && (!ledSuit || entry.card.suit === ledSuit));
    if (!pool.length) return entries[entries.length - 1];
    return pool.reduce((best, entry) => (entryPower(entry) > entryPower(best) ? entry : best));
  }

  function canLeadJoker(player, card) {
    if (!card || !isJoker(card)) return false;
    const opts = (apiRef && apiRef.options) || {};
    if (opts.jokerRules === "flexible") return true;
    if (state.trumpHonorPlayed) return true;
    if (state.bid >= 9) return true;
    if (state.bid === 8) return card.color === "red";
    return false;
  }

  function handHasSuit(player, suit) {
    return !!player && player.hand.some((card) => card.kind === "card" && card.suit === suit);
  }

  function legalCards(player) {
    if (!player || !state) return [];
    return player.hand.filter((card) => isLegal(player, card));
  }

  function isLegal(player, card) {
    if (!player || !card || !state) return false;
    if (player.hand.indexOf(card) < 0) return false;
    if (!state.trick.length) {
      if (!isJoker(card)) return true;
      if (canLeadJoker(player, card)) return true;
      return !player.hand.some((item) => !isJoker(item));
    }
    if (isJoker(card)) return true;
    if (state.ledSuit === null) return true;
    if (!handHasSuit(player, state.ledSuit)) return true;
    return card.suit === state.ledSuit;
  }

  function mustFollowHint(player) {
    if (!state || !state.trick.length || !state.ledSuit) return false;
    return handHasSuit(player, state.ledSuit);
  }

  function nextToAct(from) {
    if (!state) return -1;
    for (let step = 1; step <= state.count; step++) {
      const index = (from + step) % state.count;
      if (!state.trick.some((entry) => entry.p === index)) return index;
    }
    return -1;
  }

  /* ------------------------------ تنفيذ الورقة ------------------------------ */

  function playCard(index, cardId) {
    if (!state || state.phase !== "play") return false;
    if (state.current !== index) return false;
    const player = state.players[index];
    if (!player) return false;
    const card = player.hand.find((item) => item.id === cardId);
    if (!card || !isLegal(player, card)) return false;

    const lead = state.trick.length === 0;
    let dead = false;
    if (lead) {
      state.showLast = false;
      state.trickWinner = -1;
      if (isJoker(card)) {
        state.ledSuit = null;
        state.jokerLead = true;
        dead = !canLeadJoker(player, card);
      } else {
        state.ledSuit = card.suit;
        state.jokerLead = false;
      }
    } else if (state.ledSuit === null && state.jokerLead && !isJoker(card)) {
      state.ledSuit = card.suit;
    }

    const position = player.hand.indexOf(card);
    player.hand.splice(position, 1);
    state.trick.push({ p: index, card, dead });

    if (card.kind === "card" && card.suit === state.trump && card.rank >= 11) {
      state.trumpHonorPlayed = true;
    }

    const note = dead ? " (بدأ بالجوكر فماتت الورقة)" : "";
    logLine(
      "<strong>" + esc(player.name) + "</strong> لعب " + esc(cardLabel(card)) + note + ".",
      "accent"
    );
    if (FX) FX.sound("card");

    state.turnSeq = (state.turnSeq || 0) + 1;

    if (state.trick.length >= state.count) {
      resolveTrick();
      return true;
    }
    state.current = nextToAct(index);
    state.notice = "دور " + state.players[state.current].name + ".";
    render();
    maybeAI();
    return true;
  }

  function resolveTrick() {
    const entries = state.trick.slice();
    const winnerEntry = resolveWinner(entries, state.ledSuit);
    const winnerIndex = winnerEntry ? winnerEntry.p : -1;
    const winner = winnerIndex >= 0 ? state.players[winnerIndex] : null;

    state.lastTrick = entries;
    state.showLast = true;
    state.trickWinner = winnerIndex;
    state.trick = [];
    state.ledSuit = null;
    state.jokerLead = false;
    state.trickNum += 1;
    if (winner) {
      state.tricksWon[winner.team] += 1;
      state.notice = winner.name + " أخذ اللمة (" + ar(state.tricksWon[winner.team]) + " لفريقه).";
      logLine(
        "<strong>" + esc(winner.name) + "</strong> أخذ اللمة — " + teamLabel(winner.team) + ": " +
          ar(state.tricksWon[winner.team]) + ".",
        "good"
      );
    }
    state.turnSeq = (state.turnSeq || 0) + 1;

    const bidTeam = state.players[state.bidder].team;
    const won = state.tricksWon[bidTeam];
    if (won >= state.bid) {
      endRound();
      return;
    }
    const remaining = 9 - state.trickNum;
    if (won + remaining < state.bid) {
      endRound();
      return;
    }
    if (state.trickNum >= 9) {
      endRound();
      return;
    }

    state.phase = "play";
    state.current = winnerIndex;
    render();
    maybeAI();
  }

  /* ------------------------------ الحساب ------------------------------ */

  function endRound() {
    const bidder = state.players[state.bidder];
    const bidTeam = bidder.team;
    const opts = (apiRef && apiRef.options) || {};
    const won = state.tricksWon[bidTeam];
    const success = won >= state.bid;
    let points;
    let pointsTeam;
    if (success) {
      points = state.bid === 9 ? 36 : state.bid;
      pointsTeam = bidTeam;
    } else {
      points = state.forced ? 5 : state.bid * 2;
      /* الفريق المنافس الأكثر حصدًا لللمات يستلم نقاط الإخفاق. */
      const opponentTeams = [];
      state.players.forEach((p) => {
        if (p.team !== bidTeam && opponentTeams.indexOf(p.team) < 0) opponentTeams.push(p.team);
      });
      pointsTeam = opponentTeams.reduce((best, t) =>
        state.tricksWon[t] > state.tricksWon[best] ? t : best, opponentTeams[0]);
    }
    state.scores[pointsTeam] += points;

    state.roundResult = {
      success,
      forced: !!state.forced,
      bid: state.bid,
      won,
      points,
      pointsTeam,
      bidTeam,
      scores: state.scores.slice(),
      round: state.round,
    };
    state.phase = "roundEnd";
    state.current = -1;
    state.turnSeq = (state.turnSeq || 0) + 1;

    const summary = success
      ? "نجح " + teamLabel(bidTeam) + " في طلب " + ar(state.bid) + " — +" + ar(points) + " نقطة."
      : "فشل " + teamLabel(bidTeam) + " في طلب " + ar(state.bid) + " — +" + ar(points) + " نقطة لـ" + teamLabel(pointsTeam) + ".";
    state.notice = summary;
    logLine(summary, success ? "good" : "warn");

    let winner = -1;
    let reason = "";
    if (success && state.bid === 9 && state.round === 1 && opts.firstRoundBaoun !== false) {
      winner = bidTeam;
      reason = "باون ناجح من الجولة الأولى";
    } else {
      for (let t = 0; t < state.numTeams; t++) {
        if (state.scores[t] >= state.target) {
          winner = t;
          reason = "بلوغ " + ar(state.target) + " نقطة";
          break;
        }
      }
      if (winner < 0 && state.target > 51) {
        for (let t = 0; t < state.numTeams; t++) {
          if (state.scores[t] >= 51 && state.scores.every((s, i) => i === t || s === 0)) {
            winner = t;
            reason = "٥١ مقابل صفر";
            break;
          }
        }
      }
    }

    if (winner >= 0) {
      finishMatch(winner, reason);
      return;
    }
    render();
    /* إذا كان الجميع كمبيوتر (أو كان المضيف يدير طاولة آلية) ننتقل تلقائيًا. */
    if (state.players.every((player) => player.isCpu) && (!isOnline() || apiRef.net.isHost)) {
      aiRunner.later(() => {
        if (state && state.phase === "roundEnd" && !state.over) nextRound();
      }, 1200);
    }
  }

  function teamMembers(team) {
    return state.players.filter((player) => player.team === team).map((player) => player.name).join(" · ");
  }

  function finishMatch(team, reason) {
    if (!state || state.gameOverAnnounced) {
      if (state) {
        state.over = true;
        state.matchOver = true;
        state.winnerTeam = team;
        render();
      }
      return;
    }
    state.over = true;
    state.matchOver = true;
    state.winnerTeam = team;
    state.standings = state.scores.map((score, index) => ({
      name: teamLabel(index) + (index === team ? " · فائز" : ""),
      value: ar(score) + " نقطة",
    }));
    state.notice = "انتهت المباراة — فاز " + teamLabel(team) + " (" + reason + ").";
    state.gameOverAnnounced = true;
    render();
    if (apiRef) {
      apiRef.gameOver({
        icon: "🃏",
        title: "فاز " + teamLabel(team) + " بكوت بو " + (state.count === 4 ? "أربعة" : "ستة") + "!",
        text: teamMembers(team) + " — " + ar(state.scores[team]) + " مقابل " +
          ar(state.scores[1 - team]) + " نقطة (" + reason + ").",
        winner: teamLabel(team),
        standings: state.standings,
        tone: "win",
      });
    }
    if (FX) FX.after(() => FX.win(), 140);
  }

  function nextRound() {
    if (!state || state.phase !== "roundEnd" || state.over || state.matchOver) return false;
    if (!canAdvanceRound()) return false;
    state.dealer = (state.dealer + 1) % state.count;
    state.round += 1;
    startRound();
    return true;
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function bestTrumpFor(hand) {
    let bestSuit = SUIT_KEYS[0];
    let bestScore = -1;
    SUIT_KEYS.forEach((suit) => {
      let score = 0;
      hand.forEach((card) => {
        if (isJoker(card)) {
          score += card.color === "red" ? 2.3 : 1.7;
          return;
        }
        if (card.suit === suit) {
          if (card.rank === 14) score += 2.1;
          else if (card.rank === 13) score += 1.5;
          else if (card.rank === 12) score += 1.15;
          else score += 0.1 + (card.rank - 5) * 0.06;
        } else if (card.rank === 14) {
          score += 0.3;
        }
      });
      if (score > bestScore) {
        bestScore = score;
        bestSuit = suit;
      }
    });
    return { suit: bestSuit, score: bestScore };
  }

  function aiBid(player) {
    if (state.bid >= 9) return null;
    const power = bestTrumpFor(player.hand).score;
    let want = 5 + Math.floor((power - 5.1) * 1.05);
    want = U.clamp(want, 5, 9);
    if (player.level === "easy" && Math.random() < 0.34) want -= 1;
    if (player.level === "hard" && Math.random() < 0.16) want += 1;
    want = U.clamp(want, 5, 9);
    if (want === 9 && power < 7.4) want = 8;
    const minimum = state.bid > 0 ? state.bid + 1 : 5;
    if (want < minimum) return null;
    if (want === minimum && Math.random() < 0.22) return null;
    return Math.max(minimum, want);
  }

  function cheapest(cards) {
    return cards.slice().sort((a, b) => {
      const ja = isJoker(a) ? 1 : 0;
      const jb = isJoker(b) ? 1 : 0;
      if (ja !== jb) return ja - jb;
      const ta = a.suit === state.trump ? 1 : 0;
      const tb = b.suit === state.trump ? 1 : 0;
      if (ta !== tb) return ta - tb;
      return rankOrder(a.rank) - rankOrder(b.rank);
    })[0];
  }

  function aiPlay(player) {
    const legal = player.hand.filter((card) => isLegal(player, card));
    if (!legal.length) return null;
    if (!state.trick.length) return aiLead(player, legal);

    const currentWinner = resolveWinner(state.trick, state.ledSuit);
    const partnerWinning = !!(currentWinner && state.players[currentWinner.p] &&
      state.players[currentWinner.p].team === player.team);
    const lastToPlay = state.trick.length >= state.count - 1;

    if (partnerWinning && lastToPlay) {
      return cheapest(legal.filter((card) => !isJoker(card))) || cheapest(legal);
    }

    const winners = legal.filter((card) => wouldWin(player, card));
    if (winners.length) {
      if (partnerWinning && !lastToPlay && Math.random() < 0.55) {
        return cheapest(legal.filter((card) => !isJoker(card))) || cheapest(legal);
      }
      return cheapest(winners);
    }
    return cheapest(legal.filter((card) => !isJoker(card))) || cheapest(legal);
  }

  function wouldWin(player, card) {
    const entries = state.trick.slice();
    let led = state.ledSuit;
    if (!entries.length) {
      led = isJoker(card) ? null : card.suit;
    } else if (led === null && !isJoker(card)) {
      led = card.suit;
    }
    entries.push({ p: player.index, card, dead: false });
    const winner = resolveWinner(entries, led);
    return !!(winner && winner.p === player.index);
  }

  function aiLead(player, legal) {
    const bidTeam = state.players[state.bidder].team;
    const needsTricks = state.tricksWon[bidTeam] < state.bid;
    const trumps = legal.filter((card) => isTrumpClass(card) && !isJoker(card));
    const jokers = legal.filter((card) => isJoker(card));
    const offSuit = legal.filter((card) => !isTrumpClass(card));

    /* في نهاية الجولة، حاول حسم لمة مطلوبة بجوكر مسموح. */
    if (needsTricks && jokers.length && state.trickNum >= 5) {
      const red = jokers.find((card) => card.color === "red");
      if (red && canLeadJoker(player, red)) return red;
    }
    if ((bidTeam === player.team || needsTricks) && trumps.length && state.trickNum < 7) {
      return trumps.slice().sort((a, b) => entryPower({ card: b }) - entryPower({ card: a }))[0];
    }
    if (offSuit.length) {
      const byPower = offSuit.slice().sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));
      /* إن كان الفريق يحتاج لممًا نبدأ بأقوى ورقة غير حكم، وإلا نتخلّص من أضعفها */
      return needsTricks ? byPower[byPower.length - 1] : byPower[0];
    }
    if (trumps.length) return cheapest(trumps);
    return legal[0];
  }

  function maybeAI() {
    if (!state || state.over) return;
    if (state.phase !== "bidding" && state.phase !== "trump" && state.phase !== "play") return;
    const seat = activeSeat();
    if (seat < 0) return;
    const player = state.players[seat];
    if (!player || !player.isCpu) return;
    if (!AI.autoAllowed(apiRef, player)) return;
    const expected = state.turnSeq;
    aiRunner.later(() => {
      if (!state || state.over || state.turnSeq !== expected) return;
      if (state.phase === "bidding" && state.current === seat && !player.passed) {
        const amount = aiBid(player);
        if (amount == null) submitPass(seat);
        else submitBid(seat, amount);
      } else if (state.phase === "trump" && state.bidder === seat) {
        chooseTrump(seat, bestTrumpFor(player.hand).suit);
      } else if (state.phase === "play" && state.current === seat) {
        const card = aiPlay(player);
        if (card) playCard(seat, card.id);
      }
    }, AI.delay(player.level));
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function cardHTML(card, opts) {
    const options = opts || {};
    const classes = ["wq-card", "ko-card"];
    if (options.back) classes.push("is-back");
    else if (card) {
      const red = isJoker(card) ? card.color !== "black" : suitOf(card) && suitOf(card).color === "#b83b34";
      classes.push(red ? "is-red" : "is-black");
    }
    if (options.small) classes.push("is-small");
    if (options.playable) classes.push("is-playable");
    if (options.dim) classes.push("is-dim");
    if (!options.back && state && card && card.kind === "card" && card.suit === state.trump) {
      classes.push("is-trump");
    }
    const label = options.back ? "ورقة مقلوبة" : cardLabel(card);
    const badge = options.badge
      ? '<span class="wq-card-badge">' + esc(options.badge) + "</span>"
      : "";
    const face = options.back ? cardBackHTML() : cardFaceHTML(card);
    if (options.interactive && card) {
      return (
        '<button type="button" class="' + classes.join(" ") + '" data-ko-card="' + esc(card.id) +
        '" aria-label="' + esc(label) + '">' +
        '<span class="wq-card-face" aria-hidden="true">' + face + "</span>" + badge +
        "</button>"
      );
    }
    return (
      '<span class="' + classes.join(" ") + '" role="img" aria-label="' + esc(label) + '">' +
      '<span class="wq-card-face" aria-hidden="true">' + face + "</span>" + badge +
      "</span>"
    );
  }

  function sortHand(hand) {
    const suitRank = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
    return hand.slice().sort((a, b) => {
      const aj = isJoker(a) ? 0 : 1;
      const bj = isJoker(b) ? 0 : 1;
      if (aj !== bj) return aj - bj;
      if (aj === 0) return a.color === "red" ? -1 : 1;
      const at = a.suit === state.trump ? 0 : 1;
      const bt = b.suit === state.trump ? 0 : 1;
      if (at !== bt) return at - bt;
      if (a.suit !== b.suit) return suitRank[a.suit] - suitRank[b.suit];
      return b.rank - a.rank;
    });
  }

  function handHTML(player) {
    if (!player) return "";
    if (!player.hand.length) {
      return '<p class="ko-empty">لا أوراق في اليد — انتهت الجولة.</p>';
    }
    const acting = canAct() && player.index === activeSeat();
    const cards = sortHand(player.hand).map((card) => {
      const legal = acting && isLegal(player, card);
      return cardHTML(card, {
        interactive: legal,
        dim: acting && !legal,
        badge: card.suit === state.trump ? "حكم" : "",
      });
    });
    const hint = acting
      ? mustFollowHint(player)
        ? "يجب اتباع النوع المطلوب أو لعب جوكر."
        : "اختر ورقة للعب."
      : isOnline()
        ? "يدك سرّية — تُعرض لك وحدك."
        : "";
    return '<div class="ko-hand">' + cards.join("") + "</div>" +
      (hint ? '<p class="ko-hand-hint">' + esc(hint) + "</p>" : "");
  }

  function seatHTML(player) {
    const active = activeSeat() === player.index && !state.over;
    const teamLetter = ["a", "b", "c"][player.team] || "x";
    const classes = ["ko-seat", "team-" + teamLetter];
    if (active) classes.push("is-active");
    if (player.passed) classes.push("is-passed");
    if (player.index === state.bidder) classes.push("is-bidder");
    if (player.index === state.dealer) classes.push("is-dealer");
    if (player.index === viewerIndex()) classes.push("is-mine");
    const tags = [];
    if (player.index === state.dealer) tags.push("موزّع");
    if (player.index === state.bidder) tags.push("طالب");
    if (player.bid) tags.push("طلب " + ar(player.bid));
    else if (player.passed) tags.push("طاف");
    return (
      '<div class="' + classes.join(" ") + '">' +
      '<span class="ko-seat-index" aria-hidden="true">' + ar(player.index + 1) + "</span>" +
      '<div class="ko-seat-copy"><strong>' + esc(player.name) + "</strong>" +
      "<small>" + teamLabel(player.team) + (tags.length ? " · " + tags.join(" · ") : "") + "</small></div>" +
      '<span class="ko-seat-cards" title="الأوراق المتبقية">' + ar(player.hand.length) + "</span>" +
      "</div>"
    );
  }

  function seatsHTML() {
    const ordered = state.players.slice();
    return '<div class="ko-seats seats-' + state.count + '">' + ordered.map(seatHTML).join("") + "</div>";
  }

  function visibleTrick() {
    if (state.trick.length) return state.trick;
    if (state.showLast && state.lastTrick && state.lastTrick.length) return state.lastTrick;
    return [];
  }

  function trickHTML() {
    const entries = visibleTrick();
    const live = state.trick.length > 0;
    if (!entries.length) {
      return (
        '<div class="ko-trick is-empty">' +
        '<span class="ko-trick-label">الطاولة</span>' +
        '<p>لم تُلعب ورقة بعد في هذه اللمة.</p>' +
        "</div>"
      );
    }
    const winner = !live && state.trickWinner >= 0 ? state.players[state.trickWinner] : null;
    return (
      '<div class="ko-trick ' + (live ? "is-live" : "is-done") + '">' +
      '<span class="ko-trick-label">' + (live ? "اللمة الحالية" : "اللمة السابقة") + "</span>" +
      '<div class="ko-trick-cards">' +
      entries.map((entry) => {
        const owner = state.players[entry.p];
        const isWinner = !live && entry.p === state.trickWinner;
        return (
          '<div class="ko-trick-card' + (isWinner ? " is-winner" : "") + '">' +
          cardHTML(entry.card, { small: true }) +
          "<span>" + esc(owner ? owner.name : "—") + "</span>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
      (winner ? '<small class="ko-trick-winner">' + esc(winner.name) + " أخذ اللمة</small>" : "") +
      "</div>"
    );
  }

  function teamsHTML() {
    const bidder = state.bidder >= 0 ? state.players[state.bidder] : null;
    const bidTeam = bidder ? bidder.team : -1;
    return (
      '<div class="ko-teams">' +
      state.scores.map((score, team) => {
        const bidding = team === bidTeam;
        return (
          '<div class="ko-team' + (bidding ? " is-bidding" : "") + '">' +
          '<span>' + teamLabel(team) + "</span>" +
          "<b>" + ar(state.scores[team]) + "</b>" +
          "<small>اللمات: " + ar(state.tricksWon[team]) + (bidding ? " · يطلب " + ar(state.bid) : "") + "</small>" +
          "</div>"
        );
      }).join("") +
      '<div class="ko-turn">' +
      '<small>الجولة</small><b>' + ar(state.round) + "</b><small>هدف " + ar(state.target) + "</small>" +
      "</div>" +
      "</div>"
    );
  }

  function boardHTML() {
    return (
      '<section class="ko-board">' +
      '<div class="ko-board-head">' +
      '<span class="cg-kicker">🃏 كوت بو ' + (state.count === 4 ? "أربعة" : "ستة") + "</span>" +
      '<span class="ko-board-meta">' +
      (state.trump ? "الحكم " + SUITS[state.trump].sym + " " + esc(SUITS[state.trump].name) : "لم يُعلن الحكم بعد") +
      "</span>" +
      "</div>" +
      teamsHTML() +
      seatsHTML() +
      trickHTML() +
      '<p class="ko-notice">' + esc(state.notice) + "</p>" +
      "</section>"
    );
  }

  function infoHTML() {
    const bidder = state.bidder >= 0 ? state.players[state.bidder] : null;
    const bidTeam = bidder ? bidder.team : -1;
    const need = bidder ? Math.max(0, state.bid - state.tricksWon[bidTeam]) : 0;
    const trump = state.trump ? SUITS[state.trump] : null;
    return (
      '<div class="cg-panel ko-info">' +
      '<div class="cg-side-head"><span class="cg-kicker">بيانات الجولة</span>' +
      '<span class="cg-count">' + ar(state.count) + " لاعبين</span></div>" +
      '<dl class="ko-facts">' +
      "<div><dt>الموزّع</dt><dd>" + esc(state.players[state.dealer].name) + "</dd></div>" +
      "<div><dt>الطالب</dt><dd>" + (bidder ? esc(bidder.name) : "—") + "</dd></div>" +
      "<div><dt>الطلب</dt><dd>" + (bidder ? ar(state.bid) + " · " + bidName(state.bid) + (state.forced ? " (ملزوم)" : "") : "—") + "</dd></div>" +
      "<div><dt>الحكم</dt><dd>" + (trump ? trump.sym + " " + esc(trump.name) : "—") + "</dd></div>" +
      "<div><dt>المتبقي</dt><dd>" + (bidder ? ar(need) + " لمة" : "—") + "</dd></div>" +
      "</dl>" +
      "</div>"
    );
  }

  function bidButtonsHTML() {
    const minimum = state.bid > 0 ? state.bid + 1 : 5;
    const buttons = [5, 6, 7, 8, 9].map((value) => {
      const disabled = value < minimum;
      return (
        '<button type="button" class="bg-btn ko-bid-btn' + (value === 9 ? " is-boun" : "") + '"' +
        ' data-ko-bid="' + value + '"' + (disabled ? " disabled" : "") + ">" +
        "<b>" + ar(value) + "</b><small>" + bidName(value) + "</small></button>"
      );
    }).join("");
    return (
      '<div class="ko-actions">' +
      '<p class="ko-action-title">اختر طلبك' +
      (state.bid ? " (الأعلى الحالي " + ar(state.bid) + ")" : "") + "</p>" +
      '<div class="ko-bid-grid">' + buttons + "</div>" +
      '<button type="button" class="bg-btn ko-pass" data-ko-pass="1">طاف</button>' +
      "</div>"
    );
  }

  function trumpButtonsHTML() {
    const bidder = state.players[state.bidder];
    return (
      '<div class="ko-actions">' +
      '<p class="ko-action-title">' + esc(bidder.name) + " يختار الحكم</p>" +
      '<div class="ko-suit-grid">' +
      SUIT_KEYS.map((key) => {
        const suit = SUITS[key];
        const count = bidder.hand.filter((card) => card.kind === "card" && card.suit === key).length;
        return (
          '<button type="button" class="bg-btn ko-suit ' + key + '" data-ko-trump="' + key + '">' +
          '<span class="ko-suit-sym">' + suit.sym + "</span>" +
          "<b>" + esc(suit.name) + "</b>" +
          "<small>" + ar(count) + " أوراق</small></button>"
        );
      }).join("") +
      "</div></div>"
    );
  }

  function actionHTML() {
    if (state.phase === "bidding") {
      if (canAct()) return bidButtonsHTML();
      return '<div class="cg-panel ko-wait"><span class="cg-kicker">المزايدة</span><p>بانتظار طلب <b>' +
        esc(state.players[state.current].name) + "</b>…</p></div>";
    }
    if (state.phase === "trump") {
      if (canAct()) return trumpButtonsHTML();
      return '<div class="cg-panel ko-wait"><span class="cg-kicker">إعلان الحكم</span><p>بانتظار <b>' +
        esc(state.players[state.bidder].name) + "</b> ليختار الحكم…</p></div>";
    }
    if (state.phase === "play") {
      if (canAct()) {
        const player = state.players[activeSeat()];
        return '<div class="cg-panel ko-wait is-live"><span class="cg-kicker">دورك</span><p>' +
          (mustFollowHint(player) ? "اتبع النوع " + SUITS[state.ledSuit].sym + " أو العب جوكر." : "اختر ورقة من يدك للعب.") +
          "</p></div>";
      }
      const current = state.current >= 0 ? state.players[state.current] : null;
      return '<div class="cg-panel ko-wait"><span class="cg-kicker">اللعب</span><p>' +
        (current ? "بانتظار <b>" + esc(current.name) + "</b>…" : "…") + "</p></div>";
    }
    return "";
  }

  function resultHTML() {
    if (state.phase !== "roundEnd") return "";
    const result = state.roundResult;
    if (!result) return "";
    const next =
      state.over || state.matchOver
        ? '<p class="ko-result-note">انتهت المباراة.</p>'
        : canAdvanceRound()
          ? '<button type="button" class="bg-btn primary ko-next" data-ko-next="1">الجولة التالية</button>'
          : '<p class="ko-result-note">بانتظار المضيف لبدء الجولة التالية…</p>';
    return (
      '<section class="ko-result ' + (result.success ? "is-good" : "is-bad") + '">' +
      '<div class="ko-result-head"><span class="cg-kicker">نتيجة الجولة ' + ar(result.round) + "</span>" +
      '<b>' + (result.success ? "نجح الطلب" : "فشل الطلب") + "</b></div>" +
      "<p>" +
      (result.success
        ? teamLabel(result.bidTeam) + " طلب " + ar(result.bid) + " وأخذ " + ar(result.won) + " لمة — +" +
          ar(result.points) + " نقطة."
        : teamLabel(result.bidTeam) + " طلب " + ar(result.bid) + " وأخذ " + ar(result.won) + " لمة — +" +
          ar(result.points) + " نقطة لـ" + teamLabel(result.pointsTeam) + ".") +
      "</p>" +
      '<div class="ko-result-scores">' +
      result.scores.map(function (score, index) {
        return "<span>" + TEAM_SHORT[index] + ": <b>" + ar(score) + "</b></span>";
      }).join("") +
      "</div>" +
      next +
      "</section>"
    );
  }

  function sideHTML() {
    return infoHTML() + actionHTML() + resultHTML() +
      '<div class="cg-panel ko-help"><span class="cg-kicker">تذكير</span>' +
      "<p>ترتيب القوة: الجيكر الأحمر ← الميكر الأسود ← آص الحكم ← باقي أوراق الحكم ← الأوراق الرائدة. لا تبدأ بالجوكر إلا بعد نزول J/Q/K/A من الحكم، أو عند طلب ٨ (الأحمر فقط) أو ٩ (الجوكران). في نسخة الستة فريقان من ثلاثة لاعبين؛ في نسخة الأربعة فريقان من لاعبين.</p></div>";
  }

  function watchHTML() {
    if (state.phase === "roundEnd" || state.over) {
      return '<div class="ko-watch"><b>انتهت الجولة</b><span>راجع النتيجة ثم انتقل للجولة التالية.</span></div>';
    }
    return '<div class="ko-watch"><b>مشاهدة</b><span>الأوراق مخفية في وضع المشاهدة.</span></div>';
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "ko-layout";

    const main = document.createElement("div");
    main.className = "ko-main";
    main.innerHTML = boardHTML();

    const handSlot = document.createElement("div");
    handSlot.className = "ko-hand-slot";
    main.appendChild(handSlot);

    const side = document.createElement("aside");
    side.className = "cg-side ko-side";
    side.innerHTML = sideHTML();

    wrap.appendChild(main);
    wrap.appendChild(side);

    const viewer = viewerPlayer();
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (viewer) {
      const secret = BG.secretPanel({
        title: "🃏 أوراق " + viewer.name,
        owner: viewer.name,
        hint: "أوراقك سرّية. أظهرها في دورك فقط، ثم أخفها قبل تمرير الجهاز.",
        open: handOpen(),
        autoKey: viewerIndex() >= 0 ? "koot:" + viewerIndex() + ":" + state.turnSeq : "",
        onToggle(visible) {
          state.handRevealed = visible;
          render();
        },
        render() {
          return handHTML(viewer);
        },
      });
      handSlot.appendChild(secret.el);
    } else {
      handSlot.innerHTML = watchHTML();
    }

    if (FX) {
      const active = rootRef.querySelector(".ko-seat.is-active");
      if (active) FX.pulse(active);
    }
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function onClick(event) {
    if (!state) return;
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;

    const nextBtn = event.target.closest("[data-ko-next]");
    if (nextBtn) {
      nextRound();
      return;
    }

    if (!canAct()) return;
    const actor = activeSeat();

    const bidBtn = event.target.closest("[data-ko-bid]");
    if (bidBtn && state.phase === "bidding") {
      submitBid(actor, Number(bidBtn.getAttribute("data-ko-bid")));
      return;
    }

    const passBtn = event.target.closest("[data-ko-pass]");
    if (passBtn && state.phase === "bidding") {
      submitPass(actor);
      return;
    }

    const trumpBtn = event.target.closest("[data-ko-trump]");
    if (trumpBtn && state.phase === "trump") {
      chooseTrump(actor, trumpBtn.getAttribute("data-ko-trump"));
      return;
    }

    const cardBtn = event.target.closest("[data-ko-card]");
    if (cardBtn && state.phase === "play") {
      playCard(actor, cardBtn.getAttribute("data-ko-card"));
    }
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "kootbositta",
    name: "كوت بو ستة",
    en: "KOOT BO SITTA",
    icon: "🃏",
    accent: "#d97757",
    cardClass: "card-koot",
    tagline: "فريقان ومزايدة وحكم: اجمع لماتك بدقة قبل أن يسبقك الخصم إلى ١٠١.",
    players: "٤ أو ٦",
    duration: "٣٠–٦٠ دقيقة",
    complexity: "متوسطة–عالية",
    minPlayers: 4,
    maxPlayers: 6,
    defaultPlayers: 6,
    counts: [4, 6],

    options: {
      hint: "خيارات المباراة. تُطبَّق على اللعب المحلي والجماعي معًا.",
      defaults: { matchTarget: 101, jokerRules: "strict", firstRoundBaoun: true },
      fields: [
        {
          key: "matchTarget",
          label: "هدف المباراة",
          type: "seg",
          choices: [
            { value: 101, label: "١٠١ نقطة" },
            { value: 51, label: "٥١ نقطة" },
          ],
          hint: "الهدف الافتراضي ١٠١. عند ١٠١ يضاف شرط الفوز ٥١ مقابل صفر.",
        },
        {
          key: "jokerRules",
          label: "قواعد الجوكر",
          type: "seg",
          choices: [
            { value: "strict", label: "صارمة" },
            { value: "flexible", label: "مرنة" },
          ],
          hint: "الصارمة: لا تبدأ بالجوكر إلا بعد نزول J/Q/K/A من الحكم أو عند طلب ٨/٩. المرنة: يُسمح بالبدء بالجوكر في أي وقت.",
        },
        {
          key: "firstRoundBaoun",
          label: "باون الجولة الأولى يحسم المباراة",
          type: "toggle",
          hint: "عند التفعيل، طلب ٩ (باون) ناجح من الجولة الأولى يمنح الفوز فورًا للفريق الطالب.",
        },
      ],
      summary(options) {
        return (
          ar(Number(options.matchTarget) === 51 ? 51 : 101) + " نقطة · جوكر " +
          (options.jokerRules === "flexible" ? "مرن" : "صارم") +
          (options.firstRoundBaoun !== false ? " · باون أول جولة حاسم" : "")
        );
      },
    },

    rules: {
      goal: "فريقان يتناوبان على الطلبات واللمات: ثلاثة لاعبين لكل فريق في نسخة الستة، ولاعبان لكل فريق في نسخة الأربعة. اطلب عدد اللمات التي تظن أن فريقك يستطيع أخذه، واختر الحكم، ثم اجمع أكبر عدد من اللمات قبل الفريق المنافس.",
      facts: [["اللاعبون", "٤ أو ٦"], ["الأوراق", "٥٤ / ٣٦"], ["اليد", "٩ أوراق"], ["الهدف", "١٠١ أو ٥١"]],
      components: [
        "٥٤ ورقة لستة لاعبين: المجموعة الكاملة (٥٢) + الجيكر الأحمر + الميكر الأسود.",
        "٣٦ ورقة لأربعة لاعبين: تُحذف ٢–٥ وورقتا ٦ الحمراوان من المجموعة الكاملة، ثم يُضاف الجيكران.",
        "٩ أوراق لكل لاعب، ولا تبقى أوراق في كومة السحب.",
      ],
      setup: [
        "اجلس اللاعبون بالتناوب بين الفريقين: في نسخة الستة ثلاثة لاعبين لكل فريق (كل لاعب مقابل زميله وبجانبه خصمان)، وفي نسخة الأربعة لاعبان لكل فريق.",
        "يُختار موزّع، ثم تُوزّع ٩ أوراق لكل لاعب واحدة تلو الأخرى.",
        "تبدأ المزايدة من اللاعب الجالس على يمين الموزّع، وتنتقل بعكس عقارب الساعة.",
        "الطلبات من ٥ (باب) إلى ٩ (باون)، وكل طلب يجب أن يزيد على الطلب السابق، أو يقول اللاعب «طاف».",
        "إن مرّ الجميع دون طلب، يصبح الموزّع «ملزومًا» بطلب ٥.",
      ],
      steps: [
        "<strong>المزايدة:</strong> اطلب عدد اللمات التي تريدها لفريقك. أعلى طلب يفوز، وصاحبه يختار نوع الحكم ويبدأ اللعب.",
        "<strong>الحكم:</strong> النوع الذي يختاره الطالب. أوراقه تتفوق على بقية الأنواع، وآصه أقوى ورقة فيه بعد الجيكر الأحمر.",
        "<strong>اللعب:</strong> يبدأ الطالب بأول لمة. على كل لاعب اتباع نوع الورقة الأولى إن أمكن، وإلا فله أن يلعب أي ورقة أو حكمًا.",
        "<strong>الجوكر:</strong> يُلعب على أي لمة. لا يُبدأ به إلا بعد نزول J/Q/K/A من الحكم، أو عند طلب ٨ (الجيكر الأحمر فقط) أو ٩ (الجيكران).",
        "<strong>قوة الأوراق:</strong> الجيكر الأحمر ← الميكر الأسود ← آص الحكم ← باقي أوراق الحكم ← أوراق النوع المطلوب. وداخل النوع: A أقوى ثم K ثم Q ثم J ثم ١٠ … وصولًا إلى ٢ الأضعف.",
        "<strong>نهاية الجولة:</strong> تنتهي فور بلوغ فريق الطالب طلبه (نجاح) أو استحالة بلوغه (فشل)، وإلا تُلعب اللمات التسع كاملة.",
      ],
      winning:
        "نجاح الطلب يمنح فريق الطالب قيمة الطلب (والـ٩ «باون» تمنح ٣٦ نقطة). فشل الطلب يمنح ضعف قيمة الطلب للفريق المنافس، إلا «الملزوم» فيمنح الخصم ٥ نقاط فقط. أول فريق يبلغ هدف المباراة (١٠١ افتراضيًا) يفوز، ويُضاف شرط الفوز ٥١ مقابل صفر، وباون ناجح في الجولة الأولى يحسم المباراة فورًا.",
      notes: [
        "الترتيب العام: الجيكر الأحمر ← الميكر الأسود ← آص الحكم ← باقي أوراق الحكم ← أوراق الأنواع الأخرى.",
        "داخل كل نوع من الأقوى إلى الأضعف: A، K، Q، J، ١٠، ٩ … ٢ (الآص أقوى ورقة في نوعها، وآص الحكم أقوى أوراق الحكم بعد الجيكرين).",
        "في نسخة الستة فريقان من ثلاثة لاعبين؛ في نسخة الأربعة فريقان من لاعبين.",
        "خيارات اللعبة: هدف ١٠١/٥١، قواعد جوكر صارمة أو مرنة، وباون الجولة الأولى حاسم أو غير حاسم.",
        "في نسخة الأربعة تُحذف الأوراق ٢–٥ وورقتا ٦ الحمراوان، ثم يُضاف الجيكران لتكوين ٣٦ ورقة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      state = makeMatch(api.options || {});
      apiRef.log(
        "بدأت كوت بو " + (state.count === 4 ? "أربعة" : "ستة") + " — " + ar(state.count) +
          " لاعبين، والهدف " + ar(state.target) + " نقطة.",
        "accent"
      );
      render();
      maybeAI();
      rootRef.addEventListener("click", onClick);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render,
          playCard,
          submitBid,
          submitPass,
          chooseTrump,
          nextRound,
          endRound,
          resolveTrick,
          buildDeck,
          legalCards,
          isLegal,
          canLeadJoker,
          bestTrumpFor,
          aiPlay,
          SUITS,
        };
      }

      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          const next = BG.netCodec.decode(data);
          if (!next || !Array.isArray(next.players) || !next.players.length) return;
          const netNumTeams = 2;
          next.players.forEach((player, index) => {
            player.index = index;
            player.name = player.name || "اللاعب " + (index + 1);
            player.type = player.type === "cpu" ? "cpu" : "human";
            player.isCpu = player.type === "cpu" || player.isCpu === true;
            player.team = Number.isInteger(player.team) ? player.team : index % netNumTeams;
            player.hand = Array.isArray(player.hand) ? player.hand.filter(validCard) : [];
            player.passed = !!player.passed;
            player.bid = Number(player.bid) || 0;
          });
          next.count = next.players.length;
          next.numTeams = 2;
          next.trick = Array.isArray(next.trick)
            ? next.trick.filter((entry) => entry && entry.card && validCard(entry.card))
            : [];
          next.lastTrick = Array.isArray(next.lastTrick)
            ? next.lastTrick.filter((entry) => entry && entry.card && validCard(entry.card))
            : [];
          next.tricksWon = Array.isArray(next.tricksWon) ? next.tricksWon.map((n) => Number(n) || 0) : Array(next.numTeams).fill(0);
          next.scores = Array.isArray(next.scores) ? next.scores.map((n) => Number(n) || 0) : Array(next.numTeams).fill(0);
          next.target = Number(next.target) === 51 ? 51 : 101;
          next.handRevealed = false;
          next.gameOverAnnounced = !!next.matchOver;
          state = next;
          render();
        },
        netSeat() {
          return activeSeat();
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state) return;
          render();
          maybeAI();
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
