/* ==========================================================================
   ألعاب الطاولة — رسومات مكتبة التوسعة
   مشاهد SVG أصلية خفيفة للألعاب الثلاث عشرة المضافة: كلاسيكيات عائلية
   ومختارات حديثة. لا تُحمّل أي صورة خارجية ولا تعتمد على خطوط خاصة.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;

  const art = BG.libraryArt || (BG.libraryArt = {});
  const svg = (inner) =>
    '<svg class="la" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + inner + "</svg>";

  function halo(id, color) {
    return '<radialGradient id="' + id + '" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="' + color + '" stop-opacity=".38"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
  }

  /* ------------------------------ ياهتزي ------------------------------ */
  art.yahtzee = svg(
    '<defs>' + halo("yzHalo", "#e3b36d") +
    '<linearGradient id="yzIvory" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff9e9"/><stop offset="1" stop-color="#d9c399"/></linearGradient>' +
    '<filter id="yzSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#yzHalo)"/>' +
    '<g filter="url(#yzSh)" transform="rotate(-11 143 118)"><rect x="92" y="62" width="96" height="96" rx="17" fill="url(#yzIvory)" stroke="#8b6b3e" stroke-width="2"/>' +
    '<circle cx="120" cy="90" r="7" fill="#7c3f38"/><circle cx="160" cy="90" r="7" fill="#7c3f38"/><circle cx="120" cy="130" r="7" fill="#7c3f38"/><circle cx="160" cy="130" r="7" fill="#7c3f38"/><circle cx="140" cy="110" r="7" fill="#7c3f38"/></g>' +
    '<g filter="url(#yzSh)" transform="rotate(14 240 135)"><rect x="197" y="84" width="82" height="82" rx="15" fill="#f2e4c6" stroke="#8b6b3e" stroke-width="2"/>' +
    '<circle cx="222" cy="109" r="6" fill="#8a4b3a"/><circle cx="254" cy="109" r="6" fill="#8a4b3a"/><circle cx="238" cy="125" r="6" fill="#8a4b3a"/><circle cx="222" cy="141" r="6" fill="#8a4b3a"/><circle cx="254" cy="141" r="6" fill="#8a4b3a"/></g>' +
    '<g fill="#f4d99b"><path d="M286 55l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/><circle cx="74" cy="50" r="2"/><circle cx="304" cy="163" r="1.6"/></g>'
  );

  /* ------------------------------ روميكوب ------------------------------ */
  art.rummikub = svg(
    '<defs>' + halo("rkHalo", "#d8936b") +
    '<filter id="rkSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".42"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#rkHalo)"/><g filter="url(#rkSh)" transform="rotate(-4 180 150)">' +
    '<rect x="48" y="151" width="264" height="19" rx="7" fill="#5d3d25" stroke="#9b7047" stroke-width="2"/>' +
    '<rect x="76" y="81" width="44" height="67" rx="7" fill="#f9edd0" stroke="#87643c" stroke-width="1.8"/>' +
    '<rect x="128" y="75" width="44" height="73" rx="7" fill="#e8b05c" stroke="#7e5a33" stroke-width="1.8"/>' +
    '<rect x="180" y="81" width="44" height="67" rx="7" fill="#b85d50" stroke="#7e3c35" stroke-width="1.8"/>' +
    '<rect x="232" y="78" width="44" height="70" rx="7" fill="#61a28a" stroke="#3c6d5c" stroke-width="1.8"/>' +
    '<g font-family="Georgia,serif" font-weight="700" text-anchor="middle">' +
    '<text x="98" y="124" font-size="28" fill="#2d4e43">7</text><text x="150" y="124" font-size="28" fill="#4b321d">8</text><text x="202" y="124" font-size="28" fill="#f9edd0">9</text><text x="254" y="124" font-size="24" fill="#f9edd0">★</text></g>' +
    '<circle cx="98" cy="142" r="4" fill="#b85d50"/><circle cx="150" cy="142" r="4" fill="#61a28a"/><circle cx="202" cy="142" r="4" fill="#e8b05c"/><circle cx="254" cy="142" r="4" fill="#b85d50"/></g>' +
    '<g fill="#f4d99b"><circle cx="60" cy="55" r="2.4"/><circle cx="300" cy="45" r="1.8"/><path d="M305 160l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ أوتيلو ------------------------------ */
  art.othello = svg(
    '<defs>' + halo("otHalo", "#82b59a") +
    '<filter id="otSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".42"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#otHalo)"/>' +
    '<g transform="rotate(-5 180 118)" filter="url(#otSh)"><rect x="84" y="30" width="192" height="176" rx="12" fill="#2f5c48" stroke="#172d26" stroke-width="4"/>' +
    '<g stroke="#6b937c" stroke-width="1" opacity=".55">' +
    '<path d="M108 30v176M132 30v176M156 30v176M180 30v176M204 30v176M228 30v176M252 30v176M84 54h192M84 78h192M84 102h192M84 126h192M84 150h192M84 174h192"/></g>' +
    '<g filter="url(#otSh)">' +
    '<circle cx="132" cy="78" r="21" fill="#0e1412" stroke="#9fbea7" stroke-width="2"/><circle cx="156" cy="78" r="21" fill="#f6ecd3" stroke="#9a7b4f" stroke-width="2"/>' +
    '<circle cx="132" cy="102" r="21" fill="#f6ecd3" stroke="#9a7b4f" stroke-width="2"/><circle cx="156" cy="102" r="21" fill="#0e1412" stroke="#9fbea7" stroke-width="2"/>' +
    '<circle cx="204" cy="174" r="21" fill="#0e1412" stroke="#9fbea7" stroke-width="2"/><circle cx="228" cy="174" r="21" fill="#f6ecd3" stroke="#9a7b4f" stroke-width="2"/></g></g>' +
    '<g fill="#e9d5a1"><path d="M70 50l2.2 6 6 2.2-6 2.2-2.2 6-2.2-6-6-2.2 6-2.2z"/><circle cx="300" cy="60" r="2"/></g>'
  );

  /* ------------------------------ كونكت فور ------------------------------ */
  art["connect-four"] = svg(
    '<defs>' + halo("c4Halo", "#e0a25f") +
    '<linearGradient id="c4Board" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#416b94"/><stop offset="1" stop-color="#203d5c"/></linearGradient>' +
    '<filter id="c4Sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#c4Halo)"/>' +
    '<g transform="rotate(-3 180 110)" filter="url(#c4Sh)"><rect x="74" y="26" width="212" height="180" rx="18" fill="url(#c4Board)" stroke="#132a41" stroke-width="4"/>' +
    '<g fill="#0e2236">' +
    '<circle cx="104" cy="58" r="16"/><circle cx="142" cy="58" r="16"/><circle cx="180" cy="58" r="16"/><circle cx="218" cy="58" r="16"/><circle cx="256" cy="58" r="16"/>' +
    '<circle cx="104" cy="94" r="16"/><circle cx="142" cy="94" r="16"/><circle cx="180" cy="94" r="16"/><circle cx="218" cy="94" r="16"/><circle cx="256" cy="94" r="16"/>' +
    '<circle cx="104" cy="130" r="16"/><circle cx="142" cy="130" r="16"/><circle cx="180" cy="130" r="16"/><circle cx="218" cy="130" r="16"/><circle cx="256" cy="130" r="16"/>' +
    '<circle cx="104" cy="166" r="16"/><circle cx="142" cy="166" r="16"/><circle cx="180" cy="166" r="16"/><circle cx="218" cy="166" r="16"/><circle cx="256" cy="166" r="16"/></g>' +
    '<g filter="url(#c4Sh)"><circle cx="104" cy="130" r="16" fill="#d96a56"/><circle cx="142" cy="130" r="16" fill="#e7b958"/><circle cx="180" cy="130" r="16" fill="#d96a56"/><circle cx="218" cy="166" r="16" fill="#e7b958"/><circle cx="180" cy="166" r="16" fill="#d96a56"/><circle cx="142" cy="166" r="16" fill="#e7b958"/><circle cx="104" cy="166" r="16" fill="#d96a56"/></g></g>' +
    '<path d="M104 130h114" stroke="#ffe6a8" stroke-width="4" stroke-linecap="round" opacity=".65"/>' +
    '<g fill="#f4d99b"><circle cx="64" cy="48" r="2"/><path d="M300 168l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ ستراتيجو ------------------------------ */
  art.stratego = svg(
    '<defs>' + halo("stHalo", "#c58e70") +
    '<filter id="stSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#stHalo)"/>' +
    '<g transform="rotate(-8 130 122)" filter="url(#stSh)"><rect x="72" y="57" width="88" height="120" rx="9" fill="#e8c887" stroke="#73522b" stroke-width="3"/><rect x="81" y="66" width="70" height="102" rx="5" fill="#7d3c36"/>' +
    '<g fill="#f3deb0"><path d="M104 91h24l-3 11h-18z"/><path d="M100 104h32l-4 30h-24z"/><circle cx="116" cy="119" r="4" fill="#7d3c36"/><path d="M104 140h24" stroke="#f3deb0" stroke-width="4"/></g></g>' +
    '<g transform="rotate(9 234 124)" filter="url(#stSh)"><rect x="182" y="50" width="88" height="120" rx="9" fill="#d7e0d0" stroke="#445d47" stroke-width="3"/><rect x="191" y="59" width="70" height="102" rx="5" fill="#31533d"/>' +
    '<g fill="#e9f0db"><path d="M213 84l11-18 11 18z"/><path d="M211 91h26v38h-26z"/><circle cx="224" cy="108" r="4" fill="#31533d"/><path d="M211 136h26" stroke="#e9f0db" stroke-width="4"/></g></g>' +
    '<path d="M166 62l14 14-14 14-14-14z" fill="#e6b65d" opacity=".85"/>' +
    '<g fill="#f4d99b"><circle cx="300" cy="45" r="2"/><circle cx="58" cy="164" r="1.8"/></g>'
  );

  /* ------------------------------ باتشيزي ------------------------------ */
  art.parcheesi = svg(
    '<defs>' + halo("pcHalo", "#d9a463") +
    '<filter id="pcSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".42"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#pcHalo)"/>' +
    '<g transform="rotate(-4 180 106)" filter="url(#pcSh)"><rect x="84" y="25" width="192" height="192" rx="16" fill="#f3e7ca" stroke="#9a7645" stroke-width="3"/>' +
    '<path d="M180 25v192M84 121h192" stroke="#b08b55" stroke-width="2"/>' +
    '<rect x="96" y="37" width="168" height="168" rx="18" fill="none" stroke="#c3a46f" stroke-width="10" stroke-dasharray="13 9"/>' +
    '<g fill="#b85b4d"><circle cx="180" cy="62" r="13"/><circle cx="180" cy="94" r="13"/><circle cx="180" cy="126" r="13"/><circle cx="180" cy="158" r="13"/></g>' +
    '<g fill="#5d8e83"><circle cx="120" cy="106" r="13"/><circle cx="140" cy="106" r="13"/><circle cx="160" cy="106" r="13"/><circle cx="200" cy="106" r="13"/><circle cx="220" cy="106" r="13"/><circle cx="240" cy="106" r="13"/></g>' +
    '<g filter="url(#pcSh)"><circle cx="116" cy="166" r="14" fill="#dba54f" stroke="#7d5624" stroke-width="2"/><circle cx="144" cy="166" r="14" fill="#dba54f" stroke="#7d5624" stroke-width="2"/><circle cx="172" cy="166" r="14" fill="#dba54f" stroke="#7d5624" stroke-width="2"/><circle cx="200" cy="166" r="14" fill="#dba54f" stroke="#7d5624" stroke-width="2"/></g>' +
    '<circle cx="180" cy="106" r="22" fill="#7d3c36" opacity=".15"/><path d="M168 106h24M180 94v24" stroke="#7d3c36" stroke-width="3" opacity=".55"/></g>' +
    '<g fill="#f4d99b"><path d="M300 52l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="58" cy="60" r="2"/></g>'
  );

  /* ------------------------------ سوري ------------------------------ */
  art.sorry = svg(
    '<defs>' + halo("syHalo", "#dc8b77") +
    '<filter id="sySh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#syHalo)"/>' +
    '<g transform="rotate(-16 150 88)" filter="url(#sySh)"><rect x="104" y="42" width="78" height="112" rx="8" fill="#f7ecd7" stroke="#8d6740" stroke-width="2"/><rect x="112" y="50" width="62" height="20" rx="3" fill="#b9584d"/><path d="M122 85h42M122 98h42M122 111h30M122 124h38" stroke="#b59b78" stroke-width="4" stroke-linecap="round"/></g>' +
    '<g transform="rotate(8 226 94)" filter="url(#sySh)"><rect x="182" y="54" width="78" height="112" rx="8" fill="#f7ecd7" stroke="#8d6740" stroke-width="2"/><rect x="190" y="62" width="62" height="20" rx="3" fill="#4f7b63"/><circle cx="221" cy="118" r="22" fill="#d6a24c" stroke="#7c5321" stroke-width="2"/><path d="M210 118h22M221 107v22" stroke="#7c5321" stroke-width="3"/></g>' +
    '<g filter="url(#sySh)"><circle cx="92" cy="166" r="14" fill="#c85f51"/><circle cx="121" cy="176" r="14" fill="#d6a24c"/><circle cx="150" cy="166" r="14" fill="#5d8e83"/></g>' +
    '<path d="M280 120l20 20-20 20-20-20z" fill="#d6a24c" opacity=".55"/>' +
    '<g fill="#f4d99b"><circle cx="66" cy="52" r="2"/><path d="M292 45l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ معارك السفن ------------------------------ */
  art.battleship = svg(
    '<defs>' + halo("bsHalo", "#86a9c2") +
    '<filter id="bsSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#bsHalo)"/>' +
    '<g transform="rotate(-4 180 108)" filter="url(#bsSh)"><rect x="62" y="34" width="236" height="172" rx="12" fill="#dceaf1" stroke="#4d6c80" stroke-width="3"/>' +
    '<g stroke="#9db9c8" stroke-width="1"><path d="M86 34v172M110 34v172M134 34v172M158 34v172M182 34v172M206 34v172M230 34v172M254 34v172M62 58h236M62 82h236M62 106h236M62 130h236M62 154h236M62 178h236"/></g>' +
    '<g fill="#5d87a0"><rect x="88" y="60" width="44" height="20" rx="6"/><rect x="158" y="84" width="68" height="20" rx="6"/><rect x="88" y="108" width="92" height="20" rx="6"/><rect x="182" y="132" width="44" height="20" rx="6"/><rect x="88" y="156" width="68" height="20" rx="6"/></g>' +
    '<g fill="#c65f52"><circle cx="182" cy="94" r="7"/><circle cx="226" cy="94" r="7"/><circle cx="182" cy="118" r="7"/><circle cx="226" cy="118" r="7"/><path d="M201 106l10 10M211 106l-10 10" stroke="#c65f52" stroke-width="3"/></g>' +
    '<g fill="#3c5b6d" opacity=".6"><circle cx="206" cy="70" r="4"/><circle cx="230" cy="70" r="4"/><circle cx="206" cy="166" r="4"/><circle cx="230" cy="166" r="4"/></g></g>' +
    '<g fill="#f4d99b"><path d="M300 46l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="62" cy="50" r="2"/></g>'
  );

  /* ------------------------------ 7 Wonders ------------------------------ */
  art["seven-wonders"] = svg(
    '<defs>' + halo("swHalo", "#e0b979") +
    '<linearGradient id="swSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78513b"/><stop offset="1" stop-color="#2b1c19"/></linearGradient>' +
    '<filter id="swSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#swHalo)"/>' +
    '<circle cx="180" cy="84" r="44" fill="#dca85f" opacity=".5"/><circle cx="180" cy="84" r="30" fill="#f4d79a" opacity=".75"/>' +
    '<g filter="url(#swSh)" fill="#e8d1a2" stroke="#7b5b36" stroke-width="2">' +
    '<path d="M105 186h20v-72h-20z"/><path d="M99 114h32l-6-16h-20z"/><path d="M103 98h24l-5-13h-14z"/>' +
    '<path d="M164 186h20v-88h-20z"/><path d="M157 98h34l-7-18h-20z"/><path d="M161 80h26l-5-14h-16z"/>' +
    '<path d="M223 186h20v-72h-20z"/><path d="M217 114h32l-6-16h-20z"/><path d="M221 98h24l-5-13h-14z"/></g>' +
    '<g stroke="#c49a62" stroke-width="2" opacity=".75"><path d="M112 124h6M112 140h6M112 156h6M112 172h6M171 112h6M171 130h6M171 148h6M171 166h6M230 124h6M230 140h6M230 156h6M230 172h6"/></g>' +
    '<path d="M76 188h208" stroke="#c59c66" stroke-width="3" opacity=".7"/>' +
    '<g fill="#f4d99b"><path d="M292 58l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/><circle cx="64" cy="62" r="2"/><circle cx="300" cy="156" r="1.6"/></g>'
  );

  /* ------------------------------ أزول ------------------------------ */
  art.azul = svg(
    '<defs>' + halo("azHalo", "#78a7bb") +
    '<filter id="azSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".42"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#azHalo)"/>' +
    '<g filter="url(#azSh)"><circle cx="112" cy="102" r="46" fill="#193e50" stroke="#0d2836" stroke-width="4"/><circle cx="248" cy="102" r="46" fill="#193e50" stroke="#0d2836" stroke-width="4"/>' +
    '<g><circle cx="96" cy="88" r="9" fill="#4f8fb0"/><circle cx="118" cy="88" r="9" fill="#d7b451"/><circle cx="96" cy="112" r="9" fill="#c25f57"/><circle cx="118" cy="112" r="9" fill="#3f4957"/><circle cx="107" cy="100" r="9" fill="#e7e2d1"/></g>' +
    '<g><circle cx="232" cy="88" r="9" fill="#c25f57"/><circle cx="254" cy="88" r="9" fill="#4f8fb0"/><circle cx="232" cy="112" r="9" fill="#d7b451"/><circle cx="254" cy="112" r="9" fill="#e7e2d1"/><circle cx="243" cy="100" r="9" fill="#3f4957"/></g></g>' +
    '<g filter="url(#azSh)" transform="translate(150 156)"><rect x="0" y="0" width="60" height="46" rx="8" fill="#204b5d" stroke="#0e2b38" stroke-width="3"/>' +
    '<g><rect x="8" y="8" width="12" height="12" rx="2" fill="#4f8fb0"/><rect x="24" y="8" width="12" height="12" rx="2" fill="#d7b451"/><rect x="40" y="8" width="12" height="12" rx="2" fill="#c25f57"/><rect x="8" y="24" width="12" height="12" rx="2" fill="#e7e2d1"/><rect x="24" y="24" width="12" height="12" rx="2" fill="#3f4957"/><rect x="40" y="24" width="12" height="12" rx="2" fill="#4f8fb0"/></g></g>' +
    '<g fill="#f4d99b"><circle cx="62" cy="54" r="2"/><path d="M298 168l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ Wingspan ------------------------------ */
  art.wingspan = svg(
    '<defs>' + halo("wgHalo", "#c1b477") +
    '<linearGradient id="wgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#31463d"/><stop offset="1" stop-color="#121d1a"/></linearGradient>' +
    '<filter id="wgSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#wgHalo)"/><circle cx="180" cy="92" r="54" fill="#d9b86e" opacity=".2"/>' +
    '<g filter="url(#wgSh)"><path d="M90 122c28-38 58-54 91-55 22-1 44 5 66 19-20 4-37 12-51 25-17 16-36 27-59 33-17 5-33 5-47-2 8-5 14-11 18-18-7 1-13 0-18-2z" fill="#d9c88e" stroke="#6d5b35" stroke-width="2"/>' +
    '<path d="M128 116c26-17 55-26 86-27-21 7-39 18-54 32-11 10-24 16-39 18 5-7 7-15 7-23z" fill="#8a7b50" opacity=".7"/>' +
    '<path d="M98 126l-23 8 20 2-17 8 25-3" fill="#c98d55"/><circle cx="214" cy="86" r="4" fill="#1c1711"/></g>' +
    '<g filter="url(#wgSh)"><path d="M74 166c28-13 57-17 87-13 30 4 58 2 84-7-15 13-33 21-54 23-27 3-52 0-76-2-15-1-29-1-41 2z" fill="#6b5132" stroke="#3f2f1d" stroke-width="2"/>' +
    '<ellipse cx="150" cy="174" rx="11" ry="14" fill="#e6dcc0" stroke="#8a774e" stroke-width="1.6"/><ellipse cx="176" cy="177" rx="10" ry="13" fill="#d8caa8" stroke="#8a774e" stroke-width="1.6"/></g>' +
    '<g fill="#f4d99b"><circle cx="62" cy="58" r="2"/><circle cx="302" cy="52" r="1.7"/><path d="M293 155l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ Dominion ------------------------------ */
  art.dominion = svg(
    '<defs>' + halo("dmHalo", "#d0a46b") +
    '<filter id="dmSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#dmHalo)"/>' +
    '<g transform="rotate(-12 130 120)" filter="url(#dmSh)"><rect x="76" y="62" width="78" height="116" rx="7" fill="#f4e6c9" stroke="#826039" stroke-width="2"/><rect x="83" y="69" width="64" height="20" rx="3" fill="#6b8e6a"/><path d="M92 104h46M92 116h46M92 128h32M92 140h38" stroke="#b29a73" stroke-width="4" stroke-linecap="round"/></g>' +
    '<g transform="rotate(7 226 118)" filter="url(#dmSh)"><rect x="184" y="54" width="78" height="116" rx="7" fill="#e8d3aa" stroke="#826039" stroke-width="2"/><rect x="191" y="61" width="64" height="20" rx="3" fill="#a95a4a"/><circle cx="223" cy="116" r="24" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><path d="M212 116h22M223 105v22" stroke="#7d5624" stroke-width="3"/></g>' +
    '<g filter="url(#dmSh)"><circle cx="96" cy="170" r="13" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="124" cy="176" r="13" fill="#e8d3aa" stroke="#826039" stroke-width="2"/><circle cx="152" cy="168" r="13" fill="#b8734f" stroke="#6f3e2b" stroke-width="2"/></g>' +
    '<g fill="#f4d99b"><circle cx="64" cy="54" r="2"/><path d="M300 52l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ Terraforming Mars ------------------------------ */
  art["terraforming-mars"] = svg(
    '<defs>' + halo("tmHalo", "#d9825f") +
    '<radialGradient id="tmPlanet" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#d98a5d"/><stop offset=".55" stop-color="#a94f3b"/><stop offset="1" stop-color="#5f2a2a"/></radialGradient>' +
    '<filter id="tmSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#tmHalo)"/>' +
    '<circle cx="178" cy="108" r="72" fill="url(#tmPlanet)" stroke="#4c2021" stroke-width="3" filter="url(#tmSh)"/>' +
    '<g fill="#7a342c" opacity=".7"><ellipse cx="150" cy="82" rx="18" ry="9" transform="rotate(-20 150 82)"/><ellipse cx="206" cy="128" rx="24" ry="11" transform="rotate(18 206 128)"/><ellipse cx="140" cy="142" rx="15" ry="8" transform="rotate(12 140 142)"/></g>' +
    '<g fill="#e8c27c" opacity=".9"><circle cx="154" cy="96" r="5"/><circle cx="190" cy="90" r="4"/><circle cx="204" cy="112" r="6"/><circle cx="160" cy="134" r="4"/><circle cx="188" cy="150" r="5"/></g>' +
    '<g filter="url(#tmSh)"><path d="M128 160a18 18 0 0 1 36 0z" fill="#d9e0d4" stroke="#6e7a68" stroke-width="2"/><path d="M174 164a16 16 0 0 1 32 0z" fill="#d9e0d4" stroke="#6e7a68" stroke-width="2"/><path d="M216 154a14 14 0 0 1 28 0z" fill="#d9e0d4" stroke="#6e7a68" stroke-width="2"/></g>' +
    '<g fill="#f4d99b"><path d="M300 46l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/><circle cx="62" cy="54" r="2"/><circle cx="300" cy="164" r="1.7"/></g>'
  );
  /* ------------------------------ No Thanks ------------------------------ */
  art["no-thanks"] = svg(
    '<defs>' + halo("ntHalo", "#d7a45f") +
    '<filter id="ntSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#ntHalo)"/>' +
    '<g filter="url(#ntSh)" transform="rotate(-9 132 104)"><rect x="90" y="46" width="76" height="108" rx="9" fill="#f4e6c9" stroke="#8a6438" stroke-width="2"/><text x="128" y="86" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="27" fill="#8a4b3a">35</text><circle cx="128" cy="118" r="15" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="128" cy="118" r="5" fill="#8a6438"/></g>' +
    '<g filter="url(#ntSh)" transform="rotate(2 184 96)"><rect x="146" y="38" width="76" height="108" rx="9" fill="#f9edd0" stroke="#8a6438" stroke-width="2"/><text x="184" y="78" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="27" fill="#3e5f4c">12</text><circle cx="184" cy="110" r="15" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="184" cy="110" r="5" fill="#8a6438"/></g>' +
    '<g filter="url(#ntSh)" transform="rotate(11 240 106)"><rect x="202" y="46" width="76" height="108" rx="9" fill="#e8d3aa" stroke="#8a6438" stroke-width="2"/><text x="240" y="86" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="27" fill="#5a3b56">24</text><circle cx="240" cy="118" r="15" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="240" cy="118" r="5" fill="#8a6438"/></g>' +
    '<g filter="url(#ntSh)"><circle cx="108" cy="172" r="13" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="132" cy="176" r="13" fill="#e2b866" stroke="#7d5624" stroke-width="2"/><circle cx="156" cy="172" r="13" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="180" cy="177" r="13" fill="#e2b866" stroke="#7d5624" stroke-width="2"/></g>' +
    '<g fill="#f4d99b"><path d="M300 52l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="60" cy="58" r="2"/></g>'
  );

  /* ------------------------------ Coup ------------------------------ */
  art.coup = svg(
    '<defs>' + halo("cpHalo", "#b9705f") +
    '<linearGradient id="cpVelvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2023"/><stop offset="1" stop-color="#1a0f12"/></linearGradient>' +
    '<filter id="cpSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#cpHalo)"/>' +
    '<rect x="72" y="34" width="216" height="156" rx="18" fill="url(#cpVelvet)" stroke="#6b3b38" stroke-width="2" opacity=".9"/>' +
    '<g filter="url(#cpSh)" transform="rotate(-8 132 112)"><rect x="92" y="55" width="72" height="104" rx="8" fill="#7d3c3a" stroke="#d8a86a" stroke-width="2"/><path d="M128 72l18 30-18 30-18-30z" fill="none" stroke="#e7c58c" stroke-width="2" opacity=".8"/><circle cx="128" cy="102" r="7" fill="#e7c58c"/></g>' +
    '<g filter="url(#cpSh)" transform="rotate(6 232 112)"><rect x="196" y="52" width="72" height="104" rx="8" fill="#5b3540" stroke="#d8a86a" stroke-width="2"/><path d="M232 68l16 28-16 28-16-28z" fill="none" stroke="#e7c58c" stroke-width="2" opacity=".8"/><path d="M222 100h20M232 90v20" stroke="#e7c58c" stroke-width="3"/></g>' +
    '<g filter="url(#cpSh)"><rect x="160" y="140" width="42" height="42" rx="6" fill="#e8d3aa" stroke="#826039" stroke-width="2"/><circle cx="181" cy="161" r="12" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><path d="M175 161h12M181 155v12" stroke="#7d5624" stroke-width="2.4"/></g>' +
    '<path d="M92 62l9-14 2 16z" fill="#f3e6cc"/><path d="M266 160l8-13 2 15z" fill="#f3e6cc"/>' +
    '<g fill="#f4d99b"><circle cx="60" cy="54" r="2"/><path d="M300 168l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ For Sale ------------------------------ */
  art["for-sale"] = svg(
    '<defs>' + halo("fsHalo", "#d9a463") +
    '<filter id="fsSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".44"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#fsHalo)"/>' +
    '<path d="M64 170h232" stroke="#8a6438" stroke-width="3" opacity=".6"/>' +
    '<g filter="url(#fsSh)"><path d="M86 170v-70l26-22 26 22v70z" fill="#e8d3aa" stroke="#7a5730" stroke-width="2"/><path d="M112 78l-26 22h52z" fill="#b85d50"/><rect x="103" y="132" width="18" height="38" fill="#7d3c36"/><rect x="94" y="94" width="12" height="14" fill="#7fa0a8"/><rect x="118" y="94" width="12" height="14" fill="#7fa0a8"/></g>' +
    '<g filter="url(#fsSh)"><path d="M152 170v-54l22-18 22 18v54z" fill="#f2e2c3" stroke="#7a5730" stroke-width="2"/><path d="M174 98l-22 18h44z" fill="#5d8e83"/><rect x="165" y="138" width="18" height="32" fill="#3f6b62"/><rect x="158" y="110" width="12" height="12" fill="#7fa0a8"/></g>' +
    '<g filter="url(#fsSh)"><path d="M208 170v-86l30-26 30 26v86z" fill="#e8d3aa" stroke="#7a5730" stroke-width="2"/><path d="M238 58l-30 26h60z" fill="#c9a45c"/><rect x="228" y="126" width="20" height="44" fill="#7d3c36"/><rect x="216" y="94" width="14" height="16" fill="#7fa0a8"/><rect x="246" y="94" width="14" height="16" fill="#7fa0a8"/></g>' +
    '<g filter="url(#fsSh)"><rect x="78" y="118" width="42" height="26" rx="5" fill="#f9edd0" stroke="#826039" stroke-width="2"/><text x="99" y="137" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="#8a4b3a">18</text>' +
    '<circle cx="286" cy="146" r="14" fill="#d6a94f" stroke="#7d5624" stroke-width="2"/><circle cx="286" cy="146" r="4.6" fill="#8a6438"/><circle cx="286" cy="120" r="14" fill="#e2b866" stroke="#7d5624" stroke-width="2"/><circle cx="286" cy="120" r="4.6" fill="#8a6438"/></g>' +
    '<g fill="#f4d99b"><path d="M300 48l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="58" cy="56" r="2"/></g>'
  );

  /* ------------------------------ Skull ------------------------------ */
  art.skull = svg(
    '<defs>' + halo("skHalo", "#b08a6e") +
    '<filter id="skSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".48"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#skHalo)"/>' +
    '<g filter="url(#skSh)"><circle cx="130" cy="118" r="48" fill="#3d4a44" stroke="#17211f" stroke-width="3"/><circle cx="130" cy="118" r="38" fill="none" stroke="#7fa08c" stroke-width="2" opacity=".6"/>' +
    '<g fill="#e7d9c4"><path d="M130 88c17 0 29 11 29 25 0 9-5 15-11 19l-2 12h-32l-2-12c-6-4-11-10-11-19 0-14 12-25 29-25z"/><circle cx="119" cy="112" r="6" fill="#3d4a44"/><circle cx="141" cy="112" r="6" fill="#3d4a44"/><path d="M126 126h8l-4 7z" fill="#3d4a44"/><path d="M121 136h18M123 142h14" stroke="#3d4a44" stroke-width="2"/></g></g>' +
    '<g filter="url(#skSh)"><circle cx="232" cy="94" r="38" fill="#4a3b46" stroke="#221820" stroke-width="3"/><g fill="#e3b9c4"><circle cx="232" cy="94" r="8"/><circle cx="232" cy="76" r="7"/><circle cx="248" cy="86" r="7"/><circle cx="248" cy="103" r="7"/><circle cx="232" cy="112" r="7"/><circle cx="216" cy="103" r="7"/><circle cx="216" cy="86" r="7"/></g><circle cx="232" cy="94" r="4" fill="#8a5f3d"/></g>' +
    '<g filter="url(#skSh)"><circle cx="204" cy="168" r="22" fill="#5b4a3d" stroke="#241a16" stroke-width="2"/><circle cx="204" cy="168" r="14" fill="none" stroke="#c9a45c" stroke-width="2" opacity=".7"/><path d="M198 168h12M204 162v12" stroke="#c9a45c" stroke-width="2.4"/></g>' +
    '<g fill="#f4d99b"><circle cx="62" cy="52" r="2"/><path d="M302 46l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ King of Tokyo ------------------------------ */
  art["king-of-tokyo"] = svg(
    '<defs>' + halo("ktHalo", "#d06a58") +
    '<linearGradient id="ktSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#402832"/><stop offset="1" stop-color="#150f19"/></linearGradient>' +
    '<filter id="ktSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#ktHalo)"/>' +
    '<rect x="58" y="34" width="244" height="168" rx="16" fill="url(#ktSky)" stroke="#6e3a3a" stroke-width="2"/>' +
    '<g fill="#2c2333" stroke="#4a3a4d" stroke-width="1.4"><rect x="74" y="92" width="34" height="110"/><rect x="116" y="66" width="28" height="136"/><rect x="152" y="104" width="40" height="98"/><rect x="200" y="76" width="32" height="126"/><rect x="240" y="96" width="42" height="106"/></g>' +
    '<g fill="#e7c58c" opacity=".8"><rect x="82" y="102" width="6" height="6"/><rect x="94" y="114" width="6" height="6"/><rect x="124" y="78" width="6" height="6"/><rect x="134" y="94" width="6" height="6"/><rect x="210" y="88" width="6" height="6"/><rect x="220" y="106" width="6" height="6"/><rect x="250" y="110" width="6" height="6"/><rect x="262" y="126" width="6" height="6"/></g>' +
    '<g filter="url(#ktSh)"><path d="M138 196c-4-22 4-42 20-50 4-12 10-20 18-24 2 10 6 16 12 20 10 4 18 14 20 28 2 10 2 18 0 26z" fill="#6f9b6e" stroke="#2f4a38" stroke-width="2"/><path d="M156 146l-8-16 16 8M176 130l14-12-2 18" fill="#6f9b6e" stroke="#2f4a38" stroke-width="2"/><circle cx="164" cy="160" r="4" fill="#ffe08a"/><circle cx="184" cy="156" r="4" fill="#ffe08a"/><path d="M164 176c6 5 14 5 20 0" stroke="#2f4a38" stroke-width="2.4" fill="none"/></g>' +
    '<g filter="url(#ktSh)" transform="rotate(-10 236 174)"><rect x="222" y="158" width="32" height="32" rx="7" fill="#f4e6c9" stroke="#826039" stroke-width="2"/><circle cx="238" cy="174" r="3.2" fill="#8a4b3a"/><circle cx="230" cy="166" r="3.2" fill="#8a4b3a"/><circle cx="246" cy="182" r="3.2" fill="#8a4b3a"/></g>' +
    '<path d="M92 56l6-16 4 18 8-14 2 18" stroke="#ffe08a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<g fill="#f4d99b"><circle cx="300" cy="52" r="2"/><path d="M58 166l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ Codenames ------------------------------ */
  art.codenames = svg(
    '<defs>' + halo("cnHalo", "#d08a72") +
    '<filter id="cnSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#cnHalo)"/>' +
    '<g transform="rotate(-3 180 110)" filter="url(#cnSh)"><rect x="70" y="26" width="220" height="184" rx="14" fill="#25343a" stroke="#101c21" stroke-width="3"/>' +
    '<g stroke="#0f1a1f" stroke-width="2">' +
    '<rect x="82" y="38" width="38" height="30" rx="4" fill="#c77c64"/><rect x="126" y="38" width="38" height="30" rx="4" fill="#e7e2d1"/><rect x="170" y="38" width="38" height="30" rx="4" fill="#5d8e83"/><rect x="214" y="38" width="38" height="30" rx="4" fill="#e7e2d1"/><rect x="258" y="38" width="26" height="30" rx="4" fill="#25343a"/>' +
    '<rect x="82" y="74" width="38" height="30" rx="4" fill="#5d8e83"/><rect x="126" y="74" width="38" height="30" rx="4" fill="#25343a"/><rect x="170" y="74" width="38" height="30" rx="4" fill="#1a141f"/><rect x="214" y="74" width="38" height="30" rx="4" fill="#c77c64"/><rect x="258" y="74" width="26" height="30" rx="4" fill="#e7e2d1"/>' +
    '<rect x="82" y="110" width="38" height="30" rx="4" fill="#e7e2d1"/><rect x="126" y="110" width="38" height="30" rx="4" fill="#c77c64"/><rect x="170" y="110" width="38" height="30" rx="4" fill="#e7e2d1"/><rect x="214" y="110" width="38" height="30" rx="4" fill="#5d8e83"/><rect x="258" y="110" width="26" height="30" rx="4" fill="#c77c64"/>' +
    '<rect x="82" y="146" width="38" height="30" rx="4" fill="#25343a"/><rect x="126" y="146" width="38" height="30" rx="4" fill="#5d8e83"/><rect x="170" y="146" width="38" height="30" rx="4" fill="#c77c64"/><rect x="214" y="146" width="38" height="30" rx="4" fill="#e7e2d1"/><rect x="258" y="146" width="26" height="30" rx="4" fill="#5d8e83"/>' +
    '<rect x="82" y="182" width="38" height="20" rx="4" fill="#c77c64"/><rect x="126" y="182" width="38" height="20" rx="4" fill="#e7e2d1"/><rect x="170" y="182" width="38" height="20" rx="4" fill="#25343a"/><rect x="214" y="182" width="38" height="20" rx="4" fill="#5d8e83"/><rect x="258" y="182" width="26" height="20" rx="4" fill="#e7e2d1"/></g>' +
    '<g stroke="#b9aa8d" stroke-width="2.2" stroke-linecap="round" opacity=".55"><path d="M90 53h22M134 53h22M178 53h22M222 53h22M90 89h22M178 89h22M222 89h22M90 125h22M134 125h22M178 125h22M222 125h22M134 161h22M178 161h22M90 197h22M134 197h22M178 197h22M222 197h22"/></g></g>' +
    '<g filter="url(#cnSh)"><rect x="250" y="158" width="54" height="38" rx="7" fill="#f4e6c9" stroke="#826039" stroke-width="2"/><text x="277" y="176" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="15" fill="#8a4b3a">3</text><path d="M262 186h30" stroke="#b59b78" stroke-width="2.4"/></g>' +
    '<g fill="#f4d99b"><circle cx="56" cy="52" r="2"/><path d="M302 62l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>'
  );

  /* ------------------------------ Takenoko ------------------------------ */
  art.takenoko = svg(
    '<defs>' + halo("tkHalo", "#7ca878") +
    '<filter id="tkSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".44"/></filter>' +
    '</defs><circle cx="180" cy="104" r="96" fill="url(#tkHalo)"/>' +
    '<g transform="rotate(-4 180 118)" filter="url(#tkSh)">' +
    '<path d="M96 152l18-31h36l18 31-18 31h-36z" fill="#7fa56f" stroke="#3f5c39" stroke-width="2"/>' +
    '<path d="M168 152l18-31h36l18 31-18 31h-36z" fill="#d2b46c" stroke="#6e5830" stroke-width="2"/>' +
    '<path d="M132 100l18-31h36l18 31-18 31h-36z" fill="#d18b72" stroke="#6b3f33" stroke-width="2"/>' +
    '<path d="M222 100l18-31h36l18 31-18 31h-36z" fill="#7fa56f" stroke="#3f5c39" stroke-width="2"/></g>' +
    '<g stroke-linecap="round" filter="url(#tkSh)"><path d="M148 141v-42" stroke="#4f7d45" stroke-width="6"/><path d="M169 141v-30" stroke="#5d9151" stroke-width="6"/><path d="M126 147v-26" stroke="#6ba05c" stroke-width="6"/><path d="M148 120h12M148 132h-12M169 124h11M126 132h-10" stroke="#7fb46c" stroke-width="4"/></g>' +
    '<g filter="url(#tkSh)"><circle cx="252" cy="112" r="30" fill="#f0ece0" stroke="#9a8a72" stroke-width="2"/><circle cx="242" cy="107" r="7" fill="#2a2622"/><circle cx="262" cy="107" r="7" fill="#2a2622"/><circle cx="252" cy="120" r="4" fill="#2a2622"/><circle cx="238" cy="122" r="5" fill="#c98d7a" opacity=".55"/><circle cx="266" cy="122" r="5" fill="#c98d7a" opacity=".55"/><path d="M246 130c4 4 8 4 12 0" stroke="#2a2622" stroke-width="2.2" fill="none"/></g>' +
    '<g fill="#f4d99b"><path d="M64 54l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/><circle cx="300" cy="166" r="2"/></g>'
  );
})();
