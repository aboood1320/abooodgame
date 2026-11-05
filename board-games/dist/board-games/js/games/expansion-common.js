/* ==========================================================================
   أدوات مشتركة للألعاب المضافة في 1.3.0
   أرقام عربية، فحص الأدوار المحلية/الشبكية، وبناء اللاعبين.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;

  const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const XG = (BG.xg = {
    ar(value) {
      return String(value == null ? "" : value).replace(/[0-9]/g, (d) => AR[Number(d)]);
    },

    esc(value) {
      return BG.util.escape(value);
    },

    /** هل يستطيع اللاعب البشري المحلي التصرف الآن؟ */
    canAct(api, state, current, over) {
      if (!state || over || current == null) return false;
      const player = state.players[current];
      if (!player) return false;
      if (api && api.net && api.net.enabled) {
        return api.net.seat === current && !api.net.isCpuSeat(current);
      }
      return !player.isCpu;
    },

    /** هل الدور الحالي لكمبيوتر يجب أن يديره هذا الجهاز؟ */
    cpuTurn(api, state, current) {
      const player = state && state.players && state.players[current];
      return !!player && player.isCpu && BG.ai.autoAllowed(api, player);
    },

    players(api, count, colors) {
      return (api.players || []).slice(0, count).map((player, index) => ({
        index,
        name: player.name || "اللاعب " + (index + 1),
        color: (colors && colors[index]) || "#d9a94e",
        type: player.type === "cpu" ? "cpu" : "human",
        level: BG.ai.level(player.level),
        isCpu: BG.ai.isCpu(player),
      }));
    },

    /** ترتيب نهائي موحّد لشاشة النهاية */
    standings(players, scoreOf, detailOf) {
      return players
        .map((player) => ({
          name: player.name,
          value: scoreOf(player),
          detail: detailOf ? detailOf(player) : "",
        }))
        .sort((a, b) => b.value - a.value);
    },

    /** شريط عنوان موحّد */
    bar(title, subtitle, extras) {
      return (
        '<div class="xg-bar"><div class="xg-bar-main"><h2>' +
        XG.esc(title) +
        "</h2>" +
        (subtitle ? '<p class="xg-sub">' + subtitle + "</p>" : "") +
        '</div><div class="xg-bar-side">' +
        (extras || "") +
        "</div></div>"
      );
    },

    /** رقاقة معلومات */
    chip(label, value, cls) {
      return (
        '<span class="xg-chip ' +
        (cls || "") +
        '">' +
        (label ? "<span>" + label + "</span>" : "") +
        (value == null ? "" : "<b>" + value + "</b>") +
        "</span>"
      );
    },
  });
})();
