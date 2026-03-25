const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  let token;

  // 1. Check Authorization Header (Bearer)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Check Cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (err) {
    // 🔥 JWT EXPIRED
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "jwt expired" });
    }

    // Other JWT errors
    return res.status(401).json({ error: "Invalid token" });
  }
};

exports.optionalProtect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // If token is invalid/expired, just proceed as unauthenticated
    next();
  }
};
