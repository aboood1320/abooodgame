"use strict";

/* ==========================================================================
   مولّد بيانات خريطة ريسك الكلاسيكية.
   المصدر: Natural Earth (الملكية العامة) — دول العالم + مقاطعات/ولايات
   الولايات المتحدة وكندا وأستراليا. يُولّد ملف js/games/risk-map-data.js
   بمسارات SVG جاهزة، ولا يُشغّل وقت التشغيل.
   الاستخدام: node board-games/tools/build-risk-map.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const os = require("os");
const d3 = require("d3-geo");
const REGIONAL = require("../js/games/risk-maps.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js", "games", "risk-map-data.js");
const CACHE = path.join(os.tmpdir(), "risk-natural-earth");
const WIDTH = 1200;
const HEIGHT = 640;

const SOURCES = {
  countries: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  admin1: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
};

const CONTINENT_TERRITORIES = {
  na: ["alaska", "nwt", "greenland", "alberta", "ontario", "quebec", "wus", "eus", "central"],
  sa: ["venezuela", "peru", "brazil", "argentina"],
  eu: ["iceland", "britain", "scandinavia", "neurope", "weurope", "seurope", "ukraine"],
  af: ["nafrica", "egypt", "eafrica", "congo", "safrica", "madagascar"],
  as: ["mideast", "ural", "siberia", "yakutsk", "kamchatka", "irkutsk", "mongolia", "china", "japan", "india", "siam", "afghanistan"],
  au: ["indonesia", "newguinea", "waustralia", "eaustralia"],
};

const COUNTRY = {
  /* أمريكا الشمالية والوسطى */
  GRL: "greenland",
  MEX: "central", GTM: "central", BLZ: "central", HND: "central", SLV: "central", NIC: "central", CRI: "central", PAN: "central",
  CUB: "central", DOM: "central", HTI: "central", JAM: "central", BHS: "central", TTO: "central", BRB: "central", DMA: "central",
  GRD: "central", KNA: "central", LCA: "central", VCT: "central", ABW: "central", CUW: "central", SXM: "central", MAF: "central",
  BLM: "central", ATG: "central", MSR: "central", VGB: "central", VIR: "central", PRI: "central", CYM: "central", TCA: "central",
  AIA: "central", BMU: "eus", SPM: "quebec",

  /* أمريكا الجنوبية */
  VEN: "venezuela", COL: "venezuela", ECU: "venezuela", GUY: "venezuela", SUR: "venezuela", GUF: "venezuela",
  PER: "peru", BOL: "peru",
  BRA: "brazil",
  ARG: "argentina", CHL: "argentina", URY: "argentina", PRY: "argentina", FLK: "argentina", SGS: "argentina",

  /* أوروبا */
  ISL: "iceland",
  GBR: "britain", IRL: "britain", IMN: "britain", GGY: "britain", JEY: "britain",
  NOR: "scandinavia", SWE: "scandinavia", FIN: "scandinavia", ALA: "scandinavia", ALD: "scandinavia", FRO: "scandinavia",
  DNK: "neurope", DEU: "neurope", NLD: "neurope", BEL: "neurope", LUX: "neurope", POL: "neurope",
  CZE: "neurope", SVK: "neurope", AUT: "neurope", HUN: "neurope", CHE: "neurope", LIE: "neurope",
  EST: "neurope", LVA: "neurope", LTU: "neurope",
  FRA: "weurope", ESP: "weurope", PRT: "weurope", ITA: "weurope", AND: "weurope", MCO: "weurope", SMR: "weurope", VAT: "weurope", MLT: "weurope",
  GRC: "seurope", ALB: "seurope", MKD: "seurope", SRB: "seurope", BIH: "seurope", HRV: "seurope", MNE: "seurope",
  KOS: "seurope", BGR: "seurope", ROU: "seurope", SVN: "seurope",
  UKR: "ukraine", BLR: "ukraine", MDA: "ukraine",
  RUS: "russia",

  /* أفريقيا */
  MAR: "nafrica", DZA: "nafrica", TUN: "nafrica", LBY: "nafrica", ESH: "nafrica", SAH: "nafrica", MRT: "nafrica",
  MLI: "nafrica", NER: "nafrica", TCD: "nafrica", CPV: "nafrica",
  EGY: "egypt",
  SDN: "eafrica", SDS: "eafrica", ETH: "eafrica", ERI: "eafrica", DJI: "eafrica", SOM: "eafrica", SOL: "eafrica",
  KEN: "eafrica", UGA: "eafrica", TZA: "eafrica", RWA: "eafrica", BDI: "eafrica",
  COD: "congo", COG: "congo", CAF: "congo", CMR: "congo", GAB: "congo", GNQ: "congo", AGO: "congo", ZMB: "congo",
  BFA: "congo", SEN: "congo", GMB: "congo", GIN: "congo", GNB: "congo", SLE: "congo", LBR: "congo",
  CIV: "congo", GHA: "congo", TGO: "congo", BEN: "congo", NGA: "congo", STP: "congo",
  ZAF: "safrica", NAM: "safrica", BWA: "safrica", ZWE: "safrica", MOZ: "safrica", MWI: "safrica",
  LSO: "safrica", SWZ: "safrica", MUS: "safrica", SHN: "safrica",
  MDG: "madagascar", COM: "madagascar", SYC: "madagascar", MYT: "madagascar",

  /* آسيا */
  TUR: "mideast", GEO: "mideast", ARM: "mideast", AZE: "mideast", CYP: "mideast", CYN: "mideast",
  SYR: "mideast", LBN: "mideast", ISR: "mideast", PSX: "mideast", JOR: "mideast", IRQ: "mideast",
  IRN: "mideast", SAU: "mideast", YEM: "mideast", OMN: "mideast", ARE: "mideast", QAT: "mideast",
  BHR: "mideast", KWT: "mideast",
  KAZ: "ural",
  MNG: "mongolia",
  CHN: "china", TWN: "china", HKG: "china", MAC: "china", KOR: "china", PRK: "china",
  JPN: "japan",
  IND: "india", PAK: "india", BGD: "india", NPL: "india", BTN: "india", LKA: "india", MDV: "india", KAS: "india",
  MMR: "siam", THA: "siam", LAO: "siam", KHM: "siam", VNM: "siam", MYS: "siam", SGP: "siam", BRN: "siam",
  AFG: "afghanistan", TJK: "afghanistan", UZB: "afghanistan", TKM: "afghanistan", KGZ: "afghanistan",
  PHL: "indonesia",

  /* أوقيانوسيا */
  IDN: "indonesia", TLS: "indonesia",
  PNG: "newguinea", SLB: "newguinea",
  AUS: "eaustralia", ATC: "waustralia",
  NZL: "eaustralia", NCL: "eaustralia", FJI: "eaustralia", VUT: "eaustralia", PYF: "eaustralia",
  WSM: "eaustralia", TON: "eaustralia", KIR: "eaustralia", MHL: "eaustralia", FSM: "eaustralia",
  PLW: "eaustralia", NRU: "eaustralia", TUV: "eaustralia", COK: "eaustralia", NIU: "eaustralia",
  WLF: "eaustralia", ASM: "eaustralia", GUM: "eaustralia", MNP: "eaustralia", PCN: "eaustralia", NFK: "eaustralia",
};

const LABELS = {
  alaska: { at: [-150, 63], name: [-151, 55], anchor: "middle" },
  nwt: { at: [-108, 67], name: [-108, 76], anchor: "middle" },
  greenland: { at: [-41, 73], name: [-41, 81], anchor: "middle" },
  alberta: { at: [-113, 55], name: [-113, 48], anchor: "middle" },
  ontario: { at: [-85, 50], name: [-85, 43], anchor: "middle" },
  quebec: { at: [-70, 54], name: [-66, 61], anchor: "middle" },
  wus: { at: [-120, 41], name: [-120, 34], anchor: "middle" },
  eus: { at: [-84, 37], name: [-84, 30], anchor: "middle" },
  central: { at: [-92, 17], name: [-94, 10], anchor: "middle" },
  venezuela: { at: [-66, 4], name: [-70, -4], anchor: "middle" },
  peru: { at: [-72, -12], name: [-75, -20], anchor: "middle" },
  brazil: { at: [-52, -12], name: [-52, -21], anchor: "middle" },
  argentina: { at: [-64, -35], name: [-64, -44], anchor: "middle" },
  iceland: { at: [-18, 65], name: [-27, 69], anchor: "end" },
  britain: { at: [-4, 54], name: [-11, 49], anchor: "end" },
  scandinavia: { at: [16, 64], name: [20, 70], anchor: "middle" },
  neurope: { at: [12, 51], name: [18, 55], anchor: "start" },
  weurope: { at: [2, 45], name: [-6, 40], anchor: "end" },
  seurope: { at: [20, 42], name: [26, 37], anchor: "start" },
  ukraine: { at: [31, 50], name: [40, 52], anchor: "start" },
  nafrica: { at: [4, 24], name: [2, 15], anchor: "middle" },
  egypt: { at: [30, 27], name: [36, 29], anchor: "start" },
  eafrica: { at: [38, 6], name: [42, -1], anchor: "middle" },
  congo: { at: [20, 0], name: [16, -8], anchor: "middle" },
  safrica: { at: [24, -27], name: [22, -36], anchor: "middle" },
  madagascar: { at: [47, -19], name: [52, -22], anchor: "start" },
  mideast: { at: [45, 30], name: [47, 22], anchor: "middle" },
  ural: { at: [55, 59], name: [55, 67], anchor: "middle" },
  siberia: { at: [82, 63], name: [82, 71], anchor: "middle" },
  yakutsk: { at: [130, 68], name: [130, 76], anchor: "middle" },
  irkutsk: { at: [104, 55], name: [103, 47], anchor: "middle" },
  mongolia: { at: [103, 46], name: [103, 39], anchor: "middle" },
  china: { at: [108, 32], name: [111, 25], anchor: "middle" },
  japan: { at: [138, 37], name: [145, 42], anchor: "start" },
  india: { at: [78, 21], name: [78, 13], anchor: "middle" },
  siam: { at: [102, 15], name: [104, 8], anchor: "middle" },
  afghanistan: { at: [66, 33], name: [64, 40], anchor: "middle" },
  kamchatka: { at: [162, 61], name: [160, 69], anchor: "middle" },
  indonesia: { at: [114, -3], name: [112, -10], anchor: "middle" },
  newguinea: { at: [144, -6], name: [148, -13], anchor: "start" },
  waustralia: { at: [121, -24], name: [118, -32], anchor: "middle" },
  eaustralia: { at: [147, -30], name: [152, -37], anchor: "start" },
};

const CONTINENT_LABELS = {
  na: { text: "أمريكا الشمالية", at: [-112, 43] },
  sa: { text: "أمريكا الجنوبية", at: [-61, -24] },
  eu: { text: "أوروبا", at: [13, 56] },
  af: { text: "أفريقيا", at: [18, 3] },
  as: { text: "آسيا", at: [91, 51] },
  au: { text: "أوقيانوسيا", at: [135, -27] },
};

/* إطارات كاميرا مقصودة لكل قارة — لا نستخدم الحدود المحسوبة كاملةً
   لأن الجزر البعيدة تمدّ الصندوق على كامل الخريطة. */
const CONTINENT_FOCUS = {
  na: [24, 34, 690, 366],
  sa: [196, 262, 338, 338],
  eu: [444, 44, 340, 302],
  af: [456, 194, 320, 368],
  as: [612, 30, 576, 380],
  au: [752, 268, 440, 350],
};

const ADMIN1_TERRITORY = {
  USA: {
    AK: "alaska", HI: "wus",
    WA: "wus", OR: "wus", CA: "wus", NV: "wus", ID: "wus", MT: "wus", WY: "wus", UT: "wus", CO: "wus", AZ: "wus", NM: "wus",
    ND: "eus", SD: "eus", NE: "eus", KS: "eus", OK: "eus", TX: "eus", MN: "eus", IA: "eus", MO: "eus", AR: "eus", LA: "eus",
    WI: "eus", IL: "eus", MI: "eus", IN: "eus", OH: "eus", KY: "eus", TN: "eus", MS: "eus", AL: "eus", GA: "eus", FL: "eus",
    SC: "eus", NC: "eus", VA: "eus", WV: "eus", MD: "eus", DE: "eus", PA: "eus", NJ: "eus", NY: "eus", CT: "eus", RI: "eus",
    MA: "eus", VT: "eus", NH: "eus", ME: "eus", DC: "eus",
  },
  CAN: {
    YT: "nwt", NT: "nwt", NU: "nwt",
    BC: "alberta", AB: "alberta", SK: "alberta", MB: "alberta",
    ON: "ontario",
    QC: "quebec", NB: "quebec", NS: "quebec", PE: "quebec", NL: "quebec",
  },
  AUS: {
    WA: "waustralia", NT: "waustralia", SA: "waustralia",
    QLD: "eaustralia", NSW: "eaustralia", VIC: "eaustralia", TAS: "eaustralia", ACT: "eaustralia",
  },
};

const RUSSIA_BANDS = [
  { id: "ural", lon: [0, 60] },
  { id: "siberia", lon: [60, 90] },
  { id: "irkutsk", lon: [90, 120] },
  { id: "yakutsk", lon: [120, 150] },
  { id: "kamchatka", lon: [150, 180] },
  { id: "kamchatka", lon: [-180, -170] },
];

function ensureCache() {
  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });
}

async function fetchJson(key, url) {
  ensureCache();
  const file = path.join(CACHE, key + ".geojson");
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return JSON.parse(fs.readFileSync(file, "utf8"));
  console.log("تنزيل " + key + " ...");
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل تنزيل " + url + ": " + res.status);
  const text = await res.text();
  fs.writeFileSync(file, text);
  return JSON.parse(text);
}

function rdp(points, tolerance) {
  if (!points || points.length < 4) return points;
  const sq = tolerance * tolerance;
  function distSq(p, a, b) {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx || dy) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  }
  function simplify(first, last, out) {
    let max = sq;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distSq(points[i], points[first], points[last]);
      if (d > max) { max = d; index = i; }
    }
    if (index >= 0) {
      if (index - first > 1) simplify(first, index, out);
      out.push(points[index]);
      if (last - index > 1) simplify(index, last, out);
    }
  }
  const out = [points[0]];
  simplify(0, points.length - 1, out);
  out.push(points[points.length - 1]);
  return out;
}

function simplifyRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ring.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  const span = Math.max(maxX - minX, maxY - minY);
  const tolerance = Math.max(0.012, Math.min(0.16, span * 0.0025));
  const simplified = rdp(ring, tolerance);
  const cleaned = simplified.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  if (cleaned.length < 4) return ring;
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) cleaned.push([first[0], first[1]]);
  return cleaned;
}

function simplifyGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(simplifyRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map((poly) => poly.map(simplifyRing)) };
  }
  return geometry;
}

function polygonFeatures(feature) {
  const geom = simplifyGeometry(feature.geometry);
  if (!geom) return [];
  if (geom.type === "Polygon") return [{ type: "Feature", properties: feature.properties, geometry: { type: "Polygon", coordinates: geom.coordinates } }];
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.map((poly) => ({
      type: "Feature",
      properties: feature.properties,
      geometry: { type: "Polygon", coordinates: poly },
    }));
  }
  return [];
}

function featureTerritory(feature) {
  const p = feature.properties || {};
  const admin = String(p.adm0_a3 || p.ADM0_A3 || "").toUpperCase();
  if (ADMIN1_TERRITORY[admin] && (p.adm1_code || p.ADM1_CODE)) {
    const code = String(p.postal || p.POSTAL || "").toUpperCase();
    return ADMIN1_TERRITORY[admin][code] || null;
  }
  const code = String(p.ADM0_A3 || p.adm0_a3 || p.ISO_A3 || "").toUpperCase();
  if (!code) return null;
  const centroid = d3.geoCentroid(feature);
  if (code === "FRA" && centroid[0] < -30 && centroid[1] < 20) return "venezuela";
  if (code === "NLD" && centroid[0] < -30) return "venezuela";
  if (code === "GBR" && centroid[0] < -35) return "argentina";
  if (code === "ESP" && centroid[0] < -12 && centroid[1] < 32) return "nafrica";
  if (code === "CHL" && centroid[0] < -100) return "argentina";
  if (code === "ECU" && centroid[0] < -80) return "venezuela";
  if (code === "RUS") return "russia";
  return COUNTRY[code] || null;
}

function nearestTerritory(centroid, labels) {
  let best = "central";
  let bestDist = Infinity;
  Object.keys(labels).forEach((id) => {
    const p = labels[id].at;
    const dx = (p[0] - centroid[0]) * Math.cos(((p[1] + centroid[1]) / 2) * Math.PI / 180);
    const dy = p[1] - centroid[1];
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = id; }
  });
  return best;
}

function roundBox(box) {
  return box.map((n) => Math.round(n * 10) / 10);
}

async function buildClassic(countries, admin1) {
  const projection = d3.geoNaturalEarth1()
    .rotate([-10, 0])
    .fitExtent([[22, 22], [WIDTH - 22, HEIGHT - 22]], {
      type: "FeatureCollection",
      features: countries.features.filter((f) => f.properties.ADM0_A3 !== "ATA"),
    });
  const geoPath = d3.geoPath(projection).digits(1);

  const byTerritory = {};
  Object.values(CONTINENT_TERRITORIES).flat().forEach((id) => { byTerritory[id] = []; });
  const russiaPolys = [];
  const unassigned = [];

  function add(feature, territory) {
    if (!territory) return;
    if (territory === "russia") { russiaPolys.push(feature); return; }
    if (!byTerritory[territory]) byTerritory[territory] = [];
    byTerritory[territory].push(feature);
  }

  for (const feature of countries.features) {
    const code = String(feature.properties.ADM0_A3 || "").toUpperCase();
    if (code === "ATA" || code === "ATF" || code === "HMD" || code === "IOA" || code === "IOT") continue;
    // الولايات/المقاطعات تُرسم من طبقة admin1 لتفادي التكرار والتداخل.
    if (ADMIN1_TERRITORY[code]) continue;
    const polys = polygonFeatures(feature);
    polys.forEach((poly) => {
      let terr = featureTerritory(poly);
      if (!terr) {
        const c = d3.geoCentroid(poly);
        if (c[1] < -60) return;
        terr = nearestTerritory(c, LABELS);
        unassigned.push(code + " → " + terr + " @" + c.map((n) => n.toFixed(0)).join(","));
      }
      add(poly, terr);
    });
  }

  for (const feature of admin1.features) {
    const admin = String(feature.properties.adm0_a3 || "").toUpperCase();
    if (!ADMIN1_TERRITORY[admin]) continue;
    featureTerritory(feature);
    const terr = featureTerritory(feature);
    if (terr) add(feature, terr);
  }

  const russiaPath = russiaPolys.length ? geoPath({ type: "FeatureCollection", features: russiaPolys }) : "";
  const russiaClips = {};
  RUSSIA_BANDS.forEach((band, i) => {
    const ring = [];
    for (let lat = -85; lat <= 85; lat += 5) ring.push([band.lon[0], lat]);
    for (let lat = 85; lat >= -85; lat -= 5) ring.push([band.lon[1], lat]);
    ring.push(ring[0]);
    russiaClips[band.id + "-" + i] = geoPath({ type: "Polygon", coordinates: [ring] });
  });

  const territories = {};
  Object.keys(LABELS).forEach((id) => {
    const parts = [];
    if (byTerritory[id] && byTerritory[id].length) {
      parts.push({ d: geoPath({ type: "FeatureCollection", features: byTerritory[id] }) });
    }
    if (id === "ural" || id === "siberia" || id === "irkutsk" || id === "yakutsk" || id === "kamchatka") {
      RUSSIA_BANDS.forEach((band, i) => {
        if (band.id !== id) return;
        parts.push({ d: russiaPath, clip: band.id + "-" + i });
      });
    }
    const at = projection(LABELS[id].at);
    const name = projection(LABELS[id].name);
    territories[id] = {
      parts,
      label: at ? [Math.round(at[0] * 10) / 10, Math.round(at[1] * 10) / 10] : [0, 0],
      name: name ? [Math.round(name[0] * 10) / 10, Math.round(name[1] * 10) / 10] : [0, 0],
      anchor: LABELS[id].anchor,
    };
  });

  const continents = {};
  Object.keys(CONTINENT_TERRITORIES).forEach((code) => {
    const boxes = CONTINENT_TERRITORIES[code].map((id) => {
      const feats = [];
      if (byTerritory[id]) feats.push(...byTerritory[id]);
      if (["ural", "siberia", "irkutsk", "yakutsk", "kamchatka"].includes(id)) feats.push(...russiaPolys);
      if (!feats.length) return null;
      return geoPath.bounds({ type: "FeatureCollection", features: feats });
    }).filter(Boolean);
    if (!boxes.length) return;
    const x0 = Math.min(...boxes.map((b) => b[0][0]));
    const y0 = Math.min(...boxes.map((b) => b[0][1]));
    const x1 = Math.max(...boxes.map((b) => b[1][0]));
    const y1 = Math.max(...boxes.map((b) => b[1][1]));
    const at = projection(CONTINENT_LABELS[code].at);
    continents[code] = {
      box: roundBox([Math.max(0, x0 - 10), Math.max(0, y0 - 10), Math.min(WIDTH, x1 + 10) - Math.max(0, x0 - 10), Math.min(HEIGHT, y1 + 10) - Math.max(0, y0 - 10)]),
      focus: CONTINENT_FOCUS[code].slice(),
      label: at ? [Math.round(at[0] * 10) / 10, Math.round(at[1] * 10) / 10] : [0, 0],
      text: CONTINENT_LABELS[code].text,
    };
  });

  const graticule = d3.geoGraticule().step([30, 30])();
  const data = {
    source: "Natural Earth (public domain), projected with d3-geo Natural Earth I",
    width: WIDTH,
    height: HEIGHT,
    graticule: geoPath(graticule),
    clips: russiaClips,
    continents,
    territories,
  };
  data.stats = {
    territories: Object.keys(territories).filter((id) => territories[id].parts.length).length,
    missing: Object.keys(territories).filter((id) => !territories[id].parts.length),
    unassigned,
  };
  return data;
}

/* ==========================================================================
   الخرائط الإقليمية — تُبنى من نفس بيانات Natural Earth، مع إسقاط وحدود
   مستقلة لكل خريطة، وتجميع الدول في أقاليم ريسك حسب ملف risk-maps.js.
   ========================================================================== */

function bboxContains(bbox, lon, lat, pad) {
  const p = pad == null ? 0 : pad;
  return lon >= bbox[0] - p && lon <= bbox[2] + p && lat >= bbox[1] - p && lat <= bbox[3] + p;
}

function fitProjection(projection, bbox, width, height, pad) {
  projection.scale(1).translate([0, 0]);
  const [lon0, lat0, lon1, lat1] = bbox;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i <= 16; i++) {
    for (let j = 0; j <= 16; j++) {
      const lon = lon0 + (lon1 - lon0) * (i / 16);
      const lat = lat0 + (lat1 - lat0) * (j / 16);
      const p = projection([lon, lat]);
      if (!p) continue;
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
  }
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / Math.max(1e-6, maxX - minX), innerH / Math.max(1e-6, maxY - minY));
  const usedW = (maxX - minX) * scale;
  const usedH = (maxY - minY) * scale;
  projection
    .scale(scale)
    .translate([pad + (innerW - usedW) / 2 - minX * scale, pad + (innerH - usedH) / 2 - minY * scale])
    .clipExtent([[0, 0], [width, height]]);
  return projection;
}

function bandClipPath(projection, lonRange, width, height) {
  const geoPath = d3.geoPath(projection).digits(1);
  const ring = [];
  for (let lat = -85; lat <= 85; lat += 4) ring.push([lonRange[0], lat]);
  for (let lat = 85; lat >= -85; lat -= 4) ring.push([lonRange[1], lat]);
  ring.push(ring[0]);
  return geoPath({ type: "Polygon", coordinates: [ring] });
}

function admin1Keys(feature) {
  const p = feature.properties || {};
  const postal = String(p.postal || p.POSTAL || "").toUpperCase();
  const iso = String(p.iso_3166_2 || p.ISO_3166_2 || "").toUpperCase();
  const suffix = iso.indexOf("-") >= 0 ? iso.split("-").pop() : "";
  return [postal, suffix, iso].filter(Boolean);
}

function buildRegionalMap(map, countries, admin1) {
  const width = map.width || 1200;
  const height = map.height || 760;
  const pad = map.padding == null ? 18 : map.padding;
  const projection = fitProjection(d3.geoNaturalEarth1().rotate([-10, 0]), map.bbox, width, height, pad);
  const geoPath = d3.geoPath(projection).digits(1);

  const byTerritory = {};
  map.territories.forEach((t) => { byTerritory[t.id] = []; });

  const countryToTerritory = new Map();
  const admin1ToTerritory = new Map();
  const splitCountries = new Set();
  map.territories.forEach((t) => {
    (t.countries || []).forEach((code) => {
      const key = String(code).toUpperCase();
      if (countryToTerritory.has(key)) throw new Error(map.id + ": الدولة " + key + " معيّنة أكثر من مرة");
      countryToTerritory.set(key, t.id);
    });
    Object.keys(t.admin1 || {}).forEach((code) => {
      const key = String(code).toUpperCase();
      splitCountries.add(key);
      if (!admin1ToTerritory.has(key)) admin1ToTerritory.set(key, new Map());
      t.admin1[key].forEach((code2) => {
        const k2 = String(code2).toUpperCase();
        if (admin1ToTerritory.get(key).has(k2)) throw new Error(map.id + ": المقاطعة " + key + "/" + k2 + " معيّنة أكثر من مرة");
        admin1ToTerritory.get(key).set(k2, t.id);
      });
    });
  });

  const banded = new Set((map.bands || []).map((b) => b.territory));
  splitCountries.forEach((code) => {
    if (countryToTerritory.has(code)) throw new Error(map.id + ": الدولة " + code + " مقسّمة بالدول والمقاطعات معًا");
  });

  const neutral = [];
  const neutralSkip = new Set((map.neutralSkip || []).map((code) => String(code).toUpperCase()));
  const unassigned = [];
  const missingAdmin1 = [];

  for (const feature of countries.features) {
    const code = String(feature.properties.ADM0_A3 || "").toUpperCase();
    if (!code || code === "ATA" || code === "ATF" || code === "HMD" || code === "IOA" || code === "IOT") continue;
    if (code === "RUS" && (map.bands || []).length) continue;
    if (splitCountries.has(code)) continue;
    const territory = countryToTerritory.get(code);
    for (const poly of polygonFeatures(feature)) {
      const centroid = d3.geoCentroid(poly);
      if (!bboxContains(map.bbox, centroid[0], centroid[1], 8)) continue;
      if (territory) byTerritory[territory].push(poly);
      else if (!neutralSkip.has(code)) neutral.push(poly);
    }
    if (!territory && !neutralSkip.has(code) && bboxContains(map.bbox, d3.geoCentroid(feature)[0], d3.geoCentroid(feature)[1], 0)) {
      unassigned.push(code);
    }
  }

  for (const feature of admin1.features) {
    const admin = String(feature.properties.adm0_a3 || "").toUpperCase();
    if (!splitCountries.has(admin)) continue;
    const keys = admin1Keys(feature);
    const table = admin1ToTerritory.get(admin);
    let territory = null;
    for (const key of keys) {
      if (table.has(key)) { territory = table.get(key); break; }
    }
    if (!territory) {
      missingAdmin1.push(admin + "/" + keys.join("|") + " (" + (feature.properties.name || "?") + ")");
      continue;
    }
    const centroid = d3.geoCentroid(feature);
    if (!bboxContains(map.bbox, centroid[0], centroid[1], 8)) continue;
    byTerritory[territory].push(feature);
  }

  const russiaPolys = [];
  if ((map.bands || []).length) {
    for (const feature of countries.features) {
      if (String(feature.properties.ADM0_A3 || "").toUpperCase() !== "RUS") continue;
      polygonFeatures(feature).forEach((poly) => russiaPolys.push(poly));
    }
  }
  const russiaPath = russiaPolys.length ? geoPath({ type: "FeatureCollection", features: russiaPolys }) : "";
  const clips = {};
  (map.bands || []).forEach((band, i) => {
    const key = "band-" + i;
    clips[key] = bandClipPath(projection, band.lon, width, height);
  });

  const territories = {};
  map.territories.forEach((t) => {
    const parts = [];
    if (byTerritory[t.id] && byTerritory[t.id].length) {
      parts.push({ d: geoPath({ type: "FeatureCollection", features: byTerritory[t.id] }) });
    }
    (map.bands || []).forEach((band, i) => {
      if (band.territory !== t.id || !russiaPath) return;
      parts.push({ d: russiaPath, clip: "band-" + i });
    });
    const at = projection(t.label || d3.geoCentroid({ type: "FeatureCollection", features: byTerritory[t.id] || [] }));
    const nameAt = t.nameAt ? projection(t.nameAt) : (at ? [at[0], at[1] - 18] : null);
    territories[t.id] = {
      parts,
      label: at ? [Math.round(at[0] * 10) / 10, Math.round(at[1] * 10) / 10] : [0, 0],
      name: nameAt ? [Math.round(nameAt[0] * 10) / 10, Math.round(nameAt[1] * 10) / 10] : [0, 0],
      anchor: t.anchor || "middle",
    };
  });

  const continents = {};
  Object.keys(map.continents).forEach((code) => {
    const ids = map.territories.filter((t) => t.c === code).map((t) => t.id);
    const points = ids.map((id) => territories[id].label).filter(Boolean);
    if (!points.length) return;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    let x0 = Math.min(...xs) - 90;
    let y0 = Math.min(...ys) - 70;
    let x1 = Math.max(...xs) + 90;
    let y1 = Math.max(...ys) + 70;
    const minW = 230;
    const minH = 170;
    if (x1 - x0 < minW) { const cx = (x0 + x1) / 2; x0 = cx - minW / 2; x1 = cx + minW / 2; }
    if (y1 - y0 < minH) { const cy = (y0 + y1) / 2; y0 = cy - minH / 2; y1 = cy + minH / 2; }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(width, x1); y1 = Math.min(height, y1);
    const labelAt = [xs.reduce((a, b) => a + b, 0) / xs.length, ys.reduce((a, b) => a + b, 0) / ys.length];
    continents[code] = {
      box: [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)],
      focus: [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)],
      label: [Math.round(labelAt[0]), Math.round(labelAt[1])],
      text: map.continents[code].name,
    };
  });

  const graticule = d3.geoGraticule().step([10, 10])();
  return {
    source: "Natural Earth (public domain), projected with d3-geo Natural Earth I",
    width,
    height,
    graticule: geoPath(graticule),
    clips,
    neutral: neutral.length ? [{ d: geoPath({ type: "FeatureCollection", features: neutral }) }] : [],
    continents,
    territories,
    stats: { unassigned, missingAdmin1 },
  };
}

async function main() {
  const countries = await fetchJson("countries", SOURCES.countries);
  const admin1 = await fetchJson("admin1", SOURCES.admin1);
  const classic = await buildClassic(countries, admin1);
  const classicStats = classic.stats;
  delete classic.stats;
  const maps = { classic };
  const regionalStats = {};
  for (const id of Object.keys(REGIONAL)) {
    const map = Object.assign({}, REGIONAL[id], { id });
    console.log("توليد خريطة " + map.name + " ...");
    maps[id] = buildRegionalMap(map, countries, admin1);
    regionalStats[id] = maps[id].stats;
    delete maps[id].stats;
  }

  const data = {
    version: 2,
    source: "Natural Earth (public domain), projected with d3-geo Natural Earth I",
    maps,
  };
  const js = "/* خرائط ريسك — بيانات Natural Earth (الملكية العامة). مولّدة آليًا. */\n" +
    "window.RISK_GEO = " + JSON.stringify(data) + ";\n";
  fs.writeFileSync(OUT, js, "utf8");
  console.log("كُتب " + path.relative(ROOT, OUT) + " (" + (Buffer.byteLength(js) / 1024).toFixed(1) + " KB)");
  console.log("  classic: " + classicStats.territories + "/" + Object.keys(maps.classic.territories).length + " إقليمًا" +
    (classicStats.missing.length ? "، بلا أشكال: " + classicStats.missing.join(", ") : ""));
  for (const id of Object.keys(REGIONAL)) {
    const m = maps[id];
    const st = regionalStats[id] || {};
    const count = Object.keys(m.territories).length;
    const filled = Object.keys(m.territories).filter((key) => m.territories[key].parts.length).length;
    console.log("  " + id + ": " + count + " إقليمًا، " + filled + " بأشكال" +
      (st.missingAdmin1 && st.missingAdmin1.length ? "، مقاطعات مفقودة: " + st.missingAdmin1.join("، ") : "") +
      (st.unassigned && st.unassigned.length ? "، دول محايدة: " + st.unassigned.join(", ") : ""));
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
