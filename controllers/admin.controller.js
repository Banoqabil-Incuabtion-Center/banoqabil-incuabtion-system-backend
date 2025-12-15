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

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: admin._id,
        username: admin.username
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
}
module.exports = adminController
