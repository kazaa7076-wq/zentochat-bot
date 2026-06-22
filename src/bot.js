require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const { botToken } = require("./config");

const { rateLimit } = require("./middlewares/rateLimit");

const {
  startHandler,
  helpMenuHandler,
  aboutBotHandler
} = require("./handlers/start");

const {
  startSearch,
  nextPartner,
  endChat,
  reportUser,
  relayText,
  relayPhoto,
  relayVideo,
  relayVoice,
  relayDocument,
  relaySticker,
  relayAudio
} = require("./handlers/chat");

const {
  adminStats,
  adminReports,
  broadcastMessage
} = require("./handlers/admin");

require("./database/db");

if (!botToken) {
  console.error("❌ BOT_TOKEN داخل فایل .env یا Render تنظیم نشده");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const app = express();

/* =========================
   Middleware
========================= */
bot.use(rateLimit(20, 10000));

/* =========================
   Start + VIP Inline Actions
========================= */
bot.start(startHandler);
bot.action("help_menu", helpMenuHandler);
bot.action("about_bot", aboutBotHandler);

/* =========================
   Main Buttons
========================= */
bot.hears("🔍 شروع جستجو", startSearch);
bot.hears("⏭ کاربر بعدی", nextPartner);
bot.hears("❌ پایان چت", endChat);
bot.hears("🚨 گزارش کاربر", reportUser);

/* =========================
   Admin Commands
========================= */
bot.command("stats", adminStats);
bot.command("reports", adminReports);

bot.on("text", async (ctx, next) => {
  if (ctx.message.text.startsWith("/broadcast ")) {
    return broadcastMessage(ctx);
  }
  return next();
});

/* =========================
   Chat Relays
========================= */
bot.on("text", relayText);
bot.on("photo", relayPhoto);
bot.on("video", relayVideo);
bot.on("voice", relayVoice);
bot.on("document", relayDocument);
bot.on("sticker", relaySticker);
bot.on("audio", relayAudio);

/* =========================
   Health Route
========================= */
app.get("/", (req, res) => {
  res.send("ZentoChat is running");
});

/* =========================
   Error Handling
========================= */
bot.catch((err) => {
  console.error("Bot Error:", err);
});

/* =========================
   Start Server + Webhook (Render)
========================= */
const PORT = process.env.PORT || 3000;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

async function startBot() {
  try {
    if (!RENDER_EXTERNAL_URL) {
      console.error("❌ RENDER_EXTERNAL_URL در Render موجود نیست");
      process.exit(1);
    }

    const webhookPath = `/bot${bot.secretPathComponent()}`;
    const webhookUrl = `${RENDER_EXTERNAL_URL}${webhookPath}`;

    app.use(bot.webhookCallback(webhookPath));

    app.listen(PORT, async () => {
      console.log(`🌐 Server listening on port ${PORT}`);
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`🔗 Webhook set to: ${webhookUrl}`);
      console.log("🚀 ZentoChat Bot Started on Render");
    });
  } catch (err) {
    console.error("❌ Failed to start bot:", err);
  }
}

startBot();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));