const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const campaignController = require('../controllers/campaignController');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Apply optionalAuth middleware
router.use(optionalAuth);

// Explore campaigns route
router.get('/', campaignController.getAllCampaigns);

// Search campaigns route
router.get('/search', campaignController.searchCampaigns);

// Single campaign route
router.get('/:id', campaignController.getCampaignById);

// Create campaign route (POST)
router.post('/create', authenticateToken, upload.single('image'), campaignController.createCampaign);

// Donate to campaign route (POST)
router.post('/:id/donate', authenticateToken, campaignController.donateToCampaign);

// Edit campaign route (GET)
router.get('/:id/edit', authenticateToken, (req, res) => {
    // Check if user owns this campaign
    // For now, render edit form
    res.render('pages/edit-campaign', {
        title: 'Edit Campaign - FundMyIdea BD',
        user: req.user,
        campaign: null // Will be populated with actual data
    });
});

// Update campaign route (POST)
router.post('/:id/edit', authenticateToken, upload.single('image'), (req, res) => {
    // Campaign update logic will go here
    console.log('Campaign update attempted:', req.body);
    
    // For now, redirect back to campaign page
    res.redirect(`/campaigns/${req.params.id}`);
});

// Delete campaign route (POST)
router.post('/:id/delete', authenticateToken, (req, res) => {
    // Campaign deletion logic will go here
    console.log('Campaign deletion attempted:', req.params.id);
    
    // For now, redirect back to dashboard
    res.redirect('/dashboard');
});

// Search campaigns route (GET)
router.get('/search', (req, res) => {
    const { q, category } = req.query;
    console.log('Search query:', { q, category });
    
    // Search logic will go here
    res.render('pages/explore', {
        title: 'Search Results - FundMyIdea BD',
        campaigns: [], // Will be populated with search results
        searchQuery: q,
        searchCategory: category
    });
});

module.exports = router;