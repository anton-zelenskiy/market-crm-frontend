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
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import {
  suppliesApi,
  type SupplySnapshotResponse,
  type SupplyCalculationStrategy,
  type CreateSnapshotConfig,
  type Warehouse,
} from '../api/supplies'
import { ProgressModal } from '../components/ProgressModal'
import SupplyConfigModal, {
  type SupplyConfigFormValues,
} from '../components/SupplyConfigModal'
import { connectionsApi, type Connection } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'
import { ozonClustersApi, type OzonCluster } from '../api/clusters'
import { ozonProductsApi, type OzonProduct } from '../api/products'

const { Title } = Typography

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
    setWarehouses([])
  }

  const handleCreate = async (values: SupplyConfigFormValues) => {
    if (!connectionId) return

    const warehouseId = values.drop_off_warehouse_id
    const selectedWarehouse = warehouses.find(
      (w) => w.warehouse_id === warehouseId
    )
    if (!selectedWarehouse || warehouseId == null) {
      message.error('Необходимо выбрать склад отгрузки')
      return
    }

    setCreating(true)
    try {
      const config: CreateSnapshotConfig = {
        drop_off_warehouse: {
          warehouse_id: selectedWarehouse.warehouse_id,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
        supply_calculation_strategy:
          values.supply_calculation_strategy as SupplyCalculationStrategy,
        supply_products_to_neighbor_cluster:
          values.supply_products_to_neighbor_cluster ?? false,
        fetch_availability: values.fetch_availability ?? true,
        cluster_ids:
          (values.cluster_ids?.length ?? 0) > 0
            ? values.cluster_ids
            : undefined,
        offer_ids:
          (values.offer_ids?.length ?? 0) > 0
            ? values.offer_ids
            : undefined,
      }

      const newSnapshot = await suppliesApi.createSnapshot(
        parseInt(connectionId),
        config
      )
      setModalVisible(false)

      setCurrentSnapshotId(newSnapshot.snapshot_id)
      setCurrentTaskId(newSnapshot.task_id)
      setProgressModalVisible(true)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания шаблона'
      )
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
      case 'dynamic_percentages':
        return 'Динамические проценты'
      case 'average_sales_with_localization':
        return 'По средним продажам с локализацией'
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

          <SupplyConfigModal
            visible={modalVisible}
            title="Сформировать новую поставку"
            okText="Создать"
            cancelText="Отмена"
            confirmLoading={creating}
            onOk={handleCreate}
            onCancel={() => setModalVisible(false)}
            mode="create"
            initialValues={{
              supply_calculation_strategy: 'average_sales',
              supply_products_to_neighbor_cluster: false,
              fetch_availability: false,
              cluster_ids: [],
              offer_ids: [],
            }}
            clusters={clusters}
            products={products}
            warehouses={warehouses}
            loadingClusters={loadingClusters}
            loadingProducts={loadingProducts}
            warehouseLoading={warehouseLoading}
            onWarehouseSearch={handleWarehouseSearch}
          />

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
