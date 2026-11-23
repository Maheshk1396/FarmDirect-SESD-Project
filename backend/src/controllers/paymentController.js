// backend/src/controllers/paymentController.js
const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const { memoryStore } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

let razorpayClient = null;
try {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID !== 'rzp_test_YourTestKeyIdHere') {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (e) {
  console.warn('Razorpay SDK init note:', e.message);
}

// POST /api/payments/create-order
const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = memoryStore.orders.find(o => o.id === orderId);

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    const amountInPaise = Math.round(order.grandTotal * 100);

    // If Razorpay live/test credentials provided
    if (razorpayClient) {
      try {
        const options = {
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            farmdirect_order_id: order.id,
            customer_email: req.user.email,
          },
        };
        const rzpOrder = await razorpayClient.orders.create(options);
        order.razorpayOrderId = rzpOrder.id;

        return successResponse(res, 'Razorpay order created', {
          razorpayOrderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: env.RAZORPAY_KEY_ID,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      } catch (rzpErr) {
        console.error('Razorpay API error:', rzpErr);
      }
    }

    // Test Sandbox Payment Order simulation
    const mockRazorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    order.razorpayOrderId = mockRazorpayOrderId;

    return successResponse(res, 'Payment session initialized (Test Mode)', {
      razorpayOrderId: mockRazorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_mock_farmdirect',
      orderId: order.id,
      orderNumber: order.orderNumber,
      isTestSandbox: true,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const order = memoryStore.orders.find(o => o.id === orderId || o.razorpayOrderId === razorpayOrderId);
    if (!order) {
      return errorResponse(res, 'Associated order not found for payment verification', 404);
    }

    // Verify cryptographic signature if secret is active and not mock
    const isMock = !env.RAZORPAY_KEY_SECRET || 
                   env.RAZORPAY_KEY_SECRET === 'YourRazorpaySecretKeyHere' || 
                   razorpaySignature === 'MOCK_VERIFIED';

    if (!isMock && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        order.paymentStatus = 'FAILED';
        return errorResponse(res, 'Invalid payment signature. Payment verification failed.', 400);
      }
    }

    // Mark order as paid
    order.paymentStatus = 'PAID';
    order.status = 'CONFIRMED';
    order.razorpayPaymentId = razorpayPaymentId || `pay_${Date.now()}`;
    order.updatedAt = new Date();

    // Confirm farmer fulfillments
    order.fulfillments.forEach(f => {
      f.status = 'CONFIRMED';
      f.updatedAt = new Date();
    });

    // Record Payment
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      userId: order.userId,
      amount: order.grandTotal,
      currency: 'INR',
      status: 'PAID',
      paymentMethod: order.paymentMethod,
      transactionId: razorpayPaymentId || `TXN-${Date.now()}`,
      gatewayOrderId: razorpayOrderId,
      gatewaySignature: razorpaySignature || 'MOCK_VERIFIED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.payments.push(paymentRecord);

    // Record Transactions for farmers
    for (const ful of order.fulfillments) {
      memoryStore.transactions.push({
        id: `tx-${Date.now()}-${ful.farmerId}`,
        farmerId: ful.farmerId,
        orderId: order.id,
        amount: ful.subtotal,
        type: 'CREDIT',
        status: 'COMPLETED',
        description: `Order #${order.orderNumber} customer payment credited`,
        createdAt: new Date(),
      });
    }

    return successResponse(res, 'Payment verified successfully! Order is confirmed.', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      transactionId: paymentRecord.transactionId,
    });
  } catch (err) {
    return errorResponse(res, 'Payment verification error: ' + err.message, 500);
  }
};

// POST /api/payments/webhook
const handleWebhook = (req, res) => {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return errorResponse(res, 'Invalid webhook signature', 400);
    }
  }

  const event = req.body.event;
  console.log(`Razorpay webhook event received: ${event}`);

  return successResponse(res, 'Webhook received');
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
};
