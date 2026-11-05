/* ==========================================================================
   وحدة المضيف — لوحة التحكم، استبدال اللاعبين بالكمبيوتر، ونقل الاستضافة
   --------------------------------------------------------------------------
   1) لوحة تحكم المضيف: غرفة خاصة/عامة، طرد (مع حظر العودة)، تبديل مواقع اللاعبين،
      تغيير اللعبة في أي وقت، جعل لاعب آخر مضيفًا، إنهاء اللعبة.
   2) انقطاع/خروج أي لاعب (غير المضيف) ⇒ يحلّ مكانه كمبيوتر «خبير» بعد مهلة قصيرة،
      وعند دخول أي لاعب ⇒ يلعب مكان الكمبيوتر (وإن كان العائد نفسه فيعود لمقعده).
   3) خروج/انقطاع المضيف ⇒ ينتقل لعب الاستضافة إلى لاعب آخر (يُنتخب بالترتيب نفسه عند
      الجميع) ويُستبدل المضيف السابق بكمبيوتر؛ وعند عودته يستردّ مقعده وصلاحياته.

   تقنيًا: لا يغيّر أي لعبة. التبديل بين بشري/كمبيوتر يتمّ بتعديل لقطة الحالة
   (players[i].isCpu/type/level/name) عبر BG.app.netPatchPlayer.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const GRACE_MS = 6000;            // مهلة قبل استبدال لاعب منقطع بكمبيوتر
  const MIGRATION_GRACE_MS = 14000; // مهلة أطول أثناء نقل الاستضافة (يحتاج الجميع لإعادة الانضمام)
  const JOIN_WINDOW_MS = 11000;

  const st = {
    visibility: "private",
    banned: new Set(),
    kicking: new Set(),
    seatOrder: [],
    lastPeers: [],
    selfId: "",
    code: "",
    hostRole: false,
    panel: null,
    pubTimer: null,
    migrating: false,
    migrations: 0,
    wasInGame: false,
    kicked: false,
    aloneTimer: null,
    handingOver: false,
    peakHumans: 0,
    lastTrouble: 0,
  };

  const core = () => (BG.online && BG.online._core) || null;
  const S = () => core().state;
  const esc = (value) => BG.util.escape(value);
  const norm = (value) => String(value == null ? "" : value).trim().toLowerCase();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function myName() {
    const s = S();
    return s.name || core().savedName() || "اللاعب";
  }

  /* ------------------------------ رموز النقل (حتمية عند الجميع) ------------------------------ */

  function derive(code, n) {
    const text = String(code || "").toUpperCase() + "|" + n;
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    let out = "";
    for (let i = 0; i < 4; i++) {
      out += ALPHABET[h % ALPHABET.length];
      h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    }
    return out;
  }

  /* ------------------------------ تتبّع اللاعبين ------------------------------ */

  function humanPeers() {
    return ((BG.net && BG.net.peers) || []).filter(Boolean);
  }

  function onPeers() {
    if (!BG.net || !core()) return;
    const peers = humanPeers().map((p) => ({ id: p.id, name: p.name, host: !!p.host }));
    if (peers.length) {
      st.lastPeers = peers;
      st.selfId = BG.net.selfId || st.selfId;
      st.code = BG.net.roomCode || st.code;
      st.hostRole = !!BG.net.isHost;
    }
    if (peers.length > st.peakHumans) st.peakHumans = peers.length;
    if (st.panel) renderPanel();
    if (st.hostRole && st.visibility === "public") schedulePublish(400);
    watchAlone(peers.length);
  }

  /** المضيف بقي وحده فجأة وسط لعبة. إن كان سبب ذلك انقطاع إنترنته هو (لا مغادرة الآخرين) نلحق بالغرفة المنقولة. */
  function watchAlone(count) {
    const s = S();
    clearTimeout(st.aloneTimer);
    st.aloneTimer = null;
    if (!s.inGame || !s.isHost || st.migrating) return;
    if (count > 1) return;
    if (st.peakHumans < 2) return;
    if (Date.now() - st.lastTrouble > 120000) return; // لم نلحظ مشكلة في اتصالنا: الآخرون غادروا فعلًا
    st.aloneTimer = setTimeout(() => {
      st.aloneTimer = null;
      const live = humanPeers().length;
      if (live > 1 || !S().inGame || !S().isHost || st.migrating) return;
      recoverAsFormerHost("انقطع اتصالك — جارٍ البحث عن الغرفة المنقولة…");
    }, GRACE_MS + 2000);
  }

  function orderPeers(list) {
    if (!st.seatOrder.length) return list;
    const rank = (peer) => {
      const i = st.seatOrder.indexOf(peer.id);
      return i < 0 ? 1000 : i;
    };
    return list.slice().sort((a, b) => rank(a) - rank(b));
  }

  /* ------------------------------ المقاعد ------------------------------ */

  function publicSeats() {
    return S().seats.map((seat) => ({
      name: seat.name,
      type: seat.type,
      isCpu: seat.type === "cpu",
      level: seat.level,
      peerId: seat.peerId || null,
      proxyFor: seat.proxyFor || null,
    }));
  }

  function broadcastSeats() {
    if (!BG.net || !BG.net.isHost) return;
    BG.net.broadcast({ t: "seats", seats: publicSeats() });
  }

  function applySeatsInPlace(list) {
    const s = S();
    list = Array.isArray(list) ? list : [];
    s.seats.length = 0;
    list.forEach((item) => s.seats.push(Object.assign({}, item)));
  }

  function note(message, kind) {
    if (BG.app && BG.app.appendLog) BG.app.appendLog(message, kind || "accent");
    if (BG.net && BG.net.isHost) BG.net.broadcast({ t: "log", message, kind: kind || "accent" });
  }

  function patchGame(index, patch) {
    const s = S();
    if (!s.hostReady || !BG.app || !BG.app.netPatchPlayer) return false;
    return BG.app.netPatchPlayer(index, patch);
  }

  function afterSeatChange() {
    const s = S();
    s.synced = Object.create(null);
    s.lastHash = "";
    broadcastSeats();
    core().updateHud();
    if (s.hostReady) core().hostTick();
  }

  /* لاعب بشري ← كمبيوتر خبير */
  function convertToCpu(index, message) {
    const s = S();
    const seat = s.seats[index];
    if (!seat || seat.type !== "human") return false;
    if (seat.peerId && seat.peerId === BG.net.selfId) return false;
    const human = seat.name;
    seat.proxyFor = human;
    seat.type = "cpu";
    seat.isCpu = true;
    seat.level = "expert";
    seat.peerId = null;
    seat.name = "كمبيوتر خبير (" + human + ")";
    patchGame(index, { cpu: true, level: "expert", name: seat.name });
    BG.toast(message || ("حلّ كمبيوتر خبير مكان " + human + "."), "warn");
    note("حلّ <strong>كمبيوتر خبير</strong> مكان <strong>" + esc(human) + "</strong>.", "warn");
    afterSeatChange();
    return true;
  }

  /* كمبيوتر ← لاعب بشري يجلس مكانه */
  function takeSeat(index, peer) {
    const s = S();
    const seat = s.seats[index];
    if (!seat) return false;
    seat.type = "human";
    seat.isCpu = false;
    seat.peerId = peer.id;
    seat.name = peer.name || "لاعب";
    delete seat.proxyFor;
    patchGame(index, { cpu: false, name: seat.name });
    BG.toast(seat.name + " جلس مكان الكمبيوتر.", "good");
    note("<strong>" + esc(seat.name) + "</strong> جلس مكان الكمبيوتر.", "good");
    return true;
  }

  function markAwayWithGrace(index, ms) {
    const s = S();
    const seat = s.seats[index];
    if (!seat || seat.type !== "human" || s.away[index]) return;
    const name = seat.name || "أحد اللاعبين";
    s.away[index] = {
      name,
      timer: setTimeout(() => {
        delete s.away[index];
        if (!BG.net.isHost) return;
        convertToCpu(index);
      }, Math.max(0, ms)),
    };
  }

  /** يُستدعى من online.js عند انقطاع لاعب أثناء اللعب (المضيف فقط). */
  function onSeatLost(index) {
    const s = S();
    if (st.migrating) return true;
    const seat = s.seats[index];
    if (!seat || seat.type !== "human") return true;
    if (s.overShown) return true;
    if (seat.peerId && seat.peerId === BG.net.selfId) return true;
    if (s.away[index]) return true;
    const name = seat.name || "أحد اللاعبين";
    const kicked = !!(seat.peerId && st.kicking.has(seat.peerId));
    if (kicked) {
      st.kicking.delete(seat.peerId);
      convertToCpu(index, "طُرد " + name + " — حلّ كمبيوتر خبير مكانه.");
      return true;
    }
    BG.toast("انقطع اتصال " + name + " — سيحلّ مكانه كمبيوتر خبير بعد لحظات إن لم يعد.", "warn");
    markAwayWithGrace(index, GRACE_MS);
    if (s.lastSeat === index) core().showWaiting(true, index, name + " انقطع اتصاله — بانتظار عودته…");
    return true;
  }

  function sendStart(peer) {
    const s = S();
    BG.net.sendTo(peer.id, {
      t: "start",
      payload: {
        gameId: s.game.id,
        seats: publicSeats(),
        level: s.level,
        options: (s.config && s.config.options) || null,
        roomCode: BG.net.roomCode,
        owner: s.owner || "",
      },
    });
  }

  /** انضمام أثناء اللعب: عودة لاعب منقطع، أو جلوس مكان كمبيوتر، أو مشاهدة. */
  function onLateJoin(peer) {
    const s = S();
    if (!s.inGame || !s.isHost || !s.hostReady || !s.game || !peer || !peer.id) return true;
    const lname = norm(peer.name);
    if (st.banned.has(lname)) {
      BG.net.kick(peer.id);
      return true;
    }

    let index = -1;
    const awayIndex = Object.keys(s.away).map(Number).find((i) => norm((s.seats[i] || {}).name) === lname);
    if (awayIndex !== undefined) {
      clearTimeout(s.away[awayIndex].timer);
      delete s.away[awayIndex];
      s.seats[awayIndex].peerId = peer.id;
      index = awayIndex;
      BG.toast((s.seats[index].name || "اللاعب") + " عاد إلى الطاولة.", "good");
      note("<strong>" + esc(s.seats[index].name) + "</strong> عاد إلى مقعده.", "good");
    } else {
      index = s.seats.findIndex((x) => x.type === "cpu" && x.proxyFor && norm(x.proxyFor) === lname);
      if (index < 0) index = s.seats.findIndex((x) => x.type === "cpu" && x.proxyFor);
      if (index < 0) index = s.seats.findIndex((x) => x.type === "cpu");
      if (index >= 0) takeSeat(index, peer);
    }

    s.synced[peer.id] = false;
    if (BG.net.ensureHostConnections) BG.net.ensureHostConnections();
    sendStart(peer);
    afterSeatChange();

    /* المضيف الأصلي عاد: نردّ له الاستضافة */
    const owner = norm(s.owner);
    if (owner && owner === lname && owner !== norm(s.name) && !st.handingOver) {
      st.handingOver = true;
      setTimeout(() => {
        st.handingOver = false;
        const stillThere = humanPeers().find((p) => norm(p.name) === owner);
        if (stillThere && S().isHost && S().inGame) handoverTo(stillThere.id);
      }, 2200);
    }
    return true;
  }

  /* ------------------------------ الطرد والحظر ------------------------------ */

  function kickPeer(peerId) {
    const peer = humanPeers().find((p) => p.id === peerId);
    if (!peer || peer.host || peerId === BG.net.selfId) return;
    st.banned.add(norm(peer.name));
    st.kicking.add(peerId);
    BG.net.kick(peerId);
    BG.toast("طُرد " + peer.name + ".", "warn");
  }

  function onPeerJoined(peer) {
    if (!peer || !BG.net.isHost) return false;
    if (st.banned.has(norm(peer.name))) {
      BG.net.kick(peer.id);
      return true;
    }
    return false;
  }

  /* ------------------------------ نشر الغرفة العامة ------------------------------ */

  function publishNow() {
    if (!BG.net || !BG.net.isHost || st.visibility !== "public" || !BG.net.roomCode) return;
    const c = core();
    const s = c.state;
    const game = s.inGame && s.game ? s.game : c.gameDef(s.lobbyGame);
    BG.net.directory.publish({
      code: BG.net.roomCode,
      mode: BG.net.mode,
      host: s.name || myName(),
      game: game ? game.name : "",
      players: humanPeers().length,
      max: s.inGame ? s.seats.length : (s.seatCount || (game && game.maxPlayers) || 0),
      inGame: !!s.inGame,
    }).catch(() => {});
  }

  function schedulePublish(delay) {
    clearTimeout(st.pubTimer);
    st.pubTimer = setTimeout(() => {
      publishNow();
      if (st.visibility === "public" && BG.net && BG.net.isHost) schedulePublish(25000);
    }, delay == null ? 0 : delay);
  }

  async function setVisibility(mode) {
    if (mode === "public") {
      if (!BG.net.directory || (BG.net.relayMissing && BG.net.relayMissing())) {
        BG.toast("الغرف العامة تحتاج خدمة الغرف (اضبط عنوانها في الوضع المدرسي).", "warn");
        return false;
      }
      try {
        st.visibility = "public";
        await BG.net.directory.publish({
          code: BG.net.roomCode,
          mode: BG.net.mode,
          host: myName(),
          game: "",
          players: humanPeers().length,
          max: 0,
          inGame: !!S().inGame,
        });
      } catch (err) {
        st.visibility = "private";
        BG.toast("تعذّر نشر الغرفة: خدمة الغرف غير متاحة.", "warn");
        return false;
      }
      schedulePublish(0);
      BG.toast("الغرفة الآن عامة — تظهر في قائمة الغرف العامة.", "good");
    } else {
      st.visibility = "private";
      clearTimeout(st.pubTimer);
      st.pubTimer = null;
      if (BG.net.directory && BG.net.roomCode) BG.net.directory.remove(BG.net.roomCode);
      BG.toast("الغرفة الآن خاصة — لا ينضم إلا من يملك الرمز.", "good");
    }
    if (st.panel) renderPanel();
    return true;
  }

  function unpublish() {
    clearTimeout(st.pubTimer);
    st.pubTimer = null;
    if (st.visibility === "public" && BG.net && BG.net.directory && (BG.net.roomCode || st.code)) {
      BG.net.directory.remove(BG.net.roomCode || st.code);
    }
  }

  /* ------------------------------ تغيير اللعبة / التبديل / الإنهاء ------------------------------ */

  function changeGame(gameId, autoStart) {
    const c = core();
    const s = c.state;
    if (!BG.net.isHost) return;
    const game = c.gameDef(gameId);
    if (!game) return;
    const go = () => {
      s.lobbyGame = gameId;
      s.seatCount = c.clampSeatCount(game, s.seatCount);
      c.broadcastConfig();
      c.renderLobby();
      if (autoStart) {
        setTimeout(() => {
          if (BG.net.isHost && !S().inGame && S().lobbyGame === gameId) c.startAsHost();
        }, 800);
      }
      if (st.visibility === "public") schedulePublish(200);
    };
    if (s.inGame) {
      c.abortGame("غيّر المضيف اللعبة إلى «" + game.name + "».", true);
      setTimeout(go, 150);
    } else {
      go();
    }
  }

  function endGame() {
    const s = S();
    if (!s.inGame || !BG.net.isHost) return;
    core().abortGame("أنهى المضيف اللعبة.", true);
  }

  /** تبديل ترتيب لاعب مع جاره (في الانتظار: ترتيب المقاعد؛ أثناء اللعب: تبادل المقعدين فعليًا). */
  function moveSeat(index, direction) {
    const c = core();
    const s = c.state;
    if (!BG.net.isHost) return;
    if (!s.inGame) {
      const ids = orderPeers(c.lobbyHumanPeers()).map((p) => p.id);
      const j = index + direction;
      if (index < 0 || j < 0 || j >= ids.length) return;
      const tmp = ids[index];
      ids[index] = ids[j];
      ids[j] = tmp;
      st.seatOrder = ids;
      c.broadcastConfig();
      c.renderLobby();
      renderPanel();
      return;
    }
    swapSeats(index, index + direction);
  }

  function swapSeats(a, b) {
    const c = core();
    const s = c.state;
    if (!s.inGame || !s.isHost || !s.hostReady) return;
    const A = s.seats[a];
    const B = s.seats[b];
    if (!A || !B || a === b) return;
    const fields = ["name", "type", "isCpu", "level", "peerId", "proxyFor"];
    const tmp = {};
    fields.forEach((k) => { tmp[k] = A[k]; });
    fields.forEach((k) => { A[k] = B[k]; });
    fields.forEach((k) => { B[k] = tmp[k]; });
    [a, b].forEach((i) => {
      const seat = s.seats[i];
      patchGame(i, { cpu: seat.type === "cpu", level: seat.level, name: seat.name });
    });
    Object.keys(s.away).forEach((key) => { clearTimeout(s.away[key].timer); delete s.away[key]; });
    const mine = s.seats.findIndex((x) => x.peerId && x.peerId === BG.net.selfId);
    if (mine !== s.localSeat) {
      s.localSeat = mine;
      if (BG.app.netRebuild) BG.app.netRebuild(mine);
    }
    s.synced = Object.create(null);
    s.lastHash = "";
    BG.net.broadcast({ t: "reseat", seats: publicSeats() });
    core().updateHud();
    c.hostTick();
    const active = s.lastSeat;
    const owner = s.seats[active];
    if (owner && owner.type === "human" && owner.peerId && owner.peerId !== BG.net.selfId) {
      const snap = BG.app.netSnapshot();
      if (snap) c.sendSync(active, snap, true);
    }
    note("بدّل المضيف موقعي <strong>" + esc(A.name) + "</strong> و<strong>" + esc(B.name) + "</strong>.", "accent");
    renderPanel();
  }

  /* ------------------------------ رسائل الضيوف ------------------------------ */

  function onHostMessage() {
    return false;
  }

  function onGuestMessage(from, data) {
    const c = core();
    const s = c.state;
    if (data.t === "seats") {
      applySeatsInPlace(data.seats);
      const mine = s.seats.findIndex((x) => x.peerId && x.peerId === BG.net.selfId);
      if (mine >= 0) s.localSeat = mine;
      c.updateHud();
      return true;
    }
    if (data.t === "reseat") {
      applySeatsInPlace(data.seats);
      const mine = s.seats.findIndex((x) => x.peerId && x.peerId === BG.net.selfId);
      s.localSeat = mine;
      if (BG.app.netSetRole) BG.app.netSetRole(false, mine);
      if (s.activeGuest || s.spectating) {
        s.activeGuest = false;
        s.spectating = false;
        clearInterval(s.guestTimer);
        s.guestTimer = null;
        if (BG.app.netDeactivate) BG.app.netDeactivate();
      }
      BG.toast(mine >= 0 ? "بدّل المضيف مقعدك — أنت الآن في المقعد " + (mine + 1) + "." : "بدّل المضيف المقاعد.", "good");
      c.updateHud();
      return true;
    }
    if (data.t === "kicked") {
      st.kicked = true;
      s.lastJoin = null;
      const reason = data.reason || "طردك المضيف من الغرفة.";
      c.shutdown(true);
      BG.alert("تم طردك", reason).then(() => {
        st.kicked = false;
        if (BG.app) BG.app.goLibrary();
      });
      return true;
    }
    if (data.t === "migrate") {
      followMigration(data.code);
      return true;
    }
    if (data.t === "migrate-host") {
      acceptHost(data);
      return true;
    }
    return false;
  }

  /* ------------------------------ نقل الاستضافة ------------------------------ */

  function softReset() {
    const c = core();
    const s = c.state;
    clearInterval(s.hostTimer);
    clearInterval(s.guestTimer);
    s.hostTimer = null;
    s.guestTimer = null;
    clearTimeout(s.spectateTimer);
    s.spectateTimer = null;
    s.pendingSpectate = null;
    s.isHost = false;
    s.hostReady = false;
    s.activeGuest = false;
    s.spectating = false;
    s.inGame = false;
    c.clearAway();
  }

  function banner(text) {
    const s = S();
    if (st.wasInGame) core().showWaiting(true, null, text);
    else {
      const status = s.overlay && s.overlay.querySelector("[data-net-status]");
      if (status) status.textContent = text;
    }
  }

  async function tryCreate(code) {
    try {
      await BG.net.createRoom(myName(), { code });
      if (BG.net.roomCode !== code) {
        BG.net.leave();
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async function tryCreateWithRetry(code) {
    for (let i = 0; i < 3; i++) {
      if (await tryCreate(code)) return true;
      await sleep(1200);
    }
    return false;
  }

  async function joinWindow(code, ms) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      try {
        await BG.net.joinRoom(code, myName());
        return true;
      } catch (err) {
        /* الغرفة لم تُنشأ بعد */
      }
      await sleep(1400);
    }
    return false;
  }

  function afterJoinedAsGuest(code) {
    const c = core();
    const s = c.state;
    s.inRoom = true;
    s.isHost = false;
    s.lastJoin = { code, name: myName() };
    st.code = code;
    st.hostRole = false;
    st.migrating = false;
    st.peakHumans = 0;
    if (st.wasInGame) c.showWaiting(true, null, "جارٍ العودة إلى الطاولة…");
    else c.renderLobby();
    BG.toast("عدتَ إلى الغرفة (" + code + ").", "good");
  }

  /** هذا الجهاز أصبح المضيف. */
  function becomeHost(snap, activeSeat) {
    const c = core();
    const s = c.state;
    st.migrating = false;
    st.hostRole = true;
    st.code = BG.net.roomCode || st.code;
    st.peakHumans = 0;
    s.inRoom = true;
    s.isHost = true;
    s.lastJoin = null;
    const selfNow = BG.net.selfId;
    st.selfId = selfNow;

    if (st.wasInGame && s.game && snap) {
      const mine = s.seats.findIndex((x) => x.type === "human" && norm(x.name) === norm(myName()));
      s.localSeat = mine;
      s.seats.forEach((seat, i) => {
        if (seat.type !== "human") return;
        if (i === mine) { seat.peerId = selfNow; return; }
        seat.peerId = null;
        markAwayWithGrace(i, MIGRATION_GRACE_MS);
      });
      if (BG.app.netSetRole) BG.app.netSetRole(true, mine);
      s.inGame = true;
      s.starting = false;
      s.initialized = false;
      s.lastHash = "";
      s.lastSeat = -1;
      s.synced = Object.create(null);
      s.pendingReady.clear();
      const ok = BG.app.netPromoteToHost(snap);
      if (!ok) {
        BG.toast("تعذّر استئناف اللعبة بعد نقل الاستضافة.", "warn");
        core().abortGame("تعذّر استئناف اللعبة.", true);
        return;
      }
      s.hostReady = true;
      c.buildHud();
      c.showWaiting(false);
      c.hostStarted();
      note("أصبح <strong>" + esc(myName()) + "</strong> مضيف الغرفة.", "accent");
      /* لاعبون انضموا قبل أن نكمل التجهيز (رسائل دخولهم وصلت في نفس الدفعة مع إنشاء الغرفة): نعالجهم الآن */
      humanPeers().filter((p) => !p.host && p.id !== selfNow).forEach((p) => onLateJoin(p));
    } else {
      c.renderLobby();
      c.broadcastConfig();
    }
    BG.toast("أصبحتَ مضيف الغرفة (" + (BG.net.roomCode || "") + ").", "good");
    if (st.visibility === "public") schedulePublish(500);
  }

  /** أكواد الغرف المنقولة المحتملة (عمق مستويين لأن النقل قد يتكرر أثناء غياب لاعب) */
  function chainCodes(base) {
    const list = [];
    for (let a = 1; a <= 3; a++) {
      const c1 = derive(base, a);
      list.push(c1);
      for (let b = 1; b <= 2; b++) list.push(derive(c1, b));
    }
    return list;
  }

  /* هل المضيف الأصلي حيّ فعلًا؟ (مشكلة اتصالي أنا فقط) — نعود إليه بدل تشعّب الغرفة إلى نسختين */
  async function probeOriginal(code, ms) {
    if (!code) return false;
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      try {
        await BG.net.joinRoom(code, myName());
        return true;
      } catch (err) { /* الغرفة مغلقة */ }
      await sleep(1300);
    }
    return false;
  }

  async function startMigration(info) {
    const c = core();
    const s = c.state;
    if (st.migrating) return;
    st.migrating = true;
    st.wasInGame = !!s.inGame;
    unpublish();

    const peers = st.lastPeers.slice();
    const candidates = peers.filter((p) => !p.host);
    const meId = st.selfId;
    const baseCode = st.code || (s.lastJoin && s.lastJoin.code) || "";
    const snap = s.inGame && BG.app ? BG.app.netSnapshot() : null;
    const activeSeat = s.inGame && BG.app ? BG.app.netSeat() : -1;
    const reason = (info && info.reason) || "انقطع المضيف.";

    BG.toast(reason + " — جارٍ نقل الاستضافة إلى لاعب آخر…", "warn");
    BG.net.leave();
    softReset();
    banner("انقطع المضيف — جارٍ نقل الاستضافة…");

    /* قد يكون الانقطاع من جهتي أنا والمضيف حيّ: نجرّب الغرفة الأصلية أولًا */
    if (await probeOriginal(baseCode, 4500)) {
      afterJoinedAsGuest(baseCode);
      return;
    }

    const rounds = Math.min(3, Math.max(1, candidates.length));
    for (let round = 1; round <= rounds; round++) {
      const code = derive(baseCode, round);
      const elected = candidates[round - 1];
      if (elected && elected.id === meId) {
        if (await tryCreateWithRetry(code)) {
          becomeHost(snap, activeSeat);
          return;
        }
      } else if (await joinWindow(code, JOIN_WINDOW_MS)) {
        afterJoinedAsGuest(code);
        return;
      }
    }
    await reconnectLoop(baseCode, 40000);
  }

  /** محاولات إعادة الاتصال بأي غرفة معروفة (الأصلية أو المنقولة) */
  async function reconnectLoop(baseCode, ms) {
    const s = S();
    const codes = [baseCode].concat(chainCodes(baseCode)).filter((value, index, list) => value && list.indexOf(value) === index);
    const deadline = Date.now() + ms;
    banner("جارٍ إعادة الاتصال بالغرفة…");
    while (Date.now() < deadline) {
      for (const code of codes) {
        try {
          await BG.net.joinRoom(code, myName());
          afterJoinedAsGuest(code);
          return true;
        } catch (err) { /* التالي */ }
      }
      await sleep(3000);
    }
    st.migrating = false;
    s.inRoom = false;
    s.inGame = false;
    core().shutdown(true);
    BG.alert("انتهت الغرفة", "تعذّرت إعادة الاتصال بالغرفة.").then(() => {
      if (BG.app) BG.app.goLibrary();
    });
    return false;
  }

  /** المضيف الذي انقطع: يبحث عن الغرفة التي نُقلت الاستضافة إليها ليعود لاعبًا ويستردّ صلاحياته. */
  async function recoverAsFormerHost(text) {
    const c = core();
    const s = c.state;
    if (st.migrating) return;
    st.migrating = true;
    st.wasInGame = !!s.inGame;
    unpublish();
    const baseCode = st.code || BG.net.roomCode || "";
    BG.net.leave();
    softReset();
    banner(text || "جارٍ إعادة الاتصال…");
    const codes = chainCodes(baseCode);
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      for (const code of codes) {
        try {
          await BG.net.joinRoom(code, myName());
          afterJoinedAsGuest(code);
          return true;
        } catch (err) { /* التالي */ }
      }
      await sleep(3000);
    }
    st.migrating = false;
    s.inRoom = false;
    c.shutdown(true);
    BG.alert("انتهت الغرفة", "لم نجد الغرفة بعد انقطاع الاتصال.").then(() => {
      if (BG.app) BG.app.goLibrary();
    });
    return false;
  }

  /** الغرفة أُغلقت من جهة المضيف أو انقطع الاتصال به: نتولّى نقل الاستضافة. */
  function onRoomClosed(info) {
    const s = S();
    if (st.kicked || !s.inRoom) return false;
    if (st.migrating) return true;
    const reason = (info && info.reason) || "";
    if (/طرد/.test(reason)) return false;
    if (BG.net.isHost) return false;
    if (!st.lastPeers.length || !st.code) return false;
    startMigration({ reason: reason || "أُغلقت الغرفة." });
    return true;
  }

  /** انقطع النقل (الإشارة/السيرفر) عن هذا الجهاز نفسه. */
  function onTransportClosed() {
    const s = S();
    if (!s) return false;
    if (st.migrating) return true;
    if (!s.inRoom || st.kicked) return false;
    st.lastTrouble = Date.now();
    if (!st.code) return false;
    if (st.hostRole || s.isHost) {
      recoverAsFormerHost("انقطع اتصالك — جارٍ البحث عن الغرفة…");
    } else {
      st.migrating = true;
      st.wasInGame = !!s.inGame;
      softReset();
      reconnectLoop(st.code, 60000);
    }
    return true;
  }

  /* التسليم الاختياري: لاعب آخر يصبح المضيف (أو استرداد المضيف الأصلي صلاحياته) */
  function handoverTo(peerId) {
    const c = core();
    const s = c.state;
    if (!BG.net.isHost || st.migrating) return;
    const target = humanPeers().find((p) => p.id === peerId);
    if (!target || target.host) return;
    const code = derive(BG.net.roomCode, 1);
    const snap = s.inGame && BG.app ? BG.app.netSnapshot() : null;
    const msg = {
      t: "migrate-host",
      code,
      owner: target.name,
      gameId: s.inGame && s.game ? s.game.id : s.lobbyGame,
      level: s.level,
      options: (s.config && s.config.options) || null,
      seats: s.inGame ? publicSeats() : null,
      snap,
      activeSeat: s.inGame ? BG.app.netSeat() : -1,
      visibility: st.visibility,
      seatCount: s.seatCount,
    };
    BG.net.sendTo(peerId, msg);
    BG.net.broadcast({ t: "migrate", code, hostName: target.name }, peerId);
    BG.toast("جارٍ نقل الاستضافة إلى " + target.name + "…", "good");
    unpublish();
    st.migrating = true;
    st.wasInGame = !!s.inGame;
    setTimeout(async () => {
      BG.net.leave();
      softReset();
      banner("انتقلت الاستضافة إلى " + target.name + "…");
      if (await joinWindow(code, 20000)) afterJoinedAsGuest(code);
      else await reconnectLoop(code, 30000);
    }, 800);
    closePanel();
  }

  async function followMigration(code) {
    const s = S();
    if (st.migrating || !code) return;
    st.migrating = true;
    st.wasInGame = !!s.inGame;
    BG.toast("انتقلت الاستضافة — جارٍ الانضمام إلى الغرفة الجديدة…", "good");
    setTimeout(async () => {
      BG.net.leave();
      softReset();
      banner("جارٍ الانضمام إلى المضيف الجديد…");
      if (await joinWindow(code, 22000)) afterJoinedAsGuest(code);
      else await reconnectLoop(code, 30000);
    }, 500);
  }

  async function acceptHost(msg) {
    const c = core();
    const s = c.state;
    if (st.migrating || !msg || !msg.code) return;
    st.migrating = true;
    st.wasInGame = !!s.inGame;
    if (msg.owner) s.owner = msg.owner;
    if (msg.gameId) s.lobbyGame = msg.gameId;
    if (msg.level) s.level = msg.level;
    if (msg.seatCount) s.seatCount = msg.seatCount;
    if (msg.gameId && msg.options) s.optionsByGame[msg.gameId] = Object.assign({}, msg.options);
    if (msg.visibility) st.visibility = msg.visibility;
    if (s.inGame && msg.seats) applySeatsInPlace(msg.seats);
    const snap = msg.snap || null;
    BG.toast("أنت المضيف الجديد — جارٍ تجهيز الغرفة…", "good");
    BG.net.leave();
    softReset();
    banner("جارٍ استلام الاستضافة…");
    const ok = await tryCreateWithRetry(msg.code);
    if (!ok) {
      st.migrating = false;
      BG.toast("تعذّر استلام الاستضافة.", "warn");
      await reconnectLoop(msg.code, 25000);
      return;
    }
    becomeHost(snap, msg.activeSeat);
  }

  /* ------------------------------ لوحة التحكم ------------------------------ */

  function closePanel() {
    if (st.panel) {
      try { st.panel.close(); } catch (err) { /* ignore */ }
    }
    st.panel = null;
  }

  function panelHTML() {
    const c = core();
    const s = c.state;
    const inGame = !!s.inGame;
    const self = BG.net.selfId;
    const gamesOptions = BG.games.map((g) => {
      const currentId = inGame && s.game ? s.game.id : s.lobbyGame;
      return '<option value="' + g.id + '"' + (g.id === currentId ? " selected" : "") + ">" + esc(g.name) + "</option>";
    }).join("");

    let rows = "";
    if (inGame) {
      rows = s.seats.map((seat, i) => {
        const awayNow = !!s.away[i];
        const isSelf = seat.peerId && seat.peerId === self;
        const tag = seat.type === "cpu" ? (seat.proxyFor ? "🤖 بديل مؤقت" : "🤖 كمبيوتر") : awayNow ? "⏳ منقطع" : isSelf ? "👑 أنت (مضيف)" : "👤 لاعب";
        const peerId = seat.peerId || "";
        return (
          '<div class="net-hp-row">' +
          '<span class="net-hp-seat">' + (i + 1) + "</span>" +
          '<span class="net-hp-name">' + esc(seat.name) + "<small>" + tag + "</small></span>" +
          '<span class="net-hp-btns">' +
          '<button type="button" class="bg-btn small" data-hp-move="' + i + '|-1" ' + (i === 0 ? "disabled" : "") + ' title="تبديل مع السابق">▲</button>' +
          '<button type="button" class="bg-btn small" data-hp-move="' + i + '|1" ' + (i === s.seats.length - 1 ? "disabled" : "") + ' title="تبديل مع التالي">▼</button>' +
          (seat.type === "human" && !isSelf && peerId
            ? '<button type="button" class="bg-btn small" data-hp-host="' + esc(peerId) + '">👑 مضيفًا</button>' +
              '<button type="button" class="bg-btn small danger" data-hp-kick="' + esc(peerId) + '">طرد</button>'
            : "") +
          "</span></div>"
        );
      }).join("");
    } else {
      const people = orderPeers(c.lobbyHumanPeers());
      rows = people.map((peer, i) => {
        const isSelf = peer.id === self;
        return (
          '<div class="net-hp-row">' +
          '<span class="net-hp-seat">' + (i + 1) + "</span>" +
          '<span class="net-hp-name">' + esc(peer.name) + "<small>" + (peer.host ? "👑 مضيف" : "👤 لاعب") + "</small></span>" +
          '<span class="net-hp-btns">' +
          '<button type="button" class="bg-btn small" data-hp-move="' + i + '|-1" ' + (i === 0 ? "disabled" : "") + ">▲</button>" +
          '<button type="button" class="bg-btn small" data-hp-move="' + i + '|1" ' + (i === people.length - 1 ? "disabled" : "") + ">▼</button>" +
          (!isSelf
            ? '<button type="button" class="bg-btn small" data-hp-host="' + esc(peer.id) + '">👑 مضيفًا</button>' +
              '<button type="button" class="bg-btn small danger" data-hp-kick="' + esc(peer.id) + '">طرد</button>'
            : "") +
          "</span></div>"
        );
      }).join("");
    }
    if (!rows) rows = '<p class="net-empty">لا يوجد لاعبون.</p>';

    const banned = Array.from(st.banned);
    return (
      '<div class="net-hp">' +
      '<section class="net-hp-sec"><h3>🔐 خصوصية الغرفة</h3>' +
      '<div class="net-hp-seg" role="group">' +
      '<button type="button" class="net-hp-opt' + (st.visibility === "private" ? " is-on" : "") + '" data-hp-vis="private">🔒 خاصة<small>بالرمز فقط</small></button>' +
      '<button type="button" class="net-hp-opt' + (st.visibility === "public" ? " is-on" : "") + '" data-hp-vis="public">🌐 عامة<small>تظهر في الغرف العامة</small></button>' +
      "</div></section>" +
      '<section class="net-hp-sec"><h3>👥 اللاعبون والمقاعد</h3>' +
      '<p class="net-hp-note">' + (inGame
        ? "▲▼ يبدّل مقعد اللاعب مع جاره أثناء اللعب. من ينقطع يحلّ مكانه كمبيوتر خبير، ومن ينضم يجلس مكان كمبيوتر."
        : "▲▼ يغيّر ترتيب المقاعد قبل البدء.") + "</p>" +
      rows + "</section>" +
      '<section class="net-hp-sec"><h3>🎲 اللعبة</h3>' +
      '<div class="net-hp-game"><select data-hp-game>' + gamesOptions + "</select>" +
      '<label class="net-hp-check"><input type="checkbox" data-hp-auto checked /> ابدأ فورًا</label>' +
      '<button type="button" class="bg-btn primary" data-hp-change>تغيير اللعبة</button></div>' +
      (inGame ? '<button type="button" class="bg-btn danger" data-hp-end>إنهاء اللعبة والعودة لغرفة الانتظار</button>' : "") +
      "</section>" +
      (banned.length
        ? '<section class="net-hp-sec"><h3>⛔ المحظورون</h3><div class="net-hp-banned">' +
          banned.map((name) => '<span>' + esc(name) + ' <button type="button" class="bg-btn small" data-hp-unban="' + esc(name) + '">رفع الحظر</button></span>').join("") +
          "</div></section>"
        : "") +
      "</div>"
    );
  }

  function renderPanel() {
    if (!st.panel || !st.panel.body || !document.body.contains(st.panel.body)) { st.panel = null; return; }
    const body = st.panel.body;
    const scroll = body.scrollTop;
    const keepGame = body.querySelector("[data-hp-game]");
    const keepValue = keepGame ? keepGame.value : "";
    const keepAuto = body.querySelector("[data-hp-auto]");
    const autoChecked = keepAuto ? keepAuto.checked : true;
    body.innerHTML = panelHTML();
    const select = body.querySelector("[data-hp-game]");
    if (select && keepValue) select.value = keepValue;
    const auto = body.querySelector("[data-hp-auto]");
    if (auto) auto.checked = autoChecked;
    body.scrollTop = scroll;
  }

  function openPanel() {
    if (!BG.net || !BG.net.isHost) {
      BG.toast("لوحة التحكم للمضيف فقط.", "warn");
      return;
    }
    if (st.panel) { renderPanel(); return; }
    const handle = BG.openDialog({
      title: "👑 لوحة تحكم المضيف",
      body: "",
      className: "net-hostpanel",
      actions: [{ label: "إغلاق", value: "close", primary: true }],
    });
    st.panel = handle;
    handle.promise.then(() => { if (st.panel === handle) st.panel = null; });
    handle.body.addEventListener("click", async (event) => {
      const t = event.target.closest ? event.target.closest("button") : null;
      if (!t) return;
      if (t.hasAttribute("data-hp-vis")) { await setVisibility(t.getAttribute("data-hp-vis")); return; }
      if (t.hasAttribute("data-hp-move")) {
        const parts = t.getAttribute("data-hp-move").split("|");
        moveSeat(Number(parts[0]), Number(parts[1]));
        return;
      }
      if (t.hasAttribute("data-hp-kick")) {
        const id = t.getAttribute("data-hp-kick");
        const peer = humanPeers().find((p) => p.id === id);
        const ok = await BG.confirm("طرد لاعب", "طرد «" + esc(peer ? peer.name : "اللاعب") + "» من الغرفة؟ لن يستطيع العودة بنفس الاسم، وسيحلّ مكانه كمبيوتر إن كانت اللعبة جارية.", "طرد", "إلغاء");
        if (ok) { kickPeer(id); setTimeout(renderPanel, 600); }
        return;
      }
      if (t.hasAttribute("data-hp-host")) {
        const id = t.getAttribute("data-hp-host");
        const peer = humanPeers().find((p) => p.id === id);
        const ok = await BG.confirm("نقل الاستضافة", "جعل «" + esc(peer ? peer.name : "اللاعب") + "» مضيف الغرفة؟ ستبقى لاعبًا فيها، وتنتقل صلاحيات التحكم إليه.", "نعم", "إلغاء");
        if (ok) handoverTo(id);
        return;
      }
      if (t.hasAttribute("data-hp-unban")) {
        st.banned.delete(t.getAttribute("data-hp-unban"));
        renderPanel();
        return;
      }
      if (t.hasAttribute("data-hp-change")) {
        const gameId = handle.body.querySelector("[data-hp-game]").value;
        const auto = handle.body.querySelector("[data-hp-auto]").checked;
        const current = S().inGame && S().game ? S().game.id : S().lobbyGame;
        if (gameId === current && !S().inGame) { BG.toast("هذه هي اللعبة المختارة بالفعل."); return; }
        if (S().inGame) {
          const ok = await BG.confirm("تغيير اللعبة", "ستنتهي اللعبة الحالية للجميع وتبدأ لعبة أخرى. متابعة؟", "تغيير", "إلغاء");
          if (!ok) return;
        }
        closePanel();
        changeGame(gameId, auto);
        return;
      }
      if (t.hasAttribute("data-hp-end")) {
        const ok = await BG.confirm("إنهاء اللعبة", "إنهاء اللعبة الحالية والعودة إلى غرفة الانتظار للجميع؟", "إنهاء", "إلغاء");
        if (ok) { closePanel(); endGame(); }
      }
    });
    renderPanel();
  }

  /* ------------------------------ قائمة الغرف العامة (نموذج الانضمام) ------------------------------ */

  function modeLabel(mode) {
    return mode === "web" ? "🏫 مدرسي" : mode === "lan" ? "📶 محلي" : "🌍 عالمي";
  }

  function decorateForm(body) {
    if (!body || body.querySelector(".net-public")) return;
    const section = document.createElement("section");
    section.className = "net-public";
    section.innerHTML =
      '<div class="net-public-head"><strong>🌐 الغرف العامة</strong>' +
      '<button type="button" class="bg-btn small" data-pub-refresh>تحديث</button></div>' +
      '<div class="net-public-list" data-pub-list><p class="net-note">اضغط «تحديث» لعرض الغرف العامة المفتوحة.</p></div>';
    body.appendChild(section);
    const list = section.querySelector("[data-pub-list]");

    async function refresh() {
      list.innerHTML = '<p class="net-note">جارٍ التحميل…</p>';
      try {
        const rooms = await BG.net.directory.list();
        if (!document.body.contains(list)) return;
        if (!rooms.length) {
          list.innerHTML = '<p class="net-note">لا توجد غرف عامة الآن. أنشئ غرفة واجعلها «عامة» من لوحة المضيف.</p>';
          return;
        }
        list.innerHTML = rooms.map((room) =>
          '<div class="net-public-item">' +
          '<span class="net-public-info"><strong>' + esc(room.host) + "</strong><small>" +
          esc(room.game || "غرفة") + " · " + room.players + (room.max ? "/" + room.max : "") + " لاعبين · " + modeLabel(room.mode) +
          (room.inGame ? " · جارية" : " · في الانتظار") + "</small></span>" +
          '<button type="button" class="bg-btn small primary" data-pub-join="' + esc(room.code) + '" data-pub-mode="' + esc(room.mode) + '">انضم</button></div>'
        ).join("");
      } catch (err) {
        if (!document.body.contains(list)) return;
        list.innerHTML = '<p class="net-note">قائمة الغرف العامة غير متاحة هنا' +
          (BG.net.relayMissing && BG.net.relayMissing() ? " — اضبط عنوان خدمة الغرف أولًا (الوضع المدرسي)." : ".") + "</p>";
      }
    }

    section.querySelector("[data-pub-refresh]").addEventListener("click", refresh);
    list.addEventListener("click", async (event) => {
      const btn = event.target.closest ? event.target.closest("[data-pub-join]") : null;
      if (!btn || btn.disabled) return;
      const code = btn.getAttribute("data-pub-join");
      const mode = btn.getAttribute("data-pub-mode");
      const s = S();
      if (BG.net.mode !== mode) BG.net.setMode(mode);
      btn.disabled = true;
      try {
        await BG.net.joinRoom(code, s.name || core().savedName() || "اللاعب");
        s.inRoom = true;
        s.lastJoin = { code, name: s.name };
        core().renderLobby();
      } catch (err) {
        btn.disabled = false;
        BG.toast((err && err.message) || "تعذّر الانضمام.", "warn");
      }
    });
    refresh();
  }

  /* ------------------------------ تنظيف ------------------------------ */

  function onShutdown() {
    unpublish();
    clearTimeout(st.aloneTimer);
    st.aloneTimer = null;
    closePanel();
    st.visibility = "private";
    st.banned.clear();
    st.kicking.clear();
    st.seatOrder = [];
    st.lastPeers = [];
    st.code = "";
    st.hostRole = false;
    st.migrating = false;
    st.peakHumans = 0;
    st.handingOver = false;
  }

  window.addEventListener("pagehide", () => {
    if (st.visibility === "public" && BG.net && BG.net.isHost) unpublish();
  });

  if (BG.net) {
    BG.net.on("room", onPeers);
    BG.net.on("status", (info) => {
      if (info && (info.status === "reconnecting" || info.status === "error")) st.lastTrouble = Date.now();
    });
  }
  window.addEventListener("offline", () => { st.lastTrouble = Date.now(); });

  BG.onlineHost = {
    moveSeat,
    swapSeats,
    convertToCpu,
    changeGame,
    kickPeer,
    setVisibility,
    handoverTo,
    openPanel,
    closePanel,
    orderPeers,
    onSeatLost,
    onLateJoin,
    onHostMessage,
    onGuestMessage,
    onRoomClosed,
    onTransportClosed,
    onPeers,
    onPeerJoined,
    onShutdown,
    decorateForm,
    derive,
    get visibility() { return st.visibility; },
    get _state() { return st; },
  };
})();
