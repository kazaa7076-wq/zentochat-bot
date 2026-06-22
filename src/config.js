require("dotenv").config();

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function toNumber(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? defaultValue : n;
}

module.exports = {
  // ===== Telegram =====
  botToken: process.env.BOT_TOKEN || "",
  adminId: process.env.ADMIN_ID || "",
  botUsername: process.env.BOT_USERNAME || "",

  // ===== Server / Render =====
  port: process.env.PORT || 3000,
  keepAlive: toBool(process.env.KEEP_ALIVE, true),
  appUrl: process.env.APP_URL || "",

  // اگر بعداً خواستی وب‌هوک هم فعال کنیم
  useWebhook: toBool(process.env.USE_WEBHOOK, false),
  webhookPath: process.env.WEBHOOK_PATH || "/telegram-webhook",

  // ===== Referral / Rewards =====
  referralRewardInviter: toNumber(process.env.REFERRAL_REWARD_INVITER, 50),
  referralRewardNewUser: toNumber(process.env.REFERRAL_REWARD_NEW_USER, 20),
  dailyRewardCoins: toNumber(process.env.DAILY_REWARD_COINS, 25),

  // ===== VIP / Boost =====
  boostPrice: toNumber(process.env.BOOST_PRICE, 25),
  boostDurationMinutes: toNumber(process.env.BOOST_DURATION_MINUTES, 10),

  vip7Price: toNumber(process.env.VIP_7_PRICE, 150),
  vip30Price: toNumber(process.env.VIP_30_PRICE, 500),

  // ===== Matching / Filters =====
  minAgeFilter: toNumber(process.env.MIN_AGE_FILTER, 0),
  maxAgeFilter: toNumber(process.env.MAX_AGE_FILTER, 99),

  // اگر خواستی بعداً محدودیت اختلاف سن بذاری
  maxAgeDifference: toNumber(process.env.MAX_AGE_DIFFERENCE, 100),

  // ===== Moderation =====
  reportAutoBlockThreshold: toNumber(process.env.REPORT_AUTO_BLOCK_THRESHOLD, 5),

  // ===== Brand / App =====
  appName: process.env.APP_NAME || "ZentoChat PRO MAX"
};