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
  Select,
  Popconfirm,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons'
import { formatDate, formatDateTime } from '../lib/dayjs'
import {
  suppliesApi,
  type SupplyOrder,
  type SupplyOrderState,
  type KaitenCardInfo,
  SUPPLY_ORDER_STATE_LABELS,
} from '../api/supplies'
import { companiesApi, type Company } from '../api/companies'
import { connectionsApi, type Connection } from '../api/connections'

const { Title } = Typography
const { Option } = Select

type SupplyStateGroupId = 'PREPARATION' | 'IN_TRANSIT_AND_ACCEPTANCE'

const SUPPLY_STATE_GROUPS: Array<{
  id: SupplyStateGroupId
  label: string
  states: SupplyOrderState[]
}> = [
  {
    id: 'PREPARATION',
    label: 'Подготовка к поставкам',
    states: ['DATA_FILLING', 'READY_TO_SUPPLY'],
  },
  {
    id: 'IN_TRANSIT_AND_ACCEPTANCE',
    label: 'В пути и приемка',
    states: [
      'ACCEPTED_AT_SUPPLY_WAREHOUSE',
      'IN_TRANSIT',
      'ACCEPTANCE_AT_STORAGE_WAREHOUSE',
    ],
  },
]

interface SupplyActionsProps {
  supply: SupplyOrder
  connection: Connection
  onCreateCargoes: (supply: SupplyOrder, deleteCurrentVersion: boolean) => Promise<void>
  onSetExternalOrderId: (supply: SupplyOrder, externalOrderId: string) => Promise<void>
  onDownloadDocuments: (supply: SupplyOrder) => Promise<void>
  onDownloadCargoLabels: (supply: SupplyOrder) => Promise<void>
  onCreateKaitenCard: (supply: SupplyOrder) => Promise<void>
  onLinkExistingKaitenCard: (supply: SupplyOrder) => Promise<void>
  isCreating: boolean
  isSavingExternalOrderId: boolean
  isDownloading: boolean
  isDownloadingLabels: boolean
  isCreatingKaiten: boolean
  isLinkingKaiten: boolean
}

const supplyActionsSectionTitle: React.CSSProperties = {
  display: 'block',
  margin: '0 0 4px',
  fontSize: 16,
  lineHeight: 1.6,
}

const supplyActionsRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
}

const supplyActionsRowGrow: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const supplyActionsPrimaryButton: React.CSSProperties = {
  flexShrink: 0,
  width: 84,
}

const kaitenButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgb(156, 39, 176)',
  borderColor: 'rgb(156, 39, 176)',
}

const SupplyActions: React.FC<SupplyActionsProps> = ({
  supply,
  onCreateCargoes,
  onSetExternalOrderId,
  onDownloadDocuments,
  onDownloadCargoLabels,
  onCreateKaitenCard,
  onLinkExistingKaitenCard,
  isCreating,
  isSavingExternalOrderId,
  isDownloading,
  isDownloadingLabels,
  isCreatingKaiten,
  isLinkingKaiten,
}) => {
  const [cargoForm] = Form.useForm()
  const [externalOrderForm] = Form.useForm()

  const resolvedExternalOrderId =
    supply.external_order_id ?? supply.default_external_order_id?.toString() ?? ''

  useEffect(() => {
    externalOrderForm.setFieldsValue({ external_order_id: resolvedExternalOrderId })
  }, [supply.supply_id, resolvedExternalOrderId, externalOrderForm])

  return (
    <div style={{ padding: '4px 0', minWidth: 280 }}>
      <Form
        form={cargoForm}
        onFinish={(values) => {
          onCreateCargoes(supply, values.delete_current_version ?? true)
        }}
      >
        <Typography.Text strong style={supplyActionsSectionTitle}>
          Сгенерировать грузоместа
        </Typography.Text>
        <div style={supplyActionsRow}>
          <div style={supplyActionsRowGrow}>
            <Form.Item
              name="delete_current_version"
              valuePropName="checked"
              initialValue={false}
              noStyle
            >
              <Checkbox style={{ whiteSpace: 'nowrap' }}>
                Удалить предыдущие грузоместа
              </Checkbox>
            </Form.Item>
          </div>
          <Button
            type="primary"
            size="middle"
            htmlType="submit"
            loading={isCreating}
            style={supplyActionsPrimaryButton}
          >
            Создать
          </Button>
        </div>
      </Form>

      <Divider style={{ margin: '8px 0' }} />

      <Form
        form={externalOrderForm}
        onFinish={(values) => {
          onSetExternalOrderId(supply, values.external_order_id)
        }}
      >
        <Typography.Text strong style={supplyActionsSectionTitle}>
          Изменить номер внешнего заказа
        </Typography.Text>
        <div style={supplyActionsRow}>
          <div style={supplyActionsRowGrow}>
            <Form.Item
              name="external_order_id"
              rules={[{ required: true, message: 'Укажите номер внешнего заказа' }]}
              initialValue={resolvedExternalOrderId}
              noStyle
            >
              <Input size="middle" placeholder="Например, 63" />
            </Form.Item>
          </div>
          <Button
            type="primary"
            size="middle"
            htmlType="submit"
            loading={isSavingExternalOrderId}
            style={supplyActionsPrimaryButton}
          >
            Сохранить
          </Button>
        </div>
      </Form>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text strong style={supplyActionsSectionTitle}>
        Загрузить документы к поставке
      </Typography.Text>
      <Space orientation="vertical" size={8} style={{ width: '100%' }}>
        <Button
          type="primary"
          size="middle"
          loading={isDownloading}
          onClick={() => onDownloadDocuments(supply)}
          block
        >
          Скачать комплект документов
        </Button>
        <Button
          type="primary"
          size="middle"
          loading={isDownloadingLabels}
          onClick={() => onDownloadCargoLabels(supply)}
          block
        >
          Скачать ярлыки грузомест
        </Button>
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text strong style={supplyActionsSectionTitle}>
        Kaiten
      </Typography.Text>
      {(() => {
        const hasKaitenCard = !!supply.kaiten_card_id
        const hasCargoes =
          supply.cargoes_count != null && supply.cargoes_count > 0
        const canAttachToExistingCard = hasKaitenCard || hasCargoes

        return (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            {!hasKaitenCard && (
              <Tooltip title="Создать карточку в Kaiten для поставки и прикрепить к ней необходимые файлы поставки">
                <Button
                  type="primary"
                  size="middle"
                  loading={isCreatingKaiten}
                  disabled={!hasCargoes}
                  onClick={() => onCreateKaitenCard(supply)}
                  block
                  style={kaitenButtonStyle}
                >
                  Создать задачу
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Действие нужно, чтобы прикрепить файлы к карточке, которая уже создана в Kaiten и содержит в названии такой же номер внешнего заказа, как и у поставки">
              <Button
                type="primary"
                size="middle"
                loading={isLinkingKaiten}
                disabled={!canAttachToExistingCard}
                onClick={() => onLinkExistingKaitenCard(supply)}
                block
                style={kaitenButtonStyle}
              >
                Прикрепить файлы к карточке
              </Button>
            </Tooltip>
          </Space>
        )
      })()}
    </div>
  )
}

interface SupplyKaitenExpandedSectionProps {
  supply: SupplyOrder
  connectionId: number
  refreshToken?: number
  onLinkExisting: (supply: SupplyOrder) => void
  onDelete: (supply: SupplyOrder) => void
  isLinking: boolean
  isDeleting: boolean
}

const SupplyKaitenExpandedSection: React.FC<SupplyKaitenExpandedSectionProps> = ({
  supply,
  connectionId,
  refreshToken = 0,
  onLinkExisting,
  onDelete,
  isLinking,
  isDeleting,
}) => {
  const [cardInfo, setCardInfo] = useState<KaitenCardInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCardInfo(null)

    suppliesApi
      .getKaitenCardInfo(supply.supply_id, connectionId)
      .then((data) => {
        if (!cancelled) setCardInfo(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const detail =
            err &&
            typeof err === 'object' &&
            'response' in err &&
            err.response &&
            typeof err.response === 'object' &&
            'data' in err.response &&
            err.response.data &&
            typeof err.response.data === 'object' &&
            'detail' in err.response.data
              ? String(err.response.data.detail)
              : 'Не удалось загрузить карточку Kaiten'
          setError(detail)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [supply.supply_id, connectionId, supply.kaiten_card_id, refreshToken])

  return (
    <div style={{ marginBottom: 0 }}>
      <h3>Карточка в Kaiten</h3>
      {loading && <Spin size="small" />}
      {error && (
        <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />
      )}
      {!loading && !error && cardInfo && (
        <>
          {cardInfo.title && (
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary">Название: </Typography.Text>
              {cardInfo.title}
            </Typography.Paragraph>
          )}
          {cardInfo.file_names.length > 0 && (
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary">Прикреплённые файлы:</Typography.Text>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {cardInfo.file_names.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ul>
            </Typography.Paragraph>
          )}
          {cardInfo.card_url && (
            <Typography.Paragraph>
              <a href={cardInfo.card_url} target="_blank" rel="noopener noreferrer">
                Открыть карточку в Kaiten
              </a>
            </Typography.Paragraph>
          )}
        </>
      )}
      <Space wrap style={{ marginTop: 12 }}>
        <Button
          type="primary"
          loading={isLinking}
          onClick={() => onLinkExisting(supply)}
          style={kaitenButtonStyle}
        >
          Прикрепить файлы к карточке
        </Button>
        <Popconfirm
          title="Удалить карточку в Kaiten?"
          onConfirm={() => onDelete(supply)}
          okText="Удалить"
          cancelText="Отмена"
        >
          <Button danger loading={isDeleting}>
            Удалить карточку в Kaiten
          </Button>
        </Popconfirm>
      </Space>
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
  const [savingExternalOrderId, setSavingExternalOrderId] = useState<Record<string, boolean>>({})
  const [downloadingDocs, setDownloadingDocs] = useState<Record<string, boolean>>({})
  const [downloadingCargoLabels, setDownloadingCargoLabels] = useState<Record<string, boolean>>({})
  const [creatingKaiten, setCreatingKaiten] = useState<Record<string, boolean>>({})
  const [linkingKaiten, setLinkingKaiten] = useState<Record<string, boolean>>({})
  const [deletingKaiten, setDeletingKaiten] = useState<Record<string, boolean>>({})
  const [kaitenInfoRefresh, setKaitenInfoRefresh] = useState<Record<string, number>>({})
  const [downloadingSummaryXlsx, setDownloadingSummaryXlsx] = useState(false)
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<string[]>([])
  const [bulkCreatingKaiten, setBulkCreatingKaiten] = useState(false)
  const [stateGroupId, setStateGroupId] = useState<SupplyStateGroupId>('PREPARATION')
  const selectedStates =
    SUPPLY_STATE_GROUPS.find((g) => g.id === stateGroupId)?.states ?? []

  useEffect(() => {
    if (connectionId) {
      loadConnectionData()
    }
  }, [connectionId])

  useEffect(() => {
    if (connection) {
      setSelectedSupplyIds([])
      loadSupplies(selectedStates)
    }
  }, [connection, stateGroupId, selectedStates])

  const canCreateKaitenForSupply = (supply: SupplyOrder) =>
    !supply.kaiten_card_id &&
    supply.cargoes_count != null &&
    supply.cargoes_count > 0

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

  const loadSupplies = async (states: SupplyOrderState[]) => {
    if (!connection) return

    setLoading(true)
    try {
      const response = await suppliesApi.getByConnectionId(connection.id, { states })
      setSupplies(response.orders)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка загрузки поставок'
      )
    } finally {
      setLoading(false)
    }
  }

  const getStateColor = (state: SupplyOrderState | string) => {
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

  const formatState = (state: SupplyOrderState | string) => {
    if (state === 'UNSPECIFIED') return 'Не определён'
    if (state in SUPPLY_ORDER_STATE_LABELS) {
      return SUPPLY_ORDER_STATE_LABELS[state as SupplyOrderState]
    }
    return state
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

    const supplyId = supply.supply_id
    setCreatingCargoes((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.createCargoes(supplyId, {
        connection_id: connection.id,
        order_id: supply.order_id.toString(),
        delete_current_version: deleteCurrentVersion,
      })
      message.success('Грузоместа успешно созданы')
      // Reload supplies to show updated cargoes_count and errors
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания грузомест'
      )
    } finally {
      setCreatingCargoes((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleDownloadProductsSummaryXlsx = async () => {
    if (!connectionId || !connection) return

    setDownloadingSummaryXlsx(true)
    try {
      const blob = await suppliesApi.downloadProductsSummaryXlsx(
        parseInt(connectionId)
      )
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Движение_товаров_${company?.name ?? 'supplies'}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Файл «Движение товаров» скачан')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка скачивания сводки по товарам'
      )
    } finally {
      setDownloadingSummaryXlsx(false)
    }
  }

  const handleSetExternalOrderId = async (
    supply: SupplyOrder,
    externalOrderId: string
  ) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setSavingExternalOrderId((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.setExternalOrderId(supplyId, {
        connection_id: connection.id,
        external_order_id: externalOrderId.trim(),
      })
      message.success('Номер внешнего заказа сохранён')
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка сохранения номера внешнего заказа'
      )
    } finally {
      setSavingExternalOrderId((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleDownloadDocuments = async (supply: SupplyOrder) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setDownloadingDocs((prev) => ({ ...prev, [supplyId]: true }))

    try {
      const blob = await suppliesApi.downloadDocuments(supplyId, {
        connection_id: connection.id,
        order_id: supply.order_id.toString(),
      })

      const displayOrderId =
        supply.external_order_id ??
        supply.default_external_order_id?.toString() ??
        supplyId
      const filename = `${displayOrderId} ${supply.macrolocal_cluster_name ?? supply.storage_warehouse_name ?? ''}.zip`

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

  const handleLinkExistingKaitenCard = async (supply: SupplyOrder) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setLinkingKaiten((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.linkExistingKaitenCard(
        supplyId,
        connection.id,
        supply.order_id.toString()
      )
      message.success(
        supply.kaiten_card_id
          ? 'Файлы прикреплены к карточке Kaiten'
          : 'Карточка Kaiten найдена, файлы прикреплены'
      )
      setKaitenInfoRefresh((prev) => ({
        ...prev,
        [supplyId]: (prev[supplyId] ?? 0) + 1,
      }))
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка привязки карточки Kaiten'
      )
    } finally {
      setLinkingKaiten((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleBulkCreateKaitenCards = async () => {
    if (!connection || selectedSupplyIds.length === 0) return

    const selectedSupplies = supplies.filter((supply) =>
      selectedSupplyIds.includes(supply.supply_id)
    )
    const eligibleSupplies = selectedSupplies.filter(canCreateKaitenForSupply)
    if (eligibleSupplies.length === 0) {
      message.warning('Нет поставок, для которых можно создать задачу в Kaiten')
      return
    }

    setBulkCreatingKaiten(true)
    try {
      const response = await suppliesApi.bulkCreateKaitenCards({
        connection_id: connection.id,
        supplies: eligibleSupplies.map((supply) => ({
          supply_id: supply.supply_id,
          order_id: supply.order_id.toString(),
        })),
      })

      if (response.failed === 0) {
        message.success(`Задачи в Kaiten созданы: ${response.succeeded}`)
      } else if (response.succeeded === 0) {
        message.error('Не удалось создать задачи в Kaiten')
      } else {
        message.warning(
          `Создано задач: ${response.succeeded}, с ошибками: ${response.failed}`
        )
      }

      setSelectedSupplyIds([])
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка массового создания задач в Kaiten'
      )
    } finally {
      setBulkCreatingKaiten(false)
    }
  }

  const handleCreateKaitenCard = async (supply: SupplyOrder) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setCreatingKaiten((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.createKaitenCard(
        supplyId,
        connection.id,
        supply.order_id.toString()
      )
      message.success('Задача в Kaiten создана')
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка создания задачи в Kaiten'
      )
    } finally {
      setCreatingKaiten((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleDeleteKaitenCard = async (supply: SupplyOrder) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setDeletingKaiten((prev) => ({ ...prev, [supplyId]: true }))

    try {
      await suppliesApi.deleteKaitenCard(supplyId, connection.id)
      message.success('Карточка Kaiten удалена')
      await loadSupplies(selectedStates)
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка удаления карточки Kaiten'
      )
    } finally {
      setDeletingKaiten((prev) => ({ ...prev, [supplyId]: false }))
    }
  }

  const handleDownloadCargoLabels = async (supply: SupplyOrder) => {
    if (!connection) return

    const supplyId = supply.supply_id
    setDownloadingCargoLabels((prev) => ({ ...prev, [supplyId]: true }))

    try {
      const blob = await suppliesApi.downloadCargoLabels(supplyId, {
        connection_id: connection.id,
      })

      const filename = `${supplyId} Ярлыки.pdf`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success('Ярлыки грузомест успешно скачаны')
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Ошибка скачивания ярлыков грузомест'
      )
    } finally {
      setDownloadingCargoLabels((prev) => ({ ...prev, [supplyId]: false }))
    }
  }


  const columns: ColumnsType<SupplyOrder> = [
    // {
    //   title: 'ID заказа',
    //   dataIndex: 'order_id',
    //   key: 'order_id',
    //   width: 120,
    // },
    {
      title: 'Номер заявки',
      dataIndex: 'order_number',
      key: 'order_number',
      fixed: 'left' as const,
      width: 120,
    },
    // {
    //   title: 'ID поставки',
    //   dataIndex: 'supply_id',
    //   key: 'supply_id',
    //   width: 150,
    // },
    {
      title: 'Кластер',
      dataIndex: 'macrolocal_cluster_name',
      key: 'macrolocal_cluster_name',
      width: 120,
      fixed: 'left' as const,
      render: (_: any, record: SupplyOrder) => {
        return record.macrolocal_cluster_name ?? record.storage_warehouse_name ?? ''
      },
    },
    {
      title: 'Статус',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (state: string) => (
        <Tag color={getStateColor(state)}>{formatState(state)}</Tag>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_date',
      key: 'created_date',
      width: 120,
      sorter: (a: SupplyOrder, b: SupplyOrder) => {
        const aTime = a.created_date ? new Date(a.created_date).getTime() : Number.NEGATIVE_INFINITY
        const bTime = b.created_date ? new Date(b.created_date).getTime() : Number.NEGATIVE_INFINITY
        return aTime - bTime
      },
      sortDirections: ['ascend', 'descend'] as Array<'ascend' | 'descend'>,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Дата отгрузки',
      dataIndex: 'timeslot',
      key: 'timeslot',
      width: 150,
      sorter: (a: SupplyOrder, b: SupplyOrder) => {
        const aTime = a.timeslot ? new Date(a.timeslot).getTime() : Number.NEGATIVE_INFINITY
        const bTime = b.timeslot ? new Date(b.timeslot).getTime() : Number.NEGATIVE_INFINITY
        return aTime - bTime
      },
      sortDirections: ['ascend', 'descend'] as Array<'ascend' | 'descend'>,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Грузоместа',
      dataIndex: 'cargoes_count',
      key: 'cargoes_count',
      width: 100,
      render: (count: number | null) => {
        if (count === null) {
          return <span style={{ color: '#999' }}>Не созданы</span>
        }
        return count
      },
    },
    {
      title: 'Кол-во товара: в заявке / в грузоместах',
      dataIndex: 'products_count',
      key: 'products_count',
      width: 110,
      render: (_: any, record: SupplyOrder) => {
        if (record.products_count == null) {
          return '-'
        }
        return <span>{record.products_count} / {record.cargoes_products_count}</span>
      },
    },
    {
      title: 'Номер внешнего заказа',
      dataIndex: 'external_order_id',
      key: 'external_order_id',
      width: 120,
      render: (_: any, record: SupplyOrder) => {
        return record.external_order_id ?? record.default_external_order_id ?? '-'
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: SupplyOrder) => {
        if (!connection) return null
        const supplyId = record.supply_id
        const isCreating = creatingCargoes[supplyId] || false
        const isSavingExternalOrderId = savingExternalOrderId[supplyId] || false
        const isDownloading = downloadingDocs[supplyId] || false
        const isDownloadingLabels = downloadingCargoLabels[supplyId] || false
        const isCreatingKaiten = creatingKaiten[supplyId] || false
        const isLinkingKaiten = linkingKaiten[supplyId] || false

        return (
          <Popover
            content={
              <SupplyActions
                supply={record}
                connection={connection}
                onCreateCargoes={handleCreateCargoes}
                onSetExternalOrderId={handleSetExternalOrderId}
                onDownloadDocuments={handleDownloadDocuments}
                onDownloadCargoLabels={handleDownloadCargoLabels}
                onCreateKaitenCard={handleCreateKaitenCard}
                onLinkExistingKaitenCard={handleLinkExistingKaitenCard}
                isCreating={isCreating}
                isSavingExternalOrderId={isSavingExternalOrderId}
                isDownloading={isDownloading}
                isDownloadingLabels={isDownloadingLabels}
                isCreatingKaiten={isCreatingKaiten}
                isLinkingKaiten={isLinkingKaiten}
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
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/connections/${connectionId}`)}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Поставки - {company?.name || ''}
              </Title>
            </div>

            <div className="crm-split-header__end">
              {selectedSupplyIds.length > 0 && (
                <Popconfirm
                  title={`Создать задачи в Kaiten для ${selectedSupplyIds.length} выбранных поставок?`}
                  onConfirm={handleBulkCreateKaitenCards}
                  okText="Создать"
                  cancelText="Отмена"
                >
                  <Button
                    type="primary"
                    loading={bulkCreatingKaiten}
                    style={kaitenButtonStyle}
                  >
                    Создать задачи в Kaiten ({selectedSupplyIds.length})
                  </Button>
                </Popconfirm>
              )}
              <Button
                type="primary"
                loading={downloadingSummaryXlsx}
                onClick={handleDownloadProductsSummaryXlsx}
                disabled={!connection || connection.data_source?.name !== 'ozon'}
              >
                Скачать «Движение товаров»
              </Button>
              <Typography.Text type="secondary">Статусы</Typography.Text>
              <Select
                style={{ minWidth: 260 }}
                value={stateGroupId}
                onChange={(value) => setStateGroupId(value)}
              >
                {SUPPLY_STATE_GROUPS.map((group) => (
                  <Option key={group.id} value={group.id}>
                    {group.label}
                  </Option>
                ))}
              </Select>
            </div>
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
              showSorterTooltip={{ title: 'Нажмите для сортировки' }}
              columns={columns}
              dataSource={supplies}
              rowKey="supply_id"
              loading={loading}
              scroll={{ x: 1200 }}
              size='small'
              rowSelection={{
                selectedRowKeys: selectedSupplyIds,
                onChange: (selectedRowKeys) => {
                  setSelectedSupplyIds(selectedRowKeys as string[])
                },
                getCheckboxProps: (record) => ({
                  disabled: !canCreateKaitenForSupply(record),
                }),
              }}
              pagination={{
                pageSize: 100,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
              }}
              expandable={{
                expandedRowRender: (record: SupplyOrder) => {
                  const hasErrors = !!(record.errors && record.errors.length > 0)
                  const hasKaiten = !!record.kaiten_card_id
                  if (!hasErrors && !hasKaiten) {
                    return null
                  }
                  return (
                    <div style={{ padding: '0 16px 0 16px' }}>
                      {hasKaiten && connection && (
                        <div style={{ marginBottom: hasErrors ? 16 : 0 }}>
                          <SupplyKaitenExpandedSection
                            supply={record}
                            connectionId={connection.id}
                            refreshToken={kaitenInfoRefresh[record.supply_id] ?? 0}
                            onLinkExisting={handleLinkExistingKaitenCard}
                            onDelete={handleDeleteKaitenCard}
                            isLinking={linkingKaiten[record.supply_id] || false}
                            isDeleting={deletingKaiten[record.supply_id] || false}
                          />
                        </div>
                      )}
                      {hasErrors && (
                        <>
                          <Typography.Title level={5} style={{ marginBottom: '12px' }}>
                            Ошибки при создании грузомест:
                          </Typography.Title>
                          <Space orientation="vertical" style={{ width: '100%' }}>
                            {record.errors!.map((error, index) => (
                              <Alert
                                key={index}
                                title={formatErrorReason(error)}
                                type="error"
                                showIcon
                              />
                            ))}
                          </Space>
                        </>
                      )}
                    </div>
                  )
                },
                rowExpandable: (record: SupplyOrder) => {
                  return (
                    !!(record.errors && record.errors.length > 0) ||
                    !!record.kaiten_card_id
                  )
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

