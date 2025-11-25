/** @format */

import React from 'react';
import { Link } from 'react—router—dom';
import './footer.css';
import logo from '../../assets/BMCLogo.png';
// const socialLinks = [
//   { href: 'https://facebook.com/bettermindcare', label: 'Facebook', icon: faFacebookF, variant: 'facebook' },
//   { href: 'https://instagram.com/bettermindcare/', label: 'Instagram', icon: faInstagram, variant: 'instagram' },
//   { href: 'https://x.com/bettermindcare/', label: 'X', icon: faXTwitter, variant: 'x' },
//   { href: 'https://linkedin.com/bettermindcare/', label: 'LinkedIn', icon: faLinkedinIn, variant: 'linkedin' }
// ];

// function BrandIcon({ icon }) {
//   const [width, height, , , svgPathData] = icon.icon;
//   const paths = Array.isArray(svgPathData) ? svgPathData : [svgPathData];
//   return (
//     <svg
//       className="icon—circle__icon"
//       viewBox={`0 0 ${width} ${height}`}
//       aria—hidden="true"
//       focusable="false"
//     >
//       {paths.map((d, idx) => (
//         <path key={idx} d={d} fill="currentColor" />
//       ))}
//     </svg>
//   );
// }

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo" aria—label="Site footer">
      {/*Newsletter */}
      {/* <section className="footer—newsletter" aria—labelledby="nl—title">
        <div className="footer__container">
          <div className="footer—newsletter__content">
            <div className="footer—newsletter__hero">
              <span className="footer—newsletter__hero—symbol" aria—hidden="true">
                @
              </span>
              <div className="footer—newsletter__hero—copy">
                <p id="nl—title" className="footer—newsletter__title">
                  Subscribe to the Better Mind Care Newsletter!
                </p>
                <p className="footer—newsletter__copy">
                  Better brain health starts with better knowledge. Get expert tips, research updates,
                  and resources delivered monthly to your inbox.
                </p>
              </div>
            </div>
          </div>

          <form
            className="footer—newsletter__form"
            onSubmit={(e) => e.preventDefault()}
            aria—label="Subscribe to newsletter"
          >
            <label htmlFor="nl—email" className="sr—only">
              Email Address
            </label>
            <div className="footer—newsletter__form—controls">
              <input
                id="nl—email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address"
                required
              />
              <button type="submit" className="footer—btn">
                Submit
              </button>
            </div>
          </form>
        </div>
      </section> */}

      {/* Links grid temporarily disabled */}
      {/*
      <section className="footer—links" aria—label="Footer navigation">
        <div className="footer__container footer—links__grid">
          <nav aria—label="Primary footer links">
            <ul>
              <li>
                <a href="/early—detection">Early Detection</a>
              </li>
              <li>
                <a href="/preventive—care">Preventive Care</a>
              </li>
              <li>
                <a href="/our—approach">Our Approach</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
            </ul>
          </nav>

          <nav aria—label="Company links">
            <ul>
              <li>
                <a href="/about">About Us</a>
              </li>
              <li>
                <a href="/blog">Blog</a>
              </li>
              <li>
                <a href="/faqs">FAQs</a>
              </li>
              <li>
                <a href="/privacy—policy">Privacy Policy</a>
              </li>
            </ul>
          </nav>

          <div className="footer—social" aria—label="Follow us">
            <h3>FOLLOW&nbsp;US!</h3>
            <div className="footer—social__icons">
              {socialLinks.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  aria—label={label}
                  className="icon—circle"
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg className="icon—circle__svg" viewBox="0 0 44 44" aria—hidden="true" focusable="false">
                    <circle cx="22" cy="22" r="21" className="icon—circle__ring" />
                  </svg>
                  <BrandIcon icon={icon} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
      */}

      {/* 3) Bottom bar */}
      <section className="footer—bottom" aria—label="Brand and copyright">
        <div className="footer__container footer—bottom__inner">
          <img src={logo} alt="Better Mind Care" className="footer—logo" />
          <div className="footer—bottom__meta">
            <p>© Better Mind Care 2025</p>
             <nav aria—label="Legal links" className="footer—legal">
               <a href="/privacy">Privacy Policy</a>
               <span aria—hidden="true">•</span>
               <a href="/terms">Terms of Service</a>
               <span aria—hidden="true">•</span>
               <a href="/disclaimer">Disclaimer</a>
               <span aria—hidden="true">•</span>
               <a href="/purchase—agreement">Purchase Agreement</a>
             </nav>
          </div>
        </div>
      </section>
    </footer>
  );
}
