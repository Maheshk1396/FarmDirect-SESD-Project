// backend/src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', upload.single('photo'), profileController.updateProfile);
router.post('/addresses', profileController.addAddress);
router.delete('/addresses/:id', profileController.deleteAddress);

module.exports = router;
