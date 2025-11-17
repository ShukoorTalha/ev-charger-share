/**
 * File upload utility for handling user uploads
 * Provides functions for uploading files to storage and deleting them
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Define storage locations
const STORAGE_DIR = process.env.STORAGE_DIR || 'uploads';
const AVATAR_DIR = path.join(STORAGE_DIR, 'avatars');
const CHARGER_IMAGES_DIR = path.join(STORAGE_DIR, 'chargers');

// Ensure directories exist
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Initialize storage directories
ensureDirectoryExists(AVATAR_DIR);
ensureDirectoryExists(CHARGER_IMAGES_DIR);

/**
 * Upload a file to local storage
 * @param {Object} file - The file object from multer
 * @param {string} type - The type of file (avatar, charger, etc.)
 * @returns {Promise<string>} - The URL/path of the uploaded file
 */
const uploadToStorage = async (file, type = 'avatar') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine target directory based on file type
    let targetDir;
    switch (type) {
      case 'avatar':
        targetDir = AVATAR_DIR;
        break;
      case 'charger':
        targetDir = CHARGER_IMAGES_DIR;
        break;
      default:
        targetDir = STORAGE_DIR;
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(targetDir, fileName);
    
    // Create a write stream and save the file
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      
      writeStream.on('error', (error) => {
        reject(error);
      });
      
      writeStream.on('finish', () => {
        // Return relative path that can be used as URL
        const relativePath = path.join(type, fileName).replace(/\\/g, '/');
        resolve(relativePath);
      });
      
      // If file is a buffer, write it directly
      if (Buffer.isBuffer(file.buffer)) {
        writeStream.write(file.buffer);
        writeStream.end();
      } else {
        // If file is a path, create read stream and pipe
        const readStream = fs.createReadStream(file.path);
        readStream.pipe(writeStream);
        
        readStream.on('error', (error) => {
          reject(error);
        });
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Delete a file from storage
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
const deleteFromStorage = async (filePath) => {
  try {
    if (!filePath) {
      return false;
    }

    // Handle both absolute and relative paths
    const fullPath = filePath.startsWith('/') 
      ? filePath 
      : path.join(STORAGE_DIR, filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found for deletion: ${fullPath}`);
      return false;
    }
    
    // Delete the file
    fs.unlinkSync(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  uploadToStorage,
  deleteFromStorage,
  STORAGE_DIR,
  AVATAR_DIR,
  CHARGER_IMAGES_DIR
};
