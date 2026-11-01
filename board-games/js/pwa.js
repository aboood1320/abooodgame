/* ==========================================================================
   ألعاب الطاولة — تثبيت التطبيق والعمل دون اتصال
   تسجيل عامل الخدمة، زر التثبيت، وإرشادات iOS.
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});
  const DISMISS_KEY = "pwa.dismissedAt";
  const DISMISS_DAYS = 10;

  let deferredPrompt = null;
  let updateReady = false;
  let installed = false;

  function button() {
    return document.getElementById("btnInstall");
  }

  function standalone() {
    try {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.navigator.standalone === true
      );
    } catch (err) {
      return false;
    }
  }

  function isIos() {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  function isSafari() {
    const ua = navigator.userAgent || "";
    return /safari/i.test(ua) && !/chrome|crios|fxios|edgios|opios|android/i.test(ua);
  }

  function dismissedRecently() {
    try {
      const stamp = Number(localStorage.getItem(DISMISS_KEY)) || 0;
      return stamp > 0 && Date.now() - stamp < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (err) {
      return false;
    }
  }

  function dismissForNow() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (err) { /* تجاهل */ }
  }

  function canInstall() {
    if (installed || standalone()) return false;
    if (deferredPrompt) return true;
    return isIos() && isSafari() && !dismissedRecently();
  }

  function syncButton() {
    const btn = button();
    if (!btn) return;
    const show = canInstall();
    btn.hidden = !show;
    btn.classList.toggle("is-ready", !!deferredPrompt);
  }

  function iosInstructions() {
    const steps =
      "<ol class=\"install-steps\">" +
      "<li>افتح التطبيق في متصفح <strong>Safari</strong> على جهاز iPhone أو iPad.</li>" +
      "<li>اضغط زر <strong>المشاركة</strong> في شريط المتصفح (المربع مع السهم).</li>" +
      "<li>اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> ثم <strong>«إضافة»</strong>.</li>" +
      "<li>افتح الأيقونة الجديدة وستعمل اللعبة بملء الشاشة ودون اتصال بعد أول زيارة.</li>" +
      "</ol>" +
      "<p class=\"install-note\">لا يوفّر Safari على iOS نافذة تثبيت تلقائية، لذلك تتم الإضافة من قائمة المشاركة.</p>";
    if (BG.openDialog) {
      BG.openDialog({
        title: "تثبيت ألعاب الطاولة على iOS",
        body: steps,
        actions: [{ label: "حسنًا", value: "ok", primary: true }],
        className: "install-dialog",
      });
    } else if (BG.toast) {
      BG.toast("أضف التطبيق من قائمة المشاركة في Safari.", "warn");
    }
    dismissForNow();
  }

  async function requestInstall() {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      syncButton();
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === "dismissed") dismissForNow();
      } catch (err) { /* تجاهل */ }
      return;
    }
    if (isIos() && isSafari()) {
      iosInstructions();
      return;
    }
    if (BG.toast) {
      BG.toast("افتح قائمة المتصفح ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».", "warn");
    }
  }

  /* ------------------------------ عامل الخدمة ------------------------------ */

  function canUseServiceWorker() {
    if (new URLSearchParams(location.search).has("nosw")) return false;
    return "serviceWorker" in navigator && /^https?:$/.test(location.protocol);
  }

  function announceUpdate(registration) {
    if (updateReady || !registration) return;
    updateReady = true;
    if (BG.toast) BG.toast("تحديث جديد جاهز — سيُطبَّق عند إعادة فتح اللعبة.", "good");
  }

  function watchWorker(registration) {
    if (!registration) return;
    if (registration.waiting && navigator.serviceWorker.controller) announceUpdate(registration);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) announceUpdate(registration);
      });
    });
  }

  function registerServiceWorker() {
    if (!canUseServiceWorker()) return;
    navigator.serviceWorker
      .register("sw.js", { scope: "./", updateViaCache: "none" })
      .then((registration) => {
        watchWorker(registration);
        if (registration.update) registration.update().catch(() => {});
      })
      .catch(() => {
        /* لا نُزعج اللاعب إذا منع المتصفح التخزين المؤقت — اللعبة تعمل عبر الشبكة. */
      });
  }

  /* ------------------------------ الربط ------------------------------ */

  function bind() {
    const btn = button();
    if (btn) {
      btn.addEventListener("click", requestInstall);
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      try { localStorage.removeItem(DISMISS_KEY); } catch (err) { /* تجاهل */ }
      syncButton();
    });

    window.addEventListener("appinstalled", () => {
      installed = true;
      deferredPrompt = null;
      syncButton();
      if (BG.toast) BG.toast("تم تثبيت ألعاب الطاولة على جهازك 🎉", "good");
    });

    const media = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    if (media && media.addEventListener) media.addEventListener("change", syncButton);

    window.addEventListener("online", () => {
      if (BG.toast) BG.toast("عاد الاتصال بالإنترنت.", "good");
    });
    window.addEventListener("offline", () => {
      if (BG.toast) BG.toast("أنت دون اتصال — اللعب المحلي يعمل كالمعتاد.", "warn");
    });

    syncButton();
    window.setTimeout(syncButton, 1200);
  }

  BG.pwa = {
    get available() { return canInstall(); },
    get deferred() { return !!deferredPrompt; },
    prompt: requestInstall,
    sync: syncButton,
    get installed() { return installed || standalone(); },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }
})();
