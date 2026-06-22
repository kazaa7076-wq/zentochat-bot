const {
  addToQueue,
  getPartner,
  disconnect,
  isChatting,
  removeWaiting
} = require("../services/matcher");

const {
  addUser,
  increaseChatCount,
  addReport
} = require("../database/db");

const { checkSpam } = require("../services/antispam");
const { mainKeyboard } = require("../keyboards/main");

async function startSearch(ctx) {
  const userId = ctx.from.id;

  addUser(userId);

  if (checkSpam(userId)) {
    return ctx.reply("⛔ خیلی سریع درخواست می‌فرستی. چند ثانیه صبر کن.");
  }

  if (isChatting(userId)) {
    return ctx.reply("⚠️ شما الان داخل یک گفتگو هستی.");
  }

  const partner = addToQueue(userId);

  if (!partner) {
    return ctx.reply("⏳ در حال پیدا کردن کاربر ناشناس...");
  }

  increaseChatCount(userId);
  increaseChatCount(partner);

  await ctx.telegram.sendMessage(
    userId,
    "✅ به یک کاربر ناشناس متصل شدی.",
    mainKeyboard
  );

  await ctx.telegram.sendMessage(
    partner,
    "✅ به یک کاربر ناشناس متصل شدی.",
    mainKeyboard
  );
}

async function nextPartner(ctx) {
  const userId = ctx.from.id;

  if (checkSpam(userId)) {
    return ctx.reply("⛔ خیلی سریع درخواست می‌فرستی. چند ثانیه صبر کن.");
  }

  removeWaiting(userId);

  const oldPartner = disconnect(userId);

  if (oldPartner) {
    await ctx.telegram.sendMessage(
      oldPartner,
      "❌ طرف مقابل گفتگو را ترک کرد و به دنبال کاربر جدید رفت.",
      mainKeyboard
    );
  }

  const partner = addToQueue(userId);

  if (!partner) {
    return ctx.reply("⏳ در حال پیدا کردن کاربر جدید...");
  }

  increaseChatCount(userId);
  increaseChatCount(partner);

  const user = getUser(userId);
const partner = getUser(partnerId);

await safeSend(
  userId,
`✅ وصل شدی!

👤 پروفایل طرف مقابل:
نام: ${partner.name}
سن: ${partner.age}
جنسیت: ${partner.gender}
بیو: ${partner.bio || "-"}`,
mainKeyboard()
);

await safeSend(
  partnerId,
`✅ وصل شدی!

👤 پروفایل طرف مقابل:
نام: ${user.name}
سن: ${user.age}
جنسیت: ${user.gender}
بیو: ${user.bio || "-"}`,
mainKeyboard()
);
}

async function endChat(ctx) {
  const userId = ctx.from.id;

  removeWaiting(userId);

  const partner = disconnect(userId);

  if (partner) {
    await ctx.telegram.sendMessage(
      partner,
      "❌ طرف مقابل گفتگو را پایان داد.",
      mainKeyboard
    );
  }

  await ctx.reply("✅ گفت‌وگو بسته شد.", mainKeyboard);
}

async function reportUser(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) {
    return ctx.reply("⚠️ الان داخل گفت‌وگو نیستی که کسی را گزارش کنی.");
  }

  addReport(userId, partner);

  await ctx.reply("🚨 گزارش ثبت شد. ممنون بابت اطلاع‌رسانی.");
}

async function relayText(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  const text = ctx.message.text;

  if (
    text === "🔍 شروع جستجو" ||
    text === "⏭ کاربر بعدی" ||
    text === "❌ پایان چت" ||
    text === "🚨 گزارش کاربر"
  ) {
    return;
  }

  await ctx.telegram.sendMessage(partner, text);
}

async function relayPhoto(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  const photos = ctx.message.photo;
  const photo = photos[photos.length - 1];

  await ctx.telegram.sendPhoto(
    partner,
    photo.file_id,
    {
      caption: ctx.message.caption || ""
    }
  );
}

async function relayVideo(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  await ctx.telegram.sendVideo(
    partner,
    ctx.message.video.file_id,
    {
      caption: ctx.message.caption || ""
    }
  );
}

async function relayVoice(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  await ctx.telegram.sendVoice(
    partner,
    ctx.message.voice.file_id
  );
}

async function relayDocument(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  await ctx.telegram.sendDocument(
    partner,
    ctx.message.document.file_id,
    {
      caption: ctx.message.caption || ""
    }
  );
}

async function relaySticker(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  await ctx.telegram.sendSticker(
    partner,
    ctx.message.sticker.file_id
  );
}

async function relayAudio(ctx) {
  const userId = ctx.from.id;
  const partner = getPartner(userId);

  if (!partner) return;

  await ctx.telegram.sendAudio(
    partner,
    ctx.message.audio.file_id,
    {
      caption: ctx.message.caption || ""
    }
  );
}

module.exports = {
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
};