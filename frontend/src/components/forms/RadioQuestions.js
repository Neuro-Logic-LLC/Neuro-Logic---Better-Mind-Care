/** @format */

import React from 'react';
import './FormElements.css';

function RadioQuestions({
  id,
  label,
  options,
  value,
  onChange,
  describedBy,
  error
}) {
  const errorId = error ? `${id}-error` : undefined;
  const describedIds = [describedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset id={id} className="question-block" aria-describedby={describedIds}>
      <legend className="question-label">{label}</legend>
      <div className="question-options">
        {options.map((opt) => {
          const optionValue = typeof opt === 'string' ? opt : opt?.value;
          const optionLabel = typeof opt === 'string' ? opt : opt?.label;
          const inputId = `${id}-${optionValue}`;

          return (
            <label key={optionValue} className="radio-option" htmlFor={inputId}>
              <input
                id={inputId}
                type="radio"
                name={id}
                value={optionValue}
                checked={value === optionValue}
                onChange={(e) => onChange(id, e.target.value)}
                aria-describedby={describedIds}
              />
              {optionLabel}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="error-message" id={errorId} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default RadioQuestions;
