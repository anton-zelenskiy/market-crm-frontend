import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import { useAuth } from '../../context/AuthContext'
import { SITE_NAME, usePageMeta } from '../../ssr/PageMeta'
import './mk.css'

const HERO_CHECKS = [
  'Поставки по кластерам с учётом остатков и продаж',
  'Грузоместа с учётом кратности коробов',
  'Накладные сформированы',
]

const FEATURES = [
  {
    icon: '',
    title: 'Поставки',
    text: 'Формирование поставок с учётом остатков и продаж — для поддержания индекса локализации.',
  },
  {
    icon: 'mk-icon--diamond',
    title: 'Остатки',
    text: 'История изменения остатков по каждому артикулу.',
  },
  {
    icon: 'mk-icon--circle',
    title: 'Честный ЗНАК',
    text: 'Удобная генерация кодов маркировки и ввод их в оборот.',
  },
]

type Marketplace = 'ozon' | 'wildberries'

const MARKETPLACE_FEATURES: { key: Marketplace; title: string; items: { text: string; only?: boolean }[] }[] = [
  {
    key: 'ozon',
    title: 'Ozon',
    items: [
      { text: 'Формирование поставок (FBO): грузоместа и документы к поставке', only: true },
      { text: 'Остатки и дефициты товаров (FBO)', only: true },
      { text: 'Честный ЗНАК: коды маркировки и ввод в оборот' },
      { text: 'Интеграция с Kaiten' },
      { text: 'Выгрузка отчётов в CSV' },
    ],
  },
  {
    key: 'wildberries',
    title: 'Wildberries',
    items: [
      { text: 'Заказы FBS: отслеживание заказов; фиксация отгрузок на фулфилменты', only: true },
      { text: 'Честный ЗНАК: коды маркировки и ввод в оборот' },
      { text: 'Интеграция с Kaiten' },
      { text: 'Выгрузка отчётов в CSV' },
    ],
  },
]

const STEPS = [
  {
    title: 'Подключите кабинет',
    text: 'Добавьте API-ключ Ozon, Wildberries или Яндекс Маркета — товары, остатки и продажи подтянутся автоматически.',
  },
  {
    title: 'Укажите остатки',
    text: 'Внесите количество товара по артикулам, доступное для отправки на маркетплейс.',
  },
  {
    title: 'Сформируйте шаблон поставки',
    text: 'Система подготовит список кластеров и рекомендуемое количество к поставке по каждому артикулу.',
  },
]

const DESCRIPTION =
  'Market CRM — сервис для селлеров Ozon и Wildberries: поставки по кластерам с учётом остатков и продаж, ' +
  'грузоместа с учётом кратности коробов, история остатков и коды маркировки Честный ЗНАК.'

const Home: React.FC = () => {
  usePageMeta({
    title: `${SITE_NAME} — поставки на Ozon и Wildberries в один клик`,
    description: DESCRIPTION,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: DESCRIPTION,
    },
  })
  const { isAuthenticated } = useAuth()
  const { hash } = useLocation()
  const startUrl = isAuthenticated ? '/connections' : '/register'

  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="mk-page">
      <Header />
      <main className="mk-main">
        <section className="mk-container mk-hero">
          <div className="mk-hero__text">
            <h1 className="mk-h1">Поставки на маркетплейсы в&nbsp;один клик</h1>
            <p className="mk-lead">
              Market CRM сам распределит товары по кластерам, соберёт грузоместа и подготовит
              документы.
            </p>
            <div className="mk-actions">
              <Link to={startUrl} className="mk-btn mk-btn--primary mk-btn--lg mk-btn--raised">
                Начать
              </Link>
              <Link to="/#how" className="mk-btn mk-btn--outline mk-btn--lg">
                Как это работает
              </Link>
            </div>
          </div>

          <div className="mk-demo">
            <div className="mk-demo__head">
              <span className="mk-demo__pill">Сформировать поставку</span>
              <span className="mk-demo__hint">1 клик — и готово:</span>
            </div>
            <ul className="mk-checklist">
              {HERO_CHECKS.map((text) => (
                <li key={text} className="mk-checklist__item">
                  <span className="mk-check">✓</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="mk-container mk-section">
          <h2 className="mk-h2">Всё, что нужно менеджеру маркетплейсов</h2>
          <div className="mk-grid-3">
            {FEATURES.map(({ icon, title, text }) => (
              <div key={title} className="mk-card">
                <span className={`mk-icon ${icon}`}>
                  <span />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="marketplaces" className="mk-container mk-section">
          <h2 className="mk-h2">Возможности для Ozon и Wildberries</h2>
          <div className="mk-grid-2">
            {MARKETPLACE_FEATURES.map(({ key, title, items }) => (
              <div key={key} className={`mk-card mk-mp mk-mp--${key}`}>
                <h3>{title}</h3>
                <ul className="mk-features">
                  {items.map(({ text, only }) => (
                    <li key={text}>
                      <span className="mk-check mk-check--sm">✓</span>
                      <span>
                        {text}
                        {only && <span className="mk-mp__only">только {title}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mk-container mk-section">
          <h2 className="mk-h2">Три шага до поставки</h2>
          <div className="mk-grid-3">
            {STEPS.map(({ title, text }, index) => (
              <div key={title} className="mk-step">
                <span className="mk-step__num">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mk-container mk-cta-wrap">
          <div className="mk-cta">
            <h2>Первая поставка — за пару минут после подключения</h2>
            <Link to={startUrl} className="mk-btn mk-btn--primary mk-btn--lg">
              Начать
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Home
