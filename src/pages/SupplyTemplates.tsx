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
  Upload,
  Form,
  Select,
  Checkbox,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  suppliesApi,
  type SupplySnapshotResponse,
  type SupplyCalculationStrategy,
  type CreateSnapshotConfig,
} from '../api/supplies'
import { connectionsApi, type Connection } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'
import { ozonClustersApi, type OzonCluster } from '../api/clusters'
import { ozonProductsApi, type OzonProduct } from '../api/products'

const { Title, Text } = Typography
const { Option } = Select

const SupplyTemplates: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState<SupplySnapshotResponse[]>([])
  const [connection, setConnection] = useState<Connection | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])

  // Configuration state
  const [clusters, setClusters] = useState<OzonCluster[]>([])
  const [products, setProducts] = useState<OzonProduct[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [form] = Form.useForm()

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

  const handleOpenModal = () => {
    setModalVisible(true)
    loadClustersAndProducts()
    form.setFieldsValue({
      supply_calculation_strategy: 'average_sales',
      supply_products_to_neighbor_cluster: false,
      cluster_ids: [],
      offer_ids: [],
    })
  }

  const handleCreate = async () => {
    if (!connectionId) return
    if (fileList.length === 0) {
      message.error('Пожалуйста, выберите файл с ограничениями складов')
      return
    }

    setCreating(true)
    try {
      const values = form.getFieldsValue()
      const config: CreateSnapshotConfig = {
        supply_calculation_strategy: values.supply_calculation_strategy as SupplyCalculationStrategy,
        supply_products_to_neighbor_cluster: values.supply_products_to_neighbor_cluster || false,
        cluster_ids: values.cluster_ids?.length > 0 ? values.cluster_ids : undefined,
        offer_ids: values.offer_ids?.length > 0 ? values.offer_ids : undefined,
      }

      const file = fileList[0].originFileObj
      const newSnapshot = await suppliesApi.createSnapshot(parseInt(connectionId), config, file)
      message.success('Новый шаблон поставки создан')
      setModalVisible(false)
      setFileList([])
      form.resetFields()
      navigate(`/connections/${connectionId}/supply-templates/${newSnapshot.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка создания шаблона')
    } finally {
      setCreating(false)
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
      case 'supply_plan':
        return 'По плану поставок'
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
              setFileList([])
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
                    По средним продажам (текущая)
                  </Option>
                  <Option value="supply_plan">
                    По плану поставок
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('supply_calculation_strategy') === 'supply_plan' && (
                    <div style={{ 
                      background: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      marginBottom: '16px' 
                    }}>
                      <Text type="secondary">
                        В стратегии «План поставок» остатки товаров на складе поставщика рассматриваются 
                        как план поставок. Товары распределяются по выбранным кластерам с учётом их приоритета 
                        и ограничений складов.
                      </Text>
                    </div>
                  )
                }
              </Form.Item>

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
                      <Option key={cluster.cluster_id} value={cluster.cluster_id}>
                        {cluster.name} (приоритет: {cluster.priority})
                      </Option>
                    ))}
                </Select>
              </Form.Item>

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

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.supply_calculation_strategy !== currentValues.supply_calculation_strategy
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('supply_calculation_strategy') === 'supply_plan' && (
                    <Form.Item
                      name="supply_products_to_neighbor_cluster"
                      valuePropName="checked"
                    >
                      <Checkbox>
                        Поставить товар в соседний кластер (если есть ограничения)
                      </Checkbox>
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Divider />

              <div style={{ marginBottom: '16px' }}>
                <Typography.Paragraph>
                  Для формирования новой поставки необходимо загрузить файл XLS с ограничениями складов в кластерах.
                  Перейдите в раздел <a href="https://seller.ozon.ru/app/analytics/goods-availability/index" target="_blank" rel="noreferrer">Планирование поставок</a> в личном кабинете Ozon, выберите все кластера, скачайте XLS файл и прикрепите файл.
                </Typography.Paragraph>
                <Upload
                  accept=".xlsx"
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                >
                  <Button icon={<UploadOutlined />}>Загрузить ограничения складов</Button>
                </Upload>
              </div>
            </Form>
          </Modal>

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
