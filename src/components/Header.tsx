import React from 'react'
import { Layout, Typography, Space, Button, Dropdown } from 'antd'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { RightOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuth } from '../context/AuthContext'

const { Header: AntHeader } = Layout
const { Title } = Typography

const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#1a1a1a',
  fontWeight: 500,
  transition: 'color 0.2s ease',
}

const activeNavLinkStyle: React.CSSProperties = {
  ...navLinkStyle,
  color: '#45a049',
  fontWeight: 600,
  borderBottom: '2px solid #45a049',
  paddingBottom: '2px',
}

const isActivePath = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

const Header: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const sub = user?.active_subscription
  const tariffLabel = sub ? `${sub.tariff.slug} · ${sub.tariff_variant.period} мес.` : 'Нет подписки'
  const userMenuItems: MenuProps['items'] = [
    { key: 'email', label: user?.email ?? '', disabled: true },
    { type: 'divider' },
    { key: 'tariff', icon: <CrownOutlined />, label: tariffLabel, disabled: true },
    { type: 'divider' },
    { key: 'crm', icon: <RightOutlined />, label: 'CRM', onClick: () => navigate('/connections') },
  ]

  return (
    <AntHeader
      style={{
        background: '#ffffff',
        padding: '0 80px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '80px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #45a049 100%)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#ffffff',
            fontSize: '18px',
          }}
        >
          M
        </div>
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1a1a1a', fontSize: '24px' }}>
          Market CRM
        </Title>
      </Link>

      <Space size="large" style={{ fontSize: '15px' }}>
        <Link to="/" style={isActivePath(pathname, '/') ? activeNavLinkStyle : navLinkStyle}>
          Главная
        </Link>
        <Link to="/instruction" style={isActivePath(pathname, '/instruction') ? activeNavLinkStyle : navLinkStyle}>
          Инструкция
        </Link>
        <Link to="/tariffs" style={isActivePath(pathname, '/tariffs') ? activeNavLinkStyle : navLinkStyle}>
          Тарифы
        </Link>
        {isAuthenticated ? (
          <>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user?.email ?? ''}
                <CrownOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              </Button>
            </Dropdown>
          </>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')} icon={<RightOutlined />}>
            Войти
          </Button>
        )}
      </Space>
    </AntHeader>
  )
}

export default Header
