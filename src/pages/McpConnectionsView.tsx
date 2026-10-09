import React, { useState, useEffect } from 'react';
import {
  Network,
  Copy,
  Check,
  Key,
  Shield,
  Trash2,
  Plus,
  ExternalLink,
  Code,
  Terminal,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export const McpConnectionsView: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedNewToken, setCopiedNewToken] = useState(false);

  // New token modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientName, setClientName] = useState('Claude Desktop Assistant');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  const mcpEndpointUrl = `${window.location.origin}/api/mcp`;

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'nexus-inventory': {
          url: mcpEndpointUrl,
          headers: {
            Authorization: 'Bearer <YOUR_ACCESS_TOKEN>',
          },
        },
      },
    },
    null,
    2
  );

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>('/api/mcp/tokens');
      setTokens(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(mcpEndpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(claudeDesktopConfig);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>('/api/mcp/tokens', {
        method: 'POST',
        body: JSON.stringify({ client_name: clientName }),
      });
      setNewlyCreatedToken(res.token);
      loadTokens();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (confirm('Revoke this MCP access grant immediately? Any AI clients using it will lose access.')) {
      try {
        await apiFetch(`/api/mcp/tokens/${id}`, { method: 'DELETE' });
        loadTokens();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Remote MCP &amp; OAuth 2.1 Authorization
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect AI assistants (Claude Desktop, Cursor, ChatGPT, custom agents) using official Streamable HTTP MCP standards and RFC OAuth 2.1 PKCE protocols.
          </p>
        </div>
        <button
          onClick={() => {
            setNewlyCreatedToken(null);
            setIsCreateOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Key size={16} />
          <span>Generate Client Access Token</span>
        </button>
      </div>

      {/* Connection Endpoint Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Official Streamable HTTP MCP Endpoint
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <code className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 select-all">
                {mcpEndpointUrl}
              </code>
            </div>
          </div>
          <button
            onClick={handleCopyEndpoint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            {copiedEndpoint ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedEndpoint ? 'Copied Endpoint!' : 'Copy URL'}</span>
          </button>
        </div>

        {/* OAuth 2.1 RFC Discovery Links */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-500 font-medium">Standards Compliance:</span>
          <a
            href="/.well-known/oauth-authorization-server"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-mono font-semibold flex items-center gap-1"
          >
            <span>/.well-known/oauth-authorization-server (RFC 8414)</span>
            <ExternalLink size={12} />
          </a>
          <a
            href="/.well-known/oauth-protected-resource"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-mono font-semibold flex items-center gap-1"
          >
            <span>/.well-known/oauth-protected-resource (RFC 9728)</span>
            <ExternalLink size={12} />
          </a>
          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            PKCE S256 Enforced
          </span>
        </div>
      </div>

      {/* Claude Desktop & Cursor Integration Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Claude Desktop Setup</h2>
            </div>
            <button
              onClick={handleCopyConfig}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedConfig ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedConfig ? 'Copied JSON!' : 'Copy Config'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Add this configuration block to your Claude Desktop config file (<code>claude_desktop_config.json</code>):
          </p>
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
            {claudeDesktopConfig}
          </pre>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">cURL / HTTP Test Command</h2>
          </div>
          <p className="text-xs text-slate-500">
            Test the Streamable HTTP endpoint directly from terminal to verify JSON-RPC 2.0 tool execution:
          </p>
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
{`curl -X POST "${mcpEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_dashboard_summary","arguments":{}}}'`}
          </pre>
        </div>
      </div>

      {/* Authorized Clients & Tokens List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Authorized AI Clients &amp; Tokens</h2>
          <span className="text-xs text-slate-500 font-medium">{tokens.length} grants active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Client Identity</th>
                <th className="px-4 py-3">Token Preview</th>
                <th className="px-4 py-3">Authorized Scopes</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3 text-right">Revocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading tokens...
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No active tokens. Generate one above to connect an AI client.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.client_id}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                      {t.access_token_preview}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">
                        {t.scopes.length} scopes (All tools)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(t.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeToken(t.id)}
                        className="text-rose-600 hover:text-rose-800 font-semibold p-1 cursor-pointer"
                        title="Revoke access immediately"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Token Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Generate MCP Client Token</h3>
            <p className="text-xs text-slate-500">
              Issues an authorized OAuth 2.1 access token with workspace-scoped permissions.
            </p>

            {newlyCreatedToken ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-emerald-900">Token Generated Successfully!</div>
                  <div className="text-slate-600 text-[11px]">
                    Copy your access token below. Keep it secure and do not share it publicly:
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newlyCreatedToken}
                      className="w-full p-2 bg-white font-mono text-[11px] border border-emerald-300 rounded outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedToken);
                        setCopiedNewToken(true);
                        setTimeout(() => setCopiedNewToken(false), 2000);
                      }}
                      className="px-3 py-2 bg-emerald-600 text-white rounded font-semibold text-xs shrink-0 cursor-pointer"
                    >
                      {copiedNewToken ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setNewlyCreatedToken(null);
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateToken} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Client Name / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    placeholder="e.g. Claude Desktop (MacBook)"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                  >
                    Create Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
