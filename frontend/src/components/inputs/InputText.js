/** @format */

import React from 'react';
import './inputtext.css';

function TextInput({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  helpText,
  helpTextId,
  error
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = helpTextId || (helpText ? `${id}-help` : undefined);
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="input-field"
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
      />
      {helpText && (
        <p className="help-message" id={hintId}>
          {helpText}
        </p>
      )}
      {error && (
        <p className="error-message" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default TextInput;
