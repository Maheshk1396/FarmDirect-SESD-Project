// backend/src/controllers/categoryController.js
const { memoryStore } = require('../config/db');
const { successResponse } = require('../utils/response');

// GET /api/categories
const getCategories = (req, res) => {
  const activeCategories = memoryStore.categories.filter(c => c.isActive !== false);

  // Attach product counts
  const result = activeCategories.map(cat => {
    const count = memoryStore.products.filter(
      p => p.categoryId === cat.id && p.isPublished && p.isAvailable
    ).length;
    return {
      ...cat,
      productCount: count,
    };
  });

  return successResponse(res, 'Categories retrieved', result);
};

module.exports = {
  getCategories,
};
