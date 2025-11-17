const mongoose = require('mongoose');

class TestDatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.mongoServer = null;
  }

  async connect() {
    try {
      // Use MongoDB Memory Server for testing
      const { MongoMemoryServer } = require('mongodb-memory-server');
      this.mongoServer = await MongoMemoryServer.create();
      const mongoUri = this.mongoServer.getUri();
      
      // Connection options for testing
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      };

      // Connect to the in-memory database
      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;
      
      return this.connection;
    } catch (error) {
      console.error('Test MongoDB connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
    }
    
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  async clearDatabase() {
    if (this.isConnected) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  }
}

// Create singleton instance
const testDbConnection = new TestDatabaseConnection();

module.exports = {
  testDbConnection,
};
