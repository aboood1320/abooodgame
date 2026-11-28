/* ==========================================================================
   طاولة ألعاب الورق — مقاعد اللاعبين حول الطاولة
   طبقة مشتركة خارج جذر اللعبة، لذلك تبقى المقاعد ثابتة حتى لو أعادت اللعبة
   رسم محتواها بالكامل. لكل لاعب مقعد على جهة من الطاولة مع أفاتاره.
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});

  /* ألعاب الورق التي تحصل على الطاولة المشتركة.
     أونو مستثنى لأن لديه طاولة ومقاعد خاصة به، وقد رُبطت أفاتاراته هناك. */
  const GAME_IDS = {
    "waraq": 1,
    "love-letter": 1,
    "coup": 1,
    "for-sale": 1,
    "no-thanks": 1,
    "skull": 1,
    "the-mind": 1,
    "the-crew": 1,
    "hanabi": 1,
    "dominion": 1,
    "seven-wonders": 1,
    "wingspan": 1,
    "terraforming-mars": 1,
    "codenames": 1,
    "kootbositta": 1,
    "rummikub": 1,
    "splendor": 1,
  };

  const WIDE_QUERY = "(min-width: 1120px)";
  const SIDES = ["top", "left", "right", "bottom"];

  let view = null;

  function enabled(game) {
    return !!(game && GAME_IDS[game.id]);
  }

  function isWide() {
    try {
      return window.matchMedia(WIDE_QUERY).matches;
    } catch (err) {
      return (window.innerWidth || 0) >= 1120;
    }
  }

  function sideForAngle(angle) {
    const a = ((Number(angle) || 0) % 360 + 360) % 360;
    if (a > 45 && a < 135) return "bottom";
    if (a >= 135 && a <= 225) return "left";
    if (a > 225 && a < 315) return "top";
    return "right";
  }

  /* توزيع المقاعد: اللاعب المحلي في الأسفل، والباقي حول الطاولة باتجاه عقارب الساعة.
     في الشاشات الضيقة يصعد الجميع إلى شريط علوي مختصر. */
  function sidesFor(count, localIndex, wide) {
    const sides = new Array(count);
    if (!count) return sides;

    if (!wide) {
      for (let i = 0; i < count; i++) {
        sides[i] = i === localIndex ? "bottom" : "top";
      }
      return sides;
    }

    if (localIndex < 0 || localIndex >= count) {
      for (let i = 0; i < count; i++) {
        sides[i] = sideForAngle(-90 + (360 / count) * i);
      }
      return sides;
    }

    sides[localIndex] = "bottom";
    const others = [];
    for (let i = 0; i < count; i++) {
      if (i !== localIndex) others.push(i);
    }
    const step = 360 / count;
    others.forEach((index, order) => {
      sides[index] = sideForAngle(90 + step * (order + 1));
    });
    return sides;
  }

  function firstHumanIndex(roster) {
    return (roster || []).findIndex((player) => player && !player.isCpu && player.type !== "cpu");
  }

  function resolveLocalIndex(roster, netCtx) {
    if (netCtx && netCtx.spectate) return -1;
    if (netCtx && Number.isInteger(netCtx.seat) && netCtx.seat >= 0 && netCtx.seat < roster.length) {
      return netCtx.seat;
    }
    return firstHumanIndex(roster);
  }

  function seatName(player, index) {
    const name = player && player.name ? String(player.name).trim() : "";
    if (name) return name;
    const cpu = !!(player && (player.isCpu || player.type === "cpu"));
    return (cpu ? "الكمبيوتر " : "اللاعب ") + (index + 1);
  }

  function seatNode(player, index) {
    const item = Object.assign({}, player || {}, { index });
    const local = !!view && index === view.localIndex;
    const cpu = !!(player && (player.isCpu || player.type === "cpu"));
    const node = BG.el("div", {
      class: "ct-seat" + (local ? " is-you" : "") + (cpu ? " is-cpu" : ""),
      dataset: { seat: String(index) },
      title: seatName(player, index),
    });

    const profile = (player && player.profile) || {};
    const color = (player && (player.profileColor || profile.color)) ||
      BG.playerProfile.defaultFor(index, cpu).color;
    node.style.setProperty("--ct-seat-color", color);

    const avatar = BG.el("span", {
      class: "ct-seat-avatar",
      html: BG.playerProfile.playerHTML(item, "ct-seat-face"),
    });
    const copy = BG.el("span", { class: "ct-seat-copy" });
    copy.appendChild(BG.el("strong", { text: seatName(player, index) }));
    copy.appendChild(BG.el("small", { text: local ? "أنت" : cpu ? "كمبيوتر" : "لاعب" }));

    node.appendChild(avatar);
    node.appendChild(copy);
    return node;
  }

  function render(roster) {
    if (!view) return;
    if (Array.isArray(roster)) view.roster = roster.slice();

    const wide = isWide();
    view.wide = wide;
    view.wrapper.classList.toggle("is-compact", !wide);

    const count = view.roster.length;
    const sides = sidesFor(count, view.localIndex, wide);
    const groups = { top: [], left: [], right: [], bottom: [] };

    view.roster.forEach((player, index) => {
      const side = sides[index] || "top";
      groups[side].push(seatNode(player, index));
    });

    SIDES.forEach((side) => {
      const rail = view.rails[side];
      BG.clear(rail);
      groups[side].forEach((node) => rail.appendChild(node));
      rail.hidden = groups[side].length === 0;
      rail.setAttribute("aria-hidden", "true");
    });

    view.wrapper.dataset.seats = String(count);
  }

  function build(game, mount, roster, netCtx) {
    destroy();

    const wrapper = BG.el("div", {
      class: "card-table",
      dataset: { cardTable: game.id },
    });
    wrapper.style.setProperty("--ct-accent", game.accent || "#d8a85a");

    const top = BG.el("div", { class: "ct-rail ct-rail-top" });
    const left = BG.el("div", { class: "ct-rail ct-rail-left" });
    const right = BG.el("div", { class: "ct-rail ct-rail-right" });
    const bottom = BG.el("div", { class: "ct-rail ct-rail-bottom" });
    const core = BG.el("div", { class: "ct-core" });
    const middle = BG.el("div", { class: "ct-middle" });

    core.appendChild(mount);
    middle.appendChild(left);
    middle.appendChild(core);
    middle.appendChild(right);
    wrapper.appendChild(top);
    wrapper.appendChild(middle);
    wrapper.appendChild(bottom);

    const list = Array.isArray(roster) ? roster.slice() : [];
    view = {
      game: game,
      wrapper: wrapper,
      rails: { top: top, left: left, right: right, bottom: bottom },
      core: core,
      middle: middle,
      roster: list,
      localIndex: resolveLocalIndex(list, netCtx),
      wide: isWide(),
    };

    wrapper.classList.toggle("is-compact", !view.wide);
    render();
    return wrapper;
  }

  function setRoster(roster) {
    if (!view || !Array.isArray(roster)) return;
    view.roster = roster.slice();
    render();
  }

  function setLocalSeat(index) {
    if (!view) return;
    const seat = Number(index);
    if (Number.isInteger(seat) && seat >= 0 && seat < view.roster.length) {
      view.localIndex = seat;
      render();
    } else if (seat === -1) {
      view.localIndex = -1;
      render();
    }
  }

  function syncLayout() {
    if (!view) return;
    if (isWide() !== view.wide) render();
  }

  function destroy() {
    view = null;
  }

  BG.cardTable = {
    enabled: enabled,
    build: build,
    render: render,
    setRoster: setRoster,
    setLocalSeat: setLocalSeat,
    syncLayout: syncLayout,
    destroy: destroy,
    get active() {
      return !!view;
    },
  };
})();
