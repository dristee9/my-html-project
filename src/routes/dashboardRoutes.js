const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dashboardController = require('../controllers/dashboardController');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/profiles';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sanitize filename to prevent directory traversal attacks
        // Use only the extension from original name, generate random filename
        const ext = path.extname(file.originalname).toLowerCase();
        const crypto = require('crypto');
        const randomName = crypto.randomBytes(16).toString('hex');
        cb(null, `${Date.now()}-${randomName}${ext}`);
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

// Settings routes with validation
router.get('/settings', dashboardController.getSettings);
router.post('/settings/password', validatePasswordChange, dashboardController.changePassword);
router.delete('/settings/account', dashboardController.deleteAccount);

module.exports = router;