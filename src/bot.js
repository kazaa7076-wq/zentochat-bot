require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const { botToken, adminId, botUsername, keepAlive } = require("./config");
const {
  getUser,
  addUser,
  updateUser,
  setVip,
  addCoins,
  addReport,
  blockUser,
  createTicket,
  getTicket,
  closeTicket,
  getStatsSummary,
  setReferredBy
} = require("./database/db");

const {
  isInQueue,
  removeFromQueue,
  isInChat,
  getPartner,
  startChat,
  endChat,
  queueUser,
  findBestPartner,
  nextChat,
  getQueueCount,
  getActiveCount
} = require("./services/matchService");

const {
  claimDailyReward,
  buyBoost,
  buyVipWithCoins,
  referralInfo,
  giveReferralReward,
  walletInfo
} = require("./services/monetizationService");

const {
  mainKeyboard,
  genderKeyboard,
  preferenceKeyboard,
  vipKeyboard
} = require("./ui/keyboards");

if (!botToken) {
  console.error("❌ BOT_TOKEN تنظیم نشده");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const app = express();

const userState = {};
const supportState = {};
const reportState = {};

function isAdmin(ctx) {
  return String(ctx.from.id) === String(adminId);
}

function normalizePreference(text) {
  if (text === "فقط مرد") return "مرد";
  if (text === "فقط زن") return "زن";
  if (text === "فقط سایر") return "سایر";
  return "all";
}

function profileText(user) {
  const vip = user.vipUntil > Date.now() ? "فعال" : "غیرفعال";
  return [
    "👤 پروفایل شما",
    `اسم: ${user.name || "-"}`,
    `سن: ${user.age || "-"}`,
    `جنسیت: ${user.gender || "-"}`,
    `ترجیح چت: ${user.preference === "all" ? "همه" : user.preference}`,
    `سکه: ${user.coins || 0}`,
    `VIP: ${vip}`
  ].join("\n");
}

async function safeSend(chatId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (_) {}
}

async function connectUser(ctx, userId) {
  const partnerId = findBestPartner(userId);

  if (!partnerId) {
    queueUser(userId);
    return ctx.reply(
      `🔎 در صف جستجو قرار گرفتی...\n\n👥 کاربران در صف: ${getQueueCount()}`,
      mainKeyboard()
    );
  }

  removeFromQueue(partnerId);
  startChat(userId, partnerId);

  await safeSend(
    userId,
    "✅ به یک کاربر ناشناس وصل شدی.\nمی‌تونی پیام، عکس، ویس و... بفرستی.",
    mainKeyboard()
  );

  await safeSend(
    partnerId,
    "✅ یک کاربر ناشناس بهت وصل شد.\nچت شروع شد.",
    mainKeyboard()
  );
}

// ---------- START ----------
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.startPayload || "";
  const existing = getUser(userId);

  if (!existing) {
    userState[userId] = { step: "name" };

    // referral
    if (text.startsWith("ref_")) {
      const inviterId = text.replace("ref_", "").trim();
      userState[userId].referrer = inviterId;
    }

    return ctx.reply(
      "👋 به ZentoChat PRO MAX خوش اومدی\n\nاسم خودتو بفرست:",
      mainKeyboard()
    );
  }

  return ctx.reply(
    `👋 خوش برگشتی ${existing.name || ""}\n\n${profileText(existing)}`,
    mainKeyboard()
  );
});

// ---------- TEXT ROUTER ----------
bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  // ===== ADMIN COMMANDS =====
  if (text.startsWith("/stats") && isAdmin(ctx)) {
    const s = getStatsSummary();
    return ctx.reply(
      [
        "📊 آمار ربات",
        `👥 کل کاربران: ${s.totalUsers}`,
        `💎 VIP ها: ${s.vipUsers}`,
        `⚡ بوست فعال: ${s.boostedUsers}`,
        `🪙 مجموع سکه‌ها: ${s.totalCoins}`,
        `🔎 در صف: ${getQueueCount()}`,
        `💬 چت‌های فعال: ${getActiveCount()}`
      ].join("\n")
    );
  }

  if (text.startsWith("/givecoins") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const target = parts[1];
    const amount = Number(parts[2] || 0);

    if (!target || !amount) {
      return ctx.reply("فرمت: /givecoins USER_ID AMOUNT");
    }

    addCoins(target, amount);
    return ctx.reply(`✅ ${amount} سکه به ${target} داده شد.`);
  }

  if (text.startsWith("/givevip") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const target = parts[1];
    const days = Number(parts[2] || 0);

    if (!target || !days) {
      return ctx.reply("فرمت: /givevip USER_ID DAYS");
    }

    setVip(target, days);
    return ctx.reply(`✅ VIP ${days} روزه برای ${target} فعال شد.`);
  }

  if (text.startsWith("/answer") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const ticketId = parts[1];
    const message = parts.slice(2).join(" ").trim();

    if (!ticketId || !message) {
      return ctx.reply("فرمت: /answer TICKET_ID پیام");
    }

    const ticket = getTicket(ticketId);
    if (!ticket) return ctx.reply("❌ تیکت پیدا نشد");

    await safeSend(ticket.userId, `📩 پاسخ پشتیبانی:\n\n${message}`);
    closeTicket(ticketId);

    return ctx.reply("✅ پاسخ ارسال شد.");
  }

  // ===== REGISTER FLOW =====
  if (userState[userId]) {
    const state = userState[userId];

    if (state.step === "name") {
      state.name = text.trim();
      state.step = "age";
      return ctx.reply("🎂 سنت رو بفرست:");
    }

    if (state.step === "age") {
      state.age = text.trim();
      state.step = "gender";
      return ctx.reply("👤 جنسیتت رو انتخاب کن:", genderKeyboard());
    }

    if (state.step === "gender") {
      const gender = text.trim();

      addUser(userId, {
        name: state.name,
        age: state.age,
        gender,
        preference: "all"
      });

      if (state.referrer) {
        const ok = setReferredBy(userId, state.referrer);
        if (ok) {
          giveReferralReward(state.referrer, userId);
        }
      }

      delete userState[userId];

      return ctx.reply(
        "✅ ثبت‌نام کامل شد.\nاز منوی پایین می‌تونی چت رو شروع کنی.",
        mainKeyboard()
      );
    }
  }

  // ===== SUPPORT FLOW =====
  if (supportState[userId]) {
    const ticketId = createTicket(userId, text);
    delete supportState[userId];

    await safeSend(
      adminId,
      `📩 تیکت جدید\n\nTicket: ${ticketId}\nUser: ${userId}\nMessage: ${text}`
    );

    return ctx.reply("✅ پیام پشتیبانی‌ات ارسال شد.", mainKeyboard());
  }

  // ===== REPORT FLOW =====
  if (reportState[userId]) {
    const partnerId = getPartner(userId);
    if (partnerId) {
      addReport(userId, partnerId, text);
    }
    delete reportState[userId];
    return ctx.reply("🚨 گزارش ثبت شد. ممنون.", mainKeyboard());
  }

  // ===== MAIN MENU ACTIONS =====
  const user = getUser(userId);

  if (!user) {
    return ctx.reply("اول /start بزن و ثبت‌نام کن.");
  }

  if (text === "🔍 شروع جستجو") {
    if (isInChat(userId)) {
      return ctx.reply("💬 الان داخل چت هستی. برای نفر بعدی «⏭ کاربر بعدی» را بزن.");
    }

    if (isInQueue(userId)) {
      return ctx.reply("🔎 همین الان داخل صف جستجو هستی...");
    }

    return connectUser(ctx, userId);
  }

  if (text === "⏭ کاربر بعدی") {
    if (isInQueue(userId)) {
      return ctx.reply("🔎 هنوز در صف جستجو هستی...");
    }

    if (isInChat(userId)) {
      const oldPartner = nextChat(userId);
      if (oldPartner) {
        await safeSend(oldPartner, "⏭ طرف مقابل به چت بعدی رفت.");
      }
      return connectUser(ctx, userId);
    }

    return connectUser(ctx, userId);
  }

  if (text === "❌ پایان چت") {
    removeFromQueue(userId);

    if (!isInChat(userId)) {
      return ctx.reply("❌ الان داخل چتی نیستی.", mainKeyboard());
    }

    const partner = endChat(userId);
    await ctx.reply("❌ چت پایان یافت.", mainKeyboard());

    if (partner) {
      await safeSend(partner, "❌ طرف مقابل چت را پایان داد.", mainKeyboard());
    }
    return;
  }

  if (text === "🚨 گزارش کاربر") {
    if (!isInChat(userId)) {
      return ctx.reply("❌ اول باید داخل چت باشی.");
    }

    reportState[userId] = true;
    return ctx.reply("علت گزارش را در یک پیام بنویس:");
  }

  if (text === "💰 کیف پول") {
    const wallet = walletInfo(userId);
    return ctx.reply(
      [
        "💰 کیف پول شما",
        `🪙 موجودی: ${wallet.coins} سکه`,
        "",
        "قیمت‌ها:",
        "⚡ بوست 10 دقیقه: 25 سکه",
        "💎 VIP 7 روزه: 150 سکه",
        "💎 VIP 30 روزه: 500 سکه"
      ].join("\n"),
      mainKeyboard()
    );
  }

  if (text === "🎁 جایزه روزانه") {
    const result = claimDailyReward(userId);
    return ctx.reply(result.message, mainKeyboard());
  }

  if (text === "⚡ بوست") {
    const result = buyBoost(userId);
    return ctx.reply(result.message, mainKeyboard());
  }

  if (text === "💎 VIP") {
    return ctx.reply(
      [
        "💎 بخش VIP",
        "با VIP می‌تونی سریع‌تر مچ بشی و تجربه بهتری داشته باشی.",
        "",
        "انتخاب کن:"
      ].join("\n"),
      vipKeyboard()
    );
  }

  if (text === "💎 خرید VIP 7 روزه") {
    const result = buyVipWithCoins(userId, 7);
    return ctx.reply(result.message, mainKeyboard());
  }

  if (text === "💎 خرید VIP 30 روزه") {
    const result = buyVipWithCoins(userId, 30);
    return ctx.reply(result.message, mainKeyboard());
  }

  if (text === "👤 پروفایل") {
    return ctx.reply(profileText(user), mainKeyboard());
  }

  if (text === "🎯 ترجیح چت") {
    return ctx.reply("ترجیح چتت را انتخاب کن:", preferenceKeyboard());
  }

  if (
    text === "همه" ||
    text === "فقط مرد" ||
    text === "فقط زن" ||
    text === "فقط سایر"
  ) {
    const pref = normalizePreference(text);
    updateUser(userId, { preference: pref });
    return ctx.reply("✅ ترجیح چت ذخیره شد.", mainKeyboard());
  }

  if (text === "👥 دعوت دوستان") {
    const ref = referralInfo(userId);
    const link = `https://t.me/${botUsername}?start=ref_${userId}`;

    return ctx.reply(
      [
        "👥 دعوت دوستان",
        "لینک دعوتت:",
        link,
        "",
        `👤 تعداد دعوت‌های موفق: ${ref.count}`,
        "🎁 پاداش: برای هر دعوت موفق، تو 50 سکه و دوستت 20 سکه می‌گیرید."
      ].join("\n"),
      mainKeyboard()
    );
  }

  if (text === "📩 پشتیبانی") {
    supportState[userId] = true;
    return ctx.reply("پیامت برای پشتیبانی را در یک پیام بفرست:");
  }

  if (text === "🔙 بازگشت") {
    return ctx.reply("برگشتی به منوی اصلی.", mainKeyboard());
  }

  // ===== RELAY TO PARTNER =====
  if (isInChat(userId)) {
    const partner = getPartner(userId);
    if (partner) {
      return safeSend(partner, `💬 ناشناس:\n${text}`);
    }
  }

  return next();
});

// ---------- MEDIA RELAY ----------
bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const caption = ctx.message.caption || "";

  try {
    await bot.telegram.sendPhoto(partner, photo, {
      caption: caption ? `📷 ناشناس:\n${caption}` : "📷 ناشناس"
    });
  } catch (_) {}
});

bot.on("voice", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendVoice(partner, ctx.message.voice.file_id, {
      caption: "🎤 ویس ناشناس"
    });
  } catch (_) {}
});

bot.on("video", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendVideo(partner, ctx.message.video.file_id, {
      caption: "🎬 ویدیو ناشناس"
    });
  } catch (_) {}
});

bot.on("sticker", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendSticker(partner, ctx.message.sticker.file_id);
  } catch (_) {}
});

bot.on("document", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendDocument(partner, ctx.message.document.file_id, {
      caption: "📎 فایل ناشناس"
    });
  } catch (_) {}
});

bot.on("audio", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendAudio(partner, ctx.message.audio.file_id, {
      caption: "🎵 فایل صوتی ناشناس"
    });
  } catch (_) {}
});

// ---------- SERVER ----------
app.get("/", (req, res) => {
  res.send("ZentoChat PRO MAX is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});

bot.catch((err) => {
  console.error("Bot Error:", err);
});

bot.launch()
  .then(() => {
    console.log("🔥 ZentoChat PRO MAX RUNNING");
  })
  .catch((err) => {
    console.error("Launch Error:", err);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));