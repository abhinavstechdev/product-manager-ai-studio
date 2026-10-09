import React, { useState } from 'react';
import { Plus, Search, Filter, AlertTriangle, Archive, Edit2, Layers, Check } from 'lucide-react';
import { Product, Category } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAdjust: (sku: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  loading,
  onRefresh,
  onOpenAdjust,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category_id: '',
    purchase_cost: 0,
    selling_price: 0,
    initial_stock: 0,
    reorder_threshold: 10,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category_id !== selectedCategory) return false;
    if (lowStockOnly && p.available_stock > p.reorder_threshold) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      purchase_cost: 0,
      selling_price: 0,
      initial_stock: 0,
      reorder_threshold: 10,
    });
    setErrorMsg('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      description: p.description || '',
      category_id: p.category_id || '',
      purchase_cost: p.purchase_cost,
      selling_price: p.selling_price,
      initial_stock: 0,
      reorder_threshold: p.reorder_threshold,
    });
    setErrorMsg('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      if (editProduct) {
        await apiFetch(`/api/products/${editProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setEditProduct(null);
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to archive "${name}"? Archived products cannot be ordered.`)) {
      try {
        await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage SKU specifications, supplier purchase costs, retail pricing, and live inventory allocations.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Name, SKU, Barcode..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1 font-medium">
              <AlertTriangle size={13} className="text-amber-500" />
              Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">SKU / Code</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3 text-center">Physical</th>
                <th className="px-4 py-3 text-center">Reserved</th>
                <th className="px-4 py-3 text-center">Available</th>
                <th className="px-4 py-3">Stock Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No products matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  let stockStatus = 'HEALTHY';
                  if (p.available_stock <= 0) stockStatus = 'OUT_OF_STOCK';
                  else if (p.available_stock <= p.reorder_threshold) stockStatus = 'LOW_STOCK';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono">Barcode: {p.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.category_name || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        ₹{p.purchase_cost.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{p.selling_price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-800">
                        {p.physical_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-600 font-medium">
                        {p.reserved_stock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${p.available_stock <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {p.available_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={stockStatus} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenAdjust(p.sku)}
                          className="text-slate-500 hover:text-indigo-600 p-1"
                          title="Adjust stock in ledger"
                        >
                          <Layers size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="text-slate-500 hover:text-indigo-600 p-1"
                          title="Edit details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleArchive(p.id, p.name)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Archive product"
                        >
                          <Archive size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(isAddOpen || editProduct) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editProduct ? `Edit Product: ${editProduct.sku}` : 'Add New Product'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. Ergonomic Office Chair"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full p-2 font-mono uppercase border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    placeholder="PRD007"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Initial Physical Stock</label>
                    <input
                      type="number"
                      value={formData.initial_stock}
                      onChange={(e) => setFormData({ ...formData, initial_stock: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Reorder Alert Threshold</label>
                    <input
                      type="number"
                      value={formData.reorder_threshold}
                      onChange={(e) => setFormData({ ...formData, reorder_threshold: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="Material specs, warranty, dimensions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditProduct(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
