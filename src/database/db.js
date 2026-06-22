const fs = require("fs");
const path = require("path");

const dbFile = path.join(__dirname, "data.json");

function initDB() {
if (!fs.existsSync(dbFile)) {
fs.writeFileSync(
dbFile,
JSON.stringify(
{
users: {},
tickets: {},
reports: [],
referrals: {}
},
null,
2
)
);
}
}

function readDB() {
initDB();
return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
}

function writeDB(data) {
fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function ensureUserShape(id) {
const db = readDB();
if (!db.users[id]) {
db.users[id] = {
id: Number(id),
name: "",
age: "",
gender: "",
preference: "all",
coins: 0,
vipUntil: 0,
boostedUntil: 0,
dailyClaimAt: 0,
referralCode: `REF${id}`,
referredBy: null,
stats: {
chats: 0,
nexts: 0,
reports: 0
},
blocked: [],
createdAt: Date.now()
};
writeDB(db);
}
return db.users[id];
}

// ---------- USERS ----------
function getUser(id) {
const db = readDB();
return db.users[id] || null;
}

function addUser(id, data = {}) {
const db = readDB();

const existing = db.users[id];
db.users[id] = {
id: Number(id),
name: "",
age: "",
gender: "",
preference: "all",
coins: 0,
vipUntil: 0,
boostedUntil: 0,
dailyClaimAt: 0,
referralCode: `REF${id}`,
referredBy: null,
stats: {
chats: 0,
nexts: 0,
reports: 0
},
blocked: [],
createdAt: existing?.createdAt || Date.now(),
...existing,
...data
};

writeDB(db);
return db.users[id];
}

function updateUser(id, patch) {
const db = readDB();
const base =
db.users[id] ||
{
id: Number(id),
coins: 0,
vipUntil: 0,
boostedUntil: 0,
dailyClaimAt: 0,
blocked: [],
stats: { chats: 0, nexts: 0, reports: 0 },
createdAt: Date.now()
};

db.users[id] = {
...base,
...patch,
stats: {
...(base.stats || {}),
...(patch.stats || {})
}
};

writeDB(db);
return db.users[id];
}

function getAllUsers() {
const db = readDB();
return Object.values(db.users || {});
}

// ---------- VIP / BOOST ----------
function setVip(id, days = 30) {
const user = ensureUserShape(id);
const current = user.vipUntil && user.vipUntil > Date.now() ? user.vipUntil : Date.now();
return updateUser(id, {
vipUntil: current + days * 24 * 60 * 60 * 1000
});
}

function isVip(id) {
const user = getUser(id);
return !!(user && user.vipUntil > Date.now());
}

function setBoost(id, minutes = 10) {
return updateUser(id, {
boostedUntil: Date.now() + minutes * 60 * 1000
});
}

function isBoosted(id) {
const user = getUser(id);
return !!(user && user.boostedUntil > Date.now());
}

// ---------- COINS ----------
function addCoins(id, amount) {
const user = ensureUserShape(id);
return updateUser(id, {
coins: (user.coins || 0) + amount
});
}

function spendCoins(id, amount) {
const user = ensureUserShape(id);
if ((user.coins || 0) < amount) return false;
updateUser(id, { coins: user.coins - amount });
return true;
}

function getCoins(id) {
const user = ensureUserShape(id);
return user.coins || 0;
}

// ---------- DAILY ----------
function canClaimDaily(id) {
const user = ensureUserShape(id);
const last = user.dailyClaimAt || 0;
return Date.now() - last >= 24 * 60 * 60 * 1000;
}

function claimDaily(id, amount = 20) {
if (!canClaimDaily(id)) return false;
const user = ensureUserShape(id);
updateUser(id, {
coins: (user.coins || 0) + amount,
dailyClaimAt: Date.now()
});
return true;
}

// ---------- REFERRAL ----------
function setReferredBy(userId, inviterId) {
const db = readDB();
if (!db.users[userId]) ensureUserShape(userId);

if (String(userId) === String(inviterId)) return false;
if (db.users[userId].referredBy) return false;
if (!db.users[inviterId]) return false;

db.users[userId].referredBy = String(inviterId);

db.referrals[inviterId] = db.referrals[inviterId] || [];
if (!db.referrals[inviterId].includes(String(userId))) {
db.referrals[inviterId].push(String(userId));
}

writeDB(db);
return true;
}

function getReferralCode(id) {
const user = ensureUserShape(id);
return user.referralCode || `REF${id}`;
}

function getReferralStats(id) {
const db = readDB();
return db.referrals[id] || [];
}

// ---------- REPORTS ----------
function addReport(fromId, targetId, reason = "") {
const db = readDB();
db.reports = db.reports || [];
db.reports.push({
fromId: Number(fromId),
targetId: Number(targetId),
reason,
createdAt: Date.now()
});

const target = db.users[targetId];
if (target) {
target.stats = target.stats || {};
target.stats.reports = (target.stats.reports || 0) + 1;
}

writeDB(db);
}

function getReports(limit = 20) {
const db = readDB();
return (db.reports || []).slice(-limit).reverse();
}

// ---------- BLOCK ----------
function blockUser(userId, targetId) {
const user = ensureUserShape(userId);
const blocked = new Set(user.blocked || []);
blocked.add(Number(targetId));
updateUser(userId, { blocked: [...blocked] });
}

function isBlocked(userId, targetId) {
const user = ensureUserShape(userId);
return (user.blocked || []).includes(Number(targetId));
}

// ---------- TICKETS ----------
function createTicket(userId, message) {
const db = readDB();
const ticketId = "T" + Date.now();

db.tickets[ticketId] = {
id: ticketId,
userId: Number(userId),
message,
status: "open",
createdAt: Date.now()
};

writeDB(db);
return ticketId;
}

function getTicket(ticketId) {
const db = readDB();
return db.tickets[ticketId] || null;
}

function closeTicket(ticketId) {
const db = readDB();
if (db.tickets[ticketId]) {
db.tickets[ticketId].status = "closed";
writeDB(db);
}
}

// ---------- STATS ----------
function incrementStat(id, key) {
const user = ensureUserShape(id);
const stats = user.stats || {};
stats[key] = (stats[key] || 0) + 1;
updateUser(id, { stats });
}

function getStatsSummary() {
const users = getAllUsers();
const totalUsers = users.length;
const vipUsers = users.filter(u => u.vipUntil > Date.now()).length;
const boostedUsers = users.filter(u => u.boostedUntil > Date.now()).length;
const totalCoins = users.reduce((sum, u) => sum + (u.coins || 0), 0);

return {
totalUsers,
vipUsers,
boostedUsers,
totalCoins
};
}

module.exports = {
readDB,
writeDB,

getUser,
addUser,
updateUser,
getAllUsers,

setVip,
isVip,
setBoost,
isBoosted,

addCoins,
spendCoins,
getCoins,

canClaimDaily,
claimDaily,

setReferredBy,
getReferralCode,
getReferralStats,

addReport,
getReports,

blockUser,
isBlocked,

createTicket,
getTicket,
closeTicket,

incrementStat,
getStatsSummary
};
