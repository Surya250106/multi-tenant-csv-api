const { pool } = require('../src/db/database');

module.exports = async () => {
  await pool.end();
};
