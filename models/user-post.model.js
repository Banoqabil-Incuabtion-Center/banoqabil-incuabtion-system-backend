const mongoose = require('mongoose')

const userPostSchema = new mongoose.Schema({
  title: String,
  description: String,
  // Legacy single image field (kept for backward compatibility)
  image: String,
  // New: Array of image URLs for carousel
  images: [String],
  // New: Aspect ratio for image display
  aspectRatio: {
    type: String,
    enum: ['1:1', '4:5', '16:9', 'original'],
    default: '4:5'
  },
  link: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
})

// Virtual getter to combine legacy image with new images array
userPostSchema.virtual('allImages').get(function () {
  if (this.images && this.images.length > 0) {
    return this.images;
  }
  return this.image ? [this.image] : [];
});

// Compound index for efficient querying of non-deleted posts sorted by newest
userPostSchema.index({ deletedAt: 1, createdAt: -1 });
userPostSchema.index({ user: 1, deletedAt: 1 });

module.exports = mongoose.model('userpost', userPostSchema);