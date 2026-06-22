const {
  getUserCount
} = require("../database/db");

async function getStats() {

  const users =
    await getUserCount();

  return {
    totalUsers: users
  };
}

module.exports = {
  getStats
};