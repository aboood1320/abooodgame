/* ==========================================================================
   ألعاب الطاولة — تحسينات عامة للموقع
   زر العودة للأعلى + ظل الشريط العلوي عند التمرير
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    const topbar = document.querySelector(".bg-topbar");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bg-to-top";
    button.setAttribute("aria-label", "العودة إلى أعلى الصفحة");
    button.textContent = "↑";
    button.addEventListener("click", () => {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    document.body.appendChild(button);

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const inLibrary = document.body.classList.contains("library-mode");
      button.classList.toggle("show", inLibrary && y > 520);
      if (topbar) topbar.classList.toggle("is-stuck", inLibrary && y > 24);
    }
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
