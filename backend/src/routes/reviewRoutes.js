// backend/src/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, reviewController.getReviews);
router.post('/', authenticate, reviewController.createReview);

module.exports = router;
