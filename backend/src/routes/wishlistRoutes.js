// backend/src/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.toggleWishlist);
router.delete('/:productId', wishlistController.removeWishlist);

module.exports = router;
