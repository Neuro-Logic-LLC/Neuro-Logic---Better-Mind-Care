/** @format */
import React from 'react';
import { Link } from 'react-router-dom';
import './buttons.css';
import '../../App.css';

/* ---------- utils ---------- */
function mergeButtonClasses(base, extra) {
  return extra ? `${base} ${extra}` : base;
}

/* ---------- solid buttons ---------- */
export const PrimaryButton = React.forwardRef(
  ({ children, className, type, ...props }, ref) => (
    <button
      ref={ref}
      // default to type="button" so forms don’t submit by accident
      type={type ?? 'button'}
      className={mergeButtonClasses('btn btn-primary', className)}
      {...props}
    >
      {children}
    </button>
  )
);

export const SecondaryButton = React.forwardRef(
  ({ children, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={mergeButtonClasses('btn btn-secondary', className)}
      {...props}
    >
      {children}
    </button>
  )
);

export const OutlineButton = React.forwardRef(
  ({ children, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={mergeButtonClasses('btn btn-outline', className)}
      {...props}
    >
      {children}
    </button>
  )
);

/* ---------- pill links (render <Link> or <a>) ---------- */
/* Orange → Teal */
export const PillOne = React.forwardRef(
  ({ to, href, children, className, ...props }, ref) => {
    const Comp = to ? Link : 'a';
    const navProps = to ? { to } : { href: href ?? '#' };
    // role="menuitem" is only correct inside an ARIA menu. Dropping it.
    return (
      <Comp
        ref={ref}
        className={mergeButtonClasses('btn btn-pill-one', className)}
        {...navProps}
        // allow target/rel etc. to pass through
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

/* Teal → Orange */
export const PillTwo = React.forwardRef(
  ({ to, href, children, className, ...props }, ref) => {
    const Comp = to ? Link : 'a';
    const navProps = to ? { to } : { href: href ?? '#' };
    return (
      <Comp
        ref={ref}
        className={mergeButtonClasses('btn btn-pill-two', className)}
        {...navProps}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
