// backend/src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/', cartController.getCart);
router.post('/items', cartController.addToCart);
router.put('/items/:productId', cartController.updateCartItem);
router.delete('/items/:productId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

module.exports = router;
