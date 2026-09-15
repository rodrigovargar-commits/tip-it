// Runs before each test file. Points the app at a dedicated local test
// database — never the real one — and wipes it between tests so no test can
// leak state into another (RV Mejores Prácticas §9: fixtures don't carry
// real data, and every test starts from a known state).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-do-not-use-in-prod';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/tip-it-test';
process.env.PLATFORM_FEE_PERCENT = process.env.PLATFORM_FEE_PERCENT || '6';
process.env.PLATFORM_FEE_FIXED_CENTS = process.env.PLATFORM_FEE_FIXED_CENTS || '400';

const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.close();
});
