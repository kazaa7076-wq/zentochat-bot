const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["🔍 شروع جستجو"],
  ["⏭ کاربر بعدی"],
  ["❌ پایان چت"],
  ["🚨 گزارش کاربر"]
]).resize();

module.exports = {
  mainKeyboard
};