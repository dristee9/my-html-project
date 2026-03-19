const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const Campaign = require('../models/Campaign');
const campaignController = require('../controllers/campaignController');
const { validateCampaignCreation, validateDonation, validateSearch, validateCampaignId } = require('../middleware/validation');
const { campaignUpload } = require('../middleware/upload');

// Use centralized upload middleware
const upload = campaignUpload;

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

// Search campaigns route with validation
router.get('/search', validateSearch, campaignController.searchCampaigns);

// Dedicated donation page routes with validation
router.get('/:id/donate', authenticateToken, validateCampaignId, campaignController.getDonationPage);
router.post('/:id/donate', authenticateToken, donationLimiter, validateDonation, campaignController.processDonation);

// bKash payment routes
router.post('/:id/bkash/initiate', authenticateToken, campaignController.initiateBkashPayment);
router.get('/:id/bkash-callback', authenticateToken, campaignController.handleBkashCallback);

// Create campaign route (GET) - Redirect to page builder
router.get('/create', authenticateToken, (req, res) => {
    res.redirect('/builder/create');
});

// Single campaign route
router.get('/:id', campaignController.getCampaignById);

// Campaign preview route
router.get('/:id/preview', (req, res) => {
    res.redirect(`/builder/${req.params.id}/preview`);
});

// Edit campaign routes - moved to controller
router.get('/:id/edit', authenticateToken, campaignController.getEditCampaign);
router.post('/:id/edit', authenticateToken, upload.single('image'), campaignController.updateCampaign);

// Delete campaign route - moved to controller
router.post('/:id/delete', authenticateToken, campaignController.deleteCampaign);

module.exports = router;