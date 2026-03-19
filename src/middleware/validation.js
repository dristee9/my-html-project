const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 * Returns validation errors as a formatted response
 */
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // For API requests, return JSON
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        
        // For form submissions, render error page with first error
        const firstError = errors.array()[0];
        return res.status(400).render('pages/error', {
            title: 'Validation Error - FundMyIdea BD',
            error: firstError.msg,
            user: req.user
        });
    }
    
    next();
};

/**
 * Registration validation rules
 */
exports.validateRegistration = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    body('university')
        .notEmpty().withMessage('University is required')
        .isIn(['BUET', 'Dhaka University', 'North South University', 'BRAC University', 'Other'])
        .withMessage('Please select a valid university'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    exports.handleValidationErrors
];

/**
 * Login validation rules
 */
exports.validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    exports.handleValidationErrors
];

/**
 * Campaign creation validation rules
 */
exports.validateCampaignCreation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Campaign title is required')
        .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
    
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
    
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['technology', 'education', 'healthcare', 'environment', 'social', 'business', 'other'])
        .withMessage('Please select a valid category'),
    
    body('fundingGoal')
        .notEmpty().withMessage('Funding goal is required')
        .isInt({ min: 1000 }).withMessage('Minimum funding goal is 1,000 BDT'),
    
    body('deadline')
        .notEmpty().withMessage('Deadline is required')
        .isISO8601().withMessage('Invalid date format')
        .custom(value => {
            if (new Date(value) <= new Date()) {
                throw new Error('Deadline must be in the future');
            }
            return true;
        }),
    
    exports.handleValidationErrors
];

/**
 * Donation validation rules
 */
exports.validateDonation = [
    body('amount')
        .notEmpty().withMessage('Donation amount is required')
        .isInt({ min: 100 }).withMessage('Minimum donation is 100 BDT'),
    
    body('bkashNumber')
        .trim()
        .notEmpty().withMessage('bKash number is required')
        .matches(/^[0-9]{11}$/).withMessage('bKash number must be 11 digits'),
    
    body('message')
        .optional({ checkFalsy: true })
        .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
    
    exports.handleValidationErrors
];

/**
 * Password change validation rules
 */
exports.validatePasswordChange = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('New passwords do not match');
            }
            return true;
        }),
    
    exports.handleValidationErrors
];

/**
 * Profile update validation rules
 */
exports.validateProfileUpdate = [
    body('username')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('university')
        .optional({ checkFalsy: true })
        .isIn(['BUET', 'Dhaka University', 'North South University', 'BRAC University', 'Other'])
        .withMessage('Please select a valid university'),
    
    exports.handleValidationErrors
];

/**
 * Campaign ID parameter validation
 */
exports.validateCampaignId = [
    param('id')
        .notEmpty().withMessage('Campaign ID is required')
        .matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid campaign ID format'),
    
    exports.handleValidationErrors
];

/**
 * Search query validation
 */
exports.validateSearch = [
    query('q')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 }).withMessage('Search query too long'),
    
    query('category')
        .optional({ checkFalsy: true })
        .isIn(['all', 'technology', 'education', 'healthcare', 'environment', 'social', 'business', 'other']),
    
    query('sort')
        .optional({ checkFalsy: true })
        .isIn(['newest', 'most-funded', 'ending-soon']),
    
    query('page')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('Page must be a positive number'),
    
    exports.handleValidationErrors
];
