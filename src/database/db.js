const fs = require("fs");
const path = require("path");

const dbFile = path.join(__dirname, "data.json");

function initDB() {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: {}, tickets: {} }, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// USERS
function getUser(id) {
  const db = readDB();
  return db.users[id] || null;
}

function addUser(id, data = {}) {
  const db = readDB();

  db.users[id] = {
    id,
    coins: 0,
    vipUntil: 0,
    ...data,
    createdAt: Date.now()
  };

  writeDB(db);
  return db.users[id];
}

function updateUser(id, data) {
  const db = readDB();
  db.users[id] = { ...db.users[id], ...data };
  writeDB(db);
}

// VIP
function setVip(id, days = 30) {
  const db = readDB();
  db.users[id] = db.users[id] || {};

  db.users[id].vipUntil = Date.now() + days * 86400000;
  writeDB(db);
}

function isVip(id) {
  const db = readDB();
  const u = db.users[id];
  return u?.vipUntil > Date.now();
}

// COINS
function addCoins(id, amount) {
  const db = readDB();
  db.users[id] = db.users[id] || {};
  db.users[id].coins = (db.users[id].coins || 0) + amount;
  writeDB(db);
}

function spendCoins(id, amount) {
  const db = readDB();
  const u = db.users[id];

  if (!u || (u.coins || 0) < amount) return false;

  u.coins -= amount;
  writeDB(db);
  return true;
}

function getCoins(id) {
  const db = readDB();
  return db.users[id]?.coins || 0;
}

// TICKETS
function createTicket(userId, msg) {
  const db = readDB();

  const id = "T" + Date.now();

  db.tickets[id] = {
    userId,
    msg,
    status: "open",
    createdAt: Date.now()
  };

  writeDB(db);
  return id;
}

function getTicket(id) {
  const db = readDB();
  return db.tickets[id];
}

function closeTicket(id) {
  const db = readDB();
  if (db.tickets[id]) db.tickets[id].status = "closed";
  writeDB(db);
}

module.exports = {
  getUser,
  addUser,
  updateUser,
  setVip,
  isVip,
  addCoins,
  spendCoins,
  getCoins,
  createTicket,
  getTicket,
  closeTicket
};