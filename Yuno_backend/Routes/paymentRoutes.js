import express from 'express';
import {
  createCheckoutSession,
  createPayment,
  createPaymentWithSession,
  webhookHandler
} from '../Controller/paymentController.js';
import {
  authenticatePayment,
  paymentRateLimit
} from '../Authentication/authMiddleware.js';
import axios from 'axios';
import Order from '../Models/orderModel.js';
import User from '../Models/userModel.js';
import transactionModel from '../Models/transactionModel.js';

const router = express.Router();
const YUNO_API = "https://api-sandbox.y.uno/v1";

const YUNO_API_BASE = "https://api-sandbox.y.uno/v1";


router.post('/checkout-sessions',  createCheckoutSession);


// const YUNO_API_BASE = "https://api-sandbox.y.uno/v1";

router.post("/create-payment", async (req, res) => {
  const { orderId, customer_session, oneTimeToken, cardData } = req.body;
  console.log("Card",cardData)
    try {
    // const { orderId, userId } = req.body;

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch user
    const user = await User.findById(order.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare payload for Yuno
    const payload = {
      country: "US", // fix for now
      amount: {
        currency: order.currency,
        value: Math.round(order.totalAmount * 100), // ✅ cents
      },
      customer_payer: {
        id: user.yunoCustomerId,
        name: user.name,
        email: user.email,
        merchant_customer_validations: {
          account_is_verified: true,
          email_is_verified: true,
          phone_is_verified: true,
        },
      },
      workflow: "DIRECT",
      payment_method: {
        detail: {
          card: {
            card_data: {
              number: "4242424242424242", // ⚠️ test card
              expiration_month: 9,
              expiration_year: 29,
              security_code: "123",
              holder_name: user.name,
            },
            verify: false,
            capture: true,
          },
        },
        type: "CARD",
      },
      account_id: process.env.YUNO_ACCOUNT_ID, // sandbox accountId
      description: `Order ${order.orderNumber}`,
      merchant_order_id: order.orderNumber,
    };


    
    // Axios call
    const response = await axios.post(
      "https://api-sandbox.y.uno/v1/payments",
      payload,
      {
        headers: {
          accept: "application/json",
          "X-Idempotency-Key": Date.now().toString(),
          "content-type": "application/json",
          "public-api-key": process.env.PUBLIC_API_KEY,
          "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
        },
      }
    );
    await transactionModel.create({
      paymentId: response.data.id,
      providerName: "yuno",
      providerTransactionId: response.data.id,
      netAmount: order.totalAmount,
      amount: order.totalAmount,
      currency: order.currency,
      status: response.data.status,
      providerResponse: response.data,
      processedAt: new Date(),
      metadata: {
        cardData: cardData,
      },
    });

    console.log("✅ Yuno Payment Success:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("❌ Yuno Payment Error:", error.response?.data || error.message);
    return res
      .status(500)
      .json({ error: error.response?.data || error.message });
  }
});

// router.post("/create-payment", async (req, res) => {
//   const { orderId, customer_session, oneTimeToken } = req.body;

//   console.log("Received create-payment request:", { orderId, customer_session, oneTimeToken });

//   if (!customer_session || !oneTimeToken) {
//     return res.status(400).json({ error: "Missing customer_session or oneTimeToken" });
//   }

//  try {
//     const { orderId, oneTimeToken, customer_session } = req.body;

//     console.log("Received create-payment request:", { orderId, customer_session, oneTimeToken });

//     // 🔹 Validate required inputs
//     if (!orderId || !customer_session || !oneTimeToken) {
//       return res.status(400).json({ error: "Missing orderId, customer_session or oneTimeToken" });
//     }

//     // 🔹 Load order
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     // 🔹 Load user
//     const user = await User.findById(order.userId);
//     if (!user || !user.yunoCustomerId) {
//       return res.status(400).json({ error: "User missing yunoCustomerId" });
//     }

//     // 🔹 Amount & country
//     const country = (user.address?.country || "US").toUpperCase();
//     const currency = order.currency || "USD";
//     const amountValue = Number(order.totalAmount) || 0;

//     // 🔹 Call Yuno API to create payment
//     const response = await axios.post(
//       `${YUNO_API_BASE}/payments`,
//       {
//         account_id: process.env.YUNO_ACCOUNT_ID,
//         description: `Payment for order ${order._id}`,
//         country,
//         amount: { currency, value: amountValue },

//         // ✅ Checkout session (VERY IMPORTANT)
//         checkout: {
//           session: customer_session
//         },

//         // ✅ Link to correct customer
//         customer_id: user.yunoCustomerId,

//         // ✅ Payment method with token
//         payment_method: {
//           type: "CARD",
//           token: oneTimeToken,
//           detail: { capture: true }
//         },

//         merchant_order_id: order._id.toString(),
//       },
//       {
//         headers: {
//           "X-Idempotency-Key": new Date().toISOString(),
//           accept: "application/json",
//           "content-type": "application/json",
//           "public-api-key": process.env.PUBLIC_API_KEY,
//           "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
//         },
//         timeout: 30000,
//       }
//     );

//     res.json(response.data);
//   } catch (err) {
//     console.error("Yuno create-payment error:", err.response?.data || err.message);
//     res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
//   }
// });

// Process payment (authenticated)
router.post('/process', authenticatePayment, paymentRateLimit, createPayment);

// Webhook endpoint (no auth - uses signature verification)
router.post('/webhook', webhookHandler);

export default router;
