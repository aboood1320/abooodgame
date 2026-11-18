/* =========================================================
   Chess AI — تقييم وبحث (Negamax + Alpha-Beta + Quiescence)
   يعمل في المتصفح وWeb Worker وNode.js
   ========================================================= */
(function (root, factory) {
  const C = root && root.Chess ? root.Chess : typeof require === "function" ? require("./engine.js") : null;
  const api = factory(C);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ChessAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";

  if (!C) throw new Error("Chess engine is required before ChessAI");

  const INF = 1000000;
  const MATE = 100000;

  const VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

  /* ---------- جداول المواقع (من الأبيض، الصف الأول = الصف الثامن) ---------- */
  const PST = {
    P: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    N: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50,
    ],
    B: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20,
    ],
    R: [
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 10, 10, 10, 10, 10, 10, 5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      0, 0, 0, 5, 5, 0, 0, 0,
    ],
    Q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20,
    ],
    K: [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20,
    ],
    K_END: [
      -50, -40, -30, -20, -20, -30, -40, -50,
      -30, -20, -10, 0, 0, -10, -20, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -30, 0, 0, 0, 0, -30, -30,
      -50, -30, -30, -30, -30, -30, -30, -50,
    ],
  };

  /* ---------- التقييم ---------- */
  function evaluate(state) {
    const b = state.board;
    let score = 0;
    let heavy = 0;

    const pawns = { w: [0, 0, 0, 0, 0, 0, 0, 0], b: [0, 0, 0, 0, 0, 0, 0, 0] };
    const pawnFiles = { w: [], b: [] };
    const lowRow = { w: [8, 8, 8, 8, 8, 8, 8, 8], b: [8, 8, 8, 8, 8, 8, 8, 8] };
    const highRow = { w: [-1, -1, -1, -1, -1, -1, -1, -1], b: [-1, -1, -1, -1, -1, -1, -1, -1] };
    const kingSq = { w: -1, b: -1 };
    const bishops = { w: 0, b: 0 };

    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i];
      if (!p) continue;

      const white = p === p.toUpperCase();
      const side = white ? "w" : "b";
      const t = p.toUpperCase();
      const row = i >> 4;
      const file = i & 7;
      const idx = white ? row * 8 + file : (7 - row) * 8 + file;
      const sign = white ? 1 : -1;

      if (t === "K") {
        kingSq[side] = i;
        continue;
      }

      score += sign * VALUE[t];

      if (t === "P") {
        pawns[side][file]++;
        pawnFiles[side].push(i);
        if (row < lowRow[side][file]) lowRow[side][file] = row;
        if (row > highRow[side][file]) highRow[side][file] = row;
        score += sign * PST.P[idx];
      } else if (t === "N") {
        score += sign * PST.N[idx];
        heavy += 3;
      } else if (t === "B") {
        score += sign * PST.B[idx];
        bishops[side]++;
        heavy += 3;
      } else if (t === "R") {
        score += sign * PST.R[idx];
        heavy += 5;
      } else if (t === "Q") {
        score += sign * PST.Q[idx];
        heavy += 9;
      }
    }

    const endgame = heavy < 12;

    /* الملك بعد حساب العتاد الثقيل حتى يُختار جدول النهاية الصحيح */
    for (const side of ["w", "b"]) {
      const at = kingSq[side];
      if (at < 0) continue;
      const row = at >> 4;
      const file = at & 7;
      const idx = side === "w" ? row * 8 + file : (7 - row) * 8 + file;
      score += (side === "w" ? 1 : -1) * (endgame ? PST.K_END[idx] : PST.K[idx]);
    }

    /* البيادق: مزدوجة، معزولة، مارّة */
    for (const side of ["w", "b"]) {
      const sign = side === "w" ? 1 : -1;
      const own = pawns[side];
      const enemy = side === "w" ? "b" : "w";

      for (let f = 0; f < 8; f++) {
        if (own[f] > 1) score -= sign * 14 * (own[f] - 1);
        const hasLeft = f > 0 && own[f - 1] > 0;
        const hasRight = f < 7 && own[f + 1] > 0;
        if (own[f] && !hasLeft && !hasRight) score -= sign * 14;
      }

      for (const at of pawnFiles[side]) {
        const row = at >> 4;
        const f = at & 7;
        let passed = true;
        for (let df = -1; df <= 1 && passed; df++) {
          const nf = f + df;
          if (nf < 0 || nf > 7) continue;
          if (side === "w") {
            if (lowRow[enemy][nf] < row) passed = false;
          } else if (highRow[enemy][nf] > row) {
            passed = false;
          }
        }
        if (passed) {
          const rank = side === "w" ? 7 - row : row;
          const bonus = [0, 8, 16, 30, 55, 90, 140, 200][rank] || 0;
          score += sign * bonus;
        }
      }
    }

    /* فيلة */
    if (bishops.w >= 2) score += 28;
    if (bishops.b >= 2) score -= 28;

    /* قلاع على أعمدة مفتوحة / نصف مفتوحة، وقلعة في الصف السابع */
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i];
      if (!p) continue;
      const t = p.toUpperCase();
      if (t !== "R") continue;
      const white = p === "R";
      const sign = white ? 1 : -1;
      const f = i & 7;
      const row = i >> 4;
      const own = white ? pawns.w[f] : pawns.b[f];
      const foe = white ? pawns.b[f] : pawns.w[f];
      if (own === 0) score += sign * (foe === 0 ? 18 : 8);
      if ((white && row === 1) || (!white && row === 6)) score += sign * 16;
    }

    /* أمان الملك: درع البيادق */
    for (const side of ["w", "b"]) {
      const kingIdx = kingSq[side];
      if (kingIdx < 0) continue;
      const row = kingIdx >> 4;
      const file = kingIdx & 7;
      const sign = side === "w" ? 1 : -1;
      const dir = side === "w" ? -1 : 1;
      let shield = 0;
      for (let df = -1; df <= 1; df++) {
        const f = file + df;
        if (f < 0 || f > 7) continue;
        for (let dr = 1; dr <= 2; dr++) {
          const r = row + dir * dr;
          if (r < 0 || r > 7) break;
          const q = b[r * 16 + f];
          if (q === (side === "w" ? "P" : "p")) { shield++; break; }
        }
      }
      if (!endgame) score += sign * (shield * 7 - 10);
    }

    /* إيقاع */
    score += state.turn === "w" ? 10 : -10;

    return score;
  }

  /* ---------- ترتيب الحركات ---------- */
  function moveKey(m) {
    return m.from * 128 + m.to;
  }

  function moveScore(state, m, ctx, ply) {
    const b = state.board;
    let s = 0;

    if (m.captured && m.capturedSq >= 0) {
      const victim = VALUE[m.captured.toUpperCase()] || 0;
      const attacker = VALUE[(b[m.from] || "P").toUpperCase()] || 0;
      s += 100000 + victim * 10 - attacker;
    }
    if (m.promo) s += 50000 + (VALUE[m.promo] || 0);

    if (!m.captured && !m.promo) {
      const key = moveKey(m);
      if (ctx && ctx.killers[ply]) {
        if (ctx.killers[ply][0] === key) s += 9000;
        else if (ctx.killers[ply][1] === key) s += 8000;
      }
      if (ctx && ctx.history) s += Math.min(6000, ctx.history[key] || 0);
      if (s === 0) {
        const p = b[m.from];
        if (p === "P" || p === "p") s += 20;
      }
    }
    return s;
  }

  function orderMoves(state, moves, ctx, ply) {
    const scored = moves.map((m) => ({ m, s: moveScore(state, m, ctx, ply) }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.m);
  }

  function hasNonPawnMaterial(state, side) {
    const wanted = side === "w" ? "NBRQ" : "nbrq";
    const b = state.board;
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i];
      if (p && wanted.indexOf(p) >= 0) return true;
    }
    return false;
  }

  /* ---------- البحث ---------- */
  function negamax(state, depth, alpha, beta, ply, ctx) {
    if (ctx.aborted) return 0;
    ctx.nodes++;

    if ((ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true;
      return 0;
    }

    if (depth <= 0) return quiesce(state, alpha, beta, ply, ctx, 0);
    if (state.halfmove >= 100) return 0;

    const side = state.turn;
    const inChk = C.inCheck(state, side);

    /* تقليم الحركة الفارغة: يمنح عمقًا فعليًا أكبر في المواقف الهادئة. */
    if (!inChk && !ctx.noNull && depth >= 3 && hasNonPawnMaterial(state, side)) {
      const savedTurn = state.turn;
      const savedEp = state.ep;
      const savedHalf = state.halfmove;
      state.turn = side === "w" ? "b" : "w";
      state.ep = null;
      state.halfmove = savedHalf + 1;
      ctx.noNull = true;
      const score = -negamax(state, depth - 3, -beta, -beta + 1, ply + 1, ctx);
      ctx.noNull = false;
      state.turn = savedTurn;
      state.ep = savedEp;
      state.halfmove = savedHalf;
      if (ctx.aborted) return 0;
      if (score >= beta) return beta;
    }

    const moves = orderMoves(state, C.generatePseudo(state), ctx, ply);
    let best = -INF;
    let legal = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const undo = C.makeMove(state, m);
      if (C.inCheck(state, side)) {
        C.unmakeMove(state, undo);
        continue;
      }
      legal++;

      /* تمديد عند كشف الملك، بحدّ أعلى حتى لا يتضخم البحث. */
      let extension = 0;
      if (inChk && ctx.extensions < 10) {
        extension = 1;
        ctx.extensions++;
      }

      const quiet = !m.captured && !m.promo;
      let score;

      if (i === 0) {
        score = -negamax(state, depth - 1 + extension, -beta, -alpha, ply + 1, ctx);
      } else {
        let reduction = 0;
        if (quiet && !inChk && depth >= 3 && i >= 4) {
          reduction = 1;
          if (i >= 10 && depth >= 5) reduction = 2;
        }
        score = -negamax(state, depth - 1 + extension - reduction, -alpha - 1, -alpha, ply + 1, ctx);
        if (!ctx.aborted && score > alpha) {
          score = -negamax(state, depth - 1 + extension, -beta, -alpha, ply + 1, ctx);
        }
      }

      if (extension) ctx.extensions--;
      C.unmakeMove(state, undo);
      if (ctx.aborted) return 0;

      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (quiet) {
          const key = moveKey(m);
          const killers = ctx.killers[ply] || (ctx.killers[ply] = [-1, -1]);
          if (killers[0] !== key) {
            killers[1] = killers[0];
            killers[0] = key;
          }
          ctx.history[key] = (ctx.history[key] || 0) + depth * depth;
        }
        break;
      }
    }

    if (!legal) return C.inCheck(state, side) ? -MATE + ply : 0;
    return best;
  }

  function quiesce(state, alpha, beta, ply, ctx, qdepth) {
    if (ctx.aborted) return 0;
    ctx.nodes++;

    if ((ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true;
      return 0;
    }

    const side = state.turn;
    const inChk = C.inCheck(state, side);

    if (!inChk) {
      const stand = evaluate(state) * (side === "w" ? 1 : -1);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      if (qdepth >= 6) return alpha;
      /* تقليم دلتا: حتى أفضل أسر لا يرفع التقييم بما يكفي. */
      if (stand + VALUE.Q + 60 < alpha) return alpha;
    } else if (qdepth >= 8) {
      return evaluate(state) * (side === "w" ? 1 : -1);
    }

    const moves = orderMoves(state, C.generatePseudo(state), ctx, ply);
    let legal = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (!inChk && !m.captured && !m.promo) continue;

      const undo = C.makeMove(state, m);
      if (C.inCheck(state, side)) {
        C.unmakeMove(state, undo);
        continue;
      }
      legal++;
      const score = -quiesce(state, -beta, -alpha, ply + 1, ctx, qdepth + 1);
      C.unmakeMove(state, undo);
      if (ctx.aborted) return 0;

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    if (inChk && legal === 0) return -MATE + ply;
    return alpha;
  }

  /* ---------- المستويات ---------- */
  const LEVELS = {
    beginner: { label: "مبتدئ (100)", depth: 1, timeLimit: 200, randomness: 92, blunder: 0.45, skill: 0 },
    easy: { label: "سهل (250)", depth: 2, timeLimit: 450, randomness: 65, blunder: 0.28, skill: 2 },
    medium: { label: "متوسط (1000)", depth: 4, timeLimit: 1000, randomness: 10, blunder: 0.015, skill: 10 },
    hard: { label: "صعب (2000)", depth: 7, timeLimit: 3500, randomness: 0, blunder: 0, skill: 16 },
    expert: { label: "خبير (3600)", depth: 10, timeLimit: 20000, randomness: 0, blunder: 0, skill: 20 },
  };

  function search(state, options) {
    const opts = Object.assign({}, LEVELS.medium, options || {});
    const started = Date.now();
    const ctx = {
      nodes: 0,
      deadline: started + Math.max(40, opts.timeLimit || 1000),
      aborted: false,
      killers: [],
      history: new Int32Array(128 * 128),
      extensions: 0,
      noNull: false,
    };

    const rootMoves = C.legalMoves(state);
    if (!rootMoves.length) return null;

    const result = {
      move: rootMoves[0],
      score: 0,
      depth: 0,
      nodes: 0,
      time: 0,
      mateIn: null,
    };

    if (rootMoves.length === 1) {
      result.time = Date.now() - started;
      return result;
    }

    const maxDepth = Math.max(1, Math.min(14, opts.depth || 3));
    let ordered = orderMoves(state, rootMoves, ctx, 0);
    let rootScores = ordered.map((m) => ({ m, score: 0 }));
    let completed = 0;

    for (let d = 1; d <= maxDepth; d++) {
      const scored = [];
      let alpha = -INF;
      const beta = INF;
      let aborted = false;

      for (let i = 0; i < ordered.length; i++) {
        const m = ordered[i];
        const undo = C.makeMove(state, m);
        const score = -negamax(state, d - 1, -beta, -alpha, 1, ctx);
        C.unmakeMove(state, undo);
        if (ctx.aborted) { aborted = true; break; }
        scored.push({ m, score });
        if (score > alpha) alpha = score;
      }

      if (aborted) break;

      scored.sort((a, b) => b.score - a.score);
      rootScores = scored;
      ordered = scored.map((x) => x.m);
      completed = d;

      result.move = scored[0].m;
      result.score = scored[0].score;
      result.depth = d;
      result.mateIn = Math.abs(scored[0].score) > MATE - 1000
        ? Math.round((MATE - Math.abs(scored[0].score)) / 2) * Math.sign(scored[0].score)
        : null;

      if (result.mateIn !== null && Math.abs(result.mateIn) <= 1) break;
      if (Date.now() > ctx.deadline) break;
    }

    /* اختيار نهائي مع عشوائية محسوبة حسب المستوى */
    if (completed > 0 && opts.randomness > 0 && rootScores.length > 1) {
      const best = rootScores[0].score;
      if (Math.abs(best) < MATE - 1000 && Math.random() * 100 < opts.randomness) {
        const threshold = Math.max(40, opts.randomness * 3);
        const alternatives = rootScores.filter((x) => x.score >= best - threshold).slice(1);
        if (alternatives.length) {
          const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
          result.move = pick.m;
          result.score = pick.score;
          result.mateIn = null;
        }
      }
    }

    /* احتمال الخطأ للمستويات الضعيفة */
    if (opts.blunder > 0 && completed > 0 && rootScores.length > 1 && Math.random() < opts.blunder) {
      const pool = rootScores.length > 2
        ? rootScores.slice(1, Math.min(6, rootScores.length))
        : rootScores;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      result.move = pick.m;
      result.score = pick.score;
      result.mateIn = null;
    }

    result.nodes = ctx.nodes;
    result.time = Date.now() - started;
    result.depth = completed || 1;
    return result;
  }

  function bestMove(state, options) {
    const r = search(state, options);
    return r ? r.move : null;
  }

  return {
    search,
    bestMove,
    evaluate,
    LEVELS,
    VALUE,
    MATE,
  };
});
