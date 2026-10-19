import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { RetailerRoute, StaffRoute } from '@/routes/ProtectedRoute';
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { SetPasswordPage } from '@/pages/auth/SetPassword';
import { DashboardPage } from '@/pages/retailer/Dashboard';
import { CatalogPage } from '@/pages/retailer/Catalog';
import { CartPage } from '@/pages/retailer/Cart';
import { OrdersPage } from '@/pages/retailer/Orders';
import { RakesPage } from '@/pages/retailer/Rakes';
import { AnalyticsPage } from '@/pages/admin/Analytics';
import { OrderQueuePage } from '@/pages/admin/OrderQueue';
import { InventoryPage } from '@/pages/admin/Inventory';
import { SchemesPage } from '@/pages/admin/Schemes';
import { ApprovalsPage } from '@/pages/admin/Approvals';

/**
 * Root application component. Providers are nested so that the cart can read
 * the active user (CartProvider consumes useAuth), and all screens can raise
 * toasts. Routing is split into three trees: public auth pages, the retailer
 * portal (guarded by RetailerRoute) and the staff/admin console (StaffRoute).
 */
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public / auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            {/* Retailer portal */}
            <Route element={<RetailerRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="rakes" element={<RakesPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="orders" element={<OrdersPage />} />
              </Route>
            </Route>

            {/* Staff / admin console */}
            <Route element={<StaffRoute />}>
              <Route path="/admin" element={<AppLayout />}>
                <Route index element={<AnalyticsPage />} />
                <Route path="orders" element={<OrderQueuePage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
