/** @format */

import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import LockNKeyIcon from '../../assets/icons/LockNKeyIcon.png';
import CircleCheckIcon from '../../assets/icons/CircleCheckIcon.png';
import DividerWave from '../../components/bg/DividerWave';
import './home.css';

function Home() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  if (isLoggedIn) {
    // Dashboard for logged-in users
    return (
      <main className="main-content">
        <DividerWave />
        <section className="hero-section">
          <h1>Welcome to Your Better Mind Care Dashboard</h1>
          <p>
<<<<<<< HEAD
            The Better Mind Care Dashboard is your secure portal for viewing
            your appointments, messages, lab results, and your personalized
            Brain Health Report.
          </p>
          <div className="privacy-notice">
            <div className="privacy-item">
              <img
                src={LockNKeyIcon}
                alt="Lock and Key Icon"
                className="privacy-icon"
              />
              <h4>Your information is private, encrypted,</h4>
            </div>
            <div className="privacy-item">
              <img
                src={CircleCheckIcon}
                alt="Circle Check Icon"
                className="privacy-icon"
              />
=======
            The Better Mind Care Dashboard is your secure portal for viewing your appointments, messages, lab results, and your personalized Brain Health Report.
          </p>
          <div className="privacy-notice">
            <div className="privacy-item">
              <img src={LockNKeyIcon} alt="Lock and Key Icon" className="privacy-icon" />
              <h4>Your information is private, encrypted,</h4>
            </div>
            <div className="privacy-item">
              <img src={CircleCheckIcon} alt="Circle Check Icon" className="privacy-icon" />
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
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
<<<<<<< HEAD
                <p className="card-subtitle">
                  Access your Brain Health Report, lab PDFs, and all documents
                  shared with your account.
                </p>
=======
                <p className="card-subtitle">Access your Brain Health Report, lab PDFs, and all documents shared with your account.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
              </div>
            </Link>
            <Link to="/patient-booking" className="feature-card-link">
              <div className="feature-card">
                <h3>Appointments</h3>
                <p>Your Appointments</p>
<<<<<<< HEAD
                <p className="card-subtitle">
                  Review your intake appointment and lab appointment details,
                  including past visits.
                </p>
=======
                <p className="card-subtitle">Review your intake appointment and lab appointment details, including past visits.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
              </div>
            </Link>
            <Link to="/messages" className="feature-card-link">
              <div className="feature-card">
                <h3>Messages</h3>
                <p>Messages From Better Mind Care</p>
<<<<<<< HEAD
                <p className="card-subtitle">
                  See system updates, helpful announcements, and any direct
                  messages sent to you.
                </p>
=======
                <p className="card-subtitle">See system updates, helpful announcements, and any direct messages sent to you.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
              </div>
            </Link>
            <Link to="/my-reports" className="feature-card-link">
              <div className="feature-card">
                <h3>Resources</h3>
                <p>Helpful Resources & FAQs</p>
<<<<<<< HEAD
                <p className="card-subtitle">
                  Browse account-holder FAQs and clinician-written guides to
                  support your brain health journey.
                </p>
=======
                <p className="card-subtitle">Browse account-holder FAQs and clinician-written guides to support your brain health journey.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
              </div>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Landing page for non-logged-in users
  return (
    <main className="main-content">
      <DividerWave />
      <section className="hero-section">
        <h1>Welcome to Your Better Mind Care Dashboard</h1>
        <p>
<<<<<<< HEAD
          The Better Mind Care Dashboard is your secure portal for viewing your
          appointments, messages, lab results, and your personalized Brain
          Health Report.
        </p>
        <div className="privacy-notice">
          <div className="privacy-item">
            <img
              src={LockNKeyIcon}
              alt="Lock and Key Icon"
              className="privacy-icon"
            />
            <h4>Your information is private, encrypted,</h4>
          </div>
          <div className="privacy-item">
            <img
              src={CircleCheckIcon}
              alt="Circle Check Icon"
              className="privacy-icon"
            />
=======
          The Better Mind Care Dashboard is your secure portal for viewing your appointments, messages, lab results, and your personalized Brain Health Report.
        </p>
        <div className="privacy-notice">
          <div className="privacy-item">
            <img src={LockNKeyIcon} alt="Lock and Key Icon" className="privacy-icon" />
            <h4>Your information is private, encrypted,</h4>
          </div>
          <div className="privacy-item">
            <img src={CircleCheckIcon} alt="Circle Check Icon" className="privacy-icon" />
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
            <h4>and only used to deliver your results and updates.</h4>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <h3>Reports & Labs</h3>
<<<<<<< HEAD
            <p>
              Access your personalized Brain Health Report and lab summaries.
            </p>
=======
            <p>Access your personalized Brain Health Report and lab summaries.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
          </div>
          <div className="feature-card">
            <h3>Appointments</h3>
            <p>View your intake appointment and lab appointments.</p>
          </div>
          <div className="feature-card">
            <h3>Messages</h3>
            <p>Receive updates, news, and direct messages from our team.</p>
          </div>
          <div className="feature-card">
            <h3>Resources</h3>
            <p>Find FAQs and clinician-written brain health guidance.</p>
          </div>
        </div>
<<<<<<< HEAD
        <p className="features-micro-copy">
          You'll get access to these features once you sign in.
        </p>
=======
        <p className="features-micro-copy">You'll get access to these features once you sign in.</p>
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
      </section>
    </main>
  );
}

export default Home;
