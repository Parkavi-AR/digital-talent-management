const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    taskType: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'completed'],
      default: 'pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    domain: {
      type: String,
      enum: [
        'Full Stack',
        'Sales & Marketing',
        'Data Science',
        'UI/UX Design',
        'HR & Management',
        'AI & ML',
      ],
      required: true,
    },
    submissionNote: {
      type: String,
      default: '',
    },
    githubLink: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
    fileLink: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);