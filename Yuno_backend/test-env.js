import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Test');
console.log('================================');

console.log('PUBLIC_API_KEY:', process.env.PUBLIC_API_KEY ? '✅ Found' : '❌ Missing');
console.log('PRIVATE_SECURITY_KEY:', process.env.PRIVATE_SECURITY_KEY ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Missing');

if (process.env.PUBLIC_API_KEY) {
  console.log('\n📋 PUBLIC_API_KEY (first 20 chars):', process.env.PUBLIC_API_KEY.substring(0, 20) + '...');
}

if (process.env.PRIVATE_SECURITY_KEY) {
  console.log('📋 PRIVATE_SECURITY_KEY (first 20 chars):', process.env.PRIVATE_SECURITY_KEY.substring(0, 20) + '...');
}

console.log('\n🚀 Ready to test customer creation!');
console.log('Run: curl -X POST http://localhost:5000/api/customers \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"name":"Test User","email":"test@example.com","address":{"street":"123 Test St","city":"Test City","state":"TS","zip":"12345","country":"US"}}\'');
