/** @format */

import React from 'react';
import { Link } from 'react-router-dom';
import { PrimaryButton } from '../components/button/Buttons';

const ThankYouPage = () => {
  return (
    <div style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Thank You!</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        Your payment has been processed successfully. You will receive a confirmation email shortly.
      </p>
      <p style={{ marginBottom: 32 }}>
        Next steps: Check your email for order details and instructions on how to proceed with your lab tests.
      </p>
      <Link to="/account">
        <PrimaryButton>Go to My Account</PrimaryButton>
      </Link>
    </div>
  );
};

export default ThankYouPage;