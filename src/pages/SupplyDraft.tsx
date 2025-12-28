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
  Radio,
  Upload,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
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
  type Warehouse,
  type CreateSupplyDraftRequest,
  type SupplyDraft,
  type DraftTimeslotResponse,
  type Timeslot,
  type CreateSupplyFromDraftRequest,
  type SupplyCreateStatusResponse,
  saveSupplySnapshot,
} from '../api/supplies'
import { connectionsApi, type Connection } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title, Text } = Typography
const { Option } = Select

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
  
  // Get custom params (clusterName and onCreateDraft) from headerGroupComponentParams
  // These are merged into the params object directly
  const onCreateDraft = params.onCreateDraft || params.columnGroup?.getColGroupDef()?.headerGroupComponentParams?.onCreateDraft
  
  if (!clusterName) {
    return <span>{params.displayName || 'Unknown'}</span>
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', height: '100%', padding: '4px', width: '100%' }}>
      <span>{clusterName}</span>
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

interface SupplyDataItem {
  offer_id: string
  sku: number
  name: string
  box_count: number
  vendor_stocks_count: number
  [clusterName: string]: any
  totals: {
    marketplace_stocks_count: number
    orders_count: number
    avg_orders_leverage: number
    vendor_stocks_count: number
    to_supply: number
    deficit: number
  }
}

const SupplyDraftPage: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<SupplySnapshotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [_, setConnection] = useState<Connection | null>(null) // connection
  const [drafts, setDrafts] = useState<SupplyDraft[]>([])
  const [warehouseModalVisible, setWarehouseModalVisible] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false)
  const [selectedAvailability, setSelectedAvailability] = useState<{
    clusterName: string
    offerId: string
    availability: Record<string, any>
  } | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [form] = Form.useForm()
  const [tableData, setTableData] = useState<SupplyDataItem[]>([])
  const searchTimeoutRef = useRef<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<Record<number, number>>({})
  const [timeslots, setTimeslots] = useState<Record<number, DraftTimeslotResponse>>({})
  const [loadingTimeslots, setLoadingTimeslots] = useState<Record<number, boolean>>({})
  const [selectedTimeslot, setSelectedTimeslot] = useState<Record<number, Timeslot>>({})
  const [creatingSupply, setCreatingSupply] = useState<Record<number, boolean>>({})
  const [supplyCreateStatus, setSupplyCreateStatus] = useState<Record<number, SupplyCreateStatusResponse>>({})

  const limitationStrategy = Form.useWatch('limitation_strategy', form)

  const previewItems = useMemo(() => {
    if (!selectedCluster || !tableData.length) return []

    const items: Array<{
      offer_id: string
      sku: number
      quantity: number
      original_quantity: number
      limit: any
    }> = []

    for (const item of tableData) {
      const clusterData = item[selectedCluster]
      if (!clusterData || clusterData.to_supply <= 0) continue

      const toSupply = clusterData.to_supply
      const boxCount = item.box_count || 1
      const availability = clusterData.warehouse_availability || {}
      
      const values = Object.values(availability)
      const hasNoLimits = values.some((v) => v === 'NO_LIMITS')
      const hasLimited = values.filter((v) => typeof v === 'number' && v > 0) as number[]
      const allUnavailable = values.length > 0 && values.every((v) => v === 'UNAVAILABLE')

      let finalQuantity = toSupply
      let maxLimit: number | string | null = null

      if (hasNoLimits || values.length === 0) {
        // No restriction or no availability data
      } else if (allUnavailable) {
        finalQuantity = 0
      } else if (hasLimited.length > 0) {
        const numericMaxLimit = Math.max(...hasLimited)
        maxLimit = numericMaxLimit
        if (toSupply > numericMaxLimit) {
          if (limitationStrategy === 'skip') {
            finalQuantity = 0
          // If the limit is less than the box count, set the quantity 0 because we can't ship less than one box
          } else if (numericMaxLimit < boxCount) {
            finalQuantity = 0
          } else {
            finalQuantity = Math.floor(numericMaxLimit / boxCount) * boxCount
          }
        }
      }

      if (finalQuantity > 0) {
        items.push({
          offer_id: item.offer_id,
          sku: item.sku,
          quantity: finalQuantity,
          original_quantity: toSupply,
          limit: maxLimit,
        })
      }
    }
    return items
  }, [selectedCluster, limitationStrategy, tableData])

  // Check if there are any invalid values in tableData
  const hasInvalidValues = useMemo(() => {
    if (!tableData || tableData.length === 0) return false

    for (const item of tableData) {
      const boxCount = item.box_count || 1

      // Check all cluster to_supply values
      const clusterNames = Object.keys(item).filter(
        (key) => !['offer_id', 'sku', 'name', 'box_count', 'vendor_stocks_count', 'totals'].includes(key)
      )

      for (const clusterName of clusterNames) {
        const clusterData = item[clusterName]
        if (clusterData && typeof clusterData === 'object' && clusterData !== null) {
          const toSupply = clusterData.to_supply || 0
          if (toSupply > 0) {
            // 1. Check box count
            if (boxCount > 0 && toSupply % boxCount !== 0) {
              return true
            }

            // 2. Check warehouse availability
            if (clusterData.warehouse_availability) {
              const availability = clusterData.warehouse_availability
              const values = Object.values(availability)
              const hasNoLimits = values.some((v) => v === 'NO_LIMITS')
              const hasLimited = values.filter((v) => typeof v === 'number' && v > 0) as number[]
              const allUnavailable = values.every((v) => v === 'UNAVAILABLE')

              if (allUnavailable && !hasNoLimits) {
                return true
              }
              if (!hasNoLimits && hasLimited.length > 0) {
                const maxLimit = Math.max(...hasLimited)
                if (toSupply > maxLimit) {
                  return true
                }
              }
            }
          }
        }
      }
    }
    return false
  }, [tableData])

  const [isDirty, setIsDirty] = useState(false)

  const handleSaveSnapshot = useCallback(async () => {
    if (!connectionId || !tableData.length || saving) {
      if (saving) setIsDirty(true)
      return
    }

    // Check for invalid values before saving
    if (hasInvalidValues) {
      return
    }

    setIsDirty(false)
    setSaving(true)
    try {
      const savedSnapshot = await saveSupplySnapshot(
        parseInt(connectionId),
        tableData
      )
      setSnapshot(savedSnapshot)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка сохранения изменений'
      )
    } finally {
      setSaving(false)
    }
  }, [connectionId, tableData, hasInvalidValues, saving])

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
    if (connectionId) {
      loadConnectionData()
      loadSnapshot()
      loadDrafts()
    }
  }, [connectionId])

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadConnectionData = async () => {
    if (!connectionId) return

    try {
      const connectionData = await connectionsApi.getById(parseInt(connectionId))
      setConnection(connectionData)

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
    if (!connectionId) return

    setLoading(true)
    try {
      const snapshotData = await suppliesApi.getSupplySnapshot(
        parseInt(connectionId)
      )
      setSnapshot(snapshotData)
      if (snapshotData) {
        setTableData(snapshotData.data)
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки данных снапшота'
      )
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = async () => {
    if (!connectionId) return

    try {
      const draftsData = await suppliesApi.getConnectionDrafts(
        parseInt(connectionId)
      )
      setDrafts(draftsData.drafts)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки черновиков'
      )
    }
  }

  const handleUpdateSnapshot = async () => {
    if (!connectionId) return

    setUpdating(true)
    try {
      const updatedSnapshot = await suppliesApi.updateSupplySnapshot(
        parseInt(connectionId)
      )
      setSnapshot(updatedSnapshot)
      setTableData(updatedSnapshot.data)
      message.success('Данные успешно обновлены')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка обновления данных'
      )
    } finally {
      setUpdating(false)
    }
  }

  const handleUploadAvailability = async (file: File) => {
    if (!connectionId) return

    setUpdating(true)
    try {
      const updatedSnapshot = await suppliesApi.uploadWarehouseAvailability(
        parseInt(connectionId),
        file
      )
      setSnapshot(updatedSnapshot)
      setTableData(updatedSnapshot.data)
      message.success('Ограничения складов успешно загружены')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки ограничений'
      )
    } finally {
      setUpdating(false)
    }
    return false // Prevent default upload behavior
  }

  const handleDownloadDeficit = async () => {
    if (!connectionId) return

    setUpdating(true)
    try {
      const blob = await suppliesApi.downloadDeficitCsv(parseInt(connectionId))
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Дефициты_${company?.name}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Отчет по дефициту скачан')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка при скачивании отчета'
      )
    } finally {
      setUpdating(false)
    }
  }

  const handleDownloadAvailability = async () => {
    if (!connectionId) return

    setUpdating(true)
    try {
      const blob = await suppliesApi.downloadAvailabilityCsv(parseInt(connectionId))
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Ограничения_складов_${company?.name}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Отчет по ограничениям складов скачан')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка при скачивании отчета'
      )
    } finally {
      setUpdating(false)
    }
  }

  const handleDownloadFullXlsx = async () => {
    if (!connectionId) return

    setUpdating(true)
    try {
      const blob = await suppliesApi.downloadFullSnapshotXlsx(parseInt(connectionId))
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
      setUpdating(false)
    }
  }

  const handleCreateDraft = useCallback((clusterName: string) => {
    setSelectedCluster(clusterName)
    setWarehouseModalVisible(true)
    form.setFieldsValue({ limitation_strategy: 'reduce' })
    // Clear warehouses when opening modal
    setWarehouses([])
    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
  }, [])

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

      const request: CreateSupplyDraftRequest = {
        connection_id: parseInt(connectionId),
        // TODO: remove drop_off_warehouse_name, drop_off_warehouse_id
        drop_off_warehouse_id: warehouseId,
        drop_off_warehouse_name: selectedWarehouse.name, // Keep for backward compatibility
        drop_off_warehouse: {
          warehouse_id: warehouseId,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
        cluster_name: selectedCluster,
        items: previewItems.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
        })),
      }

      await suppliesApi.createSupplyDraft(request)
      message.success('Черновик поставки создан')
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
          // Accessor format: clusterName_field (e.g., "cluster1_to_supply")
          // Extract cluster name and field name
          const clusterNames = Object.keys(item).filter(
            (key) => !['offer_id', 'sku', 'name', 'box_count', 'vendor_stocks_count', 'totals'].includes(key)
          )
          
          // Find matching cluster name by checking if accessor starts with cluster name + underscore
          let matchedClusterName: string | null = null
          let fieldName: string | null = null
          
          for (const cn of clusterNames) {
            if (accessor.startsWith(cn + '_')) {
              matchedClusterName = cn
              fieldName = accessor.substring(cn.length + 1) // Remove "clusterName_" prefix
              break
            }
          }
          
          if (matchedClusterName && fieldName && updated[matchedClusterName]) {
            updated[matchedClusterName] = {
              ...updated[matchedClusterName],
              [fieldName]: Number(newValue) || 0,
            }

            // Recalculate totals for to_supply if it was changed
            if (fieldName === 'to_supply' && updated.totals) {
              const clusterNamesList = Object.keys(updated).filter(
                (key) => !['offer_id', 'sku', 'name', 'box_count', 'vendor_stocks_count', 'totals'].includes(key)
              )
              
              const newToSupplyTotal = clusterNamesList.reduce((sum, cn) => {
                return sum + (updated[cn]?.to_supply || 0)
              }, 0)
              
              updated.totals = {
                ...updated.totals,
                to_supply: newToSupplyTotal
              }
            }
          } else {
            // Fallback for non-cluster fields
            updated[accessor] = newValue
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

  const handleLoadTimeslots = async (draft: SupplyDraft) => {
    if (!draft.draft_id) {
      message.error('Черновик не имеет draft_id')
      return
    }

    setLoadingTimeslots((prev) => ({ ...prev, [draft.id]: true }))
    try {
      const today = new Date()
      const dateTo = new Date(today)
      dateTo.setDate(dateTo.getDate() + 28)

      const timeslotResponse = await suppliesApi.getDraftTimeslots(draft.id, {
        date_from: today.toISOString(),
        date_to: dateTo.toISOString(),
      })

      setTimeslots((prev) => ({ ...prev, [draft.id]: timeslotResponse }))
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки таймслотов'
      )
    } finally {
      setLoadingTimeslots((prev) => ({ ...prev, [draft.id]: false }))
    }
  }

  const handleCreateSupply = async (draft: SupplyDraft) => {
    const draftWarehouseId = selectedWarehouseId[draft.id]  // This is supply_warehouse_id
    const draftSelectedTimeslot = selectedTimeslot[draft.id]  // This is just the timeslot

    if (!draftWarehouseId || !draftSelectedTimeslot) {
      message.error('Выберите склад и таймслот')
      return
    }

    setCreatingSupply((prev) => ({ ...prev, [draft.id]: true }))
    try {
      const createRequest: CreateSupplyFromDraftRequest = {
        warehouse_id: draftWarehouseId,  // Supply warehouse ID (where products will be stored)
        timeslot: draftSelectedTimeslot,  // Timeslot for drop-off warehouse
      }

      const createResponse = await suppliesApi.createSupplyFromDraft(
        draft.id,
        createRequest
      )

      // Poll status until completion
      const pollStatus = async () => {
        const maxAttempts = 60
        let attempts = 0

        const poll = async (): Promise<void> => {
          if (attempts >= maxAttempts) {
            message.error('Превышено время ожидания создания поставки')
            setCreatingSupply((prev) => ({ ...prev, [draft.id]: false }))
            return
          }

          try {
            const statusResponse = await suppliesApi.getSupplyCreateStatus(
              draft.id,
              { operation_id: createResponse.operation_id }
            )

            setSupplyCreateStatus((prev) => ({ ...prev, [draft.id]: statusResponse }))

            if (
              statusResponse.status === 'DraftSupplyCreateStatusSuccess' ||
              statusResponse.status === 'DraftSupplyCreateStatusFailed'
            ) {
              setCreatingSupply((prev) => ({ ...prev, [draft.id]: false }))
              if (statusResponse.status === 'DraftSupplyCreateStatusSuccess') {
                message.success('Поставка успешно создана')
                if (statusResponse.result?.order_ids) {
                  message.info(
                    `ID заказов: ${statusResponse.result.order_ids.join(', ')}`
                  )
                }
              } else {
                message.error('Ошибка создания поставки')
                if (statusResponse.error_messages) {
                  message.error(statusResponse.error_messages.join(', '))
                }
              }
              // Reload drafts to get updated data
              loadDrafts()
            } else {
              attempts++
              setTimeout(() => {
                poll()
              }, 5000)
            }
          } catch (error: any) {
            message.error(
              error.response?.data?.detail || 'Ошибка проверки статуса'
            )
            setCreatingSupply((prev) => ({ ...prev, [draft.id]: false }))
          }
        }

        await poll()
      }

      await pollStatus()
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания поставки'
      )
      setCreatingSupply((prev) => ({ ...prev, [draft.id]: false }))
    }
  }

  // Build table column definitions dynamically based on clusters
  const columnDefs = useMemo(() => {
    if (!snapshot || snapshot.data.length === 0) return []

    const baseHeaders: (ColDef | ColGroupDef)[] = [
      {
        field: 'offer_id',
        headerName: 'Артикул',
        width: 180,
        pinned: 'left',
      },
      {
        field: 'name',
        headerName: 'Наименование',
        width: 200,
        pinned: 'left',
      },
      {
        field: 'box_count',
        headerName: 'Кратность',
        width: 100,
        pinned: 'left',
      },
      {
        field: 'vendor_stocks_count',
        headerName: 'Остатки на заводе',
        width: 120,
        type: 'numericColumn',
        pinned: 'left',
      },
    ]

    // Get cluster names from first item (excluding totals and base fields)
    const firstItem = snapshot.data[0]
    const clusterNames = Object.keys(firstItem).filter(
      (key) =>
        !['offer_id', 'sku', 'name', 'box_count', 'vendor_stocks_count', 'totals'].includes(key)
    )

    // Add cluster columns with nested headers
    clusterNames.forEach((clusterName) => {
      baseHeaders.push({
        headerName: clusterName,
        headerGroupComponent: ClusterHeaderComponent,
        headerGroupComponentParams: {
          clusterName,
          onCreateDraft: handleCreateDraft,
        },
        children: [
          {
            field: `${clusterName}_marketplace_stocks_count`,
            headerName: 'Остатки на маркетплейсе',
            width: 150,
            type: 'numericColumn',
            valueGetter: (params) => {
              const clusterData = params.data?.[clusterName]
              if (clusterData && typeof clusterData === 'object') {
                return clusterData.marketplace_stocks_count ?? 0
              }
              return 0
            },
            valueFormatter: (params) => {
              const value = params.value !== undefined && params.value !== null ? params.value : 0
              return String(value)
            },
          },
          {
            field: `${clusterName}_orders_count`,
            headerName: 'Кол-во заказов (мес.)',
            width: 150,
            type: 'numericColumn',
            valueGetter: (params) => {
              const clusterData = params.data?.[clusterName]
              if (clusterData && typeof clusterData === 'object') {
                return clusterData.orders_count ?? 0
              }
              return 0
            },
            valueFormatter: (params) => {
              const value = params.value !== undefined && params.value !== null ? params.value : 0
              return String(value)
            },
          },
          {
            field: `${clusterName}_avg_orders_leverage`,
            headerName: 'Сред. кол-во за 45 дн.',
            width: 150,
            type: 'numericColumn',
            valueGetter: (params) => {
              const clusterData = params.data?.[clusterName]
              if (clusterData && typeof clusterData === 'object') {
                return clusterData.avg_orders_leverage ?? 0
              }
              return 0
            },
            valueFormatter: (params) => {
              const value = params.value !== undefined && params.value !== null ? params.value : 0
              return String(value)
            },
          },
          {
            field: `${clusterName}_warehouse_availability`,
            headerName: 'Максимальный размер поставки',
            width: 180,
            valueGetter: (params) => {
              const clusterData = params.data?.[clusterName]
              if (clusterData && typeof clusterData === 'object') {
                return clusterData.warehouse_availability ?? null
              }
              return null
            },
            onCellClicked: (params) => {
              if (params.value) {
                setSelectedAvailability({
                  clusterName: clusterName,
                  offerId: params.data.offer_id,
                  availability: params.value,
                })
                setAvailabilityModalVisible(true)
              }
            },
            cellRenderer: (params: any) => {
              const availability = params.value
              if (!availability) {
                return <Tag color="default">Неизвестно</Tag>
              }

              const values = Object.values(availability)
              const hasNoLimits = values.some((v) => v === 'NO_LIMITS')
              const hasLimited = values.some((v) => typeof v === 'number' && v > 0)
              const allUnavailable = values.every((v) => v === 'UNAVAILABLE')

              if (hasNoLimits) {
                return <Tag color="green">Без ограничений</Tag>
              }
              if (hasLimited) {
                const maxLimit = Math.max(...values.filter((v) => typeof v === 'number') as number[])
                return <Tag color="warning">Ограничено ({maxLimit})</Tag>
              }
              if (allUnavailable) {
                return <Tag color="red">Недоступно</Tag>
              }
              return <Tag color="default">Неизвестно</Tag>
            },
          },
          {
            field: `${clusterName}_to_supply`,
            headerName: 'Отгрузить на маркетплейс',
            width: 150,
            type: 'numericColumn',
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
              min: 0,
              precision: 0,
            },
            valueGetter: (params) => {
              const clusterData = params.data?.[clusterName]
              if (clusterData && typeof clusterData === 'object') {
                return clusterData.to_supply ?? 0
              }
              return 0
            },
            valueFormatter: (params) => {
              const value = params.value !== undefined && params.value !== null ? params.value : 0
              return String(value)
            },
            cellRenderer: (params: any) => {
              const boxCount = params.data?.box_count || 1
              const clusterData = params.data?.[clusterName]
              const actualValue = params.value !== undefined && params.value !== null 
                ? params.value 
                : (clusterData && typeof clusterData === 'object' ? (clusterData.to_supply ?? 0) : 0)
              const numValue = Number(actualValue) || 0
              
              // 1. Check box count validity
              const isBoxCountValid = boxCount <= 0 || numValue === 0 || numValue % boxCount === 0
              let boxCountError = ''
              if (!isBoxCountValid) {
                boxCountError = `Количество должно быть кратно ${boxCount}`
              }

              // 2. Check warehouse availability validity if numValue > 0
              let isAvailabilityValid = true
              let availabilityError = ''
              if (numValue > 0 && clusterData?.warehouse_availability) {
                const availability = clusterData.warehouse_availability
                const values = Object.values(availability)
                const hasNoLimits = values.some((v) => v === 'NO_LIMITS')
                const hasLimited = values.filter((v) => typeof v === 'number' && v > 0) as number[]
                const allUnavailable = values.every((v) => v === 'UNAVAILABLE')

                if (hasNoLimits) {
                  // Valid
                } else if (allUnavailable) {
                  isAvailabilityValid = false
                  availabilityError = 'Нет доступных складов'
                } else if (hasLimited.length > 0) {
                  const maxLimit = Math.max(...hasLimited)
                  if (numValue > maxLimit) {
                    isAvailabilityValid = false
                    availabilityError = `Превышен лимит поставки (${maxLimit})`
                  }
                }
              }
              
              // Default background color for cells with value 0 (soft green)
              const defaultBgColor = '#f0f9f4'
              // Slightly darker green for valid cells with non-zero values
              const validNonZeroBgColor = '#d4edda'
              // Warning color for box count errors (orange)
              const boxCountWarningColor = '#fff7e6'
              // Error color for availability errors (red)
              const availabilityErrorColor = '#fff1f0'
              
              // Determine background color based on value and validity
              let backgroundColor = defaultBgColor
              let errorReason = ''

              if (numValue > 0) {
                if (!isAvailabilityValid) {
                  backgroundColor = availabilityErrorColor
                  errorReason = availabilityError
                } else if (!isBoxCountValid) {
                  backgroundColor = boxCountWarningColor
                  errorReason = boxCountError
                } else {
                  backgroundColor = validNonZeroBgColor
                }
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

              if (errorReason) {
                return (
                  <Tooltip title={errorReason}>
                    {content}
                  </Tooltip>
                )
              }
              
              return content
            },
          },
        ],
      } as ColGroupDef)
    })

    // Add Totals column group
    baseHeaders.push({
      headerName: 'Итого',
      children: [
        {
          field: 'totals_marketplace_stocks_count',
          headerName: 'Остатки на МП (всего)',
          width: 150,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.marketplace_stocks_count ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
        },
        {
          field: 'totals_orders_count',
          headerName: 'Заказы (всего)',
          width: 150,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.orders_count ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
        },
        {
          field: 'totals_avg_orders_leverage',
          headerName: 'Сред. кол-во (всего)',
          width: 150,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.avg_orders_leverage ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
        },
        {
          field: 'totals_to_supply',
          headerName: 'К поставке (всего)',
          width: 150,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.to_supply ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
          cellStyle: { fontWeight: 'bold' }
        },
        {
          field: 'totals_deficit',
          headerName: 'Дефицит',
          width: 150,
          type: 'numericColumn',
          valueGetter: (params) => params.data?.totals?.deficit ?? 0,
          valueFormatter: (params) => String(params.value ?? 0),
          cellStyle: (params) => {
            const value = params.value || 0
            return { 
              fontWeight: 'bold', 
              color: value > 0 ? '#ff4d4f' : 'inherit' 
            }
          }
        },
      ]
    } as ColGroupDef)

    return baseHeaders
  }, [snapshot, handleCreateDraft])

  // Transform data for AG Grid - keep nested structure, no flat keys with dots
  const tableRows = useMemo(() => {
    if (!tableData || tableData.length === 0) return []

    // Return data as-is, keeping nested cluster structure
    // AG Grid will access nested data via valueGetter
    return tableData.map((item) => ({
      offer_id: item.offer_id,
      sku: item.sku,
      name: item.name,
      box_count: item.box_count,
      vendor_stocks_count: item.vendor_stocks_count,
      totals: item.totals,
      // Keep cluster data as nested objects
      ...Object.keys(item)
        .filter(key => !['offer_id', 'sku', 'name', 'box_count', 'vendor_stocks_count', 'totals'].includes(key))
        .reduce((acc, clusterName) => {
          acc[clusterName] = item[clusterName]
          return acc
        }, {} as Record<string, any>)
    }))
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
                    navigate(`/connections/${connectionId}/supplies`)
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
                icon={<ReloadOutlined />}
                loading={updating}
                onClick={handleUpdateSnapshot}
              >
                Обновить данные
              </Button>
              <Upload
                accept=".xlsx"
                showUploadList={false}
                beforeUpload={handleUploadAvailability}
              >
                <Button icon={<UploadOutlined />}>Загрузить ограничения</Button>
              </Upload>
            </Space>
          </div>

          <Title level={2} style={{ margin: 0 }}>
            Формирование поставки - {company?.name || ''}
          </Title>

          <Space>
            <Button
              icon={<DownloadOutlined />}
              loading={updating}
              onClick={handleDownloadDeficit}
            >
              Скачать дефициты товаров
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={updating}
              onClick={handleDownloadAvailability}
            >
              Скачать ограничения складов по товарам
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              loading={updating}
              onClick={handleDownloadFullXlsx}
            >
              Скачать всю таблицу (XLSX)
            </Button>
          </Space>

          {!snapshot ? (
            <Alert
              title="Нет данных"
              description="Нажмите 'Обновить данные' для создания снапшота"
              type="info"
              showIcon
              action={
                <Button
                  size="small"
                  type="primary"
                  onClick={handleUpdateSnapshot}
                  loading={updating}
                >
                  Обновить данные
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
                expandable={{
                  expandedRowRender: (record: SupplyDraft) => {
                    // Don't show expand block if supply is already created (has order_ids)
                    if (record.order_ids && record.order_ids.length > 0) {
                      return null
                    }

                    // Show "Нет доступных складов" if supply_warehouses is empty
                    if (!record.supply_warehouses || record.supply_warehouses.length === 0) {
                      return (
                        <div style={{ padding: '16px' }}>
                          <Text type="secondary">Нет доступных складов</Text>
                        </div>
                      )
                    }

                    // Show supply creation UI
                    const currentTimeslots = timeslots[record.id]
                    const currentSelectedWarehouse = selectedWarehouseId[record.id]
                    const currentSelectedTimeslot = selectedTimeslot[record.id]
                    const currentSupplyStatus = supplyCreateStatus[record.id]
                    const isLoadingTimeslots = loadingTimeslots[record.id] || false
                    const isCreating = creatingSupply[record.id] || false

                    return (
                      <div style={{ padding: '16px' }}>
                        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                          {/* Warehouse selection */}
                          <div>
                            <Text strong>Выберите склад размещения:</Text>
                            <Radio.Group
                              value={currentSelectedWarehouse}
                              onChange={async (e) => {
                                const warehouseId = e.target.value
                                setSelectedWarehouseId((prev) => ({ ...prev, [record.id]: warehouseId }))
                                // Clear timeslot when warehouse changes (timeslots are for drop_off_warehouse, not supply_warehouse)
                                setSelectedTimeslot((prev) => {
                                  const newState = { ...prev }
                                  delete newState[record.id]
                                  return newState
                                })
                                if (expandedDraftId !== record.id) {
                                  setExpandedDraftId(record.id)
                                }
                                // Auto-load timeslots when warehouse is selected
                                await handleLoadTimeslots(record)
                              }}
                              style={{ marginTop: '8px', display: 'block' }}
                            >
                              {record.supply_warehouses.map((warehouse) => (
                                <Radio
                                  key={warehouse.supply_warehouse.warehouse_id}
                                  value={warehouse.supply_warehouse.warehouse_id}
                                  style={{ display: 'block', marginBottom: '8px' }}
                                >
                                  {warehouse.supply_warehouse.name}
                                  {warehouse.supply_warehouse.address && (
                                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                                      {warehouse.supply_warehouse.address}
                                    </Text>
                                  )}
                                </Radio>
                              ))}
                            </Radio.Group>
                          </div>

                          {/* Loading indicator */}
                          {isLoadingTimeslots && (
                            <div>
                              <Spin size="small" /> <Text type="secondary">Загрузка таймслотов...</Text>
                            </div>
                          )}

                          {/* Timeslots display */}
                          {/* Timeslots are always for drop_off_warehouse, not for selected supply_warehouse */}
                          {currentTimeslots && !isLoadingTimeslots && (
                            <div>
                              <Text strong>Доступные таймслоты (склад отгрузки):</Text>
                              <div style={{ marginTop: '8px' }}>
                                {currentTimeslots.drop_off_warehouse_timeslots
                                  .filter((wt) => {
                                    // Note: API requires supply_warehouse_ids but returns timeslots for drop_off_warehouse
                                    // So we filter by drop_off_warehouse_id from draft
                                    const dropOffWarehouseId = record.drop_off_warehouse?.warehouse_id
                                    return wt.drop_off_warehouse_id === dropOffWarehouseId
                                  })
                                  .map((warehouseTimeslot) => (
                                    <div key={warehouseTimeslot.drop_off_warehouse_id} style={{ marginTop: '16px' }}>
                                      {warehouseTimeslot.days.length > 0 ? (
                                        warehouseTimeslot.days.map((day, dayIdx) => (
                                          <div key={dayIdx} style={{ marginBottom: '12px' }}>
                                            <Text strong>
                                              {new Date(day.date_in_timezone).toLocaleDateString('ru-RU')}
                                            </Text>
                                            {day.timeslots && day.timeslots.length > 0 ? (
                                              <Radio.Group
                                                value={
                                                  currentSelectedTimeslot
                                                    ? (() => {
                                                        const matchingSlotIdx = day.timeslots.findIndex(
                                                          (t) => t.from_in_timezone === currentSelectedTimeslot.from_in_timezone &&
                                                                 t.to_in_timezone === currentSelectedTimeslot.to_in_timezone
                                                        )
                                                        return matchingSlotIdx !== -1 ? `${dayIdx}-${matchingSlotIdx}` : undefined
                                                      })()
                                                    : undefined
                                                }
                                                onChange={(e) => {
                                                  const [dayIndex, slotIndex] = e.target.value.split('-').map(Number)
                                                  const selectedDay = warehouseTimeslot.days[dayIndex]
                                                  if (selectedDay && selectedDay.timeslots[slotIndex]) {
                                                    setSelectedTimeslot((prev) => ({
                                                      ...prev,
                                                      [record.id]: selectedDay.timeslots[slotIndex],
                                                    }))
                                                  }
                                                }}
                                                style={{ marginTop: '8px', display: 'block' }}
                                              >
                                                {day.timeslots.map((slot, slotIdx) => {
                                                  // Extract time from ISO string without timezone conversion
                                                  // Format: "2024-01-01T14:00:00Z" -> "14:00"
                                                  const fromTime = slot.from_in_timezone.includes('T') 
                                                    ? slot.from_in_timezone.split('T')[1]?.split(/[.Z+]/)[0] || slot.from_in_timezone
                                                    : slot.from_in_timezone
                                                  const toTime = slot.to_in_timezone.includes('T')
                                                    ? slot.to_in_timezone.split('T')[1]?.split(/[.Z+]/)[0] || slot.to_in_timezone
                                                    : slot.to_in_timezone
                                                  const fromTimeDisplay = fromTime.substring(0, 5) // HH:MM
                                                  const toTimeDisplay = toTime.substring(0, 5) // HH:MM
                                                  
                                                  return (
                                                    <Radio
                                                      key={slotIdx}
                                                      value={`${dayIdx}-${slotIdx}`}
                                                      style={{ display: 'block', marginBottom: '4px' }}
                                                    >
                                                      {fromTimeDisplay} - {toTimeDisplay}
                                                    </Radio>
                                                  )
                                                })}
                                              </Radio.Group>
                                            ) : (
                                              <div style={{ marginTop: '8px' }}>
                                                <Text type="secondary">Нет доступных таймслотов на эту дату</Text>
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ marginTop: '8px' }}>
                                          <Text type="secondary">Нет доступных таймслотов для этого склада</Text>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                {currentTimeslots.drop_off_warehouse_timeslots.filter(
                                  (wt) => wt.drop_off_warehouse_id === currentSelectedWarehouse
                                ).length === 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text type="secondary">Нет доступных таймслотов для выбранного склада</Text>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Create supply button */}
                          {/* warehouse_id is supply_warehouse_id, timeslot is for drop_off_warehouse */}
                          {currentSelectedWarehouse && currentSelectedTimeslot && !isLoadingTimeslots && (
                            <div>
                              <Button
                                type="primary"
                                onClick={() => {
                                  if (expandedDraftId !== record.id) {
                                    setExpandedDraftId(record.id)
                                  }
                                  handleCreateSupply(record)
                                }}
                                loading={isCreating}
                                disabled={isCreating}
                              >
                                Создать поставку
                              </Button>
                            </div>
                          )}

                          {/* Supply creation status */}
                          {currentSupplyStatus && (
                            <div>
                              <Text strong>Статус создания поставки:</Text>
                              <div style={{ marginTop: '8px' }}>
                                <Tag
                                  color={
                                    currentSupplyStatus.status === 'DraftSupplyCreateStatusSuccess'
                                      ? 'green'
                                      : currentSupplyStatus.status === 'DraftSupplyCreateStatusFailed'
                                      ? 'red'
                                      : 'blue'
                                  }
                                >
                                  {currentSupplyStatus.status === 'DraftSupplyCreateStatusSuccess'
                                    ? 'Успешно'
                                    : currentSupplyStatus.status === 'DraftSupplyCreateStatusFailed'
                                    ? 'Ошибка'
                                    : currentSupplyStatus.status === 'DraftSupplyCreateStatusInProgress'
                                    ? 'В процессе'
                                    : 'Неизвестно'}
                                </Tag>
                                {currentSupplyStatus.result?.order_ids && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text>ID заказов: {currentSupplyStatus.result.order_ids.join(', ')}</Text>
                                  </div>
                                )}
                                {currentSupplyStatus.error_messages && currentSupplyStatus.error_messages.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text type="danger">
                                      Ошибки: {currentSupplyStatus.error_messages.join(', ')}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Show order_ids from draft if available */}
                          {record.order_ids && record.order_ids.length > 0 && (
                            <div>
                              <Text strong>ID заказов:</Text>
                              <div style={{ marginTop: '4px' }}>
                                {record.order_ids.join(', ')}
                              </div>
                            </div>
                          )}
                        </Space>
                      </div>
                    )
                  },
                  rowExpandable: (record: SupplyDraft) => {
                    // Don't expand if supply is already created (has order_ids)
                    if (record.order_ids && record.order_ids.length > 0) {
                      return false
                    }
                    // Expandable if there are supply_warehouses to show creation UI
                    return true
                  },
                  onExpand: (expanded, record) => {
                    if (expanded) {
                      setExpandedDraftId(record.id)
                    } else {
                      if (expandedDraftId === record.id) {
                        setExpandedDraftId(null)
                        // Clean up state for this draft
                        setSelectedWarehouseId((prev) => {
                          const newState = { ...prev }
                          delete newState[record.id]
                          return newState
                        })
                        setSelectedTimeslot((prev) => {
                          const newState = { ...prev }
                          delete newState[record.id]
                          return newState
                        })
                        setTimeslots((prev) => {
                          const newState = { ...prev }
                          delete newState[record.id]
                          return newState
                        })
                        setSupplyCreateStatus((prev) => {
                          const newState = { ...prev }
                          delete newState[record.id]
                          return newState
                        })
                      }
                    }
                  },
                }}
                columns={[
                  {
                    title: 'Склад отгрузки',
                    key: 'warehouse_name',
                    render: (_: any, record: SupplyDraft) => {
                      return record.drop_off_warehouse?.name || record.drop_off_warehouse_name || '-'
                    },
                  },
                  {
                    title: 'Кластер',
                    dataIndex: 'cluster_name',
                    key: 'cluster_name',
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
                    title: 'Время жизни',
                    key: 'time_remaining',
                    render: (_: any, record: SupplyDraft) => {
                      const createdAt = new Date(record.created_at)
                      const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000)
                      const remaining = Math.max(0, expiresAt.getTime() - currentTime.getTime())
                      const minutes = Math.floor(remaining / 60000)
                      const seconds = Math.floor((remaining % 60000) / 1000)
                      
                      if (remaining === 0) {
                        return <Text type="danger">Истек</Text>
                      }
                      
                      return (
                        <Text type={minutes < 5 ? 'warning' : undefined}>
                          {String(minutes).padStart(2, '0')}:
                          {String(seconds).padStart(2, '0')}
                        </Text>
                      )
                    },
                  },
                  {
                    title: 'Заявка',
                    key: 'order_ids',
                    render: (_: any, record: SupplyDraft) => {
                      if (record.order_ids && record.order_ids.length > 0) {
                        return <Tag color="green">Заявка создана: {record.order_ids.join(', ')}</Tag>
                      }
                      return <Text type="secondary">-</Text>
                    },
                  },
                  {
                    title: 'Создан',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date: string) =>
                      new Date(date).toLocaleString('ru-RU'),
                  },
                ]}
                pagination={{ pageSize: 10 }}
              />
            </>
          )}
        </Space>
      </Card>

      {/* Warehouse selection modal */}
      <Modal
        title={`Выбор склада отгрузки - ${selectedCluster}`}
        open={warehouseModalVisible}
        onOk={handleSubmitDraft}
        onCancel={() => {
          setWarehouseModalVisible(false)
          form.resetFields()
          setSelectedCluster(null)
        }}
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

          <Form.Item
            name="limitation_strategy"
            label="При наличии ограничений на складе"
          >
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value="skip">Не поставлять товары с ограничениями</Radio>
                <Radio value="reduce">Уменьшить количество до лимита склада</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {previewItems.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Товары в поставке ({previewItems.length}):</Text>
              <Table
                dataSource={previewItems}
                rowKey="offer_id"
                size="small"
                pagination={{ pageSize: 10 }}
                style={{ marginTop: '8px' }}
                columns={[
                  {
                    title: 'Артикул',
                    dataIndex: 'offer_id',
                    key: 'offer_id',
                  },
                  {
                    title: 'Кол-во',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    render: (val, record) => (
                      <span>
                        {val}
                        {record.original_quantity !== val && (
                          <Tag color="orange" style={{ marginLeft: '8px' }}>
                            было {record.original_quantity}
                          </Tag>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
          {previewItems.length === 0 && selectedCluster && !warehouseLoading && (
            <Alert
              title="Нет товаров для поставки"
              description="С учетом текущих ограничений кластера и выбранной стратегии, ни один товар не может быть добавлен в поставку."
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Form>
      </Modal>

      {/* Warehouse availability details modal */}
      <Modal
        title={`Ограничения складов: ${selectedAvailability?.clusterName} - ${selectedAvailability?.offerId}`}
        open={availabilityModalVisible}
        onCancel={() => {
          setAvailabilityModalVisible(false)
          setSelectedAvailability(null)
        }}
        footer={[
          <Button key="close" onClick={() => setAvailabilityModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={600}
      >
        <Table
          dataSource={
            selectedAvailability
              ? Object.entries(selectedAvailability.availability).map(
                  ([warehouse, limit]) => ({
                    warehouse,
                    limit,
                  })
                )
              : []
          }
          rowKey="warehouse"
          columns={[
            {
              title: 'Склад',
              dataIndex: 'warehouse',
              key: 'warehouse',
            },
            {
              title: 'Максимальный размер поставки',
              dataIndex: 'limit',
              key: 'limit',
              render: (limit: any) => {
                if (limit === 'NO_LIMITS') {
                  return <Tag color="green">Без ограничений</Tag>
                }
                if (limit === 'UNAVAILABLE' || limit === 0) {
                  return <Tag color="red">Недоступно</Tag>
                }
                return <Tag color="warning">{limit}</Tag>
              },
            },
          ]}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  )
}

export default SupplyDraftPage

