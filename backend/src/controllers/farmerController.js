// backend/src/controllers/farmerController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Haversine formula to calculate distance in km between two lat/lng points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/farmers
const getFarmers = (req, res) => {
  const { search, state, verified, organic } = req.query;

  let list = [...memoryStore.farmerProfiles];

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(f =>
      f.farmName.toLowerCase().includes(s) ||
      f.district.toLowerCase().includes(s) ||
      f.state.toLowerCase().includes(s) ||
      (f.farmingCategory && f.farmingCategory.toLowerCase().includes(s))
    );
  }

  if (state) {
    list = list.filter(f => f.state.toLowerCase() === state.toLowerCase());
  }

  if (verified === 'true') {
    list = list.filter(f => f.verificationStatus === 'VERIFIED');
  }

  if (organic === 'true') {
    list = list.filter(f => f.isOrganicCertified === true);
  }

  // Hide private sensitive info
  const sanitized = list.map(f => {
    const { bankAccountName, bankAccountNumber, bankIfscCode, ...publicInfo } = f;
    const productCount = memoryStore.products.filter(p => p.farmerId === f.id && p.isPublished).length;
    return {
      ...publicInfo,
      productCount,
    };
  });

  return successResponse(res, 'Farmers retrieved successfully', sanitized);
};

// GET /api/farmers/nearby
const getNearbyFarmers = (req, res) => {
  const { lat, lng, radius = 500, verified, organic } = req.query;

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  if (isNaN(userLat) || isNaN(userLng)) {
    return errorResponse(res, 'Valid latitude and longitude are required.', 400);
  }

  let list = memoryStore.farmerProfiles.filter(f => f.latitude && f.longitude);

  if (verified === 'true') {
    list = list.filter(f => f.verificationStatus === 'VERIFIED');
  }

  if (organic === 'true') {
    list = list.filter(f => f.isOrganicCertified === true);
  }

  const farmersWithDistance = list.map(f => {
    const dist = calculateDistance(userLat, userLng, f.latitude, f.longitude);
    const { bankAccountName, bankAccountNumber, bankIfscCode, ...publicInfo } = f;
    const productCount = memoryStore.products.filter(p => p.farmerId === f.id && p.isPublished).length;
    return {
      ...publicInfo,
      distanceKm: dist,
      productCount,
    };
  });

  // Filter by radius & sort by closest
  const filtered = farmersWithDistance
    .filter(f => f.distanceKm <= parseFloat(radius))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return successResponse(res, 'Nearby farmers retrieved', filtered);
};

// GET /api/farmers/:id
const getFarmerById = (req, res) => {
  const { id } = req.params;
  const farmer = memoryStore.farmerProfiles.find(f => f.id === id || f.userId === id);

  if (!farmer) {
    return errorResponse(res, 'Farmer profile not found.', 404);
  }

  const { bankAccountName, bankAccountNumber, bankIfscCode, ...publicInfo } = farmer;
  const products = memoryStore.products.filter(p => p.farmerId === farmer.id && p.isPublished);
  const reviews = memoryStore.reviews.filter(r => r.farmerId === farmer.id);

  return successResponse(res, 'Farmer profile retrieved', {
    ...publicInfo,
    productCount: products.length,
    products,
    reviews,
  });
};

// GET /api/farmers/:id/products
const getFarmerProducts = (req, res) => {
  const { id } = req.params;
  const farmer = memoryStore.farmerProfiles.find(f => f.id === id || f.userId === id);
  if (!farmer) {
    return errorResponse(res, 'Farmer not found.', 404);
  }

  const products = memoryStore.products.filter(
    p => p.farmerId === farmer.id && p.isPublished && p.isAvailable
  );

  return successResponse(res, `Products for ${farmer.farmName}`, products);
};

module.exports = {
  getFarmers,
  getNearbyFarmers,
  getFarmerById,
  getFarmerProducts,
};
