import React from 'react';
import {
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  Users,
  ShoppingCart,
  Box,
  Truck,
  CreditCard,
  RotateCcw,
  BarChart3,
  Bot,
  Network,
  Terminal,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type TabId =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'orders'
  | 'packing'
  | 'shipping'
  | 'payments'
  | 'returns'
  | 'reports'
  | 'ai_activity'
  | 'mcp_connections'
  | 'mcp_console'
  | 'tests'
  | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingConfirmationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  pendingConfirmationsCount,
}) => {
  const navItems = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as TabId, label: 'Products', icon: Package },
    { id: 'categories' as TabId, label: 'Categories', icon: Tags },
    { id: 'inventory' as TabId, label: 'Inventory Ledger', icon: Layers },
    { id: 'customers' as TabId, label: 'Customers', icon: Users },
    { id: 'orders' as TabId, label: 'Orders', icon: ShoppingCart },
    { id: 'packing' as TabId, label: 'Packing Queue', icon: Box },
    { id: 'shipping' as TabId, label: 'Shipping & Dispatch', icon: Truck },
    { id: 'payments' as TabId, label: 'Payments', icon: CreditCard },
    { id: 'returns' as TabId, label: 'Returns', icon: RotateCcw },
    { id: 'reports' as TabId, label: 'Reports & CSV', icon: BarChart3 },
    {
      id: 'ai_activity' as TabId,
      label: 'AI Activity & Audit',
      icon: Bot,
      badge: pendingConfirmationsCount > 0 ? pendingConfirmationsCount : undefined,
    },
    { id: 'mcp_connections' as TabId, label: 'MCP & OAuth 2.1', icon: Network },
    { id: 'mcp_console' as TabId, label: 'MCP Playground', icon: Terminal },
    { id: 'tests' as TabId, label: 'Automated Tests', icon: ShieldCheck },
    { id: 'settings' as TabId, label: 'Team & Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 border-r border-slate-800 h-screen sticky top-0 select-none z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              NX
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white truncate">NexusAI</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium truncate">
                Inventory Platform
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg">
            NX
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Workspace pill */}
      {!collapsed && (
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400">Workspace:</span>{' '}
            <span className="font-semibold text-slate-200">Apex Retail Hub</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
            OWNER
          </span>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                className={`shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        {!collapsed ? (
          <div>
            <div className="text-slate-200 font-medium">Remote MCP Server</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Streamable HTTP Active
            </div>
          </div>
        ) : (
          <div className="mx-auto w-2 h-2 rounded-full bg-emerald-400" title="MCP Server Active" />
        )}
      </div>
    </aside>
  );
};
