import React, { useState, useEffect } from 'react';
import { Search, Bell, AlertTriangle, ShieldCheck, Terminal, Plus, Database } from 'lucide-react';
import { TabId } from './Sidebar';

interface HeaderProps {
  onSelectTab: (tab: TabId) => void;
  pendingConfirmationsCount: number;
  onQuickNewOrder: () => void;
  onQuickAdjustStock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
  pendingConfirmationsCount,
  onQuickNewOrder,
  onQuickAdjustStock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dbIsNeon, setDbIsNeon] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/database/status')
      .then((r) => r.json())
      .then((data) => setDbIsNeon(!!data.isNeon))
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSelectTab('orders');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search SKU, Order #, or Customer..."
          className="w-full pl-9 pr-4 py-1.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs border border-transparent focus:border-indigo-500 rounded-lg outline-none transition"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Pending AI Confirmations Alert Banner */}
        {pendingConfirmationsCount > 0 && (
          <button
            onClick={() => onSelectTab('ai_activity')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold animate-pulse transition"
          >
            <AlertTriangle size={14} className="text-amber-600" />
            <span>{pendingConfirmationsCount} AI Confirmation Needed</span>
          </button>
        )}

        {/* Quick Action Buttons */}
        <button
          onClick={onQuickNewOrder}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus size={14} />
          <span>New Order</span>
        </button>

        <button
          onClick={onQuickAdjustStock}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium border border-slate-200 transition cursor-pointer"
        >
          <span>Adjust Stock</span>
        </button>

        {/* Fast Playground shortcut */}
        <button
          onClick={() => onSelectTab('mcp_console')}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
          title="Open MCP Tool Playground"
        >
          <Terminal size={18} />
        </button>

        {/* Automated Tests shortcut */}
        <button
          onClick={() => onSelectTab('tests')}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
          title="Run Verification Tests"
        >
          <ShieldCheck size={18} />
        </button>

        {/* Database Status Quick Pill */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
            dbIsNeon
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Click to view Database Inspector & Switch to Neon"
        >
          <Database size={12} className={dbIsNeon ? 'text-emerald-600' : 'text-slate-500'} />
          <span>{dbIsNeon ? 'Neon DB' : 'Local DB'}</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white text-xs font-bold flex items-center justify-center shadow">
            AS
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">Abhinav S.</div>
            <div className="text-[10px] text-slate-500">Workspace Owner</div>
          </div>
        </div>
      </div>
    </header>
  );
};
