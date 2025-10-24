// EvexiaOrderList.js (drop-in)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PrimaryButton } from '../../components/button/Buttons';
import Card from '../../components/cards/Card';
import TextInput from '../../components/inputs/InputText';
import { ChevronDown, ChevronUp, RefreshCw, Search, Download } from 'lucide-react';

/**
 * EvexiaOrderList
 * Props:
 *  - apiPath (default '/api/evexia/order-list')
 *  - pageSize
 *  - patientId (optional) -> will be sent as PatientID
 *  - externalOrderId (optional) -> will be sent as ExternalOrderID (and externalOrderId)
 *  - externalClientID (optional) -> will be sent as ExternalClientID
 *  - patientList (optional) -> array or csv string -> will be sent as PatientList (CSV)
 */
export default function EvexiaOrderList({
  apiPath = '/api/evexia/order-list',
  pageSize = 25,
  patientId = null,
  externalOrderId = null,
  externalClientID = null,
  patientList = null
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'CreateDate', dir: 'desc' });

  const abortRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // small helper to read multiple possible keys
  const get = useCallback((obj, ...keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
    }
    return undefined;
  }, []);

  const fullName = useCallback((r) => {
    const fn = get(r, 'FirstName', 'first_name', 'firstName', 'first');
    const ln = get(r, 'LastName', 'last_name', 'lastName', 'last');
    return [fn, ln].filter(Boolean).join(' ').trim();
  }, [get]);

  const fields = useMemo(() => ({
    patientId: (r) => get(r, 'PatientID', 'patientId', 'patient_id'),
    orderId: (r) => get(r, 'PatientOrderID', 'PatientOrderId', 'patientOrderId', 'id'),
    clientId: (r) => get(r, 'ClientID', 'ClientId', 'clientId'),
    createDate: (r) => get(r, 'CreateDate', 'createDate', 'created_at', 'Create_Date'),
    dob: (r) => get(r, 'DOB', 'dob'),
    gender: (r) => get(r, 'Gender', 'gender'),
    status: (r) => get(r, 'Status', 'status'),
    statusDescr: (r) => get(r, 'StatusDescr', 'statusDescr', 'status_description'),
    submitDate: (r) => get(r, 'SubmitDate', 'submitDate'),
    orderType: (r) => get(r, 'OrderType', 'orderType'),
    phlebotomyOption: (r) => get(r, 'PhlebotomyOption', 'phlebotomyOption'),
    externalClientID: (r) => get(r, 'ExternalClientID', 'ExternalClientId', 'externalClientID'),
    externalOrderId: (r) => get(r, 'ExternalOrderID', 'ExternalOrderId', 'externalOrderId'),
    city: (r) => get(r, 'City', 'city'),
    state: (r) => get(r, 'State', 'state'),
    email: (r) => get(r, 'EmailAddress', 'email')
  }), [get]);

  const parseDate = (v) => {
    if (!v) return undefined;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    try { return new Date(Date.parse(v.replace(/(\d)\/(\d)\/(\d{4})/, (m) => m))); } catch { return undefined; }
  };

  const normalize = useCallback((rows) =>
    rows.map((r) => ({
      _raw: r,
      name: fullName(r),
      patientId: fields.patientId(r) ?? '',
      orderId: fields.orderId(r) ?? '',
      clientId: fields.clientId(r) ?? '',
      email: fields.email(r) ?? '',
      city: fields.city(r) ?? '',
      state: fields.state(r) ?? '',
      status: fields.status(r) ?? '',
      statusDescr: fields.statusDescr(r) ?? '',
      createDate: fields.createDate(r) ? parseDate(fields.createDate(r)) : undefined,
      dob: fields.dob(r) ? parseDate(fields.dob(r)) : undefined,
      submitDate: fields.submitDate(r) ? parseDate(fields.submitDate(r)) : undefined,
      orderType: fields.orderType(r) ?? '',
      phlebotomyOption: fields.phlebotomyOption(r) ?? '',
      externalClientID: fields.externalClientID(r) ?? '',
      externalOrderId: fields.externalOrderId(r) ?? ''
    })), [fields, fullName]
  );

  // Build URL params including Evexia-specific ones
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (sort?.key) params.set('sortKey', sort.key);
    if (sort?.dir) params.set('sortDir', sort.dir);

    // Evexia-specific parameters:
    if (patientId != null && patientId !== '') params.set('PatientID', String(patientId));
    if (Array.isArray(patientList) && patientList.length) params.set('PatientList', patientList.join(','));
    else if (typeof patientList === 'string' && patientList.trim()) params.set('PatientList', patientList.trim());

    if (externalOrderId != null && externalOrderId !== '') {
      params.set('ExternalOrderID', String(externalOrderId));
      // some backends expect camelCase — send both
      params.set('externalOrderId', String(externalOrderId));
    }
    if (externalClientID != null && externalClientID !== '') params.set('ExternalClientID', String(externalClientID));

    return params;
  }, [debouncedQuery, page, pageSize, sort, patientId, externalOrderId, externalClientID, patientList]);

  // Fetch data — re-runs when the identifying props change (patientId, externalOrderId, etc)
  const fetchData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const params = buildParams();
      const url = `${apiPath}${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ctrl.signal
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // surface server body to help debugging (like "Missing PatientID")
        throw new Error(`Request failed ${res.status}: ${body.slice(0, 500)}`);
      }
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('application/pdf')) {
        throw new Error('Endpoint returned PDF. Use the JSON list endpoint for this component.');
      }
      const json = await res.json().catch(() => null);

      let list = [];
      if (Array.isArray(json)) {
        list = json;
        setTotal(json.length);
      } else if (json && Array.isArray(json.results)) {
        list = json.results;
        setTotal(Number.isFinite(json.total) ? json.total : json.results.length);
      } else if (json && Array.isArray(json.items)) {
        list = json.items;
        setTotal(Number.isFinite(json.total) ? json.total : json.items.length);
      } else if (json && Array.isArray(json.data)) {
        list = json.data;
        setTotal(Number.isFinite(json.total) ? json.total : json.data.length);
      } else if (json && typeof json === 'object' && !Array.isArray(json)) {
        // single-object responses sometimes happen
        list = [json];
        setTotal(1);
      } else {
        list = [];
        setTotal(0);
      }

      setData(normalize(list));
      setPage(json && Number.isFinite(json.page) ? json.page : page);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setError((err && err.message) || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [apiPath, buildParams, normalize, page]);

  // initial and reactive fetch: when patient/external ids change, reset page and fetch
  useEffect(() => {
    setPage(0);
    fetchData();
    return () => abortRef.current && abortRef.current.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, patientId, externalOrderId, externalClientID, patientList]);

  // debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [query]);

  // client-side fallback filtering/sorting/paging
  const filtered = useMemo(() => {
    const q = (debouncedQuery || '').toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [
        r.name,
        r.email,
        r.patientId && r.patientId.toString && r.patientId.toString(),
        r.orderId && r.orderId.toString && r.orderId.toString(),
        r.city,
        r.state,
        r.status,
        r.statusDescr,
        r.orderType,
        r.externalClientID
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, debouncedQuery]);

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

  const totalPages = Math.max(1, Math.ceil((total || sorted.length) / pageSize));
  const pageData = useMemo(() => {
    if (data.length > 0 && data.length <= pageSize && total && total !== data.length) {
      return data;
    }
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [data, sorted, page, pageSize, total]);

  const setSortKey = useCallback((key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  const exportCsv = useCallback(() => {
    if (!sorted || sorted.length === 0) return;
    const rows = [
      ['Name', 'PatientID', 'PatientOrderID', 'ClientID', 'Email', 'City', 'State', 'Status', 'StatusDescr', 'CreateDate', 'SubmitDate', 'DOB', 'Gender', 'OrderType', 'PhlebotomyOption', 'ExternalOrderID', 'ExternalClientID'],
      ...sorted.map((r) => [
        r.name,
        r.patientId,
        r.orderId,
        r.clientId,
        r.email,
        r.city,
        r.state,
        r.status,
        r.statusDescr,
        r.createDate ? r.createDate.toISOString() : '',
        r.submitDate ? r.submitDate.toISOString() : '',
        r.dob ? r.dob.toISOString() : '',
        r.gender || '',
        r.orderType || '',
        r.phlebotomyOption || '',
        r.externalOrderId || '',
        r.externalClientID || ''
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
    a.download = 'evexia_orders.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl font-semibold">Orders</div>
        <div className="flex items-center gap-2">
          <PrimaryButton variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </PrimaryButton>
          <PrimaryButton variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </PrimaryButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <TextInput
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search order id, patient, email, city, state, status"
            className="pl-9"
            aria-label="Search orders"
          />
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
                    { key: 'clientId', label: 'Client ID' },
                    { key: 'email', label: 'Email' },
                    { key: 'city', label: 'City' },
                    { key: 'state', label: 'State' },
                    { key: 'statusDescr', label: 'Status' },
                    { key: 'createDate', label: 'Created' }
                  ].map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium select-none" {...(sort.key === c.key ? { 'aria-sort': sort.dir === 'asc' ? 'ascending' : 'descending' } : {})}>
                      <PrimaryButton onClick={() => setSortKey(c.key)} className="inline-flex items-center gap-1" aria-label={`Sort by ${c.label}`}>
                        {c.label}
                        {sort.key === c.key ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                      </PrimaryButton>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`s-${i}`} className="border-b">
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
                  pageData.map((row, idx) => <OrderRow key={`${row.orderId || row.patientId || `r-${page}-${idx}`}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
          <div>Page {page + 1} / {totalPages} · {total || sorted.length} total</div>
          <div className="flex items-center gap-1">
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</PrimaryButton>
            <PrimaryButton variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function OrderRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-2 whitespace-nowrap">{row.name || '—'}</td>
        <td className="px-3 py-2">{row.patientId || ''}</td>
        <td className="px-3 py-2">{row.orderId || ''}</td>
        <td className="px-3 py-2">{row.clientId || ''}</td>
        <td className="px-3 py-2">{row.email || ''}</td>
        <td className="px-3 py-2">{row.city || ''}</td>
        <td className="px-3 py-2">{row.state || ''}</td>
        <td className="px-3 py-2">{row.statusDescr || row.status || ''}</td>
        <td className="px-3 py-2">{row.createDate ? row.createDate.toLocaleString() : ''}</td>
        <td className="px-3 py-2 text-right">
          <PrimaryButton variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Collapse details' : 'Expand details'}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </PrimaryButton>
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-gray-50/60">
          <td className="px-3 py-3" colSpan={10}>
            <div className="mb-2 text-xs">
              <strong>DOB:</strong> {row.dob ? row.dob.toLocaleString() : ''} · <strong>Gender:</strong> {row.gender || ''} · <strong>Submit:</strong> {row.submitDate ? row.submitDate.toLocaleString() : ''} · <strong>Type:</strong> {row.orderType || ''} · <strong>Phleb:</strong> {row.phlebotomyOption || ''} · <strong>ExternalOrderID:</strong> {row.externalOrderId || ''} · <strong>ExternalClientID:</strong> {row.externalClientID || ''}
            </div>
            <pre className="text-xs overflow-auto max-h-72 rounded bg-white p-3 border">{JSON.stringify(row._raw, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}