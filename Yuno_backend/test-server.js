import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

console.log('🚀 Testing Server Startup...');
console.log('============================');

// Test MongoDB connection
async function testMongoDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/yuno_payments';
    console.log('📊 Connecting to MongoDB:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully!');
    
    // Disconnect after test
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
}

// Test environment variables
function testEnvVars() {
  console.log('\n🔍 Environment Variables:');
  console.log('MONGO_URI:', process.env.MONGO_URI || 'mongodb://localhost:27017/yuno_payments (fallback)');
  console.log('PORT:', process.env.PORT || '5000 (fallback)');
  console.log('PUBLIC_API_KEY:', process.env.PUBLIC_API_KEY ? '✅ Found' : '❌ Missing');
  console.log('PRIVATE_SECURITY_KEY:', process.env.PRIVATE_SECURITY_KEY ? '✅ Found' : '❌ Missing');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');
}

// Run tests
async function runTests() {
  testEnvVars();
  await testMongoDB();
  
  console.log('\n🎉 Server should start successfully now!');
  console.log('Run: npm run dev');
}

runTests().catch(console.error);
