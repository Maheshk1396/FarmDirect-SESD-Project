// backend/src/middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { memoryStore } = require('../config/db');

const authenticate = async (req, res, next) => {
  let token;

  // Check header Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return errorResponse(res, 'Authentication required. Please login.', 401);
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return errorResponse(res, 'Invalid or expired authentication session.', 401);
  }

  // Find user in memoryStore
  const user = memoryStore.users.find(u => u.id === decoded.id);
  if (!user || !user.isActive) {
    return errorResponse(res, 'User account not found or suspended.', 401);
  }

  // Attach profile if farmer or customer
  const farmerProfile = memoryStore.farmerProfiles.find(fp => fp.userId === user.id);
  const customerProfile = memoryStore.customerProfiles.find(cp => cp.userId === user.id);

  req.user = {
    ...user,
    farmerProfile: farmerProfile || null,
    customerProfile: customerProfile || null,
  };

  next();
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = memoryStore.users.find(u => u.id === decoded.id);
      if (user) {
        const farmerProfile = memoryStore.farmerProfiles.find(fp => fp.userId === user.id);
        const customerProfile = memoryStore.customerProfiles.find(cp => cp.userId === user.id);
        req.user = {
          ...user,
          farmerProfile: farmerProfile || null,
          customerProfile: customerProfile || null,
        };
      }
    }
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, `Access denied. Requires one of [${roles.join(', ')}] roles.`, 403);
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};
