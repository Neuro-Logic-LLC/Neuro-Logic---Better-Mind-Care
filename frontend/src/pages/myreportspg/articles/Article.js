import React from 'react';
import { useParams } from 'react-router-dom';

function Article() {
  const { slug } = useParams();

  return (
    <div>
      <h1>Article: {slug}</h1>
      <p>Article content goes here.</p>
    </div>
  );
}

export default Article;