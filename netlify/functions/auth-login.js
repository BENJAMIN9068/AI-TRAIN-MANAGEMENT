const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection helper
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    cachedDb = conn;
    console.log('MongoDB Connected for Netlify Function');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

// User Schema (simplified)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Only create model if it doesn't exist
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Create default users if they don't exist
async function createDefaultUsers() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcryptjs.hash('admin123', 12);
      await User.create({
        username: 'admin',
        fullName: 'IRTOMS Administrator',
        email: 'admin@irtoms.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created');
    }

    const staffExists = await User.findOne({ username: 'staff' });
    if (!staffExists) {
      const hashedPassword = await bcryptjs.hash('staff123', 12);
      await User.create({
        username: 'staff',
        fullName: 'Railway Staff',
        email: 'staff@irtoms.com',
        password: hashedPassword,
        role: 'staff'
      });
      console.log('Default staff user created');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse request body
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: 'Username and password are required'
        })
      };
    }

    // Hardcoded credentials for Staff Portal
    const staffCredentials = [
      'BCS2024200', 'BCS2024300', 'BCS2024400', 'BCS2024500',
      'BCS2024600', 'BCS2024700', 'BCS2024800', 'BCS2024900'
    ];
    const staffPassword = 'BCS2024261';
    
    // Hardcoded credentials for Admin Portal
    const adminCredentials = 'BCS2024261';
    const adminPassword = 'BCS2024261';

    let user = null;
    let role = null;

    // Check for admin credentials
    if (username === adminCredentials && password === adminPassword) {
      user = {
        id: 'admin_001',
        username: adminCredentials,
        email: 'admin@irtoms.railway.gov.in',
        role: 'admin',
        fullName: 'IRTOMS Administrator'
      };
      role = 'admin';
    }
    // Check for staff credentials
    else if (staffCredentials.includes(username) && password === staffPassword) {
      user = {
        id: `staff_${username}`,
        username: username,
        email: `${username}@irtoms.railway.gov.in`,
        role: 'staff',
        fullName: `Railway Staff ${username}`
      };
      role = 'staff';
    }
    else {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials'
        })
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'IRTOMS_Railway_System_Secret_Key_2024_BCS',
      { expiresIn: '24h' }
    );

    // Return user data
    const userData = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          token: token
        }
      })
    };

  } catch (error) {
    console.error('Login function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error'
      })
    };
  }
};