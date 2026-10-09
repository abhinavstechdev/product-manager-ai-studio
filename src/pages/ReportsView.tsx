import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  IndianRupee,
  Package,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export const ReportsView: React.FC = () => {
  const [salesReport, setSalesReport] = useState<any>(null);
  const [valuationReport, setValuationReport] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('start_date', startDate);
      if (endDate) query.append('end_date', endDate);

      const [sales, valuation] = await Promise.all([
        apiFetch<any>(`/api/reports/sales?${query.toString()}`),
        apiFetch<any>('/api/inventory/valuation'),
      ]);
      setSalesReport(sales);
      setValuationReport(valuation);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const handleDownloadCsv = (type: 'orders' | 'inventory' | 'payments' | 'sales') => {
    window.open(`/api/reports/export-csv?type=${type}`, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Reports &amp; Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated metrics for gross sales, net revenue, inventory margins, and verified CSV ledger exports.
          </p>
        </div>

        {/* CSV Export dropdown or buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadCsv('orders')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={13} />
            <span>Orders CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('inventory')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={13} />
            <span>Inventory CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('payments')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={13} />
            <span>Payments CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1">
          <Calendar size={14} className="text-indigo-600" />
          Filter Period:
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg outline-none"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-indigo-600 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Sales Summary Cards */}
      {salesReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gross Order Value
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{salesReport.gross_sales.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Before discounts &amp; shipping fees</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Discounts Granted
            </span>
            <div className="mt-2 text-2xl font-bold text-rose-600">
              ₹{salesReport.discounts.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Promotions and order markdowns</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Shipping Collected
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{salesReport.shipping_fees.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Delivery fees charged</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Billed Sales
            </span>
            <div className="mt-2 text-2xl font-bold text-indigo-600">
              ₹{salesReport.net_sales.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Across {salesReport.total_orders_count} orders</p>
          </div>
        </div>
      )}

      {/* Inventory Valuation Breakdown */}
      {valuationReport && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Inventory Valuation &amp; Profit Margins</h2>
              <p className="text-[11px] text-slate-500">
                Purchase cost valuation vs projected retail gross margins across active stock
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 block">Total Cost Valuation:</span>
              <strong className="text-sm font-bold text-purple-700">
                ₹{valuationReport.total_cost_valuation.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-center">Physical Units</th>
                  <th className="px-4 py-3 text-right">Cost (₹)</th>
                  <th className="px-4 py-3 text-right">Retail (₹)</th>
                  <th className="px-4 py-3 text-right">Cost Valuation</th>
                  <th className="px-4 py-3 text-right">Retail Valuation</th>
                  <th className="px-4 py-3 text-right font-bold text-emerald-700">Projected Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(valuationReport.breakdown || []).map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{b.sku}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{b.physical_stock}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{b.purchase_cost.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{b.selling_price.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      ₹{b.cost_valuation.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 font-semibold">
                      ₹{b.retail_valuation.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      ₹{b.projected_margin.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Sales Timeline */}
      {salesReport && salesReport.timeline && salesReport.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Daily Sales Velocity Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {salesReport.timeline.map((t: any) => (
              <div key={t.date} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-mono font-bold text-slate-900">{t.date}</div>
                <div className="text-slate-500">{t.orders} orders placed</div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                  <span className="text-slate-600">Net Sales:</span>
                  <span className="text-indigo-600 font-bold">₹{t.net.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
