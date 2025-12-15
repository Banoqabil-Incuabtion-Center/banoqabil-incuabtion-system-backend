// ✅ utils/tokenGenerator.js
const jwt = require("jsonwebtoken")

const UsertokenGenerator = (user) => {
  return jwt.sign(
    {
      email: user.email,
      id: user._id,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "6h" }
  )
}

module.exports = { UsertokenGenerator }
