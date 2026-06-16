import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  message,
  Tag,
  Form,
  Input,
  Select,
  InputNumber,
  Modal,
  Tabs,
  DatePicker,
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { redistributionApi } from '../api/redistribution'
import type {
  RedistributionOrder,
  RedistributionOrderStatus,
  StockInfo,
  GoodsReturnItem,
} from '../api/redistribution'
import { connectionsApi } from '../api/connections'
import type { Connection } from '../api/connections'
import {
  WB_COMPANY_CONFIGS,
  getCompanyNameBySlug,
} from '../constants/wbCompanies'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const RedistributionOrders: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [orders, setOrders] = useState<RedistributionOrder[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(10)
  const [ordersStatus, setOrdersStatus] =
    useState<RedistributionOrderStatus>('pending')
  const [movements, setMovements] = useState<GoodsReturnItem[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null)
  const [searchingArticle, setSearchingArticle] = useState(false)
  const [movementsCompanySlug, setMovementsCompanySlug] = useState<string>()
  const [form] = Form.useForm()

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId, ordersPage, ordersPageSize, ordersStatus])

  const loadData = async () => {
    if (!connectionId) return

    setLoading(true)
    try {
      const [conn, ordersData] = await Promise.all([
        connectionsApi.getById(parseInt(connectionId)),
        redistributionApi.list(parseInt(connectionId), {
          status: ordersStatus,
          limit: ordersPageSize,
          offset: (ordersPage - 1) * ordersPageSize,
        }),
      ])
      setConnection(conn)
      setOrders(ordersData.items)
      setOrdersTotal(ordersData.total)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadMovements = async (
    dateFrom: string,
    dateTo: string,
    companySlug: string
  ) => {
    if (!connectionId) return

    try {
      const movementsData = await redistributionApi.listMovements(
        parseInt(connectionId),
        companySlug,
        dateFrom,
        dateTo
      )
      setMovements(movementsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки перемещений')
    }
  }

  const handleSearchArticle = async () => {
    const nmId = form.getFieldValue('nm_id')
    const companySlug = form.getFieldValue('company_slug')
    if (!nmId || !connectionId) return
    if (!companySlug) {
      message.warning('Сначала выберите компанию')
      return
    }

    setSearchingArticle(true)
    try {
      const stockData = await redistributionApi.getStockInfo(
        parseInt(connectionId),
        companySlug,
        nmId
      )
      setStockInfo(stockData)
      form.setFieldsValue({
        src_office_id: undefined,
        dst_office_id: undefined,
        chrt_id: undefined,
      })
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Артикул не найден')
      setStockInfo(null)
    } finally {
      setSearchingArticle(false)
    }
  }

  const handleSrcWarehouseChange = () => {
    form.setFieldsValue({ chrt_id: undefined })
  }

  const handleCreateOrder = async (values: any) => {
    if (!connectionId || !connection) return

    try {
      const srcWarehouse = stockInfo?.src.find(
        (w) => w.office_id === values.src_office_id
      )
      const dstWarehouse = stockInfo?.dst.find(
        (w) => w.office_id === values.dst_office_id
      )

      if (!srcWarehouse || !dstWarehouse) {
        message.error('Склады не найдены')
        return
      }

      const stockItem = srcWarehouse.in_stock.find(
        (item) => item.chrt_id === values.chrt_id
      )
      if (!stockItem) {
        message.error('Размер не найден')
        return
      }

      await redistributionApi.create({
        connection_id: parseInt(connectionId),
        company_slug: values.company_slug,
        nm_id: values.nm_id,
        chrt_id: values.chrt_id,
        tech_size: stockItem.tech_size,
        src_office_id: values.src_office_id,
        src_office_name: srcWarehouse.office_name,
        dst_office_id: values.dst_office_id,
        dst_office_name: dstWarehouse.office_name,
        count: values.count,
      })

      message.success('Ордер на перемещение создан')
      setCreateModalVisible(false)
      form.resetFields()
      setStockInfo(null)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка создания ордера')
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    try {
      await redistributionApi.cancel(orderId)
      message.success('Ордер отменен')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка отмены ордера')
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'gold', text: 'Ожидает' },
      processing: { color: 'blue', text: 'Обработка' },
      completed: { color: 'green', text: 'Завершен' },
      cancelled: { color: 'default', text: 'Отменен' },
      failed: { color: 'red', text: 'Ошибка' },
    }
    const config = statusConfig[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const getAvailableStock = (srcOfficeId: number, chrtId: number): number => {
    if (!stockInfo) return 0
    const warehouse = stockInfo.src.find((w) => w.office_id === srcOfficeId)
    if (!warehouse) return 0
    const item = warehouse.in_stock.find((i) => i.chrt_id === chrtId)
    return item ? item.count : 0
  }

  const ordersColumns: ColumnsType<RedistributionOrder> = [
    {
      title: 'Компания',
      dataIndex: 'company_slug',
      key: 'company_slug',
      render: (slug: string) => getCompanyNameBySlug(slug) ?? slug,
    },
    {
      title: 'Артикул WB',
      dataIndex: 'nm_id',
      key: 'nm_id',
    },
    {
      title: 'Размер',
      dataIndex: 'chrt_id',
      key: 'chrt_id',
    },
    {
      title: 'Откуда → Куда',
      key: 'warehouses',
      render: (_, record) => (
        <div>
          <div>{record.src_office_name}</div>
          <div>↓</div>
          <div>{record.dst_office_name}</div>
        </div>
      ),
    },
    {
      title: 'Количество',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              danger
              size="small"
              onClick={() => handleCancelOrder(record.id)}
            >
              Отменить
            </Button>
          )}
          {record.status === 'failed' && record.error_message && (
            <Text type="danger" style={{ fontSize: '12px' }}>
              {record.error_message}
            </Text>
          )}
        </Space>
      ),
    },
  ]

  const movementsColumns: ColumnsType<GoodsReturnItem> = [
    {
      title: 'Артикул WB',
      dataIndex: 'nm_id',
      key: 'nm_id',
    },
    {
      title: 'Товар',
      key: 'product',
      render: (_, record) => (
        <div>
          <div>{record.brand_name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.subject_name} - {record.ts_name}
          </div>
        </div>
      ),
    },
    {
      title: 'Склад',
      dataIndex: 'office_address',
      key: 'office_address',
    },
    {
      title: 'Статус',
      dataIndex: 'status_id',
      key: 'status_id',
    },
    {
      title: 'Дата заказа',
      dataIndex: 'order_date',
      key: 'order_date',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }} size="large">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          Перераспределение остатков
          {connection && ` - ${connection.company_id}`}
        </Title>
      </Space>

      <Tabs
        defaultActiveKey="orders"
        items={[
          {
            key: 'orders',
            label: 'Ордера на перемещение',
            children: (
              <Card>
                <Space
                  style={{ marginBottom: '16px', width: '100%' }}
                  direction="vertical"
                >
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateModalVisible(true)}
                    >
                      Создать ордер
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadData}
                      loading={loading}
                    >
                      Обновить
                    </Button>
                    <Select
                      value={ordersStatus}
                      style={{ width: 180 }}
                      onChange={(value) => {
                        setOrdersStatus(value)
                        setOrdersPage(1)
                      }}
                    >
                      <Option value="pending">Ожидает</Option>
                      <Option value="processing">Обработка</Option>
                      <Option value="completed">Завершен</Option>
                      <Option value="cancelled">Отменен</Option>
                      <Option value="failed">Ошибка</Option>
                    </Select>
                  </Space>
                </Space>

                <Table
                  columns={ordersColumns}
                  dataSource={orders}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: ordersPage,
                    pageSize: ordersPageSize,
                    total: ordersTotal,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => {
                      setOrdersPage(page)
                      setOrdersPageSize(pageSize)
                    },
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'movements',
            label: 'Проверка перемещений',
            children: (
              <Card>
                <Space
                  style={{ marginBottom: '16px' }}
                  direction="vertical"
                  size="large"
                >
                  <Text>
                    Проверьте, появились ли созданные перемещения в системе WB
                  </Text>
                  <Select
                    placeholder="Выберите компанию"
                    style={{ width: 300 }}
                    value={movementsCompanySlug}
                    onChange={setMovementsCompanySlug}
                  >
                    {WB_COMPANY_CONFIGS.map((company) => (
                      <Option key={company.slug} value={company.slug}>
                        {company.companyName}
                      </Option>
                    ))}
                  </Select>
                  <RangePicker
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1] && movementsCompanySlug) {
                        loadMovements(
                          dates[0].format('YYYY-MM-DD'),
                          dates[1].format('YYYY-MM-DD'),
                          movementsCompanySlug
                        )
                      }
                    }}
                    format="DD.MM.YYYY"
                    disabled={!movementsCompanySlug}
                  />
                </Space>

                <Table
                  columns={movementsColumns}
                  dataSource={movements}
                  rowKey={(record, index) => `${record.nm_id}-${index}`}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Создать ордер на перемещение"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
          setStockInfo(null)
        }}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleCreateOrder} layout="vertical">
          <Form.Item
            name="company_slug"
            label="Компания"
            rules={[{ required: true, message: 'Выберите компанию' }]}
          >
            <Select placeholder="Выберите компанию">
              {WB_COMPANY_CONFIGS.map((company) => (
                <Option key={company.slug} value={company.slug}>
                  {company.companyName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="nm_id"
            label="Артикул WB"
            rules={[{ required: true, message: 'Введите артикул' }]}
          >
            <Input
              placeholder="Введите артикул WB"
              suffix={
                <Button
                  type="link"
                  icon={<SearchOutlined />}
                  onClick={handleSearchArticle}
                  loading={searchingArticle}
                >
                  Найти
                </Button>
              }
            />
          </Form.Item>

          {stockInfo && (
            <>
              <Form.Item
                name="src_office_id"
                label="Склад откуда забрать"
                rules={[{ required: true, message: 'Выберите склад' }]}
              >
                <Select
                  placeholder="Выберите склад"
                  onChange={handleSrcWarehouseChange}
                >
                  {stockInfo.src.map((wh) => (
                    <Option key={wh.office_id} value={wh.office_id}>
                      {wh.office_name} (остаток:{' '}
                      {wh.in_stock.reduce((sum, item) => sum + item.count, 0)})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="dst_office_id"
                label="Склад куда переместить"
                rules={[{ required: true, message: 'Выберите склад' }]}
              >
                <Select placeholder="Выберите склад">
                  {stockInfo.dst.map((wh) => (
                    <Option key={wh.office_id} value={wh.office_id}>
                      {wh.office_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.src_office_id !== currentValues.src_office_id
                }
              >
                {({ getFieldValue }) => {
                  const srcOfficeId = getFieldValue('src_office_id')
                  const warehouse = stockInfo.src.find(
                    (w) => w.office_id === srcOfficeId
                  )
                  return warehouse && warehouse.in_stock.length > 0 ? (
                    <Form.Item
                      name="chrt_id"
                      label="Размер товара"
                      rules={[{ required: true, message: 'Выберите размер' }]}
                    >
                      <Select placeholder="Выберите размер">
                        {warehouse.in_stock.map((item) => (
                          <Option key={item.chrt_id} value={item.chrt_id}>
                            {item.tech_size} (остаток: {item.count})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  ) : null
                }}
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.src_office_id !== currentValues.src_office_id ||
                  prevValues.chrt_id !== currentValues.chrt_id
                }
              >
                {({ getFieldValue }) => {
                  const srcOfficeId = getFieldValue('src_office_id')
                  const chrtId = getFieldValue('chrt_id')
                  const maxCount =
                    srcOfficeId && chrtId
                      ? getAvailableStock(srcOfficeId, chrtId)
                      : 0
                  return (
                    <Form.Item
                      name="count"
                      label="Количество"
                      rules={[
                        { required: true, message: 'Введите количество' },
                        {
                          type: 'number',
                          min: 1,
                          max: maxCount,
                          message: `Доступно: ${maxCount}`,
                        },
                      ]}
                    >
                      <InputNumber
                        min={1}
                        max={maxCount}
                        style={{ width: '100%' }}
                        placeholder={`Доступно: ${maxCount}`}
                      />
                    </Form.Item>
                  )
                }}
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Создать
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false)
                  form.resetFields()
                  setStockInfo(null)
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RedistributionOrders
