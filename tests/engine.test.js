const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../engine.js");

const perft = (fen, depth) => C.perft(C.fromFEN(fen), depth);

test("perft — الوضع الابتدائي", () => {
  assert.equal(perft(C.START_FEN, 1), 20);
  assert.equal(perft(C.START_FEN, 2), 400);
  assert.equal(perft(C.START_FEN, 3), 8902);
  assert.equal(perft(C.START_FEN, 4), 197281);
});

test("perft — Kiwipete (تبييت وضغط)", () => {
  const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
  assert.equal(perft(fen, 1), 48);
  assert.equal(perft(fen, 2), 2039);
  assert.equal(perft(fen, 3), 97862);
});

test("perft — وضع 3 (بيادق)", () => {
  const fen = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
  assert.equal(perft(fen, 1), 14);
  assert.equal(perft(fen, 2), 191);
  assert.equal(perft(fen, 3), 2812);
  assert.equal(perft(fen, 4), 43238);
});

test("perft — وضع 4 (ترقية)", () => {
  const fen = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1";
  assert.equal(perft(fen, 1), 6);
  assert.equal(perft(fen, 2), 264);
  assert.equal(perft(fen, 3), 9467);
});

test("perft — وضع 5", () => {
  const fen = "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8";
  assert.equal(perft(fen, 1), 44);
  assert.equal(perft(fen, 2), 1486);
  assert.equal(perft(fen, 3), 62379);
});

test("perft — وضع 6", () => {
  const fen = "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10";
  assert.equal(perft(fen, 1), 46);
  assert.equal(perft(fen, 2), 2079);
  assert.equal(perft(fen, 3), 89890);
});

test("الحركات الابتدائية", () => {
  const g = C.createGame();
  const moves = C.legalMoves(g);
  assert.equal(moves.length, 20);
  assert.ok(moves.some((m) => C.squareName(m.from) === "e2" && C.squareName(m.to) === "e4"));
});

test("SAN والتبييت", () => {
  const g = C.createGame();
  const e4 = C.parseMove(g, C.parseSquare("e2"), C.parseSquare("e4"));
  assert.equal(C.moveToSAN(g, e4), "e4");
  C.makeMove(g, e4);

  const e5 = C.parseMove(g, C.parseSquare("e7"), C.parseSquare("e5"));
  C.makeMove(g, e5);

  const nf3 = C.parseMove(g, C.parseSquare("g1"), C.parseSquare("f3"));
  assert.equal(C.moveToSAN(g, nf3), "Nf3");
  C.makeMove(g, nf3);
  assert.equal(g.turn, "b");
});

test("التبييت القصير", () => {
  const g = C.fromFEN("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  const san = C.moveToSAN(g, C.parseMove(g, C.parseSquare("e1"), C.parseSquare("g1")));
  assert.equal(san, "O-O");
  C.makeMove(g, C.parseMove(g, C.parseSquare("e1"), C.parseSquare("g1")));
  assert.equal(g.board[C.parseSquare("g1")], "K");
  assert.equal(g.board[C.parseSquare("f1")], "R");
  assert.equal(g.board[C.parseSquare("h1")], null);
});

test("الترقية في SAN", () => {
  const g = C.fromFEN("8/P7/8/8/8/8/8/K6k w - - 0 1");
  assert.equal(C.legalMoves(g).filter((m) => m.from === C.parseSquare("a7")).length, 4);
  const m = C.legalMoves(g).find((x) => x.promo === "Q" && x.to === C.parseSquare("a8"));
  assert.ok(m);
  assert.equal(C.moveToSAN(g, m), "a8=Q+");
});

test("الأخذ بالتجاوز", () => {
  const g = C.fromFEN("8/8/8/4Pp2/8/8/8/K6k w - f6 0 2");
  const ep = C.legalMoves(g).find((m) => m.ep);
  assert.ok(ep, "يجب توليد حركة أخذ بالتجاوز");
  const undo = C.makeMove(g, ep);
  assert.equal(g.board[C.parseSquare("f6")], "P");
  assert.equal(g.board[C.parseSquare("f5")], null);
  assert.equal(g.board[C.parseSquare("e5")], null);
  C.unmakeMove(g, undo);
  assert.equal(g.board[C.parseSquare("f5")], "p");
  assert.equal(g.board[C.parseSquare("e5")], "P");
});

test("كش مات وستالمنت", () => {
  const mate = C.fromFEN("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");
  const s1 = C.status(mate);
  assert.equal(s1.over, true);
  assert.equal(s1.reason, "checkmate");
  assert.equal(s1.result, "1-0");

  const stale = C.fromFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  const s2 = C.status(stale);
  assert.equal(s2.over, true);
  assert.equal(s2.reason, "stalemate");
  assert.equal(s2.result, "1/2-1/2");
});

test("تعادل المواد", () => {
  assert.equal(C.insufficientMaterial(C.fromFEN("8/8/8/8/8/8/4k3/4K3 w - - 0 1")), true);
  assert.equal(C.insufficientMaterial(C.fromFEN("8/8/8/8/8/8/4k3/4KB2 w - - 0 1")), true);
  assert.equal(C.insufficientMaterial(C.fromFEN("8/8/8/8/8/8/4k3/4KN2 w - - 0 1")), true);
  assert.equal(C.insufficientMaterial(C.fromFEN("8/8/8/8/8/8/4k3/4KR2 w - - 0 1")), false);
});

test("FEN ذهاب وعودة", () => {
  const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
  assert.equal(C.toFEN(C.fromFEN(fen)), fen);
});

test("الحركات الشرعية لا تترك الملك في كش", () => {
  const g = C.fromFEN("4k3/8/8/8/8/8/4r3/4K3 w - - 0 1");
  const moves = C.legalMoves(g);
  for (const m of moves) {
    const undo = C.makeMove(g, m);
    assert.equal(C.inCheck(g, "w"), false);
    C.unmakeMove(g, undo);
  }
});
