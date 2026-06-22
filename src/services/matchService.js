const queue = new Set();
const chats = new Map();

function queueUser(userId) {
  queue.add(userId);
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function isInQueue(userId) {
  return queue.has(userId);
}

function startChat(u1, u2) {
  chats.set(u1, u2);
  chats.set(u2, u1);
}

function endChat(userId) {
  const partner = chats.get(userId);
  chats.delete(userId);
  chats.delete(partner);
  return partner;
}

function isInChat(userId) {
  return chats.has(userId);
}

function getPartner(userId) {
  return chats.get(userId);
}

// 🔥 MATCH ENGINE حرفه‌ای
function findBestPartner(userId, getUser) {
  const me = getUser(userId);
  if (!me) return null;

  let best = null;
  let bestScore = -1;

  for (const id of queue) {
    if (id === userId) continue;

    const p = getUser(id);
    if (!p) continue;

    // 🎯 فیلتر جنسیت
    if (me.preference !== "all" && p.gender !== me.preference) continue;
    if (p.preference !== "all" && p.gender !== me.gender) continue;

    let score = 0;

    // ⭐ VIP priority
    if (me.vipUntil > Date.now()) score += 5;
    if (p.vipUntil > Date.now()) score += 5;

    // ⭐ سن نزدیک‌تر بهتر
    const myAge = Number(me.age || 0);
    const pAge = Number(p.age || 0);
    score += 10 - Math.abs(myAge - pAge);

    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

module.exports = {
  queueUser,
  removeFromQueue,
  isInQueue,
  startChat,
  endChat,
  isInChat,
  getPartner,
  findBestPartner
};