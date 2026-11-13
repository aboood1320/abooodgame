/* ==========================================================================
   ألعاب الطاولة — واجهة المكتبة وتشغيل الألعاب
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;

  const els = {};
  let currentGame = null;
  let instance = null;
  let lastSetup = null;
  let currentApi = null;
  let currentNet = null;
  let gameMount = null;
  let currentOptions = null;
  let saveTimer = null;
  let lastFatal = 0;
  let stopPieceObserver = null;

  const EMBLEMS = {
    monopoly: "g-monopoly",
    catan: "g-catan",
    "ticket-to-ride": "g-ttr",
    carcassonne: "g-carcassonne",
    risk: "g-risk",
    scrabble: "g-scrabble",
    cluedo: "g-cluedo",
    uno: "g-uno",
    "love-letter": "g-cards",
    splendor: "g-cards",
    pandemic: "g-pandemic",
    tavla: "g-tavla",
    waraq: "g-cards",
    kootbositta: "g-cards",
    domino: "g-domino",
    ludo: "g-ludo",
    snakes: "g-snakes",
    checkers: "g-checkers",
    mancala: "g-mancala",
    chess: "i-chess",
    yahtzee: "i-dice",
    rummikub: "g-domino",
    othello: "g-checkers",
    "connect-four": "g-checkers",
    stratego: "g-risk",
    parcheesi: "g-ludo",
    sorry: "g-ludo",
    battleship: "g-risk",
    "seven-wonders": "g-cards",
    azul: "g-carcassonne",
    wingspan: "g-cards",
    dominion: "g-cards",
    "terraforming-mars": "g-pandemic",
    "no-thanks": "g-cards",
    coup: "g-cluedo",
    "for-sale": "g-monopoly",
    skull: "g-cards",
    "king-of-tokyo": "g-risk",
    codenames: "g-scrabble",
    takenoko: "g-carcassonne",
  };

  // ألوان دافئة موحّدة تحفظ هوية كل بطاقة داخل المكتبة الفاخرة.
  const TONES = {
    chess: "#d9bd86",
    monopoly: "#e0b05f",
    catan: "#d9a65a",
    "ticket-to-ride": "#d98a63",
    carcassonne: "#c9a76a",
    risk: "#cf7358",
    scrabble: "#c5a66a",
    cluedo: "#c08a78",
    uno: "#d9695f",
    "love-letter": "#cf7a78",
    splendor: "#c9a45c",
    pandemic: "#c08f63",
    tavla: "#cf9f68",
    waraq: "#cc7e60",
    kootbositta: "#d08a5b",
    domino: "#c3a575",
    ludo: "#d2a15c",
    snakes: "#b49a63",
    checkers: "#bd9270",
    mancala: "#d4a55e",
    yahtzee: "#c98a55",
    rummikub: "#c77c64",
    othello: "#759b7c",
    "connect-four": "#d88355",
    stratego: "#a8755f",
    parcheesi: "#c8895d",
    sorry: "#cf796c",
    battleship: "#7391a8",
    "seven-wonders": "#c8a05f",
    azul: "#5f8ca3",
    wingspan: "#9a8a58",
    dominion: "#b88a58",
    "terraforming-mars": "#c96f4d",
    "no-thanks": "#b98a5c",
    coup: "#a86a63",
    "for-sale": "#c9915e",
    skull: "#8f7b6d",
    "king-of-tokyo": "#c45f52",
    codenames: "#c77c64",
    takenoko: "#6f9b6e",
  };

  function icon(id, cls) {
    return '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
  }

  function emblem(game) {
    return icon(EMBLEMS[game.id] || "i-dice");
  }

  function isOnlineGame() {
    return !!(currentNet && BG.online && BG.online.active);
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    els.libraryView = document.getElementById("libraryView");
    els.gameView = document.getElementById("gameView");
    els.libraryGrid = document.getElementById("libraryGrid");
    els.stage = document.getElementById("gameStage");
    els.gameTitle = document.getElementById("gameTitle");
    els.gameSub = document.getElementById("gameSub");
    els.gameCrest = document.getElementById("gameCrest");
    els.gameStatus = document.getElementById("gameStatus");
    els.gameLog = document.getElementById("gameLogList");
    els.gameLogCard = document.getElementById("gameLogCard");
    els.btnRules = document.getElementById("btnGameRules");
    els.btnNew = document.getElementById("btnGameNew");
    els.btnBack = document.getElementById("btnGameBack");
    els.btnSettings = document.getElementById("btnSettings");
    els.btnFullscreen = document.getElementById("btnGameFullscreen");
    els.btnExitFullscreen = document.getElementById("btnExitFullscreen");
    els.heroBrowse = document.getElementById("heroBrowse");
    els.heroRandom = document.getElementById("heroRandom");

    renderLibrary();

    if (els.heroBrowse) {
      els.heroBrowse.addEventListener("click", () => {
        const head = document.getElementById("libraryHead");
        if (head && head.scrollIntoView) head.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (els.heroRandom) {
      els.heroRandom.addEventListener("click", () => {
        if (!BG.games.length) return;
        const game = BG.games[Math.floor(Math.random() * BG.games.length)];
        openGame(game);
      });
    }

    els.btnRules.addEventListener("click", () => { if (currentGame) BG.openRules(currentGame, currentOptions); });
    if (els.btnFullscreen) els.btnFullscreen.addEventListener("click", toggleGameFullscreen);
    if (els.btnExitFullscreen) els.btnExitFullscreen.addEventListener("click", exitGameFullscreen);
    els.btnNew.addEventListener("click", () => {
      if (!currentGame) return;
      if (isOnlineGame()) {
        BG.online.returnToLobby();
        return;
      }
      openSetup(currentGame, lastSetup);
    });
    els.btnBack.addEventListener("click", goLibrary);
    if (els.btnSettings) els.btnSettings.addEventListener("click", () => BG.openFxSettings());
    document.addEventListener("bgprefschange", () => {
      if (!isOnlineGame() || !instance) return;
      if (typeof instance.netResume !== "function") return;
      try { instance.netResume(); } catch (err) { console.warn(err); }
    });

    installErrorHandling();
    window.addEventListener("pagehide", () => saveProgress());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveProgress();
    });
    window.addEventListener("hashchange", routeFromHash);
    routeFromHash();
  }

  /* ------------------------------ الأخطاء والاتصال ------------------------------ */

  function installErrorHandling() {
    window.addEventListener("error", (event) => {
      reportFatal(event && event.message ? event.message : "خطأ غير معروف");
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      reportFatal(reason && reason.message ? reason.message : String(reason || "وعد مرفوض"));
    });

    const sync = () => {
      const offline = navigator.onLine === false;
      document.body.classList.toggle("is-offline", offline);
      if (offline) BG.toast("انقطع الاتصال بالإنترنت — اللعب المحلي يعمل كما هو.", "warn");
    };
    window.addEventListener("offline", sync);
    window.addEventListener("online", () => {
      sync();
      BG.toast("عاد الاتصال بالإنترنت.", "good");
    });
    sync();
  }

  function reportFatal(message) {
    const now = Date.now();
    console.error("[bg]", message);
    if (now - lastFatal < 4000) return;
    lastFatal = now;
    BG.toast("حدث خطأ غير متوقع، لكن بقية الألعاب تعمل. جرّب «لعبة جديدة» إن لزم.", "warn");
    if (currentApi) {
      try { appendLog("⚠️ " + U.escape(String(message).slice(0, 180)), "warn"); } catch (err) { /* ignore */ }
    }
  }

  /* ------------------------------ المكتبة ------------------------------ */

  let libraryBuilt = false;
  let sceneObserver = null;

  /* مشاهد البطاقات (SVG ثقيلة) تُدرَج عند اقتراب البطاقة من الشاشة فقط */
  function fillScene(node) {
    if (!node || !node.__scene) return;
    node.innerHTML = node.__scene;
    node.__scene = null;
  }

  function observeScene(node) {
    if (!("IntersectionObserver" in window)) { fillScene(node); return; }
    if (!sceneObserver) {
      sceneObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          fillScene(entry.target);
          sceneObserver.unobserve(entry.target);
        });
      }, { rootMargin: "500px 0px" });
    }
    sceneObserver.observe(node);
  }

  function renderLibrary() {
    document.body.classList.add("library-mode");
    if (libraryBuilt && els.libraryGrid.querySelector(".game-card")) {
      /* المكتبة مبنيّة مسبقًا: نحدّث بطاقة «متابعة» فقط بدل إعادة بناء عشرين بطاقة */
      const old = els.libraryGrid.querySelector(".resume-card");
      if (old) old.remove();
      renderResumeCard();
      return;
    }
    BG.clear(els.libraryGrid);
    const count = BG.games.length;
    const countLabel = count === 1 ? "لعبة واحدة" : count + " ألعاب";
    const countEl = document.getElementById("libraryCount");
    if (countEl) countEl.textContent = countLabel + " · جميعها جاهزة للعب";
    const heroCount = document.getElementById("heroGameCount");
    if (heroCount) heroCount.textContent = String(count);

    renderResumeCard();

    BG.games.forEach((game, index) => {
      const tone = TONES[game.id] || game.accent || "#d9a441";
      const card = BG.el("button", {
        type: "button",
        class: "game-card " + (game.cardClass || ""),
        style: { "--accent": tone, "--delay": index * 35 + "ms" },
        "aria-label": "افتح لعبة " + game.name,
      });

      const scene = (BG.libraryArt && BG.libraryArt[game.id]) || "";
      const art = BG.el("span", { class: "game-art" });
      art.innerHTML =
        '<span class="game-art-glow" aria-hidden="true"></span>' +
        '<span class="game-scene" aria-hidden="true"></span>' +
        '<span class="game-art-shade" aria-hidden="true"></span>' +
        '<span class="game-num" aria-hidden="true">' + String(index + 1).padStart(2, "0") + "</span>" +
        '<span class="game-en-badge">' + U.escape(game.en || "") + "</span>" +
        '<span class="game-players">' + icon("i-users") + U.escape(game.players || "—") + "</span>";

      const body = BG.el("span", { class: "game-card-body" });
      body.innerHTML =
        '<span class="game-card-title">' +
          '<strong class="game-name">' + U.escape(game.name) + "</strong>" +
          '<span class="game-complexity">' + U.escape(game.complexity || "") + "</span>" +
        "</span>" +
        '<span class="game-tagline">' + U.escape(game.tagline || "") + "</span>" +
        '<span class="game-meta">' +
          '<span class="game-meta-item">' + icon("i-clock") + U.escape(game.duration || "—") + "</span>" +
          '<span class="game-open">افتح اللعبة' + icon("i-arrow") + "</span>" +
        "</span>";

      card.appendChild(art);
      card.appendChild(body);
      const sceneNode = art.querySelector(".game-scene");
      if (sceneNode && scene) { sceneNode.__scene = scene; observeScene(sceneNode); }
      card.addEventListener("click", () => openGame(game));
      els.libraryGrid.appendChild(card);
    });
    libraryBuilt = true;

  }

  /* ------------------------------ حفظ ومتابعة ------------------------------ */

  const SAVE_KEY = "save.v1";
  const SAVE_TTL = 7 * 24 * 60 * 60 * 1000;

  function readSave() {
    const save = BG.store.get(SAVE_KEY, null);
    if (!save || !save.gameId || !save.state || !BG.byId[save.gameId]) return null;
    if (save.at && Date.now() - save.at > SAVE_TTL) {
      BG.store.set(SAVE_KEY, null);
      return null;
    }
    return save;
  }

  function renderResumeCard() {
    const save = readSave();
    if (!save) return;
    const game = BG.byId[save.gameId];
    const when = save.at ? new Date(save.at).toLocaleString("ar-EG", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
    const card = BG.el("button", {
      type: "button",
      class: "resume-card",
      style: { "--accent": game.accent || "#e1b45c" },
      "aria-label": "متابعة " + game.name,
    });
    card.innerHTML =
      '<span class="resume-crest" aria-hidden="true">' + emblem(game) + "</span>" +
      '<span class="resume-copy"><small>لعبتك المحفوظة</small><strong>' + U.escape(game.name) + "</strong>" +
      "<span>" + U.escape((save.seats || []).map((seat) => seat.name).filter(Boolean).join(" · ") || "متابعة من حيث توقفت") + "</span></span>" +
      '<span class="resume-meta"><b>' + U.escape(when) + "</b><em>متابعة ←</em></span>";
    card.addEventListener("click", () => resumeSaved(save));
    els.libraryGrid.insertBefore(card, els.libraryGrid.firstChild);
  }

  function saveProgress() {
    if (!currentGame || !instance || isOnlineGame() || (currentApi && currentApi.finished)) return;
    if (typeof instance.netSnapshot !== "function") return;
    try {
      const state = instance.netSnapshot();
      if (!state) return;
      BG.store.set(SAVE_KEY, {
        gameId: currentGame.id,
        options: currentOptions || null,
        seats: (currentApi && currentApi.players ? currentApi.players : []).map((seat) => ({
          name: seat.name,
          type: seat.type,
          level: seat.level,
        })),
        state,
        at: Date.now(),
      });
    } catch (err) {
      /* الحفظ التلقائي لا يجب أن يعطّل اللعب */
    }
  }

  function startSaveTimer() {
    stopSaveTimer();
    saveTimer = setInterval(() => { if (!document.hidden) saveProgress(); }, 8000);
  }

  function stopSaveTimer() {
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = null;
  }

  function clearSave() {
    BG.store.set(SAVE_KEY, null);
  }

  function resumeSaved(save) {
    const data = save || readSave();
    if (!data) return false;
    const game = BG.byId[data.gameId];
    if (!game) { clearSave(); return false; }
    if (isOnlineGame()) BG.online.shutdown();
    destroyInstance();
    currentNet = null;
    currentOptions = data.options || null;
    prepareGameView(game);
    els.gameStatus.textContent = "جارٍ الاستئناف";
    els.gameStatus.className = "game-status live";
    els.gameLogCard.hidden = false;
    BG.clear(els.gameLog);
    history.replaceState(null, "", "#" + game.id);
    const seats = (data.seats && data.seats.length ? data.seats : [{ name: "اللاعب 1", type: "human" }]).map((seat, index) => ({
      name: seat.name || "اللاعب " + (index + 1),
      type: seat.type === "cpu" ? "cpu" : "human",
      level: seat.level || "normal",
    }));
    lastSetup = {
      count: seats.length,
      names: seats.map((seat) => seat.name),
      types: seats.map((seat) => seat.type),
      level: seats[0] ? seats[0].level : "normal",
      options: data.options || null,
    };
    const built = startGame(game, seats, seats.filter((seat) => seat.type === "cpu").length, {
      options: data.options || null,
      importState: data.state,
      fromSave: true,
    });
    if (!built) return false;
    appendLog("استُئنفت اللعبة المحفوظة.", "accent");
    BG.toast("تابعت " + game.name + " من حيث توقفت.", "good");
    return true;
  }

  function syncFullscreenUi() {
    const active = document.body.classList.contains("fullscreen-game");
    if (els.btnFullscreen) {
      els.btnFullscreen.setAttribute("aria-pressed", active ? "true" : "false");
      const span = els.btnFullscreen.querySelector("span");
      if (span) span.textContent = active ? "إنهاء ملء الشاشة" : "ملء الشاشة";
    }
    if (els.btnExitFullscreen) els.btnExitFullscreen.hidden = !active;
    applyGameScale();
  }

  function toggleFullscreenClass() {
    document.body.classList.toggle("fullscreen-game");
    syncFullscreenUi();
  }

  function exitGameFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    document.body.classList.remove("fullscreen-game");
    syncFullscreenUi();
  }

  function toggleGameFullscreen() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
      }
      const target = document.documentElement;
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
          toggleFullscreenClass();
        });
      } else {
        toggleFullscreenClass();
      }
    } catch (err) {
      toggleFullscreenClass();
    }
  }

  document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle("fullscreen-game", !!document.fullscreenElement);
    syncFullscreenUi();
  });

  /* ------------------------------ التنقل ------------------------------ */

  function routeFromHash() {
    const id = decodeURIComponent((location.hash || "").replace(/^#\/?/, "").trim());
    if (!id) {
      if (currentGame) {
        goLibrary(true);
        return;
      }
      els.libraryView.hidden = false;
      els.gameView.hidden = true;
      currentGame = null;
      if (els.btnNew) els.btnNew.hidden = true;
      if (els.btnRules) els.btnRules.hidden = true;
      if (els.btnFullscreen) {
        els.btnFullscreen.hidden = true;
        els.btnFullscreen.setAttribute("aria-pressed", "false");
        const span = els.btnFullscreen.querySelector("span");
        if (span) span.textContent = "ملء الشاشة";
      }
      delete els.gameView.dataset.game;
      els.gameView.style.removeProperty("--accent");
      document.title = "ألعاب الطاولة — نُبلاء";
      renderLibrary();
      return;
    }
    const game = BG.byId[id];
    if (game) {
      if (currentGame !== game) openGame(game, true);
      return;
    }
    if (!game && !currentGame) {
      history.replaceState(null, "", location.pathname + location.search);
      els.libraryView.hidden = false;
      els.gameView.hidden = true;
      renderLibrary();
    }
  }

  function prepareGameView(game) {
    currentGame = game;
    document.body.classList.remove("library-mode");
    els.libraryView.hidden = true;
    els.gameView.hidden = false;
    els.gameTitle.textContent = game.name;
    els.gameSub.textContent = game.en || "";
    els.gameView.dataset.game = game.id;
    els.gameView.style.setProperty("--accent", game.accent || "#f2b45e");
    if (els.gameCrest) els.gameCrest.innerHTML = emblem(game);
    els.btnRules.hidden = false;
    if (els.btnFullscreen) {
      els.btnFullscreen.hidden = false;
      els.btnFullscreen.setAttribute("aria-pressed", document.fullscreenElement ? "true" : "false");
      const span = els.btnFullscreen.querySelector("span");
      if (span) span.textContent = document.fullscreenElement ? "إنهاء ملء الشاشة" : "ملء الشاشة";
    }
    els.btnNew.hidden = true;
    document.title = game.name + " — ألعاب الطاولة";
    if (BG.fx) BG.fx.screenEnter(els.gameView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openGame(game, fromHash) {
    if (BG.closeDialogs) BG.closeDialogs();
    if (isOnlineGame()) BG.online.shutdown();
    destroyInstance();
    currentNet = null;
    lastSetup = null;
    currentOptions = null;
    prepareGameView(game);
    els.gameStatus.textContent = "الإعداد";
    els.gameStatus.className = "game-status";
    els.gameLogCard.hidden = true;
    BG.clear(els.gameLog);
    if (!fromHash) history.pushState(null, "", "#" + game.id);
    openSetup(game);
  }

  function goLibrary(fromHash) {
    if (BG.closeDialogs) BG.closeDialogs();
    if (isOnlineGame()) BG.online.shutdown();
    saveProgress();
    destroyInstance();
    currentGame = null;
    currentNet = null;
    lastSetup = null;
    currentOptions = null;
    document.body.classList.remove("fullscreen-game");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    els.gameView.hidden = true;
    els.libraryView.hidden = false;
    els.btnNew.hidden = true;
    els.btnRules.hidden = true;
    if (els.btnFullscreen) {
      els.btnFullscreen.hidden = true;
      els.btnFullscreen.setAttribute("aria-pressed", "false");
      const span = els.btnFullscreen.querySelector("span");
      if (span) span.textContent = "ملء الشاشة";
    }
    delete els.gameView.dataset.game;
    els.gameView.style.removeProperty("--accent");
    document.title = "ألعاب الطاولة — نُبلاء";
    if (!fromHash) history.pushState(null, "", location.pathname + location.search);
    renderLibrary();
    if (BG.fx) BG.fx.screenEnter(els.libraryView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function destroyInstance() {
    stopSaveTimer();
    if (stopPieceObserver) { stopPieceObserver(); stopPieceObserver = null; }
    if (instance && typeof instance.destroy === "function") {
      try { instance.destroy(); } catch (err) { console.warn(err); }
    }
    instance = null;
    if (gameMount) {
      gameMount.hidden = true;
      gameMount = null;
    }
  }

  /* ------------------------------ الإعداد ------------------------------ */

  function normalizeChoices(list) {
    return (list || []).map((item) => (item && typeof item === "object" ? item : { value: item, label: String(item) }));
  }

  function buildOptionsPanel(game, state) {
    const spec = game.options;
    if (!spec || !Array.isArray(spec.fields) || !spec.fields.length) return null;
    const wrap = BG.el("div", { class: "setup-field setup-options" });
    const head = BG.el("div", { class: "setup-options-head" });
    head.innerHTML =
      "<label>خيارات اللعبة</label><small>" +
      U.escape(spec.hint || "تُطبَّق هذه الخيارات على اللعب المحلي والجماعي معًا.") +
      "</small>";
    wrap.appendChild(head);

    const grid = BG.el("div", { class: "setup-option-grid" });
    wrap.appendChild(grid);

    const summary = BG.el("p", { class: "setup-option-summary" });
    wrap.appendChild(summary);

    function visibleFields() {
      return spec.fields.filter((field) => typeof field.when !== "function" || field.when(state.options));
    }

    function refreshSummary() {
      const text = typeof spec.summary === "function" ? spec.summary(state.options) : "";
      summary.textContent = text || "";
      summary.hidden = !text;
    }

    function setValue(key, value) {
      state.options[key] = value;
      if (typeof spec.onChange === "function") spec.onChange(state.options, key);
      if (BG.fx) BG.fx.sound("select");
      build();
      refreshSummary();
    }

    function build() {
      BG.clear(grid);
      visibleFields().forEach((field) => {
        const box = BG.el("div", { class: "setup-option" + (field.wide ? " wide" : "") });
        const label = BG.el("label", { text: field.label || field.key });
        box.appendChild(label);

        if (field.type === "seg") {
          const seg = BG.el("div", { class: "seg seg-compact" });
          normalizeChoices(field.choices).forEach((choice) => {
            const active = String(state.options[field.key]) === String(choice.value);
            const btn = BG.el("button", {
              type: "button",
              class: "seg-btn" + (active ? " active" : ""),
              text: choice.label,
              "aria-pressed": active ? "true" : "false",
            });
            btn.addEventListener("click", () => setValue(field.key, choice.value));
            seg.appendChild(btn);
          });
          box.appendChild(seg);
        } else if (field.type === "toggle") {
          const btn = BG.el("button", {
            type: "button",
            class: "fx-switch" + (state.options[field.key] ? " on" : ""),
            role: "switch",
            "aria-checked": state.options[field.key] ? "true" : "false",
            html: "<span></span>",
          });
          btn.addEventListener("click", () => setValue(field.key, !state.options[field.key]));
          box.appendChild(btn);
        } else {
          const select = BG.el("select", { class: "setup-select" });
          normalizeChoices(field.choices).forEach((choice) => {
            const opt = BG.el("option", { value: String(choice.value), text: choice.label });
            if (String(state.options[field.key]) === String(choice.value)) opt.selected = true;
            select.appendChild(opt);
          });
          select.addEventListener("change", () => {
            const choice = normalizeChoices(field.choices).find((item) => String(item.value) === select.value);
            setValue(field.key, choice ? choice.value : select.value);
          });
          box.appendChild(select);
        }
        if (field.hint) box.appendChild(BG.el("small", { class: "setup-option-hint", text: field.hint }));
        grid.appendChild(box);
      });
    }

    build();
    refreshSummary();
    return wrap;
  }

  function openSetup(game, previous) {
    if (isOnlineGame()) BG.online.shutdown();
    destroyInstance();
    currentNet = null;
    currentOptions = Object.assign({}, (game.options && game.options.defaults) || {}, (previous && previous.options) || {});
    const savedSetup = BG.store.get("setup.v1", {}) || {};
    const allowedCounts = Array.isArray(game.counts) && game.counts.length
      ? game.counts
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= (game.minPlayers || 2) && n <= (game.maxPlayers || 6))
          .sort((a, b) => a - b)
      : null;
    const wantedCount = (previous && previous.count) || game.defaultPlayers || 2;
    let defaultCount = Math.min(
      game.maxPlayers || 4,
      Math.max(game.minPlayers || 2, wantedCount)
    );
    if (allowedCounts && allowedCounts.length) {
      defaultCount = allowedCounts.reduce(
        (best, n) => (Math.abs(n - wantedCount) < Math.abs(best - wantedCount) ? n : best),
        allowedCounts[0]
      );
    }
    const state = {
      count: defaultCount,
      names: ((previous && previous.names) || BG.store.get("playerNames", [])).slice(0, game.maxPlayers || 6),
      types: ((previous && previous.types) || savedSetup.types || []).slice(0, game.maxPlayers || 6),
      level: BG.ai.level((previous && previous.level) || savedSetup.level || "normal"),
      options: Object.assign({}, (game.options && game.options.defaults) || {}, (previous && previous.options) || {}),
    };
    while (state.names.length < (game.maxPlayers || 6)) state.names.push("اللاعب " + (state.names.length + 1));
    while (state.types.length < (game.maxPlayers || 6)) state.types.push("human");
    for (let i = 0; i < state.types.length; i++) {
      state.types[i] = state.types[i] === "cpu" ? "cpu" : "human";
    }

    els.btnNew.hidden = true;
    els.gameStatus.textContent = "الإعداد";
    els.gameStatus.className = "game-status";
    els.gameLogCard.hidden = true;
    BG.clear(els.stage);
    gameMount = null;

    const panel = BG.el("div", { class: "setup-panel", style: { "--accent": game.accent || "#f2b45e" } });
    const hero = BG.el("div", { class: "setup-hero" });
    hero.innerHTML =
      '<span class="setup-crest" aria-hidden="true">' + emblem(game) + "</span>" +
      '<div class="setup-hero-copy">' +
      '<span class="setup-kicker">تهيئة الطاولة</span>' +
      "<h2>إعداد " + BG.util.escape(game.name) + "</h2>" +
      "<p>" + BG.util.escape(game.tagline || "") + "</p>" +
      "</div>";
    panel.appendChild(hero);

    const facts = BG.el("div", { class: "setup-facts" });
    facts.innerHTML = [
      ["i-users", "اللاعبون", game.players || "—"],
      ["i-clock", "المدة", game.duration || "—"],
      ["i-gauge", "الصعوبة", game.complexity || "—"],
    ]
      .map(([ic, label, value]) =>
        '<span class="setup-fact">' + icon(ic) + "<small>" + label + "</small><strong>" + BG.util.escape(value) + "</strong></span>"
      )
      .join("");
    panel.appendChild(facts);

    const counts = [];
    if (Array.isArray(game.counts) && game.counts.length) {
      game.counts
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n))
        .forEach((n) => { if (counts.indexOf(n) === -1) counts.push(n); });
      counts.sort((a, b) => a - b);
    } else {
      for (let n = game.minPlayers || 2; n <= (game.maxPlayers || 4); n++) counts.push(n);
    }
    if (counts.length > 1) {
      const countBox = BG.el("div", { class: "setup-field" }, [BG.el("label", { text: "عدد اللاعبين" })]);
      const seg = BG.el("div", { class: "seg" });
      counts.forEach((n) => {
        const b = BG.el("button", {
          type: "button",
          class: "seg-btn" + (n === state.count ? " active" : ""),
          text: String(n),
          "aria-pressed": n === state.count ? "true" : "false",
        });
        b.addEventListener("click", () => {
          state.count = n;
          seg.querySelectorAll(".seg-btn").forEach((x) => {
            const on = Number(x.textContent) === n;
            x.classList.toggle("active", on);
            x.setAttribute("aria-pressed", on ? "true" : "false");
          });
          renderNames();
        });
        seg.appendChild(b);
      });
      countBox.appendChild(seg);
      panel.appendChild(countBox);
    }

    const namesTitle = BG.el("div", { class: "setup-block-title" });
    namesTitle.innerHTML = "<span>المقاعد واللاعبون</span><small>اختر لكل مقعد: بشري أو كمبيوتر</small>";
    panel.appendChild(namesTitle);

    const quick = BG.el("div", { class: "setup-quick" });
    const quickHuman = BG.el("button", { type: "button", class: "setup-chip", html: icon("i-users") + "<span>الجميع بشر</span>" });
    const quickCpu = BG.el("button", { type: "button", class: "setup-chip", html: "🤖<span>ضد الكمبيوتر</span>" });
    quick.appendChild(quickHuman);
    quick.appendChild(quickCpu);
    panel.appendChild(quick);

    const namesWrap = BG.el("div", { class: "setup-names" });
    panel.appendChild(namesWrap);

    const levelBox = BG.el("div", { class: "setup-field setup-level" });
    levelBox.innerHTML = '<label>مستوى الكمبيوتر</label>';
    const levelSeg = BG.el("div", { class: "seg" });
    Object.values(BG.ai.LEVELS).forEach((spec) => {
      const b = BG.el("button", {
        type: "button",
        class: "seg-btn level-btn" + (spec.id === state.level ? " active" : ""),
        text: spec.icon + " " + spec.name,
        "aria-pressed": spec.id === state.level ? "true" : "false",
        title: "مستوى " + spec.name,
      });
      b.addEventListener("click", () => {
        state.level = spec.id;
        levelSeg.querySelectorAll(".seg-btn").forEach((x) => {
          const on = x.getAttribute("data-level") === spec.id;
          x.classList.toggle("active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      b.setAttribute("data-level", spec.id);
      levelSeg.appendChild(b);
    });
    levelBox.appendChild(levelSeg);
    panel.appendChild(levelBox);

    const optionsView = buildOptionsPanel(game, state);
    if (optionsView) panel.appendChild(optionsView);

    function isDefaultName(value, index) {
      const text = String(value || "").trim();
      if (!text) return true;
      if (/^(ال)?لاعب\s*\d+$/.test(text)) return true;
      if (/^(ال)?كمبيوتر\s*\d+$/.test(text)) return true;
      return text === "الكمبيوتر " + (index + 1) || text === "اللاعب " + (index + 1);
    }

    function syncLevelVisibility() {
      const seats = state.types.slice(0, state.count);
      const anyCpu = seats.some((type) => type === "cpu");
      const humans = seats.filter((type) => type !== "cpu").length;
      levelBox.classList.toggle("is-hidden", !anyCpu);
      quickHuman.classList.toggle("active", humans === seats.length && seats.length > 0);
      quickCpu.classList.toggle("active", seats.length > 1 && humans === 1 && seats[0] !== "cpu");
    }

    function renderNames() {
      BG.clear(namesWrap);
      for (let i = 0; i < state.count; i++) {
        if (!state.types[i]) state.types[i] = "human";
        const isCpu = state.types[i] === "cpu";
        const row = BG.el("div", { class: "name-row p" + (i % 6) + (isCpu ? " is-cpu" : "") });
        row.appendChild(BG.el("span", { class: "pdot", text: String(i + 1) }));

        const input = BG.el("input", {
          type: "text",
          maxlength: "18",
          value: state.names[i] || (isCpu ? "الكمبيوتر " + (i + 1) : "اللاعب " + (i + 1)),
          placeholder: isCpu ? "الكمبيوتر " + (i + 1) : "اسم اللاعب " + (i + 1),
          "aria-label": "اسم اللاعب " + (i + 1),
        });
        input.addEventListener("input", () => { state.names[i] = input.value; });
        row.appendChild(input);

        const typeBtn = BG.el("button", {
          type: "button",
          class: "seat-type" + (isCpu ? " is-cpu" : ""),
          "aria-pressed": isCpu ? "true" : "false",
          title: isCpu ? "تحويل المقعد إلى بشري" : "تحويل المقعد إلى كمبيوتر",
          html: '<span class="seat-icon" aria-hidden="true">' + (isCpu ? "🤖" : "👤") + "</span><span>" + (isCpu ? "كمبيوتر" : "بشري") + "</span>",
        });
        typeBtn.addEventListener("click", () => {
          const next = state.types[i] === "cpu" ? "human" : "cpu";
          state.types[i] = next;
          if (next === "cpu" && isDefaultName(state.names[i], i)) {
            state.names[i] = "الكمبيوتر " + (i + 1);
          } else if (next === "human" && isDefaultName(state.names[i], i)) {
            state.names[i] = "اللاعب " + (i + 1);
          }
          renderNames();
        });
        row.appendChild(typeBtn);
        namesWrap.appendChild(row);
      }
      syncLevelVisibility();
    }

    quickHuman.addEventListener("click", () => {
      state.types = state.types.map(() => "human");
      for (let i = 0; i < state.count; i++) {
        if (isDefaultName(state.names[i], i)) state.names[i] = "اللاعب " + (i + 1);
      }
      renderNames();
    });
    quickCpu.addEventListener("click", () => {
      for (let i = 0; i < state.count; i++) {
        state.types[i] = i === 0 ? "human" : "cpu";
        if (isDefaultName(state.names[i], i)) {
          state.names[i] = i === 0 ? "اللاعب 1" : "الكمبيوتر " + (i + 1);
        }
      }
      renderNames();
    });
    renderNames();

    const note = BG.el("div", { class: "setup-note" }, [
      BG.el("span", { class: "note-icon", html: icon("i-lock") }),
      BG.el("p", { text: "اللعب محلي على نفس الجهاز، ويمكنك مزج البشر والكمبيوتر في أي مقعد. للعب مع أصدقائك في أي مكان استخدم زر «لعب جماعي» واختر الغرفة العالمية. في الألعاب ذات المعلومات السرّية يبقى المحتوى مخفيًا حتى تضغط زر «إظهار»." }),
    ]);
    panel.appendChild(note);

    const actions = BG.el("div", { class: "setup-actions" }, [
      BG.el("button", { type: "button", class: "bg-btn", html: icon("i-book") + "<span>دليل القواعد</span>" }),
      BG.el("button", { type: "button", class: "bg-btn primary big", html: icon("i-dice") + "<span>ابدأ اللعبة</span>" }),
    ]);
    actions.children[0].addEventListener("click", () => BG.openRules(game, state.options));
    actions.children[1].addEventListener("click", () => {
      const players = [];
      let cpuCount = 0;
      for (let i = 0; i < state.count; i++) {
        const raw = (state.names[i] || "").trim();
        const type = state.types[i] === "cpu" ? "cpu" : "human";
        if (type === "cpu") {
          cpuCount += 1;
          players.push({
            name: raw || "الكمبيوتر " + (i + 1),
            type,
            level: state.level,
            isCpu: true,
          });
        } else {
          players.push({
            name: raw || "اللاعب " + (i + 1),
            type: "human",
            level: state.level,
            isCpu: false,
          });
        }
      }
      lastSetup = {
        count: state.count,
        names: players.map((player) => player.name),
        types: players.map((player) => player.type),
        level: state.level,
        options: Object.assign({}, state.options),
      };
      BG.store.set("playerNames", players.map((player) => player.name));
      BG.store.set("setup.v1", { types: state.types.slice(0, state.count), level: state.level });
      startGame(game, players, cpuCount, { options: Object.assign({}, state.options) });
    });
    panel.appendChild(actions);

    els.stage.appendChild(panel);
  }

  /* ------------------------------ السجل ------------------------------ */

  function appendLog(message, kind) {
    const item = BG.el("li", { class: "log-item" + (kind ? " " + kind : "") });
    const time = new Date();
    item.appendChild(BG.el("span", { class: "log-time", text: time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) }));
    item.appendChild(BG.el("span", { class: "log-text", html: message }));
    els.gameLog.appendChild(item);
    while (els.gameLog.children.length > 120) els.gameLog.removeChild(els.gameLog.firstChild);
    if (els.gameLog.parentElement) els.gameLog.parentElement.scrollTop = els.gameLog.parentElement.scrollHeight;
  }

  /* ------------------------------ بدء اللعبة ------------------------------ */

  function buildRoster(seats) {
    return (seats || []).map((seat, index) => {
      const item = typeof seat === "string" ? { name: seat } : Object.assign({}, seat);
      const cpu = BG.ai.isCpu(item);
      return {
        name: item.name || (cpu ? "الكمبيوتر " + (index + 1) : "اللاعب " + (index + 1)),
        type: cpu ? "cpu" : "human",
        level: BG.ai.level(item.level),
        isCpu: cpu,
        peerId: item.peerId || null,
      };
    });
  }

  function makeNetApi(ctx) {
    return {
      enabled: true,
      boot: false,
      isHost: !!ctx.isHost,
      seat: ctx.seat,
      seats: ctx.seats,
      roomCode: ctx.roomCode || "",
      isCpuSeat(index) {
        const seat = ctx.seats[index];
        return !!(seat && seat.type === "cpu");
      },
      isRemoteSeat(index) {
        const seat = ctx.seats[index];
        if (!seat || seat.type === "cpu") return false;
        return index !== ctx.seat;
      },
      askRefutation(seat, combo, suggesterName) {
        return BG.online.askRefutation(seat, combo, suggesterName);
      },
      confirmTrade(seat, text) {
        return BG.online.confirmTrade(seat, text);
      },
      auctionBid(seat, payload) {
        return BG.online.auctionBid(seat, payload);
      },
    };
  }

  function startGame(game, seats, cpuCount, options) {
    const opts = options || {};
    const roster = buildRoster(seats);
    const bots = typeof cpuCount === "number" ? cpuCount : roster.filter((seat) => seat.isCpu).length;
    currentOptions = Object.assign({}, (game.options && game.options.defaults) || {}, opts.options || {});
    destroyInstance();
    BG.clear(els.stage);
    BG.clear(els.gameLog);
    els.btnNew.hidden = false;
    els.gameStatus.textContent = "جارٍ اللعب";
    els.gameStatus.className = "game-status live";
    els.gameLogCard.hidden = false;

    gameMount = BG.el("div", { class: "game-mount", hidden: !!opts.skipCreate });
    els.stage.appendChild(gameMount);
    if (BG.fx) BG.fx.screenEnter(gameMount);
    applyGameScale();

    // في وضع المشاهدة تبقى اللوحة مرئية لكن بلا أي تفاعل.
    // بعد نهاية اللعبة نسمح بالتفاعل مع أزرار النتيجة (مثل تفاصيل الحساب).
    const guardSpectate = (event) => {
      if (!currentNet || !currentNet.spectate) return;
      if (netOver()) return;
      event.stopPropagation();
      if (event.cancelable && event.type !== "pointerdown" && event.type !== "wheel" && event.type !== "touchstart" && event.type !== "touchmove") {
        event.preventDefault();
      }
    };
    gameMount.addEventListener("click", guardSpectate, true);
    gameMount.addEventListener("dblclick", guardSpectate, true);
    gameMount.addEventListener("keydown", guardSpectate, true);
    gameMount.addEventListener("pointerdown", guardSpectate, true);
    gameMount.addEventListener("submit", guardSpectate, true);

    const netCtx = opts.net || null;
    currentNet = netCtx;
    let instanceLog = true;

    const api = {
      stage: gameMount,
      players: roster.map((seat) => Object.assign({}, seat)),
      cpuCount: bots,
      options: currentOptions,
      toast: BG.toast,
      log(message, kind) {
        if (!instanceLog) return;
        if (currentApi && currentApi.net && currentApi.net.boot) return;
        appendLog(message, kind);
        if (netCtx && BG.online && BG.online.active) BG.online.relayLog(message, kind);
      },
      rules: () => BG.openRules(game, currentOptions),
      setStatus(text, tone) {
        els.gameStatus.textContent = text;
        els.gameStatus.className = "game-status" + (tone ? " " + tone : " live");
      },
      gameOver(o) {
        if (netCtx) {
          BG.online.gameOver(o || {});
          return;
        }
        showGameOver(o || {}, false);
      },
      newGame() {
        if (isOnlineGame()) BG.online.returnToLobby();
        else openSetup(game, lastSetup);
      },
      back: goLibrary,
      finished: false,
    };
    api.net = netCtx ? makeNetApi(netCtx) : null;
    currentApi = api;

    if (!opts.skipCreate) {
      if (opts.importState) instanceLog = false;
      createInstance(game, netCtx, opts.importState || null);
      instanceLog = true;
      if (!netCtx) startSaveTimer();
    }

    // تحريك القطع في الألعاب التي لا تدير حركتها بنفسها.
    if (stopPieceObserver) { stopPieceObserver(); stopPieceObserver = null; }
    if (BG.fx && BG.fx.observePieces) {
      const own = { ludo: 1, snakes: 1, checkers: 1, mancala: 1, monopoly: 1, cluedo: 1 };
      stopPieceObserver = BG.fx.observePieces(gameMount, { skip: !!own[game.id] });
    }

    return { api, mount: gameMount, roster };
  }

  function createInstance(game, netCtx, importState) {
    if (!currentApi || !gameMount) return null;
    if (instance && typeof instance.destroy === "function") {
      try { instance.destroy(); } catch (err) { console.warn(err); }
    }
    instance = null;
    BG.clear(gameMount);
    if (currentApi.net && importState) currentApi.net.boot = true;
    const wasActive = BG.online && BG.online.active;
    try {
      instance = game.create(gameMount, currentApi) || null;
      if (instance && importState && typeof instance.netLoad === "function") {
        BG.closeDialogs();
        instance.netLoad(importState);
        if (typeof instance.netResume === "function" && !(netCtx && netCtx.spectate)) instance.netResume();
      }
    } catch (err) {
      console.error(err);
      gameMount.innerHTML = '<div class="fatal-error">حدث خطأ أثناء تشغيل اللعبة. <button class="bg-btn" onclick="location.reload()">إعادة التحميل</button></div>';
      BG.toast("تعذّر تشغيل اللعبة", "warn");
      instance = null;
    }
    if (currentApi.net) currentApi.net.boot = false;
    if (!wasActive && BG.online && BG.online.active && netCtx) {
      // لا شيء: الإدارة عبر online
    }
    gameMount.hidden = false;
    return instance;
  }

  function showGameOver(o, online) {
    const data = Object.assign({ title: "انتهت اللعبة", text: "", winner: "", standings: [] }, o || {});
    const finished = currentApi;
    if (finished) finished.finished = true;
    if (!online) clearSave();
    if (BG.fx) {
      const won = data.tone !== "lose";
      BG.fx.result({
        icon: data.icon || "🏆",
        title: data.title,
        text: data.winner || "",
        tone: won ? "win" : "lose",
      });
      if (won) BG.fx.win();
      else BG.fx.lose();
    }
    const body = BG.el("div", { class: "gameover-wrap" });
    body.appendChild(BG.el("div", { class: "gameover-icon", text: data.icon || "🏆" }));
    body.appendChild(BG.el("h3", { text: data.title }));
    if (data.text) body.appendChild(BG.el("p", { class: "gameover-text", html: data.text }));
    if (data.winner) body.appendChild(BG.el("div", { class: "gameover-winner", text: data.winner }));
    if (data.standings && data.standings.length) {
      const list = BG.el("ol", { class: "gameover-list" });
      data.standings.forEach((s) => {
        list.appendChild(BG.el("li", {}, [
          BG.el("span", { text: s.name }),
          BG.el("strong", { text: String(s.value) }),
        ]));
      });
      body.appendChild(list);
    }
    els.gameStatus.textContent = "انتهت";
    els.gameStatus.className = "game-status over";
    const actions = online
      ? [{ label: "المكتبة", value: "library" }, { label: "الغرفة", value: "lobby", primary: true }]
      : [{ label: "المكتبة", value: "library" }, { label: "لعبة جديدة", value: "new", primary: true }];
    BG.openDialog({
      title: data.title,
      body,
      actions,
    }).promise.then((value) => {
      if (value === "new") openSetup(currentGame, lastSetup);
      else if (value === "lobby") { if (BG.online) BG.online.returnToLobby(); }
      else if (value === "library") goLibrary();
    });
  }

  /* ------------------------------ الشبكة ------------------------------ */

  function findLocalSeat(seats) {
    const self = BG.net ? BG.net.selfId : "";
    if (!self) return -1;
    return (seats || []).findIndex((seat) => seat && seat.peerId && seat.peerId === self);
  }

  function startNetworkGame(payload) {
    const game = BG.byId[payload.gameId];
    if (!game) {
      BG.toast("اللعبة المطلوبة غير متاحة.", "warn");
      return null;
    }
    const seats = payload.seats || [];
    const localSeat = findLocalSeat(seats);
    destroyInstance();
    currentOptions = Object.assign({}, (game.options && game.options.defaults) || {}, payload.options || {});
    prepareGameView(game);
    els.gameStatus.textContent = "غرفة " + (payload.roomCode || (BG.net && BG.net.roomCode) || "");
    els.gameStatus.className = "game-status live";
    els.gameLogCard.hidden = false;
    BG.clear(els.gameLog);
    history.replaceState(null, "", "#" + game.id);

    const ctx = {
      isHost: !!(BG.net && BG.net.isHost),
      seat: localSeat,
      seats,
      roomCode: payload.roomCode || (BG.net && BG.net.roomCode) || "",
    };
    const result = startGame(game, seats, seats.filter((seat) => seat.type === "cpu").length, {
      net: ctx,
      skipCreate: true,
      options: payload.options || null,
    });
    currentNet = ctx;
    if (BG.online) {
      BG.online.begin({
        game,
        seats,
        localSeat,
        isHost: ctx.isHost,
        api: result && result.api,
        mount: result && result.mount,
        options: currentOptions,
      });
    }
    return ctx;
  }

  function netBeginHost() {
    if (!isOnlineGame() || !currentNet || !currentNet.isHost) return false;
    if (instance) return true;
    const created = createInstance(currentGame, currentNet, null);
    if (created && BG.online) BG.online.hostStarted(created);
    return !!created;
  }

  function applyGameScale() {
    try {
      if (!gameMount) return;
      const id = currentGame ? currentGame.id : "";
      const w = window.innerWidth;
      if (w < 980) {
        gameMount.classList.add("is-mobile-scaled");
      } else {
        gameMount.classList.remove("is-mobile-scaled");
      }
      if (id === "monopoly") {
        // لوحة مونوبولي مربعة ومكتفية بعرضها؛ نفعّل نمط الهاتف فقط على الشاشات الضيقة.
        if (w < 700) gameMount.classList.add("is-mono-mobile");
        else gameMount.classList.remove("is-mono-mobile");
      } else if ((id === "catan" || id === "risk" || id === "ttr" || id === "carcassonne" || id === "scrabble" || id === "cluedo" || id === "pandemic" || id === "uno" || id === "tavla" || id === "waraq") && w < 1100) {
        gameMount.classList.add("is-mono-mobile");
      } else {
        gameMount.classList.remove("is-mono-mobile");
      }
    } catch (e) {}
  }

  window.addEventListener("resize", applyGameScale);
  window.addEventListener("orientationchange", applyGameScale);

  function netActivate(state) {
    if (!currentGame || !currentNet) return false;
    if (!state) return false;
    if (currentNet) currentNet.spectate = false;
    if (gameMount) gameMount.removeAttribute("data-spectate");
    if (!instance) {
      const created = createInstance(currentGame, currentNet, state);
      if (!created) return false;
    } else {
      BG.closeDialogs({ keep: "[data-sync-keep]" });
      if (typeof instance.netLoad !== "function") return false;
      instance.netLoad(state);
      if (typeof instance.netResume === "function") instance.netResume();
    }
    if (gameMount) gameMount.hidden = false;
    if (BG.online) BG.online.showWaiting(false);
    return true;
  }

  /**
   * وضع المشاهدة: يُحمَّل أحدث snapshot للوحة لكن يبقى الجهاز بلا صلاحية لعب.
   * لا تُعرض معلومات اللاعب النشط السرّية لأن كل لعبة تعرض أوراق المقعد المحلي فقط.
   */
  function netSpectate(state) {
    if (!currentGame || !currentNet) return false;
    if (!state) return false;
    currentNet.spectate = true;
    BG.closeDialogs({ keep: "[data-sync-keep]" });
    if (!instance) {
      const created = createInstance(currentGame, currentNet, state);
      if (!created) return false;
    } else if (typeof instance.netLoad === "function") {
      instance.netLoad(state);
    } else {
      return false;
    }
    if (gameMount) {
      gameMount.hidden = false;
      gameMount.setAttribute("data-spectate", "1");
    }
    return true;
  }

  function netSetSpectate(on) {
    if (!currentNet) return;
    currentNet.spectate = !!on;
    if (gameMount) {
      if (on) gameMount.setAttribute("data-spectate", "1");
      else gameMount.removeAttribute("data-spectate");
    }
  }

  function netDeactivate() {
    if (instance && typeof instance.destroy === "function") {
      try { instance.destroy(); } catch (err) { console.warn(err); }
    }
    instance = null;
    // أبقِ حاوية اللعبة موجودة كي يمكن إعادة بنائها عند عودة الدور لهذا الضيف.
    if (gameMount) {
      BG.clear(gameMount);
      gameMount.hidden = true;
    }
    if (BG.online) BG.online.showWaiting(true);
  }

  function netReceiveState(payload) {
    if (!instance || !payload || !payload.state) return false;
    if (typeof instance.netLoad !== "function") return false;
    BG.closeDialogs({ keep: "[data-sync-keep]" });
    instance.netLoad(payload.state);
    return true;
  }

  function netSnapshot() {
    if (!instance || typeof instance.netSnapshot !== "function") return null;
    try { return instance.netSnapshot(); } catch (err) { console.warn(err); return null; }
  }

  function netSeat() {
    if (!instance || typeof instance.netSeat !== "function") return -1;
    try { return instance.netSeat(); } catch (err) { return -1; }
  }

  function netOver() {
    if (!instance || typeof instance.netOver !== "function") return false;
    try { return !!instance.netOver(); } catch (err) { return false; }
  }

  function netResume() {
    if (instance && typeof instance.netResume === "function") instance.netResume();
  }

  function setMountVisible(visible) {
    if (gameMount) gameMount.hidden = !visible;
  }

  function getLogCount() {
    return els.gameLog ? els.gameLog.children.length : 0;
  }

  /* تبديل متحكّم مقعد أثناء اللعب (بشري ↔ كمبيوتر): نعدّل لقطة الحالة نفسها، فيعمل مع كل الألعاب
     لأنها تخزّن players[i].isCpu/type/level/name في حالتها. */
  function netPatchPlayer(index, patch) {
    if (!instance || typeof instance.netSnapshot !== "function" || typeof instance.netLoad !== "function") return false;
    let snap = null;
    try { snap = instance.netSnapshot(); } catch (err) { return false; }
    if (!snap || !Array.isArray(snap.players) || !snap.players[index]) return false;
    const p = snap.players[index];
    if (patch.cpu !== undefined) {
      p.isCpu = !!patch.cpu;
      p.type = patch.cpu ? "cpu" : "human";
    }
    if (patch.level) p.level = patch.level;
    if (patch.name) p.name = patch.name;
    try {
      BG.closeDialogs({ keep: "[data-sync-keep]" });
      instance.netLoad(snap);
      if (typeof instance.netResume === "function" && !(currentNet && currentNet.spectate)) instance.netResume();
    } catch (err) {
      console.warn(err);
      return false;
    }
    if (currentApi && currentApi.players && currentApi.players[index]) {
      const roster = currentApi.players[index];
      if (patch.cpu !== undefined) { roster.isCpu = !!patch.cpu; roster.type = patch.cpu ? "cpu" : "human"; }
      if (patch.level) roster.level = patch.level;
      if (patch.name) roster.name = patch.name;
    }
    return true;
  }

  /* إعادة بناء نسخة اللعبة لمقعد محلي جديد (تبديل مواقع اللاعبين أثناء اللعب) */
  function netRebuild(newSeat) {
    if (!currentGame || !currentNet) return false;
    const snap = netSnapshot();
    currentNet.seat = newSeat;
    if (currentApi && currentApi.net) currentApi.net.seat = newSeat;
    if (!snap) return false;
    return !!createInstance(currentGame, currentNet, snap);
  }

  /* ترقية هذا الجهاز إلى مضيف أثناء اللعب (نقل الاستضافة) من آخر حالة معروفة */
  function netPromoteToHost(snapshot) {
    if (!currentGame || !currentNet) return false;
    currentNet.isHost = true;
    currentNet.spectate = false;
    if (currentApi && currentApi.net) currentApi.net.isHost = true;
    if (gameMount) gameMount.removeAttribute("data-spectate");
    const state = snapshot || netSnapshot();
    const created = createInstance(currentGame, currentNet, state);
    if (!created) return false;
    if (gameMount) gameMount.hidden = false;
    return true;
  }

  function netSetRole(isHost, seat) {
    if (!currentNet) return;
    currentNet.isHost = !!isHost;
    if (Number.isInteger(seat)) currentNet.seat = seat;
    if (currentApi && currentApi.net) {
      currentApi.net.isHost = !!isHost;
      if (Number.isInteger(seat)) currentApi.net.seat = seat;
    }
  }

  BG.app = {
    netPatchPlayer,
    netRebuild,
    netPromoteToHost,
    netSetRole,
    showGameOver,
    startNetworkGame,
    netBeginHost,
    netActivate,
    netSpectate,
    netSetSpectate,
    netDeactivate,
    netReceiveState,
    netSnapshot,
    netSeat,
    netOver,
    netResume,
    setMountVisible,
    appendLog,
    goLibrary,
    openSetup,
    resumeSaved,
    readSave,
    saveProgress,
    clearSave,
    getLogCount,
    get instance() { return instance; },
    get game() { return currentGame; },
    get net() { return currentNet; },
    get api() { return currentApi; },
    get options() { return currentOptions; },
    get online() { return isOnlineGame(); },
  };
})();
