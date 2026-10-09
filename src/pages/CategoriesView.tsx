import React, { useState } from 'react';
import { Plus, Tags, Package } from 'lucide-react';
import { Category } from '../types';
import { apiFetch } from '../lib/api';

interface CategoriesViewProps {
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  loading,
  onRefresh,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsAddOpen(false);
      setFormData({ name: '', description: '' });
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Organization</h1>
          <p className="text-xs text-slate-500 mt-1">
            Group catalog SKUs into product lines, collections, and warehouse bins.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', description: '' });
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition w-fit cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
            No categories defined yet.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Tags size={16} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    <Package size={12} />
                    {c.product_count || 0} products
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-3">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {c.description || 'No description provided.'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                Slug: {c.slug}
              </div>
            </div>
          ))
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New Category</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="e.g. Footwear & Shoes"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  placeholder="Category scope and notes..."
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
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
