const express = require('express');
const router = express.Router();
const {
  createTask,
  getAllTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  submitTask,
  completeTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ⚠️ IMPORTANT: /my-tasks MUST be before /:id
router.get('/my-tasks', protect, getMyTasks);
router.put('/:id/submit', protect, upload.single('file'), submitTask);
router.put('/:id/complete', protect, completeTask);

router.post('/', protect, createTask);
router.get('/', protect, getAllTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

module.exports = router;