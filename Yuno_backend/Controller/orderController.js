import Order from "../models/Order.js";

export const createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount } = req.body;

    const order = new Order({
      userId,
      items,
      totalAmount,
      status: "pending",
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Error creating order" });
  }
};
