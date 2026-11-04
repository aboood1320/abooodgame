/* ==========================================================================
   نواة غرف «الوضع المدرسي» — تمرير رسائل اللعب عبر HTTPS عادي
   ------------------------------------------------------------------------
   لماذا؟ أجهزة المدارس غالبًا تحجب WebRTC وخوادم الإشارات الخارجية
   (PeerJS) والمنافذ غير المعتادة. هذا الوضع لا يحتاج إلا إلى أن يفتح الموقع
   نفسه: كل شيء طلبات POST إلى /api/relay على نفس العنوان.

   النواة مستقلة عن التخزين: تعمل على Netlify Blobs في الإنتاج
   وعلى ذاكرة الخادم المحلي (server.js) أثناء التطوير.

   واجهة التخزين: get(key) / set(key, value) / del(key) / list(prefix)
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STALE_MS = 35000;      // لاعب لم يُسمع منه خلال هذه المدة يُعدّ منقطعًا
const ROOM_STALE_MS = 90000; // غرفة مضيفها صامت هذه المدة تُعدّ ميتة وقابلة لإعادة الاستخدام
const MAX_PEERS = 12;
const MAX_MSG = 700000;      // أقصى حجم رسالة تمرير (حرفًا)
const SWEEP_EVERY_MS = 9000;
const TOUCH_EVERY_MS = 2500;

let seq = 0;

const now = () => Date.now();
const pad = (n, len) => String(n).padStart(len, "0");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanName(value, fallback) {
  const text = String(value == null ? "" : value).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 18);
  return text || fallback;
}

function createRelay(store) {
  /* ------------------------------ صندوق الوارد ------------------------------ */

  async function push(sid, msg) {
    const key = "in/" + sid + "/" + pad(now(), 14) + "-" + pad(++seq % 10000, 4) + "-" + crypto.randomBytes(2).toString("hex");
    await store.set(key, msg);
  }

  async function clearInbox(sid) {
    const keys = await store.list("in/" + sid + "/");
    await Promise.all(keys.map((key) => store.del(key)));
  }

  /* ------------------------------ الأعضاء والغرف ------------------------------ */

  async function members(code) {
    const keys = await store.list("mem/" + code + "/");
    const found = await Promise.all(keys.map((key) => store.get(key)));
    return found.filter(Boolean).sort((a, b) => (a.joined || 0) - (b.joined || 0));
  }

  function peerList(list, hostId) {
    return list.map((member) => ({ id: member.id, name: member.name, host: member.id === hostId }));
  }

  async function roomAlive(code) {
    const room = await store.get("room/" + code);
    if (!room) return null;
    const host = await store.get("mem/" + code + "/" + room.hostId);
    if (host && now() - (host.last || 0) < ROOM_STALE_MS) return room;
    // مضيف ميت: ننظّف الغرفة ونعدّها غير موجودة
    const rest = await members(code);
    await Promise.all(rest.map((member) => store.del("mem/" + code + "/" + member.id)));
    await store.del("room/" + code);
    return null;
  }

  async function removeMember(code, sid, reason) {
    const room = await store.get("room/" + code);
    await store.del("mem/" + code + "/" + sid);
    await store.del("sess/" + sid);
    await clearInbox(sid);
    if (!room) return;

    const rest = await members(code);
    if (room.hostId === sid) {
      // مضيف غادر: تُغلق الغرفة للجميع (يصل لكل منهم إشعار قبل حذف حسابه)
      await Promise.all(rest.map(async (member) => {
        await push(member.id, { t: "room-closed", reason: reason || "غادر المضيف الغرفة." });
        await store.del("sess/" + member.id);
        await store.del("mem/" + code + "/" + member.id);
      }));
      await store.del("room/" + code);
      return;
    }

    await Promise.all(rest.map(async (member) => {
      await push(member.id, { t: "peer-left", id: sid });
      await push(member.id, { t: "peers", peers: peerList(rest, room.hostId) });
    }));
    if (!rest.length) await store.del("room/" + code);
  }

  async function sweep(code) {
    const room = await store.get("room/" + code);
    if (!room) return;
    if (now() - (room.sweptAt || 0) < SWEEP_EVERY_MS) return;
    room.sweptAt = now();
    await store.set("room/" + code, room);
    const list = await members(code);
    for (const member of list) {
      if (now() - (member.last || 0) > STALE_MS) {
        const reason = member.id === room.hostId ? "انقطع الاتصال بالمضيف." : undefined;
        await removeMember(code, member.id, reason);
      }
    }
  }

  async function makeCode() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const bytes = crypto.randomBytes(4);
      let code = "";
      for (let i = 0; i < 4; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
      if (!(await roomAlive(code))) return code;
    }
    return String(now()).slice(-4);
  }

  /* ------------------------------ رسائل العميل ------------------------------ */

  async function leaveCurrent(sid, reason) {
    const sess = await store.get("sess/" + sid);
    if (sess && sess.room) await removeMember(sess.room, sid, reason);
  }

  async function onCreate(sid, msg) {
    await leaveCurrent(sid);
    const name = cleanName(msg.name, "المضيف");
    /* رمز مطلوب (نقل الاستضافة): نقبله إن كان بشكل صحيح ولم تكن هناك غرفة حيّة به */
    const wanted = String(msg.code || "").trim().toUpperCase();
    const useWanted = /^[A-Z0-9]{4}$/.test(wanted) && !(await roomAlive(wanted));
    const code = useWanted ? wanted : await makeCode();
    const t = now();
    await store.set("room/" + code, { code, hostId: sid, created: t, sweptAt: t });
    await store.set("mem/" + code + "/" + sid, { id: sid, name, joined: t, last: t });
    await store.set("sess/" + sid, { room: code, name });
    await push(sid, {
      t: "room",
      host: true,
      code,
      selfId: sid,
      hostId: sid,
      peers: [{ id: sid, name, host: true }],
    });
  }

  async function onJoin(sid, msg) {
    await leaveCurrent(sid);
    const code = String(msg.code || "").trim().toUpperCase();
    const name = cleanName(msg.name, "لاعب");
    const room = code.length >= 4 ? await roomAlive(code) : null;
    if (!room) {
      await push(sid, { t: "error", message: "الغرفة غير موجودة أو انتهت. تأكد من الرمز." });
      return;
    }
    const list = await members(code);
    if (list.length >= MAX_PEERS) {
      await push(sid, { t: "error", message: "الغرفة ممتلئة." });
      return;
    }
    const t = now();
    await store.set("mem/" + code + "/" + sid, { id: sid, name, joined: t, last: t });
    await store.set("sess/" + sid, { room: code, name });
    const all = list.concat([{ id: sid, name, joined: t, last: t }]);
    const peers = peerList(all, room.hostId);
    await push(sid, { t: "room", host: false, code, selfId: sid, hostId: room.hostId, peers });
    await push(room.hostId, { t: "peer-joined", peer: { id: sid, name, host: false } });
    await Promise.all(list.map((member) => push(member.id, { t: "peers", peers })));
  }

  async function onRelay(sid, msg) {
    if (typeof msg.data !== "string" || msg.data.length > MAX_MSG) return;
    const to = String(msg.to || "");
    if (!to) return;
    const sess = await store.get("sess/" + sid);
    if (!sess || !sess.room) return;
    const target = await store.get("mem/" + sess.room + "/" + to);
    if (!target) return;
    await push(to, { t: "relay", from: sid, data: msg.data });
  }

  /** طرد لاعب (للمضيف فقط). ندفع إشعار «طُرد» بعد الإزالة لأن الإزالة تمسح صندوق وارده. */
  async function onKick(sid, msg) {
    const sess = await store.get("sess/" + sid);
    if (!sess || !sess.room) return;
    const room = await store.get("room/" + sess.room);
    if (!room || room.hostId !== sid) return;
    const target = String(msg.id || "");
    if (!target || target === sid) return;
    const member = await store.get("mem/" + sess.room + "/" + target);
    if (!member) return;
    await removeMember(sess.room, target);
    await push(target, { t: "kicked", reason: "طردك المضيف من الغرفة." });
  }

  async function handleMsg(sid, msg) {
    if (!msg || typeof msg !== "object") return undefined;
    if (msg.t === "kick") return onKick(sid, msg);
    if (msg.t === "create") return onCreate(sid, msg);
    if (msg.t === "join") return onJoin(sid, msg);
    if (msg.t === "relay") return onRelay(sid, msg);
    if (msg.t === "leave") return leaveCurrent(sid);
    return undefined; // ping / signal: نتجاهلها (النبض يتمّ عبر poll)
  }

  /* ------------------------------ الاستطلاع الطويل ------------------------------ */

  async function touch(sid) {
    const sess = await store.get("sess/" + sid);
    if (!sess || !sess.room) return null;
    const key = "mem/" + sess.room + "/" + sid;
    const member = await store.get(key);
    if (!member) return null;
    if (now() - (member.last || 0) > TOUCH_EVERY_MS) {
      member.last = now();
      await store.set(key, member);
    }
    return sess.room;
  }

  async function poll(sid, waitSeconds, inRoom) {
    const room = await touch(sid);
    /* العميل يظن أنه داخل غرفة لكن جلسته حُذفت (انقطاع طويل): نُبلّغه ليخرج بدل أن يبقى معلّقًا */
    if (!room && inRoom) {
      const pending = await store.list("in/" + sid + "/");
      if (!pending.length) return [{ t: "room-closed", reason: "انقطع الاتصال بالغرفة." }];
    }
    if (room) await sweep(room);
    const deadline = now() + Math.max(0, Math.min(Number(waitSeconds) || 0, 7)) * 1000;
    for (;;) {
      const keys = await store.list("in/" + sid + "/");
      if (keys.length) {
        const take = keys.slice(0, 40);
        const values = await Promise.all(take.map((key) => store.get(key)));
        await Promise.all(take.map((key) => store.del(key)));
        const msgs = values.filter(Boolean);
        if (msgs.length) return msgs;
      }
      if (now() >= deadline) return [];
      await sleep(450);
    }
  }

  /* ------------------------------ دليل الغرف العامة ------------------------------ */

  const DIR_STALE_MS = 75000;

  async function dirPublish(sid, room) {
    if (!room || typeof room !== "object") return;
    const code = String(room.code || "").toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) return;
    const mode = ["cloud", "web", "lan"].indexOf(room.mode) >= 0 ? room.mode : "cloud";
    await store.set("pub/" + code, {
      code,
      mode,
      host: cleanName(room.host, "مضيف"),
      game: cleanName(room.game, ""),
      players: Math.max(0, Math.min(99, Number(room.players) || 0)),
      max: Math.max(0, Math.min(99, Number(room.max) || 0)),
      inGame: !!room.inGame,
      sid,
      at: now(),
    });
  }

  async function dirRemove(sid, code) {
    const key = "pub/" + String(code || "").toUpperCase();
    const current = await store.get(key);
    if (current && current.sid === sid) await store.del(key);
  }

  async function dirList() {
    const keys = await store.list("pub/");
    const found = await Promise.all(keys.map(async (key) => ({ key, value: await store.get(key) })));
    const rooms = [];
    for (const item of found) {
      if (!item.value) continue;
      if (now() - (item.value.at || 0) > DIR_STALE_MS) { await store.del(item.key); continue; }
      rooms.push({
        code: item.value.code,
        mode: item.value.mode,
        host: item.value.host,
        game: item.value.game,
        players: item.value.players,
        max: item.value.max,
        inGame: !!item.value.inGame,
      });
    }
    return rooms.slice(0, 40);
  }

  /* ------------------------------ نقطة الدخول ------------------------------ */

  async function handle(body) {
    try {
      if (!body || typeof body !== "object") return { ok: false, error: "bad-request" };
      const sid = String(body.sid || "");
      if (!/^[a-f0-9]{16}$/.test(sid)) return { ok: false, error: "bad-sid" };

      if (body.op === "ping") return { ok: true, t: now() };

      if (body.op === "dir-list") return { ok: true, rooms: await dirList() };
      if (body.op === "dir-publish") { await dirPublish(sid, body.room); return { ok: true }; }
      if (body.op === "dir-remove") { await dirRemove(sid, body.code); return { ok: true }; }

      if (body.op === "send") {
        const list = Array.isArray(body.msgs) ? body.msgs.slice(0, 30) : [];
        for (const msg of list) await handleMsg(sid, msg);
        return { ok: true };
      }

      if (body.op === "poll") {
        const msgs = await poll(sid, body.wait, !!body.inRoom);
        return { ok: true, msgs };
      }

      return { ok: false, error: "bad-op" };
    } catch (err) {
      return { ok: false, error: "server-error" };
    }
  }

  return { handle };
}

/** تخزين في الذاكرة (للخادم المحلي والاختبار). */
function memoryStore() {
  const map = new Map();
  return {
    async get(key) {
      const raw = map.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async set(key, value) { map.set(key, JSON.stringify(value)); },
    async del(key) { map.delete(key); },
    async list(prefix) {
      return Array.from(map.keys()).filter((key) => key.startsWith(prefix)).sort();
    },
  };
}

module.exports = { createRelay, memoryStore };
