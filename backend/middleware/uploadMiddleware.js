/**
 * File upload middleware using multer
 */
const multer = require('multer');
const path = require('path');

// Use memory storage for S3 uploads
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer instance with configuration
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5 // Max 5 files per upload
  }
});

// Export middleware functions
module.exports = {
  // For single file uploads (like avatar)
  uploadSingle: (fieldName) => upload.single(fieldName),
  
  // For multiple files (like charger images)
  uploadMultiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  
  // For mixed fields
  uploadFields: (fields) => upload.fields(fields)
};
