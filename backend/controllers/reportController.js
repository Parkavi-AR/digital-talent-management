const Report = require('../models/Report');
const fs = require('fs');
const path = require('path');
const { generateDailyReport, generateWeeklyReport, generateMonthlyReport } = require('../services/reportService');

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private/Admin
const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
};

// @desc    Download a specific report
// @route   GET /api/reports/download/:id
// @access  Private/Admin
const downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Resolve path dynamically to avoid issues with absolute paths across environments
    const filePath = path.join(__dirname, '../uploads/reports', report.filename);

    if (!fs.existsSync(filePath)) {
      console.error(`[Download Error] Report file not found at path: ${filePath}`);
      return res.status(404).json({ message: 'Report file not found on server' });
    }

    res.download(filePath, report.filename, (err) => {
      if (err) {
        console.error(`[Download Error] Failed to send file ${report.filename}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error transmitting file' });
        }
      }
    });
  } catch (error) {
    console.error(`[Download Error] Exception during download:`, error);
    res.status(500).json({ message: 'Error downloading report', error: error.message });
  }
};

// @desc    Trigger a manual report generation
// @route   POST /api/reports/trigger/:type
// @access  Private/Admin
const triggerManualReport = async (req, res) => {
  const { type } = req.params;
  try {
    console.log(`[${new Date().toLocaleString('en-IN')}] 🛠️ Manual trigger received for: ${type}`);
    
    // We send the response immediately to avoid timeout (PDF generation can be slow)
    // The generation happens in the "background"
    switch (type) {
      case 'daily':
        generateDailyReport();
        break;
      case 'weekly':
        generateWeeklyReport();
        break;
      case 'monthly':
        generateMonthlyReport();
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} report generation triggered. It will appear in the list shortly.` });
  } catch (error) {
    console.error('Error triggering manual report:', error);
    res.status(500).json({ message: 'Failed to trigger report generation' });
  }
};

module.exports = {
  getAllReports,
  downloadReport,
  triggerManualReport,
};
