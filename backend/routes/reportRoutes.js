const express = require('express');
const router = express.Router();
const { getAllReports, downloadReport, triggerManualReport } = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getAllReports);
router.get('/download/:id', protect, admin, downloadReport);
router.post('/trigger/:type', protect, admin, triggerManualReport);

module.exports = router;
