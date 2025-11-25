/** @format */

// components/Card.js
// Card component supports different styles via className prop:
// - 'card' (default): Centered content, min-height 220px, hover lift effect.
// - 'card-form': For forms - min-height 0, justify-content flex-start.
// - 'card-grid': Grid layout wrapper (not for individual cards).
// - 'card-section': Section padding (not for individual cards).
// - 'card-icon': Icon sizing (applied to img/svg inside card).
// - 'button-row': Button layout inside card.
// Combine classes as needed, e.g., className="card card-form".
import React from 'react';
import './cards.css';

function Card({ title, subtitle, children, className = '', icon, style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {icon && <img src={icon} alt="" className="card-icon" />}{' '}
      {title && <h3>{title}</h3>}
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  );
}

export default Card;
