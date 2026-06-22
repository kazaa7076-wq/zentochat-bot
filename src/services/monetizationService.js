const {
addCoins,
spendCoins,
setVip,
setBoost,
claimDaily,
canClaimDaily,
getCoins,
getReferralCode,
getReferralStats
} = require("../database/db");

const DAILY_REWARD = 20;
const BOOST_COST = 25;
const VIP_7_COST = 150;
const VIP_30_COST = 500;

function claimDailyReward(userId) {
if (!canClaimDaily(userId)) {
return {
ok: false,
message: "⏳ جایزه روزانه‌ات را امروز گرفتی. فردا دوباره بیا."
};
}

claimDaily(userId, DAILY_REWARD);

return {
ok: true,
message: `🎁 جایزه روزانه گرفتی: ${DAILY_REWARD} سکه`
};
}

function buyBoost(userId) {
if (!spendCoins(userId, BOOST_COST)) {
return {
ok: false,
message: `❌ سکه کافی نداری. برای بوست ${BOOST_COST} سکه لازم است.`
};
}

setBoost(userId, 10);

return {
ok: true,
message: "⚡ بوست فعال شد! تا 10 دقیقه اولویت بیشتری برای مچ شدن داری."
};
}

function buyVipWithCoins(userId, days) {
const cost = days === 7 ? VIP_7_COST : VIP_30_COST;

if (!spendCoins(userId, cost)) {
return {
ok: false,
message: `❌ سکه کافی نداری. برای VIP ${days} روزه، ${cost} سکه لازم است.`
};
}

setVip(userId, days);

return {
ok: true,
message: `💎 VIP ${days} روزه با موفقیت فعال شد.`
};
}

function referralInfo(userId) {
return {
code: getReferralCode(userId),
count: getReferralStats(userId).length
};
}

function giveReferralReward(inviterId, newUserId) {
addCoins(inviterId, 50);
addCoins(newUserId, 20);
}

function walletInfo(userId) {
return {
coins: getCoins(userId)
};
}

module.exports = {
DAILY_REWARD,
BOOST_COST,
VIP_7_COST,
VIP_30_COST,
claimDailyReward,
buyBoost,
buyVipWithCoins,
referralInfo,
giveReferralReward,
walletInfo
};
