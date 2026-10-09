import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db, DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID } from './db/store';
import { productService } from './services/productService';
import { inventoryService } from './services/inventoryService';
import { customerService } from './services/customerService';
import { orderService } from './services/orderService';
import { packingService } from './services/packingService';
import { shippingService } from './services/shippingService';
import { paymentService } from './services/paymentService';
import { returnService } from './services/returnService';
import { reportService } from './services/reportService';
import { mcpTools, mcpPrompts } from './mcp/registry';
import { OAuthGrant } from './db/types';
import { registerTestRunnerApi } from './tests/run_tests';
import { dbManager } from './db/neonService';

export const apiRouter = express.Router();

// Register automated test runner
registerTestRunnerApi(apiRouter);

// Helper to get active workspace from header or default
function getWorkspaceId(req: Request): string {
  return (req.headers['x-workspace-id'] as string) || DEFAULT_WORKSPACE_ID;
}

function getActorName(req: Request): string {
  return (req.headers['x-user-name'] as string) || 'Admin Operator';
}

// 1. Auth & Current Workspace
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = db.users.get(DEFAULT_USER_ID);
  const workspace = db.workspaces.get(DEFAULT_WORKSPACE_ID);
  res.json({
    user,
    workspace,
    role: 'OWNER',
  });
});

apiRouter.get('/workspaces/current', (req: Request, res: Response) => {
  const ws = db.workspaces.get(getWorkspaceId(req));
  res.json(ws || db.workspaces.get(DEFAULT_WORKSPACE_ID));
});

// 2. Dashboard
apiRouter.get('/dashboard/summary', (req: Request, res: Response) => {
  try {
    const data = reportService.getDashboardSummary(getWorkspaceId(req));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Products & Categories
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category_id, search, low_stock_only } = req.query;
    const result = productService.listProducts(getWorkspaceId(req), {
      category_id: category_id as string,
      search: search as string,
      low_stock_only: low_stock_only === 'true',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/products', (req: Request, res: Response) => {
  try {
    const prod = productService.createProduct(
      getWorkspaceId(req),
      req.body,
      getActorName(req)
    );
    res.status(201).json(prod);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  try {
    const prod = productService.updateProduct(
      getWorkspaceId(req),
      req.params.id,
      req.body,
      getActorName(req)
    );
    res.json(prod);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const result = productService.archiveProduct(
      getWorkspaceId(req),
      req.params.id,
      getActorName(req)
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/categories', (req: Request, res: Response) => {
  try {
    res.json(productService.listCategories(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const cat = productService.createCategory(getWorkspaceId(req), req.body);
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Inventory
apiRouter.get('/inventory/summary', (req: Request, res: Response) => {
  try {
    res.json(inventoryService.getInventorySummary(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/inventory/transactions', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    res.json(inventoryService.listInventoryTransactions(getWorkspaceId(req), { limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/inventory/adjust', (req: Request, res: Response) => {
  try {
    const result = inventoryService.adjustInventory(getWorkspaceId(req), {
      skuOrId: req.body.sku_or_id,
      quantityChange: Number(req.body.quantity_change),
      reason: req.body.reason,
      actorName: getActorName(req),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/inventory/receive', (req: Request, res: Response) => {
  try {
    const result = inventoryService.receiveInventory(getWorkspaceId(req), {
      skuOrId: req.body.sku_or_id,
      quantityReceived: Number(req.body.quantity_received),
      reason: req.body.reason,
      actorName: getActorName(req),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/inventory/valuation', (req: Request, res: Response) => {
  try {
    res.json(inventoryService.getInventoryValuation(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Customers
apiRouter.get('/customers', (req: Request, res: Response) => {
  try {
    res.json(customerService.listCustomers(getWorkspaceId(req), req.query.search as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  try {
    const c = customerService.createCustomer(getWorkspaceId(req), req.body);
    res.status(201).json(c);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/customers/:id/orders', (req: Request, res: Response) => {
  try {
    res.json(customerService.getCustomerOrderHistory(getWorkspaceId(req), req.params.id));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 6. Orders
apiRouter.get('/orders', (req: Request, res: Response) => {
  try {
    const { status, payment_status, search } = req.query;
    res.json(
      orderService.listOrders(getWorkspaceId(req), {
        status: status as any,
        payment_status: payment_status as any,
        search: search as string,
      })
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  try {
    res.json(orderService.getOrder(getWorkspaceId(req), req.params.id));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

apiRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const order = orderService.createOrder(
      getWorkspaceId(req),
      req.body,
      getActorName(req),
      'WEB'
    );
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/orders/:id/confirm', (req: Request, res: Response) => {
  try {
    res.json(orderService.confirmOrder(getWorkspaceId(req), req.params.id, getActorName(req), 'WEB'));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/orders/:id/process', (req: Request, res: Response) => {
  try {
    res.json(orderService.processOrder(getWorkspaceId(req), req.params.id, getActorName(req), 'WEB'));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/orders/:id/cancel', (req: Request, res: Response) => {
  try {
    res.json(
      orderService.cancelOrder(
        getWorkspaceId(req),
        req.params.id,
        req.body.reason || 'Cancelled by operator',
        getActorName(req),
        'WEB'
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/orders/:id/note', (req: Request, res: Response) => {
  try {
    res.json(
      orderService.addOrderNote(
        getWorkspaceId(req),
        req.params.id,
        req.body.note,
        getActorName(req)
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Packing
apiRouter.get('/packing/queue', (req: Request, res: Response) => {
  try {
    res.json(packingService.getPackingQueue(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/packing/slip/:id', (req: Request, res: Response) => {
  try {
    res.json(packingService.getPackingSlip(getWorkspaceId(req), req.params.id));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

apiRouter.post('/packing/:id/pack', (req: Request, res: Response) => {
  try {
    res.json(
      packingService.markOrderPacked(
        getWorkspaceId(req),
        req.params.id,
        req.body.packing_notes,
        getActorName(req),
        'WEB'
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Shipping
apiRouter.get('/shipping/queue', (req: Request, res: Response) => {
  try {
    res.json(shippingService.getShippingQueue(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/shipping/shipped', (req: Request, res: Response) => {
  try {
    res.json(shippingService.getShippedOrders(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shipping/:id/ship', (req: Request, res: Response) => {
  try {
    const result = shippingService.markOrderShipped(
      getWorkspaceId(req),
      req.params.id,
      req.body.courier,
      req.body.tracking_number,
      req.body.notes,
      getActorName(req),
      'WEB'
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/shipping/:id/deliver', (req: Request, res: Response) => {
  try {
    res.json(
      shippingService.markOrderDelivered(
        getWorkspaceId(req),
        req.params.id,
        getActorName(req),
        'WEB'
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Payments
apiRouter.get('/payments', (req: Request, res: Response) => {
  try {
    res.json(paymentService.listPayments(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/payments/summary', (req: Request, res: Response) => {
  try {
    res.json(paymentService.getPaymentSummary(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/payments', (req: Request, res: Response) => {
  try {
    const result = paymentService.recordPayment(
      getWorkspaceId(req),
      req.body.order_id,
      Number(req.body.amount),
      req.body.payment_method,
      req.body.reference_number,
      req.body.notes,
      getActorName(req)
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Returns
apiRouter.get('/returns', (req: Request, res: Response) => {
  try {
    res.json(returnService.listReturns(getWorkspaceId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/returns', (req: Request, res: Response) => {
  try {
    const r = returnService.registerReturn(
      getWorkspaceId(req),
      req.body.order_id,
      req.body.items,
      req.body.reason,
      getActorName(req)
    );
    res.status(201).json(r);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/returns/:id/approve', (req: Request, res: Response) => {
  try {
    const r = returnService.approveReturn(getWorkspaceId(req), req.params.id, {
      restoreSellableStock: req.body.restore_sellable_stock !== false,
      refundAmount: Number(req.body.refund_amount) || 0,
      actorName: getActorName(req),
    });
    res.json(r);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/returns/:id/reject', (req: Request, res: Response) => {
  try {
    const r = returnService.rejectReturn(
      getWorkspaceId(req),
      req.params.id,
      req.body.reason || 'Rejected by inspector',
      getActorName(req)
    );
    res.json(r);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Reports & Exports
apiRouter.get('/reports/sales', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    res.json(reportService.getSalesReport(getWorkspaceId(req), start_date as string, end_date as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/export-csv', (req: Request, res: Response) => {
  try {
    const type = (req.query.type as any) || 'orders';
    const csv = reportService.exportReportCsv(getWorkspaceId(req), type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Audit Activity
apiRouter.get('/audit/activity', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    res.json(reportService.getRecentActivity(getWorkspaceId(req), limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. MCP Connections, Clients, & Personal Access Tokens
apiRouter.get('/mcp/tokens', (req: Request, res: Response) => {
  const ws = getWorkspaceId(req);
  const grants = Array.from(db.oauthGrants.values())
    .filter((g) => g.workspace_id === ws && g.access_token)
    .map((g) => ({
      id: g.id,
      client_id: g.client_id,
      access_token_preview: g.access_token ? `${g.access_token.substring(0, 14)}...` : '',
      scopes: g.scopes,
      expires_at: g.expires_at,
      created_at: g.created_at,
    }));
  res.json(grants);
});

apiRouter.post('/mcp/tokens', (req: Request, res: Response) => {
  const ws = getWorkspaceId(req);
  const clientName = req.body.client_name || 'Personal MCP Token';
  const rawToken = `nexus_mcp_${crypto.randomBytes(24).toString('hex')}`;

  const grant: OAuthGrant = {
    id: `grant_pat_${Date.now()}`,
    client_id: clientName,
    workspace_id: ws,
    user_id: DEFAULT_USER_ID,
    access_token: rawToken,
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
    expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(), // 1 year
    created_at: new Date().toISOString(),
  };

  db.oauthGrants.set(rawToken, grant);

  res.status(201).json({
    id: grant.id,
    token: rawToken,
    client_name: clientName,
    scopes: grant.scopes,
    expires_at: grant.expires_at,
  });
});

apiRouter.delete('/mcp/tokens/:id', (req: Request, res: Response) => {
  for (const [key, g] of db.oauthGrants.entries()) {
    if (g.id === req.params.id) {
      db.oauthGrants.delete(key);
    }
  }
  res.json({ success: true });
});

// 14. Pending Confirmations Management (Section 25)
apiRouter.get('/confirmations', (req: Request, res: Response) => {
  const ws = getWorkspaceId(req);
  const pending = Array.from(db.pendingConfirmations.values()).filter(
    (c) => c.workspace_id === ws && c.status === 'PENDING' && new Date(c.expires_at) > new Date()
  );
  res.json(pending);
});

apiRouter.post('/confirmations/:token/action', async (req: Request, res: Response) => {
  const token = req.params.token;
  const action = req.body.action; // 'CONFIRM' or 'REJECT'
  const pending = db.pendingConfirmations.get(token);

  if (!pending || pending.status !== 'PENDING') {
    return res.status(404).json({ error: 'Pending confirmation token not found or already processed' });
  }

  if (action === 'REJECT') {
    pending.status = 'REJECTED';
    return res.json({ success: true, message: 'High-impact operation rejected' });
  }

  if (action === 'CONFIRM') {
    pending.status = 'CONFIRMED';
    const tool = mcpTools[pending.tool_name];
    if (!tool) {
      return res.status(400).json({ error: `Tool ${pending.tool_name} not found` });
    }

    try {
      const result = await tool.handler(pending.workspace_id, pending.params, `${getActorName(req)} (Confirmed via Web)`);
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action: must be CONFIRM or REJECT' });
});

// 15. In-Dashboard MCP Interactive Console / Tool Discovery
apiRouter.get('/mcp/tools', (_req: Request, res: Response) => {
  const list = Object.values(mcpTools).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    requiredScope: t.requiredScope,
    isHighImpact: !!t.isHighImpact,
  }));
  res.json(list);
});

apiRouter.get('/mcp/prompts', (_req: Request, res: Response) => {
  res.json(mcpPrompts);
});

// 16. Database Management (Neon PostgreSQL & Local In-Memory)
apiRouter.get('/database/status', (_req: Request, res: Response) => {
  try {
    const status = dbManager.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/database/ping', async (_req: Request, res: Response) => {
  try {
    const status = await dbManager.ping();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/database/test', async (req: Request, res: Response) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) {
      return res.status(400).json({ error: 'Connection string is required' });
    }
    const result = await dbManager.testConnection(connectionString);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/database/connect', async (req: Request, res: Response) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) {
      return res.status(400).json({ error: 'Connection string is required' });
    }
    const result = await dbManager.connectNeon(connectionString);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/database/migrate', async (_req: Request, res: Response) => {
  try {
    const result = await dbManager.executeSchemaMigration();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/database/disconnect', async (_req: Request, res: Response) => {
  try {
    const status = await dbManager.disconnectNeon();
    res.json({
      success: true,
      message: 'Successfully switched back to Local Embedded ACID in-memory database.',
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

