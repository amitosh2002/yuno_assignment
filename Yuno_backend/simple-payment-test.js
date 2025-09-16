// Simple payment test - step by step
console.log('🚀 Starting Simple Payment Test...\n');

// Step 1: Test customer creation
console.log('Step 1: Create Customer');
console.log('POST /api/customers');
console.log('Body:', JSON.stringify({
  name: "John Doe",
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US"
  }
}, null, 2));

console.log('\nExpected Response:');
console.log(JSON.stringify({
  message: "Customer created successfully",
  user: {
    id: "user_id_here",
    name: "John Doe",
    email: "john@example.com",
    yunoCustomerId: "yuno_customer_id_here"
  },
  token: "jwt_token_here"
}, null, 2));

console.log('\n' + '='.repeat(50));

// Step 2: Test order creation
console.log('\nStep 2: Create Order');
console.log('POST /api/orders');
console.log('Headers: Authorization: Bearer YOUR_JWT_TOKEN');
console.log('Body:', JSON.stringify({
  items: [
    {
      name: "Premium Widget",
      price: 29.99,
      quantity: 1,
      sku: "WIDGET-001"
    }
  ],
  subtotal: 29.99,
  tax: 2.40,
  shipping: 5.99,
  totalAmount: 38.38,
  currency: "USD"
}, null, 2));

console.log('\n' + '='.repeat(50));

// Step 3: Test checkout session
console.log('\nStep 3: Create Checkout Session');
console.log('POST /api/payments/checkout-session');
console.log('Headers: Authorization: Bearer YOUR_JWT_TOKEN');
console.log('Body:', JSON.stringify({
  orderId: "ORDER_ID_FROM_STEP_2"
}, null, 2));

console.log('\n' + '='.repeat(50));

// Step 4: Test payment processing
console.log('\nStep 4: Process Payment');
console.log('POST /api/payments/process');
console.log('Headers: Authorization: Bearer YOUR_JWT_TOKEN');
console.log('Body:', JSON.stringify({
  checkoutSession: "CHECKOUT_SESSION_FROM_STEP_3",
  oneTimeToken: "ONE_TIME_TOKEN_FROM_YUNO_FRONTEND"
}, null, 2));

console.log('\n🎉 Payment Flow Complete!');
console.log('\n📋 To test manually:');
console.log('1. Use curl commands from first-payment-guide.md');
console.log('2. Use Postman or similar API client');
console.log('3. Integrate with frontend using Yuno SDK');
