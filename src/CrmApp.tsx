import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { usePageMeta } from './ssr/PageMeta'
import CrmShell from './components/CrmShell'
import DataSources from './pages/DataSources'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Connections from './pages/Connections'
import ConnectionDetail from './pages/ConnectionDetail'
import Clusters from './pages/Clusters'
import Reports from './pages/Reports'
import VendorProducts from './pages/VendorProducts'
import OzonProducts from './pages/OzonProducts'
import WbProducts from './pages/WbProducts'
import Supplies from './pages/Supplies'
import SupplyTemplates from './pages/SupplyTemplates'
import SupplyTemplateDetail from './pages/SupplyTemplateDetail'
import SupplyDraftDetail from './pages/SupplyDraftDetail'
import SupplyPlanningRunner from './pages/SupplyPlanningRunner'
import RedistributionOrders from './pages/RedistributionOrders'
import StockHistory from './pages/StockHistory'
import Fulfillments from './pages/Fulfillments'
import ProductCategories from './pages/ProductCategories'
import FBSOrders from './pages/FBSOrders'
import FulfillmentSupplies from './pages/FulfillmentSupplies'
import FBSShipments from './pages/FBSShipments'
import ChestnyZnakGtins from './pages/ChestnyZnakGtins'
import ChestnyZnakGenerate from './pages/ChestnyZnakGenerate'
import ChestnyZnakJobs from './pages/ChestnyZnakJobs'

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const DashboardLayout: React.FC = () => {
  return (
    <CrmShell>
      <Routes>
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/connections/:connectionId" element={<ConnectionDetail />} />
        <Route path="/connections/:connectionId/vendor-products" element={<VendorProducts />} />
        <Route path="/connections/:connectionId/ozon-products" element={<OzonProducts />} />
        <Route path="/connections/:connectionId/wb-products" element={<WbProducts />} />
        <Route path="/connections/:connectionId/fulfillments" element={<Fulfillments />} />
        <Route path="/connections/:connectionId/product-categories" element={<ProductCategories />} />
        <Route path="/connections/:connectionId/fbs-orders" element={<FBSOrders />} />
        <Route path="/connections/:connectionId/fulfillment-supplies" element={<FulfillmentSupplies />} />
        <Route path="/connections/:connectionId/fbs-shipments" element={<FBSShipments />} />
        <Route path="/connections/:connectionId/supplies" element={<Supplies />} />
        <Route path="/connections/:connectionId/chestny-znak/gtins" element={<ChestnyZnakGtins />} />
        <Route path="/connections/:connectionId/chestny-znak/generate" element={<ChestnyZnakGenerate />} />
        <Route path="/connections/:connectionId/chestny-znak/jobs" element={<ChestnyZnakJobs />} />
        <Route path="/connections/:connectionId/stock-history" element={<StockHistory />} />
        <Route path="/connections/:connectionId/supply-templates" element={<SupplyTemplates />} />
        <Route path="/connections/:connectionId/supply-templates/:snapshotId" element={<SupplyTemplateDetail />} />
        <Route path="/connections/:connectionId/supply-templates/:snapshotId/drafts/:draftId" element={<SupplyDraftDetail />} />
        <Route
          path="/data-sources"
          element={
            <AdminRoute>
              <DataSources />
            </AdminRoute>
          }
        />
        <Route path="/ozon-clusters" element={<Clusters />} />
        <Route path="/connections/:connectionId/ozon-clusters" element={<Navigate to="/ozon-clusters" replace />} />
        <Route
          path="/connections/:connectionId/wb-supply-plans"
          element={<SupplyPlanningRunner />}
        />
        <Route
          path="/connections/:connectionId/redistribution-orders"
          element={<RedistributionOrders />}
        />
        <Route
          path="/reports"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />
      </Routes>
    </CrmShell>
  )
}

const CrmApp: React.FC = () => {
  usePageMeta({ title: 'Market CRM', noindex: true })

  return (
    <PrivateRoute>
      <DashboardLayout />
    </PrivateRoute>
  )
}

export default CrmApp
