import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Select } from 'antd'
import { useAuth } from '../context/AuthContext'
import { connectionsApi } from '../api/connections'
import type { Connection } from '../api/connections'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import { getSectionGroups, SETTINGS_SECTION, sectionHref } from '../crm/connectionSections'
import type { ConnectionSection, DataSourceName } from '../crm/connectionSections'

const ROOT_NAV = [
  { to: '/', label: 'Главная' },
  { to: '/connections', label: 'API подключения' },
  { to: '/companies', label: 'Компании' },
  { to: '/ozon-clusters', label: 'Кластеры Ozon' },
]

const isRootActive = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)

const CrmSidebar: React.FC = () => {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const connectionId = pathname.match(/^\/connections\/(\d+)/)?.[1]

  useEffect(() => {
    Promise.all([connectionsApi.getAll(), companiesApi.getAll()])
      .then(([c, co]) => {
        setConnections(c)
        setCompanies(co)
      })
      .catch(() => {})
  }, [])

  const current = connections.find((c) => String(c.id) === connectionId)
  const source = (current?.data_source?.name ?? 'ozon') as DataSourceName
  const groups = getSectionGroups(source)
  const settings = SETTINGS_SECTION[source]

  const options = useMemo(
    () =>
      connections.map((c) => ({
        value: c.id,
        label: `${companies.find((co) => co.id === c.company_id)?.name ?? 'Компания'} · ${c.data_source?.title ?? ''}`,
      })),
    [connections, companies],
  )

  const isSectionActive = ({ to, activeAlso }: ConnectionSection) => {
    if (!connectionId) return false
    const base = `/connections/${connectionId}`
    if (to.startsWith('#')) {
      return (pathname === base && hash === to) || (!!activeAlso && pathname.startsWith(`${base}${activeAlso}`))
    }
    return pathname.startsWith(`${base}${to}`)
  }

  const badge = source === 'wildberries' ? 'WB' : 'OZ'

  return (
    <aside className="crm-sidebar">
      <Link to="/" className="crm-logo">
        <img src="/favicon.svg" alt="" />
        Market CRM
      </Link>

      <nav className="crm-nav">
        {ROOT_NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`crm-nav-link${isRootActive(pathname, n.to) ? ' is-root-active' : ''}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {connectionId && (
        <>
          <div className="crm-switcher">
            <span className={`crm-mp-badge ${source}`}>{badge}</span>
            <Select
              variant="borderless"
              value={current?.id}
              options={options}
              onChange={(id) => navigate(`/connections/${id}`)}
              popupMatchSelectWidth={280}
              placeholder="Подключение"
            />
          </div>

          {groups.map((g) => (
            <nav key={g.title} className="crm-nav">
              <span className="crm-nav-group-title">{g.title}</span>
              {g.items.map((s) => (
                <Link
                  key={s.key}
                  to={sectionHref(connectionId, s.to)}
                  className={`crm-nav-link${isSectionActive(s) ? ' is-active' : ''}`}
                >
                  {s.nav}
                </Link>
              ))}
            </nav>
          ))}
        </>
      )}

      <div className="crm-sidebar-footer">
        {connectionId && settings && (
          <Link
            to={sectionHref(connectionId, settings.to)}
            className={`crm-nav-link${isSectionActive(settings) ? ' is-active' : ''}`}
          >
            {settings.nav}
          </Link>
        )}
        <div className="crm-user">
          <span className="crm-avatar">{user?.email?.[0] ?? '?'}</span>
          <span>{user?.email}</span>
        </div>
        <button type="button" className="crm-nav-link crm-logout" onClick={logout}>
          Выйти
        </button>
      </div>
    </aside>
  )
}

export default CrmSidebar
