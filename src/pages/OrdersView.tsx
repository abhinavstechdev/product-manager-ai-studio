import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Truck,
  Box,
  XCircle,
  Clock,
  History,
  Trash2,
  FileText,
} from 'lucide-react';
import { Order, OrderStatus, Product, Customer } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';

interface OrdersViewProps {
  products: Product[];
  customers: Customer[];
  onRefresh: () => void;
  initialOrderId?: string;
  onClearInitialOrderId?: () => void;
  onOpenPackingSlip?: (orderId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  products,
  customers,
  onRefresh,
  initialOrderId,
  onClearInitialOrderId,
  onOpenPackingSlip,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Manual Order Form state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState(customers[0]?.shipping_address || '');
  const [orderSource, setOrderSource] = useState('WHATSAPP');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [shippingFee, setShippingFee] = useState(100);
  const [orderNotes, setOrderNotes] = useState('');
  const [packingNotes, setPackingNotes] = useState('');

  // Line items state
  const [lineItems, setLineItems] = useState<Array<{ sku: string; quantity: number; unit_price: number }>>([
    { sku: products[0]?.sku || '', quantity: 1, unit_price: products[0]?.selling_price || 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = '';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (paymentFilter !== 'ALL') params.append('payment_status', paymentFilter);
      if (search.trim()) params.append('search', search.trim());
      if (params.toString()) query = `?${params.toString()}`;

      const data = await apiFetch<{ total: number; orders: Order[] }>(`/api/orders${query}`);
      setOrders(data.orders);

      if (initialOrderId) {
        const found = data.orders.find((o) => o.id === initialOrderId);
        if (found) setSelectedOrder(found);
        if (onClearInitialOrderId) onClearInitialOrderId();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter, search]);

  // Sync address when selecting existing customer
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustId(custId);
    const c = customers.find((x) => x.id === custId);
    if (c) {
      setShippingAddress(c.shipping_address);
    }
  };

  const handleAddItem = () => {
    const firstP = products[0];
    setLineItems([
      ...lineItems,
      { sku: firstP?.sku || '', quantity: 1, unit_price: firstP?.selling_price || 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemSkuChange = (index: number, newSku: string) => {
    const p = products.find((x) => x.sku === newSku);
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      sku: newSku,
      unit_price: p ? p.selling_price : updated[index].unit_price,
    };
    setLineItems(updated);
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
    setLineItems(updated);
  };

  // Calculations
  const calculatedSubtotal = lineItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
  const calculatedTotal = Math.max(0, calculatedSubtotal - orderDiscount + shippingFee);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    let custName = newCustName;
    let custPhone = newCustPhone;
    let custEmail = newCustEmail;
    let custId: string | undefined = undefined;

    if (customerMode === 'existing') {
      const c = customers.find((x) => x.id === selectedCustId);
      if (c) {
        custId = c.id;
        custName = c.name;
        custPhone = c.phone || '';
        custEmail = c.email || '';
      }
    }

    try {
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: custId,
          customer_name: custName,
          customer_phone: custPhone,
          customer_email: custEmail,
          shipping_address: shippingAddress,
          order_source: orderSource,
          payment_method: paymentMethod,
          items: lineItems,
          order_discount: Number(orderDiscount),
          shipping_fee: Number(shippingFee),
          notes: orderNotes,
          packing_notes: packingNotes,
        }),
      });

      setIsCreateOpen(false);
      onRefresh();
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrder || !cancelReason.trim()) return;
    try {
      await apiFetch(`/api/orders/${cancelModalOrder.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setCancelModalOrder(null);
      setCancelReason('');
      onRefresh();
      loadOrders();
      if (selectedOrder?.id === cancelModalOrder.id) {
        const fresh = await apiFetch<Order>(`/api/orders/${cancelModalOrder.id}`);
        setSelectedOrder(fresh);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/confirm`, { method: 'POST' });
      onRefresh();
      loadOrders();
      if (selectedOrder?.id === orderId) {
        const fresh = await apiFetch<Order>(`/api/orders/${orderId}`);
        setSelectedOrder(fresh);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/process`, { method: 'POST' });
      onRefresh();
      loadOrders();
      if (selectedOrder?.id === orderId) {
        const fresh = await apiFetch<Order>(`/api/orders/${orderId}`);
        setSelectedOrder(fresh);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Orders Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manual order desk for phone, WhatsApp, Instagram, and walk-in sales with automatic stock reservations.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            setIsCreateOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Create Manual Order</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Order #, Customer, Phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="PACKED">PACKED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RETURNED">RETURNED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="ALL">All Payments</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No orders matching your criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(o.order_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{o.customer_name}</div>
                      {o.customer_phone && (
                        <div className="text-[10px] text-slate-400">{o.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                        {o.order_source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{o.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-2 py-1 text-indigo-600 hover:text-indigo-900 font-semibold"
                        title="View details & status history"
                      >
                        View
                      </button>

                      {o.status === 'NEW' && (
                        <button
                          onClick={() => handleConfirmOrder(o.id)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold text-[11px]"
                        >
                          Confirm
                        </button>
                      )}

                      {o.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleProcessOrder(o.id)}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-semibold text-[11px]"
                        >
                          Process
                        </button>
                      )}

                      {!['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(o.status) && (
                        <button
                          onClick={() => {
                            setCancelModalOrder(o);
                            setCancelReason('');
                          }}
                          className="px-2 py-1 text-rose-600 hover:text-rose-800 text-[11px]"
                          title="Cancel order and release reserved stock"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Order Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Create Manual Customer Order
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Customer selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="font-semibold text-slate-700">Customer Source:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="cust_mode"
                      checked={customerMode === 'existing'}
                      onChange={() => setCustomerMode('existing')}
                    />
                    <span>Existing Customer</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="cust_mode"
                      checked={customerMode === 'new'}
                      onChange={() => setCustomerMode('new')}
                    />
                    <span>New Customer</span>
                  </label>
                </div>

                {customerMode === 'existing' ? (
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Select Customer *</label>
                    <select
                      value={selectedCustId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || c.email || 'No phone'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Phone</label>
                      <input
                        type="text"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        placeholder="+91..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        placeholder="email@..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping address & channel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Shipping Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    placeholder="Full delivery address with pincode"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Order Source *</label>
                    <select
                      value={orderSource}
                      onChange={(e) => setOrderSource(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="PHONE">Phone Call</option>
                      <option value="INSTAGRAM">Instagram DM</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="WEBSITE">Direct Website</option>
                      <option value="WALK_IN">Walk-in Customer</option>
                      <option value="OTHER">Other Channel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Expected Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="UPI">UPI Instant Pay</option>
                      <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                      <option value="CASH">Counter Cash</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Order Items (Reserved Atomically)</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => {
                    const matchedProd = products.find((p) => p.sku === item.sku);
                    const avail = matchedProd ? matchedProd.available_stock : 0;

                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <select
                            value={item.sku}
                            onChange={(e) => handleItemSkuChange(idx, e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded outline-none font-mono text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.sku}>
                                [{p.sku}] {p.name} (Avail: {p.available_stock}, ₹{p.selling_price})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            max={avail > 0 ? avail : 1}
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-center outline-none text-xs"
                            placeholder="Qty"
                          />
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].unit_price = Number(e.target.value);
                              setLineItems(updated);
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-right outline-none text-xs"
                            placeholder="Price"
                          />
                        </div>

                        <div className="w-24 text-right font-bold text-slate-800 text-xs">
                          ₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}
                        </div>

                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals Section */}
              <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Order Notes</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                      placeholder="Special customer remarks..."
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Packing Instructions</label>
                    <input
                      type="text"
                      value={packingNotes}
                      onChange={(e) => setPackingNotes(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                      placeholder="e.g. Include greeting card, wrap fragile..."
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{calculatedSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Order Discount:</span>
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={(e) => setOrderDiscount(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-slate-200 rounded text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Shipping Fee:</span>
                    <input
                      type="number"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-slate-200 rounded text-right"
                    />
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Order Total:</span>
                    <span className="text-indigo-600">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {submitting ? 'Reserving & Placing...' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Details Modal with Line Items and Timeline */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedOrder.order_number}</h3>
                  <StatusBadge status={selectedOrder.status} />
                  <StatusBadge status={selectedOrder.payment_status} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Placed on {new Date(selectedOrder.order_date).toLocaleString()} via{' '}
                  <strong className="text-slate-700">{selectedOrder.order_source}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Customer and shipping details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Customer Information</span>
                  <div className="text-slate-700 mt-1">{selectedOrder.customer_name}</div>
                  {selectedOrder.customer_phone && (
                    <div className="text-slate-500">{selectedOrder.customer_phone}</div>
                  )}
                  {selectedOrder.customer_email && (
                    <div className="text-slate-500">{selectedOrder.customer_email}</div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Delivery Address</span>
                  <div className="text-slate-700 mt-1">{selectedOrder.shipping_address}</div>
                </div>
              </div>

              {/* Items Snapshot Table */}
              <div>
                <span className="font-bold text-slate-800 block mb-2">Order Line Items</span>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items || []).map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-mono font-bold text-indigo-700">{it.sku}</td>
                        <td className="p-2.5 text-slate-800">{it.product_name}</td>
                        <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-right">₹{it.unit_price.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          ₹{it.total_price.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.order_discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-₹{selectedOrder.order_discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping Fee:</span>
                    <span>₹{selectedOrder.shipping_fee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                    <span>Final Total:</span>
                    <span className="text-indigo-600">
                      ₹{selectedOrder.total_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History Timeline */}
              <div>
                <span className="font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                  <History size={14} className="text-slate-500" />
                  <span>Immutable Status History &amp; Actor Log</span>
                </span>
                <div className="space-y-2 border-l-2 border-indigo-200 pl-3 ml-2">
                  {(selectedOrder.history || []).map((h) => (
                    <div key={h.id} className="relative">
                      <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-2">
                        <span>{h.previous_status ? `${h.previous_status} → ` : ''}{h.new_status}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-mono text-slate-600">
                          via {h.source}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">{h.note || 'Status updated'}</div>
                      <div className="text-[10px] text-slate-400">
                        {h.actor_name} • {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <div>
                {onOpenPackingSlip && (
                  <button
                    onClick={() => onOpenPackingSlip(selectedOrder.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold flex items-center gap-1"
                  >
                    <FileText size={14} />
                    <span>View Packing Slip</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-rose-600">Cancel Order {cancelModalOrder.order_number}</h3>
            <p className="text-xs text-slate-600">
              Cancelling this order will automatically release all reserved inventory items back into available stock.
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1 text-xs">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500 text-xs"
                placeholder="e.g. Customer requested cancellation due to delayed schedule."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
              >
                Confirm Cancellation &amp; Release Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
