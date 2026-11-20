/* ==========================================================================
   السلم والثعبان — سباق المئة
   لوحة من ١٠٠ خانة، سلالم ترفعك وثعابين تُنزلك، وحركة نرد مرئية خطوة بخطوة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = [
    { name: "الأحمر", css: "#e2655d" },
    { name: "الأزرق", css: "#5c8fd6" },
    { name: "الأخضر", css: "#5cb07c" },
    { name: "الذهبي", css: "#d9a94e" },
  ];
  const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
  const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
  const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  function ar(value) {
    return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  const esc = (value) => U.escape(value);

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let moveTimer = null;
  let specialTimer = null;
  let autoTimer = null;
  let rollTimer = null;
  let tumbleTimer = null;
  let tumbleFaces = [];
  let bigDie = null;

  const TUMBLE_MS = 600;
  const HOLD_MS = 220;
  const DIE_DOTS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };

  function cellCenter(n) {
    const row = Math.floor((n - 1) / 10);
    const offset = (n - 1) % 10;
    const col = row % 2 === 0 ? offset : 9 - offset;
    const top = 9 - row;
    return { x: ((col + 0.5) / 10) * 100, y: ((top + 0.5) / 10) * 100, row: top, col };
  }

  /* ------------------------------ الحالة ------------------------------ */

  function makePlayers() {
    return (apiRef.players || []).slice(0, 4).map((player, index) => {
      const baseColor = COLORS[index];
      const profile = BG.playerProfile.normalize(player.profile || BG.playerProfile.defaultFor(index, AI.isCpu(player)));
      return {
        index,
        name: player.name || "اللاعب " + (index + 1),
        profile,
        avatar: BG.playerProfile.avatarEmoji(profile.avatar),
        profileColor: player.profileColor || "",
        color: player.profileColor ? Object.assign({}, baseColor, { css: player.profileColor }) : baseColor,
        type: player.type === "cpu" ? "cpu" : "human",
        level: AI.level(player.level),
        isCpu: AI.isCpu(player),
        pos: 0,
        rolls: 0,
        ladders: 0,
        snakes: 0,
      };
    });
  }

  function newState(options) {
    const opts = Object.assign({ exactFinish: true, sixAgain: true }, options || {});
    return {
      players: makePlayers(),
      current: 0,
      dice: null,
      phase: "roll",
      rolls: 0,
      exactFinish: opts.exactFinish !== false,
      sixAgain: opts.sixAgain !== false,
      notice: "ارمِ النرد لتبدأ السباق من خارج اللوحة.",
      last: null,
      over: false,
      winner: null,
      standings: [],
      busy: false,
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
    if (state.current !== player.index || state.phase !== "roll") return false;
    if (isOnline()) return apiRef.net.seat === player.index && !apiRef.net.isCpuSeat(player.index);
    return !player.isCpu;
  }

  function cpuCanAct(player) {
    return !!player && player.isCpu && AI.autoAllowed(apiRef, player) && state.current === player.index;
  }

  /* ------------------------------ اللعب ------------------------------ */

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function setFace(dieEl, value) {
    if (!dieEl) return;
    const on = new Set(DIE_DOTS[value] || []);
    dieEl.querySelectorAll(".ld-pip").forEach((pip, i) => pip.classList.toggle("is-on", on.has(i)));
  }

  /* إيقاف أي تدحرج جارٍ وإزالة النرد الكبير من اللوحة */
  function clearRoll() {
    clearTimeout(rollTimer);
    rollTimer = null;
    clearInterval(tumbleTimer);
    tumbleTimer = null;
    if (bigDie && bigDie.parentNode) bigDie.parentNode.removeChild(bigDie);
    bigDie = null;
    tumbleFaces = [];
  }

  /* نرد كبير يسقط فوق اللوحة ويدور وتتبدّل أوجهه، مع تدوير نرد الزر أيضًا */
  function startTumble() {
    const board = rootRef && rootRef.querySelector(".sn-board");
    if (!board) return;
    const holder = document.createElement("div");
    holder.className = "sn-bigdie";
    holder.setAttribute("aria-hidden", "true");
    holder.innerHTML = dieHTML(1 + Math.floor(Math.random() * 6));
    board.appendChild(holder);
    bigDie = holder;
    const small = rootRef.querySelector(".sn-actions .ld-die");
    tumbleFaces = [holder.querySelector(".ld-die"), small].filter(Boolean);
    let last = 0;
    tumbleTimer = setInterval(() => {
      let v;
      do { v = 1 + Math.floor(Math.random() * 6); } while (v === last);
      last = v;
      tumbleFaces.forEach((face) => setFace(face, v));
    }, 70);
    if (holder.animate) {
      holder.animate(
        [
          { transform: "translate(-50%,-190%) rotate(0deg) scale(0.6)", opacity: 0, offset: 0 },
          { transform: "translate(-50%,-50%) rotate(260deg) scale(1.15)", opacity: 1, offset: 0.35 },
          { transform: "translate(-50%,-85%) rotate(430deg) scale(1.05)", opacity: 1, offset: 0.55 },
          { transform: "translate(-50%,-50%) rotate(610deg) scale(1.1)", opacity: 1, offset: 0.78 },
          { transform: "translate(-50%,-50%) rotate(720deg) scale(1)", opacity: 1, offset: 1 },
        ],
        { duration: TUMBLE_MS, easing: "ease-out", fill: "forwards" }
      );
    }
    if (small && small.animate) {
      small.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: TUMBLE_MS / 2, iterations: 2 }
      );
    }
  }

  /* استقرار النرد على الرقم النهائي مع نبضة قصيرة */
  function landTumble(value) {
    clearInterval(tumbleTimer);
    tumbleTimer = null;
    tumbleFaces.forEach((face) => setFace(face, value));
    if (bigDie && bigDie.animate) {
      bigDie.animate(
        [
          { transform: "translate(-50%,-50%) scale(1.22)" },
          { transform: "translate(-50%,-50%) scale(1)" },
        ],
        { duration: HOLD_MS, easing: "cubic-bezier(.3,.7,.35,1)" }
      );
    }
  }

  function roll() {
    if (!state || state.over || state.busy || state.phase !== "roll") return null;
    const player = cur();
    const value = 1 + Math.floor(Math.random() * 6);
    clearTimeout(autoTimer);
    autoTimer = null;
    state.dice = value;
    state.rolls += 1;
    player.rolls += 1;
    state.phase = "wait";
    state.busy = true;
    const quick = reducedMotion();
    state.notice = quick ? player.name + " رمى " + ar(value) + "…" : player.name + " يرمي النرد…";
    if (FX) FX.dice(value);
    renderMotion();
    if (quick) {
      afterRoll(player, value);
      return value;
    }
    clearRoll();
    startTumble();
    rollTimer = setTimeout(() => {
      if (!state || state.over) return;
      landTumble(value);
      rollTimer = setTimeout(() => {
        rollTimer = null;
        clearRoll();
        if (!state || state.over) return;
        afterRoll(player, value);
      }, HOLD_MS);
    }, TUMBLE_MS);
    return value;
  }

  /* بعد انتهاء حركة النرد: سجل الرمية ثم تحريك القطعة */
  function afterRoll(player, value) {
    if (!state || state.over) return;
    state.notice = player.name + " رمى " + ar(value) + "…";
    if (apiRef) apiRef.log("<strong>" + esc(player.name) + "</strong> رمى النرد: <strong>" + ar(value) + "</strong>.", "accent");
    renderMotion();
    const landed = rootRef && rootRef.querySelector(".sn-actions .ld-die");
    if (landed && landed.animate && !reducedMotion()) {
      landed.animate(
        [{ transform: "scale(1.35) rotate(-14deg)" }, { transform: "scale(1) rotate(0deg)" }],
        { duration: 260, easing: "cubic-bezier(.3,.7,.35,1)" }
      );
    }

    const target = player.pos + value;
    if (target > 100 && state.exactFinish) {
      state.busy = false;
      state.phase = "pass";
      state.notice = player.name + " يحتاج رقمًا مضبوطًا للوصول إلى ١٠٠ — بقي في الخانة " + ar(player.pos) + ".";
      if (apiRef) apiRef.log("الرمية تتجاوز ١٠٠ — لا حركة في وضع الوصول المضبوط.", "warn");
      renderMotion();
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        autoTimer = null;
        endTurn(value === 6 && state.sixAgain);
      }, 700);
      return value;
    }

    const finish = Math.min(100, target);
    animateSteps(player, finish, () => {
      if (!state || state.over) return;
      resolveSpecial(player);
    });
    return value;
  }

  function animateSteps(player, target, done) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      player.pos = target;
      renderMotion();
      if (FX) FX.sound("place");
      done();
      return;
    }
    const step = () => {
      if (!state || state.over) return;
      if (player.pos < target) {
        player.pos += 1;
        if (FX && player.pos % 2 === 0) FX.sound("step");
        renderMotion();
        moveTimer = setTimeout(() => {
          moveTimer = null;
          step();
        }, 105);
        return;
      }
      if (FX) FX.sound("place");
      done();
    };
    step();
  }

  function resolveSpecial(player) {
    const at = player.pos;
    let jump = null;
    if (LADDERS[at]) {
      jump = { type: "ladder", to: LADDERS[at] };
      player.ladders += 1;
    } else if (SNAKES[at]) {
      jump = { type: "snake", to: SNAKES[at] };
      player.snakes += 1;
    }

    if (jump) {
      state.notice = player.name + " " + (jump.type === "ladder" ? "صعد سلمًا" : "لدغه ثعبان") +
        " من " + ar(at) + " إلى " + ar(jump.to) + "!";
      if (apiRef) {
        apiRef.log(
          "<strong>" + esc(player.name) + "</strong> " +
          (jump.type === "ladder" ? "صعد سلمًا" : "هبط بثعبان") +
          " من الخانة " + ar(at) + " إلى " + ar(jump.to) + ".",
          jump.type === "ladder" ? "good" : "warn"
        );
      }
      if (FX) {
        FX.sound(jump.type === "ladder" ? "ladder" : "snake");
        FX.banner(jump.type === "ladder" ? "سلم!" : "ثعبان!", {
          icon: jump.type === "ladder" ? "🪜" : "🐍",
          tone: jump.type === "ladder" ? "win" : "warn",
          duration: 1000,
        });
      }
      state.busy = true;
      renderMotion();
      clearTimeout(specialTimer);
      specialTimer = setTimeout(() => {
        specialTimer = null;
        if (!state || state.over) return;
        player.pos = jump.to;
        renderMotion();
        afterSpecial(player, jump);
      }, 520);
      return;
    }
    afterSpecial(player, null);
  }

  function afterSpecial(player, jump) {
    if (player.pos >= 100) {
      state.busy = false;
      win(player);
      return;
    }
    const extra = state.sixAgain && state.dice === 6;
    state.busy = false;
    renderMotion();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      endTurn(extra);
    }, 520);
  }

  function endTurn(extra) {
    if (!state || state.over) return;
    const player = cur();
    state.phase = "roll";
    state.dice = null;
    state.busy = false;
    if (extra) {
      state.notice = "دور إضافي لـ" + player.name + " بعد رمي ٦.";
      if (apiRef) apiRef.log("دور إضافي لـ<strong>" + esc(player.name) + "</strong> بعد ٦.", "accent");
      renderMotion();
      settle();
      return;
    }
    state.current = (state.current + 1) % state.players.length;
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
        autoTimer = null;
        if (!state || state.over || state.current !== player.index || state.phase !== "roll") return;
        roll();
      }, AI.delay(player.level));
    }
  }

  function win(player) {
    if (!state || state.over) return;
    state.over = true;
    state.winner = player.index;
    state.phase = "end";
    state.notice = player.name + " وصل إلى الخانة ١٠٠!";
    state.standings = state.players.slice()
      .sort((a, b) => b.pos - a.pos)
      .map((item) => ({
        name: item.name + (item === player ? " · فائز" : ""),
        value: "الخانة " + ar(item.pos) + " · " + ar(item.rolls) + " رمية",
      }));
    if (apiRef) {
      apiRef.gameOver({
        icon: "🪜",
        title: "فاز " + player.name + "!",
        text: "وصل إلى الخانة ١٠٠ بعد " + ar(player.rolls) + " رمية، بصعود " + ar(player.ladders) + " سلالم و" + ar(player.snakes) + " ثعابين.",
        winner: player.name,
        standings: state.standings,
        tone: "win",
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

  function boardHTML() {
    let cells = "";
    for (let n = 1; n <= 100; n++) {
      const c = cellCenter(n);
      const classes = ["sn-cell"];
      if (n % 2 === 0) classes.push("is-alt");
      if (n === 1) classes.push("is-start");
      if (n === 100) classes.push("is-finish");
      if (LADDERS[n]) classes.push("is-ladder");
      if (SNAKES[n]) classes.push("is-snake");
      cells += '<span class="' + classes.join(" ") + '" style="grid-row:' + (c.row + 1) + ";grid-column:" + (c.col + 1) + '">' +
        '<b class="sn-num">' + ar(n) + "</b>" +
        (LADDERS[n] ? '<i class="sn-mark is-up">↑</i>' : "") +
        (SNAKES[n] ? '<i class="sn-mark is-down">↓</i>' : "") +
        "</span>";
    }
    return cells;
  }

  /* ألوان جلود الثعابين: لكل ثعبان لون مختلف يسهّل تمييزه على اللوحة */
  const SNAKE_SKINS = [
    { body: "#3faa63", edge: "#16502d", dot: "#d4f5ae" },
    { body: "#8c5ed3", edge: "#3b2169", dot: "#e6d4ff" },
    { body: "#e48a2c", edge: "#793c05", dot: "#ffe4b0" },
    { body: "#2aa4b6", edge: "#0d4852", dot: "#c4f3f8" },
    { body: "#d4514e", edge: "#6a1513", dot: "#ffd6cf" },
    { body: "#c8aa2a", edge: "#5a4a08", dot: "#fff4b0" },
  ];

  const r2 = (n) => String(Math.round(n * 100) / 100);

  function lineSVG(x1, y1, x2, y2, stroke, width) {
    return '<line x1="' + r2(x1) + '" y1="' + r2(y1) + '" x2="' + r2(x2) + '" y2="' + r2(y2) +
      '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round"/>';
  }

  /* سلم خشبي: ظل، درجات، عمودان بحافة داكنة ولمعة فاتحة */
  function ladderSVG(fromCell, toCell) {
    const a = cellCenter(fromCell);
    const b = cellCenter(toCell);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = (-dy / len) * 1.5;
    const ny = (dx / len) * 1.5;
    const count = Math.max(3, Math.round(len / 4.4));
    const rungs = [];
    for (let i = 1; i <= count; i++) {
      const t = (i - 0.5) / count;
      const x = a.x + dx * t;
      const y = a.y + dy * t;
      rungs.push([x + nx, y + ny, x - nx, y - ny]);
    }
    const rails = [
      [a.x + nx, a.y + ny, b.x + nx, b.y + ny],
      [a.x - nx, a.y - ny, b.x - nx, b.y - ny],
    ];
    const draw = (list, stroke, width, shiftX, shiftY) => list.map((l) =>
      lineSVG(l[0] + (shiftX || 0), l[1] + (shiftY || 0), l[2] + (shiftX || 0), l[3] + (shiftY || 0), stroke, width)
    ).join("");
    return '<g class="sn-ladder">' +
      '<g transform="translate(0.45 0.65)" opacity="0.3">' + draw(rails, "#000", 1.1) + draw(rungs, "#000", 0.7) + "</g>" +
      draw(rungs, "#7a4a1a", 0.62) +
      draw(rungs, "#d9a45c", 0.32) +
      draw(rails, "#5d3912", 1.05) +
      draw(rails, "#a86f2e", 0.72) +
      draw(rails, "#efc98e", 0.2, -0.12, -0.12) +
      "</g>";
  }

  /* ثعبان: جسم متعرّج يضيق نحو الذيل، نقاط زخرفية، ورأس بعينين ولسان */
  function snakeSVG(fromCell, toCell, skin) {
    const a = cellCenter(fromCell);
    const b = cellCenter(toCell);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const waves = Math.max(1, Math.round(len / 15));
    const amp = Math.min(3.6, 1.4 + len * 0.035);
    const steps = Math.max(30, Math.round(len * 1.5));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const off = Math.sin(t * waves * 2 * Math.PI) * amp * Math.pow(Math.sin(Math.PI * t), 0.6);
      pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off, t });
    }
    const left = [];
    const right = [];
    const shine = [];
    const mid = [];
    pts.forEach((p, i) => {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[Math.min(steps, i + 1)];
      let tx = p1.x - p0.x;
      let ty = p1.y - p0.y;
      const tl = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tl;
      ty /= tl;
      const hw = 0.22 + 1.05 * Math.pow(1 - p.t, 0.7);
      left.push([p.x - ty * hw, p.y + tx * hw]);
      right.push([p.x + ty * hw, p.y - tx * hw]);
      shine.push([p.x - ty * hw * 0.42, p.y + tx * hw * 0.42]);
      mid.push([p.x, p.y]);
    });
    const path = (list) => list.map((q, i) => (i ? "L" : "M") + r2(q[0]) + " " + r2(q[1])).join("");
    const outline = path(left.concat(right.slice().reverse())) + "Z";
    const dots = path(mid.slice(0, Math.floor(steps * 0.86) + 1));
    const angle = (Math.atan2(pts[0].y - pts[3].y, pts[0].x - pts[3].x) * 180 / Math.PI).toFixed(1);
    const head =
      '<g transform="translate(' + r2(a.x) + " " + r2(a.y) + ") rotate(" + angle + ')">' +
      '<path d="M2.2 0H4.1M4.1 0L4.9-0.6M4.1 0L4.9 0.6" fill="none" stroke="#e23d56" stroke-width="0.24" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<ellipse cx="0.3" cy="0" rx="2.3" ry="1.75" fill="' + skin.body + '" stroke="' + skin.edge + '" stroke-width="0.34"/>' +
      '<ellipse cx="0.1" cy="-0.55" rx="1.2" ry="0.5" fill="rgba(255,255,255,0.22)"/>' +
      '<circle cx="1" cy="-0.88" r="0.5" fill="#fff" stroke="' + skin.edge + '" stroke-width="0.12"/>' +
      '<circle cx="1" cy="0.88" r="0.5" fill="#fff" stroke="' + skin.edge + '" stroke-width="0.12"/>' +
      '<circle cx="1.15" cy="-0.88" r="0.24" fill="#111"/>' +
      '<circle cx="1.15" cy="0.88" r="0.24" fill="#111"/>' +
      "</g>";
    return '<g class="sn-snake-art">' +
      '<path d="' + outline + '" transform="translate(0.4 0.6)" fill="rgba(0,0,0,0.3)"/>' +
      '<path d="' + outline + '" fill="' + skin.body + '" stroke="' + skin.edge + '" stroke-width="0.34" stroke-linejoin="round"/>' +
      '<path d="' + path(shine) + '" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.32" stroke-linecap="round"/>' +
      '<path d="' + dots + '" fill="none" stroke="' + skin.dot + '" stroke-width="0.46" stroke-linecap="round" stroke-dasharray="0 1.7" opacity="0.9"/>' +
      head + "</g>";
  }

  function overlayHTML() {
    let shapes = "";
    Object.keys(LADDERS).forEach((from) => {
      shapes += ladderSVG(Number(from), LADDERS[from]);
    });
    Object.keys(SNAKES).forEach((from, index) => {
      shapes += snakeSVG(Number(from), SNAKES[from], SNAKE_SKINS[index % SNAKE_SKINS.length]);
    });
    return '<svg class="sn-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + shapes + "</svg>";
  }

  function tokensHTML() {
    const groups = new Map();
    const items = [];
    state.players.forEach((player) => {
      const cell = player.pos <= 0 ? cellCenter(1) : cellCenter(Math.min(100, player.pos));
      const key = player.pos + "";
      const list = groups.get(key) || [];
      list.push({ player, cell });
      groups.set(key, list);
    });
    groups.forEach((list) => {
      list.forEach((item, i) => {
        const shift = (i - (list.length - 1) / 2) * 3.2;
        items.push(
          '<span class="sn-pawn' +
          (item.player.index === state.current && !state.over ? " is-current" : "") +
          (state.over && state.winner === item.player.index ? " is-winner" : "") +
          (isOnline() && item.player.index === localSeat() ? " is-mine" : "") + '"' +
          ' data-sn-pawn="' + item.player.index + '"' +
          ' style="left:' + (item.cell.x + shift * 0.75).toFixed(2) + "%;top:" + (item.cell.y + shift * 0.75).toFixed(2) + "%;--pc:" + item.player.color.css + '"' +
          ' aria-hidden="true"><span class="sn-avatar">' + U.escape(BG.playerProfile.avatarEmoji(item.player.profile)) + '</span></span>'
        );
      });
    });
    return items.join("");
  }

  function dieHTML(value) {
    const dots = DIE_DOTS[value] || [];
    const on = new Set(dots);
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="ld-pip' + (on.has(i) ? " is-on" : "") + '"></i>';
    return '<span class="ld-die' + (value ? " has-value" : "") + '" aria-hidden="true">' + cells + "</span>";
  }

  function playersHTML() {
    return state.players.map((player) => {
      const classes = ["sn-player", "p" + player.index];
      if (player.index === state.current && !state.over) classes.push("active");
      if (state.over && state.winner === player.index) classes.push("winner");
      if (player.isCpu) classes.push("cpu");
      return (
        '<div class="' + classes.join(" ") + '" style="--pc:' + player.color.css + '"' +
          (player.index === state.current && !state.over ? ' aria-current="step"' : "") + '>' +
        BG.playerProfile.playerHTML(player, "sn-player-avatar") +
        '<span class="sn-player-copy"><strong>' + esc(player.name) + "</strong>" +
        "<small>" + (state.over && state.winner === player.index ? "فائز · " : "") + (player.pos === 0 ? "البداية" : "الخانة " + ar(player.pos)) + " · " + ar(player.rolls) + " رمية · 🪜 " + ar(player.ladders) + " · 🐍 " + ar(player.snakes) + (player.isCpu ? " · 🤖" : "") + "</small></span>" +
        '<span class="sn-progress"><i style="width:' + player.pos + '%"></i></span></div>'
      );
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const canRoll = humanCanAct(player);
    const top =
      '<div class="cg-top">' +
      '<div class="cg-brand"><span class="cg-emblem">🪜</span><div><strong>السلم والثعبان</strong>' +
      "<small>ارمِ النرد، اصعد السلالم، وتجنّب الثعابين حتى الخانة ١٠٠</small></div></div>" +
      '<div class="cg-pills">' +
      '<span class="cg-pill">دور <b>' + esc(player ? player.name : "—") + "</b></span>" +
      '<span class="cg-pill">النرد <b>' + (state.dice ? ar(state.dice) : "—") + "</b></span>" +
      '<span class="cg-pill">الرميات <b>' + ar(state.rolls) + "</b></span>" +
      (isOnline() ? '<span class="cg-pill is-net">🌐 ' + (apiRef.net.isHost ? "المضيف" : "لاعب") + "</span>" : "") +
      "</div></div>";

    const board =
      '<section class="sn-board-wrap" aria-label="لوحة السلم والثعبان">' +
      '<div class="sn-board-head"><span class="cg-kicker">لوحة المئة</span>' +
      '<span class="cg-count">' + (state.exactFinish ? "وصول مضبوط" : "وصول مباشر") + " · " + (state.sixAgain ? "٦ = دور إضافي" : "٦ عادي") + "</span></div>" +
      '<div class="sn-board" role="img" aria-label="لوحة مرقمة من ١ إلى ١٠٠؛ السلالم تصعد بك والثعابين تعيدك للخلف">' + boardHTML() + overlayHTML() + '<div class="sn-pawns">' + tokensHTML() + "</div></div>" +
      '<p class="sn-rule-line">تظهر القطع غير المتحركة عند علامة البداية؛ يبدأ احتساب الحركة من الصفر. 🪜 السلم يصعد بك و🐍 الثعبان يعيدك للخلف. ' + (state.exactFinish ? "تحتاج رقمًا مضبوطًا للوصول إلى ١٠٠." : "تجاوز الخانة ١٠٠ مسموح.") + "</p>" +
      "</section>";

    const side =
      '<aside class="cg-side">' +
      '<div class="cg-panel"><div class="cg-side-head"><span class="cg-kicker">اللاعبون</span><span class="cg-count">' + ar(state.players.length) + " لاعبين</span></div>" +
      '<div class="sn-players">' + playersHTML() + "</div></div>" +
      '<div class="sn-actions">' +
      '<button type="button" class="ld-roll' + (canRoll ? " is-live" : "") + '" data-sn-roll aria-label="' + esc(canRoll ? "ارمِ النرد" : state.phase === "pass" ? "يتم تمرير الدور" : state.busy ? "جارٍ التحريك" : "بانتظار دورك") + '"' + (canRoll ? "" : " disabled") + ">" +
      dieHTML(state.dice) + "<span>" + (canRoll ? "ارمِ النرد" : state.phase === "pass" ? "يتم تمرير الدور…" : state.busy ? "جارٍ التحريك…" : "بانتظار الدور") + "</span></button>" +
      "</div>" +
      '<div class="sn-notice" role="status" aria-live="polite" aria-atomic="true">' + esc(state.notice) + "</div>" +
      '<div class="cg-panel sn-legend"><span class="cg-kicker">مسارات اللوحة</span>' +
      '<div class="sn-routes"><strong>🪜 السلالم</strong><div class="sn-route-list">' + Object.keys(LADDERS).map((n) => '<span class="sn-route-chip">' + ar(n) + " → " + ar(LADDERS[n]) + "</span>").join("") + "</div></div>" +
      '<div class="sn-routes is-snake"><strong>🐍 الثعابين</strong><div class="sn-route-list">' + Object.keys(SNAKES).map((n) => '<span class="sn-route-chip">' + ar(n) + " → " + ar(SNAKES[n]) + "</span>").join("") + "</div></div></div>" +
      "</aside>";

    rootRef.innerHTML =
      '<div class="cg-game sn-game' + (state.over ? " is-over" : "") + '">' + top +
      '<div class="cg-grid">' + board + side + "</div></div>";
  }

  function renderMotion() {
    if (!rootRef) return;
    const before = new Map();
    rootRef.querySelectorAll("[data-sn-pawn]").forEach((el) => {
      before.set(el.getAttribute("data-sn-pawn"), el.getBoundingClientRect());
    });
    render();
    if (!before.size || !rootRef.firstElementChild) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rootRef.querySelectorAll("[data-sn-pawn]").forEach((el) => {
      const old = before.get(el.getAttribute("data-sn-pawn"));
      if (!old || !el.animate) return;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      /* خطوة عادية = قفزة صغيرة؛ صعود السلم أو لدغة الثعبان = انزلاق أطول بقوس أعلى */
      const dist = Math.sqrt(dx * dx + dy * dy);
      const far = dist > 90;
      const hop = far ? Math.min(38, dist * 0.12) : 7;
      el.animate(
        [
          { transform: "translate(-50%,-50%) translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)", offset: 0 },
          { transform: "translate(-50%,-50%) translate(" + (dx / 2).toFixed(1) + "px," + (dy / 2 - hop).toFixed(1) + "px) scale(1.12)", offset: 0.5 },
          { transform: "translate(-50%,-50%)", offset: 1 },
        ],
        { duration: far ? Math.min(560, 150 + dist * 0.8) : 115, easing: "cubic-bezier(.3,.7,.35,1)" }
      );
    });
  }

  function onClick(event) {
    if (!state || state.over) return;
    const node = event.target.closest ? event.target.closest("[data-sn-roll]") : null;
    if (!node) return;
    if (humanCanAct(cur())) roll();
  }

  /* ------------------------------ التسجيل ------------------------------ */

  const OPTIONS = { exactFinish: true, sixAgain: true };

  const game = {
    id: "snakes",
    name: "السلم والثعبان",
    en: "SNAKES & LADDERS",
    icon: "🪜",
    accent: "#4cc9a4",
    cardClass: "card-snakes",
    tagline: "مئة خانة، نرد واحد، وسلالم وثعابين تقلب الموازين في كل رمية.",
    players: "2–4",
    duration: "10–25 دقيقة",
    complexity: "سهلة جدًا",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "قواعد الوصول والدور الإضافي تُطبَّق في اللعب المحلي والجماعي.",
      defaults: OPTIONS,
      fields: [
        { key: "exactFinish", label: "وصول مضبوط إلى ١٠٠", type: "toggle", hint: "إذا كان مفعّلًا تحتاج الرقم المضبوط تمامًا." },
        { key: "sixAgain", label: "٦ يمنح دورًا إضافيًا", type: "toggle" },
      ],
      summary(options) {
        return "لوحة ١٠٠ · " + (options.exactFinish ? "وصول مضبوط" : "تجاوز مسموح") + " · " + (options.sixAgain ? "٦ = دور إضافي" : "٦ عادي");
      },
    },

    rules: {
      goal: "كن أول من يصل إلى الخانة ١٠٠. تحرّك قطعك بحسب النرد، واصعد السلالم، واحذر الثعابين التي تعيدك إلى الوراء.",
      facts: [["الخانات", "١٠٠"], ["النرد", "١–٦"], ["اللاعبون", "٢–٤"], ["الفوز", "الوصول إلى ١٠٠"]],
      components: [
        "لوحة من ١٠٠ خانة مرقّمة، تمتد من ١ إلى ١٠٠ بشكل متعرّج.",
        "سلالم ترفع اللاعب من خانة إلى خانة أعلى.",
        "ثعابين تُنزل اللاعب من خانة إلى خانة أدنى.",
        "نرد واحد وقطعة لكل لاعب.",
      ],
      setup: [
        "يبدأ جميع اللاعبين من خارج اللوحة (الخانة ٠).",
        "يبدأ اللاعب الأول ثم ينتقل الدور بالترتيب.",
        "يُرمى النرد مرة واحدة في كل دور، وتُحرَّك القطعة بعدد الخانات الظاهر.",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ النرد، وتقدّم بعدد الخانات الظاهر.",
        "<strong>السلم:</strong> إذا انتهت حركتك عند أسفل سلم، اصعد فورًا إلى أعلى السلم.",
        "<strong>الثعبان:</strong> إذا انتهت حركتك عند رأس ثعبان، انزل فورًا إلى ذيله.",
        "<strong>الدور الإضافي:</strong> في القاعدة الافتراضية، رمي ٦ يمنحك رميًا إضافيًا.",
        "<strong>الوصول:</strong> في وضع الوصول المضبوط يجب أن تكون الرمية الأخيرة مساوية تمامًا للمسافة المتبقية إلى ١٠٠؛ الرمية الزائدة لا تُحرّك القطعة.",
      ],
      winning: "أول لاعب يصل إلى الخانة ١٠٠ يفوز. إذا تجاوزت الرمية ١٠٠ في وضع الوصول المضبوط، تبقى القطعة في مكانها؛ وإذا كان الدور الإضافي بعد رمية ٦ مفعّلًا، يحتفظ اللاعب بدوره.",
      notes: [
        "السلالم والثعابين موزّعة على اللوحة كما هي مرسومة، وتُطبَّق فور الوصول إلى خانتها.",
        "لا يوجد أسر أو تفاعل مباشر بين اللاعبين؛ اللعبة سباق حظ وتخطيط مسار.",
        "يمكن إيقاف قاعدة الوصول المضبوط أو قاعدة الدور الإضافي من شاشة الإعداد.",
        "الحركة تُعرض خطوة بخطوة لتوضيح المسار والانتقالات.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearRoll();
      clearTimeout(moveTimer);
      clearTimeout(specialTimer);
      clearTimeout(autoTimer);
      moveTimer = null;
      specialTimer = null;
      autoTimer = null;
      state = newState(api.options || {});
      apiRef.log(
        "بدأت لعبة السلم والثعبان مع " + ar(state.players.length) + " لاعبين. " +
        (state.exactFinish ? "الوصول إلى ١٠٠ يجب أن يكون مضبوطًا." : "يمكن تجاوز ١٠٠ للفوز."),
        "accent"
      );
      renderMotion();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get players() { return state.players; },
          render: renderMotion,
          roll,
          resolveSpecial,
          endTurn,
          cellCenter,
          setPos(index, pos) {
            if (!state || !state.players[index]) return;
            state.players[index].pos = U.clamp(Number(pos) || 0, 0, 100);
            renderMotion();
          },
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
            state.phase = "roll";
            renderMotion();
          },
          LADDERS,
          SNAKES,
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearRoll();
          clearTimeout(moveTimer);
          clearTimeout(specialTimer);
          clearTimeout(autoTimer);
          moveTimer = null;
          specialTimer = null;
          autoTimer = null;
          state = BG.netCodec.decode(data);
          if (state.winner && typeof state.winner === "object") state.winner = Number(state.winner.index);
          state.players.forEach((player) => {
            player.pos = Number(player.pos) || 0;
          });
          state.busy = false;
          renderMotion();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() {
          if (!state) return;
          if (state.phase === "pass") {
            endTurn(state.sixAgain && state.dice === 6);
            return;
          }
          state.busy = false;
          if (state.phase === "wait") state.phase = "roll";
          renderMotion();
          if (!state.over) settle();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearRoll();
          clearTimeout(moveTimer);
          clearTimeout(specialTimer);
          clearTimeout(autoTimer);
          moveTimer = null;
          specialTimer = null;
          autoTimer = null;
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
