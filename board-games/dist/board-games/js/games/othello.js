/* ==========================================================================
   أوتيلو / ريفيرسي — ثمانية على ثمانية
   قلْب الخطوط، تمرير تلقائي، وذكاء اصطناعي ببحث minimax.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;

  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const SIZE = 8;
  const CELLS = SIZE * SIZE;
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const FILES = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];

  /* قيم مواقع هادئة: الأركان تغري، والمربعات المجاورة لها خطر */
  const WEIGHTS = [
    [120, -24, 18, 8, 8, 18, -24, 120],
    [-24, -42, -6, -6, -6, -6, -42, -24],
    [18, -6, 10, 4, 4, 10, -6, 18],
    [8, -6, 4, 2, 2, 4, -6, 8],
    [8, -6, 4, 2, 2, 4, -6, 8],
    [18, -6, 10, 4, 4, 10, -6, 18],
    [-24, -42, -6, -6, -6, -6, -42, -24],
    [120, -24, 18, 8, 8, 18, -24, 120],
  ];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let animTimer = null;

  const esc = (value) => U.escape(value);
  const ar = (value) => String(value).replace(/[0-9]/g, (digit) => AR_DIGITS[Number(digit)]);
  const idx = (row, col) => row * SIZE + col;
  const rowOf = (cell) => Math.floor(cell / SIZE);
  const colOf = (cell) => cell % SIZE;
  const inside = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  const other = (seat) => (seat === 0 ? 1 : 0);

  function squareName(cell) {
    return FILES[colOf(cell)] + ar(SIZE - rowOf(cell));
  }

  /* ------------------------------ الحالة ------------------------------ */

  function initialBoard() {
    const board = new Array(CELLS).fill(null);
    board[idx(3, 3)] = 1;
    board[idx(4, 4)] = 1;
    board[idx(3, 4)] = 0;
    board[idx(4, 3)] = 0;
    return board;
  }

  function normalizePlayers(list) {
    const source = Array.isArray(list) ? list : [];
    const fallback = (apiRef && apiRef.players) || [];
    return [0, 1].map((index) => {
      const player = source[index] || fallback[index] || {};
      const isCpu = AI ? AI.isCpu(player) : player.type === "cpu" || player.isCpu === true;
      return {
        index,
        name: player.name || (index === 0 ? "الداكن" : "الفاتح"),
        type: isCpu ? "cpu" : "human",
        level: AI ? AI.level(player.level) : player.level || "normal",
        isCpu,
      };
    });
  }

  function makePlayers() {
    return normalizePlayers(apiRef ? apiRef.players : []);
  }

  function newState() {
    return {
      board: initialBoard(),
      players: makePlayers(),
      current: 0,
      moves: [],
      passes: 0,
      turn: 1,
      last: null,
      notice: "ضع قرصًا على خانة قانونية لتقلب صفوف الخصم.",
      over: false,
      winner: null,
      standings: [],
      thinking: false,
      busy: false,
      aiToken: 0,
      playAnim: false,
    };
  }

  function cur() {
    return state && state.players ? state.players[state.current] : null;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function isSpectator() {
    return !!(apiRef && apiRef.net && apiRef.net.spectate);
  }

  function humanCanAct(player) {
    if (!state || !player || state.over || state.busy || state.thinking) return false;
    if (state.current !== player.index) return false;
    if (isOnline()) {
      const net = apiRef.net;
      if (!net || net.seat !== player.index) return false;
      if (net.isCpuSeat && net.isCpuSeat(player.index)) return false;
      return !isSpectator();
    }
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    if (!state || !player || !player.isCpu || state.over) return false;
    if (state.current !== player.index) return false;
    if (isSpectator()) return false;
    return AI ? AI.autoAllowed(apiRef, player) : true;
  }

  /* ------------------------------ الحركات ------------------------------ */

  function flipsFor(board, seat, cell) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return null;
    if (board[cell] != null) return null;
    const row = rowOf(cell);
    const col = colOf(cell);
    let found = [];
    for (let d = 0; d < DIRS.length; d++) {
      const dr = DIRS[d][0];
      const dc = DIRS[d][1];
      let r = row + dr;
      let c = col + dc;
      const line = [];
      while (inside(r, c) && board[idx(r, c)] === other(seat)) {
        line.push(idx(r, c));
        r += dr;
        c += dc;
      }
      if (line.length && inside(r, c) && board[idx(r, c)] === seat) {
        found = found.concat(line);
      }
    }
    return found.length ? found : null;
  }

  function legalMoves(board, seat) {
    const moves = [];
    for (let cell = 0; cell < CELLS; cell++) {
      const flips = flipsFor(board, seat, cell);
      if (!flips) continue;
      moves.push({
        cell,
        row: rowOf(cell),
        col: colOf(cell),
        flips,
        corner: (rowOf(cell) === 0 || rowOf(cell) === SIZE - 1) && (colOf(cell) === 0 || colOf(cell) === SIZE - 1),
      });
    }
    return moves;
  }

  function applyToBoard(board, seat, cell, flips) {
    board[cell] = seat;
    for (let i = 0; i < flips.length; i++) board[flips[i]] = seat;
  }

  function countDiscs(board, seat) {
    let count = 0;
    for (let i = 0; i < CELLS; i++) if (board[i] === seat) count += 1;
    return count;
  }

  function emptyCells(board) {
    let count = 0;
    for (let i = 0; i < CELLS; i++) if (board[i] == null) count += 1;
    return count;
  }

  /* ------------------------------ التقييم والبحث ------------------------------ */

  function finalScore(board, seat) {
    const mine = countDiscs(board, seat);
    const theirs = countDiscs(board, other(seat));
    if (mine > theirs) return 100000 + (mine - theirs);
    if (mine < theirs) return -100000 + (mine - theirs);
    return 0;
  }

  function evaluate(board, seat) {
    const empties = emptyCells(board);
    const myMoves = legalMoves(board, seat).length;
    const oppMoves = legalMoves(board, other(seat)).length;
    if (!myMoves && !oppMoves) return finalScore(board, seat);

    let positional = 0;
    let mine = 0;
    let theirs = 0;
    for (let cell = 0; cell < CELLS; cell++) {
      const value = board[cell];
      if (value == null) continue;
      const weight = WEIGHTS[rowOf(cell)][colOf(cell)];
      if (value === seat) {
        mine += 1;
        positional += weight;
      } else {
        theirs += 1;
        positional -= weight;
      }
    }

    let score = positional + (myMoves - oppMoves) * 10 + (mine - theirs) * 1.35;
    if (empties <= 18) score += (mine - theirs) * (19 - empties) * 1.6;
    return score;
  }

  function orderedMoves(moves) {
    return moves.slice().sort((a, b) => {
      if (a.corner !== b.corner) return a.corner ? -1 : 1;
      return b.flips.length - a.flips.length;
    });
  }

  function negamax(board, seat, depth, alpha, beta) {
    if (depth <= 0) return evaluate(board, seat);
    const moves = legalMoves(board, seat);
    if (!moves.length) {
      if (!legalMoves(board, other(seat)).length) return finalScore(board, seat);
      return -negamax(board, other(seat), depth - 1, -beta, -alpha);
    }
    let best = -Infinity;
    const list = orderedMoves(moves);
    for (let i = 0; i < list.length; i++) {
      const move = list[i];
      const next = board.slice();
      applyToBoard(next, seat, move.cell, move.flips);
      const score = -negamax(next, other(seat), depth - 1, -beta, -alpha);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseAiMove(seat) {
    if (!state) return null;
    const moves = legalMoves(state.board, seat);
    if (!moves.length) return null;
    const player = state.players[seat];
    const level = (player && player.level) || "normal";
    if (level === "easy" && Math.random() < 0.3) return U.pick(moves);
    const depth = level === "easy" ? 2 : level === "normal" ? 3 : 4;
    const jitter = level === "easy" ? 2 : level === "normal" ? 0.4 : 0;
    let best = moves[0];
    let bestScore = -Infinity;
    const list = orderedMoves(moves);
    for (let i = 0; i < list.length; i++) {
      const move = list[i];
      const next = state.board.slice();
      applyToBoard(next, seat, move.cell, move.flips);
      let score = -negamax(next, other(seat), depth - 1, -Infinity, Infinity);
      if (jitter) score += (Math.random() - 0.5) * jitter * 2;
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }
    return best;
  }

  /* ------------------------------ مجرى اللعب ------------------------------ */

  function updateStatus() {
    if (!apiRef || !apiRef.setStatus || !state || state.over) return;
    const player = cur();
    if (!player) return;
    apiRef.setStatus(state.thinking ? "الكمبيوتر يفكر" : "دور " + player.name, "live");
  }

  function scheduleAi(player) {
    if (!state || !aiRunner || !player) return;
    const token = state.aiToken + 1;
    state.aiToken = token;
    aiRunner.later(() => {
      if (!state || state.over || token !== state.aiToken) return;
      if (state.current !== player.index || !cpuCanAct(player)) {
        state.thinking = false;
        updateStatus();
        return;
      }
      state.thinking = false;
      const move = chooseAiMove(state.current);
      if (move) playMove(move.cell);
      else beginTurn();
    }, AI ? AI.delay(player.level) + 180 : 450);
  }

  function presentTurn(prefix) {
    const player = cur();
    if (!player) return;
    state.thinking = !!(player.isCpu && cpuCanAct(player));
    const available = state.moves.length === 1 ? "حركة قانونية واحدة" : ar(state.moves.length) + " حركات قانونية";
    const base = state.thinking
      ? "دور " + player.name + " — الكمبيوتر يفكر..."
      : "دور " + player.name + " — " + available + ".";
    state.notice = prefix ? prefix + " " + base : base;
    updateStatus();
    render();
    if (state.thinking) scheduleAi(player);
  }

  function beginTurn() {
    if (!state || state.over) return;
    state.busy = false;
    state.thinking = false;
    let moves = legalMoves(state.board, state.current);

    if (!moves.length) {
      const skipped = cur();
      const nextSeat = other(state.current);
      const nextMoves = legalMoves(state.board, nextSeat);
      if (!nextMoves.length) {
        finish();
        return;
      }
      state.passes += 1;
      state.current = nextSeat;
      state.moves = nextMoves;
      if (apiRef && apiRef.log) {
        apiRef.log("لا حركة قانونية لـ <strong>" + esc(skipped.name) + "</strong>؛ تمرير تلقائي.", "warn");
      }
      if (FX) FX.sound("pass");
      presentTurn("لا حركة لـ " + skipped.name + " — تمرير تلقائي إلى " + cur().name + ".");
      return;
    }

    state.moves = moves;
    presentTurn("");
  }

  function playMove(a, b) {
    if (!state || state.over) return false;
    const cell = cellFrom(a, b);
    if (cell < 0) return false;
    const seat = state.current;
    const move = legalMoves(state.board, seat).find((item) => item.cell === cell);
    if (!move) {
      if (FX) FX.sound("error");
      return false;
    }

    state.thinking = false;
    applyToBoard(state.board, seat, cell, move.flips);
    state.last = { seat, cell, flips: move.flips.slice() };
    state.turn += 1;
    state.playAnim = true;
    if (animTimer) clearTimeout(animTimer);
    animTimer = setTimeout(() => { if (state) state.playAnim = false; }, 620);

    const player = state.players[seat];
    if (apiRef && apiRef.log) {
      const kind = move.flips.length >= 3 ? "good" : "accent";
      apiRef.log(
        "<strong>" + esc(player.name) + "</strong> وضع قرصًا في " + esc(squareName(cell)) +
        " وقلب " + ar(move.flips.length) + ".",
        kind
      );
    }
    if (FX) FX.sound("place");
    if (FX && move.flips.length >= 4) {
      FX.banner("قلب " + ar(move.flips.length) + " قطع!", { icon: "◐", tone: "win", duration: 780 });
    }

    state.current = other(seat);
    beginTurn();
    return true;
  }

  function finish() {
    if (!state || state.over) return;
    state.over = true;
    state.thinking = false;
    state.busy = false;
    state.moves = [];

    const dark = countDiscs(state.board, 0);
    const light = countDiscs(state.board, 1);
    const full = emptyCells(state.board) === 0;
    let winnerSeat = null;
    if (dark > light) winnerSeat = 0;
    else if (light > dark) winnerSeat = 1;
    state.winner = winnerSeat;

    const sorted = state.players.slice().sort((a, b) => countDiscs(state.board, b.index) - countDiscs(state.board, a.index));
    state.standings = sorted.map((player) => ({
      name: player.name + (winnerSeat != null && player.index === winnerSeat ? " · فائز" : ""),
      value: ar(countDiscs(state.board, player.index)) + " قطعة",
    }));

    const reason = full
      ? "اكتمل اللوح بالأقراص. "
      : "لم يجد أي لاعب حركة قانونية. ";
    const result = winnerSeat == null ? "تعادل " + ar(dark) + "–" + ar(light) + "." : "النتيجة " + ar(dark) + "–" + ar(light) + ".";
    state.notice = reason + result;
    if (apiRef && apiRef.setStatus) apiRef.setStatus("انتهت", "over");

    if (apiRef && apiRef.gameOver) {
      apiRef.gameOver({
        icon: "◐",
        title: winnerSeat == null ? "تعادل في أوتيلو" : "فاز " + state.players[winnerSeat].name + "!",
        text: reason + "الداكن " + ar(dark) + " — الفاتح " + ar(light) + ".",
        winner: winnerSeat == null ? "تعادل" : state.players[winnerSeat].name,
        standings: state.standings,
        tone: winnerSeat == null ? "draw" : "win",
      });
    }
    render();
  }

  function cellFrom(a, b) {
    if (Array.isArray(a)) return idx(Number(a[0]), Number(a[1]));
    if (a && typeof a === "object") {
      if (Number.isInteger(a.cell)) return a.cell;
      if (Number.isInteger(a.row) && Number.isInteger(a.col)) return idx(a.row, a.col);
      return -1;
    }
    if (b !== undefined) return idx(Number(a), Number(b));
    const value = Number(a);
    return Number.isInteger(value) && value >= 0 && value < CELLS ? value : -1;
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function emblem() {
    return (
      '<svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" focusable="false">' +
      '<circle cx="24" cy="24" r="18" fill="#efe4ce" stroke="rgba(9,30,26,.45)" stroke-width="1.4"/>' +
      '<path d="M24 6a18 18 0 0 1 0 36z" fill="#203f37"/>' +
      '<circle cx="24" cy="24" r="10.5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.1"/>' +
      "</svg>"
    );
  }

  function boardHTML(mine) {
    const legal = new Map();
    if (!state.over) state.moves.forEach((move) => legal.set(move.cell, move));
    const last = state.last;
    let cells = "";
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = idx(row, col);
        const piece = state.board[cell];
        const move = legal.get(cell);
        const isLegal = !!(mine && move);
        const classes = ["ot-cell", (row + col) % 2 === 0 ? "is-even" : "is-odd"];
        if (isLegal) classes.push("is-legal");
        if (last && last.cell === cell) classes.push("is-last");
        if (piece != null && last && state.playAnim && last.flips && last.flips.indexOf(cell) >= 0) {
          classes.push("is-flipping");
        }
        let label = squareName(cell);
        if (piece != null) label += piece === 0 ? " — قرص داكن" : " — قرص فاتح";
        if (isLegal) label += " — حركة قانونية تقلب " + ar(move.flips.length);
        cells +=
          '<button type="button" class="' + classes.join(" ") + '" data-ot-cell="' + cell + '"' +
          ' aria-label="' + esc(label) + '"' + (isLegal ? "" : ' aria-disabled="true"') + ">" +
          (piece != null
            ? '<span class="ot-disc p' + piece + (last && last.cell === cell ? " is-new" : "") + '"></span>'
            : "") +
          (isLegal ? '<span class="ot-marker" aria-hidden="true"></span>' : "") +
          "</button>";
      }
    }
    return cells;
  }

  function playersHTML() {
    return state.players.map((player) => {
      const count = countDiscs(state.board, player.index);
      const total = countDiscs(state.board, 0) + countDiscs(state.board, 1);
      const share = total ? Math.round((count / total) * 100) : 0;
      const classes = ["ot-player", "p" + player.index];
      if (!state.over && player.index === state.current) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      const mine = isOnline() && apiRef.net.seat === player.index;
      return (
        '<div class="' + classes.join(" ") + '">' +
        '<span class="ot-swatch p' + player.index + '" aria-hidden="true"></span>' +
        '<span class="ot-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + ar(count) + " قرص · " + ar(share) + "%" +
        (player.isCpu ? " · 🤖" : "") + (mine ? " · أنت" : "") + "</small></span>" +
        '<span class="ot-count">' + ar(count) + "</span></div>"
      );
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    hoverReset();
    const player = cur() || state.players[0];
    const mine = humanCanAct(player);
    const dark = countDiscs(state.board, 0);
    const light = countDiscs(state.board, 1);
    const total = dark + light || 1;
    const darkPct = Math.round((dark / total) * 100);
    const lightPct = 100 - darkPct;
    const online = isOnline();
    const last = state.last;
    const lastPlayer = last ? state.players[last.seat] : null;

    const top =
      '<div class="cg-top ot-top">' +
      '<div class="cg-brand"><span class="cg-emblem ot-emblem" aria-hidden="true">' + emblem() + "</span>" +
      "<div><strong>أوتيلو</strong><small>ريفيرسي — كل قلبة تغيّر ميزان اللوح</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">الدور <b>' + esc(player.name) + "</b></span>" +
      '<span class="cg-pill">الحركة <b>' + ar(state.turn) + "</b></span>" +
      '<span class="cg-pill">تمرير <b>' + ar(state.passes) + "</b></span>" +
      (state.thinking ? '<span class="cg-pill ot-thinking">الكمبيوتر يفكر…</span>' : "") +
      (online ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="ot-board-wrap">' +
      '<div class="ot-board-head"><span class="cg-kicker">رقعة ٨×٨</span>' +
      '<span class="cg-count">' + (state.over ? "انتهت المباراة" : ar(state.moves.length) + " حركة متاحة") + "</span></div>" +
      '<div class="ot-share" role="img" aria-label="الداكن ' + ar(dark) + " والفاتح " + ar(light) + '">' +
      '<span class="ot-share-dark" style="width:' + darkPct + '%"></span>' +
      '<span class="ot-share-light" style="width:' + lightPct + '%"></span>' +
      "</div>" +
      '<div class="ot-board-shell"><div class="ot-board" role="group" aria-label="رقعة أوتيلو ثمانية في ثمانية">' +
      boardHTML(mine) + "</div></div>" +
      '<p class="ot-rule-line">اختر خانة بدائرة ذهبية. كل قرص يوضع يجب أن يقلب خطًا متصلًا من أقراص الخصم.</p>' +
      "</section>";

    const side =
      '<aside class="cg-side ot-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span>' +
      '<span class="cg-count">' + ar(total) + " قرص</span></div>" +
      '<div class="ot-players">' + playersHTML() + "</div></div>" +
      '<div class="ot-notice" role="status">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel ot-last"><span class="cg-kicker">آخر حركة</span>' +
      (last
        ? "<strong>" + esc(squareName(last.cell)) + "</strong><small>" +
          esc(lastPlayer ? lastPlayer.name : "") + " · قلب " + ar((last.flips || []).length) + " قرص</small>"
        : "<small>لم تُنفَّذ حركة بعد.</small>") +
      "</div>" +
      '<div class="cg-panel ot-hint"><span class="cg-kicker">قواعد سريعة</span>' +
      '<p>إن لم تملك حركة، يمرّر الدور تلقائيًا. تنتهي المباراة عند امتلاء اللوح أو توقف الطرفين، ويفوز صاحب الأقراص الأكثر.</p></div>' +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game ot-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div></div>";
  }

  function hoverReset() {
    /* لا توجد حالة تحويم محفوظة في أوتيلو؛ الدالة تُبقي الواجهة متسقة مع غيرها. */
  }

  function onClick(event) {
    if (!state || state.over || state.thinking || state.busy) return;
    const node = event.target && event.target.closest ? event.target.closest("[data-ot-cell]") : null;
    if (!node) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const cell = Number(node.getAttribute("data-ot-cell"));
    const move = state.moves.some((item) => item.cell === cell);
    if (!move) {
      if (FX) FX.sound("error");
      return;
    }
    playMove(cell);
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "othello",
    name: "أوتيلو",
    en: "OTHELLO · REVERSI",
    icon: "◐",
    accent: "#8fbfa9",
    cardClass: "card-othello",
    tagline: "اقلب صفوف الخصم، واحتفظ بالأركان، وانتزع أغلبية الأقراص في ريفيرسي.",
    players: "2",
    duration: "15–25 دقيقة",
    complexity: "سهلة–متوسطة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: null,

    rules: {
      goal: "أنه المباراة بأكبر عدد من الأقراص على اللوح. كل حركة يجب أن تقلب خطًا متصلًا من أقراص الخصم إلى لونك، واللاعب الذي يملك الأكثرية عند توقف اللعب يفوز.",
      facts: [
        ["اللوحة", "٨×٨ = ٦٤ خانة"],
        ["الأقراص", "٦٤ قرصًا ذا وجهين"],
        ["البداية", "أربعة أقراص في المركز"],
        ["الفوز", "أغلبية الأقراص"],
      ],
      components: [
        "لوحة ٨×٨ بخانات متناوبة الظل، وليست كل الخانات مطلوبة للحركة.",
        "٦٤ قرصًا: وجه داكن ووجه فاتح، ويُقلب القرص عند تغيير ملكيته.",
        "لاعبان: الداكن يبدأ المباراة، ثم يتناوبان.",
      ],
      setup: [
        "توضع أربعة أقراص في مربع المركز: قرصان داكنان على القطر، وقرصان فاتحان على القطر الآخر.",
        "يكون القرصان الفاتحان في d4 وe5، والداكنان في e4 وd5 بترميز الشطرنج.",
        "اللاعب صاحب الأقراص الداكنة يبدأ، ويبحث عن حركة تقلب قرصًا واحدًا على الأقل.",
      ],
      steps: [
        "<strong>الحركة القانونية:</strong> ضع قرصًا في خانة فارغة بحيث تحصر بينه وبين قرص من لونك خطًا متصلًا من أقراص الخصم.",
        "<strong>القلب:</strong> اقلب كل أقراص الخصم المحصورة في ذلك الخط إلى لونك، ويمكن أن تقلب في أكثر من اتجاه في الحركة نفسها.",
        "<strong>التمرير:</strong> إذا لم تجد أي حركة قانونية، يمرّر دورك تلقائيًا إلى الخصم. لا يُسمح بالتخلي عن الدور إن كانت لديك حركة.",
        "<strong>النهاية:</strong> تنتهي المباراة عند امتلاء اللوح، أو عندما لا يملك الطرفان أي حركة قانونية.",
      ],
      winning: "يفوز اللاعب الذي يملك أكبر عدد من الأقراص عند نهاية المباراة. إذا تعادل العدد تكون النتيجة تعادلًا.",
      notes: [
        "النسخة الرقمية تُظهر الحركات القانونية بدوائر ذهبية، وتقلب الأقراص مباشرة بعد تأكيد الحركة.",
        "التمرير تلقائي، ولا يمكن للاعب تخطي دوره طالما توجد حركة قانونية.",
        "الأركان قوية لأنها لا تُقلب، والمربعات المجاورة للأركان قد تمنح الخصم وصولًا إليها.",
        "الذكاء الاصطناعي يستخدم minimax بعمق ٣–٤ مع تقييم يعطي وزنًا للأركان وعدد الحركات المتاحة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI ? AI.runner() : null;
      if (aiRunner) aiRunner.clear();
      if (animTimer) clearTimeout(animTimer);
      animTimer = null;
      state = newState();
      if (apiRef && apiRef.log) {
        apiRef.log("بدأت أوتيلو — الداكن يتحرك أولًا، والقلب شرط لكل حركة.", "accent");
      }
      beginTurn();
      root.addEventListener("click", onClick);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state ? state.players : []; },
          render,
          legalMoves(seat) {
            if (!state) return [];
            const value = seat == null ? state.current : Number(seat) === 1 ? 1 : 0;
            return legalMoves(state.board, value);
          },
          playMove,
          aiMove(seat) {
            if (!state || state.over) return null;
            const value = seat == null ? state.current : Number(seat) === 1 ? 1 : 0;
            const move = chooseAiMove(value);
            if (move && value === state.current) playMove(move.cell);
            return move;
          },
          chooseAiMove,
          negamax,
          evaluate,
          beginTurn,
          countDiscs,
          squareName,
          setBoard(values, current) {
            if (!state) return;
            const next = new Array(CELLS).fill(null);
            (values || []).slice(0, CELLS).forEach((value, index) => {
              if (value === 0 || value === 1) next[index] = value;
            });
            state.board = next;
            state.current = Number(current) === 1 ? 1 : 0;
            state.over = false;
            state.winner = null;
            state.standings = [];
            state.last = null;
            state.passes = 0;
            state.turn = 1;
            state.playAnim = false;
            beginTurn();
          },
        };
      }

      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          if (BG.closeDialogs) BG.closeDialogs();
          if (aiRunner) aiRunner.clear();
          if (animTimer) clearTimeout(animTimer);
          animTimer = null;
          const decoded = BG.netCodec.decode(data);
          if (!decoded || !Array.isArray(decoded.board)) return;
          const fresh = newState();
          state = Object.assign(fresh, decoded);
          const board = new Array(CELLS).fill(null);
          decoded.board.slice(0, CELLS).forEach((value, index) => {
            if (value === 0 || value === 1) board[index] = value;
          });
          state.board = board;
          state.players = normalizePlayers(decoded.players);
          state.current = Number(decoded.current) === 1 ? 1 : 0;
          state.turn = Math.max(1, Number(decoded.turn) || 1);
          state.passes = Math.max(0, Number(decoded.passes) || 0);
          state.over = !!decoded.over;
          state.winner = decoded.winner === 0 || decoded.winner === 1 ? decoded.winner : null;
          state.standings = Array.isArray(decoded.standings) ? decoded.standings : [];
          state.last = decoded.last && Number.isInteger(decoded.last.cell)
            ? {
                seat: Number(decoded.last.seat) === 1 ? 1 : 0,
                cell: decoded.last.cell,
                flips: Array.isArray(decoded.last.flips) ? decoded.last.flips.slice() : [],
              }
            : null;
          state.thinking = false;
          state.busy = false;
          state.aiToken = 0;
          state.playAnim = false;
          state.moves = legalMoves(state.board, state.current);
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          if (state.over) {
            render();
            return;
          }
          state.busy = false;
          state.thinking = false;
          beginTurn();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (animTimer) clearTimeout(animTimer);
          animTimer = null;
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
