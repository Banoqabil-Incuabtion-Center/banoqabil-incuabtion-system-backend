const mongoose = require("mongoose");

const AttSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening'],
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Early Leave', 'Late + Early Leave', 'Incomplete', 'No Checkout', 'Late + No Checkout'],
    default: 'Absent'
  },
  hoursWorked: {
    type: Number,
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes for faster queries
AttSchema.index({ user: 1, createdAt: -1 });
AttSchema.index({ user: 1, shift: 1, createdAt: -1 });
AttSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attendance', AttSchema);
