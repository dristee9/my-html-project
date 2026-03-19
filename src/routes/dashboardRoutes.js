const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');
const { profileUpload } = require('../middleware/upload');

// Use centralized upload middleware
const upload = profileUpload;

// Apply authentication middleware
router.use(authenticateToken);

// Dashboard route
router.get('/', dashboardController.getDashboard);

// User profile routes with validation
router.get('/profile', dashboardController.getProfile);
router.post('/profile', upload.single('profileImage'), validateProfileUpdate, dashboardController.updateProfile);

// User campaigns and donations
router.get('/my-campaigns', dashboardController.getMyCampaigns);
router.get('/my-donations', dashboardController.getMyDonations);
router.get('/saved', dashboardController.getSavedCampaigns);

// Settings routes with validation
router.get('/settings', dashboardController.getSettings);
router.post('/settings/password', validatePasswordChange, dashboardController.changePassword);
router.delete('/settings/account', dashboardController.deleteAccount);

module.exports = router;