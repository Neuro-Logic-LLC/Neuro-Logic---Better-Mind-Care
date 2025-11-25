import React from 'react';
import './legal-shared.css';

function PurchaseAgreement() {
  return (
    <main className="legal-page purchase-agreement-page">
      <header className="legal-hero">
        <h1>Purchase & Limited License Agreement</h1>
        <p className="legal-updated">
          Last Updated and Effective: November 25, 2025
        </p>
        <p className="legal-summary">
          This Purchase & Limited License Agreement (“Agreement”) is entered into between Neuro Logic, LLC d/b/a BetterMindCare (“BetterMindCare,” “BMC,” “we,” “us,” or “our”) and you, the individual completing a purchase of BetterMindCare products or services (“you,” “your,” or “Customer”).
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
        <section id="part-1-introduction">
          <h2>Part 1 – Introduction, Product Description, Purchase Terms</h2>
          <h3>Introduction</h3>
          <p>
            By completing a purchase from BetterMindCare, you agree to be legally bound by this Purchase & Limited License Agreement. If you do not agree, you may not purchase or use any BetterMindCare Product. You affirm you are 18 years or older and have the capacity to enter binding agreements.
          </p>
          <h3>Product Description</h3>
          <p>
            The Product refers to the consumer-facing brain health program offered by BetterMindCare at the time of purchase. The Product includes digital content, wellness education, personalized reports, and access to independent physician-authorized lab testing. BetterMindCare may modify, enhance, discontinue, or update Product features at any time.
          </p>
          <h3>Purchase Terms</h3>
          <p>
            You agree to pay the price displayed at checkout for the Product. Optional upgrades, add-ons, or renewals may be offered at additional cost. Unless otherwise specified, Product access is granted for twelve (12) months from the date of purchase. Renewal after the access period requires a new purchase. Pricing for future renewals or upgrades may change at BetterMindCare’s discretion.
          </p>
        </section>

        <section id="refund-policy-license">
          <h2>Refund Policy, License Grant, Use Restrictions</h2>
          <h3>Refund Policy</h3>
          <p>
            Due to the nature of the Product-including physician-authorized lab orders, third-party requisitions, and digital content-purchases become non-refundable once a lab requisition is generated, a home test kit has shipped, services have begun, or digital content has been accessed. Exceptions and partial refunds may be granted under the detailed conditions listed in your full policy.
          </p>
          <h3>License Grant</h3>
          <p>
            Upon purchase, BetterMindCare grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access the Product for twelve (12) months. This license is for personal, individual wellness use only and may be revoked for misuse or violation of this Agreement.
          </p>
          <h3>Use Restrictions</h3>
          <p>
            Users shall not reproduce, distribute, sublicense, modify, reverse engineer, disassemble, decompile, scrape, extract data, create derivative works, or commercially exploit any part of the Product, Platform, or Proprietary Materials. Unauthorized sharing of reports, content, or access credentials is strictly prohibited.
          </p>
        </section>

        <section id="intellectual-property">
          <h2>Intellectual Property, Unauthorized Use, Confidentiality</h2>
          <h3>Intellectual Property</h3>
          <p>
            All Proprietary Materials-including algorithms, decision logic, scoring methodologies, workflows, software code, datasets, templates, report formats, and derivative works-are the exclusive property of BetterMindCare. No ownership rights are transferred. You may not copy, reproduce, modify, distribute, adapt, display, create derivative works from, or use any Proprietary Materials outside of your personal, individual, authorized use.
          </p>
          <h3>Unauthorized Use (Anti-AI / Anti-Scraping / Anti-Reverse Engineering)</h3>
          <p>
            You shall not use bots, scrapers, spiders, headless browsers, or automated tools to extract, monitor, or copy any data. You shall not train, fine-tune, evaluate, or validate AI, machine learning models, or LLMs using any BetterMindCare content or outputs. Reverse engineering, decompiling, disassembling, deriving algorithms, or attempting to reconstruct underlying logic or models is prohibited. Use of the Product for competitive intelligence, benchmarking, or reproduction of competing products is expressly forbidden.
          </p>
          <h3>Confidentiality</h3>
          <p>
            You agree to maintain strict confidentiality over all non-public information, including Proprietary Materials, internal documentation, analysis logic, and confidential business information. You may not disclose, publish, distribute, or misuse confidential materials. These obligations survive termination of this Agreement indefinitely.
          </p>
        </section>

        <section id="liquidated-damages">
          <h2>Liquidated Damages, Lab Testing Terms, Insurance Disclaimers</h2>
          <h3>Liquidated Damages (Hybrid)</h3>
          <p>
            For willful Unauthorized Use-including competitive analysis, scraping, reverse engineering, unauthorized AI model training, and copying or distributing proprietary materials-the following liquidated damages apply:
          </p>
          <ul>
            <li>$25,000 per report or export shared or copied outside Authorized Use</li>
            <li>$50,000 per model, algorithm, workflow, or scoring methodology copied or derived</li>
            <li>$100,000 per scraper, bot, crawler, or automated access tool detected, plus $1,000 per day of continued misuse after notice</li>
            <li>$10,000 per unauthorized account, user identity, or device</li>
          </ul>
          <p>
            For ordinary customers acting unintentionally, BetterMindCare may offer corrective steps instead of penalties. However, repeated or intentional misuse will trigger full enforcement. These amounts are agreed as a reasonable pre-estimate of harm and not a penalty. BetterMindCare may also seek injunctive relief, disgorgement, and attorneys’ fees.
          </p>
          <h3>Lab Testing Terms</h3>
          <p>
            Lab collections, processing, and review are performed by independent third-party laboratories and clinicians. Users are responsible for attending scheduled appointments, submitting samples correctly, and following instructions. Missed appointments, delayed submissions, or invalid samples may result in additional fees imposed by third-parties. Home kits must be stored, collected, and shipped according to instructions. BetterMindCare is not responsible for delayed, lost, expired, or invalid kits or samples. Certain sensitive results may be delayed pending clinician review (typically 1–2 business days).
          </p>
          <h3>Insurance, HSA/FSA, Medicare Disclaimers</h3>
          <p>
            BetterMindCare does not bill insurance, Medicare, or Medicaid. The Product is not a substitute for medical insurance and may not be covered by health plans. Users are solely responsible for verifying HSA/FSA eligibility. Medicare beneficiaries agree not to submit claims to Medicare for reimbursement. BetterMindCare is not liable for denied claims or reimbursement decisions made by third‑party administrators.
          </p>
        </section>
      </div>
    </main>
  );
}

export default PurchaseAgreement;