const spamMap = {};

function checkSpam(userId) {

  const now = Date.now();

  if (!spamMap[userId]) {

    spamMap[userId] = {
      count: 1,
      last: now
    };

    return false;
  }

  const diff =
    now - spamMap[userId].last;

  if (diff < 1000) {

    spamMap[userId].count++;

    if (
      spamMap[userId].count > 8
    ) {
      return true;
    }

  } else {

    spamMap[userId].count = 1;
  }

  spamMap[userId].last = now;

  return false;
}

module.exports = {
  checkSpam
};