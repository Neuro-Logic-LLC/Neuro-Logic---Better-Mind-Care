/** @format */

import React from 'react';

function ArticleHero({ title, author, updatedAt }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section className="article-hero">
      <h1>{title}</h1>
      <div className="article-meta">
        <span className="article-author">By {author}</span>
        <span className="article-date">Updated {formatDate(updatedAt)}</span>
      </div>
      <hr className="article-divider" />
    </section>
  );
}

export default ArticleHero;