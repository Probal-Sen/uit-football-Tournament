const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Use a test database - use the same connection string but with test database name
let TEST_MONGO_URI = process.env.TEST_MONGO_URI;
if (!TEST_MONGO_URI && process.env.MONGO_URI) {
  // Replace the database name in the connection string with test database
  TEST_MONGO_URI = process.env.MONGO_URI.replace(/\/[^/?]+(\?|$)/, '/uit-football-test$1');
} else if (!TEST_MONGO_URI) {
  TEST_MONGO_URI = 'mongodb://localhost:27017/uit-football-test';
}

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Connect to test database before all tests
beforeAll(async () => {
  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to test database');
  } catch (error) {
    console.error('Test database connection error:', error);
    throw error;
  }
});

// Clean up database after each test
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (error) {
        // Ignore errors for non-existent collections
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Close database connection after all tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      console.log('Test database connection closed');
    }
  } catch (error) {
    console.error('Error closing test database:', error);
  }
});

