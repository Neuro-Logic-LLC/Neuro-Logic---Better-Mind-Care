/** @format */

import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import InputText from '../../components/inputs/InputText';
import LockNKeyIcon from '../../assets/icons/LockNKeyIcon.png';
import CircleCheckIcon from '../../assets/icons/CircleCheckIcon.png';
import HelpIcon from '../../assets/icons/HelpIcon.png';
import MessagesIcon from '../../assets/icons/MessagesIcon.png';
import LogOutIcon from '../../assets/icons/LogOutIcon.png';
import './account.css';

function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    emailPrefs: true,
    smsPrefs: false,
    patientFirstName: '',
    patientLastName: '',
    patientEmail: '',
    patientPhone: '',
    relationship: ''
  });
  const [isCaregiver, setIsCaregiver] = useState(false);

  // TODO: Implement real API calls to check user lab status from Evexia and message counts from backend
  // Mock user status for conditional messages
  const hasOrderedLabs = false; // Replace with real check
  const labsReady = false; // Replace with real check
  const hasMessages = true; // Replace with real check
  const hasAppointments = true; // Replace with real check - whether user has any appointments

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement save functionality
    alert('Account settings saved!');
  };

  return (
    <div className="account-page">
      <div className="account-content">
        <h1>Account Settings</h1>
        <p>Manage your account information and preferences.</p>

      <form onSubmit={handleSubmit} className="account-form">
        <section className="account-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <InputText
              label="First Name"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
            <InputText
              label="Last Name"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
            <InputText
              label="Email"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <InputText
              label="Phone"
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
        </section>

        <section className="account-section">
          <h2>Communication Preferences</h2>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="emailPrefs"
                checked={formData.emailPrefs}
                onChange={handleInputChange}
              />
              Email notifications
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="smsPrefs"
                checked={formData.smsPrefs}
                onChange={handleInputChange}
              />
              SMS notifications
            </label>
          </div>
        </section>

        <section className="account-section">
          <label className="checkbox-label toggle-label">
            <input
              type="checkbox"
              checked={isCaregiver}
              onChange={(e) => setIsCaregiver(e.target.checked)}
            />
            I am a caregiver signing up on behalf of someone else
          </label>
          {isCaregiver && (
            <div className="caregiver-fields">
              <h3>Patient Information</h3>
              <div className="form-grid">
                <InputText
                  label="Patient First Name"
                  id="patientFirstName"
                  name="patientFirstName"
                  value={formData.patientFirstName}
                  onChange={handleInputChange}
                  required
                />
                <InputText
                  label="Patient Last Name"
                  id="patientLastName"
                  name="patientLastName"
                  value={formData.patientLastName}
                  onChange={handleInputChange}
                  required
                />
                <InputText
                  label="Patient Email"
                  id="patientEmail"
                  name="patientEmail"
                  type="email"
                  value={formData.patientEmail}
                  onChange={handleInputChange}
                  required
                />
                <InputText
                  label="Patient Phone"
                  id="patientPhone"
                  name="patientPhone"
                  type="tel"
                  value={formData.patientPhone}
                  onChange={handleInputChange}
                />
                <InputText
                  label="Relationship to Patient"
                  id="relationship"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          )}
        </section>

        <section className="account-section">
          <h2>Login & Security</h2>
          <div className="account-actions">
            <button type="button" className="btn-outline" onClick={() => alert('Change password coming soon')}>
              <img src={LockNKeyIcon} alt="" className="btn-icon" />
              Change Password
            </button>
            <button type="button" className="btn-outline" onClick={() => alert('Two-factor auth coming soon')}>
              <img src={CircleCheckIcon} alt="" className="btn-icon" />
              Enable Two-Factor Authentication
            </button>
          </div>
        </section>

        <section className="account-section">
          <h2>Your Appointments</h2>
          {hasAppointments ? (
            <div className="appointments-widget">
              {/* TODO: Connect to calendar API to pull real appointment data and link to appointment pages */}
              {/* Mock appointments data - replace with real API call */}
              <div className="appointment-item upcoming" onClick={() => navigate('/intake-form')} style={{cursor: 'pointer'}}>
                <div className="appointment-details">
                  <strong>Intake Appointment</strong>
                  <p>October 15, 2025 at 2:00 PM PST</p>
                </div>
              </div>
              <div className="appointment-item upcoming" onClick={() => navigate('/screening-order')} style={{cursor: 'pointer'}}>
                <div className="appointment-details">
                  <strong>Lab Appointment</strong>
                  <p>October 20, 2025 at 10:00 AM PST - Better Mind Care Lab</p>
                </div>
              </div>
              <div className="appointment-item past" onClick={() => navigate('/patient-booking')} style={{cursor: 'pointer'}}>
                <div className="appointment-details">
                  <strong>Initial Consultation</strong>
                  <p>September 1, 2025 at 3:00 PM PST</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-appointments">You don't have any upcoming appointments right now.</p>
          )}
          <p className="reschedule-text">
            To make changes to your appointment, contact support at support@bettermindcare.com and we'll help you reschedule.
          </p>
        </section>

        <section className="account-section">
          <h2>Messages</h2>
          <div className="messages-preview">
            {hasMessages ? (
              <div className="message-item">
                <strong>Support Team</strong>
                <span className="message-date">October 10, 2025</span>
                <p>Your lab results are ready to view.</p>
              </div>
            ) : !hasOrderedLabs ? (
              <p className="no-messages">Sign up for labs to get personalized health insights and start your journey.</p>
            ) : !labsReady ? (
              <p className="no-messages">Waiting on your lab results. We'll notify you as soon as they're ready.</p>
            ) : (
              <p className="no-messages">You have no new messages.</p>
            )}
          </div>
        </section>

        <section className="account-section">
          <h2>Support</h2>
          <div className="support-links">
            <a href="/support" className="btn-outline">
              <img src={HelpIcon} alt="" className="btn-icon" />
              Help & FAQ
            </a>
            <a href="/contact" className="btn-outline">
              <img src={MessagesIcon} alt="" className="btn-icon" />
              Contact Us
            </a>
          </div>
        </section>

        <section className="account-section danger-zone">
          <h2>Cancel Account</h2>
          <p>This action cannot be undone. All your data will be permanently deleted.</p>
          <button type="button" className="btn-danger" onClick={() => alert('Cancel account coming soon')}>
            <img src={LogOutIcon} alt="" className="btn-icon" />
            Cancel Account
          </button>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn">
            <img src={CircleCheckIcon} alt="" className="btn-icon" />
            Save Changes
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

export default Account;