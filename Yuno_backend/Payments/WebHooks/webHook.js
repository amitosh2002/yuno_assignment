import mongoose from "mongoose";
const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  eventType: { type: String, required: true },
  payload: { type: Object, required: true },
  processed: { type: Boolean, default: false }
}, { timestamps: { createdAt: "receivedAt" } });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
