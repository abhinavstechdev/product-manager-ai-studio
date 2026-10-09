import { db } from '../db/store';
import { Customer } from '../db/types';

export class CustomerService {
  public listCustomers(workspaceId: string, search?: string) {
    let list = Array.from(db.customers.values()).filter(
      (c) => c.workspace_id === workspaceId
    );

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }

    list.sort((a, b) => a.name.localeCompare(b.name));
    return list.map((c) => {
      // Calculate customer order count & total spend
      const customerOrders = Array.from(db.orders.values()).filter(
        (o) => o.workspace_id === workspaceId && o.customer_id === c.id
      );
      const totalSpent = customerOrders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.total_amount, 0);

      return {
        ...c,
        order_count: customerOrders.length,
        total_spent: totalSpent,
      };
    });
  }

  public searchCustomers(workspaceId: string, query: string) {
    return this.listCustomers(workspaceId, query);
  }

  public getCustomer(workspaceId: string, id: string) {
    const c = db.customers.get(id);
    if (!c || c.workspace_id !== workspaceId) {
      throw new Error(`Customer not found with ID '${id}'`);
    }
    const customerOrders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId && o.customer_id === c.id
    );
    const totalSpent = customerOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_amount, 0);

    return {
      ...c,
      order_count: customerOrders.length,
      total_spent: totalSpent,
    };
  }

  public createCustomer(
    workspaceId: string,
    data: {
      name: string;
      phone?: string;
      email?: string;
      shipping_address: string;
      notes?: string;
    }
  ) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (!data.shipping_address || data.shipping_address.trim().length === 0) {
      throw new Error('Customer shipping address is required');
    }

    // Check duplicate by email or phone
    if (data.email) {
      const existingEmail = Array.from(db.customers.values()).find(
        (c) =>
          c.workspace_id === workspaceId &&
          c.email?.toLowerCase() === data.email?.toLowerCase()
      );
      if (existingEmail) {
        return existingEmail;
      }
    }

    const customer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspaceId,
      name: data.name.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim(),
      shipping_address: data.shipping_address.trim(),
      notes: data.notes?.trim(),
      created_at: new Date().toISOString(),
    };

    db.customers.set(customer.id, customer);
    return customer;
  }

  public updateCustomer(
    workspaceId: string,
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      email: string;
      shipping_address: string;
      notes: string;
    }>
  ) {
    const c = db.customers.get(id);
    if (!c || c.workspace_id !== workspaceId) {
      throw new Error(`Customer not found with ID '${id}'`);
    }

    if (data.name) c.name = data.name.trim();
    if (data.phone !== undefined) c.phone = data.phone.trim();
    if (data.email !== undefined) c.email = data.email.trim();
    if (data.shipping_address) c.shipping_address = data.shipping_address.trim();
    if (data.notes !== undefined) c.notes = data.notes.trim();

    return c;
  }

  public getCustomerOrderHistory(workspaceId: string, customerId: string) {
    this.getCustomer(workspaceId, customerId); // verify exists
    const orders = Array.from(db.orders.values())
      .filter((o) => o.workspace_id === workspaceId && o.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((o) => {
        const items = db.orderItems.get(o.id) || [];
        return {
          ...o,
          items,
        };
      });

    return {
      customer_id: customerId,
      total_orders: orders.length,
      orders,
    };
  }
}

export const customerService = new CustomerService();
