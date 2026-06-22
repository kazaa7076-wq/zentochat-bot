const queue = new Set();
const chats = new Map();

// ذخیره در صف
function queueUser(userId) {
  queue.add(userId);
}

// حذف از صف
function removeFromQueue(userId) {
  queue.delete(userId);
}

// چک صف
function isInQueue(userId) {
  return queue.has(userId);
}

// پیدا کردن نفر
function findBestPartner(userId) {
  for (const id of queue) {
    if (id !== userId) return id;
  }
  return null;
}

// شروع چت
function startChat(u1, u2) {
  queue.delete(u1);
  queue.delete(u2);

  chats.set(u1, u2);
  chats.set(u2, u1);
}

// گرفتن پارتنر
function getPartner(userId) {
  return chats.get(userId);
}

// پایان چت
function endChat(userId) {
  const partner = chats.get(userId);
  chats.delete(userId);
  chats.delete(partner);
  return partner;
}

// چک چت
function isInChat(userId) {
  return chats.has(userId);
}

module.exports = {
  queueUser,
  removeFromQueue,
  isInQueue,
  findBestPartner,
  startChat,
  getPartner,
  endChat,
  isInChat
};