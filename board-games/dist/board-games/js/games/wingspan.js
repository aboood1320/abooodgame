/* ==========================================================================
   وينغسبان — بناء محرّك الطيور
   ثلاثة موائل، طعام وبيض، أربع جولات، أهداف نهاية الجولة، وقدرات عند اللعب.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const FOODS = ["seed", "berry", "fish", "insect", "rodent"];
  const FOOD_AR = { seed: "بذور", berry: "توت", fish: "سمك", insect: "حشرات", rodent: "قوارض" };
  const FOOD_ICON = { seed: "🌾", berry: "🫐", fish: "🐟", insect: "🦗", rodent: "🐁" };
  const HABITATS = ["forest", "grassland", "wetland"];
  const HABITAT_AR = { forest: "الغابة", grassland: "المرج", wetland: "الأرض الرطبة" };
  const HABITAT_ICON = { forest: "🌲", grassland: "🌿", wetland: "💧" };
  const ROW_BONUS = {
    forest: "طعام إضافي",
    grassland: "بيض إضافي",
    wetland: "سحب بطاقات إضافية",
  };

  const BIRDS = [
    { name: "هدهد", habitat: "forest", points: 4, capacity: 2, food: ["insect"], power: "draw" },
    { name: "نقار الخشب", habitat: "forest", points: 5, capacity: 2, food: ["insect", "seed"], power: "food" },
    { name: "بومة", habitat: "forest", points: 6, capacity: 2, food: ["rodent", "rodent"], power: "draw" },
    { name: "صقر", habitat: "forest", points: 7, capacity: 1, food: ["rodent", "fish"] },
    { name: "نسر", habitat: "forest", points: 8, capacity: 1, food: ["fish", "rodent", "rodent"] },
    { name: "غراب", habitat: "forest", points: 3, capacity: 2, food: ["seed", "seed"], power: "draw" },
    { name: "كناري", habitat: "forest", points: 2, capacity: 3, food: ["seed"], power: "egg" },
    { name: "بلبل", habitat: "forest", points: 3, capacity: 2, food: ["berry", "insect"], power: "draw" },
    { name: "طاووس", habitat: "forest", points: 5, capacity: 2, food: ["seed", "berry"], power: "egg" },
    { name: "حمامة", habitat: "forest", points: 2, capacity: 3, food: ["seed", "seed"] },
    { name: "دجاجة الماء", habitat: "grassland", points: 3, capacity: 3, food: ["seed", "insect"], power: "egg" },
    { name: "إوز", habitat: "grassland", points: 4, capacity: 2, food: ["seed", "seed", "berry"], power: "food" },
    { name: "بط", habitat: "grassland", points: 3, capacity: 3, food: ["fish", "seed"], power: "egg" },
    { name: "كركي", habitat: "grassland", points: 6, capacity: 2, food: ["fish", "insect"], power: "draw" },
    { name: "لقلق", habitat: "grassland", points: 7, capacity: 2, food: ["fish", "rodent", "insect"] },
    { name: "سنونو", habitat: "grassland", points: 2, capacity: 3, food: ["insect"], power: "draw" },
    { name: "عصفور", habitat: "grassland", points: 1, capacity: 4, food: ["seed"], power: "egg" },
    { name: "بجعة", habitat: "grassland", points: 6, capacity: 2, food: ["fish", "fish"], power: "food" },
    { name: "مالك الحزين", habitat: "wetland", points: 5, capacity: 2, food: ["fish", "fish"], power: "draw" },
    { name: "بجعة بيضاء", habitat: "wetland", points: 6, capacity: 2, food: ["fish", "insect"], power: "food" },
    { name: "صقر الشاهين", habitat: "wetland", points: 8, capacity: 1, food: ["rodent", "fish"] },
    { name: "بومة الثلج", habitat: "wetland", points: 7, capacity: 1, food: ["rodent", "fish", "fish"], power: "draw" },
    { name: "نورس", habitat: "wetland", points: 3, capacity: 3, food: ["fish"], power: "egg" },
    { name: "خطاف البحر", habitat: "wetland", points: 4, capacity: 2, food: ["fish", "insect"] },
    { name: "بط بري", habitat: "wetland", points: 3, capacity: 3, food: ["seed", "fish"] },
    { name: "مالك الحزين الأزرق", habitat: "wetland", points: 5, capacity: 2, food: ["fish", "rodent"], power: "draw" },
  ];

  const GOALS = [
    { name: "أكثر بيض", metric: (player) => totalEggs(player) },
    { name: "أكثر طيور الغابة", metric: (player) => player.birds.forest.length },
    { name: "أكثر طيور المرج", metric: (player) => player.birds.grassland.length },
    { name: "أكثر نقاط طيور", metric: (player) => birdPoints(player) },
  ];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;
  let serial = 1;

  function buildDeck() {
    const deck = [];
    BIRDS.forEach((bird) => {
      for (let copy = 0; copy < 2; copy++) deck.push({ ...bird, uid: "bird-" + serial++, eggs: 0 });
    });
    return U.shuffle(deck);
  }

  function makePlayers(deck) {
    return XG.players(apiRef, 4, ["#6f9b6e", "#c9a45c", "#5f8fa8", "#b87a68"])
      .slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length)))
      .map((player, index) => {
        const food = { seed: 0, berry: 0, fish: 0, insect: 0, rodent: 0 };
        food[U.pick(FOODS)] += 1;
        return {
          ...player,
          color: ["#6f9b6e", "#c9a45c", "#5f8fa8", "#b87a68"][index],
          food,
          birds: { forest: [], grassland: [], wetland: [] },
          hand: deck.splice(0, 5),
          goalVp: 0,
          actionsLeft: 8,
        };
      });
  }

  function newState() {
    const deck = buildDeck();
    const players = makePlayers(deck);
    return {
      players,
      deck,
      round: 1,
      goalIndex: 0,
      current: 0,
      selected: null,
      notice: "الجولة ١ — عندك ٨ أفعال. اختر طائرًا من يدك أو نفّذ أحد الأفعال الثلاثة.",
      last: null,
      over: false,
      winner: null,
      roundLog: [],
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function actionsForRound(round) { return 9 - round; }
  function goal() { return GOALS[state.goalIndex] || GOALS[0]; }

  function totalEggs(player) {
    return HABITATS.reduce((sum, habitat) => sum + player.birds[habitat].reduce((s, bird) => s + bird.eggs, 0), 0);
  }

  function freeEggSlots(player) {
    return HABITATS.reduce((sum, habitat) => sum + player.birds[habitat].reduce((s, bird) => s + Math.max(0, bird.capacity - bird.eggs), 0), 0);
  }

  function birdPoints(player) {
    return HABITATS.reduce((sum, habitat) => sum + player.birds[habitat].reduce((s, bird) => s + bird.points, 0), 0);
  }

  function totalScore(player) {
    return birdPoints(player) + totalEggs(player) + player.goalVp;
  }

  function detailOf(player) {
    return "طيور " + ar(birdPoints(player)) + " · بيض " + ar(totalEggs(player)) + " · أهداف " + ar(player.goalVp);
  }

  /* ------------------------------ الأفعال ------------------------------ */

  function canAct() {
    const player = cur();
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }

  function drawBird(player, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      if (!state.deck.length) state.deck = buildDeck();
      const bird = state.deck.pop();
      if (!bird) break;
      bird.eggs = 0;
      player.hand.push(bird);
      out.push(bird);
    }
    return out;
  }

  function randomFood() {
    const bag = [];
    FOODS.forEach((food) => { for (let i = 0; i < 10; i++) bag.push(food); });
    return U.pick(bag);
  }

  function gainFood(player, count) {
    const gained = {};
    for (let i = 0; i < count; i++) {
      const food = randomFood();
      player.food[food] = (player.food[food] || 0) + 1;
      gained[food] = (gained[food] || 0) + 1;
    }
    return gained;
  }

  function addEgg(player, count) {
    let placed = 0;
    const birds = HABITATS.flatMap((habitat) => player.birds[habitat]).slice().sort((a, b) => b.points - a.points);
    for (const bird of birds) {
      while (placed < count && bird.eggs < bird.capacity) {
        bird.eggs += 1;
        placed += 1;
      }
      if (placed >= count) break;
    }
    return placed;
  }

  function removeEggs(player, count) {
    let removed = 0;
    const birds = HABITATS.flatMap((habitat) => player.birds[habitat]).slice().sort((a, b) => a.points - b.points);
    for (const bird of birds) {
      while (removed < count && bird.eggs > 0) {
        bird.eggs -= 1;
        removed += 1;
      }
      if (removed >= count) break;
    }
    return removed === count;
  }

  function foodNeeds(bird) {
    const needs = {};
    bird.food.forEach((food) => { needs[food] = (needs[food] || 0) + 1; });
    return needs;
  }

  function canPlayBird(player, bird) {
    if (!bird) return { ok: false, reason: "لا يوجد طائر محدد." };
    const row = player.birds[bird.habitat];
    if (!row) return { ok: false, reason: "موطن غير معروف." };
    if (row.length >= 5) return { ok: false, reason: "صف " + HABITAT_AR[bird.habitat] + " ممتلئ." };
    const needs = foodNeeds(bird);
    for (const [food, need] of Object.entries(needs)) {
      if ((player.food[food] || 0) < need) {
        return { ok: false, reason: "تحتاج " + ar(need) + " " + FOOD_AR[food] + "." };
      }
    }
    const eggCost = row.length;
    if (totalEggs(player) < eggCost) {
      return { ok: false, reason: "تحتاج " + ar(eggCost) + " بيضة لدفع تكلفة العمود." };
    }
    return { ok: true, eggCost, needs };
  }

  function playBird(index) {
    if (!state || state.over) return false;
    const player = cur();
    if (!canAct()) return false;
    const bird = player.hand[index];
    const check = canPlayBird(player, bird);
    if (!check.ok) {
      apiRef.toast(check.reason, "warn");
      return false;
    }
    const row = player.birds[bird.habitat];
    Object.entries(check.needs).forEach(([food, need]) => { player.food[food] -= need; });
    removeEggs(player, check.eggCost);
    player.hand.splice(index, 1);
    bird.eggs = 0;
    row.push(bird);
    if (bird.power === "draw") drawBird(player, 1);
    if (bird.power === "food") gainFood(player, 1);
    if (bird.power === "egg") addEgg(player, 1);
    const powerText = bird.power === "draw" ? "، وسحب بطاقة" : bird.power === "food" ? "، وطعام إضافي" : bird.power === "egg" ? "، وبيضة إضافية" : "";
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> لعب <strong>" + esc(bird.name) + "</strong> في " + HABITAT_AR[bird.habitat] +
      " (تكلفة " + ar(check.eggCost) + " بيضة" + powerText + ").",
      "accent"
    );
    finishAction(player.name + " لعب " + bird.name + " في " + HABITAT_AR[bird.habitat] + ".");
    return true;
  }

  function actionFood() {
    if (!state || state.over) return false;
    const player = cur();
    if (!canAct()) return false;
    const amount = 2 + player.birds.forest.length;
    const gained = gainFood(player, amount);
    const text = Object.entries(gained).map(([food, count]) => ar(count) + " " + FOOD_AR[food]).join("، ");
    apiRef.log("<strong>" + esc(player.name) + "</strong> جمع طعامًا: " + text + " (بونص الغابة +" + ar(player.birds.forest.length) + ").", "good");
    finishAction(player.name + " جمع " + ar(amount) + " طعامًا.");
    return true;
  }

  function actionEggs() {
    if (!state || state.over) return false;
    const player = cur();
    if (!canAct()) return false;
    const amount = 1 + player.birds.grassland.length;
    const placed = addEgg(player, amount);
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> وضع " + ar(placed) + " بيضة" +
      (placed < amount ? " (لا توجد مساحة كافية)" : "") + " (بونص المرج +" + ar(player.birds.grassland.length) + ").",
      placed ? "good" : "warn"
    );
    finishAction(player.name + " وضع " + ar(placed) + " بيضة.");
    return true;
  }

  function actionDraw() {
    if (!state || state.over) return false;
    const player = cur();
    if (!canAct()) return false;
    const amount = 1 + player.birds.wetland.length;
    const drawn = drawBird(player, amount);
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> سحب " + ar(drawn.length) + " بطاقة" +
      (player.birds.wetland.length ? " (بونص الأرض الرطبة +" + ar(player.birds.wetland.length) + ")" : "") + ".",
      "accent"
    );
    finishAction(player.name + " سحب " + ar(drawn.length) + " بطاقة.");
    return true;
  }

  function finishAction(text) {
    const player = cur();
    player.actionsLeft -= 1;
    state.selected = null;
    state.last = { text };
    if (state.players.every((p) => p.actionsLeft <= 0)) {
      endRound();
      return;
    }
    const n = state.players.length;
    let next = (state.current + 1) % n;
    let guard = 0;
    while (state.players[next].actionsLeft <= 0 && guard < n + 1) {
      next = (next + 1) % n;
      guard += 1;
    }
    state.current = next;
    const p = cur();
    state.notice = "دور " + p.name + " — " + ar(p.actionsLeft) + " فعل متبقٍ في الجولة " + ar(state.round) + ".";
    apiRef.setStatus("دور " + p.name);
    render();
    settle();
  }

  function endRound() {
    const stageGoal = goal();
    const values = state.players.map((player) => ({ player, value: stageGoal.metric(player) }));
    const sorted = values.slice().sort((a, b) => b.value - a.value);
    state.players.forEach((player) => {
      const rank = sorted.filter((entry) => entry.value > stageGoal.metric(player)).length;
      const points = [3, 2, 1, 0][rank] || 0;
      player.goalVp += points;
      if (points) apiRef.log("<strong>" + esc(player.name) + "</strong> حصل على " + ar(points) + " نقاط في هدف الجولة («" + stageGoal.name + "»).", "good");
    });
    state.roundLog.push({ round: state.round, goal: stageGoal.name, values });
    apiRef.log("انتهت الجولة " + ar(state.round) + ". الهدف: " + stageGoal.name + ".", "accent");
    if (state.round >= 4) {
      finish();
      return;
    }
    state.round += 1;
    state.goalIndex = state.round - 1;
    state.players.forEach((player) => { player.actionsLeft = actionsForRound(state.round); });
    state.current = 0;
    state.selected = null;
    state.notice = "الجولة " + ar(state.round) + " — الهدف الجديد: " + goal().name + ". عندك " + ar(actionsForRound(state.round)) + " أفعال.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
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
      title: "انتهت وينغسبان",
      text: "المجموع = نقاط الطيور + بيضة لكل بيضة + نقاط أهداف الجولات الأربع.",
      winner: winner.name + " — " + ar(winner.value) + " نقطة",
      icon: "🐦",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function birdValue(bird, rowLength) {
    let value = bird.points + bird.capacity * 0.55 + (5 - rowLength) * 0.4;
    if (bird.power === "draw") value += 1.2;
    if (bird.power === "food") value += 1.1;
    if (bird.power === "egg") value += 0.9;
    value -= bird.food.length * 0.6;
    return value;
  }

  function aiTurn() {
    if (!state || state.over) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const playable = player.hand
      .map((bird, index) => ({ bird, index, check: canPlayBird(player, bird) }))
      .filter((entry) => entry.check.ok)
      .sort((a, b) => birdValue(b.bird, player.birds[b.bird.habitat].length) - birdValue(a.bird, player.birds[a.bird.habitat].length));
    if (playable.length && (player.hand.length <= 7 || birdValue(playable[0].bird, player.birds[playable[0].bird.habitat].length) > 4)) {
      playBird(playable[0].index);
      return;
    }
    const foodTotal = FOODS.reduce((sum, food) => sum + player.food[food], 0);
    const canEgg = freeEggSlots(player) > 0;
    if (foodTotal < 5) { actionFood(); return; }
    if (canEgg && totalEggs(player) < 6) { actionEggs(); return; }
    if (player.hand.length < 4) { actionDraw(); return; }
    if (canEgg) { actionEggs(); return; }
    actionDraw();
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, cur().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiTurn, AI.delay(cur().level, 0.9));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function birdCard(bird) {
    const food = foodNeeds(bird);
    const foodText = Object.entries(food).map(([key, count]) => FOOD_ICON[key] + "×" + ar(count)).join(" ");
    const eggs = Array.from({ length: bird.capacity }, (_, index) => '<span class="wg-egg ' + (index < bird.eggs ? "is-on" : "") + '"></span>').join("");
    return '<div class="wg-bird">' +
      '<div class="wg-bird-top"><strong>' + esc(bird.name) + "</strong><span class=\"wg-bird-points\">" + ar(bird.points) + "</span></div>" +
      '<div class="wg-bird-food">' + foodText + "</div>" +
      '<div class="wg-bird-eggs">' + eggs + "</div>" +
      (bird.power ? '<span class="wg-bird-power">' + (bird.power === "draw" ? "اسحب بطاقة" : bird.power === "food" ? "طعام إضافي" : "بيضة إضافية") + "</span>" : "") +
      "</div>";
  }

  function handCard(bird, index, selected) {
    const food = foodNeeds(bird);
    const foodText = Object.entries(food).map(([key, count]) => FOOD_ICON[key] + "×" + ar(count)).join(" ");
    return '<button type="button" class="wg-hand-card ' + (selected ? "is-selected" : "") + '" data-wg-card="' + index + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
      '<span class="wg-hand-habitat">' + HABITAT_ICON[bird.habitat] + " " + HABITAT_AR[bird.habitat] + "</span>" +
      '<strong>' + esc(bird.name) + "</strong>" +
      '<span class="wg-hand-meta">' + foodText + " · بيض " + ar(bird.capacity) + " · نقاط " + ar(bird.points) + "</span>" +
      "</button>";
  }

  function rowHtml(player, habitat) {
    const row = player.birds[habitat];
    const cards = row.map(birdCard).join("");
    const empty = Array.from({ length: Math.max(0, 5 - row.length) }, () => '<div class="wg-slot"></div>').join("");
    return '<div class="wg-row">' +
      '<div class="wg-row-head"><span>' + HABITAT_ICON[habitat] + " " + HABITAT_AR[habitat] + "</span>" +
      '<span class="xg-chip">' + ar(row.length) + " / ٥ · " + ROW_BONUS[habitat] + "</span></div>" +
      '<div class="wg-row-birds">' + cards + empty + "</div></div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const selectedBird = seen.index === player.index && state.selected != null ? seen.hand[state.selected] : null;
    const check = selectedBird ? canPlayBird(player, selectedBird) : null;
    const foodTotal = FOODS.reduce((sum, food) => sum + seen.food[food], 0);
    const playerRows = state.players.map((p) => (
      '<div class="wg-player ' + (p.index === state.current ? "is-current" : "") + '" style="--pc:' + p.color + '">' +
      '<div class="xg-spread"><span class="xg-row">' + BG.playerProfile.playerHTML(p, "wg-player-avatar") + "<strong>" + esc(p.name) + "</strong></span>" +
      '<span class="wg-player-score">' + ar(totalScore(p)) + "</span></div>" +
      '<div class="wg-player-stats"><span>🐦 ' + ar(birdPoints(p)) + "</span><span>🥚 " + ar(totalEggs(p)) + "</span><span>🏁 " + ar(p.goalVp) + "</span>" +
      '<span>🎯 ' + ar(p.actionsLeft) + "</span></div>" +
      '<div class="wg-player-food">' + FOODS.map((food) => '<span title="' + FOOD_AR[food] + '">' + FOOD_ICON[food] + ar(p.food[food]) + "</span>").join("") + "</div>" +
      "</div>"
    )).join("");

    const goalValues = state.players.map((p) => esc(p.name) + ": " + ar(goal().metric(p))).join(" · ");

    rootRef.innerHTML =
      '<div class="xg wg">' +
      XG.bar("وينغسبان", "ثلاثة موائل · أربع جولات · محرّك بيض وطعام", [
        XG.chip("الجولة", ar(state.round) + " / ٤", "is-live"),
        XG.chip("الأفعال", ar(player.actionsLeft)),
        XG.chip("الهدف", esc(goal().name)),
        XG.chip("الطعام", ar(foodTotal), "is-good"),
      ].join("")) +
      '<div class="wg-layout"><div class="wg-main">' +
      '<div class="xg-panel wg-board"><div class="xg-spread"><h3>موائل ' + esc(seen.name) + "</h3>" +
      '<span class="xg-chip">' + ar(birdPoints(seen)) + " نقاط طيور</span></div>" +
      HABITATS.map((habitat) => rowHtml(seen, habitat)).join("") + "</div>" +
      '<div class="xg-panel"><div class="xg-spread"><h3>يدك</h3><span class="xg-chip">' + ar(seen.hand.length) + " بطاقة</span></div>" +
      '<div class="wg-hand">' + (seen.hand.length ? seen.hand.map((bird, index) => handCard(bird, index, seen.index === player.index && state.selected === index)).join("") : '<p class="xg-note">لا بطاقات. استخدم فعل السحب.</p>') + "</div>" +
      (selectedBird ?
        '<div class="wg-play-panel"><div class="xg-spread"><strong>' + esc(selectedBird.name) + " — " + HABITAT_AR[selectedBird.habitat] + "</strong>" +
        '<span class="xg-chip">' + (check.ok ? "التكلفة: " + ar(check.eggCost) + " بيضة" : "غير متاح") + "</span></div>" +
        '<p class="xg-note">' + (check.ok ? "الطعام: " + Object.entries(check.needs).map(([key, count]) => FOOD_ICON[key] + "×" + ar(count)).join(" ") + " · البيض يُؤخذ من طيورك الحالية." : esc(check.reason)) + "</p>" +
        '<button type="button" class="xg-btn primary" data-wg-play ' + (!can || !check.ok ? "disabled" : "") + ">العب الطائر في " + HABITAT_AR[selectedBird.habitat] + "</button></div>" : "") +
      "</div>" +
      '<div class="xg-panel"><div class="xg-spread"><h3>الأفعال</h3><span class="xg-chip">' + ar(player.actionsLeft) + " متبقٍ</span></div>" +
      '<div class="wg-actions">' +
      '<button type="button" class="xg-btn" data-wg-food ' + (!can ? "disabled" : "") + ">جمع طعام <b>+" + ar(2 + seen.birds.forest.length) + "</b></button>" +
      '<button type="button" class="xg-btn" data-wg-eggs ' + (!can ? "disabled" : "") + ">وضع بيض <b>+" + ar(1 + seen.birds.grassland.length) + "</b></button>" +
      '<button type="button" class="xg-btn" data-wg-draw ' + (!can ? "disabled" : "") + ">سحب بطاقات <b>+" + ar(1 + seen.birds.wetland.length) + "</b></button>" +
      "</div><p class=\"xg-note\">بونص كل صف يزداد بعدد الطيور فيه. اختر طائرًا من يدك ثم اضغط زر اللعب.</p>" +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="wg-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      "</div>" +
      '<aside class="wg-side"><div class="xg-panel"><h3>اللاعبون</h3><div class="wg-players">' + playerRows + "</div></div>" +
      '<div class="xg-panel"><h3>هدف الجولة</h3><p class="xg-note"><strong>' + esc(goal().name) + "</strong> — الأول ٣ نقاط، الثاني ٢، الثالث ١.</p>" +
      '<p class="xg-note">' + goalValues + "</p></div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">تكلفة البيض عند لعب طائر تساوي عدد الطيور الموجودة في الصف. الغابة تزيد الطعام، المرج يزيد البيض، والأرض الرطبة تزيد السحب. كل بيضة نقطة في النهاية.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const card = event.target.closest("[data-wg-card]");
    if (card) {
      const index = Number(card.dataset.wgCard);
      if (state.selected === index) state.selected = null;
      else state.selected = index;
      render();
      return;
    }
    if (event.target.closest("[data-wg-play]")) {
      if (state.selected != null) playBird(state.selected);
      return;
    }
    if (event.target.closest("[data-wg-food]")) { actionFood(); return; }
    if (event.target.closest("[data-wg-eggs]")) { actionEggs(); return; }
    if (event.target.closest("[data-wg-draw]")) { actionDraw(); }
  }

  const game = {
    id: "wingspan",
    name: "وينغسبان",
    en: "WINGSPAN",
    icon: "🐦",
    accent: "#6f9b6e",
    cardClass: "card-wingspan",
    tagline: "اجذب الطيور إلى ثلاثة موائل، وفعّل صفوفك لجمع الطعام والبيض والبطاقات.",
    players: "2–4",
    duration: "30–50 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: أربع جولات، ثلاثة موائل، تكلفة بيض للعمود، وأهداف نهاية الجولة.",
      defaults: {},
      fields: [],
      summary() { return "4 جولات · 3 موائل · محرك طيور"; },
    },

    rules: {
      goal: "اجمع أعلى نقاط من الطيور والبيض وأهداف الجولات. كل طائر يمنح نقاطًا، وكل بيضة نقطة، وأهداف الجولات تمنح ٣/٢/١.",
      facts: [["الجولات", "٤"], ["الموائل", "٣"], ["الأفعال", "٨ ثم ٧ ثم ٦ ثم ٥"], ["البيض", "نقطة لكل بيضة"]],
      components: [
        "مجموعة طيور بأسماء وموائل وتكاليف طعام وسعات بيض وقدرات.",
        "ثلاثة صفوف موائل: الغابة والمرج والأرض الرطبة، لكل صف خمسة مواقع.",
        "طعام من خمسة أنواع: بذور وتوت وسمك وحشرات وقوارض.",
        "بيض يوضع على البطاقات ويُستخدم لدفع تكلفة الأعمدة.",
      ],
      setup: [
        "يسحب كل لاعب خمس بطاقات طيور ويحصل على طعام واحد عشوائي.",
        "يبدأ كل لاعب بثمانية أفعال في الجولة الأولى، وتنقص في كل جولة.",
        "كل طائر يُلعب في موطنه المحدد فقط.",
      ],
      steps: [
        "<strong>لعب طائر:</strong> ادفع طعامه، ثم ادفع بيضًا يساوي عدد الطيور في الصف (الموقع الأول مجاني). الطائر يمنح قدرته فورًا إن وُجدت.",
        "<strong>جمع الطعام:</strong> احصل على ٢ + عدد طيور الغابة من الطعام العشوائي.",
        "<strong>وضع البيض:</strong> ضع ١ + عدد طيور المرج بيضة على طيورك ضمن سعتها.",
        "<strong>سحب البطاقات:</strong> اسحب ١ + عدد طيور الأرض الرطبة بطاقات.",
        "<strong>نهاية الجولة:</strong> تُقيَّم بطاقة هدف الجولة، ثم تبدأ الجولة التالية بعدد أفعال أقل.",
        "<strong>النهاية:</strong> بعد أربع جولات اجمع نقاط الطيور + البيض + أهداف الجولات.",
      ],
      winning: "الفائز صاحب أعلى مجموع بعد الجولة الرابعة. لا تُحتسب بقايا الطعام نقاطًا.",
      notes: [
        "الموقع الأول في كل صف مجاني من البيض، والثاني يحتاج بيضة، وهكذا حتى الخامس.",
        "قدرات الطيور المبسطة: سحب بطاقة، طعام إضافي، أو بيضة إضافية عند اللعب.",
        "صف الغابة يعزز جمع الطعام، والمرج يعزز البيض، والأرض الرطبة تعزز السحب.",
        "هذه نسخة مبسطة من بطاقات البونص ونرد الطعام؛ جوهر بناء المحرك محفوظ.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      serial = 1;
      state = newState();
      apiRef.log("بدأت وينغسبان مع " + ar(state.players.length) + " لاعبين. أربع جولات وثلاثة موائل.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          playBird,
          actionFood,
          actionEggs,
          actionDraw,
          aiTurn,
          canPlayBird,
          totalScore,
          giveFood(food, count) {
            if (!state) return;
            const key = FOODS.includes(food) ? food : "seed";
            cur().food[key] += Number(count) || 1;
            render();
          },
          giveEggs(count) { addEgg(cur(), Number(count) || 1); render(); },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
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
        netSeat() { return state ? state.current : -1; },
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
