// EvexiaOrderList.js (drop-in, fixed)
// See header comments in your original file for behavior.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { motion } from 'framer-motion';
import { PrimaryButton } from '../../../components/button/Buttons';
import Card from '../../../components/cards/Card';
import TextInput from '../../../components/inputs/InputText';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Download,
  Plus,
  RefreshCcw
} from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';

import './EvexiaOrderList.css';

/**
 * EvexiaOrderList
 * Props:
 *  - apiPath (GET) default '/api/evexia/order-list'
 *  - pageSize
 *  - patientId (optional) -> sent as PatientID
 *  - externalOrderId (optional) -> sent as ExternalOrderID
 *  - externalClientID (optional) -> sent as ExternalClientID (preferred if provided)
 *  - patientList (optional) -> array or csv string -> sent as PatientList
 *  - orderAddPath (POST) default '/api/evexia/order-add'
 *  - orderDeletePath (POST) default '/api/evexia/order-delete'
 */

export default function EvexiaOrderList({
  apiPath = '/api/evexia/order-list',
  pageSize = 25,
  patientId = null,
  externalOrderId = null,
  externalClientID = null, // prop
  patientList = null,
  orderAddPath = '/api/evexia/order-add',
  orderDeletePath = '/api/evexia/order-delete'
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'CreateDate', dir: 'desc' });
  const { user } = useAuth();

  // local fallback state only used when externalClientID prop is NOT provided
  const [clientIDState, setClientIDState] = useState(null);

  // UI state for add/delete
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [showDeleteOrder, setShowDeleteOrder] = useState({
    open: false,
    row: null
  });
  const [actionError, setActionError] = useState('');

  const abortRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // If parent didn't pass externalClientID, fetch it once and store locally.
  useEffect(() => {
    if (externalClientID) {
      setClientIDState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/evexia/client-id');
        const j = await r.json();
        if (!cancelled)
          setClientIDState(j.externalClientID || j.ExternalClientID || null);
      } catch {
        if (!cancelled) setClientIDState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalClientID]);

  // effective client id used everywhere
  const clientID = externalClientID ?? clientIDState;

  // ----- helpers to read API shapes ---------------------------------------
  const get = useCallback((obj, ...keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null)
        return obj[k];
    }
    return undefined;
  }, []);

  const fullName = useCallback(
    (r) => {
      const fn = get(r, 'FirstName', 'first_name', 'firstName', 'first');
      const ln = get(r, 'LastName', 'last_name', 'lastName', 'last');
      return [fn, ln].filter(Boolean).join(' ').trim();
    },
    [get]
  );

  const fields = useMemo(
    () => ({
      patientId: (r) => get(r, 'PatientID', 'patientId', 'patient_id'),
      orderId: (r) =>
        get(r, 'PatientOrderID', 'PatientOrderId', 'patientOrderId', 'id'),
      clientId: (r) => get(r, 'ClientID', 'ClientId', 'clientId'),
      createDate: (r) =>
        get(r, 'CreateDate', 'createDate', 'created_at', 'Create_Date'),
      dob: (r) => get(r, 'DOB', 'dob'),
      gender: (r) => get(r, 'Gender', 'gender'),
      status: (r) => get(r, 'Status', 'status'),
      statusDescr: (r) =>
        get(r, 'StatusDescr', 'statusDescr', 'status_description'),
      submitDate: (r) => get(r, 'SubmitDate', 'submitDate'),
      orderType: (r) => get(r, 'OrderType', 'orderType'),
      phlebotomyOption: (r) => get(r, 'PhlebotomyOption', 'phlebotomyOption'),
      externalClientID: (r) =>
        get(r, 'ExternalClientID', 'ExternalClientId', 'externalClientID'),
      externalOrderId: (r) =>
        get(r, 'ExternalOrderID', 'ExternalOrderId', 'externalOrderId'),
      city: (r) => get(r, 'City', 'city'),
      state: (r) => get(r, 'State', 'state'),
      email: (r) => get(r, 'EmailAddress', 'email')
    }),
    [get]
  );

  const parseDate = (v) => {
    if (!v) return undefined;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    try {
      return new Date(Date.parse(v));
    } catch {
      return undefined;
    }
  };

  const normalize = useCallback(
    (rows) =>
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
        createDate: fields.createDate(r)
          ? parseDate(fields.createDate(r))
          : undefined,
        dob: fields.dob(r) ? parseDate(fields.dob(r)) : undefined,
        submitDate: fields.submitDate(r)
          ? parseDate(fields.submitDate(r))
          : undefined,
        orderType: fields.orderType(r) ?? '',
        phlebotomyOption: fields.phlebotomyOption(r) ?? '',
        externalClientID: fields.externalClientID(r) ?? '',
        externalOrderId: fields.externalOrderId(r) ?? ''
      })),
    [fields, fullName]
  );

  // ----- build params & fetch --------------------------------------------
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    // require PatientID for Evexia OrderList — prevent 400
    if (patientId == null || patientId === '') return null;
    params.set('PatientID', String(patientId));
    if (debouncedQuery) params.set('q', debouncedQuery);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (sort?.key) params.set('sortKey', sort.key);
    if (sort?.dir) params.set('sortDir', sort.dir);

    if (Array.isArray(patientList) && patientList.length)
      params.set('PatientList', patientList.join(','));
    else if (typeof patientList === 'string' && patientList.trim())
      params.set('PatientList', patientList.trim());

    if (externalOrderId != null && externalOrderId !== '') {
      params.set('ExternalOrderID', String(externalOrderId));
      params.set('externalOrderId', String(externalOrderId));
    }
    if (clientID != null && clientID !== '')
      params.set('ExternalClientID', String(clientID));
    return params;
  }, [
    patientId,
    debouncedQuery,
    page,
    pageSize,
    sort,
    patientList,
    externalOrderId,
    clientID
  ]);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const params = buildParams();
      if (!params) {
        // no patient selected — clear list
        setData([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const url = `${apiPath}${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ctrl.signal
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Request failed ${res.status}: ${body.slice(0, 500)}`);
      }
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('application/pdf')) {
        throw new Error(
          'Endpoint returned PDF. Use the JSON list endpoint for this component.'
        );
      }
      const json = await res.json().catch(() => null);

      let list = [];
      if (Array.isArray(json)) {
        list = json;
        setTotal(json.length);
      } else if (json && Array.isArray(json.results)) {
        list = json.results;
        setTotal(
          Number.isFinite(json.total) ? json.total : json.results.length
        );
      } else if (json && Array.isArray(json.items)) {
        list = json.items;
        setTotal(Number.isFinite(json.total) ? json.total : json.items.length);
      } else if (json && Array.isArray(json.data)) {
        list = json.data;
        setTotal(Number.isFinite(json.total) ? json.total : json.data.length);
      } else if (json && typeof json === 'object' && !Array.isArray(json)) {
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

  useEffect(() => {
    // refetch when identifying props change
    setPage(0);
    fetchData();
    return () => abortRef.current && abortRef.current.abort();
  }, [fetchData, patientId, externalOrderId, clientID, patientList]);

  // debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(
      () => setDebouncedQuery(query.trim()),
      300
    );
    return () => clearTimeout(searchDebounceRef.current);
  }, [query]);

  // ----- client-side filtering/sorting/paging fallback --------------------
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
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
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

  const totalPages = Math.max(
    1,
    Math.ceil((total || sorted.length) / pageSize)
  );
  const pageData = useMemo(() => {
    if (
      data.length > 0 &&
      data.length <= pageSize &&
      total &&
      total !== data.length
    ) {
      return data;
    }
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [data, sorted, page, pageSize, total]);

  const setSortKey = useCallback((key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }, []);

  const exportCsv = useCallback(() => {
    if (!sorted || sorted.length === 0) return;
    const rows = [
      [
        'Name',
        'PatientID',
        'PatientOrderID',
        'ClientID',
        'Email',
        'City',
        'State',
        'Status',
        'StatusDescr',
        'CreateDate',
        'SubmitDate',
        'DOB',
        'Gender',
        'OrderType',
        'PhlebotomyOption',
        'ExternalOrderID',
        'ExternalClientID'
      ],
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

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evexia_orders.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [sorted]);

  // ----- order add/delete handlers ---------------------------------------
  const handleAddOrder = async (payload) => {
    setActionError('');
    setAddBusy(true);
    try {
      if (patientId && !payload.PatientID) payload.PatientID = patientId;
      if (clientID && !payload.ExternalClientID)
        payload.ExternalClientID = clientID;

      const res = await fetch(orderAddPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const bodyText = await res.text().catch(() => '');
      if (!res.ok)
        throw new Error(bodyText || `Add order failed ${res.status}`);
      await fetchData();
      setShowAddOrder(false);
    } catch (e) {
      setActionError(e?.message || 'Failed to add order');
    } finally {
      setAddBusy(false);
    }
  };
  const handleDeleteOrderItem = async (row, externalClientID) => {
    try {
      const params = new URLSearchParams({
        patientOrderID: row.orderId || row.PatientOrderID || '',
        externalClientID: row.externalClientID || externalClientID || '',
        productID: row.productID || row.ProductID || '',
        isPanel: row.isPanel ? '1' : '0'
      });

      const res = await fetch(
        `/api/evexia/order-item-delete?${params.toString()}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' }
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || `Delete failed (${res.status})`);
      await fetchData();
      setShowDeleteOrder({ open: false, row: null });
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to delete order item');
    }
  };

  // ----- render -----------------------------------------------------------
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Card className="orders-header">
              Orders for {user.first_name} {user.last_name}
            </Card>
          </div>
        </div>

        {/* buttons: space-x works even if children are components */}
      </div>
      <div className="search-container">
        <div className="search-icon">
          <Search />
        </div>

        {/* remove inline // comment — JSX will break otherwise */}
        <TextInput
          id="evexia-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search..."
          customCssInput="search-input"
        />
      </div>

      {actionError && <div className="text-sm text-red-600">{actionError}</div>}
      <Card className="rounded-2xl shadow-sm">
        {error ? (
          <div
            className="p-4 text-sm text-red-600"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        ) : (
          <div
            className="w-full overflow-x-auto max-h-[70vh]"
            aria-busy={loading}
          >
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
                    <th
                      key={c.key}
                      className="px-3 py-2 font-medium select-none"
                      {...(sort.key === c.key
                        ? {
                            'aria-sort':
                              sort.dir === 'asc' ? 'ascending' : 'descending'
                          }
                        : {})}
                    >
                      <PrimaryButton
                        onClick={() => setSortKey(c.key)}
                        className="inline-flex items-center gap-1"
                        aria-label={`Sort by ${c.label}`}
                      >
                        {c.label}
                        {sort.key === c.key ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : null}
                      </PrimaryButton>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`s-${i}`} className="border-b">
                      <td colSpan={10} className="px-3 py-3">
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
                      colSpan={10}
                      className="px-3 py-6 text-center text-sm opacity-70"
                    >
                      No results
                    </td>
                  </tr>
                ) : (
                  pageData.map((row, idx) => (
                    <OrderRowWithItems
                      key={`${row.orderId || row.patientId || `r-${page}-${idx}`}`}
                      row={row}
                      onRefresh={fetchData}
                      externalClientID={clientID}
                      onRequestDeleteOrder={(r) =>
                        setShowDeleteOrder({ open: true, row: r })
                      }
                      onDeleteOrderItem={handleDeleteOrderItem}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
          <div>
            Page {page + 1} / {totalPages} · {total || sorted.length} total
          </div>
          <div className="flex items-center gap-1">
            <PrimaryButton
              variant="outline"
              size="sm"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              First
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              Last
            </PrimaryButton>
          </div>
        </div>
      </Card>
      {/* Add Order Dialog */}
      {showAddOrder && (
        <AddOrderDialog
          onClose={() => {
            setShowAddOrder(false);
            setActionError('');
          }}
          onCreate={(payload) => handleAddOrder(payload)}
          defaultPatientId={patientId}
          defaultExternalClientID={clientID}
          busy={addBusy}
          error={actionError}
        />
      )}
      {/* Delete Order Confirm */}
      {/* Delete Order Item Confirm */}
      {showDeleteOrder.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border p-4">
            <div className="font-semibold mb-2">Delete Order Item</div>
            <div className="text-sm mb-4">
              Are you sure you want to remove this <strong>order item</strong> (
              <strong>
                {showDeleteOrder.row?.productID ||
                  showDeleteOrder.row?.ProductID ||
                  showDeleteOrder.row?.ProductId ||
                  '—'}
              </strong>
              ) from order{' '}
              <strong>
                {showDeleteOrder.row?.orderId ||
                  showDeleteOrder.row?.externalOrderId ||
                  '—'}
              </strong>{' '}
              for patient{' '}
              <strong>{showDeleteOrder.row?.patientId || '—'}</strong>? This
              will permanently remove the item from the order and cannot be
              undone.
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <PrimaryButton
                variant="outline"
                onClick={() => setShowDeleteOrder({ open: false, row: null })}
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={() =>
                  handleDeleteOrderItem(showDeleteOrder.row, externalClientID)
                }
              >
                Delete Item
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- AddOrderDialog ----------------- */
function AddOrderDialog({
  onClose,
  onCreate,
  defaultPatientId = '',
  defaultExternalClientID = '',
  busy = false,
  error = ''
}) {
  const [form, setForm] = useState({
    PatientID: defaultPatientId || '',
    ExternalOrderID: '',
    OrderType: '',
    PhlebotomyOption: '',
    ExternalClientID: defaultExternalClientID || ''
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      PatientID: defaultPatientId || '',
      ExternalClientID: defaultExternalClientID || ''
    }));
  }, [defaultPatientId, defaultExternalClientID]);

  const onChange = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.PatientID) return alert('PatientID required to create order');
    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Add Order</div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-2 py-1 border rounded"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            PatientID (required)
            <input
              value={form.PatientID}
              onChange={onChange('PatientID')}
              className="block w-full mt-1 p-2 border rounded"
            />
          </label>
          <label className="text-sm">
            OrderType
            <input
              value={form.OrderType}
              onChange={onChange('OrderType')}
              className="block w-full mt-1 p-2 border rounded"
            />
          </label>
          <label className="text-sm">
            PhlebotomyOption
            <input
              value={form.PhlebotomyOption}
              onChange={onChange('PhlebotomyOption')}
              className="block w-full mt-1 p-2 border rounded"
            />
          </label>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-3 py-1 border rounded"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 text-white"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ----------------- AddItemDialog & helpers ----------------- */
function AddItemDialog({ onClose, onDone, patientOrderID, externalClientID }) {
  const [productInput, setProductInput] = useState('');
  const [isPanel, setIsPanel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setErr('');
    if (!patientOrderID) return setErr('Missing patientOrderID');
    const trimmed = String(productInput || '').trim();
    if (!trimmed)
      return setErr('Enter productID or comma-separated productIDList');

    setBusy(true);
    try {
      const multiple = trimmed.includes(',');
      const endpoint = multiple
        ? '/api/evexia/order-items-add'
        : '/api/evexia/order-item-add';
      const body = multiple
        ? {
            patientOrderID: Number(patientOrderID),
            externalClientID: externalClientID || '',
            productIDList: trimmed,
            isPanel: isPanel ? 'true' : 'false'
          }
        : {
            patientOrderID: Number(patientOrderID),
            externalClientID: externalClientID || '',
            productID: Number(trimmed),
            isPanel: isPanel ? 'true' : 'false'
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) throw new Error(text || `Error ${res.status}`);
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to add item(s)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-lg p-4 shadow"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Add Item(s) to Order</div>
          <button type="button" onClick={onClose} className="text-sm px-2 py-1">
            Close
          </button>
        </div>

        <div className="mb-2 text-xs text-gray-600">
          Order ID: <strong>{patientOrderID}</strong>
        </div>

        <label className="block mb-2 text-sm">
          Product ID or CSV (e.g. 200018 or 200018,6724)
          <input
            className="block w-full mt-1 p-2 border rounded"
            value={productInput}
            onChange={(e) => setProductInput(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={isPanel}
            onChange={(e) => setIsPanel(e.target.checked)}
          />
          <span>Is panel?</span>
        </label>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 border rounded"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 rounded bg-blue-600 text-white"
            disabled={busy}
          >
            {busy ? 'Adding…' : 'Add Item(s)'}
          </button>
        </div>
      </form>
    </div>
  );
}



/* ----------------- OrderRowWithItems ----------------- */
function OrderRowWithItems({
  row,
  onRefresh,
  externalClientID,
  onRequestDeleteOrder,
  onDeleteOrderItem
}) {
  const [open, setOpen] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const patientOrderID =
    row.orderId || row.PatientOrderID || row._raw?.PatientOrderID;

  const resolveItems = () => {
    const raw = row._raw || {};
    if (Array.isArray(raw.OrderItems) && raw.OrderItems.length)
      return raw.OrderItems;
    if (Array.isArray(raw.Items) && raw.Items.length) return raw.Items;
    if (Array.isArray(raw.Products) && raw.Products.length) return raw.Products;
    if (Array.isArray(raw.Tests) && raw.Tests.length) return raw.Tests;
    if (typeof raw.ProductList === 'string' && raw.ProductList.trim()) {
      return raw.ProductList.split(',').map((p) => ({ productID: p.trim() }));
    }
    if (raw.productID) return [{ productID: raw.productID }];
    return [];
  };

  const items = resolveItems();

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        {/* NAME cell: name + inline (hidden-by-default) actions */}
        <td className="px-3 py-3 align-middle">
          <div
            className="name-actions-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              whiteSpace: 'nowrap'
            }}
          >
            {/* name (won't shrink) */}
            <div
              className="name-text"
              style={{ flex: '0 0 auto', marginRight: 8 }}
            >
              {row.name || '—'}
            </div>

            {/* actions: do not allow them to shrink or wrap; buttons forced inline */}
            <div
              className="row-actions"
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flex: '0 0 auto'
              }}
            >
              <PrimaryButton
                variant="outline"
                className="row-icon-btn inline-flex w-auto"
                style={{
                  display: 'inline-flex',
                  width: 'auto',
                  height: 36,
                  width: 36,
                  marginRight: 45
                }}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? 'Collapse details' : 'Expand details'}
              >
                {open ? (
                  <ChevronUp className="h-6 w-6" />
                ) : (
                  <ChevronDown className="h-6 w-6" />
                )}
              </PrimaryButton>
              <PrimaryButton
                variant="outline"
                className="inline-flex w-auto"
                style={{ display: 'inline-flex', width: 'auto' }}
                onClick={() => setShowAddItem(true)}
              >
                Add Order Item (Think Amazon Shopping Cart)
              </PrimaryButton>

              <PrimaryButton
                variant="outline"
                className="inline-flex w-auto"
                style={{ display: 'inline-flex', width: 'auto' }}
                onClick={() => onDeleteOrderItem(row, externalClientID)}
              >
                Delete Order Item (Like Remove Ptau)
              </PrimaryButton>
            </div>
          </div>
        </td>

        {/* other columns (keep count equal to headers) */}
        <td className="px-3 py-3">{row.patientId || ''}</td>
        <td className="px-3 py-3">{row.orderId || ''}</td>
        <td className="px-3 py-3">{row.clientId || ''}</td>
        <td className="px-3 py-3">{row.email || ''}</td>
        <td className="px-3 py-3">{row.city || ''}</td>
        <td className="px-3 py-3">{row.state || ''}</td>
        <td className="px-3 py-3">{row.statusDescr || row.status || ''}</td>

        {/* Created column */}
        <td className="px-3 py-3">
          {row.createDate ? row.createDate.toLocaleString() : ''}
        </td>

        {/* keep a final empty TD if your header expects an actions column — this preserves column count */}
        <td className="px-3 py-3" />
      </tr>

      {open && (
        <tr className="border-b bg-gray-50/60">
          <td className="px-3 py-3" colSpan={11}>
            {actionErr && (
              <div className="text-sm text-red-600 mb-2">{actionErr}</div>
            )}

            <div className="mb-3 text-xs">
              <strong>Order ID:</strong> {patientOrderID || '—'} ·{' '}
              <strong>ExternalClientID:</strong>{' '}
              {externalClientID || row.externalClientID || '—'}
            </div>

            <div className="mb-3">
              <div className="font-medium text-sm mb-2">Items</div>
              {items.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No item list found in order JSON. Inspect order._raw for
                  details.
                </div>
              ) : (
                <ul className="text-sm space-y-1">
                  {items.map((it, idx) => {
                    const productID =
                      typeof it === 'string'
                        ? it
                        : it.productID ||
                          it.ProductID ||
                          it.ProductId ||
                          it.id ||
                          it.ID;
                    const name =
                      it.name || it.Description || it.description || productID;
                    const isPanelFlag =
                      it.isPanel === true ||
                      it.isPanel === 'true' ||
                      it.isPanel === '1' ||
                      it.isPanel === 1;
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="text-sm">
                          {name}{' '}
                          <span className="text-xs opacity-60">
                            ({productID})
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <PrimaryButton
                            variant="outline"
                            className="inline-flex w-auto"
                            style={{ display: 'inline-flex', width: 'auto' }}
                            onClick={() =>
                              onDeleteOrderItem(row, externalClientID)
                            }
                          >
                            Delete Order Item (Like Remove Ptau)
                          </PrimaryButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <pre className="text-xs overflow-auto max-h-72 rounded bg-white p-3 border">
              {JSON.stringify(row._raw, null, 2)}
            </pre>
          </td>
        </tr>
      )}

      {showAddItem && (
        <AddItemDialog
          patientOrderID={patientOrderID}
          externalClientID={externalClientID || row.externalClientID}
          onClose={() => setShowAddItem(false)}
          onDone={() => {
            setShowAddItem(false);
            onRefresh && onRefresh();
          }}
        />
      )}
    </>
  );
}
