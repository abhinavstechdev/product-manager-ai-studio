export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'COD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  purchase_cost: number;
  selling_price: number;
  physical_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_threshold: number;
  is_archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  product_count?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  shipping_address: string;
  notes?: string;
  order_count?: number;
  total_spent?: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  item_discount: number;
  total_price: number;
}

export interface OrderHistory {
  id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  actor_name: string;
  note?: string;
  source: 'WEB' | 'MCP';
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address: string;
  order_source: string;
  status: OrderStatus;
  subtotal: number;
  order_discount: number;
  shipping_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes?: string;
  packing_notes?: string;
  order_date: string;
  created_at: string;
  items?: OrderItem[];
  history?: OrderHistory[];
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  type: string;
  reason: string;
  actor_name: string;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  courier: string;
  tracking_number: string;
  shipping_date: string;
  expected_delivery_date?: string;
  status: string;
  notes?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  order_number?: string;
  customer_name?: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  payment_date: string;
  notes?: string;
}

export interface ReturnRecord {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  refund_amount: number;
  return_notes?: string;
  created_at: string;
  items?: Array<{
    id: string;
    sku: string;
    product_name: string;
    quantity: number;
    condition: 'DAMAGED' | 'SELLABLE';
    approved_for_resale: boolean;
    restored_to_stock: boolean;
  }>;
}

export interface AuditEvent {
  id: string;
  request_id: string;
  actor_name: string;
  tool_name?: string;
  operation: string;
  target_record?: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PENDING_CONFIRMATION';
  after_value?: any;
}

export interface PendingConfirmation {
  id: string;
  token: string;
  tool_name: string;
  action_description: string;
  params: any;
  required_scope: string;
  expires_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

export interface DatabaseStatus {
  mode: 'LOCAL_EMBEDDED' | 'NEON_POSTGRES';
  isNeon: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  host: string;
  database: string;
  user?: string;
  ssl?: boolean;
  latencyMs?: number;
  neonProject?: string;
  tablesCount?: number;
  tables?: string[];
  message?: string;
  lastConnectedAt?: string;
  connectionStringMasked?: string;
}

