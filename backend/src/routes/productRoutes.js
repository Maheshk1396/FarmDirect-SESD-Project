// backend/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post(
  '/',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  upload.array('images', 5),
  productController.createProduct
);
router.put(
  '/:id',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  upload.array('images', 5),
  productController.updateProduct
);
router.delete(
  '/:id',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  productController.deleteProduct
);

module.exports = router;
