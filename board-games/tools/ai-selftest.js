/* ==========================================================================
   اختبارات انحدار سريعة لطبقة الذكاء الاصطناعي المشتركة (بلا متصفح).
   التشغيل: npm run test:ai
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const file = path.join(__dirname, "..", "js", "ai.js");
const BG = {};
const sandbox = {
  window: { BG },
  Math,
  Number,
  Set,
  Array,
  Object,
  Date,
  console,
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });

const AI = BG.ai;
if (!AI) {
  console.error("FAIL ai.js did not register BG.ai");
  process.exit(1);
}

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("PASS", name);
  } catch (error) {
    console.error("FAIL", name, "-", error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}

check("levels normalize and rank", () => {
  assert.deepStrictEqual(Array.from(AI.LEVEL_ORDER), ["easy", "normal", "hard", "expert"]);
  assert.strictEqual(AI.level("nope"), "normal");
  assert.strictEqual(AI.level("expert"), "expert");
  assert.strictEqual(AI.levelIndex("easy"), 0);
  assert.strictEqual(AI.levelIndex("expert"), 3);
  assert.strictEqual(AI.strength("expert"), 1);
  assert.strictEqual(AI.strength("easy"), 0);
  assert.strictEqual(AI.atLeast("hard", "normal"), true);
  assert.strictEqual(AI.atLeast("easy", "normal"), false);
  assert.strictEqual(AI.chessRating("expert"), "3190");
});

check("seeded rng is deterministic and bounded", () => {
  const a = AI.rng(42);
  const b = AI.rng(42);
  for (let i = 0; i < 50; i++) {
    const value = a();
    assert.ok(value >= 0 && value < 1);
    assert.strictEqual(value, b());
  }
  const c = AI.rng(43);
  assert.notStrictEqual(AI.rng(42)(), c());
});

check("expert always picks the best candidate", () => {
  const items = [{ v: 3 }, { v: 10 }, { v: 1 }, { v: 7 }];
  for (let i = 0; i < 200; i++) {
    assert.strictEqual(AI.choose(items, (item) => item.v, "expert").v, 10);
  }
});

check("hard picks the best nearly always", () => {
  const items = [{ v: 3 }, { v: 10 }, { v: 1 }, { v: 7 }];
  let best = 0;
  const rand = AI.rng(7);
  for (let i = 0; i < 500; i++) {
    if (AI.choose(items, (item) => item.v, "hard", { rng: rand }).v === 10) best += 1;
  }
  assert.ok(best >= 470, "hard best count " + best);
});

check("easy is weak but not degenerate", () => {
  const items = [{ v: 3 }, { v: 10 }, { v: 1 }, { v: 7 }];
  const rand = AI.rng(11);
  const seen = new Set();
  let best = 0;
  for (let i = 0; i < 400; i++) {
    const pick = AI.choose(items, (item) => item.v, "easy", { rng: rand });
    seen.add(pick.v);
    if (pick.v === 10) best += 1;
  }
  assert.ok(seen.size >= 3, "easy variety " + seen.size);
  assert.ok(best < 330, "easy too strong " + best);
});

check("choose is deterministic with a seeded rng", () => {
  const items = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
  const run = () => {
    const rand = AI.rng(99);
    return Array.from({ length: 20 }, () => AI.choose(items, (item) => item.v, "normal", { rng: rand }).v);
  };
  assert.deepStrictEqual(run(), run());
});

check("rank, best, and top order candidates", () => {
  const items = [{ v: 2 }, { v: 9 }, { v: 5 }, { v: 9 }];
  const ranked = AI.rank(items, (item) => item.v);
  assert.deepStrictEqual(ranked.map((entry) => entry.item.v), [9, 9, 5, 2]);
  assert.strictEqual(AI.best(items, (item) => item.v).v, 9);
  assert.deepStrictEqual(AI.top(items, (item) => item.v, 2).map((item) => item.v), [9, 9]);
});

check("chance maps each difficulty and falls back safely", () => {
  assert.strictEqual(AI.chance("easy", 0.1, 0.2, 0.3, 0.4), 0.1);
  assert.strictEqual(AI.chance("normal", 0.1, 0.2, 0.3, 0.4), 0.2);
  assert.strictEqual(AI.chance("hard", 0.1, 0.2, 0.3, 0.4), 0.3);
  assert.strictEqual(AI.chance("expert", 0.1, 0.2, 0.3, 0.4), 0.4);
  assert.strictEqual(AI.chance("expert", 0.1, 0.2, 0.3), 0.3);
  assert.strictEqual(AI.chance("unknown", 0.1, 0.2, 0.3), 0.2);
});

check("blunder probabilities decrease with level", () => {
  const values = ["easy", "normal", "hard", "expert"].map((level) => AI.blunder(level));
  assert.deepStrictEqual(values, [0.32, 0.1, 0.01, 0]);
});

check("weighted respects weights and rng", () => {
  const pick = AI.weighted(["a", "b"], (item) => (item === "a" ? 1 : 0), AI.rng(3));
  assert.ok(pick === "a" || pick === "b");
  const always = AI.weighted(["a", "b"], (item) => (item === "b" ? 1000 : 0.0001), AI.rng(5));
  assert.strictEqual(always, "b");
});

check("autoAllowed gates network CPU seats", () => {
  assert.strictEqual(AI.autoAllowed({}, { index: 0 }), true);
  const host = { net: { enabled: true, isHost: true, isCpuSeat: (index) => index === 1 } };
  assert.strictEqual(AI.autoAllowed(host, { index: 1 }), true);
  assert.strictEqual(AI.autoAllowed(host, { index: 0 }), false);
  const guest = { net: { enabled: true, isHost: false, seat: 2, isCpuSeat: () => false } };
  assert.strictEqual(AI.autoAllowed(guest, { index: 2, type: "cpu" }), true);
  assert.strictEqual(AI.autoAllowed(guest, { index: 1, type: "cpu" }), false);
  const boot = { net: { enabled: true, boot: true, isHost: true, isCpuSeat: () => true } };
  assert.strictEqual(AI.autoAllowed(boot, { index: 0 }), false);
});

check("cpu detection and labels", () => {
  assert.strictEqual(AI.isCpu({ type: "cpu" }), true);
  assert.strictEqual(AI.isCpu({ isCpu: true }), true);
  assert.strictEqual(AI.isCpu({ type: "human" }), false);
  assert.strictEqual(AI.isCpu(null), false);
  assert.strictEqual(AI.name(null), "الكمبيوتر");
  assert.ok(AI.statusName({ name: "خصم", type: "cpu" }).includes("كمبيوتر"));
});

check("delay stays within level bounds", () => {
  const ranges = { easy: [500, 800], normal: [300, 500], hard: [200, 350], expert: [150, 280] };
  Object.keys(ranges).forEach((level) => {
    for (let i = 0; i < 30; i++) {
      const value = AI.delay(level);
      assert.ok(value >= ranges[level][0] && value <= ranges[level][1], level + " " + value);
    }
    const scaled = AI.delay(level, 0.5);
    assert.ok(scaled >= Math.round(ranges[level][0] * 0.5) && scaled <= Math.round(ranges[level][1] * 0.5));
  });
});

if (!process.exitCode) {
  console.log("ALL AI SELF-TESTS PASSED (" + passed + ")");
}
