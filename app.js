/* =========================================================
   Chess Arena — منطق التطبيق
   ========================================================= */
(function () {
  "use strict";

  const C = window.Chess;
  const AI = window.ChessAI;
  if (!C) return;

  const $ = (sel) => document.querySelector(sel);
  const STORE_GAME = "chess.arena.game.v1";
  const STORE_PREFS = "chess.arena.prefs.v1";

  const GLYPH_SOLID = { P: "♟", N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };
  const GLYPH_LINE = { P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
  const PIECE_SETS = [
    { id: "classic", name: "كلاسيكي" },
    { id: "ivory", name: "عاجي" },
    { id: "line", name: "خطّي" },
    { id: "flat", name: "مسطّح" },
  ];
  const PIECE_IDS = PIECE_SETS.map((s) => s.id);
  const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const PIECE_AR = { P: "بيدق", N: "حصان", B: "فيل", R: "قلعة", Q: "وزير", K: "ملك" };
  const FILES = "abcdefgh";
  const LEVEL_LABEL = { beginner: "مبتدئ", easy: "سهل (250)", medium: "متوسط (1000)", hard: "صعب", expert: "خبير (3600)" };
  const BOARD_THEMES = [
    { id: "classic", name: "كلاسيكي", light: "#f0d9b5", dark: "#b58863" },
    { id: "wood", name: "خشبي", light: "#e7cfa6", dark: "#9b6b40" },
    { id: "emerald", name: "زمردي", light: "#e7ecda", dark: "#6f9270" },
    { id: "ocean", name: "محيطي", light: "#dce9ef", dark: "#5c8099" },
    { id: "marble", name: "رخامي", light: "#eceae4", dark: "#a3a29b" },
    { id: "amethyst", name: "جمشت", light: "#e5ddf0", dark: "#7c679e" },
  ];
  const BOARD_IDS = BOARD_THEMES.map((t) => t.id);
  const ARROW_COLOR = "#f0b23f";
  const PREMOVE_COLOR = "#4cd7c0";
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- التفضيلات ---------- */
  function loadPrefs() {
    const p = { mode: "ai", level: "medium", color: "w", minutes: 10, sound: true, theme: "dark", board: "classic", pieces: "classic" };
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_PREFS) || "{}");
      if (raw && typeof raw === "object") Object.assign(p, raw);
    } catch (err) { /* ignore */ }
    if (!LEVEL_LABEL[p.level]) p.level = "medium";
    if (p.color !== "w" && p.color !== "b" && p.color !== "random") p.color = "w";
    p.minutes = [0, 3, 5, 10, 15, 30].includes(Number(p.minutes)) ? Number(p.minutes) : 10;
    p.theme = p.theme === "light" ? "light" : "dark";
    p.board = BOARD_IDS.includes(p.board) ? p.board : "classic";
    p.pieces = PIECE_IDS.includes(p.pieces) ? p.pieces : "classic";
    p.sound = p.sound !== false;
    p.mode = p.mode === "pvp" ? "pvp" : "ai";
    return p;
  }

  let prefs = loadPrefs();

  function savePrefs() {
    try { localStorage.setItem(STORE_PREFS, JSON.stringify(prefs)); } catch (err) { /* ignore */ }
  }

  /* ---------- الحالة ---------- */
  let game = null;
  let sessionToken = 0;
  let selected = -1;
  let legal = [];
  let hint = null;
  let thinking = false;
  let viewIndex = null;
  let overShown = false;
  let aiInfo = null;
  let drag = null;
  let clockTimer = null;
  let lastTick = performance.now();
  let lastClockSave = 0;
  let requestSeq = 0;
  let worker = null;
  let workerBroken = false;
  const pending = new Map();
  let liveCache = { fen: null, state: null };
  let selectingPremove = false;
  let premove = null;
  let arrows = [];
  let marks = new Set();
  let arrowMode = false;
  let shapeDrag = null;
  let shapesEl = null;

  const boardEl = $("#board");

  function liveState() {
    const fen = game.fens[game.fens.length - 1];
    if (liveCache.fen !== fen) liveCache = { fen, state: C.fromFEN(fen) };
    return liveCache.state;
  }

  function viewState() {
    if (viewIndex === null) return liveState();
    return C.fromFEN(game.fens[viewIndex] || game.fens[0]);
  }

  function fenKey(fen) {
    return String(fen).split(" ").slice(0, 4).join(" ");
  }

  function isLive() {
    return viewIndex === null;
  }

  function anyDialogOpen() {
    return !!document.querySelector("dialog[open]");
  }

  /* ---------- تصاميم الرقعة ---------- */
  function themeById(id) {
    return BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];
  }

  function applyBoardTheme(id) {
    const theme = themeById(id);
    document.documentElement.dataset.board = theme.id;
  }

  function updateBoardThemeUI() {
    const theme = themeById(prefs.board);
    const label = $("#boardName");
    if (label) label.textContent = theme.name;
    for (const btn of document.querySelectorAll("#boardSwatches .board-swatch")) {
      const active = btn.dataset.board === theme.id;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function renderBoardSwatches() {
    const box = $("#boardSwatches");
    if (!box) return;
    box.innerHTML = "";
    for (const t of BOARD_THEMES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "board-swatch" + (t.id === prefs.board ? " active" : "");
      btn.dataset.board = t.id;
      btn.title = "تصميم " + t.name;
      btn.setAttribute("aria-label", "تصميم الرقعة: " + t.name);
      btn.setAttribute("aria-pressed", t.id === prefs.board ? "true" : "false");
      btn.style.setProperty("--sw-light", t.light);
      btn.style.setProperty("--sw-dark", t.dark);
      const chip = document.createElement("span");
      chip.setAttribute("aria-hidden", "true");
      btn.appendChild(chip);
      box.appendChild(btn);
    }
    updateBoardThemeUI();
  }

  function setBoardTheme(id) {
    if (!BOARD_IDS.includes(id)) return;
    const changed = prefs.board !== id;
    prefs.board = id;
    applyBoardTheme(id);
    savePrefs();
    updateBoardThemeUI();
    if (changed) toast("تصميم الرقعة: " + themeById(id).name);
  }

  /* ---------- تصاميم القطع ---------- */
  function pieceSetById(id) {
    return PIECE_SETS.find((s) => s.id === id) || PIECE_SETS[0];
  }

  function glyphFor(type, setId) {
    const id = setId || prefs.pieces;
    const map = id === "line" ? GLYPH_LINE : GLYPH_SOLID;
    return map[String(type).toUpperCase()] || "";
  }

  function applyPieceSet(id) {
    document.documentElement.dataset.pieces = pieceSetById(id).id;
  }

  function updatePieceSetUI() {
    const set = pieceSetById(prefs.pieces);
    const label = $("#piecesName");
    if (label) label.textContent = set.name;
    for (const btn of document.querySelectorAll("#pieceSwatches .piece-swatch")) {
      const active = btn.dataset.pieceSet === set.id;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function renderPieceSwatches() {
    const box = $("#pieceSwatches");
    if (!box) return;
    box.innerHTML = "";
    for (const set of PIECE_SETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "piece-swatch" + (set.id === prefs.pieces ? " active" : "");
      btn.dataset.pieceSet = set.id;
      btn.title = "تصميم " + set.name;
      btn.setAttribute("aria-label", "تصميم القطع: " + set.name);
      btn.setAttribute("aria-pressed", set.id === prefs.pieces ? "true" : "false");

      const pv = document.createElement("span");
      pv.className = "pv";
      pv.dataset.pieceSet = set.id;
      pv.setAttribute("aria-hidden", "true");

      const light = document.createElement("span");
      light.className = "pv-sq light";
      const blackPiece = document.createElement("span");
      blackPiece.className = "pv-piece b";
      blackPiece.textContent = glyphFor("N", set.id);
      light.appendChild(blackPiece);

      const dark = document.createElement("span");
      dark.className = "pv-sq dark";
      const whitePiece = document.createElement("span");
      whitePiece.className = "pv-piece w";
      whitePiece.textContent = glyphFor("N", set.id);
      dark.appendChild(whitePiece);

      pv.appendChild(light);
      pv.appendChild(dark);
      btn.appendChild(pv);

      const label = document.createElement("span");
      label.className = "pv-label";
      label.textContent = set.name;
      btn.appendChild(label);

      box.appendChild(btn);
    }
    updatePieceSetUI();
  }

  function setPieceSet(id) {
    if (!PIECE_IDS.includes(id)) return;
    const changed = prefs.pieces !== id;
    prefs.pieces = id;
    applyPieceSet(id);
    savePrefs();
    updatePieceSetUI();
    render();
    if (changed) toast("تصميم القطع: " + pieceSetById(id).name);
  }

  /* ---------- الأسهم والعلامات ---------- */
  function clearDrawing() {
    arrows = [];
    marks = new Set();
  }

  function clearShapes() {
    if (!arrows.length && !marks.size) {
      toast("لا توجد أسهم أو علامات لمسحها");
      return;
    }
    clearDrawing();
    render();
    toast("تم مسح الأسهم والعلامات");
  }

  function toggleArrow(from, to) {
    const i = arrows.findIndex((a) => a.from === from && a.to === to);
    if (i >= 0) arrows.splice(i, 1);
    else arrows.push({ from, to });
  }

  function toggleMark(sq) {
    if (marks.has(sq)) marks.delete(sq);
    else marks.add(sq);
  }

  function squareCenter(sq) {
    const file = sq & 7;
    const row = sq >> 4;
    const flipped = !!(game && game.flipped);
    const vf = flipped ? 7 - file : file;
    const vr = flipped ? 7 - row : row;
    return { x: vf + 0.5, y: vr + 0.5 };
  }

  function svgNode(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const key of Object.keys(attrs)) el.setAttribute(key, attrs[key]);
    }
    return el;
  }

  function appendArrow(svg, from, to, opts) {
    opts = opts || {};
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.08) return null;

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const startPad = 0.3;
    const tipPad = 0.1;
    const headLen = 0.34;
    const headHalf = 0.17;
    const color = opts.color || ARROW_COLOR;
    const opacity = opts.opacity === undefined ? 1 : opts.opacity;

    const sx = from.x + ux * startPad;
    const sy = from.y + uy * startPad;
    const tipX = to.x - ux * tipPad;
    const tipY = to.y - uy * tipPad;
    const bx = tipX - ux * headLen;
    const by = tipY - uy * headLen;

    const line = svgNode("line", {
      x1: sx,
      y1: sy,
      x2: bx,
      y2: by,
      stroke: color,
      "stroke-width": opts.width || 0.13,
      "stroke-linecap": "round",
      opacity: opacity,
    });
    if (opts.dashed) line.setAttribute("stroke-dasharray", "0.17 0.13");

    const head = svgNode("polygon", {
      points: tipX + "," + tipY + " " + (bx + px * headHalf) + "," + (by + py * headHalf) + " " + (bx - px * headHalf) + "," + (by - py * headHalf),
      fill: color,
      opacity: opacity,
    });

    const group = svgNode("g");
    if (opts.className) group.setAttribute("class", opts.className);
    group.appendChild(line);
    group.appendChild(head);
    svg.appendChild(group);
    return group;
  }

  function appendMark(svg, sq) {
    const c = squareCenter(sq);
    svg.appendChild(svgNode("rect", {
      x: c.x - 0.37,
      y: c.y - 0.37,
      width: 0.74,
      height: 0.74,
      rx: 0.12,
      fill: "rgba(240, 178, 63, 0.16)",
      stroke: ARROW_COLOR,
      "stroke-width": 0.07,
      opacity: 0.92,
    }));
  }

  function renderShapes() {
    const svg = svgNode("svg", {
      class: "shapes",
      viewBox: "0 0 8 8",
      preserveAspectRatio: "none",
      "aria-hidden": "true",
    });
    for (const arrow of arrows) {
      appendArrow(svg, squareCenter(arrow.from), squareCenter(arrow.to));
    }
    for (const sq of marks) appendMark(svg, sq);
    if (premove && isLive() && !game.over) {
      appendArrow(svg, squareCenter(premove.from), squareCenter(premove.to), {
        color: PREMOVE_COLOR,
        dashed: true,
        width: 0.15,
      });
    }
    boardEl.appendChild(svg);
    shapesEl = svg;
  }

  function boardPoint(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(8, ((clientX - rect.left) / rect.width) * 8)),
      y: Math.max(0, Math.min(8, ((clientY - rect.top) / rect.height) * 8)),
    };
  }

  function setArrowMode(on, silent) {
    arrowMode = !!on;
    boardEl.classList.toggle("arrow-mode", arrowMode);
    const btn = $("#btnArrows");
    if (btn) btn.setAttribute("aria-pressed", arrowMode ? "true" : "false");
    const badge = $("#arrowBadge");
    if (badge) badge.hidden = !arrowMode;
    if (arrowMode) cancelDrag();
    if (!silent) {
      toast(arrowMode ? "وضع الأسهم مفعّل — اسحب لرسم سهم، وانقر لوضع علامة" : "تم إيقاف وضع الأسهم");
    }
  }

  /* ---------- الحركة المسبقة ---------- */
  function canPremove() {
    if (!game || game.over || viewIndex !== null || anyDialogOpen()) return false;
    if (game.mode !== "ai") return false;
    return liveState().turn !== game.humanColor;
  }

  function setPremove(from, to) {
    if (!canPremove()) return;
    premove = { from, to };
    selected = -1;
    legal = [];
    selectingPremove = false;
    render();
    toast("حركة مسبقة: " + C.squareName(from) + " → " + C.squareName(to) + " — تُنفّذ بعد رد الكمبيوتر");
  }

  function cancelPremove(notify) {
    if (!premove) return;
    premove = null;
    if (selectingPremove) {
      selected = -1;
      legal = [];
      selectingPremove = false;
    }
    render();
    if (notify) toast("تم إلغاء الحركة المسبقة");
  }

  function tryPremove() {
    if (!premove) return;
    if (!game || game.over || !isLive()) {
      premove = null;
      return;
    }
    const st = liveState();
    if (st.turn !== game.humanColor) return;

    const target = premove;
    const candidates = C.legalMoves(st).filter((m) => m.from === target.from && m.to === target.to);
    premove = null;

    if (!candidates.length) {
      selected = -1;
      legal = [];
      selectingPremove = false;
      render();
      toast("تعذر تنفيذ الحركة المسبقة — أُلغيت");
      return;
    }

    const pick = candidates.find((m) => String(m.promo || "").toUpperCase() === "Q") ||
      candidates.find((m) => m.promo) || candidates[0];
    if (pick.promo) toast("ترقية تلقائية إلى وزير");
    applyMove(pick, false);
  }

  /* ---------- الحفظ والاستعادة ---------- */
  function save() {
    if (!game) return;
    try {
      localStorage.setItem(STORE_GAME, JSON.stringify({
        startFEN: game.startFEN,
        fens: game.fens,
        sans: game.sans,
        moves: game.moves,
        mode: game.mode,
        level: game.level,
        humanColor: game.humanColor,
        flipped: game.flipped,
        clock: game.clock,
        over: game.over,
      }));
    } catch (err) { /* ignore */ }
  }

  function normalizeClock(raw) {
    if (!raw || !raw.enabled) return { enabled: false, minutes: 0, w: 0, b: 0, started: false };
    const minutes = Number(raw.minutes) || 0;
    return {
      enabled: true,
      minutes,
      w: Number.isFinite(raw.w) ? Math.max(0, raw.w) : minutes * 60000,
      b: Number.isFinite(raw.b) ? Math.max(0, raw.b) : minutes * 60000,
      started: !!raw.started,
    };
  }

  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE_GAME) || "null"); } catch (err) { return false; }
    if (!data || !Array.isArray(data.fens) || !data.fens.length) return false;
    if (!Array.isArray(data.moves) || data.moves.length !== data.fens.length - 1) return false;
    if (!Array.isArray(data.sans) || data.sans.length !== data.moves.length) return false;

    try {
      for (let i = 0; i < data.fens.length; i++) C.fromFEN(data.fens[i]);
    } catch (err) {
      return false;
    }

    game = {
      startFEN: typeof data.startFEN === "string" ? data.startFEN : C.START_FEN,
      fens: data.fens.slice(),
      sans: data.sans.slice(),
      moves: data.moves.slice(),
      mode: data.mode === "pvp" ? "pvp" : "ai",
      level: LEVEL_LABEL[data.level] ? data.level : "medium",
      humanColor: data.humanColor === "b" ? "b" : "w",
      flipped: !!data.flipped,
      clock: normalizeClock(data.clock),
      over: data.over && data.over.result ? data.over : null,
    };
    sessionToken++;
    liveCache = { fen: null, state: null };
    viewIndex = null;
    selected = -1;
    legal = [];
    selectingPremove = false;
    premove = null;
    arrows = [];
    marks = new Set();
    shapeDrag = null;
    hint = null;
    thinking = false;
    aiInfo = null;
    overShown = !!game.over;
    lastTick = performance.now();
    return true;
  }

  /* ---------- بدء لعبة ---------- */
  function startGame(cfg, opts) {
    opts = opts || {};
    const isPvp = cfg.mode === "pvp";
    const color = isPvp ? "w" : cfg.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : cfg.color;
    const minutes = Number(cfg.minutes) || 0;

    sessionToken++;
    liveCache = { fen: null, state: null };
    game = {
      startFEN: C.START_FEN,
      fens: [C.START_FEN],
      sans: [],
      moves: [],
      mode: cfg.mode === "pvp" ? "pvp" : "ai",
      level: LEVEL_LABEL[cfg.level] ? cfg.level : "medium",
      humanColor: color === "b" ? "b" : "w",
      flipped: color === "b",
      clock: {
        enabled: minutes > 0,
        minutes,
        w: minutes * 60000,
        b: minutes * 60000,
        started: false,
      },
      over: null,
    };

    selected = -1;
    legal = [];
    selectingPremove = false;
    premove = null;
    arrows = [];
    marks = new Set();
    shapeDrag = null;
    hint = null;
    thinking = false;
    viewIndex = null;
    overShown = false;
    aiInfo = null;
    lastTick = performance.now();
    setArrowMode(false, true);

    prefs.mode = game.mode;
    prefs.level = game.level;
    prefs.minutes = minutes;
    savePrefs();

    updateLevelUI();
    render();
    save();

    if (game.mode === "ai" && game.humanColor === "b" && !opts.deferAI) {
      setTimeout(() => {
        if (game && !game.over && isLive()) scheduleAI();
      }, 420);
    }
  }

  /* ---------- محرك الكمبيوتر ---------- */
  function ensureWorker() {
    if (worker || workerBroken) return worker;
    if (typeof Worker === "undefined" || location.protocol === "file:") {
      workerBroken = true;
      return null;
    }
    try {
      worker = new Worker("ai-worker.js");
      worker.onmessage = (ev) => {
        const d = ev.data || {};
        if (!d || d.type !== "result") return;
        const p = pending.get(d.id);
        if (!p) return;
        pending.delete(d.id);
        if (p.timer) clearTimeout(p.timer);
        p.resolve(d.ok ? d.result : null);
      };
      worker.onerror = () => {
        workerBroken = true;
        worker = null;
        for (const [, p] of pending) {
          if (p.timer) clearTimeout(p.timer);
          mainThreadSearch(p.fen, p.options, p.resolve);
        }
        pending.clear();
      };
    } catch (err) {
      workerBroken = true;
      worker = null;
    }
    return worker;
  }

  function mainThreadSearch(fen, options, resolve) {
    setTimeout(() => {
      try {
        const st = C.fromFEN(fen);
        const r = AI.search(st, options);
        resolve(r ? {
          from: r.move.from,
          to: r.move.to,
          promo: r.move.promo || null,
          score: r.score,
          depth: r.depth,
          nodes: r.nodes,
          time: r.time,
        } : null);
      } catch (err) {
        resolve(null);
      }
    }, 30);
  }

  function runSearch(fen, options, id) {
    return new Promise((resolve) => {
      const w = ensureWorker();
      if (!w) {
        mainThreadSearch(fen, options, resolve);
        return;
      }
      const entry = {
        resolve,
        fen,
        options,
        timer: setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          mainThreadSearch(fen, options, resolve);
        }, (options.timeLimit || 1500) + 3500),
      };
      pending.set(id, entry);
      w.postMessage({ type: "search", id, fen, options });
    });
  }

  function aiOptions() {
    if (AI && AI.LEVELS && AI.LEVELS[game.level]) return Object.assign({}, AI.LEVELS[game.level]);
    return { depth: 3, timeLimit: 1200, randomness: 10, blunder: 0 };
  }

  function scheduleAI() {
    if (!game || game.mode !== "ai" || game.over || thinking || viewIndex !== null) return;
    if (liveState().turn === game.humanColor) return;

    thinking = true;
    aiInfo = null;
    render();

    const myToken = sessionToken;
    const fen = game.fens[game.fens.length - 1];
    const options = aiOptions();
    const id = ++requestSeq;

    setTimeout(() => {
      if (myToken !== sessionToken || !game || game.over) {
        thinking = false;
        return;
      }
      runSearch(fen, options, id).then((res) => {
        if (myToken !== sessionToken) return;
        thinking = false;
        if (!game) { render(); return; }
        if (game.over || game.fens[game.fens.length - 1] !== fen) { render(); return; }
        if (!res) {
          render();
          toast("تعذر حساب حركة الكمبيوتر");
          return;
        }
        const st = liveState();
        const move = C.parseMove(st, res.from, res.to, res.promo);
        if (!move) {
          render();
          toast("حركة غير صالحة من الكمبيوتر");
          return;
        }
        aiInfo = res;
        applyMove(move, true);
      });
    }, 280);
  }

  /* ---------- تنفيذ الحركات ---------- */
  function applyMove(move, byAI) {
    if (!game) return;
    if (!byAI) premove = null;
    const st = liveState();
    const side = st.turn;
    let san = "";
    try { san = C.moveToSAN(st, move); } catch (err) { san = ""; }
    const captured = move.captured || null;

    C.makeMove(st, move);

    game.fens.push(C.toFEN(st));
    game.sans.push(san);
    game.moves.push({
      from: move.from,
      to: move.to,
      promo: move.promo || null,
      captured,
      san,
      by: side,
      castle: move.castle || null,
      ep: !!move.ep,
      byAI: !!byAI,
    });

    if (game.clock.enabled) game.clock.started = true;

    selected = -1;
    legal = [];
    selectingPremove = false;
    hint = null;
    arrows = [];
    marks = new Set();
    viewIndex = null;
    overShown = false;

    initAudio();
    playSound(move, san);

    const over = refreshOver();
    if (over) premove = null;
    render();
    save();

    if (over) {
      showOverDialog();
      return;
    }
    if (game.mode === "ai" && st.turn !== game.humanColor) {
      scheduleAI();
      return;
    }

    if (byAI && premove) {
      const fenNow = game.fens[game.fens.length - 1];
      setTimeout(() => {
        if (!game || game.over || !isLive()) return;
        if (game.fens[game.fens.length - 1] !== fenNow) return;
        tryPremove();
      }, 260);
    }
  }

  function tryMove(from, to) {
    if (!game || !canInteract()) return;
    const st = liveState();
    const candidates = C.legalMoves(st).filter((m) => m.from === from && m.to === to);
    if (!candidates.length) {
      selected = -1;
      legal = [];
      render();
      return;
    }

    const promoMoves = candidates.filter((m) => m.promo);
    if (promoMoves.length) {
      const fenAt = game.fens[game.fens.length - 1];
      askPromotion(st.turn).then((piece) => {
        if (!game || game.fens[game.fens.length - 1] !== fenAt) { render(); return; }
        if (!piece) {
          selected = -1;
          legal = [];
          render();
          return;
        }
        const pick = promoMoves.find((m) => String(m.promo).toUpperCase() === piece) || promoMoves[0];
        applyMove(pick, false);
      });
      return;
    }

    applyMove(candidates[0], false);
  }

  /* ---------- حالة النهاية ---------- */
  function refreshOver() {
    if (!game || game.over) return game ? game.over : null;

    const st = liveState();
    const stat = C.status(st);
    let over = null;

    if (stat.over) {
      over = { result: stat.result, reason: stat.reason, winner: stat.winner };
    } else {
      const key = fenKey(game.fens[game.fens.length - 1]);
      let count = 0;
      for (let i = 0; i < game.fens.length; i++) {
        if (fenKey(game.fens[i]) === key) count++;
      }
      if (count >= 3) over = { result: "1/2-1/2", reason: "repetition", winner: null };
    }

    if (over) {
      game.over = over;
      save();
    }
    return over;
  }

  function showOverDialog() {
    if (!game || !game.over || overShown) return;
    if (!$("#overDialog").open) {
      overShown = true;
      const o = game.over;
      $("#overIcon").textContent = o.winner ? "🏆" : "🤝";
      $("#overTitle").textContent = resultTitle(o);
      $("#overText").textContent = resultDetail(o);
      $("#overResult").textContent = o.result;
      $("#overDialog").showModal();
    }
  }

  function resultTitle(o) {
    switch (o.reason) {
      case "checkmate": return "كش مات";
      case "timeout": return "انتهى الوقت";
      case "resign": return "استسلام";
      case "stalemate": return "ستالمنت";
      case "repetition": return "تكرار الوضع";
      case "fifty": return "قاعدة الخمسين حركة";
      case "material": return "تعادل المواد";
      case "agreed": return "تعادل بالاتفاق";
      default: return "انتهت المباراة";
    }
  }

  function winnerPhrase(color) {
    if (!color) return "";
    if (game.mode === "ai") return color === game.humanColor ? "فزت بالمباراة" : "فاز الكمبيوتر";
    return color === "w" ? "فاز الأبيض" : "فاز الأسود";
  }

  function resultDetail(o) {
    switch (o.reason) {
      case "checkmate": return winnerPhrase(o.winner) + " بكش مات.";
      case "timeout": return winnerPhrase(o.winner) + " بانتهاء وقت الخصم.";
      case "resign": return winnerPhrase(o.winner) + " باستسلام الخصم.";
      case "stalemate": return "تعادل — لا توجد حركات قانونية للملك.";
      case "repetition": return "تعادل بتكرار الوضع نفسه ثلاث مرات.";
      case "fifty": return "تعادل — مرّت خمسون حركة دون أخذ قطعة أو تحريك بيدق.";
      case "material": return "تعادل — لا توجد مواد كافية لإماتة الملك.";
      case "agreed": return "تعادل بالاتفاق بين اللاعبين.";
      default: return "";
    }
  }

  /* ---------- الساعة ---------- */
  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function renderClocks() {
    if (!game) return;
    const map = [
      { el: $("#topClock"), color: game.flipped ? "w" : "b" },
      { el: $("#bottomClock"), color: game.flipped ? "b" : "w" },
    ];
    for (const item of map) {
      const el = item.el;
      el.hidden = !game.clock.enabled;
      if (!game.clock.enabled) continue;
      const ms = game.clock[item.color];
      el.textContent = clockText(ms);
      el.classList.toggle("low", ms > 0 && ms <= 30000);
      el.classList.toggle("low", ms <= 0);
    }
  }

  function tickClock() {
    const now = performance.now();
    const dt = Math.min(1000, now - lastTick);
    lastTick = now;

    if (!game || !game.clock.enabled || !game.clock.started || game.over) return;
    if (viewIndex !== null || document.hidden) return;

    const st = liveState();
    const side = st.turn;
    game.clock[side] = Math.max(0, game.clock[side] - dt);
    renderClocks();

    if (now - lastClockSave > 2500) {
      lastClockSave = now;
      save();
    }

    if (game.clock[side] <= 0) flag(side);
  }

  function flag(side) {
    if (!game || game.over) return;
    const st = liveState();
    const opp = C.other(side);
    const draw = C.insufficientMaterial(st);
    premove = null;
    selected = -1;
    legal = [];
    selectingPremove = false;
    game.over = {
      result: draw ? "1/2-1/2" : opp === "w" ? "1-0" : "0-1",
      reason: "timeout",
      winner: draw ? null : opp,
    };
    save();
    render();
    showOverDialog();
  }

  /* ---------- الصوت ---------- */
  let audioCtx = null;

  function initAudio() {
    if (!prefs.sound) return;
    if (!audioCtx && typeof window.AudioContext !== "undefined") {
      try { audioCtx = new window.AudioContext(); } catch (err) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, delay) {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (err) { /* ignore */ }
  }

  function playSound(move, san) {
    if (!prefs.sound) return;
    if (san.indexOf("#") !== -1) {
      tone(220, 0.22, "sawtooth", 0.055);
      tone(150, 0.34, "sawtooth", 0.045, 0.13);
    } else if (san.indexOf("+") !== -1) {
      tone(740, 0.09, "triangle", 0.05);
      tone(980, 0.11, "triangle", 0.04, 0.08);
    } else if (move.captured) {
      tone(300, 0.09, "square", 0.04);
      tone(190, 0.13, "triangle", 0.045, 0.05);
    } else if (move.castle) {
      tone(440, 0.06, "sine", 0.04);
      tone(560, 0.07, "sine", 0.04, 0.07);
    } else {
      tone(520, 0.055, "sine", 0.035);
    }
  }

  /* ---------- العرض ---------- */
  function render() {
    if (!game) return;
    if (!game.over && isLive()) refreshOver();
    renderBoard();
    renderPlayers();
    renderStatus();
    renderMoves();
    renderControls();
    renderPremove();
  }

  function canInteract() {
    if (!game || game.over || thinking || viewIndex !== null || anyDialogOpen()) return false;
    if (game.mode === "pvp") return true;
    return liveState().turn === game.humanColor;
  }

  function renderBoard() {
    if (!game) return;
    const st = viewState();
    const flipped = game.flipped;
    const interactive = canInteract() || canPremove();
    const checkedKing = C.inCheck(st, st.turn) ? st.kings[st.turn] : -1;
    const targets = new Map();
    if (isLive() && selected >= 0) {
      for (const m of legal) targets.set(m.to, m);
    }
    const total = game.moves.length;
    const shownLast = viewIndex === null ? game.moves[total - 1] : viewIndex > 0 ? game.moves[viewIndex - 1] : null;

    const frag = document.createDocumentFragment();

    for (let vr = 0; vr < 8; vr++) {
      for (let vf = 0; vf < 8; vf++) {
        const row = flipped ? 7 - vr : vr;
        const file = flipped ? 7 - vf : vf;
        const sq = row * 16 + file;
        const piece = st.board[sq];
        const isLight = (row + file) % 2 === 0;

        const div = document.createElement("div");
        div.className = "square " + (isLight ? "light" : "dark");
        div.dataset.sq = String(sq);
        div.setAttribute("role", "gridcell");
        div.setAttribute("aria-label", C.squareName(sq) + (piece ? " — " + PIECE_AR[piece.toUpperCase()] : " — فارغ"));
        if (interactive) div.classList.add("playable");

        if (shownLast && (shownLast.from === sq || shownLast.to === sq)) div.classList.add("last");
        if (isLive() && selected === sq) div.classList.add("selected");
        if (sq === checkedKing) div.classList.add("check");
        if (targets.has(sq)) div.classList.add(piece ? "capture" : "target");
        if (hint && (hint.from === sq || hint.to === sq)) div.classList.add("hint");
        if (premove && isLive()) {
          if (premove.from === sq) div.classList.add("premove-from");
          if (premove.to === sq) div.classList.add("premove-to");
        }

        if (vr === 7) {
          const label = document.createElement("span");
          label.className = "coord file";
          label.textContent = FILES[file];
          div.appendChild(label);
        }
        if (vf === 0) {
          const label = document.createElement("span");
          label.className = "coord rank";
          label.textContent = String(8 - row);
          div.appendChild(label);
        }

        if (piece) {
          const span = document.createElement("span");
          const white = piece === piece.toUpperCase();
          span.className = "piece " + (white ? "w" : "b");
          span.textContent = glyphFor(piece.toUpperCase());
          span.setAttribute("aria-hidden", "true");
          div.appendChild(span);
        }

        frag.appendChild(div);
      }
    }

    boardEl.innerHTML = "";
    boardEl.appendChild(frag);
    renderShapes();
    boardEl.style.setProperty("--sq", boardEl.clientWidth / 8 + "px");
  }

  function capturedOf(color) {
    const list = [];
    for (const mv of game.moves) {
      if (mv.by === color && mv.captured) list.push(mv.captured);
    }
    return list;
  }

  function renderPlayers() {
    if (!game) return;
    const topColor = game.flipped ? "w" : "b";
    const bottomColor = game.flipped ? "b" : "w";
    const st = liveState();
    const active = !game.over && isLive() ? st.turn : null;
    const capturedWhite = capturedOf("w");
    const capturedBlack = capturedOf("b");
    const sum = (arr) => arr.reduce((acc, p) => acc + (VALUE[p.toUpperCase()] || 0), 0);
    const diff = sum(capturedWhite) - sum(capturedBlack);

    const cards = [
      { root: $("#playerTop"), color: topColor, name: $("#topName"), tag: $("#topTag"), av: $("#topAvatar"), cap: $("#topCaptured") },
      { root: $("#playerBottom"), color: bottomColor, name: $("#bottomName"), tag: $("#bottomTag"), av: $("#bottomAvatar"), cap: $("#bottomCaptured") },
    ];

    for (const card of cards) {
      const color = card.color;
      card.root.classList.toggle("active", active === color);
      card.root.classList.toggle("winner", !!game.over && game.over.winner === color);
      card.tag.hidden = active !== color;

      const isHuman = game.mode === "pvp" || color === game.humanColor;
      if (game.mode === "pvp") {
        card.name.textContent = color === "w" ? "الأبيض" : "الأسود";
      } else if (isHuman) {
        card.name.textContent = "أنت";
      } else {
        card.name.textContent = "الكمبيوتر — " + LEVEL_LABEL[game.level];
      }

      card.av.textContent = color === "w" ? "♔" : "♚";
      card.av.className = "avatar " + (color === "w" ? "w" : "b");

      const captured = color === "w" ? capturedBlack : capturedWhite;
      const adv = color === "w" ? diff : -diff;
      card.cap.innerHTML = "";
      for (const p of captured) {
        const span = document.createElement("span");
        span.textContent = glyphFor(p.toUpperCase());
        span.className = "cap-piece";
        span.title = PIECE_AR[p.toUpperCase()];
        card.cap.appendChild(span);
      }
      if (adv > 0) {
        const advEl = document.createElement("span");
        advEl.className = "adv";
        advEl.textContent = "+" + adv;
        card.cap.appendChild(advEl);
      }
      if (!captured.length && adv <= 0) {
        card.cap.innerHTML = '<span style="opacity:.38;font-size:.72rem">لا قطع مأسورة</span>';
      }
    }

    renderClocks();
  }

  function renderStatus() {
    if (!game) return;
    const card = $("#statusCard");
    const st = liveState();
    const inCheck = !game.over && C.inCheck(st, st.turn);

    card.classList.toggle("over", !!game.over);
    card.classList.toggle("check", inCheck);

    let main = "";
    let sub = "";

    if (!isLive()) {
      const pos = viewIndex;
      main = pos === 0 ? "وضع المراجعة — بداية المباراة" : "وضع المراجعة — الحركة " + pos + " من " + game.moves.length;
      sub = "استخدم أزرار التنقل أو Esc للعودة إلى الوضع الحالي";
    } else if (game.over) {
      main = resultTitle(game.over);
      sub = resultDetail(game.over);
    } else {
      main = "دور " + (st.turn === "w" ? "الأبيض" : "الأسود") + (inCheck ? " — كش!" : "");
      if (game.mode === "ai") {
        if (st.turn === game.humanColor) {
          sub = "دورك — حرّك إحدى قطعك";
        } else if (premove) {
          sub = "حركة مسبقة مسجّلة — تُنفّذ بعد رد الكمبيوتر";
        } else if (selectingPremove && selected >= 0) {
          sub = "اختر المربع الهدف للحركة المسبقة";
        } else {
          sub = thinking ? "الكمبيوتر يفكر… يمكنك تسجيل حركة مسبقة" : "يمكنك تسجيل حركة مسبقة الآن";
        }
      } else {
        sub = "لاعبان على نفس الجهاز";
      }
    }

    $("#statusText").textContent = main;
    $("#statusSub").textContent = sub;
  }

  function renderMoves() {
    if (!game) return;
    const box = $("#moves");
    const total = game.sans.length;
    const activePly = viewIndex === null ? total : viewIndex;

    box.innerHTML = "";

    if (!total) {
      const p = document.createElement("p");
      p.className = "empty-note";
      p.textContent = "لم تبدأ الحركة بعد";
      box.appendChild(p);
    } else {
      for (let i = 0; i < total; i += 2) {
        const row = document.createElement("div");
        row.className = "move-row";

        const no = document.createElement("span");
        no.className = "move-no";
        no.textContent = String(i / 2 + 1) + ".";
        row.appendChild(no);

        const white = document.createElement("button");
        white.type = "button";
        white.className = "san" + (i + 1 === activePly ? " active" : "");
        white.dataset.ply = String(i + 1);
        white.textContent = game.sans[i] || "";
        if (!game.sans[i]) white.classList.add("empty");
        row.appendChild(white);

        const black = document.createElement("button");
        black.type = "button";
        black.className = "san" + (i + 2 === activePly ? " active" : "") + (game.sans[i + 1] ? "" : " empty");
        black.dataset.ply = String(i + 2);
        black.textContent = game.sans[i + 1] || "—";
        row.appendChild(black);

        box.appendChild(row);
      }
    }

    $("#moveCounter").textContent = String(total);
    $("#reviewPos").textContent =
      viewIndex === null ? "الوضع الحالي" : viewIndex === 0 ? "بداية المباراة" : "الحركة " + viewIndex + " / " + total;

    if (viewIndex === null) box.scrollTop = box.scrollHeight;
  }

  function renderControls() {
    if (!game) return;
    const st = liveState();
    const human = game.mode === "pvp" || st.turn === game.humanColor;

    $("#btnUndo").disabled = !game.moves.length || thinking;
    $("#btnHint").disabled = !!game.over || thinking || !isLive() || !human;
    $("#btnResign").disabled = !!game.over;
    $("#btnDraw").disabled = !!game.over;
    $("#btnPgn").disabled = !game.moves.length;
    $("#btnFlip").disabled = false;

    $("#thinkingBadge").hidden = !thinking;
    $("#aiCard").hidden = game.mode !== "ai";
    $("#levelSelect").value = game.level;
    $("#aiBadge").textContent = LEVEL_LABEL[game.level];

    if (thinking) {
      $("#aiMeta").textContent = "يحسب أفضل حركة…";
    } else if (game.over) {
      $("#aiMeta").textContent = "انتهت المباراة";
    } else if (aiInfo) {
      const nodes = aiInfo.nodes >= 1000 ? (aiInfo.nodes / 1000).toFixed(1) + " ألف" : String(aiInfo.nodes);
      $("#aiMeta").textContent = "عمق " + aiInfo.depth + " · " + nodes + " عقدة · " + aiInfo.time + " م.ث";
    } else {
      $("#aiMeta").textContent = "جاهز للعب";
    }

    $("#btnSound").setAttribute("aria-pressed", prefs.sound ? "true" : "false");
    $("#btnSound").textContent = prefs.sound ? "🔊" : "🔇";
    $("#btnSound").title = prefs.sound ? "إيقاف الصوت" : "تشغيل الصوت";
    $("#btnTheme").textContent = prefs.theme === "dark" ? "☀️" : "🌙";

    const arrowsBtn = $("#btnArrows");
    if (arrowsBtn) arrowsBtn.setAttribute("aria-pressed", arrowMode ? "true" : "false");
    const clearBtn = $("#btnClearShapes");
    if (clearBtn) clearBtn.disabled = !arrows.length && !marks.size;

    for (const id of ["navStart", "navPrev", "navNext", "navEnd"]) {
      $( "#" + id ).disabled = thinking;
    }
  }

  function renderPremove() {
    const bar = $("#premoveBar");
    if (!bar) return;
    const show = !!premove && isLive() && !game.over;
    bar.hidden = !show;
    if (show) {
      $("#premoveText").textContent = C.squareName(premove.from) + " → " + C.squareName(premove.to);
    }
  }

  function updateLevelUI() {
    if (!game) return;
    $("#levelSelect").value = game.level;
    $("#aiBadge").textContent = LEVEL_LABEL[game.level];
    $("#aiCard").hidden = game.mode !== "ai";
  }

  /* ---------- التنقل في السجل ---------- */
  function goToPly(ply) {
    if (!game || thinking) return;
    const total = game.moves.length;
    if (ply <= 0) viewIndex = 0;
    else if (ply >= total) viewIndex = null;
    else viewIndex = ply;
    selected = -1;
    legal = [];
    selectingPremove = false;
    hint = null;
    render();
  }

  function navPrev() {
    if (!game) return;
    if (thinking) { toast("انتظر حركة الكمبيوتر"); return; }
    const cur = viewIndex === null ? game.moves.length : viewIndex;
    if (cur <= 0) return;
    goToPly(cur - 1);
  }

  function navNext() {
    if (!game || thinking) return;
    const total = game.moves.length;
    const cur = viewIndex === null ? total : viewIndex;
    if (cur >= total) return;
    goToPly(cur + 1);
  }

  function navEnd() {
    if (thinking) { toast("انتظر حركة الكمبيوتر"); return; }
    viewIndex = null;
    selected = -1;
    legal = [];
    selectingPremove = false;
    render();
  }

  /* ---------- السحب والنقر ---------- */
  function onPointerDown(ev) {
    const sqEl = ev.target.closest(".square");
    const isRight = ev.button === 2;
    const isLeft = ev.button === undefined || ev.button === 0;

    if (sqEl && (isRight || (isLeft && arrowMode))) {
      ev.preventDefault();
      beginShape(Number(sqEl.dataset.sq), ev);
      return;
    }
    if (!isLeft) return;
    if (!canInteract() && !canPremove()) return;

    initAudio();
    if (!sqEl) return;
    const sq = Number(sqEl.dataset.sq);
    const st = liveState();

    if (canInteract()) {
      const piece = st.board[sq];

      if (selected >= 0 && !selectingPremove && selected !== sq && legal.some((m) => m.to === sq)) {
        tryMove(selected, sq);
        return;
      }

      if (!piece || C.colorOf(piece) !== st.turn) {
        selected = -1;
        legal = [];
        selectingPremove = false;
        render();
        return;
      }

      if (selected === sq) {
        selected = -1;
        legal = [];
        render();
        return;
      }

      selected = sq;
      selectingPremove = false;
      legal = C.legalMoves(st).filter((m) => m.from === sq);
      render();

      drag = {
        from: sq,
        startX: ev.clientX,
        startY: ev.clientY,
        moved: false,
        ghost: null,
        glyph: glyphFor(piece.toUpperCase()),
        white: piece === piece.toUpperCase(),
      };
      return;
    }

    // اختيار حركة مسبقة أثناء دور الكمبيوتر
    const piece = st.board[sq];

    if (selected >= 0 && selectingPremove && selected !== sq && legal.some((m) => m.to === sq)) {
      setPremove(selected, sq);
      return;
    }

    if (!piece || C.colorOf(piece) !== game.humanColor) {
      selected = -1;
      legal = [];
      selectingPremove = false;
      render();
      return;
    }

    if (selected === sq && selectingPremove) {
      selected = -1;
      legal = [];
      selectingPremove = false;
      render();
      return;
    }

    premove = null;
    selected = sq;
    selectingPremove = true;
    legal = C.generatePseudo(st, game.humanColor).filter((m) => m.from === sq && !m.ep);
    render();
  }

  /* ---------- رسم الأسهم ---------- */
  function beginShape(sq, ev) {
    shapeDrag = {
      from: sq,
      startX: ev.clientX,
      startY: ev.clientY,
      moved: false,
    };
  }

  function updateShapePreview(ev) {
    if (!shapeDrag) return;
    if (!shapeDrag.moved && Math.hypot(ev.clientX - shapeDrag.startX, ev.clientY - shapeDrag.startY) < 7) return;
    shapeDrag.moved = true;

    if (!shapesEl) return;
    const old = shapesEl.querySelector(".shape-preview");
    if (old) old.parentNode.removeChild(old);

    const from = squareCenter(shapeDrag.from);
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const sqEl = el && el.closest ? el.closest(".square") : null;
    const to = sqEl ? squareCenter(Number(sqEl.dataset.sq)) : boardPoint(ev.clientX, ev.clientY);

    appendArrow(shapesEl, from, to, {
      dashed: true,
      opacity: 0.9,
      className: "shape-preview",
    });
    ev.preventDefault();
  }

  function finishShape(ev) {
    const sd = shapeDrag;
    if (!sd) return;
    shapeDrag = null;

    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const sqEl = el && el.closest ? el.closest(".square") : null;

    if (!sqEl) {
      render();
      return;
    }

    const to = Number(sqEl.dataset.sq);
    if (!sd.moved || to === sd.from) {
      toggleMark(sd.from);
      render();
      return;
    }

    toggleArrow(sd.from, to);
    render();
  }

  function cancelShapeDrag() {
    shapeDrag = null;
    if (!shapesEl) return;
    const preview = shapesEl.querySelector(".shape-preview");
    if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
  }

  function onPointerMove(ev) {
    if (shapeDrag) {
      updateShapePreview(ev);
      return;
    }
    if (!drag) return;
    const dx = ev.clientX - drag.startX;
    const dy = ev.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 7) return;
      drag.moved = true;
      drag.ghost = document.createElement("div");
      drag.ghost.className = "drag-ghost piece " + (drag.white ? "w" : "b");
      drag.ghost.textContent = drag.glyph;
      const sqSize = boardEl.clientWidth / 8;
      drag.ghost.style.fontSize = sqSize * 0.78 + "px";
      document.body.appendChild(drag.ghost);
      boardEl.classList.add("dragging");
    }

    drag.ghost.style.left = ev.clientX + "px";
    drag.ghost.style.top = ev.clientY + "px";
    ev.preventDefault();
  }

  function onPointerUp(ev) {
    if (shapeDrag) {
      finishShape(ev);
      return;
    }
    if (!drag) return;
    const wasMoved = drag.moved;
    const from = drag.from;
    const ghost = drag.ghost;
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    boardEl.classList.remove("dragging");
    drag = null;
    if (!wasMoved) return;

    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const sqEl = el && el.closest ? el.closest(".square") : null;
    if (!sqEl) {
      selected = -1;
      legal = [];
      render();
      return;
    }
    const to = Number(sqEl.dataset.sq);
    if (to === from) {
      render();
      return;
    }
    const move = legal.find((m) => m.to === to);
    if (!move) {
      selected = -1;
      legal = [];
      render();
      return;
    }
    tryMove(from, to);
  }

  function cancelDrag() {
    if (!drag) return;
    if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
    drag = null;
    boardEl.classList.remove("dragging");
  }

  /* ---------- الترقية ---------- */
  function askPromotion(color) {
    return new Promise((resolve) => {
      const dialog = $("#promoDialog");
      const row = $("#promoRow");
      row.innerHTML = "";
      const pieces = [
        { p: "Q", label: "وزير" },
        { p: "R", label: "قلعة" },
        { p: "B", label: "فيل" },
        { p: "N", label: "حصان" },
      ];
      for (const item of pieces) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "promo-btn";
        const glyph = document.createElement("span");
        glyph.className = "glyph " + color;
        glyph.textContent = glyphFor(item.p);
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = item.label;
        btn.appendChild(glyph);
        btn.appendChild(label);
        btn.addEventListener("click", () => dialog.close(item.p));
        row.appendChild(btn);
      }
      dialog.returnValue = "";
      dialog.addEventListener("close", () => resolve(dialog.returnValue || null), { once: true });
      dialog.showModal();
    });
  }

  /* ---------- نافذة لعبة جديدة ---------- */
  let draft = { mode: "ai", level: "medium", color: "w", minutes: 10 };

  function syncDraftUI() {
    for (const btn of document.querySelectorAll("#modeSeg button")) {
      btn.classList.toggle("active", btn.dataset.mode === draft.mode);
    }
    for (const btn of document.querySelectorAll("#levelSeg button")) {
      btn.classList.toggle("active", btn.dataset.level === draft.level);
    }
    for (const btn of document.querySelectorAll("#colorSeg button")) {
      btn.classList.toggle("active", btn.dataset.color === draft.color);
    }
    for (const btn of document.querySelectorAll("#timeSeg button")) {
      btn.classList.toggle("active", Number(btn.dataset.min) === Number(draft.minutes));
    }
    $("#aiOptions").hidden = draft.mode !== "ai";
  }

  function openNewDialog() {
    draft = { mode: prefs.mode, level: prefs.level, color: prefs.color, minutes: prefs.minutes };
    syncDraftUI();
    if (!$("#newDialog").open) $("#newDialog").showModal();
  }

  /* ---------- تأكيد ---------- */
  function askConfirm(title, text, yesLabel) {
    return new Promise((resolve) => {
      const dialog = $("#confirmDialog");
      $("#confirmTitle").textContent = title;
      $("#confirmText").textContent = text;
      $("#confirmYes").textContent = yesLabel || "تأكيد";
      dialog.returnValue = "";
      dialog.addEventListener("close", () => resolve(dialog.returnValue === "yes"), { once: true });
      dialog.showModal();
    });
  }

  /* ---------- أوامر اللعبة ---------- */
  function flip() {
    if (!game) return;
    game.flipped = !game.flipped;
    render();
    save();
  }

  function undo() {
    if (!game) return;
    if (viewIndex !== null) {
      viewIndex = null;
      selected = -1;
      legal = [];
      render();
      return;
    }
    if (thinking) {
      toast("انتظر انتهاء تفكير الكمبيوتر");
      return;
    }
    if (!game.moves.length) {
      toast("لا توجد حركات للتراجع عنها");
      return;
    }

    let count = 1;
    if (game.mode === "ai") {
      count = liveState().turn === game.humanColor ? 2 : 1;
    }
    count = Math.min(count, game.moves.length);

    for (let i = 0; i < count; i++) {
      game.fens.pop();
      game.sans.pop();
      game.moves.pop();
    }

    game.over = null;
    overShown = false;
    selected = -1;
    legal = [];
    selectingPremove = false;
    premove = null;
    clearDrawing();
    hint = null;
    aiInfo = null;
    liveCache = { fen: null, state: null };

    render();
    save();
    toast(count > 1 ? "تم التراجع عن حركتين" : "تم التراجع عن حركة");

    if (game.mode === "ai" && liveState().turn !== game.humanColor) scheduleAI();
  }

  async function resign() {
    if (!game || game.over) return;
    const st = liveState();
    const side = game.mode === "ai" ? game.humanColor : st.turn;
    const label = game.mode === "ai"
      ? "أنت"
      : side === "w" ? "الأبيض" : "الأسود";
    const ok = await askConfirm(
      "الاستسلام",
      "هل يريد " + label + " الاستسلام؟ ستنتهي المباراة بفوز الخصم.",
      "نعم، أستسلم"
    );
    if (!ok) return;
    premove = null;
    selected = -1;
    legal = [];
    selectingPremove = false;
    game.over = {
      result: side === "w" ? "0-1" : "1-0",
      reason: "resign",
      winner: C.other(side),
    };
    save();
    render();
    showOverDialog();
  }

  async function offerDraw() {
    if (!game || game.over) return;
    if (game.mode === "pvp") {
      const ok = await askConfirm("عرض تعادل", "هل يوافق الخصم على إنهاء المباراة بالتعادل؟", "موافق على التعادل");
      if (!ok) return;
    } else if (AI) {
      const st = liveState();
      const score = Math.abs(AI.evaluate(st));
      if (score > 130) {
        toast("رفض الكمبيوتر عرض التعادل");
        return;
      }
    }
    premove = null;
    selected = -1;
    legal = [];
    selectingPremove = false;
    game.over = { result: "1/2-1/2", reason: "agreed", winner: null };
    save();
    render();
    showOverDialog();
  }

  function requestHint() {
    if (!game || game.over || thinking || viewIndex !== null) return;
    const st = liveState();
    if (game.mode === "ai" && st.turn !== game.humanColor) {
      toast("انتظر دورك");
      return;
    }
    const fen = game.fens[game.fens.length - 1];
    const id = ++requestSeq;
    toast("جارٍ البحث عن أفضل حركة…");
    runSearch(fen, { depth: 3, timeLimit: 900, randomness: 0, blunder: 0 }, id).then((res) => {
      if (!res || !game || game.fens[game.fens.length - 1] !== fen || !isLive()) return;
      const st2 = liveState();
      const move = C.parseMove(st2, res.from, res.to, res.promo);
      if (!move) return;
      hint = { from: move.from, to: move.to };
      let san = "";
      try { san = C.moveToSAN(st2, move); } catch (err) { san = ""; }
      render();
      toast("تلميح: " + san);
      setTimeout(() => {
        if (hint) {
          hint = null;
          render();
        }
      }, 4000);
    });
  }

  /* ---------- PGN ---------- */
  function pad2(n) { return String(n).padStart(2, "0"); }

  function buildPGN() {
    const d = new Date();
    const date = d.getFullYear() + "." + pad2(d.getMonth() + 1) + "." + pad2(d.getDate());
    const res = game.over ? game.over.result : "*";
    const isAI = game.mode === "ai";
    const white = isAI ? (game.humanColor === "w" ? "Player" : "Computer") : "White";
    const black = isAI ? (game.humanColor === "b" ? "Player" : "Computer") : "Black";

    const lines = [
      '[Event "Casual Game"]',
      '[Site "Chess Arena"]',
      '[Date "' + date + '"]',
      '[Round "-"]',
      '[White "' + white + '"]',
      '[Black "' + black + '"]',
      '[Result "' + res + '"]',
    ];

    if (game.startFEN !== C.START_FEN) {
      lines.push('[SetUp "1"]');
      lines.push('[FEN "' + game.startFEN + '"]');
    }

    lines.push("");

    let body = "";
    for (let i = 0; i < game.sans.length; i++) {
      if (i % 2 === 0) body += (i / 2 + 1) + ". ";
      body += game.sans[i] + " ";
      if (i % 12 === 11) body += "\n";
    }
    body += res;
    lines.push(body.trim());

    return lines.join("\n") + "\n";
  }

  function exportPGN() {
    if (!game || !game.moves.length) {
      toast("لا توجد حركات لتصديرها");
      return;
    }
    try {
      const pgn = buildPGN();
      const blob = new Blob([pgn], { type: "application/x-chess-pgn;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chess-arena-" + Date.now() + ".pgn";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast("تم تصدير ملف PGN");
    } catch (err) {
      toast("تعذر تصدير الملف");
    }
  }

  /* ---------- التنبيه ---------- */
  let toastTimer = null;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- ربط الأحداث ---------- */
  function bind() {
    $("#btnNew").addEventListener("click", openNewDialog);
    $("#btnUndo").addEventListener("click", undo);
    $("#btnFlip").addEventListener("click", flip);
    $("#btnHint").addEventListener("click", requestHint);
    $("#btnResign").addEventListener("click", resign);
    $("#btnDraw").addEventListener("click", offerDraw);
    $("#btnPgn").addEventListener("click", exportPGN);

    $("#boardSwatches").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".board-swatch");
      if (btn) setBoardTheme(btn.dataset.board);
    });
    $("#pieceSwatches").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".piece-swatch");
      if (btn) setPieceSet(btn.dataset.pieceSet);
    });
    $("#btnArrows").addEventListener("click", () => setArrowMode(!arrowMode));
    $("#btnClearShapes").addEventListener("click", clearShapes);

    $("#btnSettings").addEventListener("click", () => {
      updateBoardThemeUI();
      updatePieceSetUI();
      $("#btnArrows").setAttribute("aria-pressed", arrowMode ? "true" : "false");
      if (!$("#settingsDialog").open) $("#settingsDialog").showModal();
    });
    $("#settingsClose").addEventListener("click", () => $("#settingsDialog").close());
    $("#settingsOk").addEventListener("click", () => $("#settingsDialog").close());
    $("#settingsDialog").addEventListener("click", (ev) => {
      if (ev.target === $("#settingsDialog")) $("#settingsDialog").close();
    });
    $("#premoveCancel").addEventListener("click", () => cancelPremove(true));

    $("#btnSound").addEventListener("click", () => {
      prefs.sound = !prefs.sound;
      savePrefs();
      if (prefs.sound) {
        initAudio();
        tone(660, 0.08, "sine", 0.04);
        toast("تم تشغيل الصوت");
      } else {
        toast("تم إيقاف الصوت");
      }
      renderControls();
    });

    $("#btnTheme").addEventListener("click", () => {
      prefs.theme = prefs.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = prefs.theme;
      savePrefs();
      renderControls();
    });

    $("#btnRules").addEventListener("click", () => {
      if (!$("#rulesDialog").open) $("#rulesDialog").showModal();
    });
    $("#rulesClose").addEventListener("click", () => $("#rulesDialog").close());
    $("#rulesOk").addEventListener("click", () => $("#rulesDialog").close());

    $("#levelSelect").addEventListener("change", (ev) => {
      if (!game) return;
      game.level = ev.target.value;
      prefs.level = game.level;
      savePrefs();
      save();
      updateLevelUI();
      toast("مستوى الكمبيوتر: " + LEVEL_LABEL[game.level]);
    });

    boardEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", () => {
      cancelDrag();
      cancelShapeDrag();
    });
    boardEl.addEventListener("contextmenu", (ev) => ev.preventDefault());

    $("#moves").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".san");
      if (!btn || btn.classList.contains("empty")) return;
      if (thinking) { toast("انتظر حركة الكمبيوتر"); return; }
      const ply = Number(btn.dataset.ply);
      if (!Number.isFinite(ply)) return;
      goToPly(ply);
    });

    $("#navStart").addEventListener("click", () => goToPly(0));
    $("#navPrev").addEventListener("click", navPrev);
    $("#navNext").addEventListener("click", navNext);
    $("#navEnd").addEventListener("click", navEnd);

    $("#newClose").addEventListener("click", () => $("#newDialog").close());
    $("#newCancel").addEventListener("click", () => $("#newDialog").close());

    $("#modeSeg").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-mode]");
      if (!btn) return;
      draft.mode = btn.dataset.mode;
      syncDraftUI();
    });
    $("#levelSeg").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-level]");
      if (!btn) return;
      draft.level = btn.dataset.level;
      syncDraftUI();
    });
    $("#colorSeg").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-color]");
      if (!btn) return;
      draft.color = btn.dataset.color;
      syncDraftUI();
    });
    $("#timeSeg").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-min]");
      if (!btn) return;
      draft.minutes = Number(btn.dataset.min);
      syncDraftUI();
    });

    $("#newStart").addEventListener("click", () => {
      prefs.mode = draft.mode;
      prefs.level = draft.level;
      prefs.color = draft.color;
      prefs.minutes = draft.minutes;
      savePrefs();
      $("#newDialog").close();
      startGame({
        mode: draft.mode,
        level: draft.level,
        color: draft.color,
        minutes: draft.minutes,
      });
    });

    $("#newDialog").addEventListener("click", (ev) => {
      if (ev.target === $("#newDialog")) $("#newDialog").close();
    });

    $("#overNew").addEventListener("click", () => {
      $("#overDialog").close();
      openNewDialog();
    });
    $("#overReview").addEventListener("click", () => {
      overShown = true;
      $("#overDialog").close();
    });

    $("#confirmYes").addEventListener("click", () => $("#confirmDialog").close("yes"));
    $("#confirmNo").addEventListener("click", () => $("#confirmDialog").close("no"));

    $("#promoDialog").addEventListener("cancel", (ev) => {
      ev.preventDefault();
      $("#promoDialog").close("");
    });

    $("#rulesDialog").addEventListener("click", (ev) => {
      if (ev.target === $("#rulesDialog")) $("#rulesDialog").close();
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        if (anyDialogOpen()) return;
        if (shapeDrag) {
          cancelShapeDrag();
          ev.preventDefault();
          return;
        }
        if (premove && isLive()) {
          cancelPremove(true);
          ev.preventDefault();
          return;
        }
        if (selectingPremove && selected >= 0) {
          selected = -1;
          legal = [];
          selectingPremove = false;
          render();
          ev.preventDefault();
          return;
        }
        if (arrowMode) {
          setArrowMode(false);
          ev.preventDefault();
          return;
        }
        if (viewIndex !== null) {
          navEnd();
          ev.preventDefault();
        }
        return;
      }
      if (anyDialogOpen()) return;
      const tag = ev.target && ev.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (ev.key === "ArrowLeft") { ev.preventDefault(); navPrev(); return; }
      if (ev.key === "ArrowRight") { ev.preventDefault(); navNext(); return; }
      if (ev.key === "f" || ev.key === "F") { ev.preventDefault(); flip(); return; }
      if (ev.key === "n" || ev.key === "N") { ev.preventDefault(); openNewDialog(); return; }
      if (ev.key === "u" || ev.key === "U") { ev.preventDefault(); undo(); return; }
      if (ev.key === "h" || ev.key === "H") { ev.preventDefault(); requestHint(); return; }
      if (ev.key === "a" || ev.key === "A") { ev.preventDefault(); setArrowMode(!arrowMode); return; }
      if (ev.key === "c" || ev.key === "C") { ev.preventDefault(); clearShapes(); return; }
    });

    document.addEventListener("visibilitychange", () => {
      lastTick = performance.now();
      if (document.hidden) save();
    });

    window.addEventListener("beforeunload", save);

    window.addEventListener("resize", () => {
      if (game) boardEl.style.setProperty("--sq", boardEl.clientWidth / 8 + "px");
    });
  }

  /* ---------- التشغيل ---------- */
  function boot() {
    document.documentElement.dataset.theme = prefs.theme;
    applyBoardTheme(prefs.board);
    applyPieceSet(prefs.pieces);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (boardEl.clientWidth) boardEl.style.setProperty("--sq", boardEl.clientWidth / 8 + "px");
      });
      ro.observe(boardEl);
    }

    bind();
    renderBoardSwatches();
    renderPieceSwatches();
    clockTimer = setInterval(tickClock, 200);

    if (restore()) {
      updateLevelUI();
      render();
      toast("تم استئناف المباراة السابقة");
      if (game.mode === "ai" && !game.over && liveState().turn !== game.humanColor) {
        setTimeout(() => {
          if (game && !game.over && isLive()) scheduleAI();
        }, 600);
      }
    } else {
      startGame(
        { mode: prefs.mode, level: prefs.level, color: "w", minutes: prefs.minutes },
        { deferAI: true }
      );
      openNewDialog();
    }
  }

  boot();
})();
