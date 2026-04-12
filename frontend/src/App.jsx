import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

import './App.css';

const PrivateUserRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'user') return <Navigate to="/admin-login" />;
  return children;
};

const PrivateAdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin-login" />;
  if (user.role !== 'admin') return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* User Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <PrivateUserRoute>
              <UserDashboard />
            </PrivateUserRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/admin/dashboard" element={
            <PrivateAdminRoute>
              <AdminDashboard />
            </PrivateAdminRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;