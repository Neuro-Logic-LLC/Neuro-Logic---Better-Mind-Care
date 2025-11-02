/** @format */

import React from 'react';
import './resources.css';

function Resources() {
  return (
    <div className="resources-page">
      <h1>Care & Brain Health Resources</h1>
      <p>
        This page offers research-backed information, prevention tips, and
        answers to common questions. Everything here reflects the same logic and
        values that guide our Patient Reports.
      </p>

      <section className="resource-section">
        <h2>Understanding Your Report</h2>
        <ul>
          <li>
            <strong>Homocysteine:</strong> Keep levels below 10 μmol/L. Lower is
            often better. High levels can indicate inflammation and cognitive
            risk.
          </li>
          <li>
            <strong>Vitamin B12:</strong> Target: 500–1500 pg/mL. Needed for
            memory, cognition, and energy.
          </li>
          <li>
            <strong>CRP (Inflammation):</strong> Goal: Below 0.9 mg/dL. Use
            diet, sleep, and omega-3s to reduce.
          </li>
          <li>
            <strong>ApoB:</strong> Goal: Below 100 mg/dL. A more specific
            predictor of heart and brain risk than LDL.
          </li>
        </ul>
      </section>

      <section className="resource-section">
        <h2>Wellness & Prevention Tips</h2>
        <ul>
          <li>
            ✅ Eat anti-inflammatory foods like leafy greens, berries, olive
            oil, and fatty fish
          </li>
          <li>
            ✅ Get 7–9 hours of sleep — poor sleep accelerates memory loss
          </li>
          <li>✅ Consider vitamin D and B-complex if levels are low</li>
          <li>
            ✅ Move your body: even walking helps circulation and brain
            plasticity
          </li>
        </ul>
      </section>

      <section className="resource-section">
        <h2>Frequently Asked Questions</h2>
        <ul>
          <li>
            <strong>What happens after my intake?</strong> We analyze your
            health data and generate a personalized report with recommendations.
          </li>
          <li>
            <strong>Do I have to order labs?</strong> Labs are optional but
            recommended. If triggered by your answers, they’ll appear in your
            dashboard.
          </li>
          <li>
            <strong>Is my data safe?</strong> Yes — we’re fully HIPAA compliant
            and encrypt all personal data.
          </li>
          <li>
            <strong>Can I retake the cognition test?</strong> Yes. Reach out to
            our support team or check your dashboard for test access.
          </li>
        </ul>
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
  );
}

export default Resources;
