import mongoose from "mongoose";
const userSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  refreshToken: { type: String, required: true },
  device: { type: String },
  ip: { type: String },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("UserSession", userSessionSchema);
