// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getUsers);
router.get('/farmers/pending', adminController.getPendingFarmers);
router.patch('/farmers/:id/verify', adminController.verifyFarmer);
router.get('/orders', orderController.getOrders);

module.exports = router;
