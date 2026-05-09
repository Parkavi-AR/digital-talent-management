import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [submitTaskId, setSubmitTaskId] = useState(null);
  const [githubLink, setGithubLink] = useState('');
  const [file, setFile] = useState(null);
  const [isNotifEnabled, setIsNotifEnabled] = useState(Notification.permission === 'granted');
  const [dismissedReminder] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false); // Auto-close sidebar on mobile
  };

  const fetchTasks = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const { data } = await API.get('/tasks/my-tasks', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchTasks();
    } else if (!user) {
      navigate('/login');
    }
  }, [user, navigate, fetchTasks]);

  // Notification Permission Handler
  const requestNotifPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setIsNotifEnabled(true);
      new Notification("🔔 Reminders Enabled!", {
        body: "You will receive desktop alerts for urgent tasks at 4:00 PM.",
      });
    }
  };

  // 4 PM Reminder Logic
  useEffect(() => {
    const checkUrgency = () => {
      const now = new Date();
      const hour = now.getHours();

      const tasksDueToday = tasks.filter(t => {
        const due = new Date(t.dueDate);
        return t.status === 'pending' &&
          due.toDateString() === now.toDateString();
      });

      if (tasksDueToday.length > 0) {
        // Show In-App Reminder after 4 PM
        if (hour >= 16 && !dismissedReminder) {
          // setShowFinalReminder(true); // Removed unused state
        }

        // Trigger Desktop Notification exactly at 4 PM (or first log in after 4 PM)
        if (hour >= 16 && isNotifEnabled) {
          const lastNotif = localStorage.getItem(`notif_sent_${now.toDateString()}`);
          if (!lastNotif) {
            new Notification("⚠️ Final Deadlines!", {
              body: `You have ${tasksDueToday.length} task(s) due today. Please submit them before midnight!`,
              requireInteraction: true
            });
            localStorage.setItem(`notif_sent_${now.toDateString()}`, 'true');
          }
        }
      }
    };

    checkUrgency();
    const interval = setInterval(checkUrgency, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks, isNotifEnabled, dismissedReminder]);



  const handleSubmitTask = async () => {
    if (!submitTaskId) return;
    try {
      const formData = new FormData();
      formData.append('submissionNote', 'Submitted via dashboard');
      formData.append('githubLink', githubLink);
      if (file) {
        formData.append('file', file);
      }

      await API.put(`/tasks/${submitTaskId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSubmitTaskId(null);
      setGithubLink('');
      setFile(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error submitting task');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Stats Logic
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const submittedTasks = tasks.filter((t) => t.status === 'submitted').length;
  const completionRate = tasks.length > 0
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  // New Intelligent Weekly Momentum Logic
  const getWeekBounds = () => {
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.setDate(now.getDate() - now.getDay() + 7)); // Sunday
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const { start: weekStart, end: weekEnd } = getWeekBounds();

  const isInCurrentWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date >= weekStart && date <= weekEnd;
  };

  // Weekly Specific Tasks
  const weeklyScopeTasks = tasks.filter(t => isInCurrentWeek(t.dueDate) || isInCurrentWeek(t.createdAt));
  const completedWeekly = weeklyScopeTasks.filter(t => t.status === 'completed').length;

  const productivityScore = weeklyScopeTasks.length > 0
    ? Math.round((completedWeekly / weeklyScopeTasks.length) * 100)
    : 0;

  const dailyTasks = tasks.filter((t) => t.taskType === 'daily');
  const weeklyTasks = tasks.filter((t) => t.taskType === 'weekly');

  const renderTaskCard = (task, isWeekly = false) => (
    <div key={task._id} className={`task-card ${isWeekly ? 'weekly-card' : ''}`}>
      {/* Top-Right Status Badge */}
      <span className={`task-status-badge ${task.status}`}>
        • {task.status.toUpperCase()}
      </span>

      <div className="task-card-body">
        <h4 className="task-card-title">{task.title}</h4>
        <p className="task-card-desc">{task.description}</p>

        <div className="task-card-footer">
          {/* Bottom-Left Due Badge */}
          <div className="due-date-badge">
            <span className="due-icon">📅</span>
            DUE: {new Date(task.dueDate).toLocaleDateString()}
          </div>

          {/* Bottom-Right Submit Button */}
          {task.status === 'pending' && (
            <button
              className="submit-task-btn-premium"
              onClick={() => setSubmitTaskId(task._id)}
            >
              📥 Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Get domain-specific submission instructions
  const getSubmissionInstructions = () => {
    switch (user?.domain) {
      case 'Full Stack':
      case 'Data Science':
      case 'AI & ML':
        return {
          label: 'GitHub Repository Link',
          placeholder: 'https://github.com/your-username/repo-name',
          desc: 'Please provide the GitHub link for your completed code and repository.'
        };
      case 'UI/UX Design':
        return {
          label: 'Design Portfolio Link',
          placeholder: 'https://figma.com/file/...',
          desc: 'Please provide the Figma or Behance link for your design work.'
        };
      case 'Sales & Marketing':
        return {
          label: 'Campaign Proof Link',
          placeholder: 'https://drive.google.com/...',
          desc: 'Please provide a link to your campaign proof or project document.'
        };
      case 'HR & Management':
        return {
          label: 'Document / Portal Link',
          placeholder: 'https://drive.google.com/file/...',
          desc: 'Please provide the link to your HR documents or portal entry.'
        };
      default:
        return {
          label: 'Submission URL',
          placeholder: 'https://link-to-your-work.com',
          desc: 'Please provide a valid URL as proof of your completed work.'
        };
    }
  };

  const { label, placeholder, desc } = getSubmissionInstructions();

  return (
    <div className="user-dashboard">
      {/* Mobile Topbar */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <Logo variant="navbar" />
        </div>
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          ☰
        </button>
      </div>

      {/* Sidebar Backdrop for Mobile */}
      <div 
        className={`sidebar-backdrop ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`user-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <Logo variant="sidebar" />
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="profile-name">{user?.name}</p>
            <span className="profile-domain">{user?.domain}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabClick('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => handleTabClick('tasks')}
          >
            📋 My Tasks
          </button>

          <button
            className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabClick('history')}
          >
            📁 Submissions
          </button>

          <button
            className={`sidebar-btn ${isNotifEnabled ? 'active' : ''}`}
            onClick={requestNotifPermission}
            style={{ marginTop: 'auto', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {isNotifEnabled ? '🔔 Alerts On' : '🔕 Enable Alerts'}
          </button>
        </nav>
        <button className="sidebar-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {loading ? (
              <div className="dashboard-loading">
                <div className="premium-spinner"></div>
                <p>Syncing your workspace...</p>
              </div>
            ) : (
              <>
                <div className="user-header">
                  <div>
                    <h1 className="user-title">Welcome back, {user?.name}! 👋</h1>
                    <p className="user-subtitle">
                      Domain: <span className="domain-highlight">{user?.domain}</span>
                    </p>
                  </div>
                </div>

                {/* Previous Quick-Stat Cards */}
                <div className="user-stat-grid">
                  <div className="user-stat-card total">
                    <div className="stat-card-icon">📋</div>
                    <div className="stat-card-value">{tasks.length}</div>
                    <div className="stat-card-label">Total Tasks</div>
                  </div>
                  <div className="user-stat-card completed">
                    <div className="stat-card-icon">✅</div>
                    <div className="stat-card-value">{completedTasks}</div>
                    <div className="stat-card-label">Completed</div>
                  </div>
                  <div className="user-stat-card pending">
                    <div className="stat-card-icon">⌛</div>
                    <div className="stat-card-value">{pendingTasks}</div>
                    <div className="stat-card-label">Pending</div>
                  </div>
                  <div className="user-stat-card submitted">
                    <div className="stat-card-icon">📤</div>
                    <div className="stat-card-value">{submittedTasks}</div>
                    <div className="stat-card-label">Submitted</div>
                  </div>
                </div>

                {/* Previous Horizontal Completion Bar */}
                <div className="horizontal-progress-card">
                  <div className="progress-card-info">
                    <span className="progress-card-title">Overall Completion Rate</span>
                    <span className="progress-card-val">{completionRate}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>

                {/* Analytics Grid */}
                <div className="analytics-grid">
                  <div className="analytics-main-card">
                    <div className="gauge-container">
                      <div className="progress-ring" style={{ '--percent': productivityScore }}>
                        <div className="progress-ring-text">{productivityScore}%</div>
                      </div>
                      <div>
                        <h3 className="gauge-title">Productivity Score</h3>
                        <p className="gauge-desc">Your momentum based on active goals for this week.</p>
                      </div>
                    </div>

                    <div className="productivity-stats">
                      <div className="prod-item">
                        <div className="prod-info">
                          <span className="prod-label">Daily Momentum</span>
                          <span className="prod-val">
                            {weeklyScopeTasks.filter(t => t.taskType === 'daily' && t.status === 'completed').length} / {weeklyScopeTasks.filter(t => t.taskType === 'daily').length || 0}
                          </span>
                        </div>
                        <div className="prod-bar-bg"><div className="prod-bar-fill" style={{ width: `${weeklyScopeTasks.filter(t => t.taskType === 'daily').length > 0 ? Math.round((weeklyScopeTasks.filter(t => t.taskType === 'daily' && t.status === 'completed').length / weeklyScopeTasks.filter(t => t.taskType === 'daily').length) * 100) : 0}%` }}></div></div>
                      </div>
                      <div className="prod-item">
                        <div className="prod-info">
                          <span className="prod-label">Weekly Goals</span>
                          <span className="prod-val">
                            {weeklyScopeTasks.filter(t => t.taskType === 'weekly' && t.status === 'completed').length} / {weeklyScopeTasks.filter(t => t.taskType === 'weekly').length || 0}
                          </span>
                        </div>
                        <div className="prod-bar-bg"><div className="prod-bar-fill" style={{ width: `${weeklyScopeTasks.filter(t => t.taskType === 'weekly').length > 0 ? Math.round((weeklyScopeTasks.filter(t => t.taskType === 'weekly' && t.status === 'completed').length / weeklyScopeTasks.filter(t => t.taskType === 'weekly').length) * 100) : 0}%`, background: 'var(--secondary)' }}></div></div>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-side-grid">
                    <div className="analysis-mini-card urgency">
                      <div className="mini-card-icon">⚡</div>
                      <div>
                        <div className="mini-card-label">Next Deadline</div>
                        <div className="mini-card-value">
                          {tasks.filter(t => t.status === 'pending').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]?.title || 'None!'}
                        </div>
                      </div>
                    </div>
                    <div className="analysis-mini-card">
                      <div className="mini-card-icon">🏆</div>
                      <div>
                        <div className="mini-card-label">Rank Status</div>
                        <div className="mini-card-value">{productivityScore > 80 ? 'Elite' : productivityScore > 50 ? 'Professional' : 'Rising Star'}</div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Upcoming Deadlines */}
                <div className="upcoming-deadlines-card">
                  <h3 className="card-title">🔥 Upcoming Deadlines</h3>
                  <div className="deadline-list">
                    {pendingTasks === 0 ? (
                      <p className="no-deadlines">🎉 You're all caught up! No pending tasks.</p>
                    ) : (
                      tasks
                        .filter(t => t.status === 'pending')
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .slice(0, 3)
                        .map(t => (
                          <div key={t._id} className="deadline-item">
                            <div className="deadline-info">
                              <h4>{t.title}</h4>
                              <p>Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="deadline-tag">
                              {Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} Days Left
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            {loading ? (
              <div className="dashboard-loading">
                <div className="premium-spinner"></div>
                <p>Fetching your assignments...</p>
              </div>
            ) : (
              <>
                <div className="user-header">
                  <h1 className="user-title">My Tasks</h1>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-card">
                    <p>🎉 No tasks assigned yet!</p>
                  </div>
                ) : (
                  <div>
                    {/* Daily Tasks */}
                    <div className="task-section">
                      <div className="task-section-header">
                        <div className="header-left">
                          <span className="header-icon">📅</span>
                          <span className="header-title">Daily Tasks</span>
                        </div>
                        <span className="task-count-circle">{dailyTasks.length}</span>
                      </div>
                      <div className="header-divider daily-divider"></div>

                      {dailyTasks.length === 0 ? (
                        <div className="no-tasks-text">No daily tasks assigned</div>
                      ) : (
                        <div className="tasks-grid-premium">
                          {dailyTasks.map((task) => renderTaskCard(task, false))}
                        </div>
                      )}
                    </div>

                    {/* Weekly Tasks */}
                    <div className="task-section">
                      <div className="task-section-header">
                        <div className="header-left">
                          <span className="header-icon">📆</span>
                          <span className="header-title">Weekly Tasks</span>
                        </div>
                        <span className="task-count-circle">{weeklyTasks.length}</span>
                      </div>
                      <div className="header-divider weekly-divider"></div>

                      {weeklyTasks.length === 0 ? (
                        <div className="no-tasks-text">No weekly tasks assigned</div>
                      ) : (
                        <div className="tasks-grid-premium">
                          {weeklyTasks.map((task) => renderTaskCard(task, true))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}


        {/* Submissions Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="user-header">
              <h1 className="user-title">Submission History</h1>
            </div>
            {tasks.filter((t) => t.status === 'submitted' || t.status === 'completed').length === 0 ? (
              <div className="empty-card">
                <p>No submissions yet!</p>
              </div>
            ) : (
              <div className="tasks-list">
                {tasks
                  .filter((t) => t.status === 'submitted' || t.status === 'completed')
                  .map((task) => (
                    <div key={task._id} className={`task-card ${task.taskType === 'weekly' ? 'weekly-card' : ''}`}>
                      <div className="task-info">
                        <h4 className="task-title">{task.title}</h4>
                        <p className="task-desc">{task.description}</p>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                          <span className="task-due">
                            📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          {task.githubLink && (
                            <a href={task.githubLink} target="_blank" rel="noreferrer" className="github-link-badge">
                              🔗 View Work
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="task-right">
                        <span className={`type-badge ${task.taskType}`}>
                          {task.taskType === 'daily' ? '📅 Daily' : '📆 Weekly'}
                        </span>
                        <span className={`task-status ${task.status}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Submission Modal */}
      {submitTaskId && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <h3 className="modal-title">Submit Task</h3>
            <p className="modal-desc">{desc}</p>

            <div className="modal-input-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
                {label}
              </label>
              <input
                type="url"
                className="modal-input"
                placeholder={placeholder}
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                required
              />
            </div>

            <div className="modal-input-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
                Upload Document (PDF, PPT, Word)
              </label>
              <input
                type="file"
                className="modal-input"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ padding: '8px' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Max size: 10MB. Allowed: .pdf, .ppt, .pptx, .doc, .docx, .jpg, .png
              </p>
            </div>

            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => { setSubmitTaskId(null); setGithubLink(''); setFile(null); }}>Cancel</button>
              <button className="modal-submit-btn" onClick={handleSubmitTask}>Confirm Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
