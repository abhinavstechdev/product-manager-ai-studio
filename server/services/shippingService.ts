import { db } from '../db/store';
import { orderService } from './orderService';
import { Shipment, InventoryTransaction, OrderStatusHistory } from '../db/types';

export class ShippingService {
  public listOrdersToShip(workspaceId: string) {
    const orders = Array.from(db.orders.values())
      .filter((o) => o.workspace_id === workspaceId && o.status === 'PACKED')
      .sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());

    return orders.map((o) => {
      const items = db.orderItems.get(o.id) || [];
      return {
        ...o,
        items,
        total_items: items.length,
        total_units: items.reduce((sum, it) => sum + it.quantity, 0),
      };
    });
  }

  public getShippingQueue(workspaceId: string) {
    const orders = this.listOrdersToShip(workspaceId);
    return {
      workspace_id: workspaceId,
      queue_count: orders.length,
      orders,
    };
  }

  public getShippedOrders(workspaceId: string) {
    const orders = Array.from(db.orders.values())
      .filter(
        (o) =>
          o.workspace_id === workspaceId &&
          (o.status === 'SHIPPED' || o.status === 'DELIVERED')
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return orders.map((o) => {
      const shipment = Array.from(db.shipments.values()).find(
        (s) => s.workspace_id === workspaceId && s.order_id === o.id
      );
      return {
        ...o,
        shipment,
        items: db.orderItems.get(o.id) || [],
      };
    });
  }

  public getShipmentDetails(workspaceId: string, orderNumberOrId: string) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const shipment = Array.from(db.shipments.values()).find(
      (s) => s.workspace_id === workspaceId && s.order_id === order.id
    );

    return {
      order,
      shipment: shipment || null,
      items: db.orderItems.get(order.id) || [],
    };
  }

  public updateShippingDetails(
    workspaceId: string,
    orderNumberOrId: string,
    data: {
      courier?: string;
      tracking_number?: string;
      notes?: string;
      expected_delivery_date?: string;
    },
    _actorName: string
  ) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    let shipment = Array.from(db.shipments.values()).find(
      (s) => s.workspace_id === workspaceId && s.order_id === order.id
    );

    if (!shipment) {
      shipment = {
        id: `ship_${Date.now()}`,
        workspace_id: workspaceId,
        order_id: order.id,
        courier: data.courier || 'Standard Courier',
        tracking_number: data.tracking_number || 'PENDING',
        shipping_date: new Date().toISOString(),
        expected_delivery_date: data.expected_delivery_date,
        status: 'IN_TRANSIT',
        notes: data.notes,
        created_at: new Date().toISOString(),
      };
      db.shipments.set(shipment.id, shipment);
    } else {
      if (data.courier) shipment.courier = data.courier;
      if (data.tracking_number) shipment.tracking_number = data.tracking_number;
      if (data.notes !== undefined) shipment.notes = data.notes;
      if (data.expected_delivery_date) shipment.expected_delivery_date = data.expected_delivery_date;
    }

    return shipment;
  }

  /**
   * Mark order as shipped:
   * Decrements physical stock, releases reserved stock, records ledger transactions,
   * creates shipment record, updates order status to SHIPPED.
   */
  public markOrderShipped(
    workspaceId: string,
    orderNumberOrId: string,
    courier: string,
    trackingNumber: string,
    notes: string = '',
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    if (!courier || courier.trim().length === 0) {
      throw new Error('Courier name is required to mark order as shipped');
    }
    if (!trackingNumber || trackingNumber.trim().length === 0) {
      throw new Error('Tracking number is required to mark order as shipped');
    }

    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const existing = db.orders.get(order.id)!;

    if (existing.status !== 'PACKED') {
      throw new Error(
        `Order ${existing.order_number} is in status '${existing.status}'. Orders must be in PACKED status before dispatch.`
      );
    }

    const items = db.orderItems.get(order.id) || [];
    if (items.length === 0) {
      throw new Error(`Order ${existing.order_number} has no line items.`);
    }

    // Step 4 & 5: Atomically reduce physical stock & release reserved stock
    for (const item of items) {
      const prod = db.products.get(item.product_id);
      if (!prod) {
        throw new Error(`Product ${item.sku} not found during dispatch`);
      }

      const prevPhysical = prod.physical_stock;
      prod.physical_stock = Math.max(0, prod.physical_stock - item.quantity);
      prod.reserved_stock = Math.max(0, prod.reserved_stock - item.quantity);
      prod.updated_at = new Date().toISOString();

      // Step 6: Create inventory ledger entry
      const tx: InventoryTransaction = {
        id: `tx_disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: workspaceId,
        product_id: prod.id,
        quantity_change: -item.quantity,
        previous_quantity: prevPhysical,
        new_quantity: prod.physical_stock,
        type: 'ORDER_DISPATCHED',
        reason: `Order ${existing.order_number} dispatched via ${courier} (${trackingNumber})`,
        order_id: order.id,
        actor_name: actorName,
        created_at: new Date().toISOString(),
      };
      db.inventoryTransactions.set(tx.id, tx);
    }

    // Step 7: Create shipment record
    const shipment: Shipment = {
      id: `ship_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspaceId,
      order_id: order.id,
      courier: courier.trim(),
      tracking_number: trackingNumber.trim(),
      shipping_date: new Date().toISOString(),
      status: 'IN_TRANSIT',
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    };
    db.shipments.set(shipment.id, shipment);

    // Step 8: Update order status to SHIPPED
    existing.status = 'SHIPPED';
    existing.updated_at = new Date().toISOString();

    // Step 9: History log
    const history = db.orderStatusHistory.get(order.id) || [];
    const histEntry: OrderStatusHistory = {
      id: `hist_${Date.now()}`,
      order_id: order.id,
      previous_status: 'PACKED',
      new_status: 'SHIPPED',
      actor_name: actorName,
      note: `Dispatched via ${courier} (Tracking: ${trackingNumber})`,
      source,
      created_at: new Date().toISOString(),
    };
    history.push(histEntry);
    db.orderStatusHistory.set(order.id, history);

    return {
      order: orderService.getOrder(workspaceId, order.id),
      shipment,
    };
  }

  /**
   * Mark order delivered:
   * NOTE: Per requirement 13 & 16: "Delivered orders must not automatically become paid."
   */
  public markOrderDelivered(
    workspaceId: string,
    orderNumberOrId: string,
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const existing = db.orders.get(order.id)!;

    if (existing.status !== 'SHIPPED') {
      throw new Error(
        `Order ${existing.order_number} is in status '${existing.status}'. Only SHIPPED orders can be marked as DELIVERED.`
      );
    }

    existing.status = 'DELIVERED';
    existing.updated_at = new Date().toISOString();

    // Update shipment status
    const shipment = Array.from(db.shipments.values()).find(
      (s) => s.workspace_id === workspaceId && s.order_id === order.id
    );
    if (shipment) {
      shipment.status = 'DELIVERED';
    }

    const history = db.orderStatusHistory.get(order.id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      order_id: order.id,
      previous_status: 'SHIPPED',
      new_status: 'DELIVERED',
      actor_name: actorName,
      note: 'Delivered to customer',
      source,
      created_at: new Date().toISOString(),
    });
    db.orderStatusHistory.set(order.id, history);

    return orderService.getOrder(workspaceId, order.id);
  }
}

export const shippingService = new ShippingService();
