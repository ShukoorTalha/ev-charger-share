const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const options  = {
  region: process.env.AWS_REGION || 'us-east-1'
}
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  options.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  options.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

// Configure AWS SDK
const s3 = new AWS.S3(options);

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'evchargershare-images';

/**
 * Upload a file to S3 (private)
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder path (e.g., 'chargers')
 * @returns {Promise<string>} - S3 key of uploaded file
 */
const uploadToS3 = async (fileBuffer, fileName, mimeType, folder = 'chargers') => {
  try {
    // Generate unique filename
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const s3Key = `${folder}/${uniqueFileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Remove ACL to make files private by default
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log(`Uploading file to S3: ${s3Key}`);
    
    const result = await s3.upload(uploadParams).promise();
    
    console.log(`File uploaded successfully: ${s3Key}`);
    return s3Key; // Return key instead of full URL
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 key of the file (or full URL for backward compatibility)
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = async (s3Key) => {
  try {
    let keyToDelete = s3Key;
    
    // If it's a full URL, extract the key
    if (s3Key.startsWith('http')) {
      const urlParts = s3Key.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes(BUCKET_NAME));
      if (bucketIndex === -1) {
        throw new Error('Invalid S3 URL');
      }
      keyToDelete = urlParts.slice(bucketIndex + 1).join('/');
    }

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: keyToDelete
    };

    console.log(`Deleting file from S3: ${keyToDelete}`);
    
    await s3.deleteObject(deleteParams).promise();
    
    console.log(`File deleted successfully: ${keyToDelete}`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of multer file objects
 * @param {string} folder - S3 folder path
 * @returns {Promise<Array<string>>} - Array of S3 keys
 */
const uploadMultipleToS3 = async (files, folder = 'chargers') => {
  try {
    const uploadPromises = files.map(file => 
      uploadToS3(file.buffer, file.originalname, file.mimetype, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    throw new Error(`Failed to upload files to S3: ${error.message}`);
  }
};

/**
 * Generate a signed URL for viewing an image
 * @param {string} s3Key - S3 key of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn
    };
    
    const signedUrl = await s3.getSignedUrlPromise('getObject', params);
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Generate signed URLs for multiple S3 keys
 * @param {Array<string>} s3Keys - Array of S3 keys
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<Array<string>>} - Array of signed URLs
 */
const getMultipleSignedUrls = async (s3Keys, expiresIn = 3600) => {
  try {
    const urlPromises = s3Keys.map(key => getSignedUrl(key, expiresIn));
    const signedUrls = await Promise.all(urlPromises);
    return signedUrls;
  } catch (error) {
    console.error('Error generating multiple signed URLs:', error);
    throw new Error(`Failed to generate signed URLs: ${error.message}`);
  }
};

/**
 * Check if S3 is properly configured
 * @returns {Promise<boolean>} - Configuration status
 */
const checkS3Configuration = async () => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`S3 bucket ${BUCKET_NAME} is accessible`);
    return true;
  } catch (error) {
    console.error('S3 configuration error:', error.message);
    return false;
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  uploadMultipleToS3,
  getSignedUrl,
  getMultipleSignedUrls,
  checkS3Configuration,
  BUCKET_NAME
};
