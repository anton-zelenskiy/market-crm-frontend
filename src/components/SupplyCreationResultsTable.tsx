import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Pagination, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { formatDateTime } from '../lib/dayjs'
import { buildSupplyCreationSummary, getDraftOutcome, supplyOutcomeColors, supplyOutcomeLabels } from '../lib/supplyCreationSummary'

const { Text } = Typography
const quantity = (value: number | null) => value === null ? 'Нет данных' : `${value.toLocaleString('ru-RU')} шт.`
const PAGE_SIZE = 10

type Props = {
  summary: ReturnType<typeof buildSupplyCreationSummary>
  connectionId?: string
  snapshotId?: string
  problemsOnly: boolean
  onProblemsOnlyChange: (value: boolean) => void
  onRefresh: () => void
  onDeleteDraft: (id: number) => void
  loading: boolean
}

export default function SupplyCreationResultsTable({
  summary, connectionId, snapshotId, problemsOnly, onProblemsOnlyChange, onRefresh, onDeleteDraft, loading,
}: Props) {
  const [page, setPage] = useState(1)
  const problems = summary.rows.filter(row => row.outcome !== 'created' && (row.planned > 0 || row.drafts.length))
  const clusters = problemsOnly ? problems : summary.rows
  const currentPage = Math.min(page, Math.max(1, Math.ceil(clusters.length / PAGE_SIZE)))
  // Paginate clusters before flattening so split supplies always stay together.
  const rows = clusters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).flatMap(cluster => {
    const drafts = cluster.drafts.length ? cluster.drafts : [null]
    return drafts.map((draft, index) => ({
      key: `${cluster.cluster}-${draft?.id ?? 'empty'}`, cluster, draft,
      rowSpan: index === 0 ? drafts.length : 0,
    }))
  })
  const clusterCell = (row: typeof rows[number]) => ({ rowSpan: row.rowSpan })
  const changeFilter = (value: boolean) => {
    setPage(1)
    onProblemsOnlyChange(value)
  }
  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Button size="small" onClick={onRefresh} loading={loading}>Обновить результаты</Button>
        <Button size="small" type={!problemsOnly ? 'primary' : 'default'} onClick={() => changeFilter(false)}>Все кластеры</Button>
        <Button size="small" type={problemsOnly ? 'primary' : 'default'} onClick={() => changeFilter(true)}>Требуют внимания ({problems.length})</Button>
      </Space>
      <Table size="small" rowKey="key" dataSource={rows} loading={loading} pagination={false} scroll={{ x: 1550 }}
        columns={[
          { title: 'Кластер', width: 180, onCell: clusterCell, render: (_, row) => row.cluster.cluster },
          { title: 'План', width: 100, onCell: clusterCell, render: (_, row) => quantity(row.cluster.planned) },
          { title: 'В созданных поставках', width: 130, onCell: clusterCell, render: (_, row) => quantity(row.cluster.unknown ? null : row.cluster.created) },
          { title: 'Осталось создать', width: 120, onCell: clusterCell, render: (_, row) => <Text type={(row.cluster.remaining || 0) > 0 ? 'warning' : undefined}>{quantity(row.cluster.remaining)}</Text> },
          { title: 'Результат кластера', width: 220, onCell: clusterCell, render: (_, row) => <Space orientation="vertical" size={0}>
            <Tag color={supplyOutcomeColors[row.cluster.outcome]}>{supplyOutcomeLabels[row.cluster.outcome]}</Tag>
            {row.cluster.createdOrders > 0 && <Text type="secondary">Создано заявок: {row.cluster.createdOrders} из {row.cluster.attempts}</Text>}
            {row.cluster.reasons.map(reason => <Text type="secondary" key={reason}>{reason}</Text>)}
          </Space> },
          { title: 'Черновик', width: 100, render: (_, { draft }) => draft ? <Link target="_blank" rel="noopener noreferrer"
            to={`/connections/${connectionId}/supply-templates/${snapshotId}/drafts/${draft.id}`}>№{draft.id}</Link> : <Text type="secondary">Не создан</Text> },
          { title: 'Склад отгрузки', width: 180, render: (_, { draft }) => draft?.drop_off_warehouse?.name || '—' },
          { title: 'Результат создания', width: 160, render: (_, { draft }) => draft ? <Tag color={supplyOutcomeColors[getDraftOutcome(draft)]}>{supplyOutcomeLabels[getDraftOutcome(draft)]}</Tag> : '—' },
          { title: 'Кол-во товара: в заявке / в грузоместах', width: 170, render: (_, { draft }) => draft?.supply_create_info?.order_id ? `${draft.products_count ?? '—'} / ${draft.cargoes_products_count ?? '—'}` : '—' },
          { title: 'ID заявки', width: 120, render: (_, { draft }) => draft?.supply_create_info?.order_id ? <Tag color="green">{draft.supply_create_info.order_id}</Tag> : '—' },
          { title: 'Дата создания', width: 150, render: (_, { draft }) => draft ? formatDateTime(draft.created_at) : '—' },
          { title: 'Действия', width: 90, render: (_, { draft }) => draft && <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Удалить черновик №${draft.id}`} onClick={() => onDeleteDraft(draft.id)} /> },
        ]}
      />
      {clusters.length > PAGE_SIZE && <Pagination current={currentPage} pageSize={PAGE_SIZE} total={clusters.length} onChange={setPage} showSizeChanger={false} />}
    </Space>
  )
}
