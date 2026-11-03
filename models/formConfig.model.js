const mongoose = require('mongoose');

const formConfigSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
    },
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
      // Must cover every type the admin Form Builder offers and the landing form renders
      enum: ['text', 'date', 'radio', 'select', 'textarea', 'email', 'number', 'phone', 'checkbox'],
      required: true,
    },
    placeholder: {
      type: String,
      trim: true,
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
