const { Markup } = require("telegraf");
const { addUser } = require("../database/db");
const { mainKeyboard } = require("../keyboards/main");

async function startHandler(ctx) {
  const userId = ctx.from.id;

  addUser(userId);

  const welcomeMessage = `╔════════════════════╗
   💬  ZentoChat VIP
╚════════════════════╝

🌙 Anonymous. Private. Random.
🔒 ناشناس • امن • تصادفی

━━━━━━━━━━━━━━━━━━
🇮🇷 **به ZentoChat خوش اومدی**
اینجا می‌تونی بدون نمایش شماره، آیدی یا اطلاعات شخصی،
به‌صورت کاملاً ناشناس با افراد تصادفی چت کنی.

🎯 امکانات:
• چت ناشناس تصادفی
• کاربر بعدی
• پایان چت
• گزارش کاربر
• ارسال عکس، ویدیو، ویس، فایل و استیکر

📌 قوانین کوتاه:
• ارسال محتوای آزاردهنده ممنوع
• مزاحمت و اسپم ممنوع
• در صورت تخلف، امکان گزارش وجود دارد

━━━━━━━━━━━━━━━━━━
🇬🇧 **Welcome to ZentoChat**
Chat completely anonymously with random users.
No phone number, username or personal information will be shown.

🎯 Features:
• Random anonymous chat
• Next partner
• End chat
• Report abusive users
• Send photos, videos, voice, files and stickers

📌 Quick Rules:
• No harassment or abusive content
• No spam or repeated disturbing messages
• Users can report inappropriate behavior

━━━━━━━━━━━━━━━━━━
⚡ برای شروع از دکمه‌های پایین استفاده کن
⚡ Use the buttons below to start chatting`;

  const inlineKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("📘 راهنما / Guide", "help_menu"),
      Markup.button.callback("ℹ️ درباره ربات / About", "about_bot")
    ]
  ]);

  await ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
    ...mainKeyboard
  });

  await ctx.reply(
    "👇 یکی از گزینه‌های زیر را انتخاب کن / Choose an option below:",
    inlineKeyboard
  );
}

async function helpMenuHandler(ctx) {
  const helpText = `📘 **راهنمای ZentoChat**

🇮🇷 **فارسی**
🔍 شروع جستجو → پیدا کردن یک کاربر ناشناس
⏭ کاربر بعدی → ترک چت فعلی و رفتن به نفر جدید
❌ پایان چت → بستن گفت‌وگو
🚨 گزارش کاربر → گزارش طرف مقابل در صورت مزاحمت

📎 رسانه‌های پشتیبانی‌شده:
• متن
• عکس
• ویدیو
• ویس
• فایل
• استیکر

🇬🇧 **English**
🔍 Start Search → Find a random anonymous user
⏭ Next User → Leave current chat and find another user
❌ End Chat → Close the conversation
🚨 Report User → Report abusive users

📎 Supported media:
• Text
• Photos
• Videos
• Voice messages
• Files
• Stickers`;

  await ctx.answerCbQuery();
  await ctx.reply(helpText, { parse_mode: "Markdown" });
}

async function aboutBotHandler(ctx) {
  const aboutText = `ℹ️ **About ZentoChat**

🇮🇷
ZentoChat یک ربات چت ناشناس است که به شما اجازه می‌دهد
بدون نمایش اطلاعات شخصی، با کاربران تصادفی گفتگو کنید.

هدف این ربات:
• تجربه چت ناشناس ساده و سریع
• حفظ حریم خصوصی
• ارتباط بدون نمایش هویت

🇬🇧
ZentoChat is an anonymous Telegram chat bot that lets you
talk to random people without sharing your identity.

Purpose:
• Simple anonymous chat
• Privacy-focused experience
• Fast random connections`;

  await ctx.answerCbQuery();
  await ctx.reply(aboutText, { parse_mode: "Markdown" });
}

module.exports = {
  startHandler,
  helpMenuHandler,
  aboutBotHandler
};