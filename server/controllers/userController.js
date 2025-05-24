const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let avatarUrl = null;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    } else {
      avatarUrl = '/uploads/default.png';
    }
 
    const user = await User.create({ username, email, passwordHash, avatarUrl });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const users = await User.find({ _id: { $ne: currentUserId } }).select('username email avatarUrl');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to retrieve users', error: err.message });
  }
};

exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { username, email, password } = req.body || {};

    const updatedFields = {};

    if (username) updatedFields.username = username;
    if (email) updatedFields.email = email;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updatedFields.passwordHash = passwordHash;
    }

    if (req.file) {
      updatedFields.avatarUrl = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true, select: '-passwordHash' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      username: updatedUser.username,
      avatarUrl: updatedUser.avatarUrl,
    });
А
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};

exports.savePushToken = async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res.status(400).json({ message: 'userId and pushToken are required' });
  }

  try {
    await User.findByIdAndUpdate(userId, { pushToken });
    res.json({ message: 'Token saved successfully' });
    console.log('Token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ message: 'Failed to save token' });
  }
};