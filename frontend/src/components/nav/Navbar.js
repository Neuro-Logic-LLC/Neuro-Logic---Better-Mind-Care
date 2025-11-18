/** @format */

import './navbar.css';
import '../../App.css';
import logo from '../../assets/BMCLogo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useState } from 'react';

function Navbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const isLoggedIn = !!user;
  console.log('Navbar user:', user);
  const role = (isLoggedIn ? user?.role : '') || '';
  const isPatient = role.toLowerCase() === 'patient';

  const [menuOpen, setMenuOpen] = useState(false);

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
        onClick={() => setMenuOpen(false)}
      >
        <img src={logo} alt="Better Mind Care logo" className="logo" />
      </Link>

      {/* Hamburger menu button for mobile */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* RIGHT SIDE: auth row on top, menu below */}
      <div
        className={`navbar-right-wrap ${menuOpen ? 'open' : ''}`}
      >
        {/* AUTH ROW (always shown, one row above menu) */}
        <div className="navbar-auth-row" aria-label="Authentication">
          {!isLoggedIn && (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <span className="navbar-auth__divider" aria-hidden="true">
                |
              </span>
              <Link to="/sign-up" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
        {/* MENU - App pages */}
        <ul className="navbar-right" role="menubar" aria-label="Primary">
          {isLoggedIn && (
            <>
              <li role="none">
                <Link role="menuitem" to="/account" onClick={() => setMenuOpen(false)}>
                  Account
                </Link>
              </li>
              <li role="none">
                <Link role="menuitem" to="/support" onClick={() => setMenuOpen(false)}>
                  Support / Help
                </Link>
              </li>
              <li role="none">
                <Link role="menuitem" to="/messages" onClick={() => setMenuOpen(false)}>
                  Messages
                </Link>
              </li>
              <li role="none">
                <Link role="menuitem" to="/resources" onClick={() => setMenuOpen(false)}>
                  Resources
                </Link>
              </li>
              <li role="none">
                <Link role="menuitem" to="/appointments" onClick={() => setMenuOpen(false)}>
                  Appointments
                </Link>
              </li>
              <li role="none">
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  aria-label="Log out"
                >
                  Log Out
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
