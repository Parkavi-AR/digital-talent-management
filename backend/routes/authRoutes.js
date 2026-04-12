const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginUser,
  createUser,
  getAllUsers,
  deleteUser,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register-admin', registerAdmin);
router.post('/login', loginUser);

// Protected routes (Admin only)
router.post('/create-user', protect, createUser);
router.get('/users', protect, getAllUsers);
router.delete('/users/:id', protect, deleteUser);

// Protected routes (Any logged in user)
router.get('/me', protect, getMe);

module.exports = router;