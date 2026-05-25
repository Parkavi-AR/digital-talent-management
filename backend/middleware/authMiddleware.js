const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  console.log(`\n--- AUTH MIDDLEWARE START ---`);
  console.log(`[Auth] Headers Authorization:`, req.headers.authorization ? 'Present' : 'Missing');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log(`[Auth] Token extracted from header.`);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`[Auth] Decoded token payload:`, decoded);

      req.user = await User.findById(decoded.id).select('-password');
      console.log(`[Auth] User fetched from DB:`, req.user ? `${req.user.name} (Role: ${req.user.role})` : 'NULL');

      if (!req.user) {
        console.warn(`[Auth Warning] Token is valid but user does not exist in DB.`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(`[Auth Error] Token verification failed:`, error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.warn(`[Auth Warning] No token provided in header.`);
  }

  if (!token) {
    console.log(`--- AUTH MIDDLEWARE END (FAILED) ---\n`);
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  console.log(`--- AUTH MIDDLEWARE END (SUCCESS) ---\n`);
};

const admin = (req, res, next) => {
  console.log(`\n--- ADMIN MIDDLEWARE START ---`);
  console.log(`[Admin Check] Req User object exists:`, !!req.user);
  if (req.user) {
    console.log(`[Admin Check] Req User Role: '${req.user.role}'`);
  }

  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    console.log(`[Admin Check] Passed.`);
    console.log(`--- ADMIN MIDDLEWARE END ---\n`);
    next();
  } else {
    console.warn(`[Admin Check] Failed. User is not an admin.`);
    console.log(`--- ADMIN MIDDLEWARE END ---\n`);
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };