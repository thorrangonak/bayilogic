import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/shared/DashboardPage';
import QuotesPage from './pages/shared/QuotesPage';
import QuoteDetailPage from './pages/shared/QuoteDetailPage';
import NewQuotePage from './pages/shared/NewQuotePage';
import CustomersPage from './pages/dealer/CustomersPage';
import OrdersPage from './pages/shared/OrdersPage';
import AdminDealersPage from './pages/admin/DealersPage';
import AdminProductsPage from './pages/admin/ProductsPage';

// Components
import Layout from './components/Layout';

// Protected Route
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Quotes */}
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/new" element={<NewQuotePage />} />
        <Route path="quotes/:id" element={<QuoteDetailPage />} />

        {/* Customers (Dealer) */}
        <Route path="customers" element={<CustomersPage />} />

        {/* Orders */}
        <Route path="orders" element={<OrdersPage />} />

        {/* Admin Only */}
        <Route
          path="admin/dealers"
          element={
            <ProtectedRoute adminOnly>
              <AdminDealersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/products"
          element={
            <ProtectedRoute adminOnly>
              <AdminProductsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
