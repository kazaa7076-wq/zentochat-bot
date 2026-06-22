const {
getUser,
isVip,
isBoosted,
incrementStat,
isBlocked
} = require("../database/db");

const waitingQueue = [];
const activeChats = new Map(); // userId -> partnerId

function isInQueue(userId) {
return waitingQueue.includes(Number(userId));
}

function removeFromQueue(userId) {
const idx = waitingQueue.indexOf(Number(userId));
if (idx !== -1) waitingQueue.splice(idx, 1);
}

function isInChat(userId) {
return activeChats.has(Number(userId));
}

function getPartner(userId) {
return activeChats.get(Number(userId)) || null;
}

function startChat(a, b) {
activeChats.set(Number(a), Number(b));
activeChats.set(Number(b), Number(a));

incrementStat(a, "chats");
incrementStat(b, "chats");
}

function endChat(userId) {
const uid = Number(userId);
const partner = activeChats.get(uid);

if (!partner) return null;

activeChats.delete(uid);
activeChats.delete(partner);

return Number(partner);
}

function queueUser(userId) {
const uid = Number(userId);
if (!waitingQueue.includes(uid)) waitingQueue.push(uid);
}

function preferenceMatch(user, candidate) {
if (!user || !candidate) return false;

const pref = user.preference || "all";
const cPref = candidate.preference || "all";

const userAccepts =
pref === "all" || (candidate.gender && candidate.gender === pref);

const candidateAccepts =
cPref === "all" || (user.gender && user.gender === cPref);

return userAccepts && candidateAccepts;
}

function findBestPartner(userId) {
const uid = Number(userId);
const user = getUser(uid);
if (!user) return null;

const candidates = waitingQueue.filter(id => id !== uid);

if (!candidates.length) return null;

// فیلتر بلاک
const filtered = candidates.filter(candidateId => {
if (isBlocked(uid, candidateId)) return false;
if (isBlocked(candidateId, uid)) return false;
return true;
});

if (!filtered.length) return null;

// فقط کسانی که preference جور است
const matched = filtered.filter(candidateId => {
const c = getUser(candidateId);
return preferenceMatch(user, c);
});

const pool = matched.length ? matched : filtered;

// اولویت: VIP + Boost > VIP > Boost > normal
const vipBoost = pool.find(id => isVip(id) && isBoosted(id));
if (vipBoost) return vipBoost;

const vip = pool.find(id => isVip(id));
if (vip) return vip;

const boost = pool.find(id => isBoosted(id));
if (boost) return boost;

return pool[0] || null;
}

function nextChat(userId) {
incrementStat(userId, "nexts");
const partner = endChat(userId);
queueUser(userId);
return partner;
}

function getQueueCount() {
return waitingQueue.length;
}

function getActiveCount() {
return Math.floor(activeChats.size / 2);
}

module.exports = {
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
};
