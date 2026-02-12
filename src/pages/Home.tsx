import React, { useEffect, useState } from 'react'
import { Layout, Card, Row, Col, Button, Typography, Space } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { subscriptionsApi } from '../api/subscriptions'
import type { Tariff } from '../api/subscriptions'
import { useAuth } from '../context/AuthContext'

const { Header, Content, Footer } = Layout
const { Title, Text, Paragraph } = Typography

const Home: React.FC = () => {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const data = await subscriptionsApi.getTariffs()
        setTariffs(data)
      } catch (error) {
        console.error('Failed to fetch tariffs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTariffs()
  }, [])

  const handleConnect = (slug: string) => {
    navigate(`/tariff/${slug}`)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Market CRM</Title>
        <Space>
          <Link to="/instruction">Инструкция</Link>
          {isAuthenticated ? (
            <Link to="/connections">Профиль</Link>
          ) : (
            <Link to="/login">Войти</Link>
          )}
        </Space>
      </Header>
      <Content style={{ padding: '50px 24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '60px', textAlign: 'center' }}>
            <Title level={1}>О продукте</Title>
            <Paragraph style={{ fontSize: '16px', maxWidth: '800px', margin: '0 auto' }}>
              Здесь будет описание продукта. Заполним позднее.
            </Paragraph>
          </div>

          <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>Тарифы</Title>
          <Row gutter={[24, 24]} justify="center">
            {tariffs.map((tariff) => (
              <Col key={tariff.id} xs={24} sm={12} lg={8}>
                <Card
                  title={tariff.tariff_type.toUpperCase()}
                  style={{ height: '100%' }}
                  loading={loading}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Title level={4}>Преимущества:</Title>
                      <ul>
                        {tariff.options.map((option, index) => (
                          <li key={index}>{option}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Text strong>Варианты подписки:</Text>
                      <ul>
                        {tariff.variants.map((variant) => (
                          <li key={variant.id}>
                            {variant.period} мес. - {variant.price} ₽
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="primary"
                      block
                      onClick={() => handleConnect(tariff.slug)}
                    >
                      Подключить
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#fff' }}>
        <Space direction="vertical" size="small">
          <Text>Информация о ИП (заглушка)</Text>
          <Text>Контакты (заглушка)</Text>
          <Link to="/offer">Оферта</Link>
        </Space>
      </Footer>
    </Layout>
  )
}

export default Home
