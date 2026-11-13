/* ==========================================================================
   سكال — أقراص الوردة والجمجمة
   ضع قرصًا سريًا، زايد على عدد الأقراص، واكشف بلا جمجمة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const COLORS = ["#c77c64", "#5d8e83", "#8a7dbb", "#c9a45c", "#6f9b6e", "#c48a3f"];
  const TARGET = 2;

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function makePlayers() {
    const count = U.clamp((apiRef.players || []).length || 3, 3, 6);
    const list = [];
    for (let index = 0; index < count; index++) {
      const source = (apiRef.players || [])[index];
      list.push({
        index,
        name: source && source.name ? source.name : "اللاعب " + (index + 1),
        color: (source && source.profileColor) || COLORS[index],
        type: source && source.type === "cpu" ? "cpu" : "human",
        level: source ? BG.ai.level(source.level) : BG.ai.level(1),
        isCpu: source ? BG.ai.isCpu(source) : true,
        discs: ["rose", "rose", "rose", "skull"],
        placed: null,
        revealed: false,
        score: 0,
        alive: true,
      });
    }
    return list;
  }

  function newState() {
    return {
      players: makePlayers(),
      phase: "place",
      current: 0,
      starter: 0,
      round: 1,
      bidding: null,
      flip: null,
      notice: "كل لاعب يضع قرصًا واحدًا سرًا. الوردة آمنة، والجمجمة تفقدك الجولة.",
      last: null,
      over: false,
      winner: null,
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }
  function canPick(player) {
    if (!state || state.over) return false;
    return XG.canAct(apiRef, state, player.index, state.over) || XG.cpuTurn(apiRef, state, player.index);
  }
  function alivePlayers() { return state.players.filter((player) => player.alive); }
  function placedTotal() { return state.players.filter((player) => player.alive && player.placed).length; }
  function scoreOf(player) { return player.score; }

  function startRound(starter) {
    if (!state || state.over) return;
    const alive = alivePlayers();
    if (alive.length <= 1) {
      finish(alive[0] || null);
      return;
    }
    state.players.forEach((player) => { player.placed = null; player.revealed = false; });
    state.flip = null;
    state.bidding = null;
    state.phase = "place";
    let start = ((starter % state.players.length) + state.players.length) % state.players.length;
    let guard = 0;
    while (!state.players[start].alive && guard < state.players.length) {
      start = (start + 1) % state.players.length;
      guard += 1;
    }
    state.starter = start;
    state.current = start;
    state.notice = "جولة " + ar(state.round) + ": " + state.players[start].name + " يبدأ بوضع قرصه.";
    apiRef.setStatus("جولة " + ar(state.round));
    render();
    settle();
  }

  function place(card) {
    if (!state || state.over || state.phase !== "place") return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (card !== "rose" && card !== "skull") return false;
    const at = player.discs.indexOf(card);
    if (at < 0) return false;
    player.discs.splice(at, 1);
    player.placed = card;
    player.revealed = false;
    apiRef.log("<strong>" + esc(player.name) + "</strong> وضع قرصه سرًا.", "accent");
    const next = state.players
      .filter((other) => other.alive && !other.placed)
      .map((other) => other.index)
      .sort((a, b) => a - b);
    if (!next.length) {
      beginBidding();
      return true;
    }
    let index = (player.index + 1) % state.players.length;
    let guard = 0;
    while (state.players[index].placed && guard < state.players.length) {
      index = (index + 1) % state.players.length;
      guard += 1;
    }
    state.current = index;
    state.notice = "دور " + state.players[index].name + " لوضع قرصه.";
    render();
    settle();
    return true;
  }

  function beginBidding() {
    const total = placedTotal();
    state.phase = "bid";
    state.bidding = { bid: 0, high: null, active: alivePlayers().map((player) => player.index), total };
    state.current = state.starter;
    state.notice = "المزايدة: كم قرصًا يمكنك كشفه دون جمجمة؟ أعلى مزايدة تبدأ من ١.";
    apiRef.setStatus("المزايدة");
    render();
    settle();
  }

  function bid(amount) {
    if (!state || state.over || state.phase !== "bid" || !state.bidding) return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (!state.bidding.active.includes(player.index)) return false;
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value <= state.bidding.bid || value > state.bidding.total) {
      apiRef.toast("المزايدة يجب أن تكون بين " + ar(state.bidding.bid + 1) + " و" + ar(state.bidding.total) + ".", "warn");
      return false;
    }
    state.bidding.bid = value;
    state.bidding.high = player.index;
    apiRef.log("<strong>" + esc(player.name) + "</strong> زايد: <strong>" + ar(value) + "</strong>.", "accent");
    state.notice = player.name + " رفع المزايدة إلى " + ar(value) + ".";
    advanceBidder();
    return true;
  }

  function advanceBidder() {
    if (!state.bidding) return;
    if (state.bidding.active.length <= 1) {
      if (state.bidding.high == null) {
        state.bidding.active = alivePlayers().map((player) => player.index);
        state.current = state.starter;
        state.bidding.bid = 0;
        state.notice = "لم يزايد أحد. يجب على البادئ فتح المزايدة برقم ١.";
        render();
        settle();
        return;
      }
      startFlip(state.bidding.high);
      return;
    }
    let next = state.current;
    let guard = 0;
    do {
      next = (next + 1) % state.players.length;
      guard += 1;
    } while (!state.bidding.active.includes(next) && guard < state.players.length + 1);
    state.current = next;
    render();
    settle();
  }

  function passBid() {
    if (!state || state.over || state.phase !== "bid" || !state.bidding) return false;
    const player = cur();
    if (!canPick(player)) return false;
    if (state.bidding.active.length <= 1) return false;
    if (state.bidding.bid === 0 && player.index === state.starter) {
      apiRef.toast("على البادئ فتح المزايدة بـ١ على الأقل.", "warn");
      return false;
    }
    state.bidding.active = state.bidding.active.filter((index) => index !== player.index);
    apiRef.log("<strong>" + esc(player.name) + "</strong> مرّر المزايدة.", "warn");
    state.notice = player.name + " مرّر.";
    if (state.bidding.active.length <= 1) {
      if (state.bidding.high == null) {
        state.bidding.active = alivePlayers().map((other) => other.index);
        state.current = state.starter;
        state.bidding.bid = 0;
        state.notice = "لا مزايدة بعد. على البادئ فتح المزايدة برقم ١.";
        render();
        settle();
        return true;
      }
      startFlip(state.bidding.high);
      return true;
    }
    advanceBidder();
    return true;
  }

  function startFlip(playerIndex) {
    const player = state.players[playerIndex];
    if (!player) return;
    const need = state.bidding ? state.bidding.bid : 1;
    state.phase = "flip";
    state.current = playerIndex;
    state.flip = { player: playerIndex, need, count: 0, revealed: [], ownDone: false };
    state.bidding = null;
    state.notice = player.name + " يفوز بالمزايدة ويجب أن يكشف " + ar(need) + " قرصًا. يبدأ بقرصه.";
    apiRef.log("<strong>" + esc(player.name) + "</strong> يفوز بالمزايدة (" + ar(need) + ") ويبدأ الكشف.", "good");
    render();
    clearTimeout(timer);
    timer = setTimeout(revealOwn, XG.cpuTurn(apiRef, state, playerIndex) ? AI.delay(player.level, 0.7) : 420);
  }

  function revealOwn() {
    if (!state || state.over || state.phase !== "flip" || !state.flip || state.flip.ownDone) return;
    const player = state.players[state.flip.player];
    if (!player.placed) return;
    state.flip.ownDone = true;
    player.revealed = true;
    state.flip.revealed.push({ player: player.index, card: player.placed, own: true });
    if (player.placed === "skull") {
      apiRef.log("<strong>" + esc(player.name) + "</strong> كشف جمجمة في قرصه! فشل التحدي.", "danger");
      failRound(player.index);
      return;
    }
    state.flip.count += 1;
    if (state.flip.count >= state.flip.need) {
      succeedRound(player.index);
      return;
    }
    state.notice = "ظهرت وردة. اختر قرصًا من خصم لتكمل " + ar(state.flip.need) + ".";
    render();
    settleFlip();
  }

  function flipCard(targetIndex) {
    if (!state || state.over || state.phase !== "flip" || !state.flip) return false;
    const flipper = state.players[state.flip.player];
    const target = state.players[targetIndex];
    if (!canPick(flipper)) return false;
    if (!target || !target.alive || target.index === flipper.index || !target.placed || target.revealed) return false;
    target.revealed = true;
    state.flip.revealed.push({ player: target.index, card: target.placed, own: false });
    apiRef.log(
      "كشف <strong>" + esc(flipper.name) + "</strong> قرص <strong>" + esc(target.name) + "</strong>: " +
      (target.placed === "skull" ? "جمجمة!" : "وردة."),
      target.placed === "skull" ? "danger" : "good"
    );
    if (target.placed === "skull") {
      failRound(target.index);
      return true;
    }
    state.flip.count += 1;
    if (state.flip.count >= state.flip.need) {
      succeedRound(flipper.index);
      return true;
    }
    state.notice = "وردة! " + ar(state.flip.count) + " من " + ar(state.flip.need) + ". اختر قرصًا آخر.";
    render();
    settleFlip();
    return true;
  }

  function succeedRound(winnerIndex) {
    const winner = state.players[winnerIndex];
    winner.score += 1;
    apiRef.log("<strong>" + esc(winner.name) + "</strong> نجح وكسب الجولة! (" + ar(winner.score) + " من " + ar(TARGET) + ").", "good");
    state.last = { text: winner.name + " كشف " + state.flip.count + " وردة وفاز بالجولة." };
    state.notice = winner.name + " فاز بالجولة. الجميع يستعيد أقراصه.";
    endRound(winner.index, null);
  }

  function failRound(skullOwner) {
    const flipper = state.players[state.flip.player];
    const hand = flipper.discs;
    let lost = null;
    if (hand.length) {
      lost = U.pick(hand);
      hand.splice(hand.indexOf(lost), 1);
    } else if (flipper.placed) {
      lost = flipper.placed;
      flipper.placed = null;
    }
    apiRef.log(
      "<strong>" + esc(flipper.name) + "</strong> فشل وخسر قرص " + (lost ? (lost === "skull" ? "جمجمة" : "وردة") : "—") + ".",
      "danger"
    );
    state.last = { text: flipper.name + " كشف جمجمة وخسر قرصًا." };
    state.notice = flipper.name + " كشف جمجمة. " + (skullOwner != null ? state.players[skullOwner].name + " كان صاحب الجمجمة." : "");
    endRound(skullOwner != null ? skullOwner : flipper.index, skullOwner);
  }

  function endRound(nextStarter, skullOwner) {
    state.players.forEach((player) => {
      if (player.placed) {
        player.discs.push(player.placed);
        player.placed = null;
      }
      player.revealed = false;
    });
    state.flip = null;
    state.bidding = null;
    state.phase = "roundEnd";
    state.players.forEach((player) => {
      if (player.discs.length === 0) {
        player.alive = false;
        apiRef.log("<strong>" + esc(player.name) + "</strong> خرج من اللعبة بعد فقدان كل أقراصه.", "danger");
      }
    });
    const alive = alivePlayers();
    const champion = state.players.find((player) => player.score >= TARGET);
    if (champion) {
      finish(champion);
      return;
    }
    if (alive.length <= 1) {
      finish(alive[0] || null);
      return;
    }
    state.round += 1;
    let starter = nextStarter != null ? nextStarter : state.starter;
    if (!state.players[starter] || !state.players[starter].alive) {
      starter = alive[0].index;
    }
    render();
    clearTimeout(timer);
    timer = setTimeout(() => { if (state && !state.over) startRound(starter); }, 800);
  }

  function finish(winner) {
    if (!state) return;
    state.over = true;
    state.phase = "over";
    const ranking = state.players.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.discs.length - a.discs.length;
    }).map((player) => ({
      name: player.name,
      value: player.score,
      detail: "جولات " + ar(player.score) + " · أقراص " + ar(player.discs.length) + (player.alive ? "" : " · خارج اللعبة"),
    }));
    state.notice = "انتهت اللعبة. الفائز: " + (winner ? winner.name : "لا أحد") + " بـ" + ar(winner ? winner.score : 0) + " جولات.";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    apiRef.gameOver({
      title: "انتهت سكال",
      text: "أول من يفوز بجولتين، أو آخر لاعب يملك أقراصًا، يفوز. المزايدة أعلى من عدد الأقراص قد تكشف جمجمة!",
      winner: winner ? winner.name : "لا أحد",
      icon: "💀",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function aiPlace() {
    if (!state || state.over || state.phase !== "place") return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    const hasSkull = player.discs.includes("skull");
    const card = hasSkull && Math.random() < 0.36 ? "skull" : player.discs.includes("rose") ? "rose" : "skull";
    place(card);
  }

  function aiBid() {
    if (!state || state.over || state.phase !== "bid" || !state.bidding) return;
    const player = cur();
    if (!XG.cpuTurn(apiRef, state, player.index)) return;
    if (state.bidding.bid === 0) { bid(1); return; }
    const total = state.bidding.total;
    let cap = player.placed === "rose" ? Math.min(total, 2 + Math.floor(Math.max(0, total - 2) / 3)) : 1;
    if (!player.discs.includes("skull")) cap += 1;
    if (state.bidding.bid < cap && Math.random() < 0.72) bid(state.bidding.bid + 1);
    else passBid();
  }

  function aiFlip() {
    if (!state || state.over || state.phase !== "flip" || !state.flip || !state.flip.ownDone) return;
    const flipper = state.players[state.flip.player];
    if (!XG.cpuTurn(apiRef, state, flipper.index)) return;
    const targets = state.players.filter((player) => player.alive && player.index !== flipper.index && player.placed && !player.revealed);
    if (!targets.length) return;
    flipCard(U.pick(targets).index);
  }

  function settle() {
    if (!state || state.over) return;
    if (state.phase === "place" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiPlace, AI.delay(cur().level, 0.7));
    } else if (state.phase === "bid" && XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiBid, AI.delay(cur().level, 0.8));
    }
  }

  function settleFlip() {
    if (!state || state.over || state.phase !== "flip" || !state.flip) return;
    const flipper = state.players[state.flip.player];
    if (XG.cpuTurn(apiRef, state, flipper.index)) {
      clearTimeout(timer);
      timer = setTimeout(aiFlip, AI.delay(flipper.level, 0.7));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function discFace(card, extra) {
    return '<span class="sk-disc ' + (card === "skull" ? "is-skull" : "is-rose") + (extra ? " " + extra : "") + '" aria-label="' +
      (card === "skull" ? "جمجمة" : "وردة") + '">' + (card === "skull" ? "💀" : "🌹") + "</span>";
  }

  function discBack(clickable, index) {
    if (clickable) {
      return '<button type="button" class="sk-disc is-back is-clickable" data-sk-flip="' + index + '" aria-label="اكشف قرص ' + ar(index + 1) + '">✦</button>';
    }
    return '<span class="sk-disc is-back" aria-label="قرص مخفي">✦</span>';
  }

  function playerMat(player) {
    const isCurrent = player.index === state.current;
    const isFlipper = state.flip && state.flip.player === player.index;
    const canFlip = state.phase === "flip" && state.flip && state.flip.ownDone &&
      state.flip.player !== player.index && player.placed && !player.revealed;
    return '<article class="sk-player ' + (isCurrent ? "is-current " : "") + (isFlipper ? "is-flipper " : "") + (player.alive ? "" : "is-out") + '" style="--pc:' + player.color + '">' +
      '<div class="xg-spread"><span class="xg-row">' + BG.playerProfile.playerHTML(player, "sk-player-avatar") + "<strong>" + esc(player.name) + "</strong></span>" +
      '<span class="sk-score">🌹 ' + ar(player.score) + "</span></div>" +
      '<div class="sk-mat">' +
      (player.placed
        ? (player.revealed ? discFace(player.placed) : canFlip ? discBack(true, player.index) : discBack(false, player.index))
        : '<span class="sk-empty-mat">لا قرص</span>') +
      "</div>" +
      '<div class="sk-hand">أقراص اليد: ' + ar(player.discs.length) + " · على الساحة: " + ar(player.placed ? 1 : 0) + "</div>" +
      (isFlipper ? '<div class="sk-role">يكشف الآن</div>' : "") +
      "</article>";
  }

  function placePanel() {
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const roses = player.discs.filter((card) => card === "rose").length;
    const skulls = player.discs.filter((card) => card === "skull").length;
    const seen = state.players[viewSeat()] || player;
    const seenCan = can && seen.index === player.index;
    return '<div class="xg-panel sk-action-panel">' +
      '<div class="xg-spread"><h3>ضع قرصًا</h3><span class="xg-chip is-live">الدور: ' + esc(player.name) + "</span></div>" +
      '<p class="xg-note">اختر سرًا: الوردة تمنح أمانًا، والجمجمة تخدع الخصوم. لا تُكشف الأقراص إلا عند التحدي.</p>' +
      '<div class="sk-place-row">' +
      '<button type="button" class="sk-choice is-rose" data-sk-place="rose" ' + (!seenCan || !roses ? "disabled" : "") + '><span>🌹</span><strong>وردة</strong><small>' + ar(roses) + " متاحة</small></button>" +
      '<button type="button" class="sk-choice is-skull" data-sk-place="skull" ' + (!seenCan || !skulls ? "disabled" : "") + '><span>💀</span><strong>جمجمة</strong><small>' + ar(skulls) + " متاحة</small></button>" +
      "</div></div>";
  }

  function bidPanel() {
    const player = cur();
    const can = XG.canAct(apiRef, state, player.index, state.over);
    const bidding = state.bidding;
    const min = bidding.bid + 1;
    const max = bidding.total;
    const blocked = !can || bidding.bid >= max;
    const starterBlocked = bidding.bid === 0 && player.index === state.starter;
    return '<div class="xg-panel sk-action-panel">' +
      '<div class="xg-spread"><h3>المزايدة</h3><span class="xg-chip">أعلى مزايدة: ' + ar(bidding.bid) + " / " + ar(max) + "</span></div>" +
      '<p class="xg-note">على البادئ فتح المزايدة. أعلى مزايدة يفوز ويجب أن يكشف هذا العدد من الأقراص دون جمجمة.</p>' +
      '<div class="sk-bid-controls">' +
      '<label class="sk-bid-field"><span>مزايدتك</span><input type="number" inputmode="numeric" min="' + min + '" max="' + max + '" value="' + Math.min(max, Math.max(min, bidding.bid + 1)) + '" data-sk-input ' + (blocked ? "disabled" : "") + " /></label>" +
      '<button type="button" class="xg-btn primary" data-sk-bid ' + (blocked ? "disabled" : "") + ">زايد</button>" +
      '<button type="button" class="xg-btn" data-sk-pass ' + (!can || starterBlocked || bidding.active.length <= 1 ? "disabled" : "") + ">مرّر</button>" +
      "</div></div>";
  }

  function flipPanel() {
    const flip = state.flip;
    const flipper = state.players[flip.player];
    return '<div class="xg-panel sk-action-panel">' +
      '<div class="xg-spread"><h3>كشف الأقراص</h3><span class="xg-chip is-live">' + ar(flip.count) + " / " + ar(flip.need) + "</span></div>" +
      '<p class="xg-note"><strong>' + esc(flipper.name) + "</strong> يكشف الآن. اختر قرصًا مخفيًا من أحد الخصوم. الجمجمة تُفشل التحدي فورًا.</p>" +
      (flip.ownDone ? "" : '<p class="xg-note">جارٍ كشف قرص صاحب المزايدة…</p>') +
      "</div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const seen = state.players[viewSeat()] || cur();
    rootRef.innerHTML =
      '<div class="xg sk">' +
      XG.bar("سكال", "وردة أو جمجمة · زايد بحكمة · أول جولتين يفوز", [
        XG.chip("الجولة", ar(state.round), "is-live"),
        XG.chip("ورودك", ar(seen.score), "is-good"),
        XG.chip("أقراص اليد", ar(seen.discs.length)),
        XG.chip("الطور", state.phase === "place" ? "وضع" : state.phase === "bid" ? "مزايدة" : state.phase === "flip" ? "كشف" : "نهاية"),
      ].join("")) +
      '<div class="sk-layout"><div class="sk-main">' +
      (state.phase === "place" ? placePanel() : "") +
      (state.phase === "bid" ? bidPanel() : "") +
      (state.phase === "flip" ? flipPanel() : "") +
      '<div class="xg-panel"><div class="xg-spread"><h3>الساحة</h3><span class="xg-chip">' + ar(placedTotal()) + " أقراص موضوعة</span></div>" +
      '<div class="sk-players">' + state.players.map(playerMat).join("") + "</div></div>" +
      '<p class="sk-last">' + esc(state.notice) + "</p>" +
      "</div>" +
      '<aside class="sk-side">' +
      '<div class="xg-panel"><h3>تسلسل الجولة</h3><p class="xg-note">١) كل لاعب يضع قرصًا سرًا. ٢) يبدأ البادئ المزايدة برقم ١ على الأقل. ٣) أعلى مزايدة يكشف قرصه أولًا، ثم يختار أقراص الخصوم حتى يبلغ رقم مزايدته.</p></div>' +
      '<div class="xg-panel"><h3>النجاح والفشل</h3><p class="xg-note">إذا ظهرت وردة في كل الكشوف المطلوبة، يفوز صاحب المزايدة بجولة. إذا ظهرت جمجمة، يخسر قرصًا عشوائيًا من يده.</p></div>' +
      '<div class="xg-panel"><h3>النهاية</h3><p class="xg-note">أول لاعب يكسب جولتين يفوز. من يفقد كل أقراصه يخرج. آخر لاعب يبقى يفوز أيضًا.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const placeBtn = event.target.closest("[data-sk-place]");
    if (placeBtn) { place(placeBtn.dataset.skPlace); return; }
    if (event.target.closest("[data-sk-bid]")) {
      const input = rootRef.querySelector("[data-sk-input]");
      bid(input ? input.value : 0);
      return;
    }
    if (event.target.closest("[data-sk-pass]")) { passBid(); return; }
    const flipBtn = event.target.closest("[data-sk-flip]");
    if (flipBtn) flipCard(Number(flipBtn.dataset.skFlip));
  }

  const game = {
    id: "skull",
    name: "سكال",
    en: "SKULL",
    icon: "💀",
    accent: "#8a7dbb",
    cardClass: "card-skull",
    tagline: "قرص وردة أو جمجمة، ومزايدة جسورة. من يكشف بلا جمجمة يربح الجولة.",
    players: "3–6",
    duration: "15–30 دقيقة",
    complexity: "خفيفة",
    minPlayers: 3,
    maxPlayers: 6,
    defaultPlayers: 4,

    options: {
      hint: "نسخة قريبة من الأصل: ٣ ورود وجمجمة لكل لاعب، ومزايدة متصاعدة حتى آخر لاعب.",
      defaults: {},
      fields: [],
      summary() { return "٤ أقراص لكل لاعب · مزايدة · أول جولتين"; },
    },

    rules: {
      goal: "افز بجولتين. اكشف العدد الذي زايدت عليه من الأقراص دون أن تظهر جمجمة.",
      facts: [["اللاعبون", "٣–٦"], ["الأقراص", "٣ ورود + جمجمة"], ["الفوز", "جولتان"], ["الخطر", "الجمجمة"]],
      components: ["٤ أقراص لكل لاعب: ٣ ورود وجمجمة.", "بساط/ساحة لكل لاعب.", "مؤشرات الجولات."],
      setup: ["يأخذ كل لاعب أقراصه الأربعة ويضع بساطه أمامه.", "يبدأ اللاعب الأصغر سنًا أو من يختاره الجميع.", "في كل جولة يضع كل لاعب قرصًا واحدًا سرًا على بساطه."],
      steps: [
        "<strong>الوضع:</strong> يضع كل لاعب قرصًا واحدًا من يده سرًا، بالترتيب بدءًا من البادئ.",
        "<strong>المزايدة:</strong> يفتح البادئ بمزايدة ١ على الأقل. كل مزايدة أعلى من السابقة، ويمكن التمرير. آخر لاعب لم يمرّ يفوز بالمزايدة.",
        "<strong>الكشف:</strong> صاحب المزايدة يكشف قرصه أولًا. إن كانت وردة، يختار أقراص الخصوم واحدًا تلو الآخر حتى يبلغ عدد مزايدته.",
        "<strong>النجاح:</strong> إن كشف العدد المطلوب من الورود دون جمجمة، يكسب الجولة.",
        "<strong>الفشل:</strong> إن ظهرت جمجمة، يخسر قرصًا عشوائيًا من يده، ويعود الجميع لأقراصهم.",
        "<strong>النهاية:</strong> أول لاعب يكسب جولتين يفوز. من يفقد كل أقراصه يخرج.",
      ],
      winning: "أول لاعب يصل إلى جولتين، أو آخر لاعب يبقى بأقراص.",
      notes: [
        "القرص الموضوع لا يعود لليد إلا بعد انتهاء الجولة.",
        "الجمجمة يمكن أن تكون لك أو لخصم؛ في الحالتين تفشل المزايدة إن ظهرت.",
        "لا يمكن المزايدة بأكثر من عدد الأقراص الموضوعة على الساحة.",
        "الخسارة عند الفشل تكون بقرص عشوائي من يد صاحب المزايدة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت سكال مع " + ar(state.players.length) + " لاعبين. كل لاعب يملك ٣ ورود وجمجمة.", "accent");
      apiRef.setStatus("وضع الأقراص");
      startRound(0);

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          place,
          bid,
          pass: passBid,
          flipCard,
          revealOwn,
          startRound,
          placedTotal,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
            settle();
          },
          aiPlace,
          aiBid,
          aiFlip,
          forcePlace(playerIndex, card) {
            if (!state) return false;
            const old = state.current;
            state.current = playerIndex;
            const ok = place(card);
            if (!state || state.phase !== "place") return ok;
            state.current = old;
            return ok;
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
