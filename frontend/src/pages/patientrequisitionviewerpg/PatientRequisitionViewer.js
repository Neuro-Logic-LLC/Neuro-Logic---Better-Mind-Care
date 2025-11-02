import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function PatientRequisitionViewer() {
  const [params, setSearchParams] = useSearchParams();
  const { patientID: pidFromPath, patientOrderID: poidFromPath } = useParams() || {};

  const qp = (k) => params.get(k) || params.get(k.toLowerCase()) || '';
  const patientID = (qp('PatientID') || pidFromPath || '').trim();
  const patientOrderID = (qp('PatientOrderID') || qp('PatientOrderId') || poidFromPath || '').trim();
  const externalClientID = (qp('ExternalClientID') || '').trim();

  const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'https://localhost:5050';

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [fileName, setFileName] = useState(
    patientID && patientOrderID
      ? `requisition-${patientID}-${patientOrderID}.pdf`
      : 'requisition.pdf'
  );

  const [pidInput, setPidInput] = useState(patientID);
  const [poidInput, setPoidInput] = useState(patientOrderID);
  const abortRef = useRef(null);

  const kickFetch = () => {
    const next = new URLSearchParams();
    next.set('PatientID', pidInput.trim());
    next.set('PatientOrderID', poidInput.trim());
    setSearchParams(next);
  };

  useEffect(() => {
    if (!patientID || !patientOrderID) {
      setStatus('idle');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const qs = new URLSearchParams({ patientID, patientOrderID });
    if (externalClientID) qs.set('externalClientID', externalClientID);

    fetch(`/api/evexia/requisition-get?${qs.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`HTTP ${r.status} - ${text}`);
        }

        const text = await r.text(); // read as plain text in case it's raw base64
        let b64 = null;

        try {
          const json = JSON.parse(text);
          b64 = Array.isArray(json)
            ? json[0]?.RequisitionString
            : json?.RequisitionString;
        } catch {
          // not JSON — maybe raw base64 string
          if (text.startsWith('JVBER')) b64 = text;
        }

        if (!b64) throw new Error('No PDF content found in response.');

        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus('done');
      })
      .catch((e) => {
        setError(e.message || 'Error fetching requisition.');
        setStatus('error');
      });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [patientID, patientOrderID, externalClientID]);

  const onDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const needsIds = !patientID || !patientOrderID;

  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Requisition Viewer</h2>
        {!needsIds && (
          <>
            <button
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
          <p>Enter PatientID and PatientOrderID to load requisition:</p>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto' }}>
            <input
              placeholder="PatientID"
              value={pidInput}
              onChange={(e) => setPidInput(e.target.value)}
            />
            <input
              placeholder="PatientOrderID"
              value={poidInput}
              onChange={(e) => setPoidInput(e.target.value)}
            />
            <button
              type="button"
              onClick={kickFetch}
              disabled={!pidInput.trim() || !poidInput.trim()}
            >
              Load
            </button>
          </div>
        </div>
      )}

      {!needsIds && status === 'loading' && <p>Fetching requisition…</p>}
      {!needsIds && status === 'error' && (
        <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error || 'Error'}</p>
      )}

      {blobUrl && status === 'done' && (
        <iframe
          title={fileName}
          src={blobUrl}
          style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }}
        />
      )}
    </div>
  );
}