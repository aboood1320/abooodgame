/* ==========================================================================
   كاركاسون — بناء المدن والطرق والأديرة (نسخة رقمية محلية كاملة)
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const COLORS = ["#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ffb74d"];
  const SIDE_NAMES = ["الشمال", "الشرق", "الجنوب", "الغرب"];
  const EDGE_LABELS = { C: "مدينة", R: "طريق", F: "حقل" };
  const EDGE_DX = [0, 1, 0, -1];
  const EDGE_DY = [-1, 0, 1, 0];
  const EDGE_MID = [[50, 0], [100, 50], [50, 100], [0, 50]];
  const ROT_NAMES = ["0°", "90°", "180°", "270°"];

  /*
   * ترتيب الحواف: شمال، شرق، جنوب، غرب.
   * C = مدينة، R = طريق، F = حقل.
   * features داخل كل بلاطة:
   *   cities: مجموعات الحواف المتصلة كمدينة واحدة.
   *   roads:  مجموعات الحواف المتصلة كطريق واحد.
   *   term:   نهاية الطريق (مدينة / دير / مفرق) للطرق ذات الحافة الواحدة.
   */
  const TILE_TYPES = {
    A: { count: 2, edges: "FFRF", cities: [], roads: [{ sides: [2], term: "monastery" }], fields: [{ sides: [0, 1, 3], cities: [], anchor: [40, 34] }, { sides: [2], cities: [], anchor: [50, 82] }], monastery: true, shield: 0, name: "دير وطريق" },
    B: { count: 4, edges: "FFFF", cities: [], roads: [], fields: [{ sides: [0, 1, 2, 3], cities: [], anchor: [30, 74] }], monastery: true, shield: 0, name: "دير" },
    C: { count: 1, edges: "CCCC", cities: [[0, 1, 2, 3]], roads: [], fields: [], monastery: false, shield: 1, name: "مدينة كاملة" },
    D: { count: 4, edges: "CRFR", cities: [[0]], roads: [{ sides: [1, 3] }], fields: [{ sides: [2], cities: [0], anchor: [50, 82] }], monastery: false, shield: 0, name: "مدينة وطريق مستقيم" },
    E: { count: 5, edges: "CFFF", cities: [[0]], roads: [], fields: [{ sides: [1, 2, 3], cities: [0], anchor: [52, 70] }], monastery: false, shield: 0, name: "مدينة" },
    F: { count: 2, edges: "FCFC", cities: [[1, 3]], roads: [], fields: [{ sides: [0], cities: [0], anchor: [50, 10] }, { sides: [2], cities: [0], anchor: [50, 90] }], monastery: false, shield: 1, name: "مدينة عابرة بدرع" },
    G: { count: 1, edges: "FCFC", cities: [[1, 3]], roads: [], fields: [{ sides: [0], cities: [0], anchor: [50, 10] }, { sides: [2], cities: [0], anchor: [50, 90] }], monastery: false, shield: 0, name: "مدينة عابرة" },
    H: { count: 3, edges: "CFCF", cities: [[0], [2]], roads: [], fields: [{ sides: [1, 3], cities: [0, 1], anchor: [50, 50] }], monastery: false, shield: 0, name: "مدينتان متقابلتان" },
    I: { count: 2, edges: "CFFC", cities: [[0], [3]], roads: [], fields: [{ sides: [1, 2], cities: [0, 1], anchor: [62, 62] }], monastery: false, shield: 0, name: "مدينتان متجاورتان" },
    J: { count: 3, edges: "CRRF", cities: [[0]], roads: [{ sides: [1, 2] }], fields: [{ sides: [3], cities: [0], anchor: [28, 58] }], monastery: false, shield: 0, name: "مدينة ومنعطف طريق" },
    K: { count: 3, edges: "CFRR", cities: [[0]], roads: [{ sides: [2, 3] }], fields: [{ sides: [1], cities: [0], anchor: [72, 42] }], monastery: false, shield: 0, name: "مدينة ومنعطف طريق" },
    L: { count: 3, edges: "CRRR", cities: [[0]], roads: [{ sides: [1], term: "city" }, { sides: [2], term: "city" }, { sides: [3], term: "city" }], fields: [], monastery: false, shield: 0, name: "مدينة وثلاثة طرق" },
    M: { count: 2, edges: "CFFC", cities: [[0, 3]], roads: [], fields: [{ sides: [1, 2], cities: [0], anchor: [66, 66] }], monastery: false, shield: 1, name: "مدينة ركن بدرع" },
    N: { count: 3, edges: "CFFC", cities: [[0, 3]], roads: [], fields: [{ sides: [1, 2], cities: [0], anchor: [66, 66] }], monastery: false, shield: 0, name: "مدينة ركن" },
    O: { count: 2, edges: "CRRC", cities: [[0, 3]], roads: [{ sides: [1, 2] }], fields: [{ sides: [], cities: [0], anchor: [55, 48] }], monastery: false, shield: 1, name: "مدينة ركن وطريق بدرع" },
    P: { count: 3, edges: "CRRC", cities: [[0, 3]], roads: [{ sides: [1, 2] }], fields: [{ sides: [], cities: [0], anchor: [55, 48] }], monastery: false, shield: 0, name: "مدينة ركن وطريق" },
    Q: { count: 1, edges: "CCCF", cities: [[0, 1, 2]], roads: [], fields: [{ sides: [3], cities: [0], anchor: [22, 50] }], monastery: false, shield: 1, name: "مدينة ثلاثية بدرع" },
    R: { count: 3, edges: "CCCF", cities: [[0, 1, 2]], roads: [], fields: [{ sides: [3], cities: [0], anchor: [22, 50] }], monastery: false, shield: 0, name: "مدينة ثلاثية" },
    S: { count: 2, edges: "CCRC", cities: [[0, 1, 3]], roads: [{ sides: [2], term: "city" }], fields: [], monastery: false, shield: 1, name: "مدينة ثلاثية وطريق بدرع" },
    T: { count: 1, edges: "CCRC", cities: [[0, 1, 3]], roads: [{ sides: [2], term: "city" }], fields: [], monastery: false, shield: 0, name: "مدينة ثلاثية وطريق" },
    U: { count: 8, edges: "RFRF", cities: [], roads: [{ sides: [0, 2] }], fields: [{ sides: [1], cities: [], anchor: [74, 50] }, { sides: [3], cities: [], anchor: [26, 50] }], monastery: false, shield: 0, name: "طريق مستقيم" },
    V: { count: 9, edges: "FRRF", cities: [], roads: [{ sides: [1, 2] }], fields: [{ sides: [0, 3], cities: [], anchor: [28, 28] }], monastery: false, shield: 0, name: "منعطف طريق" },
    W: { count: 4, edges: "RRRF", cities: [], roads: [{ sides: [0], term: "junction" }, { sides: [1], term: "junction" }, { sides: [2], term: "junction" }], fields: [{ sides: [3], cities: [], anchor: [24, 50] }], monastery: false, shield: 0, name: "مفرق ثلاثي" },
    X: { count: 1, edges: "RRRR", cities: [], roads: [{ sides: [0], term: "junction" }, { sides: [1], term: "junction" }, { sides: [2], term: "junction" }, { sides: [3], term: "junction" }], fields: [], monastery: false, shield: 0, name: "تقاطع طرق" },
  };

  const CITY_PATHS = {
    cap: "M0,0 H100 V24 C84,40 66,42 50,42 C34,42 16,40 0,24 Z",
    band: "M0,0 H100 V16 C80,30 72,38 72,50 C72,62 80,70 100,84 V100 H0 V84 C20,70 28,62 28,50 C28,38 20,30 0,16 Z",
    corner: "M0,0 H82 C74,20 52,32 34,50 C20,64 10,72 0,76 Z",
    three: "M0,0 H100 V100 H74 C74,80 64,70 50,66 C36,70 26,80 26,100 H0 Z",
    full: "M0,0 H100 V100 H0 Z",
  };

  const CITY_HOUSES = {
    cap: [[28, 17], [50, 11], [72, 17]],
    band: [[50, 18], [50, 82]],
    corner: [[21, 17], [45, 9]],
    three: [[22, 20], [50, 14], [78, 20], [86, 48], [14, 48]],
    full: [[24, 24], [50, 20], [76, 24], [24, 50], [50, 50], [76, 50], [24, 76], [50, 76], [76, 76]],
  };

  const CITY_SHAPE_ARABIC = {
    cap: "مدينة على حافة",
    band: "مدينة عابرة",
    corner: "مدينة ركن",
    three: "مدينة ثلاثية",
    full: "مدينة كاملة",
  };

  const BASE_CACHE = {};

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let boardScrollEl = null;

  /* ------------------------------ هندسة مساعدة ------------------------------ */

  function rotPoint(x, y, rotation) {
    let px = x;
    let py = y;
    for (let i = 0; i < rotation; i++) {
      const nx = 100 - py;
      const ny = px;
      px = nx;
      py = ny;
    }
    return [px, py];
  }

  function rotSides(sides, rotation) {
    return sides.map((s) => (s + rotation) % 4);
  }

  function baseInfo(type) {
    if (BASE_CACHE[type]) return BASE_CACHE[type];
    const def = TILE_TYPES[type];
    const cityOfSide = [-1, -1, -1, -1];
    const roadOfSide = [-1, -1, -1, -1];
    const fieldOfSide = [-1, -1, -1, -1];
    def.cities.forEach((group, index) => group.forEach((s) => { cityOfSide[s] = index; }));
    def.roads.forEach((road, index) => road.sides.forEach((s) => { roadOfSide[s] = index; }));
    (def.fields || []).forEach((field, index) => field.sides.forEach((s) => { fieldOfSide[s] = index; }));
    const info = { edges: def.edges.split(""), cityOfSide, roadOfSide, fieldOfSide };
    BASE_CACHE[type] = info;
    return info;
  }

  function edgeAt(tile, side) {
    return baseInfo(tile.type).edges[(side - tile.rotation + 4) % 4];
  }

  function featureSides(tile, kind, index) {
    const def = TILE_TYPES[tile.type];
    const sides = kind === "city" ? def.cities[index] : def.roads[index].sides;
    return rotSides(sides, tile.rotation);
  }

  function cityShape(sides) {
    const sorted = sides.slice().sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 4) {
      return { key: "full", rotate: 0, anchor: [50, 50], shield: [50, 32] };
    }
    if (n === 1) {
      const r = sorted[0];
      return { key: "cap", rotate: r, anchor: rotPoint(50, 24, r), shield: rotPoint(72, 14, r) };
    }
    if (n === 2) {
      if ((sorted[0] + 2) % 4 === sorted[1]) {
        const r = sorted[0] % 2 === 0 ? 0 : 1;
        return { key: "band", rotate: r, anchor: rotPoint(50, 50, r), shield: rotPoint(50, 27, r) };
      }
      let r = 0;
      for (; r < 4; r++) {
        const rotated = [0, 3].map((s) => (s + r) % 4).sort((a, b) => a - b);
        if (rotated.join(",") === sorted.join(",")) break;
      }
      return { key: "corner", rotate: r % 4, anchor: rotPoint(30, 30, r % 4), shield: rotPoint(22, 16, r % 4) };
    }
    const missing = [0, 1, 2, 3].find((s) => !sorted.includes(s));
    const r = (missing - 2 + 4) % 4;
    return { key: "three", rotate: r, anchor: rotPoint(50, 42, r), shield: rotPoint(50, 16, r) };
  }

  function roadEnd(side, term, def) {
    if (term === "monastery") return [50, 54];
    if (term === "city") {
      const citySides = def.cities[0] || [0];
      const shape = cityShape(citySides);
      let point = [50, 50];
      if (shape.key === "cap") point = [50, 40];
      else if (shape.key === "three") point = [50, 64];
      else if (shape.key === "corner") point = [50, 48];
      return rotPoint(point[0], point[1], shape.rotate);
    }
    return [50, 50];
  }

  function roadD(def, road) {
    const sides = road.sides;
    if (sides.length === 1) {
      const edge = EDGE_MID[sides[0]];
      const end = roadEnd(sides[0], road.term, def);
      return "M" + edge[0] + "," + edge[1] + " L" + end[0] + "," + end[1];
    }
    const a = EDGE_MID[sides[0]];
    const b = EDGE_MID[sides[1]];
    const straight = (sides[0] + 2) % 4 === sides[1];
    if (straight) return "M" + a[0] + "," + a[1] + " L" + b[0] + "," + b[1];
    return "M" + a[0] + "," + a[1] + " Q50,50 " + b[0] + "," + b[1];
  }

  function roadAnchor(def, road) {
    const sides = road.sides;
    if (sides.length === 1) {
      const edge = EDGE_MID[sides[0]];
      const end = roadEnd(sides[0], road.term, def);
      return [edge[0] * 0.55 + end[0] * 0.45, edge[1] * 0.55 + end[1] * 0.45];
    }
    if (sides.length === 2) {
      if ((sides[0] + 2) % 4 === sides[1]) return [50, 50];
      const dx = EDGE_DX[sides[0]] + EDGE_DX[sides[1]];
      const dy = EDGE_DY[sides[0]] + EDGE_DY[sides[1]];
      return [50 + dx * 18, 50 + dy * 18];
    }
    return [50, 50];
  }

  function monasteryAnchor() {
    return [50, 62];
  }

  function featureAnchor(type, meeple) {
    const def = TILE_TYPES[type];
    if (meeple.kind === "city") return cityShape(def.cities[meeple.idx] || [0]).anchor;
    if (meeple.kind === "road") return roadAnchor(def, def.roads[meeple.idx] || def.roads[0]);
    if (meeple.kind === "field") {
      const field = (def.fields || [])[meeple.idx];
      return field && field.anchor ? field.anchor : [50, 50];
    }
    return monasteryAnchor();
  }

  /* ------------------------------ رسم البلاطات ------------------------------ */

  const CITY_TOWERS = {
    cap: [[16, 31], [50, 39], [84, 31]],
    band: [[78, 40], [78, 60], [22, 40], [22, 60]],
    corner: [[66, 14], [46, 30], [26, 50], [12, 66]],
    three: [[34, 84], [50, 68], [66, 84], [18, 96], [82, 96]],
    full: [[12, 12], [50, 10], [88, 12], [90, 50], [88, 88], [50, 90], [12, 88], [10, 50]],
  };

  function houseMark(x, y) {
    return (
      '<g transform="translate(' + x + " " + y + ')">' +
      '<ellipse cx="0" cy="3.4" rx="4.2" ry="1.2" fill="rgba(52,38,20,0.24)"/>' +
      '<rect x="-3.1" y="-2.4" width="6.2" height="5.4" rx="0.8" fill="#efe4c8" stroke="#9c8254" stroke-width="0.7"/>' +
      '<path d="M-4.2,-2.4 L0,-7.2 L4.2,-2.4 Z" fill="#a85c47" stroke="#6d3526" stroke-width="0.7" stroke-linejoin="round"/>' +
      '<rect x="-0.9" y="0.2" width="1.8" height="2.8" rx="0.3" fill="#6b4a2c"/>' +
      '<rect x="-2.5" y="-1.1" width="1.1" height="1.1" fill="#8b7048" opacity=".8"/>' +
      "</g>"
    );
  }

  function towerArt(x, y, scale) {
    const s = scale || 1;
    return (
      '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' +
      '<ellipse cx="0" cy="5.4" rx="4.4" ry="1.4" fill="rgba(52,38,20,0.25)"/>' +
      '<rect x="-3.4" y="-3" width="6.8" height="8.6" rx="0.8" fill="#c7ab78" stroke="#755b36" stroke-width="0.9"/>' +
      '<path d="M-4.4,-3 L0,-7.4 L4.4,-3 Z" fill="#a85c47" stroke="#6d3526" stroke-width="0.8" stroke-linejoin="round"/>' +
      '<rect x="-3.4" y="-4.2" width="1.4" height="1.4" fill="#c7ab78" stroke="#755b36" stroke-width="0.5"/>' +
      '<rect x="-0.7" y="-4.2" width="1.4" height="1.4" fill="#c7ab78" stroke="#755b36" stroke-width="0.5"/>' +
      '<rect x="2" y="-4.2" width="1.4" height="1.4" fill="#c7ab78" stroke="#755b36" stroke-width="0.5"/>' +
      '<rect x="-0.9" y="1" width="1.8" height="3.2" rx="0.3" fill="#5f4a2c"/>' +
      "</g>"
    );
  }

  function cityArt(def, sides) {
    const shape = cityShape(sides);
    const houses = CITY_HOUSES[shape.key] || [];
    const towers = CITY_TOWERS[shape.key] || [];
    const transform = shape.rotate ? ' transform="rotate(' + shape.rotate * 90 + ' 50 50)"' : "";
    let out = '<g' + transform + ">";
    out += '<path d="' + CITY_PATHS[shape.key] + '" fill="#cdb787" stroke="#80683f" stroke-width="2.8" stroke-linejoin="round"/>';
    out += '<path d="' + CITY_PATHS[shape.key] + '" fill="none" stroke="#e7d6b0" stroke-width="1.5" stroke-linejoin="round" transform="translate(50 50) scale(0.94) translate(-50 -50)"/>';
    out += '<path d="' + CITY_PATHS[shape.key] + '" fill="none" stroke="#8d7448" stroke-width="2.2" stroke-dasharray="3 4" stroke-linejoin="round" opacity=".55" transform="translate(50 50) scale(0.985) translate(-50 -50)"/>';
    out += '<g fill="rgba(120,96,58,0.22)">';
    [[18, 24], [34, 30], [50, 22], [66, 30], [82, 24], [26, 44], [50, 46], [74, 44]].forEach(([x, y]) => {
      out += '<ellipse cx="' + x + '" cy="' + y + '" rx="2.2" ry="1.2"/>';
    });
    out += "</g>";
    houses.forEach((h) => { out += houseMark(h[0], h[1]); });
    towers.forEach((t, i) => { out += towerArt(t[0], t[1], i % 2 ? 0.92 : 1.08); });
    out += "</g>";
    return out;
  }

  function shieldArt(x, y) {
    return (
      '<g transform="translate(' + x + " " + y + ')">' +
      '<path d="M0,-8 L6.5,-5.4 L6,2.6 Q0,8 0,8 Q0,8 -6,2.6 L-6.5,-5.4 Z" fill="#e8c56b" stroke="#6d5122" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M0,-3.4 V3.6 M-3.4,0 H3.4" stroke="#6d5122" stroke-width="1.4" stroke-linecap="round"/>' +
      "</g>"
    );
  }

  function monasteryArt() {
    return (
      '<g transform="translate(50 40)">' +
      '<ellipse cx="0" cy="15" rx="17" ry="3.5" fill="rgba(32,44,26,0.24)"/>' +
      '<rect x="-10" y="-4" width="20" height="18" rx="2" fill="#efe2c4" stroke="#8b7651" stroke-width="1.4"/>' +
      '<path d="M-13,-3 L0,-17 L13,-3 Z" fill="#9a4f3d" stroke="#61301f" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M0,-17 V-25 M-4,-21 H4" stroke="#efd18a" stroke-width="1.8" stroke-linecap="round"/>' +
      '<rect x="-3" y="4" width="6" height="10" rx="1" fill="#7d5a37"/>' +
      '<circle cx="0" cy="-8" r="2.2" fill="#d9b45c"/>' +
      '<path d="M-10,7 H10" stroke="rgba(139,118,81,0.35)" stroke-width="1"/>' +
      "</g>"
    );
  }

  function fieldArt() {
    let out = '<rect x="0" y="0" width="100" height="100" fill="#7fa552"/>';
    out += '<rect x="0" y="0" width="100" height="100" fill="url(#carcGrass)"/>';
    out += '<g stroke="rgba(255,255,255,0.055)" stroke-width="3" fill="none">';
    for (let i = 0; i < 7; i++) out += '<path d="M-6,' + (8 + i * 15) + ' Q50,' + (2 + i * 15) + ' 106,' + (10 + i * 15) + '"/>';
    out += "</g>";
    out += '<ellipse cx="18" cy="82" rx="17" ry="9" fill="rgba(255,255,255,0.045)"/>';
    out += '<ellipse cx="84" cy="20" rx="14" ry="8" fill="rgba(41,74,39,0.12)"/>';
    out += '<g stroke="#5e843c" stroke-width="1.5" stroke-linecap="round" opacity="0.7">';
    out += '<path d="M12,88 q2,-6 4,0 M17,89 q1,-5 3,-1 M22,88 q2,-4 4,-1"/>';
    out += '<path d="M86,12 q2,-5 4,0 M90,14 q1,-4 3,-1 M80,16 q2,-4 3,-1"/>';
    out += '<path d="M12,14 q2,-5 4,0 M18,15 q1,-4 3,-1"/>';
    out += '<path d="M46,76 q2,-5 4,0 M52,78 q1,-4 3,-1"/>';
    out += "</g>";
    out += '<g fill="#5b8040" opacity=".55">' +
      '<circle cx="30" cy="68" r="3.2"/><circle cx="35" cy="70" r="2.4"/><circle cx="27" cy="71" r="2.1"/>' +
      '<circle cx="72" cy="62" r="3"/><circle cx="77" cy="64" r="2.3"/><circle cx="69" cy="65" r="2"/>' +
      "</g>";
    out += '<g fill="#f0df9a" opacity=".8">' +
      '<circle cx="40" cy="18" r="1"/><circle cx="45" cy="14" r="0.8"/><circle cx="58" cy="22" r="0.9"/>' +
      '<circle cx="24" cy="52" r="0.9"/><circle cx="80" cy="74" r="1"/><circle cx="64" cy="86" r="0.8"/>' +
      "</g>";
    return out;
  }

  function meepleSVG(x, y, color) {
    return (
      '<g class="carc-meeple-svg" transform="translate(' + x + " " + y + ')">' +
      '<ellipse cx="0" cy="9.6" rx="6.4" ry="2" fill="rgba(0,0,0,0.25)"/>' +
      '<circle cx="0" cy="-7.4" r="4.6" fill="' + color + '" stroke="#20140c" stroke-width="1.5"/>' +
      '<path d="M-3.4,-2.4 L-8.2,3.8 L-5.1,6.2 L-2.2,2.7 L-2.2,9.2 L2.2,9.2 L2.2,2.7 L5.1,6.2 L8.2,3.8 L3.4,-2.4 Z" fill="' + color + '" stroke="#20140c" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="-1.2" cy="-8.6" r="1.2" fill="rgba(255,255,255,0.42)"/>' +
      "</g>"
    );
  }

  function tileSVG(type, rotation, meeple) {
    const def = TILE_TYPES[type];
    let art = fieldArt();

    def.roads.forEach((road) => {
      const d = roadD(def, road);
      art += '<path d="' + d + '" fill="none" stroke="#a98d5d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
      art += '<path d="' + d + '" fill="none" stroke="#f0e4c8" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>';
      art += '<path d="' + d + '" fill="none" stroke="rgba(160,132,82,0.45)" stroke-width="1.1" stroke-dasharray="2 5" stroke-linecap="round"/>';
    });

    if (def.roads.length >= 3 && def.roads.every((r) => r.sides.length === 1)) {
      art += '<rect x="45.6" y="45.6" width="8.8" height="8.8" rx="2" fill="#8d7248" stroke="#5d4729" stroke-width="1.2"/>';
      art += '<circle cx="50" cy="50" r="1.8" fill="#efe2c4"/>';
    }

    def.cities.forEach((citySides) => { art += cityArt(def, citySides); });

    if (def.monastery) art += monasteryArt();

    if (def.shield) {
      const citySides = def.cities[0] || [0];
      const shape = cityShape(citySides);
      art += shieldArt(shape.shield[0], shape.shield[1]);
    }

    let overlay = "";
    if (meeple) {
      const anchor = featureAnchor(type, meeple);
      const point = rotPoint(anchor[0], anchor[1], rotation);
      overlay = meepleSVG(point[0], point[1], COLORS[meeple.owner % COLORS.length]);
    }

    const angle = (rotation * 90) % 360;
    return (
      '<svg class="carc-svg" viewBox="0 0 100 100" role="img" aria-label="' + U.escape(def.name) + '">' +
      '<defs><radialGradient id="carcGrass" cx="28%" cy="22%" r="88%">' +
      '<stop offset="0%" stop-color="#b6d47c" stop-opacity=".42"/>' +
      '<stop offset="62%" stop-color="#8fb35c" stop-opacity=".1"/>' +
      '<stop offset="100%" stop-color="#4c7035" stop-opacity=".3"/>' +
      "</radialGradient></defs>" +
      '<g transform="rotate(' + angle + ' 50 50)">' + art + "</g>" + overlay +
      "</svg>"
    );
  }

  function describeTile(type) {
    const def = TILE_TYPES[type];
    const edges = baseInfo(type).edges
      .map((kind, i) => SIDE_NAMES[i] + ": " + EDGE_LABELS[kind])
      .join(" · ");
    return "بلاطة " + def.name + " — " + edges;
  }

  function cityShapeName(def, index) {
    return CITY_SHAPE_ARABIC[cityShape(def.cities[index] || [0]).key] || "مدينة";
  }

  /* ------------------------------ اللعبة ------------------------------ */

  const game = {
    id: "carcassonne",
    name: "كاركاسون",
    en: "CARCASSONNE",
    icon: "🏰",
    accent: "#c9a45c",
    cardClass: "card-carcassonne",
    tagline: "ضع البلاطات، وسّع المدن والطرق، وأرسل رجالك لاحتلال أفضل الممالك.",
    players: "2–5",
    duration: "35–45 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayers: 2,

    rules: {
      goal: "اجمع أكبر عدد من النقاط عبر إكمال المدن والطرق والأديرة، وازرع المزارعين في الحقول لتحصد نقاط المدن المكتملة في نهاية اللعبة. تنتهي اللعبة عند نفاد البلاطات، ويفوز صاحب أعلى مجموع نقاط.",
      facts: [["البلاطات", "72 بلاطة أساسية"], ["رجال اللاعب", "7 رجال"], ["الفارمات", "مزارعون في نهاية اللعبة"], ["الاحتساب", "فوري + نهائي للحقول"]],
      components: [
        "72 بلاطة أرضية من اللعبة الأساسية: مدن، طرق، أديرة، وحقول.",
        "7 رجال (ميبِل) لكل لاعب باللون الخاص به.",
        "لوحة نقاط وسبعة رجال لكل لاعب لمتابعة المتبقي.",
        "بلاطة البداية D تُوضع أولًا، ثم تخلط البلاطات الـ71 المتبقية في كومة السحب.",
      ],
      setup: [
        "ضع بلاطة البداية (D: مدينة شمالية وطريق شرقي–غربي) مكشوفة في وسط الطاولة.",
        "اخلط البلاطات الـ71 المتبقية في كومة سحب مقلوبة، وأعطِ كل لاعب 7 رجال.",
        "اختر اللاعب الأول عشوائيًا أو بالاتفاق، ويبدأ اللعب باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>اسحب بلاطة:</strong> في بداية دورك اسحب البلاطة العليا من الكومة. إن تعذّر وضعها في أي اتجاه على الإطلاق، استبعدها واسحب أخرى، وهكذا حتى تجد بلاطة قابلة للوضع أو تنفد الكومة.",
        "<strong>دوّر البلاطة:</strong> يمكنك تدوير البلاطة بأي زاوية (0°، 90°، 180°، 270°) قبل وضعها. استخدم زرّي التدوير في لوحة اللعب.",
        "<strong>ضع البلاطة:</strong> يجب أن تلتصق البلاطة ببلاطة موجودة على الأقل، وأن تتطابق كل حافة مع الحافة المجاورة: مدينة مع مدينة، طريق مع طريق، حقل مع حقل.",
        "<strong>ضع رجلًا (اختياري):</strong> بعد وضع البلاطة يمكنك وضع رجل واحد على مدينة أو طريق أو دير أو حقل في البلاطة الجديدة، بشرط ألّا يوجد رجل آخر على تلك المنطقة الممتدة. لا يمكنك وضع رجل على معلم مكتمل بالكامل إن كان سيُحتسب فورًا قبل أن تضع الرجل؛ ضعه على البلاطة أولًا ثم يتم الاحتساب.",
        "<strong>المزارع والحقول:</strong> الحقل منطقة خضراء تحيط بالمدن وتفصلها الطرق. ضع الرجل مستلقيًا في الحقل؛ يبقى هناك حتى نهاية اللعبة. في النهاية يحصل صاحب أكبر عدد من المزارعين في الحقل على 3 نقاط عن كل مدينة مكتملة يلامسها ذلك الحقل.",
        "<strong>احتساب المدن:</strong> عندما تُغلق مدينة بالكامل (لا توجد أي حافة مدينة مفتوحة)، يأخذ اللاعب صاحب أكبر عدد من الرجال عليها نقطتين عن كل بلاطة في المدينة، ونقطتين إضافيتين عن كل درع. عند التعادل يحصل كل لاعب متعادل على النقاط كاملة. تعود الرجال إلى أصحابها بعد الاحتساب.",
        "<strong>احتساب الطرق:</strong> عندما يُغلق طريق بالكامل، يأخذ صاحب أكبر عدد من الرجال عليه نقطة واحدة عن كل بلاطة في الطريق. عند التعادل يحصل كل متعادل على النقاط كاملة، وتعود الرجال.",
        "<strong>احتساب الأديرة:</strong> يكتمل الدير عندما تُوضع البلاطات الثمانية المحيطة به. يأخذ صاحب الرجل عليه 9 نقاط، ويعود الرجل.",
        "<strong>رجال غير مستخدمة:</strong> إذا لم يكن لديك رجل متبقٍ أو لم ترغب في وضع رجل، اضغط «تخطي». لا يُشترط وضع رجل كل دور.",
        "<strong>انتقال الدور:</strong> بعد وضع الرجل أو تخطيه يتم الاحتساب، ثم ينتقل الدور للاعب التالي. تُعاد الرجال المكتملة تلقائيًا إلى اللاعبين.",
      ],
      winning: "تنتهي اللعبة عندما توضع آخر بلاطة أو تنفد الكومة. تُحتسب المعالم غير المكتملة التي عليها رجال: المدينة نقطة عن كل بلاطة ونقطة عن كل درع، الطريق نقطة عن كل بلاطة، والدير نقطة واحدة عن كل بلاطة محيطة به (بما فيها الدير نفسه). ثم تُحتسب الحقول: 3 نقاط لكل مدينة مكتملة يلامسها الحقل، لصاحب أكبر عدد من المزارعين فيه. يفوز صاحب أعلى مجموع نقاط، وعند التعادل يتقاسم اللاعبون المتعادلون الفوز.",
      notes: [
        "الحقول والمزارعون مفعّلون: تُرسم مناطق الحقول بين الطرق والمدن، ويُحتسب المزارع في نهاية اللعبة فقط (3 نقاط لكل مدينة مكتملة يلامسها الحقل).",
        "لا توجد معلومات سرّية في كاركاسون؛ جميع البلاطات والرجال ظاهرة على الطاولة.",
        "إن تعذّر وضع بلاطة في جميع الاتجاهات تُستبعد تلقائيًا وتُسحب بلاطة أخرى، مع تسجيل ذلك في سجل الأحداث.",
        "عند احتساب معلم مكتمل يعود جميع الرجال عليه إلى اللاعبين فورًا، حتى لو لم تكن المدينة أو الطريق ملكًا لمن وضع البلاطة الأخيرة.",
        "الأديرة تُحتسب مباشرة عند اكتمال البلاطات الثمانية المحيطة، أو عند نهاية اللعبة إذا بقيت غير مكتملة.",
        "تُعرض البلاطة الحالية مع معاينة للأماكن الصالحة، ويمكن تدويرها قبل الوضع. البلاطة المستبعدة لا تعود إلى اللعبة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();

      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        color: p.profileColor || COLORS[i % COLORS.length],
        meeples: 7,
        score: 0,
      }));

      state = {
        players,
        current: 0,
        deck: U.shuffle(buildDeck()),
        tiles: Object.create(null),
        currentTile: null,
        meepleSpots: [],
        lastPlaced: { x: 0, y: 0 },
        phase: "place",
        notice: "اسحب بلاطة وضعها بجوار البلاطات الموجودة.",
        over: false,
        placed: 0,
      };
      state.tiles[cellKey(0, 0)] = { x: 0, y: 0, type: "D", rotation: 0, meeple: null, start: true };

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          get clusters() { return clusterIndex().clusters; },
          render, startTurn, placeTile, placeMeeple, skipMeeple, finishTurn,
          rotateTile, legalCells, canPlace, hasAnyPlacement, firstLegalRotation,
          buildDeck, scoreCompleted, scoreFinal, endGame, awardCluster,
          cityKey, roadKey, monasteryKey, fieldKey, clusterIndex, meepleSpotsFor, tileSVG,
          TILE_TYPES,
        };
      }

      api.log("بدأت كاركاسون — <strong>" + players.length + "</strong> لاعبين، وبلاطة البداية في وسط الطاولة.", "accent");
      startTurn();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          state.tiles = state.tiles || {};
          state.meepleSpots = Array.isArray(state.meepleSpots) ? state.meepleSpots : [];
          if (state.phase === "place" && !state.currentTile) { startTurn(); return; }
          render();
        },
        netSeat() {
          return state ? state.current : -1;
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
          rootRef = null;
          apiRef = null;
          state = null;
          boardScrollEl = null;
        },
      };
    },
  };

  function buildDeck() {
    const deck = [];
    Object.keys(TILE_TYPES).forEach((type) => {
      let count = TILE_TYPES[type].count;
      if (type === "D") count -= 1;
      for (let i = 0; i < count; i++) deck.push(type);
    });
    return deck;
  }

  function cellKey(x, y) {
    return x + "," + y;
  }

  function cityKey(tile, idx) {
    return "city:" + tile.x + "," + tile.y + ":" + idx;
  }

  function roadKey(tile, idx) {
    return "road:" + tile.x + "," + tile.y + ":" + idx;
  }

  function monasteryKey(tile) {
    return "mona:" + tile.x + "," + tile.y;
  }

  function fieldKey(tile, idx) {
    return "field:" + tile.x + "," + tile.y + ":" + idx;
  }

  function cur() {
    return state.players[state.current];
  }

  function makeUF() {
    const parent = new Map();
    function add(key) {
      if (!parent.has(key)) parent.set(key, key);
    }
    function find(key) {
      let root = key;
      while (parent.get(root) !== root) root = parent.get(root);
      while (parent.get(key) !== root) {
        const next = parent.get(key);
        parent.set(key, root);
        key = next;
      }
      return root;
    }
    function union(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    }
    return { add, find, union };
  }

  function clusterIndex() {
    const uf = makeUF();
    const nodes = new Map();
    const list = Object.values(state.tiles);

    list.forEach((tile) => {
      const def = TILE_TYPES[tile.type];
      def.cities.forEach((group, idx) => {
        const key = cityKey(tile, idx);
        uf.add(key);
        nodes.set(key, { key, kind: "city", tile, idx });
      });
      def.roads.forEach((road, idx) => {
        const key = roadKey(tile, idx);
        uf.add(key);
        nodes.set(key, { key, kind: "road", tile, idx });
      });
      (def.fields || []).forEach((field, idx) => {
        const key = fieldKey(tile, idx);
        uf.add(key);
        nodes.set(key, { key, kind: "field", tile, idx });
      });
      if (def.monastery) {
        const key = monasteryKey(tile);
        uf.add(key);
        nodes.set(key, { key, kind: "monastery", tile, idx: 0 });
      }
    });

    list.forEach((tile) => {
      for (let side = 0; side < 4; side++) {
        const nb = state.tiles[cellKey(tile.x + EDGE_DX[side], tile.y + EDGE_DY[side])];
        if (!nb) continue;
        const kind = edgeAt(tile, side);
        const baseSide = (side - tile.rotation + 4) % 4;
        const nbSide = (side + 2) % 4;
        const nbBase = (nbSide - nb.rotation + 4) % 4;
        if (kind === "F") {
          const a = baseInfo(tile.type).fieldOfSide[baseSide];
          const b = baseInfo(nb.type).fieldOfSide[nbBase];
          if (a >= 0 && b >= 0) uf.union(fieldKey(tile, a), fieldKey(nb, b));
        } else if (kind === "C") {
          const a = baseInfo(tile.type).cityOfSide[baseSide];
          const b = baseInfo(nb.type).cityOfSide[nbBase];
          if (a >= 0 && b >= 0) uf.union(cityKey(tile, a), cityKey(nb, b));
        } else if (kind === "R") {
          const a = baseInfo(tile.type).roadOfSide[baseSide];
          const b = baseInfo(nb.type).roadOfSide[nbBase];
          if (a >= 0 && b >= 0) uf.union(roadKey(tile, a), roadKey(nb, b));
        }
      }
    });

    const clusters = new Map();
    nodes.forEach((node) => {
      const root = uf.find(node.key);
      let cluster = clusters.get(root);
      if (!cluster) {
        cluster = {
          kind: node.kind,
          root,
          nodes: [],
          tileKeys: new Set(),
          shields: 0,
          meeples: [],
          open: 0,
          cityKeys: new Set(),
          monasteryTile: null,
        };
        clusters.set(root, cluster);
      }
      cluster.nodes.push(node);
      if (node.kind === "monastery") cluster.monasteryTile = node.tile;
      else cluster.tileKeys.add(cellKey(node.tile.x, node.tile.y));
    });

    clusters.forEach((cluster) => {
      cluster.nodes.forEach((node) => {
        const tile = node.tile;
        const kind = node.kind;
        const idx = node.idx;
        if (kind === "city") {
          if (idx === 0 && TILE_TYPES[tile.type].shield) cluster.shields += 1;
          featureSides(tile, "city", idx).forEach((side) => {
            if (!state.tiles[cellKey(tile.x + EDGE_DX[side], tile.y + EDGE_DY[side])]) cluster.open += 1;
          });
        } else if (kind === "road") {
          featureSides(tile, "road", idx).forEach((side) => {
            if (!state.tiles[cellKey(tile.x + EDGE_DX[side], tile.y + EDGE_DY[side])]) cluster.open += 1;
          });
        } else if (kind === "field") {
          const field = (TILE_TYPES[tile.type].fields || [])[idx];
          (field && field.cities ? field.cities : []).forEach((cityIdx) => {
            cluster.cityKeys.add(cityKey(tile, cityIdx));
          });
        }
        if (tile.meeple && tile.meeple.kind === kind && (kind === "monastery" || tile.meeple.idx === idx)) {
          cluster.meeples.push({ owner: tile.meeple.owner, tile, kind, idx });
        }
      });

      if (cluster.kind === "monastery" && cluster.monasteryTile) {
        const t = cluster.monasteryTile;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (!state.tiles[cellKey(t.x + dx, t.y + dy)]) cluster.open += 1;
          }
        }
        cluster.tileKeys.add(cellKey(t.x, t.y));
      }
    });

    const rootOf = new Map();
    clusters.forEach((cluster) => {
      cluster.nodes.forEach((node) => rootOf.set(node.key, cluster.root));
    });
    return { clusters, rootOf };
  }

  function canPlace(type, rotation, x, y) {
    if (state.tiles[cellKey(x, y)]) return false;
    const edges = baseInfo(type).edges;
    let touching = false;
    for (let side = 0; side < 4; side++) {
      const nb = state.tiles[cellKey(x + EDGE_DX[side], y + EDGE_DY[side])];
      if (!nb) continue;
      touching = true;
      const mine = edges[(side - rotation + 4) % 4];
      const theirs = edgeAt(nb, (side + 2) % 4);
      if (mine !== theirs) return false;
    }
    return touching;
  }

  function legalCells(tile) {
    const found = new Map();
    Object.values(state.tiles).forEach((t) => {
      for (let side = 0; side < 4; side++) {
        const x = t.x + EDGE_DX[side];
        const y = t.y + EDGE_DY[side];
        const key = cellKey(x, y);
        if (state.tiles[key] || found.has(key)) continue;
        if (canPlace(tile.type, tile.rotation, x, y)) found.set(key, { x, y });
      }
    });
    return Array.from(found.values());
  }

  function hasAnyPlacement(type) {
    for (let rotation = 0; rotation < 4; rotation++) {
      if (legalCells({ type, rotation }).length) return true;
    }
    return false;
  }

  function firstLegalRotation(type) {
    for (let rotation = 0; rotation < 4; rotation++) {
      if (legalCells({ type, rotation }).length) return rotation;
    }
    return null;
  }

  function meepleSpotsFor(tile) {
    const def = TILE_TYPES[tile.type];
    const spots = [];
    const p = cur();
    if (p.meeples <= 0) return spots;
    const index = clusterIndex();

    function freeCluster(key) {
      const cluster = index.clusters.get(index.rootOf.get(key));
      return cluster && cluster.meeples.length === 0;
    }

    def.cities.forEach((group, idx) => {
      if (!freeCluster(cityKey(tile, idx))) return;
      const anchor = cityShape(group).anchor;
      const point = rotPoint(anchor[0], anchor[1], tile.rotation);
      spots.push({ kind: "city", idx, x: point[0], y: point[1], label: cityShapeName(def, idx) });
    });

    def.roads.forEach((road, idx) => {
      if (!freeCluster(roadKey(tile, idx))) return;
      const anchor = roadAnchor(def, road);
      const point = rotPoint(anchor[0], anchor[1], tile.rotation);
      spots.push({ kind: "road", idx, x: point[0], y: point[1], label: "طريق" });
    });

    if (def.monastery && freeCluster(monasteryKey(tile))) {
      const anchor = monasteryAnchor();
      const point = rotPoint(anchor[0], anchor[1], tile.rotation);
      spots.push({ kind: "monastery", idx: 0, x: point[0], y: point[1], label: "دير" });
    }

    (def.fields || []).forEach((field, idx) => {
      if (!freeCluster(fieldKey(tile, idx))) return;
      const anchor = field.anchor || [50, 50];
      const point = rotPoint(anchor[0], anchor[1], tile.rotation);
      spots.push({ kind: "field", idx, x: point[0], y: point[1], label: "حقل (مزارع)" });
    });

    return spots;
  }

  function startTurn() {
    if (!state || state.over) return;
    if (!state.deck.length) {
      endGame();
      return;
    }
    let tile = null;
    let discarded = 0;
    while (state.deck.length) {
      const type = state.deck.shift();
      const rotation = firstLegalRotation(type);
      if (rotation !== null) {
        tile = { type, rotation };
        break;
      }
      discarded += 1;
      apiRef.log("البلاطة <strong>" + TILE_TYPES[type].name + "</strong> لا تصلح في أي موضع، فاستُبعدت.", "warn");
    }
    if (!tile) {
      endGame();
      return;
    }
    state.currentTile = tile;
    state.phase = "place";
    state.meepleSpots = [];
    state.notice =
      "الدور على " + cur().name + " — " +
      (discarded ? "استُبعدت " + discarded + " بلاطة غير قابلة للوضع. " : "") +
      "ضع البلاطة المسحوبة على أحد المربعات المتاحة، ويمكنك تدويرها أولًا.";
    render();
    if (discarded) BG.toast("استُبعدت " + discarded + " بلاطة غير قابلة للوضع", "warn");
    if (FX) {
      FX.sound(discarded ? "error" : "card");
      FX.after(() => FX.deal(rootRef && rootRef.querySelector(".carc-tray-tile")), 45);
    }
  }

  function rotateTile(dir) {
    if (!state || state.over || !state.currentTile || state.phase !== "place") return;
    const step = dir === "left" ? 3 : 1;
    state.currentTile.rotation = (state.currentTile.rotation + step) % 4;
    const cells = legalCells(state.currentTile);
    state.notice = cells.length
      ? "الاتجاه " + ROT_NAMES[state.currentTile.rotation] + " — " + cells.length + " موضع صالح. انقر على أحد المربعات المنقّطة."
      : "الاتجاه " + ROT_NAMES[state.currentTile.rotation] + " بلا موضع صالح. دوّر البلاطة مرة أخرى.";
    render();
    if (FX) {
      FX.sound("tile");
      FX.after(() => FX.spin(rootRef && rootRef.querySelector(".carc-tray-tile")), 25);
    }
  }

  function placeTile(x, y) {
    if (!state || state.over || state.phase !== "place" || !state.currentTile) return false;
    if (!canPlace(state.currentTile.type, state.currentTile.rotation, x, y)) {
      BG.toast("الحواف لا تتطابق هنا — جرّب موضعًا آخر أو دوّر البلاطة.", "warn");
      return false;
    }
    const tile = { x, y, type: state.currentTile.type, rotation: state.currentTile.rotation, meeple: null };
    state.tiles[cellKey(x, y)] = tile;
    state.placed += 1;
    state.lastPlaced = { x, y };
    state.phase = "meeple";
    state.meepleSpots = meepleSpotsFor(tile);
    const p = cur();
    if (!state.meepleSpots.length) {
      state.notice = p.meeples > 0
        ? "لا يوجد معلم متاح لوضع رجل عليه. يمكنك تخطي وضع الرجل."
        : "لم يتبقَّ لديك رجال. تخطَّ الخطوة لإنهاء دورك.";
    } else {
      state.notice = "ضع رجلًا على أحد المعالم المميزة في البلاطة الجديدة، أو تخطَّ الخطوة.";
    }
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> وضع بلاطة <strong>" + TILE_TYPES[tile.type].name + "</strong>.", "");
    render();
    if (FX) {
      FX.sound("tile");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector(".carc-tile.is-last");
        if (el) {
          FX.pop(el);
          FX.floatText(el, TILE_TYPES[tile.type].name, "good");
        }
      }, 50);
    }
    return true;
  }

  function placeMeeple(kind, idx) {
    if (!state || state.over || state.phase !== "meeple" || !state.lastPlaced) return false;
    const tile = state.tiles[cellKey(state.lastPlaced.x, state.lastPlaced.y)];
    if (!tile) return false;
    const p = cur();
    if (p.meeples <= 0) {
      BG.toast("لا تملك رجالًا متبقين.", "warn");
      return false;
    }
    const spot = state.meepleSpots.find((s) => s.kind === kind && s.idx === idx);
    if (!spot) {
      BG.toast("لا يمكن وضع رجل على هذا المعلم — قد يكون محتلًّا برجل آخر.", "warn");
      return false;
    }
    tile.meeple = { owner: p.index, kind, idx };
    p.meeples -= 1;
    state.meepleSpots = [];
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> وضع رجلًا على " + spot.label + ".", "");
    if (FX) {
      FX.sound("meeple");
      FX.after(() => {
        const el = rootRef && rootRef.querySelector(".carc-tile.is-last");
        if (el) {
          FX.pop(el);
          FX.floatText(el, "رجل", "good");
        }
      }, 60);
    }
    finishTurn();
    return true;
  }

  function skipMeeple() {
    if (!state || state.over || state.phase !== "meeple") return;
    state.meepleSpots = [];
    finishTurn();
  }

  function finishTurn() {
    if (!state || state.over || state.phase !== "meeple") return;
    scoreCompleted();
    if (!state.deck.length) {
      endGame();
      return;
    }
    state.current = (state.current + 1) % state.players.length;
    startTurn();
  }

  function awardCluster(cluster, points, label) {
    if (!cluster.meeples.length) return null;
    const counts = new Map();
    cluster.meeples.forEach((m) => counts.set(m.owner, (counts.get(m.owner) || 0) + 1));
    let best = 0;
    counts.forEach((n) => {
      if (n > best) best = n;
    });
    const winners = [];
    counts.forEach((n, owner) => {
      if (n === best) winners.push(owner);
    });
    winners.forEach((owner) => {
      state.players[owner].score += points;
    });

    cluster.meeples.forEach((m) => {
      if (m.tile.meeple && m.tile.meeple.owner === m.owner) {
        m.tile.meeple = null;
        state.players[m.owner].meeples = Math.min(7, state.players[m.owner].meeples + 1);
      }
    });

    const who = winners.map((i) => "<strong>" + U.escape(state.players[i].name) + "</strong>").join(" و ");
    apiRef.log(
      who + " " + (winners.length > 1 ? "يتقاسمون" : "يحصل على") + " <strong>" + points + "</strong> نقطة — " + label + ".",
      "good"
    );
    if (winners.length === 1) {
      BG.toast(state.players[winners[0]].name + " +" + points + " نقطة", "good");
    } else {
      BG.toast("تعادل — +" + points + " نقطة لكل متعادل", "good");
    }
    // لا نكرّر المؤثرات أثناء الحساب النهائي؛ تظهر احتفالية واحدة في نهاية اللعبة.
    if (FX && state.phase !== "over") {
      FX.sound("point");
      winners.forEach((owner) => {
        FX.after(() => {
          const row = rootRef && rootRef.querySelector('.carc-player[data-player="' + owner + '"]');
          if (!row) return;
          FX.pop(row);
          FX.floatText(row, "+" + points, "good");
        }, 60);
      });
    }
    return { winners, points, label };
  }

  function scoreCompleted() {
    const index = clusterIndex();
    let count = 0;
    index.clusters.forEach((cluster) => {
      if (cluster.kind === "field") return;
      if (!cluster.meeples.length || cluster.open > 0) return;
      let points = 0;
      let label = "";
      if (cluster.kind === "city") {
        points = cluster.tileKeys.size * 2 + cluster.shields * 2;
        label = "مدينة من " + cluster.tileKeys.size + " بلاطة" + (cluster.shields ? " و" + cluster.shields + " درع" : "");
      } else if (cluster.kind === "road") {
        points = cluster.tileKeys.size;
        label = "طريق من " + cluster.tileKeys.size + " بلاطة";
      } else {
        points = 9;
        label = "دير مكتمل";
      }
      awardCluster(cluster, points, label);
      count += 1;
    });
    return count;
  }

  function scoreFinal() {
    const index = clusterIndex();
    const details = [];
    index.clusters.forEach((cluster) => {
      if (!cluster.meeples.length) return;
      let points = 0;
      let label = "";
      if (cluster.kind === "field") {
        const roots = new Set();
        cluster.cityKeys.forEach((key) => {
          const city = index.clusters.get(index.rootOf.get(key));
          if (city && city.kind === "city" && city.open === 0) roots.add(index.rootOf.get(key));
        });
        points = roots.size * 3;
        label = "حقل يلامس " + roots.size + (roots.size === 1 ? " مدينة مكتملة" : " مدن مكتملة");
      } else if (cluster.kind === "city") {
        if (cluster.open === 0) {
          points = cluster.tileKeys.size * 2 + cluster.shields * 2;
          label = "مدينة مكتملة";
        } else {
          points = cluster.tileKeys.size + cluster.shields;
          label = "مدينة غير مكتملة";
        }
      } else if (cluster.kind === "road") {
        points = cluster.tileKeys.size;
        label = cluster.open === 0 ? "طريق مكتمل" : "طريق غير مكتمل";
      } else {
        const t = cluster.monasteryTile;
        let around = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (state.tiles[cellKey(t.x + dx, t.y + dy)]) around += 1;
          }
        }
        points = 1 + around;
        label = cluster.open === 0 ? "دير مكتمل" : "دير غير مكتمل";
      }
      const result = awardCluster(cluster, points, label);
      if (result) details.push(result);
    });
    return details;
  }

  function endGame() {
    if (!state || state.over) return;
    state.over = true;
    state.phase = "over";
    state.currentTile = null;
    state.meepleSpots = [];
    scoreFinal();
    const ranking = state.players.slice().sort((a, b) => b.score - a.score);
    const top = ranking.length ? ranking[0].score : 0;
    const winners = ranking.filter((p) => p.score === top);
    const standings = ranking.map((p) => ({ name: p.name, value: p.score + " نقطة" }));
    apiRef.setStatus("انتهت", "over");
    render();
    apiRef.log(
      "انتهت اللعبة — الفائز: <strong>" + winners.map((p) => U.escape(p.name)).join(" و ") + "</strong> بـ " + top + " نقطة.",
      "good"
    );
    if (FX) FX.after(() => FX.win(), 120);
    apiRef.gameOver({
      icon: "🏰",
      title: "انتهت كاركاسون",
      text: "نفدت البلاطات. حُسبت المدن والطرق والأديرة غير المكتملة التي عليها رجال، ثم الحقول والمزارعون وفق قواعد نهاية اللعبة.",
      winner: winners.map((p) => p.name).join(" و "),
      standings,
    });
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function withTrialTile(tile, fn) {
    const key = cellKey(tile.x, tile.y);
    state.tiles[key] = tile;
    try {
      return fn(tile);
    } finally {
      delete state.tiles[key];
    }
  }

  function clusterForSpot(index, tile, spot) {
    const key = spot.kind === "monastery"
      ? monasteryKey(tile)
      : spot.kind === "city"
        ? cityKey(tile, spot.idx)
        : spot.kind === "field"
          ? fieldKey(tile, spot.idx)
          : roadKey(tile, spot.idx);
    return index.clusters.get(index.rootOf.get(key)) || null;
  }

  function clusterWorth(cluster, p) {
    if (!cluster) return 0;
    const mine = cluster.meeples.some((m) => m.owner === p.index);
    const theirs = cluster.meeples.some((m) => m.owner !== p.index);
    let value = 0;
    if (cluster.kind === "field") {
      value = (cluster.cityKeys ? cluster.cityKeys.size : 0) * 2.4;
    } else if (cluster.kind === "city") {
      value = cluster.open === 0 ? cluster.tileKeys.size * 2 + cluster.shields * 2 : cluster.tileKeys.size * 0.95 + cluster.shields * 0.6;
    } else if (cluster.kind === "road") {
      value = cluster.open === 0 ? cluster.tileKeys.size + 2 : cluster.tileKeys.size * 0.8;
    } else {
      const t = cluster.monasteryTile;
      let around = 0;
      if (t) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (state.tiles[cellKey(t.x + dx, t.y + dy)]) around += 1;
          }
        }
      }
      value = cluster.open === 0 ? 9 : 1 + around;
    }
    if (theirs) value *= mine ? 0.45 : 0.18;
    return value;
  }

  function cpuPlaceScore(type, rotation, x, y) {
    const p = cur();
    const tile = { x, y, type, rotation, meeple: null };
    return withTrialTile(tile, () => {
      const def = TILE_TYPES[type];
      const index = clusterIndex();
      const touched = new Set();
      def.cities.forEach((group, idx) => touched.add(cityKey(tile, idx)));
      def.roads.forEach((road, idx) => touched.add(roadKey(tile, idx)));
      (def.fields || []).forEach((field, idx) => touched.add(fieldKey(tile, idx)));
      if (def.monastery) touched.add(monasteryKey(tile));

      let score = 0;
      touched.forEach((key) => {
        const cluster = index.clusters.get(index.rootOf.get(key));
        if (!cluster) return;
        const value = clusterWorth(cluster, p);
        const mine = cluster.meeples.some((m) => m.owner === p.index);
        const theirs = cluster.meeples.some((m) => m.owner !== p.index);
        if (cluster.open === 0) {
          if (mine) score += value * 1.5;
          else if (theirs) score -= value * 0.85;
          else score += value * 0.22;
        } else {
          if (mine) score += value * 0.24;
          else if (theirs) score -= value * 0.09;
          else score += value * 0.32;
        }
      });

      meepleSpotsFor(tile).forEach((spot) => {
        const cluster = clusterForSpot(index, tile, spot);
        score += clusterWorth(cluster, p) * 0.5;
      });

      let touch = 0;
      for (let side = 0; side < 4; side++) {
        if (state.tiles[cellKey(x + EDGE_DX[side], y + EDGE_DY[side])]) touch += 1;
      }
      score += touch * 0.45;
      return score;
    });
  }

  function cpuPlaceOptions(type) {
    const options = [];
    for (let rotation = 0; rotation < 4; rotation++) {
      legalCells({ type, rotation }).forEach((cell) => {
        options.push({ rotation, x: cell.x, y: cell.y, score: cpuPlaceScore(type, rotation, cell.x, cell.y) });
      });
    }
    return options;
  }

  function cpuChoosePlacement() {
    if (!state.currentTile) return null;
    const seat = cur();
    const options = cpuPlaceOptions(state.currentTile.type);
    if (!options.length) return null;
    return AI.choose(options, (option) => option.score, seat.level);
  }

  function cpuChooseMeeple() {
    if (!state.meepleSpots.length) return null;
    const p = cur();
    const index = clusterIndex();
    const tile = state.tiles[cellKey(state.lastPlaced.x, state.lastPlaced.y)];
    if (!tile) return null;
    const ranked = state.meepleSpots.map((spot) => {
      const cluster = clusterForSpot(index, tile, spot);
      let value = clusterWorth(cluster, p);
      if (cluster && cluster.open === 0) value += 8;
      if (p.meeples <= 2) value -= 5;
      if (p.meeples <= 1) value -= 7;
      return { spot, value };
    });
    const best = ranked.slice().sort((a, b) => b.value - a.value)[0];
    if (!best) return null;
    if (best.value < 1.5 && p.meeples <= 3) return null;
    const seat = cur();
    if (AI.level(seat.level) === "easy") {
      if (Math.random() < 0.25) return null;
      return U.pick(ranked).spot;
    }
    if (AI.level(seat.level) === "normal" && Math.random() < 0.15) return null;
    return cpuPickMeepleFrom(ranked, seat) || best.spot;
  }

  function cpuPickMeepleFrom(ranked, seat) {
    const top = ranked.slice().sort((a, b) => b.value - a.value).slice(0, 3);
    const picked = AI.choose(top, (entry) => Math.max(1, entry.value), seat.level);
    return picked ? picked.spot : null;
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 0.95);

    if (state.phase === "place") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "place") return;
        if (!AI.isCpu(cur())) return;
        const choice = cpuChoosePlacement();
        if (choice) {
          state.currentTile.rotation = choice.rotation;
          placeTile(choice.x, choice.y);
        }
      }, wait);
      return;
    }

    if (state.phase === "meeple") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "meeple") return;
        if (!AI.isCpu(cur())) return;
        const spot = cpuChooseMeeple();
        if (spot) placeMeeple(spot.kind, spot.idx);
        else skipMeeple();
      }, wait);
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  const TILE = 94;

  function boardBounds() {
    const list = Object.values(state.tiles);
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    if (list.length) {
      minX = maxX = list[0].x;
      minY = maxY = list[0].y;
      list.forEach((t) => {
        if (t.x < minX) minX = t.x;
        if (t.x > maxX) maxX = t.x;
        if (t.y < minY) minY = t.y;
        if (t.y > maxY) maxY = t.y;
      });
    }
    return { minX: minX - 1, maxX: maxX + 1, minY: minY - 1, maxY: maxY + 1 };
  }

  function boardHTML() {
    const bounds = boardBounds();
    const cols = bounds.maxX - bounds.minX + 1;
    const rows = bounds.maxY - bounds.minY + 1;
    const pos = (x, y) => ({ left: (x - bounds.minX) * TILE, top: (y - bounds.minY) * TILE });
    let out = '<div class="carc-board" style="width:' + cols * TILE + "px;height:" + rows * TILE + 'px">';

    if (state.phase === "place" && state.currentTile) {
      legalCells(state.currentTile).forEach((cell) => {
        const point = pos(cell.x, cell.y);
        out +=
          '<button type="button" class="carc-slot" data-x="' + cell.x + '" data-y="' + cell.y + '"' +
          ' style="left:' + point.left + "px;top:" + point.top + "px;width:" + TILE + "px;height:" + TILE + 'px"' +
          ' aria-label="ضع البلاطة هنا"><span class="carc-slot-plus">+</span></button>';
      });
    }

    Object.keys(state.tiles).forEach((key) => {
      const tile = state.tiles[key];
      const point = pos(tile.x, tile.y);
      const isLast = state.lastPlaced && state.lastPlaced.x === tile.x && state.lastPlaced.y === tile.y;
      let spots = "";
      if (isLast && state.phase === "meeple") {
        state.meepleSpots.forEach((spot) => {
          spots +=
            '<button type="button" class="carc-spot" data-kind="' + spot.kind + '" data-idx="' + spot.idx + '"' +
            ' style="left:' + spot.x + "%;top:" + spot.y + '%"' +
            ' title="ضع رجلًا على ' + U.escape(spot.label) + '"><span style="background:' + cur().color + '"></span></button>';
        });
      }
      out +=
        '<div class="carc-tile' + (isLast ? " is-last" : "") + '" data-tile="' + key + '" data-fx-piece="carc-' + key + '" data-fx-enter="drop"' +
        ' style="left:' + point.left + "px;top:" + point.top + "px;width:" + TILE + "px;height:" + TILE + 'px">' +
        tileSVG(tile.type, tile.rotation, tile.meeple) + spots + "</div>";
    });

    out += "</div>";
    return out;
  }

  function sideHTML() {
    const p = cur();
    let tray = "";
    if (state.phase === "place" && state.currentTile) {
      const cells = legalCells(state.currentTile);
      tray =
        '<div class="carc-tray">' +
        '<div class="carc-tray-tile">' + tileSVG(state.currentTile.type, state.currentTile.rotation, null) + "</div>" +
        '<div class="carc-tray-info">' +
        '<span class="carc-tray-kicker">البلاطة المسحوبة</span>' +
        "<strong>" + U.escape(TILE_TYPES[state.currentTile.type].name) + "</strong>" +
        "<small>" + describeTile(state.currentTile.type) + "</small>" +
        '<small class="carc-tray-count">الاتجاه ' + ROT_NAMES[state.currentTile.rotation] + " · " + cells.length + " موضع صالح</small>" +
        "</div></div>" +
        '<div class="carc-actions">' +
        '<button type="button" class="bg-btn" data-act="rotate-left"><span aria-hidden="true">↺</span><span>تدوير يسار</span></button>' +
        '<button type="button" class="bg-btn" data-act="rotate-right"><span aria-hidden="true">↻</span><span>تدوير يمين</span></button>' +
        "</div>";
    } else if (state.phase === "meeple") {
      const tile = state.lastPlaced ? state.tiles[cellKey(state.lastPlaced.x, state.lastPlaced.y)] : null;
      tray =
        '<div class="carc-tray">' +
        (tile ? '<div class="carc-tray-tile">' + tileSVG(tile.type, tile.rotation, tile.meeple) + "</div>" : "") +
        '<div class="carc-tray-info">' +
        '<span class="carc-tray-kicker">وضع الرجل</span>' +
        "<strong>اختر معلمًا</strong>" +
        "<small>انقر على الدائرة المضيئة في البلاطة الموضوعة، أو تخطَّ الخطوة.</small>" +
        '<small class="carc-tray-count">' + state.meepleSpots.length + " خيار متاح</small>" +
        "</div></div>" +
        '<div class="carc-actions">' +
        '<button type="button" class="bg-btn primary" data-act="skip"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg><span>تخطي الرجل</span></button>' +
        "</div>";
    } else {
      tray =
        '<div class="carc-over-box"><span class="carc-over-icon" aria-hidden="true">🏰</span>' +
        "<strong>اكتملت المملكة</strong><small>راجع ترتيب النقاط في نافذة النهاية وسجل الأحداث.</small></div>";
    }

    const players = state.players
      .map((pl) => {
        const active = pl.index === state.current && !state.over;
        return (
          '<div class="carc-player' + (active ? " active" : "") + '" data-player="' + pl.index + '" style="--p:' + pl.color + '">' +
          BG.playerProfile.playerHTML(pl, "carc-player-avatar") +
          '<div class="carc-player-copy"><strong>' + U.escape(pl.name) + "</strong>" +
          "<small>" + pl.meeples + " رجال · " + pl.score + " نقطة</small></div>" +
          '<span class="carc-player-score">' + pl.score + "</span>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="carc-panel carc-turn">' +
      '<span class="carc-kicker">' + (state.over ? "النهاية" : "دور اللاعب") + "</span>" +
      "<strong>" + (state.over ? "اكتملت الرحلة" : U.escape(p.name)) + "</strong>" +
      "<small>" + (state.over ? "النقاط النهائية" : "النقاط: " + p.score + " · الرجال المتبقون: " + p.meeples) + "</small>" +
      '<div class="carc-deck"><span>البلاطات المتبقية</span><b>' + state.deck.length + "</b><span>بلاطة</span></div>" +
      "</div>" +
      '<div class="carc-panel carc-tray-panel">' + tray + "</div>" +
      '<div class="carc-panel carc-players"><span class="carc-kicker">لوحة النقاط</span>' + players + "</div>" +
      '<div class="carc-notice">' + U.escape(state.notice) + "</div>" +
      '<div class="carc-panel carc-legend">' +
      '<span class="carc-kicker">تذكير سريع</span>' +
      '<div class="carc-legend-row"><span aria-hidden="true">🏰</span><p>المدينة المكتملة: نقطتان لكل بلاطة + نقطتان لكل درع.</p></div>' +
      '<div class="carc-legend-row"><span aria-hidden="true">🛣️</span><p>الطريق المكتمل: نقطة واحدة لكل بلاطة.</p></div>' +
      '<div class="carc-legend-row"><span aria-hidden="true">⛪</span><p>الدير المكتمل: 9 نقاط عند وجود البلاطات الثمانية المحيطة.</p></div>' +
      '<div class="carc-legend-row"><span aria-hidden="true">🧑‍🌾</span><p>المزارع في الحقل: 3 نقاط لكل مدينة مكتملة يلامسها الحقل عند نهاية اللعبة.</p></div>' +
      "</div>"
    );
  }

  function render() {
    if (!rootRef) return;
    const wrap = document.createElement("div");
    wrap.className = "carc-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "carc-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-carcassonne"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">مملكة البلاطات</span><strong>كاركاسون</strong></div>' +
      '<span class="board-head-hint">انقر على مربع منقّط لوضع البلاطة · دوّرها من اللوحة الجانبية · المربعات المضيئة لوضع الرجال</span>' +
      "</div>";

    const scroll = document.createElement("div");
    scroll.className = "carc-board-scroll";
    scroll.innerHTML = boardHTML();
    boardWrap.appendChild(scroll);
    wrap.appendChild(boardWrap);

    const side = document.createElement("aside");
    side.className = "carc-side";
    side.innerHTML = sideHTML();
    wrap.appendChild(side);

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    const board = scroll.querySelector(".carc-board");
    if (board) board.addEventListener("click", onBoardClick);
    side.addEventListener("click", onSideClick);
    boardScrollEl = scroll;

    if (state.lastPlaced) {
      const bounds = boardBounds();
      const left = (state.lastPlaced.x - bounds.minX) * TILE + TILE / 2 - scroll.clientWidth / 2;
      const top = (state.lastPlaced.y - bounds.minY) * TILE + TILE / 2 - scroll.clientHeight / 2;
      scroll.scrollLeft = Math.max(0, left);
      scroll.scrollTop = Math.max(0, top);
    }

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  function onBoardClick(event) {
    if (!state || state.over || AI.isCpu(cur())) return;
    const slot = event.target.closest(".carc-slot");
    if (slot) {
      placeTile(Number(slot.dataset.x), Number(slot.dataset.y));
      return;
    }
    const spot = event.target.closest(".carc-spot");
    if (spot) {
      placeMeeple(spot.dataset.kind, Number(spot.dataset.idx));
    }
  }

  function onSideClick(event) {
    if (!state || state.over || AI.isCpu(cur())) return;
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "rotate-left") rotateTile("left");
    else if (act === "rotate-right") rotateTile("right");
    else if (act === "skip") skipMeeple();
  }

  BG.register(game);
})();
