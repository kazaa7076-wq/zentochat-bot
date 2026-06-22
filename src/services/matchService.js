const { getUser } = require("../database/db");

// کاربران در صف
const queue = [];

// چت‌های فعال
// key: userId => partnerId
const activeChats = new Map();

function normalizeId(id) {
  return String(id);
}

function isInQueue(userId) {
  return queue.includes(normalizeId(userId));
}

function queueUser(userId) {
  userId = normalizeId(userId);
  if (!isInQueue(userId)) {
    queue.push(userId);
  }
  return true;
}

function removeFromQueue(userId) {
  userId = normalizeId(userId);
  const index = queue.indexOf(userId);
  if (index !== -1) {
    queue.splice(index, 1);
  }
  return true;
}

function isInChat(userId) {
  return activeChats.has(normalizeId(userId));
}

function getPartner(userId) {
  return activeChats.get(normalizeId(userId)) || null;
}

function startChat(userA, userB) {
  userA = normalizeId(userA);
  userB = normalizeId(userB);

  activeChats.set(userA, userB);
  activeChats.set(userB, userA);

  removeFromQueue(userA);
  removeFromQueue(userB);

  return true;
}

function endChat(userId) {
  userId = normalizeId(userId);

  const partnerId = activeChats.get(userId);
  if (!partnerId) return null;

  activeChats.delete(userId);
  activeChats.delete(partnerId);

  return partnerId;
}

function nextChat(userId) {
  // چت فعلی را قطع می‌کند و partner قبلی را برمی‌گرداند
  return endChat(userId);
}

function getQueueCount() {
  return queue.length;
}

function getActiveCount() {
  // چون هر چت دو بار داخل Map ثبت شده، تقسیم بر 2
  return Math.floor(activeChats.size / 2);
}

function userCanMatchWith(searcher, candidate) {
  if (!searcher || !candidate) return false;
  if (String(searcher.id) === String(candidate.id)) return false;

  // بلاک شده نباشند
  if (searcher.blocked || candidate.blocked) return false;

  // داخل چت نباشد
  if (isInChat(candidate.id)) return false;

  // preference سرچ‌کننده
  if (
    searcher.preference &&
    searcher.preference !== "all" &&
    candidate.gender !== searcher.preference
  ) {
    return false;
  }

  // preference طرف مقابل
  if (
    candidate.preference &&
    candidate.preference !== "all" &&
    searcher.gender !== candidate.preference
  ) {
    return false;
  }

  return true;
}

function scoreCandidate(searcher, candidate) {
  let score = 0;

  // VIP امتیاز بیشتر
  if (Number(candidate.vipUntil || 0) > Date.now()) score += 30;

  // Boost امتیاز بیشتر
  if (Number(candidate.boostUntil || 0) > Date.now()) score += 20;

  // هم‌سن حدودی
  const a1 = Number(searcher.age || 0);
  const a2 = Number(candidate.age || 0);
  if (a1 && a2) {
    const diff = Math.abs(a1 - a2);
    if (diff <= 2) score += 10;
    else if (diff <= 5) score += 5;
  }

  // اگر preference دقیقاً همخوانی دارد
  if (
    searcher.preference !== "all" &&
    candidate.gender === searcher.preference
  ) {
    score += 10;
  }

  return score;
}

function findBestPartner(userId) {
  userId = normalizeId(userId);
  const searcher = getUser(userId);
  if (!searcher) return null;

  let bestPartnerId = null;
  let bestScore = -1;

  for (const candidateId of queue) {
    if (candidateId === userId) continue;

    const candidate = getUser(candidateId);
    if (!candidate) continue;

    if (!userCanMatchWith(searcher, candidate)) continue;

    const score = scoreCandidate(searcher, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestPartnerId = candidateId;
    }
  }

  return bestPartnerId;
}

module.exports = {
  isInQueue,
  queueUser,
  removeFromQueue,

  isInChat,
  getPartner,
  startChat,
  endChat,
  nextChat,

  getQueueCount,
  getActiveCount,

  findBestPartner
};