import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Radio, Typography, Space, message, Spin } from 'antd'
import { subscriptionsApi } from '../api/subscriptions'
import type { Tariff } from '../api/subscriptions'
import { useAuth } from '../context/AuthContext'

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!tariff) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Title level={2}>Тариф не найден</Title>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '0 24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>{tariff.tariff_type.toUpperCase()}</Title>
            <Paragraph>Выберите период подписки</Paragraph>
          </div>

          <div>
            <Title level={4}>Преимущества тарифа:</Title>
            <ul>
              {tariff.options.map((option, index) => (
                <li key={index}>{option}</li>
              ))}
            </ul>
          </div>

          <div>
            <Title level={4}>Период подписки:</Title>
            <Radio.Group
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical">
                {tariff.variants.map((variant) => (
                  <Radio key={variant.id} value={variant.period}>
                    {variant.period} месяц(ев) - {variant.price} ₽
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          {selectedVariant && (
            <div style={{ padding: '16px', background: '#f0f2f5', borderRadius: '4px' }}>
              <Text strong>Итого: {selectedVariant.price} ₽ за {selectedVariant.period} месяц(ев)</Text>
            </div>
          )}

          <Button type="primary" size="large" block onClick={handleConnect}>
            Подключить
          </Button>
        </Space>
      </Card>
    </div>
  )
}

export default TariffDetail
