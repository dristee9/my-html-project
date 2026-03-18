const express = require('express');
const router = express.Router();
const { authenticateToken: protect, optionalAuth } = require('../middleware/auth');
const {
    getPageBuilder,
    editPageBuilder,
    savePageBuilder,
    previewCampaign
} = require('../controllers/pageBuilderController');

// Page Builder Routes
router.get('/create', protect, getPageBuilder);
router.get('/:id/edit', protect, editPageBuilder);
router.post('/save/:id?', protect, savePageBuilder);
router.get('/:id/preview', optionalAuth, previewCampaign);

module.exports = router;