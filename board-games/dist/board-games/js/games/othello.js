/* ==========================================================================
   أوتيلو / ريفيرسي — ثمانية على ثمانية
   قواعد قفل الخطوط، تمرير تلقائي، وتقييم أركان مع بحث ألفا-بيتا.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const N = 8;
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const CORNERS = new Set([0, 7, 56, 63]);
  const WEIGHTS = [
    120, -20, 20, 5, 5, 20, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    20, -5, 15, 3, 3, 15, -5, 20,
    5, -5, 3, 3, 3, 3, -5, 5,
    5, -5, 3, 3, 3, 3, -5, 5,
    20, -5, 15, 3, 3, 15, -5, 20,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 20, 5, 5, 20, -20, 120,
  ];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  const other = (seat) => (seat === 0 ? 1 : 0);

  function initialBoard() {
    const board = new Array(64).fill(null);
    board[27] = 0; board[28] = 1; board[35] = 1; board[36] = 0;
    return board;
  }

  function flipsFor(board, seat, index) {
    if (index < 0 || index > 63 || board[index] != null) return [];
    const r = Math.floor(index / N);
    const c = index % N;
    const flips = [];
    for (const [dr, dc] of DIRS) {
      let rr = r + dr;
      let cc = c + dc;
      const line = [];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N) {
        const at = rr * N + cc;
        if (board[at] == null) break;
        if (board[at] === seat) {
          if (line.length) flips.push(...line);
          break;
        }
        line.push(at);
        rr += dr;
        cc += dc;
      }
    }
    return flips;
  }

  function legalMoves(board, seat) {
    const moves = [];
    for (let i = 0; i < 64; i++) {
      const flips = flipsFor(board, seat, i);
      if (flips.length) moves.push({ index: i, flips });
    }
    return moves;
  }

  function count(board) {
    let black = 0;
    let white = 0;
    board.forEach((cell) => { if (cell === 0) black += 1; else if (cell === 1) white += 1; });
    return { black, white };
  }

  function makePlayers() {
    return XG.players(apiRef, 2, ["#cf9f68", "#e7e2d1"]).map((player, index) => {
      if (index === 0 && !player.name) player.name = "الأسود";
      if (index === 1 && !player.name) player.name = "الأبيض";
      player.color = index === 0 ? "#202926" : "#efe4c8";
      return player;
    });
  }

  function newState() {
    return {
      board: initialBoard(),
      players: makePlayers(),
      current: 0,
      last: null,
      notice: "الدور للأسود — اختر خانة مضيئة لوضع قطعة.",
      over: false,
    };
  }

  function cur() { return state.players[state.current]; }

  /* byAi: حركة الكمبيوتر تمرّ من هذه الدالة نفسها فلا تُفحص ب«هل يستطيع البشري التصرف» (كان يرفضها فلا يتحرك الكمبيوتر) */
  function play(index, byAi) {
    if (!state || state.over) return false;
    if (!byAi && !XG.canAct(apiRef, state, state.current, state.over)) return false;
    const flips = flipsFor(state.board, state.current, index);
    if (!flips.length) {
      apiRef.toast("هذه الخانة غير قانونية.", "warn");
      return false;
    }
    const seat = state.current;
    state.board[index] = seat;
    flips.forEach((at) => { state.board[at] = seat; });
    state.last = { index, flips, seat };
    apiRef.log(
      "<strong>" + esc(cur().name) + "</strong> وضع قطعة في " + esc(cellName(index)) + " وقلب " + ar(flips.length) + " قطعة.",
      "accent"
    );
    afterMove(seat);
    return true;
  }

  function cellName(index) {
    const rows = "ABCDEFGH";
    return rows[Math.floor(index / N)] + String((index % N) + 1);
  }

  function afterMove(seat) {
    const opp = other(seat);
    if (legalMoves(state.board, opp).length) {
      state.current = opp;
      state.notice = "الدور لـ" + cur().name + " — اختر حركة قانونية.";
      finishTurn();
      return;
    }
    if (legalMoves(state.board, seat).length) {
      state.notice = "لا حركة لـ" + state.players[opp].name + " — يمرّ الدور ويعود لـ" + state.players[seat].name + ".";
      apiRef.log("لا توجد حركة لـ<strong>" + esc(state.players[opp].name) + "</strong>؛ تمرير تلقائي.", "warn");
      finishTurn();
      return;
    }
    finish();
  }

  function finishTurn() {
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function finish() {
    state.over = true;
    const score = count(state.board);
    const players = state.players;
    const scores = players.map((p) => (p.index === 0 ? score.black : score.white));
    const ranking = players.map((p, index) => ({ name: p.name, value: scores[index] })).sort((a, b) => b.value - a.value);
    const winner = ranking[0];
    const tie = ranking[0].value === ranking[1].value;
    state.notice = tie ? "انتهت اللعبة بالتعادل " + ar(winner.value) + " — " + ar(ranking[1].value) + "." : "فاز " + winner.name + " بـ" + ar(winner.value) + " مقابل " + ar(ranking[1].value) + ".";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: tie ? "تعادل في أوتيلو" : "انتهت أوتيلو",
      text: "اللوح ممتلئ أو لا توجد حركات لأي طرف. الفائز صاحب أكبر عدد قطع.",
      winner: tie ? "تعادل " + ar(winner.value) + " — " + ar(ranking[1].value) : winner.name + " — " + ar(winner.value) + " قطعة",
      icon: "⚫",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function evaluate(board, seat) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      if (board[i] === seat) score += WEIGHTS[i];
      else if (board[i] === other(seat)) score -= WEIGHTS[i];
    }
    const myMoves = legalMoves(board, seat).length;
    const theirMoves = legalMoves(board, other(seat)).length;
    score += (myMoves - theirMoves) * 4;
    return score;
  }

  function search(board, seat, depth, alpha, beta, turn) {
    if (depth === 0) return evaluate(board, seat);
    const moves = legalMoves(board, turn);
    if (!moves.length) {
      if (!legalMoves(board, other(turn)).length) return evaluate(board, seat) * 100;
      return search(board, seat, depth - 1, alpha, beta, other(turn));
    }
    const maximizing = turn === seat;
    let best = maximizing ? -Infinity : Infinity;
    const ordered = moves.slice().sort((a, b) => WEIGHTS[b.index] - WEIGHTS[a.index]);
    for (const move of ordered) {
      const next = board.slice();
      next[move.index] = turn;
      move.flips.forEach((at) => { next[at] = turn; });
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

  function bestMove(seat) {
    const moves = legalMoves(state.board, seat);
    if (!moves.length) return null;
    const level = state.players[seat].level;
    let depth = level === "easy" ? 1 : level === "normal" ? 2 : level === "hard" ? 3 : 4;
    if (moves.length <= 4) depth += 1;
    let best = moves[0];
    let bestValue = -Infinity;
    for (const move of moves) {
      const next = state.board.slice();
      next[move.index] = seat;
      move.flips.forEach((at) => { next[at] = seat; });
      const value = search(next, seat, depth - 1, -Infinity, Infinity, other(seat));
      const noisy = level === "easy" || level === "normal" ? Math.random() * 4 : 0;
      if (value + noisy > bestValue) { bestValue = value + noisy; best = move; }
    }
    return best;
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const move = bestMove(state.current);
    if (!move) { afterMove(state.current); return; }
    play(move.index, true);
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
    const score = count(state.board);
    const moves = legalMoves(state.board, state.current);
    const moveSet = new Set(moves.map((m) => m.index));
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const cells = state.board.map((cell, index) => {
      const cls = "ot-cell" + (moveSet.has(index) && can ? " is-move" : "") + (state.last && state.last.index === index ? " is-last" : "");
      const piece = cell == null ? "" : '<span class="ot-piece ' + (cell === 0 ? "black" : "white") + '"></span>';
      return '<button type="button" class="' + cls + '" data-ot-cell="' + index + '" ' +
        (cell == null && can && moveSet.has(index) ? "" : "disabled") +
        ' aria-label="خانة ' + cellName(index) + (cell == null ? " فارغة" : cell === 0 ? " سوداء" : " بيضاء") + '">' + piece + "</button>";
    }).join("");

    const playerRows = state.players.map((player) => {
      const value = player.index === 0 ? score.black : score.white;
      return (
        '<div class="ot-score ' + (state.current === player.index ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
        '<span class="xg-row"><span class="ot-dot ' + (player.index === 0 ? "black" : "white") + '"></span><span>' + esc(player.name) + "</span></span>" +
        "<strong>" + ar(value) + "</strong></div>"
      );
    }).join("");

    rootRef.innerHTML =
      '<div class="xg ot">' +
      XG.bar("أوتيلو", "اقلب أكبر عدد من القطع · ثمانية على ثمانية", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("الحركات", ar(moves.length)),
      ].join("")) +
      '<div class="ot-layout"><div class="ot-board" role="grid" aria-label="لوح أوتيلو">' + cells + "</div>" +
      '<aside class="ot-side"><div class="xg-panel"><h3>النتيجة</h3>' + playerRows +
      '<p class="ot-note">' + esc(state.notice) + "</p></div>" +
      '<div class="xg-panel"><h3>كيف تلعب</h3><p class="ot-note">اختر خانة مضيئة. تُقلب كل القطع المحصورة بين قطعتك الجديدة وأقرب قطعة لك في أي اتجاه. إن لم يجد الخصم حركة يمرّ دوره تلقائيًا.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const cell = event.target.closest("[data-ot-cell]");
    if (!cell) return;
    play(Number(cell.dataset.otCell));
  }

  const game = {
    id: "othello",
    name: "أوتيلو",
    en: "OTHELLO",
    icon: "⚫",
    accent: "#759b7c",
    cardClass: "card-othello",
    tagline: "اقلب خطوط الخصم بين قطعتيك، وأمسك الأركان لتسيطر على اللوح.",
    players: "2",
    duration: "15–30 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "لعبة لاعبين على لوح 8×8. البداية أربع قطع في المنتصف.",
      defaults: {},
      fields: [],
      summary() { return "8×8 · لاعبين · قلب الخطوط"; },
    },

    rules: {
      goal: "امتلك أكبر عدد من القطع عند نهاية اللعبة. تقلب كل حركة جميع قطع الخصم المحصورة أفقيًا أو عموديًا أو قطريًا بين قطعتك الجديدة وقطعة أخرى لك.",
      facts: [["اللوح", "8×8"], ["اللاعبون", "2"], ["البداية", "4 قطع"], ["الفوز", "أكثر قطع"]],
      components: [
        "لوح 8×8 بخانات خضراء.",
        "64 قطعة ذات وجهين: أسود وأبيض.",
        "اللاعب الأول يلعب بالأسود والثاني بالأبيض.",
      ],
      setup: [
        "توضع أربع قطع في وسط اللوح: أبيض في D4 وE5، أسود في E4 وD5 (أو العكس حسب الدور).",
        "الأسود يبدأ أولًا في النسخة الافتراضية.",
        "الحركة الأولى يجب أن تكون محاذية لقطعة خصم بحيث تُحصر بين قطعتين لك.",
      ],
      steps: [
        "<strong>الحركة:</strong> ضع قطعة على خانة مضيئة. يجب أن تحصر صفًا متصلًا من قطع الخصم بين قطعتك الجديدة وقطعة لك.",
        "<strong>القلب:</strong> تنقلب كل القطع المحصورة إلى لونك.",
        "<strong>التمرير:</strong> إذا لم تملك حركة قانونية يمرّ دورك تلقائيًا.",
        "<strong>النهاية:</strong> تنتهي اللعبة عند امتلاء اللوح أو عندما لا يملك أي لاعب حركة.",
        "<strong>الفوز:</strong> صاحب أكبر عدد قطع على اللوح يفوز. التعادل ممكن.",
      ],
      winning: "عند نهاية اللعبة تُعدّ القطع. الفائز من يملك العدد الأكبر، ويفوز الأبيض عند التعادل في بعض البطولات لكن هذه النسخة تعلن التعادل.",
      notes: [
        "الأركان قوية جدًا لأنها لا تُقلب أبدًا؛ الخانات الملاصقة للأركان خطرة في بداية اللعبة.",
        "تقييم الذكاء الاصطناعي يوازن بين الأركان والحركة المتاحة وعدد القطع.",
        "الخانات المضيئة تُظهر الحركات القانونية فقط.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت أوتيلو. الأسود يبدأ، والفوز بأكبر عدد قطع.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          legalMoves: () => legalMoves(state.board, state.current),
          play,
          aiStep,
          bestMove,
          count: () => count(state.board),
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
