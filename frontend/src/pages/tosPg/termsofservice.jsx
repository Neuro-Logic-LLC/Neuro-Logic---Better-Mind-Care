/** @format */

import React from "react";
import { Link } from "react-router-dom";
import "../legal/legal-shared.css";
import "./termsofservice.css";

const TermsOfService = () => (
  <main className="legal-page terms-page">
    <header className="legal-hero">
      <h1>Terms of Service — Better Mind Care</h1>
      <p className="legal-updated">Last Updated: October 2025</p>
      <p className="legal-summary">
        By accessing or using Better Mind Care’s website, software, reports, assessments, or related services (the “Services”), you agree to these Terms and our{" "}
        <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Services.
      </p>
      <address className="legal-address">
        <div><strong>Operated by:</strong> Neuro Logic, LLC d/b/a Better Mind Care</div>
        <div><strong>Address:</strong> 4539 N 22nd St., Ste R, Phoenix, AZ 85016</div>
        <div><strong>Email:</strong> <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a></div>
      </address>
    </header>

    <div className="legal-content">
      {/* Summary of Key Terms */}
      <section id="summary" className="legal-callout">
        <h2>Summary of Key Terms (for convenience only)</h2>
        <p>
          This summary highlights important points from the Better Mind Care Terms of Service. It is for convenience only and does not replace the full agreement below. Please read the full Terms of Service for complete details.
        </p>
        <div className="legal-summary-table" role="table" aria-label="Summary of Key Terms">
          <div role="rowgroup">
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Who We Are</div>
              <div role="cell" className="legal-summary-value">
                Better Mind Care (Neuro Logic, LLC) provides educational brain-health tools and technology that may connect you to independent lab services. We are not a healthcare provider.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">License &amp; Access</div>
              <div role="cell" className="legal-summary-value">
                You receive a 12-month, non-transferable license to use our platform and content for personal educational purposes only.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Refunds</div>
              <div role="cell" className="legal-summary-value">
                Refunds may be available only before lab requisitions are submitted or home test kits are shipped. Once processing begins, all purchases are non-refundable.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Privacy</div>
              <div role="cell" className="legal-summary-value">
                Your data is handled according to our <Link to="/privacy">Privacy Policy</Link>.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Google API Data (if applicable)</div>
              <div role="cell" className="legal-summary-value">
                Any Google user data accessed through APIs is used only to provide requested features, never for ads, and deleted when you disconnect or request deletion.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Limitation of Liability</div>
              <div role="cell" className="legal-summary-value">
                Our total liability is limited to the net fees you paid (excluding lab and processing fees).
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Medical Disclaimer</div>
              <div role="cell" className="legal-summary-value">
                Our services and reports are educational only and not a substitute for medical advice. Always consult your physician.
              </div>
            </div>
            <div role="row" className="legal-summary-row">
              <div role="cell" className="legal-summary-key">Jurisdiction</div>
              <div role="cell" className="legal-summary-value">
                These Terms are governed by Arizona law; disputes are resolved in Maricopa County, AZ.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1) Acceptance of Terms */}
      <section id="acceptance">
        <h2>1) Acceptance of Terms</h2>
        <p>
          By accessing or using Better Mind Care’s website, software, reports, assessments, or related services (the “Services”), you agree to be bound by these Terms of Service (the “Terms”) and our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Services.
        </p>
      </section>

      {/* 2) Who We Are */}
      <section id="who-we-are">
        <h2>2) Who We Are (Non-Clinical Platform)</h2>
        <p>
          Better Mind Care (“Company,” “we,” “us”) is operated by Neuro Logic, LLC. We provide educational brain-health content and technology that may facilitate physician-authorized lab testing through independent third-party providers. We are not a healthcare provider, do not practice medicine, and do not control the professional judgment or services of any independent physicians, laboratories, or other third parties.
        </p>
      </section>

      {/* 3) Key Definitions */}
      <section id="definitions">
        <h2>3) Key Definitions</h2>
        <ul>
          <li><strong>Product:</strong> The consumer-facing brain-health program offered at purchase, including digital content, tools, and assessments.</li>
          <li><strong>Platform:</strong> Our website, software, APIs, dashboards, reports, models, algorithms, workflows, and related materials.</li>
          <li><strong>Content:</strong> Proprietary reports, scoring tools, educational materials, and associated workflows.</li>
          <li><strong>Authorized Use:</strong> Individual, personal, non-commercial use by the purchasing customer.</li>
          <li><strong>Proprietary Materials:</strong> All Platform source code, models, algorithms, decision logic, scoring methodologies, workflows, templates, datasets, and designs.</li>
          <li><strong>Unauthorized Use:</strong> Any use not expressly permitted by these Terms, including copying, scraping, reverse engineering, competitive analysis, or training AI/LLMs on our outputs.</li>
        </ul>
      </section>

      {/* 4) Eligibility; Accounts */}
      <section id="eligibility">
        <h2>4) Eligibility; Accounts</h2>
        <p>
          You must be 18+ and able to form a binding contract. You’re responsible for safeguarding your login credentials and all activity under your account.
        </p>
      </section>

      {/* 5) Purchase Terms; Access Window */}
      <section id="purchase-terms">
        <h2>5) Purchase Terms; Access Window</h2>
        <p>
          You agree to pay the price shown at checkout for the Product. Optional upgrades or add-ons may be available for separate purchase. Unless otherwise specified, Product access is granted for twelve (12) months from the purchase date. Continued access beyond this period requires a new license, upgrade, or renewal. We may change pricing for future upgrades/renewals in our discretion.
        </p>
      </section>

      {/* 6) Refund Policy */}
      <section id="refunds">
        <h2>6) Refund Policy (kept as requested)</h2>
        <p>
          Due to the nature of our Product— which may include physician-authorized lab orders, third-party requisitions, and digital content delivery— all purchases are non-refundable once a lab requisition has been generated, a home test kit has shipped, services have begun, or content has been accessed.
        </p>
        <h3>We may honor refund requests only under these limited conditions:</h3>
        <ul>
          <li>
            <strong>Cancellation Before Lab Requisition or Kit Shipment:</strong> If you cancel in writing within seventy-two (72) hours of purchase, and before any lab requisition has been generated or any home test kit has been shipped, we may issue a full refund, less administrative or payment-processing fees.
          </li>
          <li>
            <strong>Cancellation After Requisition but Before Collection/Testing:</strong> If a requisition has been generated but the specimen has not been collected or submitted, we may issue a partial refund or account credit at our discretion, provided no lab or physician services have been performed.
          </li>
          <li>
            <strong>Home Testing Kits:</strong> Once a kit has shipped, refunds are not guaranteed. Eligibility depends on the kit’s return status and whether the associated requisition has been activated. Returned or unused kits may incur restocking, physician authorization, or administrative fees. No refunds for lost, expired, or improperly handled kits.
          </li>
          <li>
            <strong>Ineligibility or Access Barriers:</strong> If you are ineligible for testing (e.g., due to state restrictions) or cannot reasonably access lab services, we may issue a partial refund/credit at our discretion, provided no services have been rendered and no kits have shipped.
          </li>
          <li>
            <strong>Failure to Complete Services:</strong> If you fail to complete lab services or required intake within 30 days of purchase and no lab/physician services have been performed, we may cancel and issue a partial refund/credit at our discretion.
          </li>
          <li>
            <strong>Non-Refundable Costs:</strong> Lab processing, shipping, physician review, and third-party administrative fees are non-refundable once incurred. Once a requisition has been generated, test kits shipped, or lab processing begun, no refund will be issued.
          </li>
        </ul>
        <p>
          <strong>How to Request:</strong> Email <a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a> within 30 days of purchase. Approved refunds are issued to the original payment method within 7–10 business days of approval.
        </p>
      </section>

      {/* 7) Limited License */}
      <section id="license">
        <h2>7) Limited License</h2>
        <p>
          Upon purchase, we grant you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Product, Platform, and Content solely for personal, individual educational use, subject to these Terms and our documentation. This license does not transfer ownership or IP rights and terminates automatically upon expiration or breach.
        </p>
        <p>
          If you provide ideas or feedback, you grant us a perpetual, royalty-free license to use them for any purpose.
        </p>
      </section>

      {/* 8) Use Restrictions */}
      <section id="restrictions">
        <h2>8) Use Restrictions (No Scraping/Reverse Engineering/Competitive Use)</h2>
        <p>You will not, and will not permit any third party to:</p>
        <ul>
          <li>Copy, reproduce, distribute, sublicense, sell, transfer, or share the Platform, Content, reports, or Proprietary Materials.</li>
          <li>Decompile, disassemble, reverse engineer, or attempt to derive source code, models, algorithms, decision logic, or scoring methodologies.</li>
          <li>Use bots, crawlers, scrapers, headless browsers, or any method to evade access controls or extract data.</li>
          <li>Benchmark, publish, or reproduce internal reports/methodologies/templates without our written consent.</li>
          <li>Train, fine-tune, or evaluate AI/LLMs on our Platform, data, or outputs.</li>
          <li>Use the Platform to build a competing product or for competitive intelligence without our written consent.</li>
          <li>Introduce malware, disrupt performance, or violate law.</li>
          <li>Share access with third parties (including contractors/affiliates) without our written consent.</li>
        </ul>
        <p>
          Access is limited to paid, authorized accounts. We may monitor usage and audit logs to verify compliance. We may suspend/terminate access in good-faith if we suspect breach or Unauthorized Use.
        </p>
      </section>

      {/* 9) Confidentiality & IP; Remedies */}
      <section id="confidentiality">
        <h2>9) Confidentiality &amp; Intellectual Property; Remedies</h2>
        <p>
          All Platform software, models, algorithms, workflows, datasets, documentation, designs, and generated reports are confidential trade secrets and exclusive IP of the Company (or licensors). You will maintain strict confidentiality, use them only as permitted, and not create derivative or competitive works.
        </p>
        <p>
          <strong>Injunctive Relief &amp; Liquidated Damages.</strong> Breach (e.g., reverse engineering, scraping, unauthorized copying/access) causes irreparable harm. We may seek temporary, preliminary, and permanent injunctions and specific performance, plus damages.
        </p>
        <p>Where legally enforceable, the following liquidated damages apply (not a penalty; actual damages need not be proven):</p>
        <ul>
          <li>$25,000 per report or data export copied/shared outside Authorized Use;</li>
          <li>$50,000 per model/algorithm/workflow/scoring methodology copied/derived/used to build a competing feature or service;</li>
          <li>$100,000 per automated scraping/bot/crawler detected plus $1,000/day while it continues after written notice;</li>
          <li>$10,000 per unauthorized account, identity, or device involved.</li>
        </ul>
        <p>
          Per-day amounts accrue from detection until cessation and verified remediation. Payment does not limit our right to seek additional/equitable relief, disgorgement, or actual/exemplary damages and attorneys’ fees where permitted. The prevailing party in enforcing Sections 7–9 is entitled to reasonable attorneys’ fees, expert/forensic costs, and costs of suit.
        </p>
      </section>

      {/* 10) Competitor Access Prohibited */}
      <section id="competitor-access">
        <h2>10) Competitor Access Prohibited</h2>
        <p>
          You represent that you are not a competitor and are not acting for one. Competitors and their agents may not purchase, access, or use the Platform without our written consent. Purchases or access obtained in violation of this section are void and may be canceled, with amounts paid forfeited to cover investigation/enforcement.
        </p>
      </section>

      {/* 11) Data Use & Privacy */}
      <section id="privacy">
        <h2>11) Data Use &amp; Privacy</h2>
        <p>
          Our <Link to="/privacy">Privacy Policy</Link> explains how we collect, use, share, retain, and delete data, and your rights. By using the Services, you consent to the Privacy Policy.
        </p>
        <p>
          <strong>Google API Services (If Applicable).</strong> If you connect Google services (e.g., Calendar), our use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy (Limited Use). We use Google user data only to provide user-requested features, do not use/transfer it for ads, retain it only as needed, and delete/de-identify upon disconnect or verified deletion request (unless we must retain by law).
        </p>
      </section>

      {/* 12) Medical Disclaimer */}
      <section id="medical-disclaimer">
        <h2>12) Medical Disclaimer (Educational Use Only)</h2>
        <p>
          The Services, reports, scores, and recommendations are informational/educational and not medical advice, diagnosis, or treatment. Use does not create a physician–patient relationship with us. Any clinical services (including lab ordering/review) are provided solely by independent third-party physicians/labs, who are responsible for their services and compliance.
        </p>
        <p><strong>Emergency:</strong> If you have a medical emergency or serious symptoms, call 911 or go to the nearest ER.</p>
      </section>

      {/* 13) CPOM */}
      <section id="cpom">
        <h2>13) CPOM Compliance</h2>
        <p>
          All clinical services, including lab test ordering and review, are performed by independent physicians unaffiliated with us. We do not engage in the corporate practice of medicine or interfere with physician judgment.
        </p>
      </section>

      {/* 14) Insurance / HSA/FSA */}
      <section id="insurance">
        <h2>14) Insurance, Medicare, HSA/FSA</h2>
        <p>
          We do not bill insurance or submit claims. We make no guarantees regarding insurance or Medicare coverage. HSA/FSA eligibility varies; we do not guarantee reimbursement and are not responsible for claim submission/decisions.
        </p>
      </section>

      {/* 15) Labs & Home Kits */}
      <section id="labs">
        <h2>15) Lab Testing; Home Kits</h2>
        <p>
          Unless otherwise specified, lab testing is performed at LabCorp or other independent labs. You are responsible for scheduling/rescheduling and attendance; missed/no-show fees may apply per lab policy.
        </p>
        <p>
          <strong>Home testing kits:</strong> you are responsible for timely receipt, proper storage/collection, and shipment. Samples submitted late or unusable may be rejected; a replacement kit may be at your expense. Refund eligibility is governed by Section 6 (Refund Policy).
        </p>
      </section>

      {/* 16) Disclaimers */}
      <section id="disclaimers">
        <h2>16) Disclaimers</h2>
        <p>
          The Services are provided “AS IS” and “AS AVAILABLE.” We disclaim all warranties (express, implied, statutory), including merchantability, fitness for a particular purpose, accuracy/completeness, non-infringement, and uninterrupted/secure operation.
        </p>
      </section>

      {/* 17) Limitation of Liability */}
      <section id="limitation">
        <h2>17) Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, exemplary, punitive, or consequential damages; or for lost profits, revenue, data, goodwill, or business interruption.
        </p>
        <p>
          Our total aggregate liability for all claims related to the Services will not exceed the “Net Fees” you paid to us for the specific order giving rise to the claim in the twelve (12) months before the first event giving rise to liability.
        </p>
        <p>
          “Net Fees” exclude pass-through/third-party charges (lab/physician fees, kit costs, shipping/handling, taxes, payment-processing or BNPL fees, and other third-party administrative charges). If no Net Fees were paid, the cap is US$100.
        </p>
        <p>
          We are not liable for acts/omissions of independent physicians, labs, shippers, or other third-party providers. Any claim must be brought within one (1) year after it accrues.
        </p>
      </section>

      {/* 18) Indemnification */}
      <section id="indemnification">
        <h2>18) Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless the Company and its officers, directors, employees, and agents from claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys’ fees) arising from: (a) your misuse of the Services; (b) your breach of these Terms; or (c) your violation of law or third-party rights.
        </p>
      </section>

      {/* 19) Changes to Services & Terms */}
      <section id="changes">
        <h2>19) Changes to Services and These Terms</h2>
        <p>
          The Services are under continuous development and may change at any time. We may modify these Terms prospectively. We will post the updated version with a new “Last Updated” date at our canonical Terms URL. For material changes (including changes to arbitration/venue, refunds, data use, license scope, or liability limits), we will provide reasonable advance notice (e.g., banner, in-app notice, or email) stating the effective date.
        </p>
        <p><strong>Consent &amp; Continued Use.</strong> Changes take effect on the stated effective date. Your continued access or use after that date constitutes acceptance. If you do not agree, you must stop using the Services before the effective date.</p>
        <p><strong>Existing Orders.</strong> For paid, in-progress orders, the version of the Terms in effect at checkout governs that order, except where a later change is required by law or enhances your rights without additional cost.</p>
        <p><strong>Versioning.</strong> We maintain an archive of prior versions and may identify the version you accepted by version ID/date in your receipt or account records.</p>
        <p><strong>Google API Carve-Out.</strong> For Google user data obtained via Google APIs, our Google API Services—Limited Use commitments will control and will not be modified to permit advertising or unrelated use without renewed consent and, if required, Google re-verification.</p>
      </section>

      {/* 20) Suspension/Termination */}
      <section id="termination">
        <h2>20) Suspension/Termination</h2>
        <p>
          We may suspend or terminate your access (with or without notice) for breach, Unauthorized Use, suspected fraud/abuse, or legal/compliance reasons. Upon termination, your license ends and you must stop using the Services. Sections intended to survive (including 7–11, 16–22) will survive.
        </p>
      </section>

      {/* 21) Governing Law; Venue */}
      <section id="law-venue">
        <h2>21) Governing Law; Venue</h2>
        <p>
          These Terms are governed by Arizona law (conflict-of-laws rules excluded). Exclusive venue lies in the state or federal courts in Maricopa County, Arizona, and you consent to their jurisdiction.
        </p>
      </section>

      {/* 22) Miscellaneous */}
      <section id="misc">
        <h2>22) Miscellaneous</h2>
        <p>
          These Terms (plus the Privacy Policy and any order confirmation) are the entire agreement and supersede all prior agreements regarding the Services. If any provision is unenforceable, the remainder remains in effect. No waiver is effective unless in writing and signed by us. You may not assign these Terms without our consent; we may assign to an affiliate or in connection with merger, acquisition, or asset transfer.
        </p>
      </section>

      {/* 23) Contact */}
      <section id="contact">
        <h2>23) Contact</h2>
        <address className="legal-contact-list">
          <div><strong>Neuro Logic, LLC d/b/a Better Mind Care</strong></div>
          <div>4539 N 22nd St., Ste R, Phoenix, AZ 85016</div>
          <div><a href="mailto:support@bettermindcare.com">support@bettermindcare.com</a></div>
        </address>
      </section>
    </div>

    <aside className="legal-callout" aria-label="Disclaimer">
      <h3>Disclaimer</h3>
      <p>
        Better Mind Care provides educational and wellness services to support brain health. Our platform is not a substitute for medical diagnosis or treatment. Always consult a qualified healthcare professional for medical concerns.
      </p>
    </aside>
  </main>
);

export default TermsOfService;
