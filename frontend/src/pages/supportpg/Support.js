/** @format */

import React from 'react';
import { Link } from 'react-router-dom';

function Support() {
  return (
    <div
      style={{
        background: 'var(--seafoam-gradient)',
        minHeight: '100vh',
        padding: '2rem'
      }}
    >
      <div className="support-page">
        <h1>Support & Help</h1>
        <p>Find answers to common questions and get the help you need.</p>

        <section className="support-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3>How do I view my lab results?</h3>
              <p>
                Log in to your dashboard and navigate to "My Reports" to view
                your personalized brain health report and lab results.
              </p>
            </div>
            <div className="faq-item">
              <h3>How do I schedule an appointment?</h3>
              <p>
                Use the "Appointments" section in your dashboard to view and
                manage your calendar appointments.
              </p>
            </div>
            <div className="faq-item">
              <h3>What should I do if I have questions about my report?</h3>
              <p>
                Contact our support team at support@bettermindcare.com or use
                the contact form below.
              </p>
            </div>
            <div className="faq-item">
              <h3>Is my data secure?</h3>
              <p>
                Yes, we are fully HIPAA compliant and use encryption to protect
                all personal health information.
              </p>
            </div>
          </div>
        </section>

        <section className="support-section">
          <h2>Need More Help?</h2>
          <p>
            If you can't find the answer you're looking for, reach out to us:
          </p>
          <ul>
            <li>
              Email:{' '}
              <a href="mailto:support@bettermindcare.com">
                support@bettermindcare.com
              </a>
            </li>
            <li>Phone: (760) 331-3116</li>
            <li>
              <Link to="/contact">Contact Form</Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default Support;
