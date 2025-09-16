import axios from "axios";
import Order from "../models/Order.js";
import transactionModel from "../Models/transactionModel.js";

// Initiate payment transaction with Yuno
export const createTransaction = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Call Yuno to create session
    
    const yunoResponse = await axios.post(
      "https://api.y.uno/v1/sessions",
      {
        amount: order.totalAmount,
        currency: "USD",
        orderId: order._id.toString(),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.YUNO_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const sessionId = yunoResponse.data.sessionId;

    // Save transaction in DB
    const transaction = new transactionModel({
      orderId: order._id,
      amount: order.totalAmount,
      status: "pending",
      yunoSessionId: sessionId,
    });

    await transaction.save();

    res.status(201).json({ transaction, sessionId });
  } catch (error) {
    console.error("Error creating transaction:", error.response?.data || error);
    res.status(500).json({ message: "Error creating transaction" });
  }
};

// Webhook handler from Yuno
export const webhookHandler = async (req, res) => {
  try {
    const { transactionId, status, paymentMethod } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { yunoTransactionId: transactionId },
      {
        status,
        paymentMethod,
      },
      { new: true }
    );

    if (transaction && status === "succeeded") {
      await Order.findByIdAndUpdate(transaction.orderId, { status: "paid" });
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ message: "Error processing webhook" });
  }
};
