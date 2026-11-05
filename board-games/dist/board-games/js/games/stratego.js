/* ==========================================================================
   ستراتيجو — حرب الرتب
   لوح 10×10 مع بحيرتين، 40 قطعة لكل لاعب، رتب أصلية، وكشف تدريجي.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const N = 10;
  const ARMY = [
    { rank: 10, name: "المارشال", count: 1 },
    { rank: 9, name: "الجنرال", count: 1 },
    { rank: 8, name: "العقيد", count: 2 },
    { rank: 7, name: "الرائد", count: 3 },
    { rank: 6, name: "النقيب", count: 4 },
    { rank: 5, name: "الملازم", count: 4 },
    { rank: 4, name: "الرقيب", count: 4 },
    { rank: 3, name: "المنقّب", count: 5 },
    { rank: 2, name: "الكشّاف", count: 8 },
    { rank: 1, name: "الجاسوس", count: 1 },
    { rank: 0, name: "قنبلة", count: 6, bomb: true },
    { rank: -1, name: "العلم", count: 1, flag: true },
  ];
  const RANKS = Object.fromEntries(ARMY.map((entry) => [entry.rank, entry]));
  const LAKES = new Set([42, 43, 46, 47, 52, 53, 56, 57]);
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;

  const other = (seat) => (seat === 0 ? 1 : 0);
  const inBoard = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

  function makePlayers() {
    return XG.players(apiRef, 2, ["#5d8e83", "#b85b4d"]).map((player, index) => {
      player.color = index === 0 ? "#5d8e83" : "#b85b4d";
      return player;
    });
  }

  function buildArmy(seat) {
    const pieces = [];
    let serial = 1;
    ARMY.forEach((spec) => {
      for (let i = 0; i < spec.count; i++) {
        pieces.push({
          id: seat + "-" + serial++,
          seat,
          rank: spec.rank,
          name: spec.name,
          bomb: !!spec.bomb,
          flag: !!spec.flag,
          revealed: false,
        });
      }
    });
    return U.shuffle(pieces);
  }

  function setupBoard() {
    const board = new Array(N * N).fill(null);
    [0, 1].forEach((seat) => {
      const army = buildArmy(seat);
      const rows = seat === 0 ? [9, 8, 7, 6] : [0, 1, 2, 3];
      let index = 0;
      rows.forEach((r) => {
        for (let c = 0; c < N; c++) {
          board[r * N + c] = army[index++];
        }
      });
    });
    return board;
  }

  function newState() {
    const players = makePlayers();
    return {
      board: setupBoard(),
      players,
      current: 0,
      selected: null,
      moves: [],
      lastBattle: null,
      notice: "الدور لـ" + players[0].name + " — اختر قطعة من صفوفك.",
      over: false,
      winner: null,
      turn: 1,
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function movable(piece) {
    return !!piece && !piece.bomb && !piece.flag;
  }

  function legalMoves(at) {
    const piece = state.board[at];
    if (!piece || piece.seat !== viewSeat() || piece.seat !== state.current || !movable(piece)) return [];
    const r = Math.floor(at / N);
    const c = at % N;
    const moves = [];
    if (piece.rank === 2) {
      for (const [dr, dc] of DIRS) {
        let rr = r + dr;
        let cc = c + dc;
        while (inBoard(rr, cc)) {
          const to = rr * N + cc;
          if (LAKES.has(to)) break;
          const target = state.board[to];
          if (!target) {
            moves.push(to);
            rr += dr;
            cc += dc;
            continue;
          }
          if (target.seat !== piece.seat) moves.push(to);
          break;
        }
      }
      return moves;
    }
    for (const [dr, dc] of DIRS) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBoard(rr, cc)) continue;
      const to = rr * N + cc;
      if (LAKES.has(to)) continue;
      const target = state.board[to];
      if (!target || target.seat !== piece.seat) moves.push(to);
    }
    return moves;
  }

  function select(at) {
    const piece = state.board[at];
    if (!piece || piece.seat !== state.current || piece.seat !== viewSeat()) return;
    if (piece.seat !== viewSeat()) return;
    if (!movable(piece)) {
      apiRef.toast(piece.flag ? "العلم لا يتحرك." : "القنبلة لا تتحرك.", "warn");
      return;
    }
    state.selected = at;
    state.moves = legalMoves(at);
    state.notice = "اختر وجهة للقطعة، أو اضغط عليها مجددًا للإلغاء.";
    render();
  }

  function act(to) {
    if (!state || state.over) return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    if (state.selected == null || !state.moves.includes(to)) return false;
    const from = state.selected;
    const attacker = state.board[from];
    const defender = state.board[to];
    state.selected = null;
    state.moves = [];
    if (!defender) {
      state.board[to] = attacker;
      state.board[from] = null;
      state.lastBattle = null;
      apiRef.log("<strong>" + esc(cur().name) + "</strong> حرّك " + esc(attacker.name) + " إلى " + esc(cellName(to)) + ".", "accent");
      endTurn();
      return true;
    }
    resolveBattle(attacker, defender, from, to);
    return true;
  }

  function cellName(at) {
    return "ABCDEFGHIJ"[at % N] + (Math.floor(at / N) + 1);
  }

  function resolveBattle(attacker, defender, from, to) {
    let outcome;
    if (defender.flag) {
      state.board[to] = attacker;
      state.board[from] = null;
      state.lastBattle = { text: "أسر العلم!", winner: attacker.seat };
      apiRef.log("<strong>" + esc(state.players[attacker.seat].name) + "</strong> أسر علم الخصم في " + esc(cellName(to)) + "!", "good");
      finish(attacker.seat);
      return;
    }
    if (defender.bomb) {
      if (attacker.rank === 3) {
        outcome = "attacker";
        apiRef.log("المنقّب " + esc(cellName(to)) + " فكّك القنبلة.", "good");
      } else {
        outcome = "defender";
        apiRef.log("القنبلة دمّرت " + esc(attacker.name) + " عند " + esc(cellName(to)) + ".", "warn");
      }
      defender.revealed = true;
    } else if (attacker.rank === 1 && defender.rank === 10) {
      outcome = "attacker";
      apiRef.log("الجاسوس اغتال المارشال في " + esc(cellName(to)) + "!", "good");
    } else if (attacker.rank > defender.rank) {
      outcome = "attacker";
    } else if (attacker.rank < defender.rank) {
      outcome = "defender";
    } else {
      outcome = "both";
    }

    if (!defender.bomb) {
      attacker.revealed = true;
      defender.revealed = true;
    }

    if (outcome === "attacker") {
      state.board[to] = attacker;
      state.board[from] = null;
      state.lastBattle = { text: attacker.name + " (" + ar(attacker.rank || 0) + ") هزم " + defender.name + " (" + ar(defender.rank || 0) + ")", winner: attacker.seat };
      apiRef.log("<strong>" + esc(attacker.name) + "</strong> هزم <strong>" + esc(defender.name) + "</strong> في " + esc(cellName(to)) + ".", "good");
    } else if (outcome === "defender") {
      state.board[from] = null;
      state.lastBattle = { text: defender.name + " (" + ar(defender.rank || 0) + ") صدّ " + attacker.name + " (" + ar(attacker.rank || 0) + ")", winner: defender.seat };
      apiRef.log("<strong>" + esc(defender.name) + "</strong> صدّ <strong>" + esc(attacker.name) + "</strong> في " + esc(cellName(to)) + ".", "warn");
    } else {
      state.board[to] = null;
      state.board[from] = null;
      state.lastBattle = { text: "تبادل " + attacker.name + " و" + defender.name + " الضربات وماتا.", winner: null };
      apiRef.log("القطعتان " + esc(attacker.name) + " و" + esc(defender.name) + " سقطتا معًا.", "warn");
    }
    endTurn();
  }

  function endTurn() {
    if (!state || state.over) return;
    const next = other(state.current);
    if (!hasMoves(next)) {
      finish(state.current);
      return;
    }
    state.current = next;
    state.turn += 1;
    state.notice = "الدور لـ" + cur().name + " — حرّك قطعة أو هاجم.";
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
  }

  function hasMoves(seat) {
    for (let at = 0; at < 100; at++) {
      const piece = state.board[at];
      if (!piece || piece.seat !== seat || !movable(piece)) continue;
      const r = Math.floor(at / N);
      const c = at % N;
      if (piece.rank === 2) {
        for (const [dr, dc] of DIRS) {
          let rr = r + dr;
          let cc = c + dc;
          while (inBoard(rr, cc)) {
            const to = rr * N + cc;
            if (LAKES.has(to)) break;
            const target = state.board[to];
            if (!target) return true;
            if (target.seat !== seat) return true;
            break;
          }
        }
        continue;
      }
      for (const [dr, dc] of DIRS) {
        const rr = r + dr;
        const cc = c + dc;
        if (!inBoard(rr, cc)) continue;
        const to = rr * N + cc;
        if (LAKES.has(to)) continue;
        const target = state.board[to];
        if (!target || target.seat !== seat) return true;
      }
    }
    return false;
  }

  function finish(winner) {
    state.over = true;
    state.winner = winner;
    state.selected = null;
    state.moves = [];
    state.notice = "فاز " + state.players[winner].name + "!";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log("انتهت ستراتيجو. الفائز: <strong>" + esc(state.players[winner].name) + "</strong>.", "accent");
    render();
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: state.board.filter((piece) => piece && piece.seat === p.index && !piece.flag).length,
    })).sort((a, b) => b.value - a.value);
    apiRef.gameOver({
      title: "انتهت ستراتيجو",
      text: "أسر العلم أو شلّ حركة الخصم يحسم المعركة.",
      winner: state.players[winner].name,
      icon: "⚔️",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function allMoves(seat) {
    const moves = [];
    for (let at = 0; at < 100; at++) {
      const piece = state.board[at];
      if (!piece || piece.seat !== seat || !movable(piece)) continue;
      const r = Math.floor(at / N);
      const c = at % N;
      const dests = [];
      if (piece.rank === 2) {
        for (const [dr, dc] of DIRS) {
          let rr = r + dr;
          let cc = c + dc;
          while (inBoard(rr, cc)) {
            const to = rr * N + cc;
            if (LAKES.has(to)) break;
            const target = state.board[to];
            if (!target) {
              dests.push(to);
              rr += dr;
              cc += dc;
              continue;
            }
            if (target.seat !== seat) dests.push(to);
            break;
          }
        }
      } else {
        for (const [dr, dc] of DIRS) {
          const rr = r + dr;
          const cc = c + dc;
          if (!inBoard(rr, cc)) continue;
          const to = rr * N + cc;
          if (LAKES.has(to)) continue;
          const target = state.board[to];
          if (!target || target.seat !== seat) dests.push(to);
        }
      }
      dests.forEach((to) => moves.push({ from: at, to, piece }));
    }
    return moves;
  }

  function scoreMove(move, seat) {
    const target = state.board[move.to];
    const forward = seat === 0 ? -1 : 1;
    const fromRow = Math.floor(move.from / N);
    const toRow = Math.floor(move.to / N);
    let score = (toRow - fromRow) * forward * 2;
    if (move.piece.rank === 2) score += 2;
    if (target) {
      if (target.revealed) {
        if (target.flag) score += 500;
        else if (target.bomb) score += move.piece.rank === 3 ? 70 : -80;
        else if (move.piece.rank === 1 && target.rank === 10) score += 120;
        else score += move.piece.rank > target.rank ? 60 + target.rank : -50;
      } else {
        if (move.piece.rank <= 2) score -= 12;
        else score += 6 + move.piece.rank * 0.5;
      }
    }
    if (move.piece.rank === 10) score -= 10;
    if (move.piece.rank === 1) score -= 8;
    return score;
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const moves = allMoves(state.current);
    if (!moves.length) { finish(other(state.current)); return; }
    const move = AI.choose(moves, (entry) => scoreMove(entry, state.current), cur().level);
    if (!move) return;
    state.selected = move.from;
    state.moves = [move.to];
    act(move.to);
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 1.1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function rankMark(piece) {
    if (piece.flag) return "⚑";
    if (piece.bomb) return "✸";
    return ar(piece.rank);
  }

  function render() {
    if (!rootRef || !state) return;
    const view = viewSeat();
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const moveSet = new Set(state.moves);
    let cells = "";
    for (let at = 0; at < 100; at++) {
      if (LAKES.has(at)) {
        cells += '<div class="st-cell is-lake" aria-label="بحيرة"></div>';
        continue;
      }
      const piece = state.board[at];
      const own = piece && piece.seat === view;
      const visible = own || (piece && piece.revealed);
      let cls = "st-cell";
      if (piece) cls += piece.seat === 0 ? " p0" : " p1";
      if (own) cls += " is-own";
      if (state.selected === at) cls += " is-selected";
      if (moveSet.has(at)) cls += " is-move";
      const label = piece
        ? (visible ? piece.name + " (" + (piece.flag ? "علم" : piece.bomb ? "قنبلة" : ar(piece.rank)) + ")" : "قطعة خصم مجهولة")
        : "خانة فارغة";
      cells += '<button type="button" class="' + cls + '" data-st-cell="' + at + '" ' +
        (!piece && !moveSet.has(at) ? "disabled" : "") +
        ' aria-label="' + esc(label) + '">' +
        (piece ? '<span class="st-piece">' + (visible ? rankMark(piece) : "؟") + "</span>" : "") +
        "</button>";
    }

    const remaining = (seat) => state.board.filter((piece) => piece && piece.seat === seat).length;
    const playerRows = state.players.map((player) => (
      '<div class="xg-spread st-player ' + (state.current === player.index ? "is-current" : "") + '" style="--pc:' + player.color + '">' +
      '<span class="xg-row"><span class="xg-avatar">' + ar(player.index + 1) + "</span><span>" + esc(player.name) + "</span></span>" +
      '<span class="xg-chip">' + ar(remaining(player.index)) + " قطعة</span></div>"
    )).join("");

    const legend = ARMY.slice().sort((a, b) => b.rank - a.rank).map((entry) =>
      '<span class="st-legend"><b>' + (entry.flag ? "⚑" : entry.bomb ? "✸" : ar(entry.rank)) + "</b>" + esc(entry.name) + " ×" + ar(entry.count) + "</span>"
    ).join("");

    rootRef.innerHTML =
      '<div class="xg st">' +
      XG.bar("ستراتيجو", "حرب الرتب · 40 قطعة لكل جانب · بحيرتان", [
        XG.chip("الدور", esc(cur().name), "is-live"),
        XG.chip("الجولة", ar(state.turn)),
      ].join("")) +
      '<div class="st-layout"><div class="st-board-wrap"><div class="st-board">' + cells + "</div>" +
      '<div class="st-coords"><span>أ</span><span>ب</span><span>ج</span><span>د</span><span>هـ</span><span>و</span><span>ز</span><span>ح</span><span>ط</span><span>ي</span></div></div>' +
      '<aside class="st-side"><div class="xg-panel"><h3>المعركة</h3>' + playerRows +
      '<p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.lastBattle ? '<p class="st-battle">' + esc(state.lastBattle.text) + "</p>" : "") +
      "</div>" +
      '<div class="xg-panel"><h3>دليل الرتب</h3><div class="st-legend-grid">' + legend + "</div>" +
      '<p class="xg-note">الرتب الأعلى تهزم الأدنى. الجاسوس (١) يقتل المارشال (١٠) عند مهاجمته. المنقّب (٣) يفكّك القنابل. الكشّاف (٢) يتحرك أي مسافة.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const cell = event.target.closest("[data-st-cell]");
    if (!cell) return;
    const at = Number(cell.dataset.stCell);
    if (state.selected != null && state.moves.includes(at)) {
      act(at);
      return;
    }
    if (state.selected === at) {
      state.selected = null;
      state.moves = [];
      state.notice = "أُلغي الاختيار. اختر قطعة أخرى.";
      render();
      return;
    }
    const piece = state.board[at];
    if (piece && piece.seat === state.current && piece.seat === viewSeat()) select(at);
  }

  const game = {
    id: "stratego",
    name: "ستراتيجو",
    en: "STRATEGO",
    icon: "⚔️",
    accent: "#a8755f",
    cardClass: "card-stratego",
    tagline: "رتب مخفية وبحيرات تفصل الجيشين — اختر المهاجم بحكمة قبل أن تُكشف رتبتك.",
    players: "2",
    duration: "30–60 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,

    options: {
      hint: "توزيع عشوائي قانوني داخل الصفوف الأربعة الخلفية لكل لاعب.",
      defaults: {},
      fields: [],
      summary() { return "10×10 · 40 قطعة · بحيرتان"; },
    },

    rules: {
      goal: "أسر علم الخصم أو شلّ جميع قطعه المتحركة. القطع مخفية عن الخصم حتى تشتبك في معركة.",
      facts: [["اللوح", "10×10"], ["القطع", "40 لكل لاعب"], ["البحيرات", "2"], ["الفوز", "أسر العلم"]],
      components: [
        "لوح 10×10 يتوسطه بحيرتان تمنعان المرور.",
        "40 قطعة لكل لاعب: مارشال، جنرال، عقيد، رائد، نقيب، ملازم، رقيب، منقّب، كشّاف، جاسوس، 6 قنابل، وعلم.",
        "الرتب من 1 إلى 10؛ الرتبة الأعلى تهزم الأدنى، والتساوي يقتل الطرفين.",
      ],
      setup: [
        "توزع القطع عشوائيًا في الصفوف الأربعة الخلفية لكل لاعب.",
        "لا يمكن وضع القطع في البحيرات أو خارج الصفوف الأربعة.",
        "العلم والقنابل لا تتحرك بعد بدء اللعب.",
      ],
      steps: [
        "<strong>الحركة:</strong> قطعة واحدة خانة واحدة أفقيًا أو عموديًا. الكشّاف يتحرك أي عدد من الخانات في خط مستقيم.",
        "<strong>الهجوم:</strong> إذا كانت الوجهة قطعة خصم تحدث معركة. الرتبة الأعلى تفوز، والمتساويتان تموتان.",
        "<strong>القنبلة:</strong> تدمر أي مهاجم إلا المنقّب (رتبة 3) فيفكّكها.",
        "<strong>الجاسوس:</strong> إذا هاجم المارشال (رتبة 10) قتله.",
        "<strong>العلم:</strong> إذا وصلت قطعة إلى العلم انتهت اللعبة فورًا.",
        "<strong>الكشف:</strong> الرتبة التي تخوض معركة وتنجو تصبح مكشوفة للطرفين.",
      ],
      winning: "الفائز من يأسر العلم، أو من يترك خصمه بلا قطعة قادرة على الحركة.",
      notes: [
        "البحيرات خانة 43 و44 و47 و48 و53 و54 و57 و58 على اللوح (بترقيم 1–100) تمنع المرور والهجوم عبرها.",
        "الذكاء الاصطناعي يستفيد من الرتب المكشوفة ويهاجم القطع الضعيفة المعروفة.",
        "في اللعب الشبكي تبقى قطع الخصم مخفية حتى تُكشف في معركة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      state = newState();
      apiRef.log("بدأت ستراتيجو. القطع موزعة عشوائيًا، والرتب مخفية حتى المعركة.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          select,
          act,
          legalMoves,
          allMoves,
          aiStep,
          setCurrent(index) {
            if (!state) return;
            state.current = index === 1 ? 1 : 0;
            state.selected = null;
            state.moves = [];
            render();
          },
          revealAll() {
            state.board.forEach((piece) => { if (piece) piece.revealed = true; });
            render();
          },
          place(seat, at, rank) {
            if (!state || LAKES.has(at)) return;
            const spec = RANKS[rank] || RANKS[0];
            state.board[at] = {
              id: seat + "-d" + Date.now() + "-" + at,
              seat,
              rank: spec.rank,
              name: spec.name,
              bomb: !!spec.bomb,
              flag: !!spec.flag,
              revealed: false,
            };
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
