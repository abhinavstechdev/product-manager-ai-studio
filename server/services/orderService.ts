import { db } from '../db/store';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  OrderSource,
  PaymentMethod,
  InventoryTransaction,
} from '../db/types';

export class OrderService {
  public listOrders(
    workspaceId: string,
    filters?: {
      status?: OrderStatus;
      payment_status?: string;
      order_source?: OrderSource;
      customer_id?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let orders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId
    );

    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }
    if (filters?.payment_status) {
      orders = orders.filter((o) => o.payment_status === filters.payment_status);
    }
    if (filters?.order_source) {
      orders = orders.filter((o) => o.order_source === filters.order_source);
    }
    if (filters?.customer_id) {
      orders = orders.filter((o) => o.customer_id === filters.customer_id);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.customer_phone && o.customer_phone.includes(q)) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(q))
      );
    }

    orders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = orders.length;
    if (filters?.offset) orders = orders.slice(filters.offset);
    if (filters?.limit) orders = orders.slice(0, filters.limit);

    const enriched = orders.map((o) => ({
      ...o,
      items: db.orderItems.get(o.id) || [],
      history: db.orderStatusHistory.get(o.id) || [],
    }));

    return { total, orders: enriched };
  }

  public searchOrders(workspaceId: string, query: string) {
    return this.listOrders(workspaceId, { search: query }).orders;
  }

  public getOrder(workspaceId: string, orderNumberOrId: string) {
    for (const o of db.orders.values()) {
      if (
        o.workspace_id === workspaceId &&
        (o.id === orderNumberOrId ||
          o.order_number.toLowerCase() === orderNumberOrId.toLowerCase())
      ) {
        return {
          ...o,
          items: db.orderItems.get(o.id) || [],
          history: db.orderStatusHistory.get(o.id) || [],
        };
      }
    }
    throw new Error(`Order not found for '${orderNumberOrId}' in this workspace`);
  }

  /**
   * Create a manual order with inventory reservation
   */
  public createOrder(
    workspaceId: string,
    data: {
      customer_id?: string;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      shipping_address: string;
      order_source?: OrderSource;
      items: Array<{
        sku: string;
        quantity: number;
        unit_price?: number;
        item_discount?: number;
      }>;
      order_discount?: number;
      shipping_fee?: number;
      payment_method?: PaymentMethod;
      notes?: string;
      packing_notes?: string;
    },
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    if (!data.customer_name || data.customer_name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (!data.shipping_address || data.shipping_address.trim().length === 0) {
      throw new Error('Shipping address is required');
    }

    // Validate items and verify available stock before reserving
    const validatedItems: Array<{
      product: any;
      quantity: number;
      unitPrice: number;
      itemDiscount: number;
      lineTotal: number;
    }> = [];

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for item ${item.sku}`);
      }

      // Find product
      let targetProd: any = null;
      for (const p of db.products.values()) {
        if (
          p.workspace_id === workspaceId &&
          (p.sku.toLowerCase() === item.sku.toLowerCase() || p.id === item.sku)
        ) {
          targetProd = p;
          break;
        }
      }

      if (!targetProd) {
        throw new Error(`Product not found with SKU/ID '${item.sku}'`);
      }

      if (targetProd.is_archived) {
        throw new Error(`Product '${targetProd.name}' (${targetProd.sku}) is archived and cannot be ordered`);
      }

      const available = targetProd.physical_stock - targetProd.reserved_stock;
      if (available < item.quantity) {
        throw new Error(
          `INSUFFICIENT_STOCK: Cannot order ${item.quantity} units of '${targetProd.name}' (${targetProd.sku}). Only ${available} available in stock.`
        );
      }

      const unitPrice = item.unit_price !== undefined ? Number(item.unit_price) : targetProd.selling_price;
      const itemDiscount = item.item_discount ? Number(item.item_discount) : 0;
      const lineTotal = Math.max(0, unitPrice * item.quantity - itemDiscount);

      validatedItems.push({
        product: targetProd,
        quantity: item.quantity,
        unitPrice,
        itemDiscount,
        lineTotal,
      });
    }

    // Server-side calculation of exact monetary totals
    const subtotal = validatedItems.reduce((acc, it) => acc + it.lineTotal, 0);
    const orderDiscount = data.order_discount ? Number(data.order_discount) : 0;
    const shippingFee = data.shipping_fee ? Number(data.shipping_fee) : 0;
    const totalAmount = Math.max(0, Math.round((subtotal - orderDiscount + shippingFee) * 100) / 100);

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = db.getNextOrderNumber(workspaceId);

    // Atomically reserve inventory for each line item
    for (const it of validatedItems) {
      const prod = it.product;
      prod.reserved_stock += it.quantity;
      prod.updated_at = new Date().toISOString();

      const tx: InventoryTransaction = {
        id: `tx_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: workspaceId,
        product_id: prod.id,
        quantity_change: 0, // physical stock unchanged yet
        previous_quantity: prod.physical_stock,
        new_quantity: prod.physical_stock,
        type: 'STOCK_RESERVED',
        reason: `Reserved ${it.quantity} units for order ${orderNumber}`,
        order_id: orderId,
        actor_name: actorName,
        created_at: new Date().toISOString(),
      };
      db.inventoryTransactions.set(tx.id, tx);
    }

    // Create Order Record
    const newOrder: Order = {
      id: orderId,
      workspace_id: workspaceId,
      order_number: orderNumber,
      customer_id: data.customer_id,
      customer_name: data.customer_name.trim(),
      customer_email: data.customer_email?.trim(),
      customer_phone: data.customer_phone?.trim(),
      shipping_address: data.shipping_address.trim(),
      order_source: data.order_source || 'WEBSITE',
      status: 'CONFIRMED', // Eligible orders start confirmed and reserved
      subtotal,
      order_discount: orderDiscount,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      payment_status: 'UNPAID',
      payment_method: data.payment_method || 'COD',
      notes: data.notes?.trim(),
      packing_notes: data.packing_notes?.trim(),
      order_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store line items snapshots
    const orderItemsList: OrderItem[] = validatedItems.map((it) => ({
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: orderId,
      product_id: it.product.id,
      sku: it.product.sku,
      product_name: it.product.name,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      item_discount: it.itemDiscount,
      total_price: it.lineTotal,
    }));

    // Status History
    const initialHistory: OrderStatusHistory[] = [
      {
        id: `hist_${Date.now()}_1`,
        order_id: orderId,
        previous_status: undefined,
        new_status: 'NEW',
        actor_name: actorName,
        note: `Order placed via ${newOrder.order_source}`,
        source,
        created_at: new Date().toISOString(),
      },
      {
        id: `hist_${Date.now()}_2`,
        order_id: orderId,
        previous_status: 'NEW',
        new_status: 'CONFIRMED',
        actor_name: actorName,
        note: `Stock reserved for ${validatedItems.length} items`,
        source,
        created_at: new Date().toISOString(),
      },
    ];

    db.orders.set(newOrder.id, newOrder);
    db.orderItems.set(newOrder.id, orderItemsList);
    db.orderStatusHistory.set(newOrder.id, initialHistory);

    return this.getOrder(workspaceId, newOrder.id);
  }

  public updateOrder(
    workspaceId: string,
    orderId: string,
    data: Partial<{
      shipping_address: string;
      notes: string;
      packing_notes: string;
      payment_method: PaymentMethod;
    }>,
    _actorName: string
  ) {
    const order = this.getOrder(workspaceId, orderId);
    const existing = db.orders.get(order.id)!;

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(existing.status)) {
      throw new Error(`Cannot modify order in status '${existing.status}'`);
    }

    if (data.shipping_address) existing.shipping_address = data.shipping_address.trim();
    if (data.notes !== undefined) existing.notes = data.notes.trim();
    if (data.packing_notes !== undefined) existing.packing_notes = data.packing_notes.trim();
    if (data.payment_method) existing.payment_method = data.payment_method;
    existing.updated_at = new Date().toISOString();

    return this.getOrder(workspaceId, existing.id);
  }

  public getOrderItems(workspaceId: string, orderId: string) {
    const o = this.getOrder(workspaceId, orderId);
    return db.orderItems.get(o.id) || [];
  }

  public getOrderHistory(workspaceId: string, orderId: string) {
    const o = this.getOrder(workspaceId, orderId);
    return db.orderStatusHistory.get(o.id) || [];
  }

  public addOrderNote(
    workspaceId: string,
    orderId: string,
    note: string,
    actorName: string
  ) {
    const o = this.getOrder(workspaceId, orderId);
    const existing = db.orders.get(o.id)!;
    existing.notes = existing.notes ? `${existing.notes}\n[${actorName}]: ${note}` : note;
    existing.updated_at = new Date().toISOString();

    const history = db.orderStatusHistory.get(o.id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      order_id: o.id,
      previous_status: existing.status,
      new_status: existing.status,
      actor_name: actorName,
      note: `Note added: ${note}`,
      source: 'WEB',
      created_at: new Date().toISOString(),
    });
    db.orderStatusHistory.set(o.id, history);

    return this.getOrder(workspaceId, o.id);
  }

  public confirmOrder(
    workspaceId: string,
    orderId: string,
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    const o = this.getOrder(workspaceId, orderId);
    const existing = db.orders.get(o.id)!;

    if (existing.status !== 'NEW') {
      throw new Error(`Order is already in status '${existing.status}', expected 'NEW'`);
    }

    existing.status = 'CONFIRMED';
    existing.updated_at = new Date().toISOString();

    const history = db.orderStatusHistory.get(o.id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      order_id: o.id,
      previous_status: 'NEW',
      new_status: 'CONFIRMED',
      actor_name: actorName,
      note: 'Order confirmed by operator',
      source,
      created_at: new Date().toISOString(),
    });
    db.orderStatusHistory.set(o.id, history);

    return this.getOrder(workspaceId, o.id);
  }

  public processOrder(
    workspaceId: string,
    orderId: string,
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    const o = this.getOrder(workspaceId, orderId);
    const existing = db.orders.get(o.id)!;

    if (existing.status !== 'CONFIRMED') {
      throw new Error(`Only CONFIRMED orders can be moved to PROCESSING (current: '${existing.status}')`);
    }

    existing.status = 'PROCESSING';
    existing.updated_at = new Date().toISOString();

    const history = db.orderStatusHistory.get(o.id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      order_id: o.id,
      previous_status: 'CONFIRMED',
      new_status: 'PROCESSING',
      actor_name: actorName,
      note: 'Order processing in warehouse',
      source,
      created_at: new Date().toISOString(),
    });
    db.orderStatusHistory.set(o.id, history);

    return this.getOrder(workspaceId, o.id);
  }

  public cancelOrder(
    workspaceId: string,
    orderId: string,
    reason: string,
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    const o = this.getOrder(workspaceId, orderId);
    const existing = db.orders.get(o.id)!;

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(existing.status)) {
      throw new Error(`Cannot cancel order in status '${existing.status}'`);
    }

    const prevStatus = existing.status;
    existing.status = 'CANCELLED';
    existing.updated_at = new Date().toISOString();

    // Release all reserved stock
    const items = db.orderItems.get(o.id) || [];
    for (const item of items) {
      const prod = db.products.get(item.product_id);
      if (prod) {
        prod.reserved_stock = Math.max(0, prod.reserved_stock - item.quantity);
        prod.updated_at = new Date().toISOString();

        const tx: InventoryTransaction = {
          id: `tx_rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: workspaceId,
          product_id: prod.id,
          quantity_change: 0,
          previous_quantity: prod.physical_stock,
          new_quantity: prod.physical_stock,
          type: 'RESERVATION_RELEASED',
          reason: `Released ${item.quantity} units due to order cancellation (${reason})`,
          order_id: o.id,
          actor_name: actorName,
          created_at: new Date().toISOString(),
        };
        db.inventoryTransactions.set(tx.id, tx);
      }
    }

    const history = db.orderStatusHistory.get(o.id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      order_id: o.id,
      previous_status: prevStatus,
      new_status: 'CANCELLED',
      actor_name: actorName,
      note: `Cancelled: ${reason}`,
      source,
      created_at: new Date().toISOString(),
    });
    db.orderStatusHistory.set(o.id, history);

    return this.getOrder(workspaceId, o.id);
  }
}

export const orderService = new OrderService();
