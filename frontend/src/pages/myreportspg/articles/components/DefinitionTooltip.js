/** @format */

import React, { useState } from 'react';

function DefinitionTooltip({ term, definition, children }) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  return (
    <span className="definition-tooltip-container">
      <span
        className="definition-term"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        role="button"
        aria-describedby={`tooltip-${term.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {children || term}
      </span>
      {isVisible && (
        <span
          id={`tooltip-${term.replace(/\s+/g, '-').toLowerCase()}`}
          className="definition-tooltip"
          role="tooltip"
        >
          {definition}
        </span>
      )}
    </span>
  );
}

export default DefinitionTooltip;