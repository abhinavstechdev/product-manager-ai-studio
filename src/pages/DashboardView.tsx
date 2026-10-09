import React from 'react';
import {
  Package,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Box,
  Truck,
  IndianRupee,
  Clock,
  ArrowUpRight,
  Bot,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { TabId } from '../components/Sidebar';

interface DashboardViewProps {
  summary: any;
  loading: boolean;
  onNavigate: (tab: TabId) => void;
  onOpenOrder: (orderId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onNavigate,
  onOpenOrder,
}) => {
  if (loading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const inv = summary.inventory;
  const ord = summary.orders;
  const pay = summary.payments;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time warehouse inventory, customer fulfillment workflows, cash collections, and MCP AI agent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('packing')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition"
          >
            <Box size={14} />
            <span>Packing Queue ({ord.orders_to_pack})</span>
          </button>
          <button
            onClick={() => onNavigate('mcp_console')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition"
          >
            <Bot size={14} />
            <span>Test MCP Tools</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1: Inventory Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Physical Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{inv.physical_stock}</span>
            <span className="text-xs text-slate-500">units in warehouse</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Reserved: <strong className="text-indigo-600">{inv.reserved_stock}</strong></span>
            <span>Available: <strong className="text-emerald-600">{inv.available_stock}</strong></span>
          </div>
        </div>

        {/* Available Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available For Sale
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{inv.available_stock}</span>
            <span className="text-xs text-slate-500">units uncommitted</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Formula: Physical ({inv.physical_stock}) - Reserved ({inv.reserved_stock})
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Warnings
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-amber-600">{inv.low_stock_products}</span>
              <span className="text-[11px] text-slate-500 block">Low stock</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-2xl font-bold text-rose-600">{inv.out_of_stock_products}</span>
              <span className="text-[11px] text-slate-500 block">Out of stock</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('inventory')}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>View Reorder Recommendations</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        {/* Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inventory Cost Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹{(inv.inventory_valuation || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Across {inv.total_products} unique active SKUs
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2: Orders & Cash Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <ShoppingCart size={18} className="text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{ord.total_orders}</div>
          <div className="mt-2 text-xs text-slate-500 flex gap-2">
            <span className="text-amber-600 font-medium">{ord.orders_to_pack} to pack</span>
            <span>•</span>
            <span className="text-cyan-600 font-medium">{ord.packed_awaiting_dispatch} to ship</span>
          </div>
        </div>

        {/* In-Transit & Shipped */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dispatched & Delivered
            </span>
            <Truck size={18} className="text-cyan-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-cyan-600">{ord.shipped_orders}</span>
              <span className="text-[11px] text-slate-500 block">In Transit</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-2xl font-bold text-emerald-600">{ord.delivered_orders}</span>
              <span className="text-[11px] text-slate-500 block">Delivered</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {ord.returned_orders} returns • {ord.cancelled_orders} cancellations
          </div>
        </div>

        {/* Real Cash Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cash Collected
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
              Real Cash
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">
            ₹{pay.total_revenue_collected.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            From {pay.total_payments_count} recorded verified payments
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Uncollected Receivables
            </span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">
            ₹{pay.total_outstanding_receivable.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {pay.unpaid_orders_count} unpaid • {pay.partially_paid_orders_count} partially paid orders
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & AI Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
              <p className="text-[11px] text-slate-500">Latest orders placed manually or via AI assistant</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.recent_orders && summary.recent_orders.length > 0 ? (
                  summary.recent_orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{o.customer_name}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        ₹{o.total_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenOrder(o.id)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI & MCP Activity Feed (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="text-indigo-600" size={18} />
              <h2 className="text-sm font-bold text-slate-900">Live AI & MCP Activity</h2>
            </div>
            <button
              onClick={() => onNavigate('ai_activity')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Full Log
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[360px]">
            {summary.recent_audit_events && summary.recent_audit_events.length > 0 ? (
              summary.recent_audit_events.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-indigo-700 text-[11px]">
                      {a.tool_name || a.operation}
                    </span>
                    <StatusBadge status={a.outcome} />
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Actor: <strong className="text-slate-800">{a.actor_name}</strong>
                  </div>
                  {a.confirmation_reference && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded font-mono">
                      Token: {a.confirmation_reference}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    {new Date(a.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No MCP AI calls logged yet. Call any tool to see real-time execution audits.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={() => onNavigate('mcp_console')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <span>Launch MCP Interactive Playground</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
