const {
  getUser,
  addCoins,
  spendCoins,
  setBoost,
  setVip,
  getReferralCount,
  getSettings
} = require("../database/db");

function now() {
  return Date.now();
}

function walletInfo(userId) {
  const user = getUser(userId);
  if (!user) {
    return {
      ok: false,
      message: "کاربر پیدا نشد",
      coins: 0,
      vipUntil: 0,
      boostUntil: 0
    };
  }

  return {
    ok: true,
    coins: Number(user.coins || 0),
    vipUntil: Number(user.vipUntil || 0),
    boostUntil: Number(user.boostUntil || 0)
  };
}

function claimDailyReward(userId) {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, message: "کاربر پیدا نشد." };
  }

  const settings = getSettings();
  const reward = Number(settings.dailyReward || 20);
  const dayMs = 24 * 60 * 60 * 1000;

  if (user.lastDailyAt && now() - Number(user.lastDailyAt) < dayMs) {
    const remain = dayMs - (now() - Number(user.lastDailyAt));
    const hours = Math.ceil(remain / (60 * 60 * 1000));
    return {
      ok: false,
      message: `⏳ جایزه روزانه‌ات را گرفتی. حدود ${hours} ساعت دیگر دوباره امتحان کن.`
    };
  }

  user.lastDailyAt = now();
  addCoins(userId, reward);

  return {
    ok: true,
    reward,
    message: `🎁 ${reward} سکه جایزه روزانه گرفتی.`
  };
}

function buyBoost(userId) {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, message: "کاربر پیدا نشد." };
  }

  const settings = getSettings();
  const price = Number(settings.boostPrice || 25);

  const spend = spendCoins(userId, price);
  if (!spend.ok) {
    return {
      ok: false,
      message: `❌ برای خرید بوست سکه کافی نداری.\nقیمت بوست: ${price} سکه`
    };
  }

  setBoost(userId, 10);

  return {
    ok: true,
    message: `⚡ بوست 10 دقیقه‌ای برایت فعال شد.\n${price} سکه کم شد.`
  };
}

function buyVipWithCoins(userId, days = 7) {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, message: "کاربر پیدا نشد." };
  }

  const settings = getSettings();
  const price =
    Number(days) === 30
      ? Number(settings.vip30Price || 500)
      : Number(settings.vip7Price || 150);

  const spend = spendCoins(userId, price);
  if (!spend.ok) {
    return {
      ok: false,
      message: `❌ سکه کافی برای خرید VIP ${days} روزه نداری.\nقیمت: ${price} سکه`
    };
  }

  setVip(userId, Number(days));

  return {
    ok: true,
    message: `💎 VIP ${days} روزه برایت فعال شد.\n${price} سکه کم شد.`
  };
}

function giveReferralReward(inviterId, newUserId) {
  const settings = getSettings();
  const inviterReward = Number(settings.referralRewardInviter || 50);
  const newUserReward = Number(settings.referralRewardNewUser || 20);

  addCoins(inviterId, inviterReward);
  addCoins(newUserId, newUserReward);

  return {
    ok: true,
    inviterReward,
    newUserReward
  };
}

function referralInfo(userId) {
  const count = getReferralCount(userId);
  const settings = getSettings();

  return {
    count,
    inviterReward: Number(settings.referralRewardInviter || 50),
    newUserReward: Number(settings.referralRewardNewUser || 20)
  };
}

module.exports = {
  walletInfo,
  claimDailyReward,
  buyBoost,
  buyVipWithCoins,
  giveReferralReward,
  referralInfo
};