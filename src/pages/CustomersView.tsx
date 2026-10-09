import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Phone, Mail, MapPin, ShoppingBag, Eye } from 'lucide-react';
import { Customer } from '../types';
import { apiFetch } from '../lib/api';

interface CustomersViewProps {
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    shipping_address: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setCustomers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsAddOpen(false);
      setFormData({ name: '', phone: '', email: '', shipping_address: '', notes: '' });
      loadCustomers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrders = async (c: Customer) => {
    try {
      const res = await apiFetch<any>(`/api/customers/${c.id}/orders`);
      setSelectedCustomerOrders({ customer: c, orders: res.orders });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer contacts, delivery addresses, and cumulative order histories.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Customer Name, Email, Phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
            No customers found.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{c.name}</h3>
                      <div className="text-[11px] text-slate-400">ID: {c.id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewOrders(c)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md"
                  >
                    <Eye size={12} />
                    <span>Orders</span>
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]">{c.shipping_address}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Orders Placed</span>
                  <strong className="text-slate-900 font-bold">{c.order_count || 0}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Spent</span>
                  <strong className="text-emerald-600 font-bold">
                    ₹{(c.total_spent || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. Rahul Verma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    placeholder="rahul@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Default Shipping Address *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="House/Flat #, Street, City, State, PIN"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Notes / Preferences</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="Prefers evening delivery, VIP account..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Orders History Modal */}
      {selectedCustomerOrders && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Order History: {selectedCustomerOrders.customer.name}
                </h3>
                <span className="text-xs text-slate-500">
                  Total Orders: {selectedCustomerOrders.orders.length}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomerOrders(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {selectedCustomerOrders.orders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No orders recorded for this customer yet.
                </div>
              ) : (
                selectedCustomerOrders.orders.map((o: any) => (
                  <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{o.order_number}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(o.order_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Status: <strong className="text-slate-800">{o.status}</strong></span>
                      <span className="font-bold text-emerald-600">₹{o.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCustomerOrders(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
