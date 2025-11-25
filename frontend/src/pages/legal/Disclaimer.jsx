import React from 'react';
import './legal-shared.css';
import './disclaimer.css';

const Disclaimer = () => (
  <main className="legal-page disclaimer-page">
    <header className="legal-hero">
      <h1>Disclaimer</h1>
      <p className="legal-updated">
        Last Updated and Effective: November 25, 2025
      </p>
      <p className="legal-summary">
        Better Mind Care (“BMC,” “we,” “us,” “our”) provides educational wellness Services designed to support general brain health, lifestyle optimization, and self-guided learning. BMC is not a medical provider and does not provide medical diagnosis, treatment, or prescriptions.
      </p>
      <address className="legal-address">
        <div>
          <strong>Entity:</strong> Neuro Logic, LLC d/b/a Better Mind Care
        </div>
        <div>
          <strong>Address:</strong> 4539 N 22nd St., Ste R, Phoenix, AZ 85016
        </div>
        <div>
          <strong>Email:</strong>{' '}
          <a href="mailto:support@bettermindcare.com">
            support@bettermindcare.com
          </a>
        </div>
      </address>
    </header>

    <div className="legal-content">
      <section id="not-medical-advice">
        <h2>1. Not Medical Advice</h2>
        <p>
          All content, tools, reports, data visualizations, ratios, educational materials, and communications provided by BMC — including those informed by lab results — are for informational and wellness-education purposes only.
        </p>
        <p>They do not constitute:</p>
        <ul>
          <li>medical advice</li>
          <li>clinical diagnosis</li>
          <li>disease screening or prevention</li>
          <li>health condition treatment</li>
          <li>therapeutic guidance</li>
          <li>interpretation of lab results for medical decision-making</li>
        </ul>
        <p>Always seek the guidance of a physician or licensed clinician for any medical-related questions or decisions.</p>
      </section>

      <section id="independent-physicians-labs">
        <h2>2. Independent Physicians & Labs</h2>
        <p>
          Lab testing made available through the BMC platform is ordered, reviewed, and overseen exclusively by independent, third-party clinicians and laboratories, not by BMC. These providers operate independently and are solely responsible for their clinical decisions.
        </p>
        <p>BMC does not supervise, employ, or control any medical professionals.</p>
      </section>

      <section id="no-doctor-patient-relationship">
        <h2>3. No Doctor–Patient Relationship</h2>
        <p>Use of the BMC platform does not create a doctor–patient relationship between you and BMC.</p>
        <p>
          Any interaction with independent clinicians through lab ordering networks (e.g., EPIN) is governed by those clinicians’ own professional standards and privacy practices.
        </p>
      </section>

      <section id="educational-interpretation-only">
        <h2>4. Educational Interpretation Only</h2>
        <p>
          Any insights BMC provides based on your lab data, lifestyle inputs, history, preferences, or account activity are non-medical educational interpretations.
        </p>
        <p>They are not intended to:</p>
        <ul>
          <li>diagnose medical conditions</li>
          <li>guide treatment decisions</li>
          <li>replace medical evaluation</li>
          <li>address medical emergencies</li>
        </ul>
        <p>If you have concerns about your lab results or symptoms, contact a qualified healthcare professional immediately.</p>
      </section>

      <section id="emergency-situations">
        <h2>5. Emergency Situations</h2>
        <p>Do not use BMC for medical emergencies.</p>
        <p>
          If you are experiencing symptoms such as confusion, chest pain, shortness of breath, sudden changes in behavior, suicidal thoughts, or any other urgent concern, call 911 or contact your local emergency services.
        </p>
      </section>

      <section id="consumer-responsibility">
        <h2>6. Consumer Responsibility</h2>
        <p>You are solely responsible for:</p>
        <ul>
          <li>how you use the educational content provided</li>
          <li>seeking professional care where appropriate</li>
          <li>not delaying or avoiding medical treatment due to BMC content</li>
          <li>verifying your own understanding with a licensed healthcare provider</li>
        </ul>
      </section>

      <section id="fda-status">
        <h2>7. FDA Status</h2>
        <p>
          BMC’s tools, content, and insights are designed for general wellness and behavioral education and are not intended to diagnose, treat, mitigate, or cure any disease.
        </p>
        <p>They have not been evaluated by the Food & Drug Administration (FDA).</p>
      </section>

      <section id="no-guarantees">
        <h2>8. No Guarantees</h2>
        <p>
          BMC does not guarantee any improvements in cognitive health, memory, mood, brain function, or any other medical or health outcomes.
        </p>
      </section>
    </div>
  </main>
);

export default Disclaimer;