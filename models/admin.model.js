const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  refreshToken: String,

});

module.exports = mongoose.model("admin", adminSchema);