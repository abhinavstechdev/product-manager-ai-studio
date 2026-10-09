import { db } from '../db/store';
import { Product, Category, InventoryTransaction } from '../db/types';

export class ProductService {
  public listProducts(
    workspaceId: string,
    filters?: {
      category_id?: string;
      search?: string;
      is_archived?: boolean;
      low_stock_only?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    let prods = Array.from(db.products.values()).filter(
      (p) => p.workspace_id === workspaceId
    );

    if (filters?.is_archived !== undefined) {
      prods = prods.filter((p) => p.is_archived === filters.is_archived);
    } else {
      prods = prods.filter((p) => !p.is_archived);
    }

    if (filters?.category_id) {
      prods = prods.filter((p) => p.category_id === filters.category_id);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (filters?.low_stock_only) {
      prods = prods.filter(
        (p) => p.physical_stock - p.reserved_stock <= p.reorder_threshold
      );
    }

    prods.sort((a, b) => a.name.localeCompare(b.name));

    const total = prods.length;
    if (filters?.offset) {
      prods = prods.slice(filters.offset);
    }
    if (filters?.limit) {
      prods = prods.slice(0, filters.limit);
    }

    const enhanced = prods.map((p) => {
      const cat = p.category_id ? db.categories.get(p.category_id) : undefined;
      return {
        ...p,
        available_stock: p.physical_stock - p.reserved_stock,
        category_name: cat ? cat.name : 'Uncategorized',
      };
    });

    return {
      total,
      products: enhanced,
    };
  }

  public searchProducts(workspaceId: string, query: string) {
    return this.listProducts(workspaceId, { search: query }).products;
  }

  public getProduct(workspaceId: string, idOrSku: string) {
    for (const p of db.products.values()) {
      if (
        p.workspace_id === workspaceId &&
        (p.id === idOrSku || p.sku.toLowerCase() === idOrSku.toLowerCase())
      ) {
        const cat = p.category_id ? db.categories.get(p.category_id) : undefined;
        return {
          ...p,
          available_stock: p.physical_stock - p.reserved_stock,
          category_name: cat ? cat.name : 'Uncategorized',
        };
      }
    }
    throw new Error(`Product not found for SKU/ID '${idOrSku}' in this workspace`);
  }

  public createProduct(
    workspaceId: string,
    data: {
      name: string;
      sku: string;
      barcode?: string;
      description?: string;
      category_id?: string;
      purchase_cost: number;
      selling_price: number;
      initial_stock?: number;
      reorder_threshold?: number;
    },
    actorName: string
  ) {
    // Check duplicate SKU
    for (const p of db.products.values()) {
      if (
        p.workspace_id === workspaceId &&
        p.sku.toLowerCase() === data.sku.trim().toLowerCase()
      ) {
        throw new Error(`SKU '${data.sku}' already exists in this workspace`);
      }
    }

    const initialStock = data.initial_stock ?? 0;
    const newProd: Product = {
      id: `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspaceId,
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode?.trim(),
      description: data.description?.trim(),
      category_id: data.category_id,
      purchase_cost: Number(data.purchase_cost) || 0,
      selling_price: Number(data.selling_price) || 0,
      physical_stock: initialStock,
      reserved_stock: 0,
      reorder_threshold: data.reorder_threshold !== undefined ? Number(data.reorder_threshold) : 10,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.products.set(newProd.id, newProd);

    // If initial stock was provided, record ledger
    if (initialStock > 0) {
      const tx: InventoryTransaction = {
        id: `tx_init_${newProd.id}`,
        workspace_id: workspaceId,
        product_id: newProd.id,
        quantity_change: initialStock,
        previous_quantity: 0,
        new_quantity: initialStock,
        type: 'OPENING_STOCK',
        reason: 'Initial stock on product creation',
        actor_name: actorName,
        created_at: new Date().toISOString(),
      };
      db.inventoryTransactions.set(tx.id, tx);
    }

    return this.getProduct(workspaceId, newProd.id);
  }

  public updateProduct(
    workspaceId: string,
    idOrSku: string,
    data: Partial<{
      name: string;
      sku: string;
      barcode: string;
      description: string;
      category_id: string;
      purchase_cost: number;
      selling_price: number;
      reorder_threshold: number;
    }>,
    _actorName: string
  ) {
    const prod = this.getProduct(workspaceId, idOrSku);
    const existing = db.products.get(prod.id)!;

    if (data.sku && data.sku.trim().toUpperCase() !== existing.sku) {
      const targetSku = data.sku.trim().toUpperCase();
      for (const p of db.products.values()) {
        if (p.workspace_id === workspaceId && p.id !== existing.id && p.sku === targetSku) {
          throw new Error(`SKU '${targetSku}' already in use by another product`);
        }
      }
      existing.sku = targetSku;
    }

    if (data.name !== undefined) existing.name = data.name.trim();
    if (data.barcode !== undefined) existing.barcode = data.barcode.trim();
    if (data.description !== undefined) existing.description = data.description.trim();
    if (data.category_id !== undefined) existing.category_id = data.category_id;
    if (data.purchase_cost !== undefined) existing.purchase_cost = Number(data.purchase_cost);
    if (data.selling_price !== undefined) existing.selling_price = Number(data.selling_price);
    if (data.reorder_threshold !== undefined) existing.reorder_threshold = Number(data.reorder_threshold);

    existing.updated_at = new Date().toISOString();
    return this.getProduct(workspaceId, existing.id);
  }

  public archiveProduct(workspaceId: string, idOrSku: string, _actorName: string) {
    const prod = this.getProduct(workspaceId, idOrSku);
    const existing = db.products.get(prod.id)!;
    if (existing.reserved_stock > 0) {
      throw new Error(`Cannot archive product with ${existing.reserved_stock} reserved units on active orders`);
    }
    existing.is_archived = true;
    existing.updated_at = new Date().toISOString();
    return { success: true, message: `Product '${existing.name}' (${existing.sku}) archived` };
  }

  public listCategories(workspaceId: string) {
    const cats = Array.from(db.categories.values())
      .filter((c) => c.workspace_id === workspaceId && !c.is_archived)
      .map((c) => {
        const prodCount = Array.from(db.products.values()).filter(
          (p) => p.workspace_id === workspaceId && p.category_id === c.id && !p.is_archived
        ).length;
        return {
          ...c,
          product_count: prodCount,
        };
      });
    return cats;
  }

  public createCategory(workspaceId: string, data: { name: string; description?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    for (const c of db.categories.values()) {
      if (c.workspace_id === workspaceId && c.slug === slug) {
        throw new Error(`Category with slug '${slug}' already exists`);
      }
    }

    const cat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspaceId,
      name: data.name.trim(),
      slug,
      description: data.description?.trim(),
      is_archived: false,
      created_at: new Date().toISOString(),
    };
    db.categories.set(cat.id, cat);
    return cat;
  }

  public updateCategory(workspaceId: string, id: string, data: { name?: string; description?: string }) {
    const cat = db.categories.get(id);
    if (!cat || cat.workspace_id !== workspaceId) {
      throw new Error(`Category not found: ${id}`);
    }
    if (data.name) cat.name = data.name.trim();
    if (data.description !== undefined) cat.description = data.description.trim();
    return cat;
  }
}

export const productService = new ProductService();
