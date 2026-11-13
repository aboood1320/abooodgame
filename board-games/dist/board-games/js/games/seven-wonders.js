/* ==========================================================================
   عجائب الدنيا السبع — سحب البطاقات وبناء الحضارة
   ثلاثة أعمار، سبع بطاقات لكل لاعب في كل عمر، تمرير اليد بين الجيران،
   موارد وتجارة، علوم، عسكر، نقابات، وثلاث مراحل لكل عجيبة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const RES = ["wood", "stone", "clay", "ore", "glass", "paper", "cloth"];
  const RES_AR = {
    wood: "خشب", stone: "حجر", clay: "طين", ore: "خام",
    glass: "زجاج", paper: "ورق", cloth: "قماش",
  };
  const SCIENCE_AR = { gear: "ترس", compass: "بوصلة", tablet: "لوح" };
  const TYPE_AR = {
    raw: "خام", manufactured: "مصنّع", civilian: "مدني", military: "عسكري",
    science: "علمي", commercial: "تجاري", guild: "نقابة",
  };
  const TYPE_CLASS = {
    raw: "is-raw", manufactured: "is-manufactured", civilian: "is-civilian",
    military: "is-military", science: "is-science", commercial: "is-commercial",
    guild: "is-guild",
  };
  const AGE_VALUE = { 1: 1, 2: 3, 3: 5 };

  const WONDERS = [
    {
      name: "عملاق رودس", start: "ore",
      stages: [
        { cost: { coins: 2, res: { ore: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { ore: 2 } }, shields: 2 },
        { cost: { coins: 4, res: { ore: 2 } }, vp: 7 },
      ],
    },
    {
      name: "حدائق بابل المعلقة", start: "clay",
      stages: [
        { cost: { coins: 2, res: { clay: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { clay: 2 } }, vp: 7 },
        { cost: { coins: 4, res: { clay: 2 } }, science: "tablet" },
      ],
    },
    {
      name: "تمثال زيوس في أولمبيا", start: "stone",
      stages: [
        { cost: { coins: 2, res: { stone: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { stone: 2 } }, shields: 2 },
        { cost: { coins: 4, res: { stone: 2 } }, vp: 7 },
      ],
    },
    {
      name: "معبد أرتميس في أفسس", start: "wood",
      stages: [
        { cost: { coins: 2, res: { wood: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { wood: 2 } }, coins: 4 },
        { cost: { coins: 4, res: { wood: 2 } }, vp: 7 },
      ],
    },
    {
      name: "ضريح موسولوس", start: "clay",
      stages: [
        { cost: { coins: 2, res: { clay: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { clay: 2 } }, vp: 4 },
        { cost: { coins: 4, res: { clay: 2 } }, vp: 7 },
      ],
    },
    {
      name: "فنار الإسكندرية", start: "glass",
      stages: [
        { cost: { coins: 2, res: { glass: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { glass: 2 } }, prod: "glass" },
        { cost: { coins: 4, res: { glass: 2 } }, vp: 7 },
      ],
    },
    {
      name: "هرم الجيزة", start: "stone",
      stages: [
        { cost: { coins: 2, res: { stone: 1 } }, vp: 3 },
        { cost: { coins: 3, res: { stone: 2 } }, vp: 5 },
        { cost: { coins: 4, res: { stone: 2 } }, vp: 7 },
      ],
    },
  ];

  const POOL_I = [
    { name: "مقلع الحجر", type: "raw", production: "stone", cost: { coins: 1 } },
    { name: "منشرة الخشب", type: "raw", production: "wood", cost: { coins: 1 } },
    { name: "حفرة الطين", type: "raw", production: "clay", cost: { coins: 1 } },
    { name: "منجم الخام", type: "raw", production: "ore", cost: { coins: 1 } },
    { name: "مصنع الزجاج", type: "manufactured", production: "glass", cost: { coins: 1 } },
    { name: "معمل الورق", type: "manufactured", production: "paper", cost: { coins: 1 } },
    { name: "نول القماش", type: "manufactured", production: "cloth", cost: { coins: 1 } },
    { name: "مزرعة", type: "civilian", vp: 2, cost: { coins: 1 } },
    { name: "مسرح", type: "civilian", vp: 3, cost: { coins: 2 } },
    { name: "حمّام عام", type: "civilian", vp: 3, cost: { coins: 1, res: { stone: 1 } } },
    { name: "ثكنة", type: "military", shields: 1, cost: { coins: 1 } },
    { name: "برج المراقبة", type: "military", shields: 1, cost: { coins: 2 } },
    { name: "سور المدينة", type: "military", shields: 2, cost: { coins: 2, res: { stone: 1 } } },
    { name: "ورشة النجارة", type: "science", science: "gear", cost: { coins: 1, res: { wood: 1 } } },
    { name: "مدرسة الفلك", type: "science", science: "compass", cost: { coins: 1, res: { glass: 1 } } },
    { name: "كتّاب المدينة", type: "science", science: "tablet", cost: { coins: 1, res: { paper: 1 } } },
    { name: "حانة", type: "commercial", coins: 4, cost: { coins: 1 } },
    { name: "سوق", type: "commercial", coins: 3, vp: 1, cost: { coins: 2 } },
  ];

  const POOL_II = [
    { name: "محجر", type: "raw", production: "stone", cost: { coins: 1 } },
    { name: "غابة", type: "raw", production: "wood", cost: { coins: 1 } },
    { name: "بركة الطين", type: "raw", production: "clay", cost: { coins: 1 } },
    { name: "مسبك", type: "raw", production: "ore", cost: { coins: 1 } },
    { name: "مصنّع الزجاج", type: "manufactured", production: "glass", cost: { coins: 1 } },
    { name: "مطبعة", type: "manufactured", production: "paper", cost: { coins: 1 } },
    { name: "مشغل النسيج", type: "manufactured", production: "cloth", cost: { coins: 1 } },
    { name: "معبد", type: "civilian", vp: 4, cost: { coins: 3 } },
    { name: "حدائق", type: "civilian", vp: 5, cost: { coins: 4 } },
    { name: "قاعة المدينة", type: "civilian", vp: 4, cost: { coins: 2, res: { clay: 1 } } },
    { name: "ساحة تدريب", type: "military", shields: 2, cost: { coins: 3 } },
    { name: "فرسان", type: "military", shields: 3, cost: { coins: 4 } },
    { name: "أسوار", type: "military", shields: 2, cost: { coins: 2, res: { stone: 1 } } },
    { name: "مرصد", type: "science", science: "compass", cost: { coins: 2, res: { glass: 1 } } },
    { name: "مختبر", type: "science", science: "gear", cost: { coins: 2, res: { ore: 1 } } },
    { name: "مكتبة", type: "science", science: "tablet", cost: { coins: 2, res: { paper: 1 } } },
    { name: "بنك", type: "commercial", coins: 6, cost: { coins: 3 } },
    { name: "ميناء تجاري", type: "commercial", coins: 4, vp: 1, cost: { coins: 2, res: { wood: 1 } } },
  ];

  const POOL_III = [
    { name: "حدائق ملكية", type: "civilian", vp: 6, cost: { coins: 4, res: { cloth: 1 } } },
    { name: "قصر", type: "civilian", vp: 8, cost: { coins: 6 } },
    { name: "كاتدرائية", type: "civilian", vp: 7, cost: { coins: 5, res: { stone: 1 } } },
    { name: "مجلس الشيوخ", type: "civilian", vp: 6, cost: { coins: 5 } },
    { name: "حصن", type: "military", shields: 3, cost: { coins: 4 } },
    { name: "جيش", type: "military", shields: 3, cost: { coins: 5 } },
    { name: "أسطول", type: "military", shields: 2, cost: { coins: 3 } },
    { name: "جامعة", type: "science", science: "compass", cost: { coins: 3, res: { paper: 1 } } },
    { name: "أكاديمية", type: "science", science: "gear", cost: { coins: 3, res: { glass: 1 } } },
    { name: "مرصد ملكي", type: "science", science: "tablet", cost: { coins: 3, res: { ore: 1 } } },
    { name: "خزينة", type: "commercial", coins: 7, cost: { coins: 4 } },
    { name: "شركة تجارية", type: "commercial", coins: 6, vp: 2, cost: { coins: 4 } },
    { name: "نقابة التجار", type: "guild", guild: { per: "commercial", value: 1, scope: "neighbors" }, cost: { coins: 3 } },
    { name: "نقابة البنائين", type: "guild", guild: { per: "wonder", value: 2, scope: "neighbors" }, cost: { coins: 3 } },
    { name: "نقابة العلماء", type: "guild", guild: { per: "science", value: 1, scope: "neighbors" }, cost: { coins: 3 } },
    { name: "نقابة العسكريين", type: "guild", guild: { per: "military", value: 1, scope: "neighbors" }, cost: { coins: 3 } },
  ];

  const POOLS = { 1: POOL_I, 2: POOL_II, 3: POOL_III };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makePlayers() {
    const count = Math.max(2, Math.min(4, (apiRef.players || []).length || 2));
    const colors = ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb"];
    const wonders = U.shuffle(WONDERS).slice(0, count);
    return XG.players(apiRef, count, colors).map((player, index) => ({
      ...player,
      color: player.profileColor || colors[index],
      wonder: wonders[index],
      stages: 0,
      wonderVp: 0,
      coins: 3,
      prod: { [wonders[index].start]: 1 },
      built: [],
      hand: [],
      shields: 0,
      militaryVp: 0,
      sciences: { gear: 0, compass: 0, tablet: 0 },
    }));
  }

  function deckFor(age, players) {
    const specs = POOLS[age] || POOL_I;
    const deck = [];
    specs.forEach((spec) => {
      const copies = age === 3 ? 3 : 3;
      for (let i = 0; i < copies; i++) deck.push(spec);
    });
    let pool = U.shuffle(deck);
    const need = players * 7;
    while (pool.length < need) pool = pool.concat(U.shuffle(deck));
    return pool.slice(0, need);
  }

  function newState() {
    const players = makePlayers();
    const deck = deckFor(1, players.length);
    players.forEach((player) => {
      player.hand = deck.splice(0, 7);
    });
    return {
      players,
      age: 1,
      round: 1,
      pickOrder: players.map((player) => player.index),
      pickPos: 0,
      selected: null,
      discarded: [],
      notice: "العصر الأول — اختر بطاقة من يدك ثم ابنِها أو استخدمها لبناء عجيبتك أو اطرحها مقابل ٣ عملات.",
      last: null,
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.pickOrder[state.pickPos]]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return cur().index;
  }

  function neighborsOf(player) {
    const n = state.players.length;
    const left = state.players[(player.index - 1 + n) % n];
    const right = state.players[(player.index + 1) % n];
    return left === right ? [left] : [left, right];
  }

  function costText(cost) {
    const parts = [];
    if (cost && cost.coins) parts.push(ar(cost.coins) + " ◆");
    if (cost && cost.res) {
      Object.entries(cost.res).forEach(([key, value]) => parts.push((value > 1 ? ar(value) + " " : "") + RES_AR[key]));
    }
    return parts.length ? parts.join(" · ") : "مجانًا";
  }

  function canAfford(player, cost) {
    if (!cost) return { coins: 0, missing: {} };
    let coins = cost.coins || 0;
    const missing = {};
    const neighbors = neighborsOf(player);
    const keys = Object.keys(cost.res || {});
    for (const key of keys) {
      const need = cost.res[key] || 0;
      const have = player.prod[key] || 0;
      const gap = Math.max(0, need - have);
      if (!gap) continue;
      const available = neighbors.reduce((sum, neighbor) => sum + (neighbor.prod[key] || 0), 0);
      if (available < gap) return null;
      coins += gap * 2;
      missing[key] = gap;
    }
    if (coins > player.coins) return null;
    return { coins, missing };
  }

  function payCost(player, pay) {
    player.coins -= pay.coins || 0;
  }

  function applyCard(player, card) {
    player.built.push(card);
    if (card.type === "raw" || card.type === "manufactured") player.prod[card.production] = (player.prod[card.production] || 0) + 1;
    if (card.type === "military") player.shields += card.shields || 0;
    if (card.type === "science") player.sciences[card.science] += 1;
    if (card.type === "commercial" && card.coins) player.coins += card.coins;
  }

  function applyStage(player, stage) {
    if (stage.vp) player.wonderVp += stage.vp;
    if (stage.shields) player.shields += stage.shields;
    if (stage.coins) player.coins += stage.coins;
    if (stage.science) player.sciences[stage.science] += 1;
    if (stage.prod) player.prod[stage.prod] = (player.prod[stage.prod] || 0) + 1;
  }

  function canPick(player) {
    if (!state || state.over) return false;
    if (XG.canAct(apiRef, state, player.index, state.over)) return true;
    return XG.cpuTurn(apiRef, state, player.index);
  }

  function afterPick() {
    state.selected = null;
    state.pickPos += 1;
    if (state.pickPos >= state.pickOrder.length) {
      passHands();
      state.round += 1;
      state.pickPos = 0;
      if (state.round > 7) {
        endAge();
        return;
      }
      state.notice = "مرّرت الأيدي. بدأت الجولة " + ar(state.round) + " من العصر " + ar(state.age) + ".";
    } else {
      const nxt = cur();
      state.notice = "دور " + nxt.name + " — اختر بطاقة من يده.";
    }
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function passHands() {
    const n = state.players.length;
    const direction = state.age === 2 ? -1 : 1;
    const hands = state.players.map((player) => player.hand);
    state.players.forEach((player, index) => {
      const from = (index - direction + n) % n;
      player.hand = hands[from];
    });
  }

  function buildCard(index) {
    if (!state || state.over) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const card = player.hand[index];
    if (!card) return false;
    const pay = canAfford(player, card.cost);
    if (!pay) {
      apiRef.toast("لا تستطيع دفع تكلفة «" + card.name + "»، حتى مع التجارة مع الجيران.", "warn");
      return false;
    }
    payCost(player, pay);
    player.hand.splice(index, 1);
    applyCard(player, card);
    state.last = { text: player.name + " بنى " + card.name + "." };
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> بنى <strong>" + esc(card.name) + "</strong> (" +
      esc(TYPE_AR[card.type]) + ") بـ" + ar(pay.coins) + " عملة" +
      (Object.keys(pay.missing).length ? " بعد التجارة" : "") + ".",
      "accent"
    );
    afterPick();
    return true;
  }

  function buildWonder(index) {
    if (!state || state.over) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const card = player.hand[index];
    if (!card) return false;
    const stage = player.wonder.stages[player.stages];
    if (!stage) {
      apiRef.toast("عجيبتك مكتملة بالفعل.", "warn");
      return false;
    }
    const pay = canAfford(player, stage.cost);
    if (!pay) {
      apiRef.toast("لا تستطيع دفع تكلفة المرحلة " + ar(player.stages + 1) + " من عجيبتك.", "warn");
      return false;
    }
    payCost(player, pay);
    player.hand.splice(index, 1);
    player.stages += 1;
    applyStage(player, stage);
    state.last = { text: player.name + " شيّد المرحلة " + ar(player.stages) + " من " + player.wonder.name + "." };
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> شيّد المرحلة <strong>" + ar(player.stages) + "</strong> من عجيبة <strong>" +
      esc(player.wonder.name) + "</strong> مقابل " + ar(pay.coins) + " عملة.",
      "good"
    );
    afterPick();
    return true;
  }

  function discardCard(index) {
    if (!state || state.over) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const card = player.hand[index];
    if (!card) return false;
    player.hand.splice(index, 1);
    player.coins += 3;
    state.discarded.push(card);
    state.last = { text: player.name + " طرح " + card.name + " مقابل 3 عملات." };
    apiRef.log("<strong>" + esc(player.name) + "</strong> طرح <strong>" + esc(card.name) + "</strong> مقابل ٣ عملات.", "warn");
    afterPick();
    return true;
  }

  function endAge() {
    const value = AGE_VALUE[state.age] || 1;
    state.players.forEach((player) => {
      neighborsOf(player).forEach((neighbor) => {
        if (player.shields > neighbor.shields) player.militaryVp += value;
        else if (player.shields < neighbor.shields) player.militaryVp -= value;
      });
      apiRef.log(
        "<strong>" + esc(player.name) + "</strong> عسكريًا: " + ar(player.shields) +
        " درعًا، ورصيد العسكر " + ar(player.militaryVp) + ".",
        "accent"
      );
    });
    if (state.age >= 3) {
      finish();
      return;
    }
    state.age += 1;
    state.round = 1;
    state.pickPos = 0;
    state.selected = null;
    const deck = deckFor(state.age, state.players.length);
    state.players.forEach((player) => {
      player.hand = deck.splice(0, 7);
    });
    state.notice = "انتهى العصر " + ar(state.age - 1) + ". بدأ العصر " + ar(state.age) + " — الأيدي وُزّعت من جديد.";
    apiRef.log("بدأ العصر <strong>" + ar(state.age) + "</strong>. سبع بطاقات جديدة لكل لاعب.", "accent");
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function scienceScore(player) {
    const s = player.sciences;
    return 7 * Math.min(s.gear, s.compass, s.tablet) + s.gear * s.gear + s.compass * s.compass + s.tablet * s.tablet;
  }

  function guildCount(player, guild) {
    const owners = [player, ...neighborsOf(player)];
    let total = 0;
    owners.forEach((owner) => {
      if (guild.per === "wonder") total += owner.stages;
      else total += owner.built.filter((card) => card.type === guild.per).length;
    });
    return total;
  }

  function guildVp(player) {
    return player.built.filter((card) => card.type === "guild").reduce((sum, card) => sum + guildCount(player, card.guild) * card.guild.value, 0);
  }

  function cardVp(player) {
    return player.built.reduce((sum, card) => sum + (card.vp || 0), 0);
  }

  function totalScore(player) {
    return cardVp(player) + guildVp(player) + player.wonderVp + scienceScore(player) + player.militaryVp + Math.floor(player.coins / 3);
  }

  function detailOf(player) {
    return "مدني " + ar(cardVp(player)) + " · علوم " + ar(scienceScore(player)) + " · عسكر " + ar(player.militaryVp) +
      " · عجائب " + ar(player.wonderVp) + " · نقابات " + ar(guildVp(player)) + " · عملات " + ar(Math.floor(player.coins / 3));
  }

  function finish() {
    state.over = true;
    const ranking = XG.standings(state.players, totalScore, detailOf);
    const winner = ranking[0];
    state.notice = "انتهت اللعبة. الفائز: " + winner.name + " بـ" + ar(winner.value) + " نقطة.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت عجائب الدنيا السبع",
      text: "تُجمع نقاط المدنيين والعلوم والعسكر والعجائب والنقابات والعملات (كل ٣ عملات = نقطة).",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🏛️",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function cardValue(player, card) {
    const pay = canAfford(player, card.cost);
    if (!pay) return -500;
    let value = (card.vp || 0) + (card.coins || 0) * 0.32 + (card.shields || 0) * 1.25;
    if (card.science) value += 2.6;
    if (card.production) value += 1.5;
    if (card.type === "guild") value += 3.4;
    value -= pay.coins * 0.2;
    return value;
  }

  function wonderValue(player) {
    const stage = player.wonder.stages[player.stages];
    if (!stage) return -500;
    const pay = canAfford(player, stage.cost);
    if (!pay) return -500;
    const value = (stage.vp || 0) + (stage.shields || 0) * 1.35 + (stage.coins || 0) * 0.32 + (stage.science ? 2.8 : 0) + (stage.prod ? 1.6 : 0) + 3;
    return value - pay.coins * 0.2;
  }

  function aiPick() {
    if (!state || state.over) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const wonderScore = wonderValue(player);
    let best = { kind: "discard", index: 0, score: 1.05 };
    player.hand.forEach((card, index) => {
      const score = cardValue(player, card);
      if (score > best.score) best = { kind: "build", index, score };
    });
    if (wonderScore > best.score) {
      let fuel = 0;
      let fuelScore = Infinity;
      player.hand.forEach((card, index) => {
        const score = cardValue(player, card);
        if (score < fuelScore) { fuelScore = score; fuel = index; }
      });
      best = { kind: "wonder", index: fuel, score: wonderScore };
    }
    if (best.kind === "build") buildCard(best.index);
    else if (best.kind === "wonder") buildWonder(best.index);
    else discardCard(best.index);
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, cur().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiPick, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function cardCostLine(card) {
    return costText(card.cost) + (card.cost && card.cost.res ? "" : "");
  }

  function cardHtml(card, index, selected, affordable) {
    const icons = [];
    if (card.vp) icons.push(ar(card.vp) + " نقطة");
    if (card.shields) icons.push(ar(card.shields) + " درع");
    if (card.science) icons.push(SCIENCE_AR[card.science]);
    if (card.production) icons.push(RES_AR[card.production]);
    if (card.coins) icons.push(ar(card.coins) + " عملة");
    if (card.type === "guild") icons.push("نقابة");
    return '<button type="button" class="sw-card ' + TYPE_CLASS[card.type] + (selected ? " is-selected" : "") + (affordable ? "" : " is-locked") +
      '" data-sw-card="' + index + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
      '<span class="sw-card-type">' + esc(TYPE_AR[card.type]) + "</span>" +
      '<strong class="sw-card-name">' + esc(card.name) + "</strong>" +
      '<span class="sw-card-meta">' + (icons.length ? icons.join(" · ") : "بلا مكافأة فورية") + "</span>" +
      '<span class="sw-card-cost">' + esc(cardCostLine(card)) + "</span>" +
      "</button>";
  }

  function wonderPanel(player) {
    const stages = player.wonder.stages.map((stage, index) => {
      const built = index < player.stages;
      return '<span class="sw-wonder-stage ' + (built ? "is-built" : "") + '" title="' + esc(costText(stage.cost)) + '">' + ar(index + 1) + "</span>";
    }).join("");
    const next = player.wonder.stages[player.stages];
    return '<div class="sw-wonder"><div class="xg-spread"><span class="sw-wonder-name">🏛️ ' + esc(player.wonder.name) + "</span>" +
      '<span class="xg-chip">' + ar(player.stages) + " / ٣</span></div>" +
      '<div class="sw-wonder-stages">' + stages + "</div>" +
      '<p class="sw-wonder-cost">' + (next ? "المرحلة التالية: " + esc(costText(next.cost)) : "مكتملة") + "</p></div>";
  }

  function playerPanel(player) {
    const builtByType = {};
    player.built.forEach((card) => { builtByType[card.type] = (builtByType[card.type] || 0) + 1; });
    const chips = Object.entries(builtByType).map(([type, count]) =>
      '<span class="sw-own ' + TYPE_CLASS[type] + '">' + esc(TYPE_AR[type]) + " " + ar(count) + "</span>"
    ).join("");
    const sci = "⚙️ " + ar(player.sciences.gear) + " · 🧭 " + ar(player.sciences.compass) + " · 📜 " + ar(player.sciences.tablet);
    const stages = player.wonder.stages.map((stage, index) => '<span class="sw-dot ' + (index < player.stages ? "is-on" : "") + '"></span>').join("");
    return '<article class="sw-player ' + (player.index === cur().index ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="sw-player-name"><span class="xg-avatar">' + ar(player.index + 1) + "</span>" + esc(player.name) + "</span>" +
      '<strong class="sw-total">' + ar(totalScore(player)) + "</strong></div>" +
      '<div class="sw-player-wonder"><span>' + esc(player.wonder.name) + "</span><span class=\"sw-dots\">" + stages + "</span></div>" +
      '<div class="sw-player-stats">' +
      '<span>◆ ' + ar(player.coins) + "</span><span>🛡️ " + ar(player.shields) + "</span><span>👑 " + ar(player.militaryVp) + "</span>" +
      "</div>" +
      '<div class="sw-player-sci">' + sci + "</div>" +
      '<div class="sw-own-list">' + (chips || '<span class="xg-muted">لا بطاقات بعد</span>') + "</div>" +
      "</article>";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const selected = seen.index === player.index && state.selected != null ? seen.hand[state.selected] : null;
    const selectedPay = selected ? canAfford(player, selected.cost) : null;
    const wonderStage = player.wonder.stages[player.stages];
    const wonderPay = wonderStage ? canAfford(player, wonderStage.cost) : null;
    const hand = seen.hand.map((card, index) => {
      const affordable = !!canAfford(player, card.cost);
      return cardHtml(card, index, seen.index === player.index && state.selected === index, affordable);
    }).join("");

    const actionPanel = selected
      ? '<div class="xg-panel sw-actions"><div class="xg-spread"><h3>' + esc(selected.name) + " — " + esc(TYPE_AR[selected.type]) + "</h3>" +
        '<span class="xg-chip">' + esc(costText(selected.cost)) + "</span></div>" +
        '<p class="xg-note">' + (selectedPay ? "التكلفة النهائية: <strong>" + ar(selectedPay.coins) + " عملة</strong>" +
          (Object.keys(selectedPay.missing).length ? " (تجارة: " + Object.entries(selectedPay.missing).map(([key, value]) => ar(value) + " " + RES_AR[key]).join("، ") + ")" : "") :
          "<span class=\"xg-warn\">لا يمكنك دفع التكلفة الآن.</span>") + "</p>" +
        '<div class="xg-row">' +
        '<button type="button" class="xg-btn primary" data-sw-build ' + (!can || !selectedPay ? "disabled" : "") + ">ابنِ البطاقة</button>" +
        '<button type="button" class="xg-btn" data-sw-wonder ' + (!can || !wonderPay ? "disabled" : "") + ">ابنِ مرحلة العجيبة بالبطاقة</button>" +
        '<button type="button" class="xg-btn ghost" data-sw-discard ' + (!can ? "disabled" : "") + ">اطرحها مقابل ٣ عملات</button>" +
        "</div></div>"
      : '<div class="xg-panel sw-actions"><p class="xg-note">اختر بطاقة من يدك لعرض خيارات البناء. بناء العجيبة يستهلك البطاقة المحددة أيضًا.</p></div>';

    rootRef.innerHTML =
      '<div class="xg sw">' +
      XG.bar("عجائب الدنيا السبع", "ثلاثة أعمار · سبع بطاقات لكل عمر · بناء الحضارة", [
        XG.chip("العصر", ar(state.age) + " / ٣", "is-live"),
        XG.chip("الجولة", ar(state.round) + " / ٧"),
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("عملاتك", ar(seen.coins), "is-good"),
      ].join("")) +
      '<div class="sw-layout"><div class="sw-main">' +
      '<div class="xg-panel"><div class="xg-spread"><h3>يد ' + esc(seen.name) + " — العصر " + ar(state.age) + "</h3>" +
      '<span class="xg-chip">' + ar(seen.hand.length) + " بطاقة</span></div>" +
      '<div class="sw-hand">' + hand + "</div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p></div>" +
      actionPanel +
      '<div class="xg-panel"><h3>عجائب اللاعبين</h3><div class="sw-wonders">' + state.players.map((p) =>
        '<div class="sw-wonder-row ' + (p.index === player.index ? "is-current" : "") + '">' +
        '<span class="sw-wonder-owner">' + esc(p.name) + "</span>" + wonderPanel(p) + "</div>"
      ).join("") + "</div></div>" +
      "</div>" +
      '<aside class="sw-side"><div class="xg-panel"><h3>لوحات اللاعبين</h3><div class="sw-players">' +
      state.players.map(playerPanel).join("") + "</div></div>" +
      '<div class="xg-panel"><h3>الحالة</h3><p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="sw-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">الموارد في لوحات جيرانك تُشترى بـ٢ عملة لكل وحدة ناقصة. الجولة تمرر الأيدي: العصر الأول والثالث إلى اليسار، والثاني إلى اليمين. كل ٣ عملات = نقطة في النهاية.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const card = event.target.closest("[data-sw-card]");
    if (card) {
      const index = Number(card.dataset.swCard);
      if (index === state.selected) state.selected = null;
      else state.selected = index;
      render();
      return;
    }
    if (event.target.closest("[data-sw-build]")) {
      if (state.selected != null) buildCard(state.selected);
      return;
    }
    if (event.target.closest("[data-sw-wonder]")) {
      if (state.selected != null) buildWonder(state.selected);
      return;
    }
    if (event.target.closest("[data-sw-discard]")) {
      if (state.selected != null) discardCard(state.selected);
    }
  }

  const game = {
    id: "seven-wonders",
    name: "عجائب الدنيا السبع",
    en: "7 WONDERS",
    icon: "🏛️",
    accent: "#c9a45c",
    cardClass: "card-seven-wonders",
    tagline: "اسحب البطاقات ومرّرها بين الجيران، وابنِ مواردك وعلومك وعجيبتك قبل خصومك.",
    players: "2–4",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: ثلاثة أعمار، سبع بطاقات لكل عمر، وبناء مراحل العجائب ببطاقة.",
      defaults: {},
      fields: [],
      summary() { return "3 أعمار · 7 بطاقات · 3 مراحل عجيبة"; },
    },

    rules: {
      goal: "اجمع أعلى نقاط حضارة بعد ثلاثة أعمار. النقاط من المدنيين والعلوم والعسكر والعجائب والنقابات والعملات.",
      facts: [["الأعمار", "٣"], ["البطاقات", "٧ لكل عمر"], ["العجائب", "٣ مراحل"], ["التمرير", "يمين ويسار"]],
      components: [
        "بطاقات ثلاثة أعمار: مواد خام ومصنّعة، مدنيون، عسكريون، علميون، تجاريون، ونقابات.",
        "لوح عجيبة لكل لاعب بثلاث مراحل وموارد بداية.",
        "عملات معدنية للتجارة والشراء.",
      ],
      setup: [
        "يبدأ كل لاعب بثلاث عملات ومواطن بداية من عجيبة (خشب أو حجر أو طين أو خام أو زجاج).",
        "توزع سبع بطاقات من العصر الأول لكل لاعب.",
        "ينتقل الاختيار بالتناوب بين اللاعبين، وعندما يختار الجميع تُمرّر الأيدي.",
      ],
      steps: [
        "<strong>الاختيار:</strong> في كل دور يختار اللاعب بطاقة من يده وينفذ بها واحدًا من ثلاثة: يبنيها، يبني بها مرحلة عجيبة، أو يطرحها مقابل ٣ عملات.",
        "<strong>التكلفة:</strong> تدفع عملات وموارد من إنتاجك. الموارد الناقصة تُشترى من الجيران بـ٢ عملة لكل وحدة.",
        "<strong>التمرير:</strong> بعد اختيار جميع اللاعبين تُمرّر الأيدي: العصر الأول والثالث إلى اليسار، والثاني إلى اليمين.",
        "<strong>العسكر:</strong> في نهاية كل عصر تُقارن الدروع مع الجارين: الأقوى +١/+٣/+٥ والأضعف -١/-٣/-٥ حسب العصر.",
        "<strong>العلوم:</strong> كل مجموعة من ثلاثة رموز مختلفة تساوي ٧ نقاط، ويُضاف مربع عدد كل رمز.",
        "<strong>النهاية:</strong> بعد العصر الثالث تُجمع النقاط، وكل ثلاث عملات تساوي نقطة واحدة.",
      ],
      winning: "الفائز صاحب أعلى مجموع نقاط بعد احتساب المدنيين والعلوم والعسكر والعجائب والنقابات والعملات.",
      notes: [
        "بناء العجيبة يستهلك البطاقة المحددة بدل بنائها.",
        "لا يمكن شراء مورد من جار لا ينتجه؛ التجارة تحتاج إنتاجًا فعليًا لدى أحد الجارين.",
        "علوم: احسب 7 × أصغر عدد من الرموز، ثم أضف مربع كل رمز.",
        "النقابات تُحتسب من بطاقاتك وبطاقات جاريك فقط.",
        "هذه نسخة مبسطة من سلاسل البناء؛ لا توجد سلاسل مجانية بين البطاقات.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت عجائب الدنيا السبع مع " + ar(state.players.length) + " لاعبين. العصر الأول، سبع بطاقات لكل لاعب.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          buildCard,
          buildWonder,
          discardCard,
          aiPick,
          totalScore,
          scienceScore,
          canAfford,
          giveCoins(value) { state.players.forEach((player) => { player.coins += Number(value) || 0; }); render(); },
          setCurrent(index) {
            if (!state) return;
            const seat = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            state.pickPos = state.pickOrder.indexOf(seat);
            state.selected = null;
            render();
            settle();
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(timer);
          state = BG.netCodec.decode(data);
          render();
        },
        netSeat() { return state ? cur().index : -1; },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); settle(); } },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(timer);
          timer = null;
          if (rootRef) rootRef.removeEventListener("click", onClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
