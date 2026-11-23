// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

router.post('/register', authLimiter, upload.single('farmPhoto'), authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/forgot-password', authLimiter, authController.forgotPassword);

module.exports = router;
