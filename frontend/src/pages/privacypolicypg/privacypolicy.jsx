/** @format */

import React from "react";
import "../legal/legal-shared.css";
import "./privacypolicy.css";

const PrivacyPolicy = () => (
  <main className="legal-page privacy-page">
    <header className="legal-hero">
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last Updated and Effective: October 12, 2025</p>
      <p className="legal-summary">
        This Privacy Policy explains how Better Mind Care (“BMC,” “we,” “us”) collects, uses, shares, stores, and protects information when you use our websites, applications, platforms, content, and services (collectively, the “Services”).
      </p>
      <address className="legal-address">
        <div><strong>Entity:</strong> Neuro Logic, LLC d/b/a Better Mind Care</div>
        <div><strong>Address:</strong> 4539 N 22nd St., Ste R, Phoenix, AZ 85016</div>
        <div>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a>
        </div>
      </address>
    </header>

    <div className="legal-content">
      {/* Google Reviewers Notice */}
      <section id="google-reviewers" className="legal-callout">
        <h2>Important Notice for Google Reviewers (Calendar Integration)</h2>
        <p>
          This app’s use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
        </p>
        <p>
          Specifically, if you connect Google Calendar, we access only the minimum event metadata you authorize to deliver scheduling features. We do not use Google data for advertising or unrelated purposes, do not sell Google data, and delete or de-identify Google data when it’s no longer needed to provide the requested feature or when you disconnect.
        </p>
      </section>

      <section id="who-we-are">
        <h2>1) Who We Are and What This Policy Covers</h2>
        <p>
          This Privacy Policy explains how Better Mind Care (“BMC,” “we,” “us”) collects, uses, shares, stores, and protects information when you use our websites, applications, platforms, content, and services (collectively, the “Services”). Capitalized terms used but not defined here have the meanings in our Terms of Service.
          By using the Services, you agree to this Privacy Policy. If you do not agree, please do not use the Services.
        </p>
      </section>

      <section id="information-we-collect">
        <h2>2) Information We Collect</h2>
        <p>The information we collect depends on how you interact with the Services.</p>
        <h3>A. Information You Provide</h3>
        <ul>
          <li>Identification &amp; contact: name, email, phone, mailing address.</li>
          <li>Account &amp; payment details (processed via third-party processors).</li>
          <li>
            Health-related data you voluntarily share to personalize reports (e.g., health history, lifestyle information, lab results or documents you upload).
          </li>
        </ul>
        <h3>B. Information Collected Automatically</h3>
        <ul>
          <li>Device and usage data: IP address, device IDs, browser type, pages visited, timestamps.</li>
          <li>Cookies, pixels, and similar technologies (see Section 7).</li>
        </ul>
        <h3>C. Information From Third Parties</h3>
        <ul>
          <li>Service partners (e.g., scheduling, analytics, email/SMS delivery).</li>
          <li>
            If you connect Google Calendar, we may receive limited event metadata you authorize (e.g., event time, availability, calendar ID). We do not access or store event body/description unless you explicitly grant permission.
          </li>
        </ul>
        <h3>D. Inferences</h3>
        <p>We may derive preferences or general location (city/state) from your IP address or usage to improve the Services.</p>
      </section>

      <section id="how-we-use-info">
        <h2>3) How We Use Information</h2>
        <ul>
          <li>Provide, secure, personalize, and improve the Services.</li>
          <li>Deliver features you request (e.g., scheduling, report generation).</li>
          <li>Process transactions and manage accounts.</li>
          <li>Communicate about updates, security notices, and support.</li>
          <li>Perform analytics, testing, research, and product development.</li>
          <li>Comply with law and enforce our Terms.</li>
        </ul>
        <p><strong>Google data (Calendar):</strong> used only to provide the connected feature you requested, not for ads or unrelated profiling.</p>
        <p>
          We only use Google user data to provide or improve the specific features the user requested (e.g., event syncing via Google Calendar). We do not use or transfer Google user data for serving ads or for any other purposes not related to the app’s functionality.
        </p>
      </section>

      <section id="sharing">
        <h2>4) How We Share Information</h2>
        <p>We do not sell your personal information. We may share information:</p>
        <ul>
          <li>
            Service providers under contract (e.g., hosting, analytics, email/SMS, payment processing) bound by confidentiality and data-protection obligations.
          </li>
          <li>
            Clinical/diagnostic partners only if you elect features that require such sharing (e.g., physician-authorized testing).
          </li>
          <li>Legal/disclosure: to comply with law, enforce our Terms, protect rights, safety, and security.</li>
          <li>
            Business transfers: in a merger, acquisition, financing, or asset sale (your information will remain protected or you’ll be notified of changes).
          </li>
        </ul>
        <p>We may share aggregated or de-identified information without restriction where permitted by law.</p>
      </section>

      <section id="choices-rights">
        <h2>5) Your Choices &amp; Rights</h2>
        <ul>
          <li>
            <strong>Access/Correction/Deletion/Portability:</strong> Email{" "}
            <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a> to request. We’ll verify and respond per applicable law.
          </li>
          <li>
            <strong>Marketing Opt-Out:</strong> Use unsubscribe links or email{" "}
            <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a>.
          </li>
          <li>
            <strong>Cookies:</strong> Manage in your browser/device settings (may affect functionality).
          </li>
          <li>
            <strong>Google Revocation:</strong> You can disconnect Google access in your Google Account’s permissions page at any time. Upon disconnection or verified deletion request, we delete Google-sourced data we control unless retention is legally required.
          </li>
          <li>
            <strong>State Privacy Rights (e.g., CA, CO, CT, VA, etc.):</strong> You may have additional rights (to know, correct, delete, opt-out of targeted advertising/sale, limit use of sensitive data, non-discrimination). Submit requests to{" "}
            <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a> with the subject line “Privacy Rights Request.”
          </li>
        </ul>
        <p>
          Users can revoke this access at any time from their Google Account permissions page, and upon revocation, all Google Calendar data in our systems is deleted or de-identified within 60 days.
        </p>
      </section>

      <section id="sensitive-health">
        <h2>6) Sensitive &amp; Health Information</h2>
        <p>
          BMC is not a healthcare provider and may not be directly subject to HIPAA. If independent clinical providers or labs (chosen by you) are involved, they may be subject to HIPAA and will handle your information under their own notices of privacy practices. When such providers share data with us to facilitate services you request, we use and disclose it only as permitted by applicable law and this Policy.
        </p>
      </section>

      <section id="cookies">
        <h2>7) Cookies and Similar Technologies</h2>
        <p>
          We use cookies, pixels, mobile IDs, and server logs to remember preferences, sign-in, measure performance, reduce fraud, and improve the Services. You can control cookies in your browser; blocking some cookies may limit functionality. We currently do not respond to “Do Not Track” signals.
        </p>
      </section>

      <section id="ai">
        <h2>8) AI-Assisted Features</h2>
        <p>
          We may use AI technologies to power non-medical features (e.g., support, summarization). We test for fairness and accuracy and use human oversight for decisions with legal or similarly significant effects. We do not use AI features to provide medical diagnosis or treatment.
        </p>
      </section>

      <section id="sms">
        <h2>9) SMS/Text Messaging</h2>
        <p>
          By opting in, you consent to receive SMS related to your account, services, and notifications. Message/data rates may apply. Frequency varies. Reply STOP to opt out; HELP for help.
        </p>
      </section>

      <section id="security">
        <h2>10) Data Security</h2>
        <p>
          We implement administrative, technical, and physical safeguards appropriate to the sensitivity of data we process. No method of transmission or storage is 100% secure. If we suspect a security incident, we will investigate, mitigate where within our control, and notify you when required by law.
        </p>
        <p>
          All Google user data is stored and transmitted securely using industry-standard encryption and is never shared with third parties except as necessary to provide the requested feature.
        </p>
      </section>

      <section id="retention">
        <h2>11) Data Retention &amp; Deletion</h2>
        <p>
          We retain personal information only as long as needed for the purposes in this Policy, to provide the Services, for legitimate business needs (e.g., security, fraud prevention), and to comply with legal obligations. When no longer needed, we delete or de-identify it per our retention schedule.
        </p>
        <p>
          <strong>Google data:</strong> retained only as necessary to provide the feature you enabled or as required by law; deleted or de-identified upon disconnection or verified deletion request, subject to legal holds.
        </p>
      </section>

      <section id="children">
        <h2>12) Children’s Privacy</h2>
        <p>
          The Services are not for individuals under 18. We do not knowingly collect personal information from minors. If you believe we have, contact{" "}
          <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a> and we will delete it.
        </p>
      </section>

      <section id="international">
        <h2>13) International Users</h2>
        <p>
          We operate in the United States. Your information may be transferred to and processed in the U.S. and other countries with different data-protection laws than your country of residence.
        </p>
      </section>

      <section id="links">
        <h2>14) Links to Third-Party Services</h2>
        <p>
          Our Services may link to third-party sites or services. Their privacy practices are governed by their own policies, not this Policy. If you receive services from independent clinical providers, their privacy notices apply to those services.
        </p>
      </section>

      <section id="changes">
        <h2>15) Changes to this Privacy Policy</h2>
        <p>
          We may update this Privacy Policy prospectively. We will post the new “Last Updated” date at your canonical privacy URL and, for material changes (e.g., categories of data, purposes, sharing, retention), provide reasonable advance notice and, where required by law, request renewed consent. For Google-sourced data, our Google API Services—Limited Use commitments will continue to apply.
        </p>
      </section>

      <section id="contact">
        <h2>16) Contact Us</h2>
        <address className="legal-contact-list">
          <div><strong>Neuro Logic, LLC d/b/a Better Mind Care</strong></div>
          <div>4539 N 22nd St., Ste R, Phoenix, AZ 85016</div>
          <div>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a>
          </div>
        </address>
      </section>

      <section id="google-appendix" className="legal-appendix">
        <h2>Appendix: Required Google API Services Language (for easy reviewer reference)</h2>
        <ul>
          <li>
            <strong>Limited Use:</strong> Our app’s use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
          </li>
          <li>
            <strong>Purpose Limitation:</strong> Google user data is used solely to provide user-requested features (e.g., scheduling).
          </li>
          <li>
            <strong>No Advertising:</strong> We do not use or transfer Google user data for advertising or marketing.
          </li>
          <li>
            <strong>Retention &amp; Deletion:</strong> We retain Google user data only as long as needed to provide the requested feature; we delete/de-identify when you disconnect or upon verified deletion request, unless retention is legally required.
          </li>
          <li>
            <strong>Sharing:</strong> No disclosure to third parties except to service providers under confidentiality to deliver the feature or where required by law.
          </li>
        </ul>
      </section>
    </div>
  </main>
);

export default PrivacyPolicy;
