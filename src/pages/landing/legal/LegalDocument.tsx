import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../../components/landing/Header'
import Footer from '../../../components/landing/Footer'
import { LEGAL_REVISION_DATE } from '../../../constants/legal'
import { SITE_NAME, usePageMeta } from '../../../ssr/PageMeta'
import type { LegalDocumentContent } from './types'
import '../mk.css'

const LINK_PATTERN = /\[([^\]]+)\]\((\/[^)]*)\)/g

/** Renders text with markdown-style internal links as router links. */
export const RichText: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(LINK_PATTERN)) {
    parts.push(text.slice(last, match.index))
    parts.push(
      <Link key={match.index} to={match[2]}>
        {match[1]}
      </Link>,
    )
    last = match.index + match[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

const LegalDocument: React.FC<{ content: LegalDocumentContent }> = ({ content }) => {
  usePageMeta({ title: `${content.title} — ${SITE_NAME}`, description: content.description })

  return (
    <div className="mk-page">
      <Header />
      <main className="mk-main mk-legal-page">
        <div className="mk-legal">
          <Link to="/legal" className="mk-back">
            ← Юридическая информация
          </Link>
          <header className="mk-legal__head">
            <h1>{content.title}</h1>
            <p>Редакция от {LEGAL_REVISION_DATE}</p>
          </header>

          <article className="mk-legal__card">
            {content.sections.map((section, sectionIndex) => {
              const sectionNumber = sectionIndex + 1
              let clauseNumber = 0
              return (
                <section key={section.title} className="mk-legal__section">
                  <h2>
                    {sectionNumber}. {section.title}
                  </h2>
                  {section.blocks.map((block, blockIndex) =>
                    typeof block === 'string' ? (
                      <p key={blockIndex} className="mk-legal__clause">
                        {sectionNumber}.{++clauseNumber}. <RichText text={block} />
                      </p>
                    ) : (
                      <ul key={blockIndex} className="mk-legal__list">
                        {block.list.map((item) => (
                          <li key={item}>
                            <RichText text={item} />
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </section>
              )
            })}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default LegalDocument
