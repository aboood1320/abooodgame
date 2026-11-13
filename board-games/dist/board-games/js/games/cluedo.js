/* ==========================================================================
   كلودو — قصر الجريمة
   محرّك تحقيق كامل: شبكة ممرات، اقتراح ودحض سرّي، مفكرة تحقيق تفاعلية،
   ذكاء اصطناعي استنتاجي بثلاثة مستويات، سجل لعب، وأونلاين متزامن.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;
  const ART = window.BGCluedoArt || null;
  const E = (value) => U.escape(String(value == null ? "" : value));

  const PCOLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d", "#b98cd9", "#f0a35e"];
  const LEVEL_NAMES = { easy: "سهل", normal: "متوسط", hard: "صعب", expert: "خبير" };

  /* المستوى الخبير يستخدم منطق «الصعب» في الاستنتاج والاتهام، لا منطق «السهل». */
  function difficulty(player) {
    const level = AI.level(player && player.level);
    return level === "expert" ? "hard" : level;
  }

  /* ------------------------------ الغرف ------------------------------ */

  const ROOMS = [
    { id: "kitchen", name: "المطبخ", short: "المطبخ", icon: "🍳", x: 0, y: 0, color: "#d9a05b", passage: "study" },
    { id: "ballroom", name: "قاعة الرقص", short: "الرقص", icon: "💃", x: 1, y: 0, color: "#c98bb5" },
    { id: "conservatory", name: "الدفيئة", short: "الدفيئة", icon: "🌿", x: 2, y: 0, color: "#78b98c", passage: "lounge" },
    { id: "dining", name: "غرفة الطعام", short: "الطعام", icon: "🍽️", x: 0, y: 1, color: "#c98383" },
    { id: "billiard", name: "غرفة البلياردو", short: "البلياردو", icon: "🎱", x: 1, y: 1, color: "#7aa7c7" },
    { id: "library", name: "المكتبة", short: "المكتبة", icon: "📚", x: 2, y: 1, color: "#a48bc7" },
    { id: "lounge", name: "الصالة", short: "الصالة", icon: "🛋️", x: 0, y: 2, color: "#d1b072", passage: "conservatory" },
    { id: "hall", name: "البهو", short: "البهو", icon: "🏛️", x: 1, y: 2, color: "#8fb6a7" },
    { id: "study", name: "المكتب", short: "المكتب", icon: "🖋️", x: 2, y: 2, color: "#9aa6b8", passage: "kitchen" },
  ];

  const ROOM_BY_ID = {};
  ROOMS.forEach((room) => { ROOM_BY_ID[room.id] = room; });

  const ROOM_EDGES = [
    ["kitchen", "ballroom"], ["ballroom", "conservatory"],
    ["dining", "billiard"], ["billiard", "library"],
    ["lounge", "hall"], ["hall", "study"],
    ["kitchen", "dining"], ["ballroom", "billiard"], ["conservatory", "library"],
    ["dining", "lounge"], ["billiard", "hall"], ["library", "study"],
  ];

  const SECRET_PASSAGES = [["kitchen", "study"], ["conservatory", "lounge"]];

  /* شبكة الممرات: 4×4 عقد بين الغرف. الانتقال بين غرفتين = خروج + ممرات + دخول. */
  const HALL_N = 4;
  const ROOM_DOORS = {
    kitchen: [[0, 0], [1, 0], [0, 1], [1, 1]],
    ballroom: [[1, 0], [2, 0], [1, 1], [2, 1]],
    conservatory: [[2, 0], [3, 0], [2, 1], [3, 1]],
    dining: [[0, 1], [1, 1], [0, 2], [1, 2]],
    billiard: [[1, 1], [2, 1], [1, 2], [2, 2]],
    library: [[2, 1], [3, 1], [2, 2], [3, 2]],
    lounge: [[0, 2], [1, 2], [0, 3], [1, 3]],
    hall: [[1, 2], [2, 2], [1, 3], [2, 3]],
    study: [[2, 2], [3, 2], [2, 3], [3, 3]],
  };

  function hallKey(row, col) { return "h:" + row + "," + col; }

  const CORRIDOR = new Map();
  function corridorLink(a, b) {
    if (!CORRIDOR.has(a)) CORRIDOR.set(a, []);
    if (!CORRIDOR.has(b)) CORRIDOR.set(b, []);
    if (!CORRIDOR.get(a).includes(b)) CORRIDOR.get(a).push(b);
    if (!CORRIDOR.get(b).includes(a)) CORRIDOR.get(b).push(a);
  }
  for (let row = 0; row < HALL_N; row++) {
    for (let col = 0; col < HALL_N; col++) {
      const key = hallKey(row, col);
      if (!CORRIDOR.has(key)) CORRIDOR.set(key, []);
      if (col + 1 < HALL_N) corridorLink(key, hallKey(row, col + 1));
      if (row + 1 < HALL_N) corridorLink(key, hallKey(row + 1, col));
    }
  }
  ROOMS.forEach((room) => {
    (ROOM_DOORS[room.id] || []).forEach((door) => corridorLink(room.id, hallKey(door[0], door[1])));
  });
  SECRET_PASSAGES.forEach((pair) => corridorLink(pair[0], pair[1]));

  function corridorNeighbors(node) { return CORRIDOR.get(node) || []; }

  /* ------------------------------ البطاقات ------------------------------ */

  const SUSPECTS = [
    { id: "scarlett", name: "ميس سكارليت", icon: "👩", color: "#e05a6b" },
    { id: "mustard", name: "الكولونيل موستارد", icon: "🧔", color: "#d8a63f" },
    { id: "white", name: "السيدة وايت", icon: "👵", color: "#cfd8e0" },
    { id: "green", name: "القس غرين", icon: "👨", color: "#4f9d6d" },
    { id: "peacock", name: "السيدة بيكوك", icon: "👩‍🦳", color: "#4f7fb5" },
    { id: "plum", name: "البروفيسور بلوم", icon: "👨‍🏫", color: "#8d6bb5" },
  ];

  const WEAPONS = [
    { id: "candlestick", name: "الشمعدان", icon: "🕯️", color: "#d9a05b" },
    { id: "dagger", name: "الخنجر", icon: "🗡️", color: "#c98383" },
    { id: "pipe", name: "أنبوب الرصاص", icon: "⚙️", color: "#9aa6b8" },
    { id: "revolver", name: "المسدس", icon: "🔫", color: "#7aa7c7" },
    { id: "rope", name: "الحبل", icon: "🪢", color: "#d1b072" },
    { id: "wrench", name: "مفتاح الربط", icon: "🔧", color: "#78b98c" },
  ];

  const CATS = { s: SUSPECTS, w: WEAPONS, r: ROOMS };
  const CAT_NAMES = { s: "المشتبه بهم", w: "الأسلحة", r: "الغرف" };
  const CAT_SINGLE = { s: "مشتبه به", w: "سلاح", r: "غرفة" };
  const CAT_ORDER = ["s", "w", "r"];

  const CARD_MAP = {};
  Object.keys(CATS).forEach((cat) => {
    CATS[cat].forEach((item) => {
      CARD_MAP[cat + ":" + item.id] = Object.assign({}, item, {
        cat,
        cardId: cat + ":" + item.id,
        catName: CAT_NAMES[cat],
      });
    });
  });

  function cardOf(id) { return CARD_MAP[id] || null; }
  function cardName(id) { const card = cardOf(id); return card ? card.name : String(id || ""); }
  function fullDeck() {
    const deck = [];
    CAT_ORDER.forEach((cat) => CATS[cat].forEach((item) => deck.push(cat + ":" + item.id)));
    return deck;
  }

  function categoryCards(cat) { return CATS[cat].map((item) => cat + ":" + item.id); }

  /* ------------------------------ الرسومات ------------------------------ */

  function artCard(id) {
    const card = cardOf(id);
    if (!card || !ART) return "";
    try { return ART.cardArt(card.id, card.cat, card.color) || ""; } catch (err) { return ""; }
  }

  function artRoom(id) {
    if (!ART) return "";
    try { return ART.roomScene(id) || ""; } catch (err) { return ""; }
  }

  function artEnvelope() {
    if (!ART) return "";
    try { return ART.envelope() || ""; } catch (err) { return ""; }
  }

  function artBack() {
    if (!ART) return "";
    try { return ART.cardBack() || ""; } catch (err) { return ""; }
  }

  /* ------------------------------ مراجع الحالة ------------------------------ */

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let localNotes = null;
  let notesKeyCache = "";
  let autoCache = null;
  let pendingMove = null;
  let resolving = false;
  let lastViewer = -2;

  function isOnline() { return !!(apiRef && apiRef.net && apiRef.net.enabled); }

  function viewerSeat() {
    if (!state) return -1;
    if (isOnline()) return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
    return state.current;
  }

  function viewerPlayer() {
    const index = viewerSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function cur() { return state && state.players[state.current] ? state.players[state.current] : null; }
  function isCpu(player) { return !!(player && player.cpu); }

  function localTurn() {
    if (!state || state.over || state.busy) return false;
    if (isOnline()) {
      if (apiRef.net.boot) return false;
      return state.current === apiRef.net.seat && !apiRef.net.isCpuSeat(state.current);
    }
    return !isCpu(cur());
  }

  function canAct() { return localTurn() && !state.over; }
  function activePlayers() { return state.players.filter((player) => player.active); }

  /* ------------------------------ الحركة ------------------------------ */

  function distances(from) {
    const dist = {};
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
      const node = queue.shift();
      if (node !== from && node.indexOf("h:") !== 0) continue;
      corridorNeighbors(node).forEach((next) => {
        if (dist[next] == null) {
          dist[next] = dist[node] + 1;
          queue.push(next);
        }
      });
    }
    return dist;
  }

  function reachableRooms() {
    if (!state || state.over || state.phase !== "move") return [];
    const player = cur();
    if (!player) return [];
    const dist = distances(player.room);
    return ROOMS
      .filter((room) => dist[room.id] != null && dist[room.id] > 0 && dist[room.id] <= state.steps)
      .map((room) => ({ id: room.id, steps: dist[room.id] }))
      .sort((a, b) => a.steps - b.steps || ROOM_BY_ID[a.id].name.localeCompare(ROOM_BY_ID[b.id].name, "ar"));
  }

  function matchesFor(player, combo) {
    if (!player || !combo) return [];
    return player.hand.filter((id) => id === combo.s || id === combo.w || id === combo.r);
  }

  function nextOrder(startIndex) {
    const order = [];
    for (let step = 1; step < state.players.length; step++) {
      order.push(state.players[(startIndex + step) % state.players.length]);
    }
    return order;
  }

  /* ------------------------------ مفكرة المحقق المحلية ------------------------------ */

  function notesScope() {
    const base = isOnline() ? "net:" + (apiRef.net.roomCode || "room") : "solo";
    return base + ":" + (state && state.startedAt ? state.startedAt : 0);
  }

  function notesKeyFor(seat) { return "cluedo.notes.v2." + notesScope() + ":" + seat; }

  function blankNotes() {
    return { v: 2, manual: {}, reveals: [], updated: 0 };
  }

  function loadNotes(seat) {
    const key = notesKeyFor(seat);
    const raw = BG.store.get(key, null);
    const notes = raw && typeof raw === "object" ? raw : blankNotes();
    notes.manual = notes.manual && typeof notes.manual === "object" ? notes.manual : {};
    notes.reveals = Array.isArray(notes.reveals) ? notes.reveals : [];
    notes.v = 2;
    localNotes = notes;
    notesKeyCache = key;
    autoCache = null;
  }

  function saveNotes() {
    if (!localNotes || !notesKeyCache) return;
    localNotes.updated = Date.now();
    if (localNotes.reveals.length > 80) localNotes.reveals = localNotes.reveals.slice(-80);
    BG.store.set(notesKeyCache, localNotes);
  }

  function ensureNotes() {
    if (!state) return;
    const seat = viewerSeat();
    if (seat < 0) {
      localNotes = null;
      notesKeyCache = "";
      autoCache = null;
      return;
    }
    const key = notesKeyFor(seat);
    if (key !== notesKeyCache) {
      saveNotes();
      loadNotes(seat);
    }
    if (lastViewer !== seat) {
      lastViewer = seat;
      autoCache = null;
    }
  }

  function invalidateNotes() {
    autoCache = null;
    saveNotes();
  }

  function notesAuto() {
    if (autoCache) return autoCache;
    const out = {};
    const seat = viewerSeat();
    if (!state || seat < 0 || !state.players[seat] || !localNotes) {
      autoCache = out;
      return out;
    }
    const me = state.players[seat];
    const set = (key, value) => {
      if (out[key] == null) out[key] = value;
    };
    me.hand.forEach((id) => {
      set("p" + seat + "|" + id, 1);
      state.players.forEach((player) => {
        if (player.index !== seat) set("p" + player.index + "|" + id, -1);
      });
      set("env|" + id, -1);
    });
    localNotes.reveals.forEach((reveal) => {
      if (!reveal || !reveal.combo) return;
      const combo = reveal.combo;
      const cards = [combo.s, combo.w, combo.r].filter(Boolean);
      if (reveal.none) {
        state.players.forEach((player) => {
          if (player.index === seat) return;
          cards.forEach((id) => set("p" + player.index + "|" + id, -1));
        });
        cards.forEach((id) => {
          if (me.hand.indexOf(id) === -1) set("env|" + id, 1);
        });
      } else if (reveal.card) {
        if (Array.isArray(reveal.before)) {
          reveal.before.forEach((pi) => {
            cards.forEach((id) => set("p" + pi + "|" + id, -1));
          });
        }
        state.players.forEach((player) => {
          if (player.index !== reveal.refuter) set("p" + player.index + "|" + reveal.card, -1);
        });
        set("p" + reveal.refuter + "|" + reveal.card, 1);
        set("env|" + reveal.card, -1);
      }
    });
    autoCache = out;
    return out;
  }

  function cellKey(cardId, col) { return (col === "env" ? "env" : "p" + col) + "|" + cardId; }

  function cellValue(cardId, col, auto) {
    const key = cellKey(cardId, col);
    if (localNotes && (localNotes.manual[key] === 1 || localNotes.manual[key] === -1)) return localNotes.manual[key];
    return (auto && auto[key]) || 0;
  }

  function cycleCell(cardId, col) {
    if (!localNotes || !state || state.over) return;
    const key = cellKey(cardId, col);
    const current = localNotes.manual[key] === 1 || localNotes.manual[key] === -1 ? localNotes.manual[key] : 0;
    localNotes.manual[key] = current === 0 ? 1 : current === 1 ? -1 : 0;
    autoCache = null;
    saveNotes();
  }

  function strikeFromEnvelope(cardId) {
    if (!localNotes) return;
    localNotes.manual["env|" + cardId] = -1;
    autoCache = null;
    saveNotes();
  }

  function resetManualMarks() {
    if (!localNotes) return;
    localNotes.manual = {};
    autoCache = null;
    saveNotes();
  }

  function revealFor(logId) {
    if (!localNotes) return null;
    for (let i = localNotes.reveals.length - 1; i >= 0; i--) {
      if (localNotes.reveals[i] && localNotes.reveals[i].id === logId) return localNotes.reveals[i];
    }
    return null;
  }

  function recordReveal(entryId, data) {
    ensureNotes();
    if (!localNotes) return;
    localNotes.reveals = localNotes.reveals.filter((item) => item && item.id !== entryId);
    localNotes.reveals.push(Object.assign({ id: entryId, at: Date.now() }, data));
    autoCache = null;
    saveNotes();
  }

  /* ------------------------------ سجل اللعب ------------------------------ */

  function pushLog(entry) {
    if (!state) return null;
    state.logSeq = (state.logSeq || 0) + 1;
    const item = Object.assign({ id: "l" + state.logSeq, at: Date.now() }, entry);
    state.log.push(item);
    if (state.log.length > 60) state.log = state.log.slice(-60);
    return item;
  }

  /* ------------------------------ عقول الكمبيوتر ------------------------------ */

  function initBrain(player, count) {
    player.known = [];
    player.envelopeKnown = [];
    player.constraints = [];
    player.seenBy = [];
    player.notHeld = [];
    for (let i = 0; i < count; i++) {
      player.seenBy.push([]);
      player.notHeld.push([]);
    }
  }

  function brainPrepare(player) {
    if (!state || !player) return;
    if (!player.seenBy || !player.notHeld) initBrain(player, state.players.length);
    player.seenBy[player.index] = player.hand.slice();
    player.known = player.hand.slice();
    player.notHeld[player.index] = [];
    state.players.forEach((other) => {
      if (other.index !== player.index) player.notHeld[other.index] = player.hand.slice();
    });
    brainSolve(player);
  }

  function brainMarkNotHeld(player, seat, cards) {
    if (!player || !Array.isArray(cards) || !player.notHeld[seat]) return;
    cards.forEach((id) => {
      if (player.notHeld[seat].indexOf(id) === -1) player.notHeld[seat].push(id);
    });
  }

  function brainEnvAdd(player, cardId) {
    if (!cardId || player.envelopeKnown.indexOf(cardId) !== -1) return false;
    const cat = cardId.charAt(0);
    if (player.envelopeKnown.some((id) => id.charAt(0) === cat)) return false;
    player.envelopeKnown.push(cardId);
    if (state) {
      state.players.forEach((other) => {
        if (other.index !== player.index) brainMarkNotHeld(player, other.index, [cardId]);
      });
    }
    return true;
  }

  function brainMarkHeld(player, holder, cardId) {
    if (!player || !cardId || !player.seenBy[holder]) return;
    if (player.seenBy[holder].indexOf(cardId) === -1) player.seenBy[holder].push(cardId);
    if (player.known.indexOf(cardId) === -1) player.known.push(cardId);
    player.envelopeKnown = player.envelopeKnown.filter((id) => id !== cardId);
    state.players.forEach((other) => {
      if (other.index !== holder) brainMarkNotHeld(player, other.index, [cardId]);
    });
    brainSolve(player);
  }

  function brainSolve(player) {
    if (!state || !player) return;
    let guard = 0;
    let changed = true;
    while (changed && guard < 40) {
      changed = false;
      guard += 1;
      (player.constraints || []).forEach((constraint) => {
        const remain = constraint.cards.filter((id) => player.notHeld[constraint.p].indexOf(id) === -1);
        if (!remain.length) {
          constraint.dead = true;
        } else if (remain.some((id) => player.seenBy[constraint.p].indexOf(id) !== -1)) {
          constraint.dead = true;
        } else if (remain.length === 1) {
          constraint.dead = true;
          const cardId = remain[0];
          if (player.seenBy[constraint.p].indexOf(cardId) === -1) player.seenBy[constraint.p].push(cardId);
          if (player.known.indexOf(cardId) === -1) player.known.push(cardId);
          player.envelopeKnown = player.envelopeKnown.filter((id) => id !== cardId);
          state.players.forEach((other) => {
            if (other.index !== constraint.p) brainMarkNotHeld(player, other.index, [cardId]);
          });
          changed = true;
        }
      });
      player.constraints = (player.constraints || []).filter((constraint) => !constraint.dead);

      fullDeck().forEach((id) => {
        if (player.hand.indexOf(id) !== -1) return;
        if (player.seenBy.some((list) => list.indexOf(id) !== -1)) return;
        const others = state.players.filter((other) => other.index !== player.index);
        if (others.length && others.every((other) => player.notHeld[other.index].indexOf(id) !== -1)) {
          if (brainEnvAdd(player, id)) changed = true;
        }
      });

      CAT_ORDER.forEach((cat) => {
        if (player.envelopeKnown.some((id) => id.charAt(0) === cat)) return;
        const unknown = categoryCards(cat).filter((id) =>
          player.hand.indexOf(id) === -1 &&
          !player.seenBy.some((list) => list.indexOf(id) !== -1) &&
          player.envelopeKnown.indexOf(id) === -1
        );
        if (unknown.length === 1 && brainEnvAdd(player, unknown[0])) changed = true;
      });
    }
    player.constraints = (player.constraints || []).slice(-30);
  }

  function brainLearnSuggestion(player, combo, refuter, shown, before) {
    if (!player || !isCpu(player)) return;
    const cards = [combo.s, combo.w, combo.r].filter(Boolean);
    if (refuter) {
      (before || []).forEach((pi) => brainMarkNotHeld(player, pi, cards));
      if (shown) {
        brainMarkHeld(player, refuter.index, shown);
      } else {
        player.constraints.push({ p: refuter.index, cards });
        brainSolve(player);
      }
    } else {
      state.players.forEach((other) => {
        if (other.index !== player.index) brainMarkNotHeld(player, other.index, cards);
      });
      brainSolve(player);
    }
  }

  /* ------------------------------ بناء الحالة ------------------------------ */

  function buildPlayers(roster) {
    return roster.map((source, index) => ({
      index,
      name: source.name,
      type: source.type === "cpu" ? "cpu" : "human",
      cpu: source.type === "cpu" || source.isCpu === true,
      level: AI.level(source.level),
      color: PCOLORS[index % PCOLORS.length],
      hand: [],
      room: "hall",
      active: true,
    }));
  }

  function dealCase(players) {
    const envelope = {
      s: "s:" + U.pick(SUSPECTS).id,
      w: "w:" + U.pick(WEAPONS).id,
      r: "r:" + U.pick(ROOMS).id,
    };
    const reserved = [envelope.s, envelope.w, envelope.r];
    const deck = U.shuffle(fullDeck().filter((id) => reserved.indexOf(id) === -1));
    deck.forEach((id, index) => players[index % players.length].hand.push(id));
    players.forEach((player) => {
      initBrain(player, players.length);
    });
    return envelope;
  }

  /* ------------------------------ الدور والحركة ------------------------------ */

  function beginTurn(silent) {
    if (!state || state.over) return;
    const player = cur();
    if (!player) return;
    state.phase = "move";
    state.hasSuggested = false;
    state.busy = false;
    state.reachable = [];
    state.dice = [U.roll(6), U.roll(6)];
    state.steps = state.dice[0] + state.dice[1];
    state.reachable = reachableRooms();
    state.notice = "دور " + player.name + " — ارمِ النرد وحرّك قطعتك، أو قدّم اقتراحًا بعد الحركة.";
    if (apiRef) {
      apiRef.log(
        "<strong>" + E(player.name) + "</strong> رمى النرد: " + state.dice[0] + " + " + state.dice[1] + " = " + state.steps + " خطوة.",
        "accent"
      );
      apiRef.setStatus("دور " + AI.statusName(player), "live");
    }
    if (FX) {
      FX.sound(silent ? "dice" : "unlock");
      FX.after(() => {
        if (!rootRef) return;
        rootRef.querySelectorAll(".cluedo-die").forEach((die, index) => FX.hop(die, { delay: index * 55 }));
        const room = rootRef.querySelector('[data-room="' + player.room + '"]');
        if (room) FX.pulse(room);
      }, 45);
    }
    if (!silent && !player.cpu && (!isOnline() || player.index === apiRef.net.seat)) {
      FX.after(() => FX.banner("دورك — " + player.name, { icon: "🎲", duration: 1300 }), 180);
    }
    render();
  }

  function moveTo(roomId, byCpu) {
    if (!state || state.over || state.busy || state.phase !== "move") return;
    if (byCpu ? !isCpu(cur()) : !canAct()) return;
    const target = state.reachable.find((entry) => entry.id === roomId);
    if (!target) {
      BG.toast("هذه الغرفة خارج مدى النرد.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const player = cur();
    capturePawn(player.index);
    player.room = roomId;
    state.phase = "act";
    state.reachable = [];
    state.notice = "انتقل " + player.name + " إلى " + ROOM_BY_ID[roomId].name + ". يمكنك الاقتراح أو الاتهام، ثم إنهاء الدور.";
    if (apiRef) apiRef.log("<strong>" + E(player.name) + "</strong> انتقل إلى " + E(ROOM_BY_ID[roomId].name) + " (" + target.steps + " خطوة).", "");
    if (FX) {
      FX.sound("step");
      FX.after(() => FX.sound("move", { gain: 0.7 }), 120);
      FX.after(() => {
        if (!rootRef) return;
        const room = rootRef.querySelector('[data-room="' + roomId + '"]');
        if (room) { FX.pop(room); FX.floatText(room, "📍", "good"); }
      }, 150);
    }
    render();
  }

  function stay(byCpu) {
    if (!state || state.over || state.busy || state.phase !== "move") return;
    if (byCpu ? !isCpu(cur()) : !canAct()) return;
    const player = cur();
    state.phase = "act";
    state.reachable = [];
    state.notice = player.name + " بقي في " + ROOM_BY_ID[player.room].name + ".";
    if (FX) FX.sound("click");
    render();
  }

  function capturePawn(seat) {
    pendingMove = null;
    if (!rootRef) return;
    const el = rootRef.querySelector('[data-fx-piece="clu-p-' + seat + '"]');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    pendingMove = { seat, rect };
  }

  /* ------------------------------ الاقتراح ------------------------------ */

  function initialPick(cat, player) {
    const cards = categoryCards(cat).filter((id) => player.hand.indexOf(id) === -1 && player.known.indexOf(id) === -1);
    if (cards.length) return U.pick(cards);
    const pool = categoryCards(cat).filter((id) => player.hand.indexOf(id) === -1);
    return pool.length ? U.pick(pool) : categoryCards(cat)[0];
  }

  function openSuggestion() {
    if (!state || !canAct() || state.phase !== "act" || state.hasSuggested) return;
    const player = cur();
    const room = ROOM_BY_ID[player.room];
    const picked = { s: initialPick("s", player), w: initialPick("w", player) };
    const body = document.createElement("div");
    body.className = "cluedo-form cl-suggest-form";
    body.innerHTML =
      '<p class="cl-dialog-lead">الاقتراح يكون عن الغرفة التي تقف فيها فقط. اختر مشتبهًا وسلاحًا، وسيسأل النظام كل محقق على حدة.</p>' +
      '<div class="cl-fixed-card"><span class="cl-field-label">الغرفة المقترحة</span>' + smallCardHTML("r:" + room.id) + "</div>" +
      '<div class="cl-picker-block"><span class="cl-field-label">المشتبه به</span>' + pickerHTML("s", picked.s) + "</div>" +
      '<div class="cl-picker-block"><span class="cl-field-label">السلاح</span>' + pickerHTML("w", picked.w) + "</div>" +
      '<p class="cl-hint">اقتراح واحد لكل دور. أول محقق يملك بطاقة مطابقة يعرض عليك بطاقة واحدة فقط، سرًّا. الاقتراح يُنهي دورك.</p>';
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (!pick) return;
      const cat = pick.getAttribute("data-picker");
      if (cat !== "s" && cat !== "w") return;
      picked[cat] = pick.getAttribute("data-pick");
      body.querySelectorAll('[data-picker="' + cat + '"] [data-pick]').forEach((node) => {
        node.classList.toggle("is-selected", node.getAttribute("data-pick") === picked[cat]);
        node.setAttribute("aria-pressed", node.getAttribute("data-pick") === picked[cat] ? "true" : "false");
      });
      if (FX) FX.sound("click");
    });
    const dialog = BG.openDialog({
      title: "اقتراح في " + room.name,
      body,
      actions: [
        { label: "إلغاء", value: "" },
        {
          label: "قدّم الاقتراح",
          primary: true,
          onClick({ close }) {
            if (!picked.s || !picked.w) {
              BG.toast("اختر مشتبهًا وسلاحًا أولًا.", "warn");
              return;
            }
            close(JSON.stringify({ s: picked.s, w: picked.w, r: "r:" + room.id }));
          },
        },
      ],
      className: "cluedo-dialog cl-suggest-dialog",
    });
    dialog.promise.then((value) => {
      if (!value) return;
      let combo = null;
      try { combo = JSON.parse(value); } catch (err) { combo = null; }
      if (!combo) return;
      startSuggestion(player.index, combo);
    });
  }

  function startSuggestion(suggesterIndex, combo) {
    if (!state || state.over || state.hasSuggested || state.busy) return;
    if (state.current !== suggesterIndex || state.phase !== "act") return;
    const player = state.players[suggesterIndex];
    if (!player) return;
    state.hasSuggested = true;
    state.busy = true;
    const entry = pushLog({ t: "suggest", by: suggesterIndex, combo });
    state.lastSuggestion = { by: suggesterIndex, combo, logId: entry ? entry.id : "", refuter: null };
    state.notice = "اقتراح " + player.name + " قيد التحقق…";
    if (apiRef) {
      apiRef.log(
        "<strong>" + E(player.name) + "</strong> اقترح: " + E(cardName(combo.s)) + " في " +
        E(cardName(combo.r)) + " بواسطة " + E(cardName(combo.w)) + ".",
        "accent"
      );
    }
    if (FX) FX.sound("card");
    render();
    resolveSuggestion(suggesterIndex, combo, entry ? entry.id : "");
  }

  function promptLocalRefute(player, matches, suggester, combo) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "cluedo-refute";
      wrap.innerHTML =
        "<p>مرّر الجهاز إلى <strong>" + E(player.name) + "</strong> فقط. لا تفتح البطاقات إن كان غيرك يرى الشاشة.</p>" +
        '<div class="cluedo-locked"><button type="button" class="bg-btn primary">👁 إظهار بطاقاتي المطابقة</button></div>';
      const dialog = BG.openDialog({
        title: "دحض سرّي — " + player.name,
        body: wrap,
        actions: [{ label: "إلغاء", value: "" }],
        className: "cluedo-dialog cluedo-refute-dialog",
      });
      dialog.dialog.setAttribute("data-sync-keep", "1");
      wrap.querySelector(".cluedo-locked button").addEventListener("click", () => {
        wrap.innerHTML =
          "<p>لديك <strong>" + matches.length + "</strong> بطاقة مطابقة لاقتراح " + E(suggester.name) +
          ". اختر <strong>واحدة</strong> لتعرضها عليه وحدها:</p>" +
          '<div class="cluedo-refute-grid">' +
          matches.map((id) =>
            '<button type="button" class="cl-refute-pick" data-pick-card="' + E(id) + '" style="--cc:' + (cardOf(id) || {}).color + '">' +
            '<span class="cl-refute-art">' + artCard(id) + "</span>" +
            "<strong>" + E(cardName(id)) + "</strong>" +
            "<small>" + E((cardOf(id) || {}).catName || "") + "</small></button>"
          ).join("") +
          "</div>" +
          '<p class="cluedo-hint">البطاقات الأخرى تبقى سرّية. لا تُظهر أكثر من بطاقة واحدة.</p>';
        if (FX) FX.sound("reveal");
        wrap.querySelectorAll("[data-pick-card]").forEach((button) => {
          button.addEventListener("click", () => dialog.close(button.getAttribute("data-pick-card")));
        });
      });
      dialog.promise.then((value) => resolve(value || null));
    });
  }

  function askRefutation(player, matches, suggester, combo) {
    const net = apiRef && apiRef.net;
    const needsHost = !!(net && net.enabled && (net.isRemoteSeat(player.index) || (net.isCpuSeat(player.index) && !net.isHost)));
    if (needsHost) {
      return net.askRefutation(player.index, combo, suggester.name)
        .then((card) => card || U.pick(matches))
        .catch(() => U.pick(matches));
    }
    if (isCpu(player)) {
      if (FX) FX.sound("card");
      return Promise.resolve(cpuRefutePick(player, matches, combo));
    }
    return promptLocalRefute(player, matches, suggester, combo).then((card) => card || U.pick(matches));
  }

  async function resolveSuggestion(suggesterIndex, combo, logId) {
    if (!state) return;
    resolving = true;
    state.busy = true;
    render();
    const suggester = state.players[suggesterIndex];
    const order = nextOrder(suggesterIndex);
    let refuter = null;
    let shown = null;
    const before = [];
    try {
      for (const player of order) {
        const matches = matchesFor(player, combo);
        if (!matches.length) {
          before.push(player.index);
          continue;
        }
        refuter = player;
        shown = await askRefutation(player, matches, suggester, combo);
        if (!shown) shown = U.pick(matches);
        break;
      }
    } catch (err) {
      console.warn("cluedo refute", err);
    }
    if (!state) return;
    const beforeCopy = before.slice();
    if (refuter) {
      if (isCpu(suggester)) brainLearnSuggestion(suggester, combo, refuter, shown, beforeCopy);
      else if (suggesterIndex === viewerSeat()) {
        recordReveal(logId, shown
          ? { refuter: refuter.index, card: shown, before: beforeCopy, combo }
          : { refuter: refuter.index, none: true, combo });
      }
      state.notice = "انتهى اقتراح " + suggester.name + ".";
    } else {
      if (isCpu(suggester)) brainLearnSuggestion(suggester, combo, null, null, beforeCopy);
      else if (suggesterIndex === viewerSeat()) recordReveal(logId, { none: true, combo });
      state.notice = "انتهى اقتراح " + suggester.name + ".";
    }
    if (suggesterIndex === viewerSeat() && !isCpu(suggester)) {
      render();
      if (refuter && shown) {
        await BG.revealSecret({
          title: "بطاقة الدحض",
          hint: isOnline()
            ? "اضغط لإظهار البطاقة التي أظهرها لك " + refuter.name + ". لا يراها بقية المحققين."
            : "مرّر الجهاز إلى " + suggester.name + " ثم اضغط لإظهار البطاقة. لا يراها بقية المحققين.",
          owner: suggester.name,
          content: cardShowcaseHTML(shown, { compact: true, note: refuter.name + " دحض اقتراحك بهذه البطاقة." }),
        });
      } else if (!refuter) {
        await BG.revealSecret({
          title: "نتيجة الاقتراح",
          hint: isOnline()
            ? "أنت وحدك ترى هذه النتيجة. اضغط لإظهارها."
            : "مرّر الجهاز إلى " + suggester.name + " ثم اضغط لإظهار النتيجة.",
          owner: suggester.name,
          content:
            '<div class="cl-reveal-none">' +
            '<div class="cl-reveal-none-art">' + artBack() + "</div>" +
            "<h3>لم يُظهر أحد بطاقة</h3>" +
            "<p>لا يملك أي محقق آخر أي بطاقة من اقتراحك. أحد عناصر الاقتراح قد يكون داخل ظرف القضية. سجّل ذلك في ورقة التحقيق.</p>" +
            "</div>",
        });
      }
    }
    if (!state) return;
    resolving = false;
    state.busy = false;
    state.hasSuggested = true;
    render();
    endTurn("suggest");
  }

  /* ------------------------------ الاتهام ------------------------------ */

  function openAccusation() {
    if (!state || !canAct() || state.over || state.phase === "over") return;
    const player = cur();
    const picked = {
      s: initialPick("s", player),
      w: initialPick("w", player),
      r: "r:" + player.room,
    };
    const body = document.createElement("div");
    body.className = "cluedo-form cl-accuse-form";
    body.innerHTML =
      '<p class="cluedo-warning">⚠️ الاتهام النهائي لا رجعة فيه. إن كان خاطئًا تخرج من التحقيق فورًا ويستمر الآخرون. إن كان صحيحًا تكشف ظرف القضية وتفوز.</p>' +
      '<div class="cl-picker-block"><span class="cl-field-label">الفاعل</span>' + pickerHTML("s", picked.s) + "</div>" +
      '<div class="cl-picker-block"><span class="cl-field-label">السلاح</span>' + pickerHTML("w", picked.w) + "</div>" +
      '<div class="cl-picker-block"><span class="cl-field-label">المكان</span>' + pickerHTML("r", picked.r) + "</div>" +
      '<p class="cl-hint">اختر العناصر الثلاثة التي تعتقد أنها في ظرف القضية. راجع ورقة التحقيق قبل التأكيد.</p>';
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (!pick) return;
      const cat = pick.getAttribute("data-picker");
      if (!CATS[cat]) return;
      picked[cat] = pick.getAttribute("data-pick");
      body.querySelectorAll('[data-picker="' + cat + '"] [data-pick]').forEach((node) => {
        node.classList.toggle("is-selected", node.getAttribute("data-pick") === picked[cat]);
        node.setAttribute("aria-pressed", node.getAttribute("data-pick") === picked[cat] ? "true" : "false");
      });
      if (FX) FX.sound("click");
    });
    const dialog = BG.openDialog({
      title: "الاتهام النهائي",
      body,
      actions: [
        { label: "تراجع", value: "" },
        {
          label: "أتّهم الآن",
          danger: true,
          onClick({ close }) {
            if (!picked.s || !picked.w || !picked.r) {
              BG.toast("اختر العناصر الثلاثة أولًا.", "warn");
              return;
            }
            close(JSON.stringify(picked));
          },
        },
      ],
      className: "cluedo-dialog cluedo-accuse-dialog",
    });
    dialog.promise.then((value) => {
      if (!value) return;
      let combo = null;
      try { combo = JSON.parse(value); } catch (err) { combo = null; }
      if (!combo) return;
      resolveAccusation(combo, player.index);
    });
  }

  function resolveAccusation(combo, byIndex) {
    if (!state || state.over) return;
    if (state.current !== byIndex) return;
    const player = state.players[byIndex];
    if (!player || !player.active) return;
    state.busy = true;
    const env = state.envelope;
    const correct = combo.s === env.s && combo.w === env.w && combo.r === env.r;
    state.lastAccusation = { by: byIndex, combo, correct };
    pushLog({ t: "accuse", by: byIndex, combo, correct });
    if (apiRef) {
      apiRef.log(
        "<strong>" + E(player.name) + "</strong> اتهم: " + E(cardName(combo.s)) + " في " +
        E(cardName(combo.r)) + " بـ" + E(cardName(combo.w)) + ".",
        correct ? "good" : "warn"
      );
    }
    if (correct) {
      state.notice = "فُتح ظرف القضية! " + player.name + " هو المحقق الفائز.";
      if (FX) {
        FX.sound("unlock");
        FX.after(() => FX.sound("win"), 220);
      }
      state.busy = false;
      if (byIndex === viewerSeat()) FX.after(() => FX.banner("فُتح ظرف القضية", { icon: "✉️", tone: "good" }), 160);
      endGame(byIndex, "solved");
      return;
    }
    player.active = false;
    state.notice = "اتهام خاطئ! خرج " + player.name + " من التحقيق، لكنه يبقى مطالبًا بدحض الاقتراحات.";
    if (apiRef) apiRef.log("الاتهام كان خاطئًا — <strong>" + E(player.name) + "</strong> خارج التحقيق.", "warn");
    if (FX) FX.sound("lose");
    if (apiRef) apiRef.setStatus(player.name + " مُقصى");
    state.busy = false;
    if (byIndex === viewerSeat()) BG.toast("اتهامك كان خاطئًا. أنت الآن خارج التحقيق.", "warn");
    const remaining = activePlayers();
    render();
    if (remaining.length <= 1) {
      endGame(remaining.length ? remaining[0].index : null, "last");
      return;
    }
    endTurn("accuse");
  }

  /* ------------------------------ نهاية الدور والنهاية ------------------------------ */

  function endTurn(reason) {
    if (!state || state.over) return;
    state.busy = false;
    const remaining = activePlayers();
    if (remaining.length <= 1) {
      endGame(remaining.length ? remaining[0].index : null, "last");
      return;
    }
    let index = state.current;
    let guard = 0;
    do {
      index = (index + 1) % state.players.length;
      guard += 1;
    } while (!state.players[index].active && guard <= state.players.length);
    state.current = index;
    state.turn += 1;
    state.phase = "move";
    state.hasSuggested = false;
    state.reachable = [];
    state.lastSuggestion = null;
    state.notice = "";
    beginTurn(true);
    if (reason === "accuse") state.notice = "بدأ دور " + state.players[index].name + " بعد إقصاء المحقق السابق.";
  }

  function endGame(winnerIndex, reason) {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    state.winner = winnerIndex;
    state.busy = false;
    resolving = false;
    state.reachable = [];
    const winner = winnerIndex != null ? state.players[winnerIndex] : null;
    const env = state.envelope;
    if (winner) {
      state.notice = reason === "solved"
        ? "أُغلقت القضية: " + winner.name + " حدّد الفاعل والسلاح والمكان بدقة."
        : "بقي " + winner.name + " وحده في التحقيق وفاز بالقضية.";
      if (apiRef) {
        apiRef.log(reason === "solved"
          ? "حُلّت القضية! <strong>" + E(winner.name) + "</strong> اتهم بشكل صحيح."
          : "<strong>" + E(winner.name) + "</strong> آخر محقق نشط — يفوز بالقضية.", "good");
      }
    } else {
      state.notice = "انتهى التحقيق دون محقق فائز.";
      if (apiRef) apiRef.log("انتهى التحقيق دون حل القضية.", "warn");
    }
    render();
    if (FX) FX.after(() => FX.win(), 180);
    if (apiRef) {
      apiRef.gameOver({
        icon: reason === "solved" ? "🔎" : "🏆",
        title: reason === "solved" ? "حُلّت القضية!" : "انتهى التحقيق",
        text:
          "ملابسات القضية كانت: <strong>" + E(cardName(env.s)) + "</strong> في <strong>" +
          E(cardName(env.r)) + "</strong> بواسطة <strong>" + E(cardName(env.w)) + "</strong>." +
          (reason === "last" ? " أُعلنت النتيجة بعد إقصاء بقية المحققين." : ""),
        winner: winner ? winner.name : "لا فائز",
        standings: state.players.map((player) => ({
          name: player.name + (player.active ? " · نشط" : " · مُقصى"),
          value: player.index === winnerIndex ? "فائز" : player.hand.length + " بطاقة",
        })),
      });
    }
  }

  /* ------------------------------ ذكاء الكمبيوتر ------------------------------ */

  function unknownPool(player, cat) {
    return categoryCards(cat).filter((id) =>
      player.hand.indexOf(id) === -1 &&
      player.envelopeKnown.indexOf(id) === -1 &&
      !player.seenBy.some((list) => list.indexOf(id) !== -1)
    );
  }

  function holderCount(player, cardId) {
    if (player.hand.indexOf(cardId) !== -1) return 0;
    if (player.seenBy.some((list) => list.indexOf(cardId) !== -1)) return 0;
    return state.players.filter((other) =>
      other.index !== player.index && player.notHeld[other.index].indexOf(cardId) === -1
    ).length;
  }

  function cpuRefutePick(player, matches, combo) {
    const level = difficulty(player);
    if (!matches.length) return null;
    if (level === "easy") return U.pick(matches);
    const rooms = matches.filter((id) => id.charAt(0) === "r");
    const weapons = matches.filter((id) => id.charAt(0) === "w");
    const suspects = matches.filter((id) => id.charAt(0) === "s");
    if (level === "hard") {
      if (rooms.length) return U.pick(rooms);
      if (weapons.length) return U.pick(weapons);
      return U.pick(suspects.length ? suspects : matches);
    }
    return U.pick(rooms.length ? rooms : matches);
  }

  function cpuAccusation(player) {
    if (!player || !player.active || state.over) return null;
    brainSolve(player);
    const pick = {};
    const uncertain = [];
    let product = 1;
    CAT_ORDER.forEach((cat) => {
      const confirmed = player.envelopeKnown.filter((id) => id.charAt(0) === cat);
      if (confirmed.length) {
        pick[cat] = confirmed[0];
        return;
      }
      const pool = categoryCards(cat).filter((id) =>
        player.hand.indexOf(id) === -1 &&
        !player.seenBy.some((list) => list.indexOf(id) !== -1)
      );
      if (!pool.length) {
        pick[cat] = null;
        return;
      }
      if (pool.length === 1) {
        pick[cat] = pool[0];
        if (brainEnvAdd(player, pool[0])) brainSolve(player);
        return;
      }
      uncertain.push({ cat, pool });
      product *= pool.length;
    });
    if (pick.s && pick.w && pick.r && !uncertain.length) {
      return { s: pick.s, w: pick.w, r: pick.r };
    }
    const level = difficulty(player);
    const pressure = state.turn > 26;
    const canGuess = level === "hard"
      ? (product <= 2 && state.turn >= 5) || (product <= 4 && state.turn >= 10) || pressure
      : level === "normal"
        ? (product <= 2 && state.turn >= 10) || pressure
        : product <= 2 && state.turn >= 16;
    if (!canGuess || !uncertain.length) return null;
    if (level === "easy" && Math.random() > 0.35) return null;
    if (level === "normal" && Math.random() > 0.65) return null;
    uncertain.forEach((entry) => {
      pick[entry.cat] = U.pick(entry.pool);
    });
    if (!pick.s || !pick.w || !pick.r) return null;
    return { s: pick.s, w: pick.w, r: pick.r };
  }

  function cpuCombo(player) {
    const room = ROOM_BY_ID[player.room];
    if (!room) return null;
    if (player.envelopeKnown.some((id) => id.charAt(0) === "s") &&
        player.envelopeKnown.some((id) => id.charAt(0) === "w") &&
        player.envelopeKnown.some((id) => id.charAt(0) === "r")) return null;
    const roomId = "r:" + room.id;
    const roomUnknown = player.hand.indexOf(roomId) === -1 &&
      player.envelopeKnown.indexOf(roomId) === -1 &&
      !player.seenBy.some((list) => list.indexOf(roomId) !== -1);
    const sPool = unknownPool(player, "s");
    const wPool = unknownPool(player, "w");
    if (!sPool.length && !wPool.length && !roomUnknown) return null;

    const score = (id) => {
      const holders = holderCount(player, id);
      const ruledOut = state.players.filter((other) =>
        other.index !== player.index && player.notHeld[other.index].indexOf(id) !== -1
      ).length;
      return 1 + holders * 0.35 + ruledOut * 0.55;
    };
    const pickFrom = (pool, cat) => {
      if (!pool.length) {
        const fallback = categoryCards(cat).filter((id) => player.hand.indexOf(id) === -1);
        return fallback.length ? U.pick(fallback) : categoryCards(cat)[0];
      }
      return AI.choose(pool, score, player.level) || U.pick(pool);
    };
    return {
      s: pickFrom(sPool, "s"),
      w: pickFrom(wPool, "w"),
      r: roomId,
    };
  }

  function cpuSuggestionUseful(player) {
    if (player.envelopeKnown.some((id) => id.charAt(0) === "s") &&
        player.envelopeKnown.some((id) => id.charAt(0) === "w") &&
        player.envelopeKnown.some((id) => id.charAt(0) === "r")) return false;
    return unknownPool(player, "s").length > 0 || unknownPool(player, "w").length > 0 ||
      unknownPool(player, "r").indexOf("r:" + player.room) !== -1;
  }

  function cpuMoveChoice(player) {
    const currentRoom = ROOM_BY_ID[player.room];
    const options = state.reachable.map((entry) => ({
      id: entry.id,
      room: ROOM_BY_ID[entry.id],
      steps: entry.steps,
    }));
    if (currentRoom) options.push({ id: currentRoom.id, room: currentRoom, steps: 0 });
    if (!options.length) return null;
    const useful = cpuSuggestionUseful(player);
    return AI.choose(options, (option) => {
      const roomId = "r:" + option.id;
      const own = player.hand.indexOf(roomId) !== -1;
      const seen = player.seenBy.some((list) => list.indexOf(roomId) !== -1);
      const env = player.envelopeKnown.indexOf(roomId) !== -1;
      let value = 0;
      if (!own && !seen && !env) value = 9;
      else if (own) value = useful ? 6.5 : 4;
      else if (seen) value = 4.5;
      else value = 0.5;
      if (option.id === currentRoom.id) value += 0.8;
      value -= option.steps * 0.16;
      return value;
    }, player.level) || options[0];
  }

  function cpuDoSuggestion(player) {
    if (!state || state.over || state.busy) return;
    const combo = cpuCombo(player);
    if (!combo) {
      endTurn("manual");
      return;
    }
    startSuggestion(player.index, combo);
  }

  function cpuTakeTurn() {
    if (!state || state.over || state.busy || resolving) return;
    const player = cur();
    if (!player || !isCpu(player) || !player.active) return;
    if (!AI.autoAllowed(apiRef, player)) return;

    const accusation = cpuAccusation(player);
    if (accusation) {
      resolveAccusation(accusation, player.index);
      return;
    }

    if (state.phase === "move") {
      const choice = cpuMoveChoice(player);
      if (choice && choice.id !== player.room) moveTo(choice.id, true);
      else stay(true);
      return;
    }

    if (state.phase === "act") {
      if (!state.hasSuggested && cpuSuggestionUseful(player)) {
        cpuDoSuggestion(player);
      } else {
        endTurn("manual");
      }
    }
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over || state.busy || resolving) return;
    const player = cur();
    if (!player || !isCpu(player)) return;
    if (!AI.autoAllowed(apiRef, player)) return;
    aiRunner.later(() => {
      if (!state || state.over || state.busy || resolving) return;
      const active = cur();
      if (!active || !isCpu(active)) return;
      cpuTakeTurn();
    }, AI.delay(player.level, 1.05));
  }

  /* ------------------------------ مكوّنات البطاقات ------------------------------ */

  function smallCardHTML(id) {
    const card = cardOf(id);
    if (!card) return "";
    return '<span class="cl-small-card" style="--cc:' + card.color + '">' +
      '<span class="cl-small-art">' + artCard(id) + "</span>" +
      "<strong>" + E(card.name) + "</strong>" +
      "<small>" + E(card.catName) + "</small></span>";
  }

  function miniChipHTML(id) {
    const card = cardOf(id);
    if (!card) return "";
    return '<span class="cl-mini-chip" style="--cc:' + card.color + '">' +
      '<i aria-hidden="true">' + card.icon + "</i><span>" + E(card.name) + "</span></span>";
  }

  function cardTileHTML(id, opts) {
    const card = cardOf(id);
    if (!card) return "";
    const o = opts || {};
    return '<button type="button" class="cl-card-tile' + (o.mini ? " is-mini" : "") +
      '" style="--cc:' + card.color + '" data-card-zoom="' + E(id) + '" aria-label="' + E(card.name) + '">' +
      '<span class="cl-card-tile-art">' + artCard(id) + "</span>" +
      '<span class="cl-card-tile-copy"><strong>' + E(card.name) + "</strong>" +
      (o.mini ? "" : "<small>" + E(card.catName) + "</small>") + "</span></button>";
  }

  function pickerHTML(cat, selected) {
    return '<div class="cl-picker" data-picker="' + cat + '">' +
      categoryCards(cat).map((id) => {
        const card = cardOf(id);
        const on = id === selected;
        return '<button type="button" class="cl-pick' + (on ? " is-selected" : "") + '" data-picker="' + cat +
          '" data-pick="' + E(id) + '" style="--cc:' + card.color + '" aria-pressed="' + (on ? "true" : "false") + '">' +
          '<span class="cl-pick-art">' + artCard(id) + "</span>" +
          '<span class="cl-pick-name">' + E(card.name) + "</span></button>";
      }).join("") + "</div>";
  }

  function cardShowcaseHTML(id, opts) {
    const card = cardOf(id);
    if (!card) return "";
    const o = opts || {};
    const notes = {
      s: "وجهٌ من وجوه القصر. أين كان حين وقعت الجريمة؟",
      w: "أداة محتملة للجريمة. ابحث عنها في غرف القصر.",
      r: "مسرح محتمل للجريمة. الغرفة التي وقعت فيها الجريمة تختفي من التحقيق.",
    };
    return '<div class="cl-showcase' + (o.compact ? " is-compact" : "") + '" style="--cc:' + card.color + '">' +
      '<div class="cl-showcase-art">' + artCard(id) + "</div>" +
      '<div class="cl-showcase-copy"><span class="cl-showcase-kicker">' + E(card.catName) + "</span>" +
      "<h3>" + E(card.name) + "</h3>" +
      "<p>" + E(o.note || notes[card.cat] || "") + "</p></div></div>";
  }

  function playerName(seat) {
    const player = state && state.players[seat];
    return player ? player.name : "محقق";
  }

  function knownCardsFor(seat, auto) {
    if (!state) return [];
    if (seat === viewerSeat() && state.players[seat]) return state.players[seat].hand.slice();
    const marks = auto || notesAuto();
    return fullDeck().filter((id) => marks["p" + seat + "|" + id] === 1);
  }

  function logHTML() {
    if (!state || !state.log.length) {
      return '<p class="cluedo-empty">لا اقتراحات بعد. ادخل غرفة ثم اقترح مشتبهًا وسلاحًا.</p>';
    }
    const me = viewerSeat();
    return state.log.slice().reverse().slice(0, 24).map((entry) => {
      const by = state.players[entry.by];
      if (!by) return "";
      if (entry.t === "suggest") {
        let outcome = '<span class="cl-log-secret">🔒 نتيجة الدحض سرّية لصاحب الاقتراح</span>';
        if (entry.by === me && !by.cpu) {
          const reveal = revealFor(entry.id);
          if (!reveal) outcome = '<span class="cl-log-pending">⏳ لم تُسجّل النتيجة بعد</span>';
          else if (reveal.none) outcome = '<span class="cl-log-none">🙈 لم يُظهر أحد بطاقة</span>';
          else outcome = '<span class="cl-log-show">🃏 ' + E(playerName(reveal.refuter)) + " أظهر لك " + miniChipHTML(reveal.card) + "</span>";
        }
        return '<div class="cl-log-entry" style="--p:' + by.color + '">' +
          '<div class="cl-log-head"><span class="cl-log-dot">' + (by.index + 1) + "</span><strong>" + E(by.name) + "</strong><small>اقتراح</small></div>" +
          '<div class="cl-log-combo">' + miniChipHTML(entry.combo.s) + miniChipHTML(entry.combo.w) + miniChipHTML(entry.combo.r) + "</div>" +
          '<div class="cl-log-outcome">' + outcome + "</div></div>";
      }
      if (entry.t === "accuse") {
        return '<div class="cl-log-entry' + (entry.correct ? " is-good" : " is-bad") + '" style="--p:' + by.color + '">' +
          '<div class="cl-log-head"><span class="cl-log-dot">' + (by.index + 1) + "</span><strong>" + E(by.name) + "</strong><small>اتهام نهائي</small></div>" +
          '<div class="cl-log-combo">' + miniChipHTML(entry.combo.s) + miniChipHTML(entry.combo.w) + miniChipHTML(entry.combo.r) + "</div>" +
          '<div class="cl-log-outcome">' + (entry.correct ? "✅ اتهام صحيح — حُلّت القضية" : "❌ اتهام خاطئ — أُقصي المحقق") + "</div></div>";
      }
      return "";
    }).join("");
  }

  /* ------------------------------ ورقة التحقيق ------------------------------ */

  function sheetCellHTML(cardId, col, auto) {
    const value = cellValue(cardId, col, auto);
    const key = cellKey(cardId, col);
    const manual = localNotes && (localNotes.manual[key] === 1 || localNotes.manual[key] === -1);
    const locked = !manual && ((auto && auto[key] === 1 && col === viewerSeat()) || (auto && auto[key] === 1 && col === "env"));
    const label = col === "env" ? "الظرف" : playerName(col);
    const stateText = value === 1 ? "لديه" : value === -1 ? "ليس لديه" : "غير محدد";
    return '<td class="cl-sheet-cell-wrap"><button type="button" class="cl-sheet-cell' +
      (value === 1 ? " is-yes" : value === -1 ? " is-no" : "") +
      (manual ? " is-manual" : "") + (locked ? " is-locked" : "") +
      '" data-cell="' + E(cardId) + '" data-col="' + E(col) + '"' + (locked ? " disabled" : "") +
      ' aria-label="' + E(cardName(cardId) + " — " + label + " — " + stateText) + '">' +
      (value === 1 ? "✓" : value === -1 ? "✕" : "·") + "</button></td>";
  }

  function sheetHTML() {
    const auto = notesAuto();
    const me = viewerSeat();
    let html = '<div class="cl-sheet-toolbar">' +
      '<div class="cl-sheet-legend"><span><b class="is-yes">✓</b> يملك البطاقة</span><span><b class="is-no">✕</b> لا يملكها</span><span><b>·</b> غير محدد</span></div>' +
      '<button type="button" class="bg-btn small" data-sheet-reset>🧹 مسح العلامات اليدوية</button></div>' +
      '<div class="cl-sheet-scroll"><table class="cl-sheet-table"><thead><tr>' +
      '<th class="cl-sheet-card-col">البطاقة</th><th class="cl-sheet-env">الظرف</th>' +
      state.players.map((player) =>
        '<th style="--p:' + player.color + '"><span class="cl-sheet-pdot">' + (player.index + 1) + "</span>" + E(player.name) + "</th>"
      ).join("") + "</tr></thead><tbody>";
    CAT_ORDER.forEach((cat) => {
      html += '<tr class="cl-sheet-group"><th colspan="' + (state.players.length + 2) + '">' + CAT_NAMES[cat] + "</th></tr>";
      categoryCards(cat).forEach((id) => {
        const card = cardOf(id);
        html += '<tr class="cl-sheet-row" style="--cc:' + card.color + '">' +
          '<th scope="row" class="cl-sheet-card"><span class="cl-sheet-mini">' + artCard(id) + "</span>" +
          "<span>" + E(card.name) + "</span>" +
          '<button type="button" class="cl-sheet-strike' + (cellValue(id, "env", auto) === -1 ? " is-done" : "") +
          '" data-strike="' + E(id) + '" title="شطب من الظرف" aria-label="شطب ' + E(card.name) + ' من الظرف">✕</button></th>' +
          sheetCellHTML(id, "env", auto) +
          state.players.map((player) => sheetCellHTML(id, player.index, auto)).join("") +
          "</tr>";
      });
    });
    html += "</tbody></table></div>";
    const known = fullDeck().filter((id) => cellValue(id, me, auto) === 1).length;
    html += '<p class="cl-sheet-summary">بطاقاتك المعروفة: <strong>' + known + "</strong> · المشتبه بهم ٦ · الأسلحة ٦ · الغرف ٩ · اضغط الخلية لتبديل الحالة.</p>";
    return html;
  }

  function revealLogHTML() {
    if (!localNotes || !localNotes.reveals.length) {
      return '<p class="cluedo-empty">لا نتائج دحض خاصة بعد. ستُسجَّل هنا البطاقات التي تُعرض لك وحدك.</p>';
    }
    return '<div class="cl-reveal-log">' + localNotes.reveals.slice().reverse().slice(0, 16).map((reveal) => {
      if (!reveal) return "";
      if (reveal.none) {
        return '<div class="cl-reveal-row is-none"><span class="cl-reveal-badge">🙈</span><div><strong>لم يُظهر أحد بطاقة</strong><small>' +
          [reveal.combo.s, reveal.combo.w, reveal.combo.r].map((id) => E(cardName(id))).join(" · ") +
          "</small></div></div>";
      }
      return '<div class="cl-reveal-row"><span class="cl-reveal-badge">🃏</span><div><strong>' + E(playerName(reveal.refuter)) + " أظهر لك " + E(cardName(reveal.card)) + "</strong><small>" +
        [reveal.combo.s, reveal.combo.w, reveal.combo.r].map((id) => E(cardName(id))).join(" · ") +
        "</small></div></div>";
    }).join("") + "</div>";
  }

  function openSheet() {
    if (!state || !localNotes) {
      BG.toast("لا توجد ورقة تحقيق لهذا المقعد.", "warn");
      return;
    }
    autoCache = null;
    const body = document.createElement("div");
    body.className = "cl-sheet-body";
    function draw() {
      autoCache = null;
      body.innerHTML = sheetHTML() +
        '<section class="cl-reveal-log-wrap"><span class="cluedo-kicker">نتائج دحضي الخاصة</span>' + revealLogHTML() + "</section>";
    }
    body.addEventListener("click", (event) => {
      const cell = event.target.closest("[data-cell]");
      if (cell) {
        cycleCell(cell.getAttribute("data-cell"), cell.getAttribute("data-col"));
        draw();
        if (FX) FX.sound("click");
        return;
      }
      const strike = event.target.closest("[data-strike]");
      if (strike) {
        strikeFromEnvelope(strike.getAttribute("data-strike"));
        draw();
        if (FX) FX.sound("click");
        return;
      }
      if (event.target.closest("[data-sheet-reset]")) {
        resetManualMarks();
        draw();
        BG.toast("مُسحت العلامات اليدوية. بقيت الاستنتاجات التلقائية.", "good");
        if (FX) FX.sound("click");
      }
    });
    draw();
    if (FX) FX.sound("card");
    BG.openDialog({
      title: "📋 ورقة تحقيق " + playerName(viewerSeat()),
      body,
      actions: [{ label: "إغلاق", value: "", primary: true }],
      className: "cluedo-dialog cluedo-sheet-dialog",
    });
  }

  function openCardZoom(id) {
    const card = cardOf(id);
    if (!card) return;
    if (FX) FX.sound("flip");
    BG.openDialog({
      title: "بطاقة " + card.catName,
      body: cardShowcaseHTML(id),
      actions: [{ label: "إغلاق", value: "", primary: true }],
      className: "cluedo-dialog cluedo-card-dialog",
    });
  }

  /* ------------------------------ اللوحة ------------------------------ */

  function doorsHTML(room) {
    const sides = {};
    ROOM_EDGES.forEach((pair) => {
      if (pair[0] !== room.id && pair[1] !== room.id) return;
      const other = ROOM_BY_ID[pair[0] === room.id ? pair[1] : pair[0]];
      if (!other) return;
      if (other.x === room.x) sides[other.y < room.y ? "top" : "bottom"] = true;
      else if (other.y === room.y) sides[other.x > room.x ? "end" : "start"] = true;
    });
    return Object.keys(sides).map((side) => '<i class="cluedo-door is-' + side + '" aria-hidden="true"></i>').join("");
  }

  function corridorSVG() {
    const pos = [4.2, 34.4, 65.6, 95.8];
    const parts = ['<svg class="cluedo-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'];
    for (let row = 0; row < HALL_N; row++) {
      for (let col = 0; col < HALL_N; col++) {
        if (col + 1 < HALL_N) {
          parts.push('<line x1="' + pos[col] + '" y1="' + pos[row] + '" x2="' + pos[col + 1] + '" y2="' + pos[row] + '" />');
        }
        if (row + 1 < HALL_N) {
          parts.push('<line x1="' + pos[col] + '" y1="' + pos[row] + '" x2="' + pos[col] + '" y2="' + pos[row + 1] + '" />');
        }
      }
    }
    parts.push('<path class="cluedo-secret-link" d="M16.7 16.7 C50 16.7 50 83.3 83.3 83.3" />');
    parts.push('<path class="cluedo-secret-link" d="M83.3 16.7 C50 16.7 50 83.3 16.7 83.3" />');
    for (let row = 0; row < HALL_N; row++) {
      for (let col = 0; col < HALL_N; col++) {
        parts.push('<circle class="cluedo-hall-dot" cx="' + pos[col] + '" cy="' + pos[row] + '" r="0.72" />');
      }
    }
    parts.push("</svg>");
    return parts.join("");
  }

  function boardHTML() {
    const reach = {};
    const canMove = canAct() && state.phase === "move";
    if (canMove) state.reachable.forEach((entry) => { reach[entry.id] = entry.steps; });
    const current = cur();
    const me = viewerSeat();
    const rooms = ROOMS.map((room) => {
      const here = state.players.filter((player) => player.room === room.id);
      const steps = reach[room.id];
      const classes = ["cluedo-room"];
      if (canMove && steps) classes.push("is-reachable");
      if (!state.over && current && current.room === room.id) classes.push("is-current");
      if (state.over) classes.push("is-over");
      if (state.players[me] && state.players[me].room === room.id) classes.push("is-mine");
      const disabled = !canMove || !steps;
      return '<button type="button" class="' + classes.join(" ") + '" data-room="' + room.id +
        '" style="--rc:' + room.color + '"' + (disabled ? " disabled" : "") +
        ' aria-label="' + E(room.name + (steps ? " — متاحة في " + steps + " خطوة" : "")) + '">' +
        '<span class="cluedo-room-art" aria-hidden="true">' + artRoom(room.id) + "</span>" +
        '<span class="cluedo-room-shade" aria-hidden="true"></span>' +
        doorsHTML(room) +
        '<span class="cluedo-room-head"><span class="cluedo-room-icon">' + room.icon + "</span>" +
        '<span class="cluedo-room-copy"><strong><span class="cl-room-full">' + E(room.name) + '</span><span class="cl-room-short" aria-hidden="true">' + E(room.short) + "</span></strong><small>" +
        (steps ? "متاحة الآن" : room.passage ? "ممر سري" : "غرفة") + "</small></span>" +
        (room.passage ? '<span class="cluedo-passage" title="ممر سري">↔</span>' : "") + "</span>" +
        '<span class="cluedo-pawns">' + here.map((player) =>
          '<i class="cluedo-pawn' + (player.index === state.current && !state.over ? " is-active" : "") +
          (player.index === me ? " is-mine" : "") + (player.active ? "" : " is-out") +
          '" data-fx-piece="clu-p-' + player.index + '" style="--pc:' + player.color + '" title="' + E(player.name) + '">' +
          "<b>" + (player.index + 1) + "</b><span class=\"cluedo-pawn-tip\">" + E(player.name) + "</span></i>"
        ).join("") + "</span>" +
        (steps ? '<span class="cluedo-steps">' + steps + "</span>" : "") +
        "</button>";
    }).join("");
    return '<div class="cluedo-board">' + corridorSVG() + rooms + "</div>";
  }

  const PIPS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };

  function dieHTML(value) {
    const on = PIPS[value] || PIPS[1];
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="' + (on.indexOf(i) !== -1 ? "on" : "") + '"></i>';
    return '<span class="cluedo-die" role="img" aria-label="نرد: ' + value + '"><span class="cluedo-die-pips">' + cells + "</span></span>";
  }

  function diceHTML() {
    return '<div class="cluedo-dice" aria-label="نرد الحركة">' + dieHTML(state.dice[0]) + dieHTML(state.dice[1]) +
      '<span class="cluedo-steps-label">= <strong>' + state.steps + "</strong> خطوة</span></div>";
  }

  function actionHTML() {
    const active = canAct();
    const canMove = active && state.phase === "move";
    const canSuggest = active && state.phase === "act" && !state.hasSuggested;
    const canEnd = active && state.phase === "act";
    const canAccuse = active && !state.over;
    return '<div class="cluedo-panel cluedo-actions">' +
      '<span class="cluedo-kicker">أوامر الدور</span>' +
      '<button type="button" class="bg-btn primary" data-act="suggest"' + (canSuggest ? "" : " disabled") + '><span>🔍 اقتراح في غرفتي</span></button>' +
      '<div class="cluedo-action-row">' +
      '<button type="button" class="bg-btn" data-act="stay"' + (canMove ? "" : " disabled") + '><span>⏸ تخطَّ الحركة</span></button>' +
      '<button type="button" class="bg-btn danger" data-act="accuse"' + (canAccuse ? "" : " disabled") + '><span>⚖️ اتهام نهائي</span></button>' +
      "</div>" +
      '<button type="button" class="bg-btn" data-act="end"' + (canEnd ? "" : " disabled") + '><span>⏭️ إنهاء الدور</span></button>' +
      '<div class="cluedo-action-row">' +
      '<button type="button" class="bg-btn" data-act="sheet"><span>📋 ورقة التحقيق</span></button>' +
      "</div>" +
      '<p class="cluedo-hint">' + (state.over ? "انتهى التحقيق." : state.phase === "move"
        ? "انقر غرفة مضاءة للانتقال، أو تخطَّ الحركة."
        : "يمكنك الاقتراح مرة واحدة، أو إنهاء الدور.") + "</p></div>";
  }

  function handHTML(player) {
    if (!player || !player.hand.length) return '<p class="cluedo-empty">لا بطاقات في يدك.</p>';
    return '<div class="cluedo-hand">' + CAT_ORDER.map((cat) => {
      const cards = player.hand.filter((id) => id.charAt(0) === cat);
      if (!cards.length) return "";
      return '<div class="cluedo-hand-group"><span class="cluedo-hand-label">' + CAT_NAMES[cat] + " · " + cards.length + "</span>" +
        '<div class="cluedo-hand-cards">' + cards.map((id) => cardTileHTML(id, { mini: true })).join("") + "</div></div>";
    }).join("") + "</div>";
  }

  function playersHTML() {
    const auto = notesAuto();
    const me = viewerSeat();
    return state.players.map((player) => {
      const active = !state.over && player.index === state.current;
      const known = knownCardsFor(player.index, auto);
      const shown = player.index === me ? [] : known.slice(0, 4);
      return '<div class="cluedo-player' + (active ? " active" : "") + (player.active ? "" : " out") +
        (player.index === me ? " is-me" : "") + '" style="--p:' + player.color + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<div class="cluedo-player-copy"><strong>' + E(player.name) +
        (player.cpu ? ' <span class="cluedo-cpu-tag">🤖 ' + E(LEVEL_NAMES[player.level] || "") + "</span>" : "") +
        (player.index === me ? ' <span class="cluedo-me-tag">أنت</span>' : "") + "</strong>" +
        "<small>" + ROOM_BY_ID[player.room].icon + " " + E(ROOM_BY_ID[player.room].name) + " · " + player.hand.length + " بطاقة</small>" +
        (shown.length ? '<span class="cl-known-row">' + shown.map((id) => miniChipHTML(id)).join("") +
          (known.length > shown.length ? '<span class="cl-known-more">+' + (known.length - shown.length) + "</span>" : "") + "</span>" :
          player.index !== me ? '<span class="cl-known-none">لا بطاقات مكشوفة لك</span>' : "") +
        "</div>" +
        '<span class="cluedo-player-state">' + (player.active ? (active ? "دوره" : "نشط") : "مُقصى") + "</span></div>";
    }).join("");
  }

  function envelopePanelHTML() {
    if (state.over) {
      return '<div class="cluedo-panel cluedo-envelope is-open"><span class="cluedo-kicker">ظرف القضية — مفتوح</span>' +
        '<div class="cl-envelope-cards">' + [state.envelope.s, state.envelope.w, state.envelope.r].map((id) => smallCardHTML(id)).join("") + "</div>" +
        '<p class="cluedo-hint">هذه بطاقات الحل الثلاث. من اتهم بها صحيحًا فقد فاز.</p></div>';
    }
    return '<div class="cluedo-panel cluedo-envelope"><span class="cluedo-kicker">ظرف القضية</span>' +
      '<div class="cl-envelope-art" aria-hidden="true">' + artEnvelope() + "</div>" +
      '<p class="cluedo-hint">مختوم · ثلاث بطاقات. لا يُفتح إلا باتهام صحيح أو بنهاية التحقيق.</p></div>';
  }

  function legendHTML() {
    return '<div class="cluedo-panel cluedo-legend"><span class="cluedo-kicker">كيف تلعب</span>' +
      '<div class="cluedo-legend-row"><b>🎲</b><span>حرّك داخل الغرف حتى مجموع النرد. الممرات السرية تربط المكتب بالمطبخ والدفيئة بالصالة.</span></div>' +
      '<div class="cluedo-legend-row"><b>🔍</b><span>اقترح مشتبهًا وسلاحًا في غرفتك؛ أول لاعب يملك بطاقة يعرضها عليك سرًّا.</span></div>' +
      '<div class="cluedo-legend-row"><b>📋</b><span>استخدم ورقة التحقيق لشطب الاحتمالات وتتبع من يملك ماذا.</span></div>' +
      '<div class="cluedo-legend-row"><b>⚖️</b><span>الاتهام الخاطئ يُقصيك. الاتهام الصحيح يفتح الظرف ويحسم القضية.</span></div></div>';
  }

  function turnPanelHTML() {
    const player = cur();
    const local = isOnline() ? state.players[apiRef.net.seat] : player;
    const waiting = isOnline() && state.current !== apiRef.net.seat;
    return '<div class="cluedo-panel cluedo-turn">' +
      '<span class="cluedo-kicker">الجولة ' + state.turn + " · " + (state.over ? "منتهية" : state.phase === "move" ? "حركة" : "تحقيق") + "</span>" +
      "<strong>" + E(state.over ? "القضية مغلقة" : player.name) + (player.cpu ? ' <span class="cluedo-cpu-tag">🤖</span>' : "") + "</strong>" +
      "<small>" + (state.over ? E(state.notice) : ROOM_BY_ID[player.room].icon + " " + E(ROOM_BY_ID[player.room].name) +
        (local && local.index !== player.index ? " · أنت في " + E(ROOM_BY_ID[local.room].name) : "")) + "</small>" +
      diceHTML() +
      '<div class="cluedo-turn-local">' + (state.over ? "🔒" : waiting ? "⏳ بانتظار " + E(player.name) : isCpu(player) ? "🤖 الكمبيوتر يفكر…" : "🟢 دورك") + "</div>" +
      "</div>";
  }

  function statusBarHTML() {
    const player = cur();
    const local = viewerPlayer();
    return '<div class="cluedo-statusbar">' +
      '<span class="cl-status-item"><b>الدور</b> ' + E(state.over ? "انتهى" : player.name) + "</span>" +
      '<span class="cl-status-item"><b>المكان</b> ' + E(state.over ? "—" : ROOM_BY_ID[player.room].name) + "</span>" +
      '<span class="cl-status-item"><b>النرد</b> ' + state.dice[0] + " + " + state.dice[1] + " = " + state.steps + "</span>" +
      (local ? '<span class="cl-status-item is-you"><b>أنت</b> ' + E(local.name) + " · " + local.hand.length + " بطاقة</span>" : "") +
      "</div>";
  }

  /* ------------------------------ العرض ------------------------------ */

  let lastRenderTurn = -1;
  let lastRenderOver = false;

  function applyPendingMove() {
    if (!pendingMove || !rootRef) return;
    const info = pendingMove;
    pendingMove = null;
    const el = rootRef.querySelector('[data-fx-piece="clu-p-' + info.seat + '"]');
    if (!el) return;
    const now = el.getBoundingClientRect();
    if (!now.width && !now.height) return;
    const dx = info.rect.left - now.left;
    const dy = info.rect.top - now.top;
    if (!dx && !dy) return;
    el.style.setProperty("--mv-x", dx + "px");
    el.style.setProperty("--mv-y", dy + "px");
    el.classList.add("is-moving");
    const clear = () => {
      el.classList.remove("is-moving");
      el.style.removeProperty("--mv-x");
      el.style.removeProperty("--mv-y");
    };
    el.addEventListener("animationend", clear, { once: true });
    setTimeout(clear, 700);
  }

  function render() {
    if (!rootRef || !state) return;
    ensureNotes();
    autoCache = null;
    const oldBoard = rootRef.querySelector(".cluedo-board-scroll");
    const oldScroll = oldBoard ? { left: oldBoard.scrollLeft, top: oldBoard.scrollTop } : null;

    const wrap = document.createElement("div");
    wrap.className = "cluedo-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "cluedo-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-cluedo"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">قصر الجريمة</span><strong>تسع غرف · واحد وعشرون احتمالًا</strong></div>' +
      '<span class="board-head-hint">الغرف المضاءة ضمن مدى النرد · الممرات السرية تختصر الطريق</span>' +
      "</div>" +
      '<div class="cluedo-board-scroll">' + boardHTML() + "</div>" +
      statusBarHTML();

    const side = document.createElement("aside");
    side.className = "cluedo-side";
    side.innerHTML = turnPanelHTML() + actionHTML() +
      '<div class="cluedo-notice' + (state.over ? " is-over" : "") + '">' + E(state.notice) + "</div>" +
      '<div class="cluedo-panel cluedo-players"><span class="cluedo-kicker">المحققون</span>' + playersHTML() + "</div>" +
      envelopePanelHTML() +
      '<div class="cluedo-panel cluedo-history"><span class="cluedo-kicker">سجل التحقيق</span><div class="cluedo-log-list">' + logHTML() + "</div></div>" +
      legendHTML();

    const player = viewerPlayer();
    let secretEl = null;
    if (!player) {
      const watch = document.createElement("div");
      watch.className = "cluedo-panel cluedo-watch";
      watch.innerHTML = '<span class="cluedo-kicker">👁 وضع المشاهدة</span><strong>أنت تتابع التحقيق</strong>' +
        '<p class="cluedo-hint">بطاقات المحققين سرّية ولا تُعرض على هذا الجهاز. تابع الحركة والاقتراحات من اللوحة.</p>';
      secretEl = watch;
    } else if (player.cpu) {
      const cpuPanel = document.createElement("div");
      cpuPanel.className = "cluedo-panel cluedo-cpu";
      cpuPanel.innerHTML = '<span class="cluedo-kicker">كمبيوتر · ' + E(LEVEL_NAMES[player.level] || "") + "</span>" +
        "<strong>" + E(player.name) + "</strong>" +
        '<p class="cluedo-hint">الكمبيوتر يفحص أوراقه ويستنتج من الاقتراحات. تبقى بطاقاته مخفية عن الجميع.</p>';
      secretEl = cpuPanel;
    } else if (resolving && !isOnline()) {
      const locked = document.createElement("div");
      locked.className = "cluedo-panel cluedo-secret-lock";
      locked.innerHTML =
        '<span class="cluedo-kicker">🔒 بطاقات مخفية</span>' +
        "<strong>جارٍ التحقق من الاقتراح…</strong>" +
        '<p class="cluedo-hint">تُعرض بطاقات المحققين بعد انتهاء الدحض. مرّر الجهاز إلى صاحب القرار عند الطلب فقط.</p>';
      secretEl = locked;
    } else {
      const secret = BG.secretPanel({
        title: "🕵️ أوراق " + player.name,
        owner: player.name,
        hint: "بطاقاتك سرّية. أظهرها فقط عند دورك أو عند طلب دحض، ثم أخفها قبل تمرير الجهاز.",
        open: isOnline() || player.index === state.current,
        autoKey: "cluedo.hand." + player.index + "." + state.turn,
        render() { return handHTML(player); },
      });
      secretEl = secret.el;
    }
    if (secretEl) {
      const turnPanel = side.querySelector(".cluedo-turn");
      if (turnPanel && turnPanel.nextSibling) side.insertBefore(secretEl, turnPanel.nextSibling);
      else side.appendChild(secretEl);
    }

    wrap.appendChild(boardWrap);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    const boardScroll = rootRef.querySelector(".cluedo-board-scroll");
    if (boardScroll && oldScroll) {
      boardScroll.scrollLeft = oldScroll.left;
      boardScroll.scrollTop = oldScroll.top;
    }
    applyPendingMove();
    if (state.turn !== lastRenderTurn || state.over !== lastRenderOver) {
      lastRenderTurn = state.turn;
      lastRenderOver = state.over;
      const rows = rootRef.querySelectorAll(".cluedo-player");
      if (rows.length && FX) FX.stagger(rows, { delay: 28, duration: 260 });
    }
    if (!state.over && apiRef) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (!state) return;
    if (FX) FX.unlock();
    const zoom = event.target.closest("[data-card-zoom]");
    if (zoom) {
      openCardZoom(zoom.getAttribute("data-card-zoom"));
      return;
    }
    const action = event.target.closest("[data-act]");
    if (action) {
      const act = action.getAttribute("data-act");
      if (act === "sheet") { openSheet(); return; }
      if (!canAct()) {
        BG.toast(state.over ? "انتهى التحقيق." : "انتظر دورك.", "warn");
        return;
      }
      if (act === "suggest") openSuggestion();
      else if (act === "stay") stay();
      else if (act === "accuse") openAccusation();
      else if (act === "end") {
        if (state.phase === "act") endTurn("manual");
        else BG.toast("حرّك قطعتك أو تخطَّ الحركة أولًا.", "warn");
      }
      return;
    }
    const room = event.target.closest("[data-room]");
    if (room) {
      if (!canAct() || state.phase !== "move") return;
      moveTo(room.getAttribute("data-room"));
    }
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "cluedo",
    name: "كلودو",
    en: "CLUEDO",
    icon: "🕵️",
    accent: "#c983b8",
    cardClass: "card-cluedo",
    tagline: "افتح تحقيقًا في قصر الجريمة: اسأل، دحض، ثم اتّهم الفاعل قبل الجميع.",
    players: "2–6",
    duration: "30–60 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 3,

    rules: {
      goal: "اكتشف البطاقات الثلاث المخبأة في ظرف القضية: من ارتكب الجريمة، وبأي سلاح، وفي أي غرفة. اطرح اقتراحات لتضيّق الاحتمالات، ودحض اقتراحات الخصوم، ثم قدّم اتهامًا نهائيًا صحيحًا قبل أن يسبقك أحد.",
      facts: [["الغرف", "٩ غرف"], ["المشتبه بهم", "٦"], ["الأسلحة", "٦"], ["بطاقات التحقيق", "٢١ بطاقة"]],
      components: [
        "لوحة قصر من ٩ غرف متصلة بشبكة ممرات من ١٦ عقدة، مع ممرين سرّيين بين الزوايا.",
        "٦ بطاقات مشتبه بهم و٦ بطاقات أسلحة و٩ بطاقات غرف (٢١ بطاقة إجمالًا).",
        "ظرف القضية يحوي بطاقة واحدة من كل فئة: الفاعل، السلاح، المكان.",
        "قطعة لكل محقق، وورقة استنتاج رقمية تفاعلية لكل مقعد.",
        "نردان لحركة كل دور.",
      ],
      setup: [
        "تُفصل البطاقات إلى ثلاث مجموعات: المشتبه بهم، الأسلحة، الغرف. تُسحب بطاقة عشوائية واحدة من كل مجموعة وتوضع سرًا في ظرف القضية.",
        "تُخلط البطاقات الـ18 المتبقية وتُوزع بالتساوي على اللاعبين في اتجاه عقارب الساعة؛ إذا لم تتساوَ الأعداد يحصل اللاعبون الأوائل على بطاقة إضافية.",
        "في لعبة اللاعبين الاثنين يحصل كل لاعب على ٩ بطاقات، ويُترك الظرف مغلقًا طوال اللعب.",
        "تبدأ جميع القطع في البهو. يبدأ اللاعب الأول، ثم ينتقل الدور بالتناوب بين المحققين النشطين.",
        "بطاقات اليد سرّية دائمًا. لا يُظهرها اللاعب إلا عند دوره أو عند دحض اقتراح، وبطاقة واحدة فقط.",
      ],
      steps: [
        "<strong>الحركة:</strong> ارمِ النردين في بداية دورك. تحرّك عبر شبكة الممرات: الخروج من غرفتك يكلّف خطوة، وكل ضلع ممر خطوة، ودخول الغرفة خطوة. يمكنك التوقف في أي غرفة تصل إليها ضمن مجموع النرد، والممرات السرية تربط المكتب بالمطبخ والدفيئة بالصالة بخطوة واحدة. يمكنك أيضًا البقاء في مكانك.",
        "<strong>الاقتراح:</strong> بعد الحركة، وأنت داخل غرفة، يمكنك اقتراح مشتبه به وسلاح. الغرفة المقترحة هي الغرفة التي تقف فيها حتمًا. الاقتراح يُنهي دورك.",
        "<strong>الدحض:</strong> يبدأ اللاعب التالي لك في السؤال سرًا: هل يملك أي بطاقة من العناصر الثلاثة؟ أول لاعب يملك بطاقة مطابقة يعرض عليك بطاقة واحدة فقط من اختياره، دون أن يراها بقية اللاعبين. إن كان يملك أكثر من بطاقة، يختار واحدة فقط.",
        "<strong>لا دحض:</strong> إذا لم يملك أي لاعب أي بطاقة من العناصر الثلاثة، فلا أحد يدحض اقتراحك. هذا يعني أن أحد العناصر الثلاثة على الأقل قد يكون في ظرف القضية.",
        "<strong>الاتهام النهائي:</strong> في أي وقت من دورك، بدلًا من الاقتراح أو بعده، يمكنك تقديم اتهام نهائي بتحديد الفاعل والسلاح والمكان. الاتهام الصحيح يكشف الظرف ويفوز فورًا. الاتهام الخاطئ يُقصيك من الحركة والاقتراح، لكنك تبقى مطالبًا بدحض اقتراحات الآخرين ببطاقاتك.",
        "<strong>تبادل الأدوار:</strong> بعد الاقتراح أو إنهاء الدور، أخفِ أوراقك ومرّر الجهاز إلى المحقق التالي النشط. تُخفى الأوراق تلقائيًا عند تغيّر الدور.",
      ],
      winning: "يفوز من يقدّم اتهامًا نهائيًا صحيحًا ويكشف بطاقات الظرف الثلاث. إذا أُقصي جميع المحققين الآخرين بالأخطاء، يفوز المحقق النشط الأخير بالقضية. لا يمكن للمُقصى أن يقدّم اتهامًا أو اقتراحًا، لكنه يظل مطالبًا بدحض الاقتراحات.",
      notes: [
        "الحركة تعتمد شبكة ممرات حقيقية من ١٦ عقدة بين الغرف؛ لا يُسمح بالمرور عبر غرفة وسيطة، بل يجب السير في الممرات حتى باب الغرفة الهدف.",
        "الاقتراح يستخدم غرفتك الحالية تلقائيًا وينهي دورك، بدل السماح بالاقتراح ثم مواصلة الحركة.",
        "قطع المشتبه بهم والأسلحة لا تتحرك على اللوحة عند الاقتراح؛ الاقتراح للاستنتاج فقط.",
        "الممرات السرية: المكتب ↔ المطبخ، والدفيئة ↔ الصالة.",
        "في لعبة اللاعبين الاثنين تُوزع ٩ بطاقات لكل لاعب بدل التوزيع الكامل، ويظل الظرف سرّيًا حتى الاتهام الصحيح أو نهاية اللعبة.",
        "نتيجة الدحض لا تُكشف في السجل العام؛ تظهر فقط في نافذة سرّية لصاحب الاقتراح وتُسجَّل في ورقته الخاصة.",
        "ورقة التحقيق تُحفظ محليًا لكل مقعد، ولا تُرسل إلى بقية اللاعبين في الأونلاين.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      localNotes = null;
      notesKeyCache = "";
      autoCache = null;
      pendingMove = null;
      resolving = false;
      lastViewer = -2;
      lastRenderTurn = -1;
      lastRenderOver = false;

      const players = buildPlayers(api.players || []);
      if (!players.length) {
        root.innerHTML = '<p class="cluedo-empty">لا يوجد لاعبون.</p>';
        return null;
      }
      const envelope = dealCase(players);
      state = {
        v: 2,
        players,
        current: 0,
        turn: 1,
        phase: "move",
        dice: [1, 1],
        steps: 2,
        reachable: [],
        envelope,
        hasSuggested: false,
        busy: false,
        over: false,
        winner: null,
        notice: "",
        log: [],
        logSeq: 0,
        lastSuggestion: null,
        lastAccusation: null,
        startedAt: Date.now(),
      };
      state.players.forEach((player) => brainPrepare(player));

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get envelope() { return state ? state.envelope : null; },
          get players() { return state ? state.players : []; },
          get notes() { return localNotes; },
          render, beginTurn, moveTo, stay, endTurn, endGame,
          startSuggestion, resolveSuggestion, resolveAccusation,
          openSuggestion, openAccusation, openSheet, openCardZoom,
          reachableRooms, distances, matchesFor,
          cpuTakeTurn, cpuAccusation, cpuCombo, cpuRefutePick,
          brainSolve, brainLearnSuggestion, syncCpu,
          notesAuto, notesKeyFor, sheetHTML,
          ROOMS, ROOM_BY_ID, SUSPECTS, WEAPONS, CARD_MAP, cards: CARD_MAP,
          cardName, cardOf, fullDeck,
          playersIn: (roomId) => state.players.filter((player) => player.room === roomId).map((player) => player.name),
        };
      }

      rootRef.addEventListener("click", handleClick);
      const bots = players.filter((player) => player.cpu).length;
      if (apiRef) {
        apiRef.log(
          "بدأت كلودو — ٩ غرف و٢١ بطاقة. ظرف القضية مختوم، وكل محقق يملك " +
          players[0].hand.length + " بطاقة." + (bots ? " " + bots + " مقعد كمبيوتر." : ""),
          "accent"
        );
      }
      beginTurn(false);

      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          let next = null;
          try { next = BG.netCodec.decode(data); } catch (err) { next = null; }
          if (!next || !Array.isArray(next.players)) return;
          state = next;
          state.v = 2;
          state.dice = Array.isArray(state.dice) ? state.dice : [1, 1];
          state.steps = Number.isFinite(state.steps) ? state.steps : state.dice[0] + state.dice[1];
          state.reachable = (Array.isArray(state.reachable) ? state.reachable : [])
            .map((entry) => entry && entry.id ? { id: entry.id, steps: entry.steps } : entry && entry.room ? { id: entry.room.id, steps: entry.steps } : null)
            .filter(Boolean);
          state.log = Array.isArray(state.log) ? state.log : [];
          state.logSeq = Number.isFinite(state.logSeq) ? state.logSeq : state.log.length;
          state.turn = Number.isFinite(state.turn) ? state.turn : 1;
          state.phase = state.over === true ? "over" : state.phase === "act" ? "act" : "move";
          state.over = state.over === true;
          state.hasSuggested = state.hasSuggested === true;
          state.notice = typeof state.notice === "string" ? state.notice : "";
          state.winner = Number.isInteger(state.winner) && state.players[state.winner] ? state.winner : null;
          state.lastSuggestion = state.lastSuggestion && typeof state.lastSuggestion === "object" ? state.lastSuggestion : null;
          state.lastAccusation = state.lastAccusation && typeof state.lastAccusation === "object" ? state.lastAccusation : null;
          state.startedAt = Number.isFinite(state.startedAt) ? state.startedAt : 0;
          state.envelope = state.envelope || { s: "s:scarlett", w: "w:candlestick", r: "r:hall" };
          ["s", "w", "r"].forEach((cat) => {
            const value = String(state.envelope[cat] || "");
            state.envelope[cat] = value.indexOf(":") === -1 ? cat + ":" + value : value;
          });
          state.players.forEach((player, index) => {
            player.index = index;
            player.name = typeof player.name === "string" && player.name ? player.name : "محقق " + (index + 1);
            player.hand = Array.isArray(player.hand) ? player.hand.filter((id) => !!cardOf(id)) : [];
            player.known = Array.isArray(player.known) ? player.known : [];
            player.envelopeKnown = Array.isArray(player.envelopeKnown) ? player.envelopeKnown : [];
            player.constraints = Array.isArray(player.constraints) ? player.constraints.filter((item) => item && Array.isArray(item.cards)) : [];
            player.seenBy = Array.isArray(player.seenBy) ? player.seenBy : [];
            player.notHeld = Array.isArray(player.notHeld) ? player.notHeld : [];
            for (let i = 0; i < state.players.length; i++) {
              if (!Array.isArray(player.seenBy[i])) player.seenBy[i] = [];
              if (!Array.isArray(player.notHeld[i])) player.notHeld[i] = [];
            }
            player.cpu = player.cpu === true || player.type === "cpu" || player.isCpu === true;
            player.type = player.cpu ? "cpu" : "human";
            player.level = AI.level(player.level);
            player.room = ROOM_BY_ID[player.room] ? player.room : "hall";
            player.active = player.active !== false;
            if (!player.color) player.color = PCOLORS[index % PCOLORS.length];
          });
          if (!Number.isInteger(state.current) || !state.players[state.current]) state.current = 0;
          if (!state.over && !state.players[state.current].active) {
            const next = state.players.findIndex((player) => player.active);
            if (next >= 0) state.current = next;
          }
          state.busy = resolving ? true : false;
          lastRenderTurn = -1;
          lastRenderOver = state.over === true;
          ensureNotes();
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          resolving = false;
          state.busy = false;
          ensureNotes();
          render();
        },
        netRefuteMatches(seat, combo) {
          if (!state || !combo) return [];
          const player = state.players[seat];
          if (!player) return [];
          return player.hand.filter((id) => id === combo.s || id === combo.w || id === combo.r);
        },
        netCardInfo(id) {
          const card = cardOf(id);
          if (!card) return null;
          return { name: card.name, icon: card.icon, cat: card.catName, color: card.color };
        },
        destroy() {
          saveNotes();
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
          localNotes = null;
          notesKeyCache = "";
          autoCache = null;
          pendingMove = null;
          resolving = false;
        },
      };
    },
  };

  BG.register(game);
})();
