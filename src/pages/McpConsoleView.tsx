import React, { useState, useEffect } from 'react';
import { Terminal, Play, Bot, AlertTriangle, CheckCircle, Code, Layers } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const McpConsoleView: React.FC = () => {
  const [tools, setTools] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string>('get_dashboard_summary');
  const [inputArgsJson, setInputArgsJson] = useState<string>('{}');
  const [executing, setExecuting] = useState(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [lastRequestPayload, setLastRequestPayload] = useState<any>(null);

  // Load registered tools and prompts
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [toolsData, promptsData] = await Promise.all([
          apiFetch<any[]>('/api/mcp/tools'),
          apiFetch<any[]>('/api/mcp/prompts'),
        ]);
        setTools(toolsData);
        setPrompts(promptsData);
      } catch {
        // ignore
      }
    };
    fetchMetadata();
  }, []);

  const handleSelectTool = (name: string) => {
    setSelectedToolName(name);
    // Provide sensible default parameters
    let defaultArgs: any = {};
    if (name === 'get_product' || name === 'get_product_stock' || name === 'get_available_stock') {
      defaultArgs = { sku_or_id: 'PRD001' };
    } else if (name === 'search_business_records' || name === 'search_products' || name === 'search_orders') {
      defaultArgs = { query: 'Headphones' };
    } else if (name === 'adjust_inventory') {
      defaultArgs = { sku_or_id: 'PRD001', quantity_change: 5, reason: 'Physical inventory recount' };
    } else if (name === 'create_order') {
      defaultArgs = {
        customer_name: 'Aditi Rao',
        shipping_address: '102 Palm Grove, Mumbai, MH 400050',
        order_source: 'WHATSAPP',
        items: [{ sku: 'PRD001', quantity: 1 }],
      };
    } else if (name === 'confirm_order' || name === 'process_order') {
      defaultArgs = { order_id: 'ord_001' };
    } else if (name === 'cancel_order') {
      defaultArgs = { order_id: 'ord_003', reason: 'Customer changed specifications' };
    } else if (name === 'mark_order_packed') {
      defaultArgs = { order_number_or_id: 'ORD-2026-000001', packing_notes: 'Packed in double-walled box' };
    } else if (name === 'mark_order_shipped') {
      defaultArgs = { order_number_or_id: 'ORD-2026-000002', courier: 'BlueDart Express', tracking_number: 'BD-88992211' };
    } else if (name === 'record_payment') {
      defaultArgs = { order_number_or_id: 'ORD-2026-000001', amount: 1500, payment_method: 'UPI', reference_number: 'UPI-987211' };
    } else if (name === 'get_sales_report') {
      defaultArgs = {};
    } else if (name === 'export_report_csv') {
      defaultArgs = { report_type: 'orders' };
    }
    setInputArgsJson(JSON.stringify(defaultArgs, null, 2));
  };

  const handleExecuteTool = async () => {
    setExecuting(true);
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(inputArgsJson);
    } catch {
      alert('Invalid JSON input format');
      setExecuting(false);
      return;
    }

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: selectedToolName,
        arguments: parsedArgs,
      },
    };

    setLastRequestPayload(payload);

    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResponseOutput(data);
    } catch (err: any) {
      setResponseOutput({ error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  const selectedTool = tools.find((t) => t.name === selectedToolName);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          MCP Tool &amp; Prompt Playground
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Interactive client testbed: discover, inspect schemas, and execute any of the registered 70+ Remote MCP tools with live JSON-RPC request and response inspections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tool Discovery & Selection (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[700px] overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider block">
              Registered Tools ({tools.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tools.map((t) => {
              const isSelected = t.name === selectedToolName;
              return (
                <button
                  key={t.name}
                  onClick={() => handleSelectTool(t.name)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-mono text-[11px] truncate">{t.name}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {t.description}
                    </div>
                  </div>
                  {t.isHighImpact && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ml-1 ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      CONFIRM
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle & Right: Execution & JSON-RPC inspection (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tool Details Header */}
          {selectedTool && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-indigo-600" />
                  <h2 className="text-base font-bold font-mono text-slate-900">{selectedTool.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
                    Scope: {selectedTool.requiredScope}
                  </span>
                  {selectedTool.isHighImpact && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                      High-Impact Confirmation Policy
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedTool.description}</p>
            </div>
          )}

          {/* Arguments Editor */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Arguments Payload (JSON)
              </span>
              <button
                onClick={handleExecuteTool}
                disabled={executing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                <span>{executing ? 'Calling MCP...' : 'Execute MCP Tool'}</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={inputArgsJson}
              onChange={(e) => setInputArgsJson(e.target.value)}
              className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg outline-none border border-slate-800"
              placeholder="{}"
            />
          </div>

          {/* Response Viewer */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Code size={14} className="text-indigo-600" />
                <span>Live MCP JSON-RPC 2.0 Response</span>
              </span>
              {responseOutput && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    responseOutput.result?.isError
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {responseOutput.result?.isError ? 'ERROR / CONFIRMATION' : 'HTTP 200 OK'}
                </span>
              )}
            </div>

            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg overflow-x-auto max-h-[340px] leading-relaxed border border-slate-800">
              {responseOutput
                ? JSON.stringify(responseOutput, null, 2)
                : '// Click "Execute MCP Tool" above to test this remote tool live.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
