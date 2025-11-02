/** @format */

import React from 'react';
import './FormElements.css';

function QuestionsCheckbox({
  id,
  label,
  options,
  values = [],
  onChange,
  describedBy,
  error
}) {
  const errorId = error ? `${id}-error` : undefined;
  const describedIds =
    [describedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset
      id={id}
      className="question-block"
      aria-describedby={describedIds}
    >
      <legend className="question-label">{label}</legend>
      <div className="question-options">
        {options.map((opt) => {
          const optionValue = typeof opt === 'string' ? opt : opt?.value;
          const optionLabel = typeof opt === 'string' ? opt : opt?.label;
          const inputId = `${id}-${optionValue}`;
          const checked = values.includes(optionValue);

          return (
            <label
              key={optionValue}
              className="checkbox-option"
              htmlFor={inputId}
            >
              <input
                id={inputId}
                type="checkbox"
                name={id}
                value={optionValue}
                checked={checked}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  let updated;
                  if (isChecked) {
                    updated = [...values, optionValue];
                  } else {
                    updated = values.filter((v) => v !== optionValue);
                  }
                  onChange(id, updated);
                }}
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

export default QuestionsCheckbox;
