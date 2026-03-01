const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

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
                    formData: req.body
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
                    formData: req.body
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

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id }, 
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                secure: process.env.NODE_ENV === 'production'
            });

            res.redirect('/dashboard');
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).render('pages/register', {
                error: 'Something went wrong. Please try again.',
                formData: req.body
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
                    formData: req.body
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).render('pages/login', {
                    error: 'Invalid email or password',
                    formData: req.body
                });
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(400).render('pages/login', {
                    error: 'Invalid email or password',
                    formData: req.body
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

            res.redirect('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).render('pages/login', {
                error: 'Something went wrong. Please try again.',
                formData: req.body
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
    res.render('pages/login', { error: null, formData: {} });
};

// Render register page
exports.getRegister = (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.render('pages/register', { error: null, formData: {} });
};