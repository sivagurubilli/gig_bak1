import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gurubilli:VrOY63wHF4q0F3Z1@cluster0.dlpod.mongodb.net/giggles';

export async function connectDatabase() {
  try {
    console.log('🔄 Starting MongoDB connection...');
    console.log(`📡 MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
    console.log(`📡 Using URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    
    // Configure mongoose connection options
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds for better reliability
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: true, // Enable command buffering for production stability
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true
    };

    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
    console.log(`📊 Database name: ${mongoose.connection.db?.databaseName}`);
    
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