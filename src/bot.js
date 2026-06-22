require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const {
  botToken,
  adminId,
  botUsername,
  port,
  appName
} = require("./config");

const {
  getUser,
  addUser,
  updateUser,
  setVip,
  addCoins,
  addReport,
  createTicket,
  getTicket,
  closeTicket,
  getStatsSummary,
  setReferredBy,
  setUserBio,
  setUserCity,
  setUserPhoto,
  setUserAgeRange,
  setUserCityFilter
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

if (!botToken) {
  console.error("❌ BOT_TOKEN تنظیم نشده");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const app = express();

// ================= STATE =================
const userState = {};
const supportState = {};
const reportState = {};
const profileEditState = {};

// ================= KEYBOARDS =================
function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["🔍 شروع جستجو", "⏭ کاربر بعدی"],
        ["❌ پایان چت", "🚨 گزارش کاربر"],
        ["👤 پروفایل من", "📝 ویرایش پروفایل"],
        ["🎯 تنظیمات فیلتر", "💰 کیف پول"],
        ["🎁 جایزه روزانه", "⚡ بوست"],
        ["💎 VIP", "👥 دعوت دوستان"],
        ["📩 پشتیبانی"]
      ],
      resize_keyboard: true
    }
  };
}

function genderKeyboard() {
  return {
    reply_markup: {
      keyboard: [["مرد", "زن", "سایر"]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
}

function preferenceKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["همه", "فقط مرد"],
        ["فقط زن", "فقط سایر"],
        ["🔙 بازگشت"]
      ],
      resize_keyboard: true
    }
  };
}

function profileEditKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["✏️ تغییر اسم", "🎂 تغییر سن"],
        ["🏙 تغییر شهر", "📝 تغییر بیو"],
        ["🖼 تغییر عکس پروفایل"],
        ["🔙 بازگشت"]
      ],
      resize_keyboard: true
    }
  };
}

function filterKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["👫 ترجیح جنسیت", "🎂 بازه سنی"],
        ["🏙 فیلتر شهر", "👤 دیدن فیلتر فعلی"],
        ["🔙 بازگشت"]
      ],
      resize_keyboard: true
    }
  };
}

function cityFilterKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["همه شهرها", "فقط هم‌شهری"],
        ["🔙 بازگشت"]
      ],
      resize_keyboard: true
    }
  };
}

function vipKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["💎 خرید VIP 7 روزه", "💎 خرید VIP 30 روزه"],
        ["🔙 بازگشت"]
      ],
      resize_keyboard: true
    }
  };
}

// ================= HELPERS =================
function isAdmin(ctx) {
  return String(ctx.from.id) === String(adminId);
}

function normalizePreference(text) {
  if (text === "فقط مرد") return "مرد";
  if (text === "فقط زن") return "زن";
  if (text === "فقط سایر") return "سایر";
  return "all";
}

function formatPreference(pref) {
  if (!pref || pref === "all") return "همه";
  return pref;
}

function formatCityFilter(user) {
  return user.cityFilter === "same" ? "فقط هم‌شهری" : "همه شهرها";
}

function profileText(user) {
  const vip = Number(user.vipUntil || 0) > Date.now() ? "فعال" : "غیرفعال";
  return [
    "👤 پروفایل شما",
    `اسم: ${user.name || "-"}`,
    `سن: ${user.age || "-"}`,
    `جنسیت: ${user.gender || "-"}`,
    `شهر: ${user.city || "-"}`,
    `بیو: ${user.bio || "-"}`,
    `ترجیح چت: ${formatPreference(user.preference)}`,
    `بازه سنی دلخواه: ${user.minAge ?? 0} تا ${user.maxAge ?? 99}`,
    `فیلتر شهر: ${formatCityFilter(user)}`,
    `سکه: ${user.coins || 0}`,
    `VIP: ${vip}`
  ].join("\n");
}

function partnerProfileText(user) {
  return [
    "👤 پروفایل طرف مقابل",
    `اسم: ${user.name || "-"}`,
    `سن: ${user.age || "-"}`,
    `جنسیت: ${user.gender || "-"}`,
    `شهر: ${user.city || "-"}`,
    `بیو: ${user.bio || "-"}`
  ].join("\n");
}

function filterSummaryText(user) {
  return [
    "🎯 فیلتر فعلی شما",
    `ترجیح جنسیت: ${formatPreference(user.preference)}`,
    `بازه سنی: ${user.minAge ?? 0} تا ${user.maxAge ?? 99}`,
    `فیلتر شهر: ${formatCityFilter(user)}`
  ].join("\n");
}

async function safeSend(chatId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (_) {}
}

async function safeSendPhoto(chatId, fileId, extra = {}) {
  try {
    await bot.telegram.sendPhoto(chatId, fileId, extra);
  } catch (_) {}
}

function clearUserFlows(userId) {
  delete supportState[userId];
  delete reportState[userId];
  delete profileEditState[userId];
}

async function sendPartnerProfile(toUserId, partnerUser) {
  if (!partnerUser) return;

  if (partnerUser.profilePhoto) {
    await safeSendPhoto(toUserId, partnerUser.profilePhoto, {
      caption: partnerProfileText(partnerUser)
    });
  } else {
    await safeSend(toUserId, partnerProfileText(partnerUser));
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

  const me = getUser(userId);
  const partner = getUser(partnerId);

  await safeSend(
    userId,
    "✅ به یک کاربر ناشناس وصل شدی.\nمی‌تونی پیام، عکس، ویس و... بفرستی.",
    mainKeyboard()
  );

  await sendPartnerProfile(userId, partner);

  await safeSend(
    partnerId,
    "✅ یک کاربر ناشناس بهت وصل شد.\nچت شروع شد.",
    mainKeyboard()
  );

  await sendPartnerProfile(partnerId, me);
}

// ================= START =================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const payload = ctx.startPayload || "";
  const existing = getUser(userId);

  clearUserFlows(userId);

  if (!existing) {
    userState[userId] = { step: "name" };

    if (payload.startsWith("ref_")) {
      const inviterId = payload.replace("ref_", "").trim();
      userState[userId].referrer = inviterId;
    }

    return ctx.reply(
      `👋 به ${appName || "ZentoChat PRO MAX"} خوش اومدی\n\nاسم خودتو بفرست:`,
      mainKeyboard()
    );
  }

  return ctx.reply(
    `👋 خوش برگشتی ${existing.name || ""}\n\n${profileText(existing)}`,
    mainKeyboard()
  );
});

// ================= TEXT ROUTER =================
bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const text = (ctx.message.text || "").trim();

  // ===== ADMIN =====
  if (text.startsWith("/stats") && isAdmin(ctx)) {
    const s = getStatsSummary();
    return ctx.reply(
      [
        "📊 آمار ربات",
        `👥 کل کاربران: ${s.totalUsers}`,
        `💎 VIP ها: ${s.vipUsers}`,
        `⚡ بوست فعال: ${s.boostedUsers}`,
        `🪙 مجموع سکه‌ها: ${s.totalCoins}`,
        `🚫 کاربران بلاک‌شده: ${s.blockedUsers}`,
        `🧾 گزارش‌ها: ${s.totalReports}`,
        `🤝 کل مچ‌ها: ${s.totalMatches}`,
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
      state.name = text;
      state.step = "age";
      return ctx.reply("🎂 سنت رو بفرست:");
    }

    if (state.step === "age") {
      const age = Number(text);
      if (!age || age < 1 || age > 99) {
        return ctx.reply("❌ سن معتبر بفرست. مثال: 21");
      }

      state.age = age;
      state.step = "gender";
      return ctx.reply("👤 جنسیتت رو انتخاب کن:", genderKeyboard());
    }

    if (state.step === "gender") {
      if (!["مرد", "زن", "سایر"].includes(text)) {
        return ctx.reply("❌ یکی از گزینه‌های جنسیت را انتخاب کن.", genderKeyboard());
      }

      state.gender = text;
      state.step = "city";
      return ctx.reply("🏙 شهرت رو بفرست:");
    }

    if (state.step === "city") {
      const city = text;

      addUser(userId, {
        name: state.name,
        age: state.age,
        gender: state.gender,
        city,
        bio: "",
        profilePhoto: "",
        preference: "all",
        minAge: 0,
        maxAge: 99,
        cityFilter: "all"
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

  // ===== PROFILE EDIT FLOW =====
  if (profileEditState[userId]) {
    const mode = profileEditState[userId];

    if (mode === "name") {
      updateUser(userId, { name: text });
      delete profileEditState[userId];
      return ctx.reply("✅ اسم پروفایل ذخیره شد.", mainKeyboard());
    }

    if (mode === "age") {
      const age = Number(text);
      if (!age || age < 1 || age > 99) {
        return ctx.reply("❌ سن معتبر بفرست.");
      }

      updateUser(userId, { age });
      delete profileEditState[userId];
      return ctx.reply("✅ سن ذخیره شد.", mainKeyboard());
    }

    if (mode === "city") {
      setUserCity(userId, text);
      delete profileEditState[userId];
      return ctx.reply("✅ شهر ذخیره شد.", mainKeyboard());
    }

    if (mode === "bio") {
      setUserBio(userId, text);
      delete profileEditState[userId];
      return ctx.reply("✅ بیو ذخیره شد.", mainKeyboard());
    }

    if (mode === "ageRange") {
      const cleaned = text.replace(/تا/g, "-").replace(/\s+/g, "");
      const parts = cleaned.split("-");

      if (parts.length !== 2) {
        return ctx.reply("❌ فرمت درست: 18-30");
      }

      const minAge = Number(parts[0]);
      const maxAge = Number(parts[1]);

      if (
        Number.isNaN(minAge) ||
        Number.isNaN(maxAge) ||
        minAge < 0 ||
        maxAge > 99
      ) {
        return ctx.reply("❌ بازه سنی معتبر نیست. مثال: 18-30");
      }

      setUserAgeRange(userId, minAge, maxAge);
      delete profileEditState[userId];
      return ctx.reply("✅ بازه سنی ذخیره شد.", mainKeyboard());
    }
  }

  // ===== USER CHECK =====
  const user = getUser(userId);

  if (!user) {
    return ctx.reply("اول /start بزن و ثبت‌نام کن.");
  }

  // ===== MAIN MENU =====
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
        await safeSend(oldPartner, "⏭ طرف مقابل به چت بعدی رفت.", mainKeyboard());
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

  // ===== PROFILE =====
  if (text === "👤 پروفایل من") {
    return ctx.reply(profileText(user), mainKeyboard());
  }

  if (text === "📝 ویرایش پروفایل") {
    return ctx.reply("بخش ویرایش پروفایل:", profileEditKeyboard());
  }

  if (text === "✏️ تغییر اسم") {
    profileEditState[userId] = "name";
    return ctx.reply("اسم جدیدت را بفرست:");
  }

  if (text === "🎂 تغییر سن") {
    profileEditState[userId] = "age";
    return ctx.reply("سن جدیدت را بفرست:");
  }

  if (text === "🏙 تغییر شهر") {
    profileEditState[userId] = "city";
    return ctx.reply("شهر جدیدت را بفرست:");
  }

  if (text === "📝 تغییر بیو") {
    profileEditState[userId] = "bio";
    return ctx.reply("بیوی جدیدت را بفرست:");
  }

  if (text === "🖼 تغییر عکس پروفایل") {
    profileEditState[userId] = "photo";
    return ctx.reply("عکس پروفایلت را به‌صورت عکس بفرست:");
  }

  // ===== FILTERS =====
  if (text === "🎯 تنظیمات فیلتر") {
    return ctx.reply("تنظیمات فیلتر:", filterKeyboard());
  }

  if (text === "👫 ترجیح جنسیت") {
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

  if (text === "🎂 بازه سنی") {
    profileEditState[userId] = "ageRange";
    return ctx.reply("بازه سنی را به این شکل بفرست:\n18-30");
  }

  if (text === "🏙 فیلتر شهر") {
    return ctx.reply("نوع فیلتر شهر را انتخاب کن:", cityFilterKeyboard());
  }

  if (text === "همه شهرها") {
    setUserCityFilter(userId, "all");
    return ctx.reply("✅ فیلتر شهر روی «همه شهرها» تنظیم شد.", mainKeyboard());
  }

  if (text === "فقط هم‌شهری") {
    setUserCityFilter(userId, "same");
    return ctx.reply("✅ فیلتر شهر روی «فقط هم‌شهری» تنظیم شد.", mainKeyboard());
  }

  if (text === "👤 دیدن فیلتر فعلی") {
    return ctx.reply(filterSummaryText(user), filterKeyboard());
  }

  // ===== WALLET / VIP =====
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

  // ===== REFERRAL =====
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

  // ===== SUPPORT =====
  if (text === "📩 پشتیبانی") {
    supportState[userId] = true;
    return ctx.reply("پیامت برای پشتیبانی را در یک پیام بفرست:");
  }

  if (text === "🔙 بازگشت") {
    clearUserFlows(userId);
    return ctx.reply("برگشتی به منوی اصلی.", mainKeyboard());
  }

  // ===== RELAY TEXT =====
  if (isInChat(userId)) {
    const partner = getPartner(userId);
    if (partner) {
      return safeSend(partner, `💬 ناشناس:\n${text}`);
    }
  }

  return next();
});

// ================= PHOTO =================
bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;

  // اگر در حالت ثبت عکس پروفایل بود
  if (profileEditState[userId] === "photo") {
    const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    setUserPhoto(userId, photo);
    delete profileEditState[userId];
    return ctx.reply("✅ عکس پروفایل ذخیره شد.", mainKeyboard());
  }

  // در غیر این صورت اگر داخل چت بود، عکس را برای طرف مقابل بفرست
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

// ================= VOICE =================
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

// ================= VIDEO =================
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

// ================= STICKER =================
bot.on("sticker", async (ctx) => {
  const userId = ctx.from.id;
  if (!isInChat(userId)) return;

  const partner = getPartner(userId);
  if (!partner) return;

  try {
    await bot.telegram.sendSticker(partner, ctx.message.sticker.file_id);
  } catch (_) {}
});

// ================= DOCUMENT =================
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

// ================= AUDIO =================
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

// ================= SERVER =================
app.get("/", (req, res) => {
  res.send(`${appName || "ZentoChat PRO MAX"} is running`);
});

const PORT = port || process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});

// ================= ERROR HANDLING =================
bot.catch((err) => {
  console.error("Bot Error:", err);
});

// Render-safe launch
bot
  .launch({ dropPendingUpdates: true })
  .then(() => {
    console.log(`🔥 ${appName || "ZentoChat PRO MAX"} RUNNING`);
  })
  .catch((err) => {
    console.error("Launch Error:", err.message || err);
    console.log("⚠️ ربات به تلگرام وصل نشد ولی سرور همچنان بالا ماند.");
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));