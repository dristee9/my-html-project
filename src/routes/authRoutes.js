const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const crypto = require('crypto');

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

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).render('pages/forgot-password', {
                title: 'Forgot Password - FundMyIdea BD',
                error: 'Please provide your email address'
            });
        }
        
        const User = require('../models/User');
        const user = await User.findOne({ email });
        
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.render('pages/forgot-password', {
                title: 'Forgot Password - FundMyIdea BD',
                success: 'If an account exists with that email, you will receive a password reset link shortly.'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Save hashed token to user (you'll need to add these fields to User model)
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send password reset email
        const emailService = require('../services/emailService');
        await emailService.sendPasswordResetEmail(user, resetToken);
        
        res.render('pages/forgot-password', {
            title: 'Forgot Password - FundMyIdea BD',
            success: 'Password reset instructions have been sent to your email if an account exists.'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).render('pages/forgot-password', {
            title: 'Forgot Password - FundMyIdea BD',
            error: 'Something went wrong. Please try again later.'
        });
    }
});

// Resend verification email
router.get('/resend-verification', (req, res) => {
    // Resend verification logic will go here
    res.redirect('/login');
});

// Reset password routes
router.get('/reset-password/:token', async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findOne({
            resetPasswordToken: crypto.createHash('sha256').update(req.params.token).digest('hex'),
            resetPasswordExpire: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        res.render('pages/reset-password', {
            title: 'Reset Password - FundMyIdea BD',
            token: req.params.token,
            error: null
        });
    } catch (error) {
        console.error('Reset password page error:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Something went wrong'
        });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        
        if (!password || password.length < 6) {
            return res.status(400).render('pages/reset-password', {
                title: 'Reset Password - FundMyIdea BD',
                token: req.params.token,
                error: 'Password must be at least 6 characters'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).render('pages/reset-password', {
                title: 'Reset Password - FundMyIdea BD',
                token: req.params.token,
                error: 'Passwords do not match'
            });
        }
        
        const User = require('../models/User');
        const user = await User.findOne({
            resetPasswordToken: crypto.createHash('sha256').update(req.params.token).digest('hex'),
            resetPasswordExpire: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        
        res.render('pages/login', {
            title: 'Login - FundMyIdea BD',
            success: 'Your password has been successfully reset. Please login with your new password.',
            error: null
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to reset password'
        });
    }
});

module.exports = router;