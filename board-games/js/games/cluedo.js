/* ==========================================================================
   كلودو — قصر الجريمة (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const PCOLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d", "#b98cd9", "#f0a35e"];

  /* ------------------------------ الغرف ------------------------------ */

  const ROOMS = [
    { id: "kitchen", name: "المطبخ", icon: "🍳", x: 0, y: 0, color: "#d9a05b", passage: "study" },
    { id: "ballroom", name: "قاعة الرقص", icon: "💃", x: 1, y: 0, color: "#c98bb5" },
    { id: "conservatory", name: "الدفيئة", icon: "🌿", x: 2, y: 0, color: "#78b98c", passage: "lounge" },
    { id: "dining", name: "غرفة الطعام", icon: "🍽️", x: 0, y: 1, color: "#c98383" },
    { id: "billiard", name: "غرفة البلياردو", icon: "🎱", x: 1, y: 1, color: "#7aa7c7" },
    { id: "library", name: "المكتبة", icon: "📚", x: 2, y: 1, color: "#a48bc7" },
    { id: "lounge", name: "الصالة", icon: "🛋️", x: 0, y: 2, color: "#d1b072", passage: "conservatory" },
    { id: "hall", name: "البهو", icon: "🏛️", x: 1, y: 2, color: "#8fb6a7" },
    { id: "study", name: "المكتب", icon: "🖋️", x: 2, y: 2, color: "#9aa6b8", passage: "kitchen" },
  ];

  const ROOM_BY_ID = {};
  ROOMS.forEach((room) => { ROOM_BY_ID[room.id] = room; });

  const ROOM_EDGES = [
    ["kitchen", "ballroom"], ["ballroom", "conservatory"],
    ["dining", "billiard"], ["billiard", "library"],
    ["lounge", "hall"], ["hall", "study"],
    ["kitchen", "dining"], ["ballroom", "billiard"], ["conservatory", "library"],
    ["dining", "lounge"], ["billiard", "hall"], ["library", "study"],
    // ممرات سرية
    ["kitchen", "study"], ["conservatory", "lounge"],
  ];

  const ADJ = {};
  ROOMS.forEach((room) => { ADJ[room.id] = []; });
  ROOM_EDGES.forEach(([a, b]) => {
    if (!ADJ[a] || !ADJ[b]) return;
    ADJ[a].push(b);
    ADJ[b].push(a);
  });

  /* ------------------------------ البطاقات ------------------------------ */

  const SUSPECTS = [
    { id: "scarlett", name: "ميس سكارليت", icon: "👩", color: "#e05a6b" },
    { id: "mustard", name: "الكولونيل موستارد", icon: "🧔", color: "#d8a63f" },
    { id: "white", name: "السيدة وايت", icon: "👵", color: "#cfd8e0" },
    { id: "green", name: "القس غرين", icon: "👨", color: "#4f9d6d" },
    { id: "peacock", name: "السيدة بيكوك", icon: "👩‍🦳", color: "#4f7fb5" },
    { id: "plum", name: "البروفيسور بلوم", icon: "👨‍🏫", color: "#8d6bb5" },
  ];

  const WEAPONS = [
    { id: "candlestick", name: "الشمعدان", icon: "🕯️", color: "#d9a05b" },
    { id: "dagger", name: "الخنجر", icon: "🗡️", color: "#c98383" },
    { id: "pipe", name: "أنبوب الرصاص", icon: "⚙️", color: "#9aa6b8" },
    { id: "revolver", name: "المسدس", icon: "🔫", color: "#7aa7c7" },
    { id: "rope", name: "الحبل", icon: "🪢", color: "#d1b072" },
    { id: "wrench", name: "مفتاح الربط", icon: "🔧", color: "#78b98c" },
  ];

  const CATS = { s: SUSPECTS, w: WEAPONS, r: ROOMS };
  const CAT_NAMES = { s: "المشتبه بهم", w: "الأسلحة", r: "الغرف" };

  const CARD_MAP = {};
  Object.keys(CATS).forEach((cat) => {
    CATS[cat].forEach((item) => {
      CARD_MAP[cat + ":" + item.id] = Object.assign({}, item, {
        cat,
        cardId: cat + ":" + item.id,
        catName: CAT_NAMES[cat],
      });
    });
  });

  function cardOf(id) {
    return CARD_MAP[id] || null;
  }

  function cardName(id) {
    const card = cardOf(id);
    return card ? card.name : id;
  }

  function fullDeck() {
    const deck = [];
    Object.keys(CATS).forEach((cat) => {
      CATS[cat].forEach((item) => deck.push(cat + ":" + item.id));
    });
    return deck;
  }

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;

  function cur() {
    return state.players[state.current];
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

  function activePlayers() {
    return state.players.filter((player) => player.active);
  }

  /* ------------------------------ الحركة ------------------------------ */

  function distances(from) {
    const dist = {};
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
      const node = queue.shift();
      ADJ[node].forEach((next) => {
        if (dist[next] == null) {
          dist[next] = dist[node] + 1;
          queue.push(next);
        }
      });
    }
    return dist;
  }

  function reachableRooms() {
    if (!state || state.over || state.phase !== "move") return [];
    const dist = distances(cur().room);
    return ROOMS
      .filter((room) => dist[room.id] != null && dist[room.id] > 0 && dist[room.id] <= state.steps)
      .map((room) => ({ room, steps: dist[room.id] }))
      .sort((a, b) => a.steps - b.steps || a.room.name.localeCompare(b.room.name, "ar"));
  }

  function beginTurn(silent) {
    if (!state || state.over) return;
    state.phase = "move";
    state.hasSuggested = false;
    state.handRevealed = false;
    state.dice = [U.roll(6), U.roll(6)];
    state.steps = state.dice[0] + state.dice[1];
    state.reachable = reachableRooms();
    const player = cur();
    state.notice = "دور " + player.name + " — حرّك قطعتك داخل الغرف أو قدّم اتهامًا.";
    if (!silent) apiRef.log("<strong>" + U.escape(player.name) + "</strong> رمى النرد: " + state.dice[0] + " + " + state.dice[1] + " = " + state.steps + " خطوة.", "accent");
    if (FX) {
      FX.sound("dice");
      FX.after(() => {
        rootRef.querySelectorAll(".cluedo-die").forEach((die, index) => FX.hop(die, { delay: index * 40 }));
        const room = rootRef.querySelector('[data-room="' + player.room + '"]');
        if (room) FX.pulse(room);
      }, 40);
    }
    if (apiRef) apiRef.setStatus("دور " + AI.statusName(player));
    render();
  }

  function moveTo(roomId) {
    if (!state || state.over || state.phase !== "move") return;
    const target = state.reachable.find((entry) => entry.room.id === roomId);
    if (!target) {
      BG.toast("هذه الغرفة خارج مدى النرد.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const player = cur();
    player.room = roomId;
    state.phase = "act";
    state.reachable = [];
    state.notice = "انتقل " + player.name + " إلى " + ROOM_BY_ID[roomId].name + ". يمكنك الاقتراح أو الاتهام، ثم إنهاء الدور.";
    apiRef.log("<strong>" + U.escape(player.name) + "</strong> انتقل إلى " + U.escape(ROOM_BY_ID[roomId].name) + " (" + target.steps + " خطوة).", "");
    if (FX) {
      FX.sound("move");
      FX.after(() => {
        const room = rootRef.querySelector('[data-room="' + roomId + '"]');
        if (room) { FX.pop(room); FX.floatText(room, "📍", "good"); }
      }, 40);
    }
    render();
  }

  function stay() {
    if (!state || state.over || state.phase !== "move") return;
    state.phase = "act";
    state.reachable = [];
    state.notice = cur().name + " بقي في " + ROOM_BY_ID[cur().room].name + ".";
    if (FX) FX.sound("click");
    render();
  }

  /* ------------------------------ الاقتراح ------------------------------ */

  function selectHTML(name, options, selected) {
    return (
      '<select class="cluedo-select" name="' + name + '">' +
      options.map((item) => {
        const value = item.cardId || item.id;
        const label = item.name;
        return '<option value="' + U.escape(value) + '"' + (value === selected ? " selected" : "") + ">" + U.escape(label) + "</option>";
      }).join("") +
      "</select>"
    );
  }

  function cardChipHTML(id, opts) {
    const card = cardOf(id);
    if (!card) return "";
    const o = opts || {};
    return (
      '<span class="cluedo-chip' + (o.action ? " is-action" : "") + '" style="--cc:' + card.color + '"' +
      (o.action ? ' role="button" tabindex="0" data-card="' + U.escape(id) + '"' : "") + ">" +
      '<i aria-hidden="true">' + card.icon + "</i>" +
      "<span>" + U.escape(card.name) + "</span>" +
      "</span>"
    );
  }

  function comboHTML(combo) {
    return (
      '<div class="cluedo-combo">' +
      cardChipHTML(combo.s) +
      cardChipHTML(combo.w) +
      cardChipHTML(combo.r) +
      "</div>"
    );
  }

  function openSuggestion() {
    if (!state || state.over || state.phase !== "act" || state.hasSuggested) return;
    const player = cur();
    const room = ROOM_BY_ID[player.room];
    const body = document.createElement("div");
    body.className = "cluedo-form";
    body.innerHTML =
      "<p>الاقتراح يكون عن الغرفة التي تقف فيها فقط. اختر مشتبهًا وسلاحًا، وسيسأل النظام اللاعبين الآخرين سرًا.</p>" +
      '<div class="cluedo-fixed">' +
      '<span class="cluedo-field-label">الغرفة المقترحة</span>' +
      cardChipHTML("r:" + room.id) +
      "</div>" +
      '<div class="cluedo-field"><label for="cluedoSuspect">المشتبه به</label>' +
      selectHTML("suspect", SUSPECTS.map((item) => ({ id: "s:" + item.id, name: item.icon + " " + item.name })), "s:scarlett") +
      "</div>" +
      '<div class="cluedo-field"><label for="cluedoWeapon">السلاح</label>' +
      selectHTML("weapon", WEAPONS.map((item) => ({ id: "w:" + item.id, name: item.icon + " " + item.name })), "w:candlestick") +
      "</div>" +
      '<p class="cluedo-hint">انتهاء الاقتراح يُنهي دورك. أول لاعب يملك بطاقة مطابقة يعرضها عليك وحدك.</p>';
    const dialog = BG.openDialog({
      title: "اقتراح في " + room.name,
      body,
      actions: [
        { label: "إلغاء", value: "" },
        {
          label: "قدّم الاقتراح",
          primary: true,
          onClick({ close }) {
            const suspect = body.querySelector('[name="suspect"]').value;
            const weapon = body.querySelector('[name="weapon"]').value;
            close(JSON.stringify({ s: suspect, w: weapon, r: "r:" + room.id }));
          },
        },
      ],
      className: "cluedo-dialog",
    });
    dialog.promise.then((value) => {
      if (!value) return;
      let combo = null;
      try { combo = JSON.parse(value); } catch (err) { combo = null; }
      if (!combo) return;
      state.hasSuggested = true;
      state.notice = "اقتراح " + player.name + " قيد التحقق…";
      apiRef.log(
        "<strong>" + U.escape(player.name) + "</strong> اقترح: " +
        U.escape(cardName(combo.s)) + " في " + U.escape(cardName(combo.r)) + " بواسطة " + U.escape(cardName(combo.w)) + ".",
        "accent"
      );
      if (FX) FX.sound("card");
      render();
      resolveSuggestion(player.index, combo);
    });
  }

  function nextOrder(startIndex) {
    const order = [];
    for (let step = 1; step < state.players.length; step++) {
      order.push(state.players[(startIndex + step) % state.players.length]);
    }
    return order;
  }

  function askRefutation(player, matches, suggesterName, combo) {
    const net = apiRef && apiRef.net;
    if (net && net.isRemoteSeat(player.index)) {
      return net.askRefutation(player.index, combo, suggesterName);
    }
    if (AI.isCpu(player)) {
      const pick = cpuRefutePick(player, matches);
      if (FX) FX.sound("card");
      return Promise.resolve(pick);
    }
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "cluedo-refute";
      wrap.innerHTML =
        "<p>مرّر الجهاز إلى <strong>" + U.escape(player.name) + "</strong> فقط. لا تفتح البطاقات إن كان غيرك يرى الشاشة.</p>" +
        '<div class="cluedo-locked"><button type="button" class="bg-btn primary">👁 إظهار بطاقاتي المطابقة</button></div>';
      const dialog = BG.openDialog({
        title: "دحض سرّي — " + player.name,
        body: wrap,
        actions: [{ label: "إلغاء", value: "" }],
        className: "cluedo-refute-dialog",
      });
      let picked = null;
      wrap.querySelector(".cluedo-locked button").addEventListener("click", () => {
        wrap.innerHTML =
          "<p>لديك " + matches.length + " بطاقة مطابقة. اختر <strong>واحدة</strong> لتعرضها على " + U.escape(suggesterName) + ":</p>" +
          '<div class="cluedo-refute-grid">' + matches.map((id) => cardChipHTML(id, { action: true })).join("") + "</div>" +
          '<p class="cluedo-hint">البطاقة الأخرى تبقى سرّية. لا تُظهر أكثر من بطاقة واحدة.</p>';
        if (FX) FX.sound("reveal");
        wrap.querySelectorAll("[data-card]").forEach((chip) => {
          chip.addEventListener("click", () => {
            picked = chip.getAttribute("data-card");
            dialog.close(picked);
          });
          chip.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            picked = chip.getAttribute("data-card");
            dialog.close(picked);
          });
        });
      });
      dialog.promise.then((value) => {
        resolve(value || picked || null);
      });
    });
  }

  async function resolveSuggestion(suggesterIndex, combo) {
    const suggester = state.players[suggesterIndex];
    const order = nextOrder(suggesterIndex);
    let refuter = null;
    let shown = null;
    for (const player of order) {
      const matches = player.hand.filter((id) => id === combo.s || id === combo.w || id === combo.r);
      if (!matches.length) continue;
      refuter = player;
      shown = await askRefutation(player, matches, suggester.name, combo);
      break;
    }

    state.lastSuggestion = { by: suggesterIndex, combo, refutedBy: refuter ? refuter.index : null };
    state.history.unshift(state.lastSuggestion);
    state.history = state.history.slice(0, 6);

    if (refuter) {
      state.notice = "دحض " + refuter.name + " اقتراح " + suggester.name + ". انتهى الدور.";
      apiRef.log("<strong>" + U.escape(refuter.name) + "</strong> دحض اقتراح <strong>" + U.escape(suggester.name) + "</strong> ببطاقة سرّية.", "");
      if (shown) {
        if (AI.isCpu(suggester)) {
          suggester.known.add(shown);
        } else {
          render();
          await BG.revealSecret({
            title: "بطاقة الدحض",
            hint: "اعرض هذه البطاقة على " + suggester.name + " فقط، ثم أغلق النافذة.",
            content:
              '<div class="cluedo-reveal-card" style="--cc:' + cardOf(shown).color + '">' +
              '<span class="cluedo-reveal-icon">' + cardOf(shown).icon + "</span>" +
              "<strong>" + U.escape(cardOf(shown).name) + "</strong>" +
              "<small>" + U.escape(cardOf(shown).catName) + "</small>" +
              "</div>",
            owner: suggester.name,
          });
        }
      } else {
        BG.toast("لم تُعرض بطاقة — تُعامَل المشاركة كدحض مكتمل.", "warn");
      }
    } else {
      state.notice = "لم يُدحض اقتراح " + suggester.name + ". قد يكون أحد عناصره في الظرف.";
      apiRef.log("لم يستطع أحد دحض اقتراح <strong>" + U.escape(suggester.name) + "</strong> — احتمال أن يكون أحد العناصر في الظرف.", "good");
      if (AI.isCpu(suggester)) {
        [combo.s, combo.w, combo.r].forEach((id) => {
          if (suggester.hand.indexOf(id) === -1) suggester.envelopeKnown.add(id);
        });
      }
      if (FX) FX.sound("reveal");
    }

    render();
    if (refuter && FX) FX.sound("card");
    endTurn("suggest");
  }

  /* ------------------------------ الاتهام ------------------------------ */

  function openAccusation() {
    if (!state || state.over || state.phase === "over") return;
    const body = document.createElement("div");
    body.className = "cluedo-form";
    body.innerHTML =
      '<p class="cluedo-warning">⚠️ الاتهام النهائي لا رجعة فيه. إن كان خاطئًا تخرج من التحقيق فورًا ويستمر الآخرون.</p>' +
      '<div class="cluedo-field"><label for="cluedoAccSuspect">الفاعل</label>' +
      selectHTML("suspect", SUSPECTS.map((item) => ({ id: "s:" + item.id, name: item.icon + " " + item.name })), null) +
      "</div>" +
      '<div class="cluedo-field"><label for="cluedoAccWeapon">السلاح</label>' +
      selectHTML("weapon", WEAPONS.map((item) => ({ id: "w:" + item.id, name: item.icon + " " + item.name })), null) +
      "</div>" +
      '<div class="cluedo-field"><label for="cluedoAccRoom">المكان</label>' +
      selectHTML("room", ROOMS.map((item) => ({ id: "r:" + item.id, name: item.icon + " " + item.name })), "r:" + cur().room) +
      "</div>" +
      '<p class="cluedo-hint">اختر العناصر الثلاثة التي تعتقد أنها في ظرف القضية.</p>';
    const dialog = BG.openDialog({
      title: "الاتهام النهائي",
      body,
      actions: [
        { label: "تراجع", value: "" },
        {
          label: "أتّهم الآن",
          danger: true,
          onClick({ close }) {
            const suspect = body.querySelector('[name="suspect"]').value;
            const weapon = body.querySelector('[name="weapon"]').value;
            const room = body.querySelector('[name="room"]').value;
            close(JSON.stringify({ s: suspect, w: weapon, r: room }));
          },
        },
      ],
      className: "cluedo-dialog cluedo-accuse-dialog",
    });
    dialog.promise.then((value) => {
      if (!value) return;
      let combo = null;
      try { combo = JSON.parse(value); } catch (err) { combo = null; }
      if (!combo) return;
      resolveAccusation(combo);
    });
  }

  function resolveAccusation(combo) {
    const player = cur();
    const env = state.envelope;
    const correct = combo.s === "s:" + env.s && combo.w === "w:" + env.w && combo.r === "r:" + env.r;
    state.lastAccusation = { by: player.index, combo, correct };
    apiRef.log(
      "<strong>" + U.escape(player.name) + "</strong> اتهم: " + U.escape(cardName(combo.s)) + " في " + U.escape(cardName(combo.r)) + " بـ" + U.escape(cardName(combo.w)) + ".",
      correct ? "good" : "warn"
    );
    if (correct) {
      state.notice = "حُلّت القضية! " + player.name + " هو المحقق الفائز.";
      endGame(player.index, "solved");
      return;
    }

    player.active = false;
    state.notice = "اتهام خاطئ! خرج " + player.name + " من التحقيق، لكنه يبقى مطالبًا بدحض الاقتراحات.";
    apiRef.log("الاتهام كان خاطئًا — <strong>" + U.escape(player.name) + "</strong> خارج التحقيق.", "warn");
    if (FX) FX.sound("lose");
    if (apiRef) apiRef.setStatus(player.name + " مُقصى");
    const remaining = activePlayers();
    render();
    if (remaining.length <= 1) {
      endGame(remaining.length ? remaining[0].index : null, "last");
      return;
    }
    endTurn("accuse");
  }

  /* ------------------------------ الدور والنهاية ------------------------------ */

  function endTurn(reason) {
    if (!state || state.over) return;
    const remaining = activePlayers();
    if (remaining.length <= 1) {
      endGame(remaining.length ? remaining[0].index : null, "last");
      return;
    }
    let index = state.current;
    let guard = 0;
    do {
      index = (index + 1) % state.players.length;
      guard += 1;
    } while (!state.players[index].active && guard < state.players.length + 1);
    state.current = index;
    state.turn += 1;
    state.phase = "move";
    state.hasSuggested = false;
    state.handRevealed = false;
    state.lastSuggestion = null;
    beginTurn(true);
  }

  function endGame(winnerIndex, reason) {
    if (state.over) return;
    state.over = true;
    state.phase = "over";
    state.winner = winnerIndex;
    state.lastSuggestion = null;
    const winner = winnerIndex != null ? state.players[winnerIndex] : null;
    if (winner) {
      state.notice = reason === "solved"
        ? "أُغلقت القضية: " + winner.name + " حدّد الفاعل والسلاح والمكان بدقة."
        : "بقي " + winner.name + " وحده في التحقيق وفاز بالقضية.";
      apiRef.log(reason === "solved"
        ? "حُلّت القضية! <strong>" + U.escape(winner.name) + "</strong> اتهم بشكل صحيح."
        : "<strong>" + U.escape(winner.name) + "</strong> آخر محقق نشط — يفوز بالقضية.", "good");
    } else {
      state.notice = "انتهى التحقيق دون محقق فائز.";
      apiRef.log("انتهى التحقيق دون حل القضية.", "warn");
    }
    render();
    if (FX) FX.after(() => FX.win(), 140);
    apiRef.gameOver({
      icon: reason === "solved" ? "🔎" : "🏆",
      title: reason === "solved" ? "حُلّت القضية!" : "انتهى التحقيق",
      text:
        "ملابسات القضية كانت: " +
        "<strong>" + U.escape(cardName("s:" + state.envelope.s)) + "</strong> في " +
        "<strong>" + U.escape(cardName("r:" + state.envelope.r)) + "</strong> بواسطة " +
        "<strong>" + U.escape(cardName("w:" + state.envelope.w)) + "</strong>." +
        (reason === "last" ? " أُعلنت النتيجة بعد إقصاء بقية المحققين." : ""),
      winner: winner ? winner.name : "لا فائز",
      standings: state.players.map((player) => ({
        name: player.name + (player.active ? " · نشط" : " · مُقصى"),
        value: player.index === winnerIndex ? "فائز" : player.hand.length + " بطاقة",
      })),
    });
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuRefutePick(player, matches) {
    const level = AI.level(player.level);
    if (level === "hard") {
      const rooms = matches.filter((id) => id.indexOf("r:") === 0);
      if (rooms.length) return U.pick(rooms);
      const weapons = matches.filter((id) => id.indexOf("w:") === 0);
      if (weapons.length) return U.pick(weapons);
    }
    return U.pick(matches);
  }

  function cpuAccusation(player) {
    const pick = {};
    let product = 1;
    const uncertain = [];
    for (const cat of ["s", "w", "r"]) {
      const confirmed = [...player.envelopeKnown].filter((id) => id.indexOf(cat + ":") === 0);
      if (confirmed.length) {
        pick[cat] = confirmed[0];
        continue;
      }
      const pool = CATS[cat]
        .map((item) => cat + ":" + item.id)
        .filter((id) => !player.known.has(id));
      if (!pool.length) return null;
      if (pool.length === 1) {
        pick[cat] = pool[0];
        continue;
      }
      uncertain.push({ cat, pool });
      product *= pool.length;
    }
    if (!uncertain.length) {
      return { s: pick.s, w: pick.w, r: pick.r };
    }
    if (AI.level(player.level) === "hard" && product <= 6) {
      uncertain.forEach((entry) => { pick[entry.cat] = U.pick(entry.pool); });
      return { s: pick.s, w: pick.w, r: pick.r };
    }
    return null;
  }

  function cpuCombo(player) {
    const room = ROOM_BY_ID[player.room];
    if (!room) return null;
    const unknown = (cat, list) => list.filter((item) => !player.known.has(cat + ":" + item.id));
    const suspects = unknown("s", SUSPECTS);
    const weapons = unknown("w", WEAPONS);
    if (!suspects.length || !weapons.length) return null;
    const suspect = AI.choose(suspects, () => 1, player.level) || U.pick(suspects);
    const weapon = AI.choose(weapons, () => 1, player.level) || U.pick(weapons);
    return { s: "s:" + suspect.id, w: "w:" + weapon.id, r: "r:" + room.id };
  }

  function cpuRoomStatus(player, roomId) {
    const id = "r:" + roomId;
    if (player.hand.indexOf(id) !== -1) return "own";
    if (player.known.has(id)) return "seen";
    return "unknown";
  }

  function cpuSuggestionUseful(player) {
    const status = cpuRoomStatus(player, player.room);
    if (status === "unknown") return true;
    if (status === "seen") return false;
    const sConfirmed = [...player.envelopeKnown].some((id) => id.indexOf("s:") === 0);
    const wConfirmed = [...player.envelopeKnown].some((id) => id.indexOf("w:") === 0);
    return !(sConfirmed && wConfirmed);
  }

  function cpuMoveChoice(player) {
    const currentRoom = ROOM_BY_ID[player.room];
    const options = state.reachable.map((entry) => ({
      id: entry.room.id,
      room: entry.room,
      steps: entry.steps,
    }));
    options.push({ id: currentRoom.id, room: currentRoom, steps: 0 });
    return AI.choose(options, (option) => {
      const status = cpuRoomStatus(player, option.room.id);
      let score = 0;
      if (option.id === currentRoom.id) {
        if (status === "unknown") score = 8;
        else if (status === "own" && cpuSuggestionUseful(player)) score = 7;
        else score = 0.3;
      } else if (status === "unknown") {
        score = 8.5;
      } else if (status === "own") {
        score = 7;
      } else {
        score = 1;
      }
      score -= option.steps * 0.15;
      return score;
    }, player.level) || options[0];
  }

  function cpuDoSuggestion(player) {
    const combo = cpuCombo(player);
    if (!combo) {
      state.busy = true;
      endTurn("manual");
      state.busy = false;
      syncCpu();
      return;
    }
    state.busy = true;
    state.hasSuggested = true;
    state.notice = "اقتراح " + player.name + " قيد التحقق…";
    apiRef.log(
      "<strong>" + U.escape(player.name) + "</strong> اقترح: " +
      U.escape(cardName(combo.s)) + " في " + U.escape(cardName(combo.r)) + " بواسطة " + U.escape(cardName(combo.w)) + ".",
      "accent"
    );
    if (FX) FX.sound("card");
    render();
    resolveSuggestion(player.index, combo).then(() => {
      if (!state) return;
      state.busy = false;
      syncCpu();
    }).catch(() => {
      if (!state) return;
      state.busy = false;
      syncCpu();
    });
  }

  function cpuTakeTurn() {
    if (!state || state.over || state.busy) return;
    const player = cur();
    if (!player || !AI.isCpu(player)) return;

    const accusation = cpuAccusation(player);
    if (accusation) {
      resolveAccusation(accusation);
      return;
    }

    if (state.phase === "move") {
      const choice = cpuMoveChoice(player);
      if (choice && choice.id !== player.room) moveTo(choice.id);
      else stay();
      return;
    }

    if (state.phase === "act" && !state.hasSuggested) {
      if (!cpuSuggestionUseful(player)) {
        endTurn("manual");
        return;
      }
      cpuDoSuggestion(player);
    }
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over || state.busy || state.phase === "over") return;
    const seat = cur();
    if (!seat || !AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    aiRunner.later(() => {
      if (!state || state.over || state.busy) return;
      const active = cur();
      if (!active || !AI.isCpu(active)) return;
      cpuTakeTurn();
    }, AI.delay(seat.level, 1.1));
  }

  /* ------------------------------ العرض ------------------------------ */

  function roomArt(id) {
    const art = {
      kitchen:
        '<rect x="6" y="36" width="108" height="20" rx="3" fill="#6d4c2c"/>' +
        '<rect x="6" y="33" width="108" height="5" rx="2" fill="#a98556"/>' +
        '<rect x="16" y="41" width="24" height="11" rx="2" fill="#3c4a44"/>' +
        '<circle cx="22" cy="46" r="2.2" fill="#d8cbb2"/><circle cx="33" cy="46" r="2.2" fill="#d8cbb2"/>' +
        '<path d="M58 10 L58 26 M52 10 L64 10 L62 16 L54 16 Z" stroke="#c8b184" stroke-width="1.6" fill="none"/>' +
        '<ellipse cx="86" cy="24" rx="12" ry="4" fill="#3d4a45"/><path d="M76 24 L80 12 L92 12 L96 24" fill="none" stroke="#c8b184" stroke-width="1.4"/>',
      ballroom:
        '<path d="M60 4 L60 20" stroke="#d8c08a" stroke-width="1.6"/>' +
        '<path d="M48 24 Q60 14 72 24 L66 30 Q60 24 54 30 Z" fill="#e7cf9a" opacity=".9"/>' +
        '<circle cx="50" cy="30" r="2" fill="#ffe7b0"/><circle cx="60" cy="33" r="2" fill="#ffe7b0"/><circle cx="70" cy="30" r="2" fill="#ffe7b0"/>' +
        '<path d="M16 48 Q60 24 104 48" fill="none" stroke="#c9a8c4" stroke-width="1.4" stroke-dasharray="3 4"/>' +
        '<path d="M22 56 Q60 36 98 56" fill="none" stroke="#c9a8c4" stroke-width="1.4" stroke-dasharray="3 4"/>',
      conservatory:
        '<path d="M14 56 L14 34 L30 22 L46 34 L46 56 Z" fill="none" stroke="#9ec7a4" stroke-width="1.5"/>' +
        '<path d="M30 22 L30 56 M14 40 L46 40" stroke="#9ec7a4" stroke-width="1.1" opacity=".7"/>' +
        '<path d="M62 56 Q60 38 70 30 Q78 42 76 56 Z" fill="#5f9c6c"/>' +
        '<path d="M70 56 Q68 40 82 34 Q90 46 86 56 Z" fill="#78b98c"/>' +
        '<path d="M96 56 Q94 42 104 38 Q110 48 108 56 Z" fill="#5f9c6c"/>' +
        '<rect x="58" y="54" width="52" height="4" rx="2" fill="#7a5a35"/>',
      dining:
        '<rect x="20" y="30" width="80" height="18" rx="5" fill="#7a5430"/>' +
        '<rect x="24" y="28" width="72" height="5" rx="2" fill="#b48a56"/>' +
        '<rect x="30" y="48" width="5" height="12" fill="#5d3f22"/><rect x="85" y="48" width="5" height="12" fill="#5d3f22"/>' +
        '<path d="M42 28 L42 18 M38 18 L46 18 M40 14 L44 14" stroke="#e8d7b2" stroke-width="1.4"/>' +
        '<path d="M78 28 L78 18 M74 18 L82 18 M76 14 L80 14" stroke="#e8d7b2" stroke-width="1.4"/>' +
        '<rect x="8" y="26" width="9" height="24" rx="3" fill="#8b6540"/><rect x="103" y="26" width="9" height="24" rx="3" fill="#8b6540"/>',
      billiard:
        '<rect x="14" y="26" width="92" height="32" rx="5" fill="#2f6b4f"/>' +
        '<rect x="18" y="30" width="84" height="24" rx="3" fill="#3f8a63"/>' +
        '<circle cx="22" cy="34" r="2.2" fill="#12241c"/><circle cx="98" cy="34" r="2.2" fill="#12241c"/>' +
        '<circle cx="22" cy="50" r="2.2" fill="#12241c"/><circle cx="98" cy="50" r="2.2" fill="#12241c"/>' +
        '<circle cx="58" cy="42" r="3.2" fill="#f2e8ce"/><circle cx="68" cy="44" r="3.2" fill="#c94b45"/><circle cx="49" cy="45" r="3.2" fill="#e0b84a"/>',
      library:
        '<rect x="8" y="12" width="104" height="44" rx="3" fill="#4a3520"/>' +
        '<rect x="12" y="16" width="96" height="12" fill="#2c2115"/><rect x="12" y="32" width="96" height="12" fill="#2c2115"/><rect x="12" y="48" width="96" height="6" fill="#2c2115"/>' +
        [16, 24, 32, 42, 50, 60, 70, 80, 90].map((x, i) => '<rect x="' + x + '" y="17" width="5" height="10" rx="1" fill="' + ["#a44b4b", "#4b7a9c", "#c9a45c", "#5f9c6c"][i % 4] + '"/>').join("") +
        [18, 26, 36, 46, 56, 66, 76, 86].map((x, i) => '<rect x="' + x + '" y="33" width="5" height="10" rx="1" fill="' + ["#8b5a9c", "#c9a45c", "#4b7a9c", "#a44b4b"][i % 4] + '"/>').join(""),
      lounge:
        '<rect x="10" y="34" width="58" height="20" rx="7" fill="#8a5f3c"/>' +
        '<rect x="14" y="28" width="50" height="12" rx="5" fill="#a97a4e"/>' +
        '<rect x="10" y="44" width="8" height="14" rx="3" fill="#6f4a2d"/><rect x="60" y="44" width="8" height="14" rx="3" fill="#6f4a2d"/>' +
        '<rect x="78" y="24" width="34" height="30" rx="4" fill="#4a3520"/>' +
        '<path d="M84 48 Q95 30 106 48" fill="#c96a3f"/><path d="M88 48 Q95 38 102 48" fill="#f0b45a"/>' +
        '<rect x="74" y="22" width="42" height="4" rx="2" fill="#7a5430"/>',
      hall:
        '<path d="M8 58 L8 20 L26 20 L26 58 Z" fill="#5c4630"/><path d="M94 58 L94 20 L112 20 L112 58 Z" fill="#5c4630"/>' +
        '<path d="M10 24 L24 24 M10 32 L24 32 M10 40 L24 40 M96 24 L110 24 M96 32 L110 32 M96 40 L110 40" stroke="#a98556" stroke-width="2"/>' +
        '<rect x="34" y="38" width="52" height="6" rx="2" fill="#8a6a44"/><rect x="38" y="44" width="44" height="14" fill="#6f4a2d" opacity=".75"/>' +
        '<path d="M44 38 L44 20 L60 12 L76 20 L76 38" fill="none" stroke="#b48a56" stroke-width="2"/>',
      study:
        '<rect x="12" y="34" width="58" height="16" rx="3" fill="#7a5430"/>' +
        '<rect x="16" y="50" width="5" height="12" fill="#5d3f22"/><rect x="61" y="50" width="5" height="12" fill="#5d3f22"/>' +
        '<rect x="24" y="24" width="20" height="12" rx="2" fill="#e8d7b2"/><path d="M26 28 L42 28 M26 32 L38 32" stroke="#8a6a44" stroke-width="1.2"/>' +
        '<circle cx="90" cy="34" r="13" fill="#4b7a9c"/><path d="M78 34 Q90 20 102 34 Q90 48 78 34" fill="none" stroke="#a9c4d4" stroke-width="1.2"/>' +
        '<rect x="84" y="47" width="12" height="4" rx="2" fill="#7a5430"/><rect x="88" y="50" width="4" height="12" fill="#5d3f22"/>',
    };
    return '<svg class="cluedo-furniture" viewBox="0 0 120 64" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + (art[id] || "") + "</svg>";
  }

  function doorsHTML(room) {
    const sides = {};
    ROOM_EDGES.forEach(([a, b]) => {
      if (a !== room.id && b !== room.id) return;
      const other = ROOM_BY_ID[a === room.id ? b : a];
      if (!other) return;
      if (other.x === room.x) sides[other.y < room.y ? "top" : "bottom"] = true;
      else if (other.y === room.y) sides[other.x > room.x ? "end" : "start"] = true;
    });
    return Object.keys(sides).map((side) => '<i class="cluedo-door is-' + side + '" aria-hidden="true"></i>').join("");
  }

  function boardHTML() {
    const reachMap = {};
    if (state.phase === "move" && !state.over) state.reachable.forEach((entry) => { reachMap[entry.room.id] = entry.steps; });
    const rooms = ROOMS.map((room) => {
      const here = state.players.filter((player) => player.room === room.id);
      const isCurrent = !state.over && cur().room === room.id;
      const steps = reachMap[room.id];
      const classes = ["cluedo-room"];
      if (steps) classes.push("is-reachable");
      if (isCurrent) classes.push("is-current");
      if (state.over) classes.push("is-over");
      const passage = room.passage ? '<span class="cluedo-passage" title="ممر سري">↔ ممر</span>' : "";
      return (
        '<button type="button" class="' + classes.join(" ") + '" data-room="' + room.id + '" style="--rc:' + room.color + '"' +
        (state.phase === "move" && !state.over ? ' aria-label="الانتقال إلى ' + U.escape(room.name) + '"' : ' aria-label="' + U.escape(room.name) + '"') +
        (state.phase === "move" && !state.over && !steps ? " disabled" : "") + ">" +
        roomArt(room.id) +
        doorsHTML(room) +
        '<span class="cluedo-room-head">' +
        '<span class="cluedo-room-icon">' + room.icon + "</span>" +
        '<span class="cluedo-room-copy"><strong>' + U.escape(room.name) + "</strong><small>" + (steps ? "متاحة الآن" : room.passage ? "ممر سري" : "غرفة") + "</small></span>" +
        passage +
        "</span>" +
        '<span class="cluedo-pawns">' +
        here.map((player) =>
          '<i class="cluedo-pawn' + (player.index === state.current && !state.over ? " is-active" : "") + '" data-fx-piece="clu-p-' + player.index + '" data-fx-enter="rise" style="--pc:' + player.color + '" title="' + U.escape(player.name) + '"><b>' + (player.index + 1) + "</b></i>"
        ).join("") +
        "</span>" +
        (steps ? '<span class="cluedo-steps">' + steps + "</span>" : "") +
        "</button>"
      );
    }).join("");
    return '<div class="cluedo-board">' + rooms + "</div>";
  }

  function diceHTML() {
    return (
      '<div class="cluedo-dice" aria-label="نرد الحركة">' +
      '<span class="cluedo-die">' + state.dice[0] + "</span>" +
      '<span class="cluedo-die">' + state.dice[1] + "</span>" +
      '<span class="cluedo-steps-label">= <strong>' + state.steps + "</strong> خطوة</span>" +
      "</div>"
    );
  }

  function actionHTML() {
    const over = state.over;
    const canAct = !over && state.phase === "act";
    const canMove = !over && state.phase === "move";
    return (
      '<div class="cluedo-panel cluedo-actions">' +
      '<span class="cluedo-kicker">أوامر الدور</span>' +
      '<button type="button" class="bg-btn primary" data-act="suggest"' + (canAct && !state.hasSuggested ? "" : " disabled") + '><span>🔍 اقتراح في غرفتي</span></button>' +
      '<div class="cluedo-action-row">' +
      '<button type="button" class="bg-btn" data-act="stay"' + (canMove ? "" : " disabled") + '><span>⏸ تخطَّ الحركة</span></button>' +
      '<button type="button" class="bg-btn" data-act="accuse"' + (over ? " disabled" : "") + '><span>⚖️ اتهام نهائي</span></button>' +
      "</div>" +
      '<button type="button" class="bg-btn" data-act="end"' + (canAct ? "" : " disabled") + '><span>⏭️ إنهاء الدور</span></button>' +
      '<p class="cluedo-hint">' + (over ? "انتهى التحقيق." : state.phase === "move" ? "انقر غرفة مضاءة للانتقال، أو تخطَّ الحركة." : "يمكنك الاقتراح مرة واحدة، أو إنهاء الدور.") + "</p>" +
      "</div>"
    );
  }

  function handHTML(player) {
    if (!player.hand.length) return '<p class="cluedo-empty">لا بطاقات في يدك.</p>';
    return (
      '<div class="cluedo-hand">' +
      ["s", "w", "r"].map((cat) => {
        const cards = player.hand.filter((id) => id.indexOf(cat + ":") === 0);
        if (!cards.length) return "";
        return (
          '<div class="cluedo-hand-group">' +
          '<span class="cluedo-hand-label">' + CAT_NAMES[cat] + " · " + cards.length + "</span>" +
          '<div class="cluedo-hand-cards">' + cards.map((id) => cardChipHTML(id)).join("") + "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function playersHTML() {
    return state.players.map((player) => {
      const active = !state.over && player.index === state.current;
      return (
        '<div class="cluedo-player' + (active ? " active" : "") + (player.active ? "" : " out") + '" style="--p:' + player.color + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<div class="cluedo-player-copy"><strong>' + U.escape(player.name) + (player.isCpu ? ' <span class="cluedo-cpu-tag">🤖 كمبيوتر</span>' : "") + "</strong>" +
        "<small>" + ROOM_BY_ID[player.room].icon + " " + U.escape(ROOM_BY_ID[player.room].name) + " · " + player.hand.length + " بطاقة</small></div>" +
        '<span class="cluedo-player-state">' + (player.active ? (active ? "دوره" : "نشط") : "مُقصى") + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function historyHTML() {
    if (!state.history.length) return '<p class="cluedo-empty">لا اقتراحات بعد. ادخل غرفة ثم اقترح مشتبهًا وسلاحًا.</p>';
    return state.history.map((item) => {
      const by = state.players[item.by];
      return (
        '<div class="cluedo-history-row" style="--p:' + by.color + '">' +
        '<div class="cluedo-history-copy"><strong>' + U.escape(by.name) + "</strong>" +
        '<small>' + [cardName(item.combo.s), cardName(item.combo.w), cardName(item.combo.r)].map((name) => U.escape(name)).join(" · ") + "</small></div>" +
        '<span class="' + (item.refutedBy != null ? "is-refuted" : "is-clear") + '">' +
        (item.refutedBy != null ? "دُحض" : "بلا دحض") +
        "</span>" +
        "</div>"
      );
    }).join("");
  }

  function sideHTML() {
    const player = cur();
    return (
      '<div class="cluedo-panel cluedo-turn">' +
      '<span class="cluedo-kicker">الجولة ' + state.turn + " · " + (state.over ? "انتهت" : state.phase === "move" ? "حركة" : "تحقيق") + "</span>" +
      "<strong>" + U.escape(state.over ? "القضية مغلقة" : player.name) + "</strong>" +
      "<small>" + (state.over ? state.notice : "في " + ROOM_BY_ID[player.room].icon + " " + ROOM_BY_ID[player.room].name) + "</small>" +
      diceHTML() +
      "</div>" +
      actionHTML() +
      '<div class="cluedo-notice">' + U.escape(state.notice) + "</div>" +
      '<div class="cluedo-panel cluedo-players"><span class="cluedo-kicker">المحققون</span>' + playersHTML() + "</div>" +
      '<div class="cluedo-panel cluedo-history"><span class="cluedo-kicker">سجل الاقتراحات</span>' + historyHTML() + "</div>" +
      '<div class="cluedo-panel cluedo-legend">' +
      '<span class="cluedo-kicker">كيف تلعب</span>' +
      '<div class="cluedo-legend-row"><b>🎲</b><span>حرّك داخل الغرف حتى مجموع النرد. الممرات السرية تربط الزوايا.</span></div>' +
      '<div class="cluedo-legend-row"><b>🔍</b><span>اقترح مشتبهًا وسلاحًا في غرفتك؛ أول لاعب يملك بطاقة يعرضها عليك سرًا.</span></div>' +
      '<div class="cluedo-legend-row"><b>⚖️</b><span>الاتهام الخاطئ يُقصيك. الاتهام الصحيح يحسم القضية فورًا.</span></div>' +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "cluedo-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "cluedo-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-cluedo"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">قصر الجريمة</span><strong>٩ غرف · تحقيق متقاطع</strong></div>' +
      '<span class="board-head-hint">الغرف المضاءة ضمن مدى النرد · الممرات السرية مختصرة · القطع المرقّمة للمحققين</span>' +
      "</div>" +
      '<div class="cluedo-board-scroll">' + boardHTML() + "</div>";

    const side = document.createElement("aside");
    side.className = "cluedo-side";
    side.innerHTML = sideHTML();

    const player = viewerPlayer();
    let secretEl = null;
    if (!player) {
      const watch = document.createElement("div");
      watch.className = "cluedo-panel cluedo-watch";
      watch.innerHTML =
        '<span class="cluedo-kicker">👁 وضع المشاهدة</span>' +
        '<strong>أنت تتابع التحقيق</strong>' +
        '<p class="cluedo-hint">بطاقات المحققين سرّية ولا تُعرض على هذا الجهاز. ستُفتح أوراقك عند دورك.</p>';
      secretEl = watch;
    } else if (AI.isCpu(player)) {
      const cpuPanel = document.createElement("div");
      cpuPanel.className = "cluedo-panel cluedo-cpu";
      cpuPanel.innerHTML =
        '<span class="cluedo-kicker">كمبيوتر</span>' +
        "<strong>" + U.escape(player.name) + "</strong>" +
        '<p class="cluedo-hint">الكمبيوتر يفحص أوراقه ويدير التحقيق الآن. تبقى بطاقاته مخفية عن الجميع.</p>';
      secretEl = cpuPanel;
    } else {
      const secret = BG.secretPanel({
        title: "🕵️ أوراق " + player.name,
        owner: player.name,
        hint: "بطاقاتك سرّية. أظهرها فقط عند دورك أو عند طلب دحض، ثم أخفها قبل تمرير الجهاز.",
        open: isOnline() || (state.handRevealed && state.current === player.index),
        autoKey: "cluedo:" + player.index + ":" + state.turn,
        onToggle(visible) {
          state.handRevealed = visible;
          if (!visible) render();
        },
        render() {
          return handHTML(player);
        },
      });
      secretEl = secret.el;
    }
    side.appendChild(secretEl);
    const turnPanel = side.querySelector(".cluedo-turn");
    if (turnPanel && turnPanel.nextSibling) side.insertBefore(secretEl, turnPanel.nextSibling);
    else if (turnPanel) side.appendChild(secretEl);

    wrap.appendChild(boardWrap);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (!state.over && apiRef) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  /* ------------------------------ الأحداث ------------------------------ */

  function handleClick(event) {
    if (!state || state.over || state.busy || AI.isCpu(cur())) return;
    const room = event.target.closest("[data-room]");
    if (room) {
      if (state.phase !== "move") return;
      moveTo(room.getAttribute("data-room"));
      return;
    }
    if (event.target.closest(".secret-panel")) return;
    const action = event.target.closest("[data-act]");
    if (!action) return;
    const act = action.getAttribute("data-act");
    if (act === "suggest") openSuggestion();
    else if (act === "stay") stay();
    else if (act === "accuse") openAccusation();
    else if (act === "end") { if (state.phase === "act" && !state.over) endTurn("manual"); }
  }

  const game = {
    id: "cluedo",
    name: "كلودو",
    en: "CLUEDO",
    icon: "🕵️",
    accent: "#c983b8",
    cardClass: "card-cluedo",
    tagline: "افتح تحقيقًا في قصر الجريمة: اسأل، دحض، ثم اتّهم الفاعل قبل الجميع.",
    players: "2–6",
    duration: "30–60 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 3,

    rules: {
      goal: "اكتشف ثلاث بطاقات القضية المخبأة في الظرف: من ارتكب الجريمة، وبأي سلاح، وفي أي غرفة. اطرح اقتراحات لتضيّق الاحتمالات، ودحض اقتراحات خصومك، ثم قدّم اتهامًا نهائيًا صحيحًا قبل أن يسبقك أحد.",
      facts: [["الغرف", "٩ غرف"], ["المشتبه بهم", "٦"], ["الأسلحة", "٦"], ["بطاقات التحقيق", "٢١ بطاقة"]],
      components: [
        "لوحة قصر من ٩ غرف متصلة بممرات، مع ممرين سرّيين بين الزوايا.",
        "٦ بطاقات مشتبه بهم و٦ بطاقات أسلحة و٩ بطاقات غرف (٢١ بطاقة إجمالًا).",
        "ظرف القضية يحوي بطاقة واحدة من كل فئة: الفاعل، السلاح، المكان.",
        "قطعة لكل محقق، وورقة استنتاج سرّية (يدك في النسخة الرقمية).",
        "نردان لحركة كل دور.",
      ],
      setup: [
        "تُفصل البطاقات إلى ثلاث مجموعات: المشتبه بهم، الأسلحة، الغرف. تُسحب بطاقة عشوائية واحدة من كل مجموعة وتوضع سرًا في ظرف القضية.",
        "تُخلط البطاقات الـ18 المتبقية وتُوزع بالتساوي على اللاعبين في اتجاه عقارب الساعة؛ إذا لم تتساوَ الأعداد يحصل اللاعبون الأوائل على بطاقة إضافية.",
        "في لعبة اللاعبين الاثنين يحصل كل لاعب على ٩ بطاقات، ويُترك الظرف مغلقًا طوال اللعب.",
        "تبدأ جميع القطع في البهو. يبدأ اللاعب الأول، ثم ينتقل الدور بالتناوب بين المحققين النشطين.",
        "بطاقات اليد سرّية دائمًا. لا يُظهرها اللاعب إلا عند دوره أو عند دحض اقتراح، وبطاقة واحدة فقط.",
      ],
      steps: [
        "<strong>الحركة:</strong> ارمِ النردين في بداية دورك. يمكنك الانتقال إلى أي غرفة تبعد عن غرفتك بعدد خطوات لا يتجاوز مجموع النرد. كل غرفة تُحتسب خطوة واحدة، والممرات السرية تربط المكتب بالمطبخ والدفيئة بالصالة بخطوة واحدة. يمكنك أيضًا البقاء في مكانك.",
        "<strong>الاقتراح:</strong> بعد الحركة، وأنت داخل غرفة، يمكنك اقتراح مشتبه به وسلاح. الغرفة المقترحة هي الغرفة التي تقف فيها حتمًا. الاقتراح يُنهي دورك.",
        "<strong>الدحض:</strong> يبدأ اللاعب التالي لك في السؤال سرًا: هل يملك أي بطاقة من العناصر الثلاثة؟ أول لاعب يملك بطاقة مطابقة يعرض عليك بطاقة واحدة فقط من اختياره، دون أن يراها بقية اللاعبين. إن كان يملك أكثر من بطاقة، يختار واحدة فقط.",
        "<strong>لا دحض:</strong> إذا لم يملك أي لاعب نشط أو مُقصى أي بطاقة من العناصر الثلاثة، فلا أحد يدحض اقتراحك. هذا يعني أن أحد العناصر الثلاثة على الأقل قد يكون في ظرف القضية.",
        "<strong>الاتهام النهائي:</strong> في أي وقت من دورك، بدلًا من الاقتراح أو بعده، يمكنك تقديم اتهام نهائي بتحديد الفاعل والسلاح والمكان. الاتهام الصحيح يكشف الظرف ويفوز فورًا. الاتهام الخاطئ يُقصيك من الحركة والاقتراح، لكنك تبقى مطالبًا بدحض اقتراحات الآخرين ببطاقاتك.",
        "<strong>تبادل الأدوار:</strong> بعد الاقتراح أو إنهاء الدور، أخفِ أوراقك ومرّر الجهاز إلى المحقق التالي النشط. تُخفى الأوراق تلقائيًا عند تغيّر الدور.",
      ],
      winning: "يفوز من يقدّم اتهامًا نهائيًا صحيحًا ويكشف بطاقات الظرف الثلاث. إذا أُقصي جميع المحققين الآخرين بالأخطاء، يفوز المحقق النشط الأخير بالقضية. لا يمكن للمُقصى أن يقدّم اتهامًا أو اقتراحًا، لكنه يظل مطالبًا بدحض الاقتراحات.",
      notes: [
        "النسخة الرقمية تبسّط الحركة: الغرف عقد متصلة، وتُحتسب كل غرفة خطوة، ويُسمح بالمرور عبر الغرف حتى مجموع النرد. لا توجد مربعات ممرات منفصلة.",
        "الاقتراح يستخدم غرفتك الحالية تلقائيًا وينهي دورك، بدل السماح بالاقتراح ثم مواصلة الحركة.",
        "قطع المشتبه بهم والأسلحة لا تتحرك على اللوحة عند الاقتراح؛ الاقتراح للاستنتاج فقط.",
        "الممرات السرية: المكتب ↔ المطبخ، والدفيئة ↔ الصالة.",
        "في لعبة اللاعبين الاثنين تُوزع ٩ بطاقات لكل لاعب بدل التوزيع الكامل، ويظل الظرف سرّيًا حتى الاتهام الصحيح أو نهاية اللعبة.",
        "لا تُكشف بطاقة الدحض في السجل العام؛ تظهر فقط في نافذة سرّية للمحقق صاحب الاقتراح.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        color: PCOLORS[i % PCOLORS.length],
        hand: [],
        known: new Set(),
        envelopeKnown: new Set(),
        room: "hall",
        active: true,
      }));

      const envelope = {
        s: U.pick(SUSPECTS).id,
        w: U.pick(WEAPONS).id,
        r: U.pick(ROOMS).id,
      };
      const reserved = ["s:" + envelope.s, "w:" + envelope.w, "r:" + envelope.r];
      const deck = U.shuffle(fullDeck().filter((id) => !reserved.includes(id)));
      deck.forEach((id, i) => { players[i % players.length].hand.push(id); });
      players.forEach((player) => { player.known = new Set(player.hand); });

      state = {
        players,
        current: 0,
        turn: 1,
        phase: "move",
        dice: [1, 1],
        steps: 2,
        reachable: [],
        envelope,
        over: false,
        winner: null,
        notice: "",
        handRevealed: false,
        hasSuggested: false,
        busy: false,
        lastSuggestion: null,
        lastAccusation: null,
        history: [],
      };

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get envelope() { return state.envelope; },
          get players() { return state.players; },
          render, beginTurn, moveTo, stay, endTurn, resolveSuggestion, resolveAccusation,
          reachableRooms, distances,
          cpuTakeTurn, cpuAccusation, cpuCombo, cpuRefutePick, syncCpu,
          ROOMS, ROOM_BY_ID, SUSPECTS, WEAPONS, CARD_MAP, cards: CARD_MAP,
          cardName, playersIn: (roomId) => state.players.filter((p) => p.room === roomId).map((p) => p.name),
        };
      }

      rootRef.addEventListener("click", handleClick);

      const bots = players.filter((player) => player.isCpu).length;
      apiRef.log(
        "بدأت كلودو — ٩ غرف و٢١ بطاقة. ظرف القضية مختوم، وكل محقق يملك " +
        players[0].hand.length + " بطاقة." + (bots ? " " + bots + " مقعد كمبيوتر." : ""),
        "accent"
      );
      beginTurn(false);
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.busy = false;
          state.handRevealed = false;
          state.dice = Array.isArray(state.dice) ? state.dice : [1, 1];
          state.reachable = Array.isArray(state.reachable) ? state.reachable : [];
          state.players.forEach((player) => {
            player.hand = Array.isArray(player.hand) ? player.hand : [];
            if (!(player.known instanceof Set)) player.known = new Set(Array.isArray(player.known) ? player.known : []);
            if (!(player.envelopeKnown instanceof Set)) player.envelopeKnown = new Set(Array.isArray(player.envelopeKnown) ? player.envelopeKnown : []);
          });
          render();
        },
        netSeat() {
          return state ? state.current : -1;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state || state.over) return;
          render();
        },
        netRefuteMatches(seat, combo) {
          if (!state || !combo) return [];
          const player = state.players[seat];
          if (!player) return [];
          return player.hand.filter((id) => id === combo.s || id === combo.w || id === combo.r);
        },
        netCardInfo(id) {
          const card = cardOf(id);
          if (!card) return null;
          return { name: card.name, icon: card.icon, cat: card.catName, color: card.color };
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (rootRef) rootRef.removeEventListener("click", handleClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
