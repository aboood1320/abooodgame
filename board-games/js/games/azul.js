/* ==========================================================================
   أزول — مصانع البلاط
   5 ألوان، 5 مصانع + المركز، خطوط نقش، جدار 5×5، وعقوبة الأرض.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const COLORS = ["#4f8fb0", "#d7b451", "#c25f57", "#3f4957", "#e7e2d1"];
  const NAMES = ["أزرق", "أصفر", "أحمر", "أسود", "أبيض"];
  const WALL = [
    [0, 1, 2, 3, 4],
    [1, 2, 3, 4, 0],
    [2, 3, 4, 0, 1],
    [3, 4, 0, 1, 2],
    [4, 0, 1, 2, 3],
  ];
  const FLOOR_PENALTY = [0, 1, 1, 2, 2, 3, 3, 4];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makeBag() {
    const bag = [];
    for (let color = 0; color < 5; color++) {
      for (let i = 0; i < 20; i++) bag.push(color);
    }
    return U.shuffle(bag);
  }

  function makePlayers() {
    return XG.players(apiRef, 4, ["#6f9bb0", "#c9a45c", "#c77c64", "#8a7dbb"]).slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length))).map((player) => {
      player.pattern = Array.from({ length: 5 }, () => ({ color: null, count: 0 }));
      player.wall = Array.from({ length: 5 }, () => Array(5).fill(null));
      player.floor = [];
      player.score = 0;
      player.firstToken = false;
      return player;
    });
  }

  function newState() {
    const players = makePlayers();
    const bag = makeBag();
    const factories = Array.from({ length: 5 }, () => []);
    factories.forEach((factory) => {
      for (let i = 0; i < 4; i++) factory.push(bag.pop());
    });
    return {
      players,
      bag,
      discard: [],
      factories,
      center: [],
      centerFirst: false,
      current: 0,
      firstPlayer: 0,
      phase: "pick",
      pending: null,
      notice: "اختر لونًا من مصنع أو من المركز، ثم اختر خط نقش.",
      last: null,
      over: false,
      winner: null,
      round: 1,
    };
  }

  function cur() { return state.players[state.current]; }

  function wallCol(row, color) { return (color - row + 5) % 5; }

  function canPlaceWall(player, row, color) {
    return player.wall[row][wallCol(row, color)] == null;
  }

  function legalLines(player, color) {
    const rows = [];
    for (let row = 0; row < 5; row++) {
      if (player.pattern[row].count >= row + 1) continue;
      if (player.pattern[row].color != null && player.pattern[row].color !== color) continue;
      if (!canPlaceWall(player, row, color)) continue;
      rows.push(row);
    }
    return rows;
  }

  function drawFromBag(n) {
    const out = [];
    while (out.length < n) {
      if (!state.bag.length) {
        state.bag = U.shuffle(state.discard);
        state.discard = [];
      }
      if (!state.bag.length) state.bag = U.shuffle(makeBag());
      out.push(state.bag.pop());
    }
    return out;
  }

  function take(source, index, color) {
    if (!state || state.over || state.phase !== "pick") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    let tiles = [];
    if (source === "factory") {
      const factory = state.factories[index];
      if (!factory || !factory.includes(color)) return false;
      tiles = factory.filter((tile) => tile === color);
      const rest = factory.filter((tile) => tile !== color);
      state.factories[index] = [];
      state.center.push(...rest);
    } else {
      tiles = state.center.filter((tile) => tile === color);
      if (!tiles.length) return false;
      state.center = state.center.filter((tile) => tile !== color);
      if (!state.centerFirst) {
        state.centerFirst = true;
        state.firstPlayer = state.current;
        cur().firstToken = true;
      }
    }
    state.pending = { color, count: tiles.length, source };
    state.phase = "place";
    state.notice = "أخذت " + ar(tiles.length) + " بلاطات " + NAMES[color] + ". اختر خط نقش أو الأرض.";
    apiRef.log("<strong>" + esc(cur().name) + "</strong> أخذ " + ar(tiles.length) + " بلاطات " + esc(NAMES[color]) + ".", "accent");
    render();
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.7));
    }
    return true;
  }

  function place(row) {
    if (!state || state.over || state.phase !== "place" || !state.pending) return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const player = cur();
    const pending = state.pending;
    let placed = 0;
    let overflow = 0;
    if (row === "floor") {
      overflow = pending.count;
    } else {
      const line = player.pattern[row];
      const room = row + 1 - line.count;
      placed = Math.min(room, pending.count);
      line.color = pending.color;
      line.count += placed;
      overflow = pending.count - placed;
      apiRef.log("<strong>" + esc(player.name) + "</strong> وضع " + ar(placed) + " في الصف " + ar(row + 1) + ".", "accent");
    }
    for (let i = 0; i < overflow; i++) {
      if (player.floor.length < 7) player.floor.push(pending.color);
      else state.discard.push(pending.color);
    }
    if (overflow) apiRef.log(ar(overflow) + " بلاطة زائدة إلى الأرض.", "warn");
    state.last = { text: player.name + (row === "floor" ? " وضع البلاطات في الأرض." : " ملأ الصف " + ar(row + 1) + " (" + ar(placed) + ").") };
    state.pending = null;
    state.phase = "pick";
    if (state.factories.every((factory) => !factory.length) && !state.center.length) {
      endRound();
      return true;
    }
    state.current = (state.current + 1) % state.players.length;
    state.notice = "الدور لـ" + cur().name + " — اختر مصنعًا أو لونًا من المركز.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
    return true;
  }

  function scorePlacement(player, row, col) {
    let horizontal = 1;
    for (let c = col - 1; c >= 0 && player.wall[row][c] != null; c--) horizontal += 1;
    for (let c = col + 1; c < 5 && player.wall[row][c] != null; c++) horizontal += 1;
    let vertical = 1;
    for (let r = row - 1; r >= 0 && player.wall[r][col] != null; r--) vertical += 1;
    for (let r = row + 1; r < 5 && player.wall[r][col] != null; r++) vertical += 1;
    return horizontal + vertical - 1;
  }

  function endRound() {
    const completed = [];
    state.players.forEach((player) => {
      for (let row = 0; row < 5; row++) {
        if (player.pattern[row].count === row + 1) {
          const color = player.pattern[row].color;
          const col = wallCol(row, color);
          if (player.wall[row][col] == null) {
            player.wall[row][col] = color;
            player.score += scorePlacement(player, row, col);
          }
          player.pattern[row] = { color: null, count: 0 };
        }
      }
      if (player.floor.length) player.score -= FLOOR_PENALTY[Math.min(player.floor.length, 7)];
      if (player.firstToken) {
        player.score -= 1;
        player.firstToken = false;
      }
      state.discard.push(...player.floor);
      player.floor = [];
      if (player.wall.some((row) => row.every((cell) => cell != null))) completed.push(player.index);
      apiRef.log("<strong>" + esc(player.name) + "</strong> أنهى الجولة برصيد <strong>" + ar(player.score) + "</strong>.", "accent");
    });
    state.centerFirst = false;
    state.round += 1;
    state.factories.forEach((factory, index) => {
      state.factories[index] = drawFromBag(4);
    });
    state.center = [];
    state.current = state.firstPlayer;
    state.phase = "pick";
    state.pending = null;
    state.notice = "انتهت الجولة. بدأ دور جديد مع " + cur().name + ".";
    render();
    if (completed.length) {
      finalScore(completed);
      return;
    }
    settle();
  }

  function finalScore(completed) {
    state.over = true;
    state.players.forEach((player) => {
      player.wall.forEach((row) => {
        if (row.every((cell) => cell != null)) player.score += 2;
      });
      for (let c = 0; c < 5; c++) {
        if (player.wall.every((row) => row[c] != null)) player.score += 7;
      }
      for (let color = 0; color < 5; color++) {
        let count = 0;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (player.wall[r][c] === color) count += 1;
        if (count === 5) player.score += 10;
      }
    });
    const ranking = XG.standings(state.players, (player) => player.score, (player) => "جدار " + ar(player.wall.flat().filter((cell) => cell != null).length));
    const winner = ranking[0];
    state.notice = "اكتمل صف على الجدار — انتهت اللعبة. الفائز: " + winner.name + " بـ" + ar(winner.value) + " نقطة.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت أزول",
      text: "اكتمل صف أفقي على جدار أحد اللاعبين. تُضاف مكافآت الصفوف والأعمدة والألوان قبل إعلان الفائز.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🔷",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function optionScore(player, color, count) {
    const lines = legalLines(player, color);
    let best = -30;
    lines.forEach((row) => {
      const room = row + 1 - player.pattern[row].count;
      const place = Math.min(room, count);
      const overflow = count - place;
      let score = place * (2 + row * 0.3) - overflow * 4;
      if (place === room) score += 8;
      const col = wallCol(row, color);
      const neighbors = (player.wall[row][col - 1] != null ? 1 : 0) + (player.wall[row][col + 1] != null ? 1 : 0) +
        (player.wall[row - 1] && player.wall[row - 1][col] != null ? 1 : 0) + (player.wall[row + 1] && player.wall[row + 1][col] != null ? 1 : 0);
      score += neighbors * 3;
      if (best < score) best = score;
    });
    return best;
  }

  function aiOptions() {
    const player = cur();
    const options = [];
    state.factories.forEach((factory, index) => {
      U.unique(factory).forEach((color) => {
        const count = factory.filter((tile) => tile === color).length;
        options.push({ source: "factory", index, color, count, score: optionScore(player, color, count) });
      });
    });
    U.unique(state.center).forEach((color) => {
      const count = state.center.filter((tile) => tile === color).length;
      options.push({ source: "center", color, count, score: optionScore(player, color, count) + (state.centerFirst ? 0 : 2) });
    });
    return options;
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    if (state.phase === "pick") {
      const options = aiOptions();
      if (!options.length) return;
      const choice = AI.choose(options, (option) => option.score, cur().level);
      take(choice.source, choice.index, choice.color);
      return;
    }
    if (state.phase === "place" && state.pending) {
      const player = cur();
      const color = state.pending.color;
      const lines = legalLines(player, color);
      if (!lines.length) { place("floor"); return; }
      const row = AI.choose(lines, (value) => {
        const room = value + 1 - player.pattern[value].count;
        const place = Math.min(room, state.pending.count);
        return place * 2 + value - (state.pending.count - place) * 4;
      }, player.level);
      place(row == null ? "floor" : row);
    }
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.9));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function wallHtml(player, mini) {
    let html = "";
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const value = player.wall[r][c];
        html += '<span class="az-wall-cell ' + (mini ? "is-mini" : "") + (value != null ? " is-filled" : "") + '"' +
          (value != null ? ' style="--tc:' + COLORS[value] + '"' : "") + "></span>";
      }
    }
    return '<div class="az-wall ' + (mini ? "is-mini" : "") + '">' + html + "</div>";
  }

  function patternHtml(player) {
    let html = "";
    for (let row = 0; row < 5; row++) {
      const line = player.pattern[row];
      const cells = [];
      for (let i = 0; i < row + 1; i++) {
        const filled = i < line.count;
        cells.push('<span class="az-pattern-cell ' + (filled ? "is-filled" : "") + '"' +
          (filled && line.color != null ? ' style="--tc:' + COLORS[line.color] + '"' : "") + "></span>");
      }
      html += '<div class="az-pattern-row"><span class="az-row-num">' + ar(row + 1) + '</span><div class="az-pattern">' + cells.join("") + "</div></div>";
    }
    return html;
  }

  function floorHtml(player) {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const color = player.floor[i];
      cells.push('<span class="az-floor-cell ' + (color != null ? "is-filled" : "") + '"' +
        (color != null ? ' style="--tc:' + COLORS[color] + '"' : "") + ">" + (i === 0 && player.firstToken ? "١" : "") + "</span>");
    }
    return '<div class="az-floor">' + cells.join("") + "</div>";
  }

  function factoryHtml(factory, index) {
    const unique = U.unique(factory);
    const can = XG.canAct(apiRef, state, state.current, state.over) && state.phase === "pick";
    return '<div class="az-factory ' + (factory.length ? "" : "is-empty") + '">' +
      '<div class="az-factory-tiles">' + factory.map((color) => '<span class="az-tile" style="--tc:' + COLORS[color] + '"></span>').join("") + "</div>" +
      '<div class="az-factory-take">' + (factory.length ? unique.map((color) =>
        '<button type="button" class="az-take-btn" data-az-factory="' + index + '" data-az-color="' + color + '" ' + (!can ? "disabled" : "") + ">" +
        '<span class="az-tile small" style="--tc:' + COLORS[color] + '"></span>' + NAMES[color] + " ×" + ar(factory.filter((tile) => tile === color).length) + "</button>"
      ).join("") : '<span class="az-empty-label">فارغ</span>') + "</div></div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const canPick = XG.canAct(apiRef, state, state.current, state.over) && state.phase === "pick";
    const canPlace = XG.canAct(apiRef, state, state.current, state.over) && state.phase === "place";
    const lines = state.pending ? legalLines(player, state.pending.color) : [];
    const playerRows = state.players.map((p) => (
      '<div class="az-score-row ' + (p.index === state.current ? "is-current" : "") + '">' +
      '<span class="xg-row">' + BG.playerProfile.playerHTML(p, "az-player-avatar") + '<span class="az-mini-wall">' + wallHtml(p, true) + "</span><strong>" + esc(p.name) + "</strong></span>" +
      '<span class="xg-chip">' + ar(p.score) + "</span></div>"
    )).join("");

    rootRef.innerHTML =
      '<div class="xg az">' +
      XG.bar("أزول", "مصانع البلاط · جدار 5×5 · خمسة ألوان", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("الجولة", ar(state.round)),
        XG.chip("الكيس", ar(state.bag.length)),
      ].join("")) +
      '<div class="az-layout"><div class="az-main">' +
      '<div class="az-factories">' + state.factories.map((factory, index) => factoryHtml(factory, index)).join("") +
      '<div class="az-factory az-center"><div class="az-factory-head">المركز ' + (state.centerFirst ? "· رمز البداية مأخوذ" : "") + "</div>" +
      '<div class="az-factory-tiles">' + state.center.map((color) => '<span class="az-tile" style="--tc:' + COLORS[color] + '"></span>').join("") + "</div>" +
      '<div class="az-factory-take">' + (state.center.length ? U.unique(state.center).map((color) =>
        '<button type="button" class="az-take-btn" data-az-center="1" data-az-color="' + color + '" ' + (!canPick ? "disabled" : "") + ">" +
        '<span class="az-tile small" style="--tc:' + COLORS[color] + '"></span>' + NAMES[color] + " ×" + ar(state.center.filter((tile) => tile === color).length) + "</button>"
      ).join("") : '<span class="az-empty-label">فارغ</span>') + "</div></div></div>" +
      '<div class="xg-panel az-board"><div class="xg-spread"><h3>لوحة ' + esc(player.name) + "</h3>" +
      '<span class="xg-chip is-live">' + ar(player.score) + " نقطة</span></div>" +
      '<div class="az-board-grid"><div><h4>خطوط النقش</h4>' + patternHtml(player) + "</div>" +
      '<div><h4>الجدار</h4>' + wallHtml(player, false) + "</div></div>" +
      '<div class="az-floor-wrap"><h4>الأرض (عقوبة)</h4>' + floorHtml(player) + "</div>" +
      (state.pending ? '<div class="az-pending"><strong>محدد: ' + ar(state.pending.count) + " بلاطات " + NAMES[state.pending.color] + "</strong>" +
        '<div class="xg-row">' + lines.map((row) => '<button type="button" class="xg-btn" data-az-line="' + row + '" ' + (!canPlace ? "disabled" : "") + ">الصف " + ar(row + 1) + " (سعة " + ar(row + 1 - player.pattern[row].count) + ")</button>").join("") +
        '<button type="button" class="xg-btn danger" data-az-line="floor" ' + (!canPlace ? "disabled" : "") + ">الأرض</button></div>" +
        (lines.length ? "" : '<p class="xg-warn">لا يوجد خط نقش مناسب؛ ستذهب البلاطات إلى الأرض.</p>') + "</div>" : "") +
      "</div></div>" +
      '<aside class="az-side"><div class="xg-panel"><h3>اللاعبون</h3>' + playerRows + "</div>" +
      '<div class="xg-panel"><h3>الحالة</h3><p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="az-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">خذ كل بلاطات لون واحد من مصنع (الباقي للمركز) أو من المركز. ضعها في خط نقش فارغ أو من نفس اللون، والزائد للأرض. الجولة تنتهي بنفاد المصانع والمركز، واللعبة عند إكمال صف على الجدار.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const factoryBtn = event.target.closest("[data-az-factory]");
    if (factoryBtn) {
      take("factory", Number(factoryBtn.dataset.azFactory), Number(factoryBtn.dataset.azColor));
      return;
    }
    const centerBtn = event.target.closest("[data-az-center]");
    if (centerBtn) {
      take("center", 0, Number(centerBtn.dataset.azColor));
      return;
    }
    const lineBtn = event.target.closest("[data-az-line]");
    if (lineBtn) {
      const value = lineBtn.dataset.azLine;
      place(value === "floor" ? "floor" : Number(value));
    }
  }

  const game = {
    id: "azul",
    name: "أزول",
    en: "AZUL",
    icon: "🔷",
    accent: "#5f8ca3",
    cardClass: "card-azul",
    tagline: "اختر البلاطات بحكمة، املأ خطوط النقش، وابنِ جدارًا من خمسة ألوان.",
    players: "2–4",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: 5 مصانع، 5 ألوان، جدار 5×5، وعقوبة الأرض.",
      defaults: {},
      fields: [],
      summary() { return "5 مصانع · جدار 5×5 · 5 ألوان"; },
    },

    rules: {
      goal: "اجمع أعلى نقاط ببناء جدار من البلاطات. املأ خطوط النقش، ثم انقل البلاطة إلى جدارك عند نهاية الجولة واحتسب الصفوف والأعمدة المتصلة.",
      facts: [["الألوان", "5"], ["المصانع", "5"], ["الجدار", "5×5"], ["النهاية", "صف مكتمل"]],
      components: [
        "20 بلاطة من كل لون (100 بلاطة): أزرق، أصفر، أحمر، أسود، أبيض.",
        "5 مصانع دائرية + مركز الطاولة.",
        "لوح لاعب بخطوط نقش خمسة وجدار 5×5.",
        "علامة أول لاعب وعقوبة أرض.",
      ],
      setup: [
        "توضع 4 بلاطات عشوائية على كل مصنع (20 بلاطة).",
        "يبدأ اللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة.",
        "في أول جولة لا يوجد رمز بداية؛ أول من يأخذ من المركز يأخذه.",
      ],
      steps: [
        "<strong>الأخذ:</strong> اختر مصنعًا ولونًا، وخذ كل بلاطات ذلك اللون منه. الباقي ينتقل إلى المركز.",
        "<strong>المركز:</strong> خذ كل بلاطات لون واحد من المركز. أول آخذ من المركز يأخذ رمز البداية (-1 نقطة).",
        "<strong>النقش:</strong> ضع البلاطات في خط نقش فارغ أو من نفس اللون. الزائد عن سعة الخط يذهب إلى الأرض.",
        "<strong>الأرض:</strong> عقوبة الأرض 1،1،2،2،3،3،4 نقاط حسب عدد البلاطات، ورمز البداية -1 إضافية.",
        "<strong>نهاية الجولة:</strong> عندما تفرغ المصانع والمركز، تنقل البلاطات المكتملة إلى الجدار وتُحتسب النقاط.",
        "<strong>احتساب الجدار:</strong> 1 نقطة للبلاطة + عدد البلاطات المتصلة أفقيًا وعموديًا.",
      ],
      winning: "تنتهي اللعبة عند إكمال أي لاعب صفًا أفقيًا كاملًا على جداره بعد نهاية الجولة. تُضاف مكافآت الصفوف (+2) والأعمدة (+7) والألوان الخمسة (+10).",
      notes: [
        "لا يمكن وضع بلاطة في صف نقش إذا كان الجدار يحتوي لونها في العمود المقابل.",
        "رمز البداية يعود لأول من يأخذ من المركز في الجولة التالية.",
        "الذكاء الاصطناعي يوازن بين عدد البلاطات واكتمال الصفوف وتراكم الأرض.",
        "البلاطات الزائدة عن سبع أرض تُستبعد من اللعبة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت أزول. 5 مصانع، 5 ألوان، وجدار 5×5 لكل لاعب.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          take,
          place,
          legalLines,
          aiStep,
          setFactories(values) {
            if (!Array.isArray(values)) return;
            values.slice(0, 5).forEach((factory, index) => { state.factories[index] = (factory || []).slice(0, 4); });
            render();
          },
          setCurrent(index) { state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1); state.phase = "pick"; state.pending = null; render(); },
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
