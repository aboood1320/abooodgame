/* ==========================================================================
   كاتان — جزيرة الموارد (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const SIZE = 56;
  const HEX_W = Math.sqrt(3) * SIZE;
  const ROW_H = 1.5 * SIZE;
  const BOARD_W = 780;
  const BOARD_H = 560;
  const ORIGIN_X = 390;
  const ORIGIN_Y = 96;

  const RES = {
    wood: { name: "خشب", icon: "🌲", color: "#3f7f4b", light: "#5aa268" },
    brick: { name: "طوب", icon: "🧱", color: "#a8573c", light: "#c47455" },
    sheep: { name: "صوف", icon: "🐑", color: "#7c9b46", light: "#9fbd62" },
    wheat: { name: "قمح", icon: "🌾", color: "#c9a53c", light: "#e0c265" },
    ore: { name: "خام", icon: "🪨", color: "#6b7480", light: "#8b95a2" },
    desert: { name: "صحراء", icon: "🏜️", color: "#c8ac78", light: "#dcc596" },
  };
  const RES_LIST = ["wood", "brick", "sheep", "wheat", "ore"];

  const COSTS = {
    road: { wood: 1, brick: 1 },
    settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
    city: { ore: 3, wheat: 2 },
    dev: { sheep: 1, wheat: 1, ore: 1 },
  };

  const COST_LABEL = {
    road: "خشب + طوب",
    settlement: "خشب + طوب + صوف + قمح",
    city: "3 خام + 2 قمح",
    dev: "صوف + قمح + خام",
  };

  const DEV = {
    knight: { name: "فارس", icon: "⚔️", desc: "حرّك قاطع الطريق واسرق موردًا من لاعب مجاور." },
    vp: { name: "نقطة انتصار", icon: "⭐", desc: "نقطة إضافية مخفية تُحتسب في النهاية." },
    road: { name: "بناء طرق", icon: "🛣️", desc: "ضع طريقين مجانيين على الجزيرة." },
    year: { name: "سنة الوفرة", icon: "🎁", desc: "خذ موردين من اختيارك من البنك." },
    monopoly: { name: "احتكار", icon: "💰", desc: "خذ كل بطاقات نوع واحد من جميع اللاعبين." },
  };

  const DEV_DECK = [
    ...Array(14).fill("knight"),
    ...Array(5).fill("vp"),
    ...Array(2).fill("road"),
    ...Array(2).fill("year"),
    ...Array(2).fill("monopoly"),
  ];

  const PCOLORS = ["#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ffb74d"];

  let geometry = null;
  let state = null;
  let rootRef = null;
  let apiRef = null;
  let aiRunner = null;
  let cpuOps = 0;

  /* ------------------------------ الهندسة ------------------------------ */

  function buildGeometry() {
    const rows = [3, 4, 5, 4, 3];
    const hexes = [];
    const vlist = [];
    const vmap = new Map();
    const elist = [];
    const emap = new Map();
    let hid = 0;

    rows.forEach((count, row) => {
      for (let col = 0; col < count; col++) {
        const cx = ORIGIN_X + (col - (count - 1) / 2) * HEX_W;
        const cy = ORIGIN_Y + row * ROW_H;
        const corners = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i - 30);
          const x = +(cx + SIZE * Math.cos(a)).toFixed(2);
          const y = +(cy + SIZE * Math.sin(a)).toFixed(2);
          const key = x.toFixed(2) + "," + y.toFixed(2);
          if (!vmap.has(key)) {
            const id = vlist.length;
            vmap.set(key, id);
            vlist.push({ id, x, y, hexes: [], adj: [], building: null });
          }
          corners.push(vmap.get(key));
        }
        hexes.push({ id: hid++, row, col, cx, cy, corners, resource: null, number: null });
      }
    });

    hexes.forEach((h) => {
      h.corners.forEach((vid) => {
        if (!vlist[vid].hexes.includes(h.id)) vlist[vid].hexes.push(h.id);
      });
    });

    hexes.forEach((h) => {
      for (let i = 0; i < 6; i++) {
        const a = h.corners[i];
        const b = h.corners[(i + 1) % 6];
        const key = Math.min(a, b) + "-" + Math.max(a, b);
        if (!emap.has(key)) {
          const id = elist.length;
          emap.set(key, id);
          elist.push({ id, a, b, owner: null });
          vlist[a].adj.push(b);
          vlist[b].adj.push(a);
        }
      }
    });

    const vertexEdges = vlist.map(() => []);
    elist.forEach((e) => {
      vertexEdges[e.a].push(e.id);
      vertexEdges[e.b].push(e.id);
    });

    /* الموانئ: 5 موانئ متخصصة 2:1 وأربعة موانئ عامة 3:1 على حواف الساحل. */
    const edgeHexes = new Map();
    hexes.forEach((h) => {
      for (let i = 0; i < 6; i++) {
        const a = h.corners[i];
        const b = h.corners[(i + 1) % 6];
        const key = Math.min(a, b) + "-" + Math.max(a, b);
        const eid = emap.get(key);
        if (!edgeHexes.has(eid)) edgeHexes.set(eid, new Set());
        edgeHexes.get(eid).add(h.id);
      }
    });
    const coast = elist
      .filter((e) => edgeHexes.has(e.id) && edgeHexes.get(e.id).size === 1)
      .sort((a, b) => {
        const ma = midpoint(a);
        const mb = midpoint(b);
        const aa = Math.atan2(ma.y - 280, ma.x - 390);
        const ab = Math.atan2(mb.y - 280, mb.x - 390);
        return aa - ab;
      });
    const harborTypes = ["any", "wood", "any", "sheep", "any", "wheat", "any", "brick", "ore"];
    const harbors = [];
    const used = new Set();
    harborTypes.forEach((type, i) => {
      let idx = Math.round((i * coast.length) / harborTypes.length) % coast.length;
      while (used.has(idx) && used.size < coast.length) idx = (idx + 1) % coast.length;
      used.add(idx);
      const edge = coast[idx];
      if (!edge) return;
      const m = midpoint(edge);
      const dx = m.x - 390;
      const dy = m.y - 280;
      const len = Math.hypot(dx, dy) || 1;
      harbors.push({
        id: i,
        edge: edge.id,
        a: edge.a,
        b: edge.b,
        vertices: [edge.a, edge.b],
        type,
        ratio: type === "any" ? 3 : 2,
        x: m.x + (dx / len) * 23,
        y: m.y + (dy / len) * 23,
        ex: m.x,
        ey: m.y,
      });
    });

    function midpoint(edge) {
      const a = vlist[edge.a];
      const b = vlist[edge.b];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    return { hexes, vertices: vlist, edges: elist, edgeMap: emap, vertexEdges, harbors };
  }

  function polygonPoints(hex) {
    return hex.corners.map((vid) => {
      const v = geometry.vertices[vid];
      return v.x.toFixed(1) + "," + v.y.toFixed(1);
    }).join(" ");
  }

  function setupResources() {
    const pool = [
      ...Array(4).fill("wood"),
      ...Array(4).fill("sheep"),
      ...Array(4).fill("wheat"),
      ...Array(3).fill("brick"),
      ...Array(3).fill("ore"),
      "desert",
    ];
    const shuffled = U.shuffle(pool);
    const numbers = U.shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
    geometry.hexes.forEach((h, i) => { h.resource = shuffled[i]; h.number = null; });
    let n = 0;
    geometry.hexes.forEach((h) => {
      if (h.resource !== "desert") h.number = numbers[n++];
    });
    const desert = geometry.hexes.find((h) => h.resource === "desert");
    return desert ? desert.id : 0;
  }

  /* ------------------------------ اللعبة ------------------------------ */

  const game = {
    id: "catan",
    name: "كاتان",
    en: "CATAN",
    icon: "🏝️",
    accent: "#e0a23b",
    cardClass: "card-catan",
    tagline: "اجمع الموارد، ابنِ المستوطنات والمدن، وسيطر على الجزيرة.",
    players: "3–4",
    duration: "60–90 دقيقة",
    complexity: "متوسطة–مرتفعة",
    minPlayers: 3,
    maxPlayers: 4,
    defaultPlayers: 3,

    rules: {
      goal: "أن تكون أول لاعب يصل إلى 10 نقاط انتصار. النقاط تأتي من المستوطنات (1)، المدن (2)، بطاقات نقطة الانتصار، وأكبر جيش وأطول طريق (2 لكل منهما).",
      facts: [["النقاط للفوز", "10 نقاط"], ["النرد", "نردان لكل دور"], ["الموارد", "5 أنواع"], ["قاطع الطريق", "يُفعّل عند 7"]],
      components: [
        "جزيرة من 19 حقلًا: غابات (خشب)، تلال (طوب)، مراعٍ (صوف)، حقول (قمح)، جبال (خام)، وصحراء واحدة.",
        "أرقام إنتاج من 2 إلى 12 موزعة على الحقول، وقاطع طريق يبدأ في الصحراء.",
        "54 تقاطعًا و72 طريقًا لبناء المستوطنات والمدن والطرق.",
        "25 بطاقة تطور: فرسان، نقاط انتصار، بناء طرق، سنة الوفرة، واحتكار.",
        "موارد لكل لاعب تُخفي عن الآخرين، وبطاقات تطور سرّية.",
      ],
      setup: [
        "توزّع الموارد والأرقام عشوائيًا على الحقول، ويوضع قاطع الطريق على الصحراء.",
        "يضع اللاعب الأول مستوطنة ثم طريقًا بجوارها، ثم ينتقل الدور للاعب التالي، ثم يعود بالترتيب المعاكس لوضع مستوطنة وطريق ثانٍ.",
        "عند وضع المستوطنة الثانية يستلم اللاعب موردًا واحدًا عن كل حقل مجاور لها (عدا الصحراء).",
        "بعد انتهاء الإعداد يبدأ اللاعب الأول برمي النرد.",
      ],
      steps: [
        "<strong>رمي النرد:</strong> في بداية دورك ارمِ نردين. مجموع النقاط يحدد الحقول التي تنتج موارد هذا الدور.",
        "<strong>الإنتاج:</strong> كل مستوطنة مجاورة لحقل منتج تأخذ موردًا واحدًا، وكل مدينة تأخذ موردين. الحقل الذي يقف عليه قاطع الطريق لا ينتج.",
        "<strong>الرقم 7:</strong> لا ينتج أي حقل. كل لاعب يملك أكثر من 7 بطاقات موارد يتخلص من نصفها (بالأرضية)، ثم يحرّك اللاعب الحالي قاطع الطريق إلى حقل آخر ويسرق موردًا عشوائيًا من لاعب مجاور.",
        "<strong>البناء:</strong> طريق = خشب + طوب. مستوطنة = خشب + طوب + صوف + قمح. مدينة = 3 خام + 2 قمح (ترقية مستوطنة). بطاقة تطور = صوف + قمح + خام.",
        "<strong>شرط البناء:</strong> المستوطنة يجب أن تكون على تقاطع فارغ يبعد تقاطعًا واحدًا على الأقل عن أي مستوطنة أو مدينة، ومتصلة بطريق تملكه. الطريق يجب أن يتصل ببناء أو طريق تملكه، ولا يمكن أن يمر عبر بناء خصم.",
        "<strong>المدن:</strong> ترفع إنتاج الحقول المجاورة من مورد إلى موردين، وتساوي نقطتين بدل نقطة واحدة.",
        "<strong>التجارة:</strong> يمكنك في أي وقت خلال دورك تبديل 4 بطاقات من مورد واحد مقابل بطاقة واحدة من أي مورد من البنك. إذا ملكت ميناءً عامًا (3:1) تصبح النسبة 3 مقابل 1، وإذا ملكت ميناءً متخصصًا (2:1) تصبح النسبة 2 مقابل 1 لذلك المورد. تملك الميناء بمجرد بناء مستوطنة أو مدينة على أحد تقاطعي الميناء.",
        "<strong>بطاقات التطور:</strong> تُشترى ثم تبقى سرّية. يمكن لعب بطاقة واحدة فقط في الدور (بعد انقضاء دور شرائها)، وهي: الفارس، بناء طريقين، سنة الوفرة، الاحتكار، أو نقطة انتصار.",
        "<strong>الفارس:</strong> يحرّك قاطع الطريق ويسرق موردًا. ثلاثة فرسان تمنحك أكبر جيش (نقطتان) ما دمت متقدمًا على الجميع.",
        "<strong>أطول طريق:</strong> خمسة طرق متصلة على الأقل تمنحك نقطتين، وتنتقل منك إذا تجاوزها لاعب آخر بطريق أطول.",
        "<strong>إنهاء الدور:</strong> بعد البناء والتجارة اضغط «إنهاء الدور»، ثم ينتقل الدور للاعب التالي ويبدأ برمي النرد.",
      ],
      winning: "أول لاعب يصل إلى 10 نقاط انتصار في بداية دوره أو بعد أي إجراء يفوز فورًا. تُحتسب نقاط المستوطنات والمدن وبطاقات الانتصار وأكبر جيش وأطول طريق.",
      notes: [
        "الموانئ مفعّلة: خمسة موانئ متخصصة 2:1 وأربعة موانئ عامة 3:1 موزعة على الساحل. يملك اللاعب الميناء إذا بنى مستوطنة أو مدينة على أحد تقاطعي حافتها.",
        "الرقعة تحتوي على 19 حقلًا: 4 خشب، 4 صوف، 4 قمح، 3 طوب، 3 خام، وصحراء واحدة.",
        "تُخفى موارد اللاعبين وبطاقات تطورهم خلف زر «إظهار» وتُخفى تلقائيًا عند انتقال الدور.",
        "القرص عند الرقم 7 يتم تلقائيًا وبشكل عشوائي حفاظًا على سرّية البطاقات.",
        "لا يمكن لعب بطاقة تطور اشتريتها في نفس الدور، باستثناء كشف بطاقة نقطة الانتصار في نهاية اللعبة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      cpuOps = 0;
      if (!geometry) geometry = buildGeometry();
      const robber = setupResources();

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        profile: p.profile,
        avatar: p.avatar,
        profileColor: p.profileColor || "",
        res: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        dev: [],
        knights: 0,
        vpCards: 0,
        hasLongest: false,
        hasArmy: false,
        settlements: 0,
        cities: 0,
      }));

      const queue = [];
      const n = players.length;
      for (let i = 0; i < n; i++) {
        queue.push({ p: i, kind: "settlement", second: false });
        queue.push({ p: i, kind: "road", second: false });
      }
      for (let i = n - 1; i >= 0; i--) {
        queue.push({ p: i, kind: "settlement", second: true });
        queue.push({ p: i, kind: "road", second: true });
      }

      state = {
        players,
        current: queue[0].p,
        phase: "setup",
        queue,
        setupIndex: 0,
        setupVertex: null,
        dice: null,
        robber,
        mode: null,
        freeRoads: 0,
        devPlayed: false,
        turnCounter: 0,
        deck: U.shuffle(DEV_DECK.slice()),
        lastProduction: "",
        fxBuild: null,
        notice: "الإعداد: ضع مستوطنتك الأولى على تقاطع، ثم طريقًا مجاورًا.",
        over: false,
        revealActive: false,
        knightActive: false,
        robberReturn: "action",
        logSetupStep: true,
      };

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get geometry() { return geometry; },
          render, rollDice, buildRoad, buildSettlement, buildCity, buyDev, playDev,
          placeRobber, endTurn, computeLongest, updateBonuses, checkVictory,
          buyDevCard: buyDev, pay, canPay, addRes, setupPlaceSettlement, setupPlaceRoad,
          openTrade, discardHalf, productionFor, stealFrom, finishRobber, enterMode,
          totalVP, publicVP,
        };
      }

      api.log("بدأت كاتان — <strong>" + players.length + "</strong> لاعبين على الجزيرة.");
      render();
      setupLog();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.mode = null;
          state.fxBuild = null;
          state.revealActive = false;
          state.knightActive = false;
          state.robberReturn = "action";
          state.queue = Array.isArray(state.queue) ? state.queue : [];
          if (!state.queue.length && state.players) {
            state.queue = [{ p: state.current, kind: "settlement", second: true }];
            state.setupIndex = 0;
          }
          render();
        },
        netSeat() {
          if (!state) return -1;
          if (state.phase === "setup") {
            const entry = state.queue && state.queue[state.setupIndex];
            return entry ? entry.p : -1;
          }
          return state.current;
        },
        netOver() {
          return !!(state && state.over);
        },
        netResume() {
          if (!state) return;
          render();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
        },
      };
    },
  };

  function setupLog() {
    const entry = state.queue[state.setupIndex];
    if (!entry) return;
    apiRef.log("الإعداد: على <strong>" + U.escape(state.players[entry.p].name) + "</strong> وضع " + (entry.kind === "road" ? "طريق" : "مستوطنة") + (entry.second ? " ثانية" : " أولى") + ".", "accent");
  }

  /* ------------------------------ أدوات الموارد ------------------------------ */

  function cur() { return state.players[state.current]; }

  function isOnline() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function viewerSeat() {
    if (isOnline()) return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
    return state ? state.current : -1;
  }

  function viewerPlayer() {
    const index = viewerSeat();
    return state && index >= 0 && state.players[index] ? state.players[index] : null;
  }

  function addRes(p, res, n) {
    p.res[res] = Math.max(0, (p.res[res] || 0) + (n == null ? 1 : n));
  }

  function totalRes(p) {
    return RES_LIST.reduce((sum, r) => sum + (p.res[r] || 0), 0);
  }

  function canPay(p, cost) {
    return Object.entries(cost).every(([r, n]) => (p.res[r] || 0) >= n);
  }

  function pay(p, cost) {
    if (!canPay(p, cost)) return false;
    Object.entries(cost).forEach(([r, n]) => { p.res[r] -= n; });
    return true;
  }

  function publicVP(p) {
    return p.settlements + p.cities * 2 + (p.hasLongest ? 2 : 0) + (p.hasArmy ? 2 : 0);
  }

  function totalVP(p) {
    return publicVP(p) + p.vpCards;
  }

  function roadCount(p) {
    return geometry.edges.filter((e) => e.owner === p.index).length;
  }

  /* ------------------------------ الشرعية ------------------------------ */

  function validSettlement(vi, pi, setup) {
    const v = geometry.vertices[vi];
    if (v.building) return false;
    if (v.adj.some((n) => geometry.vertices[n].building)) return false;
    if (setup) return true;
    return geometry.vertexEdges[vi].some((eid) => geometry.edges[eid].owner === pi);
  }

  function validCity(vi, pi) {
    const v = geometry.vertices[vi];
    return !!(v.building && v.building.owner === pi && v.building.type === "settlement");
  }

  function validRoad(eid, pi, setupVertex) {
    const edge = geometry.edges[eid];
    if (!edge || edge.owner != null) return false;
    if (setupVertex != null) return edge.a === setupVertex || edge.b === setupVertex;
    const a = geometry.vertices[edge.a];
    const b = geometry.vertices[edge.b];
    const enemyAtEnd = (a.building && a.building.owner !== pi) || (b.building && b.building.owner !== pi);
    if (enemyAtEnd) return false;
    if ((a.building && a.building.owner === pi) || (b.building && b.building.owner === pi)) return true;
    return geometry.vertexEdges[edge.a].some((id) => id !== eid && geometry.edges[id].owner === pi) ||
      geometry.vertexEdges[edge.b].some((id) => id !== eid && geometry.edges[id].owner === pi);
  }

  /* ------------------------------ أطول طريق ------------------------------ */

  function computeLongest(pi) {
    const owned = geometry.edges.filter((e) => e.owner === pi);
    if (!owned.length) return 0;
    const blocked = new Set(
      geometry.vertices.filter((v) => v.building && v.building.owner !== pi).map((v) => v.id)
    );
    const starts = new Set();
    owned.forEach((e) => { starts.add(e.a); starts.add(e.b); });
    const visited = new Set();
    let best = 0;
    let ops = 0;

    function dfs(v, depth) {
      if (depth > best) best = depth;
      if (ops++ > 160000) return;
      for (const eid of geometry.vertexEdges[v]) {
        const e = geometry.edges[eid];
        if (e.owner !== pi || visited.has(eid)) continue;
        const nv = e.a === v ? e.b : e.a;
        visited.add(eid);
        if (!blocked.has(nv)) dfs(nv, depth + 1);
        else if (depth + 1 > best) best = depth + 1;
        visited.delete(eid);
      }
    }

    starts.forEach((v) => {
      if (!blocked.has(v)) {
        visited.clear();
        dfs(v, 0);
      }
    });
    return best;
  }

  function updateBonuses() {
    // أكبر جيش
    const armyHolder = state.players.find((p) => p.hasArmy);
    const armyBest = state.players.slice().sort((a, b) => b.knights - a.knights)[0];
    if (!armyHolder) {
      if (armyBest && armyBest.knights >= 3) {
        armyBest.hasArmy = true;
        apiRef.log("حصل <strong>" + U.escape(armyBest.name) + "</strong> على أكبر جيش (نقطتان).", "accent");
      }
    } else if (armyBest && armyBest.knights > armyHolder.knights) {
      armyHolder.hasArmy = false;
      armyBest.hasArmy = true;
      apiRef.log("انتقل أكبر جيش إلى <strong>" + U.escape(armyBest.name) + "</strong>.", "accent");
    }

    // أطول طريق
    const lengths = state.players.map((p) => ({ p, len: computeLongest(p.index) }));
    const holder = state.players.find((p) => p.hasLongest);
    const best = lengths.slice().sort((a, b) => b.len - a.len)[0];
    if (!holder) {
      if (best && best.len >= 5) {
        best.p.hasLongest = true;
        apiRef.log("حصل <strong>" + U.escape(best.p.name) + "</strong> على أطول طريق بطول " + best.len + " (نقطتان).", "accent");
      }
    } else if (best && best.len > computeLongest(holder.index)) {
      holder.hasLongest = false;
      best.p.hasLongest = true;
      apiRef.log("انتقل أطول طريق إلى <strong>" + U.escape(best.p.name) + "</strong> بطول " + best.len + ".", "accent");
    } else if (computeLongest(holder.index) < 5) {
      holder.hasLongest = false;
      apiRef.log("فقد <strong>" + U.escape(holder.name) + "</strong> أطول طريق.", "warn");
    }
  }

  /* ------------------------------ الدور والإنتاج ------------------------------ */

  function productionFor(total) {
    if (!geometry) return;
    const gains = {};
    geometry.hexes.forEach((h) => {
      if (h.number !== total || h.id === state.robber) return;
      if (!h.resource || h.resource === "desert") return;
      h.corners.forEach((vid) => {
        const v = geometry.vertices[vid];
        if (!v.building) return;
        const amount = v.building.type === "city" ? 2 : 1;
        const p = state.players[v.building.owner];
        addRes(p, h.resource, amount);
        if (!gains[h.resource]) gains[h.resource] = 0;
        gains[h.resource] += amount;
      });
    });
    const parts = RES_LIST.filter((r) => gains[r]).map((r) => RES[r].icon + " " + RES[r].name + " ×" + gains[r]);
    state.lastProduction = parts.length ? parts.join(" · ") : "لا إنتاج";
    if (parts.length) {
      apiRef.log("إنتاج النرد: " + parts.join(" · ") + ".", "good");
      if (FX) {
        FX.sound("resource");
        FX.after(() => FX.pop(rootRef && rootRef.querySelector(".cat-banner")), 60);
      }
    }
  }

  function discardHalf(p) {
    let total = totalRes(p);
    if (total <= 7) return 0;
    let need = Math.floor(total / 2);
    const discarded = need;
    while (need > 0) {
      const avail = RES_LIST.filter((r) => p.res[r] > 0);
      if (!avail.length) break;
      const r = U.pick(avail);
      p.res[r]--;
      need--;
    }
    return discarded;
  }

  function rollDice() {
    if (state.over || state.phase !== "roll") return;
    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    if (FX) {
      FX.sound("dice");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".cat-dice")), 30);
    }
    const total = d1 + d2;
    apiRef.log("<strong>" + U.escape(cur().name) + "</strong> رمى النرد: " + d1 + " + " + d2 + " = <strong>" + total + "</strong>.");

    if (total === 7) {
      let dropped = 0;
      state.players.forEach((p) => { dropped += discardHalf(p); });
      state.phase = "robber";
      state.robberReturn = "action";
      state.notice = "رقم 7! " + (dropped ? "تخلّص اللاعبون من " + dropped + " بطاقة زائدة. " : "") + "اختر حقلًا جديدًا لقاطع الطريق.";
      apiRef.log("ظهر 7 — يُنقل قاطع الطريق ويُسرق مورد من لاعب مجاور.", "warn");
      render();
      return;
    }

    productionFor(total);
    state.phase = "action";
    state.notice = "الإنتاج: " + (state.lastProduction || "لا إنتاج") + ". يمكنك البناء أو التجارة ثم إنهاء الدور.";
    render();
  }

  /* ------------------------------ البناء ------------------------------ */

  function playBuildFx(label) {
    if (!FX) return;
    FX.sound("build");
    FX.after(() => {
      const el = rootRef && rootRef.querySelector(".cat-built.is-fresh");
      if (el) {
        FX.pop(el);
        FX.floatText(el, label, "good");
        el.classList.remove("is-fresh");
      }
      state.fxBuild = null;
    }, 50);
  }

  function enterMode(mode, cost) {
    if (state.over || state.phase !== "action") {
      BG.toast("انتظر دورك أو أكمل خطوة الإعداد.", "warn");
      return;
    }
    if (cost && !canPay(cur(), cost)) {
      BG.toast("مواردك لا تكفي. تحتاج: " + COST_LABEL[cost] + ".", "warn");
      return;
    }
    state.mode = state.mode === mode ? null : mode;
    state.notice = state.mode ? "اختر موقعًا على الجزيرة لتنفيذ البناء." : "أُلغي وضع البناء.";
    render();
  }

  function buildRoad(eid, free) {
    const p = cur();
    const ok = free || canPay(p, COSTS.road);
    if (!ok) { BG.toast("تحتاج خشبًا وطوبًا لبناء طريق.", "warn"); return false; }
    if (!validRoad(eid, p.index, null)) { BG.toast("لا يمكن بناء الطريق هنا.", "warn"); return false; }
    if (!free) pay(p, COSTS.road);
    geometry.edges[eid].owner = p.index;
    state.fxBuild = { kind: "road", id: eid };
    apiRef.log("بنى <strong>" + U.escape(p.name) + "</strong> طريقًا.", "good");
    state.mode = null;
    state.notice = "بنيت طريقًا. يمكنك مواصلة البناء أو التجارة ثم إنهاء الدور.";
    updateBonuses();
    checkVictory();
    if (!state.over) render();
    playBuildFx("طريق");
    return true;
  }

  function buildSettlement(vi) {
    const p = cur();
    if (!canPay(p, COSTS.settlement)) { BG.toast("تحتاج خشبًا وطوبًا وصوفًا وقمحًا لبناء مستوطنة.", "warn"); return false; }
    if (!validSettlement(vi, p.index, false)) { BG.toast("التقاطع غير صالح: يجب أن يبعد عن مستوطنة أخرى وأن يتصل بطريق تملكه.", "warn"); return false; }
    pay(p, COSTS.settlement);
    geometry.vertices[vi].building = { owner: p.index, type: "settlement" };
    p.settlements++;
    state.fxBuild = { kind: "settlement", id: vi };
    apiRef.log("بنى <strong>" + U.escape(p.name) + "</strong> مستوطنة جديدة.", "good");
    state.mode = null;
    state.notice = "بنيت مستوطنة (+1 نقطة).";
    updateBonuses();
    checkVictory();
    if (!state.over) render();
    playBuildFx("+1 نقطة");
    return true;
  }

  function buildCity(vi) {
    const p = cur();
    if (!canPay(p, COSTS.city)) { BG.toast("تحتاج 3 خام و2 قمح لبناء مدينة.", "warn"); return false; }
    if (!validCity(vi, p.index)) { BG.toast("اختر مستوطنة تملكها لترقيتها إلى مدينة.", "warn"); return false; }
    pay(p, COSTS.city);
    geometry.vertices[vi].building = { owner: p.index, type: "city" };
    p.settlements--;
    p.cities++;
    state.fxBuild = { kind: "settlement", id: vi };
    apiRef.log("رقّى <strong>" + U.escape(p.name) + "</strong> مستوطنة إلى مدينة.", "good");
    state.mode = null;
    state.notice = "رقّيت مستوطنة إلى مدينة (+2 نقطة بدلًا من 1).";
    updateBonuses();
    checkVictory();
    if (!state.over) render();
    playBuildFx("+2 نقطة");
    return true;
  }

  /* ------------------------------ بطاقات التطور ------------------------------ */

  function buyDev() {
    if (state.over || state.phase !== "action") return;
    const p = cur();
    if (!canPay(p, COSTS.dev)) { BG.toast("تحتاج صوفًا وقمحًا وخامًا لشراء بطاقة تطور.", "warn"); return; }
    if (!state.deck.length) { BG.toast("نفدت بطاقات التطور.", "warn"); return; }
    pay(p, COSTS.dev);
    const type = state.deck.pop();
    p.dev.push({ type, boughtOn: state.turnCounter });
    apiRef.log("اشترى <strong>" + U.escape(p.name) + "</strong> بطاقة تطور. محتواها سرّي.", "accent");
    BG.toast("سحبت بطاقة تطور — افتح «معلوماتك السرّية» لرؤيتها.", "good");
    state.notice = "اشترِت بطاقة تطور. يمكنك رؤيتها في لوحة معلوماتك السرّية.";
    if (FX) {
      FX.sound("card");
      FX.after(() => FX.pop(rootRef && rootRef.querySelector(".cat-secret .secret-head")), 45);
    }
    render();
  }

  function canPlayDev(p, card) {
    if (state.devPlayed) return false;
    if (card.type === "vp") return true;
    return card.boughtOn < state.turnCounter;
  }

  function playDev(index) {
    if (state.over || state.phase !== "action") return;
    const p = cur();
    const card = p.dev[index];
    if (!card) return;
    if (!canPlayDev(p, card)) {
      BG.toast(card.type === "vp" ? "لا يمكن لعبها الآن." : "لا يمكن لعب بطاقة اشتريتها هذا الدور.", "warn");
      return;
    }
    const info = DEV[card.type];

    if (card.type === "vp") {
      p.dev.splice(index, 1);
      p.vpCards++;
      state.notice = "كشفت بطاقة نقطة انتصار سرّية (+1).";
      apiRef.log("كشف <strong>" + U.escape(p.name) + "</strong> بطاقة نقطة انتصار.", "accent");
      if (FX) FX.sound("reveal");
      checkVictory();
      if (!state.over) render();
      return;
    }

    if (card.type === "year") {
      openYear(p, index);
      return;
    }

    if (card.type === "monopoly") {
      openMonopoly(p, index);
      return;
    }

    p.dev.splice(index, 1);
    state.devPlayed = true;

    if (card.type === "knight") {
      p.knights++;
      state.knightActive = true;
      state.phase = "robber";
      state.robberReturn = "action";
      state.notice = "لعبت فارسًا — اختر حقلًا جديدًا لقاطع الطريق.";
      apiRef.log("لعب <strong>" + U.escape(p.name) + "</strong> بطاقة فارس وحرّك قاطع الطريق.", "accent");
      if (FX) FX.sound("card");
      render();
      return;
    }

    if (card.type === "road") {
      state.freeRoads = 2;
      state.mode = "road";
      state.notice = "بطاقة بناء الطرق: ضع طريقين مجانيين.";
      apiRef.log("لعب <strong>" + U.escape(p.name) + "</strong> بطاقة بناء الطرق (طريقان مجانًا).", "accent");
      if (FX) FX.sound("card");
      render();
      return;
    }

    render();
    BG.toast("لعبت " + info.name + ".");
  }

  function resourceOptions() {
    return RES_LIST.map((r) => '<option value="' + r + '">' + RES[r].icon + " " + RES[r].name + "</option>").join("");
  }

  function openYear(p, index) {
    const body = BG.el("div", { class: "trade-form" });
    body.innerHTML =
      '<p class="trade-note">اختر موردين من البنك. يمكن أن يكونا من النوع نفسه.</p>' +
      '<div class="trade-grid">' +
      '<label class="trade-field"><span>المورد الأول</span><select name="r1">' + resourceOptions() + "</select></label>" +
      '<label class="trade-field"><span>المورد الثاني</span><select name="r2">' + resourceOptions() + "</select></label>" +
      "</div>";
    BG.openDialog({
      title: "🎁 سنة الوفرة",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "خذ الموردين",
          primary: true,
          onClick: ({ close }) => {
            const r1 = body.querySelector('[name="r1"]').value;
            const r2 = body.querySelector('[name="r2"]').value;
            p.dev.splice(index, 1);
            state.devPlayed = true;
            addRes(p, r1, 1);
            addRes(p, r2, 1);
            apiRef.log("أخذ <strong>" + U.escape(p.name) + "</strong> " + RES[r1].name + " و" + RES[r2].name + " ببطاقة سنة الوفرة.", "good");
            state.notice = "أخذت " + RES[r1].icon + " " + RES[r1].name + " و" + RES[r2].icon + " " + RES[r2].name + ".";
            close();
            render();
            if (FX) {
              FX.sound("resource");
              FX.after(() => FX.floatText(rootRef && rootRef.querySelector(".cat-banner"), "+2 موارد", "good"), 45);
            }
          },
        },
      ],
    });
  }

  function openMonopoly(p, index) {
    const body = BG.el("div", { class: "trade-form" });
    body.innerHTML =
      '<p class="trade-note">اختر نوع المورد. ستأخذ كل بطاقات هذا النوع من جميع اللاعبين.</p>' +
      '<div class="trade-grid"><label class="trade-field"><span>المورد</span><select name="r">' + resourceOptions() + "</select></label></div>";
    BG.openDialog({
      title: "💰 احتكار",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "نفّذ الاحتكار",
          primary: true,
          onClick: ({ close }) => {
            const r = body.querySelector('[name="r"]').value;
            let taken = 0;
            state.players.forEach((other) => {
              if (other.index === p.index) return;
              taken += other.res[r] || 0;
              addRes(p, r, other.res[r] || 0);
              other.res[r] = 0;
            });
            p.dev.splice(index, 1);
            state.devPlayed = true;
            apiRef.log("احتكر <strong>" + U.escape(p.name) + "</strong> " + RES[r].name + " وأخذ " + taken + " بطاقة من الخصوم.", "accent");
            state.notice = "احتكار " + RES[r].name + ": أخذت " + taken + " بطاقة.";
            close();
            render();
            if (FX) {
              FX.sound("coin");
              FX.after(() => FX.floatText(rootRef && rootRef.querySelector(".cat-banner"), "+" + taken, "good"), 45);
            }
          },
        },
      ],
    });
  }

  /* ------------------------------ التجارة ------------------------------ */

  /** الموانئ التي يملك اللاعب مستوطنة أو مدينة على أحد طرفيها. */
  function ownedHarbors(p) {
    return (geometry.harbors || []).filter((h) => {
      const va = geometry.vertices[h.a] && geometry.vertices[h.a].building;
      const vb = geometry.vertices[h.b] && geometry.vertices[h.b].building;
      return (va && va.owner === p.index) || (vb && vb.owner === p.index);
    });
  }

  /** أفضل نسبة تبديل متاحة للمورد: 2:1 للميناء المتخصص، ثم 3:1 للعام، ثم 4:1. */
  function bestTradeRatio(p, resource) {
    let ratio = 4;
    ownedHarbors(p).forEach((h) => {
      if (h.type === "any" || h.type === resource) ratio = Math.min(ratio, h.ratio);
    });
    return ratio;
  }

  function harborLabel(h) {
    return h.type === "any" ? "ميناء عام 3:1" : "ميناء " + RES[h.type].name + " 2:1";
  }

  function openTrade() {
    if (state.over || state.phase !== "action") return;
    const p = cur();
    const body = BG.el("div", { class: "trade-form" });
    const ratioOf = (r) => bestTradeRatio(p, r);
    body.innerHTML =
      '<p class="trade-note">اختر المورد الذي تعطيه؛ تحدد موانئك النسبة: 2:1 للميناء المتخصص، 3:1 للميناء العام، و4:1 مع البنك.</p>' +
      '<div class="trade-grid">' +
      '<label class="trade-field"><span>أعطِ</span><select name="give">' +
      RES_LIST.map((r) => '<option value="' + r + '">' + RES[r].icon + " " + RES[r].name + " (لديك " + (p.res[r] || 0) + " · " + ratioOf(r) + ":1)" + "</option>").join("") +
      "</select></label>" +
      '<label class="trade-field"><span>خذ 1 من</span><select name="take">' +
      RES_LIST.map((r) => '<option value="' + r + '">' + RES[r].icon + " " + RES[r].name + "</option>").join("") +
      "</select></label>" +
      "</div>" +
      '<p class="trade-note trade-ratio" name="ratioNote"></p>' +
      (ownedHarbors(p).length
        ? '<p class="trade-note trade-harbors">⚓ موانئك: ' + ownedHarbors(p).map(harborLabel).join(" · ") + "</p>"
        : '<p class="trade-note trade-harbors">⚓ لا تملك ميناءً بعد — ابنِ مستوطنة على تقاطع ساحلي بجوار رمز الميناء.</p>');
    const giveSel = body.querySelector('[name="give"]');
    const ratioNote = body.querySelector('[name="ratioNote"]');
    const refreshRatio = () => {
      const give = giveSel.value;
      const ratio = ratioOf(give);
      const harbor = ownedHarbors(p).find((h) => h.type === give) || ownedHarbors(p).find((h) => h.type === "any");
      ratioNote.innerHTML = "💱 تعطي <strong>" + ratio + " " + RES[give].icon + " " + RES[give].name + "</strong> مقابل بطاقة واحدة" +
        (harbor ? " — عبر " + harborLabel(harbor) + "." : " — تجارة بنكية 4:1.");
      ratioNote.classList.toggle("is-good", ratio < 4);
    };
    giveSel.addEventListener("change", refreshRatio);
    refreshRatio();
    BG.openDialog({
      title: "🏦 التجارة مع البنك والموانئ",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "تبديل",
          primary: true,
          onClick: ({ close }) => {
            const give = giveSel.value;
            const take = body.querySelector('[name="take"]').value;
            const ratio = ratioOf(give);
            if (give === take) { BG.toast("لا فائدة من تبديل المورد بنفسه.", "warn"); return; }
            if ((p.res[give] || 0) < ratio) { BG.toast("تحتاج " + ratio + " بطاقات من " + RES[give].name + ".", "warn"); return; }
            p.res[give] -= ratio;
            addRes(p, take, 1);
            apiRef.log("بادل <strong>" + U.escape(p.name) + "</strong> " + ratio + " " + RES[give].name + " مقابل " + RES[take].name + ".", "good");
            state.notice = "بادلت " + ratio + " " + RES[give].name + " مقابل " + RES[take].name + ".";
            close();
            render();
            if (FX) {
              FX.sound("resource");
              FX.after(() => FX.floatText(rootRef && rootRef.querySelector(".cat-banner"), "+1 " + RES[take].name, "good"), 45);
            }
          },
        },
      ],
    });
  }

  /* ------------------------------ قاطع الطريق ------------------------------ */

  function adjacentVictims(hexId) {
    const hex = geometry.hexes[hexId];
    const ids = new Set();
    hex.corners.forEach((vid) => {
      const b = geometry.vertices[vid].building;
      if (b && b.owner !== state.current) ids.add(b.owner);
    });
    return [...ids]
      .map((i) => state.players[i])
      .filter((p) => totalRes(p) > 0);
  }

  function placeRobber(hexId) {
    if (state.over || state.phase !== "robber") return;
    if (hexId === state.robber) { BG.toast("حرّك قاطع الطريق إلى حقل آخر.", "warn"); return; }
    state.robber = hexId;
    const hex = geometry.hexes[hexId];
    apiRef.log("وضع <strong>" + U.escape(cur().name) + "</strong> قاطع الطريق على " + RES[hex.resource].name + ".", "warn");
    if (FX) {
      FX.sound("robber");
      FX.after(() => {
        const pin = rootRef && rootRef.querySelector(".cat-robber-pin");
        if (pin) { FX.pop(pin); FX.shake(pin); }
      }, 55);
    }
    const victims = adjacentVictims(hexId);
    if (AI.isCpu(cur())) {
      if (!victims.length) {
        state.notice = "لا يوجد لاعب مجاور يملك موارد لسرقتها.";
        finishRobber();
        return;
      }
      const best = victims.slice().sort((a, b) => totalRes(b) - totalRes(a))[0];
      stealFrom(best);
      return;
    }
    if (!victims.length) {
      state.notice = "لا يوجد لاعب مجاور يملك موارد لسرقتها.";
      finishRobber();
      return;
    }
    if (victims.length === 1) {
      stealFrom(victims[0]);
      return;
    }
    const buttons = victims.map((v) => ({
      label: "اسرق من " + v.name,
      onClick: ({ close }) => { close(); stealFrom(v); },
    }));
    buttons.push({ label: "تخطَّ السرقة", value: "skip" });
    state.phase = "stealing";
    render();
    BG.openDialog({
      title: "🕵️ اختر ضحية",
      body: "<p>هناك أكثر من لاعب مجاور لقاطع الطريق. اختر من تسرق منه موردًا عشوائيًا.</p>",
      actions: buttons,
    }).promise.then((value) => {
      if (value === "skip" || !value) finishRobber();
    });
  }

  function stealFrom(victim) {
    const avail = RES_LIST.filter((r) => (victim.res[r] || 0) > 0);
    if (!avail.length) { finishRobber(); return; }
    const r = U.pick(avail);
    victim.res[r]--;
    addRes(cur(), r, 1);
    apiRef.log("سرق قاطع الطريق موردًا من <strong>" + U.escape(victim.name) + "</strong>.", "warn");
    state.notice = "سرقت موردًا من " + victim.name + " (راجع معلوماتك السرّية).";
    finishRobber();
  }

  function finishRobber() {
    if (state.phase !== "robber" && state.phase !== "stealing") return;
    state.phase = "action";
    state.mode = null;
    if (state.knightActive) {
      state.knightActive = false;
      updateBonuses();
      checkVictory();
    }
    if (!state.over) render();
  }

  /* ------------------------------ إنهاء الدور ------------------------------ */

  function endTurn() {
    if (state.over || state.phase !== "action") return;
    state.mode = null;
    state.freeRoads = 0;
    state.devPlayed = false;
    state.dice = null;
    state.revealActive = false;
    state.turnCounter++;
    state.current = (state.current + 1) % state.players.length;
    state.phase = "roll";
    state.notice = "دور " + state.players[state.current].name + " — ارمِ النرد.";
    if (FX) FX.sound("turn");
    render();
  }

  function checkVictory() {
    if (state.over || state.phase === "setup") return;
    const winner = state.players.find((p) => totalVP(p) >= 10);
    if (!winner) return;
    state.over = true;
    state.phase = "over";
    const standings = state.players
      .slice()
      .sort((a, b) => totalVP(b) - totalVP(a))
      .map((p) => ({
        name: p.name,
        value: totalVP(p) + " نقطة" + (p.vpCards ? " (منها " + p.vpCards + " سرّية)" : ""),
      }));
    apiRef.log("فاز <strong>" + U.escape(winner.name) + "</strong> بـ" + totalVP(winner) + " نقطة!", "good");
    render();
    if (FX) FX.win();
    apiRef.gameOver({
      icon: "🏝️",
      title: "انتهت كاتان",
      text: "أول من وصل إلى 10 نقاط انتصار يسيطر على الجزيرة.",
      winner: winner.name,
      standings,
    });
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  const PIP_VALUE = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

  function vertexPotential(vi) {
    const v = geometry.vertices[vi];
    let score = 0;
    const seen = {};
    v.hexes.forEach((id) => {
      const h = geometry.hexes[id];
      const pips = PIP_VALUE[h.number] || 0;
      if (!pips || !h.resource || h.resource === "desert") return;
      const weight = h.resource === "ore" ? 1.25 : h.resource === "wheat" ? 1.15 : 1;
      score += pips * weight;
      if (!seen[h.resource]) {
        seen[h.resource] = true;
        score += pips * 0.45;
      }
    });
    return score;
  }

  function cpuBestVertex(player, setup, city) {
    const pi = player.index;
    const spots = [];
    for (let vi = 0; vi < geometry.vertices.length; vi++) {
      if (city ? validCity(vi, pi) : validSettlement(vi, pi, !!setup)) spots.push(vi);
    }
    if (!spots.length) return null;
    return AI.choose(spots, (vi) => vertexPotential(vi), player.level);
  }

  function cpuBestRoad(player, setupVertex) {
    const edges = [];
    geometry.edges.forEach((e) => {
      if (validRoad(e.id, player.index, setupVertex == null ? null : setupVertex)) edges.push(e.id);
    });
    if (!edges.length) return null;
    return AI.choose(edges, (eid) => {
      const e = geometry.edges[eid];
      return Math.max(vertexPotential(e.a), vertexPotential(e.b));
    }, player.level);
  }

  function cpuRobberTarget(player) {
    let best = null;
    let bestScore = -Infinity;
    geometry.hexes.forEach((h) => {
      if (h.id === state.robber || !h.resource || h.resource === "desert") return;
      const pips = PIP_VALUE[h.number] || 1;
      let score = pips * 0.5;
      h.corners.forEach((vid) => {
        const b = geometry.vertices[vid].building;
        if (!b) return;
        if (b.owner === player.index) score -= pips * (b.type === "city" ? 1.8 : 1);
        else score += pips * (b.type === "city" ? 2 : 1);
      });
      if (score > bestScore) {
        bestScore = score;
        best = h.id;
      }
    });
    if (best == null) {
      for (let i = 0; i < geometry.hexes.length; i++) {
        if (i !== state.robber) return i;
      }
    }
    return best;
  }

  function cpuSetupStep(entry) {
    const seat = state.players[entry.p];
    const wait = AI.delay(seat.level, 1);
    const entryIndex = state.setupIndex;

    if (entry.kind === "settlement") {
      const vi = cpuBestVertex(seat, true, false);
      if (vi == null) return false;
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "setup" || state.setupIndex !== entryIndex) return;
        setupPlaceSettlement(vi);
      }, wait);
      return true;
    }

    if (state.setupVertex == null) return false;
    const eid = cpuBestRoad(seat, state.setupVertex);
    if (eid == null) return false;
    aiRunner.later(() => {
      if (!state || state.over || state.phase !== "setup" || state.setupIndex !== entryIndex) return;
      setupPlaceRoad(eid);
    }, wait);
    return true;
  }

  function cpuTakeAction() {
    if (cpuOps >= 5) return false;
    const p = cur();

    if (state.freeRoads > 0) {
      const eid = cpuBestRoad(p, null);
      if (eid != null && buildRoad(eid, true)) {
        state.freeRoads--;
        state.mode = state.freeRoads > 0 ? "road" : null;
        cpuOps++;
        render();
      } else {
        state.freeRoads = 0;
        state.mode = null;
        return false;
      }
      return true;
    }

    const vpIndex = p.dev.findIndex((card) => card.type === "vp" && canPlayDev(p, card));
    if (vpIndex >= 0) {
      cpuOps++;
      playDev(vpIndex);
      return true;
    }

    if (!state.devPlayed) {
      const knight = p.dev.findIndex((card) => card.type === "knight" && canPlayDev(p, card));
      if (knight >= 0) {
        cpuOps++;
        playDev(knight);
        return true;
      }
    }

    if (canPay(p, COSTS.city)) {
      const vi = cpuBestVertex(p, false, true);
      if (vi != null && buildCity(vi)) {
        cpuOps++;
        return true;
      }
    }

    if (canPay(p, COSTS.settlement)) {
      const vi = cpuBestVertex(p, false, false);
      if (vi != null && buildSettlement(vi)) {
        cpuOps++;
        return true;
      }
    }

    if (canPay(p, COSTS.road)) {
      const eid = cpuBestRoad(p, null);
      if (eid != null && buildRoad(eid, false)) {
        cpuOps++;
        return true;
      }
    }

    if (canPay(p, COSTS.dev) && state.deck.length && totalRes(p) >= 5) {
      cpuOps++;
      buyDev();
      return true;
    }

    return false;
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;

    if (state.phase === "setup") {
      const entry = state.queue[state.setupIndex];
      if (!entry) return;
      const owner = state.players[entry.p];
      if (!AI.isCpu(owner)) return;
      if (!AI.autoAllowed(apiRef, owner)) return;
      cpuSetupStep(entry);
      return;
    }

    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    if (state.phase === "roll") cpuOps = 0;
    const wait = AI.delay(seat.level, 1.15);

    if (state.phase === "roll") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "roll") return;
        rollDice();
      }, wait);
      return;
    }

    if (state.phase === "robber") {
      const target = cpuRobberTarget(seat);
      if (target == null) return;
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "robber") return;
        placeRobber(target);
      }, wait);
      return;
    }

    if (state.phase === "action") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "action") return;
        if (!AI.isCpu(cur())) return;
        if (!cpuTakeAction()) endTurn();
      }, wait);
    }
  }

  /* ------------------------------ الإعداد ------------------------------ */

  function setupPlaceSettlement(vi) {
    const entry = state.queue[state.setupIndex];
    if (!entry || entry.kind !== "settlement") return;
    const p = state.players[entry.p];
    if (!validSettlement(vi, p.index, true)) {
      BG.toast("التقاطع غير صالح — يجب أن يبعد عن أي بناء قائم.", "warn");
      return;
    }
    geometry.vertices[vi].building = { owner: p.index, type: "settlement" };
    p.settlements++;
    state.fxBuild = { kind: "settlement", id: vi };
    apiRef.log("وضع <strong>" + U.escape(p.name) + "</strong> مستوطنة" + (entry.second ? " ثانية" : " أولى") + " في الإعداد.", "good");

    if (entry.second) {
      const hexes = geometry.vertices[vi].hexes.map((id) => geometry.hexes[id]);
      const got = [];
      hexes.forEach((h) => {
        if (h.resource && h.resource !== "desert") {
          addRes(p, h.resource, 1);
          got.push(RES[h.resource].icon);
        }
      });
      if (got.length) apiRef.log("استلم <strong>" + U.escape(p.name) + "</strong> موارد بداية من مستوطنته الثانية.", "accent");
    }

    state.setupVertex = vi;
    state.setupIndex++;
    state.notice = "ضع طريقًا مجاورًا للمستوطنة.";
    render();
    playBuildFx("+1 نقطة");
    setupLog();
  }

  function setupPlaceRoad(eid) {
    const entry = state.queue[state.setupIndex];
    if (!entry || entry.kind !== "road") return;
    const p = state.players[entry.p];
    if (!validRoad(eid, p.index, state.setupVertex)) {
      BG.toast("اختر طريقًا فارغًا ملاصقًا للمستوطنة التي وضعتها.", "warn");
      return;
    }
    geometry.edges[eid].owner = p.index;
    state.fxBuild = { kind: "road", id: eid };
    apiRef.log("وضع <strong>" + U.escape(p.name) + "</strong> طريقًا في الإعداد.", "good");
    state.setupVertex = null;
    state.setupIndex++;

    if (state.setupIndex >= state.queue.length) {
      state.phase = "roll";
      state.current = 0;
      state.notice = "انتهى الإعداد! دور " + state.players[0].name + " — ارمِ النرد.";
      apiRef.log("انتهى الإعداد — تبدأ جولة اللعب الأولى.", "accent");
      render();
      playBuildFx("طريق");
      return;
    }

    const next = state.queue[state.setupIndex];
    state.current = next.p;
    state.revealActive = false;
    state.notice = "الإعداد: " + (next.kind === "settlement" ? "ضع مستوطنة" : "ضع طريقًا") + " لـ " + state.players[next.p].name + ".";
    render();
    playBuildFx("طريق");
    setupLog();
  }

  /* ------------------------------ العرض ------------------------------ */

  function svgEscape(text) {
    return U.escape(text);
  }

  function resourceIcon(type, cx, cy) {
    const out = ['<g class="cat-res-icon" transform="translate(' + cx + " " + (cy - 21) + ')" aria-hidden="true">'];
    if (type === "wood") {
      out.push('<rect x="-1.6" y="-2" width="3.2" height="11" rx="1" fill="#6b4a2c"/>');
      out.push('<circle cx="0" cy="-8" r="7" fill="#2f6b3d"/><circle cx="-6" cy="-3.5" r="5" fill="#3f7f4b"/><circle cx="6" cy="-3.5" r="5" fill="#3f7f4b"/>');
      out.push('<circle cx="-2.4" cy="-9.6" r="2.2" fill="rgba(255,255,255,.18)"/>');
    } else if (type === "brick") {
      out.push('<rect x="-10" y="-8" width="9" height="6" rx="1" fill="#a8573c" stroke="#713722" stroke-width="1"/>');
      out.push('<rect x="1" y="-8" width="9" height="6" rx="1" fill="#c47455" stroke="#713722" stroke-width="1"/>');
      out.push('<rect x="-5" y="-1" width="9" height="6" rx="1" fill="#c47455" stroke="#713722" stroke-width="1"/>');
      out.push('<rect x="6" y="-1" width="7" height="6" rx="1" fill="#a8573c" stroke="#713722" stroke-width="1"/>');
    } else if (type === "sheep") {
      out.push('<ellipse cx="0" cy="0" rx="9" ry="6.4" fill="#f4efe2" stroke="#b9ae94" stroke-width="1"/>');
      out.push('<circle cx="-8" cy="-2.5" r="3.6" fill="#3b3b3b"/><circle cx="-9.2" cy="-3.6" r="1" fill="#f4efe2"/>');
      out.push('<circle cx="-3" cy="-3" r="2.6" fill="#fffdf6"/><circle cx="3" cy="-4" r="2.4" fill="#fffdf6"/><circle cx="6" cy="-1" r="2.2" fill="#fffdf6"/>');
      out.push('<path d="M-4 6 L-4 9 M3 6 L3 9" stroke="#3b3b3b" stroke-width="1.4" stroke-linecap="round"/>');
    } else if (type === "wheat") {
      out.push('<path d="M0 10 L0 -8" stroke="#8a6a24" stroke-width="1.8" stroke-linecap="round"/>');
      for (let i = 0; i < 4; i++) {
        const y = -7 + i * 4;
        out.push('<ellipse cx="-4" cy="' + y + '" rx="3.4" ry="2" transform="rotate(-28 -4 ' + y + ')" fill="#e0c265" stroke="#9a7a24" stroke-width=".7"/>');
        out.push('<ellipse cx="4" cy="' + (y + 2) + '" rx="3.4" ry="2" transform="rotate(28 4 ' + (y + 2) + ')" fill="#e0c265" stroke="#9a7a24" stroke-width=".7"/>');
      }
      out.push('<ellipse cx="0" cy="-9" rx="2.4" ry="3" fill="#e0c265" stroke="#9a7a24" stroke-width=".7"/>');
    } else if (type === "ore") {
      out.push('<path d="M-10 8 L-7 -4 L-2 -8 L5 -6 L10 3 L7 8 Z" fill="#6b7480" stroke="#424a54" stroke-width="1.2"/>');
      out.push('<path d="M-3 -6 L0 -12 L4 -5 L1 1 Z" fill="#b9c6d0" stroke="#66727e" stroke-width=".9"/>');
      out.push('<path d="M4 -3 L8 -7 L9 0 L6 3 Z" fill="#a7b4bf" stroke="#66727e" stroke-width=".9"/>');
      out.push('<path d="M-7 1 L-3 3 L-5 7 Z" fill="rgba(255,255,255,.2)"/>');
    } else {
      out.push('<circle cx="6" cy="-7" r="4.4" fill="#e7b95a"/>');
      out.push('<path d="M-9 9 Q-4 2 1 9 Q5 4 9 9" fill="none" stroke="#a98a55" stroke-width="1.5" stroke-linecap="round"/>');
      out.push('<path d="M-10 4 Q-6 -1 -2 4" fill="none" stroke="#b8996a" stroke-width="1.3" stroke-linecap="round"/>');
    }
    out.push("</g>");
    return out.join("");
  }

  function hexTexture(type, h) {
    if (type === "wood") {
      return '<g fill="#356f42" opacity=".55">' +
        '<circle cx="' + (h.cx - 27) + '" cy="' + (h.cy + 16) + '" r="4.2"/><circle cx="' + (h.cx - 22) + '" cy="' + (h.cy + 20) + '" r="3.2"/>' +
        '<circle cx="' + (h.cx + 26) + '" cy="' + (h.cy + 18) + '" r="4"/><circle cx="' + (h.cx + 21) + '" cy="' + (h.cy + 22) + '" r="3"/>' +
        "</g>";
    }
    if (type === "brick") {
      return '<g stroke="rgba(90,40,24,.32)" stroke-width="1" fill="none">' +
        '<path d="M' + (h.cx - 30) + " " + (h.cy + 16) + " H" + (h.cx + 30) + '"/><path d="M' + (h.cx - 30) + " " + (h.cy + 24) + " H" + (h.cx + 30) + '"/>' +
        '<path d="M' + (h.cx - 16) + " " + (h.cy + 16) + " V" + (h.cy + 24) + ' M' + (h.cx + 14) + " " + (h.cy + 16) + " V" + (h.cy + 24) + '"/>' +
        "</g>";
    }
    if (type === "wheat") {
      const stalks = [[-30, 24], [-20, 26], [22, 25], [30, 22]];
      return '<g stroke="rgba(138,106,36,.4)" stroke-width="1.2" stroke-linecap="round">' +
        '<path d="' + stalks.map(([dx, dy]) => "M" + (h.cx + dx) + " " + (h.cy + dy) + " q3 -7 6 0").join(" ") + '"/>' +
        "</g>";
    }
    if (type === "sheep") {
      return '<g fill="rgba(76,104,40,.4)"><circle cx="' + (h.cx - 28) + '" cy="' + (h.cy + 22) + '" r="2"/><circle cx="' + (h.cx - 22) + '" cy="' + (h.cy + 26) + '" r="1.6"/><circle cx="' + (h.cx + 28) + '" cy="' + (h.cy + 24) + '" r="2"/></g>';
    }
    if (type === "ore") {
      return '<g stroke="rgba(50,58,66,.35)" stroke-width="1.2" fill="none">' +
        '<path d="M' + (h.cx - 30) + " " + (h.cy + 24) + " l8 -6 l7 4 l8 -5" + '"/>' +
        '<path d="M' + (h.cx + 8) + " " + (h.cy + 26) + " l7 -4 l8 3" + '"/>' +
        "</g>";
    }
    return "";
  }

  function drawBoard() {
    const parts = [];
    parts.push('<svg viewBox="0 0 ' + BOARD_W + " " + BOARD_H + '" class="cat-svg" role="img" aria-label="جزيرة كاتان">');
    parts.push('<defs><radialGradient id="catSea" cx="48%" cy="38%" r="78%"><stop offset="0%" stop-color="#1c4b5c"/><stop offset="55%" stop-color="#123442"/><stop offset="100%" stop-color="#081b23"/></radialGradient>' +
      '<linearGradient id="catCoast" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3f7b6d"/><stop offset="100%" stop-color="#173c3d"/></linearGradient>' +
      '<filter id="catShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.45"/></filter></defs>');
    parts.push('<rect width="' + BOARD_W + '" height="' + BOARD_H + '" fill="url(#catSea)"/>');
    // موجات بحرية خفيفة
    for (let i = 0; i < 7; i++) {
      const y = 56 + i * 74;
      const x = 24 + (i % 3) * 26;
      parts.push('<path d="M' + x + " " + y + " q20 -9 40 0 t40 0 t40 0\" fill=\"none\" stroke=\"rgba(190,236,233,.055)\" stroke-width=\"1.4\"/>");
      parts.push('<path d="M' + (x + 330) + " " + (y + 30) + " q18 -8 36 0 t36 0 t36 0\" fill=\"none\" stroke=\"rgba(190,236,233,.045)\" stroke-width=\"1.2\"/>");
    }
    // وردة البوصلة
    parts.push('<g transform="translate(76 78)" opacity=".5" fill="none" stroke="rgba(200,240,235,.32)" stroke-width="1.2">' +
      '<circle r="21"/><circle r="14" stroke-dasharray="2 4"/>' +
      '<path d="M0 -27 5 -5 0 0 -5 -5Z" fill="rgba(200,240,235,.35)" stroke="none"/>' +
      '<path d="M0 27 5 5 0 0 -5 5Z" fill="rgba(200,240,235,.18)" stroke="none"/>' +
      '<path d="M-27 0 -5 5 0 0 -5 -5Z" fill="rgba(200,240,235,.18)" stroke="none"/>' +
      '<path d="M27 0 5 5 0 0 5 -5Z" fill="rgba(200,240,235,.18)" stroke="none"/></g>');

    // ظل الجزيرة ككتلة واحدة
    parts.push('<g fill="rgba(3,10,14,.55)" stroke="none">');
    geometry.hexes.forEach((h) => {
      const pts = h.corners.map((vid) => {
        const v = geometry.vertices[vid];
        return (h.cx + (v.x - h.cx) * 1.045).toFixed(1) + "," + (h.cy + (v.y - h.cy) * 1.045 + 4).toFixed(1);
      }).join(" ");
      parts.push('<polygon points="' + pts + '"/>');
    });
    parts.push("</g>");

    geometry.hexes.forEach((h) => {
      const res = RES[h.resource] || RES.desert;
      parts.push('<g class="cat-hex" data-hex="' + h.id + '">');
      parts.push('<polygon points="' + polygonPoints(h) + '" fill="' + res.light + '" stroke="#0a151a" stroke-width="2.5" class="cat-poly' + (state.phase === "robber" ? " robber-target" : "") + '" data-hex="' + h.id + '"/>');
      parts.push(hexTexture(h.resource, h));
      parts.push(resourceIcon(h.resource, h.cx, h.cy));
      if (h.number != null) {
        const danger = h.number === 6 || h.number === 8;
        const pips = 6 - Math.abs(7 - h.number);
        parts.push('<g class="cat-token">');
        parts.push('<circle cx="' + h.cx + '" cy="' + (h.cy + 15) + '" r="18" fill="#f7f0dd" stroke="' + (danger ? "#c14f42" : "#b9ac8e") + '" stroke-width="2"/>');
        parts.push('<text x="' + h.cx + '" y="' + (h.cy + 20) + '" class="cat-num' + (danger ? " danger" : "") + '">' + h.number + "</text>");
        for (let p = 0; p < pips; p++) {
          const px = h.cx + (p - (pips - 1) / 2) * 4.4;
          parts.push('<circle cx="' + px.toFixed(1) + '" cy="' + (h.cy + 27) + '" r="1.55" fill="' + (danger ? "#b3473c" : "#7a6a4a") + '"/>');
        }
        parts.push("</g>");
      }
      if (h.id === state.robber) {
        parts.push('<circle class="cat-robber-pin" cx="' + h.cx + '" cy="' + h.cy + '" r="14" fill="#111d22" stroke="#ef6f68" stroke-width="2" filter="url(#catShadow)"/>');
        parts.push('<text x="' + h.cx + '" y="' + (h.cy + 5) + '" class="cat-robber">☠</text>');
      }
      parts.push("</g>");
    });

    // الموانئ التجارية على الساحل
    (geometry.harbors || []).forEach((h) => {
      const va = geometry.vertices[h.a] && geometry.vertices[h.a].building;
      const vb = geometry.vertices[h.b] && geometry.vertices[h.b].building;
      const owner = va ? va.owner : vb ? vb.owner : null;
      const ring = owner == null ? "#c8a75c" : playerColor(owner);
      const dx = h.x - h.ex;
      const dy = h.y - h.ey;
      const len = Math.hypot(dx, dy) || 1;
      const x1 = h.ex + (dx / len) * 7;
      const y1 = h.ey + (dy / len) * 7;
      const x2 = h.x - (dx / len) * 13;
      const y2 = h.y - (dy / len) * 13;
      parts.push('<g class="cat-harbor' + (owner != null ? " is-owned" : "") + '">');
      parts.push('<title>' + harborLabel(h) + (owner != null ? " — " + U.escape(state.players[owner].name) : "") + "</title>");
      parts.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#b99a63" stroke-width="2.4" stroke-linecap="round"/>');
      parts.push('<circle cx="' + h.x.toFixed(1) + '" cy="' + h.y.toFixed(1) + '" r="13" fill="#10262e" stroke="' + ring + '" stroke-width="2.2"/>');
      parts.push('<text x="' + h.x.toFixed(1) + '" y="' + (h.y + 3.4).toFixed(1) + '" class="cat-harbor-ratio">' + h.ratio + ":1</text>");
      if (h.type !== "any") {
        parts.push('<text x="' + h.x.toFixed(1) + '" y="' + (h.y - 17).toFixed(1) + '" class="cat-harbor-icon">' + RES[h.type].icon + "</text>");
      } else {
        parts.push('<text x="' + h.x.toFixed(1) + '" y="' + (h.y - 17).toFixed(1) + '" class="cat-harbor-icon">⚓</text>');
      }
      parts.push("</g>");
    });

    // الطرق المبنيّة
    geometry.edges.forEach((e) => {
      if (e.owner == null) return;
      const a = geometry.vertices[e.a];
      const b = geometry.vertices[e.b];
      const fresh = state.fxBuild && state.fxBuild.kind === "road" && state.fxBuild.id === e.id;
      parts.push('<g class="cat-built cat-road-built' + (fresh ? " is-fresh" : "") + '" data-edge="' + e.id + '" data-fx-piece="cat-r-' + e.id + '" data-fx-enter="rise">');
      parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#0a1116" stroke-width="10" stroke-linecap="round"/>');
      parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + playerColor(e.owner) + '" stroke-width="6" stroke-linecap="round"/>');
      parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="rgba(255,255,255,.42)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="4 5"/>');
      parts.push("</g>");
    });

    // المباني
    geometry.vertices.forEach((v) => {
      if (!v.building) return;
      const color = playerColor(v.building.owner);
      const fresh = state.fxBuild && state.fxBuild.kind === "settlement" && state.fxBuild.id === v.id;
      parts.push('<g class="cat-built cat-building' + (fresh ? " is-fresh" : "") + '" data-vertex="' + v.id + '" data-fx-piece="cat-b-' + v.id + '" data-fx-enter="drop">');
      if (v.building.type === "city") {
        parts.push('<g filter="url(#catShadow)">' +
          '<ellipse cx="' + v.x + '" cy="' + (v.y + 8) + '" rx="15" ry="3.4" fill="rgba(0,0,0,.32)"/>' +
          '<rect x="' + (v.x - 13) + '" y="' + (v.y - 8) + '" width="26" height="15" rx="2" fill="' + color + '" stroke="#07110d" stroke-width="1.5"/>' +
          '<rect x="' + (v.x - 13) + '" y="' + (v.y - 13) + '" width="8" height="8" rx="1" fill="' + color + '" stroke="#07110d" stroke-width="1.3"/>' +
          '<path d="M' + (v.x - 14.5) + " " + (v.y - 13) + " L" + (v.x - 9) + " " + (v.y - 20) + " L" + (v.x - 3.5) + " " + (v.y - 13) + ' Z" fill="#8e3f34" stroke="#07110d" stroke-width="1.2"/>' +
          '<rect x="' + (v.x + 4) + '" y="' + (v.y - 10) + '" width="9" height="17" rx="1" fill="' + color + '" stroke="#07110d" stroke-width="1.3"/>' +
          '<path d="M' + (v.x + 2.5) + " " + (v.y - 10) + " L" + (v.x + 8.5) + " " + (v.y - 18) + " L" + (v.x + 14.5) + " " + (v.y - 10) + ' Z" fill="#8e3f34" stroke="#07110d" stroke-width="1.2"/>' +
          '<rect x="' + (v.x - 2.5) + '" y="' + (v.y - 2) + '" width="5" height="9" rx="1" fill="#22170d" opacity=".62"/>' +
          '<rect x="' + (v.x - 10.5) + '" y="' + (v.y - 5) + '" width="3" height="3" fill="#ffe8b0" opacity=".65"/>' +
          '<rect x="' + (v.x + 7) + '" y="' + (v.y - 6) + '" width="3" height="3" fill="#ffe8b0" opacity=".65"/>' +
          "</g>");
      } else {
        parts.push('<g filter="url(#catShadow)">' +
          '<ellipse cx="' + v.x + '" cy="' + (v.y + 7) + '" rx="10" ry="2.6" fill="rgba(0,0,0,.3)"/>' +
          '<rect x="' + (v.x - 7.5) + '" y="' + (v.y - 2) + '" width="15" height="10" rx="1.6" fill="' + color + '" stroke="#07110d" stroke-width="1.4"/>' +
          '<path d="M' + (v.x - 9.5) + " " + (v.y - 2) + " L" + v.x + " " + (v.y - 11) + " L" + (v.x + 9.5) + " " + (v.y - 2) + ' Z" fill="#8e3f34" stroke="#07110d" stroke-width="1.3"/>' +
          '<rect x="' + (v.x - 2) + '" y="' + (v.y + 2) + '" width="4" height="6" rx="0.6" fill="#22170d" opacity=".62"/>' +
          '<rect x="' + (v.x - 5.5) + '" y="' + (v.y + 0.5) + '" width="2.2" height="2.2" fill="#ffe8b0" opacity=".7"/>' +
          "</g>");
      }
      parts.push("</g>");
    });

    // أماكن البناء المتاحة
    const spots = validSpots();
    spots.vertices.forEach((vi) => {
      const v = geometry.vertices[vi];
      parts.push('<circle cx="' + v.x + '" cy="' + v.y + '" r="9" class="cat-spot" data-vertex="' + vi + '"/>');
    });
    spots.edges.forEach((eid) => {
      const e = geometry.edges[eid];
      const a = geometry.vertices[e.a];
      const b = geometry.vertices[e.b];
      parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" class="cat-edge-spot" data-edge="' + eid + '"/>');
    });

    parts.push("</svg>");
    return parts.join("");
  }

  function validSpots() {
    const out = { vertices: [], edges: [] };
    if (state.over) return out;
    if (state.phase === "setup") {
      const entry = state.queue[state.setupIndex];
      if (!entry) return out;
      if (entry.kind === "settlement") {
        geometry.vertices.forEach((v) => {
          if (validSettlement(v.id, entry.p, true)) out.vertices.push(v.id);
        });
      } else if (state.setupVertex != null) {
        geometry.edges.forEach((e) => {
          if (validRoad(e.id, entry.p, state.setupVertex)) out.edges.push(e.id);
        });
      }
      return out;
    }
    if (state.phase !== "action") return out;
    if (state.mode === "road") {
      geometry.edges.forEach((e) => {
        if (validRoad(e.id, state.current, null)) out.edges.push(e.id);
      });
    } else if (state.mode === "settlement") {
      geometry.vertices.forEach((v) => {
        if (validSettlement(v.id, state.current, false)) out.vertices.push(v.id);
      });
    } else if (state.mode === "city") {
      geometry.vertices.forEach((v) => {
        if (validCity(v.id, state.current)) out.vertices.push(v.id);
      });
    }
    return out;
  }

  function phaseLabel() {
    if (state.over) return "انتهت";
    if (state.phase === "setup") {
      const entry = state.queue[state.setupIndex];
      return entry ? "الإعداد — " + (entry.kind === "settlement" ? "مستوطنة" : "طريق") : "الإعداد";
    }
    if (state.phase === "roll") return "ارمِ النرد";
    if (state.phase === "robber" || state.phase === "stealing") return "قاطع الطريق";
    if (state.mode) return "اختر موقعًا";
    return "البناء والتجارة";
  }

  function resourcesPanelHTML(p) {
    const res = RES_LIST.map((r) => (
      '<span class="cres ' + r + '"><i>' + RES[r].icon + "</i><b>" + (p.res[r] || 0) + "</b><small>" + RES[r].name + "</small></span>"
    )).join("");
    const dev = p.dev.length
      ? p.dev.map((c, i) => {
          const info = DEV[c.type];
          const playable = state.phase === "action" && canPlayDev(p, c);
          return '<div class="cdev"><span>' + info.icon + "</span><div><strong>" + info.name + "</strong><small>" + info.desc + "</small></div>" +
            (c.type === "vp"
              ? '<span class="cdev-tag">مخفية</span>'
              : '<button type="button" class="bg-btn small" data-play="' + i + '" ' + (playable ? "" : "disabled") + ">لعب</button>") +
            "</div>";
        }).join("")
      : '<p class="muted-note">لا تملك بطاقات تطور بعد.</p>';
    return (
      '<div class="cat-res">' + res + "</div>" +
      '<div class="cat-total">مجموع بطاقات الموارد: <strong>' + totalRes(p) + "</strong> · نقاطك الكاملة: <strong>" + totalVP(p) + "</strong>" + (p.vpCards ? " (منها " + p.vpCards + " سرّية)" : "") + "</div>" +
      '<h4 class="cat-sub">موانئك</h4><p class="cat-hint">' +
      (ownedHarbors(p).length
        ? "⚓ " + ownedHarbors(p).map(harborLabel).join(" · ")
        : "لا تملك ميناءً بعد. ابنِ مستوطنة على تقاطع ساحلي بجوار رمز الميناء لتحصل على نسب تبديل أفضل.") +
      "</p>" +
      '<h4 class="cat-sub">بطاقات التطور</h4><div class="cat-dev">' + dev + "</div>"
    );
  }

  function playerRow(p) {
    const badges = [];
    if (p.hasLongest) badges.push('<span class="cbadge road">🛣️ أطول طريق</span>');
    if (p.hasArmy) badges.push('<span class="cbadge army">⚔️ أكبر جيش</span>');
    return '<div class="cat-prow p' + (p.index % 6) + (state.current === p.index ? " active" : "") + '" style="--p:' + playerColor(p.index) + '">' +
      BG.playerProfile.playerHTML(p, "catan-player-avatar") +
      '<div class="cat-pmain"><strong>' + U.escape(p.name) + "</strong><small>🏠 " + p.settlements + " · 🏛️ " + p.cities + " · 🛣️ " + roadCount(p) + " · ⚔️ " + p.knights + "</small>" +
      (badges.length ? '<div class="cbadges">' + badges.join("") + "</div>" : "") + "</div>" +
      '<span class="cat-vp"><b>' + publicVP(p) + "</b><small>نقطة ظاهرة</small></span>" +
      "</div>";
  }

  function playerColor(index) {
    const player = state && state.players && state.players[index];
    return player && player.profileColor || PCOLORS[index % PCOLORS.length];
  }

  function sideHTML() {
    const p = cur();
    const canAct = state.phase === "action" && !state.over;
    const isSetup = state.phase === "setup";
    const setupEntry = isSetup ? state.queue[state.setupIndex] : null;
    const actions = [];

    if (state.over) {
      actions.push('<p class="muted-note">انتهت اللعبة.</p>');
    } else if (isSetup) {
      actions.push(
        '<div class="cat-setup-note"><span>' + (setupEntry && setupEntry.kind === "settlement" ? "🏠" : "🛣️") + "</span><p>" +
        (setupEntry && setupEntry.kind === "settlement" ? "اختر تقاطعًا مضيئًا لوضع مستوطنة." : "اختر طريقًا مضيئًا ملاصقًا لمستوطنتك.") +
        "</p></div>"
      );
    } else if (state.phase === "roll") {
      actions.push('<button class="bg-btn primary big cat-roll" data-act="roll">🎲 ارمِ النرد</button>');
      actions.push('<p class="cat-hint">الإنتاج يعتمد على مجموع النرد. الرقم 7 يفعّل قاطع الطريق.</p>');
    } else if (state.phase === "robber") {
      actions.push('<div class="cat-setup-note robber"><span>☠</span><p>اضغط على حقل مضيء لنقل قاطع الطريق.</p></div>');
    } else if (state.phase === "stealing") {
      actions.push('<p class="cat-hint">اختر ضحية السرقة من النافذة.</p>');
    } else if (canAct) {
      const mode = state.mode;
      actions.push(
        '<div class="cat-build-grid">' +
        '<button class="cat-build" data-act="road" ' + (canPay(p, COSTS.road) || state.freeRoads ? "" : "disabled") + '><span>🛣️</span><strong>طريق</strong><small>' + (state.freeRoads ? "مجاني ×" + state.freeRoads : COST_LABEL.road) + "</small></button>" +
        '<button class="cat-build" data-act="settlement" ' + (canPay(p, COSTS.settlement) ? "" : "disabled") + '><span>🏠</span><strong>مستوطنة</strong><small>' + COST_LABEL.settlement + "</small></button>" +
        '<button class="cat-build" data-act="city" ' + (canPay(p, COSTS.city) ? "" : "disabled") + '><span>🏛️</span><strong>مدينة</strong><small>' + COST_LABEL.city + "</small></button>" +
        '<button class="cat-build" data-act="dev" ' + (canPay(p, COSTS.dev) && state.deck.length ? "" : "disabled") + '><span>🃏</span><strong>بطاقة تطور</strong><small>' + COST_LABEL.dev + "</small></button>" +
        "</div>" +
        '<div class="cat-row2">' +
        (mode ? '<button class="bg-btn" data-act="cancel">✕ إلغاء الوضع</button>' : '<button class="bg-btn" data-act="trade">⚓ التجارة والموانئ</button>') +
        '<button class="bg-btn primary" data-act="end">إنهاء الدور ←</button>' +
        "</div>" +
        '<p class="cat-hint">' + (mode ? "الوضع مفعّل: اختر الموقع على الخريطة." : state.notice) + "</p>"
      );
    }

    return (
      '<div class="cat-banner">' +
      '<div class="cat-banner-main"><span class="cat-eyebrow">' + phaseLabel() + '</span><strong class="p' + (state.current % 6) + '">' + (state.over ? "انتهت اللعبة" : U.escape(p.name)) + "</strong>" +
      '<small>' + (state.over ? "" : "نقاطك الظاهرة: " + publicVP(p)) + "</small></div>" +
      '<div class="cat-dice">' + (state.dice ? BG.dieFace(state.dice[0]).outerHTML + BG.dieFace(state.dice[1]).outerHTML : '<span class="cat-dice-empty">🎲</span>') + "</div>" +
      "</div>" +
      '<section class="cat-panel cat-controls">' + actions.join("") + "</section>" +
      '<section class="cat-panel cat-players"><div class="cat-panel-head"><h2>اللاعبون</h2><span>نقاط ظاهرة</span></div>' + state.players.map(playerRow).join("") + "</section>" +
      '<div class="cat-legend"><div><span>🏠</span> مستوطنة = 1 نقطة</div><div><span>🏛️</span> مدينة = 2 نقطة</div><div><span>🛣️</span> أطول طريق = 2</div><div><span>⚔️</span> أكبر جيش = 2</div><div><span>⭐</span> بطاقة انتصار = 1</div></div>'
    );
  }

  function render() {
    if (!rootRef) return;
    const wrap = document.createElement("div");
    wrap.className = "cat-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "cat-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-catan"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">جزيرة كاتان</span><strong>ابنِ، تطوّر، وسّع</strong></div>' +
      '<span class="board-head-hint">انقر على تقاطع لبناء مستوطنة أو ضلع لطريق · اسحب اللوحة أفقيًا على الشاشات الصغيرة</span>' +
      "</div>" + drawBoard();
    wrap.appendChild(boardWrap);

    const side = document.createElement("aside");
    side.className = "cat-side";
    side.innerHTML = sideHTML();
    wrap.appendChild(side);

    const p = viewerPlayer();
    let secretEl;
    if (p) {
      const secret = BG.secretPanel({
        title: "🧺 معلوماتك السرّية",
        owner: p.name,
        hint: "مواردك وبطاقات تطورك ونقاطك السرّية مخفية. تأكد أن الجهاز أمامك ثم اضغط «إظهار».",
        render: () => resourcesPanelHTML(p),
        open: isOnline(),
        autoKey: "catan:" + p.index + ":" + (state.turnCounter || 0),
        onToggle: (visible) => { state.revealActive = visible; },
      });
      secret.el.classList.add("cat-secret");
      secret.el.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-play]");
        if (btn && !btn.disabled) playDev(Number(btn.dataset.play));
      });
      secretEl = secret.el;
      side.insertBefore(secretEl, side.querySelector(".cat-players"));
      if (state.revealActive && state.current === p.index) secret.show();
    } else {
      secretEl = document.createElement("section");
      secretEl.className = "cat-panel cat-watch";
      secretEl.innerHTML =
        '<div class="cat-panel-head"><h2>👁 وضع المشاهدة</h2><span>مباشر</span></div>' +
        '<p class="muted-note">تتابع الجزيرة مباشرة. موارد اللاعبين وبطاقاتهم السرّية لا تُعرض على هذا الجهاز، وستُفتح لوحة أوراقك عند دورك.</p>';
      side.insertBefore(secretEl, side.querySelector(".cat-players"));
    }

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    // أحداث اللوحة
    const svg = boardWrap.querySelector(".cat-svg");
    if (svg) {
      svg.addEventListener("click", (event) => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const spot = event.target.closest("[data-vertex]");
        if (spot) {
          const vi = Number(spot.dataset.vertex);
          if (state.phase === "setup") setupPlaceSettlement(vi);
          else if (state.mode === "settlement") buildSettlement(vi);
          else if (state.mode === "city") buildCity(vi);
          return;
        }
        const edgeSpot = event.target.closest("[data-edge]");
        if (edgeSpot) {
          const eid = Number(edgeSpot.dataset.edge);
          if (state.phase === "setup") setupPlaceRoad(eid);
          else if (state.mode === "road") {
            const free = state.freeRoads > 0;
            if (buildRoad(eid, free)) {
              if (free) {
                state.freeRoads--;
                if (state.freeRoads > 0) state.mode = "road";
                render();
              }
            }
          }
          return;
        }
        if (state.phase === "robber") {
          const hexEl = event.target.closest("[data-hex]");
          if (hexEl) placeRobber(Number(hexEl.dataset.hex));
        }
      });
    }

    // أزرار التحكم
    wrap.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const act = btn.dataset.act;
        if (act === "roll") rollDice();
        else if (act === "road") enterMode("road", state.freeRoads ? null : COSTS.road);
        else if (act === "settlement") enterMode("settlement", COSTS.settlement);
        else if (act === "city") enterMode("city", COSTS.city);
        else if (act === "dev") buyDev();
        else if (act === "trade") openTrade();
        else if (act === "end") endTurn();
        else if (act === "cancel") { state.mode = null; state.notice = "أُلغي وضع البناء."; render(); }
      });
    });

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  BG.register(game);
})();
