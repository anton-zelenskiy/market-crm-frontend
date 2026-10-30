import React from 'react'
import { Link } from 'react-router-dom'
import { getSectionGroups, sectionHref } from '../crm/connectionSections'
import type { DataSourceName } from '../crm/connectionSections'

interface Props {
  connectionId: number
  source: DataSourceName
}

// Connection home: grouped tiles. Whole tile is the link.
const ConnectionHub: React.FC<Props> = ({ connectionId, source }) => {
  return (
    <>
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
