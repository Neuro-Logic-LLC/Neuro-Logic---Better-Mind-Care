// EvexiaPatientList.js
import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function EvexiaPatientList({
  apiPath = '/api/evexia/list-all-patients',
  onSelectPatient = null,
  ...props
}) {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const abortRef = useRef(null);

  // helpers
  const get = (obj, ...keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null)
        return obj[k];
    }
    return undefined;
  };

  const normalize = (rows) =>
    rows.map((r) => ({
      _raw: r,
      id: get(r, 'PatientID', 'patientId', 'patient_id') ?? '',
      orderId:
        get(r, 'PatientOrderID', 'patientOrderId', 'patient_order_id') ?? '',
      email: get(r, 'EmailAddress', 'email', 'Email') ?? '',
      first: get(r, 'FirstName', 'firstName', 'first_name') ?? '',
      last: get(r, 'LastName', 'lastName', 'last_name') ?? ''
    }));

  const fetchPatients = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(apiPath, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ctrl.signal
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Request failed ${res.status}: ${body.slice(0, 300)}`);
      }
      const json = await res.json();
      const list = Array.isArray(json)
        ? json
        : (json &&
            (json.patients || json.items || json.data || json.results)) ||
          [];
      setPatients(normalize(list));
    } catch (e) {
      if (e?.name !== 'AbortError')
<<<<<<< HEAD
        setError(
          e?.message ||
            'We couldn’t load this section. Refresh the page or try again shortly.'
        );
=======
        setError(e?.message || 'We couldn’t load this section. Refresh the page or try again shortly.');
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchPatients();
    return () => abortRef.current && abortRef.current.abort();
  }, [fetchPatients]);

  // call parent when selecting a patient
  const handleSelect = useCallback(
    (p) => {
      const id = p.id || null;
      setSelected(id);
      if (typeof onSelectPatient === 'function' && id != null && id !== '') {
        onSelectPatient(id);
      }
    },
    [onSelectPatient]
  );

  // inline styles
  const th = {
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: '1px solid #ddd',
    fontWeight: 600
  };
  const td = { padding: '8px 12px' };
  const btn = (active) => ({
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid',
    background: active ? '#0ea5e9' : 'transparent',
    color: active ? 'white' : '#0f172a',
    borderColor: active ? '#0ea5e9' : '#cbd5e1',
    cursor: 'pointer'
  });

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Evexia Patients
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchPatients} className="btn btn-outline-teal">
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-primary"
          >
            Add Patient
          </button>
        </div>
      </div>

      {loading && <p>Loading patients...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #ddd',
            borderRadius: 8
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={th}>Select</th>
                <th style={th}>Name</th>
                <th style={th}>Patient ID</th>
                <th style={th}>Email</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ ...td, opacity: 0.7, textAlign: 'center' }}
                  >
                    No results
                  </td>
                </tr>
              ) : (
                patients.map((p, i) => {
                  const name = `${p.first} ${p.last}`.trim() || '—';
                  return (
                    <tr
                      key={p.id || i}
                      style={{
                        background:
                          selected === p.id ? '#e0f2fe' : 'transparent',
                        borderTop: '1px solid #eee'
                      }}
                    >
                      <td style={td}>
                        <button
                          onClick={() => handleSelect(p)}
                          className={
                            selected === p.id
                              ? 'btn btn-secondary'
                              : 'btn btn-outline-teal'
                          }
                        >
                          {selected === p.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                      <td style={td}>{name}</td>
                      <td style={td}>{p.id || ''}</td>
                      <td style={td}>{p.email || ''}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddPatientDialog
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Add Patient Dialog ---------------- */

function AddPatientDialog({ onClose, onCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [externalClientID, setExternalClientID] = useState(null);

  const [form, setForm] = useState({
    EmailAddress: '',
    FirstName: '',
    LastName: '',
    StreetAddress: '',
    StreetAddress2: '',
    City: '',
    State: '',
    PostalCode: '',
    Phone: '',
    DOB: '', // "3/31/1977 12:00:00 AM"
    Gender: '', // "M" or "F"
    Guardian: '',
    GuardianRelationship: '',
    GuardianAddress: '',
    GuardianAddress2: '',
    GuardianCity: '',
    GuardianPostalCode: '',
    GuardianState: '',
    GuardianPhone: ''
  });

  const required = [
    'EmailAddress',
    'FirstName',
    'LastName',
    'StreetAddress',
    'City',
    'State',
    'PostalCode',
    'Phone',
    'DOB',
    'Gender'
  ];

  // fetch ExternalClientID silently
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch('/api/evexia/client-id', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: ctrl.signal
        });
        const j = await r.json();
        setExternalClientID(j.externalClientID || j.ExternalClientID || null);
      } catch (e) {
        setErr('Failed to prepare client context.');
      }
    })();
    return () => ctrl.abort();
  }, []);

  const onChange = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    for (const k of required) {
      if (!String(form[k] ?? '').trim()) {
        setErr(`Missing required field: ${k}`);
        return;
      }
    }
    if (!externalClientID) {
      setErr('Setup error: ExternalClientID not ready.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...form, ExternalClientID: externalClientID };

      const res = await fetch('/api/evexia/patient-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error ||
<<<<<<< HEAD
          (Array.isArray(data)
            ? data.join('; ')
            : 'Something didn’t go through — try again.');
=======
          (Array.isArray(data) ? data.join('; ') : 'Something didn’t go through — try again.');
>>>>>>> 613a3d1 (Apply only frontend changes from ui-theme-updates with teal gradients)
        throw new Error(msg);
      }
      onCreated?.(data);
    } catch (e2) {
      setErr(e2.message || 'Failed to add patient');
    } finally {
      setSubmitting(false);
    }
  };

  const label = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4
  };
  const input = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0,0,0,.15)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div style={{ fontWeight: 600 }}>Add Patient</div>
          <button onClick={onClose} className="btn btn-outline-teal">
            Close
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ padding: 16, maxHeight: '80vh', overflowY: 'auto' }}
        >
          {err && <div style={{ color: 'red', marginBottom: 8 }}>{err}</div>}
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
            {externalClientID ? 'Client ready' : 'Preparing client...'}
          </div>

          {/* identity */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div>
              <label style={label}>EmailAddress *</label>
              <input
                style={input}
                value={form.EmailAddress}
                onChange={onChange('EmailAddress')}
                placeholder="testing123@gmail.com"
              />
            </div>
            <div>
              <label style={label}>Phone *</label>
              <input
                style={input}
                value={form.Phone}
                onChange={onChange('Phone')}
                placeholder="1234567890"
              />
            </div>
            <div>
              <label style={label}>FirstName *</label>
              <input
                style={input}
                value={form.FirstName}
                onChange={onChange('FirstName')}
                placeholder="John"
              />
            </div>
            <div>
              <label style={label}>LastName *</label>
              <input
                style={input}
                value={form.LastName}
                onChange={onChange('LastName')}
                placeholder="Doe"
              />
            </div>
            <div>
              <label style={label}>DOB *</label>
              <input
                style={input}
                value={form.DOB}
                onChange={onChange('DOB')}
                placeholder="3/31/1977 12:00:00 AM"
              />
            </div>
            <div>
              <label style={label}>Gender *</label>
              <input
                style={input}
                value={form.Gender}
                onChange={onChange('Gender')}
                placeholder="M"
              />
            </div>
          </div>

          {/* address */}
          <div style={{ height: 8 }} />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div>
              <label style={label}>StreetAddress *</label>
              <input
                style={input}
                value={form.StreetAddress}
                onChange={onChange('StreetAddress')}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label style={label}>StreetAddress2</label>
              <input
                style={input}
                value={form.StreetAddress2}
                onChange={onChange('StreetAddress2')}
                placeholder="Unit 2"
              />
            </div>
            <div>
              <label style={label}>City *</label>
              <input
                style={input}
                value={form.City}
                onChange={onChange('City')}
                placeholder="Austin"
              />
            </div>
            <div>
              <label style={label}>State *</label>
              <input
                style={input}
                value={form.State}
                onChange={onChange('State')}
                placeholder="TX"
              />
            </div>
            <div>
              <label style={label}>PostalCode *</label>
              <input
                style={input}
                value={form.PostalCode}
                onChange={onChange('PostalCode')}
                placeholder="78701"
              />
            </div>
          </div>

          {/* guardian */}
          <div style={{ height: 8 }} />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div>
              <label style={label}>Guardian</label>
              <input
                style={input}
                value={form.Guardian}
                onChange={onChange('Guardian')}
              />
            </div>
            <div>
              <label style={label}>GuardianRelationship</label>
              <input
                style={input}
                value={form.GuardianRelationship}
                onChange={onChange('GuardianRelationship')}
              />
            </div>
            <div>
              <label style={label}>GuardianAddress</label>
              <input
                style={input}
                value={form.GuardianAddress}
                onChange={onChange('GuardianAddress')}
              />
            </div>
            <div>
              <label style={label}>GuardianAddress2</label>
              <input
                style={input}
                value={form.GuardianAddress2}
                onChange={onChange('GuardianAddress2')}
              />
            </div>
            <div>
              <label style={label}>GuardianCity</label>
              <input
                style={input}
                value={form.GuardianCity}
                onChange={onChange('GuardianCity')}
              />
            </div>
            <div>
              <label style={label}>GuardianPostalCode</label>
              <input
                style={input}
                value={form.GuardianPostalCode}
                onChange={onChange('GuardianPostalCode')}
              />
            </div>
            <div>
              <label style={label}>GuardianState</label>
              <input
                style={input}
                value={form.GuardianState}
                onChange={onChange('GuardianState')}
              />
            </div>
            <div>
              <label style={label}>GuardianPhone</label>
              <input
                style={input}
                value={form.GuardianPhone}
                onChange={onChange('GuardianPhone')}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 12
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline-teal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !externalClientID}
              className="btn btn-primary"
            >
              {submitting ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
