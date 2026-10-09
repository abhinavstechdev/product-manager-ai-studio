import { db } from '../db/store';
import { inventoryService } from './inventoryService';
import { paymentService } from './paymentService';

export class ReportService {
  public getDashboardSummary(workspaceId: string) {
    const invSummary = inventoryService.getInventorySummary(workspaceId);
    const paySummary = paymentService.getPaymentSummary(workspaceId);

    const orders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId
    );

    const statusCounts = {
      NEW: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNED: 0,
    };

    orders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    });

    const ordersToPack = statusCounts.CONFIRMED + statusCounts.PROCESSING;
    const packedAwaitingDispatch = statusCounts.PACKED;

    // Recent orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        total_amount: o.total_amount,
        status: o.status,
        payment_status: o.payment_status,
        order_date: o.order_date,
      }));

    // Recent AI / Audit activity
    const recentAudits = Array.from(db.auditEvents.values())
      .filter((a) => a.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    return {
      workspace_id: workspaceId,
      inventory: invSummary,
      orders: {
        total_orders: orders.length,
        new_orders: statusCounts.NEW,
        orders_to_pack: ordersToPack,
        packed_awaiting_dispatch: packedAwaitingDispatch,
        shipped_orders: statusCounts.SHIPPED,
        delivered_orders: statusCounts.DELIVERED,
        cancelled_orders: statusCounts.CANCELLED,
        returned_orders: statusCounts.RETURNED,
        status_distribution: statusCounts,
      },
      payments: paySummary,
      recent_orders: recentOrders,
      recent_audit_events: recentAudits,
      timestamp: new Date().toISOString(),
    };
  }

  public getBusinessOverview(workspaceId: string) {
    const summary = this.getDashboardSummary(workspaceId);
    return {
      summary: `NexusAI Workspace: ${summary.inventory.total_products} products (${summary.inventory.available_stock} available units, ${summary.inventory.low_stock_products} low-stock), ${summary.orders.total_orders} orders recorded, ${summary.orders.orders_to_pack} awaiting packing, ₹${summary.payments.total_revenue_collected.toLocaleString('en-IN')} revenue collected.`,
      metrics: summary,
    };
  }

  public searchBusinessRecords(workspaceId: string, query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { products: [], customers: [], orders: [] };

    const matchedProducts = Array.from(db.products.values())
      .filter(
        (p) =>
          p.workspace_id === workspaceId &&
          (p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)))
      )
      .slice(0, 10);

    const matchedCustomers = Array.from(db.customers.values())
      .filter(
        (c) =>
          c.workspace_id === workspaceId &&
          (c.name.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)))
      )
      .slice(0, 10);

    const matchedOrders = Array.from(db.orders.values())
      .filter(
        (o) =>
          o.workspace_id === workspaceId &&
          (o.order_number.toLowerCase().includes(q) ||
            o.customer_name.toLowerCase().includes(q) ||
            (o.shipping_address && o.shipping_address.toLowerCase().includes(q)))
      )
      .slice(0, 10);

    return {
      query,
      products: matchedProducts,
      customers: matchedCustomers,
      orders: matchedOrders,
    };
  }

  public getRecentActivity(workspaceId: string, limit: number = 20) {
    return Array.from(db.auditEvents.values())
      .filter((a) => a.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getSalesReport(workspaceId: string, startDate?: string, endDate?: string) {
    let orders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId && o.status !== 'CANCELLED'
    );

    if (startDate) {
      orders = orders.filter((o) => new Date(o.order_date) >= new Date(startDate));
    }
    if (endDate) {
      orders = orders.filter((o) => new Date(o.order_date) <= new Date(endDate));
    }

    const totalGrossRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + o.order_discount, 0);
    const totalShipping = orders.reduce((sum, o) => sum + o.shipping_fee, 0);
    const totalNetRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);

    // Group by date (YYYY-MM-DD)
    const salesByDate: Record<string, { date: string; orders: number; gross: number; net: number }> = {};
    orders.forEach((o) => {
      const dateKey = o.order_date.substring(0, 10);
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { date: dateKey, orders: 0, gross: 0, net: 0 };
      }
      salesByDate[dateKey].orders++;
      salesByDate[dateKey].gross += o.subtotal;
      salesByDate[dateKey].net += o.total_amount;
    });

    return {
      workspace_id: workspaceId,
      period: { start: startDate || 'ALL', end: endDate || 'ALL' },
      total_orders_count: orders.length,
      gross_sales: totalGrossRevenue,
      discounts: totalDiscounts,
      shipping_fees: totalShipping,
      net_sales: totalNetRevenue,
      timeline: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  public getProductPerformance(workspaceId: string) {
    const itemMap: Record<
      string,
      { sku: string; name: string; units_sold: number; total_revenue: number }
    > = {};

    const orders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId && o.status !== 'CANCELLED'
    );

    orders.forEach((o) => {
      const items = db.orderItems.get(o.id) || [];
      items.forEach((it) => {
        if (!itemMap[it.sku]) {
          itemMap[it.sku] = {
            sku: it.sku,
            name: it.product_name,
            units_sold: 0,
            total_revenue: 0,
          };
        }
        itemMap[it.sku].units_sold += it.quantity;
        itemMap[it.sku].total_revenue += it.total_price;
      });
    });

    const list = Object.values(itemMap).sort((a, b) => b.units_sold - a.units_sold);
    return {
      workspace_id: workspaceId,
      products: list,
    };
  }

  public exportReportCsv(
    workspaceId: string,
    reportType: 'orders' | 'inventory' | 'payments' | 'sales'
  ): string {
    if (reportType === 'orders') {
      const orders = Array.from(db.orders.values()).filter(
        (o) => o.workspace_id === workspaceId
      );
      const headers = [
        'Order Number',
        'Date',
        'Customer',
        'Phone',
        'Status',
        'Subtotal',
        'Discount',
        'Shipping',
        'Total',
        'Payment Status',
        'Source',
      ];
      const rows = orders.map((o) => [
        o.order_number,
        o.order_date.substring(0, 10),
        `"${o.customer_name.replace(/"/g, '""')}"`,
        o.customer_phone || '',
        o.status,
        o.subtotal.toFixed(2),
        o.order_discount.toFixed(2),
        o.shipping_fee.toFixed(2),
        o.total_amount.toFixed(2),
        o.payment_status,
        o.order_source,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (reportType === 'inventory') {
      const products = Array.from(db.products.values()).filter(
        (p) => p.workspace_id === workspaceId && !p.is_archived
      );
      const headers = [
        'SKU',
        'Name',
        'Physical Stock',
        'Reserved Stock',
        'Available Stock',
        'Threshold',
        'Cost Price',
        'Selling Price',
        'Valuation',
      ];
      const rows = products.map((p) => {
        const avail = p.physical_stock - p.reserved_stock;
        return [
          p.sku,
          `"${p.name.replace(/"/g, '""')}"`,
          p.physical_stock,
          p.reserved_stock,
          avail,
          p.reorder_threshold,
          p.purchase_cost.toFixed(2),
          p.selling_price.toFixed(2),
          (p.physical_stock * p.purchase_cost).toFixed(2),
        ];
      });
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (reportType === 'payments') {
      const payments = Array.from(db.payments.values()).filter(
        (p) => p.workspace_id === workspaceId
      );
      const headers = [
        'Payment ID',
        'Order Number',
        'Amount',
        'Method',
        'Reference',
        'Date',
        'Notes',
      ];
      const rows = payments.map((p) => {
        const o = db.orders.get(p.order_id);
        return [
          p.id,
          o ? o.order_number : p.order_id,
          p.amount.toFixed(2),
          p.payment_method,
          p.reference_number || '',
          p.payment_date.substring(0, 10),
          `"${(p.notes || '').replace(/"/g, '""')}"`,
        ];
      });
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Default: sales
    const sales = this.getSalesReport(workspaceId);
    const headers = ['Date', 'Orders Count', 'Gross Sales', 'Net Sales'];
    const rows = sales.timeline.map((t) => [
      t.date,
      t.orders,
      t.gross.toFixed(2),
      t.net.toFixed(2),
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const reportService = new ReportService();
