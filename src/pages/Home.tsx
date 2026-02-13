import React, { useEffect, useState } from 'react'
import { Layout, Card, Row, Col, Button, Typography, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { subscriptionsApi } from '../api/subscriptions'
import type { Tariff } from '../api/subscriptions'
import Header from '../components/Header'
import Footer from '../components/Footer'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

const Home: React.FC = () => {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)
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
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      <Header />
      <Content style={{ padding: '80px 24px', background: '#fafafa', flex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '80px', textAlign: 'center' }}>
            <Title level={1} style={{ color: '#1a1a1a', fontWeight: 700, marginBottom: '24px' }}>
              О продукте
            </Title>
            <Paragraph style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto', color: '#595959', lineHeight: '1.8' }}>
              Здесь будет описание продукта.
            </Paragraph>
          </div>

          <Title level={2} style={{ textAlign: 'center', marginBottom: '60px', color: '#1a1a1a', fontWeight: 600 }}>
            Тарифы
          </Title>
          <Row gutter={[24, 24]} justify="center">
            {tariffs.map((tariff) => (
              <Col key={tariff.id} xs={24} sm={12} lg={8}>
                <Card
                  title={tariff.tariff_type.toUpperCase()}
                  style={{
                    height: '100%',
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                  loading={loading}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600 }}>Преимущества:</Title>
                      <ul style={{ color: '#595959', paddingLeft: '20px' }}>
                        {tariff.options.map((option, index) => (
                          <li key={index} style={{ marginBottom: '8px' }}>{option}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Text strong style={{ color: '#1a1a1a' }}>Варианты подписки:</Text>
                      <ul style={{ color: '#595959', paddingLeft: '20px', marginTop: '8px' }}>
                        {tariff.variants.map((variant) => (
                          <li key={variant.id} style={{ marginBottom: '4px' }}>
                            {variant.period} мес. - {variant.price} ₽
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="primary"
                      block
                      onClick={() => handleConnect(tariff.slug)}
                      style={{
                        background: '#1a1a1a',
                        borderColor: '#1a1a1a',
                        height: '44px',
                        fontWeight: 500,
                        marginTop: '16px',
                      }}
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
      <Footer />
    </Layout>
  )
}

export default Home
