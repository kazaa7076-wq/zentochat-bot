const { adminId } = require("../config");
const { getStats } = require("../services/stats");
const { db } = require("../database/db");

function isAdmin(userId) {
  return Number(userId) === Number(adminId);
}

async function adminStats(ctx) {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    return ctx.reply("⛔ شما ادمین نیستی.");
  }

  const stats = await getStats();

  await ctx.reply(
    `📊 آمار ربات ZentoChat

👤 تعداد کل کاربران: ${stats.totalUsers}`
  );
}

async function adminReports(ctx) {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    return ctx.reply("⛔ شما ادمین نیستی.");
  }

  db.all(
    `
    SELECT reported_id, COUNT(*) as total
    FROM reports
    GROUP BY reported_id
    ORDER BY total DESC
    LIMIT 20
    `,
    [],
    async (err, rows) => {
      if (err) {
        return ctx.reply("خطا در خواندن گزارش‌ها.");
      }

      if (!rows || rows.length === 0) {
        return ctx.reply("هیچ گزارشی ثبت نشده.");
      }

      let text = "🚨 لیست کاربران گزارش‌شده:\n\n";

      rows.forEach((row, index) => {
        text += `${index + 1}) ID: ${row.reported_id} | Reports: ${row.total}\n`;
      });

      await ctx.reply(text);
    }
  );
}

async function broadcastMessage(ctx) {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    return ctx.reply("⛔ شما ادمین نیستی.");
  }

  const text = ctx.message.text;

  if (!text.startsWith("/broadcast ")) {
    return;
  }

  const message = text.replace("/broadcast ", "").trim();

  if (!message) {
    return ctx.reply("⚠️ متن پیام را بعد از /broadcast بنویس.");
  }

  db.all(
    `SELECT telegram_id FROM users`,
    [],
    async (err, rows) => {
      if (err) {
        return ctx.reply("خطا در ارسال همگانی.");
      }

      let success = 0;
      let failed = 0;

      for (const row of rows) {
        try {
          await ctx.telegram.sendMessage(row.telegram_id, `📢 پیام مدیریت:\n\n${message}`);
          success++;
        } catch (e) {
          failed++;
        }
      }

      await ctx.reply(
        `✅ برودکست انجام شد

موفق: ${success}
ناموفق: ${failed}`
      );
    }
  );
}

module.exports = {
  adminStats,
  adminReports,
  broadcastMessage
};