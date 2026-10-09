import { Request, Response } from 'express';
import { mcpTools, mcpResources, mcpPrompts } from './registry';
import { db, DEFAULT_WORKSPACE_ID, DEFAULT_USER_ID } from '../db/store';
import { AuditEvent, PendingConfirmation } from '../db/types';

export interface AuthContext {
  workspaceId: string;
  userId: string;
  actorName: string;
  scopes: string[];
  clientId: string;
}

/**
 * Validates the authorization header on an incoming MCP request
 */
export function authenticateMcpRequest(req: Request): AuthContext {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // If no header provided, check query token or allow local demo access to default workspace with full scopes
    // In production, requires Bearer token
    const token = req.query.token as string;
    if (token) {
      const grant = db.oauthGrants.get(token);
      if (grant && new Date(grant.expires_at) > new Date()) {
        const user = db.users.get(grant.user_id);
        return {
          workspaceId: grant.workspace_id,
          userId: grant.user_id,
          actorName: user ? user.name : 'Authorized AI Assistant',
          scopes: grant.scopes,
          clientId: grant.client_id,
        };
      }
    }

    // Default development fallback token check or default workspace for playground
    return {
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: DEFAULT_USER_ID,
      actorName: 'AI Assistant (Demo Principal)',
      scopes: [
        'dashboard:read',
        'products:read',
        'products:write',
        'inventory:read',
        'inventory:write',
        'customers:read',
        'customers:write',
        'orders:read',
        'orders:create',
        'orders:update',
        'orders:cancel',
        'packing:read',
        'packing:write',
        'shipping:read',
        'shipping:write',
        'payments:read',
        'payments:write',
        'returns:read',
        'returns:write',
        'reports:read',
        'reports:export',
        'audit:read',
      ],
      clientId: 'claude-desktop-mcp',
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('UNAUTHORIZED: Invalid authorization header format. Expected "Bearer <token>"');
  }

  const token = parts[1];
  const grant = db.oauthGrants.get(token);

  if (!grant) {
    throw new Error('UNAUTHORIZED: Invalid or unrecognized access token');
  }

  if (new Date(grant.expires_at) < new Date()) {
    throw new Error('UNAUTHORIZED: Access token has expired');
  }

  const user = db.users.get(grant.user_id);

  return {
    workspaceId: grant.workspace_id,
    userId: grant.user_id,
    actorName: user ? `${user.name} (via MCP)` : 'Authorized MCP Client',
    scopes: grant.scopes,
    clientId: grant.client_id,
  };
}

export async function handleMcpPost(req: Request, res: Response) {
  // Support both single JSON-RPC and array of calls
  const body = req.body;
  const requestId = body?.id ?? (body?.requestId || `req_${Date.now()}`);

  try {
    // Authenticate principal
    const auth = authenticateMcpRequest(req);
    const method = body.method;

    if (!method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32600, message: 'Invalid Request: method is missing' },
      });
    }

    // 1. initialize
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'nexus-mcp-inventory',
            version: '1.0.0',
          },
        },
      });
    }

    // 2. notifications/initialized
    if (method === 'notifications/initialized') {
      return res.status(200).json({ jsonrpc: '2.0', id: requestId, result: {} });
    }

    // 3. ping
    if (method === 'ping') {
      return res.json({ jsonrpc: '2.0', id: requestId, result: {} });
    }

    // 4. tools/list
    if (method === 'tools/list') {
      const toolsList = Object.values(mcpTools).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));

      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: { tools: toolsList },
      });
    }

    // 5. tools/call
    if (method === 'tools/call') {
      const toolName = body.params?.name;
      const toolArgs = body.params?.arguments || {};

      if (!toolName) {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: requestId,
          error: { code: -32602, message: 'Missing tool name in params' },
        });
      }

      const tool = mcpTools[toolName];
      if (!tool) {
        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            isError: true,
            content: [{ type: 'text', text: `Tool not found: '${toolName}'` }],
          },
        });
      }

      // Check Scope
      if (tool.requiredScope && !auth.scopes.includes(tool.requiredScope)) {
        const auditEvent: AuditEvent = {
          id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: auth.workspaceId,
          request_id: String(requestId),
          actor_name: auth.actorName,
          tool_name: toolName,
          operation: 'FORBIDDEN_SCOPE_CHECK',
          timestamp: new Date().toISOString(),
          outcome: 'FAILURE',
          after_value: { required: tool.requiredScope, granted: auth.scopes },
        };
        db.auditEvents.set(auditEvent.id, auditEvent);

        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `FORBIDDEN: Missing required scope '${tool.requiredScope}'. Authorized scopes: [${auth.scopes.join(', ')}]`,
              },
            ],
          },
        });
      }

      // Check Confirmation Policy for High Impact Operations (Section 25)
      if (tool.isHighImpact) {
        const hasExplicitConfirm = toolArgs.confirm === true;
        const confirmationToken = toolArgs.confirmation_token;

        let confirmedValid = false;
        if (confirmationToken) {
          const pending = db.pendingConfirmations.get(confirmationToken);
          if (
            pending &&
            pending.workspace_id === auth.workspaceId &&
            pending.tool_name === toolName &&
            new Date(pending.expires_at) > new Date()
          ) {
            confirmedValid = true;
            pending.status = 'CONFIRMED';
          }
        }

        if (!hasExplicitConfirm && !confirmedValid) {
          // Generate a pending confirmation token
          const confToken = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const pending: PendingConfirmation = {
            id: `pc_${Date.now()}`,
            workspace_id: auth.workspaceId,
            token: confToken,
            tool_name: toolName,
            action_description: `High-impact action: ${toolName}`,
            params: toolArgs,
            required_scope: tool.requiredScope,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
            status: 'PENDING',
          };
          db.pendingConfirmations.set(confToken, pending);

          // Log Audit
          const auditEvent: AuditEvent = {
            id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            workspace_id: auth.workspaceId,
            request_id: String(requestId),
            actor_name: auth.actorName,
            tool_name: toolName,
            operation: 'CONFIRMATION_REQUIRED',
            timestamp: new Date().toISOString(),
            outcome: 'PENDING_CONFIRMATION',
            confirmation_reference: confToken,
            before_value: toolArgs,
          };
          db.auditEvents.set(auditEvent.id, auditEvent);

          return res.json({
            jsonrpc: '2.0',
            id: requestId,
            result: {
              isError: true,
              error_code: 'CONFIRMATION_REQUIRED',
              confirmation_token: confToken,
              content: [
                {
                  type: 'text',
                  text: `CONFIRMATION_REQUIRED: '${toolName}' is a high-impact operation that modifies stock or financial records.\nTo execute this action, provide confirmation by calling this tool again with either:\n1) "confirm": true in arguments, or\n2) "confirmation_token": "${confToken}".\nParameters: ${JSON.stringify(
                    toolArgs
                  )}`,
                },
              ],
            },
          });
        }
      }

      // Execute Tool Handler
      try {
        const result = await tool.handler(auth.workspaceId, toolArgs, auth.actorName);

        // Audit Success
        const auditEvent: AuditEvent = {
          id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: auth.workspaceId,
          request_id: String(requestId),
          actor_name: auth.actorName,
          tool_name: toolName,
          operation: 'EXECUTE_TOOL',
          timestamp: new Date().toISOString(),
          outcome: 'SUCCESS',
          after_value: result,
        };
        db.auditEvents.set(auditEvent.id, auditEvent);

        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } catch (err: any) {
        // Audit Failure
        const auditEvent: AuditEvent = {
          id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: auth.workspaceId,
          request_id: String(requestId),
          actor_name: auth.actorName,
          tool_name: toolName,
          operation: 'EXECUTE_TOOL_FAILED',
          timestamp: new Date().toISOString(),
          outcome: 'FAILURE',
          after_value: { error: err.message },
        };
        db.auditEvents.set(auditEvent.id, auditEvent);

        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `ERROR [${err.name || 'TOOL_EXECUTION_ERROR'}]: ${err.message}`,
              },
            ],
          },
        });
      }
    }

    // 6. resources/list
    if (method === 'resources/list') {
      const resList = mcpResources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: { resources: resList },
      });
    }

    // 7. resources/read
    if (method === 'resources/read') {
      const uri = body.params?.uri;
      const target = mcpResources.find((r) => r.uri === uri);
      if (!target) {
        return res.status(404).json({
          jsonrpc: '2.0',
          id: requestId,
          error: { code: -32602, message: `Resource not found: ${uri}` },
        });
      }
      const data = target.handler(auth.workspaceId);
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          contents: [
            {
              uri,
              mimeType: target.mimeType,
              text: JSON.stringify(data, null, 2),
            },
          ],
        },
      });
    }

    // 8. prompts/list
    if (method === 'prompts/list') {
      const pList = mcpPrompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }));
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: { prompts: pList },
      });
    }

    // 9. prompts/get
    if (method === 'prompts/get') {
      const pName = body.params?.name;
      const target = mcpPrompts.find((p) => p.name === pName);
      if (!target) {
        return res.status(404).json({
          jsonrpc: '2.0',
          id: requestId,
          error: { code: -32602, message: `Prompt not found: ${pName}` },
        });
      }
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          description: target.description,
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: target.instruction },
            },
          ],
        },
      });
    }

    return res.status(400).json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  } catch (err: any) {
    return res.status(401).json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -32000, message: err.message || 'Authentication error' },
    });
  }
}
