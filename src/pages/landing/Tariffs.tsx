import React, { useEffect, useState } from 'react'
import { Layout, Card, Row, Col, Button, Typography, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { subscriptionsApi } from '../../api/subscriptions'
import type { Tariff } from '../../api/subscriptions'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import './landing.css'

const { Content } = Layout
const { Title, Text } = Typography

const Tariffs: React.FC = () => {
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
    <Layout className="landing-layout">
      <Header />
      <Content className="landing-content">
        <div className="landing-container">
          <div className="landing-section-medium landing-text-center">
            <Title level={1} className="landing-title-large">
              Тарифы
            </Title>
          </div>

          <Row gutter={[24, 24]} justify="center">
            {tariffs.map((tariff) => (
              <Col key={tariff.id} xs={24} sm={12} lg={8}>
                <Card
                  title={tariff.tariff_type.toUpperCase()}
                  className="landing-card"
                  loading={loading}
                >
                  <Space direction="vertical" size="middle" className="landing-full-width">
                    <div>
                      <Title level={4} className="landing-subtitle">Преимущества:</Title>
                      <ul className="landing-list">
                        {tariff.options.map((option, index) => (
                          <li key={index} className="landing-list-item">{option}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Text strong className="landing-text-dark">Варианты подписки:</Text>
                      <ul className="landing-list landing-margin-top-small">
                        {tariff.variants.map((variant) => (
                          <li key={variant.id} className="landing-list-item-small">
                            {variant.period} мес. - {variant.price} ₽
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="primary"
                      block
                      onClick={() => handleConnect(tariff.slug)}
                      style={{ marginTop: '16px' }}
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

export default Tariffs
