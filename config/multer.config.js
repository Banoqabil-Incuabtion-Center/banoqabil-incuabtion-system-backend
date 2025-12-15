const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Check if Cloudinary credentials are available
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

// File filter for images only (used for avatars)
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for media (images and videos)
const mediaFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

let uploadPostImage;
let uploadAvatar;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('✅ Cloudinary configured successfully');

  // Cloudinary storage for post images and videos
  const postStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      return {
        folder: 'ims/posts',
        resource_type: 'auto', // Auto-detect image or video
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'mkv'],
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }, // Automatic optimization
        ],
      };
    },
  });

  // Cloudinary storage for user avatars
  const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'ims/avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
    },
  });

  uploadPostImage = multer({
    storage: postStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for posts
  });

  uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for avatars
  });
} else {
  console.warn('⚠️ Cloudinary not configured - using memory storage (images will not persist)');

  // Fallback to memory storage (for development without Cloudinary)
  const memoryStorage = multer.memoryStorage();

  uploadPostImage = multer({
    storage: memoryStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  uploadAvatar = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  });
}

// Export cloudinary for direct operations (like delete)
module.exports = {
  uploadPostImage,
  uploadAvatar,
  cloudinary,
  isCloudinaryConfigured
};