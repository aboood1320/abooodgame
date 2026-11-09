/* ==========================================================================
   تيكيت تو رايد — خريطة أمريكا الشمالية وبيانات الرحلة
   33 مدينة · 65 مسارًا · 42 تذكرة وجهة
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const ART = window.BGTtrArt;
  const COLORS = ART.COLORS;

  const CITY_LIST = [
    { id: "calgary", name: "كالغاري", x: 300, y: 80, ly: 64 },
    { id: "winnipeg", name: "وينيبيغ", x: 440, y: 105, ly: 89 },
    { id: "seattle", name: "سياتل", x: 105, y: 105, ly: 124 },
    { id: "montreal", name: "مونتريال", x: 800, y: 135, ly: 119 },
    { id: "boston", name: "بوسطن", x: 855, y: 180, ly: 200 },
    { id: "toronto", name: "تورونتو", x: 715, y: 185, ly: 204 },
    { id: "minneapolis", name: "مينيابوليس", x: 500, y: 180, ly: 199 },
    { id: "portland", name: "بورتلاند", x: 95, y: 165, ly: 184 },
    { id: "newyork", name: "نيويورك", x: 805, y: 235, ly: 255 },
    { id: "detroit", name: "ديترويت", x: 630, y: 250, ly: 234 },
    { id: "chicago", name: "شيكاغو", x: 560, y: 265, ly: 285 },
    { id: "omaha", name: "أوماها", x: 460, y: 250, ly: 233 },
    { id: "saltlake", name: "سولت ليك", x: 245, y: 305, ly: 288 },
    { id: "denver", name: "دنفر", x: 345, y: 330, ly: 313 },
    { id: "kansascity", name: "كانساس سيتي", x: 440, y: 320, ly: 340 },
    { id: "pittsburgh", name: "بيتسبرغ", x: 660, y: 300, ly: 283 },
    { id: "washington", name: "واشنطن", x: 750, y: 290, ly: 310 },
    { id: "sanfran", name: "سان فرانسيسكو", x: 80, y: 305, ly: 325 },
    { id: "stlouis", name: "سانت لويس", x: 530, y: 350, ly: 370 },
    { id: "nashville", name: "ناشفيل", x: 600, y: 390, ly: 410 },
    { id: "raleigh", name: "رالي", x: 705, y: 360, ly: 343 },
    { id: "lasvegas", name: "لاس فيغاس", x: 155, y: 370, ly: 353 },
    { id: "santafe", name: "سانتا في", x: 330, y: 420, ly: 440 },
    { id: "oklahoma", name: "أوكلاهوما سيتي", x: 425, y: 390, ly: 373 },
    { id: "losangeles", name: "لوس أنجلوس", x: 100, y: 420, ly: 441 },
    { id: "atlanta", name: "أتلانتا", x: 645, y: 440, ly: 461 },
    { id: "phoenix", name: "فينيكس", x: 180, y: 465, ly: 486 },
    { id: "dallas", name: "دالاس", x: 435, y: 465, ly: 449 },
    { id: "charleston", name: "تشارلستون", x: 715, y: 425, ly: 408 },
    { id: "elpaso", name: "إل باسو", x: 300, y: 505, ly: 526 },
    { id: "houston", name: "هيوستن", x: 460, y: 525, ly: 546 },
    { id: "neworleans", name: "نيو أورلينز", x: 520, y: 490, ly: 511 },
    { id: "miami", name: "ميامي", x: 750, y: 570, ly: 553 },
  ];
  const CITIES = {};
  CITY_LIST.forEach((c) => { CITIES[c.id] = c; });

  const ROUTES = [
    ["seattle", "portland", 1, "gray"],
    ["seattle", "portland", 1, "gray", 15],
    ["seattle", "calgary", 5, "gray"],
    ["portland", "sanfran", 5, "green"],
    ["sanfran", "losangeles", 3, "pink"],
    ["sanfran", "saltlake", 5, "orange"],
    ["losangeles", "lasvegas", 2, "gray"],
    ["losangeles", "phoenix", 3, "gray"],
    ["losangeles", "phoenix", 3, "gray", 15],
    ["losangeles", "elpaso", 6, "orange", -28],
    ["lasvegas", "saltlake", 3, "orange"],
    ["phoenix", "elpaso", 3, "gray"],
    ["phoenix", "santafe", 3, "gray"],
    ["elpaso", "santafe", 2, "gray"],
    ["elpaso", "dallas", 4, "red"],
    ["elpaso", "houston", 4, "pink"],
    ["dallas", "houston", 1, "gray"],
    ["dallas", "oklahoma", 2, "gray"],
    ["houston", "neworleans", 3, "gray"],
    ["santafe", "denver", 2, "gray"],
    ["santafe", "oklahoma", 3, "blue"],
    ["denver", "saltlake", 3, "yellow"],
    ["denver", "kansascity", 4, "black"],
    ["denver", "kansascity", 4, "black", 16],
    ["denver", "omaha", 4, "pink"],
    ["omaha", "kansascity", 1, "gray"],
    ["kansascity", "stlouis", 2, "blue"],
    ["kansascity", "stlouis", 2, "blue", 14],
    ["stlouis", "chicago", 2, "green"],
    ["stlouis", "chicago", 2, "green", 14],
    ["chicago", "omaha", 4, "pink"],
    ["chicago", "detroit", 3, "gray"],
    ["detroit", "pittsburgh", 2, "gray"],
    ["pittsburgh", "washington", 2, "gray"],
    ["pittsburgh", "newyork", 2, "green"],
    ["newyork", "boston", 2, "yellow"],
    ["newyork", "boston", 2, "yellow", 14],
    ["newyork", "washington", 2, "black"],
    ["newyork", "washington", 2, "black", 14],
    ["washington", "raleigh", 2, "gray"],
    ["raleigh", "atlanta", 2, "gray"],
    ["atlanta", "charleston", 2, "gray"],
    ["charleston", "miami", 4, "pink"],
    ["atlanta", "nashville", 1, "gray"],
    ["nashville", "stlouis", 2, "gray"],
    ["nashville", "pittsburgh", 3, "yellow"],
    ["neworleans", "atlanta", 4, "yellow"],
    ["neworleans", "nashville", 2, "gray"],
    ["kansascity", "minneapolis", 4, "red"],
    ["minneapolis", "chicago", 3, "red"],
    ["minneapolis", "chicago", 3, "red", 15],
    ["minneapolis", "omaha", 2, "gray"],
    ["minneapolis", "winnipeg", 4, "gray"],
    ["winnipeg", "calgary", 4, "gray"],
    ["chicago", "pittsburgh", 3, "white"],
    ["chicago", "pittsburgh", 3, "white", 15],
    ["detroit", "toronto", 3, "gray"],
    ["toronto", "montreal", 2, "gray"],
    ["toronto", "montreal", 2, "gray", 14],
    ["montreal", "newyork", 3, "blue"],
    ["montreal", "newyork", 3, "blue", 15],
    ["montreal", "boston", 2, "gray"],
    ["toronto", "boston", 2, "gray"],
    ["toronto", "boston", 2, "gray", 14],
    ["toronto", "chicago", 3, "gray", 24],
  ].map((r, i) => ({ id: "r" + i, a: r[0], b: r[1], length: r[2], color: r[3], curve: r[4] || 0 }));

  // ربط المسارات المزدوجة: لكل زوج نهاية متقابلة.
  const routeGroups = new Map();
  ROUTES.forEach((route) => {
    const key = [route.a, route.b].sort().join("|") + "|" + route.length;
    if (!routeGroups.has(key)) routeGroups.set(key, []);
    routeGroups.get(key).push(route);
  });
  routeGroups.forEach((group) => {
    if (group.length !== 2) return;
    group[0].twin = group[1].id;
    group[1].twin = group[0].id;
    if (!group[0].curve) group[0].curve = -14;
    if (!group[1].curve) group[1].curve = 14;
  });

  const ROUTE_POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };

  const TICKETS = [
    ["losangeles", "newyork", 21], ["seattle", "newyork", 22], ["sanfran", "atlanta", 17],
    ["portland", "nashville", 17], ["losangeles", "chicago", 16], ["denver", "miami", 20],
    ["calgary", "phoenix", 17], ["montreal", "neworleans", 19], ["seattle", "losangeles", 9],
    ["chicago", "santafe", 9], ["dallas", "newyork", 11], ["boston", "miami", 12],
    ["winnipeg", "houston", 15], ["toronto", "elpaso", 13], ["atlanta", "boston", 8],
    ["denver", "pittsburgh", 11], ["sanfran", "chicago", 11], ["portland", "phoenix", 13],
    ["dallas", "atlanta", 9], ["saltlake", "washington", 12], ["kansascity", "miami", 15],
    ["minneapolis", "neworleans", 12], ["calgary", "dallas", 14], ["montreal", "atlanta", 13],
    ["seattle", "denver", 8], ["losangeles", "elpaso", 6], ["newyork", "charleston", 6],
    ["chicago", "neworleans", 7], ["boston", "washington", 4], ["phoenix", "denver", 7],
    ["miami", "washington", 8], ["winnipeg", "dallas", 12], ["calgary", "losangeles", 13],
    ["toronto", "miami", 14], ["saltlake", "chicago", 10], ["seattle", "oklahoma", 12],
    ["portland", "denver", 9], ["montreal", "houston", 15], ["boston", "chicago", 10],
    ["atlanta", "newyork", 9], ["sanfran", "houston", 14], ["charleston", "stlouis", 8],
  ].map((t, i) => ({ id: "t" + i, a: t[0], b: t[1], points: t[2] }));

  const routeById = (id) => ROUTES.find((r) => r.id === id);
  const cityName = (id) => (CITIES[id] ? CITIES[id].name : id);

  function routeGeometry(route) {
    const a = CITIES[route.a];
    const b = CITIES[route.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let cx = (a.x + b.x) / 2;
    let cy = (a.y + b.y) / 2;
    if (route.curve) {
      cx += (-dy / len) * route.curve;
      cy += (dx / len) * route.curve;
    }
    return { a, b, cx, cy, len };
  }

  function routePath(route) {
    const g = routeGeometry(route);
    if (!route.curve) return "M" + g.a.x + " " + g.a.y + " L" + g.b.x + " " + g.b.y;
    return "M" + g.a.x + " " + g.a.y + " Q" + g.cx + " " + g.cy + " " + g.b.x + " " + g.b.y;
  }

  function routeMidpoint(route) {
    const g = routeGeometry(route);
    if (!route.curve) return { x: (g.a.x + g.b.x) / 2, y: (g.a.y + g.b.y) / 2 };
    return {
      x: 0.25 * g.a.x + 0.5 * g.cx + 0.25 * g.b.x,
      y: 0.25 * g.a.y + 0.5 * g.cy + 0.25 * g.b.y,
    };
  }

  function routeCars(route) {
    const g = routeGeometry(route);
    const count = Math.max(1, route.length);
    const cars = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      let x;
      let y;
      let dx;
      let dy;
      if (route.curve) {
        const mt = 1 - t;
        x = mt * mt * g.a.x + 2 * mt * t * g.cx + t * t * g.b.x;
        y = mt * mt * g.a.y + 2 * mt * t * g.cy + t * t * g.b.y;
        dx = 2 * mt * (g.cx - g.a.x) + 2 * t * (g.b.x - g.cx);
        dy = 2 * mt * (g.cy - g.a.y) + 2 * t * (g.b.y - g.cy);
      } else {
        x = g.a.x + (g.b.x - g.a.x) * t;
        y = g.a.y + (g.b.y - g.a.y) * t;
        dx = g.b.x - g.a.x;
        dy = g.b.y - g.a.y;
      }
      cars.push({ x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI });
    }
    return cars;
  }

  function carTransform(car) {
    return "translate(" + car.x.toFixed(1) + " " + car.y.toFixed(1) + ") rotate(" + car.angle.toFixed(1) + ")";
  }

  function slotSVG(route, fill) {
    const dark = ART.shade(fill, -0.5);
    return routeCars(route).map((car) =>
      '<g class="ttr-slot" transform="' + carTransform(car) + '">' +
      '<rect x="-8" y="-5.1" width="16" height="10.2" rx="3" fill="' + fill + '" fill-opacity=".78" stroke="' + dark + '" stroke-opacity=".75" stroke-width="1.05"/>' +
      '<rect x="-5.6" y="-3.1" width="11.2" height="3.1" rx="1.3" fill="#ffffff" fill-opacity=".3"/>' +
      '<path d="M-7.2 3.6H7.2" stroke="' + dark + '" stroke-opacity=".3" stroke-width="1"/>' +
      "</g>"
    ).join("");
  }

  function carSVG(route, fill) {
    const dark = ART.shade(fill, -0.55);
    const light = ART.shade(fill, 0.42);
    return routeCars(route).map((car) =>
      '<g class="ttr-car-wrap" transform="' + carTransform(car) + '">' +
      '<g class="ttr-car-body">' +
      '<rect x="-8.2" y="-5.4" width="16.4" height="10.8" rx="3.1" fill="' + fill + '" stroke="' + dark + '" stroke-width="1.15"/>' +
      '<rect x="-5.8" y="-3.5" width="4.6" height="4.1" rx="1" fill="' + light + '" stroke="' + dark + '" stroke-opacity=".45" stroke-width=".45"/>' +
      '<rect x="1.1" y="-3.5" width="4.6" height="4.1" rx="1" fill="' + light + '" stroke="' + dark + '" stroke-opacity=".45" stroke-width=".45"/>' +
      '<path d="M-7.4 2.9H7.4" stroke="' + dark + '" stroke-opacity=".55" stroke-width="1.1"/>' +
      '<circle cx="-4.7" cy="5.3" r="1.45" fill="' + dark + '"/><circle cx="4.7" cy="5.3" r="1.45" fill="' + dark + '"/>' +
      "</g></g>"
    ).join("");
  }

  function tipFor(route, opts) {
    const color = COLORS[route.color] || COLORS.gray;
    const owner = opts.owners ? opts.owners[route.id] : null;
    const parts = [cityName(route.a) + " ↔ " + cityName(route.b), route.length + " عربات", "+" + ROUTE_POINTS[route.length] + " نقطة", color.name];
    if (owner != null && opts.players && opts.players[owner]) parts.push("يملكها " + opts.players[owner].name);
    else if (opts.affordable && opts.affordable.has(route.id)) parts.push("متاح الآن");
    return parts.join(" · ");
  }

  function boardSVG(opts) {
    const o = opts || {};
    const owners = o.owners || {};
    const players = o.players || [];
    const affordable = o.affordable || new Set();
    const over = !!o.over;
    const idle = !!o.idle;
    const parts = [];

    parts.push('<svg viewBox="0 0 940 640" class="ttr-svg' + (idle ? " is-idle" : "") + '" role="img" aria-label="خريطة تيكيت تو رايد — أمريكا الشمالية">');
    parts.push('<defs>' +
      '<radialGradient id="ttrSea" cx="42%" cy="34%" r="86%"><stop offset="0%" stop-color="#235766"/><stop offset="55%" stop-color="#153d49"/><stop offset="100%" stop-color="#091e27"/></radialGradient>' +
      '<linearGradient id="ttrLand" x1="0" y1="0" x2=".72" y2="1"><stop offset="0%" stop-color="#f1e7c9"/><stop offset="42%" stop-color="#e7d9b4"/><stop offset="100%" stop-color="#d8c49a"/></linearGradient>' +
      '<linearGradient id="ttrSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#faf6e8" stop-opacity=".92"/><stop offset="100%" stop-color="#eee3c8" stop-opacity=".15"/></linearGradient>' +
      '<linearGradient id="ttrLake" x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stop-color="#9fc7cd"/><stop offset="100%" stop-color="#6095a4"/></linearGradient>' +
      '<linearGradient id="ttrBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f2d79a"/><stop offset="46%" stop-color="#c9a35c"/><stop offset="100%" stop-color="#8d6a31"/></linearGradient>' +
      '<filter id="ttrLandShadow" x="-12%" y="-12%" width="124%" height="126%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#031016" flood-opacity=".6"/></filter>' +
      '<filter id="ttrSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<pattern id="ttrHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="9" stroke="rgba(118,92,52,.09)" stroke-width="1"/></pattern>' +
      '<pattern id="ttrWaves" width="74" height="46" patternUnits="userSpaceOnUse"><path d="M0 30q9-5 18 0t18 0t18 0t18 0" fill="none" stroke="#b8dbe2" stroke-opacity=".075" stroke-width="1.2"/></pattern>' +
      '<radialGradient id="ttrVignette" cx="50%" cy="48%" r="72%"><stop offset="62%" stop-color="#04161c" stop-opacity="0"/><stop offset="100%" stop-color="#04161c" stop-opacity=".42"/></radialGradient>' +
      '</defs>');

    // المحيط
    parts.push('<rect width="940" height="640" fill="url(#ttrSea)"/>');
    parts.push('<rect width="940" height="640" fill="url(#ttrWaves)"/>');

    // اليابسة
    const land = "M118 36 L770 28 L834 58 L866 118 L856 162 L878 206 L852 262 L844 318 L812 366 L800 420 L792 486 L766 568 L744 600 L726 590 L734 542 L704 512 L660 508 L612 496 L566 518 L520 532 L478 540 L450 530 L436 494 L404 514 L368 562 L342 610 L304 604 L290 548 L256 522 L222 500 L184 488 L148 456 L104 442 L72 408 L84 366 L58 330 L76 296 L48 260 L70 220 L46 182 L84 150 L70 116 L90 74 Z";
    parts.push('<g filter="url(#ttrLandShadow)">');
    parts.push('<path d="' + land + '" fill="url(#ttrLand)" stroke="#9f895f" stroke-width="2.6" stroke-linejoin="round"/>');
    parts.push('<path d="' + land + '" fill="url(#ttrHatch)" stroke="none"/>');
    parts.push("</g>");
    parts.push('<path d="M118 36 L770 28 L834 58 L832 100 L700 76 L560 90 L420 72 L286 88 L170 72 L90 74 Z" fill="url(#ttrSnow)" opacity=".5"/>');
    parts.push('<path d="M118 36 L770 28 L834 58" fill="none" stroke="#fffaf0" stroke-opacity=".35" stroke-width="2"/>');

    // جبال الغرب — صفوف متدرجة
    const peaks = [
      [132, 210, 24], [166, 236, 30], [200, 206, 22], [238, 250, 32], [272, 226, 24],
      [152, 282, 26], [196, 300, 30], [240, 292, 22], [286, 318, 28], [132, 350, 22],
      [178, 372, 26], [224, 360, 30], [270, 388, 24], [318, 366, 20], [150, 420, 20],
      [340, 405, 18], [300, 335, 18],
    ];
    parts.push('<g class="ttr-mountains" fill="#c3a97b" stroke="#927b52" stroke-width="1.05">');
    peaks.forEach(([x, y, s], i) => {
      parts.push('<path d="M' + (x - s) + " " + y + " L" + x + " " + (y - s * 0.84) + " L" + (x + s) + " " + y + ' Z" opacity="' + (i % 3 === 0 ? 0.62 : 0.48) + '"/>');
      parts.push('<path d="M' + (x - s * 0.44) + " " + (y - s * 0.35) + " L" + x + " " + (y - s * 0.84) + " L" + (x + s * 0.44) + " " + (y - s * 0.35) + ' Z" fill="#f4ecd8" stroke="none" opacity=".82"/>');
    });
    parts.push("</g>");
    parts.push('<path d="M96 352q92 34 196 10" fill="none" stroke="#8f7952" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>');

    // غابات
    parts.push('<g class="ttr-forests" fill="#8ea17a" opacity=".74">');
    const trees = [[330, 128], [352, 148], [312, 160], [372, 132], [398, 154], [344, 186], [640, 300], [668, 322], [700, 306], [724, 340], [654, 352], [690, 380], [730, 368], [612, 330], [560, 420], [590, 446], [530, 440], [548, 468], [470, 300], [480, 330], [588, 230], [618, 246], [596, 262], [770, 300], [786, 322], [760, 342]];
    trees.forEach(([x, y]) => {
      parts.push('<path d="M' + x + " " + (y - 9) + " L" + (x + 5.4) + " " + (y + 1) + " L" + (x - 5.4) + " " + (y + 1) + ' Z"/>');
      parts.push('<rect x="' + (x - 0.9) + '" y="' + (y + 1) + '" width="1.8" height="4.2" fill="#7c6a49"/>');
    });
    parts.push("</g>");

    // البحيرات الكبرى
    parts.push('<g class="ttr-lakes" fill="url(#ttrLake)" stroke="#4f7d8c" stroke-width="1.5">');
    parts.push('<path d="M556 150 Q596 132 646 150 Q632 172 594 174 Q564 168 556 150 Z"/>');
    parts.push('<path d="M594 180 Q612 176 616 198 Q612 228 600 238 Q588 224 590 200 Z"/>');
    parts.push('<path d="M636 168 Q664 158 680 182 Q676 208 654 212 Q638 196 636 168 Z"/>');
    parts.push('<path d="M668 224 Q700 214 718 228 Q704 242 678 240 Q664 234 668 224 Z"/>');
    parts.push('<path d="M704 202 Q730 192 750 206 Q736 220 712 218 Q700 210 704 202 Z"/>');
    parts.push('<path d="M388 148 Q414 136 432 150 Q420 166 396 162 Q382 156 388 148 Z"/>');
    parts.push("</g>");
    parts.push('<g fill="#cde7e8" opacity=".32"><path d="M570 154q18-8 38 0" fill="none" stroke="#e7f5f5" stroke-width="1.3"/><path d="M646 178q10 4 14 14" fill="none" stroke="#e7f5f5" stroke-width="1.2"/></g>');
    parts.push('<text x="632" y="258" text-anchor="middle" class="ttr-water-label">البحيرات الكبرى</text>');

    // الأنهار
    parts.push('<g class="ttr-rivers" fill="none" stroke="#6f9eac" stroke-width="2.2" stroke-linecap="round" opacity=".72">');
    parts.push('<path d="M505 206 Q494 248 508 282 Q522 322 512 356 Q502 398 520 438 Q530 470 522 502"/>');
    parts.push('<path d="M392 300 Q428 316 462 336 Q488 350 508 356"/>');
    parts.push('<path d="M690 272 Q664 300 640 320 Q616 340 604 368"/>');
    parts.push('<path d="M330 560 Q356 536 388 534 Q420 538 446 522"/>');
    parts.push("</g>");
    parts.push('<text x="58" y="245" class="ttr-water-label" transform="rotate(-74 58 245)">المحيط الهادئ</text>');
    parts.push('<text x="884" y="380" class="ttr-water-label" transform="rotate(76 884 380)">المحيط الأطلسي</text>');
    parts.push('<text x="585" y="612" class="ttr-water-label" opacity=".65">خليج المكسيك</text>');

    // المسارات
    ROUTES.forEach((route) => {
      const owner = owners[route.id];
      const owned = owner != null && players[owner];
      const ownerColor = owned ? players[owner].color : null;
      const color = COLORS[route.color] || COLORS.gray;
      const avail = !over && affordable.has(route.id);
      const path = routePath(route);
      const cls = "ttr-route" + (owned ? " claimed" : "") + (avail ? " affordable" : "") + (owner == null && !over ? " open" : "");
      const tip = tipFor(route, { owners, players, affordable });
      parts.push('<g class="' + cls + '" data-route="' + route.id + '" data-tip="' + U.escape(tip) + '" role="button" aria-label="' + U.escape(tip) + '"' + (avail ? "" : ' aria-disabled="true"') + '>');
      parts.push('<path d="' + path + '" class="ttr-route-halo"/>');
      parts.push('<path d="' + path + '" class="ttr-route-casing"/>');
      if (owned) {
        parts.push('<g class="ttr-route-cars">' + carSVG(route, ownerColor) + "</g>");
      } else {
        parts.push('<g class="ttr-route-slots">' + slotSVG(route, color.hex) + "</g>");
      }
      parts.push('<path d="' + path + '" class="ttr-route-hit"/>');
      parts.push("</g>");
    });

    // المدن
    CITY_LIST.forEach((c) => {
      parts.push('<g class="ttr-city" data-city="' + c.id + '">' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="10.5" class="ttr-city-halo"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="6.3" class="ttr-city-dot"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="2.5" class="ttr-city-core"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="1.15" class="ttr-city-pin"/>' +
        '<text x="' + c.x + '" y="' + c.ly + '" text-anchor="middle" class="ttr-city-label">' + U.escape(c.name) + "</text>" +
        "</g>");
    });

    // وردة البوصلة
    parts.push('<g class="ttr-compass" transform="translate(892,596)" aria-hidden="true">' +
      '<circle r="24" fill="rgba(6,22,29,.55)" stroke="url(#ttrBrass)" stroke-opacity=".65"/>' +
      '<circle r="18" fill="none" stroke="#e9cf92" stroke-opacity=".22" stroke-dasharray="1 3"/>' +
      '<path d="M0 -17 L5 0 L0 17 L-5 0 Z" fill="url(#ttrBrass)"/>' +
      '<path d="M-17 0 L0 -5 L17 0 L0 5 Z" fill="#e9cf92" fill-opacity=".5"/>' +
      '<circle r="2.2" fill="#102a2f"/>' +
      "</g>");

    // إطار خريطة رقيق
    parts.push('<rect x="5" y="5" width="930" height="630" rx="14" fill="none" stroke="#e9cf92" stroke-opacity=".16"/>');
    parts.push('<rect width="940" height="640" fill="url(#ttrVignette)" pointer-events="none"/>');
    parts.push("</svg>");
    return parts.join("");
  }

  window.BGTtrBoard = {
    COLORS,
    CARD_COLORS: ART.CARD_COLORS,
    HAND_COLORS: ART.HAND_COLORS,
    CITY_LIST,
    CITIES,
    ROUTES,
    TICKETS,
    ROUTE_POINTS,
    routeById,
    cityName,
    routeGeometry,
    routePath,
    routeMidpoint,
    routeCars,
    boardSVG,
  };
})();
