import mongoose from "mongoose";
const paymentSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   yunoSessionId: { type: String, index: true, sparse: true },   // From Yuno
  yunoClientSecret: { type: String },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model("PaymentSession", paymentSessionSchema);
