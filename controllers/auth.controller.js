const userModel = require("../models/user.model");
const Activity = require("../models/activity.model");
const bcrypt = require("bcrypt");
const { UsertokenGenerator } = require("../utils/token.util");
const paginate = require("../utils/paginate.util");
const mongoose = require("mongoose");
const { parseUserAgent, getClientIP, getLocationFromIP } = require("../utils/deviceDetector.util");

const authController = {};

// ✅ Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ Helper function to log activity (IMPROVED)
const logActivity = async (userId, action, req, sessionId = null) => {
  try {
    const { getDeviceAndLocationInfo } = require("../utils/deviceDetector.util");

    // Get all device and location info
    const info = await getDeviceAndLocationInfo(req);

    const activityData = {
      userId,
      action,
      device: info.device,
      ip: info.ip,
      location: info.location,
      userAgent: info.userAgent,
      sessionId,
      timestamp: new Date()
    };

    await Activity.create(activityData);

    console.log(`✅ Activity logged: ${action} for user ${userId} from ${info.location.city}, ${info.device.platform}`);
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    // Don't throw error - login should still work even if logging fails
  }
};

// ✅ Signup - Create new user
authController.signupPost = async (req, res, next) => {
  try {
    const { bq_id, name, email, password, phone, CNIC, course, gender, shift, dob, termsAccepted } = req.validatedData;

    const existingbq_id = await userModel.findOne({ bq_id });
    if (existingbq_id) {
      return res.status(400).json({
        errors: { bq_id: "This BQ Id is not available, please try another" }
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        errors: { email: "This Email is Already Registered" }
      });
    }

    const existingCNIC = await userModel.findOne({ CNIC });
    if (existingCNIC) {
      return res.status(400).json({
        errors: { CNIC: "This CNIC is Already Registered" }
      });
    }

    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age <= 12) {
      return res.status(400).json({
        errors: { dob: "You must be greater than 12 years old" }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await userModel.create({
      bq_id,
      name,
      email,
      password: hash,
      phone,
      CNIC,
      course,
      gender,
      shift,
      dob,
      termsAccepted
    });

    return res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Get enum values for form dropdowns
authController.getenums = async (req, res, next) => {
  try {
    const courseOptions = userModel.schema.path("course").enumValues;
    const genderOptions = userModel.schema.path("gender").enumValues;
    const shiftOptions = userModel.schema.path("shift").enumValues;

    return res.status(200).json({
      courses: courseOptions,
      genders: genderOptions,
      shifts: shiftOptions
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Get all users with pagination
authController.signupGet = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: userModel,
      page,
      limit,
      query: { deletedAt: null },
      sort: { createdAt: -1, _id: 1 },
      populate: null
    });

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};

// ✅ Login - WITH ACTIVITY TRACKING
authController.loginPost = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const emailLower = email.toLowerCase();

    const user = await userModel.findOne({ email: emailLower, deletedAt: null });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Generate tokens
    const accessToken = UsertokenGenerator(user);
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');

    const accessTokenCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    };

    let refreshToken = null;

    if (req.body.remember) {
      refreshToken = crypto.randomBytes(40).toString('hex');

      const hashedRefreshToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      user.refreshToken = hashedRefreshToken;
      await user.save();

      const refreshCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      };

      res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    } else {
      user.refreshToken = undefined;
      await user.save();
      res.clearCookie("refreshToken");
    }

    res.cookie("token", accessToken, accessTokenCookieOptions);

    // 🔥 LOG LOGIN ACTIVITY & GET DEVICE INFO
    const { getDeviceAndLocationInfo } = require("../utils/deviceDetector.util");
    const deviceInfo = await getDeviceAndLocationInfo(req);
    await logActivity(user._id, 'login', req, sessionId);

    // 🔔 Create Login Notification
    try {
      const Notification = require('../models/notification.model');
      const { emitNotification } = require('../socket');

      console.log('🔔 Attempting to create Login Notification for:', user._id);
      const notification = await Notification.create({
        recipient: user._id,
        sender: user._id, // Sender is self for system/login alerts
        type: 'LOGIN',
        message: `New login detected from ${deviceInfo.location?.city || 'Unknown Location'}, ${deviceInfo.device?.platform || 'Unknown Device'}`,
        data: {
          device: deviceInfo.device,
          location: deviceInfo.location,
          ip: deviceInfo.ip
        }
      });
      console.log('✅ Notification created in DB:', notification._id);

      const populatedNotification = await notification.populate('sender', 'name profilePicture username');
      emitNotification(user._id, populatedNotification);
      console.log('📡 Notification emitted via socket to:', user._id);
    } catch (notifError) {
      console.error('Error creating login notification:', notifError);
      // Don't fail login if notification fails
    }

    res.status(200).json({
      message: "Login successful",
      token: accessToken,
      sessionId,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        bq_id: user.bq_id,
        avatar: user.avatar
      },
      loginInfo: {
        device: deviceInfo.device,
        location: deviceInfo.location,
        ip: deviceInfo.ip
      }
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Refresh Access Token
authController.refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const crypto = require('crypto');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const user = await userModel.findOne({ refreshToken: hashedRefreshToken, deletedAt: null });

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const accessToken = UsertokenGenerator(user);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie("token", accessToken, cookieOptions);

    res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
};

// ✅ Get current logged-in user
authController.loginGet = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Logout - WITH ACTIVITY TRACKING
authController.logout = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      // 🔥 LOG LOGOUT ACTIVITY
      await logActivity(req.user.id, 'logout', req);

      await userModel.findByIdAndUpdate(req.user.id, { refreshToken: undefined });
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    res.clearCookie("token", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Get Activities
// ✅ Get Activities (FIXED)
authController.getActivities = async (req, res, next) => {
  try {
    const { userId, action, deviceType, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const query = {};

    // Filter by user (admin can see all, user can see only their own)
    if (userId) {
      if (!isValidObjectId(userId)) {
        return res.status(400).json({ error: "Invalid User ID" });
      }
      query.userId = userId;
    } else if (req.user && !req.user.isAdmin) {
      // If not admin, only show their own activities
      query.userId = req.user.id;
    } else if (req.user) {
      // User is logged in
      query.userId = req.user.id;
    }

    // Filter by action type
    if (action && ['login', 'logout'].includes(action)) {
      query.action = action;
    }

    // Filter by device type
    if (deviceType && ['desktop', 'mobile', 'tablet'].includes(deviceType)) {
      query['device.type'] = deviceType;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const result = await paginate({
      model: Activity,
      page,
      limit,
      query,
      sort: { timestamp: -1 },
      populate: {
        path: 'userId',
        select: 'name email bq_id avatar'
      }
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
// ✅ Get Currently Active Users (NEW ENDPOINT)
authController.getActiveUsers = async (req, res, next) => {
  try {
    // Get all recent login activities
    const recentActivities = await Activity.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 });

    // Track which users are currently logged in
    const activeUsers = new Map();

    for (const activity of recentActivities) {
      const userId = activity.userId.toString();

      if (activity.action === 'login') {
        if (!activeUsers.has(userId)) {
          activeUsers.set(userId, {
            userId: activity.userId,
            loginTime: activity.timestamp,
            device: activity.device,
            ip: activity.ip,
            location: activity.location
          });
        }
      } else if (activity.action === 'logout') {
        activeUsers.delete(userId);
      }
    }

    // Populate user details
    const activeUserIds = Array.from(activeUsers.keys());
    const users = await userModel.find({
      _id: { $in: activeUserIds }
    }).select('name email bq_id avatar');

    const result = users.map(user => {
      const activityData = activeUsers.get(user._id.toString());
      return {
        user,
        ...activityData
      };
    });

    res.status(200).json({
      count: result.length,
      activeUsers: result
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Update user
authController.updateUser = async (req, res, next) => {
  try {
    const { _id } = req.params;
    let { bq_id, name, email, phone, CNIC, course, gender, shift } = req.body;

    if (email) {
      email = email.toLowerCase();
    }

    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await userModel.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email && email !== user.email) {
      const existingEmail = await userModel.findOne({
        email,
        _id: { $ne: _id }
      });
      if (existingEmail) {
        return res.status(400).json({
          field: "email",
          message: "This email is already registered to another user"
        });
      }
    }

    if (bq_id && bq_id !== user.bq_id) {
      const existingBqId = await userModel.findOne({
        bq_id,
        _id: { $ne: _id }
      });
      if (existingBqId) {
        return res.status(400).json({
          field: "bq_id",
          message: "This BQ ID is already registered to another user"
        });
      }
    }

    await userModel.findByIdAndUpdate(
      _id,
      { bq_id, name, email, phone, CNIC, course, gender, shift },
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Delete user
authController.deleteUser = async (req, res) => {
  try {
    const { _id } = req.params;

    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const deleted = await userModel.findByIdAndUpdate(
      _id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Update user avatar
authController.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { isCloudinaryConfigured } = require('../config/multer.config');

    if (!isCloudinaryConfigured) {
      return res.status(503).json({
        message: "Image upload is not available. Cloudinary credentials are not configured.",
        hint: "Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.development file"
      });
    }

    const avatarUrl = req.file.path;

    const mediaController = require('./media.controller');

    await mediaController.deleteOldAvatar(userId);

    await mediaController.createMediaRecord({
      url: avatarUrl,
      publicId: req.file.filename,
      type: 'avatar',
      userId: userId,
      file: req.file,
    });

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = authController;