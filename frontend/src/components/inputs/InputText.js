import React, { forwardRef } from 'react';
import './inputtext.css';

const TextInput = forwardRef(function TextInput(
  {
    label,
    id,
    type = 'text',
    placeholder,
    value,
    onChange,
    required = false,
    helpText,
    helpTextId,
    error,
    customCssInput = ''
  },
  ref
) {
  const describedBy =
    [helpTextId, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined;
  const inputClass = [
    'input-field',
    customCssInput,
    error ? 'input-field-error' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={inputClass}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
      />
      {helpText && (
        <p id={helpTextId} className="help-message">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default TextInput;
