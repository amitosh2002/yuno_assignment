import axios from 'axios';
import crypto from 'crypto';
import Payment from '../Models/paymentModel.js';
import PaymentSession from '../Models/paymentSessionModel.js';
import Transaction from '../Models/transactionModel.js';
import Order from '../Models/orderModel.js';
import WebhookEvent from '../Models/webhookEventModel.js';
import User from "../Models/userModel.js"



const YUNO_API_BASE = "https://api-sandbox.y.uno/v1";
// controllers/paymentController.js

// const YUNO_API = "https://api.sandbox.y.uno/v1";
export const createPaymentWithSession = async (req, res) => {
  try {
    const { orderId, customer_session, oneTimeToken } = req.body;
    console.log("createPaymentWithSession called with:", { orderId, customer_session, oneTimeToken });

    if (!orderId || !customer_session || !oneTimeToken) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["orderId", "customerSession", "oneTimeToken"]
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Call Yuno Payments API
    const yunoResponse = await axios.post(
      `${YUNO_API_BASE}/payments`,
      {
        order_id: order._id.toString(),
        customer_session: customer_session,
        one_time_token: oneTimeToken,
        amount: Math.round(order.totalAmount * 100),
        currency: "USD",
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "public-api-key": process.env.PUBLIC_API_KEY,
          "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
        },
        timeout: 45000,
      }
    );

    const data = yunoResponse.data;

    // Return clientSecret and paymentId for frontend
    res.json({
      clientSecret: data.client_secret,
      paymentId: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency
    });
  } catch (err) {
    console.error("createPaymentWithSession error:", err);
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Yuno API error",
        details: err.response.data,
      });
    } else if (err.request) {
      return res.status(503).json({ error: "Payment service unavailable" });
    } else {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
};
export const createCheckoutSession = async (req, res) => {
  try {
    const { orderId, country: preferredCountry } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const user = await User.findById(order.userId);
    if (!user || !user.yunoCustomerId) {
      return res.status(400).json({ error: "Yuno customer ID not found for this user" });
    }

    console.log("User details:", user);

    const country = (preferredCountry || user.address?.country || "US").toUpperCase();

    // ✅ Create a checkout session with the complete customer object
    const yunoResponse = await axios.post(
      `${YUNO_API_BASE}/checkout/sessions`,
      {
        country,
        amount: { currency: order.currency || "USD", value: order.totalAmount },
        customer_id: user.yunoCustomerId,
        // ✅ ADD THE COMPLETE CUSTOMER OBJECT HERE
        customer: {
            first_name: user.name.split(' ').slice(0, -1).join(' '),
            last_name: user.name.split(' ').slice(-1)[0],
            email: user.email,
            phone: user.phone || null, // Assuming phone exists on your user model
            document: {
                document_number: user.documentNumber || null,
                document_type: user.documentType || null
            },
            billing_address: {
                street: user.address?.street,
                city: user.address?.city,
                state: user.address?.state,
                zip: user.address?.zip,
                country: user.address?.country
            },
            shipping_address: {
                street: user.address?.street,
                city: user.address?.city,
                state: user.address?.state,
                zip: user.address?.zip,
                country: user.address?.country
            }
        },
        merchant_order_id: order._id.toString(),
        payment_description: `Payment for order ${order._id}`,
        account_id: process.env.YUNO_ACCOUNT_ID,
        workflow: "CHECKOUT"
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "public-api-key": process.env.PUBLIC_API_KEY,
          "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
        },
      }
    );

    const data = yunoResponse.data;
    if (!data.checkout_session) {
      throw new Error("Invalid Yuno response, missing checkout_session");
    }

    const session = await PaymentSession.create({
      userId: order.userId,
      yunoSessionId: data.checkout_session,
      yunoClientSecret: data.client_secret || null,
      orderId,
      amount: order.totalAmount,
      currency: order.currency || "USD",
      status: "pending",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    res.json({
      checkoutSession: data.checkout_session,
      clientSecret: data.client_secret || null,
      sessionId: session._id,
      expiresAt: session.expiresAt,
    });

    console.log("Checkout session created & saved:", {
      checkoutSession: session.yunoSessionId,
      clientSecret: session.yunoClientSecret,
    });
  } catch (err) {
    console.error("Checkout session creation error:", err);

    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Yuno API error",
        details: err.response.data,
      });
    } else if (err.request) {
      return res.status(503).json({ error: "Payment service unavailable" });
    } else {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
};

export const createPayment = async (req, res) => {
  try {
    const { orderId, customerSession } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const paymentResp = await axios.post(
      `${YUNO_API_BASE}/payments`,
      {
        account_id: process.env.YUNO_ACCOUNT_ID,
        description: `Payment for order ${order._id}`,
        merchant_order_id: order._id.toString(),
        amount: { value: order.totalAmount, currency: order.currency || "USD" },
        payment_method: {
          detail: { type: "CARD", capture: true } // or false if 2-step
        },
        customer_session: customerSession
      },
      {
        headers: {
          "X-Idempotency-Key": crypto.randomUUID(), // ensure unique
          accept: "application/json",
          "content-type": "application/json",
          "public-api-key": process.env.PUBLIC_API_KEY,
          "private-secret-key": process.env.PRIVATE_SECURITY_KEY
        }
      }
    );

    const paymentData = paymentResp.data;

    res.json({
      paymentId: paymentData.id,
      clientSecret: paymentData.client_secret, // FRONTEND needs this
      status: paymentData.status
    });

  } catch (err) {
    console.error("Yuno payment creation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Helper function to map Yuno status to internal transaction status
const mapYunoStatusToTransactionStatus = (yunoStatus) => {
  const statusMap = {
    'CREATED': 'pending',
    'PENDING': 'processing',
    'SUCCEEDED': 'completed',
    'FAILED': 'failed',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded'
  };
  return statusMap[yunoStatus] || 'pending';
};

// Helper function to generate confirmation number
const generateConfirmationNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `YUN${timestamp}${random}`;
};





// controllers/paymentController.js
export const webhookHandler = async (req, res) => {
  try {
    const event = req.body;
    const signature = req.headers['yuno-signature'] || req.headers['x-yuno-signature'];
    
    // Verify webhook signature (important for security)
    if (!verifyWebhookSignature(req.body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Validate required event structure
    if (!event.type || !event.data || !event.data.id) {
      console.error('Invalid webhook event structure:', event);
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    // Log webhook event for auditing
    const webhookEvent = await WebhookEvent.create({
      provider: "yuno",
      eventType: event.type,
      eventId: event.id || generateEventId(),
      payload: event,
      processedAt: null,
      status: 'received',
      processingAttempts: 0
    });

    console.log(`Processing Yuno webhook: ${event.type} for ${event.data.id}`);

    // Process different event types
    await processWebhookEvent(event, webhookEvent._id);

    // Mark webhook as processed
    await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
      status: 'processed',
      processedAt: new Date()
    });

    res.status(200).json({ 
      success: true, 
      eventId: webhookEvent._id,
      message: 'Webhook processed successfully' 
    });

  } catch (err) {
    console.error('Webhook processing error:', err);

    // Try to update webhook event status if we have the ID
    if (req.webhookEventId) {
      try {
        await WebhookEvent.findByIdAndUpdate(req.webhookEventId, {
          status: 'failed',
          errorMessage: err.message,
          processingAttempts: { $inc: 1 }
        });
      } catch (updateErr) {
        console.error('Failed to update webhook event:', updateErr);
      }
    }

    // Always return 200 to prevent webhook retries for application errors
    // Return 5xx only for temporary issues
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(200).json({ 
        error: 'Invalid data format', 
        message: err.message 
      });
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Process different webhook event types
const processWebhookEvent = async (event, webhookEventId) => {
  const { type, data } = event;

  switch (type) {
    case 'payment.succeeded':
      await handlePaymentSucceeded(data);
      break;
    
    case 'payment.failed':
      await handlePaymentFailed(data);
      break;
    
    case 'payment.cancelled':
      await handlePaymentCancelled(data);
      break;
    
    case 'payment.refunded':
      await handlePaymentRefunded(data);
      break;
    
    case 'payment.dispute_created':
      await handleDisputeCreated(data);
      break;
    
    case 'payment.chargeback':
      await handleChargeback(data);
      break;
    
    default:
      console.log(`Unhandled webhook event type: ${type}`);
      // Still log for future reference
      break;
  }
};

// Handle successful payment
const handlePaymentSucceeded = async (data) => {
  console.log(`Processing successful payment: ${data.id}`);
  
  // Update transaction status
  const transaction = await Transaction.findOneAndUpdate(
    { providerTransactionId: data.id },
    { 
      status: 'completed',
      processedAt: new Date(),
      providerResponse: data
    },
    { new: true }
  );

  if (!transaction) {
    console.error(`Transaction not found for provider ID: ${data.id}`);
    return;
  }

  // Update payment status
  await Payment.findByIdAndUpdate(transaction.paymentId, {
    status: 'completed',
    processedAt: new Date(),
    metadata: {
      ...transaction.metadata,
      webhookConfirmed: true,
      confirmedAt: new Date()
    }
  });

  // Update order status
  const payment = await Payment.findById(transaction.paymentId);
  if (payment && payment.orderId) {
    await Order.findByIdAndUpdate(payment.orderId, {
      status: 'paid',
      paidAt: new Date()
    });

    // Update inventory
    await updateInventoryForOrder(payment.orderId);
  }

  // Send confirmation notifications
  await sendPaymentConfirmation(payment._id);
};

// Handle failed payment
const handlePaymentFailed = async (data) => {
  console.log(`Processing failed payment: ${data.id}`);
  
  const transaction = await Transaction.findOneAndUpdate(
    { providerTransactionId: data.id },
    { 
      status: 'failed',
      failureReason: data.failure_reason || 'Payment failed',
      providerResponse: data
    },
    { new: true }
  );

  if (transaction) {
    await Payment.findByIdAndUpdate(transaction.paymentId, {
      status: 'failed',
      metadata: {
        ...transaction.metadata,
        failureReason: data.failure_reason,
        failedAt: new Date()
      }
    });

    // Send failure notification
    await sendPaymentFailureNotification(transaction.paymentId);
  }
};

// Handle cancelled payment
const handlePaymentCancelled = async (data) => {
  console.log(`Processing cancelled payment: ${data.id}`);
  
  const transaction = await Transaction.findOneAndUpdate(
    { providerTransactionId: data.id },
    { 
      status: 'cancelled',
      providerResponse: data
    },
    { new: true }
  );

  if (transaction) {
    await Payment.findByIdAndUpdate(transaction.paymentId, {
      status: 'cancelled'
    });
  }
};

// Handle refunded payment
const handlePaymentRefunded = async (data) => {
  console.log(`Processing refunded payment: ${data.id}`);
  
  // Create refund transaction
  const originalTransaction = await Transaction.findOne({
    providerTransactionId: data.original_payment_id || data.id
  });

  if (originalTransaction) {
    // Create refund payment record
    const refundPayment = await Payment.create({
      userId: originalTransaction.userId,
      orderId: originalTransaction.orderId,
      amount: data.refund_amount || data.amount,
      currency: data.currency,
      paymentType: 'refund',
      status: 'completed',
      confirmationNumber: generateConfirmationNumber(),
      description: `Refund for payment ${originalTransaction.providerTransactionId}`,
      processedAt: new Date(),
      metadata: {
        originalPaymentId: originalTransaction.paymentId,
        refundReason: data.reason
      }
    });

    // Create refund transaction
    await Transaction.create({
      paymentId: refundPayment._id,
      providerName: 'yuno',
      providerTransactionId: data.id,
      amount: data.refund_amount || data.amount,
      currency: data.currency,
      status: 'completed',
      providerResponse: data,
      processedAt: new Date()
    });

    // Update original payment status
    await Payment.findByIdAndUpdate(originalTransaction.paymentId, {
      status: 'refunded'
    });

    // Send refund notification
    await sendRefundNotification(refundPayment._id);
  }
};

// Handle dispute creation
const handleDisputeCreated = async (data) => {
  console.log(`Processing dispute: ${data.id}`);
  
  const transaction = await Transaction.findOne({
    providerTransactionId: data.payment_id || data.id
  });

  if (transaction) {
    await Payment.findByIdAndUpdate(transaction.paymentId, {
      status: 'disputed',
      metadata: {
        ...transaction.metadata,
        disputeId: data.dispute_id,
        disputeReason: data.reason,
        disputeAmount: data.amount,
        disputedAt: new Date()
      }
    });

    // Notify relevant teams about dispute
    await notifyDisputeTeam(data);
  }
};

// Handle chargeback
const handleChargeback = async (data) => {
  console.log(`Processing chargeback: ${data.id}`);
  
  const transaction = await Transaction.findOne({
    providerTransactionId: data.payment_id || data.id
  });

  if (transaction) {
    await Payment.findByIdAndUpdate(transaction.paymentId, {
      status: 'disputed',
      paymentType: 'chargeback',
      metadata: {
        ...transaction.metadata,
        chargebackId: data.id,
        chargebackAmount: data.amount,
        chargebackReason: data.reason,
        chargebackAt: new Date()
      }
    });

    // Handle chargeback process
    await processChargeback(data);
  }
};

// Verify webhook signature for security
const verifyWebhookSignature = (payload, signature) => {
  if (!signature || !process.env.YUNO_WEBHOOK_SECRET || !process.env.WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.YUNO_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// Helper functions (implement based on your notification system)
const sendPaymentConfirmation = async (paymentId) => {
  // Implementation depends on your notification service
  console.log(`Sending payment confirmation for ${paymentId}`);
};

const sendPaymentFailureNotification = async (paymentId) => {
  console.log(`Sending payment failure notification for ${paymentId}`);
};

const sendRefundNotification = async (paymentId) => {
  console.log(`Sending refund notification for ${paymentId}`);
};

const notifyDisputeTeam = async (data) => {
  console.log(`Notifying dispute team about ${data.id}`);
};

const processChargeback = async (data) => {
  console.log(`Processing chargeback ${data.id}`);
};

const updateInventoryForOrder = async (orderId) => {
  console.log(`Updating inventory for order ${orderId}`);
};

const generateEventId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

// const generateConfirmationNumber = () => {
//   const timestamp = Date.now().toString().slice(-6);
//   const random = Math.random().toString(36).substring(2, 6).toUpperCase();
//   return `YUN${timestamp}${random}`;
// };

