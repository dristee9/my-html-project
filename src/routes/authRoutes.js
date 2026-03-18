const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Rate limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply optionalAuth middleware to make user available
router.use(optionalAuth);

// GET routes
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);

// POST routes
router.post('/logout', authController.logout);
router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);

// Token refresh route (for AJAX requests)
router.post('/refresh', authenticateToken, authController.refreshToken);

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