import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Upload,
  DatePicker,
  Switch,
  Select,
  Spin,
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community'
import type { ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community'
import {
  bookkeepingApi,
  type FinanceOperation,
  type FinanceOperationCreate,
} from '../api/bookkeeping'

ModuleRegistry.registerModules([AllCommunityModule])

const { Title } = Typography
const { RangePicker } = DatePicker

const PAIR_ROW_HIGHLIGHT = '#e8f5e9'

const BANK_FILTER_OPTIONS = [
  { value: 'ozon', label: 'Озон Казакова ф/л' },
  { value: 'ozon_business', label: 'Озон бизнес' },
  { value: 'sber', label: 'Сбербанк' },
  { value: 'tochka', label: 'Точка р/с бизнес' },
]

const BANK_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  BANK_FILTER_OPTIONS.map((o) => [o.value, o.label])
)

function bankDisplayLabel(code: string | undefined | null): string {
  if (!code) return ''
  return BANK_LABEL_BY_VALUE[code] ?? code
}

function signedAmount(o: FinanceOperation): number {
  const n = parseFloat(o.amount)
  return o.operation_type === 'debit' ? -Math.abs(n) : Math.abs(n)
}

function computePairedOperationIds(operations: FinanceOperation[]): Set<number> {
  const byAmount = new Map<string, FinanceOperation[]>()
  for (const o of operations) {
    const k = String(o.amount)
    if (!byAmount.has(k)) byAmount.set(k, [])
    byAmount.get(k)!.push(o)
  }
  const paired = new Set<number>()
  for (const [, list] of byAmount) {
    const debits = list
      .filter((o) => o.operation_type === 'debit')
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date))
    const credits = list
      .filter((o) => o.operation_type === 'credit')
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date))
    const usedCreditIdx = new Set<number>()
    for (const debit of debits) {
      let bestIdx: number | null = null
      let bestDiff: number | null = null
      credits.forEach((credit, idx) => {
        if (usedCreditIdx.has(idx)) return
        const d1 = dayjs(debit.operation_date)
        const d2 = dayjs(credit.operation_date)
        const diff = Math.abs(d1.diff(d2, 'day'))
        if (diff > 1) return
        if (bestDiff === null || diff < bestDiff) {
          bestDiff = diff
          bestIdx = idx
        }
      })
      if (bestIdx === null) continue
      const credit = credits[bestIdx]
      usedCreditIdx.add(bestIdx)
      paired.add(debit.id)
      paired.add(credit.id)
    }
  }
  return paired
}

type ActionsParams = ICellRendererParams<FinanceOperation, unknown> & {
  onEdit: (row: FinanceOperation) => void
  onDelete: (row: FinanceOperation) => void
}

const OperationsActionsCell: React.FC<ActionsParams> = (params) => {
  const row = params.data
  if (!row) return null
  return (
    <Space size="small">
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => params.onEdit(row)} />
      <Popconfirm title="Удалить операцию?" onConfirm={() => params.onDelete(row)}>
        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  )
}

const BookkeepingPage: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const cid = connectionId ? parseInt(connectionId, 10) : 0

  const [items, setItems] = useState<FinanceOperation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [amountMin, setAmountMin] = useState<number | null>(null)
  const [amountMax, setAmountMax] = useState<number | null>(null)
  const [bankName, setBankName] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [highlightPairs, setHighlightPairs] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceOperation | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    try {
      const params: Parameters<typeof bookkeepingApi.listOperations>[1] = {
        limit: 500,
        offset: 0,
      }
      if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD')
      if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD')
      if (amountMin != null) params.amount_min = amountMin
      if (amountMax != null) params.amount_max = amountMax
      if (bankName) params.bank_name = bankName
      if (search.trim()) params.search = search.trim()

      const res = await bookkeepingApi.listOperations(cid, params)
      setItems(res.items)
      setTotal(res.total)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка загрузки операций')
    } finally {
      setLoading(false)
    }
  }, [cid, dateRange, amountMin, amountMax, bankName, search])

  useEffect(() => {
    load()
  }, [load])

  const pairedIds = useMemo(() => {
    if (!highlightPairs) return new Set<number>()
    return computePairedOperationIds(items)
  }, [items, highlightPairs])

  const openCreate = useCallback(() => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      operation_type: 'debit',
      operation_date: dayjs(),
    })
    setModalOpen(true)
  }, [form])

  const openEdit = useCallback(
    (row: FinanceOperation) => {
      setEditing(row)
      form.setFieldsValue({
        bank_name: row.bank_name,
        operation_date: dayjs(row.operation_date),
        amount: parseFloat(row.amount),
        operation_type: row.operation_type,
        payment_details: row.payment_details,
      })
      setModalOpen(true)
    },
    [form]
  )

  const handleDelete = useCallback(
    async (row: FinanceOperation) => {
      if (!cid) return
      try {
        await bookkeepingApi.deleteOperation(cid, row.id)
        message.success('Удалено')
        await load()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } }
        message.error(err.response?.data?.detail || 'Ошибка удаления')
      }
    },
    [cid, load]
  )

  const handleUpload = async (file: File) => {
    if (!cid) return false
    try {
      const res = await bookkeepingApi.uploadImports(cid, [file])
      message.success(
        `Загружено: ${res.batch.operations_count} операций (пакет #${res.batch.id})`
      )
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка загрузки файла')
    }
    return false
  }

  const handleExport = async () => {
    if (!cid) return
    setExporting(true)
    try {
      const params: Parameters<typeof bookkeepingApi.exportXlsx>[1] = {
        include_pairs_preview: true,
      }
      if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD')
      if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD')
      if (amountMin != null) params.amount_min = amountMin
      if (amountMax != null) params.amount_max = amountMax
      if (bankName) params.bank_name = bankName
      if (search.trim()) params.search = search.trim()

      const blob = await bookkeepingApi.exportXlsx(cid, params)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bookkeeping_export_${cid}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      message.success('Файл скачан')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка экспорта')
    } finally {
      setExporting(false)
    }
  }

  const submitForm = async () => {
    if (!cid) return
    try {
      const v = await form.validateFields()
      const body: FinanceOperationCreate = {
        bank_name: v.bank_name,
        operation_date: v.operation_date.format('YYYY-MM-DD'),
        amount: v.amount,
        operation_type: v.operation_type,
        payment_details: v.payment_details || '',
      }
      if (editing) {
        await bookkeepingApi.updateOperation(cid, editing.id, {
          bank_name: body.bank_name,
          operation_date: body.operation_date,
          amount: body.amount,
          operation_type: body.operation_type,
          payment_details: body.payment_details,
        })
        message.success('Сохранено')
      } else {
        await bookkeepingApi.createOperation(cid, body)
        message.success('Операция добавлена')
      }
      setModalOpen(false)
      await load()
    } catch {
      /* validation */
    }
  }

  const getRowId = useCallback((params: GetRowIdParams<FinanceOperation>) => String(params.data.id), [])

  const getRowStyle = useCallback(
    (params: { data?: FinanceOperation }) => {
      const id = params.data?.id
      if (id == null) return undefined
      if (highlightPairs && pairedIds.has(id)) {
        return { background: PAIR_ROW_HIGHLIGHT }
      }
      return undefined
    },
    [highlightPairs, pairedIds]
  )

  const columnDefs = useMemo<ColDef<FinanceOperation>[]>(
    () => [
      {
        field: 'operation_date',
        headerName: 'Дата',
        width: 120,
        sortable: true,
        filter: false,
      },
      {
        field: 'bank_name',
        headerName: 'Банк',
        width: 160,
        sortable: true,
        filter: false,
        valueFormatter: (p) => bankDisplayLabel(p.value as string),
      },
      {
        field: 'operation_type',
        headerName: 'Тип',
        width: 90,
        sortable: true,
        filter: false,
      },
      {
        headerName: 'Сумма',
        width: 130,
        sortable: true,
        filter: false,
        comparator: (_a, _b, nodeA, nodeB) => {
          const da = nodeA?.data
          const db = nodeB?.data
          if (!da || !db) return 0
          return signedAmount(da) - signedAmount(db)
        },
        valueFormatter: (p) => {
          const d = p.data
          if (!d) return ''
          return d.operation_type === 'debit' ? `− ${d.amount}` : `+ ${d.amount}`
        },
      },
      {
        field: 'payment_details',
        headerName: 'Назначение',
        flex: 1,
        minWidth: 200,
        sortable: true,
        filter: false,
        tooltipField: 'payment_details',
      },
      {
        field: 'source',
        headerName: 'Источник',
        width: 100,
        sortable: true,
        filter: false,
      },
      {
        field: 'source_file_name',
        headerName: 'Файл',
        width: 160,
        sortable: true,
        filter: false,
        tooltipField: 'source_file_name',
      },
      {
        headerName: '',
        width: 120,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: OperationsActionsCell,
        cellRendererParams: {
          onEdit: openEdit,
          onDelete: handleDelete,
        },
      },
    ],
    [openEdit, handleDelete]
  )

  const defaultColDef = useMemo<ColDef<FinanceOperation>>(
    () => ({
      resizable: true,
      sortable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    []
  )

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/connections/${cid}`)}>
                Назад
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Банковские операции
              </Title>
            </div>
            <div className="crm-split-header__end">
              <Space wrap>
                <Upload accept=".xlsx" showUploadList={false} beforeUpload={handleUpload}>
                  <Button icon={<UploadOutlined />}>Загрузить XLSX</Button>
                </Upload>
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                  Экспорт XLSX
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Добавить
                </Button>
              </Space>
            </div>
          </div>

          <Space wrap align="center">
            <span>Период:</span>
            <RangePicker value={dateRange} onChange={(v) => setDateRange(v)} allowEmpty={[true, true]} />
            <span>Банк</span>
            <Select
              allowClear
              placeholder="все"
              style={{ width: 150 }}
              value={bankName}
              onChange={setBankName}
              options={BANK_FILTER_OPTIONS}
            />
            <span>Сумма от</span>
            <InputNumber min={0} value={amountMin ?? undefined} onChange={(v) => setAmountMin(v)} />
            <span>до</span>
            <InputNumber min={0} value={amountMax ?? undefined} onChange={(v) => setAmountMax(v)} />
            <Input.Search
              placeholder="Сумма или назначение"
              style={{ width: 240 }}
              onSearch={() => load()}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
            <Button type="primary" onClick={() => load()}>
              Применить
            </Button>
            <span>Подсветка пар:</span>
            <Switch checked={highlightPairs} onChange={setHighlightPairs} />
          </Space>

          <div style={{ color: '#888' }}>
            Всего: {total}
            <span style={{ marginLeft: 12, fontSize: 12 }}>
              Сортировка по нескольким колонкам: клик по «Дата», затем по «Сумма» (и др.).
            </span>
          </div>

          <Spin spinning={loading}>
            <div style={{ height: 560, width: '100%' }}>
              <AgGridReact<FinanceOperation>
                theme={themeAlpine}
                rowData={items}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                getRowStyle={getRowStyle}
                animateRows={false}
                suppressCellFocus
                alwaysMultiSort
                rowHeight={40}
                headerHeight={40}
              />
            </div>
          </Spin>
        </Space>
      </Card>

      <Modal
        title={editing ? 'Редактировать операцию' : 'Новая операция'}
        open={modalOpen}
        onOk={submitForm}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="bank_name" label="Банк" rules={[{ required: true }]}>
            <Input placeholder="ozon / sber / tochka" />
          </Form.Item>
          <Form.Item name="operation_date" label="Дата" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="operation_type" label="Тип" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'debit', label: 'Списание (debit)' },
                { value: 'credit', label: 'Зачисление (credit)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="payment_details" label="Назначение платежа">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default BookkeepingPage
