import React, { useState, useEffect } from 'react';
import { Box, Check, Printer, FileText, Search, Clock, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface PackingViewProps {
  onRefresh: () => void;
  initialSlipOrderId?: string;
  onClearInitialSlipOrderId?: () => void;
}

export const PackingView: React.FC<PackingViewProps> = ({
  onRefresh,
  initialSlipOrderId,
  onClearInitialSlipOrderId,
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [packModalOrder, setPackModalOrder] = useState<any>(null);
  const [packingNotes, setPackingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>('/api/packing/queue');
      setQueue(data.orders || []);

      if (initialSlipOrderId) {
        handleViewSlip(initialSlipOrderId);
        if (onClearInitialSlipOrderId) onClearInitialSlipOrderId();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleViewSlip = async (orderId: string) => {
    try {
      const slip = await apiFetch<any>(`/api/packing/slip/${orderId}`);
      setSelectedSlip(slip);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkPacked = async () => {
    if (!packModalOrder) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/packing/${packModalOrder.id}/pack`, {
        method: 'POST',
        body: JSON.stringify({ packing_notes: packingNotes }),
      });
      setPackModalOrder(null);
      setPackingNotes('');
      onRefresh();
      loadQueue();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = queue.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.shipping_address && o.shipping_address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Packing Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pick &amp; pack confirmed customer orders, print verified packing slips, and stage items for shipping.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Box size={15} />
          <span>{queue.length} Orders Awaiting Packing</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order # or Customer in Queue..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
            Loading packing queue...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            🎉 Great job! The packing queue is completely clear.
          </div>
        ) : (
          filteredQueue.map((o) => (
            <div
              key={o.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2">
                  <h4 className="font-semibold text-xs text-slate-900">{o.customer_name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{o.shipping_address}</p>
                </div>

                {/* Items preview */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 flex justify-between">
                    <span>Items to Pack:</span>
                    <span className="text-purple-700 font-bold">{o.total_quantity} units</span>
                  </div>
                  {(o.items || []).map((it: any) => (
                    <div key={it.id} className="flex justify-between text-slate-600">
                      <span className="truncate max-w-[180px]">
                        [{it.sku}] {it.product_name}
                      </span>
                      <strong className="text-slate-900 font-mono">x{it.quantity}</strong>
                    </div>
                  ))}
                </div>

                {o.packing_notes && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <strong>Note:</strong> {o.packing_notes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewSlip(o.id)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText size={13} />
                  <span>Packing Slip</span>
                </button>

                <button
                  onClick={() => {
                    setPackModalOrder(o);
                    setPackingNotes(o.packing_notes || '');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check size={13} />
                  <span>Mark Packed</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mark Packed Modal */}
      {packModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Packing: {packModalOrder.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Verify all items have been carefully inspected and securely sealed. This order will immediately move to the Shipping Dispatch queue.
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1 text-xs">
                Packing Notes / Seal Number
              </label>
              <textarea
                rows={2}
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs"
                placeholder="e.g. Packed in reinforced corrugated box with tamper seal #T991"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPackModalOrder(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPacked}
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
              >
                {submitting ? 'Updating...' : 'Confirm Packed & Move to Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Packing Slip Preview / Print Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-slate-300 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <div className="text-xl font-black text-slate-900 tracking-wider">PACKING SLIP</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedSlip.packing_slip_id}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-slate-900">NexusAI Apex Retail</div>
                <div className="text-[11px] text-slate-400">Order Ref: {selectedSlip.order_number}</div>
              </div>
            </div>

            {/* Ship To Address */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ship To Customer:</div>
              <div className="font-bold text-sm text-slate-900">{selectedSlip.customer.name}</div>
              {selectedSlip.customer.phone && (
                <div className="text-slate-600 font-mono">Tel: {selectedSlip.customer.phone}</div>
              )}
              <div className="text-slate-700 leading-relaxed">{selectedSlip.customer.shipping_address}</div>
            </div>

            {/* Items Checklist Table */}
            <div>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-center">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedSlip.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{it.sku}</td>
                      <td className="p-2.5 text-slate-700">{it.product_name}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 text-sm">{it.quantity}</td>
                      <td className="p-2.5 text-center">
                        <span className="inline-block w-4 h-4 border-2 border-slate-300 rounded"></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Packing instructions */}
            <div className="text-xs text-slate-600 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
              <strong className="text-amber-900">Packing Note:</strong> {selectedSlip.packing_notes}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Packing Slip</span>
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
