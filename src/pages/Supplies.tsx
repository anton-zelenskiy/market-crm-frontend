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
  Alert,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { suppliesApi, type SupplyOrder } from '../api/supplies'
import { companiesApi, type Company } from '../api/companies'
import { connectionsApi, type Connection } from '../api/connections'

const { Title } = Typography

const Supplies: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [supplies, setSupplies] = useState<SupplyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)

  useEffect(() => {
    if (connectionId) {
      loadConnectionData()
    }
  }, [connectionId])

  useEffect(() => {
    if (connection) {
      loadSupplies()
    }
  }, [connection])

  const loadConnectionData = async () => {
    if (!connectionId) return

    setLoading(true)
    try {
      const connectionData = await connectionsApi.getById(parseInt(connectionId))
      setConnection(connectionData)

      // Load company data to get company name
      const companyData = await companiesApi.getById(connectionData.company_id)
      setCompany(companyData)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки данных подключения'
      )
    } finally {
      setLoading(false)
    }
  }

  const loadSupplies = async () => {
    if (!connection) return

    setLoading(true)
    try {
      const response = await suppliesApi.getByConnectionId(connection.id)
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
                onClick={() => {
                  if (company) {
                    navigate(`/companies/${company.id}`)
                  } else {
                    navigate('/connections')
                  }
                }}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Поставки - {company?.name || ''}
              </Title>
            </Space>
          </div>

          {!connection ? (
            <Alert
              message="Загрузка..."
              description="Загрузка данных подключения..."
              type="info"
              showIcon
            />
          ) : connection.data_source?.name !== 'ozon' ? (
            <Alert
              message="Неверное подключение"
              description="Это подключение не является Ozon подключением."
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

