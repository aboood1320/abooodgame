/* ==========================================================================
   معارك السفن — شبكتان 10×10
   وضع أسطول، تبادل طلقات، إصابة/إخفاق/إغراق، وذكاء hunt/target.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const N = 10;
  const SHIPS = [
    { id: "carrier", name: "حاملة الطائرات", size: 5 },
    { id: "battleship", name: "البارجة", size: 4 },
    { id: "cruiser", name: "الطراد", size: 3 },
    { id: "submarine", name: "الغواصة", size: 3 },
    { id: "destroyer", name: "المدمرة", size: 2 },
  ];
  const COLS = "ABCDEFGHIJ";

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  const other = (seat) => (seat === 0 ? 1 : 0);
  const idx = (r, c) => r * N + c;

  function emptyGrid() { return new Array(N * N).fill(null); }
  function cellName(at) { return COLS[at % N] + (Math.floor(at / N) + 1); }

  function placeFleet() {
    const grid = emptyGrid();
    const ships = [];
    SHIPS.forEach((spec) => {
      let placed = null;
      for (let attempt = 0; attempt < 240 && !placed; attempt++) {
        const horizontal = Math.random() < 0.5;
        const row = U.randInt(N - (horizontal ? 0 : spec.size - 1));
        const col = U.randInt(N - (horizontal ? spec.size - 1 : 0));
        const cells = [];
        let free = true;
        for (let k = 0; k < spec.size; k++) {
          const r = row + (horizontal ? 0 : k);
          const c = col + (horizontal ? k : 0);
          const at = idx(r, c);
          if (grid[at] != null) { free = false; break; }
          cells.push(at);
        }
        if (!free) continue;
        cells.forEach((at) => { grid[at] = spec.id; });
        placed = { ...spec, cells, hits: cells.map(() => false), sunk: false };
      }
      if (!placed) {
        // احتياطي مضمون: صفوف متتالية من الأعلى.
        const row = ships.length;
        const cells = [];
        for (let k = 0; k < spec.size; k++) {
          const at = idx(row, k);
          grid[at] = spec.id;
          cells.push(at);
        }
        placed = { ...spec, cells, hits: cells.map(() => false), sunk: false };
      }
      ships.push(placed);
    });
    return { grid, ships, shots: emptyGrid() };
  }

  function makePlayers() {
    return XG.players(apiRef, 2, ["#7391a8", "#c77c64"]).map((player, index) => {
      player.color = index === 0 ? "#7391a8" : "#c77c64";
      return player;
    });
  }

  function newState() {
    return {
      players: makePlayers(),
      boards: [placeFleet(), placeFleet()],
      ready: [false, false],
      current: 0,
      phase: "setup",
      lastShot: null,
      notice: "وزّع أسطولك ثم اضغط جاهز. عند جاهزية الطرفين تبدأ المعركة.",
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }

  function shipAt(seat, at) {
    return state.boards[seat].ships.find((ship) => ship.cells.includes(at)) || null;
  }

  function allSunk(seat) {
    return state.boards[seat].ships.every((ship) => ship.sunk);
  }

  function randomize(seat) {
    state.boards[seat] = placeFleet();
    state.ready[seat] = false;
    if (state.phase === "setup") {
      state.notice = state.players[seat].name + " أعاد توزيع أسطوله. اضغط جاهز عند الانتهاء.";
      render();
    }
  }

  function setReady(seat) {
    state.ready[seat] = true;
    state.notice = state.players[seat].name + " جاهز.";
    if (state.ready[0] && state.ready[1]) {
      state.phase = "battle";
      state.current = 0;
      state.notice = "بدأت المعركة! " + state.players[0].name + " يطلق أولًا.";
      apiRef.log("بدأت معارك السفن. " + esc(state.players[0].name) + " يطلق أولًا.", "accent");
    }
    render();
    settle();
  }

  function fire(at) {
    if (!state || state.phase !== "battle" || state.over) return "idle";
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return "idle";
    const me = state.current;
    const foe = other(me);
    const target = state.boards[foe];
    if (target.shots[at] != null) {
      apiRef.toast("أطلقت على هذه الخانة مسبقًا.", "warn");
      return "again";
    }
    const ship = shipAt(foe, at);
    state.lastShot = { at, by: me, hit: !!ship };
    if (ship) {
      target.shots[at] = "hit";
      const cellIndex = ship.cells.indexOf(at);
      ship.hits[cellIndex] = true;
      if (ship.hits.every(Boolean)) {
        ship.sunk = true;
        apiRef.log("<strong>" + esc(cur().name) + "</strong> أغرق " + esc(ship.name) + "! (" + esc(cellName(at)) + ")", "good");
      } else {
        apiRef.log("<strong>" + esc(cur().name) + "</strong> أصاب هدفًا في " + esc(cellName(at)) + ".", "good");
      }
    } else {
      target.shots[at] = "miss";
      apiRef.log("<strong>" + esc(cur().name) + "</strong> أخطأ في " + esc(cellName(at)) + ".", "warn");
    }
    if (allSunk(foe)) {
      finish(me);
      return ship ? "hit" : "miss";
    }
    state.current = foe;
    state.phase = "battle";
    state.notice = "الدور لـ" + cur().name + " — اختر خانة في مياه العدو.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
    return ship ? "hit" : "miss";
  }

  function finish(winner) {
    state.over = true;
    state.winner = winner;
    state.phase = "over";
    state.notice = "فاز " + state.players[winner].name + " وأغرق الأسطول كاملًا.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: state.boards[other(p.index)].ships.filter((s) => s.sunk).length,
    })).sort((a, b) => b.value - a.value);
    render();
    apiRef.gameOver({
      title: "انتهت معارك السفن",
      text: "أغرق الأسطول الخصم بالكامل للفوز.",
      winner: state.players[winner].name,
      icon: "🚢",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function aiChoose(seat) {
    const foe = other(seat);
    const target = state.boards[foe];
    const hits = [];
    target.ships.forEach((ship) => {
      if (ship.sunk) return;
      ship.cells.forEach((at, index) => {
        if (ship.hits[index]) hits.push(at);
      });
    });
    const unknown = (at) => at >= 0 && at < 100 && target.shots[at] == null;
    const candidates = [];
    hits.forEach((at) => {
      const r = Math.floor(at / N);
      const c = at % N;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) return;
        const near = idx(rr, cc);
        if (unknown(near)) candidates.push(near);
      });
    });
    if (candidates.length) return U.pick(candidates);
    const pool = [];
    for (let at = 0; at < 100; at++) {
      if (!unknown(at)) continue;
      const r = Math.floor(at / N);
      const c = at % N;
      if ((r + c) % 2 === 0) pool.push(at);
    }
    if (pool.length) return U.pick(pool);
    const rest = [];
    for (let at = 0; at < 100; at++) if (unknown(at)) rest.push(at);
    return rest.length ? U.pick(rest) : null;
  }

  function aiStep() {
    if (!state || state.phase !== "battle" || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const at = aiChoose(state.current);
    if (at == null) return;
    fire(at);
  }

  function maybeAutoReady() {
    [0, 1].forEach((seat) => {
      if (state.players[seat].isCpu && !state.ready[seat] && state.phase === "setup") {
        aiRunner.later(() => {
          if (state && state.phase === "setup" && !state.ready[seat]) setReady(seat);
        }, AI.delay(state.players[seat].level, 1.2) + seat * 300);
      }
    });
  }

  function settle() {
    if (!state || state.over) return;
    if (state.phase === "battle" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function gridHtml(seat, own, canShoot) {
    const board = state.boards[seat];
    let cells = "";
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const at = idx(r, c);
        const ship = board.ships.find((s) => s.cells.includes(at));
        const shot = board.shots[at];
        let cls = "bs-cell";
        let label = cellName(at);
        if (own) {
          if (ship) cls += " has-ship" + (ship.sunk ? " is-sunk" : "");
          if (shot === "hit") cls += " is-hit";
          else if (shot === "miss") cls += " is-miss";
        } else {
          if (shot === "hit") cls += " is-hit";
          else if (shot === "miss") cls += " is-miss";
        }
        if (canShoot && !shot) cls += " is-target";
        const interactive = canShoot && !shot;
        cells += "<button type=\"button\" class=\"" + cls + "\" data-bs-shot=\"" + (interactive ? at : "") + "\" " +
          (interactive ? "" : "disabled") + " aria-label=\"" + label + "\">" +
          (shot === "hit" ? "✕" : shot === "miss" ? "•" : own && ship ? "▮" : "") + "</button>";
      }
    }
    return '<div class="bs-grid">' + cells + "</div>";
  }

  function fleetHtml(seat, reveal) {
    return state.boards[seat].ships.map((ship) => {
      const left = ship.hits.filter((h) => !h).length;
      return '<div class="bs-ship ' + (ship.sunk ? "is-sunk" : "") + '"><span>' + esc(ship.name) + "</span><span>" +
        (ship.sunk ? "غارقة" : reveal ? ar(left) + "/" + ar(ship.size) : ar(ship.size)) + "</span></div>";
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    const me = state.phase === "battle" || state.over ? state.current : 0;
    const foe = other(me);
    const canShoot = state.phase === "battle" && XG.canAct(apiRef, state, state.current, state.over);
    const setup = state.phase === "setup";

    const setupPanels = setup
      ? state.players.map((player) => {
        const seat = player.index;
        return (
          '<div class="xg-panel bs-setup">' +
          '<div class="xg-spread"><h3>' + esc(player.name) + " — أسطوله</h3>" +
          '<span class="xg-chip ' + (state.ready[seat] ? "is-good" : "") + '">' + (state.ready[seat] ? "جاهز" : "قيد التوزيع") + "</span></div>" +
          gridHtml(seat, true, false) +
          '<div class="xg-row"><button type="button" class="xg-btn" data-bs-random="' + seat + '" ' + (state.ready[seat] ? "disabled" : "") + ">توزيع عشوائي</button>" +
          '<button type="button" class="xg-btn primary" data-bs-ready="' + seat + '" ' + (state.ready[seat] ? "disabled" : "") + ">جاهز</button></div>" +
          "</div>"
        );
      }).join("")
      : "";

    const battleView = !setup
      ? '<div class="bs-arena">' +
        '<div class="xg-panel bs-side"><div class="xg-spread"><h3>أسطولي — ' + esc(state.players[me].name) + "</h3>" +
        '<span class="xg-chip">' + ar(state.boards[me].ships.filter((s) => !s.sunk).length) + " سفن باقية</span></div>" +
        gridHtml(me, true, false) + '<div class="bs-fleet">' + fleetHtml(me, true) + "</div></div>" +
        '<div class="xg-panel bs-side"><div class="xg-spread"><h3>مياه العدو ' + esc(state.players[foe].name) + "</h3>" +
        '<span class="xg-chip ' + (canShoot ? "is-live" : "") + '">' + (state.over ? "انتهت" : canShoot ? "اختر هدفًا" : "انتظر دورك") + "</span></div>" +
        gridHtml(foe, false, canShoot) + '<div class="bs-fleet">' + fleetHtml(foe, false) + "</div></div>" +
        "</div>"
      : "";

    rootRef.innerHTML =
      '<div class="xg bs">' +
      XG.bar("معارك السفن", "أسطول من خمس سفن · شبكة 10×10", [
        XG.chip("المرحلة", setup ? "التوزيع" : "المعركة"),
        XG.chip("الدور", esc(cur().name), state.phase === "battle" ? "is-live" : ""),
      ].join("")) +
      (setup ? '<div class="bs-setup-grid">' + setupPanels + "</div>" : battleView) +
      '<p class="bs-note">' + esc(state.notice) + "</p>" +
      "</div>";
  }

  function onClick(event) {
    if (!state) return;
    const random = event.target.closest("[data-bs-random]");
    if (random) {
      const seat = Number(random.dataset.bsRandom);
      if (!state.ready[seat]) randomize(seat);
      return;
    }
    const ready = event.target.closest("[data-bs-ready]");
    if (ready) {
      const seat = Number(ready.dataset.bsReady);
      if (!state.ready[seat]) setReady(seat);
      return;
    }
    const shot = event.target.closest("[data-bs-shot]");
    if (shot && shot.dataset.bsShot !== "") fire(Number(shot.dataset.bsShot));
  }

  const game = {
    id: "battleship",
    name: "معارك السفن",
    en: "BATTLESHIP",
    icon: "🚢",
    accent: "#7391a8",
    cardClass: "card-battleship",
    tagline: "وزّع أسطولك في الخفاء واطلق الطلقات لتغرق سفن الخصم أولًا.",
    players: "2",
    duration: "15–30 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "أسطول قياسي: حاملة 5، بارجة 4، طراد 3، غواصة 3، مدمرة 2.",
      defaults: {},
      fields: [],
      summary() { return "شبكتان 10×10 · أسطول من 5 سفن"; },
    },

    rules: {
      goal: "أغرق جميع سفن الخصم قبل أن يغرق أسطولك. كل لاعب يخفي أسطوله ويتبادل الطلقات على شبكة الخصم.",
      facts: [["الشبكة", "10×10"], ["السفن", "5 لكل لاعب"], ["الطول", "2–5 خانات"], ["الفوز", "إغراق الأسطول"]],
      components: [
        "شبكتان 10×10: واحدة لأسطولك وواحدة لتسجيل طلقاتك على الخصم.",
        "حاملة طائرات (5)، بارجة (4)، طراد (3)، غواصة (3)، مدمرة (2).",
      ],
      setup: [
        "يضع كل لاعب سفنه أفقيًا أو عموديًا داخل شبكته دون تداخل.",
        "يمكن ترك السفن متجاورة؛ بعض النسخ المنزلية تمنع التجاور لكن هذه النسخة تسمح به.",
        "عند جاهزية الطرفين تبدأ المعركة، ويطلق اللاعب الأول.",
      ],
      steps: [
        "<strong>الطلقة:</strong> اختر خانة في مياه العدو. النتيجة إصابة أو إخفاق.",
        "<strong>الإصابة:</strong> تُعلَّم الخانة، وينتقل الدور إلى الخصم بعد كل طلقة في هذه النسخة.",
        "<strong>الإغراق:</strong> عندما تُصاب كل خانات سفينة تُعلن غارقة.",
        "<strong>الفوز:</strong> أول لاعب يغرق السفن الخمس كلها يفوز فورًا.",
      ],
      winning: "الفائز هو من يغرق أسطول الخصم كاملًا. لا تُحتسب الإصابة الجزئية نصرًا.",
      notes: [
        "التوزيع العشوائي يضمن عدم تداخل السفن.",
        "ذكاء الخصم يستخدم أسلوب hunt/target: يبحث عشوائيًا ثم يطارد الإصابات المتجاورة.",
        "الشبكة التي تحمل سفنك تظهر سفنك فقط؛ شبكة العدو لا تكشف مواضع سفنه.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأ إعداد معارك السفن. وزّع الأسطول ثم اضغط جاهز.", "accent");
      apiRef.setStatus("إعداد الأسطول");
      render();
      maybeAutoReady();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          fire,
          setReady,
          randomize,
          aiStep,
          start() { state.phase = "battle"; state.ready = [true, true]; state.current = 0; render(); settle(); },
          setCurrent(index) { state.current = index === 1 ? 1 : 0; render(); settle(); },
          ships: () => SHIPS,
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
          state.boards.forEach((board) => {
            board.ships.forEach((ship) => {
              ship.hits = (ship.hits || []).map(Boolean);
              ship.sunk = !!ship.sunk;
            });
          });
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
