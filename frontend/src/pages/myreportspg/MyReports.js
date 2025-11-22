import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/intake/my-reports', {
          credentials: 'include'
        });
        if (res.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        let data = [];
        try {
          data = await res.json();
        } catch (_) {
          data = [];
        }

        if (!res.ok) {
          throw new Error((data && data.error) || res.statusText);
        }

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.logs)
            ? data.logs
            : [];
        setReports(list);
      } catch (e) {
        console.error('my-reports fetch failed:', e);
        setErr(e.message || 'Failed to load reports');
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleView = (r) => {
    const output =
      typeof r.report_output === 'string'
        ? (() => {
            try {
              return JSON.parse(r.report_output);
            } catch {
              return {};
            }
          })()
        : r.report_output || {};

    const raw = output.report || output;
    const innerReport = Array.isArray(raw) ? { sections: raw } : raw;

    navigate('/report', {
      state: {
        report: {
          ...innerReport, // now guaranteed to be an object
          labRecommendations: output.labRecommendations,
          userEmail: r.user_email,
          submittedAt: r.submitted_at || r.created_at
        },
        reportId: r.id // optional: helpful on hard reload
      },
      replace: true
    });
  };
  if (loading) return <p>Loading your reports...</p>;
  if (err) return <p style={{ color: 'crimson' }}>Error: {err}</p>;

  return (
    <div className="report-list-page">
      <h1>Your Reports & Documents</h1>
      {reports.length === 0 ? (
        <p>No reports are available yet. Once your lab results or personalized Brain Health Report are ready, they’ll appear here automatically.</p>
      ) : (
        <ul className="report-list">
          {reports.map((r) => (
            <li key={r.id} className="report-card">
              <p>
                Added on {new Date(r.submitted_at || r.created_at).toLocaleDateString()}
              </p>
              <button className="btn" onClick={() => handleView(r)}>
                View Report
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyReports;
