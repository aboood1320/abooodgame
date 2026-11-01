/* ==========================================================================
   المنقلة — كalahan الكلاسيكية
   ٦ حفر لكل لاعب ومخزن، بذر عكس عقارب الساعة، أسر، ودور إضافي.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);

  const PITS = 6;
  const STORE = [12, 13];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let moveTimer = null;

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).slice(0, 2).map((player, index) => ({
      index,
      name: player.name || (index === 0 ? "الجنوب" : "الشمال"),
      type: player.type === "cpu" ? "cpu" : "human",
      level: AI.level(player.level),
      isCpu: AI.isCpu(player),
    }));
  }

  function newState(options) {
    const opts = Object.assign({ stones: 4 }, options || {});
    const stones = [3, 4, 5].indexOf(Number(opts.stones)) >= 0 ? Number(opts.stones) : 4;
    return {
      pits: new Array(12).fill(stones),
      stores: [0, 0],
      players: makePlayers(),
      current: 0,
      stones,
      turn: 1,
      phase: "play",
      notice: "دور الجنوب — اختر حفرة لتبدأ البذر.",
      last: null,
      over: false,
      winner: null,
      standings: [],
      busy: false,
      extra: false,
    };
  }

  function cur() {
    return state.players[state.current];
  }

  function ownerOf(index) {
    if (index === STORE[0]) return 0;
    if (index === STORE[1]) return 1;
    return index < PITS ? 0 : 1;
  }

  function opposite(index) {
    return index >= 0 && index < 12 ? 11 - index : null;
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

  function pitRange(seat) {
    return seat === 0 ? [0, 5] : [6, 11];
  }

  function legalPits(seat, pits) {
    const range = pitRange(seat);
    const list = [];
    for (let i = range[0]; i <= range[1]; i++) {
      if ((pits || state.pits)[i] > 0) list.push(i);
    }
    return list;
  }

  function sideEmpty(pits, seat) {
    return legalPits(seat, pits).length === 0;
  }

  /* ------------------------------ القانون ------------------------------ */

  function nextPos(index) {
    if (index === STORE[0]) return 6;
    if (index === STORE[1]) return 0;
    if (index === 5) return STORE[0];
    if (index === 11) return STORE[1];
    return index + 1;
  }

  function sow(pits, stores, seat, pit) {
    let stones = pits[pit];
    pits[pit] = 0;
    let pos = pit;
    const enemyStore = STORE[1 - seat];
    while (stones > 0) {
      pos = nextPos(pos);
      if (pos === enemyStore) continue;
      if (pos >= 12) stores[pos - 12] += 1;
      else pits[pos] += 1;
      stones -= 1;
    }
    let extra = false;
    let captured = 0;
    if (pos === STORE[seat]) {
      extra = true;
    } else if (ownerOf(pos) === seat && pits[pos] === 1) {
      const opp = opposite(pos);
      const grab = pits[opp];
      if (grab > 0) {
        pits[opp] = 0;
        pits[pos] = 0;
        stores[seat] += grab + 1;
        captured = grab + 1;
      }
    }
    return { last: pos, extra, captured };
  }

  function simMove(pits, stores, seat, pit) {
    const copy = { pits: pits.slice(), stores: stores.slice() };
    const res = sow(copy.pits, copy.stores, seat, pit);
    return { pits: copy.pits, stores: copy.stores, extra: res.extra, captured: res.captured };
  }

  function endCheck(nextPits) {
    return sideEmpty(nextPits, 0) || sideEmpty(nextPits, 1);
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function evaluate(pits, stores, seat) {
    const diff = stores[seat] - stores[1 - seat];
    const own = pits.slice(...(seat === 0 ? [0, 6] : [6, 12])).reduce((a, b) => a + b, 0);
    const enemy = pits.slice(...(seat === 0 ? [6, 12] : [0, 6])).reduce((a, b) => a + b, 0);
    return diff * 10 + (own - enemy) * 0.6;
  }

  function search(pits, stores, seat, depth, alpha, beta) {
    if (sideEmpty(pits, 0) || sideEmpty(pits, 1)) {
      const finalPits = pits.slice();
      const finalStores = stores.slice();
      for (let i = 0; i < 12; i++) {
        if (finalPits[i]) {
          finalStores[i < 6 ? 0 : 1] += finalPits[i];
          finalPits[i] = 0;
        }
      }
      const diff = finalStores[seat] - finalStores[1 - seat];
      return diff * 10;
    }
    if (depth <= 0) return evaluate(pits, stores, seat);
    const moves = legalPits(seat, pits);
    if (!moves.length) return evaluate(pits, stores, seat);
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const res = simMove(pits, stores, seat, moves[i]);
      const score = res.extra
        ? search(res.pits, res.stores, seat, depth - 1, alpha, beta)
        : -search(res.pits, res.stores, 1 - seat, depth - 1, -beta, -alpha);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseMove(seat, level) {
    const moves = legalPits(seat);
    if (level === "easy") {
      if (Math.random() < 0.55) return U.pick(moves);
      let best = moves[0];
      let bestScore = -Infinity;
      moves.forEach((pit) => {
        const res = simMove(state.pits, state.stores, seat, pit);
        const score = res.captured * 2 + (res.extra ? 3 : 0) + state.pits[opposite(pit)] * 0.4;
        if (score > bestScore) { bestScore = score; best = pit; }
      });
      return best;
    }
    const depth = level === "hard" ? 6 : 4;
    let best = moves[0];
    let bestScore = -Infinity;
    moves.forEach((pit) => {
      const res = simMove(state.pits, state.stores, seat, pit);
      const score = res.extra
        ? search(res.pits, res.stores, seat, depth - 1, -Infinity, Infinity)
        : -search(res.pits, res.stores, 1 - seat, depth - 1, -Infinity, Infinity);
      if (score > bestScore) { bestScore = score; best = pit; }
    });
    return best;
  }

  /* ------------------------------ اللعب ------------------------------ */

  function play(pit) {
    if (!state || state.over || state.busy) return false;
    const seat = state.current;
    if (legalPits(seat).indexOf(pit) < 0) return false;
    state.busy = true;
    const before = state.pits[pit];
    const res = sow(state.pits, state.stores, seat, pit);
    state.last = { seat, pit, last: res.last, captured: res.captured, extra: res.extra, count: before };
    state.busy = false;

    const playerName = state.players[seat].name;
    if (apiRef) {
      apiRef.log(
        "<strong>" + esc(playerName) + "</strong> زرع " + ar(before) + " حصاة من الحفرة " + ar(pit + 1) +
        (res.captured ? " وأسر " + ar(res.captured) + " حصاة!" : res.extra ? " وانتهى في مخزنه." : "."),
        res.captured ? "good" : "accent"
      );
    }
    if (res.captured) {
      state.notice = playerName + " أسر " + ar(res.captured) + " حصاة من الخصم!";
      if (FX) FX.sound("capture");
    } else if (res.extra) {
      state.notice = playerName + " أنهى البذر في مخزنه — دور إضافي!";
      if (FX) FX.sound("score");
    } else {
      state.notice = playerName + " زرع " + ar(before) + " حصاة.";
      if (FX) FX.sound("place");
    }

    if (sideEmpty(state.pits, 0) || sideEmpty(state.pits, 1)) {
      finish();
      return true;
    }

    if (res.extra) {
      state.turn += 1;
      state.notice += " دور إضافي.";
      renderMotion();
      settle();
      return true;
    }
    state.current = 1 - state.current;
    state.turn += 1;
    renderMotion();
    settle();
    return true;
  }

  function settle() {
    if (!state || state.over) return;
    const player = cur();
    if (!player) return;
    if (!legalPits(player.index).length) {
      state.current = 1 - state.current;
      state.notice = player.name + " لا يملك حصى — يُمرَّر الدور.";
      renderMotion();
      settle();
      return;
    }
    updateStatus();
    if (player.isCpu && cpuCanAct(player)) {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        if (!state || state.over || state.current !== player.index) return;
        const pit = chooseMove(player.index, player.level);
        play(pit);
      }, AI.delay(player.level) + 180);
    }
  }

  function finish() {
    if (!state || state.over) return;
    for (let i = 0; i < 12; i++) {
      if (state.pits[i]) {
        const own = i < 6 ? 0 : 1;
        state.stores[own] += state.pits[i];
        state.pits[i] = 0;
      }
    }
    const a = state.stores[0];
    const b = state.stores[1];
    let winner = null;
    if (a !== b) winner = state.players[a > b ? 0 : 1];
    state.over = true;
    state.winner = winner;
    state.phase = "end";
    state.standings = state.players.slice()
      .sort((x, y) => state.stores[y.index] - state.stores[x.index])
      .map((player) => ({
        name: player.name + (player === winner ? " · فائز" : ""),
        value: ar(state.stores[player.index]) + " حصاة",
      }));
    if (apiRef) {
      apiRef.log(
        "انتهت المنقلة — مخزن " + esc(state.players[0].name) + ": " + ar(a) +
        " · مخزن " + esc(state.players[1].name) + ": " + ar(b) + ".",
        winner ? "good" : "warn"
      );
      apiRef.gameOver({
        icon: "🫘",
        title: winner ? "فاز " + winner.name + "!" : "تعادل!",
        text: winner
          ? "جمع <strong>" + ar(state.stores[winner.index]) + "</strong> حصاة في مخزنه مقابل " +
            ar(state.stores[1 - winner.index]) + " للخصم."
          : "تساوى المخزنان بـ" + ar(a) + " حصاة لكل لاعب.",
        winner: winner ? winner.name : null,
        standings: state.standings,
        tone: winner ? "win" : "draw",
      });
    }
    renderMotion();
  }

  function updateStatus() {
    if (!apiRef || !state || state.over) return;
    const player = cur();
    if (player) apiRef.setStatus("دور " + player.name, "live");
  }

  /* ------------------------------ الواجهة ------------------------------ */

  function seedHTML(index, total) {
    const shown = Math.min(total, 12);
    let dots = "";
    for (let i = 0; i < shown; i++) {
      const angle = (i / Math.max(1, shown)) * Math.PI * 2;
      const radius = 26 + (i % 3) * 7;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      dots += '<i class="mc-seed" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%"></i>';
    }
    return '<span class="mc-seeds" data-count="' + total + '">' + dots +
      (total > 12 ? '<b class="mc-more">+' + ar(total - 12) + "</b>" : "") + "</span>";
  }

  function pitHTML(index, seat) {
    const total = state.pits[index];
    const mine = humanCanAct(state.players[seat]) && state.current === seat && total > 0;
    return (
      '<button type="button" class="mc-pit s' + seat + (mine ? " is-live" : "") + (state.last && state.last.pit === index ? " is-last" : "") + '"' +
      ' data-mc-pit="' + index + '"' + (mine ? "" : " disabled") +
      ' aria-label="حفرة ' + ar(index + 1) + " — " + ar(total) + ' حصاة">' +
      seedHTML(index, total) +
      '<span class="mc-count">' + ar(total) + "</span></button>"
    );
  }

  function storeHTML(seat) {
    const total = state.stores[seat];
    return (
      '<div class="mc-store s' + seat + (state.current === seat && !state.over ? " is-active" : "") + '">' +
      '<span class="mc-store-label">مخزن ' + esc(state.players[seat].name) + "</span>" +
      seedHTML(seat, total) +
      '<span class="mc-store-count">' + ar(total) + "</span></div>"
    );
  }

  function boardHTML() {
    const south = [];
    for (let i = 0; i <= 5; i++) south.push(pitHTML(i, 0));
    const north = [];
    for (let i = 11; i >= 6; i--) north.push(pitHTML(i, 1));
    return (
      '<div class="mc-board">' +
      storeHTML(1) +
      '<div class="mc-field">' +
      '<div class="mc-row is-north">' + north.join("") + "</div>" +
      '<div class="mc-row is-south">' + south.join("") + "</div>" +
      "</div>" +
      storeHTML(0) +
      "</div>"
    );
  }

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["mc-player", "p" + player.index];
      if (player.index === state.current && !state.over) classes.push("active");
      if (player.isCpu) classes.push("cpu");
      if (isOnline() && player.index === localSeat()) classes.push("mine");
      return (
        '<div class="' + classes.join(" ") + '">' +
        '<span class="mc-swatch"></span>' +
        '<span class="mc-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + ar(state.stores[player.index]) + " في المخزن" + (player.isCpu ? " · 🤖" : "") + "</small></span>" +
        '<span class="mc-store-chip">' + ar(state.stores[player.index]) + "</span></div>"
      );
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const top =
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">🫘</span><div><strong>المنقلة</strong>' +
      "<small>ابذر الحصى، أسر من الخصم، واجمع أكثر مما يجمع — بلا نرد ولا حظ</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">دور <b>' + esc(player ? player.name : "—") + "</b></span>" +
      '<span class="cg-pill">البداية <b>' + ar(state.stones) + " حصاة</b></span>" +
      '<span class="cg-pill">الحركة <b>' + ar(state.turn) + "</b></span>" +
      (state.extra ? '<span class="cg-pill">دور إضافي</span>' : "") +
      (isOnline() ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="mc-board-wrap">' +
      '<div class="mc-board-head"><span class="cg-kicker">لوحة المنقلة</span>' +
      '<span class="cg-count">٦ حفر لكل لاعب · البذر عكس عقارب الساعة</span></div>' +
      boardHTML() +
      '<p class="mc-rule-line">آخر حصاة في مخزنك = دور إضافي · آخر حصاة في حفرة فارغة من صفك = أسر الحفرة المقابلة.</p>' +
      "</section>";

    const side =
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span></div>' +
      '<div class="mc-players">' + playersHTML() + "</div></div>" +
      '<div class="mc-notice">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel mc-last"><span class="cg-kicker">آخر حركة</span>' +
      (state.last
        ? "<strong>حفرة " + ar(state.last.pit + 1) + "</strong><small>" + ar(state.last.count) + " حصاة" +
          (state.last.captured ? " · أسر " + ar(state.last.captured) : "") +
          (state.last.extra ? " · دور إضافي" : "") + "</small>"
        : "<small>لم تُزرع حصاة بعد.</small>") +
      "</div>" +
      '<div class="cg-panel mc-legend"><span class="cg-kicker">تذكير</span>' +
      "<p>حصاة واحدة تُوزّع على كل حفرة ومخزن بالتتابع، مع تخطي مخزن الخصم. تنتهي اللعبة عندما تفرغ حفر أحد اللاعبين.</p></div>" +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game mc-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div></div>";
  }

  function renderMotion() {
    if (!rootRef) return;
    const before = new Map();
    rootRef.querySelectorAll("[data-mc-pit]").forEach((el) => {
      const seeds = el.querySelector(".mc-seeds");
      before.set(el.getAttribute("data-mc-pit"), seeds ? Number(seeds.getAttribute("data-count")) || 0 : 0);
    });
    render();
    if (!before.size || !rootRef.firstElementChild) return;
    rootRef.querySelectorAll("[data-mc-pit]").forEach((el) => {
      const key = el.getAttribute("data-mc-pit");
      if (!before.has(key)) return;
      const seeds = el.querySelector(".mc-seeds");
      const now = seeds ? Number(seeds.getAttribute("data-count")) || 0 : 0;
      const old = before.get(key);
      if (now === old) return;
      const count = el.querySelector(".mc-count");
      if (count && FX) FX.pop(count, { duration: 230 });
      if (FX && now > old) {
        el.classList.add("is-sowing");
        setTimeout(() => el.classList.remove("is-sowing"), 360);
      }
      if (!seeds || !FX) return;
      seeds.querySelectorAll(".mc-seed").forEach((dot, index) => {
        FX.animate(dot, [
          { transform: "scale(.25)", opacity: 0 },
          { transform: "scale(1.12)", opacity: 1, offset: 0.7 },
          { transform: "scale(1)", opacity: 1 },
        ], { duration: 260, delay: Math.min(index * 16, 150), easing: "cubic-bezier(.2,.8,.3,1)" });
      });
    });
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function onClick(event) {
    if (!state || state.over || state.busy) return;
    const node = event.target.closest ? event.target.closest("[data-mc-pit]") : null;
    if (!node) return;
    const player = cur();
    if (!humanCanAct(player)) return;
    const pit = Number(node.getAttribute("data-mc-pit"));
    if (legalPits(player.index).indexOf(pit) < 0) {
      if (FX) FX.sound("error");
      return;
    }
    play(pit);
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const OPTIONS = { stones: 4 };

  const game = {
    id: "mancala",
    name: "المنقلة",
    en: "MANCALA",
    icon: "🫘",
    accent: "#f0b357",
    cardClass: "card-mancala",
    tagline: "ابذر الحصى حفرة بحفرة، أسر مخزون خصمك، وأغلق اللوحة بأكبر رصيد — لعبة حساب خالصة.",
    players: "2",
    duration: "15–25 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "عدد الحصى في كل حفرة عند البداية. ٤ هو العدد التقليدي.",
      defaults: OPTIONS,
      fields: [
        {
          key: "stones", label: "حصى البداية", type: "seg",
          choices: [{ value: 3, label: "٣" }, { value: 4, label: "٤" }, { value: 5, label: "٥" }],
          hint: "حصى أكثر = لعبة أطول وحسابات أغنى.",
        },
      ],
      summary(options) {
        return "منقلة ٦×٢ · " + ar(options.stones) + " حصاة لكل حفرة · الفوز بأكبر مخزون";
      },
    },

    rules: {
      goal: "اجمع أكبر عدد من الحصى في مخزنك. تنتهي اللعبة عندما تفرغ جميع حفر أحد اللاعبين، فتُنقل ما تبقّى من حفر الخصم إلى مخزنه.",
      facts: [["الحفر", "٦ لكل لاعب"], ["المخازن", "مخزن لكل لاعب"], ["البذر", "عكس عقارب الساعة"], ["الفوز", "أكبر مخزون"]],
      components: [
        "لوحة فيها صفّان من ست حفر، ومخزن كبير عند كل طرف.",
        "٤ حصى في كل حفرة عند البداية (٣ أو ٥ حسب الخيار).",
        "مخزنان: واحد لكل لاعب، لا يدخل إليه خصمه أبدًا.",
      ],
      setup: [
        "توضع الحصى بالتساوي في الحفر الاثنتي عشرة، ويبدأ المخزنان فارغين.",
        "يبدأ اللاعب الأول ثم يتبادل اللاعبان الأدوار.",
        "كل لاعب يملك الصف الأقرب إليه ومخزنه الخاص.",
      ],
      steps: [
        "<strong>الاختيار:</strong> في دورك اختر حفرة من صفك تحتوي حصى.",
        "<strong>البذر:</strong> خذ كل الحصى من الحفرة ووزّعها حصاةً واحدة على كل حفرة تالية عكس عقارب الساعة، بما في ذلك مخزنك.",
        "<strong>تخطي الخصم:</strong> لا تُوضع أي حصاة في مخزن الخصم؛ يُتخطى بالكامل.",
        "<strong>دور إضافي:</strong> إذا وقعت آخر حصاة في مخزنك، تلعب مرة أخرى فورًا.",
        "<strong>الأسر:</strong> إذا وقعت آخر حصاة في حفرة فارغة من صفك، تأخذ تلك الحصاة مع كل حصى الحفرة المقابلة في صف الخصم إلى مخزنك.",
        "<strong>النهاية:</strong> عندما تفرغ كل حفر أحد اللاعبين، ينتهي الدور وتُنقل بقية الحصى إلى صاحبها ثم يُقارن المخزنان.",
      ],
      winning: "يفوز صاحب المخزون الأكبر بعد نقل الحصى المتبقية. إذا تساوى المخزنان فاللعبة تعادل.",
      notes: [
        "الحفرة المقابلة للحفرة رقم ن من صفك هي الحفرة رقم ١٢−ن في صف الخصم.",
        "البذر يمر عبر مخزنك ثم يكمل في صف الخصم، ويتخطى مخزنه.",
        "لا يمكن الأسر إلا إذا كانت آخر حصاة في حفرة فارغة تابعة لك، وكانت الحفرة المقابلة غير فارغة.",
        "المستوى «صعب» يبحث عدة أدوار مقدمًا لتقييم الأسر والأدوار الإضافية.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      clearTimeout(moveTimer);
      state = newState(api.options || {});
      apiRef.log(
        "بدأت المنقلة — " + ar(state.stones) + " حصاة في كل حفرة. " + esc(state.players[0].name) + " يبدأ.",
        "accent"
      );
      renderMotion();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render: renderMotion,
          play,
          sow,
          simMove,
          legalPits,
          chooseMove,
          opposite,
          setPits(values) {
            if (!state) return;
            state.pits = (values || []).slice(0, 12);
            while (state.pits.length < 12) state.pits.push(0);
            renderMotion();
          },
          setStores(values) {
            if (!state) return;
            state.stores = [Number(values && values[0]) || 0, Number(values && values[1]) || 0];
            renderMotion();
          },
          setCurrent(seat) {
            if (!state) return;
            state.current = U.clamp(Number(seat) || 0, 0, 1);
            renderMotion();
          },
          finish,
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(moveTimer);
          state = BG.netCodec.decode(data);
          state.pits = Array.isArray(state.pits) ? state.pits : new Array(12).fill(0);
          state.stores = Array.isArray(state.stores) ? state.stores : [0, 0];
          state.busy = false;
          renderMotion();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          state.busy = false;
          renderMotion();
          if (!state.over) settle();
        },
        destroy() {
          clearTimeout(moveTimer);
          moveTimer = null;
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
