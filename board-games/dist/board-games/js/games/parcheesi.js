/* ==========================================================================
   باتشيزي — سباق البيت الكلاسيكي
   68 خانة، نردان، خروج بخمسة، حصار، أسر، ممر بيت من 7 خانات، ووصول مضبوط.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const SIDE = 18;
  const TRACK = 68;
  const HOME_LANE = 7;
  const HOME = TRACK + HOME_LANE;
  const TOKENS = 4;
  const COLORS = ["#b85b4d", "#5d8e83", "#d6a24c", "#8a7dbb"];
  const OFFSETS = { 2: [0, 34], 3: [0, 22, 45], 4: [0, 17, 34, 51] };

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  function ringCoords(n) {
    const out = [];
    for (let c = 0; c < n; c++) out.push([0, c]);
    for (let r = 1; r < n; r++) out.push([r, n - 1]);
    for (let c = n - 2; c >= 0; c--) out.push([n - 1, c]);
    for (let r = n - 2; r >= 1; r--) out.push([r, 0]);
    return out;
  }
  const COORDS = ringCoords(SIDE);

  function makePlayers() {
    return XG.players(apiRef, 4, COLORS).slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length))).map((player, index) => {
      player.color = COLORS[index];
      player.tokens = Array.from({ length: TOKENS }, (_, i) => ({ id: index + "-" + i, pos: -1 }));
      player.finished = 0;
      return player;
    });
  }

  function newState() {
    const players = makePlayers();
    return {
      players,
      offsets: OFFSETS[players.length],
      current: 0,
      phase: "roll",
      dice: null,
      used: [false, false],
      doubleExtra: false,
      extraRoll: false,
      notice: "ارمِ النردين لبدء الدور. الخروج إلى المسار يحتاج ٥.",
      last: null,
      over: false,
      winner: null,
      busy: false,
    };
  }

  function cur() { return state.players[state.current]; }

  function absolute(player, token) {
    return (state.offsets[player.index] + token.pos) % TRACK;
  }

  function roll() {
    if (!state || state.over || state.phase !== "roll" || state.busy) return null;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return null;
    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    state.used = [false, false];
    state.phase = "move";
    state.doubleExtra = d1 === d2;
    state.notice = cur().name + " رمى " + ar(d1) + " و" + ar(d2) + (d1 === d2 ? " (زوجان — دور إضافي)" : "") + ". اختر حركة.";
    apiRef.log("<strong>" + esc(cur().name) + "</strong> رمى النردين: <strong>" + ar(d1) + "</strong> و<strong>" + ar(d2) + "</strong>." + (d1 === d2 ? " زوجان!" : ""), "accent");
    render();
    if (!legalMoves().length) {
      state.notice = "لا توجد حركة قانونية بهذين النردين.";
      render();
      if (XG.cpuTurn(apiRef, state, state.current)) {
        clearTimeout(timer);
        timer = setTimeout(endTurn, AI.delay(cur().level, 0.7));
      }
    } else if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.8));
    }
    return state.dice.slice();
  }

  function hasBlockade(player, abs) {
    return state.players.some((owner) => {
      if (owner.index === player.index) return false;
      let count = 0;
      owner.tokens.forEach((token) => {
        if (token.pos >= 0 && token.pos < TRACK && absolute(owner, token) === abs) count += 1;
      });
      return count >= 2;
    });
  }

  function blockedPath(player, token, to) {
    if (token.pos < 0 || token.pos >= TRACK || to >= TRACK) return false;
    for (let step = token.pos + 1; step < to; step++) {
      const abs = (state.offsets[player.index] + step) % TRACK;
      if (hasBlockade(player, abs)) return true;
    }
    return false;
  }

  function legalMoves() {
    if (!state || !state.dice) return [];
    const player = cur();
    const out = [];
    state.dice.forEach((die, dieIndex) => {
      if (state.used[dieIndex]) return;
      player.tokens.forEach((token, tokenIndex) => {
        if (token.pos >= HOME) return;
        if (token.pos < 0) {
          if (die !== 5) return;
          const abs = state.offsets[player.index];
          if (hasBlockade(player, abs)) return;
          out.push({ die: dieIndex, token: tokenIndex, to: 0, type: "enter" });
          return;
        }
        const to = token.pos + die;
        if (to > HOME) return;
        if (to < TRACK) {
          const abs = (state.offsets[player.index] + to) % TRACK;
          if (hasBlockade(player, abs)) return;
          if (blockedPath(player, token, to)) return;
        }
        out.push({ die: dieIndex, token: tokenIndex, to, type: to === HOME ? "home" : "move" });
      });
    });
    return out;
  }

  function applyMove(dieIndex, tokenIndex) {
    if (!state || state.over || state.phase !== "move") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const move = legalMoves().find((entry) => entry.die === dieIndex && entry.token === tokenIndex);
    if (!move) return false;
    const player = cur();
    const token = player.tokens[tokenIndex];
    token.pos = move.to;
    state.used[dieIndex] = true;
    let text = player.name + " حرّك القطعة " + ar(tokenIndex + 1);
    if (move.type === "enter") text += " إلى المسار بخمسة";
    else if (move.to === HOME) text += " إلى البيت";
    else if (move.to >= TRACK) text += " في ممر البيت";
    else text += " إلى الخانة " + ar(move.to + 1);
    if (move.to === HOME) {
      player.finished += 1;
      apiRef.log("<strong>" + esc(player.name) + "</strong> أدخل القطعة " + ar(tokenIndex + 1) + " إلى البيت.", "good");
    } else {
      apiRef.log("<strong>" + esc(player.name) + "</strong> حرّك قطعة بالنرد " + ar(state.dice[dieIndex]) + ".", "accent");
    }
    if (move.to < TRACK) {
      const abs = (state.offsets[player.index] + move.to) % TRACK;
      const safe = abs % 10 === 0 || state.offsets.includes(abs);
      let captured = 0;
      if (!safe) {
        state.players.forEach((other) => {
          if (other.index === player.index) return;
          other.tokens.forEach((piece) => {
            if (piece.pos >= 0 && piece.pos < TRACK && absolute(other, piece) === abs) {
              piece.pos = -1;
              captured += 1;
            }
          });
        });
      }
      if (captured) {
        state.extraRoll = true;
        text += " وأسر " + ar(captured) + " قطعة!";
        apiRef.log("أسر! عادت " + ar(captured) + " قطعة خصم إلى البداية، ودور إضافي.", "warn");
      }
    }
    state.last = { text };
    if (player.finished >= TOKENS) {
      finish(player.index);
      return true;
    }
    const remaining = legalMoves();
    if (!remaining.length) {
      clearTimeout(timer);
      timer = setTimeout(endTurn, 620);
    }
    render();
    return true;
  }

  function endTurn() {
    if (!state || state.over) return;
    const player = cur();
    const extra = state.extraRoll || (state.doubleExtra && state.dice && state.dice[0] === state.dice[1]);
    state.extraRoll = false;
    state.doubleExtra = false;
    state.dice = null;
    state.used = [false, false];
    state.last = null;
    if (extra) {
      state.phase = "roll";
      state.notice = "دور إضافي لـ" + player.name + " — ارمِ النردين مجددًا.";
      apiRef.setStatus("دور إضافي لـ" + player.name);
      render();
      settle();
      return;
    }
    state.current = (state.current + 1) % state.players.length;
    state.phase = "roll";
    state.notice = "الدور لـ" + cur().name + " — ارمِ النردين.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function finish(winner) {
    state.over = true;
    state.phase = "over";
    state.dice = null;
    state.notice = "فاز " + state.players[winner].name + " بإدخال القطع الأربع إلى البيت!";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: p.finished * 1000 + p.tokens.reduce((sum, t) => sum + (t.pos >= 0 ? t.pos + 1 : 0), 0),
    })).sort((a, b) => b.value - a.value);
    apiRef.gameOver({
      title: "انتهت باتشيزي",
      text: "أول لاعب يدخل قطعه الأربع إلى البيت يفوز. الخروج يحتاج ٥، والوصول إلى البيت مضبوط.",
      winner: state.players[winner].name,
      icon: "🎲",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function scoreMove(move) {
    let score = 0;
    if (move.type === "enter") score += 90;
    if (move.to === HOME) score += 700;
    else if (move.to >= TRACK) score += 180 + move.to;
    else {
      score += move.to * 0.6;
      const abs = (state.offsets[state.current] + move.to) % TRACK;
      state.players.forEach((player) => {
        if (player.index === state.current) return;
        player.tokens.forEach((token) => {
          if (token.pos >= 0 && token.pos < TRACK && absolute(player, token) === abs) score += 140;
        });
      });
      const before = move.to - state.dice[move.die];
      if (before < TRACK && move.to >= TRACK) score += 120;
    }
    return score;
  }

  function aiStep() {
    if (!state || state.over || state.phase !== "move") return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const moves = legalMoves();
    if (!moves.length) { endTurn(); return; }
    const best = AI.choose(moves, scoreMove, cur().level);
    if (!best) return;
    applyMove(best.die, best.token);
    if (state && !state.over && state.phase === "move") {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 0.55));
    }
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!state || state.over) return;
        if (state.phase === "roll") roll();
        else if (state.phase === "move") aiStep();
      }, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function tokenDotsAt(abs) {
    let html = "";
    state.players.forEach((player) => {
      player.tokens.forEach((token, index) => {
        if (token.pos >= 0 && token.pos < TRACK && absolute(player, token) === abs) {
          html += '<span class="pc-dot" style="--pc:' + player.color + '" title="' + esc(player.name + " — " + ar(index + 1)) + '"></span>';
        }
      });
    });
    return html;
  }

  function boardHtml() {
    const starts = new Set(state.offsets);
    let html = "";
    for (let r = 0; r < SIDE; r++) {
      for (let c = 0; c < SIDE; c++) {
        const ringIndex = COORDS.findIndex(([rr, cc]) => rr === r && cc === c);
        if (ringIndex < 0) {
          html += '<div class="pc-void"></div>';
          continue;
        }
        const safe = ringIndex % 10 === 0;
        html += '<div class="pc-track ' + (starts.has(ringIndex) ? "is-start" : "") + (safe ? " is-safe" : "") + '">' + tokenDotsAt(ringIndex) + "</div>";
      }
    }
    return html;
  }

  function centerHtml() {
    return state.players.map((player) => {
      const slots = Array.from({ length: HOME_LANE }, (_, lane) => {
        const token = player.tokens.find((t) => t.pos === TRACK + lane);
        return '<span class="pc-home-slot">' + (token ? '<span class="pc-dot" style="--pc:' + player.color + '"></span>' : "") + "</span>";
      }).join("");
      return '<div class="pc-home-row" style="--pc:' + player.color + '">' +
        '<span class="pc-home-name">' + esc(player.name) + '</span><span class="pc-home-lane">' + slots + "</span>" +
        '<span class="pc-home-done">' + ar(player.finished) + "/" + ar(TOKENS) + "</span></div>";
    }).join("");
  }

  function dieHtml(value, used) {
    const faces = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    let cells = "";
    for (let i = 0; i < 9; i++) cells += '<i class="' + (faces[value].includes(i) ? "on" : "") + '"></i>';
    return '<span class="xg-die ' + (used ? "is-used" : "") + '" aria-label="نرد ' + ar(value) + '">' + cells + "</span>";
  }

  function movesHtml() {
    if (state.over) return "";
    if (state.phase !== "move" || !state.dice) return '<p class="xg-note">ارمِ النردين لبدء الدور.</p>';
    const moves = legalMoves();
    if (!moves.length) return '<p class="xg-note">لا توجد حركة قانونية. اضغط «إنهاء الدور».</p>';
    return '<div class="pc-moves">' + moves.map((move) => {
      const where = move.type === "enter" ? "المسار" : move.to === HOME ? "البيت" : move.to >= TRACK ? "ممر البيت" : "خانة " + ar(move.to + 1);
      return '<button type="button" class="xg-btn" data-pc-die="' + move.die + '" data-pc-token="' + move.token + '">' +
        "نرد " + ar(state.dice[move.die]) + " · قطعة " + ar(move.token + 1) + " ← " + where + "</button>";
    }).join("") + "</div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const playerRows = state.players.map((player) => {
      const yard = player.tokens.filter((t) => t.pos < 0).length;
      const track = player.tokens.filter((t) => t.pos >= 0 && t.pos < TRACK).length;
      return '<div class="pc-player ' + (state.current === player.index ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
        '<span class="xg-row">' + BG.playerProfile.playerHTML(player, "pc-player-avatar") + "<strong>" + esc(player.name) + "</strong></span>" +
        '<span class="pc-counts">' + ar(yard) + " بداية · " + ar(track) + " مسار · " + ar(player.finished) + " بيت</span></div>";
    }).join("");

    rootRef.innerHTML =
      '<div class="xg pc">' +
      XG.bar("باتشيزي", "68 خانة · نردان · ممر بيت من سبع خانات", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("الخروج", "٥"),
      ].join("")) +
      '<div class="pc-layout"><div class="pc-board-wrap"><div class="pc-board">' + boardHtml() + "</div>" +
      '<div class="pc-center"><div class="pc-home-title">بيوت اللاعبين</div>' + centerHtml() + "</div></div>" +
      '<aside class="pc-side"><div class="xg-panel pc-dice-panel">' +
      '<div class="xg-spread"><h3>النرد</h3><span class="xg-chip">' + (state.doubleExtra ? "زوجان" : state.extraRoll ? "أسر" : "") + "</span></div>" +
      '<div class="pc-dice">' + (state.dice ? state.dice.map((value, index) => dieHtml(value, state.used[index])).join("") : '<span class="pc-empty-dice">— —</span>') + "</div>" +
      '<button type="button" class="xg-btn primary pc-roll" data-pc-roll ' + (!can || state.phase !== "roll" ? "disabled" : "") + ">ارمِ النردين</button>" +
      '<button type="button" class="xg-btn pc-end" data-pc-end ' + (!can || state.phase !== "move" || legalMoves().length ? "disabled" : "") + ">إنهاء الدور</button>" +
      movesHtml() +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="pc-last">' + esc(state.last.text) + "</p>" : "") +
      "</div>" +
      '<div class="xg-panel"><h3>اللاعبون</h3>' + playerRows + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">اخرج ببطاقة نرد ٥، ولا تدخل خانة بها حصار (قطعتان لخصم). الخانات من مضاعفات ١٠ آمنة من الأسر. الوصول إلى البيت يجب أن يكون مضبوطًا، والأسر يمنح دورًا إضافيًا.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (event.target.closest("[data-pc-roll]")) { roll(); return; }
    if (event.target.closest("[data-pc-end]")) { endTurn(); return; }
    const btn = event.target.closest("[data-pc-die]");
    if (btn) applyMove(Number(btn.dataset.pcDie), Number(btn.dataset.pcToken));
  }

  const game = {
    id: "parcheesi",
    name: "باتشيزي",
    en: "PARCHEESI",
    icon: "🎲",
    accent: "#c8895d",
    cardClass: "card-parcheesi",
    tagline: "نردان و68 خانة وممرات بيت — اخرج بخمسة وأسر قطع الخصم.",
    players: "2–4",
    duration: "30–50 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة كلاسيكية: 4 قطع، خروج بـ5، حصار، أسر، وبيت مضبوط.",
      defaults: {},
      fields: [],
      summary() { return "68 خانة · نردان · 4 قطع"; },
    },

    rules: {
      goal: "كن أول من يدخل قطعه الأربع إلى البيت. تحرّك حول المسار بنردين، وأعد قطع الخصم إلى البداية، واحترس من الحصارات.",
      facts: [["المسار", "68 خانة"], ["القطع", "4 لكل لاعب"], ["النرد", "2"], ["الفوز", "4 قطع في البيت"]],
      components: [
        "لوح دائري من 68 خانة وأربعة ممرات بيت من 7 خانات.",
        "4 قطع لكل لاعب بلون مختلف.",
        "نردان وستة أوجه لكل منهما.",
      ],
      setup: [
        "تبدأ القطع في منطقة البداية خارج المسار.",
        "يبدأ اللاعب الأول ثم ينتقل الدور بالترتيب.",
        "الخروج إلى المسار يتطلب ظهور ٥ على أحد النردين.",
      ],
      steps: [
        "<strong>الرمي:</strong> ارمِ النردين، ثم حرّك قطعة واحدة بكل نرد أو قطعة واحدة بمجموع النردين حسب المتاح.",
        "<strong>الخروج:</strong> استخدم ٥ لإدخال قطعة من البداية إلى خانة الانطلاق.",
        "<strong>الأسر:</strong> إذا هبطت على قطعة خصم في خانة غير آمنة تعود قطعه إلى البداية وتحصل على دور إضافي.",
        "<strong>الحصار:</strong> قطعتان لخصم في خانة واحدة تمنعان المرور والهبوط. الخانات من مضاعفات 10 آمنة.",
        "<strong>الزوجان:</strong> رمي نردين متساويين يمنح دورًا إضافيًا بعد استخدامهما.",
        "<strong>البيت:</strong> بعد 68 خانة ادخل ممر البيت ذا السبع خانات، والوصول إلى البيت يحتاج رقمًا مضبوطًا.",
      ],
      winning: "أول لاعب يدخل قطعه الأربع إلى البيت يفوز. إذا تعذّرت الحركة يمكن إنهاء الدور.",
      notes: [
        "الحصار يتكون من قطعتين على الأقل لنفس الخصم في خانة واحدة.",
        "خانات البداية ومضاعفات 10 آمنة من الأسر.",
        "الذكاء الاصطناعي يفضل الخروج والأسر والوصول إلى البيت.",
        "هذه نسخة مبسطة من مكافأة الأسر العشرينية؛ تُستبدل بدور إضافي.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت باتشيزي. اخرج بخمسة، أسر الخصوم، وأوصل قطعك إلى البيت.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          roll,
          applyMove,
          endTurn,
          legalMoves,
          aiStep,
          forceDice(a, b) {
            state.phase = "roll";
            state.dice = [U.clamp(Number(a) || 1, 1, 6), U.clamp(Number(b) || 1, 1, 6)];
            state.used = [false, false];
            state.phase = "move";
            state.doubleExtra = state.dice[0] === state.dice[1];
            render();
          },
          setCurrent(index) { state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1); state.phase = "roll"; state.dice = null; render(); },
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
