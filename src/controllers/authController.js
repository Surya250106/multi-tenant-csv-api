const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Parameterized query with case-insensitive email lookup to prevent SQL injection
    const result = await db.query(
      'SELECT id, tenant_id, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      // User not found - return generic 401 without revealing user existence
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Secure bcrypt comparison
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured in environment variables');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    };

    const token = jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    return res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
};
