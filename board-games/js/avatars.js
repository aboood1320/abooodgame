/* ==========================================================================
   ألعاب الطاولة — أفتارات اللاعب
   رسومات SVG محلية خفيفة، بأسلوب شارات دائرية موحّد.
   ========================================================================== */
(function () {
  "use strict";

  const BG = (window.BG = window.BG || {});
  const INK = "#202833";
  const WHITE = "#f8f4ec";
  let uid = 0;

  function eyes(y, spread, color, rx, ry) {
    const r = rx || 1.9;
    const h = ry || 2.55;
    const left = 32 - (spread || 5.4);
    const right = 32 + (spread || 5.4);
    return (
      '<ellipse cx="' + left + '" cy="' + y + '" rx="' + r + '" ry="' + h + '" fill="' + (color || INK) + '"/>' +
      '<ellipse cx="' + right + '" cy="' + y + '" rx="' + r + '" ry="' + h + '" fill="' + (color || INK) + '"/>' +
      '<circle cx="' + (left + 0.7) + '" cy="' + (y - 0.9) + '" r="0.62" fill="#fff" opacity=".9"/>' +
      '<circle cx="' + (right + 0.7) + '" cy="' + (y - 0.9) + '" r="0.62" fill="#fff" opacity=".9"/>'
    );
  }

  function smile(y, width, color, stroke) {
    const w = width || 7;
    return '<path d="M' + (32 - w / 2) + " " + (y || 39) + "q" + w / 2 + " " + w * 0.48 + " " + w + ' 0" fill="none" stroke="' + (color || INK) + '" stroke-width="' + (stroke || 1.5) + '" stroke-linecap="round"/>';
  }

  function blush(y, color) {
    return (
      '<ellipse cx="22.4" cy="' + (y || 37) + '" rx="2.8" ry="1.45" fill="' + (color || "#ff8f8f") + '" opacity=".42"/>' +
      '<ellipse cx="41.6" cy="' + (y || 37) + '" rx="2.8" ry="1.45" fill="' + (color || "#ff8f8f") + '" opacity=".42"/>'
    );
  }

  function bust(color, collar) {
    return (
      '<path d="M7 65c1.5-9.8 10.6-15 25-15s23.5 5.2 25 15Z" fill="' + color + '"/>' +
      (collar ? '<path d="M25.8 49.5h12.4l-1.8 9h-8.8Z" fill="' + collar + '" opacity=".92"/>' : "")
    );
  }

  function wrap(bg, deep, content) {
    const id = "avatar-wash-" + (++uid);
    return (
      '<defs><radialGradient id="' + id + '" cx="28%" cy="17%" r="98%">' +
      '<stop offset="0" stop-color="' + bg + '"/><stop offset="1" stop-color="' + deep + '"/>' +
      "</radialGradient></defs>" +
      '<circle cx="32" cy="32" r="31.5" fill="url(#' + id + ')"/>' +
      '<circle cx="22" cy="15" r="9" fill="#fff" opacity=".08"/>' +
      '<circle cx="52" cy="48" r="15" fill="#000" opacity=".08"/>' +
      '<circle cx="12" cy="45" r="1.2" fill="#fff" opacity=".24"/>' +
      '<circle cx="52" cy="14" r="1.5" fill="#fff" opacity=".2"/>' +
      content +
      '<circle cx="32" cy="32" r="31" fill="none" stroke="#fff" stroke-opacity=".13"/>'
    );
  }

  const ART = {
    human() {
      return wrap("#6e9bdd", "#294a78",
        bust("#335f9c", "#f0c6a4") +
        '<ellipse cx="32" cy="31.5" rx="16.4" ry="17.3" fill="#f3c9a8"/>' +
        '<ellipse cx="17.1" cy="35" rx="2.9" ry="4.1" fill="#eab790"/>' +
        '<ellipse cx="46.9" cy="35" rx="2.9" ry="4.1" fill="#eab790"/>' +
        '<path d="M15.2 31.4c-.7-10.3 6.7-17.4 16.8-17.4 10.4 0 17.8 7.4 16.9 17.6-2.5-4.4-5.5-7-8.4-7.7-4.5-.9-9.9-.7-15.4 2.1-3.2 1.6-6.5 4.1-9.9 5.4Z" fill="#3b2a23"/>' +
        '<path d="M19 21.2c3.4-3.7 8.3-5.2 12.6-4.4" fill="none" stroke="#68493a" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
        '<path d="M23 26.9q3-1.7 6 0M35 26.9q3-1.7 6 0" fill="none" stroke="#5b3d31" stroke-width="1.35" stroke-linecap="round" opacity=".75"/>' +
        eyes(32.5, 5.6) +
        '<path d="M31.2 37.2q.8.7 1.6 0" fill="none" stroke="#d79b78" stroke-width="1.2" stroke-linecap="round"/>' +
        smile(39.4, 7.4, "#8e5044", 1.55) +
        blush(38)
      );
    },

    cat() {
      return wrap("#4f8fa3", "#1d3d50",
        '<path d="M17.5 24.5 12.8 8l13.4 8.2Z" fill="#d9863f"/>' +
        '<path d="m17.7 20.4-2-8.3 6.1 4.4Z" fill="#f4b6af"/>' +
        '<path d="M46.5 24.5 51.2 8 37.8 16.2Z" fill="#d9863f"/>' +
        '<path d="m46.3 20.4 2-8.3-6.1 4.4Z" fill="#f4b6af"/>' +
        bust("#36516e", "#e39a50") +
        '<ellipse cx="32" cy="32" rx="17.3" ry="16.4" fill="#e8a15a"/>' +
        '<path d="M25.5 18.5 27 24M32 17.5v6.7M38.5 18.5 37 24" stroke="#b8662a" stroke-width="2" stroke-linecap="round" opacity=".75"/>' +
        '<ellipse cx="27" cy="38" rx="6.1" ry="4.5" fill="#f7d7b5"/>' +
        '<ellipse cx="37" cy="38" rx="6.1" ry="4.5" fill="#f7d7b5"/>' +
        '<path d="M29.5 35.5h5l-2.5 3Z" fill="#b55b58"/>' +
        '<path d="M32 38.5v2.1" stroke="#7c3f3f" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M29.8 40.8q2.2 1.7 4.4 0" fill="none" stroke="#7c3f3f" stroke-width="1.15" stroke-linecap="round"/>' +
        eyes(31.4, 5.8, "#406b47") +
        '<path d="M12 35.5h8M12.5 39.5l7.5 1M52 35.5h-8M51.5 39.5l-7.5 1" stroke="#f7e5cf" stroke-width="1.15" stroke-linecap="round" opacity=".8"/>' +
        blush(37.5, "#e87979")
      );
    },

    dog() {
      return wrap("#6f91c4", "#293d60",
        '<ellipse cx="12.6" cy="30.5" rx="6" ry="11.8" transform="rotate(26 12.6 30.5)" fill="#6f4327"/>' +
        '<ellipse cx="51.4" cy="30.5" rx="6" ry="11.8" transform="rotate(-26 51.4 30.5)" fill="#6f4327"/>' +
        '<ellipse cx="13.8" cy="31" rx="2.6" ry="7.2" transform="rotate(26 13.8 31)" fill="#a06a43" opacity=".55"/>' +
        '<ellipse cx="50.2" cy="31" rx="2.6" ry="7.2" transform="rotate(-26 50.2 31)" fill="#a06a43" opacity=".55"/>' +
        bust("#4a6a52", "#f0c08a") +
        '<ellipse cx="32" cy="31.5" rx="16.8" ry="16.5" fill="#d9a568"/>' +
        '<ellipse cx="32" cy="39.2" rx="9.2" ry="7.1" fill="#f5ddc0"/>' +
        '<ellipse cx="32" cy="34.7" rx="3.5" ry="2.6" fill="#3c2b26"/>' +
        '<path d="M32 37.3v2.6" stroke="#755041" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M28.6 40.5q3.4 2.5 6.8 0" fill="none" stroke="#755041" stroke-width="1.25" stroke-linecap="round"/>' +
        '<ellipse cx="32" cy="44" rx="3.4" ry="2.9" fill="#e7797c"/>' +
        eyes(31, 6, "#3f312b") +
        '<path d="M23 26.2q3-1.8 6-.5M35 25.7q3-1.3 6 .5" fill="none" stroke="#8d643e" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>' +
        blush(39.5, "#e77f7f")
      );
    },

    car() {
      return wrap("#6fb2de", "#285173",
        '<ellipse cx="32" cy="54" rx="21" ry="4.2" fill="#000" opacity=".22"/>' +
        '<path d="M9 37h46l-3.2 12.5H12.2Z" fill="#e76f51"/>' +
        '<path d="M15 37 20 25h24l5 12Z" fill="#f4a261"/>' +
        '<path d="M22 27h9v8h-6Z" fill="#bfe6fa"/>' +
        '<path d="M33 27h9l3.4 8H33Z" fill="#bfe6fa"/>' +
        '<rect x="12" y="41" width="9" height="4.2" rx="2.1" fill="#ffe6a1"/>' +
        '<rect x="43" y="41" width="9" height="4.2" rx="2.1" fill="#ffd0b8"/>' +
        '<circle cx="19" cy="50" r="5.2" fill="#26313e"/><circle cx="19" cy="50" r="2.3" fill="#9aa8b5"/>' +
        '<circle cx="45" cy="50" r="5.2" fill="#26313e"/><circle cx="45" cy="50" r="2.3" fill="#9aa8b5"/>' +
        '<path d="M29 19h6M32 16v6" stroke="#fff" stroke-width="2.1" stroke-linecap="round" opacity=".75"/>' +
        '<circle cx="13" cy="20" r="1.3" fill="#fff" opacity=".35"/><circle cx="51" cy="30" r="1.1" fill="#fff" opacity=".28"/>'
      );
    },

    alien() {
      return wrap("#5b7fb8", "#23375f",
        '<path d="M18 20c-2-7 2-11 5-7M46 20c2-7-2-11-5-7" fill="none" stroke="#8ce1b8" stroke-width="1.7" stroke-linecap="round"/>' +
        '<circle cx="17" cy="11" r="2.2" fill="#a6f0cc"/><circle cx="47" cy="11" r="2.2" fill="#a6f0cc"/>' +
        bust("#3a4d6c", "#83dfb2") +
        '<path d="M32 9c10.2 0 17 7.5 17 17.6C49 41 41.5 49 32 49S15 41 15 26.6C15 16.5 21.8 9 32 9Z" fill="#7fd6a4"/>' +
        '<path d="M32 12.5c8 0 13.4 6.3 13.4 14.4" fill="none" stroke="#b6f0cf" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
        '<ellipse cx="25.6" cy="30" rx="5.1" ry="7.1" transform="rotate(18 25.6 30)" fill="#22303a"/>' +
        '<ellipse cx="38.4" cy="30" rx="5.1" ry="7.1" transform="rotate(-18 38.4 30)" fill="#22303a"/>' +
        '<circle cx="27.1" cy="27.6" r="1.1" fill="#fff" opacity=".9"/><circle cx="39.9" cy="27.6" r="1.1" fill="#fff" opacity=".9"/>' +
        '<path d="M28.5 40q3.5 2.4 7 0" fill="none" stroke="#3f7f61" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="21" cy="38" r="1.8" fill="#c4f5dc" opacity=".35"/><circle cx="43" cy="38" r="1.8" fill="#c4f5dc" opacity=".35"/>'
      );
    },

    rabbit() {
      return wrap("#b9a6dd", "#4a3d70",
        '<ellipse cx="23" cy="17" rx="5.1" ry="13.8" transform="rotate(-11 23 17)" fill="#f5eee8"/>' +
        '<ellipse cx="41" cy="17" rx="5.1" ry="13.8" transform="rotate(11 41 17)" fill="#f5eee8"/>' +
        '<ellipse cx="23.2" cy="16.5" rx="2.2" ry="9.4" transform="rotate(-11 23.2 16.5)" fill="#efb7c6"/>' +
        '<ellipse cx="40.8" cy="16.5" rx="2.2" ry="9.4" transform="rotate(11 40.8 16.5)" fill="#efb7c6"/>' +
        bust("#5b609c", "#f3e9df") +
        '<ellipse cx="32" cy="33" rx="16.6" ry="15.8" fill="#f7f1ea"/>' +
        '<ellipse cx="32" cy="38.2" rx="8" ry="6.1" fill="#fffaf5"/>' +
        '<path d="M29.4 35.2h5.2l-2.6 3.1Z" fill="#e8899c"/>' +
        '<path d="M32 38.3v1.6M29.6 40.7q2.4 1.8 4.8 0" fill="none" stroke="#b17782" stroke-width="1.15" stroke-linecap="round"/>' +
        eyes(31, 5.8, "#4c3d58") +
        blush(38.8, "#ef9eae") +
        '<path d="M12 34h7M13 38.5l6 1M52 34h-7M51 38.5l-6 1" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".65"/>'
      );
    },

    fox() {
      return wrap("#5d9a72", "#1e4835",
        '<path d="M17 24 13 7l13.7 8.4Z" fill="#e07b3e"/>' +
        '<path d="m17.3 20.3-1.7-8.1 6 4.6Z" fill="#3f2d2b"/>' +
        '<path d="M47 24 51 7 37.3 15.4Z" fill="#e07b3e"/>' +
        '<path d="m46.7 20.3 1.7-8.1-6 4.6Z" fill="#3f2d2b"/>' +
        bust("#3f5e74", "#f3d3b8") +
        '<ellipse cx="32" cy="31.5" rx="17" ry="16.3" fill="#e88445"/>' +
        '<path d="M15.5 31.2c3.8 1.8 6.7 4.7 8.6 8.1-3.5-.7-6.4-2.2-8.6-4.6ZM48.5 31.2c-3.8 1.8-6.7 4.7-8.6 8.1 3.5-.7 6.4-2.2 8.6-4.6Z" fill="#f9e3ca"/>' +
        '<path d="M23.5 39.3c2.5-3.7 5.2-5.5 8.5-5.5s6 1.8 8.5 5.5c-2.2 2.2-5 3.3-8.5 3.3s-6.3-1.1-8.5-3.3Z" fill="#fff4e7"/>' +
        '<path d="M29.7 36.1h4.6l-2.3 2.9Z" fill="#3c2a28"/>' +
        '<path d="M32 39v1.6" stroke="#8c5d43" stroke-width="1.15" stroke-linecap="round"/>' +
        eyes(30.7, 5.9, "#4b342d") +
        blush(37.3, "#e86d67") +
        '<path d="M25.8 25.4q2.4-1.4 4.8-.4M38.2 25.4q-2.4-1.4-4.8-.4" fill="none" stroke="#9c512c" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>'
      );
    },

    robot() {
      return wrap("#75b8c9", "#244e63",
        '<path d="M32 8v8" stroke="#b8d6e2" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="32" cy="7" r="3.2" fill="#ffcf6e"/><circle cx="31" cy="6" r="1" fill="#fff" opacity=".8"/>' +
        bust("#436b86", "#c9dde6") +
        '<rect x="16" y="15" width="32" height="31" rx="9" fill="#dbe7ed"/>' +
        '<rect x="19.5" y="18.5" width="25" height="19" rx="6" fill="#2b4352"/>' +
        '<circle cx="26" cy="27" r="2.5" fill="#7ff0d2"/><circle cx="38" cy="27" r="2.5" fill="#7ff0d2"/>' +
        '<circle cx="26.7" cy="26.2" r=".7" fill="#fff"/><circle cx="38.7" cy="26.2" r=".7" fill="#fff"/>' +
        '<path d="M26 32.5h12" stroke="#7ff0d2" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>' +
        '<rect x="15" y="31" width="4" height="11" rx="2" fill="#aebfc9"/>' +
        '<rect x="45" y="31" width="4" height="11" rx="2" fill="#aebfc9"/>' +
        '<circle cx="21.5" cy="41.5" r="1.1" fill="#ffcf6e"/><circle cx="42.5" cy="41.5" r="1.1" fill="#ffcf6e"/>' +
        '<path d="M26 48h12" stroke="#7a96a5" stroke-width="2" stroke-linecap="round" opacity=".55"/>'
      );
    },

    dinosaur() {
      return wrap("#5f86c4", "#243a63",
        '<path d="M20 19 22.5 9l5.2 6.7L32 7.5l4.3 8.2L41.5 9l2.5 10" fill="#3e8f58"/>' +
        bust("#5d4a79", "#9bd99a") +
        '<path d="M32 13c11 0 18 7.6 18 17.5 0 4.1-1.3 7.7-3.7 10.4H17.7c-2.4-2.7-3.7-6.3-3.7-10.4C14 20.6 21 13 32 13Z" fill="#73c283"/>' +
        '<path d="M20 39.8h24c-2.8 4.4-7 6.6-12 6.6s-9.2-2.2-12-6.6Z" fill="#a3dfa2"/>' +
        '<ellipse cx="25.5" cy="30.2" rx="2.1" ry="2.8" fill="#223b2b"/>' +
        '<ellipse cx="38.5" cy="30.2" rx="2.1" ry="2.8" fill="#223b2b"/>' +
        '<circle cx="26.2" cy="29.3" r=".6" fill="#fff"/><circle cx="39.2" cy="29.3" r=".6" fill="#fff"/>' +
        '<ellipse cx="29.5" cy="35.5" rx="1" ry=".7" fill="#5c9b63"/><ellipse cx="34.5" cy="35.5" rx="1" ry=".7" fill="#5c9b63"/>' +
        '<path d="M26.5 40q2.8 2.1 5.5 2.1 2.7 0 5.5-2.1" fill="none" stroke="#4b8256" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="m28 41.8.6 1.7 1.2-1.4 1.2 1.7 1.2-1.7 1.2 1.4.6-1.7" fill="#fff8e8"/>' +
        '<circle cx="20.5" cy="34" r="1.7" fill="#ffb08d" opacity=".45"/>' +
        '<circle cx="43.5" cy="34" r="1.7" fill="#ffb08d" opacity=".45"/>'
      );
    },

    rocket() {
      return wrap("#7d9fe0", "#293c74",
        '<path d="M32 7c8.2 7.2 12.2 16.6 12.2 28.2H19.8C19.8 23.6 23.8 14.2 32 7Z" fill="#eef4fb"/>' +
        '<path d="M32 10.2c5.7 5.5 8.7 12.8 9.1 21.2H22.9c.4-8.4 3.4-15.7 9.1-21.2Z" fill="#dce8f5"/>' +
        '<circle cx="32" cy="24" r="6.2" fill="#5a9dcc"/>' +
        '<circle cx="32" cy="24" r="4.1" fill="#bfe8ff"/>' +
        '<path d="M30 21.2c.6-1 1.8-1.7 3.1-1.7" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>' +
        '<path d="M20.5 35.2 13.8 45l7.8-1.8Z" fill="#e76f51"/>' +
        '<path d="M43.5 35.2 50.2 45l-7.8-1.8Z" fill="#e76f51"/>' +
        '<path d="M26.3 43h11.4c-.9 5.2-3 9.4-5.7 12.6C29.3 52.4 27.2 48.2 26.3 43Z" fill="#ffb703"/>' +
        '<path d="M29.5 45.3h5c-.6 2.4-1.4 4.5-2.5 6.2-1.1-1.7-1.9-3.8-2.5-6.2Z" fill="#fb8500"/>' +
        '<circle cx="15" cy="19" r="1.3" fill="#fff" opacity=".55"/><circle cx="49" cy="29" r="1.1" fill="#fff" opacity=".45"/><circle cx="43" cy="11" r="1.5" fill="#fff" opacity=".3"/>'
      );
    },

    panda() {
      return wrap("#a9b7c8", "#3f5065",
        '<circle cx="18.2" cy="19.5" r="6.6" fill="#2b3038"/>' +
        '<circle cx="45.8" cy="19.5" r="6.6" fill="#2b3038"/>' +
        bust("#495a70", "#f2f2ed") +
        '<ellipse cx="32" cy="32" rx="17.1" ry="16.6" fill="#f5f3ee"/>' +
        '<ellipse cx="24.4" cy="30.7" rx="5.4" ry="6.6" transform="rotate(18 24.4 30.7)" fill="#2b3038"/>' +
        '<ellipse cx="39.6" cy="30.7" rx="5.4" ry="6.6" transform="rotate(-18 39.6 30.7)" fill="#2b3038"/>' +
        '<circle cx="24.8" cy="30.4" r="2.1" fill="#f5f3ee"/><circle cx="39.2" cy="30.4" r="2.1" fill="#f5f3ee"/>' +
        '<circle cx="25.4" cy="29.7" r="1.1" fill="#202833"/><circle cx="39.8" cy="29.7" r="1.1" fill="#202833"/>' +
        '<ellipse cx="32" cy="37.8" rx="3.6" ry="2.6" fill="#2b3038"/>' +
        '<path d="M32 40.2v1.8M29.4 42.5q2.6 1.8 5.2 0" fill="none" stroke="#555b62" stroke-width="1.2" stroke-linecap="round"/>' +
        blush(39.8, "#ef9fa4")
      );
    },

    unicorn() {
      return wrap("#cbb6ea", "#574478",
        '<path d="M32 5.5 37.4 21h-10.8Z" fill="#ffd166"/>' +
        '<path d="M28.5 18.5 33 7.2M35 18.5l-1.7-9" stroke="#f0a93e" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>' +
        '<path d="M18 26 13.5 12l10.3 7.6Z" fill="#f4efe9"/><path d="m16.5 22.5-1.4-5.5 4.1 3.2Z" fill="#efc1d2"/>' +
        '<path d="M46 26 50.5 12 40.2 19.6Z" fill="#f4efe9"/><path d="m47.5 22.5 1.4-5.5-4.1 3.2Z" fill="#efc1d2"/>' +
        '<path d="M16.2 28c-5.4 5-7.1 12.8-4.2 18.6 3.6-2 6-5.3 7.2-9.5" fill="#f06fa4"/>' +
        '<path d="M47.8 28c5.4 5 7.1 12.8 4.2 18.6-3.6-2-6-5.3-7.2-9.5" fill="#58c7c3"/>' +
        '<path d="M26 23c-3.5 4.8-5 11.2-4.4 18.1-3.2-1.2-5.6-3.2-7.2-5.8" fill="#a97be0"/>' +
        '<path d="M38 23c3.5 4.8 5 11.2 4.4 18.1 3.2-1.2 5.6-3.2 7.2-5.8" fill="#ffd166"/>' +
        bust("#6c5a9c", "#f7f0e7") +
        '<ellipse cx="32" cy="33" rx="16" ry="15.4" fill="#f7f2ea"/>' +
        '<ellipse cx="32" cy="39.2" rx="8.3" ry="6.3" fill="#fffaf4"/>' +
        '<path d="M29.4 36.2h5.2l-2.6 2.8Z" fill="#d8a3b7"/>' +
        '<path d="M32 39v1.5M29.7 41.2q2.3 1.6 4.6 0" fill="none" stroke="#b98a9d" stroke-width="1.15" stroke-linecap="round"/>' +
        eyes(31.8, 5.7, "#4e3d6b") +
        '<path d="M22.5 27q2.8-1.6 5.4 0M36.1 27q2.8-1.6 5.4 0" fill="none" stroke="#cdb6d7" stroke-width="1.4" stroke-linecap="round"/>' +
        blush(39.6, "#eaa1b3")
      );
    },

    astronaut() {
      return wrap("#7e9fd8", "#263b66",
        bust("#e6edf5", "#a9c3dd") +
        '<circle cx="32" cy="29.5" r="18" fill="#dfe8f1"/>' +
        '<circle cx="32" cy="29.5" r="14.7" fill="#38536e"/>' +
        '<path d="M20.8 25.5c2.3-4.7 6.5-7.4 11.2-7.4 5.2 0 9.3 2.6 11.4 7.3" fill="none" stroke="#9fd8ff" stroke-width="2.1" stroke-linecap="round" opacity=".55"/>' +
        '<ellipse cx="32" cy="31.5" rx="10.4" ry="10.8" fill="#f2c9a7"/>' +
        '<path d="M23.8 29.7c.4-5 3.8-8.4 8.2-8.4 4.6 0 7.9 3.4 8.2 8.4-1.8-2.4-4.1-3.6-6.8-3.6-2.6 0-4.8 1.2-6.6 3.6Z" fill="#4a352b"/>' +
        eyes(31, 4.9, "#32445c", 1.6, 2.1) +
        smile(37.8, 5.8, "#9a604d", 1.3) +
        '<path d="M16.5 44.5h31" stroke="#b9c9d9" stroke-width="1.6" stroke-linecap="round"/>' +
        '<rect x="23" y="47.5" width="18" height="5.5" rx="2.4" fill="#89a7c2"/>' +
        '<circle cx="27" cy="50.2" r="1.1" fill="#7ff0d2"/><circle cx="32" cy="50.2" r="1.1" fill="#ffcf6e"/><circle cx="37" cy="50.2" r="1.1" fill="#ff8f8f"/>' +
        '<circle cx="16.8" cy="29.5" r="2.1" fill="#b9c9d9"/><circle cx="47.2" cy="29.5" r="2.1" fill="#b9c9d9"/>'
      );
    },

    wizard() {
      return wrap("#6f7fc4", "#28325f",
        '<path d="M32 5 21.5 26.5h21Z" fill="#5c439b"/>' +
        '<path d="M16.5 27.2c7.6-2 23.4-2 31 0l-2.2 4.4c-8.1-1.8-18.5-1.8-26.6 0Z" fill="#4b3586"/>' +
        '<path d="m33 10 1.3 3.9 4.2.1-3.3 2.5 1.2 4-3.4-2.4-3.4 2.4 1.2-4-3.3-2.5 4.2-.1Z" fill="#ffd166"/>' +
        '<circle cx="24.5" cy="19.5" r="1.1" fill="#ffd166"/><circle cx="40.5" cy="17.5" r=".9" fill="#ffd166"/>' +
        bust("#4c3a72", "#f3efe7") +
        '<ellipse cx="32" cy="33" rx="14.4" ry="14.8" fill="#f0c7a6"/>' +
        '<path d="M23 31.3c.3-4.4 3.8-7.6 9-7.6 5.1 0 8.6 3.2 8.9 7.6-2.5-2.2-5.5-3.4-9-3.4-3.4 0-6.4 1.2-8.9 3.4Z" fill="#e7e1d5"/>' +
        '<path d="M22 38c.5 8.2 4.3 14.3 10 17.4 5.7-3.1 9.5-9.2 10-17.4-2.7 2.7-6 4.1-10 4.1s-7.3-1.4-10-4.1Z" fill="#f4f0e8"/>' +
        '<path d="M26.5 41.5c1.5 1 3.4 1.5 5.5 1.5s4-.5 5.5-1.5" fill="none" stroke="#d5cdc0" stroke-width="1.3" stroke-linecap="round"/>' +
        eyes(31.3, 5, "#4a3b39") +
        '<path d="M28.5 36.2q3.5 2.2 7 0" fill="none" stroke="#b9846f" stroke-width="1.25" stroke-linecap="round"/>' +
        '<path d="M26.5 26.4q2.2-1.3 4.3 0M33.2 26.4q2.2-1.3 4.3 0" fill="none" stroke="#cfc5b6" stroke-width="1.35" stroke-linecap="round"/>' +
        blush(38.6, "#e79b9b")
      );
    },

    pirate() {
      return wrap("#567c9b", "#223d57",
        '<path d="M16 23c3-8.5 9.2-12.6 16-12.6S45 14.5 48 23c-5.5-2-10.8-3-16-3s-10.5 1-16 3Z" fill="#b73b3f"/>' +
        '<path d="M45.5 18.5c4.5-1.7 6.7 4.4 2.2 6.4-2.2 1-4-.1-4.2-1.9" fill="#b73b3f"/>' +
        '<path d="M46.8 20.5c2.6.1 2.4 2.9-.2 3.2" fill="none" stroke="#e77b78" stroke-width="1.2" stroke-linecap="round"/>' +
        bust("#34465f", "#e7bc95") +
        '<ellipse cx="32" cy="32" rx="16.7" ry="16.2" fill="#dda67d"/>' +
        '<path d="M18 25.5c7 1.5 21 1.5 28 0" fill="none" stroke="#8f363a" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>' +
        '<path d="M20.5 25.5q0 3.8.8 7.2M43.5 25.5q0 3.8-.8 7.2" fill="none" stroke="#e9c39f" stroke-width="2.1" stroke-linecap="round"/>' +
        '<ellipse cx="38.7" cy="31.2" rx="4.1" ry="3.4" fill="#2b3038"/>' +
        '<path d="M34.7 29.8c2.7-1 5.4-1 8 0" fill="none" stroke="#2b3038" stroke-width="1.5" stroke-linecap="round"/>' +
        eyes(31.3, 5.5, "#332b2b") +
        '<path d="M22.7 26.7q2.8-1.8 5.5-.5M32 26.2q2.8-1.3 5.5.5" fill="none" stroke="#6f4b35" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>' +
        '<path d="M27.3 40.5q4.7 3.5 9.4 0" fill="none" stroke="#8c5743" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M28.7 41.2q1.3 1 2.4 1.2M35.3 42.4q1.1-.2 2.2-1.2" fill="none" stroke="#f5e7d6" stroke-width="1.1" stroke-linecap="round"/>' +
        '<circle cx="47.7" cy="38.4" r="2.1" fill="none" stroke="#ffd166" stroke-width="1.4"/>' +
        '<path d="M25.5 44.8c4.4 1.2 8.6 1.2 13 0" fill="none" stroke="#7f523d" stroke-width="2.1" stroke-linecap="round" opacity=".35"/>'
      );
    },

    ninja() {
      return wrap("#6e7fa8", "#252e4c",
        '<path d="M46 23c6.4 1.7 8 8.3 3.4 12.1-2.5 2-5.1 1.7-6.2-.2 3.2-3.4 4.3-7.8 2.8-11.9Z" fill="#2e3557"/>' +
        bust("#39415f", "#dfae88") +
        '<path d="M32 12c10.6 0 17.3 7.2 17.3 17.3 0 3.6-.7 6.9-2.1 9.7H16.8c-1.4-2.8-2.1-6.1-2.1-9.7C14.7 19.2 21.4 12 32 12Z" fill="#2e3557"/>' +
        '<path d="M17.5 29.5h29v8.8h-29Z" fill="#e3b18c"/>' +
        '<path d="M14.5 27.6c10.7-2 24.3-2 35 0l-.6 4.3c-10.4-2-23.4-2-33.8 0Z" fill="#c94f4f"/>' +
        eyes(32.7, 5.5, "#232323") +
        '<path d="M22.7 33.9q2.8-1.5 5.4-.2M35.9 33.7q2.6-1.3 5.4.2" fill="none" stroke="#8d6650" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>' +
        '<path d="M13 25.5c4.5-3.1 9.3-4.7 14.4-4.7M51 25.5c-4.5-3.1-9.3-4.7-14.4-4.7" fill="none" stroke="#4c557c" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>'
      );
    },

    king() {
      return wrap("#a65d6b", "#4a2433",
        '<path d="M17 22 14 9l9 6 9-10 9 10 9-6-3 13Z" fill="#ffd166"/>' +
        '<path d="M19 19.5h26" stroke="#e3a83c" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="14" cy="9" r="2.2" fill="#ff8f8f"/><circle cx="32" cy="5" r="2.4" fill="#7fd6d0"/><circle cx="50" cy="9" r="2.2" fill="#8fb3ff"/>' +
        '<circle cx="32" cy="16" r="1.5" fill="#ff8f8f"/>' +
        bust("#7c4a35", "#f4e7d4") +
        '<ellipse cx="32" cy="33" rx="14.8" ry="15.2" fill="#eec39d"/>' +
        '<path d="M22.5 43.5c2.3 5.3 5.5 8 9.5 8s7.2-2.7 9.5-8c-2.7 1.3-5.9 2-9.5 2s-6.8-.7-9.5-2Z" fill="#f4f0e8"/>' +
        '<path d="M26.5 44.2q2.8-1.2 5.5-1.2t5.5 1.2" fill="none" stroke="#d7ccbd" stroke-width="1.2" stroke-linecap="round"/>' +
        eyes(31.2, 5.1, "#40332e") +
        '<path d="M28.2 36.4q3.8 2.5 7.6 0" fill="none" stroke="#b47d66" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M25.8 26.7q2.5-1.5 5 0M33.2 26.7q2.5-1.5 5 0" fill="none" stroke="#b08a6e" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M15.5 48.5c5-3.2 11-4.8 16.5-4.8s11.5 1.6 16.5 4.8" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" opacity=".7"/>'
      );
    },

    knight() {
      return wrap("#7b5b8f", "#332544",
        '<path d="M32 3c4.7 2.5 6.3 7.3 4.7 12.8h-9.4C25.7 10.3 27.3 5.5 32 3Z" fill="#e76f51"/>' +
        '<path d="M32 4.5c2.7 2.2 3.6 5.4 2.8 9.4" fill="none" stroke="#ffb59f" stroke-width="1.4" stroke-linecap="round"/>' +
        bust("#526681", "#c8d2dc") +
        '<path d="M16.5 26c0-9.1 6.6-15.6 15.5-15.6S47.5 16.9 47.5 26v11.2c0 6.3-6.3 10.4-15.5 10.4s-15.5-4.1-15.5-10.4Z" fill="#c7d1db"/>' +
        '<path d="M18.5 25.5c0-7.5 5.5-12.8 13.5-12.8s13.5 5.3 13.5 12.8" fill="none" stroke="#eef2f6" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M18 28.5h28v4H18Z" fill="#4b5b70"/>' +
        '<rect x="23" y="30" width="7.4" height="2.3" rx="1.1" fill="#9fe3ff"/>' +
        '<rect x="33.6" y="30" width="7.4" height="2.3" rx="1.1" fill="#9fe3ff"/>' +
        '<path d="M26 38.5h12" stroke="#6d7d91" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M20 36.2c7.8 2 16.2 2 24 0" fill="none" stroke="#aebdcc" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
        '<circle cx="32" cy="41.5" r="1.1" fill="#ffd166"/>'
      );
    },

    penguin() {
      return wrap("#7fb5cf", "#274b62",
        bust("#354b63", "#eef2f2") +
        '<ellipse cx="32" cy="31.5" rx="17.2" ry="16.8" fill="#2e3742"/>' +
        '<path d="M32 20c7.2 0 12.4 5.1 12.4 12.1 0 6.8-5.4 11.6-12.4 11.6S19.6 38.9 19.6 32.1C19.6 25.1 24.8 20 32 20Z" fill="#f5f3ee"/>' +
        '<path d="M32 39.5 28.2 36h7.6Z" fill="#f6a23c"/>' +
        '<path d="M32 39.5V42" stroke="#d78a2f" stroke-width="1.2" stroke-linecap="round"/>' +
        '<circle cx="25.7" cy="29.5" r="2.4" fill="#202833"/><circle cx="38.3" cy="29.5" r="2.4" fill="#202833"/>' +
        '<circle cx="26.4" cy="28.8" r=".7" fill="#fff"/><circle cx="39" cy="28.8" r=".7" fill="#fff"/>' +
        blush(36.4, "#ff9ca5") +
        '<path d="M18.2 43.5c-2.8 4-3.2 8.5-1.4 13.5H24c-1.2-4.4-.6-8.9 1.9-13.5Z" fill="#3e4d5f"/>' +
        '<path d="M45.8 43.5c2.8 4 3.2 8.5 1.4 13.5H40c1.2-4.4.6-8.9-1.9-13.5Z" fill="#3e4d5f"/>'
      );
    },

    lion() {
      return wrap("#4f8b68", "#1d3b2e",
        '<path d="M32 8.5c4.2-2.3 8.6 1.8 7.3 6 3.9-.9 7.4 3.6 5.3 7.2 3.7.5 6 5.4 3 8.1 3.4 2.1 3.9 7.2.3 9.5 2.4 3.5.6 8.1-3.4 8.6.8 4-2.6 7.2-6.4 5.9-1.2 3.7-6 5.1-8.8 2.5-2.3 3.2-7.2 3.4-9.6.2-3 2.7-7.8 1.2-8.8-2.5-3.8 1.3-7.2-1.9-6.4-5.9-4-.5-5.8-5.1-3.4-8.6-3.6-2.3-3.1-7.4.3-9.5-3-2.7-.7-7.6 3-8.1-2.1-3.6 1.4-8.1 5.3-7.2-1.3-4.2 3.1-8.3 7.3-6Z" fill="#b96d2d"/>' +
        bust("#56663f", "#e7bd83") +
        '<ellipse cx="32" cy="33" rx="15.4" ry="15.6" fill="#e7ae63"/>' +
        '<path d="M20.5 20.5 21 13l6 5.4M43.5 20.5 43 13l-6 5.4" fill="#d7954d"/>' +
        '<ellipse cx="32" cy="39.5" rx="9.4" ry="7.1" fill="#f3d5a7"/>' +
        '<path d="M28.7 35.4h6.6l-3.3 3.3Z" fill="#7b4a32"/>' +
        '<path d="M32 38.7v1.8M29.3 41q2.7 1.8 5.4 0" fill="none" stroke="#9c6b48" stroke-width="1.2" stroke-linecap="round"/>' +
        eyes(30.3, 5.5, "#4a3422") +
        '<path d="M22.5 26.3q2.9-1.4 5.5-.2M36 26.1q2.6-1.2 5.5.2" fill="none" stroke="#a76a34" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>' +
        blush(37.5, "#d97b66")
      );
    },

    tiger() {
      return wrap("#567fb0", "#203a63",
        '<circle cx="17.5" cy="19.5" r="6.3" fill="#d9863f"/><circle cx="46.5" cy="19.5" r="6.3" fill="#d9863f"/>' +
        '<circle cx="17.5" cy="19.5" r="3.2" fill="#f2b8a6"/><circle cx="46.5" cy="19.5" r="3.2" fill="#f2b8a6"/>' +
        bust("#3f5b55", "#e8ad66") +
        '<ellipse cx="32" cy="31.8" rx="17" ry="16.2" fill="#e8a559"/>' +
        '<path d="M24 17.5 26 23M32 16.5v6.5M40 17.5 38 23" stroke="#4a332a" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M16.2 29c3 1.2 5.4 2.9 7.2 5.2M47.8 29c-3 1.2-5.4 2.9-7.2 5.2M18 37.5c2.4.2 4.5.9 6.3 2.1M46 37.5c-2.4.2-4.5.9-6.3 2.1" fill="none" stroke="#4a332a" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>' +
        '<ellipse cx="27" cy="38.3" rx="6.2" ry="4.7" fill="#f9e7cf"/><ellipse cx="37" cy="38.3" rx="6.2" ry="4.7" fill="#f9e7cf"/>' +
        '<path d="M29.4 35.6h5.2l-2.6 3Z" fill="#7c4439"/>' +
        '<path d="M32 38.5v1.8M29.6 40.9q2.4 1.6 4.8 0" fill="none" stroke="#8f5f49" stroke-width="1.15" stroke-linecap="round"/>' +
        eyes(30.5, 5.7, "#3e5b3d") +
        '<path d="M12 34.5h7M13 38l6 1M52 34.5h-7M51 38l-6 1" stroke="#fff5e7" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>' +
        blush(37.2, "#de7c68")
      );
    },

    koala() {
      return wrap("#8e7ab5", "#3a2c5e",
        '<circle cx="15.8" cy="23" r="8.2" fill="#9aa9b8"/><circle cx="48.2" cy="23" r="8.2" fill="#9aa9b8"/>' +
        '<circle cx="15.8" cy="23" r="5.1" fill="#d7dfe5"/><circle cx="48.2" cy="23" r="5.1" fill="#d7dfe5"/>' +
        bust("#4f6578", "#c7d1d8") +
        '<ellipse cx="32" cy="32.5" rx="16.3" ry="16" fill="#a8b6c2"/>' +
        '<ellipse cx="32" cy="37.5" rx="6.6" ry="5.3" fill="#3a4650"/>' +
        '<ellipse cx="32" cy="36.3" rx="2.1" ry="1.2" fill="#6e7d88" opacity=".8"/>' +
        '<path d="M28.8 41.8q3.2 2 6.4 0" fill="none" stroke="#647686" stroke-width="1.2" stroke-linecap="round"/>' +
        eyes(30.3, 5.8, "#263440") +
        '<path d="M23 25.8q2.8-1.5 5.5 0M35.5 25.8q2.7-1.5 5.5 0" fill="none" stroke="#7f919f" stroke-width="1.4" stroke-linecap="round"/>' +
        blush(37.5, "#d78f95")
      );
    },

    bear() {
      return wrap("#4f8f8f", "#1d4046",
        '<circle cx="15.4" cy="18.6" r="7.3" fill="#9d6a42"/><circle cx="48.6" cy="18.6" r="7.3" fill="#9d6a42"/>' +
        '<circle cx="15.4" cy="18.6" r="3.7" fill="#d9b18a"/><circle cx="48.6" cy="18.6" r="3.7" fill="#d9b18a"/>' +
        bust("#496558", "#d8aa78") +
        '<ellipse cx="32" cy="31.8" rx="17" ry="16.4" fill="#b98555"/>' +
        '<ellipse cx="32" cy="38.8" rx="9.3" ry="7.1" fill="#e7cba8"/>' +
        '<ellipse cx="32" cy="35" rx="3.7" ry="2.7" fill="#3f2b25"/>' +
        '<path d="M32 37.6v2.4M28.6 40.5q3.4 2.4 6.8 0" fill="none" stroke="#8b6149" stroke-width="1.25" stroke-linecap="round"/>' +
        eyes(30.4, 5.8, "#362a24") +
        '<path d="M22.7 25.7q2.8-1.5 5.4-.1M35.9 25.6q2.6-1.4 5.4.1" fill="none" stroke="#805733" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>' +
        blush(37.8, "#c67863")
      );
    },

    owl() {
      return wrap("#6289b8", "#253b5e",
        '<path d="M18 19 15 9l9.2 6.4M46 19 49 9l-9.2 6.4" fill="#6b579e"/>' +
        bust("#4c3a75", "#b5a4dd") +
        '<path d="M32 14c10.8 0 17.5 7.4 17.5 17.4 0 10.2-7.2 16.6-17.5 16.6S14.5 41.6 14.5 31.4C14.5 21.4 21.2 14 32 14Z" fill="#6d589c"/>' +
        '<path d="M32 14c7.7 0 13.3 3.8 16 10.1-4.7-2.2-10.1-3.3-16-3.3s-11.3 1.1-16 3.3C18.7 17.8 24.3 14 32 14Z" fill="#8571b3"/>' +
        '<circle cx="24.6" cy="29.5" r="7.2" fill="#efe9f6"/><circle cx="39.4" cy="29.5" r="7.2" fill="#efe9f6"/>' +
        '<circle cx="24.6" cy="29.5" r="4.2" fill="#ffcf6e"/><circle cx="39.4" cy="29.5" r="4.2" fill="#ffcf6e"/>' +
        '<circle cx="24.6" cy="29.5" r="2.2" fill="#2b2636"/><circle cx="39.4" cy="29.5" r="2.2" fill="#2b2636"/>' +
        '<circle cx="25.3" cy="28.7" r=".7" fill="#fff"/><circle cx="40.1" cy="28.7" r=".7" fill="#fff"/>' +
        '<path d="M32 33.2 28.6 37h6.8Z" fill="#f2a44d"/>' +
        '<path d="M22 43.5c3.4-1.5 6.7-2.2 10-2.2s6.6.7 10 2.2" fill="none" stroke="#8f7ebf" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>' +
        '<path d="M25 47.5c2.3-1 4.6-1.5 7-1.5s4.7.5 7 1.5" fill="none" stroke="#8f7ebf" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>'
      );
    },

    frog() {
      return wrap("#5e7fc0", "#253866",
        '<circle cx="21.5" cy="19.5" r="7.2" fill="#7cc47c"/><circle cx="42.5" cy="19.5" r="7.2" fill="#7cc47c"/>' +
        '<circle cx="21.5" cy="19.5" r="4.8" fill="#f5f2e8"/><circle cx="42.5" cy="19.5" r="4.8" fill="#f5f2e8"/>' +
        '<circle cx="21.5" cy="20" r="2.1" fill="#263b2a"/><circle cx="42.5" cy="20" r="2.1" fill="#263b2a"/>' +
        '<circle cx="22.1" cy="19.2" r=".65" fill="#fff"/><circle cx="43.1" cy="19.2" r=".65" fill="#fff"/>' +
        bust("#4f6b56", "#9edb92") +
        '<path d="M32 15.5c10.7 0 18 6.7 18 16.4 0 10-7.3 15.9-18 15.9s-18-5.9-18-15.9c0-9.7 7.3-16.4 18-16.4Z" fill="#8fd18e"/>' +
        '<path d="M17 36.5c4-2.2 9.4-3.3 15-3.3s11 1.1 15 3.3" fill="none" stroke="#6db673" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>' +
        '<path d="M22.5 38.5q9.5 7.5 19 0" fill="none" stroke="#426f4c" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M28 41.5q4 1.2 8 0" fill="none" stroke="#f5f2e8" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>' +
        '<circle cx="28.2" cy="34.8" r="1" fill="#5a9a63"/><circle cx="35.8" cy="34.8" r="1" fill="#5a9a63"/>' +
        '<ellipse cx="19.5" cy="35.5" rx="2.4" ry="1.4" fill="#ff9d9d" opacity=".35"/><ellipse cx="44.5" cy="35.5" rx="2.4" ry="1.4" fill="#ff9d9d" opacity=".35"/>'
      );
    },

    dragon() {
      return wrap("#3f7b7b", "#173c44",
        '<path d="M20 21c-2.4-5.6-.2-10.5 4.4-12.2 2.5 3 3 6.3 1.7 9.6M44 21c2.4-5.6.2-10.5-4.4-12.2-2.5 3-3 6.3-1.7 9.6" fill="#f0d3a4"/>' +
        '<path d="M22 16.5c-1-3-.2-5.5 1.7-7.1 1.2 1.7 1.5 3.4.8 5.2M42 16.5c1-3 .2-5.5-1.7-7.1-1.2 1.7-1.5 3.4-.8 5.2" fill="#c8a36f"/>' +
        bust("#374b46", "#de9877") +
        '<path d="M32 11.5c10.8 0 18 7.4 18 17.4 0 9.7-7.2 16.1-18 16.1s-18-6.4-18-16.1c0-10 7.2-17.4 18-17.4Z" fill="#c95f4d"/>' +
        '<path d="M20 18.5c2.7 2.1 4.8 4.8 6.2 8.1M44 18.5c-2.7 2.1-4.8 4.8-6.2 8.1" fill="none" stroke="#e78e75" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M20.2 38.5c3.8-2.1 7.8-3.2 11.8-3.2s8 1.1 11.8 3.2" fill="none" stroke="#a8493e" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>' +
        '<ellipse cx="25.2" cy="30.5" rx="2.1" ry="2.8" fill="#f7d166"/><ellipse cx="38.8" cy="30.5" rx="2.1" ry="2.8" fill="#f7d166"/>' +
        '<path d="M25.2 25.8c-1.2-2.4-3.3-3.5-5.2-3.2M38.8 25.8c1.2-2.4 3.3-3.5 5.2-3.2" fill="none" stroke="#8f3732" stroke-width="1.5" stroke-linecap="round"/>' +
        '<ellipse cx="32" cy="36.5" rx="8.2" ry="5.3" fill="#df8268"/>' +
        '<ellipse cx="28.7" cy="35" rx="1" ry=".7" fill="#8f3732"/><ellipse cx="35.3" cy="35" rx="1" ry=".7" fill="#8f3732"/>' +
        '<path d="M25.8 39.5q6.2 3.6 12.4 0" fill="none" stroke="#8f3732" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="m27.2 40.6.8 2.4 1.6-2 1.6 2.4 1.6-2.4 1.6 2 .8-2.4" fill="#fff4dc"/>' +
        '<path d="m20.5 32.5-3.2 1.2M43.5 32.5l3.2 1.2" stroke="#f0b49a" stroke-width="1.8" stroke-linecap="round"/>'
      );
    },

    horse() {
      return wrap("#6f7fc0", "#2a3766",
        '<path d="M18.6 22 15.4 8.6l9.4 6.2Z" fill="#a9703f"/><path d="m18.9 19.6-1-5.6 4 2.7Z" fill="#e6b088"/>' +
        '<path d="M45.4 22 48.6 8.6l-9.4 6.2Z" fill="#a9703f"/><path d="m45.1 19.6 1-5.6-4 2.7Z" fill="#e6b088"/>' +
        bust("#7c4a2c", "#c98a55") +
        '<path d="M32 12c7.7 0 13.2 5.8 13.2 13.5 0 3.3-.8 6.1-2 8.6l-3 11.4c-1 3.9-4.1 6.3-8.2 6.3s-7.2-2.4-8.2-6.3l-3-11.4c-1.2-2.5-2-5.3-2-8.6C18.8 17.8 24.3 12 32 12Z" fill="#b87a45"/>' +
        '<path d="M18.8 24.6c-2.4-8.8 2.2-16.6 10.4-18.6 4.8-1.2 9.4.1 12.8 3.3-4-1-7.7-.4-10.8 2-3.4 2.6-4.8 6.8-4.3 12.4-2.8-.9-5.5-.6-8.1.9Z" fill="#593521"/>' +
        '<path d="M27 13.2c1.2-3.1 4.3-4.9 7.5-4.2 2.9.6 4.9 2.6 5.6 5.2-2.4-1.2-4.8-1.4-7-.5-2.2.9-4.2 1.6-6.1 1.9Z" fill="#593521"/>' +
        '<path d="M30.6 14.8c.9-1.1 2.1-1.1 2.9 0l-1.1 8.4h-.7Z" fill="#f1e2d1" opacity=".9"/>' +
        '<ellipse cx="32" cy="41.3" rx="7.7" ry="8.2" fill="#dfa873"/>' +
        '<ellipse cx="29.2" cy="41.4" rx="1.1" ry="1.5" fill="#6b422a"/><ellipse cx="34.8" cy="41.4" rx="1.1" ry="1.5" fill="#6b422a"/>' +
        eyes(28.8, 5.5, "#2f231d") +
        '<path d="M28.7 46.4q3.3 2 6.6 0" fill="none" stroke="#8f5d3d" stroke-width="1.35" stroke-linecap="round"/>' +
        '<path d="M21.5 35.5q-1.8 4.6.6 8.4M42.5 35.5q1.8 4.6-.6 8.4" fill="none" stroke="#8f5d3d" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>'
      );
    },

    sheep() {
      return wrap("#6f9c76", "#2a4635",
        '<g fill="#f4f0e6">' +
        '<circle cx="32" cy="15" r="9.4"/><circle cx="20" cy="20" r="7.4"/><circle cx="44" cy="20" r="7.4"/>' +
        '<circle cx="15" cy="30" r="6.4"/><circle cx="49" cy="30" r="6.4"/><circle cx="18.5" cy="39" r="7"/><circle cx="45.5" cy="39" r="7"/>' +
        '<circle cx="27" cy="43" r="6.6"/><circle cx="37" cy="43" r="6.6"/>' +
        "</g>" +
        '<ellipse cx="16.2" cy="32" rx="5.6" ry="3.4" transform="rotate(-18 16.2 32)" fill="#5c4a44"/>' +
        '<ellipse cx="47.8" cy="32" rx="5.6" ry="3.4" transform="rotate(18 47.8 32)" fill="#5c4a44"/>' +
        '<ellipse cx="16.6" cy="32" rx="2.8" ry="1.6" transform="rotate(-18 16.6 32)" fill="#c98a82"/>' +
        '<ellipse cx="47.4" cy="32" rx="2.8" ry="1.6" transform="rotate(18 47.4 32)" fill="#c98a82"/>' +
        '<path d="M32 22.5c6.2 0 10.6 4.7 10.6 11 0 7-4.7 11.5-10.6 11.5S21.4 40.5 21.4 33.5c0-6.3 4.4-11 10.6-11Z" fill="#5c4a44"/>' +
        '<path d="M24.5 23.4c1.6-3.2 4.2-5 7.5-5s5.9 1.8 7.5 5c-2.4-1.1-4.9-1.7-7.5-1.7s-5.1.6-7.5 1.7Z" fill="#f4f0e6"/>' +
        '<circle cx="26.4" cy="31.4" r="3.2" fill="#f7f3ea"/><circle cx="37.6" cy="31.4" r="3.2" fill="#f7f3ea"/>' +
        '<circle cx="26.9" cy="31.7" r="1.7" fill="#2b2624"/><circle cx="37.1" cy="31.7" r="1.7" fill="#2b2624"/>' +
        '<circle cx="27.5" cy="31" r=".5" fill="#fff"/><circle cx="37.7" cy="31" r=".5" fill="#fff"/>' +
        '<path d="M29.9 37.2h4.2l-2.1 2.3Z" fill="#332b28"/>' +
        '<path d="M32 39.5v1.2M30.5 41.4q1.5 1.1 3 0" fill="none" stroke="#332b28" stroke-width="1.1" stroke-linecap="round"/>' +
        blush(36.6, "#c9787c")
      );
    },

    monkey() {
      return wrap("#6a9f91", "#25463f",
        '<circle cx="14.8" cy="31" r="7.2" fill="#8a5a3c"/><circle cx="49.2" cy="31" r="7.2" fill="#8a5a3c"/>' +
        '<circle cx="14.8" cy="31" r="4.2" fill="#d8a37c"/><circle cx="49.2" cy="31" r="4.2" fill="#d8a37c"/>' +
        bust("#4f6b52", "#c98a55") +
        '<ellipse cx="32" cy="31" rx="15.8" ry="15" fill="#8a5a3c"/>' +
        '<path d="M32 18.5c6.8 0 12 5 12 11.7 0 3.2-1.1 6-3.1 8.1-2.2 2.3-5.3 3.6-8.9 3.6s-6.7-1.3-8.9-3.6c-2-2.1-3.1-4.9-3.1-8.1 0-6.7 5.2-11.7 12-11.7Z" fill="#e2b184"/>' +
        '<ellipse cx="32" cy="38.4" rx="8.6" ry="6.8" fill="#f3cda8"/>' +
        '<path d="M27.7 16.4c-.8-3.4.8-6.1 3.8-7.4 1.7 2.4 1.9 4.7.5 7" fill="#6e432c"/>' +
        '<path d="M32 14.8c1.2-2.8 3.6-4.4 6.2-3.8" fill="none" stroke="#6e432c" stroke-width="1.8" stroke-linecap="round"/>' +
        eyes(29.2, 5.2, "#3a2a22") +
        '<ellipse cx="29.4" cy="36.8" rx="1" ry=".75" fill="#8d6a4b"/><ellipse cx="34.6" cy="36.8" rx="1" ry=".75" fill="#8d6a4b"/>' +
        '<path d="M28.4 40.4q3.6 2.4 7.2 0" fill="none" stroke="#8d5f42" stroke-width="1.3" stroke-linecap="round"/>' +
        blush(38.8, "#d97b66")
      );
    },

    chicken() {
      return wrap("#5f9bd0", "#234a70",
        '<path d="M25 17.5c-2.2-3.4-1.4-6.4 1.8-8.4 1.8 1.8 2.5 3.7 2.1 5.8M32 15.5c-1-4 .6-7 4.2-8.6 1.3 2.4 1.4 4.7.3 6.9M39 18c.2-3.2 2.2-5.4 5.4-6.3.4 2.4-.3 4.4-2 6" fill="#d94f4f"/>' +
        '<circle cx="27" cy="15.8" r="3.4" fill="#d94f4f"/><circle cx="32" cy="13.8" r="3.8" fill="#d94f4f"/><circle cx="37" cy="15.8" r="3.4" fill="#d94f4f"/>' +
        bust("#e8e3d8", "#f2a23c") +
        '<ellipse cx="32" cy="29.5" rx="14.2" ry="14.8" fill="#f9f5ea"/>' +
        '<path d="M18.5 30.5c-3.4 2.6-5.2 6.4-5.4 11.4l6-1.2c-.4-4.2.4-7.6 2.4-10.2ZM45.5 30.5c3.4 2.6 5.2 6.4 5.4 11.4l-6-1.2c.4-4.2-.4-7.6-2.4-10.2Z" fill="#f2ecdf"/>' +
        '<path d="M20.5 34.5c2.4.4 4.2 1.6 5.4 3.6M43.5 34.5c-2.4.4-4.2 1.6-5.4 3.6" fill="none" stroke="#d9d2c2" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M27.5 34.2h9l-4.5 5.2Z" fill="#f2a23c"/>' +
        '<path d="M29.2 39.4h5.6c-.4 2.2-1.4 3.6-2.8 4.2-1.4-.6-2.4-2-2.8-4.2Z" fill="#d94f4f"/>' +
        eyes(29.2, 5.2, "#2e2b2b", 1.7, 2.3) +
        '<path d="M25 25.5q2.4-1.4 4.8 0M34.2 25.5q2.4-1.4 4.8 0" fill="none" stroke="#c9b8a2" stroke-width="1.4" stroke-linecap="round"/>' +
        blush(34.8, "#f29a9a")
      );
    },

    fish() {
      return wrap("#3f86a8", "#173f58",
        '<path d="M16 33 6 23.5v19Z" fill="#ef7e45"/>' +
        '<path d="M28.5 21c2.6-4.6 7.4-7 13-5.8-2 1.8-3.4 4-4.2 6.6Z" fill="#e0763c"/>' +
        '<path d="M19.5 47.5c2.8 4.4 7.4 6.8 13 6.8 5.8 0 10.4-2.4 13.4-6.8-3.8 2.4-8.2 3.6-13.2 3.6-4.6 0-8.8-1.1-13.2-3.6Z" fill="#e0763c"/>' +
        '<ellipse cx="35" cy="33" rx="18.2" ry="12.8" fill="#f49a57"/>' +
        '<path d="M22 38.5c4 4.6 8.6 6.8 13.8 6.8 5 0 9.4-2.2 13.2-6.4-4.6 2.2-9.2 3.4-13.8 3.4-4.8 0-9.2-1.3-13.2-3.8Z" fill="#ffd0a8" opacity=".85"/>' +
        '<path d="M36 23.5c4.2 0 7.4 2.6 8 6.2M37 42.5c3.4 0 6.4-1.6 8-4.2" fill="none" stroke="#d9773e" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M30 36.5c-3.2 2.6-3.4 6-.4 7.6 2.6 1.4 5 .4 5.8-2Z" fill="#e0763c"/>' +
        '<circle cx="45" cy="28.6" r="4.1" fill="#fff8ee"/><circle cx="45.6" cy="29" r="2.1" fill="#26343a"/><circle cx="46.3" cy="28.2" r=".65" fill="#fff"/>' +
        '<path d="M51 35.2q2.7 1 4.4-1" fill="none" stroke="#a8492f" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M23 27.5q3.4 1.4 6.4.6M24 42.5q3.4-.4 6.2-2.2" fill="none" stroke="#ffb98c" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>' +
        '<circle cx="51" cy="15" r="2.4" fill="#fff" opacity=".4"/><circle cx="56" cy="9.5" r="1.5" fill="#fff" opacity=".32"/><circle cx="44" cy="12" r="1.2" fill="#fff" opacity=".28"/>'
      );
    },

    octopus() {
      return wrap("#6b5aa8", "#2a2150",
        '<g fill="none" stroke="#9b7ad6" stroke-width="5.6" stroke-linecap="round">' +
        '<path d="M21 43c-6 4.6-8.2 10.6-5.4 15.4"/><path d="M26 47c-2.6 5-2.2 9.4 1.2 13"/>' +
        '<path d="M38 47c2.6 5 2.2 9.4-1.2 13"/><path d="M43 43c6 4.6 8.2 10.6 5.4 15.4"/>' +
        "</g>" +
        '<path d="M32 10c10.8 0 19 8 19 18.6 0 9.4-7.4 16.4-19 16.4s-19-7-19-16.4C13 18 21.2 10 32 10Z" fill="#a98be0"/>' +
        '<path d="M32 13.5c8 0 14 5.6 15.2 13.2" fill="none" stroke="#c9b2f0" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>' +
        '<circle cx="24.6" cy="29.5" r="6" fill="#f7f2ff"/><circle cx="39.4" cy="29.5" r="6" fill="#f7f2ff"/>' +
        '<circle cx="25.4" cy="30" r="2.8" fill="#2f2445"/><circle cx="38.6" cy="30" r="2.8" fill="#2f2445"/>' +
        '<circle cx="26.3" cy="29" r=".8" fill="#fff"/><circle cx="39.5" cy="29" r=".8" fill="#fff"/>' +
        '<path d="M27.8 37.8q4.2 3 8.4 0" fill="none" stroke="#5f468f" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M28 37.2v1.2M36 37.2v1.2" stroke="#5f468f" stroke-width="1.2" stroke-linecap="round"/>' +
        blush(37.4, "#e88fa5") +
        '<circle cx="14.5" cy="53.5" r="1.1" fill="#c9b2f0" opacity=".8"/><circle cx="49.5" cy="53.5" r="1.1" fill="#c9b2f0" opacity=".8"/>'
      );
    },

    ghost() {
      return wrap("#4d5a94", "#1e2445",
        '<path d="M32 9c11.6 0 20 8.4 20 19.6v23.2c0 2.6-2.1 3.5-3.7 1.8l-4.1-4.4-4.4 4.8c-1.4 1.5-3.2 1.5-4.6 0L32 49.6l-3.2 4.4c-1.4 1.5-3.2 1.5-4.6 0L19.8 49l-4.1 4.4c-1.6 1.7-3.7.8-3.7-1.8V28.6C12 17.4 20.4 9 32 9Z" fill="#eae6f5"/>' +
        '<path d="M18.5 25.5c1.8-6.4 6.7-10.4 13.5-10.4 6.5 0 11.3 3.7 13.3 9.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>' +
        '<ellipse cx="25.8" cy="28.5" rx="2.6" ry="3.9" fill="#3d3956"/><ellipse cx="38.2" cy="28.5" rx="2.6" ry="3.9" fill="#3d3956"/>' +
        '<circle cx="26.7" cy="27.2" r=".8" fill="#fff"/><circle cx="39.1" cy="27.2" r=".8" fill="#fff"/>' +
        '<ellipse cx="32" cy="36.4" rx="3.2" ry="3.8" fill="#5b5478"/>' +
        '<path d="M30.4 39.2q1.6 1 3.2 0" fill="none" stroke="#c9a7c9" stroke-width="1.1" stroke-linecap="round"/>' +
        blush(35.6, "#e79ab6") +
        '<path d="M12.5 17.5 14 21l3.5 1.5L14 24l-1.5 3.5L11 24l-3.5-1.5L11 21Z" fill="#c9c4e8" opacity=".8"/>' +
        '<circle cx="51.5" cy="20" r="1.3" fill="#c9c4e8" opacity=".7"/><circle cx="49" cy="47" r="1" fill="#c9c4e8" opacity=".55"/>'
      );
    },

    vampire() {
      return wrap("#7c3f56", "#371824",
        '<path d="M10 65c0-13.8 8.4-22 22-22s22 8.2 22 22Z" fill="#2d1b2e"/>' +
        '<path d="M15.5 49 11.5 31l9.5 8.4ZM48.5 49l4-18-9.5 8.4Z" fill="#51213b"/>' +
        '<path d="M24.5 49.5h15v6h-15Z" fill="#8f2b3c"/>' +
        '<ellipse cx="32" cy="30" rx="12.8" ry="13.8" fill="#f0d9d0"/>' +
        '<path d="M18.6 27.4C19.5 18.8 25 13.2 32 13.2s12.5 5.6 13.4 14.2c-2.6-2.4-5.3-3.6-8.1-3.6-2.6 0-4.4 1.6-5.3 4.8-1-3.2-2.7-4.8-5.3-4.8-2.8 0-5.5 1.2-8.1 3.6Z" fill="#241c28"/>' +
        '<path d="M21.5 27.8c2.1-1.1 4.3-1 6.3.3M36.2 28.1c2-1.3 4.2-1.4 6.3-.3" fill="none" stroke="#4a3644" stroke-width="1.4" stroke-linecap="round"/>' +
        eyes(30.6, 5, "#8f2b3c", 1.8, 2.4) +
        '<path d="M26.5 38.8q5.5 4 11 0" fill="none" stroke="#8f3b4e" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="m29.4 40.3-.6 3 1.7-1.2ZM34.6 40.3l.6 3-1.7-1.2Z" fill="#fff8f0"/>' +
        '<path d="M15.5 57.5c2.7 1 4.5 2.8 5.5 5.5M48.5 57.5c-2.7 1-4.5 2.8-5.5 5.5" fill="none" stroke="#c9a24e" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>' +
        '<circle cx="22.5" cy="42.5" r="2.2" fill="#d98b9c" opacity=".3"/><circle cx="41.5" cy="42.5" r="2.2" fill="#d98b9c" opacity=".3"/>'
      );
    },

    zombie() {
      return wrap("#5b7a4f", "#243b25",
        bust("#5c6e8a", "#9fc27c") +
        '<ellipse cx="32" cy="31" rx="15.2" ry="15.8" fill="#9fc27c"/>' +
        '<path d="M18 24c.8-7.4 6.4-12 14-12 7.8 0 13.3 4.8 14 12.4-3-2-6.2-3-9.6-3-3.2 0-6 .8-8.4 2.4-3.2-1.8-6.6-2.4-10-1.8Z" fill="#3a3428"/>' +
        '<path d="M22 17.5 19.5 12l5 2.5 1.5-5 3 4.5 4-4 1.5 5 5-2.5-2.5 5.5Z" fill="#3a3428"/>' +
        '<path d="M22 24.5c-2.4 1.8-3.2 4.2-2.4 7.2M42 24.5c2.4 1.8 3.2 4.2 2.4 7.2" fill="none" stroke="#7fa362" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="25.7" cy="30.5" r="4.5" fill="#f4f2de"/><circle cx="38.4" cy="30.2" r="3.9" fill="#f4f2de"/>' +
        '<circle cx="26.4" cy="31" r="2.1" fill="#2c2b22"/><circle cx="38.8" cy="31" r="1.9" fill="#2c2b22"/>' +
        '<circle cx="27.1" cy="30.2" r=".6" fill="#fff"/><circle cx="39.4" cy="30.2" r=".6" fill="#fff"/>' +
        '<path d="M26.8 20.4q4-.8 7.4 1.6M27.4 20.8l-1.6 2M30.4 20.2l-1.4 2M33.4 20.6l-1.2 2" fill="none" stroke="#5e7547" stroke-width="1.1" stroke-linecap="round"/>' +
        '<path d="M25 39.5c2.5-1.4 5.2-2 8-1.8 2.4.2 4.6 1 6.4 2.4" fill="none" stroke="#5e7547" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M27.4 40.5h3.1v2.8h-3.1ZM33.8 40.9H37v2.6h-3.2Z" fill="#f4f2de"/>' +
        '<path d="M41.5 35.5c2.2.2 3.6 1.4 4.2 3.4M21.5 35.2c-2 .4-3.2 1.6-3.8 3.4" fill="none" stroke="#7fa362" stroke-width="1.4" stroke-linecap="round"/>'
      );
    },

    mermaid() {
      return wrap("#3f8f96", "#173e4c",
        '<path d="M19 25c-4.4 5.6-5.8 13.4-3.4 22.4 3 10.2 9.4 15.8 16.4 16.4 7-.6 13.4-6.2 16.4-16.4 2.4-9 1-16.8-3.4-22.4-2.2 8-6.6 12.8-13 14.4-6.4-1.6-10.8-6.4-13-14.4Z" fill="#2f8f9c"/>' +
        '<path d="M20.5 30c-1.8 6.4-1.4 13.4 1.4 20.4M43.5 30c1.8 6.4 1.4 13.4-1.4 20.4" fill="none" stroke="#4fb3bd" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
        '<ellipse cx="32" cy="31" rx="12.4" ry="13.6" fill="#f2c6a5"/>' +
        '<path d="M18.2 27.5c1-9 6.3-14.5 13.8-14.5s12.8 5.5 13.8 14.5c-3-2.6-6.2-4.2-9.6-4.8-2.2 3.4-5.6 5.2-10.2 5.2-3.4 0-6.2-1.2-8.4-3.6-2.2.6-4 1.6-5.4 3.2Z" fill="#37a0ad"/>' +
        '<path d="M17 23.5c3.4-1.4 6.6-1.6 9.6-.6M47 23.5c-3.4-1.4-6.6-1.6-9.6-.6" fill="none" stroke="#5cc3cc" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M25.5 9.5c3.5-1.8 7.6-2.2 11.4-1.2 2.6.7 4.8 2 6.6 3.8-3-1.4-6.2-2-9.6-1.8-3 .2-5.8 1-8.4 2.4Z" fill="#f0a6b8"/>' +
        '<circle cx="32" cy="8.5" r="1.8" fill="#f7e6a8"/>' +
        '<path d="M27.8 16.2c1.2-1 2.6-1 3.8 0M36 16.2c1.2-1 2.6-1 3.8 0" fill="none" stroke="#2f6a72" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>' +
        eyes(30.6, 5.1, "#29505a", 1.8, 2.4) +
        '<path d="M28.5 37.5q3.5 2.4 7 0" fill="none" stroke="#b5766a" stroke-width="1.4" stroke-linecap="round"/>' +
        blush(37.8, "#e88f9a") +
        '<circle cx="20" cy="18" r="1.3" fill="#fff" opacity=".35"/><circle cx="46" cy="13" r="1" fill="#fff" opacity=".3"/><circle cx="49" cy="42" r="1.2" fill="#fff" opacity=".25"/>'
      );
    },

    superhero() {
      return wrap("#3f6fc4", "#172f63",
        '<path d="M7 65c1.5-13 10.5-21 25-21s23.5 8 25 21Z" fill="#c94048"/>' +
        '<path d="M10 65c1.4-9.8 7.8-16.4 18-18.4L32 54l4-7.4c10.2 2 16.6 8.6 18 18.4Z" fill="#2f5da8"/>' +
        '<path d="M32 53.5 34.4 58l5 .4-3.8 3.3 1.1 4.9-4.7-2.7-4.7 2.7 1.1-4.9-3.8-3.3 5-.4Z" fill="#f2c94c"/>' +
        '<ellipse cx="32" cy="30" rx="12.8" ry="14" fill="#eebc98"/>' +
        '<path d="M19 27.5c1-9 6-14.3 13-14.3s12 5.3 13 14.3c-3.6-1.4-7.2-2.2-10.8-2.2-1.2 2.8-2.6 4.2-4.4 4.2-1.6 0-3-1.2-4.2-3.6-2.2 0-4.4.6-6.6 1.6Z" fill="#4a3028"/>' +
        '<path d="M18.6 29.5c0-2.4 2.6-4.2 6.2-4.2 3 0 5.4 1 7.2 3.2 1.8-2.2 4.2-3.2 7.2-3.2 3.6 0 6.2 1.8 6.2 4.2 0 2.6-3.2 4.6-7.2 4.6-3 0-5.2-1-6.6-3-1.4 2-3.6 3-6.6 3-4 0-7.2-2-7.2-4.6Z" fill="#243b70"/>' +
        '<path d="M22.5 30.6c1.4-1 3-1.4 4.8-1.2M36.7 29.4c1.8-.2 3.4.2 4.8 1.2" fill="none" stroke="#7fa4e8" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
        '<ellipse cx="26.4" cy="29.8" rx="2.7" ry="2.1" fill="#fff"/><ellipse cx="37.6" cy="29.8" rx="2.7" ry="2.1" fill="#fff"/>' +
        '<circle cx="27" cy="30" r="1.4" fill="#2a3448"/><circle cx="37" cy="30" r="1.4" fill="#2a3448"/>' +
        '<path d="M28 38.5q4 2.8 8 0" fill="none" stroke="#a86450" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M24.5 43.5c4.7 1.4 10.3 1.4 15 0" fill="none" stroke="#d79c7c" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>'
      );
    },

    snowman() {
      return wrap("#5b7fb8", "#1f345c",
        '<circle cx="32" cy="52" r="18" fill="#f4f8fc"/>' +
        '<circle cx="32" cy="26" r="13.2" fill="#f8fbfe"/>' +
        '<path d="M15 52c0-7 3.8-11.8 10-13.4M49 52c0-7-3.8-11.8-10-13.4" fill="none" stroke="#d9e6f2" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M20.8 9h22.4c1.8 0 3.2 1.4 3.2 3.2V18H17.6v-5.8c0-1.8 1.4-3.2 3.2-3.2Z" fill="#2e3542"/>' +
        '<rect x="16" y="17.5" width="32" height="4.6" rx="2.3" fill="#222934"/>' +
        '<rect x="17.6" y="13.5" width="28.8" height="3.4" fill="#c94f4f"/>' +
        '<circle cx="27.2" cy="25" r="1.7" fill="#2b3038"/><circle cx="36.8" cy="25" r="1.7" fill="#2b3038"/>' +
        '<path d="M32 28.5 41 31.5 32 34Z" fill="#f28c28"/>' +
        '<path d="M24.5 37.2c2.4-1.2 4.9-1.8 7.5-1.8s5.1.6 7.5 1.8" fill="none" stroke="#3a4049" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M21 36.5c-.8 3.4-.2 6.4 1.8 9M43 36.5c.8 3.4.2 6.4-1.8 9" fill="none" stroke="#c94f4f" stroke-width="4.2" stroke-linecap="round"/>' +
        '<path d="M28 41.5c2.7 1.4 5.3 1.4 8 0" fill="none" stroke="#c94f4f" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M39 44.5c2.8 2.8 4.4 6 4.8 9.5" fill="none" stroke="#c94f4f" stroke-width="3.2" stroke-linecap="round"/>' +
        '<circle cx="32" cy="49" r="1.2" fill="#3a4049"/><circle cx="32" cy="54.5" r="1.2" fill="#3a4049"/><circle cx="32" cy="60" r="1.2" fill="#3a4049"/>' +
        '<circle cx="12" cy="14" r="1.3" fill="#fff" opacity=".55"/><circle cx="50" cy="20" r="1" fill="#fff" opacity=".45"/><circle cx="46" cy="8" r="1.4" fill="#fff" opacity=".35"/>'
      );
    },

    genie() {
      return wrap("#6f5ac4", "#2b2160",
        '<path d="M12 64c2-9 8-14 20-14s18 5 20 14Z" fill="#5b4aa8" opacity=".75"/>' +
        '<path d="M20 50c4-2 8-3 12-3s8 1 12 3l2 9H18Z" fill="#8f7ad6" opacity=".55"/>' +
        '<path d="M14.8 30.5 8.8 27l6.4-1.4ZM49.2 30.5 55.2 27l-6.4-1.4Z" fill="#6fa9e8"/>' +
        '<ellipse cx="32" cy="31" rx="12.6" ry="13.5" fill="#6fa9e8"/>' +
        '<path d="M20 28c1-7.6 5.6-12.2 12-12.2S43 20.4 44 28c-2.8-1.8-6.2-2.8-10-2.8-2.2 2.4-4.4 3.6-6.6 3.6-1.8 0-3.4-1-4.8-3-1 .2-2 .6-2.6 2.2Z" fill="#2f4f92"/>' +
        '<path d="M19 28c-.5-8 5.4-14.5 13-14.5S45.5 20 45 28c-3-2.2-6.2-3.4-13-3.4S22 25.8 19 28Z" fill="#f0c75e"/>' +
        '<path d="M20 24.5c7.6-2 16.4-2 24 0l-1 3.8c-7.2-1.8-14.8-1.8-22 0Z" fill="#d9a83c"/>' +
        '<circle cx="32" cy="14.5" r="2.6" fill="#5cc3cc"/><circle cx="32" cy="14.5" r="1.2" fill="#bff2f4"/>' +
        '<path d="M38.5 12.5c2.4-2.8 5.4-4.4 9-4.8-1 3.6-3 6.2-6 7.8" fill="#f0c75e"/>' +
        '<circle cx="11.5" cy="36" r="2.4" fill="none" stroke="#f0c75e" stroke-width="1.4"/><circle cx="52.5" cy="36" r="2.4" fill="none" stroke="#f0c75e" stroke-width="1.4"/>' +
        eyes(31.2, 5.1, "#20324f", 1.8, 2.4) +
        '<path d="M27 37q5 3.4 10 0" fill="none" stroke="#31527a" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M29.8 40.5c1.4 1.8 3 2.6 4.4 2.6" fill="none" stroke="#2f4f92" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M26 53c2-1.4 4-2 6-2s4 .6 6 2" fill="none" stroke="#f0c75e" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="32" cy="57.5" r="2.2" fill="#f0c75e"/><path d="M29.6 57.5h4.8" stroke="#b78b2f" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M53 15.5 54 18l2.5 1L54 20l-1 2.5-1-2.5-2.5-1 2.5-1Z" fill="#c9b2f0" opacity=".8"/>'
      );
    },

    elf() {
      return wrap("#4f8a5f", "#1d3b2a",
        '<path d="M17.5 24C19 13.5 25 7 32.5 7c5.6 0 10.4 3.4 12.4 8.8l4.6-2.2c-.6 4.6-3.2 8-7.8 10.2Z" fill="#3f8f58"/>' +
        '<path d="M17 23.5C18.4 13.4 24.4 7 32.5 7c2.4 0 4.6.5 6.6 1.5-4 0-7.2 1.4-9.6 4.2-2.6 3-3.8 6.7-3.6 11.2-3-.8-6-.9-8.9-.4Z" fill="#2f7447"/>' +
        '<path d="M15.5 23.5c9.5-3 23.5-3 33 0l-1.6 4.6c-9.8-2.6-20-2.6-29.8 0Z" fill="#357f4d"/>' +
        '<circle cx="49" cy="17.5" r="2.6" fill="#f0c75e"/><circle cx="48.4" cy="16.9" r=".8" fill="#fff" opacity=".8"/>' +
        '<path d="M14.5 31.5 8.5 28l6.4-2ZM49.5 31.5 55.5 28l-6.4-2Z" fill="#e8bb96"/>' +
        '<ellipse cx="32" cy="33" rx="12.2" ry="13.4" fill="#f2c6a5"/>' +
        '<path d="M22 40.5c3.2 1.6 6.6 2.4 10 2.4s6.8-.8 10-2.4c-.8 6.4-4.4 9.8-10 9.8s-9.2-3.4-10-9.8Z" fill="#e8bb96" opacity=".45"/>' +
        '<path d="M20.5 30.5c1.2-4.4 5.4-7.2 11.5-7.2s10.3 2.8 11.5 7.2c-2.8-1.6-5.8-2.4-9-2.4-1.6 2.2-3.4 3.2-5.4 3.2-1.8 0-3.4-1-4.6-3-1.4.1-2.8.8-4 2.2Z" fill="#b96a3c"/>' +
        '<path d="M23 27.5q2.8-1.5 5.6-.2M35.4 27.3q2.8-1.3 5.6.2" fill="none" stroke="#8f4a2a" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>' +
        eyes(31.8, 5.2, "#3f5b3f") +
        '<path d="M28.7 38.8q3.3 2.4 6.6 0" fill="none" stroke="#a45f52" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="24.5" cy="34.5" r=".8" fill="#c47f5d"/><circle cx="27" cy="36" r=".7" fill="#c47f5d"/><circle cx="40.5" cy="34.5" r=".8" fill="#c47f5d"/><circle cx="38" cy="36" r=".7" fill="#c47f5d"/>' +
        blush(37.8, "#e88f8f") +
        '<path d="M22 51.5c3.4-1.6 6.8-2.4 10-2.4s6.6.8 10 2.4" fill="none" stroke="#f0c75e" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>'
      );
    },
  };

  const LIST = [
    { id: "human", name: "إنسان", emoji: "🧑", tint: "#5f8ed6" },
    { id: "cat", name: "قطة", emoji: "🐱", tint: "#e8a15a" },
    { id: "dog", name: "كلب", emoji: "🐶", tint: "#d9a568" },
    { id: "fox", name: "ثعلب", emoji: "🦊", tint: "#e88445" },
    { id: "panda", name: "باندا", emoji: "🐼", tint: "#a8b6c2" },
    { id: "rabbit", name: "أرنب", emoji: "🐰", tint: "#f0e8df" },
    { id: "robot", name: "روبوت", emoji: "🤖", tint: "#75b8c9" },
    { id: "alien", name: "فضائي", emoji: "👽", tint: "#7fd6a4" },
    { id: "dinosaur", name: "ديناصور", emoji: "🦖", tint: "#73c283" },
    { id: "unicorn", name: "وحيد القرن", emoji: "🦄", tint: "#cbb6ea" },
    { id: "car", name: "سيارة", emoji: "🚗", tint: "#6fb2de" },
    { id: "rocket", name: "مركبة فضائية", emoji: "🚀", tint: "#7d9fe0" },
    { id: "astronaut", name: "رائد فضاء", emoji: "🧑‍🚀", tint: "#7e9fd8" },
    { id: "wizard", name: "ساحر", emoji: "🧙", tint: "#9d82d6" },
    { id: "pirate", name: "قرصان", emoji: "🏴‍☠️", tint: "#d37c62" },
    { id: "ninja", name: "نينجا", emoji: "🥷", tint: "#6e7fa8" },
    { id: "king", name: "ملك", emoji: "🤴", tint: "#e3b45f" },
    { id: "knight", name: "فارس", emoji: "🛡️", tint: "#91a8c4" },
    { id: "penguin", name: "بطريق", emoji: "🐧", tint: "#7fb5cf" },
    { id: "lion", name: "أسد", emoji: "🦁", tint: "#e2a957" },
    { id: "tiger", name: "نمر", emoji: "🐯", tint: "#e8a559" },
    { id: "koala", name: "كوالا", emoji: "🐨", tint: "#9aa9b8" },
    { id: "bear", name: "دب", emoji: "🐻", tint: "#b98555" },
    { id: "owl", name: "بومة", emoji: "🦉", tint: "#8c7bc4" },
    { id: "frog", name: "ضفدع", emoji: "🐸", tint: "#8fd18e" },
    { id: "dragon", name: "تنين", emoji: "🐲", tint: "#c95f4d" },
    { id: "horse", name: "حصان", emoji: "🐴", tint: "#b87a45" },
    { id: "sheep", name: "خروف", emoji: "🐑", tint: "#f4f0e6" },
    { id: "monkey", name: "قرد", emoji: "🐵", tint: "#8a5a3c" },
    { id: "chicken", name: "دجاجة", emoji: "🐔", tint: "#f2a23c" },
    { id: "fish", name: "سمكة", emoji: "🐟", tint: "#f49a57" },
    { id: "octopus", name: "أخطبوط", emoji: "🐙", tint: "#a98be0" },
    { id: "ghost", name: "شبح", emoji: "👻", tint: "#eae6f5" },
    { id: "vampire", name: "مصاص دماء", emoji: "🧛", tint: "#8f2b3c" },
    { id: "zombie", name: "زومبي", emoji: "🧟", tint: "#9fc27c" },
    { id: "mermaid", name: "حورية بحر", emoji: "🧜", tint: "#37a0ad" },
    { id: "superhero", name: "بطل خارق", emoji: "🦸", tint: "#3f6fc4" },
    { id: "snowman", name: "رجل ثلج", emoji: "⛄", tint: "#eaf4ff" },
    { id: "genie", name: "جني", emoji: "🧞", tint: "#6fa9e8" },
    { id: "elf", name: "قزم", emoji: "🧝", tint: "#3f8f58" },
  ];

  function art(value, extraClass) {
    const id = value && typeof value === "object" ? value.avatar : value;
    const def = LIST.find((item) => item.id === id) || LIST[0];
    const draw = ART[def.id] || ART.human;
    const extra = String(extraClass || "").replace(/[^a-z0-9 _-]/gi, "").trim();
    return '<svg class="avatar-art' + (extra ? " " + extra : "") + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + draw() + "</svg>";
  }

  BG.avatarArt = {
    list: LIST,
    initial: 12,
    render: art,
  };
})();
