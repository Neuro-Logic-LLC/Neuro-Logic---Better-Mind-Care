/** @format */

import React from 'react';
import CircleCheckIcon from '../../../assets/icons/CircleCheckIcon.png';
import './resources.css';

function Resources() {
  return (
    <div className="resources-page">
      <section className="resources-hero">
        <h1>Care & Brain Health Resources</h1>
        <p>
          This page offers research-backed information, prevention tips, and
          answers to common questions. Everything here reflects the same logic and
          values that guide our Patient Reports.
        </p>
      </section>

      <section className="resources-content">
        <div className="resources-container">
          <section className="resource-section">
            <h2>Wellness & Prevention Tips</h2>
            <div className="tips-list">
              <div className="tip-item">
                <img src={CircleCheckIcon} alt="Check" className="tip-icon" />
                <span>Eat anti-inflammatory foods like leafy greens, berries, olive oil, and fatty fish</span>
              </div>
              <div className="tip-item">
                <img src={CircleCheckIcon} alt="Check" className="tip-icon" />
                <span>Get 7–9 hours of sleep — poor sleep accelerates memory loss</span>
              </div>
              <div className="tip-item">
                <img src={CircleCheckIcon} alt="Check" className="tip-icon" />
                <span>Consider vitamin D and B-complex if levels are low</span>
              </div>
              <div className="tip-item">
                <img src={CircleCheckIcon} alt="Check" className="tip-icon" />
                <span>Move your body: even walking helps circulation and brain plasticity</span>
              </div>
            </div>
          </section>

          <section className="resource-section">
            <h2>Learn More</h2>
            <div className="articles-list">
              <div className="article-link">
                <h3><a href="/resources/articles/understanding-your-report">Understanding Your Report</a></h3>
                <p>Learn how to interpret your personalized brain health assessment and what the results mean.</p>
              </div>
              <div className="article-link">
                <h3><a href="/resources/articles/early-cognitive-changes">Early Cognitive Changes</a></h3>
                <p>Understanding the early signs of cognitive changes and their potential significance.</p>
              </div>
              <div className="article-link">
                <h3><a href="/resources/articles/lifestyle-resilience">Lifestyle Resilience</a></h3>
                <p>How daily habits and lifestyle factors contribute to long-term brain health.</p>
              </div>
              <div className="article-link">
                <h3><a href="/resources/articles/sleep-cognitive-clarity">Sleep & Cognitive Clarity</a></h3>
                <p>The critical role of quality sleep in maintaining cognitive function.</p>
              </div>
              <div className="article-link">
                <h3><a href="/resources/articles/labs-and-brain-health">Labs and Brain Health</a></h3>
                <p>How laboratory tests provide insights into brain health markers.</p>
              </div>
            </div>
          </section>

          <section className="resource-section">
            <h2>Support & Contact</h2>
            <p>
              Email us at{' '}
              <a href="mailto:support@BetterMindCare.com">
                support@BetterMindCare.com
              </a>
            </p>
            <p>
              Or visit the <a href="/contact">Contact Page</a> to schedule a call.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}

export default Resources;
