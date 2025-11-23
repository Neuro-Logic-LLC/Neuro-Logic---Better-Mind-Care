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
    username: ''
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
  }, [navigate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return;

    async function load() {
      const res = await fetch(`/api/stripe/session/${sessionId}`);
      const data = await res.json();

      const safe = (field, val) => {
        if (val !== null && val !== undefined && val !== '') {
          setField(field, val);
        }
      };
      safe(setField('customerId', data.customerId));
      safe(setField('paymentIntentId', data.paymentIntentId));
      setField('email', data.email);
      safe('first', data.first);
      safe('last', data.last);
      safe('phone', data.phone);
      safe('zip', data.zip);
      safe('street', data.street);
      safe('city', data.city);
      safe('state', data.state);
      safe('address', data.street); // Stripe never sends this, so state.address stays intact
      safe('address2', data.street2);
      console.log(data);

      // NOW strip session_id safely
      window.history.replaceState({}, '', '/account-info');
    }

    load();
  }, []);

  // Auto-fill hidden username
  useEffect(() => {
    if (state.email) {
      const suggested = state.email.trim().toLowerCase();
      setLocal((prev) => ({ ...prev, username: suggested }));
    }
  }, [state.email]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return;

    async function load() {
      const res = await fetch(`/api/stripe/session/${sessionId}`);
      const data = await res.json();

      // Save these for account creation
      setField('customerId', data.customerId);
      setField('paymentIntentId', data.paymentIntentId);
      setField('email', data.email);
    }

    load();
  }, []);

  const update = (e) => setLocal({ ...local, [e.target.name]: e.target.value });

  const toggleCaregiver = () =>
    setLocal({ ...local, isCaregiver: !local.isCaregiver });

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { res, data };
  }

  // async function chargeUser() {
  //   const { customerId, paymentMethod, totalCents } = state;
  //   console.log('Charging user with:', {
  //     customerId,
  //     paymentMethod,
  //     totalCents
  //   });

  //   // if (!customerId || !paymentMethod) {
  //   //   throw new Error("Payment details missing — go back to checkout.");
  //   // }

  //   if (!state.customerId || !state.paymentIntentId) {
  //     console.warn('Stripe session data missing');
  //     // Optional: show error or redirect
  //   }

  //   const body = {
  //     customerId: customerId,
  //     paymentMethod: paymentMethod,
  //     amountCents: totalCents,
  //     meta: {
  //       EmailAddress: state.email,
  //       DOB: local.dob,
  //       Gender: local.gender,
  //       isCaregiver: local.isCaregiver ? '1' : '0',
  //       cgFirst: local.cgFirst,
  //       cgLast: local.cgLast,
  //       Phone: local.cgPhone,
  //       PostalCode: state.billingZip || '',
  //       join_source: 'JoinStepThree'
  //     }
  //   };

  //   const { res, data } = await postJson(
  //     '/api/stripe/charge-after-setup',
  //     body
  //   );

  //   if (!res.ok) {
  //     throw new Error(data.error || 'Payment failed');
  //   }

  //   return data;
  // }

  async function submit(e) {
    e.preventDefault();

    try {
      // Save to context (optional depending on your app)
      setField('dob', local.dob);
      setField('gender', local.gender);
      setField('isCaregiver', local.isCaregiver);
      setField('username', local.username);

      if (local.isCaregiver) {
        setField('cgFirst', local.cgFirst);
        setField('cgLast', local.cgLast);
        setField('cgPhone', local.cgPhone);
        setField('cgEmail', local.cgEmail);
      }

      // Save password temporarily
      sessionStorage.setItem('TEMP_PASSWORD', password);

      // ------------------------------------------------------------
      // ⭐ CALL YOUR BACKEND TO CREATE THE ENCRYPTED USER ACCOUNT
      // ------------------------------------------------------------
      const signupBody = {
        email: state.email,
        password,
        dob: local.dob,
        gender: local.gender,

        // match backend format:
        is_caregiver: local.isCaregiver ? '1' : '0',
        cg_first: local.cgFirst,
        cg_last: local.cgLast,
        cg_phone: local.cgPhone,
        cg_email: local.cgEmail
      };

      const res = await fetch('/api/auth/paid-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupBody)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Signup failed.');
        return;
      }

      // ------------------------------------------------------------
      // SUCCESS → redirect
      // ------------------------------------------------------------
      // 2. Create order
      // 1. CREATE PATIENT IN EVEXIA
      const patientPayload = {
        EmailAddress: state.email,
        FirstName: state.first,
        LastName: state.last,
        StreetAddress: state.address,
        StreetAddress2: state.address2 || '',
        City: state.city,
        State: state.state,
        PostalCode: state.zip,
        Phone: state.phone,
        DOB: local.dob,
        Gender: local.gender === 'Male' ? 'M' : 'F',
        ExternalClientID: state.externalClientId
      };

      const patRes = await fetch('/api/evexia/patient-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload)
      });

      const patientData = await patRes.json();
      const PatientID = patientData.PatientID;

      // 2. CREATE ORDER
      const orderRes = await fetch('/api/evexia/order-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Patient_ID: PatientID,
          Order_Type: 'ClientBill',
          Phlebotomy_Options: 'PSC'
        })
      });

      const { Patient_Order_ID } = await orderRes.json();

      // 3. ADD ORDER ITEMS
      if (state.pickedCore) {
        await fetch('/api/evexia/order-item-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Patient_Order_ID,
            Test_Code: 'CORE'
          })
        });
      }

      if (state.pickedApoe) {
        await fetch('/api/evexia/order-item-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Patient_Order_ID,
            Test_Code: 'APOE'
          })
        });
      }

      // 4. COMPLETE ORDER
      await fetch('/api/evexia/patient-order-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Patient_Order_ID })
      });

      navigate('/success');
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    }
  }

  return (
    <div className="account-setup-container">
      <h1 className="page-title">Account Setup</h1>

      <form onSubmit={submit} className="account-form">
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
          <PrimaryButton type="submit">Finish</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
