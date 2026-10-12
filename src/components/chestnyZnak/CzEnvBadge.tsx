import React from 'react'
import { Tag, Tooltip } from 'antd'
import type { CzEnvironment } from '../../api/chestnyZnak'

const CzEnvBadge: React.FC<{ environment: CzEnvironment | null | undefined }> = ({ environment }) => {
  if (!environment) return null
  if (environment === 'sandbox') {
    return (
      <Tooltip title="Тестовый контур Честного знака: коды не настоящие, деньги не списываются">
        <Tag color="orange">ПЕСОЧНИЦА</Tag>
      </Tooltip>
    )
  }
  return (
    <Tooltip title="Рабочий контур Честного знака: коды платные и настоящие">
      <Tag color="green">PRODUCTION</Tag>
    </Tooltip>
  )
}

export default CzEnvBadge
