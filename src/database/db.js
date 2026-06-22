const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      chats_count INTEGER DEFAULT 0,
      reports INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER,
      reported_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

function addUser(userId) {
  db.run(
    `INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`,
    [userId]
  );
}

function increaseChatCount(userId) {
  db.run(
    `UPDATE users
     SET chats_count = chats_count + 1
     WHERE telegram_id = ?`,
    [userId]
  );
}

function addReport(reporter, reported) {
  db.run(
    `INSERT INTO reports (reporter_id, reported_id)
     VALUES (?, ?)`,
    [reporter, reported]
  );

  db.run(
    `UPDATE users
     SET reports = reports + 1
     WHERE telegram_id = ?`,
    [reported]
  );
}

function getUserCount() {
  return new Promise((resolve) => {
    db.get(
      `SELECT COUNT(*) AS total FROM users`,
      [],
      (err, row) => {
        resolve(row?.total || 0);
      }
    );
  });
}

module.exports = {
  db,
  addUser,
  increaseChatCount,
  addReport,
  getUserCount
};