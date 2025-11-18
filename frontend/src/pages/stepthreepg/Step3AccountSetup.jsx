import './Step3AccountSetup.css';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../NewCheckoutPages/SignupContext';
import { PrimaryButton } from '../../components/button/Buttons';


export default function StepThreeAccountSetup() {
  const { state, setField } = useSignup();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');

  const [local, setLocal] = useState({
    dob: '',
    gender: '',
    isCaregiver: false,
    cgFirst: '',
    cgLast: '',
    cgPhone: '',
    cgEmail: '',
    username: '' // stays hidden
  });

  // Auto-generate hidden username from email (email_canon later)
  useEffect(() => {
    if (state.email) {
      const suggested = state.email.trim().toLowerCase();
      setLocal((prev) => ({ ...prev, username: suggested }));
    }
  }, [state.email]);

  const update = (e) => setLocal({ ...local, [e.target.name]: e.target.value });

  const toggleCaregiver = () =>
    setLocal({ ...local, isCaregiver: !local.isCaregiver });

  const submit = (e) => {
    e.preventDefault();

    // Save required fields to context
    setField('dob', local.dob);
    setField('gender', local.gender);
    setField('isCaregiver', local.isCaregiver);

    // Save hidden username to context if you still need it
    setField('username', local.username);

    if (local.isCaregiver) {
      setField('cgFirst', local.cgFirst);
      setField('cgLast', local.cgLast);
      setField('cgPhone', local.cgPhone);
      setField('cgEmail', local.cgEmail);
    }

    // Store password securely in sessionStorage for later
    sessionStorage.setItem('TEMP_PASSWORD', password);

    navigate('/join/checkout');
  };

  return (
    <div className="account-setup-container">
      <h1 className="page-title">Account Setup</h1>

      <form onSubmit={submit} className="account-form">
        {/* Top row */}
        <div className="top-row">
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" onChange={update} required />
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select name="gender" onChange={update} required>
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Create Password</label>
            <input
              type="password"
              value={password}
              placeholder="Create Password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="caregiver-toggle">
            <label>
              <input
                style={{ marginRight: '8px' }}
                type="checkbox"
                checked={local.isCaregiver}
                onChange={toggleCaregiver}
              />
              I am a caregiver
            </label>
          </div>
        </div>

        {/* Caregiver box */}
        {local.isCaregiver && (
          <div className="caregiver-box">
            <h2>Caregiver Information</h2>

            <div className="cg-grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  name="cgFirst"
                  placeholder="CG First Name"
                  onChange={update}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  name="cgLast"
                  placeholder="CG Last Name"
                  onChange={update}
                  required
                />
              </div>

              <div className="form-group">
                <label>Caregiver Phone</label>
                <input
                  name="cgPhone"
                  placeholder="CG Phone"
                  onChange={update}
                  required
                />
              </div>

              <div className="form-group">
                <label>Caregiver Email</label>
                <input
                  name="cgEmail"
                  type="email"
                  placeholder="CG Email"
                  onChange={update}
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="submit-wrap">
          <PrimaryButton type="submit">Continue</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
