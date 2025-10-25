import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { PrimaryButton } from '../../components/button/Buttons';
import Card from '../../components/cards/Card';
import EvexiaPatientList from './EvexiaPatientList';
import EvexiaOrderList from './EvexiaOrderList/EvexiaOrderList';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Download,
  Plus
} from 'lucide-react';

/**
 * One-page Patient + Orders view
 * - Left: EvexiaPatientList (handles its own fetch and Add Patient flow)
 * - Right: EvexiaOrderList (loads when a patient is selected)
 * - Parent owns selectedPatientId and selectedPatientName for header
 */
export default function PatientOrders({
  // only used for styling / defaults. EvexiaPatientList/OrderList do the fetching.
  pageSize = 25
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [ordersPaneOpen, setOrdersPaneOpen] = useState(false);
  const [ordersKey, setOrdersKey] = useState(0); // bump to force refetch UI if needed

  // callback passed to EvexiaPatientList
  // p can be id or object; be defensive
  const handleSelectPatient = useCallback((p) => {
    // EvexiaPatientList calls with id; but in case it passes a row object, accept that too
    let id = null;
    let name = '';
    if (p == null) {
      id = null;
    } else if (typeof p === 'object') {
      id = p.id ?? p.PatientID ?? p.patientId ?? null;
      const first = p.FirstName ?? p.firstName ?? p.first ?? '';
      const last = p.LastName ?? p.lastName ?? p.last ?? '';
      name = `${first} ${last}`.trim();
    } else {
      id = p;
    }

    setSelectedPatientId(id);
    if (name) setSelectedPatientName(name);
    setOrdersPaneOpen(!!id);
    // bump key to force EvexiaOrderList to treat this as a new request (optional)
    setOrdersKey((k) => k + 1);
  }, []);

  // quick UI helpers
  const clearSelection = useCallback(() => {
    setSelectedPatientId(null);
    setSelectedPatientName('');
    setOrdersPaneOpen(false);
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* header / actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl font-semibold">Patients & Orders</div>
      </div>

      {/* two-column layout - left patient list, right orders */}
      <div className="grid grid-cols-1 md:grid-cols-[480px_1fr] gap-4 items-start">
        {/* left: patient list component - it manages its own fetch/add */}
        <div className="min-h-[320px]">
          {/* pass callback so patient list selection opens the orders panel */}
          <EvexiaPatientList
            onSelectPatient={(idOrRow) => handleSelectPatient(idOrRow)}
          />
        </div>

        {/* right: order list or placeholder */}
        <div>
          <Card className="rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-gray-600">Orders</div>
                <div className="text-lg font-medium">
                  {ordersPaneOpen
                    ? `Patient ${selectedPatientId}${selectedPatientName ? ` — ${selectedPatientName}` : ''}`
                    : 'No patient selected'}
                </div>
              </div>
              <div className="flex items-center gap-2"></div>
            </div>

            <div>
              {ordersPaneOpen && selectedPatientId ? (
                // EvexiaOrderList will fetch orders for the chosen patient
                <EvexiaOrderList
                  key={`orders-${ordersKey}-${selectedPatientId}`}
                  patientId={selectedPatientId}
                  pageSize={pageSize}
                />
              ) : (
                <div className="text-sm text-gray-500 p-6">
                  Select a patient on the left to view orders. You can add
                  patients from the left panel.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
