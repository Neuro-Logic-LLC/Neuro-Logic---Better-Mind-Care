import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Download
} from 'lucide-react';

/**
 * PatientOrders (JavaScript version)
 *
 * A resilient, production-ready React component that fetches and displays
 * patient orders using your list endpoint. It includes:
 * - Streaming-safe fetch with AbortController
 * - Search, sort, and client-side pagination
 * - Expandable rows to view full raw JSON
 * - CSV export of the current filtered view
 * - Clean, minimal UI using Tailwind + shadcn/ui
 *
 * Props
 * ------
 * apiPath  string  -> endpoint that returns JSON (default: "/api/patients")
 * pageSize number  -> rows per page (default: 25)
 */
export default function PatientOrders({
  apiPath = '/api/patients',
  pageSize = 25
}) {
  const [data, setData] = useState([]); // array of patient/order objects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });
  const abortRef = useRef(null);

  // --- helpers -------------------------------------------------------------
  const get = (obj, ...keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null)
        return obj[k];
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
    orderId: (r) =>
      get(r, 'PatientOrderID', 'patientOrderId', 'patient_order_id'),
    email: (r) => get(r, 'EmailAddress', 'email', 'Email'),
    city: (r) => get(r, 'City', 'city'),
    state: (r) => get(r, 'State', 'state'),
    phone: (r) => get(r, 'Phone', 'phone'),
    updatedAt: (r) =>
      get(r, 'updated_at', 'UpdatedAt', 'updatedAt', 'LastUpdated'),
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
  const fetchData = async () => {
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
        throw new Error(
          'Endpoint returned PDF. Use the JSON list endpoint for this component.'
        );
      }

      const json = await res.json();
      const list = Array.isArray(json)
        ? json
        : (json && (json.patients || json.items)) || [];
      setData(normalize(list));
      setPage(0);
    } catch (err) {
      if (err && err.name === 'AbortError') return; // ignore cancellation
      setError((err && err.message) || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => abortRef.current && abortRef.current.abort();
  }, [apiPath]);

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
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const exportCsv = () => {
    const rows = [
      [
        'Name',
        'PatientID',
        'OrderID',
        'Email',
        'City',
        'State',
        'Phone',
        'Status',
        'UpdatedAt'
      ],
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

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- UI -----------------------------------------------------------------
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl font-semibold">Patient Orders</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{' '}
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, PatientID, OrderID, city, state"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : (
            <ScrollArea className="w-full">
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
                      <th
                        key={c.key}
                        className="px-3 py-2 font-medium select-none"
                      >
                        {c.key !== '_exp' ? (
                          <button
                            onClick={() => setSortKey(c.key)}
                            className="inline-flex items-center gap-1"
                          >
                            {c.label}
                            {sort.key === c.key ? (
                              sort.dir === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : null}
                          </button>
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
                          <motion.div
                            initial={{ opacity: 0.2 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.2,
                              repeatType: 'reverse'
                            }}
                            className="h-4 w-1/2 bg-gray-200 rounded"
                          />
                        </td>
                      </tr>
                    ))
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-6 text-center text-sm opacity-70"
                      >
                        No results
                      </td>
                    </tr>
                  ) : (
                    pageData.map((row, idx) => <Row key={idx} row={row} />)
                  )}
                </tbody>
              </table>
            </ScrollArea>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <div>
              Page {page + 1} / {totalPages} · {sorted.length} total
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
        <td className="px-3 py-2">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : ''}
        </td>
        <td className="px-3 py-2 text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-gray-50/60">
          <td className="px-3 py-3" colSpan={9}>
            <pre className="text-xs overflow-auto max-h-72 rounded bg-white p-3 border">
              {JSON.stringify(row._raw, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
