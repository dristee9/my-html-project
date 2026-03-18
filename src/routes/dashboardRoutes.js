const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dashboardController = require('../controllers/dashboardController');

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

// Apply authentication middleware
router.use(authenticateToken);

// Dashboard route
router.get('/', dashboardController.getDashboard);

// User profile routes
router.get('/profile', dashboardController.getProfile);
router.post('/profile', upload.single('profileImage'), dashboardController.updateProfile);

// User campaigns and donations
router.get('/my-campaigns', dashboardController.getMyCampaigns);
router.get('/my-donations', dashboardController.getMyDonations);

module.exports = router;