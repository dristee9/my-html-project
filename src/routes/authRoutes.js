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

// Password reset routes
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', {
        title: 'Forgot Password - FundMyIdea BD',
        error: null
    });
});

router.post('/forgot-password', (req, res) => {
    // Password reset logic will go here
    console.log('Password reset requested:', req.body.email);
    res.redirect('/login');
});

// Resend verification email
router.get('/resend-verification', (req, res) => {
    // Resend verification logic will go here
    res.redirect('/login');
});

module.exports = router;