/* ==========================================================================
   سكرابل — بناء الكلمات على لوحة ١٥×١٥
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const SIZE = 15;
  const CENTER = 7;
  const COLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d"];
  const BAG_SIZE = 100;

  const VALUES = {
    "ا": 1, "ب": 2, "ت": 2, "ث": 3, "ج": 3, "ح": 2, "خ": 3, "د": 3, "ذ": 5,
    "ر": 2, "ز": 4, "س": 2, "ش": 4, "ص": 4, "ض": 5, "ط": 4, "ظ": 8, "ع": 2,
    "غ": 8, "ف": 3, "ق": 3, "ك": 2, "ل": 2, "م": 2, "ن": 2, "ه": 3, "و": 1,
    "ي": 1, "ء": 5, "أ": 8, "إ": 8, "آ": 8, "ؤ": 8, "ئ": 8, "ة": 5, "ى": 5,
    "★": 0,
  };

  const DISTRIBUTION = [
    ["ا", 8], ["ب", 3], ["ت", 4], ["ث", 2], ["ج", 3], ["ح", 4], ["خ", 2],
    ["د", 3], ["ذ", 2], ["ر", 4], ["ز", 2], ["س", 4], ["ش", 2], ["ص", 2],
    ["ض", 2], ["ط", 2], ["ظ", 1], ["ع", 4], ["غ", 1], ["ف", 3], ["ق", 3],
    ["ك", 4], ["ل", 4], ["م", 3], ["ن", 4], ["ه", 3], ["و", 4], ["ي", 4],
    ["ء", 2], ["أ", 1], ["إ", 1], ["آ", 1], ["ؤ", 1], ["ئ", 1], ["ة", 2],
    ["ى", 2], ["★", 2],
  ];

  const LETTER_CHOICES = "ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئةى".split("");

  const TW = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
  const DW = [[1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10], [10, 4], [11, 3], [12, 2], [13, 1], [10, 10], [11, 11], [12, 12], [13, 13], [7, 7]];
  const TL = [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]];
  const DL = [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]];

  const PREMIUM = buildPremium();
  const PREM_LABEL = { tw: "كلمة<br>×٣", dw: "كلمة<br>×٢", tl: "حرف<br>×٣", dl: "حرف<br>×٢" };
  const PREM_TITLE = { tw: "كلمة ×٣", dw: "كلمة ×٢", tl: "حرف ×٣", dl: "حرف ×٢" };

  const DICT = new Set();
  let dictReady = false;
  const BASE_WORDS = "بيت شمس قمر كتاب قلم باب ماء نار حب علم معلم مدينة شارع سيارة طعام خبز لبن تفاح برتقال سماء ارض بحر جبل شجرة زهرة طائر سمك اسد قط كلب صديق اخ ام اب ابن بنت رجل امراة يوم ليل صباح مساء سنة شهر اسبوع ساعة وقت عمل لعب درس قرا كتب ذهب جاء اكل شرب نام قام قال كان راي سمع فتح غلق بدا انتهي";

  /* فهرس الكلمات حسب الطول والحرف/الموضع لتسريع بحث الكمبيوتر */
  const WORDS_BY_LEN = Array.from({ length: SIZE + 1 }, () => []);
  const POS_INDEX = Array.from({ length: SIZE + 1 }, () => []);

  /* القاموس والفهارس تُبنى عند أول فتح للعبة فقط — لا عند تحميل الصفحة (كانت تكلّف مئات الملّي ثانية على الجوال) */
  function ensureDictionary() {
    if (dictReady) return DICT;
    dictReady = true;
    const raw = BG.arabicWords || [];
    for (let i = 0; i < raw.length; i++) DICT.add(normalize(raw[i]));
    BASE_WORDS.split(/\s+/).forEach((w) => DICT.add(normalize(w)));
    DICT.forEach((word) => {
      const letters = Array.from(word);
      if (letters.length >= 2 && letters.length <= SIZE) WORDS_BY_LEN[letters.length].push(letters);
    });
    WORDS_BY_LEN.forEach((words, len) => {
      POS_INDEX[len] = Array.from({ length: len }, () => new Map());
      words.forEach((letters) => {
        letters.forEach((letter, pos) => {
          const map = POS_INDEX[len][pos];
          let list = map.get(letter);
          if (!list) { list = []; map.set(letter, list); }
          list.push(letters);
        });
      });
    });
    return DICT;
  }

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let tileSeq = 0;
  let clickHandler = null;
  let keyHandler = null;
  let aiRunner = null;

  function normalize(raw) {
    return String(raw == null ? "" : raw)
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\u0621-\u063A\u0641-\u064A]/g, "");
  }

  function buildPremium() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const put = (list, kind) => list.forEach(([x, y]) => { grid[y][x] = kind; });
    put(TW, "tw");
    put(DW, "dw");
    put(TL, "tl");
    put(DL, "dl");
    return grid;
  }

  function makeTile(letter) {
    tileSeq += 1;
    return {
      id: "t" + tileSeq,
      letter,
      value: VALUES[letter] == null ? 0 : VALUES[letter],
      blank: letter === "★",
      chosen: "",
    };
  }

  function bumpTileSeq() {
    let max = 0;
    const scan = (id) => {
      const match = /^t(\d+)$/.exec(String(id || ""));
      if (match) max = Math.max(max, Number(match[1]));
    };
    if (!state) return;
    (state.players || []).forEach((player) => (player.rack || []).forEach((tile) => scan(tile && tile.id)));
    (state.bag || []).forEach((tile) => scan(tile && tile.id));
    (state.board || []).forEach((row) => (row || []).forEach((tile) => scan(tile && tile.id)));
    if (state.pending && typeof state.pending.forEach === "function") {
      state.pending.forEach((entry) => scan(entry && entry.rackId));
    }
    tileSeq = Math.max(tileSeq, max);
  }

  function buildBag() {
    const bag = [];
    DISTRIBUTION.forEach(([letter, count]) => {
      for (let i = 0; i < count; i++) bag.push(makeTile(letter));
    });
    return U.shuffle(bag);
  }

  function draw(count) {
    const out = [];
    for (let i = 0; i < count && state.bag.length; i++) out.push(state.bag.pop());
    return out;
  }

  function keyOf(x, y) {
    return x + "," + y;
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  function tileAt(x, y) {
    if (!inside(x, y)) return null;
    const pending = state.pending.get(keyOf(x, y));
    if (pending) return pending;
    return state.board[y][x];
  }

  function committedAt(x, y) {
    if (!inside(x, y)) return null;
    return state.board[y][x];
  }

  function boardEmpty() {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) if (state.board[y][x]) return false;
    }
    return true;
  }

  function cur() {
    return state.players[state.current];
  }

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

  function rackValue(player) {
    return player.rack.reduce((sum, tile) => sum + (tile.blank ? 0 : tile.value), 0);
  }

  function usedRackIds() {
    const ids = new Set();
    state.pending.forEach((entry) => ids.add(entry.rackId));
    return ids;
  }

  function pendingCoords() {
    return [...state.pending.entries()].map(([key, entry]) => {
      const parts = key.split(",");
      return { x: Number(parts[0]), y: Number(parts[1]), entry };
    });
  }

  function scanCells(x, y, dx, dy) {
    let sx = x;
    let sy = y;
    while (inside(sx - dx, sy - dy) && tileAt(sx - dx, sy - dy)) {
      sx -= dx;
      sy -= dy;
    }
    const cells = [];
    let cx = sx;
    let cy = sy;
    while (inside(cx, cy) && tileAt(cx, cy)) {
      const tile = tileAt(cx, cy);
      cells.push({ x: cx, y: cy, tile, isNew: state.pending.has(keyOf(cx, cy)) });
      cx += dx;
      cy += dy;
    }
    return cells;
  }

  function makeWord(cells, dir) {
    return {
      cells,
      dir,
      text: cells.map((cell) => cell.tile.letter).join(""),
      score: 0,
    };
  }

  function wordIsValid(word) {
    return word.cells.length >= 2 && DICT.has(normalize(word.text));
  }

  function scoreWords(words, pendingCount) {
    let total = 0;
    words.forEach((word) => {
      let sum = 0;
      let multiplier = 1;
      word.cells.forEach((cell) => {
        const tile = cell.tile;
        let value = tile.blank ? 0 : tile.value;
        if (cell.isNew) {
          const premium = PREMIUM[cell.y][cell.x];
          if (premium === "dl") value *= 2;
          else if (premium === "tl") value *= 3;
          else if (premium === "dw") multiplier *= 2;
          else if (premium === "tw") multiplier *= 3;
        }
        sum += value;
      });
      word.score = sum * multiplier;
      total += word.score;
    });
    const bingo = pendingCount === 7;
    if (bingo) total += 50;
    return { total, bingo };
  }

  function analyze() {
    const coords = pendingCoords();
    if (!coords.length) {
      return { ok: false, reason: "اختر حجرًا من رفّك ثم انقر على مربع فارغ.", words: [], total: 0, bingo: false };
    }
    const keys = coords.map((c) => keyOf(c.x, c.y));
    const xs = new Set(coords.map((c) => c.x));
    const ys = new Set(coords.map((c) => c.y));
    const first = boardEmpty();
    let mainWords = [];
    const words = [];
    let mainDir = "";

    if (coords.length === 1) {
      const c = coords[0];
      const horizontal = scanCells(c.x, c.y, 1, 0);
      const vertical = scanCells(c.x, c.y, 0, 1);
      if (horizontal.length >= 2) mainWords.push(makeWord(horizontal, "h"));
      if (vertical.length >= 2) mainWords.push(makeWord(vertical, "v"));
      if (!mainWords.length) {
        return { ok: false, reason: "حجر واحد يجب أن يتصل بكلمة موجودة أو يكمل كلمة جديدة.", words: [], total: 0, bingo: false };
      }
      mainDir = mainWords.length === 1 ? mainWords[0].dir : "h+v";
    } else {
      if (xs.size > 1 && ys.size > 1) {
        return { ok: false, reason: "يجب وضع الأحجار في صف واحد أو عمود واحد.", words: [], total: 0, bingo: false };
      }
      const vertical = xs.size === 1;
      const anchor = coords[0];
      // نمتد عبر الأحجار الموجودة قبل وبعد الأحجار الجديدة، لا داخل نطاقها فقط.
      const cells = scanCells(anchor.x, anchor.y, vertical ? 0 : 1, vertical ? 1 : 0);
      const included = new Set(cells.map((cell) => keyOf(cell.x, cell.y)));
      if (!keys.every((key) => included.has(key))) {
        return { ok: false, reason: "يجب أن تكون الأحجار متصلة بلا فراغات.", words: [], total: 0, bingo: false };
      }
      mainDir = vertical ? "v" : "h";
      mainWords.push(makeWord(cells, mainDir));
    }

    if (first) {
      if (!keys.includes(keyOf(CENTER, CENTER))) {
        return { ok: false, reason: "الكلمة الأولى يجب أن تغطي المربع النجمي في الوسط.", words: [], total: 0, bingo: false };
      }
      if (!mainWords.some((word) => word.cells.length >= 2)) {
        return { ok: false, reason: "الكلمة الأولى يجب أن تتكون من حجرين على الأقل.", words: [], total: 0, bingo: false };
      }
    } else {
      let connected = false;
      coords.forEach((c) => {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          if (committedAt(c.x + dx, c.y + dy)) connected = true;
        });
      });
      if (!connected) {
        return { ok: false, reason: "الكلمة الجديدة يجب أن تتصل بحجر موجود على اللوحة.", words: [], total: 0, bingo: false };
      }
    }

    const unique = new Set();
    const addWord = (word) => {
      const signature = word.cells.map((c) => keyOf(c.x, c.y)).join("|");
      if (unique.has(signature)) return;
      unique.add(signature);
      words.push(word);
    };
    mainWords.forEach(addWord);

    if (mainDir !== "h+v") {
      const crossDir = mainDir === "h" ? [0, 1] : [1, 0];
      coords.forEach((c) => {
        const cross = scanCells(c.x, c.y, crossDir[0], crossDir[1]);
        if (cross.length >= 2) addWord(makeWord(cross, mainDir === "h" ? "v" : "h"));
      });
    }

    if (!words.length) {
      return { ok: false, reason: "لم تتشكل كلمة صالحة من هذه الأحجار.", words: [], total: 0, bingo: false };
    }

    const bad = words.find((word) => !wordIsValid(word));
    if (bad) {
      return { ok: false, reason: "الكلمة «" + bad.text + "» غير موجودة في القاموس المحلي.", words, total: 0, bingo: false, bad: bad.text };
    }

    const scored = scoreWords(words, coords.length);
    return { ok: true, words, total: scored.total, bingo: scored.bingo, reason: "" };
  }

  function selectRack(id) {
    const player = cur();
    const tile = player.rack.find((t) => t.id === id);
    if (!tile) return;
    if (state.over) return;
    if (tile.blank) {
      openBlankChooser(tile);
      return;
    }
    if (state.selected && state.selected.tileId === id) {
      state.selected = null;
      render();
      return;
    }
    clearChosen();
    state.selected = { tileId: id };
    if (FX) FX.sound("click");
    render();
  }

  function clearChosen() {
    cur().rack.forEach((tile) => { if (tile.blank) tile.chosen = ""; });
  }

  function openBlankChooser(tile) {
    const body = document.createElement("div");
    body.className = "scrab-blank-picker";
    body.innerHTML =
      '<p>الحجر الفارغ يأخذ أي حرف تختاره، لكنه يبقى بقيمة صفر نقطة. اختر الحرف الذي تريد استخدامه:</p>' +
      '<div class="scrab-letter-grid">' +
      LETTER_CHOICES.map((letter) => '<button type="button" class="scrab-letter-choice" data-letter="' + U.escape(letter) + '">' + U.escape(letter) + '</button>').join("") +
      "</div>";
    const dialog = BG.openDialog({
      title: "اختيار حرف للحجر الفارغ",
      body,
      actions: [{ label: "إلغاء", value: "cancel" }],
      className: "scrab-blank-dialog",
    });
    body.querySelectorAll("[data-letter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const letter = btn.getAttribute("data-letter");
        tile.chosen = letter;
        state.selected = { tileId: tile.id, blank: true };
        dialog.close("picked");
        if (FX) FX.sound("card");
        render();
      });
    });
    dialog.promise.then(() => {
      if (!dialog.dialog.isConnected) return;
    });
  }

  function placeAt(x, y) {
    if (state.over) return;
    if (state.pending.has(keyOf(x, y)) || tileAt(x, y)) {
      BG.toast("هذا المربع مشغول.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    if (!state.selected) {
      BG.toast("اختر حجرًا من رفّك أولًا — أظهر الرفّ إن كان مخفيًا.", "warn");
      if (FX) FX.sound("error");
      return;
    }
    const player = cur();
    const tile = player.rack.find((t) => t.id === state.selected.tileId);
    if (!tile) {
      state.selected = null;
      render();
      return;
    }
    state.pending.set(keyOf(x, y), {
      letter: tile.blank ? tile.chosen || "★" : tile.letter,
      value: tile.blank ? 0 : tile.value,
      blank: tile.blank,
      rackId: tile.id,
      chosen: tile.blank ? tile.chosen || "" : "",
    });
    state.selected = null;
    state.notice = "وضعت " + state.pending.size + " حجرًا. أرسل الكلمة أو اسحب أحجارك.";
    if (FX) {
      FX.sound("place");
      FX.after(() => {
        const cell = rootRef && rootRef.querySelector('[data-cell="' + x + "," + y + '"]');
        if (cell) FX.pop(cell);
      }, 30);
    }
    render();
  }

  function recall() {
    if (!state.pending.size) return;
    state.pending.clear();
    state.selected = null;
    state.notice = "سحبت الأحجار من اللوحة.";
    if (FX) FX.sound("recall");
    render();
  }

  function shuffleRack() {
    const player = cur();
    player.rack = U.shuffle(player.rack);
    state.selected = null;
    if (FX) FX.sound("shuffle");
    render();
  }

  function submit() {
    if (state.over) return;
    const result = analyze();
    if (!result.ok) {
      BG.toast(result.reason, "warn");
      if (FX) {
        FX.sound("error");
        FX.after(() => FX.shake(rootRef && rootRef.querySelector(".scrab-board")), 20);
      }
      return;
    }
    const player = cur();
    const scorer = player.index;
    const used = usedRackIds();
    const placed = pendingCoords();

    placed.forEach(({ x, y, entry }) => {
      state.board[y][x] = {
        letter: entry.letter,
        value: entry.value,
        blank: entry.blank,
        player: player.index,
      };
    });

    player.rack = player.rack.filter((tile) => !used.has(tile.id));
    player.rack.forEach((tile) => { if (tile.blank) tile.chosen = ""; });
    player.score += result.total;
    state.pending.clear();
    state.selected = null;
    state.lastMove = placed.map(({ x, y }) => keyOf(x, y));
    state.lastWords = result.words.map((w) => ({ text: w.text, score: w.score }));
    state.lastScore = result.total;
    state.history.unshift({
      player: player.name,
      color: player.color,
      words: result.words.map((w) => ({ text: w.text, score: w.score })),
      total: result.total,
      bingo: result.bingo,
    });
    state.history = state.history.slice(0, 8);
    state.scorelessTurns = 0;

    apiRef.log(
      "<strong>" + U.escape(player.name) + "</strong> لعب " +
      result.words.map((w) => "«" + U.escape(w.text) + "»").join(" و") +
      " مقابل <strong>" + result.total + "</strong> نقطة" + (result.bingo ? " (مكافأة السبع أحجار +50)" : "") + ".",
      "good"
    );

    if (FX) {
      FX.sound("score");
      FX.after(() => {
        const row = rootRef && rootRef.querySelector('.scrab-player[data-player="' + scorer + '"]');
        if (row) { FX.pop(row); FX.floatText(row, "+" + result.total, "good"); }
        const board = rootRef && rootRef.querySelector(".scrab-board");
        if (board) FX.pulse(board);
      }, 80);
    }

    player.rack.push(...draw(7 - player.rack.length));
    const wentOut = player.rack.length === 0 && state.bag.length === 0;
    if (wentOut) {
      endGame(player.index);
      return;
    }
    nextTurn();
  }

  function nextTurn(message) {
    state.current = (state.current + 1) % state.players.length;
    state.turn += 1;
    state.pending.clear();
    state.selected = null;
    state.lastWords = [];
    state.lastScore = 0;
    state.rackRevealed = false;
    state.notice = message || ("دور " + cur().name + " — أظهر أحجارك وابنِ كلمة.");
    if (FX) FX.sound("turn");
    if (apiRef) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    render();
  }

  function pass() {
    if (state.over) return;
    if (state.pending.size) {
      BG.toast("أرسل الكلمة أو اسحب أحجارك قبل التمرير.", "warn");
      return;
    }
    state.scorelessTurns += 1;
    apiRef.log("<strong>" + U.escape(cur().name) + "</strong> مرّر دوره.", "warn");
    if (FX) FX.sound("pass");
    if (state.scorelessTurns >= 6) {
      endGame(null);
      return;
    }
    nextTurn("مرّر " + cur().name + " دوره — دور " + state.players[(state.current + 1) % state.players.length].name + ".");
  }

  function tileCountText(count) {
    if (count === 1) return "حجرًا واحدًا";
    if (count === 2) return "حجرين";
    return count + " أحجار";
  }

  function applyExchange(player, ids) {
    if (!player || !ids || !ids.length) return false;
    const removed = [];
    player.rack = player.rack.filter((tile) => {
      if (ids.includes(tile.id)) {
        tile.chosen = "";
        removed.push(tile);
        return false;
      }
      return true;
    });
    if (!removed.length) return false;
    state.bag.push(...removed);
    state.bag = U.shuffle(state.bag);
    player.rack.push(...draw(removed.length));
    state.scorelessTurns += 1;
    apiRef.log("<strong>" + U.escape(player.name) + "</strong> بدّل " + tileCountText(removed.length) + ".", "accent");
    if (FX) FX.sound("shuffle");
    if (state.scorelessTurns >= 6) {
      endGame(null);
      return true;
    }
    nextTurn("بدّل " + player.name + " " + tileCountText(removed.length) + " — دور " + state.players[(state.current + 1) % state.players.length].name + ".");
    return true;
  }

  function openExchange() {
    if (state.over) return;
    if (state.pending.size) {
      BG.toast("أرسل الكلمة أو اسحب أحجارك قبل التبديل.", "warn");
      return;
    }
    if (!state.bag.length) {
      BG.toast("الكيس فارغ — لا يمكن التبديل.", "warn");
      return;
    }
    const player = cur();
    const body = document.createElement("div");
    body.className = "scrab-exchange";
    body.innerHTML =
      '<p>اختر الأحجار التي تريد إعادتها إلى الكيس. ستسحب العدد نفسه من الأحجار الجديدة.</p>' +
      '<div class="scrab-exchange-grid">' +
      player.rack.map((tile, i) =>
        '<label class="scrab-exchange-tile"><input type="checkbox" value="' + U.escape(tile.id) + '" id="swap-' + i + '" />' +
        '<span class="scrab-ex-letter">' + U.escape(tile.blank ? tile.chosen || "★" : tile.letter) + '</span>' +
        '<span class="scrab-ex-value">' + (tile.blank ? "٠" : tile.value) + '</span></label>'
      ).join("") +
      "</div>" +
      '<p class="scrab-exchange-hint">المتبقي في الكيس: <strong>' + state.bag.length + "</strong> حجرًا.</p>";
    const dialog = BG.openDialog({
      title: "تبديل الأحجار",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "تبديل",
          primary: true,
          onClick({ close }) {
            const ids = [...body.querySelectorAll("input:checked")].map((input) => input.value);
            if (!ids.length) {
              BG.toast("اختر حجرًا واحدًا على الأقل.", "warn");
              return;
            }
            if (ids.length > state.bag.length) {
              BG.toast("الكيس لا يحتوي على هذا العدد.", "warn");
              return;
            }
            close(ids.join("|"));
          },
        },
      ],
      className: "scrab-exchange-dialog",
    });
    dialog.promise.then((value) => {
      if (!value || value === "cancel") return;
      applyExchange(player, value.split("|"));
    });
  }

  function endGame(outIndex) {
    if (state.over) return;
    state.over = true;
    state.phase = "over";
    if (outIndex != null) {
      const outPlayer = state.players[outIndex];
      let bonus = 0;
      state.players.forEach((player) => {
        const value = rackValue(player);
        if (player.index === outIndex) return;
        bonus += value;
        player.score -= value;
      });
      outPlayer.score += bonus;
      apiRef.log("أنهى <strong>" + U.escape(outPlayer.name) + "</strong> أحجاره! حصل على " + bonus + " نقطة من رفوف الآخرين.", "good");
    } else {
      state.players.forEach((player) => {
        const value = rackValue(player);
        player.score -= value;
        if (value) apiRef.log("خُصمت " + value + " نقطة من <strong>" + U.escape(player.name) + "</strong> مقابل أحجاره المتبقية.", "warn");
      });
      apiRef.log("انتهت اللعبة بستة أدوار متتالية بلا نقاط.", "accent");
    }
    const ranked = state.players.slice().sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const tied = ranked.filter((p) => p.score === top.score);
    const winner = tied.length > 1 ? "تعادل — " + tied.map((p) => p.name).join(" و") : top.name;
    state.notice = tied.length > 1 ? "انتهت اللعبة بالتعادل." : "فاز " + top.name + " بأعلى مجموع نقاط.";
    render();
    if (FX) FX.after(() => FX.win(), 120);
    apiRef.gameOver({
      icon: "🔠",
      title: "انتهت سكرابل",
      text: outIndex != null ? "أُفرغ رفّ أحد اللاعبين بعد نفاد الكيس، وأُضيفت قيم رفوف الآخرين إليه." : "انتهت اللعبة بعد ستة أدوار متتالية دون تسجيل نقاط، وخُصمت قيم الأحجار المتبقية.",
      winner,
      standings: ranked.map((player) => ({ name: player.name, value: player.score + " نقطة" })),
    });
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuAssignRack(player, cells, letters) {
    const emptyIndexes = [];
    for (let i = 0; i < cells.length; i++) if (!cells[i].tile) emptyIndexes.push(i);
    const pool = player.rack
      .filter((tile) => !tile.blank)
      .map((tile) => ({ tile, raw: tile.letter, norm: normalize(tile.letter) }))
      .sort((a, b) => b.tile.value - a.tile.value);
    const blanks = player.rack.filter((tile) => tile.blank);
    const used = new Set();
    let blankIndex = 0;
    const out = [];
    emptyIndexes.forEach((index) => {
      const need = letters[index];
      let picked = null;
      for (const candidate of pool) {
        if (!used.has(candidate.tile.id) && candidate.raw === need) { picked = candidate.tile; break; }
      }
      if (!picked) {
        for (const candidate of pool) {
          if (!used.has(candidate.tile.id) && candidate.norm === need) { picked = candidate.tile; break; }
        }
      }
      if (picked) {
        used.add(picked.id);
        out.push({ cell: cells[index], tile: picked, letter: picked.letter, blank: false });
      } else {
        if (blankIndex >= blanks.length) return;
        const tile = blanks[blankIndex++];
        used.add(tile.id);
        out.push({ cell: cells[index], tile, letter: need, blank: true });
      }
    });
    if (out.length !== emptyIndexes.length) return null;
    return out;
  }

  function cpuApprox(cells, assignment) {
    const map = new Map(assignment.map((item) => [item.cell, item]));
    let sum = 0;
    let multiplier = 1;
    cells.forEach((cell) => {
      const item = map.get(cell);
      const tile = item ? item.tile : cell.tile;
      if (!tile) return;
      let value = item && item.blank ? 0 : tile.value;
      if (item) {
        const premium = PREMIUM[cell.y][cell.x];
        if (premium === "dl") value *= 2;
        else if (premium === "tl") value *= 3;
        else if (premium === "dw") multiplier *= 2;
        else if (premium === "tw") multiplier *= 3;
      }
      sum += value;
    });
    return sum * multiplier + assignment.length * 2 + cells.length;
  }

  function cpuCandidates(player) {
    const results = [];
    const seen = new Set();
    const emptyBoard = boardEmpty();
    const rackSize = player.rack.length;

    ["h", "v"].forEach((dir) => {
      for (let line = 0; line < SIZE; line++) {
        for (let start = 0; start < SIZE - 1; start++) {
          for (let end = start + 1; end < SIZE; end++) {
            if (results.length >= 700) return;
            const length = end - start + 1;
            if (emptyBoard && length > rackSize) continue;

            const beforeX = dir === "h" ? start - 1 : line;
            const beforeY = dir === "h" ? line : start - 1;
            const afterX = dir === "h" ? end + 1 : line;
            const afterY = dir === "h" ? line : end + 1;
            if (committedAt(beforeX, beforeY)) continue;
            if (committedAt(afterX, afterY)) continue;

            const cells = [];
            let empties = 0;
            const known = [];
            for (let i = 0; i < length; i++) {
              const x = dir === "h" ? start + i : line;
              const y = dir === "h" ? line : start + i;
              const tile = state.board[y][x];
              cells.push({ x, y, tile: tile || null });
              if (tile) known.push({ pos: i, letter: normalize(tile.letter) });
              else empties += 1;
            }
            if (empties === 0 || empties > rackSize) continue;

            if (emptyBoard) {
              const crossesCenter = start <= CENTER && end >= CENTER;
              if (line !== CENTER || !crossesCenter) continue;
              if (known.length) continue;
            } else if (!known.length) {
              let connected = false;
              cells.forEach((cell) => {
                if (connected) return;
                if (committedAt(cell.x + 1, cell.y) || committedAt(cell.x - 1, cell.y) ||
                    committedAt(cell.x, cell.y + 1) || committedAt(cell.x, cell.y - 1)) connected = true;
              });
              if (!connected) continue;
            }

            let wordList = WORDS_BY_LEN[length];
            if (known.length) {
              let pick = null;
              for (const item of known) {
                const map = POS_INDEX[length] && POS_INDEX[length][item.pos];
                const list = map ? map.get(item.letter) : null;
                if (!list) { pick = null; break; }
                if (!pick || list.length < pick.length) pick = list;
              }
              if (!pick) continue;
              wordList = pick;
            }
            if (!wordList || !wordList.length) continue;

            for (const letters of wordList) {
              let matches = true;
              for (const item of known) {
                if (letters[item.pos] !== item.letter) { matches = false; break; }
              }
              if (!matches) continue;
              const assignment = cpuAssignRack(player, cells, letters);
              if (!assignment) continue;
              const signature = dir + "|" + start + "|" + line + "|" + length + "|" + letters.join("");
              if (seen.has(signature)) continue;
              seen.add(signature);
              results.push({ dir, cells, letters, assignment, approx: cpuApprox(cells, assignment) });
            }
          }
        }
      }
    });

    return results;
  }

  function cpuApplyCandidate(candidate) {
    state.pending.clear();
    state.selected = null;
    cur().rack.forEach((tile) => { if (tile.blank) tile.chosen = ""; });
    candidate.assignment.forEach((item) => {
      if (item.blank) item.tile.chosen = item.letter;
      state.pending.set(keyOf(item.cell.x, item.cell.y), {
        letter: item.blank ? item.letter : item.tile.letter,
        value: item.blank ? 0 : item.tile.value,
        blank: item.blank,
        rackId: item.tile.id,
        chosen: item.blank ? item.letter : "",
      });
    });
  }

  function cpuValidateCandidate(candidate) {
    cpuApplyCandidate(candidate);
    const result = analyze();
    if (result.ok) {
      candidate.score = result.total;
      candidate.result = result;
      return true;
    }
    return false;
  }

  function cpuChooseExchange(player) {
    const count = Math.min(player.rack.length, state.bag.length);
    if (count <= 0) return null;
    const order = player.rack.slice().sort((a, b) => {
      const va = a.blank ? -100 : a.value;
      const vb = b.blank ? -100 : b.value;
      return vb - va;
    });
    return order.slice(0, count).map((tile) => tile.id);
  }

  function cpuTakeTurn() {
    if (!state || state.over) return;
    const player = cur();
    if (!player || !AI.isCpu(player)) return;

    const level = AI.level(player.level);
    const candidates = cpuCandidates(player);
    const valid = [];
    if (candidates.length) {
      candidates.sort((a, b) => b.approx - a.approx);
      const target = level === "hard" ? 18 : level === "normal" ? 12 : 8;
      const limit = level === "hard" ? 170 : level === "normal" ? 110 : 70;
      let checked = 0;
      for (const candidate of candidates) {
        if (valid.length >= target) break;
        if (checked >= limit && valid.length) break;
        if (checked >= limit * 3) break;
        checked += 1;
        if (cpuValidateCandidate(candidate)) valid.push(candidate);
        state.pending.clear();
      }
    }

    if (valid.length) {
      valid.sort((a, b) => b.score - a.score);
      const pick = AI.choose(valid, (candidate) => candidate.score, player.level) || valid[0];
      cpuApplyCandidate(pick);
      if (analyze().ok) {
        submit();
        return;
      }
      state.pending.clear();
    }

    player.rack.forEach((tile) => { if (tile.blank) tile.chosen = ""; });

    const ids = cpuChooseExchange(player);
    if (ids && ids.length) {
      applyExchange(player, ids);
      return;
    }

    pass();
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = cur();
    if (!AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    aiRunner.later(() => {
      if (!state || state.over) return;
      if (!AI.isCpu(cur())) return;
      cpuTakeTurn();
    }, AI.delay(seat.level, 1.15));
  }

  /* ------------------------------ العرض ------------------------------ */

  function boardHTML() {
    // أثناء الشبكة لا تُعرض أحجار اللاعب النشط غير المُرسلة على أجهزة الآخرين.
    const showPending = !isOnline() || viewerSeat() === state.current;
    const cells = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const key = keyOf(x, y);
        const tile = showPending ? tileAt(x, y) : committedAt(x, y);
        const premium = PREMIUM[y][x];
        const classes = ["scrab-cell"];
        if (premium) classes.push("prem-" + premium);
        if (x === CENTER && y === CENTER) classes.push("is-center");
        if (showPending && state.pending.has(key)) classes.push("is-pending");
        if (state.lastMove.includes(key)) classes.push("is-last");
        if (tile) classes.push("has-tile");
        let inner = "";
        if (tile) {
          classes.push("owner-" + (tile.player != null ? tile.player : state.current));
          inner =
            '<span class="scrab-tile">' +
            '<span class="scrab-letter">' + U.escape(tile.letter) + "</span>" +
            '<span class="scrab-value">' + (tile.blank ? "٠" : tile.value) + "</span>" +
            "</span>";
        } else if (x === CENTER && y === CENTER) {
          inner = '<span class="scrab-star" aria-hidden="true">★</span>';
        } else if (premium) {
          inner = '<span class="scrab-prem" title="' + PREM_TITLE[premium] + '">' + PREM_LABEL[premium] + "</span>";
        }
        const label = tile
          ? "حجر " + tile.letter + " بقيمة " + (tile.blank ? 0 : tile.value)
          : premium ? PREM_TITLE[premium] + " — مربع فارغ" : "مربع فارغ";
        cells.push(
          '<button type="button" class="' + classes.join(" ") + '" data-cell="' + x + "," + y + '"' +
          (tile ? ' data-fx-piece="scr-cell-' + x + "-" + y + '" data-fx-enter="pop"' : "") +
          ' aria-label="' + U.escape(label) + '">' +
          inner +
          "</button>"
        );
      }
    }
    return '<div class="scrab-board" dir="rtl">' + cells.join("") + "</div>";
  }

  function rackHTML() {
    const player = viewerPlayer();
    if (!player) {
      return '<p class="scrab-rack-empty">أنت مشاهد — رفوف اللاعبين سرّية ولا تُعرض على هذا الجهاز.</p>';
    }
    if (!player.rack.length) {
      return '<p class="scrab-rack-empty">لا توجد أحجار في رفّك — الكيس فارغ أو أنك أنهيت أحجارك.</p>';
    }
    const used = usedRackIds();
    return (
      '<div class="scrab-rack">' +
      player.rack.map((tile) => {
        const isUsed = used.has(tile.id);
        const isSelected = state.selected && state.selected.tileId === tile.id;
        const letter = tile.blank ? tile.chosen || "★" : tile.letter;
        return (
          '<button type="button" class="scrab-rack-tile' + (isUsed ? " is-used" : "") + (isSelected ? " is-selected" : "") + (tile.blank ? " is-blank" : "") + '" data-rack="' + U.escape(tile.id) + '" data-fx-piece="scr-rack-' + U.escape(tile.id) + '" data-fx-enter="deal" aria-label="حجر ' + U.escape(letter) + ' بقيمة ' + (tile.blank ? 0 : tile.value) + '">' +
          '<span class="scrab-rack-letter">' + U.escape(letter) + "</span>" +
          '<span class="scrab-rack-value">' + (tile.blank ? "٠" : tile.value) + "</span>" +
          (tile.blank ? '<span class="scrab-rack-note">فارغ</span>' : "") +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function playerRows() {
    const viewer = viewerPlayer();
    return state.players.map((player) => {
      const active = player.index === state.current && !state.over;
      const mine = !!viewer && player.index === viewer.index;
      const rackInfo = (mine || (!isOnline() && !AI.isCpu(player)))
        ? player.rack.length + " أحجار · " + rackValue(player) + " نقطة في الرفّ"
        : player.rack.length + " أحجار · مخفي";
      return (
        '<div class="scrab-player' + (active ? " active" : "") + '" data-player="' + player.index + '" style="--p:' + player.color + '">' +
        '<span class="pdot">' + (player.index + 1) + "</span>" +
        '<div class="scrab-player-copy"><strong>' + U.escape(player.name) + "</strong>" +
        "<small>" + rackInfo + "</small></div>" +
        '<span class="scrab-player-score">' + player.score + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function historyHTML() {
    if (!state.history.length) {
      return '<p class="scrab-history-empty">لم تُلعب كلمات بعد. أول كلمة يجب أن تغطي النجمة في الوسط.</p>';
    }
    return state.history.map((item) =>
      '<div class="scrab-history-row" style="--p:' + item.color + '">' +
      '<div class="scrab-history-copy"><strong>' + U.escape(item.player) + "</strong>" +
      "<small>" + item.words.map((w) => "«" + U.escape(w.text) + "» " + w.score).join(" · ") + "</small></div>" +
      '<b>+' + item.total + "</b>" +
      "</div>"
    ).join("");
  }

  function pendingPreview() {
    const coords = pendingCoords();
    if (!coords.length) return '<p class="scrab-preview-empty">لم تضع أحجارًا بعد.</p>';
    if (isOnline() && viewerSeat() !== state.current) {
      return '<p class="scrab-preview-empty">اللاعب يجهّز كلمته — لا تُعرض أحجاره قبل الإرسال.</p>';
    }
    const result = analyze();
    const letters = coords.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).map((c) => c.entry.letter).join("");
    return (
      '<div class="scrab-preview ' + (result.ok ? "ok" : "wait") + '">' +
      '<div class="scrab-preview-word">' + U.escape(letters) + "</div>" +
      '<div class="scrab-preview-meta"><span>' + coords.length + " أحجار</span>" +
      (result.ok
        ? '<b>+' + result.total + " نقطة" + (result.bingo ? " · مكافأة +50" : "") + "</b>"
        : "<small>" + U.escape(result.reason) + "</small>") +
      "</div></div>"
    );
  }

  function sideHTML() {
    const player = cur();
    const viewer = viewerPlayer();
    const myTurn = !!viewer && viewer.index === state.current;
    const cpuTurn = !state.over && (AI.isCpu(player) || !myTurn);
    const activeWords = state.lastWords.length
      ? '<div class="scrab-last-words">' + state.lastWords.map((w) => '<span>«' + U.escape(w.text) + '» <b>+' + w.score + "</b></span>").join("") + "</div>"
      : "";
    const rackLine = state.over
      ? state.notice
      : "الكيس: " + state.bag.length + " حجرًا · " + (AI.isCpu(player)
          ? "أحجار الكمبيوتر: " + player.rack.length
          : myTurn ? "رفّك: " + player.rack.length : "أحجار " + U.escape(player.name) + ": " + player.rack.length);
    return (
      '<div class="scrab-panel scrab-turn">' +
      '<span class="scrab-kicker">الدور ' + state.turn + "</span>" +
      "<strong>" + U.escape(state.over ? "انتهت اللعبة" : player.name) + "</strong>" +
      "<small>" + rackLine + "</small>" +
      '<div class="scrab-turn-stats">' +
      "<div><b>" + player.score + "</b><small>نقطة</small></div>" +
      "<div><b>" + state.players.reduce((sum, p) => sum + p.score, 0) + "</b><small>مجموع</small></div>" +
      "<div><b>" + state.players.length + "</b><small>لاعب</small></div>" +
      "</div>" + activeWords +
      "</div>" +
      '<div class="scrab-panel scrab-actions">' +
      '<span class="scrab-kicker">أوامر</span>' +
      '<button type="button" class="bg-btn primary" data-act="submit"' + (state.pending.size && !state.over && !cpuTurn ? "" : " disabled") + '><span>✓ أرسل الكلمة</span></button>' +
      '<div class="scrab-action-row">' +
      '<button type="button" class="bg-btn" data-act="recall"' + (state.pending.size && !state.over && !cpuTurn ? "" : " disabled") + '><span>↩ اسحب</span></button>' +
      '<button type="button" class="bg-btn" data-act="shuffle"' + (state.over || cpuTurn ? " disabled" : "") + '><span>⇄ رتّب</span></button>' +
      "</div>" +
      '<div class="scrab-action-row">' +
      '<button type="button" class="bg-btn" data-act="exchange"' + (state.bag.length && !state.over && !state.pending.size && !cpuTurn ? "" : " disabled") + '><span>🎒 بدّل</span></button>' +
      '<button type="button" class="bg-btn" data-act="pass"' + (state.over || state.pending.size || cpuTurn ? " disabled" : "") + '><span>⏭ مرّر</span></button>' +
      "</div>" +
      '<div class="scrab-preview-panel"><span class="scrab-kicker">معاينة</span>' + pendingPreview() + "</div>" +
      '<p class="scrab-hint">انقر حجرًا من الرفّ ثم مربعًا فارغًا. انقر حجرًا موضوعًا لسحبه.</p>' +
      "</div>" +
      '<div class="scrab-notice">' + U.escape(state.notice) + "</div>" +
      '<div class="scrab-panel scrab-players"><span class="scrab-kicker">المتنافسون</span>' + playerRows() + "</div>" +
      '<div class="scrab-panel scrab-history"><span class="scrab-kicker">آخر الكلمات</span>' + historyHTML() + "</div>" +
      '<div class="scrab-panel scrab-legend">' +
      '<span class="scrab-kicker">مفتاح اللوحة</span>' +
      '<div class="scrab-legend-row"><i class="tw">٣ك</i><span>كلمة ×٣</span></div>' +
      '<div class="scrab-legend-row"><i class="dw">٢ك</i><span>كلمة ×٢</span></div>' +
      '<div class="scrab-legend-row"><i class="tl">٣ح</i><span>حرف ×٣</span></div>' +
      '<div class="scrab-legend-row"><i class="dl">٢ح</i><span>حرف ×٢</span></div>' +
      '<p>القاموس المحلي يوحّد الهمزات والألف المقصورة والتاء المربوطة عند التحقق، ويقبل أكثر من ' + (ensureDictionary().size / 1000).toFixed(1) + " ألف كلمة.</p>" +
      "</div>"
    );
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "scrab-layout";

    const boardWrap = document.createElement("div");
    boardWrap.className = "scrab-board-wrap";
    boardWrap.innerHTML =
      '<div class="board-head">' +
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-scrabble"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">طاولة الكلمات</span><strong>لوحة ١٥×١٥</strong></div>' +
      '<span class="board-head-hint">الأحجار الجديدة متصلة · أول كلمة تغطي النجمة · المربعات الملوّنة تضاعف النقاط</span>' +
      "</div>" +
      '<div class="scrab-board-scroll">' + boardHTML() + "</div>";

    const side = document.createElement("aside");
    side.className = "scrab-side";
    side.innerHTML = sideHTML();

    const player = viewerPlayer();
    let secret = null;
    if (!player) {
      const watch = document.createElement("div");
      watch.className = "scrab-panel scrab-watch";
      watch.innerHTML =
        '<span class="scrab-kicker">👁 وضع المشاهدة</span>' +
        "<strong>أنت تتابع الطاولة</strong>" +
        '<p class="scrab-rack-hint">أحجار اللاعبين سرّية ولا تُعرض على هذا الجهاز. ستُفتح أحجارك عند دورك.</p>';
      side.appendChild(watch);
    } else if (AI.isCpu(player)) {
      const cpuPanel = document.createElement("div");
      cpuPanel.className = "scrab-panel scrab-cpu";
      cpuPanel.innerHTML =
        '<span class="scrab-kicker">كمبيوتر</span>' +
        "<strong>" + U.escape(player.name) + "</strong>" +
        '<p class="scrab-rack-hint">الكمبيوتر يختار كلمته من رفّه الآن. تبقى أحجاره مخفية عن الجميع.</p>';
      side.appendChild(cpuPanel);
    } else {
      secret = BG.secretPanel({
        title: "🎒 أحجار " + player.name,
        owner: player.name,
        hint: "أحجارك مخفية عن بقية اللاعبين. اضغط «إظهار» لرؤية رفّك وبدء الدور.",
        open: isOnline() || (state.rackRevealed && state.current === player.index),
        autoKey: "scrabble:" + player.index + ":" + state.turn,
        onToggle(visible) {
          state.rackRevealed = visible;
          if (!visible) {
            state.selected = null;
            state.pending.clear();
            render();
          }
        },
        render() {
          return rackHTML() + '<p class="scrab-rack-hint">الأحجار المستخدمة على اللوحة تظهر باهتة حتى ترسل الكلمة. الحجر الفارغ قيمته صفر ويأخذ أي حرف.</p>';
        },
      });
      side.appendChild(secret.el);
    }

    wrap.appendChild(boardWrap);
    wrap.appendChild(side);
    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");
    syncCpu();
  }

  function handleAction(action) {
    if (action === "submit") submit();
    else if (action === "recall") recall();
    else if (action === "shuffle") shuffleRack();
    else if (action === "exchange") openExchange();
    else if (action === "pass") pass();
  }

  const game = {
    id: "scrabble",
    name: "سكرابل",
    en: "SCRABBLE",
    icon: "🔠",
    accent: "#58d3a8",
    cardClass: "card-scrabble",
    tagline: "رتّب أحجارك، اصنع كلمات عربية متقاطعة، واستثمر المربعات المضاعفة.",
    players: "2–4",
    duration: "45–75 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    rules: {
      goal: "اجمع أعلى مجموع نقاط بصناعة كلمات عربية متقاطعة على اللوحة. كل حجر يحمل قيمة، وبعض المربعات تضاعف قيمة الحرف أو الكلمة. تنتهي اللعبة عندما يفرغ الكيس وينهي أحد اللاعبين أحجاره، أو بعد ستة أدوار متتالية دون نقاط.",
      facts: [["اللوحة", "١٥×١٥ مربعًا"], ["الأحجار", "١٠٠ حجر عربي"], ["الرفّ", "٧ أحجار لكل لاعب"], ["القاموس", "أكثر من ٢٥ ألف كلمة محلية"]],
      components: [
        "لوحة ١٥×١٥ مربعًا تتضمن مربعات مضاعفة للحروف ومضاعفة للكلمات ومربع البداية النجمي.",
        "١٠٠ حجر عربي: ٩٨ حجرًا بحروف وقيم، وحجران فارغان يأخذان أي حرف بقيمة صفر.",
        "رفّ سرّي لكل لاعب يتسع لسبعة أحجار، وسبعة أحجار سحب في بداية اللعب.",
        "كيس سحب يحتوي بقية الأحجار، وقاموس عربي محلي للتحقق من الكلمات.",
      ],
      setup: [
        "تُخلط الأحجار في الكيس، ويسحب كل لاعب سبعة أحجار ويضعها على رفّه.",
        "تُترك اللوحة فارغة. أول كلمة تلعب يجب أن تغطي المربع النجمي في منتصف اللوحة.",
        "يبدأ اللاعب الأول، ثم ينتقل الدور باتجاه عقارب الساعة. جميع اللاعبين يتناوبون على الجهاز نفسه.",
        "أحجار كل لاعب سرّية؛ يظهرها صاحب الدور فقط عند الحاجة، ثم يخفيها قبل تمرير الدور.",
      ],
      steps: [
        "<strong>اختيار الأحجار:</strong> اضغط «إظهار» على لوحة أحجارك، ثم انقر حجرًا لاختياره. انقر مربعًا فارغًا على اللوحة لوضعه، أو انقر حجرًا موضوعًا لسحبه.",
        "<strong>شكل الكلمة:</strong> يجب أن تقع الأحجار الجديدة في صف واحد أو عمود واحد متصل، وأن تقرأ مع الأحجار الموجودة كلمة واحدة على الأقل من حرفين أو أكثر. يمكن أن تمتد الكلمة عبر أحجار موجودة، لكن لا يمكن ترك فراغات.",
        "<strong>أول كلمة:</strong> تغطي النجمة في الوسط، وتتكون من حجرين على الأقل. لا تحتاج إلى الاتصال بأحجار سابقة لأن اللوحة فارغة.",
        "<strong>الكلمات اللاحقة:</strong> يجب أن تتصل الكلمة الجديدة بحجر موجود على اللوحة. كل حجر جديد قد يصنع كلمة متقاطعة إضافية مع الأحجار المجاورة، وتُحتسب كل الكلمات المتقاطعة.",
        "<strong>الاحتساب:</strong> اجمع قيم الحروف. مربع الحرف يضاعف قيمة الحجر الموضوع عليه فقط، ومربع الكلمة يضاعف مجموع الكلمة كاملة. لا تعمل المضاعفات على الأحجار الموضوعة سابقًا. إذا وضعت سبعة أحجار في دور واحد تحصل على مكافأة ٥٠ نقطة.",
        "<strong>التبديل والتمرير:</strong> يمكنك تبديل أحجار من رفّك بأحجار من الكيس بدلًا من لعب كلمة، أو تمرير الدور. التبديل متاح فقط إذا كان في الكيس أحجار كافية.",
        "<strong>نهاية الدور:</strong> بعد إرسال الكلمة تُسجل نقاطك، تُكمّل رفّك من الكيس، ويُخفى رفّك تلقائيًا قبل دور اللاعب التالي.",
      ],
      winning: "تنتهي اللعبة عندما يفرغ الكيس وينهي لاعب جميع أحجاره: يُضاف مجموع قيم أحجار الآخرين إلى رصيده، وتُخصم قيم أحجارهم من رصيدهم. إذا مرّ ستة أدوار كاملة دون تسجيل نقاط، تنتهي اللعبة وتُخصم قيم الأحجار المتبقية. الفائز صاحب أعلى مجموع نقاط.",
      notes: [
        "القاموس المحلي مبني على قوائم كلمات عربية مفتوحة، ويوحّد الهمزات (أ إ آ ← ا) والألف المقصورة (ى ← ي) والتاء المربوطة (ة ← ه) لتسهيل التحقق.",
        "لا توجد نقاط للكلمات المفردة من حرف واحد، ولا تُقبل الكلمات الأجنبية أو الأسماء العلم غير المدرجة في القاموس.",
        "الحجران الفارغان يسمحان باختيار أي حرف عند وضعهما، لكن قيمتهما تبقى صفرًا ولا تستفيدان من مضاعفة الحرف إلا بصفر.",
        "مربع البداية في الوسط هو مربع كلمة مضاعفة، ويُحتسب مرة واحدة فقط عند تغطيته بأول كلمة.",
      ],
    },

    create(root, api) {
      ensureDictionary();
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
        score: 0,
        rack: [],
      }));

      state = {
        players,
        current: 0,
        turn: 1,
        board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
        bag: buildBag(),
        pending: new Map(),
        selected: null,
        phase: "play",
        over: false,
        notice: "اختر لاعبًا وأظهر رفّه. أول كلمة يجب أن تغطي النجمة في الوسط.",
        rackRevealed: false,
        lastMove: [],
        lastWords: [],
        lastScore: 0,
        scorelessTurns: 0,
        history: [],
      };
      players.forEach((player) => { player.rack.push(...draw(7)); });

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render, submit, pass, endGame, nextTurn,
          selectRack, placeAt, recall, shuffleRack, analyze, scoreWords,
          draw, drawTiles: draw, buildBag, tileAt, committedAt,
          cpuCandidates, cpuTakeTurn, cpuValidateCandidate, syncCpu,
          get dictionary() { return ensureDictionary(); },
          get premium() { return PREMIUM; },
          tileValues: VALUES,
          normalize,
        };
      }

      clickHandler = (event) => {
        if (!state || state.over || AI.isCpu(cur())) return;
        const rack = event.target.closest("[data-rack]");
        if (rack) {
          selectRack(rack.getAttribute("data-rack"));
          return;
        }
        const action = event.target.closest("[data-act]");
        if (action) {
          handleAction(action.getAttribute("data-act"));
          return;
        }
        const cell = event.target.closest("[data-cell]");
        if (cell) {
          const parts = cell.getAttribute("data-cell").split(",");
          const x = Number(parts[0]);
          const y = Number(parts[1]);
          if (state.pending.has(keyOf(x, y))) {
            state.pending.delete(keyOf(x, y));
            state.notice = "سحبت الحجر من اللوحة.";
            if (FX) FX.sound("recall");
            render();
          } else {
            placeAt(x, y);
          }
        }
      };
      keyHandler = (event) => {
        if (!state || state.over || AI.isCpu(cur())) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        const cell = event.target.closest && event.target.closest("[data-cell]");
        if (!cell || event.target.tagName !== "BUTTON") return;
        const parts = cell.getAttribute("data-cell").split(",");
        const x = Number(parts[0]);
        const y = Number(parts[1]);
        if (state.pending.has(keyOf(x, y))) {
          state.pending.delete(keyOf(x, y));
          render();
        }
      };
      rootRef.addEventListener("click", clickHandler);
      rootRef.addEventListener("keydown", keyHandler);

      apiRef.log("بدأت سكرابل — " + players.length + " لاعبين، و" + BAG_SIZE + " حجرًا في الكيس. املأ رفّك واصنع أول كلمة في الوسط.", "accent");
      apiRef.setStatus("دور " + AI.statusName(cur()), "live");
      render();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          state = BG.netCodec.decode(data);
          if (!(state.pending instanceof Map)) state.pending = new Map();
          state.selected = null;
          state.rackRevealed = false;
          state.players.forEach((player) => {
            player.rack = Array.isArray(player.rack) ? player.rack : [];
          });
          state.bag = Array.isArray(state.bag) ? state.bag : [];
          bumpTileSeq();
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
          state.rackRevealed = false;
          render();
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          if (rootRef && clickHandler) rootRef.removeEventListener("click", clickHandler);
          if (rootRef && keyHandler) rootRef.removeEventListener("keydown", keyHandler);
          clickHandler = null;
          keyHandler = null;
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
