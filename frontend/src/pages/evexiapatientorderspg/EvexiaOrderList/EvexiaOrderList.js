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
  orderItemDeletePath = '/api/evexia/order-item-delete'
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'CreateDate', dir: 'desc' });
  const APOE_PRODUCT_ID = 6724;
  const PTAU_PRODUCT_ID = 200018;

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

      const listWithProducts = await Promise.all(
        list.map(async (order) => {
          try {
            const res = await fetch(
              `/api/evexia/order-detail?PatientID=${order.PatientID}&PatientOrderID=${order.PatientOrderID}`
            );
            const detail = await res.json();
            const productID =
              detail.upstream?.ProductID ||
              (Array.isArray(detail.upstream?.OrderItems) &&
                detail.upstream.OrderItems[0]?.ProductID);
            const productName =
              detail.upstream?.ProductName ||
              (Array.isArray(detail.upstream?.OrderItems) &&
                detail.upstream.OrderItems[0]?.ProductName);

            return { ...order, productID, productName };
          } catch (err) {
            console.warn(
              'Failed to fetch order detail for',
              order.PatientOrderID,
              err
            );
            return order;
          }
        })
      );

      // now push that enriched list into state
      setData(normalize(listWithProducts));
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
    console.log(q);
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

  const fetchOrderItems = async (patientID, patientOrderID) => {
    const res = await fetch(
      `/api/evexia/order-detail?PatientID=${patientID}&PatientOrderID=${patientOrderID}`
    );
    const data = await res.json();
    if (data.upstream?.ProductID) {
      // Single item
      return [
        {
          productID: data.upstream.ProductID,
          productName: data.upstream.ProductName
        }
      ];
    } else if (Array.isArray(data.upstream)) {
      // Some responses return multiple items
      return data.upstream.map((item) => ({
        productID: item.ProductID,
        productName: item.ProductName
      }));
    } else {
      return [];
    }
  };

 const handleDeleteOrderItem = async (row) => {
  try {
    const patientID = row.patientID || row.PatientID || row.patientId;
    const patientOrderID =
      row.patientOrderID || row.PatientOrderID || row.orderID || row.OrderID;
    const externalClientID = row.externalClientID || row.ExternalClientID;
    const isPanel = 'false';

    const detailRes = await fetch(
      `/api/evexia/order-detail?PatientID=${patientID}&PatientOrderID=${patientOrderID}`
    );
    const detailData = await detailRes.json();

    const productID =
      detailData.upstream?.ProductID ||
      (Array.isArray(detailData.upstream?.ProductList) &&
        detailData.upstream.ProductList[0]?.ProductID);

    if (!productID) {
      alert('No productID found for this order.');
      return;
    }

    const params = new URLSearchParams({
      patientOrderID,
      productID,
      externalClientID,
      isPanel
    });

    const res = await fetch(`/api/evexia/order-item-delete?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const data = await res.json();
    console.log('Delete result:', data);

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    alert('Order item deleted successfully');
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Error deleting order item');
  }
};
  // ----- render -----------------------------------------------------------
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* buttons: space-x works even if children are components */}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2
          style={{ marginBottom: '20px' }}
          className="text-lg font-semibold orders-header"
        >
          Orders for {user.first_name} {user.last_name}
          <PrimaryButton
            className="row-action-btn bg-[#f39c3f] hover:bg-[#e68a2f] text-white"
            onClick={() => setShowAddOrder(true)}
            style={{ marginLeft: '50px' }}
          >
            {/* <Plus className="w-4 h-4 mr-1"  /> */}
            Add Order
          </PrimaryButton>{' '}
        </h2>
      </div>

      {/* Search bar below */}
      <div className="search-container mb-4">
        <div className="search-icon">
          <Search />
        </div>

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
                      orderItemDeletePath={orderItemDeletePath} // <-- add this
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
    OrderType: '',
    PhlebotomyOption: '',
    ExternalClientID: defaultExternalClientID || '',
    CollectionDate: new Date().toISOString().split('T')[0] // default to today
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
    if (!form.CollectionDate)
      form.CollectionDate = new Date().toISOString().split('T')[0];
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

          <label className="text-sm">
            CollectionDate
            <input
              type="date"
              value={form.CollectionDate}
              onChange={onChange('CollectionDate')}
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
function OrderRowWithItems({ row, onRefresh, externalClientID }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const patientID = row.patientId || row.PatientID;
  const patientOrderID =
    row.patientOrderID ||
    row.PatientOrderID ||
    row.orderID ||
    row.OrderID ||
    row.orderId;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `/api/evexia/order-detail?PatientID=${patientID}&PatientOrderID=${patientOrderID}`
      );
      if (!res.ok) throw new Error('Failed to load order details');
      const data = await res.json();
      const upstream = data.upstream;
      const list =
        upstream?.OrderItems ||
        upstream?.Items ||
        upstream?.ProductList ||
        (Array.isArray(upstream) ? upstream : []) ||
        [];
      setItems(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [patientID, patientOrderID]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  // ---- Evexia API Actions (GET and POST endpoints) ----
  const handleEvexiaGet = async (endpoint, params) => {
    // Convert PascalCase → kebab-case (e.g. OrderEmpty → order-empty)
    const path = endpoint.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const url = `/api/evexia/${path}`;

    // Define which endpoints use GET
    const isGet =
      path.includes('delete') ||
      path.includes('empty') ||
      path.includes('cancel') ||
      path.includes('complete'); // ✅ includes submit/complete endpoints

    try {
      setBusy(true);

      // Prepare fetch options
      const finalUrl = isGet
        ? `${url}?${new URLSearchParams(params).toString()}`
        : url;

      const res = await fetch(finalUrl, {
        method: isGet ? 'GET' : 'POST',
        headers: isGet
          ? { Accept: 'application/json' }
          : {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
        ...(isGet ? {} : { body: JSON.stringify(params) })
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `Error ${res.status}`);

      await fetchItems();
      alert(`${endpoint} successful`);
    } catch (err) {
      alert(err.message || `${endpoint} failed`);
    } finally {
      setBusy(false);
    }
  };

  // --- Delete Item ---
  const handleDeleteItem = (productID) =>
    handleEvexiaGet('OrderItemDelete', {
      patientOrderID,
      externalClientID,
      productID,
      isPanel: 0
    });

  // --- Empty Order ---
  const handleEmptyOrder = () =>
    handleEvexiaGet('OrderEmpty', {
      patientID,
      patientOrderID,
      externalClientID
    });

  // --- Submit Order ---
  const handleSubmitOrder = (patientPay = false, includeFHR = false) =>
    handleEvexiaGet('PatientOrderComplete', {
      patientOrderID,
      externalClientID,
      patientPay,
      includeFHR,
      clientPhysicianID: 0
    });

  // --- Cancel Order ---
  const handleCancelOrder = () =>
    handleEvexiaGet('OrderCancel', {
      patientOrderID,
      externalClientID
    });

  return (
    <>
      {/* Table Row */}
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-3">
          <PrimaryButton
            variant="outline"
            className="inline-flex items-center"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </PrimaryButton>
          <span className="ml-3 font-medium">{row.name || '—'}</span>
        </td>
        <td className="px-3 py-3">{row.patientId}</td>
        <td className="px-3 py-3">{row.orderId}</td>
        <td className="px-3 py-3">{row.clientId}</td>
        <td className="px-3 py-3">{row.email}</td>
        <td className="px-3 py-3">{row.city}</td>
        <td className="px-3 py-3">{row.state}</td>
        <td className="px-3 py-3">{row.statusDescr || row.status}</td>
        <td className="px-3 py-3">
          {row.createDate ? row.createDate.toLocaleString() : ''}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={9} className="bg-gray-50 p-4">
            {error && <div className="text-red-600 mb-2">{error}</div>}

            {/* Cart Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">
                🛒 Order Cart — {items.length} item{items.length !== 1 && 's'}
              </div>
              <PrimaryButton variant="outline" onClick={fetchItems}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
              </PrimaryButton>
            </div>

            {/* Item List */}
            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-600">No items yet.</div>
            ) : (
              <ul className="divide-y border rounded bg-white mb-4">
                {items.map((it, idx) => {
                  const pid =
                    it.ProductID || it.productID || it.id || it.ID || '—';
                  const pname =
                    it.ProductName || it.productName || it.Description || pid;
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-medium">{pname}</span>{' '}
                        <span className="text-xs opacity-60">({pid})</span>
                      </div>
                      <PrimaryButton
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingDelete(pid)}
                      >
                        Remove
                      </PrimaryButton>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Add Section */}
            <div className="space-y-4 mt-4 border-t pt-3">
              <div className="font-semibold mb-2">🧪 Add Test to Order</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ProductButton
                  name="Phosphorylated Tau 217 (pTau-217) Plasma"
                  productID={200018}
                  clientID={externalClientID}
                  patientOrderID={patientOrderID}
                  fetchItems={fetchItems}
                />
                <ProductButton
                  name="APOE Genotype"
                  productID={6724}
                  clientID={externalClientID}
                  patientOrderID={patientOrderID}
                  fetchItems={fetchItems}
                />
              </div>
            </div>

            {/* Order Actions */}
            <div className="mt-6 border-t pt-3 space-y-3">
              <div className="font-semibold mb-2">⚙️ Order Actions</div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  variant="outline"
                  disabled={busy}
                  onClick={handleEmptyOrder}
                >
                  🧹 Empty Order
                </PrimaryButton>
                <PrimaryButton
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleSubmitOrder(false, false)}
                >
                  ✅ Submit Order
                </PrimaryButton>
                <PrimaryButton
                  variant="outline"
                  disabled={busy}
                  onClick={handleCancelOrder}
                >
                  ❌ Cancel Order
                </PrimaryButton>
              </div>
            </div>

            {/* Delete Confirm Modal */}
            {pendingDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-lg p-4 w-full max-w-sm shadow">
                  <div className="font-semibold mb-2">Confirm Delete</div>
                  <div className="text-sm mb-4">
                    Remove item <strong>{pendingDelete}</strong> from this
                    order?
                  </div>
                  <div className="flex justify-end gap-2">
                    <PrimaryButton
                      variant="outline"
                      onClick={() => setPendingDelete(null)}
                    >
                      Cancel
                    </PrimaryButton>
                    <PrimaryButton
                      onClick={() => {
                        handleDeleteItem(pendingDelete);
                        setPendingDelete(null);
                      }}
                    >
                      Delete
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ----------------- ProductButton ----------------- */
function ProductButton({
  name,
  productID,
  clientID,
  patientOrderID,
  fetchItems
}) {
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/evexia/order-item-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          patientOrderID: Number(patientOrderID),
          externalClientID: clientID,
          productID,
          isPanel: false
        })
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await fetchItems();
    } catch (err) {
      alert(err.message || `Failed to add ${name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PrimaryButton
      disabled={busy}
      onClick={handleAdd}
      className="flex flex-col items-start text-left h-full w-full rounded-xl border bg-white hover:bg-blue-50 transition-all duration-150 p-3 shadow-sm"
    >
      <div className="font-medium text-sm">{name}</div>
      <div className="text-xs opacity-60">Product ID: {productID}</div>
    </PrimaryButton>
  );
}
