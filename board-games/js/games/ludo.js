/* ==========================================================================
   لودو — سباق البيوت الأربعة
   مسار من ٥٢ خانة، أربع قطع لكل لاعب، نرد، أسر، وخانات آمنة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = [
    { key: "red", name: "الأحمر", css: "#e2655d", deep: "#8e2f2f" },
    { key: "blue", name: "الأزرق", css: "#5c8fd6", deep: "#28457c" },
    { key: "green", name: "الأخضر", css: "#5cb07c", deep: "#23603f" },
    { key: "gold", name: "الذهبي", css: "#d9a94e", deep: "#7f5a13" },
  ];
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let moveTimer = null;
  let autoTimer = null;

  /* ------------------------------ المسار ------------------------------ */

  function buildPath() {
    const cells = [];
    const push = (r, c) => cells.push([r, c]);
    const down = (r1, r2, c) => { for (let r = r1; r <= r2; r++) push(r, c); };
    const up = (r1, r2, c) => { for (let r = r1; r >= r2; r--) push(r, c); };
    const right = (c1, c2, r) => { for (let c = c1; c <= c2; c++) push(r, c); };
    const left = (c1, c2, r) => { for (let c = c1; c >= c2; c--) push(r, c); };

    right(1, 5, 6);        // 0-4
    up(5, 0, 6);           // 5-10
    right(7, 8, 0);        // 11-12
    down(1, 5, 8);         // 13-17
    right(9, 13, 6);       // 18-22
    down(6, 8, 14);        // 23-25
    left(13, 9, 8);        // 26-30
    down(9, 13, 8);        // 31-35
    left(8, 6, 14);        // 36-38
    up(13, 9, 6);          // 39-43
    left(5, 1, 8);         // 44-48
    up(8, 6, 0);           // 49-51
    return cells;
  }

  const PATH = buildPath();
  const START = [0, 13, 26, 39];
  const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const LANES = [
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  ];
  const BASES = [
    [[1, 1], [1, 4], [4, 1], [4, 4]],
    [[1, 10], [1, 13], [4, 10], [4, 13]],
    [[10, 10], [10, 13], [13, 10], [13, 13]],
    [[10, 1], [10, 4], [13, 1], [13, 4]],
  ];
  const CENTER = [7, 7];
  const FINISH = 56;

  function cellOf(playerIndex, pos) {
    if (pos < 0) return BASES[playerIndex][pos === -1 ? 0 : 0];
    if (pos <= 50) return PATH[(START[playerIndex] + pos) % 52];
    if (pos < FINISH) return LANES[playerIndex][pos - 51];
    return CENTER;
  }

  function slotOf(playerIndex, tokenIndex, pos) {
    if (pos >= 0) return cellOf(playerIndex, pos);
    return BASES[playerIndex][tokenIndex];
  }

  function absCell(playerIndex, pos) {
    if (pos < 0 || pos > 50) return null;
    return (START[playerIndex] + pos) % 52;
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).slice(0, 4).map((player, index) => ({
      index,
      name: player.name || "اللاعب " + (index + 1),
      color: COLORS[index],
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      tokens: [0, 1, 2, 3].map((i) => ({ id: "t" + index + "_" + i, index: i, pos: -1 })),
    }));
  }

  function newState() {
    return {
      players: makePlayers(),
      current: 0,
      dice: null,
      phase: "roll",
      round: 1,
      extra: false,
      notice: "ارمِ النرد. تحتاج ٦ لإخراج قطعة من القاعدة.",
      last: null,
      over: false,
      winner: null,
      standings: [],
      busy: false,
      captured: 0,
      rolls: 0,
    };
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

  function humanCanAct(player) {
    if (!state || !player || state.over || state.busy) return false;
    if (state.current !== player.index) return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    return !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index;
  }

  function homeCount(player) {
    return player.tokens.filter((token) => token.pos >= FINISH).length;
  }

  function finished(player) {
    return homeCount(player) === 4;
  }

  /* ------------------------------ القانون ------------------------------ */

  function legalMoves(player) {
    if (!state || state.over) return [];
    const dice = state.dice;
    if (!dice) return [];
    const moves = [];
    player.tokens.forEach((token) => {
      if (token.pos >= FINISH) return;
      if (token.pos < 0) {
        if (dice === 6) moves.push({ token, target: 0, from: -1, exit: true });
        return;
      }
      const target = token.pos + dice;
      if (target <= FINISH) moves.push({ token, target, from: token.pos, exit: false });
    });
    return moves;
  }

  function rollDie() {
    if (!state || state.over || state.busy || state.phase !== "roll") return null;
    const value = 1 + Math.floor(Math.random() * 6);
    state.dice = value;
    state.rolls += 1;
    const player = cur();
    state.phase = "wait";
    state.notice = player.name + " رمى " + ar(value) + "…";
    if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> رمى النرد: <strong>" + ar(value) + "</strong>.", "accent");
    if (FX) FX.dice(value);
    renderMotion();

    const moves = legalMoves(player);
    if (!moves.length) {
      state.notice = player.name + " رمى " + ar(value) + " ولا يملك حركة ممكنة.";
      if (apiRef) apiRef.log("لا توجد حركة ممكنة — يُمرَّر الدور.", "warn");
      renderMotion();
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => endTurn(false), 850);
      return value;
    }
    state.phase = "move";
    renderMotion();
    if (moves.length === 1) {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => performMove(moves[0].token), 520);
    } else if (player.isCpu && cpuCanAct(player)) {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => cpuChoose(player, moves), AI.delay(player.level));
    } else {
      updateStatus();
    }
    return value;
  }

  function performMove(token, done) {
    if (!state || state.over) return false;
    const player = cur();
    const move = legalMoves(player).find((item) => item.token.id === token.id);
    if (!move) return false;
    state.busy = true;
    state.phase = "move";
    clearTimeout(autoTimer);

    const steps = move.exit ? 1 : move.target - move.from;
    let step = 0;
    const tick = () => {
      if (!state || state.over) return;
      if (step < steps) {
        step += 1;
        token.pos = move.exit ? 0 : move.from + step;
        if (FX) FX.sound("step");
        renderMotion();
        moveTimer = setTimeout(tick, 120);
        return;
      }
      finishMove(player, token, move);
      if (done) done();
    };
    if (move.exit) {
      token.pos = 0;
      if (FX) FX.sound("step");
      renderMotion();
      moveTimer = setTimeout(() => {
        finishMove(player, token, move);
        if (done) done();
      }, 150);
    } else {
      tick();
    }
    return true;
  }

  function finishMove(player, token, move) {
    if (!state || state.over) return;
    state.phase = "wait";
    let captured = false;
    if (token.pos <= 50) {
      const cell = absCell(player.index, token.pos);
      state.players.forEach((other) => {
        if (other === player) return;
        other.tokens.forEach((enemy) => {
          if (enemy.pos < 0 || enemy.pos > 50) return;
          if (absCell(other.index, enemy.pos) !== cell) return;
          if (SAFE.has(cell)) return;
          enemy.pos = -1;
          captured = true;
          state.captured += 1;
          if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> أسر قطعة " + esc(other.name) + " وأعادها إلى قاعدتها!", "good");
          if (FX) { FX.sound("capture"); FX.banner("أسر!", { icon: "⚔️", tone: "win", duration: 900 }); }
          shakeBoard();
        });
      });
    }

    if (token.pos >= FINISH) {
      if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> أوصل قطعة إلى البيت (" + ar(homeCount(player)) + "/٤).", "good");
      if (FX) FX.sound("promote");
    }

    state.last = { seat: player.index, token: token.id, from: move.from, to: token.pos, captured };
    state.notice = player.name + " نقل قطعة" + (captured ? " وأسر خصمًا!" : token.pos >= FINISH ? " إلى البيت!" : ".");

    if (finished(player)) {
      state.busy = false;
      win(player);
      return;
    }

    const extra = state.dice === 6 || captured || token.pos >= FINISH;
    state.busy = false;
    renderMotion();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => endTurn(extra), 450);
  }

  function endTurn(extra) {
    if (!state || state.over) return;
    const player = cur();
    state.phase = "roll";
    state.dice = null;
    if (extra && !finished(player)) {
      state.notice = "دور إضافي لـ" + player.name + " بعد ٦ أو أسر أو وصول للبيت.";
      if (apiRef) apiRef.log("دور إضافي لـ<strong>" + esc(player.name) + "</strong>.", "accent");
      renderMotion();
      settle();
      return;
    }
    let guard = 0;
    do {
      state.current = (state.current + 1) % state.players.length;
      guard += 1;
    } while (finished(state.players[state.current]) && guard < 8);
    state.notice = "دور " + cur().name + " — ارمِ النرد.";
    renderMotion();
    settle();
  }

  function settle() {
    if (!state || state.over) return;
    const player = cur();
    if (!player) return;
    updateStatus();
    if (player.isCpu && cpuCanAct(player) && state.phase === "roll") {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        if (!state || state.over || state.current !== player.index || state.phase !== "roll") return;
        rollDie();
      }, AI.delay(player.level));
    }
  }

  function cpuChoose(player, moves) {
    if (!state || state.over || state.current !== player.index) return;
    const pick = AI.choose(
      moves,
      (move) => {
        let score = 0;
        if (move.exit) score += 34;
        if (move.target >= FINISH) score += 80;
        else if (move.target > 50) score += 30 + move.target;
        const targetCell = move.target <= 50 ? absCell(player.index, move.target) : null;
        if (targetCell != null) {
          if (SAFE.has(targetCell)) score += 12;
          state.players.forEach((other) => {
            if (other === player) return;
            other.tokens.forEach((enemy) => {
              if (enemy.pos < 0 || enemy.pos > 50) return;
              const enemyCell = absCell(other.index, enemy.pos);
              if (enemyCell === targetCell && !SAFE.has(targetCell)) score += 55;
              if (enemyCell != null && targetCell != null) {
                const gap = (targetCell - enemyCell + 52) % 52;
                if (gap >= 1 && gap <= 6) score -= 8;
              }
            });
          });
        }
        score += move.target * 0.12;
        return score;
      },
      player.level
    );
    performMove((pick || moves[0]).token);
  }

  function win(player) {
    if (!state || state.over) return;
    state.over = true;
    state.winner = player;
    state.phase = "end";
    state.busy = false;
    state.standings = state.players.slice()
      .sort((a, b) => homeCount(b) - homeCount(a) || bestPos(b) - bestPos(a))
      .map((item) => ({
        name: item.name + (item === player ? " · فائز" : ""),
        value: ar(homeCount(item)) + "/٤ في البيت",
      }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🎲",
        title: "فاز " + player.name + "!",
        text: "أوصل قطعَه الأربع إلى البيت أولًا بعد " + ar(state.rolls) + " رمية نرد.",
        winner: player.name,
        standings: state.standings,
        tone: "win",
      });
    }
    renderMotion();
  }

  function bestPos(player) {
    return Math.max.apply(null, player.tokens.map((token) => token.pos));
  }

  function updateStatus() {
    if (!apiRef || !state || state.over) return;
    const player = cur();
    if (player) apiRef.setStatus("دور " + player.name, "live");
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function dieHTML(value) {
    const dots = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    }[value] || [];
    const on = new Set(dots);
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="ld-pip' + (on.has(i) ? " is-on" : "") + '"></i>';
    return '<span class="ld-die' + (value ? " has-value" : "") + '">' + cells + "</span>";
  }

  function boardHTML() {
    let cells = "";
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const idx = PATH.findIndex((cell) => cell[0] === r && cell[1] === c);
        const classes = ["ld-cell"];
        let style = "";
        if (idx >= 0) {
          classes.push("is-track");
          const owner = START.indexOf(idx);
          if (owner >= 0) {
            classes.push("is-start", "p" + owner);
            style = ' style="--pc:' + COLORS[owner].css + '"';
          } else if (SAFE.has(idx)) {
            classes.push("is-safe");
          }
        }
        cells += '<span class="' + classes.join(" ") + '" data-r="' + r + '" data-c="' + c + '"' + style + "></span>";
      }
    }

    const bases = COLORS.map((color, index) => {
      const slots = BASES[index].map((slot, i) =>
        '<span class="ld-slot" data-ld-slot="' + index + "-" + i + '"></span>'
      ).join("");
      const turn = state.players[index] && index === state.current && !state.over ? " is-turn" : "";
      return '<span class="ld-base p' + index + turn + '" style="--pc:' + color.css + '">' + slots + "</span>";
    }).join("");

    const lanes = LANES.map((lane, index) => lane.map((cell) =>
      '<span class="ld-cell is-lane p' + index + '" style="grid-row:' + (cell[0] + 1) + ";grid-column:" + (cell[1] + 1) + ';--pc:' + COLORS[index].css + '"></span>'
    ).join("")).join("");

    const center =
      '<span class="ld-center" aria-hidden="true"><svg viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="49" fill="#f7f1e3"/>' +
      '<path d="M1 1 L50 50 L1 99 Z" fill="' + COLORS[0].css + '" stroke="#fff" stroke-opacity=".38" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M1 1 L99 1 L50 50 Z" fill="' + COLORS[1].css + '" stroke="#fff" stroke-opacity=".38" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M99 1 L99 99 L50 50 Z" fill="' + COLORS[2].css + '" stroke="#fff" stroke-opacity=".38" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M1 99 L50 50 L99 99 Z" fill="' + COLORS[3].css + '" stroke="#fff" stroke-opacity=".38" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="50" r="11" fill="#fbf6e8" stroke="#b48a3e" stroke-width="2"/>' +
      '<path d="M50 42.4 l2.3 4.7 5.2.7 -3.8 3.7 1 5.1 -4.7-2.6 -4.7 2.6 1-5.1 -3.8-3.7 5.2-.7z" fill="#b48a3e"/>' +
      "</svg></span>";
    return '<div class="ld-board">' + bases + cells + lanes + center +
      '<div class="ld-tokens">' + tokensHTML() + "</div></div>";
  }

  // مراكز دوائر القواعد المرسومة (نسبة من عرض اللوحة)، لتجلس القطع داخلها تمامًا.
  const BASE_NEAR = [14.69, 25.71];
  const BASE_FAR = [74.29, 85.31];

  function baseSlotXY(playerIndex, tokenIndex) {
    const right = playerIndex === 1 || playerIndex === 2;
    const bottom = playerIndex === 2 || playerIndex === 3;
    const xs = right ? BASE_FAR : BASE_NEAR;
    const ys = bottom ? BASE_FAR : BASE_NEAR;
    return [xs[tokenIndex % 2], ys[tokenIndex >> 1]];
  }

  const PAWN_SVG =
    '<svg class="ld-pawn" viewBox="0 0 24 28" aria-hidden="true" focusable="false">' +
    '<ellipse class="pw-shadow" cx="12" cy="25" rx="8.4" ry="2.4"/>' +
    '<path class="pw-foot" d="M5.6 24.2c0-2.3 2.8-3.6 6.4-3.6s6.4 1.3 6.4 3.6c0 .9-2.9 1.6-6.4 1.6s-6.4-.7-6.4-1.6z"/>' +
    '<path class="pw-body" d="M8.4 21c1.5-3 2.3-5.4 2.5-8.6h2.2c.2 3.2 1 5.6 2.5 8.6c-1.4.9-2.9 1.2-3.6 1.2S9.8 21.9 8.4 21z"/>' +
    '<ellipse class="pw-collar" cx="12" cy="12.6" rx="4.4" ry="1.5"/>' +
    '<circle class="pw-head" cx="12" cy="8.2" r="4.7"/>' +
    '<ellipse class="pw-shine" cx="10.3" cy="6.3" rx="1.7" ry="1.2"/>' +
    "</svg>";

  function tokensHTML() {
    const groups = new Map();
    const items = [];
    const active = cur();
    const canMove = state.phase === "move" && humanCanAct(active);
    const movable = canMove
      ? new Set(legalMoves(active).map((move) => move.token.id))
      : null;
    state.players.forEach((player) => {
      player.tokens.forEach((token) => {
        const slot = slotOf(player.index, token.index, token.pos);
        const key = slot[0] + ":" + slot[1];
        const list = groups.get(key) || [];
        list.push({ player, token, slot });
        groups.set(key, list);
      });
    });
    groups.forEach((list) => {
      list.forEach((item, i) => {
        const shift = (i - (list.length - 1) / 2) * 3.4;
        let left = ((item.slot[1] + 0.5) / 15) * 100 + shift * 0.7;
        let top = ((item.slot[0] + 0.5) / 15) * 100 + shift * 0.7;
        const inBase = item.token.pos < 0;
        if (inBase) {
          const xy = baseSlotXY(item.player.index, item.token.index);
          left = xy[0];
          top = xy[1];
        }
        const mine = isOnline() && item.player.index === localSeat();
        const canPlay = !!(movable && movable.has(item.token.id));
        items.push(
          '<button type="button" class="ld-token p' + item.player.index + (mine ? " is-mine" : "") + (canPlay ? " is-movable" : "") +
          (state.last && state.last.token === item.token.id ? " is-last" : "") + (item.token.pos >= FINISH ? " is-home" : "") + (inBase ? " is-base" : "") + '"' +
          ' data-ld-token="' + item.token.id + '" data-player="' + item.player.index + '"' +
          ' style="left:' + left.toFixed(2) + "%;top:" + top.toFixed(2) + "%;--pc:" + item.player.color.css + '"' +
          ' aria-label="قطعة ' + esc(item.player.name) + " " + ar(item.token.index + 1) + '">' +
          PAWN_SVG + '</button>'
        );
      });
    });
    return items.join("");
  }

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["ld-player", "p" + player.index];
      if (player.index === state.current && !state.over) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      return (
        '<div class="' + classes.join(" ") + '" style="--pc:' + player.color.css + '">' +
        '<span class="ld-swatch"></span>' +
        '<span class="ld-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + ar(homeCount(player)) + "/٤ في البيت" + (player.isCpu ? " · 🤖" : "") + "</small></span>" +
        '<span class="ld-home-dots">' + player.tokens.map((token) =>
          '<i class="' + (token.pos >= FINISH ? "is-done" : "") + '"></i>'
        ).join("") + "</span></div>"
      );
    }).join("");
  }

  function actionHTML() {
    const player = cur();
    const mine = humanCanAct(player);
    const moves = legalMoves(player);
    const canRoll = mine && state.phase === "roll";
    return (
      '<div class="ld-actions">' +
      '<button type="button" class="ld-roll' + (canRoll ? " is-live" : "") + '" data-ld-roll' + (canRoll ? "" : " disabled") + ">" +
      dieHTML(state.dice) +
      "<span>" + (state.phase === "roll" ? "ارمِ النرد" : state.phase === "move" ? "اختر قطعة" : "…") + "</span></button>" +
      (state.phase === "move" && mine
        ? '<p class="ld-action-hint">' + (moves.length ? "اضغط إحدى القطع المتاحة لنقلها " + ar(state.dice) + " خطوات." : "لا حركة.") + "</p>"
        : "") +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const top =
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">🎲</span><div><strong>لودو</strong>' +
      "<small>أخرج قطعك بـ٦، أسر خصومك، وأوصل الأربع إلى البيت أولًا</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">دور <b>' + esc(player ? player.name : "—") + "</b></span>" +
      '<span class="cg-pill">النرد <b>' + (state.dice ? ar(state.dice) : "—") + "</b></span>" +
      '<span class="cg-pill">الرميات <b>' + ar(state.rolls) + "</b></span>" +
      (isOnline() ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="ld-board-wrap">' +
      '<div class="ld-board-head"><span class="cg-kicker">لوحة لودو</span>' +
      '<span class="cg-count">الخانات الآمنة ★ · القطع في القاعدة تحتاج ٦</span></div>' +
      boardHTML() +
      '<p class="ld-rule-line">★ خانات آمنة لا يمكن الأسر عليها. ٦ تمنح دورًا إضافيًا، والأسر والوصول للبيت يمنحان دورًا إضافيًا أيضًا. يجب أن تكون الخطوة الأخيرة للبيت مضبوطة تمامًا.</p>' +
      "</section>";

    const side =
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span></div>' +
      '<div class="ld-players">' + playersHTML() + "</div></div>" +
      actionHTML() +
      '<div class="ld-notice">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel ld-legend"><span class="cg-kicker">تذكير سريع</span>' +
      '<p>٦ لإخراج قطعة · الأسر يعيد الخصم للقاعدة · لا أسر على ★ · الفوز بأربع قطع في البيت.</p></div>' +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game ld-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div></div>";
  }

  let seenRolls = -1;

  function animateDie() {
    if (!rootRef || !state) return;
    const rolls = state.rolls || 0;
    const fresh = seenRolls >= 0 && rolls !== seenRolls && state.dice;
    seenRolls = rolls;
    if (!fresh) return;
    const die = rootRef.querySelector(".ld-roll .ld-die");
    if (!die || !die.animate) return;
    die.animate(
      [
        { transform: "rotate(0deg) scale(.7)", offset: 0 },
        { transform: "rotate(-130deg) scale(1.22) translateY(-5px)", offset: 0.32 },
        { transform: "rotate(150deg) scale(1.1) translateY(2px)", offset: 0.62 },
        { transform: "rotate(-14deg) scale(1.06)", offset: 0.82 },
        { transform: "rotate(0deg) scale(1)", offset: 1 },
      ],
      { duration: 560, easing: "cubic-bezier(.25,.8,.35,1)" }
    );
  }

  function shakeBoard() {
    const board = rootRef && rootRef.querySelector(".ld-board");
    if (!board || !board.animate) return;
    board.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-4px,2px)" },
        { transform: "translate(4px,-2px)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 340, easing: "ease-out" }
    );
  }

  function clearTarget() {
    if (!rootRef) return;
    rootRef.querySelectorAll(".ld-target").forEach((node) => node.remove());
  }

  function showTarget(tokenId) {
    clearTarget();
    if (!state || state.phase !== "move" || !rootRef) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const move = legalMoves(player).find((item) => item.token.id === tokenId);
    const layer = rootRef.querySelector(".ld-tokens");
    if (!move || !layer) return;
    const cell = cellOf(player.index, move.target);
    const marker = document.createElement("span");
    marker.className = "ld-target" + (move.target >= FINISH ? " is-home" : "");
    marker.style.left = (((cell[1] + 0.5) / 15) * 100).toFixed(2) + "%";
    marker.style.top = (((cell[0] + 0.5) / 15) * 100).toFixed(2) + "%";
    marker.style.setProperty("--pc", player.color.css);
    layer.appendChild(marker);
  }

  function onPointerOver(event) {
    const node = event.target.closest ? event.target.closest("[data-ld-token]") : null;
    if (node && node.classList.contains("is-movable")) showTarget(node.getAttribute("data-ld-token"));
  }

  function onPointerOut(event) {
    const node = event.target.closest ? event.target.closest("[data-ld-token]") : null;
    if (node) clearTarget();
  }

  function renderMotion() {
    if (!rootRef) return;
    const before = new Map();
    rootRef.querySelectorAll("[data-ld-token]").forEach((el) => {
      before.set(el.getAttribute("data-ld-token"), el.getBoundingClientRect());
    });
    render();
    animateDie();
    if (!before.size || !rootRef.firstElementChild) return;
    rootRef.querySelectorAll("[data-ld-token]").forEach((el) => {
      const old = before.get(el.getAttribute("data-ld-token"));
      if (!old || !el.animate) return;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [
          { transform: "translate(-50%,-50%) translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)" },
          { transform: "translate(-50%,-50%)" },
        ],
        { duration: 170, easing: "cubic-bezier(.2,.8,.3,1)" }
      );
    });
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function onClick(event) {
    if (!state || state.over) return;
    const roll = event.target.closest ? event.target.closest("[data-ld-roll]") : null;
    if (roll) {
      const player = cur();
      if (humanCanAct(player) && state.phase === "roll") rollDie();
      return;
    }
    const node = event.target.closest ? event.target.closest("[data-ld-token]") : null;
    if (!node) return;
    const player = cur();
    if (!humanCanAct(player) || state.phase !== "move") return;
    const id = node.getAttribute("data-ld-token");
    const move = legalMoves(player).find((item) => item.token.id === id);
    if (!move) {
      if (FX) FX.sound("error");
      return;
    }
    performMove(move.token);
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "ludo",
    name: "لودو",
    en: "LUDO",
    icon: "🎲",
    accent: "#e1b45c",
    cardClass: "card-ludo",
    tagline: "أربع قطع، نرد واحد، وسباق إلى البيت: أخرِج قطعك بـ٦ وأسِر خصومك على الطريق.",
    players: "2–4",
    duration: "20–40 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 4,

    rules: {
      goal: "كن أول من يوصل القطع الأربع من قاعدته إلى البيت في مركز اللوحة. تحرّك القطع حول المسار بحسب رمي النرد، ويمكنك أسر قطع الخصوم وإعادتها إلى قاعدتها.",
      facts: [["القطع", "٤ لكل لاعب"], ["النرد", "١–٦"], ["المسار", "٥٢ خانة"], ["الفوز", "٤ قطع في البيت"]],
      components: [
        "لوحة مربعة فيها أربع قواعد في الزوايا، ومسار دائري من ٥٢ خانة، وأربعة مسارات بيت ملوّنة تؤدي إلى المركز.",
        "٤ قطع لكل لاعب بلون مميز.",
        "نرد واحد من ستة أوجه.",
      ],
      setup: [
        "يختار كل لاعب لونًا، وتوضع قطعه الأربع في قاعدته.",
        "يبدأ اللاعب الأول، ثم ينتقل الدور بالترتيب.",
        "تخرج القطعة من القاعدة إلى خانة البداية عند رمي ٦ فقط.",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ النرد، ثم حرّك قطعة واحدة مساوية للرقم الظاهر.",
        "<strong>الخروج:</strong> إذا رميت ٦ يمكنك إخراج قطعة من القاعدة إلى خانة البداية بدل تحريك قطعة على المسار.",
        "<strong>الدور الإضافي:</strong> رمي ٦ يمنحك رميًا إضافيًا. الأسر أو إيصال قطعة إلى البيت يمنحك دورًا إضافيًا أيضًا.",
        "<strong>الأسر:</strong> إذا هبطت على خانة فيها قطعة خصم واحدة، تعود قطعة الخصم إلى قاعدته. لا يمكن الأسر على الخانات الآمنة ★.",
        "<strong>البيت:</strong> بعد دورة كاملة، تدخل القطعة مسار بيتك الملوّن. يجب أن تكون الخطوة الأخيرة مضبوطة تمامًا؛ الرقم الزائد لا يُحرّك القطعة.",
        "<strong>التكديس:</strong> يمكن لقطعتين من اللاعب نفسه الوقوف على الخانة نفسها.",
      ],
      winning: "أول لاعب يُوصل قطعَه الأربع إلى البيت يفوز. إذا تعذّرت الحركة يُمرَّر الدور، وتبقى القطع الأخرى في مواقعها.",
      notes: [
        "الخانات الآمنة هي خانات البداية الأربع وأربع خانات إضافية موزّعة على المسار.",
        "لا يمكن الأسر على خانة آمنة، لكن يمكن الوقوف عليها بأمان.",
        "في النسخة الرقمية تُنفَّذ الحركة خطوة بخطوة لرؤية المسار بوضوح.",
        "القطع في القاعدة لا تُعرض على المسار؛ تُعرض داخل مربع اللاعب.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      clearTimeout(moveTimer);
      clearTimeout(autoTimer);
      state = newState();
      seenRolls = -1;
      apiRef.log("بدأت لعبة لودو مع " + ar(state.players.length) + " لاعبين. يحتاج كل لاعب رمي ٦ لإخراج أول قطعة.", "accent");
      renderMotion();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render: renderMotion,
          rollDie,
          performMove,
          legalMoves,
          endTurn,
          homeCount,
          setCurrent(index) {
            if (!state) return;
            state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1);
            state.phase = "roll";
            state.dice = null;
            renderMotion();
          },
          forceRoll(value) {
            if (!state) return;
            state.dice = U.clamp(Number(value) || 1, 1, 6);
            state.phase = "move";
            renderMotion();
          },
          place(playerIndex, tokenIndex, pos) {
            if (!state || !state.players[playerIndex]) return;
            state.players[playerIndex].tokens[tokenIndex].pos = pos;
            renderMotion();
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      rootRef.addEventListener("pointerover", onPointerOver);
      rootRef.addEventListener("pointerout", onPointerOut);
      rootRef.addEventListener("focusin", onPointerOver);
      rootRef.addEventListener("focusout", onPointerOut);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(moveTimer);
          clearTimeout(autoTimer);
          state = BG.netCodec.decode(data);
          state.players.forEach((player) => {
            player.tokens = Array.isArray(player.tokens) ? player.tokens : [];
          });
          state.busy = false;
          renderMotion();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          if (state.phase === "wait") state.phase = state.dice ? "move" : "roll";
          renderMotion();
          if (!state.over) settle();
        },
        destroy() {
          clearTimeout(moveTimer);
          clearTimeout(autoTimer);
          moveTimer = null;
          autoTimer = null;
          if (rootRef) rootRef.removeEventListener("click", onClick);
          if (rootRef) {
            rootRef.removeEventListener("pointerover", onPointerOver);
            rootRef.removeEventListener("pointerout", onPointerOut);
            rootRef.removeEventListener("focusin", onPointerOver);
            rootRef.removeEventListener("focusout", onPointerOut);
          }
          seenRolls = -1;
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
