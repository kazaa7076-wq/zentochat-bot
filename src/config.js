require("dotenv").config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  adminId: Number(process.env.ADMIN_ID)
};