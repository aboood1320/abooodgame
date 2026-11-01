/* =========================================================
   Chess Engine — قواعد الشطرنج الكاملة (0x88)
   يعمل في المتصفح وNode.js
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Chess = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const FILES = "abcdefgh";

  const KNIGHT_OFFSETS = [14, 18, 31, 33, -14, -18, -31, -33];
  const KING_OFFSETS = [1, 15, 16, 17, -1, -15, -16, -17];
  const BISHOP_DIRS = [15, 17, -15, -17];
  const ROOK_DIRS = [1, 16, -1, -16];
  const QUEEN_DIRS = [1, 15, 16, 17, -1, -15, -16, -17];

  const onBoard = (i) => (i & 0x88) === 0;
  const colorOf = (p) => (p ? (p === p.toUpperCase() ? "w" : "b") : null);
  const typeOf = (p) => (p ? p.toUpperCase() : null);
  const other = (c) => (c === "w" ? "b" : "w");

  function squareName(i) {
    if (!onBoard(i)) return "-";
    return FILES[i & 7] + String(8 - (i >> 4));
  }

  function parseSquare(name) {
    if (typeof name !== "string" || name.length < 2) return -1;
    const f = FILES.indexOf(name[0]);
    const r = 8 - Number(name[1]);
    if (f < 0 || r < 0 || r > 7) return -1;
    return r * 16 + f;
  }

  /* ---------- FEN ---------- */
  function fromFEN(fen) {
    const parts = String(fen || START_FEN).trim().split(/\s+/);
    const board = new Array(128).fill(null);
    let row = 0;
    let file = 0;

    for (const ch of parts[0]) {
      if (ch === "/") {
        row++;
        file = 0;
      } else if (ch >= "1" && ch <= "8") {
        file += Number(ch);
      } else if ("pnbrqkPNBRQK".includes(ch)) {
        if (row < 8 && file < 8) board[row * 16 + file] = ch;
        file++;
      }
    }

    const state = {
      board,
      turn: parts[1] === "b" ? "b" : "w",
      castling: parts[2] && parts[2] !== "-" ? parts[2] : "-",
      ep: parts[3] && parts[3] !== "-" ? parseSquare(parts[3]) : -1,
      halfmove: Number(parts[4] || 0) || 0,
      fullmove: Number(parts[5] || 1) || 1,
      kings: { w: -1, b: -1 },
    };

    for (let i = 0; i < 128; i++) {
      if (board[i] === "K") state.kings.w = i;
      else if (board[i] === "k") state.kings.b = i;
    }
    return state;
  }

  function toFEN(state) {
    let out = "";
    for (let row = 0; row < 8; row++) {
      let empty = 0;
      for (let file = 0; file < 8; file++) {
        const p = state.board[row * 16 + file];
        if (!p) empty++;
        else {
          if (empty) out += String(empty);
          empty = 0;
          out += p;
        }
      }
      if (empty) out += String(empty);
      if (row < 7) out += "/";
    }
    return (
      out +
      " " +
      state.turn +
      " " +
      (state.castling || "-") +
      " " +
      (state.ep >= 0 ? squareName(state.ep) : "-") +
      " " +
      state.halfmove +
      " " +
      state.fullmove
    );
  }

  function positionKey(state) {
    const fen = toFEN(state).split(" ");
    return fen.slice(0, 4).join(" ");
  }

  function clone(state) {
    return {
      board: state.board.slice(),
      turn: state.turn,
      castling: state.castling,
      ep: state.ep,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      kings: { w: state.kings.w, b: state.kings.b },
    };
  }

  /* ---------- الهجوم ---------- */
  function isAttacked(state, sq, by) {
    const b = state.board;
    if (!onBoard(sq)) return false;

    if (by === "w") {
      if (b[sq + 15] === "P" || b[sq + 17] === "P") return true;
    } else {
      if (b[sq - 15] === "p" || b[sq - 17] === "p") return true;
    }

    const N = by === "w" ? "N" : "n";
    for (let k = 0; k < 8; k++) {
      const t = sq + KNIGHT_OFFSETS[k];
      if (onBoard(t) && b[t] === N) return true;
    }

    const K = by === "w" ? "K" : "k";
    for (let k = 0; k < 8; k++) {
      const t = sq + KING_OFFSETS[k];
      if (onBoard(t) && b[t] === K) return true;
    }

    const B = by === "w" ? "B" : "b";
    const Q = by === "w" ? "Q" : "q";
    const R = by === "w" ? "R" : "r";

    for (let k = 0; k < 4; k++) {
      let t = sq + BISHOP_DIRS[k];
      while (onBoard(t)) {
        const p = b[t];
        if (p) {
          if (p === B || p === Q) return true;
          break;
        }
        t += BISHOP_DIRS[k];
      }
    }

    for (let k = 0; k < 4; k++) {
      let t = sq + ROOK_DIRS[k];
      while (onBoard(t)) {
        const p = b[t];
        if (p) {
          if (p === R || p === Q) return true;
          break;
        }
        t += ROOK_DIRS[k];
      }
    }

    return false;
  }

  function inCheck(state, side) {
    return isAttacked(state, state.kings[side], other(side));
  }

  /* ---------- توليد الحركات ---------- */
  function generatePseudo(state, side) {
    side = side || state.turn;
    const b = state.board;
    const moves = [];
    const push = (from, to, extra) => {
      const m = { from, to, piece: b[from] };
      if (extra) Object.assign(m, extra);
      moves.push(m);
    };

    for (let from = 0; from < 128; from++) {
      if (!onBoard(from)) {
        from += 7;
        continue;
      }
      const p = b[from];
      if (!p || colorOf(p) !== side) continue;

      const type = typeOf(p);

      if (type === "P") {
        pawnMoves(state, side, from, moves);
        continue;
      }

      if (type === "N" || type === "K") {
        const offs = type === "N" ? KNIGHT_OFFSETS : KING_OFFSETS;
        for (let k = 0; k < 8; k++) {
          const to = from + offs[k];
          if (!onBoard(to)) continue;
          const q = b[to];
          if (!q) push(from, to);
          else if (colorOf(q) !== side) push(from, to, { captured: q, capturedSq: to });
        }
        if (type === "K") castlingMoves(state, side, from, moves);
        continue;
      }

      const dirs = type === "B" ? BISHOP_DIRS : type === "R" ? ROOK_DIRS : QUEEN_DIRS;
      for (let d = 0; d < dirs.length; d++) {
        let to = from + dirs[d];
        while (onBoard(to)) {
          const q = b[to];
          if (!q) push(from, to);
          else {
            if (colorOf(q) !== side) push(from, to, { captured: q, capturedSq: to });
            break;
          }
          to += dirs[d];
        }
      }
    }

    return moves;
  }

  function pawnMoves(state, side, from, moves) {
    const b = state.board;
    const dir = side === "w" ? -16 : 16;
    const startRow = side === "w" ? 6 : 1;
    const promoRow = side === "w" ? 0 : 7;

    const addPawn = (to, captured, capturedSq, ep) => {
      const base = { from, to, piece: b[from] };
      if (captured) {
        base.captured = captured;
        base.capturedSq = capturedSq;
      }
      if (ep) base.ep = true;
      if (to >> 4 === promoRow) {
        for (const promo of ["Q", "R", "B", "N"]) {
          moves.push(Object.assign({}, base, { promo }));
        }
      } else {
        moves.push(base);
      }
    };

    const one = from + dir;
    if (onBoard(one) && !b[one]) {
      addPawn(one);

      if (from >> 4 === startRow) {
        const two = from + dir * 2;
        if (onBoard(two) && !b[two]) {
          moves.push({ from, to: two, piece: b[from], double: true });
        }
      }
    }

    for (const dc of [-1, 1]) {
      const to = from + dir + dc;
      if (!onBoard(to)) continue;
      const q = b[to];
      if (q && colorOf(q) !== side) {
        addPawn(to, q, to);
      } else if (!q && to === state.ep) {
        const capSq = from + dc;
        addPawn(to, b[capSq], capSq, true);
      }
    }
  }

  function castlingMoves(state, side, from, moves) {
    const b = state.board;
    const rights = state.castling;

    if (side === "w" && from === 116) {
      if (
        rights.includes("K") && !b[117] && !b[118] &&
        !isAttacked(state, 116, "b") && !isAttacked(state, 117, "b") && !isAttacked(state, 118, "b")
      ) {
        moves.push({ from, to: 118, piece: "K", castle: "K" });
      }
      if (
        rights.includes("Q") && !b[115] && !b[114] && !b[113] &&
        !isAttacked(state, 116, "b") && !isAttacked(state, 115, "b") && !isAttacked(state, 114, "b")
      ) {
        moves.push({ from, to: 114, piece: "K", castle: "Q" });
      }
    } else if (side === "b" && from === 4) {
      if (
        rights.includes("k") && !b[5] && !b[6] &&
        !isAttacked(state, 4, "w") && !isAttacked(state, 5, "w") && !isAttacked(state, 6, "w")
      ) {
        moves.push({ from, to: 6, piece: "k", castle: "k" });
      }
      if (
        rights.includes("q") && !b[3] && !b[2] && !b[1] &&
        !isAttacked(state, 4, "w") && !isAttacked(state, 3, "w") && !isAttacked(state, 2, "w")
      ) {
        moves.push({ from, to: 2, piece: "k", castle: "q" });
      }
    }
  }

  /* ---------- التنفيذ والتراجع ---------- */
  function makeMove(state, m) {
    const b = state.board;
    const side = colorOf(b[m.from]);
    const piece = b[m.from];

    const undo = {
      move: m,
      side,
      captured: null,
      capturedSq: -1,
      castling: state.castling,
      ep: state.ep,
      halfmove: state.halfmove,
      kings: { w: state.kings.w, b: state.kings.b },
    };

    b[m.from] = null;

    if (m.ep) {
      const capSq = m.capturedSq;
      undo.captured = b[capSq];
      undo.capturedSq = capSq;
      b[capSq] = null;
    } else if (b[m.to]) {
      undo.captured = b[m.to];
      undo.capturedSq = m.to;
    }

    b[m.to] = m.promo ? (side === "w" ? m.promo.toUpperCase() : m.promo.toLowerCase()) : piece;

    if (m.castle) {
      if (m.castle === "K") { b[117] = b[119]; b[119] = null; }
      else if (m.castle === "Q") { b[115] = b[112]; b[112] = null; }
      else if (m.castle === "k") { b[5] = b[7]; b[7] = null; }
      else if (m.castle === "q") { b[3] = b[0]; b[0] = null; }
    }

    if (piece === "K") state.kings.w = m.to;
    else if (piece === "k") state.kings.b = m.to;

    let rights = state.castling;
    const drop = (ch) => { rights = rights.replace(ch, ""); };

    if (piece === "K") { drop("K"); drop("Q"); }
    if (piece === "k") { drop("k"); drop("q"); }
    if (m.from === 119 || m.to === 119) drop("K");
    if (m.from === 112 || m.to === 112) drop("Q");
    if (m.from === 7 || m.to === 7) drop("k");
    if (m.from === 0 || m.to === 0) drop("q");
    state.castling = rights || "-";

    state.ep = -1;
    if (typeOf(piece) === "P" && Math.abs(m.to - m.from) === 32) {
      state.ep = (m.from + m.to) / 2;
    }

    state.halfmove = typeOf(piece) === "P" || undo.captured ? 0 : state.halfmove + 1;
    if (side === "b") state.fullmove++;
    state.turn = other(side);

    return undo;
  }

  function unmakeMove(state, undo) {
    const b = state.board;
    const m = undo.move;

    state.castling = undo.castling;
    state.ep = undo.ep;
    state.halfmove = undo.halfmove;
    state.kings.w = undo.kings.w;
    state.kings.b = undo.kings.b;
    state.turn = undo.side;
    if (undo.side === "b") state.fullmove--;

    const moved = m.promo ? (undo.side === "w" ? "P" : "p") : b[m.to];
    b[m.to] = null;
    b[m.from] = moved;

    if (undo.captured) b[undo.capturedSq] = undo.captured;

    if (m.castle) {
      if (m.castle === "K") { b[119] = b[117]; b[117] = null; }
      else if (m.castle === "Q") { b[112] = b[115]; b[115] = null; }
      else if (m.castle === "k") { b[7] = b[5]; b[5] = null; }
      else if (m.castle === "q") { b[0] = b[3]; b[3] = null; }
    }
  }

  /* ---------- الحركات القانونية ---------- */
  function legalMoves(state, side) {
    side = side || state.turn;
    const pseudo = generatePseudo(state, side);
    const out = [];

    for (let i = 0; i < pseudo.length; i++) {
      const m = pseudo[i];
      const undo = makeMove(state, m);
      if (!inCheck(state, side)) out.push(m);
      unmakeMove(state, undo);
    }
    return out;
  }

  function parseMove(state, from, to, promo) {
    const moves = legalMoves(state);
    const candidates = moves.filter((m) => m.from === from && m.to === to);
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    const wanted = (promo || "Q").toUpperCase();
    return candidates.find((m) => (m.promo || "Q") === wanted) || candidates[0];
  }

  /* ---------- الحالة ---------- */
  function insufficientMaterial(state) {
    const pieces = [];
    for (let i = 0; i < 128; i++) {
      const p = state.board[i];
      if (p) pieces.push({ p, i });
    }
    const nonKings = pieces.filter((x) => typeOf(x.p) !== "K");
    if (nonKings.length === 0) return true;
    if (nonKings.length === 1) {
      const t = typeOf(nonKings[0].p);
      return t === "B" || t === "N";
    }
    if (nonKings.length === 2) {
      const [a, b] = nonKings;
      if (typeOf(a.p) === "B" && typeOf(b.p) === "B" && colorOf(a.p) !== colorOf(b.p)) {
        const colorOfSquare = (i) => ((i >> 4) + (i & 7)) % 2;
        return colorOfSquare(a.i) === colorOfSquare(b.i);
      }
    }
    return false;
  }

  function status(state) {
    const moves = legalMoves(state);
    const side = state.turn;

    if (!moves.length) {
      if (inCheck(state, side)) {
        return {
          over: true,
          result: side === "w" ? "0-1" : "1-0",
          reason: "checkmate",
          winner: other(side),
          moves,
        };
      }
      return { over: true, result: "1/2-1/2", reason: "stalemate", winner: null, moves };
    }

    if (state.halfmove >= 100) {
      return { over: true, result: "1/2-1/2", reason: "fifty", winner: null, moves };
    }

    if (insufficientMaterial(state)) {
      return { over: true, result: "1/2-1/2", reason: "material", winner: null, moves };
    }

    return { over: false, result: null, reason: null, winner: null, moves };
  }

  /* ---------- SAN ---------- */
  function moveToSAN(state, move) {
    const piece = state.board[move.from];
    const type = typeOf(piece);
    let san;

    if (move.castle) {
      san = move.castle === "K" || move.castle === "k" ? "O-O" : "O-O-O";
    } else if (type === "P") {
      if (move.captured) san = FILES[move.from & 7] + "x" + squareName(move.to);
      else san = squareName(move.to);
      if (move.promo) san += "=" + move.promo.toUpperCase();
    } else {
      let disamb = "";
      const rivals = legalMoves(state).filter(
        (m) => m.to === move.to && m.from !== move.from && state.board[m.from] === piece
      );
      if (rivals.length) {
        const sameFile = rivals.some((m) => (m.from & 7) === (move.from & 7));
        const sameRank = rivals.some((m) => (m.from >> 4) === (move.from >> 4));
        if (!sameFile) disamb = FILES[move.from & 7];
        else if (!sameRank) disamb = String(8 - (move.from >> 4));
        else disamb = squareName(move.from);
      }
      san = type + disamb + (move.captured ? "x" : "") + squareName(move.to);
    }

    const undo = makeMove(state, move);
    if (inCheck(state, state.turn)) {
      san += legalMoves(state).length ? "+" : "#";
    }
    unmakeMove(state, undo);
    return san;
  }

  /* ---------- perft ---------- */
  function perft(state, depth) {
    if (depth === 0) return 1;
    if (depth === 1) return legalMoves(state).length;
    let nodes = 0;
    const moves = legalMoves(state);
    for (let i = 0; i < moves.length; i++) {
      const undo = makeMove(state, moves[i]);
      nodes += perft(state, depth - 1);
      unmakeMove(state, undo);
    }
    return nodes;
  }

  return {
    START_FEN,
    createGame: (fen) => fromFEN(fen || START_FEN),
    fromFEN,
    toFEN,
    positionKey,
    clone,
    legalMoves,
    generatePseudo,
    makeMove,
    unmakeMove,
    parseMove,
    isAttacked,
    inCheck,
    status,
    insufficientMaterial,
    moveToSAN,
    perft,
    squareName,
    parseSquare,
    colorOf,
    typeOf,
    other,
  };
});
