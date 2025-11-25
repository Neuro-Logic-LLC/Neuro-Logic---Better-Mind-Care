import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { OutlineButtonHoverDark } from '../../components/button/Buttons';
import './PatientRequisitionViewer.css';
export default function PatientRequisitionViewer() {
  const [params, setSearchParams] = useSearchParams();
  const { patientID: pidFromPath, patientOrderID: poidFromPath } =
    useParams() || {};

  const qp = (k) => params.get(k) || params.get(k.toLowerCase()) || '';
  const patientID = (qp('PatientID') || pidFromPath || '').trim();
  const patientOrderID = (
    qp('PatientOrderID') ||
    qp('PatientOrderId') ||
    poidFromPath ||
    ''
  ).trim();
  const externalClientID =
    qp('ExternalClientID') || qp('externalClientID') || ''; // ✅ define it

  const API_BASE =
    process.env.NODE_ENV === 'production'
      ? 'https://staging.bettermindcare.com'
      : 'https://localhost:5050';

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
    if (externalClientID) next.set('ExternalClientID', externalClientID);
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

    fetch(`${API_BASE}/api/evexia/requisition-get?${qs.toString()}`, {
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
        const data = await r.json();
        const b64 = data?.pdfBase64 || data?.content || null;
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
        if (e.name !== 'AbortError') {
          setError(
            e.message ||
              'We couldn’t fetch your requistion. Refresh the page or try again shortly.'
          );
          setStatus('error');
        }
      });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [patientID, patientOrderID, externalClientID]); // ✅ includes all deps

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

  // -----------------------------
  // 🩸 Draw Center Locator
  // -----------------------------
  const [zip, setZip] = useState('');
  const [distance, setDistance] = useState('25');
  const [drawCenters, setDrawCenters] = useState([]);
  const [dcStatus, setDcStatus] = useState('idle');
  const [dcError, setDcError] = useState(null);

  const searchDrawCenters = async () => {
    try {
      if (!zip.trim()) {
        setDcError('Please enter a ZIP code.');
        setDcStatus('error');
        return;
      }

      setDcStatus('loading');
      setDcError(null);
      setDrawCenters([]);

      const qs = new URLSearchParams();
      qs.set('postalCode', zip.trim());
      qs.set('distance', distance);
      if (externalClientID) qs.set('externalClientID', externalClientID);

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(
        `/api/evexia/draw-center-locator?${qs.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          cache: 'no-store'
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from Evexia API');
      }

      setDrawCenters(data?.DrawCenters || []);
      setDcStatus('done');
    } catch (e) {
      setDcError(e.message || 'Error fetching draw centers.');
      setDcStatus('error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Requisition Viewer</h2>
        {!needsIds && (
          <>
            <OutlineButtonHoverDark
              onClick={onDownload}
              disabled={!blobUrl || status !== 'done'}
            >
              Download PDF
            </OutlineButtonHoverDark>
            <a
              href={blobUrl || '#'}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!blobUrl || status !== 'done'}
              onClick={(e) => {
                if (!blobUrl) e.preventDefault();
              }}
            >
              Open in new tab
            </a>
          </>
        )}
      </div>

      {needsIds && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <p>Enter PatientID and PatientOrderID to load requisition:</p>
          <div className="input-grid">
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
            <OutlineButtonHoverDark
              className="load-btn"
              type="button"
              onClick={kickFetch}
              disabled={!pidInput.trim() || !poidInput.trim()}
            >
              Load
            </OutlineButtonHoverDark>
          </div>
        </div>
      )}

      {!needsIds && status === 'loading' && <p>Fetching requisition…</p>}
      {!needsIds && status === 'error' && (
        <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
          {error || 'Error'}
        </p>
      )}

      {blobUrl && status === 'done' && (
        <iframe
          title={fileName}
          src={blobUrl}
          style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }}
        />
      )}

      {/* Draw Center Locator Section */}
      <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
        <h3>Draw Center Locator</h3>
        <p>Enter a ZIP code to find nearby draw centers.</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 8
          }}
        >
          <input
            placeholder="ZIP"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
          <input
            placeholder="Distance (mi)"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <OutlineButtonHoverDark onClick={searchDrawCenters}>
            Search
          </OutlineButtonHoverDark>
        </div>

        {dcStatus === 'loading' && <p>Searching…</p>}
        {dcStatus === 'error' && (
          <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{dcError}</p>
        )}
        {dcStatus === 'done' && drawCenters.length === 0 && (
          <p>No draw centers found.</p>
        )}
        {drawCenters.length > 0 && (
          <ul style={{ marginTop: 12, paddingLeft: 20 }}>
            {drawCenters.map((dc) => (
              <li key={dc.DrawCenterID}>
                <strong>{dc.Name}</strong> — {dc.Address}, {dc.City}, {dc.State}{' '}
                {dc.Zip}
                <br />
                <small>
                  {dc.Phone} ·{' '}
                  {dc.Website ? (
                    <a href={dc.Website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : (
                    '—'
                  )}{' '}
                  · {dc.Distance?.toFixed(1)} mi
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
