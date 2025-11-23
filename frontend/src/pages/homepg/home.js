/** @format */

import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import LockNKeyIcon from '../../assets/icons/LockNKeyIcon.png';
import CircleCheckIcon from '../../assets/icons/CircleCheckIcon.png';

import './home.css';

function Home() {
  const { user } = useAuth();
  const isLoggedIn = true; // Dev bypass

  if (isLoggedIn) {
    // Dashboard for logged-in users
    return (
      <main className="main-content bg-gradient-white-seafoam">
        <section className="hero-section">
          <h1>Welcome to your Better Mind Care Dashboard</h1>
          <p>
            This is your private home base for everything related to your brain health journey, including appointments, reports, and important updates. Once your lab results or brain health report are ready, you’ll find them here.
          </p>
          <div className="privacy-notice">
            <div className="privacy-item">
              <img src={LockNKeyIcon} alt="Lock and Key Icon" className="privacy-icon" />
              <h4>Your information is private, encrypted,</h4>
            </div>
            <div className="privacy-item">
              <img src={CircleCheckIcon} alt="Circle Check Icon" className="privacy-icon" />
              <h4>and only used to deliver your results and updates.</h4>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="features-grid">
            <Link to="/my-reports" className="feature-card-link">
              <div className="feature-card">
                <h3>Reports & Labs</h3>
                <p>View Your Reports & Lab Results</p>
                <p className="card-subtitle">Access your Brain Health Report, lab PDFs, and all documents shared with your account.</p>
              </div>
            </Link>
            <Link to="/patient-booking" className="feature-card-link">
              <div className="feature-card">
                <h3>Appointments</h3>
                <p>Your Appointments</p>
                <p className="card-subtitle">Review your intake appointment and lab appointment details, including past visits.</p>
              </div>
            </Link>
            <Link to="/messages" className="feature-card-link">
              <div className="feature-card">
                <h3>Messages</h3>
                <p>Secure Messaging</p>
                <p className="card-subtitle">Communicate securely with your care team and receive updates on your health journey.</p>
              </div>
            </Link>
            <Link to="/account" className="feature-card-link">
              <div className="feature-card">
                <h3>Account</h3>
                <p>Manage Your Account</p>
                <p className="card-subtitle">Update your profile, view billing information, and manage your account settings.</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    );
  } else {
    // Public home for non-logged-in
    return (
      <main className="main-content bg-gradient-white-seafoam">
        <section className="hero-section">
          <h1>Welcome to Better Mind Care</h1>
          <p>
            Better Mind Care is a health and wellness platform specializing in Alzheimer's advice.
          </p>
          <div className="privacy-notice">
            <div className="privacy-item">
              <img src={LockNKeyIcon} alt="Lock and Key Icon" className="privacy-icon" />
              <h4>Your information is private, encrypted,</h4>
            </div>
            <div className="privacy-item">
              <img src={CircleCheckIcon} alt="Circle Check Icon" className="privacy-icon" />
              <h4>and only used to deliver your results and updates.</h4>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <h3>Personalized Reports</h3>
              <p>Get detailed health insights</p>
              <p className="card-subtitle">Receive comprehensive reports based on your lab results and health data.</p>
            </div>
            <div className="feature-card">
              <h3>Expert Guidance</h3>
              <p>Connect with specialists</p>
              <p className="card-subtitle">Access personalized recommendations from Alzheimer's care experts.</p>
            </div>
            <div className="feature-card">
              <h3>Secure & Private</h3>
              <p>Your data is protected</p>
              <p className="card-subtitle">All information is encrypted and handled with the highest privacy standards.</p>
            </div>
            <div className="feature-card">
              <h3>Easy Access</h3>
              <p>Manage your health online</p>
              <p className="card-subtitle">View reports, schedule appointments, and communicate from anywhere.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }
}

export default Home;
