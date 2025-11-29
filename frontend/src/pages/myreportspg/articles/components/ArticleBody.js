/** @format */

import React, { useEffect, useRef } from 'react';

function ArticleBody({ sections, onSectionVisible }) {
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            const heading = sectionId
              .replace('section-', '')
              .replace(/-/g, ' ');
            // Convert back to title case
            const titleCaseHeading = heading.replace(/\b\w/g, (l) =>
              l.toUpperCase()
            );
            onSectionVisible(titleCaseHeading);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [sections, onSectionVisible]);

  return (
    <main className="article-body">
      {sections.map((section, index) => {
        const sectionId = `section-${section.heading.toLowerCase().replace(/\s+/g, '-')}`;
        return (
          <section
            key={index}
            id={sectionId}
            ref={(el) => (sectionRefs.current[index] = el)}
            className="article-section"
          >
            <h2>{section.heading}</h2>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </section>
        );
      })}
    </main>
  );
}

export default ArticleBody;
