const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route POST /api/auth/register-admin
const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log(`\n--- LOGIN REQUEST START ---`);
  console.log(`[Login] Attempting login for email: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[Login] Failed: User not found.`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[Login] Failed: Incorrect password.`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log(`[Login] Success: User authenticated.`);
    console.log(`[Login] DB User Role: '${user.role}'`);

    const token = generateToken(user._id, user.role);
    console.log(`[Login] JWT Generated with role payload: '${user.role}'`);
    console.log(`--- LOGIN REQUEST END ---\n`);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      domain: user.domain,
      token: token,
    });
  } catch (error) {
    console.error(`[Login] Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/auth/create-user (Admin only)
const createUser = async (req, res) => {
  const { name, email, password, domain } = req.body;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      domain,
      createdBy: req.user._id,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      domain: user.domain,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/auth/users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const users = await User.find({ role: 'user' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/auth/users/:id (Admin only)
const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = {
  registerAdmin,
  loginUser,
  createUser,
  getAllUsers,
  deleteUser,
  getMe,
};