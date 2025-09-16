import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['yuno', 'stripe', 'paypal']
  },
  eventType: {
    type: String,
    required: true
  },
  eventId: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'failed', 'retrying'],
    default: 'received'
  },
  processingAttempts: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  errorMessage: {
    type: String
  },
  signature: {
    type: String
  },
  signatureVerified: {
    type: Boolean,
    default: false
  },
  relatedPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  relatedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
webhookEventSchema.index({ provider: 1, eventType: 1 });
webhookEventSchema.index({ eventId: 1 }, { unique: true });
webhookEventSchema.index({ status: 1 });
webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index({ processedAt: -1 });

export default mongoose.model('WebhookEvent', webhookEventSchema);
