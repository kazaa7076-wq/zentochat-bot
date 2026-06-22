const { Markup } = require("telegraf");

function mainKeyboard() {
  return Markup.keyboard([
    ["🔍 شروع جستجو", "⏭ کاربر بعدی"],
    ["❌ پایان چت", "🚨 گزارش کاربر"],
    ["👤 پروفایل", "🎯 ترجیح چت"],
    ["💰 کیف پول", "🎁 جایزه روزانه"],
    ["⚡ بوست", "💎 VIP"],
    ["👥 دعوت دوستان", "📩 پشتیبانی"]
  ]).resize();
}

function genderKeyboard() {
  return Markup.keyboard([
    ["مرد", "زن", "سایر"]
  ]).resize();
}

function preferenceKeyboard() {
  return Markup.keyboard([
    ["همه"],
    ["فقط مرد", "فقط زن", "فقط سایر"],
    ["🔙 بازگشت"]
  ]).resize();
}

function vipKeyboard() {
  return Markup.keyboard([
    ["💎 خرید VIP 7 روزه"],
    ["💎 خرید VIP 30 روزه"],
    ["🔙 بازگشت"]
  ]).resize();
}

module.exports = {
  mainKeyboard,
  genderKeyboard,
  preferenceKeyboard,
  vipKeyboard
};