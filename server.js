const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const ejsMate = require('ejs-mate');
const fs = require('fs');
const connectDB = require('./src/config/database');
const { optionalAuth } = require('./src/middleware/auth');
const helmet = require('helmet');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters long. Please set a secure JWT_SECRET in your .env file.');
    process.exit(1);
}

// Validate session secret as well
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.warn('WARNING: SESSION_SECRET should be at least 32 characters for better security.');
}

// Connect to MongoDB
connectDB();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Uploads directory created at:', uploadsDir);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware for email verification and password reset flows
app.use(session({
    secret: process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CSRF Protection
const csrf = require('csurf');
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// Apply CSRF protection conditionally
app.use((req, res, next) => {
    // Skip CSRF for page builder API routes only
    // Note: We do NOT skip CSRF based on X-Requested-With header as this is a security bypass
    if (req.path.startsWith('/builder/api/')) {
        // For builder API routes that legitimately need AJAX access,
        // CSRF token should be passed in JSON body or headers
        req.csrfToken = () => '';
        return next();
    }
    
    // Apply CSRF to all other routes including forms and standard requests
    csrfProtection(req, res, (err) => {
        if (err) {
            console.error('CSRF Token Error:', err.message);
            
            // If it's a CSRF error and user is trying to logout, allow it anyway
            // This prevents users from being stuck logged in due to token issues
            if (req.path === '/logout' && err.code === 'EBADCSRFTOKEN') {
                console.warn('Allowing logout despite CSRF error for path:', req.path);
                return next();
            }
            
            // For other routes, return proper error
            return res.status(403).render('pages/error', {
                title: 'Security Error - FundMyIdea BD',
                error: 'Security verification failed. Please refresh the page and try again.',
                user: req.user
            });
        }
        next();
    });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Apply optionalAuth to make user available in all routes
app.use(optionalAuth);

// Middleware to make user and csrfToken available in all templates
// This MUST come AFTER CSRF protection but BEFORE routes
app.use((req, res, next) => {
    res.locals.user = req.user;
    // Safely get CSRF token, fallback to empty string if not available
    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    } catch (err) {
        console.error('Error getting CSRF token:', err.message);
        res.locals.csrfToken = '';
    }
    next();
});

// Routes
app.use('/', require('./src/routes/authRoutes'));
app.use('/campaigns', require('./src/routes/campaignRoutes'));
app.use('/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/builder', require('./src/routes/pageBuilderRoutes'));

// Home route
const indexController = require('./src/controllers/indexController');
app.get('/', indexController.getHomePage);

// Redirect old create campaign route to page builder
app.get('/create-campaign', (req, res) => {
    res.redirect('/builder/create');
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Page Not Found - FundMyIdea BD',
        user: req.user 
    });
});

// Error handler - never expose internal details in production
app.use((err, req, res, next) => {
    // Log full error details server-side for debugging
    console.error('ERROR:', err.stack || err);
    
    // Determine appropriate error message based on environment
    let errorMessage = 'Internal Server Error';
    
    if (process.env.NODE_ENV === 'development') {
        // In development, show more details but still sanitize sensitive info
        errorMessage = err.message || 'Internal Server Error';
    }
    // In production, always show generic message
    
    res.status(500).render('pages/error', {
        title: 'Something Went Wrong - FundMyIdea BD',
        error: errorMessage,
        user: req.user
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});