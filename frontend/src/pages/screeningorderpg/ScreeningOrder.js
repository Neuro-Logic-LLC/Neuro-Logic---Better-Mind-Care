import React, { useEffect, useMemo, useState } from 'react';
import { PrimaryButton } from '../../components/button/Buttons';
import { useAuth } from '../../auth/AuthContext';
const externalClientID = '1B2FA0C0-3CBB-402A-9800-F3965A2D3DF5';
const BearerToken = 'BEC78AED-64A1-42A1-AFA1-39BA65F50835';

// Helper to fetch and detect JSON/PDF/text (now accepts fetch init)
async function fetchAny(url, init) {
  const res = await fetch(url, { credentials: 'include', ...init });
  const ct = (res.headers.get('content-type') || '').toLowerCase();

  if (res.status === 204) return { ok: true, kind: 'empty', data: null };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    return {
      ok: false,
      kind: 'error',
      data: json || text || `HTTP ${res.status}`
    };
  }

  // Force JSON parse if text looks like JSON (even if content-type is wrong)
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { ok: true, kind: 'json', data: json };
  } catch {
    // fallback
    return { ok: true, kind: 'text', data: text };
  }
}

// Normalize common analyte result structures
function normalizeAnalytes(raw) {
  if (!raw) return [];
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.items)) arr = raw.items;
  else if (Array.isArray(raw?.analytes)) arr = raw.analytes;
  else if (Array.isArray(raw?.data?.analytes)) arr = raw.data.analytes;
  else if (raw?.Specimens?.[0]?.OBXValues) arr = raw.Specimens[0].OBXValues;

  return arr.map((a, i) => ({
    id: a.id || a.code || String(i),
    name:
      a.name ||
      a.analyteName ||
      a.display ||
      a.ObservationIdentifier?.split('^')[1] ||
      'Unnamed analyte',
    result: a.result ?? a.value ?? a.resultValue ?? a.ObservationValue ?? '',
    units: a.units || a.unit || a.Units || '',
    ref: a.reference || a.referenceRange || a.ReferenceRange || '',
    flag: a.flag || a.resultFlag || a.AbnormalFlags || '',
    specimen: a.specimen || a.SpecimenID || '',
    collectedAt:
      a.collectedAt ||
      a.collectionDate ||
      a.collected ||
      a.DATETIMEOfObservation ||
      ''
  }));
}

// POST helper
async function postAnalytes(payload) {
  const url = 'https://staging.bettermindcare.com/api/evexia/analyte-result';

  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BearerToken}`,
      'x-evexia-token': sessionStorage.getItem('x_evexia_token') || ''
    },
    body: JSON.stringify(payload)
  };

  return fetchAny(url, init);
}

export default function ScreeningOrder() {
  const { evxPatientID, evxPatientOrderID } = useAuth();
  const [externalClientID, setExternalClientID] = useState(
    sessionStorage.getItem('evx_externalClientId') || ''
  );
  const [patientID, setPatientID] = useState('');
  const [patientOrderID, setPatientOrderID] = useState('');
  const [specimen, setSpecimen] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('table');
  const [rows, setRows] = useState([]);
  const [rawJson, setRawJson] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [hasFetched, setHasFetched] = useState(false);

  const canFetch = !!patientID && !!patientOrderID;

  // Step 1: when auth changes, write them to state
  useEffect(() => {
    if (evxPatientID) setPatientID(evxPatientID);
    if (evxPatientOrderID) setPatientOrderID(evxPatientOrderID);
  }, [evxPatientID, evxPatientOrderID]);

  // Step 2: when patientID + orderID update, THEN load
  useEffect(() => {
    if (!patientID || !patientOrderID) return;
    if (!hasFetched) load();
  }, [patientID, patientOrderID]);

  console.log("Loading with:", { patientID, patientOrderID });

  function parseIntOrNull(v) {
    const n = Number(String(v || '').trim());
    return Number.isFinite(n) ? n : null;
  }

  async function load() {
    // if (!canFetch) {
    //   setError('PatientID, and PatientOrderID.');
    //   return;
    // }
    if (!patientID || !patientOrderID) return;
    const pid = parseIntOrNull(patientID);
    const poid = parseIntOrNull(patientOrderID);
    if (pid == null || poid == null) {
      setError('PatientID and PatientOrderID must be integers.');
      return;
    }
    setHasFetched(true);
    setLoading(true);
    setError('');
    setRows([]);
    setRawJson(null);
    setMode('table');

    const payload = {
      externalClientID:
        externalClientID.trim() || '1B2FA0C0-3CBB-402A-9800-F3965A2D3DF5',
      patientID: pid,
      patientOrderID: poid
    };

    const out = await postAnalytes(payload);
    setLoading(false);

    let parsed = out.data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }

    setRawJson(parsed || null);
    if (!out.ok) {
      setError('Failed to load results.');
      return;
    }

    if (parsed && parsed.Specimens?.[0]?.OBXValues) {
      const norm = normalizeAnalytes(parsed);
      if (norm.length === 0) setMode('empty');
      else {
        setRows(norm);
        setMode('table');
      }
      return;
    }
    setMode('empty');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q)
      list = list.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.result || '').toLowerCase().includes(q) ||
          (r.flag || '').toLowerCase().includes(q) ||
          (r.specimen || '').toLowerCase().includes(q)
      );

    if (sortBy === 'name')
      list = [...list].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    else if (sortBy === 'flag')
      list = [...list].sort((a, b) =>
        String(b.flag || '').localeCompare(a.flag || '')
      );
    else if (sortBy === 'collected')
      list = [...list].sort(
        (a, b) => new Date(b.collectedAt || 0) - new Date(a.collectedAt || 0)
      );

    return list;
  }, [rows, search, sortBy]);

  return (
    <div className="min-h-screen flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl px-4 md:px-6 pt-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Lab Results</h1>
        <h2 className="text-sm text-neutral-600">
          Note to tester: Test this with PatientID 113002, PatientOrderID 210824
          original temporary placeholder
        </h2>
      </header>

      {/* Controls */}
      <section className="w-full max-w-2xl px-4 md:px-6 mt-6">
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '9px'
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full"
          >
            <input
              style={{ cursor: 'pointer' }}
              className="h-10 border rounded-lg px-3 w-full sm:w-56"
              placeholder="PatientID (int)"
              value={patientID}
              onChange={(e) => setPatientID(e.target.value)}
            />
            <input
              style={{ cursor: 'pointer' }}
              className="h-10 border rounded-lg px-3 w-full sm:w-64"
              placeholder="PatientOrderID (int)"
              value={patientOrderID}
              onChange={(e) => setPatientOrderID(e.target.value)}
            />
            <input
              style={{ cursor: 'pointer' }}
              className="h-10 border rounded-lg px-3 w-full sm:w-52"
              placeholder="Specimen (optional)"
              value={specimen}
              onChange={(e) => setSpecimen(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: '20px'
            }}
            className="flex items-center justify-center gap-2"
          >
            <PrimaryButton
              style={{ cursor: 'pointer' }}
              className="h-10 px-4 border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              onClick={load}
              disabled={loading || !canFetch}
            >
              {loading ? 'Loading…' : 'Search'}
            </PrimaryButton>
          </div>

          {error && (
            <div className="w-full max-w-xl text-center rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Patient Info */}
      {rawJson && (
        <section className="w-full max-w-3xl px-4 md:px-6 mt-6">
          <div className="p-4 bg-blue-50 border rounded-xl text-sm text-center">
            <h3 className="text-lg font-semibold mb-2">Patient Information</h3>
            <p>
              <strong>Name:</strong> {rawJson.FirstName} {rawJson.LastName}
            </p>
            <p>
              <strong>DOB:</strong> {rawJson.PatientDOB}
            </p>
            <p>
              <strong>Date Collected:</strong> {rawJson.DateCollected}
            </p>
            <p>
              <strong>Ordering Provider:</strong> {rawJson.OrderingProvider}
            </p>
          </div>
        </section>
      )}

      {/* Results */}
      <section className="w-full max-w-5xl px-4 md:px-6 mt-6 flex flex-col items-center">
        {mode === 'table' &&
          (filtered.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Analyte</th>
                    <th className="px-4 py-2 text-left">Result</th>
                    <th className="px-4 py-2 text-left">Units</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-left">Flag</th>
                    <th className="px-4 py-2 text-left">Specimen</th>
                    <th className="px-4 py-2 text-left">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2">{r.result}</td>
                      <td className="px-4 py-2">{r.units}</td>
                      <td className="px-4 py-2">{r.ref}</td>
                      <td className="px-4 py-2">
                        {r.flag ? (
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                              /H|L|abn|high|low/i.test(r.flag)
                                ? 'border-red-300 text-red-700 bg-red-50'
                                : 'border-neutral-300 text-neutral-700 bg-neutral-50'
                            }`}
                          >
                            {r.flag}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2">{r.specimen || '—'}</td>
                      <td className="px-4 py-2">
                        {r.collectedAt
                          ? new Date(r.collectedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            hasFetched &&
            !loading && (
              <div className="rounded-xl border p-6 text-center text-neutral-600">
                No results found.
              </div>
            )
          ))}
      </section>

      {/* Raw JSON after table */}
      {rawJson && (
        <section className="w-full max-w-5xl px-4 md:px-6 mt-6 mb-12 flex justify-center">
          <div className="w-full max-w-4xl p-4 bg-neutral-50 border rounded-xl overflow-auto text-sm">
            <h3 className="text-lg font-semibold mb-2 text-center">
              Raw JSON Response
            </h3>
            <pre className="whitespace-pre-wrap break-words text-left">
              {JSON.stringify(rawJson, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
