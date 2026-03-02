const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Apply authentication middleware
router.use(authenticateToken);

// Dashboard route
router.get('/', dashboardController.getDashboard);

// User profile routes
router.get('/profile', dashboardController.getProfile);
router.post('/profile', dashboardController.updateProfile);

// User campaigns and donations
router.get('/my-campaigns', dashboardController.getMyCampaigns);
router.get('/my-donations', dashboardController.getMyDonations);

module.exports = router;