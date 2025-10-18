import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/giggleadmin';

export async function connectDatabase() {
  try {
    // Configure mongoose connection options
    const options = {
      serverSelectionTimeoutMS: 15000, // 15 seconds for better reliability
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: true, // Enable command buffering for production stability
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      bufferMaxEntries: 0, // Disable mongoose buffering
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, options);
    
    // Wait for connection to be fully established
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve(true);
      } else {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      }
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 MongoDB ready state: ${mongoose.connection.readyState}`);
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error: any) {  
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Server will continue without MongoDB connection');
    console.log('💡 To fix: Start MongoDB locally or set MONGODB_URI environment variable');
    // Don't exit the process, let the server run without MongoDB
  }
}

// Helper function to check if database is ready
export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1; // 1 = connected
}

export { mongoose };