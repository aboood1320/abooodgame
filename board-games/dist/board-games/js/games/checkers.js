/* ==========================================================================
   الداما — داما ثمانية على ثمانية
   أكل إجباري، ترقية إلى ملك، أسر متسلسل، وذكاء بحثي بثلاثة مستويات.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const FILES = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);
  const idx = (r, c) => r * 8 + c;
  const rowOf = (i) => Math.floor(i / 8);
  const colOf = (i) => i % 8;
  const inBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let moveTimer = null;

  /* ------------------------------ الحالة ------------------------------ */

  let pieceSerial = 0;

  function newPieceId() {
    pieceSerial += 1;
    return pieceSerial;
  }

  function initialBoard() {
    const board = new Array(64).fill(null);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 1) continue;
        if (r < 3) board[idx(r, c)] = { id: newPieceId(), seat: 1, king: false };
        else if (r > 4) board[idx(r, c)] = { id: newPieceId(), seat: 0, king: false };
      }
    }
    return board;
  }

  function makePlayers() {
    return (apiRef.players || []).slice(0, 2).map((player, index) => ({
      index,
      name: player.name || (index === 0 ? "الأبيض" : "الأسود"),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
    }));
  }

  function newState() {
    return {
      board: initialBoard(),
      players: makePlayers(),
      current: 0,
      selected: null,
      moves: [],
      mustCapture: true,
      turn: 1,
      idlePlies: 0,
      notice: "الدور للأبيض — اختر قطعة لرؤية حركاتها.",
      last: null,
      over: false,
      winner: null,
      standings: [],
      busy: false,
    };
  }

  function cur() {
    return state.players[state.current];
  }

  function localSeat() {
    if (apiRef && apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function humanCanAct(player) {
    if (!state || !player || state.over || state.busy) return false;
    if (state.current !== player.index) return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    return !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index;
  }

  /* ------------------------------ توليد الحركات ------------------------------ */

  function dirsFor(seat, king) {
    if (king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return seat === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  function isPromotion(seat, index) {
    const row = rowOf(index);
    return (seat === 0 && row === 0) || (seat === 1 && row === 7);
  }

  function capturePaths(board, seat, from, piece) {
    const results = [];
    const start = from;

    function walk(pos, king, captured, steps) {
      const r = rowOf(pos);
      const c = colOf(pos);
      let extended = false;
      dirsFor(seat, king).forEach((dir) => {
        const mr = r + dir[0];
        const mc = c + dir[1];
        const lr = r + dir[0] * 2;
        const lc = c + dir[1] * 2;
        if (!inBoard(lr, lc)) return;
        const mid = idx(mr, mc);
        const land = idx(lr, lc);
        const victim = board[mid];
        if (!victim || victim.seat === seat) return;
        if (board[land]) return;
        if (captured.indexOf(mid) >= 0) return;
        extended = true;
        board[pos] = null;
        board[mid] = null;
        board[land] = { id: piece.id, seat, king };
        const promoted = !king && isPromotion(seat, land);
        const nextKing = king || promoted;
        if (!promoted) {
          walk(land, nextKing, captured.concat(mid), steps.concat({ from: pos, to: land, capture: mid }));
        } else {
          results.push({
            from: start,
            to: land,
            steps: steps.concat({ from: pos, to: land, capture: mid }),
            captured: captured.concat(mid),
            king: true,
          });
        }
        board[pos] = { seat, king };
        board[mid] = victim;
        board[land] = null;
      });
      if (!extended && steps.length) {
        results.push({ from: start, to: pos, steps: steps.slice(), captured: captured.slice(), king });
      }
    }

    walk(from, !!piece.king, [], []);
    return results;
  }

  function allMoves(board, seat, mustCapture) {
    const captures = [];
    const normals = [];
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece || piece.seat !== seat) continue;
      captures.push.apply(captures, capturePaths(board, seat, i, piece));
      const r = rowOf(i);
      const c = colOf(i);
      dirsFor(seat, piece.king).forEach((dir) => {
        const nr = r + dir[0];
        const nc = c + dir[1];
        if (!inBoard(nr, nc)) return;
        const to = idx(nr, nc);
        if (board[to]) return;
        normals.push({ from: i, to, steps: [{ from: i, to, capture: null }], captured: [], king: !!piece.king || isPromotion(seat, to) });
      });
    }
    if (captures.length && mustCapture) return captures;
    return captures.concat(normals);
  }

  function applyMove(board, move) {
    const piece = board[move.from];
    if (!piece) return;
    board[move.from] = null;
    move.captured.forEach((cell) => { board[cell] = null; });
    board[move.to] = { id: piece.id, seat: piece.seat, king: !!piece.king || isPromotion(piece.seat, move.to) };
  }

  function cloneBoard(board) {
    return board.map((piece) => (piece ? { id: piece.id, seat: piece.seat, king: piece.king } : null));
  }

  /* ------------------------------ تقييم وبحث ------------------------------ */

  function evaluate(board, seat) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      const row = rowOf(i);
      const col = colOf(i);
      let value = 100;
      if (piece.king) value += 65;
      value += (piece.seat === 0 ? 7 - row : row) * 5;
      if (col >= 2 && col <= 5) value += 4;
      if (piece.seat === seat) score += value;
      else score -= value;
    }
    return score;
  }

  function ordered(moves) {
    return moves.slice().sort((a, b) => b.captured.length - a.captured.length);
  }

  function negamax(board, seat, depth, alpha, beta, mustCapture) {
    const moves = allMoves(board, seat, mustCapture);
    if (!moves.length) return -90000 - depth * 100;
    if (depth <= 0) return evaluate(board, seat);
    let best = -Infinity;
    const list = ordered(moves);
    for (let i = 0; i < list.length; i++) {
      const copy = cloneBoard(board);
      applyMove(copy, list[i]);
      const score = -negamax(copy, 1 - seat, depth - 1, -beta, -alpha, mustCapture);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseAiMove(moves, seat) {
    const level = cur().level;
    if (level === "easy") {
      const captures = moves.filter((move) => move.captured.length);
      if (captures.length && Math.random() < 0.7) return U.pick(captures);
      return U.pick(moves);
    }
    const depth = level === "hard" ? 4 : 2;
    let best = null;
    let bestScore = -Infinity;
    ordered(moves).forEach((move) => {
      const copy = cloneBoard(state.board);
      applyMove(copy, move);
      const score = -negamax(copy, 1 - seat, depth - 1, -Infinity, Infinity, state.mustCapture);
      if (score > bestScore) { bestScore = score; best = move; }
    });
    return best || moves[0];
  }

  /* ------------------------------ اللعب ------------------------------ */

  function beginTurn() {
    if (!state || state.over) return;
    state.moves = allMoves(state.board, state.current, state.mustCapture);
    state.selected = null;
    state.busy = false;
    const player = cur();
    if (!state.moves.length) {
      const loser = player;
      const winner = state.players[1 - state.current];
      const pieces = countPieces(state.board, loser.index);
      finish(winner, pieces === 0 ? "لم يتبقَّ لـ" + loser.name + " أي قطعة." : "لا يملك " + loser.name + " أي حركة قانونية.");
      return;
    }
    state.notice = "دور " + player.name + " — اختر قطعة" + (state.mustCapture ? " (الأسر إجباري عند توفره)" : "") + ".";
    updateStatus();
    renderMotion();
    if (player.isCpu && cpuCanAct(player)) {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => cpuTurn(), AI.delay(player.level) + 120);
    }
  }

  function cpuTurn() {
    if (!state || state.over) return;
    const player = cur();
    if (!player.isCpu || !cpuCanAct(player)) return;
    const moves = allMoves(state.board, state.current, state.mustCapture);
    const move = chooseAiMove(moves, state.current);
    if (move) play(move);
  }

  function play(move) {
    if (!state || state.over || state.busy) return;
    const player = cur();
    const legal = state.moves.filter((item) => item.from === move.from && item.to === move.to);
    const chosen = legal[0] || move;
    if (!chosen) return;
    state.busy = true;
    state.selected = null;

    const piece = state.board[chosen.from];
    if (!piece) { state.busy = false; return; }
    const seat = piece.seat;
    let step = 0;

    const tick = () => {
      if (!state || state.over) return;
      if (step < chosen.steps.length) {
        const currentStep = chosen.steps[step];
        step += 1;
        const moving = state.board[currentStep.from];
        state.board[currentStep.from] = null;
        if (currentStep.capture != null) state.board[currentStep.capture] = null;
        state.board[currentStep.to] = moving;
        if (FX) FX.sound(currentStep.capture != null ? "capture" : "move");
        renderMotion();
        moveTimer = setTimeout(tick, currentStep.capture != null ? 210 : 170);
        return;
      }
      const promoted = !piece.king && isPromotion(seat, chosen.to);
      if (promoted) {
        state.board[chosen.to] = { id: piece.id, seat, king: true };
        if (FX) FX.sound("promote");
      }
      const capturedCount = chosen.captured.length;
      const playerName = state.players[seat].name;
      if (apiRef) {
        apiRef.log(
          "<strong>" + esc(playerName) + "</strong> " +
          (capturedCount ? "أكل " + ar(capturedCount) + " قطعة" : "تحرّك") +
          (promoted ? " وترقّى إلى ملك" : "") + ".",
          capturedCount || promoted ? "good" : "accent"
        );
      }
      state.last = { seat, from: chosen.from, to: chosen.to, captured: capturedCount, promoted };
      state.idlePlies = capturedCount || promoted ? 0 : (state.idlePlies || 0) + 1;
      if (capturedCount && FX) FX.banner("أكل " + ar(capturedCount) + "!", { icon: "⚔️", tone: "win", duration: 800 });

      const enemySeat = 1 - seat;
      state.current = enemySeat;
      state.turn += 1;
      state.busy = false;
      renderMotion();
      const enemyMoves = allMoves(state.board, enemySeat, state.mustCapture);
      if (!countPieces(state.board, enemySeat)) {
        finish(state.players[seat], "لم يتبقَّ للخصم أي قطعة.");
        return;
      }
      if (!enemyMoves.length) {
        finish(state.players[seat], "لا يملك الخصم أي حركة قانونية.");
        return;
      }
      if ((state.idlePlies || 0) >= 80) {
        finishDraw();
        return;
      }
      state.moves = enemyMoves;
      state.notice = "دور " + state.players[enemySeat].name + ".";
      renderMotion();
      updateStatus();
      const enemy = state.players[enemySeat];
      if (enemy.isCpu && cpuCanAct(enemy)) {
        clearTimeout(moveTimer);
        moveTimer = setTimeout(() => cpuTurn(), AI.delay(enemy.level) + 150);
      }
    };
    tick();
  }

  function countPieces(board, seat) {
    return board.reduce((sum, piece) => sum + (piece && piece.seat === seat ? 1 : 0), 0);
  }

  function finishDraw() {
    if (!state || state.over) return;
    state.over = true;
    state.winner = null;
    state.busy = false;
    state.standings = state.players.map((player) => ({
      name: player.name,
      value: ar(countPieces(state.board, player.index)) + " قطعة متبقية",
    }));
    state.notice = "تعادل بعد ٤٠ نقلة لكل لاعب دون أكل أو ترقية.";
    if (apiRef) {
      apiRef.gameOver({
        icon: "🤝",
        title: "تعادل",
        text: "مرّت ٤٠ نقلة لكل لاعب دون أكل أو ترقية، فانتهت المباراة بالتعادل وفق قاعدة الـ40 نقلة.",
        winner: "تعادل",
        standings: state.standings,
        tone: "draw",
      });
    }
    renderMotion();
  }

  function finish(winner, reason) {
    if (!state || state.over) return;
    state.over = true;
    state.winner = winner;
    state.busy = false;
    state.standings = state.players
      .slice()
      .sort((a, b) => countPieces(state.board, b.index) - countPieces(state.board, a.index))
      .map((player) => ({
        name: player.name + (player === winner ? " · فائز" : ""),
        value: ar(countPieces(state.board, player.index)) + " قطعة متبقية",
      }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "♟️",
        title: "فاز " + winner.name + "!",
        text: reason,
        winner: winner.name,
        standings: state.standings,
        tone: "win",
      });
    }
    renderMotion();
  }

  function selectPiece(cell) {
    if (!state || state.over || state.busy) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const moves = state.moves.filter((move) => move.from === cell);
    if (!moves.length) {
      if (FX) FX.sound("error");
      return;
    }
    state.selected = cell;
    state.notice = "اختر الوجهة المتوهجة للقطعة المحددة.";
    if (FX) FX.sound("select");
    renderMotion();
  }

  function selectDestination(cell) {
    if (!state || state.selected == null) return;
    const moves = state.moves.filter((move) => move.from === state.selected && move.to === cell);
    if (!moves.length) return;
    play(moves[0]);
  }

  function updateStatus() {
    if (!apiRef || !state || state.over) return;
    const player = cur();
    if (player) apiRef.setStatus("دور " + player.name, "live");
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function squareName(index) {
    return FILES[colOf(index)] + ar(rowOf(index) + 1);
  }

  function boardHTML() {
    const selected = state.selected;
    const destinations = new Set(state.moves.filter((move) => move.from === selected).map((move) => move.to));
    const selectable = new Set(state.moves.map((move) => move.from));
    const mine = humanCanAct(cur());
    let cells = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const i = idx(r, c);
        const dark = (r + c) % 2 === 1;
        const piece = state.board[i];
        const classes = ["ck-cell", dark ? "is-dark" : "is-light"];
        if (selected === i) classes.push("is-selected");
        if (destinations.has(i)) classes.push("is-target");
        if (piece) classes.push("is-occupied");
        cells += '<button type="button" class="' + classes.join(" ") + '" data-ck-cell="' + i + '"' +
          ' aria-label="' + esc(squareName(i)) + (piece ? " — " + (piece.seat === 0 ? "أبيض" : "أسود") + (piece.king ? " ملك" : "") : "") + '">' +
          (piece
            ? '<span class="ck-piece p' + piece.seat + (piece.king ? " is-king" : "") +
              (mine && selectable.has(i) ? " is-live" : "") + '" data-fx-piece="ck' + (piece.id || i) + '"><i></i></span>'
            : "") +
          (destinations.has(i) ? '<span class="ck-target-dot"></span>' : "") +
          "</button>";
      }
    }
    return cells;
  }

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["ck-player", "p" + player.index];
      if (player.index === state.current && !state.over) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      const pieces = countPieces(state.board, player.index);
      const kings = state.board.filter((piece) => piece && piece.seat === player.index && piece.king).length;
      return (
        '<div class="' + classes.join(" ") + '">' +
        BG.playerProfile.playerHTML(player, "ck-player-avatar") +
        '<span class="ck-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + ar(pieces) + " قطعة · " + ar(kings) + " ملك" + (player.isCpu ? " · 🤖" : "") + "</small></span>" +
        '<span class="ck-count">' + ar(pieces) + "</span></div>"
      );
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const top =
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">♟️</span><div><strong>الداما</strong>' +
      "<small>ثمانية على ثمانية — أكل إجباري، أسر متسلسل، وترقية إلى ملك</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">دور <b>' + esc(player ? player.name : "—") + "</b></span>" +
      '<span class="cg-pill">الدور <b>' + ar(state.turn) + "</b></span>" +
      '<span class="cg-pill">' + (state.mustCapture ? "الأسر إجباري" : "الأسر اختياري") + "</span>" +
      (isOnline() ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="ck-board-wrap">' +
      '<div class="ck-board-head"><span class="cg-kicker">لوحة الداما</span>' +
      '<span class="cg-count">' + (state.selected != null ? "القطعة في " + squareName(state.selected) : "اختر قطعة للبدء") + "</span></div>" +
      '<div class="ck-board">' + boardHTML() + "</div>" +
      '<p class="ck-rule-line">القطع البيضاء تتحرك للأعلى، والسوداء للأسفل. الأكل بالقفز فوق قطعة خصم إلى خانة فارغة. الملك يتحرك في كل الاتجاهات.</p>' +
      "</section>";

    const side =
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span></div>' +
      '<div class="ck-players">' + playersHTML() + "</div></div>" +
      '<div class="ck-notice">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel ck-last"><span class="cg-kicker">آخر حركة</span>' +
      (state.last
        ? "<strong>" + esc(squareName(state.last.from)) + " ← " + esc(squareName(state.last.to)) + "</strong>" +
          "<small>" + (state.last.captured ? "أكل " + ar(state.last.captured) + " قطعة" : "حركة عادية") + (state.last.promoted ? " · ترقية" : "") + "</small>"
        : "<small>لم تُنفَّذ حركة بعد.</small>") +
      "</div>" +
      '<div class="cg-panel ck-legend"><span class="cg-kicker">قواعد سريعة</span>' +
      '<p>الأسر إجباري عند توفره، والأسر المتسلسل يُكمل حتى ينتهي. من يملك قطعًا أو حركات أكثر عند توقف الخصم يفوز.</p></div>' +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game ck-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div></div>";
  }

  function renderMotion() {
    if (!rootRef) return;
    const beforeAll = new Map();
    rootRef.querySelectorAll(".ck-piece").forEach((el) => {
      const key = el.getAttribute("data-fx-piece");
      if (key) beforeAll.set(key, el.getBoundingClientRect());
    });
    render();
    if (!beforeAll.size || !rootRef.firstElementChild) return;
    rootRef.querySelectorAll(".ck-piece").forEach((el) => {
      const match = beforeAll.get(el.getAttribute("data-fx-piece"));
      if (!match || !el.animate) return;
      const now = el.getBoundingClientRect();
      const dx = match.left - now.left;
      const dy = match.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const lift = Math.abs(dx) + Math.abs(dy) > 40;
      el.animate(
        [
          { transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + (lift ? "1.08" : "1") + ")", filter: "drop-shadow(0 8px 10px rgba(0,0,0,.4))" },
          { transform: "translate(0,0) scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
        ],
        { duration: lift ? 260 : 190, easing: "cubic-bezier(.22,.9,.28,1)" }
      );
    });
  }

  function onClick(event) {
    if (!state || state.over || state.busy) return;
    const node = event.target.closest ? event.target.closest("[data-ck-cell]") : null;
    if (!node) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const cell = Number(node.getAttribute("data-ck-cell"));
    if (state.selected != null && cell !== state.selected) {
      const target = state.moves.some((move) => move.from === state.selected && move.to === cell);
      if (target) {
        selectDestination(cell);
        return;
      }
    }
    if (state.moves.some((move) => move.from === cell)) selectPiece(cell);
    else if (FX) FX.sound("error");
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "checkers",
    name: "الداما",
    en: "CHECKERS",
    icon: "♟️",
    accent: "#ba68c8",
    cardClass: "card-checkers",
    tagline: "لعبة الداما الكلاسيكية: أكل إجباري، أسر متسلسل، وملوك يجتاحون اللوحة.",
    players: "2",
    duration: "15–30 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: null,

    rules: {
      goal: "أفنِ قطع الخصم أو اجعله بلا حركة قانونية. القطع تتحرك قطريًا، والأكل يتم بالقفز فوق قطعة خصم إلى الخانة الفارغة خلفها.",
      facts: [["اللوحة", "٨×٨"], ["القطع", "١٢ لكل لاعب"], ["الحركة", "قطريًا"], ["الفوز", "إفناء أو تعطيل الخصم"]],
      components: [
        "لوحة ٨×٨ بخانات فاتحة وداكنة، واللعب على الخانات الداكنة فقط.",
        "١٢ قطعة بيضاء و١٢ قطعة سوداء.",
        "القطع العادية تتحرك خطوة واحدة قطريًا للأمام، والملك يتحرك في الاتجاهات الأربعة.",
      ],
      setup: [
        "تُرتّب القطع على الخانات الداكنة في الصفوف الثلاثة الأولى لكل لاعب.",
        "اللاعب الأبيض يبدأ، ثم يتبادل اللاعبان الأدوار.",
        "القطع البيضاء تتقدّم نحو الصفوف العلوية، والسوداء نحو الصفوف السفلية.",
      ],
      steps: [
        "<strong>الحركة العادية:</strong> حرّك قطعة خطوة واحدة قطريًا إلى خانة داكنة فارغة.",
        "<strong>الأكل:</strong> اقفز فوق قطعة خصم مجاورة إلى الخانة الفارغة خلفها، وأزل قطعة الخصم.",
        "<strong>الأسر المتسلسل:</strong> إذا أمكن الأكل مرة أخرى بالقطعة نفسها بعد القفزة، أكمل الأسر في الدور نفسه.",
        "<strong>الإجبار:</strong> إذا وُجد أكل متاح يجب تنفيذه ولو كانت هناك حركة عادية، وهو شرط رسمي في الداما.",
        "<strong>الترقية:</strong> القطعة التي تصل إلى الصف الأخير تصبح ملكًا وتتحرك في الاتجاهات الأربعة. الترقية تُنهي الأسر المتسلسل.",
      ],
      winning: "يفوز اللاعب الذي يأكل جميع قطع الخصم أو يتركه بلا أي حركة قانونية. إذا مرّت ٤٠ نقلة لكل لاعب دون أكل أو ترقية تُعلن المباراة تعادلًا (قاعدة الـ40 نقلة).",
      notes: [
        "القطع العادية لا تملك حركة عكسية، أما الملك فيتحرك للأمام والخلف خطوة واحدة.",
        "الأسر إجباري دائمًا: إذا وُجد أكل متاح وجب تنفيذه، والأسر المتسلسل يكتمل في الدور نفسه.",
        "الترقية إلى ملك تحدث عند الوصول إلى الصف الأخير، وتُنهي الأسر المتسلسل في القواعد الأمريكية.",
        "تُعلن قاعدة الـ40 نقلة (80 نصف نقلة) تعادلًا عند مرور 40 دورًا لكل لاعب دون أكل أو ترقية.",
        "المستوى «صعب» يستخدم بحثًا أعمق لتقييم الأسر والتمركز.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(moveTimer);
      state = newState(api.options || {});
      apiRef.log("بدأت الداما — الأبيض يتحرك أولًا والأسر إجباري وفق القواعد الرسمية.", "accent");
      beginTurn();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render: renderMotion,
          allMoves,
          play,
          selectPiece,
          selectDestination,
          applyMove,
          chooseAiMove,
          negamax,
          countPieces,
          cloneBoard,
          beginTurn,
          setCurrent(seat) {
            if (!state) return;
            state.current = U.clamp(Number(seat) || 0, 0, 1);
            beginTurn();
          },
          forceMove(from, to) {
            if (!state) return;
            const move = state.moves.find((item) => item.from === from && item.to === to);
            if (move) play(move);
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(moveTimer);
          state = BG.netCodec.decode(data);
          state.board = Array.isArray(state.board) ? state.board : initialBoard();
          state.board.forEach((piece) => {
            if (piece && !piece.id) piece.id = newPieceId();
          });
          state.moves = allMoves(state.board, state.current, state.mustCapture);
          state.selected = null;
          state.busy = false;
          renderMotion();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          state.moves = allMoves(state.board, state.current, state.mustCapture);
          renderMotion();
          const player = cur();
          if (player && player.isCpu && cpuCanAct(player)) {
            clearTimeout(moveTimer);
            moveTimer = setTimeout(() => cpuTurn(), AI.delay(player.level));
          }
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(moveTimer);
          moveTimer = null;
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
