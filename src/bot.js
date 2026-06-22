require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const { botToken, adminId, botUsername } = require("./config");
const {
  getUser,
  addUser,
  updateUser,
  setVip,
  addCoins,
  addReport,
  blockUser,
  unblockUser,
  createTicket,
  getTicket,
  getOpenTickets,
  closeTicket,
  getStatsSummary,
  setReferredBy,
  getReports,
  createPayment,
  getPayments,
  approvePayment,
  rejectPayment
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
const paymentState = {};

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
  const vip = Number(user.vipUntil || 0) > Date.now() ? "فعال" : "غیرفعال";
  const boost = Number(user.boostUntil || 0) > Date.now() ? "فعال" : "غیرفعال";

  return [
    "👤 پروفایل شما",
    `🆔 آیدی: ${user.id}`,
    `اسم: ${user.name || "-"}`,
    `سن: ${user.age || "-"}`,
    `جنسیت: ${user.gender || "-"}`,
    `ترجیح چت: ${user.preference === "all" ? "همه" : user.preference}`,
    `سکه: ${user.coins || 0}`,
    `VIP: ${vip}`,
    `Boost: ${boost}`,
    `دعوت موفق: ${user.referralsCount || 0}`
  ].join("\n");
}

async function safeSend(chatId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (e) {
    console.error("safeSend error:", e.message);
  }
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
    "✅ به یک کاربر ناشناس وصل شدی.\nمی‌تونی پیام، عکس، ویس، ویدیو و فایل بفرستی.",
    mainKeyboard()
  );

  await safeSend(
    partnerId,
    "✅ یک کاربر ناشناس بهت وصل شد.\nچت شروع شد.",
    mainKeyboard()
  );
}

async function adminHelp(ctx) {
  return ctx.reply(
    [
      "🛠 پنل ادمین",
      "/stats → آمار کلی",
      "/reports → لیست گزارش‌ها",
      "/tickets → لیست تیکت‌های باز",
      "/payments → لیست درخواست‌های پرداخت",
      "/givecoins USER_ID AMOUNT",
      "/givevip USER_ID DAYS",
      "/block USER_ID دلیل",
      "/unblock USER_ID",
      "/answer TICKET_ID پیام",
      "/approvepay PAYMENT_ID",
      "/rejectpay PAYMENT_ID"
    ].join("\n")
  );
}

// ---------- START ----------
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const payload = ctx.startPayload || "";
  const existing = getUser(userId);

  if (!existing) {
    userState[userId] = { step: "name" };

    if (payload.startsWith("ref_")) {
      const inviterId = payload.replace("ref_", "").trim();
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
  const text = (ctx.message.text || "").trim();

  // =========================
  // ADMIN COMMANDS
  // =========================
  if (text === "/admin" && isAdmin(ctx)) {
    return adminHelp(ctx);
  }

  if (text === "/stats" && isAdmin(ctx)) {
    const s = getStatsSummary();
    return ctx.reply(
      [
        "📊 آمار ربات",
        `👥 کل کاربران: ${s.totalUsers}`,
        `💎 VIP ها: ${s.vipUsers}`,
        `⚡ Boost فعال: ${s.boostedUsers}`,
        `🪙 مجموع سکه‌ها: ${s.totalCoins}`,
        `🚨 تعداد گزارش‌ها: ${s.totalReports}`,
        `🎫 تیکت باز: ${s.totalOpenTickets}`,
        `💳 کل پرداخت‌ها: ${s.totalPayments}`,
        `⏳ پرداخت‌های در انتظار: ${s.pendingPayments}`,
        `🔎 در صف: ${getQueueCount()}`,
        `💬 چت‌های فعال: ${getActiveCount()}`
      ].join("\n")
    );
  }

  if (text === "/reports" && isAdmin(ctx)) {
    const reports = getReports().slice(0, 15);
    if (!reports.length) return ctx.reply("گزارشی وجود ندارد.");

    const msg = reports.map((r, i) =>
      `${i + 1}) ${r.id}\nReporter: ${r.reporterId}\nTarget: ${r.targetId}\nReason: ${r.reason}\n`
    ).join("\n");

    return ctx.reply(`🚨 آخرین گزارش‌ها:\n\n${msg}`);
  }

  if (text === "/tickets" && isAdmin(ctx)) {
    const tickets = getOpenTickets().slice(0, 15);
    if (!tickets.length) return ctx.reply("تیکت بازی وجود ندارد.");

    const msg = tickets.map((t, i) =>
      `${i + 1}) ${t.id}\nUser: ${t.userId}\nMessage: ${t.message}\n`
    ).join("\n");

    return ctx.reply(`🎫 تیکت‌های باز:\n\n${msg}`);
  }

  if (text === "/payments" && isAdmin(ctx)) {
    const payments = getPayments("pending").slice(0, 15);
    if (!payments.length) return ctx.reply("درخواست پرداختی در انتظار نیست.");

    const msg = payments.map((p, i) =>
      `${i + 1}) ${p.id}\nUser: ${p.userId}\nType: ${p.type}\nAmount: ${p.amount}\nReceipt: ${p.meta?.receipt || "-"}\n`
    ).join("\n");

    return ctx.reply(`💳 پرداخت‌های در انتظار:\n\n${msg}`);
  }

  if (text.startsWith("/givecoins") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const target = parts[1];
    const amount = Number(parts[2] || 0);

    if (!target || !amount) {
      return ctx.reply("فرمت: /givecoins USER_ID AMOUNT");
    }

    addCoins(target, amount);
    await safeSend(target, `🪙 ${amount} سکه از طرف ادمین به حسابت اضافه شد.`);
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
    await safeSend(target, `💎 VIP ${days} روزه برایت توسط ادمین فعال شد.`);
    return ctx.reply(`✅ VIP ${days} روزه برای ${target} فعال شد.`);
  }

  if (text.startsWith("/block") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const target = parts[1];
    const reason = parts.slice(2).join(" ") || "بدون دلیل";

    if (!target) return ctx.reply("فرمت: /block USER_ID دلیل");

    blockUser(target, reason);
    await safeSend(target, `⛔️ حساب شما توسط ادمین مسدود شد.\nدلیل: ${reason}`);
    return ctx.reply(`⛔️ کاربر ${target} بلاک شد.`);
  }

  if (text.startsWith("/unblock") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const target = parts[1];

    if (!target) return ctx.reply("فرمت: /unblock USER_ID");

    unblockUser(target);
    await safeSend(target, "✅ محدودیت حساب شما برداشته شد.");
    return ctx.reply(`✅ کاربر ${target} آنبلاک شد.`);
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
    closeTicket(ticketId, message);

    return ctx.reply("✅ پاسخ ارسال شد.");
  }

  if (text.startsWith("/approvepay") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const paymentId = parts[1];
    if (!paymentId) return ctx.reply("فرمت: /approvepay PAYMENT_ID");

    const payment = approvePayment(paymentId);
    if (!payment) return ctx.reply("❌ پرداخت پیدا نشد.");

    await safeSend(
      payment.userId,
      `✅ پرداخت شما تایید شد.\nنوع: ${payment.type}\nVIP/سرویس شما فعال شد.`
    );

    return ctx.reply(`✅ پرداخت ${paymentId} تایید شد.`);
  }

  if (text.startsWith("/rejectpay") && isAdmin(ctx)) {
    const parts = text.split(" ");
    const paymentId = parts[1];
    if (!paymentId) return ctx.reply("فرمت: /rejectpay PAYMENT_ID");

    const payment = rejectPayment(paymentId);
    if (!payment) return ctx.reply("❌ پرداخت پیدا نشد.");

    await safeSend(
      payment.userId,
      `❌ پرداخت شما رد شد.\nاگر فکر می‌کنی اشتباهی شده به پشتیبانی پیام بده.`
    );

    return ctx.reply(`❌ پرداخت ${paymentId} رد شد.`);
  }

  // =========================
  // REGISTER FLOW
  // =========================
  if (userState[userId]) {
    const state = userState[userId];

    if (state.step === "name") {
      state.name = text;
      state.step = "age";
      return ctx.reply("🎂 سنت رو بفرست:");
    }

    if (state.step === "age") {
      state.age = text;
      state.step = "gender";
      return ctx.reply("👤 جنسیتت رو انتخاب کن:", genderKeyboard());
    }

    if (state.step === "gender") {
      const gender = text;

      const user = addUser(userId, {
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
        `✅ ثبت‌نام کامل شد.\n\n${profileText(user)}\n\nاز منوی پایین می‌تونی چت رو شروع کنی.`,
        mainKeyboard()
      );
    }
  }

  // =========================
  // SUPPORT FLOW
  // =========================
  if (supportState[userId]) {
    const ticketId = createTicket(userId, text);
    delete supportState[userId];

    await safeSend(
      adminId,
      `📩 تیکت جدید\n\nTicket: ${ticketId}\nUser: ${userId}\nMessage: ${text}`
    );

    return ctx.reply("✅ پیام پشتیبانی‌ات ارسال شد.", mainKeyboard());
  }

  // =========================
  // REPORT FLOW
  // =========================
  if (reportState[userId]) {
    const partnerId = getPartner(userId);
    if (partnerId) {
      addReport(userId, partnerId, text);
    }
    delete reportState[userId];
    return ctx.reply("🚨 گزارش ثبت شد. ممنون.", mainKeyboard());
  }

  // =========================
  // PAYMENT FLOW
  // =========================
  if (paymentState[userId]) {
    const state = paymentState[userId];

    const payment = createPayment(userId, state.type, state.amount, {
      receipt: text
    });

    delete paymentState[userId];

    await safeSend(
      adminId,
      [
        "💳 درخواست پرداخت جدید",
        `Payment ID: ${payment.id}`,
        `User: ${userId}`,
        `Type: ${payment.type}`,
        `Amount: ${payment.amount}`,
        `Receipt: ${text}`
      ].join("\n")
    );

    return ctx.reply(
      "✅ درخواست پرداخت ثبت شد.\nرسید/توضیح شما برای ادمین ارسال شد و بعد از تایید، VIP فعال می‌شود.",
      mainKeyboard()
    );
  }

  // =========================
  // MAIN MENU ACTIONS
  // =========================
  const user = getUser(userId);

  if (!user) {
    return ctx.reply("اول /start بزن و ثبت‌نام کن.");
  }

  if (user.blocked) {
    return ctx.reply(`⛔️ حساب شما محدود شده است.\nدلیل: ${user.blockedReason || "-"}`);
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
        "💎 VIP 30 روزه: 500 سکه",
        "",
        "برای خرید VIP با سکه از منوی VIP استفاده کن."
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
        "1) خرید VIP با سکه",
        "2) ثبت درخواست پرداخت دستی برای VIP",
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

  if (text === "💳 درخواست VIP 7 روزه") {
    paymentState[userId] = {
      type: "vip7",
      amount: 150
    };

    return ctx.reply(
      "رسید پرداخت یا توضیح پرداخت VIP 7 روزه را در یک پیام بفرست.\n(مثلاً شماره پیگیری یا توضیح کارت‌به‌کارت)",
      mainKeyboard()
    );
  }

  if (text === "💳 درخواست VIP 30 روزه") {
    paymentState[userId] = {
      type: "vip30",
      amount: 500
    };

    return ctx.reply(
      "رسید پرداخت یا توضیح پرداخت VIP 30 روزه را در یک پیام بفرست.\n(مثلاً شماره پیگیری یا توضیح کارت‌به‌کارت)",
      mainKeyboard()
    );
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
        `🎁 پاداش تو: ${ref.inviterReward} سکه`,
        `🎁 پاداش دوستت: ${ref.newUserReward} سکه`
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

  // =========================
  // RELAY TO PARTNER
  // =========================
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
  } catch (e) {
    console.error("photo relay error:", e.message);
  }
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
  } catch (e) {
    console.error("voice relay error:", e.message);
  }
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
  } catch (e) {
    console.error("video relay error:", e.message);
  }
});

bot.on("sticker", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendSticker(partner, ctx.message.sticker.file_id);
  } catch (e) {
    console.error("sticker relay error:", e.message);
  }
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
  } catch (e) {
    console.error("document relay error:", e.message);
  }
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
  } catch (e) {
    console.error("audio relay error:", e.message);
  }
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