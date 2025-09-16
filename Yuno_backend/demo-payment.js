// Demo script for complete payment flow
// Run with: node demo-payment.js

const API_BASE = 'http://localhost:5000/api';

// Demo data
const customerData = {
  name: 'Alice Johnson',
  email: 'alice.johnson@example.com',
  address: {
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    country: 'US'
  }
};

const orderData = {
  items: [
    {
      name: 'Laptop Pro',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      quantity: 1,
      sku: 'LAPTOP-001',
      category: 'Electronics'
    },
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 49.99,
      quantity: 1,
      sku: 'MOUSE-001',
      category: 'Accessories'
    }
  ],
  subtotal: 1349.98,
  tax: 108.00,
  shipping: 15.99,
  totalAmount: 1473.97,
  currency: 'USD',
  shippingAddress: {
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    country: 'US'
  }
};

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error.message);
    throw error;
  }
}

// Step 1: Create Customer
async function createCustomer() {
  console.log('\n👤 Step 1: Creating Customer...');
  console.log('Customer Data:', JSON.stringify(customerData, null, 2));
  
  const result = await apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
  
  console.log('✅ Customer Created Successfully!');
  console.log('📋 Customer Details:', {
    userId: result.user.id,
    name: result.user.name,
    email: result.user.email,
    yunoCustomerId: result.user.yunoCustomerId
  });
  
  return result.token;
}

// Step 2: Create Order
async function createOrder(token) {
  console.log('\n📦 Step 2: Creating Order...');
  console.log('Order Data:', JSON.stringify(orderData, null, 2));
  
  const result = await apiRequest('/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(orderData)
  });
  
  console.log('✅ Order Created Successfully!');
  console.log('📋 Order Details:', {
    orderId: result.order._id,
    orderNumber: result.order.orderNumber,
    totalAmount: result.order.totalAmount,
    status: result.order.status,
    itemCount: result.order.items.length
  });
  
  return result.order._id;
}

// Step 3: Create Checkout Session
async function createCheckoutSession(token, orderId) {
  console.log('\n💳 Step 3: Creating Checkout Session...');
  
  const result = await apiRequest('/payments/checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ orderId })
  });
  
  console.log('✅ Checkout Session Created!');
  console.log('📋 Session Details:', {
    checkoutSession: result.checkoutSession,
    sessionId: result.sessionId,
    expiresAt: result.expiresAt
  });
  
  return result.checkoutSession;
}

// Step 4: Simulate Payment Processing
async function processPayment(token, checkoutSession) {
  console.log('\n💰 Step 4: Processing Payment...');
  console.log('⚠️  Note: This is a demo. In real implementation:');
  console.log('   1. Frontend collects payment method details');
  console.log('   2. Yuno SDK generates oneTimeToken');
  console.log('   3. Backend processes payment with token');
  
  // For demo purposes, we'll show what the request would look like
  const paymentRequest = {
    checkoutSession: checkoutSession,
    oneTimeToken: 'demo_token_from_yuno_frontend_sdk'
  };
  
  console.log('📋 Payment Request (Demo):', JSON.stringify(paymentRequest, null, 2));
  
  try {
    const result = await apiRequest('/payments/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentRequest)
    });
    
    console.log('✅ Payment Processed Successfully!');
    console.log('📋 Payment Details:', {
      paymentId: result.payment.id,
      confirmationNumber: result.payment.confirmationNumber,
      status: result.payment.status,
      amount: result.payment.amount
    });
    
    return result;
  } catch (error) {
    console.log('⚠️  Payment Processing Demo Failed (Expected - no real payment method)');
    console.log('   Error:', error.message);
    return null;
  }
}

// Check Order Status
async function checkOrderStatus(token, orderId) {
  console.log('\n📊 Step 5: Checking Order Status...');
  
  try {
    const result = await apiRequest(`/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📋 Current Order Status:', {
      orderId: result.order._id,
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      totalAmount: result.order.totalAmount,
      paymentId: result.order.paymentId || 'Not paid yet'
    });
  } catch (error) {
    console.log('❌ Failed to check order status:', error.message);
  }
}

// Main demo function
async function runPaymentDemo() {
  console.log('🚀 Starting Complete Payment Flow Demo...');
  console.log('=' * 50);
  
  try {
    // Step 1: Create Customer
    const token = await createCustomer();
    
    // Step 2: Create Order
    const orderId = await createOrder(token);
    
    // Step 3: Create Checkout Session
    const checkoutSession = await createCheckoutSession(token, orderId);
    
    // Step 4: Process Payment (Demo)
    await processPayment(token, checkoutSession);
    
    // Step 5: Check Order Status
    await checkOrderStatus(token, orderId);
    
    console.log('\n🎉 Demo Complete!');
    console.log('\n📝 Next Steps for Real Implementation:');
    console.log('1. Set up Yuno frontend SDK in your web/mobile app');
    console.log('2. Collect payment method details securely');
    console.log('3. Generate oneTimeToken from Yuno SDK');
    console.log('4. Process payment with real token');
    console.log('5. Handle success/failure responses');
    console.log('6. Set up webhook endpoints for status updates');
    
  } catch (error) {
    console.error('\n❌ Demo Failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure server is running: npm run dev');
    console.log('2. Check MongoDB connection');
    console.log('3. Verify .env file has correct Yuno API keys');
    console.log('4. Check server logs for detailed error messages');
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPaymentDemo().catch(console.error);
}

export { runPaymentDemo };
