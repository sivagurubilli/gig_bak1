import mongoose from 'mongoose';

export async function connectDatabase() {
  // Set MongoDB URI directly
  const MONGODB_URI = "mongodb+srv://gurubilli:VrOY63wHF4q0F3Z1@cluster0.dlpod.mongodb.net/giggles";

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs
    
    // Configure mongoose connection options
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    };

    await mongoose.connect(MONGODB_URI, options);
    console.log('Connected to MongoDB successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {  
    console.error('MongoDB connection error:', error);
    console.error('Please check your MONGODB_URI environment variable');
    process.exit(1);   
  }
}

export { mongoose };