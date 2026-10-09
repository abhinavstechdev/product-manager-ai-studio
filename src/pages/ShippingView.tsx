import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Search, ExternalLink, Calendar, MapPin, PackageCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface ShippingViewProps {
  onRefresh: () => void;
}

export const ShippingView: React.FC<ShippingViewProps> = ({ onRefresh }) => {
  const [packedQueue, setPackedQueue] = useState<any[]>([]);
  const [shippedOrders, setShippedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch modal
  const [dispatchOrder, setDispatchOrder] = useState<any>(null);
  const [courier, setCourier] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const queueRes = await apiFetch<any>('/api/shipping/queue');
      const shippedRes = await apiFetch<any[]>('/api/shipping/shipped');
      setPackedQueue(queueRes.orders || []);
      setShippedOrders(shippedRes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiFetch(`/api/shipping/${dispatchOrder.id}/ship`, {
        method: 'POST',
        body: JSON.stringify({
          courier,
          tracking_number: trackingNumber,
          notes: dispatchNotes,
        }),
      });
      setDispatchOrder(null);
      setTrackingNumber('');
      setDispatchNotes('');
      onRefresh();
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    try {
      await apiFetch(`/api/shipping/${orderId}/deliver`, { method: 'POST' });
      onRefresh();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipping &amp; Logistics Desk</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch packed orders with courier tracking, execute atomic physical stock deductions, and verify final deliveries.
          </p>
        </div>
      </div>

      {/* Section 1: Packed Orders Awaiting Dispatch */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <h2 className="text-sm font-bold text-slate-900">Packed Orders Awaiting Courier Pickup</h2>
          </div>
          <span className="text-xs font-semibold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
            {packedQueue.length} Ready to Dispatch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-6 text-slate-400 text-xs">
              Loading ready orders...
            </div>
          ) : packedQueue.length === 0 ? (
            <div className="col-span-3 text-center py-8 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No orders waiting in packed status.
            </div>
          ) : (
            packedQueue.map((o) => (
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
                  <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Total Units:</span>
                    <strong className="text-slate-900 font-mono">{o.total_units}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setDispatchOrder(o);
                      setTrackingNumber(`TRK-${Math.floor(10000000 + Math.random() * 90000000)}`);
                    }}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Truck size={14} />
                    <span>Dispatch Order</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: In Transit & Shipped Orders */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Dispatched &amp; Delivered Orders Log</h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Courier Partner</th>
                  <th className="px-4 py-3">Tracking Number</th>
                  <th className="px-4 py-3">Shipping Status</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shippedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No dispatched orders found.
                    </td>
                  </tr>
                ) : (
                  shippedOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {o.customer_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {o.shipment?.courier || 'Standard Logistics'}
                      </td>
                      <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">
                        {o.shipment?.tracking_number || 'TRK-PENDING'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleDeliver(o.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PackageCheck size={13} />
                            <span>Mark Delivered</span>
                          </button>
                        )}
                        {o.status === 'DELIVERED' && (
                          <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Dispatch Order {dispatchOrder.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Submitting this dispatch executes an atomic inventory transaction: physical warehouse stock is deducted, reserved stock is cleared, and an immutable ledger record is created.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDispatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Courier Carrier *</label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
                >
                  <option value="BlueDart Express">BlueDart Express</option>
                  <option value="Delhivery Surface">Delhivery Surface</option>
                  <option value="DTDC Express">DTDC Express</option>
                  <option value="FedEx India">FedEx India</option>
                  <option value="India Post Speed Post">India Post Speed Post</option>
                  <option value="Self / Local Courier">Self / Local Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Tracking / AWB Number *</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono focus:border-cyan-500"
                  placeholder="e.g. BD-89102847"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Dispatch Remarks</label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
                  placeholder="e.g. Handed over to morning pickup executive"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDispatchOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Executing Dispatch...' : 'Confirm Dispatch & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
