/* =========================================================
   Chess AI Worker — تشغيل البحث في خيط منفصل
   ========================================================= */
/* global importScripts, self, Chess, ChessAI */
importScripts("engine.js", "ai.js");

self.onmessage = function (event) {
  const data = event.data || {};
  if (!data || data.type !== "search") return;

  const C = self.Chess;
  const AI = self.ChessAI;
  const id = data.id;

  try {
    const state = C.fromFEN(data.fen);
    const result = AI.search(state, data.options || {});

    if (!result) {
      self.postMessage({ type: "result", id, ok: true, result: null });
      return;
    }

    self.postMessage({
      type: "result",
      id,
      ok: true,
      result: {
        from: result.move.from,
        to: result.move.to,
        promo: result.move.promo || null,
        castle: result.move.castle || null,
        ep: !!result.move.ep,
        score: result.score,
        depth: result.depth,
        nodes: result.nodes,
        time: result.time,
      },
    });
  } catch (err) {
    self.postMessage({
      type: "result",
      id,
      ok: false,
      error: err && err.message ? err.message : "search failed",
    });
  }
};
