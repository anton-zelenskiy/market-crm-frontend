import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  message,
  Spin,
  Tag,
  Select,
  Alert,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { suppliesApi, type SupplyOrder } from '../api/supplies'
import { companiesApi, type Company } from '../api/companies'
import type { Connection } from '../api/connections'

const { Title } = Typography
const { Option } = Select

const Supplies: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const [supplies, setSupplies] = useState<SupplyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null)

  useEffect(() => {
    if (companyId) {
      loadCompanyData()
    }
  }, [companyId])

  useEffect(() => {
    if (companyId && selectedConnectionId) {
      loadSupplies()
    }
  }, [companyId, selectedConnectionId])

  const loadCompanyData = async () => {
    if (!companyId) return

    setLoading(true)
    try {
      const companyData = await companiesApi.getById(parseInt(companyId))
      setCompany(companyData)
      setConnections(companyData.connections || [])

      // Set first Ozon connection as selected by default
      const ozonConnections = companyData.connections?.filter(
        (c) => c.data_source?.name === 'ozon'
      ) || []
      if (ozonConnections.length > 0) {
        setSelectedConnectionId(ozonConnections[0].id)
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки данных компании'
      )
    } finally {
      setLoading(false)
    }
  }

  const loadSupplies = async () => {
    if (!companyId || !selectedConnectionId) return

    setLoading(true)
    try {
      const response = await suppliesApi.getByCompanyId(parseInt(companyId), {
        connection_id: selectedConnectionId,
      })
      setSupplies(response.orders)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки поставок'
      )
    } finally {
      setLoading(false)
    }
  }

  const getStateColor = (state: string) => {
    const stateColors: Record<string, string> = {
      DATA_FILLING: 'orange',
      READY_TO_SUPPLY: 'green',
      ACCEPTED_AT_SUPPLY_WAREHOUSE: 'cyan',
      IN_TRANSIT: 'blue',
      ACCEPTANCE_AT_STORAGE_WAREHOUSE: 'purple',
      REPORTS_CONFIRMATION_AWAITING: 'gold',
      REPORT_REJECTED: 'red',
      COMPLETED: 'success',
      REJECTED_AT_SUPPLY_WAREHOUSE: 'error',
      CANCELLED: 'default',
      OVERDUE: 'warning',
    }
    return stateColors[state] || 'default'
  }

  const formatState = (state: string) => {
    const stateLabels: Record<string, string> = {
      UNSPECIFIED: 'Не определён',
      DATA_FILLING: 'Заполнение данных',
      READY_TO_SUPPLY: 'Готова к отгрузке',
      ACCEPTED_AT_SUPPLY_WAREHOUSE: 'Принята на точке отгрузки',
      IN_TRANSIT: 'В пути',
      ACCEPTANCE_AT_STORAGE_WAREHOUSE: 'Приёмка на складе',
      REPORTS_CONFIRMATION_AWAITING: 'Согласование актов',
      REPORT_REJECTED: 'Спор',
      COMPLETED: 'Завершена',
      REJECTED_AT_SUPPLY_WAREHOUSE: 'Отказано в приёмке',
      CANCELLED: 'Отменена',
      OVERDUE: 'Просрочена',
    }
    return stateLabels[state] || state
  }

  const columns = [
    {
      title: 'ID заказа',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 120,
    },
    {
      title: 'ID поставки',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: 'Склад хранения',
      dataIndex: 'storage_warehouse_name',
      key: 'storage_warehouse_name',
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => (
        <Tag color={getStateColor(state)}>{formatState(state)}</Tag>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_date',
      key: 'created_date',
      render: (date: string) =>
        date ? new Date(date).toLocaleString('ru-RU') : '-',
    },
  ]

  if (loading && supplies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Card>
        <Space
          orientation="vertical"
          style={{ width: '100%', gap: '24px' }}
          size="large"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/companies/${companyId}`)}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Поставки - {company?.name || ''}
              </Title>
            </Space>
            {connections.length > 0 && (
              <Select
                value={selectedConnectionId}
                onChange={(value) => setSelectedConnectionId(value)}
                style={{ width: 300 }}
                placeholder="Выберите подключение"
              >
                {connections
                  .filter((c) => c.data_source?.name === 'ozon')
                  .map((conn) => (
                    <Option key={conn.id} value={conn.id}>
                      {conn.data_source?.title || `ID: ${conn.data_source_id}`}
                    </Option>
                  ))}
              </Select>
            )}
          </div>

          {!selectedConnectionId && connections.length > 0 ? (
            <Alert
              message="Выберите подключение"
              description="Пожалуйста, выберите Ozon подключение для просмотра поставок."
              type="info"
              showIcon
            />
          ) : connections.filter((c) => c.data_source?.name === 'ozon').length === 0 ? (
            <Alert
              message="Нет Ozon подключений"
              description="У этой компании нет Ozon подключений. Пожалуйста, создайте подключение на странице компании."
              type="warning"
              showIcon
            />
          ) : (
            <Table
            columns={columns}
            dataSource={supplies}
            rowKey="order_id"
            loading={loading}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
              }}
            />
          )}
        </Space>
      </Card>
    </div>
  )
}

export default Supplies

