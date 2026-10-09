import { db } from '../db/store';
import { orderService } from './orderService';
import {
  ReturnRecord,
  ReturnItem,
  InventoryTransaction,
  OrderStatusHistory,
} from '../db/types';

export class ReturnService {
  public listReturns(workspaceId: string) {
    const returns = Array.from(db.returns.values())
      .filter((r) => r.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return returns.map((r) => {
      const order = db.orders.get(r.order_id);
      return {
        ...r,
        order_number: order ? order.order_number : 'N/A',
        customer_name: order ? order.customer_name : 'Unknown',
        items: r.items || [],
      };
    });
  }

  public getReturnDetails(workspaceId: string, returnId: string) {
    const r = db.returns.get(returnId);
    if (!r || r.workspace_id !== workspaceId) {
      throw new Error(`Return record not found: ${returnId}`);
    }
    const order = db.orders.get(r.order_id);
    return {
      ...r,
      order_number: order ? order.order_number : 'N/A',
      customer_name: order ? order.customer_name : 'Unknown',
      items: r.items || [],
    };
  }

  public registerReturn(
    workspaceId: string,
    orderNumberOrId: string,
    items: Array<{
      sku: string;
      quantity: number;
      condition: 'DAMAGED' | 'SELLABLE';
    }>,
    reason: string,
    actorName: string
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is required to register a return');
    }
    if (!items || items.length === 0) {
      throw new Error('At least one item must be specified for the return');
    }

    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    if (!['SHIPPED', 'DELIVERED'].includes(order.status)) {
      throw new Error(`Cannot return order in '${order.status}' status. Only SHIPPED or DELIVERED orders can be returned.`);
    }

    const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const returnItems: ReturnItem[] = [];

    for (const item of items) {
      // Find item in original order
      const originalItem = (db.orderItems.get(order.id) || []).find(
        (it) => it.sku.toLowerCase() === item.sku.toLowerCase()
      );
      if (!originalItem) {
        throw new Error(`Item ${item.sku} does not belong to order ${order.order_number}`);
      }

      if (item.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot return ${item.quantity} units of ${item.sku}; only ${originalItem.quantity} were purchased`
        );
      }

      returnItems.push({
        id: `rit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        return_id: returnId,
        product_id: originalItem.product_id,
        sku: originalItem.sku,
        product_name: originalItem.product_name,
        quantity: item.quantity,
        condition: item.condition,
        approved_for_resale: false,
        restored_to_stock: false,
      });

      // Record inventory transaction: RETURN_RECEIVED (quarantined, physical stock NOT yet added to available)
      const prod = db.products.get(originalItem.product_id);
      if (prod) {
        const tx: InventoryTransaction = {
          id: `tx_ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: workspaceId,
          product_id: prod.id,
          quantity_change: 0, // Not restored yet until approved!
          previous_quantity: prod.physical_stock,
          new_quantity: prod.physical_stock,
          type: 'RETURN_RECEIVED',
          reason: `Return received for ${order.order_number} (${item.quantity} units, ${item.condition}) - awaiting inspection`,
          order_id: order.id,
          actor_name: actorName,
          created_at: new Date().toISOString(),
        };
        db.inventoryTransactions.set(tx.id, tx);
      }
    }

    const returnRecord: ReturnRecord = {
      id: returnId,
      workspace_id: workspaceId,
      order_id: order.id,
      reason: reason.trim(),
      status: 'PENDING',
      refund_amount: 0,
      return_notes: `Registered by ${actorName}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: returnItems,
    };

    db.returns.set(returnRecord.id, returnRecord);
    return this.getReturnDetails(workspaceId, returnRecord.id);
  }

  public approveReturn(
    workspaceId: string,
    returnId: string,
    options: {
      restoreSellableStock?: boolean;
      refundAmount?: number;
      actorName: string;
      reason?: string;
    }
  ) {
    const returnRecord = this.getReturnDetails(workspaceId, returnId);
    const existing = db.returns.get(returnRecord.id)!;

    if (existing.status !== 'PENDING') {
      throw new Error(`Return is already ${existing.status}`);
    }

    existing.status = 'APPROVED';
    existing.refund_amount = options.refundAmount || 0;
    existing.updated_at = new Date().toISOString();

    const order = db.orders.get(existing.order_id);

    // Process items for resale approval and stock restoration
    if (existing.items) {
      for (const item of existing.items) {
        if (item.condition === 'SELLABLE' && options.restoreSellableStock !== false) {
          const prod = db.products.get(item.product_id);
          if (prod) {
            const prevPhysical = prod.physical_stock;
            prod.physical_stock += item.quantity;
            prod.updated_at = new Date().toISOString();

            item.approved_for_resale = true;
            item.restored_to_stock = true;

            const tx: InventoryTransaction = {
              id: `tx_ret_appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              workspace_id: workspaceId,
              product_id: prod.id,
              quantity_change: item.quantity,
              previous_quantity: prevPhysical,
              new_quantity: prod.physical_stock,
              type: 'RETURN_APPROVED_FOR_RESALE',
              reason: `Approved return resale for order ${order?.order_number || ''}`,
              order_id: existing.order_id,
              actor_name: options.actorName,
              created_at: new Date().toISOString(),
            };
            db.inventoryTransactions.set(tx.id, tx);
          }
        } else if (item.condition === 'DAMAGED') {
          // Log damaged goods
          const prod = db.products.get(item.product_id);
          if (prod) {
            const tx: InventoryTransaction = {
              id: `tx_dmg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              workspace_id: workspaceId,
              product_id: prod.id,
              quantity_change: 0,
              previous_quantity: prod.physical_stock,
              new_quantity: prod.physical_stock,
              type: 'DAMAGED_GOODS',
              reason: `Inspected damaged goods from return for order ${order?.order_number || ''}`,
              order_id: existing.order_id,
              actor_name: options.actorName,
              created_at: new Date().toISOString(),
            };
            db.inventoryTransactions.set(tx.id, tx);
          }
        }
      }
    }

    // Update order status to RETURNED
    if (order) {
      order.status = 'RETURNED';
      order.updated_at = new Date().toISOString();

      const history = db.orderStatusHistory.get(order.id) || [];
      const hist: OrderStatusHistory = {
        id: `hist_${Date.now()}`,
        order_id: order.id,
        previous_status: 'DELIVERED',
        new_status: 'RETURNED',
        actor_name: options.actorName,
        note: `Return approved. Refund: ₹${options.refundAmount || 0}`,
        source: 'WEB',
        created_at: new Date().toISOString(),
      };
      history.push(hist);
      db.orderStatusHistory.set(order.id, history);
    }

    return this.getReturnDetails(workspaceId, existing.id);
  }

  public rejectReturn(
    workspaceId: string,
    returnId: string,
    reason: string,
    actorName: string
  ) {
    const returnRecord = this.getReturnDetails(workspaceId, returnId);
    const existing = db.returns.get(returnRecord.id)!;

    if (existing.status !== 'PENDING') {
      throw new Error(`Return is already ${existing.status}`);
    }

    existing.status = 'REJECTED';
    existing.return_notes = `Rejected by ${actorName}: ${reason}`;
    existing.updated_at = new Date().toISOString();

    return this.getReturnDetails(workspaceId, existing.id);
  }
}

export const returnService = new ReturnService();
