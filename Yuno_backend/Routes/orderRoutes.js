import express from 'express';
import Order from '../Models/orderModel.js';
import { authenticateToken } from '../Authentication/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';


const router = express.Router();

// Create new order (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // The userId is correctly extracted from the authenticated user token
    const userId = req.user.id;

    // Use the entire req.body as the order data
    const { items, subtotal, tax, shipping, totalAmount, currency, shippingAddress } = req.body;

    // Validate that required fields are present
    if (!items || items.length === 0 || !totalAmount) {
        return res.status(400).json({
            error: 'Order must contain items and a total amount.',
            code: 'INVALID_ORDER_DATA'
        });
    }

    const orderData = {
       orderNumber: uuidv4(), 
        userId,
        items,
        subtotal,
        tax,
        shipping,
        totalAmount,
        currency,
        shippingAddress
    };

    // Correctly create the order with all fields
    const order = await Order.create(orderData);
        
    res.status(201).json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      code: 'ORDER_CREATION_FAILED'
    });
  }
});

// Get user's orders (authenticated)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('paymentId');
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to retrieve orders',
      code: 'ORDERS_RETRIEVAL_FAILED'
    });
  }
});

// Get specific order (authenticated)
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user.id
    }).populate('paymentId');
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to retrieve order',
      code: 'ORDER_RETRIEVAL_FAILED'
    });
  }
});

// Update order status (authenticated - user can only cancel their own orders)
router.patch('/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Only allow certain status changes for users
    const allowedUserStatuses = ['cancelled'];
    if (!allowedUserStatuses.includes(status)) {
      return res.status(403).json({
        error: 'You can only cancel orders',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, userId: req.user.id },
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      code: 'ORDER_UPDATE_FAILED'
    });
  }
});

export default router;
