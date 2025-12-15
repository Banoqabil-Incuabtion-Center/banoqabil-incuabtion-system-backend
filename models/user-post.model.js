const mongoose = require('mongoose')

const userPostSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  link: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
})

// Compound index for efficient querying of non-deleted posts sorted by newest
userPostSchema.index({ deletedAt: 1, createdAt: -1 });
userPostSchema.index({ user: 1, deletedAt: 1 });

module.exports = mongoose.model('userpost', userPostSchema);