const users = new Map();

function addUser(userId, data) {
  users.set(userId, {
    name: data.name || "",
    age: data.age || "",
    gender: data.gender || "",
    bio: data.bio || "",
    preference: data.preference || "all",
    vipUntil: data.vipUntil || 0,
    coins: data.coins || 0
  });
}

function getUser(userId) {
  return users.get(userId);
}

function updateUser(userId, data) {
  const old = users.get(userId) || {};
  users.set(userId, { ...old, ...data });
}

module.exports = {
  addUser,
  getUser,
  updateUser
};