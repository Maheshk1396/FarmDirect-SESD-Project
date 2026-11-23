// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/create-order', authenticate, paymentController.createPaymentOrder);
router.post('/verify', authenticate, paymentController.verifyPayment);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
