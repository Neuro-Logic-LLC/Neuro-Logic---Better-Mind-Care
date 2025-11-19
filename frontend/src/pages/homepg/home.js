/** @format */

import React from 'react';
import LockNKeyIcon from '../../assets/icons/LockNKeyIcon.png';
import './home.css';

function Home() {
  return (
    <main className="main-content">
      <section className="hero-section">
        <h1>Welcome to Your Better Mind Care Dashboard</h1>
        <p>
          The Better Mind Care Dashboard is your secure portal for viewing your appointments, messages, lab results, and your personalized Brain Health Report.
        </p>
        <div className="privacy-notice">
          <img src={LockNKeyIcon} alt="Lock and Key Icon" className="lock-icon" />
          <p>Your information is private, encrypted, and only used to deliver your results and updates.</p>
        </div>
      </section>
    </main>
  );
}

export default Home;
