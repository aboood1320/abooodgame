/* ==========================================================================
   كوب — لعبة الخداع والنفوذ
   أدوار مخفية، تحديات، حجب، وانقلاب على الخصوم حتى آخر نفوذ.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const ROLES = {
    duke: { name: "الدوق", icon: "👑", action: "ضريبة", block: "معونة خارجية", color: "#c9a45c" },
    assassin: { name: "القاتل", icon: "🗡️", action: "اغتيال", block: "", color: "#c45f52" },
    captain: { name: "القبطان", icon: "⚓", action: "سرقة", block: "سرقة", color: "#5d8e83" },
    ambassador: { name: "السفير", icon: "🕊️", action: "تبادل", block: "سرقة", color: "#8a7dbb" },
    contessa: { name: "الكونتيسا", icon: "🌹", action: "", block: "اغتيال", color: "#c77c64" },
  };
  const DECK_COUNTS = { duke: 3, assassin: 3, captain: 3, ambassador: 3, contessa: 3 };
  const ACTIONS = {
    income: { name: "دخل", cost: 0, role: null, desc: "خذ عملة واحدة بلا تحدٍ." },
    aid: { name: "معونة خارجية", cost: 0, role: null, block: "duke", desc: "خذ عملتين. يمكن للدوق حجبها." },
    coup: { name: "انقلاب", cost: 7, role: null, desc: "ادفع ٧ عملات وأسقط نفوذًا لخصم. لا يُحجب." },
    tax: { name: "ضريبة", cost: 0, role: "duke", desc: "خذ ٣ عملات بصفته دوقًا." },
    assassinate: { name: "اغتيال", cost: 3, role: "assassin", block: "contessa", desc: "ادفع ٣ وأسقط نفوذ خصم. الكونتيسا تحجبه." },
    steal: { name: "سرقة", cost: 0, role: "captain", block: "captain", desc: "خذ عملتين من خصم. القبطان أو السفير يحجبه." },
    exchange: { name: "تبادل", cost: 0, role: "ambassador", desc: "اسحب بطاقتين وبدّل من يدك." },
  };
  const TARGETED = new Set(["coup", "assassinate", "steal"]);

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;
  let serial = 1;

  function buildDeck() {
    const deck = [];
    Object.entries(DECK_COUNTS).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) deck.push(role);
    });
    return U.shuffle(deck);
  }

  function makePlayers() {
    const count = Math.max(2, Math.min(4, (apiRef.players || []).length));
    const players = XG.players(apiRef, count, ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb"]).map((player, index) => ({
      ...player,
      color: ["#c9a45c", "#5d8e83", "#c77c64", "#8a7dbb"][index],
      coins: 2,
      roles: [],
      revealed: [],
      alive: true,
    }));
    const deck = buildDeck();
    players.forEach((player) => { player.roles = [deck.pop(), deck.pop()]; });
    return { players, deck };
  }

  function newState() {
    const built = makePlayers();
    return {
      players: built.players,
      deck: built.deck,
      current: 0,
      phase: "action",
      pending: null,
      targeting: null,
      reactors: [],
      reactorPos: 0,
      blockClaim: null,
      exchange: null,
      lose: null,
      notice: "اختر فعلًا. يمكنك خداع الخصوم… لكن التحدي قد يكشفك.",
      last: null,
      over: false,
      winner: null,
      turn: 1,
    };
  }

  function cur() { return state.players[state.current]; }
  function alivePlayers() { return state.players.filter((player) => player.alive); }
  function roleData(role) { return ROLES[role] || ROLES.duke; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }
  function canPick(player) {
    if (!state || state.over) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }
  function countRole(player, role) { return player.roles.filter((key) => key === role).length; }
  function hasRole(player, role) { return player.roles.includes(role); }

  function drawReplacement(player) {
    if (!state.deck.length) state.deck = U.shuffle(state.deck);
    if (!state.deck.length) return;
    player.roles.push(state.deck.pop());
  }

  function nextTurn() {
    if (state.over) return;
    const alive = alivePlayers();
    if (alive.length === 1) {
      finish(alive[0]);
      return;
    }
    state.phase = "action";
    state.pending = null;
    state.targeting = null;
    state.reactors = [];
    state.reactorPos = 0;
    state.blockClaim = null;
    state.exchange = null;
    state.lose = null;
    state.turn += 1;
    let guard = 0;
    do {
      state.current = (state.current + 1) % state.players.length;
      guard += 1;
    } while (!cur().alive && guard < state.players.length + 1);
    state.notice = "دور " + cur().name + " — اختر فعلًا أو تحدَّ خصمك.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function beginReactions(pending) {
    state.phase = "react";
    state.pending = pending;
    state.reactors = state.players
      .filter((player) => player.alive && player.index !== pending.actor)
      .map((player) => player.index);
    state.reactorPos = 0;
    state.notice = "فرصة للرد على «" + ACTIONS[pending.type].name + "» من " + state.players[pending.actor].name + ".";
    render();
    advanceReactor();
  }

  function advanceReactor() {
    if (!state.pending || state.phase !== "react") return;
    while (state.reactorPos < state.reactors.length) {
      const index = state.reactors[state.reactorPos];
      const player = state.players[index];
      if (!player || !player.alive) {
        state.reactorPos += 1;
        continue;
      }
      state.notice = "بانتظار رد " + player.name + " على " + ACTIONS[state.pending.type].name + ".";
      render();
      if (player.isCpu) {
        clearTimeout(timer);
        timer = setTimeout(() => aiReact(player), AI.delay(player.level, 0.6));
      }
      return;
    }
    executePending();
  }

  function skipReactor() {
    state.reactorPos += 1;
    advanceReactor();
  }

  function reactionFor(player) {
    const pending = state.pending;
    if (!pending) return { canChallenge: false, canBlock: false };
    const action = ACTIONS[pending.type];
    const canChallenge = !!action.role;
    let canBlock = false;
    if (pending.type === "aid" && player.index === pending.actor) return { canChallenge: false, canBlock: false };
    if (pending.type === "aid") canBlock = true;
    else if (pending.block && (pending.type === "assassinate" || pending.type === "steal")) {
      canBlock = player.index === pending.target;
    }
    return { canChallenge, canBlock };
  }

  function doChallenge(challenger) {
    if (!state.pending || state.phase !== "react") return;
    const pending = state.pending;
    const actor = state.players[pending.actor];
    const claimRole = pending.type === "aid" ? "duke" : ACTIONS[pending.type].role;
    state.phase = "resolve";
    if (hasRole(actor, claimRole)) {
      apiRef.log(
        "<strong>" + esc(challenger.name) + "</strong> تحدّى <strong>" + esc(actor.name) + "</strong>، لكن الأخير يملك " +
        esc(roleData(claimRole).name) + ". خسر المتحدّي نفوذًا.", "warn"
      );
      state.pending = null;
      loseInfluence(challenger, "خسارة تحدٍّ فاشل", () => nextTurn());
    } else {
      apiRef.log(
        "<strong>" + esc(challenger.name) + "</strong> كشف خداع <strong>" + esc(actor.name) + "</strong> — لا يملك " +
        esc(roleData(claimRole).name) + ". خسر الممثل نفوذًا وأُلغي الفعل.", "good"
      );
      state.pending = null;
      loseInfluence(actor, "خداع مكشوف", () => nextTurn());
    }
  }

  function doBlock(blocker) {
    if (!state.pending || state.phase !== "react") return;
    const pending = state.pending;
    const blockRole = pending.type === "aid" ? "duke" : ACTIONS[pending.type].block;
    if (!blockRole) return;
    state.blockClaim = { player: blocker.index, role: blockRole };
    state.phase = "block";
    state.notice = blocker.name + " يحجب بـ" + roleData(blockRole).name + ". هل تتحدى الحجب؟";
    apiRef.log("<strong>" + esc(blocker.name) + "</strong> يدّعي " + esc(roleData(blockRole).name) + " لحجب الفعل.", "accent");
    render();
    const actor = state.players[pending.actor];
    if (actor.isCpu) {
      clearTimeout(timer);
      timer = setTimeout(aiChallengeBlock, AI.delay(actor.level, 0.7));
    }
  }

  function challengeBlock() {
    if (!state.pending || !state.blockClaim) return;
    const block = state.blockClaim;
    const blocker = state.players[block.player];
    const actor = state.players[state.pending.actor];
    state.phase = "resolve";
    if (hasRole(blocker, block.role)) {
      apiRef.log("الحجب صحيح: " + esc(blocker.name) + " يملك " + esc(roleData(block.role).name) + ". فشل الفعل.", "good");
      state.pending = null;
      state.blockClaim = null;
      loseInfluence(actor, "تحدي حجب صحيح", () => nextTurn());
    } else {
      apiRef.log("الحجب كان خدعة! " + esc(blocker.name) + " خسر نفوذًا، ويُنفَّذ الفعل.", "warn");
      state.blockClaim = null;
      loseInfluence(blocker, "حجب مكشوف", () => executePending(true));
    }
  }

  function acceptBlock() {
    if (!state.pending || !state.blockClaim) return;
    const blocker = state.players[state.blockClaim.player];
    apiRef.log("قبل " + esc(cur().name) + " حجب " + esc(blocker.name) + ". انتهى الفعل.", "warn");
    state.last = { text: blocker.name + " حجب الفعل بنجاح." };
    state.pending = null;
    state.blockClaim = null;
    nextTurn();
  }

  function loseInfluence(player, reason, after) {
    state.phase = "lose";
    state.lose = { player: player.index, reason, after: after || "turn" };
    state.notice = player.name + " يجب أن يكشف أحد أدواره (" + reason + ").";
    render();
    if (player.isCpu) {
      clearTimeout(timer);
      timer = setTimeout(() => aiLose(player), AI.delay(player.level, 0.7));
    }
  }

  function chooseLose(role) {
    if (!state || state.phase !== "lose" || !state.lose) return;
    const player = state.players[state.lose.player];
    const index = player.roles.indexOf(role);
    if (index < 0) return;
    player.roles.splice(index, 1);
    player.revealed.push(role);
    apiRef.log("<strong>" + esc(player.name) + "</strong> كشف " + esc(roleData(role).name) + ".", "warn");
    if (!player.roles.length) {
      player.alive = false;
      apiRef.log("<strong>" + esc(player.name) + "</strong> خرج من اللعبة.", "danger");
    }
    const after = state.lose.after;
    state.lose = null;
    const alive = alivePlayers();
    if (alive.length <= 1) {
      finish(alive[0] || player);
      return;
    }
    if (after === "next") nextTurn();
    else executePending(true);
  }

  function executePending(skipReactions) {
    const pending = state.pending;
    if (!pending) { nextTurn(); return; }
    const actor = state.players[pending.actor];
    const target = pending.target != null ? state.players[pending.target] : null;
    state.pending = null;
    state.phase = "action";
    if (!skipReactions) state.reactors = [];
    switch (pending.type) {
      case "income":
        actor.coins += 1;
        state.last = { text: actor.name + " أخذ عملة دخل." };
        break;
      case "aid":
        actor.coins += 2;
        state.last = { text: actor.name + " أخذ عملتين معونة خارجية." };
        break;
      case "tax":
        actor.coins += 3;
        state.last = { text: actor.name + " جمع ٣ عملات ضريبة." };
        break;
      case "steal": {
        const amount = Math.min(2, target.coins);
        target.coins -= amount;
        actor.coins += amount;
        state.last = { text: actor.name + " سرق " + amount + " عملة من " + target.name + "." };
        break;
      }
      case "assassinate":
      case "coup":
        state.last = { text: actor.name + " نفّذ " + ACTIONS[pending.type].name + " على " + target.name + "." };
        loseInfluence(target, ACTIONS[pending.type].name, () => (state.over ? null : nextTurn()));
        return;
      case "exchange": {
        const extra = [state.deck.pop(), state.deck.pop()].filter(Boolean);
        state.exchange = { player: actor.index, cards: actor.roles.concat(extra), selected: [], extra };
        state.phase = "exchange";
        state.notice = "اختر بطاقتين للاحتفاظ بهما من " + ar(state.exchange.cards.length) + " بطاقات.";
        render();
        return;
      }
      default:
        break;
    }
    if (state.over) return;
    nextTurn();
  }

  function confirmExchange() {
    if (!state || state.phase !== "exchange" || !state.exchange) return;
    if (state.exchange.selected.length !== 2) return;
    const player = state.players[state.exchange.player];
    const cards = state.exchange.cards;
    const kept = state.exchange.selected.slice().sort((a, b) => a - b);
    const returned = cards.filter((_, index) => !kept.includes(index));
    player.roles = kept.map((index) => cards[index]);
    state.deck = U.shuffle(state.deck.concat(returned));
    apiRef.log("<strong>" + esc(player.name) + "</strong> بدّل بطاقاته مع السفير.", "accent");
    state.exchange = null;
    state.phase = "action";
    nextTurn();
  }

  function beginAction(type, targetIndex) {
    if (!state || state.over || state.phase !== "action") return false;
    const player = cur();
    if (!canPick(player)) return false;
    const action = ACTIONS[type];
    if (!action) return false;
    if (player.coins < action.cost) {
      apiRef.toast("تحتاج " + ar(action.cost) + " عملات لهذا الفعل.", "warn");
      return false;
    }
    if (TARGETED.has(type)) {
      if (targetIndex == null) { state.targeting = type; render(); return false; }
      const target = state.players[targetIndex];
      if (!target || !target.alive || target.index === player.index) return false;
    }
    if (action.cost) player.coins -= action.cost;
    const pending = { type, actor: player.index, target: TARGETED.has(type) ? targetIndex : null, role: action.role };
    state.pending = pending;
    state.targeting = null;
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> أعلن <strong>" + esc(action.name) + "</strong>" +
      (pending.target != null ? " على <strong>" + esc(state.players[pending.target].name) + "</strong>" : "") + ".",
      "accent"
    );
    if (action.role || action.block) beginReactions(pending);
    else executePending(true);
    return true;
  }

  function swapRoles(index) {
    if (!state || state.phase !== "exchange" || !state.exchange) return;
    const at = state.exchange.selected.indexOf(index);
    if (at >= 0) state.exchange.selected.splice(at, 1);
    else if (state.exchange.selected.length < 2) state.exchange.selected.push(index);
    render();
  }

  function finish(winner) {
    state.over = true;
    state.phase = "over";
    state.notice = "انتهت اللعبة. الفائز: " + (winner ? winner.name : "لا أحد") + ".";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    const ranking = state.players.slice().sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.coins - a.coins;
    }).map((player) => ({
      name: player.name,
      value: player.alive ? player.coins + 10 : 0,
      detail: (player.alive ? "نفوذ باقٍ " : "خرج · ") + ar(player.roles.length) + " دور مخفي، " + ar(player.revealed.length) + " مكشوف",
    }));
    apiRef.gameOver({
      title: "انتهت كوب",
      text: "آخر لاعب يحتفظ بنفوذ يفوز. التحدي يكشف الخداع، والحجب يحمي من الاغتيال والسرقة.",
      winner: winner ? winner.name : "لا أحد",
      icon: "🎭",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function aiReact(player) {
    if (!state || state.phase !== "react" || !state.pending) return;
    const pending = state.pending;
    const action = ACTIONS[pending.type];
    const reaction = reactionFor(player);
    const actor = state.players[pending.actor];
    if (reaction.canChallenge && action.role) {
      const suspicion = 0.18 + (actor.coins >= 6 ? 0.15 : 0) + (pending.type === "assassinate" ? 0.15 : 0);
      if (Math.random() < suspicion && !hasRole(actor, action.role)) {
        doChallenge(player);
        return;
      }
    }
    if (reaction.canBlock) {
      const blockRole = pending.type === "aid" ? "duke" : action.block;
      if (hasRole(player, blockRole) && Math.random() < 0.8) {
        doBlock(player);
        return;
      }
      if (Math.random() < 0.12) { doBlock(player); return; }
    }
    skipReactor();
  }

  function aiChallengeBlock() {
    if (!state || !state.blockClaim) return;
    const blocker = state.players[state.blockClaim.player];
    if (Math.random() < 0.28 && !hasRole(blocker, state.blockClaim.role)) challengeBlock();
    else acceptBlock();
  }

  function aiLose(player) {
    if (!state || state.phase !== "lose") return;
    chooseLose(U.pick(player.roles));
  }

  function aiAction() {
    if (!state || state.over || state.phase !== "action") return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const alive = alivePlayers();
    const targets = alive.filter((other) => other.index !== player.index);
    if (player.coins >= 10 || (player.coins >= 7 && Math.random() < 0.6)) {
      const target = U.pick(targets);
      beginAction("coup", target.index);
      return;
    }
    if (player.coins >= 3 && hasRole(player, "assassin") && Math.random() < 0.55) {
      beginAction("assassinate", U.pick(targets).index);
      return;
    }
    if (hasRole(player, "captain") && targets.some((t) => t.coins > 0) && Math.random() < 0.45) {
      beginAction("steal", U.pick(targets).index);
      return;
    }
    if (hasRole(player, "duke") && Math.random() < 0.6) { beginAction("tax"); return; }
    if (hasRole(player, "ambassador") && Math.random() < 0.35) { beginAction("exchange"); return; }
    if (Math.random() < 0.25) { beginAction("aid"); return; }
    beginAction("income");
  }

  function settle() {
    if (!state || state.over) return;
    if (state.phase === "action" && XG.cpuTurn(apiRef, state, cur().index)) {
      clearTimeout(timer);
      timer = setTimeout(aiAction, AI.delay(cur().level, 0.9));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function roleChip(role, hidden) {
    if (hidden) return '<span class="cp-role is-back">🂠</span>';
    const data = roleData(role);
    return '<span class="cp-role" style="--rc:' + data.color + '"><span>' + data.icon + "</span>" + esc(data.name) + "</span>";
  }

  function playerPanel(player) {
    const isCurrent = player.index === state.current;
    const seen = state.players[viewSeat()];
    const showRoles = seen && seen.index === player.index;
    return '<article class="cp-player ' + (isCurrent ? "is-current" : "") + (player.alive ? "" : " is-out") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row"><span class="xg-avatar">' + ar(player.index + 1) + "</span><strong>" + esc(player.name) + "</strong></span>" +
      '<span class="cp-coins">🪙 ' + ar(player.coins) + "</span></div>" +
      '<div class="cp-roles">' +
      player.revealed.map((role) => roleChip(role, false)).join("") +
      player.roles.map((role) => roleChip(role, !showRoles)).join("") +
      "</div>" +
      '<p class="cp-player-note">' + (player.alive ? "نفوذ " + ar(player.roles.length) : "خرج من اللعبة") + "</p></article>";
  }

  function actionPanel() {
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    if (state.phase === "action") {
      return '<div class="xg-panel cp-actions"><h3>أفعال ' + esc(player.name) + "</h3>" +
        '<div class="cp-action-grid">' +
        Object.entries(ACTIONS).map(([key, action]) => {
          const disabled = !can || player.coins < action.cost;
          return '<button type="button" class="cp-action ' + (state.targeting === key ? "is-targeting" : "") + '" data-cp-action="' + key + '" ' + (disabled ? "disabled" : "") + ">" +
            "<strong>" + esc(action.name) + "</strong><span>" + (action.cost ? ar(action.cost) + " 🪙 · " : "") + esc(action.desc) + "</span></button>";
        }).join("") + "</div>" +
        (state.targeting ? '<div class="cp-targets"><strong>اختر الخصم:</strong><div class="xg-row">' +
          state.players.filter((p) => p.alive && p.index !== player.index).map((p) => '<button type="button" class="xg-btn" data-cp-target="' + p.index + '">' + esc(p.name) + " · 🪙 " + ar(p.coins) + "</button>").join("") +
          '<button type="button" class="xg-btn ghost" data-cp-cancel>إلغاء</button></div></div>' : "") +
        '<p class="xg-note">' + esc(state.notice) + "</p></div>";
    }
    if (state.phase === "react") {
      const reactorIndex = state.reactors[state.reactorPos];
      const reactor = state.players[reactorIndex];
      if (!reactor) return "";
      const reaction = reactionFor(reactor);
      const canReact = XG.canAct(apiRef, state, reactor.index, state.over);
      const pending = state.pending;
      const roleName = pending ? (pending.type === "aid" ? "duke" : ACTIONS[pending.type].role) : null;
      return '<div class="xg-panel cp-react"><h3>رد ' + esc(reactor.name) + "</h3>" +
        '<p class="xg-note">الفعل: <strong>' + esc(ACTIONS[pending.type].name) + "</strong>" +
        (state.players[pending.actor] ? " من " + esc(state.players[pending.actor].name) : "") +
        (pending.target != null ? " على " + esc(state.players[pending.target].name) : "") + ".</p>" +
        (roleName ? '<p class="xg-note">الادعاء: ' + esc(roleData(roleName).name) + ".</p>" : "") +
        '<div class="xg-row">' +
        (reaction.canChallenge ? '<button type="button" class="xg-btn danger" data-cp-challenge ' + (!canReact ? "disabled" : "") + ">تحدٍّ</button>" : "") +
        (reaction.canBlock ? '<button type="button" class="xg-btn primary" data-cp-block ' + (!canReact ? "disabled" : "") + ">حجب</button>" : "") +
        '<button type="button" class="xg-btn" data-cp-pass ' + (!canReact ? "disabled" : "") + ">متابعة</button>" +
        "</div></div>";
    }
    if (state.phase === "block") {
      const block = state.blockClaim;
      const blocker = block ? state.players[block.player] : null;
      const actor = state.players[state.pending.actor];
      const can = XG.canAct(apiRef, state, actor.index, state.over);
      return '<div class="xg-panel cp-react"><h3>حجب</h3><p class="xg-note"><strong>' + (blocker ? esc(blocker.name) : "") + "</strong> يدّعي <strong>" +
        (block ? esc(roleData(block.role).name) : "") + "</strong> لحجب الفعل.</p>" +
        '<div class="xg-row"><button type="button" class="xg-btn danger" data-cp-challenge-block ' + (!can ? "disabled" : "") + ">تحدَّ الحجب</button>" +
        '<button type="button" class="xg-btn" data-cp-accept-block ' + (!can ? "disabled" : "") + ">اقبل الحجب</button></div></div>";
    }
    if (state.phase === "lose") {
      const loser = state.players[state.lose.player];
      const can = XG.canAct(apiRef, state, loser.index, state.over);
      return '<div class="xg-panel cp-lose"><h3>اختر دورًا تكشفه</h3><p class="xg-note">' + esc(loser.name) + " — " + esc(state.lose.reason) + ".</p>" +
        '<div class="xg-row">' + loser.roles.map((role) => '<button type="button" class="xg-btn" data-cp-lose="' + role + '" ' + (!can ? "disabled" : "") + ">" + esc(roleData(role).name) + "</button>").join("") + "</div></div>";
    }
    if (state.phase === "exchange") {
      const exchange = state.exchange;
      const player = state.players[exchange.player];
      const can = XG.canAct(apiRef, state, player.index, state.over);
      return '<div class="xg-panel cp-exchange"><h3>تبادل السفير</h3><p class="xg-note">اختر بطاقتين للاحتفاظ: ' + ar(exchange.selected.length) + " / ٢</p>" +
        '<div class="xg-row">' + exchange.cards.map((role, index) => '<button type="button" class="xg-btn ' + (exchange.selected.includes(index) ? "primary" : "") + '" data-cp-exchange="' + index + '" ' + (!can ? "disabled" : "") + ">" + esc(roleData(role).name) + "</button>").join("") + "</div>" +
        '<button type="button" class="xg-btn primary" data-cp-exchange-confirm ' + (!can || exchange.selected.length !== 2 ? "disabled" : "") + ">تأكيد التبادل</button></div>";
    }
    return "";
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    rootRef.innerHTML =
      '<div class="xg cp">' +
      XG.bar("كوب", "أدوار مخفية · تحديات · حجب · آخر نفوذ يفوز", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("عملاتك", ar(seen.coins), "is-good"),
        XG.chip("نفوذك", ar(seen.roles.length)),
        XG.chip("الطور", state.phase === "action" ? "فعل" : state.phase === "react" ? "رد" : state.phase === "lose" ? "كشف" : state.phase === "exchange" ? "تبادل" : "حجب"),
      ].join("")) +
      '<div class="cp-layout"><div class="cp-main">' +
      actionPanel() +
      '<div class="xg-panel"><div class="xg-spread"><h3>اللاعبون</h3><span class="xg-chip">' + ar(alivePlayers().length) + " أحياء</span></div>" +
      '<div class="cp-players">' + state.players.map(playerPanel).join("") + "</div></div>" +
      "</div>" +
      '<aside class="cp-side"><div class="xg-panel"><h3>الأدوار</h3>' +
      Object.entries(ROLES).map(([role, data]) => '<div class="cp-role-row"><span class="cp-role-icon">' + data.icon + "</span><div><strong>" + esc(data.name) + "</strong><span>" +
        (data.action ? "فعل: " + esc(data.action) : "لا فعل") + (data.block ? " · يحجب: " + esc(data.block) : "") + "</span></div></div>").join("") +
      "</div>" +
      '<div class="xg-panel"><h3>الحالة</h3><p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="cp-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">يمكنك ادعاء أي دور، لكن التحدي يكشف الحقيقة. من يخسر نفوذًا يكشف بطاقة. عند ٧ عملات يمكنك الانقلاب بلا رد. آخر لاعب يبقى يفوز.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const action = event.target.closest("[data-cp-action]");
    if (action) {
      beginAction(action.dataset.cpAction);
      return;
    }
    const target = event.target.closest("[data-cp-target]");
    if (target && state.targeting) {
      beginAction(state.targeting, Number(target.dataset.cpTarget));
      return;
    }
    if (event.target.closest("[data-cp-cancel]")) { state.targeting = null; render(); return; }
    if (event.target.closest("[data-cp-challenge]")) {
      const reactor = state.players[state.reactors[state.reactorPos]];
      if (reactor) doChallenge(reactor);
      return;
    }
    if (event.target.closest("[data-cp-block]")) {
      const reactor = state.players[state.reactors[state.reactorPos]];
      if (reactor) doBlock(reactor);
      return;
    }
    if (event.target.closest("[data-cp-pass]")) { skipReactor(); return; }
    if (event.target.closest("[data-cp-challenge-block]")) { challengeBlock(); return; }
    if (event.target.closest("[data-cp-accept-block]")) { acceptBlock(); return; }
    const lose = event.target.closest("[data-cp-lose]");
    if (lose) { chooseLose(lose.dataset.cpLose); return; }
    const exchange = event.target.closest("[data-cp-exchange]");
    if (exchange) { swapRoles(Number(exchange.dataset.cpExchange)); return; }
    if (event.target.closest("[data-cp-exchange-confirm]")) confirmExchange();
  }

  const game = {
    id: "coup",
    name: "كوب",
    en: "COUP",
    icon: "🎭",
    accent: "#8a7dbb",
    cardClass: "card-coup",
    tagline: "ادّعِ النفوذ، احجب الهجمات، وتحدَّ الخداع قبل أن يفقد الجميع أدوارهم.",
    players: "2–4",
    duration: "15–25 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة قريبة من الأصل: خمسة أدوار، عملات، تحديات، حجب، وانقلاب بـ٧ عملات.",
      defaults: {},
      fields: [],
      summary() { return "5 أدوار · تحدي وحجب · آخر نفوذ"; },
    },

    rules: {
      goal: "آخر لاعب يحتفظ ببطاقة نفوذ واحدة على الأقل يفوز. استخدم العملات والأدوار المخفية للتخلص من الخصوم.",
      facts: [["الأدوار", "٥"], ["النفوذ", "بطاقتان"], ["العملات", "تبدأ بـ٢"], ["الانقلاب", "٧ عملات"]],
      components: ["١٥ بطاقة دور: ٣ من كل دور.", "عملات معدنية.", "بطاقات نفوذ مخفية لكل لاعب."],
      setup: ["يخلط الجميع الأدوار ويأخذ كل لاعب بطاقتين مخفيتين.", "يبدأ كل لاعب بعملتين.", "يبدأ الحاكم بأول فعل ثم ينتقل الدور."],
      steps: [
        "<strong>الفعل:</strong> دخل (١)، معونة (٢ يمكن للدوق حجبها)، ضريبة (٣ للدوق)، سرقة (٢ للقبطان)، اغتيال (٣ للقاتل)، تبادل (السفير)، انقلاب (٧ بلا رد).",
        "<strong>التحدي:</strong> يمكن لأي خصم تحدي ادعاء الدور. إن كان صحيحًا خسر المتحدّي نفوذًا، وإن كان خاطئًا خسر الممثل نفوذًا وأُلغي الفعل.",
        "<strong>الحجب:</strong> الدوق يحجب المعونة، الكونتيسا تحجب الاغتيال، والقبطان أو السفير يحجب السرقة. يمكن تحدي الحجب أيضًا.",
        "<strong>خسارة النفوذ:</strong> من يخسر نفوذًا يكشف إحدى بطاقتيه. من يكشف بطاقتيه يخرج.",
        "<strong>النهاية:</strong> آخر لاعب لديه نفوذ يفوز.",
      ],
      winning: "آخر لاعب يبقى لديه نفوذ مخفي واحد على الأقل.",
      notes: [
        "الانقلاب لا يمكن تحديه ولا حجبه؛ إنه الطريق الآمن عند امتلاك ٧ عملات.",
        "يمكن ادعاء دور لا تملكه؛ هذه هي روح كوب، لكن الخصوم قد يتحدونك.",
        "تكلفة الاغتيال تُدفع عند الإعلان حتى لو حُجب الفعل.",
        "هذه نسخة مبسطة من تبادل السفير: تُسحب بطاقتان وتُختار بطاقتان للاحتفاظ.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت كوب مع " + ar(state.players.length) + " لاعبين. بطاقتان مخفيتان لكل لاعب.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          beginAction,
          doChallenge,
          doBlock,
          challengeBlock,
          acceptBlock,
          chooseLose,
          swapRoles,
          confirmExchange,
          aiAction,
          aiReact,
          skipReactor,
          hasRole,
          nextTurn,
          giveCoins(n) { cur().coins += Number(n) || 0; render(); },
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            state.phase = "action";
            state.pending = null;
            state.targeting = null;
            state.blockClaim = null;
            state.lose = null;
            state.exchange = null;
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
