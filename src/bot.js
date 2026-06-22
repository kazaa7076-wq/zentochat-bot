require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const {
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
} = require("./database/db");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

const app = express();

// MEMORY
const userState = {};
const waiting = [];
const active = {};
const blocked = {};
const boosted = new Set();

// ================= START =================
bot.start(async (ctx) => {
  const u = getUser(ctx.from.id);

  if (u) return ctx.reply("👋 خوش برگشتی");

  userState[ctx.from.id] = { step: 1 };
  ctx.reply("👋 اسم خودتو بفرست:");
});

// ================= REGISTER =================
bot.on("text", async (ctx, next) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  if (userState[id]) {
    const s = userState[id].step;

    if (s === 1) {
      userState[id].name = text;
      userState[id].step = 2;
      return ctx.reply("سن؟");
    }

    if (s === 2) {
      userState[id].age = text;
      userState[id].step = 3;
      return ctx.reply("جنسیت؟");
    }

    if (s === 3) {
      addUser(id, {
        name: userState[id].name,
        age: userState[id].age,
        gender: text
      });

      delete userState[id];
      return ctx.reply("✅ ثبت‌نام کامل شد");
    }
  }

  // CHAT
  const partner = active[id];
  if (partner) {
    return ctx.telegram.sendMessage(partner, `💬 ناشناس:\n${text}`);
  }

  return next();
});

// ================= MATCH =================
bot.hears("🔍 شروع جستجو", (ctx) => {
  const id = ctx.from.id;

  if (!getUser(id)) return ctx.reply("اول ثبت‌نام کن");

  if (active[id]) return ctx.reply("در چت هستی");

  const partner = waiting.find(x => x !== id);

  if (partner) {
    waiting.splice(waiting.indexOf(partner), 1);

    active[id] = partner;
    active[partner] = id;

    ctx.telegram.sendMessage(id, "✅ وصل شدی");
    ctx.telegram.sendMessage(partner, "✅ چت شروع شد");
  } else {
    waiting.push(id);
    ctx.reply("🔎 در صف...");
  }
});

// ================= END =================
bot.hears("❌ پایان چت", (ctx) => {
  const id = ctx.from.id;
  const p = active[id];

  if (!p) return;

  delete active[id];
  delete active[p];

  ctx.telegram.sendMessage(id, "❌ پایان");
  ctx.telegram.sendMessage(p, "❌ کاربر خارج شد");
});

// ================= VIP =================
bot.hears("💎 VIP", (ctx) => {
  ctx.reply("💎 برای خرید VIP به ادمین پیام بده");
});

// ================= COINS =================
bot.hears("💰 کیف پول", (ctx) => {
  ctx.reply(`💰 ${getCoins(ctx.from.id)} سکه`);
});

// ================= SUPPORT =================
bot.hears("📩 پشتیبانی", (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.support = true;
  ctx.reply("پیام بده:");
});

bot.on("text", async (ctx) => {
  if (ctx.session?.support) {
    const id = createTicket(ctx.from.id, ctx.message.text);

    ctx.telegram.sendMessage(
      ADMIN_ID,
      `TICKET ${id}\n${ctx.from.id}\n${ctx.message.text}`
    );

    ctx.session.support = false;
    return ctx.reply("ارسال شد");
  }
});

// ADMIN ANSWER
bot.command("answer", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const [, tid, ...msg] = ctx.message.text.split(" ");
  const t = getTicket(tid);

  if (!t) return ctx.reply("not found");

  ctx.telegram.sendMessage(t.userId, msg.join(" "));
  closeTicket(tid);

  ctx.reply("sent");
});

// ================= SERVER =================
app.get("/", (req, res) => res.send("Bot OK"));

app.listen(process.env.PORT || 3000);

bot.launch();

console.log("BOT RUNNING");