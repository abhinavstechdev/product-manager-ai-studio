import React, { useState, useEffect } from 'react';
import { RotateCcw, Plus, CheckCircle, XCircle, AlertTriangle, Package, Search } from 'lucide-react';
import { ReturnRecord, Order } from '../types';
import { apiFetch } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface ReturnsViewProps {
  orders: Order[];
  onRefresh: () => void;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ orders, onRefresh }) => {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<Array<{ sku: string; quantity: number; condition: 'DAMAGED' | 'SELLABLE' }>>([]);

  // Approve modal
  const [approveReturnRecord, setApproveReturnRecord] = useState<ReturnRecord | null>(null);
  const [restoreStock, setRestoreStock] = useState(true);
  const [refundAmount, setRefundAmount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadReturns = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ReturnRecord[]>('/api/returns');
      setReturns(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const eligibleOrders = orders.filter((o) => ['SHIPPED', 'DELIVERED'].includes(o.status));

  const handleOpenRegister = () => {
    const target = eligibleOrders[0];
    if (target) {
      setSelectedOrderId(target.id);
      const items = target.items || [];
      if (items.length > 0) {
        setReturnItems([
          { sku: items[0].sku, quantity: 1, condition: 'SELLABLE' },
        ]);
      }
    }
    setReturnReason('');
    setErrorMsg('');
    setIsRegisterOpen(true);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const target = orders.find((o) => o.id === orderId);
    if (target && target.items && target.items.length > 0) {
      setReturnItems([
        { sku: target.items[0].sku, quantity: 1, condition: 'SELLABLE' },
      ]);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      setErrorMsg('A return reason is required');
      return;
    }
    if (returnItems.length === 0) {
      setErrorMsg('At least one item must be returned');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/returns', {
        method: 'POST',
        body: JSON.stringify({
          order_id: selectedOrderId,
          reason: returnReason.trim(),
          items: returnItems,
        }),
      });
      setIsRegisterOpen(false);
      onRefresh();
      loadReturns();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!approveReturnRecord) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/returns/${approveReturnRecord.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          restore_sellable_stock: restoreStock,
          refund_amount: Number(refundAmount),
        }),
      });
      setApproveReturnRecord(null);
      onRefresh();
      loadReturns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (returnId: string) => {
    const reason = prompt('Please enter the reason for rejecting this return:');
    if (reason && reason.trim()) {
      try {
        await apiFetch(`/api/returns/${returnId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        });
        onRefresh();
        loadReturns();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Returns &amp; Quality Inspection</h1>
          <p className="text-xs text-slate-500 mt-1">
            Register return requests, inspect damaged vs sellable merchandise, and approve stock restoration into the ledger.
          </p>
        </div>
        <button
          onClick={handleOpenRegister}
          disabled={eligibleOrders.length === 0}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Register New Return</span>
        </button>
      </div>

      {eligibleOrders.length === 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
          Note: Returns can only be registered for shipped or delivered orders. No shipped orders available currently.
        </div>
      )}

      {/* Returns List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Return Records &amp; Inspection Status</h2>
          <span className="text-xs text-slate-500 font-medium">{returns.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Return ID</th>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Return Reason</th>
                <th className="px-4 py-3">Inspection Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No return records registered.
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{r.order_number}</td>
                    <td className="px-4 py-3 text-slate-800">{r.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-4 py-3">
                      {(r.items || []).map((it, idx) => (
                        <div key={idx} className="text-[11px] font-mono flex items-center gap-1.5">
                          <span className="font-bold">{it.quantity}x {it.sku}</span>
                          <span
                            className={`px-1 rounded text-[10px] ${
                              it.condition === 'SELLABLE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {it.condition}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setApproveReturnRecord(r);
                              setRefundAmount(r.refund_amount || 0);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="px-2.5 py-1 text-rose-600 hover:text-rose-800 text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <span className="text-[11px] text-emerald-600 font-medium">Approved</span>
                      )}
                      {r.status === 'REJECTED' && (
                        <span className="text-[11px] text-rose-600 font-medium">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Return Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Register Order Return</h3>
            <p className="text-xs text-slate-500">
              Quarantine returned items. Returned goods are NOT restored into available stock until inspection approval.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Shipped Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono"
                >
                  {eligibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {o.customer_name} ({o.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reason for Return *</label>
                <textarea
                  rows={2}
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  placeholder="e.g. Defective unit, incorrect size received, damaged in transit"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Items &amp; Condition Inspection</label>
                {returnItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-slate-800 flex-1">{it.sku}</span>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].quantity = Number(e.target.value);
                        setReturnItems(updated);
                      }}
                      className="w-16 p-1 bg-white border border-slate-200 rounded text-center"
                    />
                    <select
                      value={it.condition}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].condition = e.target.value as any;
                        setReturnItems(updated);
                      }}
                      className="p-1 bg-white border border-slate-200 rounded font-semibold"
                    >
                      <option value="SELLABLE">Sellable / Brand New</option>
                      <option value="DAMAGED">Damaged / Scrap</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Register Return in Quarantine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Return Modal */}
      {approveReturnRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Approve Return for {approveReturnRecord.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Approving restores sellable items back into warehouse physical stock via the inventory transaction ledger. Damaged goods are accounted for separately.
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-emerald-900 font-semibold">
                  Restore inspected sellable items to physical stock
                </span>
              </label>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Approved Refund Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  placeholder="Optional refund amount"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={() => setApproveReturnRecord(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Approving...' : 'Commit Approval & Stock Resale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
