const requests = {};

function rateLimit(limit = 15, windowMs = 10000) {
  return async (ctx, next) => {
    if (!ctx.from) return next();

    const userId = ctx.from.id;
    const now = Date.now();

    if (!requests[userId]) {
      requests[userId] = [];
    }

    requests[userId] = requests[userId].filter(
      (timestamp) => now - timestamp < windowMs
    );

    requests[userId].push(now);

    if (requests[userId].length > limit) {
      return ctx.reply("⛔ شما خیلی سریع پیام می‌فرستی. کمی صبر کن.");
    }

    return next();
  };
}

module.exports = {
  rateLimit
};