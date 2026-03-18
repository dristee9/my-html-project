const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const ejsMate = require('ejs-mate');
const fs = require('fs');
const connectDB = require('./src/config/database');
const { optionalAuth } = require('./src/middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Apply optionalAuth to make user available in all routes
app.use(optionalAuth);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to make user available in all templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Routes
app.use('/', require('./src/routes/authRoutes'));
app.use('/campaigns', require('./src/routes/campaignRoutes'));
app.use('/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/builder', require('./src/routes/pageBuilderRoutes'));

// Home route
app.get('/', (req, res) => {
    res.render('pages/index');
});

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

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Something Went Wrong - FundMyIdea BD',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        user: req.user
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});