"use strict";

/* --------------------------------------------------------------------------
   توليد أيقونات PWA وشاشات البداية من مصادر SVG/HTML داخل assets/brand.
   يتطلب Chrome يعمل مع منفذ التصحيح 9222 (أداة تطوير فقط، لا تُشحن للمستخدم).
   الاستخدام: node tools/make-brand.js
   -------------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BASE = "http://127.0.0.1:9222";
const ICON_DIR = path.join(ROOT, "assets", "icons");
const SPLASH_DIR = path.join(ROOT, "assets", "splash");
const STORE_DIR = path.join(ROOT, "store");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(pathname, opts) {
  const res = await fetch(BASE + pathname, opts);
  return res.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener("open", () => resolve({
      ws,
      send(method, params) {
        return new Promise((res, rej) => {
          const msgId = ++id;
          pending.set(msgId, { res, rej });
          ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
        });
      },
      close() { try { ws.close(); } catch (err) { /* ignore */ } },
    }));
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.id || !pending.has(msg.id)) return;
      const task = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) task.rej(new Error(JSON.stringify(msg.error)));
      else task.res(msg.result);
    });
    ws.addEventListener("error", reject);
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function render(client, url, width, height, file) {
  await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await client.send("Page.navigate", { url });
  await sleep(500);
  await evaluate(client, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
  await sleep(260);
  const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log("  " + path.relative(ROOT, file) + " · " + width + "×" + height);
}

(async () => {
  fs.mkdirSync(ICON_DIR, { recursive: true });
  fs.mkdirSync(SPLASH_DIR, { recursive: true });
  fs.mkdirSync(STORE_DIR, { recursive: true });

  const iconSvg = fs.readFileSync(path.join(ROOT, "assets", "brand", "icon.svg"));
  const maskableSvg = fs.readFileSync(path.join(ROOT, "assets", "brand", "icon-maskable.svg"));
  const iconUrl = "data:image/svg+xml;base64," + iconSvg.toString("base64");
  const maskableUrl = "data:image/svg+xml;base64," + maskableSvg.toString("base64");

  const splashHtml = fs.readFileSync(path.join(ROOT, "assets", "brand", "splash.html"), "utf8");
  const splashUrl = "data:text/html;base64," + Buffer.from(splashHtml.replace('src="icon.svg"', 'src="' + iconUrl + '"'), "utf8").toString("base64");

  const featureHtml = fs.readFileSync(path.join(ROOT, "assets", "brand", "feature.html"), "utf8");
  const featureUrl = "data:text/html;base64," + Buffer.from(featureHtml.replace('src="icon.svg"', 'src="' + iconUrl + '"'), "utf8").toString("base64");

  const target = await json("/json/new?" + encodeURIComponent("about:blank"), { method: "PUT" });
  const client = await connect(target.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");

  console.log("الأيقونات:");
  await render(client, iconUrl, 512, 512, path.join(ICON_DIR, "icon-512.png"));
  await render(client, iconUrl, 192, 192, path.join(ICON_DIR, "icon-192.png"));
  await render(client, iconUrl, 180, 180, path.join(ICON_DIR, "apple-touch-icon.png"));
  await render(client, iconUrl, 32, 32, path.join(ICON_DIR, "favicon-32.png"));
  await render(client, iconUrl, 16, 16, path.join(ICON_DIR, "favicon-16.png"));
  await render(client, maskableUrl, 512, 512, path.join(ICON_DIR, "icon-maskable-512.png"));

  console.log("شاشات البداية:");
  await render(client, splashUrl, 1242, 2688, path.join(SPLASH_DIR, "splash-1242x2688.png"));
  await render(client, splashUrl, 1536, 2048, path.join(SPLASH_DIR, "splash-1536x2048.png"));
  await render(client, splashUrl, 2048, 2048, path.join(SPLASH_DIR, "splash-2048x2048.png"));
  await render(client, splashUrl, 1080, 1920, path.join(SPLASH_DIR, "splash-1080x1920.png"));

  console.log("صورة المتجر:");
  await render(client, featureUrl, 1024, 500, path.join(STORE_DIR, "feature-graphic.png"));

  await json("/json/close/" + target.id).catch(() => {});
  console.log("تم.");
  setTimeout(() => process.exit(0), 200);
})().catch((err) => {
  console.error("FAIL", err && err.stack ? err.stack : err);
  process.exit(1);
});
