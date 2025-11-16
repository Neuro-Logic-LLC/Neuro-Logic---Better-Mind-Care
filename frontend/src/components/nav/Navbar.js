/** @format */

import './navbar.css';
import '../../App.css';
import { PillOne, PillTwo } from '../button/Buttons';
import logo from '../../assets/BMCLogo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import React from 'react';

function Navbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const isLoggedIn = !!user;
  console.log('Navbar user:', user);
  const role = (isLoggedIn ? user?.role : '') || '';
  const isPatient = role.toLowerCase() === 'patient';

  const isDev = process.env.NODE_ENV === 'development';
  console.log(
    `Navbar render - isLoggedIn: ${isLoggedIn}, role: ${role}, isPatient: ${isPatient}, isDev: ${isDev}`
  );
  const isProd = process.env.NODE_ENV === 'production';

  const base = isProd
    ? 'https://staging.bettermindcare.com'
    : 'https://localhost:5050';
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' } // optional
      });

      if (!res.ok && res.status !== 204) {
        console.warn('Logout returned', res.status, await res.text());
      }
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      // client cleanup regardless of server result
      try {
        localStorage.removeItem('token');
      } catch {}
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  const wpBase = isProd
    ? 'https://bettermindcare.com'
    : 'https://staging.bettermindcare.com';

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link
        to="/"
        className="navbar-left navbar-logo"
        aria-label="Better Mind Care Home"
      >
        <img src={logo} alt="Better Mind Care logo" className="logo" />
      </Link>

      {/* RIGHT SIDE: auth row on top, menu below */}
      <div
        className="navbar-right-wrap"
        style={{ display: 'flex', justifyContent: 'space-evenly' }}
      >
        {/* AUTH ROW (always shown, one row above CTAs) */}
        <div className="navbar-auth-row" aria-label="Authentication">
          <Link to="/login">Sign In</Link>
          {/* <span className="navbar-auth__divider" aria-hidden="true">
            |
          </span>
          <Link to="/sign-up">Sign Up</Link> */}
        </div>
        {/* MENU / CTAs - WordPress sections */}
        <ul className="navbar-right" role="menubar" aria-label="Primary">
          {/* <li role="none">
            <a
              role="menuitem"
              href={`${wpBase}/early-detection`}
              className="wp-link"
            >
              Early Detection
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href={`${wpBase}/preventive-care`}
              className="wp-link"
            >
              Preventive Care
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href={`${wpBase}/our-approach`}
              className="wp-link"
            >
              Our Approach
            </a>
          </li>
          <li role="none">
            <a role="menuitem" href={`${wpBase}/pricing`} className="wp-link">
              Pricing
            </a>
          </li> */}

          {/* Internal routes */}
          {/* <li role="none">
            <Link role="menuitem" to="/about">
              About
            </Link>
          </li> */}

          {isLoggedIn && (
            <li role="none">
              <Link role="menuitem" to="/admin/dashboard">
                Dash
              </Link>
            </li>
          )}
          {isLoggedIn && isPatient && (
            <li role="none">
              <Link role="menuitem" to="/resources">
                Resources
              </Link>
            </li>
          )}
          {isLoggedIn && (
            <li role="none">
              <Link role="menuitem" to="/doctor-calendar">
                Calendar
              </Link>
            </li>
          )}
          {isLoggedIn && (
            <li role="none">
              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
                aria-label="Log out"
              >
                Log Out
              </button>
            </li>
          )}

          {/* CTA pills as LINKS using your button classes */}

          <li role="none" className="navbar-ctas">
            <PillOne to="/">Order</PillOne>
            <PillTwo to="/contact">Contact</PillTwo>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
