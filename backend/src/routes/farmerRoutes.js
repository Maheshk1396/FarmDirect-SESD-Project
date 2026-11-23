// backend/src/routes/farmerRoutes.js
const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');

router.get('/', farmerController.getFarmers);
router.get('/nearby', farmerController.getNearbyFarmers);
router.get('/:id', farmerController.getFarmerById);
router.get('/:id/products', farmerController.getFarmerProducts);

module.exports = router;
