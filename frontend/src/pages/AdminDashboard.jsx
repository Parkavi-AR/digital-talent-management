import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import './AdminDashboard.css';

const DOMAINS = [
  'Full Stack',
  'Sales & Marketing',
  'Data Science',
  'UI/UX Design',
  'HR & Management',
  'AI & ML',
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', domain: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);

  // Task states
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: [],
    domain: '',
    taskType: 'daily',
  });
  const [taskLoading, setTaskLoading] = useState(false);

  const [hoveredStat, setHoveredStat] = useState(null);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    domain: '',
    taskType: 'daily',
  });
  const [reports, setReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/auth/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await API.get('/tasks');
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setReportLoading(true);
    try {
      const { data } = await API.get('/reports');
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
    setReportLoading(false);
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      const timer = setTimeout(() => {
        fetchUsers();
        fetchTasks();
        fetchReports();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, fetchUsers, fetchTasks, fetchReports]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin-login');
    }
  }, [user, navigate]);

  // Auto-clear alerts
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const getStatUsers = (status) => {
    const userMap = {};
    const filteredTasks = tasks.filter(t => t.status === status);
    filteredTasks.forEach(t => {
      if (t.assignedTo && t.assignedTo.name) {
        userMap[t.assignedTo._id] = t.assignedTo.name;
      }
    });
    return Object.values(userMap);
  };

  const getUsersByDomain = (domain) => users.filter(u => u.domain === domain).map(u => u.name);

  const getDomainCompletionRate = (domain) => {
    const domainTasks = tasks.filter(t => t.domain === domain);
    if (domainTasks.length === 0) return 0;
    const completed = domainTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / domainTasks.length) * 100);
  };

  const getRecentActivity = () => {
    const activity = [];

    // Recent Users
    users.forEach(u => {
      activity.push({
        type: 'user',
        text: `New user ${u.name} joined as ${u.domain}`,
        time: new Date(u.createdAt)
      });
    });

    // Recent Submissions (tasks with status 'submitted' or 'completed')
    tasks.filter(t => t.status !== 'pending').forEach(t => {
      activity.push({
        type: 'task',
        text: `${t.assignedTo?.name || 'A user'} submitted ${t.title}`,
        time: new Date(t.updatedAt || t.createdAt)
      });
    });

    return activity.sort((a, b) => b.time - a.time).slice(0, 5);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleTaskChange = (e) => {
    if (e.target.name === 'assignedTo') {
      const options = e.target.options;
      const selected = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) selected.push(options[i].value);
      }
      setTaskForm({ ...taskForm, assignedTo: selected });
    } else {
      setTaskForm({ ...taskForm, [e.target.name]: e.target.value });
    }
  };
  const handleEditTaskChange = (e) => setEditTaskForm({ ...editTaskForm, [e.target.name]: e.target.value });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/auth/create-user', form);
      setSuccess(`User "${form.name}" created successfully!`);
      setForm({ name: '', email: '', password: '', domain: '' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
    setLoading(false);
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await API.delete(`/auth/users/${id}`);
      setUsers(users.filter((u) => u._id !== id));
      setSuccess(`User "${name}" deleted successfully!`);
    } catch (error) {
      setError('Failed to delete user');
      console.error(error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTaskLoading(true);
    try {
      await API.post('/tasks', taskForm);
      setSuccess(`Task "${taskForm.title}" created successfully!`);
      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        assignedTo: [],
        domain: '',
        taskType: 'daily',
      });
      setShowTaskForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    }
    setTaskLoading(false);
  };

  const handleDeleteTask = async (id, title) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    try {
      await API.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
      setSuccess(`Task "${title}" deleted!`);
    } catch (error) {
      setError('Failed to delete task');
      console.error(error);
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      await API.put(`/tasks/${id}/complete`);
      fetchTasks();
      setSuccess('Task marked as completed!');
    } catch (error) {
      setError('Failed to complete task');
      console.error(error);
    }
  };

  const handleEditClick = (task) => {
    setEditingTask(task._id);
    setEditTaskForm({
      title: task.title,
      description: task.description,
      dueDate: new Date(task.dueDate).toISOString().split('T')[0],
      assignedTo: task.assignedTo?._id || '',
      domain: task.domain,
      taskType: task.taskType,
    });
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEditLoading(true);
    try {
      await API.put(`/tasks/${editingTask}`, editTaskForm);
      setSuccess(`Task "${editTaskForm.title}" updated successfully!`);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task');
    }
    setEditLoading(false);
  };

  const handleViewUserDashboard = (user) => {
    setSelectedUser(user);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
  };

  const handleDownloadReport = async (reportId, filename) => {
    try {
      const response = await API.get(`/reports/download/${reportId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response && err.response.data && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          setError(errorData.message || 'Failed to download report');
          console.error('Download error details:', errorData);
          return;
        } catch (e) {
          // Fallback if parsing fails
        }
      }
      setError('Failed to download report');
      console.error(err);
    }
  };

  const handleManualTrigger = async (type) => {
    setSuccess('');
    setError('');
    setReportLoading(true);
    try {
      const { data } = await API.post(`/reports/trigger/${type}`);
      setSuccess(data.message);
      // Wait a few seconds for PDF generation to finish, then refresh
      setTimeout(fetchReports, 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to trigger ${type} report generation`);
    }
    setReportLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  const getDomainCount = (domain) =>
    users.filter((u) => u.domain === domain).length;

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <Logo variant="sidebar" />
        <div className="sidebar-admin">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="sidebar-name">{user?.name}</p>
            <p className="sidebar-role">Administrator</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
          >
            👥 Users
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            📋 Tasks
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📊 Reports
          </button>
        </nav>
        <button className="sidebar-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main">

        {/* Fixed Alert Container */}
        <div className="alert-container">
          {success && <div className="alert alert-success">✅ {success}</div>}
          {error && <div className="alert alert-error">❌ {error}</div>}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div>
            <div className="admin-header">
              <div>
                <h1 className="admin-title">Overview Dashboard</h1>
                <p className="admin-subtitle">
                  Welcome back, {user?.name}! Here's your system summary.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div
                className="stat-card"
                onMouseEnter={() => setHoveredStat('users')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="stat-icon blue">👥</div>
                <div>
                  <div className="stat-value">{users.length}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                {hoveredStat === 'users' && (
                  <div className="stat-hover-list">
                    <h4>All Active Users</h4>
                    {users.length > 0 ? (
                      <ul>
                        {users.map((u, i) => (
                          <li key={i}>{u.name}</li>
                        ))}
                      </ul>
                    ) : <p>No users yet</p>}
                  </div>
                )}
              </div>

              <div
                className="stat-card"
                onMouseEnter={() => setHoveredStat('tasks')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="stat-icon green">📋</div>
                <div>
                  <div className="stat-value">{tasks.length}</div>
                  <div className="stat-label">Total Tasks</div>
                </div>
                {hoveredStat === 'tasks' && (
                  <div className="stat-hover-list">
                    <h4>Total Assigned</h4>
                    {tasks.length > 0 ? (
                      <ul>
                        {tasks.map((t, i) => (
                          <li key={i}>{t.title}</li>
                        ))}
                      </ul>
                    ) : <p>No tasks created</p>}
                  </div>
                )}
              </div>
              <div
                className="stat-card"
                onMouseEnter={() => setHoveredStat('pending')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="stat-icon amber">⏳</div>
                <div>
                  <div className="stat-value">
                    {tasks.filter((t) => t.status === 'pending').length}
                  </div>
                  <div className="stat-label">Pending Tasks</div>
                </div>
                {hoveredStat === 'pending' && (
                  <div className="stat-hover-list">
                    <h4>Users with Pending Tasks</h4>
                    {getStatUsers('pending').length > 0 ? (
                      <ul>
                        {getStatUsers('pending').map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    ) : <p>No pending users</p>}
                  </div>
                )}
              </div>
              <div
                className="stat-card"
                onMouseEnter={() => setHoveredStat('completed')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="stat-icon red">✅</div>
                <div>
                  <div className="stat-value">
                    {tasks.filter((t) => t.status === 'completed').length}
                  </div>
                  <div className="stat-label">Completed Tasks</div>
                </div>
                {hoveredStat === 'completed' && (
                  <div className="stat-hover-list">
                    <h4>Users with Completed Tasks</h4>
                    {getStatUsers('completed').length > 0 ? (
                      <ul>
                        {getStatUsers('completed').map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    ) : <p>No completed users</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Domain wise users */}
            <h3 className="section-title">📊 Users by Domain</h3>
            <div className="domain-grid">
              {DOMAINS.map((d) => (
                <div
                  key={d}
                  className="domain-card"
                  onMouseEnter={() => setHoveredDomain(d)}
                  onMouseLeave={() => setHoveredDomain(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {d === 'Full Stack' && '💻'}
                      {d === 'Sales & Marketing' && '📈'}
                      {d === 'Data Science' && '🧬'}
                      {d === 'UI/UX Design' && '🎨'}
                      {d === 'HR & Management' && '🤝'}
                      {d === 'AI & ML' && '🤖'}
                    </span>
                    <span className="domain-name">{d}</span>
                  </div>
                  <span className="domain-count">{getDomainCount(d)}</span>

                  {hoveredDomain === d && (
                    <div className="stat-hover-list">
                      <h4>Users in {d}</h4>
                      {getUsersByDomain(d).length > 0 ? (
                        <ul>
                          {getUsersByDomain(d).map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      ) : <p>No users yet</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="users-table-card">
                <h3 className="table-title">📈 Domain Efficiency Radar</h3>
                <div className="domain-performance-list">
                  {DOMAINS.map(d => (
                    <div key={d} className="domain-perf-item">
                      <div className="domain-perf-info">
                        <span className="domain-perf-name">{d}</span>
                        <span className="domain-perf-val">{getDomainCompletionRate(d)}%</span>
                      </div>
                      <div className="domain-perf-bar-bg">
                        <div
                          className="domain-perf-bar-fill"
                          style={{
                            width: `${getDomainCompletionRate(d)}%`,
                            background: getDomainCompletionRate(d) > 80 ? 'var(--success)' :
                              getDomainCompletionRate(d) > 50 ? 'var(--info)' : 'var(--warning)'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="users-table-card">
                <h3 className="table-title">⚡ Live Activity Feed</h3>
                <div className="timeline-container">
                  {getRecentActivity().length > 0 ? getRecentActivity().map((act, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-text">{act.text}</div>
                        <div className="timeline-time">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )) : <p className="empty-state">No recent activity detected.</p>}
                </div>
              </div>
            </div>

            {/* All Users by Domain */}
            <h3 className="section-title">👥 All Users by Domain</h3>
            <div className="users-table-card">
              {users.length === 0 ? (
                <div className="empty-state">
                  No users yet. Go to Users tab to create one!
                </div>
              ) : (
                <div className="domain-groups-container">
                  {DOMAINS.map(domain => {
                    const domainUsers = users.filter(u => u.domain === domain);
                    if (domainUsers.length === 0) return null;
                    return (
                      <div key={domain} className="domain-group-section">
                        <div className="domain-section-header">
                          <span className="domain-icon">
                            {domain === 'Full Stack' && '💻'}
                            {domain === 'Sales & Marketing' && '📈'}
                            {domain === 'Data Science' && '🧬'}
                            {domain === 'UI/UX Design' && '🎨'}
                            {domain === 'HR & Management' && '🤝'}
                            {domain === 'AI & ML' && '🤖'}
                          </span>
                          <span className="domain-title">{domain}</span>
                          <span className="domain-count-badge">{domainUsers.length}</span>
                        </div>
                        <table className="users-table compact">
                          <thead>
                            <tr>
                              <th style={{ width: '40%' }}>Name</th>
                              <th style={{ width: '40%' }}>Email</th>
                              <th style={{ width: '20%' }}>Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainUsers.map((u) => (
                              <tr key={u._id}>
                                <td>
                                  <div className="user-avatar-name">
                                    <div className="user-avatar small">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    {u.name}
                                  </div>
                                </td>
                                <td>{u.email}</td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div>
            {!selectedUser ? (
              <>
                <div className="admin-header">
                  <div>
                    <h1 className="admin-title">User Management</h1>
                    <p className="admin-subtitle">Create and manage all users</p>
                  </div>
                  <button className="create-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Cancel' : '+ Create User'}
                  </button>
                </div>

                {showForm && (
                  <div className="create-form-card">
                    <h3 className="form-title">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="create-form">
                      <div className="form-row">
                        <div className="admin-form-group">
                          <label>Full Name</label>
                          <input
                            name="name"
                            type="text"
                            placeholder="Enter full name"
                            value={form.name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="admin-form-group">
                          <label>Email</label>
                          <input
                            name="email"
                            type="email"
                            placeholder="Enter email"
                            value={form.email}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="admin-form-group">
                          <label>Password</label>
                          <input
                            name="password"
                            type="password"
                            placeholder="Set password"
                            value={form.password}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="admin-form-group">
                          <label>Domain</label>
                          <select
                            name="domain"
                            value={form.domain}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select domain</option>
                            {DOMAINS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button className="submit-btn" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="users-table-card">
                  <h3 className="table-title">All Users (Grouped by Domain)</h3>
                  {users.length === 0 ? (
                    <div className="empty-state">No users yet. Create your first user!</div>
                  ) : (
                    <div className="domain-groups-container">
                      {DOMAINS.map(domain => {
                        const domainUsers = users.filter(u => u.domain === domain);
                        if (domainUsers.length === 0) return null;
                        return (
                          <div key={domain} className="domain-group-section">
                            <div className="domain-section-header">
                              <span className="domain-icon">
                                {domain === 'Full Stack' && '💻'}
                                {domain === 'Sales & Marketing' && '📈'}
                                {domain === 'Data Science' && '🧬'}
                                {domain === 'UI/UX Design' && '🎨'}
                                {domain === 'HR & Management' && '🤝'}
                                {domain === 'AI & ML' && '🤖'}
                              </span>
                              <span className="domain-title">{domain}</span>
                              <span className="domain-count-badge">{domainUsers.length}</span>
                            </div>
                            <table className="users-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '30%' }}>Name</th>
                                  <th style={{ width: '30%' }}>Email</th>
                                  <th style={{ width: '20%' }}>Created</th>
                                  <th style={{ width: '20%' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {domainUsers.map((u) => (
                                  <tr key={u._id}>
                                    <td>
                                      <div className="user-avatar-name">
                                        <div className="user-avatar">
                                          {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        {u.name}
                                      </div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                                        <button
                                          className="edit-btn"
                                          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px' }}
                                          onClick={() => handleViewUserDashboard(u)}
                                        >
                                          👁️ View
                                        </button>
                                        <button
                                          className="delete-btn"
                                          style={{ padding: '6px 12px' }}
                                          onClick={() => handleDeleteUser(u._id, u.name)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (() => {
              const userTasks = tasks.filter(t => t.assignedTo?._id === selectedUser._id);
              const completed = userTasks.filter(t => t.status === 'completed').length;
              const pending = userTasks.filter(t => t.status === 'pending').length;
              const submitted = userTasks.filter(t => t.status === 'submitted').length;
              const rate = userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0;

              return (
                <div className="user-dashboard-view">
                  <div className="admin-header" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div className="sidebar-avatar" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h1 className="admin-title" style={{ marginBottom: '2px' }}>{selectedUser.name}</h1>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span className="domain-badge" style={{ padding: '4px 12px' }}>{selectedUser.domain}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: rate > 70 ? 'var(--success)' : 'var(--warning)', background: rate > 70 ? 'var(--success-bg)' : 'var(--warning-bg)', padding: '2px 10px', borderRadius: '100px' }}>
                            {rate}% Performance
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="create-btn" style={{ background: 'var(--gray-800)', boxShadow: 'none' }} onClick={handleBackToUsers}>
                      ← Back to Users
                    </button>
                  </div>

                  <div className="stats-grid" style={{ marginBottom: '40px' }}>
                    <div className="stat-card">
                      <div className="stat-icon blue">📋</div>
                      <div>
                        <div className="stat-value">{userTasks.length}</div>
                        <div className="stat-label">Total Assigned</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green">✅</div>
                      <div>
                        <div className="stat-value">{completed}</div>
                        <div className="stat-label">Completed</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon purple">📤</div>
                      <div>
                        <div className="stat-value">{submitted}</div>
                        <div className="stat-label">For Review</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon amber">⌛</div>
                      <div>
                        <div className="stat-value">{pending}</div>
                        <div className="stat-label">Still Pending</div>
                      </div>
                    </div>
                  </div>

                  <div className="progress-card" style={{ padding: '32px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', boxShadow: 'none' }}>
                    <div className="progress-header">
                      <span className="progress-title" style={{ color: 'var(--gray-700)' }}>Task Integrity Score</span>
                      <span className="progress-percent" style={{ color: 'var(--primary)', fontSize: '24px' }}>{rate}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ background: 'var(--gray-200)' }}>
                      <div className="progress-bar-fill" style={{ width: `${rate}%` }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 className="section-title" style={{ margin: 0 }}>Task History & Submissions</h3>
                  </div>

                  <div className="users-table-card">
                    {userTasks.length === 0 ? (
                      <div className="empty-state">No tasks assigned to this user yet.</div>
                    ) : (
                      <table className="users-table">
                        <thead>
                          <tr>
                            <th style={{ width: '35%' }}>Task Details</th>
                            <th style={{ width: '25%' }}>Proof / Work URL</th>
                            <th style={{ width: '10%' }}>Type</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '20%' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTasks.map(t => (
                            <tr key={t._id}>
                              <td style={{ maxWidth: '300px' }}>
                                <div className="task-title-cell">{t.title}</div>
                                <div className="task-desc-cell" style={{ whiteSpace: 'normal', overflow: 'visible' }}>{t.description}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {t.githubLink && (
                                    <a href={t.githubLink} target="_blank" rel="noreferrer" className="github-link-badge">
                                      🔗 View Proof Link
                                    </a>
                                  )}
                                  {t.fileLink && (
                                    <a
                                      href={`https://talent-backend-bneb.onrender.com${t.fileLink}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="github-link-badge"
                                      style={{ background: '#ecfdf5', color: '#047857', borderColor: '#10b981' }}
                                    >
                                      📄 Download {t.fileName || 'Document'}
                                    </a>
                                  )}
                                  {!t.githubLink && !t.fileLink && (
                                    <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic' }}>No submission yet</span>
                                  )}
                                </div>
                              </td>
                              <td><span className={`type-badge ${t.taskType}`}>{t.taskType === 'daily' ? '📅 Daily' : '📆 Weekly'}</span></td>
                              <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {t.status === 'submitted' && (
                                    <button className="complete-btn" onClick={() => handleCompleteTask(t._id)}>Approve</button>
                                  )}
                                  <button className="edit-btn" style={{ padding: '6px' }} onClick={() => handleEditClick(t)}>✏️</button>
                                  <button className="delete-btn" style={{ padding: '6px' }} onClick={() => handleDeleteTask(t._id, t.title)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === 'tasks' && (
          <div>
            <div className="admin-header">
              <div>
                <h1 className="admin-title">Task Management</h1>
                <p className="admin-subtitle">Create and assign tasks to users</p>
              </div>
              <button className="create-btn" onClick={() => setShowTaskForm(!showTaskForm)}>
                {showTaskForm ? '✕ Cancel' : '+ Create Task'}
              </button>
            </div>

            {showTaskForm && (
              <div className="create-form-card">
                <h3 className="form-title">Create New Task</h3>
                <form onSubmit={handleCreateTask} className="create-form">
                  <div className="form-row">
                    <div className="admin-form-group">
                      <label>Task Title</label>
                      <input
                        name="title"
                        type="text"
                        placeholder="Enter task title"
                        value={taskForm.title}
                        onChange={handleTaskChange}
                        required
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Due Date</label>
                      <input
                        name="dueDate"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={handleTaskChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Task Type Toggle */}
                  <div className="admin-form-group">
                    <label>Task Type</label>
                    <div className="task-type-toggle">
                      <button
                        type="button"
                        className={`task-type-btn ${taskForm.taskType === 'daily' ? 'active-daily' : ''}`}
                        onClick={() => setTaskForm({ ...taskForm, taskType: 'daily' })}
                      >
                        📅 Daily Task
                      </button>
                      <button
                        type="button"
                        className={`task-type-btn ${taskForm.taskType === 'weekly' ? 'active-weekly' : ''}`}
                        onClick={() => setTaskForm({ ...taskForm, taskType: 'weekly' })}
                      >
                        📆 Weekly Task
                      </button>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      placeholder="Enter task description"
                      value={taskForm.description}
                      onChange={handleTaskChange}
                      required
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-row">
                    <div className="admin-form-group">
                      <label>Assign To</label>
                      <select
                        name="assignedTo"
                        multiple
                        value={taskForm.assignedTo}
                        onChange={handleTaskChange}
                        required
                        style={{ height: '110px' }}
                      >
                        {DOMAINS.map(domain => {
                          const domainUsers = users.filter(u => u.domain === domain);
                          if (domainUsers.length === 0) return null;
                          return (
                            <optgroup key={domain} label={`${domain === 'Full Stack' ? '💻' : domain === 'Sales & Marketing' ? '📈' : domain === 'Data Science' ? '🧬' : domain === 'UI/UX Design' ? '🎨' : domain === 'HR & Management' ? '🤝' : '🤖'} ${domain}`}>
                              {domainUsers.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        Hold Ctrl/Cmd to select multiple users
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label>Domain</label>
                      <select
                        name="domain"
                        value={taskForm.domain}
                        onChange={handleTaskChange}
                        required
                      >
                        <option value="">Select domain</option>
                        {DOMAINS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button className="submit-btn" type="submit" disabled={taskLoading}>
                    {taskLoading ? 'Creating...' : 'Create Task'}
                  </button>
                </form>
              </div>
            )}

            <div className="users-table-card">
              <h3 className="table-title">All Tasks ({tasks.length})</h3>
              {tasks.length === 0 ? (
                <div className="empty-state">No tasks yet. Create your first task!</div>
              ) : (
                <div className="domain-groups-container">
                  {DOMAINS.map(domain => {
                    const domainTasks = tasks.filter(t => t.domain === domain);
                    if (domainTasks.length === 0) return null;
                    return (
                      <div key={domain} className="domain-group-section">
                        <div className="domain-section-header">
                          <span className="domain-icon">
                            {domain === 'Full Stack' && '💻'}
                            {domain === 'Sales & Marketing' && '📈'}
                            {domain === 'Data Science' && '🧬'}
                            {domain === 'UI/UX Design' && '🎨'}
                            {domain === 'HR & Management' && '🤝'}
                            {domain === 'AI & ML' && '🤖'}
                          </span>
                          <span className="domain-title">{domain}</span>
                          <span className="domain-count-badge">{domainTasks.length} task{domainTasks.length !== 1 ? 's' : ''}</span>
                        </div>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th style={{ width: '22%' }}>Title</th>
                              <th style={{ width: '9%' }}>Type</th>
                              <th style={{ width: '18%' }}>Assigned To</th>
                              <th style={{ width: '11%' }}>Due Date</th>
                              <th style={{ width: '10%' }}>Status</th>
                              <th style={{ width: '30%' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainTasks.map((t) => (
                              <tr key={t._id}>
                                <td>
                                  <div className="task-title-cell">{t.title}</div>
                                  <div className="task-desc-cell">{t.description}</div>
                                  {t.githubLink && (
                                    <div style={{ marginTop: '6px' }}>
                                      <a href={t.githubLink} target="_blank" rel="noreferrer" className="github-link-badge" style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                                        🔗 View Link
                                      </a>
                                    </div>
                                  )}
                                  {t.fileLink && (
                                    <div style={{ marginTop: '4px' }}>
                                      <a
                                        href={`https://talent-backend-bneb.onrender.com${t.fileLink}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="github-link-badge"
                                        style={{ display: 'inline-block', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #10b981' }}
                                      >
                                        📄 Download {t.fileName || 'Doc'}
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span className={`type-badge ${t.taskType}`}>
                                    {t.taskType === 'daily' ? '📅 Daily' : '📆 Weekly'}
                                  </span>
                                </td>
                                <td>
                                  <div className="user-avatar-name">
                                    <div className="user-avatar">
                                      {t.assignedTo?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    {t.assignedTo?.name}
                                  </div>
                                </td>
                                <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                                <td>
                                  <span className={`status-badge ${t.status}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                                    {t.status === 'submitted' && (
                                      <button
                                        className="complete-btn"
                                        style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}
                                        onClick={() => handleCompleteTask(t._id)}
                                      >
                                        ✅ Complete
                                      </button>
                                    )}
                                    <button
                                      className="edit-btn"
                                      style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}
                                      onClick={() => handleEditClick(t)}
                                    >
                                      📝 Edit
                                    </button>
                                    <button
                                      className="delete-btn"
                                      style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}
                                      onClick={() => handleDeleteTask(t._id, t.title)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                  {/* Tasks with no/unknown domain */}
                  {(() => {
                    const otherTasks = tasks.filter(t => !DOMAINS.includes(t.domain));
                    if (otherTasks.length === 0) return null;
                    return (
                      <div className="domain-group-section">
                        <div className="domain-section-header">
                          <span className="domain-icon">📁</span>
                          <span className="domain-title">Other</span>
                          <span className="domain-count-badge">{otherTasks.length}</span>
                        </div>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th style={{ width: '22%' }}>Title</th>
                              <th style={{ width: '9%' }}>Type</th>
                              <th style={{ width: '18%' }}>Assigned To</th>
                              <th style={{ width: '11%' }}>Due Date</th>
                              <th style={{ width: '10%' }}>Status</th>
                              <th style={{ width: '30%' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {otherTasks.map((t) => (
                              <tr key={t._id}>
                                <td>
                                  <div className="task-title-cell">{t.title}</div>
                                  <div className="task-desc-cell">{t.description}</div>
                                </td>
                                <td><span className={`type-badge ${t.taskType}`}>{t.taskType === 'daily' ? '📅 Daily' : '📆 Weekly'}</span></td>
                                <td>
                                  <div className="user-avatar-name">
                                    <div className="user-avatar">{t.assignedTo?.name?.charAt(0).toUpperCase()}</div>
                                    {t.assignedTo?.name}
                                  </div>
                                </td>
                                <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                                <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {t.status === 'submitted' && (
                                      <button className="complete-btn" style={{ padding: '5px 10px' }} onClick={() => handleCompleteTask(t._id)}>✅ Complete</button>
                                    )}
                                    <button className="edit-btn" style={{ padding: '5px 10px' }} onClick={() => handleEditClick(t)}>📝 Edit</button>
                                    <button className="delete-btn" style={{ padding: '5px 10px' }} onClick={() => handleDeleteTask(t._id, t.title)}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div>
            <div className="admin-header">
              <div>
                <h1 className="admin-title">System Reports</h1>
                <p className="admin-subtitle">Manage automated and manual performance reports</p>
              </div>
              <button className="refresh-btn" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={fetchReports} disabled={reportLoading}>
                {reportLoading ? '🔄 Refreshing...' : '🔄 Refresh List'}
              </button>
            </div>

            <div className="report-actions-container" style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🛠️</span> Manual Report Generation
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="manual-trigger-btn daily"
                  onClick={() => handleManualTrigger('daily')}
                  disabled={reportLoading}
                >
                  📅 Generate Daily
                </button>
                <button
                  className="manual-trigger-btn weekly"
                  onClick={() => handleManualTrigger('weekly')}
                  disabled={reportLoading}
                >
                  📆 Generate Weekly
                </button>
                <button
                  className="manual-trigger-btn monthly"
                  onClick={() => handleManualTrigger('monthly')}
                  disabled={reportLoading}
                >
                  📊 Generate Monthly
                </button>
              </div>
              <p style={{ marginTop: '14px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                * Manual triggers process current data immediately. Reports will appear in the list below after a few seconds.
              </p>
            </div>

            <div className="users-table-card">
              <h3 className="table-title">Available Reports (Last 30 Days)</h3>
              {reportLoading ? (
                <div className="loading-state" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                  <p>Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📁</span>
                  <p style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: '18px' }}>No reports generated yet.</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>Automated reports are generated based on the system schedule.</p>
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Report Name</th>
                      <th style={{ width: '15%' }}>Type</th>
                      <th style={{ width: '25%' }}>Generated Date</th>
                      <th style={{ width: '25%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>📄</span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{r.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{r.filename}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`type-badge ${r.type}`}>
                            {r.type === 'daily' ? '📅 Daily' : r.type === 'weekly' ? '📆 Weekly' : '📊 Monthly'}
                          </span>
                        </td>
                        <td>{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                        <td>
                          <button
                            className="download-btn"
                            style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleDownloadReport(r._id, r.filename)}
                          >
                            📥 Download PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <h3 className="modal-title">Edit Task</h3>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="admin-form-group">
                <label>Task Title</label>
                <input
                  name="title"
                  type="text"
                  value={editTaskForm.title}
                  onChange={handleEditTaskChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="admin-form-group">
                  <label>Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    value={editTaskForm.dueDate}
                    onChange={handleEditTaskChange}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Task Type</label>
                  <select
                    name="taskType"
                    value={editTaskForm.taskType}
                    onChange={handleEditTaskChange}
                    required
                    className="modal-input"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f8fafc' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editTaskForm.description}
                  onChange={handleEditTaskChange}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f8fafc', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-row">
                <div className="admin-form-group">
                  <label>Assign To</label>
                  <select
                    name="assignedTo"
                    value={editTaskForm.assignedTo}
                    onChange={handleEditTaskChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f8fafc' }}
                  >
                    <option value="">Select user</option>
                    {DOMAINS.map(domain => {
                      const domainUsers = users.filter(u => u.domain === domain);
                      if (domainUsers.length === 0) return null;
                      return (
                        <optgroup key={domain} label={`${domain === 'Full Stack' ? '💻' : domain === 'Sales & Marketing' ? '📈' : domain === 'Data Science' ? '🧬' : domain === 'UI/UX Design' ? '🎨' : domain === 'HR & Management' ? '🤝' : '🤖'} ${domain}`}>
                          {domainUsers.map(u => (
                            <option key={u._id} value={u._id}>{u.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Domain</label>
                  <select
                    name="domain"
                    value={editTaskForm.domain}
                    onChange={handleEditTaskChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f8fafc' }}
                  >
                    <option value="">Select domain</option>
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="modal-cancel-btn" onClick={() => setEditingTask(null)}>Cancel</button>
                <button type="submit" className="modal-submit-btn" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;