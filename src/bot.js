require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const { botToken } = require("./config");

const {
  getUser,
  addUser,
  updateUser
} = require("./database/db");

const {
  queueUser,
  removeFromQueue,
  isInQueue,
  isInChat,
  getPartner,
  startChat,
  endChat,
  findBestPartner
} = require("./services/matchService");

const {
  mainKeyboard,
  genderKeyboard
} = require("./ui/keyboards");

if (!botToken) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const app = express();

app.get("/", (req, res) => {
  res.send("BOT IS RUNNING");
});

// ===== MEMORY STATE =====
const userState = {};

// ===== SAFE SEND =====
async function safeSend(chatId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (e) {}
}

// ===== CONNECT LOGIC =====
async function connectUser(ctx, userId) {
  const partnerId = findBestPartner(userId, getUser);

  if (!partnerId) {
    queueUser(userId);
    return ctx.reply("🔎 در حال جستجو...", mainKeyboard());
  }

  removeFromQueue(partnerId);
  startChat(userId, partnerId);

  const me = getUser(userId);
  const p = getUser(partnerId);

  await safeSend(
    userId,
    `✅ وصل شدی\n\n👤 طرف مقابل:\n${p.name}\n${p.age}\n${p.gender}\n${p.bio || "-"}`,
    mainKeyboard()
  );

  await safeSend(
    partnerId,
    `✅ وصل شدی\n\n👤 طرف مقابل:\n${me.name}\n${me.age}\n${me.gender}\n${me.bio || "-"}`,
    mainKeyboard()
  );
}

// ===== START =====
bot.start(async (ctx) => {
  const id = ctx.from.id;

  if (!getUser(id)) {
    userState[id] = { step: "name" };
    return ctx.reply("اسم خودتو بفرست:");
  }

  return ctx.reply("خوش برگشتی 👋", mainKeyboard());
});

// ===== TEXT HANDLER =====
bot.on("text", async (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  // ===== REGISTER FLOW =====
  if (userState[id]) {
    const s = userState[id];

    if (s.step === "name") {
      s.name = text;
      s.step = "age";
      return ctx.reply("سن؟");
    }

    if (s.step === "age") {
      s.age = text;
      s.step = "bio";
      return ctx.reply("بیو بنویس:");
    }

    if (s.step === "bio") {
      s.bio = text;
      s.step = "gender";
      return ctx.reply("جنسیت:", genderKeyboard());
    }

    if (s.step === "gender") {
      addUser(id, {
        name: s.name,
        age: s.age,
        bio: s.bio,
        gender: text,
        preference: "all"
      });

      delete userState[id];

      return ctx.reply("ثبت‌نام انجام شد ✅", mainKeyboard());
    }
  }

  // ===== MENU =====
  if (text === "🔍 شروع") {
    return connectUser(ctx, id);
  }

  if (isInChat(id)) {
    const p = getPartner(id);
    return safeSend(p, `💬 ${text}`);
  }
});

// ===== EXPRESS KEEP ALIVE =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🌐 Server running on", PORT);
});

// ===== BOT START (IMPORTANT FIX) =====
(async () => {
  try {
    await bot.launch({
      dropPendingUpdates: true
    });
    console.log("🤖 BOT RUNNING ON RENDER");
  } catch (err) {
    console.error("BOT LAUNCH ERROR:", err.message);
  }
})();

// ===== SAFE STOP =====
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));