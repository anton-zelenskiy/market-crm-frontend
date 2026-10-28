import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { message, Spin } from 'antd'
import { subscriptionsApi } from '../../api/subscriptions'
import type { Tariff } from '../../api/subscriptions'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import { formatPeriod, formatPrice } from '../../lib/tariffFormat'
import { useInitialData } from '../../ssr/InitialData'
import { SITE_NAME, usePageMeta } from '../../ssr/PageMeta'
import './mk.css'

const pickPeriod = (tariff: Tariff, requested: number) =>
  (tariff.variants.find((v) => v.period === requested) ?? tariff.variants[0])?.period ?? null

const TariffDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const initial = useInitialData().tariff
  const preloaded = initial && initial.slug === slug ? initial : undefined
  const [tariff, setTariff] = useState<Tariff | null>(preloaded?.data ?? null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(() =>
    preloaded?.data ? pickPeriod(preloaded.data, Number(searchParams.get('period'))) : null,
  )
  const [loading, setLoading] = useState(!preloaded)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  usePageMeta(
    tariff
      ? {
          title: `Тариф «${tariff.name}» — ${SITE_NAME}`,
          description: `Тариф «${tariff.name}» Market CRM: ${tariff.options.join('; ')}`,
        }
      : { title: `Тариф — ${SITE_NAME}`, noindex: !loading },
  )

  useEffect(() => {
    if (!slug || preloaded) return

    const fetchTariff = async () => {
      setLoading(true)
      try {
        const data = await subscriptionsApi.getTariffBySlug(slug)
        setTariff(data)
        setSelectedPeriod(pickPeriod(data, Number(searchParams.get('period'))))
      } catch (error) {
        console.error('Failed to fetch tariff:', error)
        message.error('Не удалось загрузить информацию о тарифе')
      } finally {
        setLoading(false)
      }
    }

    fetchTariff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    message.info('Технические работы. Подключение тарифа временно недоступно.')
  }

  const selectedVariant = tariff?.variants.find((v) => v.period === selectedPeriod)

  const renderBody = () => {
    if (loading) {
      return (
        <div className="mk-center">
          <Spin size="large" />
        </div>
      )
    }

    if (!tariff) {
      return (
        <div className="mk-center">
          <h2 className="mk-h2">Тариф не найден</h2>
          <Link to="/tariffs" className="mk-btn mk-btn--outline mk-btn--lg">
            Все тарифы
          </Link>
        </div>
      )
    }

    return (
      <div className="mk-detail">
        <Link to="/tariffs" className="mk-back">
          ← Все тарифы
        </Link>
        <div className="mk-plan mk-plan--featured">
          <h1 className="mk-plan__name" style={{ fontSize: 32 }}>
            {tariff.name}
          </h1>

          <ul className="mk-features">
            {tariff.options.map((option, index) => (
              <li key={index}>
                <span className="mk-check mk-check--sm">✓</span>
                {option}
              </li>
            ))}
          </ul>

          <span className="mk-label">Период подписки</span>
          <div className="mk-periods">
            {tariff.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className={`mk-period${variant.period === selectedPeriod ? ' mk-period--active' : ''}`}
                onClick={() => setSelectedPeriod(variant.period)}
              >
                {formatPeriod(variant.period, tariff.period_type)}
                <small>{formatPrice(variant.price)}</small>
              </button>
            ))}
          </div>

          {selectedVariant && (
            <div className="mk-summary">
              Итого: {formatPrice(selectedVariant.price)} за {formatPeriod(selectedVariant.period, tariff.period_type)}
            </div>
          )}

          <button
            type="button"
            className="mk-btn mk-btn--primary mk-btn--lg mk-btn--block mk-btn--raised"
            onClick={handleConnect}
          >
            Подключить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mk-page">
      <Header />
      <main className="mk-main">{renderBody()}</main>
      <Footer />
    </div>
  )
}

export default TariffDetail
