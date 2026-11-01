/* ==========================================================================
   الشطرنج — لعبة كاملة بقواعد دولية
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const U = BG.util || {};
  const FX = BG.fx || {};
  const C = window.Chess;
  const CAI = window.ChessAI;

  if (!C) {
    console.error("Chess engine not loaded");
    return;
  }

  const GLYPH = { P: "♟", N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };
  const ICON = "♔";
  const PIECE_NAME = { P: "بيدق", N: "حصان", B: "فيل", R: "رخ", Q: "وزير", K: "ملك" };
  const SAN_AR = { K: "م", Q: "و", R: "ر", B: "ف", N: "ح" };
  const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
  const FILES = "abcdefgh";

  const LEVEL_NAME = { easy: "سهل", normal: "متوسط", hard: "صعب", expert: "خبير" };

  const AI_CFG = {
    easy: { depth: 2, timeLimit: 240, randomness: 75, blunder: 0.35 },
    normal: { depth: 4, timeLimit: 800, randomness: 12, blunder: 0.02 },
    hard: { depth: 7, timeLimit: 2600, randomness: 0, blunder: 0 },
    expert: { depth: 12, timeLimit: 6000, randomness: 0, blunder: 0 },
  };

  let state = null;
  let apiRef = null;
  let el = null;

  let selected = -1;
  let selectedMoves = [];
  let flip = false;
  let thinking = false;
  let over = false;
  let endReported = false;
  let endInfo = null;

  let history = [];
  let lastMove = null;
  let positionCounts = new Map();

  let hintSquares = null;
  let hintTimer = null;

  let pendingPromo = null;

  let worker = null;
  let workerFailed = false;
  let searchToken = 0;
  let aiTimer = null;
  let safetyTimer = null;

  /* ------------------------------------------------------------------ */
  /* أدوات مساعدة                                                       */
  /* ------------------------------------------------------------------ */

  function seatOf(side) {
    const players = (apiRef && apiRef.players) || [];
    if (side === "w") {
      return players[0] || { name: "أنت", isCpu: false, level: "normal" };
    }
    return players[1] || {
      name: "اللاعب الآلي",
      isCpu: true,
      level: (players[0] && players[0].level) || "normal",
    };
  }

  function isCpuSide(side) {
    const seat = seatOf(side);
    return !!(seat && seat.isCpu);
  }

  function levelOf(side) {
    const raw = seatOf(side).level || "normal";
    return AI_CFG[raw] ? raw : "normal";
  }

  function sideName(side) {
    return side === "w" ? "الأبيض" : "الأسود";
  }

  function sanArabic(san) {
    if (!san) return "";
    if (san === "O-O") return "تبييت قصير";
    if (san === "O-O-O") return "تبييت طويل";
    let out = san;
    if (SAN_AR[out[0]]) out = SAN_AR[out[0]] + out.slice(1);
    out = out.replace(/=([NBRQK])/g, function (m, t) {
      return "=" + SAN_AR[t];
    });
    return out;
  }

  function squareLabel(i) {
    const name = C.squareName(i);
    return name === "-" ? "خارج الرقعة" : name;
  }

  function other(side) {
    return side === "w" ? "b" : "w";
  }

  function cancelAI() {
    searchToken += 1;
    thinking = false;
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    if (worker) {
      try { worker.terminate(); } catch (e) { /* لا شيء */ }
      worker = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* بناء الواجهة                                                       */
  /* ------------------------------------------------------------------ */

  function create(root, api) {
    apiRef = api;
    root.innerHTML = "";
    el = {};

    const layout = document.createElement("div");
    layout.className = "chess-layout";
    layout.innerHTML =
      '<div class="chess-main">' +
        '<div class="chess-center">' +
          '<div class="ch-player" data-ch-player="top">' +
            '<span class="ch-avatar is-b" data-ch-avatar aria-hidden="true">♚</span>' +
            '<div class="ch-player-copy"><strong data-ch-name></strong><small data-ch-meta></small></div>' +
            '<div class="ch-captured" data-ch-captured aria-label="القطع المأسورة"></div>' +
            '<span class="ch-material" data-ch-material hidden></span>' +
          "</div>" +
          '<div class="chess-boardwrap">' +
            '<div class="chess-board" data-ch-board role="grid" aria-label="رقعة الشطرنج"></div>' +
            '<div class="ch-promo" data-ch-promo hidden>' +
              '<div class="ch-promo-card" role="dialog" aria-modal="true" aria-label="ترقية البيدق">' +
                "<strong>ترقية البيدق</strong>" +
                "<p>اختر القطعة الجديدة</p>" +
                '<div class="ch-promo-row" data-ch-promo-row></div>' +
                '<button type="button" class="bg-btn small ghost" data-ch-promo-cancel>إلغاء</button>' +
              "</div>" +
            "</div>" +
          "</div>" +
          '<div class="ch-player" data-ch-player="bottom">' +
            '<span class="ch-avatar is-w" data-ch-avatar aria-hidden="true">♔</span>' +
            '<div class="ch-player-copy"><strong data-ch-name></strong><small data-ch-meta></small></div>' +
            '<div class="ch-captured" data-ch-captured aria-label="القطع المأسورة"></div>' +
            '<span class="ch-material" data-ch-material hidden></span>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<aside class="chess-side">' +
        '<section class="ch-panel ch-status-panel">' +
          '<div class="ch-status" data-ch-status>' +
            '<span class="ch-status-dot" aria-hidden="true"></span>' +
            '<div class="ch-status-copy"><b data-ch-turn>دور الأبيض</b><small data-ch-note></small></div>' +
          "</div>" +
        "</section>" +
        '<div class="chess-side-grid">' +
          '<section class="ch-panel ch-controls">' +
            '<button type="button" class="bg-btn small" data-ch-undo>↶ تراجع</button>' +
            '<button type="button" class="bg-btn small" data-ch-hint>؟ تلميح</button>' +
            '<button type="button" class="bg-btn small" data-ch-flip>⇅ عكس اللوحة</button>' +
            '<button type="button" class="bg-btn small danger" data-ch-resign>🏳️ استسلام</button>' +
            '<button type="button" class="bg-btn small primary ch-wide" data-ch-new>لعبة جديدة</button>' +
          "</section>" +
          '<section class="ch-panel ch-log-panel">' +
            '<h3 class="ch-panel-title">سجل الحركات</h3>' +
            '<ol class="ch-moves" data-ch-moves aria-label="سجل الحركات"></ol>' +
          "</section>" +
        "</div>" +
      "</aside>";

    root.appendChild(layout);

    el.board = layout.querySelector("[data-ch-board]");
    el.top = playerRefs(layout.querySelector('[data-ch-player="top"]'));
    el.bottom = playerRefs(layout.querySelector('[data-ch-player="bottom"]'));
    el.status = layout.querySelector("[data-ch-status]");
    el.turn = layout.querySelector("[data-ch-turn]");
    el.note = layout.querySelector("[data-ch-note]");
    el.moves = layout.querySelector("[data-ch-moves]");
    el.promo = layout.querySelector("[data-ch-promo]");
    el.promoRow = layout.querySelector("[data-ch-promo-row]");

    el.board.addEventListener("click", onBoardClick);
    layout.querySelector("[data-ch-undo]").addEventListener("click", undoMove);
    layout.querySelector("[data-ch-hint]").addEventListener("click", showHint);
    layout.querySelector("[data-ch-flip]").addEventListener("click", function () {
      flip = !flip;
      if (FX) FX.sound("flip");
      render();
    });
    layout.querySelector("[data-ch-resign]").addEventListener("click", resign);
    layout.querySelector("[data-ch-new]").addEventListener("click", function () {
      if (FX) FX.sound("shuffle");
      newGame();
    });
    layout.querySelector("[data-ch-promo-cancel]").addEventListener("click", function () {
      pendingPromo = null;
      selected = -1;
      selectedMoves = [];
      hidePromotion();
      render();
    });

    buildBoard();
    newGame();

    if (new URLSearchParams(location.search).has("bgdebug")) {
      window.__bgDebug = {
        get state() { return state; },
        get history() { return history; },
        get over() { return over; },
        get thinking() { return thinking; },
        render,
        setFen(fen) {
          cancelAI();
          if (hintTimer) clearTimeout(hintTimer);
          hintTimer = null;
          state = C.fromFEN(fen);
          history = [];
          lastMove = null;
          selected = -1;
          selectedMoves = [];
          pendingPromo = null;
          hintSquares = null;
          over = false;
          endReported = false;
          endInfo = null;
          positionCounts = new Map();
          positionCounts.set(C.positionKey(state), 1);
          hidePromotion();
          render();
        },
        play(from, to, promo) {
          playMove(from, to, promo || null);
        },
        resign,
        undoMove,
        square(name) { return C.parseSquare ? C.parseSquare(name) : -1; },
        legal() { return C.legalMoves(state); },
      };
    }

    return {
      destroy: function () {
        cancelAI();
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = null;
        el = null;
        state = null;
      },
    };
  }

  function playerRefs(node) {
    return {
      node: node,
      avatar: node.querySelector("[data-ch-avatar]"),
      name: node.querySelector("[data-ch-name]"),
      meta: node.querySelector("[data-ch-meta]"),
      captured: node.querySelector("[data-ch-captured]"),
      material: node.querySelector("[data-ch-material]"),
    };
  }

  function buildBoard() {
    el.board.innerHTML = "";
    for (let vis = 0; vis < 64; vis++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "ch-sq";
      cell.setAttribute("role", "gridcell");

      const file = document.createElement("span");
      file.className = "ch-coord ch-coord-file";
      file.setAttribute("aria-hidden", "true");

      const rank = document.createElement("span");
      rank.className = "ch-coord ch-coord-rank";
      rank.setAttribute("aria-hidden", "true");

      const piece = document.createElement("span");
      piece.className = "ch-piece";
      piece.setAttribute("aria-hidden", "true");

      cell.appendChild(file);
      cell.appendChild(rank);
      cell.appendChild(piece);
      cell._file = file;
      cell._rank = rank;
      cell._piece = piece;
      el.board.appendChild(cell);
    }
  }

  /* ------------------------------------------------------------------ */
  /* اللعبة                                                             */
  /* ------------------------------------------------------------------ */

  function newGame() {
    cancelAI();
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = null;

    state = C.createGame ? C.createGame() : C.fromFEN(C.START_FEN);
    history = [];
    lastMove = null;
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hintSquares = null;
    over = false;
    endReported = false;
    endInfo = null;

    positionCounts = new Map();
    positionCounts.set(C.positionKey(state), 1);

    hidePromotion();
    flip = !!(seatOf("w").isCpu && !seatOf("b").isCpu);
    render();
    maybeAi();
  }

  function render() {
    if (!state || !el) return;

    const board = state.board;
    const checkSq = !over && C.inCheck(state, state.turn) ? state.kings[state.turn] : -1;
    const targets = new Set();
    for (let i = 0; i < selectedMoves.length; i++) targets.add(selectedMoves[i].to);

    for (let vis = 0; vis < 64; vis++) {
      const r = vis >> 3;
      const c = vis & 7;
      const dr = flip ? 7 - r : r;
      const dc = flip ? 7 - c : c;
      const i = (dr << 4) | dc;
      const p = board[i];
      const cell = el.board.children[vis];

      let cls = "ch-sq " + ((dr + dc) % 2 === 0 ? "light" : "dark");
      if (i === selected) cls += " is-selected";
      if (lastMove && (i === lastMove.from || i === lastMove.to)) cls += " is-last";
      if (targets.has(i)) cls += p ? " is-capture" : " is-legal";
      if (i === checkSq) cls += " is-check";
      if (hintSquares && (i === hintSquares.from || i === hintSquares.to)) cls += " is-hint";
      cell.className = cls;
      cell.dataset.sq = String(i);

      const piece = cell._piece;
      if (p) {
        const color = C.colorOf(p);
        const type = C.typeOf(p);
        piece.textContent = GLYPH[type] || "?";
        piece.className = "ch-piece is-" + color;
        cell.setAttribute(
          "aria-label",
          squareLabel(i) + " " + (color === "w" ? "أبيض " : "أسود ") + PIECE_NAME[type]
        );
      } else {
        piece.textContent = "";
        piece.className = "ch-piece";
        cell.setAttribute("aria-label", squareLabel(i) + " فارغ");
      }

      cell._file.textContent = r === 7 ? FILES[dc] : "";
      cell._rank.textContent = c === 0 ? String(8 - dr) : "";
    }

    el.board.classList.toggle("is-locked", over || thinking || !!pendingPromo);

    paintPlayers();
    updateStatus();
    updateMoves();
  }

  function paintPlayers() {
    if (flip) {
      paintPlayer(el.top, "w");
      paintPlayer(el.bottom, "b");
    } else {
      paintPlayer(el.top, "b");
      paintPlayer(el.bottom, "w");
    }
  }

  function paintPlayer(refs, side) {
    if (!refs) return;
    const seat = seatOf(side);
    const level = levelOf(side);

    refs.node.dataset.side = side;
    refs.avatar.textContent = side === "w" ? "♔" : "♚";
    refs.avatar.className = "ch-avatar is-" + side;
    refs.name.textContent = seat.name || (seat.isCpu ? "اللاعب الآلي" : sideName(side));
    refs.meta.textContent = seat.isCpu
      ? "حاسوب · مستوى " + (LEVEL_NAME[level] || "متوسط")
      : "لاعب";
    refs.node.classList.toggle("is-active", !over && state.turn === side);

    const enemy = other(side);
    const lost = missingPieces(enemy);
    refs.captured.innerHTML = "";
    for (let i = 0; i < lost.length; i++) {
      const chip = document.createElement("span");
      chip.className = "is-" + enemy;
      chip.textContent = GLYPH[lost[i]];
      chip.title = PIECE_NAME[lost[i]];
      refs.captured.appendChild(chip);
    }

    const diff = materialDiff(side);
    refs.material.hidden = diff <= 0;
    refs.material.textContent = diff > 0 ? "+" + diff : "";
  }

  function missingPieces(color) {
    const counts = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
    const board = state.board;
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) {
        i += 7;
        continue;
      }
      const p = board[i];
      if (!p || C.colorOf(p) !== color) continue;
      const t = C.typeOf(p);
      if (counts[t] !== undefined) counts[t] += 1;
    }

    const out = [];
    ["Q", "R", "B", "N", "P"].forEach(function (t) {
      const gone = START_COUNT[t] - counts[t];
      for (let k = 0; k < gone; k++) out.push(t);
    });
    return out;
  }

  function materialDiff(side) {
    const mine = missingPieces(other(side)).reduce(function (sum, t) {
      return sum + VALUE[t];
    }, 0);
    const theirs = missingPieces(side).reduce(function (sum, t) {
      return sum + VALUE[t];
    }, 0);
    return mine - theirs;
  }

  function updateStatus() {
    if (!el) return;

    const side = state.turn;
    const inCheck = !over && C.inCheck(state, side);
    let title;
    let note;

    if (over && endInfo) {
      title = endInfo.title;
      note = endInfo.note;
    } else if (thinking) {
      title = "اللاعب الآلي يفكّر…";
      note = "دور " + sideName(side) + (inCheck ? " — الملك في كش" : "");
    } else {
      title = "دور " + sideName(side);
      if (inCheck) note = "كش! يجب حماية الملك أو تحريكه.";
      else if (pendingPromo) note = "اختر قطعة الترقية للمتابعة.";
      else if (history.length) note = "آخر حركة: " + sanArabic(history[history.length - 1].san);
      else note = "الأبيض يبدأ المباراة.";
    }

    el.status.classList.toggle("is-thinking", thinking && !over);
    el.status.classList.toggle("is-over", over);
    el.status.classList.toggle("is-check", !!inCheck);
    el.turn.textContent = title;
    el.note.textContent = note;

    if (apiRef && typeof apiRef.setStatus === "function") {
      apiRef.setStatus("الشطرنج — " + (over ? "انتهت المباراة" : title), over ? "over" : "live");
    }
  }

  function updateMoves() {
    if (!el) return;
    const list = el.moves;
    list.innerHTML = "";

    if (!history.length) {
      const empty = document.createElement("li");
      empty.className = "ch-moves-empty";
      empty.textContent = "لم تُلعب أي حركة بعد. الأبيض يبدأ.";
      list.appendChild(empty);
    } else {
      for (let i = 0; i < history.length; i += 2) {
        const li = document.createElement("li");
        const no = document.createElement("span");
        no.className = "ch-move-no";
        no.textContent = i / 2 + 1 + ".";
        li.appendChild(no);
        li.appendChild(sanCell(history[i], i === history.length - 1));
        if (history[i + 1]) {
          li.appendChild(sanCell(history[i + 1], i + 1 === history.length - 1));
        } else {
          li.appendChild(document.createElement("span"));
        }
        list.appendChild(li);
      }

      if (endInfo && endInfo.result) {
        const result = document.createElement("li");
        result.className = "ch-moves-result";
        result.textContent = endInfo.result;
        list.appendChild(result);
      }
    }

    list.scrollTop = list.scrollHeight;
  }

  function sanCell(record, isLast) {
    const span = document.createElement("span");
    span.className = "ch-san" + (isLast ? " is-last" : "");
    span.textContent = sanArabic(record.san);
    span.title = record.san;
    return span;
  }

  /* ------------------------------------------------------------------ */
  /* التفاعل                                                            */
  /* ------------------------------------------------------------------ */

  function onBoardClick(event) {
    const cell = event.target.closest ? event.target.closest(".ch-sq") : null;
    if (!cell) return;
    const sq = Number(cell.dataset.sq);
    if (!Number.isFinite(sq)) return;
    onSquare(sq);
  }

  function onSquare(i) {
    if (!state || over || thinking || pendingPromo) return;

    if (selected >= 0) {
      const move = selectedMoves.find(function (m) {
        return m.to === i;
      });
      if (move) {
        if (move.promo) {
          openPromotion(selected, i);
          return;
        }
        playMove(selected, i, null);
        return;
      }
    }

    const p = state.board[i];
    if (p && C.colorOf(p) === state.turn) {
      if (selected === i) {
        selected = -1;
        selectedMoves = [];
      } else {
        selected = i;
        selectedMoves = C.legalMoves(state).filter(function (m) {
          return m.from === i;
        });
        if (FX) FX.sound("select");
      }
    } else if (selected >= 0) {
      selected = -1;
      selectedMoves = [];
    }

    render();
  }

  function playMove(from, to, promo) {
    if (!state || over) return;
    const move = C.parseMove(state, from, to, promo);
    if (!move) return;

    const san = C.moveToSAN(state, move);
    const undo = C.makeMove(state, move);
    const key = C.positionKey(state);
    positionCounts.set(key, (positionCounts.get(key) || 0) + 1);

    history.push({ move: move, undo: undo, san: san, key: key });
    lastMove = { from: move.from, to: move.to };
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hidePromotion();

    if (FX) {
      if (move.promo) FX.sound("promote");
      else if (move.captured) FX.sound("capture");
      else if (move.castle) FX.after ? FX.after(function () { FX.sound("move"); }, 40) : FX.sound("move");
      else FX.sound("move");
    }

    const outcome = findOutcome();
    render();

    if (outcome) reportEnd(outcome);
    else maybeAi();
  }

  function findOutcome() {
    const st = C.status(state);
    if (st.over) {
      return { reason: st.reason, winner: st.winner, result: st.result };
    }
    const key = C.positionKey(state);
    if ((positionCounts.get(key) || 0) >= 3) {
      return { reason: "repetition", winner: null, result: "½–½" };
    }
    return null;
  }

  function reportEnd(outcome) {
    if (endReported) return;
    endReported = true;
    over = true;
    thinking = false;
    cancelAI();

    let title = "انتهت المباراة";
    let note = "";
    let result = outcome.result || "½–½";
    let icon = "♚";

    if (outcome.reason === "checkmate") {
      const winner = outcome.winner;
      title = "كش مات";
      note = seatOf(winner).name + " (" + sideName(winner) + ") يفوز بالمباراة.";
      result = winner === "w" ? "1–0" : "0–1";
      icon = "♚";
      if (FX) FX.sound(outcome.winner && !isCpuSide(outcome.winner) ? "win" : "lose");
    } else if (outcome.reason === "stalemate") {
      title = "تعادل بالجمود";
      note = "لا توجد حركة قانونية والملك ليس في كش.";
      result = "½–½";
      icon = "½";
      if (FX) FX.sound("draw");
    } else if (outcome.reason === "fifty") {
      title = "تعادل بقاعدة الخمسين";
      note = "مضت 50 حركة دون تحريك بيدق أو أخذ قطعة.";
      result = "½–½";
      icon = "½";
      if (FX) FX.sound("draw");
    } else if (outcome.reason === "material") {
      title = "تعادل بالقطع غير الكافية";
      note = "لم يتبقَّ ما يكفي من القطع لتنفيذ كش مات.";
      result = "½–½";
      icon = "½";
      if (FX) FX.sound("draw");
    } else if (outcome.reason === "repetition") {
      title = "تعادل بتكرار الوضع";
      note = "تكرر الوضع نفسه ثلاث مرات.";
      result = "½–½";
      icon = "½";
      if (FX) FX.sound("draw");
    }

    endInfo = { title: title, note: note, result: result, icon: icon };
    render();

    setTimeout(function () {
      if (!over || !apiRef) return;
      apiRef.gameOver({ title: title, text: note, icon: icon });
    }, 420);
  }

  function openPromotion(from, to) {
    if (!el) return;
    pendingPromo = { from: from, to: to };
    const color = state.turn;
    el.promoRow.innerHTML = "";

    ["Q", "R", "B", "N"].forEach(function (type) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ch-promo-btn";
      btn.innerHTML =
        '<span class="ch-piece is-' + color + '">' + GLYPH[type] + "</span>" +
        "<small>" + PIECE_NAME[type] + "</small>";
      btn.addEventListener("click", function () {
        const target = pendingPromo;
        pendingPromo = null;
        hidePromotion();
        if (target) playMove(target.from, target.to, type);
      });
      el.promoRow.appendChild(btn);
    });

    el.promo.hidden = false;
    render();
    if (FX) FX.sound("select");
    const first = el.promoRow.querySelector("button");
    if (first) first.focus();
  }

  function hidePromotion() {
    if (el && el.promo) el.promo.hidden = true;
  }

  /* ------------------------------------------------------------------ */
  /* التراجع والتلميح والاستسلام                                        */
  /* ------------------------------------------------------------------ */

  function undoMove() {
    if (!state || !history.length) {
      if (apiRef && apiRef.toast) apiRef.toast("لا توجد حركة للتراجع عنها.", "warn");
      return;
    }

    cancelAI();
    if (hintTimer) clearTimeout(hintTimer);
    hintSquares = null;
    pendingPromo = null;
    hidePromotion();

    popHistory();
    if (history.length && isCpuSide(state.turn)) popHistory();

    over = false;
    endReported = false;
    endInfo = null;
    selected = -1;
    selectedMoves = [];
    lastMove = history.length
      ? { from: history[history.length - 1].move.from, to: history[history.length - 1].move.to }
      : null;

    if (FX) FX.sound("recall");
    render();
  }

  function popHistory() {
    const record = history.pop();
    if (!record) return;
    C.unmakeMove(state, record.undo);
    const count = (positionCounts.get(record.key) || 1) - 1;
    if (count <= 0) positionCounts.delete(record.key);
    else positionCounts.set(record.key, count);
  }

  function showHint() {
    if (!state || over || thinking || pendingPromo) return;
    if (!CAI || !CAI.bestMove) {
      if (apiRef && apiRef.toast) apiRef.toast("محرك التلميح غير متاح.", "warn");
      return;
    }

    let move = null;
    try {
      move = CAI.bestMove(C.clone(state), {
        depth: 4,
        timeLimit: 400,
        randomness: 0,
        blunder: 0,
      });
    } catch (e) {
      move = null;
    }

    if (!move || typeof move.from !== "number") {
      if (apiRef && apiRef.toast) apiRef.toast("لا يوجد تلميح متاح.", "warn");
      return;
    }

    hintSquares = { from: move.from, to: move.to };
    render();
    if (FX) FX.sound("point");
    if (apiRef && apiRef.toast) {
      apiRef.toast("تلميح: " + squareLabel(move.from) + " ← " + squareLabel(move.to), "good");
    }

    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hintSquares = null;
      hintTimer = null;
      render();
    }, 2600);
  }

  function resign() {
    if (!state || over) return;
    over = true;
    thinking = false;
    cancelAI();

    const humanSide = !isCpuSide("w") ? "w" : "b";
    const winner = other(humanSide);
    endInfo = {
      title: "استسلام",
      note: seatOf(humanSide).name + " استسلم. فاز " + seatOf(winner).name + ".",
      result: winner === "w" ? "1–0" : "0–1",
      icon: "🏳️",
    };
    render();
    if (FX) FX.sound("lose");

    if (apiRef) {
      apiRef.gameOver({
        title: "استسلام",
        text: endInfo.note,
        icon: "🏳️",
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* الذكاء الاصطناعي                                                   */
  /* ------------------------------------------------------------------ */

  function maybeAi() {
    if (!state || over || pendingPromo) return;
    if (!isCpuSide(state.turn)) return;

    thinking = true;
    render();

    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(function () {
      aiTimer = null;
      runAI();
    }, 260 + Math.random() * 220);
  }

  function ensureWorker() {
    if (worker || workerFailed || typeof window.Worker !== "function") return;
    try {
      worker = new window.Worker("js/chess-ai-worker.js?v=1");
      worker.onmessage = onWorkerMessage;
      worker.onerror = function () {
        workerFailed = true;
        worker = null;
        if (thinking) localAI(searchToken, null);
      };
    } catch (e) {
      workerFailed = true;
      worker = null;
    }
  }

  function onWorkerMessage(event) {
    const msg = event.data || {};
    if (msg.type !== "result") return;
    if (msg.id !== searchToken) return;

    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    thinking = false;

    if (!msg.ok || !msg.result) {
      localAI(searchToken, null);
      return;
    }

    const result = msg.result;
    if (result && typeof result.from === "number") {
      playMove(result.from, result.to, result.promo || null);
    } else {
      render();
    }
  }

  function runAI() {
    if (!state || over || !isCpuSide(state.turn)) {
      thinking = false;
      render();
      return;
    }

    const level = levelOf(state.turn);
    const cfg = AI_CFG[level] || AI_CFG.normal;
    const token = ++searchToken;

    ensureWorker();
    if (worker) {
      try {
        worker.postMessage({
          type: "search",
          id: token,
          fen: C.toFEN(state),
          options: {
            depth: cfg.depth,
            timeLimit: cfg.timeLimit,
            randomness: cfg.randomness,
            blunder: cfg.blunder,
          },
        });

        if (safetyTimer) clearTimeout(safetyTimer);
        safetyTimer = setTimeout(function () {
          safetyTimer = null;
          if (token !== searchToken) return;
          if (worker) {
            try { worker.terminate(); } catch (e) { /* لا شيء */ }
            worker = null;
          }
          workerFailed = true;
          localAI(token, cfg);
        }, cfg.timeLimit + 3500);
        return;
      } catch (e) {
        worker = null;
        workerFailed = true;
      }
    }

    localAI(token, cfg);
  }

  function localAI(token, cfg) {
    if (!state || over || token !== searchToken) return;
    const level = levelOf(state.turn);
    const options = cfg || AI_CFG[level] || AI_CFG.normal;

    let move = null;
    try {
      if (CAI && CAI.bestMove) {
        move = CAI.bestMove(C.clone(state), {
          depth: options.depth,
          timeLimit: Math.min(options.timeLimit || 1200, 1800),
          randomness: options.randomness || 0,
          blunder: options.blunder || 0,
        });
      }
    } catch (e) {
      move = null;
    }

    if (token !== searchToken) return;
    thinking = false;

    if (move && typeof move.from === "number") {
      playMove(move.from, move.to, move.promo || null);
    } else {
      render();
    }
  }

  /* ------------------------------------------------------------------ */
  /* بطاقة اللعبة                                                        */
  /* ------------------------------------------------------------------ */

  const game = {
    id: "chess",
    name: "الشطرنج",
    en: "CHESS",
    icon: "♞",
    accent: "#b9a07e",
    cardClass: "card-chess",
    tagline: "اللعبة الملكية الكلاسيكية — قواعد دولية كاملة.",
    players: "1–2",
    duration: "10–60 دقيقة",
    complexity: "عالية",
    minPlayers: 1,
    maxPlayers: 2,
    defaultPlayers: 1,
    rules: {
      goal: "إماتة ملك الخصم (كش مات)، أو إجباره على الاستسلام.",
      facts: [
        ["الرقعة", "8×8 = 64 مربعًا"],
        ["القطع", "16 لكل لاعب"],
        ["اللاعبون", "لاعب واحد ضد الحاسوب أو لاعبان"],
        ["الهدف", "كش مات"],
      ],
      components: [
        "رقعة شطرنج 8×8 باللونين الفاتح والداكن",
        "16 قطعة بيضاء و16 قطعة سوداء: 8 بيادق، رخان، حصانان، فيلان، وزير، ملك",
      ],
      setup: [
        "صف الأبيض الأول من الأسفل: رخ، حصان، فيل، وزير، ملك، فيل، حصان، رخ.",
        "الصف الثاني للأبيض: ثمانية بيادق.",
        "الصفان السابع والثامن للأسود بالترتيب نفسه.",
        "الوزير يقف على مربعه الخاص بلونه: الأبيض على d1 والأسود على d8.",
        "الأبيض يبدأ المباراة دائمًا.",
      ],
      steps: [
        "يتبادل اللاعبان الحركة، وينقل كل منهما قطعة واحدة في دوره.",
        "البيدق يتقدم مربعًا واحدًا للأمام، أو مربعين من موقعه الابتدائي، ويأكل قطريًا.",
        "الحصان يتحرك بشكل L: مربعان في اتجاه ومربع جانبي، ويتجاوز القطع.",
        "الفيل يتحرك قطريًا، والرخ أفقيًا وعموديًا، والوزير يجمع حركتيهما.",
        "الملك يتحرك مربعًا واحدًا في أي اتجاه، ولا يجوز أن ينتقل إلى مربع مهدد.",
        "التبييت: يتحرك الملك مربعين نحو الرخ وينتقل الرخ إلى الجهة الأخرى، بشرط ألا يكون أي منهما قد تحرك، وألا توجد قطع بينهما، وألا يكون الملك في كش أو يعبر مربعًا مهددًا.",
        "الترقية: البيدق الذي يصل إلى الصف الأخير يُرقّى إلى وزير أو رخ أو فيل أو حصان.",
        "الأخذ بالتجاوز (en passant): بيدق يمكنه أخذ بيدق الخصم الذي تقدم مربعين مباشرة بعد تلك الحركة.",
        "الكش: الملك مهدد بالأخذ. يجب على اللاعب الخروج من الكش فورًا.",
        "الكش مات: الملك في كش ولا توجد أي حركة قانونية تنجيه، فتنتهي المباراة.",
        "الجمود: لا توجد حركة قانونية والملك ليس في كش، فتكون النتيجة تعادلًا.",
      ],
      winning:
        "يفوز من ينفذ كش مات على ملك الخصم. وتُحسم المباراة أيضًا بالاستسلام أو التعادل بالجمود أو بقاعدة الخمسين حركة أو تكرار الوضع ثلاث مرات أو القطع غير الكافية للإماتة.",
      notes: [
        "هذه النسخة بلا ساعة توقيت؛ تُلعب المباراة حتى الحسم.",
        "زر «تراجع» يعيد حركتك وحركة الحاسوب الأخيرة معًا.",
        "يمكنك تغيير مستوى الحاسوب من شاشة الإعدادات قبل بدء اللعبة.",
      ],
    },
    create: create,
  };

  BG.register(game);
})();
