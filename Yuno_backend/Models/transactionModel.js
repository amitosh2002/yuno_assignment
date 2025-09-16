import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    paymentId: { type: String, ref: "Payment", required: true },
    providerName: { type: String, enum: ["yuno"], required: true },
    providerTransactionId: { type: String, required: true }, // Yuno transaction ID
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: [
        "pending",     // waiting for provider
        "processing",  // being processed
        "completed",   // payment completed
        "failed",      // declined or error
        "cancelled",   // cancelled by user
        "refunded",
        "SUCCEEDED"  ,
        "FAILED"  ,
        "CANCELLED"  ,
        "REFUNDED"  ,
        "DISPUTED"  ,
        "CHARGEBACK"  ,
        "CHARGEBACK_REVERSED"  ,
        "CHARGEBACK_REVERSED_REVERSED"  ,
        // money refunded
      ],
      default: "pending",
    },
    riskScore: { type: Object }, // fraud/risk assessment
    paymentMethodInfo: {
      type: { type: String },      // card / bank_transfer / etc.
      brand: { type: String },     // e.g., Visa, Mastercard
      last4: { type: String },     // last 4 digits
      expiryMonth: { type: String },
      expiryYear: { type: String },
      holderName: { type: String }
    },
    providerFee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    providerResponse: { type: Object }, // full provider API response
    failureReason: { type: String },
    processedAt: { type: Date },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ providerTransactionId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
