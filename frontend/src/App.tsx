import { Link, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { NoticeProvider } from './components/NoticeProvider'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { VendorsPage } from './pages/VendorsPage'
import { VendorFormPage } from './pages/VendorFormPage'
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage'

export default function App() {
  return (
    <NoticeProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage key="create-product" />} />
          <Route path="products/:id/edit" element={<ProductFormPage key="edit-product" />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/new" element={<VendorFormPage key="create-vendor" />} />
          <Route path="vendors/:id/edit" element={<VendorFormPage key="edit-vendor" />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found</h1>
                <Link className="button secondary" to="/">
                  Return to dashboard
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </NoticeProvider>
  )
}
