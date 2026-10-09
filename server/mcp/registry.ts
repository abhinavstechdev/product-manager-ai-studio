import { z } from 'zod';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import { packingService } from '../services/packingService';
import { shippingService } from '../services/shippingService';
import { paymentService } from '../services/paymentService';
import { returnService } from '../services/returnService';
import { reportService } from '../services/reportService';
import { db } from '../db/store';
import { PendingConfirmation } from '../db/types';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema for MCP tools/list
  requiredScope: string;
  isHighImpact?: boolean;
  handler: (workspaceId: string, params: any, actorName: string) => Promise<any> | any;
}

export const mcpTools: Record<string, MCPToolDefinition> = {
  // --- DASHBOARD & SEARCH ---
  get_dashboard_summary: {
    name: 'get_dashboard_summary',
    description: 'Retrieve real-time summary of stock, orders to pack/ship, payments and recent activity.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'dashboard:read',
    handler: (ws) => reportService.getDashboardSummary(ws),
  },

  get_business_overview: {
    name: 'get_business_overview',
    description: 'Get high-level executive business overview and performance summary.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'dashboard:read',
    handler: (ws) => reportService.getBusinessOverview(ws),
  },

  search_business_records: {
    name: 'search_business_records',
    description: 'Search across products, customers, and orders matching a keyword query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query keyword or SKU' },
      },
      required: ['query'],
    },
    requiredScope: 'dashboard:read',
    handler: (ws, { query }) => reportService.searchBusinessRecords(ws, query),
  },

  get_recent_activity: {
    name: 'get_recent_activity',
    description: 'List recent system and AI audit activity events.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items to return (default: 20)' },
      },
    },
    requiredScope: 'audit:read',
    handler: (ws, { limit }) => reportService.getRecentActivity(ws, limit),
  },

  get_low_stock_products: {
    name: 'get_low_stock_products',
    description: 'Retrieve list of products where available stock is below or at reorder threshold.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'inventory:read',
    handler: (ws) => inventoryService.getLowStockReport(ws),
  },

  get_out_of_stock_products: {
    name: 'get_out_of_stock_products',
    description: 'Retrieve all products with 0 or negative available stock.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'inventory:read',
    handler: (ws) => {
      const summary = inventoryService.getLowStockReport(ws);
      return {
        workspace_id: ws,
        items: summary.items.filter((i) => i.available_stock <= 0),
      };
    },
  },

  // --- PRODUCTS ---
  list_products: {
    name: 'list_products',
    description: 'List products in the catalog with category, pricing, and stock metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'string' },
        search: { type: 'string' },
        low_stock_only: { type: 'boolean' },
      },
    },
    requiredScope: 'products:read',
    handler: (ws, params) => productService.listProducts(ws, params),
  },

  search_products: {
    name: 'search_products',
    description: 'Search products by name, SKU, or barcode.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    requiredScope: 'products:read',
    handler: (ws, { query }) => productService.searchProducts(ws, query),
  },

  get_product: {
    name: 'get_product',
    description: 'Get product details by SKU or internal ID.',
    inputSchema: {
      type: 'object',
      properties: { id_or_sku: { type: 'string' } },
      required: ['id_or_sku'],
    },
    requiredScope: 'products:read',
    handler: (ws, { id_or_sku }) => productService.getProduct(ws, id_or_sku),
  },

  create_product: {
    name: 'create_product',
    description: 'Create a new product with SKU, selling price, cost, and optional initial stock.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        sku: { type: 'string' },
        purchase_cost: { type: 'number' },
        selling_price: { type: 'number' },
        initial_stock: { type: 'number' },
        reorder_threshold: { type: 'number' },
        category_id: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name', 'sku', 'purchase_cost', 'selling_price'],
    },
    requiredScope: 'products:write',
    handler: (ws, params, actor) => productService.createProduct(ws, params, actor),
  },

  update_product: {
    name: 'update_product',
    description: 'Update existing product information such as price, name, or reorder threshold.',
    inputSchema: {
      type: 'object',
      properties: {
        id_or_sku: { type: 'string' },
        name: { type: 'string' },
        purchase_cost: { type: 'number' },
        selling_price: { type: 'number' },
        reorder_threshold: { type: 'number' },
      },
      required: ['id_or_sku'],
    },
    requiredScope: 'products:write',
    handler: (ws, { id_or_sku, ...data }, actor) => productService.updateProduct(ws, id_or_sku, data, actor),
  },

  archive_product: {
    name: 'archive_product',
    description: 'Archive a product so it can no longer be ordered or adjusted.',
    inputSchema: {
      type: 'object',
      properties: { id_or_sku: { type: 'string' } },
      required: ['id_or_sku'],
    },
    requiredScope: 'products:write',
    isHighImpact: true,
    handler: (ws, { id_or_sku }, actor) => productService.archiveProduct(ws, id_or_sku, actor),
  },

  list_categories: {
    name: 'list_categories',
    description: 'List all product categories in the workspace.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'products:read',
    handler: (ws) => productService.listCategories(ws),
  },

  create_category: {
    name: 'create_category',
    description: 'Create a new product category.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
    requiredScope: 'products:write',
    handler: (ws, params) => productService.createCategory(ws, params),
  },

  update_category: {
    name: 'update_category',
    description: 'Update a product category details.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['id'],
    },
    requiredScope: 'products:write',
    handler: (ws, { id, ...data }) => productService.updateCategory(ws, id, data),
  },

  // --- INVENTORY ---
  get_inventory_summary: {
    name: 'get_inventory_summary',
    description: 'Get workspace stock summary: physical, reserved, available, and valuation.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'inventory:read',
    handler: (ws) => inventoryService.getInventorySummary(ws),
  },

  get_product_stock: {
    name: 'get_product_stock',
    description: 'Get detailed physical and reserved stock breakdown for a specific product.',
    inputSchema: {
      type: 'object',
      properties: { sku_or_id: { type: 'string' } },
      required: ['sku_or_id'],
    },
    requiredScope: 'inventory:read',
    handler: (ws, { sku_or_id }) => inventoryService.getProductStock(ws, sku_or_id),
  },

  get_available_stock: {
    name: 'get_available_stock',
    description: 'Calculate and return available stock (Physical - Reserved) for a product.',
    inputSchema: {
      type: 'object',
      properties: { sku_or_id: { type: 'string' } },
      required: ['sku_or_id'],
    },
    requiredScope: 'inventory:read',
    handler: (ws, { sku_or_id }) => inventoryService.getAvailableStock(ws, sku_or_id),
  },

  get_reserved_stock: {
    name: 'get_reserved_stock',
    description: 'Return current reserved stock committed to active customer orders.',
    inputSchema: {
      type: 'object',
      properties: { sku_or_id: { type: 'string' } },
      required: ['sku_or_id'],
    },
    requiredScope: 'inventory:read',
    handler: (ws, { sku_or_id }) => inventoryService.getReservedStock(ws, sku_or_id),
  },

  list_inventory_transactions: {
    name: 'list_inventory_transactions',
    description: 'List ledger transactions recording stock receipts, adjustments, and reservations.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        limit: { type: 'number' },
      },
    },
    requiredScope: 'inventory:read',
    handler: (ws, params) => inventoryService.listInventoryTransactions(ws, params),
  },

  adjust_inventory: {
    name: 'adjust_inventory',
    description: 'Adjust inventory quantity for a product. Requires mandatory reason. Enforces ledger record.',
    inputSchema: {
      type: 'object',
      properties: {
        sku_or_id: { type: 'string' },
        quantity_change: { type: 'number', description: 'Delta to apply, e.g. -5 or 10' },
        reason: { type: 'string', description: 'Mandatory reason for adjustment' },
      },
      required: ['sku_or_id', 'quantity_change', 'reason'],
    },
    requiredScope: 'inventory:write',
    isHighImpact: true,
    handler: (ws, params, actor) =>
      inventoryService.adjustInventory(ws, {
        skuOrId: params.sku_or_id,
        quantityChange: Number(params.quantity_change),
        reason: params.reason,
        actorName: actor,
      }),
  },

  receive_inventory: {
    name: 'receive_inventory',
    description: 'Receive new physical inventory into warehouse from supplier/purchase order.',
    inputSchema: {
      type: 'object',
      properties: {
        sku_or_id: { type: 'string' },
        quantity_received: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['sku_or_id', 'quantity_received'],
    },
    requiredScope: 'inventory:write',
    handler: (ws, params, actor) =>
      inventoryService.receiveInventory(ws, {
        skuOrId: params.sku_or_id,
        quantityReceived: Number(params.quantity_received),
        reason: params.reason,
        actorName: actor,
      }),
  },

  get_low_stock_report: {
    name: 'get_low_stock_report',
    description: 'Get inventory report listing products nearing reorder limits.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'inventory:read',
    handler: (ws) => inventoryService.getLowStockReport(ws),
  },

  get_inventory_valuation: {
    name: 'get_inventory_valuation',
    description: 'Calculate total inventory valuation based on purchase cost and retail price.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'inventory:read',
    handler: (ws) => inventoryService.getInventoryValuation(ws),
  },

  // --- CUSTOMERS ---
  list_customers: {
    name: 'list_customers',
    description: 'List customers with contact information and order history stats.',
    inputSchema: {
      type: 'object',
      properties: { search: { type: 'string' } },
    },
    requiredScope: 'customers:read',
    handler: (ws, { search }) => customerService.listCustomers(ws, search),
  },

  search_customers: {
    name: 'search_customers',
    description: 'Search customers by name, phone, or email.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    requiredScope: 'customers:read',
    handler: (ws, { query }) => customerService.searchCustomers(ws, query),
  },

  get_customer: {
    name: 'get_customer',
    description: 'Get customer profile and order history summary.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    requiredScope: 'customers:read',
    handler: (ws, { id }) => customerService.getCustomer(ws, id),
  },

  create_customer: {
    name: 'create_customer',
    description: 'Create a new customer profile.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        shipping_address: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name', 'shipping_address'],
    },
    requiredScope: 'customers:write',
    handler: (ws, params) => customerService.createCustomer(ws, params),
  },

  update_customer: {
    name: 'update_customer',
    description: 'Update customer contact information or notes.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        shipping_address: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
    requiredScope: 'customers:write',
    handler: (ws, { id, ...data }) => customerService.updateCustomer(ws, id, data),
  },

  get_customer_order_history: {
    name: 'get_customer_order_history',
    description: 'Retrieve all historical orders placed by a customer.',
    inputSchema: {
      type: 'object',
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
    requiredScope: 'customers:read',
    handler: (ws, { customer_id }) => customerService.getCustomerOrderHistory(ws, customer_id),
  },

  // --- ORDERS ---
  list_orders: {
    name: 'list_orders',
    description: 'List customer orders with status, payment status, and totals.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        payment_status: { type: 'string' },
        search: { type: 'string' },
      },
    },
    requiredScope: 'orders:read',
    handler: (ws, params) => orderService.listOrders(ws, params),
  },

  search_orders: {
    name: 'search_orders',
    description: 'Search orders by order number, customer name, phone, or address.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    requiredScope: 'orders:read',
    handler: (ws, { query }) => orderService.searchOrders(ws, query),
  },

  get_order: {
    name: 'get_order',
    description: 'Get full order details including line items and status audit history.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'orders:read',
    handler: (ws, { order_number_or_id }) => orderService.getOrder(ws, order_number_or_id),
  },

  create_order: {
    name: 'create_order',
    description: 'Create a manual customer order with items. Automatically reserves stock and generates order number.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        shipping_address: { type: 'string' },
        customer_phone: { type: 'string' },
        customer_email: { type: 'string' },
        order_source: {
          type: 'string',
          enum: ['WHATSAPP', 'PHONE', 'INSTAGRAM', 'FACEBOOK', 'WEBSITE', 'WALK_IN', 'OTHER'],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
            required: ['sku', 'quantity'],
          },
        },
        order_discount: { type: 'number' },
        shipping_fee: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['customer_name', 'shipping_address', 'items'],
    },
    requiredScope: 'orders:create',
    isHighImpact: true,
    handler: (ws, params, actor) => orderService.createOrder(ws, params, actor, 'MCP'),
  },

  update_order: {
    name: 'update_order',
    description: 'Update order shipping address, notes, or payment method.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        shipping_address: { type: 'string' },
        notes: { type: 'string' },
        packing_notes: { type: 'string' },
      },
      required: ['order_id'],
    },
    requiredScope: 'orders:update',
    handler: (ws, { order_id, ...data }, actor) => orderService.updateOrder(ws, order_id, data, actor),
  },

  get_order_items: {
    name: 'get_order_items',
    description: 'Get line items for an order with SKU, historical unit price, and line totals.',
    inputSchema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
      required: ['order_id'],
    },
    requiredScope: 'orders:read',
    handler: (ws, { order_id }) => orderService.getOrderItems(ws, order_id),
  },

  get_order_history: {
    name: 'get_order_history',
    description: 'Get status transition timeline and actor log for an order.',
    inputSchema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
      required: ['order_id'],
    },
    requiredScope: 'orders:read',
    handler: (ws, { order_id }) => orderService.getOrderHistory(ws, order_id),
  },

  add_order_note: {
    name: 'add_order_note',
    description: 'Append an internal note to an order.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['order_id', 'note'],
    },
    requiredScope: 'orders:update',
    handler: (ws, { order_id, note }, actor) => orderService.addOrderNote(ws, order_id, note, actor),
  },

  confirm_order: {
    name: 'confirm_order',
    description: 'Confirm a NEW order and prepare it for warehouse packing.',
    inputSchema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
      required: ['order_id'],
    },
    requiredScope: 'orders:update',
    handler: (ws, { order_id }, actor) => orderService.confirmOrder(ws, order_id, actor, 'MCP'),
  },

  process_order: {
    name: 'process_order',
    description: 'Move a confirmed order into active PROCESSING status.',
    inputSchema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
      required: ['order_id'],
    },
    requiredScope: 'orders:update',
    handler: (ws, { order_id }, actor) => orderService.processOrder(ws, order_id, actor, 'MCP'),
  },

  cancel_order: {
    name: 'cancel_order',
    description: 'Cancel an order and release all reserved stock back to available inventory.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['order_id', 'reason'],
    },
    requiredScope: 'orders:cancel',
    isHighImpact: true,
    handler: (ws, { order_id, reason }, actor) => orderService.cancelOrder(ws, order_id, reason, actor, 'MCP'),
  },

  // --- PACKING ---
  list_orders_to_pack: {
    name: 'list_orders_to_pack',
    description: 'List all confirmed orders ready in the packing queue.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'packing:read',
    handler: (ws) => packingService.listOrdersToPack(ws),
  },

  get_packing_queue: {
    name: 'get_packing_queue',
    description: 'Get packing queue overview and total units pending packing.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'packing:read',
    handler: (ws) => packingService.getPackingQueue(ws),
  },

  get_packing_details: {
    name: 'get_packing_details',
    description: 'Get item checklist and special instructions for packing an order.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'packing:read',
    handler: (ws, { order_number_or_id }) => packingService.getPackingDetails(ws, order_number_or_id),
  },

  get_packing_slip: {
    name: 'get_packing_slip',
    description: 'Generate formatted packing slip containing customer shipping address, items, and SKUs.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'packing:read',
    handler: (ws, { order_number_or_id }) => packingService.getPackingSlip(ws, order_number_or_id),
  },

  mark_order_packed: {
    name: 'mark_order_packed',
    description: 'Mark order as PACKED and ready for shipping handoff.',
    inputSchema: {
      type: 'object',
      properties: {
        order_number_or_id: { type: 'string' },
        packing_notes: { type: 'string' },
      },
      required: ['order_number_or_id'],
    },
    requiredScope: 'packing:write',
    handler: (ws, { order_number_or_id, packing_notes }, actor) =>
      packingService.markOrderPacked(ws, order_number_or_id, packing_notes, actor, 'MCP'),
  },

  // --- SHIPPING ---
  list_orders_to_ship: {
    name: 'list_orders_to_ship',
    description: 'List all packed orders awaiting courier pickup/dispatch.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'shipping:read',
    handler: (ws) => shippingService.listOrdersToShip(ws),
  },

  get_shipping_queue: {
    name: 'get_shipping_queue',
    description: 'Get dispatch queue summary and packed orders awaiting shipping.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'shipping:read',
    handler: (ws) => shippingService.getShippingQueue(ws),
  },

  get_shipped_orders: {
    name: 'get_shipped_orders',
    description: 'List shipped and in-transit orders with tracking details.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'shipping:read',
    handler: (ws) => shippingService.getShippedOrders(ws),
  },

  get_shipment_details: {
    name: 'get_shipment_details',
    description: 'Get courier tracking and dispatch details for an order.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'shipping:read',
    handler: (ws, { order_number_or_id }) => shippingService.getShipmentDetails(ws, order_number_or_id),
  },

  update_shipping_details: {
    name: 'update_shipping_details',
    description: 'Update courier tracking number or expected delivery date.',
    inputSchema: {
      type: 'object',
      properties: {
        order_number_or_id: { type: 'string' },
        courier: { type: 'string' },
        tracking_number: { type: 'string' },
      },
      required: ['order_number_or_id'],
    },
    requiredScope: 'shipping:write',
    handler: (ws, { order_number_or_id, ...data }, actor) =>
      shippingService.updateShippingDetails(ws, order_number_or_id, data, actor),
  },

  mark_order_shipped: {
    name: 'mark_order_shipped',
    description: 'Dispatch an order: decrements physical stock, releases reserved stock, records ledger transactions, and sets status to SHIPPED.',
    inputSchema: {
      type: 'object',
      properties: {
        order_number_or_id: { type: 'string' },
        courier: { type: 'string' },
        tracking_number: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['order_number_or_id', 'courier', 'tracking_number'],
    },
    requiredScope: 'shipping:write',
    isHighImpact: true,
    handler: (ws, { order_number_or_id, courier, tracking_number, notes }, actor) =>
      shippingService.markOrderShipped(ws, order_number_or_id, courier, tracking_number, notes, actor, 'MCP'),
  },

  mark_order_delivered: {
    name: 'mark_order_delivered',
    description: 'Mark order as delivered to customer. Note: does not alter payment status automatically.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'shipping:write',
    handler: (ws, { order_number_or_id }, actor) =>
      shippingService.markOrderDelivered(ws, order_number_or_id, actor, 'MCP'),
  },

  // --- PAYMENTS ---
  list_payments: {
    name: 'list_payments',
    description: 'List recorded payment transactions.',
    inputSchema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
    },
    requiredScope: 'payments:read',
    handler: (ws, { order_id }) => paymentService.listPayments(ws, order_id),
  },

  get_order_payment_status: {
    name: 'get_order_payment_status',
    description: 'Check paid amount, balance remaining, and payment status for an order.',
    inputSchema: {
      type: 'object',
      properties: { order_number_or_id: { type: 'string' } },
      required: ['order_number_or_id'],
    },
    requiredScope: 'payments:read',
    handler: (ws, { order_number_or_id }) => paymentService.getOrderPaymentStatus(ws, order_number_or_id),
  },

  record_payment: {
    name: 'record_payment',
    description: 'Record a payment transaction against an order. Recalculates balance and updates payment status.',
    inputSchema: {
      type: 'object',
      properties: {
        order_number_or_id: { type: 'string' },
        amount: { type: 'number' },
        payment_method: {
          type: 'string',
          enum: ['CASH', 'COD', 'UPI', 'BANK_TRANSFER', 'OTHER'],
        },
        reference_number: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['order_number_or_id', 'amount'],
    },
    requiredScope: 'payments:write',
    isHighImpact: true,
    handler: (ws, params, actor) =>
      paymentService.recordPayment(
        ws,
        params.order_number_or_id,
        Number(params.amount),
        params.payment_method || 'UPI',
        params.reference_number,
        params.notes,
        actor
      ),
  },

  get_unpaid_orders: {
    name: 'get_unpaid_orders',
    description: 'Find all orders with UNPAID payment status.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'payments:read',
    handler: (ws) => paymentService.getUnpaidOrders(ws),
  },

  get_partial_payment_orders: {
    name: 'get_partial_payment_orders',
    description: 'Find orders with partial payments and calculate outstanding balance on each.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'payments:read',
    handler: (ws) => paymentService.getPartialPaymentOrders(ws),
  },

  get_payment_summary: {
    name: 'get_payment_summary',
    description: 'Get aggregated financial overview: revenue collected vs total receivables and balances.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'payments:read',
    handler: (ws) => paymentService.getPaymentSummary(ws),
  },

  // --- RETURNS ---
  list_returns: {
    name: 'list_returns',
    description: 'List customer return requests and inspection records.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'returns:read',
    handler: (ws) => returnService.listReturns(ws),
  },

  get_return_details: {
    name: 'get_return_details',
    description: 'Get return details, item conditions (DAMAGED vs SELLABLE), and inspection notes.',
    inputSchema: {
      type: 'object',
      properties: { return_id: { type: 'string' } },
      required: ['return_id'],
    },
    requiredScope: 'returns:read',
    handler: (ws, { return_id }) => returnService.getReturnDetails(ws, return_id),
  },

  register_return: {
    name: 'register_return',
    description: 'Register a return for an order with item condition tagging.',
    inputSchema: {
      type: 'object',
      properties: {
        order_number_or_id: { type: 'string' },
        reason: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              quantity: { type: 'number' },
              condition: { type: 'string', enum: ['DAMAGED', 'SELLABLE'] },
            },
            required: ['sku', 'quantity', 'condition'],
          },
        },
      },
      required: ['order_number_or_id', 'reason', 'items'],
    },
    requiredScope: 'returns:write',
    handler: (ws, params, actor) =>
      returnService.registerReturn(ws, params.order_number_or_id, params.items, params.reason, actor),
  },

  approve_return: {
    name: 'approve_return',
    description: 'Approve inspected return. Restores sellable items to physical stock ledger.',
    inputSchema: {
      type: 'object',
      properties: {
        return_id: { type: 'string' },
        restore_sellable_stock: { type: 'boolean' },
        refund_amount: { type: 'number' },
      },
      required: ['return_id'],
    },
    requiredScope: 'returns:write',
    isHighImpact: true,
    handler: (ws, params, actor) =>
      returnService.approveReturn(ws, params.return_id, {
        restoreSellableStock: params.restore_sellable_stock !== false,
        refundAmount: Number(params.refund_amount) || 0,
        actorName: actor,
      }),
  },

  reject_return: {
    name: 'reject_return',
    description: 'Reject a return request with explanation.',
    inputSchema: {
      type: 'object',
      properties: {
        return_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['return_id', 'reason'],
    },
    requiredScope: 'returns:write',
    handler: (ws, { return_id, reason }, actor) => returnService.rejectReturn(ws, return_id, reason, actor),
  },

  // --- REPORTS ---
  get_sales_report: {
    name: 'get_sales_report',
    description: 'Get sales report filtered by date range showing gross sales, discounts, and net revenue.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
    },
    requiredScope: 'reports:read',
    handler: (ws, { start_date, end_date }) => reportService.getSalesReport(ws, start_date, end_date),
  },

  get_order_report: {
    name: 'get_order_report',
    description: 'Get comprehensive order counts, status distribution, and fulfillment metrics.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => {
      const summary = reportService.getDashboardSummary(ws);
      return summary.orders;
    },
  },

  get_inventory_report: {
    name: 'get_inventory_report',
    description: 'Get full inventory status, valuations, and stock health.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => inventoryService.getInventoryValuation(ws),
  },

  get_product_performance: {
    name: 'get_product_performance',
    description: 'List top best-selling products by units sold and generated revenue.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => reportService.getProductPerformance(ws),
  },

  get_payment_report: {
    name: 'get_payment_report',
    description: 'Get payment collections, cash vs online methods, and unpaid balances.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => paymentService.getPaymentSummary(ws),
  },

  get_cancellation_report: {
    name: 'get_cancellation_report',
    description: 'Get summary of all cancelled orders and reason breakdown.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => {
      const cancelled = Array.from(db.orders.values()).filter(
        (o) => o.workspace_id === ws && o.status === 'CANCELLED'
      );
      return {
        workspace_id: ws,
        total_cancelled: cancelled.length,
        cancelled_orders: cancelled.map((o) => ({
          order_number: o.order_number,
          customer_name: o.customer_name,
          total_amount: o.total_amount,
          history: db.orderStatusHistory.get(o.id) || [],
        })),
      };
    },
  },

  get_return_report: {
    name: 'get_return_report',
    description: 'Get summary of all returns and damaged vs resale item ratios.',
    inputSchema: { type: 'object', properties: {} },
    requiredScope: 'reports:read',
    handler: (ws) => {
      const returns = returnService.listReturns(ws);
      return {
        workspace_id: ws,
        total_returns: returns.length,
        returns,
      };
    },
  },

  export_report_csv: {
    name: 'export_report_csv',
    description: 'Export orders, inventory, or payment reports into downloadable CSV format.',
    inputSchema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: ['orders', 'inventory', 'payments', 'sales'],
        },
      },
      required: ['report_type'],
    },
    requiredScope: 'reports:export',
    handler: (ws, { report_type }) => ({
      report_type,
      csv_content: reportService.exportReportCsv(ws, report_type),
    }),
  },
};

// Registered MCP Resources
export const mcpResources = [
  {
    uri: 'inventory://summary',
    name: 'Inventory Summary',
    description: 'Real-time physical, reserved, and available stock totals',
    mimeType: 'application/json',
    handler: (ws: string) => inventoryService.getInventorySummary(ws),
  },
  {
    uri: 'inventory://low-stock',
    name: 'Low Stock Products',
    description: 'Items below reorder thresholds needing replenishment',
    mimeType: 'application/json',
    handler: (ws: string) => inventoryService.getLowStockReport(ws),
  },
  {
    uri: 'inventory://out-of-stock',
    name: 'Out of Stock Products',
    description: 'Items with zero available units',
    mimeType: 'application/json',
    handler: (ws: string) => {
      const r = inventoryService.getLowStockReport(ws);
      return r.items.filter((i) => i.available_stock <= 0);
    },
  },
  {
    uri: 'orders://recent',
    name: 'Recent Orders',
    description: 'Latest 10 customer orders with status and value',
    mimeType: 'application/json',
    handler: (ws: string) => orderService.listOrders(ws, { limit: 10 }).orders,
  },
  {
    uri: 'orders://pending',
    name: 'Pending Unconfirmed Orders',
    description: 'Orders awaiting confirmation or approval',
    mimeType: 'application/json',
    handler: (ws: string) => orderService.listOrders(ws, { status: 'NEW' }).orders,
  },
  {
    uri: 'orders://packing-queue',
    name: 'Packing Queue',
    description: 'Confirmed orders ready for warehouse packing',
    mimeType: 'application/json',
    handler: (ws: string) => packingService.getPackingQueue(ws),
  },
  {
    uri: 'orders://shipping-queue',
    name: 'Shipping Dispatch Queue',
    description: 'Packed orders awaiting courier handover',
    mimeType: 'application/json',
    handler: (ws: string) => shippingService.getShippingQueue(ws),
  },
  {
    uri: 'reports://dashboard',
    name: 'Business Dashboard Overview',
    description: 'Consolidated executive dashboard overview',
    mimeType: 'application/json',
    handler: (ws: string) => reportService.getDashboardSummary(ws),
  },
];

// Registered MCP Prompts
export const mcpPrompts = [
  {
    name: 'daily_business_summary',
    description: 'Generate an executive daily summary of sales, orders, packing queue, and stock alerts.',
    arguments: [],
    instruction:
      'Please call get_dashboard_summary and get_business_overview. Summarize today\'s revenue collected, outstanding orders to pack/ship, and any inventory alerts in a concise executive briefing.',
  },
  {
    name: 'prepare_packing_list',
    description: 'Produce a clear warehouse packing list for all orders currently ready to be packed.',
    arguments: [],
    instruction:
      'Call list_orders_to_pack and get_packing_queue. Format a clean checklist of order numbers, customer delivery addresses, line items with SKU and quantities for warehouse packers.',
  },
  {
    name: 'identify_low_stock',
    description: 'Identify low-stock and out-of-stock items and calculate required replenishment quantities.',
    arguments: [],
    instruction:
      'Call get_low_stock_products. For each item, list the SKU, available stock, reorder threshold, and suggested purchase order quantity.',
  },
  {
    name: 'review_pending_orders',
    description: 'Audit orders waiting in NEW or CONFIRMED state and highlight bottlenecks.',
    arguments: [],
    instruction:
      'Call list_orders with status filters. Review any unconfirmed orders and flag those waiting longer than 24 hours.',
  },
  {
    name: 'audit_inventory_changes',
    description: 'Review recent manual stock adjustments and transaction ledger entries for compliance.',
    arguments: [],
    instruction:
      'Call list_inventory_transactions. Audit recent MANUAL_ADJUSTMENT and STOCK_CORRECTION entries, verifying reasons and actors.',
  },
  {
    name: 'review_unpaid_orders',
    description: 'List all delivered or confirmed orders with unpaid or partial balances.',
    arguments: [],
    instruction:
      'Call get_unpaid_orders and get_partial_payment_orders. Report total outstanding receivable amounts and contact numbers for payment follow-up.',
  },
  {
    name: 'analyze_monthly_sales',
    description: 'Perform analytical breakdown of sales, best-selling SKUs, and average order values.',
    arguments: [],
    instruction:
      'Call get_sales_report and get_product_performance. Provide actionable insights on revenue trends and product velocity.',
  },
];
