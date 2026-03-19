const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Validation rules
const registerValidation = [
    body('username')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('university')
        .notEmpty()
        .withMessage('University is required')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Register controller
exports.register = [
    registerValidation,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).render('pages/register', {
                    error: errors.array()[0].msg,
                    formData: {
                        username: req.body.username,
                        email: req.body.email,
                        university: req.body.university
                    }
                });
            }

            const { username, email, password, university } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ 
                $or: [{ email }, { username }] 
            });

            if (existingUser) {
                const field = existingUser.email === email ? 'Email' : 'Username';
                return res.status(400).render('pages/register', {
                    error: `${field} already exists`,
                    formData: {
                        username: req.body.username,
                        email: req.body.email,
                        university: req.body.university
                    }
                });
            }

            // Create new user
            const user = new User({
                username,
                email,
                password,
                university
            });

            await user.save();

            // Generate email verification token
            const verificationToken = await user.generateEmailVerificationToken();
            await user.save();
            
            // Send verification email (non-blocking)
            emailService.sendEmailVerification(user, verificationToken).catch(err => {
                console.error('Failed to send verification email:', err);
            });

            // Render "check your email" page instead of logging in
            return res.render('pages/verify-email-pending', {
                title: 'Verify Your Email - FundMyIdea BD',
                email: user.email
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).render('pages/register', {
                error: 'Something went wrong. Please try again.',
                formData: {
                    username: req.body.username,
                    email: req.body.email,
                    university: req.body.university
                }
            });
        }
    }
];

// Login controller
exports.login = [
    loginValidation,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).render('pages/login', {
                    error: errors.array()[0].msg,
                    formData: {
                        email: req.body.email,
                        next: req.body.next
                    }
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).render('pages/login', {
                    error: 'Invalid email or password',
                    formData: {
                        email: req.body.email,
                        next: req.body.next
                    }
                });
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(400).render('pages/login', {
                    error: 'Invalid email or password',
                    formData: {
                        email: req.body.email,
                        next: req.body.next
                    }
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id }, 
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production'
            });

            // Redirect to intended destination or dashboard
            const redirectTo = req.body.next && req.body.next.startsWith('/') ? req.body.next : '/dashboard';
            res.redirect(redirectTo);
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).render('pages/login', {
                error: 'Something went wrong. Please try again.',
                formData: {
                    email: req.body.email
                }
            });
        }
    }
];

// Logout controller
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
};

// Render login page
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    
    // Get the 'next' parameter from query string if it exists
    const nextUrl = req.query.next || '';
    
    res.render('pages/login', { 
        error: null, 
        formData: {
            next: nextUrl
        },
        currentPage: 'login'
    });
};

// Render register page
exports.getRegister = (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.render('pages/register', { 
        error: null, 
        formData: {},
        currentPage: 'register'
    });
};

// Refresh JWT token endpoint for AJAX requests
exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        // Verify token without checking expiration
        const jwt = require('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            // Token is expired or invalid
            return res.status(401).json({ error: 'Token expired or invalid' });
        }
        
        // Get user to ensure they still exist
        const User = require('../models/User');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Generate new token with fresh expiry
        const newToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Set new token in cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict'
        });
        
        res.json({ success: true, message: 'Token refreshed successfully' });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
};