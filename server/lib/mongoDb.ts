import mongoose from 'mongoose';
import { log } from '../vite';

// Connection URL - using environment variable for the MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduAI';

// Connect to MongoDB with appropriate options and timeout
export async function connectToDatabase() {
  try {
    log(`Attempting to connect to MongoDB at ${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@') > 0 ? MONGODB_URI.indexOf('@') : 20)}...`, 'mongodb');
    
    // Set connection timeout to 10 seconds
    const connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds for socket operations
      connectTimeoutMS: 10000, // 10 seconds for initial connection
    });
    
    // Use Promise.race to implement a timeout
    const result = await Promise.race([
      connectionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
      )
    ]);
    
    log('Connected to MongoDB Atlas database', 'mongodb');
    return true;
  } catch (error) {
    log(`Error connecting to MongoDB: ${error}`, 'mongodb');
    return false;
  }
}

// Disconnect from MongoDB
export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    log('Disconnected from MongoDB Atlas database', 'mongodb');
    return true;
  } catch (error) {
    log(`Error disconnecting from MongoDB: ${error}`, 'mongodb');
    return false;
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  log('MongoDB connection established', 'mongodb');
});

mongoose.connection.on('error', (err) => {
  log(`MongoDB connection error: ${err}`, 'mongodb');
});

mongoose.connection.on('disconnected', () => {
  log('MongoDB connection disconnected', 'mongodb');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  log('MongoDB connection closed due to app termination', 'mongodb');
  process.exit(0);
});