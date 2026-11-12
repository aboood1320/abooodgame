/* ==========================================================================
   معارك السفن — شبكتان 10×10
   توزيع يدوي أو عشوائي، تبادل طلقات، إصابة/إخفاق/إغراق، وذكاء بثلاثة مستويات.

   v2:
   - الخصوصية: كل لاعب يرى أسطوله فقط (كانت شاشة التوزيع تكشف أسطول الخصم/الكمبيوتر!).
   - اللعب على جهاز واحد (لاعبان): شاشة تمرير بين الدورين حتى لا يرى أحدهما أسطول الآخر.
   - أونلاين: كل جهاز يعرض أسطول صاحبه (لا يتبدّل العرض مع تبدّل الدور).
   - توزيع يدوي: التقط سفينة واضغط مكانها، تدوير، عشوائي. مع خيار منع التجاور.
   - خيارات: طلقة إضافية بعد كل إصابة · السماح بتجاور السفن.
   - ذكاء: سهل (عشوائي) · عادي (مطاردة + تباعد) · صعب/خبير (كثافة احتمالات).
   - إحداثيات على الشبكة، تمييز آخر طلقة، وكشف السفن الغارقة.
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
  const OPT_DEFAULTS = { chain: false, adjacent: true };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;
  let shownFor = null;     // لعب جهاز واحد: لمن أُظهرت الشاشة آخر مرة
  let uiHold = null;       // إبقاء نتيجة الطلقة ظاهرة لحظات قبل شاشة التمرير

  const other = (seat) => (seat === 0 ? 1 : 0);
  const idx = (r, c) => r * N + c;
  const inBounds = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

  function emptyGrid() { return new Array(N * N).fill(null); }
  function cellName(at) { return COLS[at % N] + (Math.floor(at / N) + 1); }

  /* ------------------------------ التوزيع ------------------------------ */

  function shipCells(spec, row, col, horizontal) {
    const cells = [];
    for (let k = 0; k < spec.size; k++) {
      const r = row + (horizontal ? 0 : k);
      const c = col + (horizontal ? k : 0);
      if (!inBounds(r, c)) return null;
      cells.push(idx(r, c));
    }
    return cells;
  }

  function occupiedSet(board, exceptId) {
    const set = new Set();
    board.ships.forEach((ship) => {
      if (ship.id !== exceptId) ship.cells.forEach((at) => set.add(at));
    });
    return set;
  }

  function validPlacement(board, cells, adjacent, exceptId) {
    const occ = occupiedSet(board, exceptId);
    for (const at of cells) {
      if (occ.has(at)) return false;
    }
    if (!adjacent) {
      for (const at of cells) {
        const r = Math.floor(at / N);
        const c = at % N;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (!inBounds(rr, cc)) continue;
            if (occ.has(idx(rr, cc))) return false;
          }
        }
      }
    }
    return true;
  }

  function makeShip(spec, cells) {
    return { id: spec.id, name: spec.name, size: spec.size, cells, hits: cells.map(() => false), sunk: false };
  }

  function placeFleet(adjacent) {
    for (let round = 0; round < 80; round++) {
      const board = { ships: [], shots: emptyGrid() };
      let ok = true;
      for (const spec of SHIPS) {
        let placed = false;
        for (let attempt = 0; attempt < 200 && !placed; attempt++) {
          const horizontal = Math.random() < 0.5;
          const row = U.randInt(N - (horizontal ? 0 : spec.size - 1));
          const col = U.randInt(N - (horizontal ? spec.size - 1 : 0));
          const cells = shipCells(spec, row, col, horizontal);
          if (cells && validPlacement(board, cells, adjacent)) {
            board.ships.push(makeShip(spec, cells));
            placed = true;
          }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return board;
    }
    /* احتياطي مضمون: كل سفينة في صف مستقل بينها صف فارغ (لا تتلامس أبدًا) */
    const board = { ships: [], shots: emptyGrid() };
    SHIPS.forEach((spec, i) => board.ships.push(makeShip(spec, shipCells(spec, i * 2, 0, true))));
    return board;
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return XG.players(apiRef, 2, ["#7391a8", "#c77c64"]).map((player, index) => {
      player.color = index === 0 ? "#7391a8" : "#c77c64";
      return player;
    });
  }

  function newState() {
    const opts = Object.assign({}, OPT_DEFAULTS, (apiRef && apiRef.options) || {});
    return {
      players: makePlayers(),
      opts,
      boards: [placeFleet(opts.adjacent), placeFleet(opts.adjacent)],
      ready: [false, false],
      sel: [null, null],
      stats: [{ shots: 0, hits: 0 }, { shots: 0, hits: 0 }],
      current: 0,
      phase: "setup",
      lastShot: null,
      notice: "وزّع أسطولك: اضغط سفينة لاختيارها، ثم اضغط خانة فارغة لنقلها، أو اضغطها مرة ثانية (أو زر «تدوير») لتدويرها. ثم اضغط جاهز.",
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }
  function isOnline() { return !!(apiRef && apiRef.net && apiRef.net.enabled); }
  function humans() { return state.players.filter((p) => !p.isCpu); }
  function isHotSeat() { return !isOnline() && humans().length === 2; }

  function shipAt(seat, at) {
    return state.boards[seat].ships.find((ship) => ship.cells.includes(at)) || null;
  }

  function allSunk(seat) {
    return state.boards[seat].ships.every((ship) => ship.sunk);
  }

  /** المقعد الذي يوزّع أسطوله الآن (الأول غير الجاهز). */
  function activeSetupSeat() {
    if (!state.ready[0]) return 0;
    if (!state.ready[1]) return 1;
    return 0;
  }

  /** من يرى الشاشة؟ + هل يلزم ستار التمرير (لعب جهاز واحد) */
  function viewInfo() {
    if (isOnline()) return { seat: Math.max(0, apiRef.net.seat), curtain: false, spectator: apiRef.net.seat < 0 };
    const people = humans();
    if (people.length === 1) return { seat: people[0].index, curtain: false };
    if (people.length === 0) return { seat: 0, curtain: false, spectator: true };
    const want = state.over ? (state.winner == null ? 0 : state.winner) : state.phase === "setup" ? activeSetupSeat() : state.current;
    const holding = uiHold && Date.now() < uiHold.until ? uiHold.seat : null;
    const seat = holding != null ? holding : want;
    const curtain = holding == null && !state.over && shownFor !== seat;
    return { seat, curtain };
  }

  function canSetup(seat) {
    if (!state || state.phase !== "setup" || state.over) return false;
    if (state.players[seat].isCpu) return false;
    if (state.ready[seat]) return false;
    if (isOnline()) return apiRef.net.seat === seat && activeSetupSeat() === seat;
    if (isHotSeat()) return activeSetupSeat() === seat && shownFor === seat;
    return true;
  }

  /* ---- التوزيع اليدوي: اختيار سفينة ← نقلها بالنقر على خانة فارغة ← أو تدويرها في مكانها ---- */

  function isHorizontal(cells) {
    return cells.length < 2 || cells[1] - cells[0] === 1;
  }

  function selectedShip(seat) {
    const id = state.sel[seat];
    return id ? state.boards[seat].ships.find((s) => s.id === id) || null : null;
  }

  /* خانات السفينة لو وُضعت بداية من الخانة المضغوطة (تُزحزح لتتسع داخل الشبكة) */
  function movedCells(ship, at) {
    const horizontal = isHorizontal(ship.cells);
    const r = Math.floor(at / N);
    const c = at % N;
    const row = horizontal ? r : Math.min(r, N - ship.size);
    const col = horizontal ? Math.min(c, N - ship.size) : c;
    return shipCells(ship, row, col, horizontal);
  }

  function selectShip(seat, id) {
    state.sel[seat] = id;
    const ship = selectedShip(seat);
    state.notice = ship
      ? "اخترتَ «" + ship.name + "» — اضغط خانة فارغة لنقلها، أو اضغطها مرة ثانية أو زر «تدوير» لتدويرها."
      : "اضغط سفينة لاختيارها.";
    render();
  }

  function moveShip(seat, at) {
    const ship = selectedShip(seat);
    if (!ship) return false;
    const cells = movedCells(ship, at);
    if (!cells || !validPlacement(state.boards[seat], cells, state.opts.adjacent, ship.id)) {
      apiRef.toast(state.opts.adjacent ? "لا يمكن وضع السفينة هنا (تتداخل مع سفينة أخرى)." : "لا يمكن وضعها هنا: تتداخل أو تلامس سفينة أخرى.", "warn");
      return false;
    }
    ship.cells = cells;
    ship.hits = cells.map(() => false);
    state.ready[seat] = false;
    state.notice = "نُقلت «" + ship.name + "». اضغط جاهز عند الانتهاء.";
    render();
    return true;
  }

  /* تدوير في المكان: نجرّب أقرب موضع للسفينة بالاتجاه الآخر (قد تتحرك قليلًا لتتسع) */
  function rotateShip(seat) {
    const ship = selectedShip(seat);
    if (!ship) {
      apiRef.toast("اضغط على سفينة أولًا لاختيارها ثم دوّرها.", "warn");
      return false;
    }
    const horizontal = isHorizontal(ship.cells);
    const next = !horizontal;
    const r0 = Math.floor(ship.cells[0] / N);
    const c0 = ship.cells[0] % N;
    const centerR = r0 + (horizontal ? 0 : (ship.size - 1) / 2);
    const centerC = c0 + (horizontal ? (ship.size - 1) / 2 : 0);
    let best = null;
    let bestDistance = Infinity;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cells = shipCells(ship, r, c, next);
        if (!cells || !validPlacement(state.boards[seat], cells, state.opts.adjacent, ship.id)) continue;
        const cr = r + (next ? 0 : (ship.size - 1) / 2);
        const cc = c + (next ? (ship.size - 1) / 2 : 0);
        const distance = Math.abs(cr - centerR) + Math.abs(cc - centerC);
        if (distance < bestDistance) { bestDistance = distance; best = cells; }
      }
    }
    if (!best) {
      apiRef.toast("لا يوجد مكان لتدوير هذه السفينة. انقلها إلى مكان أوسع أولًا.", "warn");
      return false;
    }
    ship.cells = best;
    ship.hits = best.map(() => false);
    state.ready[seat] = false;
    state.notice = "دوّرتَ «" + ship.name + "» (" + (next ? "أفقيًا" : "عموديًا") + ").";
    render();
    return true;
  }

  function randomize(seat) {
    state.boards[seat] = placeFleet(state.opts.adjacent);
    state.sel[seat] = null;
    state.ready[seat] = false;
    if (state.phase === "setup") {
      state.notice = state.players[seat].name + " أعاد توزيع أسطوله. اضغط جاهز عند الانتهاء.";
      render();
    }
  }

  function setReady(seat) {
    if (state.boards[seat].ships.length < SHIPS.length) {
      apiRef.toast("ضع كل سفنك أولًا.", "warn");
      return;
    }
    state.ready[seat] = true;
    state.notice = state.players[seat].name + " جاهز.";
    if (state.ready[0] && state.ready[1]) {
      state.phase = "battle";
      state.current = 0;
      state.notice = "بدأت المعركة! " + state.players[0].name + " يطلق أولًا.";
      apiRef.log("بدأت معارك السفن. " + esc(state.players[0].name) + " يطلق أولًا.", "accent");
      apiRef.setStatus("دور " + state.players[0].name, "live");
    } else {
      apiRef.setStatus("إعداد الأسطول");
    }
    render();
    maybeAutoReady();
    settle();
  }

  /* ------------------------------ الطلقات ------------------------------ */

  /* byAi: طلقة الكمبيوتر تمرّ من هنا نفسها فلا يُفحص فيها «هل يستطيع البشري التصرف» */
  function fire(at, byAi) {
    if (!state || state.phase !== "battle" || state.over) return "idle";
    if (!byAi && !XG.canAct(apiRef, state, state.current, state.over)) return "idle";
    const me = state.current;
    const foe = other(me);
    const target = state.boards[foe];
    if (target.shots[at] != null) {
      apiRef.toast("أطلقت على هذه الخانة مسبقًا.", "warn");
      return "again";
    }
    const ship = shipAt(foe, at);
    state.lastShot = { at, by: me, hit: !!ship };
    state.stats[me].shots += 1;
    let sunkShip = null;
    if (ship) {
      target.shots[at] = "hit";
      state.stats[me].hits += 1;
      const cellIndex = ship.cells.indexOf(at);
      ship.hits[cellIndex] = true;
      if (ship.hits.every(Boolean)) {
        ship.sunk = true;
        sunkShip = ship;
        apiRef.log("<strong>" + esc(cur().name) + "</strong> أغرق " + esc(ship.name) + "! (" + esc(cellName(at)) + ")", "good");
        if (BG.fx) BG.fx.sound("capture");
      } else {
        apiRef.log("<strong>" + esc(cur().name) + "</strong> أصاب هدفًا في " + esc(cellName(at)) + ".", "good");
        if (BG.fx) BG.fx.sound("point");
      }
    } else {
      target.shots[at] = "miss";
      apiRef.log("<strong>" + esc(cur().name) + "</strong> أخطأ في " + esc(cellName(at)) + ".", "warn");
      if (BG.fx) BG.fx.sound("click");
    }

    if (allSunk(foe)) {
      finish(me);
      return ship ? "hit" : "miss";
    }

    const again = !!ship && state.opts.chain;
    if (again) {
      state.notice = (sunkShip ? "أغرق " + cur().name + " " + sunkShip.name + "!" : "إصابة في " + cellName(at) + "!") + " طلقة إضافية لـ" + cur().name + ".";
      apiRef.setStatus("دور " + cur().name, "live");
      render();
      settle();
      return "hit";
    }

    if (isHotSeat()) {
      /* لاعب جهاز واحد: نُبقي نتيجة طلقته ظاهرة قليلًا ثم يظهر ستار التمرير */
      uiHold = { seat: me, until: Date.now() + 1600 };
      setTimeout(() => { uiHold = null; if (rootRef) render(); }, 1650);
    }
    state.current = foe;
    state.phase = "battle";
    const shotText = ship ? (sunkShip ? "أُغرقت " + sunkShip.name + "!" : "إصابة!") : "إخفاق.";
    state.notice = shotText + " الدور لـ" + cur().name + " — اختر خانة في مياه العدو.";
    apiRef.setStatus("دور " + cur().name, "live");
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
    const ranking = state.players.map((p) => {
      const s = state.stats[p.index] || { shots: 0, hits: 0 };
      const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
      return {
        name: p.name,
        value: state.boards[other(p.index)].ships.filter((x) => x.sunk).length,
        detail: ar(s.hits) + "/" + ar(s.shots) + " إصابة (" + ar(acc) + "٪)",
      };
    }).sort((a, b) => b.value - a.value);
    render();
    apiRef.gameOver({
      title: "انتهت معارك السفن",
      text: "أغرق الأسطول الخصم بالكامل للفوز في " + ar(state.stats[winner].shots) + " طلقة.",
      winner: state.players[winner].name,
      icon: "🚢",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function neighborsOf(at) {
    const r = Math.floor(at / N);
    const c = at % N;
    const out = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      if (inBounds(r + dr, c + dc)) out.push(idx(r + dr, c + dc));
    });
    return out;
  }

  function aiChoose(seat) {
    const foe = other(seat);
    const board = state.boards[foe];
    const level = String(state.players[seat].level || "normal");
    const known = board.shots;
    const unknown = (at) => known[at] == null;

    const sunkCells = new Set();
    board.ships.forEach((ship) => { if (ship.sunk) ship.cells.forEach((at) => sunkCells.add(at)); });
    const hits = [];
    for (let at = 0; at < N * N; at++) {
      if (known[at] === "hit" && !sunkCells.has(at)) hits.push(at);
    }
    const pool = [];
    for (let at = 0; at < N * N; at++) if (unknown(at)) pool.push(at);
    if (!pool.length) return null;

    const neighborCandidates = () => {
      const list = [];
      hits.forEach((at) => neighborsOf(at).forEach((near) => { if (unknown(near)) list.push(near); }));
      return list;
    };

    if (level === "easy") {
      if (hits.length && Math.random() < 0.5) {
        const near = neighborCandidates();
        if (near.length) return U.pick(near);
      }
      return U.pick(pool);
    }

    if (level === "normal") {
      const near = neighborCandidates();
      if (near.length) return U.pick(near);
      const parity = pool.filter((at) => (Math.floor(at / N) + (at % N)) % 2 === 0);
      return U.pick(parity.length ? parity : pool);
    }

    /* صعب/خبير: كثافة الاحتمالات — نعدّ كل مواضع السفن الباقية الممكنة ونطلق على الأكثر احتمالًا */
    const remaining = board.ships.filter((ship) => !ship.sunk).map((ship) => ship.size);
    const weight = new Array(N * N).fill(0);
    remaining.forEach((size) => {
      [true, false].forEach((horizontal) => {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cells = shipCells({ size }, r, c, horizontal);
            if (!cells) continue;
            if (cells.some((at) => known[at] === "miss" || sunkCells.has(at))) continue;
            const covered = cells.filter((at) => known[at] === "hit").length;
            if (hits.length && covered === 0) continue; // وضع المطاردة: نركّز على المواضع التي تغطي إصابة
            const w = 1 + covered * 20;
            cells.forEach((at) => { if (unknown(at)) weight[at] += w; });
          }
        }
      });
    });
    let best = 0;
    let list = [];
    pool.forEach((at) => {
      const w = weight[at];
      if (w > best) { best = w; list = [at]; } else if (w === best && w > 0) list.push(at);
    });
    if (best <= 0) {
      const near = neighborCandidates();
      return U.pick(near.length ? near : pool);
    }
    return U.pick(list);
  }

  function aiStep() {
    if (!state || state.phase !== "battle" || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const at = aiChoose(state.current);
    if (at == null) return;
    fire(at, true);
  }

  function maybeAutoReady() {
    if (!state || !aiRunner) return;
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

  /* ------------------------------ الرسم (SVG) ------------------------------ */

  const SVG_DEFS =
    "<defs>" +
    '<linearGradient id="bsHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3c8d4"/><stop offset="0.55" stop-color="#7c97a8"/><stop offset="1" stop-color="#4d6677"/></linearGradient>' +
    '<linearGradient id="bsSub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a7487"/><stop offset="1" stop-color="#213340"/></linearGradient>' +
    "</defs>";

  /* السفينة تُرسم أفقية في إحداثيات محلية (طولها ١٠ وحدات لكل خانة، ارتفاعها ١٠) ثم تُدار إن كانت عمودية */
  function shipSvg(ship, sunk, selected) {
    const W = ship.size * 10;
    const horizontal = ship.cells.length < 2 || ship.cells[1] - ship.cells[0] === 1;
    const r0 = Math.floor(ship.cells[0] / N);
    const c0 = ship.cells[0] % N;
    const transform = horizontal
      ? "translate(" + c0 * 10 + " " + r0 * 10 + ")"
      : "translate(" + (c0 * 10 + 10) + " " + r0 * 10 + ") rotate(90)";
    let body = "";
    const ink = 'stroke="#0c1b24" stroke-width=".45"';
    if (ship.id === "submarine") {
      body =
        '<path d="M1.2 5 Q1.2 2.5 4 2.5 H' + (W - 4) + " Q" + (W - 0.8) + " 2.5 " + (W - 0.8) + " 5 Q" + (W - 0.8) + " 7.5 " + (W - 4) + ' 7.5 H4 Q1.2 7.5 1.2 5Z" fill="url(#bsSub)" ' + ink + "/>" +
        '<rect x="' + W * 0.4 + '" y="1.2" width="' + W * 0.2 + '" height="2.6" rx=".9" fill="#33495a" ' + ink + "/>" +
        '<line x1="' + W * 0.55 + '" y1="1.2" x2="' + W * 0.55 + '" y2="0.2" stroke="#c9d8e0" stroke-width=".5"/>' +
        '<circle cx="' + (W - 4.6) + '" cy="5" r=".7" fill="#9fd6e8" opacity=".8"/>';
    } else {
      body =
        '<path d="M1.3 2.2 H' + (W - 5.4) + " Q" + (W - 0.8) + " 5 " + (W - 5.4) + ' 7.8 H1.3 Q.5 7.8 .5 7 V3 Q.5 2.2 1.3 2.2Z" fill="url(#bsHull)" ' + ink + "/>" +
        '<path d="M2 3.1 H' + (W - 6.4) + " Q" + (W - 3.4) + " 5 " + (W - 6.4) + ' 6.9 H2Z" fill="#d6e3ea" opacity=".35"/>';
      const turret = (x) =>
        '<circle cx="' + x + '" cy="5" r="1.5" fill="#3a5366" ' + ink + "/>" +
        '<line x1="' + x + '" y1="5" x2="' + (x + 3) + '" y2="5" stroke="#1d3140" stroke-width=".7" stroke-linecap="round"/>';
      if (ship.id === "carrier") {
        body +=
          '<line x1="3" y1="5" x2="' + (W - 9) + '" y2="5" stroke="#f5f2dc" stroke-width=".45" stroke-dasharray="2.2 1.6" opacity=".9"/>' +
          '<rect x="' + W * 0.6 + '" y="2.4" width="7" height="2" rx=".5" fill="#4b6577" ' + ink + "/>" +
          '<rect x="' + (W * 0.6 + 1.2) + '" y="1.3" width="2.2" height="1.2" fill="#33495a"/>' +
          '<path d="M7 5.1 l3.2 -.9 v1.8z M13 5.1 l3.2 -.9 v1.8z" fill="#e4ebef" ' + ink + "/>";
      } else if (ship.id === "battleship") {
        body += turret(W * 0.2) + turret(W * 0.38) +
          '<rect x="' + W * 0.55 + '" y="3.3" width="5" height="3.4" rx=".6" fill="#4b6577" ' + ink + "/>" +
          '<circle cx="' + (W * 0.55 + 7) + '" cy="5" r="1.1" fill="#2c4252"/>';
      } else if (ship.id === "cruiser") {
        body += turret(W * 0.22) + turret(W * 0.78 - 4) +
          '<rect x="' + W * 0.46 + '" y="3.5" width="4" height="3" rx=".6" fill="#4b6577" ' + ink + "/>";
      } else {
        body += turret(W * 0.26) +
          '<rect x="' + W * 0.52 + '" y="3.7" width="3.6" height="2.6" rx=".6" fill="#4b6577" ' + ink + "/>";
      }
    }
    if (sunk) {
      body +=
        '<ellipse class="bs-flame" cx="' + W * 0.3 + '" cy="4.6" rx="3" ry="2.3" fill="#ff7a2a" opacity=".7"/>' +
        '<ellipse class="bs-flame" cx="' + W * 0.68 + '" cy="5" rx="2.4" ry="2" fill="#ffb326" opacity=".65"/>';
    }
    return '<g class="bs-hull' + (sunk ? " is-sunk" : "") + (selected ? " is-selected" : "") + '" transform="' + transform + '">' + body + "</g>";
  }

  const BOOM =
    '<svg class="bs-boom" viewBox="0 0 20 20" aria-hidden="true"><polygon points="10,1 12.2,6.5 18,4.8 14.6,9.8 19,13 13,13.4 12,19 9.4,14.2 4.2,17.6 5.8,12 1,9.6 6.6,8.4 5,3.4 9,6" fill="#ffb326"/><circle cx="10" cy="10" r="3.8" fill="#ff5a2a"/><circle cx="10" cy="10" r="1.7" fill="#fff3b0"/></svg>';
  const SPLASH =
    '<svg class="bs-splash" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.6" fill="#d9f2fb" opacity=".85"/><circle cx="10" cy="10" r="6" fill="none" stroke="#bfe6f4" stroke-width="1.2" opacity=".8"/><circle cx="10" cy="10" r="8.6" fill="none" stroke="#9fd6e8" stroke-width=".7" opacity=".5"/></svg>';

  function gridHtml(seat, mode) {
    // mode: { own, place (التوزيع اليدوي), shoot, sel (معرّف السفينة المختارة) }
    const board = state.boards[seat];
    const last = state.lastShot && state.lastShot.by === other(seat) ? state.lastShot.at : -1;
    const ships = board.ships.filter((ship) => mode.own || ship.sunk);
    let cols = "";
    for (let c = 0; c < N; c++) cols += "<span>" + COLS[c] + "</span>";
    let rows = "";
    for (let r = 0; r < N; r++) rows += "<span>" + ar(r + 1) + "</span>";
    let cells = "";
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const at = idx(r, c);
        const ship = board.ships.find((s) => s.cells.includes(at));
        const shot = board.shots[at];
        let cls = "bs-cell";
        if (mode.own && ship) cls += " has-ship" + (ship.sunk ? " is-sunk" : "") + (mode.sel && ship.id === mode.sel ? " is-sel" : "");
        else if (!mode.own && ship && ship.sunk) cls += " is-sunk-cell";
        if (shot === "hit") cls += " is-hit";
        else if (shot === "miss") cls += " is-miss";
        if (at === last) cls += " bs-last";
        const shootable = mode.shoot && !shot;
        if (shootable) cls += " is-target";
        if (mode.place) cls += ship ? " is-place is-pick" : (mode.sel ? " is-place is-drop" : " is-place");
        const attr = shootable ? ' data-bs-shot="' + at + '"' : mode.place ? ' data-bs-setup="' + at + '" data-bs-seat="' + seat + '"' : "";
        const disabled = shootable || mode.place ? "" : " disabled";
        cells += '<button type="button" class="' + cls + '"' + attr + disabled + ' aria-label="' + cellName(at) + '">' +
          (shot === "hit" ? BOOM : shot === "miss" ? SPLASH : "") + "</button>";
      }
    }
    const svg = '<svg class="bs-ships" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + SVG_DEFS +
      ships.map((ship) => shipSvg(ship, ship.sunk, !!mode.own && !!mode.sel && mode.sel === ship.id)).join("") + "</svg>";
    return (
      '<div class="bs-grid bs-board">' +
      '<span class="bs-corner"></span><div class="bs-cols">' + cols + "</div>" +
      '<div class="bs-rows">' + rows + "</div>" +
      '<div class="bs-sea ' + (mode.own ? "is-own" : "is-enemy") + '">' + svg + cells + "</div>" +
      "</div>"
    );
  }

  /* pick: في التوزيع تصبح الشارات أزرارًا لاختيار السفينة { sel } */
  function fleetHtml(seat, reveal, pick) {
    return state.boards[seat].ships.map((ship) => {
      const left = ship.hits.filter((h) => !h).length;
      const label = "<span>" + esc(ship.name) + "</span><span>" +
        (ship.sunk ? "غارقة" : reveal ? ar(left) + "/" + ar(ship.size) : ar(ship.size)) + "</span>";
      if (pick) {
        return '<button type="button" class="bs-ship is-pickable ' + (pick.sel === ship.id ? "is-sel" : "") + '" data-bs-chip="' + ship.id + '" data-bs-seat="' + seat + '">' + label + "</button>";
      }
      return '<div class="bs-ship ' + (ship.sunk ? "is-sunk" : "") + '">' + label + "</div>";
    }).join("");
  }

  function setupHtml(seat) {
    const player = state.players[seat];
    const interactive = canSetup(seat);
    const selShip = selectedShip(seat);
    const placed = state.boards[seat].ships.length;
    const hint = interactive
      ? (selShip
        ? "«" + esc(selShip.name) + "» مختارة: اضغط خانة فارغة لنقلها، أو اضغطها مرة ثانية / زر «تدوير» (أو مفتاح R) لتدويرها."
        : "اضغط سفينة (على الشبكة أو من القائمة) لاختيارها، أو استخدم «توزيع عشوائي».")
      : "";
    return (
      '<div class="xg-panel bs-setup">' +
      '<div class="xg-spread"><h3>' + esc(player.name) + " — أسطوله</h3>" +
      '<span class="xg-chip ' + (state.ready[seat] ? "is-good" : "") + '">' + (state.ready[seat] ? "جاهز" : "قيد التوزيع") + "</span></div>" +
      gridHtml(seat, { own: true, place: interactive, sel: selShip ? selShip.id : null }) +
      (hint ? '<p class="bs-hint">' + hint + "</p>" : "") +
      '<div class="bs-fleet">' + fleetHtml(seat, false, interactive ? { sel: selShip ? selShip.id : null } : null) + "</div>" +
      '<div class="xg-row">' +
      '<button type="button" class="xg-btn" data-bs-rotate="' + seat + '" ' + (interactive && selShip ? "" : "disabled") + ">↻ تدوير</button>" +
      '<button type="button" class="xg-btn" data-bs-random="' + seat + '" ' + (interactive ? "" : "disabled") + ">🎲 توزيع عشوائي</button>" +
      '<button type="button" class="xg-btn primary" data-bs-ready="' + seat + '" ' + (interactive && placed === SHIPS.length ? "" : "disabled") + ">جاهز</button></div>" +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const view = viewInfo();
    const me = view.seat;
    const foe = other(me);
    const setup = state.phase === "setup";

    let body = "";
    if (view.curtain) {
      const name = state.players[me].name;
      body =
        '<div class="xg-panel bs-curtain"><h3>🙈 ' + esc(name) + "</h3>" +
        "<p>مرّر الجهاز إلى <strong>" + esc(name) + "</strong>، وتأكد أن خصمك لا ينظر إلى الشاشة، ثم اضغط الزر.</p>" +
        '<button type="button" class="xg-btn primary" data-bs-curtain="' + me + '">أنا ' + esc(name) + " — إظهار شاشتي</button></div>";
    } else if (setup) {
      body = '<div class="bs-setup-grid">' + setupHtml(me) + "</div>";
    } else {
      const canShoot = state.phase === "battle" && !view.spectator && state.current === me && XG.canAct(apiRef, state, state.current, state.over);
      body =
        '<div class="bs-arena">' +
        '<div class="xg-panel bs-side"><div class="xg-spread"><h3>أسطولي — ' + esc(state.players[me].name) + "</h3>" +
        '<span class="xg-chip">' + ar(state.boards[me].ships.filter((s) => !s.sunk).length) + " سفن باقية</span></div>" +
        gridHtml(me, { own: true }) + '<div class="bs-fleet">' + fleetHtml(me, true) + "</div></div>" +
        '<div class="xg-panel bs-side"><div class="xg-spread"><h3>مياه العدو — ' + esc(state.players[foe].name) + "</h3>" +
        '<span class="xg-chip ' + (canShoot ? "is-live" : "") + '">' + (state.over ? "انتهت" : canShoot ? "اختر هدفًا" : "انتظر دورك") + "</span></div>" +
        gridHtml(foe, { own: false, shoot: canShoot }) + '<div class="bs-fleet">' + fleetHtml(foe, false) + "</div></div>" +
        "</div>";
    }

    rootRef.innerHTML =
      '<div class="xg bs">' +
      XG.bar("معارك السفن", "أسطول من خمس سفن · شبكة 10×10", [
        XG.chip("المرحلة", setup ? "التوزيع" : "المعركة"),
        XG.chip("الدور", esc(setup ? state.players[activeSetupSeat()].name : cur().name), state.phase === "battle" ? "is-live" : ""),
      ].join("")) +
      body +
      '<p class="bs-note">' + esc(state.notice) + "</p>" +
      "</div>";
  }

  /* معاينة موضع السفينة المختارة عند مرور المؤشر (أخضر = صالح، أحمر = غير صالح) */
  function clearPreview() {
    if (!rootRef) return;
    rootRef.querySelectorAll(".is-prev, .is-prev-bad").forEach((node) => node.classList.remove("is-prev", "is-prev-bad"));
  }

  function previewDrop(event) {
    if (!state || !rootRef || state.phase !== "setup") return;
    clearPreview();
    const cell = event.target.closest ? event.target.closest("[data-bs-setup]") : null;
    if (!cell) return;
    const seat = Number(cell.dataset.bsSeat);
    const ship = selectedShip(seat);
    if (!ship || !canSetup(seat)) return;
    const at = Number(cell.dataset.bsSetup);
    if (ship.cells.includes(at)) return;
    const cells = movedCells(ship, at);
    if (!cells) return;
    const valid = validPlacement(state.boards[seat], cells, state.opts.adjacent, ship.id);
    cells.forEach((c) => {
      const node = rootRef.querySelector('[data-bs-setup="' + c + '"]');
      if (node) node.classList.add(valid ? "is-prev" : "is-prev-bad");
    });
  }

  /* مفتاح R يدوّر السفينة المختارة */
  function onKey(event) {
    if (!state || state.phase !== "setup" || !rootRef) return;
    const key = String(event.key || "").toLowerCase();
    if (key !== "r" && key !== "ق") return;
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const seat = viewInfo().seat;
    if (canSetup(seat) && selectedShip(seat)) {
      event.preventDefault();
      rotateShip(seat);
    }
  }

  function onClick(event) {
    if (!state) return;
    const target = event.target;
    const curtain = target.closest("[data-bs-curtain]");
    if (curtain) {
      shownFor = Number(curtain.dataset.bsCurtain);
      render();
      return;
    }
    const rotate = target.closest("[data-bs-rotate]");
    if (rotate) {
      const seat = Number(rotate.dataset.bsRotate);
      if (canSetup(seat)) rotateShip(seat);
      return;
    }
    const random = target.closest("[data-bs-random]");
    if (random) {
      const seat = Number(random.dataset.bsRandom);
      if (canSetup(seat)) randomize(seat);
      return;
    }
    const ready = target.closest("[data-bs-ready]");
    if (ready) {
      const seat = Number(ready.dataset.bsReady);
      if (canSetup(seat)) setReady(seat);
      return;
    }
    const chip = target.closest("[data-bs-chip]");
    if (chip) {
      const seat = Number(chip.dataset.bsSeat);
      if (canSetup(seat)) selectShip(seat, state.sel[seat] === chip.dataset.bsChip ? null : chip.dataset.bsChip);
      return;
    }
    const setupCell = target.closest("[data-bs-setup]");
    if (setupCell) {
      const seat = Number(setupCell.dataset.bsSeat);
      const at = Number(setupCell.dataset.bsSetup);
      if (!canSetup(seat)) return;
      const ship = shipAt(seat, at);
      if (ship) {
        if (state.sel[seat] === ship.id) rotateShip(seat);
        else selectShip(seat, ship.id);
      } else if (state.sel[seat]) {
        moveShip(seat, at);
      } else {
        apiRef.toast("اضغط على سفينة أولًا لاختيارها.", "warn");
      }
      return;
    }
    const shot = target.closest("[data-bs-shot]");
    if (shot && shot.dataset.bsShot !== "") fire(Number(shot.dataset.bsShot));
  }

  /* ------------------------------ التسجيل ------------------------------ */

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
      defaults: Object.assign({}, OPT_DEFAULTS),
      fields: [
        { key: "chain", label: "طلقة إضافية بعد كل إصابة", type: "toggle", hint: "من يصيب هدفًا يطلق مرة أخرى حتى يخطئ (لعبة أسرع)." },
        { key: "adjacent", label: "السماح بتجاور السفن", type: "toggle", hint: "عند التعطيل لا يجوز أن تلامس سفينة سفينة أخرى، حتى بالأقطار." },
      ],
      summary(options) {
        const o = Object.assign({}, OPT_DEFAULTS, options || {});
        const parts = ["شبكتان 10×10 · أسطول من 5 سفن"];
        if (o.chain) parts.push("طلقة إضافية بعد الإصابة");
        if (!o.adjacent) parts.push("بلا تجاور");
        return parts.join(" · ");
      },
    },

    rules: {
      goal: "أغرق جميع سفن الخصم قبل أن يغرق أسطولك. كل لاعب يخفي أسطوله ويتبادل الطلقات على شبكة الخصم.",
      facts: [["الشبكة", "10×10"], ["السفن", "5 لكل لاعب"], ["الطول", "2–5 خانات"], ["الفوز", "إغراق الأسطول"]],
      components: [
        "شبكتان 10×10: واحدة لأسطولك وواحدة لتسجيل طلقاتك على الخصم.",
        "حاملة طائرات (5)، بارجة (4)، طراد (3)، غواصة (3)، مدمرة (2).",
      ],
      setup: [
        "يضع كل لاعب سفنه أفقيًا أو عموديًا داخل شبكته دون تداخل: اضغط سفينة لاختيارها، ثم اضغط خانة فارغة لنقلها، أو اضغطها مرة ثانية (أو زر «تدوير» أو مفتاح R) لتدويرها (أو «توزيع عشوائي»).",
        "يمكن ترك السفن متجاورة افتراضيًا، ويمكن منع التجاور من خيارات اللعبة.",
        "لا يرى أي لاعب أسطول خصمه أثناء التوزيع. وعند اللعب على جهاز واحد تظهر شاشة تمرير بين اللاعبين.",
        "عند جاهزية الطرفين تبدأ المعركة، ويطلق اللاعب الأول.",
      ],
      steps: [
        "<strong>الطلقة:</strong> اختر خانة في مياه العدو. النتيجة إصابة أو إخفاق.",
        "<strong>الإصابة:</strong> تُعلَّم الخانة. ينتقل الدور إلى الخصم بعد كل طلقة، إلا إذا فعّلت خيار «طلقة إضافية بعد كل إصابة».",
        "<strong>الإغراق:</strong> عندما تُصاب كل خانات سفينة تُعلن غارقة وتُكشف على شبكة الخصم.",
        "<strong>الفوز:</strong> أول لاعب يغرق السفن الخمس كلها يفوز فورًا.",
      ],
      winning: "الفائز هو من يغرق أسطول الخصم كاملًا. لا تُحتسب الإصابة الجزئية نصرًا.",
      notes: [
        "الخانة الأخيرة المصابة تُحاط بإطار مضيء لتتبّع آخر طلقة.",
        "مستويات الكمبيوتر: سهل يطلق عشوائيًا؛ عادي يطارد الإصابات ويتباعد؛ صعب وخبير يحسبان الخانات الأكثر احتمالًا لوجود سفينة.",
        "أونلاين: يوزّع اللاعبان أسطوليهما بالتتابع، ويرى كل لاعب أسطوله فقط.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      shownFor = null;
      uiHold = null;
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
          selectShip,
          moveShip,
          rotateShip,
          aiStep,
          aiChoose,
          viewInfo,
          start() { state.phase = "battle"; state.ready = [true, true]; state.current = 0; render(); settle(); },
          setCurrent(index) { state.current = index === 1 ? 1 : 0; render(); settle(); },
          ships: () => SHIPS,
        };
      }

      rootRef.addEventListener("click", onClick);
      rootRef.addEventListener("pointerover", previewDrop);
      rootRef.addEventListener("pointerleave", clearPreview);
      document.addEventListener("keydown", onKey);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(timer);
          state = BG.netCodec.decode(data);
          state.opts = Object.assign({}, OPT_DEFAULTS, state.opts || {});
          state.sel = Array.isArray(state.sel) ? state.sel : [null, null];
          state.stats = Array.isArray(state.stats) ? state.stats : [{ shots: 0, hits: 0 }, { shots: 0, hits: 0 }];
          state.boards.forEach((board) => {
            board.ships.forEach((ship) => {
              ship.hits = (ship.hits || []).map(Boolean);
              ship.sunk = !!ship.sunk;
            });
          });
          render();
        },
        /* التوزيع أونلاين بالتتابع: المقعد النشط هو أول من لم يجهز */
        netSeat() {
          if (!state) return -1;
          return state.phase === "setup" ? activeSetupSeat() : state.current;
        },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); maybeAutoReady(); settle(); } },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(timer);
          timer = null;
          if (rootRef) {
            rootRef.removeEventListener("click", onClick);
            rootRef.removeEventListener("pointerover", previewDrop);
            rootRef.removeEventListener("pointerleave", clearPreview);
          }
          document.removeEventListener("keydown", onKey);
          rootRef = null;
          apiRef = null;
          state = null;
          shownFor = null;
          uiHold = null;
        },
      };
    },
  };

  BG.register(game);
})();
