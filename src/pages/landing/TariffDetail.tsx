import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Button, Radio, Typography, Space, message, Spin } from 'antd'
import { subscriptionsApi } from '../../api/subscriptions'
import type { Tariff } from '../../api/subscriptions'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import './landing.css'

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
      <Layout className="landing-layout">
        <Header />
        <Content className="landing-content-center">
          <Spin size="large" />
        </Content>
        <Footer />
      </Layout>
    )
  }

  if (!tariff) {
    return (
      <Layout className="landing-layout">
        <Header />
        <Content className="landing-content-error">
          <Title level={2} className="landing-text-dark">Тариф не найден</Title>
        </Content>
        <Footer />
      </Layout>
    )
  }

  return (
    <Layout className="landing-layout">
      <Header />
      <Content className="landing-content">
        <div className="landing-container-narrow">
          <Card className="landing-card-content">
            <Space direction="vertical" size="large" className="landing-full-width">
              <div>
                <Title level={2} className="landing-title">
                  {tariff.tariff_type.toUpperCase()}
                </Title>
                <Paragraph className="landing-text landing-paragraph-medium">
                  Выберите период подписки
                </Paragraph>
              </div>

              <div>
                <Title level={4} className="landing-subtitle">Преимущества тарифа:</Title>
                <ul className="landing-list landing-list-margin-top">
                  {tariff.options.map((option, index) => (
                    <li key={index} className="landing-list-item">{option}</li>
                  ))}
                </ul>
              </div>

              <div>
                <Title level={4} className="landing-subtitle">Период подписки:</Title>
                <Radio.Group
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="tariff-radio-group"
                >
                  <Space direction="vertical" className="landing-full-width">
                    {tariff.variants.map((variant) => (
                      <Radio
                        key={variant.id}
                        value={variant.period}
                        className="tariff-radio-item"
                      >
                        <span className="tariff-radio-text">
                          {variant.period} месяц(ев) - {variant.price} ₽
                        </span>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>

              {selectedVariant && (
                <div className="tariff-summary">
                  <Text strong className="tariff-summary-text">
                    Итого: {selectedVariant.price} ₽ за {selectedVariant.period} месяц(ев)
                  </Text>
                </div>
              )}

              <Button
                type="primary"
                size="large"
                block
                onClick={handleConnect}
                style={{ marginTop: '8px' }}
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
