const waitingUsers = [];
const activeChats = {};

function addToQueue(userId) {

  if (
    waitingUsers.includes(userId)
  ) {
    return null;
  }

  if (waitingUsers.length > 0) {

    const partner = waitingUsers.shift();

    activeChats[userId] = partner;
    activeChats[partner] = userId;

    return partner;
  }

  waitingUsers.push(userId);

  return null;
}

function getPartner(userId) {
  return activeChats[userId];
}

function disconnect(userId) {

  const partner =
    activeChats[userId];

  if (!partner) return null;

  delete activeChats[userId];
  delete activeChats[partner];

  return partner;
}

function isChatting(userId) {
  return !!activeChats[userId];
}

function removeWaiting(userId) {

  const index =
    waitingUsers.indexOf(userId);

  if (index !== -1) {
    waitingUsers.splice(index, 1);
  }
}

module.exports = {
  addToQueue,
  getPartner,
  disconnect,
  isChatting,
  removeWaiting
};