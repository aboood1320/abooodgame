/* ==========================================================================
   ألعاب الطاولة — اللعب الجماعي
   لوبي الغرف، تبادل الدور بين الأجهزة، وشاشات الانتظار
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});
  const U = BG.util;
  const esc = (value) => U.escape(value);

  const state = {
    inRoom: false,
    inGame: false,
    hostReady: false,
    busy: false,
    name: "",
    lobbyGame: "",
    seatCount: 0,
    level: "normal",
    config: null,
    game: null,
    seats: [],
    localSeat: -1,
    isHost: false,
    api: null,
    mount: null,
    overlay: null,
    waiting: null,
    hud: null,
    hostTimer: null,
    guestTimer: null,
    readyTimer: null,
    pendingReady: new Set(),
    lastSeat: -1,
    lastHash: "",
    lastGuestHash: "",
    lastGuestSeat: -1,
    lastGuestOver: false,
    activeGuest: false,
    spectating: false,
    spectateSeat: -1,
    spectateAt: 0,
    spectateTimer: null,
    pendingSpectate: null,
    initialized: false,
    overShown: false,
    synced: Object.create(null),
    askSeq: 0,
    pendingAsks: new Map(),
    pendingRefutes: new Map(),
    pendingTrades: new Map(),
    pendingAuctions: new Map(),
    starting: false,
    pendingInvite: "",
    inviteTried: false,
    autoCreateLanRoom: false,
    optionsByGame: Object.create(null),
    away: Object.create(null),
    lastJoin: null,
    chipKey: "",
    wake: null,
    lastAlertSeat: -1,
    titleTimer: null,
    baseTitle: "",
  };

  /* منع انطفاء الشاشة أثناء اللعب الجماعي: انطفاء الجوال هو أكثر أسباب انقطاع الاتصال */
  async function acquireWake() {
    try {
      if (!navigator.wakeLock || state.wake || document.visibilityState !== "visible") return;
      state.wake = await navigator.wakeLock.request("screen");
      state.wake.addEventListener("release", () => { state.wake = null; });
    } catch (err) { state.wake = null; }
  }

  function releaseWake() {
    try { if (state.wake) state.wake.release(); } catch (err) { /* ignore */ }
    state.wake = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.inGame) acquireWake();
  });

  function clearAway() {
    Object.keys(state.away).forEach((key) => {
      clearTimeout(state.away[key].timer);
      delete state.away[key];
    });
  }

  function netActive() {
    return !!(BG.net && BG.net.role);
  }

  function gameDef(id) {
    return BG.byId[id] || null;
  }

  function currentGameDef() {
    return gameDef(state.lobbyGame) || BG.games[0] || null;
  }

  /* ------------------------------ خيارات اللعبة ------------------------------ */

  function optionsFor(gameId) {
    const game = gameDef(gameId);
    const defaults = Object.assign({}, (game && game.options && game.options.defaults) || {});
    const saved = state.optionsByGame[gameId];
    return Object.assign(defaults, saved || {});
  }

  function rememberOptions(gameId, values) {
    if (!gameId) return;
    state.optionsByGame[gameId] = Object.assign(optionsFor(gameId), values || {});
  }

  function optionsSummary(game, values) {
    if (!game || !game.options) return "";
    const opts = values || optionsFor(game.id);
    try {
      return typeof game.options.summary === "function" ? String(game.options.summary(opts) || "") : "";
    } catch (err) {
      return "";
    }
  }

  function normalizeChoices(list) {
    return (list || []).map((item) => (item && typeof item === "object" ? item : { value: item, label: String(item) }));
  }

  function coerceChoice(field, raw) {
    const list = normalizeChoices(field.choices);
    for (let i = 0; i < list.length; i++) {
      if (String(list[i].value) === String(raw)) {
        const value = list[i].value;
        return typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
      }
    }
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  }

  function optionsPanelHTML(game) {
    const spec = game && game.options;
    if (!spec || !Array.isArray(spec.fields) || !spec.fields.length) {
      return '<p class="net-note net-options-empty">هذه اللعبة تُلعب بقواعدها القياسية بلا خيارات إضافية.</p>';
    }
    const values = optionsFor(game.id);
    const fields = spec.fields.filter((field) => typeof field.when !== "function" || field.when(values));
    const rows = fields.map((field) => {
      const key = field.key;
      const label = '<span class="net-option-label">' + esc(field.label || key) + "</span>";
      const hint = field.hint ? '<small class="net-option-hint">' + esc(field.hint) + "</small>" : "";
      if (field.type === "toggle") {
        const on = !!values[key];
        return (
          '<div class="net-option is-toggle">' + label +
          '<button type="button" class="fx-switch' + (on ? " on" : "") + '" role="switch" aria-checked="' + (on ? "true" : "false") +
          '" aria-label="' + esc(field.label || key) + '" data-net-option="' + esc(key) + '" data-net-toggle="1"><span></span></button>' +
          hint + "</div>"
        );
      }
      const choices = normalizeChoices(field.choices);
      if (field.type === "seg") {
        return (
          '<div class="net-option is-wide">' + label +
          '<div class="net-seg" role="group" aria-label="' + esc(field.label || key) + '">' +
          choices.map((choice) => {
            const active = String(values[key]) === String(choice.value);
            return '<button type="button" class="' + (active ? "is-active" : "") + '" aria-pressed="' + (active ? "true" : "false") +
              '" data-net-option="' + esc(key) + '" data-net-value="' + esc(String(choice.value)) + '">' + esc(choice.label) + "</button>";
          }).join("") +
          "</div>" + hint + "</div>"
        );
      }
      return (
        '<div class="net-option">' + label +
        '<select data-net-option="' + esc(key) + '">' +
        choices.map((choice) =>
          '<option value="' + esc(String(choice.value)) + '"' + (String(values[key]) === String(choice.value) ? " selected" : "") + ">" + esc(choice.label) + "</option>"
        ).join("") +
        "</select>" + hint + "</div>"
      );
    });
    const summary = optionsSummary(game, values);
    return (
      '<div class="net-options-head"><span class="net-kicker">خيارات اللعبة</span>' +
      '<small>' + esc(spec.hint || "تُطبَّق على كل اللاعبين في هذه الغرفة.") + "</small></div>" +
      '<div class="net-options-grid">' + rows.join("") + "</div>" +
      (summary ? '<p class="net-option-summary">' + esc(summary) + "</p>" : "")
    );
  }

  function bindOptionsPanel(box) {
    if (!box) return;
    const game = currentGameDef();
    const spec = game && game.options;
    if (!spec) return;

    function apply(key, raw, toggle) {
      const values = optionsFor(game.id);
      const candidates = (spec.fields || []).filter((item) =>
        item.key === key && (typeof item.when !== "function" || item.when(values))
      );
      const field = candidates.find((item) =>
        normalizeChoices(item.choices).some((choice) => String(choice.value) === String(raw))
      ) || candidates[0];
      if (!field) return;
      if (toggle || field.type === "toggle") values[key] = !values[key];
      else values[key] = coerceChoice(field, raw);
      if (typeof spec.onChange === "function") {
        try { spec.onChange(values, key); } catch (err) { /* تجاهل */ }
      }
      rememberOptions(game.id, values);
      box.innerHTML = optionsPanelHTML(game);
      if (BG.fx) BG.fx.sound("select");
      broadcastConfig();
    }

    box.addEventListener("click", (event) => {
      const btn = event.target.closest ? event.target.closest("[data-net-option]") : null;
      if (!btn) return;
      const key = btn.getAttribute("data-net-option");
      if (btn.hasAttribute("data-net-toggle")) apply(key, null, true);
      else if (btn.hasAttribute("data-net-value")) apply(key, btn.getAttribute("data-net-value"), false);
    });
    box.addEventListener("change", (event) => {
      const sel = event.target.closest ? event.target.closest("select[data-net-option]") : null;
      if (!sel) return;
      apply(sel.getAttribute("data-net-option"), sel.value, false);
    });
  }

  function seatName(index) {
    const seat = state.seats[index];
    return seat ? seat.name : "لاعب";
  }

  function isCpuSeat(index) {
    const seat = state.seats[index];
    return !!(seat && seat.type === "cpu");
  }

  function localName() {
    return seatName(state.localSeat);
  }

  function savedName() {
    try {
      return localStorage.getItem("bg.netName") || "";
    } catch (err) {
      return "";
    }
  }

  function saveName() {
    try { localStorage.setItem("bg.netName", state.name); } catch (err) { /* ignore */ }
  }

  /* ============================== اللوبي ============================== */

  function ensureOverlay() {
    if (state.overlay && document.body.contains(state.overlay)) return state.overlay;
    const overlay = BG.el("div", { class: "net-overlay", role: "dialog", "aria-modal": "true", "aria-label": "اللعب الجماعي" });
    overlay.innerHTML = '<div class="net-lobby"><button class="net-close" type="button" aria-label="إغلاق">✕</button><div class="net-lobby-body"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector(".net-close").addEventListener("click", () => {
      hideOverlay();
      if (state.inGame) return;
      shutdown();
    });
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      hideOverlay();
      if (!state.inGame) shutdown();
    });
    state.overlay = overlay;
    return overlay;
  }

  function showOverlay() {
    const overlay = ensureOverlay();
    overlay.classList.add("show");
    document.body.classList.add("net-locked");
    renderLobby();
  }

  function hideOverlay() {
    if (state.overlay) state.overlay.classList.remove("show");
    document.body.classList.remove("net-locked");
  }

  /** مغادرة الغرفة بعد تأكيد. اللعب الجماعي يقطع الجلسة للآخرين إن كان اللاعب مضيفًا. */
  function requestLeave(title) {
    if (!state.inRoom && !state.inGame) {
      shutdown();
      if (BG.app) BG.app.goLibrary();
      return;
    }
    const peers = (BG.net && BG.net.peers) || [];
    const others = Math.max(0, peers.length - 1);
    let body;
    if (state.inGame && state.isHost) {
      body = "أنت المضيف. إن غادرت الآن ستنتهي الجلسة لجميع اللاعبين وتعودون إلى المكتبة.";
    } else if (state.inGame) {
      body = "ستغادر الطاولة الآن. تستمر الجلسة عند بقية اللاعبين، ويمكنك العودة بالدعوة نفسها.";
    } else if (state.isHost && others > 0) {
      body = "أنت المضيف. إن غادرت ستُغلق الغرفة على اللاعبين المتصلين.";
    } else {
      body = "هل تريد مغادرة الغرفة والعودة إلى المكتبة؟";
    }
    BG.confirm(title || "مغادرة الغرفة", body, "نعم، غادر", "ابقَ").then((ok) => {
      if (!ok) return;
      hideOverlay();
      shutdown();
      if (BG.app) BG.app.goLibrary();
    });
  }

  function openLobby() {
    state.name = state.name || savedName() || "اللاعب";
    if (state.inGame) {
      BG.toast("أنت داخل لعبة جماعية بالفعل. استخدم «خروج» لإنهاء الجلسة.", "warn");
      return;
    }
    if (state.inRoom) {
      showOverlay();
      return;
    }
    showOverlay();
  }

  function lobbyHumanPeers() {
    const peers = (BG.net && BG.net.peers) || [];
    return peers.slice().sort((a, b) => (b.host ? 1 : 0) - (a.host ? 1 : 0));
  }

  function clampSeatCount(game, value) {
    if (!game) return 0;
    const humans = Math.min(lobbyHumanPeers().length, game.maxPlayers);
    const min = Math.max(game.minPlayers || 2, humans, 2);
    const max = game.maxPlayers || 4;
    const allowed = Array.isArray(game.counts) && game.counts.length
      ? game.counts.map(Number).filter((count) => Number.isInteger(count) && count >= min && count <= max)
      : Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
    if (!allowed.length) return Math.min(max, Math.max(min, Number(value) || min));
    const wanted = Number(value) || min;
    return allowed.reduce((best, count) =>
      Math.abs(count - wanted) < Math.abs(best - wanted) ? count : best,
      allowed[0]
    );
  }

  function availableSeatCounts(game, humans) {
    if (!game) return [];
    const min = Math.max(game.minPlayers || 2, humans || 0, 2);
    const max = game.maxPlayers || 4;
    const source = Array.isArray(game.counts) && game.counts.length
      ? game.counts.map(Number)
      : Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
    return source.filter((count, index) => Number.isInteger(count) && count >= min && count <= max && source.indexOf(count) === index).sort((a, b) => a - b);
  }

  /* فتح لوحة المضيف. إن لم تكن وحدة online-host.js محمّلة (نسخة قديمة مخزّنة، أو ملف لم يُرفع) نحمّلها الآن
     بدل أن يبقى الزر بلا أثر بصمت. */
  function openHostPanel() {
    if (BG.onlineHost) {
      BG.onlineHost.openPanel();
      return;
    }
    if (state.hostModuleLoading) return;
    state.hostModuleLoading = true;
    const script = document.createElement("script");
    script.src = "js/online-host.js?v=" + Date.now();
    script.onload = () => {
      state.hostModuleLoading = false;
      if (BG.onlineHost) BG.onlineHost.openPanel();
      else BG.toast("تعذّر تشغيل لوحة المضيف.", "warn");
    };
    script.onerror = () => {
      state.hostModuleLoading = false;
      BG.toast("ملف لوحة المضيف (js/online-host.js) غير موجود على الخادم — ارفعه ثم أعد تحميل الصفحة بقوة.", "warn");
    };
    document.head.appendChild(script);
  }

  /* ترتيب مقاعد اللاعبين (يعدّله المضيف من لوحة التحكم) */
  function orderPeers(list) {
    return BG.onlineHost && BG.onlineHost.orderPeers ? BG.onlineHost.orderPeers(list) : list;
  }

  function buildSeats(gameId, count, level) {
    const game = gameDef(gameId);
    if (!game) return [];
    const humans = orderPeers(lobbyHumanPeers()).slice(0, game.maxPlayers);
    const total = clampSeatCount(game, count);
    const seats = humans.map((peer, index) => {
      const profile = BG.playerProfile.normalize(peer.profile || (peer.id === BG.net.selfId
        ? BG.playerProfile.get()
        : BG.playerProfile.defaultFor(index, false)));
      return {
        name: peer.name || "لاعب " + (index + 1),
        type: "human",
        level,
        isCpu: false,
        peerId: peer.id,
        profile,
        profileColor: peer.profile ? profile.color : peer.id === BG.net.selfId ? profile.color : "",
      };
    });
    while (seats.length < total) {
      const index = seats.length;
      seats.push({
        name: "الكمبيوتر " + (index + 1),
        type: "cpu",
        level,
        isCpu: true,
        peerId: null,
        profile: BG.playerProfile.defaultFor(index, true),
      });
    }
    return seats;
  }

  function publishSelfProfile() {
    if (!BG.net || !BG.net.selfId || !BG.playerProfile) return;
    const profile = BG.playerProfile.get();
    BG.net.setPeerProfile(BG.net.selfId, profile);
    if (BG.net.isHost) BG.net.broadcast({ t: "profile", peerId: BG.net.selfId, profile });
    else BG.net.send({ t: "profile", profile });
  }

  function updateSeatProfile(peerId, value) {
    if (!peerId) return;
    const profile = BG.playerProfile.normalize(value);
    const update = (seats) => {
      if (!Array.isArray(seats)) return -1;
      const index = seats.findIndex((seat) => seat && seat.peerId === peerId);
      if (index >= 0) {
        seats[index].profile = profile;
        seats[index].profileColor = profile.color;
      }
      return index;
    };
    update(state.config && state.config.seats);
    const index = update(state.seats);
    if (index >= 0 && state.inGame && BG.app && BG.app.updatePlayerProfile) BG.app.updatePlayerProfile(index, profile);
  }

  function startDisabledReason() {
    if (!state.inRoom) return "لست داخل غرفة.";
    const game = currentGameDef();
    if (!game) return "اختر لعبة.";
    const humans = lobbyHumanPeers();
    if (humans.length < 1) return "لا يوجد لاعبون.";
    if (BG.net.peers.length > 1 && !BG.net.ready()) return "انتظر اكتمال اتصال اللاعبين…";
    return "";
  }

  function renderLobby() {
    if (!state.overlay) return;
    const body = state.overlay.querySelector(".net-lobby-body");
    if (!body) return;
    if (!state.inRoom) {
      body.innerHTML = lobbyFormHTML();
      bindLobbyForm(body);
      if (BG.onlineHost) BG.onlineHost.decorateForm(body);
      return;
    }
    body.innerHTML = lobbyRoomHTML();
    bindLobbyRoom(body);
    updateLobbyPings();
  }

  function lobbyFormHTML() {
    const cloud = BG.net.mode === "cloud";
    const web = BG.net.mode === "web";
    const modeTabs =
      '<div class="net-modes" role="tablist" aria-label="نوع الاتصال">' +
      '<button type="button" class="net-mode-btn' + (cloud ? " is-on" : "") + '" data-net-mode="cloud" role="tab" aria-selected="' + cloud + '">' +
      '<span aria-hidden="true">🌍</span><strong>لعب عالمي</strong><small>مع أي لاعب في العالم عبر الإنترنت</small></button>' +
      '<button type="button" class="net-mode-btn' + (web ? " is-on" : "") + '" data-net-mode="web" role="tab" aria-selected="' + web + '">' +
      '<span aria-hidden="true">🏫</span><strong>الوضع المدرسي</strong><small>يعمل على أجهزة المدارس والشبكات المقيّدة</small></button>' +
      '<button type="button" class="net-mode-btn' + (!cloud && !web ? " is-on" : "") + '" data-net-mode="lan" role="tab" aria-selected="' + (!cloud && !web) + '">' +
      '<span aria-hidden="true">📶</span><strong>شبكة محلية</strong><small>على نفس شبكة Wi-Fi بلا إنترنت</small></button>' +
      "</div>";

    const status = '<div class="net-status" data-net-status role="status" aria-live="polite"></div>';
    const nameField =
      '<label class="net-field"><span>اسمك على الطاولة</span><input data-net-name type="text" maxlength="18" value="' + esc(state.name) + '" placeholder="اسم اللاعب" /></label>';

    if (!cloud) {
      return (
        '<div class="net-lobby-head">' +
        '<span class="net-kicker">' + (web ? "🏫 الوضع المدرسي — يعمل حتى مع الشبكات المقيّدة" : "📶 لعب عبر الشبكة المحلية") + "</span>" +
        "<h2>" + (web ? "العب مع أصدقائك حتى لو كانت أجهزتكم مقيّدة" : "اجلس إلى الطاولة مع من حولك") + "</h2>" +
        (web
          ? "<p>أنشئ غرفة وشارك الرمز مع زملائك، أو انضم برمز من أربعة أحرف. لا يحتاج إلا أن يفتح هذا الموقع: كل شيء يمرّ عبر موقعنا نفسه باتصال عادي، بلا برامج ولا إعدادات ولا حسابات. الاستجابة أبطأ قليلًا من اللعب العالمي، لكنها كافية لألعاب الطاولة.</p>"
          : "<p>أنشئ غرفة على هذا الجهاز، أو انضم برمز من أربعة أحرف. الاتصال عبر خادم اللعب المحلي، بلا حسابات وبلا إنترنت.</p>") +
        "</div>" +
        modeTabs +
        nameField +
        '<div class="net-split">' +
        '<section class="net-card net-card-host">' +
        '<h3>إنشاء غرفة</h3><p>ستكون المضيف وصاحب الطاولة، وتختار اللعبة والمقاعد.</p>' +
        '<button type="button" class="bg-btn primary big" data-net-create>إنشاء غرفة جديدة</button>' +
        "</section>" +
        '<section class="net-card net-card-join">' +
        '<h3>الانضمام برمز</h3><p>اطلب الرمز من المضيف ثم أدخله هنا.</p>' +
        '<div class="net-join-row"><input data-net-code type="text" maxlength="8" inputmode="latin" placeholder="ABCD" aria-label="رمز الغرفة" value="' + esc(state.pendingInvite || "") + '" /><button type="button" class="bg-btn primary" data-net-join>انضم</button></div>' +
        "</section>" +
        "</div>" +
        (web ? '<p class="net-hint">🏫 جميع اللاعبين يفتحون هذا الموقع نفسه ويضغطون «الوضع المدرسي» ثم يدخلون الرمز — لا حاجة لأي برنامج أو إعداد. الغرفة تُحذف تلقائيًا إذا غاب المضيف.</p>' : "") +
        (web ? relayBoxHTML() : "") +
        status +
        '<p class="net-hint"' + (web ? " hidden" : "") + '>💡 للعب على أجهزة مختلفة على نفس الشبكة: على جهاز المضيف شغّل الملف <code>start-lan.bat</code> (أو <code>node board-games/server.js</code>) ثم افتح على كل جهاز العنوان الذي يظهر في نافذته. اللعب يمرّ عبر المضيف نفسه فلا حاجة لإنترنت.</p>'
      );
    }

    return (
      '<div class="net-lobby-head">' +
      '<span class="net-kicker">🌍 لعب عالمي عبر الإنترنت</span>' +
      "<h2>اجلس إلى الطاولة مع أي لاعب في العالم</h2>" +
      "<p>أنشئ غرفة وشارك رابط الدعوة، أو انضم برمز من أربعة أحرف، أو استخدم المطابقة السريعة للعثور على خصم خلال ثوانٍ. الاتصال مشفّر نقطة بنقطة عبر WebRTC، بلا حسابات.</p>" +
      "</div>" +
      modeTabs +
      nameField +
      '<div class="net-split">' +
      '<section class="net-card net-card-host">' +
      '<h3>إنشاء غرفة خاصة</h3><p>ستكون المضيف وصاحب الطاولة، وتختار اللعبة والمقاعد وترسل الرابط لمن تريد.</p>' +
      '<button type="button" class="bg-btn primary big" data-net-create>إنشاء غرفة جديدة</button>' +
      "</section>" +
      '<section class="net-card net-card-join">' +
      '<h3>الانضمام برمز أو دعوة</h3><p>الصق الرمز من المضيف، أو افتح رابط الدعوة مباشرة.</p>' +
      '<div class="net-join-row"><input data-net-code type="text" maxlength="8" inputmode="latin" placeholder="ABCD" aria-label="رمز الغرفة" value="' + esc(state.pendingInvite || "") + '" /><button type="button" class="bg-btn primary" data-net-join>انضم</button></div>' +
      "</section>" +
      "</div>" +
      '<section class="net-quick">' +
      '<div class="net-quick-copy"><strong>⚡ مطابقة سريعة</strong><span>ابحث عن غرفة مفتوحة الآن، أو افتح واحدة ليجدك لاعب آخر تلقائيًا.</span></div>' +
      '<button type="button" class="bg-btn big net-quick-btn" data-net-quick>ابحث عن خصم</button>' +
      "</section>" +
      turnBoxHTML() +
      status +
      '<p class="net-hint">🔒 تُنشأ الغرف عبر خدمة إشارات عالمية، ثم تنتقل بيانات اللعب مباشرة بين الأجهزة. لا تُخزَّن حالة اللعبة على أي خادم.</p>'
    );
  }

  /* إعداد عنوان خدمة الغرف للوضع المدرسي (ضروري على GitHub Pages لأنه لا يشغّل دوال) */
  function relayBoxHTML() {
    const missing = BG.net.relayMissing && BG.net.relayMissing();
    const current = (BG.net.getRelayUrl && BG.net.getRelayUrl()) || "";
    return (
      '<details class="net-advanced"' + (missing ? " open" : "") + '><summary>🔧 إعداد خدمة الغرف' + (missing ? " — مطلوب هنا" : "") + "</summary>" +
      '<p class="net-note">' +
      (missing
        ? "هذا الموقع مستضاف على GitHub Pages وهو لا يشغّل خدمة غرف. اكتب عنوان نسخة الموقع على Netlify (مثل https://اسم-موقعك.netlify.app) وسيُحفظ هنا ويكون جزءًا من رابط الدعوة تلقائيًا."
        : "يعمل الوضع المدرسي عبر خدمة الغرف هذه. لا تغيّرها إلا إن استضفت خدمةً خاصة بك.") +
      "</p>" +
      '<label class="net-field"><span>عنوان خدمة الغرف</span><input data-relay-url type="url" dir="ltr" value="' + esc(current) + '" placeholder="https://your-site.netlify.app" /></label>' +
      '<div class="net-join-row"><button type="button" class="bg-btn small primary" data-relay-save>حفظ</button><button type="button" class="bg-btn small" data-relay-clear>مسح</button></div>' +
      "</details>"
    );
  }

  function turnBoxHTML() {
    const t = (BG.net.getTurn && BG.net.getTurn()) || {};
    const urls = Array.isArray(t.urls) ? t.urls.join(" ") : (t.urls || "");
    return (
      '<details class="net-advanced"><summary>⚙️ إعدادات الاتصال المتقدمة (خادم TURN)</summary>' +
      '<p class="net-note">إذا فشل الاتصال بين لاعبين على شبكات مختلفة (بيانات الجوال أو شبكات الشركات) أضف خادم TURN. يُحفظ على جهازك فقط ويجب ضبطه على جميع اللاعبين.</p>' +
      '<label class="net-field"><span>العنوان (turn:… أو turns:…)</span><input data-turn-urls type="text" dir="ltr" value="' + esc(urls) + '" placeholder="turn:example.com:3478" /></label>' +
      '<div class="net-controls-grid">' +
      '<label class="net-field"><span>اسم المستخدم</span><input data-turn-user type="text" dir="ltr" value="' + esc(t.username || "") + '" /></label>' +
      '<label class="net-field"><span>كلمة المرور</span><input data-turn-pass type="password" dir="ltr" value="' + esc(t.credential || "") + '" /></label>' +
      "</div>" +
      '<div class="net-join-row"><button type="button" class="bg-btn small primary" data-turn-save>حفظ</button><button type="button" class="bg-btn small" data-turn-clear>مسح</button></div>' +
      "</details>"
    );
  }

  /** فشل في الوضع العالمي (غالبًا جهاز مدرسي يحجب WebRTC/الخوادم الخارجية): نعرض زرّ التبديل للوضع المدرسي. */
  function offerSchoolMode(status, message, code) {
    if (!status || !document.body.contains(status)) return;
    if (BG.net.mode !== "cloud") {
      status.className = "net-status is-error";
      status.textContent = message;
      return;
    }
    status.className = "net-status is-error";
    status.innerHTML = esc(message) + ' <button type="button" class="bg-btn small primary" data-net-switch-web>🏫 جرّب الوضع المدرسي (يعمل على أجهزة المدارس)</button>';
    const button = status.querySelector("[data-net-switch-web]");
    if (button) {
      button.addEventListener("click", () => {
        if (state.busy) return;
        BG.net.setMode("web");
        if (code) state.pendingInvite = code;
        renderLobby();
        BG.toast("تم التبديل إلى الوضع المدرسي. يجب أن يستخدمه الجميع معًا.", "good");
      });
    }
  }

  async function offerLanServer(status, message) {
    if (!status || !document.body.contains(status)) return;
    const accepted = await BG.confirm(
      "تعذّر إنشاء غرفة محلية",
      "لا يوجد خادم لعب محلي متاح. هل تريد خطوات تشغيله على جهاز المضيف؟ بعد تشغيل start-lan.bat ستُفتح صفحة المضيف وتُنشئ الغرفة تلقائيًا.",
      "نعم، اعرض الخطوات",
      "ليس الآن"
    );
    if (!document.body.contains(status)) return;
    status.className = "net-status is-error";
    if (!accepted) {
      status.textContent = message || "تعذّر الاتصال بخادم اللعب المحلي.";
      return;
    }
    status.innerHTML =
      '<span>المتصفح لا يستطيع تشغيل ملفات الجهاز مباشرة. على جهاز المضيف شغّل <code>start-lan.bat</code>؛ سيفتح الملف صفحة المضيف وينشئ الغرفة تلقائيًا بعد جاهزية الخادم.</span>' +
      '<br><span>أو شغّل <code>node board-games/server.js</code> ثم افتح هذه الصفحة:</span> ' +
      '<a class="bg-btn small primary" href="http://localhost:8790/board-games/?mode=lan&amp;autocreate=1" target="_blank" rel="noopener">فتح صفحة المضيف</a>';
  }

  async function autoCreateLanRoom() {
    const body = state.overlay && state.overlay.querySelector(".net-lobby-body");
    if (!body) return;
    const status = body.querySelector("[data-net-status]");
    const create = body.querySelector("[data-net-create]");
    if (!status || !create) return;

    const controls = Array.from(body.querySelectorAll("[data-net-create], [data-net-join], [data-net-mode]"));
    controls.forEach((control) => { control.disabled = true; });
    status.className = "net-status is-busy";
    status.textContent = "جارٍ انتظار جاهزية الخادم المحلي؛ ستُنشأ الغرفة تلقائيًا…";

    const startedAt = Date.now();
    while (Date.now() - startedAt < 90000) {
      if (!document.body.contains(body) || state.inRoom || BG.net.mode !== "lan") return;
      const info = await BG.net.lanInfo();
      if (info) {
        controls.forEach((control) => { control.disabled = false; });
        create.click();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    controls.forEach((control) => { control.disabled = false; });
    if (!document.body.contains(status)) return;
    status.className = "net-status is-error";
    status.textContent = "لم يظهر الخادم بعد. شغّل start-lan.bat على جهاز المضيف ثم أعد تحميل صفحة المضيف، أو شغّل node board-games/server.js.";
  }

  function bindLobbyForm(body) {
    const nameInput = body.querySelector("[data-net-name]");
    const codeInput = body.querySelector("[data-net-code]");
    const status = body.querySelector("[data-net-status]");
    const create = body.querySelector("[data-net-create]");
    const join = body.querySelector("[data-net-join]");
    const quick = body.querySelector("[data-net-quick]");
    const modeButtons = Array.from(body.querySelectorAll("[data-net-mode]"));

    nameInput.addEventListener("input", () => {
      state.name = nameInput.value.trim() || "اللاعب";
      saveName();
    });
    if (codeInput) {
      codeInput.addEventListener("input", () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      });
    }

    function busy(flag, text) {
      create.disabled = flag;
      join.disabled = flag;
      if (quick) quick.disabled = flag;
      modeButtons.forEach((button) => { button.disabled = flag; });
      if (status) {
        status.className = "net-status" + (flag ? " is-busy" : "");
        status.textContent = text || "";
      }
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (state.busy) return;
        const next = button.getAttribute("data-net-mode");
        if (!next || next === BG.net.mode) return;
        BG.net.setMode(next);
        renderLobby();
      });
    });

    const turnSave = body.querySelector("[data-turn-save]");
    const relaySave = body.querySelector("[data-relay-save]");
    const relayClear = body.querySelector("[data-relay-clear]");
    if (relaySave) {
      relaySave.addEventListener("click", () => {
        const value = body.querySelector("[data-relay-url]").value;
        const ok = BG.net.setRelayUrl(value);
        BG.toast(ok ? (value.trim() ? "حُفظ عنوان خدمة الغرف." : "مُسح العنوان.") : "العنوان غير صالح — يجب أن يبدأ بـ https://", ok ? "good" : "warn");
        if (ok) renderLobby();
      });
    }
    if (relayClear) {
      relayClear.addEventListener("click", () => {
        BG.net.setRelayUrl("");
        BG.toast("مُسح عنوان خدمة الغرف.");
        renderLobby();
      });
    }
    const turnClear = body.querySelector("[data-turn-clear]");
    if (turnSave) {
      turnSave.addEventListener("click", () => {
        const urls = (body.querySelector("[data-turn-urls]").value || "").trim();
        if (!urls) { BG.net.setTurn(null); BG.toast("تم مسح إعداد TURN."); return; }
        const saved = BG.net.setTurn({
          urls,
          username: body.querySelector("[data-turn-user]").value.trim(),
          credential: body.querySelector("[data-turn-pass]").value,
        });
        BG.toast(saved ? "حُفظ خادم TURN على هذا الجهاز." : "عنوان TURN غير صالح (يبدأ بـ turn: أو turns:).", saved ? "good" : "warn");
      });
    }
    if (turnClear) {
      turnClear.addEventListener("click", () => {
        BG.net.setTurn(null);
        ["[data-turn-urls]", "[data-turn-user]", "[data-turn-pass]"].forEach((sel) => { body.querySelector(sel).value = ""; });
        BG.toast("تم مسح إعداد TURN.");
      });
    }

    /* الوضع المحلي: تحقّق من وجود خادم اللعب قبل أن يضغط اللاعب «إنشاء» ويفشل */
    if (BG.net.mode === "lan" && status) {
      BG.net.lanInfo().then((info) => {
        if (!document.body.contains(status) || state.inRoom) return;
        if (!info) {
          status.className = "net-status is-error";
          status.textContent = "لا يوجد خادم لعب محلي هنا. شغّل start-lan.bat على جهاز المضيف وافتح الموقع من العنوان الذي يظهر فيه، أو استخدم «لعب عالمي» إن كنتم على شبكات مختلفة.";
        } else if (/^(localhost|127\.)/.test(location.hostname) && info.urls && info.urls.length) {
          status.className = "net-status";
          status.textContent = "لينضم الآخرون افتحوا على أجهزتهم: " + info.urls[0];
        }
      });
    }

    create.addEventListener("click", async () => {
      if (state.busy) return;
      state.busy = true;
      busy(true, BG.net.mode === "cloud" ? "جارٍ فتح غرفة على الشبكة العالمية…" : "جارٍ إنشاء الغرفة والاتصال…");
      let failure = null;
      try {
        const msg = await BG.net.createRoom(state.name);
        state.inRoom = true;
        state.lobbyGame = state.lobbyGame || (BG.games[0] && BG.games[0].id) || "";
        state.seatCount = clampSeatCount(currentGameDef(), state.seatCount);
        renderLobby();
        BG.net.ensureHostConnections();
        if (msg && msg.peers) renderLobby();
      } catch (err) {
        failure = (err && err.message) || "تعذّر إنشاء الغرفة.";
      } finally {
        state.busy = false;
        busy(false, "");
      }
      if (failure) {
        if (BG.net.mode === "lan") offerLanServer(status, failure);
        else {
          BG.toast(failure, "warn");
          offerSchoolMode(status, failure, "");
        }
      }
    });

    join.addEventListener("click", async () => {
      if (state.busy) return;
      const code = (codeInput.value || "").trim().toUpperCase();
      if (code.length < 4) {
        BG.toast("أدخل رمز الغرفة المكوّن من أربعة أحرف.", "warn");
        codeInput.focus();
        return;
      }
      state.busy = true;
      busy(true, "جارٍ الانضمام إلى الغرفة…");
      let joinFailure = null;
      try {
        await BG.net.joinRoom(code, state.name);
        state.inRoom = true;
        state.lastJoin = { code, name: state.name };
        state.pendingInvite = "";
        renderLobby();
      } catch (err) {
        joinFailure = (err && err.message) || "تعذّر الانضمام.";
        BG.toast(joinFailure, "warn");
      } finally {
        state.busy = false;
        busy(false, "");
      }
      if (joinFailure) offerSchoolMode(status, joinFailure, code);
    });

    if (quick) {
      quick.addEventListener("click", async () => {
        if (state.busy || BG.net.mode !== "cloud") return;
        state.busy = true;
        busy(true, "جارٍ البحث عن غرفة مفتوحة…");
        try {
          const msg = await BG.net.quickMatch(state.name);
          state.inRoom = true;
          if (msg && !msg.host) state.lastJoin = { code: msg.code, name: state.name };
          state.lobbyGame = state.lobbyGame || (BG.games[0] && BG.games[0].id) || "";
          state.seatCount = clampSeatCount(currentGameDef(), state.seatCount);
          renderLobby();
          if (msg && msg.host) BG.toast("لم نجد غرفة مفتوحة، ففتحنا لك واحدة. شارك الرابط لينضم إليك صديق.", "good");
          else BG.toast("وُجدت غرفة! أنت الآن مع المضيف.", "good");
        } catch (err) {
          busy(false, "");
          BG.toast(err.message || "تعذّرت المطابقة السريعة.", "warn");
        } finally {
          state.busy = false;
          busy(false, "");
        }
      });
    }

    if (codeInput) {
      codeInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") join.click();
      });
    }

    if (state.pendingInvite && !state.inviteTried) {
      state.inviteTried = true;
      if (status) {
        status.className = "net-status is-busy";
        status.textContent = "دعوة من صديق: جارٍ الانضمام إلى الغرفة " + state.pendingInvite + "…";
      }
      setTimeout(() => { if (!state.inRoom) join.click(); }, 450);
    }
  }

  function lobbyRoomHTML() {
    const code = (BG.net && BG.net.roomCode) || "----";
    const host = !!(BG.net && BG.net.isHost);
    const cloud = BG.net.mode === "cloud";
    const game = currentGameDef();
    const peers = lobbyHumanPeers();
    const seats = host ? buildSeats(state.lobbyGame, state.seatCount, state.level) : (state.config && state.config.seats) || [];
    const humans = Math.min(peers.length, game ? game.maxPlayers : peers.length);
    const spectators = Math.max(0, peers.length - humans);
    const disabledReason = startDisabledReason();
    const gamesOptions = BG.games.map((item) => '<option value="' + item.id + '"' + (item.id === state.lobbyGame ? " selected" : "") + ">" + esc(item.name) + "</option>").join("");
    const countOptions = game
      ? (() => {
          const counts = availableSeatCounts(game, humans);
          const current = clampSeatCount(game, state.seatCount || counts[0]);
          const list = counts.map((n) =>
            '<option value="' + n + '"' + (n === current ? " selected" : "") + ">" + n + " لاعبين</option>"
          );
          return list.join("");
        })()
      : "";
    const openPeers = new Set((BG.net && BG.net.connectedPeers && BG.net.connectedPeers()) || []);

    return (
      '<div class="net-lobby-head net-room-head">' +
      '<span class="net-kicker">' + (cloud ? "🌍 غرفة عالمية" : BG.net.mode === "web" ? "🏫 غرفة الوضع المدرسي" : "📶 غرفة محلية") + "</span>" +
      '<div class="net-code-box"><span>رمز الغرفة</span><strong data-net-code-label>' + esc(code) + "</strong>" +
      '<button type="button" class="bg-btn small" data-net-copy>نسخ الرمز</button>' +
      '<button type="button" class="bg-btn small primary" data-net-invite>نسخ رابط الدعوة</button>' +
      '<button type="button" class="bg-btn small" data-net-share>📤 مشاركة</button></div>' +
      "<p>" + (cloud
        ? "شارك رابط الدعوة مع أي شخص في العالم، أو أعطه الرمز لينضم من صفحة «لعب جماعي». اللاعبون المتصلون يظهرون أدناه."
        : "شارك الرمز مع أصدقائك على الشبكة نفسها. اللاعبون المتصلون يظهرون أدناه.") + "</p>" +
      '<p class="net-conn-line"><span class="net-conn-dot" aria-hidden="true"></span><span>جودة الاتصال</span><strong data-net-quality data-quality="unknown">تُقاس بعد أول تبادل…</strong></p>' +
      (BG.net.mode === "lan" && host ? '<p class="net-lan-urls" data-net-lan-urls></p>' : "") +
      "</div>" +
      '<div class="net-people">' +
      playersListHTML(peers, openPeers, seats) +
      "</div>" +
      (spectators ? '<p class="net-note">👀 ' + spectators + " لاعبًا إضافيًا سيشاهدون الجولة دون مقعد. حد اللعبة " + (game ? game.maxPlayers : "—") + " لاعبين.</p>" : "") +
      (host
        ? '<div class="net-host-controls">' +
          '<div class="net-controls-grid">' +
          '<label class="net-field"><span>اللعبة</span><select data-net-game>' + gamesOptions + "</select></label>" +
          '<label class="net-field"><span>عدد المقاعد</span><select data-net-count>' + (countOptions || "<option>2</option>") + "</select></label>" +
          '<label class="net-field"><span>مستوى الكمبيوتر</span><select data-net-level>' +
          ["easy", "normal", "hard"].map((id) => {
            const label = BG.ai.levelLabel(id, game && game.id);
            return '<option value="' + id + '"' + (id === state.level ? " selected" : "") + ">" + label + "</option>";
          }).join("") +
          "</select></label>" +
          "</div>" +
          '<div class="net-seat-preview"><span>توزيع المقاعد</span><div class="net-seat-chips">' +
          seats.map((seat, index) => '<span class="net-seat-chip ' + (seat.type === "cpu" ? "cpu" : "human") + '">' + (index + 1) + " · " + esc(seat.name) + (seat.type === "cpu" ? " 🤖" : " 👤") + "</span>").join("") +
          "</div></div>" +
          '<div class="net-options" data-net-options>' + optionsPanelHTML(game) + "</div>" +
          '<button type="button" class="bg-btn net-hostpanel-btn" data-net-hostpanel>👑 لوحة تحكم المضيف (خاصة/عامة · طرد · تبديل مواقع)</button>' +
          '<button type="button" class="bg-btn primary big net-start" data-net-start' + (disabledReason ? " disabled" : "") + ">🚀 ابدأ اللعبة</button>" +
          (disabledReason ? '<p class="net-disabled">' + esc(disabledReason) + "</p>" : "") +
          "</div>"
        : '<div class="net-guest-wait">' +
          '<div class="net-spinner" aria-hidden="true"></div>' +
          "<h3>أنت داخل الغرفة</h3>" +
          '<p data-net-guest-state>' + (state.config && state.config.gameId ? "اختار المضيف: <strong>" + esc((gameDef(state.config.gameId) || {}).name || "") + "</strong>. انتظر بدء اللعبة…" : "انتظر أن يختار المضيف اللعبة ويبدأ.") + "</p>" +
          (state.config && state.config.options ? '<p class="net-option-summary" data-net-guest-options>' + esc(optionsSummary(gameDef(state.config.gameId), state.config.options)) + "</p>" : "") +
          "</div>") +
      '<div class="net-room-foot"><button type="button" class="bg-btn ghost" data-net-leave>مغادرة الغرفة</button><span>' +
      (cloud ? "إشارات عالمية + اتصال مشفّر نقطة بنقطة عبر WebRTC" : BG.net.mode === "web" ? "اتصال HTTPS عادي عبر الموقع نفسه" : "الاتصال عبر خادم اللعب المحلي") + "</span></div>"
    );
  }

  function playersListHTML(peers, openPeers, seats) {
    if (!peers.length) return '<p class="net-empty">لا يوجد لاعبون بعد.</p>';
    return (
      '<div class="net-player-list">' +
      peers.map((peer) => {
        const seatIndex = (seats || []).findIndex((seat) => seat.peerId === peer.id);
        const seatProfile = seatIndex >= 0 && seats[seatIndex] && seats[seatIndex].profile;
        const profile = BG.playerProfile.normalize(seatProfile || peer.profile || (peer.id === (BG.net && BG.net.selfId)
          ? BG.playerProfile.get()
          : BG.playerProfile.defaultFor(Math.max(0, seatIndex), false)));
        /* اللاعب نفسه متصل دائمًا؛ قائمة connectedPeers تضم الأقران البعيدين فقط. */
        const open = peer.id === (BG.net && BG.net.selfId) || openPeers.has(peer.id) || peer.host;
        const ms = BG.net && BG.net.latencyOf ? BG.net.latencyOf(peer.id) : null;
        const quality = BG.net && BG.net.latencyQuality ? BG.net.latencyQuality(ms) : "unknown";
        return (
          '<div class="net-player' + (peer.host ? " is-host" : "") + '">' +
          BG.playerProfile.avatarHTML(profile, "net-avatar") +
          '<span class="net-player-name">' + esc(peer.name) + (peer.id === (BG.net && BG.net.selfId) ? " <small>(أنت)</small>" : "") + "</span>" +
          '<span class="net-player-meta">' + (seatIndex >= 0 ? "مقعد " + (seatIndex + 1) : "مشاهد") + " · " + (open ? "متصل" : "جارٍ الاتصال") + "</span>" +
          (peer.id !== (BG.net && BG.net.selfId)
            ? '<span class="net-player-ping" data-ping-peer="' + esc(peer.id) + '" data-quality="' + quality + '">' + (Number.isFinite(ms) ? ms + " ms" : "— ms") + "</span>"
            : "") +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function broadcastConfig() {
    if (!BG.net || !BG.net.isHost) return;
    const game = currentGameDef();
    if (!game) return;
    const seats = buildSeats(state.lobbyGame, state.seatCount, state.level);
    const options = optionsFor(state.lobbyGame);
    state.config = { gameId: state.lobbyGame, seatCount: state.seatCount, level: state.level, seats, options };
    BG.net.broadcast({
      t: "config",
      owner: state.owner || "",
      gameId: state.lobbyGame,
      seatCount: state.seatCount,
      level: state.level,
      seats,
      options,
    });
  }

  function bindLobbyRoom(body) {
    const copy = body.querySelector("[data-net-copy]");
    const invite = body.querySelector("[data-net-invite]");
    const leave = body.querySelector("[data-net-leave]");
    const start = body.querySelector("[data-net-start]");
    const gameSel = body.querySelector("[data-net-game]");
    const countSel = body.querySelector("[data-net-count]");
    const levelSel = body.querySelector("[data-net-level]");
    const hostPanelBtn = body.querySelector("[data-net-hostpanel]");
    if (hostPanelBtn) hostPanelBtn.addEventListener("click", openHostPanel);

    const lanBox = body.querySelector("[data-net-lan-urls]");
    if (lanBox) {
      BG.net.lanInfo().then((info) => {
        if (!info || !info.urls || !info.urls.length || !document.body.contains(lanBox)) return;
        lanBox.innerHTML = "على أجهزة الآخرين افتح: " + info.urls.map((u) => "<code>" + esc(u) + "</code>").join(" أو ") + " ثم اكتبوا الرمز.";
      });
    }

    if (copy) {
      copy.addEventListener("click", async () => {
        const code = (BG.net && BG.net.roomCode) || "";
        try {
          await navigator.clipboard.writeText(code);
          BG.toast("نُسخ رمز الغرفة.", "good");
        } catch (err) {
          window.prompt("رمز الغرفة:", code);
        }
      });
    }

    if (invite) {
      invite.addEventListener("click", async () => {
        const link = await BG.net.inviteLinkFor();
        try {
          await navigator.clipboard.writeText(link);
          BG.toast("نُسخ رابط الدعوة. أرسله لمن تريد.", "good");
        } catch (err) {
          window.prompt("رابط الدعوة:", link);
        }
      });
    }

    const share = body.querySelector("[data-net-share]");
    if (share) {
      share.addEventListener("click", async () => {
        const code = (BG.net && BG.net.roomCode) || "";
        const link = await BG.net.inviteLinkFor(code);
        const text = "انضم إلى غرفتي في ألعاب الطاولة — رمز الغرفة: " + code;
        if (navigator.share) {
          try {
            await navigator.share({ title: "ألعاب الطاولة", text, url: link });
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
        window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + link), "_blank", "noopener");
      });
    }

    if (leave) {
      leave.addEventListener("click", () => requestLeave("مغادرة الغرفة"));
    }

    if (gameSel) {
      gameSel.addEventListener("change", () => {
        state.lobbyGame = gameSel.value;
        const game = currentGameDef();
        state.seatCount = clampSeatCount(game, state.seatCount);
        renderLobby();
        broadcastConfig();
      });
    }
    if (countSel) {
      countSel.addEventListener("change", () => {
        state.seatCount = Number(countSel.value) || state.seatCount;
        renderLobby();
        broadcastConfig();
      });
    }
    if (levelSel) {
      levelSel.addEventListener("change", () => {
        state.level = levelSel.value;
        renderLobby();
        broadcastConfig();
      });
    }
    if (start) {
      start.addEventListener("click", () => {
        const reason = startDisabledReason();
        if (reason) { BG.toast(reason, "warn"); return; }
        startAsHost();
      });
    }

    bindOptionsPanel(body.querySelector("[data-net-options]"));
  }

  /* ============================== بدء اللعب ============================== */

  function startAsHost() {
    if (!BG.net.isHost || state.starting) return;
    const game = currentGameDef();
    if (!game) { BG.toast("اختر لعبة.", "warn"); return; }
    const seats = buildSeats(state.lobbyGame, state.seatCount, state.level);
    if (seats.length < (game.minPlayers || 2)) {
      BG.toast("عدد المقاعد أقل من الحد الأدنى لهذه اللعبة.", "warn");
      return;
    }
    state.starting = true;
    const options = optionsFor(state.lobbyGame);
    state.config = { gameId: state.lobbyGame, seatCount: state.seatCount, level: state.level, seats, options };
    const payload = {
      gameId: state.lobbyGame,
      seats,
      level: state.level,
      options,
      roomCode: BG.net.roomCode,
      owner: state.owner || "",
    };
    state.pendingReady = new Set(
      seats.filter((seat) => seat.type === "human" && seat.peerId && seat.peerId !== BG.net.selfId).map((seat) => seat.peerId)
    );
    BG.net.broadcast({ t: "start", payload });
    hideOverlay();
    if (BG.app) BG.app.startNetworkGame(payload);
    const waitingText = state.pendingReady.size
      ? "جارٍ تجهيز الأجهزة… (" + state.pendingReady.size + ")"
      : "جارٍ تجهيز الطاولة…";
    showWaiting(true, null, waitingText);
    clearTimeout(state.readyTimer);
    state.readyTimer = setTimeout(beginHostNow, state.pendingReady.size ? 2000 : 140);
  }

  function beginHostNow() {
    clearTimeout(state.readyTimer);
    state.readyTimer = null;
    if (!state.inGame || !state.isHost || state.hostReady) return;
    state.starting = false;
    if (BG.app) BG.app.netBeginHost();
  }

  function hostStarted() {
    state.hostReady = true;
    state.starting = false;
    if (state.hostTimer) clearInterval(state.hostTimer);
    state.hostTimer = setInterval(hostTick, 260);
    hostTick();
    updateHud();
  }

  function guestStarted(payload) {
    if (payload && payload.owner) state.owner = payload.owner;
    if (state.inGame) return;
    state.starting = false;
    if (BG.app) BG.app.startNetworkGame(payload);
    if (BG.net) BG.net.send({ t: "ready" });
    showWaiting(true, null, "المضيف يجهّز الطاولة…");
  }

  function onReady(from) {
    if (!state.isHost) return;
    state.pendingReady.delete(from);
    if (!state.pendingReady.size) beginHostNow();
    if (state.hostReady && state.lastSeat >= 0) {
      const seat = state.seats[state.lastSeat];
      if (seat && seat.peerId === from) {
        const snap = BG.app && BG.app.netSnapshot();
        if (snap) sendSync(state.lastSeat, snap, true);
      } else {
        /* لاعب عاد/انضم أثناء اللعب: نعرض له اللوحة الحيّة فورًا دون انتظار أول تغيير */
        const snap = BG.app && BG.app.netSnapshot();
        if (snap) {
          BG.net.sendTo(from, turnMessage(state.lastSeat, BG.app.netOver()));
          BG.net.sendTo(from, { t: "spectate", state: snap, activeSeat: state.lastSeat, over: !!BG.app.netOver() });
        }
      }
    }
  }

  /* ============================== تبادل الدور ============================== */

  function sendSync(seatIndex, snapshot, force) {
    const seat = state.seats[seatIndex];
    if (!seat || !seat.peerId || seat.type !== "human") return false;
    if (!force && state.synced[seat.peerId]) return true;
    const ok = BG.net.sendTo(seat.peerId, { t: "sync", state: snapshot, activeSeat: seatIndex });
    if (ok) state.synced[seat.peerId] = true;
    return ok;
  }

  /** كل الأجهزة البشرية التي يجب أن تشاهد اللوحة دون أن تلعب الآن. */
  function spectateTargets(activeSeat) {
    const self = (BG.net && BG.net.selfId) || "";
    const open = new Set((BG.net && BG.net.connectedPeers && BG.net.connectedPeers()) || []);
    const targets = [];
    ((BG.net && BG.net.peers) || []).forEach((peer) => {
      if (!peer || !peer.id || peer.id === self || peer.host) return;
      if (open.size && !open.has(peer.id)) return;
      const seatIndex = state.seats.findIndex((seat) => seat && seat.peerId === peer.id);
      if (seatIndex >= 0 && seatIndex === activeSeat) return;
      targets.push(peer.id);
    });
    return targets;
  }

  function flushSpectate() {
    state.spectateTimer = null;
    const pending = state.pendingSpectate;
    if (!pending || !state.inGame || !state.isHost) return;
    state.pendingSpectate = null;
    const targets = spectateTargets(pending.activeSeat);
    if (!targets.length) return;
    state.spectateAt = Date.now();
    const payload = { t: "spectate", state: pending.snapshot, activeSeat: pending.activeSeat, over: !!pending.over };
    const text = JSON.stringify(payload);
    targets.forEach((peerId) => BG.net.sendTo(peerId, text));
  }

  /**
   * دفع اللوحة الحيّة إلى اللاعبين المنتظرين. نُخفّف التردد إلى ~4 مرات/ثانية
   * ونحتفظ بآخر نسخة فقط كي لا تتكدّس الرسائل أثناء حركات الكمبيوتر.
   */
  function pushSpectate(snapshot, activeSeat, over) {
    if (!state.isHost || !snapshot) return;
    state.pendingSpectate = { snapshot, activeSeat, over };
    if (state.spectateTimer) return;
    const wait = Math.max(0, 240 - (Date.now() - (state.spectateAt || 0)));
    if (!wait) flushSpectate();
    else state.spectateTimer = setTimeout(flushSpectate, wait);
  }

  function turnMessage(activeSeat, over) {
    return {
      t: "turn",
      activeSeat,
      over: !!over,
      activeName: seatName(activeSeat),
      seats: state.seats.map((seat) => ({ name: seat.name, type: seat.type, peerId: seat.peerId || null })),
    };
  }

  function broadcastTurn(activeSeat, over) {
    BG.net.broadcast(turnMessage(activeSeat, over));
  }

  function hostTick() {
    if (!state.inGame || !state.isHost || !state.hostReady) return;
    const snap = BG.app && BG.app.netSnapshot();
    if (!snap) return;
    const seat = BG.app.netSeat();
    const over = BG.app.netOver();
    const hash = JSON.stringify(snap);
    const changed = hash !== state.lastHash || seat !== state.lastSeat;
    if (!changed) return;
    state.lastHash = hash;
    const seatChanged = seat !== state.lastSeat;
    state.lastSeat = seat;
    trackTurn(seat, over);
    if (seatChanged || !state.initialized) {
      state.initialized = true;
      broadcastTurn(seat, over);
    }
    if (seat === state.localSeat && state.localSeat >= 0) {
      showWaiting(false);
      if (BG.app) BG.app.setMountVisible(true);
      if (seatChanged) BG.app.netResume();
    } else {
      // المضيف يرى لوحته دائمًا، واللاعبون الآخرون يشاهدون النسخة الحيّة نفسها.
      if (BG.app) BG.app.setMountVisible(true);
      /* شريط «تشاهد الآن» مخصّص للمشاهدين فقط؛ اللاعب الجالس يبقى أمام اللوحة. */
      if (state.localSeat < 0) showWatchChip(seat, over);
      else showWaiting(false);
      if (seatChanged && seat >= 0 && !isCpuSeat(seat)) sendSync(seat, snap, true);
    }
    if (!over) pushSpectate(snap, seat, over);
    updateHud();
  }

  function startGuestTick() {
    if (state.guestTimer) clearInterval(state.guestTimer);
    state.guestTimer = setInterval(guestTick, 200);
    guestTick();
  }

  function guestTick() {
    if (!state.inGame || state.isHost || !state.activeGuest) return;
    const snap = BG.app && BG.app.netSnapshot();
    if (!snap) return;
    const seat = BG.app.netSeat();
    const over = BG.app.netOver();
    const hash = JSON.stringify(snap);
    if (hash !== state.lastGuestHash || seat !== state.lastGuestSeat || over !== state.lastGuestOver) {
      state.lastGuestHash = hash;
      state.lastGuestSeat = seat;
      state.lastGuestOver = over;
      BG.net.send({ t: "state", state: snap, activeSeat: seat, over: !!over });
    }
    if (!over && seat !== state.localSeat) {
      enterSpectate(seat);
    }
    if (over && state.guestTimer) {
      clearInterval(state.guestTimer);
      state.guestTimer = null;
    }
  }

  /** الانتقال من اللعب إلى المشاهدة دون تدمير اللوحة. */
  function enterSpectate(seat) {
    if (state.spectating) {
      state.spectateSeat = Number.isInteger(seat) ? seat : state.spectateSeat;
      if (state.localSeat < 0) showWatchChip(seat);
      else hideWatchChip();
      updateHud();
      return;
    }
    state.spectating = true;
    state.spectateSeat = Number.isInteger(seat) ? seat : -1;
    if (state.activeGuest) {
      state.activeGuest = false;
      if (BG.app) BG.app.netSetSpectate(true);
    }
    /* اللاعب الجالس لا يرى شريط المشاهدة؛ لوحة اللعبة كافية لإظهار دور الخصم. */
    if (state.localSeat < 0) showWatchChip(seat);
    else hideWatchChip();
    updateHud();
  }

  function deactivateGuest(seat) {
    if (!state.activeGuest && state.spectating) {
      enterSpectate(seat);
      return;
    }
    if (!state.activeGuest) return;
    state.activeGuest = false;
    if (state.guestTimer) clearInterval(state.guestTimer);
    state.guestTimer = null;
    if (BG.app) BG.app.netSetSpectate(true);
    enterSpectate(seat);
  }

  function onSpectate(data) {
    if (!state.inGame || state.isHost || !data || !data.state) return;
    if (state.overShown) return;
    if (state.activeGuest) return;
    if (data.activeSeat === state.localSeat && state.localSeat >= 0) return;
    const ok = BG.app && BG.app.netSpectate(data.state);
    if (!ok) return;
    state.spectating = true;
    state.spectateSeat = Number.isInteger(data.activeSeat) ? data.activeSeat : -1;
    state.lastSeat = state.spectateSeat;
    if (state.localSeat < 0) showWatchChip(state.spectateSeat, data.over);
    else hideWatchChip();
    updateHud();
  }

  function onSync(data) {
    if (!state.inGame || state.isHost) return;
    if (!data || !data.state) return;
    if (state.overShown) return;
    if (data.activeSeat !== state.localSeat) return;
    const ok = BG.app && BG.app.netActivate(data.state);
    if (!ok) {
      BG.net.send({ t: "sync-failed" });
      return;
    }
    state.activeGuest = true;
    state.spectating = false;
    state.spectateSeat = -1;
    state.lastGuestHash = "";
    state.lastGuestSeat = data.activeSeat;
    state.lastGuestOver = false;
    state.lastSeat = data.activeSeat;
    showWaiting(false);
    startGuestTick();
    trackTurn(data.activeSeat, false);
    updateHud();
  }

  function onTurn(data) {
    if (!state.inGame || !data) return;
    if (state.isHost) return;
    if (data.over) {
      showWaiting(false);
      trackTurn(-1, true);
      return;
    }
    if (data.activeSeat !== state.localSeat) {
      if (state.activeGuest || state.spectating) deactivateGuest(data.activeSeat);
      else if (state.localSeat < 0) showWaiting(true, data.activeSeat);
      else showWaiting(false);
      state.lastSeat = data.activeSeat;
      trackTurn(data.activeSeat, false);
      updateHud();
    }
  }

  /* ============================== النوافذ/الانتظار ============================== */

  function ensureWaiting() {
    const stage = document.getElementById("gameStage");
    if (!stage) return null;
    if (state.waiting && stage.contains(state.waiting)) return state.waiting;
    const panel = BG.el("div", { class: "net-wait" });
    stage.appendChild(panel);
    state.waiting = panel;
    return panel;
  }

  function showWaiting(visible, activeSeat, customText) {
    const panel = ensureWaiting();
    if (!panel) return;
    state.chipKey = "";
    panel.classList.remove("is-watch");
    panel.hidden = !visible;
    if (!visible) {
      if (BG.app) BG.app.setMountVisible(true);
      return;
    }
    if (BG.app && (state.spectating || state.hostReady)) BG.app.setMountVisible(true);
    const game = state.game;
    const host = state.isHost;
    const seat = Number.isInteger(activeSeat) ? activeSeat : state.lastSeat;
    let title = "بانتظار الدور";
    let text = customText || "سيُفتح جهازك تلقائيًا عند دورك، ولا تُرسل إليك معلومات اللاعبين السرّية.";
    if (state.localSeat < 0) {
      title = "أنت مشاهد";
      text = "تابع سجل الأحداث. دور اللعب ينتقل بين اللاعبين أصحاب المقاعد.";
    } else if (seat === state.localSeat) {
      title = "دورك الآن";
      text = "يُفتح مقعدك تلقائيًا…";
    } else if (isCpuSeat(seat)) {
      title = "دور الكمبيوتر";
      text = seatName(seat) + " يفكّر… سيتابع السجل الحركة تلقائيًا.";
    } else if (seat >= 0) {
      title = "دور " + seatName(seat);
      text = "الجهاز الآخر يلعب الآن. لا تُرسل إليك أوراقه السرّية.";
    }

    const roster = state.seats.length
      ? state.seats.map((item, index) => {
          const classes = ["net-wait-seat"];
          if (index === seat) classes.push("active");
          if (index === state.localSeat) classes.push("mine");
          if (item.type === "cpu") classes.push("cpu");
          const tag = index === state.localSeat ? "أنت" : item.type === "cpu" ? "كمبيوتر" : "لاعب";
          return '<li class="' + classes.join(" ") + '"><span class="pdot">' + (index + 1) + '</span><span class="net-wait-name">' + esc(item.name) + '</span><span class="net-wait-tag">' + tag + "</span></li>";
        }).join("")
      : '<li class="net-wait-seat">لا مقاعد بعد</li>';

    const optionText = game
      ? optionsSummary(game, (state.config && state.config.options) || null)
      : "";

    panel.innerHTML =
      '<div class="net-wait-card">' +
      '<span class="net-wait-kicker">' + (host ? "👑 المضيف" : "🌐 لاعب") + " · غرفة " + esc((BG.net && BG.net.roomCode) || "—") + (game ? " · " + esc(game.name) : "") + "</span>" +
      "<h2>" + esc(title) + "</h2>" +
      '<p class="net-wait-text">' + esc(text) + "</p>" +
      (optionText ? '<p class="net-wait-options">' + esc(optionText) + "</p>" : "") +
      '<div class="net-spinner" aria-hidden="true"></div>' +
      '<ul class="net-wait-roster">' + roster + "</ul>" +
      '<div class="net-wait-foot"><span>🔒 معلومات هذا الجهاز تبقى خارج أوقات دوره</span><button type="button" class="bg-btn ghost small" data-net-leave-game>مغادرة</button></div>' +
      "</div>";
    const leave = panel.querySelector("[data-net-leave-game]");
    if (leave) leave.addEventListener("click", () => requestLeave("مغادرة الطاولة"));
  }

  /** شريط صغير فوق اللوحة أثناء مشاهدة دور لاعب آخر (بدل حجب اللعبة بالكامل). */
  function showWatchChip(activeSeat, over) {
    if (!state.inGame) return;
    const panel = ensureWaiting();
    if (!panel) return;
    const seat = Number.isInteger(activeSeat) ? activeSeat : state.spectateSeat;
    const selfSeated = state.localSeat >= 0;
    const name = seat >= 0 ? seatName(seat) : "";
    let line;
    if (over) line = "انتهت الجولة — راجع النتيجة";
    else if (!selfSeated) line = "أنت مشاهد · تابع اللعب مباشرة";
    else if (seat < 0) line = "بانتظار بدء الدور";
    else if (isCpuSeat(seat)) line = name + " (كمبيوتر) يفكّر…";
    else line = "دور " + name + " · اللوحة تتحدّث مباشرة";

    /* لا نعيد بناء الشريط مع كل تحديث لللوحة (4 مرات/ثانية) إن لم يتغيّر نصه */
    const chipKey = line + "|" + (over ? 1 : 0);
    if (state.chipKey === chipKey && !panel.hidden && panel.classList.contains("is-watch")) {
      if (BG.app && (!state.isHost || state.hostReady)) BG.app.setMountVisible(true);
      return;
    }
    state.chipKey = chipKey;

    panel.hidden = false;
    panel.classList.add("is-watch");
    panel.innerHTML =
      '<div class="net-watch-card">' +
      '<span class="net-watch-eye" aria-hidden="true">👁</span>' +
      '<div class="net-watch-copy"><strong>تشاهد الآن</strong><small>' + esc(line) + "</small></div>" +
      '<span class="net-watch-live"><i></i>مباشر</span>' +
      '<button type="button" class="net-watch-leave" data-net-leave-game aria-label="مغادرة الغرفة">خروج</button>' +
      "</div>";
    const leave = panel.querySelector("[data-net-leave-game]");
    if (leave) leave.addEventListener("click", () => requestLeave("مغادرة الطاولة"));
    if (!state.isHost) {
      if (BG.app) BG.app.setMountVisible(true);
    } else if (BG.app && state.hostReady) {
      BG.app.setMountVisible(true);
    }
  }

  /** إخفاء شريط «تشاهد الآن» عن اللاعب الجالس (يبقى للمشاهدين فقط). */
  function hideWatchChip() {
    const panel = state.waiting;
    if (!panel || !panel.classList.contains("is-watch")) return;
    panel.classList.remove("is-watch");
    panel.hidden = true;
    state.chipKey = "";
  }

  function updateWaiting() {
    if (!state.waiting || state.waiting.hidden) return;
    showWaiting(true, state.lastSeat);
  }

  function buildHud() {
    removeHud();
    const view = document.getElementById("gameView");
    if (!view) return;
    const hud = BG.el("div", { class: "net-hud" });
    hud.innerHTML =
      '<span class="net-hud-dot" aria-hidden="true"></span>' +
      '<span class="net-hud-code">' + esc((BG.net && BG.net.roomCode) || "----") + "</span>" +
      '<span class="net-hud-sep">·</span>' +
      '<span class="net-hud-role"></span>' +
      '<span class="net-hud-ping" data-quality="unknown" title="زمن الاستجابة">— ms</span>' +
      '<button type="button" class="net-hud-react" aria-label="ردود فعل سريعة" aria-expanded="false">😀</button>' +
      '<div class="net-react-tray" role="menu" hidden>' +
      REACTIONS.map((emoji) => '<button type="button" role="menuitem" data-react="' + emoji + '">' + emoji + "</button>").join("") +
      "</div>" +
      '<button type="button" class="net-hud-leave" aria-label="مغادرة الغرفة">خروج</button>';
    const reactBtn = hud.querySelector(".net-hud-react");
    const tray = hud.querySelector(".net-react-tray");
    reactBtn.addEventListener("click", () => {
      const open = tray.hidden;
      tray.hidden = !open;
      reactBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    tray.addEventListener("click", (event) => {
      const target = event.target.closest ? event.target.closest("[data-react]") : null;
      if (!target) return;
      sendReaction(target.getAttribute("data-react"));
      tray.hidden = true;
      reactBtn.setAttribute("aria-expanded", "false");
    });
    hud.querySelector(".net-hud-leave").addEventListener("click", () => requestLeave("مغادرة الطاولة"));
    view.appendChild(hud);
    state.hud = hud;
    if (state.isHost) {
      const panelBtn = BG.el("button", { type: "button", class: "net-hud-hostpanel", "aria-label": "لوحة المضيف", text: "👑" });
      panelBtn.addEventListener("click", openHostPanel);
      hud.insertBefore(panelBtn, hud.querySelector(".net-hud-leave"));
    }
    updateHud();
    updateHudPing();
  }

  const REACTIONS = ["👍", "😂", "😮", "😡", "👏", "🔥", "🤝", "😭"];
  let reactAt = 0;

  function latencyLabel(quality) {
    return ({ excellent: "ممتاز", good: "جيد", fair: "متوسط", poor: "ضعيف" })[quality] || "غير مقيس";
  }

  function updateHudPing() {
    if (!BG.net) return;
    if (state.hud) {
      const el = state.hud.querySelector(".net-hud-ping");
      if (el) {
        const ms = BG.net.latency;
        el.dataset.quality = BG.net.latencyQuality(ms);
        el.textContent = Number.isFinite(ms) ? ms + " ms" : "— ms";
      }
    }
    updateLobbyPings();
  }

  function updateLobbyPings() {
    if (!state.overlay || !BG.net) return;
    const qualityEl = state.overlay.querySelector("[data-net-quality]");
    if (qualityEl) {
      const ms = BG.net.latency;
      const quality = BG.net.latencyQuality(ms);
      qualityEl.dataset.quality = quality;
      qualityEl.textContent = Number.isFinite(ms)
        ? latencyLabel(quality) + " · " + ms + " ms"
        : "تُقاس بعد أول تبادل…";
    }
    state.overlay.querySelectorAll("[data-ping-peer]").forEach((el) => {
      const id = el.getAttribute("data-ping-peer");
      const ms = BG.net.latencyOf ? BG.net.latencyOf(id) : null;
      const quality = BG.net.latencyQuality(ms);
      el.dataset.quality = quality;
      el.textContent = Number.isFinite(ms) ? ms + " ms" : "— ms";
      el.title = "زمن الاستجابة: " + latencyLabel(quality);
    });
  }

  /** تنبيه لطيف عند انتقال الدور إلى اللاعب المحلي. */
  function alertLocalTurn() {
    BG.toast("🎯 دورك الآن — نفّذ حركتك ثم انتظر بقية اللاعبين.", "good");
    BG.fx.sound("yourturn");
    try {
      if (navigator.vibrate) navigator.vibrate([35, 45, 35]);
    } catch (err) { /* ignore */ }
    if (!document.hidden) {
      state.baseTitle = state.baseTitle || document.title;
      document.title = "🎯 دورك — " + state.baseTitle;
      clearTimeout(state.titleTimer);
      state.titleTimer = setTimeout(() => {
        if (state.baseTitle) document.title = state.baseTitle;
        state.baseTitle = "";
      }, 6000);
    }
  }

  function trackTurn(seat, over) {
    if (!state.inGame) return;
    const myTurn = !over && state.localSeat >= 0 && seat === state.localSeat;
    if (state.hud) state.hud.classList.toggle("is-my-turn", myTurn);
    if (!myTurn) {
      state.lastAlertSeat = over ? -1 : seat;
      return;
    }
    if (state.lastAlertSeat === state.localSeat) return;
    state.lastAlertSeat = state.localSeat;
    alertLocalTurn();
  }

  function showReaction(emoji, name) {
    const host = document.getElementById("gameView") || document.body;
    const pop = BG.el("div", { class: "net-react-pop", "aria-hidden": "true" });
    pop.style.setProperty("--rx", (12 + Math.random() * 70).toFixed(1) + "%");
    pop.innerHTML = "<span>" + esc(emoji) + "</span><small>" + esc(name || "") + "</small>";
    if (BG.fx) BG.fx.sound("select");
    host.appendChild(pop);
    setTimeout(() => { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 2800);
  }

  function sendReaction(emoji) {
    if (REACTIONS.indexOf(emoji) < 0) return;
    const now = Date.now();
    if (now - reactAt < 1200) return;
    reactAt = now;
    const name = localName();
    showReaction(emoji, name);
    if (!BG.net) return;
    if (state.isHost) BG.net.broadcast({ t: "react", e: emoji, n: name });
    else BG.net.send({ t: "react", e: emoji, n: name });
  }

  function updateHud() {
    if (!state.hud) return;
    const role = state.hud.querySelector(".net-hud-role");
    if (!role) return;
    const me = state.localSeat >= 0 ? seatName(state.localSeat) : "مشاهد";
    const icon = BG.net && BG.net.mode === "cloud" ? "🌍" : BG.net && BG.net.mode === "web" ? "🏫" : "📶";
    const myTurn = state.inGame && !state.spectating && state.localSeat >= 0 && state.lastSeat === state.localSeat;
    const mode = state.localSeat >= 0 ? (state.isHost ? "المضيف" : "لاعب") : "مشاهدة";
    role.textContent = icon + " " + mode + " · " + me + (myTurn ? " · دورك" : "");
    state.hud.classList.toggle("is-my-turn", myTurn);
  }

  function removeHud() {
    if (state.hud && state.hud.parentNode) state.hud.parentNode.removeChild(state.hud);
    state.hud = null;
    document.querySelectorAll(".net-react-pop").forEach((node) => node.remove());
  }

  /* ============================== الرسائل ============================== */

  function onNetMessage(event) {
    const from = event && event.from;
    const data = event && event.data;
    if (!data || !data.t) return;
    if (data.t === "profile") {
      const profile = BG.playerProfile.normalize(data.profile);
      if (BG.net.isHost && from) {
        BG.net.setPeerProfile(from, profile);
        updateSeatProfile(from, profile);
        BG.net.broadcast({ t: "profile", peerId: from, profile }, from);
      } else if (data.peerId) {
        BG.net.setPeerProfile(data.peerId, profile);
        updateSeatProfile(data.peerId, profile);
      }
      return;
    }
    if (state.isHost) onHostMessage(from, data);
    else onGuestMessage(from, data);
  }

  function onHostMessage(from, data) {
    if (BG.onlineHost && BG.onlineHost.onHostMessage(from, data)) return;
    if (data.t === "log") {
      BG.app.appendLog(data.message, data.kind);
      BG.net.broadcast({ t: "log", message: data.message, kind: data.kind }, from);
      return;
    }
    if (data.t === "ready") {
      onReady(from);
      return;
    }
    if (data.t === "react") {
      if (REACTIONS.indexOf(data.e) < 0) return;
      const who = String(BG.net.peerName(from) || data.n || "لاعب").slice(0, 18);
      BG.net.broadcast({ t: "react", e: data.e, n: who }, from);
      showReaction(data.e, who);
      return;
    }
    if (data.t === "state") {
      if (!state.inGame || state.overShown) return;
      const senderSeat = state.seats.findIndex((seat) => seat && seat.peerId === from);
      if (senderSeat < 0 || !state.seats[senderSeat] || state.seats[senderSeat].type !== "human") return;
      const seatIndex = Number.isInteger(data.activeSeat) ? data.activeSeat : state.lastSeat;
      const seatDef = state.seats[seatIndex];
      if (!seatDef) return;
      const ok = BG.app.netReceiveState(data);
      if (ok) {
        state.lastHash = "";
        hostTick();
      }
      return;
    }
    if (data.t === "over") {
      if (!state.overShown) {
        state.overShown = true;
        BG.net.broadcast(overMessage(data.payload, data.state), from);
        BG.app.showGameOver(data.payload || {}, true);
      }
      return;
    }
    if (data.t === "ask-refute") {
      hostAskRefute(data.seat, data.combo, data.suggester).then((card) => {
        BG.net.sendTo(from, { t: "refute-result", id: data.id, card: card || null });
      });
      return;
    }
    if (data.t === "refute-response") {
      const pending = state.pendingRefutes.get(data.id);
      if (!pending) return;
      state.pendingRefutes.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(data.card || null);
      return;
    }
    if (data.t === "ask-trade") {
      hostConfirmTrade(data.seat, data.text).then((ok) => {
        BG.net.sendTo(from, { t: "trade-result", id: data.id, ok: !!ok });
      });
      return;
    }
    if (data.t === "trade-response") {
      const pending = state.pendingTrades.get(data.id);
      if (!pending) return;
      state.pendingTrades.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(!!data.ok);
      return;
    }
    if (data.t === "ask-auction") {
      hostAskAuction(data.seat, data.payload).then((bid) => {
        BG.net.sendTo(from, { t: "auction-result", id: data.id, bid: Number(bid) || 0 });
      });
      return;
    }
    if (data.t === "auction-response" || data.t === "auction-result") {
      const pending = state.pendingAuctions.get(data.id);
      if (!pending) return;
      state.pendingAuctions.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(Math.max(0, Number(data.bid) || 0));
      return;
    }
    if (data.t === "sync-failed") {
      state.synced[from] = false;
      return;
    }
  }

  function onGuestMessage(from, data) {
    if (BG.onlineHost && BG.onlineHost.onGuestMessage(from, data)) return;
    if (data.t === "config") {
      if (data.owner) state.owner = data.owner;
      state.config = data;
      if (data.gameId) state.lobbyGame = data.gameId;
      if (data.seatCount) state.seatCount = data.seatCount;
      if (data.level) state.level = data.level;
      if (data.gameId && data.options) state.optionsByGame[data.gameId] = Object.assign({}, data.options);
      if (state.inRoom && !state.inGame) renderLobby();
      return;
    }
    if (data.t === "start") {
      guestStarted(data.payload);
      return;
    }
    if (data.t === "log") {
      BG.app.appendLog(data.message, data.kind);
      return;
    }
    if (data.t === "react") {
      if (REACTIONS.indexOf(data.e) >= 0) showReaction(data.e, String(data.n || "").slice(0, 18));
      return;
    }
    if (data.t === "turn") {
      onTurn(data);
      return;
    }
    if (data.t === "sync") {
      onSync(data);
      return;
    }
    if (data.t === "spectate") {
      onSpectate(data);
      return;
    }
    if (data.t === "over") {
      if (!state.overShown) {
        state.overShown = true;
        if (data.state) {
          try { BG.app.netReceiveState({ state: data.state }); } catch (err) { /* ignore */ }
        }
        BG.app.showGameOver(data.payload || {}, true);
      }
      return;
    }
    if (data.t === "refute-request") {
      promptRefute(data.cards || [], data.suggester || "").then((card) => {
        BG.net.send({ t: "refute-response", id: data.id, card: card || null });
      });
      return;
    }
    if (data.t === "refute-result") {
      const pending = state.pendingAsks.get(data.id);
      if (!pending) return;
      state.pendingAsks.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(data.card || null);
      return;
    }
    if (data.t === "trade-request") {
      BG.confirm("عرض تبادل جديد", data.text || "", "أوافق", "أرفض").then((ok) => {
        BG.net.send({ t: "trade-response", id: data.id, ok: !!ok });
      });
      return;
    }
    if (data.t === "trade-result") {
      const pending = state.pendingTrades.get(data.id);
      if (!pending) return;
      state.pendingTrades.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(!!data.ok);
      return;
    }
    if (data.t === "auction-request") {
      promptLocalAuction(data.payload).then((bid) => {
        BG.net.send({ t: "auction-response", id: data.id, bid: Number(bid) || 0 });
      });
      return;
    }
    if (data.t === "auction-result" || data.t === "auction-response") {
      const pending = state.pendingAuctions.get(data.id);
      if (!pending) return;
      state.pendingAuctions.delete(data.id);
      clearTimeout(pending.timer);
      pending.resolve(Math.max(0, Number(data.bid) || 0));
      return;
    }
    if (data.t === "abort") {
      abortGame(data.reason || "توقفت الجلسة.", false);
      return;
    }
    if (data.t === "lobby") {
      returnToLobbyLocal();
    }
  }

  /* ============================== الدحض عبر الأجهزة ============================== */

  function cardInfo(id) {
    const instance = BG.app && BG.app.instance;
    if (instance && typeof instance.netCardInfo === "function") {
      try {
        const info = instance.netCardInfo(id);
        if (info) return Object.assign({ id }, info);
      } catch (err) { /* ignore */ }
    }
    return { id, name: id, icon: "🃏", cat: "", color: "#58d3a8" };
  }

  function promptRefute(cards, suggesterName) {
    return new Promise((resolve) => {
      if (!cards || !cards.length) { resolve(null); return; }
      const wrap = BG.el("div", { class: "cluedo-refute net-refute" });
      wrap.innerHTML =
        "<p>طلب دحض من <strong>" + esc(suggesterName) + "</strong>. لا تعرض هذه الشاشة لغيرك.</p>" +
        '<div class="cluedo-locked"><button type="button" class="bg-btn primary">👁 إظهار بطاقاتي المطابقة</button></div>';
      const dlg = BG.openDialog({
        title: "دحض سرّي عبر الشبكة",
        body: wrap,
        actions: [{ label: "لا أملك بطاقة مطابقة", value: "skip" }],
        className: "cluedo-refute-dialog",
      });
      dlg.dialog.setAttribute("data-sync-keep", "1");
      wrap.querySelector(".cluedo-locked button").addEventListener("click", () => {
        wrap.innerHTML =
          "<p>لديك " + cards.length + " بطاقة مطابقة. اختر <strong>واحدة</strong> لتعرضها على " + esc(suggesterName) + ":</p>" +
          '<div class="cluedo-refute-grid">' +
          cards.map((card) =>
            '<button type="button" class="cluedo-card-chip" data-card="' + esc(card.id) + '" style="--cc:' + esc(card.color || "#58d3a8") + '">' +
            '<span aria-hidden="true">' + esc(card.icon || "🃏") + "</span>" +
            '<strong>' + esc(card.name) + "</strong>" +
            (card.cat ? "<small>" + esc(card.cat) + "</small>" : "") +
            "</button>"
          ).join("") +
          "</div>" +
          '<p class="cluedo-hint">البطاقة الأخرى تبقى سرّية. لا تُظهر أكثر من بطاقة واحدة.</p>';
        wrap.querySelectorAll("[data-card]").forEach((chip) => {
          chip.addEventListener("click", () => dlg.close(chip.getAttribute("data-card")));
        });
        if (BG.fx) BG.fx.sound("reveal");
      });
      dlg.promise.then((value) => resolve(value && value !== "skip" ? value : null));
    });
  }

  function requestRemoteRefute(peerId, cards, suggesterName) {
    return new Promise((resolve) => {
      const id = "r" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingRefutes.delete(id);
        resolve(null);
      }, 90000);
      state.pendingRefutes.set(id, { resolve, timer });
      const ok = BG.net.sendTo(peerId, { t: "refute-request", id, cards, suggester: suggesterName });
      if (!ok) {
        clearTimeout(timer);
        state.pendingRefutes.delete(id);
        resolve(null);
      }
    });
  }

  function hostAskRefute(seat, combo, suggesterName) {
    const instance = BG.app && BG.app.instance;
    if (!instance || typeof instance.netRefuteMatches !== "function") return Promise.resolve(null);
    let ids = [];
    try { ids = instance.netRefuteMatches(seat, combo) || []; } catch (err) { ids = []; }
    if (!ids.length) return Promise.resolve(null);
    const cards = ids.map(cardInfo);
    if (seat === state.localSeat) return promptRefute(cards, suggesterName);
    const target = state.seats[seat];
    if (!target || !target.peerId) return Promise.resolve(cards[0].id);
    return requestRemoteRefute(target.peerId, cards, suggesterName);
  }

  function askRefutation(seat, combo, suggesterName) {
    if (!state.inGame) return Promise.resolve(null);
    if (state.isHost) return hostAskRefute(seat, combo, suggesterName);
    return new Promise((resolve) => {
      const id = "a" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingAsks.delete(id);
        resolve(null);
      }, 90000);
      state.pendingAsks.set(id, { resolve, timer });
      const ok = BG.net.send({ t: "ask-refute", id, seat, combo, suggester: suggesterName });
      if (!ok) {
        clearTimeout(timer);
        state.pendingAsks.delete(id);
        resolve(null);
      }
    });
  }

  /* ============================== التبادل عبر الأجهزة ============================== */

  function requestRemoteTrade(peerId, text) {
    return new Promise((resolve) => {
      const id = "t" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingTrades.delete(id);
        resolve(false);
      }, 120000);
      state.pendingTrades.set(id, { resolve, timer });
      const ok = BG.net.sendTo(peerId, { t: "trade-request", id, text });
      if (!ok) {
        clearTimeout(timer);
        state.pendingTrades.delete(id);
        resolve(false);
      }
    });
  }

  function hostConfirmTrade(seat, text) {
    if (seat === state.localSeat) {
      return BG.confirm("عرض تبادل جديد", text || "", "أوافق", "أرفض", { keep: true });
    }
    const target = state.seats[seat];
    if (!target || !target.peerId) return Promise.resolve(false);
    return requestRemoteTrade(target.peerId, text);
  }

  /* ============================== المزاد عبر الأجهزة ============================== */

  function promptLocalAuction(payload) {
    const instance = BG.app && BG.app.instance;
    if (instance && typeof instance.netAuctionPrompt === "function") {
      return instance.netAuctionPrompt(payload || {});
    }
    return Promise.resolve(0);
  }

  function requestRemoteAuction(peerId, payload) {
    return new Promise((resolve) => {
      const id = "u" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingAuctions.delete(id);
        resolve(0);
      }, 60000);
      state.pendingAuctions.set(id, { resolve, timer });
      const ok = BG.net.sendTo(peerId, { t: "auction-request", id, payload });
      if (!ok) {
        clearTimeout(timer);
        state.pendingAuctions.delete(id);
        resolve(0);
      }
    });
  }

  function hostAskAuction(seat, payload) {
    if (seat === state.localSeat) return promptLocalAuction(payload);
    const target = state.seats[seat];
    if (!target || !target.peerId) return Promise.resolve(0);
    return requestRemoteAuction(target.peerId, payload);
  }

  function auctionBid(seat, payload) {
    if (!state.inGame) return Promise.resolve(0);
    if (state.isHost) return hostAskAuction(seat, payload);
    return new Promise((resolve) => {
      const id = "u" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingAuctions.delete(id);
        resolve(0);
      }, 60000);
      state.pendingAuctions.set(id, { resolve, timer });
      const ok = BG.net.send({ t: "ask-auction", id, seat, payload });
      if (!ok) {
        clearTimeout(timer);
        state.pendingAuctions.delete(id);
        resolve(0);
      }
    });
  }

  function confirmTrade(seat, text) {
    if (!state.inGame) return Promise.resolve(false);
    if (state.isHost) return hostConfirmTrade(seat, text);
    return new Promise((resolve) => {
      const id = "q" + (++state.askSeq);
      const timer = setTimeout(() => {
        state.pendingTrades.delete(id);
        resolve(false);
      }, 120000);
      state.pendingTrades.set(id, { resolve, timer });
      const ok = BG.net.send({ t: "ask-trade", id, seat, text });
      if (!ok) {
        clearTimeout(timer);
        state.pendingTrades.delete(id);
        resolve(false);
      }
    });
  }

  /* ============================== السجل والنهاية ============================== */

  function relayLog(message, kind) {
    if (!state.inGame) return;
    if (state.isHost) BG.net.broadcast({ t: "log", message, kind });
    else BG.net.send({ t: "log", message, kind });
  }

  function overMessage(payload, fallbackState) {
    const snap = BG.app && BG.app.netSnapshot ? BG.app.netSnapshot() : null;
    const msg = { t: "over", payload: payload || {} };
    const encoded = snap || fallbackState;
    if (encoded) msg.state = encoded;
    return msg;
  }

  function gameOver(payload) {
    if (!state.inGame || state.overShown) return;
    state.overShown = true;
    if (state.isHost) {
      BG.net.broadcast(overMessage(payload));
      BG.app.showGameOver(payload, true);
    } else {
      BG.net.send(overMessage(payload));
      BG.app.showGameOver(payload, true);
    }
  }

  /* ============================== إدارة الجلسة ============================== */

  function begin(detail) {
    state.inGame = true;
    state.hostReady = false;
    state.starting = false;
    state.game = detail.game;
    state.seats = detail.seats || [];
    state.localSeat = Number.isInteger(detail.localSeat) ? detail.localSeat : -1;
    state.isHost = !!detail.isHost;
    state.api = detail.api || null;
    state.mount = detail.mount || null;
    state.config = Object.assign({}, state.config || {}, {
      gameId: detail.game ? detail.game.id : state.lobbyGame,
      seats: state.seats,
      options: detail.options || (state.config && state.config.options) || null,
    });
    state.overShown = false;
    state.lastSeat = -1;
    state.lastAlertSeat = -1;
    state.lastHash = "";
    state.lastGuestHash = "";
    state.lastGuestSeat = -1;
    state.lastGuestOver = false;
    state.activeGuest = false;
    state.spectating = false;
    state.spectateSeat = -1;
    state.spectateAt = 0;
    state.pendingSpectate = null;
    clearTimeout(state.spectateTimer);
    state.spectateTimer = null;
    state.initialized = false;
    state.synced = Object.create(null);
    state.pendingAsks.clear();
    state.pendingRefutes.clear();
    state.pendingTrades.clear();
    state.pendingAuctions.clear();
    hideOverlay();
    buildHud();
    ensureWaiting();
    clearAway();
    acquireWake();
    showWaiting(true, null, state.isHost ? "جارٍ تجهيز الطاولة…" : "المضيف يجهّز الطاولة…");
    if (BG.app) BG.app.setMountVisible(false);
  }

  function hostStartedHook(instance) {
    hostStarted();
    // إن كان الدور الأول لضيف، تُرسل الحالة فورًا بعد بدء المضيف.
    if (instance) setTimeout(hostTick, 80);
  }

  function returnToLobbyLocal() {
    clearInterval(state.hostTimer);
    clearTimeout(state.titleTimer);
    if (state.baseTitle) document.title = state.baseTitle;
    state.baseTitle = "";
    clearAway();
    releaseWake();
    clearInterval(state.guestTimer);
    state.hostTimer = null;
    state.guestTimer = null;
    clearTimeout(state.readyTimer);
    state.readyTimer = null;
    clearTimeout(state.spectateTimer);
    state.spectateTimer = null;
    state.pendingSpectate = null;
    state.inGame = false;
    state.hostReady = false;
    state.starting = false;
    state.activeGuest = false;
    state.spectating = false;
    state.spectateSeat = -1;
    state.game = null;
    state.seats = [];
    state.localSeat = -1;
    state.api = null;
    state.mount = null;
    state.lastSeat = -1;
    state.lastHash = "";
    state.overShown = false;
    state.pendingAsks.clear();
    state.pendingRefutes.clear();
    state.pendingTrades.clear();
    removeHud();
    if (state.waiting && state.waiting.parentNode) state.waiting.parentNode.removeChild(state.waiting);
    state.waiting = null;
    if (BG.app) BG.app.goLibrary();
    showOverlay();
  }

  function returnToLobby() {
    if (!state.inGame) {
      showOverlay();
      return;
    }
    if (state.isHost) BG.net.broadcast({ t: "lobby" });
    else BG.net.send({ t: "lobby" });
    returnToLobbyLocal();
  }

  function abortGame(reason, notify) {
    if (!state.inGame) return;
    if (notify && state.isHost) BG.net.broadcast({ t: "abort", reason });
    BG.toast(reason || "توقفت الجلسة.", "warn");
    returnToLobbyLocal();
    if (state.overlay) {
      const status = state.overlay.querySelector("[data-net-status]");
      if (status) status.textContent = reason || "";
    }
  }

  function shutdown(silent) {
    if (BG.onlineHost) BG.onlineHost.onShutdown();
    state.owner = "";
    clearInterval(state.hostTimer);
    clearTimeout(state.titleTimer);
    if (state.baseTitle) document.title = state.baseTitle;
    state.baseTitle = "";
    clearAway();
    releaseWake();
    if (!silent) state.lastJoin = null;
    clearInterval(state.guestTimer);
    clearTimeout(state.readyTimer);
    clearTimeout(state.spectateTimer);
    state.hostTimer = null;
    state.guestTimer = null;
    state.readyTimer = null;
    state.spectateTimer = null;
    state.pendingSpectate = null;
    state.inGame = false;
    state.inRoom = false;
    state.hostReady = false;
    state.starting = false;
    state.activeGuest = false;
    state.spectating = false;
    state.spectateSeat = -1;
    state.overShown = false;
    state.lastAlertSeat = -1;
    state.game = null;
    state.seats = [];
    state.localSeat = -1;
    state.api = null;
    state.mount = null;
    state.pendingReady.clear();
    state.pendingAsks.clear();
    state.pendingRefutes.clear();
    state.pendingTrades.clear();
    state.pendingAuctions.clear();
    state.config = null;
    removeHud();
    if (state.waiting && state.waiting.parentNode) state.waiting.parentNode.removeChild(state.waiting);
    state.waiting = null;
    hideOverlay();
    if (state.overlay && state.overlay.parentNode) {
      state.overlay.parentNode.removeChild(state.overlay);
      state.overlay = null;
    }
    if (BG.net) BG.net.leave();
    if (!silent) BG.toast("غادرت الغرفة.");
  }

  /* ============================== الأحداث ============================== */

  /** لاعب بشري انقطع اتصاله: نمنحه مهلة للعودة بدل إنهاء الجلسة للجميع (الجوال يقطع كثيرًا لثوانٍ) */
  function markAway(seat) {
    if (BG.onlineHost && BG.onlineHost.onSeatLost(seat)) return;
    const def = state.seats[seat];
    if (!def || def.type !== "human" || state.away[seat]) return;
    const name = def.name || "أحد اللاعبين";
    BG.toast("انقطع اتصال " + name + " — ننتظر عودته لمدة 40 ثانية.", "warn");
    state.away[seat] = {
      name,
      timer: setTimeout(() => {
        delete state.away[seat];
        abortGame("لم يعد " + name + " — عاد الجميع إلى غرفة الانتظار.", true);
      }, 40000),
    };
    if (state.lastSeat === seat) showWaiting(true, seat, name + " انقطع اتصاله — بانتظار عودته…");
  }

  /** انضمام أثناء اللعب: إما عودة لاعب منقطع (نفس الاسم) أو مشاهد جديد. */
  function lateJoin(peer) {
    if (BG.onlineHost && BG.onlineHost.onLateJoin(peer)) return;
    if (!state.inGame || !state.isHost || !state.hostReady || !state.game || !peer || !peer.id) return;
    const wanted = String(peer.name || "").trim().toLowerCase();
    const back = Object.keys(state.away).map(Number).find((i) =>
      String((state.seats[i] || {}).name || "").trim().toLowerCase() === wanted);
    if (back !== undefined) {
      clearTimeout(state.away[back].timer);
      delete state.away[back];
      state.seats[back] = Object.assign({}, state.seats[back], { peerId: peer.id });
      state.synced[peer.id] = false;
      BG.toast((state.seats[back].name || "اللاعب") + " عاد إلى الطاولة.", "good");
      if (state.lastSeat !== state.localSeat) {
        state.chipKey = "";
        if (state.localSeat < 0) showWatchChip(state.lastSeat);
      }
    }
    BG.net.sendTo(peer.id, {
      t: "start",
      payload: {
        gameId: state.game.id,
        seats: state.seats,
        level: state.level,
        options: (state.config && state.config.options) || null,
        roomCode: BG.net.roomCode,
      },
    });
  }

  async function tryRejoin(info) {
    try {
      state.name = info.name || state.name;
      await BG.net.joinRoom(info.code, state.name);
      state.inRoom = true;
      state.lastJoin = info;
      showOverlay();
      BG.toast("عدت إلى الغرفة — بانتظار المضيف.", "good");
      return true;
    } catch (err) {
      BG.toast((err && err.message) || "تعذّرت إعادة الاتصال.", "warn");
      return false;
    }
  }

  function bindNetworkEvents() {
    if (!BG.net) return;
    document.addEventListener("bgprofilechange", (event) => {
      if (!state.inRoom || !BG.net.role) return;
      const profile = BG.playerProfile.normalize(event.detail);
      updateSeatProfile(BG.net.selfId, profile);
      publishSelfProfile();
    });
    BG.net.on("room", () => {
      state.inRoom = true;
      state.name = state.name || savedName() || "اللاعب";
      if (BG.net.isHost && !state.owner) state.owner = state.name;
      if (BG.net.isHost) {
        if (!state.lobbyGame) state.lobbyGame = (BG.games[0] && BG.games[0].id) || "";
        state.seatCount = clampSeatCount(currentGameDef(), state.seatCount);
        state.config = { gameId: state.lobbyGame, seatCount: state.seatCount, level: state.level, seats: buildSeats(state.lobbyGame, state.seatCount, state.level) };
      }
      publishSelfProfile();
      renderLobby();
    });
    BG.net.on("peers", () => {
      if (BG.onlineHost) BG.onlineHost.onPeers();
      if (state.inRoom) {
        if (BG.net.isHost) {
          state.seatCount = clampSeatCount(currentGameDef(), state.seatCount);
          BG.net.ensureHostConnections();
        }
        if (!state.inGame) {
          renderLobby();
          /* تحديث توزيع المقاعد عند وصول لاعب جديد: رسالة config السابقة قد تكون
             سبقت اكتمال قناة الاتصال، فيبقى الضيف يرى نفسه «مشاهدًا». */
          if (BG.net.isHost) broadcastConfig();
        }
      }
    });
    BG.net.on("peer-joined", (peer) => {
      if (BG.fx) BG.fx.sound("join");
      if (BG.onlineHost && BG.onlineHost.onPeerJoined(peer)) return;
      if (state.inRoom && BG.net.isHost) {
        BG.net.ensureHostConnections();
        if (state.inGame) {
          lateJoin(peer);
          return;
        }
        renderLobby();
        broadcastConfig();
      }
    });
    BG.net.on("peer-open", (info) => {
      if (state.inRoom && BG.net.isHost && info && info.id) {
        BG.net.peers.forEach((peer) => {
          if (peer.profile) BG.net.sendTo(info.id, { t: "profile", peerId: peer.id, profile: peer.profile });
        });
      }
      if (state.inRoom && BG.net.isHost && !state.inGame) broadcastConfig();
      if (state.inRoom && !state.inGame) renderLobby();
    });
    BG.net.on("peer-state", () => { if (state.inRoom && !state.inGame) renderLobby(); });
    BG.net.on("peer-left", (id) => {
      if (BG.fx) BG.fx.sound("leave");
      if (state.inRoom && !state.inGame) renderLobby();
      if (state.inGame) {
        const seat = state.seats.findIndex((item) => item.peerId === id);
        if (seat >= 0) {
          if (state.isHost) markAway(seat);
          else if (state.localSeat === seat) abortGame("انقطع اتصالك بالجلسة.", false);
        }
      }
    });
    BG.net.on("room-closed", (info) => {
      if (BG.onlineHost && BG.onlineHost.onRoomClosed(info)) return;
      const reason = (info && info.reason) || "أغلقت الغرفة.";
      const rejoin = state.lastJoin && !BG.net.isHost && /انقطع/.test(reason) ? state.lastJoin : null;
      state.inRoom = false;
      state.inGame = false;
      shutdown(true);
      if (rejoin) {
        BG.openDialog({
          title: "انقطع الاتصال",
          body: "<p>" + esc(reason) + " يمكنك محاولة العودة إلى الغرفة نفسها — إن كانت المباراة مستمرة فستعود إلى مقعدك.</p>",
          actions: [{ label: "المكتبة", value: "library" }, { label: "إعادة الاتصال", value: "rejoin", primary: true }],
        }).promise.then(async (value) => {
          if (value === "rejoin" && await tryRejoin(rejoin)) return;
          if (BG.app) BG.app.goLibrary();
        });
        return;
      }
      BG.alert("انتهت الغرفة", reason).then(() => {
        if (BG.app) BG.app.goLibrary();
      });
    });
    BG.net.on("close", () => {
      if (BG.onlineHost && BG.onlineHost.onTransportClosed()) return;
      if (state.inRoom) {
        state.inRoom = false;
        const wasGame = state.inGame;
        state.inGame = false;
        shutdown(true);
        if (wasGame) BG.toast("انقطع الاتصال بخادم الإشارات.", "warn");
        if (BG.app) BG.app.goLibrary();
      }
    });
    BG.net.on("error", (message) => {
      if (!state.inRoom) {
        const status = state.overlay && state.overlay.querySelector("[data-net-status]");
        if (status) {
          status.textContent = message || "";
          status.className = "net-status is-error";
        }
      } else {
        BG.toast(message || "خطأ في الشبكة.", "warn");
      }
    });
    BG.net.on("message", onNetMessage);
    BG.net.on("latency", updateHudPing);
    BG.net.on("status", (info) => {
      const reconnecting = !!info && info.status === "reconnecting";
      if (state.hud) state.hud.classList.toggle("is-reconnecting", reconnecting);
      if (reconnecting && state.inRoom) BG.toast("الاتصال ضعيف… تجري إعادة الاتصال.", "warn");
    });
  }

  /* ============================== الإقلاع ============================== */

  function initOnline() {
    const btn = document.getElementById("btnOnline");
    if (btn) btn.addEventListener("click", openLobby);
    state.name = savedName() || "اللاعب";
    try {
      const params = new URLSearchParams(location.search);
      state.autoCreateLanRoom = params.get("autocreate") === "1";
      const requestedMode = state.autoCreateLanRoom ? "lan" : params.get("mode");
      const relayParam = params.get("relay");
      if (relayParam && BG.net.setRelayUrl) BG.net.setRelayUrl(relayParam);
      if (requestedMode === "cloud" || requestedMode === "lan" || requestedMode === "web") BG.net.setMode(requestedMode);
      const join = (params.get("join") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (join.length >= 4) {
        state.pendingInvite = join;
        state.inviteTried = false;
      }
      if (state.autoCreateLanRoom) {
        if (state.pendingInvite) state.autoCreateLanRoom = false;
        params.delete("autocreate");
        const cleanUrl = new URL(location.href);
        cleanUrl.searchParams.delete("autocreate");
        history.replaceState(history.state, "", cleanUrl.toString());
      }
    } catch (err) { /* ignore */ }
    bindNetworkEvents();
    if (state.pendingInvite || state.autoCreateLanRoom) {
      openLobby();
      if (state.autoCreateLanRoom) {
        state.autoCreateLanRoom = false;
        autoCreateLanRoom();
      }
    }
  }

  BG.online = {
    openLobby,
    begin,
    hostStarted: hostStartedHook,
    showWaiting,
    relayLog,
    gameOver,
    askRefutation,
    confirmTrade,
    auctionBid,
    returnToLobby,
    shutdown,
    abortGame,
    get active() { return state.inGame; },
    get room() { return state.inRoom; },
    get localSeat() { return state.localSeat; },
    get seats() { return state.seats.slice(); },
    get isHost() { return state.isHost; },
    get debug() { return state; },
  };

  /* جسر داخلي لوحدة المضيف (online-host.js): لوحة التحكم واستبدال اللاعبين ونقل المضيف */
  BG.online._core = {
    state,
    esc,
    gameDef,
    optionsFor,
    clampSeatCount,
    buildSeats,
    lobbyHumanPeers,
    renderLobby,
    broadcastConfig,
    startAsHost,
    abortGame,
    returnToLobbyLocal,
    shutdown,
    showOverlay,
    hideOverlay,
    showWaiting,
    showWatchChip,
    hostStarted,
    hostTick,
    buildHud,
    removeHud,
    sendSync,
    pushSpectate,
    broadcastTurn,
    turnMessage,
    updateHud,
    clearAway,
    acquireWake,
    savedName,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initOnline);
  else initOnline();
})();
