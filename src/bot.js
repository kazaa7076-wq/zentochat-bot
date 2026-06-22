require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const botToken = process.env.BOT_TOKEN;

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
  console.error("❌ BOT_TOKEN تنظیم نشده");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const app = express();

/* =========================
   Middleware
========================= */
bot.use(rateLimit(20, 10000));

/* =========================
   Start + Actions
========================= */
bot.start(startHandler);
bot.action("help_menu", helpMenuHandler);
bot.action("about_bot", aboutBotHandler);

/* =========================
   Buttons
========================= */
bot.hears("🔍 شروع جستجو", startSearch);
bot.hears("⏭ کاربر بعدی", nextPartner);
bot.hears("❌ پایان چت", endChat);
bot.hears("🚨 گزارش کاربر", reportUser);

/* =========================
   Admin
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
   Relay Messages
========================= */
bot.on("text", relayText);
bot.on("photo", relayPhoto);
bot.on("video", relayVideo);
bot.on("voice", relayVoice);
bot.on("document", relayDocument);
bot.on("sticker", relaySticker);
bot.on("audio", relayAudio);

/* =========================
   Health check
========================= */
app.get("/", (req, res) => {
  res.send("ZentoChat is running");
});

/* =========================
   Error handling
========================= */
bot.catch((err) => {
  console.error("Bot Error:", err);
});

/* =========================
   Start Server (FIXED)
========================= */
const PORT = process.env.PORT || 3000;

async function startBot() {
  try {
    const webhookPath = `/bot${bot.secretPathComponent()}`;

    const baseUrl =
      process.env.RENDER_EXTERNAL_URL || `https://localhost:${PORT}`;

    const webhookUrl = `${baseUrl}${webhookPath}`;

    app.use(bot.webhookCallback(webhookPath));

    app.listen(PORT, async () => {
      console.log(`🌐 Server running on port ${PORT}`);
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`🔗 Webhook set: ${webhookUrl}`);
      console.log("🚀 Bot started successfully");
    });
  } catch (err) {
    console.error("❌ Failed to start bot:", err);
  }
}

startBot();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));