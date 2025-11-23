import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';
import './patientReport.css';

const TableOfContents = ({ sections }) => {
  return (
    <nav className="toc">
      <h3>Table of Contents</h3>
      <ul>
        {sections.map((section) => (
          <li key={section.slug}>
            <a href={`#${section.slug}`}>{section.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

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
        const content = item.title || item.description || '';
        return <li key={key}>{content}</li>;
      })}
    </ul>
  );
};

const Section = ({ section, fallbackFooter }) => {
  if (!section) return null;
  const footer = section.footer || fallbackFooter;
  if (!section.html) {
    return null;
  }

  return (
    <section className="report-section" id={section.slug}>
      <h2>{section.title}</h2>
      <div
        className="report-section__body"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
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

    // If no id and no report, use mock data for testing
    if (!reportId) {
      // Mock data matching spec
      const mockReport = {
        id: "mock-uuid",
        title: "Patient Report",
        generatedAt: new Date().toISOString(),
        sections: [
           {
             slug: "overview",
             title: "Overview",
             html: "<p>This is the overview section with some <strong>bold text</strong> and a <a href='https://example.com' target='_blank' rel='noopener noreferrer'>link</a>.</p>"
           },
           {
             slug: "recommendations",
             title: "Your Personalized Recommendations",
             html: "<p>Here are some recommendations.</p><ul><li>Recommendation 1</li><li>Recommendation 2</li></ul>"
           },
           {
             slug: "supplements",
             title: "Supplement Guidance",
             html: "<p>Supplements info here.</p>"
           },
           {
             slug: "test-results",
             title: "Your Test Results",
             html: "<p>Test results data.</p>"
           },
           {
             slug: "faq-dictionary",
             title: "FAQs & Definitions",
             html: "<p>FAQs here.</p>"
           }
        ],
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        intro: "This report is based on your lab results, intake information, and evidence-informed cognitive risk analysis. Use the table of contents to navigate through your personalized recommendations."
      };
      setReport(mockReport);
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
        <button
          className="btn"
          type="button"
          onClick={() => navigate('/')}
          style={{
            border: '2px solid var(--teal)',
            color: 'var(--teal)',
            background: 'transparent',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.8rem',
            display: 'inline-block',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--teal)';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'var(--teal)';
          }}
        >
          ← Go back
        </button>
      </div>
    );
  }

  const sections = Array.isArray(report.sections) ? report.sections : [];
  const footerBanner =
    report.footerBanner ||
    'Educational wellness content. Not medical advice. See full disclaimer on page 1.';

  return (
    <div className="bg-gradient-white-seafoam" style={{ minHeight: '100vh' }}>
       <main className="patient-report-page">
         <header className="report-page__header">
           <Breadcrumb items={[
             { label: 'Home', path: '/' },
             { label: 'Reports', path: '/my-reports' },
             { label: 'Patient Report' }
           ]} />
           <div>
             <h1 style={{ marginBottom: '2rem' }}>Your Personalized Brain Health Report</h1>
            <p className="timestamp">{report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : ''}</p>
            {report.pdfUrl && (
              <a
                href={report.pdfUrl}
                download
                className="btn"
                style={{
                  border: '2px solid var(--teal)',
                  color: 'var(--teal)',
                  background: 'transparent',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-block',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--teal)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--teal)';
                }}
              >
                Download as PDF
              </a>
            )}
          </div>
         </header>

         {report.intro && (
           <section className="report-intro">
             <p>{report.intro}</p>
           </section>
         )}

       {report.globalDisclaimer && (
        <section className="report-banner" aria-label="Global disclaimer">
          <p>{report.globalDisclaimer}</p>
        </section>
      )}

      <TableOfContents sections={sections} />

      {sections.map((section) => (
          <Section
            key={section.slug || section.title}
            section={section}
            fallbackFooter={footerBanner}
          />
        ))}
      </main>
    </div>
  );
}

export default PatientReport;
