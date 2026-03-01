const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Apply optionalAuth middleware to make user available
router.use(optionalAuth);

// GET routes
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);
router.get('/logout', authController.logout);

// POST routes
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;