/* ==========================================================================
   إدارة نوافذ الألعاب — تحريك وترتيب وفصل اللوحات الجانبية واللوحات المساعدة
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});
  const STORAGE_PREFIX = "windows.v1.";
  const FLOAT_DELAY = 540;
  const EDGE = 8;
  const MIN_WIDTH = 188;
  const DRAG_THRESHOLD = 5;
  const FLOAT_SIDEWAYS = 40;

  const GENERIC_PANEL_CLASSES = {
    "xg-panel": 1,
    "cg-panel": 1,
    "mpanel": 1,
    "panel": 1,
    "coop-panel": 1,
    "cat-panel": 1,
    "pan-panel": 1,
    "risk-panel": 1,
    "ttr-panel": 1,
    "scrab-panel": 1,
    "cluedo-panel": 1,
    "spl-panel": 1,
    "tav-panel": 1,
    "carc-panel": 1,
    "uno-panel": 1,
  };

  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, BR: 1, HR: 1, LINK: 1, META: 1 };

  let root = null;
  let mount = null;
  let gameId = "";
  let layout = {};
  let infos = [];
  let infoByEl = new WeakMap();
  let observer = null;
  let enhanceTimer = 0;
  let floatTimer = 0;
  let floatReady = false;
  let editing = false;
  let zTop = 5000;
  let drag = null;
  let btn = null;
  let fsBtn = null;
  let hint = null;
  let hintText = null;
  let initialized = false;
  let viewportFrame = 0;
  let saveTimer = 0;
  let originalStyles = new WeakMap();

  function init() {
    if (initialized) return;
    initialized = true;
    btn = document.getElementById("btnGameWindows");
    fsBtn = document.getElementById("btnFsWindows");
    ensureHint();
    toggleButtons().forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        if (!infos.length) return;
        setEditing(!editing);
      });
    });
    document.addEventListener("keydown", onGlobalKeydown);
    window.addEventListener("resize", scheduleViewportFix, { passive: true });
    window.addEventListener("orientationchange", scheduleViewportFix);
    document.addEventListener("fullscreenchange", scheduleViewportFix);
  }

  /* ------------------------------ التخزين ------------------------------ */

  function loadLayout(id) {
    const saved = BG.store && BG.store.get ? BG.store.get(STORAGE_PREFIX + id, null) : null;
    const source = saved && saved.panels && typeof saved.panels === "object" ? saved.panels : {};
    const out = {};
    Object.keys(source).forEach(function (key) {
      const value = source[key];
      if (!value || typeof value !== "object") return;
      const next = { mode: value.mode === "float" ? "float" : "dock" };
      ["x", "y", "w", "order"].forEach(function (prop) {
        const number = Number(value[prop]);
        if (Number.isFinite(number)) next[prop] = number;
      });
      out[key] = next;
    });
    return out;
  }

  function saveLayout() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (!gameId || !BG.store || !BG.store.set) return;
    const panels = {};
    Object.keys(layout).forEach(function (key) {
      const value = layout[key];
      if (!value || typeof value !== "object") return;
      if (value.mode !== "float" && !Number.isFinite(value.order)) return;
      const panel = { mode: value.mode === "float" ? "float" : "dock" };
      ["x", "y", "w", "order"].forEach(function (prop) {
        if (Number.isFinite(value[prop])) panel[prop] = Math.round(value[prop] * 100) / 100;
      });
      panels[key] = panel;
    });
    BG.store.set(STORAGE_PREFIX + gameId, { v: 1, panels: panels });
  }

  function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = 0;
      saveLayout();
    }, 120);
  }

  function clearSavedLayout() {
    if (!gameId) return;
    try {
      localStorage.removeItem("bg." + STORAGE_PREFIX + gameId);
    } catch (err) {
      /* ignore */
    }
  }

  function stateFor(key) {
    let value = layout[key];
    if (!value || typeof value !== "object") {
      value = { mode: "dock" };
      layout[key] = value;
    }
    if (value.mode !== "float") value.mode = "dock";
    return value;
  }

  /* ------------------------------ اكتشاف النوافذ ------------------------------ */

  function isHiddenBox(el) {
    if (!el || !el.isConnected) return true;
    const style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function hasContent(el) {
    if (!el) return false;
    if (el.hasAttribute("data-ld-actions")) return true;
    if (el.querySelector("button, input, select, textarea, [role='button']")) return true;
    return !!String(el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function shouldFlatten(el) {
    if (!el) return false;
    if (el.hasAttribute("data-side-top") || el.hasAttribute("data-side-rest") || el.classList.contains("risk-secret-slot")) return true;
    try {
      const display = window.getComputedStyle(el).display;
      if (display === "contents" && el.children.length) return true;
    } catch (err) {
      /* ignore */
    }
    return false;
  }

  function collectDockPanels(dock, output) {
    const visit = function (parent) {
      Array.prototype.forEach.call(parent.children, function (child) {
        if (child.classList && (child.classList.contains("bg-win-tools") || child.classList.contains("bg-win-hint"))) return;
        if (SKIP_TAGS[child.tagName]) return;
        if (shouldFlatten(child)) {
          visit(child);
          return;
        }
        if (isHiddenBox(child) || !hasContent(child)) return;
        output.push(child);
      });
    };
    visit(dock);
  }

  function rowHeading(el) {
    const nodes = el.querySelectorAll("h1, h2, h3, h4");
    for (let i = 0; i < nodes.length; i++) {
      const text = String(nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (text) return text;
    }
    return "";
  }

  function isPlayerHeading(text) {
    return /^(اللاعبون|اللاعبين|اللاعب|الفريق|القادة|المتنافسون|طاقم|الطاقم|المحققون)$/.test(String(text || "").trim());
  }

  function outsideWindowMatch(el) {
    const cls = String(el.className || "");
    if (/\b(board|map|grid|table|wrap|tokens?|tray|svg)\b/i.test(cls)) return false;
    if (/yz-play|yz-cards|bs-setup/.test(cls)) return true;
    if (/(^|[\s-])(dice|roll|players)([\s-]|$)/i.test(cls)) return true;
    if (el.querySelector("[data-yz-roll], [data-kt-roll], [data-pc-roll], [data-ld-roll], [data-roll], [data-act='roll']")) return true;
    if ((el.classList.contains("xg-panel") || el.classList.contains("mpanel")) && isPlayerHeading(rowHeading(el))) return true;
    return false;
  }

  function collectMainPanels(docks, known) {
    if (!mount) return [];
    const output = [];
    const selectors = [
      ".yz-play",
      ".yz-cards",
      ".bs-setup",
      "[class*='-dice']",
      "[class*='-roll']",
      "[class*='-players']",
      ".xg-panel",
      ".mpanel",
    ].join(",");
    const candidates = Array.prototype.slice.call(mount.querySelectorAll(selectors));
    candidates.forEach(function (el) {
      if (!el || known.has(el)) return;
      if (docks.some(function (dock) { return dock === el || dock.contains(el); })) return;
      if (!hasContent(el) || isHiddenBox(el)) return;
      if (!outsideWindowMatch(el)) return;
      // لا نكرر الألواح المتداخلة: نأخذ النافذة الخارجية فقط.
      let parent = el.parentElement;
      while (parent && parent !== mount) {
        if (candidates.indexOf(parent) !== -1 && outsideWindowMatch(parent) && hasContent(parent)) return;
        parent = parent.parentElement;
      }
      output.push(el);
    });
    return output;
  }

  function classTokens(el) {
    return Array.prototype.filter.call(el.classList || [], function (token) {
      return token && token.indexOf("bg-win") !== 0 && token.indexOf("bg-window") !== 0 && !/^is-/.test(token) && !/^has-/.test(token) && !/^p\d+$/.test(token);
    });
  }

  function dockKeyFor(dock, index, used) {
    if (dock.id) return "id-" + dock.id;
    const tokens = classTokens(dock);
    let key =
      tokens.find(function (token) { return /(^|-)side$/.test(token); }) ||
      tokens.find(function (token) { return /-arena$/.test(token) || /-dock$/.test(token); }) ||
      tokens.find(function (token) { return token.indexOf("-") !== -1; }) ||
      dock.tagName.toLowerCase();
    if (dock.tagName === "ASIDE" && key === "aside") key = "aside-" + (index + 1);
    key = key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48) || "dock";
    let unique = key;
    let suffix = 2;
    while (used.has(unique)) {
      unique = key + "-" + suffix;
      suffix += 1;
    }
    used.add(unique);
    return unique;
  }

  function panelBaseKey(el) {
    if (el.hasAttribute("data-ld-actions")) return "actions";
    if (el.id) return "id-" + el.id;
    const tokens = classTokens(el);
    const specific = tokens.find(function (token) {
      return !GENERIC_PANEL_CLASSES[token] && token.indexOf("-") !== -1;
    });
    if (specific) return specific;
    if (tokens.length) return tokens[0];
    const heading = rowHeading(el);
    if (heading) {
      const clean = heading.replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28);
      if (clean) return clean;
    }
    return el.tagName.toLowerCase();
  }

  function uniquePanelKey(base, dockKey, used) {
    let key = dockKey + ">" + String(base || "window").replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, "-").slice(0, 48);
    if (!used[key]) {
      used[key] = 1;
      return key;
    }
    let index = used[key] + 1;
    while (used[key + "-" + index]) index += 1;
    used[key] = index;
    return key + "-" + index;
  }

  function titleFor(el) {
    const cls = String(el.className || "");
    if (/yz-cards/.test(cls) || el.querySelectorAll(".yz-card").length > 1) return "اللاعبون";
    if (el.querySelector("[data-yz-roll], [data-kt-roll], [data-pc-roll], [data-ld-roll], [data-roll], [data-act='roll']")) return "النرد";
    if (/dice|roll/i.test(cls) || /نرد/i.test(rowHeading(el))) return "النرد";
    if (/players?/i.test(cls) || isPlayerHeading(rowHeading(el))) return "اللاعبون";
    if (/secret|hidden|private/i.test(cls)) return "بطاقتك السرية";
    if (/battle/i.test(cls)) return "المعركة";
    if (/market/i.test(cls)) return "السوق";
    if (/history|log/i.test(cls)) return "السجل";
    if (/legend|help|tips|goal|summary/i.test(cls)) return "الدليل";
    if (/notice|status/i.test(cls)) return "الحالة";
    if (/turn/i.test(cls)) return "الدور";
    if (/banner/i.test(cls)) return "الدور والنرد";
    if (/actions?|controls?/i.test(cls)) return "التحكم";
    const heading = rowHeading(el);
    if (heading) {
      return heading.replace(/^[\s\u{1F300}-\u{1FAFF}\u2600-\u27BF]+/u, "").split(" — ")[0].trim().slice(0, 28) || "نافذة";
    }
    return "نافذة";
  }

  function discover() {
    const docks = [];
    const found = [];
    const usedElements = new Set();
    if (!mount) return { docks: docks, found: found };

    const pushDock = function (el) {
      if (!el || !el.isConnected || docks.indexOf(el) !== -1) return;
      if (el.closest(".bg-win-tools")) return;
      docks.push(el);
    };

    Array.prototype.forEach.call(mount.querySelectorAll("aside"), pushDock);
    Array.prototype.forEach.call(mount.querySelectorAll(".bs-arena"), function (el) {
      if (el.querySelector(".bs-side")) pushDock(el);
    });

    const dockKeys = {};
    const usedDocks = new Set();
    const usedKeys = Object.create(null);
    let sequence = 0;

    docks.forEach(function (dock, dockIndex) {
      const dockKey = dockKeyFor(dock, dockIndex, usedDocks);
      dockKeys[dockKey] = 1;
      const panels = [];
      collectDockPanels(dock, panels);
      panels.forEach(function (el) {
        if (usedElements.has(el)) return;
        usedElements.add(el);
        found.push({
          el: el,
          dock: dock,
          dockKey: dockKey,
          key: uniquePanelKey(panelBaseKey(el), dockKey, usedKeys),
          title: titleFor(el),
          seq: sequence++,
        });
      });
    });

    collectMainPanels(docks, usedElements).forEach(function (el) {
      if (usedElements.has(el)) return;
      usedElements.add(el);
      const parent = el.parentElement || mount;
      const baseDock = parent.id ? "id-" + parent.id : (classTokens(parent)[0] || parent.tagName.toLowerCase());
      const dockKey = "main~" + String(baseDock).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 36);
      found.push({
        el: el,
        dock: parent,
        dockKey: dockKey,
        key: uniquePanelKey(panelBaseKey(el), dockKey, usedKeys),
        title: titleFor(el),
        seq: sequence++,
      });
    });

    return { docks: docks, found: found };
  }

  /* ------------------------------ المساعدة والأنماط ------------------------------ */

  function rememberStyles(el) {
    if (originalStyles.has(el)) return;
    originalStyles.set(el, {
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      zIndex: el.style.zIndex,
      order: el.style.order,
    });
  }

  function restoreStyles(el) {
    const saved = originalStyles.get(el);
    if (!saved) return;
    el.style.left = saved.left;
    el.style.top = saved.top;
    el.style.width = saved.width;
    el.style.zIndex = saved.zIndex;
    el.style.order = saved.order;
    el.style.removeProperty("--bg-win-x");
    el.style.removeProperty("--bg-win-y");
    el.style.removeProperty("--bg-win-w");
    originalStyles.delete(el);
  }

  function infoFor(el) {
    return el ? infoByEl.get(el) || null : null;
  }

  function dockInfos(dockKey) {
    return infos.filter(function (info) {
      return info.dockKey === dockKey && info.el.isConnected && stateFor(info.key).mode !== "float";
    });
  }

  function orderedDockInfos(dockKey) {
    const list = dockInfos(dockKey);
    list.sort(function (a, b) {
      const oa = stateFor(a.key).order;
      const ob = stateFor(b.key).order;
      const ha = Number.isFinite(oa);
      const hb = Number.isFinite(ob);
      if (ha && hb && oa !== ob) return oa - ob;
      if (ha !== hb) return ha ? -1 : 1;
      return a.seq - b.seq;
    });
    return list;
  }

  function dockHasOrder(dockKey) {
    return infos.some(function (info) {
      return info.dockKey === dockKey && Number.isFinite(stateFor(info.key).order);
    });
  }

  function applyDockOrder(dockKey) {
    const list = orderedDockInfos(dockKey);
    const hasOrder = dockHasOrder(dockKey);
    list.forEach(function (info, index) {
      rememberStyles(info.el);
      if (hasOrder) info.el.style.order = String(index);
      else info.el.style.order = "";
    });
  }

  function applyAllOrders() {
    const seen = {};
    infos.forEach(function (info) {
      if (seen[info.dockKey]) return;
      seen[info.dockKey] = 1;
      applyDockOrder(info.dockKey);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function floatGeometry(info, state) {
    const vw = Math.max(0, window.innerWidth);
    const vh = Math.max(0, window.innerHeight);
    const width = Math.max(MIN_WIDTH, Math.min(state.w || 320, vw - EDGE * 2));
    const rect = info.el.getBoundingClientRect();
    const height = rect.height || 280;
    const maxX = Math.max(EDGE, vw - width - EDGE);
    const maxY = Math.max(EDGE, vh - Math.min(height, vh - EDGE * 2) - EDGE);
    return {
      width: width,
      x: clamp(Number.isFinite(state.x) ? state.x : rect.left || EDGE, EDGE, maxX),
      y: clamp(Number.isFinite(state.y) ? state.y : rect.top || EDGE, EDGE, maxY),
    };
  }

  function applyFloat(info) {
    const state = stateFor(info.key);
    if (state.mode !== "float") return;
    const geometry = floatGeometry(info, state);
    rememberStyles(info.el);
    state.x = geometry.x;
    state.y = geometry.y;
    state.w = geometry.width;
    info.el.classList.add("bg-window-float");
    info.el.style.setProperty("--bg-win-x", geometry.x + "px");
    info.el.style.setProperty("--bg-win-y", geometry.y + "px");
    info.el.style.setProperty("--bg-win-w", geometry.width + "px");
    info.el.style.zIndex = String(zTop);
    info.el.style.removeProperty("order");
  }

  function applyDock(info) {
    const state = stateFor(info.key);
    state.mode = "dock";
    info.el.classList.remove("bg-window-float");
    info.el.style.removeProperty("--bg-win-x");
    info.el.style.removeProperty("--bg-win-y");
    info.el.style.removeProperty("--bg-win-w");
    const saved = originalStyles.get(info.el);
    if (saved) {
      info.el.style.left = saved.left;
      info.el.style.top = saved.top;
      info.el.style.width = saved.width;
      info.el.style.zIndex = saved.zIndex;
    } else {
      info.el.style.removeProperty("left");
      info.el.style.removeProperty("top");
      info.el.style.removeProperty("width");
      info.el.style.removeProperty("z-index");
    }
    applyDockOrder(info.dockKey);
  }

  function applyAllFloats() {
    infos.forEach(function (info) {
      if (stateFor(info.key).mode === "float") applyFloat(info);
    });
  }

  function scheduleViewportFix() {
    if (viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(function () {
      viewportFrame = 0;
      if (!infos.length) return;
      infos.forEach(function (info) {
        if (stateFor(info.key).mode !== "float") return;
        applyFloat(info);
        updateTools(info);
      });
      queueSave();
    });
  }

  /* ------------------------------ أدوات النافذة ------------------------------ */

  function makeButton(act, glyph, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bg-win-tool";
    button.setAttribute("data-bg-win-act", act);
    button.setAttribute("aria-label", label);
    button.title = label;
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = glyph;
    button.appendChild(icon);
    if (act === "move") {
      button.classList.add("bg-win-grip");
      button.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
    }
    return button;
  }

  function buildTools() {
    const tools = document.createElement("div");
    tools.className = "bg-win-tools";
    tools.setAttribute("role", "toolbar");
    tools.setAttribute("data-bg-win-tools", "");
    tools.setAttribute("aria-label", "أدوات النافذة");
    tools.appendChild(makeButton("move", "⠿", "اسحب لتحريك النافذة"));
    const label = document.createElement("span");
    label.className = "bg-win-label";
    label.setAttribute("data-bg-win-label", "");
    tools.appendChild(label);
    tools.appendChild(makeButton("up", "↑", "تحريك النافذة لأعلى"));
    tools.appendChild(makeButton("down", "↓", "تحريك النافذة لأسفل"));
    tools.appendChild(makeButton("mode", "⤢", "فصل النافذة"));
    tools.addEventListener("click", onToolsClick);
    tools.addEventListener("pointerdown", onToolsPointerDown);
    tools.addEventListener("keydown", onToolsKeydown);
    return tools;
  }

  function ensureTools(info) {
    let tools = null;
    Array.prototype.forEach.call(info.el.children, function (child) {
      if (child.classList && child.classList.contains("bg-win-tools")) tools = child;
    });
    if (!tools) {
      tools = buildTools();
      info.el.appendChild(tools);
    }
    info.tools = tools;
    tools.setAttribute("aria-label", "أدوات " + info.title);
    const label = tools.querySelector("[data-bg-win-label]");
    if (label) label.textContent = info.title;
    updateTools(info);
  }

  function updateTools(info) {
    if (!info || !info.tools) return;
    const list = orderedDockInfos(info.dockKey);
    const index = list.indexOf(info);
    const state = stateFor(info.key);
    const up = info.tools.querySelector('[data-bg-win-act="up"]');
    const down = info.tools.querySelector('[data-bg-win-act="down"]');
    const mode = info.tools.querySelector('[data-bg-win-act="mode"]');
    if (up) {
      up.disabled = state.mode === "float" || index <= 0;
      up.setAttribute("aria-disabled", up.disabled ? "true" : "false");
    }
    if (down) {
      down.disabled = state.mode === "float" || index < 0 || index >= list.length - 1;
      down.setAttribute("aria-disabled", down.disabled ? "true" : "false");
    }
    if (mode) {
      const floating = state.mode === "float";
      mode.setAttribute("data-bg-win-act", "mode");
      mode.setAttribute("aria-label", floating ? "إرساء النافذة في مكانها" : "فصل النافذة عن اللوحة");
      mode.title = floating ? "إرساء النافذة" : "فصل النافذة";
      mode.classList.toggle("is-floating", floating);
      const glyph = mode.querySelector("span");
      if (glyph) glyph.textContent = floating ? "⌂" : "⤢";
    }
  }

  function toggleButtons() {
    if (!btn) btn = document.getElementById("btnGameWindows");
    if (!fsBtn) fsBtn = document.getElementById("btnFsWindows");
    return [btn, fsBtn].filter(Boolean);
  }

  function setEditing(on) {
    const next = !!on && infos.length > 0;
    editing = next;
    if (root) root.classList.toggle("bg-win-edit", editing);
    toggleButtons().forEach(function (toggle) {
      toggle.hidden = !infos.length;
      toggle.setAttribute("aria-pressed", editing ? "true" : "false");
      toggle.setAttribute("aria-label", editing ? "إنهاء ترتيب النوافذ" : "ترتيب النوافذ");
      toggle.title = editing ? "إنهاء ترتيب النوافذ" : "ترتيب النوافذ";
      const span = toggle.querySelector("span");
      if (span) span.textContent = editing ? "تم" : "النوافذ";
    });
    if (hint) hint.hidden = !editing;
    if (editing) {
      applyAllFloats();
      if (infos[0] && infos[0].tools) updateTools(infos[0]);
    }
    if (!editing && drag) endDrag();
  }

  function syncButton() {
    toggleButtons().forEach(function (toggle) {
      toggle.hidden = !infos.length;
    });
    if (!infos.length && editing) setEditing(false);
  }

  function ensureHint() {
    if (hint) return;
    hint = document.createElement("div");
    hint.className = "bg-win-hint";
    hint.hidden = true;
    hint.setAttribute("role", "region");
    hint.setAttribute("aria-label", "وضع ترتيب النوافذ");
    hintText = document.createElement("span");
    hintText.className = "bg-win-hint-text";
    hintText.textContent = "اسحب ⠿ لتحريك النافذة، أو استخدم ↑ ↓ للترتيب.";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "bg-win-hint-btn";
    reset.setAttribute("data-bg-win-reset", "");
    reset.textContent = "إعادة الضبط";
    const done = document.createElement("button");
    done.type = "button";
    done.className = "bg-win-hint-btn is-primary";
    done.setAttribute("data-bg-win-done", "");
    done.textContent = "تم";
    hint.appendChild(hintText);
    hint.appendChild(reset);
    hint.appendChild(done);
    hint.addEventListener("click", function (event) {
      event.stopPropagation();
      const target = event.target.closest("button");
      if (!target) return;
      event.preventDefault();
      if (target.hasAttribute("data-bg-win-reset")) resetLayout();
      else if (target.hasAttribute("data-bg-win-done")) setEditing(false);
    });
    hint.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    document.body.appendChild(hint);
  }

  /* ------------------------------ الترتيب ------------------------------ */

  function moveBy(info, direction) {
    if (!info || stateFor(info.key).mode === "float") return false;
    const list = orderedDockInfos(info.dockKey);
    const index = list.indexOf(info);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return false;
    list.splice(index, 1);
    list.splice(targetIndex, 0, info);
    list.forEach(function (item, order) {
      stateFor(item.key).order = order;
    });
    applyDockOrder(info.dockKey);
    infos.forEach(updateTools);
    queueSave();
    announce(info.title + (direction < 0 ? " إلى أعلى." : " إلى أسفل."));
    return true;
  }

  function reorderTo(info, target, after) {
    if (!info || !target || info === target) return false;
    if (stateFor(info.key).mode === "float" || stateFor(target.key).mode === "float") return false;
    if (info.dockKey !== target.dockKey) return false;
    const list = orderedDockInfos(info.dockKey);
    const from = list.indexOf(info);
    if (from < 0 || list.indexOf(target) < 0) return false;
    list.splice(from, 1);
    let insert = list.indexOf(target);
    if (insert < 0) insert = list.length;
    else if (after) insert += 1;
    if (insert < 0) insert = 0;
    if (insert > list.length) insert = list.length;
    list.splice(insert, 0, info);
    list.forEach(function (item, order) {
      stateFor(item.key).order = order;
    });
    applyDockOrder(info.dockKey);
    infos.forEach(updateTools);
    queueSave();
    return true;
  }

  function announce(message) {
    if (!hint || !hintText) return;
    hintText.textContent = message;
    clearTimeout(hint.__resetTimer);
    hint.__resetTimer = setTimeout(function () {
      if (hintText) hintText.textContent = "اسحب ⠿ لتحريك النافذة، أو استخدم ↑ ↓ للترتيب.";
    }, 2200);
  }

  function resetLayout() {
    clearSavedLayout();
    layout = {};
    if (drag) endDrag();
    infos.forEach(function (info) {
      info.el.classList.remove("bg-window-float");
      restoreStyles(info.el);
      info.el.style.removeProperty("order");
      updateTools(info);
    });
    applyAllFloats();
    applyAllOrders();
    infos.forEach(updateTools);
    announce("تمت إعادة ترتيب النوافذ.");
    if (BG.toast) BG.toast("أُعيد ترتيب نوافذ اللعبة.", "good");
  }

  /* ------------------------------ السحب ------------------------------ */

  function onToolsClick(event) {
    const button = event.target.closest("[data-bg-win-act]");
    if (!button) return;
    const tools = button.closest(".bg-win-tools");
    const panel = tools && tools.parentElement;
    const info = infoFor(panel);
    if (!info) return;
    event.preventDefault();
    event.stopPropagation();
    const act = button.getAttribute("data-bg-win-act");
    if (act === "up" || act === "down") {
      moveBy(info, act === "up" ? -1 : 1);
    } else if (act === "mode") {
      if (stateFor(info.key).mode === "float") {
        applyDock(info);
        queueSave();
        updateTools(info);
        announce(info.title + " أُعيدت إلى مكانها.");
      } else {
        floatPanel(info);
      }
    }
  }

  function onToolsKeydown(event) {
    const key = event.key;
    if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") return;
    const button = event.target.closest('[data-bg-win-act="move"]');
    if (!button) return;
    const tools = button.closest(".bg-win-tools");
    const info = infoFor(tools && tools.parentElement);
    if (!info) return;
    event.preventDefault();
    event.stopPropagation();
    const state = stateFor(info.key);
    if (state.mode === "float") {
      const step = event.shiftKey ? 28 : 8;
      const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
      const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
      setFloatingPosition(info, (state.x || EDGE) + dx, (state.y || EDGE) + dy);
      queueSave();
      return;
    }
    moveBy(info, key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0);
  }

  function onToolsPointerDown(event) {
    event.stopPropagation();
    const button = event.target.closest('[data-bg-win-act="move"]');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    const tools = button.closest(".bg-win-tools");
    const panel = tools && tools.parentElement;
    const info = infoFor(panel);
    if (!info) return;
    const state = stateFor(info.key);
    if (state.mode === "float") {
      zTop += 1;
      panel.style.zIndex = String(zTop);
    }
    const rect = panel.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      info: info,
      button: button,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      offX: event.clientX - rect.left,
      offY: event.clientY - rect.top,
      active: false,
      floating: stateFor(info.key).mode === "float",
      reordered: false,
    };
    button.setPointerCapture(event.pointerId);
    button.addEventListener("pointermove", onDragMove);
    button.addEventListener("pointerup", onDragEnd);
    button.addEventListener("pointercancel", onDragEnd);
    document.body.classList.add("bg-win-dragging");
  }

  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    drag.active = true;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    event.preventDefault();
    const info = drag.info;
    const panel = info.el;
    if (drag.floating || stateFor(info.key).mode === "float") {
      drag.floating = true;
      if (stateFor(info.key).mode !== "float") floatPanel(info, true);
      setFloatingPosition(info, event.clientX - drag.offX, event.clientY - drag.offY);
      return;
    }
    if (Math.abs(dx) > FLOAT_SIDEWAYS) {
      drag.floating = true;
      floatPanel(info, true);
      setFloatingPosition(info, event.clientX - drag.offX, event.clientY - drag.offY);
      return;
    }
    if (Math.abs(dy) < DRAG_THRESHOLD) return;
    const over = document.elementFromPoint(event.clientX, event.clientY);
    const target = over && over.closest ? over.closest(".bg-win-window") : null;
    const targetInfo = infoFor(target);
    if (!targetInfo || targetInfo === info || targetInfo.dockKey !== info.dockKey) return;
    const rect = target.getBoundingClientRect();
    const axis = window.getComputedStyle(info.dock || target).display === "grid" && rect.width > rect.height ? "x" : "y";
    const midpoint = axis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const pointer = axis === "x" ? event.clientX : event.clientY;
    const before = axis === "x" ? pointer < midpoint : pointer < midpoint;
    if (reorderTo(info, targetInfo, !before)) drag.reordered = true;
  }

  function setFloatingPosition(info, x, y) {
    const state = stateFor(info.key);
    if (state.mode !== "float") return;
    const width = state.w || info.el.getBoundingClientRect().width || 320;
    const geometry = floatGeometry(info, { x: x, y: y, w: width });
    state.x = geometry.x;
    state.y = geometry.y;
    state.w = geometry.width;
    info.el.style.setProperty("--bg-win-x", geometry.x + "px");
    info.el.style.setProperty("--bg-win-y", geometry.y + "px");
    info.el.style.setProperty("--bg-win-w", geometry.width + "px");
    info.el.style.zIndex = String(zTop);
  }

  function onDragEnd(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const info = drag.info;
    const reordered = drag.reordered;
    const floating = drag.floating;
    endDrag();
    if (floating) queueSave();
    else if (reordered) queueSave();
    if (info) updateTools(info);
  }

  function endDrag() {
    if (!drag) return;
    const button = drag.button;
    if (button) {
      try { button.releasePointerCapture(drag.pointerId); } catch (err) { /* ignore */ }
      button.removeEventListener("pointermove", onDragMove);
      button.removeEventListener("pointerup", onDragEnd);
      button.removeEventListener("pointercancel", onDragEnd);
    }
    drag = null;
    document.body.classList.remove("bg-win-dragging");
  }

  function floatPanel(info, silent) {
    if (!info) return;
    const state = stateFor(info.key);
    if (state.mode === "float") {
      if (!silent) {
        applyFloat(info);
        queueSave();
        updateTools(info);
      }
      return;
    }
    const rect = info.el.getBoundingClientRect();
    rememberStyles(info.el);
    state.mode = "float";
    state.w = Math.max(MIN_WIDTH, Math.round(rect.width || state.w || 320));
    state.x = Math.round(rect.left || EDGE);
    state.y = Math.round(rect.top || EDGE);
    zTop += 1;
    applyFloat(info);
    applyDockOrder(info.dockKey);
    infos.forEach(updateTools);
    if (!silent) {
      queueSave();
      announce(info.title + " صارت نافذة عائمة.");
    }
  }

  /* ------------------------------ الربط باللعبة ------------------------------ */

  function observe() {
    if (!mount || typeof window.MutationObserver !== "function") return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function (records) {
      for (let i = 0; i < records.length; i++) {
        if (records[i].type === "childList" && (records[i].addedNodes.length || records[i].removedNodes.length)) {
          scheduleEnhance();
          return;
        }
      }
    });
    observer.observe(mount, { childList: true, subtree: true });
  }

  function scheduleEnhance() {
    if (enhanceTimer) return;
    enhanceTimer = setTimeout(function () {
      enhanceTimer = 0;
      enhance();
    }, 80);
  }

  function enhance() {
    if (!mount || !mount.isConnected) return;
    if (observer) observer.disconnect();
    const previous = new Map();
    infos.forEach(function (info) { previous.set(info.key, info); });
    const result = discover();
    const found = result.found || [];
    const nextInfos = [];
    const nextByEl = new WeakMap();

    found.forEach(function (entry) {
      const el = entry.el;
      if (!el || !el.isConnected) return;
      el.classList.add("bg-win-window");
      el.setAttribute("data-bg-win-key", entry.key);
      rememberStyles(el);
      const info = {
        el: el,
        key: entry.key,
        title: entry.title,
        dock: entry.dock,
        dockKey: entry.dockKey,
        seq: entry.seq,
        tools: null,
      };
      nextInfos.push(info);
      nextByEl.set(el, info);
      const old = previous.get(entry.key);
      info.tools = old && old.el === el ? old.tools : null;
      ensureTools(info);
      const state = stateFor(info.key);
      if (state.mode === "float" && floatReady) applyFloat(info);
      else if (state.mode === "float") {
        el.classList.remove("bg-window-float");
      } else {
        el.classList.remove("bg-window-float");
      }
    });

    // تنظيف النوافذ التي اختفت من اللعبة دون المساس ببقية DOM.
    previous.forEach(function (old, key) {
      if (nextInfos.some(function (info) { return info.key === key; })) return;
      if (old.el && old.el.isConnected) {
        old.el.classList.remove("bg-window-float", "bg-win-window");
        old.el.removeAttribute("data-bg-win-key");
        if (old.tools && old.tools.parentNode) old.tools.parentNode.removeChild(old.tools);
        restoreStyles(old.el);
      }
    });

    infos = nextInfos;
    infoByEl = nextByEl;
    applyAllOrders();
    infos.forEach(updateTools);
    syncButton();
    if (!infos.length) setEditing(false);
    observe();
    if (floatReady) {
      infos.forEach(function (info) {
        if (stateFor(info.key).mode === "float") applyFloat(info);
      });
    }
  }

  function attach(nextMount, id) {
    init();
    if (!nextMount) return;
    const view = document.getElementById("gameView");
    const nextId = String(id || (view && view.dataset.game) || "").trim();
    if (mount === nextMount && gameId === nextId) {
      scheduleEnhance();
      return;
    }
    detach();
    mount = nextMount;
    gameId = nextId;
    root = document.getElementById("gameView");
    layout = loadLayout(gameId);
    floatReady = false;
    if (floatTimer) clearTimeout(floatTimer);
    floatTimer = setTimeout(function () {
      floatTimer = 0;
      floatReady = true;
      infos.forEach(function (info) {
        if (stateFor(info.key).mode === "float") applyFloat(info);
      });
      scheduleViewportFix();
    }, FLOAT_DELAY);
    enhance();
    observe();
    scheduleViewportFix();
    syncButton();
  }

  function detach() {
    if (enhanceTimer) {
      clearTimeout(enhanceTimer);
      enhanceTimer = 0;
    }
    if (floatTimer) {
      clearTimeout(floatTimer);
      floatTimer = 0;
    }
    if (saveTimer) {
      saveLayout();
      clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (drag) endDrag();
    editing = false;
    if (root) root.classList.remove("bg-win-edit");
    if (hint) hint.hidden = true;
    infos.forEach(function (info) {
      if (info.tools && info.tools.parentNode) info.tools.parentNode.removeChild(info.tools);
      info.el.classList.remove("bg-window-float", "bg-win-window");
      info.el.removeAttribute("data-bg-win-key");
      restoreStyles(info.el);
    });
    if (mount) {
      Array.prototype.forEach.call(mount.querySelectorAll(".bg-win-tools"), function (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }
    infos = [];
    infoByEl = new WeakMap();
    originalStyles = new WeakMap();
    mount = null;
    gameId = "";
    root = null;
    layout = {};
    floatReady = false;
    toggleButtons().forEach(function (toggle) {
      toggle.hidden = true;
      toggle.setAttribute("aria-pressed", "false");
      const span = toggle.querySelector("span");
      if (span) span.textContent = "النوافذ";
    });
  }

  function refresh() {
    if (!mount) return;
    scheduleEnhance();
  }

  function onGlobalKeydown(event) {
    if (!editing || event.key !== "Escape" || event.defaultPrevented) return;
    if (document.querySelector("dialog[open]")) return;
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (event.target && event.target.isContentEditable)) return;
    event.preventDefault();
    setEditing(false);
  }

  BG.windows = {
    attach: attach,
    detach: detach,
    refresh: refresh,
    reset: resetLayout,
    open: function (on) { setEditing(on !== false); },
    get editing() { return editing; },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
