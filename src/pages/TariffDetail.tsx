import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Button, Radio, Typography, Space, message, Spin } from 'antd'
import { subscriptionsApi } from '../api/subscriptions'
import type { Tariff } from '../api/subscriptions'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

const TariffDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [tariff, setTariff] = useState<Tariff | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!slug) return

    const fetchTariff = async () => {
      try {
        const data = await subscriptionsApi.getTariffBySlug(slug)
        setTariff(data)
        if (data.variants.length > 0) {
          setSelectedPeriod(data.variants[0].period)
        }
      } catch (error) {
        console.error('Failed to fetch tariff:', error)
        message.error('Не удалось загрузить информацию о тарифе')
      } finally {
        setLoading(false)
      }
    }

    fetchTariff()
  }, [slug])

  const handleConnect = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: `/tariff/${slug}` } })
      return
    }

    if (!selectedPeriod) {
      message.warning('Выберите период подписки')
      return
    }

    message.info('Оплата будет добавлена в следующем шаге')
  }

  const selectedVariant = tariff?.variants.find((v) => v.period === selectedPeriod)

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        <Header />
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" />
        </Content>
        <Footer />
      </Layout>
    )
  }

  if (!tariff) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        <Header />
        <Content style={{ padding: '50px', textAlign: 'center', flex: 1 }}>
          <Title level={2} style={{ color: '#1a1a1a' }}>Тариф не найден</Title>
        </Content>
        <Footer />
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      <Header />
      <Content style={{ padding: '80px 24px', background: '#fafafa', flex: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 700 }}>
                  {tariff.tariff_type.toUpperCase()}
                </Title>
                <Paragraph style={{ color: '#595959', fontSize: '16px' }}>
                  Выберите период подписки
                </Paragraph>
              </div>

              <div>
                <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600 }}>Преимущества тарифа:</Title>
                <ul style={{ color: '#595959', paddingLeft: '20px', marginTop: '12px' }}>
                  {tariff.options.map((option, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{option}</li>
                  ))}
                </ul>
              </div>

              <div>
                <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600 }}>Период подписки:</Title>
                <Radio.Group
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tariff.variants.map((variant) => (
                      <Radio
                        key={variant.id}
                        value={variant.period}
                        style={{
                          padding: '12px',
                          borderRadius: '4px',
                          border: '1px solid #f0f0f0',
                          width: '100%',
                        }}
                      >
                        <span style={{ color: '#1a1a1a' }}>
                          {variant.period} месяц(ев) - {variant.price} ₽
                        </span>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>

              {selectedVariant && (
                <div
                  style={{
                    padding: '20px',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <Text strong style={{ color: '#1a1a1a', fontSize: '16px' }}>
                    Итого: {selectedVariant.price} ₽ за {selectedVariant.period} месяц(ев)
                  </Text>
                </div>
              )}

              <Button
                type="primary"
                size="large"
                block
                onClick={handleConnect}
                style={{
                  background: '#1a1a1a',
                  borderColor: '#1a1a1a',
                  height: '48px',
                  fontWeight: 500,
                  marginTop: '8px',
                }}
              >
                Подключить
              </Button>
            </Space>
          </Card>
        </div>
      </Content>
      <Footer />
    </Layout>
  )
}

export default TariffDetail
