import React, { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const TestsView: React.FC = () => {
  const [suiteResults, setSuiteResults] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const data = await apiFetch<any>('/api/tests/run');
      setSuiteResults(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automated Test Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Execute integration, isolation, stock reservation, and OAuth PKCE security test suites.
          </p>
        </div>
        <button
          onClick={handleRunTests}
          disabled={running}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Play size={14} fill="currentColor" />
          <span>{running ? 'Running Test Suites...' : 'Run All Automated Tests'}</span>
        </button>
      </div>

      {/* Summary Box */}
      {suiteResults && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                suiteResults.failed === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {suiteResults.failed === 0 ? '✓' : '!'}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {suiteResults.failed === 0 ? 'All Test Suites Passed' : 'Test Failures Detected'}
              </h3>
              <p className="text-xs text-slate-500">
                {suiteResults.passed} passed • {suiteResults.failed} failed out of {suiteResults.results.length} assertions
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-right">
            <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Passed</span>
              <span className="text-lg font-bold text-emerald-800">{suiteResults.passed}</span>
            </div>
            <div className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Failed</span>
              <span className="text-lg font-bold text-rose-800">{suiteResults.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Assertion Checklist</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Test Name &amp; Assertion</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!suiteResults ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Click "Run All Automated Tests" to execute live verification across all modules.
                  </td>
                </tr>
              ) : (
                suiteResults.results.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-center">
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} />
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle size={12} />
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{r.message}</td>
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
