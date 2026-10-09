import { db } from '../db/store';
import { orderService } from './orderService';
import { OrderStatusHistory } from '../db/types';

export class PackingService {
  public listOrdersToPack(workspaceId: string) {
    const orders = Array.from(db.orders.values())
      .filter(
        (o) =>
          o.workspace_id === workspaceId &&
          (o.status === 'CONFIRMED' || o.status === 'PROCESSING')
      )
      .sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());

    return orders.map((o) => {
      const items = db.orderItems.get(o.id) || [];
      const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);
      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        shipping_address: o.shipping_address,
        order_source: o.order_source,
        status: o.status,
        order_date: o.order_date,
        item_count: items.length,
        total_quantity: totalUnits,
        packing_notes: o.packing_notes,
        notes: o.notes,
        items,
      };
    });
  }

  public getPackingQueue(workspaceId: string) {
    const orders = this.listOrdersToPack(workspaceId);
    const totalUnits = orders.reduce((sum, o) => sum + o.total_quantity, 0);

    return {
      workspace_id: workspaceId,
      queue_length: orders.length,
      total_units_to_pack: totalUnits,
      oldest_order_date: orders.length > 0 ? orders[0].order_date : null,
      orders,
    };
  }

  public getPackingDetails(workspaceId: string, orderNumberOrId: string) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const items = db.orderItems.get(order.id) || [];

    return {
      order_id: order.id,
      order_number: order.order_number,
      order_date: order.order_date,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      packing_notes: order.packing_notes,
      order_notes: order.notes,
      items: items.map((it) => ({
        product_id: it.product_id,
        sku: it.sku,
        product_name: it.product_name,
        quantity: it.quantity,
      })),
      history: db.orderStatusHistory.get(order.id) || [],
    };
  }

  public getPackingSlip(workspaceId: string, orderNumberOrId: string) {
    const details = this.getPackingDetails(workspaceId, orderNumberOrId);
    const totalQuantity = details.items.reduce((sum, it) => sum + it.quantity, 0);

    return {
      packing_slip_id: `SLIP-${details.order_number}`,
      order_number: details.order_number,
      order_date: details.order_date,
      customer: {
        name: details.customer_name,
        phone: details.customer_phone,
        shipping_address: details.shipping_address,
      },
      items: details.items,
      total_items_count: details.items.length,
      total_quantity: totalQuantity,
      packing_notes: details.packing_notes || 'Pack with care.',
      generated_at: new Date().toISOString(),
    };
  }

  public markOrderPacked(
    workspaceId: string,
    orderNumberOrId: string,
    packingNotes: string = '',
    actorName: string,
    source: 'WEB' | 'MCP' = 'WEB'
  ) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const existing = db.orders.get(order.id)!;

    if (!['CONFIRMED', 'PROCESSING'].includes(existing.status)) {
      throw new Error(
        `Order ${existing.order_number} is in status '${existing.status}'. Only CONFIRMED or PROCESSING orders can be marked as PACKED.`
      );
    }

    const prevStatus = existing.status;
    existing.status = 'PACKED';
    if (packingNotes) {
      existing.packing_notes = existing.packing_notes
        ? `${existing.packing_notes}; ${packingNotes}`
        : packingNotes;
    }
    existing.updated_at = new Date().toISOString();

    const history = db.orderStatusHistory.get(order.id) || [];
    const histEntry: OrderStatusHistory = {
      id: `hist_${Date.now()}`,
      order_id: order.id,
      previous_status: prevStatus,
      new_status: 'PACKED',
      actor_name: actorName,
      note: packingNotes ? `Packed: ${packingNotes}` : 'Packed and verified for dispatch',
      source,
      created_at: new Date().toISOString(),
    };
    history.push(histEntry);
    db.orderStatusHistory.set(order.id, history);

    return orderService.getOrder(workspaceId, order.id);
  }
}

export const packingService = new PackingService();
