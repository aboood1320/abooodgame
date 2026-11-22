/* ==========================================================================
   ملك طوكيو — نرد وحوش، طوكيو، طاقة، وبطاقات قوى
   نسخة كاملة القواعد الأساسية: ٢٠ نقطة أو آخر وحش صامد.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const FX = BG.fx;
  const ar = XG.ar;
  const esc = XG.esc;

  const MONSTERS = [
    { icon: "🦖", color: "#6f9b6e" },
    { icon: "🐙", color: "#c77c64" },
    { icon: "🦍", color: "#c9a45c" },
    { icon: "🐲", color: "#c45f52" },
    { icon: "🤖", color: "#7d8fc2" },
    { icon: "🦇", color: "#8a7dbb" },
  ];
  const FACES = [1, 2, 3, "heart", "energy", "claw"];
  const FACE_LABEL = { 1: "١", 2: "٢", 3: "٣", heart: "❤️", energy: "⚡", claw: "🐾" };
  const FACE_CLASS = { 1: "is-one", 2: "is-two", 3: "is-three", heart: "is-heart", energy: "is-energy", claw: "is-claw" };

  const POWERS = {
    claw: { name: "مخالب حادة", icon: "🐾", cost: 4, desc: "+١ ضرر لكل مخلب." },
    heal: { name: "جلد متجدد", icon: "💚", cost: 3, desc: "+١ شفاء لكل قلب خارج طوكيو." },
    armor: { name: "درع عظمي", icon: "🛡️", cost: 4, desc: "كل ضرر يصيبك ينخفض بمقدار ١." },
    energy: { name: "مولّد كهربائي", icon: "🔋", cost: 4, desc: "+١ طاقة لكل برق." },
    die: { name: "رأس إضافي", icon: "🎲", cost: 7, desc: "ترمي نردًا إضافيًا." },
    vpTurn: { name: "عرش طوكيو", icon: "👑", cost: 5, desc: "+١ نقطة نصر نهاية كل دور لك." },
    healTurn: { name: "وجبة دسمة", icon: "🍗", cost: 4, desc: "استعد ١ صحة نهاية كل دور، حتى داخل طوكيو." },
    energyTurn: { name: "بطارية احتياطية", icon: "🔌", cost: 3, desc: "+١ طاقة نهاية كل دور لك." },
    stomp: { name: "قدم ثقيلة", icon: "🦶", cost: 5, desc: "+١ ضرر لكل مخلب وأنت داخل طوكيو." },
    spike: { name: "أشواك", icon: "🌵", cost: 5, desc: "من يهاجمك بالمخالب وأنت في طوكيو يتلقى ١ ضرر." },
    burst: { name: "نفَس النار", icon: "🔥", cost: 5, desc: "فورًا: ٢ ضرر لكل وحش آخر.", instant: true },
    medkit: { name: "إسعاف", icon: "⛑️", cost: 3, desc: "فورًا: استعد ٣ صحة.", instant: true },
    battery: { name: "شحنة سريعة", icon: "⚡", cost: 3, desc: "فورًا: +٣ طاقة.", instant: true },
    fame: { name: "شهرة", icon: "🌟", cost: 5, desc: "فورًا: +٣ نقاط نصر.", instant: true },
    giant: { name: "عملاق", icon: "🗿", cost: 6, desc: "+٢ صحة قصوى واستعد ٢ صحة." },
  };
  const DECK_IDS = [
    "claw", "claw", "claw", "heal", "heal", "armor", "armor", "energy", "energy", "energy",
    "die", "die", "vpTurn", "vpTurn", "vpTurn", "healTurn", "healTurn", "energyTurn", "energyTurn",
    "stomp", "stomp", "spike", "spike", "burst", "burst", "medkit", "medkit", "battery", "battery",
    "fame", "fame", "giant", "giant",
  ];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makePlayers() {
    const count = U.clamp((apiRef.players || []).length || 3, 2, 6);
    const list = [];
    for (let index = 0; index < count; index++) {
      const source = (apiRef.players || [])[index];
      const monster = MONSTERS[index];
      list.push({
        index,
        name: source && source.name ? source.name : "الوحش " + (index + 1),
        color: monster.color,
        icon: monster.icon,
        type: source && source.type === "cpu" ? "cpu" : "human",
        level: source ? BG.ai.level(source.level) : BG.ai.level(1),
        isCpu: source ? BG.ai.isCpu(source) : true,
        health: 10,
        maxHealth: 10,
        vp: 0,
        energy: 0,
        inTokyo: false,
        slot: null,
        alive: true,
        powers: [],
      });
    }
    return list;
  }

  function newState() {
    const players = makePlayers();
    const deck = U.shuffle(DECK_IDS.slice());
    return {
      players,
      slots: players.length >= 5 ? 2 : 1,
      occupied: players.length >= 5 ? [null, null] : [null],
      deck,
      market: [deck.pop(), deck.pop(), deck.pop()].filter(Boolean),
      current: 0,
      phase: "roll",
      dice: [],
      kept: [],
      rolls: 0,
      yieldQueue: [],
      yieldCurrent: null,
      round: 1,
      turn: 1,
      notice: "ارمِ النرد. اجمع النقاط، أو هاجم طوكيو، أو اشترِ القوى.",
      last: null,
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }
  function alivePlayers() { return state.players.filter((player) => player.alive); }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }
  function canPick(player) {
    if (!state || state.over || !player) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }
  function hasPower(player, id) { return player.powers.includes(id); }
  function powerCount(player, id) { return player.powers.filter((key) => key === id).length; }

  function diceCount() {
    const counts = { 1: 0, 2: 0, 3: 0, heart: 0, energy: 0, claw: 0 };
    state.dice.forEach((value) => { counts[value] += 1; });
    return counts;
  }

  function startTurn(index) {
    if (!state || state.over) return;
    let seat = ((index % state.players.length) + state.players.length) % state.players.length;
    let guard = 0;
    while (!state.players[seat].alive && guard < state.players.length) {
      seat = (seat + 1) % state.players.length;
      guard += 1;
    }
    state.current = seat;
    const player = cur();
    state.dice = [];
    state.kept = [];
    state.rolls = 0;
    state.phase = "roll";
    state.yieldQueue = [];
    state.yieldCurrent = null;
    if (player.inTokyo) {
      player.vp += 2;
      apiRef.log("<strong>" + esc(player.name) + "</strong> يبدأ دوره في طوكيو ويكسب <strong>٢</strong> نقطة نصر.", "good");
    }
    state.notice = "دور " + player.name + " — ارمِ النرد حتى ٣ مرات، ثم ثبّت النتائج.";
    apiRef.setStatus("دور " + player.name);
    render();
    settle();
  }

  /* تدحرج النرد: لا تتغيّر الحالة حتى تستقر النرد المُعاد رميها فقط (المثبّت يبقى كما هو) */
  let rolling = false;
  let cancelRoll = null;

  function clearRoll() {
    if (cancelRoll) cancelRoll();
    cancelRoll = null;
    rolling = false;
  }

  /* then: تُستدعى بعد استقرار النرد (يستخدمها الكمبيوتر لجدولة خطوته التالية) */
  function rollDice(then) {
    if (!state || state.over || state.phase !== "roll" || state.rolls >= 3 || rolling) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const extra = hasPower(player, "die") ? 1 : 0;
    const total = 6 + extra;
    const first = !state.dice.length;
    const fresh = first
      ? Array.from({ length: total }, () => U.pick(FACES))
      : state.dice.map((value, index) => (state.kept[index] ? value : U.pick(FACES)));
    const rerolled = first ? fresh : fresh.filter((value, index) => !state.kept[index]);
    if (FX) FX.sound("dice");
    rolling = true;
    const rollBtn = rootRef && rootRef.querySelector("[data-kt-roll]");
    if (rollBtn) rollBtn.disabled = true;
    const land = () => {
      cancelRoll = null;
      rolling = false;
      if (!state || state.over || state.phase !== "roll") return;
      applyRoll(fresh, first, total);
      if (then) then();
    };
    if (FX && FX.tumble) {
      cancelRoll = FX.tumble(rootRef && rootRef.querySelector(".kt-roll"), rerolled, land, { labels: FACE_LABEL });
    } else land();
    return true;
  }

  function applyRoll(fresh, first, total) {
    if (first) state.kept = Array.from({ length: total }, () => false);
    state.dice = fresh;
    state.rolls += 1;
    state.notice = "الرمية " + ar(state.rolls) + " من ٣. اضغط النرد للإبقاء عليه، ثم أعد الرمي أو ثبّت النتائج.";
    render();
    settle();
  }

  function toggleKeep(index) {
    if (!state || state.over || state.phase !== "roll" || state.rolls < 1 || rolling) return false;
    if (!state.kept[index] && state.kept.filter(Boolean).length >= state.dice.length) return false;
    state.kept[index] = !state.kept[index];
    render();
    return true;
  }

  function resolveDice() {
    if (!state || state.over || state.phase !== "roll" || state.rolls < 1 || rolling) return false;
    const player = cur();
    if (!canPick(player)) return false;
    const counts = diceCount();
    const lines = [];
    let vpGain = 0;
    [1, 2, 3].forEach((face) => {
      if (counts[face] >= 3) vpGain += face + (counts[face] - 3);
    });
    if (vpGain) {
      player.vp += vpGain;
      lines.push("نقاط نصر +" + ar(vpGain));
    }
    const energyGain = counts.energy * (1 + powerCount(player, "energy"));
    if (energyGain) {
      player.energy += energyGain;
      lines.push("طاقة +" + ar(energyGain));
    }
    let healed = 0;
    if (!player.inTokyo) {
      healed = counts.heart * (1 + powerCount(player, "heal"));
      if (healed) {
        const before = player.health;
        player.health = Math.min(player.maxHealth, player.health + healed);
        healed = player.health - before;
        lines.push("شفاء +" + ar(healed));
      }
    } else if (counts.heart) {
      lines.push("لا شفاء بالقلوب داخل طوكيو");
    }

    const claws = counts.claw;
    const damageBase = claws + (claws ? powerCount(player, "claw") + (player.inTokyo ? powerCount(player, "stomp") : 0) : 0);
    const damagedTokyo = [];
    if (damageBase > 0) {
      if (player.inTokyo) {
        const targets = state.players.filter((other) => other.alive && other.index !== player.index && !other.inTokyo);
        targets.forEach((target) => { damage(target, damageBase, "claws", player); });
        if (targets.length) lines.push("ضرر " + ar(damageBase) + " لكل من خارج طوكيو");
      } else {
        const targets = state.players.filter((other) => other.alive && other.inTokyo);
        targets.forEach((target) => {
          const before = target.health;
          damage(target, damageBase, "claws", player);
          if (target.alive && target.health < before) damagedTokyo.push(target.index);
        });
        if (targets.length) lines.push("ضرر " + ar(damageBase) + " لكل من في طوكيو");
      }
    }
    state.last = { text: lines.length ? lines.join(" · ") : "لم تنتج الرمية أي أثر." };
    apiRef.log("<strong>" + esc(player.name) + "</strong>: " + esc(state.last.text) + ".", "accent");
    if (state.over) return true;

    if (!player.alive) {
      state.phase = "buy";
      state.notice = player.name + " سقط. ينتقل الدور.";
      render();
      clearTimeout(timer);
      timer = setTimeout(() => { if (state && !state.over) startTurn(state.current + 1); }, 900);
      return true;
    }

    if (damagedTokyo.length) {
      state.yieldQueue = damagedTokyo;
      state.phase = "yield";
      state.yieldCurrent = state.yieldQueue.shift();
      state.notice = "وحش في طوكيو تأذى. هل ينسحب؟";
      render();
      settleYield();
    } else {
      enterTokyoStep();
    }
    return true;
  }

  function damage(target, amount, source, attacker) {
    if (!state || state.over || !target || !target.alive || amount <= 0) return 0;
    let value = amount;
    if (hasPower(target, "armor")) value = Math.max(0, value - 1);
    if (!value) return 0;
    target.health = Math.max(0, target.health - value);
    apiRef.log("<strong>" + esc(target.name) + "</strong> فقد <strong>" + ar(value) + "</strong> صحة. المتبقي: " + ar(target.health) + ".", "warn");
    if (target.health <= 0) eliminate(target);
    return value;
  }

  function eliminate(target) {
    if (!target.alive) return;
    target.alive = false;
    target.health = 0;
    if (target.slot != null) {
      state.occupied[target.slot] = null;
      target.slot = null;
      target.inTokyo = false;
    }
    apiRef.log("<strong>" + esc(target.name) + "</strong> خرج من اللعبة!", "danger");
    if (alivePlayers().length <= 1) finish(alivePlayers()[0] || null);
  }

  function absorbSpikes(target, attacker) {
    if (!target || !target.alive || !hasPower(target, "spike")) return;
    const count = powerCount(target, "spike");
    for (let i = 0; i < count; i++) {
      if (!attacker.alive) break;
      apiRef.log("أشواك <strong>" + esc(target.name) + "</strong> تصيب <strong>" + esc(attacker.name) + "</strong>.", "warn");
      damage(attacker, 1, "spike", target);
    }
  }

  function processYield() {
    if (!state || state.over) return;
    while (state.yieldQueue.length || state.yieldCurrent != null) {
      if (state.yieldCurrent == null) state.yieldCurrent = state.yieldQueue.shift();
      const player = state.players[state.yieldCurrent];
      if (!player || !player.alive || player.slot == null) {
        state.yieldCurrent = null;
        continue;
      }
      state.phase = "yield";
      state.notice = player.name + " في طوكيو وتلقى ضررًا. هل ينسحب إلى الخارج؟";
      render();
      if (XG.cpuTurn(apiRef, state, player.index)) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!state || state.over) return;
          decideYield(aiShouldYield(player));
        }, AI.delay(player.level, 0.7));
      }
      return;
    }
    state.phase = "enter";
    enterTokyoStep();
  }

  function settleYield() {
    if (!state || state.over) return;
    processYield();
  }

  function decideYield(shouldYield) {
    if (!state || state.over || state.phase !== "yield" || state.yieldCurrent == null) return false;
    const player = state.players[state.yieldCurrent];
    if (!player || !player.alive || player.slot == null) {
      state.yieldCurrent = null;
      processYield();
      return false;
    }
    if (shouldYield) {
      apiRef.log("<strong>" + esc(player.name) + "</strong> ينسحب من طوكيو.", "warn");
      state.occupied[player.slot] = null;
      player.slot = null;
      player.inTokyo = false;
    } else {
      apiRef.log("<strong>" + esc(player.name) + "</strong> يبقى في طوكيو.", "accent");
    }
    state.yieldCurrent = null;
    processYield();
    return true;
  }

  function enterTokyoStep() {
    if (!state || state.over) return;
    const player = cur();
    if (!player.alive) {
      clearTimeout(timer);
      timer = setTimeout(() => { if (state && !state.over) startTurn(state.current + 1); }, 800);
      return;
    }
    if (player.inTokyo) { toBuy(); return; }
    if (state.occupied[0] == null) {
      enterSlot(0);
      return;
    }
    if (state.slots > 1 && state.occupied[1] == null) {
      state.phase = "enter";
      state.notice = "خليج طوكيو فارغ. يمكنك دخوله والحصول على نقطة، أو البقاء خارجًا.";
      render();
      if (XG.cpuTurn(apiRef, state, player.index)) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!state || state.over) return;
          chooseEnter(aiShouldEnter(player));
        }, AI.delay(player.level, 0.8));
      }
      return;
    }
    toBuy();
  }

  function enterSlot(slot) {
    const player = cur();
    if (!player || !player.alive || state.occupied[slot] != null) return false;
    player.inTokyo = true;
    player.slot = slot;
    state.occupied[slot] = player.index;
    player.vp += 1;
    apiRef.log("<strong>" + esc(player.name) + "</strong> دخل " + (slot === 1 ? "خليج طوكيو" : "مدينة طوكيو") + " وكسب نقطة نصر.", "good");
    state.notice = player.name + " دخل طوكيو. سيحصل على نقطتين عند بداية دوره القادم.";
    toBuy();
    return true;
  }

  function chooseEnter(enter) {
    if (!state || state.over || state.phase !== "enter") return false;
    if (enter && state.slots > 1 && state.occupied[1] == null) {
      enterSlot(1);
    } else {
      apiRef.log("<strong>" + esc(cur().name) + "</strong> بقي خارج طوكيو.", "accent");
      toBuy();
    }
    return true;
  }

  function toBuy() {
    if (!state || state.over) return;
    state.phase = "buy";
    state.notice = "مرحلة الشراء: يمكنك شراء بطاقات قوة بالطاقة، أو مسح السوق، ثم إنهاء الدور.";
    render();
    settle();
  }

  function buyCard(marketIndex) {
    if (!state || state.over || state.phase !== "buy") return false;
    const player = cur();
    if (!canPick(player)) return false;
    const id = state.market[marketIndex];
    const card = POWERS[id];
    if (!card || player.energy < card.cost) return false;
    player.energy -= card.cost;
    player.powers.push(id);
    apiRef.log("<strong>" + esc(player.name) + "</strong> اشترى <strong>" + esc(card.name) + "</strong> بـ" + ar(card.cost) + " طاقة.", "good");
    if (card.instant) applyInstant(player, id);
    state.market[marketIndex] = state.deck.pop() || null;
    state.market = state.market.filter(Boolean);
    while (state.market.length < 3 && state.deck.length) state.market.push(state.deck.pop());
    state.notice = "تم شراء " + card.name + ".";
    render();
    settle();
    return true;
  }

  function applyInstant(player, id) {
    if (!state || state.over) return;
    if (id === "burst") {
      state.players.forEach((other) => {
        if (other.alive && other.index !== player.index) damage(other, 2, "burst", player);
      });
      apiRef.log("نفَس النار يضرب كل الوحوش الأخرى.", "warn");
    } else if (id === "medkit") {
      const before = player.health;
      player.health = Math.min(player.maxHealth, player.health + 3);
      apiRef.log("<strong>" + esc(player.name) + "</strong> استعاد " + ar(player.health - before) + " صحة.", "good");
    } else if (id === "battery") {
      player.energy += 3;
      apiRef.log("<strong>" + esc(player.name) + "</strong> حصل على ٣ طاقة إضافية.", "good");
    } else if (id === "fame") {
      player.vp += 3;
      apiRef.log("<strong>" + esc(player.name) + "</strong> حصل على ٣ نقاط شهرة.", "good");
    } else if (id === "giant") {
      player.maxHealth += 2;
      player.health = Math.min(player.maxHealth, player.health + 2);
      apiRef.log("<strong>" + esc(player.name) + "</strong> أصبح عملاقًا: +٢ صحة قصوى.", "good");
    }
  }

  function sweepMarket() {
    if (!state || state.over || state.phase !== "buy") return false;
    const player = cur();
    if (!canPick(player) || player.energy < 2) return false;
    player.energy -= 2;
    state.market = [];
    while (state.market.length < 3 && state.deck.length) state.market.push(state.deck.pop());
    apiRef.log("<strong>" + esc(player.name) + "</strong> دفع ٢ طاقة لمسح السوق.", "accent");
    state.notice = "تم مسح السوق وكشف بطاقات جديدة.";
    render();
    settle();
    return true;
  }

  function endTurn() {
    if (!state || state.over || state.phase !== "buy") return false;
    const player = cur();
    if (!canPick(player)) return false;
    let gain = 0;
    if (hasPower(player, "vpTurn")) {
      gain = powerCount(player, "vpTurn");
      player.vp += gain;
    }
    const heal = powerCount(player, "healTurn");
    if (heal) {
      const before = player.health;
      player.health = Math.min(player.maxHealth, player.health + heal);
      if (player.health > before) apiRef.log("<strong>" + esc(player.name) + "</strong> يستعيد صحة نهاية الدور.", "good");
    }
    const energy = powerCount(player, "energyTurn");
    if (energy) player.energy += energy;
    if (gain) apiRef.log("<strong>" + esc(player.name) + "</strong> يكسب " + ar(gain) + " نقطة من عرشه.", "good");
    apiRef.log("<strong>" + esc(player.name) + "</strong> أنهى دوره.", "accent");
    if (checkVictory()) return true;
    state.turn += 1;
    if (player.index + 1 >= state.players.length) state.round += 1;
    startTurn(state.current + 1);
    return true;
  }

  function checkVictory() {
    const alive = alivePlayers();
    if (alive.length <= 1) {
      finish(alive[0] || null);
      return true;
    }
    const champion = state.players.filter((player) => player.alive && player.vp >= 20).sort((a, b) => b.vp - a.vp)[0];
    if (champion) {
      finish(champion);
      return true;
    }
    return false;
  }

  function finish(winner) {
    if (!state) return;
    state.over = true;
    state.phase = "over";
    if (winner && winner.slot != null) {
      state.occupied[winner.slot] = null;
    }
    const ranking = state.players.slice().sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (b.vp !== a.vp) return b.vp - a.vp;
      return b.health - a.health;
    }).map((player) => ({
      name: player.name,
      value: player.vp,
      detail: (player.alive ? "صحة " + ar(player.health) : "خرج") + " · طاقة " + ar(player.energy) + " · قوى " + ar(player.powers.length),
    }));
    state.notice = "انتهت اللعبة. الفائز: " + (winner ? winner.name : "لا أحد") + ".";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت ملك طوكيو",
      text: "أول وحش يصل ٢٠ نقطة نصر أو آخر وحش صامد يعتلي عرش طوكيو.",
      winner: winner ? winner.name + " — " + ar(winner.vp) + " نقطة" : "لا أحد",
      icon: "👑",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function faceScore(counts, player, level) {
    const hpRatio = player.health / player.maxHealth;
    const numbers = [1, 2, 3].map((face) => {
      const count = counts[face];
      let value = count >= 3 ? count * face * 1.15 : count >= 2 ? count * face * 0.6 : count * 0.15;
      return { key: String(face), count, value };
    });
    const clawBonus = powerCount(player, "claw") + (player.inTokyo ? powerCount(player, "stomp") : 0);
    const heartBonus = powerCount(player, "heal");
    const energyBonus = powerCount(player, "energy");
    const options = numbers.concat([
      { key: "claw", count: counts.claw, value: counts.claw * (4.2 + clawBonus * 0.9) },
      {
        key: "heart",
        count: counts.heart,
        value: player.inTokyo ? counts.heart * 0.4 : counts.heart * (hpRatio < 0.55 ? 4.4 : 2.1 + heartBonus * 0.5),
      },
      { key: "energy", count: counts.energy, value: counts.energy * (2.5 + energyBonus * 0.6) },
    ]);
    options.sort((a, b) => b.value - a.value);
    if (level === "easy") {
      options.sort((a, b) => b.count - a.count || b.value - a.value);
    }
    return options[0];
  }

  function autoKeep() {
    const player = cur();
    const counts = diceCount();
    const level = AI.level(player.level);
    const target = faceScore(counts, player, level);
    if (!target || target.count === 0) {
      state.kept = state.dice.map((_, index) => index < 2);
      return;
    }
    state.kept = state.dice.map((value) => String(value) === String(target.key));
  }

  function aiRollStep() {
    if (!state || state.over || state.phase !== "roll" || rolling) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    /* الخطوة التالية تُجدول بعد استقرار النرد لا قبله */
    const rollThenStep = () => {
      const next = () => {
        clearTimeout(timer);
        timer = setTimeout(aiRollStep, AI.delay(player.level, 0.7));
      };
      if (!rollDice(next)) next();
    };
    if (state.rolls === 0) {
      rollThenStep();
      return;
    }
    if (state.rolls < 3) {
      autoKeep();
      rollThenStep();
      return;
    }
    resolveDice();
  }

  function powerValue(player, id) {
    const others = state.players.filter((other) => other.alive && other.index !== player.index).length;
    const hpRatio = player.health / player.maxHealth;
    switch (id) {
      case "claw": return 4.6 + powerCount(player, "claw") * 1.6;
      case "heal": return player.inTokyo ? 1.2 : 4.2;
      case "armor": return 4.4;
      case "energy": return 3.2;
      case "die": return 5.8;
      case "vpTurn": return 6.2;
      case "healTurn": return 4.6;
      case "energyTurn": return 4.2;
      case "stomp": return player.inTokyo ? 5.0 : 2.6;
      case "spike": return player.inTokyo ? 4.2 : 2.0;
      case "burst": return 3.4 + others * 1.4;
      case "medkit": return hpRatio < 0.6 ? 5.4 : 1.2;
      case "battery": return player.energy < 3 ? 4.8 : 1.4;
      case "fame": return 5.2;
      case "giant": return hpRatio < 0.6 ? 5.2 : 3.6;
      default: return 2.5;
    }
  }

  function aiBuy() {
    if (!state || state.over || state.phase !== "buy") return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const level = AI.level(player.level);
    const maxBuys = level === "easy" ? 1 : level === "expert" ? 3 : 2;
    let bought = 0;

    while (bought < maxBuys) {
      const options = state.market
        .map((id, index) => ({ id, index, card: POWERS[id], value: powerValue(player, id) }))
        .filter((entry) => entry.card && entry.card.cost <= player.energy)
        .sort((a, b) => {
          if (level === "easy") return b.card.cost - a.card.cost || b.value - a.value;
          return b.value - a.value || a.card.cost - b.card.cost;
        });
      if (!options.length) break;
      const pick = options[0];
      const threshold = level === "easy" ? 0 : level === "normal" ? 1.5 : 2.5;
      if (pick.value < threshold) break;
      buyCard(pick.index);
      bought += 1;
      if (state.over || state.phase !== "buy") return;
    }

    /* مسح السوق عندما تكون الطاقة كافية والبطاقات ضعيفة. */
    if (player.energy >= 2 && state.market.length) {
      const bestValue = Math.max(...state.market.map((id) => (POWERS[id] ? powerValue(player, id) : 0)));
      if (bestValue < 3 && Math.random() < AI.chance(level, 0.1, 0.3, 0.5, 0.65)) {
        sweepMarket();
        if (state.over || state.phase !== "buy") return;
      }
    }

    clearTimeout(timer);
    timer = setTimeout(() => { if (state && !state.over && state.phase === "buy") endTurn(); }, AI.delay(player.level, 0.8));
  }

  function aiShouldYield(player) {
    const level = AI.level(player.level);
    const hpRatio = player.health / player.maxHealth;
    let chance = hpRatio < 0.3 ? 0.9 : hpRatio < 0.5 ? 0.55 : 0.18;
    if (player.vp >= 16) chance -= 0.22;
    if (state.players.some((other) => other.alive && other.index !== player.index && other.vp >= player.vp + 3)) chance += 0.12;
    if (level === "easy") chance = 0.35;
    if (level === "normal") chance = Math.min(0.9, chance + 0.08);
    return Math.random() < chance;
  }

  function aiShouldEnter(player) {
    const level = AI.level(player.level);
    const hpRatio = player.health / player.maxHealth;
    let threshold = level === "easy" ? 0.68 : level === "normal" ? 0.55 : level === "hard" ? 0.44 : 0.34;
    if (player.vp >= 16) threshold = 0.85;
    if (player.health <= 3) threshold = 0.15;
    return hpRatio >= threshold;
  }

  function settle() {
    if (!state || state.over) return;
    if (state.phase === "roll" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiRollStep, AI.delay(cur().level, 0.8));
    } else if (state.phase === "buy" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiBuy, AI.delay(cur().level, 0.8));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function dieHtml(value, kept, index, can) {
    return '<button type="button" class="kt-die ' + FACE_CLASS[value] + (kept ? " is-kept" : "") + '" data-kt-die="' + index + '" ' +
      (!can ? "disabled" : "") + ' aria-pressed="' + (kept ? "true" : "false") + '">' +
      '<span class="kt-die-face">' + FACE_LABEL[value] + "</span>" +
      (kept ? '<span class="kt-keep">مثبّت</span>' : "") + "</button>";
  }

  function healthBar(player) {
    const pct = Math.max(0, Math.round((player.health / player.maxHealth) * 100));
    return '<div class="kt-health"><div class="kt-health-bar" style="width:' + pct + '%"></div><span>' + ar(player.health) + " / " + ar(player.maxHealth) + "</span></div>";
  }

  function powerChips(player) {
    if (!player.powers.length) return '<span class="xg-muted">لا قوى</span>';
    return player.powers.map((id) => '<span class="kt-power" title="' + esc(POWERS[id].desc) + '">' + POWERS[id].icon + " " + esc(POWERS[id].name) + "</span>").join("");
  }

  function playerPanel(player) {
    return '<article class="kt-player ' + (player.index === state.current ? "is-current " : "") + (player.alive ? "" : "is-out ") + (player.inTokyo ? "is-tokyo" : "") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="kt-monster">' + player.icon + "</span>" + BG.playerProfile.playerHTML(player, "kt-player-avatar") + "<strong>" + esc(player.name) + "</strong></span>" +
      '<span class="kt-vp">👑 ' + ar(player.vp) + "</span></div>" +
      healthBar(player) +
      '<div class="kt-player-stats"><span>⚡ ' + ar(player.energy) + '</span><span>🎴 ' + ar(player.powers.length) + "</span>" +
      (player.inTokyo ? '<span class="kt-tokyo-badge">في طوكيو</span>' : "") + "</div>" +
      '<div class="kt-powers">' + powerChips(player) + "</div></article>";
  }

  function tokyoPanel() {
    const slots = state.occupied.map((index, slot) => {
      const player = index != null ? state.players[index] : null;
      return '<div class="kt-slot ' + (player ? "is-filled" : "") + '"' + (player ? ' style="--pc:' + player.color + '"' : "") + ">" +
        '<span class="kt-slot-label">' + (slot === 1 ? "خليج طوكيو" : "مدينة طوكيو") + "</span>" +
        (player
          ? '<span class="kt-slot-monster">' + player.icon + "</span><strong>" + esc(player.name) + "</strong>" +
            '<span class="kt-slot-health">' + ar(player.health) + " صحة</span>"
          : '<span class="kt-slot-empty">فارغ</span>') +
        "</div>";
    }).join("");
    return '<div class="xg-panel kt-tokyo"><div class="xg-spread"><h3>طوكيو</h3><span class="xg-chip">من يدخلها يكسب ١، ومن يبدأ دوره فيها يكسب ٢</span></div>' +
      '<div class="kt-slots">' + slots + "</div>" +
      '<p class="xg-note">داخل طوكيو: مخالبك تضرب الجميع خارجها، لكنك لا تشفى بالقلوب. من يهاجمك قد يجعلك تنسحب.</p></div>';
  }

  function rollPanel() {
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const extra = hasPower(player, "die") ? 1 : 0;
    const total = 6 + extra;
    const dice = state.dice.length ? state.dice : Array.from({ length: total }, () => null);
    return '<div class="xg-panel kt-roll"><div class="xg-spread"><h3>نرد ' + esc(player.name) + "</h3>" +
      '<span class="xg-chip ' + (state.rolls ? "is-live" : "") + '">الرمية ' + ar(state.rolls) + " / ٣</span></div>" +
      '<div class="kt-dice">' + dice.map((value, index) => value == null
        ? '<span class="kt-die is-empty">?</span>'
        : dieHtml(value, !!state.kept[index], index, can && state.rolls > 0)).join("") + "</div>" +
      '<div class="xg-row kt-roll-actions">' +
      '<button type="button" class="xg-btn primary" data-kt-roll ' + (!can || state.rolls >= 3 ? "disabled" : "") + ">" +
      (state.rolls ? "أعد الرمي" : "ارمِ النرد") + "</button>" +
      '<button type="button" class="xg-btn" data-kt-resolve ' + (!can || state.rolls < 1 ? "disabled" : "") + ">ثبّت النتائج</button>" +
      "</div>" +
      '<p class="xg-note">' + esc(state.notice) + "</p></div>";
  }

  function yieldPanel() {
    const player = state.yieldCurrent != null ? state.players[state.yieldCurrent] : null;
    if (!player) return "";
    const can = XG.canAct(apiRef, state, player.index, state.over);
    return '<div class="xg-panel kt-yield"><h3>' + esc(player.name) + " في طوكيو</h3>" +
      '<p class="xg-note">تلقّى ضررًا ومازال صامدًا. يمكنه الانسحاب إلى خارج طوكيو، أو البقاء وكسب نقاطها.</p>' +
      '<div class="xg-row"><button type="button" class="xg-btn primary" data-kt-stay ' + (!can ? "disabled" : "") + ">ابقَ في طوكيو</button>" +
      '<button type="button" class="xg-btn" data-kt-yield ' + (!can ? "disabled" : "") + ">انسحب</button></div></div>";
  }

  function enterPanel() {
    const can = XG.canAct(apiRef, state, state.current, state.over);
    return '<div class="xg-panel kt-enter"><h3>خليج طوكيو فارغ</h3>' +
      '<p class="xg-note">يمكنك دخول الخليج والحصول على نقطة نصر، أو البقاء خارج طوكيو هذا الدور.</p>' +
      '<div class="xg-row"><button type="button" class="xg-btn primary" data-kt-enter ' + (!can ? "disabled" : "") + ">ادخل خليج طوكيو</button>" +
      '<button type="button" class="xg-btn" data-kt-stayout ' + (!can ? "disabled" : "") + ">ابقَ خارجًا</button></div></div>";
  }

  function marketPanel() {
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    return '<div class="xg-panel kt-market"><div class="xg-spread"><h3>سوق القوى</h3><span class="xg-chip is-good">طاقتك ' + ar(player.energy) + "</span></div>" +
      '<div class="kt-market-grid">' + state.market.map((id, index) => {
        const card = POWERS[id];
        const affordable = can && player.energy >= card.cost;
        return '<button type="button" class="kt-card ' + (card.instant ? "is-instant" : "") + '" data-kt-buy="' + index + '" ' + (!affordable ? "disabled" : "") + ">" +
          '<span class="kt-card-icon">' + card.icon + "</span>" +
          '<span class="kt-card-name">' + esc(card.name) + "</span>" +
          '<span class="kt-card-cost">⚡ ' + ar(card.cost) + "</span>" +
          '<span class="kt-card-desc">' + esc(card.desc) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="xg-row kt-buy-actions"><button type="button" class="xg-btn" data-kt-sweep ' + (!can || player.energy < 2 ? "disabled" : "") + ">امسح السوق (٢ طاقة)</button>" +
      '<button type="button" class="xg-btn primary" data-kt-end ' + (!can ? "disabled" : "") + ">إنهاء الدور</button></div>" +
      '<p class="xg-note">يمكنك شراء أكثر من بطاقة ما دمت تملك الطاقة. البطاقات الفورية تُطبّق مباشرة.</p></div>';
  }

  function render() {
    if (!rootRef || !state) return;
    const seen = state.players[viewSeat()] || cur();
    rootRef.innerHTML =
      '<div class="xg kt">' +
      XG.bar("ملك طوكيو", "٢٠ نقطة نصر أو آخر وحش صامد · نرد، مخالب، وطوكيو", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("نقاطك", ar(seen.vp), "is-good"),
        XG.chip("صحتك", ar(seen.health) + " / " + ar(seen.maxHealth)),
        XG.chip("طاقتك", ar(seen.energy)),
      ].join("")) +
      '<div class="kt-layout"><div class="kt-main">' +
      tokyoPanel() +
      (state.phase === "roll" ? rollPanel() : "") +
      (state.phase === "yield" ? yieldPanel() : "") +
      (state.phase === "enter" ? enterPanel() : "") +
      (state.phase === "buy" ? marketPanel() : "") +
      '<div class="xg-panel"><div class="xg-spread"><h3>الوحوش</h3><span class="xg-chip">الجولة ' + ar(state.round) + "</span></div>" +
      '<div class="kt-players">' + state.players.map(playerPanel).join("") + "</div></div>" +
      '<p class="kt-last">' + esc(state.notice) + "</p>" +
      "</div>" +
      '<aside class="kt-side">' +
      '<div class="xg-panel"><h3>النتائج</h3><p class="xg-note">ثلاثة متشابهة من ١–٣ تمنح نقاطًا بقيمة الرقم، وكل نرد إضافي +١. كل قلب يشفي ١ خارج طوكيو، وكل برق يمنح ١ طاقة، وكل مخلب يضرب الأعداء.</p></div>' +
      '<div class="xg-panel"><h3>طوكيو</h3><p class="xg-note">الدخول يمنح ١ نقطة، وبداية الدور فيها ٢. من في طوكيو يضرب الجميع خارجها، ومن خارجها يضرب من في طوكيو. يمكن للمتضرر الانسحاب.</p></div>' +
      '<div class="xg-panel"><h3>النهاية</h3><p class="xg-note">أول وحش يصل ٢٠ نقطة بعد نهاية دوره يفوز، أو آخر وحش صامد. القوى الفورية تُطبّق عند الشراء.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const die = event.target.closest("[data-kt-die]");
    if (die) { toggleKeep(Number(die.dataset.ktDie)); return; }
    if (event.target.closest("[data-kt-roll]")) { rollDice(); return; }
    if (event.target.closest("[data-kt-resolve]")) { resolveDice(); return; }
    if (event.target.closest("[data-kt-yield]")) { decideYield(true); return; }
    if (event.target.closest("[data-kt-stay]")) { decideYield(false); return; }
    if (event.target.closest("[data-kt-enter]")) { chooseEnter(true); return; }
    if (event.target.closest("[data-kt-stayout]")) { chooseEnter(false); return; }
    const buy = event.target.closest("[data-kt-buy]");
    if (buy) { buyCard(Number(buy.dataset.ktBuy)); return; }
    if (event.target.closest("[data-kt-sweep]")) { sweepMarket(); return; }
    if (event.target.closest("[data-kt-end]")) { endTurn(); }
  }

  const game = {
    id: "king-of-tokyo",
    name: "ملك طوكيو",
    en: "KING OF TOKYO",
    icon: "👑",
    accent: "#c45f52",
    cardClass: "card-king-of-tokyo",
    tagline: "وحوش عملاقة تتصارع على طوكيو بالنرد والمخالب وبطاقات القوى.",
    players: "2–6",
    duration: "30–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 3,

    options: {
      hint: "نسخة كاملة القواعد الأساسية: ١٥ بطاقة قوة أصلية، نرد، طوكيو بمدينة وخليج، و٢٠ نقطة.",
      defaults: {},
      fields: [],
      summary() { return "٢٠ نقطة · نرد ٦ · طوكيو · قوى"; },
    },

    rules: {
      goal: "كن أول وحش يصل إلى ٢٠ نقطة نصر، أو آخر وحش يبقى على قيد الحياة.",
      facts: [["اللاعبون", "٢–٦"], ["النقاط", "٢٠"], ["الصحة", "١٠"], ["طوكيو", "مدينة وخليج"]],
      components: ["٦ نرد أسود بوجوه: ١، ٢، ٣، قلب، برق، مخلب.", "لوح طوكيو بمدينة وخليج (لـ٥–٦ لاعبين).", "بطاقات قوة تُشترى بالطاقة.", "مؤشرات صحة ونقاط."],
      setup: [
        "يبدأ كل وحش بـ١٠ صحة و٠ نقاط و٠ طاقة.",
        "لا يبدأ أي وحش داخل طوكيو.",
        "تُخلط بطاقات القوى وتُكشف ٣ في السوق.",
        "يبدأ اللاعب الأول بدوره، ومن يدخل طوكيو أولًا يحصل على نقطة.",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ ٦ نرد حتى ٣ مرات، ويمكنك تثبيت أي نرد بين الرميات.",
        "<strong>النتائج:</strong> ثلاثة متشابهة من ١–٣ تمنح نقاطًا بقيمة الرقم +١ لكل نرد إضافي. القلوب تشفي خارج طوكيو فقط. البرق يمنح طاقة. المخالب تضرب الخصوم.",
        "<strong>المخالب:</strong> إذا كنت في طوكيو تضرب كل من هو خارجها، وإذا كنت خارجها تضرب كل من في طوكيو. المتضرر في طوكيو يمكنه الانسحاب.",
        "<strong>دخول طوكيو:</strong> إذا كانت المدينة فارغة يجب عليك دخولها. خليج طوكيو اختياري لـ٥–٦ لاعبين.",
        "<strong>الشراء:</strong> يمكنك شراء أي عدد من بطاقات القوى بالطاقة، أو دفع ٢ لمسح السوق. ثم أنهِ دورك.",
        "<strong>نهاية الدور:</strong> تُطبّق قوى نهاية الدور، ويبدأ الدور التالي. من يبدأ دوره في طوكيو يكسب ٢ نقطة.",
      ],
      winning: "أول وحش يصل ٢٠ نقطة نصر بعد انتهاء دوره، أو آخر وحش صامد.",
      notes: [
        "القلوب لا تشفي داخل طوكيو، لكن بطاقات القوى يمكنها ذلك.",
        "الانسحاب من طوكيو ممكن فقط بعد تلقي ضرر من مخالب وحش آخر.",
        "الدرع يقلل كل ضرر بمقدار ١، والأشواك ترد على مهاجم المخالب.",
        "بطاقات القوى الفورية تُطبّق مباشرة عند الشراء.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearRoll();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت ملك طوكيو مع " + ar(state.players.length) + " وحوش. أول من يدخل طوكيو يحصل على نقطة.", "accent");
      apiRef.setStatus("دور " + state.players[0].name);
      startTurn(0);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          rollDice,
          toggleKeep,
          resolveDice,
          buyCard,
          sweepMarket,
          endTurn,
          decideYield,
          chooseEnter,
          startTurn,
          damage,
          enterSlot,
          hasPower,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
            settle();
          },
          setDice(values) {
            if (!state || !Array.isArray(values)) return;
            state.dice = values.slice(0, 8);
            state.kept = state.dice.map(() => false);
            state.rolls = 1;
            render();
          },
          giveEnergy(n) { cur().energy += Number(n) || 0; render(); },
          heal(n) { cur().health = Math.min(cur().maxHealth, cur().health + (Number(n) || 0)); render(); },
          setVP(n) { cur().vp = Number(n) || 0; render(); },
          phase(p) { if (state) { state.phase = p; render(); settle(); } },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearRoll();
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
          clearRoll();
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
