/* ==========================================================================
   ألعاب الطاولة — النواة المشتركة
   أدوات مساعدة، نوافذ، دليل القواعد، ولوحة المعلومات السرّية
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});
  BG.games = BG.games || [];
  BG.byId = BG.byId || {};

  BG.register = function (def) {
    if (!def || !def.id) throw new Error("لعبة بدون معرّف");
    if (BG.byId[def.id]) throw new Error("لعبة مكررة: " + def.id);
    BG.byId[def.id] = def;
    BG.games.push(def);
  };

  /* ------------------------------ أدوات عامة ------------------------------ */

  const U = (BG.util = {
    escape(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    },

    randInt(max) {
      return Math.floor(Math.random() * max);
    },

    pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },

    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },

    roll(sides) {
      return 1 + Math.floor(Math.random() * (sides || 6));
    },

    rollDice(count, sides) {
      const out = [];
      for (let i = 0; i < (count || 1); i++) out.push(U.roll(sides || 6));
      return out;
    },

    sum(arr) {
      return arr.reduce((a, b) => a + b, 0);
    },

    unique(arr) {
      return [...new Set(arr)];
    },

    arabicNumber(n) {
      return Number(n).toLocaleString("ar-EG");
    },

    money(n) {
      return "$" + Number(n).toLocaleString("en-US");
    },

    order(n) {
      const names = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];
      return names[n] || String(n + 1);
    },

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /** فواصل أسطر عربية آمنة لـ innerHTML */
    lines(arr) {
      return arr.map((line) => "<p>" + line + "</p>").join("");
    },

    /** تنظيف نص عربي للمقارنة (همزات، تشكيل، تاء مربوطة) */
    normalizeArabic(text) {
      return String(text || "")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, "")
        .trim();
    },
  });

  /* ------------------------------ عناصر DOM ------------------------------ */

  BG.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === "class") node.className = value;
        else if (key === "html") node.innerHTML = value;
        else if (key === "text") node.textContent = value;
        else if (key === "dataset") {
          for (const [dk, dv] of Object.entries(value)) node.dataset[dk] = dv;
        } else if (key === "style" && typeof value === "object") {
          for (const [sk, sv] of Object.entries(value)) node.style.setProperty(sk, sv);
        } else if (key.startsWith("on") && typeof value === "function") {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
          node.setAttribute(key, "");
        } else {
          node.setAttribute(key, value);
        }
      }
    }
    if (children != null) {
      const list = Array.isArray(children) ? children : [children];
      for (const child of list) {
        if (child == null) continue;
        node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
      }
    }
    return node;
  };

  BG.clear = function (node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  };

  /* ------------------------------ التنبيهات ------------------------------ */

  let toastTimer = null;
  BG.toast = function (message, kind) {
    let box = document.getElementById("bgToast");
    if (!box) {
      box = BG.el("div", { id: "bgToast", class: "bg-toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.toggle("warn", kind === "warn");
    box.classList.toggle("good", kind === "good");
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 2600);
  };

  /* ------------------------------ النوافذ ------------------------------ */

  BG.openDialog = function (opts) {
    const options = Object.assign({ title: "", body: "", actions: [], className: "" }, opts || {});
    const dialog = BG.el("dialog", { class: "bg-dialog " + options.className });
    const head = BG.el("div", { class: "bg-dialog-head" }, [
      BG.el("h2", { text: options.title }),
      BG.el("button", { type: "button", class: "bg-x", "aria-label": "إغلاق", text: "✕" }),
    ]);

    const body = BG.el("div", { class: "bg-dialog-body" });
    if (typeof options.body === "string") body.innerHTML = options.body;
    else if (options.body) body.appendChild(options.body);

    const foot = BG.el("div", { class: "bg-dialog-foot" });

    let settled = false;
    let resolveValue;
    const promise = new Promise((resolve) => { resolveValue = resolve; });
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (typeof options.onClose === "function") options.onClose(value);
      dialog.remove();
      resolveValue(value);
    };
    const close = (value) => {
      if (!dialog.open) return;
      const finalValue = value == null ? "" : String(value);
      dialog.close(finalValue);
      // بعض المتصفحات/البيئات لا تطلق حدث close عند الإغلاق البرمجي،
      // لذا نُنهي النافذة فورًا. الحدث الأصلي يُهمَل بفضل حارس settled.
      finish(finalValue);
    };

    for (const action of options.actions) {
      const btn = BG.el("button", {
        type: "button",
        class: "bg-btn" + (action.primary ? " primary" : "") + (action.danger ? " danger" : ""),
        text: action.label,
      });
      btn.addEventListener("click", () => {
        if (typeof action.onClick === "function") action.onClick({ close, dialog });
        else close(action.value == null ? action.label : action.value);
      });
      foot.appendChild(btn);
    }

    head.querySelector(".bg-x").addEventListener("click", () => close(""));
    dialog.appendChild(head);
    dialog.appendChild(body);
    if (options.actions.length) dialog.appendChild(foot);
    document.body.appendChild(dialog);

    dialog.addEventListener("close", () => finish(dialog.returnValue));
    dialog.showModal();
    return { dialog, close, promise, body, foot };
  };

  BG.confirm = function (title, body, yesLabel, noLabel) {
    return BG.openDialog({
      title,
      body: typeof body === "string" ? "<p>" + body + "</p>" : body,
      actions: [
        { label: noLabel || "إلغاء", value: "no" },
        { label: yesLabel || "تأكيد", value: "yes", primary: true },
      ],
    }).promise.then((value) => value === "yes");
  };

  BG.alert = function (title, body, label) {
    return BG.openDialog({
      title,
      body: typeof body === "string" ? "<p>" + body + "</p>" : body,
      actions: [{ label: label || "حسنًا", value: "ok", primary: true }],
    }).promise;
  };

  /* ------------------------------ دليل القواعد ------------------------------ */

  BG.openRules = function (game, options) {
    let rules = game.rules || {};
    if (typeof game.rulesFor === "function") {
      try {
        const resolved = game.rulesFor(Object.assign({}, (game.options && game.options.defaults) || {}, options || {}));
        if (resolved && typeof resolved === "object") rules = resolved;
      } catch (err) {
        rules = game.rules || {};
      }
    }
    const parts = [];

    const section = (title, content) => {
      if (!content) return;
      parts.push('<section class="rules-sec"><h3>' + U.escape(title) + "</h3>" + content + "</section>");
    };

    if (rules.goal) {
      section("الهدف من اللعبة", "<p>" + rules.goal + "</p>");
    }

    const facts = [];
    if (game.players) facts.push(["عدد اللاعبين", game.players]);
    if (game.duration) facts.push(["مدة اللعبة", game.duration]);
    if (game.complexity) facts.push(["مستوى الصعوبة", game.complexity]);
    if (rules.facts) facts.push(...rules.facts);
    if (facts.length) {
      section(
        "معلومات سريعة",
        '<dl class="rules-facts">' +
          facts.map(([k, v]) => "<dt>" + U.escape(k) + "</dt><dd>" + U.escape(v) + "</dd>").join("") +
          "</dl>"
      );
    }

    if (rules.components && rules.components.length) {
      section(
        "المكوّنات",
        '<ul class="rules-list">' + rules.components.map((x) => "<li>" + x + "</li>").join("") + "</ul>"
      );
    }

    if (rules.setup && rules.setup.length) {
      section(
        "الإعداد",
        '<ol class="rules-list">' + rules.setup.map((x) => "<li>" + x + "</li>").join("") + "</ol>"
      );
    }

    if (rules.steps && rules.steps.length) {
      section(
        "سير الدور خطوة بخطوة",
        '<ol class="rules-list">' + rules.steps.map((x) => "<li>" + x + "</li>").join("") + "</ol>"
      );
    }

    if (rules.winning) {
      section("طريقة الفوز", "<p>" + rules.winning + "</p>");
    }

    if (rules.notes && rules.notes.length) {
      section(
        "ملاحظات واختلافات النسخة الرقمية",
        '<ul class="rules-list">' + rules.notes.map((x) => "<li>" + x + "</li>").join("") + "</ul>"
      );
    }

    BG.openDialog({
      title: "قواعد " + game.name + (rules.variantName ? " — " + rules.variantName : ""),
      className: "bg-rules-dialog",
      body: '<div class="bg-rules">' + parts.join("") + "</div>",
      actions: [{ label: "فهمت", value: "ok", primary: true }],
    });
  };

  /* ------------------------------ المعلومات السرّية ------------------------------ */

  const autoDismissed = new Set();

  document.addEventListener("bgprefschange", () => {
    autoDismissed.clear();
  });

  /**
   * لوحة معلومات سرّية. عند تفعيل «إخفاء المعلومات السرية» من الإعدادات الرئيسية
   * تظهر أزرار إظهار/إخفاء. وعند تعطيله تُعرض المعلومات مباشرة بلا أي زر إخفاء.
   * @param {{title:string, hint?:string, owner?:string, render:Function, open?:boolean, autoKey?:string}} opts
   */
  BG.secretPanel = function (opts) {
    const panel = BG.el("section", { class: "secret-panel" });
    const autoKey = opts.autoKey ? String(opts.autoKey) : "";
    const head = BG.el("div", { class: "secret-head" }, [
      BG.el("div", {}, [
        BG.el("strong", { class: "secret-title", text: opts.title || "معلوماتك السرّية" }),
        BG.el("span", { class: "secret-owner", text: opts.owner || "" }),
      ]),
      BG.el("button", {
        type: "button",
        class: "bg-btn small secret-toggle",
        text: "👁 إظهار",
        "aria-expanded": "false",
      }),
    ]);
    const body = BG.el("div", { class: "secret-body", "aria-live": "polite" });
    const hint = BG.el("p", { class: "secret-hint", text: opts.hint || "المحتوى مخفي. تأكد أن الجهاز أمام صاحبه فقط ثم اضغط «إظهار»." });
    panel.appendChild(head);
    panel.appendChild(hint);
    panel.appendChild(body);

    const btn = head.querySelector("button");
    let visible = false;

    function render() {
      if (!visible) return;
      body.innerHTML = typeof opts.render === "function" ? opts.render() : String(opts.render || "");
    }

    function setVisible(next, silent) {
      const canHide = BG.prefs.hideSecrets;
      const target = canHide ? !!next : true;
      const changed = visible !== target;
      visible = target;
      panel.classList.toggle("revealed", visible);
      panel.classList.toggle("open", visible);
      panel.classList.toggle("is-static", !canHide);
      btn.hidden = !canHide;
      btn.textContent = visible ? "🙈 إخفاء" : "👁 إظهار";
      btn.setAttribute("aria-pressed", visible ? "true" : "false");
      btn.setAttribute("aria-expanded", visible ? "true" : "false");
      hint.hidden = visible || !canHide;
      if (visible) render();
      else body.innerHTML = "";
      if (changed && autoKey && !silent) {
        if (visible) autoDismissed.delete(autoKey);
        else autoDismissed.add(autoKey);
      }
      if (changed && visible && !silent && BG.fx) BG.fx.sound("reveal");
      if (changed && !silent && typeof opts.onToggle === "function") opts.onToggle(visible);
    }

    function onPrefsChange() {
      if (!panel.isConnected) {
        document.removeEventListener("bgprefschange", onPrefsChange);
        return;
      }
      // عند تفعيل الإخفاء نبدأ مخفيين، وعند تعطيله نعرض المحتوى مباشرة.
      if (BG.prefs.hideSecrets) setVisible(false, true);
      else setVisible(true, true);
    }

    btn.addEventListener("click", () => setVisible(!visible));
    document.addEventListener("bgprefschange", onPrefsChange);
    setVisible(
      !BG.prefs.hideSecrets || (Boolean(opts.open) && (!autoKey || !autoDismissed.has(autoKey))),
      true
    );

    return {
      el: panel,
      hide(silent) { setVisible(false, silent); },
      show(silent) { setVisible(true, silent); },
      refresh() { render(); },
      isVisible() { return visible; },
      setOwner(name) {
        head.querySelector(".secret-owner").textContent = name || "";
        if (BG.prefs.hideSecrets) setVisible(false, true);
        else render();
      },
      setTitle(title) {
        head.querySelector(".secret-title").textContent = title;
      },
    };
  };

  /** نافذة كشف سرّي لمرة واحدة (مثل بطاقة يُظهرها لاعب آخر في كلودو) */
  BG.revealSecret = function (opts) {
    const o = Object.assign({ title: "معلومات سرّية", hint: "", content: "", owner: "" }, opts || {});
    const wrap = BG.el("div", { class: "reveal-wrap" });
    const inner = BG.el("div", { class: "reveal-locked" }, [
      BG.el("div", { class: "reveal-lock", text: "🔒" }),
      BG.el("p", { text: o.hint || "اضغط على الزر لإظهار المعلومات. أغلق النافذة بعد الانتهاء." }),
      BG.el("button", { type: "button", class: "bg-btn primary", text: "👁 إظهار المعلومات" }),
    ]);
    wrap.appendChild(inner);

    const dialog = BG.openDialog({
      title: o.title,
      body: wrap,
      actions: [{ label: "تم — إخفاء", value: "done", primary: true }],
    });

    inner.querySelector("button").addEventListener("click", () => {
      inner.remove();
      const revealed = BG.el("div", { class: "reveal-content", html: o.content });
      wrap.appendChild(revealed);
      if (BG.fx) BG.fx.sound("reveal");
    });

    return dialog.promise;
  };

  /* ------------------------------ بطاقات اللاعبين ------------------------------ */

  BG.playerBadge = function (name, index, extra) {
    return BG.el("span", { class: "pbadge p" + (index % 6) + (extra ? " " + extra : "") }, [
      BG.el("span", { class: "pdot", text: String(index + 1) }),
      BG.el("span", { text: name }),
    ]);
  };

  BG.playersStrip = function (players, active, metaFn) {
    const strip = BG.el("div", { class: "players-strip" });
    players.forEach((p, i) => {
      const item = BG.el("div", { class: "pstrip p" + (i % 6) + (i === active ? " active" : "") });
      item.appendChild(BG.el("span", { class: "pdot", text: String(i + 1) }));
      item.appendChild(BG.el("span", { class: "pname", text: p.name }));
      if (metaFn) {
        const meta = metaFn(p, i);
        if (meta) item.appendChild(BG.el("span", { class: "pmeta", html: meta }));
      }
      strip.appendChild(item);
    });
    return strip;
  };

  /* ------------------------------ النرد ------------------------------ */

  BG.dieFace = function (value, extraClass) {
    const faces = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    };
    const dots = faces[value] || [];
    const die = BG.el("span", { class: "die" + (extraClass ? " " + extraClass : ""), "aria-label": "نرد " + value });
    for (let i = 0; i < 9; i++) {
      die.appendChild(BG.el("span", { class: "die-cell" + (dots.includes(i) ? " on" : "") }));
    }
    return die;
  };

  /* ------------------------------ الشبكة ------------------------------ */

  /**
   * تحويل حالة اللعبة إلى JSON آمن مع الحفاظ على Map و Set.
   * يُستخدم لتبادل الحالة بين الأجهزة دون كسر أنواع البيانات.
   */
  const codec = (BG.netCodec = {
    encode(value) {
      if (value === undefined) return null;
      if (value === null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
      if (value instanceof Date) return { $date: value.toISOString() };
      if (value instanceof Map) {
        return { $map: Array.from(value.entries()).map(([key, val]) => [key, codec.encode(val)]) };
      }
      if (value instanceof Set) return { $set: Array.from(value.values()).map((item) => codec.encode(item)) };
      if (Array.isArray(value)) return value.map((item) => codec.encode(item));
      if (typeof value === "object") {
        const out = {};
        Object.keys(value).forEach((key) => {
          const item = value[key];
          if (typeof item === "function" || item === undefined) return;
          out[key] = codec.encode(item);
        });
        return out;
      }
      return null;
    },
    decode(value) {
      if (value === null || value === undefined) return value;
      if (typeof value !== "object") return value;
      if (Array.isArray(value)) return value.map((item) => codec.decode(item));
      if (value.$map && Array.isArray(value.$map)) {
        const map = new Map();
        value.$map.forEach((pair) => {
          if (!Array.isArray(pair)) return;
          map.set(pair[0], codec.decode(pair[1]));
        });
        return map;
      }
      if (value.$set && Array.isArray(value.$set)) {
        return new Set(value.$set.map((item) => codec.decode(item)));
      }
      if (value.$date) return new Date(value.$date);
      const out = {};
      Object.keys(value).forEach((key) => { out[key] = codec.decode(value[key]); });
      return out;
    },
  });

  BG.closeDialogs = function () {
    document.querySelectorAll("dialog[open]").forEach((dialog) => {
      try { dialog.close(""); } catch (err) { /* ignore */ }
      try { dialog.remove(); } catch (err) { /* ignore */ }
    });
  };

  /* ------------------------------ التخزين ------------------------------ */

  BG.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem("bg." + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem("bg." + key, JSON.stringify(value)); } catch (err) { /* ignore */ }
    },
  };

  /* ------------------------------ التفضيلات العامة ------------------------------ */

  const PREFS_KEY = "prefs.v1";
  const PREF_DEFAULTS = { hideSecrets: false };
  const storedPrefs = BG.store.get(PREFS_KEY, {}) || {};
  const prefs = Object.assign({}, PREF_DEFAULTS, storedPrefs);
  // ترحيل الإعداد القديم: من كان يفضّل الإخفاء التلقائي يبدأ بخاصية الإخفاء مفعّلة.
  if (!Object.prototype.hasOwnProperty.call(storedPrefs, "hideSecrets")) {
    prefs.hideSecrets = storedPrefs.autoReveal === false;
  } else {
    prefs.hideSecrets = prefs.hideSecrets === true;
  }
  delete prefs.autoReveal;

  BG.prefs = {
    get hideSecrets() { return prefs.hideSecrets === true; },
    setHideSecrets(on) {
      prefs.hideSecrets = !!on;
      BG.store.set(PREFS_KEY, Object.assign({}, prefs));
      document.dispatchEvent(new CustomEvent("bgprefschange", { detail: Object.assign({}, prefs) }));
      return prefs.hideSecrets;
    },
    get all() { return Object.assign({}, prefs); },
  };
})();
