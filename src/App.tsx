import React, { useState } from 'react'
import { Layout, Menu, Button, theme, ConfigProvider } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UploadOutlined,
  DatabaseOutlined,
  ShopOutlined,
  LinkOutlined,
  HomeOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/landing/Login'
import Register from './pages/landing/Register'
import Home from './pages/landing/Home'
import TariffDetail from './pages/landing/TariffDetail'
import Tariffs from './pages/landing/Tariffs'
import DataSources from './pages/DataSources'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Connections from './pages/Connections'
import ConnectionDetail from './pages/ConnectionDetail'
import Clusters from './pages/Clusters'
import Reports from './pages/Reports'
import VendorProducts from './pages/VendorProducts'
import OzonProducts from './pages/OzonProducts'
import Supplies from './pages/Supplies'
import SupplyTemplates from './pages/SupplyTemplates'
import SupplyTemplateDetail from './pages/SupplyTemplateDetail'
import SupplyDraftDetail from './pages/SupplyDraftDetail'

const { Header, Sider, Content } = Layout

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
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()
  const { logout, isAdmin } = useAuth()
  const location = useLocation()

  const allMenuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Главная</Link>,
    },
    {
      key: '/connections',
      icon: <LinkOutlined />,
      label: <Link to="/connections">API Подключения</Link>,
    },
    {
      key: '/companies',
      icon: <ShopOutlined />,
      label: <Link to="/companies">Компании</Link>,
    },
    {
      key: '/data-sources',
      icon: <DatabaseOutlined />,
      label: <Link to="/data-sources">Источники данных</Link>,
      adminOnly: true,
    },
    {
      key: '/reports',
      icon: <UploadOutlined />,
      label: <Link to="/reports">Отчеты</Link>,
      adminOnly: true,
    },
    {
      key: '/clusters',
      icon: <DatabaseOutlined />,
      label: <Link to="/clusters">Кластеры</Link>,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: logout,
    },
  ]

  const menuItems = allMenuItems.filter((item) => !item.adminOnly || isAdmin)

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
    }
  }

  // Determine selected menu key based on current path
  const getSelectedKey = () => {
    const path = location.pathname
    if (path.startsWith('/connections')) {
      return '/connections'
    }
    if (path.startsWith('/companies')) {
      return '/companies'
    }
    if (path.startsWith('/data-sources')) {
      return '/data-sources'
    }
    if (path.startsWith('/reports')) {
      return '/reports'
    }
    if (path.startsWith('/clusters')) {
      return '/clusters'
    }
    return path
  }

  const selectedKey = getSelectedKey()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.3)' }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: '32px',
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Routes>
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/companies/:companyId/vendor-products" element={<VendorProducts />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/connections/:connectionId" element={<ConnectionDetail />} />
            <Route path="/connections/:connectionId/ozon-products" element={<OzonProducts />} />
            <Route path="/connections/:connectionId/supplies" element={<Supplies />} />
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
            <Route path="/clusters" element={<Clusters />} />
            <Route
              path="/reports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

// Soft color theme configuration
const softTheme = {
  token: {
    colorBgContainer: '#faf9f7',
    colorBgLayout: '#e8e6e3',
    colorBgBase: '#faf9f7',
    colorBgElevated: '#faf9f7',
    colorBorderSecondary: '#e0ddd8',
    colorFillQuaternary: '#f0eeeb',
  },
  components: {
    Layout: {
      headerBg: '#f5f4f1',
      bodyBg: '#e8e6e3',
      siderBg: '#001529',
    },
    Table: {
      headerBg: '#f0eeeb',
    },
    Card: {
      colorBgContainer: '#faf9f7',
    },
  },
}

const App: React.FC = () => {
  return (
    <ConfigProvider theme={softTheme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/tariffs" element={<Tariffs />} />
            <Route path="/tariff/:slug" element={<TariffDetail />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
