if (userState[userId]) {
  const state = userState[userId];
async function connectUser(ctx, userId) {
  const partnerId = findBestPartner(userId, getUser);

  if (!partnerId) {
    queueUser(userId);
    return ctx.reply("🔎 در حال جستجو...");
  }

  removeFromQueue(partnerId);
  startChat(userId, partnerId);

  const me = getUser(userId);
  const p = getUser(partnerId);

  await safeSend(
    userId,
`✅ وصل شدی!

👤 پروفایل طرف مقابل:
نام: ${p.name}
سن: ${p.age}
جنسیت: ${p.gender}
بیو: ${p.bio || "-"}`,
    mainKeyboard()
  );

  await safeSend(
    partnerId,
`✅ وصل شدی!

👤 پروفایل طرف مقابل:
نام: ${me.name}
سن: ${me.age}
جنسیت: ${me.gender}
بیو: ${me.bio || "-"}`,
    mainKeyboard()
  );
}
  if (state.step === "name") {
    state.name = text.trim();
    state.step = "age";
    return ctx.reply("🎂 سنت رو بفرست:");
  }
if (userState[userId]) {
  const state = userState[userId];

  if (state.step === "name") {
    state.name = text.trim();
    state.step = "age";
    return ctx.reply("🎂 سنت رو بفرست:");
  }

  if (state.step === "age") {
    state.age = text.trim();
    state.step = "bio";
    return ctx.reply("✍️ بیوگرافی خودتو بنویس:");
  }

  if (state.step === "bio") {
    state.bio = text.trim();
    state.step = "gender";
    return ctx.reply("👤 جنسیتت رو انتخاب کن:", genderKeyboard());
  }

  if (state.step === "gender") {
    const gender = text.trim();

    addUser(userId, {
      name: state.name,
      age: state.age,
      gender,
      bio: state.bio || "",
      preference: "all"
    });

    delete userState[userId];

    return ctx.reply(
      "✅ ثبت‌نام کامل شد.\nاز منو برای شروع چت استفاده کن.",
      mainKeyboard()
    );
  }
}
  if (state.step === "age") {
    state.age = text.trim();
    state.step = "bio";
    return ctx.reply("✍️ حالا بیوگرافی خودتو بنویس:");
  }

  if (state.step === "bio") {
    state.bio = text.trim();
    state.step = "gender";
    return ctx.reply("👤 جنسیتت رو انتخاب کن:", genderKeyboard());
  }

  if (state.step === "gender") {
    const gender = text.trim();

    addUser(userId, {
      name: state.name,
      age: state.age,
      gender,
      bio: state.bio || "",
      preference: "all"
    });

    if (state.referrer) {
      const ok = setReferredBy(userId, state.referrer);
      if (ok) {
        giveReferralReward(state.referrer, userId);
      }
    }

    delete userState[userId];

    return ctx.reply(
      "✅ ثبت‌نام کامل شد.\nاز منوی پایین می‌تونی چت رو شروع کنی.",
      mainKeyboard()
    );
  }
}