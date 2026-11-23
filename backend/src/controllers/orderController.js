// backend/src/controllers/orderController.js
const { memoryStore } = require('../config/db');
const { calculateCartDetails } = require('./cartController');
const { successResponse, errorResponse } = require('../utils/response');

// POST /api/orders (Create order from cart)
const createOrder = (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address, paymentMethod = 'COD', notes } = req.body;

    // Validate address
    if (!address || !address.fullName || !address.phone || !address.street || !address.city || !address.pinCode) {
      return errorResponse(res, 'A complete delivery address with PIN code and mobile number is required.', 400);
    }

    const cartItems = memoryStore.carts[userId] || [];
    if (cartItems.length === 0) {
      return errorResponse(res, 'Your cart is empty. Please add items before placing an order.', 400);
    }

    // Backend price recalculation (Never trust client prices)
    const cartDetails = calculateCartDetails(cartItems);
    if (cartDetails.items.length === 0) {
      return errorResponse(res, 'Items in your cart are currently unavailable.', 400);
    }

    // Check stock availability
    for (const item of cartDetails.items) {
      const product = memoryStore.products.find(p => p.id === item.productId);
      if (!product || product.stockQuantity < item.quantity) {
        return errorResponse(res, `Insufficient stock for ${item.name}. Available: ${product?.stockQuantity || 0}`, 400);
      }
    }

    // Save or use address
    let addressId = address.id;
    if (!addressId) {
      addressId = `addr-${Date.now()}`;
      const newAddress = {
        id: addressId,
        userId,
        fullName: address.fullName,
        phone: address.phone,
        houseNumber: address.houseNumber || '',
        street: address.street,
        landmark: address.landmark || '',
        city: address.city,
        district: address.district || address.city,
        state: address.state || 'India',
        pinCode: address.pinCode,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.addresses.push(newAddress);
    }

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `FD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Build order items
    const orderItems = cartDetails.items.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      orderId,
      productId: item.productId,
      farmerId: item.farmerId,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.itemTotal,
      productName: item.name,
      imageUrl: item.imageUrl,
      unit: item.unit,
      createdAt: new Date(),
    }));

    // Multi-farmer fulfillment breakdown
    const farmerFulfillments = cartDetails.farmerBreakdown.map((group, idx) => ({
      id: `ful-${Date.now()}-${idx}`,
      orderId,
      farmerId: group.farmerId,
      farmName: group.farmName,
      subtotal: group.farmerSubtotal,
      status: 'PLACED',
      trackingNumber: `FD-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      courierName: 'FarmDirect Priority Courier',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const newOrder = {
      id: orderId,
      orderNumber,
      userId,
      addressId,
      address: {
        ...address,
        id: addressId,
      },
      items: orderItems,
      fulfillments: farmerFulfillments,
      totalAmount: cartDetails.subtotal,
      deliveryCharge: cartDetails.deliveryCharge,
      grandTotal: cartDetails.grandTotal,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: paymentMethod.toUpperCase() === 'COD' ? 'PENDING' : 'PENDING',
      status: 'PLACED',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.orders.unshift(newOrder);

    // Deduct stock
    for (const item of cartDetails.items) {
      const product = memoryStore.products.find(p => p.id === item.productId);
      if (product) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        if (product.stockQuantity === 0) {
          product.isAvailable = false;
        }
      }
    }

    // Clear cart after order creation
    memoryStore.carts[userId] = [];

    // Create notifications
    memoryStore.notifications.push({
      id: `notif-${Date.now()}`,
      userId,
      title: 'Order Placed Successfully!',
      message: `Your order #${orderNumber} for ₹${cartDetails.grandTotal} has been placed.`,
      type: 'ORDER',
      isRead: false,
      link: `/order-tracking.html?id=${orderId}`,
      createdAt: new Date(),
    });

    return successResponse(res, 'Order placed successfully', newOrder, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders (Customer orders or Farmer orders)
const getOrders = (req, res) => {
  const user = req.user;

  if (user.role === 'FARMER') {
    const farmerId = user.farmerProfile?.id;
    if (!farmerId) return errorResponse(res, 'Farmer profile not found', 404);

    // Filter orders containing items for this farmer
    const farmerOrders = [];
    for (const ord of memoryStore.orders) {
      const relevantItems = ord.items.filter(it => it.farmerId === farmerId);
      if (relevantItems.length > 0) {
        const fulfillment = ord.fulfillments.find(f => f.farmerId === farmerId);
        farmerOrders.push({
          id: ord.id,
          orderNumber: ord.orderNumber,
          createdAt: ord.createdAt,
          paymentStatus: ord.paymentStatus,
          paymentMethod: ord.paymentMethod,
          fulfillmentStatus: fulfillment ? fulfillment.status : ord.status,
          customerName: ord.address?.fullName || 'Customer',
          customerCity: ord.address?.city,
          deliveryAddress: ord.address,
          items: relevantItems,
          farmerSubtotal: relevantItems.reduce((acc, it) => acc + it.totalPrice, 0),
          trackingNumber: fulfillment?.trackingNumber,
          courierName: fulfillment?.courierName,
        });
      }
    }
    return successResponse(res, 'Farmer incoming orders retrieved', farmerOrders);
  }

  // Customer Orders
  const customerOrders = memoryStore.orders
    .filter(o => o.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return successResponse(res, 'Order history retrieved', customerOrders);
};

// GET /api/orders/:id
const getOrderById = (req, res) => {
  const { id } = req.params;
  const order = memoryStore.orders.find(o => o.id === id || o.orderNumber === id);

  if (!order) {
    return errorResponse(res, 'Order not found', 404);
  }

  // Authorization check
  if (req.user.role === 'CUSTOMER' && order.userId !== req.user.id) {
    return errorResponse(res, 'Unauthorized to view this order', 403);
  }

  return successResponse(res, 'Order details retrieved', order);
};

// PATCH /api/orders/:id/status (Farmer or Admin status update)
const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, courierName } = req.body;
  const user = req.user;

  const validStatuses = ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return errorResponse(res, `Invalid order status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  const order = memoryStore.orders.find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    return errorResponse(res, 'Order not found', 404);
  }

  if (user.role === 'FARMER') {
    const farmerId = user.farmerProfile?.id;
    const fulfillment = order.fulfillments.find(f => f.farmerId === farmerId);
    if (!fulfillment) {
      return errorResponse(res, 'No items belonging to your farm in this order', 403);
    }
    fulfillment.status = status;
    if (trackingNumber) fulfillment.trackingNumber = trackingNumber;
    if (courierName) fulfillment.courierName = courierName;
    fulfillment.updatedAt = new Date();

    // If all fulfillments are delivered, mark overall order delivered
    const allDelivered = order.fulfillments.every(f => f.status === 'DELIVERED');
    if (allDelivered) order.status = 'DELIVERED';
    else if (status === 'SHIPPED') order.status = 'SHIPPED';
    else if (status === 'PROCESSING') order.status = 'PROCESSING';

    order.updatedAt = new Date();

    return successResponse(res, `Fulfillment status updated to ${status}`, order);
  }

  if (user.role === 'ADMIN') {
    order.status = status;
    order.fulfillments.forEach(f => { f.status = status; });
    order.updatedAt = new Date();
    return successResponse(res, `Order status updated to ${status}`, order);
  }

  return errorResponse(res, 'Unauthorized to update order status', 403);
};

// POST /api/orders/:id/cancel (Customer cancel)
const cancelOrder = (req, res) => {
  const { id } = req.params;
  const order = memoryStore.orders.find(o => o.id === id && o.userId === req.user.id);

  if (!order) {
    return errorResponse(res, 'Order not found', 404);
  }

  if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
    return errorResponse(res, 'Order has already been dispatched and cannot be cancelled directly.', 400);
  }

  order.status = 'CANCELLED';
  order.fulfillments.forEach(f => { f.status = 'CANCELLED'; });
  order.updatedAt = new Date();

  // Restore inventory
  for (const item of order.items) {
    const product = memoryStore.products.find(p => p.id === item.productId);
    if (product) {
      product.stockQuantity += item.quantity;
      product.isAvailable = true;
    }
  }

  return successResponse(res, 'Order cancelled successfully. Stock has been restored.', order);
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
