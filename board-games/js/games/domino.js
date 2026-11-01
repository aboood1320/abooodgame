/* ==========================================================================
   دومينو — دومينو الستة المزدوجة
   سلسلة أحجار، سوق للسحب، جولات حتى هدف النقاط، وذكاء بثلاثة مستويات.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const NAMES = ["الأحمر", "الأزرق", "الأخضر", "الذهبي"];
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let roundTimer = null;
  let passTimer = null;

  /* ------------------------------ الأحجار ------------------------------ */

  function buildSet() {
    const tiles = [];
    let n = 0;
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        tiles.push({ id: "d" + n++, a, b });
      }
    }
    return tiles;
  }

  const pipsFor = (value) => ({
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value] || []);

  function pips(n) {
    return n + (n === 1 ? " نقطة" : " نقاط");
  }

  function faceHTML(value, extra) {
    const on = new Set(pipsFor(value));
    let cells = "";
    for (let i = 0; i < 9; i++) {
      cells += '<i class="dm-dot' + (on.has(i) ? " is-on" : "") + '"></i>';
    }
    return '<span class="dm-face' + (extra ? " " + extra : "") + '">' + cells + "</span>";
  }

  function tileHTML(tile, opts) {
    const o = opts || {};
    const vertical = o.vertical || tile.a === tile.b;
    const classes = ["dm-tile"];
    if (vertical) classes.push("is-double");
    if (o.interactive) classes.push("is-playable");
    if (o.small) classes.push("is-small");
    if (o.selected) classes.push("is-selected");
    if (o.dim) classes.push("is-dim");
    const tag = o.interactive ? "button" : "span";
    const attrs = o.interactive
      ? ' type="button" data-dm-tile="' + esc(tile.id) + '"'
      : "";
    const pieceAttr = o.piece
      ? ' data-fx-piece="' + esc(o.piece) + '" data-fx-enter="' + (o.enter || "pop") + '"'
      : "";
    const a = o.flip ? tile.b : tile.a;
    const b = o.flip ? tile.a : tile.b;
    return (
      "<" + tag + attrs + ' class="' + classes.join(" ") + '"' + pieceAttr +
      ' aria-label="' + esc(pips(a) + " و" + pips(b)) + '">' +
      faceHTML(a) + faceHTML(b) +
      "</" + tag + ">"
    );
  }

  function handPips(player) {
    return player.hand.reduce((sum, tile) => sum + tile.a + tile.b, 0);
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).slice(0, 4).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      color: NAMES[index],
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      hand: [],
      passed: false,
    }));
  }

  function newState(options) {
    const opts = Object.assign({ handSize: 7, target: 100 }, options || {});
    return {
      handSize: U.clamp(Number(opts.handSize) || 7, 5, 7),
      target: [100, 150, 200].indexOf(Number(opts.target)) >= 0 ? Number(opts.target) : 100,
      players: makePlayers(),
      boneyard: [],
      chain: [],
      ends: [null, null],
      current: 0,
      round: 1,
      passes: 0,
      phase: "play",
      notice: "",
      last: null,
      scores: [],
      roundOver: false,
      over: false,
      winner: null,
      standings: [],
      busy: false,
    };
  }

  function activePlayers() {
    return state.players;
  }

  function cur() {
    return state.players[state.current];
  }

  function localSeat() {
    if (apiRef && apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function viewerSeat() {
    if (isOnline()) return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
    return state ? state.current : -1;
  }

  function viewerPlayer() {
    const index = viewerSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function humanCanAct(player) {
    if (!state || !player || state.over || state.roundOver || state.busy) return false;
    if (state.current !== player.index) return false;
    if (state.phase !== "play") return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    return !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index;
  }

  /* ------------------------------ القانون ------------------------------ */

  function canPlay(tile) {
    if (!tile) return false;
    if (!state.chain.length) return true;
    return tile.a === state.ends[0] || tile.b === state.ends[0] || tile.a === state.ends[1] || tile.b === state.ends[1];
  }

  function legalTiles(player) {
    return (player.hand || []).filter(canPlay);
  }

  function anyMove() {
    return state.players.some((player) => (player.hand || []).some(canPlay));
  }

  function sideFor(tile) {
    if (!state.chain.length) return "first";
    if (tile.a === state.ends[1] || tile.b === state.ends[1]) return "right";
    if (tile.a === state.ends[0] || tile.b === state.ends[0]) return "left";
    return null;
  }

  function place(player, tile, side) {
    const idx = player.hand.findIndex((item) => item.id === tile.id);
    if (idx < 0) return false;
    if (!canPlay(tile)) return false;
    const chosen = side || sideFor(tile);
    player.hand.splice(idx, 1);
    player.passed = false;
    state.passes = 0;

    if (chosen === "first" || !state.chain.length) {
      state.chain.push({ id: tile.id, a: tile.a, b: tile.b });
      state.ends = [tile.a, tile.b];
      state.last = { seat: player.index, tile, side: "first" };
      apiRef.log("<strong>" + esc(player.name) + "</strong> بدأ السلسلة بالحجر " + esc(tile.a + "–" + tile.b) + ".", "accent");
      if (FX) FX.sound("place");
      return finishTurn(player, false);
    }

    if (chosen === "right") {
      const match = tile.a === state.ends[1] ? tile.a : tile.b;
      const other = match === tile.a ? tile.b : tile.a;
      state.chain.push({ id: tile.id, a: match, b: other });
      state.ends[1] = other;
    } else {
      const match = tile.a === state.ends[0] ? tile.a : tile.b;
      const other = match === tile.a ? tile.b : tile.a;
      state.chain.unshift({ id: tile.id, a: other, b: match });
      state.ends[0] = other;
    }
    state.last = { seat: player.index, tile, side: chosen };
    const pipsGain = tile.a + tile.b;
    apiRef.log(
      "<strong>" + esc(player.name) + "</strong> لعب " + esc(tile.a + "–" + tile.b) +
      " على " + (chosen === "right" ? "الطرف الأيمن" : "الطرف الأيسر") + " (+" + ar(pipsGain) + ").",
      "accent"
    );
    if (FX) FX.sound("place");
    return finishTurn(player, false);
  }

  function finishTurn(player, extra) {
    if (player.hand.length === 0) {
      endRound(player);
      return true;
    }
    if (!anyMove() && state.boneyard.length === 0) {
      const allStuck = state.players.every((item) => !legalTiles(item).length);
      if (allStuck) {
        endRound(null);
        return true;
      }
    }
    if (extra) {
      state.phase = "play";
      render();
      settle();
      return true;
    }
    advance();
    return true;
  }

  function advance() {
    state.current = (state.current + 1) % state.players.length;
    state.phase = "play";
    state.busy = false;
    render();
    settle();
  }

  function settle() {
    if (!state || state.over || state.roundOver) return;
    const player = cur();
    if (!player) return;
    if (!legalTiles(player).length) {
      handleStuck(player);
      return;
    }
    updateStatus();
    if (player.isCpu && cpuCanAct(player)) scheduleAuto(player);
  }

  function handleStuck(player) {
    if (!state || state.over) return;
    if (state.boneyard.length) {
      state.busy = true;
      state.notice = player.name + " لا يملك حجرًا مطابقًا — يسحب من السوق…";
      render();
      clearTimeout(passTimer);
      passTimer = setTimeout(() => {
        if (!state || state.over) return;
        const tile = state.boneyard.pop();
        player.hand.push(tile);
        state.busy = false;
        if (apiRef) {
          apiRef.log(
            "<strong>" + esc(player.name) + "</strong> سحب حجرًا من السوق" +
            (canPlay(tile) ? " ويمكنه لعبه." : " ولا يطابق أطراف السلسلة."),
            canPlay(tile) ? "good" : "warn"
          );
        }
        if (FX) FX.sound("flip");
        state.notice = canPlay(tile)
          ? "سحب " + player.name + " الحجر " + tile.a + "–" + tile.b + " ويمكنه لعبه."
          : "سحب " + player.name + " حجرًا غير مطابق، وسيتخطى دوره.";
        if (canPlay(tile)) {
          render();
          if (player.isCpu && cpuCanAct(player)) scheduleAuto(player);
          else updateStatus();
          return;
        }
        passTurn(player, true);
      }, 620);
      return;
    }
    passTurn(player, false);
  }

  function passTurn(player, afterDraw) {
    player.passed = true;
    state.passes += 1;
    if (apiRef) {
      apiRef.log("<strong>" + esc(player.name) + "</strong> مرّر دوره" + (afterDraw ? " بعد السحب" : " — لا حجر مطابق."), "warn");
    }
    if (FX) FX.sound("error");
    state.notice = player.name + " مرّر الدور.";
    if (state.passes >= state.players.length && !state.boneyard.length) {
      endRound(null);
      return;
    }
    render();
    clearTimeout(passTimer);
    passTimer = setTimeout(() => {
      if (!state || state.over) return;
      advance();
    }, afterDraw ? 420 : 640);
  }

  function endRound(winner) {
    if (!state || state.roundOver) return;
    state.roundOver = true;
    state.phase = "roundEnd";
    state.busy = true;
    clearTimeout(passTimer);
    if (aiRunner) aiRunner.clear();

    const pipsMap = state.players.map((player) => handPips(player));
    if (!winner) {
      const min = Math.min.apply(null, pipsMap);
      const lows = state.players.filter((player, i) => pipsMap[i] === min);
      if (lows.length === 1) winner = lows[0];
    }
    if (winner) {
      const gain = state.players.reduce((sum, player) => (player === winner ? sum : sum + handPips(player)), 0);
      state.scores[winner.index] = (state.scores[winner.index] || 0) + gain;
      if (apiRef) {
        apiRef.log(
          "انتهت الجولة — <strong>" + esc(winner.name) + "</strong> يفوز ويجمع " + ar(gain) + " نقطة من أحجار الخصوم.",
          "good"
        );
      }
      if (FX) FX.win();
    } else if (apiRef) {
      apiRef.log("انتهت الجولة بالتعادل — لا نقاط لأحد.", "warn");
    }

    const reached = state.players.filter((player) => (state.scores[player.index] || 0) >= state.target);
    if (reached.length) {
      const champion = reached.reduce((best, player) =>
        (state.scores[player.index] || 0) > (state.scores[best.index] || 0) ? player : best, reached[0]);
      finishGame(champion);
      return;
    }
    state.notice = winner
      ? "فاز " + winner.name + " بالجولة. الجولة التالية بعد لحظات…"
      : "تعادل في الجولة. الجولة التالية بعد لحظات…";
    state.standings = state.players.slice().sort((a, b) => (state.scores[b.index] || 0) - (state.scores[a.index] || 0))
      .map((player) => ({ name: player.name, value: ar(state.scores[player.index] || 0) + " نقطة" }));
    render();
    clearTimeout(roundTimer);
    roundTimer = setTimeout(() => {
      if (!state || state.over) return;
      state.round += 1;
      deal();
    }, 2400);
  }

  function finishGame(winner) {
    state.over = true;
    state.winner = winner;
    state.standings = state.players.slice()
      .sort((a, b) => (state.scores[b.index] || 0) - (state.scores[a.index] || 0))
      .map((player) => ({
        name: player.name + (player === winner ? " · فائز" : ""),
        value: ar(state.scores[player.index] || 0) + " نقطة",
      }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🁣",
        title: "فاز " + winner.name + "!",
        text: "بلغ <strong>" + ar(state.scores[winner.index] || 0) + "</strong> نقطة قبل الجميع في الدومينو.",
        winner: winner.name,
        standings: state.standings,
        tone: "win",
      });
    }
    render();
  }

  function deal() {
    const set = U.shuffle(buildSet());
    state.boneyard = set;
    state.chain = [];
    state.ends = [null, null];
    state.players.forEach((player) => {
      player.hand = [];
      player.passed = false;
    });
    state.scores = state.scores.length ? state.scores : state.players.map(() => 0);
    state.passes = 0;
    state.phase = "play";
    state.roundOver = false;
    state.busy = false;
    state.last = null;
    for (let r = 0; r < state.handSize; r++) {
      state.players.forEach((player) => {
        if (state.boneyard.length) player.hand.push(state.boneyard.pop());
      });
    }

    let starter = 0;
    let best = -1;
    state.players.forEach((player) => {
      player.hand.forEach((tile) => {
        if (tile.a === tile.b && tile.a > best) { best = tile.a; starter = player.index; }
      });
    });
    if (best < 0) {
      state.players.forEach((player) => {
        player.hand.forEach((tile) => {
          if (tile.a + tile.b > best) { best = tile.a + tile.b; starter = player.index; }
        });
      });
    }
    state.current = starter;
    state.notice = "دور " + state.players[starter].name + " — ابدأ بالسلسلة أو طابق أحد الطرفين.";
    if (apiRef) {
      apiRef.log(
        "بدأت جولة دومينو " + ar(state.round) + " — " + ar(state.handSize) + " أحجار لكل لاعب و" +
        ar(state.boneyard.length) + " في السوق. يبدأ " + esc(state.players[starter].name) + ".",
        "accent"
      );
      apiRef.log("الهدف: " + ar(state.target) + " نقطة.", "accent");
      if (FX) FX.sound("shuffle");
    }
    render();
    settle();
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function scheduleAuto(player) {
    if (!aiRunner) return;
    clearTimeout(passTimer);
    const delay = AI.delay(player.level);
    aiRunner.later(() => {
      if (!state || state.over || state.roundOver || state.current !== player.index) return;
      cpuTurn(player);
    }, delay);
  }

  function cpuTurn(player) {
    if (!state || state.current !== player.index) return;
    const tiles = legalTiles(player);
    if (!tiles.length) {
      handleStuck(player);
      return;
    }
    const pick = AI.choose(
      tiles,
      (tile) => {
        let score = tile.a + tile.b;
        if (tile.a === tile.b) score += 6;
        if (!state.chain.length) score += 10;
        if (tile.a === 6 || tile.b === 6) score += 3;
        return score;
      },
      player.level
    );
    state.busy = false;
    place(player, pick || tiles[0]);
  }

  function updateStatus() {
    if (!apiRef || !state || state.over) return;
    const player = cur();
    if (player) apiRef.setStatus("دور " + player.name, "live");
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["dm-player", "p" + (player.index % 4)];
      if (player.index === state.current && !state.roundOver && !state.over) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      if (isOnline() && player.index === localSeat()) classes.push("mine");
      return (
        '<div class="' + classes.join(" ") + '">' +
        '<span class="dm-dot-color"></span>' +
        '<span class="dm-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + ar(player.hand.length) + " أحجار · " + ar(handPips(player)) + " نقطة" +
        (player.isCpu ? " · 🤖" : "") + "</small></span>" +
        '<span class="dm-score">' + ar(state.scores[player.index] || 0) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function chainHTML() {
    if (!state.chain.length) {
      return '<div class="dm-chain-empty">' +
        '<span>السلسلة فارغة</span><small>العب أي حجر لبدء السلسلة. بعدها طابق أحد الطرفين.</small></div>';
    }
    return state.chain.map((tile, index) => {
      const first = index === 0;
      const last = index === state.chain.length - 1;
      return '<span class="dm-link' + (first ? " is-left" : "") + (last ? " is-right" : "") + '">' +
        tileHTML({ id: tile.id, a: tile.a, b: tile.b }, { piece: "dm-chain-" + tile.id, enter: "drop" }) + "</span>";
    }).join("");
  }

  function handHTML() {
    const player = viewerPlayer();
    if (!player) {
      return '<section class="dm-hand-area"><div class="dm-hand-head"><span class="cg-kicker">👁 مشاهدة</span>' +
        '<span class="cg-count">أحجار اللاعبين مخفية</span></div>' +
        '<div class="dm-hand"><span class="dm-empty">تتابع السلسلة مباشرة — لا تُعرض أحجار الآخرين.</span></div></section>';
    }
    const mine = humanCanAct(player);
    const legal = new Set(legalTiles(player).map((tile) => tile.id));
    const hand = player.hand.length
      ? player.hand.map((tile) => tileHTML(tile, {
          piece: "dm-hand-" + tile.id,
          enter: "deal",
          interactive: mine && legal.has(tile.id),
          dim: mine && !legal.has(tile.id),
          selected: state.last && state.last.tile && state.last.tile.id === tile.id && state.last.seat === player.index,
        })).join("")
      : '<span class="dm-empty">لا أحجار في اليد.</span>';
    return (
      '<section class="dm-hand-area">' +
      '<div class="dm-hand-head"><span class="cg-kicker">يد ' + esc(player.name) + "</span>" +
      '<span class="cg-count">' + ar(player.hand.length) + " حجر · " + ar(handPips(player)) + " نقطة</span></div>" +
      '<div class="dm-hand' + (mine ? " is-live" : "") + '">' + hand + "</div>" +
      (mine
        ? '<p class="dm-hint">' + (state.chain.length
            ? "الأحجار المتوهجة تُطابق أحد الطرفين. اضغط حجرًا للعبها."
            : "اضغط أي حجر لبدء السلسلة.") + "</p>"
        : '<p class="dm-hint">' + (state.current === player.index
            ? "بانتظار " + esc(player.name) + (player.isCpu ? " (كمبيوتر)…" : "…")
            : "يدك محفوظة — ستُفتح عند دورك. تشاهد دور " + esc(state.players[state.current].name) + " الآن.") + "</p>") +
      "</section>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const mine = humanCanAct(player);
    const top =
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">🁣</span><div><strong>دومينو</strong>' +
      "<small>طابق أطراف السلسلة وتخلّص من أحجارك قبل الجميع — حتى " + ar(state.target) + " نقطة</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">جولة <b>' + ar(state.round) + "</b></span>" +
      '<span class="cg-pill">السوق <b>' + ar(state.boneyard.length) + "</b></span>" +
      '<span class="cg-pill">الطرفان <b>' + (state.ends[0] == null ? "—" : ar(state.ends[0]) + " / " + ar(state.ends[1])) + "</b></span>" +
      (isOnline() ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="dm-board">' +
      '<div class="dm-board-head"><span class="cg-kicker">سلسلة الطاولة</span>' +
      '<span class="cg-count">' + ar(state.chain.length) + " حجر</span></div>" +
      '<div class="dm-chain-wrap"><div class="dm-chain">' + chainHTML() + "</div></div>" +
      '<div class="dm-ends">' +
      '<span class="dm-end is-left">الطرف الأيسر <b>' + (state.ends[0] == null ? "—" : ar(state.ends[0])) + "</b></span>" +
      '<span class="dm-end is-right">الطرف الأيمن <b>' + (state.ends[1] == null ? "—" : ar(state.ends[1])) + "</b></span>" +
      "</div>" +
      '<p class="dm-rule-line">إذا لم يطابق أي حجر، يُسحب من السوق تلقائيًا. إن لم يوجد مطابق يُمرَّر الدور.</p>' +
      "</section>";

    const side =
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span></div>' +
      '<div class="dm-players">' + playersHTML() + "</div></div>" +
      '<div class="dm-notice">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel dm-last"><span class="cg-kicker">آخر حركة</span>' +
      (state.last
        ? "<strong>" + esc(state.last.tile.a + "–" + state.last.tile.b) + "</strong><small>" + esc(state.players[state.last.seat].name) + "</small>"
        : "<small>لم تُلعب أحجار بعد.</small>") +
      "</div>" +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game dm-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div>" +
      '<div class="dm-foot">' + handHTML() + "</div></div>";

    if (FX) FX.screenEnter(rootRef.firstElementChild);
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function onClick(event) {
    if (!state || state.over || state.roundOver) return;
    const tileNode = event.target.closest ? event.target.closest("[data-dm-tile]") : null;
    if (!tileNode) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const tile = player.hand.find((item) => item.id === tileNode.getAttribute("data-dm-tile"));
    if (!tile) return;
    if (!canPlay(tile)) {
      if (FX) FX.sound("error");
      return;
    }
    place(player, tile);
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const OPTIONS = { handSize: 7, target: 100 };

  const game = {
    id: "domino",
    name: "دومينو",
    en: "DOMINOES",
    icon: "🁣",
    accent: "#7fb6e8",
    cardClass: "card-domino",
    tagline: "سلسلة من الأحجار المزدوجة: طابق الأطراف، اسحب من السوق، وأفرغ يدك قبل خصومك.",
    players: "2–4",
    duration: "15–30 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "اختر عدد أحجار اليد وهدف النقاط. تُطبَّق الخيارات نفسها في الغرفة الجماعية.",
      defaults: OPTIONS,
      fields: [
        {
          key: "handSize", label: "أحجار اليد", type: "seg",
          choices: [{ value: 5, label: "٥" }, { value: 6, label: "٦" }, { value: 7, label: "٧" }],
        },
        {
          key: "target", label: "هدف النقاط", type: "seg",
          choices: [{ value: 100, label: "١٠٠" }, { value: 150, label: "١٥٠" }, { value: 200, label: "٢٠٠" }],
        },
      ],
      summary(options) {
        return "دومينو الستة المزدوجة · " + ar(options.handSize) + " أحجار لكل لاعب · حتى " + ar(options.target) + " نقطة";
      },
    },

    rules: {
      goal: "تخلّص من أحجارك قبل الجميع، واجمع نقاط أحجار الخصوم المتبقية. أول لاعب يبلغ هدف النقاط المختار يفوز باللعبة.",
      facts: [["الأحجار", "٢٨ حجرًا (٠–٦)"], ["اليد", "٥–٧ أحجار"], ["اللاعبون", "٢–٤"], ["الهدف", "١٠٠ / ١٥٠ / ٢٠٠"]],
      components: [
        "٢٨ حجرًا مزدوجًا من ستة: كل حجر يحمل رقمين من ٠ إلى ٦، ويشمل ذلك الأحجار المزدوجة مثل ٦–٦.",
        "كومة السوق التي تُسحب منها الأحجار عند عدم وجود مطابق.",
        "سلسلة مكشوفة على الطاولة يلعب عليها الجميع.",
      ],
      setup: [
        "تُخلط الأحجار وتُوزّع ٧ أحجار لكل لاعب في لعبة لاعبين، أو ٥ في لعبة ثلاثة أو أربعة (قابل للتعديل).",
        "تُترك بقية الأحجار في السوق مقلوبة.",
        "يبدأ صاحب أكبر حجر مزدوج في يده، وإن لم يوجد يبدأ صاحب أعلى مجموع نقاط في حجر واحد.",
      ],
      steps: [
        "<strong>البدء:</strong> أول حجر يُلعب يبدأ السلسلة، ويصبح طرفاه هما الرقمان الظاهران.",
        "<strong>المطابقة:</strong> في دورك العب حجرًا يحمل رقمًا يطابق أحد طرفي السلسلة، ويُوضع بحيث يلامس الطرف المطابق.",
        "<strong>السحب:</strong> إذا لم تملك حجرًا مطابقًا، اسحب حجرًا من السوق. إن كان مطابقًا يمكنك لعبه، وإلا مرّر الدور.",
        "<strong>التمرير:</strong> إذا كان السوق فارغًا ولا تملك حجرًا مطابقًا، مرّر الدور.",
        "<strong>نهاية الجولة:</strong> تنتهي الجولة عندما يفرغ أحد اللاعبين يده، أو عندما يتوقف الجميع عن اللعب والسوق فارغ.",
      ],
      winning: "من يفرغ يده أولًا يجمع مجموع نقاط أحجار جميع الخصوم المتبقية. إذا توقفت الجولة، يفوز صاحب أقل مجموع نقاط في يده ويجمع نقاط الآخرين. تُلعب جولات حتى يبلغ أحد اللاعبين هدف النقاط.",
      notes: [
        "الحجر المزدوج يُقرأ برقمين متساويين، ويمكن لعبه على أي طرف يحمل الرقم نفسه.",
        "لا يوجد اتجاه إجباري للسلسلة؛ يمكن اللعب على الطرفين الأيمن والأيسر.",
        "السوق يُسحب منه تلقائيًا في النسخة الرقمية عند الحاجة.",
        "يد اللاعب الحالي فقط ظاهرة؛ تُعرض أيدي الخصوم كأعداد.",
        "الأحجار مرسومة بالكامل بـ CSS، بلا أصول خارجية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(roundTimer);
      clearTimeout(passTimer);
      state = newState(api.options || {});
      state.scores = state.players.map(() => 0);
      apiRef.log("بدأت لعبة الدومينو مع " + ar(state.players.length) + " لاعبين.", "accent");
      deal();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render,
          place,
          deal,
          canPlay,
          legalTiles,
          sideFor,
          handPips,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            render();
          },
          give(index, values) {
            if (!state || !state.players[index]) return;
            const tiles = (values || []).map((pair, i) => ({ id: "x" + index + "_" + i + "_" + Date.now(), a: pair[0], b: pair[1] }));
            state.players[index].hand = tiles;
            render();
          },
          setChain(values) {
            if (!state) return;
            state.chain = (values || []).map((pair, i) => ({ id: "ch" + i, a: pair[0], b: pair[1] }));
            state.ends = state.chain.length ? [state.chain[0].a, state.chain[state.chain.length - 1].b] : [null, null];
            render();
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          if (aiRunner) aiRunner.clear();
          clearTimeout(roundTimer);
          clearTimeout(passTimer);
          state = BG.netCodec.decode(data);
          state.players.forEach((player) => { player.hand = Array.isArray(player.hand) ? player.hand : []; });
          state.boneyard = Array.isArray(state.boneyard) ? state.boneyard : [];
          state.chain = Array.isArray(state.chain) ? state.chain : [];
          state.scores = Array.isArray(state.scores) ? state.scores : state.players.map(() => 0);
          state.busy = false;
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          render();
          if (!state.over) settle();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(roundTimer);
          clearTimeout(passTimer);
          roundTimer = null;
          passTimer = null;
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
