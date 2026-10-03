const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getOne } = require('../config/db');

const JWT_SECRET = env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }

    req.user = decodedUser;

    // Check forced password change flag
    // Allow password update and profile info queries to proceed
    const isExemptPath = req.baseUrl === '/api' && (
      req.path === '/auth/password' ||
      req.path === '/auth/logout' ||
      req.path === '/auth/me'
    );

    if (decodedUser.must_change_password && !isExemptPath) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required. You must update your password before accessing the system.'
      });
    }

    next();
  });
};

const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  JWT_SECRET
};
