const adminModel = require("../models/admin.model")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const adminController = {}

// ✅ Create admin with hashed password
adminController.createAdmin = async (req, res) => {
  try {
    const plainPassword = "admin1234"
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const admin = await adminModel.create({
      username: "admin",
      password: hashedPassword,
    })

    res.status(201).json({ message: "Admin created", admin })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
}

adminController.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ message: "Username & password required" })

    const admin = await adminModel.findOne({ username })
    if (!admin) return res.status(401).json({ message: "Invalid credentials" })

    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" })

    // Generate tokens
    const accessToken = jwt.sign(
      { id: admin._id, username: admin.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // Short-lived access token
    )

    const crypto = require('crypto');
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Save refresh token to DB
    admin.refreshToken = hashedRefreshToken;
    await admin.save();

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      // Max age 30 days
      maxAge: 30 * 24 * 60 * 60 * 1000
    };

    res.cookie("adminRefreshToken", refreshToken, cookieOptions);
    // Optional: Set access token in cookie too if desired, but frontend uses header mostly. 
    // We'll set it just in case or for redundancy, but axios interceptor uses storage.
    // Actually, let's keep it consistent with user auth and provide token in body.

    res.status(200).json({
      message: "Login successful",
      accessToken, // Frontend expects 'accessToken' or 'token'
      token: accessToken, // Providing both for compatibility
      user: {
        id: admin._id,
        username: admin.username,
        role: "admin"
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
}

// ✅ Refresh Access Token
adminController.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const crypto = require('crypto');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const admin = await adminModel.findOne({ refreshToken: hashedRefreshToken });

    if (!admin) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: admin._id, username: admin.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Logout
adminController.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (refreshToken) {
      const crypto = require('crypto');
      const hashedRefreshToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Remove token from DB
      await adminModel.findOneAndUpdate(
        { refreshToken: hashedRefreshToken },
        { $unset: { refreshToken: 1 } }
      );
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    res.clearCookie("adminRefreshToken", cookieOptions);
    res.clearCookie("token", cookieOptions); // If we set it

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = adminController
