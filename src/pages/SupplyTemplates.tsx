import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Card,
  Typography,
  Modal,
  Form,
  Select,
  Checkbox,
  Spin,
  Empty,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import {
  suppliesApi,
  type SupplySnapshotResponse,
  type SupplyCalculationStrategy,
  type CreateSnapshotConfig,
  type Warehouse,
} from '../api/supplies'
import { ProgressModal } from '../components/ProgressModal'
import { connectionsApi, type Connection } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'
import { ozonClustersApi, type OzonCluster } from '../api/clusters'
import { ozonProductsApi, type OzonProduct } from '../api/products'
import { DYNAMIC_PERCENTAGES_STRATEGY_DESCRIPTION, AVERAGE_SALES_STRATEGY_DESCRIPTION, MANUAL_XLSX_STRATEGY_DESCRIPTION } from '../constants'

const { Title, Text } = Typography
const { Option } = Select

const getWarehouseTypeLabel = (warehouseType: string | undefined): string => {
  const typeMap: Record<string, string> = {
    'WAREHOUSE_TYPE_DELIVERY_POINT': 'Пункт выдачи заказов',
    'WAREHOUSE_TYPE_ORDERS_RECEIVING_POINT': 'Пункт приёма заказов',
    'WAREHOUSE_TYPE_SORTING_CENTER': 'Сортировочный центр',
    'WAREHOUSE_TYPE_FULL_FILLMENT': 'Фулфилмент',
    'WAREHOUSE_TYPE_CROSS_DOCK': 'Кросс-докинг',
  }
  return warehouseType ? typeMap[warehouseType] || warehouseType : ''
}

const SupplyTemplates: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState<SupplySnapshotResponse[]>([])
  const [connection, setConnection] = useState<Connection | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [currentSnapshotId, setCurrentSnapshotId] = useState<number | null>(null)

  // Configuration state
  const [clusters, setClusters] = useState<OzonCluster[]>([])
  const [products, setProducts] = useState<OzonProduct[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [form] = Form.useForm()
  const searchTimeoutRef = React.useRef<number | null>(null)

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId])

  const loadData = async () => {
    if (!connectionId) return
    setLoading(true)
    try {
      const [snapshotsData, connectionData] = await Promise.all([
        suppliesApi.getSnapshots(parseInt(connectionId)),
        connectionsApi.getById(parseInt(connectionId)),
      ])
      setSnapshots(snapshotsData)
      setConnection(connectionData)
      
      const companyData = await companiesApi.getById(connectionData.company_id)
      setCompany(companyData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadClustersAndProducts = async () => {
    if (!connectionId) return

    setLoadingClusters(true)
    setLoadingProducts(true)

    try {
      const [clustersData, productsData] = await Promise.all([
        ozonClustersApi.getAll(),
        ozonProductsApi.getAll(parseInt(connectionId)),
      ])
      setClusters(clustersData)
      setProducts(productsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoadingClusters(false)
      setLoadingProducts(false)
    }
  }

  const loadWarehouses = async (search: string) => {
    if (!connectionId || search.length < 4) return
    
    setWarehouseLoading(true)
    try {
      const warehousesData = await suppliesApi.getWarehouses(parseInt(connectionId), search)
      setWarehouses(warehousesData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки складов')
    } finally {
      setWarehouseLoading(false)
    }
  }

  const handleWarehouseSearch = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const trimmedValue = value.trim()

    if (trimmedValue.length >= 4) {
      searchTimeoutRef.current = window.setTimeout(() => {
        loadWarehouses(trimmedValue)
      }, 400)
    } else {
      setWarehouses([])
      setWarehouseLoading(false)
    }
  }

  const handleOpenModal = () => {
    setModalVisible(true)
    loadClustersAndProducts()
    form.setFieldsValue({
      supply_calculation_strategy: 'average_sales',
      supply_products_to_neighbor_cluster: false,
      cluster_ids: [],
      offer_ids: [],
      drop_off_warehouse_id: undefined,
    })
    setWarehouses([])
  }

  const handleCreate = async () => {
    if (!connectionId) return

    setCreating(true)
    try {
      const values = form.getFieldsValue()
      const warehouseId = values.drop_off_warehouse_id
      const selectedWarehouse = warehouses.find((w) => w.warehouse_id === warehouseId)
      
      if (!selectedWarehouse) {
        message.error('Необходимо выбрать склад отгрузки')
        return
      }
      
      const config: CreateSnapshotConfig = {
        drop_off_warehouse: {
          warehouse_id: warehouseId,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
        supply_calculation_strategy: values.supply_calculation_strategy as SupplyCalculationStrategy,
        supply_products_to_neighbor_cluster: values.supply_products_to_neighbor_cluster || false,
        cluster_ids: values.cluster_ids?.length > 0 ? values.cluster_ids : undefined,
        offer_ids: values.offer_ids?.length > 0 ? values.offer_ids : undefined,
      }

      const fileList = values.supply_data_file as UploadFile[] | undefined
      const firstFile = fileList?.[0]?.originFileObj as File | undefined

      const newSnapshot = await suppliesApi.createSnapshot(parseInt(connectionId), config, firstFile)
      setModalVisible(false)
      form.resetFields()
      
      // Show progress modal and track task
      setCurrentSnapshotId(newSnapshot.snapshot_id)
      setCurrentTaskId(newSnapshot.task_id)
      setProgressModalVisible(true)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка создания шаблона')
    } finally {
      setCreating(false)
    }
  }

  const handleDownloadManualXlsxTemplate = async () => {
    if (!connectionId) return

    try {
      const values = form.getFieldsValue()
      const blob = await suppliesApi.downloadManualXlsxTemplate(
        parseInt(connectionId),
        {
          cluster_ids: values.cluster_ids?.length > 0 ? values.cluster_ids : undefined,
          offer_ids: values.offer_ids?.length > 0 ? values.offer_ids : undefined,
        }
      )

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Шаблон_поставок_${company?.name || connectionId}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      message.error('Ошибка скачивания XLSX шаблона')
    }
  }

  const handleDelete = async (snapshotId: number) => {
    try {
      await suppliesApi.deleteSnapshot(snapshotId)
      message.success('Шаблон удален')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления шаблона')
    }
  }

  const getStrategyLabel = (strategy: SupplyCalculationStrategy | null) => {
    switch (strategy) {
      case 'average_sales':
        return 'По средним продажам'
      case 'dynamic_percentages':
        return 'Динамические проценты'
      case 'manual_xlsx':
        return 'Загрузить вручную'
      default:
        return '-'
    }
  }

  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      render: (_: string, record: SupplySnapshotResponse) => (
        <Button
          type="link"
          onClick={() => navigate(`/connections/${connectionId}/supply-templates/${record.id}`)}
        >
          <Space>Поставка №{record.id} от {new Date(record.updated_at).toLocaleDateString('ru-RU')}</Space>
        </Button>        
      ),
    },
    {
      title: 'Стратегия',
      dataIndex: 'supply_calculation_strategy',
      key: 'strategy',
      width: 180,
      render: (strategy: SupplyCalculationStrategy | null) => getStrategyLabel(strategy),
    },
    {
      title: 'Кол-во товаров',
      dataIndex: 'data',
      key: 'items_count',
      width: 120,
      render: (data: any[]) => data.length,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: SupplySnapshotResponse) => (
        <Popconfirm
          title="Вы уверены, что хотите удалить этот шаблон?"
          onConfirm={() => handleDelete(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
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
                onClick={() => navigate(`/connections/${connectionId}`)}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined /> Поставки - {company?.name} ({connection?.data_source?.title})
              </Title>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenModal}
              loading={creating}
            >
              Сформировать поставку
            </Button>
          </div>

          <Modal
            title="Сформировать новую поставку"
            open={modalVisible}
            onOk={handleCreate}
            onCancel={() => {
              setModalVisible(false)
              form.resetFields()
            }}
            confirmLoading={creating}
            okText="Создать"
            cancelText="Отмена"
            width={700}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="supply_calculation_strategy"
                label="Стратегия расчёта поставки"
                initialValue="average_sales"
              >
                <Select>
                  <Option value="average_sales">
                    По средним продажам
                  </Option>
                  <Option value="dynamic_percentages">
                    Динамические проценты
                  </Option>
                  <Option value="manual_xlsx">
                    Загрузить вручную
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {({ getFieldValue }) => {
                  const strategy = getFieldValue('supply_calculation_strategy')

                  let strategyDescription = ''

                  switch (strategy) {
                    case 'dynamic_percentages':
                      strategyDescription = DYNAMIC_PERCENTAGES_STRATEGY_DESCRIPTION
                      break
                    case 'average_sales':
                      strategyDescription = AVERAGE_SALES_STRATEGY_DESCRIPTION
                      break
                    case 'manual_xlsx':
                      strategyDescription = MANUAL_XLSX_STRATEGY_DESCRIPTION
                      break
                  }
                  return (
                    <div style={{ 
                      background: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      marginBottom: '16px' 
                    }}>
                      {strategy === 'dynamic_percentages' ? (
                        <div 
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          dangerouslySetInnerHTML={{ __html: strategyDescription }}
                        />
                      ) : (
                        <Text type="secondary">{strategyDescription}</Text>
                      )}
                    </div>
                  )
                }}
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {({ getFieldValue }) => {
                  const strategy = getFieldValue('supply_calculation_strategy')
                  const showNeighborOption = strategy === 'dynamic_percentages'
                  return showNeighborOption && (
                    <Form.Item
                      name="supply_products_to_neighbor_cluster"
                      valuePropName="checked"
                    >
                      <Checkbox>
                        Поставить товар в соседний кластер (если есть ограничения)
                      </Checkbox>
                    </Form.Item>
                  )
                }}
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {() => (
                  <Form.Item
                    name="cluster_ids"
                    label="Кластеры (если не выбрано — все)"
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="Выберите кластеры"
                      loading={loadingClusters}
                      optionFilterProp="children"
                      showSearch
                    >
                      {clusters
                        .sort((a, b) => a.priority - b.priority)
                        .map((cluster) => (
                          <Option
                            key={cluster.cluster_id}
                            value={cluster.cluster_id}
                          >
                            {cluster.name}
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                )}
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {() => (
                  <Form.Item
                    name="offer_ids"
                    label="Товары (если не выбрано — все)"
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="Выберите товары"
                      loading={loadingProducts}
                      optionFilterProp="children"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          ?.toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {products.map((product) => (
                        <Option key={product.offer_id} value={product.offer_id}>
                          {product.offer_id} — {product.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {({ getFieldValue }) => {
                  const strategy = getFieldValue('supply_calculation_strategy')
                  if (strategy !== 'manual_xlsx') return null

                  return (
                    <>
                      <Form.Item label="XLSX шаблон">
                        <Button
                          icon={<FileExcelOutlined />}
                          onClick={handleDownloadManualXlsxTemplate}
                        >
                          Скачать XLSX шаблон
                        </Button>
                      </Form.Item>

                      <Form.Item
                        name="supply_data_file"
                        label="Загрузите заполненный XLSX файл"
                        rules={[{ required: true, message: 'Загрузите XLSX файл' }]}
                        valuePropName="fileList"
                        getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                      >
                        <Upload accept=".xlsx" maxCount={1} beforeUpload={() => false}>
                          <Button>Выбрать файл</Button>
                        </Upload>
                      </Form.Item>
                    </>
                  )
                }}
              </Form.Item>

              <Form.Item
                name="drop_off_warehouse_id"
                label="Склад отгрузки"
                rules={[{ required: true, message: 'Необходимо выбрать склад отгрузки' }]}
              >
                <Select
                  placeholder="Введите название склада (минимум 4 символа)"
                  showSearch
                  allowClear
                  filterOption={false}
                  onSearch={handleWarehouseSearch}
                  loading={warehouseLoading}
                  notFoundContent={
                    warehouseLoading ? <Spin size="small" /> : <Empty description="Введите название склада" />
                  }
                >
                  {warehouses.map((warehouse) => (
                    <Option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{warehouse.name}</div>
                        {warehouse.address && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {warehouse.address}
                          </div>
                        )}
                        {warehouse.warehouse_type && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            Тип: {getWarehouseTypeLabel(warehouse.warehouse_type)}
                          </div>
                        )}
              </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          {currentSnapshotId && currentTaskId && (
            <ProgressModal
              visible={progressModalVisible}
              snapshotId={currentSnapshotId}
              taskId={currentTaskId}
              onComplete={() => {
                setProgressModalVisible(false)
                navigate(`/connections/${connectionId}/supply-templates/${currentSnapshotId}`)
                setCurrentTaskId(null)
                setCurrentSnapshotId(null)
              }}
              onCancel={() => {
                setProgressModalVisible(false)
                setCurrentTaskId(null)
                setCurrentSnapshotId(null)
              }}
            />
          )}

          <Table
            columns={columns}
            dataSource={snapshots}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего ${total} шаблонов`,
            }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default SupplyTemplates
