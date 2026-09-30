const mongoose = require("mongoose");

const internshipApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      unique: true,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "internship_applications",
  }
);

internshipApplicationSchema.pre("save", async function (next) {
  if (this.isNew && !this.applicationNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.applicationNumber = `APP-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model(
  "InternshipApplication",
  internshipApplicationSchema
);
