/** @format */

import React from 'react';

function PullQuote({ children, attribution }) {
  return (
    <blockquote className="pull-quote">
      <p className="pull-quote-text">"{children}"</p>
      {attribution && (
        <cite className="pull-quote-attribution">— {attribution}</cite>
      )}
    </blockquote>
  );
}

export default PullQuote;
