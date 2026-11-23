// backend/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const sendTokenResponse = (res, user, statusCode = 200, message = 'Success') => {
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.customerProfile?.fullName || user.farmerProfile?.farmName || user.email.split('@')[0],
      farmerProfile: user.farmerProfile || null,
      customerProfile: user.customerProfile || null,
    },
  });
};

module.exports = {
  generateToken,
  verifyToken,
  sendTokenResponse,
};
