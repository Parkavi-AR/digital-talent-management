import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import './AdminLogin.css';

const AdminLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Attempting admin login for:', form.email.trim());
    try {
      const loginPayload = {
        email: form.email.trim(),
        password: form.password
      };

      const { data } = await API.post('/auth/login', loginPayload);
      console.log('Admin Login successful:', data.role);

      if (data.role !== 'admin') {
        setError('Access denied. This portal is for admins only.');
        return;
      }
      login(data);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Admin Login Error Details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <Logo variant="auth" />
        <div className="admin-auth-header">
          <span className="admin-badge">🔧 Admin Portal</span>
          <p className="admin-auth-subtitle">Restricted access only</p>
        </div>
        {error && <p className="admin-auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="Enter admin email"
              onChange={handleChange}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              placeholder="Enter password"
              onChange={handleChange}
              required
            />
          </div>
          <button className="admin-auth-btn" type="submit">
            Sign In as Admin
          </button>
        </form>
        <p className="admin-auth-link">
          First time? <Link to="/admin-register">Create Admin Account</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;