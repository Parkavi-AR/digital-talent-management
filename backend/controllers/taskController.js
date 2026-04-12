const Task = require('../models/Task');
const User = require('../models/User');

// @route POST /api/tasks (Admin only)
const createTask = async (req, res) => {
  const { title, description, dueDate, assignedTo, domain, taskType } = req.body;
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized: ${req.user.role} role detected` });
    }

    if (!title || !description || !dueDate || !assignedTo || !domain) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const dateObj = new Date(dueDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid due date format. Please use YYYY-MM-DD.' });
    }

    const assignees = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

    const users = await User.find({ _id: { $in: assignees } });
    if (users.length !== assignees.length) {
      return res.status(404).json({ message: 'One or more assigned users not found' });
    }

    const tasksToCreate = assignees.map((userId) => ({
      title,
      description,
      dueDate,
      assignedTo: userId,
      domain,
      taskType: taskType || 'daily',
      createdBy: req.user._id,
    }));

    await Task.insertMany(tasksToCreate);

    res.status(201).json({ message: `${tasksToCreate.length} task(s) created.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/tasks (Admin only)
const getAllTasks = async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized: ${req.user.role} role detected` });
    }

    const tasks = await Task.find()
      .populate('assignedTo', 'name email domain')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/tasks/my-tasks (User only)
const getMyTasks = async (req, res) => {
  try {
    console.log(`[DEBUG] Fetching tasks for user ID: ${req.user._id} (${req.user.name})`);
    
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    console.log(`[DEBUG] Found ${tasks.length} tasks for user: ${req.user.name}`);
    res.json(tasks);
  } catch (error) {
    console.error(`[ERROR] getMyTasks: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/tasks/:id (Admin only)
const updateTask = async (req, res) => {
  const { title, description, dueDate, status, domain, taskType, assignedTo } = req.body;
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized: ${req.user.role} role detected` });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.dueDate = dueDate || task.dueDate;
    task.status = status || task.status;
    task.domain = domain || task.domain;
    task.taskType = taskType || task.taskType;
    if (assignedTo) {
      task.assignedTo = assignedTo;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/tasks/:id (Admin only)
const deleteTask = async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized: ${req.user.role} role detected` });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/tasks/:id/submit (User only)
const submitTask = async (req, res) => {
  const { submissionNote, githubLink } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const assigneeId = task.assignedTo && task.assignedTo._id ? task.assignedTo._id : task.assignedTo;
    if (assigneeId.toString() !== req.user._id.toString() && req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized. Assigned: ${assigneeId}, User: ${req.user._id}` });
    }

    task.status = 'submitted';
    task.submissionNote = submissionNote || '';
    task.githubLink = githubLink || '';

    if (req.file) {
      task.fileName = req.file.originalname;
      task.fileLink = `/uploads/${req.file.filename}`;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/tasks/:id/complete (Admin only)
const completeTask = async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: `Not authorized: ${req.user.role} role detected` });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'completed';
    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  submitTask,
  completeTask,
};