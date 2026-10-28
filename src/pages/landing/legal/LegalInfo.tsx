import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../../components/landing/Header'
import Footer from '../../../components/landing/Footer'
import { LEGAL_OPERATOR } from '../../../constants/legal'
import { SITE_NAME, usePageMeta } from '../../../ssr/PageMeta'
import { PRIVACY } from './privacy'
import { TERMS } from './terms'
import '../mk.css'

const DOCUMENTS = [
  { to: '/privacy', title: PRIVACY.title, text: PRIVACY.description },
  { to: '/terms', title: TERMS.title, text: TERMS.description },
]

const REQUISITES = [
  { label: 'Исполнитель', value: LEGAL_OPERATOR.name },
  { label: 'ИНН', value: LEGAL_OPERATOR.inn },
  { label: 'ОГРНИП', value: LEGAL_OPERATOR.ogrnip },
  { label: 'Email', value: LEGAL_OPERATOR.email },
  { label: 'Сайт', value: LEGAL_OPERATOR.site },
]

const LegalInfo: React.FC = () => {
  usePageMeta({
    title: `Юридическая информация — ${SITE_NAME}`,
    description: 'Документы, регулирующие использование Market CRM, и реквизиты исполнителя.',
  })

  return (
    <div className="mk-page">
      <Header />
      <main className="mk-main mk-legal-page">
        <div className="mk-legal">
          <header className="mk-legal__head">
            <h1>Юридическая информация</h1>
            <p>Документы, регулирующие использование {SITE_NAME}</p>
          </header>

          <article className="mk-legal__card">
            <section className="mk-legal__section">
              <h2>Документы</h2>
              <div className="mk-legal__docs">
                {DOCUMENTS.map(({ to, title, text }) => (
                  <Link key={to} to={to} className="mk-legal__doc">
                    <strong>{title} →</strong>
                    <span>{text}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mk-legal__section">
              <h2>Реквизиты</h2>
              <dl className="mk-legal__requisites">
                {REQUISITES.map(({ label, value }) => (
                  <React.Fragment key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>

            <section className="mk-legal__section">
              <h2>Контакты</h2>
              <p>
                По вопросам и претензиям пишите на{' '}
                {LEGAL_OPERATOR.email}
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default LegalInfo
