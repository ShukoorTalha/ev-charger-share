const mongoose = require('mongoose');

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect(uri = null) {
    try {
      // Use provided URI or environment variable
      const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/evchargershare';
      
      // Connection options for production-ready setup
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        bufferCommands: false, // Disable mongoose buffering
        // Removed unsupported options
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;

      console.log(`MongoDB connected successfully to: ${this.connection.connection.host}`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  setupEventListeners() {
    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    db.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    db.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  async dropDatabase() {
    try {
      if (this.isConnected) {
        await mongoose.connection.db.dropDatabase();
        console.log('Database dropped successfully');
      } else {
        throw new Error('Database not connected');
      }
    } catch (error) {
      console.error('Error dropping database:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Get all models and create their indexes
      const models = mongoose.models;
      const indexPromises = [];

      for (const modelName in models) {
        const model = models[modelName];
        console.log(`Creating indexes for ${modelName}...`);
        indexPromises.push(model.createIndexes());
      }

      await Promise.all(indexPromises);
      console.log('All database indexes created successfully');
    } catch (error) {
      console.error('Error creating database indexes:', error);
      throw error;
    }
  }

  getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      state: states[mongoose.connection.readyState],
      isConnected: this.isConnected,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'error', message: 'Database not connected' };
      }

      // Perform a simple query to test connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getConnectionState()
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }

  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        database: stats.db,
        collections: stats.collections,
        documents: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Error handling utility
const handleDatabaseError = (error, operation = 'Database operation') => {
  console.error(`${operation} failed:`, error);
  
  // Categorize errors
  if (error.name === 'ValidationError') {
    return {
      type: 'validation',
      message: 'Data validation failed',
      details: Object.values(error.errors).map(err => err.message)
    };
  } else if (error.name === 'CastError') {
    return {
      type: 'cast',
      message: 'Invalid data type provided',
      details: error.message
    };
  } else if (error.code === 11000) {
    return {
      type: 'duplicate',
      message: 'Duplicate entry found',
      details: error.message
    };
  } else if (error.name === 'MongoNetworkError') {
    return {
      type: 'network',
      message: 'Database connection error',
      details: error.message
    };
  } else {
    return {
      type: 'unknown',
      message: 'An unexpected database error occurred',
      details: error.message
    };
  }
};

// Transaction utility
const withTransaction = async (operations) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const result = await operations(session);
    
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  dbConnection,
  handleDatabaseError,
  withTransaction,
  mongoose
};