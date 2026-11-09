/* ==========================================================================
   تيكيت تو رايد — رسومات أصلية (SVG)
   بطاقات القطارات، القاطرات، تذاكر الوجهة، وظهر البطاقة.
   كل الرسومات مولّدة داخل المشروع بلا أصول خارجية.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;

  let seq = 0;
  function uid() { seq += 1; return "ttra" + seq; }

  const COLORS = {
    red: { name: "أحمر", en: "RED", hex: "#d25757", ink: "#2a0d0d" },
    orange: { name: "برتقالي", en: "ORANGE", hex: "#df8e42", ink: "#2c1606" },
    yellow: { name: "أصفر", en: "YELLOW", hex: "#e3c24d", ink: "#2c2406" },
    green: { name: "أخضر", en: "GREEN", hex: "#4f9f69", ink: "#06200f" },
    blue: { name: "أزرق", en: "BLUE", hex: "#4b87d0", ink: "#06182b" },
    pink: { name: "وردي", en: "PINK", hex: "#d174a3", ink: "#2b0a1b" },
    black: { name: "أسود", en: "BLACK", hex: "#3d454b", ink: "#f0f5f7" },
    white: { name: "أبيض", en: "WHITE", hex: "#e6eaec", ink: "#1b2429" },
    gray: { name: "رمادي", en: "GRAY", hex: "#9aa7ae", ink: "#10181c" },
    loco: { name: "قاطرة", en: "LOCOMOTIVE · WILD", hex: "#c89b3f", ink: "#241a05" },
  };
  const CARD_COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "black", "white"];
  const HAND_COLORS = CARD_COLORS.concat(["loco"]);

  /* --------------------------- أدوات ألوان --------------------------- */

  function hexToRgb(hex) {
    const clean = String(hex || "#888888").replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function toHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }

  function mix(a, b, ratio) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const t = Math.max(0, Math.min(1, ratio));
    return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }

  /** t موجب = تفتيح، سالب = تعتيم */
  function shade(hex, t) {
    return t >= 0 ? mix(hex, "#ffffff", t) : mix(hex, "#101010", -t);
  }

  function svg(viewBox, body, cls, extra) {
    return '<svg class="' + (cls || "ttra-svg") + '" viewBox="' + viewBox +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ' +
      (extra || "") + ">" + body + "</svg>";
  }

  /* --------------------------- قطع القطار --------------------------- */

  function wheels(dark, steel) {
    return '<g fill="' + steel + '" stroke="' + dark + '" stroke-width=".8">' +
      '<circle cx="24" cy="57" r="8.6"/><circle cx="98" cy="57" r="8.6"/>' +
      '<circle cx="24" cy="57" r="3.4" fill="' + dark + '"/><circle cx="98" cy="57" r="3.4" fill="' + dark + '"/>' +
      "</g>" +
      '<path d="M8 57h8M33 57h56M107 57h8" stroke="' + dark + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M14 52h92" stroke="' + dark + '" stroke-opacity=".5" stroke-width="1.4"/>';
  }

  function windowRow(n, y, dark, light) {
    let out = "";
    for (let i = 0; i < n; i++) {
      const x = 15 + i * 15;
      out += '<rect x="' + x + '" y="' + y + '" width="9" height="12" rx="2" fill="' + light +
        '" stroke="' + dark + '" stroke-opacity=".55" stroke-width=".6"/>' +
        '<rect x="' + (x + 1.2) + '" y="' + (y + 1.4) + '" width="6.6" height="4.4" rx="1.2" fill="#ffffff" opacity=".55"/>';
    }
    return out;
  }

  function coach(meta) {
    const dark = shade(meta.hex, -0.4);
    const light = shade(meta.hex, 0.38);
    return '<g>' +
      '<rect x="4" y="13" width="112" height="38" rx="6" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M8 13q52-8 104 0" fill="none" stroke="' + light + '" stroke-width="2" opacity=".5"/>' +
      '<rect x="4" y="45" width="112" height="6" fill="' + dark + '" opacity=".55"/>' +
      windowRow(7, 24, dark, light) +
      '<rect x="55" y="20" width="10" height="28" rx="2" fill="' + shade(meta.hex, -0.22) + '" stroke="' + dark + '" stroke-width=".7"/>' +
      wheels(dark, shade(meta.hex, -0.5)) +
      "</g>";
  }

  function boxcar(meta) {
    const dark = shade(meta.hex, -0.44);
    const light = shade(meta.hex, 0.3);
    let planks = "";
    for (let x = 14; x < 112; x += 12) {
      planks += '<path d="M' + x + ' 17v29" stroke="' + dark + '" stroke-opacity=".32" stroke-width="1"/>';
    }
    return '<g>' +
      '<rect x="6" y="12" width="108" height="40" rx="3" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M8 17h104M8 48h104" stroke="' + light + '" stroke-opacity=".55" stroke-width="1.2"/>' +
      planks +
      '<rect x="43" y="18" width="34" height="28" rx="2" fill="' + shade(meta.hex, -0.16) + '" stroke="' + dark + '" stroke-width="1.1"/>' +
      '<path d="M46 21v22M74 21v22" stroke="' + dark + '" stroke-opacity=".55"/>' +
      '<rect x="58" y="28" width="4" height="8" rx="1" fill="' + light + '"/>' +
      wheels(dark, shade(meta.hex, -0.52)) +
      "</g>";
  }

  function caboose(meta) {
    const dark = shade(meta.hex, -0.42);
    const light = shade(meta.hex, 0.4);
    return '<g>' +
      '<rect x="8" y="18" width="104" height="34" rx="4" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<rect x="38" y="5" width="44" height="17" rx="3" fill="' + shade(meta.hex, -0.12) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<path d="M38 9h44" stroke="' + light + '" stroke-opacity=".5"/>' +
      windowRow(5, 25, dark, light) +
      '<rect x="45" y="8" width="10" height="8" rx="1.4" fill="' + light + '" stroke="' + dark + '" stroke-width=".6"/>' +
      '<rect x="67" y="8" width="10" height="8" rx="1.4" fill="' + light + '" stroke="' + dark + '" stroke-width=".6"/>' +
      '<path d="M8 47h104" stroke="' + dark + '" stroke-opacity=".55" stroke-width="3"/>' +
      wheels(dark, shade(meta.hex, -0.52)) +
      "</g>";
  }

  function tanker(meta) {
    const dark = shade(meta.hex, -0.42);
    const light = shade(meta.hex, 0.45);
    return '<g>' +
      '<rect x="5" y="21" width="110" height="30" rx="15" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.5"/>' +
      '<ellipse cx="117" cy="36" rx="7" ry="15" fill="' + shade(meta.hex, -0.1) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<path d="M14 23q0 26 0 26M36 22v29M58 21v30M80 22v29M102 23v26" stroke="' + dark + '" stroke-opacity=".4" stroke-width="1.4"/>' +
      '<path d="M20 25q12-5 26-2" fill="none" stroke="' + light + '" stroke-width="2" opacity=".55"/>' +
      '<rect x="52" y="12" width="16" height="11" rx="3" fill="' + shade(meta.hex, 0.12) + '" stroke="' + dark + '" stroke-width="1"/>' +
      '<path d="M55 16h10" stroke="' + light + '" stroke-width="2" stroke-linecap="round"/>' +
      wheels(dark, shade(meta.hex, -0.52)) +
      "</g>";
  }

  function diesel(meta) {
    const dark = shade(meta.hex, -0.46);
    const light = shade(meta.hex, 0.42);
    return '<g>' +
      '<path d="M12 14h72l22 10 8 16v12H8V22Z" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M88 18l16 10 5 12" fill="none" stroke="' + light + '" stroke-width="1.6" opacity=".6"/>' +
      '<path d="M8 30h104" stroke="' + light + '" stroke-opacity=".5" stroke-width="2"/>' +
      '<path d="M8 47h104" stroke="' + dark + '" stroke-opacity=".55" stroke-width="4"/>' +
      '<rect x="20" y="20" width="14" height="10" rx="2" fill="' + light + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<rect x="40" y="20" width="14" height="10" rx="2" fill="' + light + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<rect x="60" y="20" width="14" height="10" rx="2" fill="' + light + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<path d="M86 15l12 8 6 11" fill="none" stroke="' + light + '" stroke-width="2.4"/>' +
      '<circle cx="107" cy="25" r="2.4" fill="#fff8d8"/>' +
      wheels(dark, shade(meta.hex, -0.55)) +
      "</g>";
  }

  function observation(meta) {
    const dark = shade(meta.hex, -0.42);
    const light = shade(meta.hex, 0.44);
    return '<g>' +
      '<path d="M6 18h100q14 0 14 16v14H6Z" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M8 30h110" stroke="' + light + '" stroke-opacity=".45" stroke-width="1.6"/>' +
      windowRow(6, 21, dark, light) +
      '<path d="M104 21q10 0 10 12v3" fill="none" stroke="' + light + '" stroke-width="1.4"/>' +
      '<path d="M8 49h110" stroke="' + dark + '" stroke-opacity=".55" stroke-width="3"/>' +
      wheels(dark, shade(meta.hex, -0.52)) +
      "</g>";
  }

  function hopper(meta) {
    const dark = shade(meta.hex, -0.44);
    const light = shade(meta.hex, 0.32);
    return '<g>' +
      '<path d="M8 14h100l-8 36H16Z" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M12 14q46-7 92 0" fill="none" stroke="' + light + '" stroke-width="2" opacity=".5"/>' +
      '<path d="M18 20h16l-3 24H18Zm30 0h16l-3 24H48Zm30 0h16l-3 24H78Z" fill="' + shade(meta.hex, -0.2) + '" stroke="' + dark + '" stroke-opacity=".55"/>' +
      '<path d="M20 44h78" stroke="' + dark + '" stroke-opacity=".6" stroke-width="3"/>' +
      '<path d="M28 14l4-5M48 13l2-5M68 14l-1-5M88 15l-3-5" stroke="' + dark + '" stroke-width="1.4"/>' +
      wheels(dark, shade(meta.hex, -0.52)) +
      "</g>";
  }

  function reefer(meta) {
    const dark = shade(meta.hex, -0.4);
    const light = shade(meta.hex, 0.5);
    return '<g>' +
      '<rect x="6" y="12" width="108" height="41" rx="4" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<path d="M11 18h98M11 47h98" stroke="' + dark + '" stroke-opacity=".35"/>' +
      '<rect x="20" y="24" width="80" height="16" rx="3" fill="' + light + '" stroke="' + dark + '" stroke-width=".8"/>' +
      '<path d="M30 24v16M50 24v16M70 24v16M90 24v16" stroke="' + dark + '" stroke-opacity=".32"/>' +
      '<rect x="45" y="7" width="30" height="7" rx="2" fill="' + shade(meta.hex, 0.16) + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<circle cx="60" cy="10.5" r="1.6" fill="' + dark + '"/>' +
      wheels(dark, shade(meta.hex, -0.5)) +
      "</g>";
  }

  function steamLoco(meta) {
    const dark = shade(meta.hex, -0.55);
    const light = shade(meta.hex, 0.5);
    return '<g>' +
      '<g fill="#e8edf0" opacity=".5">' +
      '<circle cx="27" cy="7" r="4.6"/><circle cx="18" cy="-1" r="3.4"/><circle cx="33" cy="-5" r="3"/><circle cx="24" cy="-11" r="2.2"/>' +
      "</g>" +
      '<path d="M6 52h112l-7 9H13Z" fill="' + dark + '"/>' +
      '<rect x="19" y="24" width="66" height="28" rx="13" fill="url(#trainBody)" stroke="' + dark + '" stroke-width="1.5"/>' +
      '<circle cx="83" cy="38" r="14" fill="' + shade(meta.hex, 0.06) + '" stroke="' + dark + '" stroke-width="1.4"/>' +
      '<circle cx="83" cy="38" r="7" fill="' + shade(meta.hex, -0.22) + '" stroke="' + dark + '" stroke-width="1"/>' +
      '<path d="M58 58l-6 8M94 58l5 8M48 58l-4 8" stroke="' + dark + '" stroke-width="1.6"/>' +
      '<rect x="31" y="10" width="15" height="18" rx="3" fill="' + shade(meta.hex, -0.1) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<path d="M28 10h21" stroke="' + dark + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="78" y="12" width="36" height="40" rx="4" fill="' + shade(meta.hex, 0.08) + '" stroke="' + dark + '" stroke-width="1.3"/>' +
      '<path d="M75 12h42" stroke="' + dark + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="84" y="20" width="11" height="12" rx="2" fill="' + light + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<rect x="98" y="20" width="10" height="12" rx="2" fill="' + light + '" stroke="' + dark + '" stroke-width=".7"/>' +
      '<circle cx="28" cy="57" r="11" fill="' + shade(meta.hex, -0.46) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<circle cx="28" cy="57" r="4" fill="' + light + '"/>' +
      '<circle cx="60" cy="57" r="11" fill="' + shade(meta.hex, -0.46) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<circle cx="60" cy="57" r="4" fill="' + light + '"/>' +
      '<circle cx="96" cy="56" r="13" fill="' + shade(meta.hex, -0.46) + '" stroke="' + dark + '" stroke-width="1.2"/>' +
      '<circle cx="96" cy="56" r="4.6" fill="' + light + '"/>' +
      '<path d="M28 57h68" stroke="' + dark + '" stroke-width="2"/>' +
      '<path d="M16 40h8v16h-8Z" fill="' + shade(meta.hex, -0.25) + '" stroke="' + dark + '" stroke-width="1"/>' +
      '<circle cx="11" cy="48" r="5" fill="' + light + '" stroke="' + dark + '" stroke-width="1"/>' +
      "</g>";
  }

  const CAR_TYPES = {
    red: caboose,
    orange: boxcar,
    yellow: coach,
    green: tanker,
    blue: diesel,
    pink: observation,
    black: hopper,
    white: reefer,
    loco: steamLoco,
  };

  function carDrawing(color) {
    const meta = COLORS[color] || COLORS.gray;
    const fn = CAR_TYPES[color] || coach;
    return fn(meta);
  }

  /* --------------------------- بطاقة قطار --------------------------- */

  function trainCard(color) {
    const meta = COLORS[color] || COLORS.gray;
    const g = uid();
    const light = shade(meta.hex, 0.42);
    const dark = shade(meta.hex, -0.42);
    const deep = shade(meta.hex, -0.66);
    const plateTop = mix(meta.hex, "#0b171b", 0.68);
    const plateBottom = mix(meta.hex, "#050d10", 0.8);
    const isLoco = color === "loco";
    const ornament = isLoco
      ? '<path d="M71 57h30M79 51h14M84 45h4" stroke="' + shade(meta.hex, 0.34) + '" stroke-width="1.3" stroke-linecap="round"/>'
      : "";
    const body = '<defs>' +
      '<linearGradient id="' + g + 'body" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + light + '"/><stop offset=".46" stop-color="' + meta.hex + '"/><stop offset="1" stop-color="' + dark + '"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + g + 'plate" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="' + plateTop + '"/><stop offset="1" stop-color="' + plateBottom + '"/>' +
      "</linearGradient>" +
      '<pattern id="' + g + 'dots" width="12" height="12" patternUnits="userSpaceOnUse">' +
      '<circle cx="3" cy="3" r=".7" fill="#ffffff" fill-opacity=".12"/>' +
      "</pattern>" +
      '<filter id="' + g + 'sh" x="-20%" y="-20%" width="140%" height="150%">' +
      '<feDropShadow dx="0" dy="2.4" stdDeviation="2.2" flood-color="#000" flood-opacity=".55"/>' +
      "</filter>" +
      "</defs>" +
      '<rect width="180" height="250" rx="14" fill="#f4ebd8"/>' +
      '<rect x="3.5" y="3.5" width="173" height="243" rx="11.5" fill="none" stroke="' + meta.hex + '" stroke-opacity=".72" stroke-width="2"/>' +
      '<rect x="8" y="8" width="164" height="234" rx="8" fill="none" stroke="#8f7b58" stroke-opacity=".35" stroke-dasharray="1.5 4"/>' +
      '<text x="90" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="7" letter-spacing="2.1" fill="#766346">TICKET TO RIDE</text>' +
      '<path d="M27 33H153" stroke="#b7a682" stroke-opacity=".55"/>' +
      '<circle cx="22" cy="33" r="2" fill="' + meta.hex + '" opacity=".7"/><circle cx="158" cy="33" r="2" fill="' + meta.hex + '" opacity=".7"/>' +
      '<rect x="10" y="40" width="160" height="154" rx="9" fill="url(#' + g + 'plate)" stroke="' + deep + '" stroke-width="1.2"/>' +
      '<rect x="10" y="40" width="160" height="154" rx="9" fill="url(#' + g + 'dots)"/>' +
      '<path d="M16 56q74-23 148 0" fill="none" stroke="' + light + '" stroke-opacity=".16" stroke-width="12"/>' +
      '<path d="M18 174h144" stroke="#0a1416" stroke-opacity=".45" stroke-width="2"/>' +
      '<g opacity=".38" stroke="' + shade(meta.hex, 0.2) + '" stroke-width="1">' +
      '<path d="M28 183l7-4 7 4-7 4Z"/><path d="M52 183l7-4 7 4-7 4Z"/><path d="M76 183l7-4 7 4-7 4Z"/><path d="M100 183l7-4 7 4-7 4Z"/><path d="M124 183l7-4 7 4-7 4Z"/>' +
      "</g>" +
      '<g filter="url(#' + g + 'sh)" transform="translate(31 108)">' + carDrawing(color) + "</g>" +
      ornament +
      '<text x="90" y="218" text-anchor="middle" font-family="\'Noto Kufi Arabic\', \'Noto Sans Arabic\', Tahoma, sans-serif" font-size="19" font-weight="700" fill="' + deep + '">' + meta.name + "</text>" +
      '<text x="90" y="234" text-anchor="middle" font-family="Georgia, serif" font-size="7.5" letter-spacing="1.6" fill="#8b7757">' + meta.en + "</text>" +
      '<circle cx="16" cy="242" r="1.8" fill="' + meta.hex + '" opacity=".65"/><circle cx="164" cy="242" r="1.8" fill="' + meta.hex + '" opacity=".65"/>';
    return svg("0 0 180 250", body, "ttra-card-svg ttra-train-" + color, 'role="img" aria-label="بطاقة قطار ' + U.escape(meta.name) + '"');
  }

  /* --------------------------- ظهر البطاقة --------------------------- */

  function cardBack() {
    const g = uid();
    const body = '<defs>' +
      '<linearGradient id="' + g + 'bg" x1="0" y1="0" x2=".7" y2="1">' +
      '<stop offset="0" stop-color="#1d3a3b"/><stop offset=".52" stop-color="#102627"/><stop offset="1" stop-color="#0a1a1c"/>' +
      "</linearGradient>" +
      '<pattern id="' + g + 'd" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<path d="M12 0 24 12 12 24 0 12Z" fill="none" stroke="#d9b36c" stroke-opacity=".13"/>' +
      '<circle cx="12" cy="12" r="1.1" fill="#d9b36c" fill-opacity=".28"/>' +
      "</pattern>" +
      '<radialGradient id="' + g + 'glow" cx="50%" cy="46%" r="55%">' +
      '<stop offset="0" stop-color="#f0cd82" stop-opacity=".2"/><stop offset="1" stop-color="#0a1a1c" stop-opacity="0"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="180" height="250" rx="14" fill="url(#' + g + 'bg)"/>' +
      '<rect width="180" height="250" rx="14" fill="url(#' + g + 'd)"/>' +
      '<rect width="180" height="250" rx="14" fill="url(#' + g + 'glow)"/>' +
      '<rect x="7" y="7" width="166" height="236" rx="9" fill="none" stroke="#d9b36c" stroke-opacity=".52"/>' +
      '<rect x="12" y="12" width="156" height="226" rx="6" fill="none" stroke="#d9b36c" stroke-opacity=".18" stroke-dasharray="1.5 4"/>' +
      '<circle cx="90" cy="102" r="48" fill="none" stroke="#d9b36c" stroke-opacity=".36"/>' +
      '<circle cx="90" cy="102" r="38" fill="none" stroke="#d9b36c" stroke-opacity=".18" stroke-dasharray="2 4"/>' +
      '<g transform="translate(43 66) scale(.78)" fill="none" stroke="#e4c581" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 48h78l-5 8H18Z"/><rect x="24" y="24" width="46" height="24" rx="11"/>' +
      '<circle cx="72" cy="36" r="10"/><circle cx="72" cy="36" r="4"/>' +
      '<path d="M35 24V14h12v10M74 16h20v32M78 22h12M78 30h12"/>' +
      '<circle cx="30" cy="55" r="8"/><circle cx="55" cy="55" r="8"/><circle cx="80" cy="54" r="9"/>' +
      '<path d="M30 55h50M9 40h10v12H9Z"/>' +
      "</g>" +
      '<text x="90" y="178" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="2.6" fill="#e4c581" fill-opacity=".9">TICKET TO RIDE</text>' +
      '<text x="90" y="196" text-anchor="middle" font-family="Georgia, serif" font-size="6.4" letter-spacing="2" fill="#c7b184" fill-opacity=".65">NORTH AMERICA</text>' +
      '<path d="M52 208h76" stroke="#d9b36c" stroke-opacity=".36"/>' +
      '<circle cx="90" cy="208" r="2.2" fill="#d9b36c" fill-opacity=".7"/>' +
      '<text x="90" y="226" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="9" fill="#d9b36c" fill-opacity=".6">رحلة عبر القارات</text>';
    return svg("0 0 180 250", body, "ttra-card-svg ttra-card-back", 'role="img" aria-label="ظهر بطاقة قطار"');
  }

  /* --------------------------- تذكرة وجهة --------------------------- */

  function ticketCard(ticket, opts) {
    const o = opts || {};
    const g = uid();
    const a = U.escape(o.aName || ticket.a || "");
    const b = U.escape(o.bName || ticket.b || "");
    const points = Number(ticket.points) || 0;
    const body = '<defs>' +
      '<linearGradient id="' + g + 'paper" x1="0" y1="0" x2=".7" y2="1">' +
      '<stop offset="0" stop-color="#fbf4e1"/><stop offset=".55" stop-color="#f2e8cf"/><stop offset="1" stop-color="#e7d9ba"/>' +
      "</linearGradient>" +
      '<pattern id="' + g + 'lines" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">' +
      '<path d="M0 0V14" stroke="#7c6b4c" stroke-opacity=".055"/>' +
      "</pattern>" +
      '<radialGradient id="' + g + 'stamp" cx="50%" cy="40%" r="60%">' +
      '<stop offset="0" stop-color="#2d5750"/><stop offset="1" stop-color="#173a36"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="440" height="280" rx="16" fill="url(#' + g + 'paper)"/>' +
      '<rect width="440" height="280" rx="16" fill="url(#' + g + 'lines)"/>' +
      '<rect x="7" y="7" width="426" height="266" rx="12" fill="none" stroke="#2c4a46" stroke-width="2"/>' +
      '<rect x="13" y="13" width="414" height="254" rx="8" fill="none" stroke="#b09257" stroke-opacity=".65" stroke-dasharray="2 5"/>' +
      '<path d="M20 20h28M20 20v28M420 20h-28M420 20v28M20 260h28M20 260v-28M420 260h-28M420 260v-28" fill="none" stroke="#2c4a46" stroke-opacity=".7" stroke-width="2"/>' +
      '<rect x="20" y="20" width="400" height="46" rx="8" fill="#21433f"/>' +
      '<text x="220" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="10" letter-spacing="3.6" fill="#ead9a9">DESTINATION TICKET</text>' +
      '<text x="220" y="57" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="12" fill="#d6e7dd">تذكرة وجهة · أمريكا الشمالية</text>' +
      '<text x="54" y="102" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="10" fill="#8b7755">من</text>' +
      '<text x="228" y="110" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Noto Sans Arabic, Tahoma, sans-serif" font-size="26" font-weight="700" fill="#203c39">' + a + "</text>" +
      '<path d="M52 137H398" stroke="#8c7a59" stroke-opacity=".48" stroke-dasharray="3 5"/>' +
      '<g transform="translate(208 124)" fill="#2c4a46" opacity=".8">' +
      '<rect x="0" y="2" width="24" height="14" rx="4"/><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M4 6h16" stroke="#f2e8cf" stroke-width="1.4"/>' +
      "</g>" +
      '<text x="54" y="183" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="10" fill="#8b7755">إلى</text>' +
      '<text x="228" y="191" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Noto Sans Arabic, Tahoma, sans-serif" font-size="26" font-weight="700" fill="#203c39">' + b + "</text>" +
      '<g transform="translate(370 205)">' +
      '<circle r="42" fill="url(#' + g + 'stamp)"/>' +
      '<circle r="34" fill="none" stroke="#e6d3a1" stroke-opacity=".55" stroke-dasharray="2 3"/>' +
      '<text x="0" y="-6" text-anchor="middle" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="8" fill="#dfe9df">نقاط</text>' +
      '<text x="0" y="17" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#f4e2ae">' + points + "</text>" +
      "</g>" +
      '<text x="26" y="238" font-family="Georgia, serif" font-size="7" letter-spacing="1.4" fill="#8b7755">TICKET No. ' + U.escape(String(ticket.id || "—")).toUpperCase() + "</text>" +
      '<text x="26" y="252" font-family="\'Noto Kufi Arabic\', Tahoma, sans-serif" font-size="7.5" fill="#8b7755">تخصم قيمتها إن لم تكتمل بحلول نهاية الرحلة</text>' +
      '<path d="M148 238q18-13 36 0t36 0" fill="none" stroke="#8c7a59" stroke-opacity=".35"/>';
    return svg("0 0 440 280", body, "ttra-ticket-svg", 'role="img" aria-label="تذكرة من ' + a + " إلى " + b + " ب" + points + ' نقاط"');
  }

  /* --------------------------- رموز مساعدة --------------------------- */

  function trainGlyph(hex) {
    return '<svg class="ttra-glyph" viewBox="0 0 36 24" aria-hidden="true" focusable="false">' +
      '<path d="M5 14h26l-2.5 4H7.5Z" fill="' + shade(hex, -0.45) + '"/>' +
      '<rect x="8" y="8" width="16" height="7" rx="3.2" fill="' + hex + '" stroke="' + shade(hex, -0.4) + '" stroke-width="1"/>' +
      '<rect x="10.4" y="10" width="4" height="3" rx="1" fill="#f6f0e2" opacity=".8"/>' +
      '<rect x="16" y="10" width="4" height="3" rx="1" fill="#f6f0e2" opacity=".8"/>' +
      '<circle cx="11.6" cy="19" r="2.2" fill="' + shade(hex, -0.55) + '"/><circle cx="24.4" cy="19" r="2.2" fill="' + shade(hex, -0.55) + '"/>' +
      '<path d="M25 8V5.4h3.4V13" fill="none" stroke="' + shade(hex, -0.35) + '" stroke-width="1.4"/>' +
      "</svg>";
  }

  function colorDot(hex) {
    return '<span class="ttra-dot" style="--c:' + hex + '"></span>';
  }

  function colorChip(color, count) {
    const meta = COLORS[color] || COLORS.gray;
    return '<span class="ttra-chip" style="--c:' + meta.hex + ';--ink:' + meta.ink + '">' +
      '<i></i>' + meta.name + (count ? " ×" + count : "") + "</span>";
  }

  window.BGTtrArt = {
    COLORS,
    CARD_COLORS,
    HAND_COLORS,
    trainCard,
    cardBack,
    ticketCard,
    trainGlyph,
    colorDot,
    colorChip,
    shade,
    mix,
    svg,
  };
})();
