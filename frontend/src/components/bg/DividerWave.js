/** @format */

import React from 'react';
import './dividerwave.css';

const DividerWave = () => {
  return (
    <div className="divider-wave-outer">
      <div className="divider-wave-container">
        <svg
          className="wave wave-back"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(230, 247, 249, 0.85)"
            strokeWidth="60"
            opacity="0.5"
            d="M0,160 C300,0 1140,320 1440,160 L1440,320 L0,320 Z"
          />
        </svg>

        <svg
          className="wave wave-front"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(209, 239, 241, 0.65)"
            strokeWidth="60"
            opacity="0.7"
            d="M0,180 C400,80 1040,360 1440,200 L1440,320 L0,320 Z"
          />
        </svg>
        <div className="wave-fade"></div>
      </div>
    </div>
  );
};

export default DividerWave;
