/* Stockfish UCI Worker - Real Engine */
let engine = null;
let ready = false;
let pendingSearch = null;
let currentId = null;

function init() {
  try {
    if (typeof importScripts === 'function') {
      try { importScripts('stockfish.js'); } catch(e) {}
    }
    
    if (typeof STOCKFISH === 'function') {
      engine = STOCKFISH();
    } else if (typeof Stockfish === 'function') {
      engine = Stockfish();
    } else if (typeof Module !== 'undefined' && Module) {
      engine = Module;
    }
  } catch(e) {
    engine = null;
  }
  
  if (!engine) {
    return;
  }
  
  engine.onmessage = function(msg) {
    let line = '';
    if (typeof msg === 'string') line = msg;
    else if (msg && msg.data) line = typeof msg.data === 'string' ? msg.data : String(msg.data);
    else return;
    
    if (line.indexOf('uciok') !== -1) {
      ready = true;
      if (pendingSearch) {
        const p = pendingSearch;
        pendingSearch = null;
        doSearch(p);
      }
      return;
    }
    
    if (line.indexOf('bestmove') !== -1) {
      const parts = line.split(/\s+/);
      const bm = parts[1];
      if (!bm || bm === '(none)') {
        self.postMessage({ type: 'result', id: currentId, ok: false });
        currentId = null;
        return;
      }
      const from = bm.substr(0,2);
      const to = bm.substr(2,4);
      const promo = bm.length > 4 ? bm[4].toLowerCase() : null;
      
      function sqToIdx(sq) {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1], 10);
        return (rank << 4) | file;
      }
      
      self.postMessage({
        type: 'result',
        id: currentId,
        ok: true,
        move: { from: sqToIdx(from), to: sqToIdx(to), promo: promo ? promo.toUpperCase() : null }
      });
      currentId = null;
      return;
    }
  };
  
  try {
    engine.postMessage('uci');
    engine.postMessage('isready');
  } catch(e) {}
}

function doSearch(data) {
  if (!engine) {
    self.postMessage({ type: 'result', id: data.id, ok: false });
    return;
  }
  currentId = data.id;
  const opts = data.options || {};
  const elo = opts.elo || 1000;
  
  try {
    engine.postMessage('setoption name UCI_LimitStrength value true');
    engine.postMessage('setoption name UCI_Elo value ' + Math.max(100, Math.min(3600, elo)));
    
    if (typeof opts.skill === 'number') {
      engine.postMessage('setoption name Skill Level value ' + Math.max(0, Math.min(20, opts.skill)));
    }
  } catch(e) {}
  
  try {
    engine.postMessage('ucinewgame');
    engine.postMessage('position fen ' + data.fen);
    
    if (opts.movetime) {
      engine.postMessage('go movetime ' + opts.movetime);
    } else if (opts.depth) {
      engine.postMessage('go depth ' + opts.depth);
    } else {
      engine.postMessage('go movetime 1000');
    }
  } catch(e) {
    self.postMessage({ type: 'result', id: data.id, ok: false });
  }
}

self.onmessage = function(e) {
  const data = e.data || {};
  if (data.type === 'search') {
    if (!engine) init();
    if (!ready) {
      pendingSearch = data;
      return;
    }
    doSearch(data);
  } else if (data.type === 'stop') {
    try { if (engine) engine.postMessage('stop'); } catch(e) {}
  }
};

init();
