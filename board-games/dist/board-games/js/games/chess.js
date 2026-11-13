/* ==========================================================================
   الشطرنج — تجربة كاملة بمحرك Stockfish حقيقي
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

  /* ------------------------------------------------------------------ */
  /* ثوابت                                                              */
  /* ------------------------------------------------------------------ */

  const PIECE_NAME = { P: "بيدق", N: "حصان", B: "فيل", R: "رخ", Q: "وزير", K: "ملك" };
  const SAN_AR = { K: "م", Q: "و", R: "ر", B: "ف", N: "ح" };
  const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
  const FILES = "abcdefgh";
  const PIECE_URL = "vendor/chess/pieces/";
  const ENGINE_URL = "vendor/stockfish/stockfish-17.1-lite-single.js";
  const REDUCED = "matchMedia" in window && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  const LEVEL_CFG = {
    easy: { elo: 1320, limit: true, movetime: 260, multipv: 5, style: "easy" },
    normal: { elo: 1320, limit: true, movetime: 620, multipv: 4, style: "normal" },
    hard: { elo: 2000, limit: true, movetime: 1250, multipv: 1, style: "best" },
    expert: { elo: 3600, limit: false, movetime: 2800, multipv: 1, style: "best" },
  };

  const TIME_LABEL = {
    "3+2": "3+2",
    "5+0": "5 دقائق",
    "10+0": "10 دقائق",
    "15+10": "15+10",
    "30+0": "30 دقيقة",
    none: "بلا ساعة",
  };

  /* ------------------------------------------------------------------ */
  /* حالة الوحدة                                                        */
  /* ------------------------------------------------------------------ */

  let rootRef = null;
  let apiRef = null;
  let el = null;
  let state = null;

  let selected = -1;
  let selectedMoves = [];
  let flip = false;
  let initialFen = C.START_FEN;
  let history = [];
  let lastMove = null;
  let positionCounts = new Map();

  let over = false;
  let endReported = false;
  let endInfo = null;
  let thinking = false;
  let hintBusy = false;
  let hintSquares = null;
  let hintTimer = null;
  let pendingPromo = null;
  let concluded = false;

  let clock = { w: 600000, b: 600000 };
  let increment = 0;
  let clockStartedAt = 0;
  let clockTimer = null;
  let currentEval = null;
  let lastCheckSound = false;
  let flagWarned = false;

  let drag = null;
  let suppressClick = false;

  let engine = null;
  let engineInit = null;
  let engineQueue = Promise.resolve();
  let pendingSearch = null;
  let engineFailed = false;
  let searchToken = 0;
  let aiTimer = null;

  /* ------------------------------------------------------------------ */
  /* أدوات مساعدة                                                       */
  /* ------------------------------------------------------------------ */

  function online() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function localSide() {
    if (!online()) return null;
    const seat = apiRef.net.seat;
    if (seat === 0) return "w";
    if (seat === 1) return "b";
    return null;
  }

  function isSpectator() {
    return online() && localSide() == null;
  }

  function canPlayLocal() {
    if (!state || over || concluded) return false;
    if (pendingPromo || thinking || hintBusy) return false;
    if (apiRef && apiRef.finished) return false;
    if (!online()) return true;
    if (isSpectator()) return false;
    return localSide() === state.turn;
  }

  function canRunCpu() {
    if (!apiRef) return false;
    if (!online()) return true;
    if (isSpectator()) return false;
    return !!apiRef.net.isHost;
  }

  function seatOf(side) {
    const list = (apiRef && apiRef.players) || [];
    const index = side === "w" ? 0 : 1;
    if (list[index]) return list[index];
    return side === "w"
      ? { name: "أنت", isCpu: false, type: "human", level: "normal" }
      : { name: "اللاعب الآلي", isCpu: true, type: "cpu", level: "normal" };
  }

  function isCpuSide(side) {
    const seat = seatOf(side);
    return !!(seat && (seat.isCpu || seat.type === "cpu"));
  }

  function levelOf(side) {
    const raw = seatOf(side).level || "normal";
    return LEVEL_CFG[raw] ? raw : "normal";
  }

  function sideName(side) {
    return side === "w" ? "الأبيض" : "الأسود";
  }

  function other(side) {
    return side === "w" ? "b" : "w";
  }

  function playerLabel(side) {
    const seat = seatOf(side);
    let name = seat.name || sideName(side);
    if (online() && localSide() === side) name += " (أنت)";
    return name;
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

  function pieceSrc(color, type) {
    return PIECE_URL + color + type + ".svg";
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatClock(ms) {
    const value = Math.max(0, Math.floor(ms));
    if (value < 20000) {
      const tenths = Math.floor(value / 100);
      const m = Math.floor(tenths / 600);
      const s = Math.floor((tenths % 600) / 10);
      return m + ":" + pad2(s) + "." + (tenths % 10);
    }
    const totalSeconds = Math.floor(value / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m < 60) return m + ":" + pad2(s);
    const h = Math.floor(m / 60);
    return h + ":" + pad2(m % 60) + ":" + pad2(s);
  }

  function timeSpec() {
    const raw = String((apiRef && apiRef.options && apiRef.options.clock) || "10+0");
    if (raw === "none") return { base: 0, inc: 0, id: "none" };
    const match = /^(\d+)\+(\d+)$/.exec(raw);
    if (!match) return { base: 600000, inc: 0, id: "10+0" };
    return { base: Number(match[1]) * 60000, inc: Number(match[2]) * 1000, id: raw };
  }

  function timeLabel() {
    const id = String((apiRef && apiRef.options && apiRef.options.clock) || "10+0");
    return TIME_LABEL[id] || id;
  }

  function remainingOf(side) {
    const base = Math.max(0, Number(clock[side]) || 0);
    if (!base || over || side !== state.turn) return base;
    return Math.max(0, base - (Date.now() - clockStartedAt));
  }

  function isMyTurn() {
    return canPlayLocal();
  }

  function cancelledError() {
    const err = new Error("cancelled");
    err.cancelled = true;
    return err;
  }

  /* ------------------------------------------------------------------ */
  /* بناء الواجهة                                                       */
  /* ------------------------------------------------------------------ */

  function create(root, api) {
    apiRef = api;
    rootRef = root;
    root.innerHTML = "";
    el = {};
    engineFailed = false;
    concluded = false;

    if (online()) {
      const seat = api.net && api.net.seat;
      flip = seat === 1;
    } else {
      flip = false;
    }

    const layout = document.createElement("div");
    layout.className = "chess-layout";
    layout.innerHTML =
      '<section class="chess-main">' +
        '<div class="chess-center">' +
          '<div class="ch-player ch-player-top" data-ch-player="top">' +
            '<span class="ch-avatar is-b" data-ch-avatar aria-hidden="true"></span>' +
            '<div class="ch-player-copy">' +
              '<span class="ch-name-row"><strong data-ch-name></strong><span class="ch-you" data-ch-you hidden>أنت</span><span class="ch-cpu-tag" data-ch-cpu hidden>حاسوب</span></span>' +
              '<small data-ch-meta></small>' +
            '</div>' +
            '<div class="ch-captured" data-ch-captured aria-label="القطع المأسورة"></div>' +
            '<span class="ch-material" data-ch-material hidden></span>' +
            '<span class="ch-clock" data-ch-clock aria-live="off"><span data-ch-clock-time>10:00</span></span>' +
          '</div>' +
          '<div class="chess-board-wrap">' +
            '<div class="chess-board" data-ch-board role="grid" aria-label="رقعة الشطرنج"></div>' +
            '<div class="ch-check-toast" data-ch-check-toast hidden>كش!</div>' +
            '<div class="ch-promo" data-ch-promo hidden>' +
              '<div class="ch-promo-card" role="dialog" aria-modal="true" aria-label="ترقية البيدق">' +
                '<span class="ch-promo-kicker">اختر قطعة الترقية</span>' +
                '<strong>ترقية البيدق</strong>' +
                '<div class="ch-promo-row" data-ch-promo-row></div>' +
                '<button type="button" class="bg-btn small ghost" data-ch-promo-cancel>إلغاء</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ch-player ch-player-bottom" data-ch-player="bottom">' +
            '<span class="ch-avatar is-w" data-ch-avatar aria-hidden="true"></span>' +
            '<div class="ch-player-copy">' +
              '<span class="ch-name-row"><strong data-ch-name></strong><span class="ch-you" data-ch-you hidden>أنت</span><span class="ch-cpu-tag" data-ch-cpu hidden>حاسوب</span></span>' +
              '<small data-ch-meta></small>' +
            '</div>' +
            '<div class="ch-captured" data-ch-captured aria-label="القطع المأسورة"></div>' +
            '<span class="ch-material" data-ch-material hidden></span>' +
            '<span class="ch-clock" data-ch-clock aria-live="off"><span data-ch-clock-time>10:00</span></span>' +
          '</div>' +
          '<div class="ch-mobile-hint" data-ch-mobile-hint aria-hidden="true">اسحب القطعة أو انقر مرتين للتحريك</div>' +
        '</div>' +
      '</section>' +
      '<aside class="chess-side">' +
        '<section class="ch-panel ch-status-panel">' +
          '<div class="ch-panel-head">' +
            '<h3 class="ch-panel-title">المباراة</h3>' +
            '<span class="ch-engine-badge" data-ch-engine><i aria-hidden="true"></i>Stockfish</span>' +
          '</div>' +
          '<div class="ch-status" data-ch-status>' +
            '<span class="ch-status-dot" aria-hidden="true"></span>' +
            '<div class="ch-status-copy"><b data-ch-turn>دور الأبيض</b><small data-ch-note></small></div>' +
            '<span class="ch-eval" data-ch-eval hidden></span>' +
          '</div>' +
          '<div class="ch-meta-row">' +
            '<span class="ch-meta">المستوى <b data-ch-level>1000</b></span>' +
            '<span class="ch-meta">الساعة <b data-ch-tc>10 دقائق</b></span>' +
          '</div>' +
        '</section>' +
        '<section class="ch-panel ch-controls">' +
          '<button type="button" class="bg-btn small" data-ch-undo><span aria-hidden="true">↶</span> تراجع</button>' +
          '<button type="button" class="bg-btn small" data-ch-hint><span aria-hidden="true">✦</span> تلميح</button>' +
          '<button type="button" class="bg-btn small" data-ch-flip><span aria-hidden="true">⇅</span> عكس</button>' +
          '<button type="button" class="bg-btn small danger" data-ch-resign><span aria-hidden="true">⚑</span> استسلام</button>' +
          '<button type="button" class="bg-btn small primary ch-wide" data-ch-new><span aria-hidden="true">↻</span> إعادة اللعبة</button>' +
        '</section>' +
        '<section class="ch-panel ch-log-panel">' +
          '<div class="ch-panel-head">' +
            '<h3 class="ch-panel-title">سجل الحركات</h3>' +
            '<button type="button" class="ch-mini-btn" data-ch-copy title="نسخ سجل الحركات">نسخ</button>' +
          '</div>' +
          '<ol class="ch-moves" data-ch-moves aria-label="سجل الحركات"></ol>' +
        '</section>' +
      '</aside>';

    root.appendChild(layout);

    el.layout = layout;
    el.main = layout.querySelector(".chess-main");
    el.board = layout.querySelector("[data-ch-board]");
    el.top = playerRefs(layout.querySelector('[data-ch-player="top"]'));
    el.bottom = playerRefs(layout.querySelector('[data-ch-player="bottom"]'));
    el.status = layout.querySelector("[data-ch-status]");
    el.turn = layout.querySelector("[data-ch-turn]");
    el.note = layout.querySelector("[data-ch-note]");
    el.eval = layout.querySelector("[data-ch-eval]");
    el.moves = layout.querySelector("[data-ch-moves]");
    el.promo = layout.querySelector("[data-ch-promo]");
    el.promoRow = layout.querySelector("[data-ch-promo-row]");
    el.checkToast = layout.querySelector("[data-ch-check-toast]");
    el.engineBadge = layout.querySelector("[data-ch-engine]");
    el.level = layout.querySelector("[data-ch-level]");
    el.tc = layout.querySelector("[data-ch-tc]");
    el.copy = layout.querySelector("[data-ch-copy]");
    el.mobileHint = layout.querySelector("[data-ch-mobile-hint]");

    el.board.addEventListener("click", onBoardClick);
    el.board.addEventListener("keydown", onBoardKeydown);
    el.board.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("fullscreenchange", onFullscreenChange);

    layout.querySelector("[data-ch-undo]").addEventListener("click", undoMove);
    layout.querySelector("[data-ch-hint]").addEventListener("click", showHint);
    layout.querySelector("[data-ch-flip]").addEventListener("click", function () {
      flip = !flip;
      if (FX) FX.sound("flip");
      render();
    });
    layout.querySelector("[data-ch-resign]").addEventListener("click", resign);
    layout.querySelector("[data-ch-new]").addEventListener("click", restartGame);
    layout.querySelector("[data-ch-promo-cancel]").addEventListener("click", function () {
      pendingPromo = null;
      selected = -1;
      selectedMoves = [];
      hidePromotion();
      render();
    });
    if (el.copy) el.copy.addEventListener("click", copyMoves);

    buildBoard();
    newGame(true);

    if (new URLSearchParams(location.search).has("bgdebug")) {
      window.__bgDebug = {
        get state() { return state; },
        get history() { return history; },
        get over() { return over; },
        get thinking() { return thinking; },
        get clock() { return { w: remainingOf("w"), b: remainingOf("b") }; },
        get engineReady() { return !!engine && !engineFailed; },
        render,
        setFen(fen) {
          cancelSearch();
          stopHint();
          state = C.fromFEN(fen);
          initialFen = fen;
          history = [];
          lastMove = null;
          selected = -1;
          selectedMoves = [];
          pendingPromo = null;
          hintSquares = null;
          over = false;
          endReported = false;
          endInfo = null;
          concluded = false;
          currentEval = null;
          positionCounts = new Map();
          positionCounts.set(C.positionKey(state), 1);
          clockStartedAt = Date.now();
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
        hint: showHint,
      };
    }

    return {
      netSnapshot,
      netLoad,
      netSeat,
      netOver,
      netResume,
      destroy,
    };
  }

  function playerRefs(node) {
    return {
      node: node,
      avatar: node.querySelector("[data-ch-avatar]"),
      name: node.querySelector("[data-ch-name]"),
      you: node.querySelector("[data-ch-you]"),
      cpu: node.querySelector("[data-ch-cpu]"),
      meta: node.querySelector("[data-ch-meta]"),
      captured: node.querySelector("[data-ch-captured]"),
      material: node.querySelector("[data-ch-material]"),
      clock: node.querySelector("[data-ch-clock]"),
      clockTime: node.querySelector("[data-ch-clock-time]"),
    };
  }

  function buildBoard() {
    el.board.innerHTML = "";
    for (let vis = 0; vis < 64; vis++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "ch-sq";
      cell.dataset.vis = String(vis);
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = vis === 52 ? 0 : -1;

      const file = document.createElement("span");
      file.className = "ch-coord ch-coord-file";
      file.setAttribute("aria-hidden", "true");

      const rank = document.createElement("span");
      rank.className = "ch-coord ch-coord-rank";
      rank.setAttribute("aria-hidden", "true");

      const piece = document.createElement("img");
      piece.className = "ch-piece";
      piece.alt = "";
      piece.draggable = false;
      piece.hidden = true;
      piece.addEventListener("error", function () {
        piece.hidden = true;
      });

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

  function newGame(first) {
    cancelSearch();
    stopHint();
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }

    state = C.createGame ? C.createGame() : C.fromFEN(C.START_FEN);
    initialFen = C.START_FEN;
    history = [];
    lastMove = null;
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hintSquares = null;
    over = false;
    endReported = false;
    endInfo = null;
    concluded = false;
    currentEval = null;
    lastCheckSound = false;
    flagWarned = false;
    thinking = false;

    const spec = timeSpec();
    clock = { w: spec.base, b: spec.base };
    increment = spec.inc;
    clockStartedAt = Date.now();

    positionCounts = new Map();
    positionCounts.set(C.positionKey(state), 1);

    if (!first) {
      const hasCpu = isCpuSide("w") || isCpuSide("b");
      if (!online() && !flip && hasCpu) flip = isCpuSide("w") && !isCpuSide("b");
      if (APIhasCpuSeatW() && !APIhasCpuSeatB()) flip = true;
    }

    if (apiRef) apiRef.finished = false;
    hidePromotion();
    render();
    startClockLoop();
    maybeAi();
  }

  function APIhasCpuSeatW() {
    return isCpuSide("w") && !isCpuSide("b");
  }
  function APIhasCpuSeatB() {
    return isCpuSide("b") && !isCpuSide("w");
  }

  function render(opts) {
    if (!state || !el) return;
    const animate = opts && opts.animate;

    const board = state.board;
    const checkSq = C.inCheck(state, state.turn) ? state.kings[state.turn] : -1;
    const targets = new Set();
    for (let i = 0; i < selectedMoves.length; i++) targets.add(selectedMoves[i].to);
    const active = canPlayLocal();

    for (let vis = 0; vis < 64; vis++) {
      const r = vis >> 3;
      const c = vis & 7;
      const dr = flip ? 7 - r : r;
      const dc = flip ? 7 - c : c;
      const i = (dr << 4) | dc;
      const p = board[i];
      const cell = el.board.children[vis];

      let cls = "ch-sq " + ((dr + dc) % 2 === 0 ? "light" : "dark");
      if (drag && drag.moved && drag.from === i) cls += " is-drag-source";
      if (i === selected) cls += " is-selected";
      if (lastMove && (i === lastMove.from || i === lastMove.to)) cls += " is-last";
      if (targets.has(i)) cls += p ? " is-capture" : " is-legal";
      if (i === checkSq) cls += " is-check";
      if (hintSquares && (i === hintSquares.from || i === hintSquares.to)) cls += " is-hint";
      if (!active && !over) cls += " is-idle";
      cell.className = cls;
      cell.dataset.sq = String(i);

      const piece = cell._piece;
      if (p) {
        const color = C.colorOf(p);
        const type = C.typeOf(p);
        const src = pieceSrc(color, type);
        if (piece.getAttribute("src") !== src) piece.setAttribute("src", src);
        piece.hidden = false;
        piece.className = "ch-piece is-" + color;
        cell.setAttribute(
          "aria-label",
          squareLabel(i) + " " + (color === "w" ? "أبيض " : "أسود ") + PIECE_NAME[type]
        );
      } else {
        piece.removeAttribute("src");
        piece.hidden = true;
        piece.className = "ch-piece";
        cell.setAttribute("aria-label", squareLabel(i) + " فارغ");
      }

      cell._file.textContent = r === 7 ? FILES[dc] : "";
      cell._rank.textContent = c === 0 ? String(8 - dr) : "";
    }

    el.board.classList.toggle("is-locked", !active);
    el.board.classList.toggle("is-gameover", over);

    paintPlayers();
    paintClocks();
    updateStatus();
    updateEval();
    updateMoves();

    if (animate) animateMove(animate);
  }

  function paintPlayers() {
    if (!el) return;
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
    const isYou = online() && localSide() === side;

    refs.node.dataset.side = side;
    refs.avatar.className = "ch-avatar is-" + side;
    refs.avatar.innerHTML = '<img src="' + pieceSrc(side, "K") + '" alt="" draggable="false" />';
    refs.name.textContent = playerLabel(side);
    if (refs.you) refs.you.hidden = !isYou;
    if (refs.cpu) {
      refs.cpu.hidden = !seat.isCpu;
      refs.cpu.textContent = "حاسوب";
    }

    let meta;
    if (seat.isCpu) meta = "تصنيف ~" + BG.ai.chessRating(level) + " إيلو";
    else if (online()) meta = isYou ? "أنت · لاعب أونلاين" : "لاعب أونلاين";
    else meta = "لاعب";
    refs.meta.textContent = meta;

    const active = !over && state.turn === side && !endReported;
    refs.node.classList.toggle("is-active", active);
    refs.node.classList.toggle("is-you", isYou);
    refs.node.classList.toggle("is-low", remainingOf(side) > 0 && remainingOf(side) <= 30000);

    const enemy = other(side);
    const lost = missingPieces(enemy);
    refs.captured.innerHTML = "";
    for (let i = 0; i < lost.length; i++) {
      const img = document.createElement("img");
      img.className = "ch-captured-piece is-" + enemy;
      img.src = pieceSrc(enemy, lost[i]);
      img.alt = "";
      img.title = PIECE_NAME[lost[i]];
      img.draggable = false;
      refs.captured.appendChild(img);
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

  function paintClocks() {
    if (!el || !state) return;
    const noClock = !clock.w && !clock.b;
    const pairs = [
      [el.top, flip ? "w" : "b"],
      [el.bottom, flip ? "b" : "w"],
    ];

    for (let i = 0; i < pairs.length; i++) {
      const refs = pairs[i][0];
      const side = pairs[i][1];
      if (!refs) continue;
      const ms = remainingOf(side);
      const label = noClock ? "∞" : formatClock(ms);
      if (refs.clockTime.textContent !== label) refs.clockTime.textContent = label;
      refs.clock.classList.toggle("is-off", noClock);
      refs.clock.classList.toggle("is-active", !over && state.turn === side);
      refs.clock.classList.toggle("is-low", !noClock && ms <= 30000);
      refs.clock.classList.toggle("is-critical", !noClock && ms <= 10000);
      refs.clock.setAttribute(
        "aria-label",
        noClock ? "بلا ساعة" : "الوقت المتبقي " + (side === "w" ? "للأبيض " : "للأسود ") + label
      );
    }
  }

  function updateStatus() {
    if (!el) return;
    const side = state.turn;
    const inCheck = C.inCheck(state, side);
    let title;
    let note;
    let tone = "live";

    if (over && endInfo) {
      title = endInfo.title;
      note = endInfo.note;
      tone = "over";
    } else if (thinking) {
      title = "الحاسوب يفكّر…";
      note = "Stockfish يبحث عن أفضل حركة" + (inCheck ? " · الملك في كش" : "");
    } else if (hintBusy) {
      title = "جاري البحث عن تلميح…";
      note = "لحظات من فضلك.";
    } else if (online() && !canPlayLocal() && !over) {
      title = "دور " + sideName(side);
      note = isCpuSide(side) ? "الحاسوب يلعب الآن." : playerLabel(side) + " يفكّر…";
    } else if (inCheck) {
      title = "كش!";
      note = "ملك " + sideName(side) + " مهدد — يجب حمايته أو تحريكه.";
    } else {
      title = "دور " + sideName(side);
      if (pendingPromo) note = "اختر قطعة الترقية للمتابعة.";
      else if (history.length) note = "آخر حركة: " + sanArabic(history[history.length - 1].san);
      else note = "الأبيض يبدأ المباراة — بالتوفيق!";
    }

    el.status.classList.toggle("is-thinking", thinking && !over);
    el.status.classList.toggle("is-over", over);
    el.status.classList.toggle("is-check", !!inCheck && !over);
    el.turn.textContent = title;
    el.note.textContent = note;

    if (el.checkToast) {
      const showCheck = inCheck && !over && !thinking;
      el.checkToast.hidden = !showCheck;
    }

    if (inCheck && !over && !lastCheckSound) {
      lastCheckSound = true;
      if (FX) {
        setTimeout(function () {
          if (state && !over && C.inCheck(state, state.turn)) FX.sound("turn");
        }, 140);
      }
    } else if (!inCheck) {
      lastCheckSound = false;
    }

    if (apiRef && typeof apiRef.setStatus === "function") {
      apiRef.setStatus("الشطرنج — " + (over ? "انتهت المباراة" : title), over ? "over" : tone);
    }

    const cpuSide = isCpuSide("w") ? "w" : isCpuSide("b") ? "b" : null;
    if (el.level) el.level.textContent = cpuSide ? BG.ai.chessRating(levelOf(cpuSide)) : "لاعبان";
    if (el.tc) el.tc.textContent = timeLabel();
    if (el.engineBadge) {
      el.engineBadge.classList.toggle("is-offline", engineFailed);
      el.engineBadge.classList.toggle("is-thinking", thinking && !engineFailed);
      el.engineBadge.innerHTML = engineFailed
        ? '<i aria-hidden="true"></i>محرك احتياطي'
        : '<i aria-hidden="true"></i>Stockfish 17.1';
    }
  }

  function updateEval() {
    if (!el || !el.eval) return;
    if (currentEval == null || over) {
      el.eval.hidden = true;
      return;
    }
    let text = "";
    if (currentEval.mate != null) {
      const sign = currentEval.mate > 0 ? "+" : "-";
      text = "M" + Math.abs(currentEval.mate);
      el.eval.className = "ch-eval " + (currentEval.mate > 0 ? "is-good" : "is-bad");
      el.eval.title = "كش مات خلال " + Math.abs(currentEval.mate) + " نقلة";
      if (sign === "-") text = "-" + text;
    } else {
      const pawns = currentEval.cp / 100;
      text = (pawns > 0 ? "+" : "") + pawns.toFixed(1);
      el.eval.className = "ch-eval " + (pawns >= 0.4 ? "is-good" : pawns <= -0.4 ? "is-bad" : "is-even");
      el.eval.title = "تقييم Stockfish";
    }
    el.eval.textContent = text;
    el.eval.hidden = false;
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

  function cellAt(vis) {
    return el && el.board ? el.board.children[vis] : null;
  }

  function viewOf(sq) {
    const r = sq >> 4;
    const c = sq & 7;
    const vr = flip ? 7 - r : r;
    const vc = flip ? 7 - c : c;
    return { r: vr, c: vc };
  }

  function squareFromEvent(event) {
    const target = event.target && event.target.closest ? event.target.closest(".ch-sq") : null;
    if (!target || !el.board.contains(target)) return -1;
    const sq = Number(target.dataset.sq);
    return Number.isFinite(sq) ? sq : -1;
  }

  function squareFromPoint(x, y) {
    const node = document.elementFromPoint(x, y);
    const cell = node && node.closest ? node.closest(".ch-sq") : null;
    if (!cell || !el.board.contains(cell)) return -1;
    const sq = Number(cell.dataset.sq);
    return Number.isFinite(sq) ? sq : -1;
  }

  function onBoardClick(event) {
    if (suppressClick) return;
    const sq = squareFromEvent(event);
    if (sq >= 0) onSquare(sq);
  }

  function onSquare(i) {
    if (!state || !el) return;
    if (over) return;
    if (!canPlayLocal()) {
      if (online() && !isSpectator() && localSide() !== state.turn && apiRef && apiRef.toast) {
        apiRef.toast("انتظر دورك.", "warn");
      }
      return;
    }
    if (pendingPromo || thinking || hintBusy) return;

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

  function onBoardKeydown(event) {
    const cell = event.target && event.target.closest ? event.target.closest(".ch-sq") : null;
    if (!cell) return;
    const vis = Number(cell.dataset.vis);
    if (!Number.isFinite(vis)) return;
    let next = -1;
    if (event.key === "ArrowLeft") next = vis % 8 === 0 ? vis + 7 : vis - 1;
    else if (event.key === "ArrowRight") next = vis % 8 === 7 ? vis - 7 : vis + 1;
    else if (event.key === "ArrowUp") next = vis < 8 ? vis + 56 : vis - 8;
    else if (event.key === "ArrowDown") next = vis >= 56 ? vis - 56 : vis + 8;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 63;
    else if (event.key === "Escape") {
      if (document.body.classList.contains("fullscreen-game") && !document.fullscreenElement) {
        document.body.classList.remove("fullscreen-game");
      }
      return;
    } else {
      return;
    }
    event.preventDefault();
    for (let i = 0; i < el.board.children.length; i++) el.board.children[i].tabIndex = -1;
    const target = cellAt(next);
    if (!target) return;
    target.tabIndex = 0;
    target.focus();
  }

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    if (!canPlayLocal() || pendingPromo) return;
    const sq = squareFromEvent(event);
    if (sq < 0) return;
    const p = state.board[sq];
    if (!p || C.colorOf(p) !== state.turn) return;
    drag = {
      from: sq,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      ghost: null,
      target: -1,
    };
  }

  function startDragGhost(event) {
    if (!drag || drag.ghost) return;
    const p = state.board[drag.from];
    if (!p) return;
    const rect = el.board.getBoundingClientRect();
    const size = rect.width / 8;
    const img = document.createElement("img");
    img.className = "ch-ghost";
    img.src = pieceSrc(C.colorOf(p), C.typeOf(p));
    img.alt = "";
    img.draggable = false;
    img.style.width = size * 0.94 + "px";
    img.style.height = size * 0.94 + "px";
    img.style.left = event.clientX - size * 0.47 + "px";
    img.style.top = event.clientY - size * 0.47 + "px";
    document.body.appendChild(img);
    drag.ghost = img;
    drag.size = size;

    selected = drag.from;
    selectedMoves = C.legalMoves(state).filter(function (m) {
      return m.from === drag.from;
    });
    if (FX) FX.sound("select");
    render();
  }

  function clearDropHighlight() {
    if (!el) return;
    const marked = el.board.querySelectorAll(".ch-sq.is-drop");
    for (let i = 0; i < marked.length; i++) marked[i].classList.remove("is-drop");
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (dx * dx + dy * dy < 30) return;
      drag.moved = true;
      startDragGhost(event);
    }
    if (drag.ghost) {
      drag.ghost.style.left = event.clientX - drag.size * 0.47 + "px";
      drag.ghost.style.top = event.clientY - drag.size * 0.47 + "px";
    }
    const sq = squareFromPoint(event.clientX, event.clientY);
    if (sq !== drag.target) {
      drag.target = sq;
      clearDropHighlight();
      if (sq >= 0) {
        const vis = viewOf(sq);
        const cell = cellAt(vis.r * 8 + vis.c);
        if (cell) cell.classList.add("is-drop");
      }
    }
    if (event.cancelable) event.preventDefault();
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const info = drag;
    drag = null;
    if (info.ghost && info.ghost.parentNode) info.ghost.parentNode.removeChild(info.ghost);
    clearDropHighlight();
    if (!info.moved) return;

    suppressClick = true;
    setTimeout(function () {
      suppressClick = false;
    }, 0);

    const to = squareFromPoint(event.clientX, event.clientY);
    if (to < 0) {
      render();
      return;
    }
    if (to === info.from) {
      selected = -1;
      selectedMoves = [];
      render();
      return;
    }
    const move = selectedMoves.find(function (m) {
      return m.to === to;
    });
    if (move) {
      if (move.promo) openPromotion(info.from, to);
      else playMove(info.from, to, null);
    } else if (state.board[to] && C.colorOf(state.board[to]) === state.turn) {
      selected = to;
      selectedMoves = C.legalMoves(state).filter(function (m) {
        return m.from === to;
      });
      render();
    } else {
      selected = -1;
      selectedMoves = [];
      render();
    }
  }

  function onPointerCancel() {
    if (drag && drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
    drag = null;
    clearDropHighlight();
    render();
  }

  function onFullscreenChange() {
    if (!el || !el.layout) return;
    el.layout.classList.toggle("is-immersive", !!document.fullscreenElement);
  }

  /* ------------------------------------------------------------------ */
  /* تنفيذ الحركة                                                       */
  /* ------------------------------------------------------------------ */

  function playMove(from, to, promo) {
    if (!state || over) return;
    if (apiRef && apiRef.finished) return;
    if (online() && localSide() !== state.turn && !apiRef.net.isHost) return;

    const move = C.parseMove(state, from, to, promo);
    if (!move) return;

    const mover = state.turn;
    const now = Date.now();
    const left = clock[mover] ? Math.max(0, clock[mover] - (now - clockStartedAt)) : 0;
    const before = { w: clock.w, b: clock.b };

    if (clock[mover] && left <= 0) {
      clock[mover] = 0;
      flagFall(mover);
      return;
    }

    const san = C.moveToSAN(state, move);
    const undo = C.makeMove(state, move);
    const key = C.positionKey(state);

    if (clock[mover]) clock[mover] = left + increment;
    clockStartedAt = Date.now();

    positionCounts.set(key, (positionCounts.get(key) || 0) + 1);

    history.push({
      move: move,
      undo: undo,
      san: san,
      key: key,
      mover: mover,
      clockBefore: before,
    });
    lastMove = { from: move.from, to: move.to };
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hintSquares = null;
    currentEval = null;
    hidePromotion();

    if (FX) {
      if (move.promo) FX.sound("promote");
      else if (move.captured) FX.sound("capture");
      else if (move.castle && FX.after) FX.after(function () { FX.sound("move"); }, 40);
      else FX.sound("move");
    }

    const outcome = findOutcome();
    render({ animate: move });

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
      return { reason: "repetition", winner: null, result: "1/2-1/2" };
    }
    return null;
  }

  function reportEnd(outcome) {
    if (endReported) return;
    endReported = true;
    over = true;
    thinking = false;
    hintBusy = false;
    cancelSearch();
    stopHint();

    const finalTurn = state.turn;
    if (clock[finalTurn]) {
      clock[finalTurn] = Math.max(0, clock[finalTurn] - (Date.now() - clockStartedAt));
    }

    let title = "انتهت المباراة";
    let note = "";
    let result = "½–½";
    let icon = "♚";

    if (outcome.reason === "checkmate") {
      const winner = outcome.winner;
      title = "كش مات";
      note = playerLabel(winner) + " (" + sideName(winner) + ") يفوز بالمباراة.";
      result = winner === "w" ? "1–0" : "0–1";
      icon = "♚";
      playEndSound(outcome.winner, "win");
    } else if (outcome.reason === "stalemate") {
      title = "تعادل بالجمود";
      note = "لا توجد حركة قانونية والملك ليس في كش.";
      icon = "½";
      playEndSound(null, "draw");
    } else if (outcome.reason === "fifty") {
      title = "تعادل بقاعدة الخمسين";
      note = "مضت 50 حركة دون تحريك بيدق أو أخذ قطعة.";
      icon = "½";
      playEndSound(null, "draw");
    } else if (outcome.reason === "material") {
      title = "تعادل بالقطع غير الكافية";
      note = "لم يتبقَّ ما يكفي من القطع لتنفيذ كش مات.";
      icon = "½";
      playEndSound(null, "draw");
    } else if (outcome.reason === "repetition") {
      title = "تعادل بتكرار الوضع";
      note = "تكرر الوضع نفسه ثلاث مرات.";
      icon = "½";
      playEndSound(null, "draw");
    } else if (outcome.reason === "timeout") {
      const winner = outcome.winner;
      title = "انتهى الوقت";
      note = playerLabel(other(winner)) + " نفد وقته. فاز " + playerLabel(winner) + ".";
      result = winner === "w" ? "1–0" : "0–1";
      icon = "⏱";
      playEndSound(winner, "win");
    } else if (outcome.reason === "resign") {
      const winner = outcome.winner;
      title = "استسلام";
      note = playerLabel(other(winner)) + " استسلم. فاز " + playerLabel(winner) + ".";
      result = winner === "w" ? "1–0" : "0–1";
      icon = "⚑";
      playEndSound(winner, "win");
    }

    endInfo = { title: title, note: note, result: result, icon: icon };
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hidePromotion();
    render();

    setTimeout(function () {
      if (!over || !apiRef) return;
      apiRef.gameOver({ title: title, text: note, icon: icon });
    }, 480);
  }

  function playEndSound(winner, fallback) {
    if (!FX) return;
    if (!winner) {
      FX.sound("draw");
      return;
    }
    const local = online() ? localSide() : !isCpuSide(winner) ? winner : other(winner);
    FX.sound(winner === local ? "win" : "lose");
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
        '<img class="ch-piece" src="' + pieceSrc(color, type) + '" alt="" draggable="false" />' +
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
    if (!state) return;
    if (online()) {
      if (apiRef && apiRef.toast) apiRef.toast("التراجع غير متاح في المباريات الأونلاين.", "warn");
      return;
    }
    if (!history.length) {
      if (apiRef && apiRef.toast) apiRef.toast("لا توجد حركة للتراجع عنها.", "warn");
      return;
    }

    cancelSearch();
    stopHint();
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    hintSquares = null;
    pendingPromo = null;
    hidePromotion();
    currentEval = null;

    let record = popHistory();
    /* في مباراة ضد الحاسوب نتراجع عن نقلته ونقلتنا معًا لنعود إلى دورنا. */
    if (record && isCpuSide(record.mover) && history.length) record = popHistory();

    over = false;
    endReported = false;
    endInfo = null;
    concluded = false;
    selected = -1;
    selectedMoves = [];
    lastMove = history.length
      ? { from: history[history.length - 1].move.from, to: history[history.length - 1].move.to }
      : null;

    if (record && record.clockBefore) {
      clock = { w: record.clockBefore.w, b: record.clockBefore.b };
      clockStartedAt = Date.now();
    }

    if (apiRef) apiRef.finished = false;
    if (FX) FX.sound("recall");
    render();
    maybeAi();
  }

  function popHistory() {
    const record = history.pop();
    if (!record) return null;
    C.unmakeMove(state, record.undo);
    const count = (positionCounts.get(record.key) || 0) - 1;
    if (count <= 0) positionCounts.delete(record.key);
    else positionCounts.set(record.key, count);
    return record;
  }

  function showHint() {
    if (!state || over) return;
    if (pendingPromo) return;
    if (thinking || hintBusy) return;
    if (!canPlayLocal()) {
      if (apiRef && apiRef.toast) apiRef.toast("انتظر دورك للحصول على تلميح.", "warn");
      return;
    }

    const token = ++searchToken;
    hintBusy = true;
    render();

    engineSearch(C.toFEN(state), {
      movetime: 480,
      multipv: 2,
      limit: false,
      elo: 3600,
      style: "best",
    }, token)
      .then(function (result) {
        if (token !== searchToken) return null;
        if (!result || result.cancelled || !result.best) throw new Error("no result");
        const move = uciToMove(result.best);
        if (!move) throw new Error("illegal");
        hintBusy = false;
        setHint(move);
        return move;
      })
      .catch(function (err) {
        if (token !== searchToken) return;
        hintBusy = false;
        localHint(token);
        if (err && !err.cancelled) console.warn("Hint engine:", err);
      });
  }

  function localHint(token) {
    if (!state || over || token !== searchToken) return;
    let move = null;
    try {
      if (CAI && CAI.bestMove) {
        move = CAI.bestMove(C.clone(state), { depth: 3, timeLimit: 300, randomness: 0, blunder: 0 });
      }
    } catch (err) {
      move = null;
    }
    if (!move || typeof move.from !== "number") {
      if (apiRef && apiRef.toast) apiRef.toast("محرك التلميح غير متاح.", "warn");
      render();
      return;
    }
    setHint(move);
  }

  function setHint(move) {
    if (!state || over) return;
    hintSquares = { from: move.from, to: move.to };
    render();
    if (FX) FX.sound("point");
    if (apiRef && apiRef.toast) {
      apiRef.toast("تلميح: " + squareLabel(move.from) + " ← " + squareLabel(move.to), "good");
    }
    stopHint(true);
    hintTimer = setTimeout(function () {
      hintSquares = null;
      hintTimer = null;
      render();
    }, 2800);
  }

  function stopHint(keepSquares) {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (!keepSquares) {
      hintSquares = null;
      hintBusy = false;
    }
  }

  function resign() {
    if (!state || over) return;
    if (apiRef && apiRef.finished) return;
    if (online() && (isSpectator() || localSide() == null)) {
      if (apiRef && apiRef.toast) apiRef.toast("لا يمكن للمشاهدين الاستسلام.", "warn");
      return;
    }

    const doResign = function () {
      if (!state || over) return;
      cancelSearch();
      stopHint();
      const humanSide = online() ? localSide() : !isCpuSide("w") ? "w" : "b";
      if (!humanSide) return;
      const winner = other(humanSide);
      reportEnd({ reason: "resign", winner: winner, result: winner === "w" ? "1-0" : "0-1" });
    };

    if (BG.confirm && history.length) {
      BG.confirm("الاستسلام", "هل تريد الاستسلام وإنهاء المباراة؟", "نعم، أستسلم", "متابعة").then(function (ok) {
        if (ok) doResign();
      });
    } else {
      doResign();
    }
  }

  function restartGame() {
    if (online()) {
      if (apiRef && apiRef.newGame) apiRef.newGame();
      return;
    }
    const reset = function () {
      flip = isCpuSide("w") && !isCpuSide("b") ? true : flip;
      newGame();
      if (FX) FX.sound("shuffle");
    };
    if (history.length && !over && BG.confirm) {
      BG.confirm("إعادة اللعبة", "ستبدأ مباراة جديدة من البداية. هل تريد المتابعة؟", "إعادة", "إلغاء").then(function (ok) {
        if (ok) reset();
      });
    } else {
      reset();
    }
  }

  function copyMoves() {
    if (!history.length) {
      if (apiRef && apiRef.toast) apiRef.toast("لا توجد حركات لنسخها بعد.", "warn");
      return;
    }
    let pgn = "";
    for (let i = 0; i < history.length; i += 2) {
      pgn += i / 2 + 1 + ". " + history[i].san;
      if (history[i + 1]) pgn += " " + history[i + 1].san;
      pgn += " ";
    }
    if (endInfo) pgn += endInfo.result.replace(/–/g, "-");
    else pgn += "*";
    copyText(pgn.trim()).then(function (ok) {
      if (apiRef && apiRef.toast) {
        apiRef.toast(ok ? "تم نسخ سجل الحركات." : "تعذّر النسخ من المتصفح.", ok ? "good" : "warn");
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch (err) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* الساعة                                                             */
  /* ------------------------------------------------------------------ */

  function startClockLoop() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 200);
  }

  function tickClock() {
    if (!state || !el) return;
    paintClocks();
    if (over) return;
    if (!clock.w && !clock.b) return;
    const side = state.turn;
    if (remainingOf(side) > 0) return;
    clock[side] = 0;
    paintClocks();
    if (online() && !apiRef.net.isHost) {
      if (!endInfo && !flagWarned && apiRef && apiRef.toast) {
        flagWarned = true;
        apiRef.toast("انتهى وقتك — بانتظار احتساب النتيجة.", "warn");
      }
      return;
    }
    flagFall(side);
  }

  function flagFall(side) {
    if (over || !state) return;
    reportEnd({ reason: "timeout", winner: other(side), result: other(side) === "w" ? "1-0" : "0-1" });
  }

  /* ------------------------------------------------------------------ */
  /* محرك Stockfish                                                     */
  /* ------------------------------------------------------------------ */

  function ensureEngine() {
    if (engine && !engineFailed) return engineInit || Promise.resolve();
    if (engineFailed) return Promise.reject(new Error("engine unavailable"));
    if (typeof window.Worker !== "function") {
      engineFailed = true;
      return Promise.reject(new Error("workers unavailable"));
    }

    engine = new window.Worker(ENGINE_URL);
    engineInit = new Promise(function (resolve, reject) {
      let done = false;
      let initTimer = setTimeout(function () {
        if (done) return;
        done = true;
        engineFailed = true;
        try { engine.terminate(); } catch (err) { /* لا شيء */ }
        engine = null;
        engineInit = null;
        reject(new Error("engine init timeout"));
      }, 30000);

      engine.onmessage = function (event) {
        const text = typeof event.data === "string" ? event.data : event.data && event.data.data;
        if (!text) return;
        if (!done && text === "uciok") {
          done = true;
          clearTimeout(initTimer);
          try {
            engine.postMessage("setoption name Threads value 1");
            engine.postMessage("setoption name Hash value 16");
            engine.postMessage("setoption name Ponder value false");
          } catch (err) { /* لا شيء */ }
          resolve();
          return;
        }
        onEngineLine(text);
      };

      engine.onerror = function (event) {
        engineFailed = true;
        if (!done) {
          done = true;
          clearTimeout(initTimer);
          engineInit = null;
          reject(new Error((event && event.message) || "engine error"));
        }
        if (pendingSearch) finishSearch({ cancelled: true, error: "engine error" });
      };

      try {
        engine.postMessage("uci");
      } catch (err) {
        done = true;
        clearTimeout(initTimer);
        engineFailed = true;
        engineInit = null;
        reject(err);
      }
    });

    return engineInit;
  }

  function onEngineLine(text) {
    if (text === "uciok") return;

    if (text === "readyok") {
      if (pendingSearch) startPendingSearch();
      return;
    }

    if (text.indexOf("info ") === 0) {
      if (!pendingSearch) return;
      const pending = pendingSearch;
      const multi = /\bmultipv (\d+)\b/.exec(text);
      const rank = multi ? Number(multi[1]) : 1;
      const pv = /\bpv (\S+)/.exec(text);
      if (pv) pending.lines.set(rank, pv[1]);
      if (rank === 1) {
        const mate = /\bscore mate (-?\d+)\b/.exec(text);
        const cp = /\bscore cp (-?\d+)\b/.exec(text);
        if (mate) pending.score = { mate: Number(mate[1]) };
        else if (cp) pending.score = { cp: Number(cp[1]) };
      }
      return;
    }

    if (text.indexOf("bestmove") === 0) {
      if (!pendingSearch) return;
      const pending = pendingSearch;
      const parts = text.split(/\s+/);
      const best = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
      const moves = [];
      pending.lines.forEach(function (uci, rank) {
        moves.push({ rank: rank, uci: uci });
      });
      moves.sort(function (a, b) {
        return a.rank - b.rank;
      });
      finishSearch({
        best: best,
        moves: moves.map(function (m) { return m.uci; }),
        score: pending.score,
        elapsed: Date.now() - pending.startedAt,
      });
    }
  }

  function engineSearch(fen, cfg, token) {
    const task = engineQueue.then(function () {
      return doEngineSearch(fen, cfg, token);
    }, function () {
      return doEngineSearch(fen, cfg, token);
    });
    engineQueue = task.catch(function () {});
    return task;
  }

  function doEngineSearch(fen, cfg, token) {
    if (token !== searchToken) return Promise.resolve({ cancelled: true });
    return ensureEngine().then(function () {
      if (token !== searchToken) return { cancelled: true };
      return new Promise(function (resolve, reject) {
        const pending = {
          token: token,
          fen: fen,
          cfg: cfg,
          lines: new Map(),
          score: null,
          started: false,
          startedAt: 0,
          resolve: resolve,
          reject: reject,
          timer: null,
        };
        pendingSearch = pending;
        try {
          engine.postMessage("setoption name UCI_LimitStrength value " + (cfg.limit ? "true" : "false"));
          if (cfg.limit) engine.postMessage("setoption name UCI_Elo value " + Math.max(1320, Math.min(3190, cfg.elo || 1320)));
          engine.postMessage("setoption name MultiPV value " + Math.max(1, cfg.multipv || 1));
          engine.postMessage("isready");
        } catch (err) {
          pendingSearch = null;
          engineFailed = true;
          reject(err);
          return;
        }
        pending.timer = setTimeout(function () {
          if (pendingSearch !== pending) return;
          try { engine.postMessage("stop"); } catch (err) { /* لا شيء */ }
          finishSearch({ cancelled: true, error: "engine timeout" });
        }, Math.max(9000, (cfg.movetime || 1000) + 8000));
      });
    });
  }

  function startPendingSearch() {
    const pending = pendingSearch;
    if (!pending || pending.started) return;
    if (pending.token !== searchToken) {
      pendingSearch = null;
      pending.resolve({ cancelled: true });
      return;
    }
    pending.started = true;
    pending.startedAt = Date.now();
    try {
      engine.postMessage("position fen " + pending.fen);
      engine.postMessage("go movetime " + Math.max(120, pending.cfg.movetime || 600));
    } catch (err) {
      finishSearch({ cancelled: true, error: "engine post failed" });
    }
  }

  function finishSearch(result) {
    const pending = pendingSearch;
    if (!pending) return;
    pendingSearch = null;
    if (pending.timer) clearTimeout(pending.timer);
    if (pending.token !== searchToken) {
      pending.resolve({ cancelled: true });
      return;
    }
    if (result && result.error && result.cancelled) {
      pending.resolve(result);
      return;
    }
    pending.resolve(result || { cancelled: true });
  }

  function cancelSearch() {
    searchToken += 1;
    thinking = false;
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    const pending = pendingSearch;
    if (pending) {
      if (pending.started && engine) {
        try { engine.postMessage("stop"); } catch (err) { /* لا شيء */ }
      } else {
        pendingSearch = null;
        pending.resolve({ cancelled: true });
      }
    }
  }

  function uciToMove(uci) {
    if (!uci || uci.length < 4) return null;
    const from = C.parseSquare(uci.slice(0, 2));
    const to = C.parseSquare(uci.slice(2, 4));
    const promo = uci[4] ? uci[4].toUpperCase() : null;
    if (from < 0 || to < 0) return null;
    return C.parseMove(state, from, to, promo);
  }

  function chooseEngineMove(result, cfg) {
    if (!state) return null;
    const legal = C.legalMoves(state);
    if (!legal.length) return null;
    const legalKey = function (m) {
      return C.squareName(m.from) + C.squareName(m.to) + (m.promo || "");
    };
    const allowed = new Set(legal.map(legalKey));
    const options = [];
    const seen = new Set();

    if (result && result.best) {
      const best = uciToMove(result.best);
      if (best) {
        options.push(best);
        seen.add(legalKey(best));
      }
    }

    (result && result.moves ? result.moves : []).forEach(function (uci) {
      const move = uciToMove(uci);
      if (!move) return;
      const key = legalKey(move);
      if (seen.has(key) || !allowed.has(key)) return;
      seen.add(key);
      options.push(move);
    });

    if (!options.length) {
      const uciMove = result && result.best ? result.best.slice(0, 4) : "";
      const fallback = C.parseMove(state, C.parseSquare(uciMove.slice(0, 2)), C.parseSquare(uciMove.slice(2, 4)), null);
      return fallback || U.pick(legal);
    }

    if (cfg.style === "easy") {
      if (Math.random() < 0.2) return U.pick(legal);
      const pool = options.slice(1, 5);
      if (!pool.length) return options[0];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (cfg.style === "normal") {
      const roll = Math.random();
      if (roll < 0.68) return options[0];
      if (roll < 0.9 && options[1]) return options[1];
      if (options[2]) return options[2];
      return options[0];
    }

    return options[0];
  }

  function maybeAi() {
    if (!state || over || pendingPromo) return;
    if (!isCpuSide(state.turn)) return;
    if (!canRunCpu()) return;
    if (thinking) return;

    thinking = true;
    render();

    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(function () {
      aiTimer = null;
      runAI();
    }, 220 + Math.random() * 260);
  }

  function runAI() {
    if (!state || over || !isCpuSide(state.turn)) {
      thinking = false;
      render();
      return;
    }

    const level = levelOf(state.turn);
    const cfg = LEVEL_CFG[level] || LEVEL_CFG.normal;
    const token = ++searchToken;

    engineSearch(C.toFEN(state), cfg, token)
      .then(function (result) {
        if (token !== searchToken) return;
        if (!result || result.cancelled) throw cancelledError();
        const move = chooseEngineMove(result, cfg);
        if (!move) throw new Error("no engine move");
        thinking = false;
        if (result.score) currentEval = result.score;
        playMove(move.from, move.to, move.promo || null);
      })
      .catch(function (err) {
        if (token !== searchToken) return;
        if (err && err.cancelled) {
          thinking = false;
          render();
          return;
        }
        console.warn("Stockfish fallback:", err);
        localAI(token, cfg);
      });
  }

  function localAI(token, cfg) {
    if (!state || over || token !== searchToken) return;
    const legal = C.legalMoves(state);
    let move = null;
    try {
      if (CAI && CAI.bestMove) {
        move = CAI.bestMove(C.clone(state), {
          depth: cfg && cfg.style === "easy" ? 2 : cfg && cfg.style === "normal" ? 4 : 7,
          timeLimit: 1200,
          randomness: cfg && cfg.style === "easy" ? 80 : cfg && cfg.style === "normal" ? 15 : 0,
          blunder: cfg && cfg.style === "easy" ? 0.35 : cfg && cfg.style === "normal" ? 0.03 : 0,
        });
      }
    } catch (err) {
      move = null;
    }

    if (token !== searchToken) return;
    thinking = false;
    if (!move || typeof move.from !== "number") move = U.pick(legal);
    if (move) playMove(move.from, move.to, move.promo || null);
    else render();
  }

  function terminateEngine() {
    cancelSearch();
    engineQueue = Promise.resolve();
    if (engine) {
      try { engine.terminate(); } catch (err) { /* لا شيء */ }
    }
    engine = null;
    engineInit = null;
    engineFailed = false;
  }

  /* ------------------------------------------------------------------ */
  /* حركة القطع (FLIP خفيف)                                              */
  /* ------------------------------------------------------------------ */

  function animateMove(move) {
    if (!el || !move || REDUCED) return;
    const board = el.board;
    const size = board.clientWidth / 8;
    if (!size) return;
    const fromPiece = move.piece || (state.board[move.to] || "");
    const color = C.colorOf(fromPiece) || (state.turn === "w" ? "b" : "w");
    const type = move.promo ? move.promo.toUpperCase() : C.typeOf(fromPiece) || "P";
    flyPiece(move.from, move.to, color, type, size);

    if (move.castle) {
      const rook = castleRook(move.castle);
      if (rook) flyPiece(rook.from, rook.to, color, "R", size);
    }

    const dest = viewOf(move.to);
    const cell = cellAt(dest.r * 8 + dest.c);
    if (cell && cell._piece) {
      cell._piece.classList.add("is-arriving");
      setTimeout(function () {
        if (cell._piece) cell._piece.classList.remove("is-arriving");
      }, 190);
    }
  }

  function castleRook(code) {
    if (code === "K") return { from: 119, to: 117 };
    if (code === "Q") return { from: 112, to: 115 };
    if (code === "k") return { from: 7, to: 5 };
    if (code === "q") return { from: 0, to: 3 };
    return null;
  }

  function flyPiece(from, to, color, type, size) {
    if (!el || !el.board) return;
    const a = viewOf(from);
    const b = viewOf(to);
    const img = document.createElement("img");
    img.className = "ch-ghost is-fly";
    img.src = pieceSrc(color, type);
    img.alt = "";
    img.draggable = false;
    img.style.width = size * 0.92 + "px";
    img.style.height = size * 0.92 + "px";
    img.style.left = a.c * size + size * 0.04 + "px";
    img.style.top = a.r * size + size * 0.04 + "px";
    el.board.appendChild(img);
    const dx = (b.c - a.c) * size;
    const dy = (b.r - a.r) * size;

    if (img.animate) {
      const anim = img.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)" },
          { transform: "translate3d(" + dx + "px," + dy + "px,0) scale(1.02)" },
        ],
        { duration: 185, easing: "cubic-bezier(.22,.75,.25,1)", fill: "both" }
      );
      anim.onfinish = function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      };
      setTimeout(function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      }, 240);
    } else {
      setTimeout(function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      }, 30);
    }
  }

  /* ------------------------------------------------------------------ */
  /* الأونلاين                                                          */
  /* ------------------------------------------------------------------ */

  function moveToUci(move) {
    return C.squareName(move.from) + C.squareName(move.to) + (move.promo ? move.promo.toLowerCase() : "");
  }

  function netSnapshot() {
    if (!state) return null;
    return BG.netCodec.encode({
      v: 1,
      start: initialFen,
      fen: C.toFEN(state),
      moves: history.map(function (record) {
        return moveToUci(record.move);
      }),
      lastMove: lastMove,
      clock: { w: clock.w, b: clock.b },
      increment: increment,
      startedAt: clockStartedAt,
      over: over,
      endInfo: endInfo,
      eval: currentEval,
      flip: flip,
      players: ((apiRef && apiRef.players) || []).map(function (player) {
        return {
          name: player.name,
          type: player.type,
          level: player.level,
          isCpu: !!player.isCpu,
        };
      }),
    });
  }

  function netLoad(data) {
    if (!data || !el) return;
    const snap = BG.netCodec.decode(data);
    if (!snap) return;
    BG.closeDialogs();

    cancelSearch();
    stopHint();
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }

    const startFen = typeof snap.start === "string" && snap.start ? snap.start : C.START_FEN;
    const moves = Array.isArray(snap.moves) ? snap.moves : [];
    let replay = C.fromFEN(startFen);
    let hist = [];
    let counts = new Map();
    counts.set(C.positionKey(replay), 1);
    let replayOk = true;
    let last = null;

    for (let i = 0; i < moves.length; i++) {
      const uci = String(moves[i] || "");
      const from = C.parseSquare(uci.slice(0, 2));
      const to = C.parseSquare(uci.slice(2, 4));
      const promo = uci[4] ? uci[4].toUpperCase() : null;
      const move = C.parseMove(replay, from, to, promo);
      if (!move) {
        replayOk = false;
        break;
      }
      const mover = replay.turn;
      const san = C.moveToSAN(replay, move);
      const undo = C.makeMove(replay, move);
      const key = C.positionKey(replay);
      counts.set(key, (counts.get(key) || 0) + 1);
      hist.push({ move: move, undo: undo, san: san, key: key, mover: mover });
      last = { from: move.from, to: move.to };
    }

    if (!replayOk) {
      const fen = typeof snap.fen === "string" && snap.fen ? snap.fen : startFen;
      replay = C.fromFEN(fen);
      hist = [];
      counts = new Map();
      counts.set(C.positionKey(replay), 1);
      last = null;
    }

    state = replay;
    initialFen = startFen;
    history = hist;
    positionCounts = counts;
    lastMove = last || (snap.lastMove && typeof snap.lastMove.from === "number" ? snap.lastMove : null);
    selected = -1;
    selectedMoves = [];
    pendingPromo = null;
    hintSquares = null;
    thinking = false;
    hintBusy = false;
    lastCheckSound = false;
    flagWarned = false;
    hidePromotion();

    over = !!snap.over;
    endReported = over;
    endInfo = over && snap.endInfo ? snap.endInfo : null;
    concluded = false;
    currentEval = snap.eval && (typeof snap.eval.cp === "number" || typeof snap.eval.mate === "number") ? snap.eval : null;

    const spec = timeSpec();
    const loadedClock = snap.clock || {};
    clock = {
      w: Number.isFinite(Number(loadedClock.w)) ? Math.max(0, Number(loadedClock.w)) : spec.base,
      b: Number.isFinite(Number(loadedClock.b)) ? Math.max(0, Number(loadedClock.b)) : spec.base,
    };
    increment = Number.isFinite(Number(snap.increment)) ? Math.max(0, Number(snap.increment)) : spec.inc;
    clockStartedAt = Number(snap.startedAt) || Date.now();
    if (!online() || clockStartedAt > Date.now() + 2000 || Math.abs(Date.now() - clockStartedAt) > 12 * 3600 * 1000) {
      clockStartedAt = Date.now();
    }
    if (!online() && typeof snap.flip === "boolean") flip = snap.flip;

    startClockLoop();
    render();
    setTimeout(function () {
      if (!state || !el) return;
      render();
      if (!over) maybeAi();
    }, 0);
  }

  function netSeat() {
    if (!state) return -1;
    return state.turn === "w" ? 0 : 1;
  }

  function netOver() {
    return !!over;
  }

  function netResume() {
    if (!state || !el) return;
    if (over) {
      render();
      return;
    }
    if (isSpectator()) {
      render();
      return;
    }
    cancelSearch();
    thinking = false;
    render();
    maybeAi();
  }

  /* ------------------------------------------------------------------ */
  /* التدمير                                                            */
  /* ------------------------------------------------------------------ */

  function destroy() {
    cancelSearch();
    stopHint();
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = null;
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
    terminateEngine();

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("fullscreenchange", onFullscreenChange);

    if (drag && drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
    drag = null;

    el = null;
    state = null;
    rootRef = null;
    apiRef = null;
    history = [];
    positionCounts = new Map();
    pendingPromo = null;
    hintSquares = null;
    lastMove = null;
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
    tagline: "اللعبة الملكية بمحرك Stockfish حقيقي، ساعة، وسجل حركات.",
    players: "2",
    counts: [2],
    duration: "5–60 دقيقة",
    complexity: "عالية",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "اختر ساعة المباراة. تُضاف الزيادة بعد كل حركة، ويمكنك اللعب بلا ساعة.",
      defaults: { clock: "10+0" },
      fields: [
        {
          key: "clock",
          label: "ساعة المباراة",
          type: "seg",
          wide: true,
          choices: [
            { value: "3+2", label: "3+2" },
            { value: "5+0", label: "5 دقائق" },
            { value: "10+0", label: "10 دقائق" },
            { value: "15+10", label: "15+10" },
            { value: "30+0", label: "30 دقيقة" },
            { value: "none", label: "بلا ساعة" },
          ],
        },
      ],
      summary(options) {
        const id = String((options && options.clock) || "10+0");
        return "الساعة: " + (TIME_LABEL[id] || id);
      },
    },

    rules: {
      goal: "إماتة ملك الخصم (كش مات)، أو إجباره على الاستسلام أو نفاد وقته.",
      facts: [
        ["الرقعة", "8×8 = 64 مربعًا"],
        ["القطع", "16 لكل لاعب"],
        ["المحرك", "Stockfish 17.1 WASM"],
        ["اللاعبون", "لاعبان"],
      ],
      components: [
        "رقعة شطرنج 8×8 باللونين الفاتح والداكن",
        "16 قطعة بيضاء و16 قطعة سوداء: 8 بيادق، رخان، حصانان، فيلان، وزير، ملك",
        "ساعة إلكترونية لكل لاعب مع زيادة اختيارية بعد كل حركة",
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
        "يفوز من ينفذ كش مات على ملك الخصم. وتُحسم المباراة أيضًا بالاستسلام أو نفاد الوقت أو التعادل بالجمود أو بقاعدة الخمسين حركة أو تكرار الوضع ثلاث مرات أو القطع غير الكافية للإماتة.",
      notes: [
        "تصنيفات الحاسوب: 250، 1000، 2000، و3600 إيلو، بمحرك Stockfish حقيقي.",
        "اسحب القطعة بالماوس أو اللمس، أو انقر عليها ثم انقر على المربع الهدف.",
        "زر «تراجع» يعيد حركتك وحركة الحاسوب الأخيرة معًا، وهو غير متاح في المباريات الأونلاين.",
        "يمكنك عكس اتجاه الرقعة، ونسخ سجل الحركات، واستخدام ملء الشاشة من شريط اللعبة.",
      ],
    },

    create: create,
  };

  BG.register(game);
})();
