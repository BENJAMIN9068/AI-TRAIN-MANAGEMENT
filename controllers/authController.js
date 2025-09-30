const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Register a new user (Admin only operation)
const register = async (req, res) => {
  try {
    const { username, email, password, role, fullName, employeeId, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { employeeId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or employee ID already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'staff',
      fullName,
      employeeId,
      phoneNumber
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          employeeId: user.employeeId
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login user with hardcoded credentials
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
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
        fullName: 'IRTOMS Administrator',
        employeeId: adminCredentials,
        lastLogin: new Date()
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
        fullName: `Railway Staff ${username}`,
        employeeId: username,
        lastLogin: new Date()
      };
      role = 'staff';
    }
    else {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token (using username as ID for hardcoded system)
    const token = generateToken(user.id);

    // Set session for web interface
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Logout user
const logout = (req, res) => {
  try {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          employeeId: user.employeeId,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['fullName', 'phoneNumber', 'email'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
