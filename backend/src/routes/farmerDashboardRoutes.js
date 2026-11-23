// backend/src/routes/farmerDashboardRoutes.js
const express = require('express');
const router = express.Router();
const farmerDashboardController = require('../controllers/farmerDashboardController');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('FARMER', 'ADMIN'));

router.get('/dashboard', farmerDashboardController.getDashboardStats);
router.get('/earnings', farmerDashboardController.getEarnings);
router.get('/orders', orderController.getOrders);
router.get('/inventory', farmerDashboardController.getInventory);
router.patch('/inventory/:productId', farmerDashboardController.updateStock);

module.exports = router;
