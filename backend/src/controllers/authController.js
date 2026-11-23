// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const { memoryStore } = require('../config/db');
const { sendTokenResponse } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      role = 'CUSTOMER',
      email,
      phone,
      password,
      fullName,
      // Farmer specific fields
      farmName,
      farmAddress,
      district,
      state,
      pinCode,
      farmingCategory,
      experienceYears,
      latitude,
      longitude,
    } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 400);
    }

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
    const existingUser = memoryStore.users.find(u => u.email === normalizedEmail);
    if (existingUser) {
      return errorResponse(res, 'An account with this email already exists.', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;

    const newUser = {
      id: userId,
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
      role: role.toUpperCase() === 'FARMER' ? 'FARMER' : 'CUSTOMER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.users.push(newUser);

    if (newUser.role === 'FARMER') {
      const farmId = `farmer-${Date.now()}`;
      const farmerProfile = {
        id: farmId,
        userId,
        farmName: farmName || `${fullName || 'My'} Farm`,
        bio: `Organic farmer operating in ${district || 'India'}`,
        experienceYears: parseInt(experienceYears || '1', 10),
        farmPhoto: req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
        farmAddress: farmAddress || 'Farm Location',
        district: district || 'Nashik',
        state: state || 'Maharashtra',
        pinCode: pinCode || '422001',
        latitude: parseFloat(latitude || '19.9975'),
        longitude: parseFloat(longitude || '73.7898'),
        farmingCategory: farmingCategory || 'Vegetables',
        verificationStatus: 'PENDING', // Farmers require verification
        isOrganicCertified: false,
        certificationNumber: null,
        rating: 5.0,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.farmerProfiles.push(farmerProfile);
      newUser.farmerProfile = farmerProfile;
    } else {
      const customerProfile = {
        id: `prof-${Date.now()}`,
        userId,
        fullName: fullName || email.split('@')[0],
        phone: phone || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.customerProfiles.push(customerProfile);
      newUser.customerProfile = customerProfile;
      // Initialize cart & wishlist
      memoryStore.carts[userId] = [];
      memoryStore.wishlists[userId] = [];
    }

    return sendTokenResponse(
      res,
      newUser,
      201,
      newUser.role === 'FARMER'
        ? 'Farmer account registered successfully! Your account verification is under review.'
        : 'Customer registration successful!'
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { loginIdentifier, email, phone, password } = req.body;
    const identifier = (loginIdentifier || email || phone || '').toLowerCase().trim();

    if (!identifier || !password) {
      return errorResponse(res, 'Please provide an email/mobile and password.', 400);
    }

    const user = memoryStore.users.find(
      u => u.email.toLowerCase() === identifier || (u.phone && u.phone === identifier)
    );

    if (!user) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    const farmerProfile = memoryStore.farmerProfiles.find(fp => fp.userId === user.id);
    const customerProfile = memoryStore.customerProfiles.find(cp => cp.userId === user.id);

    user.farmerProfile = farmerProfile || null;
    user.customerProfile = customerProfile || null;

    return sendTokenResponse(res, user, 200, 'Logged in successfully!');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('token');
  return successResponse(res, 'Logged out successfully.');
};

// GET /api/auth/me
const getMe = (req, res) => {
  const user = req.user;
  const addresses = memoryStore.addresses.filter(a => a.userId === user.id);

  return successResponse(res, 'Current user retrieved', {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    name: user.customerProfile?.fullName || user.farmerProfile?.farmName || user.email.split('@')[0],
    farmerProfile: user.farmerProfile,
    customerProfile: user.customerProfile,
    addresses,
  });
};

// POST /api/auth/forgot-password
const forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return errorResponse(res, 'Email is required', 400);
  return successResponse(res, 'If your email is registered, password reset instructions have been sent.');
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
};
