import { db } from '../db/store';
import { InventoryTransaction, Product, InventoryTransactionType } from '../db/types';

export class InventoryService {
  /**
   * Helper to find product by ID or SKU within a workspace
   */
  public findProduct(workspaceId: string, idOrSku: string): Product | undefined {
    for (const prod of db.products.values()) {
      if (
        prod.workspace_id === workspaceId &&
        (prod.id === idOrSku || prod.sku.toLowerCase() === idOrSku.toLowerCase())
      ) {
        return prod;
      }
    }
    return undefined;
  }

  /**
   * Summary of inventory across workspace
   */
  public getInventorySummary(workspaceId: string) {
    let totalPhysical = 0;
    let totalReserved = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    const products = Array.from(db.products.values()).filter(
      (p) => p.workspace_id === workspaceId && !p.is_archived
    );

    products.forEach((p) => {
      const avail = p.physical_stock - p.reserved_stock;
      totalPhysical += p.physical_stock;
      totalReserved += p.reserved_stock;
      totalValuation += p.physical_stock * p.purchase_cost;

      if (avail <= 0) {
        outOfStockCount++;
      } else if (avail <= p.reorder_threshold) {
        lowStockCount++;
      }
    });

    return {
      workspace_id: workspaceId,
      total_products: products.length,
      physical_stock: totalPhysical,
      reserved_stock: totalReserved,
      available_stock: totalPhysical - totalReserved,
      low_stock_products: lowStockCount,
      out_of_stock_products: outOfStockCount,
      inventory_valuation: totalValuation,
      timestamp: new Date().toISOString(),
    };
  }

  public getProductStock(workspaceId: string, idOrSku: string) {
    const product = this.findProduct(workspaceId, idOrSku);
    if (!product) {
      throw new Error(`Product not found with SKU/ID '${idOrSku}'`);
    }
    const available = product.physical_stock - product.reserved_stock;
    return {
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      physical_stock: product.physical_stock,
      reserved_stock: product.reserved_stock,
      available_stock: available,
      reorder_threshold: product.reorder_threshold,
      status:
        available <= 0
          ? 'OUT_OF_STOCK'
          : available <= product.reorder_threshold
          ? 'LOW_STOCK'
          : 'HEALTHY',
    };
  }

  public getAvailableStock(workspaceId: string, idOrSku: string) {
    const res = this.getProductStock(workspaceId, idOrSku);
    return { sku: res.sku, available_stock: res.available_stock };
  }

  public getReservedStock(workspaceId: string, idOrSku: string) {
    const res = this.getProductStock(workspaceId, idOrSku);
    return { sku: res.sku, reserved_stock: res.reserved_stock };
  }

  public listInventoryTransactions(
    workspaceId: string,
    options?: { productId?: string; type?: InventoryTransactionType; limit?: number }
  ) {
    let txs = Array.from(db.inventoryTransactions.values()).filter(
      (t) => t.workspace_id === workspaceId
    );

    if (options?.productId) {
      const prod = this.findProduct(workspaceId, options.productId);
      const targetId = prod ? prod.id : options.productId;
      txs = txs.filter((t) => t.product_id === targetId);
    }

    if (options?.type) {
      txs = txs.filter((t) => t.type === options.type);
    }

    txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (options?.limit) {
      txs = txs.slice(0, options.limit);
    }

    return txs.map((t) => {
      const p = db.products.get(t.product_id);
      return {
        ...t,
        product_name: p ? p.name : 'Unknown Product',
        sku: p ? p.sku : 'N/A',
      };
    });
  }

  /**
   * Adjust inventory with mandatory ledger entry
   */
  public adjustInventory(
    workspaceId: string,
    params: {
      skuOrId: string;
      quantityChange: number; // can be positive or negative
      reason: string;
      actorName: string;
      actorId?: string;
    }
  ) {
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('A valid reason is required for manual inventory adjustments');
    }

    const product = this.findProduct(workspaceId, params.skuOrId);
    if (!product) {
      throw new Error(`Product not found: ${params.skuOrId}`);
    }

    const prevQuantity = product.physical_stock;
    const newQuantity = prevQuantity + params.quantityChange;

    if (newQuantity < 0) {
      throw new Error(
        `Adjustment would result in negative physical stock (${newQuantity}). Available: ${
          product.physical_stock - product.reserved_stock
        }`
      );
    }

    // Check if new quantity is less than reserved stock
    if (newQuantity < product.reserved_stock) {
      throw new Error(
        `Cannot reduce stock below reserved amount of ${product.reserved_stock} units. Currently reserved for active orders.`
      );
    }

    // Apply change atomically
    product.physical_stock = newQuantity;
    product.updated_at = new Date().toISOString();

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txType: InventoryTransactionType =
      params.quantityChange >= 0 ? 'MANUAL_ADJUSTMENT' : 'STOCK_CORRECTION';

    const tx: InventoryTransaction = {
      id: txId,
      workspace_id: workspaceId,
      product_id: product.id,
      quantity_change: params.quantityChange,
      previous_quantity: prevQuantity,
      new_quantity: newQuantity,
      type: txType,
      reason: params.reason,
      actor_id: params.actorId,
      actor_name: params.actorName,
      created_at: new Date().toISOString(),
    };
    db.inventoryTransactions.set(tx.id, tx);

    return {
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        previous_physical_stock: prevQuantity,
        new_physical_stock: newQuantity,
        reserved_stock: product.reserved_stock,
        available_stock: newQuantity - product.reserved_stock,
      },
      transaction: tx,
    };
  }

  /**
   * Receive stock from supplier/purchase order
   */
  public receiveInventory(
    workspaceId: string,
    params: {
      skuOrId: string;
      quantityReceived: number;
      reason?: string;
      actorName: string;
      actorId?: string;
    }
  ) {
    if (params.quantityReceived <= 0) {
      throw new Error('Quantity received must be greater than zero');
    }

    const product = this.findProduct(workspaceId, params.skuOrId);
    if (!product) {
      throw new Error(`Product not found: ${params.skuOrId}`);
    }

    const prevQuantity = product.physical_stock;
    const newQuantity = prevQuantity + params.quantityReceived;

    product.physical_stock = newQuantity;
    product.updated_at = new Date().toISOString();

    const txId = `tx_recv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: InventoryTransaction = {
      id: txId,
      workspace_id: workspaceId,
      product_id: product.id,
      quantity_change: params.quantityReceived,
      previous_quantity: prevQuantity,
      new_quantity: newQuantity,
      type: 'STOCK_RECEIVED',
      reason: params.reason || 'Goods received from supplier',
      actor_id: params.actorId,
      actor_name: params.actorName,
      created_at: new Date().toISOString(),
    };
    db.inventoryTransactions.set(tx.id, tx);

    return {
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        previous_physical_stock: prevQuantity,
        new_physical_stock: newQuantity,
        available_stock: newQuantity - product.reserved_stock,
      },
      transaction: tx,
    };
  }

  public getLowStockReport(workspaceId: string) {
    const products = Array.from(db.products.values()).filter(
      (p) => p.workspace_id === workspaceId && !p.is_archived
    );

    const lowStock = products
      .map((p) => {
        const avail = p.physical_stock - p.reserved_stock;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          physical_stock: p.physical_stock,
          reserved_stock: p.reserved_stock,
          available_stock: avail,
          reorder_threshold: p.reorder_threshold,
          deficit: Math.max(0, p.reorder_threshold - avail),
        };
      })
      .filter((p) => p.available_stock <= p.reorder_threshold)
      .sort((a, b) => a.available_stock - b.available_stock);

    return {
      workspace_id: workspaceId,
      total_low_stock_items: lowStock.length,
      items: lowStock,
    };
  }

  public getInventoryValuation(workspaceId: string) {
    const products = Array.from(db.products.values()).filter(
      (p) => p.workspace_id === workspaceId && !p.is_archived
    );

    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const breakdown = products.map((p) => {
      const costValue = p.physical_stock * p.purchase_cost;
      const retailValue = p.physical_stock * p.selling_price;
      totalCostValuation += costValue;
      totalRetailValuation += retailValue;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        physical_stock: p.physical_stock,
        purchase_cost: p.purchase_cost,
        selling_price: p.selling_price,
        cost_valuation: costValue,
        retail_valuation: retailValue,
        projected_margin: retailValue - costValue,
      };
    });

    return {
      workspace_id: workspaceId,
      total_products: products.length,
      total_physical_units: products.reduce((acc, p) => acc + p.physical_stock, 0),
      total_cost_valuation: totalCostValuation,
      total_retail_valuation: totalRetailValuation,
      projected_gross_margin: totalRetailValuation - totalCostValuation,
      breakdown,
    };
  }
}

export const inventoryService = new InventoryService();
