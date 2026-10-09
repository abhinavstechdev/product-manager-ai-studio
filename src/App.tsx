import React, { useState, useEffect } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './pages/DashboardView';
import { ProductsView } from './pages/ProductsView';
import { CategoriesView } from './pages/CategoriesView';
import { InventoryView } from './pages/InventoryView';
import { CustomersView } from './pages/CustomersView';
import { OrdersView } from './pages/OrdersView';
import { PackingView } from './pages/PackingView';
import { ShippingView } from './pages/ShippingView';
import { PaymentsView } from './pages/PaymentsView';
import { ReturnsView } from './pages/ReturnsView';
import { ReportsView } from './pages/ReportsView';
import { AiActivityView } from './pages/AiActivityView';
import { McpConnectionsView } from './pages/McpConnectionsView';
import { McpConsoleView } from './pages/McpConsoleView';
import { TestsView } from './pages/TestsView';
import { SettingsView } from './pages/SettingsView';
import { Product, Category, Customer, Order, PendingConfirmation } from './types';
import { apiFetch } from './lib/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Global shared state
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  // Deep-link triggers between views
  const [initialAdjustSku, setInitialAdjustSku] = useState<string | undefined>();
  const [initialOrderId, setInitialOrderId] = useState<string | undefined>();
  const [initialSlipOrderId, setInitialSlipOrderId] = useState<string | undefined>();

  const loadAllData = async () => {
    try {
      const [sumRes, prodRes, catRes, custRes, ordRes, confRes] = await Promise.all([
        apiFetch<any>('/api/dashboard/summary'),
        apiFetch<{ total: number; products: Product[] }>('/api/products'),
        apiFetch<Category[]>('/api/categories'),
        apiFetch<Customer[]>('/api/customers'),
        apiFetch<{ total: number; orders: Order[] }>('/api/orders'),
        apiFetch<PendingConfirmation[]>('/api/confirmations'),
      ]);

      setSummary(sumRes);
      setProducts(prodRes.products || []);
      setCategories(catRes || []);
      setCustomers(custRes || []);
      setOrders(ordRes.orders || []);
      setPendingConfirmations(confRes || []);
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenAdjustFromProduct = (sku: string) => {
    setInitialAdjustSku(sku);
    setCurrentTab('inventory');
  };

  const handleOpenOrderDetails = (orderId: string) => {
    setInitialOrderId(orderId);
    setCurrentTab('orders');
  };

  const handleOpenPackingSlip = (orderId: string) => {
    setInitialSlipOrderId(orderId);
    setCurrentTab('packing');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingConfirmationsCount={pendingConfirmations.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          onSelectTab={setCurrentTab}
          pendingConfirmationsCount={pendingConfirmations.length}
          onQuickNewOrder={() => setCurrentTab('orders')}
          onQuickAdjustStock={() => setCurrentTab('inventory')}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              loading={loading}
              onNavigate={setCurrentTab}
              onOpenOrder={handleOpenOrderDetails}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              loading={loading}
              onRefresh={loadAllData}
              onOpenAdjust={handleOpenAdjustFromProduct}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesView
              categories={categories}
              loading={loading}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              products={products}
              onRefresh={loadAllData}
              initialAdjustSku={initialAdjustSku}
              onClearInitialAdjustSku={() => setInitialAdjustSku(undefined)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView onRefresh={loadAllData} />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              products={products}
              customers={customers}
              onRefresh={loadAllData}
              initialOrderId={initialOrderId}
              onClearInitialOrderId={() => setInitialOrderId(undefined)}
              onOpenPackingSlip={handleOpenPackingSlip}
            />
          )}

          {currentTab === 'packing' && (
            <PackingView
              onRefresh={loadAllData}
              initialSlipOrderId={initialSlipOrderId}
              onClearInitialSlipOrderId={() => setInitialSlipOrderId(undefined)}
            />
          )}

          {currentTab === 'shipping' && (
            <ShippingView onRefresh={loadAllData} />
          )}

          {currentTab === 'payments' && (
            <PaymentsView orders={orders} onRefresh={loadAllData} />
          )}

          {currentTab === 'returns' && (
            <ReturnsView orders={orders} onRefresh={loadAllData} />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'ai_activity' && (
            <AiActivityView onRefresh={loadAllData} />
          )}

          {currentTab === 'mcp_connections' && (
            <McpConnectionsView />
          )}

          {currentTab === 'mcp_console' && (
            <McpConsoleView />
          )}

          {currentTab === 'tests' && (
            <TestsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
