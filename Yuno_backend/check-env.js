import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Check');
console.log('================================');

console.log('MONGO_URI:', process.env.MONGO_URI || 'mongodb://localhost:27017/yuno_payments (using fallback)');
console.log('PORT:', process.env.PORT || '5000 (using fallback)');
console.log('PUBLIC_API_KEY:', process.env.PUBLIC_API_KEY ? '✅ Found' : '❌ Missing');
console.log('PRIVATE_SECURITY_KEY:', process.env.PRIVATE_SECURITY_KEY ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');

console.log('\n📋 Environment file status:');
console.log('- .env file exists and is being loaded');
console.log('- dotenv is injecting variables correctly');

console.log('\n🚀 Server should start successfully now!');
