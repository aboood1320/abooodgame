/* ==========================================================================
   روميكوب — 106 قطعة
   مجموعات وسلاسل، إنزال أولي 30، سحب ودور، وجوكر كبديل.
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const AI = BG.ai;
  const XG = BG.xg;
  const ar = XG.ar;
  const esc = XG.esc;

  const COLORS = ["#2f3430", "#c85f51", "#4f7fa8", "#d68d3f"];
  const COLOR_NAMES = ["أسود", "أحمر", "أزرق", "برتقالي"];
  const TOKENS = 14;
  const MIN_MELD = 30;

  let rootRef = null;
  let apiRef = null;
  let state = null;
  let aiRunner = null;
  let timer = null;
  let serial = 1;

  function makePlayers() {
    return XG.players(apiRef, 4, ["#c77c64", "#5d8e83", "#c9a45c", "#8a7dbb"]).slice(0, Math.max(2, Math.min(4, (apiRef.players || []).length))).map((player) => {
      player.hand = [];
      player.hasMelded = false;
      return player;
    });
  }

  function tileId() { return "t" + serial++; }

  function buildPool() {
    const pool = [];
    for (let copy = 0; copy < 2; copy++) {
      for (let color = 0; color < 4; color++) {
        for (let num = 1; num <= 13; num++) pool.push({ id: tileId(), color, num, joker: false });
      }
    }
    pool.push({ id: tileId(), color: -1, num: 0, joker: true });
    pool.push({ id: tileId(), color: -1, num: 0, joker: true });
    return U.shuffle(pool);
  }

  function newState() {
    const players = makePlayers();
    const pool = buildPool();
    players.forEach((player) => {
      for (let i = 0; i < TOKENS; i++) player.hand.push(pool.pop());
    });
    return {
      players,
      pool,
      table: [],
      current: 0,
      selected: [],
      turnMeldedValue: 0,
      turnPlaced: false,
      drewThisTurn: false,
      firstTurn: true,
      notice: "اختر ثلاث قطع أو أكثر من يدك لإنزال مجموعة، أو اسحب قطعة.",
      last: null,
      over: false,
      winner: null,
      turnStart: null,
      setSerial: 1,
    };
  }

  function cur() { return state.players[state.current]; }
  function viewSeat() {
    if (apiRef.net && apiRef.net.enabled) return apiRef.net.seat;
    return state.current;
  }

  function tileValue(tile) { return tile.joker ? 10 : tile.num; }

  function describeTiles(tiles) {
    return tiles.map((tile) => (tile.joker ? "★" : ar(tile.num))).join(" ");
  }

  function validGroup(tiles) {
    if (tiles.length < 3 || tiles.length > 4) return false;
    const plain = tiles.filter((t) => !t.joker);
    if (!plain.length) return false;
    const num = plain[0].num;
    if (!plain.every((t) => t.num === num)) return false;
    const colors = new Set();
    for (const tile of plain) {
      if (colors.has(tile.color)) return false;
      colors.add(tile.color);
    }
    return true;
  }

  function validRun(tiles) {
    if (tiles.length < 3 || tiles.length > 13) return false;
    const plain = tiles.filter((t) => !t.joker);
    if (!plain.length) return false;
    const color = plain[0].color;
    if (!plain.every((t) => t.color === color)) return false;
    const nums = plain.map((t) => t.num);
    if (new Set(nums).size !== nums.length) return false;
    const n = tiles.length;
    for (let start = 1; start + n - 1 <= 13; start++) {
      if (nums.every((num) => num >= start && num <= start + n - 1)) return true;
    }
    return false;
  }

  function validSet(tiles) {
    return validGroup(tiles) || validRun(tiles);
  }

  function kindOf(tiles) {
    return validGroup(tiles) ? "group" : "run";
  }

  function setLabel(tiles) {
    const plain = tiles.filter((t) => !t.joker);
    if (validGroup(tiles)) {
      return "مجموعة " + ar(plain[0].num) + " (" + tiles.length + " قطع)";
    }
    return "سلسلة " + COLOR_NAMES[plain[0].color] + " " + describeTiles(tiles);
  }

  function snapshot() {
    return JSON.parse(JSON.stringify({
      hands: state.players.map((p) => p.hand),
      hasMelded: state.players.map((p) => p.hasMelded),
      table: state.table,
      pool: state.pool,
      setSerial: state.setSerial,
    }));
  }

  function beginTurn() {
    state.turnStart = snapshot();
    state.turnMeldedValue = 0;
    state.turnPlaced = false;
    state.drewThisTurn = false;
    state.selected = [];
    state.notice = "اختر ثلاث قطع أو أكثر لإنزال مجموعة، أضف قطعة لمجموعة، أو اسحب.";
  }

  function restoreSnapshot() {
    if (!state.turnStart) return;
    state.players.forEach((player, index) => {
      player.hand = state.turnStart.hands[index];
      player.hasMelded = state.turnStart.hasMelded[index];
    });
    state.table = state.turnStart.table;
    state.pool = state.turnStart.pool;
    state.setSerial = state.turnStart.setSerial;
    state.turnMeldedValue = 0;
    state.turnPlaced = false;
    state.drewThisTurn = false;
    state.selected = [];
  }

  function toggleTile(id) {
    if (!state || state.over) return;
    if (!XG.canAct(apiRef, state, state.current, state.over)) return;
    const hand = cur().hand;
    if (!hand.some((tile) => tile.id === id)) return;
    if (state.selected.includes(id)) state.selected = state.selected.filter((value) => value !== id);
    else state.selected.push(id);
    render();
  }

  function placeTiles(ids) {
    const player = cur();
    const tiles = ids.map((id) => player.hand.find((tile) => tile.id === id)).filter(Boolean);
    if (tiles.length !== ids.length) return false;
    if (!validSet(tiles)) {
      apiRef.toast("هذه القطع لا تشكل مجموعة أو سلسلة صحيحة.", "warn");
      return false;
    }
    player.hand = player.hand.filter((tile) => !ids.includes(tile.id));
    const set = { id: "s" + state.setSerial++, tiles };
    state.table.push(set);
    state.turnMeldedValue += U.sum(tiles.map(tileValue));
    state.turnPlaced = true;
    state.selected = [];
    if (!player.hasMelded && state.turnMeldedValue >= MIN_MELD) player.hasMelded = true;
    apiRef.log("<strong>" + esc(player.name) + "</strong> أنزل " + esc(setLabel(tiles)) + ".", "good");
    state.last = { text: player.name + " أنزل " + setLabel(tiles) + "." };
    if (!player.hand.length) {
      if (player.hasMelded) finish(player.index);
      else state.notice = "يدك فارغة لكن الإنزال الأول لم يبلغ 30. أكمل أو تراجع.";
      render();
      return true;
    }
    state.notice = player.hasMelded ? "يمكنك إنزال المزيد أو إنهاء الدور." : "الإنزال الأول يحتاج 30 نقطة على الأقل. المجموع الحالي: " + ar(state.turnMeldedValue) + ".";
    render();
    return true;
  }

  function addToSet(setId, tileIdValue) {
    const player = cur();
    if (!player.hasMelded) {
      apiRef.toast("أكمل الإنزال الأول (30 نقطة) قبل الإضافة لمجموعات الطاولة.", "warn");
      return false;
    }
    const set = state.table.find((entry) => entry.id === setId);
    const tile = player.hand.find((entry) => entry.id === tileIdValue);
    if (!set || !tile) return false;
    if (!validSet(set.tiles.concat(tile))) {
      apiRef.toast("لا يمكن إضافة هذه القطعة إلى المجموعة.", "warn");
      return false;
    }
    player.hand = player.hand.filter((entry) => entry.id !== tile.id);
    set.tiles.push(tile);
    state.turnPlaced = true;
    state.selected = [];
    state.last = { text: player.name + " أضاف " + (tile.joker ? "جوكر" : ar(tile.num)) + " إلى " + setLabel(set.tiles) + "." };
    apiRef.log("<strong>" + esc(player.name) + "</strong> أضاف قطعة إلى " + esc(setLabel(set.tiles)) + ".", "good");
    if (!player.hand.length && player.hasMelded) {
      finish(player.index);
      return true;
    }
    state.notice = "أُضيفت القطعة. يمكنك متابعة اللعب أو إنهاء الدور.";
    render();
    return true;
  }

  function drawTile() {
    if (!state || state.over) return null;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return null;
    if (!cur().hasMelded && state.turnMeldedValue > 0) {
      restoreSnapshot();
      apiRef.toast("لم تبلغ 30 في الإنزال الأول؛ أُعيدت القطع.", "warn");
      apiRef.log("الإنزال الأول لم يبلغ 30؛ أُعيدت قطع الدور.", "warn");
    }
    if (state.turnPlaced) {
      apiRef.toast("لا يمكن السحب بعد الإنزال في هذا الدور.", "warn");
      render();
      return null;
    }
    if (!state.pool.length) {
      state.notice = "المخزون فارغ. يمكنك إنهاء الدور.";
      render();
      return null;
    }
    const tile = state.pool.pop();
    cur().hand.push(tile);
    state.drewThisTurn = true;
    state.last = { text: cur().name + " سحب قطعة." };
    apiRef.log("<strong>" + esc(cur().name) + "</strong> سحب قطعة من المخزون.", "accent");
    state.notice = "سحبت قطعة. ينتهي دورك.";
    render();
    clearTimeout(timer);
    timer = setTimeout(endTurn, 500);
    return tile;
  }

  function endTurn() {
    if (!state || state.over) return false;
    if (!XG.canAct(apiRef, state, state.current, state.over) && !XG.cpuTurn(apiRef, state, state.current)) return false;
    if (!cur().hasMelded && state.turnMeldedValue < MIN_MELD) {
      if (state.turnPlaced) {
        restoreSnapshot();
        state.notice = "الإنزال الأول يحتاج 30 نقطة. أُعيدت قطعك؛ اسحب قطعة أو حاول مجددًا.";
        apiRef.toast("الإنزال الأول يحتاج 30 نقطة.", "warn");
        render();
        return false;
      }
      if (!state.drewThisTurn && state.pool.length) {
        state.notice = "يجب سحب قطعة قبل إنهاء الدور (أو إنزال 30 نقطة).";
        render();
        return false;
      }
    }
    if (!state.turnPlaced && !state.drewThisTurn && state.pool.length) {
      state.notice = "اسحب قطعة قبل إنهاء الدور.";
      render();
      return false;
    }
    if (!cur().hand.length && cur().hasMelded) {
      finish(state.current);
      return true;
    }
    state.current = (state.current + 1) % state.players.length;
    state.last = null;
    beginTurn();
    apiRef.setStatus("دور " + cur().name);
    render();
    settle();
    return true;
  }

  function undo() {
    if (!state || state.over) return;
    if (!XG.canAct(apiRef, state, state.current, state.over)) return;
    restoreSnapshot();
    state.notice = "أُعيدت حالة بداية الدور.";
    render();
  }

  function finish(winner) {
    state.over = true;
    state.notice = "فاز " + state.players[winner].name + " وأفرغ يده بعد الإنزال!";
    apiRef.setStatus("انتهت اللعبة", "over");
    apiRef.log(state.notice, "accent");
    render();
    const ranking = state.players.map((p) => ({
      name: p.name,
      value: 1000 - p.hand.reduce((sum, tile) => sum + (tile.joker ? 30 : tile.num), 0),
    })).sort((a, b) => b.value - a.value);
    apiRef.gameOver({
      title: "انتهت روميكوب",
      text: "أول لاعب يفرغ يده بعد إنزال 30 نقطة على الأقل يفوز.",
      winner: state.players[winner].name,
      icon: "🀫",
      standings: ranking,
    });
  }

  /* ------------------------------ الذكاء ------------------------------ */

  function candidateSets(hand) {
    const sets = [];
    const seen = new Set();
    const add = (tiles) => {
      if (!validSet(tiles)) return;
      const key = tiles.map((t) => t.id).sort().join(",");
      if (seen.has(key)) return;
      seen.add(key);
      sets.push(tiles);
    };
    for (let num = 1; num <= 13; num++) {
      const group = [];
      const colors = new Set();
      hand.filter((t) => !t.joker && t.num === num).forEach((tile) => {
        if (!colors.has(tile.color)) { colors.add(tile.color); group.push(tile); }
      });
      if (group.length >= 3) add(group.slice(0, 4));
    }
    for (let color = 0; color < 4; color++) {
      const tiles = hand.filter((t) => !t.joker && t.color === color).sort((a, b) => a.num - b.num);
      for (let start = 0; start < tiles.length; start++) {
        let run = [tiles[start]];
        for (let i = start + 1; i < tiles.length; i++) {
          if (tiles[i].num === run[run.length - 1].num + 1) {
            run.push(tiles[i]);
            if (run.length >= 3) add(run.slice());
          } else if (tiles[i].num !== run[run.length - 1].num) break;
        }
      }
    }
    return sets;
  }

  function bestMeld(hand) {
    const candidates = candidateSets(hand);
    let best = null;
    let bestScore = 0;
    const search = (index, used, chosen, score) => {
      if (score >= MIN_MELD && score > bestScore) {
        bestScore = score;
        best = chosen.slice();
      }
      if (index >= candidates.length) return;
      const remaining = candidates.slice(index).reduce((sum, set) => sum + U.sum(set.map(tileValue)), 0);
      if (score + remaining <= bestScore && bestScore >= MIN_MELD) return;
      const set = candidates[index];
      if (set.every((tile) => !used.has(tile.id))) {
        const next = new Set(used);
        set.forEach((tile) => next.add(tile.id));
        chosen.push(set);
        search(index + 1, next, chosen, score + U.sum(set.map(tileValue)));
        chosen.pop();
      }
      search(index + 1, used, chosen, score);
    };
    search(0, new Set(), [], 0);
    return best || [];
  }

  function aiStep() {
    if (!state || state.over) return;
    if (!XG.cpuTurn(apiRef, state, state.current)) return;
    const player = cur();
    if (!player.hasMelded) {
      const meld = bestMeld(player.hand);
      if (!meld.length) { drawTile(); return; }
      meld.forEach((set) => placeTiles(set.map((tile) => tile.id)));
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!state || state.over) return;
        if (state.turnPlaced && cur().hasMelded) endTurn();
        else drawTile();
      }, AI.delay(player.level, 0.7));
      return;
    }
    const sets = candidateSets(player.hand);
    let placed = 0;
    for (const set of sets) {
      if (placed >= 2) break;
      if (set.every((tile) => player.hand.some((held) => held.id === tile.id))) {
        placeTiles(set.map((tile) => tile.id));
        placed += 1;
      }
    }
    if (!state || state.over) return;
    if (!placed) {
      outer:
      for (const set of state.table) {
        for (const tile of player.hand.slice()) {
          if (validSet(set.tiles.concat(tile))) {
            addToSet(set.id, tile.id);
            placed += 1;
            break outer;
          }
        }
      }
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!state || state.over) return;
      if (state.turnPlaced) endTurn();
      else drawTile();
    }, AI.delay(player.level, 0.8));
  }

  function settle() {
    if (!state || state.over) return;
    if (XG.cpuTurn(apiRef, state, state.current)) {
      clearTimeout(timer);
      timer = setTimeout(aiStep, AI.delay(cur().level, 1));
    }
  }

  /* ------------------------------ العرض ------------------------------ */

  function tileHtml(tile, selected, action) {
    const color = tile.joker ? "joker" : "c" + tile.color;
    const label = tile.joker ? "★" : ar(tile.num);
    const style = tile.joker ? "" : "style=\"--tc:" + COLORS[tile.color] + "\"";
    const tag = action ? "button" : "span";
    return "<" + tag + (action ? ' type="button"' : "") + ' class="rk-tile ' + color + (selected ? " is-selected" : "") + '" ' + style +
      (action ? ' data-rk-tile="' + tile.id + '"' : "") + ">" + label + "</" + tag + ">";
  }

  function handHtml() {
    const seat = viewSeat();
    const player = state.players[seat] || state.players[state.current];
    if (!player) return "";
    const can = player.index === state.current && XG.canAct(apiRef, state, state.current, state.over);
    const sorted = player.hand.slice().sort((a, b) => {
      if (a.joker !== b.joker) return a.joker ? 1 : -1;
      if (a.color !== b.color) return a.color - b.color;
      return a.num - b.num;
    });
    return '<div class="rk-hand">' + sorted.map((tile) => tileHtml(tile, state.selected.includes(tile.id), can)).join("") + "</div>";
  }

  function tableHtml() {
    if (!state.table.length) return '<p class="xg-note">الطاولة فارغة. أنزل أول مجموعة من يدك.</p>';
    return state.table.map((set) => {
      const canAdd = state.selected.length === 1 && XG.canAct(apiRef, state, state.current, state.over) && cur().hasMelded;
      return '<div class="rk-set"><div class="rk-set-tiles">' + set.tiles.map((tile) => tileHtml(tile, false, false)).join("") + "</div>" +
        '<div class="rk-set-side"><span class="rk-set-label">' + esc(setLabel(set.tiles)) + "</span>" +
        (canAdd ? '<button type="button" class="xg-btn rk-add" data-rk-add="' + set.id + '">أضف المحدد</button>' : "") +
        "</div></div>";
    }).join("");
  }

  function render() {
    if (!rootRef || !state) return;
    const player = cur();
    const seen = state.players[viewSeat()] || player;
    const can = XG.canAct(apiRef, state, state.current, state.over);
    const selectedTiles = state.selected.map((id) => player.hand.find((tile) => tile.id === id)).filter(Boolean);
    const canPlace = selectedTiles.length >= 3 && validSet(selectedTiles) && can;
    const playerRows = state.players.map((p) => {
      const shown = p.hand.reduce((sum, tile) => sum + (tile.joker ? 30 : tile.num), 0);
      return '<div class="rk-player ' + (state.current === p.index ? "is-current" : "") + '" style="--pc:' + p.color + '">' +
        '<span class="xg-row"><span class="rk-swatch"></span><strong>' + esc(p.name) + "</strong></span>" +
        '<span class="rk-counts">' + ar(p.hand.length) + " قطعة · " + (p.hasMelded ? "أنزل" : "لم يُنزل") + "</span></div>";
    }).join("");

    rootRef.innerHTML =
      '<div class="xg rk">' +
      XG.bar("روميكوب", "مجموعات وسلاسل · إنزال أولي 30 · جوكران", [
        XG.chip("الدور", esc(player.name), "is-live"),
        XG.chip("المخزون", ar(state.pool.length)),
        XG.chip("الطاولة", ar(state.table.length)),
      ].join("")) +
      '<div class="rk-layout"><div class="rk-main">' +
      '<div class="xg-panel"><div class="xg-spread"><h3>يدك — ' + esc(seen.name) + "</h3>" +
      '<span class="xg-chip">' + ar(seen.hand.length) + " قطعة</span></div>" + handHtml() +
      '<p class="xg-note">' + (player.hasMelded ? "يمكنك إنزال مجموعات وإضافة قطع للطاولة." : "الإنزال الأول: 30 نقطة على الأقل. المجموع الحالي: " + ar(state.turnMeldedValue) + ".") + "</p>" +
      '<div class="xg-row"><button type="button" class="xg-btn primary" data-rk-place ' + (!canPlace ? "disabled" : "") + ">أنزل المجموعة المحددة</button>" +
      '<button type="button" class="xg-btn" data-rk-draw ' + (!can || state.turnPlaced ? "disabled" : "") + ">اسحب قطعة</button>" +
      '<button type="button" class="xg-btn" data-rk-undo ' + (!can || !state.turnPlaced ? "disabled" : "") + ">تراجع</button>" +
      '<button type="button" class="xg-btn primary" data-rk-end ' + (!can || !state.turnPlaced ? "disabled" : "") + ">إنهاء الدور</button></div>" +
      "</div>" +
      '<div class="xg-panel"><h3>مجموعات الطاولة</h3><div class="rk-sets">' + tableHtml() + "</div></div>" +
      "</div>" +
      '<aside class="rk-side"><div class="xg-panel"><h3>اللاعبون</h3>' + playerRows + "</div>" +
      '<div class="xg-panel"><h3>الحالة</h3><p class="xg-note">' + esc(state.notice) + "</p>" +
      (state.last ? '<p class="rk-last">' + esc(state.last.text) + "</p>" : "") + "</div>" +
      '<div class="xg-panel"><h3>تذكير</h3><p class="xg-note">المجموعة: 3–4 قطع بنفس الرقم وألوان مختلفة. السلسلة: 3+ أرقام متتالية بلون واحد. الجوكر بديل أي قطعة. الإنزال الأول 30 نقطة.</p></div>' +
      "</aside></div></div>";
  }

  function onClick(event) {
    if (!state || state.over) return;
    const tile = event.target.closest("[data-rk-tile]");
    if (tile) { toggleTile(tile.dataset.rkTile); return; }
    if (event.target.closest("[data-rk-place]")) {
      if (state.selected.length >= 3) placeTiles(state.selected);
      return;
    }
    if (event.target.closest("[data-rk-draw]")) { drawTile(); return; }
    if (event.target.closest("[data-rk-undo]")) { undo(); return; }
    if (event.target.closest("[data-rk-end]")) { endTurn(); return; }
    const add = event.target.closest("[data-rk-add]");
    if (add) {
      if (state.selected.length === 1) addToSet(add.dataset.rkAdd, state.selected[0]);
    }
  }

  const game = {
    id: "rummikub",
    name: "روميكوب",
    en: "RUMMIKUB",
    icon: "🀫",
    accent: "#c77c64",
    cardClass: "card-rummikub",
    tagline: "106 قطعة، جوكران، ومجموعات وسلاسل — أنزل 30 أولًا ثم أفرغ يدك.",
    players: "2–4",
    duration: "30–60 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "نسخة كلاسيكية: 14 قطعة لكل لاعب، إنزال أولي 30، وسحب عند عدم اللعب.",
      defaults: {},
      fields: [],
      summary() { return "106 قطعة · إنزال أولي 30"; },
    },

    rules: {
      goal: "كن أول من يفرغ يده. قبل ذلك يجب إنزال مجموعات من يدك بقيمة 30 نقطة على الأقل في دور واحد.",
      facts: [["القطع", "106"], ["اليد", "14 قطعة"], ["الإنزال الأول", "30 نقطة"], ["الفوز", "إفراغ اليد"]],
      components: [
        "104 قطعة مرقمة من 1 إلى 13 بأربعة ألوان (نسختان من كل رقم/لون).",
        "جوكران (قطعتا نجم) تعملان كبديل لأي قطعة.",
        "طاولة مشتركة تُبنى عليها المجموعات والسلاسل.",
      ],
      setup: [
        "تخلط القطع وتوضع مقلوبة في المخزون.",
        "يسحب كل لاعب 14 قطعة.",
        "يبدأ اللاعب الأول، ويجب أن يبلغ إنزاله الأول 30 نقطة.",
      ],
      steps: [
        "<strong>المجموعة:</strong> 3 أو 4 قطع بنفس الرقم وبألوان مختلفة.",
        "<strong>السلسلة:</strong> 3 قطع أو أكثر بأرقام متتالية من نفس اللون.",
        "<strong>الإنزال الأول:</strong> يجب أن تبلغ قيمة القطع التي تنزلها 30 نقطة على الأقل في دور واحد (الجوكر 10).",
        "<strong>الإضافة:</strong> بعد الإنزال الأول يمكنك إضافة قطعة من يدك إلى أي مجموعة على الطاولة إذا بقيت صحيحة.",
        "<strong>السحب:</strong> إذا لم تنزل شيئًا اسحب قطعة من المخزون وينتهي دورك.",
        "<strong>الفوز:</strong> أول لاعب يفرغ يده بعد تحقيق شرط الإنزال يفوز.",
      ],
      winning: "الفوز بإفراغ اليد بعد إنزال 30 نقطة على الأقل. لا يمكن الفوز قبل تحقيق شرط الإنزال الأول.",
      notes: [
        "هذه النسخة لا تسمح بتحريك القطع بين المجموعات أو سحب الجوكر من طاولة قائمة؛ تركّز على الإنزال والإضافة الصحيحين.",
        "الجوكر يُحتسب 10 نقاط في شرط الإنزال الأول.",
        "عند محاولة إنهاء الدور بإنزال أقل من 30 تُعاد قطع الدور إلى اليد.",
        "في اللعب الشبكي تُخفى أيدي الخصوم وتُزامَن الحالة كاملة.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      clearTimeout(timer);
      serial = 1;
      state = newState();
      beginTurn();
      apiRef.log("بدأت روميكوب. كل لاعب لديه 14 قطعة، والإنزال الأول يحتاج 30 نقطة.", "accent");
      apiRef.setStatus("دور " + cur().name);
      render();
      settle();

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render,
          toggleTile,
          placeTiles,
          addToSet,
          drawTile,
          endTurn,
          aiStep,
          validSet,
          bestMeld,
          setCurrent(index) { state.current = U.clamp(Number(index) || 0, 0, state.players.length - 1); beginTurn(); render(); },
        };
      }

      rootRef.addEventListener("click", onClick);
      return {
        netSnapshot() { return state ? BG.netCodec.encode(state) : null; },
        netLoad(data) {
          if (!data) return;
          BG.closeDialogs();
          clearTimeout(timer);
          state = BG.netCodec.decode(data);
          render();
        },
        netSeat() { return state ? state.current : -1; },
        netOver() { return !!(state && state.over); },
        netResume() { if (state) { render(); settle(); } },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTimeout(timer);
          timer = null;
          if (rootRef) rootRef.removeEventListener("click", onClick);
          rootRef = null;
          apiRef = null;
          state = null;
        },
      };
    },
  };

  BG.register(game);
})();
