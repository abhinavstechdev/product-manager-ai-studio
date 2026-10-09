import React, { useState, useEffect } from 'react';
import { Bot, AlertTriangle, Check, X, ShieldAlert, Clock, RefreshCw } from 'lucide-react';
import { AuditEvent, PendingConfirmation } from '../types';
import { apiFetch } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface AiActivityViewProps {
  onRefresh: () => void;
}

export const AiActivityView: React.FC<AiActivityViewProps> = ({ onRefresh }) => {
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditData, confData] = await Promise.all([
        apiFetch<AuditEvent[]>('/api/audit/activity?limit=100'),
        apiFetch<PendingConfirmation[]>('/api/confirmations'),
      ]);
      setAudits(auditData);
      setPendingConfirmations(confData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmationAction = async (token: string, action: 'CONFIRM' | 'REJECT') => {
    try {
      await apiFetch(`/api/confirmations/${token}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      loadData();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredAudits = audits.filter((a) => {
    if (outcomeFilter !== 'ALL' && a.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Activity &amp; Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time audit log of all Model Context Protocol (MCP) tool executions, actor credentials, and confirmation policy decisions.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* High-Impact Operations Pending Confirmation (Section 25) */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900">
              High-Impact AI Operations Awaiting Human Confirmation ({pendingConfirmations.length})
            </h2>
          </div>
          <p className="text-xs text-amber-800">
            Per the platform confirmation policy, high-impact actions (inventory adjustments, order cancellations, stock dispatches) require human confirmation before database commitment.
          </p>

          <div className="space-y-3">
            {pendingConfirmations.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-xl border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700">{c.tool_name}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                      {c.token}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800">{c.action_description}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Parameters: {JSON.stringify(c.params)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Expires: {new Date(c.expires_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConfirmationAction(c.token, 'REJECT')}
                    className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleConfirmationAction(c.token, 'CONFIRM')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Approve &amp; Execute</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Execution Audit Trail</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Filter Outcome:</span>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none font-medium"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
              <option value="PENDING_CONFIRMATION">PENDING_CONFIRMATION</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Tool / Action</th>
                <th className="px-4 py-3">Caller Identity</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Result Outcome</th>
                <th className="px-4 py-3">Payload Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(a.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      {a.tool_name || a.operation}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{a.actor_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">{a.request_id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.outcome} />
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-[11px] font-mono text-slate-600">
                      {a.after_value ? JSON.stringify(a.after_value) : a.target_record || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
