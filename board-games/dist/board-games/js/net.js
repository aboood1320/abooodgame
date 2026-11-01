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
      if (saved === "lan" || saved === "cloud") return saved;
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
    emit("status", { status: next, detail: detail || null });
  }

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

  function connect() {
    if (mode !== "lan") return Promise.resolve();
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
        ws = new WebSocket(signalUrl());
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
          setStatus("error", "تعذّر الاتصال بخادم الإشارات المحلي. تأكد من فتح الموقع عبر http://localhost:8790/board-games/ وتشغيل server.js");
          reject(new Error("signal-error"));
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

  async function lanCreateRoom(name) {
    await connect();
    const roomPromise = waitForRoom();
    rawSend({ t: "create", name: name || "المضيف" });
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
      emit("peer-joined", msg.peer);
      if (role === "host" && msg.peer && msg.peer.id) ensureGuest(msg.peer.id);
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
      setStatus("connected");
      emit("peer-open", { id: peerId });
    };
    channel.onclose = () => emit("peer-close", { id: peerId });
    channel.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (err) { return; }
      if (!data || typeof data !== "object") return;
      emit("message", { from: peerId, data });
    };
  }

  function ensureGuest(peerId) {
    if (role !== "host" || !peerId || guestConns.has(peerId)) return guestConns.get(peerId) || null;
    const pc = makePeerConnection(peerId);
    const conn = { pc, dc: null, peerId, polite: false };
    guestConns.set(peerId, conn);
    const channel = pc.createDataChannel("bg", { ordered: true });
    bindChannel(conn, channel, peerId);

    emit("peer-state", { id: peerId, state: "connecting" });
    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        rawSend({ t: "signal", to: peerId, data: { sdp: pc.localDescription } });
      } catch (err) {
        console.warn("offer", err);
        emit("error", "تعذّر بدء اتصال WebRTC مع لاعب.");
      }
    })();
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
    if (mode !== "lan" || role !== "host") return;
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
    cloudPeer.on("error", (err) => handleCloudPeerError(err));
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
        finish(reject, new Error("انتهت مهلة الاتصال بالمضيف. تأكد من الرمز وأن المضيف متصل."));
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
    cloudPeer.on("error", (err) => handleCloudPeerError(err));

    try { conn.send(JSON.stringify({ t: "__hello", name: (name || "لاعب").slice(0, 24) })); } catch (err) { /* ignore */ }
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

  async function createRoom(name) {
    if (mode === "cloud") return cloudCreateRoom(name);
    return lanCreateRoom(name);
  }

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
      conn.dc.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  function broadcast(payload, exceptId) {
    if (role !== "host") return 0;
    let count = 0;
    guestConns.forEach((conn, id) => {
      if (exceptId && id === exceptId) return;
      if (!channelOpen(conn)) return;
      try {
        conn.dc.send(JSON.stringify(payload));
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
    if (next !== "lan" && next !== "cloud") return mode;
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

  BG.net = {
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
