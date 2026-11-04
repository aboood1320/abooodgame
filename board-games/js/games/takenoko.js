/* ==========================================================================
   تاكينوكو — حديقة الخيزران الإمبراطورية
   لوحة سداسية نصف قطرها ٣، ٢٨ قطعة أرض، باندا وبستاني، ريّ وطقس وأهداف.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const SQRT3 = Math.sqrt(3);
  const RADIUS = 3;
  const MIN_X = -4.5;
  const WIDTH_UNITS = 11;
  const MIN_Y = -SQRT3 * 3;
  const HEIGHT_UNITS = SQRT3 * 7;
  const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

  const COLORS = {
    green: { name: "أخضر", color: "#6f9b6e", light: "#a9c9a5" },
    yellow: { name: "أصفر", color: "#c9a45c", light: "#e2c98f" },
    pink: { name: "وردي", color: "#c77c64", light: "#e3ae9d" },
  };
  const PLAYER_COLORS = ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb"];
  const WEATHER = {
    sun: { icon: "☀️", name: "شمس", text: "ثلاثة أفعال مختلفة هذا الدور." },
    rain: { icon: "🌧️", name: "مطر", text: "أضف قسم خيزران إلى أرض مروية." },
    wind: { icon: "🌬️", name: "ريح", text: "يمكن تكرار الفعل نفسه هذا الدور." },
    storm: { icon: "⛈️", name: "عاصفة", text: "حرّك الباندا إلى أي أرض، ثم يأكل." },
    clouds: { icon: "☁️", name: "غيوم", text: "احصل على تحسين وضعه على أرض بلا خيزران." },
    "?": { icon: "❓", name: "طقس متغير", text: "اختر أي طقس من الوجوه الخمسة." },
  };
  const IMPROVEMENTS = {
    enclosure: { name: "سياج", icon: "🚧", text: "يمنع الباندا من أكل خيزران هذه الأرض." },
    fertilizer: { name: "سماد", icon: "🌱", text: "كل نمو يضيف قسمين بدلًا من واحد." },
    watershed: { name: "مورد ماء", icon: "💧", text: "تسقي الأرض تلقائيًا وتضيف أول قسم." },
  };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function key(q, r) { return q + "," + r; }
  function cur() { return state.players[state.current]; }
  function tileAt(q, r) { return state.grid[key(q, r)] || null; }
  function isPond(q, r) { return q === 0 && r === 0; }
  function isLand(tile) { return !!tile; }
  function occupied(q, r) { return isPond(q, r) || !!tileAt(q, r); }

  function neighbors(q, r) {
    return DIRECTIONS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
      .filter((cell) => Math.abs(cell.q) <= RADIUS && Math.abs(cell.r) <= RADIUS && Math.abs(cell.q + cell.r) <= RADIUS);
  }

  function boardCells() {
    const list = [];
    for (let q = -RADIUS; q <= RADIUS; q++) {
      for (let r = -RADIUS; r <= RADIUS; r++) {
        if (Math.abs(q + r) <= RADIUS) list.push({ q, r });
      }
    }
    return list;
  }

  function straightTargets(from) {
    const targets = [];
    if (!from) return targets;
    DIRECTIONS.forEach(([dq, dr]) => {
      let q = from.q + dq;
      let r = from.r + dr;
      while (Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS) {
        if (!occupied(q, r)) break;
        targets.push({ q, r, dq, dr });
        q += dq;
        r += dr;
      }
    });
    return targets;
  }

  function pathClear(from, to) {
    if (!from || !to) return false;
    const dq = Math.sign(to.q - from.q);
    const dr = Math.sign(to.r - from.r);
    if (!DIRECTIONS.some(([a, b]) => a === dq && b === dr)) return false;
    let q = from.q + dq;
    let r = from.r + dr;
    let guard = 0;
    while (q !== to.q || r !== to.r) {
      if (!occupied(q, r)) return false;
      q += dq;
      r += dr;
      if (guard++ > 20) return false;
    }
    return occupied(to.q, to.r);
  }

  function genColorCounts() {
    const plots = [];
    [[3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 2], [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 4, 4, 4]]
      .forEach((caps, index) => {
        const color = index === 0 ? "green" : index === 1 ? "yellow" : "pink";
        caps.forEach((capacity) => plots.push({ color, capacity }));
      });
    return plots;
  }

  function createPlotDeck() {
    const plots = genColorCounts();
    const shuffled = U.shuffle(plots.slice());
    const improvements = [
      "enclosure", "enclosure", "enclosure",
      "fertilizer", "fertilizer", "fertilizer",
      "watershed", "watershed", "watershed",
    ];
    shuffled.slice(0, 9).forEach((plot, index) => { plot.improvement = improvements[index]; });
    return U.shuffle(shuffled).map((plot) => ({
      color: plot.color,
      capacity: plot.capacity,
      improvement: plot.improvement || null,
      bamboo: 0,
      irrigated: false,
    }));
  }

  let cardSeq = 0;
  function card(cat, props) {
    cardSeq += 1;
    return Object.assign({ id: cat + "-" + cardSeq, cat }, props);
  }

  function createDecks() {
    const plot = [];
    ["green", "yellow", "pink"].forEach((color) => {
      for (let i = 0; i < 3; i++) plot.push(card("plot", { color, count: 3 }));
      for (let i = 0; i < 2; i++) plot.push(card("plot", { color, count: 4 }));
    });
    const gardener = [];
    const gardenerTypes = [
      { kind: "height", color: "green", height: 4 },
      { kind: "height", color: "yellow", height: 4 },
      { kind: "height", color: "pink", height: 4 },
      { kind: "shoots3" },
      { kind: "fert4" },
    ];
    gardenerTypes.forEach((type) => {
      for (let i = 0; i < 3; i++) gardener.push(card("gardener", Object.assign({}, type)));
    });
    const panda = [];
    ["green", "yellow", "pink"].forEach((color) => {
      panda.push(card("panda", { need: { [color]: 2 } }));
      panda.push(card("panda", { need: { [color]: 2 } }));
      panda.push(card("panda", { need: { [color]: 3 } }));
      panda.push(card("panda", { need: { [color]: 3 } }));
    });
    [["green", "yellow"], ["green", "pink"], ["yellow", "pink"]].forEach(([a, b]) => {
      panda.push(card("panda", { need: { [a]: 1, [b]: 1 } }));
    });
    return {
      plot: U.shuffle(plot),
      gardener: U.shuffle(gardener),
      panda: U.shuffle(panda),
    };
  }

  function cardPoints(card) {
    if (card.cat === "plot") return card.count;
    if (card.cat === "gardener") {
      if (card.kind === "shoots3") return 3;
      return 4;
    }
    if (card.cat === "panda") {
      return Object.keys(card.need || {}).reduce((sum, color) => sum + card.need[color], 0);
    }
    return 0;
  }

  function cardLabel(card) {
    if (card.cat === "plot") {
      return ar(card.count) + " قطع " + COLORS[card.color].name + " متجاورة، وكلها مروية.";
    }
    if (card.cat === "gardener") {
      if (card.kind === "height") return "برعم " + COLORS[card.color].name + " بارتفاع ٤ أقسام.";
      if (card.kind === "shoots3") return "ثلاثة براعم بارتفاع ٣ أقسام في الحديقة.";
      if (card.kind === "fert4") return "برعم بارتفاع ٤ أقسام على أرض عليها سماد.";
    }
    if (card.cat === "panda") {
      return "اجمع من لوحتك: " + Object.keys(card.need).map((color) => ar(card.need[color]) + " " + COLORS[color].name).join(" + ") + ".";
    }
    return "";
  }

  function makePlayers() {
    const sources = apiRef.players || [];
    const count = U.clamp(sources.length || 2, 2, 4);
    const list = [];
    for (let index = 0; index < count; index++) {
      const source = sources[index];
      list.push({
        index,
        name: source && source.name ? source.name : "اللاعب " + (index + 1),
        color: PLAYER_COLORS[index],
        type: source && source.type === "cpu" ? "cpu" : "human",
        level: source ? BG.ai.level(source.level) : BG.ai.level(1),
        isCpu: source ? BG.ai.isCpu(source) : index > 0,
        hand: [],
        completed: [],
        bamboo: { green: 0, yellow: 0, pink: 0 },
        improvements: [],
      });
    }
    return list;
  }

  function newState() {
    const players = makePlayers();
    const decks = createDecks();
    players.forEach((player) => {
      player.hand.push(decks.plot.pop());
      player.hand.push(decks.gardener.pop());
      player.hand.push(decks.panda.pop());
    });
    const grid = {};
    return {
      players,
      current: 0,
      round: 1,
      turnCount: 1,
      grid,
      pond: { q: 0, r: 0 },
      deck: createPlotDeck(),
      decks,
      improvementDeck: { enclosure: 3, fertilizer: 3, watershed: 3 },
      gardener: { q: 0, r: 0 },
      panda: { q: 0, r: 0 },
      weather: "none",
      actionsLeft: 2,
      usedTypes: [],
      allowRepeat: false,
      phase: "actions",
      mode: null,
      pendingTiles: null,
      selectedTile: null,
      pendingImprovement: null,
      reserveType: null,
      notice: "ابدأ بوضع قطعة أرض بجوار البركة. البستاني والباندا يبدآن على البركة.",
      last: null,
      over: false,
      winner: null,
      endTriggered: false,
      emperorHolder: null,
      finalQueue: [],
      emperorAwarded: false,
    };
  }

  function addBamboo(tile, amount) {
    if (!tile || !tile.irrigated) return 0;
    const bonus = tile.improvement === "fertilizer" ? 2 : 1;
    const before = tile.bamboo;
    tile.bamboo = Math.min(tile.capacity, tile.bamboo + amount * bonus);
    return tile.bamboo - before;
  }

  function firstIrrigation(tile) {
    return addBamboo(tile, 1);
  }

  function validPlotCells() {
    return boardCells().filter((cell) => {
      if (isPond(cell.q, cell.r) || tileAt(cell.q, cell.r)) return false;
      const near = neighbors(cell.q, cell.r);
      if (near.some((n) => isPond(n.q, n.r))) return true;
      return near.filter((n) => !!tileAt(n.q, n.r)).length >= 2;
    });
  }

  function validIrrigationCells() {
    return boardCells().filter((cell) => {
      const tile = tileAt(cell.q, cell.r);
      if (!tile || tile.irrigated) return false;
      return neighbors(cell.q, cell.r).some((n) => isPond(n.q, n.r) || (tileAt(n.q, n.r) && tileAt(n.q, n.r).irrigated));
    });
  }

  function validImprovementCells(type) {
    return boardCells().filter((cell) => {
      const tile = tileAt(cell.q, cell.r);
      if (!tile || tile.bamboo > 0) return false;
      if (tile.improvement) return false;
      if (type === "watershed" && tile.irrigated) return false;
      return true;
    });
  }

  function validGardenerTargets() {
    return straightTargets(state.gardener);
  }

  function validPandaTargets() {
    return straightTargets(state.panda);
  }

  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }
  function canPick(player) {
    if (!state || state.over || !player) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }

  function playerScore(player) {
    return player.completed.reduce((sum, item) => sum + cardPoints(item), 0) + (state.emperorHolder === player.index ? 2 : 0);
  }

  function pandaPoints(player) {
    return player.completed.filter((item) => item.cat === "panda").reduce((sum, item) => sum + cardPoints(item), 0);
  }

  function completedCount(player) { return player.completed.length; }

  function threshold() {
    return state.players.length === 2 ? 9 : state.players.length === 3 ? 8 : 7;
  }

  function hasBamboo(player) {
    return player.bamboo.green + player.bamboo.yellow + player.bamboo.pink;
  }

  function claimable(card, player) {
    if (!player || !card) return false;
    if (card.cat === "plot") {
      const seen = new Set();
      for (const cell of boardCells()) {
        const tile = tileAt(cell.q, cell.r);
        if (!tile || tile.color !== card.color || seen.has(key(cell.q, cell.r))) continue;
        const stack = [cell];
        const component = [];
        const visited = new Set();
        while (stack.length) {
          const at = stack.pop();
          const id = key(at.q, at.r);
          if (visited.has(id)) continue;
          visited.add(id);
          seen.add(id);
          const current = tileAt(at.q, at.r);
          if (!current || current.color !== card.color) continue;
          component.push(current);
          neighbors(at.q, at.r).forEach((next) => {
            if (!visited.has(key(next.q, next.r))) stack.push(next);
          });
        }
        if (component.length >= card.count && component.every((tile) => tile.irrigated)) return true;
      }
      return false;
    }
    if (card.cat === "gardener") {
      if (card.kind === "height") {
        return boardCells().some((cell) => {
          const tile = tileAt(cell.q, cell.r);
          return tile && tile.color === card.color && tile.bamboo >= card.height;
        });
      }
      if (card.kind === "shoots3") {
        return boardCells().filter((cell) => {
          const tile = tileAt(cell.q, cell.r);
          return tile && tile.bamboo >= 3;
        }).length >= 3;
      }
      if (card.kind === "fert4") {
        return boardCells().some((cell) => {
          const tile = tileAt(cell.q, cell.r);
          return tile && tile.improvement === "fertilizer" && tile.bamboo >= 4;
        });
      }
    }
    if (card.cat === "panda") {
      return Object.keys(card.need).every((color) => player.bamboo[color] >= card.need[color]);
    }
    return false;
  }

  function eligibleCards(player) {
    return player.hand.filter((card) => claimable(card, player));
  }

  /* ------------------------------ سير الدور ------------------------------ */

  function beginTurn(index) {
    if (!state || state.over) return;
    state.current = index;
    state.actionsLeft = 2;
    state.usedTypes = [];
    state.allowRepeat = false;
    state.mode = null;
    state.pendingTiles = null;
    state.selectedTile = null;
    state.pendingImprovement = null;
    state.reserveType = null;
    state.weather = "none";
    state.phase = "actions";
    apiRef.setStatus("دور " + cur().name);
    if (state.round > 1) {
      rollWeather();
    } else {
      state.notice = "الجولة الأولى: لا طقس. دور " + cur().name + " — نفّذ فعلين مختلفين.";
      render();
      settle();
    }
  }

  function nextSeat() {
    const next = state.current + 1;
    if (next >= state.players.length) {
      state.round += 1;
      return 0;
    }
    return next;
  }

  function endTurn() {
    if (!state || state.over || state.phase !== "actions") return false;
    clearTimeout(timer);
    if (state.endTriggered) {
      if (state.finalQueue.length) {
        const next = state.finalQueue.shift();
        beginTurn(next);
      } else {
        finish();
      }
      return true;
    }
    beginTurn(nextSeat());
    return true;
  }

  function finish() {
    if (!state) return;
    state.over = true;
    state.phase = "over";
    clearTimeout(timer);
    const rows = state.players.map((player) => ({
      player,
      score: playerScore(player),
      panda: pandaPoints(player),
      completed: player.completed.length,
    })).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.panda !== a.panda) return b.panda - a.panda;
      return b.completed - a.completed;
    });
    const ranking = rows.map((row) => ({
      name: row.player.name,
      value: row.score,
      detail: "أهداف: " + ar(row.completed) + " · باندا: " + ar(row.panda) + (state.emperorHolder === row.player.index ? " · إمبراطور +٢" : ""),
    }));
    state.notice = "انتهت اللعبة. الفائز: " + rows[0].player.name + " بـ" + ar(rows[0].score) + " نقطة.";
    state.winner = rows[0].player.name;
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت تاكينوكو",
      text: "الأهداف المكتملة فقط تُحتسب. صاحب الإمبراطور يحصل على نقطتين إضافيتين، والتعادل يحسمه عدد نقاط أهداف الباندا.",
      winner: rows[0].player.name + " — " + ar(rows[0].score) + " نقطة",
      icon: "🐼",
      standings: ranking,
    });
  }

  function checkTrigger(player) {
    if (!state || state.over || state.endTriggered) return false;
    if (player.completed.length < threshold()) return false;
    state.endTriggered = true;
    state.emperorHolder = player.index;
    const queue = [];
    for (let step = 1; step < state.players.length; step++) {
      queue.push((player.index + step) % state.players.length);
    }
    state.finalQueue = queue;
    state.notice = player.name + " أكمل " + ar(threshold()) + " أهداف! تأخذ بطاقة الإمبراطور (+٢) وتبدأ الجولة الأخيرة.";
    apiRef.log("<strong>" + esc(player.name) + "</strong> بدأ الجولة الأخيرة وأخذ بطاقة الإمبراطور (+٢).", "accent");
    return true;
  }

  /* ------------------------------ الطقس ------------------------------ */

  function rollWeather() {
    if (!state || state.over) return;
    const face = U.pick(["sun", "rain", "wind", "storm", "clouds", "?"]);
    state.weather = face;
    applyWeather(face);
  }

  function applyWeather(face) {
    if (!state || state.over) return;
    state.weather = face;
    state.phase = "actions";
    state.mode = null;
    state.pendingImprovement = null;
    if (face === "sun") {
      state.actionsLeft = 3;
      state.notice = "☀️ شمس: ثلاثة أفعال مختلفة هذا الدور.";
    } else if (face === "wind") {
      state.allowRepeat = true;
      state.actionsLeft = 2;
      state.notice = "🌬️ ريح: يمكنك تكرار الفعل نفسه مرتين.";
    } else if (face === "rain") {
      state.phase = "rain";
      state.notice = "🌧️ مطر: اختر أرضًا مروية لإضافة قسم خيزران.";
    } else if (face === "storm") {
      state.phase = "storm";
      state.notice = "⛈️ عاصفة: اختر أرضًا لينتقل الباندا إليها ويأكل.";
    } else if (face === "clouds") {
      state.phase = "improvement";
      state.notice = "☁️ غيوم: اختر تحسينًا تضعه على أرض بلا خيزران، أو احتفظ به.";
    } else if (face === "?") {
      state.phase = "weatherChoice";
      state.notice = "❓ طقس متغير: اختر الطقس الذي تريده.";
    }
    apiRef.log("الطقس: " + WEATHER[face].icon + " " + WEATHER[face].name + " — " + WEATHER[face].text, "accent");
    render();
    settle();
  }

  function chooseWeather(face) {
    if (!state || state.over || state.phase !== "weatherChoice") return false;
    if (!["sun", "rain", "wind", "storm", "clouds"].includes(face)) return false;
    applyWeather(face);
    return true;
  }

  function rainGrow(q, r) {
    if (!state || state.over || state.phase !== "rain") return false;
    const tile = tileAt(q, r);
    if (!tile || !tile.irrigated || tile.bamboo >= tile.capacity) return false;
    const added = addBamboo(tile, 1);
    if (!added) return false;
    apiRef.log("🌧️ نما " + ar(added) + " من الخيزران " + COLORS[tile.color].name + ".", "good");
    state.phase = "actions";
    state.notice = "أضاف المطر " + ar(added) + " قسمًا من الخيزران. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function skipRain() {
    if (!state || state.phase !== "rain") return false;
    state.phase = "actions";
    state.notice = "تجاهل المطر. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function stormMove(q, r) {
    if (!state || state.over || state.phase !== "storm") return false;
    if (!occupied(q, r)) return false;
    state.panda = { q, r };
    const tile = tileAt(q, r);
    let eaten = false;
    if (tile && tile.improvement !== "enclosure" && tile.bamboo > 0) {
      tile.bamboo -= 1;
      cur().bamboo[tile.color] += 1;
      eaten = true;
    }
    apiRef.log("⛈️ انتقل الباندا إلى الأرض المختارة" + (eaten ? " وأكل قسم خيزران." : "."), "warn");
    state.phase = "actions";
    state.notice = "العاصفة انتهت. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function skipStorm() {
    if (!state || state.phase !== "storm") return false;
    state.phase = "actions";
    state.notice = "تجاهل العاصفة. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function chooseImprovement(type) {
    if (!state || state.over || state.phase !== "improvement") return false;
    if (!IMPROVEMENTS[type] || state.improvementDeck[type] <= 0) return false;
    state.pendingImprovement = type;
    state.notice = "اختر أرضًا بلا خيزران لوضع " + IMPROVEMENTS[type].name + "، أو احتفظ به.";
    render();
    return true;
  }

  function placeImprovement(q, r) {
    if (!state || state.over) return false;
    const type = state.pendingImprovement;
    if (!type || !IMPROVEMENTS[type]) return false;
    const tile = tileAt(q, r);
    if (!tile || tile.bamboo > 0 || tile.improvement) return false;
    if (type === "watershed" && tile.irrigated) return false;
    tile.improvement = type;
    state.improvementDeck[type] = Math.max(0, state.improvementDeck[type] - 1);
    if (type === "watershed") {
      tile.irrigated = true;
      firstIrrigation(tile);
    }
    apiRef.log("وُضع " + IMPROVEMENTS[type].icon + " " + IMPROVEMENTS[type].name + " على أرض " + COLORS[tile.color].name + ".", "good");
    state.pendingImprovement = null;
    state.phase = "actions";
    state.notice = "وُضع التحسين. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function storeImprovement() {
    if (!state || state.phase !== "improvement" || !state.pendingImprovement) return false;
    const type = state.pendingImprovement;
    if (state.improvementDeck[type] <= 0) return false;
    state.improvementDeck[type] -= 1;
    cur().improvements.push(type);
    state.pendingImprovement = null;
    state.phase = "actions";
    apiRef.log("<strong>" + esc(cur().name) + "</strong> احتفظ بتحسين " + IMPROVEMENTS[type].name + ".", "accent");
    state.notice = "احتفظت بالتحسين. يمكنك وضعه لاحقًا دون أن يُحتسب كفعل.";
    render();
    settle();
    return true;
  }

  function skipImprovement() {
    if (!state || state.phase !== "improvement") return false;
    state.pendingImprovement = null;
    state.phase = "actions";
    state.notice = "تجاهلت تحسين الغيوم. ابدأ أفعالك.";
    render();
    settle();
    return true;
  }

  function useReserve(type) {
    if (!state || state.over || state.phase !== "actions") return false;
    const player = cur();
    const at = player.improvements.indexOf(type);
    if (at < 0) return false;
    if (!validImprovementCells(type).length) {
      apiRef.toast("لا توجد أرض مناسبة لوضع هذا التحسين.", "warn");
      return false;
    }
    state.reserveType = type;
    state.mode = "reserve";
    state.pendingImprovement = null;
    render();
    return true;
  }

  function placeReserve(q, r) {
    if (!state || state.over || state.mode !== "reserve" || !state.reserveType) return false;
    const tile = tileAt(q, r);
    const type = state.reserveType;
    if (!tile || tile.bamboo > 0 || tile.improvement) return false;
    if (type === "watershed" && tile.irrigated) return false;
    const player = cur();
    const at = player.improvements.indexOf(type);
    if (at < 0) return false;
    player.improvements.splice(at, 1);
    tile.improvement = type;
    if (type === "watershed") {
      tile.irrigated = true;
      firstIrrigation(tile);
    }
    apiRef.log("<strong>" + esc(player.name) + "</strong> وضع تحسين " + IMPROVEMENTS[type].name + " من لوحته.", "good");
    state.mode = null;
    state.reserveType = null;
    state.notice = "وُضع التحسين من لوحتك دون احتسابه كفعل.";
    render();
    return true;
  }

  /* ------------------------------ الأفعال ------------------------------ */

  function actionBlocked(type) {
    if (!state || state.over || state.phase !== "actions") return true;
    if (state.actionsLeft <= 0) return true;
    if (!canPick(cur())) return true;
    if (!state.allowRepeat && state.usedTypes.includes(type)) return true;
    return false;
  }

  function chooseAction(type) {
    if (actionBlocked(type)) {
      if (state && !state.allowRepeat && state.usedTypes.includes(type)) apiRef.toast("لا يمكن تكرار الفعل نفسه إلا مع الريح.", "warn");
      return false;
    }
    if (type === "plots") {
      if (!state.deck.length) { apiRef.toast("لا توجد قطع أرض متبقية.", "warn"); return false; }
      const count = Math.min(3, state.deck.length);
      state.pendingTiles = state.deck.splice(state.deck.length - count, count);
      state.selectedTile = null;
      state.mode = "plot";
      state.notice = "اسحب ٣ قطع، اختر واحدة، ثم اضغط خلية صالحة بجوار البركة أو بجوار قطعتين.";
      render();
      return true;
    }
    if (type === "irrigation") {
      if (!validIrrigationCells().length) { apiRef.toast("لا توجد أرض مجاورة لشبكة الرّي بحاجة إلى قناة.", "warn"); return false; }
      state.mode = "irrigation";
      state.notice = "اختر أرضًا غير مروية تجاور البركة أو أرضًا مروية.";
      render();
      return true;
    }
    if (type === "gardener") {
      if (!validGardenerTargets().length) { apiRef.toast("لا يمكن للبستاني التحرك الآن.", "warn"); return false; }
      state.mode = "gardener";
      state.notice = "اختر وجهة البستاني في خط مستقيم عبر قطع الأرض.";
      render();
      return true;
    }
    if (type === "panda") {
      if (!validPandaTargets().length) { apiRef.toast("لا يمكن للباندا التحرك الآن.", "warn"); return false; }
      state.mode = "panda";
      state.notice = "اختر وجهة الباندا في خط مستقيم عبر قطع الأرض.";
      render();
      return true;
    }
    if (type === "objectives") {
      if (cur().hand.length >= 5) { apiRef.toast("حد اليد خمس بطاقات. أكمل هدفًا أولًا.", "warn"); return false; }
      state.mode = "objective";
      state.notice = "اختر فئة الهدف الذي تريد سحبه.";
      render();
      return true;
    }
    return false;
  }

  function cancelMode() {
    if (!state || state.over) return;
    state.mode = null;
    state.pendingTiles = null;
    state.selectedTile = null;
    state.reserveType = null;
    state.phase = state.phase === "actions" ? "actions" : state.phase;
    render();
  }

  function selectPlot(index) {
    if (!state || state.mode !== "plot" || !state.pendingTiles) return false;
    state.selectedTile = index;
    render();
    return true;
  }

  function consumeAction(type) {
    if (!state.usedTypes.includes(type)) state.usedTypes.push(type);
    state.actionsLeft = Math.max(0, state.actionsLeft - 1);
    state.mode = null;
    state.pendingTiles = null;
    state.selectedTile = null;
    state.reserveType = null;
    render();
    if (state.actionsLeft <= 0) {
      state.notice = "استهلكت أفعالك. يمكنك تحقيق أهداف أو إنهاء الدور.";
    }
    if (cur().isCpu) scheduleAi(700);
  }

  function placePlot(q, r) {
    if (!state || state.over || state.mode !== "plot" || state.selectedTile == null) return false;
    const valid = validPlotCells().some((cell) => cell.q === q && cell.r === r);
    if (!valid) return false;
    const source = state.pendingTiles[state.selectedTile];
    if (!source) return false;
    const tile = {
      q, r,
      color: source.color,
      capacity: source.capacity,
      improvement: source.improvement || null,
      bamboo: 0,
      irrigated: false,
    };
    state.grid[key(q, r)] = tile;
    const leftover = state.pendingTiles.filter((_, index) => index !== state.selectedTile);
    state.deck = U.shuffle(state.deck.concat(leftover));
    const auto = neighbors(q, r).some((cell) => isPond(cell.q, cell.r)) || tile.improvement === "watershed";
    if (auto) {
      tile.irrigated = true;
      firstIrrigation(tile);
    }
    apiRef.log("<strong>" + esc(cur().name) + "</strong> وضع أرض " + COLORS[tile.color].name + " بسعة " + ar(tile.capacity) + (auto ? "، وهي مروية تلقائيًا." : "."), "good");
    state.notice = "وُضعت الأرض. يمكنك تحقيق أهداف أو اختيار فعل آخر.";
    consumeAction("plots");
    return true;
  }

  function irrigate(q, r) {
    if (!state || state.over || state.mode !== "irrigation") return false;
    const tile = tileAt(q, r);
    if (!tile || tile.irrigated) return false;
    const valid = neighbors(q, r).some((cell) => isPond(cell.q, cell.r) || (tileAt(cell.q, cell.r) && tileAt(cell.q, cell.r).irrigated));
    if (!valid) return false;
    tile.irrigated = true;
    const grown = firstIrrigation(tile);
    apiRef.log("مدّ <strong>" + esc(cur().name) + "</strong> قناة ريّ إلى أرض " + COLORS[tile.color].name + (grown ? " ونما أول قسم خيزران." : "."), "good");
    state.notice = "وصلت القناة. " + (grown ? "نما أول قسم خيزران." : "الأرض مروية.");
    consumeAction("irrigation");
    return true;
  }

  function moveGardener(q, r) {
    if (!state || state.over || state.mode !== "gardener") return false;
    if (!pathClear(state.gardener, { q, r })) return false;
    state.gardener = { q, r };
    const target = tileAt(q, r);
    let grown = 0;
    if (target) {
      if (target.irrigated) grown += addBamboo(target, 1);
      neighbors(q, r).forEach((cell) => {
        const other = tileAt(cell.q, cell.r);
        if (other && other.color === target.color && other.irrigated) grown += addBamboo(other, 1);
      });
    }
    apiRef.log("<strong>" + esc(cur().name) + "</strong> حرّك البستاني" + (grown ? " فنما " + ar(grown) + " من الخيزران." : "."), "accent");
    state.notice = grown ? "نما " + ar(grown) + " من الخيزران حول البستاني." : "تحرّك البستاني دون نمو جديد.";
    consumeAction("gardener");
    return true;
  }

  function movePanda(q, r) {
    if (!state || state.over || state.mode !== "panda") return false;
    if (!pathClear(state.panda, { q, r })) return false;
    state.panda = { q, r };
    const tile = tileAt(q, r);
    let ate = false;
    if (tile && tile.improvement !== "enclosure" && tile.bamboo > 0) {
      tile.bamboo -= 1;
      cur().bamboo[tile.color] += 1;
      ate = true;
    }
    apiRef.log("<strong>" + esc(cur().name) + "</strong> حرّك الباندا" + (ate ? " وأكل خيزران " + COLORS[tile.color].name + "." : "."), "accent");
    state.notice = ate ? "أكل الباندا قسمًا من الخيزران " + COLORS[tile.color].name + "." : "تحرّك الباندا دون أكل.";
    consumeAction("panda");
    return true;
  }

  function drawObjective(cat) {
    if (!state || state.over || state.mode !== "objective") return false;
    if (!["plot", "gardener", "panda"].includes(cat)) return false;
    if (cur().hand.length >= 5) { apiRef.toast("حد اليد خمس بطاقات.", "warn"); return false; }
    const deck = state.decks[cat];
    if (!deck || !deck.length) { apiRef.toast("نفدت أهداف هذه الفئة.", "warn"); return false; }
    const drawn = deck.pop();
    cur().hand.push(drawn);
    apiRef.log("<strong>" + esc(cur().name) + "</strong> سحب هدف " + (cat === "plot" ? "أرض" : cat === "gardener" ? "بستاني" : "باندا") + ": " + esc(cardLabel(drawn)), "accent");
    state.notice = "سحبت هدفًا جديدًا. يمكنك تحقيقه الآن إن تحققت شروطه.";
    consumeAction("objectives");
    return true;
  }

  function completeObjective(cardId) {
    if (!state || state.over) return false;
    const player = cur();
    const at = player.hand.findIndex((item) => item.id === cardId);
    if (at < 0) return false;
    const card = player.hand[at];
    if (!claimable(card, player)) return false;
    player.hand.splice(at, 1);
    player.completed.push(card);
    if (card.cat === "panda") {
      Object.keys(card.need).forEach((color) => {
        player.bamboo[color] -= card.need[color];
      });
    }
    const points = cardPoints(card);
    apiRef.log("<strong>" + esc(player.name) + "</strong> حقّق هدفًا (" + ar(points) + " نقاط): " + esc(cardLabel(card)), "good");
    state.notice = "تحقق هدف بقيمة " + ar(points) + " نقاط.";
    checkTrigger(player);
    render();
    if (player.isCpu) scheduleAi(600);
    return true;
  }

  function autoComplete(player) {
    if (!state || state.over || !player) return 0;
    let count = 0;
    for (let guard = 0; guard < 8; guard++) {
      const eligible = player.hand
        .filter((card) => claimable(card, player))
        .sort((a, b) => cardPoints(b) - cardPoints(a));
      if (!eligible.length) break;
      const card = eligible[0];
      const at = player.hand.indexOf(card);
      if (at < 0) break;
      player.hand.splice(at, 1);
      player.completed.push(card);
      if (card.cat === "panda") {
        Object.keys(card.need).forEach((color) => {
          player.bamboo[color] -= card.need[color];
        });
      }
      apiRef.log("<strong>" + esc(player.name) + "</strong> حقّق هدفًا (" + ar(cardPoints(card)) + " نقاط): " + esc(cardLabel(card)), "good");
      checkTrigger(player);
      count += 1;
    }
    return count;
  }

  /* ------------------------------ العرض ------------------------------ */

  function cellStyle(q, r) {
    const x = 1.5 * q;
    const y = SQRT3 * (r + q / 2);
    const left = ((x - MIN_X) / WIDTH_UNITS) * 100;
    const top = ((y - MIN_Y) / HEIGHT_UNITS) * 100;
    const width = (2 / WIDTH_UNITS) * 100;
    const height = (SQRT3 / HEIGHT_UNITS) * 100;
    return "left:" + left.toFixed(3) + "%;top:" + top.toFixed(3) + "%;width:" + width.toFixed(3) + "%;height:" + height.toFixed(3) + "%;";
  }

  function includesCell(list, q, r) {
    return list.some((cell) => cell.q === q && cell.r === r);
  }

  function targetCells() {
    if (!state) return [];
    if (state.phase === "rain") {
      return boardCells().filter((cell) => {
        const tile = tileAt(cell.q, cell.r);
        return tile && tile.irrigated && tile.bamboo < tile.capacity;
      });
    }
    if (state.phase === "storm") return boardCells().filter((cell) => occupied(cell.q, cell.r));
    if (state.phase === "improvement" && state.pendingImprovement) return validImprovementCells(state.pendingImprovement);
    if (state.mode === "plot" && state.selectedTile != null) return validPlotCells();
    if (state.mode === "irrigation") return validIrrigationCells();
    if (state.mode === "gardener") return validGardenerTargets();
    if (state.mode === "panda") return validPandaTargets();
    if (state.mode === "reserve" && state.reserveType) return validImprovementCells(state.reserveType);
    return [];
  }

  function stalkHtml(tile) {
    const items = [];
    for (let i = 0; i < tile.capacity; i++) {
      items.push('<i class="tk-stalk' + (i < tile.bamboo ? " is-full" : "") + '" style="--bc:' + COLORS[tile.color].color + '"></i>');
    }
    return '<span class="tk-stalks" aria-hidden="true">' + items.join("") + "</span>";
  }

  function cellHtml(cell) {
    const q = cell.q;
    const r = cell.r;
    const pond = isPond(q, r);
    const tile = tileAt(q, r);
    const targets = targetCells();
    const target = includesCell(targets, q, r);
    const classes = ["tk-hex"];
    let inner = "";
    if (pond) {
      classes.push("is-pond");
      inner = '<span class="tk-pond-mark">🌊</span>';
    } else if (tile) {
      classes.push("is-land", "is-" + tile.color);
      if (tile.irrigated) classes.push("is-irrigated");
      if (tile.improvement) classes.push("has-improvement");
      inner = '<span class="tk-tile-top">' + (tile.improvement ? IMPROVEMENTS[tile.improvement].icon : "") + "</span>" +
        stalkHtml(tile) +
        (tile.irrigated ? '<span class="tk-water-mark">💧</span>' : "");
    } else {
      classes.push("is-empty");
    }
    if (target) {
      classes.push("is-target");
      if (!pond && !tile) inner = '<span class="tk-target-mark">+</span>';
    }
    if (state.gardener.q === q && state.gardener.r === r) inner += '<span class="tk-token tk-gardener" aria-label="البستاني">🧑‍🌾</span>';
    if (state.panda.q === q && state.panda.r === r) inner += '<span class="tk-token tk-panda" aria-label="الباندا">🐼</span>';
    if (tile && tile.improvement) {
      inner += '<span class="tk-improvement" title="' + esc(IMPROVEMENTS[tile.improvement].name) + '">' + IMPROVEMENTS[tile.improvement].icon + "</span>";
    }
    return '<button type="button" class="' + classes.join(" ") + '" style="' + cellStyle(q, r) + '" ' +
      'data-tk-cell="' + q + "," + r + '" ' + (target ? "" : "disabled") + " " +
      'aria-label="' + (pond ? "البركة" : tile ? "أرض " + COLORS[tile.color].name + "، خيزران " + ar(tile.bamboo) : "خلية فارغة") + '">' +
      inner + "</button>";
  }

  function boardHtml() {
    return '<div class="tk-board">' + boardCells().map(cellHtml).join("") + "</div>";
  }

  function miniTile(source, index, selected) {
    return '<button type="button" class="tk-pick is-' + source.color + (selected ? " is-selected" : "") + '" data-tk-pick="' + index + '">' +
      '<span class="tk-pick-color"></span>' +
      '<strong>' + COLORS[source.color].name + "</strong>" +
      '<small>سعة ' + ar(source.capacity) + "</small>" +
      (source.improvement ? '<span class="tk-pick-imp">' + IMPROVEMENTS[source.improvement].icon + "</span>" : "") +
      "</button>";
  }

  function weatherPanel() {
    const weather = WEATHER[state.weather];
    return '<div class="xg-panel tk-weather">' +
      '<div class="xg-spread"><h3>' + (weather ? weather.icon + " " + weather.name : "🌱 الحديقة") + "</h3>" +
      '<span class="xg-chip">' + (state.phase === "actions" ? "أفعال متبقية: " + ar(state.actionsLeft) : "تأثير الطقس") + "</span></div>" +
      (weather ? '<p class="xg-note">' + esc(weather.text) + "</p>" : "") +
      (state.allowRepeat ? '<p class="xg-note">الريح تسمح بتكرار الفعل نفسه.</p>' : "") +
      "</div>";
  }

  function actionPanel() {
    if (state.phase === "over") return "";
    if (state.phase !== "actions") return weatherChoicePanel();
    const plotCells = validPlotCells();
    const actions = [
      { id: "plots", icon: "🗺️", name: "قطعة أرض", hint: "اسحب ٣ واختر واحدة", available: state.deck.length > 0 && plotCells.length > 0 },
      { id: "irrigation", icon: "💧", name: "قناة ريّ", hint: "صِل أرضًا بالشبكة", available: validIrrigationCells().length > 0 },
      { id: "gardener", icon: "🧑‍🌾", name: "البستاني", hint: "حرّك البستاني لينمو الخيزران", available: validGardenerTargets().length > 0 },
      { id: "panda", icon: "🐼", name: "الباندا", hint: "حرّك الباندا ليأكل", available: validPandaTargets().length > 0 },
      { id: "objectives", icon: "🎴", name: "هدف جديد", hint: "اسحب هدفًا من فئة تختارها", available: cur().hand.length < 5 },
    ];
    return '<div class="xg-panel tk-actions">' +
      '<div class="xg-spread"><h3>الأفعال</h3><span class="xg-chip ' + (state.actionsLeft > 0 ? "is-live" : "") + '">' + ar(state.actionsLeft) + " من " + ar(state.weather === "sun" ? 3 : 2) + "</span></div>" +
      '<div class="tk-action-grid">' + actions.map((action) => {
        const blocked = actionBlocked(action.id) || !action.available;
        const used = state.usedTypes.includes(action.id) && !state.allowRepeat;
        return '<button type="button" class="tk-action' + (used ? " is-used" : "") + '" data-tk-action="' + action.id + '" ' + (blocked ? "disabled" : "") + ">" +
          '<span class="tk-action-icon">' + action.icon + "</span>" +
          '<strong>' + action.name + "</strong><small>" + action.hint + "</small>" +
          (used ? '<span class="tk-action-used">استُخدم</span>' : "") +
          "</button>";
      }).join("") + "</div>" +
      '<div class="xg-row tk-end-row"><button type="button" class="xg-btn primary" data-tk-end>أنهِ الدور</button>' +
      '<span class="xg-note">يمكنك تحقيق أي هدف جاهز قبل إنهاء الدور.</span></div>' +
      modePanel() +
      "</div>";
  }

  function modePanel() {
    if (state.mode === "plot") {
      const tiles = state.pendingTiles || [];
      return '<div class="tk-mode">' +
        '<div class="xg-spread"><strong>اختر قطعة الأرض</strong><button type="button" class="xg-btn tk-mini-btn" data-tk-cancel>إلغاء</button></div>' +
        '<div class="tk-picks">' + tiles.map((tile, index) => miniTile(tile, index, state.selectedTile === index)).join("") + "</div>" +
        (state.selectedTile == null ? '<p class="xg-note">اختر واحدة من القطع الثلاث.</p>' : '<p class="xg-note">اضغط خلية مميزة على اللوحة لوضع القطعة.</p>') +
        "</div>";
    }
    if (state.mode === "objective") {
      const counts = {
        plot: state.decks.plot.length,
        gardener: state.decks.gardener.length,
        panda: state.decks.panda.length,
      };
      return '<div class="tk-mode">' +
        '<div class="xg-spread"><strong>اختر فئة الهدف</strong><button type="button" class="xg-btn tk-mini-btn" data-tk-cancel>إلغاء</button></div>' +
        '<div class="tk-draw-row">' +
        '<button type="button" class="tk-draw is-plot" data-tk-draw="plot" ' + (!counts.plot ? "disabled" : "") + '><span>🗺️</span><strong>أرض</strong><small>' + ar(counts.plot) + " متبقٍ</small></button>" +
        '<button type="button" class="tk-draw is-gardener" data-tk-draw="gardener" ' + (!counts.gardener ? "disabled" : "") + '><span>🧑‍🌾</span><strong>بستاني</strong><small>' + ar(counts.gardener) + " متبقٍ</small></button>" +
        '<button type="button" class="tk-draw is-panda" data-tk-draw="panda" ' + (!counts.panda ? "disabled" : "") + '><span>🐼</span><strong>باندا</strong><small>' + ar(counts.panda) + " متبقٍ</small></button>" +
        "</div></div>";
    }
    if (state.mode === "reserve") {
      return '<div class="tk-mode"><div class="xg-spread"><strong>ضع ' + IMPROVEMENTS[state.reserveType].name + " من لوحتك</strong>" +
        '<button type="button" class="xg-btn tk-mini-btn" data-tk-cancel>إلغاء</button></div>' +
        '<p class="xg-note">اضغط خلية أرض بلا خيزران لوضع التحسين. هذا لا يُحتسب كفعل.</p></div>';
    }
    if (state.mode) {
      return '<div class="tk-mode"><div class="xg-spread"><strong>' + esc(state.notice) + "</strong>" +
        '<button type="button" class="xg-btn tk-mini-btn" data-tk-cancel>إلغاء</button></div></div>';
    }
    return "";
  }

  function weatherChoicePanel() {
    if (state.phase === "rain") {
      return '<div class="xg-panel tk-choice"><div class="xg-spread"><h3>🌧️ المطر</h3><span class="xg-chip">اختر أرضًا مميزة</span></div>' +
        '<p class="xg-note">اضغط أرضًا مروية لم تبلغ سعتها القصوى لإضافة قسم خيزران، أو تخطَّ التأثير.</p>' +
        '<button type="button" class="xg-btn" data-tk-skip-rain>تخطي المطر</button></div>';
    }
    if (state.phase === "storm") {
      return '<div class="xg-panel tk-choice"><div class="xg-spread"><h3>⛈️ العاصفة</h3><span class="xg-chip">حرّك الباندا</span></div>' +
        '<p class="xg-note">اضغط أي أرض لينتقل الباندا إليها ويأكل قسمًا إن أمكن. السياج يمنع الأكل.</p>' +
        '<button type="button" class="xg-btn" data-tk-skip-storm>تخطي العاصفة</button></div>';
    }
    if (state.phase === "improvement") {
      if (state.pendingImprovement) {
        const type = state.pendingImprovement;
        return '<div class="xg-panel tk-choice"><div class="xg-spread"><h3>' + IMPROVEMENTS[type].icon + " " + IMPROVEMENTS[type].name + "</h3>" +
          '<span class="xg-chip">' + ar(state.improvementDeck[type]) + " متبقٍ</span></div>" +
          '<p class="xg-note">اضغط خلية أرض بلا خيزران لوضعه. أو احتفظ به للاستخدام لاحقًا.</p>' +
          '<div class="xg-row"><button type="button" class="xg-btn" data-tk-store>احتفظ به</button>' +
          '<button type="button" class="xg-btn" data-tk-skip-improve>تجاهل</button></div></div>';
      }
      return '<div class="xg-panel tk-choice"><div class="xg-spread"><h3>☁️ الغيوم</h3><span class="xg-chip">تحسين مجاني</span></div>' +
        '<p class="xg-note">اختر تحسينًا. يمكن وضعه على أرض بلا خيزران أو الاحتفاظ به على لوحتك.</p>' +
        '<div class="tk-imp-row">' + Object.keys(IMPROVEMENTS).map((type) => {
          const item = IMPROVEMENTS[type];
          return '<button type="button" class="tk-imp-btn" data-tk-imp="' + type + '" ' + (state.improvementDeck[type] <= 0 ? "disabled" : "") + ">" +
            '<span>' + item.icon + "</span><strong>" + item.name + "</strong><small>" + ar(state.improvementDeck[type]) + " متبقٍ</small></button>";
        }).join("") + "</div>" +
        '<button type="button" class="xg-btn" data-tk-skip-improve>تجاهل الغيوم</button></div>';
    }
    if (state.phase === "weatherChoice") {
      return '<div class="xg-panel tk-choice"><div class="xg-spread"><h3>❓ اختر الطقس</h3><span class="xg-chip">بدل النرد</span></div>' +
        '<div class="tk-weather-row">' + ["sun", "rain", "wind", "storm", "clouds"].map((face) =>
          '<button type="button" class="tk-weather-btn" data-tk-weather="' + face + '"><span>' + WEATHER[face].icon + "</span><strong>" + WEATHER[face].name + "</strong></button>"
        ).join("") + "</div></div>";
    }
    return actionPanel();
  }

  function cardHtml(item) {
    const can = claimable(item, cur());
    const category = item.cat === "plot" ? "أرض" : item.cat === "gardener" ? "بستاني" : "باندا";
    return '<article class="tk-card is-' + item.cat + (item.cat === "plot" ? " is-" + item.color : "") + '">' +
      '<div class="tk-card-head"><span class="tk-card-cat">' + category + "</span><span class=\"tk-card-pts\">" + ar(cardPoints(item)) + "</span></div>" +
      '<p class="tk-card-label">' + esc(cardLabel(item)) + "</p>" +
      '<button type="button" class="tk-complete" data-tk-complete="' + item.id + '" ' + (can ? "" : "disabled") + ">" +
      (can ? "تحقيق الهدف" : "الشروط غير مكتملة") + "</button></article>";
  }

  function handPanel() {
    const player = cur();
    return '<div class="xg-panel tk-hand-panel">' +
      '<div class="xg-spread"><h3>أهداف ' + esc(player.name) + "</h3>" +
      '<span class="xg-chip">' + ar(player.hand.length) + " / ٥ في اليد</span></div>" +
      '<div class="tk-hand">' + (player.hand.length ? player.hand.map(cardHtml).join("") : '<p class="xg-note">لا أهداف في اليد. اسحب هدفًا بفعل مستقل.</p>') + "</div></div>";
  }

  function playerMat(player) {
    const active = player.index === state.current;
    return '<article class="tk-player' + (active ? " is-current" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="xg-avatar">' + ar(player.index + 1) + "</span><strong>" + esc(player.name) + "</strong></span>" +
      '<span class="tk-player-score">' + ar(playerScore(player)) + " نقطة</span></div>" +
      '<div class="tk-player-stats"><span>🎴 ' + ar(player.completed.length) + " هدف</span><span>🖐️ " + ar(player.hand.length) + "</span>" +
      (state.emperorHolder === player.index ? '<span class="tk-emperor">👑 إمبراطور</span>' : "") + "</div>" +
      '<div class="tk-bamboo-row">' + ["green", "yellow", "pink"].map((color) =>
        '<span class="tk-bamboo-chip" style="--bc:' + COLORS[color].color + '">' + ar(player.bamboo[color]) + "</span>"
      ).join("") + (player.improvements.length ? '<span class="tk-reserve-chip">🛠️ ' + ar(player.improvements.length) + "</span>" : "") + "</div>" +
      (player.improvements.length ? '<div class="tk-reserve-row">' + player.improvements.map((type, index) =>
        active ? '<button type="button" class="tk-reserve-btn" data-tk-reserve="' + type + '" data-tk-reserve-index="' + index + '">' + IMPROVEMENTS[type].icon + " " + IMPROVEMENTS[type].name + "</button>" : ""
      ).join("") + "</div>" : "") +
      "</article>";
  }

  function playersPanel() {
    return '<div class="xg-panel"><div class="xg-spread"><h3>اللاعبون</h3><span class="xg-chip">' + ar(state.players.length) + " لاعبين</span></div>" +
      '<div class="tk-players">' + state.players.map(playerMat).join("") + "</div></div>";
  }

  function sidePanel() {
    const player = cur();
    return '<aside class="tk-side">' +
      '<div class="xg-panel"><h3>مفتاح الحديقة</h3>' +
      '<div class="tk-key"><span class="tk-key-hex is-green"></span> أرض خضراء</div>' +
      '<div class="tk-key"><span class="tk-key-hex is-yellow"></span> أرض صفراء</div>' +
      '<div class="tk-key"><span class="tk-key-hex is-pink"></span> أرض وردية</div>' +
      '<div class="tk-key"><span class="tk-key-drop">💧</span> أرض مروية</div>' +
      '<div class="tk-key"><span class="tk-key-bar"></span> أقسام الخيزران (السعة)</div>' +
      "</div>" +
      '<div class="xg-panel"><h3>التحسينات</h3>' + Object.keys(IMPROVEMENTS).map((type) => {
        const item = IMPROVEMENTS[type];
        return '<p class="xg-note"><strong>' + item.icon + " " + item.name + ":</strong> " + esc(item.text) + " <span class=\"tk-muted\">(" + ar(state.improvementDeck[type]) + " في الاحتياط)</span></p>";
      }).join("") + "</div>" +
      '<div class="xg-panel"><h3>النهاية</h3><p class="xg-note">تنتهي اللعبة عندما يكمل لاعب ' + ar(threshold()) + ' أهداف حسب عدد اللاعبين، ثم يأخذ بطاقة الإمبراطور (+٢) ويحصل كل لاعب على دور أخير.</p>' +
      '<p class="xg-note">الأهداف المحققة فقط تُحتسب. التعادل يحسمه مجموع نقاط أهداف الباندا.</p></div>' +
      '<div class="xg-panel"><h3>أهدافك المحققة</h3>' +
      (player.completed.length
        ? '<div class="tk-completed-list">' + player.completed.map((item) => '<span class="tk-completed" title="' + esc(cardLabel(item)) + '">' + (item.cat === "plot" ? "🗺️" : item.cat === "gardener" ? "🧑‍🌾" : "🐼") + " +" + ar(cardPoints(item)) + "</span>").join("") + "</div>"
        : '<p class="xg-note">لم تحقق أهدافًا بعد.</p>') +
      "</div>" +
      "</aside>";
  }

  function render() {
    if (!rootRef || !state) return;
    const seen = state.players[viewSeat()] || cur();
    rootRef.innerHTML =
      '<div class="xg tk">' +
      XG.bar("تاكينوكو", "حديقة الخيزران الإمبراطورية · باندا وبستاني وأهداف", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("النقاط", ar(playerScore(seen)), "is-good"),
        XG.chip("الأهداف", ar(seen.completed.length) + " / " + ar(threshold())),
        XG.chip("الطقس", state.weather === "none" ? "—" : WEATHER[state.weather].icon + " " + WEATHER[state.weather].name),
      ].join("")) +
      '<div class="tk-layout"><div class="tk-main">' +
      weatherPanel() +
      actionPanel() +
      '<div class="xg-panel tk-board-panel"><div class="xg-spread"><h3>الحديقة</h3>' +
      '<span class="xg-chip">' + ar(state.deck.length) + " قطعة أرض في الرزمة</span></div>" +
      boardHtml() + "</div>" +
      handPanel() +
      playersPanel() +
      '<p class="tk-last">' + esc(state.notice) + "</p>" +
      "</div>" + sidePanel() + "</div></div>";
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function growthAt(q, r) {
    const tile = tileAt(q, r);
    if (!tile || !tile.irrigated) return 0;
    let grown = 0;
    const factor = tile.improvement === "fertilizer" ? 2 : 1;
    grown += Math.min(tile.capacity - tile.bamboo, factor);
    neighbors(q, r).forEach((cell) => {
      const other = tileAt(cell.q, cell.r);
      if (other && other.color === tile.color && other.irrigated) {
        const otherFactor = other.improvement === "fertilizer" ? 2 : 1;
        grown += Math.min(other.capacity - other.bamboo, otherFactor);
      }
    });
    return grown;
  }

  function scheduleAi(delay) {
    clearTimeout(timer);
    if (!state || state.over) return;
    if (!cur() || !cur().isCpu) return;
    timer = setTimeout(aiStep, delay || AI.delay(cur().level, 0.8));
  }

  function settle() {
    if (!state || state.over) return;
    if (!cur() || !cur().isCpu) return;
    if (!["actions", "rain", "storm", "improvement", "weatherChoice"].includes(state.phase)) return;
    scheduleAi(600);
  }

  function aiStep() {
    if (!state || state.over) return;
    const player = cur();
    if (!player || !player.isCpu) return;
    if (state.phase === "rain") { aiRain(); return; }
    if (state.phase === "storm") { aiStorm(); return; }
    if (state.phase === "improvement") { aiImprovement(); return; }
    if (state.phase === "weatherChoice") {
      chooseWeather(U.pick(["sun", "rain", "wind", "storm", "clouds"]));
      return;
    }
    if (state.phase === "actions") { aiActions(); return; }
  }

  function aiRain() {
    const cells = boardCells().filter((cell) => {
      const tile = tileAt(cell.q, cell.r);
      return tile && tile.irrigated && tile.bamboo < tile.capacity;
    }).sort((a, b) => {
      const ta = tileAt(a.q, a.r);
      const tb = tileAt(b.q, b.r);
      return (tb.capacity - tb.bamboo) - (ta.capacity - ta.bamboo);
    });
    if (!cells.length || !rainGrow(cells[0].q, cells[0].r)) skipRain();
  }

  function aiStorm() {
    const cells = boardCells().filter((cell) => {
      const tile = tileAt(cell.q, cell.r);
      return tile && tile.bamboo > 0 && tile.improvement !== "enclosure";
    }).sort((a, b) => tileAt(b.q, b.r).bamboo - tileAt(a.q, a.r).bamboo);
    if (!cells.length || !stormMove(cells[0].q, cells[0].r)) skipStorm();
  }

  function aiImprovement() {
    if (state.pendingImprovement) {
      const cells = validImprovementCells(state.pendingImprovement);
      if (cells.length) {
        const best = cells.slice().sort((a, b) => {
          const ta = tileAt(a.q, a.r);
          const tb = tileAt(b.q, b.r);
          return tb.capacity - ta.capacity;
        })[0];
        if (placeImprovement(best.q, best.r)) return;
      }
      if (storeImprovement()) return;
      skipImprovement();
      return;
    }
    const available = Object.keys(IMPROVEMENTS).filter((type) => state.improvementDeck[type] > 0);
    if (!available.length) { skipImprovement(); return; }
    const preferred = available.includes("fertilizer") ? "fertilizer" : available[0];
    if (!chooseImprovement(preferred)) { skipImprovement(); return; }
    const cells = validImprovementCells(preferred);
    if (cells.length) {
      const best = cells.slice().sort((a, b) => {
        const ta = tileAt(a.q, a.r);
        const tb = tileAt(b.q, b.r);
        return tb.capacity - ta.capacity;
      })[0];
      if (placeImprovement(best.q, best.r)) return;
    }
    if (storeImprovement()) return;
    skipImprovement();
  }

  function aiChoosePlotTile() {
    if (!state.pendingTiles) return 0;
    let bestIndex = 0;
    let bestScore = -1;
    state.pendingTiles.forEach((tile, index) => {
      let demand = 0;
      cur().hand.forEach((card) => {
        if (card.cat === "plot" && card.color === tile.color) demand += 2;
        if (card.cat === "gardener" && card.color === tile.color) demand += 2;
        if (card.cat === "panda" && card.need && card.need[tile.color]) demand += 2;
      });
      const score = demand + tile.capacity * 0.4 + Math.random();
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    return bestIndex;
  }

  function aiChoosePlotCell() {
    const cells = validPlotCells();
    if (!cells.length) return null;
    return cells.slice().sort((a, b) => {
      const score = (cell) => {
        let value = Math.random();
        const near = neighbors(cell.q, cell.r);
        if (near.some((n) => isPond(n.q, n.r))) value += 3;
        value += near.filter((n) => !!tileAt(n.q, n.r)).length * 1.2;
        return value;
      };
      return score(b) - score(a);
    })[0];
  }

  function aiPerform(type) {
    if (type === "plots") {
      if (!chooseAction("plots")) return false;
      const index = aiChoosePlotTile();
      if (!selectPlot(index)) { cancelMode(); return false; }
      const cell = aiChoosePlotCell();
      if (!cell) { cancelMode(); return false; }
      return placePlot(cell.q, cell.r);
    }
    if (type === "irrigation") {
      if (!chooseAction("irrigation")) return false;
      const cells = validIrrigationCells();
      if (!cells.length) { cancelMode(); return false; }
      const cell = cells[Math.floor(Math.random() * cells.length)];
      return irrigate(cell.q, cell.r);
    }
    if (type === "gardener") {
      if (!chooseAction("gardener")) return false;
      const targets = validGardenerTargets().slice().sort((a, b) => growthAt(b.q, b.r) - growthAt(a.q, a.r));
      if (!targets.length) { cancelMode(); return false; }
      return moveGardener(targets[0].q, targets[0].r);
    }
    if (type === "panda") {
      if (!chooseAction("panda")) return false;
      const targets = validPandaTargets().slice().sort((a, b) => {
        const ta = tileAt(a.q, a.r);
        const tb = tileAt(b.q, b.r);
        const score = (tile) => {
          if (!tile || tile.improvement === "enclosure" || tile.bamboo <= 0) return Math.random();
          return 10 + tile.bamboo;
        };
        return score(tb) - score(ta);
      });
      if (!targets.length) { cancelMode(); return false; }
      return movePanda(targets[0].q, targets[0].r);
    }
    if (type === "objectives") {
      if (!chooseAction("objectives")) return false;
      const available = ["plot", "gardener", "panda"].filter((cat) => state.decks[cat].length);
      if (!available.length) { cancelMode(); return false; }
      return drawObjective(U.pick(available));
    }
    return false;
  }

  function aiActions() {
    if (!state || state.over || state.phase !== "actions") return;
    const player = cur();
    if (!player || !player.isCpu) return;
    autoComplete(player);
    if (!state || state.over || state.phase !== "actions") return;
    if (state.actionsLeft <= 0) { endTurn(); return; }
    const used = state.allowRepeat ? [] : state.usedTypes;
    const options = [];
    const add = (type, weight) => {
      if (used.includes(type)) return;
      options.push({ type, weight });
    };
    if (state.deck.length && validPlotCells().length) add("plots", Object.keys(state.grid).length < 6 ? 1.6 : 1);
    if (validIrrigationCells().length) add("irrigation", 1.2);
    if (validGardenerTargets().length) add("gardener", 1.5);
    if (validPandaTargets().some((cell) => {
      const tile = tileAt(cell.q, cell.r);
      return tile && tile.bamboo > 0 && tile.improvement !== "enclosure";
    })) add("panda", 1.4);
    if (player.hand.length < 5 && (state.decks.plot.length || state.decks.gardener.length || state.decks.panda.length)) add("objectives", 1.3);
    if (!options.length) { endTurn(); return; }
    const total = options.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    let chosen = options[options.length - 1].type;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) { chosen = option.type; break; }
    }
    if (!aiPerform(chosen)) {
      const alternate = options.filter((item) => item.type !== chosen);
      let done = false;
      for (const option of alternate) {
        if (aiPerform(option.type)) { done = true; break; }
      }
      if (!done) endTurn();
    }
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleCell(q, r) {
    if (!state || state.over) return;
    if (state.phase === "rain") { rainGrow(q, r); return; }
    if (state.phase === "storm") { stormMove(q, r); return; }
    if (state.phase === "improvement" && state.pendingImprovement) { placeImprovement(q, r); return; }
    if (state.mode === "plot") { placePlot(q, r); return; }
    if (state.mode === "irrigation") { irrigate(q, r); return; }
    if (state.mode === "gardener") { moveGardener(q, r); return; }
    if (state.mode === "panda") { movePanda(q, r); return; }
    if (state.mode === "reserve") { placeReserve(q, r); }
  }

  function onClick(event) {
    if (!state || state.over) return;
    const cell = event.target.closest("[data-tk-cell]");
    if (cell) {
      const parts = cell.dataset.tkCell.split(",");
      handleCell(Number(parts[0]), Number(parts[1]));
      return;
    }
    const action = event.target.closest("[data-tk-action]");
    if (action) { chooseAction(action.dataset.tkAction); return; }
    if (event.target.closest("[data-tk-end]")) { endTurn(); return; }
    if (event.target.closest("[data-tk-cancel]")) { cancelMode(); return; }
    const pick = event.target.closest("[data-tk-pick]");
    if (pick) { selectPlot(Number(pick.dataset.tkPick)); return; }
    const draw = event.target.closest("[data-tk-draw]");
    if (draw) { drawObjective(draw.dataset.tkDraw); return; }
    const complete = event.target.closest("[data-tk-complete]");
    if (complete) { completeObjective(complete.dataset.tkComplete); return; }
    const imp = event.target.closest("[data-tk-imp]");
    if (imp) { chooseImprovement(imp.dataset.tkImp); return; }
    if (event.target.closest("[data-tk-store]")) { storeImprovement(); return; }
    if (event.target.closest("[data-tk-skip-improve]")) { skipImprovement(); return; }
    if (event.target.closest("[data-tk-skip-rain]")) { skipRain(); return; }
    if (event.target.closest("[data-tk-skip-storm]")) { skipStorm(); return; }
    const weather = event.target.closest("[data-tk-weather]");
    if (weather) { chooseWeather(weather.dataset.tkWeather); return; }
    const reserve = event.target.closest("[data-tk-reserve]");
    if (reserve) { useReserve(reserve.dataset.tkReserve); }
  }

  const game = {
    id: "takenoko",
    name: "تاكينوكو",
    en: "TAKENOKO",
    icon: "🐼",
    accent: "#6f9b6e",
    cardClass: "card-takenoko",
    tagline: "حديقة خيزران إمبراطورية: انمِ الخيزران بالبستاني، أطعم الباندا، وحقّق الأهداف قبل الجميع.",
    players: "2–4",
    duration: "45–60 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: ٢٨ قطعة أرض، ٤٦ بطاقة هدف، باندا وبستاني، طقس، ريّ وتحسينات.",
      defaults: {},
      fields: [],
      summary() { return "٢٨ أرضًا · باندا وبستاني · ٤٦ هدفًا"; },
    },

    rules: {
      goal: "اجمع نقاط الأهداف المكتملة، وحقّق العدد المطلوب لبدء الجولة الأخيرة قبل خصومك.",
      facts: [["اللاعبون", "٢–٤"], ["الأرض", "٢٨ قطعة"], ["الأهداف", "٤٦ بطاقة"], ["النهاية", "٩ / ٨ / ٧ أهداف"]],
      components: [
        "٢٨ قطعة أرض سداسية: ١١ خضراء، ١٠ صفراء، ٧ وردية.",
        "البركة المركزية، البستاني، الباندا، ونرد الطقس.",
        "٤٦ بطاقة هدف: أرض وبستاني وباندا، مع بطاقة الإمبراطور.",
        "٢٠ قناة ريّ و٩ تحسينات: سياج، سماد، مورد ماء.",
      ],
      setup: [
        "توضع البركة في المركز ويقف البستاني والباندا عليها.",
        "تُخلط ٢٨ قطعة أرض وتُكوّن رزمة، وتوضع القنوات والتحسينات في الاحتياط.",
        "يبدأ كل لاعب بثلاثة أهداف: واحد من كل فئة، وبحد أقصى خمسة في اليد.",
      ],
      steps: [
        "<strong>الطقس:</strong> ابتداءً من الجولة الثانية، تظهر الشمس (فعل إضافي)، المطر (نمو)، الريح (تكرار الفعل)، العاصفة (تحريك الباندا) أو الغيوم (تحسين).",
        "<strong>الأفعال:</strong> نفّذ فعلين مختلفين من: وضع أرض، مدّ قناة ريّ، تحريك البستاني، تحريك الباندا، أو سحب هدف.",
        "<strong>الأرض:</strong> اسحب ٣ قطع واختر واحدة. توضع بجوار البركة أو بجوار قطعتين، وتُروى تلقائيًا إن جاورت البركة.",
        "<strong>البستاني:</strong> يتحرك في خط مستقيم عبر الأرض، ويُنمّي الخيزران على أرضه وعلى المجاورات من اللون نفسه إن كانت مروية.",
        "<strong>الباندا:</strong> يتحرك في خط مستقيم ويأكل قسم خيزران من الأرض التي يتوقف عليها، ما لم يكن عليها سياج.",
        "<strong>الأهداف:</strong> يمكن تحقيق أي هدف تحققت شروطه في أي وقت من دورك دون أن يُحتسب كفعل. أهداف الباندا تستهلك الخيزران المجموع.",
        "<strong>النهاية:</strong> أول لاعب يكمل ٩/٨/٧ أهداف (حسب عدد اللاعبين) يأخذ الإمبراطور (+٢)، ثم يأخذ كل لاعب دورًا أخيرًا.",
      ],
      winning: "أعلى مجموع نقاط من الأهداف المكتملة. التعادل يحسمه مجموع نقاط أهداف الباندا، ثم عدد الأهداف.",
      notes: [
        "الأرض المروية هي فقط التي ينمو عليها الخيزران.",
        "السماد يضاعف النمو، والسياج يمنع الباندا، ومورد الماء يسقي الأرض تلقائيًا.",
        "أقصى ارتفاع للخيزران أربعة أقسام، والسعة تختلف من أرض لأخرى.",
        "التحسينات لا توضع على أرض فيها خيزران، والتحسين المحتفظ به لا يُحتسب كفعل.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      timer = null;
      cardSeq = 0;
      state = newState();
      apiRef.log("بدأت تاكينوكو مع " + ar(state.players.length) + " لاعبين. الحديقة تنتظر أول قطعة أرض.", "accent");
      apiRef.setStatus("بداية تاكينوكو");
      rootRef.addEventListener("click", onClick);
      beginTurn(0);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          boardCells,
          tileAt,
          validPlotCells,
          validIrrigationCells,
          validGardenerTargets,
          validPandaTargets,
          validImprovementCells,
          chooseAction,
          cancelMode,
          selectPlot,
          placePlot,
          irrigate,
          moveGardener,
          movePanda,
          drawObjective,
          completeObjective,
          autoComplete,
          chooseImprovement,
          placeImprovement,
          storeImprovement,
          skipImprovement,
          useReserve,
          chooseWeather,
          rainGrow,
          stormMove,
          endTurn,
          beginTurn,
          claimable,
          cardPoints,
          cardLabel,
          playerScore,
          threshold,
          growthAt,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
          },
          addTile(q, r, color, capacity, opts) {
            if (!state) return false;
            const tile = {
              q, r,
              color: color || "green",
              capacity: U.clamp(Number(capacity) || 3, 1, 4),
              improvement: opts && opts.improvement ? opts.improvement : null,
              bamboo: opts && opts.bamboo ? Number(opts.bamboo) : 0,
              irrigated: !!(opts && opts.irrigated),
            };
            state.grid[key(q, r)] = tile;
            render();
            return tile;
          },
          forceBamboo(q, r, count) {
            const tile = tileAt(q, r);
            if (!tile) return false;
            tile.bamboo = U.clamp(Number(count) || 0, 0, tile.capacity);
            render();
            return true;
          },
          giveBamboo(color, count) {
            cur().bamboo[color] = (cur().bamboo[color] || 0) + (Number(count) || 0);
            render();
          },
          forceWeather(face) { applyWeather(face); },
          aiActions,
          aiStep,
        };
      }

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
