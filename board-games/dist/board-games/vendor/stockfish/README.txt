Stockfish 17.1 Lite (single-threaded, WebAssembly)
=================================================

الملفات:
- stockfish-17.1-lite-single.js
- stockfish-17.1-lite-single.wasm

المصدر: مشروع stockfish.js (nmrugg) المبني على Stockfish الرسمي:
https://github.com/nmrugg/stockfish.js
https://github.com/official-stockfish/Stockfish

النسخة: Stockfish 17.1 — بناء Lite أحادي الخيط، يعمل دون الحاجة إلى
SharedArrayBuffer أو رؤوس COOP/COEP.

الترخيص: GNU General Public License v3.0 (GPLv3). النسخة الكاملة في
الملف LICENSE.txt المجاور. تستخدم اللعبة هذا المحرك كبرنامج منفصل عبر
Web Worker، وتوفّر ملفات المصدر والترخيص كما هي.

ملاحظة: يحسب عامل JavaScript مسار ملف .wasm من اسم ملف .js نفسه، لذا يجب
إبقاء اسمي الملفين متطابقين عند التحديث.
