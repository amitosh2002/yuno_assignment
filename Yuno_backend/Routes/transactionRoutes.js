import express from 'express';
import Transaction from '../Models/transactionModel.js';
import Payment from '../Models/paymentModel.js';
import { authenticateToken } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Get user's transactions (authenticated)
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    const paymentIds = payments.map(p => p._id);
    
    const transactions = await Transaction.find({ paymentId: { $in: paymentIds } })
      .sort({ createdAt: -1 })
      .populate('paymentId');
    
    res.json({
      success: true,
      transactions: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transactions',
      code: 'TRANSACTIONS_RETRIEVAL_FAILED'
    });
  }
});

// Get specific transaction (authenticated)
router.get('/:transactionId', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('paymentId');
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Check if transaction belongs to the authenticated user
    if (transaction.paymentId.userId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }
    
    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transaction',
      code: 'TRANSACTION_RETRIEVAL_FAILED'
    });
  }
});

export default router;
