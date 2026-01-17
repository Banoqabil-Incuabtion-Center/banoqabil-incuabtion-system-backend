const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  bq_id: {
    type: String,
    unique: true,
  },
  incubation_id: {
    type: String,
    unique: true,
  },
  name: String,
  bio: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  password: String,
  phone: String,
  CNIC: {
    type: String,
    unique: true,
  },
  dob: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  shift: {
    type: String,
    enum: ["Morning", "Evening"],
  },
  workingDays: {
    type: [Number], // 0=Sun, 1=Mon, ..., 6=Sat
    default: null,  // If null, use shift default
  },
  location: {
    type: String,
    enum: [
      "Bahadurabad",
      "Expo (Fossphorus)",
      "Clifton",
      "Idarah Noor e Haq",
      "Jamia Millia",
    ],
  },
  course: {
    type: String,
    enum: [
      "Web Development",
      "Graphic Designing",
      "Digital Marketing",
      "Data Science",
      "Data Analytics",
      "Cyber Security",
      "Mobile App Development",
      "E-commerce",
      "Content Writing",
      "Video Editing",
    ],
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "team",
  },
  avatar: {
    type: String,
    default: null,
  },
  refreshToken: {
    type: String,
  },
  termsAccepted: {
    type: Boolean,
    required: true,
  },
  termsAcceptedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  cardSettings: {
    theme: { type: String, default: 'default' }, // default, glass, gradient, dark
    accentColor: { type: String, default: 'primary' },
    borderRadius: { type: String, default: 'rounded-2xl' },
    showStatus: { type: Boolean, default: true },
    backgroundColor: { type: String, default: '' }, // Custom hex or class
    textColor: { type: String, default: '' }, // Custom hex or class
    gradient: { type: String, default: '' }, // Gradient preset name
  },
  attendanceStats: {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 }
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: null,
  },
  // E2E Encryption fields
  publicKey: {
    type: String,
    default: null,
  },
  encryptedPrivateKey: {
    type: String,
    default: null,
  },
  privateKeyIv: {
    type: String,
    default: null,
  },
  privateKeySalt: {
    type: String,
    default: null,
  },
  // Password Reset fields
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
});

// Pre-save hook to generate incubation_id
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.incubation_id) {
    try {
      // Find the user with the highest incubation_id (excluding null values)
      const lastUser = await this.constructor
        .findOne({
          incubation_id: { $exists: true, $ne: null, $regex: /^inc-\d+$/ }
        })
        .sort({ incubation_id: -1 })
        .limit(1);

      let nextNumber = 1;

      if (lastUser && lastUser.incubation_id) {
        // Extract the number from the last incubation_id (e.g., "inc-0001" -> 1)
        const lastNumber = parseInt(lastUser.incubation_id.split("-")[1]);

        // Check if parsing was successful
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Generate new incubation_id with leading zeros (e.g., "inc-0001")
      this.incubation_id = `inc-${String(nextNumber).padStart(4, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("user", userSchema);