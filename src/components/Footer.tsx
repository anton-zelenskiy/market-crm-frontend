import React, { useState } from 'react'
import { Layout, Typography, Space, Input, Button, Row, Col } from 'antd'
import { Link } from 'react-router-dom'
import { InstagramOutlined, GlobalOutlined, TwitterOutlined, YoutubeOutlined, SendOutlined } from '@ant-design/icons'

const { Footer: AntFooter } = Layout
const { Title, Text } = Typography

const Footer: React.FC = () => {
  const [email, setEmail] = useState('')

  const handleSubscribe = () => {
    if (email.trim()) {
      console.log('Subscribe:', email)
      setEmail('')
    }
  }

  return (
    <AntFooter
      style={{
        background: '#263238',
        padding: '60px 80px 40px',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Row gutter={[48, 32]}>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" size="middle">
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#4CAF50',
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
                <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#ffffff', fontSize: '20px' }}>
                  Market CRM
                </Title>
              </Link>
              <Text style={{ color: '#90A4AE', fontSize: '14px', lineHeight: '1.6' }}>
                Copyright © {new Date().getFullYear()} Market CRM.
                <br />
                All rights reserved
              </Text>
              <Space size="middle">
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#37474F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4CAF50')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#37474F')}
                >
                  <InstagramOutlined style={{ color: '#90A4AE', fontSize: '16px' }} />
                </div>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#37474F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4CAF50')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#37474F')}
                >
                  <GlobalOutlined style={{ color: '#90A4AE', fontSize: '16px' }} />
                </div>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#37474F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4CAF50')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#37474F')}
                >
                  <TwitterOutlined style={{ color: '#90A4AE', fontSize: '16px' }} />
                </div>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#37474F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4CAF50')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#37474F')}
                >
                  <YoutubeOutlined style={{ color: '#90A4AE', fontSize: '16px' }} />
                </div>
              </Space>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size="middle">
              <Title level={5} style={{ margin: 0, fontWeight: 600, color: '#ffffff', fontSize: '16px' }}>
                Компания
              </Title>
              <Space direction="vertical" size="small">
                <Link
                  to="/about"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  О нас
                </Link>
                <Link
                  to="/blog"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Блог
                </Link>
                <Link
                  to="/contact"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Контакты
                </Link>
                <Link
                  to="/tariff"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Тарифы
                </Link>
              </Space>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size="middle">
              <Title level={5} style={{ margin: 0, fontWeight: 600, color: '#ffffff', fontSize: '16px' }}>
                Поддержка
              </Title>
              <Space direction="vertical" size="small">
                <Link
                  to="/help"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Центр помощи
                </Link>
                <Link
                  to="/terms"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Условия использования
                </Link>
                <Link
                  to="/legal"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Правовая информация
                </Link>
                <Link
                  to="/privacy"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Политика конфиденциальности
                </Link>
                <Link
                  to="/status"
                  style={{
                    color: '#90A4AE',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#90A4AE')}
                >
                  Статус
                </Link>
              </Space>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Title level={5} style={{ margin: 0, fontWeight: 600, color: '#ffffff', fontSize: '16px' }}>
                Оставайтесь в курсе
              </Title>
              <div style={{ display: 'flex', gap: '0', width: '100%' }}>
                <Input
                  placeholder="Ваш email адрес"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onPressEnter={handleSubscribe}
                  style={{
                    flex: 1,
                    background: '#37474F',
                    border: 'none',
                    borderRadius: '6px 0 0 6px',
                    color: '#ffffff',
                    padding: '10px 16px',
                  }}
                  styles={{
                    input: {
                      background: '#37474F',
                      color: '#ffffff',
                    },
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSubscribe}
                  style={{
                    background: '#4CAF50',
                    borderColor: '#4CAF50',
                    borderRadius: '0 6px 6px 0',
                    height: 'auto',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </div>
            </Space>
          </Col>
        </Row>
      </div>
    </AntFooter>
  )
}

export default Footer
