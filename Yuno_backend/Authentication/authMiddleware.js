import jwt from 'jsonwebtoken';
import User from '../Models/userModel.js';

// JWT Authentication Middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET);
    
    // Find the user to ensure they still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      yunoCustomerId: user.yunoCustomerId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error.',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Optional authentication middleware (for routes that can work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = {
          id: user._id,
          email: user.email,
          name: user.name,
          yunoCustomerId: user.yunoCustomerId
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Payment-specific authentication middleware
export const authenticatePayment = async (req, res, next) => {
  try {
    // First check for JWT authentication
    await authenticateToken(req, res, (err) => {
      if (err) return next(err);
    });

    // Additional payment-specific validations
    if (!req.user.yunoCustomerId) {
      return res.status(400).json({
        error: 'Customer not properly set up for payments. Please complete customer registration.',
        code: 'CUSTOMER_NOT_SETUP'
      });
    }

    next();
  } catch (error) {
    console.error('Payment auth error:', error);
    return res.status(500).json({
      error: 'Payment authentication failed.',
      code: 'PAYMENT_AUTH_ERROR'
    });
  }
};

// Admin authentication middleware
export const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, (err) => {
      if (err) return next(err);
    });

    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      error: 'Admin authentication failed.',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};

// Rate limiting middleware for payment endpoints
export const paymentRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const clientId = req.user?.id || req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10; // Max 10 payment attempts per 15 minutes

  if (!req.rateLimitStore) {
    req.rateLimitStore = new Map();
  }

  const clientData = req.rateLimitStore.get(clientId) || { count: 0, resetTime: now + windowMs };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }

  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many payment attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  clientData.count++;
  req.rateLimitStore.set(clientId, clientData);

  next();
};
