import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionsApi } from '../../api/subscriptions'
import type { Tariff, TariffVariant } from '../../api/subscriptions'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import { formatPeriod, formatPrice } from '../../lib/tariffFormat'
import './mk.css'

const FEATURED_TARIFF = 'standard'

const perMonth = (variant: TariffVariant) => Math.round(variant.price / variant.period)

interface PlanCardProps {
  tariff: Tariff
  onConnect: (slug: string, period?: number) => void
}

const PlanCard: React.FC<PlanCardProps> = ({ tariff, onConnect }) => {
  const [selectedId, setSelectedId] = useState(tariff.variants[0]?.id)
  const selected = tariff.variants.find((v) => v.id === selectedId)
  const featured = tariff.tariff_type === FEATURED_TARIFF

  return (
    <div className={`mk-plan${featured ? ' mk-plan--featured' : ''}`}>
      <h3 className="mk-plan__name">{tariff.tariff_type}</h3>

      {selected && (
        <div className="mk-price">
          <span className="mk-price__value">{formatPrice(selected.price)}</span>
          <span className="mk-price__period">за {formatPeriod(selected.period)}</span>
        </div>
      )}

      {tariff.variants.length > 1 && (
        <div className="mk-periods">
          {tariff.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={`mk-period${variant.id === selectedId ? ' mk-period--active' : ''}`}
              onClick={() => setSelectedId(variant.id)}
            >
              {formatPeriod(variant.period)}
              <small>{formatPrice(perMonth(variant))}/мес.</small>
            </button>
          ))}
        </div>
      )}

      <ul className="mk-features">
        {tariff.options.map((option, index) => (
          <li key={index}>
            <span className="mk-check mk-check--sm">✓</span>
            {option}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`mk-btn mk-btn--lg mk-btn--block ${featured ? 'mk-btn--primary mk-btn--raised' : 'mk-btn--outline'}`}
        onClick={() => onConnect(tariff.slug, selected?.period)}
      >
        Подключить
      </button>
    </div>
  )
}

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

  const handleConnect = (slug: string, period?: number) => {
    navigate(period ? `/tariff/${slug}?period=${period}` : `/tariff/${slug}`)
  }

  return (
    <div className="mk-page">
      <Header />
      <main className="mk-main">
        <section className="mk-container mk-pricing-head">
          <h1 className="mk-h1">Тарифы</h1>
          <p className="mk-lead">
            Выберите план и период подписки.
          </p>
        </section>

        <section className="mk-container mk-pricing">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="mk-plan mk-skeleton" />)
          ) : tariffs.length === 0 ? (
            <p className="mk-empty">Не удалось загрузить тарифы. Попробуйте обновить страницу.</p>
          ) : (
            tariffs.map((tariff) => (
              <PlanCard key={tariff.id} tariff={tariff} onConnect={handleConnect} />
            ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Tariffs
