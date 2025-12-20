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
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { SimpleTable } from 'simple-table-core'
import 'simple-table-core/styles.css'
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
const MemoizedTable = memo(({ headers, rows, onCellEdit }: {
  headers: any[]
  rows: any[]
  onCellEdit: (data: any) => void
}) => {
  return (
    <div style={{ height: '600px', overflow: 'auto' }}>
      <SimpleTable
        defaultHeaders={headers}
        rows={rows}
        rowIdAccessor="offer_id"
        height="600px"
        columnResizing={true}
        columnReordering={true}
        onCellEdit={onCellEdit}
      />
    </div>
  )
})

MemoizedTable.displayName = 'MemoizedTable'

interface SupplyDataItem {
  offer_id: string
  sku: number
  name: string
  box_count: number
  [clusterName: string]: any
  totals: {
    marketplace_stocks_count: number
    orders_count: number
    vendor_stocks_count: number
    to_supply: number
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
  const [connection, setConnection] = useState<Connection | null>(null)
  const [drafts, setDrafts] = useState<SupplyDraft[]>([])
  const [warehouseModalVisible, setWarehouseModalVisible] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
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

  const handleSaveSnapshot = async () => {
    if (!connectionId || !tableData.length) return

    // Check for invalid values before saving
    if (hasInvalidValues) {
      message.error('Нельзя сохранить: есть невалидные значения в колонке "Отгрузить на маркетплейс"')
      return
    }

    setSaving(true)
    try {
      const savedSnapshot = await saveSupplySnapshot(
        parseInt(connectionId),
        tableData
      )
      setSnapshot(savedSnapshot)
      message.success('Изменения сохранены')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка сохранения изменений'
      )
    } finally {
      setSaving(false)
    }
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
      const values = await form.validateFields()
      const warehouseId = values.warehouse_id
      const selectedWarehouse = warehouses.find((w) => w.warehouse_id === warehouseId)

      if (!selectedWarehouse) {
        message.error('Склад не найден')
        return
      }

      // Get items for this cluster from table data
      const items: Array<{ sku: number; quantity: number }> = []
      for (const item of tableData) {
        const clusterData = item[selectedCluster]
        if (clusterData && clusterData.to_supply > 0) {
          // Validate box_count
          if (item.box_count > 0 && clusterData.to_supply % item.box_count !== 0) {
            message.error(
              `Количество для артикула ${item.offer_id} должно быть кратно ${item.box_count}`
            )
            return
          }
          items.push({
            sku: item.sku,
            quantity: clusterData.to_supply,
          })
        }
      }

      if (items.length === 0) {
        message.warning('Не выбрано ни одного товара для поставки')
        return
      }

      const request: CreateSupplyDraftRequest = {
        connection_id: parseInt(connectionId),
        drop_off_warehouse_id: warehouseId,
        drop_off_warehouse_name: selectedWarehouse.name,  // Keep for backward compatibility
        drop_off_warehouse: {
          warehouse_id: warehouseId,
          name: selectedWarehouse.name,
          address: selectedWarehouse.address || null,
        },
        cluster_name: selectedCluster,
        items,
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
          if (accessor.includes('.')) {
            const [clusterName, field] = accessor.split('.')
            if (updated[clusterName]) {
              updated[clusterName] = {
                ...updated[clusterName],
                [field]: Number(newValue) || 0,
              }
            }
          } else {
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

  // Value formatter for number columns - more performant than cellRenderer
  const formatNumber = useCallback(({ value, row, accessor }: any) => {
    // If value is undefined (can happen with nested headers), get it from row directly
    const actualValue = value !== undefined && value !== null 
      ? value 
      : (row[accessor] !== undefined && row[accessor] !== null ? row[accessor] : 0)
    
    return actualValue
  }, [])

  // Header renderer for cluster columns with "Create Draft" button
  const renderClusterHeader = useCallback((clusterName: string) => {
    return ({}: any) => {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <span>{clusterName}</span>
          <Button
            size="small"
            type="primary"
            onClick={(e) => {
              e.stopPropagation()
              handleCreateDraft(clusterName)
            }}
          >
            Создать черновик
          </Button>
        </div>
      )
    }
  }, [handleCreateDraft])

  // Check if there are any invalid values in tableData
  const hasInvalidValues = useMemo(() => {
    if (!tableData || tableData.length === 0) return false

    for (const item of tableData) {
      const boxCount = item.box_count || 1
      if (boxCount <= 0) continue

      // Check all cluster to_supply values
      const clusterNames = Object.keys(item).filter(
        (key) => !['offer_id', 'sku', 'name', 'box_count', 'totals'].includes(key)
      )

      for (const clusterName of clusterNames) {
        const clusterData = item[clusterName]
        if (clusterData && typeof clusterData === 'object' && clusterData !== null) {
          const toSupply = clusterData.to_supply || 0
          if (toSupply > 0 && toSupply % boxCount !== 0) {
            return true
          }
        }
      }
    }
    return false
  }, [tableData])

  // Handle cell editing for to_supply columns
  const handleCellEdit = useCallback(({ accessor, newValue, row }: any) => {
    // Only handle to_supply columns
    if (!accessor.includes('.to_supply')) {
      return
    }

    const numValue = Number(newValue) || 0
    handleCellChange(row.offer_id, accessor, numValue)
  }, [handleCellChange])

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

  // Build table headers dynamically based on clusters
  const headers = useMemo(() => {
    if (!snapshot || snapshot.data.length === 0) return []

    const baseHeaders: any[] = [
      {
        accessor: 'offer_id',
        label: 'Артикул',
        width: 120,
        pinned: 'left',
        isSortable: true,
      },
      {
        accessor: 'sku',
        label: 'SKU',
        width: 100,
        pinned: 'left',
        isSortable: true,
      },
      {
        accessor: 'name',
        label: 'Наименование',
        width: 200,
        pinned: 'left',
        isSortable: true,
      },
      {
        accessor: 'box_count',
        label: 'Кратность короба',
        width: 120,
        pinned: 'left',
        isSortable: true,
      },
    ]

    // Get cluster names from first item (excluding totals and base fields)
    const firstItem = snapshot.data[0]
    const clusterNames = Object.keys(firstItem).filter(
      (key) =>
        !['offer_id', 'sku', 'name', 'box_count', 'totals'].includes(key)
    )

    // Add cluster columns with nested headers
    clusterNames.forEach((clusterName) => {
      baseHeaders.push({
        accessor: clusterName,
        label: clusterName,
        width: 600, // Total width for 4 columns (150 * 4)
        headerRenderer: renderClusterHeader(clusterName),
        children: [
          {
            accessor: `${clusterName}.marketplace_stocks_count`,
            label: 'Остатки на маркетплейсе',
            width: 150,
            type: 'number',
            valueGetter: ({ row }: any) => {
              const key = `${clusterName}.marketplace_stocks_count`
              const value = row[key]
              return value !== undefined && value !== null ? value : 0
            },
            valueFormatter: formatNumber,
          },
          {
            accessor: `${clusterName}.orders_count`,
            label: 'Кол-во заказов (мес.)',
            width: 150,
            type: 'number',
            valueGetter: ({ row }: any) => {
              const key = `${clusterName}.orders_count`
              const value = row[key]
              return value !== undefined && value !== null ? value : 0
            },
            valueFormatter: formatNumber,
          },
          {
            accessor: `${clusterName}.vendor_stocks_count`,
            label: 'Остатки на складе поставщика',
            width: 150,
            type: 'number',
            valueGetter: ({ row }: any) => {
              const key = `${clusterName}.vendor_stocks_count`
              const value = row[key]
              return value !== undefined && value !== null ? value : 0
            },
            valueFormatter: formatNumber,
          },
          {
            accessor: `${clusterName}.to_supply`,
            label: 'Отгрузить на маркетплейс',
            width: 150,
            type: 'number',
            isEditable: true,
            valueGetter: ({ row }: any) => {
              return row[`${clusterName}.to_supply`] || 0
            },
            valueFormatter: formatNumber,
            cellRenderer: ({ value, row, accessor }: any) => {
              const boxCount = row.box_count || 1
              // Get value from row if not provided
              const actualValue = value !== undefined && value !== null 
                ? value 
                : (row[accessor] !== undefined && row[accessor] !== null ? row[accessor] : 0)
              const numValue = Number(actualValue) || 0
              const isValid = boxCount <= 0 || numValue === 0 || numValue % boxCount === 0
              
              // Default background color for cells with value 0 (soft green)
              const defaultBgColor = '#f0f9f4'
              // Slightly darker green for valid cells with non-zero values
              const validNonZeroBgColor = '#d4edda'
              // Warning color for invalid cells
              const warningBgColor = '#fff7e6'
              
              // Determine background color based on value and validity
              let backgroundColor = defaultBgColor
              if (!isValid && numValue > 0) {
                backgroundColor = warningBgColor
              } else if (isValid && numValue > 0) {
                backgroundColor = validNonZeroBgColor
              }
              
              return (
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
            },
          },
        ],
      })
    })

    return baseHeaders
  }, [snapshot, formatNumber, renderClusterHeader])

  // Transform data for SimpleTable
  const tableRows = useMemo(() => {
    if (!tableData || tableData.length === 0) return []

    const rows = tableData.map((item) => {
      const row: any = {
        offer_id: item.offer_id,
        sku: item.sku,
        name: item.name,
        box_count: item.box_count,
      }

      // Add cluster data
      const clusterNames = Object.keys(item).filter(
        (key) =>
          !['offer_id', 'sku', 'name', 'box_count', 'totals'].includes(key)
      )

      clusterNames.forEach((clusterName) => {
        const clusterData = item[clusterName]
        
        if (clusterData && typeof clusterData === 'object' && clusterData !== null) {
          row[`${clusterName}.marketplace_stocks_count`] =
            clusterData.marketplace_stocks_count ?? 0
          row[`${clusterName}.orders_count`] = clusterData.orders_count ?? 0
          row[`${clusterName}.vendor_stocks_count`] =
            clusterData.vendor_stocks_count ?? 0
          row[`${clusterName}.to_supply`] = clusterData.to_supply ?? 0
        } else {
          row[`${clusterName}.marketplace_stocks_count`] = 0
          row[`${clusterName}.orders_count`] = 0
          row[`${clusterName}.vendor_stocks_count`] = 0
          row[`${clusterName}.to_supply`] = 0
        }
      })

      return row
    })

    return rows
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
              <Title level={2} style={{ margin: 0 }}>
                Формирование поставки - {company?.name || ''}
              </Title>
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
              <Button
                type="primary"
                onClick={handleSaveSnapshot}
                loading={saving}
                disabled={!snapshot || tableData.length === 0 || hasInvalidValues}
              >
                Сохранить изменения
              </Button>
            </Space>
          </div>

          {!snapshot ? (
            <Alert
              message="Нет данных"
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
                headers={headers}
                rows={tableRows}
                onCellEdit={handleCellEdit}
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
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
        </Form>
      </Modal>
    </div>
  )
}

export default SupplyDraftPage

