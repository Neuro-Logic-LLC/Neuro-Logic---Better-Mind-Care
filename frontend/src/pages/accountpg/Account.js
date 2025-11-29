/** @format */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import InputText from '../../components/inputs/InputText';
import LockNKeyIcon from '../../assets/icons/LockNKeyIcon.png';
import CircleCheckIcon from '../../assets/icons/CircleCheckIcon.png';

import './account.css';

function Account() {
  const { user } = useAuth();

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
  const [messageCount, setMessageCount] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // TODO: Implement real API calls to check user lab status from Evexia and message counts from backend
  // Mock user status for conditional messages
  // const hasOrderedLabs = false; // Replace with real check
  // const labsReady = false; // Replace with real check
  // const hasAppointments = true; // Replace with real check - whether user has any appointments

  const hasMessages = messageCount > 0;

  useEffect(() => {
    if (user) {
      fetchMessageCount();
    }
  }, [user]);

  const fetchMessageCount = async () => {
    try {
      const response = await fetch('/api/messages', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const messages = await response.json();
        setMessageCount(messages.length);
      }
    } catch (error) {
      console.error('Failed to fetch message count:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
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
                label="Update Your Email Address"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <InputText
                label="Update Your Phone Number"
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
            <p>
              Choose how you'd like us to contact you about updates, results,
              and important reminders.
            </p>
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
              <button
                type="button"
                className="btn-outline"
                onClick={() => alert('Change password coming soon')}
              >
                <img src={LockNKeyIcon} alt="" className="btn-icon" />
                Change Password
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => alert('Two-factor auth coming soon')}
              >
                <img src={CircleCheckIcon} alt="" className="btn-icon" />
                Enable Two-Factor Authentication
              </button>
            </div>
          </section>

          <section className="account-section danger-zone">
            <h2>Cancel Account</h2>
            {!showCancelConfirm ? (
              <>
                <p>
                  This action cannot be undone. All your data will be
                  permanently deleted.
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel My Account
                </button>
              </>
            ) : (
              <>
                <p>
                  Are you sure you want to cancel your account? Canceling will
                  remove access to your dashboard and future updates.
                </p>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Account
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() =>
                      alert(
                        "Your account has been canceled. We're here if you ever want to restart your journey."
                      )
                    }
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </>
            )}
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Account;
