/* ==========================================================================
   ألعاب الطاولة — رسومات مكتبة الألعاب
   لكل لعبة مشهد SVG مستقل برموزها المميزة، مع عناصر قابلة للتحريك بالـ CSS.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  if (!BG) return;

  const svg = (inner) =>
    '<svg class="la" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + inner + "</svg>";

  const art = (BG.libraryArt = {});

  /* ------------------------------ الشطرنج ------------------------------ */
  art.chess = svg(`
    <defs>
      <radialGradient id="chHalo" cx="50%" cy="42%" r="60%">
        <stop offset="0" stop-color="#f0cf8d" stop-opacity=".38"/>
        <stop offset=".65" stop-color="#b98746" stop-opacity=".12"/>
        <stop offset="1" stop-color="#b98746" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="chIvory" x1="0" y1="0" x2=".9" y2="1">
        <stop offset="0" stop-color="#fff8e6"/>
        <stop offset=".55" stop-color="#ead9b7"/>
        <stop offset="1" stop-color="#c9ae81"/>
      </linearGradient>
      <linearGradient id="chGold" x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="#f8dfa4"/>
        <stop offset=".55" stop-color="#d4a559"/>
        <stop offset="1" stop-color="#9a682c"/>
      </linearGradient>
      <linearGradient id="chFloor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a1c12"/>
        <stop offset="1" stop-color="#120b08"/>
      </linearGradient>
      <filter id="chShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="105" r="96" fill="url(#chHalo)"/>
    <g fill="none" stroke="#e8c27c" opacity=".2">
      <circle cx="180" cy="105" r="82" stroke-dasharray="2 8"/>
      <path d="M98 86c12-38 46-62 82-62s70 24 82 62" stroke-dasharray="1 7"/>
    </g>
    <g opacity=".9">
      <path d="M64 196h232l42 24H22Z" fill="url(#chFloor)"/>
      <g stroke="#0b0705" stroke-width="5" opacity=".75">
        <path d="M78 196h30l6 24h-36zM126 196h30l3 24h-30zM174 196h30v24h-30zM222 196h30l-3 24h-30zM270 196h30l-6 24h-30z"/>
      </g>
      <path d="M64 196h232" stroke="#c49a5c" stroke-width="2" opacity=".6"/>
    </g>
    <g transform="translate(142 36) scale(.92)" filter="url(#chShadow)" class="la-float">
      <path d="M18 156c-6-30 2-56 22-78 10-11 13-21 8-31-4-8-14-10-21-4l-19 18-17-6 12-20C20 13 43 3 64-8c12-6 19-16 23-30 3-10 10-14 18-11 6 2 8 8 6 16-3 14 0 24 10 33 25 20 36 46 34 78-2 26-10 50-26 72Z" fill="url(#chIvory)" stroke="#6b4d2c" stroke-width="2.4"/>
      <path d="M85 6c-10 12-14 24-10 38M104 10c-7 12-9 24-4 36M70 -22c6-2 12-1 16 3" fill="none" stroke="#b39465" stroke-width="2.2"/>
      <path d="M49 84c9-3 18 0 24 7" fill="none" stroke="#b39465" stroke-width="2"/>
      <circle cx="87" cy="52" r="3.4" fill="#2a1b12"/>
      <path d="M102 70c5 5 7 12 5 18" fill="none" stroke="#8f7047" stroke-width="2"/>
    </g>
    <g transform="translate(258 84)" filter="url(#chShadow)" class="la-float-slow">
      <path d="M-27 92h54l-5-12h-44z" fill="url(#chGold)" stroke="#6d4a1c" stroke-width="1.6"/>
      <path d="M-21 80V33h42v47" fill="url(#chGold)" stroke="#6d4a1c" stroke-width="1.6"/>
      <path d="M-26 33c0-8 7-14 15-14h22c8 0 15 6 15 14Z" fill="url(#chGold)" stroke="#6d4a1c" stroke-width="1.6"/>
      <path d="M-15 19h30l-4-19h-22z" fill="url(#chGold)" stroke="#6d4a1c" stroke-width="1.6"/>
      <path d="M-4 0h8v-13h-8zM-10-7h20" fill="none" stroke="#f6dda4" stroke-width="2.4"/>
      <path d="M-6 52h12v16h-12z" fill="#8d5f24" opacity=".55"/>
    </g>
    <g transform="translate(64 176)" filter="url(#chShadow)">
      <path d="M-13 26h26l-3-7h-20z" fill="url(#chIvory)" stroke="#6b4d2c" stroke-width="1.2"/>
      <path d="M-9 19V0h18v19" fill="url(#chIvory)" stroke="#6b4d2c" stroke-width="1.2"/>
      <circle cx="0" cy="-7" r="9" fill="url(#chIvory)" stroke="#6b4d2c" stroke-width="1.2"/>
    </g>
    <g class="la-spark" fill="#f4d99b">
      <path d="M292 54l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/>
      <circle cx="70" cy="58" r="2"/>
      <circle cx="314" cy="144" r="1.6"/>
    </g>
  `);

  /* ------------------------------ مونوبولي ------------------------------ */
  art.monopoly = svg(`
    <defs>
      <radialGradient id="moHalo" cx="50%" cy="46%" r="62%">
        <stop offset="0" stop-color="#f2ce84" stop-opacity=".34"/>
        <stop offset="1" stop-color="#b57b32" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="moHat" x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="#3a2a20"/>
        <stop offset=".6" stop-color="#1b120d"/>
        <stop offset="1" stop-color="#090605"/>
      </linearGradient>
      <linearGradient id="moCream" x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="#fbf1da"/>
        <stop offset="1" stop-color="#dcc59b"/>
      </linearGradient>
      <linearGradient id="moGold" x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="#f6d896"/>
        <stop offset="1" stop-color="#a9762f"/>
      </linearGradient>
      <filter id="moShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="105" r="96" fill="url(#moHalo)"/>
    <g transform="rotate(-13 150 104)" filter="url(#moShadow)">
      <rect x="104" y="36" width="82" height="118" rx="7" fill="url(#moCream)" stroke="#9c7b48" stroke-width="1.4"/>
      <rect x="111" y="43" width="68" height="18" rx="3" fill="#8f3a35"/>
      <path d="M115 76h60M115 88h46M115 100h56M115 112h34" stroke="#a68d67" stroke-width="3" stroke-linecap="round"/>
      <circle cx="146" cy="132" r="8" fill="none" stroke="#b58f4d" stroke-width="2"/>
    </g>
    <g transform="rotate(8 226 94)" filter="url(#moShadow)">
      <rect x="184" y="30" width="82" height="118" rx="7" fill="#f4e7cc" stroke="#9c7b48" stroke-width="1.4"/>
      <rect x="191" y="37" width="68" height="18" rx="3" fill="#3e6b58"/>
      <path d="M195 70h60M195 82h44M195 94h56" stroke="#b09a75" stroke-width="3" stroke-linecap="round"/>
      <path d="M214 128l6-17 6 17z" fill="#a9762f"/>
    </g>
    <g class="la-float" filter="url(#moShadow)">
      <ellipse cx="152" cy="152" rx="58" ry="16" fill="url(#moHat)" stroke="#5c4426" stroke-width="1.6"/>
      <path d="M116 148c-2-26-1-48 5-62 5-12 18-17 30-12 13 5 21 19 24 37 3 17 3 31 1 39z" fill="url(#moHat)" stroke="#5c4426" stroke-width="1.6"/>
      <path d="M118 127c20 7 44 7 58-1l1 12c-18 8-41 8-59 0z" fill="url(#moGold)"/>
      <path d="M127 104c14 4 30 4 42-1" fill="none" stroke="#5c4426" stroke-width="1.4" opacity=".7"/>
    </g>
    <g transform="translate(264 138)" filter="url(#moShadow)" class="la-float-slow">
      <path d="M-34 48h68l-5-8h-58z" fill="#c9a15d"/>
      <rect x="-28" y="-22" width="56" height="64" rx="4" fill="#ecd6ad" stroke="#8f6b38" stroke-width="1.6"/>
      <path d="M-28 -22 0-43 28-22Z" fill="#8f3a35" stroke="#6d2a27" stroke-width="1.4"/>
      <g fill="#a9762f"><rect x="-18" y="-10" width="10" height="12" rx="1"/><rect x="2" y="-10" width="10" height="12" rx="1"/><rect x="-18" y="12" width="10" height="12" rx="1"/><rect x="2" y="12" width="10" height="12" rx="1"/></g>
      <rect x="-8" y="20" width="16" height="22" rx="2" fill="#5d3b22"/>
    </g>
    <g transform="translate(292 66) rotate(-9)" filter="url(#moShadow)">
      <rect x="-22" y="-22" width="44" height="44" rx="8" fill="url(#moCream)" stroke="#9c7b48" stroke-width="1.4"/>
      <g fill="#3a2416"><circle cx="-10" cy="-10" r="3"/><circle cx="10" cy="-10" r="3"/><circle cx="0" cy="0" r="3"/><circle cx="-10" cy="10" r="3"/><circle cx="10" cy="10" r="3"/></g>
    </g>
    <g transform="translate(58 170)" fill="url(#moGold)" stroke="#7c5622" stroke-width="1">
      <ellipse cx="0" cy="8" rx="20" ry="7"/>
      <ellipse cx="0" cy="0" rx="20" ry="7"/>
      <ellipse cx="-9" cy="16" rx="17" ry="6"/>
      <ellipse cx="-9" cy="9" rx="17" ry="6"/>
    </g>
    <g class="la-spark" fill="#f7dda0">
      <path d="M67 56l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>
      <circle cx="312" cy="120" r="2"/>
    </g>
  `);

  /* ------------------------------ كاتان ------------------------------ */
  art.catan = svg(`
    <defs>
      <radialGradient id="caHalo" cx="50%" cy="44%" r="64%">
        <stop offset="0" stop-color="#f3cf82" stop-opacity=".36"/>
        <stop offset="1" stop-color="#ac7430" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="caWheat" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d9ae55"/>
        <stop offset="1" stop-color="#a06d2d"/>
      </linearGradient>
      <linearGradient id="caForest" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#39604a"/>
        <stop offset="1" stop-color="#1d3b2e"/>
      </linearGradient>
      <linearGradient id="caClay" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a9523b"/>
        <stop offset="1" stop-color="#6d2d24"/>
      </linearGradient>
      <linearGradient id="caPasture" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8ea05f"/>
        <stop offset="1" stop-color="#5b703d"/>
      </linearGradient>
      <filter id="caShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#caHalo)"/>
    <g class="la-spin" transform-origin="286 58">
      <circle cx="286" cy="58" r="19" fill="#e7bd68" opacity=".92"/>
      <g stroke="#e7bd68" stroke-width="2.4" stroke-linecap="round" opacity=".7">
        <path d="M286 24v-10M286 92v10M252 58h-10M320 58h10M262 34l-7-7M310 82l7 7M310 34l7-7M262 82l-7 7"/>
      </g>
    </g>
    <g filter="url(#caShadow)">
      <g transform="translate(180 72)">
        <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="url(#caPasture)" stroke="#e9d6a8" stroke-width="2"/>
        <path d="M-19 7c2-11 10-17 19-17s17 6 19 17c-6 3-13 4-19 4s-13-1-19-4z" fill="#f5ead0"/>
        <circle cx="10" cy="1" r="8" fill="#3d4a32"/>
        <path d="M0 9c4 4 9 5 14 3M-9 9c-3 3-6 4-9 4" fill="none" stroke="#3d4a32" stroke-width="3" stroke-linecap="round"/>
      </g>
      <g transform="translate(147 128)">
        <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="url(#caWheat)" stroke="#efdcb0" stroke-width="2"/>
        <g stroke="#f5e4b9" stroke-width="2.6" stroke-linecap="round">
          <path d="M0 22V-12M0 8l-8-7M0 2l8-7M0 -4l-8-7M0 -10l8-7"/>
        </g>
      </g>
      <g transform="translate(213 128)">
        <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="url(#caClay)" stroke="#efdcb0" stroke-width="2"/>
        <path d="M-9 19 0-15 9 19Z" fill="#e8c67c"/>
        <path d="M-13 20h26" stroke="#f5e4b9" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      <g transform="translate(180 72)">
        <path d="M-33 19 0 38l33-19" fill="none" stroke="#d8b573" stroke-width="3"/>
      </g>
    </g>
    <g transform="translate(80 132)" filter="url(#caShadow)" class="la-sway">
      <circle cx="0" cy="-7" r="18" fill="#f4ead4"/>
      <circle cx="0" cy="-7" r="18" fill="none" stroke="#b99a68" stroke-width="1.5"/>
      <path d="M-12 -16c-3-8 1-15 8-18 1 7-1 13-8 18zM10 -16c4-7 1-14-5-18-2 7 0 13 5 18z" fill="#3f5237"/>
      <path d="M-9 2v15M9 2v15" stroke="#54402c" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-11" cy="20" r="4" fill="#3f5237"/><circle cx="11" cy="20" r="4" fill="#3f5237"/>
    </g>
    <g transform="translate(286 152)">
      <rect x="-4" y="0" width="8" height="26" rx="2" fill="#6b4a2b"/>
      <path d="M-20 6 0-26 20 6Z" fill="url(#caForest)"/>
      <path d="M-16 18 0-8 16 18Z" fill="#3c664f"/>
    </g>
    <g fill="#f2d59a" class="la-spark">
      <circle cx="66" cy="62" r="2"/><circle cx="310" cy="106" r="1.6"/><circle cx="96" cy="181" r="1.4"/>
    </g>
  `);

  /* ------------------------------ تيكيت تو رايد ------------------------------ */
  art["ticket-to-ride"] = svg(`
    <defs>
      <radialGradient id="ttHalo" cx="50%" cy="46%" r="64%">
        <stop offset="0" stop-color="#e0a06b" stop-opacity=".32"/>
        <stop offset="1" stop-color="#8f4b31" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ttSea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1c3d45"/>
        <stop offset="1" stop-color="#0c1d23"/>
      </linearGradient>
      <linearGradient id="ttHull" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5f2f2a"/>
        <stop offset="1" stop-color="#2a1512"/>
      </linearGradient>
      <linearGradient id="ttCream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fbf0d9"/>
        <stop offset="1" stop-color="#cfb994"/>
      </linearGradient>
      <filter id="ttShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="102" r="98" fill="url(#ttHalo)"/>
    <g opacity=".8">
      <path d="M34 64c50-22 92-25 142-14" fill="none" stroke="#d9b071" stroke-width="2" stroke-dasharray="5 7"/>
      <circle cx="34" cy="64" r="5" fill="#e8c27c"/><circle cx="176" cy="50" r="5" fill="#e8c27c"/>
      <path d="M176 50c60 8 100 18 150 8" fill="none" stroke="#d9b071" stroke-width="2" stroke-dasharray="5 7" opacity=".5"/>
    </g>
    <g transform="rotate(-6 88 54)" filter="url(#ttShadow)">
      <rect x="42" y="30" width="92" height="52" rx="6" fill="#f7ebd2" stroke="#a98756" stroke-width="1.2"/>
      <path d="M52 44h50M52 54h34M52 64h44" stroke="#b29a76" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M116 38v36M108 42v28" stroke="#c2a16f" stroke-width="2" stroke-dasharray="2 4"/>
      <circle cx="120" cy="36" r="3" fill="#a45a43"/>
    </g>
    <g class="la-float" filter="url(#ttShadow)">
      <path d="M74 142h208l-22 32c-7 10-18 16-31 16h-94c-13 0-24-6-31-16z" fill="url(#ttHull)" stroke="#d3aa6d" stroke-width="1.6"/>
      <path d="M96 138h162v-34H96z" fill="url(#ttCream)" stroke="#a98756" stroke-width="1.4"/>
      <path d="M112 104h48V86h-48z" fill="url(#ttCream)" stroke="#a98756" stroke-width="1.4"/>
      <rect x="128" y="82" width="16" height="18" rx="2" fill="url(#ttCream)" stroke="#a98756" stroke-width="1.2"/>
      <g>
        <rect x="150" y="86" width="20" height="38" rx="3" fill="#3b211c"/>
        <rect x="150" y="86" width="20" height="10" rx="3" fill="#a84636"/>
        <rect x="154" y="80" width="12" height="8" rx="2" fill="#2a1512"/>
        <rect x="198" y="92" width="20" height="32" rx="3" fill="#3b211c"/>
        <rect x="198" y="92" width="20" height="9" rx="3" fill="#a84636"/>
        <rect x="202" y="86" width="12" height="8" rx="2" fill="#2a1512"/>
      </g>
      <g fill="#e8c27c">
        <circle cx="116" cy="120" r="4"/><circle cx="136" cy="120" r="4"/><circle cx="156" cy="120" r="4"/><circle cx="176" cy="120" r="4"/><circle cx="196" cy="120" r="4"/><circle cx="216" cy="120" r="4"/><circle cx="236" cy="120" r="4"/>
      </g>
      <g fill="none" stroke="#c9a467" stroke-width="2">
        <path d="M104 136h146M120 146h114"/>
      </g>
      <path d="M64 176c22 8 46 8 68 0M180 176c24 6 48 6 72 0" fill="none" stroke="#e8c27c" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    </g>
    <g fill="none" stroke="#d9b071" opacity=".45" stroke-linecap="round">
      <path d="M44 154c26 8 50 8 76 0M240 156c22 6 42 6 64 0" stroke-width="2.4"/>
      <path d="M58 166c22 6 42 6 64 0" stroke-width="1.6"/>
    </g>
    <g class="la-spark" fill="#f4d99b">
      <circle cx="304" cy="46" r="2"/><circle cx="66" cy="96" r="1.6"/>
      <path d="M312 158l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/>
    </g>
  `);

  /* ------------------------------ كاركاسون ------------------------------ */
  art.carcassonne = svg(`
    <defs>
      <radialGradient id="ccHalo" cx="50%" cy="42%" r="64%">
        <stop offset="0" stop-color="#f0cf87" stop-opacity=".36"/>
        <stop offset="1" stop-color="#a87934" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ccStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e6d3ad"/>
        <stop offset="1" stop-color="#b19668"/>
      </linearGradient>
      <linearGradient id="ccRoof" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a84e3e"/>
        <stop offset="1" stop-color="#642b25"/>
      </linearGradient>
      <linearGradient id="ccHill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a6848"/>
        <stop offset="1" stop-color="#24371f"/>
      </linearGradient>
      <filter id="ccShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="102" r="98" fill="url(#ccHalo)"/>
    <path d="M18 190c42-30 78-36 132-26 44 8 80 4 118-14 26-12 50-8 74 8v52H18Z" fill="url(#ccHill)"/>
    <path d="M24 198c46-22 96-26 144-16 40 8 72 6 108-10" fill="none" stroke="#7e9663" stroke-width="2" opacity=".55"/>
    <g filter="url(#ccShadow)" class="la-float-slow">
      <path d="M94 172v-40h160v40" fill="url(#ccStone)" stroke="#70552f" stroke-width="2"/>
      <g fill="url(#ccStone)" stroke="#70552f" stroke-width="1.6">
        <path d="M96 132v-11h10v11zM116 132v-11h10v11zM136 132v-11h10v11zM156 132v-11h10v11zM176 132v-11h10v11zM196 132v-11h10v11zM216 132v-11h10v11zM236 132v-11h10v11z"/>
      </g>
      <path d="M158 172v-30c0-8 7-14 15-14s15 6 15 14v30" fill="#5f4529"/>
      <path d="M158 148c10-7 20-7 30 0v6h-30z" fill="#caa66b"/>
      <g fill="#3a2718" opacity=".5"><path d="M112 150h12v7h-12zM130 163h9v6h-9zM206 148h14v7h-14zM228 160h9v6h-9z"/></g>
      <g>
        <rect x="74" y="90" width="34" height="82" rx="2" fill="url(#ccStone)" stroke="#70552f" stroke-width="2"/>
        <path d="M69 92 91 46l22 46Z" fill="url(#ccRoof)" stroke="#57251f" stroke-width="1.6"/>
        <path d="M91 46v-16" stroke="#5d4429" stroke-width="2"/>
        <path d="M91 30h22l-7 7 7 7H91Z" fill="#a84636"/>
        <path d="M82 124h18v20H82z" fill="#4a3320"/>
      </g>
      <g>
        <rect x="240" y="98" width="34" height="74" rx="2" fill="url(#ccStone)" stroke="#70552f" stroke-width="2"/>
        <path d="M235 100 257 58l22 42Z" fill="url(#ccRoof)" stroke="#57251f" stroke-width="1.6"/>
        <path d="M250 126h14v16h-14z" fill="#4a3320"/>
      </g>
      <g>
        <rect x="148" y="58" width="64" height="52" rx="2" fill="url(#ccStone)" stroke="#70552f" stroke-width="2"/>
        <path d="M142 60 180 18l38 42Z" fill="url(#ccRoof)" stroke="#57251f" stroke-width="1.8"/>
        <path d="M180 18v-14" stroke="#5d4429" stroke-width="2"/>
        <path d="M180 4l26 2-8 6 8 6-26 2Z" fill="#b85b45"/>
        <circle cx="180" cy="78" r="9" fill="#e7c278" stroke="#70552f" stroke-width="2"/>
      </g>
    </g>
    <g transform="translate(56 142)" filter="url(#ccShadow)" class="la-float">
      <path d="M0 -26c8 0 13 6 13 13 0 6-3 9-3 14l10 9c3 3 5 8 5 13v13H-25V23c0-5 2-10 5-13l10-9c0-5-3-8-3-14 0-7 5-13 13-13Z" fill="#3f6a62" stroke="#1d3a35" stroke-width="2"/>
      <circle cx="0" cy="-9" r="4" fill="#cfe3d6"/>
    </g>
    <g fill="#dcc08a" opacity=".7">
      <circle cx="304" cy="54" r="2"/><circle cx="48" cy="72" r="1.6"/>
      <path d="M314 92l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z"/>
    </g>
  `);

  /* ------------------------------ ريسك ------------------------------ */
  art.risk = svg(`
    <defs>
      <radialGradient id="riHalo" cx="48%" cy="44%" r="64%">
        <stop offset="0" stop-color="#db8c62" stop-opacity=".32"/>
        <stop offset="1" stop-color="#7c3426" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="riGlobe" cx="38%" cy="32%" r="76%">
        <stop offset="0" stop-color="#3c6770"/>
        <stop offset=".6" stop-color="#1b3b44"/>
        <stop offset="1" stop-color="#0b1d24"/>
      </radialGradient>
      <linearGradient id="riLand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b39a5f"/>
        <stop offset="1" stop-color="#667141"/>
      </linearGradient>
      <linearGradient id="riIron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5c4b41"/>
        <stop offset=".55" stop-color="#2b211d"/>
        <stop offset="1" stop-color="#120d0b"/>
      </linearGradient>
      <clipPath id="riClip"><circle cx="176" cy="100" r="64"/></clipPath>
      <filter id="riShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="102" r="98" fill="url(#riHalo)"/>
    <g filter="url(#riShadow)" class="la-float-slow">
      <circle cx="176" cy="100" r="64" fill="url(#riGlobe)" stroke="#c69c5e" stroke-width="2"/>
      <g clip-path="url(#riClip)">
        <path d="M116 92c8-14 20-18 34-15 12 2 16 10 12 19-5 11-18 14-30 10-10-4-18-6-16-14z" fill="url(#riLand)"/>
        <path d="M174 48c12-6 28-2 34 8 5 9-2 16-12 17-12 1-20-6-24-14-2-5-1-9 2-11z" fill="#8b9257"/>
        <path d="M190 108c14-4 30 2 36 15 5 11-2 22-15 25-12 3-23-4-27-15-3-9 0-21 6-25z" fill="url(#riLand)"/>
        <path d="M130 126c8-2 15 3 16 12 1 8-4 15-12 15-9 0-14-6-14-14 0-6 4-11 10-13z" fill="#7d854e"/>
      </g>
      <g fill="none" stroke="#e8c27c" opacity=".42">
        <ellipse cx="176" cy="100" rx="64" ry="24"/>
        <ellipse cx="176" cy="100" rx="42" ry="64"/>
        <path d="M112 100h128M176 36v128"/>
      </g>
      <circle cx="176" cy="100" r="64" fill="none" stroke="#e8c27c" stroke-width="1.6" opacity=".65"/>
      <g transform="translate(204 40)">
        <path d="M0 0v-24" stroke="#d6b06e" stroke-width="2"/>
        <path d="M0 -24h22l-6 8 6 8H0Z" fill="#a84636" stroke="#6e2a22" stroke-width="1.2"/>
      </g>
    </g>
    <g transform="translate(58 166)" filter="url(#riShadow)" class="la-recoil">
      <circle cx="14" cy="24" r="15" fill="url(#riIron)" stroke="#7c5a3b" stroke-width="2"/>
      <circle cx="44" cy="24" r="15" fill="url(#riIron)" stroke="#7c5a3b" stroke-width="2"/>
      <g stroke="#d0a969" stroke-width="2"><path d="M14 24h30M24 10v28M34 10v28"/></g>
      <path d="M20 12 70 -6l10 18-48 18z" fill="url(#riIron)" stroke="#8c6a45" stroke-width="1.6"/>
      <path d="M68 -8h34v20H66z" fill="url(#riIron)" stroke="#8c6a45" stroke-width="1.6"/>
      <path d="M100 -5h10v14h-10z" fill="#3a2b22"/>
      <circle cx="44" cy="38" r="2.2" fill="#c9a15d"/><circle cx="24" cy="38" r="2.2" fill="#c9a15d"/>
    </g>
    <g transform="translate(282 156) rotate(8)" filter="url(#riShadow)">
      <rect x="-24" y="-24" width="48" height="48" rx="8" fill="#f1dfbd" stroke="#96713d" stroke-width="1.4"/>
      <g fill="#3b2818"><circle cx="-11" cy="-11" r="3.2"/><circle cx="11" cy="-11" r="3.2"/><circle cx="0" cy="0" r="3.2"/><circle cx="-11" cy="11" r="3.2"/><circle cx="11" cy="11" r="3.2"/></g>
    </g>
    <g transform="translate(300 54) rotate(-12)" filter="url(#riShadow)">
      <rect x="-15" y="-15" width="30" height="30" rx="6" fill="#f1dfbd" stroke="#96713d" stroke-width="1.2"/>
      <g fill="#a84636"><circle cx="-6" cy="-6" r="2.4"/><circle cx="6" cy="6" r="2.4"/><circle cx="0" cy="0" r="2.4"/></g>
    </g>
    <g fill="#f1d399" class="la-spark">
      <circle cx="70" cy="66" r="2"/><circle cx="318" cy="118" r="1.6"/>
    </g>
  `);

  /* ------------------------------ سكرابل ------------------------------ */
  art.scrabble = svg(`
    <defs>
      <radialGradient id="scHalo" cx="48%" cy="46%" r="64%">
        <stop offset="0" stop-color="#9fcf9d" stop-opacity=".3"/>
        <stop offset="1" stop-color="#3c7c58" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="scOwl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8c6b45"/>
        <stop offset=".55" stop-color="#5b432c"/>
        <stop offset="1" stop-color="#342417"/>
      </linearGradient>
      <linearGradient id="scBelly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f3e4c5"/>
        <stop offset="1" stop-color="#cfb185"/>
      </linearGradient>
      <linearGradient id="scTile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fbf1da"/>
        <stop offset="1" stop-color="#d9c39b"/>
      </linearGradient>
      <linearGradient id="scWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a5c34"/>
        <stop offset="1" stop-color="#4b2e18"/>
      </linearGradient>
      <filter id="scShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#scHalo)"/>
    <g transform="rotate(9 270 74)" opacity=".9">
      <rect x="222" y="20" width="96" height="96" rx="6" fill="#e9d8b6" stroke="#9b7a49" stroke-width="1.4"/>
      <g stroke="#b59a6c" stroke-width="1">
        <path d="M246 20v96M270 20v96M294 20v96M222 44h96M222 68h96M222 92h96"/>
      </g>
      <g opacity=".9">
        <rect x="222" y="20" width="24" height="24" fill="#a84e3e"/>
        <rect x="270" y="44" width="24" height="24" fill="#c59a4f"/>
        <rect x="246" y="68" width="24" height="24" fill="#4f7a68"/>
        <rect x="294" y="68" width="24" height="24" fill="#a84e3e"/>
        <rect x="222" y="92" width="24" height="24" fill="#c59a4f"/>
        <rect x="270" y="92" width="24" height="24" fill="#4f7a68"/>
      </g>
    </g>
    <g filter="url(#scShadow)" class="la-float">
      <g>
        <path d="M113 96c-8-18-4-34 10-45 8-6 14-14 14-24 7 10 7 20 3 28 9-2 17 1 22 8 7-9 17-12 27-8-6 8-6 16-1 24 10 14 10 31-3 44" fill="url(#scOwl)" stroke="#2e1f13" stroke-width="2"/>
        <path d="M113 96c-4 30 12 58 44 62 33 4 54-20 50-50-2-16-10-28-24-34" fill="url(#scOwl)" stroke="#2e1f13" stroke-width="2"/>
        <ellipse cx="161" cy="121" rx="28" ry="34" fill="url(#scBelly)"/>
        <g fill="none" stroke="#a58255" stroke-width="2" opacity=".8">
          <path d="M150 100c4 5 8 5 12 0M160 114c4 5 8 5 12 0M150 128c4 5 8 5 12 0"/>
        </g>
        <path d="M114 88c-12 6-14 22-6 34 5 8 12 12 20 12" fill="#715335" stroke="#2e1f13" stroke-width="1.8"/>
        <path d="M206 88c12 6 14 22 6 34-5 8-12 12-20 12" fill="#715335" stroke="#2e1f13" stroke-width="1.8"/>
        <circle cx="144" cy="80" r="18" fill="#f3e4c5" stroke="#3a2818" stroke-width="1.6"/>
        <circle cx="178" cy="80" r="18" fill="#f3e4c5" stroke="#3a2818" stroke-width="1.6"/>
        <circle cx="146" cy="80" r="8" fill="#2a1a10" class="la-blink"/>
        <circle cx="176" cy="80" r="8" fill="#2a1a10" class="la-blink"/>
        <circle cx="148" cy="77" r="2.4" fill="#fff7e6"/>
        <circle cx="178" cy="77" r="2.4" fill="#fff7e6"/>
        <path d="M161 86 154 96h14Z" fill="#d5a64e" stroke="#8f682b" stroke-width="1.2"/>
        <g fill="#4a3320"><circle cx="138" cy="152" r="6"/><circle cx="184" cy="152" r="6"/></g>
        <path d="M136 158h12M176 158h12" stroke="#d5a64e" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>
    <g filter="url(#scShadow)">
      <rect x="72" y="160" width="216" height="14" rx="5" fill="url(#scWood)" stroke="#2f1c0d" stroke-width="1.2"/>
      <g>
        <g transform="rotate(-5 94 160)"><rect x="78" y="128" width="34" height="34" rx="4" fill="url(#scTile)" stroke="#a68654" stroke-width="1.2"/><text x="95" y="153" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" font-weight="800" fill="#5a3a1f">س</text></g>
        <g transform="rotate(3 130 160)"><rect x="114" y="128" width="34" height="34" rx="4" fill="url(#scTile)" stroke="#a68654" stroke-width="1.2"/><text x="131" y="153" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" font-weight="800" fill="#5a3a1f">ك</text></g>
        <g transform="rotate(-3 166 160)"><rect x="150" y="128" width="34" height="34" rx="4" fill="url(#scTile)" stroke="#a68654" stroke-width="1.2"/><text x="167" y="153" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" font-weight="800" fill="#5a3a1f">ر</text></g>
        <g transform="rotate(4 202 160)"><rect x="186" y="128" width="34" height="34" rx="4" fill="url(#scTile)" stroke="#a68654" stroke-width="1.2"/><text x="203" y="153" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" font-weight="800" fill="#5a3a1f">ب</text></g>
        <g transform="rotate(-6 238 160)"><rect x="222" y="128" width="34" height="34" rx="4" fill="url(#scTile)" stroke="#a68654" stroke-width="1.2"/><text x="239" y="153" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" font-weight="800" fill="#5a3a1f">ل</text></g>
      </g>
    </g>
    <g fill="#e8d09a" class="la-spark">
      <circle cx="52" cy="62" r="2"/><circle cx="316" cy="152" r="1.6"/>
      <path d="M68 178l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
    </g>
  `);

  /* ------------------------------ كلودو ------------------------------ */
  art.cluedo = svg(`
    <defs>
      <radialGradient id="clHalo" cx="50%" cy="40%" r="66%">
        <stop offset="0" stop-color="#d7a0b0" stop-opacity=".3"/>
        <stop offset="1" stop-color="#6b3b54" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="clMansion" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4b3242"/>
        <stop offset="1" stop-color="#211722"/>
      </linearGradient>
      <linearGradient id="clGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#cfe6da" stop-opacity=".6"/>
        <stop offset=".55" stop-color="#6ea99a" stop-opacity=".25"/>
        <stop offset="1" stop-color="#d8b978" stop-opacity=".35"/>
      </linearGradient>
      <linearGradient id="clGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f2d79b"/>
        <stop offset="1" stop-color="#a97833"/>
      </linearGradient>
      <filter id="clShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#clHalo)"/>
    <circle cx="178" cy="78" r="56" fill="#e9d5a5" opacity=".12"/>
    <g filter="url(#clShadow)">
      <path d="M76 166h208v10H76z" fill="#2b1d29"/>
      <path d="M88 166v-50h26v50M246 166v-50h26v50" fill="url(#clMansion)" stroke="#8c6a78" stroke-width="1.4"/>
      <path d="M82 116 101 90l19 26ZM240 116l19-26 19 26Z" fill="#3a2736" stroke="#8c6a78" stroke-width="1.4"/>
      <path d="M112 166v-44h136v44" fill="url(#clMansion)" stroke="#8c6a78" stroke-width="1.4"/>
      <path d="M106 122 128 78l22 44ZM210 122l22-44 22 44Z" fill="#3a2736" stroke="#8c6a78" stroke-width="1.4"/>
      <path d="M144 122 180 62l36 60Z" fill="#4a3244" stroke="#9a7687" stroke-width="1.4"/>
      <path d="M174 166v-30c0-8 3-12 6-12s6 4 6 12v30" fill="#d6b06b"/>
      <g fill="#e7c17d" class="la-flicker">
        <rect x="98" y="128" width="10" height="14" rx="1"/><rect x="260" y="128" width="10" height="14" rx="1"/>
        <rect x="124" y="138" width="10" height="12" rx="1"/><rect x="226" y="138" width="10" height="12" rx="1"/>
        <rect x="160" y="90" width="9" height="12" rx="1"/><rect x="191" y="90" width="9" height="12" rx="1"/>
      </g>
      <path d="M96 166h168" stroke="#9d7b88" stroke-width="1" opacity=".7"/>
    </g>
    <g transform="translate(252 136)" filter="url(#clShadow)" class="la-float-slow">
      <circle cx="0" cy="0" r="38" fill="url(#clGlass)" stroke="url(#clGold)" stroke-width="6"/>
      <circle cx="0" cy="0" r="30" fill="none" stroke="#f5e6c6" stroke-width="1" opacity=".55"/>
      <path d="M24 24 66 66" stroke="url(#clGold)" stroke-width="13" stroke-linecap="round"/>
      <path d="M24 24 66 66" stroke="#5a3a1b" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <text x="-2" y="15" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#f4e2b9" opacity=".85">?</text>
    </g>
    <g transform="translate(64 142)" filter="url(#clShadow)" class="la-float">
      <path d="M-5 44h10V4h-10z" fill="#b9904c"/>
      <path d="M-18 44h36v8h-36z" fill="#c9a15d"/>
      <path d="M-8 4c0-10 4-16 8-22 4 6 8 12 8 22z" fill="#e8c27c"/>
      <path d="M0 -22v-10" stroke="#f6dfa8" stroke-width="2"/>
      <path d="M0 -32c5 0 8 4 8 9H-8c0-5 3-9 8-9z" fill="#f6dfa8"/>
      <path d="M-14 30h28" stroke="#8f682b" stroke-width="2"/>
    </g>
    <g transform="translate(122 176)" fill="#c9a9b6" opacity=".55">
      <ellipse cx="0" cy="0" rx="6" ry="10"/><ellipse cx="12" cy="4" rx="6" ry="10"/><ellipse cx="24" cy="8" rx="6" ry="10"/>
    </g>
    <g fill="#f0d79f" class="la-spark">
      <circle cx="304" cy="58" r="2"/><circle cx="48" cy="92" r="1.6"/>
    </g>
  `);

  /* ------------------------------ أونو ------------------------------ */
  art.uno = svg(`
    <defs>
      <radialGradient id="unHalo" cx="50%" cy="46%" r="66%">
        <stop offset="0" stop-color="#e88378" stop-opacity=".34"/>
        <stop offset="1" stop-color="#7f2c2c" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="unRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c94b52"/><stop offset="1" stop-color="#7e2830"/></linearGradient>
      <linearGradient id="unGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0b45f"/><stop offset="1" stop-color="#a16e28"/></linearGradient>
      <linearGradient id="unGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8a6d"/><stop offset="1" stop-color="#27503f"/></linearGradient>
      <linearGradient id="unBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#567fa6"/><stop offset="1" stop-color="#2c4c68"/></linearGradient>
      <filter id="unShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#unHalo)"/>
    <g filter="url(#unShadow)">
      <g transform="rotate(-24 137 116)" class="la-sway">
        <rect x="101" y="62" width="72" height="108" rx="10" fill="#f7ecd5" stroke="#d9c9a7" stroke-width="2"/>
        <rect x="107" y="68" width="60" height="96" rx="7" fill="url(#unRed)"/>
        <ellipse cx="137" cy="116" rx="24" ry="34" fill="#f7ecd5" transform="rotate(22 137 116)"/>
        <text x="137" y="130" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#a8323b">7</text>
      </g>
      <g transform="rotate(-8 173 108)" class="la-sway">
        <rect x="137" y="54" width="72" height="108" rx="10" fill="#f7ecd5" stroke="#d9c9a7" stroke-width="2"/>
        <rect x="143" y="60" width="60" height="96" rx="7" fill="url(#unGold)"/>
        <ellipse cx="173" cy="108" rx="24" ry="34" fill="#f7ecd5" transform="rotate(18 173 108)"/>
        <text x="173" y="121" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="25" font-weight="800" fill="#8c5d1c">+2</text>
      </g>
      <g transform="rotate(8 207 108)" class="la-sway">
        <rect x="171" y="54" width="72" height="108" rx="10" fill="#f7ecd5" stroke="#d9c9a7" stroke-width="2"/>
        <rect x="177" y="60" width="60" height="96" rx="7" fill="url(#unGreen)"/>
        <ellipse cx="207" cy="108" rx="24" ry="34" fill="#f7ecd5" transform="rotate(18 207 108)"/>
        <g fill="none" stroke="#2f604a" stroke-width="4" stroke-linecap="round">
          <path d="M194 94c12-8 22-2 26 8M220 122c-12 8-22 2-26-8"/>
          <path d="M218 98l6 4-7 4M196 118l-6-4 7-4"/>
        </g>
      </g>
      <g transform="rotate(24 241 116)" class="la-sway">
        <rect x="205" y="62" width="72" height="108" rx="10" fill="#f7ecd5" stroke="#d9c9a7" stroke-width="2"/>
        <rect x="211" y="68" width="60" height="96" rx="7" fill="#1e1b19"/>
        <g transform="translate(241 116)">
          <path d="M0-30 9-9l30-9-21 22 21 22-30-9L0 30l-9-26L-30 22l6-30-30-9 30-9z" fill="#c94b52"/>
          <circle cx="0" cy="0" r="16" fill="#e0b45f"/>
          <circle cx="0" cy="0" r="16" fill="none" stroke="#f7ecd5" stroke-width="3"/>
        </g>
      </g>
    </g>
    <g transform="translate(66 176) rotate(-8)">
      <rect x="-22" y="-12" width="44" height="24" rx="6" fill="#f7ecd5" opacity=".9"/>
      <text x="0" y="6" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="800" letter-spacing="2" fill="#9b353c">UNO</text>
    </g>
    <g fill="#f6d792" class="la-spark">
      <circle cx="58" cy="58" r="2"/><circle cx="316" cy="74" r="1.6"/><circle cx="302" cy="170" r="2.2"/>
    </g>
  `);

  /* ------------------------------ وباء ------------------------------ */
  art.pandemic = svg(`
    <defs>
      <radialGradient id="paHalo" cx="48%" cy="46%" r="66%">
        <stop offset="0" stop-color="#8fcfc2" stop-opacity=".3"/>
        <stop offset="1" stop-color="#35756d" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="paGlobe" cx="36%" cy="30%" r="78%">
        <stop offset="0" stop-color="#4c7e83"/>
        <stop offset=".6" stop-color="#23484f"/>
        <stop offset="1" stop-color="#0d262c"/>
      </radialGradient>
      <linearGradient id="paVirus" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d56a5e"/>
        <stop offset="1" stop-color="#8c302c"/>
      </linearGradient>
      <linearGradient id="paGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f1d38f"/>
        <stop offset="1" stop-color="#aa7830"/>
      </linearGradient>
      <clipPath id="paClip"><circle cx="158" cy="104" r="60"/></clipPath>
      <filter id="paShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#paHalo)"/>
    <g filter="url(#paShadow)" class="la-float-slow">
      <circle cx="158" cy="104" r="60" fill="url(#paGlobe)" stroke="#d8b779" stroke-width="2"/>
      <g clip-path="url(#paClip)">
        <path d="M102 94c8-16 20-22 34-18 12 4 14 15 8 25-7 11-19 13-31 9-9-3-14-8-11-16z" fill="#7e9864"/>
        <path d="M166 58c12-8 28-5 36 6 5 8 0 16-10 18-13 3-24-4-28-13-2-5-1-9 2-11z" fill="#8ba26a"/>
        <path d="M170 118c14-3 28 4 32 16 3 10-4 19-16 21-11 1-20-7-22-17-1-9 1-17 6-20z" fill="#708a58"/>
      </g>
      <g fill="none" stroke="#e8c27c" opacity=".4">
        <ellipse cx="158" cy="104" rx="60" ry="22"/>
        <ellipse cx="158" cy="104" rx="38" ry="60"/>
        <path d="M98 104h120M158 44v120"/>
      </g>
      <g fill="none" stroke="#d56a5e" stroke-width="2.4" class="la-pulse">
        <circle cx="192" cy="132" r="12" opacity=".8"/><circle cx="192" cy="132" r="20" opacity=".4"/>
      </g>
      <circle cx="192" cy="132" r="3.6" fill="#e48a76"/>
      <circle cx="138" cy="74" r="3.2" fill="#e48a76"/>
    </g>
    <g transform="translate(276 66)" filter="url(#paShadow)" class="la-spin-slow">
      <g fill="url(#paVirus)" stroke="#5f1e1c" stroke-width="1.4">
        <circle cx="0" cy="0" r="17"/>
        <path d="M0-30v10M0 20v10M-30 0h10M20 0h10M-21-21l7 7M14 14l7 7M21-21l-7 7M-14 14l-7 7"/>
      </g>
      <g fill="#e4a08d"><circle cx="-32" cy="0" r="4"/><circle cx="32" cy="0" r="4"/><circle cx="0" cy="-32" r="4"/><circle cx="0" cy="32" r="4"/><circle cx="-24" cy="-24" r="3.4"/><circle cx="24" cy="24" r="3.4"/><circle cx="24" cy="-24" r="3.4"/><circle cx="-24" cy="24" r="3.4"/></g>
      <circle cx="-5" cy="-5" r="5" fill="#8c302c" opacity=".7"/>
      <circle cx="6" cy="5" r="3" fill="#8c302c" opacity=".6"/>
    </g>
    <g transform="translate(304 148)" filter="url(#paShadow)" class="la-float">
      <circle cx="0" cy="0" r="24" fill="#f4e7cb" stroke="url(#paGold)" stroke-width="4"/>
      <path d="M0-12v24M-12 0h24" stroke="#a34a3e" stroke-width="7" stroke-linecap="round"/>
      <path d="M0-12v24M-12 0h24" stroke="#d58070" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g transform="translate(44 172) rotate(-18)" filter="url(#paShadow)">
      <rect x="-9" y="-40" width="18" height="70" rx="5" fill="#f0e3c8" stroke="#9f8357" stroke-width="1.4"/>
      <rect x="-13" y="-48" width="26" height="10" rx="3" fill="#b7c7bf"/>
      <path d="M0 30v14" stroke="#b7c7bf" stroke-width="2.4"/>
      <path d="M0 44h8" stroke="#b7c7bf" stroke-width="2.4"/>
      <rect x="-9" y="-8" width="18" height="20" fill="#d97b68" opacity=".8"/>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="70" cy="58" r="2"/><circle cx="320" cy="42" r="1.6"/>
    </g>
  `);

  /* ------------------------------ طاولة الزهر ------------------------------ */
  art.tavla = svg(`
    <defs>
      <radialGradient id="tvHalo" cx="50%" cy="44%" r="66%">
        <stop offset="0" stop-color="#e2bd77" stop-opacity=".32"/>
        <stop offset="1" stop-color="#89602d" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="tvWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a5c33"/>
        <stop offset="1" stop-color="#3d2412"/>
      </linearGradient>
      <linearGradient id="tvFelt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ead9b5"/>
        <stop offset="1" stop-color="#bda375"/>
      </linearGradient>
      <linearGradient id="tvRed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b45a4b"/>
        <stop offset="1" stop-color="#722f29"/>
      </linearGradient>
      <filter id="tvShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#tvHalo)"/>
    <g filter="url(#tvShadow)" class="la-float-slow">
      <path d="M62 52h236l26 142H36Z" fill="url(#tvWood)" stroke="#24140a" stroke-width="2"/>
      <path d="M74 62h212l20 122H54Z" fill="url(#tvFelt)" stroke="#6e4b25" stroke-width="1.4"/>
      <path d="M180 62v122" stroke="#6e4b25" stroke-width="4"/>
      <g fill="#4d6f57">
        <path d="M74 62h52l-14 61H60Z"/><path d="M126 62h54l-12 61h-56Z"/><path d="M232 62h54l14 61h-56Z"/><path d="M234 62h-54l12 61h56Z" opacity=".6"/>
      </g>
      <g fill="#a74d3f">
        <path d="M60 184h52l14-61H74Z"/><path d="M112 184h56l-12-61h-56Z"/><path d="M220 184h56l-14-61h-56Z"/><path d="M276 184h-56l12-61h56Z" opacity=".65"/>
      </g>
      <g stroke="#7c572c" stroke-width="1" opacity=".6">
        <path d="M78 123h204M70 154h220M64 176h232"/>
      </g>
      <g>
        <g transform="translate(108 136)">
          <circle cx="0" cy="0" r="12" fill="#f0dfbc" stroke="#8d6b3c" stroke-width="1.4"/>
          <circle cx="0" cy="-9" r="12" fill="#f0dfbc" stroke="#8d6b3c" stroke-width="1.4"/>
          <circle cx="0" cy="-18" r="12" fill="url(#tvRed)" stroke="#5f2721" stroke-width="1.4"/>
          <circle cx="0" cy="-18" r="5" fill="none" stroke="#e5bd82" stroke-width="1.2"/>
        </g>
        <g transform="translate(226 146)">
          <circle cx="0" cy="0" r="12" fill="#f0dfbc" stroke="#8d6b3c" stroke-width="1.4"/>
          <circle cx="0" cy="-9" r="12" fill="#f0dfbc" stroke="#8d6b3c" stroke-width="1.4"/>
          <circle cx="0" cy="-18" r="12" fill="#3f6152" stroke="#20362b" stroke-width="1.4"/>
        </g>
      </g>
    </g>
    <g transform="translate(98 70) rotate(-9)" filter="url(#tvShadow)" class="la-float">
      <rect x="-18" y="-18" width="36" height="36" rx="7" fill="#f4e7ca" stroke="#93703e" stroke-width="1.4"/>
      <g fill="#342316"><circle cx="-8" cy="-8" r="2.8"/><circle cx="8" cy="-8" r="2.8"/><circle cx="0" cy="0" r="2.8"/><circle cx="-8" cy="8" r="2.8"/><circle cx="8" cy="8" r="2.8"/></g>
    </g>
    <g transform="translate(270 82) rotate(12)" filter="url(#tvShadow)" class="la-float-slow">
      <rect x="-18" y="-18" width="36" height="36" rx="7" fill="#f4e7ca" stroke="#93703e" stroke-width="1.4"/>
      <g fill="#8b3730"><circle cx="-7" cy="-7" r="2.8"/><circle cx="7" cy="-7" r="2.8"/><circle cx="-7" cy="7" r="2.8"/><circle cx="7" cy="7" r="2.8"/></g>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="44" cy="54" r="2"/><circle cx="322" cy="118" r="1.6"/>
    </g>
  `);

  /* ------------------------------ الورق ------------------------------ */
  art.waraq = svg(`
    <defs>
      <radialGradient id="wqHalo" cx="48%" cy="44%" r="66%">
        <stop offset="0" stop-color="#e0a477" stop-opacity=".32"/>
        <stop offset="1" stop-color="#86452e" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="wqCream" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fbf1da"/>
        <stop offset="1" stop-color="#dbc49c"/>
      </linearGradient>
      <linearGradient id="wqBack" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8f3f35"/>
        <stop offset="1" stop-color="#5a2622"/>
      </linearGradient>
      <linearGradient id="wqGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f2d79a"/>
        <stop offset="1" stop-color="#a97831"/>
      </linearGradient>
      <filter id="wqShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#wqHalo)"/>
    <g filter="url(#wqShadow)">
      <g transform="rotate(-19 117 120)" class="la-sway">
        <rect x="75" y="52" width="82" height="122" rx="8" fill="url(#wqBack)" stroke="#c9a15d" stroke-width="2"/>
        <rect x="83" y="60" width="66" height="106" rx="5" fill="none" stroke="#d8b477" stroke-width="1.2" stroke-dasharray="3 4"/>
        <path d="M116 96c8-10 25-6 26 7 1 9-11 17-26 28-15-11-27-19-26-28 1-13 18-17 26-7z" fill="#e7c27c" opacity=".75"/>
      </g>
      <g transform="rotate(-5 173 114)" class="la-sway">
        <rect x="130" y="42" width="86" height="128" rx="8" fill="url(#wqCream)" stroke="#a68551" stroke-width="1.4"/>
        <path d="M143 136V72h60v64" fill="none" stroke="#c7ab79" stroke-width="1.4"/>
        <path d="M157 72c0-12 8-20 17-20s17 8 17 20" fill="#3d6473" opacity=".25"/>
        <path d="M153 52h40l-5 12 5 8h-40l5-8z" fill="url(#wqGold)" stroke="#8f682b" stroke-width="1.2"/>
        <path d="M165 46h16v8h-16z" fill="url(#wqGold)"/>
        <circle cx="173" cy="84" r="12" fill="#e4cfaa" stroke="#8f682b" stroke-width="1.2"/>
        <path d="M166 82c2-5 12-5 14 0M168 89c3 3 7 3 10 0" fill="none" stroke="#5b3b1e" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M159 106h28M163 116h20" stroke="#b99a68" stroke-width="2" stroke-linecap="round"/>
        <path d="M173 138v-14" stroke="#8f682b" stroke-width="2"/>
      </g>
      <g transform="rotate(13 222 122)" class="la-sway">
        <rect x="181" y="54" width="82" height="122" rx="8" fill="url(#wqCream)" stroke="#a68551" stroke-width="1.4"/>
        <path d="M222 92c10-14 32-7 32 10 0 12-14 22-32 35-18-13-32-23-32-35 0-17 22-24 32-10z" fill="#a94a3f" opacity=".9"/>
        <path d="M222 108c4-6 14-3 14 4 0 5-6 9-14 15-8-6-14-10-14-15 0-7 10-10 14-4z" fill="#f0dfbc"/>
        <path d="M194 64h56M194 158h56" stroke="#c9a15d" stroke-width="2"/>
      </g>
    </g>
    <g transform="translate(290 162)" filter="url(#wqShadow)" class="la-float">
      <ellipse cx="0" cy="18" rx="30" ry="8" fill="#d9c19a" stroke="#a68551" stroke-width="1.2"/>
      <path d="M-18 10h36l-4 18c-1 5-6 8-14 8s-13-3-14-8z" fill="#f5e8ce" stroke="#a68551" stroke-width="1.4"/>
      <ellipse cx="0" cy="10" rx="18" ry="5" fill="#6b3d24"/>
      <path d="M18 16c9 0 10 12 0 12" fill="none" stroke="#a68551" stroke-width="2"/>
      <g class="la-steam" fill="none" stroke="#f1dfbc" stroke-width="2" stroke-linecap="round" opacity=".7">
        <path d="M-7 4c-6-8 6-12 0-20M7 4c-6-8 6-12 0-20"/>
      </g>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="58" cy="60" r="2"/><circle cx="318" cy="76" r="1.6"/>
    </g>
  `);

  /* ------------------------------ كوت بو ستة ------------------------------ */
  art.kootbositta = svg(`
    <defs>
      <radialGradient id="koHalo" cx="50%" cy="42%" r="66%">
        <stop offset="0" stop-color="#e7ad6e" stop-opacity=".34"/>
        <stop offset="1" stop-color="#7c3e23" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="koCream" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fcf2dc"/>
        <stop offset="1" stop-color="#d8c09a"/>
      </linearGradient>
      <linearGradient id="koGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6dc9f"/>
        <stop offset="1" stop-color="#a87730"/>
      </linearGradient>
      <linearGradient id="koRed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b44a41"/>
        <stop offset="1" stop-color="#6f2824"/>
      </linearGradient>
      <filter id="koShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#koHalo)"/>
    <g transform="translate(180 54)" filter="url(#koShadow)" class="la-float-slow">
      <path d="M-34 16h68l-8 16h-52z" fill="url(#koGold)" stroke="#7f5a24" stroke-width="1.2"/>
      <path d="M-27 16 0-20 27 16Z" fill="url(#koGold)" stroke="#7f5a24" stroke-width="1.4"/>
      <path d="M-15 16V2l15-11 15 11v14z" fill="#6b3a1f" opacity=".65"/>
      <circle cx="0" cy="-19" r="4" fill="#f6dfa8" stroke="#7f5a24" stroke-width="1"/>
      <circle cx="-27" cy="14" r="3.4" fill="#f6dfa8"/><circle cx="27" cy="14" r="3.4" fill="#f6dfa8"/>
    </g>
    <g filter="url(#koShadow)">
      <g transform="rotate(-24 132 128)" class="la-sway">
        <rect x="97" y="64" width="70" height="108" rx="8" fill="url(#koCream)" stroke="#a1804c" stroke-width="1.4"/>
        <path d="M132 98c-10-14-28-7-28 9 0 10 12 19 28 31 16-12 28-21 28-31 0-16-18-23-28-9z" fill="#a84239"/>
        <path d="M132 112c-4 6-12 3-12-3 0-4 5-8 12-13 7 5 12 9 12 13 0 6-8 9-12 3z" fill="url(#koCream)"/>
      </g>
      <g transform="rotate(-9 169 120)" class="la-sway">
        <rect x="134" y="56" width="70" height="108" rx="8" fill="url(#koCream)" stroke="#a1804c" stroke-width="1.4"/>
        <path d="M169 92c0-10 8-17 18-17 4 0 8 1 11 3-2 3-3 6-3 10 0 4 1 8 3 11-10 3-21 0-29-7z" fill="#33251c"/>
        <path d="M160 128h18M160 136h10" stroke="#a1804c" stroke-width="1.6"/>
      </g>
      <g transform="rotate(7 207 120)" class="la-sway">
        <rect x="172" y="56" width="70" height="108" rx="8" fill="url(#koCream)" stroke="#a1804c" stroke-width="1.4"/>
        <path d="M207 96 219 118l-24 1 12-23z" fill="#a84239"/>
        <path d="M207 118v14" stroke="#a84239" stroke-width="2"/>
      </g>
      <g transform="rotate(23 245 128)" class="la-sway">
        <rect x="210" y="64" width="70" height="108" rx="8" fill="#2c1d16" stroke="#b78b4b" stroke-width="1.6"/>
        <path d="M245 82c10 0 18 8 18 18v26h-36V100c0-10 8-18 18-18z" fill="#f0dfbc"/>
        <path d="M230 92c-8-7-21-3-21 8 0 9 10 15 21 10 11 5 21-1 21-10 0-11-13-15-21-8z" fill="#8b3730"/>
        <circle cx="238" cy="96" r="3.4" fill="#2c1d16"/><circle cx="252" cy="96" r="3.4" fill="#2c1d16"/>
        <path d="M240 108c4 5 10 5 14 0" fill="none" stroke="#2c1d16" stroke-width="2" stroke-linecap="round"/>
        <path d="M231 72 245 58l14 14-14 10z" fill="#a84239" stroke="#e4c68b" stroke-width="1.2"/>
      </g>
    </g>
    <g transform="translate(74 166)" filter="url(#koShadow)">
      <circle cx="0" cy="0" r="23" fill="url(#koGold)" stroke="#7f5a24" stroke-width="2"/>
      <circle cx="0" cy="0" r="17" fill="none" stroke="#8b6428" stroke-width="1.2"/>
      <text x="0" y="9" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="24" font-weight="800" fill="#4d3014">٩</text>
    </g>
    <g fill="#f5d99b" class="la-spark">
      <circle cx="310" cy="64" r="2"/><circle cx="52" cy="82" r="1.6"/><circle cx="288" cy="184" r="1.8"/>
    </g>
  `);

  /* ------------------------------ دومينو ------------------------------ */
  art.domino = svg(`
    <defs>
      <radialGradient id="doHalo" cx="50%" cy="46%" r="66%">
        <stop offset="0" stop-color="#93b8d7" stop-opacity=".28"/>
        <stop offset="1" stop-color="#3f6683" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="doIvory" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fdf5e2"/>
        <stop offset="1" stop-color="#d9c5a2"/>
      </linearGradient>
      <linearGradient id="doWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6e4b2b"/>
        <stop offset="1" stop-color="#332014"/>
      </linearGradient>
      <filter id="doShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#doHalo)"/>
    <path d="M30 186c52-16 100-18 150-8 52 10 98 8 150-8v50H30Z" fill="url(#doWood)" opacity=".8"/>
    <ellipse cx="180" cy="188" rx="122" ry="18" fill="#0c0806" opacity=".35"/>
    <g filter="url(#doShadow)">
      <g transform="rotate(-14 122 108)" class="la-float">
        <rect x="93" y="40" width="58" height="136" rx="10" fill="url(#doIvory)" stroke="#9c7b4a" stroke-width="1.6"/>
        <path d="M93 108h58" stroke="#a88755" stroke-width="2"/>
        <g fill="#3a2818"><circle cx="122" cy="60" r="3.4"/><circle cx="122" cy="76" r="3.4"/><circle cx="110" cy="68" r="3.4"/><circle cx="134" cy="68" r="3.4"/></g>
        <g fill="#3a2818"><circle cx="110" cy="126" r="3.4"/><circle cx="134" cy="126" r="3.4"/><circle cx="122" cy="142" r="3.4"/><circle cx="110" cy="158" r="3.4"/><circle cx="134" cy="158" r="3.4"/></g>
      </g>
      <g transform="rotate(9 204 122)" class="la-float-slow">
        <rect x="174" y="58" width="58" height="136" rx="10" fill="url(#doIvory)" stroke="#9c7b4a" stroke-width="1.6"/>
        <path d="M174 126h58" stroke="#a88755" stroke-width="2"/>
        <g fill="#8b3a32"><circle cx="189" cy="80" r="3.2"/><circle cx="203" cy="80" r="3.2"/><circle cx="217" cy="80" r="3.2"/><circle cx="189" cy="96" r="3.2"/><circle cx="203" cy="96" r="3.2"/><circle cx="217" cy="96" r="3.2"/></g>
        <g fill="#8b3a32"><circle cx="203" cy="148" r="3.2"/><circle cx="217" cy="162" r="3.2"/></g>
      </g>
      <g transform="rotate(-4 275 158)" class="la-float">
        <rect x="246" y="118" width="58" height="58" rx="9" fill="url(#doIvory)" stroke="#9c7b4a" stroke-width="1.6"/>
        <path d="M275 118v58" stroke="#a88755" stroke-width="2"/>
        <g fill="#3a2818"><circle cx="260" cy="136" r="3"/><circle cx="260" cy="156" r="3"/><circle cx="290" cy="136" r="3"/><circle cx="290" cy="156" r="3"/><circle cx="275" cy="146" r="3"/></g>
      </g>
    </g>
    <g fill="#eed49b" class="la-spark">
      <circle cx="58" cy="60" r="2"/><circle cx="312" cy="56" r="1.6"/>
    </g>
  `);

  /* ------------------------------ لودو ------------------------------ */
  art.ludo = svg(`
    <defs>
      <radialGradient id="luHalo" cx="50%" cy="46%" r="66%">
        <stop offset="0" stop-color="#f0cb7d" stop-opacity=".32"/>
        <stop offset="1" stop-color="#8a5b24" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="luRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ba5547"/><stop offset="1" stop-color="#782c28"/></linearGradient>
      <linearGradient id="luGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d8a67"/><stop offset="1" stop-color="#2e523e"/></linearGradient>
      <linearGradient id="luGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfb766"/><stop offset="1" stop-color="#9c6d2b"/></linearGradient>
      <filter id="luShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#luHalo)"/>
    <g filter="url(#luShadow)" class="la-float-slow">
      <rect x="88" y="18" width="184" height="184" rx="14" fill="#ead8b2" stroke="#6f4d26" stroke-width="2"/>
      <g>
        <rect x="100" y="30" width="64" height="64" rx="8" fill="url(#luRed)"/>
        <rect x="196" y="30" width="64" height="64" rx="8" fill="url(#luGreen)"/>
        <rect x="100" y="130" width="64" height="64" rx="8" fill="url(#luGold)"/>
        <rect x="196" y="130" width="64" height="64" rx="8" fill="#4f6c86"/>
      </g>
      <g fill="#f6ecd5" stroke="#9c7b4a" stroke-width="1">
        <rect x="164" y="30" width="32" height="162"/><rect x="100" y="94" width="160" height="32"/>
        <rect x="164" y="94" width="32" height="32" fill="#d9b66f"/>
      </g>
      <g fill="none" stroke="#b99a67" stroke-width="1">
        <path d="M100 62h64M132 30v64M196 62h64M228 30v64M100 162h64M132 130v64M196 162h64M228 130v64"/>
      </g>
      <path d="M164 94h32v32h-32z" fill="#f0dfbc"/>
      <path d="M164 94h16v16h-16zM180 110h16v16h-16z" fill="#b7a17a"/>
      <g fill="#f6ecd5">
        <circle cx="118" cy="48" r="9"/><circle cx="146" cy="48" r="9"/><circle cx="118" cy="76" r="9"/><circle cx="146" cy="76" r="9"/>
        <circle cx="214" cy="148" r="9"/><circle cx="242" cy="148" r="9"/><circle cx="214" cy="176" r="9"/><circle cx="242" cy="176" r="9"/>
      </g>
      <path d="M88 194h184" stroke="#6f4d26" stroke-width="2" opacity=".6"/>
    </g>
    <g transform="translate(78 160)" filter="url(#luShadow)" class="la-float">
      <path d="M0-34c9 0 15 7 15 15 0 6-4 10-4 16l11 10c4 4 6 9 6 15v10H-28V22c0-6 2-11 6-15l11-10c0-6-4-10-4-16 0-8 6-15 15-15Z" fill="#f6ecd5" stroke="#7c542b" stroke-width="2"/>
      <circle cx="0" cy="-13" r="5" fill="#b54f43"/>
    </g>
    <g transform="translate(294 174)" filter="url(#luShadow)">
      <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#f5e7cb" stroke="#96713d" stroke-width="1.4"/>
      <g fill="#3b2818"><circle cx="-10" cy="-10" r="3"/><circle cx="10" cy="-10" r="3"/><circle cx="0" cy="0" r="3"/><circle cx="-10" cy="10" r="3"/><circle cx="10" cy="10" r="3"/></g>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="48" cy="62" r="2"/><circle cx="318" cy="54" r="1.6"/>
    </g>
  `);

  /* ------------------------------ السلم والثعبان ------------------------------ */
  art.snakes = svg(`
    <defs>
      <radialGradient id="snHalo" cx="50%" cy="44%" r="66%">
        <stop offset="0" stop-color="#9ccf9f" stop-opacity=".3"/>
        <stop offset="1" stop-color="#3d724c" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="snLadder" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c79a5c"/>
        <stop offset="1" stop-color="#7b4f27"/>
      </linearGradient>
      <linearGradient id="snSnake" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6f9b53"/>
        <stop offset=".55" stop-color="#3f6b45"/>
        <stop offset="1" stop-color="#24402e"/>
      </linearGradient>
      <linearGradient id="snBoard" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ece0c2"/>
        <stop offset="1" stop-color="#c9b28a"/>
      </linearGradient>
      <filter id="snShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#snHalo)"/>
    <g opacity=".55">
      <rect x="82" y="20" width="196" height="180" rx="8" fill="url(#snBoard)" stroke="#a88a58" stroke-width="1.4"/>
      <g stroke="#b39a70" stroke-width="1">
        <path d="M82 56h196M82 92h196M82 128h196M82 164h196M114 20v180M146 20v180M178 20v180M210 20v180M242 20v180"/>
      </g>
      <g fill="#8f764f" font-family="Segoe UI, sans-serif" font-size="9" font-weight="700">
        <text x="90" y="174">1</text><text x="122" y="174">2</text><text x="154" y="174">3</text><text x="186" y="174">4</text><text x="218" y="174">5</text><text x="250" y="174">6</text>
        <text x="90" y="138">7</text><text x="122" y="138">8</text><text x="154" y="138">9</text><text x="218" y="138">11</text><text x="250" y="138">12</text>
      </g>
    </g>
    <g filter="url(#snShadow)" class="la-float-slow">
      <g stroke="url(#snLadder)" stroke-width="7" stroke-linecap="round">
        <path d="M112 188 258 34M166 188 312 34"/>
      </g>
      <g stroke="#b8874c" stroke-width="4" stroke-linecap="round">
        <path d="M118 178h54M132 164h54M146 150h54M160 136h54M174 122h54M188 108h54M202 94h54M216 80h54M230 66h54M244 52h54"/>
      </g>
    </g>
    <g filter="url(#snShadow)" class="la-sway">
      <path d="M136 198c-24-4-28-26-10-36 14-8 34-2 36 12 2 10-8 18-20 16" fill="none" stroke="url(#snSnake)" stroke-width="18" stroke-linecap="round"/>
      <path d="M136 198c-24-4-28-26-10-36 14-8 34-2 36 12 2 10-8 18-20 16" fill="none" stroke="#93b36c" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
      <path d="M196 143c18-8 34-24 30-40-4-18-26-18-32-4-4 10 4 18 14 18 12 0 18-10 16-22" fill="none" stroke="url(#snSnake)" stroke-width="14" stroke-linecap="round"/>
      <g transform="translate(228 92) rotate(-18)">
        <ellipse cx="0" cy="0" rx="17" ry="12" fill="#4d7a50" stroke="#27402c" stroke-width="1.4"/>
        <circle cx="-8" cy="-3" r="3.4" fill="#f2d389"/><circle cx="-8" cy="-3" r="1.6" fill="#1d2a1d"/>
        <circle cx="6" cy="-3" r="3.4" fill="#f2d389"/><circle cx="6" cy="-3" r="1.6" fill="#1d2a1d"/>
        <path d="M12 2c9 1 14 5 18 9-6 0-12 0-18-3Z" fill="#b54a3f"/>
        <path d="M0 10v10" stroke="#c9a15d" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g transform="translate(64 66) rotate(-10)" filter="url(#snShadow)" class="la-float">
      <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#f4e7ca" stroke="#93703e" stroke-width="1.4"/>
      <g fill="#3a2818"><circle cx="-10" cy="-10" r="3.2"/><circle cx="10" cy="10" r="3.2"/><circle cx="0" cy="0" r="3.2"/><circle cx="10" cy="-10" r="3.2"/><circle cx="-10" cy="10" r="3.2"/></g>
    </g>
    <g fill="#e9d29a" class="la-spark">
      <circle cx="314" cy="132" r="2"/><circle cx="48" cy="130" r="1.6"/>
    </g>
  `);

  /* ------------------------------ الداما ------------------------------ */
  art.checkers = svg(`
    <defs>
      <radialGradient id="ckHalo" cx="50%" cy="42%" r="66%">
        <stop offset="0" stop-color="#c8a6d6" stop-opacity=".28"/>
        <stop offset="1" stop-color="#5f3b6c" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ckBoard" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e9d9b8"/>
        <stop offset="1" stop-color="#b89a6c"/>
      </linearGradient>
      <linearGradient id="ckPiece" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a94f45"/>
        <stop offset=".55" stop-color="#7a302c"/>
        <stop offset="1" stop-color="#451916"/>
      </linearGradient>
      <linearGradient id="ckGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6dda2"/>
        <stop offset="1" stop-color="#a5752e"/>
      </linearGradient>
      <filter id="ckShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".55"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#ckHalo)"/>
    <g filter="url(#ckShadow)">
      <path d="M58 118h244l36 82H22Z" fill="url(#ckBoard)" stroke="#6f4d26" stroke-width="2"/>
      <g transform="translate(58 118) skewX(-12)">
        <g fill="#8f3f35">
          <rect x="0" y="0" width="35" height="20"/><rect x="70" y="0" width="35" height="20"/><rect x="140" y="0" width="35" height="20"/><rect x="210" y="0" width="35" height="20"/>
          <rect x="35" y="20" width="35" height="20"/><rect x="105" y="20" width="35" height="20"/><rect x="175" y="20" width="35" height="20"/><rect x="245" y="20" width="35" height="20"/>
          <rect x="0" y="40" width="35" height="20"/><rect x="70" y="40" width="35" height="20"/><rect x="140" y="40" width="35" height="20"/><rect x="210" y="40" width="35" height="20"/>
          <rect x="35" y="60" width="35" height="20"/><rect x="105" y="60" width="35" height="20"/><rect x="175" y="60" width="35" height="20"/><rect x="245" y="60" width="35" height="20"/>
        </g>
        <path d="M0 20h280M0 40h280M0 60h280M35 0v80M70 0v80M105 0v80M140 0v80M175 0v80M210 0v80M245 0v80" stroke="#8e7048" stroke-width="1" opacity=".5"/>
      </g>
    </g>
    <g filter="url(#ckShadow)" class="la-float-slow">
      <ellipse cx="222" cy="142" rx="40" ry="16" fill="#4b1d19"/>
      <ellipse cx="222" cy="136" rx="40" ry="16" fill="url(#ckPiece)" stroke="#2e100e" stroke-width="1.6"/>
      <ellipse cx="222" cy="124" rx="40" ry="16" fill="url(#ckPiece)" stroke="#2e100e" stroke-width="1.6"/>
      <ellipse cx="222" cy="112" rx="40" ry="16" fill="url(#ckPiece)" stroke="#2e100e" stroke-width="1.6"/>
      <ellipse cx="222" cy="104" rx="28" ry="10" fill="none" stroke="#d1a15a" stroke-width="1.4" opacity=".6"/>
      <g transform="translate(222 88)">
        <path d="M-24 8h48l-4 10h-40z" fill="url(#ckGold)" stroke="#795320" stroke-width="1.2"/>
        <path d="M-19 8 0-18 19 8Z" fill="url(#ckGold)" stroke="#795320" stroke-width="1.4"/>
        <circle cx="0" cy="-18" r="3" fill="#f8e4ae"/>
        <circle cx="-19" cy="6" r="2.6" fill="#f8e4ae"/><circle cx="19" cy="6" r="2.6" fill="#f8e4ae"/>
      </g>
    </g>
    <g filter="url(#ckShadow)" class="la-float" transform="translate(104 94)">
      <ellipse cx="0" cy="18" rx="30" ry="12" fill="#4b1d19" opacity=".5"/>
      <ellipse cx="0" cy="10" rx="30" ry="12" fill="#f0dfbc" stroke="#9c7b4a" stroke-width="1.6"/>
      <ellipse cx="0" cy="2" rx="30" ry="12" fill="#f0dfbc" stroke="#9c7b4a" stroke-width="1.6"/>
      <ellipse cx="0" cy="-6" rx="30" ry="12" fill="#f0dfbc" stroke="#9c7b4a" stroke-width="1.6"/>
    </g>
    <g fill="none" stroke="#d9b779" opacity=".45" stroke-linecap="round">
      <path d="M56 92c8-8 16-12 26-13M48 112c6-6 12-10 20-12"/>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="304" cy="56" r="2"/><circle cx="66" cy="56" r="1.6"/>
    </g>
  `);

  /* ------------------------------ المنقلة ------------------------------ */
  art.mancala = svg(`
    <defs>
      <radialGradient id="maHalo" cx="50%" cy="44%" r="66%">
        <stop offset="0" stop-color="#efc97f" stop-opacity=".34"/>
        <stop offset="1" stop-color="#8d5d25" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="maWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a3703d"/>
        <stop offset=".5" stop-color="#714923"/>
        <stop offset="1" stop-color="#3e2410"/>
      </linearGradient>
      <linearGradient id="maInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2f1b0d"/>
        <stop offset="1" stop-color="#150c06"/>
      </linearGradient>
      <linearGradient id="maSeed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f4dfae"/>
        <stop offset="1" stop-color="#b48345"/>
      </linearGradient>
      <filter id="maShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#maHalo)"/>
    <g filter="url(#maShadow)" class="la-float-slow">
      <rect x="34" y="62" width="292" height="104" rx="52" fill="url(#maWood)" stroke="#2a1709" stroke-width="2"/>
      <rect x="46" y="74" width="268" height="80" rx="40" fill="url(#maInner)" stroke="#b0844c" stroke-width="1.4"/>
      <ellipse cx="72" cy="114" rx="16" ry="28" fill="#160d07" stroke="#a97b43" stroke-width="1.2"/>
      <ellipse cx="288" cy="114" rx="16" ry="28" fill="#160d07" stroke="#a97b43" stroke-width="1.2"/>
      <g fill="#160d07" stroke="#8d6334" stroke-width="1">
        <ellipse cx="116" cy="96" rx="12" ry="9"/><ellipse cx="150" cy="96" rx="12" ry="9"/><ellipse cx="184" cy="96" rx="12" ry="9"/><ellipse cx="218" cy="96" rx="12" ry="9"/><ellipse cx="252" cy="96" rx="12" ry="9"/>
        <ellipse cx="116" cy="132" rx="12" ry="9"/><ellipse cx="150" cy="132" rx="12" ry="9"/><ellipse cx="184" cy="132" rx="12" ry="9"/><ellipse cx="218" cy="132" rx="12" ry="9"/><ellipse cx="252" cy="132" rx="12" ry="9"/>
      </g>
      <g fill="url(#maSeed)" stroke="#7c562b" stroke-width=".8">
        <circle cx="112" cy="94" r="3"/><circle cx="119" cy="98" r="3"/><circle cx="114" cy="100" r="2.6"/>
        <circle cx="147" cy="95" r="2.8"/><circle cx="153" cy="98" r="2.5"/>
        <circle cx="181" cy="94" r="3"/><circle cx="187" cy="97" r="2.6"/><circle cx="184" cy="100" r="2.4"/>
        <circle cx="215" cy="97" r="2.8"/><circle cx="221" cy="94" r="2.5"/>
        <circle cx="249" cy="96" r="3"/><circle cx="255" cy="99" r="2.6"/>
        <circle cx="113" cy="130" r="2.6"/><circle cx="119" cy="133" r="2.4"/>
        <circle cx="148" cy="132" r="3"/><circle cx="154" cy="129" r="2.6"/>
        <circle cx="182" cy="131" r="2.8"/><circle cx="188" cy="134" r="2.5"/>
        <circle cx="216" cy="130" r="3"/><circle cx="222" cy="133" r="2.6"/>
        <circle cx="250" cy="132" r="2.6"/><circle cx="256" cy="129" r="2.4"/>
      </g>
      <g fill="url(#maSeed)">
        <circle cx="66" cy="100" r="3.4"/><circle cx="74" cy="108" r="3"/><circle cx="68" cy="118" r="3.2"/><circle cx="78" cy="126" r="2.8"/>
        <circle cx="284" cy="102" r="3.2"/><circle cx="292" cy="112" r="3"/><circle cx="286" cy="122" r="3.4"/>
      </g>
      <g stroke="#c59a5e" stroke-width="1" opacity=".35" fill="none">
        <path d="M50 88c40-8 80-8 120 0M190 150c40-4 76-4 112-12"/>
      </g>
    </g>
    <g transform="translate(300 180) rotate(18)" filter="url(#maShadow)" class="la-float">
      <path d="M-30 0h60l-16 20h-28z" fill="#d9bd8d" stroke="#8d6334" stroke-width="1.2"/>
      <path d="M-22 0h44" stroke="#8d6334" stroke-width="1"/>
      <circle cx="-10" cy="8" r="3" fill="#b48345"/><circle cx="2" cy="10" r="2.6" fill="#b48345"/>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="54" cy="54" r="2"/><circle cx="316" cy="64" r="1.6"/>
    </g>
  `);

  /* ------------------------------ رسائل الحب ------------------------------ */
  art["love-letter"] = svg(`
    <defs>
      <radialGradient id="llHalo" cx="50%" cy="44%" r="66%">
        <stop offset="0" stop-color="#e7a8a0" stop-opacity=".34"/>
        <stop offset="1" stop-color="#853f4a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="llPaper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fdf3df"/>
        <stop offset="1" stop-color="#ddc49f"/>
      </linearGradient>
      <linearGradient id="llEnvelope" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#efd9b8"/>
        <stop offset="1" stop-color="#c9a97d"/>
      </linearGradient>
      <linearGradient id="llSeal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b44d4b"/>
        <stop offset="1" stop-color="#6f2230"/>
      </linearGradient>
      <filter id="llShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#llHalo)"/>
    <g opacity=".35" fill="none" stroke="#e8c27c">
      <circle cx="180" cy="104" r="82" stroke-dasharray="1 8"/>
    </g>
    <g filter="url(#llShadow)" class="la-float">
      <rect x="98" y="66" width="164" height="106" rx="6" fill="url(#llEnvelope)" stroke="#8f6a3c" stroke-width="1.6"/>
      <path d="M100 70 180 128 260 70" fill="url(#llPaper)" stroke="#b18e5d" stroke-width="1.4"/>
      <path d="M100 168 160 120M260 168 200 120" fill="none" stroke="#b18e5d" stroke-width="1.4"/>
      <rect x="132" y="38" width="96" height="78" rx="4" fill="url(#llPaper)" stroke="#b18e5d" stroke-width="1.2" class="la-lift"/>
      <path d="M180 76c-9-13-27-7-27 8 0 9 11 17 27 28 16-11 27-19 27-28 0-15-18-21-27-8z" fill="#b44d4b" opacity=".9"/>
      <g transform="translate(180 140)">
        <circle cx="0" cy="0" r="21" fill="url(#llSeal)" stroke="#561d24" stroke-width="1.4"/>
        <circle cx="0" cy="0" r="16" fill="none" stroke="#e2a79a" stroke-width="1" opacity=".6"/>
        <path d="M0-8c-4-6-12-3-12 3 0 4 5 7 12 11 7-4 12-7 12-11 0-6-8-9-12-3z" fill="#f0c9b4"/>
      </g>
      <path d="M116 160c20 8 42 10 64 10s44-2 64-10" fill="none" stroke="#a57e4d" stroke-width="1.4" opacity=".6"/>
    </g>
    <g fill="none" stroke="#c9a15d" stroke-width="2" opacity=".55">
      <path d="M84 92c-8 6-12 14-13 24M276 112c8-6 12-14 13-24"/>
    </g>
    <g class="la-heart" fill="#c76a6a">
      <path d="M86 56c-3-5-10-3-10 2 0 3 4 6 10 9 6-3 10-6 10-9 0-5-7-7-10-2z"/>
      <path d="M286 64c-2-4-8-2-8 2 0 2 3 4 8 7 5-3 8-5 8-7 0-4-6-6-8-2z"/>
    </g>
    <g fill="#f2d89b" class="la-spark">
      <circle cx="54" cy="144" r="1.8"/><circle cx="310" cy="150" r="1.6"/>
    </g>
  `);

  /* ------------------------------ سبْلندور ------------------------------ */
  art.splendor = svg(`
    <defs>
      <radialGradient id="spHalo" cx="48%" cy="44%" r="66%">
        <stop offset="0" stop-color="#bda6db" stop-opacity=".3"/>
        <stop offset="1" stop-color="#4d3563" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="spCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fbf2dd"/>
        <stop offset="1" stop-color="#d7bd95"/>
      </linearGradient>
      <linearGradient id="spGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6dda0"/>
        <stop offset="1" stop-color="#a5742d"/>
      </linearGradient>
      <linearGradient id="spEmerald" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6db08c"/><stop offset="1" stop-color="#1f5c46"/></linearGradient>
      <linearGradient id="spRuby" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97a72"/><stop offset="1" stop-color="#8a2c35"/></linearGradient>
      <linearGradient id="spSapphire" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ea9ce"/><stop offset="1" stop-color="#2f5577"/></linearGradient>
      <filter id="spShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".5"/>
      </filter>
    </defs>
    <circle cx="180" cy="104" r="98" fill="url(#spHalo)"/>
    <g transform="rotate(7 248 92)" filter="url(#spShadow)" class="la-float-slow">
      <rect x="208" y="26" width="80" height="118" rx="7" fill="url(#spCard)" stroke="#a88755" stroke-width="1.4"/>
      <rect x="214" y="32" width="68" height="18" rx="3" fill="#5c4a72"/>
      <circle cx="248" cy="88" r="20" fill="none" stroke="#b58f4d" stroke-width="2"/>
      <g stroke="#c9a15d" stroke-width="2.4" stroke-linecap="round">
        <path d="M248 58v-6M248 124v-6M218 88h-6M284 88h-6M227 67l-4-4M269 109l4 4M269 67l4-4M227 109l-4 4"/>
      </g>
      <circle cx="248" cy="88" r="8" fill="#b58f4d"/>
      <g fill="#8a5f2b"><circle cx="226" cy="132" r="3.4"/><circle cx="238" cy="132" r="3.4"/><circle cx="250" cy="132" r="3.4"/><circle cx="262" cy="132" r="3.4"/></g>
    </g>
    <g filter="url(#spShadow)" class="la-float">
      <path d="M126 128 146 104l20 24-20 30z" fill="url(#spEmerald)" stroke="#143d2e" stroke-width="1.4"/>
      <path d="M126 128h40M146 104l-8 24 8 30 8-30z" fill="none" stroke="#a8d8bd" stroke-width="1.2" opacity=".55"/>
      <path d="M178 104 194 90l16 14-16 22z" fill="url(#spSapphire)" stroke="#1f3b55" stroke-width="1.4"/>
      <path d="M178 104h32M194 90l-6 14 6 22 6-22z" fill="none" stroke="#b9d7ee" stroke-width="1.1" opacity=".55"/>
      <path d="M146 150 164 132l18 18-18 20z" fill="url(#spRuby)" stroke="#5f1f27" stroke-width="1.4"/>
      <path d="M146 150h36M164 132l-8 18 8 20 8-20z" fill="none" stroke="#f0b3ab" stroke-width="1.1" opacity=".55"/>
      <path d="M196 156 210 144l14 12-14 15z" fill="#332b35" stroke="#141018" stroke-width="1.4"/>
      <path d="M196 156h28M210 144l-6 12 6 15 6-15z" fill="none" stroke="#8d8295" stroke-width="1" opacity=".6"/>
      <path d="M174 174 184 164l10 10-10 12z" fill="#f1dfbd" stroke="#8f6d3b" stroke-width="1.2"/>
    </g>
    <g transform="translate(96 170)" filter="url(#spShadow)">
      <ellipse cx="0" cy="8" rx="22" ry="8" fill="url(#spGold)" stroke="#7b5622" stroke-width="1"/>
      <ellipse cx="0" cy="0" rx="22" ry="8" fill="url(#spGold)" stroke="#7b5622" stroke-width="1"/>
      <ellipse cx="0" cy="-8" rx="22" ry="8" fill="url(#spGold)" stroke="#7b5622" stroke-width="1"/>
    </g>
    <g transform="translate(314 154)" filter="url(#spShadow)" class="la-float">
      <path d="M-18 8h36l-4 9h-28z" fill="url(#spGold)" stroke="#795320" stroke-width="1.2"/>
      <path d="M-13 8 0-14 13 8Z" fill="url(#spGold)" stroke="#795320" stroke-width="1.4"/>
      <circle cx="0" cy="-14" r="2.8" fill="#f8e4ae"/>
      <circle cx="-13" cy="6" r="2.4" fill="#f8e4ae"/><circle cx="13" cy="6" r="2.4" fill="#f8e4ae"/>
    </g>
    <g fill="#f7dda5" class="la-spark">
      <path d="M150 74l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>
      <circle cx="58" cy="82" r="2"/><circle cx="310" cy="52" r="1.6"/>
      <circle cx="96" cy="114" r="1.4"/>
    </g>
  `);
})();
