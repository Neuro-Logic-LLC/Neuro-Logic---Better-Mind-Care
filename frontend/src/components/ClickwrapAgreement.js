/** @format */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ClickwrapAgreement = ({ agreed, onAgreeChange }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreeChange(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span style={{ fontSize: 14, lineHeight: 1.4 }}>
          I agree to the{' '}
          <Link to="/terms" target="_blank" rel="noreferrer">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 8,
              maxWidth: 500,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Terms of Service</h3>
            <p>[Insert full terms here or link to /terms]</p>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClickwrapAgreement;