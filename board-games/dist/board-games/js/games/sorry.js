/* ==========================================================================
   سوري! — بطاقات الحركة والاعتذار
   60 خانة على حلقة، 4 قطع لكل لاعب، بطاقات أصلية، وبيوت بوصول مضبوط.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const SIDE = 16;
  const TRACK = 60;
  const HOME_LANE = 5;
  const HOME = TRACK + HOME_LANE;
  const START = { 2: [0, 30], 3: [0, 20, 40], 4: [0, 15, 30, 45] };
  const TOKENS = 4;
  const COLORS = ["#c85f51", "#5d8e83", "#d6a24c", "#7d8fc2"];
  const CARDS = [
    { id: 1, label: "١", text: "اخرج من البداية أو تقدم خطوة" },
    { id: 2, label: "٢", text: "اخرج من البداية أو تقدم خطوتين ثم اسحب مجددًا" },
    { id: 3, label: "٣", text: "تقدم 3 خطوات" },
    { id: 4, label: "٤", text: "تراجع 4 خطوات" },
    { id: 5, label: "٥", text: "تقدم 5 خطوات" },
    { id: 7, label: "٧", text: "تقدم 7 خطوات" },
    { id: 8, label: "٨", text: "تقدم 8 خطوات" },
    { id: 10, label: "١٠", text: "تقدم 10 خطوات" },
    { id: 11, label: "١١", text: "تقدم 11 خطوة" },
    { id: 12, label: "١٢", text: "تقدم 12 خطوة" },
    { id: "sorry", label: "اعتذار!", text: "أعد قطعة خصم إلى البداية" },
  ];

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

  function buildDeck() {
    const deck = [];
    CARDS.forEach((card) => {
      for (let i = 0; i < 4; i++) deck.push(card.id);
    });
    return U.shuffle(deck);
  }

  function newState() {
    const players = makePlayers();
    return {
      players,
      offsets: START[players.length],
      deck: buildDeck(),
      discard: [],
      current: 0,
      card: null,
      phase: "draw",
      extra: false,
      notice: "اسحب بطاقة لبدء دورك.",
      last: null,
      over: false,
      winner: null,
      moves: [],
      sorryTargets: [],
    };
  }

  function cur() { return state.players[state.current]; }

  function cardInfo(id) {
    return CARDS.find((card) => card.id === id) || CARDS[0];
  }

  function absolute(player, token) {
    return (state.offsets[player.index] + token.pos) % TRACK;
  }

  function drawCard() {
    if (!state || state.over || state.phase !== "draw") return null;
    if (state.deck.length === 0) {
      state.deck = U.shuffle(state.discard);
      state.discard = [];
      if (!state.deck.length) state.deck = buildDeck();
    }
    const card = state.deck.pop();
    state.card = card;
    state.phase = "move";
    state.moves = legalMoves(card, state.current);
    state.sorryTargets = card === "sorry" ? sorryTargets(state.current) : [];
    const info = cardInfo(card);
    state.notice = cur().name + " سحب " + info.label + " — " + info.text + ".";
    apiRef.log("<strong>" + esc(cur().name) + "</strong> سحب بطاقة <strong>" + esc(info.label) + "</strong>.", "accent");
    if (!state.moves.length && !state.sorryTargets.length) {
      state.notice = "لا توجد حركة قانونية بهذه البطاقة. يمكنك تخطي الدور.";
      apiRef.log("لا حركة قانونية؛ تخطي الدور.", "warn");
    }
    render();
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiMove, AI.delay(cur().level, 0.8));
    }
    return card;
  }

  function legalMoves(card, seat) {
    const player = state.players[seat];
    if (!player || card === "sorry") return [];
    const moves = [];
    player.tokens.forEach((token, index) => {
      if (token.pos >= HOME) return;
      if (token.pos < 0) {
        if (card === 1 || card === 2) moves.push({ token: index, to: 0, type: "enter" });
        return;
      }
      let to = null;
      if (card === 4) {
        if (token.pos < 60) to = token.pos - 4;
        if (to != null && to < 0) to = null;
      } else if (typeof card === "number") {
        to = token.pos + card;
        if (to > HOME) to = null;
      }
      if (to != null) moves.push({ token: index, to, type: card === 4 ? "back" : "forward" });
    });
    return moves;
  }

  function sorryTargets(seat) {
    const out = [];
    state.players.forEach((player) => {
      if (player.index === seat) return;
      player.tokens.forEach((token, index) => {
        if (token.pos >= 0 && token.pos < TRACK) out.push({ player: player.index, token: index });
      });
    });
    return out;
  }

  function applyMove(tokenIndex) {
    if (!state || state.over || state.phase !== "move") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const move = state.moves.find((entry) => entry.token === tokenIndex);
    if (!move) return false;
    const player = cur();
    const token = player.tokens[tokenIndex];
    token.pos = move.to;
    let text = player.name + " حرّك القطعة " + ar(tokenIndex + 1) + " إلى " + (move.to === HOME ? "البيت" : move.to >= TRACK ? "ممر البيت" : "الخانة " + ar(move.to + 1));
    if (move.to === HOME) {
      player.finished += 1;
      text += " وأكمل قطعة!";
      apiRef.log("<strong>" + esc(player.name) + "</strong> أوصل القطعة " + ar(tokenIndex + 1) + " إلى البيت.", "good");
    } else {
      apiRef.log("<strong>" + esc(player.name) + "</strong> حرّك القطعة " + ar(tokenIndex + 1) + ".", "accent");
    }
    if (move.to < TRACK) {
      const at = (state.offsets[player.index] + move.to) % TRACK;
      let bumped = 0;
      state.players.forEach((other) => {
        if (other.index === player.index) return;
        other.tokens.forEach((piece) => {
          if (piece.pos >= 0 && piece.pos < TRACK && absolute(other, piece) === at) {
            piece.pos = -1;
            bumped += 1;
          }
        });
      });
      if (bumped) {
        text += " وأعاد " + ar(bumped) + " من قطع الخصم إلى البداية!";
        apiRef.log("اصطدام! عادت " + ar(bumped) + " قطعة خصم إلى البداية.", "warn");
      }
    }
    state.last = { text };
    state.moves = [];
    state.sorryTargets = [];
    if (player.finished >= TOKENS) {
      finish(player.index);
      return true;
    }
    const extra = state.card === 2;
    state.card = null;
    if (extra) {
      state.extra = true;
      state.phase = "draw";
      state.notice = "بطاقة ٢ تمنحك سحبًا إضافيًا. اسحب مجددًا.";
      render();
      if (XG.cpuTurn(apiRef, state, state.current)) {
        clearTimeout(timer);
        timer = setTimeout(drawCard, AI.delay(cur().level, 0.7));
      }
      return true;
    }
    endTurn();
    return true;
  }

  function applySorry(targetPlayer, tokenIndex) {
    if (!state || state.over || state.phase !== "move" || state.card !== "sorry") return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    const target = state.players[targetPlayer];
    if (!target || target.index === state.current) return false;
    const token = target.tokens[tokenIndex];
    if (!token || token.pos < 0 || token.pos >= TRACK) return false;
    token.pos = -1;
    state.last = { text: cur().name + " أعاد قطعة " + target.name + " إلى البداية ببطاقة اعتذار." };
    apiRef.log("<strong>" + esc(cur().name) + "</strong> استخدم بطاقة اعتذار وأعاد قطعة <strong>" + esc(target.name) + "</strong> إلى البداية.", "warn");
    state.sorryTargets = [];
    state.card = null;
    endTurn();
    return true;
  }

  function skip() {
    if (!state || state.over || state.phase !== "move") return;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return;
    state.card = null;
    state.moves = [];
    state.sorryTargets = [];
    state.last = { text: cur().name + " لم يجد حركة وتخطى الدور." };
    endTurn();
  }

  function endTurn() {
    if (!state || state.over) return;
    state.extra = false;
    state.current = (state.current + 1) % state.players.length;
    state.phase = "draw";
    state.notice = "الدور لـ" + cur().name + " — اسحب بطاقة.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function finish(winner) {
    state.over = true;
    state.phase = "over";
    state.card = null;
    state.notice = "فاز " + state.players[winner].name + " بإيصال قطعه الأربع إلى البيت!";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: p.finished * 100 + p.tokens.filter((t) => t.pos >= TRACK).length * 10 + p.tokens.filter((t) => t.pos >= 0).length,
    })).sort((a, b) => b.value - a.value);
    apiRef.gameOver({
      title: "انتهت سوري!",
      text: "أول لاعب يوصل قطعه الأربع إلى البيت يفوز. بطاقة الاعتذار تعيد قطع الخصم إلى البداية.",
      winner: state.players[winner].name,
      icon: "🎴",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function aiMove() {
    if (!state || state.over || state.phase !== "move") return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    if (state.card === "sorry") {
      if (!state.sorryTargets.length) { skip(); return; }
      const target = state.sorryTargets.slice().sort((a, b) => {
        const pa = state.players[a.player].tokens[a.token].pos;
        const pb = state.players[b.player].tokens[b.token].pos;
        return pb - pa;
      })[0];
      applySorry(target.player, target.token);
      return;
    }
    if (!state.moves.length) { skip(); return; }
    const scored = state.moves.map((move) => {
      let score = move.to;
      if (move.to === HOME) score += 500;
      else if (move.to >= TRACK) score += 200;
      if (move.type === "enter") score += 80;
      if (move.to < TRACK) {
        const at = (state.offsets[state.current] + move.to) % TRACK;
        state.players.forEach((player) => {
          if (player.index === state.current) return;
          player.tokens.forEach((token) => {
            if (token.pos >= 0 && token.pos < TRACK && absolute(player, token) === at) score += 120;
          });
        });
      }
      return { move, score };
    }).sort((a, b) => b.score - a.score);
    applyMove(scored[0].move.token);
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!state || state.over) return;
        if (state.phase === "draw") drawCard();
        else if (state.phase === "move") aiMove();
      }, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function tokenDotsAt(abs) {
    let html = "";
    state.players.forEach((player) => {
      player.tokens.forEach((token, index) => {
        if (token.pos >= 0 && token.pos < TRACK && absolute(player, token) === abs) {
          html += '<span class="sy-dot" style="--pc:' + player.color + '" title="' + esc(player.name + " — قطعة " + ar(index + 1)) + '"></span>';
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
          html += '<div class="sy-void"></div>';
          continue;
        }
        const isStart = starts.has(ringIndex);
        html += '<div class="sy-track ' + (isStart ? "is-start" : "") + '">' + tokenDotsAt(ringIndex) + "</div>";
      }
    }
    return html;
  }

  function centerHtml() {
    return state.players.map((player) => {
      const slots = Array.from({ length: HOME_LANE }, (_, lane) => {
        const token = player.tokens.find((t) => t.pos === TRACK + lane);
        return '<span class="sy-home-slot">' + (token ? '<span class="sy-dot" style="--pc:' + player.color + '"></span>' : "") + "</span>";
      }).join("");
      return '<div class="sy-home-row" style="--pc:' + player.color + '">' +
        '<span class="sy-home-name">' + esc(player.name) + "</span>" +
        '<span class="sy-home-lane">' + slots + "</span>" +
        '<span class="sy-home-done">' + ar(player.finished) + "/" + ar(TOKENS) + "</span></div>";
    }).join("");
  }

  function movesHtml() {
    if (state.over) return "";
    if (state.phase !== "move") return '<p class="sy-msg">اضغط «اسحب بطاقة» لبدء دورك.</p>';
    if (state.card === "sorry") {
      if (!state.sorryTargets.length) return '<p class="sy-msg">لا توجد قطع خصم على المسار. يمكنك تخطي الدور.</p>';
      return '<div class="sy-targets">' + state.sorryTargets.map((target) => {
        const player = state.players[target.player];
        const token = player.tokens[target.token];
        return '<button type="button" class="xg-btn" data-sy-sorry="' + target.player + ":" + target.token + '">' +
          esc(player.name) + " — قطعة " + ar(target.token + 1) + " (" + (token.pos >= TRACK ? "ممر البيت" : "خانة " + ar(token.pos + 1)) + ")</button>";
      }).join("") + "</div>";
    }
    if (!state.moves.length) return '<p class="sy-msg">لا توجد حركة قانونية. اضغط «تخطَّ الدور».</p>';
    return '<div class="sy-targets">' + state.moves.map((move) => {
      const where = move.to === HOME ? "البيت" : move.to >= TRACK ? "ممر البيت" : "خانة " + ar(move.to + 1);
      return '<button type="button" class="xg-btn" data-sy-move="' + move.token + '">القطعة ' + ar(move.token + 1) + " ← " + where + "</button>";
    }).join("") + "</div>";
  }

  function render() {
    if (!rootRef || !state) return;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const info = state.card ? cardInfo(state.card) : null;
    const playerRows = state.players.map((player) => {
      const yard = player.tokens.filter((t) => t.pos < 0).length;
      const track = player.tokens.filter((t) => t.pos >= 0 && t.pos < TRACK).length;
      return '<div class="sy-player ' + (state.current === player.index ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
        '<span class="xg-row"><span class="sy-swatch"></span><strong>' + esc(player.name) + "</strong></span>" +
        '<span class="sy-counts">' + ar(yard) + " بداية · " + ar(track) + " مسار · " + ar(player.finished) + " بيت</span></div>";
    }).join("");

    rootRef.innerHTML =
      '<div class="xg sy">' +
      XG.bar("سوري!", "اسحب، تحرّك، واعِد خصومك إلى البداية", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("البطاقات", ar(state.deck.length)),
      ].join("")) +
      '<div class="sy-layout"><div class="sy-board-wrap"><div class="sy-board">' + boardHtml() + "</div>" +
      '<div class="sy-center"><div class="sy-home-title">ممرات البيت</div>' + centerHtml() + "</div></div>" +
      '<aside class="sy-side"><div class="xg-panel sy-draw-panel">' +
      '<div class="xg-spread"><h3>بطاقة الدور</h3><span class="xg-chip">' + (state.extra ? "سحب إضافي" : "") + "</span></div>" +
      '<div class="sy-card ' + (info ? "is-drawn" : "") + '"><span class="sy-card-rank">' + (info ? info.label : "؟") + "</span>" +
      '<span class="sy-card-text">' + (info ? info.text : "لم تُسحب بعد") + "</span></div>" +
      '<button type="button" class="xg-btn primary sy-draw" data-sy-draw ' + (!can || state.phase !== "draw" ? "disabled" : "") + ">اسحب بطاقة</button>" +
      '<button type="button" class="xg-btn sy-skip" data-sy-skip ' + (!can || state.phase !== "move" ? "disabled" : "") + ">تخطَّ الدور</button>" +
      movesHtml() +
      '<p class="sy-msg">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="sy-last">' + esc(state.last.text) + "</p>" : "") +
      "</div>" +
      '<div class="xg-panel"><h3>اللاعبون</h3>' + playerRows + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">1 أو 2 يُخرج قطعة من البداية. 2 يمنح سحبًا إضافيًا. الاعتذار يعيد قطعة خصم إلى البداية. الوصول إلى البيت يجب أن يكون مضبوطًا.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    if (event.target.closest("[data-sy-draw]")) { drawCard(); return; }
    if (event.target.closest("[data-sy-skip]")) { skip(); return; }
    const move = event.target.closest("[data-sy-move]");
    if (move) { applyMove(Number(move.dataset.syMove)); return; }
    const target = event.target.closest("[data-sy-sorry]");
    if (target) {
      const [player, token] = target.dataset.sySorry.split(":").map(Number);
      applySorry(player, token);
    }
  }

  const game = {
    id: "sorry",
    name: "سوري!",
    en: "SORRY!",
    icon: "🎴",
    accent: "#cf796c",
    cardClass: "card-sorry",
    tagline: "بطاقات تحرك قطعك أو تعيد خصومك إلى البداية — أول من يُكمل قطعه الأربع يفوز.",
    players: "2–4",
    duration: "20–40 دقيقة",
    complexity: "سهلة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة كلاسيكية مبسطة: 60 خانة، 5 خانات بيت، و4 قطع لكل لاعب.",
      defaults: {},
      fields: [],
      summary() { return "60 خانة · 4 قطع · بطاقات"; },
    },

    rules: {
      goal: "كن أول من يوصل قطعه الأربع إلى البيت. تحرّك بالبطاقات، وأعد قطع الخصم إلى البداية عند الهبوط عليها أو باستخدام بطاقة الاعتذار.",
      facts: [["الخانات", "60"], ["القطع", "4 لكل لاعب"], ["البيت", "5 خانات"], ["الفوز", "4 قطع في البيت"]],
      components: [
        "لوح بحلقة من 60 خانة وخمس خانات بيت لكل لاعب.",
        "4 قطع لكل لاعب بألوان مختلفة.",
        "مجموعة بطاقات: 1، 2، 3، 4، 5، 7، 8، 10، 11، 12، وبطاقة اعتذار (أربع نسخ لكل بطاقة).",
      ],
      setup: [
        "تبدأ جميع القطع في منطقة البداية خارج المسار.",
        "تخلط البطاقات وتوضع مقلوبة، ويسحب كل لاعب في دوره.",
        "يبدأ اللاعب الأول ثم ينتقل الدور باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>1 أو 2:</strong> أخرج قطعة من البداية إلى خانة الانطلاق، أو حرّك قطعة موجودة.",
        "<strong>2:</strong> بعد الحركة اسحب بطاقة إضافية.",
        "<strong>3، 5، 7، 8، 10، 11، 12:</strong> تقدم القطعة بعدد الخانات.",
        "<strong>4:</strong> تراجع القطعة أربع خانات.",
        "<strong>الاعتذار:</strong> اختر قطعة خصم على المسار وأعدها إلى البداية.",
        "<strong>الاصطدام:</strong> إذا هبطت على قطعة خصم تعود إلى البداية.",
        "<strong>البيت:</strong> يجب أن يكون الوصول إلى البيت مضبوطًا؛ الرمية الزائدة لا تُحرّك القطعة.",
      ],
      winning: "أول لاعب يدخل قطعه الأربع إلى البيت يفوز. إذا نفدت البطاقات تُخلط المكدسة وتُستخدم مجددًا.",
      notes: [
        "لا توجد خانات آمنة في هذه النسخة المبسطة؛ كل هبوط على خصم يعيده إلى البداية.",
        "بطاقة الاعتذار لا تحرّك قطعة اللاعب نفسه، بل تعيد قطعة خصم فقط.",
        "في اللعب الشبكي تُزامَن الحالة كاملة، وتُخفى البطاقات غير المسحوبة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت سوري! مع " + ar(state.players.length) + " لاعبين. اسحب بطاقة في كل دور.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          drawCard,
          applyMove,
          applySorry,
          skip,
          aiMove,
          legalMoves,
          forceCard(card) {
            state.phase = "draw";
            state.card = null;
            state.deck.push(card);
            drawCard();
          },
          setCurrent(index) { state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1); state.phase = "draw"; state.card = null; render(); },
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
