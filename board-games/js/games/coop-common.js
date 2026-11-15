/* ==========================================================================
   أدوات مشتركة للألعاب التعاونية
   شريط الفريق، أفاتار اللاعبين، الدردشة السريعة، وحركات الفريق.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;

  const U = BG.util;
  const esc = U.escape;

  const EMOTES = ["👍", "🎉", "😅", "🙏", "🔥", "🫶", "🤔", "⚡"];

  const ICONS = {
    explore: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 22l4-10 10-3-4 10z" fill="currentColor" opacity=".82"/><circle cx="16" cy="16" r="2.2" fill="#082028"/></svg>',
    flood: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 21c4-4 8-4 12 0s8 4 12 0 5-3 6-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2 27c4-4 8-4 12 0s8 4 12 0 5-3 6-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M16 4v9M12 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    treasure: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 13h20v13H6z" fill="currentColor" opacity=".9"/><path d="M4 10h24v5H4z" fill="currentColor"/><path d="M14 13h4v7h-4z" fill="#082028" opacity=".65"/><circle cx="16" cy="16" r="1.4" fill="#ffe1a1"/></svg>',
    card: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="5" width="14" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6" y="9" width="14" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><path d="M13 16h4M15 14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    paw: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="11" cy="10" r="3"/><circle cx="21" cy="10" r="3"/><circle cx="7" cy="18" r="3"/><circle cx="25" cy="18" r="3"/><path d="M16 16c5 0 9 4 9 8 0 3-2 5-5 4-2-.6-3-1-4-1s-2 .4-4 1c-3 1-5-1-5-4 0-4 4-8 9-8z"/></svg>',
    eye: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="currentColor"/><circle cx="17.4" cy="14.6" r="1.2" fill="#082028"/></svg>',
    rocket: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c5 3 7 8 7 14l-4 4h-6l-4-4c0-6 2-11 7-14z" fill="currentColor"/><circle cx="16" cy="12" r="3" fill="#082028"/><path d="M9 18l-4 5 6-1M23 18l4 5-6-1M13 22l3 7 3-7" fill="currentColor" opacity=".75"/></svg>',
    heart: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27C8 21 4 17 4 12c0-4 3-7 7-7 2 0 4 1 5 3 1-2 3-3 5-3 4 0 7 3 7 7 0 5-4 9-12 15z" fill="currentColor"/></svg>',
  };

  function avatar(player) {
    return BG.playerProfile.playerHTML(player || {}, "coop-avatar");
  }

  function memberChip(player, current, meta) {
    const role = meta || "";
    return '<span class="coop-member' + (player.index === current ? " is-current" : "") + '">' +
      avatar(player) +
      "<b>" + esc(player.name) + "</b>" +
      (role ? "<small>" + role + "</small>" : "") +
      "</span>";
  }

  function teamHeader(opts) {
    const o = opts || {};
    const members = (o.players || []).map((player) => memberChip(player, o.current, o.meta ? o.meta(player) : "")).join("");
    return '<header class="coop-teambar">' +
      '<div class="coop-brand"><span class="coop-brand-mark" aria-hidden="true">' + (o.icon || "🤝") + "</span>" +
      "<div><strong>" + esc(o.title || "فريق واحد") + "</strong>" +
      "<small>" + esc(o.en || "ONE TEAM · ONE GOAL") + "</small></div></div>" +
      '<div class="coop-teambar-side">' +
      '<span class="coop-team-badge">🤝 <b>فريق واحد</b> · ' + esc(o.goal || "نفوز معًا أو نخسر معًا") + "</span>" +
      (o.chips || "") +
      "</div></header>" +
      (members ? '<div class="coop-teamline" aria-label="أعضاء الفريق">' + members + "</div>" : "");
  }

  function chip(label, value, cls) {
    return '<span class="coop-chip ' + (cls || "") + '">' +
      (label ? "<span>" + esc(label) + "</span>" : "") +
      (value == null ? "" : "<b>" + value + "</b>") +
      "</span>";
  }

  function objectiveCard(label, value, note, cls, progress) {
    return '<div class="coop-objective-card ' + (cls || "") + '">' +
      "<span>" + esc(label) + "</span>" +
      "<strong>" + value + "</strong>" +
      (note ? "<small>" + esc(note) + "</small>" : "") +
      (progress == null ? "" : '<div class="coop-track' + (cls === "is-gold" ? " is-gold" : "") + '" style="--p:' + U.clamp(progress, 0, 100) + '%"><i></i></div>') +
      "</div>";
  }

  function chatDock(label) {
    return '<div class="coop-dock" role="group" aria-label="دردشة سريعة">' +
      '<span class="coop-dock-label">' + esc(label || "دردشة الفريق") + "</span>" +
      EMOTES.map((emoji) => '<button type="button" class="coop-emote" data-coop-emote="' + emoji + '" aria-label="إرسال ' + emoji + '">' + emoji + "</button>").join("") +
      "</div>";
  }

  function bubble(text) {
    let layer = document.getElementById("coopChatLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "coopChatLayer";
      layer.className = "coop-chat-layer";
      layer.setAttribute("aria-live", "polite");
      document.body.appendChild(layer);
    }
    const node = document.createElement("div");
    node.className = "coop-chat-bubble";
    node.textContent = text;
    layer.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateY(-6px)";
      node.style.transition = "opacity .3s ease, transform .3s ease";
      setTimeout(() => node.remove(), 320);
    }, 3200);
    return node;
  }

  function sendChat(api, emoji, name) {
    if (!EMOTES.includes(emoji)) return false;
    const who = String(name || "لاعب").slice(0, 18);
    bubble(emoji + " " + who);
    if (BG.fx) BG.fx.sound("click");
    if (api && api.net && api.net.enabled && BG.net) {
      try {
        const msg = { t: "coop-chat", e: emoji, n: who };
        if (BG.net.isHost) BG.net.broadcast(msg);
        else BG.net.send(msg);
      } catch (err) { /* اللعب المحلي لا يحتاج شبكة */ }
    }
    return true;
  }

  function handleChatClick(event, api, name) {
    const button = event.target && event.target.closest ? event.target.closest("[data-coop-emote]") : null;
    if (!button) return false;
    sendChat(api, button.getAttribute("data-coop-emote"), name);
    return true;
  }

  function listenChat(cleanup) {
    if (!BG.net || typeof BG.net.on !== "function") return function () {};
    const handler = (event) => {
      let data = event && event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (err) { return; }
      }
      if (!data || data.t !== "coop-chat") return;
      const emoji = String(data.e || "");
      if (!EMOTES.includes(emoji)) return;
      bubble(emoji + " " + String(data.n || "زميل").slice(0, 18));
    };
    BG.net.on("message", handler);
    const off = function () {
      try { BG.net.off("message", handler); } catch (err) { /* ignore */ }
    };
    if (Array.isArray(cleanup)) cleanup.push(off);
    return off;
  }

  function canAct(api, player, current, over) {
    if (!player || over || current == null) return false;
    if (api && api.net && api.net.enabled) {
      return api.net.seat === current && !api.net.isCpuSeat(current);
    }
    return !player.isCpu;
  }

  function isOnline(api) {
    return !!(api && api.net && api.net.enabled);
  }

  function teamNote(icon, text, cls) {
    return '<div class="coop-banner ' + (cls || "") + '"><span aria-hidden="true">' + (icon || "🤝") + "</span><span>" + text + "</span></div>";
  }

  function logLine(api, html, kind) {
    if (api && typeof api.log === "function") api.log(html, kind || "");
  }

  BG.coop = {
    EMOTES,
    ICONS,
    avatar,
    memberChip,
    teamHeader,
    chip,
    objectiveCard,
    chatDock,
    bubble,
    sendChat,
    handleChatClick,
    listenChat,
    canAct,
    isOnline,
    teamNote,
    logLine,
    esc,
  };
})();
