// backend/src/controllers/productController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/products
const getProducts = (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    organic,
    verifiedOnly,
    sortBy = 'newest',
    page = 1,
    limit = 12,
  } = req.query;

  let list = memoryStore.products.filter(p => p.isPublished);

  // Search filter
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s)
    );
  }

  // Category filter
  if (category && category !== 'all') {
    const catObj = memoryStore.categories.find(c => c.slug === category || c.id === category);
    if (catObj) {
      list = list.filter(p => p.categoryId === catObj.id);
    }
  }

  // Price filter
  if (minPrice) {
    list = list.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    list = list.filter(p => p.price <= parseFloat(maxPrice));
  }

  // Organic filter
  if (organic === 'true') {
    list = list.filter(p => p.isOrganic === true);
  }

  // Verified Farmer filter
  if (verifiedOnly === 'true') {
    list = list.filter(p => {
      const farmer = memoryStore.farmerProfiles.find(f => f.id === p.farmerId);
      return farmer && farmer.verificationStatus === 'VERIFIED';
    });
  }

  // Enrich with farmer & category details
  const enriched = list.map(p => {
    const farmer = memoryStore.farmerProfiles.find(f => f.id === p.farmerId);
    const cat = memoryStore.categories.find(c => c.id === p.categoryId);
    return {
      ...p,
      categoryName: cat ? cat.name : 'Produce',
      farmer: farmer ? {
        id: farmer.id,
        farmName: farmer.farmName,
        district: farmer.district,
        state: farmer.state,
        verificationStatus: farmer.verificationStatus,
        rating: farmer.rating,
      } : null,
    };
  });

  // Sorting
  switch (sortBy) {
    case 'price-asc':
      enriched.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      enriched.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      enriched.sort((a, b) => b.averageRating - a.averageRating);
      break;
    case 'newest':
    default:
      enriched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
  }

  // Pagination
  const total = enriched.length;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = enriched.slice(startIndex, startIndex + limitNum);

  return successResponse(res, 'Products retrieved successfully', paginated, 200, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
};

// GET /api/products/:id
const getProductById = (req, res) => {
  const { id } = req.params;
  const product = memoryStore.products.find(p => p.id === id || p.slug === id);

  if (!product) {
    return errorResponse(res, 'Product not found', 404);
  }

  const farmer = memoryStore.farmerProfiles.find(f => f.id === product.farmerId);
  const category = memoryStore.categories.find(c => c.id === product.categoryId);
  const reviews = memoryStore.reviews.filter(r => r.productId === product.id);

  return successResponse(res, 'Product details retrieved', {
    ...product,
    categoryName: category ? category.name : 'Produce',
    farmer: farmer ? {
      id: farmer.id,
      farmName: farmer.farmName,
      bio: farmer.bio,
      farmAddress: farmer.farmAddress,
      district: farmer.district,
      state: farmer.state,
      pinCode: farmer.pinCode,
      verificationStatus: farmer.verificationStatus,
      rating: farmer.rating,
      farmPhoto: farmer.farmPhoto,
      isOrganicCertified: farmer.isOrganicCertified,
    } : null,
    reviews,
  });
};

// POST /api/products (Farmer Only)
const createProduct = (req, res, next) => {
  try {
    const farmer = req.user.farmerProfile;
    if (!farmer) {
      return errorResponse(res, 'Farmer profile required to add products', 403);
    }

    const {
      name,
      description,
      categoryId,
      price,
      unit = 'kg',
      stockQuantity,
      minOrderQuantity = 1,
      isOrganic = false,
      organicCertDetails,
      harvestDate,
    } = req.body;

    if (!name || !price || !stockQuantity || !categoryId) {
      return errorResponse(res, 'Name, category, price, and stock quantity are required.', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;
    const newId = `prod-${Date.now()}`;

    // Handle uploaded images or default
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          imageUrl: `/uploads/${file.filename}`,
          isPrimary: index === 0,
        });
      });
    } else if (req.body.imageUrl) {
      images.push({
        imageUrl: req.body.imageUrl,
        isPrimary: true,
      });
    } else {
      images.push({
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
        isPrimary: true,
      });
    }

    const newProduct = {
      id: newId,
      farmerId: farmer.id,
      categoryId,
      name,
      slug,
      description: description || 'Fresh harvest direct from our farm.',
      price: parseFloat(price),
      unit,
      stockQuantity: parseFloat(stockQuantity),
      minOrderQuantity: parseFloat(minOrderQuantity),
      isOrganic: isOrganic === 'true' || isOrganic === true,
      organicCertDetails: organicCertDetails || null,
      harvestDate: harvestDate || new Date().toISOString().split('T')[0],
      isAvailable: true,
      isPublished: true,
      averageRating: 5.0,
      reviewCount: 0,
      images,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.products.unshift(newProduct);

    return successResponse(res, 'Product created successfully', newProduct, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id (Farmer Only - Ownership Check)
const updateProduct = (req, res, next) => {
  try {
    const { id } = req.params;
    const farmer = req.user.farmerProfile;

    const productIndex = memoryStore.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return errorResponse(res, 'Product not found', 404);
    }

    const existingProduct = memoryStore.products[productIndex];

    // Ownership check
    if (req.user.role !== 'ADMIN' && (!farmer || existingProduct.farmerId !== farmer.id)) {
      return errorResponse(res, 'Unauthorized to update this product.', 403);
    }

    const {
      name,
      description,
      categoryId,
      price,
      unit,
      stockQuantity,
      minOrderQuantity,
      isOrganic,
      organicCertDetails,
      harvestDate,
      isPublished,
      isAvailable,
    } = req.body;

    const updated = {
      ...existingProduct,
      name: name || existingProduct.name,
      description: description !== undefined ? description : existingProduct.description,
      categoryId: categoryId || existingProduct.categoryId,
      price: price !== undefined ? parseFloat(price) : existingProduct.price,
      unit: unit || existingProduct.unit,
      stockQuantity: stockQuantity !== undefined ? parseFloat(stockQuantity) : existingProduct.stockQuantity,
      minOrderQuantity: minOrderQuantity !== undefined ? parseFloat(minOrderQuantity) : existingProduct.minOrderQuantity,
      isOrganic: isOrganic !== undefined ? (isOrganic === 'true' || isOrganic === true) : existingProduct.isOrganic,
      organicCertDetails: organicCertDetails !== undefined ? organicCertDetails : existingProduct.organicCertDetails,
      harvestDate: harvestDate || existingProduct.harvestDate,
      isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : existingProduct.isPublished,
      isAvailable: isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true) : existingProduct.isAvailable,
      updatedAt: new Date(),
    };

    if (req.files && req.files.length > 0) {
      updated.images = req.files.map((file, idx) => ({
        imageUrl: `/uploads/${file.filename}`,
        isPrimary: idx === 0,
      }));
    }

    memoryStore.products[productIndex] = updated;

    return successResponse(res, 'Product updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id (Farmer Only - Ownership Check)
const deleteProduct = (req, res) => {
  const { id } = req.params;
  const farmer = req.user.farmerProfile;

  const productIndex = memoryStore.products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return errorResponse(res, 'Product not found', 404);
  }

  const existingProduct = memoryStore.products[productIndex];
  if (req.user.role !== 'ADMIN' && (!farmer || existingProduct.farmerId !== farmer.id)) {
    return errorResponse(res, 'Unauthorized to delete this product.', 403);
  }

  memoryStore.products.splice(productIndex, 1);
  return successResponse(res, 'Product deleted successfully.');
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
