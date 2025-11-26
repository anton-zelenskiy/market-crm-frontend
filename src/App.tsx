import React, { useState } from 'react'
import { Layout, Menu, Button, theme } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UploadOutlined,
  VideoCameraOutlined,
  DatabaseOutlined,
  ShopOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import DataSources from './pages/DataSources'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Reports from './pages/Reports'

const { Header, Sider, Content } = Layout

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div>
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
      key: '/companies',
      icon: <ShopOutlined />,
      label: 'Companies',
    },
    {
      key: '/data-sources',
      icon: <DatabaseOutlined />,
      label: 'Data Sources',
    },
    {
      key: '/dashboard',
      icon: <VideoCameraOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/reports',
      icon: <UploadOutlined />,
      label: 'Reports',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
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
    if (path.startsWith('/data-sources')) {
      return '/data-sources'
    }
    if (path.startsWith('/reports')) {
      return '/reports'
    }
    if (path.startsWith('/dashboard')) {
      return '/dashboard'
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
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/dashboard" element={<div><h2>Welcome to Market CRM</h2><p>Dashboard coming soon...</p></div>} />
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
