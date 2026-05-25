const Report = require('../models/Report');
const fs = require('fs');
const path = require('path');
const { generateDailyReport, generateWeeklyReport, generateMonthlyReport, regenerateReportPdf } = require('../services/reportService');

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
    const reportId = req.params.id;
    console.log(`\n--- DOWNLOAD REQUEST STARTED ---`);
    console.log(`[Download Request] Requested report ID: ${reportId}`);

    const report = await Report.findById(reportId);
    if (!report) {
      console.log(`[Download Error] Report ID ${reportId} not found in database.`);
      return res.status(404).json({ message: 'Report not found' });
    }

    console.log(`[Download Request] MongoDB report data:`, JSON.stringify(report));

    // Clean the filename to prevent directory traversal and resolve path correctly
    const safeFilename = path.basename(report.filename || report.path);
    
    // Resolve path dynamically and normalize for Windows vs Linux separator issues
    let filePath = path.normalize(path.join(__dirname, '../uploads/reports', safeFilename));
    
    console.log(`[Download Request] Final resolved file path: ${filePath}`);

    let fileExists = fs.existsSync(filePath);
    console.log(`[Download Request] existsSync result before regeneration: ${fileExists}`);

    // If file doesn't exist (e.g., Render deleted ephemeral files), regenerate it on the fly
    if (!fileExists) {
      console.log(`[Download Info] File not found. Regenerating PDF dynamically...`);
      try {
        const regeneratedPath = await regenerateReportPdf(report);
        if (regeneratedPath) {
          filePath = regeneratedPath;
          fileExists = fs.existsSync(filePath);
          console.log(`[Download Info] After regeneration - filePath: ${filePath}`);
          console.log(`[Download Info] After regeneration - existsSync result: ${fileExists}`);
        }
      } catch (regenError) {
        console.error(`[Download Error] Failed to regenerate PDF:`, regenError);
      }
    }

    if (!fileExists) {
      console.error(`[Download Error] Report file still not found at path: ${filePath}`);
      return res.status(404).json({ message: 'Report file not found on server (regeneration may have failed)' });
    }

    console.log(`[Download Request] Response status: 200 OK (Initiating download for ${safeFilename})`);
    res.download(filePath, safeFilename, (err) => {
      if (err) {
        console.error(`[Download Error] Failed to send file ${safeFilename}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error transmitting file' });
        }
      } else {
        console.log(`[Download Request] Successfully sent file ${safeFilename} to client.`);
      }
      console.log(`--- DOWNLOAD REQUEST ENDED ---\n`);
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

// @desc    Debug files in the reports directory
// @route   GET /api/reports/debug-files
// @access  Private/Admin
const debugFiles = async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '../uploads/reports');
    let exists = fs.existsSync(reportsDir);
    let files = [];
    let fileDetails = [];

    if (exists) {
      files = fs.readdirSync(reportsDir);
      fileDetails = files.map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          absolutePath: filePath,
          createdAt: stats.birthtime
        };
      });
    }

    res.json({
      reportsDirectory: reportsDir,
      directoryExists: exists,
      fileCount: files.length,
      files: fileDetails
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    res.status(500).json({ message: 'Error checking files', error: error.message });
  }
};

module.exports = {
  getAllReports,
  downloadReport,
  triggerManualReport,
  debugFiles,
};
