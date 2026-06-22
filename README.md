# ZentoChat

ربات چت ناشناس تلگرام با Node.js + Telegraf + SQLite

## امکانات
- چت ناشناس تصادفی
- کاربر بعدی
- پایان چت
- ارسال متن
- ارسال عکس
- ارسال ویدیو
- ارسال ویس
- ارسال فایل
- ارسال استیکر
- گزارش کاربر
- پنل ادمین
- آمار کاربران
- Broadcast به همه کاربران
- آماده برای Render

---

## ساختار پروژه

anonymous-chat-bot/
│
├── src/
│   ├── bot.js
│   ├── config.js
│   │
│   ├── database/
│   │   └── db.js
│   │
│   ├── handlers/
│   │   ├── start.js
│   │   ├── chat.js
│   │   ├── admin.js
│   │   └── report.js
│   │
│   ├── services/
│   │   ├── matcher.js
│   │   ├── stats.js
│   │   └── antispam.js
│   │
│   ├── keyboards/
│   │   └── main.js
│   │
│   └── middlewares/
│       └── rateLimit.js
│
├── package.json
├── .env
├── render.yaml
└── README.md

---

## نصب

### 1) نصب پکیج‌ها
```bash
npm install