/* ==========================================================================
   كونكت فور — أربع في صف
   لوح 7×6، إسقاط الجاذبية، فحص فوز، وبحث ألفا-بيتا مع منع الخسارة الفورية.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const ROWS = 6;
  const COLS = 7;
  const CELLS = ROWS * COLS;
  const WIN_LINES = [];

  (function buildLines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        [[0, 1], [1, 0], [1, 1], [1, -1]].forEach(([dr, dc]) => {
          const line = [];
          for (let k = 0; k < 4; k++) {
            const rr = r + dr * k;
            const cc = c + dc * k;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
            line.push(rr * COLS + cc);
          }
          WIN_LINES.push(line);
        });
      }
    }
  })();

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  const other = (seat) => (seat === 0 ? 1 : 0);

  function makePlayers() {
    return XG.players(apiRef, 2, ["#d96a56", "#e7b958"]).map((player, index) => {
      player.color = index === 0 ? "#d96a56" : "#e7b958";
      return player;
    });
  }

  function newState() {
    return {
      board: new Array(CELLS).fill(null),
      players: makePlayers(),
      current: 0,
      last: null,
      winning: [],
      moves: 0,
      notice: "الدور للأحمر — اختر عمودًا لإسقاط قطعة.",
      over: false,
    };
  }

  function cur() { return state.players[state.current]; }

  function dropRow(board, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      const at = r * COLS + col;
      if (board[at] == null) return r;
    }
    return -1;
  }

  function legalCols(board) {
    const cols = [];
    for (let c = 0; c < COLS; c++) if (board[c] == null) cols.push(c);
    return cols;
  }

  function winningLine(board, seat) {
    for (const line of WIN_LINES) {
      if (line.every((at) => board[at] === seat)) return line;
    }
    return [];
  }

  function drop(col) {
    if (!state || state.over) return false;
    if (!XG.canAct(apiRef, state, state.current, state.over)) return false;
    const row = dropRow(state.board, col);
    if (row < 0) {
      apiRef.toast("العمود ممتلئ.", "warn");
      return false;
    }
    const at = row * COLS + col;
    const seat = state.current;
    state.board[at] = seat;
    state.last = at;
    state.moves += 1;
    const line = winningLine(state.board, seat);
    apiRef.log("<strong>" + esc(cur().name) + "</strong> أسقط قطعة في العمود " + ar(col + 1) + ".", "accent");
    if (line.length) {
      state.winning = line;
      finish(seat);
      return true;
    }
    if (state.moves >= CELLS) {
      finish(null);
      return true;
    }
    state.current = other(seat);
    state.notice = "الدور لـ" + cur().name + " — اختر عمودًا.";
    finishTurn();
    return true;
  }

  function finishTurn() {
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function finish(winner) {
    state.over = true;
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: winner == null ? 0 : winner === p.index ? 1 : 0,
    })).sort((a, b) => b.value - a.value);
    apiRef.setStatus("انتهت اللعبة", "over");
    if (winner == null) {
      state.notice = "امتلأ اللوح — تعادل.";
      apiRef.log("امتلأ اللوح: تعادل.", "warn");
    } else {
      state.notice = "فاز " + state.players[winner].name + " بأربع قطع متصلة.";
      apiRef.log("<strong>" + esc(state.players[winner].name) + "</strong> حقق أربع قطع متصلة وفاز!", "accent");
    }
    render();
    apiRef.gameOver({
      title: winner == null ? "تعادل في كونكت فور" : "انتهت كونكت فور",
      text: winner == null ? "امتلأ اللوح دون أن يكمل أي لاعب أربع قطع." : "أربع قطع متصلة أفقيًا أو عموديًا أو قطريًا.",
      winner: winner == null ? "تعادل" : state.players[winner].name,
      icon: "🔴",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function evaluate(board, seat) {
    const opp = other(seat);
    let score = 0;
    const center = [3, 10, 17, 24, 31, 38];
    center.forEach((at) => {
      if (board[at] === seat) score += 6;
      else if (board[at] === opp) score -= 6;
    });
    for (const line of WIN_LINES) {
      let mine = 0;
      let theirs = 0;
      let empty = 0;
      for (const at of line) {
        if (board[at] === seat) mine += 1;
        else if (board[at] === opp) theirs += 1;
        else empty += 1;
      }
      if (mine && theirs) continue;
      if (mine === 3 && empty === 1) score += 120;
      else if (mine === 2 && empty === 2) score += 14;
      else if (theirs === 3 && empty === 1) score -= 150;
      else if (theirs === 2 && empty === 2) score -= 18;
    }
    return score;
  }

  function search(board, seat, depth, alpha, beta, turn) {
    const winning = winningLine(board, turn);
    if (winning.length) return turn === seat ? 100000 + depth * 100 : -100000 - depth * 100;
    if (depth === 0) return evaluate(board, seat);
    const cols = legalCols(board);
    if (!cols.length) return 0;
    const maximizing = turn === seat;
    let best = maximizing ? -Infinity : Infinity;
    const ordered = cols.slice().sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
    for (const col of ordered) {
      const row = dropRow(board, col);
      const next = board.slice();
      next[row * COLS + col] = turn;
      const value = search(next, seat, depth - 1, alpha, beta, other(turn));
      if (maximizing) {
        best = Math.max(best, value);
        alpha = Math.max(alpha, value);
      } else {
        best = Math.min(best, value);
        beta = Math.min(beta, value);
      }
      if (beta <= alpha) break;
    }
    return best;
  }

  function bestMove(seat, level) {
    const cols = legalCols(state.board);
    if (!cols.length) return null;
    const depth = level === "easy" ? 2 : level === "normal" ? 4 : level === "hard" ? 5 : 6;
    let best = cols[0];
    let bestValue = -Infinity;
    for (const col of cols.slice().sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b))) {
      const row = dropRow(state.board, col);
      const next = state.board.slice();
      next[row * COLS + col] = seat;
      let value = search(next, seat, depth - 1, -Infinity, Infinity, other(seat));
      if (level === "easy" || level === "normal") value += Math.random() * 30;
      if (value > bestValue) { bestValue = value; best = col; }
    }
    return best;
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const col = bestMove(state.current, cur().level);
    if (col == null) return;
    drop(col);
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.9));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function render() {
    if (!rootRef || !state) return;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const winSet = new Set(state.winning);
    const colButtons = [];
    for (let c = 0; c < COLS; c++) {
      const full = state.board[c] != null;
      colButtons.push(
        '<button type="button" class="c4-drop" data-c4-col="' + c + '" ' +
        (!can || full || state.over ? "disabled" : "") + ' aria-label="أسقط في العمود ' + ar(c + 1) + '">' +
        (full ? "✕" : "▼") + "</button>"
      );
    }
    let cells = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const at = r * COLS + c;
        const seat = state.board[at];
        const cls = "c4-cell" + (seat != null ? " is-p" + seat : "") + (winSet.has(at) ? " is-win" : "") + (state.last === at ? " is-last" : "");
        cells += '<div class="' + cls + '" role="gridcell" aria-label="صف ' + ar(r + 1) + " عمود " + ar(c + 1) + '">' +
          (seat != null ? "<span></span>" : "") + "</div>";
      }
    }
    const chips = state.players.map((p) => XG.chip(esc(p.name), state.current === p.index && !state.over ? "دوره" : "", state.current === p.index ? "is-live" : "")).join("");
    rootRef.innerHTML =
      '<div class="xg c4">' +
      XG.bar("كونكت فور", "أربع قطع متصلة · 7 أعمدة × 6 صفوف", chips) +
      '<div class="c4-wrap"><div class="c4-drops">' + colButtons.join("") + "</div>" +
      '<div class="c4-board" role="grid" aria-label="لوح كونكت فور">' + cells + "</div>" +
      '<p class="c4-note">' + esc(state.notice) + "</p></div>" +
      "</div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const btn = event.target.closest("[data-c4-col]");
    if (!btn) return;
    drop(Number(btn.dataset.c4Col));
  }

  const game = {
    id: "connect-four",
    name: "كونكت فور",
    en: "CONNECT FOUR",
    icon: "🔴",
    accent: "#d88355",
    cardClass: "card-connect-four",
    tagline: "أسقط قطعك في الأعمدة، وكن أول من يصل بأربع قطع متصلة.",
    players: "2",
    duration: "5–15 دقيقة",
    complexity: "سهلة جدًا",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "لعبة لاعبين على لوح 7 أعمدة و6 صفوف.",
      defaults: {},
      fields: [],
      summary() { return "7×6 · أربع متصلة"; },
    },

    rules: {
      goal: "كن أول من يكوّن خطًا متصلًا من أربع قطع بلون واحد أفقيًا أو عموديًا أو قطريًا.",
      facts: [["الأعمدة", "7"], ["الصفوف", "6"], ["اللاعبون", "2"], ["الفوز", "4 متصلة"]],
      components: [
        "حامل لوح بعمود سبعة وستة صفوف.",
        "21 قرصًا لكل لاعب بلون مختلف.",
      ],
      setup: [
        "يبدأ اللاعب الأول (الأحمر) ثم يتبادل اللاعبان الأدوار.",
        "اللوح فارغ في البداية، والقطع تسقط من الأعلى إلى أول خانة فارغة.",
      ],
      steps: [
        "<strong>الإسقاط:</strong> اختر عمودًا غير ممتلئ، فتسقط القطعة إلى أسفل عمودها.",
        "<strong>التبادل:</strong> ينتقل الدور للاعب الآخر بعد كل إسقاط.",
        "<strong>الفوز:</strong> أول خط من أربع قطع متصلة أفقياً أو عمودياً أو قطرياً يفوز فورًا.",
        "<strong>التعادل:</strong> إذا امتلأ اللوح دون خط فائز تنتهي اللعبة بالتعادل.",
      ],
      winning: "أول لاعب يكوّن أربع قطع متصلة يفوز. لا تُحتسب الخطوط الأطول أكثر من فوز واحد.",
      notes: [
        "العمود الأوسط (الرابع) يمنح أكبر عدد من الفرص، لذا يبدأ به الذكاء الاصطناعي عادة.",
        "الذكاء الاصطناعي يفحص الخسارة الفورية قبل اختيار حركته.",
        "الأعمدة الممتلئة تُعطَّل تلقائيًا.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت كونكت فور. الأحمر يبدأ، وأربع قطع متصلة تفوز.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          drop,
          bestMove: (seat) => bestMove(seat == null ? state.current : seat, "hard"),
          legalCols: () => legalCols(state.board),
          winningLine: (seat) => winningLine(state.board, seat == null ? state.current : seat),
          setCurrent(index) {
            if (!state) return;
            state.current = index === 1 ? 1 : 0;
            render();
            settle();
          },
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
