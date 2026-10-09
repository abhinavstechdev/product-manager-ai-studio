import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Payment, Order } from '../types';
import { apiFetch } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface PaymentsViewProps {
  orders: Order[];
  onRefresh: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ orders, onRefresh }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'COD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        apiFetch<Payment[]>('/api/payments'),
        apiFetch<any>('/api/payments/summary'),
      ]);
      setPayments(listRes);
      setSummary(sumRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRecord = (order?: Order) => {
    const target = order || orders.find((o) => o.payment_status !== 'PAID') || orders[0];
    if (target) {
      setSelectedOrderId(target.id);
      // default to remaining amount
      setAmount(target.total_amount);
    }
    setRefNumber(`UPI-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setNotes('');
    setErrorMsg('');
    setIsRecordOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          order_id: selectedOrderId,
          amount: Number(amount),
          payment_method: paymentMethod,
          reference_number: refNumber,
          notes,
        }),
      });
      setIsRecordOpen(false);
      onRefresh();
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const unpaidOrPartialOrders = orders.filter((o) => o.payment_status !== 'PAID' && o.status !== 'CANCELLED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments &amp; Cash Collections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track real monetary inflows, partial advances, payment method splits, and open outstanding receivables.
          </p>
        </div>
        <button
          onClick={() => handleOpenRecord()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cash Collected
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">
              ₹{summary.total_revenue_collected.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Across {summary.total_payments_count} recorded payment receipts
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Order Book Value
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{summary.total_order_value.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Cumulative value of all active non-cancelled customer orders
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Unpaid Outstanding Receivables
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              ₹{summary.total_outstanding_receivable.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {summary.unpaid_orders_count} unpaid • {summary.partially_paid_orders_count} partially paid
            </p>
          </div>
        </div>
      )}

      {/* Unpaid / Partial Orders Callout Queue */}
      {unpaidOrPartialOrders.length > 0 && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Orders with Outstanding Balances ({unpaidOrPartialOrders.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">Immediate Follow-up</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpaidOrPartialOrders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="bg-white p-3.5 rounded-lg border border-amber-200/60 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{o.order_number}</div>
                  <div className="text-slate-600 text-[11px]">{o.customer_name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Total: ₹{o.total_amount.toLocaleString('en-IN')} • {o.payment_method}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenRecord(o)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-2xs cursor-pointer"
                >
                  Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recorded Payments Ledger</h2>
          <span className="text-xs text-slate-500 font-medium">{payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / Txn ID</th>
                <th className="px-4 py-3 font-semibold">Amount Paid</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {new Date(p.payment_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      {p.order_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {p.reference_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={p.notes}>
                      {p.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Record Customer Payment</h3>
            <p className="text-xs text-slate-500">
              Record a full or partial cash payment against an existing order. The order payment status is recalculated automatically.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    const target = orders.find((o) => o.id === e.target.value);
                    if (target) setAmount(target.total_amount);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-mono"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {o.customer_name} (₹{o.total_amount}, {o.payment_status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                  >
                    <option value="UPI">UPI Instant Pay</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">Counter Cash</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="OTHER">Other Method</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Reference / UTR / Transaction #
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono focus:border-emerald-500"
                  placeholder="e.g. UPI-REF-99882211"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                  placeholder="e.g. Cleared via Google Pay transaction"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Commit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
