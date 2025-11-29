/** @format */

import React from 'react';
import { Link } from 'react-router-dom';

function BackToResources() {
  return (
    <nav className="back-to-resources">
      <Link to="/resources" className="back-link">
        ← Back to Resources
      </Link>
    </nav>
  );
}

export default BackToResources;
