/** @format */

import React from 'react';
import './contact.css';

function Contact() {
  return (
    <div className="contact-page">
      <h1>Contact Us</h1>
      <p>
        We’re here to help. Whether you have questions about your intake, your
        report, or just need a human to talk to — we’ve got your back.
      </p>

      <div className="contact-section">
        <h3>📧 Email</h3>
        <p>
          <a href="mailto:support@BetterMindCare.com">
            support@bettermindcare.com
          </a>
        </p>
        {/* Need to link to Jim's Google Calendar */}
        <h3>📞 Phone</h3>

          <p>(760) 331-3116</p>

        <h3>📅 Schedule a Meeting</h3>
        {/* // UPDATE WITH JIM'S GOOGLE CALENDARID LINK */}
        {/* Once authenticated by Google Calendar, users can book a time directly.
				Go to calendar.google.com

				Click ⚙️ → Appointment schedules

				Create a booking schedule.

				Copy the booking page link (looks like https://calendar.google.com/bookings/s/...)

				Then use: */}
          <p>
            <a
              href="https://calendar.google.com/bookings/s/8G8m12sQG-ABCD1234"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a time to speak with a wellness coach
            </a>
          </p>
        </div>

      <div className="feedback-form">
        <h3 style={{ marginBottom: '2rem' }}>Send Us a Message</h3>
        <form>
          <input type="text" placeholder="Your Name" required />
          <input type="email" placeholder="Your Email" required />
          <textarea placeholder="Your Message" rows="5" required></textarea>
          <button type="submit" className="btn">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

export default Contact;
