"use strict";

/* --------------------------------------------------------------------------
   بناء حزمة النشر: نسخ ملفات الإنتاج إلى dist/board-games،
   كتابة ملف البصمات SHA-256، ثم ضغط الحزمة النهائية.
   الاستخدام: node tools/build.js
   -------------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST_ROOT = path.join(ROOT, "dist");
const DIST = path.join(DIST_ROOT, "board-games");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();

const FILES = [
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "sw.js",
  "board-games.css",
  "README.md",
  "ASSETS.md",
  "server.js",
  "VERSION",
];

const DIRS = ["css", "js", "vendor", "assets", "store", "tools"];

const SKIP = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walk(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.isFile()) out.push({ full, rel });
  }
  return out;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

function fail(message) {
  console.error("✖ " + message);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(VERSION)) fail("ملف VERSION يجب أن يحتوي رقم إصدار مثل 1.0.0");

console.log("بناء ألعاب الطاولة — الإصدار " + VERSION);
rmrf(DIST);
fs.mkdirSync(DIST, { recursive: true });

let copied = 0;
let bytes = 0;

for (const rel of FILES) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) fail("ملف مفقود: " + rel);
  copyFile(from, path.join(DIST, rel));
  copied += 1;
  bytes += fs.statSync(from).size;
}

for (const dir of DIRS) {
  const from = path.join(ROOT, dir);
  if (!fs.existsSync(from)) fail("مجلد مفقود: " + dir);
  for (const file of walk(from, dir)) {
    copyFile(file.full, path.join(DIST, file.rel));
    copied += 1;
    bytes += fs.statSync(file.full).size;
  }
}

/* ------------------------------ التحقق ------------------------------ */

const required = [
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "sw.js",
  "css/classic.css",
  "css/fx.css",
  "css/library.css",
  "css/kootbositta.css",
  "css/chess.css",
  "css/splendor.css",
  "js/core.js",
  "js/app.js",
  "js/library-art.js",
  "js/library-art-expansion.js",
  "js/pwa.js",
  "js/games/chess.js",
  "js/games/kootbositta.js",
  "js/games/waraq.js",
  "js/games/mancala.js",
  "js/games/splendor.js",
  "js/games/takenoko.js",
  "js/games/expansion-common.js",
  "css/expansion.css",
  "css/takenoko.css",
  "vendor/peerjs/peerjs.min.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/screenshots/library-wide.png",
  "assets/screenshots/ludo-wide.png",
  "assets/screenshots/waraq-wide.png",
  "assets/screenshots/mancala-narrow.png",
];
for (const rel of required) {
  if (!fs.existsSync(path.join(DIST, rel))) fail("الحزمة ناقصة: " + rel);
}

const manifest = JSON.parse(fs.readFileSync(path.join(DIST, "manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons || []) {
  if (!fs.existsSync(path.join(DIST, icon.src))) fail("أيقونة مفقودة في البيان: " + icon.src);
}
for (const shot of manifest.screenshots || []) {
  if (!fs.existsSync(path.join(DIST, shot.src))) fail("لقطة مفقودة في البيان: " + shot.src);
}

const swSource = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
const swVersion = (swSource.match(/const VERSION = "([^"]+)"/) || [])[1];
if (swVersion !== VERSION) fail("إصدار sw.js (" + swVersion + ") لا يطابق VERSION (" + VERSION + ")");

const precache = [];
const coreBlock = swSource.slice(swSource.indexOf("const CORE = ["), swSource.indexOf("const VENDOR = ["));
const vendorBlock = swSource.slice(swSource.indexOf("const VENDOR = ["), swSource.indexOf("const PRECACHE"));
for (const block of [coreBlock, vendorBlock]) {
  for (const match of block.matchAll(/"([^"]+)"/g)) {
    const value = match[1];
    if (value === "./" || value.indexOf("const ") === 0) continue;
    if (!precache.includes(value)) precache.push(value);
  }
}
const missing = precache.filter((rel) => !fs.existsSync(path.join(DIST, rel)));
if (missing.length) fail("ملفات مطلوبة في sw.js غير موجودة: " + missing.join(", "));

const index = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
for (const game of [
  "monopoly", "catan", "ticket-to-ride", "carcassonne", "risk", "scrabble",
  "cluedo", "uno", "love-letter", "pandemic", "tavla", "waraq", "kootbositta",
  "domino", "ludo", "snakes", "checkers", "mancala", "chess", "splendor",
  "yahtzee", "rummikub", "othello", "connect-four", "stratego", "parcheesi",
  "sorry", "battleship", "seven-wonders", "azul", "wingspan", "dominion",
  "terraforming-mars", "no-thanks", "coup", "for-sale", "skull", "king-of-tokyo",
  "codenames", "takenoko",
]) {
  if (!index.includes("js/games/" + game + ".js")) fail("سكربت اللعبة غير مربوط: " + game);
}

for (const asset of ["css/library.css", "js/library-art.js", "js/library-art-expansion.js", "css/expansion.css"]) {
  if (!index.includes(asset)) fail("أصل المكتبة غير مربوط: " + asset);
}

/* ------------------------------ البصمات ------------------------------ */

const files = walk(DIST, "");
const lines = files
  .sort((a, b) => a.rel.localeCompare(b.rel))
  .map((file) => sha256(file.full) + "  " + file.rel);
const sumsPath = path.join(DIST_ROOT, "SHA256SUMS.txt");
fs.writeFileSync(sumsPath, lines.join("\n") + "\n", "utf8");

/* ------------------------------ الضغط ------------------------------ */

const zipName = "nubala-board-games-" + VERSION + ".zip";
const zipPath = path.join(DIST_ROOT, zipName);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });

/* ضغط متعدد المنصات بلا اعتماد على PowerShell: ويندوز → PowerShell أو tar،
   لينكس/ماك (Netlify مثلًا) → zip أو tar أو python. فشل الضغط لا يُفشل البناء
   لأن النشر يستخدم مجلد dist/board-games نفسه. */
function tryRun(cmd, args, opts) {
  try {
    execFileSync(cmd, args, Object.assign({ stdio: "ignore" }, opts || {}));
    return fs.existsSync(zipPath);
  } catch (err) {
    return false;
  }
}

function makeZip() {
  const attempts = [];
  if (process.platform === "win32") {
    attempts.push(() => tryRun("powershell", [
      "-NoProfile", "-NonInteractive", "-Command",
      "Compress-Archive -Path '" + DIST + "\\*' -DestinationPath '" + zipPath + "' -CompressionLevel Optimal",
    ]));
  }
  attempts.push(() => tryRun("zip", ["-r", "-q", zipPath, "."], { cwd: DIST }));
  attempts.push(() => tryRun("tar", ["-a", "-c", "-f", zipPath, "-C", DIST, "."]));
  attempts.push(() => tryRun("python3", ["-c",
    "import shutil,sys;shutil.make_archive(sys.argv[1],'zip',sys.argv[2])",
    zipPath.replace(/\.zip$/, ""), DIST]));
  for (const attempt of attempts) {
    if (attempt()) return true;
    if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
  }
  return false;
}

const zipped = makeZip();
if (!zipped) {
  console.warn("⚠ تعذّر إنشاء ملف ZIP على هذا الجهاز (لا zip ولا tar ولا PowerShell). المجلد dist/board-games جاهز للنشر كما هو.");
}

const zipBytes = zipped ? fs.statSync(zipPath).size : 0;
console.log("");
console.log("  الملفات: " + copied);
console.log("  الحجم قبل الضغط: " + kb(bytes));
console.log("  SHA-256: dist/SHA256SUMS.txt (" + lines.length + " ملفًا)");
if (zipped) console.log("  الحزمة: dist/" + zipName + " (" + kb(zipBytes) + ")");
console.log("  جاهزة للنشر: dist/board-games/");
console.log("تم البناء بنجاح ✓");
