import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, Typography, Space, Table, message, Tag, Breadcrumb, Timeline } from 'antd'
import { fbsOrdersApi, type FBSOrder, type FBSOrderStatus } from '../api/wbFulfillment'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const statusLabel = (order: FBSOrder): React.ReactNode => {
  if (!order.latest_wb_status) return <span style={{ color: '#999' }}>—</span>
  return <Tag>{order.latest_wb_status}</Tag>
}

const FBSOrderStatusTimeline: React.FC<{ connId: number; orderId: number }> = ({
  connId,
  orderId,
}) => {
  const [statuses, setStatuses] = useState<FBSOrderStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fbsOrdersApi
      .getStatuses(connId, orderId)
      .then(setStatuses)
      .catch(() => message.error('Ошибка загрузки истории статусов'))
      .finally(() => setLoading(false))
  }, [connId, orderId])

  if (loading) return null
  if (statuses.length === 0) return <span style={{ color: '#999' }}>Нет данных по истории</span>

  return (
    <Timeline
      style={{ padding: '8px 0' }}
      items={statuses.map((s) => ({
        children: (
          <div>
            <strong>{s.history_status || s.wb_status || s.supplier_status}</strong>
            {s.status_description && <div>{s.status_description}</div>}
            <div style={{ color: '#999', fontSize: 12 }}>{new Date(s.set_at).toLocaleString('ru-RU')}</div>
          </div>
        ),
      }))}
    />
  )
}

const FBSOrders: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [orders, setOrders] = useState<FBSOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (connId) loadData()
  }, [connId])

  const loadData = async () => {
    setLoading(true)
    try {
      const connectionData = await connectionsApi.getById(connId)
      if (connectionData.company_id) {
        try {
          setCompany(await companiesApi.getById(connectionData.company_id))
        } catch {
          setCompany(null)
        }
      }
      setOrders(await fbsOrdersApi.getAll(connId))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки заказов')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'ID заказа', dataIndex: 'id', key: 'id', width: 120 },
    { title: 'Артикул', dataIndex: 'article', key: 'article', width: 140 },
    { title: 'nmID', dataIndex: 'nm_id', key: 'nm_id', width: 120 },
    {
      title: 'Склад',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Фулфилмент',
      dataIndex: 'fulfillment_name',
      key: 'fulfillment_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: unknown, record: FBSOrder) => statusLabel(record),
    },
    {
      title: 'Создан на WB',
      dataIndex: 'wb_created_at',
      key: 'wb_created_at',
      render: (v: string | null) => (v ? new Date(v).toLocaleString('ru-RU') : '—'),
    },
  ]

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Breadcrumb
                items={[
                  { title: <Link to="/connections">API Подключения</Link> },
                  { title: <Link to={`/connections/${connId}`}>{company?.name || 'Подключение'}</Link> },
                  { title: 'Заказы FBS' },
                ]}
              />
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Заказы FBS{company && ': ' + company.name}
          </Title>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 100, showSizeChanger: true, showTotal: (total) => `Всего ${total} заказов` }}
            expandable={{
              expandedRowRender: (record: FBSOrder) => (
                <FBSOrderStatusTimeline connId={connId} orderId={record.id} />
              ),
            }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default FBSOrders
