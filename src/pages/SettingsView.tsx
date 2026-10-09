import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Database,
  Cloud,
  Check,
  RefreshCw,
  Zap,
  Server,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Layers,
  ArrowRight,
  HelpCircle,
  Eye,
  EyeOff,
  PowerOff,
} from 'lucide-react';
import { DatabaseStatus } from '../types';
import { apiFetch } from '../lib/api';

export const SettingsView: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinging, setPinging] = useState<boolean>(false);

  // Neon connection form state
  const [inputMode, setInputMode] = useState<'uri' | 'fields'>('uri');
  const [connectionUri, setConnectionUri] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Field-based connection parameters
  const [fieldHost, setFieldHost] = useState<string>('');
  const [fieldPort, setFieldPort] = useState<string>('5432');
  const [fieldDatabase, setFieldDatabase] = useState<string>('neondb');
  const [fieldUser, setFieldUser] = useState<string>('');
  const [fieldPassword, setFieldPassword] = useState<string>('');
  const [fieldSslMode, setFieldSslMode] = useState<string>('require');

  // Action status and alerts
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const roles = [
    {
      role: 'OWNER',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Full workspace administration, role assignment, financial records, integration management, and raw audit logs.',
    },
    {
      role: 'ADMIN',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      description: 'Manage products, inventory, customers, orders, payments, and returns. Day-to-day operations and reports.',
    },
    {
      role: 'INVENTORY_MANAGER',
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      description: 'Read products and stock levels, receive supplier goods, adjust inventory with mandatory reason, and valuation reports.',
    },
    {
      role: 'ORDER_MANAGER',
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      description: 'Customer directory, manual order entry, stock reservations, order confirmations, packing and dispatch oversight.',
    },
    {
      role: 'PACKER',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'View packing queue and item checklists, print verified packing slips, mark orders as packed.',
    },
    {
      role: 'VIEWER',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      description: 'Read-only access to explicitly permitted business records.',
    },
  ];

  // Fetch current database status on mount
  const loadDatabaseStatus = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<DatabaseStatus>('/api/database/status');
      setDbStatus(res);
    } catch (err: any) {
      console.error('Failed to load database status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStatus();
  }, []);

  // Ping active database
  const handlePing = async () => {
    try {
      setPinging(true);
      const res = await apiFetch<DatabaseStatus>('/api/database/ping', {
        method: 'POST',
      });
      setDbStatus(res);
    } catch (err: any) {
      console.error('Ping failed:', err);
    } finally {
      setPinging(false);
    }
  };

  // Build connection string from fields or return raw uri
  const getComputedUri = (): string => {
    if (inputMode === 'uri') {
      return connectionUri.trim();
    }
    if (!fieldHost.trim()) return '';
    const userPart = fieldUser ? (fieldPassword ? `${encodeURIComponent(fieldUser)}:${encodeURIComponent(fieldPassword)}@` : `${encodeURIComponent(fieldUser)}@`) : '';
    const portPart = fieldPort ? `:${fieldPort}` : '';
    const dbPart = fieldDatabase ? `/${fieldDatabase}` : '/neondb';
    return `postgresql://${userPart}${fieldHost.trim()}${portPart}${dbPart}?sslmode=${fieldSslMode}`;
  };

  // Test Neon connection without applying
  const handleTestConnection = async () => {
    const targetUri = getComputedUri();
    if (!targetUri) {
      setErrorMessage('Please enter a valid connection string or fill out host and database.');
      return;
    }

    try {
      setActionLoading(true);
      setTestResult(null);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await apiFetch<{ success: boolean; latencyMs: number; message: string }>('/api/database/test', {
        method: 'POST',
        body: JSON.stringify({ connectionString: targetUri }),
      });

      setTestResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection test failed. Please verify credentials and network.');
      setTestResult(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Connect to Neon and switch active database
  const handleConnectNeon = async () => {
    const targetUri = getComputedUri();
    if (!targetUri) {
      setErrorMessage('Please provide a Neon PostgreSQL connection string.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setTestResult(null);

      const res = await apiFetch<{ success: boolean; message: string; status: DatabaseStatus }>('/api/database/connect', {
        method: 'POST',
        body: JSON.stringify({ connectionString: targetUri }),
      });

      setDbStatus(res.status);
      setSuccessMessage(res.message || 'Successfully connected to Neon PostgreSQL!');
      setConnectionUri('');
      setFieldPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to Neon PostgreSQL.');
    } finally {
      setActionLoading(false);
    }
  };

  // Disconnect from Neon and revert to local in-memory
  const handleDisconnectNeon = async () => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await apiFetch<{ success: boolean; message: string; status: DatabaseStatus }>('/api/database/disconnect', {
        method: 'POST',
      });

      setDbStatus(res.status);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch database.');
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Sandbox Demo populate
  const handleUseDemoSandbox = () => {
    setConnectionUri('sandbox');
    setInputMode('uri');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Workspace Settings &amp; Infrastructure</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Database engine discovery, live connection inspector, Neon PostgreSQL integration without manual .env edits, and role policies.
          </p>
        </div>

        {/* Status Pill in Header */}
        {dbStatus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Current Storage:</span>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                dbStatus.isNeon
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-blue-50 text-blue-800 border-blue-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dbStatus.isNeon ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              <span>{dbStatus.isNeon ? 'Neon PostgreSQL (Cloud)' : 'Local In-Memory (ACID)'}</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: ACTIVE DATABASE DETECTOR & STATUS INSPECTOR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${dbStatus?.isNeon ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Active Database Inspector</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    dbStatus?.isNeon
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {dbStatus?.isNeon ? 'Neon Serverless Cloud' : 'Local In-Memory'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Identify which database engine the platform is reading from and writing to in real time.
              </p>
            </div>
          </div>

          {/* Quick Ping / Refresh action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePing}
              disabled={pinging || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition cursor-pointer disabled:opacity-50"
              title="Test round-trip ping latency to database"
            >
              <RefreshCw size={13} className={pinging ? 'animate-spin text-indigo-600' : ''} />
              <span>{pinging ? 'Pinging...' : 'Check Ping / Latency'}</span>
            </button>

            {dbStatus?.isNeon && (
              <button
                onClick={handleDisconnectNeon}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition cursor-pointer disabled:opacity-50"
                title="Switch back to embedded local storage"
              >
                <PowerOff size={13} />
                <span>Switch to Local DB</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Body: Details Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-xs">
              <RefreshCw className="animate-spin text-indigo-600" size={16} />
              <span>Detecting active database engine...</span>
            </div>
          ) : dbStatus ? (
            <div className="space-y-6">
              {/* Highlight summary banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  dbStatus.isNeon
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      dbStatus.isNeon ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Currently Operating On
                    </div>
                    <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{dbStatus.isNeon ? 'Neon Serverless PostgreSQL (Remote)' : 'Local Embedded Storage (In-Memory ACID)'}</span>
                      <span className="text-xs font-normal text-slate-500">
                        • {dbStatus.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{dbStatus.message}</p>
                  </div>
                </div>

                {/* Latency and Specs Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Round-Trip Latency</div>
                    <div className="text-sm font-mono font-bold text-emerald-700 flex items-center justify-end gap-1">
                      <Zap size={14} className="text-amber-500" />
                      <span>{dbStatus.latencyMs !== undefined ? `${dbStatus.latencyMs} ms` : '1 ms'}</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Managed Tables</div>
                    <div className="text-sm font-mono font-bold text-slate-800">
                      {dbStatus.tablesCount || 14} Tables
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Technical Properties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Host */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-1">Server Host / Endpoint</span>
                  <span className="font-mono font-semibold text-slate-800 break-all select-all">
                    {dbStatus.host}
                  </span>
                </div>

                {/* Database Name */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-1">Database Name</span>
                  <span className="font-mono font-semibold text-indigo-700">
                    {dbStatus.database}
                  </span>
                </div>

                {/* User / Identity */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-1">Authenticated Role</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {dbStatus.user || 'in-memory-root'}
                  </span>
                </div>

                {/* SSL / Security */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-1">Encryption &amp; Pooling</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <Lock size={12} />
                    <span>{dbStatus.isNeon ? 'SSL Required (TLS 1.3)' : 'In-Process ACID Isolation'}</span>
                  </span>
                </div>
              </div>

              {/* Masked Connection String Display if Neon */}
              {dbStatus.isNeon && dbStatus.connectionStringMasked && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span>Active Connection String (Password masked):</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={12} /> Live Connected
                    </span>
                  </div>
                  <div className="text-emerald-300 break-all">{dbStatus.connectionStringMasked}</div>
                </div>
              )}

              {/* Table List Inspector */}
              {dbStatus.tables && dbStatus.tables.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    <span>Synchronized Schema Tables ({dbStatus.tables.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dbStatus.tables.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md font-mono text-[11px] text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* SECTION 2: ADD / CONNECT TO NEON WITHOUT MANUAL .ENV EDITING */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/40 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Connect to Neon PostgreSQL</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  No Manual .env Edit Required
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Directly connect your Neon cloud database or demo sandbox. The connection is applied dynamically to the server runtime.
              </p>
            </div>
          </div>

          {/* Quick Demo Sandbox Button */}
          <button
            onClick={handleUseDemoSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition cursor-pointer"
            title="Try with a pre-configured Neon Sandbox instance"
          >
            <Zap size={13} className="text-amber-500" />
            <span>Use Neon Sandbox (1-Click)</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Input Mode Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setInputMode('uri')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                inputMode === 'uri'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Connection String (URI)
            </button>
            <button
              onClick={() => setInputMode('fields')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                inputMode === 'fields'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Enter Host &amp; Credentials Manually
            </button>
          </div>

          {/* MODE A: Connection String URI */}
          {inputMode === 'uri' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Neon Connection String <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={connectionUri}
                  onChange={(e) => setConnectionUri(e.target.value)}
                  placeholder="postgresql://user:password@ep-sample-1234.us-east-2.aws.neon.tech/neondb?sslmode=require"
                  className="w-full pl-3 pr-24 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 font-medium"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Supports standard PostgreSQL URLs from Neon console: <code>postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require</code>
              </p>
            </div>
          )}

          {/* MODE B: Individual Fields */}
          {inputMode === 'fields' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Neon Host Endpoint <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldHost}
                  onChange={(e) => setFieldHost(e.target.value)}
                  placeholder="ep-crimson-mist-98421.us-east-2.aws.neon.tech"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Port</label>
                <input
                  type="text"
                  value={fieldPort}
                  onChange={(e) => setFieldPort(e.target.value)}
                  placeholder="5432"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Database Name</label>
                <input
                  type="text"
                  value={fieldDatabase}
                  onChange={(e) => setFieldDatabase(e.target.value)}
                  placeholder="neondb"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">User / Role</label>
                <input
                  type="text"
                  value={fieldUser}
                  onChange={(e) => setFieldUser(e.target.value)}
                  placeholder="alex_admin"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={fieldPassword}
                  onChange={(e) => setFieldPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Database Connection Error</div>
                <div className="mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Database Connected Successfully</div>
                <div className="mt-0.5">{successMessage}</div>
              </div>
            </div>
          )}

          {testResult && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Test Ping Succeeded ({testResult.latencyMs}ms)</div>
                <div className="mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleConnectNeon}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              <span>Connect &amp; Activate Neon Database</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <Activity size={14} className="text-indigo-600" />
              <span>Test Connection Only</span>
            </button>

            {(connectionUri || fieldHost) && (
              <button
                onClick={() => {
                  setConnectionUri('');
                  setFieldHost('');
                  setFieldUser('');
                  setFieldPassword('');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setTestResult(null);
                }}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
              >
                Clear Form
              </button>
            )}
          </div>

          {/* Helper Guide: How to find Neon credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/60 p-4 rounded-xl border text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-indigo-600" />
              <span>Where do I find my Neon Database connection string?</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 leading-relaxed">
              <li>
                Log into your Neon console at <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">console.neon.tech</a>.
              </li>
              <li>Select your project and go to the <strong>Dashboard</strong> or <strong>Connection Details</strong> widget.</li>
              <li>Choose <strong>PostgreSQL</strong> or <strong>Pooled connection</strong> and copy the connection string.</li>
              <li>Paste the string into the input field above and click <strong>Connect &amp; Activate Neon Database</strong>. Tables and schemas are automatically created.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* SECTION 3: WORKSPACE INFORMATION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Settings size={16} className="text-indigo-600" />
          <span>Active Workspace Profile</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Workspace Name</label>
            <input
              type="text"
              readOnly
              value="Apex Retail Hub"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-medium mb-1">Tenant Slug</label>
            <input
              type="text"
              readOnly
              value="apex-retail"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-medium mb-1">Currency Code</label>
            <input
              type="text"
              readOnly
              value="INR (₹) - Indian Rupee"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: ROLE-BASED ACCESS CONTROL (RBAC) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC)</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Enforced on Website &amp; MCP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.role} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.color}`}>
                {r.role}
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

