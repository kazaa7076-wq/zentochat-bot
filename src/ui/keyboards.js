const { Markup } = require("telegraf");

// ================= MAIN KEYBOARD =================
function mainKeyboard() {
  return Markup.keyboard([
    ["🔍 شروع جستجو", "⏭ کاربر بعدی"],
    ["❌ پایان چت", "🚨 گزارش کاربر"],
    ["👤 پروفایل", "📝 تنظیم بیو"],
    ["🖼 تنظیم عکس پروفایل", "🎯 ترجیح چت"],
    ["💰 کیف پول", "🎁 جایزه روزانه"],
    ["⚡ بوست", "💎 VIP"],
    ["👥 دعوت دوستان", "📩 پشتیبانی"],
    ["🔙 بازگشت"]
  ])
    .resize()
    .persistent();
}

// ================= GENDER KEYBOARD =================
function genderKeyboard() {
  return Markup.keyboard([
    ["مرد", "زن", "سایر"]
  ])
    .resize()
    .oneTime();
}

// ================= PREFERENCE KEYBOARD =================
function preferenceKeyboard() {
  return Markup.keyboard([
    ["همه"],
    ["فقط مرد", "فقط زن", "فقط سایر"],
    ["🔙 بازگشت"]
  ])
    .resize();
}

// ================= VIP KEYBOARD =================
function vipKeyboard() {
  return Markup.keyboard([
    ["💎 خرید VIP 7 روزه", "💎 خرید VIP 30 روزه"],
    ["🔙 بازگشت"]
  ])
    .resize();
}

module.exports = {
  mainKeyboard,
  genderKeyboard,
  preferenceKeyboard,
  vipKeyboard
};