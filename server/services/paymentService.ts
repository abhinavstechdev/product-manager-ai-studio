import { db } from '../db/store';
import { orderService } from './orderService';
import { Payment, PaymentMethod, PaymentStatus } from '../db/types';

export class PaymentService {
  public listPayments(workspaceId: string, orderId?: string) {
    let payments = Array.from(db.payments.values()).filter(
      (p) => p.workspace_id === workspaceId
    );

    if (orderId) {
      const order = orderService.getOrder(workspaceId, orderId);
      payments = payments.filter((p) => p.order_id === order.id);
    }

    payments.sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );

    return payments.map((p) => {
      const o = db.orders.get(p.order_id);
      return {
        ...p,
        order_number: o ? o.order_number : 'N/A',
        customer_name: o ? o.customer_name : 'Unknown',
      };
    });
  }

  public getOrderPaymentStatus(workspaceId: string, orderNumberOrId: string) {
    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const payments = Array.from(db.payments.values()).filter(
      (p) => p.workspace_id === workspaceId && p.order_id === order.id
    );

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, order.total_amount - totalPaid);

    return {
      order_id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      total_paid: totalPaid,
      outstanding_balance: balance,
      payment_status: order.payment_status,
      payments,
    };
  }

  public recordPayment(
    workspaceId: string,
    orderNumberOrId: string,
    amount: number,
    paymentMethod: PaymentMethod = 'UPI',
    referenceNumber?: string,
    notes?: string,
    _actorName?: string
  ) {
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const order = orderService.getOrder(workspaceId, orderNumberOrId);
    const existing = db.orders.get(order.id)!;

    const existingPayments = Array.from(db.payments.values()).filter(
      (p) => p.workspace_id === workspaceId && p.order_id === order.id
    );
    const prevPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const newTotalPaid = Math.round((prevPaid + amount) * 100) / 100;

    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspaceId,
      order_id: order.id,
      amount: Math.round(amount * 100) / 100,
      payment_method: paymentMethod,
      reference_number: referenceNumber?.trim(),
      payment_date: new Date().toISOString(),
      notes: notes?.trim(),
      created_at: new Date().toISOString(),
    };
    db.payments.set(payment.id, payment);

    // Update order payment status
    let newStatus: PaymentStatus = 'PARTIALLY_PAID';
    if (newTotalPaid >= existing.total_amount) {
      newStatus = 'PAID';
    } else if (newTotalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    existing.payment_status = newStatus;
    existing.payment_method = paymentMethod;
    existing.updated_at = new Date().toISOString();

    return {
      success: true,
      payment,
      order_number: existing.order_number,
      total_order_amount: existing.total_amount,
      new_total_paid: newTotalPaid,
      outstanding_balance: Math.max(0, existing.total_amount - newTotalPaid),
      payment_status: newStatus,
    };
  }

  public getUnpaidOrders(workspaceId: string) {
    const orders = Array.from(db.orders.values())
      .filter((o) => o.workspace_id === workspaceId && o.payment_status === 'UNPAID')
      .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return orders.map((o) => ({
      ...o,
      items: db.orderItems.get(o.id) || [],
    }));
  }

  public getPartialPaymentOrders(workspaceId: string) {
    const orders = Array.from(db.orders.values())
      .filter((o) => o.workspace_id === workspaceId && o.payment_status === 'PARTIALLY_PAID')
      .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return orders.map((o) => {
      const payments = Array.from(db.payments.values()).filter(
        (p) => p.workspace_id === workspaceId && p.order_id === o.id
      );
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...o,
        paid_amount: paid,
        outstanding_balance: o.total_amount - paid,
      };
    });
  }

  public getPaymentSummary(workspaceId: string) {
    const payments = Array.from(db.payments.values()).filter(
      (p) => p.workspace_id === workspaceId
    );
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const orders = Array.from(db.orders.values()).filter(
      (o) => o.workspace_id === workspaceId && o.status !== 'CANCELLED'
    );
    const totalOrderValue = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const outstandingTotal = Math.max(0, totalOrderValue - totalCollected);

    return {
      workspace_id: workspaceId,
      total_payments_count: payments.length,
      total_revenue_collected: totalCollected,
      total_order_value: totalOrderValue,
      total_outstanding_receivable: outstandingTotal,
      unpaid_orders_count: orders.filter((o) => o.payment_status === 'UNPAID').length,
      partially_paid_orders_count: orders.filter((o) => o.payment_status === 'PARTIALLY_PAID').length,
      paid_orders_count: orders.filter((o) => o.payment_status === 'PAID').length,
    };
  }
}

export const paymentService = new PaymentService();
