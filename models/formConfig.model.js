const mongoose = require('mongoose');

const formConfigSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'date', 'radio', 'select', 'textarea', 'email', 'number'],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String], // Array of strings for select/radio options
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FormConfig', formConfigSchema);
