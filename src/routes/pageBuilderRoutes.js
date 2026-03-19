const express = require('express');
const router = express.Router();
const { authenticateToken: protect, optionalAuth } = require('../middleware/auth');
const {
    getPageBuilder,
    editPageBuilder,
    savePageBuilder,
    previewCampaign,
    getVersionHistory,
    saveVersion,
    clearVersionHistory,
    renderSectionPreview
} = require('../controllers/pageBuilderController');

// Page Builder Routes
router.get('/create', protect, getPageBuilder);
router.get('/:id/edit', protect, editPageBuilder);
router.post('/save/:id?', protect, savePageBuilder);
router.get('/:id/preview', optionalAuth, previewCampaign);

// Section Preview API (for real-time server-side rendering in builder)
router.post('/preview-section', protect, renderSectionPreview);

// Version History Routes
router.get('/:id/versions', protect, getVersionHistory);
router.post('/:id/versions', protect, saveVersion);
router.delete('/:id/versions', protect, clearVersionHistory);

module.exports = router;