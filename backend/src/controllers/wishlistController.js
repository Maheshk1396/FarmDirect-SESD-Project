// backend/src/controllers/wishlistController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/wishlist
const getWishlist = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const wishlistProductIds = memoryStore.wishlists[userId] || [];

  const items = wishlistProductIds
    .map(pId => {
      const product = memoryStore.products.find(p => p.id === pId && p.isPublished);
      if (!product) return null;
      const farmer = memoryStore.farmerProfiles.find(f => f.id === product.farmerId);
      return {
        ...product,
        farmerName: farmer?.farmName || 'Verified Farm',
        farmerDistrict: farmer?.district,
      };
    })
    .filter(Boolean);

  return successResponse(res, 'Wishlist retrieved', items);
};

// POST /api/wishlist (Toggle product in wishlist)
const toggleWishlist = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const { productId } = req.body;

  if (!productId) return errorResponse(res, 'Product ID is required', 400);

  if (!memoryStore.wishlists[userId]) {
    memoryStore.wishlists[userId] = [];
  }

  const index = memoryStore.wishlists[userId].indexOf(productId);
  let added = false;

  if (index > -1) {
    memoryStore.wishlists[userId].splice(index, 1);
    added = false;
  } else {
    memoryStore.wishlists[userId].push(productId);
    added = true;
  }

  return successResponse(
    res,
    added ? 'Added to wishlist' : 'Removed from wishlist',
    { productId, isWishlisted: added, totalCount: memoryStore.wishlists[userId].length }
  );
};

// DELETE /api/wishlist/:productId
const removeWishlist = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const { productId } = req.params;

  if (memoryStore.wishlists[userId]) {
    memoryStore.wishlists[userId] = memoryStore.wishlists[userId].filter(id => id !== productId);
  }

  return successResponse(res, 'Removed from wishlist', {
    productId,
    totalCount: memoryStore.wishlists[userId]?.length || 0,
  });
};

module.exports = {
  getWishlist,
  toggleWishlist,
  removeWishlist,
};
