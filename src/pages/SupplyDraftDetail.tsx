import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  message,
  Spin,
  Alert,
  Radio,
  Calendar,
  Row,
  Col,
  Empty,
  Tag,
  ConfigProvider,
  Modal,
  Table,
} from 'antd'
import ruRU from 'antd/locale/ru_RU'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'
import {
  ArrowLeftOutlined,
} from '@ant-design/icons'
import {
  suppliesApi,
  type SupplyDraft,
  type DraftTimeslotResponseV2,
  type Timeslot,
  type CreateSupplyFromDraftV2Request,
  type SupplyCreateStatusV2Response,
  WAREHOUSE_AVAILABILITY_STATE_DESCRIPTION,
} from '../api/supplies'

dayjs.extend(localeData)
dayjs.extend(updateLocale)
dayjs.locale('ru')
// Set Monday as the first day of the week (0 = Sunday, 1 = Monday)
dayjs.updateLocale('ru', {
  weekStart: 1,
})

const { Title, Text } = Typography


const formatTime = (isoStr: string) => {
  if (!isoStr) return ''
  const timePart = isoStr.includes('T') ? isoStr.split('T')[1]?.split(/[.Z+]/)[0] : isoStr
  return timePart?.substring(0, 5) || ''
}

const SupplyDraftDetail: React.FC = () => {
  const { connectionId, snapshotId, draftId } = useParams<{
    connectionId: string
    snapshotId: string
    draftId: string
  }>()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<SupplyDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [macrolocalClusterId, setMacrolocalClusterId] = useState<number | null>(null)
  const [timeslots, setTimeslots] = useState<DraftTimeslotResponseV2 | null>(null)
  const [loadingTimeslots, setLoadingTimeslots] = useState(false)
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null)
  const [creatingSupply, setCreatingSupply] = useState(false)
  const [supplyCreateStatus, setSupplyCreateStatus] = useState<SupplyCreateStatusV2Response | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [productsModalVisible, setProductsModalVisible] = useState(false)

  const loadDraftInfo = useCallback(async () => {
    if (!draftId) return

    setLoading(true)
    try {
      const draftInfo = await suppliesApi.getDraftInfoV2(parseInt(draftId))
      setDraft(draftInfo)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных черновика')
      console.error('Failed to load draft info:', error)
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    loadDraftInfo()
  }, [loadDraftInfo])

  const handleLoadTimeslots = useCallback(async (warehouseId?: number) => {
    if (!draft?.draft_id) {
      message.error('Черновик не имеет draft_id')
      return
    }

    const selectedWarehouse = warehouseId || selectedWarehouseId
    if (!selectedWarehouse) {
      message.error('Выберите склад размещения')
      return
    }

    setLoadingTimeslots(true)
    try {
      const macrolocalId = draft.cluster?.macrolocal_cluster_id

      if (!macrolocalId) {
        throw new Error('Не удалось получить macrolocal_cluster_id из черновика')
      }

      // Store it for later use
      setMacrolocalClusterId(macrolocalId)

      const storageWarehouseId = selectedWarehouse

      const today = new Date()
      const dateTo = new Date(today)
      dateTo.setDate(dateTo.getDate() + 27)

      const timeslotResponse = await suppliesApi.getDraftTimeslotsV2(parseInt(draftId!), {
        date_from: today.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        selected_cluster_warehouses: [{
          macrolocal_cluster_id: macrolocalId,
          storage_warehouse_id: storageWarehouseId,
        }],
      })

      setTimeslots(timeslotResponse)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || error.message || 'Ошибка загрузки таймслотов'
      )
    } finally {
      setLoadingTimeslots(false)
    }
  }, [draft, selectedWarehouseId, draftId])

  // Autoselect warehouse if there's only one warehouse with FULL_AVAILABLE state
  useEffect(() => {
    if (!draft || !draft.storage_warehouses) return

    const availableWarehouses = draft.storage_warehouses || []
    
    // Check if there's exactly one warehouse with FULL_AVAILABLE state
    if (availableWarehouses.length === 1) {
      const warehouse = availableWarehouses[0]
      if (warehouse.state === 'FULL_AVAILABLE' && warehouse.storage_warehouse?.warehouse_id) {
        const warehouseId = warehouse.storage_warehouse.warehouse_id
        // Only autoselect if not already selected
        if (selectedWarehouseId !== warehouseId) {
          setSelectedWarehouseId(warehouseId)
          // Auto-load timeslots for the selected warehouse
          handleLoadTimeslots(warehouseId)
        }
      }
    }
  }, [draft, selectedWarehouseId, handleLoadTimeslots])

  const handleCreateSupply = async () => {
    if (!draft) return

    const draftWarehouseId = selectedWarehouseId
    const draftSelectedTimeslot = selectedTimeslot
    const macrolocalId = macrolocalClusterId

    if (!draftWarehouseId || !draftSelectedTimeslot) {
      message.error('Выберите склад и таймслот')
      return
    }

    if (!macrolocalId) {
      message.error('Не удалось определить macrolocal_cluster_id. Попробуйте загрузить таймслоты снова.')
      return
    }

    if (!draft.draft_id) {
      message.error('Черновик не имеет draft_id')
      return
    }

    setCreatingSupply(true)
    try {
      const createRequest: CreateSupplyFromDraftV2Request = {
        selected_cluster_warehouses: [{
          macrolocal_cluster_id: macrolocalId,
          storage_warehouse_id: draftWarehouseId,
        }],
        timeslot: draftSelectedTimeslot,
      }

      const createResponse = await suppliesApi.createSupplyFromDraftV2(
        draft.id,
        createRequest
      )

      // Backend polls until terminal status, so we get final result directly
      setSupplyCreateStatus(createResponse as SupplyCreateStatusV2Response)
      setCreatingSupply(false)

      if (createResponse.status === 'SUCCESS') {
        message.success('Поставка успешно создана')
        if (createResponse.order_id) {
          message.info(`ID заказа: ${createResponse.order_id}`)
        }
      } else if (createResponse.status === 'FAILED') {
        message.error('Ошибка создания поставки')
        if (createResponse.error_reasons && createResponse.error_reasons.length > 0) {
          message.error(createResponse.error_reasons.join(', '))
        }
      }

      // Reload draft to get updated data
      loadDraftInfo()
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания поставки'
      )
      setCreatingSupply(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
          Загрузка данных черновика...
        </Text>
      </div>
    )
  }

  if (!draft) {
    return (
      <Card>
        <Alert
          message="Черновик не найден"
          description="Не удалось загрузить данные черновика"
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate(`/connections/${connectionId}/supply-templates/${snapshotId}`)}>
              Вернуться назад
            </Button>
          }
        />
      </Card>
    )
  }

  const availableWarehouses = draft.storage_warehouses || []
  const selectedWarehouse = selectedWarehouseId
    ? availableWarehouses.find(
        (w) => w.storage_warehouse?.warehouse_id === selectedWarehouseId
      )
    : null
  const selectedWarehouseProducts = selectedWarehouse?.products || []
  const hasSelectedWarehouseMismatch = selectedWarehouseProducts.some(
    (p) => p.quantity !== p.expected_quantity
  )

  // Show "Нет доступных складов" if no warehouses available
  if (availableWarehouses.length === 0) {
    return (
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/connections/${connectionId}/supply-templates/${snapshotId}`)}
          >
            Назад
          </Button>
          <Alert
            title="Нет доступных складов"
            description="Для этого черновика нет доступных складов размещения"
            type="warning"
            showIcon
          />
        </Space>
      </Card>
    )
  }

  // Get all available dates for the calendar dots
  const availableDates = new Set<string>()
  if (timeslots) {
    // Handle v2 response format
    if ('result' in timeslots && timeslots.result?.drop_off_warehouse_timeslots) {
      const timeslotsData = timeslots.result.drop_off_warehouse_timeslots
      timeslotsData.days?.forEach(day => {
        if (day.timeslots && day.timeslots.length > 0) {
          availableDates.add(dayjs(day.date_in_timezone).format('YYYY-MM-DD'))
        }
      })
    } else if ('drop_off_warehouse_timeslots' in timeslots) {
      // Handle v1 response format (backward compatibility)
      const timeslotsData = timeslots as any
      if (Array.isArray(timeslotsData.drop_off_warehouse_timeslots)) {
        timeslotsData.drop_off_warehouse_timeslots.forEach((wt: any) => {
          if (wt.drop_off_warehouse_id === draft.drop_off_warehouse?.warehouse_id) {
            if (Array.isArray(wt.days)) {
              wt.days.forEach((day: any) => {
                if (day.timeslots && day.timeslots.length > 0) {
                  availableDates.add(dayjs(day.date_in_timezone).format('YYYY-MM-DD'))
                }
              })
            }
          }
        })
      }
    }
  }

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    if (availableDates.has(dateStr)) {
      return (
        <div style={{ textAlign: 'center', paddingTop: '4px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1890ff', margin: '0 auto' }} />
        </div>
      )
    }
    return null
  }

  const onDateSelect = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    setSelectedDate(dateStr)
    // Clear timeslot when date changes
    setSelectedTimeslot(null)
  }

  // Find timeslots for the selected date
  let selectedDayData: { timeslots: Timeslot[] } | undefined
  if (timeslots) {
    if ('result' in timeslots && timeslots.result?.drop_off_warehouse_timeslots) {
      // V2 format
      const timeslotsData = timeslots.result.drop_off_warehouse_timeslots
      selectedDayData = timeslotsData.days?.find(
        day => dayjs(day.date_in_timezone).format('YYYY-MM-DD') === selectedDate
      )
    } else if ('drop_off_warehouse_timeslots' in timeslots) {
      // V1 format (backward compatibility)
      const timeslotsData = timeslots as any
      if (Array.isArray(timeslotsData.drop_off_warehouse_timeslots)) {
        const warehouseTimeslots = timeslotsData.drop_off_warehouse_timeslots
          .find((wt: any) => wt.drop_off_warehouse_id === draft.drop_off_warehouse?.warehouse_id)
        if (warehouseTimeslots && Array.isArray(warehouseTimeslots.days)) {
          selectedDayData = warehouseTimeslots.days.find(
            (day: any) => dayjs(day.date_in_timezone).format('YYYY-MM-DD') === selectedDate
          )
        }
      }
    }
  }

  const allTimeslots = selectedDayData?.timeslots || []

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/connections/${connectionId}/supply-templates/${snapshotId}`)}
          >
            Назад к шаблону поставки
          </Button>

          <Title level={2}>Детали черновика поставки</Title>



          <div style={{ padding: '24px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              {/* Warehouse selection */}
              <div>
                <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>
                  1. Выберите склад размещения:
                </Text>
                <Radio.Group
                  value={selectedWarehouseId}
                  onChange={async (e) => {
                    const warehouseId = e.target.value
                    setSelectedWarehouseId(warehouseId)
                    // Clear timeslot and date when warehouse changes
                    setSelectedTimeslot(null)
                    setSelectedDate(null)
                    // Auto-load timeslots when warehouse is selected
                    await handleLoadTimeslots(warehouseId)
                  }}
                  style={{ width: '100%' }}
                >
                  <Row gutter={[16, 16]}>
                    {availableWarehouses.map((warehouse) => {
                      const warehouseData = warehouse.storage_warehouse
                      if (!warehouseData) {
                        return null
                      }
                      return (
                        <Col span={10} key={warehouseData.warehouse_id}>
                          <Radio.Button
                            value={warehouseData.warehouse_id}
                            style={{
                              width: '100%',
                              height: 'auto',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              borderRadius: '8px',
                              border: selectedWarehouseId === warehouseData.warehouse_id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                            }}
                          >
                            <Space
                              size="small"
                              style={{ width: '100%', justifyContent: 'space-between' }}
                            >
                              <Text strong>{warehouseData.name}</Text>
                              {warehouse.state && (
                                <Tag
                                  color={
                                    warehouse.state === 'FULL_AVAILABLE'
                                      ? 'green'
                                      : warehouse.state === 'PARTIAL_AVAILABLE'
                                        ? 'orange'
                                        : 'default'
                                  }
                                >
                                  {WAREHOUSE_AVAILABILITY_STATE_DESCRIPTION[warehouse.state]}
                                </Tag>
                              )}
                            </Space>
                          </Radio.Button>
                        </Col>
                      )
                    })}
                  </Row>
                </Radio.Group>
              </div>

              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col span={4}>
                    {selectedWarehouseProducts.length > 0 && (
                      <Button type="primary" onClick={() => setProductsModalVisible(true)}>
                        Показать товары
                      </Button>
                    )}
                  </Col>
                </Row>
              </Space>

              {/* Date and Time selection */}
              {selectedWarehouseId && (
                <div>
                  <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>
                    2. Выберите дату и время отгрузки:
                  </Text>
                  {loadingTimeslots ? (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px' }}>
                      <Spin /> <Text type="secondary" style={{ marginLeft: '12px' }}>Загрузка доступных интервалов...</Text>
                    </div>
                  ) : (
                    <Row gutter={32}>
                      {/* Left side: Calendar */}
                      <Col span={10}>
                        <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <ConfigProvider locale={ruRU}>
                            <Calendar
                              fullscreen={false}
                              headerRender={({ value, onChange }) => {
                                const localeData = value.localeData();
                                const year = value.year();
                                return (
                                  <div style={{ padding: '8px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong style={{ fontSize: '16px' }}>{localeData.months(value)} {year}</Text>
                                    <Space>
                                      <Button
                                        size="small"
                                        icon={<span style={{ fontSize: '12px' }}>&lt;</span>}
                                        onClick={() => onChange(value.clone().subtract(1, 'month'))}
                                      />
                                      <Button
                                        size="small"
                                        icon={<span style={{ fontSize: '12px' }}>&gt;</span>}
                                        onClick={() => onChange(value.clone().add(1, 'month'))}
                                      />
                                    </Space>
                                  </div>
                                );
                              }}
                              value={selectedDate ? dayjs(selectedDate) : undefined}
                              onSelect={onDateSelect}
                              cellRender={dateCellRender}
                            />
                          </ConfigProvider>
                        </div>
                      </Col>
                      {/* Right side: Timeslots */}
                      <Col span={14}>
                        {selectedDate ? (
                          <div style={{ height: '100%' }}>
                            <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '24px' }}>
                              {dayjs(selectedDate).format('D MMMM, dddd')}
                            </Text>

                            {allTimeslots.length > 0 ? (
                              <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                                <Row gutter={[12, 12]}>
                                  {allTimeslots.map((slot, idx) => {
                                    const fromTime = formatTime(slot.from_in_timezone)
                                    const toTime = formatTime(slot.to_in_timezone)
                                    const isSelected = selectedTimeslot?.from_in_timezone === slot.from_in_timezone &&
                                      selectedTimeslot?.to_in_timezone === slot.to_in_timezone
                                    return (
                                      <Col key={idx} span={8}>
                                        <Button
                                          type={isSelected ? 'primary' : 'default'}
                                          style={{
                                            width: '100%',
                                            height: '40px',
                                            borderRadius: '6px',
                                            backgroundColor: isSelected ? undefined : '#f5f5f5',
                                            border: isSelected ? undefined : 'none',
                                            color: isSelected ? undefined : '#555',
                                            fontWeight: isSelected ? 600 : 400
                                          }}
                                          onClick={() => setSelectedTimeslot(slot)}
                                        >
                                          {fromTime} - {toTime}
                                        </Button>
                                      </Col>
                                    )
                                  })}
                                </Row>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                <Empty description="Нет доступных таймслотов на эту дату" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            height: '100%',
                            minHeight: '350px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed #e8e8e8',
                            borderRadius: '12px',
                            backgroundColor: '#fff'
                          }}>
                            <Space orientation="vertical" align="center">
                              <Text type="secondary" style={{ fontSize: '16px' }}>Выберите дату в календаре</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>Слева отображены доступные дни</Text>
                            </Space>
                          </div>
                        )}
                      </Col>
                    </Row>
                  )}
                </div>
              )}

              {/* Confirmation section */}
              {selectedWarehouseId && selectedTimeslot && (
                <div style={{
                  marginTop: '8px',
                  padding: '24px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e6f7ff'
                }}>
                  <Space orientation="vertical" size={4}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Text type="secondary">Время:</Text>
                      <Text strong>
                        {dayjs(selectedDate).format('dddd, D MMMM')}, {formatTime(selectedTimeslot.from_in_timezone)} - {formatTime(selectedTimeslot.to_in_timezone)}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Text type="secondary">На складе отгрузки:</Text>
                      <Text strong>{draft.drop_off_warehouse?.name}</Text>
                    </div>
                  </Space>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleCreateSupply}
                    loading={creatingSupply}
                    disabled={creatingSupply}
                    style={{
                      height: '48px',
                      padding: '0 48px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      boxShadow: '0 4px 10px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    Подтвердить
                  </Button>
                </div>
              )}

              {/* Supply creation status */}
              {supplyCreateStatus && (
                <div style={{ marginTop: '16px' }}>
                  <Alert
                    title={
                      <Space orientation="vertical" size={4}>
                        <Text strong>
                          {supplyCreateStatus.status === 'SUCCESS' ? 'Поставка успешно создана' :
                            supplyCreateStatus.status === 'FAILED' ? 'Ошибка при создании поставки' :
                              'Неизвестный статус'}
                        </Text>
                        {supplyCreateStatus.order_id && (
                          <Text>ID заказа: <Tag color="green">{String(supplyCreateStatus.order_id)}</Tag></Text>
                        )}
                        {'error_reasons' in supplyCreateStatus && Array.isArray(supplyCreateStatus.error_reasons) && supplyCreateStatus.error_reasons.length > 0 && (
                          <div style={{ marginTop: '4px' }}>
                            {(supplyCreateStatus.error_reasons as string[]).map((err: string, i: number) => (
                              <div key={i} style={{ color: '#ff4d4f' }}>• {err}</div>
                            ))}
                          </div>
                        )}
                        {'error_messages' in supplyCreateStatus && Array.isArray(supplyCreateStatus.error_messages) && supplyCreateStatus.error_messages.length > 0 && (
                          <div style={{ marginTop: '4px' }}>
                            {(supplyCreateStatus.error_messages as string[]).map((err: string, i: number) => (
                              <div key={i} style={{ color: '#ff4d4f' }}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </Space>
                    }
                    type={
                      supplyCreateStatus.status === 'SUCCESS' ? 'success' :
                        supplyCreateStatus.status === 'FAILED' ? 'error' : 'info'
                    }
                    showIcon
                    style={{ borderRadius: '12px' }}
                  />
                </div>
              )}
            </Space>
          </div>
        </Space>
      </Card>

      {/* Products Modal */}
      <Modal
        title="Товары для поставки"
        open={productsModalVisible}
        onCancel={() => setProductsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setProductsModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={800}
      >
        {hasSelectedWarehouseMismatch && (
          <Alert
            title="После доп. проверки обнаружилось, что часть товаров склад не может принять:"
            type="warning"
            showIcon
            style={{ marginBottom: '12px' }}
          />
        )}
        <Table
          dataSource={selectedWarehouseProducts}
          rowKey={(record, index) => `${record.offer_id}-${index}`}
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Артикул',
              dataIndex: 'offer_id',
              key: 'offer_id',
            },
            {
              title: 'К поставке',
              dataIndex: 'quantity',
              key: 'quantity',
              render: (quantity: number) => quantity,
            },
            {
              title: 'Не сможем принять',
              key: 'cannot_accept',
              render: (_: any, record: typeof selectedWarehouseProducts[0]) => {
                const isMismatch = record.quantity !== record.expected_quantity
                if (isMismatch) {
                  return record.expected_quantity - record.quantity
                }
                return ''
              },
            },
          ]}
        />
      </Modal>
    </div>
  )
}

export default SupplyDraftDetail
