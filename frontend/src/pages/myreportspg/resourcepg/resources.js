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
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <div className="faq-question">What happens after my intake?</div>
                <div className="faq-answer">We analyze your health data and generate a personalized report with recommendations.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Do I have to order labs?</div>
                <div className="faq-answer">Labs are optional but recommended. If triggered by your answers, they'll appear in your dashboard.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Is my data safe?</div>
                <div className="faq-answer">Yes — we're fully HIPAA compliant and encrypt all personal data.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Can I retake the cognition test?</div>
                <div className="faq-answer">Yes. Reach out to our support team or check your dashboard for test access.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">How do I access my Brain Health Report?</div>
                <div className="faq-answer">After your intake and lab results are reviewed, your personalized report will appear in the Reports & Labs section. You'll be able to read it online or download a PDF.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Will I be notified when new information is added to my dashboard?</div>
                <div className="faq-answer">Yes. If a new report or direct message is posted, you'll receive a simple email letting you know something is waiting for you in your dashboard.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Where can I see my upcoming appointments?</div>
                <div className="faq-answer">Your intake and lab appointments appear in the Appointments section. Past appointments will be shown in gray.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">I'm a caregiver. Can I manage a family member's account here?</div>
                <div className="faq-answer">Yes. Many people use the dashboard to help a loved one stay organized. You'll find patient-specific fields under Account Settings.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">When will my lab results be ready?</div>
                <div className="faq-answer">Lab results typically appear within 3–10 business days depending on the tests ordered. As soon as they're processed, they will automatically show up in Reports & Labs.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">What should I do if something in my report doesn't make sense?</div>
                <div className="faq-answer">Each section includes clear explanations, definitions, and clinician-written guidance. If you need more clarity, reach out through Support and we'll point you in the right direction.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">How do I update my email, phone number, or communication preferences?</div>
                <div className="faq-answer">Go to Account Settings. All of your personal and communication information can be updated there.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">How do I reschedule an appointment?</div>
                <div className="faq-answer">At this time, appointment changes are handled through our support team. You'll find instructions in the Appointments section.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">How do I download my lab PDFs?</div>
                <div className="faq-answer">Lab PDFs appear in your Reports & Labs list. Click any lab item to download it directly.</div>
              </div>
              <div className="faq-item">
                <div className="faq-question">What happens to my data if I cancel my account?</div>
                <div className="faq-answer">We permanently delete your information from our system. You'll be logged out automatically once the process is complete.</div>
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
