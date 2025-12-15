const Media = require('../models/media.model');
const { cloudinary } = require('../config/multer.config');

const mediaController = {};

// Get media by user
mediaController.getMediaByUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, page = 1, limit = 20 } = req.query;

        const query = { user: userId, deletedAt: null };
        if (type) {
            query.type = type;
        }

        const media = await Media.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Media.countDocuments(query);

        res.status(200).json({
            data: media,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Delete media
mediaController.deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const media = await Media.findById(id);

        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }

        // Check if user owns the media
        if (media.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only delete your own media' });
        }

        // Delete from Cloudinary
        if (media.publicId) {
            await cloudinary.uploader.destroy(media.publicId);
        }

        // Soft delete from database (keep Cloudinary deletion for storage)
        await Media.findByIdAndUpdate(id, { deletedAt: new Date() });

        res.status(200).json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper function to create media record (used by other controllers)
mediaController.createMediaRecord = async ({ url, publicId, type, userId, postId = null, file = {} }) => {
    try {
        const media = await Media.create({
            url,
            publicId,
            type,
            user: userId,
            post: postId,
            filename: file.originalname || null,
            format: file.mimetype?.split('/')[1] || null,
            size: file.size || null,
        });
        return media;
    } catch (error) {
        console.error('Error creating media record:', error);
        throw error;
    }
};

// Helper function to delete media by post
mediaController.deleteMediaByPost = async (postId) => {
    try {
        const mediaList = await Media.find({ post: postId, deletedAt: null });

        for (const media of mediaList) {
            if (media.publicId) {
                await cloudinary.uploader.destroy(media.publicId);
            }
        }

        await Media.updateMany({ post: postId }, { deletedAt: new Date() });
    } catch (error) {
        console.error('Error deleting media by post:', error);
        throw error;
    }
};

// Helper function to delete old avatar
mediaController.deleteOldAvatar = async (userId) => {
    try {
        const oldAvatar = await Media.findOne({ user: userId, type: 'avatar', deletedAt: null });

        if (oldAvatar) {
            if (oldAvatar.publicId) {
                await cloudinary.uploader.destroy(oldAvatar.publicId);
            }
            await Media.findByIdAndUpdate(oldAvatar._id, { deletedAt: new Date() });
        }
    } catch (error) {
        console.error('Error deleting old avatar:', error);
        throw error;
    }
};

module.exports = mediaController;
