/** @format */

import React, { useState } from 'react';

function ArticleTOC({ sections, activeSection, onSectionClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (heading) => {
    const element = document.getElementById(`section-${heading.toLowerCase().replace(/\s+/g, '-')}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onSectionClick(heading);
    }
    setIsOpen(false); // Close mobile menu after click
  };

  const toggleTOC = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile TOC Toggle */}
      <button
        className="toc-toggle"
        onClick={toggleTOC}
        aria-expanded={isOpen}
        aria-label="Table of Contents"
      >
        Table of Contents
        <span className={`toc-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {/* TOC Content */}
      <nav
        className={`article-toc ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Article sections"
      >
        <ul>
          {sections.map((section, index) => {
            const sectionId = section.heading.toLowerCase().replace(/\s+/g, '-');
            return (
              <li key={index}>
                <button
                  className={`toc-link ${activeSection === section.heading ? 'active' : ''}`}
                  onClick={() => scrollToSection(section.heading)}
                  aria-current={activeSection === section.heading ? 'true' : 'false'}
                >
                  {section.heading}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export default ArticleTOC;