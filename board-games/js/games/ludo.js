/* ==========================================================================
   لودو — سباق البيوت الأربعة
   مسار من ٥٢ خانة، أربع قطع لكل لاعب، نرد، أسر، وخانات آمنة.

   v2:
   - اللوحة تُبنى مرة واحدة وتُحدَّث القطع فقط (كانت تُعاد كل ٢٢٥ خلية في كل خطوة).
   - لاعبان = زاويتان متقابلتان (القاعدة الرسمية).
   - علامات الوجهة تظهر لكل القطع المتاحة وتُضغط (يعمل على اللمس بلا hover).
   - ثلاث ستات متتالية تُلغي الدور، وخيارات قوانين قابلة للتخصيص.
   - ذكاء اصطناعي يقيّم الخطر والأسر وسلامة الخانات.
   - اختصار: مسطرة المسافة / Enter لرمي النرد.
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

  const OPT_DEFAULTS = { tripleSix: true, exitOne: false, captureBonus: true };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let moveTimer = null;
  let autoTimer = null;
  let keyHandler = null;
  const tokenEls = new Map();

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

  /* كل الهندسة تعتمد على «الزاوية» (slot) لا على ترتيب اللاعب */
  function cellOf(slot, pos) {
    if (pos < 0) return BASES[slot][0];
    if (pos <= 50) return PATH[(START[slot] + pos) % 52];
    if (pos < FINISH) return LANES[slot][pos - 51];
    return CENTER;
  }

  function slotCell(slot, tokenIndex, pos) {
    if (pos >= 0) return cellOf(slot, pos);
    return BASES[slot][tokenIndex];
  }

  function absCell(slot, pos) {
    if (pos < 0 || pos > 50) return null;
    return (START[slot] + pos) % 52;
  }

  // مراكز دوائر القواعد المرسومة (نسبة من عرض اللوحة)، لتجلس القطع داخلها تمامًا.
  const BASE_NEAR = [14.69, 25.71];
  const BASE_FAR = [74.29, 85.31];

  function baseSlotXY(slot, tokenIndex) {
    const right = slot === 1 || slot === 2;
    const bottom = slot === 2 || slot === 3;
    const xs = right ? BASE_FAR : BASE_NEAR;
    const ys = bottom ? BASE_FAR : BASE_NEAR;
    return [xs[tokenIndex % 2], ys[tokenIndex >> 1]];
  }

  /* ------------------------------ الحالة ------------------------------ */

  function slotsFor(count) {
    if (count === 2) return [0, 2];
    return [0, 1, 2, 3].slice(0, count);
  }

  function makePlayers() {
    const list = (apiRef.players || []).slice(0, 4);
    const slots = slotsFor(list.length);
    return list.map((player, index) => ({
      index,
      slot: slots[index],
      name: player.name || "اللاعب " + (index + 1),
      color: COLORS[slots[index]],
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
      tokens: [0, 1, 2, 3].map((i) => ({ id: "t" + index + "_" + i, index: i, pos: -1 })),
    }));
  }

  function newState() {
    return {
      players: makePlayers(),
      opts: Object.assign({}, OPT_DEFAULTS, (apiRef && apiRef.options) || {}),
      current: 0,
      dice: null,
      phase: "roll",
      round: 1,
      sixes: 0,
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

  function canExit(dice) {
    return dice === 6 || (state.opts.exitOne && dice === 1);
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
        if (canExit(dice)) moves.push({ token, target: 0, from: -1, exit: true });
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
    state.sixes = value === 6 ? (state.sixes || 0) + 1 : 0;
    state.phase = "wait";
    state.notice = player.name + " رمى " + ar(value) + "…";
    if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> رمى النرد: <strong>" + ar(value) + "</strong>.", "accent");
    if (FX) FX.dice(value);

    /* ثلاث ستات متتالية: يضيع الدور */
    if (state.opts.tripleSix && state.sixes >= 3) {
      state.notice = player.name + " رمى ٦ ثلاث مرات متتالية — يضيع الدور!";
      if (apiRef) apiRef.log("ثلاث ستات متتالية لـ<strong>" + esc(player.name) + "</strong> — يضيع الدور.", "warn");
      update();
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => endTurn(false), 1100);
      return value;
    }

    const moves = legalMoves(player);
    if (!moves.length) {
      state.notice = player.name + " رمى " + ar(value) + " ولا يملك حركة ممكنة.";
      if (apiRef) apiRef.log("لا توجد حركة ممكنة — يُمرَّر الدور.", "warn");
      update();
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => endTurn(false), 850);
      return value;
    }
    state.phase = "move";
    update();
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
    clearTargets();

    const steps = move.exit ? 1 : move.target - move.from;
    let step = 0;
    const tick = () => {
      if (!state || state.over) return;
      if (step < steps) {
        step += 1;
        token.pos = move.exit ? 0 : move.from + step;
        if (FX) FX.sound("step");
        update();
        moveTimer = setTimeout(tick, 120);
        return;
      }
      finishMove(player, token, move);
      if (done) done();
    };
    if (move.exit) {
      token.pos = 0;
      if (FX) FX.sound("step");
      update();
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
      const cell = absCell(player.slot, token.pos);
      state.players.forEach((other) => {
        if (other === player) return;
        other.tokens.forEach((enemy) => {
          if (enemy.pos < 0 || enemy.pos > 50) return;
          if (absCell(other.slot, enemy.pos) !== cell) return;
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

    const extra = state.dice === 6 || (captured && state.opts.captureBonus) || token.pos >= FINISH;
    state.busy = false;
    update();
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
      update();
      settle();
      return;
    }
    state.sixes = 0;
    let guard = 0;
    do {
      state.current = (state.current + 1) % state.players.length;
      guard += 1;
    } while (finished(state.players[state.current]) && guard < 8);
    state.notice = "دور " + cur().name + " — ارمِ النرد.";
    update();
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

  /* كم ضربة نرد (١–٦) من خصم تصل إلى هذه الخانة */
  function threatsAt(player, cell) {
    if (cell == null || SAFE.has(cell)) return 0;
    let count = 0;
    state.players.forEach((other) => {
      if (other === player) return;
      other.tokens.forEach((enemy) => {
        if (enemy.pos < 0 || enemy.pos > 50) return;
        const enemyCell = absCell(other.slot, enemy.pos);
        const gap = (cell - enemyCell + 52) % 52;
        if (gap >= 1 && gap <= 6) count += 1;
      });
      /* قطعة في القاعدة تُخرَج بـ٦ إلى خانة بدايتها: تهديد لخانة البداية القريبة */
    });
    return count;
  }

  function cpuChoose(player, moves) {
    if (!state || state.over || state.current !== player.index) return;
    const outCount = player.tokens.filter((token) => token.pos >= 0 && token.pos < FINISH).length;
    const pick = AI.choose(
      moves,
      (move) => {
        let score = 0;
        if (move.exit) score += 36 + (outCount === 0 ? 14 : 0);
        if (move.target >= FINISH) score += 90;
        else if (move.target > 50) score += 32 + move.target * 0.5;

        const fromCell = move.from >= 0 && move.from <= 50 ? absCell(player.slot, move.from) : null;
        const targetCell = move.target <= 50 ? absCell(player.slot, move.target) : null;

        if (targetCell != null) {
          if (SAFE.has(targetCell)) score += 14;
          /* أسر */
          state.players.forEach((other) => {
            if (other === player) return;
            other.tokens.forEach((enemy) => {
              if (enemy.pos < 0 || enemy.pos > 50) return;
              if (absCell(other.slot, enemy.pos) === targetCell && !SAFE.has(targetCell)) {
                score += 58 + enemy.pos * 0.7;
              }
            });
          });
          /* خطر البقاء في الخانة الجديدة */
          const risk = threatsAt(player, targetCell);
          if (risk) score -= (14 + move.target * 0.3) * risk;
        }
        /* الهروب من خانة مهدَّدة */
        if (fromCell != null) {
          const riskNow = threatsAt(player, fromCell);
          if (riskNow) score += 20 + move.from * 0.25;
        }
        /* لا نترك القطع الخلفية دائمًا: قليل من الأفضلية للمتقدمة */
        score += move.target * 0.14;
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
    update();
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

  const PAWN_SVG =
    '<svg class="ld-pawn" viewBox="0 0 24 28" aria-hidden="true" focusable="false">' +
    '<ellipse class="pw-shadow" cx="12" cy="25" rx="8.4" ry="2.4"/>' +
    '<path class="pw-foot" d="M5.6 24.2c0-2.3 2.8-3.6 6.4-3.6s6.4 1.3 6.4 3.6c0 .9-2.9 1.6-6.4 1.6s-6.4-.7-6.4-1.6z"/>' +
    '<path class="pw-body" d="M8.4 21c1.5-3 2.3-5.4 2.5-8.6h2.2c.2 3.2 1 5.6 2.5 8.6c-1.4.9-2.9 1.2-3.6 1.2S9.8 21.9 8.4 21z"/>' +
    '<ellipse class="pw-collar" cx="12" cy="12.6" rx="4.4" ry="1.5"/>' +
    '<circle class="pw-head" cx="12" cy="8.2" r="4.7"/>' +
    '<ellipse class="pw-shine" cx="10.3" cy="6.3" rx="1.7" ry="1.2"/>' +
    "</svg>";

  function dieHTML(value) {
    const dots = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    }[value] || [];
    const on = new Set(dots);
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="ld-pip' + (on.has(i) ? " is-on" : "") + '"></i>';
    return '<span class="ld-die' + (value ? " has-value" : "") + '">' + cells + "</span>";
  }

  /* اللوحة الثابتة (تُبنى مرة واحدة فقط) */
  function boardHTML() {
    const trackIndex = new Map();
    PATH.forEach((cell, i) => trackIndex.set(cell[0] * 15 + cell[1], i));

    let cells = "";
    /* خلايا مسارات البيت تُرسم منفصلة بمكانها الصريح: نتجاهلها هنا حتى لا تنزاح باقي الخلايا */
    const laneKeys = new Set();
    LANES.forEach((lane) => lane.forEach((cell) => laneKeys.add(cell[0] * 15 + cell[1])));
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (laneKeys.has(r * 15 + c)) continue;
        const idx = trackIndex.has(r * 15 + c) ? trackIndex.get(r * 15 + c) : -1;
        const classes = ["ld-cell"];
        let style = "grid-row:" + (r + 1) + ";grid-column:" + (c + 1) + ";";
        if (idx >= 0) {
          classes.push("is-track");
          const owner = START.indexOf(idx);
          if (owner >= 0) {
            classes.push("is-start", "p" + owner);
            style += "--pc:" + COLORS[owner].css + ";";
          } else if (SAFE.has(idx)) {
            classes.push("is-safe");
          }
        }
        cells += '<span class="' + classes.join(" ") + '" data-r="' + r + '" data-c="' + c + '" style="' + style + '"></span>';
      }
    }

    const bases = COLORS.map((color, index) => {
      const slots = BASES[index].map((slot, i) =>
        '<span class="ld-slot" data-ld-slot="' + index + "-" + i + '"></span>'
      ).join("");
      return '<span class="ld-base p' + index + '" data-ld-base="' + index + '" style="--pc:' + color.css + '">' + slots + "</span>";
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
    return '<div class="ld-board">' + bases + cells + lanes + center + '<div class="ld-tokens"></div></div>';
  }

  function build() {
    tokenEls.clear();
    rootRef.innerHTML =
      '<div class="cg-game ld-game">' +
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">🎲</span><div><strong>لودو</strong>' +
      "<small>أخرج قطعك بـ٦، أسر خصومك، وأوصل الأربع إلى البيت أولًا</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">دور <b data-ld-turn>—</b></span>' +
      '<span class="cg-pill">النرد <b data-ld-dice>—</b></span>' +
      '<span class="cg-pill">الرميات <b data-ld-rolls>٠</b></span>' +
      '<span class="cg-pill is-net" data-ld-net hidden></span>' +
      "</div></div>" +
      '<div class="cg-grid">' +
      '<section class="ld-board-wrap">' +
      '<div class="ld-board-head"><span class="cg-kicker">لوحة لودو</span>' +
      '<span class="cg-count">الخانات الآمنة ★ · القطع في القاعدة تحتاج ٦</span></div>' +
      boardHTML() +
      '<p class="ld-rule-line" data-ld-rule></p>' +
      "</section>" +
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span></div>' +
      '<div class="ld-players" data-ld-players></div></div>' +
      '<div data-ld-actions></div>' +
      '<div class="ld-notice" data-ld-notice></div>' +
      '<div class="cg-panel ld-legend"><span class="cg-kicker">تذكير سريع</span>' +
      '<p>٦ لإخراج قطعة · الأسر يعيد الخصم للقاعدة · لا أسر على ★ · الفوز بأربع قطع في البيت.</p></div>' +
      "</aside></div></div>";
  }

  function q(sel) {
    return rootRef ? rootRef.querySelector(sel) : null;
  }

  /* لا نلمس DOM إن لم يتغيّر المحتوى */
  function setHTML(node, html) {
    if (!node || node.__html === html) return false;
    node.innerHTML = html;
    node.__html = html;
    return true;
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["ld-player", "p" + player.slot];
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
        ? '<p class="ld-action-hint">' + (moves.length ? "اضغط قطعة أو الدائرة المضيئة لنقلها " + ar(state.dice) + " خطوات." : "لا حركة.") + "</p>"
        : "") +
      "</div>"
    );
  }

  function ruleLine() {
    const o = state.opts;
    return "★ خانات آمنة لا يمكن الأسر عليها. ٦ تمنح دورًا إضافيًا" +
      (o.captureBonus ? "، والأسر" : "") + " والوصول للبيت يمنحان دورًا إضافيًا أيضًا. يجب أن تكون الخطوة الأخيرة للبيت مضبوطة تمامًا." +
      (o.tripleSix ? " ثلاث ستات متتالية تُلغي الدور." : "") +
      (o.exitOne ? " يخرج الواحد أيضًا." : "");
  }

  function syncTokens() {
    const layer = q(".ld-tokens");
    if (!layer) return;
    const active = cur();
    const canMove = state.phase === "move" && humanCanAct(active);
    const movable = canMove ? new Set(legalMoves(active).map((move) => move.token.id)) : null;

    const groups = new Map();
    state.players.forEach((player) => {
      player.tokens.forEach((token) => {
        const cell = slotCell(player.slot, token.index, token.pos);
        const key = token.pos < 0 ? "b" + player.slot + "-" + token.index : cell[0] + ":" + cell[1];
        const list = groups.get(key) || [];
        list.push({ player, token, cell });
        groups.set(key, list);
      });
    });

    const seen = new Set();
    groups.forEach((list) => {
      list.forEach((item, i) => {
        const inBase = item.token.pos < 0;
        const shift = (i - (list.length - 1) / 2) * 3.4;
        let left = ((item.cell[1] + 0.5) / 15) * 100 + shift * 0.7;
        let top = ((item.cell[0] + 0.5) / 15) * 100 + shift * 0.7;
        if (inBase) {
          const xy = baseSlotXY(item.player.slot, item.token.index);
          left = xy[0];
          top = xy[1];
        }
        let el = tokenEls.get(item.token.id);
        if (!el) {
          el = document.createElement("button");
          el.type = "button";
          el.setAttribute("data-ld-token", item.token.id);
          el.innerHTML = PAWN_SVG;
          layer.appendChild(el);
          tokenEls.set(item.token.id, el);
        }
        seen.add(item.token.id);
        const mine = isOnline() && item.player.index === localSeat();
        const classes =
          "ld-token p" + item.player.slot + (mine ? " is-mine" : "") +
          (movable && movable.has(item.token.id) ? " is-movable" : "") +
          (state.last && state.last.token === item.token.id ? " is-last" : "") +
          (item.token.pos >= FINISH ? " is-home" : "") + (inBase ? " is-base" : "");
        if (el.className !== classes) el.className = classes;
        el.setAttribute("data-player", String(item.player.index));
        el.style.left = left.toFixed(2) + "%";
        el.style.top = top.toFixed(2) + "%";
        el.style.setProperty("--pc", item.player.color.css);
        el.setAttribute("aria-label", "قطعة " + item.player.name + " " + ar(item.token.index + 1));
      });
    });
    tokenEls.forEach((el, id) => {
      if (!seen.has(id)) { el.remove(); tokenEls.delete(id); }
    });
  }

  function clearTargets() {
    if (!rootRef) return;
    rootRef.querySelectorAll(".ld-target").forEach((node) => node.remove());
  }

  /* دوائر الوجهة لكل القطع المتاحة — قابلة للضغط (تعمل على اللمس) */
  function syncTargets() {
    clearTargets();
    if (!state || state.phase !== "move" || state.busy) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const layer = q(".ld-tokens");
    if (!layer) return;
    legalMoves(player).forEach((move) => {
      const cell = cellOf(player.slot, move.target);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "ld-target" + (move.target >= FINISH ? " is-home" : "") + (move.exit ? " is-exit" : "");
      marker.setAttribute("data-ld-for", move.token.id);
      marker.setAttribute("aria-label", "انقل القطعة إلى هنا");
      marker.style.left = (((cell[1] + 0.5) / 15) * 100).toFixed(2) + "%";
      marker.style.top = (((cell[0] + 0.5) / 15) * 100).toFixed(2) + "%";
      marker.style.setProperty("--pc", player.color.css);
      layer.appendChild(marker);
    });
  }

  function hotTarget(tokenId, on) {
    if (!rootRef) return;
    rootRef.querySelectorAll(".ld-target").forEach((node) => {
      node.classList.toggle("is-hot", on && node.getAttribute("data-ld-for") === tokenId);
    });
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
    const board = q(".ld-board");
    if (!board || !board.animate || document.documentElement.classList.contains("lite")) return;
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

  /* تحديث تزايدي: لا نعيد بناء اللوحة أبدًا */
  function update() {
    if (!rootRef || !state) return;
    if (!q(".ld-board")) build();
    const player = cur();

    setText(q("[data-ld-turn]"), player ? player.name : "—");
    setText(q("[data-ld-dice]"), state.dice ? ar(state.dice) : "—");
    setText(q("[data-ld-rolls]"), ar(state.rolls));
    const net = q("[data-ld-net]");
    if (net) {
      if (isOnline()) { net.hidden = false; setText(net, "🌐 " + (apiRef.net.isHost ? "المضيف" : "لاعب")); }
      else net.hidden = true;
    }
    const game = q(".ld-game");
    if (game) game.classList.toggle("is-over", !!state.over);

    const used = new Set(state.players.map((item) => item.slot));
    const activeSlot = player && !state.over ? player.slot : -1;
    rootRef.querySelectorAll("[data-ld-base]").forEach((node) => {
      const slot = Number(node.getAttribute("data-ld-base"));
      node.classList.toggle("is-empty", !used.has(slot));
      node.classList.toggle("is-turn", slot === activeSlot);
    });

    setHTML(q("[data-ld-players]"), playersHTML());
    const changedActions = setHTML(q("[data-ld-actions]"), actionHTML());
    setText(q("[data-ld-notice]"), state.notice);
    setText(q("[data-ld-rule]"), ruleLine());

    syncTokens();
    syncTargets();
    if (changedActions) animateDie();
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
    const target = event.target.closest ? event.target.closest("[data-ld-for]") : null;
    const node = target || (event.target.closest ? event.target.closest("[data-ld-token]") : null);
    if (!node) return;
    const player = cur();
    if (!humanCanAct(player) || state.phase !== "move") return;
    const id = node.getAttribute(target ? "data-ld-for" : "data-ld-token");
    const move = legalMoves(player).find((item) => item.token.id === id);
    if (!move) {
      if (FX) FX.sound("error");
      return;
    }
    performMove(move.token);
  }

  function onPointerOver(event) {
    const node = event.target.closest ? event.target.closest("[data-ld-token]") : null;
    if (node) hotTarget(node.getAttribute("data-ld-token"), true);
  }

  function onPointerOut(event) {
    const node = event.target.closest ? event.target.closest("[data-ld-token]") : null;
    if (node) hotTarget(node.getAttribute("data-ld-token"), false);
  }

  function onKey(event) {
    if (!state || state.over || !rootRef) return;
    if (event.code !== "Space" && event.key !== "Enter") return;
    const tag = event.target && event.target.tagName;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "A") return;
    if (document.querySelector("dialog[open]")) return;
    const player = cur();
    if (humanCanAct(player) && state.phase === "roll") {
      event.preventDefault();
      rollDie();
    }
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

    options: {
      hint: "قوانين إضافية يمكن تخصيصها قبل بدء المباراة.",
      defaults: Object.assign({}, OPT_DEFAULTS),
      fields: [
        { key: "tripleSix", label: "ثلاث ستات متتالية تُلغي الدور", type: "toggle", hint: "إن رميت ٦ ثلاث مرات متتالية يضيع دورك (القاعدة التقليدية)." },
        { key: "captureBonus", label: "دور إضافي بعد الأسر", type: "toggle", hint: "الأسر يمنحك رمية إضافية." },
        { key: "exitOne", label: "الإخراج بـ١ أو ٦", type: "toggle", hint: "يمكن إخراج القطعة من القاعدة بـ١ أيضًا (لعبة أسرع)." },
      ],
      summary(options) {
        const o = Object.assign({}, OPT_DEFAULTS, options || {});
        const parts = [];
        if (o.tripleSix) parts.push("ثلاث ستات تُلغي الدور");
        if (o.captureBonus) parts.push("دور إضافي بعد الأسر");
        if (o.exitOne) parts.push("الإخراج بـ١ أو ٦");
        return parts.join("، ") || "قواعد مبسّطة";
      },
    },

    rules: {
      goal: "كن أول من يوصل القطع الأربع من قاعدته إلى البيت في مركز اللوحة. تحرّك القطع حول المسار بحسب رمي النرد، ويمكنك أسر قطع الخصوم وإعادتها إلى قاعدتها.",
      facts: [["القطع", "٤ لكل لاعب"], ["النرد", "١–٦"], ["المسار", "٥٢ خانة"], ["الفوز", "٤ قطع في البيت"]],
      components: [
        "لوحة مربعة فيها أربع قواعد في الزوايا، ومسار دائري من ٥٢ خانة، وأربعة مسارات بيت ملوّنة تؤدي إلى المركز.",
        "٤ قطع لكل لاعب بلون مميز.",
        "نرد واحد من ستة أوجه.",
      ],
      setup: [
        "يختار كل لاعب لونًا، وتوضع قطعه الأربع في قاعدته. في لعبة لاعبين يجلس كل واحد في الزاوية المقابلة للآخر.",
        "يبدأ اللاعب الأول، ثم ينتقل الدور بالترتيب.",
        "تخرج القطعة من القاعدة إلى خانة البداية عند رمي ٦ فقط (أو ١ أيضًا إن فعّلت الخيار).",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ النرد، ثم حرّك قطعة واحدة مساوية للرقم الظاهر. الدوائر المضيئة تُظهر وجهة كل قطعة متاحة.",
        "<strong>الخروج:</strong> إذا رميت ٦ يمكنك إخراج قطعة من القاعدة إلى خانة البداية بدل تحريك قطعة على المسار.",
        "<strong>الدور الإضافي:</strong> رمي ٦ يمنحك رميًا إضافيًا. الأسر أو إيصال قطعة إلى البيت يمنحك دورًا إضافيًا أيضًا. وإن رميت ٦ ثلاث مرات متتالية يضيع الدور.",
        "<strong>الأسر:</strong> إذا هبطت على خانة فيها قطعة خصم، تعود قطعة الخصم إلى قاعدته. لا يمكن الأسر على الخانات الآمنة ★.",
        "<strong>البيت:</strong> بعد دورة كاملة، تدخل القطعة مسار بيتك الملوّن. يجب أن تكون الخطوة الأخيرة مضبوطة تمامًا؛ الرقم الزائد لا يُحرّك القطعة.",
        "<strong>التكديس:</strong> يمكن لقطعتين من اللاعب نفسه الوقوف على الخانة نفسها.",
      ],
      winning: "أول لاعب يُوصل قطعَه الأربع إلى البيت يفوز. إذا تعذّرت الحركة يُمرَّر الدور، وتبقى القطع الأخرى في مواقعها.",
      notes: [
        "الخانات الآمنة هي خانات البداية الأربع وأربع خانات إضافية موزّعة على المسار.",
        "لا يمكن الأسر على خانة آمنة، لكن يمكن الوقوف عليها بأمان.",
        "اختصار: مسطرة المسافة أو Enter لرمي النرد.",
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
      tokenEls.clear();
      apiRef.log("بدأت لعبة لودو مع " + ar(state.players.length) + " لاعبين. يحتاج كل لاعب رمي ٦ لإخراج أول قطعة.", "accent");
      update();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render: update,
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
            update();
          },
          forceRoll(value) {
            if (!state) return;
            state.dice = U.clamp(Number(value) || 1, 1, 6);
            state.phase = "move";
            update();
          },
          place(playerIndex, tokenIndex, pos) {
            if (!state || !state.players[playerIndex]) return;
            state.players[playerIndex].tokens[tokenIndex].pos = pos;
            update();
          },
        };
      }

      rootRef.addEventListener("click", onClick);
      rootRef.addEventListener("pointerover", onPointerOver);
      rootRef.addEventListener("pointerout", onPointerOut);
      rootRef.addEventListener("focusin", onPointerOver);
      rootRef.addEventListener("focusout", onPointerOut);
      keyHandler = onKey;
      document.addEventListener("keydown", keyHandler);

      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(moveTimer);
          clearTimeout(autoTimer);
          state = BG.netCodec.decode(data);
          /* توافق مع حفظ قديم بلا slot/opts */
          const slots = slotsFor(state.players.length);
          state.players.forEach((player, i) => {
            player.tokens = Array.isArray(player.tokens) ? player.tokens : [];
            if (typeof player.slot !== "number") player.slot = slots[i];
            player.color = COLORS[player.slot];
          });
          state.opts = Object.assign({}, OPT_DEFAULTS, state.opts || {});
          state.busy = false;
          update();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          if (state.phase === "wait") state.phase = state.dice ? "move" : "roll";
          update();
          if (!state.over) settle();
        },
        destroy() {
          clearTimeout(moveTimer);
          clearTimeout(autoTimer);
          moveTimer = null;
          autoTimer = null;
          if (keyHandler) document.removeEventListener("keydown", keyHandler);
          keyHandler = null;
          if (rootRef) {
            rootRef.removeEventListener("click", onClick);
            rootRef.removeEventListener("pointerover", onPointerOver);
            rootRef.removeEventListener("pointerout", onPointerOut);
            rootRef.removeEventListener("focusin", onPointerOver);
            rootRef.removeEventListener("focusout", onPointerOut);
          }
          tokenEls.clear();
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
