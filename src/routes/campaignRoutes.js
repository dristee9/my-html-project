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

// Dedicated donation page routes
router.get('/:id/donate', authenticateToken, campaignController.getDonationPage);
router.post('/donate/:id', authenticateToken, campaignController.processDonation);

// Create campaign route (POST)
router.post('/create', authenticateToken, upload.single('image'), campaignController.createCampaign);

// Single campaign route
router.get('/:id', campaignController.getCampaignById);

// Campaign preview route
router.get('/:id/preview', (req, res) => {
    res.redirect(`/builder/${req.params.id}/preview`);
});

// Edit campaign route (GET)
router.get('/:id/edit', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).lean();
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if user owns this campaign
        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).render('pages/error', {
                title: 'Access Denied - FundMyIdea BD',
                error: 'You can only edit your own campaigns',
                user: req.user
            });
        }
        
        res.render('pages/edit-campaign', {
            title: `Edit ${campaign.title} - FundMyIdea BD`,
            user: req.user,
            campaign: campaign
        });
    } catch (error) {
        console.error('Error loading edit campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load edit campaign page',
            user: req.user
        });
    }
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