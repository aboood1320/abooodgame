/* ==========================================================================
   ألعاب الطاولة — عامل الخدمة
   تخزين هيكل التطبيق مسبقًا، ثم الشبكة أولًا للتنقل،
   وتحديث في الخلفية للأصول. لا يُخزَّن أي طلب غير GET أو خارج النطاق.
   ========================================================================== */
"use strict";

const VERSION = "1.9.18";
const CACHE = "bg-shell-v" + VERSION + "-r1";
const OFFLINE_URL = "index.html";

const CORE = [
  "./",
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "board-games.css",
  "css/carcassonne.css",
  "css/cards.css",
  "css/classic.css",
  "css/cluedo.css",
  "css/fx.css",
  "css/net.css",
  "css/pandemic.css",
  "css/polish.css",
  "css/upgrade.css",
  "css/library.css",
  "css/risk.css",
  "css/scrabble.css",
  "css/tavla.css",
  "css/theme-refresh.css",
  "css/ttr.css",
  "css/uno.css",
  "css/love-letter.css",
  "css/splendor.css",
  "css/kootbositta.css",
  "css/chess.css",
  "vendor/chess/pieces/wK.svg",
  "vendor/chess/pieces/wQ.svg",
  "vendor/chess/pieces/wR.svg",
  "vendor/chess/pieces/wB.svg",
  "vendor/chess/pieces/wN.svg",
  "vendor/chess/pieces/wP.svg",
  "vendor/chess/pieces/bK.svg",
  "vendor/chess/pieces/bQ.svg",
  "vendor/chess/pieces/bR.svg",
  "vendor/chess/pieces/bB.svg",
  "vendor/chess/pieces/bN.svg",
  "vendor/chess/pieces/bP.svg",
  "css/net2.css",
  "css/monopoly.css",
  "css/ludo.css",
  "css/expansion.css",
  "css/yahtzee.css",
  "css/rummikub.css",
  "css/othello.css",
  "css/connect-four.css",
  "css/stratego.css",
  "css/parcheesi.css",
  "css/sorry.css",
  "css/battleship.css",
  "css/seven-wonders.css",
  "css/azul.css",
  "css/wingspan.css",
  "css/dominion.css",
  "css/terraforming-mars.css",
  "css/no-thanks.css",
  "css/coup.css",
  "css/for-sale.css",
  "css/skull.css",
  "css/king-of-tokyo.css",
  "css/codenames.css",
  "css/takenoko.css",
  "css/perf.css",
  "js/core.js",
  "js/fx.js",
  "js/library-art.js",
  "js/library-art-expansion.js",
  "js/ai.js",
  "js/games/expansion-common.js",
  "js/engine.js",
  "js/chess-ai.js",
  "js/chess-ai-worker.js",
  "js/relay-config.js",
  "js/sound-packs.js",
  "js/net.js",
  "js/app.js",
  "js/online.js",
  "js/online-host.js",
  "js/site-extras.js",
  "js/pwa.js",
  "js/data/arabic-words.js",
  "js/games/monopoly.js",
  "js/games/catan.js",
  "js/games/ttr-art.js",
  "js/games/ttr-board.js",
  "js/games/ticket-to-ride.js",
  "js/games/carcassonne.js",
  "js/games/risk-maps.js",
  "js/games/risk-map-data.js",
  "js/games/risk.js",
  "js/games/scrabble.js",
  "js/games/cluedo-art.js",
  "js/games/cluedo.js",
  "js/games/uno.js",
  "js/games/love-letter.js",
  "js/games/splendor.js",
  "js/games/chess.js",
  "js/games/kootbositta.js",
  "js/games/pandemic.js",
  "js/games/tavla.js",
  "js/games/waraq.js",
  "js/games/domino.js",
  "js/games/ludo.js",
  "js/games/snakes.js",
  "js/games/checkers.js",
  "js/games/mancala.js",
  "js/games/yahtzee.js",
  "js/games/rummikub.js",
  "js/games/othello.js",
  "js/games/connect-four.js",
  "js/games/stratego.js",
  "js/games/parcheesi.js",
  "js/games/sorry.js",
  "js/games/battleship.js",
  "js/games/seven-wonders.js",
  "js/games/azul.js",
  "js/games/wingspan.js",
  "js/games/dominion.js",
  "js/games/terraforming-mars.js",
  "js/games/no-thanks.js",
  "js/games/coup.js",
  "js/games/for-sale.js",
  "js/games/skull.js",
  "js/games/king-of-tokyo.js",
  "js/games/codenames.js",
  "js/games/takenoko.js",
  "vendor/peerjs/peerjs.min.js",
  "assets/brand/icon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-32.png",
  "assets/icons/favicon-16.png"
];

const VENDOR = [
  "vendor/stockfish/README.txt",
  "vendor/stockfish/LICENSE.txt",
  "vendor/stockfish/stockfish-17.1-lite-single.js",
  "vendor/stockfish/stockfish-17.1-lite-single.wasm",
  "vendor/chess/LICENSE.txt",
  "vendor/kenney/LICENSE.txt",
  "vendor/kenney/licenses/boardgame-pack-CC0.txt",
  "vendor/kenney/licenses/casino-audio-CC0.txt",
  "vendor/kenney/licenses/interface-sounds-CC0.txt",
  "vendor/kenney/licenses/music-jingles-CC0.txt",
  "vendor/kenney/licenses/playing-cards-pack-CC0.txt",
  "vendor/kenney/licenses/ui-audio-CC0.txt",
  "vendor/kenney/audio/build.ogg",
  "vendor/kenney/audio/capture.ogg",
  "vendor/kenney/audio/card.ogg",
  "vendor/kenney/audio/card2.ogg",
  "vendor/kenney/audio/click.ogg",
  "vendor/kenney/audio/click2.ogg",
  "vendor/kenney/audio/click3.ogg",
  "vendor/kenney/audio/coin.ogg",
  "vendor/kenney/audio/crown.ogg",
  "vendor/kenney/audio/deal.ogg",
  "vendor/kenney/audio/dice.ogg",
  "vendor/kenney/audio/dice2.ogg",
  "vendor/kenney/audio/diceland.ogg",
  "vendor/kenney/audio/diceland2.ogg",
  "vendor/kenney/audio/draw.ogg",
  "vendor/kenney/audio/draw2.ogg",
  "vendor/kenney/audio/error.ogg",
  "vendor/kenney/audio/flip.ogg",
  "vendor/kenney/audio/ladder.ogg",
  "vendor/kenney/audio/lose.ogg",
  "vendor/kenney/audio/meeple.ogg",
  "vendor/kenney/audio/move.ogg",
  "vendor/kenney/audio/move2.ogg",
  "vendor/kenney/audio/pass.ogg",
  "vendor/kenney/audio/place.ogg",
  "vendor/kenney/audio/point.ogg",
  "vendor/kenney/audio/point2.ogg",
  "vendor/kenney/audio/recall.ogg",
  "vendor/kenney/audio/resource.ogg",
  "vendor/kenney/audio/reveal.ogg",
  "vendor/kenney/audio/robber.ogg",
  "vendor/kenney/audio/score.ogg",
  "vendor/kenney/audio/score2.ogg",
  "vendor/kenney/audio/select.ogg",
  "vendor/kenney/audio/shuffle.ogg",
  "vendor/kenney/audio/shuffle2.ogg",
  "vendor/kenney/audio/snake.ogg",
  "vendor/kenney/audio/step.ogg",
  "vendor/kenney/audio/ticket.ogg",
  "vendor/kenney/audio/tile.ogg",
  "vendor/kenney/audio/toggle.ogg",
  "vendor/kenney/audio/train.ogg",
  "vendor/kenney/audio/turn.ogg",
  "vendor/kenney/audio/unlock.ogg",
  "vendor/kenney/audio/win.ogg",
  "vendor/kenney/cards/card_back.png",
  "vendor/kenney/cards/card_clubs_02.png",
  "vendor/kenney/cards/card_clubs_03.png",
  "vendor/kenney/cards/card_clubs_04.png",
  "vendor/kenney/cards/card_clubs_05.png",
  "vendor/kenney/cards/card_clubs_06.png",
  "vendor/kenney/cards/card_clubs_07.png",
  "vendor/kenney/cards/card_clubs_08.png",
  "vendor/kenney/cards/card_clubs_09.png",
  "vendor/kenney/cards/card_clubs_10.png",
  "vendor/kenney/cards/card_clubs_A.png",
  "vendor/kenney/cards/card_clubs_J.png",
  "vendor/kenney/cards/card_clubs_K.png",
  "vendor/kenney/cards/card_clubs_Q.png",
  "vendor/kenney/cards/card_diamonds_02.png",
  "vendor/kenney/cards/card_diamonds_03.png",
  "vendor/kenney/cards/card_diamonds_04.png",
  "vendor/kenney/cards/card_diamonds_05.png",
  "vendor/kenney/cards/card_diamonds_06.png",
  "vendor/kenney/cards/card_diamonds_07.png",
  "vendor/kenney/cards/card_diamonds_08.png",
  "vendor/kenney/cards/card_diamonds_09.png",
  "vendor/kenney/cards/card_diamonds_10.png",
  "vendor/kenney/cards/card_diamonds_A.png",
  "vendor/kenney/cards/card_diamonds_J.png",
  "vendor/kenney/cards/card_diamonds_K.png",
  "vendor/kenney/cards/card_diamonds_Q.png",
  "vendor/kenney/cards/card_empty.png",
  "vendor/kenney/cards/card_hearts_02.png",
  "vendor/kenney/cards/card_hearts_03.png",
  "vendor/kenney/cards/card_hearts_04.png",
  "vendor/kenney/cards/card_hearts_05.png",
  "vendor/kenney/cards/card_hearts_06.png",
  "vendor/kenney/cards/card_hearts_07.png",
  "vendor/kenney/cards/card_hearts_08.png",
  "vendor/kenney/cards/card_hearts_09.png",
  "vendor/kenney/cards/card_hearts_10.png",
  "vendor/kenney/cards/card_hearts_A.png",
  "vendor/kenney/cards/card_hearts_J.png",
  "vendor/kenney/cards/card_hearts_K.png",
  "vendor/kenney/cards/card_hearts_Q.png",
  "vendor/kenney/cards/card_joker_black.png",
  "vendor/kenney/cards/card_joker_red.png",
  "vendor/kenney/cards/card_spades_02.png",
  "vendor/kenney/cards/card_spades_03.png",
  "vendor/kenney/cards/card_spades_04.png",
  "vendor/kenney/cards/card_spades_05.png",
  "vendor/kenney/cards/card_spades_06.png",
  "vendor/kenney/cards/card_spades_07.png",
  "vendor/kenney/cards/card_spades_08.png",
  "vendor/kenney/cards/card_spades_09.png",
  "vendor/kenney/cards/card_spades_10.png",
  "vendor/kenney/cards/card_spades_A.png",
  "vendor/kenney/cards/card_spades_J.png",
  "vendor/kenney/cards/card_spades_K.png",
  "vendor/kenney/cards/card_spades_Q.png",
  "vendor/kenney/dice/dieWhite1.png",
  "vendor/kenney/dice/dieWhite2.png",
  "vendor/kenney/dice/dieWhite3.png",
  "vendor/kenney/dice/dieWhite4.png",
  "vendor/kenney/dice/dieWhite5.png",
  "vendor/kenney/dice/dieWhite6.png",
  "vendor/kenney/dice/dieWhite_border1.png",
  "vendor/kenney/dice/dieWhite_border2.png",
  "vendor/kenney/dice/dieWhite_border3.png",
  "vendor/kenney/dice/dieWhite_border4.png",
  "vendor/kenney/dice/dieWhite_border5.png",
  "vendor/kenney/dice/dieWhite_border6.png"
];

/* التخزين المسبق للهيكل فقط. الأصوات والبطاقات (~110 ملفًا) تُخزَّن عند أول استخدام فقط
   بدل تنزيلها كلها في أول زيارة (كان يثقل الهاتف والشبكة). */
const PRECACHE = CORE;

/* روابط أُعيد التحقق منها مع الشبكة خلال عمر عامل الخدمة هذا */
const revalidated = new Set();
const MEDIA_RE = /\.(ogg|mp3|wav|png|jpe?g|webp|svg|woff2?)$/i;

function cacheKey(request) {
  try {
    const url = new URL(request.url);
    return new Request(url.origin + url.pathname);
  } catch (err) {
    return request;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })))
    );
    const failed = results.filter((item) => item.status === "rejected");
    if (failed.length) {
      console.warn("[SW] تعذّر تخزين " + failed.length + " من أصل " + PRECACHE.length + " ملفًا.");
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("bg-shell-v") && key !== CACHE).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;
  if (url.pathname.indexOf("/api/") !== -1) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await Promise.race([
          fetch(request),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4500)),
        ]);
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(cacheKey(request), response.clone());
        }
        return response;
      } catch (err) {
        const cache = await caches.open(CACHE);
        const hit = (await cache.match(request, { ignoreSearch: true })) ||
          (await cache.match(OFFLINE_URL, { ignoreSearch: true })) ||
          (await cache.match("./", { ignoreSearch: true }));
        if (hit) return hit;
        return new Response(
          "<!DOCTYPE html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><title>دون اتصال</title>" +
          "<body style=\"font-family:system-ui;background:#0b151a;color:#f6f2e8;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center\">" +
          "<div><h1>لا يوجد اتصال</h1><p>افتح اللعبة مرة واحدة مع الاتصال لتعمل بعدها دون إنترنت.</p></div></body></html>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  const key = url.origin + url.pathname;
  const isMedia = MEDIA_RE.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    /* الرابط نفسه بما فيه من ?v= : نسخة محددة لا تتغيّر، نعيدها مباشرة.
       (كان عامل الخدمة يتجاهل ?v= فيُعيد ملفات قديمة بعد كل نشر فتختلط النسخ وتضيع الميزات الجديدة.) */
    const exact = await cache.match(request);
    if (exact) {
      if (!url.search && !isMedia && !revalidated.has(key)) {
        /* ملف بلا رقم نسخة: نحتفظ بالنسخة ونحدّثها في الخلفية مرة في الجلسة */
        revalidated.add(key);
        event.waitUntil(fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") return cache.put(request, response.clone());
          return undefined;
        }).catch(() => {}));
      }
      return exact;
    }
    /* الوسائط ثابتة: نسخة مخزّنة من أي رابط تكفي */
    if (isMedia) {
      const media = await cache.match(request, { ignoreSearch: true });
      if (media) return media;
    }
    let fresh = null;
    try {
      fresh = await fetch(request);
    } catch (err) {
      fresh = null;
    }
    /* 206 (طلبات Range للصوت) لا يمكن تخزينها */
    if (fresh && fresh.status === 200 && fresh.type === "basic") {
      revalidated.add(key);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    if (fresh) return fresh;
    /* لا شبكة: أي نسخة مخزّنة أفضل من لا شيء */
    const fallback = await cache.match(request, { ignoreSearch: true });
    return fallback || new Response("", { status: 504, statusText: "Offline" });
  })());
});
