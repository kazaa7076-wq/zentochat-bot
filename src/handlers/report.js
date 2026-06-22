const { db } = require("../database/db");

async function getReportsList(ctx) {
  db.all(
    `
    SELECT reporter_id, reported_id, created_at
    FROM reports
    ORDER BY id DESC
    LIMIT 30
    `,
    [],
    async (err, rows) => {
      if (err) {
        return ctx.reply("خطا در دریافت گزارش‌ها.");
      }

      if (!rows || rows.length === 0) {
        return ctx.reply("هیچ گزارشی وجود ندارد.");
      }

      let text = "🚨 آخرین گزارش‌ها:\n\n";

      rows.forEach((row, index) => {
        text += `${index + 1}) گزارش‌دهنده: ${row.reporter_id}
گزارش‌شده: ${row.reported_id}
زمان: ${row.created_at}

`;
      });

      await ctx.reply(text);
    }
  );
}

module.exports = {
  getReportsList
};