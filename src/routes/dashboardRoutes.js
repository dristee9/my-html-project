const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Dashboard route
router.get('/', (req, res) => {
    res.render('pages/dashboard', {
        title: 'Dashboard - FundMyIdea BD',
        user: req.user,
        userStats: {
            campaignsCount: 0,
            totalRaised: 0,
            donationsCount: 0
        },
        campaigns: []
    });
});

// Create campaign form route
router.get('/create-campaign', (req, res) => {
    res.render('pages/create', {
        title: 'Create Campaign - FundMyIdea BD',
        user: req.user
    });
});

module.exports = router;