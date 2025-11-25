import React from 'react';
import { Link } from 'react-router-dom';
import './notfound.css';

const NotFound = ({ errorCode = 404 }) => {
  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="error-code">{errorCode}</h1>
        <h2 className="error-title">Oops! Something went wrong</h2>
        <p className="error-message">
          It looks like the page you're looking for isn't available right now.
          Don't worry, we're here to help you get back on track.
        </p>
        <div className="error-actions">
          <Link to="/" className="home-link">
            Go to Home
          </Link>
          <Link to="/support" className="support-link">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
