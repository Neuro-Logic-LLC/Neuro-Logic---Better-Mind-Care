import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function EvexiaLabReport() {
  const [params, setSearchParams] = useSearchParams();
  const { patientID: pidFromPath, patientOrderID: poidFromPath } = useParams() || {};

  // Read params with tolerant casing
  const qp = (k) => params.get(k) || params.get(k.toLowerCase()) || '';
  const patientID = (qp('PatientID') || pidFromPath || '').trim();
  const patientOrderID = (qp('PatientOrderID') || qp('PatientOrderId') || poidFromPath || '').trim();
  const specimen = (qp('Specimen') || '').trim();
  const externalClientID = (qp('ExternalClientID') || qp('externalClientId') || '').trim();

  const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'https://localhost:5050';

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [fileName, setFileName] = useState(
    patientID && patientOrderID ? `lab-${patientID}-${patientOrderID}.pdf` : 'lab-result.pdf'
  );

  // Fallback inputs (when URL has no IDs)
  const [pidInput, setPidInput] = useState(patientID);
  const [poidInput, setPoidInput] = useState(patientOrderID);
  const [specInput, setSpecInput] = useState(specimen);

  const abortRef = useRef(null);

  const kickFetch = () => {
    // push IDs into the URL as canonical query params
    const next = new URLSearchParams();
    next.set('PatientID', pidInput.trim());
    next.set('PatientOrderID', poidInput.trim());
    if (specInput.trim()) next.set('Specimen', specInput.trim());
    setSearchParams(next);
  };

  useEffect(() => {
    if (!patientID || !patientOrderID) {
      setStatus('idle');
      setError(null);
      return; // show the form instead of erroring out
    }

    setStatus('loading');
    setError(null);

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const qs = new URLSearchParams({ PatientID: patientID, PatientOrderID: patientOrderID });
    if (specimen) qs.set('Specimen', specimen);

    fetch(`${API_BASE}/api/evexia/lab-result?${qs.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
        ...(externalClientID ? { 'x-evexia-client-id': externalClientID } : {})
      },
      signal: controller.signal,
      cache: 'no-store'
    })
      .then(async (r) => {
        if (!r.ok) {
          let j = null;
          try { j = await r.json(); } catch {}
          const msg = j?.error || `HTTP ${r.status}`;
          throw Object.assign(new Error(msg), { details: j, status: r.status });
        }
        const disp = r.headers.get('Content-Disposition') || r.headers.get('content-disposition') || '';
        const m = /filename="([^"]+)"/i.exec(disp);
        if (m && m[1]) setFileName(m[1]);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus('done');
      })
      .catch((e) => {
        setStatus('error');
        const parts = [];
        if (e?.message) parts.push(e.message);
        if (e?.details?.resultCount === 0) parts.push('No report yet (not finalized).');
        if (e?.details?.upstreamStatus) parts.push(`Upstream: ${e.details.upstreamStatus}`);
        setError(parts.join(' '));
      });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientID, patientOrderID, specimen, externalClientID]);

  const onDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'lab-result.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // If IDs are missing, show a tiny form instead of an error screen
  const needsIds = !patientID || !patientOrderID;

  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Lab Report</h2>
        {!needsIds && (
          <>
            <button
              type="button"
              onClick={onDownload}
              disabled={!blobUrl || status !== 'done'}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}
            >
              Download PDF
            </button>
            <a
              href={blobUrl || '#'}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!blobUrl || status !== 'done'}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', textDecoration: 'none' }}
              onClick={(e) => { if (!blobUrl) e.preventDefault(); }}
            >
              Open in new tab
            </a>
          </>
        )}
      </div>

      {needsIds && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <p style={{ marginTop: 0 }}>
            Missing <code>PatientID</code> or <code>PatientOrderID</code>. Enter them below.
          </p>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr auto' }}>
            <input
              placeholder="PatientID"
              value={pidInput}
              onChange={(e) => setPidInput(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <input
              placeholder="PatientOrderID"
              value={poidInput}
              onChange={(e) => setPoidInput(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <input
              placeholder="Specimen (optional)"
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <button
              type="button"
              onClick={kickFetch}
              disabled={!pidInput.trim() || !poidInput.trim()}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}
            >
              Load report
            </button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <small>Example: <code>?PatientID=113002&PatientOrderID=210824</code></small>
            <button
              type="button"
              onClick={() => { setPidInput('113002'); setPoidInput('210824'); setSpecInput(''); }}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}
            >
              Fill example
            </button>
          </div>
        </div>
      )}

      {!needsIds && status === 'loading' && <p>Fetching report…</p>}
      {!needsIds && status === 'error' && (
        <p style={{ color: '#b00', whiteSpace: 'pre-wrap' }}>{error || 'Error'}</p>
      )}

      {blobUrl && status === 'done' && (
        <iframe
          title={fileName}
          src={blobUrl}
          style={{ width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: 8 }}
        />
      )}
    </div>
  );
}