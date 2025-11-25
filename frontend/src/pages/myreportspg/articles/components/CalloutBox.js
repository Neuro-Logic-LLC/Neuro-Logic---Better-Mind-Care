/** @format */

import React from 'react';

function CalloutBox({ type, children }) {
  const getCalloutClass = () => {
    switch (type) {
      case 'key-insight':
        return 'callout-key-insight';
      case 'what-this-means':
        return 'callout-what-this-means';
      default:
        return 'callout-default';
    }
  };

  return <div className={`callout-box ${getCalloutClass()}`}>{children}</div>;
}

export default CalloutBox;
