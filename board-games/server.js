/* ==========================================================================
   ألعاب الطاولة — خادم اللعب الجماعي المحلي
   يقدّم ملفات التطبيق + إشارات WebSocket لغرف WebRTC (بلا أي حزم خارجية)
   التشغيل: node server.js
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 8790;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.resolve(__dirname, "..");
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE = 2 * 1024 * 1024;
const MAX_PEERS = 8;
const ROOM_TTL = 6 * 60 * 60 * 1000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

/* ----------------------------- الوضع المدرسي (HTTP) ----------------------------- */

let relay = null;
try {
  const core = require(path.join(__dirname, "..", "netlify", "relay-core.cjs"));
  relay = core.createRelay(core.memoryStore());
} catch (err) {
  console.warn("تعذّر تحميل netlify/relay-core.cjs — الوضع المدرسي معطّل محليًا.");
}

function handleRelayRequest(req, res) {
  const send = (status, obj) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end();
    return undefined;
  }
  if (!relay) return send(503, { ok: false, error: "unavailable" });
  if (req.method !== "POST") return send(200, { ok: true, service: "bg-relay-local" });
  let size = 0;
  const chunks = [];
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > 1_500_000) { req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    let body = null;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (err) { return send(400, { ok: false, error: "bad-json" }); }
    return send(200, await relay.handle(body));
  });
  return undefined;
}

/* ----------------------------- أدوات عامة ----------------------------- */

function lanAddresses() {
  const found = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === "IPv4" && !net.internal) found.push(net.address);
    });
  });
  const rank = (ip) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  return found.sort((a, b) => rank(a) - rank(b));
}

function log(...args) {
  console.log("[" + new Date().toLocaleTimeString("ar-EG", { hour12: false }) + "]", ...args);
}

function normalizeName(value, fallback) {
  const text = String(value == null ? "" : value).replace(/[\u0000-\u001f<>]/g, "").trim();
  return text.slice(0, 18) || fallback;
}

function sendJson(socket, payload) {
  wsSend(socket, 1, Buffer.from(JSON.stringify(payload), "utf8"));
}

function wsSend(socket, opcode, payload) {
  if (!socket || socket.destroyed || !socket.writable) return;
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), "utf8");
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  try {
    socket.write(Buffer.concat([header, data]));
  } catch (err) {
    /* اتصال ميت */
  }
}

/* ----------------------------- خادم الملفات ----------------------------- */

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("طلب غير صالح");
    return;
  }

  if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) }));
    return;
  }

  if (urlPath === "/api/relay") {
    handleRelayRequest(req, res);
    return;
  }

  if (urlPath === "/lan-info") {
    /* عناوين الجهاز على الشبكة المحلية — تُستخدم لبناء رابط دعوة يعمل على أجهزة الآخرين (لا localhost) */
    const addresses = lanAddresses();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({
      ok: true,
      port: PORT,
      addresses,
      urls: addresses.map((ip) => "http://" + ip + ":" + PORT + "/board-games/"),
    }));
    return;
  }

  if (urlPath === "/" || urlPath === "/chess" || urlPath === "/chess/") {
    res.writeHead(302, { Location: "/board-games/" });
    res.end();
    return;
  }

  if (urlPath === "/board-games") {
    res.writeHead(301, { Location: "/board-games/" });
    res.end();
    return;
  }

  if (urlPath.endsWith("/")) urlPath += "index.html";

  let filePath;
  try {
    filePath = path.resolve(ROOT, "." + urlPath);
  } catch (err) {
    filePath = "";
  }

  if (!filePath || !filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ممنوع");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
        "<body style='font-family:Tahoma;background:#0b151a;color:#eee;padding:40px'>" +
        "<h1>الصفحة غير موجودة</h1><p>تأكد من فتح <a style='color:#58d3a8' href='/board-games/'>/board-games/</a></p></body></html>"
      );
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      try { res.destroy(); } catch (e2) { /* ignore */ }
    });
    stream.pipe(res);
  });
});

/* ----------------------------- غرف الإشارات ----------------------------- */

const rooms = new Map();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  for (let attempt = 0; attempt < 80; attempt++) {
    let code = "";
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-4);
}

function peersList(room) {
  return Array.from(room.peers.values()).map((peer) => ({
    id: peer.id,
    name: peer.name,
    host: peer.id === room.hostId,
  }));
}

function roomBroadcast(room, payload, exceptId) {
  room.peers.forEach((peer) => {
    if (peer.id === exceptId) return;
    sendJson(peer.socket, payload);
  });
}

function removePeer(peer, reason) {
  const room = peer.room ? rooms.get(peer.room) : null;
  if (!room) return;
  const wasHost = room.hostId === peer.id;
  room.peers.delete(peer.id);
  peer.room = null;

  if (wasHost) {
    room.peers.forEach((other) => {
      other.room = null;
      sendJson(other.socket, { t: "room-closed", reason: reason || "غادر المضيف الغرفة." });
    });
    rooms.delete(room.code);
    log("أُغلقت الغرفة " + room.code + " (غادر المضيف)");
    return;
  }

  roomBroadcast(room, { t: "peer-left", id: peer.id });
  roomBroadcast(room, { t: "peers", peers: peersList(room) });

  log("غادر " + peer.name + " الغرفة " + room.code);
  if (!room.peers.size) rooms.delete(room.code);
}

function handleSignalMessage(peer, msg) {
  /* الإنشاء والانضمام يسبقان شرط وجود غرفة، وإلا رُفض كل طلب إنشاء. */
  if (msg.t === "create") {
    if (peer.room) {
      sendJson(peer.socket, { t: "error", message: "أنت داخل غرفة بالفعل." });
      return;
    }
    /* رمز مطلوب (يُستخدم عند نقل الاستضافة: المضيف الجديد يُنشئ نفس الرمز المتفق عليه) */
    const wanted = String(msg.code || "").trim().toUpperCase();
    const validWanted = /^[A-Z0-9]{4}$/.test(wanted) && !rooms.has(wanted);
    const code = validWanted ? wanted : makeCode();
    const newRoom = { code, hostId: peer.id, peers: new Map(), createdAt: Date.now() };
    peer.name = normalizeName(msg.name, "المضيف");
    peer.room = code;
    newRoom.peers.set(peer.id, peer);
    rooms.set(code, newRoom);
    sendJson(peer.socket, {
      t: "room",
      code,
      selfId: peer.id,
      hostId: peer.id,
      host: true,
      peers: peersList(newRoom),
    });
    log("أنشأ " + peer.name + " الغرفة " + code);
    return;
  }

  if (msg.t === "join") {
    if (peer.room) {
      sendJson(peer.socket, { t: "error", message: "أنت داخل غرفة بالفعل." });
      return;
    }
    const code = String(msg.code || "").trim().toUpperCase().slice(0, 8);
    const room = rooms.get(code);
    if (!room) {
      sendJson(peer.socket, { t: "error", message: "لا توجد غرفة بهذا الرمز. تأكد من الرمز وحاول مجددًا." });
      return;
    }
    if (room.peers.size >= MAX_PEERS) {
      sendJson(peer.socket, { t: "error", message: "الغرفة ممتلئة (الحد " + MAX_PEERS + " لاعبين)." });
      return;
    }
    peer.name = normalizeName(msg.name, "لاعب");
    peer.room = code;
    room.peers.set(peer.id, peer);
    sendJson(peer.socket, {
      t: "room",
      code,
      selfId: peer.id,
      hostId: room.hostId,
      host: false,
      peers: peersList(room),
    });
    const host = room.peers.get(room.hostId);
    if (host) sendJson(host.socket, { t: "peer-joined", peer: { id: peer.id, name: peer.name, host: false } });
    roomBroadcast(room, { t: "peers", peers: peersList(room) });
    log("انضم " + peer.name + " إلى الغرفة " + code);
    return;
  }
  if (msg.t === "ping") {
    sendJson(peer.socket, { t: "pong", ts: Date.now() });
    return;
  }

  if (!peer.room) {
    sendJson(peer.socket, { t: "error", message: "لست داخل غرفة." });
    return;
  }
  const room = rooms.get(peer.room);
  if (!room) {
    sendJson(peer.socket, { t: "error", message: "انتهت الغرفة." });
    return;
  }

  if (msg.t === "relay") {
    /* تمرير بيانات اللعب عبر الخادم نفسه: أمتن من WebRTC على الشبكات المحلية (بلا mDNS ولا UDP) */
    const target = room.peers.get(String(msg.to || ""));
    if (!target) return;
    sendJson(target.socket, { t: "relay", from: peer.id, data: msg.data });
    return;
  }

  if (msg.t === "signal") {
    const target = room.peers.get(String(msg.to || ""));
    if (!target) return;
    sendJson(target.socket, { t: "signal", from: peer.id, data: msg.data || null });
    return;
  }

  if (msg.t === "kick") {
    /* طرد لاعب: للمضيف فقط */
    const room = peer.room ? rooms.get(peer.room) : null;
    if (!room || room.hostId !== peer.id) return;
    const target = room.peers.get(String(msg.id || ""));
    if (!target || target.id === peer.id) return;
    sendJson(target.socket, { t: "kicked", reason: "طردك المضيف من الغرفة." });
    removePeer(target, "طُرد أحد اللاعبين.");
    return;
  }

  if (msg.t === "leave") {
    removePeer(peer, "غادر أحد اللاعبين.");
    sendJson(peer.socket, { t: "left" });
    return;
  }

  if (msg.t === "rename") {
    peer.name = normalizeName(msg.name, peer.name);
    const room = peer.room ? rooms.get(peer.room) : null;
    if (room) roomBroadcast(room, { t: "peers", peers: peersList(room) });
  }
}

/* ----------------------------- WebSocket ----------------------------- */

function frameBuffer(opcode, payload) {
  return { opcode, payload };
}

function handleUpgrade(req, socket, head) {
  let pathname = "";
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch (err) {
    socket.destroy();
    return;
  }
  if (pathname !== "/signal") {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }

  const accept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );

  try { socket.setNoDelay(true); socket.setKeepAlive(true, 20000); } catch (err) { /* ignore */ }

  const peer = {
    id: crypto.randomBytes(6).toString("hex"),
    name: "لاعب",
    room: null,
    socket,
    alive: true,
    fragments: [],
  };

  const state = { buffer: Buffer.alloc(0) };

  function onMessage(text) {
    peer.alive = true;
    let msg;
    try {
      msg = JSON.parse(text);
    } catch (err) {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    try {
      handleSignalMessage(peer, msg);
    } catch (err) {
      log("خطأ في رسالة إشارة:", err && err.message);
      sendJson(socket, { t: "error", message: "تعذّر معالجة الطلب." });
    }
  }

  function consume(chunk) {
    state.buffer = Buffer.concat([state.buffer, chunk]);
    while (true) {
      const buf = state.buffer;
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let length = buf[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buf.length < offset + 2) return;
        length = buf.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (buf.length < offset + 8) return;
        const big = buf.readBigUInt64BE(offset);
        if (big > BigInt(MAX_MESSAGE)) {
          closeConnection(1009, "الرسالة كبيرة جدًا");
          return;
        }
        length = Number(big);
        offset += 8;
      }
      if (length > MAX_MESSAGE) {
        closeConnection(1009, "الرسالة كبيرة جدًا");
        return;
      }
      const maskOffset = offset;
      if (masked) offset += 4;
      if (buf.length < offset + length) return;
      let payload = Buffer.from(buf.subarray(offset, offset + length));
      if (masked) {
        for (let i = 0; i < payload.length; i++) payload[i] ^= buf[maskOffset + (i & 3)];
      }
      state.buffer = buf.subarray(offset + length);

      if (opcode === 0x8) {
        closeConnection(1000, "");
        return;
      }
      if (opcode === 0x9) {
        wsSend(socket, 0xA, payload);
        continue;
      }
      if (opcode === 0xA) {
        peer.alive = true;
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        if (opcode === 0x1) peer.fragments = [];
        peer.fragments.push(payload);
        const total = peer.fragments.reduce((n, p) => n + p.length, 0);
        if (total > MAX_MESSAGE) {
          closeConnection(1009, "الرسالة كبيرة جدًا");
          return;
        }
        if (fin) {
          const text = Buffer.concat(peer.fragments).toString("utf8");
          peer.fragments = [];
          onMessage(text);
        }
        continue;
      }
      if (!fin && opcode !== 0x0) {
        peer.fragments = [payload];
      }
    }
  }

  let closed = false;
  function closeConnection(code, reason) {
    if (closed) return;
    closed = true;
    try {
      const body = Buffer.alloc(2);
      body.writeUInt16BE(code || 1000, 0);
      const rest = Buffer.from(reason || "", "utf8");
      wsSend(socket, 0x8, Buffer.concat([body, rest]));
    } catch (err) { /* ignore */ }
    removePeer(peer, "انقطع الاتصال.");
    setTimeout(() => {
      try { socket.destroy(); } catch (err) { /* ignore */ }
    }, 40);
  }

  socket.on("data", (chunk) => {
    try {
      consume(chunk);
    } catch (err) {
      log("خطأ في إطار WebSocket:", err && err.message);
      closeConnection(1011, "خطأ في الخادم");
    }
  });
  socket.on("close", () => {
    peer.alive = false;
    removePeer(peer, "انقطع الاتصال.");
  });
  socket.on("error", () => {
    peer.alive = false;
    removePeer(peer, "انقطع الاتصال.");
  });

  if (head && head.length) consume(head);
  sendJson(socket, { t: "hello", id: peer.id });
  log("اتصال إشارات جديد " + peer.id.slice(0, 6));
}

server.on("upgrade", handleUpgrade);

/* ----------------------------- نبض ودورة حياة ----------------------------- */

const heartbeat = setInterval(() => {
  rooms.forEach((room) => {
    room.peers.forEach((peer) => {
      if (!peer.alive) {
        try { peer.socket.destroy(); } catch (err) { /* ignore */ }
        removePeer(peer, "لم يستجب الخادم.");
        return;
      }
      peer.alive = false;
      wsSend(peer.socket, 0x9, Buffer.alloc(0));
    });
  });
  const now = Date.now();
  rooms.forEach((room) => {
    if (now - room.createdAt > ROOM_TTL) {
      room.peers.forEach((peer) => {
        peer.room = null;
        sendJson(peer.socket, { t: "room-closed", reason: "انتهت مدة الغرفة." });
      });
      rooms.delete(room.code);
      log("حُذفت الغرفة المنتهية " + room.code);
    }
  });
}, 30000);
heartbeat.unref();

server.listen(PORT, HOST, () => {
  const lines = [];
  lines.push("");
  lines.push("  ♟  ألعاب الطاولة — خادم اللعب الجماعي");
  lines.push("  ------------------------------------------------");
  lines.push("  المحلي:  http://127.0.0.1:" + PORT + "/board-games/");
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === "IPv4" && !net.internal) {
        lines.push("  الشبكة:  http://" + net.address + ":" + PORT + "/board-games/");
      }
    });
  });
  lines.push("  الإشارات: ws://127.0.0.1:" + PORT + "/signal");
  lines.push("  أوقف الخادم بـ Ctrl+C");
  lines.push("");
  console.log(lines.join("\n"));
});

process.on("SIGINT", () => {
  log("إيقاف الخادم…");
  rooms.forEach((room) => {
    room.peers.forEach((peer) => {
      try {
        sendJson(peer.socket, { t: "room-closed", reason: "أُوقف الخادم." });
        peer.socket.destroy();
      } catch (err) { /* ignore */ }
    });
  });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1200);
});

process.on("uncaughtException", (err) => {
  log("استثناء غير متوقع:", err && err.stack ? err.stack : err);
});
