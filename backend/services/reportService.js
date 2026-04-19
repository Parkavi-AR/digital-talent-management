require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Task = require('../models/Task');
const User = require('../models/User');
const Report = require('../models/Report');
const { sendEmail } = require('./emailService');

const REPORTS_DIR = path.join(__dirname, '../uploads/reports');
const LOGO_PATH = path.join(__dirname, 'logo.png');

const getLogoBase64 = () => {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const bitmap = fs.readFileSync(LOGO_PATH);
      return `data:image/png;base64,${Buffer.from(bitmap).toString('base64')}`;
    }
  } catch (error) {
    console.error('Error reading logo file for report:', error.message);
  }
  return 'https://via.placeholder.com/200x60.png?text=RyniXsoft';
};

const ensureDirectoryExists = () => {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
};

const cleanupOldReports = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldReports = await Report.find({ createdAt: { $lt: thirtyDaysAgo } });

    for (const report of oldReports) {
      if (fs.existsSync(report.path)) {
        fs.unlinkSync(report.path);
      }
      await Report.findByIdAndDelete(report._id);
    }
    if (oldReports.length > 0) {
      console.log(`🧹 Cleaned up ${oldReports.length} old reports.`);
    }
  } catch (error) {
    console.error('Error during report cleanup:', error);
  }
};

const generatePDF = async (htmlContent, fileName) => {
  const timestamp = new Date().toLocaleString('en-IN');
  try {
    ensureDirectoryExists();
    const filePath = path.join(REPORTS_DIR, fileName);
    console.log(`[${timestamp}] 📄 Generating PDF with Puppeteer: ${fileName}`);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true, // extremely important for progress bars
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    await browser.close();
    console.log(`[${timestamp}] ✅ PDF successfully created at: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error(`[${timestamp}] ❌ PDF Generation Error (${fileName}):`, err.message || err);
    return null;
  }
};

const getAdminEmails = async () => {
  const admins = await User.find({ role: 'admin' });
  return admins.map(admin => admin.email);
};

const sendReportToAdmins = async (subject, htmlContent, attachmentPath, reportType, fileName) => {
  const timestamp = new Date().toLocaleString('en-IN');
  console.log(`[${timestamp}] 🚀 Initiating report delivery: ${subject}`);

  // 1. SAVE TO DATABASE FIRST (Fallback behavior: ensures visibility in portal even if email fails)
  if (attachmentPath) {
    try {
      await Report.create({
        name: subject,
        type: reportType,
        filename: fileName,
        path: attachmentPath,
      });
      console.log(`[${timestamp}] ✅ Report successfully recorded in database.`);
    } catch (dbError) {
      console.error(`[${timestamp}] ❌ Database failure: Unable to save report record. Reason: ${dbError.message}`);
    }
  } else {
    console.warn(`[${timestamp}] ⚠️ PDF path missing; report record skipped.`);
  }

  // 2. FETCH ADMIN EMAILS
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    console.warn(`[${timestamp}] ⚠️ No admin users found. Skipping email delivery.`);
    return;
  }

  // 3. SEND EMAIL NOTIFICATIONS
  const attachments = attachmentPath ? [{
    filename: fileName,
    path: attachmentPath,
    contentType: 'application/pdf'
  }] : [];

  for (const email of adminEmails) {
    try {
      const mailStart = new Date().toLocaleString('en-IN');
      const success = await sendEmail(email, subject, htmlContent, attachments);
      if (success) {
        console.log(`[${mailStart}] 📧 Success: Report sent to ${email}`);
      } else {
        console.error(`[${mailStart}] ❌ Failure: Email delivery failed for ${email}`);
      }
    } catch (err) {
      console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Critical SMTP Error for ${email}: ${err.message}`);
    }
  }
};

const generateDailyReport = async () => {
  const timestamp = new Date().toLocaleString('en-IN');
  console.log(`[${timestamp}] 📅 Starting Daily Report generation...`);
  try {
    const logoBase64 = getLogoBase64();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const now = new Date();

    const tasksAssignedToday = await Task.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const tasksCompletedToday = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const pendingTasks = await Task.countDocuments({
      status: { $in: ['pending', 'submitted'] },
      dueDate: { $gte: now }
    });

    const overdueTasks = await Task.countDocuments({
      status: { $in: ['pending', 'submitted'] },
      dueDate: { $lt: now }
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-top: 4px solid #0056b3; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoBase64}" alt="RyniXsoft Logo" style="max-width: 120px; height: auto;" />
        </div>
        <h2 style="color: #0056b3; margin-top: 0;">📋 Daily Admin Report</h2>
        <p style="color: #555;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Total Tasks Assigned Today</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #0056b3; font-weight: bold;">${tasksAssignedToday}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Tasks Completed Today</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #28a745; font-weight: bold;">${tasksCompletedToday}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Current Pending Tasks</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #ffc107; font-weight: bold;">${pendingTasks}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Current Overdue Tasks</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #dc3545; font-weight: bold;">${overdueTasks}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">RyniXsoft Talent Management | Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    `;

    const fileName = `daily-report-${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfPath = await generatePDF(htmlContent, fileName);

    if (pdfPath) {
      console.log(`[${new Date().toLocaleString('en-IN')}] ✅ Daily PDF generated successfully at: ${pdfPath}`);
      await sendReportToAdmins('Daily Talent Management Report', htmlContent, pdfPath, 'daily', fileName);
    } else {
      console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Daily PDF generation failed.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Critical Error in generateDailyReport: ${error.message}`);
  }
};

const generateWeeklyReport = async () => {
  const timestamp = new Date().toLocaleString('en-IN');
  console.log(`[${timestamp}] 📅 Starting Weekly Report generation...`);
  try {
    const logoBase64 = getLogoBase64();
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const totalAssigned = await Task.countDocuments({
      createdAt: { $gte: startOfWeek, $lte: endOfWeek }
    });

    const totalCompleted = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $gte: startOfWeek, $lte: endOfWeek }
    });

    const pendingCount = await Task.countDocuments({
      status: { $in: ['pending', 'submitted'] },
      createdAt: { $gte: startOfWeek, $lte: endOfWeek }
    });

    const topUsers = await Task.aggregate([
      { $match: { status: 'completed', updatedAt: { $gte: startOfWeek, $lte: endOfWeek } } },
      { $group: { _id: '$assignedTo', completedCount: { $sum: 1 } } },
      { $sort: { completedCount: -1 } },
      { $limit: 3 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' }
    ]);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-top: 4px solid #17a2b8; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoBase64}" alt="RyniXsoft Logo" style="max-width: 120px; height: auto;" />
        </div>
        <h2 style="color: #17a2b8; margin-top: 0;">📅 Weekly Admin Report</h2>
        <p style="color: #555;"><strong>Week:</strong> ${startOfWeek.toLocaleDateString('en-IN')} - ${endOfWeek.toLocaleDateString('en-IN')}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Total Tasks Assigned</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${totalAssigned}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Completed Tasks</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #28a745; font-weight: bold;">${totalCompleted}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>Pending Tasks</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; color: #dc3545; font-weight: bold;">${pendingCount}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="color: #333; margin-top: 30px; border-bottom: 2px solid #17a2b8; padding-bottom: 5px;">🏆 Top Performing Users</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead style="background-color: #f8f9fa;">
            <tr>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Rank</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">User</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Completed</th>
            </tr>
          </thead>
          <tbody>
            ${topUsers.length ? topUsers.map((u, index) => {
              const trStyle = index === 0 ? "background-color: #fdf5d3;" : "";
              const rankHtml = index === 0 ? `<span style="font-size:18px;">🥇</span> <strong>#1</strong>` : `<strong>#${index + 1}</strong>`;
              const nameHtml = index === 0 ? `<strong style="color: #b58900; font-size:16px;">${u.user.name.toUpperCase()}</strong>` : `<span>${u.user.name}</span>`;
              return `
              <tr style="${trStyle}">
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${rankHtml}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${nameHtml}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #28a745; font-weight: bold;">${u.completedCount}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: center;">No completions this week.</td></tr>`}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">RyniXsoft Talent Management | Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    `;

    const fileName = `weekly-report-${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfPath = await generatePDF(htmlContent, fileName);

    if (pdfPath) {
      console.log(`[${new Date().toLocaleString('en-IN')}] ✅ Weekly PDF generated successfully at: ${pdfPath}`);
      await sendReportToAdmins('Weekly Talent Management Report', htmlContent, pdfPath, 'weekly', fileName);
    } else {
      console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Weekly PDF generation failed.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Critical Error in generateWeeklyReport: ${error.message}`);
  }
};

const generateMonthlyReport = async () => {
  const timestamp = new Date().toLocaleString('en-IN');
  console.log(`[${timestamp}] 📅 Starting Monthly Report generation...`);
  try {
    const logoBase64 = getLogoBase64();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const totalAssigned = await Task.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalCompleted = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const completionRate = totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(2) : 0;

    const domainPerformance = await Task.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: {
          _id: '$domain',
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $project: {
          domain: '$_id',
          totalTasks: 1,
          completedTasks: 1,
          rate: { $cond: [{ $gt: ['$totalTasks', 0] }, { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }, 0] }
        }
      },
      { $sort: { rate: -1 } }
    ]);

    let domainHtml = domainPerformance.map(d => 
      `<tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>${d.domain}</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
          <span style="color: #28a745; font-weight: bold;">${d.completedTasks}</span> / ${d.totalTasks}
        </td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
          <div style="font-weight: bold; color: ${d.rate >= 50 ? '#28a745' : '#dc3545'}; margin-bottom: 4px;">${d.rate.toFixed(2)}%</div>
          <div style="width: 100%; background-color: #e9ecef; border-radius: 4px; height: 6px; overflow: hidden;">
            <div style="width: ${d.rate}%; background-color: ${d.rate >= 50 ? '#28a745' : '#dc3545'}; height: 100%;"></div>
          </div>
        </td>
      </tr>`
    ).join('');

    if (!domainHtml) {
      domainHtml = `<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #ddd;">No task data for this month.</td></tr>`;
    }

    const bestDomain = domainPerformance.length > 0 ? domainPerformance[0] : null;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-top: 4px solid #6f42c1; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoBase64}" alt="RyniXsoft Logo" style="max-width: 120px; height: auto;" />
        </div>
        <h2 style="color: #6f42c1; margin-top: 0;">📊 Monthly Admin Report</h2>
        <p style="color: #555;"><strong>Month:</strong> ${startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e9ecef;">
          <span style="display: block; font-size: 14px; text-align: center; color: #666; margin-bottom: 10px;">Overall Completion Rate</span>
          <div style="text-align: center; margin-bottom: 10px;">
            <span style="font-size: 32px; font-weight: bold; color: ${completionRate >= 50 ? '#28a745' : '#dc3545'};">${completionRate}%</span>
          </div>
          <div style="width: 100%; background-color: #e9ecef; border-radius: 4px; height: 16px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,.1);">
            <div style="width: ${completionRate}%; background-color: ${completionRate >= 50 ? '#28a745' : '#dc3545'}; height: 100%; text-align: center; line-height: 16px; font-size: 10px; color: #fff; font-weight: bold;"></div>
          </div>
        </div>
        
        ${bestDomain && bestDomain.rate > 0 
          ? `<div style="background-color: #e2e3e5; padding: 12px; border-radius: 5px; margin-bottom: 20px;">
              🌟 <strong>Best Domain:</strong> ${bestDomain.domain} (<span style="color: #28a745; font-weight:bold;">${bestDomain.rate.toFixed(2)}%</span> completion)
            </div>` 
          : ''}
          
        <h3 style="color: #333; border-bottom: 2px solid #6f42c1; padding-bottom: 5px; margin-top: 30px;">🏢 Domain-wise Performance</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px;">
          <thead style="background-color: #f4f4f4;">
            <tr>
              <th style="padding: 10px; border: 1px solid #ddd;">Domain</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Completed / Total</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${domainHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">RyniXsoft Talent Management | Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    `;

    const dateSuffix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const fileName = `monthly-report-${dateSuffix}.pdf`;
    const pdfPath = await generatePDF(htmlContent, fileName);

    if (pdfPath) {
      console.log(`[${new Date().toLocaleString('en-IN')}] ✅ Monthly PDF generated successfully at: ${pdfPath}`);
      await sendReportToAdmins('Monthly Talent Management Report', htmlContent, pdfPath, 'monthly', fileName);
    } else {
      console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Monthly PDF generation failed.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString('en-IN')}] ❌ Critical Error in generateMonthlyReport: ${error.message}`);
  }
};

const scheduleReports = () => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${timestamp}] ⚙️ Report Scheduler initialized (Timezone: Asia/Kolkata).`);

  const cronOptions = {
    scheduled: true,
    timezone: "Asia/Kolkata"
  };

  // Heartbeat Cron: Runs every minute to verify scheduler activity
  // This helps confirm that the cron engine is running correctly
  cron.schedule('* * * * *', () => {
    const runTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[${runTime}] 💓 CRON HEARTBEAT: Scheduler is active and monitoring tasks.`);
  }, cronOptions);

  // Daily Report: 6:00 PM every day IST
  cron.schedule('0 18 * * *', () => {
    const runTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[${runTime}] ⚡ CRON TRIGGER: Daily Admin Report execution started.`);
    generateDailyReport();
  }, cronOptions);

  // Weekly Report: 6:00 PM every Sunday IST
  cron.schedule('0 18 * * 0', () => {
    const runTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[${runTime}] ⚡ CRON TRIGGER: Weekly Admin Report execution started.`);
    generateWeeklyReport();
  }, cronOptions);

  // Monthly Report: 6:00 PM every day between 28th and 31st (executes only on the last day)
  cron.schedule('0 18 28-31 * *', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // If tomorrow is the 1st, then today is the last day of the month!
    if (tomorrow.getDate() === 1) {
      const runTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`[${runTime}] ⚡ CRON TRIGGER: Monthly Admin Report execution started (Month End detected).`);
      generateMonthlyReport();
    }
  }, cronOptions);

  // Cleanup: Run daily at midnight IST
  cron.schedule('0 0 * * *', () => {
    const runTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[${runTime}] ⚡ CRON TRIGGER: Automated cleanup started.`);
    cleanupOldReports();
  }, cronOptions);
};

module.exports = {
  scheduleReports,
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport
};
