import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Logo variant="navbar" />
      </div>
      <div className="navbar-links">
        {user ? (
          <>
            <span className="navbar-user">Hi, {user.name} ({user.role})</span>
            <button className="navbar-btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link className="navbar-link" to="/login">Login</Link>
            <Link className="navbar-link" to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;