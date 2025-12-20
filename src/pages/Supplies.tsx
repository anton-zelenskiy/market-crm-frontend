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
  Popover,
  Form,
  Input,
  Checkbox,
  Divider,
} from 'antd'
import { ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons'
import { suppliesApi, type SupplyOrder } from '../api/supplies'
import { companiesApi, type Company } from '../api/companies'
import { connectionsApi, type Connection } from '../api/connections'

const { Title } = Typography

interface SupplyActionsProps {
  supply: SupplyOrder
  connection: Connection
  onCreateCargoes: (supply: SupplyOrder, deleteCurrentVersion: boolean) => Promise<void>
  onDownloadDocuments: (supply: SupplyOrder, externalOrderId: string) => Promise<void>
  isCreating: boolean
  isDownloading: boolean
}

const SupplyActions: React.FC<SupplyActionsProps> = ({
  supply,
  onCreateCargoes,
  onDownloadDocuments,
  isCreating,
  isDownloading,
}) => {
  const [cargoForm] = Form.useForm()
  const [docForm] = Form.useForm()

  return (
    <div style={{ padding: '16px', minWidth: '300px' }}>
      <Form
        form={cargoForm}
        layout="vertical"
        onFinish={(values) => {
          onCreateCargoes(supply, values.delete_current_version ?? true)
        }}
      >
        <Typography.Title level={5}>Сгенерировать грузоместа</Typography.Title>
        <Form.Item
          name="delete_current_version"
          valuePropName="checked"
          initialValue={false}
        >
          <Checkbox>Удалить предыдущие грузоместа</Checkbox>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isCreating}
            block
          >
            Создать
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <Form
        form={docForm}
        layout="vertical"
        onFinish={(values) => {
          onDownloadDocuments(supply, values.external_order_id)
        }}
      >
        <Typography.Title level={5}>Скачать документы к поставке</Typography.Title>
        <Form.Item
          name="external_order_id"
          label="Номер внешнего заказа"
          rules={[
            { required: true, message: 'Пожалуйста, введите номер внешнего заказа' },
          ]}
        >
          <Input placeholder="Для транспортной компании" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isDownloading}
            block
          >
            Скачать
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

const Supplies: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [supplies, setSupplies] = useState<SupplyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [creatingCargoes, setCreatingCargoes] = useState<Record<string, boolean>>({})
  const [downloadingDocs, setDownloadingDocs] = useState<Record<string, boolean>>({})

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

  const formatErrorReason = (errorReason: string) => {
    const errorLabels: Record<string, string> = {
      INVALID_STATE: 'Недопустимое состояние поставки',
      VALIDATION_FAILED: 'Ошибки валидации',
      WAREHOUSE_LIMITS_EXCEED: 'Превышены лимиты склада',
      SUPPLY_NOT_BELONG_CONTRACTOR: 'Поставка не относится к указанному контрагенту',
      SUPPLY_NOT_BELONG_COMPANY: 'Поставка не относится к указанной компании',
      IS_FINALIZED: 'Редактирование поставки недоступно',
      SKU_DISTRIBUTION_DISABLED: 'Распределение состава недоступно',
      SUPPLY_IS_NOT_EMPTY: 'Поставка содержит распределение состава',
      OPERATION_NOT_FOUND: 'Операция не найдена',
      OPERATION_FAILED: 'Ошибка при обработке операции',
    }
    return errorLabels[errorReason] || errorReason
  }

  const handleCreateCargoes = async (supply: SupplyOrder, deleteCurrentVersion: boolean) => {
    if (!connection) return

    const supplyId = supply.order_number
    setCreatingCargoes((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.createCargoes(supplyId, {
        connection_id: connection.id,
        order_id: supply.order_id.toString(),
        delete_current_version: deleteCurrentVersion,
      })
      message.success('Грузоместа успешно созданы')
      // Reload supplies to show updated cargoes_count and errors
      await loadSupplies()
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания грузомест'
      )
    } finally {
      setCreatingCargoes((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleDownloadDocuments = async (supply: SupplyOrder, externalOrderId: string) => {
    if (!connection) return

    const supplyId = supply.order_number
    setDownloadingDocs((prev) => ({ ...prev, [supplyId]: true }))

    try {
      const blob = await suppliesApi.downloadDocuments(supplyId, {
        connection_id: connection.id,
        order_id: supply.order_id.toString(),
        external_order_id: externalOrderId,
      })

      // Construct filename using storage warehouse name from supply data
      const filenameSuffix = supply.storage_warehouse_name || supplyId
      const filename = `supply_documents_${filenameSuffix}.zip`

      // Create download link using constructed filename
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success('Документы успешно скачаны')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка скачивания документов'
      )
    } finally {
      setDownloadingDocs((prev) => ({ ...prev, [supplyId]: false }))
    }
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
    {
      title: 'Грузоместа',
      dataIndex: 'cargoes_count',
      key: 'cargoes_count',
      width: 120,
      render: (count: number | null) => {
        if (count === null) {
          return <span style={{ color: '#999' }}>Не созданы</span>
        }
        return count
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: SupplyOrder) => {
        if (!connection) return null
        const supplyId = record.order_number
        const isCreating = creatingCargoes[supplyId] || false
        const isDownloading = downloadingDocs[supplyId] || false

        return (
          <Popover
            content={
              <SupplyActions
                supply={record}
                connection={connection}
                onCreateCargoes={handleCreateCargoes}
                onDownloadDocuments={handleDownloadDocuments}
                isCreating={isCreating}
                isDownloading={isDownloading}
              />
            }
            trigger="click"
            placement="bottomRight"
          >
            <Button icon={<MoreOutlined />} />
          </Popover>
        )
      },
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
            {connection && connection.data_source?.name === 'ozon' && (
              <Button
                type="primary"
                onClick={() => {
                  navigate(`/connections/${connectionId}/supply-draft`)
                }}
              >
                Сформировать поставку
              </Button>
            )}
          </div>

          {!connection ? (
            <Alert
              title="Загрузка..."
              description="Загрузка данных подключения..."
              type="info"
              showIcon
            />
          ) : connection.data_source?.name !== 'ozon' ? (
            <Alert
              title="Неверное подключение"
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
              expandable={{
                expandedRowRender: (record: SupplyOrder) => {
                  if (!record.errors || record.errors.length === 0) {
                    return null
                  }
                  return (
                    <div style={{ padding: '16px' }}>
                      <Typography.Title level={5} style={{ marginBottom: '12px' }}>
                        Ошибки при создании грузомест:
                      </Typography.Title>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {record.errors.map((error, index) => (
                          <Alert
                            key={index}
                            message={formatErrorReason(error)}
                            type="error"
                            showIcon
                          />
                        ))}
                      </Space>
                    </div>
                  )
                },
                rowExpandable: (record: SupplyOrder) => {
                  return !!(record.errors && record.errors.length > 0)
                },
              }}
            />
          )}
        </Space>
      </Card>
    </div>
  )
}

export default Supplies

