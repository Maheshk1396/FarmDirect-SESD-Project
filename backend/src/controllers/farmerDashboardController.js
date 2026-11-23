// backend/src/controllers/farmerDashboardController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/farmer/dashboard
const getDashboardStats = (req, res) => {
  const farmer = req.user.farmerProfile;
  if (!farmer) {
    return errorResponse(res, 'Farmer profile required', 403);
  }

  const farmerId = farmer.id;

  // Farmer's products
  const products = memoryStore.products.filter(p => p.farmerId === farmerId);
  const activeProducts = products.filter(p => p.isPublished && p.isAvailable).length;

  // Farmer's orders & fulfillments
  let totalRevenue = 0;
  let totalOrders = 0;
  let pendingOrders = 0;
  const recentOrders = [];
  const productSalesMap = {};

  for (const ord of memoryStore.orders) {
    const farmerItems = ord.items.filter(it => it.farmerId === farmerId);
    if (farmerItems.length > 0) {
      totalOrders++;
      const ful = ord.fulfillments.find(f => f.farmerId === farmerId);
      const isPending = !ful || ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(ful.status);
      if (isPending) pendingOrders++;

      const subtotal = farmerItems.reduce((acc, it) => acc + it.totalPrice, 0);
      if (ord.paymentStatus === 'PAID') {
        totalRevenue += subtotal;
      }

      // Track item sales
      farmerItems.forEach(it => {
        productSalesMap[it.productId] = (productSalesMap[it.productId] || 0) + it.quantity;
      });

      recentOrders.push({
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.address?.fullName || 'Customer',
        itemCount: farmerItems.length,
        subtotal,
        status: ful ? ful.status : ord.status,
        paymentStatus: ord.paymentStatus,
        createdAt: ord.createdAt,
      });
    }
  }

  // Best selling products
  const bestSellers = products
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      imageUrl: p.images?.[0]?.imageUrl || '',
      unitsSold: productSalesMap[p.id] || 0,
      totalSalesAmount: (productSalesMap[p.id] || 0) * p.price,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  // Monthly revenue analytics simulation (last 6 months)
  const monthNames = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const monthlyRevenue = [
    Math.round(totalRevenue * 0.12),
    Math.round(totalRevenue * 0.15),
    Math.round(totalRevenue * 0.18),
    Math.round(totalRevenue * 0.22),
    Math.round(totalRevenue * 0.28),
    Math.max(1250, Math.round(totalRevenue * 0.35)),
  ];

  // Order status distribution
  const orderStats = {
    placed: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  };

  for (const ord of memoryStore.orders) {
    const ful = ord.fulfillments.find(f => f.farmerId === farmerId);
    if (ful) {
      const key = ful.status.toLowerCase();
      if (orderStats[key] !== undefined) {
        orderStats[key]++;
      }
    }
  }

  return successResponse(res, 'Farmer dashboard statistics retrieved', {
    overview: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      pendingOrders,
      activeProducts,
      monthlyEarnings: monthlyRevenue[monthlyRevenue.length - 1],
      rating: farmer.rating,
      totalReviews: farmer.totalReviews,
      verificationStatus: farmer.verificationStatus,
    },
    analytics: {
      labels: monthNames,
      monthlyRevenue,
      orderStatusDistribution: orderStats,
    },
    recentOrders: recentOrders.slice(0, 6),
    bestSellingProducts: bestSellers,
  });
};

// GET /api/farmer/earnings
const getEarnings = (req, res) => {
  const farmer = req.user.farmerProfile;
  if (!farmer) return errorResponse(res, 'Farmer profile required', 403);

  const transactions = memoryStore.transactions
    .filter(t => t.farmerId === farmer.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalEarnings = transactions
    .filter(t => t.type === 'CREDIT' && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + t.amount, 0);

  return successResponse(res, 'Earnings and transaction history retrieved', {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    availableBalance: Math.round(totalEarnings * 0.95 * 100) / 100,
    pendingSettlement: Math.round(totalEarnings * 0.05 * 100) / 100,
    bankDetails: {
      accountName: farmer.bankAccountName || farmer.farmName,
      accountNumber: farmer.bankAccountNumber ? '••••••••' + farmer.bankAccountNumber.slice(-4) : '••••••••1928',
      ifscCode: farmer.bankIfscCode || 'SBIN0004123',
    },
    transactions,
  });
};

// GET /api/farmer/inventory
const getInventory = (req, res) => {
  const farmer = req.user.farmerProfile;
  if (!farmer) return errorResponse(res, 'Farmer profile required', 403);

  const products = memoryStore.products
    .filter(p => p.farmerId === farmer.id)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      minOrderQuantity: p.minOrderQuantity,
      isAvailable: p.isAvailable,
      isPublished: p.isPublished,
      lowStock: p.stockQuantity <= 10,
      imageUrl: p.images?.[0]?.imageUrl || '',
      updatedAt: p.updatedAt,
    }));

  return successResponse(res, 'Inventory list retrieved', products);
};

// PATCH /api/farmer/inventory/:productId
const updateStock = (req, res) => {
  const farmer = req.user.farmerProfile;
  if (!farmer) return errorResponse(res, 'Farmer profile required', 403);

  const { productId } = req.params;
  const { stockQuantity, isAvailable, price } = req.body;

  const product = memoryStore.products.find(p => p.id === productId && p.farmerId === farmer.id);
  if (!product) {
    return errorResponse(res, 'Product not found in your inventory', 404);
  }

  if (stockQuantity !== undefined) {
    product.stockQuantity = Math.max(0, parseFloat(stockQuantity));
    product.isAvailable = product.stockQuantity > 0;
  }
  if (isAvailable !== undefined) {
    product.isAvailable = isAvailable === true || isAvailable === 'true';
  }
  if (price !== undefined) {
    product.price = parseFloat(price);
  }

  product.updatedAt = new Date();

  return successResponse(res, 'Inventory updated successfully', product);
};

module.exports = {
  getDashboardStats,
  getEarnings,
  getInventory,
  updateStock,
};
