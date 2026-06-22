const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  referralRewardInviter,
  referralRewardNewUser,
  reportAutoBlockThreshold
} = require("../config");

const DATA_DIR = __dirname;
const DATA_FILE = path.join(DATA_DIR, "data.json");

const defaultData = {
  users: {},
  tickets: {},
  reports: [],
  stats: {
    totalMatches: 0
  }
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf8");
  }
}

function loadData() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      users: parsed.users || {},
      tickets: parsed.tickets || {},
      reports: parsed.reports || [],
      stats: parsed.stats || { totalMatches: 0 }
    };
  } catch (err) {
    console.error("DB load error:", err);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

let db = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("DB save error:", err);
  }
}

function normalizeId(id) {
  return String(id);
}

function createDefaultUser(userId, payload = {}) {
  return {
    id: normalizeId(userId),
    name: payload.name || "",
    age: payload.age || "",
    gender: payload.gender || "",
    city: payload.city || "",
    bio: payload.bio || "",
    profilePhoto: payload.profilePhoto || "",

    // فیلترها / ترجیحات
    preference: payload.preference || "all", // all | مرد | زن | سایر
    minAge: Number(payload.minAge || 0),
    maxAge: Number(payload.maxAge || 99),
    cityFilter: payload.cityFilter || "all", // all | same

    // مالی / vip
    coins: Number(payload.coins || 0),
    vipUntil: Number(payload.vipUntil || 0),
    boostUntil: Number(payload.boostUntil || 0),

    // رفرال
    referredBy: payload.referredBy || null,
    referrals: Array.isArray(payload.referrals) ? payload.referrals : [],

    // روزانه / آمار
    lastDailyAt: Number(payload.lastDailyAt || 0),
    totalChats: Number(payload.totalChats || 0),
    totalMatches: Number(payload.totalMatches || 0),

    // امنیت / بلاک / گزارش
    blockedUsers: Array.isArray(payload.blockedUsers) ? payload.blockedUsers : [],
    reportCount: Number(payload.reportCount || 0),
    blocked: Boolean(payload.blocked || false),

    // زمان‌ها
    createdAt: payload.createdAt || Date.now(),
    updatedAt: Date.now()
  };
}

// ================= USERS =================
function addUser(userId, payload = {}) {
  const id = normalizeId(userId);

  if (db.users[id]) {
    db.users[id] = {
      ...db.users[id],
      ...payload,
      updatedAt: Date.now()
    };
  } else {
    db.users[id] = createDefaultUser(id, payload);
  }

  saveData();
  return db.users[id];
}

function getUser(userId) {
  return db.users[normalizeId(userId)] || null;
}

function getAllUsers() {
  return Object.values(db.users);
}

function updateUser(userId, updates = {}) {
  const id = normalizeId(userId);
  const existing = getUser(id);

  if (!existing) return null;

  db.users[id] = {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  };

  saveData();
  return db.users[id];
}

function userExists(userId) {
  return Boolean(getUser(userId));
}

// ================= PROFILE HELPERS =================
function setUserBio(userId, bio) {
  return updateUser(userId, { bio: String(bio || "").trim() });
}

function setUserCity(userId, city) {
  return updateUser(userId, { city: String(city || "").trim() });
}

function setUserPhoto(userId, profilePhoto) {
  return updateUser(userId, { profilePhoto: profilePhoto || "" });
}

function setUserAgeRange(userId, minAge, maxAge) {
  minAge = Number(minAge || 0);
  maxAge = Number(maxAge || 99);

  if (minAge < 0) minAge = 0;
  if (maxAge > 99) maxAge = 99;
  if (minAge > maxAge) {
    const temp = minAge;
    minAge = maxAge;
    maxAge = temp;
  }

  return updateUser(userId, { minAge, maxAge });
}

function setUserCityFilter(userId, cityFilter = "all") {
  return updateUser(userId, { cityFilter });
}

// ================= VIP / COINS =================
function addCoins(userId, amount) {
  const user = getUser(userId);
  if (!user) return null;

  const nextCoins = Math.max(0, Number(user.coins || 0) + Number(amount || 0));
  return updateUser(userId, { coins: nextCoins });
}

function removeCoins(userId, amount) {
  return addCoins(userId, -Math.abs(Number(amount || 0)));
}

function setVip(userId, days) {
  const user = getUser(userId);
  if (!user) return null;

  const now = Date.now();
  const base = user.vipUntil && user.vipUntil > now ? user.vipUntil : now;
  const vipUntil = base + Number(days || 0) * 24 * 60 * 60 * 1000;

  return updateUser(userId, { vipUntil });
}

function setBoost(userId, minutes) {
  const user = getUser(userId);
  if (!user) return null;

  const now = Date.now();
  const base = user.boostUntil && user.boostUntil > now ? user.boostUntil : now;
  const boostUntil = base + Number(minutes || 0) * 60 * 1000;

  return updateUser(userId, { boostUntil });
}

function isVip(userId) {
  const user = getUser(userId);
  return !!(user && Number(user.vipUntil || 0) > Date.now());
}

function hasBoost(userId) {
  const user = getUser(userId);
  return !!(user && Number(user.boostUntil || 0) > Date.now());
}

// ================= REFERRAL =================
function setReferredBy(userId, inviterId) {
  const user = getUser(userId);
  const inviter = getUser(inviterId);

  if (!user || !inviter) return false;
  if (String(userId) === String(inviterId)) return false;
  if (user.referredBy) return false;

  user.referredBy = String(inviterId);
  user.updatedAt = Date.now();

  if (!Array.isArray(inviter.referrals)) inviter.referrals = [];
  if (!inviter.referrals.includes(String(userId))) {
    inviter.referrals.push(String(userId));
    inviter.updatedAt = Date.now();
  }

  saveData();
  return true;
}

function giveReferralReward(inviterId, newUserId) {
  const inviter = getUser(inviterId);
  const newUser = getUser(newUserId);

  if (!inviter || !newUser) return false;

  addCoins(inviterId, referralRewardInviter || 50);
  addCoins(newUserId, referralRewardNewUser || 20);
  return true;
}

// ================= REPORT / BLOCK =================
function blockUser(userId) {
  const user = getUser(userId);
  if (!user) return null;

  return updateUser(userId, { blocked: true });
}

function unblockUser(userId) {
  const user = getUser(userId);
  if (!user) return null;

  return updateUser(userId, { blocked: false });
}

function addBlockedUser(userId, blockedUserId) {
  const user = getUser(userId);
  if (!user) return null;

  const list = Array.isArray(user.blockedUsers) ? user.blockedUsers : [];
  const target = String(blockedUserId);

  if (!list.includes(target)) list.push(target);

  return updateUser(userId, { blockedUsers: list });
}

function hasBlocked(userId, otherUserId) {
  const user = getUser(userId);
  if (!user) return false;
  return Array.isArray(user.blockedUsers) && user.blockedUsers.includes(String(otherUserId));
}

function addReport(reporterId, reportedUserId, reason = "") {
  const report = {
    id: uuidv4(),
    reporterId: normalizeId(reporterId),
    reportedUserId: normalizeId(reportedUserId),
    reason: String(reason || "").trim(),
    createdAt: Date.now()
  };

  db.reports.push(report);

  const target = getUser(reportedUserId);
  if (target) {
    const nextCount = Number(target.reportCount || 0) + 1;
    target.reportCount = nextCount;
    target.updatedAt = Date.now();

    if (nextCount >= Number(reportAutoBlockThreshold || 5)) {
      target.blocked = true;
    }
  }

  saveData();
  return report;
}

// ================= SUPPORT TICKETS =================
function createTicket(userId, message) {
  const ticketId = uuidv4().slice(0, 8);

  db.tickets[ticketId] = {
    id: ticketId,
    userId: normalizeId(userId),
    message: String(message || "").trim(),
    status: "open",
    createdAt: Date.now(),
    closedAt: null
  };

  saveData();
  return ticketId;
}

function getTicket(ticketId) {
  return db.tickets[ticketId] || null;
}

function closeTicket(ticketId) {
  const ticket = getTicket(ticketId);
  if (!ticket) return false;

  ticket.status = "closed";
  ticket.closedAt = Date.now();
  saveData();
  return true;
}

// ================= STATS =================
function increaseUserMatchCount(userId) {
  const user = getUser(userId);
  if (!user) return null;

  return updateUser(userId, {
    totalChats: Number(user.totalChats || 0) + 1,
    totalMatches: Number(user.totalMatches || 0) + 1
  });
}

function increaseGlobalMatchCount() {
  db.stats.totalMatches = Number(db.stats.totalMatches || 0) + 1;
  saveData();
}

function getStatsSummary() {
  const users = getAllUsers();

  const totalUsers = users.length;
  const vipUsers = users.filter((u) => Number(u.vipUntil || 0) > Date.now()).length;
  const boostedUsers = users.filter((u) => Number(u.boostUntil || 0) > Date.now()).length;
  const totalCoins = users.reduce((sum, u) => sum + Number(u.coins || 0), 0);
  const blockedUsers = users.filter((u) => u.blocked).length;

  return {
    totalUsers,
    vipUsers,
    boostedUsers,
    totalCoins,
    blockedUsers,
    totalMatches: Number(db.stats.totalMatches || 0),
    totalReports: db.reports.length
  };
}

// ================= EXPORT =================
function setLastDailyAt(userId, timestamp) {
  return updateUser(userId, { lastDailyAt: Number(timestamp || Date.now()) });
}
module.exports = setLastDailyAt,{
  // users
  addUser,
  getUser,
  getAllUsers,
  updateUser,
  userExists,

  // profile
  setUserBio,
  setUserCity,
  setUserPhoto,
  setUserAgeRange,
  setUserCityFilter,

  // wallet / vip
  addCoins,
  removeCoins,
  setVip,
  setBoost,
  isVip,
  hasBoost,

  // report / block
  addReport,
  blockUser,
  unblockUser,
  addBlockedUser,
  hasBlocked,

  // support
  createTicket,
  getTicket,
  closeTicket,

  // stats
  getStatsSummary,
  increaseUserMatchCount,
  increaseGlobalMatchCount,

  // referral
  setReferredBy,
  giveReferralReward
};