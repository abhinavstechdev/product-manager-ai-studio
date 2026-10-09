import {
  User,
  Workspace,
  WorkspaceMember,
  Category,
  Product,
  InventoryTransaction,
  Customer,
  Order,
  OrderItem,
  OrderStatusHistory,
  Shipment,
  Payment,
  ReturnRecord,
  ReturnItem,
  AuditEvent,
  OAuthClient,
  OAuthGrant,
  PendingConfirmation,
  Role,
} from './types';

// Default Demo Seeds
const DEFAULT_USER_ID = 'usr_owner_001';
const DEFAULT_WORKSPACE_ID = 'ws_default_001';

class DataStore {
  public users: Map<string, User> = new Map();
  public workspaces: Map<string, Workspace> = new Map();
  public workspaceMembers: Map<string, WorkspaceMember> = new Map();
  public categories: Map<string, Category> = new Map();
  public products: Map<string, Product> = new Map();
  public inventoryTransactions: Map<string, InventoryTransaction> = new Map();
  public customers: Map<string, Customer> = new Map();
  public orders: Map<string, Order> = new Map();
  public orderItems: Map<string, OrderItem[]> = new Map(); // order_id -> items
  public orderStatusHistory: Map<string, OrderStatusHistory[]> = new Map(); // order_id -> history
  public shipments: Map<string, Shipment> = new Map();
  public payments: Map<string, Payment> = new Map();
  public returns: Map<string, ReturnRecord> = new Map();
  public auditEvents: Map<string, AuditEvent> = new Map();
  public oauthClients: Map<string, OAuthClient> = new Map();
  public oauthGrants: Map<string, OAuthGrant> = new Map();
  public pendingConfirmations: Map<string, PendingConfirmation> = new Map();

  private orderCounter = 1000;

  constructor() {
    this.seedDefaults();
  }

  public getNextOrderNumber(workspaceId: string): string {
    this.orderCounter++;
    const year = new Date().getFullYear();
    const padded = String(this.orderCounter).padStart(5, '0');
    return `ORD-${year}-${padded}`;
  }

  private seedDefaults() {
    // 1. Seed User
    const owner: User = {
      id: DEFAULT_USER_ID,
      email: 'owner@nexus-inventory.com',
      password_hash: 'hashed_password_demo_123',
      name: 'Abhinav Sharma',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.users.set(owner.id, owner);

    // 2. Seed Workspace
    const workspace: Workspace = {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Apex Retail Hub',
      slug: 'apex-retail',
      currency: 'INR',
      owner_id: owner.id,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.workspaces.set(workspace.id, workspace);

    // 3. Workspace Membership
    const member: WorkspaceMember = {
      id: 'mem_001',
      workspace_id: workspace.id,
      user_id: owner.id,
      role: 'OWNER',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.workspaceMembers.set(member.id, member);

    // 4. Categories
    const catElectronics: Category = {
      id: 'cat_elec',
      workspace_id: workspace.id,
      name: 'Electronics & Audio',
      slug: 'electronics-audio',
      description: 'Audio devices, smart wear, accessories',
      is_archived: false,
      created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
    };
    const catApparel: Category = {
      id: 'cat_apparel',
      workspace_id: workspace.id,
      name: 'Apparel & Workwear',
      slug: 'apparel-workwear',
      description: 'Modern office shirts, jackets, caps',
      is_archived: false,
      created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
    };
    const catOffice: Category = {
      id: 'cat_office',
      workspace_id: workspace.id,
      name: 'Office Supplies',
      slug: 'office-supplies',
      description: 'Notebooks, mechanical pens, ergonomic desk tools',
      is_archived: false,
      created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
    };
    this.categories.set(catElectronics.id, catElectronics);
    this.categories.set(catApparel.id, catApparel);
    this.categories.set(catOffice.id, catOffice);

    // 5. Products
    const productsSeed: Product[] = [
      {
        id: 'prd_001',
        workspace_id: workspace.id,
        name: 'Nexus ANC Wireless Headphones',
        sku: 'PRD001',
        barcode: '890123450001',
        description: 'Active noise cancelling wireless headphones with 40hr battery',
        category_id: catElectronics.id,
        purchase_cost: 1800,
        selling_price: 3499,
        physical_stock: 45,
        reserved_stock: 5,
        reorder_threshold: 15,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
      {
        id: 'prd_002',
        workspace_id: workspace.id,
        name: 'ErgoPulse Mechanical Keyboard',
        sku: 'PRD002',
        barcode: '890123450002',
        description: 'Hot-swappable tactile mechanical keyboard RGB',
        category_id: catElectronics.id,
        purchase_cost: 2200,
        selling_price: 4999,
        physical_stock: 22,
        reserved_stock: 2,
        reorder_threshold: 10,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
      {
        id: 'prd_003',
        workspace_id: workspace.id,
        name: 'Smart USB-C Fast Charger 65W',
        sku: 'PRD003',
        barcode: '890123450003',
        description: 'GaN technology universal compact charger',
        category_id: catElectronics.id,
        purchase_cost: 650,
        selling_price: 1499,
        physical_stock: 8, // Low stock alert!
        reserved_stock: 3,
        reorder_threshold: 12,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
      {
        id: 'prd_004',
        workspace_id: workspace.id,
        name: 'Merino Wool Minimalist Overshirt',
        sku: 'PRD004',
        barcode: '890123450004',
        description: 'Breathable premium wool overshirt in charcoal',
        category_id: catApparel.id,
        purchase_cost: 1100,
        selling_price: 2799,
        physical_stock: 18,
        reserved_stock: 0,
        reorder_threshold: 10,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
      {
        id: 'prd_005',
        workspace_id: workspace.id,
        name: 'Precision Aluminum Desk Mat (L)',
        sku: 'PRD005',
        barcode: '890123450005',
        description: 'Micro-textured anodized desk pad with non-slip base',
        category_id: catOffice.id,
        purchase_cost: 500,
        selling_price: 1299,
        physical_stock: 0, // Out of stock!
        reserved_stock: 0,
        reorder_threshold: 8,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
      {
        id: 'prd_006',
        workspace_id: workspace.id,
        name: 'Leather Executive Journal & Pen Set',
        sku: 'PRD006',
        barcode: '890123450006',
        description: 'Handcrafted full-grain leather bound notebook with brass rollerball',
        category_id: catOffice.id,
        purchase_cost: 420,
        selling_price: 999,
        physical_stock: 35,
        reserved_stock: 4,
        reorder_threshold: 10,
        is_archived: false,
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
        updated_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      },
    ];

    productsSeed.forEach((p) => {
      this.products.set(p.id, p);
      // Add opening transaction
      const tx: InventoryTransaction = {
        id: `tx_init_${p.id}`,
        workspace_id: workspace.id,
        product_id: p.id,
        quantity_change: p.physical_stock,
        previous_quantity: 0,
        new_quantity: p.physical_stock,
        type: 'OPENING_STOCK',
        reason: 'Initial system inventory stock count',
        actor_name: 'System Initializer',
        created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
      };
      this.inventoryTransactions.set(tx.id, tx);
    });

    // 6. Customers
    const cust1: Customer = {
      id: 'cust_001',
      workspace_id: workspace.id,
      name: 'Rohan Mehra',
      phone: '+91 98765 43210',
      email: 'rohan.mehra@example.com',
      shipping_address: 'Flat 402, Lotus Towers, Indiranagar, Bengaluru, KA 560038',
      notes: 'VIP customer, prefers WhatsApp notifications',
      created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
    };
    const cust2: Customer = {
      id: 'cust_002',
      workspace_id: workspace.id,
      name: 'Priya Sharma',
      phone: '+91 98111 22334',
      email: 'priya.sharma@example.com',
      shipping_address: 'B-14 Green Park Ext., New Delhi, DL 110016',
      notes: 'Repeat buyer for tech accessories',
      created_at: new Date('2026-01-12T11:00:00Z').toISOString(),
    };
    const cust3: Customer = {
      id: 'cust_003',
      workspace_id: workspace.id,
      name: 'Karthik Raja',
      phone: '+91 99400 11223',
      email: 'karthik.raja@example.com',
      shipping_address: 'No. 27, 2nd Main Road, T. Nagar, Chennai, TN 600017',
      notes: 'Corporate gifting account',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
    };
    this.customers.set(cust1.id, cust1);
    this.customers.set(cust2.id, cust2);
    this.customers.set(cust3.id, cust3);

    // 7. Orders
    // Order 1: ORD-2026-000001 (CONFIRMED, waiting to pack)
    const o1: Order = {
      id: 'ord_001',
      workspace_id: workspace.id,
      order_number: 'ORD-2026-000001',
      customer_id: cust1.id,
      customer_name: cust1.name,
      customer_email: cust1.email,
      customer_phone: cust1.phone,
      shipping_address: cust1.shipping_address,
      order_source: 'WHATSAPP',
      status: 'CONFIRMED',
      subtotal: 6998,
      order_discount: 200,
      shipping_fee: 100,
      total_amount: 6898,
      payment_status: 'PARTIALLY_PAID',
      payment_method: 'UPI',
      notes: 'Customer requested quick packaging',
      packing_notes: 'Include thank you greeting card',
      order_date: new Date('2026-10-08T09:30:00Z').toISOString(),
      created_at: new Date('2026-10-08T09:30:00Z').toISOString(),
      updated_at: new Date('2026-10-08T09:30:00Z').toISOString(),
    };
    const o1_items: OrderItem[] = [
      {
        id: 'item_001_1',
        order_id: o1.id,
        product_id: 'prd_001',
        sku: 'PRD001',
        product_name: 'Nexus ANC Wireless Headphones',
        quantity: 2,
        unit_price: 3499,
        item_discount: 0,
        total_price: 6998,
      },
    ];
    this.orders.set(o1.id, o1);
    this.orderItems.set(o1.id, o1_items);
    this.orderStatusHistory.set(o1.id, [
      {
        id: 'hist_1_1',
        order_id: o1.id,
        previous_status: undefined,
        new_status: 'NEW',
        actor_name: 'Abhinav Sharma',
        note: 'Order created via WhatsApp inquiry',
        source: 'WEB',
        created_at: new Date('2026-10-08T09:30:00Z').toISOString(),
      },
      {
        id: 'hist_1_2',
        order_id: o1.id,
        previous_status: 'NEW',
        new_status: 'CONFIRMED',
        actor_name: 'Abhinav Sharma',
        note: 'Customer confirmed details and made partial advance',
        source: 'WEB',
        created_at: new Date('2026-10-08T10:00:00Z').toISOString(),
      },
    ]);

    // Payment for o1
    const p1: Payment = {
      id: 'pay_001',
      workspace_id: workspace.id,
      order_id: o1.id,
      amount: 3000,
      payment_method: 'UPI',
      reference_number: 'UPI-REF-98721102',
      payment_date: new Date('2026-10-08T10:00:00Z').toISOString(),
      notes: 'Advance 3,000 received; balance 3,898 due on delivery',
      created_at: new Date('2026-10-08T10:00:00Z').toISOString(),
    };
    this.payments.set(p1.id, p1);

    // Order 2: ORD-2026-000002 (PACKED, waiting to ship)
    const o2: Order = {
      id: 'ord_002',
      workspace_id: workspace.id,
      order_number: 'ORD-2026-000002',
      customer_id: cust2.id,
      customer_name: cust2.name,
      customer_email: cust2.email,
      customer_phone: cust2.phone,
      shipping_address: cust2.shipping_address,
      order_source: 'INSTAGRAM',
      status: 'PACKED',
      subtotal: 4999,
      order_discount: 0,
      shipping_fee: 150,
      total_amount: 5149,
      payment_status: 'PAID',
      payment_method: 'UPI',
      notes: 'Gift pack requested',
      packing_notes: 'Packed in reinforced bubble box #B4',
      order_date: new Date('2026-10-08T11:15:00Z').toISOString(),
      created_at: new Date('2026-10-08T11:15:00Z').toISOString(),
      updated_at: new Date('2026-10-08T14:20:00Z').toISOString(),
    };
    const o2_items: OrderItem[] = [
      {
        id: 'item_002_1',
        order_id: o2.id,
        product_id: 'prd_002',
        sku: 'PRD002',
        product_name: 'ErgoPulse Mechanical Keyboard',
        quantity: 1,
        unit_price: 4999,
        item_discount: 0,
        total_price: 4999,
      },
    ];
    this.orders.set(o2.id, o2);
    this.orderItems.set(o2.id, o2_items);
    this.orderStatusHistory.set(o2.id, [
      {
        id: 'hist_2_1',
        order_id: o2.id,
        previous_status: undefined,
        new_status: 'NEW',
        actor_name: 'Priya Support',
        source: 'WEB',
        created_at: new Date('2026-10-08T11:15:00Z').toISOString(),
      },
      {
        id: 'hist_2_2',
        order_id: o2.id,
        previous_status: 'NEW',
        new_status: 'CONFIRMED',
        actor_name: 'Priya Support',
        source: 'WEB',
        created_at: new Date('2026-10-08T11:30:00Z').toISOString(),
      },
      {
        id: 'hist_2_3',
        order_id: o2.id,
        previous_status: 'CONFIRMED',
        new_status: 'PACKED',
        actor_name: 'Packer Ramesh',
        note: 'Packed carefully with seal #8812',
        source: 'WEB',
        created_at: new Date('2026-10-08T14:20:00Z').toISOString(),
      },
    ]);
    const p2: Payment = {
      id: 'pay_002',
      workspace_id: workspace.id,
      order_id: o2.id,
      amount: 5149,
      payment_method: 'UPI',
      reference_number: 'UPI-REF-33441199',
      payment_date: new Date('2026-10-08T11:30:00Z').toISOString(),
      notes: 'Full payment cleared online',
      created_at: new Date('2026-10-08T11:30:00Z').toISOString(),
    };
    this.payments.set(p2.id, p2);

    // Order 3: ORD-2026-000003 (NEW, Unpaid)
    const o3: Order = {
      id: 'ord_003',
      workspace_id: workspace.id,
      order_number: 'ORD-2026-000003',
      customer_id: cust3.id,
      customer_name: cust3.name,
      customer_email: cust3.email,
      customer_phone: cust3.phone,
      shipping_address: cust3.shipping_address,
      order_source: 'PHONE',
      status: 'NEW',
      subtotal: 3996,
      order_discount: 0,
      shipping_fee: 100,
      total_amount: 4096,
      payment_status: 'UNPAID',
      payment_method: 'BANK_TRANSFER',
      notes: 'PO #CORP-2026 pending payment authorization',
      order_date: new Date('2026-10-09T08:00:00Z').toISOString(),
      created_at: new Date('2026-10-09T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-09T08:00:00Z').toISOString(),
    };
    const o3_items: OrderItem[] = [
      {
        id: 'item_003_1',
        order_id: o3.id,
        product_id: 'prd_006',
        sku: 'PRD006',
        product_name: 'Leather Executive Journal & Pen Set',
        quantity: 4,
        unit_price: 999,
        item_discount: 0,
        total_price: 3996,
      },
    ];
    this.orders.set(o3.id, o3);
    this.orderItems.set(o3.id, o3_items);
    this.orderStatusHistory.set(o3.id, [
      {
        id: 'hist_3_1',
        order_id: o3.id,
        previous_status: undefined,
        new_status: 'NEW',
        actor_name: 'Abhinav Sharma',
        note: 'Corporate order draft submitted',
        source: 'WEB',
        created_at: new Date('2026-10-09T08:00:00Z').toISOString(),
      },
    ]);

    // 8. Seed OAuth client
    const demoClient: OAuthClient = {
      id: 'client_claude_demo',
      client_id: 'claude-desktop-mcp',
      client_secret: 'sec_desktop_demo_client_key_99',
      client_name: 'Claude Desktop Assistant',
      redirect_uris: ['http://localhost:3000/oauth/callback', 'http://localhost:8080/callback'],
      allowed_scopes: [
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
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.oauthClients.set(demoClient.client_id, demoClient);

    // Also seed a ready-to-use access token for instant MCP client testing without requiring interactive OAuth ceremony
    const readyGrant: OAuthGrant = {
      id: 'grant_ready_001',
      client_id: demoClient.client_id,
      workspace_id: workspace.id,
      user_id: owner.id,
      access_token: 'nexus_mcp_live_token_sec_key_2026',
      refresh_token: 'nexus_mcp_refresh_token_2026',
      scopes: demoClient.allowed_scopes,
      expires_at: new Date('2030-01-01T00:00:00Z').toISOString(),
      created_at: new Date().toISOString(),
    };
    this.oauthGrants.set(readyGrant.access_token!, readyGrant);

    // Initial audit log
    const initialAudit: AuditEvent = {
      id: 'audit_001',
      workspace_id: workspace.id,
      request_id: 'req_init_sys',
      actor_name: 'System Initializer',
      tool_name: 'system_bootstrap',
      operation: 'INITIALIZE_WORKSPACE',
      target_record: workspace.id,
      timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
      outcome: 'SUCCESS',
      after_value: { name: workspace.name, slug: workspace.slug },
    };
    this.auditEvents.set(initialAudit.id, initialAudit);
  }
}

// Global Singleton
export const db = new DataStore();
export { DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID };
