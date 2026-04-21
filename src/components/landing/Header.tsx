import React, { useEffect, useState } from 'react'
import { Layout, Typography, Space, Button, Dropdown, theme, Drawer, Grid } from 'antd'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  RightOutlined,
  UserOutlined,
  CrownOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuth } from '../../context/AuthContext'

const { Header: AntHeader } = Layout
const { Title, Text } = Typography

const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: 'rgba(0, 0, 0, 0.88)',
  fontWeight: 500,
  transition: 'color 0.2s ease',
}

const isActivePath = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

const Header: React.FC = () => {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isDesktopNav = screens.md ?? true
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isDesktopNav) {
      setDrawerOpen(false)
    }
  }, [isDesktopNav])

  const activeNavLinkStyle: React.CSSProperties = {
    ...navLinkStyle,
    color: token.colorPrimary,
    fontWeight: 600,
    borderBottom: `2px solid ${token.colorPrimary}`,
    paddingBottom: '2px',
  }

  const sub = user?.active_subscription
  const tariffLabel = sub
    ? `${sub.tariff.slug} · ${sub.tariff_variant.period} мес.`
    : 'Нет подписки'
  const userMenuItems: MenuProps['items'] = [
    { key: 'email', label: user?.email ?? '', disabled: true },
    { type: 'divider' },
    { key: 'tariff', icon: <CrownOutlined />, label: tariffLabel, disabled: true },
    { type: 'divider' },
    {
      key: 'crm',
      icon: <RightOutlined />,
      label: 'CRM',
      onClick: () => navigate('/connections'),
    },
  ]

  const closeDrawer = () => setDrawerOpen(false)

  const drawerLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={closeDrawer}
      className={`landing-drawer-link${isActivePath(pathname, to) ? ' landing-drawer-link--active' : ''}`}
    >
      {label}
    </Link>
  )

  return (
    <>
      <AntHeader className="landing-header">
        <Link to="/" className="landing-header__brand" onClick={closeDrawer}>
          <div className="landing-header__logo">M</div>
          <Title level={3} className="landing-header__title">
            Market CRM
          </Title>
        </Link>

        {isDesktopNav ? (
          <Space size="large" className="landing-header__nav-desktop" style={{ fontSize: '15px' }}>
            <Link
              to="/"
              style={isActivePath(pathname, '/') ? activeNavLinkStyle : navLinkStyle}
            >
              Главная
            </Link>
            <Link
              to="/instruction"
              style={
                isActivePath(pathname, '/instruction') ? activeNavLinkStyle : navLinkStyle
              }
            >
              Инструкция
            </Link>
            <Link
              to="/tariffs"
              style={isActivePath(pathname, '/tariffs') ? activeNavLinkStyle : navLinkStyle}
            >
              Тарифы
            </Link>
            {isAuthenticated ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={<UserOutlined />}
                  className="landing-header__user-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {user?.email ?? ''}
                  <CrownOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                </Button>
              </Dropdown>
            ) : (
              <Button type="primary" onClick={() => navigate('/login')} icon={<RightOutlined />}>
                Войти
              </Button>
            )}
          </Space>
        ) : (
          <div className="landing-header__mobile-actions">
            {isAuthenticated ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<UserOutlined />} aria-label="Аккаунт" />
              </Dropdown>
            ) : (
              <Button type="primary" size="small" onClick={() => navigate('/login')}>
                Войти
              </Button>
            )}
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label="Открыть меню"
              onClick={() => setDrawerOpen(true)}
            />
          </div>
        )}
      </AntHeader>

      <Drawer
        title="Меню"
        placement="right"
        width={280}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        className="landing-nav-drawer"
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {drawerLink('/', 'Главная')}
          {drawerLink('/instruction', 'Инструкция')}
          {drawerLink('/tariffs', 'Тарифы')}
          {isAuthenticated ? (
            <>
              <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                {user?.email}
              </Text>
              <Text type="secondary">{tariffLabel}</Text>
              <Button
                type="primary"
                block
                icon={<RightOutlined />}
                onClick={() => {
                  navigate('/connections')
                  closeDrawer()
                }}
              >
                CRM
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              block
              icon={<RightOutlined />}
              onClick={() => {
                navigate('/login')
                closeDrawer()
              }}
            >
              Войти
            </Button>
          )}
        </Space>
      </Drawer>
    </>
  )
}

export default Header
