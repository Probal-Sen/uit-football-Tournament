// Quick MongoDB connection test
// Run: node test-mongo.js

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uit-football';

console.log('Testing MongoDB connection...');
console.log('Connection string:', MONGO_URI.replace(/\/\/.*@/, '//***:***@')); // Hide password

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('Database:', mongoose.connection.db.databaseName);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', err.message);
    
    // Check for specific error types
    if (err.message.includes('authentication failed') || err.code === 8000) {
      console.log('\n🔐 AUTHENTICATION ERROR DETECTED');
      console.log('Your MongoDB Atlas username or password is incorrect.');
      console.log('\n💡 Fix steps:');
      console.log('1. Go to MongoDB Atlas → "Database Access"');
      console.log('2. Verify your username and password');
      console.log('3. If password has special characters (@, #, $, etc.), URL-encode them');
      console.log('4. Run: .\\encode-password.ps1 (to encode your password)');
      console.log('5. Update MONGO_URI in .env file with correct credentials');
      console.log('6. See fix-mongo-connection.md for detailed help');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.log('\n🔌 CONNECTION REFUSED');
      console.log('MongoDB server is not running or not accessible.');
      console.log('\n💡 Fix steps:');
      console.log('1. For local: Make sure MongoDB service is running');
      console.log('2. For Atlas: Check if cluster is active and IP is whitelisted');
      console.log('3. Verify your connection string is correct');
    } else {
      console.log('\n💡 General Troubleshooting:');
      console.log('1. Make sure MongoDB is running (local) or your Atlas cluster is active');
      console.log('2. Check your MONGO_URI in .env file');
      console.log('3. For Atlas: Verify IP is whitelisted and credentials are correct');
      console.log('4. See MONGODB_SETUP.md or fix-mongo-connection.md for detailed instructions');
    }
    process.exit(1);
  });

