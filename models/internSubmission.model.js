const mongoose = require('mongoose');

const internSubmissionSchema = new mongoose.Schema(
  {
    // Personal Details
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    address: { type: String, required: true, trim: true },
    emailAddress: { type: String, required: true, lowercase: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    guardianNumber: { type: String, trim: true }, // Optional
    cnicNumber: { type: String, required: true, trim: true },
    fatherOrGuardianName: { type: String, required: true, trim: true },

    // Course Details
    course: { type: String, required: true, trim: true },
    teacherName: { type: String, required: true, trim: true },
    campus: { type: String, required: true, trim: true },
    obtainedMarks: { type: String, required: true, trim: true },

    // About You
    aboutYou: { type: String, required: true, trim: true },

    // Dynamic fields added via admin form builder
    dynamicData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('InternSubmission', internSubmissionSchema);
