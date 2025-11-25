import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './patientReport.css';

const renderItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul>
      {items.map((item) => {
        const key =
          item.id ||
          item.title ||
          item.description ||
          Math.random().toString(36);
        let content = '';

        if (typeof item === 'string') {
          content = item;
        } else {
          content = item.title || item.description || '';
        }
        return <li key={key}>{content}</li>;
      })}
    </ul>
  );
};

const Section = ({ section, fallbackFooter }) => {
  if (!section) return null;
  const footer = section.footer || fallbackFooter;
  if (
    !section.body &&
    (!Array.isArray(section.items) || section.items.length === 0)
  ) {
    return null;
  }

  const sectionId = section.id || section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const sectionId =
    section.id ||
    section.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  return (
    <section className="report-section" id={sectionId}>
      <h2>{section.title}</h2>
      {section.body && (
        <div
          className="report-section__body"
          dangerouslySetInnerHTML={{ __html: section.body }}
        />
      )}
      {renderItems(section.items)}
      <div className="section-footer">{footer}</div>
    </section>
  );
};

function PatientReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialReport = location.state?.report || null;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(!initialReport);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reportId =
      location.state?.reportId ||
      new URLSearchParams(location.search).get('reportId');

    // If caller passed a full report in state, use it and stop
    if (location.state?.report) {
      setReport(location.state.report);
      setLoading(false);
      return;
    }

    // If no id and no report, nothing to load
    if (!reportId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/${reportId}`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error(res.statusText || 'Failed to load report');
        const data = await res.json();

        if (!cancelled) {
          // Handle both shapes from API
          // 1) { report_output: { report, labRecommendations } }
          // 2) { report: {...} } or just the report object
          const output = data?.report_output
            ? data.report_output.report || data.report
            : data?.report || data;

          setReport(output || null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Report fetch failed:', err);
          setError('Unable to load report.');
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, location.search]);

  if (loading) {
    return (
      <div className="patient-report-page">
        <p>Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="patient-report-page">
        <p>{error || 'No report yet.'}</p>
        <button className="btn" type="button" onClick={() => navigate('/')}>
          Go back
        </button>
      </div>
    );
  }

  const sections = Array.isArray(report.sections) ? report.sections : [];
  const footerBanner =
    report.footerBanner ||
    'Educational wellness content — not medical advice. See full disclaimer on page 1.';

  const tocSections = [
    'Overview',
    'Your Personalized Recommendations',
    'Supplement Guidance',
    'Your Test Results',
    'FAQs & Definitions'
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="patient-report-page bg-gradient-teal">
      <header className="report-page__header">
        <div>
          <h1>
            Patient Report{' '}
            {report.isDraft && (
              <span className="report-badge report-badge--draft">Draft</span>
            )}
          </h1>
          <p className="timestamp">{report.reportDate || ''}</p>
        </div>
      </header>

      {report.globalDisclaimer && (
        <section className="report-banner" aria-label="Global disclaimer">
          <p>{report.globalDisclaimer}</p>
        </section>
      )}

      {sections.map((section) => (
        <Section
          key={section.id || section.title}
          section={section}
          fallbackFooter={footerBanner}
        />
      ))}
    </main>
  );
}

export default PatientReport;
