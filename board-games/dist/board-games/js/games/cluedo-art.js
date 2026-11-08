/* ==========================================================================
   كلودو — رسومات أصلية (SVG)
   بطاقات المشتبه بهم والأسلحة والغرف + مشاهد القصر.
   كل الرسومات مولّدة داخل المشروع بلا أصول خارجية.
   ========================================================================== */
(function () {
  "use strict";

  let seq = 0;
  function uid() { seq += 1; return "cla" + seq; }

  const GOLD = "#d9b36c";
  const GOLD_DARK = "#8f6a2e";
  const BONE = "#f1e7d0";
  const INK = "#081114";

  function svg(viewBox, body, cls) {
    return '<svg class="' + (cls || "cl-art-svg") + '" viewBox="' + viewBox +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + "</svg>";
  }

  function wallpaper(g) {
    return '<defs>' +
      '<pattern id="' + g + 'wall" width="30" height="30" patternUnits="userSpaceOnUse">' +
      '<path d="M15 0 30 15 15 30 0 15Z" fill="none" stroke="' + GOLD + '" stroke-opacity=".5"/>' +
      '<circle cx="15" cy="15" r="1.4" fill="' + GOLD + '" fill-opacity=".65"/>' +
      "</pattern>" +
      '<radialGradient id="' + g + 'spot" cx="50%" cy="34%" r="64%">' +
      '<stop offset="0" stop-color="#f0d79a" stop-opacity=".2"/>' +
      '<stop offset=".55" stop-color="#d9b36c" stop-opacity=".06"/>' +
      '<stop offset="1" stop-color="#081114" stop-opacity="0"/>' +
      "</radialGradient>" +
      '<linearGradient id="' + g + 'fade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#081114" stop-opacity="0"/>' +
      '<stop offset=".72" stop-color="#081114" stop-opacity=".08"/>' +
      '<stop offset="1" stop-color="#081114" stop-opacity=".9"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="300" height="320" fill="#0c1518"/>' +
      '<rect width="300" height="320" fill="url(#' + g + 'wall)" opacity=".13"/>' +
      '<rect width="300" height="320" fill="url(#' + g + 'spot)"/>' +
      '<path d="M0 0H54C38 82 38 238 54 320H0Z" fill="#040a0c" opacity=".35"/>' +
      '<path d="M300 0H246C262 82 262 238 246 320H300Z" fill="#040a0c" opacity=".35"/>';
  }

  function cardFrame(g, color, body) {
    return wallpaper(g) + body +
      '<rect width="300" height="320" fill="url(#' + g + 'fade)"/>' +
      '<rect x="8" y="8" width="284" height="304" rx="11" fill="none" stroke="' + GOLD + '" stroke-opacity=".5"/>' +
      '<rect x="14" y="14" width="272" height="292" rx="8" fill="none" stroke="' + GOLD + '" stroke-opacity=".2" stroke-dasharray="1 4"/>' +
      '<path d="M20 20h20M20 20v20M280 20h-20M280 20v20M20 300h20M20 300v-20M280 300h-20M280 300v-20" fill="none" stroke="' + color + '" stroke-opacity=".55" stroke-width="2"/>';
  }

  /* ============================== المشتبه بهم ============================== */

  const SUSPECT_META = {
    scarlett: {
      color: "#c94b62", skin: "#f0c6a6", shade: "#d49a78", hair: "#7c2f2a", hair2: "#a94a3b",
      outfit: "#b73750", outfit2: "#8d263d", lips: "#a52d47", style: "long",
      necklace: true, earrings: true,
    },
    mustard: {
      color: "#d6a13c", skin: "#d8a678", shade: "#b98255", hair: "#5a4632", hair2: "#6d573d",
      outfit: "#9f7a2f", outfit2: "#7c5d22", lips: "#7d5137", style: "mustache",
      cap: true, buttons: true, mustache: true,
    },
    white: {
      color: "#cfd8e0", skin: "#e6c6b0", shade: "#c69c82", hair: "#d7dbe0", hair2: "#eef1f4",
      outfit: "#7d8fb3", outfit2: "#5f6f91", lips: "#a76a68", style: "bun",
      glasses: true, shawl: true, brooch: true,
    },
    green: {
      color: "#4f9d6d", skin: "#c99a74", shade: "#a97953", hair: "#3f4a3a", hair2: "#53604a",
      outfit: "#2f5d45", outfit2: "#234a37", lips: "#7d5137", style: "short",
      collar: true, mustache: true, brows: true,
    },
    peacock: {
      color: "#4f7fb5", skin: "#e0b090", shade: "#c08d6c", hair: "#2f2a33", hair2: "#4b4352",
      outfit: "#335f8f", outfit2: "#244a73", lips: "#a24a5e", style: "updo",
      feather: true, earrings: true, necklace: true,
    },
    plum: {
      color: "#8d6bb5", skin: "#c99874", shade: "#a97752", hair: "#4a3b34", hair2: "#5d4a40",
      outfit: "#5c4477", outfit2: "#46325e", lips: "#7d5137", style: "bald",
      glasses: true, beard: true, bowtie: true,
    },
  };

  function suspectPortrait(id) {
    const m = SUSPECT_META[id] || SUSPECT_META.scarlett;
    const g = uid();

    let hairBack = "";
    let hairFront = "";
    if (m.style === "long") {
      hairBack =
        '<path d="M96 146C88 88 114 58 150 58C186 58 212 88 204 146L216 238C198 222 188 204 186 176C180 140 172 116 150 116C128 116 120 140 114 176C112 204 102 222 84 238Z" fill="' + m.hair + '"/>' +
        '<path d="M96 146C90 92 112 64 142 60C120 76 112 108 114 176C112 204 102 222 84 238L96 146Z" fill="' + m.hair2 + '" opacity=".55"/>';
      hairFront =
        '<path d="M104 126C104 88 122 72 150 72C178 72 196 88 196 126C186 104 170 94 150 94C130 94 114 104 104 126Z" fill="' + m.hair2 + '"/>' +
        '<path d="M108 112C114 86 130 76 150 76C170 76 186 86 192 112C180 98 166 92 150 92C134 92 120 98 108 112Z" fill="' + m.hair + '"/>';
    } else if (m.style === "bun") {
      hairBack =
        '<circle cx="150" cy="66" r="27" fill="' + m.hair + '"/>' +
        '<circle cx="150" cy="66" r="18" fill="' + m.hair2 + '" opacity=".55"/>' +
        '<path d="M102 142C100 90 120 68 150 68C180 68 200 90 198 142L206 178C188 166 180 152 176 132C168 108 160 100 150 100C140 100 132 108 124 132C120 152 112 166 94 178Z" fill="' + m.hair + '"/>';
      hairFront =
        '<path d="M108 122C108 90 124 76 150 76C176 76 192 90 192 122C182 104 168 96 150 96C132 96 118 104 108 122Z" fill="' + m.hair2 + '"/>' +
        '<path d="M114 112C120 92 132 84 150 84C168 84 180 92 186 112C176 100 164 96 150 96C136 96 124 100 114 112Z" fill="' + m.hair + '"/>';
    } else if (m.style === "updo") {
      hairBack =
        '<path d="M104 142C100 86 120 62 150 62C180 62 200 86 196 142L206 186C190 172 182 154 178 134C170 108 162 100 150 100C138 100 130 108 122 134C118 154 110 172 94 186Z" fill="' + m.hair + '"/>' +
        '<circle cx="150" cy="58" r="24" fill="' + m.hair + '"/>' +
        '<circle cx="150" cy="58" r="16" fill="' + m.hair2 + '" opacity=".5"/>';
      hairFront =
        '<path d="M106 124C106 90 124 74 150 74C176 74 194 90 194 124C184 106 170 98 150 98C130 98 116 106 106 124Z" fill="' + m.hair2 + '"/>' +
        '<path d="M112 112C120 92 132 84 150 84C168 84 180 92 188 112C176 100 164 96 150 96C136 96 124 100 112 112Z" fill="' + m.hair + '"/>';
    } else if (m.style === "short") {
      hairBack =
        '<path d="M102 142C100 90 120 70 150 70C180 70 200 90 198 142L202 164C188 154 182 140 178 124C170 102 160 96 150 96C140 96 130 102 122 124C118 140 112 154 98 164Z" fill="' + m.hair + '"/>';
      hairFront =
        '<path d="M106 122C106 90 124 76 150 76C176 76 194 90 194 122C184 104 170 96 150 96C130 96 116 104 106 122Z" fill="' + m.hair2 + '"/>';
    } else {
      hairBack =
        '<path d="M100 146C102 104 118 84 150 84C182 84 198 104 200 146L198 160C186 152 182 138 178 124C170 106 160 102 150 102C140 102 130 106 122 124C118 138 114 152 102 160Z" fill="' + m.hair + '"/>' +
        '<path d="M104 140C104 110 120 94 150 94C180 94 196 110 196 140C186 122 170 114 150 114C130 114 114 122 104 140Z" fill="' + m.hair2 + '"/>';
    }

    let accessory = "";
    if (m.mustache) {
      accessory += '<path d="M124 172Q137 165 150 171Q163 165 176 172Q164 180 150 176Q136 180 124 172Z" fill="' + m.hair + '"/>';
    }
    if (m.beard) {
      accessory += '<path d="M110 166Q114 214 150 222Q186 214 190 166Q180 200 150 204Q120 200 110 166Z" fill="' + m.hair + '" opacity=".9"/>' +
        '<path d="M122 184Q136 196 150 198Q164 196 178 184Q166 206 150 208Q134 206 122 184Z" fill="' + m.hair2 + '" opacity=".55"/>';
    }
    if (m.glasses) {
      accessory += '<g fill="none" stroke="' + GOLD + '" stroke-width="2.2" opacity=".95">' +
        '<circle cx="130" cy="148" r="13"/><circle cx="170" cy="148" r="13"/><path d="M143 148h14"/><path d="M117 146l-10-2M183 146l10-2"/>' +
        "</g>" +
        '<circle cx="130" cy="148" r="11" fill="#dff2f2" opacity=".08"/><circle cx="170" cy="148" r="11" fill="#dff2f2" opacity=".08"/>';
    }
    if (m.collar) {
      accessory += '<path d="M128 222L150 250L172 222L162 216L150 230L138 216Z" fill="#f2ecda"/>' +
        '<path d="M144 222h12v22h-12z" fill="#f2ecda"/>';
    }
    if (m.cap) {
      accessory += '<path d="M104 98Q150 62 196 98L194 110Q150 90 106 110Z" fill="' + m.outfit2 + '"/>' +
        '<path d="M106 110Q150 92 194 110L198 120Q150 102 102 120Z" fill="' + m.outfit + '"/>' +
        '<path d="M144 82h12l3 14h-18Z" fill="' + GOLD + '"/>' +
        '<circle cx="150" cy="94" r="3.4" fill="' + GOLD_DARK + '"/>';
    }
    if (m.feather) {
      accessory += '<path d="M192 82Q224 38 250 24Q238 62 206 96Q214 72 230 54Q212 70 192 82Z" fill="' + m.color + '" opacity=".9"/>' +
        '<path d="M198 78Q218 56 238 38" stroke="' + BONE + '" stroke-width="1" opacity=".35" fill="none"/>';
    }
    if (m.shawl) {
      accessory += '<path d="M62 310Q88 242 126 234L150 264L174 234Q212 242 238 310Z" fill="' + m.outfit2 + '" opacity=".62"/>' +
        '<path d="M126 234Q150 252 174 234" fill="none" stroke="' + BONE + '" stroke-opacity=".2" stroke-width="2"/>';
    }
    if (m.bowtie) {
      accessory += '<path d="M150 234L132 224V244Z" fill="' + m.outfit2 + '"/>' +
        '<path d="M150 234L168 224V244Z" fill="' + m.outfit2 + '"/>' +
        '<circle cx="150" cy="234" r="3.4" fill="' + GOLD + '"/>';
    }
    if (m.necklace) {
      accessory += '<path d="M124 226Q150 252 176 226" fill="none" stroke="' + GOLD + '" stroke-width="1.6" opacity=".75"/>' +
        '<circle cx="128" cy="230" r="2" fill="' + BONE + '"/><circle cx="140" cy="240" r="2" fill="' + BONE + '"/>' +
        '<circle cx="150" cy="244" r="2.4" fill="' + BONE + '"/><circle cx="160" cy="240" r="2" fill="' + BONE + '"/>' +
        '<circle cx="172" cy="230" r="2" fill="' + BONE + '"/>';
    }
    if (m.earrings) {
      accessory += '<circle cx="103" cy="166" r="3.4" fill="' + GOLD + '"/><circle cx="197" cy="166" r="3.4" fill="' + GOLD + '"/>' +
        '<path d="M103 170v10M197 170v10" stroke="' + GOLD + '" stroke-width="1.4"/>' +
        '<circle cx="103" cy="182" r="3" fill="' + BONE + '"/><circle cx="197" cy="182" r="3" fill="' + BONE + '"/>';
    }
    if (m.buttons) {
      accessory += '<circle cx="150" cy="264" r="4" fill="' + GOLD + '"/><circle cx="150" cy="284" r="4" fill="' + GOLD + '"/>' +
        '<path d="M122 246L150 268L178 246" fill="none" stroke="' + GOLD + '" stroke-opacity=".5" stroke-width="1.4"/>';
    }
    if (m.brooch) {
      accessory += '<circle cx="150" cy="262" r="7" fill="' + GOLD + '"/><circle cx="150" cy="262" r="3.4" fill="' + m.color + '"/>';
    }

    const body =
      '<path d="M54 320C58 258 96 224 150 224C204 224 242 258 246 320Z" fill="' + m.outfit + '"/>' +
      '<path d="M58 320C64 272 88 246 120 232L150 320Z" fill="' + m.outfit2 + '" opacity=".55"/>' +
      '<path d="M242 320C236 272 212 246 180 232L150 320Z" fill="' + m.outfit2 + '" opacity=".35"/>' +
      '<path d="M118 224L150 272L182 224" fill="none" stroke="' + m.outfit2 + '" stroke-width="6" opacity=".8"/>' +
      m.shawl
        ? '<path d="M62 310Q88 242 126 234L150 264L174 234Q212 242 238 310Z" fill="' + m.outfit2 + '" opacity=".5"/>'
        : "";

    const face =
      '<rect x="134" y="194" width="32" height="40" rx="14" fill="' + m.shade + '"/>' +
      '<ellipse cx="150" cy="152" rx="46" ry="56" fill="' + m.skin + '"/>' +
      '<ellipse cx="104" cy="154" rx="8" ry="13" fill="' + m.skin + '"/>' +
      '<ellipse cx="196" cy="154" rx="8" ry="13" fill="' + m.skin + '"/>' +
      '<ellipse cx="150" cy="166" rx="40" ry="40" fill="' + m.shade + '" opacity=".18"/>' +
      '<path d="M118 134Q130 126 142 132" fill="none" stroke="' + m.hair + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M158 132Q170 126 182 134" fill="none" stroke="' + m.hair + '" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="130" cy="150" rx="9" ry="5.6" fill="#f7f0e4"/>' +
      '<ellipse cx="170" cy="150" rx="9" ry="5.6" fill="#f7f0e4"/>' +
      '<circle cx="131" cy="150" r="3.4" fill="#1d1a18"/><circle cx="169" cy="150" r="3.4" fill="#1d1a18"/>' +
      '<circle cx="132.2" cy="148.6" r="1.1" fill="#fff" opacity=".85"/><circle cx="170.2" cy="148.6" r="1.1" fill="#fff" opacity=".85"/>' +
      '<path d="M150 150Q145 168 152 170Q156 170 158 167" fill="none" stroke="' + m.shade + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M134 182Q150 190 166 182" fill="none" stroke="' + m.lips + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="116" cy="170" rx="10" ry="5" fill="' + m.color + '" opacity=".14"/>' +
      '<ellipse cx="184" cy="170" rx="10" ry="5" fill="' + m.color + '" opacity=".14"/>';

    const scene =
      '<circle cx="150" cy="150" r="112" fill="none" stroke="' + m.color + '" stroke-opacity=".24" stroke-width="1.4"/>' +
      '<circle cx="150" cy="150" r="96" fill="none" stroke="' + GOLD + '" stroke-opacity=".12" stroke-dasharray="2 5"/>' +
      '<path d="M70 0Q92 160 70 320M230 0Q208 160 230 320" fill="none" stroke="' + m.color + '" stroke-opacity=".18" stroke-width="10"/>' +
      body + hairBack + face + hairFront + accessory +
      '<path d="M54 320C58 258 96 224 150 224C204 224 242 258 246 320" fill="none" stroke="' + GOLD + '" stroke-opacity=".18"/>';

    return '<div class="cl-suspect-portrait" data-suspect="' + id + '">' +
      svg("0 0 300 320", cardFrame(g, m.color, scene), "cl-card-art-svg") + "</div>";
  }

  /* ============================== الأسلحة ============================== */

  const WEAPON_META = {
    candlestick: { color: "#d9a05b" },
    dagger: { color: "#c98383" },
    pipe: { color: "#9aa6b8" },
    revolver: { color: "#7aa7c7" },
    rope: { color: "#d1b072" },
    wrench: { color: "#78b98c" },
  };

  function weaponArt(id) {
    const m = WEAPON_META[id] || WEAPON_META.candlestick;
    const g = uid();
    let obj = "";

    if (id === "candlestick") {
      obj =
        '<ellipse cx="150" cy="252" rx="60" ry="16" fill="#3a2a18"/>' +
        '<ellipse cx="150" cy="246" rx="48" ry="12" fill="' + GOLD_DARK + '"/>' +
        '<path d="M122 244Q150 230 178 244L170 236Q150 224 130 236Z" fill="#e2b968"/>' +
        '<rect x="142" y="156" width="16" height="88" rx="5" fill="#b8893c"/>' +
        '<rect x="145" y="158" width="5" height="82" rx="2" fill="#f0cf86" opacity=".65"/>' +
        '<ellipse cx="150" cy="156" rx="18" ry="7" fill="#d9a95a"/>' +
        '<ellipse cx="150" cy="152" rx="14" ry="5" fill="#f0cf86"/>' +
        '<path d="M128 140Q150 126 172 140L168 152H132Z" fill="#c99a48"/>' +
        '<rect x="138" y="78" width="24" height="62" rx="5" fill="#efe3c4"/>' +
        '<path d="M138 80Q150 66 162 80" fill="#fff4d6"/>' +
        '<path d="M150 42Q164 60 159 74Q154 86 145 78Q136 68 142 58Q144 48 150 42Z" fill="#ffb347"/>' +
        '<path d="M150 54Q157 66 154 73Q151 80 146 72Q143 64 150 54Z" fill="#fff3c4"/>' +
        '<circle cx="150" cy="84" r="28" fill="#ffcc73" opacity=".12"/>' +
        '<path d="M166 92q8 10 2 18" fill="none" stroke="#efe3c4" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M134 88q-6 12 1 18" fill="none" stroke="#efe3c4" stroke-width="3" stroke-linecap="round"/>';
    } else if (id === "dagger") {
      obj =
        '<g transform="rotate(-32 150 160)">' +
        '<path d="M150 44L167 82L160 190L150 212L140 190L133 82Z" fill="#aeb9be"/>' +
        '<path d="M150 44L158 84L153 190L150 212L147 190L142 84Z" fill="#eef4f6" opacity=".85"/>' +
        '<path d="M150 48L154 86L151 186" stroke="#ffffff" stroke-opacity=".65" stroke-width="2"/>' +
        '<path d="M116 196H184L176 212H124Z" fill="' + GOLD + '"/>' +
        '<path d="M120 198H180L176 204H124Z" fill="#f0d79a" opacity=".6"/>' +
        '<rect x="141" y="212" width="18" height="48" rx="6" fill="#5b3a2a"/>' +
        '<path d="M141 222h18M141 232h18M141 242h18" stroke="' + GOLD + '" stroke-width="2" opacity=".8"/>' +
        '<circle cx="150" cy="266" r="9" fill="' + GOLD + '"/>' +
        '<circle cx="150" cy="266" r="4" fill="#a63b4a"/>' +
        '<path d="M88 178L116 196" stroke="#6b4a2a" stroke-width="3" opacity=".5"/>' +
        "</g>";
    } else if (id === "pipe") {
      obj =
        '<g transform="rotate(-16 150 170)">' +
        '<path d="M70 208H128Q152 208 152 184V112" fill="none" stroke="#6f7a82" stroke-width="30" stroke-linecap="round"/>' +
        '<path d="M70 208H128Q152 208 152 184V112" fill="none" stroke="#aeb9c0" stroke-width="20" stroke-linecap="round"/>' +
        '<path d="M70 208H128Q152 208 152 184V112" fill="none" stroke="#e5edf1" stroke-width="6" stroke-linecap="round" opacity=".5"/>' +
        '<rect x="52" y="192" width="26" height="32" rx="5" fill="#4c565d"/>' +
        '<rect x="52" y="192" width="26" height="8" rx="3" fill="#87949c"/>' +
        '<rect x="138" y="96" width="28" height="26" rx="5" fill="#4c565d"/>' +
        '<rect x="138" y="96" width="28" height="7" rx="3" fill="#87949c"/>' +
        '<path d="M78 196H126" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>' +
        '<path d="M142 120V180" stroke="#ffffff" stroke-opacity=".3" stroke-width="2"/>' +
        '<circle cx="152" cy="184" r="19" fill="#4c565d"/>' +
        '<circle cx="152" cy="184" r="8" fill="#2a3136"/>' +
        "</g>";
    } else if (id === "revolver") {
      obj =
        '<g transform="translate(36 6)">' +
        '<path d="M58 142H168Q196 142 196 160Q196 176 172 178H94Q68 178 58 160Z" fill="#3f474e"/>' +
        '<path d="M64 146H166Q186 146 186 158H64Z" fill="#6b767e" opacity=".55"/>' +
        '<rect x="170" y="132" width="60" height="16" rx="6" fill="#5c666e"/>' +
        '<rect x="182" y="136" width="40" height="5" rx="2" fill="#9aa6ae" opacity=".5"/>' +
        '<circle cx="116" cy="160" r="26" fill="#5c666e"/>' +
        '<circle cx="116" cy="160" r="18" fill="#3f474e"/>' +
        '<circle cx="116" cy="160" r="6" fill="#20262b"/>' +
        '<circle cx="104" cy="152" r="4" fill="#20262b"/><circle cx="128" cy="152" r="4" fill="#20262b"/>' +
        '<circle cx="104" cy="168" r="4" fill="#20262b"/><circle cx="128" cy="168" r="4" fill="#20262b"/>' +
        '<path d="M90 178L78 236Q76 248 90 250L114 250Q124 248 124 236L118 178Z" fill="#6b4630"/>' +
        '<path d="M92 184L86 228" stroke="#a97a4e" stroke-width="4" opacity=".55"/>' +
        '<path d="M72 180Q60 196 74 206" fill="none" stroke="#3f474e" stroke-width="8"/>' +
        '<path d="M144 142L152 120L166 120L160 142Z" fill="#3f474e"/>' +
        '<path d="M152 120L158 106" stroke="#3f474e" stroke-width="5"/>' +
        "</g>";
    } else if (id === "rope") {
      obj =
        '<g fill="none" stroke="#9a7448" stroke-width="16" stroke-linecap="round">' +
        '<ellipse cx="150" cy="168" rx="68" ry="48" transform="rotate(-12 150 168)"/>' +
        '<ellipse cx="154" cy="178" rx="56" ry="39" transform="rotate(-12 154 178)"/>' +
        '<ellipse cx="148" cy="160" rx="44" ry="31" transform="rotate(-12 148 160)"/>' +
        "</g>" +
        '<g fill="none" stroke="#c89d69" stroke-width="4" stroke-linecap="round" opacity=".8">' +
        '<ellipse cx="150" cy="168" rx="68" ry="48" transform="rotate(-12 150 168)" stroke-dasharray="4 8"/>' +
        '<ellipse cx="154" cy="178" rx="56" ry="39" transform="rotate(-12 154 178)" stroke-dasharray="4 8"/>' +
        '<ellipse cx="148" cy="160" rx="44" ry="31" transform="rotate(-12 148 160)" stroke-dasharray="4 8"/>' +
        "</g>" +
        '<path d="M150 216Q190 246 210 224Q224 208 206 198" fill="none" stroke="#9a7448" stroke-width="15" stroke-linecap="round"/>' +
        '<path d="M150 216Q190 246 210 224Q224 208 206 198" fill="none" stroke="#d0a574" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 7"/>' +
        '<circle cx="207" cy="199" r="11" fill="#9a7448"/>' +
        '<path d="M202 199q5-6 10 0q-5 6-10 0Z" fill="#6d4c2c"/>';
    } else {
      obj =
        '<g transform="rotate(-28 150 160)">' +
        '<path d="M138 60H162L170 118L162 240Q150 254 138 240Z" fill="#7f8a92"/>' +
        '<path d="M150 62H162L170 118L162 240Q157 248 150 250Z" fill="#c3ced5" opacity=".6"/>' +
        '<path d="M126 66Q114 92 126 112L138 108V62Z" fill="#5f6a72"/>' +
        '<path d="M174 66Q186 92 174 112L162 108V62Z" fill="#5f6a72"/>' +
        '<path d="M128 78Q122 92 128 104" fill="none" stroke="#d9e2e8" stroke-opacity=".55" stroke-width="2"/>' +
        '<rect x="130" y="116" width="40" height="18" rx="6" fill="#4c565d"/>' +
        '<path d="M132 125h36" stroke="' + GOLD + '" stroke-width="2.4"/>' +
        '<path d="M138 134v10M162 134v10" stroke="#4c565d" stroke-width="4"/>' +
        '<rect x="136" y="234" width="28" height="14" rx="6" fill="#4c565d"/>' +
        "</g>";
    }

    const table =
      '<ellipse cx="150" cy="262" rx="116" ry="24" fill="#000" opacity=".45"/>' +
      '<path d="M20 246H280L266 276H34Z" fill="#2a2017"/>' +
      '<path d="M26 246H274" stroke="' + GOLD + '" stroke-opacity=".42" stroke-width="2"/>' +
      '<path d="M34 258H266" stroke="#000" stroke-opacity=".35" stroke-width="2"/>';

    const scene =
      '<circle cx="150" cy="140" r="105" fill="none" stroke="' + m.color + '" stroke-opacity=".2"/>' +
      '<path d="M150 20V250" stroke="' + BONE + '" stroke-opacity=".06" stroke-width="60"/>' +
      table + obj +
      '<path d="M20 246H280" stroke="' + m.color + '" stroke-opacity=".25" stroke-width="1"/>';

    return '<div class="cl-weapon-art" data-weapon="' + id + '">' +
      svg("0 0 300 320", cardFrame(g, m.color, scene), "cl-card-art-svg") + "</div>";
  }

  /* ============================== الغرف ============================== */

  const ROOM_META = {
    kitchen: { color: "#d9a05b", wall: "#3a3026", floor: "#241d16" },
    ballroom: { color: "#c98bb5", wall: "#3a2c36", floor: "#241b26" },
    conservatory: { color: "#78b98c", wall: "#223a2d", floor: "#14261e" },
    dining: { color: "#c98383", wall: "#3a2a2a", floor: "#241818" },
    billiard: { color: "#7aa7c7", wall: "#234237", floor: "#162b25" },
    library: { color: "#a48bc7", wall: "#332a3f", floor: "#1e1928" },
    lounge: { color: "#d1b072", wall: "#3a3024", floor: "#241d16" },
    hall: { color: "#8fb6a7", wall: "#2b3a38", floor: "#192624" },
    study: { color: "#9aa6b8", wall: "#2b333d", floor: "#192028" },
  };

  function roomScene(id) {
    const m = ROOM_META[id] || ROOM_META.hall;
    const g = uid();
    const defs =
      '<defs>' +
      '<radialGradient id="' + g + 'glow" cx="50%" cy="30%" r="70%">' +
      '<stop offset="0" stop-color="#ffe0a0" stop-opacity=".22"/>' +
      '<stop offset=".55" stop-color="' + m.color + '" stop-opacity=".08"/>' +
      '<stop offset="1" stop-color="#061012" stop-opacity="0"/>' +
      "</radialGradient>" +
      '<linearGradient id="' + g + 'vign" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#050c0e" stop-opacity=".42"/>' +
      '<stop offset=".38" stop-color="#050c0e" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#050c0e" stop-opacity=".55"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + g + 'floor" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + m.floor + '"/>' +
      '<stop offset="1" stop-color="#0a1113"/>' +
      "</linearGradient>" +
      "</defs>";

    const base =
      '<rect width="300" height="220" fill="' + m.wall + '"/>' +
      '<rect width="300" height="220" fill="url(#' + g + 'glow)"/>' +
      '<path d="M0 152H300V220H0Z" fill="url(#' + g + 'floor)"/>' +
      '<path d="M0 152H300" stroke="' + GOLD + '" stroke-opacity=".22"/>' +
      '<path d="M0 30H300M0 70H300M0 110H300" stroke="#fff" stroke-opacity=".035"/>' +
      '<path d="M44 0V152M104 0V152M164 0V152M224 0V152M284 0V152" stroke="#fff" stroke-opacity=".03"/>';

    const scenes = {
      kitchen:
        '<rect x="28" y="38" width="74" height="58" rx="4" fill="#101c1a" stroke="#7a5f3a" stroke-width="3"/>' +
        '<path d="M65 38V96M28 67H102" stroke="#7a5f3a" stroke-width="2"/>' +
        '<circle cx="47" cy="54" r="8" fill="#f2d79a" opacity=".7"/>' +
        '<path d="M28 96H102" stroke="#a98556" stroke-width="4"/>' +
        '<rect x="16" y="112" width="104" height="46" rx="5" fill="#2b2a24"/>' +
        '<rect x="16" y="108" width="104" height="8" rx="3" fill="#8a6a44"/>' +
        '<rect x="26" y="118" width="30" height="30" rx="4" fill="#3c4a44"/>' +
        '<circle cx="41" cy="133" r="9" fill="#141c1a"/><path d="M34 126q7-6 14 0" stroke="#9db3a9" stroke-width="1"/>' +
        '<rect x="64" y="120" width="34" height="18" rx="3" fill="#6b4a2a"/><path d="M68 124h26M68 130h20" stroke="#b98f5c" stroke-width="1.4"/>' +
        '<rect x="128" y="94" width="70" height="64" rx="5" fill="#262b28"/>' +
        '<circle cx="148" cy="114" r="11" fill="#141a18" stroke="#555"/>' +
        '<circle cx="178" cy="114" r="11" fill="#141a18" stroke="#555"/>' +
        '<path d="M138 104h20v10h-20z" fill="#7a5a35"/><path d="M168 104h20v10h-20z" fill="#7a5a35"/>' +
        '<path d="M146 98q0-8 8-8M176 98q0-8 8-8" fill="none" stroke="#cbb99b" stroke-width="1.4" opacity=".6"/>' +
        '<path d="M150 70v18M142 70h16M144 64h12" stroke="#c8b184" stroke-width="2"/>' +
        '<path d="M206 58v44M198 58h16M200 52h12" stroke="#c8b184" stroke-width="2"/>' +
        '<circle cx="206" cy="108" r="10" fill="none" stroke="#c8b184" stroke-width="2"/>' +
        '<path d="M220 40v58M228 40v58M236 40v58" stroke="#7a5f3a" stroke-width="4"/>' +
        '<circle cx="224" cy="58" r="6" fill="#c8b184" opacity=".7"/><circle cx="232" cy="58" r="6" fill="#c8b184" opacity=".5"/>',
      ballroom:
        '<path d="M0 0H52Q30 80 52 152H0Z" fill="#1a1220"/>' +
        '<path d="M300 0H248Q270 80 248 152H300Z" fill="#1a1220"/>' +
        '<path d="M70 20V118M230 20V118" stroke="#c9a8c4" stroke-width="3" opacity=".45"/>' +
        '<path d="M52 18H248" stroke="#c9a8c4" stroke-width="2" opacity=".35"/>' +
        '<path d="M60 30q30-20 60 0v88H60Z" fill="#202a33" stroke="#c9a8c4" stroke-width="2" opacity=".55"/>' +
        '<path d="M180 30q30-20 60 0v88h-60Z" fill="#202a33" stroke="#c9a8c4" stroke-width="2" opacity=".55"/>' +
        '<path d="M90 30v88M210 30v88M60 74h60M180 74h60" stroke="#c9a8c4" stroke-width="1" opacity=".3"/>' +
        '<path d="M150 14V42" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<path d="M112 58Q150 76 188 58" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
        '<path d="M120 58v14M136 66v14M150 70v16M164 66v14M180 58v14" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<g fill="#ffe7b0"><circle cx="120" cy="74" r="3"/><circle cx="136" cy="82" r="3"/><circle cx="150" cy="88" r="3"/><circle cx="164" cy="82" r="3"/><circle cx="180" cy="74" r="3"/></g>' +
        '<path d="M120 74v-5M136 82v-5M150 88v-5M164 82v-5M180 74v-5" stroke="' + GOLD + '" stroke-width="1.4"/>' +
        '<path d="M30 152L94 110H206L270 152Z" fill="#2a2230" opacity=".65"/>' +
        '<path d="M30 152L94 110M270 152L206 110" stroke="' + GOLD + '" stroke-opacity=".22"/>' +
        '<g opacity=".22">' +
        [0, 1, 2, 3, 4].map((i) => '<path d="M' + (78 + i * 36) + ' 152L' + (112 + i * 24) + ' 110" stroke="#fff" stroke-width="1"/>').join("") +
        [0, 1].map((i) => '<path d="M' + (40 + i * 30) + ' 152H' + (70 + i * 30) + 'V132H' + (100 + i * 30) + 'V112" stroke="#fff" fill="none" opacity=".4"/>').join("") +
        "</g>" +
        '<path d="M110 174H190L206 190H94Z" fill="#3a2c36"/>' +
        '<path d="M110 174H190" stroke="' + GOLD + '" stroke-opacity=".3"/>',
      conservatory:
        '<path d="M0 0H300V120H0Z" fill="#16241f"/>' +
        '<path d="M20 0V128M80 0V128M140 0V128M200 0V128M260 0V128M0 34H300M0 78H300" stroke="#9ec7a4" stroke-opacity=".22"/>' +
        '<circle cx="228" cy="42" r="22" fill="#f2e7c8" opacity=".65"/>' +
        '<circle cx="222" cy="38" r="20" fill="#223a2d" opacity=".9"/>' +
        '<path d="M16 132q22-56 50-20q-18 8-26 28q22-26 44-4q-8 24-34 28q-22 4-34-32Z" fill="#4f8a63"/>' +
        '<path d="M54 152q10-48 38-40q-8 20-6 40q-18-18-32 0Z" fill="#6fa87c"/>' +
        '<path d="M236 152q-8-52 20-62q6 22 20 30q-18 4-24 32Z" fill="#4f8a63"/>' +
        '<path d="M208 152q18-34 44-18q-6 18-22 22q-12-2-22-4Z" fill="#6fa87c"/>' +
        '<path d="M182 152q14-26 32-12q-8 12-18 16Z" fill="#78b98c"/>' +
        '<path d="M0 152H300" stroke="#9ec7a4" stroke-opacity=".3"/>' +
        '<path d="M30 170H270M50 186H250M72 202H228" stroke="#9ec7a4" stroke-opacity=".16"/>' +
        '<rect x="132" y="108" width="42" height="44" rx="4" fill="#3a2a1c" stroke="#7a5f3a" stroke-width="2"/>' +
        '<path d="M138 116h30M138 126h22M138 136h26" stroke="#8a6a44" stroke-width="2"/>' +
        '<path d="M120 152q-12-26 4-38q10 12 8 38Z" fill="#78b98c" opacity=".8"/>',
      dining:
        '<path d="M0 0H300V120H0Z" fill="#3a2a2a"/>' +
        '<path d="M0 20H300M0 60H300M0 100H300" stroke="#fff" stroke-opacity=".04"/>' +
        '<rect x="24" y="22" width="60" height="72" rx="4" fill="#1c2026" stroke="#8a6a44" stroke-width="2"/>' +
        '<path d="M54 22v72M24 58h60" stroke="#8a6a44" stroke-width="1.6"/>' +
        '<rect x="216" y="22" width="60" height="72" rx="4" fill="#1c2026" stroke="#8a6a44" stroke-width="2"/>' +
        '<path d="M246 22v72M216 58h60" stroke="#8a6a44" stroke-width="1.6"/>' +
        '<path d="M24 118H276L258 174H42Z" fill="#5d4026"/>' +
        '<path d="M24 118H276" stroke="#b48a56" stroke-width="5"/>' +
        '<path d="M42 174H258L246 188H54Z" fill="#3a2818"/>' +
        '<path d="M54 118V108H246V118" fill="#8a5f3c"/>' +
        '<path d="M62 118V174M238 118V174M92 118V174M208 118V174" stroke="#3a2818" stroke-width="5"/>' +
        '<path d="M84 118V96H216V118" fill="#6b4a2a"/>' +
        '<path d="M92 96V80H208V96" fill="#5d4026"/>' +
        '<path d="M110 96V84M130 96V84M170 96V84M190 96V84" stroke="#b48a56" stroke-width="3"/>' +
        '<path d="M86 80h20l-4-8H90Z" fill="#e8d7b2"/><path d="M194 80h20l-4-8h-12Z" fill="#e8d7b2"/>' +
        '<g fill="#ffe7b0"><circle cx="96" cy="68" r="3"/><circle cx="204" cy="68" r="3"/></g>' +
        '<path d="M96 68V76M204 68V76" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<circle cx="98" cy="102" r="5" fill="#e8d7b2" opacity=".7"/><circle cx="202" cy="102" r="5" fill="#e8d7b2" opacity=".7"/>' +
        '<path d="M130 102h40v8h-40z" fill="#e8d7b2" opacity=".3"/>' +
        '<path d="M34 118v54M266 118v54M34 172h20M246 172h20" stroke="#7a5430" stroke-width="4"/>',
      billiard:
        '<path d="M0 0H300V152H0Z" fill="#1f3a30"/>' +
        '<path d="M0 28H300M0 68H300M0 108H300" stroke="#fff" stroke-opacity=".03"/>' +
        '<path d="M150 0V38" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<path d="M122 46H178L192 78H108Z" fill="#2f5d45" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<path d="M108 78L72 152H228L192 78Z" fill="#ffe0a0" opacity=".08"/>' +
        '<rect x="36" y="112" width="228" height="76" rx="7" fill="#5d4026"/>' +
        '<rect x="48" y="120" width="204" height="58" rx="4" fill="#2f7a55"/>' +
        '<rect x="54" y="126" width="192" height="46" rx="3" fill="#3f9a6c"/>' +
        '<circle cx="62" cy="132" r="6" fill="#10241b"/><circle cx="238" cy="132" r="6" fill="#10241b"/>' +
        '<circle cx="62" cy="166" r="6" fill="#10241b"/><circle cx="238" cy="166" r="6" fill="#10241b"/>' +
        '<circle cx="100" cy="150" r="7" fill="#f2e8ce"/><circle cx="128" cy="158" r="7" fill="#c94b45"/>' +
        '<circle cx="156" cy="146" r="7" fill="#e0b84a"/><circle cx="184" cy="160" r="7" fill="#4b7a9c"/>' +
        '<circle cx="206" cy="146" r="7" fill="#8b5a9c"/>' +
        '<path d="M150 120V108" stroke="#c8b184" stroke-width="3"/>' +
        '<rect x="266" y="46" width="8" height="72" rx="4" fill="#7a5430"/>' +
        '<path d="M254 46l14-10 14 10" fill="none" stroke="#c8b184" stroke-width="2"/>' +
        '<path d="M28 56l6 54M34 56l6 54" stroke="#c8b184" stroke-width="3"/>',
      library:
        '<path d="M0 0H300V152H0Z" fill="#2b2233"/>' +
        '<rect x="14" y="18" width="112" height="134" rx="4" fill="#3a2818" stroke="#6b4a2a" stroke-width="2"/>' +
        '<rect x="20" y="24" width="100" height="34" fill="#21170e"/>' +
        '<rect x="20" y="62" width="100" height="34" fill="#21170e"/>' +
        '<rect x="20" y="100" width="100" height="34" fill="#21170e"/>' +
        [26, 34, 42, 50, 58, 66, 74, 82, 90, 98, 106].map((x, i) => '<rect x="' + x + '" y="27" width="5" height="27" rx="1" fill="' + ["#8b3f45", "#3f6b8b", "#b08a3f", "#4f8b63"][i % 4] + '"/>').join("") +
        [28, 38, 48, 58, 68, 78, 88, 98, 108].map((x, i) => '<rect x="' + x + '" y="66" width="5" height="26" rx="1" fill="' + ["#6b4a8b", "#b08a3f", "#3f6b8b", "#8b3f45"][i % 4] + '"/>').join("") +
        [26, 36, 46, 56, 66, 76, 86, 96, 106].map((x, i) => '<rect x="' + x + '" y="104" width="5" height="26" rx="1" fill="' + ["#4f8b63", "#8b3f45", "#b08a3f", "#3f6b8b"][i % 4] + '"/>').join("") +
        '<path d="M128 24L102 150" stroke="#8a6a44" stroke-width="4"/>' +
        '<path d="M128 24L134 148" stroke="#8a6a44" stroke-width="2"/>' +
        '<path d="M134 24h-6M118 24h-6M102 24h-6" stroke="#8a6a44" stroke-width="3"/>' +
        '<path d="M148 104q-26 6-26 48h58q0-42-32-48Z" fill="#4a3520"/>' +
        '<path d="M122 112q28-14 56 0" fill="none" stroke="#8a6a44" stroke-width="4"/>' +
        '<path d="M148 104v48" stroke="#6b4a2a" stroke-width="2"/>' +
        '<rect x="206" y="42" width="72" height="98" rx="4" fill="#1a1210" stroke="#6b4a2a" stroke-width="2"/>' +
        '<path d="M218 138q12-38 26-38q14 0 24 38Z" fill="#a64b2a" opacity=".85"/>' +
        '<path d="M228 138q8-22 16-22q8 0 14 22Z" fill="#f0b45a" opacity=".9"/>' +
        '<path d="M218 138h50" stroke="#6b4a2a" stroke-width="4"/>' +
        '<circle cx="236" cy="64" r="12" fill="#f2d79a" opacity=".12"/>' +
        '<path d="M240 34v26M234 34h12M236 28h8" stroke="#c8b184" stroke-width="1.4"/>' +
        '<path d="M20 152H280" stroke="#8a6a44" stroke-opacity=".35" stroke-width="4"/>',
      lounge:
        '<path d="M0 0H300V152H0Z" fill="#342a1f"/>' +
        '<path d="M0 24H300M0 64H300M0 104H300" stroke="#fff" stroke-opacity=".035"/>' +
        '<path d="M18 70q0-18 18-18h88q18 0 18 18v46H18Z" fill="#6b4a2d"/>' +
        '<path d="M26 78q0-12 12-12h76q12 0 12 12v26H26Z" fill="#8a5f3c"/>' +
        '<path d="M18 116h124v14H18z" fill="#4a321f"/>' +
        '<path d="M18 108v22M142 108v22" stroke="#4a321f" stroke-width="6"/>' +
        '<path d="M34 88h92M34 98h92" stroke="#a97a4e" stroke-opacity=".4" stroke-width="2"/>' +
        '<rect x="194" y="42" width="76" height="100" rx="4" fill="#171210" stroke="#6b4a2a" stroke-width="2"/>' +
        '<path d="M204 138q14-42 30-42q16 0 26 42Z" fill="#a64b2a"/>' +
        '<path d="M216 138q8-24 18-24q10 0 16 24Z" fill="#f0b45a"/>' +
        '<path d="M194 138h76" stroke="#6b4a2a" stroke-width="4"/>' +
        '<rect x="158" y="72" width="30" height="44" rx="4" fill="#3a2818"/>' +
        '<circle cx="173" cy="88" r="8" fill="#1a1210" stroke="#c8b184" stroke-width="1.4"/>' +
        '<path d="M166 116h14M160 120h26" stroke="#c8b184" stroke-width="2"/>' +
        '<path d="M160 116q-14-10-14-26" fill="none" stroke="#c8b184" stroke-width="2"/>' +
        '<path d="M154 88q-8-6-8-16" fill="none" stroke="#c8b184" stroke-width="1.4"/>' +
        '<ellipse cx="90" cy="176" rx="70" ry="26" fill="#5a3b26" opacity=".5"/>' +
        '<path d="M20 152H280" stroke="#8a6a44" stroke-opacity=".3" stroke-width="4"/>',
      hall:
        '<path d="M0 0H300V152H0Z" fill="#263532"/>' +
        '<path d="M0 0H44V152H0Z" fill="#1c2a27"/>' +
        '<path d="M300 0H256V152H300Z" fill="#1c2a27"/>' +
        '<path d="M44 0v152M256 0v152" stroke="#c8b184" stroke-opacity=".35" stroke-width="3"/>' +
        '<path d="M94 152V72Q150 26 206 72V152Z" fill="#1a2422"/>' +
        '<path d="M108 152V78Q150 40 192 78V152Z" fill="#2a3a36" stroke="#8a6a44" stroke-opacity=".4"/>' +
        '<path d="M96 118H204M102 100H198M110 84H190" stroke="#c8b184" stroke-opacity=".25" stroke-width="2"/>' +
        '<path d="M150 32V66" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<path d="M118 78Q150 92 182 78" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
        '<path d="M124 78v10M138 84v12M150 88v14M162 84v12M176 78v10" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<g fill="#ffe7b0"><circle cx="124" cy="88" r="2.6"/><circle cx="138" cy="96" r="2.6"/><circle cx="150" cy="102" r="2.6"/><circle cx="162" cy="96" r="2.6"/><circle cx="176" cy="88" r="2.6"/></g>' +
        '<path d="M0 152L150 118L300 152Z" fill="#2e3d39"/>' +
        '<g opacity=".18">' + [0, 1, 2, 3, 4, 5].map((i) => '<path d="M' + (i * 60) + ' 152L' + (100 + i * 20) + ' 126" stroke="#fff" stroke-width="1"/>').join("") + "</g>" +
        '<path d="M20 170H280M36 186H264M52 202H248" stroke="#8fb6a7" stroke-opacity=".12"/>' +
        '<path d="M118 152V132H182V152" fill="#3a2818"/>' +
        '<path d="M118 132h64" stroke="#c8b184" stroke-opacity=".4" stroke-width="2"/>',
      study:
        '<path d="M0 0H300V152H0Z" fill="#252d35"/>' +
        '<rect x="222" y="18" width="58" height="66" rx="3" fill="#101a22" stroke="#6b7a88" stroke-width="2"/>' +
        '<path d="M251 18v66M222 52h58" stroke="#6b7a88" stroke-width="1.4"/>' +
        '<circle cx="242" cy="38" r="10" fill="#f2e7c8" opacity=".55"/>' +
        '<rect x="14" y="18" width="74" height="96" rx="3" fill="#3a2818" stroke="#6b4a2a" stroke-width="2"/>' +
        [20, 30, 40, 50, 60, 70].map((x, i) => '<rect x="' + x + '" y="24" width="6" height="30" rx="1" fill="' + ["#8b3f45", "#3f6b8b", "#b08a3f", "#4f8b63"][i % 4] + '"/>').join("") +
        [22, 34, 46, 58, 70].map((x, i) => '<rect x="' + x + '" y="60" width="6" height="24" rx="1" fill="' + ["#6b4a8b", "#b08a3f", "#3f6b8b", "#8b3f45"][i % 4] + '"/>').join("") +
        '<path d="M16 96h70" stroke="#6b4a2a" stroke-width="3"/>' +
        '<path d="M28 118H272L252 160H48Z" fill="#5d4026"/>' +
        '<path d="M28 118H272" stroke="#b48a56" stroke-width="4"/>' +
        '<path d="M48 160H252L242 172H58Z" fill="#3a2818"/>' +
        '<path d="M70 118V92H142V118" fill="#6b4a2a"/>' +
        '<path d="M78 92h56v26H78Z" fill="#e8d7b2" opacity=".85"/>' +
        '<path d="M86 100h40M86 108h30" stroke="#7a5430" stroke-width="1.6"/>' +
        '<path d="M156 118V96h26v22" fill="#8a5f3c"/>' +
        '<path d="M160 100h18M160 106h14" stroke="#e8d7b2" stroke-width="1.4" opacity=".7"/>' +
        '<path d="M204 118V86" stroke="#c8b184" stroke-width="3"/>' +
        '<path d="M190 86h28l-6-12h-16Z" fill="#2f5d45"/>' +
        '<circle cx="204" cy="92" r="10" fill="#ffe0a0" opacity=".25"/>' +
        '<path d="M56 118v50M244 118v50" stroke="#4a321f" stroke-width="5"/>' +
        '<ellipse cx="150" cy="186" rx="80" ry="20" fill="#1a1210" opacity=".5"/>',
    };

    const body = base + (scenes[id] || "") +
      '<rect width="300" height="220" fill="url(#' + g + 'vign)"/>' +
      '<path d="M8 8h284v204H8Z" fill="none" stroke="' + m.color + '" stroke-opacity=".2"/>';

    return '<svg class="cl-room-scene" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      defs + body + "</svg>";
  }

  function cardArt(id, cat, color) {
    if (cat === "s") return suspectPortrait(id);
    if (cat === "w") return weaponArt(id);
    const g = uid();
    const m = ROOM_META[id] || ROOM_META.hall;
    const inner = roomScene(id).replace('<svg class="cl-room-scene" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">', "").replace(/<\/svg>$/, "");
    const body =
      '<rect width="300" height="320" fill="#0c1518"/>' +
      '<svg x="0" y="0" width="300" height="320" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice">' + inner + "</svg>" +
      '<rect width="300" height="320" fill="url(#' + g + 'fade)"/>' +
      '<rect x="8" y="8" width="284" height="304" rx="11" fill="none" stroke="' + GOLD + '" stroke-opacity=".5"/>' +
      '<rect x="14" y="14" width="272" height="292" rx="8" fill="none" stroke="' + GOLD + '" stroke-opacity=".2" stroke-dasharray="1 4"/>' +
      '<path d="M20 20h20M20 20v20M280 20h-20M280 20v20M20 300h20M20 300v-20M280 300h-20M280 300v-20" fill="none" stroke="' + (color || m.color) + '" stroke-opacity=".55" stroke-width="2"/>' +
      '<defs><linearGradient id="' + g + 'fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081114" stop-opacity="0"/><stop offset=".72" stop-color="#081114" stop-opacity=".08"/><stop offset="1" stop-color="#081114" stop-opacity=".9"/></linearGradient></defs>';
    return svg("0 0 300 320", body, "cl-card-art-svg");
  }

  function envelope() {
    const g = uid();
    return svg("0 0 300 200",
      '<defs>' +
      '<linearGradient id="' + g + 'paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe2c4"/><stop offset="1" stop-color="#cdbb95"/></linearGradient>' +
      '<linearGradient id="' + g + 'flap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9c8a4"/><stop offset="1" stop-color="#b7a17a"/></linearGradient>' +
      '<radialGradient id="' + g + 'wax" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#c8515e"/><stop offset=".55" stop-color="#8f2f3e"/><stop offset="1" stop-color="#5d1b27"/></radialGradient>' +
      '<filter id="' + g + 'sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".5"/></filter>' +
      "</defs>" +
      '<ellipse cx="150" cy="180" rx="92" ry="14" fill="#000" opacity=".45"/>' +
      '<g filter="url(#' + g + 'sh)">' +
      '<rect x="48" y="44" width="204" height="126" rx="8" fill="url(#' + g + 'paper)"/>' +
      '<path d="M48 52L150 122L252 52V58L150 130L48 58Z" fill="url(#' + g + 'flap)"/>' +
      '<path d="M48 164L118 108M252 164L182 108" stroke="#8f7a58" stroke-opacity=".5" stroke-width="2"/>' +
      '<rect x="48" y="44" width="204" height="126" rx="8" fill="none" stroke="#8f7a58" stroke-width="2"/>' +
      '<circle cx="150" cy="112" r="27" fill="url(#' + g + 'wax)"/>' +
      '<circle cx="150" cy="112" r="20" fill="none" stroke="#e7b4aa" stroke-opacity=".28" stroke-dasharray="2 4"/>' +
      '<path d="M143 104q0-3 3-3h8q3 0 3 3v5h2q2 0 2 2v9q0 2-2 2h-18q-2 0-2-2v-9q0-2 2-2h2Z" fill="#f4d9cf" opacity=".9"/>' +
      '<circle cx="150" cy="115" r="2" fill="#8f2f3e"/>' +
      "</g>" +
      '<path d="M88 28L96 12M212 28L204 12" stroke="' + GOLD + '" stroke-width="2" opacity=".7"/>' +
      '<circle cx="150" cy="20" r="3" fill="' + GOLD + '" opacity=".8"/>' +
      '<path d="M40 92Q18 100 24 120M260 92Q282 100 276 120" fill="none" stroke="' + GOLD + '" stroke-opacity=".3" stroke-width="1.4"/>',
      "cl-envelope-svg");
  }

  function cardBack() {
    const g = uid();
    return svg("0 0 300 420",
      '<defs>' +
      '<linearGradient id="' + g + 'bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#261b2e"/><stop offset=".5" stop-color="#141a24"/><stop offset="1" stop-color="#2b1f25"/></linearGradient>' +
      '<pattern id="' + g + 'p" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M17 0 34 17 17 34 0 17Z" fill="none" stroke="' + GOLD + '" stroke-opacity=".2"/><circle cx="17" cy="17" r="1.6" fill="' + GOLD + '" fill-opacity=".35"/></pattern>' +
      "</defs>" +
      '<rect width="300" height="420" rx="14" fill="url(#' + g + 'bg)"/>' +
      '<rect width="300" height="420" rx="14" fill="url(#' + g + 'p)"/>' +
      '<rect x="12" y="12" width="276" height="396" rx="10" fill="none" stroke="' + GOLD + '" stroke-opacity=".45"/>' +
      '<rect x="20" y="20" width="260" height="380" rx="7" fill="none" stroke="' + GOLD + '" stroke-opacity=".18" stroke-dasharray="2 5"/>' +
      '<circle cx="150" cy="200" r="54" fill="none" stroke="' + GOLD + '" stroke-opacity=".35"/>' +
      '<circle cx="150" cy="200" r="42" fill="none" stroke="' + GOLD + '" stroke-opacity=".16" stroke-dasharray="2 4"/>' +
      '<path d="M150 168v10M138 214c0-14 12-22 12-22s12 8 12 22c0 10-8 16-12 16s-12-6-12-16Z" fill="none" stroke="' + GOLD + '" stroke-opacity=".75" stroke-width="2"/>' +
      '<path d="M146 218v10M150 228v6" stroke="' + GOLD + '" stroke-opacity=".55" stroke-width="2"/>' +
      '<text x="150" y="320" text-anchor="middle" fill="' + GOLD + '" fill-opacity=".7" font-family="Georgia, serif" font-size="12" letter-spacing="6">CLUEDO</text>',
      "cl-card-back-svg");
  }

  window.BGCluedoArt = { cardArt, roomScene, envelope, cardBack, suspectPortrait, weaponArt };
})();
