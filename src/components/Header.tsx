import React from 'react'
import { Layout, Typography, Space, Button } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { RightOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Header: AntHeader } = Layout
const { Title } = Typography

const Header: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

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
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
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
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#1a1a1a',
            fontWeight: 500,
            transition: 'color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#4CAF50')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#1a1a1a')}
        >
          Главная
        </Link>
        <Link
          to="/instruction"
          style={{
            textDecoration: 'none',
            color: '#1a1a1a',
            fontWeight: 500,
            transition: 'color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#4CAF50')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#1a1a1a')}
        >
          Инструкция
        </Link>
        <Link
          to="/tariff"
          style={{
            textDecoration: 'none',
            color: '#1a1a1a',
            fontWeight: 500,
            transition: 'color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#4CAF50')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#1a1a1a')}
        >
          Тарифы
        </Link>
        {isAuthenticated ? (
          <Button
            type="primary"
            onClick={() => navigate('/connections')}
            style={{
              background: '#4CAF50',
              borderColor: '#4CAF50',
              fontWeight: 500,
              padding: '8px 24px',
              height: 'auto',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            CRM
            <RightOutlined />
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={() => navigate('/login')}
            style={{
              background: '#4CAF50',
              borderColor: '#4CAF50',
              fontWeight: 500,
              padding: '8px 24px',
              height: 'auto',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Войти
            <RightOutlined />
          </Button>
        )}
      </Space>
    </AntHeader>
  )
}

export default Header
