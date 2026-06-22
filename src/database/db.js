const fs = require("fs");
const path = require("path");

// مسیر فایل دیتابیس
const dbFile = path.join(__dirname, "data.json");

// اگر فایل وجود نداشت بساز
function initDB() {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({}, null, 2));
  }
}

// خواندن دیتابیس
function readDB() {
  initDB();
  const data = fs.readFileSync(dbFile, "utf-8");
  return JSON.parse(data);
}

// نوشتن در دیتابیس
function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// گرفتن کاربر
function getUser(userId) {
  const db = readDB();
  return db[userId] || null;
}

// ذخیره کاربر
function setUser(userId, userData) {
  const db = readDB();
  db[userId] = userData;
  writeDB(db);
}

module.exports = {
  readDB,
  writeDB,
  getUser,
  setUser,
};