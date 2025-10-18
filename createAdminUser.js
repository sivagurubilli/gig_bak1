import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admin schema
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Admin = mongoose.model('Admin', adminSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gurubilli:VrOY63wHF4q0F3Z1@cluster0.dlpod.mongodb.net/giggles';
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user with custom credentials
    const adminData = {
      username: 'giggleadmin',
      password: await bcrypt.hash('GiggleAdmin2024!', 10),
      name: 'GiggleBuz Administrator',
      role: 'super_admin'
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: adminData.username });
    if (existingAdmin) {
      console.log(`⚠️ Admin user already exists with username: ${adminData.username}`);
      console.log('📋 Existing admin details:', {
        username: existingAdmin.username,
        name: existingAdmin.name,
        role: existingAdmin.role,
        createdAt: existingAdmin.createdAt
      });
      
      // Update the password
      existingAdmin.password = adminData.password;
      existingAdmin.name = adminData.name;
      existingAdmin.role = adminData.role;
      await existingAdmin.save();
      
      console.log('✅ Admin user updated successfully!');
      console.log('🔑 Updated credentials:');
      console.log(`   Username: ${adminData.username}`);
      console.log('   Password: GiggleAdmin2024!');
    } else {
      const newAdmin = await Admin.create(adminData);
      console.log('✅ New admin user created successfully!');
      console.log('📋 Admin details:', {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      });
      console.log('🔑 Admin credentials:');
      console.log(`   Username: ${adminData.username}`);
      console.log('   Password: GiggleAdmin2024!');
    }

    // List all admin users
    console.log('\n📋 All Admin Users:');
    const allAdmins = await Admin.find({}).select('-password');
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.username} (${admin.role}) - ${admin.name}`);
    });

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
createAdminUser();
