import React, { useState } from 'react'
import { Layout, Menu, Button, theme } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UploadOutlined,
  DatabaseOutlined,
  ShopOutlined,
  LinkOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import DataSources from './pages/DataSources'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Connections from './pages/Connections'
import ConnectionDetail from './pages/ConnectionDetail'
import Reports from './pages/Reports'
import VendorProducts from './pages/VendorProducts'
import OzonProducts from './pages/OzonProducts'
import Supplies from './pages/Supplies'
import SupplyTemplates from './pages/SupplyTemplates'
import SupplyTemplateDetail from './pages/SupplyTemplateDetail'

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

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/connections',
      icon: <LinkOutlined />,
      label: 'API Подключения',
    },
    {
      key: '/companies',
      icon: <ShopOutlined />,
      label: 'Компании',
    },
    {
      key: '/data-sources',
      icon: <DatabaseOutlined />,
      label: 'Источники данных',
    },
    {
      key: '/reports',
      icon: <UploadOutlined />,
      label: 'Отчеты',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: logout,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
    } else {
      navigate(key)
    }
  }

  // Determine selected menu key based on current path
  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/' || path.startsWith('/companies')) {
      return '/companies'
    }
    if (path.startsWith('/connections')) {
      return '/connections'
    }
    if (path.startsWith('/data-sources')) {
      return '/data-sources'
    }
    if (path.startsWith('/reports')) {
      return '/reports'
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
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/" element={<Navigate to="/companies" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
  )
}

export default App
