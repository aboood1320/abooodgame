/* ==========================================================================
   الجزيرة المحرمة — لعبة تعاونية لفريق واحد
   استخرجوا أربعة كنوز قبل أن تغرق الجزيرة، ثم اهربوا معًا بالهليكوبتر.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;
  const U = BG.util;
  const AI = BG.ai;
  const FX = BG.fx;
  const esc = U.escape;
  const ar = (value) => String(value == null ? "" : value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

  const ROW_COUNTS = [2, 4, 6, 6, 4, 2];
  const SLOTS = [];
  ROW_COUNTS.forEach((count, row) => {
    const start = (6 - count) / 2;
    for (let index = 0; index < count; index++) SLOTS.push({ row, col: start + index });
  });

  const WATER_TRACK = [2, 2, 3, 3, 4, 4, 5, 5, 6, "skull"];
  const DIFFICULTIES = {
    easy: { name: "مبتدئ", start: 0, water: 2, note: "بداية هادئة: مستويان من الطوفان في كل دور." },
    medium: { name: "عادي", start: 2, water: 3, note: "التوازن: ثلاثة مستويات طوفان في كل دور." },
    hard: { name: "خبير", start: 4, water: 4, note: "الجزيرة سريعة الغرق: أربعة مستويات طوفان في كل دور." },
  };

  const TREASURES = {
    earth: { name: "حجر الأرض", en: "Earth Stone", color: "#c9a36b", deep: "#5b4227" },
    wind: { name: "تمثال الريح", en: "Statue of the Wind", color: "#a8c7d1", deep: "#34525e" },
    fire: { name: "بلورة النار", en: "Crystal of Fire", color: "#df7562", deep: "#6a2b25" },
    water: { name: "كأس المحيط", en: "Ocean's Chalice", color: "#69b3d5", deep: "#1e4f67" },
  };
  const TREASURE_KEYS = ["earth", "wind", "fire", "water"];

  const TREASURE_ICONS = {
    earth: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2l10 6v10L16 30 6 18V8z" fill="currentColor" opacity=".92"/><path d="M16 6l6 3.6v6L16 24l-6-8.4v-6z" fill="#0b1d22" opacity=".32"/><path d="M16 9l2.6 5.2L16 20l-2.6-5.8z" fill="currentColor"/></svg>',
    wind: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 11h14a4 4 0 1 0-4-4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 17h20a4 4 0 1 1-4 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 23h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    fire: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2c5 6 9 9 9 15a9 9 0 0 1-18 0c0-4 2-7 5-10 0 4 2 5 4 5 0-4-1-7 0-10z" fill="currentColor"/><path d="M16 16c2 2 3 4 3 6a3 3 0 0 1-6 0c0-2 1-4 3-6z" fill="#2d1210" opacity=".48"/></svg>',
    water: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 6h12v4h-2v4c4 1 6 4 6 8 0 5-4 8-10 8s-10-3-10-8c0-4 2-7 6-8V10h-2z" fill="currentColor" opacity=".92"/><path d="M16 16c3 3 5 5 5 7.4a5 5 0 0 1-10 0c0-2.4 2-4.4 5-7.4z" fill="#0b2735" opacity=".38"/><path d="M7 26h18" stroke="currentColor" stroke-width="1.6" opacity=".6"/></svg>',
  };

  const ROLES = {
    explorer: { name: "المستكشف", en: "Explorer", icon: "🧭", color: "#66c7a8", start: "copper", power: "يتحرك ويدعّم التايلات المجاورة قُطريًا أيضًا." },
    pilot: { name: "الطيّار", en: "Pilot", icon: "🚁", color: "#e6ba68", start: "fools", power: "يطير إلى أي تايل غير غارق مرة واحدة في كل دور بإجراء واحد." },
    engineer: { name: "المهندس", en: "Engineer", icon: "🛠️", color: "#e08b5f", start: "bronze", power: "يدعّم تايلين متجاورين بالإجراء نفسه." },
    diver: { name: "الغوّاص", en: "Diver", icon: "🤿", color: "#6faee0", start: "iron", power: "يمرّ عبر التايلات الغارقة والمغمورة، وينجو إلى أي تايل عند الغرق." },
    messenger: { name: "الرسول", en: "Messenger", icon: "✉️", color: "#c79ae0", start: "silver", power: "يعطي بطاقة كنز لأي زميل دون شرط الوقوف على التايل نفسه." },
    navigator: { name: "الملاح", en: "Navigator", icon: "🧭", color: "#7fc8de", start: "gold", power: "يحرّك زميلًا آخر خطوتين متجاورتين بإجراء واحد." },
  };

  const TILE_BLUEPRINTS = [
    { id: "breakers-bridge", name: "جسر الأمواج", en: "Breakers Bridge", icon: "bridge", theme: "wild" },
    { id: "bronze-gate", name: "البوابة البرونزية", en: "Bronze Gate", icon: "gate", theme: "gate", start: "engineer" },
    { id: "cave-embers", name: "كهف الجمر", en: "Cave of Embers", icon: "cave", theme: "fire", treasure: "fire" },
    { id: "cave-shadows", name: "كهف الظلال", en: "Cave of Shadows", icon: "cave", theme: "fire", treasure: "fire" },
    { id: "cliffs-abandon", name: "منحدرات الهجران", en: "Cliffs of Abandon", icon: "cliffs", theme: "earth" },
    { id: "copper-gate", name: "البوابة النحاسية", en: "Copper Gate", icon: "gate", theme: "gate", start: "explorer" },
    { id: "coral-palace", name: "قصر المرجان", en: "Coral Palace", icon: "palace", theme: "water", treasure: "water" },
    { id: "crimson-forest", name: "الغابة القرمزية", en: "Crimson Forest", icon: "forest", theme: "wild" },
    { id: "dunes-deception", name: "كثبان الخداع", en: "Dunes of Deception", icon: "dunes", theme: "earth" },
    { id: "fools-landing", name: "مرسى الحمقى", en: "Fools' Landing", icon: "fools", theme: "fools", start: "pilot" },
    { id: "gold-gate", name: "البوابة الذهبية", en: "Gold Gate", icon: "gate", theme: "gate", start: "navigator" },
    { id: "howling-garden", name: "حديقة العويل", en: "Howling Garden", icon: "garden", theme: "wind", treasure: "wind" },
    { id: "iron-gate", name: "البوابة الحديدية", en: "Iron Gate", icon: "gate", theme: "gate", start: "diver" },
    { id: "lost-lagoon", name: "البحيرة المفقودة", en: "Lost Lagoon", icon: "lagoon", theme: "water" },
    { id: "misty-marsh", name: "مستنقع الضباب", en: "Misty Marsh", icon: "marsh", theme: "wild" },
    { id: "observatory", name: "المرصد", en: "Observatory", icon: "observatory", theme: "wind" },
    { id: "phantom-rock", name: "صخرة الشبح", en: "Phantom Rock", icon: "rock", theme: "earth" },
    { id: "silver-gate", name: "البوابة الفضية", en: "Silver Gate", icon: "gate", theme: "gate", start: "messenger" },
    { id: "temple-moon", name: "معبد القمر", en: "Temple of the Moon", icon: "temple", theme: "earth", treasure: "earth" },
    { id: "temple-sun", name: "معبد الشمس", en: "Temple of the Sun", icon: "temple", theme: "earth", treasure: "earth" },
    { id: "tidal-palace", name: "قصر المد", en: "Tidal Palace", icon: "palace", theme: "water", treasure: "water" },
    { id: "twilight-hollow", name: "وادي الغسق", en: "Twilight Hollow", icon: "hollow", theme: "wind" },
    { id: "watchtower", name: "برج المراقبة", en: "Watchtower", icon: "tower", theme: "wind" },
    { id: "whispering-garden", name: "حديقة الهمس", en: "Whispering Garden", icon: "garden", theme: "wind", treasure: "wind" },
  ];

  const THEMES = {
    earth: ["#775b3a", "#34281a"],
    wind: ["#526e77", "#202f35"],
    fire: ["#7a3b32", "#321817"],
    water: ["#2e627a", "#102b39"],
    gate: ["#6a5b3b", "#29241a"],
    fools: ["#2f7b6d", "#103832"],
    wild: ["#3d6650", "#172e24"],
  };

  const TILE_ICONS = {
    bridge: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 23h28M5 23v5M27 23v5M5 23c0-8 5-13 11-13s11 5 11 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 21c1-5 4-8 8-8s7 3 8 8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".6"/></svg>',
    gate: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 28V13L16 4l11 9v15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 28V15a6 6 0 0 1 12 0v13" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 20v8" stroke="currentColor" stroke-width="2" opacity=".65"/></svg>',
    cave: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 27L12 6l7 10 4-5 6 16z" fill="currentColor" opacity=".9"/><path d="M12 27c0-5 2-9 6-9s6 4 6 9z" fill="#07181d" opacity=".62"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/></svg>',
    cliffs: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 27l8-18 5 8 4-5 9 15z" fill="currentColor" opacity=".88"/><path d="M10 9l3 7M18 15l3 4" stroke="#07181d" stroke-width="1.4" opacity=".35"/></svg>',
    palace: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 27h24M7 27V16h18v11M4 16l12-9 12 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 27v-6a4 4 0 0 1 8 0v6" fill="currentColor" opacity=".45"/><path d="M16 4v3" stroke="currentColor" stroke-width="2"/></svg>',
    forest: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l7 10h-4l6 8H7l6-8H9z" fill="currentColor" opacity=".9"/><path d="M16 20v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4 23l4-6h2l4 6zM18 23l4-6h2l4 6z" fill="currentColor" opacity=".52"/></svg>',
    dunes: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 25c6-5 8 2 14-3s9-2 14 3v4H2z" fill="currentColor" opacity=".88"/><path d="M4 16c5-4 7 1 12-3s8-1 12 3" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><circle cx="23" cy="7" r="3" fill="currentColor" opacity=".7"/></svg>',
    fools: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M6 19h9l4-8h5l3 8M2 19h29" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 11l4-4M24 7v4M24 7h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    garden: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M16 17c-6 0-9-3-9-8 6 0 9 3 9 8zM16 22c6 0 9-3 9-8-6 0-9 3-9 8z" fill="currentColor" opacity=".84"/><circle cx="16" cy="8" r="4" fill="currentColor"/></svg>',
    lagoon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 13c4-4 8-4 12 0s8 4 12 0 4-3 4-3M2 21c4-4 8-4 12 0s8 4 12 0 4-3 4-3M2 28c4-4 8-4 12 0s8 4 12 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
    marsh: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 25c4-3 7-3 11 0s7 3 11 0 4-2 6-1M9 25V10M16 25V7M23 25V13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 14l-4-4M9 18l4-4M16 12l-4-4M16 18l4-4M23 17l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    observatory: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27h22M8 27V15h16v12M6 15l10-8 10 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 7v-4M11 5l10-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="19" r="3" fill="currentColor" opacity=".55"/></svg>',
    rock: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25l4-10 6-5 6 3 6 12z" fill="currentColor" opacity=".9"/><path d="M9 15l4 3 4-5 4 4 4-1" fill="none" stroke="#07181d" stroke-width="1.3" opacity=".32"/><circle cx="9" cy="8" r="1.4" fill="currentColor" opacity=".6"/></svg>',
    temple: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 27h24M6 24h20M8 24V12h16v12M4 12l12-7 12 7z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M12 24v-7h8v7" fill="currentColor" opacity=".4"/></svg>',
    hollow: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 1 1-9.2 3.8M16 8a8 8 0 1 0 5.7 2.3M16 13a3 3 0 1 0 2.1.9" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
    tower: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 27V9h12v18M7 27h18M12 9V5h8v4M13 14h6M13 19h6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4V1" stroke="currentColor" stroke-width="2"/></svg>',
  };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let flowTimer = null;
  let aiTimer = null;
  let destroyed = false;
  let cardSeq = 1;
  let applyingNet = false;

  /* ------------------------------ أدوات عامة ------------------------------ */

  function card(kind, treasure) {
    const item = { uid: "c" + cardSeq++, kind };
    if (treasure) item.treasure = treasure;
    return item;
  }

  function makeCard(kind, treasure) {
    return card(kind, treasure);
  }

  function treasureCount(player, type) {
    return player.hand.filter((item) => item.kind === "treasure" && item.treasure === type).length;
  }

  function teamTreasureCount(type) {
    return state.players.reduce((sum, player) => sum + treasureCount(player, type), 0);
  }

  function treasureDeck() {
    const deck = [];
    TREASURE_KEYS.forEach((type) => {
      for (let index = 0; index < 5; index++) deck.push(makeCard("treasure", type));
    });
    for (let index = 0; index < 3; index++) deck.push(makeCard("waters"));
    for (let index = 0; index < 3; index++) deck.push(makeCard("heli"));
    for (let index = 0; index < 2; index++) deck.push(makeCard("sandbag"));
    return U.shuffle(deck);
  }

  function difficulties(key) {
    return DIFFICULTIES[key] || DIFFICULTIES.medium;
  }

  function waterNumber() {
    if (!state || state.waterIndex >= WATER_TRACK.length) return null;
    const value = WATER_TRACK[state.waterIndex];
    return value === "skull" ? null : value;
  }

  function foolsTile() {
    return state ? state.tiles.find((tile) => tile.id === "fools-landing") : null;
  }

  function tileById(id) {
    return state ? state.tiles.find((tile) => tile.id === id) || null : null;
  }

  function tileAt(row, col) {
    return state ? state.tiles.find((tile) => tile.row === row && tile.col === col) || null : null;
  }

  function neighbours(tile, diagonal) {
    if (!tile) return [];
    const offsets = diagonal
      ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return offsets.map(([dr, dc]) => tileAt(tile.row + dr, tile.col + dc)).filter(Boolean);
  }

  function roleMeta(player) {
    return ROLES[player && player.role] || ROLES.explorer;
  }

  function current() {
    return state ? state.players[state.turn] : null;
  }

  function canControl() {
    if (!state || state.over) return false;
    return BG.coop.canAct(apiRef, state.players[state.turn], state.turn, state.over);
  }

  function note(html, kind) {
    if (!state) return;
    state.log.push({ html: html, kind: kind || "" });
    if (state.log.length > 16) state.log.shift();
    if (apiRef && typeof apiRef.log === "function") apiRef.log(html, kind || "");
  }

  function sound(name, fallback) {
    try {
      if (FX && typeof FX.sound === "function") FX.sound(fallback || name);
    } catch (err) { /* الصوت اختياري */ }
  }

  function toast(message) {
    try {
      if (apiRef && typeof apiRef.toast === "function") apiRef.toast(message, "warn");
    } catch (err) { /* التنبيه اختياري */ }
  }

  function netSync() {
    if (!apiRef || !apiRef.net || !apiRef.net.enabled || apiRef.net.boot) return;
    try {
      if (typeof apiRef.net.sendState === "function") apiRef.net.sendState();
    } catch (err) { /* الشبكة اختيارية */ }
  }

  function later(fn, ms) {
    if (flowTimer) clearTimeout(flowTimer);
    flowTimer = setTimeout(() => {
      flowTimer = null;
      if (!destroyed) fn();
    }, Math.max(0, ms || 0));
  }

  /* ------------------------------ إنشاء اللعبة ------------------------------ */

  function createInitialState(seats, difficultyKey) {
    cardSeq = 1;
    const start = difficulties(difficultyKey);
    const shuffled = U.shuffle(TILE_BLUEPRINTS.slice());
    const tiles = SLOTS.map((slot, index) => Object.assign({}, shuffled[index], {
      row: slot.row,
      col: slot.col,
      flooded: false,
      sunk: false,
    }));

    const localTiles = tiles.slice();
    const floodDeck = U.shuffle(tiles.map((tile) => tile.id));
    const floodDiscard = [];
    for (let index = 0; index < 6; index++) {
      const id = floodDeck.pop();
      const tile = localTiles.find((item) => item.id === id);
      if (tile) tile.flooded = true;
      if (id) floodDiscard.push(id);
    }

    const roleKeys = U.shuffle(Object.keys(ROLES)).slice(0, Math.max(2, Math.min(4, seats.length)));
    const players = seats.slice(0, 4).map((seat, index) => {
      const role = roleKeys[index % roleKeys.length];
      const roleInfo = ROLES[role];
      return {
        index,
        name: seat && seat.name ? seat.name : "لاعب " + (index + 1),
        type: seat && seat.type === "cpu" ? "cpu" : "human",
        isCpu: !!(seat && seat.type === "cpu"),
        level: AI.level(seat && seat.level),
        peerId: seat && seat.peerId ? seat.peerId : null,
        profile: seat && seat.profile ? seat.profile : null,
        role,
        pos: (tiles.find((tile) => tile.start === role) || {}).id || "fools-landing",
        hand: [],
      };
    });

    const next = {
      players,
      tiles,
      floodDeck,
      floodDiscard,
      treasureDeck: treasureDeck(),
      treasureDiscard: [],
      treasures: {
        earth: { got: false, lost: false },
        wind: { got: false, lost: false },
        fire: { got: false, lost: false },
        water: { got: false, lost: false },
      },
      turn: 0,
      turnNo: 1,
      actionsLeft: 3,
      waterIndex: start.start,
      phase: "actions",
      mode: null,
      pilotUsed: false,
      engineerBonus: false,
      treasureLeft: 0,
      floodLeft: 0,
      pendingRescue: null,
      discardReturn: null,
      notice: "افحصوا الخريطة ووزّعوا الأدوار: الفريق كله يعمل معًا.",
      log: [],
      over: false,
      result: null,
      flash: null,
      difficulty: difficultyKey,
    };

    state = next;
    state.players.forEach((player) => {
      for (let draw = 0; draw < 2; draw++) {
        let guard = 0;
        while (guard++ < 40) {
          const currentCard = drawTreasureCard();
          if (!currentCard) break;
          if (currentCard.kind === "waters") {
            state.treasureDeck.unshift(currentCard);
            continue;
          }
          player.hand.push(currentCard);
          break;
        }
      }
    });
    return next;
  }

  function drawTreasureCard() {
    if (!state) return null;
    if (!state.treasureDeck.length) {
      if (!state.treasureDiscard.length) return null;
      state.treasureDeck = U.shuffle(state.treasureDiscard);
      state.treasureDiscard = [];
      note("أُعيد خلط كومة الكنوز المكشوفة لتكوين رزمة جديدة.", "accent");
      sound("shuffle");
    }
    return state.treasureDeck.pop() || null;
  }

  function drawFloodCard() {
    if (!state) return null;
    if (!state.floodDeck.length) {
      if (!state.floodDiscard.length) return null;
      state.floodDeck = U.shuffle(state.floodDiscard);
      state.floodDiscard = [];
      note("نفدت رزمة الطوفان؛ أُعيد خلط البطاقات المكشوفة فوق الرزمة.", "accent");
      sound("shuffle");
    }
    return state.floodDeck.pop() || null;
  }

  /* ------------------------------ الحركة والإجراءات ------------------------------ */

  let flashTimer = null;

  function flashTile(id, kind) {
    if (!state) return;
    state.flash = { id: id, kind: kind || "flood" };
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flashTimer = null;
      if (state && state.flash && state.flash.id === id) {
        state.flash = null;
        render();
      }
    }, 1000);
  }

  function sortedHand(player) {
    const order = { treasure: 0, heli: 1, sandbag: 2 };
    player.hand.sort((a, b) => {
      const byKind = (order[a.kind] == null ? 9 : order[a.kind]) - (order[b.kind] == null ? 9 : order[b.kind]);
      if (byKind) return byKind;
      return TREASURE_KEYS.indexOf(a.treasure) - TREASURE_KEYS.indexOf(b.treasure);
    });
  }

  function cardName(item) {
    if (!item) return "بطاقة";
    if (item.kind === "treasure") return "بطاقة " + TREASURES[item.treasure].name;
    if (item.kind === "heli") return "بطاقة هليكوبتر";
    if (item.kind === "sandbag") return "بطاقة كيس رمل";
    return "بطاقة المياه";
  }

  function cardIcon(item) {
    if (item.kind === "treasure") return TREASURE_ICONS[item.treasure];
    if (item.kind === "heli") return '<span aria-hidden="true" style="font-size:1.4rem">🚁</span>';
    if (item.kind === "sandbag") return '<span aria-hidden="true" style="font-size:1.4rem">🧱</span>';
    return '<span aria-hidden="true" style="font-size:1.4rem">🌊</span>';
  }

  function legalMoves(player) {
    const out = new Set();
    if (!state || !player) return out;
    const from = tileById(player.pos);
    if (!from) return out;
    if (player.role === "pilot" && !state.pilotUsed) {
      state.tiles.forEach((tile) => {
        if (!tile.sunk) out.add(tile.id);
      });
    }
    const diagonal = player.role === "explorer";
    neighbours(from, diagonal).forEach((tile) => {
      if (!tile.sunk) out.add(tile.id);
    });
    if (player.role === "diver") {
      const seen = new Set([from.id]);
      const queue = [from];
      while (queue.length) {
        const tile = queue.shift();
        neighbours(tile, false).forEach((next) => {
          if (seen.has(next.id)) return;
          seen.add(next.id);
          queue.push(next);
          if (!next.sunk) out.add(next.id);
        });
      }
    }
    out.delete(from.id);
    return out;
  }

  function legalShore(player) {
    const out = new Set();
    if (!state || !player) return out;
    const from = tileById(player.pos);
    if (!from) return out;
    if (from.flooded && !from.sunk) out.add(from.id);
    neighbours(from, player.role === "explorer").forEach((tile) => {
      if (tile.flooded && !tile.sunk) out.add(tile.id);
    });
    return out;
  }

  function legalNavMoves(player) {
    const out = new Set();
    if (!state || !player) return out;
    const from = tileById(player.pos);
    if (!from) return out;
    const seen = new Set([from.id]);
    let frontier = [from];
    for (let step = 0; step < 2; step++) {
      const nextFrontier = [];
      frontier.forEach((tile) => {
        neighbours(tile, false).forEach((next) => {
          if (seen.has(next.id) || next.sunk) return;
          seen.add(next.id);
          nextFrontier.push(next);
          out.add(next.id);
        });
      });
      frontier = nextFrontier;
    }
    out.delete(from.id);
    return out;
  }

  function captureTile(player) {
    if (!state || !player) return null;
    const tile = tileById(player.pos);
    if (!tile || tile.sunk || !tile.treasure) return null;
    const treasure = state.treasures[tile.treasure];
    if (!treasure || treasure.got || treasure.lost) return null;
    return tile;
  }

  function canCapture(player) {
    const tile = captureTile(player);
    if (!tile) return false;
    return treasureCount(player, tile.treasure) >= 4;
  }

  function allTreasures() {
    return TREASURE_KEYS.every((type) => state.treasures[type].got);
  }

  function foolsCount() {
    const tile = foolsTile();
    if (!tile || tile.sunk) return 0;
    return state.players.filter((player) => player.pos === tile.id).length;
  }

  function heliHolder() {
    if (!state) return null;
    return state.players.find((player) => player.hand.some((item) => item.kind === "heli")) || null;
  }

  function canEscape() {
    if (!state || state.over) return false;
    if (!allTreasures()) return false;
    const tile = foolsTile();
    if (!tile || tile.sunk) return false;
    if (state.players.some((player) => player.pos !== tile.id)) return false;
    return !!heliHolder();
  }

  function afterAction() {
    if (!state || state.over) return;
    render();
    if (state.phase !== "actions") return;
    const player = current();
    if (state.actionsLeft <= 0) {
      later(() => {
        if (state && !state.over && state.phase === "actions") endActions();
      }, 700);
    } else if (player && player.isCpu) {
      queueAi();
    }
  }

  function afterFreeAction() {
    if (!state || state.over) return;
    render();
    if (current() && current().isCpu) queueAi();
  }

  function tryMove(tileId) {
    if (!state || state.over || state.phase !== "actions") return false;
    const player = current();
    const destination = tileById(tileId);
    if (!player || !destination || destination.sunk) {
      toast("اختر تايلًا غير غارق.");
      return false;
    }
    if (!legalMoves(player).has(tileId)) {
      toast("هذه الحركة غير مسموحة من موقعك الحالي.");
      sound("error");
      return false;
    }
    const fromTile = tileById(player.pos);
    const normalNeighbour = fromTile && neighbours(fromTile, false).some((tile) => tile.id === tileId);
    if (player.role === "pilot" && !normalNeighbour) state.pilotUsed = true;
    player.pos = tileId;
    state.actionsLeft -= 1;
    state.mode = null;
    flashTile(tileId, "move");
    sound("move");
    note("<strong>" + esc(player.name) + "</strong> انتقل إلى <strong>" + esc(destination.name) + "</strong>.", "");
    afterAction();
    return true;
  }

  function doShore(tileId) {
    if (!state || state.over || state.phase !== "actions") return false;
    const player = current();
    const tile = tileById(tileId);
    if (!player || !tile || tile.sunk || !tile.flooded) {
      toast("هذا التايل ليس مغمورًا ولا يمكن تدعيمه.");
      return false;
    }
    if (!legalShore(player).has(tileId)) {
      toast("يمكنك التدعيم من تايلك أو التايلات المجاورة فقط.");
      sound("error");
      return false;
    }
    const free = player.role === "engineer" && state.engineerBonus;
    if (!free && state.actionsLeft <= 0) {
      toast("لم يتبقَّ لديك إجراءات.");
      return false;
    }
    tile.flooded = false;
    if (!free) {
      state.actionsLeft -= 1;
      if (player.role === "engineer") state.engineerBonus = true;
    } else {
      state.engineerBonus = false;
    }
    sound("reveal");
    flashTile(tile.id, "shore");
    note("<strong>" + esc(player.name) + "</strong> دعّم <strong>" + esc(tile.name) + "</strong>" + (free ? " ضمن إجراء المهندس المزدوج." : "."), "good");
    if (player.role === "engineer" && state.engineerBonus) state.mode = { kind: "shore" };
    else state.mode = null;
    afterAction();
    return true;
  }

  function performGive(player, target, item) {
    if (!state || state.over || state.phase !== "actions") return false;
    if (!player || !target || player.index === target.index) return false;
    if (!item || item.kind !== "treasure") {
      toast("يمكن إعطاء بطاقات الكنز فقط، لا البطاقات الخاصة.");
      return false;
    }
    if (target.hand.length >= 5) {
      toast("يد " + target.name + " ممتلئة (٥ بطاقات).");
      return false;
    }
    if (player.role !== "messenger" && player.pos !== target.pos) {
      toast("يجب أن تكونا على التايل نفسه. الرسول فقط يعطي من أي مكان.");
      return false;
    }
    if (state.actionsLeft <= 0) {
      toast("لم يتبقَّ لديك إجراءات.");
      return false;
    }
    const handIndex = player.hand.findIndex((cardItem) => cardItem.uid === item.uid);
    if (handIndex < 0) return false;
    player.hand.splice(handIndex, 1);
    target.hand.push(item);
    sortedHand(target);
    state.actionsLeft -= 1;
    state.mode = null;
    sound("card");
    note("<strong>" + esc(player.name) + "</strong> أعطى <strong>" + esc(target.name) + "</strong> " + esc(cardName(item)) + ".", "accent");
    afterAction();
    return true;
  }

  function giveFromHand(item) {
    if (!state || state.mode && state.mode.kind !== "give") return false;
    const mode = state.mode || {};
    if (mode.kind !== "give" || mode.target == null) {
      toast("اختر زميلًا أولًا ثم اضغط البطاقة.");
      return false;
    }
    return performGive(current(), state.players[mode.target], item);
  }

  function captureTreasure() {
    if (!state || state.over || state.phase !== "actions") return false;
    const player = current();
    const tile = captureTile(player);
    if (!player || !tile) {
      toast("قف على أحد تايلي الكنز المطابقين أولًا.");
      return false;
    }
    if (!canCapture(player)) {
      toast("تحتاج إلى ٤ بطاقات مطابقة في يدك.");
      return false;
    }
    if (state.actionsLeft <= 0) {
      toast("لم يتبقَّ لديك إجراءات.");
      return false;
    }
    const type = tile.treasure;
    let removed = 0;
    player.hand = player.hand.filter((item) => {
      if (removed < 4 && item.kind === "treasure" && item.treasure === type) {
        removed += 1;
        state.treasureDiscard.push(item);
        return false;
      }
      return true;
    });
    state.treasures[type].got = true;
    state.actionsLeft -= 1;
    state.mode = null;
    sound("unlock");
    flashTile(tile.id, "treasure");
    note("🏆 استخرج الفريق <strong>" + esc(TREASURES[type].name) + "</strong> على <strong>" + esc(tile.name) + "</strong>!", "good");
    if (allTreasures()) {
      state.notice = "اكتملت الكنوز الأربعة! اتجهوا جميعًا إلى مرسى الحمقى ثم اهربوا بالهليكوبتر.";
      note("الكنوز الأربعة بحوزة الفريق. المهمة الآن: الجميع إلى <strong>مرسى الحمقى</strong> ثم بطاقة هليكوبتر.", "accent");
    }
    afterAction();
    return true;
  }

  function removeCard(player, uid) {
    if (!player) return null;
    const index = player.hand.findIndex((item) => item.uid === uid);
    if (index < 0) return null;
    return player.hand.splice(index, 1)[0];
  }

  function useSandbag(tileId) {
    if (!state || state.over || !state.mode || state.mode.kind !== "sandbag") return false;
    const player = current();
    const tile = tileById(tileId);
    if (!player || !tile) return false;
    const item = removeCard(player, state.mode.cid);
    if (!item) {
      state.mode = null;
      render();
      return false;
    }
    if (!tile.flooded || tile.sunk) {
      player.hand.push(item);
      sortedHand(player);
      toast("كيس الرمل يُستخدم على تايل مغمور فقط.");
      return false;
    }
    tile.flooded = false;
    state.treasureDiscard.push(item);
    state.mode = null;
    sound("reveal");
    flashTile(tile.id, "shore");
    note("<strong>" + esc(player.name) + "</strong> استخدم كيس رمل لإنقاذ <strong>" + esc(tile.name) + "</strong> دون إجراء.", "good");
    afterFreeAction();
    return true;
  }

  function useHelicopterMove(tileId) {
    if (!state || state.over || !state.mode || state.mode.kind !== "helicopter") return false;
    const player = current();
    const tile = tileById(tileId);
    if (!player || !tile || tile.sunk) {
      toast("اختر تايلًا غير غارق.");
      return false;
    }
    const item = removeCard(player, state.mode.cid);
    if (!item) {
      state.mode = null;
      render();
      return false;
    }
    const group = state.players.filter((mate) => mate.pos === player.pos);
    group.forEach((mate) => {
      mate.pos = tile.id;
    });
    state.treasureDiscard.push(item);
    state.mode = null;
    sound("move");
    flashTile(tile.id, "move");
    note("<strong>" + esc(player.name) + "</strong> استخدم هليكوبتر لنقل " + esc(group.map((mate) => mate.name).join(" و")) + " إلى <strong>" + esc(tile.name) + "</strong>.", "accent");
    afterFreeAction();
    return true;
  }

  function escapeWithHelicopter() {
    if (!state || state.over) return false;
    if (!allTreasures()) {
      toast("اجمعوا الكنوز الأربعة أولًا.");
      return false;
    }
    const fools = foolsTile();
    if (!fools || fools.sunk) {
      toast("مرسى الحمقى غارق!");
      return false;
    }
    if (state.players.some((player) => player.pos !== fools.id)) {
      toast("يجب أن يقف جميع أفراد الفريق على مرسى الحمقى.");
      return false;
    }
    const holder = heliHolder();
    if (!holder) {
      toast("الفريق بحاجة إلى بطاقة هليكوبتر للهروب.");
      return false;
    }
    const item = holder.hand.find((cardItem) => cardItem.kind === "heli");
    removeCard(holder, item.uid);
    state.treasureDiscard.push(item);
    sound("win");
    note("🚁 أقلعت الهليكوبتر بالفريق والكنوز الأربعة. نجحتم جميعًا!", "good");
    finishWin();
    return true;
  }

  /* ------------------------------ الطوفان ونهاية الدور ------------------------------ */

  function endActions() {
    if (!state || state.over || state.phase !== "actions") return;
    state.mode = null;
    state.phase = "drawTreasure";
    state.treasureLeft = 2;
    state.notice = "اسحبوا بطاقتي كنز من رزمة الكنوز.";
    render();
    later(drawNextTreasure, 520);
  }

  function drawNextTreasure() {
    if (!state || state.over || state.phase !== "drawTreasure") return;
    if (state.treasureLeft <= 0) {
      startFlood();
      return;
    }
    state.treasureLeft -= 1;
    const player = current();
    const item = drawTreasureCard();
    if (!item) {
      note("لا توجد بطاقات كنز متبقية. يواصل الفريق مواجهة الطوفان.", "warn");
      startFlood();
      return;
    }
    if (item.kind === "waters") {
      state.treasureDiscard.push(item);
      waterRise();
      if (state.over) return;
      render();
      later(drawNextTreasure, 520);
      return;
    }
    player.hand.push(item);
    sortedHand(player);
    sound("draw");
    note("<strong>" + esc(player.name) + "</strong> سحب " + esc(cardName(item)) + ".", item.kind === "treasure" ? "" : "accent");
    flashTile(player.pos, "draw");
    render();
    if (player.hand.length > 5) {
      state.phase = "discard";
      state.discardReturn = "treasure";
      state.notice = "تجاوزت الحد المسموح (٥ بطاقات). اختر بطاقة لتتخلص منها.";
      render();
      if (player.isCpu) later(aiDiscard, 460);
      return;
    }
    later(drawNextTreasure, 420);
  }

  function discardCard(uid) {
    if (!state || state.over || state.phase !== "discard") return false;
    const player = current();
    if (!player) return false;
    const item = removeCard(player, uid);
    if (!item) return false;
    state.treasureDiscard.push(item);
    sound("card");
    note("<strong>" + esc(player.name) + "</strong> تخلّص من " + esc(cardName(item)) + " بسبب حد اليد.", "warn");
    if (player.hand.length > 5) {
      render();
      if (player.isCpu) later(aiDiscard, 320);
      return true;
    }
    state.phase = state.discardReturn || "drawTreasure";
    state.discardReturn = null;
    state.notice = state.phase === "flood" ? "يواصل الطوفان زحفه." : "أكملوا سحب بطاقات الكنز.";
    render();
    if (state.phase === "drawTreasure") later(drawNextTreasure, 420);
    else if (state.phase === "flood") startFlood();
    return true;
  }

  function waterRise() {
    if (!state || state.over) return;
    state.waterIndex += 1;
    sound("error");
    if (state.waterIndex >= WATER_TRACK.length || WATER_TRACK[state.waterIndex] === "skull") {
      state.waterIndex = WATER_TRACK.length - 1;
      finishLose("water");
      return;
    }
    if (state.floodDiscard.length) {
      state.floodDeck = U.shuffle(state.floodDiscard).concat(state.floodDeck);
      state.floodDiscard = [];
    }
    const level = waterNumber();
    state.notice = "ارتفع الماء إلى المستوى " + ar(level) + ". أُعيد خلط بطاقات الطوفان المكشوفة فوق الرزمة.";
    note("🌊 <strong>ارتفع الماء!</strong> المستوى الآن <strong>" + ar(level) + "</strong>، وأُعيد خلط كومة الطوفان المكشوفة فوق رزمة السحب.", "warn");
    flashTile(foolsTile() ? foolsTile().id : "", "water");
  }

  function startFlood() {
    if (!state || state.over || state.phase !== "drawTreasure") return;
    const level = waterNumber();
    if (!level) {
      finishLose("water");
      return;
    }
    state.phase = "flood";
    state.mode = null;
    state.floodLeft = level;
    state.notice = "الطوفان: " + ar(level) + " بطاقات. غمر أو أغرق التايلات المطابقة.";
    note("الجزيرة تغرق: اسحبوا <strong>" + ar(level) + "</strong> بطاقات طوفان.", "warn");
    render();
    later(floodNext, 520);
  }

  function removeFloodCard(id) {
    if (!state) return;
    state.floodDeck = state.floodDeck.filter((item) => item !== id);
    state.floodDiscard = state.floodDiscard.filter((item) => item !== id);
  }

  function floodNext() {
    if (!state || state.over || state.phase !== "flood" || state.pendingRescue) return;
    if (state.floodLeft <= 0) {
      beginNextTurn();
      return;
    }
    state.floodLeft -= 1;
    const id = drawFloodCard();
    if (!id) {
      state.notice = "لا توجد بطاقات طوفان متبقية. هدأت المياه مؤقتًا.";
      note("لا توجد بطاقات طوفان متبقية؛ توقف الطوفان هذه المرة.", "accent");
      state.floodLeft = 0;
      render();
      later(beginNextTurn, 460);
      return;
    }
    const tile = tileById(id);
    if (!tile) {
      later(floodNext, 200);
      return;
    }
    if (!tile.flooded) {
      tile.flooded = true;
      state.floodDiscard.push(id);
      sound("flip");
      flashTile(id, "flood");
      note("🌊 غُمر <strong>" + esc(tile.name) + "</strong>.", "warn");
      render();
      later(floodNext, 440);
      return;
    }
    const result = sinkTile(tile);
    if (result === "over" || state.over) return;
    if (result === "paused") return;
    render();
    later(floodNext, 560);
  }

  function rescueOptions(player, fromTile) {
    if (!player || !fromTile) return [];
    if (player.role === "pilot" || player.role === "diver") {
      return state.tiles.filter((tile) => !tile.sunk);
    }
    return neighbours(fromTile, player.role === "explorer").filter((tile) => !tile.sunk);
  }

  function sinkTile(tile) {
    if (!state || !tile || tile.sunk) return "ok";
    tile.sunk = true;
    tile.flooded = false;
    removeFloodCard(tile.id);
    sound("error");
    flashTile(tile.id, "sink");
    note("💀 <strong>" + esc(tile.name) + "</strong> غرق وسقط في الهاوية!", "warn");

    if (tile.id === "fools-landing") {
      finishLose("fools");
      return "over";
    }

    let treasureLost = null;
    TREASURE_KEYS.forEach((type) => {
      const treasure = state.treasures[type];
      if (!treasure || treasure.got || treasure.lost) return;
      const matching = state.tiles.filter((item) => item.treasure === type);
      if (matching.length && matching.every((item) => item.sunk)) treasureLost = type;
    });
    if (treasureLost) {
      state.treasures[treasureLost].lost = true;
      note("غرقت تايلتا <strong>" + esc(TREASURES[treasureLost].name) + "</strong> قبل استخراجه.", "warn");
      finishLose("treasure", treasureLost);
      return "over";
    }

    const stranded = state.players.filter((player) => player.pos === tile.id);
    if (!stranded.length) return "ok";
    const queue = stranded.map((player) => player.index);
    const options = rescueOptions(state.players[queue[0]], tile);
    if (!options.length) {
      finishLose("drown", null, state.players[queue[0]]);
      return "over";
    }
    state.phase = "rescue";
    state.pendingRescue = {
      from: tile.id,
      queue: queue,
      index: 0,
      playerIndex: queue[0],
      options: options.map((item) => item.id),
    };
    state.notice = "تايل غارق! اختاروا وجهة نجاة " + state.players[queue[0]].name + ".";
    render();
    if (current() && current().isCpu) queueAi(700);
    return "paused";
  }

  function chooseRescue(tileId) {
    if (!state || state.over || state.phase !== "rescue" || !state.pendingRescue) return false;
    const rescue = state.pendingRescue;
    if (!rescue.options.includes(tileId)) {
      toast("اختر أحد التايلات الآمنة المتاحة.");
      return false;
    }
    const player = state.players[rescue.playerIndex];
    const destination = tileById(tileId);
    if (!player || !destination) return false;
    player.pos = tileId;
    sound("move");
    flashTile(tileId, "move");
    note("<strong>" + esc(player.name) + "</strong> نجا من الغرق إلى <strong>" + esc(destination.name) + "</strong>.", "good");
    rescue.index += 1;
    if (rescue.index < rescue.queue.length) {
      rescue.playerIndex = rescue.queue[rescue.index];
      const fromTile = tileById(rescue.from);
      const options = rescueOptions(state.players[rescue.playerIndex], fromTile);
      if (!options.length) {
        finishLose("drown", null, state.players[rescue.playerIndex]);
        return false;
      }
      rescue.options = options.map((item) => item.id);
      state.notice = "أنقذوا " + state.players[rescue.playerIndex].name + " من التايل الغارق.";
      render();
      if (current() && current().isCpu) queueAi(650);
      return true;
    }
    state.pendingRescue = null;
    state.phase = "flood";
    state.notice = "نجا الفريق من الغرق. يواصل الطوفان.";
    render();
    later(floodNext, 520);
    return true;
  }

  function beginNextTurn() {
    if (!state || state.over) return;
    state.pendingRescue = null;
    state.floodLeft = 0;
    state.turn = (state.turn + 1) % state.players.length;
    state.turnNo += 1;
    state.actionsLeft = 3;
    state.phase = "actions";
    state.mode = null;
    state.pilotUsed = false;
    state.engineerBonus = false;
    state.discardReturn = null;
    const player = current();
    state.notice = "دور " + player.name + " — الفريق كله يستطيع تقديم المشورة.";
    note("🎲 دور <strong>" + esc(player.name) + "</strong> (" + esc(roleMeta(player).name) + ").", "accent");
    sound("turn");
    render();
    queueAi(650);
  }

  /* ------------------------------ نهاية المباراة ------------------------------ */

  function finishWin() {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    state.result = { win: true };
    if (flowTimer) clearTimeout(flowTimer);
    if (aiTimer) clearTimeout(aiTimer);
    if (flashTimer) clearTimeout(flashTimer);
    render();
    if (apiRef) {
      apiRef.gameOver({
        title: "نجا الفريق!",
        text: "استخرجتم الكنوز الأربعة ووصل الجميع إلى مرسى الحمقى، ثم أقلعت الهليكوبتر بالجزيرة خلفكم. فوز مشترك لكل اللاعبين.",
        winner: "فوز الفريق — الجميع أبطال",
        icon: "🚁",
        tone: "win",
      });
    }
  }

  function finishLose(reason, treasure, player) {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    let text = "غرقت الجزيرة قبل إتمام المهمة.";
    if (reason === "water") text = "وصل مستوى الماء إلى الجمجمة، وغمرت الجزيرة بالكامل.";
    else if (reason === "fools") text = "غرق مرسى الحمقى، ولم يعد أمام الفريق طريق للهروب.";
    else if (reason === "treasure") text = "غرقت آخر تايلتين لكنز " + (TREASURES[treasure] ? TREASURES[treasure].name : "") + " قبل استخراجه.";
    else if (reason === "drown") text = (player ? player.name + " " : "أحد أفراد الفريق ") + "غرق ولم يجد تايلًا آمنًا للنجاة.";
    state.result = { win: false, reason: reason };
    if (flowTimer) clearTimeout(flowTimer);
    if (aiTimer) clearTimeout(aiTimer);
    if (flashTimer) clearTimeout(flashTimer);
    note("انتهت المهمة بالخسارة: " + esc(text), "warn");
    render();
    if (apiRef) {
      apiRef.gameOver({
        title: "غرقت الجزيرة",
        text: text + " خسر الفريق معًا — حاولوا مرة أخرى بتعاون أفضل.",
        winner: "خسارة الفريق",
        icon: "🌊",
        tone: "lose",
      });
    }
  }

  /* ------------------------------ ذكاء الفريق ------------------------------ */

  function worstCard(player) {
    let worst = null;
    let worstScore = Infinity;
    player.hand.forEach((item) => {
      let score = 50;
      if (item.kind === "heli") score = 120;
      else if (item.kind === "sandbag") score = 85;
      else if (item.kind === "treasure") {
        const own = treasureCount(player, item.treasure);
        const team = teamTreasureCount(item.treasure);
        score = 20 + team * 2 + own * 8;
        if (own >= 4) score += 70;
        if (state.treasures[item.treasure].got) score -= 15;
      }
      if (score < worstScore) {
        worstScore = score;
        worst = item;
      }
    });
    return worst;
  }

  function aiDiscard() {
    if (!state || state.over || state.phase !== "discard") return;
    const player = current();
    if (!player || !player.isCpu) return;
    while (player.hand.length > 5) {
      const item = worstCard(player);
      if (!item) break;
      removeCard(player, item.uid);
      state.treasureDiscard.push(item);
      note("<strong>" + esc(player.name) + "</strong> تخلّص من " + esc(cardName(item)) + " بسبب حد اليد.", "warn");
    }
    if (player.hand.length > 5) {
      render();
      later(aiDiscard, 300);
      return;
    }
    state.phase = state.discardReturn || "drawTreasure";
    state.discardReturn = null;
    render();
    if (state.phase === "drawTreasure") later(drawNextTreasure, 350);
    else if (state.phase === "flood") startFlood();
  }

  function distanceFrom(tile) {
    const distances = Object.create(null);
    if (!tile) return distances;
    distances[tile.id] = 0;
    const queue = [tile];
    while (queue.length) {
      const item = queue.shift();
      neighbours(item, false).forEach((next) => {
        if (next.sunk || distances[next.id] != null) return;
        distances[next.id] = distances[item.id] + 1;
        queue.push(next);
      });
    }
    return distances;
  }

  function treasureTileOptions(type) {
    return state.tiles.filter((tile) => tile.treasure === type && !tile.sunk);
  }

  function nearestOf(player, tiles) {
    let best = null;
    let bestDistance = Infinity;
    tiles.forEach((tile) => {
      const distances = distanceFrom(tileById(player.pos));
      if (distances[tile.id] == null) return;
      if (distances[tile.id] < bestDistance) {
        bestDistance = distances[tile.id];
        best = tile;
      }
    });
    return best;
  }

  function aiGoal(player) {
    const fools = foolsTile();
    if (allTreasures()) return fools;
    const critical = state.tiles.filter((tile) => tile.flooded && !tile.sunk && (
      tile.id === "fools-landing" || (tile.treasure && !state.treasures[tile.treasure].got)
    ));
    if (critical.length) return nearestOf(player, critical);
    const ownCount = TREASURE_KEYS
      .filter((type) => !state.treasures[type].got && !state.treasures[type].lost)
      .map((type) => ({ type: type, count: treasureCount(player, type), team: teamTreasureCount(type), tiles: treasureTileOptions(type) }))
      .filter((entry) => entry.tiles.length)
      .sort((a, b) => b.count - a.count || b.team - a.team);
    if (ownCount.length) return nearestOf(player, ownCount[0].tiles);
    return fools;
  }

  function aiStep() {
    if (!state || state.over || destroyed) return;
    const player = current();
    if (!player || !player.isCpu) return;
    if (state.phase === "discard") {
      aiDiscard();
      return;
    }
    if (state.phase === "rescue") {
      const rescue = state.pendingRescue;
      if (!rescue) return;
      const options = rescue.options.map((id) => tileById(id)).filter(Boolean);
      let best = options[0];
      let bestScore = -1;
      options.forEach((tile) => {
        let score = 10;
        if (tile.id === "fools-landing") score += 80;
        if (tile.treasure && !state.treasures[tile.treasure].got) score += 45;
        if (tile.flooded) score -= 20;
        if (state.players.filter((mate) => mate.pos === tile.id).length) score += 8;
        if (score > bestScore) {
          bestScore = score;
          best = tile;
        }
      });
      if (best) chooseRescue(best.id);
      return;
    }
    if (state.phase !== "actions") return;
    if (state.actionsLeft <= 0) {
      endActions();
      return;
    }

    if (canEscape()) {
      escapeWithHelicopter();
      return;
    }
    if (canCapture(player)) {
      captureTreasure();
      return;
    }

    const floodedCritical = state.tiles.filter((tile) => tile.flooded && !tile.sunk && (
      tile.id === "fools-landing" || (tile.treasure && !state.treasures[tile.treasure].got)
    ));
    if (floodedCritical.length) {
      const sandbag = player.hand.find((item) => item.kind === "sandbag");
      if (sandbag) {
        state.mode = { kind: "sandbag", cid: sandbag.uid };
        const target = floodedCritical.slice().sort((a, b) => {
          const score = (tile) => (tile.id === "fools-landing" ? 90 : 60) + (state.treasures[tile.treasure] ? 0 : 10);
          return score(b) - score(a);
        })[0];
        useSandbag(target.id);
        return;
      }
      const shores = legalShore(player);
      if (shores.size) {
        let best = null;
        let bestScore = -1;
        shores.forEach((id) => {
          const tile = tileById(id);
          let score = 10;
          if (tile.id === "fools-landing") score += 100;
          if (tile.treasure && !state.treasures[tile.treasure].got) score += 65;
          if (tile.flooded) score += 5;
          if (score > bestScore) {
            bestScore = score;
            best = id;
          }
        });
        if (best) {
          state.mode = { kind: "shore" };
          doShore(best);
          return;
        }
      }
    }

    if (player.role === "messenger" || player.role === "navigator") {
      const item = player.hand.find((cardItem) => cardItem.kind === "treasure" && state.players.some((mate) => {
        if (mate.index === player.index || mate.hand.length >= 5) return false;
        if (player.role !== "messenger" && mate.pos !== player.pos) return false;
        return treasureCount(mate, cardItem.treasure) >= 3 && !state.treasures[cardItem.treasure].got;
      }));
      if (item) {
        const target = state.players.find((mate) => mate.index !== player.index && mate.hand.length < 5 && (player.role === "messenger" || mate.pos === player.pos) && treasureCount(mate, item.treasure) >= 3);
        if (target) {
          performGive(player, target, item);
          return;
        }
      }
    }

    const goal = aiGoal(player);
    if (goal) {
      if (goal.id === player.pos) {
        const moveShore = legalShore(player);
        if (moveShore.size) {
          const id = Array.from(moveShore)[0];
          state.mode = { kind: "shore" };
          doShore(id);
          return;
        }
        state.actionsLeft = 0;
        later(endActions, 400);
        return;
      }
      const moves = legalMoves(player);
      if (player.role === "pilot" && !state.pilotUsed && goal.id !== player.pos) {
        state.mode = { kind: "pilot" };
        tryMove(goal.id);
        return;
      }
      if (moves.has(goal.id)) {
        tryMove(goal.id);
        return;
      }
      const distances = distanceFrom(goal);
      let best = null;
      let bestDistance = Infinity;
      moves.forEach((id) => {
        if (distances[id] == null) return;
        if (distances[id] < bestDistance) {
          bestDistance = distances[id];
          best = id;
        }
      });
      if (best) {
        tryMove(best);
        return;
      }
    }

    const shores = legalShore(player);
    if (shores.size) {
      state.mode = { kind: "shore" };
      doShore(Array.from(shores)[0]);
      return;
    }
    state.actionsLeft = 0;
    later(endActions, 350);
  }

  function queueAi(ms) {
    if (!state || state.over || destroyed) return;
    const player = current();
    if (!player || !player.isCpu) return;
    if (!AI.autoAllowed(apiRef, player)) return;
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      aiTimer = null;
      if (!destroyed) aiStep();
    }, ms == null ? Math.max(320, AI.delay(player.level)) : ms);
  }

  /* ------------------------------ واجهة اللعب ------------------------------ */

  function navigateMove(tileId) {
    if (!state || state.over || state.phase !== "actions") return false;
    const player = current();
    const mode = state.mode || {};
    if (!player || player.role !== "navigator" || mode.kind !== "navigate" || mode.target == null) return false;
    const target = state.players[mode.target];
    const destination = tileById(tileId);
    if (!target || !destination) return false;
    if (!legalNavMoves(target).has(tileId)) {
      toast("يمكن للملاح تحريك الزميل خطوتين متجاورتين فقط.");
      sound("error");
      return false;
    }
    if (state.actionsLeft <= 0) {
      toast("لم يتبقَّ لديك إجراءات.");
      return false;
    }
    target.pos = tileId;
    state.actionsLeft -= 1;
    state.mode = null;
    sound("move");
    flashTile(tileId, "move");
    note("<strong>" + esc(player.name) + "</strong> حرّك <strong>" + esc(target.name) + "</strong> إلى <strong>" + esc(destination.name) + "</strong>.", "accent");
    afterAction();
    return true;
  }

  function phaseLabel() {
    if (!state) return "";
    if (state.phase === "actions") return "٣ إجراءات";
    if (state.phase === "drawTreasure") return "سحب الكنوز";
    if (state.phase === "discard") return "حد اليد";
    if (state.phase === "flood") return "زحف الماء";
    if (state.phase === "rescue") return "نجاة";
    return "انتهت المهمة";
  }

  function statusText() {
    if (!state) return "";
    if (state.over) return "انتهت المهمة";
    if (state.phase === "rescue") return "نجاة من الغرق";
    if (state.phase === "flood") return "الطوفان يزحف";
    if (state.phase === "drawTreasure") return "سحب بطاقات الكنز";
    if (state.phase === "discard") return "تخلص من بطاقة زائدة";
    return "دور " + current().name + " · " + ar(state.actionsLeft) + " إجراءات";
  }

  function cardShort(item) {
    if (!item) return "";
    if (item.kind === "treasure") {
      const info = TREASURES[item.treasure];
      return '<span class="fi-hand-mini" style="--mc:' + info.color + '">' + TREASURE_ICONS[item.treasure] + "<b>" + esc(info.name) + "</b></span>";
    }
    if (item.kind === "heli") return '<span class="fi-hand-mini is-special">🚁<b>هليكوبتر</b></span>';
    return '<span class="fi-hand-mini is-special">🧱<b>كيس رمل</b></span>';
  }

  function renderObjective() {
    const got = TREASURE_KEYS.filter((type) => state.treasures[type].got).length;
    const fools = foolsTile();
    const atFools = foolsCount();
    const total = state.players.length;
    const level = waterNumber();
    return '<div class="coop-objective">' +
      BG.coop.objectiveCard("الكنوز المستعادة", ar(got) + " / ٤", "من أربعة كنوز", "is-gold", got * 25) +
      BG.coop.objectiveCard("مستوى الماء", level ? ar(level) : "الجمجمة", difficultyName()) +
      BG.coop.objectiveCard("إجراءات الدور", state.phase === "actions" ? ar(state.actionsLeft) + " / ٣" : phaseLabel(), "الإجراءات المتبقية") +
      BG.coop.objectiveCard("الفريق في المرسى", ar(atFools) + " / " + ar(total), "نقطة الهروب", atFools === total ? "is-gold" : "") +
      BG.coop.objectiveCard("رزمة الطوفان", ar(state.floodDeck.length), "بطاقة متبقية", state.floodDeck.length <= 4 ? "is-danger" : "") +
      "</div>";
  }

  function difficultyName() {
    const info = difficulties(state && state.difficulty);
    return info.name + " · طوفان " + ar(info.water);
  }

  function renderBoard() {
    let targets = new Set();
    if (state.phase === "actions" && canControl() && state.mode) {
      const mode = state.mode;
      if (mode.kind === "move") targets = legalMoves(current());
      else if (mode.kind === "shore") targets = legalShore(current());
      else if (mode.kind === "sandbag") {
        state.tiles.forEach((tile) => { if (tile.flooded && !tile.sunk) targets.add(tile.id); });
      } else if (mode.kind === "helicopter") {
        state.tiles.forEach((tile) => { if (!tile.sunk) targets.add(tile.id); });
      } else if (mode.kind === "navigate" && mode.target != null) {
        targets = legalNavMoves(state.players[mode.target]);
      }
    }
    const cells = [];
    for (let row = 0; row < 6; row++) {
      const count = ROW_COUNTS[row];
      const start = (6 - count) / 2;
      for (let col = 0; col < 6; col++) {
        const place = ' style="grid-row:' + (row + 1) + ";grid-column:" + (col + 1) + '"';
        if (col < start || col >= start + count) {
          cells.push('<div class="fi-slot is-empty"' + place + ' aria-hidden="true"></div>');
          continue;
        }
        const tile = tileAt(row, col);
        if (!tile) {
          cells.push('<div class="fi-slot is-empty"' + place + ' aria-hidden="true"></div>');
          continue;
        }
        const theme = THEMES[tile.theme] || THEMES.wild;
        const here = state.players.filter((player) => player.pos === tile.id);
        const classes = ["fi-tile"];
        if (tile.flooded) classes.push("is-flooded");
        if (tile.sunk) classes.push("is-sunk");
        if (tile.treasure) classes.push("is-treasure");
        if (here.length) classes.push("is-here");
        if (targets.has(tile.id)) classes.push("is-target");
        if (state.flash && state.flash.id === tile.id) {
          classes.push(state.flash.kind === "sink" ? "is-sinking" : "is-recent");
        }
        const tag = tile.treasure
          ? TREASURES[tile.treasure].name
          : tile.id === "fools-landing" ? "نقطة الهروب" : tile.start ? "بوابة البداية" : "";
        const title = tile.name + " — " + (tile.sunk ? "غارق" : tile.flooded ? "مغمور" : "آمن") + (tag ? " · " + tag : "");
        const pawns = here.map((player) => {
          const role = roleMeta(player);
          return '<span class="fi-pawn' + (player.index === state.turn ? " is-current" : "") + '" style="--pc:' + role.color + '" title="' + esc(player.name + " · " + role.name) + '">' + role.icon + "</span>";
        }).join("");
        cells.push('<div class="fi-slot"' + place + '>' +
          '<button type="button" class="' + classes.join(" ") + '" data-tile="' + esc(tile.id) + '" style="--tile-a:' + theme[0] + ";--tile-b:" + theme[1] + '" title="' + esc(title) + '"' + (tile.sunk ? " disabled" : "") + ">" +
          '<span class="fi-tile-art">' + (TILE_ICONS[tile.icon] || TILE_ICONS.rock) + "</span>" +
          '<span class="fi-tile-name">' + esc(tile.name) + "</span>" +
          (tag ? '<span class="fi-tile-tag">' + esc(tag) + "</span>" : "") +
          (pawns ? '<span class="fi-pawns">' + pawns + "</span>" : "") +
          "</button></div>");
      }
    }

    return '<section class="fi-board-wrap">' +
      '<div class="fi-board-head"><div><strong>خريطة الجزيرة</strong> <span class="coop-chip">24 تايلًا · 6×6</span></div>' +
      '<div class="coop-btn-row">' +
      BG.coop.chip("الطوفان", ar(state.floodDeck.length) + " بطاقة", state.floodDeck.length <= 4 ? "is-warn" : "") +
      BG.coop.chip("الماء", waterNumber() ? ar(waterNumber()) : "الجمجمة", "is-warn") +
      '<button type="button" class="coop-btn small ghost" data-fi-action="help-rules">القواعد</button>' +
      "</div></div>" +
      '<div class="fi-board" role="grid" aria-label="لوحة الجزيرة المحرمة">' + cells.join("") + "</div>" +
      '<div class="fi-legend"><span><i></i> آمن</span><span><i class="flood"></i> مغمور</span><span><i class="sunk"></i> غارق</span><span>⭐ كنز</span><span>🚁 الهروب</span></div>' +
      "</section>";
  }

  function renderPhaseBanner() {
    if (state.over) {
      const win = state.result && state.result.win;
      return BG.coop.teamNote(win ? "🚁" : "🌊", win ? "نجح الفريق وخرج بالكنوز الأربعة. الجميع فائزون!" : "غرقت الجزيرة. خسر الفريق معًا، لكن التجربة التالية ستكون أفضل.", win ? "is-gold" : "is-warn");
    }
    if (state.phase === "rescue" && state.pendingRescue) {
      const player = state.players[state.pendingRescue.playerIndex];
      const options = state.pendingRescue.options.map((id) => tileById(id)).filter(Boolean);
      return '<div class="coop-banner is-warn"><span aria-hidden="true">🛟</span><span><strong>إنقاذ ' + esc(player.name) + ':</strong> اختر تايلًا آمنًا للنجاة من التايل الغارق.<div class="fi-give-row">' +
        options.map((tile) => '<button type="button" class="fi-give-card" data-rescue="' + esc(tile.id) + '"' + (canControl() ? "" : " disabled") + ">" + esc(tile.name) + (tile.flooded ? " · مغمور" : "") + "</button>").join("") +
        "</div></span></div>";
    }
    if (state.phase === "discard") {
      return '<div class="coop-banner is-warn"><span aria-hidden="true">🖐️</span><span>تجاوزت حد اليد (٥ بطاقات). اضغط بطاقة من يد <strong>' + esc(current().name) + "</strong> لتتخلص منها قبل المتابعة.</span></div>";
    }
    if (state.phase === "drawTreasure") {
      return BG.coop.teamNote("🃏", "يسحب <strong>" + esc(current().name) + "</strong> بطاقتي كنز. إن ظهرت «ارتفاع الماء» فارفعوا المستوى وأعيدوا خلط الطوفان.", "");
    }
    if (state.phase === "flood") {
      return BG.coop.teamNote("🌊", "بطاقات الطوفان: أول غمر يقلب التايل، والغمر الثاني يُغرقه. انتبهوا لمرسى الحمقى وتايلي الكنوز.", "is-warn");
    }
    if (allTreasures()) {
      const fools = foolsTile();
      const allHere = fools && state.players.every((player) => player.pos === fools.id);
      if (allHere) {
        if (heliHolder()) {
          return '<div class="coop-banner is-gold"><span aria-hidden="true">🚁</span><span><strong>الفريق كامل والكنوز كاملة!</strong> استخدموا بطاقة هليكوبتر للهروب الآن.<div class="coop-btn-row" style="margin-top:8px"><button type="button" class="coop-btn gold" data-fi-action="heli-win"' + (canControl() ? "" : " disabled") + ">اهربوا بالهليكوبتر</button></div></span></div>";
        }
        return BG.coop.teamNote("🚁", "الفريق كامل في المرسى، لكن لا توجد بطاقة هليكوبتر في أي يد. واصلوا اللعب حتى تسحبوها.", "is-gold");
      }
      return BG.coop.teamNote("🧭", "الكنوز الأربعة مكتملة. تحركوا جميعًا إلى <strong>مرسى الحمقى</strong> ثم العبوا هليكوبتر للفوز.", "is-gold");
    }
    return "";
  }

  function targetButtons(kind) {
    const player = current();
    const mode = state.mode || {};
    return state.players.filter((mate) => mate.index !== player.index).map((mate) => {
      let allowed = mate.hand.length < 5;
      if (kind === "give") {
        allowed = allowed && (player.role === "messenger" || mate.pos === player.pos);
      }
      return '<button type="button" class="fi-give-card' + (mode.target === mate.index ? " is-picked" : "") + '" data-' + kind + '-target="' + mate.index + '"' + (allowed ? "" : " disabled") + ">" +
        esc(mate.name) + " · " + ar(mate.hand.length) + "/٥</button>";
    }).join("");
  }

  function renderControls() {
    if (state.over) return renderPhaseBanner();
    if (!canControl()) {
      return BG.coop.teamNote("👀", "الدور الآن لـ <strong>" + esc(current().name) + "</strong>. الفريق كله يستطيع مشاهدة اللوحة وتقديم المشورة والدردشة.", "");
    }
    if (state.phase === "rescue" || state.phase === "discard" || state.phase === "drawTreasure" || state.phase === "flood") {
      return renderPhaseBanner();
    }
    const player = current();
    const mode = state.mode || {};
    const noActions = state.actionsLeft <= 0;
    let modeHelp = "";
    if (mode.kind === "move") modeHelp = "اختر تايلًا متاحًا (المحدد بالذهبي) للانتقال إليه.";
    else if (mode.kind === "shore") modeHelp = player.role === "engineer" && state.engineerBonus ? "لديك تدعيم إضافي مجاني ضمن إجراء المهندس. اختر تايلًا مغمورًا." : "اختر تايلًا مغمورًا (أزرق) قريبًا منك لتدعيمه.";
    else if (mode.kind === "give") modeHelp = mode.target == null ? "اختر زميلًا من القائمة، ثم اضغط بطاقة كنز من يدك." : "اختر بطاقة كنز من يدك لإعطائها إلى " + state.players[mode.target].name + ".";
    else if (mode.kind === "navigate") modeHelp = mode.target == null ? "اختر زميلًا لتحريكه خطوتين، ثم اضغط التايل الهدف." : "اختر تايلًا ضمن خطوتين للزميل " + state.players[mode.target].name + ".";
    else if (mode.kind === "sandbag") modeHelp = "اختر أي تايل مغمور في الجزيرة لإنقاذه بكيس الرمل. هذه البطاقة مجانية.";
    else if (mode.kind === "helicopter") modeHelp = "اختر التايل الذي ستهبط فيه الهليكوبتر مع كل من يقف معك.";
    const capture = captureTile(player);
    const captureReady = canCapture(player);
    const shoreReady = legalShore(player).size > 0;
    const navReady = player.role === "navigator" && state.players.some((mate) => mate.index !== player.index && legalNavMoves(mate).size > 0);
    const captureLabel = capture ? (captureReady ? "استخرج " + TREASURES[capture.treasure].name : "تحتاج ٤ بطاقات مطابقة") : "قف على تايل كنز لاستخراجه";
    return '<div class="coop-panel">' +
      '<div class="coop-panel-head"><div class="coop-panel-title">ماذا سيفعل ' + esc(player.name) + '؟</div><small>' + ar(state.actionsLeft) + " من ٣ إجراءات</small></div>" +
      (modeHelp ? '<div class="coop-banner is-gold" style="margin-bottom:8px"><span>👉</span><span>' + esc(modeHelp) + "</span></div>" : "") +
      (capture ? '<button type="button" class="coop-btn gold" data-fi-action="capture" style="width:100%;margin-bottom:8px" ' + (captureReady && !noActions ? "" : "disabled") + ">🏆 استخرج " + esc(TREASURES[capture.treasure].name) + " <small>· إجراء واحد · " + captureLabel + "</small></button>" : "") +
      '<div class="fi-actions">' +
      '<button type="button" class="fi-action" data-fi-action="move" ' + (noActions ? "disabled" : "") + '><span class="ico">🧭</span><span><strong>تحرّك</strong><small>إلى تايل مجاور</small></span></button>' +
      '<button type="button" class="fi-action" data-fi-action="shore" ' + (noActions || !shoreReady ? "disabled" : "") + '><span class="ico">🛠️</span><span><strong>دعّم تايلًا</strong><small>أعد التايل المغمور آمنًا</small></span></button>' +
      (player.role === "navigator" ? '<button type="button" class="fi-action" data-fi-action="navigate" ' + (noActions || !navReady ? "disabled" : "") + '><span class="ico">🧭</span><span><strong>حرّك زميلًا</strong><small>خطوتان لكل إجراء</small></span></button>' : "") +
      '<button type="button" class="fi-action" data-fi-action="give" ' + (noActions ? "disabled" : "") + '><span class="ico">✉️</span><span><strong>أعطِ بطاقة</strong><small>إجراء لكل بطاقة كنز</small></span></button>' +
      "</div>" +
      (mode.kind ? '<div class="coop-btn-row" style="margin-top:8px"><button type="button" class="coop-btn small ghost" data-fi-action="cancel">إلغاء الإجراء</button></div>' : "") +
      (mode.kind === "give" ? '<div class="fi-give-grid" style="margin-top:9px"><span class="coop-note">إلى من؟ ' + (player.role === "messenger" ? "الرسول يعطي من أي مكان." : "يجب أن يكون على التايل نفسه.") + '</span><div class="fi-give-row">' + targetButtons("give") + "</div></div>" : "") +
      (mode.kind === "navigate" ? '<div class="fi-give-grid" style="margin-top:9px"><span class="coop-note">اختر الزميل الذي ستحرّكه:</span><div class="fi-give-row">' + targetButtons("nav") + "</div></div>" : "") +
      '<div class="coop-btn-row" style="margin-top:10px"><button type="button" class="coop-btn primary" data-fi-action="end">إنهاء الإجراءات وسحب الكنوز</button></div>' +
      '<p class="coop-note">' + esc(roleMeta(player).power) + "</p>" +
      "</div>";
  }

  function renderHand() {
    const player = current();
    if (!player) return "";
    const cards = player.hand.map((item) => {
      const isTreasure = item.kind === "treasure";
      const info = isTreasure ? TREASURES[item.treasure] : null;
      const mode = state.mode || {};
      let usable = state.phase === "actions" || state.phase === "discard";
      if (state.phase === "actions") {
        if (item.kind === "sandbag" || item.kind === "heli") usable = true;
        else if (mode.kind === "give" && mode.target != null && isTreasure) usable = true;
        else usable = false;
      }
      if (state.phase === "discard") usable = true;
      if (!canControl()) usable = false;
      const style = isTreasure
        ? "--card-a:" + info.deep + ";--card-b:#08171d"
        : item.kind === "heli" ? "--card-a:#7a5b21;--card-b:#2a1c07" : "--card-a:#56614b;--card-b:#182019";
      const noteText = state.phase === "discard" ? "اضغط للتخلص" : isTreasure ? "بطاقة كنز" : item.kind === "heli" ? "مجانًا · هروب/نقل" : "مجانًا · أنقذ تايلًا";
      return '<button type="button" class="coop-hand-card' + (usable ? "" : " is-static") + (isTreasure ? "" : " is-special") + '" data-card="' + esc(item.uid) + '" style="' + style + '"' + (usable ? "" : " disabled") + ">" +
        '<span class="hc-icon">' + cardIcon(item) + "</span>" +
        "<strong>" + esc(isTreasure ? info.name : item.kind === "heli" ? "هليكوبتر" : "كيس رمل") + "</strong>" +
        "<small>" + esc(noteText) + (isTreasure ? " · " + ar(treasureCount(player, item.treasure)) + " في يدك" : "") + "</small>" +
        "</button>";
    }).join("");
    return '<div class="coop-panel"><div class="coop-panel-head"><h3>يد ' + esc(player.name) + '</h3><small>' + ar(player.hand.length) + " / ٥ · بطاقات مكشوفة للفريق</small></div>" +
      (cards ? '<div class="coop-hand">' + cards + "</div>" : '<div class="coop-hand-empty">لا بطاقات في اليد.</div>') +
      (state.phase === "discard" ? '<p class="coop-note"><strong>حد اليد:</strong> يجب التخلص من البطاقات الزائدة الآن.</p>' : "") +
      "</div>";
  }

  function teamMemberRow(player) {
    const role = roleMeta(player);
    const tile = tileById(player.pos);
    return '<div class="fi-player' + (player.index === state.turn ? " is-current" : "") + '">' +
      BG.coop.avatar(player) +
      '<span><b>' + esc(player.name) + "</b><small> · " + esc(role.name) + " · " + esc(tile ? tile.name : "؟") + "</small></span>" +
      '<span class="coop-chip">' + ar(player.hand.length) + " بطاقات</span></div>";
  }

  function renderSide() {
    const treasureCards = TREASURE_KEYS.map((type) => {
      const info = TREASURES[type];
      const status = state.treasures[type];
      const tiles = state.tiles.filter((tile) => tile.treasure === type);
      const available = tiles.filter((tile) => !tile.sunk).length;
      const count = teamTreasureCount(type);
      const pips = [];
      for (let index = 0; index < 5; index++) pips.push('<i class="' + (index < count ? "on" : "") + '" style="--tc:' + info.color + '"></i>');
      return '<div class="fi-treasure' + (status.got ? " is-done" : "") + (status.lost ? " is-lost" : "") + '">' +
        '<div class="fi-treasure-icon" style="color:' + info.color + '">' + TREASURE_ICONS[type] + "</div>" +
        "<strong>" + esc(info.name) + "</strong>" +
        "<small>" + (status.got ? "تم الاستخراج ✓" : status.lost ? "ضاع في الهاوية" : "تايلان متاحان: " + ar(available)) + "</small>" +
        '<div class="fi-treasure-pips">' + pips.join("") + "</div></div>";
    }).join("");

    const waterPips = WATER_TRACK.map((value, index) => {
      const currentLevel = index === state.waterIndex;
      const high = value === "skull" || Number(value) >= 5;
      return '<span class="fi-water-pip' + (index <= state.waterIndex ? " is-on" : "") + (high ? " is-high" : "") + (currentLevel ? " is-current" : "") + '" title="' + (value === "skull" ? "الجمجمة" : "مستوى " + value) + '"></span>';
    }).join("");

    const logItems = state.log.slice(-8).map((line) => '<div class="coop-log-line ' + (line.kind || "") + '">' + line.html + "</div>").join("");
    const specials = state.players.reduce((totals, player) => {
      player.hand.forEach((item) => {
        if (item.kind === "heli") totals.heli += 1;
        if (item.kind === "sandbag") totals.sandbag += 1;
      });
      return totals;
    }, { heli: 0, sandbag: 0 });

    return '<div class="coop-panel"><div class="coop-panel-head"><h3>مهمة الفريق</h3><small>الجزيرة تتساقط</small></div>' +
      (state.notice ? '<p class="coop-note" style="margin-top:0">' + esc(state.notice) + "</p>" : "") +
      '<div class="coop-btn-row">' + BG.coop.chip("غُمر", ar(state.tiles.filter((tile) => tile.flooded).length), "is-good") + BG.coop.chip("غرق", ar(state.tiles.filter((tile) => tile.sunk).length), "is-warn") + BG.coop.chip("هليكوبتر", ar(specials.heli), "is-gold") + BG.coop.chip("رمل", ar(specials.sandbag)) + "</div>" +
      '<div class="fi-water" style="margin-top:10px">' + waterPips + "</div>" +
      '<div class="coop-note">بطاقات الطوفان في الرزمة: <strong>' + ar(state.floodDeck.length) + "</strong> · مكشوفة: <strong>" + ar(state.floodDiscard.length) + "</strong></div>" +
      "</div>" +
      '<div class="coop-panel"><div class="coop-panel-head"><h3>الكنوز الأربعة</h3><small>٤ بطاقات مطابقة + التايل</small></div><div class="fi-treasure-grid">' + treasureCards + "</div></div>" +
      '<div class="coop-panel"><div class="coop-panel-head"><h3>فريق الإنقاذ</h3><small>الأيدي مكشوفة للجميع</small></div><div class="fi-player-strip" style="display:grid;gap:5px">' +
      state.players.map(teamMemberRow).join("") +
      "</div></div>" +
      '<div class="coop-panel"><div class="coop-panel-head"><h3>يد الفريق</h3><small>معلومات مفتوحة</small></div>' +
      state.players.map((player) => '<div class="coop-note"><strong>' + esc(player.name) + ":</strong> " + (player.hand.length ? player.hand.map(cardShort).join("") : '<span style="color:var(--coop-dim)">لا بطاقات</span>') + "</div>").join("") +
      "</div>" +
      '<div class="coop-panel"><div class="coop-panel-head"><h3>دردشة سريعة</h3><small>تنسيق الفريق</small></div>' + BG.coop.chatDock("قولوا لزميلكم") + "</div>" +
      '<div class="coop-panel"><div class="coop-panel-head"><h3>سجل الفريق</h3><small>آخر الأحداث</small></div><div class="coop-log">' + (logItems || '<div class="coop-hand-empty">لم يبدأ شيء بعد.</div>') + "</div></div>";
  }

  function render() {
    if (!state || !rootRef) return;
    const player = current();
    const header = BG.coop.teamHeader({
      icon: "🏝️",
      title: "الجزيرة المحرمة",
      en: "FORBIDDEN ISLAND · ONE TEAM",
      goal: "فريق واحد · نجاح مشترك",
      players: state.players,
      current: state.turn,
      meta: (mate) => roleMeta(mate).icon + " " + roleMeta(mate).name + " · " + ar(mate.hand.length) + " بطاقات",
      chips: BG.coop.chip("الدور", esc(player ? player.name : ""), "is-gold") + BG.coop.chip("الطور", phaseLabel()),
    });
    rootRef.innerHTML = '<div class="coop-shell fi-shell">' +
      '<div class="coop-main">' + header + renderObjective() + renderPhaseBanner() + renderBoard() + renderControls() + renderHand() + "</div>" +
      '<aside class="coop-side">' + renderSide() + "</aside>" +
      "</div>";
    if (apiRef && typeof apiRef.setStatus === "function") apiRef.setStatus(statusText(), "live");
    if (!applyingNet) netSync();
  }

  /* ------------------------------ أحداث الواجهة ------------------------------ */

  function chatName() {
    if (apiRef && apiRef.net && apiRef.net.enabled && apiRef.net.seat >= 0) {
      const player = state.players[apiRef.net.seat];
      if (player) return player.name;
    }
    return current() ? current().name : "لاعب";
  }

  function onClick(event) {
    if (!state) return;
    if (BG.coop.handleChatClick(event, apiRef, chatName())) return;

    const emote = event.target.closest("[data-coop-emote]");
    if (emote) return;

    const rescue = event.target.closest("[data-rescue]");
    if (rescue) {
      if (canControl()) chooseRescue(rescue.getAttribute("data-rescue"));
      return;
    }

    const cardNode = event.target.closest("[data-card]");
    if (cardNode) {
      if (!canControl()) return;
      const uid = cardNode.getAttribute("data-card");
      const item = current().hand.find((entry) => entry.uid === uid);
      if (!item) return;
      if (state.phase === "discard") {
        discardCard(uid);
        return;
      }
      if (state.phase !== "actions") return;
      if (state.mode && state.mode.kind === "give") {
        giveFromHand(item);
        return;
      }
      if (item.kind === "sandbag") {
        state.mode = { kind: "sandbag", cid: item.uid };
        state.notice = "كيس الرمل: اختر أي تايل مغمور لإنقاذه.";
        sound("click");
        render();
        return;
      }
      if (item.kind === "heli") {
        if (canEscape()) {
          escapeWithHelicopter();
          return;
        }
        state.mode = { kind: "helicopter", cid: item.uid };
        state.notice = "الهليكوبتر: اختر تايل الهبوط لنقل من معك. للهروب النهائي يجب أن يكون الجميع في مرسى الحمقى.";
        sound("click");
        render();
        return;
      }
      toast("بطاقات الكنز تُستخدم عبر زر «أعطِ بطاقة»، أو لاستخراج الكنز على تايله.");
      return;
    }

    const giveTarget = event.target.closest("[data-give-target]");
    if (giveTarget) {
      if (state.phase !== "actions" || !canControl() || !state.mode || state.mode.kind !== "give") return;
      const index = Number(giveTarget.getAttribute("data-give-target"));
      if (!Number.isInteger(index)) return;
      state.mode.target = index;
      sound("click");
      render();
      return;
    }

    const navTarget = event.target.closest("[data-nav-target]");
    if (navTarget) {
      if (state.phase !== "actions" || !canControl() || !state.mode || state.mode.kind !== "navigate") return;
      const index = Number(navTarget.getAttribute("data-nav-target"));
      if (!Number.isInteger(index)) return;
      state.mode.target = index;
      sound("click");
      render();
      return;
    }

    const actionNode = event.target.closest("[data-fi-action]");
    if (actionNode) {
      const action = actionNode.getAttribute("data-fi-action");
      if (action === "help-rules") {
        if (apiRef && apiRef.rules) apiRef.rules();
        return;
      }
      if (!canControl()) return;
      if (action === "move" && state.phase === "actions") {
        state.mode = { kind: "move" };
        state.notice = "اختر تايلًا متاحًا للانتقال.";
        sound("click");
        render();
      } else if (action === "shore" && state.phase === "actions") {
        state.mode = { kind: "shore" };
        state.notice = "اختر تايلًا مغمورًا لتدعيمه.";
        sound("click");
        render();
      } else if (action === "give" && state.phase === "actions") {
        state.mode = { kind: "give", target: null };
        state.notice = "اختر زميلًا ثم بطاقة كنز من يدك.";
        sound("click");
        render();
      } else if (action === "navigate" && state.phase === "actions" && current().role === "navigator") {
        state.mode = { kind: "navigate", target: null };
        state.notice = "اختر الزميل الذي تريد تحريكه.";
        sound("click");
        render();
      } else if (action === "capture") {
        captureTreasure();
      } else if (action === "cancel") {
        state.mode = null;
        state.notice = "";
        sound("click");
        render();
      } else if (action === "end") {
        endActions();
      } else if (action === "heli-win") {
        escapeWithHelicopter();
      }
      return;
    }

    const tileNode = event.target.closest("[data-tile]");
    if (tileNode) {
      if (!canControl() || state.phase !== "actions") return;
      const tileId = tileNode.getAttribute("data-tile");
      const mode = state.mode || {};
      if (mode.kind === "move") tryMove(tileId);
      else if (mode.kind === "shore") doShore(tileId);
      else if (mode.kind === "sandbag") useSandbag(tileId);
      else if (mode.kind === "helicopter") useHelicopterMove(tileId);
      else if (mode.kind === "navigate") navigateMove(tileId);
    }
  }

  /* ------------------------------ تعريف اللعبة ------------------------------ */

  const game = {
    id: "forbidden-island",
    name: "الجزيرة المحرمة",
    en: "FORBIDDEN ISLAND",
    icon: "🏝️",
    accent: "#6fd7c0",
    cardClass: "card-forbidden-island",
    tagline: "فريق إنقاذ واحد: استخرجوا أربعة كنوز من جزيرة تغرق، ثم اهربوا معًا بالهليكوبتر.",
    players: "2–4",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,
    coop: true,

    options: {
      hint: "الجزيرة المحرمة تعاونية بالكامل: الجميع يفوز أو يخسر معًا. مستوى الماء يحدد سرعة غرق الجزيرة.",
      defaults: { difficulty: "medium" },
      fields: [
        {
          key: "difficulty",
          label: "مستوى الماء",
          type: "seg",
          choices: [
            { value: "easy", label: "مبتدئ · 2" },
            { value: "medium", label: "عادي · 3" },
            { value: "hard", label: "خبير · 4" },
          ],
          hint: "يبدأ مستوى الماء عند 2 أو 3 أو 4. كل ارتفاع يجعل الطوفان يسحب بطاقات أكثر في نهاية الدور.",
        },
      ],
      summary(values) {
        const info = difficulties(values && values.difficulty);
        return "مستوى الماء: " + info.name + " · طوفان " + ar(info.water);
      },
    },

    rulesFor(options) {
      const info = difficulties(options && options.difficulty);
      return {
        goal: "فوز مشترك: استخرجوا الكنوز الأربعة (حجر الأرض، تمثال الريح، بلورة النار، كأس المحيط)، ثم اجمعوا كل اللاعبين على تايل مرسى الحمقى والعبوا بطاقة هليكوبتر للهروب. الجميع يفوز أو يخسر معًا.",
        facts: [
          ["اللاعبون", "2–4 في فريق واحد"],
          ["الهدف", "٤ كنوز + الهروب الجماعي"],
          ["مستوى الماء", info.name + " · يبدأ عند " + ar(info.water)],
          ["المدة", "30–45 دقيقة"],
        ],
        components: [
          "24 تايلًا لجزيرة مزدوجة الوجه، منها 8 تايلات لكنوز (تايلان لكل كنز)، و5 بوابات بداية، ومرسى الحمقى.",
          "28 بطاقة كنز: 5 من كل كنز (20)، و3 بطاقات «ارتفاع الماء»، و3 بطاقات هليكوبتر، وبطاقتا كيس رمل.",
          "24 بطاقة طوفان، بطاقة لكل تايل.",
          "6 بطاقات أدوار وشخصيات، 4 قطع كنز، ومؤشر مستوى الماء.",
          "الفريق يلعب بأيدي مكشوفة، وكل التخطيط تعاوني.",
        ],
        setup: [
          "خلطوا تايلات الجزيرة الـ24 ووزعوها وجهًا لوجه في شكل ماسة: صفان في الأعلى، ثم أربعة، ثم ستة، ثم ستة، ثم أربعة، ثم صفان.",
          "ضعوا قطع الكنز الأربع جانبًا. تايلا كل كنز مطبوع عليهما رمزه: معبدا القمر والشمس للأرض، وحديقتا العويل والهمس للريح، وكهفا الجمر والظلال للنار، وقصرا المرجان والمد للمحيط.",
          "خلطوا رزمة الطوفان واسحبوا 6 بطاقات، واقلِبوا التايلات المطابقة إلى وجهها المغمور. ثم ضعوا البطاقات في كومة الطوفان المكشوفة.",
          "اخلطوا بطاقات الأدوار ووزعوا دورًا واحدًا لكل لاعب. يبدأ كل دور على تايل البداية المطابق: المستكشف على البوابة النحاسية، الطيّار على مرسى الحمقى، المهندس على البرونزية، الغوّاص على الحديدية، الرسول على الفضية، والملاح على الذهبية.",
          "وزعوا بطاقتي كنز لكل لاعب، وإذا ظهرت «ارتفاع الماء» فاستبدلوها واخلطوها من جديد. ضعوا الباقي كرزمة سحب.",
          "ضعوا مؤشر الماء عند مستوى البداية المختار. في هذه النسخة: مبتدئ 2، عادي 3، خبير 4.",
        ],
        steps: [
          "<strong>١) نفّذوا حتى 3 إجراءات:</strong> تحرّك إلى تايل مجاور (لا يمكن المرور عبر تايل غارق)، أو دعّم تايلًا مغمورًا (أنت عليه أو مجاور له)، أو أعطِ بطاقة كنز لزميل على التايل نفسه (إجراء لكل بطاقة، ولا تُعطى البطاقات الخاصة)، أو استخرج كنزًا.",
          "<strong>استخراج الكنز:</strong> إذا كنت على أحد تايلي الكنز ولديك 4 بطاقات مطابقة، أنفق إجراءً واذهب البطاقات الأربع لتأخذ قطعة الكنز. يمكن الاستخراج على تايل مغمور.",
          "<strong>الأدوار الخاصة:</strong> المستكشف يتحرك ويدعّم قُطريًا، والطيّار يطير إلى أي تايل مرة كل دور، والمهندس يدعّم تايلين بإجراء واحد، والغوّاص يعبر التايلات المغمورة والغارقة، والرسول يعطي من أي مكان، والملاح يحرك زميلًا خطوتين بإجراء.",
          "<strong>٢) اسحبوا بطاقتي كنز:</strong> أضيفوهما إلى اليد. إذا ظهرت «ارتفاع الماء» فارفعوا المؤشر درجة، واخلطوا كومة الطوفان المكشوفة وضعوها فوق رزمة السحب، ثم تخلصوا من البطاقة. «ارتفاع الماء» لا تُعوَّض ببطاقة أخرى.",
          "<strong>٣) اسحبوا بطاقات طوفان بعدد مستوى الماء الحالي:</strong> التايل الآمن يصبح مغمورًا، والتايل المغمور يغرق ويُزال من اللعبة مع بطاقة طوفانه. أول غمرة تقلب التايل، والثانية تغرقه.",
          "<strong>من على تايل غارق:</strong> يسبح فورًا إلى تايل مجاور غير غارق. الغوّاص ينجو إلى أي تايل آمن، والمستكشف يسبح قُطريًا أيضًا، والطيّار يطير إلى أي تايل. إذا لم يوجد تايل آمن، يخسر الفريق فورًا.",
          "<strong>حد اليد:</strong> 5 بطاقات كحد أقصى، بما فيها البطاقات الخاصة. عند تجاوز الحد، تخلصوا من الزائد فورًا قبل متابعة السحب أو الطوفان.",
          "<strong>البطاقات الخاصة:</strong> تُلعب مجانًا. كيس الرمل ينجز تدعيم أي تايل مغمور في الجزيرة. الهليكوبتر تنقل اللاعبين من تايل واحد إلى تايل آخر، ويلزم استخدامها للهروب النهائي.",
          "<strong>الفوز:</strong> بعد الكنوز الأربعة، اجمعوا الجميع على مرسى الحمقى (حتى لو كان مغمورًا) والعبوا بطاقة هليكوبتر واحدة. عندها يفوز الفريق كله معًا.",
        ],
        winning: "الفريق يفوز فقط عندما تُستخرج الكنوز الأربعة، ويقف جميع اللاعبين على مرسى الحمقى، وتُستخدم بطاقة هليكوبتر للهروب. لا يوجد فائز منفرد: النجاح جماعي.",
        notes: [
          "خسائر الفريق الأربعة: غرق تايلَي كنز قبل استخراجه، أو غرق مرسى الحمقى، أو عدم وجود تايل آمن لاعب على تايل يغرق، أو وصول مؤشر الماء إلى الجمجمة.",
          "ارتفاع الماء يخلط كومة الطوفان المكشوفة فقط فوق رزمة السحب؛ لا يوزع بطاقات طوفان إضافية فورًا. الطوفان يأتي في نهاية الدور بعدد المستوى الجديد.",
          "إذا نفدت رزمة الطوفان، أعيدوا خلط كومة الطوفان المكشوفة لتكوين رزمة جديدة. إذا نفدت رزمة الكنوز، أعيدوا خلط كومة الكنوز المكشوفة.",
          "بطاقة الطوفان الخاصة بتايل غارق تُزال من اللعبة مع التايل.",
          "يمكن إنقاذ تايل مغمور بكيس رمل فورًا، لكن لا يمكن إنقاذ تايل بعد كشف بطاقة طوفانه الذي يغرقه.",
          "الجزيرة تعاقب الطمع: التدعيم والتنسيق أهم من جمع البطاقات. الأيدي مكشوفة كي يخطط الفريق معًا.",
        ],
      };
    },

    rules: {},

    create(root, api) {
      destroyed = false;
      rootRef = root;
      apiRef = api;
      const seats = api && api.players && api.players.length ? api.players.slice(0, 4) : [{ name: "لاعب ١", type: "human" }, { name: "لاعب ٢", type: "human" }];
      const difficulty = DIFFICULTIES[(api && api.options && api.options.difficulty) || "medium"] ? ((api && api.options && api.options.difficulty) || "medium") : "medium";
      createInitialState(seats, difficulty);
      if (flowTimer) clearTimeout(flowTimer);
      if (aiTimer) clearTimeout(aiTimer);
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = null;

      note("بدأت مهمة <strong>الجزيرة المحرمة</strong> بمستوى ماء <strong>" + esc(difficulties(difficulty).name) + "</strong>. الفريق واحد: انقذوا الكنوز واهربوا معًا.", "accent");
      state.players.forEach((player) => {
        const role = roleMeta(player);
        const tile = tileById(player.pos);
        note("<strong>" + esc(player.name) + "</strong> هو <strong>" + esc(role.name) + "</strong> ويبدأ على <strong>" + esc(tile ? tile.name : "مرسى الحمقى") + "</strong>.", "");
      });

      rootRef.addEventListener("click", onClick);
      const chatOff = BG.coop.listenChat();
      render();
      queueAi(1000);

      let debugRef = null;
      try {
        if (new URLSearchParams(window.location.search).has("bgdebug")) {
          debugRef = {
            get state() { return state; },
            get api() { return apiRef; },
            render,
            tryMove,
            doShore,
            navigateMove,
            captureTreasure,
            endActions,
            drawNextTreasure,
            startFlood,
            floodNext,
            waterRise,
            chooseRescue,
            escape: escapeWithHelicopter,
            finishWin,
            finishLose,
            queueAi,
            setTurn(index) {
              state.turn = U.clamp(Number(index) || 0, 0, state.players.length - 1);
              state.phase = "actions";
              state.actionsLeft = 3;
              render();
              queueAi(400);
            },
            setWater(index) {
              state.waterIndex = U.clamp(Number(index) || 0, 0, WATER_TRACK.length - 1);
              render();
            },
            setPhase(phase) {
              state.phase = phase;
              render();
            },
            addTreasure(type, count, playerIndex) {
              const player = state.players[playerIndex == null ? state.turn : Number(playerIndex)];
              if (!player || !TREASURES[type]) return;
              for (let i = 0; i < (Number(count) || 1); i++) player.hand.push(makeCard("treasure", type));
              sortedHand(player);
              render();
            },
            addSpecial(kind, playerIndex) {
              const player = state.players[playerIndex == null ? state.turn : Number(playerIndex)];
              if (!player || (kind !== "heli" && kind !== "sandbag")) return;
              player.hand.push(makeCard(kind));
              sortedHand(player);
              render();
            },
            collectAll() {
              TREASURE_KEYS.forEach((type) => { state.treasures[type].got = true; });
              render();
            },
            gatherAtFools() {
              const fools = foolsTile();
              if (fools) state.players.forEach((player) => { player.pos = fools.id; });
              render();
            },
            addHeli(playerIndex) {
              const player = state.players[playerIndex == null ? 0 : Number(playerIndex)];
              if (player) {
                player.hand.push(makeCard("heli"));
                sortedHand(player);
                render();
              }
            },
            snapshot() { return JSON.parse(JSON.stringify(state)); },
          };
          window.__bgDebug = debugRef;
        }
      } catch (err) { console.warn(err); }

      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(snapshot) {
          if (!snapshot) return;
          if (flowTimer) clearTimeout(flowTimer);
          if (aiTimer) clearTimeout(aiTimer);
          if (flashTimer) clearTimeout(flashTimer);
          flowTimer = null;
          aiTimer = null;
          flashTimer = null;
          BG.closeDialogs();
          applyingNet = true;
          try {
            state = BG.netCodec.decode(snapshot);
            if (!state.log) state.log = [];
            if (state.players) state.players.forEach(sortedHand);
            render();
          } finally {
            applyingNet = false;
          }
          queueAi(500);
        },
        netSeat() { return state ? state.turn : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (state) {
            render();
            queueAi(600);
          }
        },
        destroy() {
          destroyed = true;
          if (flowTimer) clearTimeout(flowTimer);
          if (aiTimer) clearTimeout(aiTimer);
          if (flashTimer) clearTimeout(flashTimer);
          flowTimer = aiTimer = flashTimer = null;
          if (chatOff) chatOff();
          if (rootRef) rootRef.removeEventListener("click", onClick);
          if (debugRef && window.__bgDebug === debugRef) window.__bgDebug = null;
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
