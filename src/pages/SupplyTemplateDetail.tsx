import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  message,
  Modal,
  Form,
  Select,
  Tag,
  Table,
  Spin,
  Alert,
  Divider,
  Tooltip,
  Input,
  Checkbox,
  Popover,
} from 'antd'
import {
  ArrowLeftOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  SearchOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community'
import type { ColDef, ColGroupDef, CellValueChangedEvent } from 'ag-grid-community'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])
import { debounce } from 'throttle-debounce'
import {
  suppliesApi,
  type SupplySnapshotResponse,
  type SupplyDataItem,
  type Warehouse,
  type CreateCrossdockDraftRequest,
  type SupplyDraft,
  type BundleItem,
  // @ts-expect-error
  type SelectedClusterWarehouse,
  type RefreshSnapshotConfig,
  saveSupplySnapshot,
  type ClusterData,
} from '../api/supplies'
import { connectionsApi } from '../api/connections'
import { connectionSettingsApi } from '../api/connectionSettings'
import { companiesApi, type Company } from '../api/companies'
import { ozonClustersApi, type OzonCluster } from '../api/clusters'
import { ozonProductsApi, type OzonProduct } from '../api/products'
import { ProgressModal } from '../components/ProgressModal'
import SupplyConfigModal, {
  type SupplyConfigFormValues,
} from '../components/SupplyConfigModal'

const { Title, Text } = Typography
const { Option } = Select

const VENDOR_STOCKS_COLUMN_LABEL = 'Остатки на заводе'

// Map warehouse types to human-readable Russian text
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

// Memoized table component to prevent re-renders when warehouse state changes
const MemoizedTable = memo(({ columnDefs, rowData, onCellValueChanged }: {
  columnDefs: (ColDef | ColGroupDef)[]
  rowData: any[]
  onCellValueChanged: (event: CellValueChangedEvent) => void
}) => {
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <AgGridReact
        theme={themeAlpine}
        columnDefs={columnDefs}
        rowData={rowData}
        getRowId={(params) => params.data.offer_id}
        defaultColDef={{
          resizable: true,
          sortable: true,
          wrapHeaderText: true,
          autoHeaderHeight: true,
        }}
        cellSelection={false}
        suppressColumnMoveAnimation={false}
        onCellValueChanged={onCellValueChanged}
        animateRows={true}
        rowSelection={{ mode: 'multiRow' }}
      />
    </div>
  )
})

MemoizedTable.displayName = 'MemoizedTable'

// Header group component for cluster columns with "Create Draft" button
// For column groups, AG Grid uses headerGroupComponent instead of headerComponent
// The component receives params with: columnGroup, displayName, setExpanded, setTooltip, showColumnMenu
// Custom params are passed via headerGroupComponentParams and merged into params
const ClusterHeaderComponent = (params: any) => {
  // Get cluster name from displayName (which respects headerValueGetter)
  const clusterName = params.displayName || params.columnGroup?.getColGroupDef()?.headerName
  
  // Get custom params (clusterName, isNeighborCluster, and onCreateDraft) from headerGroupComponentParams
  // These are merged into the params object directly
  const isNeighborCluster = params.isNeighborCluster || params.columnGroup?.getColGroupDef()?.headerGroupComponentParams?.isNeighborCluster
  const onCreateDraft = params.onCreateDraft || params.columnGroup?.getColGroupDef()?.headerGroupComponentParams?.onCreateDraft
  
  if (!clusterName) {
    return <span>{params.displayName || 'Unknown'}</span>
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', height: '100%', padding: '4px', width: '100%' }}>
      <span>{clusterName}</span>
      {isNeighborCluster && (
        <Tooltip title="Соседний кластер">
          <span style={{ fontSize: '16px', color: '#1890ff', cursor: 'help' }}>🔗</span>
        </Tooltip>
      )}
      {onCreateDraft && (
        <Button
          size="small"
          type="primary"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onCreateDraft(clusterName)
          }}
        >
          Создать черновик
        </Button>
      )}
    </div>
  )
}


const SupplyTemplateDetail: React.FC = () => {
  const { connectionId, snapshotId } = useParams<{ connectionId: string, snapshotId: string }>()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<any>(null)
  const [snapshot, setSnapshot] = useState<SupplySnapshotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [drafts, setDrafts] = useState<SupplyDraft[]>([])
  const [warehouseModalVisible, setWarehouseModalVisible] = useState(false)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [downloadingBundle, setDownloadingBundle] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [form] = Form.useForm()
  const [tableData, setTableData] = useState<SupplyDataItem[]>([])
  const [clusterFilter, setClusterFilter] = useState('')
  const [visibleBaseColumns, setVisibleBaseColumns] = useState<string[]>([
    'offer_id',
    'name',
    'box_count',
    'vendor_stocks_count',
  ])
  const [visibleSubColumns, setVisibleSubColumns] = useState<string[]>([
    'marketplace_stocks_count',
    'avg_orders_count',
    'available_quantity',
    'to_supply'
  ])
  const searchTimeoutRef = useRef<number | null>(null)

  const logisticsDistance = settings?.logistics_distance
  const avgOrdersLabel = `Ср. кол-во заказов (1д)`

  // Settings modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false)
  const [clusters, setClusters] = useState<OzonCluster[]>([])
  const [products, setProducts] = useState<OzonProduct[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const vendorStocksLabel = VENDOR_STOCKS_COLUMN_LABEL

  const columnSettingsContent = (
    <div style={{ padding: '8px', minWidth: '250px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Text strong>Базовые столбцы</Text>
        <div style={{ marginTop: '8px' }}>
          <Checkbox.Group
            options={[
              { label: 'Артикул', value: 'offer_id' },
              { label: 'Наименование', value: 'name' },
              { label: 'Кратность', value: 'box_count' },
              { label: vendorStocksLabel, value: 'vendor_stocks_count' },
            ]}
            value={visibleBaseColumns}
            onChange={(values) => setVisibleBaseColumns(values as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          />
        </div>
      </div>
      <div>
        <Text strong>Данные кластеров</Text>
        <div style={{ marginTop: '8px' }}>
          <Checkbox.Group
            options={[
              { label: 'Остатки на маркетплейсе', value: 'marketplace_stocks_count' },
              { label: avgOrdersLabel, value: 'avg_orders_count' },
              { label: 'Доступное кол-во', value: 'available_quantity' },
              { label: 'К поставке', value: 'to_supply' },
            ]}
            value={visibleSubColumns}
            onChange={(values) => setVisibleSubColumns(values as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          />
        </div>
      </div>
    </div>
  )

  const previewItems = useMemo(() => {
    if (!selectedCluster || !tableData.length) return []

    const items: BundleItem[] = []

    for (const item of tableData) {
      const cluster = item.clusters?.find(c => c.cluster_name === selectedCluster)
      if (!cluster || cluster.to_supply <= 0) continue

      const toSupply = cluster.to_supply
      const boxCount = item.box_count || 0
      
      if (boxCount <= 0 && toSupply > 0) {
        continue
      }

      if (toSupply > 0) {
        items.push({
          offer_id: item.offer_id,
          sku: typeof item.sku === 'string' ? parseInt(item.sku, 10) : item.sku,
          quantity: toSupply,
        })
      }
    }
    return items
  }, [selectedCluster, tableData])

  const [isDirty, setIsDirty] = useState(false)

  const handleSaveSnapshot = useCallback(async () => {
    if (!snapshotId || !tableData.length || saving) {
      if (saving) setIsDirty(true)
      return
    }

    setIsDirty(false)
    setSaving(true)
    try {
      console.log('Saving snapshot...', snapshotId, tableData.length)
      const savedSnapshot = await saveSupplySnapshot(
        parseInt(snapshotId),
        tableData
      )
      setSnapshot(savedSnapshot)
      console.log('Изменения сохранены')
      message.success('OK')
    } catch (error: any) {
      console.error('Save failed:', error)
      message.error(
        error.response?.data?.detail || 'Ошибка сохранения изменений'
      )
    } finally {
      setSaving(false)
    }
  }, [snapshotId, tableData, saving])

  // Use a ref to always call the latest version of handleSaveSnapshot
  // This ensures that debouncedSave uses the most up-to-date tableData
  const saveRef = useRef(handleSaveSnapshot)
  useEffect(() => {
    saveRef.current = handleSaveSnapshot
  }, [handleSaveSnapshot])

  const debouncedSave = useMemo(
    () => debounce(700, () => {
      saveRef.current()
    }),
    []
  )

  // Re-run save if changes were made while a save was in progress
  useEffect(() => {
    if (!saving && isDirty) {
      debouncedSave()
    }
  }, [saving, isDirty, debouncedSave])

  useEffect(() => {
    if (connectionId && snapshotId) {
      loadConnectionData()
      loadSnapshot()
      loadDrafts()
    }
  }, [connectionId, snapshotId])

  // Update timer every second

  const loadConnectionData = async () => {
    if (!connectionId) return

    try {
      const [connectionData, settingsData] = await Promise.all([
        connectionsApi.getById(parseInt(connectionId)),
        connectionSettingsApi.getByConnectionId(parseInt(connectionId)),
      ])
      
      setSettings(settingsData)

      if (connectionData.company_id) {
        const companyData = await companiesApi.getById(connectionData.company_id)
        setCompany(companyData)
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки данных подключения'
      )
    }
  }

  const loadSnapshot = async () => {
    if (!snapshotId) return

    setLoading(true)
    try {
      const snapshotData = await suppliesApi.getSnapshot(
        parseInt(snapshotId)
      )
      setSnapshot(snapshotData)
      if (snapshotData) {
        setTableData(snapshotData.data)
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки данных шаблона'
      )
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = async () => {
    if (!snapshotId) return

    try {
      const draftsData = await suppliesApi.getSnapshotDrafts(
        parseInt(snapshotId)
      )
      setDrafts(draftsData.drafts)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки черновиков'
      )
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

  const handleOpenSettingsModal = () => {
    setSettingsModalVisible(true)
    loadClustersAndProducts()

    if (snapshot?.drop_off_warehouse) {
      setWarehouses([
        {
          warehouse_id: snapshot.drop_off_warehouse.warehouse_id,
          name: snapshot.drop_off_warehouse.name,
          address: snapshot.drop_off_warehouse.address || undefined,
        },
      ])
    }
  }

  const handleSaveSettings = async (values: SupplyConfigFormValues) => {
    if (!snapshotId) return

    const warehouseId = values.drop_off_warehouse_id
    const selectedWarehouse = warehouses.find(
      (w) => w.warehouse_id === warehouseId
    )
    if (!selectedWarehouse) {
      message.error('Необходимо выбрать склад отгрузки')
      return
    }

    setSavingSettings(true)
    try {
      const config: RefreshSnapshotConfig = {
        supply_products_to_neighbor_cluster:
          values.supply_products_to_neighbor_cluster ?? false,
        fetch_availability: values.fetch_availability ?? true,
        cluster_ids:
          (values.cluster_ids?.length ?? 0) > 0 ? values.cluster_ids : null,
        offer_ids:
          (values.offer_ids?.length ?? 0) > 0 ? values.offer_ids : null,
        drop_off_warehouse: {
          warehouse_id: selectedWarehouse.warehouse_id,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
      }

      const response = await suppliesApi.refreshSnapshot(
        parseInt(snapshotId, 10),
        config
      )

      setProgressTaskId(response.task_id)
      setProgressModalVisible(true)
      setSettingsModalVisible(false)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка сохранения настроек'
      )
    } finally {
      setSavingSettings(false)
    }
  }

  const handleProgressComplete = async () => {
    setProgressModalVisible(false)
    setProgressTaskId(null)
    // Reload snapshot data
    await loadSnapshot()
    message.success('Настройки сохранены и данные обновлены')
  }



  const handleDownloadFullXlsx = async () => {
    if (!snapshotId) return

    setDownloadLoading(true)
    try {
      const blob = await suppliesApi.downloadFullSnapshotXlsx(parseInt(snapshotId))
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Поставки_${company?.name}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Полные данные выгружены')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка при выгрузке данных'
      )
    } finally {
      setDownloadLoading(false)
    }
  }

  const handleDeleteDraft = async (draftId: number) => {
    Modal.confirm({
      title: 'Вы уверены, что хотите удалить этот черновик?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await suppliesApi.deleteSupplyDraft(draftId)
          message.success('Черновик удален')
          loadDrafts()
        } catch (error: any) {
          message.error(
            error.response?.data?.detail || 'Ошибка при удалении черновика'
          )
        }
      },
    })
  }

  const handleCreateDraft = useCallback((clusterName: string) => {
    setSelectedCluster(clusterName)
    setWarehouseModalVisible(true)
    // Clear warehouses when opening modal
    setWarehouses([])
    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Auto-fill warehouse from snapshot if available
    if (snapshot?.drop_off_warehouse) {
      const dropOffWarehouse = snapshot.drop_off_warehouse
      form.setFieldsValue({
        warehouse_id: dropOffWarehouse.warehouse_id,
      })
      // Add the warehouse to the list so it can be selected
      setWarehouses([{
        warehouse_id: dropOffWarehouse.warehouse_id,
        name: dropOffWarehouse.name,
        address: dropOffWarehouse.address || undefined,
      }])
    } else {
      form.resetFields()
    }
  }, [snapshot, form])

  const loadWarehouses = useCallback(async (search: string) => {
    if (!connectionId) return

    setWarehouseLoading(true)
    try {
      const warehousesData = await suppliesApi.getWarehouses(
        parseInt(connectionId),
        search
      )
      setWarehouses(warehousesData.slice(0, 30))
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки складов'
      )
      setWarehouses([])
    } finally {
      setWarehouseLoading(false)
    }
  }, [connectionId])

  const handleWarehouseSearch = useCallback((value: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const trimmedValue = value.trim()

    // Only search if 4+ characters, otherwise clear results
    if (trimmedValue.length >= 4) {
      searchTimeoutRef.current = window.setTimeout(() => {
        loadWarehouses(trimmedValue)
      }, 400)
    } else {
      setWarehouses([])
      setWarehouseLoading(false)
    }
  }, [loadWarehouses])

  const handleSubmitDraft = async () => {
    setCreatingDraft(true)
    if (!connectionId || !selectedCluster) return

    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      const warehouseId = values.warehouse_id
      const selectedWarehouse = warehouses.find((w) => w.warehouse_id === warehouseId)

      if (!selectedWarehouse) {
        message.error('Склад не найден')
        return
      }

      if (previewItems.length === 0) {
        message.warning('Не выбрано ни одного товара для поставки с учетом ограничений')
        return
      }

      const request: CreateCrossdockDraftRequest = {
        connection_id: parseInt(connectionId),
        supply_data_snapshot_id: parseInt(snapshotId!),
        drop_off_warehouse: {
          warehouse_id: warehouseId,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
        cluster_name: selectedCluster,
        items: previewItems,
        deletion_sku_mode: 'PARTIAL',
      }

      const response = await suppliesApi.createCrossdockDraft(request)
      if (response.id) {
        message.success('Черновик поставки создан')
        window.open(`/connections/${connectionId}/supply-templates/${snapshotId}/drafts/${response.id}`, '_blank', 'noopener,noreferrer')
      } else {
        message.error('Не удалось создать черновик поставки')
      }
      setWarehouseModalVisible(false)
      form.resetFields()
      setSelectedCluster(null)
      loadDrafts()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return
      }
      message.error(
        error.response?.data?.detail || 'Ошибка создания черновика'
      )
    }
    finally {
      setCreatingDraft(false)
    }
  }

  const handleDownloadBundleXlsx = async () => {
    if (!selectedCluster || previewItems.length === 0) {
      message.warning('Нет товаров для скачивания')
      return
    }

    setDownloadingBundle(true)
    try {
      const items = previewItems.map(item => ({
        offer_id: item.offer_id,
        quantity: item.quantity,
      }))
      const blob = await suppliesApi.downloadBundleXlsx(items, selectedCluster)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Состав ${selectedCluster}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('Файл скачан')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка скачивания файла'
      )
    } finally {
      setDownloadingBundle(false)
    }
  }

  const handleCellChange = useCallback((
    rowId: string,
    accessor: string,
    newValue: any
  ) => {
    setTableData((prevData) => {
      return prevData.map((item) => {
        if (item.offer_id === rowId) {
          const updated = { ...item }
          const clusters = item.clusters || []

          // Find matching cluster by checking if accessor starts with cluster name + underscore
          let matchedCluster: ClusterData | null = null
          let fieldName: string | null = null

          for (const cluster of clusters) {
            const clusterName = cluster.cluster_name
            if (accessor.startsWith(clusterName + '_')) {
              matchedCluster = cluster
              fieldName = accessor.substring(clusterName.length + 1) // Remove "clusterName_" prefix
              break
            }
          }

          if (matchedCluster && fieldName) {
            // Update the clusters array
            updated.clusters = clusters.map(cluster => {
              if (cluster.cluster_name === matchedCluster!.cluster_name) {
                return {
                  ...cluster,
                  [fieldName!]: Number(newValue) || 0,
                }
              }
              return cluster
            })

            if (fieldName === 'to_supply' && updated.totals) {
              const newToSupplyTotal = updated.clusters.reduce((sum, cluster) => {
                return sum + (cluster.to_supply || 0)
              }, 0)
              updated.totals = {
                ...updated.totals,
                to_supply: newToSupplyTotal,
              }
            }
          }
          return updated
        }
        return item
      })
    })
  }, [])

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'CALCULATION_STATUS_SUCCESS':
        return 'green'
      case 'CALCULATION_STATUS_FAILED':
        return 'red'
      case 'CALCULATION_STATUS_IN_PROGRESS':
        return 'blue'
      case 'CALCULATION_STATUS_EXPIRED':
        return 'orange'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'CALCULATION_STATUS_SUCCESS':
        return 'Успешно'
      case 'CALCULATION_STATUS_FAILED':
        return 'Ошибка'
      case 'CALCULATION_STATUS_IN_PROGRESS':
        return 'В процессе'
      case 'CALCULATION_STATUS_EXPIRED':
        return 'Истек'
      default:
        return status || 'Неизвестно'
    }
  }

  // Handle cell editing for to_supply columns (AG Grid format)
  const handleCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    // Only handle to_supply columns (format: clusterName_to_supply)
    const field = event.colDef?.field
    if (!field || !field.endsWith('_to_supply')) {
      return
    }

    const numValue = Number(event.newValue) || 0
    if (event.data?.offer_id) {
      handleCellChange(event.data.offer_id, field, numValue)
      debouncedSave()
    }
  }, [handleCellChange, debouncedSave])

  const copyTextToClipboard = useCallback(async (text: string) => {
    const value = String(text ?? '').trim()
    if (!value) return

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value)
        message.success('Артикул скопирован')
        return
      }

      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '0'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (!ok) throw new Error('copy failed')
      message.success('Артикул скопирован')
    } catch {
      message.error('Не удалось скопировать')
    }
  }, [])


  // Build table column definitions dynamically based on clusters
  const columnDefs = useMemo(() => {
    if (!snapshot || snapshot.data.length === 0) return []

    const baseHeaders: (ColDef | ColGroupDef)[] = [
      {
        field: 'offer_id',
        headerName: 'Артикул',
        width: 180,
        pinned: 'left' as const,
        cellRenderer: (params: any) => {
          const value = params.value
          return (
            <Tooltip title="Нажмите, чтобы скопировать">
              <div
                onClick={(e) => {
                  e?.stopPropagation?.()
                  copyTextToClipboard(String(value ?? ''))
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'text',
                }}
              >
                {value}
              </div>
            </Tooltip>
          )
        },
      },
      {
        field: 'name',
        headerName: 'Наименование',
        width: 200,
        pinned: 'left' as const,
      },
      {
        field: 'box_count',
        headerName: 'Кратность',
        width: 100,
        pinned: 'left' as const,
        cellRenderer: (params: any) => {
          const value = params.value;
          const isInvalid = !value || value === 0;

          const defaultBgColor = '!inherit'
          const defaultColor = '!inherit'
          const defaultFontWeight = 'normal'
          const invalidBgColor = '#fff1f0'
          const invalidColor = '#cf1322'
          const invalidFontWeight = 'bold'

          let backgroundColor = defaultBgColor
          let color = defaultColor
          let fontWeight = defaultFontWeight
          
          if (isInvalid) {
            backgroundColor = invalidBgColor
            color = invalidColor
            fontWeight = invalidFontWeight
          }

          const content = (
            <div style={{ 
              backgroundColor,
              color,
              fontWeight,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
            }}>
              {value || 0}
            </div>
          )

          if (isInvalid) {
            return <Tooltip title="Не задана кратность">{content}</Tooltip>
          }
          return content
        }
      },
      {
        field: 'vendor_stocks_count',
        headerName: VENDOR_STOCKS_COLUMN_LABEL,
        width: 120,
        type: 'numericColumn',
        pinned: 'left' as const,
      },
    ].filter(h => 'field' in h && visibleBaseColumns.includes(h.field as string))

    // Get all unique cluster names from all items' clusters arrays
    // This ensures neighbor clusters that only appear in some items are included
    const allClusterNamesMap = new Map<string, { isNeighbor: boolean }>()
    snapshot.data.forEach((item) => {
      item.clusters.forEach((cluster) => {
        if (cluster.cluster_name) {
          if (!allClusterNamesMap.has(cluster.cluster_name)) {
            allClusterNamesMap.set(cluster.cluster_name, {
              isNeighbor: cluster.is_neighbor_cluster ?? false
            })
          }
        }
      })
    })

    // Filter out neighbor clusters if supply_products_to_neighbor_cluster is false
    // and the sum of to_supply for that cluster is 0
    const shouldShowCluster = (clusterName: string) => {
      const clusterInfo = allClusterNamesMap.get(clusterName)
      if (!clusterInfo?.isNeighbor) return true
      
      // If neighbor cluster and supply_products_to_neighbor_cluster is false
      if (snapshot.supply_products_to_neighbor_cluster === false) {
        // Calculate sum of to_supply for this cluster across all products
        const totalToSupply = snapshot.data.reduce((sum, item) => {
          const cluster = item.clusters.find(c => c.cluster_name === clusterName)
          return sum + (cluster?.to_supply ?? 0)
        }, 0)
        
        // Don't show if sum is 0
        if (totalToSupply === 0) return false
      }
      
      return true
    }

    let clusterNames = Array.from(allClusterNamesMap.keys()).filter(shouldShowCluster)

    // Filter clusters by name if search input is not empty
    if (clusterFilter) {
      clusterNames = clusterNames.filter(name => 
        name.toLowerCase().includes(clusterFilter.toLowerCase())
      )
    }

    // Add cluster columns with nested headers
    clusterNames.forEach((clusterName) => {
      const clusterInfo = allClusterNamesMap.get(clusterName)
      const isNeighborCluster = clusterInfo?.isNeighbor ?? false
      const children: ColDef[] = []
      
      if (visibleSubColumns.includes('marketplace_stocks_count')) {
        children.push({
          field: `${clusterName}_marketplace_stocks_count`,
          headerName: 'Остатки ozon',
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => {
            const cluster = params.data?.clusters?.find((c: ClusterData) => c.cluster_name === clusterName)
            return cluster?.marketplace_stocks_count ?? 0
          },
          valueFormatter: (params) => {
            const value = params.value !== undefined && params.value !== null ? params.value : 0
            return String(value)
          },
        })
      }

      if (visibleSubColumns.includes('avg_orders_count')) {
        children.push({
          field: `${clusterName}_avg_orders_count`,
          headerName: avgOrdersLabel,
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => {
            const cluster = params.data?.clusters?.find((c: ClusterData) => c.cluster_name === clusterName)
            return cluster?.avg_orders_count ?? 0
          },
          valueFormatter: (params) => {
            const value = params.value !== undefined && params.value !== null ? params.value : 0
            return String(value)
          },
        })
      }
      if (visibleSubColumns.includes('available_quantity')) {
        children.push({
          field: `${clusterName}_available_quantity`,
          headerName: 'Доступное кол-во',
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => {
            const cluster = params.data?.clusters?.find((c: ClusterData) => c.cluster_name === clusterName)
            return cluster?.available_quantity ?? null
          },
          valueFormatter: (params) => {
            const value = params.value
            return value !== undefined && value !== null ? String(value) : 'Без ограничений'
          },
        })
      }


      if (visibleSubColumns.includes('to_supply')) {
        children.push({
          field: `${clusterName}_to_supply`,
          headerName: 'К поставке',
          width: 90,
          type: 'numericColumn',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 0,
          },
          valueGetter: (params) => {
            const cluster = params.data?.clusters?.find((c: ClusterData) => c.cluster_name === clusterName)
            return cluster?.to_supply ?? 0
          },
          valueFormatter: (params) => {
            const value = params.value !== undefined && params.value !== null ? params.value : 0
            return String(value)
          },
          cellRenderer: (params: any) => {
            const boxCount = params.data?.box_count || 0
            const cluster = params.data?.clusters?.find((c: ClusterData) => c.cluster_name === clusterName)
            const actualValue = params.value !== undefined && params.value !== null
              ? params.value
              : (cluster?.to_supply ?? 0)
            const numValue = Number(actualValue) || 0
            
            // Check box count validity
            let isBoxCountValid = true
            let boxCountError = ''
            
            if (boxCount <= 0) {
              isBoxCountValid = false
              boxCountError = 'Не задана кратность'
            } else if (numValue > 0 && numValue % boxCount !== 0) {
              isBoxCountValid = false
              boxCountError = `Количество не кратно количеству в коробке (${boxCount})`
            }

            let tooltipContent: string | null = null
            
            // Default background color for cells with value 0 (soft green)
            const defaultBgColor = '#f0f9f4'
            // Slightly darker green for valid cells with non-zero values
            const validNonZeroBgColor = '#d4edda'
            // Warning color for box count errors (orange)
            const boxCountWarningColor = '#fff7e6'
            
            // Determine background color based on value and validity
            let backgroundColor = defaultBgColor

            if (!isBoxCountValid) {
              backgroundColor = boxCountWarningColor
            } else if (numValue > 0) {
              backgroundColor = validNonZeroBgColor
            }

            const content = (
              <div style={{ 
                backgroundColor,
                padding: '4px',
                borderRadius: '2px',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '32px'
              }}>
                {numValue}
              </div>
            )

            if (tooltipContent || boxCountError) {
              return (
                <Tooltip title={tooltipContent || boxCountError}>
                  {content}
                </Tooltip>
              )
            }
            
            return content
          },
        })
      }

      if (children.length > 0) {
        baseHeaders.push({
          headerName: clusterName,
          headerGroupComponent: ClusterHeaderComponent,
          headerGroupComponentParams: {
            clusterName,
            isNeighborCluster,
            onCreateDraft: handleCreateDraft,
          },
          children,
        } as ColGroupDef)
      }
    })

    // Add Totals column group only if cluster filter is not applied
    if (!clusterFilter) {
      const children: ColDef[] = []
      
      if (visibleSubColumns.includes('marketplace_stocks_count')) {
        children.push({
          field: 'totals_marketplace_stocks_count',
          headerName: 'Остатки ozon',
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.marketplace_stocks_count ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
        })
      }

      if (visibleSubColumns.includes('avg_orders_count')) {
        children.push({
          field: 'totals_avg_orders_count',
          headerName: 'Сред. кол-во заказов',
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.avg_orders_count ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
        })
      }

      if (visibleSubColumns.includes('to_supply')) {
        children.push({
          field: 'totals_to_supply',
          headerName: 'К поставке',
          width: 90,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.to_supply ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
          cellStyle: { fontWeight: 'bold' }
        })
      }

      if (children.length > 0) {
        baseHeaders.push({
          headerName: 'Итого',
          children
        } as ColGroupDef)
      }
    }

    return baseHeaders
  }, [snapshot, handleCreateDraft, clusterFilter, visibleBaseColumns, visibleSubColumns, copyTextToClipboard])

  // Transform data for AG Grid - keep nested structure with clusters array
  const tableRows = useMemo(() => {
    if (!tableData || tableData.length === 0) return []

    // Return data as-is, AG Grid valueGetter functions now work with clusters array
    return tableData
  }, [tableData])

  if (loading && !snapshot) {
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
                  if (connectionId) {
                    navigate(`/connections/${connectionId}/supply-templates`)
                  } else {
                    navigate('/connections')
                  }
                }}
              >
                Назад
              </Button>
            </Space>
            <Space>
              {snapshot && (
                <Text type="secondary">
                  Обновлено: {new Date(snapshot.updated_at).toLocaleString('ru-RU')}
                </Text>
              )}
              
              <Button
                icon={<EditOutlined />}
                onClick={handleOpenSettingsModal}
              >
                Редактировать
              </Button>
            </Space>
          </div>

          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              Формирование поставки - {company?.name || ''}
            </Title>
          </Space>

          <Space>
            <Input
              placeholder="Введите имя кластера..."
              allowClear
              prefix={<SearchOutlined />}
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              style={{ maxWidth: 400 }}
            />
            <Popover
              content={columnSettingsContent}
              title="Настройка столбцов"
              trigger="click"
              placement="bottomRight"
            >
              <Button
                icon={<SettingOutlined />}
              >
                Настроить столбцы
              </Button>
            </Popover>
            <Button
              icon={<FileExcelOutlined />}
              loading={downloadLoading}
              onClick={handleDownloadFullXlsx}
            >
              Скачать таблицу (XLSX)
            </Button>
            <Space><Text type="warning">Логистическое плечо: {logisticsDistance} дней</Text></Space>
          </Space>

          {!snapshot ? (
            <Alert
              title="Нет данных"
              description="Нажмите 'Редактировать' для настройки и загрузки данных"
              type="info"
              showIcon
              action={
                <Button
                  size="small"
                  type="primary"
                  onClick={handleOpenSettingsModal}
                >
                  Редактировать
                </Button>
              }
            />
          ) : (
            <>
              <MemoizedTable
                columnDefs={columnDefs}
                rowData={tableRows}
                onCellValueChanged={handleCellValueChanged}
              />

              {/* Drafts list */}
              <Divider>Черновики поставок</Divider>
              <Table
                dataSource={drafts}
                rowKey="id"
                onRow={(record: SupplyDraft) => ({
                  onClick: () => {
                    const path = `/connections/${connectionId}/supply-templates/${snapshotId}/drafts/${record.id}`
                    window.open(path, '_blank', 'noopener,noreferrer')
                  },
                  style: { cursor: 'pointer' },
                })}
                columns={[
                  {
                    title: 'Склад отгрузки',
                    key: 'drop_off_warehouse',
                    render: (_: any, record: SupplyDraft) => {
                      return record.drop_off_warehouse?.name || '-'
                    },
                  },
                  {
                    title: 'Кластер размещения',
                    key: 'cluster',
                    render: (_: any, record: SupplyDraft) => {
                      return record.cluster?.cluster_name || '-'
                    },
                  },
                  {
                    title: 'Статус',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string | null) => (
                      <Tag color={getStatusColor(status)}>
                        {getStatusText(status)}
                      </Tag>
                    ),
                  },
                  {
                    title: 'ID Заявки',
                    key: 'order_id',
                    render: (_: any, record: SupplyDraft) => {
                      const orderId = record.supply_create_info?.order_id
                      return orderId ? (
                        <Tag color="green">{orderId}</Tag>
                      ) : (
                        <Text type="secondary">-</Text>
                      )
                    },
                  },
                  {
                    title: 'Дата создания',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date: string) => new Date(date).toLocaleString('ru-RU'),
                  },
                  {
                    title: 'Действия',
                    key: 'actions',
                    render: (_: any, record: SupplyDraft) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDraft(record.id)
                        }}
                      />
                    ),
                  },
                ]}
                pagination={{ pageSize: 30 }}
              />
            </>
          )}
        </Space>
      </Card>

      {/* Warehouse selection modal */}
      <Modal
        title={`Создание черновика поставки - ${selectedCluster}`}
        open={warehouseModalVisible}
        onOk={handleSubmitDraft}
        onCancel={() => {
          setWarehouseModalVisible(false)
          form.resetFields()
          setSelectedCluster(null)
        }}
        confirmLoading={creatingDraft}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="warehouse_id"
            label="Склад отгрузки"
            rules={[
              { required: true, message: 'Выберите склад отгрузки' },
            ]}
          >
            <Select
              showSearch
              placeholder="Поиск склада (минимум 4 символа)"
              onSearch={handleWarehouseSearch}
              loading={warehouseLoading}
              filterOption={false}
              notFoundContent={
                warehouseLoading
                  ? 'Загрузка...'
                  : 'Введите минимум 4 символа для поиска'
              }
            >
              {warehouses.map((warehouse) => (
                <Option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{warehouse.name}</div>
                    {warehouse.address && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
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

          {previewItems.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text strong>Товары в поставке ({previewItems.length}):</Text>
                <Button
                  type="default"
                  icon={<FileExcelOutlined />}
                  onClick={handleDownloadBundleXlsx}
                  loading={downloadingBundle}
                  size="small"
                >
                  Скачать XLSX
                </Button>
              </div>
              <Table
                dataSource={previewItems}
                rowKey="offer_id"
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Артикул',
                    dataIndex: 'offer_id',
                    key: 'offer_id',
                    render: (value: any) => (
                      <Tooltip title="Нажмите, чтобы скопировать">
                        <span
                          onClick={() => copyTextToClipboard(String(value ?? ''))}
                          style={{ cursor: 'pointer', userSelect: 'text' }}
                        >
                          {value}
                        </span>
                      </Tooltip>
                    ),
                  },
                  {
                    title: 'Кол-во',
                    dataIndex: 'quantity',
                    key: 'quantity',
                  },
                ]}
              />
            </div>
          )}
          {previewItems.length === 0 && selectedCluster && !warehouseLoading && (
            <Alert
              title="Нет товаров для поставки"
              description="В выбранном кластере нет товаров для поставки."
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Form>
      </Modal>


      {/* Settings modal */}
      <SupplyConfigModal
        visible={settingsModalVisible}
        title="Настройки шаблона поставки"
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={savingSettings}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsModalVisible(false)}
        mode="settings"
        initialValues={
          snapshot
            ? {
                supply_products_to_neighbor_cluster:
                  snapshot.supply_products_to_neighbor_cluster ?? false,
                fetch_availability: true,
                cluster_ids: snapshot.cluster_ids || [],
                offer_ids: snapshot.offer_ids || [],
                drop_off_warehouse_id:
                  snapshot.drop_off_warehouse?.warehouse_id,
              }
            : undefined
        }
        clusters={clusters}
        products={products}
        warehouses={warehouses}
        loadingClusters={loadingClusters}
        loadingProducts={loadingProducts}
        warehouseLoading={warehouseLoading}
        onWarehouseSearch={handleWarehouseSearch}
      />

      {/* Progress modal */}
      {progressTaskId && snapshotId && (
        <ProgressModal
          visible={progressModalVisible}
          snapshotId={parseInt(snapshotId)}
          taskId={progressTaskId}
          onComplete={handleProgressComplete}
          onCancel={() => {
            setProgressModalVisible(false)
            setProgressTaskId(null)
          }}
        />
      )}
    </div>
  )
}

export default SupplyTemplateDetail

