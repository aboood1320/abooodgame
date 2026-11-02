/* ==========================================================================
   طاولة الزهر (تافلا) — باكغامون محلي كامل
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const SIDES = [
    {
      key: "ivory",
      name: "العاجي",
      short: "عاجي",
      route: "٢٤ ← ١",
      home: [1, 6],
      dir: -1,
    },
    {
      key: "coral",
      name: "المرجاني",
      short: "مرجاني",
      route: "١ ← ٢٤",
      home: [19, 24],
      dir: 1,
    },
  ];

  const TOP_POINTS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const BOTTOM_POINTS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const FACE_DOTS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let autoEndTimer = null;
  let timerToken = 0;
  let legalCache = { key: "", moves: [] };
  let aiRunner = null;

  /* ------------------------------ أدوات ------------------------------ */

  function ar(value) {
    return String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  }

  function escape(value) {
    return U.escape(value);
  }

  function sign(player) {
    return player === 0 ? 1 : -1;
  }

  function cur() {
    return state ? state.players[state.current] : null;
  }

  function tavOption(key) {
    const opts = (apiRef && apiRef.options) || {};
    const defaults = { useCube: true, matchTo7: true };
    if (Object.prototype.hasOwnProperty.call(opts, key)) return !!opts[key];
    return !!defaults[key];
  }

  function onlineGame() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function log(message, kind) {
    if (apiRef) apiRef.log(message, kind);
  }

  function toast(message, kind) {
    if (apiRef) apiRef.toast(message, kind);
  }

  function pointWord(point) {
    return "النقطة " + ar(point);
  }

  function placeWord(from) {
    return from === "bar" ? "الشريط" : pointWord(from);
  }

  function moveWord(count) {
    if (count === 1) return "حركة واحدة";
    if (count === 2) return "حركتان";
    return ar(count) + " حركات";
  }

  /* ------------------------------ اللوحة ------------------------------ */

  function initialPoints() {
    const points = new Array(25).fill(0);
    points[24] = 2;
    points[13] = 5;
    points[8] = 3;
    points[6] = 5;
    points[1] = -2;
    points[12] = -5;
    points[17] = -3;
    points[19] = -5;
    return points;
  }

  function emptyBoard() {
    return { points: new Array(25).fill(0), bar: [0, 0], off: [0, 0] };
  }

  function cloneBoard(board) {
    return {
      points: board.points.slice(),
      bar: board.bar.slice(),
      off: board.off.slice(),
    };
  }

  function ownCount(points, player, point) {
    const value = points[point] || 0;
    return player === 0 ? Math.max(0, value) : Math.max(0, -value);
  }

  function oppCount(points, player, point) {
    const value = points[point] || 0;
    return player === 0 ? Math.max(0, -value) : Math.max(0, value);
  }

  function ownerOf(points, point) {
    const value = points[point] || 0;
    if (value > 0) return 0;
    if (value < 0) return 1;
    return null;
  }

  function addCheckers(points, point, player, delta) {
    points[point] = (points[point] || 0) + sign(player) * delta;
    if (points[point] === 0) points[point] = 0;
  }

  function boardCount(board, player) {
    let total = 0;
    for (let point = 1; point <= 24; point++) total += ownCount(board.points, player, point);
    return total;
  }

  function allInHome(board, player) {
    if ((board.bar[player] || 0) > 0) return false;
    const home = SIDES[player].home;
    for (let point = 1; point <= 24; point++) {
      if (ownCount(board.points, player, point) > 0 && (point < home[0] || point > home[1])) {
        return false;
      }
    }
    return true;
  }

  function canLand(board, player, point) {
    if (point < 1 || point > 24) return false;
    return oppCount(board.points, player, point) <= 1;
  }

  /**
   * هل يمكن إخراج قطعة من نقطة معيّنة بهذا الرقم؟
   * إذا كان الرقم أكبر من المسافة المطلوبة، يجب أن تكون القطعة هي الأبعد عن الإخراج.
   */
  function canBearOff(board, player, from, die) {
    if (from < 1 || from > 24) return false;
    if (ownCount(board.points, player, from) <= 0) return false;
    if (!allInHome(board, player)) return false;
    const need = player === 0 ? from : 25 - from;
    if (die < need) return false;
    if (die > need) {
      if (player === 0) {
        for (let point = from + 1; point <= 6; point++) {
          if (ownCount(board.points, player, point) > 0) return false;
        }
      } else {
        for (let point = 19; point < from; point++) {
          if (ownCount(board.points, player, point) > 0) return false;
        }
      }
    }
    return true;
  }

  function makeMove(board, player, from, to, die, off) {
    return {
      from,
      to,
      die,
      off: !!off,
      hit: !off && oppCount(board.points, player, to) === 1,
    };
  }

  function moveFromPoint(board, player, from, die) {
    if (ownCount(board.points, player, from) <= 0) return null;
    const to = from + SIDES[player].dir * die;
    if (to >= 1 && to <= 24) {
      if (!canLand(board, player, to)) return null;
      return makeMove(board, player, from, to, die, false);
    }
    if (canBearOff(board, player, from, die)) {
      return makeMove(board, player, from, player === 0 ? 0 : 25, die, true);
    }
    return null;
  }

  function legalMovesForDie(board, player, die) {
    const moves = [];
    if ((board.bar[player] || 0) > 0) {
      const to = player === 0 ? 25 - die : die;
      if (canLand(board, player, to)) {
        moves.push(makeMove(board, player, "bar", to, die, false));
      }
      return moves;
    }
    for (let point = 1; point <= 24; point++) {
      if (ownCount(board.points, player, point) <= 0) continue;
      const move = moveFromPoint(board, player, point, die);
      if (move) moves.push(move);
    }
    return moves;
  }

  /** تُطبّق الحركة على نسخة لوحة وتعيد true إذا أطاحت بقطعة خصم. */
  function applyMove(board, player, move) {
    if (move.from === "bar") {
      board.bar[player] = Math.max(0, (board.bar[player] || 0) - 1);
    } else {
      addCheckers(board.points, move.from, player, -1);
    }

    let hit = false;
    if (move.off) {
      board.off[player] = (board.off[player] || 0) + 1;
    } else {
      if (oppCount(board.points, player, move.to) === 1) {
        board.points[move.to] = 0;
        board.bar[1 - player] = (board.bar[1 - player] || 0) + 1;
        hit = true;
      }
      addCheckers(board.points, move.to, player, 1);
    }
    return hit;
  }

  /* ------------------------------ أقصى استخدام للنرد ------------------------------ */

  function diceKey(dice) {
    return dice.slice().sort((a, b) => a - b).join(",");
  }

  function boardKey(board, player, dice) {
    return (
      player + "|" +
      board.points.join(",") + "|" +
      board.bar.join(",") + "|" +
      board.off.join(",") + "|" +
      diceKey(dice)
    );
  }

  /**
   * أكبر عدد من حركات النرد التي يمكن استخدامها من وضع معيّن.
   * تُستخدم للتحقق من قاعدة «استخدم أكبر عدد ممكن من الحركات».
   */
  function bestUseFrom(board, player, dice, memo) {
    if (!dice || !dice.length) return 0;
    const cache = memo || new Map();
    const key = boardKey(board, player, dice);
    if (cache.has(key)) return cache.get(key);

    let best = 0;
    const seen = Object.create(null);
    for (let index = 0; index < dice.length; index++) {
      const die = dice[index];
      if (seen[die]) continue;
      seen[die] = true;
      const moves = legalMovesForDie(board, player, die);
      for (const move of moves) {
        const next = cloneBoard(board);
        applyMove(next, player, move);
        const rest = dice.slice();
        rest.splice(index, 1);
        const used = 1 + bestUseFrom(next, player, rest, cache);
        if (used > best) best = used;
        if (best === dice.length) {
          cache.set(key, best);
          return best;
        }
      }
    }
    cache.set(key, best);
    return best;
  }

  function stateKey() {
    if (!state) return "";
    return [
      state.current,
      state.points.join(","),
      state.bar.join(","),
      state.off.join(","),
      diceKey(state.dice),
      state.phase,
      state.over ? "1" : "0",
    ].join("|");
  }

  /**
   * الحركات القانونية الآن، مع فرض:
   * ١) استخدام أكبر عدد ممكن من حركات النرد.
   * ٢) عند تعذّر استخدام الرقمين، استخدام الرقم الأكبر.
   */
  function legalMovesNow() {
    if (!state || state.over || state.phase !== "move" || !state.dice.length) return [];
    const key = stateKey();
    if (legalCache.key === key) return legalCache.moves;

    const player = state.current;
    const dice = state.dice;
    const maxAtStart = bestUseFrom(state, player, dice, new Map());
    if (!maxAtStart) {
      legalCache = { key, moves: [] };
      return legalCache.moves;
    }

    const values = [...new Set(dice)].sort((a, b) => b - a);
    const playable = values.filter((die) => legalMovesForDie(state, player, die).length > 0);
    const forceHigher = maxAtStart === 1 && playable.length > 1;
    const highest = values[0];
    const result = [];
    const seen = new Set();

    for (let index = 0; index < dice.length; index++) {
      const die = dice[index];
      if (forceHigher && die !== highest) continue;
      for (const move of legalMovesForDie(state, player, die)) {
        const moveKey = move.from + ">" + move.to + "#" + die;
        if (seen.has(moveKey)) continue;
        const next = cloneBoard(state);
        applyMove(next, player, move);
        const rest = dice.slice();
        rest.splice(index, 1);
        if (1 + bestUseFrom(next, player, rest, new Map()) !== maxAtStart) continue;
        seen.add(moveKey);
        result.push(move);
      }
    }

    legalCache = { key, moves: result };
    return result;
  }

  function maxUse(dice) {
    if (!state) return 0;
    return bestUseFrom(state, state.current, dice || state.dice, new Map());
  }

  /* ------------------------------ مؤقتات ------------------------------ */

  function clearAutoEnd() {
    timerToken += 1;
    if (autoEndTimer) clearTimeout(autoEndTimer);
    autoEndTimer = null;
  }

  function scheduleAutoEnd(delay) {
    clearAutoEnd();
    const token = timerToken;
    autoEndTimer = setTimeout(() => {
      if (token !== timerToken) return;
      autoEndTimer = null;
      if (!state || state.over || state.phase !== "ending") return;
      endTurn();
    }, delay || 900);
  }

  /* ------------------------------ الحركات والأدوار ------------------------------ */

  function rollDice() {
    if (!state || state.over || state.phase !== "roll") return false;
    clearAutoEnd();
    const first = U.roll(6);
    const second = U.roll(6);
    const values = first === second ? [first, first, first, first] : [first, second];
    state.rolled = values.slice();
    state.dice = values.slice();
    state.phase = "move";
    state.selected = (state.bar[state.current] || 0) > 0 ? "bar" : null;

    log(
      "🎲 <strong>" + escape(cur().name) + "</strong> رمى " + ar(first) + " و" + ar(second) +
      (first === second ? " — دبل!" : "."),
      "accent"
    );
    if (FX) FX.sound("dice");

    const legal = legalMovesNow();
    if (!legal.length) {
      state.phase = "ending";
      log(
        "🚫 <strong>" + escape(cur().name) + "</strong> لا يملك حركة صالحة — ينتقل الدور.",
        "warn"
      );
      scheduleAutoEnd(1200);
    }

    render();
    if (FX) {
      FX.after(() => {
        const dice = rootRef && rootRef.querySelector(".tav-dice");
        if (dice) FX.pop(dice);
      }, 20);
    }
    return true;
  }

  function selectSource(source) {
    if (!state || state.over || state.phase !== "move") return false;
    const player = state.current;

    const legal = legalMovesNow();
    if (source === "bar") {
      if ((state.bar[player] || 0) <= 0) {
        toast("لا توجد قطع لك على الشريط.");
        return false;
      }
      if (!legal.some((move) => move.from === "bar")) {
        toast("دخول الشريط مسدود بهذه الأرقام.");
        if (FX) FX.sound("error");
        return false;
      }
    } else {
      const point = Number(source);
      if (ownCount(state.points, player, point) <= 0) return false;
      if (!legal.some((move) => move.from === point)) {
        toast("لا توجد حركة صالحة من هذه النقطة.");
        if (FX) FX.sound("error");
        return false;
      }
    }

    if (String(state.selected) === String(source)) state.selected = null;
    else state.selected = source;

    if (FX && state.selected != null) FX.sound("click");
    render();
    return true;
  }

  function performMove(input, toArg, dieArg) {
    if (!state || state.over) return false;
    const legal = legalMovesNow();
    let from;
    let to;
    let die;
    if (input && typeof input === "object") {
      from = input.from;
      to = input.to;
      die = input.die;
    } else {
      from = input;
      to = toArg;
      die = dieArg;
    }

    const move = legal.find((item) =>
      String(item.from) === String(from) &&
      item.to === Number(to) &&
      (die == null || item.die === Number(die))
    );
    if (!move) {
      if (FX) FX.sound("error");
      return false;
    }

    const player = state.current;
    const playerName = cur().name;
    const hit = applyMove(state, player, move);

    const dieIndex = state.dice.indexOf(move.die);
    if (dieIndex >= 0) state.dice.splice(dieIndex, 1);

    state.selected = null;
    state.lastMove = {
      player,
      from: move.from,
      to: move.to,
      die: move.die,
      off: move.off,
      hit,
    };

    if (move.off) {
      state.recent.push({ player, kind: "off", html: "أخرج قطعة من " + pointWord(move.from) });
      log(
        "🏁 <strong>" + escape(playerName) + "</strong> أخرج قطعة من " +
        pointWord(move.from) + " بالنرد " + ar(move.die) + ".",
        "good"
      );
      if (FX) FX.sound("score");
    } else {
      const text =
        "من " + placeWord(move.from) + " إلى " + pointWord(move.to) +
        (hit ? " · إطاحة" : "");
      state.recent.push({ player, kind: hit ? "hit" : "move", html: text });
      log(
        "🎯 <strong>" + escape(playerName) + "</strong> حرّك من " +
        placeWord(move.from) + " إلى " + pointWord(move.to) +
        " بالنرد " + ar(move.die) +
        (hit ? " وأطاح بقطعة الخصم إلى الشريط" : "") + ".",
        hit ? "warn" : "accent"
      );
      if (FX) FX.sound(hit ? "score" : "place");
    }
    if (state.recent.length > 6) state.recent = state.recent.slice(-6);

    if (state.off[player] >= 15) {
      finishGame(player);
      return true;
    }

    if (!state.dice.length) {
      state.phase = "ending";
      render();
      animateMove(move, hit, player);
      scheduleAutoEnd(420);
      return true;
    }

    const remaining = legalMovesNow();
    if (!remaining.length) {
      state.phase = "ending";
      render();
      animateMove(move, hit, player);
      scheduleAutoEnd(1200);
      return true;
    }

    if ((state.bar[player] || 0) > 0) state.selected = "bar";
    else if (state.selected != null && !remaining.some((item) => String(item.from) === String(state.selected))) {
      state.selected = null;
    }

    render();
    animateMove(move, hit, player);
    return true;
  }

  function animateMove(move, hit, player) {
    if (!FX) return;
    FX.after(() => {
      if (!rootRef || !state) return;
      if (move.off) {
        const tray = rootRef.querySelector('[data-off="' + player + '"]');
        if (tray) {
          FX.pop(tray);
          FX.pulse(tray);
        }
        return;
      }
      const target = rootRef.querySelector('[data-point="' + move.to + '"]');
      if (target) FX.pop(target);
      if (hit) {
        const bar = rootRef.querySelector('[data-bar="' + (1 - player) + '"]');
        if (bar) FX.pulse(bar);
      }
    }, 30);
  }

  function endTurn() {
    clearAutoEnd();
    if (!state || state.over) return;
    state.current = 1 - state.current;
    state.turn += 1;
    state.dice = [];
    state.rolled = [];
    state.selected = null;
    state.phase = "roll";

    const player = cur();
    log(
      "🎬 دور <strong>" + escape(player.name) + "</strong> — " +
      SIDES[state.current].name + " (" + SIDES[state.current].route + ").",
      ""
    );
    if (FX) FX.sound("turn");
    render();
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuRemaining(point, player) {
    return SIDES[player].dir === -1 ? point : 25 - point;
  }

  function cpuMoveScore(move, player) {
    const board = cloneBoard(state);
    const hit = applyMove(board, player, move);
    let score = 0;
    if (move.off) score += 900;
    if (hit) score += 300;
    if (move.from === "bar") score += 240;

    if (!move.off) {
      const own = ownCount(board.points, player, move.to);
      const opp = 1 - player;
      if (own >= 2) score += 120 + Math.min(own, 5) * 8;
      if (own === 1) {
        let threats = 0;
        const dir = SIDES[player].dir;
        for (let d = 1; d <= 6; d++) {
          const from = move.to + dir * d;
          if (from >= 1 && from <= 24 && ownCount(state.points, opp, from) > 0) threats += 1;
        }
        if ((state.bar[opp] || 0) > 0) {
          const entry = SIDES[player].home;
          if (move.to >= entry[0] && move.to <= entry[1]) threats += 2;
        }
        score -= threats * 22;
      }
      score += (24 - cpuRemaining(move.to, player)) * 1.2;
    }

    return score;
  }

  function pickCpuMove(moves, seat) {
    if (!moves.length) return null;
    if (AI.level(seat && seat.level) === "hard") {
      const ranked = moves
        .map((move) => ({ move, score: cpuMoveScore(move, state.current) }))
        .sort((a, b) => b.score - a.score);
      const top = ranked[0].score;
      const pool = ranked.filter((entry) => top - entry.score < 6).map((entry) => entry.move);
      return U.pick(pool.length ? pool : [ranked[0].move]);
    }
    return AI.choose(moves, (move) => cpuMoveScore(move, state.current), seat && seat.level) || moves[0];
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = state.players[state.current];
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;

    if (state.phase === "roundover") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "roundover") return;
        startNextGame();
      }, Math.max(900, AI.delay(seat.level, 1.4)));
      return;
    }

    if (state.phase === "roll") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "roll") return;
        rollDice();
      }, AI.delay(seat.level, 1.15));
      return;
    }

    if (state.phase === "move") {
      const move = pickCpuMove(legalMovesNow(), seat);
      if (!move) return;
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "move") return;
        const still = legalMovesNow().find(
          (item) =>
            String(item.from) === String(move.from) &&
            item.to === move.to &&
            item.die === move.die &&
            !!item.off === !!move.off
        );
        if (still) performMove(still);
      }, AI.delay(seat.level, 0.85));
    }
  }

  function finishGame(winner) {
    if (!state || state.over || state.phase === "roundover") return;
    clearAutoEnd();
    const loser = 1 - winner;

    let base = 1;
    let kind = "فوز عادي";
    if (state.off[loser] === 0) {
      base = 2;
      kind = "غامون";
      const home = SIDES[winner].home;
      let backgammon = (state.bar[loser] || 0) > 0;
      for (let point = home[0]; point <= home[1]; point++) {
        if (ownCount(state.points, loser, point) > 0) backgammon = true;
      }
      if (backgammon) {
        base = 3;
        kind = "باكغامون";
      }
    }

    awardGame(winner, base * (state.cube || 1), kind, base);
  }

  /** يضيف نقاط اللعبة إلى مجموع المباراة، أو يعلن نهايتها عند بلوغ الهدف. */
  function awardGame(winner, points, kind, base) {
    if (!state) return;
    const loser = 1 - winner;
    const winnerName = state.players[winner].name;
    const loserName = state.players[loser].name;
    state.winner = winner;
    state.result = kind;
    state.roundPoints = points;
    state.legalResult = points;
    state.scores[winner] = (state.scores[winner] || 0) + points;
    state.selected = null;
    const target = tavOption("matchTo7") ? 7 : 0;
    const matchOver = target > 0 ? state.scores[winner] >= target : true;

    log(
      "🏆 <strong>" + escape(winnerName) + "</strong> فاز باللعبة — " + escape(kind) +
      " (" + ar(base || 0) + " × نرد " + ar(state.cube || 1) + " = " + ar(points) + " نقطة). " +
      "المجموع: " + ar(state.scores[0]) + "–" + ar(state.scores[1]) + ".",
      "good"
    );
    if (FX) FX.win();

    if (!matchOver) {
      state.over = false;
      state.phase = "roundover";
      state.notice = "انتهت اللعبة " + ar(state.gameNumber) + " — فاز " + winnerName +
        ". اضغط «اللعبة التالية» للاستمرار نحو " + ar(target) + " نقاط.";
      render();
      return;
    }

    state.over = true;
    state.matchOver = true;
    state.phase = "over";
    render();
    if (apiRef) {
      apiRef.gameOver({
        icon: "🏆",
        title: "فاز " + winnerName + " بالمباراة!",
        text:
          "وصل <strong>" + escape(winnerName) + "</strong> إلى " + ar(state.scores[winner]) +
          " نقطة من أصل " + ar(target) + ". النتيجة النهائية: " +
          "<strong>" + ar(state.scores[0]) + "–" + ar(state.scores[1]) + "</strong>.",
        winner: winnerName,
        standings: [
          { name: winnerName + " · الفائز", value: ar(state.scores[winner]) + " نقطة" },
          { name: loserName, value: ar(state.scores[loser]) + " نقطة" },
        ],
      });
    }
  }

  function canDoubleNow() {
    if (!state || state.over || state.phase !== "roll" || !tavOption("useCube")) return false;
    if (onlineGame()) return false;
    if (state.cube >= 64) return false;
    return state.cubeOwner == null || state.cubeOwner === state.current;
  }

  /** مضاعفة الرهان قبل الرمي. الخصم البشري يقرر محليًا، والكمبيوتر يقيّم الموقف. */
  function offerDouble() {
    if (!canDoubleNow()) return;
    const doubler = state.current;
    const opponent = 1 - doubler;
    const currentCube = state.cube || 1;
    const accept = () => {
      if (!state || state.over || state.phase !== "roll") return;
      state.cube = currentCube * 2;
      state.cubeOwner = opponent;
      log("✖️ <strong>" + escape(state.players[doubler].name) + "</strong> ضاعف النرد إلى " +
        ar(state.cube) + " — قبل <strong>" + escape(state.players[opponent].name) + "</strong>.",
        "accent");
      if (FX) FX.sound("point");
      render();
    };
    const decline = () => {
      if (!state || state.over || state.phase !== "roll") return;
      awardGame(doubler, currentCube, "رفض المضاعفة", 1);
    };

    if (state.players[opponent].isCpu) {
      const cpuBehind = state.off[opponent] - state.off[doubler];
      const acceptIt = currentCube <= 2 || cpuBehind >= -2;
      setTimeout(() => { if (acceptIt) accept(); else decline(); }, 700);
      return;
    }

    BG.confirm(
      "مضاعفة الرهان",
      "يعرض <strong>" + escape(state.players[doubler].name) + "</strong> مضاعفة النرد من " +
        ar(currentCube) + " إلى " + ar(currentCube * 2) + ". إن قبلت تستمر اللعبة بهذا الرهان، وإن رفضت تنتهي اللعبة وتُمنح " +
        ar(currentCube) + " نقطة للمضاعِف.",
      "اقبل المضاعفة",
      "ارفض واستسلم"
    ).then((ok) => { if (ok) accept(); else decline(); });
  }

  function startNextGame() {
    if (!state || state.over || state.phase !== "roundover") return;
    const previousWinner = Number.isInteger(state.winner) ? state.winner : 0;
    state.gameNumber = (state.gameNumber || 1) + 1;
    state.current = 1 - previousWinner;
    state.turn = 1;
    state.phase = "roll";
    state.points = initialPoints();
    state.bar = [0, 0];
    state.off = [0, 0];
    state.dice = [];
    state.rolled = [];
    state.selected = null;
    state.lastMove = null;
    state.recent = [];
    state.winner = null;
    state.result = null;
    state.roundPoints = 0;
    state.cube = 1;
    state.cubeOwner = null;
    state.notice = "اللعبة " + ar(state.gameNumber) + " — يبدأ " + state.players[state.current].name + ".";
    log("🎬 بدأت اللعبة " + ar(state.gameNumber) + " — <strong>" +
      escape(state.players[state.current].name) + "</strong> يرمي أولًا.", "accent");
    if (FX) FX.sound("place");
    render();
  }

  /* ------------------------------ العرض ------------------------------ */

  function checkerHTML(player, extra, key) {
    const piece = key
      ? ' data-fx-piece="' + escape(key) + '" data-fx-enter="pop"'
      : "";
    return '<span class="tav-checker p' + player + (extra ? " " + extra : "") + '"' + piece + ' aria-hidden="true"></span>';
  }

  function stackHTML(player, count, limit, place) {
    const shown = Math.min(count, limit || 5);
    let html = "";
    for (let i = 0; i < shown; i++) html += checkerHTML(player, null, place ? place + "-" + i : "");
    if (count > shown) {
      html += '<span class="tav-stack-count">' + ar(count) + "</span>";
    }
    return html;
  }

  function dieHTML(value, extra) {
    if (!value) {
      return (
        '<span class="die tav-die is-empty' + (extra ? " " + extra : "") + '" aria-hidden="true">' +
        "<i>؟</i></span>"
      );
    }
    const dots = FACE_DOTS[value] || [];
    let cells = "";
    for (let i = 0; i < 9; i++) {
      cells += '<span class="die-cell' + (dots.indexOf(i) >= 0 ? " on" : "") + '"></span>';
    }
    return (
      '<span class="die tav-die' + (extra ? " " + extra : "") + '" aria-label="نرد ' + ar(value) + '">' +
      cells + "</span>"
    );
  }

  function diceHTML() {
    if (!state.rolled.length) return dieHTML(0) + dieHTML(0);
    if (state.over || state.phase === "ending" || !state.dice.length) {
      return state.rolled.map((value) => dieHTML(value, "is-spent")).join("");
    }
    return state.dice.map((value) => dieHTML(value, "is-live")).join("");
  }

  function diceNote() {
    if (state.over) return "انتهت المباراة";
    if (state.phase === "roll") return "ارمِ النردين لبدء الدور";
    if (state.phase === "ending") return "استُهلكت الحركات المتاحة";
    const used = state.rolled.length - state.dice.length;
    return "استُخدم " + ar(used) + " من " + ar(state.rolled.length) + " حركات";
  }

  function sourcePoints(legal) {
    const set = new Set();
    legal.forEach((move) => {
      if (move.from !== "bar") set.add(Number(move.from));
    });
    return set;
  }

  function targetPoints(legal) {
    const set = new Set();
    if (state.selected == null) return set;
    legal.forEach((move) => {
      if (String(move.from) === String(state.selected) && !move.off) set.add(Number(move.to));
    });
    return set;
  }

  function canOffNow(legal) {
    if (state.selected == null) return false;
    return legal.some((move) => String(move.from) === String(state.selected) && move.off);
  }

  function pointHTML(point, view) {
    const value = state.points[point] || 0;
    const owner = value > 0 ? 0 : value < 0 ? 1 : null;
    const count = Math.abs(value);
    const selected = String(state.selected) === String(point);
    const isTarget = view.targets.has(point);
    const isSource = !selected && view.sources.has(point);
    const classes = ["tav-point", point <= 12 ? "bottom" : "top"];
    if (owner != null) classes.push("owner-" + owner);
    if (selected) classes.push("is-selected");
    if (isTarget) classes.push("is-target");
    if (isSource) classes.push("is-source");
    if (count === 1) classes.push("is-blot");

    const label =
      "النقطة " + ar(point) +
      (owner != null ? " — " + SIDES[owner].short + " (" + ar(count) + ")" : " — فارغة") +
      (isTarget ? " — وجهة صالحة" : "") +
      (isSource ? " — قطعة قابلة للتحريك" : "");

    return (
      '<button type="button" class="' + classes.join(" ") + '" data-point="' + point + '" aria-label="' + escape(label) + '">' +
      '<span class="tav-point-num">' + ar(point) + "</span>" +
      '<span class="tav-stack">' + (owner != null ? stackHTML(owner, count, 5, "tav-" + owner + "-p" + point) : "") + "</span>" +
      "</button>"
    );
  }

  function barHTML(player, view) {
    const count = state.bar[player] || 0;
    const selected = state.selected === "bar" && state.current === player;
    const active = !state.over && state.current === player && count > 0;
    const classes = ["tav-bar-slot", "p" + player];
    if (selected) classes.push("is-selected");
    if (active) classes.push("is-active");
    return (
      '<button type="button" class="' + classes.join(" ") + '" data-bar="' + player + '" aria-label="شريط ' +
      escape(SIDES[player].name) + ": " + ar(count) + ' قطعة">' +
      '<span class="tav-bar-label">شريط ' + SIDES[player].short + "</span>" +
      '<span class="tav-bar-stack">' + (count ? stackHTML(player, count, 6, "tav-" + player + "-bar") : '<span class="tav-bar-empty">—</span>') + "</span>" +
      '<span class="tav-bar-count">' + ar(count) + "</span>" +
      "</button>"
    );
  }

  function trayHTML(player, view) {
    const count = state.off[player] || 0;
    const isTarget = player === state.current && view.canOff;
    const classes = ["tav-tray", "p" + player];
    if (isTarget) classes.push("is-target");
    let discs = "";
    for (let i = 0; i < count; i++) discs += checkerHTML(player, "mini", "tav-" + player + "-off-" + i);
    if (!count) discs = '<span class="tav-tray-empty">لا قطع</span>';
    return (
      '<button type="button" class="' + classes.join(" ") + '" data-off="' + player +
      '" aria-label="منطقة إخراج ' + escape(SIDES[player].name) + ": " + ar(count) + ' من ١٥">' +
      '<span class="tav-tray-label">إخراج</span>' +
      '<span class="tav-tray-stack">' + discs + "</span>" +
      '<span class="tav-tray-count">' + ar(count) + "<small>/١٥</small></span>" +
      "</button>"
    );
  }

  function playersHTML() {
    return state.players.map((player) => {
      const index = player.index;
      const active = !state.over && index === state.current;
      const onBoard = boardCount(state, index);
      const bar = state.bar[index] || 0;
      const off = state.off[index] || 0;
      const pct = Math.round((off / 15) * 100);
      const classes = ["tav-player", "p" + index];
      if (active) classes.push("is-active");
      if (state.over && state.winner === index) classes.push("is-winner");
      return (
        '<div class="' + classes.join(" ") + '">' +
        '<span class="tav-player-dot" aria-hidden="true"></span>' +
        '<div class="tav-player-copy"><strong>' + escape(player.name) + "</strong>" +
        "<small>" + SIDES[index].name + " · " + (tavOption("matchTo7") ? ar(state.scores[index] || 0) + " نقطة · " : "") + SIDES[index].route + "</small></div>" +
        (active ? '<span class="tav-player-badge">الدور</span>' : "") +
        '<div class="tav-player-stats">' +
        '<span class="tav-stat"><b>' + ar(off) + "</b> خارج</span>" +
        '<span class="tav-stat"><b>' + ar(onBoard) + "</b> على اللوحة</span>" +
        (bar ? '<span class="tav-stat is-warn"><b>' + ar(bar) + "</b> شريط</span>" : "") +
        "</div>" +
        '<span class="tav-progress"><i style="width:' + pct + '%"></i></span>' +
        "</div>"
      );
    }).join("");
  }

  function recentHTML() {
    if (!state.recent.length) {
      return '<p class="tav-empty">لم تُنفَّذ حركات بعد. ارمِ النرد لتبدأ المباراة.</p>';
    }
    return (
      '<ol class="tav-recent">' +
      state.recent.slice().reverse().map((item) =>
        '<li class="p' + item.player + '"><span class="tav-recent-dot" aria-hidden="true"></span><span>' +
        item.html + "</span></li>"
      ).join("") +
      "</ol>"
    );
  }

  function tipsHTML() {
    return (
      '<div class="tav-tips">' +
      '<div class="tav-tip"><b>١</b><span>اختر قطعة من نقاطك المضاءة، ثم اضغط النقطة المضاءة للوجهة.</span></div>' +
      '<div class="tav-tip"><b>٢</b><span>إن أُطيح بقطعة إلى الشريط، أدخلها أولًا قبل أي حركة أخرى.</span></div>' +
      '<div class="tav-tip"><b>٣</b><span>عندما تجتمع كل قطعك في منطقتك الأم، اضغط منطقتك لإخراج قطعة.</span></div>' +
      "</div>"
    );
  }

  function phaseLabel() {
    if (state.over) return "انتهت المباراة";
    if (state.phase === "roundover") return "بين الألعاب";
    if (state.phase === "roll") return "بانتظار الرمي";
    if (state.phase === "ending") return "إنهاء الدور";
    return "مرحلة الحركة";
  }

  function noticeText() {
    if (state.over) {
      const name = state.winner != null ? state.players[state.winner].name : "";
      return "انتهت المباراة — فاز " + name + " (" + (state.result || "فوز") + ").";
    }
    if (state.phase === "roundover") {
      return "فاز " + state.players[state.winner].name + " باللعبة (+" + ar(state.roundPoints || 0) +
        " نقطة). المجموع " + ar(state.scores[0]) + "–" + ar(state.scores[1]) + ".";
    }
    if (state.phase === "roll") {
      return "دور " + cur().name + " — ارمِ النردين لبدء الدور. النرد الحالي ×" + ar(state.cube || 1) + ".";
    }
    if (state.phase === "ending") {
      return "لا توجد حركات قانونية متبقية — ينتقل الدور بعد لحظات.";
    }
    const bar = state.bar[state.current] || 0;
    if (state.selected === "bar") return "اختر نقطة دخول مضاءة في منطقة الخصم.";
    if (state.selected != null) {
      return "اختر وجهة مضاءة، أو منطقتك لإخراج القطعة إن كانت مضاءة.";
    }
    if (bar > 0) return "لديك " + ar(bar) + " على الشريط — يجب إدخالها أولًا.";
    return "اختر قطعة لك من النقاط المضاءة.";
  }

  function controlHTML() {
    const player = cur();
    const canRoll = !state.over && state.phase === "roll";
    const canEnd = !state.over && state.phase === "ending";
    const canDouble = canDoubleNow();
    const canNext = !state.over && state.phase === "roundover";
    const scoreLine = tavOption("matchTo7")
      ? "المباراة: " + ar(state.scores[0]) + "–" + ar(state.scores[1]) + " · الهدف ٧"
      : "لعبة واحدة";
    return (
      '<div class="tav-control p' + state.current + '">' +
      '<div class="tav-control-who">' +
      '<span class="tav-kicker">' + phaseLabel() + " · الدور " + ar(state.turn) + " · لعبة " + ar(state.gameNumber || 1) + "</span>" +
      "<strong>" + escape(state.over ? "انتهت المباراة" : state.phase === "roundover" ? "فاز " + player.name + " باللعبة" : player.name) + "</strong>" +
      "<small>" + (state.over ? scoreLine : state.phase === "roundover" ? scoreLine + " · " + (state.result || "") : SIDES[state.current].name + " · " + SIDES[state.current].route) + "</small>" +
      "</div>" +
      '<div class="tav-dice-wrap">' +
      '<div class="tav-dice">' + diceHTML() + "</div>" +
      '<span class="tav-dice-note">' + diceNote() + (tavOption("useCube") && !onlineGame() ? " · النرد ×" + ar(state.cube || 1) : "") + "</span>" +
      "</div>" +
      '<div class="tav-control-actions">' +
      (canNext
        ? '<button type="button" class="bg-btn primary" data-act="next-game"><span>🔄 اللعبة التالية</span></button>'
        : '<button type="button" class="bg-btn primary" data-act="roll"' + (canRoll ? "" : " disabled") + '><span>🎲 ارمِ النرد</span></button>' +
          '<button type="button" class="bg-btn" data-act="double"' + (canDouble ? "" : " disabled") + '><span>✖️ ضاعف النرد</span></button>' +
          '<button type="button" class="bg-btn" data-act="end"' + (canEnd ? "" : " disabled") + '><span>⏭ أنهِ الدور</span></button>') +
      "</div>" +
      "</div>" +
      '<p class="tav-prompt' + (state.phase === "ending" ? " is-warn" : "") + '">' + escape(noticeText()) + "</p>"
    );
  }

  function boardFootHTML() {
    return (
      '<div class="tav-board-foot">' +
      '<span class="tav-foot-chip">' + checkerHTML(0, "mini") + " العاجي: من ٢٤ إلى ١</span>" +
      '<span class="tav-foot-chip">' + checkerHTML(1, "mini") + " المرجاني: من ١ إلى ٢٤</span>" +
      '<span class="tav-foot-chip">قاعدة: أكبر استخدام ممكن للنرد</span>' +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const legal = legalMovesNow();
    const view = {
      legal,
      sources: sourcePoints(legal),
      targets: targetPoints(legal),
      canOff: canOffNow(legal),
    };

    const top = TOP_POINTS.map((point) => pointHTML(point, view)).join("");
    const bottom = BOTTOM_POINTS.map((point) => pointHTML(point, view)).join("");

    const wrap = document.createElement("div");
    wrap.className = "tav-layout " + (state.over ? "is-over" : "");

    const main = document.createElement("div");
    main.className = "tav-main";
    main.innerHTML =
      '<div class="tav-board-wrap">' +
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-tavla"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">لوحة تقليدية · ' + (tavOption("matchTo7") ? "مباراة إلى ٧ نقاط" : "لعبة واحدة") + '</span><strong>طاولة الزهر · باكغامون</strong></div>' +
      '<span class="board-head-hint">العاجي ٢٤ ← ١ · المرجاني ١ ← ٢٤ · النردان يحكمان كل حركة</span>' +
      "</div>" +
      '<div class="tav-board" role="group" aria-label="لوحة طاولة الزهر">' +
      '<div class="tav-points top">' + top + "</div>" +
      '<div class="tav-tray-col top">' + trayHTML(1, view) + "</div>" +
      '<div class="tav-midbar">' +
      barHTML(0, view) +
      '<div class="tav-mid-core" aria-hidden="true"><span class="tav-mid-line"></span><span class="tav-mid-word">الشريط</span><span class="tav-mid-line"></span></div>' +
      barHTML(1, view) +
      "</div>" +
      '<div class="tav-points bottom">' + bottom + "</div>" +
      '<div class="tav-tray-col bottom">' + trayHTML(0, view) + "</div>" +
      "</div>" +
      boardFootHTML() +
      "</div>" +
      controlHTML();

    const side = document.createElement("aside");
    side.className = "tav-side";
    side.innerHTML =
      '<div class="tav-panel tav-players-panel"><span class="tav-kicker">اللاعبون</span>' + playersHTML() + "</div>" +
      '<div class="tav-panel tav-recent-panel"><span class="tav-kicker">آخر الحركات</span>' + recentHTML() + "</div>" +
      '<div class="tav-panel tav-help-panel"><span class="tav-kicker">كيف تلعب</span>' + tipsHTML() + "</div>";

    wrap.appendChild(main);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (state && !state.over && AI.isCpu(cur())) return;
    const action = event.target.closest("[data-act]");
    if (action) {
      const act = action.getAttribute("data-act");
      if (act === "roll") rollDice();
      else if (act === "end") endTurn();
      else if (act === "double") offerDouble();
      else if (act === "next-game") startNextGame();
      return;
    }

    if (!state || state.over || state.phase !== "move") return;

    const bar = event.target.closest("[data-bar]");
    if (bar) {
      const player = Number(bar.getAttribute("data-bar"));
      if (player === state.current && (state.bar[player] || 0) > 0) selectSource("bar");
      return;
    }

    const off = event.target.closest("[data-off]");
    if (off) {
      const player = Number(off.getAttribute("data-off"));
      if (player !== state.current || state.selected == null) return;
      const move = legalMovesNow().find((item) =>
        String(item.from) === String(state.selected) && item.off
      );
      if (move) performMove(move);
      return;
    }

    const point = event.target.closest("[data-point]");
    if (!point) return;
    const target = Number(point.getAttribute("data-point"));

    if (state.selected != null) {
      const move = legalMovesNow().find((item) =>
        String(item.from) === String(state.selected) && !item.off && item.to === target
      );
      if (move) {
        performMove(move);
        return;
      }
      if ((state.bar[state.current] || 0) > 0) {
        toast("أدخل قطعة من الشريط أولًا.");
        if (FX) FX.sound("error");
        return;
      }
    }
    selectSource(target);
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const game = {
    id: "tavla",
    name: "طاولة الزهر",
    en: "TAVLA",
    icon: "🎲",
    accent: "#cba36a",
    cardClass: "card-tavla",
    tagline: "باكغامون كلاسيكي: حرّك قطعك بالنرد، أطِح بقطع الخصم، وأخرج الخمس عشرة قبل الجميع.",
    players: "2",
    duration: "15–30 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "قواعد المباراة الرسمية: نرد مضاعفة ومباراة إلى ٧ نقاط.",
      defaults: { useCube: true, matchTo7: true },
      fields: [
        { key: "matchTo7", label: "مباراة إلى ٧ نقاط", type: "toggle", hint: "عدة ألعاب متتالية حتى يبلغ أحد اللاعبين ٧ نقاط." },
        { key: "useCube", label: "نرد المضاعفة", type: "toggle", hint: "يمكن للاعب مضاعفة الرهان قبل الرمي؛ الخصم يقبل أو ينسحب." },
      ],
      summary(options) {
        const parts = [];
        if (options.matchTo7 !== false) parts.push("مباراة إلى ٧");
        if (options.useCube !== false) parts.push("نرد مضاعفة");
        return parts.join(" · ") || "لعبة واحدة";
      },
    },

    rules: {
      goal: "أخرج قطعك الخمس عشرة من اللوحة قبل خصمك. تحرّك كل لاعب في اتجاه ثابت حول أربعة أرباع اللوحة، وتحدّد أرقام النرد عدد النقاط التي تتحركها القطع. من يُخرج كل قطعه أولًا يفوز، وتُسجّل النقاط بحسب نوع الفوز: عادي أو غامون أو باكغامون.",
      facts: [
        ["القطع", "١٥ لكل لاعب"],
        ["النقاط", "٢٤ نقطة"],
        ["النرد", "نردان سداسيان"],
        ["اللاعبون", "لاعبان"],
      ],
      components: [
        "لوحة تحمل ٢٤ نقطة مثلثة موزعة على أربعة أرباع، وشريط أفقي في المنتصف، ومنطقة إخراج لكل لاعب.",
        "١٥ قطعة عاجية و١٥ قطعة مرجانية، لكل لاعب لون ثابت.",
        "نردان سداسيان، وتُستخدم الأرقام الظاهرة لتحديد الحركات.",
        "نرد مضاعفة اختياري (Doubling Cube) يرفع قيمة اللعبة، ومباراة إلى ٧ نقاط.",
        "النسخة الرقمية تدير النرد والإطاحة ودخول الشريط والإخراج تلقائيًا، وتعرض عدّاد القطع في كل منطقة.",
      ],
      setup: [
        "يُرتب العاجي قطعه: ٢ على النقطة ٢٤، و٥ على ١٣، و٣ على ٨، و٥ على ٦.",
        "يرتّب المرجاني قطعه: ٢ على النقطة ١، و٥ على ١٢، و٣ على ١٧، و٥ على ١٩.",
        "يتحرك العاجي في اتجاه ٢٤ ← ١، ويتحرك المرجاني في الاتجاه المقابل ١ ← ٢٤. منزلهما هو الربع الأخير في مسارهما: ١–٦ للعاجي، و١٩–٢٤ للمرجاني.",
        "يبدأ اللاعب الأول بدوره، ثم يتبادل اللاعبان الأدوار بعد كل رمي واستهلاك الحركات المتاحة.",
        "في كل دور يرمي اللاعب النردين معًا. إذا ظهر الرقمان متساويين (دبل)، يحصل على أربع حركات بذلك الرقم.",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ النردين في بداية دورك. كل رقم ناتج يمنحك حركة منفصلة بعدد نقاط مساوٍ له، ويمكنك استخدام الرقمين بالترتيب الذي تختاره.",
        "<strong>التحريك:</strong> اختر قطعة من نقاطك، ثم نقطة الوجهة. تتحرك القطعة بعدد نقاط أحد النردين في اتجاه مسارك فقط، ولا يمكنها الرجوع للخلف.",
        "<strong>الدبل:</strong> عند تكرار الرقم نفسه تُلعب أربع حركات بذلك الرقم، ويجب محاولة استخدامها جميعًا ما دامت قانونية.",
        "<strong>النقاط المسدودة:</strong> لا يمكنك الوقوف على نقطة يشغلها الخصم بقطعتين أو أكثر. يمكنك المرور عبرها دون التوقف، لكن لا يمكنك الهبوط عليها.",
        "<strong>الإطاحة:</strong> إذا هبطت على نقطة فيها قطعة خصم واحدة فقط (بلوت)، تُطاح تلك القطعة إلى الشريط وتعود من بداية مسار صاحبها. القطعة المُطاحة لا تُخرج من الحساب؛ يجب على صاحبها إدخالها من جديد.",
        "<strong>دخول الشريط:</strong> إذا كانت لديك قطعة على الشريط، فيجب إدخالها قبل تحريك أي قطعة أخرى. يدخل العاجي على النقطة ٢٥ ناقص الرقم (أي من ١٩ إلى ٢٤)، ويدخل المرجاني على النقطة المساوية للرقم (من ١ إلى ٦). إذا كانت نقطة الدخول مسدودة جرّب الرقم الآخر، وإن تعذّر الرقمان خسر الدور.",
        "<strong>استخدام أكبر عدد من الحركات:</strong> يجب استخدام أكبر عدد ممكن من أرقام النرد. إذا أمكن استخدام رقم واحد فقط، وكان كل رقم صالحًا بمفرده، فيجب استخدام الرقم الأكبر. لا يجوز التوقف طوعًا قبل استهلاك الحركات القانونية.",
        "<strong>الإخراج:</strong> عندما تكون كل قطعك في منطقتك الأم (١–٦ للعاجي، ١٩–٢٤ للمرجاني) تبدأ إخراجها. يخرج الرقم المساوي للمسافة القطعة مباشرة. إذا كان الرقم أكبر من المسافة المتبقية، يجوز الإخراج فقط إذا لم تكن هناك قطعة أبعد عن الإخراج في منطقتك.",
        "<strong>إنهاء الدور:</strong> بعد استهلاك النرد أو عند تعذّر أي حركة قانونية ينتقل الدور تلقائيًا. في النسخة الرقمية لا حاجة لزر تأكيد بعد كل حركة.",
      ],
      winning: "يفوز أول لاعب يُخرج كل قطعه الخمس عشرة. إذا فاز الخصم قبل أن يُخرج أي قطعة تكون النتيجة غامون (نقطتان). وإذا كان الخصم لم يُخرج أي قطعة ولديه قطعة على الشريط أو داخل منطقة الفائز تكون النتيجة باكغامون (ثلاث نقاط). الفوز العادي نقطة واحدة. تُضرب النقاط في قيمة نرد المضاعفة، وتُجمع في مباراة إلى ٧ نقاط. عند رفض المضاعفة ينسحب الخصم وتُمنح له قيمة النرد الحالية فقط.",
      notes: [
        "نسخة رقمية لقواعد الباكغامون القياسية للاعبين اثنين على نفس الجهاز.",
        "نرد المضاعفة اختياري: يمكن مضاعفة الرهان قبل الرمي إذا كان النرد في المنتصف أو بحوزتك، ويقرر الخصم القبول أو الانسحاب. المضاعفة عن بُعد غير متاحة في اللعب الجماعي حفاظًا على قرار الخصم.",
        "المباراة الافتراضية إلى ٧ نقاط، ويبدأ الخصم اللعبة التالية بعد كل فوز. يمكن تعطيل ذلك للعب لعبة واحدة.",
        "تُفرض قاعدة أكبر استخدام ممكن للنرد تلقائيًا، وتُعطَّل الحركات التي تهدر حركة قانونية.",
        "الإطاحة ودخول الشريط والإخراج تُدار وفق القواعد نفسها دون استثناءات.",
        "تُضاء النقاط القابلة للتحريك، وتُضاء الوجهات الصالحة بعد اختيار القطعة لتسهيل اللعب المحلي.",
        "ينتهي الدور تلقائيًا عند تعذّر الحركة أو استهلاك النرد، مع إمكانية تسريع الانتقال بزر «أنهِ الدور».",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      clearAutoEnd();
      legalCache = { key: "", moves: [] };
      aiRunner = AI.runner();

      state = {
        players: api.players.slice(0, 2).map((player, index) => ({
          index,
          name: player.name,
          type: player.type === "cpu" ? "cpu" : "human",
          level: AI.level(player.level),
          isCpu: AI.isCpu(player),
        })),
        current: 0,
        turn: 1,
        phase: "roll",
        points: initialPoints(),
        bar: [0, 0],
        off: [0, 0],
        dice: [],
        rolled: [],
        selected: null,
        lastMove: null,
        recent: [],
        over: false,
        winner: null,
        result: null,
        gameNumber: 1,
        scores: [0, 0],
        cube: 1,
        cubeOwner: null,
        roundPoints: 0,
        matchOver: false,
      };

      apiRef.log(
        "بدأت طاولة الزهر — <strong>" + escape(state.players[0].name) + "</strong> بالعاجي ضد <strong>" +
        escape(state.players[1].name) + "</strong> بالمرجاني. ١٥ قطعة لكل لاعب، والدور الأول لـ" +
        escape(state.players[0].name) + ".",
        "accent"
      );
      apiRef.setStatus("دور " + state.players[0].name, "live");
      if (FX) FX.sound("place");
      render();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          get points() { return state.points; },
          get bar() { return state.bar; },
          get off() { return state.off; },
          render,
          rollDice,
          endTurn,
          performMove,
          selectSource,
          legalMovesNow,
          maxUse,
          movesForDie: (die) => legalMovesForDie(state, state.current, die),
          bestUse: (dice) => bestUseFrom(state, state.current, dice || state.dice, new Map()),
          applyMove,
          canBearOff,
          allInHome,
          initialPoints,
          finishGame,
          setDice(values) {
            if (!state) return;
            clearAutoEnd();
            state.rolled = values.slice();
            state.dice = values.slice();
            state.phase = values.length ? "move" : "roll";
            state.selected = null;
            legalCache = { key: "", moves: [] };
            render();
          },
          setPhase(phase) {
            if (!state) return;
            state.phase = phase;
            legalCache = { key: "", moves: [] };
            render();
          },
          setCurrent(index) {
            if (!state) return;
            state.current = index === 1 ? 1 : 0;
            state.selected = null;
            legalCache = { key: "", moves: [] };
            render();
          },
          setPoints(points) {
            if (!state) return;
            state.points = points.slice(0, 25);
            while (state.points.length < 25) state.points.push(0);
            legalCache = { key: "", moves: [] };
            render();
          },
          setBar(bar) {
            if (!state) return;
            state.bar = [Number(bar[0]) || 0, Number(bar[1]) || 0];
            legalCache = { key: "", moves: [] };
            render();
          },
          setOff(off) {
            if (!state) return;
            state.off = [Number(off[0]) || 0, Number(off[1]) || 0];
            render();
          },
          SIDES,
          TOP_POINTS,
          BOTTOM_POINTS,
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
          clearAutoEnd();
          state = BG.netCodec.decode(data);
          state.selected = null;
          state.dice = Array.isArray(state.dice) ? state.dice : [];
          state.rolled = Array.isArray(state.rolled) ? state.rolled : [];
          state.recent = Array.isArray(state.recent) ? state.recent : [];
          state.bar = Array.isArray(state.bar) ? state.bar : [0, 0];
          state.off = Array.isArray(state.off) ? state.off : [0, 0];
          state.scores = Array.isArray(state.scores) ? state.scores : [0, 0];
          state.cube = state.cube || 1;
          state.gameNumber = state.gameNumber || 1;
          state.phase = state.phase || "roll";
          legalCache = { key: "", moves: [] };
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
          if (state.phase === "ending") scheduleAutoEnd(900);
          render();
        },
        destroy() {
          clearAutoEnd();
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
          legalCache = { key: "", moves: [] };
        },
      };
    },
  };

  BG.register(game);
})();
