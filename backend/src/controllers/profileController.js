// backend/src/controllers/profileController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/profile
const getProfile = (req, res) => {
  const user = req.user;
  const addresses = memoryStore.addresses.filter(a => a.userId === user.id);
  const farmerProfile = memoryStore.farmerProfiles.find(f => f.userId === user.id);
  const customerProfile = memoryStore.customerProfiles.find(c => c.userId === user.id);

  return successResponse(res, 'Profile retrieved', {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    farmerProfile: farmerProfile || null,
    customerProfile: customerProfile || null,
    addresses,
  });
};

// PUT /api/profile
const updateProfile = (req, res) => {
  const user = req.user;
  const { fullName, phone, bio, farmName, farmAddress, district, state, pinCode, latitude, longitude, farmingCategory } = req.body;

  if (phone) {
    const userInDb = memoryStore.users.find(u => u.id === user.id);
    if (userInDb) userInDb.phone = phone;
  }

  if (user.role === 'FARMER') {
    const farmer = memoryStore.farmerProfiles.find(f => f.userId === user.id);
    if (farmer) {
      if (farmName) farmer.farmName = farmName;
      if (bio) farmer.bio = bio;
      if (farmAddress) farmer.farmAddress = farmAddress;
      if (district) farmer.district = district;
      if (state) farmer.state = state;
      if (pinCode) farmer.pinCode = pinCode;
      if (latitude) farmer.latitude = parseFloat(latitude);
      if (longitude) farmer.longitude = parseFloat(longitude);
      if (farmingCategory) farmer.farmingCategory = farmingCategory;
      if (req.file) farmer.farmPhoto = `/uploads/${req.file.filename}`;
      farmer.updatedAt = new Date();
    }
  } else {
    const cust = memoryStore.customerProfiles.find(c => c.userId === user.id);
    if (cust) {
      if (fullName) cust.fullName = fullName;
      if (phone) cust.phone = phone;
      if (req.file) cust.avatar = `/uploads/${req.file.filename}`;
      cust.updatedAt = new Date();
    }
  }

  return successResponse(res, 'Profile updated successfully.');
};

// POST /api/profile/addresses
const addAddress = (req, res) => {
  const userId = req.user.id;
  const { fullName, phone, houseNumber, street, landmark, city, district, state, pinCode, isDefault } = req.body;

  if (!fullName || !phone || !street || !city || !pinCode) {
    return errorResponse(res, 'Please provide all required address fields.', 400);
  }

  const newAddress = {
    id: `addr-${Date.now()}`,
    userId,
    fullName,
    phone,
    houseNumber: houseNumber || '',
    street,
    landmark: landmark || '',
    city,
    district: district || city,
    state: state || 'India',
    pinCode,
    isDefault: isDefault === true || isDefault === 'true',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (newAddress.isDefault) {
    memoryStore.addresses.forEach(a => {
      if (a.userId === userId) a.isDefault = false;
    });
  }

  memoryStore.addresses.push(newAddress);
  return successResponse(res, 'Address saved successfully', newAddress, 201);
};

// DELETE /api/profile/addresses/:id
const deleteAddress = (req, res) => {
  const { id } = req.params;
  const index = memoryStore.addresses.findIndex(a => a.id === id && a.userId === req.user.id);

  if (index === -1) {
    return errorResponse(res, 'Address not found', 404);
  }

  memoryStore.addresses.splice(index, 1);
  return successResponse(res, 'Address deleted successfully.');
};

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  deleteAddress,
};
