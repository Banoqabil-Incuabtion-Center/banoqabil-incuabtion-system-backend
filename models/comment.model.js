// models/commentModel.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'comment',
    default: null
  },
  depth: {
    type: Number,
    default: 0,
    max: [5, 'Maximum nesting depth is 5 levels']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for replies
commentSchema.virtual('replies', {
  ref: 'comment',
  localField: '_id',
  foreignField: 'parentComment',
  match: { deletedAt: null }
});

// Pre-save hook to calculate depth
commentSchema.pre('save', async function (next) {
  if (this.parentComment && this.isNew) {
    try {
      const parentComment = await this.constructor.findById(this.parentComment);
      if (parentComment) {
        this.depth = parentComment.depth + 1;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Indexes for faster queries
commentSchema.index({ post: 1, deletedAt: 1 });
commentSchema.index({ parentComment: 1, deletedAt: 1 });
commentSchema.index({ post: 1, parentComment: 1, deletedAt: 1 });

module.exports = mongoose.model('comment', commentSchema);