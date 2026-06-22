const queue = new Set();
const chats = new Map();

function queueUser(id) {
  queue.add(id);
}

function removeFromQueue(id) {
  queue.delete(id);
}

function isInChat(id) {
  return chats.has(id);
}

function getPartner(id) {
  return chats.get(id);
}

function startChat(a, b) {
  chats.set(a, b);
  chats.set(b, a);
}

function endChat(id) {
  const p = chats.get(id);
  chats.delete(id);
  chats.delete(p);
  return p;
}

function findBestPartner(id, getUser) {
  const me = getUser(id);
  if (!me) return null;

  for (const pId of queue) {
    if (pId === id) continue;

    const p = getUser(pId);
    if (!p) continue;

    if (me.preference !== "all" && p.gender !== me.preference) continue;
    if (p.preference !== "all" && p.gender !== me.gender) continue;

    return pId;
  }

  return null;
}

module.exports = {
  queueUser,
  removeFromQueue,
  isInChat,
  getPartner,
  startChat,
  endChat,
  findBestPartner
};