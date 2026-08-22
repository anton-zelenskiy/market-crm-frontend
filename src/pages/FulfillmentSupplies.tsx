import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, Typography, Space, Table, message, Breadcrumb } from 'antd'
import { fulfillmentSuppliesApi, type FulfillmentSupplyRow } from '../api/wbFulfillment'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const formatMoney = (v: string | null) => (v == null ? '—' : Number(v).toFixed(2))

const FulfillmentSupplies: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [rows, setRows] = useState<FulfillmentSupplyRow[]>([])
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
      setRows(await fulfillmentSuppliesApi.getAll(connId))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки поставок')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'ID поставки', dataIndex: 'supply_id', key: 'supply_id', width: 160 },
    {
      title: 'Создана',
      dataIndex: 'supply_created_at',
      key: 'supply_created_at',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString('ru-RU') : '—'),
    },
    {
      title: 'Фулфилмент',
      dataIndex: 'fulfillment_name',
      key: 'fulfillment_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    { title: 'nmID', dataIndex: 'nm_id', key: 'nm_id', width: 110 },
    {
      title: 'Размер',
      dataIndex: 'tech_size',
      key: 'tech_size',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Категория',
      dataIndex: 'product_category_name',
      key: 'product_category_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    { title: 'Кол-во упаковок', dataIndex: 'package_count', key: 'package_count', width: 130 },
    {
      title: 'Кол-во единиц',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 120,
      render: (v: number | null) => v ?? <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Цена за единицу',
      dataIndex: 'price_per_item',
      key: 'price_per_item',
      width: 130,
      render: formatMoney,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 120,
      render: formatMoney,
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
                  { title: 'Поставки фулфилмента' },
                ]}
              />
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Поставки фулфилмента{company && ': ' + company.name}
          </Title>
          <Table
            columns={columns}
            dataSource={rows}
            rowKey={(r) => `${r.supply_id}:${r.nm_id}:${r.tech_size}`}
            loading={loading}
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 100, showSizeChanger: true, showTotal: (total) => `Всего ${total} строк` }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default FulfillmentSupplies
