const mongoose = require('mongoose')

const userPostSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  link: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
})

module.exports = mongoose.model('userpost', userPostSchema);