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