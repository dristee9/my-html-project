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
        
        // Generate reset token using bcrypt hashing
        const resetToken = await user.generatePasswordResetToken();
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
router.get('/resend-verification', async (req, res) => {
    try {
        const User = require('../models/User');
        
        // Get pending user from session
        if (!req.session.pendingUser) {
            return res.redirect('/login');
        }
        
        const user = await User.findById(req.session.pendingUser);
        
        if (!user || user.emailVerified) {
            delete req.session.pendingUser;
            return res.redirect('/login');
        }
        
        // Generate new verification token
        const verificationToken = await user.generateEmailVerificationToken();
        await user.save();
        
        // Send verification email
        const emailService = require('../services/emailService');
        await emailService.sendEmailVerification(user, verificationToken);
        
        res.render('pages/verify-email-pending', {
            title: 'Verify Your Email - FundMyIdea BD',
            email: user.email,
            success: 'Verification email resent! Please check your inbox.'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).render('pages/verify-email-pending', {
            title: 'Verify Your Email - FundMyIdea BD',
            error: 'Failed to resend verification email. Please try again.'
        });
    }
});

// Reset password routes
router.get('/verify-email/:token', async (req, res) => {
    try {
        const User = require('../models/User');
        
        // Find all users with verification tokens
        const users = await User.find({
            emailVerificationToken: { $exists: true }
        });
        
        if (!users || users.length === 0) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Verification Link - FundMyIdea BD',
                error: 'Email verification link is invalid or has already been used'
            });
        }
        
        // Find the matching user by comparing tokens
        let user = null;
        for (const u of users) {
            const isValid = await User.verifyEmailToken(u.emailVerificationToken, req.params.token);
            if (isValid) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Verification Link - FundMyIdea BD',
                error: 'Email verification link is invalid or has already been used'
            });
        }
        
        // Verify the token matches
        const isValid = await User.verifyEmailToken(user.emailVerificationToken, req.params.token);
        if (!isValid) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Verification Link - FundMyIdea BD',
                error: 'Email verification link is invalid or has already been used'
            });
        }
        
        // Mark email as verified and clear token
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();
        
        // Generate JWT token and log the user in
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        // Clear pending session
        delete req.session.pendingUser;
        
        // Send welcome email now that email is verified
        const emailService = require('../services/emailService');
        emailService.sendWelcomeEmail(user).catch(err => {
            console.error('Failed to send welcome email:', err);
        });
        
        res.redirect('/dashboard?email-verified=true');
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Something went wrong during email verification'
        });
    }
});
router.get('/reset-password/:token', async (req, res) => {
    try {
        const User = require('../models/User');
        
        // Find all users with non-expired reset tokens
        const users = await User.find({
            resetPasswordExpire: { $gt: Date.now() }
        });
        
        if (!users || users.length === 0) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        // Find the matching user by comparing tokens
        let user = null;
        for (const u of users) {
            const isValid = await User.verifyResetToken(u.resetPasswordToken, req.params.token);
            if (isValid) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        // Verify the token matches
        const isValid = await User.verifyResetToken(user.resetPasswordToken, req.params.token);
        if (!isValid) {
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
        
        // Find all users with non-expired reset tokens
        const users = await User.find({
            resetPasswordExpire: { $gt: Date.now() }
        });
        
        if (!users || users.length === 0) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        // Find the matching user by comparing tokens
        let user = null;
        for (const u of users) {
            const isValid = await User.verifyResetToken(u.resetPasswordToken, req.params.token);
            if (isValid) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Invalid Reset Link - FundMyIdea BD',
                error: 'Password reset link is invalid or has expired'
            });
        }
        
        // Verify the token matches
        const isValid = await User.verifyResetToken(user.resetPasswordToken, req.params.token);
        if (!isValid) {
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