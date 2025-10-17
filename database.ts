import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/giggleadmin';

export async function connectDatabase() {
  try {
    // Configure mongoose connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds for faster timeout
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true
    };

    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Connected to MongoDB successfully');
    
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

  } catch (error) {  
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Server will continue without MongoDB connection');
    console.log('💡 To fix: Start MongoDB locally or set MONGODB_URI environment variable');
    // Don't exit the process, let the server run without MongoDB
  }
}

export { mongoose };