import React from 'react'
import { Link } from 'react-router-dom'
import { getSectionGroups, PRIMARY_ACTION, sectionHref } from '../crm/connectionSections'
import type { DataSourceName } from '../crm/connectionSections'

interface Props {
  connectionId: number
  source: DataSourceName
}

// Connection home: one primary action + grouped tiles. Whole tile is the link.
const ConnectionHub: React.FC<Props> = ({ connectionId, source }) => {
  const primary = PRIMARY_ACTION[source]
  return (
    <>
      <Link to={sectionHref(connectionId, primary.to)} className="crm-hero">
        <span>
          <span className="crm-hero-title">{primary.title}</span>
          <span className="crm-hero-desc">{primary.description}</span>
        </span>
        <span className="crm-hero-arrow">→</span>
      </Link>

      {getSectionGroups(source).map((g) => (
        <section key={g.title} className="crm-group">
          <h3 className="crm-group-title">{g.title}</h3>
          <div className="crm-tiles">
            {g.items.map((s) => (
              <Link key={s.key} to={sectionHref(connectionId, s.to)} className="crm-tile">
                <span>
                  <span className="crm-tile-title">{s.title}</span>
                  <span className="crm-tile-desc">{s.description}</span>
                </span>
                <span className="crm-tile-arrow">→</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export default ConnectionHub
