// backend/src/controllers/reviewController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// POST /api/reviews
const createReview = (req, res) => {
  const userId = req.user.id;
  const { productId, farmerId, rating, comment } = req.body;

  if (!rating || !comment) {
    return errorResponse(res, 'Rating (1-5) and comment are required.', 400);
  }

  const numRating = parseInt(rating, 10);
  if (numRating < 1 || numRating > 5) {
    return errorResponse(res, 'Rating must be between 1 and 5.', 400);
  }

  // Find product or farmer
  let targetProduct = null;
  let targetFarmer = null;

  if (productId) {
    targetProduct = memoryStore.products.find(p => p.id === productId);
    if (!targetProduct) return errorResponse(res, 'Product not found', 404);
    targetFarmer = memoryStore.farmerProfiles.find(f => f.id === targetProduct.farmerId);
  } else if (farmerId) {
    targetFarmer = memoryStore.farmerProfiles.find(f => f.id === farmerId);
    if (!targetFarmer) return errorResponse(res, 'Farmer not found', 404);
  } else {
    return errorResponse(res, 'Either productId or farmerId is required.', 400);
  }

  // Check verified purchase
  const hasOrdered = memoryStore.orders.some(
    o => o.userId === userId && o.items.some(i => (targetProduct && i.productId === targetProduct.id) || (targetFarmer && i.farmerId === targetFarmer.id))
  );

  const reviewId = `rev-${Date.now()}`;
  const newReview = {
    id: reviewId,
    productId: targetProduct ? targetProduct.id : null,
    farmerId: targetFarmer ? targetFarmer.id : null,
    userId,
    userName: req.user.customerProfile?.fullName || req.user.email.split('@')[0],
    rating: numRating,
    comment,
    isVerifiedPurchase: hasOrdered,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryStore.reviews.unshift(newReview);

  // Recalculate average rating
  if (targetProduct) {
    const prodReviews = memoryStore.reviews.filter(r => r.productId === targetProduct.id);
    const avg = prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length;
    targetProduct.averageRating = Math.round(avg * 10) / 10;
    targetProduct.reviewCount = prodReviews.length;
  }

  if (targetFarmer) {
    const farmReviews = memoryStore.reviews.filter(r => r.farmerId === targetFarmer.id);
    const avg = farmReviews.reduce((acc, r) => acc + r.rating, 0) / farmReviews.length;
    targetFarmer.rating = Math.round(avg * 10) / 10;
    targetFarmer.totalReviews = farmReviews.length;
  }

  return successResponse(res, 'Review submitted successfully!', newReview, 201);
};

// GET /api/reviews
const getReviews = (req, res) => {
  const { productId, farmerId } = req.query;
  let list = memoryStore.reviews;

  if (productId) {
    list = list.filter(r => r.productId === productId);
  } else if (farmerId) {
    list = list.filter(r => r.farmerId === farmerId);
  }

  return successResponse(res, 'Reviews retrieved', list);
};

module.exports = {
  createReview,
  getReviews,
};
