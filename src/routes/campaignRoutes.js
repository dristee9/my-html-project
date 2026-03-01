const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Apply optionalAuth middleware
router.use(optionalAuth);

// Explore campaigns route
router.get('/', (req, res) => {
    res.render('pages/explore', {
        title: 'Explore Campaigns - FundMyIdea BD',
        campaigns: [] // Will be populated with actual data later
    });
});

// Single campaign route
router.get('/:id', (req, res) => {
    res.render('pages/campaign', {
        title: 'Campaign Details - FundMyIdea BD',
        campaign: null // Will be populated with actual data later
    });
});

module.exports = router;