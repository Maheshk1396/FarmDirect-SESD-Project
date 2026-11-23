// backend/src/controllers/adminController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/admin/stats
const getAdminStats = (req, res) => {
  const totalUsers = memoryStore.users.length;
  const totalFarmers = memoryStore.farmerProfiles.length;
  const verifiedFarmers = memoryStore.farmerProfiles.filter(f => f.verificationStatus === 'VERIFIED').length;
  const pendingFarmers = memoryStore.farmerProfiles.filter(f => f.verificationStatus === 'PENDING').length;
  const totalProducts = memoryStore.products.length;
  const totalOrders = memoryStore.orders.length;
  const totalGMV = memoryStore.orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((acc, o) => acc + o.grandTotal, 0);

  return successResponse(res, 'Admin overview statistics', {
    totalUsers,
    totalFarmers,
    verifiedFarmers,
    pendingFarmers,
    totalProducts,
    totalOrders,
    totalGMV: Math.round(totalGMV * 100) / 100,
  });
};

// GET /api/admin/users
const getUsers = (req, res) => {
  const users = memoryStore.users.map(u => {
    const { passwordHash, ...safeUser } = u;
    const farmer = memoryStore.farmerProfiles.find(f => f.userId === u.id);
    const customer = memoryStore.customerProfiles.find(c => c.userId === u.id);
    return {
      ...safeUser,
      displayName: customer?.fullName || farmer?.farmName || u.email.split('@')[0],
      farmerProfile: farmer || null,
    };
  });

  return successResponse(res, 'Users retrieved', users);
};

// GET /api/admin/farmers/pending
const getPendingFarmers = (req, res) => {
  const pending = memoryStore.farmerProfiles.filter(f => f.verificationStatus === 'PENDING');
  return successResponse(res, 'Pending farmer applications', pending);
};

// PATCH /api/admin/farmers/:id/verify
const verifyFarmer = (req, res) => {
  const { id } = req.params;
  const { status, isOrganicCertified, certificationNumber } = req.body;

  const farmer = memoryStore.farmerProfiles.find(f => f.id === id);
  if (!farmer) {
    return errorResponse(res, 'Farmer profile not found', 404);
  }

  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
    return errorResponse(res, 'Status must be VERIFIED, REJECTED, or PENDING', 400);
  }

  farmer.verificationStatus = status;
  if (isOrganicCertified !== undefined) {
    farmer.isOrganicCertified = isOrganicCertified === true || isOrganicCertified === 'true';
  }
  if (certificationNumber) {
    farmer.certificationNumber = certificationNumber;
  }
  farmer.updatedAt = new Date();

  // Create notification for farmer user
  memoryStore.notifications.push({
    id: `notif-${Date.now()}`,
    userId: farmer.userId,
    title: `Farmer Profile ${status === 'VERIFIED' ? 'Approved!' : 'Status Updated'}`,
    message: status === 'VERIFIED'
      ? 'Congratulations! Your farm profile has been verified. You now have the Verified Farmer badge.'
      : 'Your farmer profile application status has been updated to ' + status,
    type: 'VERIFICATION',
    isRead: false,
    createdAt: new Date(),
  });

  return successResponse(res, `Farmer status successfully updated to ${status}`, farmer);
};

module.exports = {
  getAdminStats,
  getUsers,
  getPendingFarmers,
  verifyFarmer,
};
