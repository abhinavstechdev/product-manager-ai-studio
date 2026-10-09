import React from 'react';
import { Settings, Shield, Database, Cloud, Users, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workspace Settings &amp; Roles</h1>
        <p className="text-xs text-slate-500 mt-1">
          Workspace profile, tenant isolation boundaries, role-based access control (RBAC), and deployment settings.
        </p>
      </div>

      {/* Workspace Information */}
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

      {/* Role-Based Access Control (RBAC) */}
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

      {/* Deployment & Vercel Free-Tier Infrastructure */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Cloud size={16} className="text-indigo-600" />
          <span>Vercel &amp; Neon Serverless Database Configuration</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The application is fully architected for deployment on Vercel without persistent Node.js daemons. It supports Neon PostgreSQL free tier serverless pooling and runs an ACID-compliant embedded in-memory transactional database out of the box when no <code>DATABASE_URL</code> is supplied.
        </p>

        <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
          <div className="text-slate-400"># Production Database Connection (Vercel / Neon):</div>
          <div>DATABASE_URL="postgres://user:pass@ep-sample-1234.us-east-2.aws.neon.tech/neondb?sslmode=require"</div>
          <div>AUTH_SECRET="nexus_super_secret_jwt_and_session_key_32chars_min"</div>
          <div>APP_URL="https://your-app.vercel.app"</div>
        </div>
      </div>
    </div>
  );
};
