/* ==========================================================================
   ألعاب الطاولة — طبقة الشبكة
   وضعان: سحابي عالمي (PeerJS Cloud) وشبكة محلية (WebSocket + WebRTC)
   الواجهة نفسها في الوضعين: createRoom / joinRoom / send / broadcast …
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});

  const CLOUD_PREFIX = "bgnb-v1-";
  const CLOUD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const MODE_KEY = "bg.netMode";
  const TURN_KEY = "bg.netTurn";

  const listeners = Object.create(null);
  let socket = null;
  let socketPromise = null;
  let pingTimer = null;
  let appPingTimer = null;
  let status = "idle";
  let role = ""; // host | guest
  let roomCode = "";
  let selfId = "";
  let hostId = "";
  let peers = [];
  let roomStarted = false;

  // جهة المضيف: اتصال لكل ضيف
  const guestConns = new Map();
  // جهة الضيف: اتصال واحد بالمضيف
  let hostConn = null;
  // زمن الاستجابة المقاس عبر قناة البيانات (مللي ثانية) لكل لاعب.
  const latencies = new Map();

  let pendingRoom = null;
  let pendingSeed = 0;

  let mode = readMode();
  let cloudPeer = null;
  let cloudConn = null; // اتصال الضيف بالمضيف في الوضع السحابي
  let cloudClosing = false;
  let cloudReconnectTimer = null;
  let peerJsPromise = null;

  function readMode() {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "lan" || saved === "cloud" || saved === "web") return saved;
    } catch (err) { /* ignore */ }
    return "cloud";
  }

  function readTurn() {
    try {
      const raw = localStorage.getItem(TURN_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.urls) return null;
      const urls = String(parsed.urls)
        .split(/[\s,]+/)
        .filter((url) => /^turns?:/i.test(url));
      if (!urls.length) return null;
      return {
        urls: urls.length === 1 ? urls[0] : urls,
        username: parsed.username ? String(parsed.username) : "",
        credential: parsed.credential ? String(parsed.credential) : "",
      };
    } catch (err) {
      return null;
    }
  }

  function iceServers() {
    const list = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302", "stun:stun4.l.google.com:19302"] },
      { urls: ["stun:stun.cloudflare.com:3478"] },
      { urls: ["stun:stun.services.mozilla.com"] },
      { urls: ["stun:global.stun.twilio.com:3478"] },
    ];
    const turn = readTurn();
    if (turn) list.push(turn);
    return list;
  }

  function emit(name, detail) {
    const list = listeners[name];
    if (!list) return;
    list.slice().forEach((fn) => {
      try { fn(detail); } catch (err) { console.warn("net:" + name, err); }
    });
  }

  function on(name, fn) {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(fn);
    return () => off(name, fn);
  }

  function off(name, fn) {
    const list = listeners[name];
    if (!list) return;
    const index = list.indexOf(fn);
    if (index >= 0) list.splice(index, 1);
  }

  function setStatus(next, detail) {
    status = next;
    if (next === "error") lastErrorDetail = detail || "";
    emit("status", { status: next, detail: detail || null });
  }

  let lastErrorDetail = "";

  /* ============================== أدوات عامة ============================== */

  function waitForRoom(timeoutMs) {
    return new Promise((resolve, reject) => {
      const token = ++pendingSeed;
      pendingRoom = { token, resolve, reject };
      setTimeout(() => {
        if (pendingRoom && pendingRoom.token === token) {
          pendingRoom = null;
          reject(new Error("انتهت مهلة انتظار الغرفة."));
        }
      }, timeoutMs || 12000);
    });
  }

  function finishRoom(msg) {
    if (!pendingRoom) return;
    const pending = pendingRoom;
    pendingRoom = null;
    pending.resolve(msg);
  }

  function failRoom(message) {
    if (!pendingRoom) return;
    const pending = pendingRoom;
    pendingRoom = null;
    pending.reject(new Error(message || "تعذّر إنشاء الغرفة."));
  }

  /* ============================== نبض الاتصال ============================== */

  function latencyQuality(ms) {
    if (!Number.isFinite(ms)) return "unknown";
    if (ms <= 120) return "excellent";
    if (ms <= 260) return "good";
    if (ms <= 500) return "fair";
    return "poor";
  }

  function recordLatency(peerId, ms) {
    if (!peerId || !Number.isFinite(ms) || ms < 0) return;
    const value = Math.max(0, Math.round(ms));
    const prev = latencies.get(peerId);
    // تنعيم بسيط حتى لا ترتجف الشارة بين قياس وآخر.
    const smooth = prev ? Math.round(prev.ms * 0.62 + value * 0.38) : value;
    latencies.set(peerId, { ms: smooth, at: Date.now() });
    emit("latency", { id: peerId, ms: smooth, quality: latencyQuality(smooth) });
  }

  function connSend(conn, payload) {
    if (!conn) return false;
    try {
      if (conn.dc && typeof conn.dc.send === "function") {
        conn.dc.send(JSON.stringify(payload));
        return true;
      }
      if (typeof conn.send === "function") {
        conn.send(JSON.stringify(payload));
        return true;
      }
    } catch (err) { /* ignore */ }
    return false;
  }

  /** يعالج نبض التطبيق ولا يمرّره إلى منطق اللعبة. */
  function handlePingMessage(conn, data) {
    if (!conn || !data) return false;
    if (data.t === "__ping") {
      connSend(conn, { t: "__pong", ts: data.ts });
      return true;
    }
    if (data.t === "__pong") {
      const peerId = conn.peerId || conn.peer || "";
      recordLatency(peerId, Date.now() - Number(data.ts));
      return true;
    }
    return false;
  }

  function appPingTick() {
    const payload = { t: "__ping", ts: Date.now() };
    if (role === "host") {
      guestConns.forEach((conn) => {
        if (channelOpen(conn)) connSend(conn, payload);
      });
    } else if (role === "guest" && channelOpen(hostConn)) {
      connSend(hostConn, payload);
    }
    const now = Date.now();
    latencies.forEach((value, id) => {
      if (now - value.at > 20000) latencies.delete(id);
    });
  }

  function startAppPing() {
    if (appPingTimer) return;
    appPingTimer = setInterval(appPingTick, 6000);
    setTimeout(appPingTick, 700);
  }

  function stopAppPing() {
    if (appPingTimer) clearInterval(appPingTimer);
    appPingTimer = null;
  }

  function resetLatencies() {
    if (!latencies.size) return;
    latencies.clear();
    emit("latency", { id: "", ms: null, quality: "unknown" });
  }

  function closeConn(conn) {
    if (!conn) return;
    try { if (conn.dc && conn.dc.close) conn.dc.close(); } catch (err) { /* ignore */ }
    try { if (conn.pc && conn.pc.close) conn.pc.close(); } catch (err) { /* ignore */ }
  }

  function channelOpen(conn) {
    if (!conn || !conn.dc) return false;
    if (conn.dc.open === true) return true;
    return conn.dc.readyState === "open";
  }

  /* ============================== الوضع المحلي ============================== */

  function signalUrl() {
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    if (!location.host) throw new Error("افتح التطبيق عبر خادم اللعب الجماعي (node server.js) لتفعيل الشبكة المحلية.");
    const host = location.host || "localhost:8790";
    return scheme + "//" + host + "/signal";
  }

  /* ============================== الوضع المدرسي (HTTPS فقط) ==============================
     يعمل حتى على أجهزة المدارس التي تحجب WebRTC وخوادم الإشارات الخارجية:
     كل شيء طلبات POST عادية إلى نفس عنوان الموقع (/api/relay). يقلّد واجهة WebSocket
     فتعمل نفس منطق الوضع المحلي (تمرير الرسائل عبر الخادم). */

  const RELAY_KEY = "bg.relayUrl";

  /* عنوان خدمة الغرف: يقبل https فقط (أو localhost أثناء التطوير). إن كتب المستخدم مجرد النطاق
     يُكمَل بـ /api/relay. مطلوب عند استضافة الموقع على GitHub Pages (لا تشغّل دوال). */
  function cleanRelayUrl(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text) return "";
    try {
      const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : "https://" + text);
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return "";
      let pathname = url.pathname.replace(/\/+$/, "");
      if (!pathname) pathname = "/api/relay";
      return url.origin + pathname;
    } catch (err) {
      return "";
    }
  }

  function getRelayUrl() {
    try {
      const saved = window.localStorage.getItem(RELAY_KEY);
      if (saved) return cleanRelayUrl(saved);
    } catch (err) { /* ignore */ }
    return cleanRelayUrl(window.BG_RELAY_URL);
  }

  /** true إن حُفظ العنوان (أو مُسح بقيمة فارغة)، false إن كان غير صالح. */
  function setRelayUrl(value) {
    const text = String(value == null ? "" : value).trim();
    const clean = cleanRelayUrl(text);
    if (text && !clean) return false;
    try {
      if (clean) window.localStorage.setItem(RELAY_KEY, clean);
      else window.localStorage.removeItem(RELAY_KEY);
    } catch (err) { /* ignore */ }
    return true;
  }

  function relayEndpoint() {
    return getRelayUrl() || "/api/relay";
  }

  /* استضافة ثابتة (GitHub Pages ونحوها) بلا عنوان خدمة غرف مضبوط */
  function relayMissing() {
    return !getRelayUrl() && /(^|\.)github\.io$/i.test(location.hostname);
  }

  function HttpSocket(endpoint) {
    const listeners = { open: [], message: [], close: [], error: [] };
    const self = this;
    const queue = [];
    let flushing = false;
    let closed = false;
    let failures = 0;
    let sendFailures = 0;
    let inRoom = false;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const sid = (() => {
      const bytes = new Uint8Array(8);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
      return Array.from(bytes).map((b) => (b < 16 ? "0" : "") + b.toString(16)).join("");
    })();

    this.readyState = 0;
    this.sid = sid;

    function dispatch(type, event) {
      (listeners[type] || []).slice().forEach((fn) => {
        try { fn(event || {}); } catch (err) { console.warn(err); }
      });
    }

    this.addEventListener = (type, fn) => {
      if (listeners[type]) listeners[type].push(fn);
    };

    async function post(body, timeoutMs) {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({ sid }, body)),
          cache: "no-store",
          signal: ctl ? ctl.signal : undefined,
        });
        if (!res.ok) throw new Error("http " + res.status);
        const data = await res.json();
        if (!data || data.ok === false) throw new Error((data && data.error) || "bad-response");
        return data;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    function fail() {
      if (closed) return;
      closed = true;
      self.readyState = 3;
      dispatch("close", {});
    }

    async function flush() {
      if (flushing) return;
      flushing = true;
      try {
        while (queue.length && !closed) {
          const batch = queue.splice(0, 20);
          try {
            await post({ op: "send", msgs: batch }, 12000);
            sendFailures = 0;
          } catch (err) {
            sendFailures += 1;
            if (sendFailures > 4) { queue.length = 0; fail(); return; }
            queue.unshift.apply(queue, batch);
            await wait(600 * sendFailures);
          }
        }
      } finally {
        flushing = false;
      }
    }

    async function pollLoop() {
      while (!closed) {
        const started = Date.now();
        try {
          const data = await post({ op: "poll", wait: 6, inRoom }, 15000);
          failures = 0;
          const msgs = data.msgs || [];
          msgs.forEach((msg) => {
            if (msg && msg.t === "room") inRoom = true;
            else if (msg && (msg.t === "room-closed" || msg.t === "left")) inRoom = false;
            dispatch("message", { data: JSON.stringify(msg) });
          });
          /* خادم بلا انتظار طويل: لا نقصفه بالطلبات */
          if (!msgs.length && Date.now() - started < 400) await wait(800);
        } catch (err) {
          if (closed) return;
          failures += 1;
          if (failures >= 6) { fail(); return; }
          await wait(Math.min(4000, 700 * failures));
        }
      }
    }

    this.send = (text) => {
      if (self.readyState !== 1) throw new Error("closed");
      let msg;
      try { msg = JSON.parse(text); } catch (err) { return; }
      if (!msg || msg.t === "ping") return; /* النبض يتمّ عبر الاستطلاع */
      if (msg.t === "leave") inRoom = false;
      queue.push(msg);
      flush();
    };

    this.close = () => {
      if (closed) return;
      closed = true;
      self.readyState = 3;
      if (queue.length) {
        try {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sid, op: "send", msgs: queue.splice(0) }),
            keepalive: true,
          }).catch(() => {});
        } catch (err) { /* ignore */ }
      }
      setTimeout(() => dispatch("close", {}), 0);
    };

    setTimeout(async () => {
      try {
        await post({ op: "ping" }, 9000);
      } catch (err) {
        if (closed) return;
        closed = true;
        self.readyState = 3;
        dispatch("error", {});
        return;
      }
      if (closed) return;
      self.readyState = 1;
      dispatch("open", {});
      pollLoop();
    }, 0);
  }

  function connect() {
    if (mode === "cloud") return Promise.resolve();
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (socket && socket.readyState === WebSocket.CONNECTING && socketPromise) {
      return socketPromise;
    }
    if (socketPromise) return socketPromise;

    setStatus("connecting");
    socketPromise = new Promise((resolve, reject) => {
      let ws;
      try {
        ws = mode === "web" ? new HttpSocket(relayEndpoint()) : new WebSocket(signalUrl());
      } catch (err) {
        socketPromise = null;
        setStatus("error", err.message || "تعذّر إنشاء اتصال WebSocket");
        reject(err);
        return;
      }
      socket = ws;
      let settles = false;

      ws.addEventListener("open", () => {
        if (settles) return;
        settles = true;
        setStatus("signaling");
        startPing();
        resolve();
      });

      ws.addEventListener("message", (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch (err) { return; }
        if (msg && msg.t) handleSignalMessage(msg);
      });

      ws.addEventListener("close", () => {
        stopPing();
        if (socket === ws) {
          socket = null;
          socketPromise = null;
        }
        const wasRoom = roomStarted;
        resetTransport(true);
        setStatus("closed", { wasRoom });
        emit("close", { wasRoom });
      });

      ws.addEventListener("error", (ev) => {
        if (!settles) {
          settles = true;
          socketPromise = null;
          setStatus("error", mode === "web"
            ? (relayMissing()
              ? "هذا الموقع مستضاف على GitHub Pages ولا يشغّل خدمة الغرف. أدخل عنوان خدمة الغرف (موقع Netlify) في «إعداد خدمة الغرف» أدناه."
              : "تعذّر الوصول إلى خدمة الغرف (" + relayEndpoint() + "). تأكد من الإنترنت ومن صحة العنوان ثم أعد المحاولة.")
            : "لا يوجد خادم لعب محلي يعمل. شغّل الملف start-lan.bat (أو node board-games/server.js) على جهاز المضيف ثم افتح الرابط الذي يظهر في نافذته.");
          reject(new Error(lastErrorDetail || "signal-error"));
        }
      });
    });
    return socketPromise;
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ t: "ping", ts: Date.now() })); } catch (err) { /* ignore */ }
      }
    }, 20000);
  }

  function stopPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function resetTransport(preserveRoomInfo) {
    stopAppPing();
    resetLatencies();
    guestConns.forEach((conn) => closeConn(conn));
    guestConns.clear();
    if (hostConn) closeConn(hostConn);
    hostConn = null;
    if (!preserveRoomInfo) {
      role = "";
      roomCode = "";
      selfId = "";
      hostId = "";
      peers = [];
      roomStarted = false;
    }
  }

  function rawSend(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("قناة الإشارات غير متصلة.");
    }
    socket.send(JSON.stringify(payload));
  }

  async function lanCreateRoom(name, code) {
    await connect();
    const roomPromise = waitForRoom();
    rawSend({ t: "create", name: name || "المضيف", code: code ? String(code).toUpperCase() : undefined });
    return roomPromise;
  }

  async function lanJoinRoom(code, name) {
    await connect();
    const roomPromise = waitForRoom();
    rawSend({ t: "join", code: String(code || "").trim().toUpperCase(), name: name || "لاعب" });
    return roomPromise;
  }

  function handleSignalMessage(msg) {
    if (msg.t === "hello") {
      if (!selfId) selfId = msg.id;
      return;
    }
    if (msg.t === "room") {
      role = msg.host ? "host" : "guest";
      roomCode = msg.code;
      selfId = msg.selfId;
      hostId = msg.hostId;
      peers = msg.peers || [];
      roomStarted = true;
      if (!msg.host) hostConn = { pc: null, dc: makeRelayChannel(msg.hostId), peerId: msg.hostId, relay: true };
      startAppPing();
      setStatus("room", msg);
      emit("room", msg);
      emit("peers", peers);
      finishRoom(msg);
      return;
    }
    if (msg.t === "peers") {
      peers = msg.peers || [];
      emit("peers", peers);
      return;
    }
    if (msg.t === "peer-joined") {
      /* نُنشئ قناة الضيف قبل إطلاق الحدث حتى يستطيع المستمع إرسال رسائل فورًا (مثل بدء اللعبة للعائد) */
      if (role === "host" && msg.peer && msg.peer.id) ensureGuest(msg.peer.id);
      emit("peer-joined", msg.peer);
      return;
    }
    if (msg.t === "peer-left") {
      if (guestConns.has(msg.id)) {
        closeConn(guestConns.get(msg.id));
        guestConns.delete(msg.id);
      }
      emit("peer-left", msg.id);
      return;
    }
    if (msg.t === "kicked") {
      emit("message", { from: hostId, data: { t: "kicked", reason: msg.reason || "طردك المضيف من الغرفة." } });
      return;
    }
    if (msg.t === "relay") {
      let data;
      try { data = JSON.parse(msg.data); } catch (err) { return; }
      if (!data || typeof data !== "object") return;
      const conn = role === "host" ? guestConns.get(msg.from) : hostConn;
      if (conn && handlePingMessage(conn, data)) return;
      emit("message", { from: msg.from, data });
      return;
    }
    if (msg.t === "signal") {
      handlePeerSignal(msg.from, msg.data);
      return;
    }
    if (msg.t === "room-closed") {
      const reason = msg.reason || "أُغلقت الغرفة.";
      const wasStarted = roomStarted;
      resetTransport(false);
      setStatus("closed", { reason, wasRoom: wasStarted });
      emit("room-closed", { reason, wasRoom: wasStarted });
      return;
    }
    if (msg.t === "left") {
      resetTransport(false);
      setStatus("idle");
      return;
    }
    if (msg.t === "error") {
      setStatus("error", msg.message);
      emit("error", msg.message);
      failRoom(msg.message);
      return;
    }
    if (msg.t === "pong") return;
  }

  function fallbackIce(pc) {
    // في الوضع المحلي نستخدم مرشّحات المضيف؛ الاتصال داخل الشبكة نفسها لا يحتاج STUN.
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const target = pc.__peerId;
      if (!target) return;
      try { rawSend({ t: "signal", to: target, data: { candidate: event.candidate } }); } catch (err) { /* ignore */ }
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      emit("peer-state", { id: pc.__peerId, state });
      if (state === "disconnected" || state === "failed") {
        if (role === "host" && pc.__peerId) {
          setTimeout(() => {
            const conn = guestConns.get(pc.__peerId);
            if (!conn || conn.pc !== pc) return;
            if (pc.connectionState === "connected") return;
            restartIce(conn);
          }, 1200);
        }
      }
    };
  }

  function makePeerConnection(peerId) {
    if (typeof RTCPeerConnection !== "function") {
      throw new Error("متصفحك لا يدعم WebRTC. استخدم Chrome أو Edge أو Firefox حديثًا.");
    }
    const pc = new RTCPeerConnection({ iceServers: [], iceCandidatePoolSize: 0 });
    pc.__peerId = peerId;
    pc.__pendingCandidates = [];
    fallbackIce(pc);
    return pc;
  }

  function bindChannel(conn, channel, peerId) {
    conn.dc = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      startAppPing();
      setStatus("connected");
      emit("peer-open", { id: peerId });
    };
    channel.onclose = () => emit("peer-close", { id: peerId });
    channel.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (err) { return; }
      if (!data || typeof data !== "object") return;
      if (handlePingMessage(conn, data)) return;
      emit("message", { from: peerId, data });
    };
  }

  /* قناة تمرير عبر خادم الإشارات: نفس واجهة DataChannel لكن بلا WebRTC.
     على الشبكة المحلية هذا أمتن: لا تعتمد على mDNS ولا UDP ولا جدار الحماية. */
  function makeRelayChannel(peerId) {
    return {
      open: true,
      readyState: "open",
      relay: true,
      send(text) { rawSend({ t: "relay", to: peerId, data: String(text) }); },
      close() { /* لا شيء لإغلاقه */ },
    };
  }

  function ensureGuest(peerId) {
    if (role !== "host" || !peerId || guestConns.has(peerId)) return guestConns.get(peerId) || null;
    const conn = { pc: null, dc: makeRelayChannel(peerId), peerId, relay: true };
    guestConns.set(peerId, conn);
    emit("peer-state", { id: peerId, state: "connected" });
    emit("peer-open", { id: peerId });
    startAppPing();
    setStatus("connected");
    return conn;
  }

  async function handlePeerSignal(from, data) {
    if (!from || !data) return;

    if (role === "guest") {
      if (data.sdp) {
        if (!hostConn) {
          const pc = makePeerConnection(from);
          hostConn = { pc, dc: null, peerId: from };
          pc.ondatachannel = (event) => bindChannel(hostConn, event.channel, from);
        }
        const conn = hostConn;
        try {
          await conn.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushCandidates(conn);
          if (data.sdp.type === "offer") {
            const answer = await conn.pc.createAnswer();
            await conn.pc.setLocalDescription(answer);
            rawSend({ t: "signal", to: from, data: { sdp: conn.pc.localDescription } });
          }
        } catch (err) {
          console.warn("guest signal", err);
        }
        return;
      }
      if (data.candidate && hostConn) {
        await addCandidate(hostConn, data.candidate);
        return;
      }
      return;
    }

    if (role === "host") {
      const conn = guestConns.get(from);
      if (!conn) return;
      if (data.sdp) {
        try {
          await conn.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushCandidates(conn);
        } catch (err) {
          console.warn("host signal", err);
        }
        return;
      }
      if (data.candidate) await addCandidate(conn, data.candidate);
    }
  }

  async function addCandidate(conn, candidate) {
    if (!conn || !conn.pc) return;
    if (!conn.pc.remoteDescription || !conn.pc.remoteDescription.type) {
      conn.pc.__pendingCandidates.push(candidate);
      return;
    }
    try { await conn.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) { /* ignore */ }
  }

  async function flushCandidates(conn) {
    if (!conn || !conn.pc) return;
    const list = conn.pc.__pendingCandidates || [];
    conn.pc.__pendingCandidates = [];
    for (const candidate of list) {
      try { await conn.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) { /* ignore */ }
    }
  }

  async function restartIce(conn) {
    if (!conn || !conn.pc || role !== "host") return;
    try {
      const offer = await conn.pc.createOffer({ iceRestart: true });
      await conn.pc.setLocalDescription(offer);
      rawSend({ t: "signal", to: conn.peerId, data: { sdp: conn.pc.localDescription } });
    } catch (err) { /* ignore */ }
  }

  function ensureHostConnections() {
    if (mode === "cloud" || role !== "host") return;
    peers.forEach((peer) => {
      if (peer.id !== selfId) ensureGuest(peer.id);
    });
  }

  /* ============================== الوضع السحابي ============================== */

  function loadPeerJs() {
    if (typeof window.Peer === "function") return Promise.resolve(window.Peer);
    if (peerJsPromise) return peerJsPromise;
    peerJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "vendor/peerjs/peerjs.min.js";
      script.async = true;
      script.onload = () => {
        if (typeof window.Peer === "function") resolve(window.Peer);
        else reject(new Error("تعذّر تحميل مكتبة الاتصال العالمي."));
      };
      script.onerror = () => {
        peerJsPromise = null;
        reject(new Error("تعذّر تحميل مكتبة الاتصال العالمي. تحقّق من اتصالك بالإنترنت."));
      };
      document.head.appendChild(script);
    });
    return peerJsPromise;
  }

  function cloudOptions() {
    return {
      debug: 0,
      config: {
        iceServers: iceServers(),
        sdpSemantics: "unified-plan",
      },
    };
  }

  function cloudErrorMessage(err) {
    const type = err && (err.type || err.code || "");
    if (type === "peer-unavailable") return "لم يُعثر على غرفة بهذا الرمز. تأكد من الرمز وأن المضيف ما زال متصلًا.";
    if (type === "unavailable-id") return "هذا الرمز مستخدم الآن. جرّب إنشاء غرفة مرة أخرى.";
    if (type === "browser-incompatible") return "متصفحك لا يدعم الاتصال المباشر. استخدم Chrome أو Edge أو Firefox حديثًا.";
    if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
      return "تعذّر الوصول إلى خدمة المباريات العالمية. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.";
    }
    if (type === "webrtc") return "تعذّر إنشاء قناة الاتصال المباشر بين الجهازين. جرّب شبكة أخرى.";
    const message = err && err.message ? String(err.message) : "";
    return message || "تعذّر إتمام الاتصال.";
  }

  function cloudErrorCode(err) {
    return (err && (err.type || err.code)) || "unknown";
  }

  function openCloudPeer(peerId) {
    return new Promise((resolve, reject) => {
      let peer;
      try {
        peer = peerId ? new window.Peer(peerId, cloudOptions()) : new window.Peer(cloudOptions());
      } catch (err) {
        reject(err);
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { peer.destroy(); } catch (err) { /* ignore */ }
        reject(new Error("انتهت مهلة الاتصال بخدمة المباريات العالمية."));
      }, 16000);
      peer.on("open", (id) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ peer, id });
      });
      peer.on("error", (err) => {
        if (settled) {
          if (cloudPeer === peer) handleCloudPeerError(err);
          return;
        }
        settled = true;
        clearTimeout(timer);
        try { peer.destroy(); } catch (e) { /* ignore */ }
        const wrapped = new Error(cloudErrorMessage(err));
        wrapped.code = cloudErrorCode(err);
        reject(wrapped);
      });
    });
  }

  function handleCloudPeerError(err) {
    const code = cloudErrorCode(err);
    if (code === "peer-unavailable") return;
    if (code === "network" || code === "socket-error" || code === "server-error" || code === "socket-closed") {
      if (role === "host" && roomStarted) {
        setStatus("reconnecting");
        scheduleCloudReconnect();
        return;
      }
      const message = cloudErrorMessage(err);
      setStatus("error", message);
      emit("error", message);
      return;
    }
    const message = cloudErrorMessage(err);
    setStatus("error", message);
    emit("error", message);
  }

  function scheduleCloudReconnect() {
    if (cloudReconnectTimer || !cloudPeer || cloudPeer.destroyed) return;
    cloudReconnectTimer = setTimeout(() => {
      cloudReconnectTimer = null;
      if (!cloudPeer || cloudPeer.destroyed) return;
      try {
        cloudPeer.reconnect();
        setStatus("room");
        broadcastCloudPeers();
      } catch (err) {
        const message = "انقطع الاتصال بالخدمة العالمية.";
        setStatus("error", message);
        emit("error", message);
      }
    }, 1500);
  }

  function cloudTeardown() {
    stopAppPing();
    resetLatencies();
    if (cloudReconnectTimer) clearTimeout(cloudReconnectTimer);
    cloudReconnectTimer = null;
    if (cloudPeer) {
      const peer = cloudPeer;
      cloudPeer = null;
      try { peer.destroy(); } catch (err) { /* ignore */ }
    }
    if (cloudConn) {
      try { cloudConn.close(); } catch (err) { /* ignore */ }
      cloudConn = null;
    }
  }

  function randomCloudCode() {
    let code = "";
    for (let i = 0; i < 4; i += 1) {
      code += CLOUD_ALPHABET[Math.floor(Math.random() * CLOUD_ALPHABET.length)];
    }
    return code;
  }

  function bucketCode(offset) {
    const bucket = Math.floor(Date.now() / 120000) - (offset || 0);
    let value = bucket % 46656;
    if (value < 0) value += 46656;
    let code = value.toString(36).toUpperCase();
    while (code.length < 3) code = "0" + code;
    return "Q" + code.slice(-3);
  }

  function cloudPeers() {
    return peers.slice();
  }

  function broadcastCloudPeers() {
    if (role !== "host") return;
    const payload = { t: "__room", peers: cloudPeers(), code: roomCode, hostId: selfId };
    guestConns.forEach((conn) => {
      if (!channelOpen(conn)) return;
      try { conn.dc.send(JSON.stringify(payload)); } catch (err) { /* ignore */ }
    });
  }

  function onCloudHostData(peerId, raw) {
    let data;
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (err) { return; }
    if (!data || typeof data !== "object") return;
    if (handlePingMessage(guestConns.get(peerId), data)) return;
    if (data.t === "__hello") {
      const peer = peers.find((item) => item.id === peerId);
      if (peer && data.name) {
        peer.name = String(data.name).slice(0, 24) || peer.name;
        broadcastCloudPeers();
        emit("peers", cloudPeers());
      }
      return;
    }
    if (data.t === "__leave") {
      const conn = guestConns.get(peerId);
      if (conn) closeConn(conn);
      return;
    }
    emit("message", { from: peerId, data });
  }

  function onCloudHostClose(peerId) {
    if (!guestConns.has(peerId)) return;
    const conn = guestConns.get(peerId);
    guestConns.delete(peerId);
    if (conn) closeConn(conn);
    peers = peers.filter((item) => item.id !== peerId);
    broadcastCloudPeers();
    emit("peers", cloudPeers());
    emit("peer-left", peerId);
  }

  function registerCloudGuest(conn, name) {
    const peerId = conn.peer;
    if (guestConns.has(peerId)) return;
    const wrapper = { dc: conn, peerId, cloud: true, name: name || "لاعب" };
    guestConns.set(peerId, wrapper);
    if (!peers.some((item) => item.id === peerId)) {
      peers.push({ id: peerId, name: wrapper.name, host: false });
    }
    conn.on("data", (data) => onCloudHostData(peerId, data));
    conn.on("close", () => onCloudHostClose(peerId));
    conn.on("error", () => onCloudHostClose(peerId));
    if (conn.metadata && conn.metadata.name) {
      const peer = peers.find((item) => item.id === peerId);
      if (peer) peer.name = String(conn.metadata.name).slice(0, 24) || peer.name;
    }
    emit("peer-joined", { id: peerId, name: wrapper.name, host: false });
    emit("peer-open", { id: peerId });
    emit("peers", cloudPeers());
    broadcastCloudPeers();
    startAppPing();
    setStatus("connected");
  }

  function onCloudConnection(conn) {
    const name = (conn.metadata && conn.metadata.name) || "لاعب";
    if (conn.open) registerCloudGuest(conn, name);
    else conn.on("open", () => registerCloudGuest(conn, name));
  }

  async function cloudCreateRoom(name, forcedCode) {
    await loadPeerJs();
    cloudClosing = false;
    cloudTeardown();
    const candidates = forcedCode ? [String(forcedCode).toUpperCase()] : [randomCloudCode(), randomCloudCode(), randomCloudCode(), randomCloudCode(), randomCloudCode()];
    let opened = null;
    let lastError = null;
    for (const code of candidates) {
      try {
        opened = await openCloudPeer(CLOUD_PREFIX + code);
        roomCode = code;
        break;
      } catch (err) {
        lastError = err;
        if (err.code !== "unavailable-id") break;
      }
    }
    if (!opened) throw lastError || new Error("تعذّر إنشاء الغرفة.");

    cloudPeer = opened.peer;
    role = "host";
    selfId = opened.id;
    hostId = opened.id;
    roomStarted = true;
    peers = [{ id: selfId, name: (name || "المضيف").slice(0, 24), host: true }];
    cloudPeer.on("connection", onCloudConnection);
    cloudPeer.on("disconnected", () => {
      setStatus("reconnecting");
      scheduleCloudReconnect();
    });
    startAppPing();
    setStatus("room");
    const msg = { t: "room", host: true, code: roomCode, selfId, hostId, peers: cloudPeers() };
    emit("room", msg);
    emit("peers", cloudPeers());
    return msg;
  }

  function waitDcOpen(conn, timeoutMs, peer) {
    return new Promise((resolve, reject) => {
      if (conn.open) { resolve(); return; }
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        if (peer && typeof peer.off === "function") peer.off("error", onPeerError);
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      const onPeerError = (err) => {
        const wrapped = new Error(cloudErrorMessage(err));
        wrapped.code = cloudErrorCode(err);
        finish(reject, wrapped);
      };
      const timer = setTimeout(() => {
        finish(reject, new Error("انتهت مهلة الاتصال بالمضيف. تأكد من الرمز وأن المضيف متصل، وإن استمرت المشكلة فقد تحتاج الشبكة إلى خادم TURN (الإعدادات المتقدمة في نافذة اللعب الجماعي)."));
      }, timeoutMs || 14000);
      conn.on("open", () => finish(resolve));
      conn.on("error", (err) => {
        const wrapped = new Error(cloudErrorMessage(err));
        wrapped.code = cloudErrorCode(err);
        finish(reject, wrapped);
      });
      if (peer && typeof peer.on === "function") peer.on("error", onPeerError);
    });
  }

  async function cloudJoinRoom(code, name) {
    await loadPeerJs();
    cloudClosing = false;
    cloudTeardown();
    const upper = String(code || "").trim().toUpperCase();
    if (upper.length < 4) throw new Error("أدخل رمز الغرفة المكوّن من أربعة أحرف.");
    const opened = await openCloudPeer(null);
    cloudPeer = opened.peer;
    const target = CLOUD_PREFIX + upper;
    let conn;
    try {
      conn = cloudPeer.connect(target, { reliable: true, metadata: { name: (name || "لاعب").slice(0, 24) } });
      await waitDcOpen(conn, 14000, cloudPeer);
    } catch (err) {
      try { cloudPeer.destroy(); } catch (e) { /* ignore */ }
      cloudPeer = null;
      throw err;
    }

    role = "guest";
    selfId = opened.id;
    hostId = target;
    roomCode = upper;
    roomStarted = true;
    cloudConn = conn;
    hostConn = { dc: conn, peerId: target, cloud: true };
    peers = [
      { id: target, name: "المضيف", host: true },
      { id: selfId, name: (name || "لاعب").slice(0, 24), host: false },
    ];

    conn.on("data", (raw) => {
      let data;
      try { data = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (err) { return; }
      if (!data || typeof data !== "object") return;
      if (handlePingMessage(hostConn, data)) return;
      if (data.t === "__room") {
        if (Array.isArray(data.peers)) {
          peers = data.peers;
          const hostPeer = peers.find((item) => item.id === (data.hostId || target));
          if (hostPeer) {
            if (!hostPeer.name || hostPeer.name === "لاعب") hostPeer.name = "المضيف";
          }
          emit("peers", cloudPeers());
        }
        return;
      }
      if (data.t === "__closed") {
        const reason = data.reason || "أغلق المضيف الغرفة.";
        cloudClosing = true;
        cloudTeardown();
        resetTransport(false);
        setStatus("closed", { reason, wasRoom: true });
        emit("room-closed", { reason, wasRoom: true });
        return;
      }
      emit("message", { from: target, data });
    });
    conn.on("close", () => {
      if (cloudClosing || role !== "guest" || !roomStarted) return;
      const reason = "انقطع الاتصال بالمضيف.";
      cloudClosing = true;
      cloudTeardown();
      resetTransport(false);
      setStatus("closed", { reason, wasRoom: true });
      emit("room-closed", { reason, wasRoom: true });
    });
    conn.on("error", (err) => {
      if (cloudClosing) return;
      const message = cloudErrorMessage(err);
      emit("error", message);
    });
    cloudPeer.on("disconnected", () => {
      setStatus("reconnecting");
      scheduleCloudReconnect();
    });

    try { conn.send(JSON.stringify({ t: "__hello", name: (name || "لاعب").slice(0, 24) })); } catch (err) { /* ignore */ }
    startAppPing();
    setStatus("connected");
    const msg = { t: "room", host: false, code: roomCode, selfId, hostId, peers: cloudPeers() };
    emit("room", msg);
    emit("peers", cloudPeers());
    return msg;
  }

  async function cloudQuickMatch(name) {
    await loadPeerJs();
    const attempts = [bucketCode(0), bucketCode(0), bucketCode(1), bucketCode(2)];
    for (let i = 0; i < attempts.length; i += 1) {
      if (i === 1) await new Promise((resolve) => setTimeout(resolve, 900));
      try {
        const msg = await cloudJoinRoom(attempts[i], name);
        msg.match = true;
        return msg;
      } catch (err) {
        // لا توجد غرفة في هذه النافذة — نجرّب النافذة التالية.
      }
    }
    const primary = bucketCode(0);
    try {
      const msg = await cloudCreateRoom(name, primary);
      msg.match = true;
      return msg;
    } catch (err) {
      if (err && err.code === "unavailable-id") {
        const msg = await cloudJoinRoom(primary, name);
        msg.match = true;
        return msg;
      }
      throw err;
    }
  }

  /* ============================== الواجهة الموحّدة ============================== */

  async function createRoom(name, opts) {
    const wanted = opts && opts.code ? String(opts.code).toUpperCase() : "";
    if (mode === "cloud") return cloudCreateRoom(name, wanted || undefined);
    return lanCreateRoom(name, wanted);
  }

  /** طرد لاعب (للمضيف فقط). يُرسل إشعارًا ثم يقطع الاتصال. */
  function kick(peerId) {
    if (role !== "host" || !peerId || peerId === selfId) return false;
    if (mode === "cloud") {
      const conn = guestConns.get(peerId);
      if (!conn) return false;
      try {
        if (channelOpen(conn)) conn.dc.send(JSON.stringify({ t: "kicked", reason: "طردك المضيف من الغرفة." }));
      } catch (err) { /* ignore */ }
      setTimeout(() => { try { onCloudHostClose(peerId); } catch (err) { /* ignore */ } }, 350);
      return true;
    }
    try {
      rawSend({ t: "kick", id: peerId });
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ============================== دليل الغرف العامة ==============================
     نشرة حائط تستضيفها خدمة الغرف (/api/relay). المضيف العام ينشر غرفته، واللاعب يتصفحها.
     النقل نفسه يبقى عبر وضع الغرفة (عالمي/مدرسي/محلي). */

  const dirSid = (() => {
    const bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map((b) => (b < 16 ? "0" : "") + b.toString(16)).join("");
  })();

  async function dirCall(body, timeoutMs) {
    if (relayMissing()) throw new Error("relay-missing");
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs || 8000) : null;
    try {
      const res = await fetch(relayEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ sid: dirSid }, body)),
        cache: "no-store",
        keepalive: !!(body && body.op === "dir-remove"),
        signal: ctl ? ctl.signal : undefined,
      });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      if (!data || data.ok === false) throw new Error((data && data.error) || "bad-response");
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const directory = {
    async list() {
      const data = await dirCall({ op: "dir-list" });
      return Array.isArray(data.rooms) ? data.rooms : [];
    },
    async publish(room) {
      await dirCall({ op: "dir-publish", room });
      return true;
    },
    async remove(code) {
      try { await dirCall({ op: "dir-remove", code }, 4000); } catch (err) { /* ignore */ }
    },
  };

  async function joinRoom(code, name) {
    if (mode === "cloud") return cloudJoinRoom(code, name);
    return lanJoinRoom(code, name);
  }

  async function quickMatch(name) {
    if (mode !== "cloud") throw new Error("المطابقة السريعة متاحة في الوضع العالمي فقط.");
    return cloudQuickMatch(name);
  }

  function ready() {
    if (role === "host") {
      return Array.from(guestConns.values()).every((conn) => channelOpen(conn));
    }
    return channelOpen(hostConn);
  }

  function connectedPeers() {
    if (role === "host") {
      return Array.from(guestConns.entries())
        .filter(([, conn]) => channelOpen(conn))
        .map(([id]) => id);
    }
    return channelOpen(hostConn) ? [hostId] : [];
  }

  function sendTo(peerId, payload) {
    if (role !== "host") return false;
    const conn = guestConns.get(peerId);
    if (!channelOpen(conn)) return false;
    try {
      conn.dc.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  function broadcast(payload, exceptId) {
    if (role !== "host") return 0;
    let count = 0;
    /* تسلسل الحالة مرة واحدة لكل المستلمين (كان يُعاد لكل ضيف) */
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    guestConns.forEach((conn, id) => {
      if (exceptId && id === exceptId) return;
      if (!channelOpen(conn)) return;
      try {
        conn.dc.send(text);
        count += 1;
      } catch (err) { /* ignore */ }
    });
    return count;
  }

  function send(payload) {
    if (role !== "guest") return false;
    if (!channelOpen(hostConn)) return false;
    try {
      hostConn.dc.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  function leave() {
    cloudClosing = true;
    if (mode === "cloud") {
      if (role === "host" && cloudPeer) {
        const notice = { t: "__closed", reason: "أغلق المضيف الغرفة." };
        guestConns.forEach((conn) => {
          if (!channelOpen(conn)) return;
          try { conn.dc.send(JSON.stringify(notice)); } catch (err) { /* ignore */ }
        });
      } else if (role === "guest" && hostConn) {
        try { hostConn.dc.send(JSON.stringify({ t: "__leave" })); } catch (err) { /* ignore */ }
      }
      resetTransport(false);
      cloudTeardown();
      setStatus("idle");
      return;
    }

    try {
      if (socket && socket.readyState === WebSocket.OPEN) rawSend({ t: "leave" });
    } catch (err) { /* ignore */ }
    resetTransport(false);
    setStatus("idle");
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.close(); } catch (err) { /* ignore */ }
    }
    socket = null;
    socketPromise = null;
  }

  function setMode(next) {
    if (next !== "lan" && next !== "cloud" && next !== "web") return mode;
    if (roomStarted || role) return mode;
    mode = next;
    try { localStorage.setItem(MODE_KEY, mode); } catch (err) { /* ignore */ }
    emit("mode", mode);
    return mode;
  }

  function setTurn(config) {
    try {
      if (!config || !config.urls) localStorage.removeItem(TURN_KEY);
      else {
        localStorage.setItem(TURN_KEY, JSON.stringify({
          urls: String(config.urls),
          username: config.username ? String(config.username) : "",
          credential: config.credential ? String(config.credential) : "",
        }));
      }
    } catch (err) { /* ignore */ }
    return readTurn();
  }

  let lanInfoCache = null;

  /** معلومات خادم اللعب المحلي (عناوين الشبكة). null إن لم يكن الخادم موجودًا (استضافة ثابتة). */
  async function lanInfo() {
    if (lanInfoCache) return lanInfoCache;
    if (!/^https?:$/.test(location.protocol)) return null;
    try {
      const res = await fetch("/lan-info", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.ok) lanInfoCache = data;
    } catch (err) { /* لا خادم */ }
    return lanInfoCache;
  }

  /** رابط دعوة يعمل فعلًا على أجهزة الآخرين (عنوان الشبكة بدل localhost). */
  async function inviteLinkFor(code) {
    const upper = String(code || roomCode || "").toUpperCase();
    if (mode === "lan" && /^(localhost|127\.|\[?::1\]?$)/.test(location.hostname)) {
      const info = await lanInfo();
      if (info && info.urls && info.urls.length) {
        try {
          const url = new URL(info.urls[0]);
          url.searchParams.set("join", upper);
          url.searchParams.set("mode", "lan");
          return url.toString();
        } catch (err) { /* نكمل بالرابط العادي */ }
      }
    }
    return BG.net.inviteLink(upper);
  }

  BG.net = {
    kick,
    directory,
    getRelayUrl,
    setRelayUrl,
    relayMissing,
    lanInfo,
    inviteLinkFor,
    on,
    off,
    connect,
    createRoom,
    joinRoom,
    quickMatch,
    leave,
    send,
    sendTo,
    broadcast,
    ready,
    connectedPeers,
    ensureHostConnections,
    setMode,
    setTurn,
    getTurn: readTurn,
    inviteLink(code) {
      try {
        const url = new URL(location.href);
        url.search = "";
        url.hash = "";
        url.searchParams.set("join", String(code || roomCode || "").toUpperCase());
        url.searchParams.set("mode", mode);
        if (mode === "web" && getRelayUrl()) url.searchParams.set("relay", getRelayUrl());
        return url.toString();
      } catch (err) {
        return "?join=" + encodeURIComponent(String(code || "").toUpperCase());
      }
    },
    get mode() { return mode; },
    get status() { return status; },
    get role() { return role; },
    get isHost() { return role === "host"; },
    get roomCode() { return roomCode; },
    get selfId() { return selfId; },
    get hostId() { return hostId; },
    get peers() { return peers.slice(); },
    peerName(id) {
      const peer = peers.find((item) => item.id === id);
      return peer ? peer.name : "";
    },
    socketOpen() {
      return !!(socket && socket.readyState === WebSocket.OPEN);
    },
    latencyOf(peerId) {
      const item = latencies.get(peerId);
      return item ? item.ms : null;
    },
    get latency() {
      let worst = null;
      latencies.forEach((item) => {
        if (worst == null || item.ms > worst) worst = item.ms;
      });
      return worst;
    },
    latencyQuality,
  };

  // عند إغلاق الصفحة نغادر الغرفة بلطف.
  window.addEventListener("pagehide", () => {
    if (!roomStarted) return;
    if (mode === "cloud") {
      try {
        if (role === "guest" && hostConn) hostConn.dc.send(JSON.stringify({ t: "__leave" }));
        if (role === "host" && cloudPeer) {
          guestConns.forEach((conn) => {
            if (!channelOpen(conn)) return;
            try { conn.dc.send(JSON.stringify({ t: "__closed", reason: "أغلق المضيف الغرفة." })); } catch (err) { /* ignore */ }
          });
        }
      } catch (err) { /* ignore */ }
      return;
    }
    try { rawSend({ t: "leave" }); } catch (err) { /* ignore */ }
  });
})();
