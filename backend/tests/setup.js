const { testDbConnection } = require('../config/testDatabase');

// Mock console.log for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);

// Global test database setup
beforeAll(async () => {
  // Connect to the in-memory database
  await testDbConnection.connect();
});

afterAll(async () => {
  // Disconnect from the in-memory database
  await testDbConnection.disconnect();
});

// Clean up collections before each test
beforeEach(async () => {
  await testDbConnection.clearDatabase();
});