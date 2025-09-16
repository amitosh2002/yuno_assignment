import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  paymentSessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PaymentSession' ,
    unique:true
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order' 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'],
    default: 'pending'
  },
  paymentType: {
    type: String,
    enum: ['purchase', 'refund', 'chargeback'],
    default: 'purchase'
  },
  yunoPaymentId: { 
    type: String, 
    sparse: true 
  },
  confirmationNumber: { 
    type: String, 
    unique: true 
  },
  description: { 
    type: String 
  },
  processedAt: { 
    type: Date 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  failureReason: { 
    type: String 
  },
  refundAmount: { 
    type: Number, 
    default: 0 
  },
  fees: {
    provider: { type: Number, default: 0 },
    processing: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ yunoPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ confirmationNumber: 1 });

export default mongoose.model('Payment', paymentSchema);
