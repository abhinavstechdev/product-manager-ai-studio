import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowDownToLine,
  Sliders,
  History,
  AlertTriangle,
  IndianRupee,
  Search,
  Filter,
} from 'lucide-react';
import { Product, InventoryTransaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';

interface InventoryViewProps {
  products: Product[];
  onRefresh: () => void;
  initialAdjustSku?: string;
  onClearInitialAdjustSku?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onRefresh,
  initialAdjustSku,
  onClearInitialAdjustSku,
}) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);

  // Form states
  const [targetSku, setTargetSku] = useState(initialAdjustSku || (products[0]?.sku || ''));
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [quantityReceived, setQuantityReceived] = useState(10);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Transaction filter
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  useEffect(() => {
    if (initialAdjustSku) {
      setTargetSku(initialAdjustSku);
      setIsAdjustOpen(true);
      if (onClearInitialAdjustSku) onClearInitialAdjustSku();
    }
  }, [initialAdjustSku]);

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const data = await apiFetch<InventoryTransaction[]>('/api/inventory/transactions?limit=100');
      setTransactions(data);
    } catch {
      // ignore
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A valid reason is required for manual stock adjustments');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          sku_or_id: targetSku,
          quantity_change: Number(quantityDelta),
          reason: reason.trim(),
        }),
      });
      setIsAdjustOpen(false);
      setReason('');
      setQuantityDelta(0);
      onRefresh();
      loadTransactions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/inventory/receive', {
        method: 'POST',
        body: JSON.stringify({
          sku_or_id: targetSku,
          quantity_received: Number(quantityReceived),
          reason: reason.trim() || 'Supplier goods receipt',
        }),
      });
      setIsReceiveOpen(false);
      setReason('');
      setQuantityReceived(10);
      onRefresh();
      loadTransactions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTxs = transactions.filter((t) => {
    if (txTypeFilter !== 'ALL' && t.type !== txTypeFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory &amp; Stock Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time physical, reserved, and available stock tracking with strict immutable movement logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setErrorMsg('');
              setIsReceiveOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowDownToLine size={15} />
            <span>Receive Supplier Stock</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsAdjustOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders size={15} />
            <span>Manual Adjustment</span>
          </button>
        </div>
      </div>

      {/* Stock Levels Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Physical Stock
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {products.reduce((acc, p) => acc + p.physical_stock, 0)} units
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Total physical inventory units on warehouse shelves
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reserved On Customer Orders
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {products.reduce((acc, p) => acc + p.reserved_stock, 0)} units
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Committed to active orders awaiting packing or dispatch
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Available Stock
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {products.reduce((acc, p) => acc + p.available_stock, 0)} units
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Available for immediate customer sale (Physical - Reserved)
          </p>
        </div>
      </div>

      {/* Stock Allocation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Live Product Stock Levels</h2>
          <span className="text-xs text-slate-500 font-medium">{products.length} catalog items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 text-center">Physical Stock</th>
                <th className="px-4 py-3 text-center">Reserved Stock</th>
                <th className="px-4 py-3 text-center">Available Stock</th>
                <th className="px-4 py-3 text-center">Reorder Limit</th>
                <th className="px-4 py-3">Health Status</th>
                <th className="px-4 py-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                let status = 'HEALTHY';
                if (p.available_stock <= 0) status = 'OUT_OF_STOCK';
                else if (p.available_stock <= p.reorder_threshold) status = 'LOW_STOCK';

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{p.physical_stock}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-medium">{p.reserved_stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${p.available_stock <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {p.available_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{p.reorder_threshold}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setTargetSku(p.sku);
                          setErrorMsg('');
                          setIsAdjustOpen(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Inventory Transaction Ledger</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Type:</span>
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none"
            >
              <option value="ALL">All Ledger Movements</option>
              <option value="STOCK_RECEIVED">STOCK_RECEIVED</option>
              <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
              <option value="STOCK_RESERVED">STOCK_RESERVED</option>
              <option value="RESERVATION_RELEASED">RESERVATION_RELEASED</option>
              <option value="ORDER_DISPATCHED">ORDER_DISPATCHED</option>
              <option value="RETURN_RECEIVED">RETURN_RECEIVED</option>
              <option value="RETURN_APPROVED_FOR_RESALE">RETURN_APPROVED_FOR_RESALE</option>
              <option value="DAMAGED_GOODS">DAMAGED_GOODS</option>
              <option value="STOCK_CORRECTION">STOCK_CORRECTION</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">SKU / Product</th>
                <th className="px-4 py-3">Movement Type</th>
                <th className="px-4 py-3 text-center">Change</th>
                <th className="px-4 py-3 text-center">Before / After</th>
                <th className="px-4 py-3">Reason / Reference</th>
                <th className="px-4 py-3">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingTx ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading ledger records...
                  </td>
                </tr>
              ) : filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(t.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-900">{t.sku}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                        {t.product_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-indigo-700">
                      {t.type}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      <span
                        className={
                          t.quantity_change > 0
                            ? 'text-emerald-600'
                            : t.quantity_change < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }
                      >
                        {t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">
                      {t.previous_quantity} → {t.new_quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={t.reason}>
                      {t.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.actor_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isAdjustOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Manual Inventory Stock Adjustment</h3>
            <p className="text-xs text-slate-500">
              Every manual inventory modification is permanently recorded in the ledger with actor attribution.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Product *</label>
                <select
                  value={targetSku}
                  onChange={(e) => setTargetSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.sku}>
                      [{p.sku}] {p.name} (Physical: {p.physical_stock}, Reserved: {p.reserved_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Quantity Change (+ or -) *
                </label>
                <input
                  type="number"
                  required
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. 5 to add, -3 to write off damaged"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Negative adjustments cannot exceed unreserved physical stock.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Mandatory Adjustment Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. Stock count discrepancy found during weekly warehouse audit."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Committing...' : 'Commit Ledger Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Receive Supplier Goods</h3>
            <p className="text-xs text-slate-500">
              Increment physical stock from supplier shipment or purchase order receipt.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Product *</label>
                <select
                  value={targetSku}
                  onChange={(e) => setTargetSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.sku}>
                      [{p.sku}] {p.name} (Current Physical: {p.physical_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityReceived}
                  onChange={(e) => setQuantityReceived(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">PO # or Receipt Note</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. PO-2026-901 received from supplier shipment"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Record Goods Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
