import React, { useEffect, useState } from 'react'
import { Breadcrumb } from 'antd'
import { Link } from 'react-router-dom'
import { connectionsApi } from '../../api/connections'
import { companiesApi } from '../../api/companies'

/** Breadcrumb «API Подключения / <company> / Честный знак / <page>». */
const CzBreadcrumb: React.FC<{ connectionId: number; title: string }> = ({ connectionId, title }) => {
  const [companyName, setCompanyName] = useState<string | null>(null)

  useEffect(() => {
    connectionsApi
      .getById(connectionId)
      .then((c) => companiesApi.getById(c.company_id))
      .then((company) => setCompanyName(company.name))
      .catch(() => setCompanyName(null))
  }, [connectionId])

  return (
    <Breadcrumb
      items={[
        { title: <Link to="/connections">API Подключения</Link> },
        { title: <Link to={`/connections/${connectionId}`}>{companyName || 'Подключение'}</Link> },
        {
          title: <Link to={`/connections/${connectionId}#chestny-znak`}>Честный знак</Link>,
        },
        { title },
      ]}
    />
  )
}

export default CzBreadcrumb
