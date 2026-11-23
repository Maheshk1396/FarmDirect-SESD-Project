// backend/src/controllers/cartController.js
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to compute calculated cart with DB prices and multi-farmer breakdown
function calculateCartDetails(items) {
  let subtotal = 0;
  const enrichedItems = [];
  const farmerGroups = {};

  for (const item of items) {
    const product = memoryStore.products.find(p => p.id === item.productId && p.isPublished);
    if (!product) continue;

    const quantity = Math.max(1, parseFloat(item.quantity) || 1);
    const itemTotal = Math.round(product.price * quantity * 100) / 100;
    subtotal += itemTotal;

    const farmer = memoryStore.farmerProfiles.find(f => f.id === product.farmerId);
    const farmerName = farmer ? farmer.farmName : 'Local Farm';

    const enrichedItem = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      unit: product.unit,
      stockQuantity: product.stockQuantity,
      imageUrl: product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300',
      farmerId: product.farmerId,
      farmerName,
      farmerDistrict: farmer?.district,
      quantity,
      itemTotal,
      isAvailable: product.isAvailable && product.stockQuantity >= quantity,
    };

    enrichedItems.push(enrichedItem);

    // Group by farmer
    if (!farmerGroups[product.farmerId]) {
      farmerGroups[product.farmerId] = {
        farmerId: product.farmerId,
        farmName: farmerName,
        district: farmer?.district,
        items: [],
        farmerSubtotal: 0,
      };
    }
    farmerGroups[product.farmerId].items.push(enrichedItem);
    farmerGroups[product.farmerId].farmerSubtotal = Math.round((farmerGroups[product.farmerId].farmerSubtotal + itemTotal) * 100) / 100;
  }

  // Delivery charge calculation: ₹40 flat or Free if subtotal > ₹500
  const deliveryCharge = subtotal > 500 || subtotal === 0 ? 0 : 49.00;
  const grandTotal = Math.round((subtotal + deliveryCharge) * 100) / 100;

  return {
    items: enrichedItems,
    farmerBreakdown: Object.values(farmerGroups),
    itemCount: enrichedItems.reduce((acc, it) => acc + it.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryCharge,
    grandTotal,
    currency: 'INR',
    symbol: '₹',
  };
}

// GET /api/cart
const getCart = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const cartItems = memoryStore.carts[userId] || [];
  const calculated = calculateCartDetails(cartItems);
  return successResponse(res, 'Cart retrieved', calculated);
};

// POST /api/cart/items (Add to cart)
const addToCart = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return errorResponse(res, 'Product ID is required', 400);
  }

  const product = memoryStore.products.find(p => p.id === productId && p.isPublished);
  if (!product) {
    return errorResponse(res, 'Product not found or unavailable', 404);
  }

  if (!memoryStore.carts[userId]) {
    memoryStore.carts[userId] = [];
  }

  const qty = Math.max(1, parseFloat(quantity));
  const existing = memoryStore.carts[userId].find(i => i.productId === productId);

  if (existing) {
    existing.quantity = Math.min(product.stockQuantity, existing.quantity + qty);
  } else {
    memoryStore.carts[userId].push({
      productId,
      quantity: Math.min(product.stockQuantity, qty),
    });
  }

  const calculated = calculateCartDetails(memoryStore.carts[userId]);
  return successResponse(res, `${product.name} added to cart`, calculated);
};

// PUT /api/cart/items/:productId (Update quantity)
const updateCartItem = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!memoryStore.carts[userId]) {
    memoryStore.carts[userId] = [];
  }

  const qty = parseFloat(quantity);
  const existingIndex = memoryStore.carts[userId].findIndex(i => i.productId === productId);

  if (existingIndex === -1) {
    return errorResponse(res, 'Item not found in cart', 404);
  }

  if (qty <= 0) {
    memoryStore.carts[userId].splice(existingIndex, 1);
  } else {
    const product = memoryStore.products.find(p => p.id === productId);
    memoryStore.carts[userId][existingIndex].quantity = product ? Math.min(product.stockQuantity, qty) : qty;
  }

  const calculated = calculateCartDetails(memoryStore.carts[userId]);
  return successResponse(res, 'Cart updated', calculated);
};

// DELETE /api/cart/items/:productId (Remove item)
const removeCartItem = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  const { productId } = req.params;

  if (memoryStore.carts[userId]) {
    memoryStore.carts[userId] = memoryStore.carts[userId].filter(i => i.productId !== productId);
  }

  const calculated = calculateCartDetails(memoryStore.carts[userId] || []);
  return successResponse(res, 'Item removed from cart', calculated);
};

// DELETE /api/cart (Clear whole cart)
const clearCart = (req, res) => {
  const userId = req.user?.id || req.headers['x-guest-session'] || 'guest';
  memoryStore.carts[userId] = [];
  const calculated = calculateCartDetails([]);
  return successResponse(res, 'Cart cleared', calculated);
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  calculateCartDetails,
};
