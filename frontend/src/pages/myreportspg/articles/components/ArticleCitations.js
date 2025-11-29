/** @format */

import React from 'react';

function ArticleCitations({ citations }) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <section className="article-citations">
      <h3>References</h3>
      <ol>
        {citations.map((citation, index) => (
          <li key={index}>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${citation.label} (opens in new tab)`}
            >
              {citation.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ArticleCitations;
