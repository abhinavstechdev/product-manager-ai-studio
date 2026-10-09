export type Role =
  | 'OWNER'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'ORDER_MANAGER'
  | 'PACKER'
  | 'VIEWER';

export type OrderSource =
  | 'WHATSAPP'
  | 'PHONE'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'WEBSITE'
  | 'WALK_IN'
  | 'OTHER';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH'
  | 'COD'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type InventoryTransactionType =
  | 'OPENING_STOCK'
  | 'STOCK_RECEIVED'
  | 'MANUAL_ADJUSTMENT'
  | 'STOCK_RESERVED'
  | 'RESERVATION_RELEASED'
  | 'ORDER_DISPATCHED'
  | 'RETURN_RECEIVED'
  | 'RETURN_APPROVED_FOR_RESALE'
  | 'DAMAGED_GOODS'
  | 'STOCK_CORRECTION';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  is_archived: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  purchase_cost: number;
  selling_price: number;
  physical_stock: number;
  reserved_stock: number;
  reorder_threshold: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  workspace_id: string;
  product_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  type: InventoryTransactionType;
  reason: string;
  order_id?: string;
  actor_id?: string;
  actor_name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  phone?: string;
  email?: string;
  shipping_address: string;
  notes?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  item_discount: number;
  total_price: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  actor_name: string;
  note?: string;
  source: 'WEB' | 'MCP';
  created_at: string;
}

export interface Order {
  id: string;
  workspace_id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address: string;
  order_source: OrderSource;
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
  updated_at: string;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
}

export interface Shipment {
  id: string;
  workspace_id: string;
  order_id: string;
  courier: string;
  tracking_number: string;
  shipping_date: string;
  expected_delivery_date?: string;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED_TO_ORIGIN';
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  workspace_id: string;
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  condition: 'DAMAGED' | 'SELLABLE';
  approved_for_resale: boolean;
  restored_to_stock: boolean;
}

export interface ReturnRecord {
  id: string;
  workspace_id: string;
  order_id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  refund_amount: number;
  return_notes?: string;
  created_at: string;
  updated_at: string;
  items?: ReturnItem[];
}

export interface AuditEvent {
  id: string;
  workspace_id: string;
  request_id: string;
  actor_name: string;
  tool_name?: string;
  operation: string;
  target_record?: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PENDING_CONFIRMATION';
  before_value?: any;
  after_value?: any;
  confirmation_reference?: string;
}

export interface OAuthClient {
  id: string;
  client_id: string;
  client_secret?: string;
  client_name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  created_at: string;
}

export interface OAuthGrant {
  id: string;
  client_id: string;
  workspace_id: string;
  user_id: string;
  code?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  access_token?: string;
  refresh_token?: string;
  scopes: string[];
  expires_at: string;
  created_at: string;
}

export interface PendingConfirmation {
  id: string;
  workspace_id: string;
  token: string;
  tool_name: string;
  action_description: string;
  params: any;
  required_scope: string;
  expires_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}
