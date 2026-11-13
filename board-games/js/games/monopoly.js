/* ==========================================================================
   مونوبولي — نسخة رقمية محلية كاملة
   ========================================================================== */
(function () {
  "use strict";

  const BG = window.BG;
  const U = BG.util;
  const FX = BG.fx;
  const AI = BG.ai;

  const GROUP_COLORS = {
    brown: "#8a5a34",
    lightblue: "#7dc7df",
    pink: "#d56ba2",
    orange: "#e8954b",
    red: "#d5544f",
    yellow: "#f0cb4c",
    green: "#4eaa7a",
    darkblue: "#4d6fce",
    rail: "#2a3439",
    utility: "#b9c3c7",
  };

  const GROUP_NAMES = {
    brown: "بني",
    lightblue: "أزرق فاتح",
    pink: "وردي",
    orange: "برتقالي",
    red: "أحمر",
    yellow: "أصفر",
    green: "أخضر",
    darkblue: "أزرق داكن",
  };

  const PLAYER_COLORS = ["#ef8074", "#5fa8f5", "#f2c75c", "#69cd8d", "#b47cf0", "#f09a52"];

  const DEFAULT_OPTIONS = {
    startMoney: 1500,
    jailFine: 50,
    auction: true,
    freeParking: false,
  };
  const BANK_HOUSES = 32;
  const BANK_HOTELS = 12;
  const GO_SALARY = 200;

  const SPACES = [
    { type: "go", name: "الانطلاق", short: "الانطلاق", icon: "➜" },
    { type: "prop", name: "شارع البحر المتوسط", short: "المتوسط", group: "brown", price: 60, house: 50, rent: [2, 10, 30, 90, 160, 250] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع البلطيق", short: "البلطيق", group: "brown", price: 60, house: 50, rent: [4, 20, 60, 180, 320, 450] },
    { type: "tax", name: "ضريبة الدخل", short: "ضريبة", icon: "💸", amount: 200 },
    { type: "rail", name: "سكة حديد القراءة", short: "القراءة", price: 200, icon: "🚂" },
    { type: "prop", name: "شارع أورينتال", short: "أورينتال", group: "lightblue", price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "شارع فيرمونت", short: "فيرمونت", group: "lightblue", price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
    { type: "prop", name: "شارع كونيتيكت", short: "كونيتيكت", group: "lightblue", price: 120, house: 50, rent: [8, 40, 100, 300, 450, 600] },
    { type: "jail", name: "السجن / زيارة", short: "السجن", icon: "🔒" },
    { type: "prop", name: "سانت تشارلز", short: "سانت تشارلز", group: "pink", price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
    { type: "utility", name: "شركة الكهرباء", short: "الكهرباء", price: 150, icon: "💡" },
    { type: "prop", name: "شارع ستيتس", short: "ستيتس", group: "pink", price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
    { type: "prop", name: "شارع فرجينيا", short: "فرجينيا", group: "pink", price: 160, house: 100, rent: [12, 60, 180, 500, 700, 900] },
    { type: "rail", name: "سكة حديد بنسلفانيا", short: "بنسلفانيا", price: 200, icon: "🚂" },
    { type: "prop", name: "سانت جيمس", short: "سانت جيمس", group: "orange", price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع تينيسي", short: "تينيسي", group: "orange", price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
    { type: "prop", name: "نيويورك", short: "نيويورك", group: "orange", price: 200, house: 100, rent: [16, 80, 220, 600, 800, 1000] },
    { type: "free", name: "موقف مجاني", short: "موقف", icon: "🅿️" },
    { type: "prop", name: "كنتاكي", short: "كنتاكي", group: "red", price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "إنديانا", short: "إنديانا", group: "red", price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { type: "prop", name: "إلينوي", short: "إلينوي", group: "red", price: 240, house: 150, rent: [20, 100, 300, 750, 925, 1100] },
    { type: "rail", name: "سكة حديد B&O", short: "B&O", price: 200, icon: "🚂" },
    { type: "prop", name: "شارع الأطلسي", short: "الأطلسي", group: "yellow", price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { type: "prop", name: "فينتنور", short: "فينتنور", group: "yellow", price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { type: "utility", name: "مياه المدينة", short: "المياه", price: 150, icon: "🚰" },
    { type: "prop", name: "حدائق مارفن", short: "مارفن", group: "yellow", price: 280, house: 150, rent: [24, 120, 360, 850, 1025, 1200] },
    { type: "gotojail", name: "اذهب إلى السجن", short: "إلى السجن", icon: "🚔" },
    { type: "prop", name: "شارع المحيط الهادئ", short: "الهادئ", group: "green", price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { type: "prop", name: "كارولينا الشمالية", short: "كارولينا", group: "green", price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { type: "chest", name: "صندوق المجتمع", short: "صندوق", icon: "🎁" },
    { type: "prop", name: "شارع بنسلفانيا", short: "بنسلفانيا", group: "green", price: 320, house: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
    { type: "rail", name: "سكة الخط القصير", short: "الخط القصير", price: 200, icon: "🚂" },
    { type: "chance", name: "فرصة", short: "فرصة", icon: "❓" },
    { type: "prop", name: "بارك بليس", short: "بارك بليس", group: "darkblue", price: 350, house: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
    { type: "tax", name: "ضريبة الرفاهية", short: "رفاهية", icon: "💎", amount: 100 },
    { type: "prop", name: "بوردووك", short: "بوردووك", group: "darkblue", price: 400, house: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
  ];

  const CHANCE = [
    { id: "go", title: "تقدّم إلى الانطلاق", text: "تحرّك إلى مربع الانطلاق واستلم 200 دولار." },
    { id: "illinois", title: "تقدّم إلى إلينوي", text: "تحرّك إلى شارع إلينوي. إذا مررت بالانطلاق استلم راتبك." },
    { id: "stcharles", title: "تقدّم إلى سانت تشارلز", text: "تحرّك إلى شارع سانت تشارلز. إذا مررت بالانطلاق استلم راتبك." },
    { id: "nearestRail", title: "أقرب سكة حديد", text: "تقدّم إلى أقرب سكة حديد وادفع الأجرة المعتادة إن كانت مملوكة." },
    { id: "nearestUtility", title: "أقرب مرفق", text: "تقدّم إلى أقرب مرفق وادفع عشرة أضعاف مجموع النرد إن كان مملوكًا." },
    { id: "boardwalk", title: "تقدّم إلى بوردووك", text: "تحرّك إلى بوردووك. إذا مررت بالانطلاق استلم راتبك." },
    { id: "reading", title: "تقدّم إلى سكة القراءة", text: "تحرّك إلى سكة حديد القراءة. إذا مررت بالانطلاق استلم راتبك." },
    { id: "dividend", title: "توزيعات أرباح", text: "البنك يدفع لك 50 دولارًا." },
    { id: "jailFree", title: "بطاقة خروج من السجن", text: "احتفظ بهذه البطاقة لاستخدامها عند دخولك السجن." },
    { id: "back3", title: "عُد ثلاث خطوات", text: "ارجع ثلاث خطوات ونفّذ تأثير المربع الذي تصل إليه." },
    { id: "goJail", title: "اذهب مباشرة إلى السجن", text: "انتقل إلى السجن دون المرور بالانطلاق." },
    { id: "repairs", title: "إصلاحات الشوارع", text: "ادفع 25 دولارًا لكل منزل و100 دولار لكل فندق تملكه." },
    { id: "poorTax", title: "ضريبة الفقراء", text: "ادفع 15 دولارًا." },
    { id: "chairman", title: "رئيس مجلس الإدارة", text: "ادفع 50 دولارًا لكل لاعب آخر." },
    { id: "loan", title: "قرض بناء", text: "استلم 150 دولارًا." },
    { id: "speeding", title: "مخالفة سرعة", text: "ادفع 15 دولارًا." },
  ];

  const CHEST = [
    { id: "go", title: "تقدّم إلى الانطلاق", text: "تحرّك إلى الانطلاق واستلم 200 دولار." },
    { id: "bankError", title: "خطأ مصرفي", text: "البنك يدفع لك 200 دولار." },
    { id: "doctor", title: "أتعاب الطبيب", text: "ادفع 50 دولارًا." },
    { id: "stock", title: "بيع أسهم", text: "استلم 50 دولارًا." },
    { id: "jailFree", title: "بطاقة خروج من السجن", text: "احتفظ بهذه البطاقة لاستخدامها عند دخولك السجن." },
    { id: "holiday", title: "صندوق العطلة", text: "استلم 100 دولار." },
    { id: "refund", title: "استرداد ضريبي", text: "استلم 20 دولارًا." },
    { id: "birthday", title: "عيد ميلاد سعيد", text: "كل لاعب آخر يدفع لك 10 دولارات." },
    { id: "insurance", title: "تأمين على الحياة", text: "استلم 100 دولار." },
    { id: "hospital", title: "مصاريف المستشفى", text: "ادفع 100 دولار." },
    { id: "school", title: "رسوم مدرسية", text: "ادفع 50 دولارًا." },
    { id: "consult", title: "أتعاب استشارية", text: "استلم 25 دولارًا." },
    { id: "repairs", title: "أعمال صيانة", text: "ادفع 40 دولارًا لكل منزل و115 دولارًا لكل فندق تملكه." },
    { id: "beauty", title: "مسابقة جمال", text: "استلم 10 دولارات." },
    { id: "opera", title: "حفل الأوبرا", text: "كل لاعب آخر يدفع لك 50 دولارًا." },
    { id: "secondPrize", title: "الجائزة الثانية", text: "استلم 10 دولارات." },
    { id: "inherit", title: "ميراث", text: "استلم 100 دولار." },
  ];

  let state = null;
  let apiRef = null;
  let rootRef = null;
  let aiRunner = null;
  let tokenPositions = new Map();
  let tokenTimers = [];
  let cpuBuildCount = 0;

  /* ------------------------------ أصول الواجهة ------------------------------ */

  const TOKEN_ART = [
    {
      name: "القبعة",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="37.5" rx="17" ry="5.2" fill="#0f1619" opacity=".32"/><path d="M13 34.4h22l-2.2-3.1H15.2z" fill="#111a1e"/><path d="M17.2 31V15.2c0-4.1 3-6.7 6.8-6.7s6.8 2.6 6.8 6.7V31" fill="#1e2c31"/><path d="M17.2 25.1h13.6v6H17.2z" fill="#d7a945"/><path d="M17.2 15.2c0-4.1 3-6.7 6.8-6.7s6.8 2.6 6.8 6.7v2.1H17.2z" fill="#26373d"/><path d="M19.2 13.2h9.6" stroke="#51666d" stroke-width="1.3" stroke-linecap="round"/></svg>',
    },
    {
      name: "السيارة",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="36.5" rx="18" ry="4.4" fill="#0f1619" opacity=".28"/><path d="M8.5 27.5l2.1-6.1c.6-1.8 2.2-2.9 4.1-2.9h5l3.2-4.3c.7-.9 1.7-1.4 2.8-1.4h7.8c1.5 0 2.8.8 3.5 2.1l2.4 4.6 4.4 1.5c1.5.5 2.4 1.9 2.4 3.5v4.2c0 1.1-.9 2-2 2H10.4c-1.3 0-2.3-1.1-1.9-2.5z" fill="#cf4e44"/><path d="M23.9 18.3h-7.9c-.7 0-1.3.3-1.7.9l-2.9 4.5h12.5z" fill="#bfe6f1"/><path d="M26.1 18.3h7.2c.5 0 1 .2 1.3.7l2.6 4.7H26.1z" fill="#bfe6f1"/><path d="M9.2 29.4h29.8" stroke="#8e302c" stroke-width="1.4"/><circle cx="15.4" cy="32.2" r="3.3" fill="#1c2529"/><circle cx="15.4" cy="32.2" r="1.2" fill="#aebcc0"/><circle cx="33.4" cy="32.2" r="3.3" fill="#1c2529"/><circle cx="33.4" cy="32.2" r="1.2" fill="#aebcc0"/><rect x="30.4" y="19.2" width="1.2" height="4.9" rx=".6" fill="#f4c34e"/><rect x="8.4" y="27.4" width="3" height="1.8" rx=".7" fill="#f3d16b"/></svg>',
    },
    {
      name: "الكلب",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="39" rx="15" ry="4" fill="#0f1619" opacity=".26"/><path d="M18.8 34.8c-1.9 0-3.4-1.5-3.4-3.4v-7.1c0-3.4 1.8-6.2 4.6-7.8l3.5-2 .9-5.2c.1-.8.8-1.4 1.6-1.3l3.4.4c.8.1 1.4.8 1.3 1.6l-.8 5.3 3.6 3.2c2.2 2 3.4 4.8 3.4 7.8v4.3c0 1.9-1.5 3.4-3.4 3.4h-1.1v2.2c0 1.9-1.5 3.4-3.4 3.4s-3.4-1.5-3.4-3.4v-2.2h-5.1v2.2c0 1.9-1.5 3.4-3.4 3.4s-3.4-1.5-3.4-3.4v-2.4z" fill="#6f4a2f"/><path d="M23.8 20.3l1.1-6.2c.1-.6.6-1 1.2-.9l2.2.3c.6.1 1 .6.9 1.2l-1 6.2" fill="#8e6342"/><path d="M31.7 22.1l2.1 2.4c1.5 1.8 2.3 4.1 2.3 6.5v2.7h-2.4z" fill="#593a25"/><circle cx="27.4" cy="15.4" r=".9" fill="#f5d58e"/><path d="M32.7 24.4c1.3.5 2.1 1.5 2.4 2.7" stroke="#3e2819" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M17.7 30.8c-.1-2.6.8-4.9 2.5-6.9" stroke="#8e6342" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>',
    },
    {
      name: "السفينة",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="38.4" rx="18" ry="4" fill="#0f1619" opacity=".27"/><path d="M7.3 30.8h33.4l-3.2 6.1c-.8 1.5-2.3 2.4-4 2.4H14.5c-1.7 0-3.2-.9-4-2.4z" fill="#2f5f86"/><path d="M9.8 30.8h28.4" stroke="#6fb6d8" stroke-width="1.5"/><path d="M24 10.2v20.6" stroke="#203d54" stroke-width="2"/><path d="M25.1 11.4l8.2 8.5c.8.8.2 2.2-1 2.2h-7.2z" fill="#e9eef0"/><path d="M22.8 14.3l-7.3 7.8c-.7.8-.2 2 1 2h6.3z" fill="#cfd9dc"/><path d="M24 7.3l1.8 3.2h-3.6z" fill="#d7a945"/><path d="M8.1 33.8h31.8" stroke="#e8b44f" stroke-width="1.1" stroke-dasharray="2 2"/></svg>',
    },
    {
      name: "الحذاء",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="38.7" rx="16" ry="4" fill="#0f1619" opacity=".27"/><path d="M17.1 12.4l7.1.9c1.2.2 2 1.2 2 2.4l-.2 7.2c-.1 3.3 1.3 5.9 4.1 7.8l4.2 2.9c2.3 1.6 3.6 4.1 3.6 6.8H13.4c-1.6 0-2.9-1.3-2.9-2.9V31c0-1.6.7-3 1.9-4l3.4-2.9c1.5-1.3 2.4-3 2.5-5l.1-4.4c0-1.2-.7-2.3-1.3-2.3z" fill="#7a4a2e"/><path d="M15.8 12.2l8.5 1.1" stroke="#a57651" stroke-width="1.3" stroke-linecap="round"/><path d="M12.7 31.5c4.3 1 8.3 1 11.9 0 3.6 2 7.2 2.9 11.3 2.8" stroke="#5c3520" stroke-width="1.2" fill="none"/><path d="M11.4 36.5h27.3" stroke="#25160d" stroke-width="2.2"/></svg>',
    },
    {
      name: "التاج",
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="38" rx="15" ry="4" fill="#0f1619" opacity=".26"/><path d="M10.2 16.8l7.6 5.5 6.2-9.7 6.2 9.7 7.6-5.5-2.5 16.1c-.2 1.2-1.2 2.1-2.4 2.1H15.1c-1.2 0-2.2-.9-2.4-2.1z" fill="#e1b44d"/><path d="M13.2 31.2h21.6" stroke="#f8dda0" stroke-width="1.6"/><circle cx="10" cy="15.4" r="2.3" fill="#f4d47b"/><circle cx="24" cy="10.4" r="2.5" fill="#f4d47b"/><circle cx="38" cy="15.4" r="2.3" fill="#f4d47b"/><circle cx="18.1" cy="27.5" r="1.5" fill="#b48421"/><circle cx="24" cy="27.5" r="1.5" fill="#cf4e44"/><circle cx="29.9" cy="27.5" r="1.5" fill="#4e8a68"/></svg>',
    },
  ];

  const ICON_ART = {
    go: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 24h24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M25 13l11 11-11 11" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 34h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".45"/></svg>',
    chest: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 20h32v19c0 1.7-1.3 3-3 3H11c-1.7 0-3-1.3-3-3z" fill="#1f6b53"/><path d="M8 20h32v6H8z" fill="#2a8b69"/><path d="M15 20V13c0-3.9 3.1-7 7-7h4c3.9 0 7 3.1 7 7v7" fill="none" stroke="#d7a945" stroke-width="3"/><path d="M24 20v10" stroke="#e1b44d" stroke-width="4"/><path d="M20 20h8v8h-8z" fill="#e1b44d"/></svg>',
    chance: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="#e1b44d" opacity=".18"/><path d="M17.6 18.7c.4-3.6 3-6.1 6.8-6.1 4 0 6.9 2.6 6.9 6.2 0 3.4-2.1 5.2-4.8 6.9-2 1.3-2.8 2.3-2.8 4.3" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="23.6" cy="35.5" r="2.2" fill="currentColor"/></svg>',
    tax: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="14" width="30" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="5.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15 20v8M33 20v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>',
    jail: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="4" fill="currentColor" opacity=".13"/><path d="M15 12v24M21 12v24M27 12v24M33 12v24" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M11 12h26M11 36h26" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="none" stroke="#e1b44d" stroke-width="2.4"/></svg>',
    free: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="9" width="30" height="30" rx="8" fill="currentColor" opacity=".12"/><path d="M18 34V14h8.2c4.2 0 6.8 2.7 6.8 6.7s-2.7 6.8-7 6.8H22" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 34h20" stroke="#e1b44d" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>',
    gotojail: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 15h24v16H10z" fill="none" stroke="currentColor" stroke-width="2.7" rx="2"/><path d="M15 15v16M21 15v16M27 15v16M33 15v16" stroke="currentColor" stroke-width="1.8" opacity=".6"/><path d="M34 23h5" stroke="#e1b44d" stroke-width="3" stroke-linecap="round"/><path d="M38 18l5 5-5 5" fill="none" stroke="#e1b44d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rail: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 34h24l-3-18H15z" fill="currentColor" opacity=".22"/><path d="M16 15h16l3 18H13z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M19 19h10v7H19z" fill="currentColor" opacity=".55"/><circle cx="17.8" cy="36" r="2.7" fill="currentColor"/><circle cx="30.2" cy="36" r="2.7" fill="currentColor"/><path d="M10 39h28" stroke="#e1b44d" stroke-width="2" stroke-linecap="round"/></svg>',
    utility: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M27 7L14 27h9l-2 14 13-21h-9z" fill="#e1b44d" stroke="#a87a21" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    water: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7c6.5 8.3 11 14.4 11 21a11 11 0 0 1-22 0c0-6.6 4.5-12.7 11-21z" fill="#5db8d8" stroke="#2e7896" stroke-width="1.6"/><path d="M18 29a6 6 0 0 0 6 5.4" stroke="#e8f8ff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  };

  function tokenArt(index) {
    return TOKEN_ART[((index % TOKEN_ART.length) + TOKEN_ART.length) % TOKEN_ART.length];
  }

  function houseArt(kind) {
    if (kind === "hotel") {
      return '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M2 15V5.2L7 3v12z" fill="#b7423b"/><path d="M8 15V4l5-2.3V15z" fill="#d65a4f"/><path d="M13 15V5.2l4.6-2.2V15z" fill="#b7423b"/><path d="M4.2 7.2h1.5v1.5H4.2zm0 3h1.5v1.5H4.2zm9.5-3h1.4v1.5h-1.4zm0 3h1.4v1.5h-1.4z" fill="#f7d98a"/><path d="M1 15.2h18" stroke="#5a1e1a" stroke-width="1.2"/></svg>';
    }
    return '<svg viewBox="0 0 18 16" aria-hidden="true"><path d="M2.2 15V7.1L9 2.4l6.8 4.7V15z" fill="#3f9b6e"/><path d="M1 7.4L9 1.4l8 6" fill="none" stroke="#246b4b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15v-4.4h4V15" fill="#e8f2d8"/><path d="M3.8 9h1.6v1.6H3.8zm8.8 0h1.6v1.6h-1.6z" fill="#dff0d3"/><path d="M1.5 15.2h15" stroke="#1a4a34" stroke-width="1.1"/></svg>';
  }

  function dieMarkup(value) {
    if (FX && BG.dieFace) return BG.dieFace(value).outerHTML;
    return '<span class="die" aria-label="نرد ' + value + '">' + value + "</span>";
  }

  function groupColor(group) {
    return GROUP_COLORS[group] || "#7b8a86";
  }

  function groupLabel(group) {
    return GROUP_NAMES[group] || (group === "rail" ? "سكك حديد" : group === "utility" ? "مرافق" : "");
  }

  function moneySpan(amount, tone) {
    return '<span class="mono-money' + (tone ? " " + tone : "") + '">' + U.money(amount) + "</span>";
  }

  function netMode() {
    return !!(apiRef && apiRef.net && apiRef.net.enabled);
  }

  function isNetBoot() {
    return !!(apiRef && apiRef.net && apiRef.net.boot);
  }

  /** مقعد الجهاز المحلي: null في اللعب المحلي، أو رقم المقعد في الأونلاين. */
  function localSeatIndex() {
    if (!netMode() || !apiRef || !apiRef.net) return null;
    return Number.isInteger(apiRef.net.seat) ? apiRef.net.seat : -1;
  }

  /** هل يحق لهذا الجهاز التصرف باسم المقعد الحالي؟ */
  function controlsSeat(index) {
    if (!state || state.over) return false;
    const player = state.players[index];
    if (!player || player.bankrupt || AI.isCpu(player)) return false;
    const local = localSeatIndex();
    return local == null || local === index;
  }

  function canActNow() {
    return !!(state && !state.over && cur() && !cur().bankrupt && controlsSeat(state.current));
  }

  const game = {
    id: "monopoly",
    name: "مونوبولي",
    en: "MONOPOLY",
    icon: "🎩",
    accent: "#e1b45c",
    cardClass: "card-monopoly",
    tagline: "اشترِ الشوارع، ابنِ الفنادق، وكن آخر من يملك المال.",
    players: "2–4",
    duration: "60–120 دقيقة",
    complexity: "متوسطة",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayers: 2,

    options: {
      hint: "خيارات المباراة. تُطبَّق على اللعب المحلي والجماعي معًا.",
      defaults: DEFAULT_OPTIONS,
      fields: [
        {
          key: "startMoney",
          label: "رأس المال الابتدائي",
          type: "seg",
          choices: [
            { value: 1000, label: "1000$" },
            { value: 1500, label: "1500$" },
            { value: 2500, label: "2500$" },
          ],
          hint: "المبلغ الذي يبدأ به كل لاعب. اللعبة الأطول تمنح الجميع فرصة بناء مجموعات.",
        },
        {
          key: "jailFine",
          label: "غرامة الخروج من السجن",
          type: "seg",
          choices: [
            { value: 50, label: "50$" },
            { value: 100, label: "100$" },
          ],
          hint: "تُدفع عند اختيار الخروج من السجن أو بعد فشل المحاولة الثالثة.",
        },
        {
          key: "auction",
          label: "مزاد عند رفض الشراء (القاعدة الرسمية)",
          type: "toggle",
          hint: "إذا رفضت شراء العقار بالسعر الكامل يُطرح في مزاد بين جميع اللاعبين. فعّله دائمًا للعب بالقواعد الرسمية.",
        },
        {
          key: "freeParking",
          label: "جائزة الموقف المجاني",
          type: "toggle",
          hint: "عند تفعيله تتراكم الضرائب والغرامات في الموقف المجاني، ويأخذها أول لاعب يهبط عليه.",
        },
      ],
      summary(options) {
        return (
          U.money(Number(options.startMoney) || 1500) + " · غرامة " +
          U.money(Number(options.jailFine) === 100 ? 100 : 50) +
          (options.auction !== false ? " · مزاد" : "") +
          (options.freeParking ? " · موقف مجاني" : "")
        );
      },
    },

    rules: {
      goal: "إفلاس جميع الخصوم والبقاء آخر لاعب قادر على الدفع. الفائز هو آخر لاعب لم يُعلن إفلاسه، ويمكن في نهاية اللعبة ترتيب اللاعبين بحسب صافي الثروة.",
      facts: [["المال الابتدائي", "1500 دولار لكل لاعب"], ["راتب الانطلاق", "200 دولار"], ["أجرة الخروج من السجن", "50 دولارًا"]],
      components: [
        "رقعة من 40 مربعًا: شوارع، 4 سكك حديد، شركتا مرافق، ضرائب، فرص، صندوق المجتمع، سجن، وموقف مجاني.",
        "22 شارعًا قابلًا للشراء موزعة على 8 مجموعات لونية.",
        "نردان وقطع لاعبين ومال بنكي.",
        "بطاقات فرصة وبطاقات صندوق المجتمع وبطاقات الخروج من السجن.",
        "منازل وفنادق تُبنى على الشوارع بعد امتلاك المجموعة كاملة.",
      ],
      setup: [
        "يبدأ كل لاعب بـ1500 دولار، وتوضع جميع القطع على مربع الانطلاق.",
        "تُخلط بطاقات «فرصة» و«صندوق المجتمع» منفصلتين وتوضعان مقلوبتين.",
        "يُحدد اللاعب الأول بالاتفاق أو برمية نرد، ثم يتناوب اللاعبون باتجاه عقارب الساعة.",
      ],
      steps: [
        "<strong>ارمِ النرد:</strong> تحرّك بعدد النقاط. إذا مررت بمربع الانطلاق استلم 200 دولار. الرمية المزدوجة تمنحك رمية إضافية، لكن ثلاث رميات مزدوجة متتالية ترسلك إلى السجن.",
        "<strong>الشوارع:</strong> إذا وصلت إلى شارع غير مملوك يمكنك شراؤه بالسعر المكتوب. إذا كان مملوكًا لخصم فادفع الأجرة. الأجرة تتضاعف إذا كان المالك يملك المجموعة اللونية كاملة، وتزداد مع المنازل والفنادق.",
        "<strong>السكك والمرافق:</strong> أجرة السكة 25 دولارًا للسكة الأولى، 50 للسكة الثانية، 100 للثالثة، و200 للرابعة. أجرة المرافق = مجموع النرد × 4 إذا ملك لاعب مرفقًا واحدًا، و× 10 إذا ملك كليهما.",
        "<strong>البناء:</strong> بعد امتلاك مجموعة لونية كاملة يمكنك بناء منازل بالتساوي بين شوارع المجموعة، ثم فندق بدل أربعة منازل. البناء يتم من لوحة إدارة العقارات.",
        "<strong>فرصة وصندوق المجتمع:</strong> اسحب البطاقة العلوية ونفّذ تعليماتها فورًا. بطاقة الخروج من السجن تبقى معك حتى تستخدمها.",
        "<strong>السجن:</strong> عند دخولك السجن تتوقف عن الحركة. في دورك يمكنك دفع 50 دولارًا، أو استخدام بطاقة خروج، أو محاولة رمي المزدوج. بعد ثلاث محاولات فاشلة يجب أن تدفع الغرامة وتتحرك.",
        "<strong>الضرائب:</strong> ادفع المبلغ المكتوب على مربع الضريبة إلى البنك.",
        "<strong>الرهن والبيع:</strong> يمكنك رهن عقار مقابل نصف سعره، واستعادته مقابل 55% من السعر. لا يمكن رهن عقار عليه منازل.",
        "<strong>الإفلاس:</strong> إذا لم تستطع سداد ما عليك بعد بيع المنازل ورهن العقارات تُعلن مفلسًا وتنتقل أصولك إلى الدائن أو البنك.",
        "<strong>التبادل:</strong> يمكن للاعب الحالي تقديم عرض تبادل يشمل عقارًا أو أكثر ومالًا، ويوافق عليه اللاعب الآخر قبل التنفيذ.",
      ],
      winning: "يفوز آخر لاعب لم يُفلس. إذا انسحب لاعب أو أفلس، تُصفّى أصوله. في نهاية اللعبة يمكن الترتيب بصافي الثروة: المال + قيمة العقارات + قيمة المنازل.",
      notes: [
        "خيارات اللعبة: رأس مال 1000/1500/2500 دولار، غرامة سجن 50/100 دولار، مزاد عند رفض الشراء (مفعّل افتراضيًا)، وجائزة موقف مجاني.",
        "عند رفض الشراء بالسعر الكامل يُطرح العقار في مزاد بين جميع اللاعبين النشطين، كما في القواعد الرسمية. يمكن تعطيل المزاد لخيار منزلي.",
        "البنك يبدأ بـ32 منزلًا و12 فندقًا. لا يمكن البناء إذا نفدت القطع، وتعود المنازل والفنادق إلى البنك عند البيع أو الإفلاس.",
        "عند ترقية أربعة منازل إلى فندق تعود المنازل الأربعة إلى البنك. وعند بيع فندق يجب توفر أربعة منازل في البنك لاستبداله بها.",
        "تُنفّذ صفقات التبادل بين اللاعبين على نفس الجهاز بموافقة الطرف الآخر، ويقرر الكمبيوتر قبول العرض أو رفضه تلقائيًا.",
      ],
    },

    create(root, api) {
      rootRef = root;
      apiRef = api;
      aiRunner = AI.runner();
      tokenPositions = new Map();
      clearTokenTimers();
      cpuBuildCount = 0;
      const opts = Object.assign({}, DEFAULT_OPTIONS, (api && api.options) || {});
      const startMoney = [1000, 1500, 2500].indexOf(Number(opts.startMoney)) !== -1 ? Number(opts.startMoney) : 1500;
      const jailFine = Number(opts.jailFine) === 100 ? 100 : 50;
      const config = {
        startMoney,
        jailFine,
        auction: !!opts.auction,
        freeParking: !!opts.freeParking,
      };
      const players = api.players.map((p, i) => ({
        index: i,
        name: p.name,
        type: p.type === "cpu" ? "cpu" : "human",
        level: AI.level(p.level),
        isCpu: AI.isCpu(p),
        profile: p.profile,
        avatar: p.avatar,
        profileColor: p.profileColor || "",
        color: p.profileColor || PLAYER_COLORS[i % PLAYER_COLORS.length],
        money: startMoney,
        pos: 0,
        inJail: false,
        jailTurns: 0,
        jailCards: 0,
        bankrupt: false,
      }));

      state = {
        players,
        props: {},
        config,
        bank: { houses: BANK_HOUSES, hotels: BANK_HOTELS },
        pot: 0,
        current: 0,
        phase: "roll",
        dice: null,
        doubles: 0,
        extraRoll: false,
        pendingBuy: null,
        pendingRent: 0,
        lastRent: 0,
        lastCard: null,
        notice: "اضغط «ارمِ النرد» لبدء الدور.",
        over: false,
        winner: null,
        chanceDeck: U.shuffle(CHANCE.map((c) => c.id)),
        chestDeck: U.shuffle(CHEST.map((c) => c.id)),
        tradeOpen: false,
        showManage: false,
        round: 1,
        turn: 1,
        bankQueue: [],
      };

      if (new URLSearchParams(location.search).has("bgdebug")) {
        window.__bgDebug = {
          get state() { return state; },
          render, buyProperty, skipBuy, buildHouse, sellHouse, mortgage, unmortgage,
          moveTo, sendToJail, endTurn, charge, ownsGroup, groupSpaces,
          onRoll, payJail, useJailCard, resolveLanding, drawCard, runAuction,
        };
      }
      api.log("بدأت لعبة مونوبولي — كل لاعب يملك <strong>" + U.money(startMoney) + "</strong>.");
      render();
      return {
        netSnapshot() {
          return state ? BG.netCodec.encode(state) : null;
        },
        netLoad(data) {
          if (!data) return;
          // حوارات الشبكة (مزاد/تبادل) تبقى مفتوحة حتى يجيب اللاعب،
          // بينما تُغلق بقية النوافذ القديمة عند وصول لقطة جديدة.
          BG.closeDialogs({ keep: "[data-sync-keep]" });
          state = BG.netCodec.decode(data);
          state.tradeOpen = false;
          state.showManage = false;
          state.props = state.props || {};
          state.config = Object.assign({}, DEFAULT_OPTIONS, state.config || {});
          state.pot = Number(state.pot) || 0;
          state.pendingBuy = Number.isInteger(state.pendingBuy) ? state.pendingBuy : null;
          state.bankQueue = Array.isArray(state.bankQueue) ? state.bankQueue : [];
          state.round = Math.max(1, Number(state.round) || 1);
          state.turn = Math.max(1, Number(state.turn) || 1);
          state.lastRent = Number(state.lastRent) || 0;
          if (!Array.isArray(state.chanceDeck) || !state.chanceDeck.length) {
            state.chanceDeck = U.shuffle(CHANCE.map((c) => c.id));
          }
          if (!Array.isArray(state.chestDeck) || !state.chestDeck.length) {
            state.chestDeck = U.shuffle(CHEST.map((c) => c.id));
          }
          if (state.phase === "auction") {
            // المزاد حالة واجهة مؤقتة؛ لا نترك الواجهة عالقة إذا وصل حفظ قديم.
            state.phase = state.pendingBuy == null ? "end" : "buy";
          }
          rebuildBankStock();
          state.players.forEach((player) => {
            player.bankrupt = !!player.bankrupt;
            player.inJail = !!player.inJail;
            player.jailTurns = Math.max(0, Number(player.jailTurns) || 0);
            player.jailCards = Math.max(0, Number(player.jailCards) || 0);
            player.money = Math.max(0, Number(player.money) || 0);
          });
          tokenPositions = new Map();
          clearTokenTimers();
          cpuBuildCount = 0;
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
          render();
        },
        netAuctionPrompt(payload) {
          const info = payload || {};
          const space = SPACES[info.spaceIdx];
          if (!space) return Promise.resolve(0);
          const bidder = {
            index: Number.isInteger(info.seat) ? info.seat : -1,
            name: info.name || "لاعب",
            money: Math.max(0, Number(info.cash) || 0),
          };
          return askAuctionBid(bidder, space, Math.max(0, Number(info.highest) || 0));
        },
        destroy() {
          if (aiRunner) aiRunner.clear();
          aiRunner = null;
          clearTokenTimers();
          tokenPositions = new Map();
        },
      };
    },
  };

  /* ------------------------------ مساعدات الحالة ------------------------------ */

  function cur() {
    return state.players[state.current];
  }

  function activePlayers() {
    return state.players.filter((p) => !p.bankrupt);
  }

  function ownerOf(idx) {
    const rec = state.props[idx];
    return rec && rec.owner != null ? state.players[rec.owner] : null;
  }

  function groupSpaces(group) {
    const list = [];
    SPACES.forEach((s, idx) => {
      if (s.group === group) list.push({ space: s, idx });
    });
    return list;
  }

  function ownsGroup(player, group) {
    const list = groupSpaces(group);
    return list.length > 0 && list.every(({ idx }) => state.props[idx] && state.props[idx].owner === player.index);
  }

  function countType(player, type) {
    return Object.entries(state.props).filter(([idx, rec]) => {
      const s = SPACES[Number(idx)];
      return s.type === type && rec.owner === player.index;
    }).length;
  }

  function netWorth(p) {
    let total = p.money;
    for (const [idx, rec] of Object.entries(state.props)) {
      if (!rec || rec.owner !== p.index) continue;
      const sp = SPACES[Number(idx)];
      if (!sp || sp.price == null) continue;
      total += rec.mortgaged ? Math.floor(sp.price / 2) : sp.price;
      if (rec.houses > 0) total += Math.min(5, rec.houses) * (sp.house || 0);
    }
    return total;
  }

  function ownedList(p) {
    return Object.entries(state.props)
      .filter(([, rec]) => rec.owner === p.index)
      .map(([idx, rec]) => ({ idx: Number(idx), rec, space: SPACES[Number(idx)] }))
      .sort((a, b) => a.idx - b.idx);
  }

  /** يعيد حساب مخزون البنك من القطع المبنية على الرقعة (للتحميل والحفظ). */
  function rebuildBankStock() {
    let houses = 0;
    let hotels = 0;
    Object.keys(state.props || {}).forEach((key) => {
      const rec = state.props[key];
      if (!rec || !rec.houses) return;
      if (rec.houses >= 5) hotels += 1;
      else houses += rec.houses;
    });
    state.bank = {
      houses: Math.max(0, BANK_HOUSES - houses),
      hotels: Math.max(0, BANK_HOTELS - hotels),
    };
  }

  /** يبيع مستوى بناء واحدًا ويعيد القطعة إلى البنك. يعيد false إذا نفدت القطع. */
  function sellBuilding(rec) {
    if (!rec || !state.bank) return false;
    if (rec.houses === 5) {
      if (state.bank.houses < 4) return false;
      state.bank.houses -= 4;
      state.bank.hotels += 1;
      rec.houses = 4;
      return true;
    }
    if (rec.houses > 0) {
      rec.houses -= 1;
      state.bank.houses += 1;
      return true;
    }
    return false;
  }

  /* ------------------------------ المال والإفلاس ------------------------------ */

  function addMoney(p, amount) {
    p.money += amount;
  }

  /** بيع البناء بالتساوي ثم رهن العقارات الفارغة. لا يبيع عقارًا نفسه أبدًا. */
  function liquidate(p, needed) {
    if (p.money >= needed) return true;
    if (!state.bank) rebuildBankStock();

    // 1) بيع المنازل والفنادق بالتساوي، من الأعلى بناءً أولًا.
    let guard = 0;
    while (p.money < needed && guard++ < 80) {
      const candidates = ownedList(p)
        .filter((item) => item.rec.houses > 0)
        .sort((a, b) => b.rec.houses - a.rec.houses || b.space.price - a.space.price);
      let sold = false;
      for (const item of candidates) {
        if (item.space.group) {
          const group = groupSpaces(item.space.group).map((g) => state.props[g.idx]).filter(Boolean);
          const max = Math.max(...group.map((g) => g.houses || 0));
          if (item.rec.houses < max) continue;
        }
        if (!sellBuilding(item.rec)) continue;
        p.money += Math.floor((item.space.house || 0) / 2);
        sold = true;
        apiRef.log("بيع <strong>" + U.escape(p.name) + "</strong> بناءً في " + U.escape(item.space.name) + " لتغطية الدين.", "warn");
        break;
      }
      if (!sold) break;
    }

    // 2) رهن العقارات التي لا تحمل بناءً. لا يُرهن عقار داخل مجموعة عليها بناء.
    if (p.money < needed) {
      const candidates = ownedList(p)
        .filter((item) => !item.rec.mortgaged && item.rec.houses === 0)
        .sort((a, b) => a.space.price - b.space.price);
      for (const item of candidates) {
        if (p.money >= needed) break;
        if (item.space.group) {
          const group = groupSpaces(item.space.group).map((g) => state.props[g.idx]).filter(Boolean);
          if (group.some((g) => (g.houses || 0) > 0)) continue;
        }
        item.rec.mortgaged = true;
        p.money += Math.floor(item.space.price / 2);
        apiRef.log("رهن <strong>" + U.escape(p.name) + "</strong> " + U.escape(item.space.name) + " مقابل " + U.money(Math.floor(item.space.price / 2)) + ".", "warn");
      }
    }
    return p.money >= needed;
  }

  function charge(p, amount, receiver, reason) {
    if (!p || amount <= 0) return true;
    const due = Math.max(0, Math.floor(Number(amount) || 0));
    if (p.money < due) liquidate(p, due);
    if (p.money < due) {
      state.pendingRent = due;
      bankrupt(p, receiver || null, reason);
      return false;
    }
    p.money -= due;
    if (p.money < 0) p.money = 0;
    if (receiver && receiver.index !== undefined && !receiver.bankrupt) {
      receiver.money += due;
    } else if (state.config && state.config.freeParking) {
      state.pot = (state.pot || 0) + due;
    }
    if (FX) FX.sound("coin");
    return true;
  }

  function bankrupt(p, creditor, reason) {
    if (!p || p.bankrupt) return;
    p.bankrupt = true;
    p.inJail = false;
    p.jailTurns = 0;
    state.extraRoll = false;
    const toPlayer = !!(creditor && !creditor.bankrupt && creditor.index !== p.index);
    let cash = p.money;
    p.money = 0;

    apiRef.log("<strong>" + U.escape(p.name) + "</strong> أعلن الإفلاس" + (reason ? " بسبب " + U.escape(reason) : "") + "!", "warn");
    if (toPlayer) {
      creditor.money += cash;
      apiRef.log("انتقل ما بحوزته من نقد <strong>" + U.money(cash) + "</strong> إلى <strong>" + U.escape(creditor.name) + "</strong>.");
    } else if (cash > 0 && state.config && state.config.freeParking) {
      state.pot = (state.pot || 0) + cash;
    }

    // بطاقات الخروج من السجن تنتقل إلى الدائن، أو تعود إلى البنك (الفرصة).
    if (p.jailCards > 0) {
      if (toPlayer) {
        creditor.jailCards = Math.max(0, Number(creditor.jailCards) || 0) + p.jailCards;
        apiRef.log("انتقلت بطاقة الخروج من السجن إلى <strong>" + U.escape(creditor.name) + "</strong>.");
      } else {
        if (!Array.isArray(state.chanceDeck)) state.chanceDeck = U.shuffle(CHANCE.map((c) => c.id));
        for (let i = 0; i < p.jailCards; i++) state.chanceDeck.push("jailFree");
      }
      p.jailCards = 0;
    }

    // تُعاد كل المباني إلى البنك قبل انتقال الملكية، ويُدفع ثمنها نقدًا للدائن.
    for (const item of ownedList(p)) {
      if (!item.rec.houses) continue;
      const refund = item.rec.houses === 5
        ? Math.floor((item.space.house || 0) / 2)
        : item.rec.houses * Math.floor((item.space.house || 0) / 2);
      if (state.bank) {
        if (item.rec.houses === 5) state.bank.hotels += 1;
        else state.bank.houses += item.rec.houses;
      }
      item.rec.houses = 0;
      if (toPlayer && refund > 0) {
        creditor.money += refund;
        apiRef.log("استلم <strong>" + U.escape(creditor.name) + "</strong> " + U.money(refund) + " قيمة مباني " + U.escape(item.space.name) + ".");
      }
    }

    for (const item of ownedList(p)) {
      if (toPlayer) {
        item.rec.owner = creditor.index;
        // رسم انتقال الرهن: 10% من قيمة الرهن، يُدفع للبنك إن أمكن.
        if (item.rec.mortgaged) {
          const fee = Math.ceil(Math.floor((item.space.price || 0) / 2) * 0.1);
          if (creditor.money >= fee) {
            creditor.money -= fee;
            apiRef.log("دفع <strong>" + U.escape(creditor.name) + "</strong> رسم رهن " + U.money(fee) + " للبنك.");
          } else {
            item.rec.owner = null;
            item.rec.mortgaged = false;
            if (!state.bankQueue) state.bankQueue = [];
            state.bankQueue.push(item.idx);
          }
        }
        apiRef.log("انتقل " + U.escape(item.space.name) + " إلى " + U.escape(creditor.name) + ".");
      } else {
        item.rec.owner = null;
        item.rec.mortgaged = false;
        if (!state.bankQueue) state.bankQueue = [];
        state.bankQueue.push(item.idx);
      }
    }

    checkGameOver();
    if (!state.over && p.index === state.current) {
      state.phase = "end";
      state.notice = "أفلس " + p.name + " — يُنهى دوره تلقائيًا.";
      setTimeout(() => {
        if (state && !state.over && state.current === p.index) endTurn();
      }, 850);
    }
  }

  function checkGameOver() {
    if (!state || state.over) return;
    const alive = activePlayers();
    if (alive.length > 1) return;
    state.over = true;
    state.phase = "over";
    const winner = alive[0] || null;
    state.winner = winner ? winner.index : null;
    const standings = state.players
      .slice()
      .sort((a, b) => (a.bankrupt === b.bankrupt ? netWorth(b) - netWorth(a) : a.bankrupt ? 1 : -1))
      .map((p) => ({ name: p.name, value: U.money(netWorth(p)) + (p.bankrupt ? " — مفلس" : "") }));
    apiRef.log("انتهت اللعبة" + (winner ? " بفوز <strong>" + U.escape(winner.name) + "</strong>!" : "."), "good");
    render();
    if (FX) FX.win();
    apiRef.gameOver({
      icon: "🎩",
      title: "انتهت مونوبولي",
      text: winner ? "آخر لاعب صامد في المدينة." : "انتهت اللعبة.",
      winner: winner ? winner.name : "",
      standings,
    });
  }

  /* ------------------------------ الحركة ------------------------------ */

  function passGo(p, amount) {
    const salary = amount == null ? GO_SALARY : amount;
    addMoney(p, salary);
    apiRef.log("استلم <strong>" + U.escape(p.name) + "</strong> راتب الانطلاق " + U.money(salary) + ".", "good");
    if (FX) FX.floatText(rootRef && rootRef.querySelector(".mrow.active"), "+" + U.money(salary), "good");
  }

  function moveTo(p, idx, collectGo) {
    const old = p.pos;
    let next = ((idx % 40) + 40) % 40;
    if (collectGo !== false && next < old) passGo(p);
    p.pos = next;
    return resolveLanding(p);
  }

  function moveBy(p, steps) {
    return moveTo(p, p.pos + steps, true);
  }

  function sendToJail(p, reason) {
    p.pos = 10;
    p.inJail = true;
    p.jailTurns = 0;
    state.extraRoll = false;
    state.phase = "end";
    state.notice = "أنت في السجن. في دورك القادم يمكنك الدفع أو استخدام بطاقة أو رمي المزدوج.";
    apiRef.log("دخل <strong>" + U.escape(p.name) + "</strong> السجن" + (reason ? " — " + reason : "") + ".", "warn");
    if (FX) {
      FX.sound("error");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mono-board")), 55);
    }
  }

  function rentFor(space, rec, owner, diceSum) {
    if (!space || !rec || rec.owner == null || rec.mortgaged) return 0;
    if (space.type === "prop") {
      if (rec.houses > 0) return space.rent[Math.min(5, rec.houses)] || 0;
      return ownsGroup(owner, space.group) ? space.rent[0] * 2 : space.rent[0];
    }
    if (space.type === "rail") {
      const n = countType(owner, "rail");
      return [0, 25, 50, 100, 200][n] || 200;
    }
    if (space.type === "utility") {
      const n = countType(owner, "utility");
      return (Number(diceSum) || 7) * (n >= 2 ? 10 : 4);
    }
    return 0;
  }

  function offerPurchase(p, idx, note) {
    const space = SPACES[idx];
    state.pendingBuy = idx;
    state.phase = "buy";
    state.notice = note || ("يمكنك شراء " + space.name + " مقابل " + U.money(space.price) + ".");
    return "wait";
  }

  function resolveLanding(p) {
    if (!p || state.over) return "done";
    const idx = p.pos;
    const space = SPACES[idx];
    if (!space) return "done";
    state.pendingRent = 0;

    if (space.type === "go") {
      // الراتب يُمنح مرة واحدة في moveTo عند المرور أو الوصول.
      state.notice = "الانطلاق — استلمت راتبك.";
      return "done";
    }

    if (space.type === "free") {
      const pot = Number(state.pot) || 0;
      if (state.config && state.config.freeParking && pot > 0) {
        addMoney(p, pot);
        state.pot = 0;
        state.notice = "الموقف المجاني — استلمت الجائزة المتراكمة " + U.money(pot) + ".";
        apiRef.log("استلم <strong>" + U.escape(p.name) + "</strong> جائزة الموقف المجاني " + U.money(pot) + ".", "good");
        if (FX) FX.sound("coin");
      } else {
        state.notice = "الموقف المجاني — استراحة بلا رسوم.";
      }
      return "done";
    }

    if (space.type === "jail") {
      state.notice = "زيارة فقط للسجن — لا عقوبة.";
      return "done";
    }

    if (space.type === "gotojail") {
      sendToJail(p, "مربع اذهب إلى السجن");
      return "done";
    }

    if (space.type === "tax") {
      state.notice = "ضريبة " + U.money(space.amount) + ".";
      apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> ضريبة " + U.money(space.amount) + ".", "warn");
      charge(p, space.amount, null, "ضريبة");
      return "done";
    }

    if (space.type === "chance" || space.type === "chest") {
      return drawCard(p, space.type === "chance" ? "chance" : "chest");
    }

    if (space.type === "prop" || space.type === "rail" || space.type === "utility") {
      const rec = state.props[idx];
      if (!rec || rec.owner == null) return offerPurchase(p, idx);
      if (rec.owner === p.index) {
        state.notice = "وصلت إلى " + space.name + " — عقارك.";
        return "done";
      }
      if (rec.mortgaged) {
        state.notice = "وصلت إلى " + space.name + " المرهون — لا أجرة.";
        return "done";
      }
      const owner = state.players[rec.owner];
      const diceSum = state.dice ? state.dice[0] + state.dice[1] : 7;
      const rent = rentFor(space, rec, owner, diceSum);
      state.lastRent = rent;
      state.notice = "أجرة " + space.name + " لصالح " + owner.name + ": " + U.money(rent) + ".";
      apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> أجرة " + U.money(rent) + " إلى <strong>" + U.escape(owner.name) + "</strong>.", "warn");
      charge(p, rent, owner, "أجرة " + space.name);
      return "done";
    }

    return "done";
  }

  function drawCard(p, deckName) {
    const isChance = deckName === "chance";
    if (!Array.isArray(state.chanceDeck)) state.chanceDeck = U.shuffle(CHANCE.map((c) => c.id));
    if (!Array.isArray(state.chestDeck)) state.chestDeck = U.shuffle(CHEST.map((c) => c.id));
    const deck = isChance ? state.chanceDeck : state.chestDeck;
    if (!deck.length) deck.push(...U.shuffle((isChance ? CHANCE : CHEST).map((c) => c.id)));
    const id = deck.shift();
    if (id !== "jailFree") deck.push(id);

    const card = (isChance ? CHANCE : CHEST).find((c) => c.id === id) || (isChance ? CHANCE[0] : CHEST[0]);
    state.lastCard = { deck: isChance ? "فرصة" : "صندوق المجتمع", title: card.title, text: card.text, id: card.id };
    state.notice = card.title + " — " + card.text;
    apiRef.log("سحب <strong>" + U.escape(p.name) + "</strong> بطاقة " + state.lastCard.deck + ": <strong>" + U.escape(card.title) + "</strong>.", "accent");
    if (FX) {
      FX.sound("card");
      FX.after(() => FX.deal(rootRef && rootRef.querySelector(".mcard:not(.empty)")), 55);
    }

    switch (card.id) {
      case "go":
        return moveTo(p, 0, true);
      case "illinois":
        return moveTo(p, 24, true);
      case "stcharles":
        return moveTo(p, 11, true);
      case "nearestRail": {
        const rails = [5, 15, 25, 35];
        let target = rails.find((r) => r > p.pos);
        if (target == null) target = rails[0];
        if (target < p.pos) passGo(p);
        p.pos = target;
        const rec = state.props[target];
        if (!rec || rec.owner == null) {
          state.notice = "أقرب سكة حديد — " + SPACES[target].name + " متاحة للشراء.";
          return offerPurchase(p, target, "أقرب سكة حديد: يمكنك شراء " + SPACES[target].name + " مقابل " + U.money(SPACES[target].price) + ".");
        }
        if (rec.owner === p.index) {
          state.notice = "وصلت إلى سكة حديدك " + SPACES[target].name + ".";
          return "done";
        }
        if (rec.mortgaged) {
          state.notice = "أقرب سكة حديد مرهونة — لا أجرة.";
          return "done";
        }
        const railOwner = state.players[rec.owner];
        const railRent = rentFor(SPACES[target], rec, railOwner, 0) * 2;
        state.notice = "بطاقة الفرصة: أجرة مضاعفة " + U.money(railRent) + " إلى " + railOwner.name + ".";
        apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> أجرة مضاعفة " + U.money(railRent) + " إلى <strong>" + U.escape(railOwner.name) + "</strong>.", "warn");
        charge(p, railRent, railOwner, "أجرة سكة مضاعفة");
        return "done";
      }
      case "nearestUtility": {
        const utilities = [12, 28];
        let target = utilities.find((u) => u > p.pos);
        if (target == null) target = utilities[0];
        if (target < p.pos) passGo(p);
        p.pos = target;
        const rec = state.props[target];
        if (!rec || rec.owner == null) {
          state.notice = "أقرب مرفق — " + SPACES[target].name + " متاح للشراء.";
          return offerPurchase(p, target, "أقرب مرفق: يمكنك شراء " + SPACES[target].name + " مقابل " + U.money(SPACES[target].price) + ".");
        }
        if (rec.owner === p.index) {
          state.notice = "وصلت إلى مرفقك " + SPACES[target].name + ".";
          return "done";
        }
        state.dice = [U.roll(6), U.roll(6)];
        const total = state.dice[0] + state.dice[1];
        if (rec.mortgaged) {
          state.notice = "أقرب مرفق مرهون — لا أجرة.";
          return "done";
        }
        const utilityOwner = state.players[rec.owner];
        const utilityRent = total * 10;
        state.notice = "بطاقة الفرصة: رميت " + total + " — أجرة المرفق " + U.money(utilityRent) + ".";
        apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> أجرة مرفق " + U.money(utilityRent) + " إلى <strong>" + U.escape(utilityOwner.name) + "</strong>.", "warn");
        charge(p, utilityRent, utilityOwner, "أجرة مرفق");
        return "done";
      }
      case "boardwalk":
        return moveTo(p, 39, true);
      case "reading":
        return moveTo(p, 5, true);
      case "dividend":
        addMoney(p, 50);
        state.notice = "توزيعات أرباح: استلمت " + U.money(50) + ".";
        return "done";
      case "jailFree":
        p.jailCards++;
        state.notice = "احتفظت ببطاقة الخروج من السجن.";
        return "done";
      case "back3":
        return moveTo(p, p.pos - 3, false);
      case "goJail":
        sendToJail(p, "بطاقة فرصة");
        return "done";
      case "repairs": {
        let houses = 0;
        let hotels = 0;
        for (const item of ownedList(p)) {
          if (item.rec.houses === 5) hotels++;
          else houses += item.rec.houses || 0;
        }
        const cost = houses * (isChance ? 25 : 40) + hotels * (isChance ? 100 : 115);
        if (cost > 0) {
          state.notice = "إصلاحات: " + houses + " منزلًا و" + hotels + " فندقًا — " + U.money(cost) + ".";
          charge(p, cost, null, "إصلاحات");
        } else {
          state.notice = "لا تملك مباني — لا إصلاحات.";
        }
        return "done";
      }
      case "poorTax":
      case "speeding":
        state.notice = "غرامة " + U.money(15) + ".";
        charge(p, 15, null, "غرامة");
        return "done";
      case "chairman":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) {
            charge(p, 50, other, "رئاسة مجلس الإدارة");
            if (p.bankrupt) break;
          }
        }
        return "done";
      case "loan":
        addMoney(p, 150);
        state.notice = "قرض البناء: استلمت " + U.money(150) + ".";
        return "done";
      case "bankError":
        addMoney(p, 200);
        state.notice = "خطأ مصرفي لصالحك: " + U.money(200) + ".";
        return "done";
      case "doctor":
        state.notice = "أتعاب الطبيب: " + U.money(50) + ".";
        charge(p, 50, null, "أتعاب الطبيب");
        return "done";
      case "stock":
        addMoney(p, 50);
        state.notice = "بيع أسهم: " + U.money(50) + ".";
        return "done";
      case "holiday":
        addMoney(p, 100);
        state.notice = "صندوق العطلة: " + U.money(100) + ".";
        return "done";
      case "refund":
        addMoney(p, 20);
        state.notice = "استرداد ضريبي: " + U.money(20) + ".";
        return "done";
      case "birthday":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) charge(other, 10, p, "عيد ميلاد");
        }
        return "done";
      case "insurance":
        addMoney(p, 100);
        state.notice = "تأمين على الحياة: " + U.money(100) + ".";
        return "done";
      case "hospital":
        state.notice = "مصاريف المستشفى: " + U.money(100) + ".";
        charge(p, 100, null, "مصاريف المستشفى");
        return "done";
      case "school":
        state.notice = "رسوم مدرسية: " + U.money(50) + ".";
        charge(p, 50, null, "رسوم مدرسية");
        return "done";
      case "consult":
        addMoney(p, 25);
        state.notice = "أتعاب استشارية: " + U.money(25) + ".";
        return "done";
      case "beauty":
        addMoney(p, 10);
        state.notice = "مسابقة جمال: " + U.money(10) + ".";
        return "done";
      case "secondPrize":
        addMoney(p, 10);
        state.notice = "الجائزة الثانية: " + U.money(10) + ".";
        return "done";
      case "opera":
        for (const other of state.players) {
          if (other.index !== p.index && !other.bankrupt) {
            charge(other, 50, p, "حفل الأوبرا");
            if (state.over) break;
          }
        }
        return "done";
      case "inherit":
        addMoney(p, 100);
        state.notice = "ميراث: " + U.money(100) + ".";
        return "done";
      default:
        return "done";
    }
  }

  function finishStep() {
    if (state.over || !state || state.phase === "buy" || state.phase === "auction") return;
    const p = cur();
    if (p && p.bankrupt) { endTurn(); return; }
    if (state.extraRoll) {
      state.phase = "roll";
      state.notice = "رمية مزدوجة — لك رمية إضافية!";
    } else {
      state.phase = "end";
    }
    render();
  }

  function onRoll() {
    if (state.over || state.phase !== "roll") return;
    const p = cur();
    if (!p || p.bankrupt) { endTurn(); return; }

    if (p.inJail) {
      return rollInJail(p);
    }

    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    if (FX) {
      FX.sound("dice");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mdice")), 35);
    }
    const total = d1 + d2;
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> رمى النرد: " + d1 + " + " + d2 + " = <strong>" + total + "</strong>.");

    if (d1 === d2) {
      state.doubles++;
      state.extraRoll = true;
      if (state.doubles >= 3) {
        state.extraRoll = false;
        sendToJail(p, "ثلاث رميات مزدوجة متتالية");
        state.phase = "end";
        render();
        return;
      }
    } else {
      state.extraRoll = false;
      state.doubles = 0;
    }

    state.phase = "moving";
    const result = moveBy(p, total);
    if (state.over) return;
    if (result === "wait") {
      // انتظار قرار الشراء
      render();
    } else {
      if (state.phase !== "end" && state.phase !== "roll") {
        finishStep();
      } else {
        render();
      }
    }
  }

  function jailFine() {
    return state && state.config ? Number(state.config.jailFine) || 50 : 50;
  }

  function rollInJail(p) {
    const d1 = U.roll(6);
    const d2 = U.roll(6);
    state.dice = [d1, d2];
    state.extraRoll = false;
    if (FX) {
      FX.sound("dice");
      FX.after(() => FX.shake(rootRef && rootRef.querySelector(".mdice")), 35);
    }
    apiRef.log("<strong>" + U.escape(p.name) + "</strong> حاول الخروج من السجن: " + d1 + " + " + d2 + ".");

    if (d1 === d2) {
      p.inJail = false;
      p.jailTurns = 0;
      state.notice = "رمية مزدوجة! خرجت من السجن.";
      apiRef.log("خرج <strong>" + U.escape(p.name) + "</strong> من السجن برمية مزدوجة.", "good");
      const result = moveBy(p, d1 + d2);
      if (result !== "wait") finishStep();
      else render();
      return;
    }

    p.jailTurns++;
    if (p.jailTurns >= 3) {
      state.notice = "المحاولة الثالثة فشلت — ادفع الغرامة وتحرك.";
      apiRef.log("فشلت المحاولة الثالثة؛ دفع <strong>" + U.escape(p.name) + "</strong> غرامة السجن.", "warn");
      if (!charge(p, jailFine(), null)) return;
      p.inJail = false;
      p.jailTurns = 0;
      const result = moveBy(p, d1 + d2);
      if (result !== "wait") finishStep();
      else render();
      return;
    }

    state.phase = "end";
    state.notice = "لم ترمِ مزدوجًا. تبقى في السجن — المحاولة " + p.jailTurns + " من 3.";
    render();
  }

  function payJail() {
    const p = cur();
    if (!p.inJail || state.phase === "over") return;
    if (!charge(p, jailFine(), null)) return;
    p.inJail = false;
    p.jailTurns = 0;
    state.phase = "roll";
    state.notice = "دفعت " + U.money(jailFine()) + " وخرجت من السجن. يمكنك رمي النرد.";
    apiRef.log("دفع <strong>" + U.escape(p.name) + "</strong> " + U.money(jailFine()) + " للخروج من السجن.");
    if (FX) FX.sound("coin");
    render();
  }

  function useJailCard() {
    const p = cur();
    if (!p.inJail || p.jailCards <= 0) return;
    p.jailCards--;
    p.inJail = false;
    p.jailTurns = 0;
    state.phase = "roll";
    state.notice = "استخدمت بطاقة الخروج من السجن — ارمِ النرد.";
    apiRef.log("استخدم <strong>" + U.escape(p.name) + "</strong> بطاقة الخروج من السجن.", "good");
    if (!Array.isArray(state.chanceDeck)) state.chanceDeck = U.shuffle(CHANCE.map((c) => c.id));
    state.chanceDeck.push("jailFree");
    if (FX) FX.sound("card");
    render();
  }

  async function endTurn() {
    if (!state || state.over) return;
    state.extraRoll = false;
    state.doubles = 0;
    state.pendingBuy = null;
    state.pendingRent = 0;
    const alive = activePlayers();
    if (!alive.length) { checkGameOver(); return; }
    if (alive.length === 1) { checkGameOver(); return; }
    if (Array.isArray(state.bankQueue) && state.bankQueue.length) {
      await settleBankQueue();
      if (!state || state.over) return;
    }
    let next = state.current;
    for (let i = 0; i < state.players.length; i++) {
      next = (next + 1) % state.players.length;
      if (!state.players[next].bankrupt) break;
    }
    if (next <= state.current) state.round++;
    state.current = next;
    state.turn = (Number(state.turn) || 1) + 1;
    cpuBuildCount = 0;
    state.phase = "roll";
    state.dice = null;
    state.notice = "دور " + state.players[next].name + " — ارمِ النرد.";
    state.lastCard = null;
    if (FX) FX.sound("turn");
    render();
  }

  /* ------------------------------ الشراء والبناء ------------------------------ */

  function buyProperty() {
    const idx = state.pendingBuy;
    if (idx == null || state.phase !== "buy") return;
    const p = cur();
    const space = SPACES[idx];
    if (p.money < space.price) {
      BG.toast("لا تملك مالًا كافيًا لشراء " + space.name, "warn");
      return;
    }
    p.money -= space.price;
    state.props[idx] = { owner: p.index, houses: 0, mortgaged: false };
    state.pendingBuy = null;
    state.phase = "end";
    state.notice = "اشتريت " + space.name + ".";
    apiRef.log("اشترى <strong>" + U.escape(p.name) + "</strong> " + U.escape(space.name) + " مقابل " + U.money(space.price) + ".", "good");
    finishStep();
    if (FX) {
      FX.sound("coin");
      FX.after(() => {
        const row = rootRef && rootRef.querySelector(".mrow.active");
        if (row) { FX.pop(row); FX.floatText(row, "−" + U.money(space.price), "warn"); }
      }, 55);
    }
  }

  function skipBuy() {
    if (state.phase !== "buy") return;
    const idx = state.pendingBuy;
    const space = SPACES[idx];
    state.pendingBuy = null;
    state.notice = "تركت " + space.name + " للبنك.";
    apiRef.log("لم يشترِ <strong>" + U.escape(cur().name) + "</strong> " + U.escape(space.name) + ".");
    if (state.config && state.config.auction) {
      state.phase = "auction";
      render();
      runAuction(idx).catch((err) => {
        console.warn(err);
        if (state && state.phase === "auction") { state.phase = "end"; finishStep(); }
      });
      return;
    }
    state.phase = "end";
    finishStep();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function auctionLimit(p, space) {
    const level = AI.level(p.level);
    const factor = level === "easy" ? 0.38 : level === "hard" ? 1.02 : 0.76;
    let limit = Math.floor((space.price || 0) * factor);
    if (space.type === "prop" && space.group) {
      const total = groupSpaces(space.group).length;
      const owned = groupSpaces(space.group).filter(({ idx }) => state.props[idx] && state.props[idx].owner === p.index).length;
      if (owned === total - 1) limit += Math.floor(space.price * 0.62);
      else if (owned >= 2) limit += Math.floor(space.price * 0.22);
      const opponents = activePlayers().filter((x) => x.index !== p.index);
      const block = opponents.some((x) => groupSpaces(space.group).filter(({ idx }) => state.props[idx] && state.props[idx].owner === x.index).length === total - 1);
      if (block) limit += Math.floor(space.price * 0.3);
    }
    if (space.type === "rail") limit += countType(p, "rail") * 55;
    if (space.type === "utility") limit += countType(p, "utility") * 35;
    const reserve = cpuReserve(level);
    limit = Math.min(limit, Math.max(0, p.money - Math.min(reserve, Math.floor(p.money * 0.25))));
    if (level === "easy") limit = Math.round(limit * (0.72 + Math.random() * 0.3));
    return Math.max(0, Math.min(p.money, limit));
  }

  function askAuctionBid(p, space, highest) {
    const min = highest + 10;
    if (min > p.money) return Promise.resolve(0);
    const body = BG.el("div", { class: "mono-auction" });
    body.innerHTML =
      '<div class="mono-auction-head"><span class="mono-kicker">' + (state.bankQueue && state.bankQueue.length ? "مزاد بنكي" : "مزاد علني") + "</span>" +
      "<h3>" + U.escape(space.name) + "</h3><p>السعر الأصلي " + U.money(space.price || 0) + "</p></div>" +
      '<div class="mono-auction-stats"><div><span>أعلى مزايدة</span><strong>' + (highest ? U.money(highest) : "—") + "</strong></div>" +
      "<div><span>أقل مزايدة</span><strong>" + U.money(min) + "</strong></div>" +
      "<div><span>رصيدك</span><strong>" + U.money(p.money) + "</strong></div></div>" +
      '<label class="mono-field"><span>مزايدتك يا ' + U.escape(p.name) + "</span>" +
      '<input name="bid" type="number" min="' + min + '" max="' + p.money + '" step="10" value="' + min + '" /></label>' +
      '<div class="mono-quick-bids">' +
      [min, min + 20, min + 50, Math.min(p.money, min + 100)].filter((v, i, a) => a.indexOf(v) === i && v <= p.money)
        .map((v) => '<button type="button" class="mini-chip" data-bid="' + v + '">' + U.money(v) + "</button>").join("") +
      "</div>" +
      '<p class="mono-fine">أعلى مزايدة تفوز وتدفع للبنك. الانسحاب نهائي في هذا المزاد.</p>';
    const input = body.querySelector('[name="bid"]');
    body.querySelectorAll("[data-bid]").forEach((button) => {
      button.addEventListener("click", () => { input.value = button.dataset.bid; });
    });
    const dlg = BG.openDialog({
      title: "مزاد على " + space.name,
      body,
      actions: [
        { label: "انسحاب", value: "pass" },
        {
          label: "زايد الآن",
          primary: true,
          onClick: ({ close }) => {
            const value = Math.floor(Number(input.value) || 0);
            if (value < min) { BG.toast("أقل مزايدة مقبولة هي " + U.money(min) + ".", "warn"); return; }
            if (value > p.money) { BG.toast("لا تملك هذا المبلغ.", "warn"); return; }
            close("bid:" + value);
          },
        },
      ],
    });
    dlg.dialog.setAttribute("data-sync-keep", "1");
    return dlg.promise.then((value) => {
      if (typeof value !== "string" || value.indexOf("bid:") !== 0) return 0;
      return Math.max(min, Math.min(p.money, Math.floor(Number(value.slice(4)) || 0)));
    });
  }

  async function runAuction(idx, options) {
    const opts = options || {};
    const space = SPACES[idx];
    if (!space) { state.phase = "end"; if (!opts.fromQueue) finishStep(); return; }
    const bidders = activePlayers().filter((p) => p.money > 0);
    const out = new Set();
    let highest = 0;
    let winner = null;
    let rounds = 0;
    state.phase = "auction";
    state.notice = "مزاد على " + space.name + " — تبدأ المزايدة من 10$.";
    render();

    while (!state.over && rounds++ < 20) {
      const contenders = bidders.filter((p) => !out.has(p.index) && p.money >= highest + 10);
      if (!contenders.length) break;
      if (winner && contenders.length === 1 && contenders[0].index === winner.index) break;
      let any = false;
      for (const p of contenders) {
        if (!state || state.over || state.phase !== "auction") return;
        const min = highest + 10;
        if (p.money < min) { out.add(p.index); continue; }
        let bid = 0;
        const net = apiRef && apiRef.net;
        const remote = !!(net && net.enabled && net.isRemoteSeat(p.index));
        if (AI.isCpu(p)) {
          await wait(340);
          const limit = auctionLimit(p, space);
          if (limit >= min) bid = Math.min(limit, highest + Math.max(10, Math.round((space.price || 100) * (AI.level(p.level) === "hard" ? 0.2 : 0.13))));
        } else if (remote && net) {
          // اللاعب البشري البعيد يزايد من جهازه بدل أن يقرر عنه المضيف.
          const answer = typeof net.auctionBid === "function"
            ? await net.auctionBid(p.index, {
                spaceIdx: idx,
                highest,
                min,
                cash: p.money,
                name: p.name,
              })
            : 0;
          bid = Math.max(0, Math.min(p.money, Math.floor(Number(answer) || 0)));
          if (bid < min) bid = 0;
        } else {
          bid = await askAuctionBid(p, space, highest);
        }
        if (bid > highest) {
          highest = bid;
          winner = p;
          any = true;
          state.notice = "أعلى مزايدة الآن " + U.money(highest) + " من " + p.name + ".";
          render();
        } else {
          out.add(p.index);
        }
      }
      if (!any) break;
    }

    if (winner && highest > 0) {
      winner.money -= highest;
      state.props[idx] = { owner: winner.index, houses: 0, mortgaged: false };
      state.notice = "فاز " + winner.name + " بمزاد " + space.name + " مقابل " + U.money(highest) + ".";
      apiRef.log("فاز <strong>" + U.escape(winner.name) + "</strong> بمزاد " + U.escape(space.name) + " مقابل " + U.money(highest) + ".", "good");
      if (FX) {
        FX.sound("coin");
        FX.after(() => FX.pop(rootRef && rootRef.querySelector(".mrow.active")), 45);
      }
    } else {
      state.notice = "لم يتلقَّ " + space.name + " أي مزايدة — بقي للبنك.";
      apiRef.log("انتهى مزاد " + U.escape(space.name) + " دون مزايدات.", "warn");
    }
    state.phase = "end";
    if (!opts.fromQueue) finishStep();
    else render();
  }

  async function settleBankQueue() {
    while (state && !state.over && Array.isArray(state.bankQueue) && state.bankQueue.length) {
      const idx = state.bankQueue.shift();
      const space = SPACES[idx];
      if (!space || space.price == null || state.props[idx]) continue;
      state.notice = "البنك يطرح " + space.name + " في مزاد بعد إفلاس مالكه.";
      render();
      await runAuction(idx, { fromQueue: true });
    }
  }

  function canBuild(rec, idx) {
    const space = SPACES[idx];
    if (!space.group || !rec || rec.owner == null || rec.mortgaged || rec.houses >= 5) return false;
    const owner = state.players[rec.owner];
    if (!ownsGroup(owner, space.group)) return false;
    const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
    if (group.some((g) => g.mortgaged)) return false;
    const minHouses = Math.min(...group.map((g) => g.houses));
    return rec.houses === minHouses;
  }

  function buildHouse(idx) {
    const rec = state.props[idx];
    const p = rec ? state.players[rec.owner] : null;
    if (!p || rec.owner !== state.current || !canBuild(rec, idx)) {
      BG.toast("لا يمكن البناء الآن — يجب امتلاك المجموعة كاملة والبناء بالتساوي.", "warn");
      return;
    }
    const space = SPACES[idx];
    if (p.money < space.house) {
      BG.toast("لا تملك مالًا كافيًا لبناء منزل.", "warn");
      return;
    }
    const upgrading = rec.houses === 4;
    if (!state.bank) rebuildBankStock();
    if (upgrading && state.bank.hotels <= 0) {
      BG.toast("لا توجد فنادق متبقية في البنك — انتظر عودة فندق من البيع أو الإفلاس.", "warn");
      return;
    }
    if (!upgrading && state.bank.houses <= 0) {
      BG.toast("لا توجد منازل متبقية في البنك — انتظر عودة منزل من البيع أو الإفلاس.", "warn");
      return;
    }
    p.money -= space.house;
    if (upgrading) {
      state.bank.hotels -= 1;
      state.bank.houses += 4;
      rec.houses = 5;
    } else {
      state.bank.houses -= 1;
      rec.houses += 1;
    }
    apiRef.log("بنى <strong>" + U.escape(p.name) + "</strong> " + (rec.houses === 5 ? "فندقًا" : "منزلًا") + " في " + U.escape(space.name) + ".", "good");
    render();
    if (FX) {
      FX.sound("build");
      FX.after(() => {
        const row = rootRef && rootRef.querySelector(".mrow.active");
        if (row) { FX.pop(row); FX.floatText(row, "+" + (rec.houses === 5 ? "فندق" : "منزل"), "good"); }
      }, 45);
    }
  }

  function sellHouse(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || rec.houses <= 0) return;
    const p = state.players[rec.owner];
    const space = SPACES[idx];
    if (space.group) {
      const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
      const maxHouses = Math.max(...group.map((g) => g.houses || 0));
      if (rec.houses < maxHouses) {
        BG.toast("بع المنازل بالتساوي — لا يمكن البيع من عقار أقل بناءً من غيره.", "warn");
        return;
      }
    }
    if (!state.bank) rebuildBankStock();
    if (!sellBuilding(rec)) {
      BG.toast("لا توجد أربعة منازل في البنك لاستبدال الفندق بها. بِع منازل أخرى أولًا أو انتظر عودتها.", "warn");
      return;
    }
    p.money += Math.floor(space.house / 2);
    apiRef.log("باع <strong>" + U.escape(p.name) + "</strong> بناءً في " + U.escape(space.name) + " مقابل " + U.money(Math.floor(space.house / 2)) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  function mortgage(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || rec.mortgaged) return;
    const space = SPACES[idx];
    if (space.group) {
      const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
      if (group.some((g) => g.houses > 0)) {
        BG.toast("بيع المنازل في المجموعة أولًا قبل الرهن.", "warn");
        return;
      }
    }
    if (rec.houses > 0) {
      BG.toast("لا يمكن رهن عقار عليه منازل.", "warn");
      return;
    }
    rec.mortgaged = true;
    const p = state.players[rec.owner];
    p.money += Math.floor(space.price / 2);
    apiRef.log("رهن <strong>" + U.escape(p.name) + "</strong> " + U.escape(space.name) + " مقابل " + U.money(Math.floor(space.price / 2)) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  function unmortgage(idx) {
    const rec = state.props[idx];
    if (!rec || rec.owner !== state.current || !rec.mortgaged) return;
    const space = SPACES[idx];
    const cost = Math.ceil(space.price * 0.55);
    const p = state.players[rec.owner];
    if (p.money < cost) {
      BG.toast("لا تملك " + U.money(cost) + " لفك الرهن.", "warn");
      return;
    }
    p.money -= cost;
    rec.mortgaged = false;
    apiRef.log("فك <strong>" + U.escape(p.name) + "</strong> رهن " + U.escape(space.name) + " مقابل " + U.money(cost) + ".");
    if (FX) FX.sound("coin");
    render();
  }

  /* ------------------------------ التبادل ------------------------------ */

  function tradeAssetValue(player, idx) {
    const space = SPACES[idx];
    if (!space || space.price == null) return 0;
    let value = space.price;
    if (space.group) {
      const total = groupSpaces(space.group).length;
      const owned = groupSpaces(space.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === player.index).length;
      if (owned === total - 1) value += space.price * 0.92;
      else if (owned === total) value += space.price * 0.44;
    }
    if (space.type === "rail") value += countType(player, "rail") * 58;
    if (space.type === "utility") value += countType(player, "utility") * 42;
    return Math.round(value);
  }

  function tradePropertyValue(player, idx) {
    const rec = state.props[idx];
    const space = SPACES[idx];
    if (!rec || !space) return 0;
    let value = tradeAssetValue(player, idx);
    if (rec.mortgaged) value -= Math.ceil((space.price || 0) * 0.55);
    if (rec.houses > 0) value += rec.houses * (space.house || 0) * 0.7;
    return Math.max(0, Math.round(value));
  }

  function tradeBundleValue(player, indexes) {
    return (indexes || []).reduce((sum, idx) => sum + tradePropertyValue(player, idx), 0);
  }

  function cpuAcceptsTrade(target, offer) {
    const level = AI.level(target.level);
    const factor = level === "easy" ? 1.22 : level === "hard" ? 0.9 : 1.02;
    const gain = (offer.pay || 0) + tradeBundleValue(target, offer.giveIdxs || []);
    const loss = (offer.receive || 0) + tradeBundleValue(target, offer.takeIdxs || []);
    if (gain <= 0) return false;
    if (gain < loss * factor) return false;
    // الذكاء الصعب يرفض تمكين خصم من إكمال مجموعة لونية إلا مقابل علاوة واضحة.
    if (level === "hard" && (offer.giveIdxs || []).some((idx) => {
      const sp = SPACES[idx];
      if (!sp || !sp.group) return false;
      const current = groupSpaces(sp.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === target.index).length;
      return current === groupSpaces(sp.group).length - 1;
    })) return false;
    return true;
  }

  function tradeCardHTML(player, idx, side, selected) {
    const rec = state.props[idx] || {};
    const space = SPACES[idx];
    const blocked = rec.houses > 0;
    const color = space.group ? groupColor(space.group) : groupColor(space.type);
    return (
      '<button type="button" class="trade-asset mono-asset' + (selected ? " is-selected" : "") + (blocked ? " is-blocked" : "") + '"' +
      ' data-trade-pick="' + side + ":" + idx + '" draggable="' + (!blocked ? "true" : "false") + '" data-trade-drag="' + side + ":" + idx + '">' +
      '<span class="trade-asset-band" style="--group:' + color + '"></span>' +
      '<span class="trade-asset-name">' + U.escape(space.short || space.name) + "</span>" +
      '<small>' + (blocked ? "بيع البناء أولًا" : rec.mortgaged ? "مرهون" : U.money(space.price || 0)) + "</small>" +
      (selected ? '<i class="trade-check">✓</i>' : "") +
      "</button>"
    );
  }

  function openTrade() {
    if (!state || state.over) return;
    const p = cur();
    const others = activePlayers().filter((x) => x.index !== p.index);
    if (!others.length) { BG.toast("لا يوجد لاعب آخر للتبادل.", "warn"); return; }
    let target = others[0];
    const offer = { giveIdxs: [], takeIdxs: [], pay: 0, receive: 0 };
    const body = BG.el("div", { class: "mono-trade" });

    function valueOf(ids, player) {
      return tradeBundleValue(player, ids);
    }

    function summaryHTML() {
      const pay = Math.max(0, Math.min(p.money, Number(body.querySelector('[name="pay"]')?.value) || 0));
      const receive = Math.max(0, Math.min(target.money, Number(body.querySelector('[name="receive"]')?.value) || 0));
      const mineValue = valueOf(offer.giveIdxs, p) + pay;
      const theirValue = valueOf(offer.takeIdxs, target) + receive;
      const diff = mineValue - theirValue;
      const cpuEval = AI.isCpu(target) ? cpuAcceptsTrade(target, offer) : null;
      return (
        '<div class="mono-trade-summary">' +
        '<div><span>قيمة عرضك</span><strong>' + U.money(mineValue) + "</strong></div>" +
        '<div><span>قيمة طلبك</span><strong>' + U.money(theirValue) + "</strong></div>" +
        '<div class="' + (diff >= 0 ? "is-good" : "is-low") + '"><span>الفارق</span><strong>' + (diff >= 0 ? "+" : "") + U.money(diff) + "</strong></div>" +
        (cpuEval == null ? "" : '<div class="mono-trade-prob"><span>موقف الكمبيوتر</span><strong class="' + (cpuEval ? "good" : "warn") + '">' + (cpuEval ? "يميل للقبول" : "يميل للرفض") + "</strong></div>") +
        "</div>"
      );
    }

    function pane(side) {
      const owner = side === "give" ? p : target;
      const list = ownedList(owner);
      const ids = side === "give" ? offer.giveIdxs : offer.takeIdxs;
      return (
        '<section class="mono-trade-pane" data-trade-pane="' + side + '">' +
        '<header><h3>' + (side === "give" ? "أنت تعرض" : "أنت تطلب من " + U.escape(target.name)) + "</h3><span>" + U.money(owner.money) + "</span></header>" +
        '<div class="mono-trade-drop" data-trade-drop="' + side + '">' +
        (ids.length
          ? ids.map((idx) => {
              const sp = SPACES[idx];
              return '<span class="mono-trade-chip" style="--group:' + (sp.group ? groupColor(sp.group) : groupColor(sp.type)) + '">' + U.escape(sp.short || sp.name) + '<button type="button" data-trade-remove="' + side + ":" + idx + '" aria-label="إزالة">×</button></span>';
            }).join("")
          : '<span class="mono-trade-placeholder">اسحب العقارات هنا أو اضغط عليها لإضافتها</span>') +
        "</div>" +
        '<div class="mono-trade-pool">' +
        (list.length ? list.map(({ idx }) => tradeCardHTML(owner, idx, side, ids.includes(idx))).join("") : '<p class="mono-fine">لا توجد عقارات.</p>') +
        "</div></section>"
      );
    }

    function renderTrade() {
      const targetOptions = others.map((o) => '<option value="' + o.index + '"' + (o.index === target.index ? " selected" : "") + ">" + U.escape(o.name) + "</option>").join("");
      body.innerHTML =
        '<div class="mono-trade-top">' +
        '<label class="mono-field"><span>اللاعب الآخر</span><select name="target">' + targetOptions + "</select></label>" +
        '<div class="mono-trade-hint">تبادل العقارات والمال. العقارات المبنية يجب بيع مبانيها أولًا.</div>' +
        "</div>" +
        '<div class="mono-trade-grid">' + pane("give") + pane("take") + "</div>" +
        '<div class="mono-trade-money">' +
        '<label class="mono-field"><span>تدفع أنت <small>حد أقصى ' + U.money(p.money) + "</small></span>" +
        '<input name="pay" type="number" min="0" max="' + Math.floor(p.money) + '" step="10" value="' + offer.pay + '" /></label>' +
        '<label class="mono-field"><span>يدفع لك <small>حد أقصى ' + U.money(target.money) + "</small></span>" +
        '<input name="receive" type="number" min="0" max="' + Math.floor(target.money) + '" step="10" value="' + offer.receive + '" /></label>' +
        "</div>" +
        '<div class="mono-quick-bids mono-trade-quick">' +
        [50, 100, 200, 500].map((v) => '<button type="button" class="mini-chip" data-trade-add="pay" data-amount="' + v + '">+ ' + U.money(v) + "</button>").join("") +
        '<button type="button" class="mini-chip" data-trade-clear="money">تصفير المال</button>' +
        "</div>" +
        summaryHTML();
    }

    function updateSummary() {
      const pay = body.querySelector('[name="pay"]');
      const receive = body.querySelector('[name="receive"]');
      if (pay) offer.pay = Math.max(0, Math.min(p.money, Number(pay.value) || 0));
      if (receive) offer.receive = Math.max(0, Math.min(target.money, Number(receive.value) || 0));
      const box = body.querySelector(".mono-trade-summary");
      if (box) box.outerHTML = summaryHTML();
    }

    function toggle(side, idx) {
      const list = side === "give" ? offer.giveIdxs : offer.takeIdxs;
      const rec = state.props[idx];
      if (!rec || rec.houses > 0) { BG.toast("بيع بناء هذا العقار قبل تبادله.", "warn"); return; }
      const pos = list.indexOf(idx);
      if (pos >= 0) list.splice(pos, 1);
      else list.push(idx);
      renderTrade();
    }

    body.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-trade-remove]");
      if (remove) {
        const [side, idx] = remove.dataset.tradeRemove.split(":");
        toggle(side, Number(idx));
        return;
      }
      const pick = event.target.closest("[data-trade-pick]");
      if (pick) {
        const [side, idx] = pick.dataset.tradePick.split(":");
        toggle(side, Number(idx));
        return;
      }
      const add = event.target.closest("[data-trade-add]");
      if (add) {
        const which = add.dataset.tradeAdd;
        const input = body.querySelector('[name="' + which + '"]');
        if (input) {
          const max = which === "pay" ? p.money : target.money;
          input.value = String(Math.min(max, (Number(input.value) || 0) + Number(add.dataset.amount || 0)));
          updateSummary();
        }
        return;
      }
      if (event.target.closest("[data-trade-clear]")) {
        const pay = body.querySelector('[name="pay"]');
        const receive = body.querySelector('[name="receive"]');
        if (pay) pay.value = "0";
        if (receive) receive.value = "0";
        updateSummary();
      }
    });

    body.addEventListener("change", (event) => {
      if (event.target.name !== "target") return;
      target = state.players[Number(event.target.value)] || others[0];
      offer.giveIdxs = [];
      offer.takeIdxs = [];
      offer.pay = 0;
      offer.receive = 0;
      renderTrade();
    });

    body.addEventListener("input", (event) => {
      if (event.target.name === "pay" || event.target.name === "receive") updateSummary();
    });

    body.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-trade-drag]");
      if (!card) return;
      event.dataTransfer.setData("text/plain", card.dataset.tradeDrag);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    });
    body.addEventListener("dragend", (event) => {
      const card = event.target.closest("[data-trade-drag]");
      if (card) card.classList.remove("is-dragging");
    });
    body.addEventListener("dragover", (event) => {
      if (event.target.closest("[data-trade-drop]")) event.preventDefault();
    });
    body.addEventListener("drop", (event) => {
      const zone = event.target.closest("[data-trade-drop]");
      if (!zone) return;
      event.preventDefault();
      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) return;
      const [side, idx] = raw.split(":");
      if (side !== zone.dataset.tradeDrop) return;
      const list = side === "give" ? offer.giveIdxs : offer.takeIdxs;
      if (!list.includes(Number(idx))) toggle(side, Number(idx));
    });

    renderTrade();

    const dlg = BG.openDialog({
      title: "عرض تبادل ذكي",
      body,
      actions: [
        { label: "إلغاء", value: "cancel" },
        {
          label: "إرسال العرض",
          primary: true,
          onClick: ({ close }) => {
            offer.pay = Math.max(0, Math.min(p.money, Number(body.querySelector('[name="pay"]')?.value) || 0));
            offer.receive = Math.max(0, Math.min(target.money, Number(body.querySelector('[name="receive"]')?.value) || 0));
            if (!offer.giveIdxs.length && !offer.takeIdxs.length && !offer.pay && !offer.receive) {
              BG.toast("أضف عقارًا أو مبلغًا إلى العرض.", "warn");
              return;
            }
            close("sent");
          },
        },
      ],
    });

    return dlg.promise.then(async (value) => {
      if (value !== "sent") return;
      const giveNames = offer.giveIdxs.map((idx) => SPACES[idx].name);
      const takeNames = offer.takeIdxs.map((idx) => SPACES[idx].name);
      const text = "<div class='trade-summary'>" +
        "<p><strong>" + U.escape(p.name) + "</strong> يعرض:</p><ul>" +
        (giveNames.length ? giveNames.map((n) => "<li>" + U.escape(n) + "</li>").join("") : "<li>لا عقارات</li>") +
        (offer.pay ? "<li>" + U.money(offer.pay) + "</li>" : "") + "</ul>" +
        "<p>مقابل من <strong>" + U.escape(target.name) + "</strong>:</p><ul>" +
        (takeNames.length ? takeNames.map((n) => "<li>" + U.escape(n) + "</li>").join("") : "<li>لا عقارات</li>") +
        (offer.receive ? "<li>" + U.money(offer.receive) + "</li>" : "") + "</ul>" +
        "<p>هل تقبل يا " + U.escape(target.name) + "؟</p></div>";
      const net = apiRef && apiRef.net;
      let ok = false;
      if (AI.isCpu(target)) {
        await wait(360);
        ok = cpuAcceptsTrade(target, offer);
      } else if (net && net.isRemoteSeat(target.index)) {
        ok = await net.confirmTrade(target.index, text);
      } else {
        ok = await BG.confirm("عرض تبادل جديد", text, "أوافق", "أرفض");
      }
      if (!ok) {
        apiRef.log("رفض <strong>" + U.escape(target.name) + "</strong> عرض التبادل من <strong>" + U.escape(p.name) + "</strong>.");
        BG.toast(AI.isCpu(target) ? "رفض الكمبيوتر العرض — جرّب مبلغًا أو عقارًا أفضل." : "رُفض العرض.");
        return;
      }
      for (const idx of offer.giveIdxs) {
        if (state.props[idx] && state.props[idx].owner === p.index) state.props[idx].owner = target.index;
      }
      for (const idx of offer.takeIdxs) {
        if (state.props[idx] && state.props[idx].owner === target.index) state.props[idx].owner = p.index;
      }
      p.money = Math.max(0, p.money - offer.pay + offer.receive);
      target.money = Math.max(0, target.money + offer.pay - offer.receive);
      apiRef.log("تم تبادل: <strong>" + U.escape(p.name) + "</strong> ↔ <strong>" + U.escape(target.name) + "</strong>.", "good");
      BG.toast("تم تنفيذ التبادل.", "good");
      if (FX) FX.sound("trade");
      render();
    });
  }

  /* ------------------------------ عرض تفاصيل العقار ------------------------------ */

  function showPropertyDetails(idx) {
    const space = SPACES[idx];
    if (!space || !state) return;
    const rec = state.props[idx] || { owner: null, houses: 0, mortgaged: false };
    const owner = rec.owner != null ? state.players[rec.owner] : null;
    const body = BG.el("div", { class: "mono-deed-wrap" });
    const color = space.group ? groupColor(space.group) : groupColor(space.type);
    const canControl = !!owner && state.current === owner.index && controlsSeat(owner.index);
    let html = "";

    if (space.type === "prop" || space.type === "rail" || space.type === "utility") {
      const rents = [];
      if (space.type === "prop") {
        rents.push(["الإيجار الأساسي", space.rent[0], rec.houses === 0]);
        for (let i = 1; i <= 4; i++) rents.push([i === 1 ? "منزل واحد" : i + " منازل", space.rent[i], rec.houses === i]);
        rents.push(["فندق", space.rent[5], rec.houses === 5]);
      } else if (space.type === "rail") {
        [1, 2, 3, 4].forEach((n) => rents.push([n + " سكة حديد", [0, 25, 50, 100, 200][n], owner && countType(owner, "rail") === n && rec.houses === 0]));
      } else {
        rents.push(["مرفق واحد", "4 × مجموع النرد", owner && countType(owner, "utility") === 1]);
        rents.push(["مرفقان", "10 × مجموع النرد", owner && countType(owner, "utility") >= 2]);
      }
      html =
        '<article class="mono-deed" style="--deed-color:' + color + '">' +
        '<div class="mono-deed-top"><span>TITLE DEED</span><span>MONOPOLY</span></div>' +
        '<div class="mono-deed-band"><span>' + (space.group ? groupLabel(space.group) : space.type === "rail" ? "سكك حديد" : "مرافق") + "</span></div>" +
        "<h2>" + U.escape(space.name) + "</h2>" +
        (space.en ? '<p class="mono-deed-en">' + U.escape(space.en) + "</p>" : "") +
        '<div class="mono-deed-price">سعر الشراء <strong>' + U.money(space.price || 0) + "</strong></div>" +
        '<table class="mono-deed-rents"><tbody>' +
        rents.map(([label, value, active]) => '<tr class="' + (active ? "is-active" : "") + '"><th scope="row">' + label + "</th><td>" + (typeof value === "number" ? U.money(value) : value) + "</td></tr>").join("") +
        "</tbody></table>" +
        '<div class="mono-deed-meta">' +
        (space.house ? "<div><span>تكلفة المنزل / الفندق</span><strong>" + U.money(space.house) + "</strong></div>" : "") +
        "<div><span>قيمة الرهن</span><strong>" + U.money(Math.floor((space.price || 0) / 2)) + "</strong></div>" +
        "<div><span>فك الرهن</span><strong>" + U.money(Math.ceil((space.price || 0) * 0.55)) + "</strong></div>" +
        (space.house ? "<div><span>كل مجموعة كاملة</span><strong>إيجار مضاعف</strong></div>" : "") +
        "</div>" +
        '<div class="mono-deed-owner">' +
        (owner
          ? '<span class="mono-owner-dot p' + (owner.index % 6) + '"></span><span>المالك: <strong>' + U.escape(owner.name) + "</strong></span>" +
            (rec.mortgaged ? '<em class="mono-badge warn">مرهون</em>' : "") +
            (rec.houses ? '<em class="mono-badge">' + (rec.houses === 5 ? "فندق" : rec.houses + " منازل") + "</em>" : "")
          : '<span class="mono-owner-dot bank"></span><span>المالك: <strong>البنك</strong></span>') +
        "</div></article>";

      if (canControl) {
        const buildable = space.type === "prop" && canBuild(rec, idx) && owner.money >= (space.house || 0);
        const sellable = rec.houses > 0;
        const mortgageable = rec.houses === 0 && !rec.mortgaged && (!space.group || !groupSpaces(space.group).some((g) => (state.props[g.idx]?.houses || 0) > 0));
        html += '<div class="mono-deed-actions">' +
          (buildable ? '<button class="bg-btn primary" data-deed-act="build">' + houseArt(rec.houses === 4 ? "hotel" : "house") + " ابنِ " + (rec.houses === 4 ? "فندقًا" : "منزلًا") + " · " + U.money(space.house) + "</button>" : "") +
          (sellable ? '<button class="bg-btn" data-deed-act="sell">' + houseArt("house") + " بِع بناءً · +" + U.money(Math.floor((space.house || 0) / 2)) + "</button>" : "") +
          (mortgageable ? '<button class="bg-btn" data-deed-act="mortgage">رهن العقار · +' + U.money(Math.floor((space.price || 0) / 2)) + "</button>" : "") +
          (rec.mortgaged ? '<button class="bg-btn primary" data-deed-act="unmortgage">فك الرهن · −' + U.money(Math.ceil((space.price || 0) * 0.55)) + "</button>" : "") +
          "</div>";
      }
      if (!owner && state.phase === "buy" && state.pendingBuy === idx && canActNow()) {
        html += '<div class="mono-deed-actions"><button class="bg-btn primary" data-deed-act="buy">شراء الآن · ' + U.money(space.price || 0) + "</button></div>";
      }
    } else {
      html =
        '<article class="mono-deed mono-deed-special">' +
        '<div class="mono-deed-top"><span>CITY SPACE</span><span>MONOPOLY</span></div>' +
        '<div class="mono-deed-special-icon">' + (ICON_ART[space.type === "utility" ? "utility" : space.type] || ICON_ART.chance) + "</div>" +
        "<h2>" + U.escape(space.name) + "</h2>" +
        '<p class="mono-deed-en">' + U.escape(space.en || "مساحة خاصة على الرقعة") + "</p>" +
        '<div class="mono-deed-meta"><div><span>النوع</span><strong>' +
        (space.type === "chance" ? "بطاقة فرصة" : space.type === "chest" ? "صندوق المجتمع" : space.type === "tax" ? "ضريبة" : space.type === "go" ? "راتب الانطلاق" : space.type === "jail" ? "زيارة / سجن" : space.type === "gotojail" ? "اذهب إلى السجن" : "موقف مجاني") +
        "</strong></div></div></article>";
    }

    body.innerHTML = html;
    body.querySelectorAll("[data-deed-act]").forEach((button) => {
      button.addEventListener("click", () => {
        const act = button.dataset.deedAct;
        if (act === "build") buildHouse(idx);
        else if (act === "sell") sellHouse(idx);
        else if (act === "mortgage") mortgage(idx);
        else if (act === "unmortgage") unmortgage(idx);
        else if (act === "buy") buyProperty();
        setTimeout(() => {
          if (!state || state.over) return;
          BG.closeDialogs();
          showPropertyDetails(idx);
        }, 60);
      });
    });
    BG.openDialog({
      title: "تفاصيل العقار",
      body,
      actions: [{ label: "إغلاق", value: "close" }],
    });
  }

  /* ------------------------------ العرض ------------------------------ */

  function posToRC(i) {
    if (i === 0) return [11, 11];
    if (i <= 9) return [11, 11 - i];
    if (i === 10) return [11, 1];
    if (i <= 19) return [21 - i, 1];
    if (i === 20) return [1, 1];
    if (i <= 29) return [1, i - 19];
    if (i === 30) return [1, 11];
    return [i - 29, 11];
  }

  function edgeClass(i) {
    if ([0, 10, 20, 30].includes(i)) return "corner";
    if (i < 10) return "bottom";
    if (i < 20) return "left";
    if (i < 30) return "top";
    return "right";
  }

  function drawBoard() {
    const board = document.createElement("div");
    board.className = "mono-board";
    board.setAttribute("role", "grid");
    board.setAttribute("aria-label", "رقعة مونوبولي");

    SPACES.forEach((space, i) => {
      const [row, col] = posToRC(i);
      const edge = edgeClass(i);
      const rec = state.props[i];
      const owner = rec && rec.owner != null ? state.players[rec.owner] : null;
      const activePlayer = state.players[state.current];
      const isCurrent = !!(activePlayer && !activePlayer.bankrupt && activePlayer.pos === i);
      const cell = document.createElement("div");
      cell.className = "mcell " + edge + (owner ? " owned" : "") + (rec && rec.mortgaged ? " mortgaged" : "") + (space.type === "prop" ? " property" : " special") + (isCurrent ? " is-current" : "");
      cell.dataset.space = String(i);
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
      if (owner) {
        cell.style.setProperty("--owner", "var(--p" + (owner.index % 6) + ")");
        cell.style.setProperty("--owner-color", owner.color || PLAYER_COLORS[owner.index % PLAYER_COLORS.length]);
      }
      cell.title = space.name + (space.price ? " — " + U.money(space.price) : "") + (owner ? " — " + owner.name : "");

      if (space.group) {
        const band = document.createElement("span");
        band.className = "mcolor";
        band.style.setProperty("--group", groupColor(space.group));
        cell.appendChild(band);
      }

      if (owner) {
        const ownerTag = document.createElement("span");
        ownerTag.className = "mowner";
        ownerTag.innerHTML = '<span class="mowner-dot"></span><span>' + U.escape(owner.name.slice(0, 2)) + "</span>";
        cell.appendChild(ownerTag);
      }

      const icon = document.createElement("span");
      icon.className = "micon";
      const art = space.type === "rail" ? ICON_ART.rail : space.type === "utility" ? (space.name.indexOf("مياه") >= 0 ? ICON_ART.water : ICON_ART.utility) : ICON_ART[space.type] || "";
      icon.innerHTML = art;
      if (art) cell.appendChild(icon);

      const label = document.createElement("span");
      label.className = "mname";
      label.textContent = space.short || space.name;
      cell.appendChild(label);

      if (space.price) {
        const price = document.createElement("span");
        price.className = "mprice";
        price.textContent = U.money(space.price);
        cell.appendChild(price);
      }

      if (rec && rec.houses > 0) {
        const houses = document.createElement("span");
        houses.className = "mhouses";
        if (rec.houses === 5) {
          houses.classList.add("is-hotel");
          houses.innerHTML = houseArt("hotel") + '<b class="mhouse-count">فندق</b>';
        } else {
          houses.innerHTML = Array.from({ length: rec.houses }, () => houseArt("house")).join("") + '<b class="mhouse-count">' + rec.houses + "</b>";
        }
        cell.appendChild(houses);
      }

      if (rec && rec.mortgaged) {
        const m = document.createElement("span");
        m.className = "mmortgage";
        m.textContent = "رهن";
        cell.appendChild(m);
      }

      const tokens = document.createElement("span");
      tokens.className = "mtokens";
      state.players.forEach((p) => {
        if (p.bankrupt || p.pos !== i) return;
        const t = document.createElement("span");
        t.className = "mtoken p" + (p.index % 6) + (state.current === p.index ? " active" : "") + (p.inJail && i === 10 ? " jailed" : "");
        t.setAttribute("data-fx-piece", "mp-" + p.index);
        t.setAttribute("data-fx-enter", "pop");
        t.style.setProperty("--profile-color", p.color || PLAYER_COLORS[p.index % PLAYER_COLORS.length]);
        t.style.setProperty("--p", p.color || PLAYER_COLORS[p.index % PLAYER_COLORS.length]);
        t.innerHTML = '<span class="mtoken-art">' + U.escape(BG.playerProfile.avatarEmoji(p.profile)) + '</span><b class="mtoken-num">' + (p.index + 1) + "</b>";
        t.title = p.name;
        tokens.appendChild(t);
      });
      cell.appendChild(tokens);
      board.appendChild(cell);
    });

    const center = document.createElement("div");
    center.className = "mcenter";
    const p = cur();
    const pot = Number(state.pot) || 0;
    const isRollPhase = state.phase === "roll" && p && !AI.isCpu(p) && canActNow();
    center.innerHTML =
      '<div class="mcenter-brand"><span class="mcenter-star">✦</span><div class="mlogo">MONOPOLY<span>نُبلاء المدينة</span></div><span class="mcenter-star">✦</span></div>' +
      (p ? '<div class="mturn"><span class="mturn-token p' + (p.index % 6) + '" style="--p:' + (p.color || PLAYER_COLORS[p.index % PLAYER_COLORS.length]) + '">' + U.escape(BG.playerProfile.avatarEmoji(p.profile)) + '</span><div><span>دور</span><strong class="p' + (p.index % 6) + '" style="color:' + (p.color || PLAYER_COLORS[p.index % PLAYER_COLORS.length]) + '">' + U.escape(p.name) + '</strong><small>' + (p.inJail ? "في السجن" : "على الرقعة") + "</small></div><b>" + U.money(p.money) + "</b></div>" : "") +
      '<div class="mdice' + (isRollPhase ? " mdice-action" : "") + '"' + (isRollPhase ? ' data-act="roll" role="button" tabindex="0" title="ارمِ النرد"' : "") + ">" +
      (state.dice ? dieMarkup(state.dice[0]) + dieMarkup(state.dice[1]) : '<span class="mdice-empty">' + (isRollPhase ? "اضغط لرمي النرد" : "بانتظار النرد") + "</span>") +
      "</div>" +
      '<div class="mcenter-divider"><span></span><i>◆</i><span></span></div>' +
      '<div class="mnotice">' + U.escape(state.notice || "") + "</div>" +
      (state.lastCard
        ? '<div class="mcard"><span>' + U.escape(state.lastCard.deck) + "</span><strong>" + U.escape(state.lastCard.title) + "</strong><small>" + U.escape(state.lastCard.text) + "</small></div>"
        : '<div class="mcard empty"><span>مركز المدينة</span><strong>اشترِ، ابنِ، وازدهر</strong><small>كل مجموعة لونية كاملة تضاعف الأجرة وتفتح باب البناء.</small></div>') +
      '<div class="mcenter-foot"><span>البنك: ' + (state.bank ? state.bank.houses : 0) + " منزل · " + (state.bank ? state.bank.hotels : 0) + " فندق</span>" +
      (state.config && state.config.freeParking ? "<span>الموقف: " + U.money(pot) + "</span>" : "") + "</div>";
    center.addEventListener("click", (event) => {
      if (event.target.closest("[data-act]")) return;
      event.stopPropagation();
      showPropertyDetails(20);
    });
    board.appendChild(center);
    return board;
  }

  /* ----------------------------- حركة القطع ----------------------------- */

  function clearTokenTimers() {
    tokenTimers.forEach((id) => clearTimeout(id));
    tokenTimers = [];
  }

  /** أقصر مسار دائري بين مربعين (يتعامل مع المرور من نقطة البداية). */
  function tokenPath(from, to) {
    const forward = (to - from + 40) % 40;
    const backward = (from - to + 40) % 40;
    const path = [];
    if (!forward) return path;
    if (forward <= backward) {
      for (let i = 1; i <= forward; i++) path.push((from + i) % 40);
    } else {
      for (let i = 1; i <= backward; i++) path.push((from - i + 40) % 40);
    }
    return path;
  }

  /**
   * يحرّك قطع اللاعبين خطوة بخطوة بين المربعات بعد كل إعادة رسم،
   * مع صوت خطوة عند كل مربع ولمسة أخيرة عند الهبوط.
   */
  function animateBoardTokens(wrap) {
    const board = wrap.querySelector(".mono-board");
    if (!board) return;
    clearTokenTimers();
    const rects = new Map();
    board.querySelectorAll(".mcell[data-space]").forEach((cell) => {
      rects.set(Number(cell.dataset.space), cell.getBoundingClientRect());
    });
    const tokens = Array.from(wrap.querySelectorAll(".mtoken[data-fx-piece]"));
    if (!tokens.length) {
      tokenPositions = new Map();
      return;
    }
    const seen = new Set();
    tokens.forEach((token) => {
      const key = token.getAttribute("data-fx-piece") || "";
      const index = Number(key.slice(3));
      if (!Number.isFinite(index) || !state.players[index]) return;
      const player = state.players[index];
      seen.add(index);
      const previous = tokenPositions.get(index);
      tokenPositions.set(index, player.pos);
      if (!FX) return;

      if (previous === undefined) {
        FX.pop(token, { duration: 260 });
        return;
      }
      if (previous === player.pos) return;

      // السجن أو القفز المفاجئ: ظهور سريع بدل المشي حول اللوحة.
      if (player.inJail && player.pos === 10) {
        FX.pop(token, { duration: 320 });
        FX.sound("token");
        return;
      }

      const path = tokenPath(previous, player.pos);
      const startRect = rects.get(previous);
      const finalRect = rects.get(player.pos);
      if (!path.length || !startRect || !finalRect) {
        FX.pop(token, { duration: 260 });
        return;
      }

      const fx = finalRect.left + finalRect.width / 2;
      const fy = finalRect.top + finalRect.height / 2;
      const sx = startRect.left + startRect.width / 2 - fx;
      const sy = startRect.top + startRect.height / 2 - fy;
      const count = path.length;
      const stepMs = Math.max(48, Math.min(110, Math.round(920 / count)));
      const duration = stepMs * count;
      const frames = [{ offset: 0, transform: "translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) scale(1)" }];
      let fromRect = startRect;
      for (let i = 0; i < count; i++) {
        const toRect = rects.get(path[i]);
        if (!toRect) continue;
        const ax = (fromRect.left + fromRect.width / 2 + toRect.left + toRect.width / 2) / 2 - fx;
        const ay = (fromRect.top + fromRect.height / 2 + toRect.top + toRect.height / 2) / 2 - fy - 9;
        const tx = toRect.left + toRect.width / 2 - fx;
        const ty = toRect.top + toRect.height / 2 - fy;
        frames.push({
          offset: (i + 0.5) / count,
          transform: "translate(" + ax.toFixed(1) + "px," + ay.toFixed(1) + "px) rotate(" + (i % 2 ? -7 : 7) + "deg) scale(1.16)",
        });
        frames.push({
          offset: (i + 1) / count,
          transform: "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(0deg) scale(1)",
        });
        fromRect = toRect;
      }

      token.classList.add("fx-piece-moving");
      const anim = FX.animate(token, frames, { duration, easing: "linear" });
      const done = () => token.classList.remove("fx-piece-moving");
      if (anim) anim.finished.then(done).catch(done);
      else done();

      FX.sound("move");
      const every = count > 7 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        if (i % every && i !== count - 1) continue;
        const when = Math.round(stepMs * (i + 0.9));
        tokenTimers.push(setTimeout(() => { if (FX) FX.sound("step"); }, when));
      }
      tokenTimers.push(setTimeout(() => {
        if (!FX) return;
        FX.sound("token");
        FX.pop(token, { duration: 220 });
      }, duration + 16));
    });
    tokenPositions.forEach((_, key) => {
      if (!seen.has(key)) tokenPositions.delete(key);
    });
  }

  function phaseLabel() {
    if (state.over) return "انتهت";
    if (state.phase === "auction") return "مزاد";
    if (state.phase === "buy") return "شراء";
    if (state.phase === "roll") return "رمي";
    if (state.phase === "moving") return "تحرك";
    return "إجراء";
  }

  function actionHTML() {
    const p = cur();
    if (!p) return "";
    if (state.over) {
      const winner = state.winner != null ? state.players[state.winner] : null;
      return (
        '<div class="mono-action-card is-over">' +
        '<span class="mono-kicker">نهاية اللعبة</span>' +
        "<h3>" + (winner ? "فوز " + U.escape(winner.name) : "انتهت اللعبة") + "</h3>" +
        '<p>راجع الرقعة أو ابدأ لعبة جديدة من الشريط العلوي.</p></div>'
      );
    }

    if (state.phase === "auction") {
      return (
        '<div class="mono-action-card is-waiting">' +
        '<span class="mono-kicker">مزاد مباشر</span><h3>المزايدة جارية</h3>' +
        "<p>" + U.escape(state.notice || "أعلى مزايدة تفوز بالعقار.") + "</p></div>"
      );
    }

    if (!controlsSeat(state.current)) {
      const waiting = netMode() && localSeatIndex() === state.current;
      return (
        '<div class="mono-action-card is-waiting">' +
        '<span class="mono-kicker">' + (waiting ? "دورك" : "بانتظار اللاعب") + "</span>" +
        "<h3>" + U.escape(p.name) + "</h3>" +
        "<p>" + (AI.isCpu(p) ? "الكمبيوتر يفكر…" : "دور لاعب آخر — تابع اللوحة حتى يعود دورك.") + "</p></div>"
      );
    }

    if (state.phase === "buy") {
      const space = SPACES[state.pendingBuy];
      if (!space) return "";
      const can = p.money >= space.price;
      const color = space.group ? groupColor(space.group) : groupColor(space.type);
      const rentText = space.type === "prop"
        ? U.money(space.rent[0]) + " أساسي"
        : space.type === "rail" ? "25–200$ حسب السكك" : "4× أو 10× النرد";
      return (
        '<div class="mono-action-card is-buy" style="--group:' + color + '">' +
        '<span class="mono-kicker">عقار متاح للشراء</span>' +
        "<h3>" + U.escape(space.name) + "</h3>" +
        '<div class="mono-action-meta"><span>السعر <b>' + U.money(space.price) + "</b></span><span>الأجرة <b>" + rentText + "</b></span></div>" +
        '<div class="maction-row">' +
        '<button class="bg-btn primary" data-act="buy" ' + (can ? "" : "disabled") + ">شراء · " + U.money(space.price) + "</button>" +
        '<button class="bg-btn" data-act="skipBuy">' + (state.config && state.config.auction ? "طرح في المزاد" : "تخطّي") + "</button>" +
        "</div>" +
        (can ? "" : '<p class="mono-warn">تحتاج ' + U.money(space.price - p.money) + " إضافية — يمكنك الرهن من «عقاراتي».</p>") +
        "</div>"
      );
    }

    if (p.inJail && state.phase !== "over") {
      if (state.phase === "end" || state.phase === "moving") {
        return (
          '<div class="mono-action-card is-jail">' +
          '<span class="mono-kicker">ما زلت في السجن</span>' +
          "<p>" + U.escape(state.notice || "انتهت محاولتك لهذا الدور.") + "</p>" +
          '<div class="maction-row"><button class="bg-btn primary" data-act="endTurn">إنهاء الدور</button></div></div>'
        );
      }
      return (
        '<div class="mono-action-card is-jail">' +
        '<span class="mono-kicker">داخل السجن · محاولة ' + Math.min(p.jailTurns + 1, 3) + " من 3</span>" +
        "<h3>اختر طريقة الخروج</h3>" +
        '<div class="maction-row">' +
        '<button class="bg-btn primary" data-act="roll">ارمِ المزدوج</button>' +
        '<button class="bg-btn" data-act="payJail" ' + (p.money < jailFine() ? "disabled" : "") + ">ادفع " + U.money(jailFine()) + "</button>" +
        (p.jailCards > 0 ? '<button class="bg-btn" data-act="useJailCard">بطاقة خروج (' + p.jailCards + ")</button>" : "") +
        "</div></div>"
      );
    }

    if (state.phase === "roll" || state.phase === "moving") {
      return (
        '<div class="mono-action-card is-roll">' +
        '<span class="mono-kicker">' + (state.extraRoll ? "رمية مزدوجة إضافية" : "دور " + U.escape(p.name)) + "</span>" +
        '<button class="mono-roll-btn" data-act="roll">' + dieMarkup(1) + "<span>ارمِ النرد</span>" + dieMarkup(6) + "</button>" +
        '<p class="mono-hint">' + (state.extraRoll ? "رميت مزدوجًا — لك رمية أخرى بعد هذه." : "حرّك قطعتك والتقط الفرص.") + "</p></div>"
      );
    }

    return (
      '<div class="mono-action-card is-end">' +
      '<span class="mono-kicker">انتهى إجراء الدور</span>' +
      "<p>" + U.escape(state.notice || "") + "</p>" +
      (state.lastRent ? '<div class="mono-action-meta"><span>آخر أجرة <b>' + U.money(state.lastRent) + "</b></span></div>" : "") +
      '<div class="maction-row"><button class="bg-btn primary" data-act="endTurn">إنهاء الدور</button></div></div>'
    );
  }

  function propertyManagerHTML() {
    const p = cur();
    if (!p) return "";
    const list = ownedList(p);
    const bank = state.bank || { houses: 0, hotels: 0 };
    const stock =
      '<div class="mono-bank-stock">' +
      "<span>" + houseArt("house") + " " + bank.houses + " منزلًا</span>" +
      "<span>" + houseArt("hotel") + " " + bank.hotels + " فندقًا</span>" +
      "<span>النقد <b>" + U.money(p.money) + "</b></span></div>";
    if (!list.length) {
      return stock + '<p class="mono-empty-note">لا تملك عقارات بعد — اشترِ أول عقار أو اطلبه في تبادل.</p>';
    }
    return (
      stock +
      '<div class="mprop-list">' +
      list
        .map(({ idx, rec, space }) => {
          const color = space.group ? groupColor(space.group) : groupColor(space.type);
          const houseLabel = rec.houses === 5 ? "فندق" : rec.houses > 0 ? rec.houses + " منازل" : "أرض فضاء";
          const bankOk = rec.houses === 4 ? bank.hotels > 0 : bank.houses > 0;
          const canB = space.type === "prop" && canBuild(rec, idx) && p.money >= (space.house || 0) && bankOk;
          const group = space.group ? groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean) : [];
          const balanced = !group.length || rec.houses >= Math.max(...group.map((g) => g.houses || 0));
          const canS = rec.houses > 0 && balanced;
          const canM = !rec.mortgaged && rec.houses === 0 && !group.some((g) => (g.houses || 0) > 0);
          const canU = rec.mortgaged && p.money >= Math.ceil((space.price || 0) * 0.55);
          return (
            '<div class="mprop-row' + (rec.mortgaged ? " mortgaged" : "") + '" style="--group:' + color + '">' +
            '<span class="mprop-band"></span>' +
            '<div class="mprop-main"><strong>' + U.escape(space.short || space.name) + "</strong><small>" +
            (rec.houses > 0 ? houseArt(rec.houses === 5 ? "hotel" : "house") : "") + houseLabel +
            (rec.mortgaged ? " · مرهون" : "") + " · " + U.money(space.price || 0) + "</small></div>" +
            '<div class="mprop-actions">' +
            (canB ? '<button class="mini-btn good" data-build="' + idx + '" title="بناء">ابنِ</button>' : "") +
            (canS ? '<button class="mini-btn warn" data-sell="' + idx + '" title="بيع بناء">بِع</button>' : "") +
            (canM ? '<button class="mini-btn" data-mortgage="' + idx + '" title="رهن">رهن</button>' : "") +
            (canU ? '<button class="mini-btn good" data-unmortgage="' + idx + '" title="فك الرهن">فك</button>' : "") +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function sideHTML() {
    const p = cur();
    const local = localSeatIndex();
    return (
      '<aside class="mono-side" aria-label="لوحة اللاعبين والتحكم">' +
      '<section class="mpanel mplayers-panel">' +
      '<div class="mpanel-head"><h2>اللاعبون</h2><span>الجولة ' + state.round + " · الدور " + state.turn + "</span></div>" +
      '<div class="mplayers">' +
      state.players
        .map((pl) => {
          const owned = ownedList(pl);
          const isYou = local != null && local === pl.index;
          const active = state.current === pl.index && !state.over;
          return (
            '<div class="mrow p' + (pl.index % 6) + (active ? " active" : "") + (pl.bankrupt ? " bankrupt" : "") + '" style="--p:' + (pl.color || PLAYER_COLORS[pl.index % PLAYER_COLORS.length]) + '">' +
            '<span class="mrow-token p' + (pl.index % 6) + '" style="--profile-color:' + (pl.color || PLAYER_COLORS[pl.index % PLAYER_COLORS.length]) + '">' + U.escape(BG.playerProfile.avatarEmoji(pl.profile)) + "</span>" +
            '<div class="mrow-main"><strong>' + U.escape(pl.name) + (isYou ? ' <em class="mono-you">أنت</em>' : "") + "</strong><small>" +
            (pl.bankrupt
              ? "مفلس"
              : "<span class=\"mono-cash\">" + U.money(pl.money) + "</span> · " + owned.length + " عقار" +
                (pl.inJail ? ' · <b class="mono-mini-badge">سجن</b>' : "") +
                (pl.jailCards ? ' · <b class="mono-mini-badge is-card">بطاقة ×' + pl.jailCards + "</b>" : "")) +
            "</small>" +
            (owned.length
              ? '<div class="mrow-props">' + owned.map(({ idx, rec, space }) => {
                  const tint = space.group ? groupColor(space.group) : groupColor(space.type);
                  return '<button type="button" class="mrow-prop" data-prop="' + idx + '" style="--group:' + tint + '" title="عرض عقد ' + U.escape(space.name) + '">' +
                    U.escape(space.short || space.name) + (rec.mortgaged ? " · رهن" : rec.houses === 5 ? " · فندق" : rec.houses ? " · " + rec.houses : "") +
                    "</button>";
                }).join("") + "</div>"
              : "") +
            "</div>" +
            '<div class="mrow-right"><span class="mrow-net">' + (pl.bankrupt ? "—" : U.money(netWorth(pl))) + '</span><small>صافي</small></div>' +
            "</div>"
          );
        })
        .join("") +
      "</div></section>" +

      '<section class="mpanel action-panel"><div class="mpanel-head"><h2>لوحة التحكم</h2><span>' +
      phaseLabel() + "</span></div>" + actionHTML() +
      '<div class="mono-tools">' +
      '<button class="bg-btn small" data-act="toggleManage">' + (state.showManage ? "إخفاء العقارات" : "عقاراتي") + "</button>" +
      '<button class="bg-btn small" data-act="trade" ' + (canActNow() ? "" : "disabled") + ">تبادل</button>" +
      "</div></section>" +

      (state.showManage
        ? '<section class="mpanel manage-panel"><div class="mpanel-head"><h2>عقاراتك</h2><span>' + U.money(p ? p.money : 0) + "</span></div>" + propertyManagerHTML() + "</section>"
        : "") +

      '<section class="mpanel legend-panel"><div class="mpanel-head"><h2>المفتاح</h2><span>مونوبولي كلاسيك</span></div>' +
      '<div class="mlegend">' +
      Object.keys(GROUP_NAMES).map((g) => '<span><i style="background:' + GROUP_COLORS[g] + '"></i>' + GROUP_NAMES[g] + "</span>").join("") +
      '<span><i style="background:' + GROUP_COLORS.rail + '"></i>سكك حديد</span>' +
      '<span><i style="background:' + GROUP_COLORS.utility + '"></i>مرافق</span>' +
      "</div>" +
      '<p class="muted-note">راتب الانطلاق ' + U.money(GO_SALARY) + " — ثلاث رميات مزدوجة ترسلك للسجن — المجموعة الكاملة تضاعف الإيجار وتفتح البناء." +
      (state.config && state.config.freeParking ? " جائزة الموقف المجاني الحالية: " + U.money(state.pot || 0) + "." : "") +
      "</p></section></aside>"
    );
  }

  /* ------------------------------ الكمبيوتر ------------------------------ */

  function cpuReserve(level) {
    if (level === "easy") return 300;
    if (level === "hard") return 110;
    return 180;
  }

  function cpuShouldBuy(p, idx) {
    const space = SPACES[idx];
    if (!space || space.price == null || p.money < space.price) return false;
    const level = AI.level(p.level);
    const reserve = cpuReserve(level);
    const after = p.money - space.price;

    if (space.type === "prop" && space.group) {
      const total = groupSpaces(space.group).length;
      const mine = groupSpaces(space.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === p.index).length;
      if (mine === total - 1) return true;
      const rival = activePlayers().find((x) =>
        x.index !== p.index &&
        groupSpaces(space.group).filter(({ idx: i }) => state.props[i] && state.props[i].owner === x.index).length === total - 1
      );
      if (rival && level !== "easy") return after >= Math.min(reserve, 60);
    }

    if (space.type === "rail" && countType(p, "rail") >= 1 && level !== "easy") {
      return after >= reserve * 0.55;
    }
    if (space.type === "utility" && countType(p, "utility") >= 1 && level === "hard") {
      return after >= reserve * 0.6;
    }
    if (level === "easy") {
      return after >= 80 && Math.random() > 0.12;
    }
    return after >= reserve;
  }

  function cpuUnmortgageOnce(p) {
    const level = AI.level(p.level);
    const cost = (item) => Math.ceil((item.space.price || 0) * 0.55);
    const candidates = ownedList(p)
      .filter((item) => item.rec.mortgaged && p.money >= cost(item) + cpuReserve(level) * 2)
      .sort((a, b) => cost(a) - cost(b));
    if (!candidates.length) return false;
    unmortgage(candidates[0].idx);
    return true;
  }

  function cpuBuildOnce(p) {
    const level = AI.level(p.level);
    const cap = level === "easy" ? 1 : level === "hard" ? 3 : 2;
    if (cpuBuildCount >= cap) return false;
    const reserve = cpuReserve(level);
    const bankOk = (rec) => (rec.houses === 4 ? (state.bank ? state.bank.hotels : 0) > 0 : (state.bank ? state.bank.houses : 0) > 0);
    const candidates = ownedList(p).filter(({ idx, rec }) =>
      rec && spaceCanBuild(rec, idx) && bankOk(rec) && p.money - (SPACES[idx].house || 0) >= reserve
    );
    if (!candidates.length) return false;
    // يفضّل إكمال الفنادق ثم المجموعات ذات الإيجار الأعلى، مع بناء متوازن.
    candidates.sort((a, b) => {
      if (b.rec.houses !== a.rec.houses) return b.rec.houses - a.rec.houses;
      const gainA = (a.space.rent[a.rec.houses + 1] || 0) - (a.space.rent[a.rec.houses] || 0);
      const gainB = (b.space.rent[b.rec.houses + 1] || 0) - (b.space.rent[b.rec.houses] || 0);
      return gainB - gainA;
    });
    buildHouse(candidates[0].idx);
    cpuBuildCount++;
    return true;
  }

  /** فحص بناء لا يغيّر الحالة ولا يعرض رسائل. */
  function spaceCanBuild(rec, idx) {
    const space = SPACES[idx];
    if (!space || !space.group || !rec || rec.owner == null || rec.mortgaged || rec.houses >= 5) return false;
    const owner = state.players[rec.owner];
    if (!owner || !ownsGroup(owner, space.group)) return false;
    const group = groupSpaces(space.group).map((g) => state.props[g.idx]).filter(Boolean);
    if (group.some((g) => g.mortgaged)) return false;
    return rec.houses === Math.min(...group.map((g) => g.houses || 0));
  }

  function syncCpu() {
    if (!aiRunner) return;
    aiRunner.clear();
    if (!state || state.over) return;
    const seat = cur();
    if (!seat || !AI.isCpu(seat)) return;
    if (!AI.autoAllowed(apiRef, seat)) return;
    const wait = AI.delay(seat.level, 1.15);

    if (state.phase === "roll") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "roll") return;
        const p = cur();
        if (!p || p.bankrupt) { endTurn(); return; }
        if (p.inJail) {
          if (p.jailCards > 0) { useJailCard(); return; }
          const level = AI.level(p.level);
          if (level === "hard" && p.money > 350) { payJail(); return; }
          if (level !== "easy" && p.money > 600 && p.jailTurns >= 1) { payJail(); return; }
        }
        onRoll();
      }, wait);
      return;
    }

    if (state.phase === "buy") {
      const idx = state.pendingBuy;
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "buy" || state.pendingBuy !== idx) return;
        if (cpuShouldBuy(cur(), idx)) buyProperty();
        else skipBuy();
      }, wait);
      return;
    }

    if (state.phase === "end") {
      aiRunner.later(() => {
        if (!state || state.over || state.phase !== "end") return;
        const p = cur();
        if (!p || p.bankrupt) { endTurn(); return; }
        if (cpuUnmortgageOnce(p)) return;
        if (cpuBuildOnce(p)) return;
        endTurn();
      }, wait);
    }
  }

  function render() {
    if (!rootRef || !state) return;
    const wrap = document.createElement("div");
    wrap.className = "mono-layout";
    const boardWrap = document.createElement("div");
    boardWrap.className = "mono-board-wrap";
    const boardHead = document.createElement("div");
    boardHead.className = "board-head";
    boardHead.innerHTML =
      '<span class="board-head-icon"><svg class="ic" aria-hidden="true"><use href="#g-monopoly"/></svg></span>' +
      '<div class="board-head-copy"><span class="board-head-kicker">لوحة المدينة</span><strong>مونوبولي</strong></div>' +
      '<div class="mono-turn-chip"><span>الدور</span><strong>' + U.escape(cur() ? cur().name : "—") + "</strong></div>" +
      '<span class="board-head-hint">اضغط أي مربع لعرض عقد الملكية</span>';
    boardWrap.appendChild(boardHead);
    boardWrap.appendChild(drawBoard());
    wrap.appendChild(boardWrap);

    boardWrap.addEventListener("click", (e) => {
      const cell = e.target.closest(".mcell");
      if (!cell) return;
      const idx = Number(cell.dataset.space);
      if (Number.isNaN(idx)) return;
      e.stopPropagation();
      e.preventDefault();
      showPropertyDetails(idx);
    }, true);

    const sideBox = document.createElement("div");
    sideBox.className = "mono-side-holder";
    sideBox.innerHTML = sideHTML();
    wrap.appendChild(sideBox.firstElementChild || sideBox);

    rootRef.innerHTML = "";
    rootRef.appendChild(wrap);
    animateBoardTokens(wrap);

    if (apiRef && !state.over) apiRef.setStatus("دور " + AI.statusName(cur()), "live");

    wrap.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state || state.over) return;
        const act = btn.dataset.act;
        if (act === "toggleManage") { state.showManage = !state.showManage; render(); return; }
        if (!canActNow()) return;
        if (act === "roll") onRoll();
        else if (act === "endTurn") endTurn();
        else if (act === "buy") buyProperty();
        else if (act === "skipBuy") skipBuy();
        else if (act === "payJail") payJail();
        else if (act === "useJailCard") useJailCard();
        else if (act === "trade") openTrade();
      });
    });
    wrap.querySelectorAll("[data-prop]").forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        showPropertyDetails(Number(chip.dataset.prop));
      });
    });
    wrap.querySelectorAll("[data-build]").forEach((btn) => btn.addEventListener("click", () => {
      if (canActNow()) buildHouse(Number(btn.dataset.build));
    }));
    wrap.querySelectorAll("[data-sell]").forEach((btn) => btn.addEventListener("click", () => {
      if (canActNow()) sellHouse(Number(btn.dataset.sell));
    }));
    wrap.querySelectorAll("[data-mortgage]").forEach((btn) => btn.addEventListener("click", () => {
      if (canActNow()) mortgage(Number(btn.dataset.mortgage));
    }));
    wrap.querySelectorAll("[data-unmortgage]").forEach((btn) => btn.addEventListener("click", () => {
      if (canActNow()) unmortgage(Number(btn.dataset.unmortgage));
    }));
    syncCpu();
  }

  BG.register(game);
})();
