import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Attempting login for:', form.email.trim());
    try {
      const loginPayload = {
        email: form.email.trim(),
        password: form.password
      };
      
      const { data } = await API.post('/auth/login', loginPayload);
      console.log('Login successful:', data.role);
      
      if (data.role !== 'user') {
        setError('Access denied. This portal is for users only.');
        return;
      }
      login(data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login Error Details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Logo variant="auth" />
        <p className="auth-subtitle">👤 User Portal</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />
          </div>
          <button className="auth-btn" type="submit">Login</button>
        </form>

      </div>
    </div>
  );
};

export default Login;