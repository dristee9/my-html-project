const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Campaign = require('../models/Campaign');
const campaignController = require('../controllers/campaignController');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        // Use random filename with original extension to prevent path traversal
        const ext = path.extname(file.originalname);
        const randomName = crypto.randomBytes(8).toString('hex');
        cb(null, Date.now() + '-' + randomName + ext);
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

// Rate limiter for donation routes
const donationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 donations per hour
    message: 'Too many donation attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Explore campaigns route
router.get('/', campaignController.getAllCampaigns);

// Search campaigns route
router.get('/search', campaignController.searchCampaigns);

// Dedicated donation page routes
router.get('/:id/donate', authenticateToken, campaignController.getDonationPage);
router.post('/:id/donate', authenticateToken, donationLimiter, campaignController.processDonation);

// bKash payment routes
router.post('/:id/bkash/initiate', authenticateToken, campaignController.initiateBkashPayment);
router.get('/:id/bkash-callback', authenticateToken, campaignController.handleBkashCallback);

// Create campaign route (GET) - Redirect to page builder
router.get('/create', authenticateToken, (req, res) => {
    res.redirect('/builder/create');
});

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
            campaign: campaign,
            currentPage: 'edit'
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
router.post('/:id/edit', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, category, fundingGoal, deadline } = req.body;
        
        // Validate required fields
        if (!title || !description || !category || !fundingGoal || !deadline) {
            return res.status(400).render('pages/error', {
                title: 'Validation Error - FundMyIdea BD',
                error: 'All fields are required',
                user: req.user
            });
        }
        
        const campaign = await Campaign.findById(req.params.id);
        
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
        
        // Build update data
        const updateData = {
            title,
            description,
            category,
            fundingGoal: parseInt(fundingGoal),
            deadline: new Date(deadline)
        };
        
        // Handle image update if new image is uploaded
        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }
        
        // Update campaign
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        console.log('Campaign updated successfully:', req.params.id);
        res.redirect(`/campaigns/${req.params.id}`);
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to update campaign',
            user: req.user
        });
    }
});

// Delete campaign route (POST)
router.post('/:id/delete', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
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
                error: 'You can only delete your own campaigns',
                user: req.user
            });
        }
        
        await Campaign.findByIdAndDelete(req.params.id);
        console.log('Campaign deleted successfully:', req.params.id);
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to delete campaign',
            user: req.user
        });
    }
});

module.exports = router;