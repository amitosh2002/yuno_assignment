// Test script to demonstrate API usage
// Run with: node test-api.js

const API_BASE = 'http://localhost:5000/api';

// Test data
const customerData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  address: {
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US'
  }
};

const orderData = {
  items: [
    {
      name: 'Premium Widget',
      description: 'A high-quality widget for all your needs',
      price: 29.99,
      quantity: 2,
      sku: 'WIDGET-001',
      category: 'Electronics'
    },
    {
      name: 'Widget Accessory',
      description: 'Essential accessory for the widget',
      price: 9.99,
      quantity: 1,
      sku: 'ACCESS-001',
      category: 'Accessories'
    }
  ],
  subtotal: 69.97,
  tax: 5.60,
  shipping: 5.99,
  totalAmount: 81.56,
  currency: 'USD'
};

// Helper function to make API requests
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
    console.error(`API Error for ${endpoint}:`, error.message);
    throw error;
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const result = await apiRequest('/health');
    console.log('✅ Health Check:', result);
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }
}

async function testCustomerCreation() {
  console.log('\n👤 Testing Customer Creation...');
  try {
    const result = await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
    
    console.log('✅ Customer Created:', {
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      yunoCustomerId: result.user.yunoCustomerId
    });
    
    return result.token; // Return JWT token for authenticated requests
  } catch (error) {
    console.log('❌ Customer Creation Failed:', error.message);
    return null;
  }
}

async function testOrderCreation(token) {
  console.log('\n📦 Testing Order Creation...');
  if (!token) {
    console.log('⏭️ Skipping - No authentication token');
    return null;
  }

  try {
    const result = await apiRequest('/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    
    console.log('✅ Order Created:', {
      orderId: result.order._id,
      orderNumber: result.order.orderNumber,
      totalAmount: result.order.totalAmount,
      status: result.order.status
    });
    
    return result.order._id;
  } catch (error) {
    console.log('❌ Order Creation Failed:', error.message);
    return null;
  }
}

async function testUserProfile(token) {
  console.log('\n👤 Testing User Profile...');
  if (!token) {
    console.log('⏭️ Skipping - No authentication token');
    return;
  }

  try {
    const result = await apiRequest('/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ User Profile:', {
      name: result.user.name,
      email: result.user.email,
      yunoCustomerId: result.user.yunoCustomerId
    });
  } catch (error) {
    console.log('❌ User Profile Failed:', error.message);
  }
}

async function testGetOrders(token) {
  console.log('\n📋 Testing Get Orders...');
  if (!token) {
    console.log('⏭️ Skipping - No authentication token');
    return;
  }

  try {
    const result = await apiRequest('/orders/my-orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Orders Retrieved:', {
      count: result.orders.length,
      orders: result.orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status
      }))
    });
  } catch (error) {
    console.log('❌ Get Orders Failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('API Base URL:', API_BASE);
  
  // Run tests in sequence
  await testHealthCheck();
  
  const token = await testCustomerCreation();
  
  await testUserProfile(token);
  
  const orderId = await testOrderCreation(token);
  
  await testGetOrders(token);
  
  console.log('\n✨ Test Suite Complete!');
  console.log('\nNext Steps:');
  console.log('1. Create a checkout session for the order');
  console.log('2. Process a payment using Yuno API');
  console.log('3. Handle webhooks from Yuno');
  console.log('\nNote: Payment processing requires valid Yuno API credentials');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, apiRequest };
