const {
  getUser,
  isVip,
  hasBoost,
  hasBlocked,
  increaseUserMatchCount,
  increaseGlobalMatchCount
} = require("../database/db");

const queue = new Set();            // userId ها
const activeChats = new Map();      // userId -> partnerId

function normalizeId(id) {
  return String(id);
}

function isInQueue(userId) {
  return queue.has(normalizeId(userId));
}

function queueUser(userId) {
  queue.add(normalizeId(userId));
  return true;
}

function removeFromQueue(userId) {
  queue.delete(normalizeId(userId));
  return true;
}

function getQueueCount() {
  return queue.size;
}

function isInChat(userId) {
  return activeChats.has(normalizeId(userId));
}

function getPartner(userId) {
  return activeChats.get(normalizeId(userId)) || null;
}

function getActiveCount() {
  return Math.floor(activeChats.size / 2);
}

function startChat(userA, userB) {
  const a = normalizeId(userA);
  const b = normalizeId(userB);

  activeChats.set(a, b);
  activeChats.set(b, a);

  removeFromQueue(a);
  removeFromQueue(b);

  increaseUserMatchCount(a);
  increaseUserMatchCount(b);
  increaseGlobalMatchCount();

  return true;
}

function endChat(userId) {
  const uid = normalizeId(userId);
  const partner = getPartner(uid);

  activeChats.delete(uid);

  if (partner) {
    activeChats.delete(normalizeId(partner));
  }

  return partner || null;
}

function nextChat(userId) {
  return endChat(userId);
}

// ================= FILTER ENGINE =================
function normalizeGender(gender = "") {
  const g = String(gender || "").trim();

  if (g === "مرد" || g.toLowerCase() === "male") return "مرد";
  if (g === "زن" || g.toLowerCase() === "female") return "زن";
  if (g === "سایر") return "سایر";

  return g || "";
}

function normalizePreference(pref = "") {
  const p = String(pref || "").trim();

  if (!p || p === "all" || p === "همه") return "all";
  if (p === "فقط مرد") return "مرد";
  if (p === "فقط زن") return "زن";
  if (p === "فقط سایر") return "سایر";

  return p;
}

function toAge(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function cityEquals(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function userCanSeeTarget(seeker, target) {
  const seekerPref = normalizePreference(seeker.preference);
  const targetGender = normalizeGender(target.gender);

  if (seekerPref !== "all" && seekerPref !== targetGender) {
    return false;
  }

  return true;
}

function targetCanSeeUser(seeker, target) {
  const targetPref = normalizePreference(target.preference);
  const seekerGender = normalizeGender(seeker.gender);

  if (targetPref !== "all" && targetPref !== seekerGender) {
    return false;
  }

  return true;
}

function ageRangePass(seeker, target) {
  const targetAge = toAge(target.age);

  // اگر سن طرف خالی بود، خیلی سخت نگیر
  if (!targetAge) return true;

  const minAge = Number(seeker.minAge ?? 0);
  const maxAge = Number(seeker.maxAge ?? 99);

  return targetAge >= minAge && targetAge <= maxAge;
}

function reverseAgeRangePass(seeker, target) {
  const seekerAge = toAge(seeker.age);

  if (!seekerAge) return true;

  const minAge = Number(target.minAge ?? 0);
  const maxAge = Number(target.maxAge ?? 99);

  return seekerAge >= minAge && seekerAge <= maxAge;
}

function cityFilterPass(seeker, target) {
  const seekerFilter = String(seeker.cityFilter || "all");

  if (seekerFilter !== "same") return true;
  if (!seeker.city || !target.city) return false;

  return cityEquals(seeker.city, target.city);
}

function reverseCityFilterPass(seeker, target) {
  const targetFilter = String(target.cityFilter || "all");

  if (targetFilter !== "same") return true;
  if (!seeker.city || !target.city) return false;

  return cityEquals(seeker.city, target.city);
}

function isBlockedEitherSide(userId, candidateId) {
  return (
    hasBlocked(userId, candidateId) ||
    hasBlocked(candidateId, userId)
  );
}

function isCompatible(userId, candidateId) {
  const user = getUser(userId);
  const candidate = getUser(candidateId);

  if (!user || !candidate) return false;
  if (user.blocked || candidate.blocked) return false;

  // خود شخص نباشد
  if (String(userId) === String(candidateId)) return false;

  // در چت نباشد
  if (isInChat(candidateId)) return false;

  // بلاک دوطرفه
  if (isBlockedEitherSide(userId, candidateId)) return false;

  // فیلتر جنسیت
  if (!userCanSeeTarget(user, candidate)) return false;
  if (!targetCanSeeUser(user, candidate)) return false;

  // فیلتر سن
  if (!ageRangePass(user, candidate)) return false;
  if (!reverseAgeRangePass(user, candidate)) return false;

  // فیلتر شهر
  if (!cityFilterPass(user, candidate)) return false;
  if (!reverseCityFilterPass(user, candidate)) return false;

  return true;
}

// امتیازدهی برای انتخاب بهترین مچ
function scoreCandidate(userId, candidateId) {
  const user = getUser(userId);
  const candidate = getUser(candidateId);

  if (!user || !candidate) return -999999;

  let score = 0;

  // VIP و Boost اولویت داشته باشند
  if (isVip(candidateId)) score += 50;
  if (hasBoost(candidateId)) score += 100;

  // اگر خود کاربر VIP/Boost است، سعی کن سریع‌تر مچ شود
  if (isVip(userId)) score += 20;
  if (hasBoost(userId)) score += 40;

  // نزدیکی سن
  const userAge = toAge(user.age);
  const candidateAge = toAge(candidate.age);

  if (userAge && candidateAge) {
    const diff = Math.abs(userAge - candidateAge);
    score += Math.max(0, 30 - diff); // هرچی نزدیک‌تر، امتیاز بیشتر
  }

  // هم‌شهری اگر هر دو شهر داشته باشند
  if (user.city && candidate.city && cityEquals(user.city, candidate.city)) {
    score += 15;
  }

  // کسی که بیشتر منتظر بوده؟ فعلاً نداریم، ولی بعداً می‌تونیم اضافه کنیم

  return score;
}

function findBestPartner(userId) {
  const uid = normalizeId(userId);

  if (isInChat(uid)) return null;

  let bestId = null;
  let bestScore = -999999;

  for (const candidateId of queue) {
    if (String(candidateId) === uid) continue;
    if (!isCompatible(uid, candidateId)) continue;

    const score = scoreCandidate(uid, candidateId);
    if (score > bestScore) {
      bestScore = score;
      bestId = candidateId;
    }
  }

  return bestId;
}

module.exports = {
  isInQueue,
  queueUser,
  removeFromQueue,
  getQueueCount,

  isInChat,
  getPartner,
  getActiveCount,

  startChat,
  endChat,
  nextChat,
  findBestPartner
};