/* ==========================================================================
   سبْلندور — SPLENDOR
   تجارة الجواهر، بطاقات التطوير، والنبلاء: اجمع ١٥ نقطة قبل الجميع.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = ["white", "blue", "green", "red", "black"];
  const GEM_COLORS = ["white", "blue", "green", "red", "black", "gold"];

  const COLOR_NAMES = {
    white: "أبيض",
    blue: "أزرق",
    green: "أخضر",
    red: "أحمر",
    black: "أسود",
    gold: "ذهب",
  };

  const COLOR_GLYPHS = {
    white: "◇",
    blue: "◆",
    green: "●",
    red: "▲",
    black: "■",
    gold: "★",
  };

  const DEFAULT_OPTIONS = { targetScore: 15 };

  let state = null;
  let apiRef = null;
  let rootRef = null;
  let aiRunner = null;
  let cardSeq = 0;
  let nobleSeq = 0;

  /* ------------------------------ مساعدات ------------------------------ */

  function ar(value) {
    return String(value);
  }

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
    return state && state.players[state.current] ? state.players[state.current] : null;
  }

  function canAct() {
    if (!state || state.over) return false;
    const player = cur();
    if (!player) return false;
    if (isOnline()) {
      return viewerIndex() === player.index && !apiRef.net.isCpuSeat(player.index);
    }
    return !player.isCpu;
  }

  function scoreOf(player) {
    if (!player) return 0;
    let total = 0;
    (player.cards || []).forEach((card) => { total += Number(card.points) || 0; });
    (player.nobles || []).forEach((noble) => { total += Number(noble.points) || 0; });
    return total;
  }

  /* ------------------------------ بناء البطاقات ------------------------------ */

  function otherColors(color) {
    const index = COLORS.indexOf(color);
    return [1, 2, 3, 4].map((offset) => COLORS[(index + offset) % COLORS.length]);
  }

  function costsFrom(color, values) {
    const others = otherColors(color);
    const cost = {};
    others.forEach((c, i) => {
      if (values[i]) cost[c] = values[i];
    });
    return cost;
  }

  function makeCard(tier, color, points, cost) {
    cardSeq += 1;
    return { id: "s" + cardSeq, tier, color, points, cost };
  }

  function buildDecks() {
    const decks = { 1: [], 2: [], 3: [] };

    const tier1 = [
      { v: [1, 1, 1, 1], p: 0 },
      { v: [2, 1, 1, 1], p: 0 },
      { v: [2, 2, 1, 1], p: 0 },
      { v: [3, 1, 1, 1], p: 0 },
      { v: [2, 2, 2, 0], p: 0 },
      { v: [3, 2, 2, 0], p: 0 },
      { v: [4, 0, 0, 0], p: 1 },
      { v: [5, 0, 0, 0], p: 1 },
    ];
    const tier2 = [
      { v: [3, 2, 2, 0], p: 1 },
      { v: [3, 3, 2, 0], p: 1 },
      { v: [4, 3, 1, 0], p: 2 },
      { v: [4, 2, 2, 1], p: 2 },
      { v: [5, 3, 0, 0], p: 3 },
      { v: [5, 3, 3, 0], p: 1 },
    ];
    const tier3 = [
      { v: [3, 3, 5, 3], p: 3 },
      { v: [4, 4, 6, 3], p: 4 },
      { v: [5, 5, 7, 3], p: 4 },
      { v: [6, 6, 8, 3], p: 5 },
    ];

    COLORS.forEach((color) => {
      tier1.forEach((tpl) => decks[1].push(makeCard(1, color, tpl.p, costsFrom(color, tpl.v))));
      tier2.forEach((tpl) => decks[2].push(makeCard(2, color, tpl.p, costsFrom(color, tpl.v))));
      tier3.forEach((tpl) => decks[3].push(makeCard(3, color, tpl.p, costsFrom(color, tpl.v))));
    });

    return decks;
  }

  function buildNobles(count) {
    nobleSeq = 0;
    const list = [];
    const pairs = [
      ["white", "blue"],
      ["white", "green"],
      ["white", "red"],
      ["white", "black"],
      ["blue", "green"],
      ["blue", "red"],
      ["blue", "black"],
      ["green", "red"],
      ["green", "black"],
      ["red", "black"],
    ];
    const triples = [
      ["white", "blue", "green"],
      ["white", "blue", "red"],
      ["white", "green", "black"],
      ["blue", "red", "black"],
      ["green", "red", "black"],
    ];

    pairs.forEach(([a, b]) => {
      nobleSeq += 1;
      list.push({ id: "n" + nobleSeq, points: 3, req: { [a]: 4, [b]: 4 } });
    });
    triples.forEach((cols) => {
      const req = {};
      cols.forEach((c) => { req[c] = 3; });
      nobleSeq += 1;
      list.push({ id: "n" + nobleSeq, points: 3, req });
    });
    return U.shuffle(list).slice(0, Math.min(count, list.length));
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
      cards: [],
      reserved: [],
      nobles: [],
    }));
  }

  function makeMatch(options) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    const wanted = Number(opts.targetScore);
    const targetScore = [15, 18, 20].indexOf(wanted) !== -1 ? wanted : 15;
    const players = makePlayers();
    const decks = buildDecks();
    const market = {};
    [1, 2, 3].forEach((tier) => {
      market[tier] = decks[tier].splice(0, 4);
    });

    const tokensPerGem = players.length === 2 ? 4 : players.length === 3 ? 5 : 7;
    state = {
      players,
      bank: {
        white: tokensPerGem,
        blue: tokensPerGem,
        green: tokensPerGem,
        red: tokensPerGem,
        black: tokensPerGem,
        gold: 5,
      },
      decks,
      market,
      nobles: buildNobles(players.length + 1),
      current: 0,
      phase: "play",
      selection: [],
      round: 1,
      turnSeq: 0,
      targetScore,
      finalRound: false,
      finalStarter: null,
      winner: null,
      notice: "اختر الأحجار التي تريد أخذها، أو اضغط على بطاقة لشرائها أو حجزها.",
      lastAction: "",
      over: false,
    };
    return state;
  }

  /* ------------------------------ قواعد الشراء ------------------------------ */

  function findCard(id, source) {
    if (!state || !id) return null;
    if (source === "reserved") {
      for (const player of state.players) {
        const card = player.reserved.find((c) => c.id === id);
        if (card) return { card, source: "reserved", player };
      }
      return null;
    }
    for (const tier of [1, 2, 3]) {
      const card = state.market[tier].find((c) => c.id === id);
      if (card) return { card, source: "market", tier };
    }
    return null;
  }

  function canPay(player, card) {
    if (!player || !card || !card.cost) return null;
    const pay = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
    let goldNeeded = 0;
    for (const color of COLORS) {
      const need = Math.max(0, (Number(card.cost[color]) || 0) - (Number(player.bonuses[color]) || 0));
      if (!need) continue;
      const fromGems = Math.min(need, Number(player.gems[color]) || 0);
      pay[color] = fromGems;
      goldNeeded += need - fromGems;
    }
    if (goldNeeded > (Number(player.gems.gold) || 0)) return null;
    pay.gold = goldNeeded;
    return pay;
  }

  function totalCost(card) {
    return COLORS.reduce((sum, color) => sum + (Number(card.cost[color]) || 0), 0);
  }

  function deficits(player, card) {
    const need = {};
    for (const color of COLORS) {
      const remaining = (Number(card.cost[color]) || 0) - (Number(player.bonuses[color]) || 0) - (Number(player.gems[color]) || 0);
      if (remaining > 0) need[color] = remaining;
    }
    return need;
  }

  function meetsNoble(player, noble) {
    return Object.keys(noble.req || {}).every((color) => (Number(player.bonuses[color]) || 0) >= noble.req[color]);
  }

  function tokenTotal(player) {
    return GEM_COLORS.reduce((sum, color) => sum + (Number(player.gems[color]) || 0), 0);
  }

  function selectionValid(selection) {
    if (!state || !selection || !selection.length) return false;
    const counts = {};
    selection.forEach((color) => { counts[color] = (counts[color] || 0) + 1; });
    const keys = Object.keys(counts);
    if (selection.length === 1) return state.bank[selection[0]] > 0;
    if (selection.length === 2 && keys.length === 1) return state.bank[keys[0]] >= 4;
    if (selection.length >= 2 && selection.length <= 3 && keys.length === selection.length) {
      return keys.every((color) => state.bank[color] > 0);
    }
    return false;
  }

  function hasAnyMove(player) {
    if (!state || !player) return false;
    if (allOptions(player).some(({ card }) => !!canPay(player, card))) return true;
    const marketHasCard = [1, 2, 3].some((tier) => state.market[tier].length > 0);
    if (marketHasCard && (player.reserved || []).length < 3) return true;
    if (tokenTotal(player) < 10 && COLORS.some((color) => state.bank[color] > 0)) return true;
    return false;
  }

  function refillMarket(tier) {
    while (state.market[tier].length < 4 && state.decks[tier].length) {
      state.market[tier].push(state.decks[tier].shift());
    }
  }

  function logAction(html, tone) {
    if (apiRef && apiRef.log) apiRef.log(html, tone);
  }

  /* ------------------------------ الأفعال ------------------------------ */

  function takeGems(colors) {
    if (!state || state.over) return false;
    const player = cur();
    if (!player) return false;
    const chosen = (colors || []).slice(0, 3);
    if (!selectionValid(chosen)) return false;
    if (tokenTotal(player) + chosen.length > 10) {
      BG.toast("لا يمكنك حمل أكثر من 10 أحجار. استخدم أحجارك في الشراء أولًا.", "warn");
      return false;
    }
    const counts = {};
    chosen.forEach((color) => { counts[color] = (counts[color] || 0) + 1; });
    for (const color of Object.keys(counts)) {
      if ((Number(state.bank[color]) || 0) < counts[color]) return false;
    }
    for (const color of Object.keys(counts)) {
      state.bank[color] -= counts[color];
      player.gems[color] = (Number(player.gems[color]) || 0) + counts[color];
    }
    state.selection = [];
    state.lastAction = "أخذ " + chosen.map((c) => COLOR_NAMES[c]).join("، ");
    logAction("أخذ <strong>" + U.escape(player.name) + "</strong> " + chosen.map((c) => COLOR_GLYPHS[c] + " " + COLOR_NAMES[c]).join("، ") + ".", "accent");
    endTurn();
    return true;
  }

  function reserveCard(id) {
    if (!state || state.over) return false;
    const player = cur();
    if (!player) return false;
    const found = findCard(id, "market");
    if (!found) return false;
    if (player.reserved.length >= 3) {
      BG.toast("لا يمكنك حجز أكثر من 3 بطاقات.", "warn");
      return false;
    }
    const index = state.market[found.card.tier].findIndex((c) => c.id === id);
    if (index === -1) return false;
    state.market[found.card.tier].splice(index, 1);
    refillMarket(found.card.tier);
    player.reserved.push(found.card);
    const gainedGold = state.bank.gold > 0 && tokenTotal(player) < 10;
    if (gainedGold) {
      state.bank.gold -= 1;
      player.gems.gold = (Number(player.gems.gold) || 0) + 1;
    }
    state.selection = [];
    state.lastAction = "حجز " + COLOR_NAMES[found.card.color] + (gainedGold ? " + ذهب" : "");
    logAction("حجز <strong>" + U.escape(player.name) + "</strong> بطاقة " + COLOR_NAMES[found.card.color] + " من المستوى " + ar(found.card.tier) + ".", "accent");
    endTurn();
    return true;
  }

  function buyCard(id, source) {
    if (!state || state.over) return false;
    const player = cur();
    if (!player) return false;
    const found = findCard(id, source);
    if (!found) return false;
    const card = found.card;
    const pay = canPay(player, card);
    if (!pay) {
      BG.toast("لا تملك الجواهر الكافية لشراء هذه البطاقة.", "warn");
      return false;
    }
    for (const color of COLORS) {
      const amount = pay[color] || 0;
      if (!amount) continue;
      player.gems[color] -= amount;
      state.bank[color] += amount;
    }
    if (pay.gold) {
      player.gems.gold -= pay.gold;
      state.bank.gold += pay.gold;
    }

    if (found.source === "market") {
      const list = state.market[card.tier];
      const index = list.findIndex((c) => c.id === id);
      if (index !== -1) list.splice(index, 1);
      refillMarket(card.tier);
    } else {
      const index = player.reserved.findIndex((c) => c.id === id);
      if (index !== -1) player.reserved.splice(index, 1);
    }

    player.cards.push(card);
    player.bonuses[card.color] = (Number(player.bonuses[card.color]) || 0) + 1;

    const gainedNobles = [];
    state.nobles.slice().forEach((noble) => {
      if (meetsNoble(player, noble)) {
        player.nobles.push(noble);
        state.nobles = state.nobles.filter((n) => n.id !== noble.id);
        gainedNobles.push(noble);
      }
    });

    const score = scoreOf(player);
    state.selection = [];
    state.lastAction = "شراء بطاقة " + COLOR_NAMES[card.color] + " (" + ar(card.points) + " نقطة)";
    logAction("اشترى <strong>" + U.escape(player.name) + "</strong> بطاقة " + COLOR_NAMES[card.color] + " بقيمة <strong>" + ar(card.points) + "</strong> نقطة.", "good");
    if (gainedNobles.length) {
      logAction("زيارة نبيل! حصل <strong>" + U.escape(player.name) + "</strong> على <strong>3</strong> نقاط إضافية.", "good");
      if (FX) FX.sound("win");
    }

    if (score >= state.targetScore && !state.finalRound) {
      state.finalRound = true;
      state.finalStarter = state.current;
      logAction("بلغ <strong>" + U.escape(player.name) + "</strong> هدف " + ar(state.targetScore) + " نقطة — تُستكمل الدورة ثم تُعلن النتائج.", "accent");
    }

    if (FX) {
      FX.sound("coin");
      FX.after(() => FX.pop(rootRef && rootRef.querySelector(".spl-player.active")), 45);
    }
    endTurn();
    return true;
  }

  function endTurn() {
    if (!state || state.over) return;
    state.selection = [];
    const next = (state.current + 1) % state.players.length;
    if (state.finalRound && next === state.finalStarter) {
      finishGame();
      return;
    }
    if (next === 0) state.round += 1;
    state.current = next;
    state.turnSeq += 1;
    state.phase = "play";
    state.notice = "دور " + state.players[next].name + " — اختر أحجارًا أو اشترِ بطاقة.";
    render();
    maybeAI();
  }

  function finishGame() {
    if (!state) return;
    state.over = true;
    state.phase = "over";
    const ranked = state.players.slice().sort((a, b) => {
      const diff = scoreOf(b) - scoreOf(a);
      if (diff) return diff;
      const cardDiff = (a.cards || []).length - (b.cards || []).length;
      if (cardDiff) return cardDiff;
      return (b.bonuses.white + b.bonuses.blue + b.bonuses.green + b.bonuses.red + b.bonuses.black) -
        (a.bonuses.white + a.bonuses.blue + a.bonuses.green + a.bonuses.red + a.bonuses.black);
    });
    const winner = ranked[0];
    state.winner = winner ? winner.index : null;
    const standings = ranked.map((player) => ({
      name: player.name,
      value: scoreOf(player) + " نقطة · " + (player.cards || []).length + " بطاقة",
    }));
    logAction("انتهت اللعبة — فاز <strong>" + U.escape(winner ? winner.name : "لا أحد") + "</strong> بـ<strong>" + ar(winner ? scoreOf(winner) : 0) + "</strong> نقطة!", "good");
    render();
    if (FX) FX.win();
    if (apiRef && apiRef.gameOver) {
      apiRef.gameOver({
        icon: "💎",
        title: "انتهت سبْلندور",
        text: winner ? "أفضل تاجر جواهر في المدينة." : "انتهت المباراة.",
        winner: winner ? winner.name : "",
        standings,
      });
    }
  }

  /* ------------------------------ الذكاء الاصطناعي ------------------------------ */

  function allOptions(player) {
    const list = [];
    [3, 2, 1].forEach((tier) => {
      state.market[tier].forEach((card) => list.push({ card, source: "market", tier }));
    });
    (player.reserved || []).forEach((card) => list.push({ card, source: "reserved", tier: card.tier }));
    return list;
  }

  function totalNeed(need) {
    return Object.keys(need).reduce((sum, color) => sum + need[color], 0);
  }

  function aiChoose(player) {
    const options = allOptions(player);
    const affordable = options.filter(({ card }) => !!canPay(player, card));
    if (affordable.length) {
      affordable.sort((a, b) => {
        const scoreA = a.card.points * 10 - totalCost(a.card) * 0.45 + a.card.tier * 0.6;
        const scoreB = b.card.points * 10 - totalCost(b.card) * 0.45 + b.card.tier * 0.6;
        return scoreB - scoreA;
      });
      return { type: "buy", card: affordable[0].card, source: affordable[0].source };
    }

    if (player.reserved.length < 3) {
      const reserves = options
        .filter(({ source, card }) => source === "market" && card.points >= 2)
        .sort((a, b) => b.card.points - a.card.points);
      if (reserves.length && Math.random() < 0.35) return { type: "reserve", card: reserves[0].card };
    }

    const targets = options
      .map((entry) => ({ entry, need: deficits(player, entry.card) }))
      .map((item) => ({ ...item, total: totalNeed(item.need) }))
      .filter((item) => item.total > 0)
      .sort((a, b) => a.total - b.total || b.entry.card.points - a.entry.card.points);

    const targetNeed = targets.length ? targets[0].need : null;
    const room = Math.max(0, 10 - tokenTotal(player));
    if (room > 0) {
      if (targetNeed) {
        const colors = Object.keys(targetNeed)
          .filter((color) => state.bank[color] > 0)
          .sort((a, b) => targetNeed[b] - targetNeed[a]);
        if (colors.length) {
          if (colors.length === 1 && targetNeed[colors[0]] >= 2 && state.bank[colors[0]] >= 4 && room >= 2) {
            return { type: "gems", colors: [colors[0], colors[0]] };
          }
          return { type: "gems", colors: colors.slice(0, Math.min(3, room)) };
        }
      }

      const available = COLORS.filter((color) => state.bank[color] > 0).slice(0, Math.min(3, room));
      if (available.length) return { type: "gems", colors: available };
    }

    if (player.reserved.length < 3) {
      const reserve = options.find(({ source }) => source === "market");
      if (reserve) return { type: "reserve", card: reserve.card };
    }
    return null;
  }

  function maybeAI() {
    if (!state || state.over) return;
    if (!aiRunner) return;
    aiRunner.clear();
    const player = cur();
    if (!player || !AI.isCpu(player)) return;
    if (typeof AI.autoAllowed === "function" && !AI.autoAllowed(apiRef, player)) return;
    const seq = state.turnSeq;
    const index = state.current;
    aiRunner.later(() => {
      if (!state || state.over || state.turnSeq !== seq || state.current !== index) return;
      const move = aiChoose(player);
      if (!move) { endTurn(); return; }
      let ok = false;
      if (move.type === "buy") ok = buyCard(move.card.id, move.source);
      else if (move.type === "reserve") ok = reserveCard(move.card.id);
      else if (move.type === "gems") ok = takeGems(move.colors);
      if (!ok && state && !state.over && state.turnSeq === seq) endTurn();
    }, AI.delay(player.level, 0.9));
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function costEntries(card) {
    return COLORS.filter((color) => Number(card.cost[color]) > 0).map((color) => [color, Number(card.cost[color])]);
  }

  function costHTML(card) {
    const list = costEntries(card);
    if (!list.length) return '<span class="spl-cost-empty">مجانًا</span>';
    return list.map(([color, count]) => '<span class="spl-cost c-' + color + '" title="' + COLOR_NAMES[color] + '">' + count + "</span>").join("");
  }

  function cardHTML(card, source) {
    const player = cur();
    const pay = player && canPay(player, card);
    const affordable = !!pay && canAct();
    return (
      '<button type="button" class="spl-card c-' + card.color + (affordable ? " affordable" : "") + '"' +
      ' data-card="' + card.id + '" data-source="' + source + '"' +
      ' aria-label="' + COLOR_NAMES[card.color] + " " + ar(card.points) + ' نقاط">' +
      '<span class="spl-card-head"><span class="spl-points">' + (card.points || "") + "</span>" +
      '<span class="spl-bonus" title="بونص ' + COLOR_NAMES[card.color] + '">' + COLOR_GLYPHS[card.color] + "</span></span>" +
      '<span class="spl-card-cost">' + costHTML(card) + "</span>" +
      "</button>"
    );
  }

  function gemsHTML() {
    return GEM_COLORS.map((color) => {
      const selected = state.selection.filter((c) => c === color).length;
      const count = Number(state.bank[color]) || 0;
      if (color === "gold") {
        return (
          '<span class="spl-gem c-gold" title="ذهب — يُؤخذ فقط عند حجز بطاقة">' +
          '<span class="spl-gem-glyph">' + COLOR_GLYPHS[color] + "</span><b>" + count + "</b></span>"
        );
      }
      return (
        '<button type="button" class="spl-gem c-' + color + (selected ? " selected" : "") + '" data-gem="' + color + '"' +
        (count <= 0 ? " disabled" : "") + ' title="' + COLOR_NAMES[color] + '">' +
        '<span class="spl-gem-glyph">' + COLOR_GLYPHS[color] + "</span><b>" + count + "</b>" +
        (selected ? '<i class="spl-gem-count">' + selected + "</i>" : "") +
        "</button>"
      );
    }).join("");
  }

  function marketHTML() {
    return [3, 2, 1].map((tier) => {
      const market = state.market[tier] || [];
      return (
        '<div class="spl-tier tier-' + tier + '">' +
        '<div class="spl-deck-pile" title="بطاقات متبقية في المستوى ' + tier + '">' +
        "<span>" + (tier === 3 ? "III" : tier === 2 ? "II" : "I") + "</span>" +
        "<b>" + state.decks[tier].length + "</b>" +
        "</div>" +
        market.map((card) => cardHTML(card, "market")).join("") +
        "</div>"
      );
    }).join("");
  }

  function noblesHTML() {
    if (!state.nobles.length) return "";
    return state.nobles
      .map(
        (noble) =>
          '<div class="spl-noble" title="نبيل: 3 نقاط">' +
          '<span class="spl-noble-score">3</span>' +
          '<span class="spl-noble-req">' +
          Object.keys(noble.req)
            .map((color) => '<span class="spl-cost c-' + color + '">' + noble.req[color] + "</span>")
            .join("") +
          "</span></div>"
      )
      .join("");
  }

  function selectionHTML() {
    if (!state.selection.length) return '<span class="spl-selection-empty">لم تختر أحجارًا بعد.</span>';
    return state.selection
      .map((color) => '<span class="spl-selected-chip c-' + color + '">' + COLOR_GLYPHS[color] + " " + COLOR_NAMES[color] + "</span>")
      .join("");
  }

  function playerHTML(player) {
    const active = state.current === player.index;
    const gems = GEM_COLORS.map(
      (color) =>
        '<span class="spl-pg c-' + color + '" title="' + COLOR_NAMES[color] + '">' + (Number(player.gems[color]) || 0) + "</span>"
    ).join("");
    const bonuses = COLORS.map(
      (color) =>
        '<span class="spl-pb c-' + color + '" title="بونص ' + COLOR_NAMES[color] + '">' + (Number(player.bonuses[color]) || 0) + "</span>"
    ).join("");
    const showReserved = player.index === viewerIndex();
    const reserved =
      showReserved && player.reserved.length
        ? '<div class="spl-reserved-list">' +
          player.reserved
            .map(
              (card) =>
                '<button type="button" class="spl-reserved c-' + card.color + '" data-card="' + card.id + '" data-source="reserved" title="' +
                COLOR_NAMES[card.color] + " — " + ar(card.points) + ' نقاط">' +
                (card.points ? "<b>" + card.points + "</b>" : "") + "<span>" + COLOR_GLYPHS[card.color] + "</span>" +
                "</button>"
            )
            .join("") +
          "</div>"
        : "";
    return (
      '<div class="spl-player p' + (player.index % 6) + (active ? " active" : "") + (player.isCpu ? " is-cpu" : "") + '">' +
      '<div class="spl-player-top">' + BG.playerProfile.playerHTML(player, "spl-player-avatar") +
      "<strong>" + U.escape(player.name) + (player.isCpu ? ' <small class="spl-cpu-tag">كمبيوتر</small>' : "") + "</strong>" +
      '<span class="spl-score" title="النقاط">' + scoreOf(player) + "</span></div>" +
      '<div class="spl-player-gems">' + gems + "</div>" +
      '<div class="spl-player-bonuses">' + bonuses + "</div>" +
      '<div class="spl-player-foot"><span>' + (player.cards || []).length + " بطاقة</span><span>" +
      (player.reserved || []).length + "/3 محجوزة</span><span>" + (player.nobles || []).length + " نبيل</span></div>" +
      reserved +
      "</div>"
    );
  }

  function actionHTML() {
    if (state.over) return '<p class="spl-hint">انتهت اللعبة — راجع الترتيب في نافذة النتائج.</p>';
    const player = cur();
    if (!player) return "";
    if (player.isCpu) return '<p class="spl-hint">الكمبيوتر يفكر ويختار حركته…</p>';
    const valid = selectionValid(state.selection);
    const stuck = !hasAnyMove(player);
    return (
      '<div class="spl-selection-box">' +
      '<span class="spl-selection-label">اختيارك · ' + tokenTotal(player) + "/10 حجر</span>" +
      '<div class="spl-selection-chips">' + selectionHTML() + "</div>" +
      "</div>" +
      '<div class="spl-actions">' +
      '<button type="button" class="bg-btn primary" data-confirm-gems ' + (valid ? "" : "disabled") + ">خذ الأحجار</button>" +
      '<button type="button" class="bg-btn" data-clear-gems ' + (state.selection.length ? "" : "disabled") + ">مسح</button>" +
      "</div>" +
      (stuck ? '<button type="button" class="bg-btn" data-pass>تخطّي الدور (لا حركة متاحة)</button>' : "") +
      '<p class="spl-hint">اختر حتى 3 أحجار مختلفة، أو حجرين من اللون نفسه إذا كان البنك يملك 4 على الأقل. اضغط بطاقة للشراء أو الحجز.</p>'
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const wrap = document.createElement("div");
    wrap.className = "spl-layout";

    const board = document.createElement("div");
    board.className = "spl-board";
    board.innerHTML =
      '<div class="spl-board-head">' +
      '<div><span class="spl-kicker">سوق الجواهر</span><h2>سبْلندور</h2></div>' +
      '<p>اجمع البطاقات والنبلاء وابلغ <strong>' + ar(state.targetScore) + "</strong> نقطة قبل الجميع.</p>" +
      "</div>" +
      '<div class="spl-gems" role="group" aria-label="بنك الجواهر">' + gemsHTML() + "</div>" +
      '<div class="spl-nobles-row"><span class="spl-section-label">النبلاء</span><div class="spl-nobles">' + noblesHTML() + "</div></div>" +
      '<div class="spl-market">' + marketHTML() + "</div>";

    const side = document.createElement("aside");
    side.className = "spl-side";
    side.innerHTML =
      '<section class="spl-panel"><div class="spl-panel-head"><h2>اللاعبون</h2><span>الجولة ' + state.round + "</span></div>" +
      '<div class="spl-players">' + state.players.map(playerHTML).join("") + "</div></section>" +
      '<section class="spl-panel action-panel"><div class="spl-panel-head"><h2>دور ' +
      (player ? U.escape(player.name) : "—") + "</h2><span>" + (state.finalRound ? "الدورة الأخيرة" : "الهدف " + ar(state.targetScore)) + "</span></div>" +
      actionHTML() + "</section>" +
      '<section class="spl-panel legend-panel"><div class="spl-panel-head"><h2>كيف تلعب</h2><span>SPLENDOR</span></div>' +
      '<p class="spl-hint">كل بطاقة تمنحك بونصًا دائمًا يخفض تكلفة البطاقات اللاحقة. النبلاء يزورونك تلقائيًا عند استيفاء شروطهم ويمنحونك 3 نقاط.</p>' +
      '<p class="spl-hint">' + U.escape(state.notice || "") + "</p></section>";

    wrap.appendChild(board);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (apiRef && !state.over && apiRef.setStatus) apiRef.setStatus("دور " + AI.statusName(player), "live");
  }

  function openCardDialog(id, source) {
    if (!state || state.over) return;
    const found = findCard(id, source);
    if (!found) return;
    const player = cur();
    if (!player || !canAct()) return;
    const card = found.card;
    const pay = canPay(player, card);
    const body = BG.el("div", { class: "spl-dialog" });
    body.innerHTML =
      '<div class="spl-dialog-head c-' + card.color + '">' +
      '<span class="spl-dialog-glyph">' + COLOR_GLYPHS[card.color] + "</span>" +
      "<div><strong>" + COLOR_NAMES[card.color] + "</strong><small>المستوى " + ar(card.tier) + "</small></div>" +
      '<b class="spl-dialog-points">' + ar(card.points) + " نقطة</b></div>" +
      '<div class="spl-dialog-body">' +
      "<p>بونص دائم: <strong>+" + COLOR_GLYPHS[card.color] + " " + COLOR_NAMES[card.color] + "</strong></p>" +
      '<p>التكلفة المطلوبة:</p><div class="spl-dialog-cost">' + costHTML(card) + "</div>" +
      '<p>التكلفة بعد البونصات: ' + costHTML({ cost: COLORS.reduce((cost, color) => {
        const need = Math.max(0, (Number(card.cost[color]) || 0) - (Number(player.bonuses[color]) || 0));
        if (need) cost[color] = need;
        return cost;
      }, {}) }) + "</p>" +
      '<p class="spl-hint">' + (pay ? "يمكنك شراء هذه البطاقة الآن." : "لا تملك الجواهر الكافية بعد.") + "</p>" +
      "</div>";

    const actions = [{ label: "إلغاء", value: "close" }];
    if (pay) {
      actions.push({
        label: "شراء البطاقة",
        primary: true,
        onClick: ({ close }) => { close("buy"); buyCard(id, found.source); },
      });
    }
    if (found.source === "market" && player.reserved.length < 3) {
      actions.push({
        label: state.bank.gold > 0 && tokenTotal(player) < 10 ? "حجز + ذهب" : "حجز",
        onClick: ({ close }) => { close("reserve"); reserveCard(id); },
      });
    }
    BG.openDialog({ title: "بطاقة تطوير", body, actions });
  }

  function toggleGem(color) {
    if (!state || state.over || !canAct()) return;
    if (COLORS.indexOf(color) === -1) return;
    const selection = state.selection.slice();
    const count = selection.filter((c) => c === color).length;
    if (count) {
      if (selection.length === 1 && state.bank[color] >= 4) {
        selection.push(color);
        state.selection = selection;
        render();
        return;
      }
      state.selection = selection.filter((c) => c !== color);
      render();
      return;
    }
    if (!selection.length) {
      if (state.bank[color] > 0) selection.push(color);
    } else if (selection.length === 1) {
      if (state.bank[color] > 0) {
        if (selection[0] === color) {
          if (state.bank[color] >= 4) selection.push(color);
          else BG.toast("تحتاج 4 أحجار في البنك لأخذ حجرين من اللون نفسه.", "warn");
        } else {
          selection.push(color);
        }
      }
    } else if (selection.length === 2 && selection[0] !== selection[1] && state.bank[color] > 0) {
      selection.push(color);
    }
    state.selection = selection;
    render();
  }

  function onClick(event) {
    if (!state) return;
    const target = event.target;
    if (!target || !target.closest) return;

    const gem = target.closest("[data-gem]");
    if (gem) { toggleGem(gem.getAttribute("data-gem")); return; }

    const card = target.closest("[data-card]");
    if (card) {
      openCardDialog(card.getAttribute("data-card"), card.getAttribute("data-source") || "market");
      return;
    }

    if (target.closest("[data-confirm-gems]")) {
      if (!canAct()) return;
      if (!selectionValid(state.selection)) {
        BG.toast("اختر أحجارًا صالحة أولًا.", "warn");
        return;
      }
      takeGems(state.selection);
      return;
    }

    if (target.closest("[data-clear-gems]")) {
      if (!canAct()) return;
      state.selection = [];
      render();
      return;
    }

    if (target.closest("[data-pass]")) {
      if (!canAct()) return;
      state.notice = "لا حركة متاحة — تخطّى " + cur().name + " دوره.";
      endTurn();
    }
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "splendor",
    name: "سبْلندور",
    en: "SPLENDOR",
    icon: "💎",
    accent: "#8b6bc4",
    cardClass: "card-splendor",
    tagline: "اجمع الجواهر، اشترِ بطاقات التطوير، واستقطب النبلاء لتكون أغنى تاجر في عصر النهضة.",
    players: "2–4",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "خيارات المباراة. تُطبَّق على اللعب المحلي والجماعي معًا.",
      defaults: DEFAULT_OPTIONS,
      fields: [
        {
          key: "targetScore",
          label: "هدف النقاط",
          type: "seg",
          choices: [
            { value: 15, label: "15 نقطة" },
            { value: 18, label: "18 نقطة" },
            { value: 20, label: "20 نقطة" },
          ],
          hint: "الهدف القياسي 15 نقطة. عند بلوغه تُستكمل دورة اللاعبين ثم يفوز صاحب أعلى رصيد.",
        },
      ],
      summary(options) {
        return "الهدف " + ar(Number(options.targetScore) || 15) + " نقطة";
      },
    },

    rules: {
      goal: "كن أول من يجمع 15 نقطة شرف (أو الهدف المختار). النقاط تأتي من بطاقات التطوير ومن زيارة النبلاء، وعند التعادل يفوز صاحب بطاقات أقل.",
      facts: [
        ["اللاعبون", "2–4"],
        ["البطاقات", "90 بطاقة تطوير"],
        ["النبلاء", "3–5 حسب عدد اللاعبين"],
        ["الهدف", "15 نقطة افتراضيًا"],
      ],
      components: [
        "90 بطاقة تطوير موزعة على ثلاثة مستويات (40 + 30 + 20).",
        "5 أنواع من الجواهر: أبيض، أزرق، أخضر، أحمر، أسود، إضافة إلى الذهب كجوهرة جامحة.",
        "5 بطاقات نبلاء (يُستخدم عدد اللاعبين + 1) بقيمة 3 نقاط لكل نبيل.",
        "بنك جواهر: 4 قطع من كل لون للاعبين اثنين، أو 5 لثلاثة لاعبين، أو 7 لأربعة لاعبين، مع 5 قطع ذهب دائمًا.",
      ],
      setup: [
        "تُخلط بطاقات كل مستوى على حدة، ويُكشف 4 بطاقات من كل مستوى.",
        "يُكشف عدد من النبلاء يساوي عدد اللاعبين + 1.",
        "تُرتّب الجواهر في البنك حسب اللون، ويوضع الذهب جانبًا.",
        "يبدأ اللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>خذ جواهر:</strong> خذ 3 أحجار مختلفة، أو حجرين من اللون نفسه إذا كان البنك يملك 4 على الأقل. لا تؤخذ الجواهر إن لم تكن متاحة.",
        "<strong>احجز بطاقة:</strong> خذ بطاقة من السوق إلى منطقة حجزك (3 كحد أقصى) واستلم قطعة ذهب إن توفرت. الحجز بديل عن أخذ الجواهر.",
        "<strong>اشترِ بطاقة:</strong> ادفع تكلفتها بالجواهر بعد خصم بونصاتك الدائمة. الذهب يعوّض أي لون ناقص.",
        "<strong>البونص:</strong> كل بطاقة تشتريها تمنحك بونصًا دائمًا من لونها يخفض تكلفة البطاقات المستقبلية ولا يُستهلك.",
        "<strong>النبلاء:</strong> في نهاية دورك، إذا استوفت بونصاتك شروط نبيل يحضر تلقائيًا ويمنحك 3 نقاط. النبيل الواحد لصاحب واحد فقط.",
        "<strong>نهاية اللعبة:</strong> عند بلوغ لاعب الهدف تُستكمل الدورة الحالية، ثم يفوز صاحب أعلى نقاط، وعند التعادل من يملك بطاقات أقل.",
      ],
      winning: "أول لاعب يبلغ هدف النقاط يطلق الدورة الأخيرة. بعد أن يلعب جميع اللاعبين دورهم الأخير، يفوز صاحب أعلى مجموع نقاط من البطاقات والنبلاء، وعند التعادل يفوز صاحب عدد البطاقات الأقل.",
      notes: [
        "الهدف قابل للتغيير من خيارات اللعبة (15 أو 18 أو 20 نقطة).",
        "الذهب لا يُؤخذ مباشرة؛ يُحصل عليه فقط عند حجز بطاقة.",
        "لا يمكن حمل أكثر من 10 أحجار في نهاية الدور؛ استخدم أحجارك أو اشترِ بطاقة قبل تجاوز الحد.",
        "البطاقات المحجوزة تبقى في منطقة اللاعب ويمكن شراؤها لاحقًا، ولا تُحتسب ضمن بطاقات السوق.",
        "النبلاء ليسوا بطاقات شراء؛ يكفي استيفاء شروط بونصاتهم.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      state = makeMatch(api.options || {});
      apiRef.log("بدأت سبْلندور — " + ar(state.players.length) + " لاعبين والهدف " + ar(state.targetScore) + " نقطة.", "accent");
      render();
      maybeAI();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render,
          buyCard,
          reserveCard,
          takeGems,
          endTurn,
          canPay,
          scoreOf,
          selectionValid,
          aiChoose,
          allOptions,
          COLORS,
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
            player.gems = Object.assign({ white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 }, player.gems || {});
            player.bonuses = Object.assign({ white: 0, blue: 0, green: 0, red: 0, black: 0 }, player.bonuses || {});
            player.cards = Array.isArray(player.cards) ? player.cards.filter((c) => c && c.cost) : [];
            player.reserved = Array.isArray(player.reserved) ? player.reserved.filter((c) => c && c.cost) : [];
            player.nobles = Array.isArray(player.nobles) ? player.nobles : [];
          });
          [1, 2, 3].forEach((tier) => {
            if (!state.decks || typeof state.decks !== "object") state.decks = {};
            if (!state.market || typeof state.market !== "object") state.market = {};
            state.decks[tier] = Array.isArray(state.decks[tier]) ? state.decks[tier].filter((c) => c && c.cost) : [];
            state.market[tier] = Array.isArray(state.market[tier]) ? state.market[tier].filter((c) => c && c.cost) : [];
          });
          state.bank = Object.assign({ white: 4, blue: 4, green: 4, red: 4, black: 4, gold: 5 }, state.bank || {});
          state.nobles = Array.isArray(state.nobles) ? state.nobles : [];
          state.selection = [];
          state.finalRound = !!state.finalRound;
          state.finalStarter = state.finalStarter == null ? null : Number(state.finalStarter);
          state.turnSeq = Number(state.turnSeq) || 0;
          state.targetScore = [15, 18, 20].indexOf(Number(state.targetScore)) !== -1 ? Number(state.targetScore) : 15;
          render();
          if (!state.over) maybeAI();
        },
        netSeat() {
          return state ? state.current : -1;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state) return;
          state.selection = [];
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
