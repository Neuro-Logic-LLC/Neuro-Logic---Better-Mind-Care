import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PrimaryButton } from '../../components/button/Buttons';
import Card from '../../components/cards/Card';
import TextInput from '../../components/inputs/InputText';
import EvexiaPatientList from './EvexiaPatientList';
import { ChevronDown, ChevronUp, RefreshCw, Search, Download, Plus } from 'lucide-react';

/**
 * PatientOrders + AddPatient
 * - Adds an "Add Patient" dialog that POSTs to /api/evexia/patient-add (PatientAddV2 upstream)
 * - Keeps ALL fields the API spec lists; validates required fields client-side
 * - On success, closes dialog and refreshes the list
 */
export default function PatientOrders({
  apiPath = '/api/evexia/list-all-patients',
  pageSize = 25
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });
  const [showAdd, setShowAdd] = useState(false);
  const abortRef = useRef(null);

  // --- helpers -------------------------------------------------------------
  const get = (obj, ...keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
    }
    return undefined;
  };

  const fullName = (row) => {
    const fn = get(row, 'FirstName', 'firstName', 'first_name');
    const ln = get(row, 'LastName', 'lastName', 'last_name');
    return [fn, ln].filter(Boolean).join(' ');
  };

  const fields = {
    patientId: (r) => get(r, 'PatientID', 'patientId', 'patient_id'),
    orderId: (r) => get(r, 'PatientOrderID', 'patientOrderId', 'patient_order_id'),
    email: (r) => get(r, 'EmailAddress', 'email', 'Email'),
    city: (r) => get(r, 'City', 'city'),
    state: (r) => get(r, 'State', 'state'),
    phone: (r) => get(r, 'Phone', 'phone'),
    updatedAt: (r) => get(r, 'updated_at', 'UpdatedAt', 'updatedAt', 'LastUpdated'),
    status: (r) => get(r, 'Status', 'status')
  };

  const normalize = (rows) =>
    rows.map((r) => ({
      _raw: r,
      name: fullName(r),
      patientId: fields.patientId(r) ?? '',
      orderId: fields.orderId(r) ?? '',
      email: fields.email(r) ?? '',
      city: fields.city(r) ?? '',
      state: fields.state(r) ?? '',
      phone: fields.phone(r) ?? '',
      status: fields.status(r) ?? '',
      updatedAt: fields.updatedAt(r) ? new Date(fields.updatedAt(r)) : undefined
    }));

  // --- data fetch ----------------------------------------------------------
  const fetchData = useCallback(async () => {
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
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('application/pdf')) {
        throw new Error('Endpoint returned PDF. Use the JSON list endpoint for this component.');
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json && (json.patients || json.items || json.data || json.results)) || [];
      setData(normalize(list));
      setPage(0);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setError((err && err.message) || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current && abortRef.current.abort();
  }, [fetchData]);

  // --- filtering, sorting, pagination -------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [
        r.name,
        r.email,
        r.patientId && r.patientId.toString && r.patientId.toString(),
        r.orderId && r.orderId.toString && r.orderId.toString(),
        r.city,
        r.state,
        r.status
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, query]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const copy = filtered.slice();
    copy.sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      const aa = va instanceof Date ? va.getTime() : String(va).toLowerCase();
      const bb = vb instanceof Date ? vb.getTime() : String(vb).toLowerCase();
      if (aa < bb) return dir === 'asc' ? -1 : 1;
      if (aa > bb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const setSortKey = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const exportCsv = useCallback(() => {
    const rows = [
      ['Name', 'PatientID', 'OrderID', 'Email', 'City', 'State', 'Phone', 'Status', 'UpdatedAt'],
      ...sorted.map((r) => [
        r.name,
        r.patientId,
        r.orderId,
        r.email,
        r.city,
        r.state,
        r.phone,
        r.status,
        r.updatedAt ? r.updatedAt.toISOString() : ''
      ])
    ];
    const csv = rows
      .map((row) =>
        row
          .map((v) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <EvexiaPatientList />
        </div>
        <div className="text-xl font-semibold">Patient Orders</div>
        <div className="flex items-center gap-2">
          <PrimaryButton variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </PrimaryButton>
          <PrimaryButton variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </PrimaryButton>
          <PrimaryButton onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Patient
          </PrimaryButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, PatientID, OrderID, city, state" className="pl-9" />
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm">
        {error ? (
          <div className="p-4 text-sm text-red-600" role="alert" aria-live="assertive">{error}</div>
        ) : (
          <div className="w-full overflow-x-auto max-h-[70vh]" aria-busy={loading}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/80 backdrop-blur z-10">
                <tr className="text-left border-b">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'patientId', label: 'Patient ID' },
                    { key: 'orderId', label: 'Order ID' },
                    { key: 'email', label: 'Email' },
                    { key: 'city', label: 'City' },
                    { key: 'state', label: 'State' },
                    { key: 'status', label: 'Status' },
                    { key: 'updatedAt', label: 'Updated' },
                    { key: '_exp', label: '' }
                  ].map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium select-none" {...(c.key !== '_exp' && sort.key === c.key ? { 'aria-sort': sort.dir === 'asc' ? 'ascending' : 'descending' } : {})}>
                      {c.key !== '_exp' ? (
                        <PrimaryButton onClick={() => setSortKey(c.key)} className="inline-flex items-center gap-1" aria-label={`Sort by ${c.label}`}>
                          {c.label}
                          {sort.key === c.key ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                        </PrimaryButton>
                      ) : (
                        <span className="sr-only">Expand</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={9} className="px-3 py-3">
                        <motion.div initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1.2, repeatType: 'reverse' }} className="h-4 w-1/2 bg-gray-200 rounded" />
                      </td>
                    </tr>
                  ))
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm opacity-70">No results</td>
                  </tr>
                ) : (
                  pageData.map((row) => <Row key={`${row.patientId || 'np'}-${row.orderId || 'no'}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
          <div>Page {page + 1} / {totalPages} · {sorted.length} total</div>
          <div className="flex items-center gap-1">
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</PrimaryButton>
          </div>
        </div>
      </Card>

      {showAdd && (
        <AddPatientDialog onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchData(); }} />
      )}
    </div>
  );
}

function Row({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-2 whitespace-nowrap">{row.name || '—'}</td>
        <td className="px-3 py-2">{row.patientId || ''}</td>
        <td className="px-3 py-2">{row.orderId || ''}</td>
        <td className="px-3 py-2">{row.email || ''}</td>
        <td className="px-3 py-2">{row.city || ''}</td>
        <td className="px-3 py-2">{row.state || ''}</td>
        <td className="px-3 py-2">{row.status || ''}</td>
        <td className="px-3 py-2">{row.updatedAt ? row.updatedAt.toLocaleString() : ''}</td>
        <td className="px-3 py-2 text-right">
          <PrimaryButton variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Collapse details' : 'Expand details'}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </PrimaryButton>
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-gray-50/60">
          <td className="px-3 py-3" colSpan={9}>
            <pre className="text-xs overflow-auto max-h-72 rounded bg-white p-3 border">{JSON.stringify(row._raw, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}

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
    DOB: '',
    Gender: '',
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
    'EmailAddress','FirstName','LastName','StreetAddress','City','State','PostalCode','Phone','DOB','Gender'
  ];

  // fetch ExternalClientID behind the scenes
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/evexia/client-id');
        const json = await res.json();
        setExternalClientID(json.externalClientID || json.ExternalClientID);
      } catch (e) {
        console.error('Failed to fetch ExternalClientID', e);
      }
    })();
  }, []);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || (Array.isArray(data) ? data.join('; ') : 'Failed to add patient');
        throw new Error(msg);
      }
      onCreated?.(data);
    } catch (e) {
      setErr(e.message || 'Failed to add patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Add Patient</div>
          <PrimaryButton variant="outline" onClick={onClose}>Close</PrimaryButton>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
          {err && <div className="text-sm text-red-600" role="alert">{err}</div>}

          {!externalClientID && (
            <div className="text-xs text-gray-500">Preparing patient context...</div>
          )}

          {/* Core identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <L label="EmailAddress" req><TextInput value={form.EmailAddress} onChange={onChange('EmailAddress')} placeholder="testing123@gmail.com" /></L>
            <L label="Phone" req><TextInput value={form.Phone} onChange={onChange('Phone')} placeholder="1234567890" /></L>
            <L label="FirstName" req><TextInput value={form.FirstName} onChange={onChange('FirstName')} placeholder="John" /></L>
            <L label="LastName" req><TextInput value={form.LastName} onChange={onChange('LastName')} placeholder="Doe" /></L>
            <L label="DOB" req helper="e.g. 3/31/1977 12:00:00 AM"><TextInput value={form.DOB} onChange={onChange('DOB')} placeholder="3/31/1977 12:00:00 AM" /></L>
            <L label="Gender" req helper="M or F"><TextInput value={form.Gender} onChange={onChange('Gender')} placeholder="M" /></L>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <L label="StreetAddress" req><TextInput value={form.StreetAddress} onChange={onChange('StreetAddress')} placeholder="123 Main St" /></L>
            <L label="StreetAddress2"><TextInput value={form.StreetAddress2} onChange={onChange('StreetAddress2')} placeholder="Unit 2" /></L>
            <L label="City" req><TextInput value={form.City} onChange={onChange('City')} placeholder="Austin" /></L>
            <L label="State" req><TextInput value={form.State} onChange={onChange('State')} placeholder="TX" /></L>
            <L label="PostalCode" req><TextInput value={form.PostalCode} onChange={onChange('PostalCode')} placeholder="78701" /></L>
          </div>

          {/* Guardian block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <L label="Guardian"><TextInput value={form.Guardian} onChange={onChange('Guardian')} /></L>
            <L label="GuardianRelationship"><TextInput value={form.GuardianRelationship} onChange={onChange('GuardianRelationship')} /></L>
            <L label="GuardianAddress"><TextInput value={form.GuardianAddress} onChange={onChange('GuardianAddress')} /></L>
            <L label="GuardianAddress2"><TextInput value={form.GuardianAddress2} onChange={onChange('GuardianAddress2')} /></L>
            <L label="GuardianCity"><TextInput value={form.GuardianCity} onChange={onChange('GuardianCity')} /></L>
            <L label="GuardianPostalCode"><TextInput value={form.GuardianPostalCode} onChange={onChange('GuardianPostalCode')} /></L>
            <L label="GuardianState"><TextInput value={form.GuardianState} onChange={onChange('GuardianState')} /></L>
            <L label="GuardianPhone"><TextInput value={form.GuardianPhone} onChange={onChange('GuardianPhone')} /></L>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <PrimaryButton variant="outline" type="button" onClick={onClose}>Cancel</PrimaryButton>
            <PrimaryButton type="submit" disabled={submitting || !externalClientID}>
              {submitting ? 'Saving…' : 'Save Patient'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function L({ label, req, children, helper }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-medium">{label}</span>
        {req ? <span className="text-red-600">*</span> : null}
        {helper ? <span className="text-xs opacity-60">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}
