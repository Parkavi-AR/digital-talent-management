import React from 'react';
import logoImg from '../assets/logo.png';
import './Logo.css';

const Logo = ({ variant = 'default', className = '' }) => {
  return (
    <div className={`logo-container ${variant} ${className}`.trim()}>
      <img src={logoImg} alt="RyniXsoft Talent Management" className="logo-image" />
    </div>
  );
};

export default Logo;
