require("dotenv").config();

module.exports = {
botToken: process.env.BOT_TOKEN,
adminId: String(process.env.ADMIN_ID || ""),
botUsername: process.env.BOT_USERNAME || "ZentoChatBot",
keepAlive: process.env.KEEP_ALIVE === "1"
};
