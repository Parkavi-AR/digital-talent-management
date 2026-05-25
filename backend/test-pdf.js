const path = require('path');
const { generatePDF } = require('./services/reportService');

const mockTasks = [
  {
    title: 'Fix MongoDB connection timeout issue',
    assignedTo: { name: 'John Doe' },
    domain: 'Backend',
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
    status: 'pending'
  },
  {
    title: 'Design new landing page UI',
    assignedTo: { name: 'Jane Smith' },
    domain: 'Frontend',
    dueDate: new Date(Date.now() - 86400000), // Yesterday
    status: 'overdue'
  },
  {
    title: 'Setup GitHub Actions CI/CD',
    assignedTo: { name: 'Alex Johnson' },
    domain: 'DevOps',
    dueDate: new Date(),
    status: 'completed'
  },
  {
    title: 'Write API documentation for auth endpoints',
    assignedTo: { name: 'Sarah Connor' },
    domain: 'Backend',
    dueDate: new Date(Date.now() + 172800000), 
    status: 'pending'
  },
  {
    title: 'Fix responsive navigation bug on mobile',
    assignedTo: { name: 'John Doe' },
    domain: 'Frontend',
    dueDate: new Date(),
    status: 'completed'
  }
];

const runTests = async () => {
  console.log('Testing Daily Report...');
  await generatePDF('Daily Admin Report', mockTasks, 'test-daily-report.pdf', {
    reportType: 'daily',
    stats: { total: 5, completed: 2, pending: 2, overdue: 1, completionRate: '40.0' }
  });

  console.log('Testing Weekly Report...');
  await generatePDF('Weekly Admin Report', mockTasks, 'test-weekly-report.pdf', {
    reportType: 'weekly',
    stats: { total: 5, completed: 2, pending: 2, overdue: 1, completionRate: '40.0' },
    analytics: { topUsers: [{ user: { name: 'John Doe' }, completedCount: 2 }] }
  });

  console.log('Testing Monthly Report...');
  await generatePDF('Monthly Admin Report', mockTasks, 'test-monthly-report.pdf', {
    reportType: 'monthly',
    stats: { total: 5, completed: 2, pending: 2, overdue: 1, completionRate: '40.0' },
    analytics: { bestDomain: { domain: 'Frontend', rate: 50 } }
  });
  
  console.log('Tests completed.');
};

runTests();
