import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import './AdminRegister.css';

const AdminRegister = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await API.post('/auth/register-admin', form);
      login(data);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <Logo variant="auth" />
        <div className="admin-auth-header">
          <span className="admin-badge">🔧 Admin</span>
          <p className="admin-auth-subtitle">First time setup only</p>
        </div>
        {error && <p className="admin-auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Full Name</label>
            <input
              name="name"
              type="text"
              placeholder="Enter admin name"
              onChange={handleChange}
              required
            />
          </div>
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
            Create Admin Account
          </button>
        </form>
        <p className="admin-auth-link">
          Already have an account? <Link to="/admin-login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;