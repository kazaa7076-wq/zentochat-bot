const fs = require("fs");
const path = require("path");

// مسیر فایل دیتابیس
const dbFile = path.join(__dirname, "data.json");

// ساخت فایل اگر وجود نداشت
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

// نوشتن دیتابیس
function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

/* =========================
   USER FUNCTIONS
========================= */

// گرفتن کاربر
function getUser(userId) {
  const db = readDB();
  return db[userId] || null;
}

// اضافه کردن کاربر
function addUser(userId, data = {}) {
  const db = readDB();

  if (!db[userId]) {
    db[userId] = {
      id: userId,
      ...data,
      createdAt: Date.now()
    };
  }

  writeDB(db);
  return db[userId];
}

// آپدیت کاربر
function updateUser(userId, newData) {
  const db = readDB();

  db[userId] = {
    ...(db[userId] || {}),
    ...newData
  };

  writeDB(db);
  return db[userId];
}

// حذف کاربر
function deleteUser(userId) {
  const db = readDB();

  delete db[userId];

  writeDB(db);
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  readDB,
  writeDB,
  getUser,
  addUser,
  updateUser,
  deleteUser
};