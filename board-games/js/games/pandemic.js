/* ==========================================================================
   وباء — لعبة تعاونية لإنقاذ العالم (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  /* ------------------------------ البيانات ------------------------------ */

  const DISEASES = {
    blue: { name: "إنفلونزا", hex: "#4d83c4", deep: "#2a568d", icon: "💧" },
    yellow: { name: "حمى صفراء", hex: "#e3ae38", deep: "#a97a17", icon: "🌡️" },
    black: { name: "طاعون", hex: "#5b626c", deep: "#2f353c", icon: "🖤" },
    red: { name: "شلل", hex: "#d95356", deep: "#9e2f38", icon: "🩸" },
  };
  const DISEASE_KEYS = ["blue", "yellow", "black", "red"];

  const CITIES = [
    { id: "sf", name: "سان فرانسيسكو", c: "blue", x: 122, y: 238 },
    { id: "ny", name: "نيويورك", c: "blue", x: 306, y: 226 },
    { id: "london", name: "لندن", c: "blue", x: 472, y: 178 },
    { id: "paris", name: "باريس", c: "blue", x: 548, y: 220 },
    { id: "madrid", name: "مدريد", c: "blue", x: 490, y: 292 },
    { id: "milan", name: "ميلانو", c: "blue", x: 626, y: 258 },

    { id: "la", name: "لوس أنجلوس", c: "yellow", x: 182, y: 322 },
    { id: "mexico", name: "مكسيكو سيتي", c: "yellow", x: 262, y: 360 },
    { id: "miami", name: "ميامي", c: "yellow", x: 352, y: 302 },
    { id: "bogota", name: "بوغوتا", c: "yellow", x: 352, y: 432 },
    { id: "lima", name: "ليما", c: "yellow", x: 334, y: 522 },
    { id: "santiago", name: "سانتياغو", c: "yellow", x: 402, y: 620 },

    { id: "istanbul", name: "إسطنبول", c: "black", x: 654, y: 222 },
    { id: "moscow", name: "موسكو", c: "black", x: 762, y: 142 },
    { id: "cairo", name: "القاهرة", c: "black", x: 654, y: 322 },
    { id: "baghdad", name: "بغداد", c: "black", x: 742, y: 322 },
    { id: "tehran", name: "طهران", c: "black", x: 822, y: 272 },
    { id: "karachi", name: "كراتشي", c: "black", x: 820, y: 382 },

    { id: "mumbai", name: "مومباي", c: "red", x: 882, y: 462 },
    { id: "delhi", name: "دلهي", c: "red", x: 912, y: 342 },
    { id: "beijing", name: "بكين", c: "red", x: 984, y: 262 },
    { id: "seoul", name: "سيول", c: "red", x: 1042, y: 220 },
    { id: "tokyo", name: "طوكيو", c: "red", x: 1072, y: 292 },
    { id: "sydney", name: "سيدني", c: "red", x: 1012, y: 570 },
  ];
  const CITY_BY_ID = {};
  CITIES.forEach((city) => { CITY_BY_ID[city.id] = city; });

  const EDGES = [
    ["sf", "la"], ["sf", "mexico"], ["sf", "ny"],
    ["la", "mexico"], ["la", "miami"],
    ["mexico", "miami"], ["mexico", "bogota"], ["mexico", "lima"],
    ["miami", "ny"], ["miami", "bogota"], ["miami", "madrid"],
    ["bogota", "lima"], ["bogota", "santiago"], ["lima", "santiago"],
    ["ny", "london"], ["ny", "paris"],
    ["london", "paris"], ["london", "madrid"],
    ["paris", "madrid"], ["paris", "milan"],
    ["madrid", "milan"], ["milan", "istanbul"],
    ["istanbul", "moscow"], ["istanbul", "cairo"], ["istanbul", "baghdad"],
    ["moscow", "tehran"], ["cairo", "baghdad"], ["cairo", "karachi"],
    ["baghdad", "tehran"], ["baghdad", "karachi"], ["baghdad", "delhi"],
    ["tehran", "karachi"], ["tehran", "delhi"],
    ["karachi", "delhi"], ["karachi", "mumbai"],
    ["delhi", "mumbai"], ["delhi", "beijing"],
    ["mumbai", "sydney"],
    ["beijing", "seoul"], ["beijing", "tokyo"], ["beijing", "sydney"],
    ["seoul", "tokyo"], ["tokyo", "sydney"],
  ];

  const ADJ = {};
  CITIES.forEach((city) => { ADJ[city.id] = []; });
  EDGES.forEach(([a, b]) => {
    if (!ADJ[a] || !ADJ[b]) return;
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
  });

  const ROLES = {
    medic: { name: "الطبيب", icon: "🩺", desc: "يزيل كل مكعبات المرض في مدينته عند العلاج، ويزيل مكعبات المرض المطوّب تلقائيًا عند دخوله المدينة." },
    scientist: { name: "العالمة", icon: "🔬", desc: "تحتاج ٤ بطاقات فقط لاكتشاف علاج أي مرض بدل ٥." },
    researcher: { name: "الباحثة", icon: "📚", desc: "تستطيع إعطاء أي بطاقة مدينة لزميل في نفس المدينة، وليس فقط بطاقة المدينة الحالية." },
    generalist: { name: "الجنرال", icon: "🎖️", desc: "يملك ٥ إجراءات في كل دور بدل ٤." },
  };
  const ROLE_KEYS = Object.keys(ROLES);

  const PCOLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d"];
  const STATION_CITY = "ny";
  const CUBE_SUPPLY = 12;
  const MAX_OUTBREAKS = 8;
  const HAND_LIMIT = 7;
  const INFECTION_RATES = [2, 2, 3, 4, 5, 6, 7];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let cardSerial = 0;
  let aiRunner = null;

  /* ------------------------------ أدوات مساعدة ------------------------------ */

  function cityName(id) {
    return CITY_BY_ID[id] ? CITY_BY_ID[id].name : String(id || "");
  }

  function cur() {
    return state ? state.players[state.current] : null;
  }

  function playerAt(index) {
    return state.players[index] || null;
  }

  function cubesOf(cityId) {
    return state.cubes[cityId] || 0;
  }

  function usedByColor(color) {
    let total = 0;
    CITIES.forEach((city) => {
      if (city.c === color) total += cubesOf(city.id);
    });
    return total;
  }

  function supplyOf(color) {
    return Math.max(0, CUBE_SUPPLY - usedByColor(color));
  }

  function infectionRate() {
    return INFECTION_RATES[state.infectionRateIndex] || INFECTION_RATES[INFECTION_RATES.length - 1];
  }

  function stationCount() {
    return Object.keys(state.stations).length;
  }

  function stationAt(cityId) {
    return !!state.stations[cityId];
  }

  function playersIn(cityId) {
    return state.players.filter((player) => player.city === cityId);
  }

  function cityCards(hand) {
    return hand.filter((card) => card.type === "city");
  }

  function countColor(hand, color) {
    return hand.filter((card) => card.type === "city" && CITY_BY_ID[card.city] && CITY_BY_ID[card.city].c === color).length;
  }

  function hasCardFor(player, cityId) {
    return player.hand.some((card) => card.type === "city" && card.city === cityId);
  }

  function cureNeedFor(player) {
    return player && player.role === "scientist" ? 4 : 5;
  }

  function allCured() {
    return DISEASE_KEYS.every((color) => state.cures[color]);
  }

  function canAct() {
    return !!state && !state.over && state.phase === "actions" && state.actionsLeft > 0;
  }

  function canEndTurn() {
    return !!state && !state.over && state.phase === "actions";
  }

  function makeCityCard(cityId) {
    return { id: "city-" + (cardSerial++), type: "city", city: cityId };
  }

  function bumpCardSerial() {
    let max = -1;
    const scan = (card) => {
      const match = /^(?:city|epidemic)-(\d+)$/.exec(String(card && card.id || ""));
      if (match) max = Math.max(max, Number(match[1]));
    };
    if (!state) return;
    (state.players || []).forEach((player) => (player.hand || []).forEach(scan));
    ["playerDeck", "playerDiscard", "infectionDeck", "infectionDiscard"].forEach((key) => {
      (state[key] || []).forEach(scan);
    });
    cardSerial = Math.max(cardSerial, max + 1);
  }

  function makeEpidemic() {
    return { id: "epidemic-" + (cardSerial++), type: "epidemic" };
  }

  function cardWord(n) {
    if (n === 1) return "بطاقة واحدة";
    if (n === 2) return "بطاقتين";
    return n + " بطاقات";
  }

  function actionWord(n) {
    if (n === 1) return "إجراء واحد";
    if (n === 2) return "إجراءان";
    return n + " إجراءات";
  }

  function cubeWord(n) {
    if (n === 1) return "مكعب واحد";
    if (n === 2) return "مكعبان";
    return n + " مكعبات";
  }

  function outbreakWord(n) {
    if (n === 1) return "فاشية واحدة";
    if (n === 2) return "فاشيتان";
    return n + " فاشيات";
  }

  function log(message, kind) {
    if (apiRef) apiRef.log(message, kind);
  }

  function setNotice(message) {
    if (state) state.notice = message;
  }

  /* ------------------------------ بناء المجموعات ------------------------------ */

  function buildPlayerDeck(players) {
    const base = [];
    CITIES.forEach((city) => {
      base.push(makeCityCard(city.id));
      base.push(makeCityCard(city.id));
    });
    const shuffled = U.shuffle(base);
    const handSize = players.length === 2 ? 4 : players.length === 3 ? 3 : 2;
    players.forEach((player) => {
      player.hand = shuffled.splice(0, handSize);
    });

    const piles = 4;
    const per = Math.floor(shuffled.length / piles);
    const deck = [];
    for (let i = 0; i < piles; i++) {
      const part = shuffled.splice(0, i === piles - 1 ? shuffled.length : per);
      part.push(makeEpidemic());
      deck.push(...U.shuffle(part));
    }
    return deck;
  }

  function initialInfections() {
    const order = U.shuffle(CITIES.map((city) => city.id));
    const counts = [3, 3, 3, 2, 2, 2, 1, 1, 1];
    counts.forEach((count, index) => {
      const id = order[index];
      state.cubes[id] = count;
      state.infectionDiscard.push(id);
    });
    state.infectionDeck = order.slice(counts.length);
  }

  /* ------------------------------ منطق الأمراض ------------------------------ */

  function checkEradication(color) {
    if (!state || state.over) return;
    if (!state.cures[color] || state.eradicated[color]) return;
    if (usedByColor(color) === 0) {
      state.eradicated[color] = true;
      log("🎉 استُؤصل مرض <strong>" + U.escape(DISEASES[color].name) + "</strong> تمامًا من العالم.", "good");
      if (FX) FX.sound("point");
      BG.toast("استُؤصل " + DISEASES[color].name + " تمامًا!", "good");
    }
  }

  function loseGame(reason) {
    if (!state || state.over) return;
    state.over = true;
    state.result = "lose";
    state.reason = reason;
    state.phase = "over";
    state.notice = "💀 خسر الفريق: " + reason;
    log("💀 <strong>خسر الفريق:</strong> " + U.escape(reason), "warn");
    if (apiRef) apiRef.setStatus("انتهت اللعبة — خسارة", "over");
    render();
    if (FX) FX.lose();
    if (apiRef) {
      apiRef.gameOver({
        icon: "☣️",
        title: "انتشر الوباء",
        text: "لم يتمكن الفريق من إنقاذ العالم. <strong>" + U.escape(reason) + "</strong>",
        winner: "الوباء",
        standings: state.players.map((player) => ({
          name: player.name + " · " + ROLES[player.role].name,
          value: cityName(player.city) + " · " + cardWord(player.hand.length),
        })),
      });
    }
  }

  function winGame() {
    if (!state || state.over) return;
    state.over = true;
    state.result = "win";
    state.phase = "over";
    state.notice = "🌍 اكتُشفت العلاجات الأربعة! أنقذ الفريق العالم.";
    log("🌍 <strong>اكتُشفت العلاجات الأربعة!</strong> أنقذ الفريق العالم.", "good");
    if (apiRef) apiRef.setStatus("فاز الفريق", "over");
    render();
    if (FX) FX.win();
    if (apiRef) {
      apiRef.gameOver({
        icon: "🌍",
        title: "أنقذتم العالم!",
        text: "اكتشف الفريق العلاجات الأربعة قبل أن ينتشر الوباء. عمل جماعي رائع.",
        winner: "الفريق",
        standings: state.players.map((player) => ({
          name: player.name + " · " + ROLES[player.role].name,
          value: cityName(player.city) + " · " + cardWord(player.hand.length),
        })),
      });
    }
  }

  function triggerOutbreak(cityId, chain) {
    if (!state || state.over) return;
    const set = chain || new Set();
    if (set.has(cityId)) return;
    set.add(cityId);
    state.outbreaks += 1;
    state.lastOutbreak = cityId;
    log(
      "💥 <strong>فاشية في " + U.escape(cityName(cityId)) + "!</strong> " +
      outbreakWord(state.outbreaks) + " من " + MAX_OUTBREAKS + ".",
      "warn"
    );
    if (FX) FX.sound("outbreak");
    if (state.outbreaks >= MAX_OUTBREAKS) {
      loseGame("حدثت " + MAX_OUTBREAKS + " فاشيات، وانتشر الوباء خارج السيطرة.");
      return;
    }
    ADJ[cityId].slice().forEach((neighbor) => {
      if (!state.over) infectCity(neighbor, 1, set);
    });
  }

  function infectCity(cityId, count, chain) {
    if (!state || state.over) return;
    const city = CITY_BY_ID[cityId];
    if (!city || state.eradicated[city.c]) return;

    const currentCubes = cubesOf(cityId);
    const canPlace = Math.max(0, Math.min(count, 3 - currentCubes));
    if (canPlace > 0 && usedByColor(city.c) + canPlace > CUBE_SUPPLY) {
      loseGame("نفدت مكعبات مرض " + DISEASES[city.c].name + " من المخزون.");
      return;
    }

    state.cubes[cityId] = currentCubes + canPlace;
    if (canPlace < count) {
      triggerOutbreak(cityId, chain || new Set());
    }
  }

  function medicCleanup(player) {
    if (!state || !player || player.role !== "medic") return;
    const city = CITY_BY_ID[player.city];
    if (!city) return;
    if (state.cures[city.c] && cubesOf(player.city) > 0) {
      const removed = cubesOf(player.city);
      state.cubes[player.city] = 0;
      log(
        "🩺 الطبيب أزال " + cubeWord(removed) + " من مرض " +
        U.escape(DISEASES[city.c].name) + " المطوّب في " + U.escape(city.name) + " تلقائيًا.",
        "good"
      );
      checkEradication(city.c);
    }
  }

  /* ------------------------------ الإجراءات ------------------------------ */

  function spendAction() {
    if (!state) return;
    state.actionsLeft = Math.max(0, state.actionsLeft - 1);
    if (state.actionsLeft === 0) {
      setNotice("انتهت إجراءاتك. اضغط «اسحب بطاقتين» لبدء مرحلة السحب.");
    }
  }

  function performMove(destination, mode, cardId) {
    if (!canAct()) return false;
    const player = cur();
    const from = player.city;
    if (!CITY_BY_ID[destination] || destination === from) return false;

    if (mode === "ground") {
      if (!ADJ[from].includes(destination)) return false;
    } else if (mode === "shuttle") {
      if (!stationAt(from) || !stationAt(destination)) return false;
    } else if (mode === "direct" || mode === "charter") {
      const index = player.hand.findIndex((card) => card.id === cardId && card.type === "city");
      if (index < 0) return false;
      const card = player.hand[index];
      if (mode === "direct" && card.city !== destination) return false;
      if (mode === "charter" && card.city !== from) return false;
      player.hand.splice(index, 1);
      state.playerDiscard.push(card);
    } else {
      return false;
    }

    player.city = destination;
    state.lastMoved = destination;
    spendAction();
    const modeLabel = {
      ground: "انتقل بريًا",
      direct: "طار مباشرة باستخدام بطاقة المدينة",
      charter: "استخدم رحلة خاصة",
      shuttle: "استخدم مكوك المحطات",
    }[mode] || "انتقل";
    log(
      "🚶 <strong>" + U.escape(player.name) + "</strong> " + modeLabel +
      " من " + U.escape(cityName(from)) + " إلى <strong>" + U.escape(cityName(destination)) + "</strong>.",
      "accent"
    );
    if (FX) FX.sound(mode === "ground" ? "move" : mode === "shuttle" ? "train" : "ticket");
    medicCleanup(player);
    render();
    if (FX) {
      FX.after(() => {
        const node = rootRef && rootRef.querySelector('[data-city="' + destination + '"] .pan-node');
        if (node) { FX.pop(node); FX.pulse(node); }
      }, 30);
    }
    return true;
  }

  function buildStation() {
    if (!canAct()) return false;
    const player = cur();
    if (stationAt(player.city)) return false;
    if (stationCount() >= 6) return false;
    const index = player.hand.findIndex((card) => card.type === "city" && card.city === player.city);
    if (index < 0) return false;
    const card = player.hand.splice(index, 1)[0];
    state.playerDiscard.push(card);
    state.stations[player.city] = true;
    spendAction();
    log(
      "🏥 <strong>" + U.escape(player.name) + "</strong> بنى محطة أبحاث في <strong>" +
      U.escape(cityName(player.city)) + "</strong>.",
      "good"
    );
    if (FX) FX.sound("build");
    render();
    if (FX) {
      FX.after(() => {
        const node = rootRef && rootRef.querySelector('[data-city="' + player.city + '"] .pan-node');
        if (node) FX.pop(node);
      }, 30);
    }
    return true;
  }

  function treatDisease() {
    if (!canAct()) return false;
    const player = cur();
    const city = CITY_BY_ID[player.city];
    const cubes = cubesOf(player.city);
    if (!city || cubes <= 0) return false;
    if (state.eradicated[city.c]) return false;
    const remove = player.role === "medic" || state.cures[city.c] ? cubes : 1;
    state.cubes[player.city] = cubes - remove;
    spendAction();
    log(
      "💊 <strong>" + U.escape(player.name) + "</strong> عالج " + cubeWord(remove) +
      " من مرض " + U.escape(DISEASES[city.c].name) + " في <strong>" + U.escape(city.name) + "</strong>.",
      "good"
    );
    if (FX) FX.sound("place");
    checkEradication(city.c);
    render();
    return true;
  }

  function cureDisease(color) {
    if (!canAct()) return false;
    const player = cur();
    const city = CITY_BY_ID[player.city];
    if (!city || !stationAt(player.city)) return false;
    if (!DISEASES[color] || state.cures[color]) return false;
    const need = cureNeedFor(player);
    const available = countColor(player.hand, color);
    if (available < need) return false;

    let remaining = need;
    const kept = [];
    player.hand.forEach((card) => {
      if (remaining > 0 && card.type === "city" && CITY_BY_ID[card.city].c === color) {
        state.playerDiscard.push(card);
        remaining -= 1;
      } else {
        kept.push(card);
      }
    });
    player.hand = kept;
    state.cures[color] = true;
    spendAction();
    log(
      "🧪 <strong>" + U.escape(player.name) + "</strong> اكتشف علاج <strong>" +
      U.escape(DISEASES[color].name) + "</strong> باستخدام " + cardWord(need) + ".",
      "good"
    );
    if (FX) FX.sound("cure");
    checkEradication(color);
    render();
    if (FX) {
      FX.after(() => {
        const chip = rootRef && rootRef.querySelector('[data-cure="' + color + '"]');
        if (chip) { FX.pop(chip); FX.pulse(chip); }
      }, 30);
    }
    if (allCured()) {
      winGame();
    }
    return true;
  }

  function canGiveCard(giver, card) {
    if (!giver || !card || card.type !== "city") return false;
    if (giver.role === "researcher") return true;
    return card.city === giver.city;
  }

  function transferOptions() {
    if (!canAct()) return [];
    const player = cur();
    const others = state.players.filter((p) => p !== player && p.city === player.city);
    const options = [];
    others.forEach((other) => {
      player.hand.forEach((card) => {
        if (card.type !== "city") return;
        if (!canGiveCard(player, card)) return;
        options.push({ kind: "give", other, card, label: "أعطِ " + other.name + ": " + cityName(card.city) });
      });
      other.hand.forEach((card) => {
        if (card.type !== "city") return;
        if (!canGiveCard(other, card)) return;
        options.push({ kind: "take", other, card, label: "خُذ من " + other.name + ": " + cityName(card.city) });
      });
    });
    return options;
  }

  function transferCard(kind, otherIndex, cardId) {
    if (!canAct()) return false;
    const player = cur();
    const other = playerAt(otherIndex);
    if (!other || other === player || other.city !== player.city) return false;
    if (kind === "give") {
      const index = player.hand.findIndex((card) => card.id === cardId && card.type === "city");
      if (index < 0) return false;
      const card = player.hand[index];
      if (!canGiveCard(player, card)) return false;
      player.hand.splice(index, 1);
      other.hand.push(card);
      spendAction();
      log(
        "🤝 <strong>" + U.escape(player.name) + "</strong> أعطى <strong>" + U.escape(other.name) +
        "</strong> بطاقة " + U.escape(cityName(card.city)) + " في " + U.escape(cityName(player.city)) + ".",
        "accent"
      );
    } else if (kind === "take") {
      const index = other.hand.findIndex((card) => card.id === cardId && card.type === "city");
      if (index < 0) return false;
      const card = other.hand[index];
      if (!canGiveCard(other, card)) return false;
      other.hand.splice(index, 1);
      player.hand.push(card);
      spendAction();
      log(
        "🤝 <strong>" + U.escape(player.name) + "</strong> أخذ بطاقة " + U.escape(cityName(card.city)) +
        " من <strong>" + U.escape(other.name) + "</strong> في " + U.escape(cityName(player.city)) + ".",
        "accent"
      );
    } else {
      return false;
    }
    if (FX) FX.sound("card");
    render();
    return true;
  }

  function cureOptions() {
    if (!canAct()) return [];
    const player = cur();
    if (!stationAt(player.city)) return [];
    const need = cureNeedFor(player);
    return DISEASE_KEYS.filter((color) => {
      if (state.cures[color]) return false;
      return countColor(player.hand, color) >= need;
    }).map((color) => ({ color, need, have: countColor(player.hand, color) }));
  }

  function canBuildNow() {
    if (!canAct()) return false;
    const player = cur();
    if (stationAt(player.city) || stationCount() >= 6) return false;
    return hasCardFor(player, player.city);
  }

  function canTreatNow() {
    if (!canAct()) return false;
    if (cubesOf(cur().city) <= 0) return false;
    const city = CITY_BY_ID[cur().city];
    return !state.eradicated[city.c];
  }

  function flightAvailability() {
    const player = cur();
    const direct = player.hand.some((card) => card.type === "city" && card.city !== player.city);
    const charter = hasCardFor(player, player.city);
    const shuttle = stationAt(player.city) && stationCount() >= 2;
    return { direct, charter, shuttle, any: direct || charter || shuttle };
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function pathDistance(from, to) {
    if (!from || !to) return Infinity;
    if (from === to) return 0;
    const seen = {};
    seen[from] = true;
    const queue = [[from, 0]];
    while (queue.length) {
      const item = queue.shift();
      const place = item[0];
      const dist = item[1];
      const nextList = ADJ[place] || [];
      for (let i = 0; i < nextList.length; i++) {
        const next = nextList[i];
        if (seen[next]) continue;
        if (next === to) return dist + 1;
        seen[next] = true;
        queue.push([next, dist + 1]);
      }
    }
    return Infinity;
  }

  function cpuCurePressure(color) {
    let cubes = 0;
    CITIES.forEach((city) => { if (city.c === color) cubes += cubesOf(city.id); });
    let pressure = 0;
    if (cubes >= 6) pressure += 14;
    else if (cubes >= 3) pressure += 8;
    const supply = supplyOf(color);
    if (supply <= 2) pressure += 24;
    else if (supply <= 4) pressure += 14;
    else if (supply <= 7) pressure += 6;
    return pressure;
  }

  function cpuTreatValue(player) {
    if (!canTreatNow()) return 0;
    const city = CITY_BY_ID[player.city];
    const cubes = cubesOf(player.city);
    let score = cubes >= 3 ? 660 : cubes === 2 ? 345 : 95;
    if (state.cures[city.c]) score += 55;
    if (player.role === "medic") score += 40;
    const supply = supplyOf(city.c);
    if (supply <= 2) score += 120;
    else if (supply <= 4) score += 55;
    if (state.outbreaks >= MAX_OUTBREAKS - 2) score += 80;
    return score;
  }

  function cpuBuildValue(player) {
    if (!canBuildNow()) return 0;
    const city = CITY_BY_ID[player.city];
    const need = cureNeedFor(player);
    const ownCount = countColor(player.hand, city.c);
    if (ownCount >= need) return 0;

    const completeOther = DISEASE_KEYS.some((color) =>
      color !== city.c && !state.cures[color] && countColor(player.hand, color) >= need
    );
    if (completeOther) return 880;

    const nearOther = DISEASE_KEYS.some((color) =>
      color !== city.c && !state.cures[color] && countColor(player.hand, color) === need - 1
    );
    if (nearOther && stationCount() < 3) return ownCount >= need - 1 ? 390 : 450;
    return 0;
  }

  function cpuCanBuildForColor(player, color) {
    if (!canBuildNow()) return false;
    const city = CITY_BY_ID[player.city];
    if (city.c === color) return false;
    return countColor(player.hand, city.c) < cureNeedFor(player);
  }

  function cpuShareOptions(player) {
    if (!canAct()) return [];
    const options = [];
    const need = cureNeedFor(player);
    state.players.forEach((other) => {
      if (other === player || other.city !== player.city) return;
      const otherNeed = cureNeedFor(other);

      player.hand.forEach((card) => {
        if (card.type !== "city" || !canGiveCard(player, card)) return;
        const color = CITY_BY_ID[card.city].c;
        if (state.cures[color]) return;
        const otherCount = countColor(other.hand, color);
        if (otherCount >= otherNeed || otherCount + 1 < otherNeed) return;
        let score = stationAt(other.city) ? 930 : 800;
        if (countColor(player.hand, color) >= need) score -= 140;
        options.push({ kind: "give", otherIndex: other.index, cardId: card.id, score });
      });

      other.hand.forEach((card) => {
        if (card.type !== "city" || !canGiveCard(other, card)) return;
        const color = CITY_BY_ID[card.city].c;
        if (state.cures[color]) return;
        const ownCount = countColor(player.hand, color);
        if (ownCount >= need || ownCount + 1 < need) return;
        let score = stationAt(player.city) ? 990 : 860;
        if (countColor(other.hand, color) >= otherNeed) score -= 160;
        options.push({ kind: "take", otherIndex: other.index, cardId: card.id, score });
      });
    });
    return options;
  }

  function cpuShareGoals(player) {
    const goals = [];
    const need = cureNeedFor(player);
    state.players.forEach((other) => {
      if (other === player || other.city === player.city) return;
      const otherNeed = cureNeedFor(other);
      DISEASE_KEYS.forEach((color) => {
        if (state.cures[color]) return;
        const ownCount = countColor(player.hand, color);
        if (ownCount + 1 >= need && ownCount < need) {
          const card = other.hand.find((item) =>
            item.type === "city" && CITY_BY_ID[item.city].c === color && canGiveCard(other, item)
          );
          if (card) goals.push({ city: other.city, score: 570, kind: "take-goal" });
        }
        const otherCount = countColor(other.hand, color);
        if (otherCount + 1 >= otherNeed && otherCount < otherNeed) {
          const card = player.hand.find((item) =>
            item.type === "city" && CITY_BY_ID[item.city].c === color &&
            (player.role === "researcher" || item.city === other.city)
          );
          if (card) goals.push({ city: other.city, score: 620, kind: "give-goal" });
        }
      });
    });
    return goals;
  }

  function cpuNearestStation(fromCity) {
    if (stationAt(fromCity)) return null;
    let best = null;
    let bestDist = Infinity;
    Object.keys(state.stations).forEach((cityId) => {
      if (!stationAt(cityId) || cityId === fromCity) return;
      const dist = pathDistance(fromCity, cityId);
      if (dist < bestDist) {
        bestDist = dist;
        best = cityId;
      }
    });
    return best;
  }

  function cpuCardCost(player, card) {
    if (!card || card.type !== "city") return 0;
    const city = CITY_BY_ID[card.city];
    if (!city) return 0;
    const color = city.c;
    if (state.cures[color] || state.eradicated[color]) return 5;
    const count = countColor(player.hand, color);
    const need = cureNeedFor(player);
    if (count >= need) return 300;
    if (count === need - 1) return 150;
    if (count >= 2) return 45;
    return 12;
  }

  function cpuGoals(player) {
    const goals = [];
    const need = cureNeedFor(player);
    const atStation = stationAt(player.city);
    const complete = DISEASE_KEYS.filter((color) => !state.cures[color] && countColor(player.hand, color) >= need);
    const near = DISEASE_KEYS.filter((color) => !state.cures[color] && countColor(player.hand, color) === need - 1);

    if (!atStation) {
      complete.forEach((color) => {
        let bestCity = null;
        let bestDist = Infinity;
        player.hand.forEach((card) => {
          if (card.type !== "city" || card.city === player.city) return;
          if (stationAt(card.city) || stationCount() >= 6) return;
          const city = CITY_BY_ID[card.city];
          if (city.c === color) return;
          if (countColor(player.hand, city.c) >= need) return;
          const dist = pathDistance(player.city, card.city);
          if (dist < bestDist) {
            bestDist = dist;
            bestCity = card.city;
          }
        });
        if (bestCity) goals.push({ city: bestCity, score: 850, kind: "build-cure" });
        const stationCity = cpuNearestStation(player.city);
        if (stationCity) goals.push({ city: stationCity, score: 800, kind: "station-cure" });
      });

      near.forEach((color) => {
        const stationCity = cpuNearestStation(player.city);
        if (stationCity) goals.push({ city: stationCity, score: 455, kind: "station-near" });
        player.hand.forEach((card) => {
          if (card.type !== "city" || card.city === player.city) return;
          if (stationAt(card.city) || stationCount() >= 6) return;
          const city = CITY_BY_ID[card.city];
          if (city.c === color) return;
          if (countColor(player.hand, city.c) >= need) return;
          goals.push({ city: card.city, score: 500, kind: "build-near" });
        });
      });
    }

    cpuShareGoals(player).forEach((goal) => goals.push(goal));

    CITIES.forEach((city) => {
      if (city.id === player.city) return;
      const cubes = cubesOf(city.id);
      if (!cubes || state.eradicated[city.c]) return;
      let score = cubes >= 3 ? 650 : cubes === 2 ? 380 : 80;
      if (state.cures[city.c]) score += 55;
      const supply = supplyOf(city.c);
      if (supply <= 2) score += 120;
      else if (supply <= 4) score += 55;
      else if (supply <= 7) score += 15;
      if (state.outbreaks >= MAX_OUTBREAKS - 2) score += 90;
      if (playersIn(city.id).some((other) => other !== player)) score -= 40;
      goals.push({ city: city.id, score, kind: "threat" });
    });

    return goals;
  }

  function cpuMoveCandidates(player) {
    const list = [];
    const from = player.city;
    ADJ[from].forEach((dest) => {
      list.push({ mode: "ground", dest, card: null });
    });

    if (stationAt(from)) {
      Object.keys(state.stations).forEach((dest) => {
        if (dest !== from && stationAt(dest)) list.push({ mode: "shuttle", dest, card: null });
      });
    }

    player.hand.forEach((card) => {
      if (card.type !== "city") return;
      if (card.city !== from) {
        list.push({ mode: "direct", dest: card.city, card });
      } else {
        CITIES.forEach((city) => {
          if (city.id !== from) list.push({ mode: "charter", dest: city.id, card });
        });
      }
    });

    return list;
  }

  function cpuPickMove(player, goals) {
    if (!goals.length) return null;
    const candidates = cpuMoveCandidates(player).map((candidate) => {
      let best = -Infinity;
      goals.forEach((goal) => {
        const dist = pathDistance(candidate.dest, goal.city);
        const value = goal.score - dist * 8;
        if (value > best) best = value;
      });
      if (candidate.card) best -= cpuCardCost(player, candidate.card);
      return Object.assign({}, candidate, { score: best });
    }).filter((candidate) => candidate.score > 0);

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const level = AI.level(player.level);
    const pool = candidates.slice(0, level === "hard" ? 2 : level === "normal" ? 3 : 5);
    return AI.choose(pool, (candidate) => candidate.score, level) || pool[0];
  }

  function cpuActionCandidates(player) {
    const list = [];
    const treat = cpuTreatValue(player);
    if (treat > 0) list.push({ type: "treat", score: treat });
    cpuShareOptions(player).forEach((option) => {
      list.push({ type: "share", share: option, score: option.score });
    });
    const build = cpuBuildValue(player);
    if (build > 0) list.push({ type: "build", score: build });
    const move = cpuPickMove(player, cpuGoals(player));
    if (move) list.push({ type: "move", move, score: move.score });
    return list.filter((item) => item.score > 0);
  }

  function cpuPerformCandidate(choice) {
    const player = cur();
    if (!player) return;
    let ok = false;

    if (choice.type === "treat") {
      setNotice("🤖 " + AI.name(player) + " يعالج المرض في " + cityName(player.city) + ".");
      ok = treatDisease();
    } else if (choice.type === "build") {
      setNotice("🤖 " + AI.name(player) + " يبني محطة أبحاث في " + cityName(player.city) + ".");
      ok = buildStation();
    } else if (choice.type === "share") {
      const option = choice.share;
      const other = playerAt(option.otherIndex);
      setNotice("🤖 " + AI.name(player) + " يتبادل معرفة مع " + (other ? other.name : "زميل") + ".");
      ok = transferCard(option.kind, option.otherIndex, option.cardId);
    } else if (choice.type === "move") {
      const move = choice.move;
      setNotice("🤖 " + AI.name(player) + " يتحرك نحو " + cityName(move.dest) + ".");
      ok = performMove(move.dest, move.mode, move.card ? move.card.id : null);
    }

    if (!ok) beginDrawPhase();
  }

  function cpuTakeTurn() {
    if (!state || state.over || state.phase !== "actions") return;
    const player = cur();
    if (!player || !AI.isCpu(player)) return;
    if (state.actionsLeft <= 0) {
      beginDrawPhase();
      return;
    }

    const cures = cureOptions();
    if (cures.length) {
      const choice = AI.choose(cures, (option) => 1000 + cpuCurePressure(option.color), player.level) || cures[0];
      setNotice("🤖 " + AI.name(player) + " يكتشف علاج " + DISEASES[choice.color].name + ".");
      cureDisease(choice.color);
      return;
    }

    if (cpuTreatValue(player) >= 600) {
      setNotice("🤖 " + AI.name(player) + " يحتوي بؤرة المرض في " + cityName(player.city) + ".");
      treatDisease();
      return;
    }

    const candidates = cpuActionCandidates(player);
    if (!candidates.length) {
      beginDrawPhase();
      return;
    }

    candidates.sort((a, b) => b.score - a.score);
    const level = AI.level(player.level);
    const pool = candidates.slice(0, level === "hard" ? 2 : level === "normal" ? 3 : 4);
    const choice = AI.choose(pool, (candidate) => candidate.score, level) || pool[0];
    if (!choice || choice.score <= 0) {
      beginDrawPhase();
      return;
    }
    cpuPerformCandidate(choice);
  }

  function cpuChooseDiscard(player) {
    const cards = player.hand.filter((card) => card.type === "city");
    if (!cards.length) return player.hand[player.hand.length - 1] || null;
    const need = cureNeedFor(player);
    const scored = cards.map((card) => {
      const color = CITY_BY_ID[card.city].c;
      const count = countColor(player.hand, color);
      let keep = 0;
      if (state.cures[color] || state.eradicated[color]) keep -= 30;
      if (count >= need) keep += 100;
      else if (count === need - 1) keep += 50;
      if (count <= 1) keep -= 10;
      if (cards.filter((item) => item.city === card.city).length > 1) keep -= 20;
      const global = state.players.reduce((sum, other) => sum + countColor(other.hand, color), 0);
      if (global >= need) keep += 10;
      if (card.city === player.city && !stationAt(player.city)) keep += 8;
      keep += Math.random() * 6;
      return { card, keep };
    }).sort((a, b) => a.keep - b.keep);

    const level = AI.level(player.level);
    const pool = scored.slice(0, level === "hard" ? 1 : level === "normal" ? 2 : 3);
    return U.pick(pool).card;
  }

  function cpuStep() {
    if (!state || state.over) return;
    const player = cur();
    if (!player || !AI.isCpu(player)) return;
    if (state.phase === "actions") cpuTakeTurn();
    else if (state.phase === "infect") beginInfectPhase();
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const player = cur();
    if (!player || !AI.isCpu(player)) return;
    if (!AI.autoAllowed(apiRef, player)) return;
    if (state.phase !== "actions" && state.phase !== "infect") return;
    aiRunner.later(() => {
      if (!state || state.over) return;
      const active = cur();
      if (!active || !AI.isCpu(active)) return;
      cpuStep();
    }, AI.delay(player.level, 1.05));
  }

  /* ------------------------------ السحب والعدوى ------------------------------ */

  function refillInfectionDeck() {
    if (state.infectionDeck.length) return true;
    if (!state.infectionDiscard.length) return false;
    state.infectionDeck = U.shuffle(state.infectionDiscard);
    state.infectionDiscard = [];
    log("♻️ أُعيد خلط كومة العدوى لمواصلة انتشار المرض.", "");
    if (FX) FX.sound("shuffle");
    return true;
  }

  function drawInfectionCard() {
    if (!state.infectionDeck.length && !refillInfectionDeck()) return null;
    return state.infectionDeck.shift() || null;
  }

  function drawPlayerCard() {
    if (!state.playerDeck.length) {
      loseGame("نفدت بطاقات اللاعبين قبل اكتشاف العلاجات الأربعة.");
      return null;
    }
    const card = state.playerDeck.shift();
    if (card.type === "epidemic") {
      resolveEpidemic();
      return card;
    }
    cur().hand.push(card);
    return card;
  }

  function resolveEpidemic() {
    if (!state || state.over) return;
    state.infectionRateIndex = Math.min(INFECTION_RATES.length - 1, state.infectionRateIndex + 1);
    log(
      "⚠️ <strong>ظهر وباء!</strong> ارتفع معدل العدوى إلى <strong>" + infectionRate() +
      "</strong> مدن لكل دور.",
      "warn"
    );
    if (FX) FX.sound("dice");

    let id = state.infectionDeck.pop();
    if (!id) {
      refillInfectionDeck();
      id = state.infectionDeck.pop();
    }
    if (id) {
      state.infectionDiscard.push(id);
      const city = CITY_BY_ID[id];
      if (state.eradicated[city.c]) {
        log("المرض <strong>" + U.escape(DISEASES[city.c].name) + "</strong> مستأصل، لذلك لا تُضاف مكعبات في " + U.escape(city.name) + ".", "");
      } else {
        infectCity(id, 3, new Set());
        log(
          "🦠 وباء في <strong>" + U.escape(city.name) + "</strong>: حاولت إضافة ٣ مكعبات من " +
          U.escape(DISEASES[city.c].name) + ".", "warn"
        );
      }
    }

    state.infectionDeck = U.shuffle(state.infectionDiscard).concat(state.infectionDeck);
    state.infectionDiscard = [];
    log("🔀 تعزيز العدوى: أُعيد خلط كومة العدوى فوق كومة السحب.", "");
    if (FX) FX.sound("shuffle");
  }

  function drawTwoCards() {
    if (!state || state.over) return;
    for (let i = 0; i < 2; i++) {
      if (state.over) break;
      const card = drawPlayerCard();
      if (!card) break;
      if (card.type === "city") {
        log(
          "🃏 <strong>" + U.escape(cur().name) + "</strong> سحب بطاقة " +
          U.escape(cityName(card.city)) + ".",
          ""
        );
        if (FX) FX.sound("card");
      }
    }
  }

  function enforceHandLimit() {
    return new Promise((resolve) => {
      const step = () => {
        if (!state || state.over) return resolve(false);
        if (cur().hand.length <= HAND_LIMIT) return resolve(true);
        state.phase = "discard";
        setNotice(AI.isCpu(cur())
          ? "يد الكمبيوتر تتجاوز الحد — يختار بطاقة لتجاهلها تلقائيًا."
          : "تجاوزت حد اليد (" + HAND_LIMIT + "). اختر بطاقة لتجاهلها.");
        render();

        if (AI.isCpu(cur())) {
          const player = cur();
          const card = cpuChooseDiscard(player);
          if (!card) return resolve(false);
          const index = player.hand.findIndex((item) => item.id === card.id);
          const removed = player.hand.splice(index >= 0 ? index : player.hand.length - 1, 1)[0];
          if (removed) {
            state.playerDiscard.push(removed);
            log(
              "🗑️ <strong>" + U.escape(player.name) + "</strong> تجاهل بطاقة " +
              U.escape(cityName(removed.city)) + " بسبب حد اليد.",
              ""
            );
            if (FX) FX.sound("pass");
          }
          step();
          return;
        }

        openDiscardDialog().then((cardId) => {
          if (!state || state.over) return resolve(false);
          const player = cur();
          let index = player.hand.findIndex((card) => card.id === cardId);
          if (index < 0) index = player.hand.length - 1;
          const card = player.hand.splice(index, 1)[0];
          if (card) {
            state.playerDiscard.push(card);
            log(
              "🗑️ <strong>" + U.escape(player.name) + "</strong> تجاهل بطاقة " +
              U.escape(cityName(card.city)) + " بسبب حد اليد.",
              ""
            );
            if (FX) FX.sound("pass");
          }
          step();
        });
      };
      step();
    });
  }

  function beginDrawPhase() {
    if (!state || state.over || state.phase !== "actions") return;
    const run = async () => {
      state.phase = "drawing";
      setNotice("اسحب بطاقتين من كومة اللاعبين، ثم انتقل إلى مرحلة العدوى.");
      render();
      await U.sleep(180);
      drawTwoCards();
      if (state.over) { render(); return; }
      const ok = await enforceHandLimit();
      if (!ok || state.over) { render(); return; }
      state.phase = "infect";
      setNotice("مرحلة العدوى: اسحب " + infectionRate() + " بطاقات عدوى لتنتشر الأمراض.");
      render();
      if (FX) FX.sound("turn");
      if (AI.isCpu(cur())) {
        setTimeout(() => beginInfectPhase(), AI.delay(cur().level, 0.8));
      }
    };
    run();
  }

  function beginInfectPhase() {
    if (!state || state.over || state.phase !== "infect") return;
    state.phase = "infecting";
    setNotice("تنتشر الأمراض في المدن...");
    render();

    const rate = infectionRate();
    const drawn = [];
    for (let i = 0; i < rate; i++) {
      if (state.over) break;
      const id = drawInfectionCard();
      if (!id) break;
      const city = CITY_BY_ID[id];
      if (!city) continue;
      if (state.eradicated[city.c]) {
        drawn.push({ id, skipped: true });
        log("🛡️ " + U.escape(city.name) + ": المرض مستأصل، لا تظهر مكعبات جديدة.", "");
      } else {
        const before = cubesOf(id);
        infectCity(id, 1, new Set());
        if (state.over) break;
        drawn.push({ id, before, after: cubesOf(id) });
        log(
          "🦠 ظهر " + U.escape(DISEASES[city.c].name) + " في <strong>" + U.escape(city.name) +
          "</strong> (" + cubeWord(cubesOf(id)) + ").", ""
        );
      }
      state.infectionDiscard.push(id);
    }

    state.lastInfected = drawn;
    if (state.over) { render(); return; }

    state.current = (state.current + 1) % state.players.length;
    state.turn += 1;
    const player = cur();
    state.actionsLeft = player.role === "generalist" ? 5 : 4;
    state.phase = "actions";
    state.lastOutbreak = state.lastOutbreak || null;
    setNotice(
      "دور " + player.name + " (" + ROLES[player.role].name + ") — " +
      actionWord(state.actionsLeft) + " متاحة."
    );
    log(
      "🎬 بدأ دور <strong>" + U.escape(player.name) + "</strong> (" +
      U.escape(ROLES[player.role].name) + ") في " + U.escape(cityName(player.city)) + ".",
      "accent"
    );
    render();
    if (FX) {
      FX.sound("turn");
      FX.after(() => {
        if (!rootRef) return;
        const active = rootRef.querySelector(".pan-player.active");
        if (active) FX.pulse(active);
        drawn.forEach((entry, index) => {
          FX.after(() => {
            const node = rootRef.querySelector('[data-city="' + entry.id + '"] .pan-node');
            if (node) { FX.pop(node); FX.pulse(node); }
          }, index * 80);
        });
      }, 40);
    }
  }

  /* ------------------------------ النوافذ ------------------------------ */

  function colorDot(color) {
    return '<i class="pan-dot" style="--dc:' + DISEASES[color].hex + '"></i>';
  }

  function cityButtonHTML(cityId, value, extra) {
    const city = CITY_BY_ID[cityId];
    const cubes = cubesOf(cityId);
    const disease = DISEASES[city.c];
    const players = playersIn(cityId);
    return (
      '<button type="button" class="pan-pick" data-pick="' + U.escape(value) + '"' + (extra || "") + ">" +
      '<span class="pan-pick-main">' + colorDot(city.c) +
      "<strong>" + U.escape(city.name) + "</strong>" +
      "<small>" + U.escape(disease.name) + " · " + cubeWord(cubes) + "</small></span>" +
      '<span class="pan-pick-side">' +
      (stationAt(cityId) ? '<span class="pan-pick-station">🏥</span>' : "") +
      (players.length ? '<span class="pan-pick-pawns">' + players.map((p) => '<i style="--pc:' + p.color + '"></i>').join("") + "</span>" : "") +
      "</span>" +
      "</button>"
    );
  }

  function openGroundMove() {
    if (!canAct()) return;
    const player = cur();
    const body = document.createElement("div");
    body.className = "pan-dialog";
    body.innerHTML = '<p class="pan-dialog-hint">اختر مدينة مجاورة. الانتقال البري يكلّف إجراءً واحدًا.</p>' +
      '<div class="pan-pick-list">' +
      ADJ[player.city].map((id) => cityButtonHTML(id, "ground:" + id)).join("") +
      "</div>";
    const dialog = BG.openDialog({
      title: "انتقال بري من " + cityName(player.city),
      body,
      actions: [{ label: "إلغاء", value: "" }],
      className: "pan-dialog-box",
    });
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (pick) dialog.close(pick.getAttribute("data-pick"));
    });
    dialog.promise.then((value) => {
      if (!value || !value.startsWith("ground:")) return;
      performMove(value.slice(7), "ground");
    });
  }

  function openFlightDialog() {
    if (!canAct()) return;
    const player = cur();
    const flight = flightAvailability();
    if (!flight.any) {
      BG.toast("لا تملك بطاقة مناسبة أو محطة ثانية للطيران.", "warn");
      if (FX) FX.sound("error");
      return;
    }

    const body = document.createElement("div");
    body.className = "pan-dialog";
    let html = '<p class="pan-dialog-hint">كل خيار طيران يكلّف إجراءً واحدًا. اختر وجهتك.</p>';

    if (flight.direct) {
      html += '<section class="pan-dialog-sec"><h3>✈️ طيران مباشر</h3><p>تجاهل بطاقة مدينة للسفر إليها.</p><div class="pan-pick-list">' +
        cityCards(player.hand).filter((card) => card.city !== player.city).map((card) =>
          cityButtonHTML(card.city, "direct:" + card.id + ":" + card.city)
        ).join("") + "</div></section>";
    }
    if (flight.charter) {
      html += '<section class="pan-dialog-sec"><h3>🛩️ رحلة خاصة</h3><p>تجاهل بطاقة مدينتك الحالية للسفر إلى أي مدينة.</p>' +
        '<div class="pan-charter"><select class="pan-select" data-charter-select aria-label="وجهة الرحلة الخاصة">' +
        CITIES.filter((city) => city.id !== player.city).map((city) =>
          '<option value="' + city.id + '">' + U.escape(city.name) + " — " + U.escape(DISEASES[city.c].name) + "</option>"
        ).join("") + '</select><button type="button" class="bg-btn small" data-pick="charter">سافر</button></div></section>';
    }
    if (flight.shuttle) {
      html += '<section class="pan-dialog-sec"><h3>🚝 مكوك المحطات</h3><p>انتقل بين محطات الأبحاث مجانًا.</p><div class="pan-pick-list">' +
        Object.keys(state.stations).filter((id) => id !== player.city).map((id) =>
          cityButtonHTML(id, "shuttle:" + id)
        ).join("") + "</div></section>";
    }

    body.innerHTML = html;
    const dialog = BG.openDialog({
      title: "خيارات الطيران",
      body,
      actions: [{ label: "إلغاء", value: "" }],
      className: "pan-dialog-box",
    });
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (!pick) return;
      const value = pick.getAttribute("data-pick");
      if (value === "charter") {
        const select = body.querySelector("[data-charter-select]");
        if (select && select.value) dialog.close("charter:" + select.value);
      } else {
        dialog.close(value);
      }
    });
    dialog.promise.then((value) => {
      if (!value) return;
      if (value.startsWith("direct:")) {
        const parts = value.split(":");
        const cardId = parts[1];
        const cityId = parts[2];
        performMove(cityId, "direct", cardId);
      } else if (value.startsWith("charter:")) {
        const cityId = value.slice(8);
        const card = player.hand.find((item) => item.type === "city" && item.city === player.city);
        if (card) performMove(cityId, "charter", card.id);
      } else if (value.startsWith("shuttle:")) {
        performMove(value.slice(8), "shuttle");
      }
    });
  }

  function openShareDialog() {
    if (!canAct()) return;
    const player = cur();
    const options = transferOptions();
    if (!options.length) {
      BG.toast("لا توجد بطاقة قابلة للتبادل مع زميل في مدينتك.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const body = document.createElement("div");
    body.className = "pan-dialog";
    body.innerHTML = '<p class="pan-dialog-hint">يمكن تبادل بطاقة مدينة تطابق المدينة الحالية، أو أي بطاقة إذا كان المُعطي باحثة. يكلّف إجراءً واحدًا.</p>' +
      '<div class="pan-pick-list">' +
      options.map((opt) => {
        const city = CITY_BY_ID[opt.card.city];
        return (
          '<button type="button" class="pan-pick" data-pick="' +
          (opt.kind === "give" ? "give:" : "take:") + opt.other.index + ":" + opt.card.id + '">' +
          '<span class="pan-pick-main">' + colorDot(city.c) +
          "<strong>" + U.escape(opt.label) + "</strong>" +
          "<small>من " + U.escape(cityName(player.city)) + " · " + U.escape(DISEASES[city.c].name) + "</small></span>" +
          "</button>"
        );
      }).join("") + "</div>";
    const dialog = BG.openDialog({
      title: "تبادل المعرفة",
      body,
      actions: [{ label: "إلغاء", value: "" }],
      className: "pan-dialog-box",
    });
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (!pick) return;
      const value = pick.getAttribute("data-pick");
      const parts = value.split(":");
      const kind = parts[0];
      const otherIndex = Number(parts[1]);
      const cardId = parts.slice(2).join(":");
      dialog.close(kind + ":" + otherIndex + ":" + cardId);
    });
    dialog.promise.then((value) => {
      if (!value || value === "cancel") return;
      const parts = value.split(":");
      if (parts.length < 3) return;
      transferCard(parts[0], Number(parts[1]), parts.slice(2).join(":"));
    });
  }

  function openCureDialog() {
    if (!canAct()) return;
    const player = cur();
    const options = cureOptions();
    if (!options.length) {
      BG.toast("تحتاج " + cureNeedFor(player) + " بطاقات من لون واحد داخل محطة أبحاث لاكتشاف العلاج.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const body = document.createElement("div");
    body.className = "pan-dialog";
    body.innerHTML = '<p class="pan-dialog-hint">اختر مرضًا لصرف بطاقاته واكتشاف علاجه. اكتشاف العلاجات الأربعة يفوز باللعبة فورًا.</p>' +
      '<div class="pan-pick-list">' +
      options.map((opt) =>
        '<button type="button" class="pan-pick" data-pick="' + opt.color + '">' +
        '<span class="pan-pick-main">' + colorDot(opt.color) +
        "<strong>" + U.escape(DISEASES[opt.color].name) + "</strong>" +
        "<small>" + opt.have + " بطاقات متاحة · تحتاج " + opt.need + "</small></span>" +
        '<span class="pan-pick-side"><span class="pan-pick-badge">علاج</span></span></button>'
      ).join("") + "</div>";
    const dialog = BG.openDialog({
      title: "اكتشاف علاج",
      body,
      actions: [{ label: "إلغاء", value: "" }],
      className: "pan-dialog-box",
    });
    body.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-pick]");
      if (pick) dialog.close(pick.getAttribute("data-pick"));
    });
    dialog.promise.then((value) => {
      if (value && DISEASES[value]) cureDisease(value);
    });
  }

  function openTeamHands() {
    const body = document.createElement("div");
    body.className = "pan-dialog";
    body.innerHTML = '<p class="pan-dialog-hint">أيدي الفريق مكشوفة لأن اللعبة تعاونية. خططوا للعلاجات معًا.</p>' +
      state.players.map((player) => {
        const cards = cardCityList(player.hand);
        return '<section class="pan-team-hand' + (player.index === state.current ? " active" : "") + '">' +
          '<header><span class="pdot" style="--pc:' + player.color + '">' + (player.index + 1) + "</span>" +
          "<strong>" + U.escape(player.name) + "</strong>" +
          "<small>" + ROLES[player.role].icon + " " + U.escape(ROLES[player.role].name) + " · " + U.escape(cityName(player.city)) + "</small></header>" +
          '<div class="pan-hand">' + (cards || '<span class="pan-empty">لا بطاقات.</span>') + "</div></section>";
      }).join("");
    BG.openDialog({
      title: "أيدي الفريق",
      body,
      actions: [{ label: "إغلاق", value: "ok", primary: true }],
      className: "pan-dialog-box",
    });
  }

  function cardCityList(hand) {
    const cards = hand.filter((card) => card.type === "city").slice().sort((a, b) => {
      const ca = CITY_BY_ID[a.city];
      const cb = CITY_BY_ID[b.city];
      if (ca.c !== cb.c) return DISEASE_KEYS.indexOf(ca.c) - DISEASE_KEYS.indexOf(cb.c);
      return ca.name.localeCompare(cb.name, "ar");
    });
    return cards.map((card) => {
      const city = CITY_BY_ID[card.city];
      return '<span class="pan-card" style="--dc:' + DISEASES[city.c].hex + '"><i></i><span>' + U.escape(city.name) + "</span></span>";
    }).join("");
  }

  function openDiscardDialog() {
    const player = cur();
    const body = document.createElement("div");
    body.className = "pan-dialog";
    body.innerHTML = '<p class="pan-dialog-hint">يدك تتجاوز الحد. اختر بطاقة لتجاهلها. البطاقات المتجاهلة لا تعود إلى اللعبة.</p>' +
      '<div class="pan-hand pan-hand-pick">' +
      player.hand.map((card) => {
        const city = CITY_BY_ID[card.city];
        return '<button type="button" class="pan-card pan-card-btn" data-card="' + card.id + '" style="--dc:' + DISEASES[city.c].hex + '">' +
          "<i></i><span>" + U.escape(city.name) + "</span></button>";
      }).join("") + "</div>";
    const dialog = BG.openDialog({
      title: "حد اليد — تجاهل بطاقة",
      body,
      actions: [],
      className: "pan-dialog-box pan-discard-dialog",
    });
    const handler = (event) => {
      const card = event.target.closest("[data-card]");
      if (!card) return;
      dialog.close(card.getAttribute("data-card"));
    };
    body.addEventListener("click", handler);
    dialog.dialog.addEventListener("cancel", (event) => event.preventDefault());
    return dialog.promise;
  }

  function openCityInfo(cityId) {
    const city = CITY_BY_ID[cityId];
    if (!city) return;
    const disease = DISEASES[city.c];
    const players = playersIn(cityId);
    const body = document.createElement("div");
    body.className = "pan-dialog pan-city-info";
    body.innerHTML =
      '<div class="pan-info-head">' + colorDot(city.c) +
      "<div><strong>" + U.escape(city.name) + "</strong><small>" + U.escape(disease.name) + " · " + U.escape(city.c) + "</small></div></div>" +
      '<dl class="pan-info-facts">' +
      "<dt>المكعبات</dt><dd>" + cubeWord(cubesOf(cityId)) + " / 3</dd>" +
      "<dt>المحطة</dt><dd>" + (stationAt(cityId) ? "محطة أبحاث 🏥" : "لا توجد محطة") + "</dd>" +
      "<dt>العلاج</dt><dd>" + (state.cures[city.c] ? (state.eradicated[city.c] ? "مستأصل ✅" : "مطوّب 🧪") : "غير مطوّب") + "</dd>" +
      "<dt>اللاعبون</dt><dd>" + (players.length ? players.map((p) => U.escape(p.name)).join("، ") : "لا أحد") + "</dd>" +
      "</dl>" +
      '<div class="pan-info-links"><strong>مدن مجاورة</strong><div>' +
      ADJ[cityId].map((id) => '<span class="pan-link" data-city-link="' + id + '">' + colorDot(CITY_BY_ID[id].c) + U.escape(cityName(id)) + "</span>").join("") +
      "</div></div>";
    const dialog = BG.openDialog({
      title: "مدينة " + city.name,
      body,
      actions: [{ label: "إغلاق", value: "ok", primary: true }],
      className: "pan-dialog-box",
    });
    body.addEventListener("click", (event) => {
      const link = event.target.closest("[data-city-link]");
      if (!link) return;
      dialog.close("city");
      openCityInfo(link.getAttribute("data-city-link"));
    });
  }

  /* ------------------------------ العرض ------------------------------ */

  function mapSVG() {
    const player = cur();
    const near = new Set([player.city, ...ADJ[player.city]]);
    const lines = EDGES.map(([a, b], i) => {
      const ca = CITY_BY_ID[a];
      const cb = CITY_BY_ID[b];
      const active = a === player.city || b === player.city;
      const dx = cb.x - ca.x;
      const dy = cb.y - ca.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const bow = ((i % 5) - 2) * 4.5;
      const mx = (ca.x + cb.x) / 2 + (-dy / len) * bow;
      const my = (ca.y + cb.y) / 2 + (dx / len) * bow;
      return '<path d="M' + ca.x + " " + ca.y + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + cb.x + " " + cb.y + '"' +
        ' class="pan-route' + (active ? " is-active" : "") + '" />';
    }).join("");
    return (
      '<svg class="pan-lines" viewBox="0 0 1160 680" preserveAspectRatio="none" aria-hidden="true">' +
      '<g class="pan-continents">' +
      '<path class="is-na" d="M66 166 252 112 386 156 370 286 286 392 190 360 108 300Z" />' +
      '<path class="is-sa" d="M258 396 372 380 430 470 386 626 308 630 282 512Z" />' +
      '<path class="is-eu" d="M428 140 588 108 652 178 620 300 548 356 462 320 434 222Z" />' +
      '<path class="is-af" d="M548 330 626 312 704 348 736 430 690 534 622 590 566 508 546 416Z" />' +
      '<path class="is-as" d="M626 150 802 108 1008 166 1104 292 1040 448 884 478 766 404 660 356 616 262Z" />' +
      '<path class="is-au" d="M962 500 1080 500 1112 596 1010 646 946 590Z" />' +
      "</g>" +
      '<g class="pan-ocean-labels">' +
      '<text x="190" y="470">المحيط الهادئ</text>' +
      '<text x="420" y="170">المحيط الأطلسي</text>' +
      '<text x="900" y="600">المحيط الهندي</text>' +
      "</g>" +
      lines + "</svg>"
    );
  }

  function cityHTML(city) {
    const cubes = cubesOf(city.id);
    const disease = DISEASES[city.c];
    const players = playersIn(city.id);
    const classes = ["pan-city", "is-" + city.c];
    if (stationAt(city.id)) classes.push("is-station");
    if (state.lastOutbreak === city.id) classes.push("is-outbreak");
    if ((state.lastInfected || []).some((entry) => entry.id === city.id)) classes.push("is-infected");
    if (state.cures[city.c]) classes.push("is-cured");
    if (state.eradicated[city.c]) classes.push("is-eradicated");
    if (cur().city === city.id) classes.push("is-current");
    if (cubes >= 3) classes.push("is-full");
    const label = city.name + " — " + disease.name + " — " + cubeWord(cubes) +
      (stationAt(city.id) ? " — محطة أبحاث" : "") +
      (players.length ? " — " + players.map((p) => p.name).join("، ") : "");
    return (
      '<button type="button" class="' + classes.join(" ") + '" data-city="' + city.id + '" style="--x:' +
      (city.x / 1160 * 100) + "%;--y:" + (city.y / 680 * 100) + '%;--cc:' + disease.hex + '" aria-label="' + U.escape(label) + '">' +
      '<span class="pan-node">' +
      '<span class="pan-cubes">' + Array.from({ length: cubes }, () => '<i class="pan-cube"></i>').join("") + "</span>" +
      (stationAt(city.id) ? '<span class="pan-station" title="محطة أبحاث">🏥</span>' : "") +
      (state.cures[city.c] ? '<span class="pan-cure-mark" title="علاج مطوّب">✓</span>' : "") +
      '<span class="pan-pawns">' + players.map((p) => '<i class="pan-pawn" data-fx-piece="pan-p-' + p.index + '" data-fx-enter="rise" style="--pc:' + p.color + '" title="' + U.escape(p.name) + '"></i>').join("") + "</span>" +
      "</span>" +
      '<span class="pan-name">' + U.escape(city.name) + "</span>" +
      "</button>"
    );
  }

  function turnHTML() {
    const player = cur();
    const role = ROLES[player.role];
    const phaseLabel = {
      actions: "مرحلة الإجراءات",
      drawing: "سحب البطاقات",
      discard: "تجاهل بطاقة",
      infect: "مرحلة العدوى",
      infecting: "انتشار العدوى",
      over: "انتهت اللعبة",
    }[state.phase] || state.phase;
    const dots = Array.from({ length: player.role === "generalist" ? 5 : 4 }, (_, index) =>
      '<i class="pan-action-dot' + (index < state.actionsLeft ? " on" : "") + '"></i>'
    ).join("");
    return (
      '<div class="pan-panel pan-turn">' +
      '<span class="pan-kicker">' + U.escape(phaseLabel) + " · الدور " + state.turn + "</span>" +
      '<div class="pan-turn-name"><span class="pdot" style="--pc:' + player.color + '">' + (player.index + 1) + "</span>" +
      "<strong>" + U.escape(player.name) + (player.isCpu ? ' <span class="pan-cpu-tag">🤖 كمبيوتر</span>' : "") + "</strong></div>" +
      '<div class="pan-role"><span>' + role.icon + "</span><div><b>" + U.escape(role.name) + "</b><small>" + U.escape(cityName(player.city)) + "</small></div></div>" +
      '<div class="pan-actions-left"><span>الإجراءات المتبقية</span><div class="pan-action-dots">' + dots + "</div><b>" + state.actionsLeft + "</b></div>" +
      '<p class="pan-notice">' + U.escape(state.notice) + "</p>" +
      "</div>"
    );
  }

  function metersHTML() {
    const pct = Math.min(100, state.outbreaks / MAX_OUTBREAKS * 100);
    return (
      '<div class="pan-panel pan-meters">' +
      '<span class="pan-kicker">مؤشرات الوباء</span>' +
      '<div class="pan-meter is-danger"><div><span>الفاشيات</span><strong>' + state.outbreaks + " / " + MAX_OUTBREAKS + "</strong></div>" +
      '<div class="pan-bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="pan-meter is-rate"><div><span>معدل العدوى</span><strong>' + infectionRate() + " مدن</strong></div>" +
      '<div class="pan-rate-dots">' + INFECTION_RATES.map((rate, index) =>
        '<i class="' + (index <= state.infectionRateIndex ? "on" : "") + '">' + rate + "</i>"
      ).join("") + "</div></div>" +
      '<div class="pan-cures">' + DISEASE_KEYS.map((color) => {
        const cured = state.cures[color];
        const eradicated = state.eradicated[color];
        return '<div class="pan-cure' + (cured ? " is-cured" : "") + (eradicated ? " is-eradicated" : "") + '" data-cure="' + color + '" style="--dc:' + DISEASES[color].hex + '">' +
          '<i class="pan-dot"></i><div><strong>' + U.escape(DISEASES[color].name) + "</strong><small>" +
          (eradicated ? "مستأصل" : cured ? "علاج مطوّب" : "نشط") + "</small></div>" +
          '<b>' + (eradicated ? "✅" : cured ? "🧪" : "•") + "</b></div>";
      }).join("") + "</div>" +
      '<div class="pan-supply">' + DISEASE_KEYS.map((color) =>
        '<span style="--dc:' + DISEASES[color].hex + '"><i></i><small>' + U.escape(DISEASES[color].name) + "</small><b>" + supplyOf(color) + "</b></span>"
      ).join("") + "</div>" +
      '<div class="pan-stations-line">🏥 محطات الأبحاث: <b>' + stationCount() + " / 6</b></div>" +
      "</div>"
    );
  }

  function actionsHTML() {
    const cpuTurn = AI.isCpu(cur());
    if (state.phase === "infect") {
      return (
        '<div class="pan-panel pan-action-panel">' +
        '<span class="pan-kicker">المرحلة التالية</span>' +
        '<button type="button" class="bg-btn primary pan-wide" data-act="infect"' + (cpuTurn ? " disabled" : "") + '>🦠 انتشار العدوى</button>' +
        '<p class="pan-hint">' + (cpuTurn
          ? "🤖 الكمبيوتر سينتقل إلى مرحلة العدوى تلقائيًا."
          : "اسحب " + infectionRate() + " بطاقات عدوى وأضف مكعبًا إلى كل مدينة. ثم يبدأ دور اللاعب التالي.") + "</p>" +
        "</div>"
      );
    }
    if (state.phase === "drawing" || state.phase === "discard" || state.phase === "infecting") {
      return (
        '<div class="pan-panel pan-action-panel">' +
        '<span class="pan-kicker">جارٍ التنفيذ</span>' +
        '<button type="button" class="bg-btn pan-wide" disabled>⏳ ' +
        (state.phase === "drawing" ? "سحب البطاقات" : state.phase === "discard" ? "انتظار تجاهل بطاقة" : "انتشار العدوى") +
        "</button>" +
        '<p class="pan-hint">' + (cpuTurn ? "🤖 الكمبيوتر يكمل الخطوة تلقائيًا." : "أكمل الخطوة الحالية للمتابعة.") + "</p>" +
        "</div>"
      );
    }
    if (state.phase === "over") {
      return (
        '<div class="pan-panel pan-action-panel">' +
        '<span class="pan-kicker">انتهت اللعبة</span>' +
        '<button type="button" class="bg-btn pan-wide" disabled>' + (state.result === "win" ? "🌍 أنقذتم العالم" : "☣️ انتشر الوباء") + "</button>" +
        '<p class="pan-hint">ابدأ لعبة جديدة من زر «لعبة جديدة».</p>' +
        "</div>"
      );
    }

    const can = canAct() && !cpuTurn;
    const flight = can && flightAvailability();
    const build = can && canBuildNow();
    const treat = can && canTreatNow();
    const share = can && transferOptions().length > 0;
    const cure = can && cureOptions().length > 0;
    const endLabel = "🂠 اسحب بطاقتين";
    return (
      '<div class="pan-panel pan-action-panel">' +
      '<span class="pan-kicker">أوامر الدور</span>' +
      (cpuTurn ? '<div class="pan-cpu-turn">🤖 الكمبيوتر يخطط وينفّذ إجراءاته تلقائيًا…</div>' : "") +
      '<div class="pan-action-grid">' +
      '<button type="button" class="bg-btn" data-act="move"' + (can ? "" : " disabled") + ">🚶 انتقال</button>" +
      '<button type="button" class="bg-btn" data-act="fly"' + (flight && flight.any ? "" : " disabled") + ">✈️ طيران</button>" +
      '<button type="button" class="bg-btn" data-act="build"' + (build ? "" : " disabled") + ">🏥 محطة أبحاث</button>" +
      '<button type="button" class="bg-btn" data-act="treat"' + (treat ? "" : " disabled") + ">💊 علاج</button>" +
      '<button type="button" class="bg-btn" data-act="share"' + (share ? "" : " disabled") + ">🤝 تبادل معرفة</button>" +
      '<button type="button" class="bg-btn" data-act="cure"' + (cure ? "" : " disabled") + ">🧪 اكتشاف علاج</button>" +
      "</div>" +
      '<button type="button" class="bg-btn primary pan-wide" data-act="end"' + (state.phase === "actions" && !cpuTurn ? "" : " disabled") + ">" + endLabel + "</button>" +
      '<p class="pan-hint">' +
      (cpuTurn
        ? "سياسة الكمبيوتر: علاج فوري، احتواء المدن المهددة، ثم بناء المحطات وتبادل المعرفة."
        : state.phase === "actions"
          ? "يمكنك تنفيذ إجراءاتك ثم اسحب بطاقتين في أي وقت لبدء العدوى."
          : "اتبع الخطوات حسب المرحلة.") +
      "</p>" +
      "</div>"
    );
  }

  function handHTML() {
    const player = cur();
    const cards = cardCityList(player.hand);
    return (
      '<div class="pan-hand-head"><span>يد ' + U.escape(player.name) + "</span><b>" + player.hand.length + " / " + HAND_LIMIT + "</b></div>" +
      '<div class="pan-hand">' + (cards || '<span class="pan-empty">لا بطاقات في اليد.</span>') + "</div>" +
      '<div class="pan-hand-foot"><span>أيدي الفريق مكشوفة في اللعبة التعاونية.</span><button type="button" class="bg-btn small" data-act="team">👥 أيدي الفريق</button></div>'
    );
  }

  function playersHTML() {
    return state.players.map((player) => {
      const active = player.index === state.current;
      return (
        '<div class="pan-player' + (active ? " active" : "") + '" style="--pc:' + player.color + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<div class="pan-player-copy"><strong>' + U.escape(player.name) + (player.isCpu ? ' <span class="pan-cpu-tag">🤖</span>' : "") + "</strong>" +
        "<small>" + ROLES[player.role].icon + " " + U.escape(ROLES[player.role].name) + " · " + U.escape(cityName(player.city)) + "</small></div>" +
        '<span class="pan-player-hand">' + player.hand.length + " 🃏</span>" +
        "</div>"
      );
    }).join("");
  }

  function legendHTML() {
    return (
      '<div class="pan-panel pan-legend">' +
      '<span class="pan-kicker">دليل سريع</span>' +
      '<div class="pan-legend-row"><b>🎯</b><span>اكتشف علاجات الأمراض الأربعة قبل حدوث ٨ فاشيات أو نفاد المكعبات.</span></div>' +
      '<div class="pan-legend-row"><b>🩺</b><span>الطبيب يزيل كل مكعبات المدينة عند العلاج. العالمة تحتاج ٤ بطاقات للعلاج.</span></div>' +
      '<div class="pan-legend-row"><b>🤝</b><span>تبادل بطاقة تطابق مدينتك الحالية مع زميل في نفس المدينة.</span></div>' +
      '<div class="pan-legend-row"><b>🦠</b><span>كل وباء يرفع معدل العدوى ويعيد خلط كومة العدوى.</span></div>' +
      "</div>"
    );
  }

  function centerMapOnCurrent() {
    if (!rootRef || !state) return;
    const scroll = rootRef.querySelector(".pan-map-scroll");
    const map = scroll && scroll.querySelector(".pan-map");
    const marker = rootRef.querySelector('.pan-city[data-city="' + cur().city + '"]');
    if (!scroll || !map || !marker) return;
    const mapBox = map.getBoundingClientRect();
    const cityBox = marker.getBoundingClientRect();
    const center = cityBox.left - mapBox.left + cityBox.width / 2;
    const target = center - scroll.clientWidth / 2;
    scroll.scrollLeft = Math.max(0, Math.min(mapBox.width - scroll.clientWidth, target));
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const wrap = document.createElement("div");
    wrap.className = "pan-layout";

    const main = document.createElement("div");
    main.className = "pan-main";
    const board = document.createElement("div");
    board.className = "pan-board-wrap";
    const lastInfected = (state.lastInfected || []).slice(-4).map((entry) => {
      const city = CITY_BY_ID[entry.id];
      return '<span class="pan-last-chip" style="--dc:' + DISEASES[city.c].hex + '">' + colorDot(city.c) + U.escape(city.name) + (entry.skipped ? " 🛡️" : "") + "</span>";
    }).join("");
    board.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-pandemic"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">إنقاذ تعاوني · ٢٤ مدينة</span><strong>وباء</strong></div>' +
      '<span class="board-head-hint">أربعة أمراض · أربع إجراءات · علاجات أربعة قبل الفاشية الثامنة</span>' +
      "</div>" +
      '<div class="pan-map-scroll"><div class="pan-map">' + mapSVG() + CITIES.map(cityHTML).join("") + "</div></div>" +
      '<div class="pan-map-foot"><span class="pan-map-hint">انقر على أي مدينة لعرض تفاصيلها ومدنها المجاورة.</span>' +
      (lastInfected ? '<div class="pan-last">آخر إصابات: ' + lastInfected + "</div>" : "") +
      "</div>";

    main.appendChild(board);

    const note = document.createElement("div");
    note.className = "pan-panel pan-last-note";
    note.innerHTML = '<span class="pan-kicker">ملاحظة الميدان</span><p>' + U.escape(state.notice) + "</p>" +
      '<div class="pan-current-city">' + colorDot(CITY_BY_ID[player.city].c) + "موقعك الحالي: <strong>" + U.escape(cityName(player.city)) + "</strong>" +
      (stationAt(player.city) ? " · محطة أبحاث 🏥" : "") + "</div>";
    main.appendChild(note);

    const side = document.createElement("aside");
    side.className = "pan-side";
    side.innerHTML =
      turnHTML() +
      metersHTML() +
      actionsHTML() +
      '<div class="pan-panel pan-hand-panel">' + handHTML() + "</div>" +
      '<div class="pan-panel pan-players"><span class="pan-kicker">الفريق</span>' + playersHTML() + "</div>" +
      legendHTML();

    wrap.appendChild(main);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);
    centerMapOnCurrent();

    if (apiRef) {
      if (state.over) {
        apiRef.setStatus(state.result === "win" ? "فاز الفريق" : "انتهت — خسارة", "over");
      } else {
        apiRef.setStatus("دور " + AI.statusName(player) + " · " + state.actionsLeft + " إجراءات");
      }
    }
    syncCpu();
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    const city = event.target.closest("[data-city]");
    if (city) {
      openCityInfo(city.getAttribute("data-city"));
      return;
    }
    const action = event.target.closest("[data-act]");
    if (!action) return;
    const act = action.getAttribute("data-act");
    if (state && AI.isCpu(cur()) && act !== "team") return;
    if (act === "move") openGroundMove();
    else if (act === "fly") openFlightDialog();
    else if (act === "build") buildStation();
    else if (act === "treat") treatDisease();
    else if (act === "share") openShareDialog();
    else if (act === "cure") openCureDialog();
    else if (act === "team") openTeamHands();
    else if (act === "end") {
      if (state.phase !== "actions" || state.over) return;
      if (state.actionsLeft > 0) {
        BG.confirm(
          "إنهاء الإجراءات",
          "لديك " + actionWord(state.actionsLeft) + " متبقية. هل تريد إنهاء الإجراءات وبدء السحب؟",
          "أنهِ الإجراءات",
          "متابعة اللعب"
        ).then((yes) => { if (yes) beginDrawPhase(); });
      } else {
        beginDrawPhase();
      }
    } else if (act === "infect") beginInfectPhase();
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "pandemic",
    name: "وباء",
    en: "PANDEMIC",
    icon: "🦠",
    accent: "#6cc7c3",
    cardClass: "card-pandemic",
    tagline: "اكتشف العلاجات الأربعة مع فريقك قبل أن ينتشر الوباء ويطيح بالعالم.",
    players: "2–4",
    duration: "45–70 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 3,

    rules: {
      goal: "لعبة تعاونية: يعمل جميع اللاعبين كفريق واحد لاكتشاف علاجات أربعة أمراض قبل أن تحدث ثماني فاشيات، أو تنفد مكعبات مرض من المخزون، أو تنفد بطاقات اللاعبين. الفوز جماعي والخسارة جماعية.",
      facts: [["المدن", "٢٤ مدينة"], ["الأمراض", "٤ أمراض"], ["الإجراءات", "٤ لكل لاعب (٥ للجنرال)"], ["الفاشيات", "٨ = خسارة"]],
      components: [
        "٢٤ مدينة موزعة على أربعة أمراض: إنفلونزا (أزرق)، حمى صفراء (أصفر)، طاعون (أسود)، وشلل (أحمر).",
        "٤٨ بطاقة مدينة (نسختان من كل مدينة) و٤ بطاقات وباء، تشكل كومة سحب اللاعبين.",
        "٢٤ بطاقة عدوى (بطاقة واحدة لكل مدينة) تشكل كومة العدوى.",
        "١٢ مكعبًا لكل مرض (٤٨ مكعبًا إجمالًا) بما يناسب خريطة ٢٤ مدينة، و٦ محطات أبحاث، وأربع بطاقات أدوار، وقطعة لكل لاعب.",
        "٤ بطاقات دور: الطبيب، العالمة، الباحثة، والجنرال. تُوزع عشوائيًا على اللاعبين.",
      ],
      setup: [
        "توضع محطة أبحاث البداية في نيويورك، ويبدأ جميع اللاعبين في نيويورك.",
        "تُخلط بطاقات المدينة الـ٤٨ وتُوزع يد البداية: ٤ بطاقات لكل لاعب في لعبة اللاعبين، ٣ في لعبة الثلاثة، وبطاقتان في لعبة الأربعة.",
        "تُقسم بقية كومة اللاعبين إلى أربع أكوام متساوية تقريبًا، ويُخلط وباء واحد في كل كومة، ثم تُكدّس الأكوام لتشكيل كومة السحب.",
        "تُخلط بطاقات العدوى الـ٢٤. تُسحب ٩ مدن: ٣ مدن تحصل على ٣ مكعبات، و٣ على مكعبين، و٣ على مكعب واحد. توضع البطاقات المسحوبة في كومة العدوى المتجاهلة.",
        "تبدأ لعبة العدوى بمعدل ٢، ويبدأ اللاعب الأول بدوره. يُمنح كل لاعب دوره كاملًا (٤ إجراءات، أو ٥ للجنرال).",
      ],
      steps: [
        "<strong>الإجراءات:</strong> في دورك نفّذ حتى ٤ إجراءات (٥ للجنرال). يمكنك تكرار الإجراء نفسه ما دامت الشروط متوفرة. تنتهي الإجراءات عند نفاد النقاط أو عندما تختار إنهاءها.",
        "<strong>الانتقال البري:</strong> انتقل إلى مدينة مجاورة متصلة بخط. يكلّف إجراءً واحدًا.",
        "<strong>الطيران المباشر:</strong> تجاهل بطاقة مدينة من يدك وانتقل إلى تلك المدينة. يكلّف إجراءً واحدًا.",
        "<strong>الرحلة الخاصة:</strong> تجاهل بطاقة المدينة التي تقف فيها وانتقل إلى أي مدينة أخرى. يكلّف إجراءً واحدًا.",
        "<strong>مكوك المحطات:</strong> انتقل بين أي محطتين أبحاث. يكلّف إجراءً واحدًا.",
        "<strong>بناء محطة أبحاث:</strong> تجاهل بطاقة المدينة التي تقف فيها لبناء محطة أبحاث هناك. لا يمكن بناء أكثر من ٦ محطات، ولا يمكن بناء محطة في مدينة فيها محطة.",
        "<strong>علاج المرض:</strong> أزل مكعبًا واحدًا من مرض المدينة التي تقف فيها. إذا كان المرض مطوّبًا، أزل كل مكعباته في المدينة. الطبيب يزيل كل المكعبات دائمًا. يكلّف إجراءً واحدًا.",
        "<strong>تبادل المعرفة:</strong> أعطِ أو خُذ بطاقة مدينة تطابق المدينة التي تقفان فيها، مع لاعب آخر في نفس المدينة. الباحثة تستطيع إعطاء أي بطاقة. يكلّف إجراءً واحدًا.",
        "<strong>اكتشاف علاج:</strong> داخل محطة أبحاث، تجاهل ٥ بطاقات من لون مرض واحد لاكتشاف علاجه (٤ بطاقات للعالمة). يكلّف إجراءً واحدًا. لا يمكن اكتشاف علاج مرض مطوّب مسبقًا.",
        "<strong>سحب البطاقات:</strong> بعد الإجراءات اسحب بطاقتين من كومة اللاعبين. إذا ظهر وباء، ارفع معدل العدوى، ثم اسحب البطاقة السفلية من كومة العدوى وضع ٣ مكعبات في مدينتها، ثم أعد خلط كومة العدوى المتجاهلة فوق كومة العدوى. إذا تجاوزت يدك ٧ بطاقات، تجاهل البطاقات الزائدة.",
        "<strong>انتشار العدوى:</strong> اسحب بطاقات عدوى بعدد معدل العدوى الحالي، وضع مكعبًا واحدًا في كل مدينة مسحوبة. إذا كانت المدينة تحتوي ٣ مكعبات، تحدث فاشية: أضف مكعبًا إلى كل مدينة مجاورة، وقد تتسلسل الفاشيات. لا تُضاف مكعبات لمرض مستأصل.",
        "<strong>نهاية الدور:</strong> بعد انتشار العدوى ينتقل الدور إلى اللاعب التالي في اتجاه ثابت، وتُعاد الإجراءات.",
      ],
      winning: "يفوز الفريق فور اكتشاف العلاج الرابع. لا يشترط استئصال الأمراض من اللوحة. يخسر الفريق إذا حدثت ٨ فاشيات، أو نفدت مكعبات أي مرض من المخزون، أو احتاج سحب بطاقة لاعب بينما كومة اللاعبين فارغة. استئصال المرض (علاج + صفر مكعبات على اللوحة) يمنع إضافة مكعبات جديدة منه.",
      notes: [
        "النسخة الرقمية تبسّط خريطة اللعبة الأصلية إلى ٢٤ مدينة (٦ لكل مرض) بدل ٤٨ مدينة، مع احتفاظها بآلية العدوى والفاشيات والعلاجات.",
        "كل مدينة مرتبطة بمرض واحد فقط، لذلك لا توجد مدن متعددة الأمراض في هذه النسخة.",
        "عند إضافة دفعة مكعبات (وباء) إلى مدينة فيها مكعبات، تُحدث فاشية واحدة وتُثبّت المدينة عند ٣ مكعبات بدل احتساب فاشية لكل مكعب زائد.",
        "أيدي اللاعبين مكشوفة لأن اللعبة تعاونية، ويمكن فتح «أيدي الفريق» لمراجعة بطاقات الجميع. كومة اللاعبين وكومة العدوى وترتيبهما سرّيان.",
        "تُوزع الأدوار عشوائيًا عند بدء اللعبة. لا توجد أحداث خاصة (Event Cards) في هذه النسخة، ويركز التبسيط على الإجراءات الأساسية والأدوار.",
        "الفاشيات الناتجة عن سلسلة واحدة لا تعيد فاشية المدينة نفسها مرتين في السلسلة نفسها، لكن يمكن أن تتكرر في سلسلة أخرى.",
        "خُفّض مخزون كل مرض من ٢٤ إلى ١٢ مكعبًا ليتناسب مع ٦ مدن لكل مرض بدل ١٢ مدينة في اللعبة الأصلية، مع إبقاء حد ٣ مكعبات لكل مدينة. بذلك يبقى نفاد المخزون خطرًا حقيقيًا كما في القواعد الأصلية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      cardSerial = 0;
      aiRunner = AI.runner();

      const players = api.players.map((player, index) => ({
        index,
        name: player.name,
        type: player.type === "cpu" ? "cpu" : "human",
        level: AI.level(player.level),
        isCpu: AI.isCpu(player),
        role: "medic",
        color: PCOLORS[index % PCOLORS.length],
        city: STATION_CITY,
        hand: [],
      }));

      const roles = U.shuffle(ROLE_KEYS).slice(0, players.length);
      players.forEach((player, index) => { player.role = roles[index]; });

      state = {
        players,
        current: 0,
        turn: 1,
        actionsLeft: 4,
        phase: "actions",
        cures: { blue: false, yellow: false, black: false, red: false },
        eradicated: { blue: false, yellow: false, black: false, red: false },
        cubes: {},
        stations: { [STATION_CITY]: true },
        outbreaks: 0,
        infectionRateIndex: 0,
        infectionDeck: [],
        infectionDiscard: [],
        playerDeck: [],
        playerDiscard: [],
        lastInfected: [],
        lastOutbreak: null,
        lastMoved: STATION_CITY,
        notice: "",
        over: false,
        result: null,
        reason: "",
      };

      CITIES.forEach((city) => { state.cubes[city.id] = 0; });
      state.playerDeck = buildPlayerDeck(players);
      initialInfections();

      state.actionsLeft = players[0].role === "generalist" ? 5 : 4;
      setNotice(
        "دور " + players[0].name + " (" + ROLES[players[0].role].name + ") — " +
        actionWord(state.actionsLeft) + " متاحة. ابدأ باحتواء المرض."
      );

      api.log(
        "بدأت وباء — " + players.length + " لاعبين، " + CITIES.length +
        " مدينة، وأربعة أمراض. محطة البداية في نيويورك." +
        (players.filter((player) => player.isCpu).length
          ? " " + players.filter((player) => player.isCpu).length + " مقعد كمبيوتر."
          : ""),
        "accent"
      );
      players.forEach((player) => {
        api.log(
          "🎭 <strong>" + U.escape(player.name) + "</strong> يلعب بدور " +
          U.escape(ROLES[player.role].name) + " — " + U.escape(ROLES[player.role].desc),
          ""
        );
      });
      api.log(
        "🦠 العدوى الأولية: ٣ مدن بثلاثة مكعبات، و٣ بمدينين، و٣ بمكعب واحد. معدل العدوى الحالي ٢.",
        "warn"
      );
      if (FX) FX.sound("shuffle");
      render();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render, cur, CITIES, CITY_BY_ID, DISEASES, DISEASE_KEYS, ROLES, ROLE_KEYS, ADJ,
          cubesOf, usedByColor, supplyOf, infectionRate, stationCount, stationAt, playersIn,
          performMove, buildStation, treatDisease, cureDisease, transferCard, transferOptions, cureOptions,
          beginDrawPhase, beginInfectPhase, resolveEpidemic, infectCity, triggerOutbreak,
          drawInfectionCard, drawPlayerCard, loseGame, winGame, allCured, checkEradication,
          cpuTakeTurn, cpuStep, syncCpu, cpuActionCandidates, cpuGoals, cpuPickMove,
          cpuChooseDiscard, cpuShareOptions, cpuBuildValue, cpuTreatValue, pathDistance,
          forceCubes(cityId, n) { state.cubes[cityId] = Math.max(0, Math.min(3, n)); render(); },
          setActions(n) { state.actionsLeft = n; render(); },
          setPhase(phase) { state.phase = phase; render(); },
          setCurrent(index) { state.current = index; state.actionsLeft = cur().role === "generalist" ? 5 : 4; render(); },
          setCure(color, value) { state.cures[color] = !!value; render(); },
          setEradicated(color, value) { state.eradicated[color] = !!value; render(); },
          setOutbreaks(n) { state.outbreaks = n; render(); },
          setInfectionRate(index) { state.infectionRateIndex = index; render(); },
          setDeck(cards) { state.playerDeck = cards; render(); },
          setInfectionDeck(cards) { state.infectionDeck = cards; render(); },
          giveCard(playerIndex, cityId) { state.players[playerIndex].hand.push(makeCityCard(cityId)); render(); },
        };
      }

      rootRef.addEventListener("click", handleClick);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.cubes = state.cubes || {};
          state.stations = state.stations || {};
          state.lastInfected = Array.isArray(state.lastInfected) ? state.lastInfected : [];
          state.players.forEach((player) => {
            player.hand = Array.isArray(player.hand) ? player.hand : [];
          });
          bumpCardSerial();
          render();
        },
        netSeat() {
          return state ? state.current : -1;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state) return;
          render();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
