import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './DbConfig/dbConfig.js';
import customerRoutes from './Routes/customerRoutes.js';
import paymentRoutes from './Routes/paymentRoutes.js';
import orderRoutes from './Routes/orderRoutes.js';
import transactionRoutes from './Routes/transactionRoutes.js';
import userRoutes from './Routes/userRoutes.js';
// import yunoPaymentRoutes from './Routes/yunoPaymentRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
console.log(process.env.NODE_ENV)
connectDB();
// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'https://yuno-frontend.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes

app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Yuno Payment Backend'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     error: 'Route not found',
//     path: req.originalUrl
//   });
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});
