const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Create multer disk storage configuration
 * @param {string} destination - Destination directory (relative to project root)
 * @returns {multer.DiskStorage} Storage configuration
 */
const createStorage = (destination) => {
    // Ensure destination directory exists
    const fullDest = path.join(process.cwd(), destination);
    if (!fs.existsSync(fullDest)) {
        fs.mkdirSync(fullDest, { recursive: true });
        console.log(`📁 Upload directory created at: ${fullDest}`);
    } else {
        console.log(`✅ Upload directory exists: ${fullDest}`);
    }
    
    return multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, destination);
        },
        filename: function (req, file, cb) {
            // Sanitize filename to prevent directory traversal attacks
            // Use only the extension from original name, generate random filename
            const ext = path.extname(file.originalname).toLowerCase();
            const randomName = crypto.randomBytes(16).toString('hex');
            const filename = `${Date.now()}-${randomName}${ext}`;
            console.log(`📤 Uploading file: ${file.originalname} -> ${filename}`);
            cb(null, filename);
        }
    });
};

/**
 * File filter for image uploads only
 */
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

/**
 * Campaign image upload middleware
 * - Stores in public/uploads/
 * - Max size: 5MB
 * - Images only
 */
exports.campaignUpload = multer({
    storage: createStorage('public/uploads'),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: imageFilter
});

/**
 * Profile image upload middleware
 * - Stores in public/uploads/profiles/
 * - Max size: 5MB
 * - Images only
 */
exports.profileUpload = multer({
    storage: createStorage('public/uploads/profiles'),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: imageFilter
});

/**
 * Generic image upload middleware factory
 * @param {string} dest - Destination directory
 * @param {number} maxSize - Max file size in bytes (default: 5MB)
 * @returns {multer.Multer} Configured multer instance
 */
exports.createImageUploader = (dest, maxSize = 5 * 1024 * 1024) => {
    return multer({
        storage: createStorage(dest),
        limits: { fileSize: maxSize },
        fileFilter: imageFilter
    });
};
