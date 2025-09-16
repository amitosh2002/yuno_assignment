import express from 'express';
import {
  createCustomer,
  
  updateCustomer,

} from '../Controller/customerController.js';
import { authenticateToken, authenticatePayment } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Create customer (public route - creates user account)
router.post('/', createCustomer);


// Update customer information (authenticated)
router.put('/:customerId', authenticateToken, updateCustomer);



export default router;
