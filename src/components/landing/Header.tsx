import React, { useState } from 'react'
import { Dropdown, Drawer, Space, Typography } from 'antd'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { RightOutlined, CrownOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuth } from '../../context/AuthContext'
import '../../pages/landing/mk.css'

const { Text } = Typography

const NAV_LINKS = [
  { to: '/#features', label: 'Возможности' },
  { to: '/#how', label: 'Как это работает' },
  { to: '/tariffs', label: 'Тарифы' },
]

const Header: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

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

  return (
    <>
      <header className="mk-header">
        <div className="mk-container mk-header__inner">
          <Link to="/" className="mk-brand" onClick={closeDrawer}>
            <img src="/favicon.svg" alt="" />
            <span>Market CRM</span>
          </Link>

          <nav className="mk-nav">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={pathname === to ? 'mk-nav__link--active' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mk-header__actions">
            {isAuthenticated ? (
              <>
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                  <button type="button" className="mk-btn mk-btn--ghost">
                    <UserOutlined />
                    <span className="mk-header__user">{user?.email ?? ''}</span>
                  </button>
                </Dropdown>
                <Link to="/connections" className="mk-btn mk-btn--primary">
                  CRM
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="mk-btn mk-btn--ghost">
                  Войти
                </Link>
                <Link to="/register" className="mk-btn mk-btn--primary">
                  Начать
                </Link>
              </>
            )}
            <button
              type="button"
              className="mk-btn mk-btn--ghost mk-header__burger"
              aria-label="Открыть меню"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuOutlined />
            </button>
          </div>
        </div>
      </header>

      <Drawer
        title="Меню"
        placement="right"
        size={280}
        onClose={closeDrawer}
        open={drawerOpen}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} onClick={closeDrawer} className="mk-drawer-link">
                {label}
              </Link>
            ))}
          </div>
          {isAuthenticated && (
            <>
              <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                {user?.email}
              </Text>
              <Text type="secondary">{tariffLabel}</Text>
            </>
          )}
        </Space>
      </Drawer>
    </>
  )
}

export default Header
