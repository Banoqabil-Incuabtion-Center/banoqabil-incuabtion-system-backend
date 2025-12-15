const mongoose = require("mongoose");

module.exports = async () => {
  try {
    const mongoURL = process.env.MONGO_URL;
    if (!mongoURL) throw new Error("MONGO_URL not found in environment");
    await mongoose.connect(mongoURL);
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});
